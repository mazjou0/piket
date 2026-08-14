const prisma = require('../config/prisma');
const { success, badRequest } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const { generatePDF } = require('../services/pdf.service');
const { generateExcel } = require('../services/excel.service');

const getRekapAbsensi = asyncHandler(async (req, res) => {
  const { tanggalMulai, tanggalSelesai, kelasId, jurusanId, semesterId } = req.query;
  if (!tanggalMulai || !tanggalSelesai) return badRequest(res, 'Tanggal wajib diisi');

  const where = {
    tanggal: { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) },
  };
  if (kelasId) where.kelasId = kelasId;
  if (semesterId) where.semesterId = semesterId;
  if (jurusanId) {
    where.kelas = { jurusanId };
  }

  const absensi = await prisma.absensi.groupBy({
    by: ['siswaId', 'status'],
    where,
    _count: { status: true },
  });

  const siswaIds = [...new Set(absensi.map(a => a.siswaId))];
  const siswaList = await prisma.siswa.findMany({
    where: { id: { in: siswaIds } },
    select: {
      id: true, nama: true, nis: true, nisn: true,
      tanggalMasuk: true,
      kelasHistori: {
        where: { aktif: true },
        select: { kelas: { select: { nama: true } } },
        take: 1,
      },
    },
  });
  const siswaMap = {};
  siswaList.forEach(s => { siswaMap[s.id] = s; });

  const siswaRekap = {};
  absensi.forEach(a => {
    if (!siswaRekap[a.siswaId]) {
      siswaRekap[a.siswaId] = {
        siswa: siswaMap[a.siswaId],
        hadir: 0, sakit: 0, izin: 0, alpha: 0,
        dispensasi: 0, terlambat: 0, pulangCepat: 0, dinas: 0, lainnya: 0, total: 0,
      };
    }
    const statusKeyMap = {
      'HADIR': 'hadir', 'SAKIT': 'sakit', 'IZIN': 'izin', 'ALPHA': 'alpha',
      'DISPENSASI': 'dispensasi', 'TERLAMBAT': 'terlambat', 'PULANG_CEPAT': 'pulangCepat',
      'DINAS': 'dinas', 'LAINNYA': 'lainnya',
    };
    const key = statusKeyMap[a.status] || a.status.toLowerCase();
    if (siswaRekap[a.siswaId][key] !== undefined) {
      siswaRekap[a.siswaId][key] = a._count.status;
    }
    siswaRekap[a.siswaId].total += a._count.status;
  });

  return success(res, Object.values(siswaRekap));
});

const getRekapPerKelas = asyncHandler(async (req, res) => {
  const { tanggalMulai, tanggalSelesai, kelasId, jurusanId, semesterId } = req.query;
  if (!tanggalMulai || !tanggalSelesai) return badRequest(res, 'Tanggal wajib diisi');

  const kelasWhere = { aktif: true };
  if (kelasId)   kelasWhere.id        = kelasId;
  if (jurusanId) kelasWhere.jurusanId = jurusanId;

  const kelasList = await prisma.kelas.findMany({
    where: kelasWhere,
    include: { jurusan: { select: { kode: true, nama: true } } },
    orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
  });

  const result = await Promise.all(kelasList.map(async kelas => {
    const baseWhere = {
      kelasId: kelas.id,
      tanggal: { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) },
    };
    if (semesterId) baseWhere.semesterId = semesterId;

    // Ambil jumlah siswa aktif di kelas
    const jumlahSiswa = await prisma.siswaKelas.count({
      where: { kelasId: kelas.id, aktif: true },
    });

    // Hitung status reguler (per siswa per hari) — groupBy status
    const stats = await prisma.absensi.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { status: true },
    });
    const statusMap = {};
    stats.forEach(s => { statusMap[s.status] = s._count.status; });

    // DN: hitung hari unik PKL DAN total record (siswa × hari)
    const dinasDays = await prisma.absensi.groupBy({
      by: ['tanggal'],
      where: { ...baseWhere, status: 'DINAS' },
    });
    const dinasHari        = dinasDays.length;                  // berapa hari PKL berlangsung
    const dinasTotal       = statusMap.DINAS || 0;              // total record (siswa × hari)
    const dinasPerSiswa    = dinasHari > 0 && jumlahSiswa > 0   // rata-rata hari per siswa
      ? Math.round(dinasTotal / jumlahSiswa)
      : 0;

    // Total hari efektif per siswa (hadir + sakit + izin + alpha + dispensasi + terlambat + PC + lainnya)
    const totalTanpaDN = (statusMap.HADIR||0) + (statusMap.SAKIT||0) + (statusMap.IZIN||0) +
      (statusMap.ALPHA||0) + (statusMap.DISPENSASI||0) + (statusMap.TERLAMBAT||0) +
      (statusMap.PULANG_CEPAT||0) + (statusMap.LAINNYA||0);

    // Untuk % kehadiran:
    // - Jika kelas sedang PKL penuh (hanya ada DN, tidak ada hadir/alpha): % = 100%
    // - Jika kelas campuran: hitung dari totalTanpaDN saja (tidak campur DN)
    const adaHadir = totalTanpaDN > 0;
    const persentase = adaHadir
      ? Math.round(((statusMap.HADIR||0) / totalTanpaDN) * 100)
      : dinasHari > 0 ? 100 : 0;

    // Total ditampilkan: per siswa (jika ada hari sekolah) atau hari PKL (jika full PKL)
    const total = adaHadir ? totalTanpaDN : dinasHari;

    return {
      kelas: { id: kelas.id, nama: kelas.nama, tingkat: kelas.tingkat, jurusan: kelas.jurusan },
      jumlahSiswa,
      hadir:       statusMap.HADIR        || 0,
      sakit:       statusMap.SAKIT        || 0,
      izin:        statusMap.IZIN         || 0,
      alpha:       statusMap.ALPHA        || 0,
      dispensasi:  statusMap.DISPENSASI   || 0,
      terlambat:   statusMap.TERLAMBAT    || 0,
      pulangCepat: statusMap.PULANG_CEPAT || 0,
      dinas:       dinasHari,             // hari unik PKL
      dinasTotal,                         // total record siswa × hari
      dinasPerSiswa,                      // rata-rata hari PKL per siswa
      lainnya:     statusMap.LAINNYA      || 0,
      total,
      persentaseHadir: persentase,
    };
  }));

  result.sort((a, b) => {
    if (a.kelas.tingkat !== b.kelas.tingkat) return a.kelas.tingkat - b.kelas.tingkat;
    return a.kelas.nama.localeCompare(b.kelas.nama, 'id', { numeric: true, sensitivity: 'base' });
  });

  return success(res, result);
});

const getRekapPelanggaran = asyncHandler(async (req, res) => {
  const { tanggalMulai, tanggalSelesai, kelasId, jurusanId } = req.query;

  const where = {};
  if (tanggalMulai && tanggalSelesai) {
    where.tanggal = { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) };
  }
  if (kelasId) where.kelasId = kelasId;

  const pelanggaran = await prisma.pelanggaran.findMany({
    where,
    include: {
      siswa: { select: { id: true, nama: true, nis: true, nisn: true } },
      kelas: { select: { nama: true } },
      jenisPelanggaran: { select: { nama: true, poin: true } },
    },
    orderBy: { tanggal: 'desc' },
    take: 1000, // batasi agar tidak OOM
  });

  return success(res, pelanggaran);
});

const exportPDF = asyncHandler(async (req, res) => {
  const { type, pageSize = 'A4', tanggalMulai, tanggalSelesai, kelasId, semesterId } = req.query;
  const params = { tanggalMulai, tanggalSelesai, kelasId, semesterId };

  // Data user yang sedang login — untuk TTD laporan
  const signer = {
    nama: req.user?.nama || req.user?.username || '',
    nip:  req.user?.nip  || '',
    role: req.user?.role || '',
  };

  let data;
  switch (type) {
    case 'absensi': {
      // Gunakan data rekap (sama seperti yang ditampilkan di tabel)
      const where = {};
      if (tanggalMulai && tanggalSelesai) {
        where.tanggal = { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) };
      }
      if (kelasId) where.kelasId = kelasId;
      if (semesterId) where.semesterId = semesterId;

      const absensi = await prisma.absensi.groupBy({
        by: ['siswaId', 'status'],
        where,
        _count: { status: true },
      });

      const siswaIds = [...new Set(absensi.map(a => a.siswaId))];
      const siswaList = await prisma.siswa.findMany({
        where: { id: { in: siswaIds } },
        select: {
          id: true, nama: true, nis: true,
          kelasHistori: {
            where: { aktif: true },
            select: { kelas: { select: { nama: true } } },
            take: 1,
          },
        },
        orderBy: { nama: 'asc' },
      });
      const siswaMap = {};
      siswaList.forEach(s => { siswaMap[s.id] = s; });

      const siswaRekap = {};
      absensi.forEach(a => {
        if (!siswaRekap[a.siswaId]) {
          siswaRekap[a.siswaId] = {
            siswa: siswaMap[a.siswaId],
            hadir: 0, sakit: 0, izin: 0, alpha: 0,
            dispensasi: 0, terlambat: 0, pulangCepat: 0, dinas: 0, lainnya: 0, total: 0,
          };
        }
        const statusKeyMap = {
          'HADIR': 'hadir', 'SAKIT': 'sakit', 'IZIN': 'izin', 'ALPHA': 'alpha',
          'DISPENSASI': 'dispensasi', 'TERLAMBAT': 'terlambat', 'PULANG_CEPAT': 'pulangCepat',
          'DINAS': 'dinas', 'LAINNYA': 'lainnya',
        };
        const key = statusKeyMap[a.status] || a.status.toLowerCase();
        if (siswaRekap[a.siswaId][key] !== undefined) {
          siswaRekap[a.siswaId][key] = a._count.status;
        }
        siswaRekap[a.siswaId].total += a._count.status;
      });

      data = { type: 'absensi', records: Object.values(siswaRekap), params };
      break;
    }
    case 'rekap-kelas': {
      const kelasWhere = { aktif: true };
      if (kelasId) kelasWhere.id = kelasId;
      const kelasList = await prisma.kelas.findMany({
        where: kelasWhere,
        include: { jurusan: { select: { kode: true, nama: true } } },
        orderBy: { nama: 'asc' },
      });

      const records = await Promise.all(kelasList.map(async kelas => {
        const where = { kelasId: kelas.id };
        if (tanggalMulai && tanggalSelesai) {
          where.tanggal = { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) };
        }
        const stats = await prisma.absensi.groupBy({ by: ['status'], where, _count: { status: true } });
        const statusMap = {};
        stats.forEach(s => { statusMap[s.status] = s._count.status; });
        const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
        return {
          kelas: { id: kelas.id, nama: kelas.nama, jurusan: kelas.jurusan },
          hadir: statusMap.HADIR || 0, sakit: statusMap.SAKIT || 0,
          izin: statusMap.IZIN || 0, alpha: statusMap.ALPHA || 0,
          dispensasi: statusMap.DISPENSASI || 0, terlambat: statusMap.TERLAMBAT || 0,
          pulangCepat: statusMap.PULANG_CEPAT || 0,
          dinas: statusMap.DINAS || 0, lainnya: statusMap.LAINNYA || 0,
          total,
          persentaseHadir: total > 0 ? Math.round(((statusMap.HADIR || 0) / total) * 100) : 0,
        };
      }));

      data = { type: 'rekap-kelas', records, params, signer };
      break;
    }
    case 'pelanggaran': {
      const result = await prisma.pelanggaran.findMany({
        where: buildPelanggaranWhere({ tanggalMulai, tanggalSelesai, kelasId }),
        include: {
          siswa: { select: { nama: true, nis: true, nisn: true } },
          kelas: { select: { nama: true } },
          jenisPelanggaran: { select: { nama: true, poin: true } },
        },
        orderBy: { tanggal: 'desc' },
        take: 2000,
      });
      data = { type: 'pelanggaran', records: result, params, signer };
      break;
    }
    default:
      return badRequest(res, 'Tipe laporan tidak valid. Gunakan: absensi, rekap-kelas, pelanggaran');
  }

  const pdfBuffer = await generatePDF(data, pageSize);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-${type}-${Date.now()}.pdf`);
  res.send(pdfBuffer);
});

const exportExcel = asyncHandler(async (req, res) => {
  const { type, tanggalMulai, tanggalSelesai, kelasId, semesterId } = req.query;
  const params = { tanggalMulai, tanggalSelesai, kelasId, semesterId };

  let data;
  switch (type) {
    case 'absensi': {
      const where = {};
      if (tanggalMulai && tanggalSelesai) {
        where.tanggal = { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) };
      }
      if (kelasId) where.kelasId = kelasId;

      const absensi = await prisma.absensi.groupBy({
        by: ['siswaId', 'status'], where, _count: { status: true },
      });

      const siswaIds = [...new Set(absensi.map(a => a.siswaId))];
      const siswaList = await prisma.siswa.findMany({
        where: { id: { in: siswaIds } },
        select: {
          id: true, nama: true, nis: true,
          kelasHistori: {
            where: { aktif: true },
            select: { kelas: { select: { nama: true } } },
            take: 1,
          },
        },
        orderBy: { nama: 'asc' },
      });
      const siswaMap = {};
      siswaList.forEach(s => { siswaMap[s.id] = s; });

      const siswaRekap = {};
      absensi.forEach(a => {
        if (!siswaRekap[a.siswaId]) {
          siswaRekap[a.siswaId] = {
            siswa: siswaMap[a.siswaId],
            hadir: 0, sakit: 0, izin: 0, alpha: 0,
            dispensasi: 0, terlambat: 0, pulangCepat: 0, dinas: 0, lainnya: 0, total: 0,
          };
        }
        const statusKeyMap = {
          'HADIR': 'hadir', 'SAKIT': 'sakit', 'IZIN': 'izin', 'ALPHA': 'alpha',
          'DISPENSASI': 'dispensasi', 'TERLAMBAT': 'terlambat', 'PULANG_CEPAT': 'pulangCepat',
          'DINAS': 'dinas', 'LAINNYA': 'lainnya',
        };
        const key = statusKeyMap[a.status] || a.status.toLowerCase();
        if (siswaRekap[a.siswaId][key] !== undefined) {
          siswaRekap[a.siswaId][key] = a._count.status;
        }
        siswaRekap[a.siswaId].total += a._count.status;
      });

      data = { type: 'absensi', records: Object.values(siswaRekap), params };
      break;
    }
    case 'rekap-kelas': {
      const kelasWhere = { aktif: true };
      if (kelasId) kelasWhere.id = kelasId;
      const kelasList = await prisma.kelas.findMany({
        where: kelasWhere,
        include: { jurusan: { select: { kode: true } } },
        orderBy: { nama: 'asc' },
      });

      const records = await Promise.all(kelasList.map(async kelas => {
        const where = { kelasId: kelas.id };
        if (tanggalMulai && tanggalSelesai) {
          where.tanggal = { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) };
        }
        const stats = await prisma.absensi.groupBy({ by: ['status'], where, _count: { status: true } });
        const statusMap = {};
        stats.forEach(s => { statusMap[s.status] = s._count.status; });
        const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
        return {
          kelas: { nama: kelas.nama, jurusan: kelas.jurusan },
          hadir: statusMap.HADIR || 0, sakit: statusMap.SAKIT || 0,
          izin: statusMap.IZIN || 0, alpha: statusMap.ALPHA || 0,
          dispensasi: statusMap.DISPENSASI || 0, terlambat: statusMap.TERLAMBAT || 0,
          pulangCepat: statusMap.PULANG_CEPAT || 0,
          dinas: statusMap.DINAS || 0, lainnya: statusMap.LAINNYA || 0,
          total,
          persentaseHadir: total > 0 ? Math.round(((statusMap.HADIR || 0) / total) * 100) : 0,
        };
      }));
      data = { type: 'rekap-kelas', records, params };
      break;
    }
    case 'pelanggaran': {
      const result = await prisma.pelanggaran.findMany({
        where: buildPelanggaranWhere({ tanggalMulai, tanggalSelesai, kelasId }),
        include: {
          siswa: { select: { nama: true, nis: true, nisn: true } },
          kelas: { select: { nama: true } },
          jenisPelanggaran: { select: { nama: true, poin: true } },
        },
        orderBy: { tanggal: 'desc' },
        take: 10000,
      });
      data = { type: 'pelanggaran', records: result, params };
      break;
    }
    default:
      return badRequest(res, 'Tipe tidak valid');
  }

  const excelBuffer = await generateExcel(data);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-${type}-${Date.now()}.xlsx`);
  res.send(excelBuffer);
});

const exportCSV = asyncHandler(async (req, res) => {
  const { type, ...params } = req.query;

  let csvData = '';
  if (type === 'absensi') {
    const records = await prisma.absensi.findMany({
      where: buildAbsensiWhere(params),
      include: {
        siswa: { select: { nama: true, nis: true, nisn: true } },
        kelas: { select: { nama: true } },
      },
      orderBy: { tanggal: 'desc' },
      take: 10000,
    });

    csvData = 'No,NISN,Nama Siswa,Kelas,Tanggal,Status,Keterangan\n';
    records.forEach((r, i) => {
      csvData += `${i + 1},${r.siswa.nisn || r.siswa.nis},"${r.siswa.nama}","${r.kelas.nama}",${r.tanggal.toISOString().split('T')[0]},${r.status},"${r.keterangan || ''}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-${type}-${Date.now()}.csv`);
  res.send('\uFEFF' + csvData); // BOM for Excel UTF-8
});

// ============================================================
// HELPERS
// ============================================================
function buildAbsensiWhere(params) {
  const where = {};
  if (params.tanggalMulai && params.tanggalSelesai) {
    where.tanggal = { gte: new Date(params.tanggalMulai), lte: new Date(params.tanggalSelesai) };
  }
  if (params.kelasId) where.kelasId = params.kelasId;
  if (params.semesterId) where.semesterId = params.semesterId;
  if (params.siswaId) where.siswaId = params.siswaId;
  if (params.status) where.status = params.status;
  return where;
}

function buildPelanggaranWhere(params) {
  const where = {};
  if (params.tanggalMulai && params.tanggalSelesai) {
    where.tanggal = { gte: new Date(params.tanggalMulai), lte: new Date(params.tanggalSelesai) };
  }
  if (params.kelasId) where.kelasId = params.kelasId;
  if (params.siswaId) where.siswaId = params.siswaId;
  return where;
}

// ── Rekap Absensi Detail (Matriks) ─────────────────────────
// Return: { tanggal: ['2026-07-07',...], siswa: [{ siswa, absensi:[{tanggal,status},...] }] }
const getRekapAbsensiDetail = asyncHandler(async (req, res) => {
  const { tanggalMulai, tanggalSelesai, kelasId } = req.query;
  if (!tanggalMulai || !tanggalSelesai) return badRequest(res, 'Tanggal wajib diisi');
  if (!kelasId) return badRequest(res, 'Kelas wajib dipilih untuk rekap matriks');

  const tglMulai = new Date(tanggalMulai);
  const tglAkhir = new Date(tanggalSelesai);
  tglAkhir.setHours(23, 59, 59, 999);

  // Ambil semua absensi dalam rentang untuk kelas yang dipilih
  const absensiList = await prisma.absensi.findMany({
    where: {
      kelasId,
      tanggal: { gte: tglMulai, lte: tglAkhir },
    },
    orderBy: { tanggal: 'asc' },
    select: {
      siswaId: true,
      tanggal: true,
      status: true,
      siswa: { select: { id: true, nama: true, nis: true, nisn: true } },
    },
  });

  // Ambil daftar siswa aktif di kelas ini
  const kelasData = await prisma.siswaKelas.findMany({
    where: { kelasId, aktif: true },
    orderBy: { siswa: { nama: 'asc' } },
    select: { siswa: { select: { id: true, nama: true, nis: true, nisn: true } } },
  });

  // Kumpulkan semua tanggal unik (hari kerja yang ada data absensi)
  const tanggalSet = new Set();
  absensiList.forEach(a => {
    tanggalSet.add(a.tanggal.toISOString().split('T')[0]);
  });
  const tanggalList = [...tanggalSet].sort();

  // Susun map siswaId → [{tanggal, status}]
  const absensiMap = {};
  absensiList.forEach(a => {
    const tgl = a.tanggal.toISOString().split('T')[0];
    if (!absensiMap[a.siswaId]) absensiMap[a.siswaId] = [];
    absensiMap[a.siswaId].push({ tanggal: tgl, status: a.status });
  });

  // Susun hasil per siswa
  const siswaResult = kelasData.map(ks => ({
    siswa: ks.siswa,
    absensi: absensiMap[ks.siswa.id] || [],
  }));

  return success(res, { tanggal: tanggalList, siswa: siswaResult });
});

// ── Rekap Tidak Hadir (S/I/A/D semua kelas) ─────────────────
// Return: array absensi dengan status bukan HADIR, diurutkan tanggal desc
const getRekapTidakHadir = asyncHandler(async (req, res) => {
  const { tanggalMulai, tanggalSelesai, kelasId } = req.query;
  if (!tanggalMulai || !tanggalSelesai) return badRequest(res, 'Tanggal wajib diisi');

  const tglMulai = new Date(tanggalMulai);
  const tglAkhir = new Date(tanggalSelesai);
  tglAkhir.setHours(23, 59, 59, 999);

  const where = {
    tanggal: { gte: tglMulai, lte: tglAkhir },
    status: { not: 'HADIR' },
  };
  if (kelasId) where.kelasId = kelasId;

  const data = await prisma.absensi.findMany({
    where,
    orderBy: [{ tanggal: 'desc' }, { kelas: { nama: 'asc' } }],
    select: {
      id: true,
      tanggal: true,
      status: true,
      keterangan: true,
      siswa: { select: { id: true, nama: true, nis: true, nisn: true } },
      kelas: { select: { id: true, nama: true } },
    },
    take: 2000,
  });

  return success(res, data);
});

module.exports = {
  getRekapAbsensi, getRekapPerKelas, getRekapPelanggaran,
  getRekapAbsensiDetail, getRekapTidakHadir,
  exportPDF, exportExcel, exportCSV,
};
