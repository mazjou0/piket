const router = require('express').Router();
const ctrl = require('../controllers/guru.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadFoto, uploadImport } = require('../middlewares/upload');

router.use(authenticate);

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);

router.post('/',      authorize('ADMIN'), uploadFoto, ctrl.create);
router.put('/:id',    authorize('ADMIN'), uploadFoto, ctrl.update);
router.delete('/',    authorize('ADMIN'), ctrl.bulkRemove);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

router.post('/import', authorize('ADMIN'), uploadImport, ctrl.importGuru);

module.exports = router;
