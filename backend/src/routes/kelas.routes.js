const router = require('express').Router();
const ctrl = require('../controllers/kelas.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadImport } = require('../middlewares/upload');
const { asyncHandler } = require('../middlewares/errorHandler');
const { success, badRequest } = require('../utils/response');
const prisma = require('../config/prisma');
const xlsx  = require('xlsx');
const fs    = require('fs');

router.use(authenticate);

router.get('/',                ctrl.getAll);
router.get('/:id',             ctrl.getById);
router.get('/:id/statistik',   ctrl.getStatistikKelas);
router.post('/',               authorize('ADMIN'), ctrl.create);
router.put('/:id',             authorize('ADMIN'), ctrl.update);
router.delete('/',             authorize('ADMIN'), ctrl.bulkRemove);
router.delete('/:id',          authorize('ADMIN'), ctrl.remove);
router.post('/:kelasId/siswa', authorize('ADMIN'), ctrl.assignSiswa);
router.post('/import',         authorize('ADMIN'), uploadImport, asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'File tidak ditemukan');
  const filePath = req.file.path;
  let wb;
  try { wb = xlsx.readFile(filePath); } catch { return badRequest(res, 'Format file tidak valid'); }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = xlsx.utils.sheet_to_json(sheet);
  const result = { berhasil: 0, gagal: 0, errors: [] };

  for (const row of rows) {
    try {
      const nama         = String(row['Nama Kelas *']    || row['nama']         || '').trim();
      const tingkat      = parseInt(row['Tingkat *']      || row['tingkat']      || 0);
      const jurusanKode  = String(row['Kode Jurusan *']   || row['jurusanKode']  || '').trim();
      const tahunAjNama  = String(row['Tahun Ajaran *']   || row['tahunAjaran']  || '').trim();
      const waliNip      = String(row['NIP Wali Kelas']   || row['waliKelasNip'] || '').trim();
      const kapasitas    = parseInt(row['Kapasitas']       || row['kapasitas']    || 36);

      if (!nama || !tingkat || !jurusanKode || !tahunAjNama) {
        result.gagal++;
        result.errors.push({ row: nama, error: 'Nama kelas, tingkat, kode jurusan, tahun ajaran wajib diisi' });
        continue;
      }

      const jurusan = await prisma.jurusan.findUnique({ where: { kode: jurusanKode } });
      if (!jurusan) { result.gagal++; result.errors.push({ row: nama, error: `Kode jurusan '${jurusanKode}' tidak ditemukan` }); continue; }

      const tahunAjaran = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjNama } });
      if (!tahunAjaran) { result.gagal++; result.errors.push({ row: nama, error: `Tahun ajaran '${tahunAjNama}' tidak ditemukan` }); continue; }

      let waliKelasId = null;
      if (waliNip) {
        const guru = await prisma.guru.findFirst({ where: { nip: waliNip } });
        if (guru) waliKelasId = guru.id;
      }

      const existing = await prisma.kelas.findFirst({
        where: { nama, tahunAjaranId: tahunAjaran.id },
      });

      if (existing) {
        await prisma.kelas.update({
          where: { id: existing.id },
          data: { tingkat, jurusanId: jurusan.id, waliKelasId, kapasitas, aktif: true },
        });
      } else {
        await prisma.kelas.create({
          data: { nama, tingkat, jurusanId: jurusan.id, tahunAjaranId: tahunAjaran.id, waliKelasId, kapasitas },
        });
      }
      result.berhasil++;
    } catch (e) {
      result.gagal++;
      result.errors.push({ row: row['Nama Kelas *'] || '-', error: e.message });
    }
  }
  fs.unlink(filePath, () => {});
  return success(res, result, `Import selesai: ${result.berhasil} berhasil, ${result.gagal} gagal`);
}));

module.exports = router;
