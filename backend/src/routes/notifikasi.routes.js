const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate } = require('../middlewares/auth');
const prisma = require('../config/prisma');
const { success, paginate } = require('../utils/response');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, dibaca } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = { targetId: req.user.id };
  if (dibaca !== undefined) where.dibaca = dibaca === 'true';

  const [data, total] = await Promise.all([
    prisma.notifikasi.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
    prisma.notifikasi.count({ where }),
  ]);
  return paginate(res, data, total, page, limit);
}));

router.put('/:id/baca', asyncHandler(async (req, res) => {
  await prisma.notifikasi.update({ where: { id: req.params.id }, data: { dibaca: true } });
  return success(res, null, 'Notifikasi ditandai dibaca');
}));

router.put('/baca-semua', asyncHandler(async (req, res) => {
  await prisma.notifikasi.updateMany({ where: { targetId: req.user.id }, data: { dibaca: true } });
  return success(res, null, 'Semua notifikasi ditandai dibaca');
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await prisma.notifikasi.count({ where: { targetId: req.user.id, dibaca: false } });
  return success(res, { count });
}));

module.exports = router;
