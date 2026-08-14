const router = require('express').Router();
const ctrl = require('../controllers/pelanggaran.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadSurat } = require('../middlewares/upload');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/jenis', ctrl.getJenisPelanggaran);
router.get('/:id', ctrl.getById);
router.get('/akumulasi/:siswaId', ctrl.getAkumulasiSiswa);

// PETUGAS_PIKET ke atas bisa input pelanggaran
router.post('/', authorize('PETUGAS_PIKET'), uploadSurat, ctrl.create);
router.put('/:id', authorize('PETUGAS_PIKET'), uploadSurat, ctrl.update);
// BK ke atas bisa hapus
router.delete('/:id', authorize('BK'), ctrl.remove);

// ADMIN ke atas kelola jenis pelanggaran
router.post('/jenis', authorize('ADMIN'), ctrl.createJenisPelanggaran);
router.put('/jenis/:id', authorize('ADMIN'), ctrl.updateJenisPelanggaran);

module.exports = router;
