const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate, authorize, ADMIN_ROLES } = require('../middlewares/auth');
const prisma = require('../config/prisma');
const { success, created, notFound } = require('../utils/response');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { tahun } = req.query;
  const where = {};
  if (tahun) {
    where.tanggal = {
      gte: new Date(`${tahun}-01-01`),
      lte: new Date(`${tahun}-12-31`),
    };
  }
  const data = await prisma.hariLibur.findMany({ where, orderBy: { tanggal: 'asc' } });
  return success(res, data);
}));

router.post('/', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { tanggal, nama, jenis, keterangan } = req.body;
  const hl = await prisma.hariLibur.create({
    data: { tanggal: new Date(tanggal), nama, jenis: jenis || 'nasional', keterangan },
  });
  return created(res, hl);
}));

router.put('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const hl = await prisma.hariLibur.update({ where: { id: req.params.id }, data: req.body });
  return success(res, hl);
}));

router.delete('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  await prisma.hariLibur.delete({ where: { id: req.params.id } });
  return success(res, null, 'Hari libur berhasil dihapus');
}));

module.exports = router;
