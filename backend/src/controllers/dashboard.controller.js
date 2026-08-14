const prisma = require('../config/prisma');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

const getSummaryToday = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [absensiToday, totalSiswa] = await Promise.all([
    prisma.absensi.groupBy({
      by: ['status'],
      where: { tanggal: today },
      _count: { status: true },
    }),
    prisma.siswa.count({ where: { status: 'AKTIF' } }),
  ]);

  const statusMap = {};
  absensiToday.forEach(a => { statusMap[a.status] = a._count.status; });

  const summary = {
    hadir: statusMap.HADIR || 0,
    sakit: statusMap.SAKIT || 0,
    izin: statusMap.IZIN || 0,
    alpha: statusMap.ALPHA || 0,
    dispensasi: statusMap.DISPENSASI || 0,
    terlambat: statusMap.TERLAMBAT || 0,
    pulangCepat: statusMap.PULANG_CEPAT || 0,
    dinas: statusMap.DINAS || 0,
    totalSiswa,
    tanggal: today,
  };

  return success(res, summary);
});

const getChartHarian = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - parseInt(days) + 1);

  const absensi = await prisma.absensi.groupBy({
    by: ['tanggal', 'status'],
    where: { tanggal: { gte: startDate, lte: endDate } },
    _count: { status: true },
  });

  // Build date range
  const dateRange = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dateRange.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const chart = dateRange.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const entries = absensi.filter(a => a.tanggal.toISOString().split('T')[0] === dateStr);
    const statusMap = {};
    entries.forEach(e => { statusMap[e.status] = e._count.status; });
    return {
      tanggal: dateStr,
      hadir: statusMap.HADIR || 0,
      sakit: statusMap.SAKIT || 0,
      izin: statusMap.IZIN || 0,
      alpha: statusMap.ALPHA || 0,
      terlambat: statusMap.TERLAMBAT || 0,
    };
  });

  return success(res, chart);
});

const getChartBulanan = asyncHandler(async (req, res) => {
  const { tahun } = req.query;
  const year = parseInt(tahun) || new Date().getFullYear();

  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  const absensi = await prisma.absensi.findMany({
    where: { tanggal: { gte: startDate, lte: endDate } },
    select: { tanggal: true, status: true },
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const bulan = i + 1;
    const entries = absensi.filter(a => (a.tanggal.getMonth() + 1) === bulan);
    const statusMap = {};
    entries.forEach(e => { statusMap[e.status] = (statusMap[e.status] || 0) + 1; });
    return {
      bulan,
      namaBulan: new Date(year, i, 1).toLocaleString('id-ID', { month: 'long' }),
      hadir: statusMap.HADIR || 0,
      sakit: statusMap.SAKIT || 0,
      izin: statusMap.IZIN || 0,
      alpha: statusMap.ALPHA || 0,
      terlambat: statusMap.TERLAMBAT || 0,
    };
  });

  return success(res, months);
});

const getTopAlpha = asyncHandler(async (req, res) => {
  const { limit = 10, semesterId } = req.query;

  const where = { status: 'ALPHA' };
  if (semesterId) where.semesterId = semesterId;

  const result = await prisma.absensi.groupBy({
    by: ['siswaId'],
    where,
    _count: { siswaId: true },
    orderBy: { _count: { siswaId: 'desc' } },
    take: parseInt(limit),
  });

  const siswaIds = result.map(r => r.siswaId);
  const siswaList = await prisma.siswa.findMany({
    where: { id: { in: siswaIds } },
    select: {
      id: true, nama: true, nis: true, foto: true,
      kelasHistori: {
        where: { aktif: true },
        select: { kelas: { select: { nama: true } } },
        take: 1,
      },
    },
  });

  const siswaMap = {};
  siswaList.forEach(s => { siswaMap[s.id] = s; });

  const data = result.map(r => ({
    siswa: siswaMap[r.siswaId],
    jumlahAlpha: r._count.siswaId,
  }));

  return success(res, data);
});

const getTopTerlambat = asyncHandler(async (req, res) => {
  const { limit = 10, semesterId } = req.query;

  const where = { status: 'TERLAMBAT' };
  if (semesterId) where.semesterId = semesterId;

  const result = await prisma.absensi.groupBy({
    by: ['siswaId'],
    where,
    _count: { siswaId: true },
    orderBy: { _count: { siswaId: 'desc' } },
    take: parseInt(limit),
  });

  const siswaIds = result.map(r => r.siswaId);
  const siswaList = await prisma.siswa.findMany({
    where: { id: { in: siswaIds } },
    select: {
      id: true, nama: true, nis: true, foto: true,
      kelasHistori: {
        where: { aktif: true },
        select: { kelas: { select: { nama: true } } },
        take: 1,
      },
    },
  });

  const siswaMap = {};
  siswaList.forEach(s => { siswaMap[s.id] = s; });

  const data = result.map(r => ({
    siswa: siswaMap[r.siswaId],
    jumlahTerlambat: r._count.siswaId,
  }));

  return success(res, data);
});

const getKelasTerbaik = asyncHandler(async (req, res) => {
  const { semesterId, limit = 5 } = req.query;

  const where = {};
  if (semesterId) where.semesterId = semesterId;

  const absensi = await prisma.absensi.groupBy({
    by: ['kelasId', 'status'],
    where,
    _count: { status: true },
  });

  const kelasIds = [...new Set(absensi.map(a => a.kelasId))];
  const kelasList = await prisma.kelas.findMany({
    where: { id: { in: kelasIds } },
    select: { id: true, nama: true, tingkat: true },
  });
  const kelasMap = {};
  kelasList.forEach(k => { kelasMap[k.id] = k; });

  const kelasStats = {};
  absensi.forEach(a => {
    if (!kelasStats[a.kelasId]) kelasStats[a.kelasId] = { total: 0, hadir: 0 };
    kelasStats[a.kelasId].total += a._count.status;
    if (a.status === 'HADIR') kelasStats[a.kelasId].hadir += a._count.status;
  });

  const result = Object.entries(kelasStats)
    .map(([kelasId, stat]) => ({
      kelas: kelasMap[kelasId],
      persentaseHadir: stat.total > 0 ? Math.round((stat.hadir / stat.total) * 100) : 0,
      total: stat.total,
      hadir: stat.hadir,
    }))
    .sort((a, b) => b.persentaseHadir - a.persentaseHadir)
    .slice(0, parseInt(limit));

  return success(res, result);
});

const getHeatmap = asyncHandler(async (req, res) => {
  const { tahun, kelasId } = req.query;
  const year = parseInt(tahun) || new Date().getFullYear();

  const where = {
    tanggal: {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`),
    },
    status: 'ALPHA',
  };
  if (kelasId) where.kelasId = kelasId;

  const absensi = await prisma.absensi.groupBy({
    by: ['tanggal'],
    where,
    _count: { tanggal: true },
  });

  const heatmap = absensi.map(a => ({
    date: a.tanggal.toISOString().split('T')[0],
    count: a._count.tanggal,
  }));

  return success(res, heatmap);
});

const getStatistikPerJurusan = asyncHandler(async (req, res) => {
  const { semesterId } = req.query;

  const jurusan = await prisma.jurusan.findMany({
    where: { aktif: true },
    include: {
      kelas: {
        select: { id: true },
        where: { aktif: true },
      },
    },
  });

  const result = await Promise.all(jurusan.map(async j => {
    const kelasIds = j.kelas.map(k => k.id);
    const where = { kelasId: { in: kelasIds } };
    if (semesterId) where.semesterId = semesterId;

    const stats = await prisma.absensi.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const statusMap = {};
    stats.forEach(s => { statusMap[s.status] = s._count.status; });

    return {
      jurusan: { id: j.id, nama: j.nama, kode: j.kode },
      hadir: statusMap.HADIR || 0,
      sakit: statusMap.SAKIT || 0,
      izin: statusMap.IZIN || 0,
      alpha: statusMap.ALPHA || 0,
      terlambat: statusMap.TERLAMBAT || 0,
    };
  }));

  return success(res, result);
});

const getSummaryBK = asyncHandler(async (req, res) => {
  const [risikoTinggi, perigatanSP2, totalPelanggaran] = await Promise.all([
    prisma.akumulasiPoin.count({
      where: { statusPeringatan: { in: ['SP2', 'PANGGILAN_ORTU', 'REKOMENDASI_BK'] } },
    }),
    prisma.akumulasiPoin.findMany({
      where: { statusPeringatan: { in: ['SP2', 'PANGGILAN_ORTU', 'REKOMENDASI_BK'] } },
      include: {
        siswa: {
          select: {
            id: true, nama: true, nis: true,
            kelasHistori: {
              where: { aktif: true },
              select: { kelas: { select: { nama: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { totalPoin: 'desc' },
      take: 10,
    }),
    prisma.pelanggaran.count(),
  ]);

  return success(res, {
    risikoTinggi,
    totalPelanggaran,
    siswaBerisiko: perigatanSP2.map(ap => ({
      ...ap.siswa,
      totalPoin: ap.totalPoin,
      statusPeringatan: ap.statusPeringatan,
    })),
  });
});

const getSiswaPerKelas = asyncHandler(async (req, res) => {
  const { kelasId } = req.query;

  // Jika tidak ada kelasId, kembalikan semua kelas + jumlah siswa
  if (!kelasId) {
    const kelasList = await prisma.kelas.findMany({
      where: { aktif: true },
      include: {
        _count: {
          select: { siswaKelas: { where: { aktif: true } } },
        },
        jurusan: { select: { singkatan: true } },
        tahunAjaran: { select: { nama: true } },
      },
      orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
    });

    return success(res, kelasList.map(k => ({
      id: k.id,
      nama: k.nama,
      tingkat: k.tingkat,
      jurusan: k.jurusan?.singkatan,
      tahunAjaran: k.tahunAjaran?.nama,
      jumlahSiswa: k._count.siswaKelas,
    })));
  }

  // Jika ada kelasId, kembalikan daftar siswa di kelas tersebut
  const siswaKelas = await prisma.siswaKelas.findMany({
    where: { kelasId, aktif: true },
    include: {
      siswa: {
        select: {
          id: true,
          nis: true,
          nisn: true,
          nama: true,
          jenisKelamin: true,
          foto: true,
          status: true,
          telepon: true,
          namaOrtu: true,
          teleponOrtu: true,
          akumulasiPoin: {
            select: { totalPoin: true, statusPeringatan: true },
          },
        },
      },
    },
    orderBy: { siswa: { nama: 'asc' } },
  });

  return success(res, siswaKelas.map(sk => sk.siswa));
});

module.exports = {
  getSummaryToday,
  getChartHarian,
  getChartBulanan,
  getTopAlpha,
  getTopTerlambat,
  getKelasTerbaik,
  getHeatmap,
  getStatistikPerJurusan,
  getSummaryBK,
  getSiswaPerKelas,
};
