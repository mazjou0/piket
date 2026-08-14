const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate, authorize, ADMIN_ROLES } = require('../middlewares/auth');
const prisma = require('../config/prisma');
const { success, created, notFound } = require('../utils/response');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { tahunAjaranId, aktif } = req.query;
  const where = {};
  if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId;
  if (aktif !== undefined) where.aktif = aktif === 'true';

  const data = await prisma.semester.findMany({
    where, orderBy: { mulai: 'desc' },
    include: { tahunAjaran: { select: { nama: true } } },
  });
  return success(res, data);
}));

router.get('/aktif', asyncHandler(async (req, res) => {
  const s = await prisma.semester.findFirst({ where: { aktif: true }, include: { tahunAjaran: true } });
  return success(res, s);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const s = await prisma.semester.findUnique({ where: { id: req.params.id }, include: { tahunAjaran: true } });
  if (!s) return notFound(res, 'Semester tidak ditemukan');
  return success(res, s);
}));

router.post('/', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { tahunAjaranId, nama, urutan, mulai, selesai, aktif } = req.body;
  if (aktif) {
    await prisma.semester.updateMany({ where: { tahunAjaranId }, data: { aktif: false } });
  }
  const s = await prisma.semester.create({
    data: { tahunAjaranId, nama, urutan: parseInt(urutan), mulai: new Date(mulai), selesai: new Date(selesai), aktif: aktif || false },
  });
  return created(res, s, 'Semester berhasil dibuat');
}));

router.put('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { aktif, tahunAjaranId, nama, urutan, mulai, selesai } = req.body;

  if (aktif && tahunAjaranId) {
    await prisma.semester.updateMany({
      where: { tahunAjaranId, id: { not: req.params.id } },
      data: { aktif: false },
    });
  }

  const updateData = {};
  if (nama    !== undefined) updateData.nama    = nama;
  if (urutan  !== undefined) updateData.urutan  = parseInt(urutan);
  if (aktif   !== undefined) updateData.aktif   = aktif === true || aktif === 'true';
  if (mulai   !== undefined) updateData.mulai   = mulai   ? new Date(mulai)   : undefined;
  if (selesai !== undefined) updateData.selesai = selesai ? new Date(selesai) : undefined;
  if (tahunAjaranId !== undefined) updateData.tahunAjaranId = tahunAjaranId;

  const s = await prisma.semester.update({ where: { id: req.params.id }, data: updateData });
  return success(res, s, 'Semester berhasil diperbarui');
}));

module.exports = router;
