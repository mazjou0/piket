const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/summary-today', ctrl.getSummaryToday);
router.get('/chart-harian', ctrl.getChartHarian);
router.get('/chart-bulanan', ctrl.getChartBulanan);
router.get('/top-alpha', ctrl.getTopAlpha);
router.get('/top-terlambat', ctrl.getTopTerlambat);
router.get('/kelas-terbaik', ctrl.getKelasTerbaik);
router.get('/heatmap', ctrl.getHeatmap);
router.get('/statistik-jurusan', ctrl.getStatistikPerJurusan);
// BK ke atas bisa akses summary BK (termasuk KEPALA_SEKOLAH karena level setara)
router.get('/summary-bk', authorize('BK'), ctrl.getSummaryBK);
// Semua role bisa lihat daftar siswa per kelas (termasuk PETUGAS_PIKET)
router.get('/siswa-per-kelas', ctrl.getSiswaPerKelas);

module.exports = router;
