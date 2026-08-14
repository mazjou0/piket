const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const prisma = require('../config/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Token tidak ditemukan');
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, username: true, email: true, role: true, roles: true, aktif: true,
        guru: { select: { id: true, nama: true, nip: true } },
      },
    });
    if (!user || !user.aktif) return unauthorized(res, 'Akun tidak aktif atau tidak ditemukan');
    // Gabungkan role utama + array roles (multi-role dari SDMS/manual)
    const allRoles = [...new Set([user.role, ...(user.roles || [])])];
    req.user = { ...user, roles: allRoles, nama: user.guru?.nama || user.username, nip: user.guru?.nip || null };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token kadaluarsa');
    return unauthorized(res, 'Token tidak valid');
  }
};

const authorize = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    const userRoles = req.user.roles || [req.user.role];
    const maxAllowedLevel = Math.max(...requiredRoles.map(r => ROLE_HIERARCHY[r] ?? -1));
    const userMinLevel = Math.min(...userRoles.map(r => ROLE_HIERARCHY[r] ?? 99));
    if (userMinLevel <= maxAllowedLevel) return next();
    return forbidden(res, 'Akses ditolak. Role Anda tidak memiliki izin untuk aksi ini');
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, email: true, role: true, roles: true, aktif: true, guru: { select: { id: true, nama: true, nip: true } } },
      });
      if (user && user.aktif) {
        const allRoles = [...new Set([user.role, ...(user.roles || [])])];
        req.user = { ...user, roles: allRoles, nama: user.guru?.nama || user.username, nip: user.guru?.nip || null };
      }
    }
  } catch (_) {}
  next();
};

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', PETUGAS_PIKET: 'PETUGAS_PIKET',
  BK: 'BK', WALI_KELAS: 'WALI_KELAS', GURU: 'GURU', KEPALA_SEKOLAH: 'KEPALA_SEKOLAH',
};

const ROLE_HIERARCHY = {
  SUPER_ADMIN: 0, ADMIN: 1, BK: 2, KEPALA_SEKOLAH: 2, WALI_KELAS: 3, PETUGAS_PIKET: 4, GURU: 5,
};

function hasAccess(userRoles, requiredRole) {
  if (!Array.isArray(userRoles)) userRoles = [userRoles];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  const userMinLevel = Math.min(...userRoles.map(r => ROLE_HIERARCHY[r] ?? 99));
  return requiredLevel !== undefined && userMinLevel <= requiredLevel;
}

const ALL_ROLES       = Object.values(ROLES);
const ADMIN_ROLES     = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const MANAGEMENT_ROLES= [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.KEPALA_SEKOLAH];
const STAFF_ROLES     = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PETUGAS_PIKET, ROLES.BK, ROLES.WALI_KELAS, ROLES.GURU];

module.exports = {
  authenticate, authorize, optionalAuth,
  ROLES, ALL_ROLES, ADMIN_ROLES, MANAGEMENT_ROLES, STAFF_ROLES,
  ROLE_HIERARCHY, hasAccess,
};
