const prisma = require('../config/prisma');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const { auditLog } = require('../utils/audit');

const getByTanggalKelas = asyncHandler(async (req, res) => {
  const { tanggal, kelasId, sesi = 'PAGI' } = req.query;
  if (!tanggal || !kelasId) return badRequest(res, 'Tanggal dan kelas wajib diisi');

  const tgl = new Date(tanggal);
  tgl.setHours(0, 0, 0, 0);

  // Get all active students in class
  const siswaKelas = await prisma.siswaKelas.findMany({
    where: { kelasId, aktif: true },
    include: {
      siswa: {
        select: { id: true, nama: true, nis: true, jenisKelamin: true, foto: true },
      },
    },
    orderBy: { siswa: { nama: 'asc' } },
  });

  // Get existing absensi for this date/class/sesi
  const existingAbsensi = await prisma.absensi.findMany({
    where: { kelasId, tanggal: tgl, sesi },
    select: { siswaId: true, status: true, keterangan: true, menit: true, lampiranUrl: true, id: true },
  });

  const absensiMap = {};
  existingAbsensi.forEach(a => { absensiMap[a.siswaId] = a; });

  // Merge
  const result = siswaKelas.map(sk => ({
    siswa: sk.siswa,
    absensi: absensiMap[sk.siswa.id] || null,
  }));

  return success(res, { siswa: result, tanggal, kelasId, sesi });
});

const simpanMassal = asyncHandler(async (req, res) => {
  const { kelasId, tanggal, sesi = 'PAGI', semesterId, absensiList } = req.body;

  if (!kelasId || !tanggal || !semesterId || !absensiList?.length) {
    return badRequest(res, 'Data tidak lengkap');
  }

  const tgl = new Date(tanggal);
  tgl.setHours(0, 0, 0, 0);

  // Check hari libur
  const hariLibur = await prisma.hariLibur.findFirst({ where: { tanggal: tgl } });
  if (hariLibur) {
    return badRequest(res, `Tanggal ${tanggal} adalah hari libur: ${hariLibur.nama}`);
  }

  // Cari guruId dari user yang login (createdById FK ke tabel guru, bukan users)
  const guru = req.user?.id
    ? await prisma.guru.findFirst({ where: { userId: req.user.id } })
    : null;
  const guruId = guru?.id || null;

  const upsertPromises = absensiList.map(item =>
    prisma.absensi.upsert({
      where: { siswaId_tanggal_sesi: { siswaId: item.siswaId, tanggal: tgl, sesi } },
      update: {
        status: item.status,
        keterangan: item.keterangan || null,
        menit: item.menit || null,
        updatedById: guruId,
      },
      create: {
        siswaId: item.siswaId,
        kelasId,
        semesterId,
        tanggal: tgl,
        sesi,
        status: item.status,
        keterangan: item.keterangan || null,
        menit: item.menit || null,
        createdById: guruId,
      },
    })
  );

  await Promise.all(upsertPromises);

  await auditLog({
    userId: req.user?.id,
    aksi: 'SIMPAN_ABSENSI_MASSAL',
    tabel: 'absensi',
    dataAfter: { kelasId, tanggal, jumlah: absensiList.length },
    req,
  });

  return success(res, { saved: absensiList.length }, 'Absensi berhasil disimpan');
});

const getById = asyncHandler(async (req, res) => {
  const absensi = await prisma.absensi.findUnique({
    where: { id: req.params.id },
    include: { siswa: true, kelas: true },
  });
  if (!absensi) return notFound(res, 'Data absensi tidak ditemukan');
  return success(res, absensi);
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.absensi.findUnique({ where: { id } });
  if (!existing) return notFound(res, 'Data absensi tidak ditemukan');

  const updated = await prisma.absensi.update({
    where: { id },
    data: {
      status: req.body.status,
      keterangan: req.body.keterangan,
      menit: req.body.menit,
      lampiranUrl: req.file ? `/uploads/surat/${req.file.filename}` : existing.lampiranUrl,
      updatedById: req.user?.id,
    },
  });

  return success(res, updated, 'Absensi berhasil diperbarui');
});

const getRiwayatSiswa = asyncHandler(async (req, res) => {
  const { siswaId } = req.params;
  const { page = 1, limit = 30, semesterId, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { siswaId };
  if (semesterId) where.semesterId = semesterId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.absensi.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { tanggal: 'desc' },
      include: { kelas: { select: { nama: true } } },
    }),
    prisma.absensi.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
});

const getRiwayatKelas = asyncHandler(async (req, res) => {
  const { kelasId } = req.params;
  const { tanggalMulai, tanggalSelesai, semesterId } = req.query;

  const where = { kelasId };
  if (semesterId) where.semesterId = semesterId;
  if (tanggalMulai && tanggalSelesai) {
    where.tanggal = {
      gte: new Date(tanggalMulai),
      lte: new Date(tanggalSelesai),
    };
  }

  const absensi = await prisma.absensi.groupBy({
    by: ['tanggal', 'status'],
    where,
    _count: { status: true },
    orderBy: { tanggal: 'desc' },
  });

  return success(res, absensi);
});

const uploadLampiran = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!req.file) return badRequest(res, 'File tidak ditemukan');

  const updated = await prisma.absensi.update({
    where: { id },
    data: { lampiranUrl: `/uploads/surat/${req.file.filename}` },
  });

  return success(res, { lampiranUrl: updated.lampiranUrl }, 'Lampiran berhasil diupload');
});

const getRekapHarian = asyncHandler(async (req, res) => {
  const { tanggal, kelasId } = req.query;
  const tgl = new Date(tanggal || new Date());
  tgl.setHours(0, 0, 0, 0);

  const where = { tanggal: tgl };
  if (kelasId) where.kelasId = kelasId;

  const data = await prisma.absensi.groupBy({
    by: ['kelasId', 'status'],
    where,
    _count: { status: true },
  });

  const kelasIds = [...new Set(data.map(d => d.kelasId))];
  const kelasList = await prisma.kelas.findMany({
    where: { id: { in: kelasIds } },
    include: { jurusan: { select: { singkatan: true } } },
  });
  const kelasMap = {};
  kelasList.forEach(k => { kelasMap[k.id] = k; });

  const rekap = {};
  data.forEach(d => {
    if (!rekap[d.kelasId]) {
      rekap[d.kelasId] = {
        kelas: kelasMap[d.kelasId],
        hadir: 0, sakit: 0, izin: 0, alpha: 0,
        dispensasi: 0, terlambat: 0, pulangCepat: 0, dinas: 0, lainnya: 0,
        total: 0,
      };
    }
    // Map status ke key yang benar
    const statusKeyMap = {
      'HADIR': 'hadir', 'SAKIT': 'sakit', 'IZIN': 'izin', 'ALPHA': 'alpha',
      'DISPENSASI': 'dispensasi', 'TERLAMBAT': 'terlambat',
      'PULANG_CEPAT': 'pulangCepat', 'DINAS': 'dinas', 'LAINNYA': 'lainnya',
    };
    const key = statusKeyMap[d.status];
    if (key && rekap[d.kelasId][key] !== undefined) {
      rekap[d.kelasId][key] = d._count.status;
    }
    rekap[d.kelasId].total += d._count.status;
  });

  return success(res, Object.values(rekap));
});

/**
 * Cari siswa lintas kelas berdasarkan nama atau NISN
 * untuk mempermudah input absensi per-siswa
 */
const searchSiswaLintas = asyncHandler(async (req, res) => {
  const { q = '', tanggal, sesi = 'PAGI' } = req.query;

  if (!q || q.trim().length < 2) {
    return badRequest(res, 'Masukkan minimal 2 karakter untuk pencarian');
  }

  const keyword = q.trim();
  const tgl = tanggal ? new Date(tanggal) : new Date();
  tgl.setHours(0, 0, 0, 0);

  // Cari siswa aktif berdasarkan nama atau NISN di semua kelas
  const siswaList = await prisma.siswa.findMany({
    where: {
      status: 'AKTIF',
      OR: [
        { nama: { contains: keyword, mode: 'insensitive' } },
        { nisn: { contains: keyword } },
        { nis: { contains: keyword } },
      ],
    },
    take: 20,
    select: {
      id: true,
      nama: true,
      nis: true,
      nisn: true,
      jenisKelamin: true,
      foto: true,
      kelasHistori: {
        where: { aktif: true },
        select: {
          kelas: {
            select: { id: true, nama: true, tingkat: true },
          },
        },
        take: 1,
      },
    },
    orderBy: { nama: 'asc' },
  });

  if (!siswaList.length) {
    return success(res, []);
  }

  // Ambil data absensi hari ini untuk siswa-siswa yang ditemukan
  const siswaIds = siswaList.map(s => s.id);
  const absensiHariIni = await prisma.absensi.findMany({
    where: {
      siswaId: { in: siswaIds },
      tanggal: tgl,
      sesi,
    },
    select: {
      siswaId: true,
      id: true,
      status: true,
      keterangan: true,
      menit: true,
      kelasId: true,
    },
  });

  const absensiMap = {};
  absensiHariIni.forEach(a => { absensiMap[a.siswaId] = a; });

  const result = siswaList.map(s => ({
    siswa: {
      id: s.id,
      nama: s.nama,
      nis: s.nis,
      nisn: s.nisn,
      jenisKelamin: s.jenisKelamin,
      foto: s.foto,
    },
    kelas: s.kelasHistori?.[0]?.kelas || null,
    absensi: absensiMap[s.id] || null,
  }));

  return success(res, result);
});

/**
 * Simpan absensi untuk satu siswa (input cepat dari hasil pencarian)
 */
const simpanSatu = asyncHandler(async (req, res) => {
  const { siswaId, kelasId, tanggal, sesi = 'PAGI', semesterId, status, keterangan, menit } = req.body;

  if (!siswaId || !kelasId || !tanggal || !semesterId || !status) {
    return badRequest(res, 'Data tidak lengkap');
  }

  const tgl = new Date(tanggal);
  tgl.setHours(0, 0, 0, 0);

  // Check hari libur
  const hariLibur = await prisma.hariLibur.findFirst({ where: { tanggal: tgl } });
  if (hariLibur) {
    return badRequest(res, `Tanggal ${tanggal} adalah hari libur: ${hariLibur.nama}`);
  }

  // Cari guruId dari user yang login (createdById FK ke tabel guru, bukan users)
  const guru = req.user?.id
    ? await prisma.guru.findFirst({ where: { userId: req.user.id } })
    : null;
  const guruId = guru?.id || null;

  const absensi = await prisma.absensi.upsert({
    where: { siswaId_tanggal_sesi: { siswaId, tanggal: tgl, sesi } },
    update: {
      status,
      keterangan: keterangan || null,
      menit: menit ? parseInt(menit) : null,
      updatedById: guruId,
    },
    create: {
      siswaId,
      kelasId,
      semesterId,
      tanggal: tgl,
      sesi,
      status,
      keterangan: keterangan || null,
      menit: menit ? parseInt(menit) : null,
      createdById: guruId,
    },
  });

  await auditLog({
    userId: req.user?.id,
    aksi: 'SIMPAN_ABSENSI_SATU',
    tabel: 'absensi',
    dataAfter: { siswaId, tanggal, status },
    req,
  });

  return success(res, absensi, 'Absensi berhasil disimpan');
});

/**
 * Simpan absensi massal berdasarkan tingkat/kelas tertentu untuk 1 hari
 * Contoh: semua kelas 11 → DISPENSASI hari ini
 */
const simpanMassalTingkat = asyncHandler(async (req, res) => {
  const { tingkat, kelasIds, tanggal, sesi = 'PAGI', semesterId: semesterIdBody, status, keterangan } = req.body;

  if ((!tingkat && !kelasIds?.length) || !tanggal || !status) {
    return badRequest(res, 'Data tidak lengkap');
  }

  // Auto-ambil semester aktif jika tidak dikirim
  let semesterId = semesterIdBody;
  if (!semesterId) {
    const semesterAktif = await prisma.semester.findFirst({ where: { aktif: true } });
    if (!semesterAktif) return badRequest(res, 'Tidak ada semester aktif. Pastikan semester sudah diatur.');
    semesterId = semesterAktif.id;
  }

  const tgl = new Date(tanggal);
  tgl.setHours(0, 0, 0, 0);

  const hariLibur = await prisma.hariLibur.findFirst({ where: { tanggal: tgl } });
  if (hariLibur) {
    return badRequest(res, `Tanggal ${tanggal} adalah hari libur: ${hariLibur.nama}`);
  }

  const guru = req.user?.id
    ? await prisma.guru.findFirst({ where: { userId: req.user.id } })
    : null;
  const guruId = guru?.id || null;

  // Cari kelas berdasarkan tingkat atau kelasIds
  const kelasWhere = { aktif: true };
  if (kelasIds?.length) {
    kelasWhere.id = { in: kelasIds };
  } else if (tingkat) {
    kelasWhere.tingkat = parseInt(tingkat);
    // Filter kelas yang punya semester aktif
    kelasWhere.tahunAjaran = { aktif: true };
  }

  const kelasList = await prisma.kelas.findMany({
    where: kelasWhere,
    select: { id: true, nama: true },
  });

  if (!kelasList.length) {
    return badRequest(res, 'Tidak ada kelas ditemukan');
  }

  // Ambil semua siswa aktif di kelas-kelas tersebut
  const siswaKelas = await prisma.siswaKelas.findMany({
    where: {
      kelasId: { in: kelasList.map(k => k.id) },
      aktif: true,
      siswa: { status: 'AKTIF' },
    },
    select: { siswaId: true, kelasId: true },
  });

  let countBaru = 0;
  let countUpdate = 0;

  if (siswaKelas.length > 0) {
    // Cek absensi yang sudah ada dalam 1 query
    const siswaIds = siswaKelas.map(sk => sk.siswaId);
    const existingList = await prisma.absensi.findMany({
      where: { siswaId: { in: siswaIds }, tanggal: tgl, sesi },
      select: { id: true, siswaId: true },
    });
    const existingMap = new Map(existingList.map(e => [e.siswaId, e.id]));

    const toCreate = siswaKelas.filter(sk => !existingMap.has(sk.siswaId));
    const toUpdate = siswaKelas.filter(sk =>  existingMap.has(sk.siswaId));

    // Batch create
    if (toCreate.length) {
      await prisma.absensi.createMany({
        data: toCreate.map(sk => ({
          siswaId: sk.siswaId, kelasId: sk.kelasId, semesterId,
          tanggal: tgl, sesi, status,
          keterangan: keterangan || null, createdById: guruId,
        })),
        skipDuplicates: true,
      });
      countBaru = toCreate.length;
    }

    // Batch update (updateMany per status agar efisien)
    if (toUpdate.length) {
      await prisma.absensi.updateMany({
        where: { id: { in: toUpdate.map(sk => existingMap.get(sk.siswaId)) } },
        data: { status, keterangan: keterangan || null, updatedById: guruId },
      });
      countUpdate = toUpdate.length;
    }
  }

  await auditLog({
    userId: req.user?.id,
    aksi: 'SIMPAN_MASSAL_TINGKAT',
    tabel: 'absensi',
    dataAfter: {
      tingkat, kelasIds,
      kelasNama: kelasList.map(k => k.nama), // ← nama kelas yang mudah dibaca
      tanggal, status,
      jumlahSiswa: siswaKelas.length,
      baru: countBaru,
      diupdate: countUpdate,
    },
    req,
  });

  return success(res, {
    kelas: kelasList.map(k => k.nama),
    jumlahSiswa: siswaKelas.length,
    baru: countBaru,
    diupdate: countUpdate,
  }, `Berhasil: ${countBaru + countUpdate} siswa dari ${kelasList.length} kelas dicatat ${status}`);
});

/**
 * Simpan absensi massal untuk rentang tanggal (untuk PKL, magang, dll)
 * Contoh: kelas 12 TKJ → DINAS setiap hari kerja dari tgl A sampai tgl B
 */
const simpanMassalRentang = asyncHandler(async (req, res) => {
  const {
    kelasIds, tanggalMulai, tanggalSelesai,
    sesi = 'PAGI', semesterId: semesterIdBody, status, keterangan,
    hariKerja = [1,2,3,4,5],
    skipHariLibur = true,
    overwrite = false,
  } = req.body;

  if (!kelasIds?.length || !tanggalMulai || !tanggalSelesai || !status) {
    return badRequest(res, 'Data tidak lengkap');
  }

  // Jika semesterId tidak dikirim, ambil dari semester aktif
  let semesterId = semesterIdBody;
  if (!semesterId) {
    const semesterAktif = await prisma.semester.findFirst({ where: { aktif: true } });
    if (!semesterAktif) return badRequest(res, 'Tidak ada semester aktif. Pastikan semester sudah diatur.');
    semesterId = semesterAktif.id;
  }

  const tglMulai = new Date(tanggalMulai);
  tglMulai.setHours(0, 0, 0, 0);
  const tglSelesai = new Date(tanggalSelesai);
  tglSelesai.setHours(0, 0, 0, 0);

  if (tglMulai > tglSelesai) {
    return badRequest(res, 'Tanggal mulai harus sebelum tanggal selesai');
  }

  // Maksimal 6 bulan
  const diffDays = Math.ceil((tglSelesai - tglMulai) / (1000 * 60 * 60 * 24));
  if (diffDays > 186) {
    return badRequest(res, 'Rentang maksimal 6 bulan (186 hari)');
  }

  const guru = req.user?.id
    ? await prisma.guru.findFirst({ where: { userId: req.user.id } })
    : null;
  const guruId = guru?.id || null;

  // Ambil semua hari libur dalam rentang
  const hariLiburList = skipHariLibur
    ? await prisma.hariLibur.findMany({
        where: { tanggal: { gte: tglMulai, lte: tglSelesai } },
        select: { tanggal: true },
      })
    : [];
  const hariLiburSet = new Set(
    hariLiburList.map(h => h.tanggal.toISOString().split('T')[0])
  );

  // Ambil siswa aktif di kelas yang dipilih
  const siswaKelas = await prisma.siswaKelas.findMany({
    where: {
      kelasId: { in: kelasIds },
      aktif: true,
      siswa: { status: 'AKTIF' },
    },
    select: { siswaId: true, kelasId: true },
  });

  if (!siswaKelas.length) {
    return badRequest(res, 'Tidak ada siswa aktif di kelas yang dipilih');
  }

  // Generate semua tanggal valid dalam rentang
  const tanggalList = [];
  const cursor = new Date(tglMulai);
  while (cursor <= tglSelesai) {
    const dayOfWeek = cursor.getDay();
    const dateStr = cursor.toISOString().split('T')[0];
    if (hariKerja.includes(dayOfWeek) && !hariLiburSet.has(dateStr)) {
      tanggalList.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (!tanggalList.length) {
    return badRequest(res, 'Tidak ada hari kerja valid dalam rentang yang dipilih');
  }

  let countBaru = 0;
  let countSkip = 0;
  let countUpdate = 0;

  // Proses per tanggal secara batch
  for (const tgl of tanggalList) {
    const siswaIds = siswaKelas.map(sk => sk.siswaId);

    // Ambil absensi yang sudah ada
    const existing = await prisma.absensi.findMany({
      where: { siswaId: { in: siswaIds }, tanggal: tgl, sesi },
      select: { id: true, siswaId: true },
    });
    const existingMap = new Map(existing.map(e => [e.siswaId, e.id]));

    const toCreate = [];
    const toUpdate = [];

    for (const sk of siswaKelas) {
      if (existingMap.has(sk.siswaId)) {
        if (overwrite) {
          toUpdate.push({ id: existingMap.get(sk.siswaId), siswaId: sk.siswaId });
          countUpdate++;
        } else {
          countSkip++;
        }
      } else {
        toCreate.push({
          siswaId: sk.siswaId,
          kelasId: sk.kelasId,
          semesterId,
          tanggal: tgl,
          sesi,
          status,
          keterangan: keterangan || null,
          createdById: guruId,
        });
        countBaru++;
      }
    }

    if (toCreate.length) {
      await prisma.absensi.createMany({ data: toCreate, skipDuplicates: true });
    }
    if (toUpdate.length && overwrite) {
      await Promise.all(
        toUpdate.map(u =>
          prisma.absensi.update({
            where: { id: u.id },
            data: { status, keterangan: keterangan || null, updatedById: guruId },
          })
        )
      );
    }
  }

  // Ambil nama kelas untuk response
  const kelasList = await prisma.kelas.findMany({
    where: { id: { in: kelasIds } },
    select: { nama: true },
  });

  await auditLog({
    userId: req.user?.id,
    aksi: 'SIMPAN_MASSAL_RENTANG',
    tabel: 'absensi',
    dataAfter: {
      kelasIds,
      kelasNama: kelasList.map(k => k.nama), // ← nama kelas yang mudah dibaca
      tanggalMulai, tanggalSelesai, status,
      jumlahHari: tanggalList.length,
      jumlahSiswa: siswaKelas.length,
      baru: countBaru,
      diupdate: countUpdate,
      dilewati: countSkip,
    },
    req,
  });

  return success(res, {
    kelas: kelasList.map(k => k.nama),
    jumlahHariDiproses: tanggalList.length,
    jumlahSiswa: siswaKelas.length,
    baru: countBaru,
    diupdate: countUpdate,
    dilewati: countSkip,
  }, `Selesai: ${countBaru} absensi dibuat, ${countUpdate} diupdate, ${countSkip} dilewati dari ${tanggalList.length} hari kerja`);
});

/**
 * Hapus absensi massal — hapus semua record berdasarkan kelasIds + rentang tanggal + sesi
 */
const hapusMassal = asyncHandler(async (req, res) => {
  const { kelasIds, tanggalMulai, tanggalSelesai, sesi, status } = req.body;

  if (!kelasIds?.length || !tanggalMulai || !tanggalSelesai) {
    return badRequest(res, 'kelasIds, tanggalMulai, dan tanggalSelesai wajib diisi');
  }

  const tglMulai  = new Date(tanggalMulai);  tglMulai.setHours(0,0,0,0);
  const tglSelesai = new Date(tanggalSelesai); tglSelesai.setHours(23,59,59,999);

  const where = {
    kelasId: { in: kelasIds },
    tanggal: { gte: tglMulai, lte: tglSelesai },
  };
  if (sesi)   where.sesi   = sesi;
  if (status) where.status = status;

  // Hitung dulu sebelum hapus untuk response
  const jumlah = await prisma.absensi.count({ where });

  const result = await prisma.absensi.deleteMany({ where });

  // Ambil nama kelas untuk audit
  const kelasList = await prisma.kelas.findMany({
    where: { id: { in: kelasIds } },
    select: { nama: true },
  });

  await auditLog({
    userId: req.user?.id,
    aksi: 'HAPUS_MASSAL_ABSENSI',
    tabel: 'absensi',
    dataAfter: {
      kelasIds,
      kelasNama: kelasList.map(k => k.nama),
      tanggalMulai, tanggalSelesai, sesi, status,
      jumlahDihapus: result.count,
    },
    req,
  });

  return success(res, {
    kelas: kelasList.map(k => k.nama),
    jumlahDihapus: result.count,
  }, `${result.count} record absensi berhasil dihapus dari ${kelasList.length} kelas`);
});

/**
 * Hapus / kosongkan absensi siswa pada tanggal & sesi tertentu
 */
const hapus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const absensi = await prisma.absensi.findUnique({ where: { id } });
  if (!absensi) return notFound(res, 'Data absensi tidak ditemukan');

  await prisma.absensi.delete({ where: { id } });

  await auditLog({
    userId: req.user?.id,
    aksi: 'HAPUS_ABSENSI',
    tabel: 'absensi',
    dataId: id,
    dataBefore: absensi,
    req,
  });

  return success(res, null, 'Absensi berhasil dihapus');
});

module.exports = {
  getByTanggalKelas,
  simpanMassal,
  simpanSatu,
  searchSiswaLintas,
  getById,
  update,
  hapus,
  hapusMassal,
  getRiwayatSiswa,
  getRiwayatKelas,
  uploadLampiran,
  getRekapHarian,
  simpanMassalTingkat,
  simpanMassalRentang,
};
