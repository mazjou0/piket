const prisma = require('../config/prisma');
const { success, created, notFound, paginate } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');
const { generatePDF } = require('../services/pdf.service');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, jenis, status, siswaId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (jenis) where.jenis = jenis;
  if (status) where.status = status;
  if (siswaId) where.siswaId = siswaId;

  const [data, total] = await Promise.all([
    prisma.surat.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { tanggal: 'desc' },
      include: {
        siswa: {
          select: { id: true, nama: true, nis: true,
            kelasHistori: {
              where: { aktif: true },
              select: { kelas: { select: { nama: true } } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.surat.count({ where }),
  ]);

  return paginate(res, data, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const surat = await prisma.surat.findUnique({
    where: { id: req.params.id },
    include: {
      siswa: {
        include: {
          kelasHistori: {
            where: { aktif: true },
            include: { kelas: true },
            take: 1,
          },
          akumulasiPoin: true,
        },
      },
    },
  });
  if (!surat) return notFound(res, 'Surat tidak ditemukan');
  return success(res, surat);
});

const create = asyncHandler(async (req, res) => {
  const { siswaId, jenis, perihal, isi } = req.body;

  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId },
    include: { akumulasiPoin: true },
  });
  if (!siswa) return notFound(res, 'Siswa tidak ditemukan');

  const nomor = `SIPAKAR/${jenis}/${siswa.nis}/${new Date().getFullYear()}/${Date.now()}`;

  const surat = await prisma.surat.create({
    data: {
      siswaId, jenis, nomor, perihal,
      tanggal: new Date(),
      isi: isi || null,
      totalPoin: siswa.akumulasiPoin?.totalPoin || 0,
      status: 'DRAFT',
      diterbitkanOleh: req.user?.id,
    },
  });

  return created(res, surat, 'Surat berhasil dibuat');
});

const terbitkan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const surat = await prisma.surat.findUnique({ where: { id } });
  if (!surat) return notFound(res, 'Surat tidak ditemukan');

  const updated = await prisma.surat.update({
    where: { id },
    data: { status: 'TERBIT' },
  });

  return success(res, updated, 'Surat berhasil diterbitkan');
});

const cetakPDF = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const surat = await prisma.surat.findUnique({
    where: { id },
    include: { siswa: true },
  });
  if (!surat) return notFound(res, 'Surat tidak ditemukan');

  const pdfBuffer = await generatePDF({ type: 'surat', surat, siswa: surat.siswa });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=surat-${surat.jenis}-${surat.siswa.nis}.pdf`);
  res.send(pdfBuffer);
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const surat = await prisma.surat.findUnique({ where: { id } });
  if (!surat) return notFound(res, 'Surat tidak ditemukan');

  const updated = await prisma.surat.update({ where: { id }, data: req.body });
  return success(res, updated, 'Surat berhasil diperbarui');
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.surat.delete({ where: { id } });
  return success(res, null, 'Surat berhasil dihapus');
});

module.exports = { getAll, getById, create, terbitkan, cetakPDF, update, remove };
