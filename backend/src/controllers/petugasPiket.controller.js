const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { success, created, notFound, badRequest } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// GET semua jadwal petugas piket (dikelompokkan per hari)
const getAll = asyncHandler(async (req, res) => {
  // Ambil semua piket aktif
  const jadwal = await prisma.petugasPiket.findMany({
    where: { aktif: true },
    orderBy: { hari: 'asc' },
  });

  // Kumpulkan semua guruId unik lalu fetch sekaligus
  const guruIds = [...new Set(jadwal.map(j => j.guruId))];
  const guruList = guruIds.length > 0
    ? await prisma.guru.findMany({
        where: { id: { in: guruIds } },
        select: { id: true, nama: true, nip: true, foto: true },
      })
    : [];

  // Buat map guruId → guru untuk lookup O(1)
  const guruMap = {};
  guruList.forEach(g => { guruMap[g.id] = g; });

  // Kelompokkan per hari (1=Senin … 6=Sabtu)
  const grouped = {};
  for (let i = 1; i <= 6; i++) {
    grouped[i] = { hari: i, namaHari: HARI[i - 1], petugas: [] };
  }

  jadwal.forEach(j => {
    if (grouped[j.hari]) {
      grouped[j.hari].petugas.push({
        ...j,
        guru: guruMap[j.guruId] || null,
      });
    }
  });

  // Sort petugas tiap hari by nama guru A-Z
  Object.values(grouped).forEach(g => {
    g.petugas.sort((a, b) => (a.guru?.nama || '').localeCompare(b.guru?.nama || ''));
  });

  return success(res, Object.values(grouped));
});

// POST assign guru ke hari piket
const assign = asyncHandler(async (req, res) => {
  const { guruId, hari } = req.body;

  if (!guruId) return badRequest(res, 'guruId wajib diisi');
  if (!hari || hari < 1 || hari > 6) return badRequest(res, 'Hari tidak valid (1=Senin, 6=Sabtu)');

  const guru = await prisma.guru.findUnique({ where: { id: guruId } });
  if (!guru) return notFound(res, 'Guru tidak ditemukan');

  // ── Auto-create akun jika guru belum punya user ──────────────
  let akunBaru = null;
  if (!guru.userId) {
    // Gunakan NIP sebagai username & password, fallback ke id jika NIP kosong
    const username = (guru.nip || `guru-${guruId.slice(0, 8)}`).toLowerCase().replace(/\s+/g, '');
    const plainPassword = guru.nip || guruId.slice(0, 8);

    // Pastikan username belum dipakai
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: guru.email || `${username}@piket.local` }] },
    });

    if (existingUser && !existingUser.guru) {
      // Username sudah ada tapi tidak terhubung ke guru manapun — hubungkan saja
      await prisma.guru.update({ where: { id: guruId }, data: { userId: existingUser.id } });
      // Update role ke PETUGAS_PIKET jika belum
      if (existingUser.role !== 'PETUGAS_PIKET') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'PETUGAS_PIKET' },
        });
      }
    } else if (!existingUser) {
      const hashed = await bcrypt.hash(plainPassword, 12);
      const newUser = await prisma.user.create({
        data: {
          username,
          email: guru.email || `${username}@piket.local`,
          password: hashed,
          role: 'PETUGAS_PIKET',
          aktif: true,
        },
      });
      await prisma.guru.update({ where: { id: guruId }, data: { userId: newUser.id } });
      akunBaru = { username, password: plainPassword };
    }
  } else {
    // Guru sudah punya akun — pastikan role-nya PETUGAS_PIKET
    const existingUser = await prisma.user.findUnique({ where: { id: guru.userId } });
    if (existingUser && existingUser.role !== 'PETUGAS_PIKET' &&
        existingUser.role !== 'ADMIN' && existingUser.role !== 'SUPER_ADMIN') {
      await prisma.user.update({
        where: { id: guru.userId },
        data: { role: 'PETUGAS_PIKET' },
      });
    }
  }

  // ── Cek duplikat jadwal piket ─────────────────────────────────
  const existing = await prisma.petugasPiket.findUnique({
    where: { guruId_hari: { guruId, hari: parseInt(hari) } },
  });

  if (existing) {
    if (existing.aktif) return badRequest(res, `${guru.nama} sudah terdaftar sebagai piket ${HARI[hari - 1]}`);
    const updated = await prisma.petugasPiket.update({
      where: { id: existing.id },
      data: { aktif: true },
    });
    return created(res, { ...updated, guru, akunBaru }, 'Petugas piket berhasil ditambahkan kembali');
  }

  const piket = await prisma.petugasPiket.create({
    data: { guruId, hari: parseInt(hari), aktif: true },
  });

  const message = akunBaru
    ? `${guru.nama} ditambahkan sebagai piket ${HARI[hari - 1]}. Akun dibuat: username="${akunBaru.username}", password="${akunBaru.password}"`
    : `${guru.nama} berhasil ditambahkan sebagai piket ${HARI[hari - 1]}`;

  return created(res, { ...piket, guru, akunBaru }, message);
});

// DELETE hapus/nonaktifkan petugas piket
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const piket = await prisma.petugasPiket.findUnique({ where: { id } });
  if (!piket) return notFound(res, 'Data tidak ditemukan');

  const guru = await prisma.guru.findUnique({
    where: { id: piket.guruId },
    select: { nama: true },
  });

  await prisma.petugasPiket.update({ where: { id }, data: { aktif: false } });

  return success(res, null, `${guru?.nama || 'Guru'} dihapus dari jadwal piket`);
});

// DELETE bulk — hapus semua piket untuk hari tertentu
const clearHari = asyncHandler(async (req, res) => {
  const { hari } = req.params;
  if (!hari || hari < 1 || hari > 6) return badRequest(res, 'Hari tidak valid');

  await prisma.petugasPiket.updateMany({
    where: { hari: parseInt(hari), aktif: true },
    data: { aktif: false },
  });

  return success(res, null, `Jadwal piket ${HARI[hari - 1]} berhasil dikosongkan`);
});

module.exports = { getAll, assign, remove, clearHari };
