const prisma = require('../config/prisma');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const { auditLog } = require('../utils/audit');
const { notifikasiPelanggaran } = require('../services/notification.service');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, kelasId, jenisPelanggaranId, tanggalMulai, tanggalSelesai } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.siswa = { OR: [{ nama: { contains: search, mode: 'insensitive' } }, { nis: { contains: search } }] };
  }
  if (kelasId) where.kelasId = kelasId;
  if (jenisPelanggaranId) where.jenisPelanggaranId = jenisPelanggaranId;
  if (tanggalMulai && tanggalSelesai) {
    where.tanggal = { gte: new Date(tanggalMulai), lte: new Date(tanggalSelesai) };
  }

  const [data, total] = await Promise.all([
    prisma.pelanggaran.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { tanggal: 'desc' },
      include: {
        siswa: { select: { id: true, nama: true, nis: true, foto: true } },
        kelas: { select: { id: true, nama: true } },
        jenisPelanggaran: true,
      },
    }),
    prisma.pelanggaran.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const p = await prisma.pelanggaran.findUnique({
    where: { id: req.params.id },
    include: { siswa: true, kelas: true, jenisPelanggaran: true },
  });
  if (!p) return notFound(res, 'Pelanggaran tidak ditemukan');
  return success(res, p);
});

const create = asyncHandler(async (req, res) => {
  const { siswaId, kelasId, jenisPelanggaranId, tanggal, keterangan, tindakan } = req.body;

  const jenis = await prisma.jenisPelanggaran.findUnique({ where: { id: jenisPelanggaranId } });
  if (!jenis) return notFound(res, 'Jenis pelanggaran tidak ditemukan');

  const pelanggaran = await prisma.pelanggaran.create({
    data: {
      siswaId,
      kelasId,
      jenisPelanggaranId,
      tanggal: new Date(tanggal),
      poin: jenis.poin,
      keterangan: keterangan || null,
      tindakan: tindakan || null,
      ditanganiOleh: req.user?.id,
      lampiranUrl: req.file ? `/uploads/surat/${req.file.filename}` : null,
      createdById: req.user?.id,
    },
    include: {
      jenisPelanggaran: true,
      siswa: { select: { id: true, nama: true, nis: true } },
    },
  });

  // Update akumulasi poin
  const { totalPoin, statusPeringatan } = await updateAkumulasiPoin(siswaId);

  // Notifikasi jika masuk threshold
  if (['WARNING', 'SP1', 'SP2', 'PANGGILAN_ORTU', 'REKOMENDASI_BK'].includes(statusPeringatan)) {
    notifikasiPelanggaran(siswaId, totalPoin, statusPeringatan).catch(() => {});
  }

  // Check if surat otomatis should be triggered
  await checkAndCreateSurat(siswaId, req.user?.id);

  await auditLog({
    userId: req.user?.id,
    aksi: 'CREATE',
    tabel: 'pelanggaran',
    dataId: pelanggaran.id,
    dataAfter: pelanggaran,
    req,
  });

  return created(res, pelanggaran, 'Pelanggaran berhasil dicatat');
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.pelanggaran.findUnique({ where: { id } });
  if (!existing) return notFound(res, 'Pelanggaran tidak ditemukan');

  const updated = await prisma.pelanggaran.update({
    where: { id },
    data: {
      keterangan: req.body.keterangan,
      tindakan: req.body.tindakan,
      lampiranUrl: req.file ? `/uploads/surat/${req.file.filename}` : existing.lampiranUrl,
    },
    include: { jenisPelanggaran: true },
  });

  await updateAkumulasiPoin(existing.siswaId);

  return success(res, updated, 'Pelanggaran berhasil diperbarui');
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.pelanggaran.findUnique({ where: { id } });
  if (!existing) return notFound(res, 'Pelanggaran tidak ditemukan');

  await prisma.pelanggaran.delete({ where: { id } });
  await updateAkumulasiPoin(existing.siswaId);

  return success(res, null, 'Pelanggaran berhasil dihapus');
});

const getAkumulasiSiswa = asyncHandler(async (req, res) => {
  const { siswaId } = req.params;

  const [akumulasi, riwayat] = await Promise.all([
    prisma.akumulasiPoin.findUnique({
      where: { siswaId },
      include: { siswa: { select: { id: true, nama: true, nis: true } } },
    }),
    prisma.pelanggaran.findMany({
      where: { siswaId },
      orderBy: { tanggal: 'desc' },
      include: {
        jenisPelanggaran: true,
        kelas: { select: { nama: true } },
      },
    }),
  ]);

  return success(res, { akumulasi, riwayat });
});

const getJenisPelanggaran = asyncHandler(async (req, res) => {
  const data = await prisma.jenisPelanggaran.findMany({
    where: { aktif: true },
    orderBy: { poin: 'asc' },
  });
  return success(res, data);
});

const createJenisPelanggaran = asyncHandler(async (req, res) => {
  const { kode, nama, deskripsi, poin, kategori } = req.body;
  const jenis = await prisma.jenisPelanggaran.create({
    data: { kode, nama, deskripsi, poin: parseInt(poin), kategori },
  });
  return created(res, jenis);
});

const updateJenisPelanggaran = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await prisma.jenisPelanggaran.update({
    where: { id },
    data: req.body,
  });
  return success(res, updated);
});

// ============================================================
// HELPERS
// ============================================================

async function updateAkumulasiPoin(siswaId) {
  const result = await prisma.pelanggaran.aggregate({
    where: { siswaId },
    _sum: { poin: true },
  });
  const totalPoin = result._sum.poin || 0;

  let statusPeringatan = 'NORMAL';
  if (totalPoin >= 150) statusPeringatan = 'REKOMENDASI_BK';
  else if (totalPoin >= 100) statusPeringatan = 'PANGGILAN_ORTU';
  else if (totalPoin >= 75) statusPeringatan = 'SP2';
  else if (totalPoin >= 50) statusPeringatan = 'SP1';
  else if (totalPoin >= 25) statusPeringatan = 'WARNING';

  await prisma.akumulasiPoin.upsert({
    where: { siswaId },
    update: { totalPoin, statusPeringatan },
    create: { siswaId, totalPoin, statusPeringatan },
  });

  return { totalPoin, statusPeringatan };
}

async function checkAndCreateSurat(siswaId, userId) {
  const akumulasi = await prisma.akumulasiPoin.findUnique({ where: { siswaId } });
  if (!akumulasi) return;

  const statusMap = {
    SP1: 50,
    SP2: 75,
    PANGGILAN_ORTU: 100,
  };

  for (const [jenis, minPoin] of Object.entries(statusMap)) {
    if (akumulasi.totalPoin >= minPoin) {
      const existing = await prisma.surat.findFirst({
        where: { siswaId, jenis, status: { in: ['DRAFT', 'TERBIT'] } },
      });

      if (!existing) {
        const siswa = await prisma.siswa.findUnique({ where: { id: siswaId } });
        const nomor = `SIPAKAR/${jenis}/${siswa.nis}/${new Date().getFullYear()}/${Date.now()}`;

        await prisma.surat.create({
          data: {
            siswaId,
            jenis,
            nomor,
            tanggal: new Date(),
            perihal: `Surat ${jenis.replace('_', ' ')} - ${siswa.nama}`,
            totalPoin: akumulasi.totalPoin,
            status: 'DRAFT',
            diterbitkanOleh: userId,
          },
        });
      }
    }
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getAkumulasiSiswa,
  getJenisPelanggaran,
  createJenisPelanggaran,
  updateJenisPelanggaran,
};
