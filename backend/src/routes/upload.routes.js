const router = require('express').Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticate } = require('../middlewares/auth');
const { uploadFoto, uploadSurat } = require('../middlewares/upload');
const { success, badRequest } = require('../utils/response');
const path = require('path');
const fs = require('fs');

router.use(authenticate);

router.post('/foto', uploadFoto, asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'File tidak ditemukan');
  return success(res, { url: `/uploads/foto/${req.file.filename}` }, 'Foto berhasil diupload');
}));

router.post('/surat', uploadSurat, asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'File tidak ditemukan');
  return success(res, { url: `/uploads/surat/${req.file.filename}` }, 'File berhasil diupload');
}));

router.delete('/:folder/:filename', asyncHandler(async (req, res) => {
  const { folder, filename } = req.params;
  const allowedFolders = ['foto', 'surat'];
  if (!allowedFolders.includes(folder)) return badRequest(res, 'Folder tidak valid');

  const filePath = path.join(__dirname, `../../uploads/${folder}/${filename}`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return success(res, null, 'File berhasil dihapus');
}));

module.exports = router;
