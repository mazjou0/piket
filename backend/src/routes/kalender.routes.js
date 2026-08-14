const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate, authorize, ADMIN_ROLES } = require('../middlewares/auth');
const prisma = require('../config/prisma');
const { success, created } = require('../utils/response');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { tahun, bulan } = req.query;
  const where = {};
  if (tahun && bulan) {
    const startDate = new Date(parseInt(tahun), parseInt(bulan) - 1, 1);
    const endDate = new Date(parseInt(tahun), parseInt(bulan), 0);
    where.tanggalMulai = { lte: endDate };
    where.OR = [
      { tanggalSelesai: null },
      { tanggalSelesai: { gte: startDate } },
    ];
  } else if (tahun) {
    where.tanggalMulai = {
      gte: new Date(`${tahun}-01-01`),
      lte: new Date(`${tahun}-12-31`),
    };
  }
  const data = await prisma.kalenderAkademik.findMany({ where, orderBy: { tanggalMulai: 'asc' } });
  return success(res, data);
}));

router.post('/', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { judul, tanggalMulai, tanggalSelesai, warna, jenis, keterangan } = req.body;
  const k = await prisma.kalenderAkademik.create({
    data: {
      judul, warna, jenis, keterangan,
      tanggalMulai: new Date(tanggalMulai),
      tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
    },
  });
  return created(res, k);
}));

router.put('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const k = await prisma.kalenderAkademik.update({ where: { id: req.params.id }, data: req.body });
  return success(res, k);
}));

router.delete('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  await prisma.kalenderAkademik.delete({ where: { id: req.params.id } });
  return success(res, null, 'Kegiatan berhasil dihapus');
}));

module.exports = router;
