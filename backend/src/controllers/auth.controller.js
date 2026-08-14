const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, unauthorized, badRequest, error } = require('../utils/response');
const { auditLog } = require('../utils/audit');
const { asyncHandler } = require('../middlewares/errorHandler');

// ── Login ─────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return badRequest(res, 'Username dan password wajib diisi');
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
    },
    include: { guru: { select: { id: true, nama: true, nip: true, foto: true } } },
  });

  if (!user) return unauthorized(res, 'Username atau password salah');
  if (!user.aktif) return unauthorized(res, 'Akun tidak aktif, hubungi administrator');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return unauthorized(res, 'Username atau password salah');

  const payload = { userId: user.id, role: user.role, roles: [...new Set([user.role, ...(user.roles || [])])] };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await auditLog({ userId: user.id, aksi: 'LOGIN', tabel: 'users', dataId: user.id, req });

  return success(res, {
    accessToken,
    refreshToken,
    user: {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
      roles:    [...new Set([user.role, ...(user.roles || [])])],
      nama:     user.guru?.nama || user.username,
      nip:      user.guru?.nip  || null,
      foto:     user.guru?.foto || null,
    },
  }, 'Login berhasil');
});

// ── Refresh Token ─────────────────────────────────────────────
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return badRequest(res, 'Refresh token wajib diisi');

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return unauthorized(res, 'Refresh token tidak valid atau kadaluarsa');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    return unauthorized(res, 'Refresh token tidak valid');
  }
  if (!storedToken.user.aktif) {
    return unauthorized(res, 'Akun tidak aktif');
  }

  await prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revoked: true } });

  const newPayload = { userId: storedToken.user.id, role: storedToken.user.role, roles: storedToken.user.roles || [] };
  const newAccessToken  = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: storedToken.user.id, expiresAt },
  });

  return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token diperbarui');
});

// ── Logout ────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data:  { revoked: true },
    });
  }
  await auditLog({ userId: req.user?.id, aksi: 'LOGOUT', tabel: 'users', dataId: req.user?.id, req });
  return success(res, null, 'Logout berhasil');
});

// ── Me ────────────────────────────────────────────────────────
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, username: true, email: true,
      role: true, roles: true, aktif: true,
      lastLogin: true, createdAt: true,
      guru: {
        select: {
          id: true, nama: true, nip: true,
          jenisKelamin: true, telepon: true, foto: true,
          kelasWali: {
            select: { id: true, nama: true },
            where: { aktif: true },
          },
        },
      },
    },
  });
  return success(res, user);
});

// ── Change Password ───────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return badRequest(res, 'Password lama dan baru wajib diisi');
  }
  if (newPassword.length < 6) {
    return badRequest(res, 'Password baru minimal 6 karakter');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return badRequest(res, 'Password lama tidak sesuai');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

  await prisma.refreshToken.updateMany({
    where: { userId: req.user.id },
    data:  { revoked: true },
  });

  return success(res, null, 'Password berhasil diubah, silakan login kembali');
});

// ── SSO Helper ────────────────────────────────────────────────
function mapRoleSDMS(sdmsRole) {
  const map = {
    'super_admin':    'SUPER_ADMIN',
    'admin':          'ADMIN',
    'guru':           'GURU',
    'wali_kelas':     'WALI_KELAS',
    'bk':             'BK',
    'kepala_sekolah': 'KEPALA_SEKOLAH',
    'petugas_piket':  'PETUGAS_PIKET',
    'pegawai':        'GURU',
  };
  return map[(sdmsRole || '').toLowerCase()] || 'GURU';
}

// ── SSO Callback ──────────────────────────────────────────────
const ssoCallback = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) return badRequest(res, 'Token SSO tidak ditemukan');

  const jwt = require('jsonwebtoken');
  const SSO_SECRET = process.env.SDMS_SSO_SECRET || 'sso_secret_piket';

  let decoded;
  try {
    decoded = jwt.verify(token, SSO_SECRET, { audience: 'piket', issuer: 'sdms-core' });
  } catch (err) {
    return unauthorized(res, 'Token SSO tidak valid atau sudah kadaluarsa');
  }

  // Petakan role utama dari SDMS ke Piket
  const piketRole = mapRoleSDMS(decoded.role);

  // Petakan extra_roles dari SDMS ke Piket
  const extraRolesSdms = decoded.extra_roles || [];
  const piketExtraRoles = extraRolesSdms
    .map(r => mapRoleSDMS(r))
    .filter(r => r !== piketRole);

  // Gabungkan semua roles unik
  const allRoles = [...new Set([piketRole, ...piketExtraRoles])];

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: decoded.username },
        { email: decoded.email || '' },
      ],
    },
    include: { guru: { select: { id: true, nama: true, nip: true, foto: true } } },
  });

  if (!user) {
    // Buat user baru dengan role dari SDMS
    const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
    user = await prisma.user.create({
      data: {
        username: decoded.username,
        email:    decoded.email || `${decoded.username}@sdms.local`,
        password: randomPass,
        role:     piketRole,
        roles:    allRoles,
        aktif:    true,
      },
      include: { guru: { select: { id: true, nama: true, nip: true, foto: true } } },
    });
  } else {
    // Update role setiap login via SSO agar selalu sinkron dengan SDMS
    await prisma.user.update({
      where: { id: user.id },
      data:  { role: piketRole, roles: allRoles },
    });
    user.role  = piketRole;
    user.roles = allRoles;
  }

  if (!user.aktif) return unauthorized(res, 'Akun tidak aktif');

  const payload = { userId: user.id, role: user.role, roles: [...new Set([user.role, ...(user.roles || [])])] };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  return success(res, {
    accessToken,
    refreshToken,
    user: {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
      roles:    [...new Set([user.role, ...(user.roles || [])])],
      nama:     user.guru?.nama || decoded.full_name || user.username,
      nip:      user.guru?.nip  || null,
      foto:     user.guru?.foto || null,
    },
  }, 'SSO login berhasil');
});

module.exports = { login, refresh, logout, me, changePassword, ssoCallback };
