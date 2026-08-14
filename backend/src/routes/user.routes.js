const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadImport } = require('../middlewares/upload');

router.use(authenticate, authorize('ADMIN'));

router.get('/',                   ctrl.getAll);
router.get('/:id',                ctrl.getById);
router.post('/',                  ctrl.create);
router.put('/:id',                ctrl.update);
router.put('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id',             ctrl.remove);

// Import massal — khusus SUPER_ADMIN
router.post('/import', authorize('SUPER_ADMIN'), uploadImport, ctrl.importUsers);

module.exports = router;
