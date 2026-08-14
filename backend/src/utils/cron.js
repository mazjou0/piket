const cron = require('node-cron');
const prisma = require('../config/prisma');
const { logger } = require('./logger');

let autoAbsensiPagiJob = null;
let autoAbsensiSiangJob = null;

// Log eksekusi auto-absensi (in-memory, maks 50 entri)
const eksekusiLog = [];
const MAX_LOG = 50;

const addLog = (entry) => {
  eksekusiLog.unshift({ ...entry, waktu: new Date().toISOString() });
  if (eksekusiLog.length > MAX_LOG) eksekusiLog.pop();
};

const getLog = () => eksekusiLog;

const runAutoAbsensi = async (sesi) => {
  const startTime = Date.now();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cek hari kerja — ambil dari env (contoh: "1,2,3,4,5" = Senin-Jumat)
    const hariKerjaStr = process.env.AUTO_ABSENSI_HARI_KERJA || '1,2,3,4,5';
    const hariKerja = hariKerjaStr.split(',').map(Number);
    const hariIni = today.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu

    if (!hariKerja.includes(hariIni)) {
      const namaHari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][hariIni];
      logger.info(`⏭ Skip auto-absensi ${sesi}: bukan hari kerja (${namaHari})`);
      addLog({ sesi, status: 'SKIP', alasan: `Bukan hari kerja (${namaHari})`, baru: 0, sudahAda: 0 });
      return;
    }

    // Cek apakah hari libur
    const hariLibur = await prisma.hariLibur.findFirst({ where: { tanggal: today } });
    if (hariLibur) {
      logger.info(`⏭ Skip auto-absensi ${sesi}: hari libur (${hariLibur.nama})`);
      addLog({ sesi, status: 'SKIP', alasan: `Hari libur: ${hariLibur.nama}`, baru: 0, sudahAda: 0 });
      return;
    }

    // Ambil semester aktif
    const semester = await prisma.semester.findFirst({ where: { aktif: true } });
    if (!semester) {
      logger.warn(`⚠ Auto-absensi ${sesi} gagal: tidak ada semester aktif`);
      addLog({ sesi, status: 'ERROR', alasan: 'Tidak ada semester aktif', baru: 0, sudahAda: 0 });
      return;
    }

    // Ambil semua siswa aktif dengan kelas aktif
    const siswaList = await prisma.siswaKelas.findMany({
      where: { aktif: true, siswa: { status: 'AKTIF' }, kelas: { aktif: true } },
      select: { siswaId: true, kelasId: true },
    });

    let countBaru = 0;
    let countSudahAda = 0;

    // Cek semua absensi hari ini sekaligus (1 query, lebih efisien)
    const siswaIds = siswaList.map(sk => sk.siswaId);
    const existingAbsensi = await prisma.absensi.findMany({
      where: {
        siswaId: { in: siswaIds },
        tanggal: today,
        sesi,
      },
      select: { siswaId: true },
    });
    const sudahAbsenSet = new Set(existingAbsensi.map(a => a.siswaId));

    // Batch create untuk yang belum absen
    const toCreate = siswaList.filter(sk => !sudahAbsenSet.has(sk.siswaId));

    if (toCreate.length > 0) {
      await prisma.absensi.createMany({
        data: toCreate.map(sk => ({
          siswaId: sk.siswaId,
          kelasId: sk.kelasId,
          semesterId: semester.id,
          tanggal: today,
          sesi,
          status: 'HADIR',
          createdById: null,
        })),
        skipDuplicates: true,
      });
      countBaru = toCreate.length;
    }
    countSudahAda = siswaList.length - toCreate.length;

    const durasi = Date.now() - startTime;
    logger.info(`✅ Auto-absensi ${sesi} selesai: ${countBaru} baru, ${countSudahAda} sudah ada (${durasi}ms)`);
    addLog({ sesi, status: 'SUKSES', alasan: null, baru: countBaru, sudahAda: countSudahAda, durasi });
  } catch (e) {
    const durasi = Date.now() - startTime;
    logger.error(`❌ Auto-absensi ${sesi} error:`, e);
    addLog({ sesi, status: 'ERROR', alasan: e.message, baru: 0, sudahAda: 0, durasi });
  }
};

const scheduleAutoAbsensi = () => {
  // Stop existing jobs
  if (autoAbsensiPagiJob) { autoAbsensiPagiJob.stop(); autoAbsensiPagiJob = null; }
  if (autoAbsensiSiangJob) { autoAbsensiSiangJob.stop(); autoAbsensiSiangJob = null; }

  const enabled = process.env.AUTO_ABSENSI_ENABLED === 'true';
  if (!enabled) {
    logger.info('⏸ Auto-absensi dinonaktifkan');
    return;
  }

  // Gunakan wildcard * untuk hari — filter hari kerja dilakukan di dalam runAutoAbsensi
  const jamPagi = process.env.AUTO_ABSENSI_JAM_PAGI || '07:00';
  const [hPagi, mPagi] = jamPagi.split(':').map(Number);

  autoAbsensiPagiJob = cron.schedule(
    `${mPagi} ${hPagi} * * *`,
    () => runAutoAbsensi('PAGI'),
    { timezone: 'Asia/Jakarta' }
  );
  logger.info(`⏰ Auto-absensi PAGI dijadwalkan: ${jamPagi} WIB`);

  const enableSiang = process.env.AUTO_ABSENSI_ENABLE_SIANG === 'true';
  if (enableSiang) {
    const jamSiang = process.env.AUTO_ABSENSI_JAM_SIANG || '13:00';
    const [hSiang, mSiang] = jamSiang.split(':').map(Number);

    autoAbsensiSiangJob = cron.schedule(
      `${mSiang} ${hSiang} * * *`,
      () => runAutoAbsensi('SIANG'),
      { timezone: 'Asia/Jakarta' }
    );
    logger.info(`⏰ Auto-absensi SIANG dijadwalkan: ${jamSiang} WIB`);
  }
};

const init = () => {
  // Clean expired refresh tokens — daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }] },
      });
      logger.info(`🧹 Cleaned ${result.count} expired refresh tokens`);
    } catch (e) {
      logger.error('Cron cleanup error:', e);
    }
  });

  // Auto-update akumulasi poin — every hour (batch, bukan loop per siswa)
  cron.schedule('0 * * * *', async () => {
    try {
      // Ambil semua poin pelanggaran sekaligus dalam 1 query groupBy
      const pelanggaranGrouped = await prisma.pelanggaran.groupBy({
        by: ['siswaId'],
        _sum: { poin: true },
      });

      // Buat map siswaId → totalPoin
      const poinMap = {};
      pelanggaranGrouped.forEach(p => { poinMap[p.siswaId] = p._sum.poin || 0; });

      // Ambil semua akumulasiPoin yang ada
      const akumulasiList = await prisma.akumulasiPoin.findMany({
        select: { siswaId: true, totalPoin: true, statusPeringatan: true },
      });

      // Hitung status baru dan batch update
      const updates = akumulasiList.map(ak => {
        const poin = poinMap[ak.siswaId] || 0;
        let statusPeringatan = 'NORMAL';
        if (poin >= 150) statusPeringatan = 'REKOMENDASI_BK';
        else if (poin >= 100) statusPeringatan = 'PANGGILAN_ORTU';
        else if (poin >= 75)  statusPeringatan = 'SP2';
        else if (poin >= 50)  statusPeringatan = 'SP1';
        else if (poin >= 25)  statusPeringatan = 'WARNING';
        return { siswaId: ak.siswaId, totalPoin: poin, statusPeringatan };
      });

      // Update dalam transaction batch (bukan loop)
      await prisma.$transaction(
        updates.map(u => prisma.akumulasiPoin.update({
          where: { siswaId: u.siswaId },
          data: { totalPoin: u.totalPoin, statusPeringatan: u.statusPeringatan },
        })),
        { isolationLevel: 'ReadCommitted' }
      );

      logger.info(`✅ Akumulasi poin diperbarui: ${updates.length} siswa`);
    } catch (e) {
      logger.error('Cron akumulasi poin error:', e);
    }
  });

  scheduleAutoAbsensi();
  logger.info('⏰ Cron jobs initialized');
};

const restartAutoAbsensi = () => {
  logger.info('🔄 Restarting auto-absensi scheduler...');
  scheduleAutoAbsensi();
};

module.exports = { init, restartAutoAbsensi, getLog };
