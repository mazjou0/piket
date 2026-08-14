const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate, authorize, ADMIN_ROLES } = require('../middlewares/auth');
const { uploadImport } = require('../middlewares/upload');
const prisma = require('../config/prisma');
const { success, created, notFound, paginate, badRequest } = require('../utils/response');
const xlsx = require('xlsx');
const fs = require('fs');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [data, total] = await Promise.all([
    prisma.jurusan.findMany({
      skip,
      take: parseInt(limit),
      orderBy: { nama: 'asc' },
      where: { aktif: true },
      include: {
        _count: {
          select: {
            kelas: { where: { aktif: true } },
            siswa: { where: { status: 'AKTIF' } },
          },
        },
      },
    }),
    prisma.jurusan.count({ where: { aktif: true } }),
  ]);
  return paginate(res, data, total, page, limit);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const j = await prisma.jurusan.findUnique({
    where: { id: req.params.id },
    include: { kelas: true },
  });
  if (!j) return notFound(res, 'Jurusan tidak ditemukan');
  return success(res, j);
}));

router.post('/', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { kode, nama, singkatan } = req.body;
  if (!kode || !nama || !singkatan) return badRequest(res, 'Kode, nama, dan singkatan wajib diisi');
  const existing = await prisma.jurusan.findUnique({ where: { kode } });
  if (existing) return badRequest(res, `Kode jurusan '${kode}' sudah digunakan`);
  const j = await prisma.jurusan.create({ data: { kode, nama, singkatan } });
  return created(res, j, 'Jurusan berhasil ditambahkan');
}));

router.put('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.jurusan.findUnique({ where: { id } });
  if (!existing) return notFound(res, 'Jurusan tidak ditemukan');
  // Jangan izinkan ubah kode
  const { kode, ...updateData } = req.body;
  const j = await prisma.jurusan.update({ where: { id }, data: updateData });
  return success(res, j, 'Jurusan berhasil diperbarui');
}));

/* ── Bulk Delete Jurusan ── */
router.delete('/', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return badRequest(res, 'IDs tidak boleh kosong');

  const withData = await prisma.jurusan.findMany({
    where: { id: { in: ids } },
    include: {
      _count: {
        select: {
          kelas: { where: { aktif: true } },
          siswa: { where: { status: 'AKTIF' } },
        },
      },
    },
  });

  const blocked = withData.filter(j => j._count.siswa > 0 || j._count.kelas > 0);
  if (blocked.length > 0) {
    const names = blocked.map(j => `${j.nama} (${j._count.kelas} kelas, ${j._count.siswa} siswa aktif)`).join('; ');
    return badRequest(res, `Tidak dapat menghapus jurusan yang masih memiliki data aktif: ${names}`);
  }

  await prisma.jurusan.deleteMany({ where: { id: { in: ids } } });

  return success(res, { count: ids.length }, `${ids.length} jurusan berhasil dihapus`);
}));

router.delete('/:id', authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const j = await prisma.jurusan.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          kelas: { where: { aktif: true } },
          siswa: { where: { status: 'AKTIF' } },
        },
      },
    },
  });
  if (!j) return notFound(res, 'Jurusan tidak ditemukan');
  if (j._count.siswa > 0 || j._count.kelas > 0) {
    return badRequest(res,
      `Tidak dapat menghapus: masih ada ${j._count.kelas} kelas aktif dan ${j._count.siswa} siswa aktif terkait`
    );
  }
  await prisma.jurusan.delete({ where: { id } });
  return success(res, null, 'Jurusan berhasil dihapus');
}));

/* ── Import Jurusan ── */
router.post('/import', authorize(...ADMIN_ROLES), uploadImport, asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'File tidak ditemukan');
  const filePath = req.file.path;
  let wb;
  try { wb = xlsx.readFile(filePath); } catch { return badRequest(res, 'Format file tidak valid'); }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = xlsx.utils.sheet_to_json(sheet);
  const result = { berhasil: 0, gagal: 0, errors: [] };

  for (const row of rows) {
    try {
      const kode      = String(row['Kode *'] || row['kode'] || '').trim();
      const nama      = String(row['Nama Lengkap *'] || row['nama'] || '').trim();
      const singkatan = String(row['Singkatan *'] || row['singkatan'] || '').trim();
      if (!kode || !nama || !singkatan) {
        result.gagal++;
        result.errors.push({ row: nama || kode, error: 'Kode, nama, singkatan wajib diisi' });
        continue;
      }
      await prisma.jurusan.upsert({
        where:  { kode },
        update: { nama, singkatan, aktif: true },
        create: { kode, nama, singkatan },
      });
      result.berhasil++;
    } catch (e) {
      result.gagal++;
      result.errors.push({ row: row['Kode *'] || '-', error: e.message });
    }
  }
  fs.unlink(filePath, () => {});
  return success(res, result, `Import selesai: ${result.berhasil} berhasil, ${result.gagal} gagal`);
}));

module.exports = router;
