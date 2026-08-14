const prisma = require('../config/prisma');
const { success, created, notFound, paginate, badRequest } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const { auditLog } = require('../utils/audit');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const fs = require('fs');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', aktif = 'true' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) where.OR = [
    { nama: { contains: search, mode: 'insensitive' } },
    { nip: { contains: search } },
    { email: { contains: search, mode: 'insensitive' } },
  ];
  // Default hanya tampilkan guru aktif; kirim aktif=all untuk tampilkan semua
  if (aktif !== 'all') where.aktif = aktif === 'true';

  const [data, total] = await Promise.all([
    prisma.guru.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { nama: 'asc' },
      include: {
        user: { select: { id: true, username: true, role: true, aktif: true } },
        kelasWali: { select: { id: true, nama: true }, where: { aktif: true } },
      },
    }),
    prisma.guru.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const guru = await prisma.guru.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, username: true, email: true, role: true, lastLogin: true } },
      kelasWali: { include: { tahunAjaran: true, jurusan: true } },
    },
  });
  if (!guru) return notFound(res, 'Guru tidak ditemukan');
  return success(res, guru);
});

const create = asyncHandler(async (req, res) => {
  const { nip, nama, jenisKelamin, email, telepon, alamat, createUser, username, password, role } = req.body;

  let userId = null;
  if (createUser === true || createUser === 'true') {
    if (!username || !password) return badRequest(res, 'Username dan password wajib untuk membuat akun');
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, password: hashed, role: role || 'GURU' },
    });
    userId = user.id;
  }

  const guru = await prisma.guru.create({
    data: {
      nip: nip || null, nama, jenisKelamin, email: email || null,
      telepon: telepon || null, alamat: alamat || null,
      foto: req.file ? `/uploads/foto/${req.file.filename}` : null,
      userId,
    },
  });

  return created(res, guru, 'Guru berhasil ditambahkan');
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.guru.findUnique({ where: { id } });
  if (!existing) return notFound(res, 'Guru tidak ditemukan');

  // Whitelist hanya field scalar yang valid — hindari field relasi (user, kelasWali,
  // absensiDibuat), computed (_count), dan readonly (id, createdAt, updatedAt)
  const { nama, jenisKelamin, email, telepon, alamat, aktif, nip } = req.body;

  const updateData = {};

  if (nama         !== undefined) updateData.nama         = nama;
  if (jenisKelamin !== undefined) updateData.jenisKelamin = jenisKelamin;
  if (email        !== undefined) updateData.email        = email        || null;
  if (telepon      !== undefined) updateData.telepon      = telepon      || null;
  if (alamat       !== undefined) updateData.alamat       = alamat       || null;
  if (aktif        !== undefined) updateData.aktif        = aktif === true || aktif === 'true';

  // NIP boleh diubah, cek duplikat dulu
  if (nip !== undefined) {
    const nipValue = nip || null;
    if (nipValue && nipValue !== existing.nip) {
      const duplicate = await prisma.guru.findFirst({
        where: { nip: nipValue, id: { not: id } },
      });
      if (duplicate) return badRequest(res, 'NIP sudah terdaftar pada guru lain');
    }
    updateData.nip = nipValue;
  }

  if (req.file) updateData.foto = `/uploads/foto/${req.file.filename}`;

  const guru = await prisma.guru.update({ where: { id }, data: updateData });

  await auditLog({ userId: req.user?.id, aksi: 'UPDATE', tabel: 'guru', dataId: id, dataBefore: existing, dataAfter: guru, req });

  return success(res, guru, 'Data guru berhasil diperbarui');
});

const importGuru = asyncHandler(async (req, res) => {
  if (!req.file) return badRequest(res, 'File tidak ditemukan');

  const filePath = req.file.path;
  let workbook;
  try {
    workbook = xlsx.readFile(filePath);
  } catch {
    return badRequest(res, 'Format file tidak valid');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  let rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  // Filter baris kosong dan baris yang isinya header (bukan data)
  rows = rows.filter(row => {
    const namaVal = String(
      row['Nama Lengkap*'] || row['Nama Lengkap *'] || row['Nama Lengkap'] || row['nama'] || ''
    ).trim();
    const isHeaderRow = ['nama lengkap', 'nama lengkap*', 'nama'].includes(namaVal.toLowerCase());
    return namaVal && !isHeaderRow;
  });

  const results = { berhasil: 0, gagal: 0, errors: [] };

  for (const row of rows) {
    try {
      // ── Baca semua kolom — support format file asli maupun template sistem ──
      const nama = String(
        row['Nama Lengkap*'] || row['Nama Lengkap *'] || row['Nama Lengkap'] || row['nama'] || ''
      ).trim();

      const nip = String(row['NIP'] || row['nip'] || '').trim() || null;

      const jkRaw = String(
        row['Jenis Kelamin (L/P)*'] || row['Jenis Kelamin (L/P) *'] ||
        row['Jenis Kelamin *'] || row['Jenis Kelamin*'] || row['Jenis Kelamin'] ||
        row['jenisKelamin'] || 'L'
      ).trim();
      const jk = (jkRaw.toUpperCase() === 'P' || jkRaw.toLowerCase().startsWith('p')) ? 'P' : 'L';

      const emailRaw = String(row['Email'] || row['email'] || '').trim() || null;
      const telepon  = String(
        row['No HP'] || row['No. HP'] || row['Telepon'] || row['telepon'] || row['HP'] || ''
      ).trim() || null;
      const alamat = String(row['Alamat'] || row['alamat'] || '').trim() || null;

      // Kolom tambahan (disimpan sebagai catatan jika ada di model)
      // Kolom seperti Status Kepegawaian, Jabatan, Mata Pelajaran, Kode Jurusan, dll
      // tidak ada di model Guru — diabaikan tapi tidak menyebabkan error

      if (!nama) {
        results.gagal++;
        results.errors.push({ row: nip || '-', error: 'Nama wajib diisi' });
        continue;
      }

      // Cek duplikat email
      if (emailRaw) {
        const emailExists = await prisma.guru.findFirst({ where: { email: emailRaw } });
        if (emailExists && emailExists.nip !== nip) {
          results.gagal++;
          results.errors.push({ row: nama, error: `Email ${emailRaw} sudah dipakai guru lain` });
          continue;
        }
      }

      const existing = nip ? await prisma.guru.findFirst({ where: { nip } }) : null;

      if (existing) {
        await prisma.guru.update({
          where: { id: existing.id },
          data: { nama, jenisKelamin: jk, email: emailRaw, telepon, alamat },
        });
      } else {
        await prisma.guru.create({
          data: { nip, nama, jenisKelamin: jk, email: emailRaw, telepon, alamat, aktif: true },
        });
      }
      results.berhasil++;
    } catch (e) {
      results.gagal++;
      const namaRow = String(
        row['Nama Lengkap*'] || row['Nama Lengkap *'] || row['Nama Lengkap'] || row['nama'] || '-'
      ).trim();
      let errMsg = e.message;
      if (e.code === 'P2002') errMsg = 'Data duplikat — NIP atau Email sudah ada';
      results.errors.push({ row: namaRow, error: errMsg });
    }
  }

  fs.unlink(filePath, () => {});

  const errorPreview = results.errors.slice(0, 5);
  return success(res, {
    ...results,
    errors: errorPreview,
    pesanError: results.gagal > 0
      ? results.gagal + ' baris gagal. Contoh: ' + errorPreview.map(e => '"' + e.row + '": ' + e.error).join(' | ')
      : null,
  }, 'Import selesai: ' + results.berhasil + ' berhasil, ' + results.gagal + ' gagal');
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const guru = await prisma.guru.findUnique({ where: { id } });
  if (!guru) return notFound(res, 'Guru tidak ditemukan');

  // Lepas wali kelas dulu sebelum hapus
  await prisma.kelas.updateMany({ where: { waliKelasId: id }, data: { waliKelasId: null } });
  // Lepas relasi absensi dibuat oleh guru ini
  await prisma.absensi.updateMany({ where: { createdById: id }, data: { createdById: null } });
  // Hapus guru
  await prisma.guru.delete({ where: { id } });

  return success(res, null, 'Guru berhasil dihapus');
});

const bulkRemove = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return badRequest(res, 'IDs tidak boleh kosong');

  await prisma.kelas.updateMany({ where: { waliKelasId: { in: ids } }, data: { waliKelasId: null } });
  await prisma.absensi.updateMany({ where: { createdById: { in: ids } }, data: { createdById: null } });
  await prisma.guru.deleteMany({ where: { id: { in: ids } } });

  return success(res, { count: ids.length }, `${ids.length} guru berhasil dihapus`);
});

module.exports = { getAll, getById, create, update, remove, bulkRemove, importGuru };
