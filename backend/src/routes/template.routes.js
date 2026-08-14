const router = require('express').Router();
const ctrl = require('../controllers/template.controller');
const userCtrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

// Download template — semua role bisa download
router.get('/template/siswa',   ctrl.downloadTemplateSiswa);
router.get('/template/guru',    ctrl.downloadTemplateGuru);
router.get('/template/kelas',   ctrl.downloadTemplateKelas);
router.get('/template/jurusan', ctrl.downloadTemplateJurusan);
router.get('/template/user',    authorize('SUPER_ADMIN'), userCtrl.downloadTemplateUser);

// Export data — semua role bisa export
router.get('/export/siswa',     ctrl.exportSiswa);
router.get('/export/guru',      ctrl.exportGuru);
router.get('/export/kelas',     ctrl.exportKelas);
router.get('/export/user',      authorize('SUPER_ADMIN'), userCtrl.exportUsers);

module.exports = router;
