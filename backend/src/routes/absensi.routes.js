const router = require('express').Router();
const ctrl = require('../controllers/absensi.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadSurat } = require('../middlewares/upload');

router.use(authenticate);

router.get('/', ctrl.getByTanggalKelas);
router.get('/rekap-harian', ctrl.getRekapHarian);
router.get('/search-siswa', ctrl.searchSiswaLintas);
router.get('/riwayat/kelas/:kelasId', ctrl.getRiwayatKelas);
router.get('/riwayat/siswa/:siswaId', ctrl.getRiwayatSiswa);
router.get('/:id', ctrl.getById);

// PETUGAS_PIKET ke atas bisa simpan massal & satu
// WALI_KELAS juga bisa edit absensi termasuk tanggal lampau
router.post('/simpan-massal', authorize('PETUGAS_PIKET'), ctrl.simpanMassal);
router.post('/simpan-satu', authorize('PETUGAS_PIKET'), ctrl.simpanSatu);
router.post('/simpan-massal-tingkat', authorize('ADMIN'), ctrl.simpanMassalTingkat);
router.post('/simpan-massal-rentang', authorize('ADMIN'), ctrl.simpanMassalRentang);
router.delete('/massal', authorize('ADMIN'), ctrl.hapusMassal);
router.put('/:id', authorize('PETUGAS_PIKET'), uploadSurat, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.hapus);
router.post('/:id/lampiran', authorize('PETUGAS_PIKET'), uploadSurat, ctrl.uploadLampiran);

module.exports = router;
