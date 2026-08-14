const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate, authorize } = require('../middlewares/auth');
const prisma = require('../config/prisma');
const { paginate } = require('../utils/response');

router.use(authenticate, authorize('ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, userId, tabel, aksi } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (userId) where.userId = userId;
  if (tabel) where.tabel = tabel;
  if (aksi) where.aksi = aksi;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
}));

module.exports = router;
