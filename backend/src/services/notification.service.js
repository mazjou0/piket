/**
 * SIPAKAR Notification Service
 * Mendukung notifikasi in-app, email (opsional), dan WhatsApp (opsional)
 */
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

// ============================================================
// IN-APP NOTIFICATION
// ============================================================
const createNotifikasi = async ({ judul, pesan, tipe = 'info', targetId, targetType = 'user' }) => {
  try {
    return await prisma.notifikasi.create({
      data: { judul, pesan, tipe, targetId, targetType },
    });
  } catch (e) {
    logger.error('Notifikasi error:', e);
  }
};

const notifikasiPelanggaran = async (siswaId, totalPoin, statusPeringatan) => {
  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId },
    include: {
      kelasHistori: {
        where: { aktif: true },
        include: { kelas: { include: { waliKelas: { include: { user: true } } } } },
        take: 1,
      },
    },
  });

  if (!siswa) return;

  const pesan = `Siswa ${siswa.nama} (${siswa.nis}) mencapai akumulasi ${totalPoin} poin. Status: ${statusPeringatan}`;

  // Notifikasi ke wali kelas
  const waliKelas = siswa.kelasHistori?.[0]?.kelas?.waliKelas;
  if (waliKelas?.userId) {
    await createNotifikasi({
      judul: `Peringatan Poin Siswa — ${statusPeringatan}`,
      pesan,
      tipe: totalPoin >= 75 ? 'danger' : 'warning',
      targetId: waliKelas.userId,
    });
  }

  // Notifikasi ke semua user BK
  const bkUsers = await prisma.user.findMany({ where: { role: 'BK', aktif: true } });
  for (const bk of bkUsers) {
    await createNotifikasi({
      judul: `Siswa Berisiko — ${statusPeringatan}`,
      pesan,
      tipe: 'danger',
      targetId: bk.id,
    });
  }
};

const notifikasiAbsensiAlpha = async (siswaId, jumlahAlpha) => {
  if (jumlahAlpha < 3) return; // trigger hanya jika >= 3x alpha

  const siswa = await prisma.siswa.findUnique({ where: { id: siswaId } });
  if (!siswa) return;

  const bkUsers = await prisma.user.findMany({ where: { role: 'BK', aktif: true } });
  for (const bk of bkUsers) {
    await createNotifikasi({
      judul: 'Siswa Sering Alpha',
      pesan: `${siswa.nama} (${siswa.nis}) telah alpha sebanyak ${jumlahAlpha} kali`,
      tipe: 'warning',
      targetId: bk.id,
    });
  }
};

// ============================================================
// EMAIL (opsional — hanya aktif jika SMTP dikonfigurasi)
// ============================================================
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to, subject, html,
    });

    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (e) {
    logger.error('Email send error:', e.message);
  }
};

const emailPanggilanOrtu = async (siswa) => {
  if (!siswa.emailOrtu) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1e293b">Pemberitahuan dari ${process.env.SCHOOL_NAME}</h2>
      <p>Yth. Orang Tua/Wali dari <strong>${siswa.nama}</strong>,</p>
      <p>Kami ingin memberitahukan bahwa putra/putri Anda telah mencapai akumulasi poin pelanggaran yang memerlukan perhatian.</p>
      <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:12px;margin:16px 0">
        <strong>Nama Siswa:</strong> ${siswa.nama}<br>
        <strong>NIS:</strong> ${siswa.nis}
      </div>
      <p>Mohon segera menghubungi pihak sekolah untuk konfirmasi lebih lanjut.</p>
      <p>Hormat kami,<br><strong>${process.env.SCHOOL_NAME}</strong></p>
    </div>
  `;

  await sendEmail({
    to: siswa.emailOrtu,
    subject: `[SIPAKAR] Pemberitahuan Pelanggaran Siswa — ${siswa.nama}`,
    html,
  });
};

// ============================================================
// WHATSAPP (opsional — Fonnte API)
// ============================================================
const sendWhatsApp = async ({ phone, message }) => {
  if (!process.env.WA_TOKEN || !phone) return;

  try {
    const axios = require('axios');
    await axios.post(
      process.env.WA_API_URL || 'https://api.fonnte.com/send',
      { target: phone, message },
      { headers: { Authorization: process.env.WA_TOKEN } }
    );
    logger.info(`WhatsApp sent to ${phone}`);
  } catch (e) {
    logger.error('WhatsApp send error:', e.message);
  }
};

const waPanggilanOrtu = async (siswa, pesan) => {
  if (!siswa.teleponOrtu) return;
  const message = `*${process.env.SCHOOL_NAME}*\n\nYth. Orang Tua/Wali ${siswa.nama}\n\n${pesan}\n\nMohon segera menghubungi pihak sekolah.\n\nHormat kami,\n${process.env.SCHOOL_NAME}`;
  await sendWhatsApp({ phone: siswa.teleponOrtu, message });
};

module.exports = {
  createNotifikasi,
  notifikasiPelanggaran,
  notifikasiAbsensiAlpha,
  sendEmail,
  emailPanggilanOrtu,
  sendWhatsApp,
  waPanggilanOrtu,
};
