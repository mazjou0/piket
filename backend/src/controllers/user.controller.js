const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { success, created, notFound, paginate, badRequest } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PETUGAS_PIKET', 'BK', 'WALI_KELAS', 'GURU', 'KEPALA_SEKOLAH'];

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, aktif } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) where.OR = [
    { username: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ];
  if (role) where.role = role;
  if (aktif !== undefined) where.aktif = aktif === 'true';

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { username: 'asc' },
      select: {
        id: true, username: true, email: true, role: true, roles: true,
        aktif: true, lastLogin: true, createdAt: true,
        guru: { select: { id: true, nama: true, nip: true, foto: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, username: true, email: true, role: true, roles: true, aktif: true,
      lastLogin: true, createdAt: true, updatedAt: true,
      guru: { select: { id: true, nama: true, nip: true } },
    },
  });
  if (!user) return notFound(res, 'User tidak ditemukan');
  return success(res, user);
});

const create = asyncHandler(async (req, res) => {
  const { username, email, password, role, roles, guruId } = req.body;

  if (!password || password.length < 6) return badRequest(res, 'Password minimal 6 karakter');

  // Validasi semua roles
  const rolesArray = Array.isArray(roles) ? roles.filter(r => VALID_ROLES.includes(r)) : [];

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) return badRequest(res, 'Username atau email sudah digunakan');

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, email, password: hashed, role, roles: rolesArray, aktif: true },
    select: { id: true, username: true, email: true, role: true, roles: true },
  });

  if (guruId) {
    await prisma.guru.update({ where: { id: guruId }, data: { userId: user.id } });
  }

  return created(res, user, 'User berhasil dibuat');
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, roles, aktif, email, guruId } = req.body;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { guru: { select: { id: true } } },
  });
  if (!user) return notFound(res, 'User tidak ditemukan');

  const updateData = { aktif, email };
  if (role) updateData.role = role;
  if (Array.isArray(roles)) {
    updateData.roles = roles.filter(r => VALID_ROLES.includes(r));
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, email: true, role: true, roles: true, aktif: true },
  });

  // Update relasi guru
  if (guruId !== undefined) {
    if (user.guru && user.guru.id !== guruId) {
      await prisma.guru.update({ where: { id: user.guru.id }, data: { userId: null } });
    }
    if (guruId) {
      const guruTarget = await prisma.guru.findUnique({ where: { id: guruId } });
      if (guruTarget && guruTarget.userId && guruTarget.userId !== id) {
        return badRequest(res, 'Guru ini sudah terhubung ke akun user lain');
      }
      await prisma.guru.update({ where: { id: guruId }, data: { userId: id } });
    }
  }

  return success(res, updated, 'User berhasil diperbarui');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) return badRequest(res, 'Password minimal 6 karakter');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { password: hashed } });

  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revoked: true } });

  return success(res, null, 'Password berhasil direset');
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return badRequest(res, 'Tidak dapat menghapus akun sendiri');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return notFound(res, 'User tidak ditemukan');

  // SUPER_ADMIN bisa hapus permanen, ADMIN hanya nonaktifkan
  if (req.user.role === 'SUPER_ADMIN') {
    // Cek apakah ada SUPER_ADMIN lain yang aktif selain yang akan dihapus
    if (user.role === 'SUPER_ADMIN') {
      const activeSuperAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', aktif: true, id: { not: id } },
      });
      if (activeSuperAdminCount === 0) {
        return badRequest(res, 'Tidak dapat menghapus SUPER_ADMIN terakhir yang aktif');
      }
    }
    // Putus relasi guru dulu jika ada
    await prisma.guru.updateMany({ where: { userId: id }, data: { userId: null } });
    // Hapus refresh token
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    // Hapus permanen
    await prisma.user.delete({ where: { id } });
    return success(res, null, 'User berhasil dihapus permanen');
  }

  // ADMIN hanya nonaktifkan
  await prisma.user.update({ where: { id }, data: { aktif: false } });
  return success(res, null, 'User berhasil dinonaktifkan');
});

// ── Import massal user dari Excel ──────────────────────────────
const importUsers = asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'File tidak ditemukan');

  const filePath = req.file.path;
  let workbook;
  try {
    workbook = xlsx.readFile(filePath);
  } catch {
    fs.unlink(filePath, () => {});
    return badRequest(res, 'Format file tidak valid');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  fs.unlink(filePath, () => {});

  const results = { berhasil: 0, gagal: 0, errors: [] };

  for (const row of rows) {
    try {
      const username = String(row['Username *'] || row['username'] || '').trim();
      const email    = String(row['Email *']    || row['email']    || '').trim();
      const password = String(row['Password *'] || row['password'] || '').trim();
      const role     = String(row['Role *']     || row['role']     || '').trim().toUpperCase();

      if (!username || !email || !password) {
        results.gagal++;
        results.errors.push({ row: username || email, error: 'Username, email, dan password wajib diisi' });
        continue;
      }
      if (password.length < 6) {
        results.gagal++;
        results.errors.push({ row: username, error: 'Password minimal 6 karakter' });
        continue;
      }
      if (!VALID_ROLES.includes(role)) {
        results.gagal++;
        results.errors.push({ row: username, error: `Role '${role}' tidak valid. Pilihan: ${VALID_ROLES.join(', ')}` });
        continue;
      }

      const existing = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });
      if (existing) {
        results.gagal++;
        results.errors.push({ row: username, error: 'Username atau email sudah digunakan' });
        continue;
      }

      const hashed = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: { username, email, password: hashed, role, aktif: true },
      });
      results.berhasil++;
    } catch (e) {
      results.gagal++;
      results.errors.push({ row: row['Username *'] || row['username'], error: e.message });
    }
  }

  return success(res, results, `Import selesai: ${results.berhasil} berhasil, ${results.gagal} gagal`);
});

// ── Download template Excel user ───────────────────────────────
const downloadTemplateUser = asyncHandler(async (req, res) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIPAKAR';

  const ws = wb.addWorksheet('User');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border     = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  ws.columns = [
    { header: 'Username *', key: 'username', width: 20 },
    { header: 'Email *',    key: 'email',    width: 32 },
    { header: 'Password *', key: 'password', width: 20 },
    { header: 'Role *',     key: 'role',     width: 22 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => {
    c.fill = headerFill; c.font = headerFont; c.border = border;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 22;

  // Contoh data
  [
    ['admin.sekolah',  'admin@sekolah.sch.id',  'password123', 'ADMIN'],
    ['piket.pagi',     'piket@sekolah.sch.id',  'password123', 'PETUGAS_PIKET'],
    ['guru.bk',        'bk@sekolah.sch.id',     'password123', 'BK'],
    ['wali.kelas.x',   'wali@sekolah.sch.id',   'password123', 'WALI_KELAS'],
    ['kepala.sekolah', 'kepsek@sekolah.sch.id', 'password123', 'KEPALA_SEKOLAH'],
  ].forEach(row => {
    ws.addRow(row).eachCell(c => { c.border = border; });
  });

  // Sheet referensi role
  const wsRef = wb.addWorksheet('Referensi Role');
  wsRef.columns = [
    { header: 'Kode Role',   key: 'kode',  width: 22 },
    { header: 'Keterangan',  key: 'ket',   width: 40 },
  ];
  wsRef.getRow(1).eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
  [
    ['SUPER_ADMIN',    'Super Administrator — akses penuh'],
    ['ADMIN',          'Administrator — kelola semua data'],
    ['PETUGAS_PIKET',  'Petugas Piket — input absensi harian'],
    ['BK',             'Guru BK — kelola pelanggaran & konseling'],
    ['WALI_KELAS',     'Wali Kelas — monitoring kelas'],
    ['GURU',           'Guru — akses terbatas'],
    ['KEPALA_SEKOLAH', 'Kepala Sekolah — view laporan & dashboard'],
  ].forEach(r => wsRef.addRow(r).eachCell(c => c.border = border));

  // Sheet petunjuk
  const wsPetunjuk = wb.addWorksheet('Petunjuk');
  wsPetunjuk.getCell('A1').value = 'PETUNJUK PENGISIAN TEMPLATE IMPORT USER';
  wsPetunjuk.getCell('A1').font = { bold: true, size: 13 };
  [
    ['', ''],
    ['Kolom',      'Keterangan'],
    ['Username *', 'Username unik untuk login, tidak boleh duplikat'],
    ['Email *',    'Email unik, format harus valid'],
    ['Password *', 'Password awal minimal 6 karakter. User bisa ubah setelah login'],
    ['Role *',     'Lihat sheet "Referensi Role" untuk pilihan yang valid'],
    ['',           ''],
    ['CATATAN',    'Baris yang username/email-nya sudah ada di sistem akan dilewati (gagal)'],
  ].forEach((row, i) => {
    const r = wsPetunjuk.addRow(row);
    if (i === 1) r.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
  });
  wsPetunjuk.getColumn(1).width = 14;
  wsPetunjuk.getColumn(2).width = 58;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=template-import-user.xlsx');
  await wb.xlsx.write(res);
});

// ── Export data user aktual ────────────────────────────────────
const exportUsers = asyncHandler(async (req, res) => {
  const { role, aktif } = req.query;
  const where = {};
  if (role)   where.role  = role;
  if (aktif !== undefined) where.aktif = aktif === 'true';

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
    select: {
      username: true, email: true, role: true, aktif: true,
      lastLogin: true, createdAt: true,
      guru: { select: { nama: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('User');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border     = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  ws.columns = [
    { header: 'Username',      key: 'username',  width: 22 },
    { header: 'Email',         key: 'email',     width: 34 },
    { header: 'Role',          key: 'role',      width: 22 },
    { header: 'Status',        key: 'aktif',     width: 12 },
    { header: 'Nama Guru',     key: 'namaGuru',  width: 30 },
    { header: 'Login Terakhir',key: 'lastLogin', width: 22 },
    { header: 'Dibuat',        key: 'createdAt', width: 22 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: 'center' }; });
  headerRow.height = 22;

  users.forEach((u, i) => {
    const row = ws.addRow([
      u.username,
      u.email,
      u.role,
      u.aktif ? 'Aktif' : 'Non-aktif',
      u.guru?.nama || '',
      u.lastLogin  ? new Date(u.lastLogin).toLocaleString('id-ID')  : '',
      u.createdAt  ? new Date(u.createdAt).toLocaleString('id-ID')  : '',
    ]);
    row.eachCell(c => { c.border = border; });
    if (i % 2 === 1) row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0FF' } }; });
  });

  // Summary
  ws.addRow([]);
  const sum = ws.addRow([`Total: ${users.length} user`]);
  sum.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=export-user-${Date.now()}.xlsx`);
  await wb.xlsx.write(res);
});

module.exports = { getAll, getById, create, update, resetPassword, remove, importUsers, downloadTemplateUser, exportUsers };
