const prisma = require('../config/prisma');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { success, created, notFound, badRequest } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

const generateQR = asyncHandler(async (req, res) => {
  const { siswaId, eventId, expiresInHours = 24 } = req.body;

  const siswa = await prisma.siswa.findUnique({ where: { id: siswaId } });
  if (!siswa) return notFound(res, 'Siswa tidak ditemukan');

  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + parseInt(expiresInHours));

  await prisma.qRToken.create({
    data: { siswaId, token, eventId: eventId || null, expiresAt },
  });

  const qrData = JSON.stringify({ token, nis: siswa.nis, nama: siswa.nama });
  const qrDataUrl = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#1e293b', light: '#ffffff' },
  });

  return success(res, { token, qrDataUrl, expiresAt, siswa: { nama: siswa.nama, nis: siswa.nis } });
});

const generateBulkQR = asyncHandler(async (req, res) => {
  const { kelasId, eventId, expiresInHours = 24 } = req.body;

  const siswaKelas = await prisma.siswaKelas.findMany({
    where: { kelasId, aktif: true },
    include: { siswa: true },
  });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + parseInt(expiresInHours));

  const results = [];
  for (const sk of siswaKelas) {
    const token = uuidv4();
    await prisma.qRToken.create({
      data: { siswaId: sk.siswa.id, token, eventId: eventId || null, expiresAt },
    });

    const qrData = JSON.stringify({ token, nis: sk.siswa.nis });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });

    results.push({
      siswa: { id: sk.siswa.id, nama: sk.siswa.nama, nis: sk.siswa.nis },
      token, qrDataUrl,
    });
  }

  return success(res, { qrList: results, expiresAt, total: results.length });
});

const scanQR = asyncHandler(async (req, res) => {
  const { token, kelasId, semesterId, sesi = 'PAGI' } = req.body;
  if (!token) return badRequest(res, 'Token QR wajib diisi');

  const qrToken = await prisma.qRToken.findUnique({
    where: { token },
    include: { siswa: true },
  });

  if (!qrToken) return notFound(res, 'QR Code tidak valid');
  if (qrToken.used) return badRequest(res, 'QR Code sudah digunakan');
  if (qrToken.expiresAt < new Date()) return badRequest(res, 'QR Code kadaluarsa');

  const tanggal = new Date();
  tanggal.setHours(0, 0, 0, 0);

  await prisma.qRToken.update({
    where: { token },
    data: { used: true, usedAt: new Date() },
  });

  const kls = kelasId || await getActiveKelasForSiswa(qrToken.siswaId);

  if (kls && semesterId) {
    await prisma.absensi.upsert({
      where: { siswaId_tanggal_sesi: { siswaId: qrToken.siswaId, tanggal, sesi } },
      update: { status: 'HADIR' },
      create: {
        siswaId: qrToken.siswaId,
        kelasId: kls,
        semesterId,
        tanggal,
        sesi,
        status: 'HADIR',
      },
    });
  }

  return success(res, {
    siswa: { nama: qrToken.siswa.nama, nis: qrToken.siswa.nis },
    status: 'HADIR',
    waktu: new Date().toISOString(),
  }, `Kehadiran ${qrToken.siswa.nama} berhasil dicatat`);
});

const getEvents = asyncHandler(async (req, res) => {
  const events = await prisma.eventSekolah.findMany({
    where: { aktif: true },
    orderBy: { tanggal: 'desc' },
  });
  return success(res, events);
});

const createEvent = asyncHandler(async (req, res) => {
  const { nama, tanggal, deskripsi, lokasi } = req.body;
  const event = await prisma.eventSekolah.create({
    data: { nama, tanggal: new Date(tanggal), deskripsi, lokasi },
  });
  return created(res, event, 'Event berhasil dibuat');
});

async function getActiveKelasForSiswa(siswaId) {
  const sk = await prisma.siswaKelas.findFirst({
    where: { siswaId, aktif: true },
    select: { kelasId: true },
  });
  return sk?.kelasId || null;
}

module.exports = { generateQR, generateBulkQR, scanQR, getEvents, createEvent };
