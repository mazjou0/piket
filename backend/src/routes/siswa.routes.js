const router = require('express').Router();
const ctrl = require('../controllers/siswa.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadFoto, uploadImport } = require('../middlewares/upload');

router.use(authenticate);

// Route spesifik harus SEBELUM route dengan parameter /:id
router.get('/', ctrl.getAll);
router.post('/', authorize('ADMIN'), uploadFoto, ctrl.create);
router.delete('/', authorize('ADMIN'), ctrl.bulkRemove);
router.post('/import/dapodik', authorize('ADMIN'), uploadImport, ctrl.importDapodik);
router.get('/kelas/:kelasId', ctrl.getSiswaByKelas);

// Route dengan parameter — harus SETELAH route statis
router.get('/:id', ctrl.getById);
router.get('/:id/statistik', ctrl.getStatistik);
router.put('/:id', authorize('WALI_KELAS'), uploadFoto, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
