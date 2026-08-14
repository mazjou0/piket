// webhook.controller.js — Penerima data dari SDMS
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

const handleSdmsWebhook = async (req, res) => {
  const secret = req.headers['x-sdms-secret'];
  const SDMS_SECRET = process.env.SDMS_WEBHOOK_SECRET;
  if (!SDMS_SECRET || secret !== SDMS_SECRET) {
    logger.warn(`[Webhook] Secret tidak cocok dari IP ${req.ip}`);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { event, payload } = req.body;
  if (!event || !payload) {
    return res.status(400).json({ success: false, message: 'event dan payload wajib ada' });
  }

  logger.info(`[Webhook] Event diterima: ${event}`);

  // Jalankan async tanpa block response — agar SDMS tidak timeout
  res.json({ success: true, event });

  try {
    switch (event) {
      case 'guru.created':
      case 'guru.updated':
        await syncGuru(payload);
        break;
      case 'guru.deleted':
        await nonaktifkanGuru(payload.id);
        break;
      case 'siswa.created':
      case 'siswa.updated':
        await syncSiswa(payload);
        break;
      case 'siswa.deleted':
        await nonaktifkanSiswa(payload.id);
        break;
      case 'kelas.created':
      case 'kelas.updated':
        // kelas tidak disync — sudah lengkap di Piket
        break;
      case 'bulk.sync': {
        const guruList  = Array.isArray(payload.guru)  ? payload.guru  : [];
        const siswaList = Array.isArray(payload.siswa) ? payload.siswa : [];
        logger.info(`[Webhook] Bulk sync: ${guruList.length} guru, ${siswaList.length} siswa`);

        let guruOk = 0, guruErr = 0;
        for (const g of guruList) {
          try { await syncGuru(g); guruOk++; }
          catch (e) { guruErr++; logger.warn(`[Webhook] Guru skip: ${g.nama} — ${e.message}`); }
        }

        let siswaOk = 0, siswaErr = 0;
        for (const s of siswaList) {
          try { await syncSiswa(s); siswaOk++; }
          catch (e) { siswaErr++; logger.warn(`[Webhook] Siswa skip: ${s.nama} — ${e.message}`); }
        }

        logger.info(`[Webhook] Bulk sync selesai — Guru: ${guruOk} ok/${guruErr} err, Siswa: ${siswaOk} ok/${siswaErr} err`);
        break;
      }
      default:
        logger.info(`[Webhook] Event '${event}' diabaikan`);
    }
  } catch (err) {
    logger.error(`[Webhook] Error proses '${event}': ${err.message}`);
  }
};

// ── Sync Guru ─────────────────────────────────────────────────
async function syncGuru(data) {
  const sdmsId = String(data.id);
  const jk = mapJenisKelamin(data.jenis_kelamin);

  // Cari berdasarkan NIP dulu (guru mungkin sudah ada sebelum integrasi)
  if (data.nip) {
    const existing = await prisma.guru.findFirst({ where: { nip: data.nip } });
    if (existing) {
      await prisma.guru.update({
        where: { id: existing.id },
        data: {
          sdmsId,
          nama:  data.nama,
          email: data.email || existing.email,
          aktif: data.is_active !== undefined ? Boolean(data.is_active) : existing.aktif,
        },
      });
      logger.info(`[Webhook] Guru updated (NIP match): ${data.nama}`);
      return;
    }
  }

  // Upsert berdasarkan sdmsId
  await prisma.guru.upsert({
    where:  { sdmsId },
    update: {
      nama:  data.nama,
      nip:   data.nip   || undefined,
      email: data.email || undefined,
      aktif: data.is_active !== undefined ? Boolean(data.is_active) : true,
    },
    create: {
      sdmsId,
      nama:        data.nama,
      nip:         data.nip   || null,
      email:       data.email || null,
      jenisKelamin: jk,
      aktif:       data.is_active !== undefined ? Boolean(data.is_active) : true,
    },
  });
  logger.info(`[Webhook] Guru upsert: ${data.nama}`);
}

// ── Nonaktifkan Guru ──────────────────────────────────────────
async function nonaktifkanGuru(sdmsId) {
  await prisma.guru.updateMany({
    where: { sdmsId: String(sdmsId) },
    data:  { aktif: false },
  });
}

// ── Sync Siswa ────────────────────────────────────────────────
async function syncSiswa(data) {
  const sdmsId = String(data.id);
  const statusMap = {
    'Aktif': 'AKTIF', 'Lulus': 'LULUS',
    'Pindah': 'PINDAH', 'Keluar': 'PINDAH', 'Dikeluarkan': 'DIKELUARKAN',
  };
  const status = statusMap[data.status] || 'AKTIF';

  // Cari existing berdasarkan NIS, NISN, atau sdmsId
  let existing = null;

  if (data.nis) {
    existing = await prisma.siswa.findFirst({ where: { nis: data.nis } });
  }
  if (!existing && data.nisn) {
    existing = await prisma.siswa.findFirst({ where: { nisn: data.nisn } });
  }
  if (!existing) {
    existing = await prisma.siswa.findFirst({ where: { sdmsId } });
  }

  if (existing) {
    // Update siswa yang sudah ada
    await prisma.siswa.update({
      where: { id: existing.id },
      data: {
        sdmsId,
        nama:   data.nama,
        nisn:   data.nisn || existing.nisn,
        status,
      },
    });
    return;
  }

  // Siswa benar-benar baru — perlu jurusan
  const jurusan = await prisma.jurusan.findFirst({ where: { aktif: true } });
  if (!jurusan) {
    logger.warn(`[Webhook] Tidak ada jurusan aktif, siswa ${data.nama} dilewati`);
    return;
  }

  await prisma.siswa.create({
    data: {
      sdmsId,
      nis:          data.nis  || `SDMS-${sdmsId}`,
      nisn:         data.nisn || null,
      nama:         data.nama,
      jenisKelamin: mapJenisKelamin(data.jenis_kelamin),
      angkatan:     data.tahun_masuk || new Date().getFullYear(),
      status,
      jurusanId:    jurusan.id,
    },
  });
  logger.info(`[Webhook] Siswa baru: ${data.nama}`);
}

// ── Nonaktifkan Siswa ─────────────────────────────────────────
async function nonaktifkanSiswa(sdmsId) {
  await prisma.siswa.updateMany({
    where: { sdmsId: String(sdmsId) },
    data:  { status: 'PINDAH' },
  });
}

// ── Helper ────────────────────────────────────────────────────
function mapJenisKelamin(val) {
  if (!val) return 'L';
  const v = val.toString().toUpperCase();
  return (v === 'P' || v === 'PEREMPUAN' || v === 'WANITA') ? 'P' : 'L';
}

module.exports = { handleSdmsWebhook };
