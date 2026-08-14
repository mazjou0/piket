const router = require('express').Router();
const ctrl = require('../controllers/surat.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/cetak', ctrl.cetakPDF);
// BK ke atas bisa buat/edit surat
router.post('/', authorize('BK'), ctrl.create);
router.put('/:id', authorize('BK'), ctrl.update);
router.put('/:id/terbitkan', authorize('BK'), ctrl.terbitkan);
// ADMIN ke atas bisa hapus
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
