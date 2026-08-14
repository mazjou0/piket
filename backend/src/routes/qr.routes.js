const router = require('express').Router();
const ctrl = require('../controllers/qr.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.get('/events', ctrl.getEvents);
// ADMIN ke atas bisa buat event
router.post('/events', authorize('ADMIN'), ctrl.createEvent);
// PETUGAS_PIKET ke atas bisa generate QR
router.post('/generate', authorize('PETUGAS_PIKET'), ctrl.generateQR);
router.post('/generate-bulk', authorize('PETUGAS_PIKET'), ctrl.generateBulkQR);
router.post('/scan', ctrl.scanQR);

module.exports = router;
