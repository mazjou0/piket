const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate, authorize, ADMIN_ROLES } = require('../middlewares/auth');
const prisma = require('../config/prisma');
const { success, created, notFound } = require('../utils/response');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.tahunAjaran.findMany({
    orderBy: { mulai: 'desc' },
    include: { semester: { orderBy: { urutan: 'asc' } }, _count: { select: { kelas: true } } },
  });
  return success(res, data);
}));

router.get('/aktif', asyncHandler(async (req, res) => {
  const ta = await prisma.tahunAjaran.findFirst({ where: { aktif: true }, include: { semester: true } });
  return success(res, ta);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const ta = await prisma.tahunAjaran.findUnique({ where: { id: req.params.id }, include: { semester: true } });
  if (!ta) return notFound(res, 'Tahun Ajaran tidak ditemukan');
  return success(res, ta);
}));

router.post('/', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { nama, mulai, selesai, aktif } = req.body;
  if (aktif) {
    await prisma.tahunAjaran.updateMany({ data: { aktif: false } });
  }
  const ta = await prisma.tahunAjaran.create({
    data: { nama, mulai: new Date(mulai), selesai: new Date(selesai), aktif: aktif || false },
  });
  return created(res, ta, 'Tahun Ajaran berhasil dibuat');
}));

router.put('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { nama, mulai, selesai, aktif } = req.body;
  if (aktif) {
    await prisma.tahunAjaran.updateMany({ where: { id: { not: req.params.id } }, data: { aktif: false } });
  }
  const updateData = {};
  if (nama    !== undefined) updateData.nama    = nama;
  if (mulai   !== undefined) updateData.mulai   = new Date(mulai);
  if (selesai !== undefined) updateData.selesai = new Date(selesai);
  if (aktif   !== undefined) updateData.aktif   = aktif;

  const ta = await prisma.tahunAjaran.update({ where: { id: req.params.id }, data: updateData });
  return success(res, ta, 'Tahun Ajaran berhasil diperbarui');
}));

router.delete('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const ta = await prisma.tahunAjaran.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { kelas: true, semester: true } } },
  });
  if (!ta) return notFound(res, 'Tahun Ajaran tidak ditemukan');
  if (ta.aktif) {
    const { error } = require('../utils/response');
    return error(res, 'Tidak dapat menghapus Tahun Ajaran yang sedang aktif', 400);
  }
  // Cek apakah ada kelas atau semester terkait
  if (ta._count.kelas > 0) {
    const { error } = require('../utils/response');
    return error(res, `Tidak dapat menghapus: masih ada ${ta._count.kelas} kelas terkait`, 400);
  }
  await prisma.semester.deleteMany({ where: { tahunAjaranId: req.params.id } });
  await prisma.tahunAjaran.delete({ where: { id: req.params.id } });
  return success(res, null, 'Tahun Ajaran berhasil dihapus');
}));

module.exports = router;
