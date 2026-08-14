const prisma = require('../config/prisma');
const { success, created, notFound, paginate } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, tahunAjaranId, jurusanId, tingkat, aktif = true } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId;
  if (jurusanId) where.jurusanId = jurusanId;
  if (tingkat) where.tingkat = parseInt(tingkat);
  if (aktif !== undefined) where.aktif = aktif === 'true' || aktif === true;

  const [data, total] = await Promise.all([
    prisma.kelas.findMany({
      where, skip, take: parseInt(limit),
      orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
      include: {
        jurusan: { select: { id: true, nama: true, kode: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        waliKelas: { select: { id: true, nama: true } },
        _count: { select: { siswaKelas: { where: { aktif: true } } } },
      },
    }),
    prisma.kelas.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const kelas = await prisma.kelas.findUnique({
    where: { id: req.params.id },
    include: {
      jurusan: true,
      tahunAjaran: true,
      waliKelas: true,
      siswaKelas: {
        where: { aktif: true },
        include: {
          siswa: {
            select: { id: true, nama: true, nis: true, jenisKelamin: true, foto: true, akumulasiPoin: true },
          },
        },
        orderBy: { siswa: { nama: 'asc' } },
      },
    },
  });
  if (!kelas) return notFound(res, 'Kelas tidak ditemukan');
  return success(res, kelas);
});

const create = asyncHandler(async (req, res) => {
  const { nama, tingkat, jurusanId, tahunAjaranId, waliKelasId, kapasitas } = req.body;

  const kelas = await prisma.kelas.create({
    data: {
      nama, tingkat: parseInt(tingkat),
      jurusanId, tahunAjaranId,
      waliKelasId: waliKelasId || null,
      kapasitas: kapasitas ? parseInt(kapasitas) : 36,
    },
  });

  return created(res, kelas, 'Kelas berhasil ditambahkan');
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const kelas = await prisma.kelas.findUnique({ where: { id } });
  if (!kelas) return notFound(res, 'Kelas tidak ditemukan');

  const updateData = { ...req.body };
  if (updateData.tingkat) updateData.tingkat = parseInt(updateData.tingkat);
  if (updateData.kapasitas) updateData.kapasitas = parseInt(updateData.kapasitas);

  const updated = await prisma.kelas.update({ where: { id }, data: updateData });
  return success(res, updated, 'Kelas berhasil diperbarui');
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const kelas = await prisma.kelas.findUnique({ where: { id } });
  if (!kelas) return notFound(res, 'Kelas tidak ditemukan');

  await prisma.$transaction([
    prisma.siswaKelas.deleteMany({ where: { kelasId: id } }),
    prisma.kelas.delete({ where: { id } }),
  ]);

  return success(res, null, 'Kelas berhasil dihapus');
});

const bulkRemove = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    const { badRequest } = require('../utils/response');
    return badRequest(res, 'IDs tidak boleh kosong');
  }

  await prisma.$transaction([
    prisma.siswaKelas.deleteMany({ where: { kelasId: { in: ids } } }),
    prisma.kelas.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return success(res, { count: ids.length }, `${ids.length} kelas berhasil dihapus`);
});

const assignSiswa = asyncHandler(async (req, res) => {
  const { kelasId } = req.params;
  const { siswaId } = req.body;

  // Deactivate previous class assignment
  await prisma.siswaKelas.updateMany({
    where: { siswaId, aktif: true },
    data: { aktif: false, selesai: new Date() },
  });

  // Assign to new class
  const sk = await prisma.siswaKelas.upsert({
    where: { siswaId_kelasId: { siswaId, kelasId } },
    update: { aktif: true, mulai: new Date(), selesai: null },
    create: { siswaId, kelasId, mulai: new Date(), aktif: true },
  });

  return success(res, sk, 'Siswa berhasil dipindahkan ke kelas');
});

const getStatistikKelas = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { semesterId } = req.query;

  const kelas = await prisma.kelas.findUnique({ where: { id } });
  if (!kelas) return notFound(res, 'Kelas tidak ditemukan');

  const where = { kelasId: id };
  if (semesterId) where.semesterId = semesterId;

  const [absensiStats, siswaCount, siswaBerisiko] = await Promise.all([
    prisma.absensi.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
    prisma.siswaKelas.count({ where: { kelasId: id, aktif: true } }),
    prisma.siswaKelas.findMany({
      where: { kelasId: id, aktif: true },
      include: {
        siswa: {
          include: { akumulasiPoin: true },
        },
      },
    }),
  ]);

  const statusMap = {};
  absensiStats.forEach(s => { statusMap[s.status] = s._count.status; });

  return success(res, {
    kelas: { id: kelas.id, nama: kelas.nama, tingkat: kelas.tingkat },
    jumlahSiswa: siswaCount,
    kehadiran: statusMap,
    siswaBerisiko: siswaBerisiko
      .filter(sk => sk.siswa.akumulasiPoin?.totalPoin >= 25)
      .map(sk => ({
        ...sk.siswa,
        totalPoin: sk.siswa.akumulasiPoin?.totalPoin,
        statusPeringatan: sk.siswa.akumulasiPoin?.statusPeringatan,
      })),
  });
});

module.exports = { getAll, getById, create, update, remove, bulkRemove, assignSiswa, getStatistikKelas };
