const prisma = require('../config/prisma');

const auditLog = async ({ userId, aksi, tabel, dataId, dataBefore, dataAfter, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        aksi,
        tabel,
        dataId: dataId || null,
        dataBefore: dataBefore || null,
        dataAfter: dataAfter || null,
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (e) {
    // non-blocking
  }
};

module.exports = { auditLog };
