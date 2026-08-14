const prisma = require('../config/prisma');
const { success, created, notFound, paginate, badRequest } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const { auditLog } = require('../utils/audit');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const getAll = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20, search = '', kelasId, jurusanId,
    status = 'AKTIF', angkatan, sortBy = 'nama', sortDir = 'asc',
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (search) {
    where.OR = [
      { nama: { contains: search, mode: 'insensitive' } },
      { nis: { contains: search } },
      { nisn: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (jurusanId) where.jurusanId = jurusanId;
  if (angkatan) where.angkatan = parseInt(angkatan);

  if (kelasId) {
    where.kelasHistori = { some: { kelasId, aktif: true } };
  }

  const [data, total] = await Promise.all([
    prisma.siswa.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortDir },
      include: {
        jurusan: { select: { id: true, nama: true, kode: true } },
        kelasHistori: {
          where: { aktif: true },
          select: { kelas: { select: { id: true, nama: true, tingkat: true } } },
          take: 1,
        },
        akumulasiPoin: { select: { totalPoin: true, statusPeringatan: true } },
      },
    }),
    prisma.siswa.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const siswa = await prisma.siswa.findUnique({
    where: { id },
    include: {
      jurusan: true,
      kelasHistori: {
        include: { kelas: { include: { tahunAjaran: true, jurusan: true } } },
        orderBy: { mulai: 'desc' },
      },
      akumulasiPoin: true,
      absensi: {
        orderBy: { tanggal: 'desc' },
        take: 30,
        include: { kelas: { select: { nama: true } } },
      },
      pelanggaran: {
        orderBy: { tanggal: 'desc' },
        take: 20,
        include: { jenisPelanggaran: true },
      },
      surat: { orderBy: { tanggal: 'desc' } },
    },
  });

  if (!siswa) return notFound(res, 'Siswa tidak ditemukan');
  return success(res, siswa);
});

const create = asyncHandler(async (req, res) => {
  const {
    nis, nisn, nama, jenisKelamin, tempatLahir, tanggalLahir, agama,
    alamat, telepon, namaOrtu, teleponOrtu, emailOrtu,
    jurusanId, angkatan, kelasId,
  } = req.body;

  const existing = await prisma.siswa.findFirst({ where: { OR: [{ nis }, ...(nisn ? [{ nisn }] : [])] } });
  if (existing) return badRequest(res, `NIS${existing.nis === nis ? '' : 'N'} sudah terdaftar`);

  const siswa = await prisma.siswa.create({
    data: {
      nis, nisn: nisn || null, nama, jenisKelamin,
      tempatLahir, tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
      agama, alamat, telepon, namaOrtu, teleponOrtu, emailOrtu,
      jurusanId, angkatan: parseInt(angkatan),
      foto: req.file ? `/uploads/foto/${req.file.filename}` : null,
    },
  });

  // Init akumulasi poin
  await prisma.akumulasiPoin.create({
    data: { siswaId: siswa.id, totalPoin: 0, statusPeringatan: 'NORMAL' },
  });

  // Assign kelas if provided
  if (kelasId) {
    await prisma.siswaKelas.create({
      data: { siswaId: siswa.id, kelasId, mulai: new Date(), aktif: true },
    });
  }

  await auditLog({ userId: req.user?.id, aksi: 'CREATE', tabel: 'siswa', dataId: siswa.id, dataAfter: siswa, req });

  return created(res, siswa, 'Siswa berhasil ditambahkan');
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.siswa.findUnique({ where: { id } });
  if (!existing) return notFound(res, 'Siswa tidak ditemukan');

  // Whitelist hanya field scalar yang boleh diupdate — hindari field relasi,
  // computed (_count), readonly (id, createdAt, updatedAt), dan nis (tidak boleh diubah)
  const {
    nisn, nama, jenisKelamin, tempatLahir, tanggalLahir, agama,
    alamat, telepon, namaOrtu, teleponOrtu, emailOrtu,
    jurusanId, angkatan, status,
    tanggalMasuk, tanggalKeluar, keteranganKeluar,
  } = req.body;

  const updateData = {};

  if (nama        !== undefined) updateData.nama        = nama;
  if (jenisKelamin!== undefined) updateData.jenisKelamin= jenisKelamin;
  if (tempatLahir !== undefined) updateData.tempatLahir = tempatLahir || null;
  if (agama       !== undefined) updateData.agama       = agama       || null;
  if (alamat      !== undefined) updateData.alamat      = alamat      || null;
  if (telepon     !== undefined) updateData.telepon     = telepon     || null;
  if (namaOrtu    !== undefined) updateData.namaOrtu    = namaOrtu    || null;
  if (teleponOrtu !== undefined) updateData.teleponOrtu = teleponOrtu || null;
  if (emailOrtu   !== undefined) updateData.emailOrtu   = emailOrtu   || null;
  if (jurusanId   !== undefined) updateData.jurusanId   = jurusanId;
  if (status      !== undefined) updateData.status      = status;

  if (angkatan    !== undefined) updateData.angkatan    = parseInt(angkatan);

  if (tanggalLahir !== undefined)
    updateData.tanggalLahir = tanggalLahir ? new Date(tanggalLahir) : null;
  if (tanggalMasuk !== undefined)
    updateData.tanggalMasuk = tanggalMasuk ? new Date(tanggalMasuk) : null;
  if (tanggalKeluar !== undefined)
    updateData.tanggalKeluar = tanggalKeluar ? new Date(tanggalKeluar) : null;
  if (keteranganKeluar !== undefined)
    updateData.keteranganKeluar = keteranganKeluar || null;

  // NISN boleh diubah, tapi cek dulu tidak duplikat dengan siswa lain
  if (nisn !== undefined) {
    const nisnValue = nisn || null;
    if (nisnValue && nisnValue !== existing.nisn) {
      const duplicate = await prisma.siswa.findFirst({
        where: { nisn: nisnValue, id: { not: id } },
      });
      if (duplicate) return badRequest(res, 'NISN sudah terdaftar pada siswa lain');
    }
    updateData.nisn = nisnValue;
  }

  // Foto jika ada upload
  if (req.file) updateData.foto = `/uploads/foto/${req.file.filename}`;

  const siswa = await prisma.siswa.update({ where: { id }, data: updateData });

  await auditLog({ userId: req.user?.id, aksi: 'UPDATE', tabel: 'siswa', dataId: id, dataBefore: existing, dataAfter: siswa, req });

  return success(res, siswa, 'Data siswa berhasil diperbarui');
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const siswa = await prisma.siswa.findUnique({ where: { id } });
  if (!siswa) return notFound(res, 'Siswa tidak ditemukan');

  // Hard delete — hapus semua relasi berurutan sesuai foreign key
  await prisma.$transaction([
    prisma.qRToken.deleteMany({ where: { siswaId: id } }),
    prisma.surat.deleteMany({ where: { siswaId: id } }),
    prisma.akumulasiPoin.deleteMany({ where: { siswaId: id } }),
    prisma.pelanggaran.deleteMany({ where: { siswaId: id } }),
    prisma.absensi.deleteMany({ where: { siswaId: id } }),
    prisma.siswaKelas.deleteMany({ where: { siswaId: id } }),
    prisma.siswa.delete({ where: { id } }),
  ]);

  await auditLog({ userId: req.user?.id, aksi: 'DELETE', tabel: 'siswa', dataId: id, dataBefore: siswa, req });

  return success(res, null, 'Siswa berhasil dihapus');
});

const bulkRemove = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return badRequest(res, 'IDs tidak boleh kosong');
  if (ids.length > 100) return badRequest(res, 'Maksimal 100 siswa sekaligus');

  await prisma.$transaction(async (tx) => {
    await tx.qRToken.deleteMany({ where: { siswaId: { in: ids } } });
    await tx.surat.deleteMany({ where: { siswaId: { in: ids } } });
    await tx.pelanggaran.deleteMany({ where: { siswaId: { in: ids } } });
    await tx.absensi.deleteMany({ where: { siswaId: { in: ids } } });
    await tx.siswaKelas.deleteMany({ where: { siswaId: { in: ids } } });
    await tx.akumulasiPoin.deleteMany({ where: { siswaId: { in: ids } } });
    await tx.siswa.deleteMany({ where: { id: { in: ids } } });
  }, { timeout: 60000 });

  await auditLog({ userId: req.user?.id, aksi: 'DELETE', tabel: 'siswa', dataId: ids.join(','), dataAfter: { count: ids.length }, req });
  return success(res, { count: ids.length }, `${ids.length} siswa berhasil dihapus`);
});

const getStatistik = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { semesterId } = req.query;

  const siswa = await prisma.siswa.findUnique({ where: { id } });
  if (!siswa) return notFound(res, 'Siswa tidak ditemukan');

  const where = { siswaId: id };
  if (semesterId) where.semesterId = semesterId;

  const [absensiStats, pelanggaranStats, akumulasi] = await Promise.all([
    prisma.absensi.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
    prisma.pelanggaran.aggregate({
      where: { siswaId: id },
      _sum: { poin: true },
      _count: { id: true },
    }),
    prisma.akumulasiPoin.findUnique({ where: { siswaId: id } }),
  ]);

  const statusMap = {};
  absensiStats.forEach(a => { statusMap[a.status] = a._count.status; });
  const totalAbsensi = Object.values(statusMap).reduce((a, b) => a + b, 0);

  return success(res, {
    siswa: { id: siswa.id, nama: siswa.nama, nis: siswa.nis },
    kehadiran: {
      hadir: statusMap.HADIR || 0,
      sakit: statusMap.SAKIT || 0,
      izin: statusMap.IZIN || 0,
      alpha: statusMap.ALPHA || 0,
      dispensasi: statusMap.DISPENSASI || 0,
      terlambat: statusMap.TERLAMBAT || 0,
      pulangCepat: statusMap.PULANG_CEPAT || 0,
      total: totalAbsensi,
      persentaseHadir: totalAbsensi > 0 ? Math.round(((statusMap.HADIR || 0) / totalAbsensi) * 100) : 0,
    },
    pelanggaran: {
      total: pelanggaranStats._count.id,
      totalPoin: pelanggaranStats._sum.poin || 0,
    },
    akumulasi,
  });
});

const importDapodik = asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'File tidak ditemukan');

  const filePath = req.file.path;
  let workbook;
  try {
    workbook = xlsx.readFile(filePath);
  } catch {
    return badRequest(res, 'Format file tidak valid');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const results = { berhasil: 0, gagal: 0, kelasAssigned: 0, errors: [] };

  // Cache tahun ajaran aktif sekali saja — dipakai untuk lookup kelas
  const tahunAjaranAktif = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });

  for (const row of rows) {
    try {
      // NISN & Nama adalah data utama (wajib), NIS bersifat opsional
      const nisn       = String(row['NISN *']        || row['NISN']        || row['nisn']        || '').trim();
      const nama       = String(row['Nama Lengkap *'] || row['Nama Lengkap'] || row['nama']        || '').trim();
      const jenisKelamin = String(row['Jenis Kelamin *'] || row['Jenis Kelamin'] || row['jenisKelamin'] || row['JK'] || 'L').trim();
      const jurusanKode  = String(row['Kode Jurusan *'] || row['Kode Jurusan'] || row['Kompetensi Keahlian'] || row['jurusan'] || '').trim();
      const namaKelas    = String(row['Nama Kelas']   || row['namaKelas']   || row['Kelas']        || '').trim();
      const nis          = String(row['NIS']          || row['nis']         || '').trim() || null;

      if (!nisn || !nama) {
        results.gagal++;
        results.errors.push({ row: nama || nisn, error: 'NISN atau Nama Lengkap wajib diisi' });
        continue;
      }

      if (!['L', 'P'].includes(jenisKelamin.toUpperCase())) {
        results.gagal++;
        results.errors.push({ row: nama, error: 'Jenis Kelamin harus L atau P' });
        continue;
      }

      const jurusan = await prisma.jurusan.findFirst({
        where: { OR: [{ kode: jurusanKode }, { nama: { contains: jurusanKode, mode: 'insensitive' } }] },
      });

      if (!jurusan) {
        results.gagal++;
        results.errors.push({ row: nama, error: `Jurusan '${jurusanKode}' tidak ditemukan` });
        continue;
      }

      // Lookup kelas (dari tahun ajaran aktif) jika kolom Nama Kelas diisi
      let kelas = null;
      if (namaKelas && tahunAjaranAktif) {
        kelas = await prisma.kelas.findFirst({
          where: {
            nama: { equals: namaKelas, mode: 'insensitive' },
            tahunAjaranId: tahunAjaranAktif.id,
            aktif: true,
          },
        });
        if (!kelas) {
          // Catat peringatan tapi jangan batalkan baris — siswa tetap dibuat tanpa kelas
          results.errors.push({ row: nama, error: `Kelas '${namaKelas}' tidak ditemukan, siswa ditambahkan tanpa kelas` });
        }
      }

      // Cek apakah NISN sudah ada — jika ada, update; jika belum, buat baru
      let siswaId;
      const existing = await prisma.siswa.findFirst({ where: { nisn } });

      if (existing) {
        await prisma.siswa.update({
          where: { id: existing.id },
          data: {
            nama,
            jenisKelamin: jenisKelamin.toUpperCase() === 'P' ? 'P' : 'L',
            jurusanId: jurusan.id,
          },
        });
        siswaId = existing.id;
      } else {
        // Generate NIS otomatis jika tidak disediakan
        const finalNis = nis || `AUTO-${nisn}`;

        const created = await prisma.siswa.create({
          data: {
            nis: finalNis,
            nisn,
            nama,
            jenisKelamin: jenisKelamin.toUpperCase() === 'P' ? 'P' : 'L',
            agama: String(row['Agama'] || row['agama'] || 'Islam').trim() || 'Islam',
            jurusanId: jurusan.id,
            angkatan: parseInt(row['Angkatan *'] || row['Angkatan'] || row['Tahun Masuk'] || row['angkatan'] || new Date().getFullYear()),
            tanggalLahir: row['Tanggal Lahir'] ? new Date(row['Tanggal Lahir']) : null,
            tempatLahir: String(row['Tempat Lahir']      || row['tempatLahir'] || '').trim() || null,
            alamat:      String(row['Alamat']            || row['alamat']      || '').trim() || null,
            telepon:     String(row['Telepon Siswa']     || row['telepon']     || '').trim() || null,
            namaOrtu:    String(row['Nama Orang Tua']    || row['Nama Ayah']   || row['namaOrtu']    || '').trim() || null,
            teleponOrtu: String(row['Telepon Orang Tua'] || row['No HP Ortu']  || row['teleponOrtu'] || '').trim() || null,
            emailOrtu:   String(row['Email Orang Tua']   || row['emailOrtu']   || '').trim() || null,
            status: 'AKTIF',
          },
        });
        siswaId = created.id;

        // Init akumulasi poin untuk siswa baru
        await prisma.akumulasiPoin.upsert({
          where: { siswaId },
          update: {},
          create: { siswaId, totalPoin: 0, statusPeringatan: 'NORMAL' },
        });
      }

      // Assign kelas jika ditemukan
      if (kelas && siswaId) {
        // Nonaktifkan kelas lama di tahun ajaran yang sama terlebih dahulu
        // Cari dulu siswaKelas aktif yang kelasnya ada di tahun ajaran aktif
        const kelasAktifLama = await prisma.siswaKelas.findMany({
          where: { siswaId, aktif: true },
          include: { kelas: { select: { tahunAjaranId: true } } },
        });
        const idsKelasLama = kelasAktifLama
          .filter(sk => sk.kelas.tahunAjaranId === tahunAjaranAktif.id)
          .map(sk => sk.id);

        if (idsKelasLama.length > 0) {
          await prisma.siswaKelas.updateMany({
            where: { id: { in: idsKelasLama } },
            data: { aktif: false, selesai: new Date() },
          });
        }

        // Upsert agar tidak duplikat jika dijalankan ulang
        await prisma.siswaKelas.upsert({
          where: { siswaId_kelasId: { siswaId, kelasId: kelas.id } },
          update: { aktif: true, selesai: null },
          create: { siswaId, kelasId: kelas.id, mulai: new Date(), aktif: true },
        });
        results.kelasAssigned++;
      }

      results.berhasil++;
    } catch (e) {
      results.gagal++;
      results.errors.push({ row: row['Nama Lengkap *'] || row['Nama Lengkap'], error: e.message });
    }
  }

  // Cleanup
  fs.unlink(filePath, () => {});

  return success(res, results, `Import selesai: ${results.berhasil} berhasil, ${results.kelasAssigned} assigned ke kelas, ${results.gagal} gagal`);
});

const getSiswaByKelas = asyncHandler(async (req, res) => {
  const { kelasId } = req.params;

  const siswaKelas = await prisma.siswaKelas.findMany({
    where: { kelasId, aktif: true },
    include: {
      siswa: {
        include: {
          akumulasiPoin: { select: { totalPoin: true, statusPeringatan: true } },
        },
      },
    },
    orderBy: { siswa: { nama: 'asc' } },
  });

  return success(res, siswaKelas.map(sk => sk.siswa));
});

module.exports = { getAll, getById, create, update, remove, bulkRemove, getStatistik, importDapodik, getSiswaByKelas };
