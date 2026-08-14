const router = require('express').Router();
const ctrl = require('../controllers/petugasPiket.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

// GET — semua role bisa lihat jadwal piket
router.get('/', ctrl.getAll);

// Mutasi hanya ADMIN ke atas (SUPER_ADMIN juga otomatis bisa)
router.delete('/hari/:hari', authorize('ADMIN'), ctrl.clearHari);
router.post('/',             authorize('ADMIN'), ctrl.assign);
router.delete('/:id',        authorize('ADMIN'), ctrl.remove);

module.exports = router;
