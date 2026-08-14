const router = require('express').Router();
const { login, refresh, logout, me, changePassword, ssoCallback } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);
router.get('/sso-callback', ssoCallback);

module.exports = router;
