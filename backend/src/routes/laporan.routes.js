const router = require('express').Router();
const ctrl = require('../controllers/laporan.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/rekap-absensi', ctrl.getRekapAbsensi);
router.get('/rekap-kelas', ctrl.getRekapPerKelas);
router.get('/rekap-pelanggaran', ctrl.getRekapPelanggaran);
router.get('/rekap-absensi-detail', ctrl.getRekapAbsensiDetail);
router.get('/export/pdf', ctrl.exportPDF);
router.get('/export/excel', ctrl.exportExcel);
router.get('/export/csv', ctrl.exportCSV);

module.exports = router;
