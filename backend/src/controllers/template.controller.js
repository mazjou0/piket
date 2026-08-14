/**
 * Template Controller
 * Download template Excel untuk import Siswa, Guru, Kelas
 * Format template == format export, sehingga hasil export bisa langsung di-import kembali
 */
const ExcelJS = require('exceljs');
const prisma = require('../config/prisma');
const { asyncHandler } = require('../middlewares/errorHandler');

// ============================================================
// TEMPLATE DOWNLOAD
// ============================================================

const downloadTemplateSiswa = asyncHandler(async (req, res) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIPAKAR';
  wb.created = new Date();

  const ws = wb.addWorksheet('Siswa');

  // Header styling
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  // Urutan kolom disesuaikan dengan form Tambah Siswa
  // NISN & Nama & Jenis Kelamin adalah data utama (wajib)
  // NIS bersifat opsional (bisa dikosongkan, akan digenerate otomatis jika kosong)
  const columns = [
    { header: 'NISN *',            key: 'nisn',         width: 14 },
    { header: 'Nama Lengkap *',    key: 'nama',         width: 30 },
    { header: 'Jenis Kelamin *',   key: 'jenisKelamin', width: 16 },
    { header: 'Agama',             key: 'agama',        width: 12 },
    { header: 'Kode Jurusan *',    key: 'jurusanKode',  width: 14 },
    { header: 'Nama Kelas',        key: 'namaKelas',    width: 16 },
    { header: 'Angkatan *',        key: 'angkatan',     width: 10 },
    { header: 'Tanggal Lahir',     key: 'tanggalLahir', width: 16 },
    { header: 'Tempat Lahir',      key: 'tempatLahir',  width: 18 },
    { header: 'Alamat',            key: 'alamat',       width: 35 },
    { header: 'Telepon Siswa',     key: 'telepon',      width: 16 },
    { header: 'Nama Orang Tua',    key: 'namaOrtu',     width: 25 },
    { header: 'Telepon Orang Tua', key: 'teleponOrtu',  width: 16 },
    { header: 'Email Orang Tua',   key: 'emailOrtu',    width: 25 },
    { header: 'NIS',               key: 'nis',          width: 14 },
  ];
  ws.columns = columns;

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = border;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 22;

  // Contoh data — urutan sesuai kolom baru
  // nisn, nama, jenisKelamin, agama, jurusanKode, namaKelas, angkatan, tanggalLahir, tempatLahir, alamat, telepon, namaOrtu, teleponOrtu, emailOrtu, nis
  const examples = [
    ['0056789001', 'Ahmad Rizki Pratama', 'L', 'Islam', 'RPL', 'X RPL 1', '2025', '2007-05-15', 'Kediri', 'Jl. Contoh No. 1, Kediri', '081234567890', 'Bapak Ahmad', '081234567891', '', ''],
    ['0056789002', 'Siti Rahayu Dewi',    'P', 'Islam', 'TKJ', 'X TKJ 1', '2025', '2007-08-20', 'Blitar', 'Jl. Contoh No. 2, Blitar', '081234567892', 'Ibu Siti',    '081234567893', '', ''],
  ];

  examples.forEach(row => {
    const r = ws.addRow(row);
    r.eachCell(cell => {
      cell.border = border;
      cell.alignment = { vertical: 'middle' };
    });
  });

  // Sheet kode jurusan (referensi)
  const jurusanList = await prisma.jurusan.findMany({ where: { aktif: true }, orderBy: { kode: 'asc' } });

  // Ambil kelas dari tahun ajaran aktif
  const tahunAjaranAktif = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
  const kelasList = tahunAjaranAktif
    ? await prisma.kelas.findMany({
        where: { tahunAjaranId: tahunAjaranAktif.id, aktif: true },
        include: { jurusan: { select: { kode: true } } },
        orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
      })
    : [];

  const wsRef = wb.addWorksheet('Referensi Kode Jurusan');
  wsRef.columns = [
    { header: 'Kode', key: 'kode', width: 10 },
    { header: 'Nama Jurusan', key: 'nama', width: 40 },
  ];
  const refHeader = wsRef.getRow(1);
  refHeader.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
  jurusanList.forEach(j => {
    const r = wsRef.addRow([j.kode, j.nama]);
    r.eachCell(c => { c.border = border; });
  });

  // Sheet referensi kelas
  const wsKelas = wb.addWorksheet('Referensi Kelas');
  wsKelas.columns = [
    { header: 'Nama Kelas', key: 'nama',    width: 18 },
    { header: 'Tingkat',    key: 'tingkat', width: 10 },
    { header: 'Jurusan',    key: 'jurusan', width: 12 },
  ];
  const kelasRefHeader = wsKelas.getRow(1);
  kelasRefHeader.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
  if (tahunAjaranAktif) {
    wsKelas.getCell('E1').value = `Tahun Ajaran: ${tahunAjaranAktif.nama}`;
    wsKelas.getCell('E1').font = { italic: true, color: { argb: 'FF64748B' } };
  }
  kelasList.forEach(k => {
    const r = wsKelas.addRow([k.nama, k.tingkat, k.jurusan?.kode || '']);
    r.eachCell(c => { c.border = border; });
  });
  wsKelas.getColumn(1).width = 18;

  // Petunjuk
  const wsPetunjuk = wb.addWorksheet('Petunjuk');
  wsPetunjuk.getCell('A1').value = 'PETUNJUK PENGISIAN TEMPLATE IMPORT SISWA';
  wsPetunjuk.getCell('A1').font = { bold: true, size: 13 };
  const petunjuk = [
    ['', ''],
    ['Kolom', 'Keterangan'],
    ['NISN *', 'Nomor Induk Siswa Nasional (wajib, 10 digit, harus unik)'],
    ['Nama Lengkap *', 'Nama lengkap siswa (wajib)'],
    ['Jenis Kelamin *', 'Isi: L (Laki-laki) atau P (Perempuan) — wajib'],
    ['Agama', 'Islam / Kristen / Katolik / Hindu / Buddha / Konghucu'],
    ['Kode Jurusan *', 'Lihat sheet "Referensi Kode Jurusan" (wajib)'],
    ['Nama Kelas', 'Lihat sheet "Referensi Kelas" — siswa langsung masuk kelas (opsional)'],
    ['Angkatan *', 'Tahun masuk, contoh: 2025 (wajib)'],
    ['Tanggal Lahir', 'Format: YYYY-MM-DD contoh: 2007-05-15'],
    ['Tempat Lahir', 'Kota/kabupaten tempat lahir'],
    ['Alamat', 'Alamat lengkap siswa'],
    ['Telepon Siswa', 'Nomor HP siswa (opsional)'],
    ['Nama Orang Tua', 'Nama ayah/ibu (opsional)'],
    ['Telepon Orang Tua', 'Nomor HP orang tua (opsional)'],
    ['Email Orang Tua', 'Email orang tua (opsional)'],
    ['NIS', 'Nomor Induk Siswa lokal (opsional, akan digenerate otomatis jika kosong)'],
  ];
  petunjuk.forEach((row, i) => {
    const r = wsPetunjuk.addRow(row);
    if (i === 1) r.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
  });
  wsPetunjuk.getColumn(1).width = 22;
  wsPetunjuk.getColumn(2).width = 60;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=template-import-siswa.xlsx');
  await wb.xlsx.write(res);
});

const downloadTemplateGuru = asyncHandler(async (req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Guru');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  ws.columns = [
    { header: 'Nama Lengkap*',          key: 'nama',              width: 35 },
    { header: 'NIP',                    key: 'nip',               width: 20 },
    { header: 'Jenis Kelamin (L/P)*',   key: 'jenisKelamin',      width: 18 },
    { header: 'Status Kepegawaian',     key: 'statusKepegawaian', width: 18 },
    { header: 'Jabatan',                key: 'jabatan',            width: 25 },
    { header: 'Mata Pelajaran',         key: 'mapel',              width: 20 },
    { header: 'Kode Jurusan',           key: 'kodeJurusan',       width: 14 },
    { header: 'No HP',                  key: 'telepon',            width: 16 },
    { header: 'Email',                  key: 'email',              width: 30 },
    { header: 'Tempat Lahir',           key: 'tempatLahir',        width: 18 },
    { header: 'Tanggal Lahir (YYYY-MM-DD)', key: 'tanggalLahir',   width: 22 },
    { header: 'Agama',                  key: 'agama',              width: 12 },
    { header: 'Alamat',                 key: 'alamat',             width: 40 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  headerRow.height = 22;

  const examples = [
    ['Drs. AHMAD SUPRIADI, M.Pd', '197001011990031001', 'L', 'PNS', 'Kepala Sekolah', 'Matematika', '', '081234567890', 'ahmad@smkn1kras.sch.id', 'Kediri', '1970-01-01', 'Islam', 'Jl. Contoh No. 1'],
    ['SITI RAHAYU, S.Pd', '197505152000122001', 'P', 'PPPK', 'Guru', 'B. Indonesia', '', '081234567891', 'siti@smkn1kras.sch.id', 'Blitar', '1975-05-15', 'Islam', 'Jl. Contoh No. 2'],
    ['BUDI SANTOSO, S.Kom', '', 'L', 'Honor', 'Guru', 'TKJ', 'TKJ', '081234567892', '', 'Malang', '1990-03-20', 'Islam', 'Jl. Contoh No. 3'],
  ];
  examples.forEach(row => {
    const r = ws.addRow(row);
    r.eachCell(c => { c.border = border; });
  });

  const wsPetunjuk = wb.addWorksheet('Petunjuk');
  wsPetunjuk.getCell('A1').value = 'PETUNJUK IMPORT GURU';
  wsPetunjuk.getCell('A1').font = { bold: true, size: 13 };
  [
    ['Nama Lengkap*', 'Wajib diisi — nama lengkap guru'],
    ['NIP', 'Opsional — bisa dikosongkan untuk guru Honor'],
    ['Jenis Kelamin (L/P)*', 'Wajib — isi L (Laki-laki) atau P (Perempuan)'],
    ['Status Kepegawaian', 'Opsional — contoh: PNS, PPPK, Honor'],
    ['Jabatan', 'Opsional — contoh: Guru, Kepala Sekolah, Waka'],
    ['Mata Pelajaran', 'Opsional — mata pelajaran yang diampu'],
    ['Kode Jurusan', 'Opsional — kode jurusan (TKJ, TKR, KUL, TPTUP, dll)'],
    ['No HP', 'Opsional — nomor HP aktif'],
    ['Email', 'Opsional — harus unik jika diisi'],
    ['Tempat Lahir', 'Opsional'],
    ['Tanggal Lahir (YYYY-MM-DD)', 'Opsional — format: 1990-01-15'],
    ['Agama', 'Opsional — Islam, Kristen, Katolik, Hindu, Buddha, Konghucu'],
    ['Alamat', 'Opsional — alamat lengkap'],
  ].forEach(row => wsPetunjuk.addRow(row));
  wsPetunjuk.getColumn(1).width = 28;
  wsPetunjuk.getColumn(2).width = 55;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=template-import-guru.xlsx');
  await wb.xlsx.write(res);
});

const downloadTemplateKelas = asyncHandler(async (req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Kelas');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  const [jurusanList, tahunAjaranList, guruList] = await Promise.all([
    prisma.jurusan.findMany({ where: { aktif: true } }),
    prisma.tahunAjaran.findMany({ orderBy: { mulai: 'desc' }, take: 3 }),
    prisma.guru.findMany({ where: { aktif: true }, select: { nip: true, nama: true } }),
  ]);

  ws.columns = [
    { header: 'Nama Kelas *',        key: 'nama',          width: 18 },
    { header: 'Tingkat *',           key: 'tingkat',       width: 10 },
    { header: 'Kode Jurusan *',      key: 'jurusanKode',   width: 14 },
    { header: 'Tahun Ajaran *',      key: 'tahunAjaran',   width: 14 },
    { header: 'NIP Wali Kelas',      key: 'waliKelasNip',  width: 22 },
    { header: 'Kapasitas',           key: 'kapasitas',     width: 12 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: 'center', vertical: 'middle' }; });

  ws.addRow(['X RPL 1', '10', 'RPL', tahunAjaranList[0]?.nama || '2025/2026', guruList[0]?.nip || '', '36']).eachCell(c => c.border = border);
  ws.addRow(['X TKJ 1', '10', 'TKJ', tahunAjaranList[0]?.nama || '2025/2026', '',                      '36']).eachCell(c => c.border = border);

  // Sheet referensi
  const wsRef = wb.addWorksheet('Referensi');
  wsRef.addRow(['Kode Jurusan', 'Nama Jurusan', '', 'Tahun Ajaran', '', 'NIP Guru', 'Nama Guru']);
  jurusanList.forEach((j, i) => {
    wsRef.getCell(`A${i + 2}`).value = j.kode;
    wsRef.getCell(`B${i + 2}`).value = j.nama;
  });
  tahunAjaranList.forEach((t, i) => {
    wsRef.getCell(`D${i + 2}`).value = t.nama;
  });
  guruList.slice(0, 20).forEach((g, i) => {
    wsRef.getCell(`F${i + 2}`).value = g.nip || '(tanpa NIP)';
    wsRef.getCell(`G${i + 2}`).value = g.nama;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=template-import-kelas.xlsx');
  await wb.xlsx.write(res);
});

// Template Jurusan
const downloadTemplateJurusan = asyncHandler(async (req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Jurusan');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  ws.columns = [
    { header: 'Kode *',          key: 'kode',      width: 12 },
    { header: 'Nama Lengkap *',  key: 'nama',      width: 40 },
    { header: 'Singkatan *',     key: 'singkatan', width: 16 },
  ];
  const hr = ws.getRow(1);
  hr.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
  hr.height = 22;

  [
    ['RPL', 'Rekayasa Perangkat Lunak', 'RPL'],
    ['TKJ', 'Teknik Komputer Jaringan', 'TKJ'],
    ['MM',  'Multimedia',               'MM'],
  ].forEach(row => {
    ws.addRow(row).eachCell(c => { c.border = border; });
  });

  const wsPetunjuk = wb.addWorksheet('Petunjuk');
  wsPetunjuk.getCell('A1').value = 'PETUNJUK IMPORT JURUSAN';
  wsPetunjuk.getCell('A1').font = { bold: true, size: 12 };
  [['Kode', 'Kode unik jurusan, tidak boleh duplikat, tidak bisa diubah setelah tersimpan'],
   ['Nama Lengkap', 'Nama lengkap program keahlian'],
   ['Singkatan', 'Singkatan nama jurusan']].forEach(row => {
    wsPetunjuk.addRow(row);
  });
  wsPetunjuk.getColumn(1).width = 16;
  wsPetunjuk.getColumn(2).width = 50;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=template-import-jurusan.xlsx');
  await wb.xlsx.write(res);
});

// ============================================================
// EXPORT DATA (bisa langsung di-import kembali)
// ============================================================

const exportSiswa = asyncHandler(async (req, res) => {
  const { kelasId, jurusanId, status = 'AKTIF', angkatan } = req.query;
  const where = {};
  if (status) where.status = status;
  if (jurusanId) where.jurusanId = jurusanId;
  if (angkatan) where.angkatan = parseInt(angkatan);
  if (kelasId) where.kelasHistori = { some: { kelasId, aktif: true } };

  const siswaList = await prisma.siswa.findMany({
    where,
    include: {
      jurusan: true,
      kelasHistori: {
        where: { aktif: true },
        include: { kelas: true },
        take: 1,
      },
    },
    orderBy: { nama: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Siswa');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  // Urutan kolom disesuaikan dengan template import (NISN sebagai data utama)
  ws.columns = [
    { header: 'NISN *',            key: 'nisn',         width: 14 },
    { header: 'Nama Lengkap *',    key: 'nama',         width: 30 },
    { header: 'Jenis Kelamin *',   key: 'jenisKelamin', width: 16 },
    { header: 'Agama',             key: 'agama',        width: 12 },
    { header: 'Kode Jurusan *',    key: 'jurusanKode',  width: 14 },
    { header: 'Nama Kelas',        key: 'namaKelas',    width: 16 },
    { header: 'Angkatan *',        key: 'angkatan',     width: 10 },
    { header: 'Tanggal Lahir',     key: 'tanggalLahir', width: 16 },
    { header: 'Tempat Lahir',      key: 'tempatLahir',  width: 18 },
    { header: 'Alamat',            key: 'alamat',       width: 35 },
    { header: 'Telepon Siswa',     key: 'telepon',      width: 16 },
    { header: 'Nama Orang Tua',    key: 'namaOrtu',     width: 25 },
    { header: 'Telepon Orang Tua', key: 'teleponOrtu',  width: 16 },
    { header: 'Email Orang Tua',   key: 'emailOrtu',    width: 25 },
    { header: 'NIS',               key: 'nis',          width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: 'center' }; });
  headerRow.height = 22;

  siswaList.forEach((s, i) => {
    const kelasAktif = s.kelasHistori?.[0]?.kelas?.nama || '';
    const row = ws.addRow([
      s.nisn || '',
      s.nama,
      s.jenisKelamin,
      s.agama || '',
      s.jurusan?.kode || '',
      kelasAktif,
      s.angkatan,
      s.tanggalLahir ? new Date(s.tanggalLahir).toISOString().split('T')[0] : '',
      s.tempatLahir || '',
      s.alamat || '',
      s.telepon || '',
      s.namaOrtu || '',
      s.teleponOrtu || '',
      s.emailOrtu || '',
      s.nis,
    ]);
    row.eachCell(c => { c.border = border; });
    if (i % 2 === 1) {
      row.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  // Summary row
  ws.addRow([]);
  const sum = ws.addRow([`Total: ${siswaList.length} siswa`, '', '', '', '', '', '', '', '', '', '', '', '', '']);
  sum.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=export-siswa-${Date.now()}.xlsx`);
  await wb.xlsx.write(res);
});

const exportGuru = asyncHandler(async (req, res) => {
  const guruList = await prisma.guru.findMany({
    where: { aktif: true },
    orderBy: { nama: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Guru');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  ws.columns = [
    { header: 'NIP',            key: 'nip',          width: 20 },
    { header: 'Nama Lengkap *', key: 'nama',         width: 30 },
    { header: 'Jenis Kelamin *',key: 'jenisKelamin', width: 16 },
    { header: 'Email',          key: 'email',        width: 30 },
    { header: 'Telepon',        key: 'telepon',      width: 16 },
    { header: 'Alamat',         key: 'alamat',       width: 40 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: 'center' }; });
  headerRow.height = 22;

  guruList.forEach((g, i) => {
    const row = ws.addRow([g.nip || '', g.nama, g.jenisKelamin, g.email || '', g.telepon || '', g.alamat || '']);
    row.eachCell(c => { c.border = border; });
    if (i % 2 === 1) row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=export-guru-${Date.now()}.xlsx`);
  await wb.xlsx.write(res);
});

const exportKelas = asyncHandler(async (req, res) => {  const { tahunAjaranId } = req.query;
  const where = { aktif: true };
  if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId;

  const kelasList = await prisma.kelas.findMany({
    where,
    include: {
      jurusan: true,
      tahunAjaran: true,
      waliKelas: true,
    },
    orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Kelas');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  ws.columns = [
    { header: 'Nama Kelas *',   key: 'nama',         width: 18 },
    { header: 'Tingkat *',      key: 'tingkat',      width: 10 },
    { header: 'Kode Jurusan *', key: 'jurusanKode',  width: 14 },
    { header: 'Tahun Ajaran *', key: 'tahunAjaran',  width: 14 },
    { header: 'NIP Wali Kelas', key: 'waliKelasNip', width: 22 },
    { header: 'Kapasitas',      key: 'kapasitas',    width: 12 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: 'center' }; });

  kelasList.forEach((k, i) => {
    const row = ws.addRow([k.nama, k.tingkat, k.jurusan?.kode || '', k.tahunAjaran?.nama || '', k.waliKelas?.nip || '', k.kapasitas]);
    row.eachCell(c => { c.border = border; });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=export-kelas-${Date.now()}.xlsx`);
  await wb.xlsx.write(res);
});

module.exports = {
  downloadTemplateSiswa,
  downloadTemplateGuru,
  downloadTemplateKelas,
  downloadTemplateJurusan,
  exportSiswa,
  exportGuru,
  exportKelas,
};
