const rateLimit = require('express-rate-limit');

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
};

const auth = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 100,  // dinaikkan dari 20 → 100
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit' },
});

const api = rateLimit({
  ...baseOptions,
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Rate limit exceeded' },
});

const upload = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Upload limit exceeded' },
});

module.exports = { rateLimiter: { auth, api, upload } };
