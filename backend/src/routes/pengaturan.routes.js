const router = require('express').Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { success, badRequest } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const fs = require('fs');
const path = require('path');

// GET — baca pengaturan sekolah (tidak perlu login, dipakai print/PDF)
router.get('/sekolah', asyncHandler(async (req, res) => {
  return success(res, {
    nama:          process.env.SCHOOL_NAME           || 'SMKN 1 Kras',
    alamat:        process.env.SCHOOL_ADDRESS        || 'Jl. Raya Kras, Kediri, Jawa Timur',
    telepon:       process.env.SCHOOL_PHONE          || '',
    email:         process.env.SCHOOL_EMAIL          || '',
    principalName: process.env.SCHOOL_PRINCIPAL_NAME || '',
    principalNip:  process.env.SCHOOL_PRINCIPAL_NIP  || '',
  });
}));

// PUT — update pengaturan sekolah (SUPER_ADMIN only)
router.put('/sekolah', authenticate, authorize(ROLES.SUPER_ADMIN), asyncHandler(async (req, res) => {
  const { nama, alamat, telepon, email, principalName, principalNip } = req.body;

  if (!principalName) return badRequest(res, 'Nama kepala sekolah wajib diisi');

  // Update process.env langsung (berlaku sampai restart)
  if (nama)          process.env.SCHOOL_NAME            = nama;
  if (alamat)        process.env.SCHOOL_ADDRESS         = alamat;
  if (telepon)       process.env.SCHOOL_PHONE           = telepon;
  if (email)         process.env.SCHOOL_EMAIL           = email;
  if (principalName) process.env.SCHOOL_PRINCIPAL_NAME  = principalName;
  if (principalNip !== undefined) process.env.SCHOOL_PRINCIPAL_NIP = principalNip;

  // Simpan permanen ke .env
  const envPath = path.join(__dirname, '../../.env');
  try {
    let content = fs.readFileSync(envPath, 'utf8');
    const upsert = (c, key, val) => {
      if (!val) return c;
      const safe = val.includes(' ') ? `"${val}"` : val;
      const re = new RegExp(`^${key}=.*$`, 'm');
      return re.test(c) ? c.replace(re, `${key}=${safe}`) : `${c}\n${key}=${safe}`;
    };
    content = upsert(content, 'SCHOOL_NAME',           nama          || '');
    content = upsert(content, 'SCHOOL_ADDRESS',        alamat         || '');
    content = upsert(content, 'SCHOOL_PHONE',          telepon        || '');
    content = upsert(content, 'SCHOOL_EMAIL',          email          || '');
    content = upsert(content, 'SCHOOL_PRINCIPAL_NAME', principalName  || '');
    content = upsert(content, 'SCHOOL_PRINCIPAL_NIP',  principalNip   || '');
    fs.writeFileSync(envPath, content, 'utf8');
  } catch (e) {
    // Jangan gagal hanya karena tidak bisa tulis .env
    console.warn('Warning: tidak bisa update .env:', e.message);
  }

  return success(res, {
    nama:          process.env.SCHOOL_NAME,
    alamat:        process.env.SCHOOL_ADDRESS,
    telepon:       process.env.SCHOOL_PHONE,
    email:         process.env.SCHOOL_EMAIL,
    principalName: process.env.SCHOOL_PRINCIPAL_NAME,
    principalNip:  process.env.SCHOOL_PRINCIPAL_NIP,
  }, 'Pengaturan berhasil disimpan');
}));

// GET — ambil setting auto-absensi
router.get('/auto-absensi', authenticate, authorize(ROLES.ADMIN), asyncHandler(async (req, res) => {
  return success(res, {
    enabled:     process.env.AUTO_ABSENSI_ENABLED === 'true',
    jamPagi:     process.env.AUTO_ABSENSI_JAM_PAGI     || '07:00',
    jamSiang:    process.env.AUTO_ABSENSI_JAM_SIANG    || null,
    enableSiang: process.env.AUTO_ABSENSI_ENABLE_SIANG === 'true',
    hariKerja:   (process.env.AUTO_ABSENSI_HARI_KERJA  || '1,2,3,4,5').split(',').map(Number),
  });
}));

// PUT — update setting auto-absensi (ADMIN only)
router.put('/auto-absensi', authenticate, authorize(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { enabled, jamPagi, jamSiang, enableSiang, hariKerja } = req.body;

  const validateTime = (t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
  if (jamPagi && !validateTime(jamPagi)) return badRequest(res, 'Format jam pagi tidak valid (HH:MM)');
  if (enableSiang && jamSiang && !validateTime(jamSiang)) return badRequest(res, 'Format jam siang tidak valid (HH:MM)');
  if (hariKerja && (!Array.isArray(hariKerja) || hariKerja.length === 0)) return badRequest(res, 'Hari kerja tidak boleh kosong');

  if (enabled !== undefined)   process.env.AUTO_ABSENSI_ENABLED       = enabled ? 'true' : 'false';
  if (jamPagi)                 process.env.AUTO_ABSENSI_JAM_PAGI      = jamPagi;
  if (jamSiang !== undefined)  process.env.AUTO_ABSENSI_JAM_SIANG     = jamSiang || '';
  if (enableSiang !== undefined) process.env.AUTO_ABSENSI_ENABLE_SIANG = enableSiang ? 'true' : 'false';
  if (hariKerja)               process.env.AUTO_ABSENSI_HARI_KERJA    = hariKerja.join(',');

  // Simpan ke .env
  const envPath = path.join(__dirname, '../../.env');
  try {
    let content = fs.readFileSync(envPath, 'utf8');
    const upsert = (c, key, val) => {
      if (val === undefined) return c;
      const safe = typeof val === 'string' && val.includes(' ') ? `"${val}"` : String(val);
      const re = new RegExp(`^${key}=.*$`, 'm');
      return re.test(c) ? c.replace(re, `${key}=${safe}`) : `${c}\n${key}=${safe}`;
    };
    content = upsert(content, 'AUTO_ABSENSI_ENABLED',     enabled ? 'true' : 'false');
    content = upsert(content, 'AUTO_ABSENSI_JAM_PAGI',    jamPagi     || '07:00');
    content = upsert(content, 'AUTO_ABSENSI_JAM_SIANG',   jamSiang    || '');
    content = upsert(content, 'AUTO_ABSENSI_ENABLE_SIANG',enableSiang ? 'true' : 'false');
    content = upsert(content, 'AUTO_ABSENSI_HARI_KERJA',  hariKerja ? hariKerja.join(',') : '1,2,3,4,5');
    fs.writeFileSync(envPath, content, 'utf8');
  } catch (e) {
    console.warn('Warning: tidak bisa update .env:', e.message);
  }

  const cronUtil = require('../utils/cron');
  cronUtil.restartAutoAbsensi();

  return success(res, {
    enabled:     process.env.AUTO_ABSENSI_ENABLED === 'true',
    jamPagi:     process.env.AUTO_ABSENSI_JAM_PAGI,
    jamSiang:    process.env.AUTO_ABSENSI_JAM_SIANG || null,
    enableSiang: process.env.AUTO_ABSENSI_ENABLE_SIANG === 'true',
    hariKerja:   (process.env.AUTO_ABSENSI_HARI_KERJA || '1,2,3,4,5').split(',').map(Number),
  }, 'Pengaturan auto-absensi berhasil disimpan');
}));

// GET — log eksekusi auto-absensi (real-time monitor)
router.get('/auto-absensi/log', authenticate, authorize(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const cronUtil = require('../utils/cron');
  return success(res, cronUtil.getLog());
}));

module.exports = router;
