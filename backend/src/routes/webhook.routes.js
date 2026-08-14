const express = require('express');
const router = express.Router();
const { handleSdmsWebhook } = require('../controllers/webhook.controller');

// POST /webhooks/sdms  — dipanggil oleh SDMS saat ada perubahan data
router.post('/sdms', handleSdmsWebhook);

module.exports = router;
