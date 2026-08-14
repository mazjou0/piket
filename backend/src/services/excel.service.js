const ExcelJS = require('exceljs');

const SCHOOL_NAME = process.env.SCHOOL_NAME || 'SMKN 1 Kras';

function border() {
  return {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' },
  };
}

function hdrFill() {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
}

function stripeFill() {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
}

function hdrFont() {
  return { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
}

function applyHeaderRow(row, cols) {
  row.height = 22;
  row.eachCell((cell, i) => {
    cell.value = cols[i - 1];
    cell.fill  = hdrFill();
    cell.font  = hdrFont();
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = border();
  });
}

const generateExcel = async (data) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIPAKAR';
  wb.created = new Date();

  switch (data.type) {
    case 'absensi':     await buildAbsensiSheet(wb, data);     break;
    case 'rekap-kelas': await buildRekapKelasSheet(wb, data);  break;
    case 'pelanggaran': await buildPelanggaranSheet(wb, data); break;
  }

  return wb.xlsx.writeBuffer();
};

// ── Rekap Absensi per Siswa ──────────────────────────────────
async function buildAbsensiSheet(wb, data) {
  const ws = wb.addWorksheet('Rekap Absensi');
  const period = `${data.params?.tanggalMulai || '-'} s/d ${data.params?.tanggalSelesai || '-'}`;
  const cols = ['No','NIS','Nama Siswa','Kelas','Hadir','Sakit','Izin','Alpha','Terlambat','Dispensasi','Total','% Hadir'];

  // Judul
  ws.mergeCells(`A1:L1`);
  ws.getCell('A1').value = `REKAP ABSENSI SISWA — ${SCHOOL_NAME}`;
  ws.getCell('A1').font  = { bold: true, size: 13 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:L2');
  ws.getCell('A2').value = `Periode: ${period}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };

  ws.addRow([]);
  const hRow = ws.addRow(new Array(cols.length).fill(''));
  applyHeaderRow(hRow, cols);

  ws.columns = [
    { width: 6 }, { width: 14 }, { width: 32 }, { width: 18 },
    { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 },
    { width: 12 }, { width: 12 }, { width: 8 }, { width: 10 },
  ];

  data.records.forEach((r, i) => {
    const total = r.total || 0;
    const pct   = total > 0 ? Math.round((r.hadir / total) * 100) : 0;
    const isStripe = i % 2 === 1;

    const row = ws.addRow([
      i + 1,
      r.siswa?.nis || '-',
      r.siswa?.nama || '-',
      r.siswa?.kelasHistori?.[0]?.kelas?.nama || '-',
      r.hadir || 0,
      r.sakit || 0,
      r.izin  || 0,
      r.alpha || 0,
      r.terlambat  || 0,
      r.dispensasi || 0,
      total,
      `${pct}%`,
    ]);

    row.eachCell((cell, ci) => {
      cell.border    = border();
      cell.alignment = { vertical: 'middle', horizontal: ci <= 4 ? 'left' : 'center' };
      if (isStripe) cell.fill = stripeFill();
    });

    // Warna kondisional
    const hadirCell = row.getCell(5);
    hadirCell.font = { bold: true, color: { argb: 'FF16A34A' } };

    if ((r.alpha || 0) > 0) {
      row.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' } };
    }

    const pctCell = row.getCell(12);
    pctCell.font = { bold: true, color: { argb: pct < 75 ? 'FFDC2626' : 'FF16A34A' } };
  });

  ws.addRow([]);
  const sumRow = ws.addRow([`Total: ${data.records.length} siswa`]);
  sumRow.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
}

// ── Rekap per Kelas ──────────────────────────────────────────
async function buildRekapKelasSheet(wb, data) {
  const ws = wb.addWorksheet('Rekap per Kelas');
  const period = `${data.params?.tanggalMulai || '-'} s/d ${data.params?.tanggalSelesai || '-'}`;
  const cols = ['No','Kelas','Jurusan','Hadir','Sakit','Izin','Alpha','Terlambat','Total','% Hadir'];

  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = `REKAP ABSENSI PER KELAS — ${SCHOOL_NAME}`;
  ws.getCell('A1').font  = { bold: true, size: 13 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:J2');
  ws.getCell('A2').value = `Periode: ${period}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };

  ws.addRow([]);
  const hRow = ws.addRow(new Array(cols.length).fill(''));
  applyHeaderRow(hRow, cols);

  ws.columns = [
    { width: 6 }, { width: 20 }, { width: 14 }, { width: 8 },
    { width: 8 }, { width: 8 }, { width: 8 }, { width: 12 }, { width: 8 }, { width: 10 },
  ];

  data.records.forEach((r, i) => {
    const pct = r.persentaseHadir || 0;
    const isStripe = i % 2 === 1;

    const row = ws.addRow([
      i + 1,
      r.kelas?.nama || '-',
      r.kelas?.jurusan?.kode || '-',
      r.hadir || 0, r.sakit || 0, r.izin || 0,
      r.alpha || 0, r.terlambat || 0,
      r.total || 0, `${pct}%`,
    ]);

    row.eachCell((cell, ci) => {
      cell.border    = border();
      cell.alignment = { vertical: 'middle', horizontal: ci <= 3 ? 'left' : 'center' };
      if (isStripe) cell.fill = stripeFill();
    });

    if ((r.alpha || 0) > 0) row.getCell(7).font = { bold: true, color: { argb: 'FFDC2626' } };
    row.getCell(10).font = { bold: true, color: { argb: pct < 75 ? 'FFDC2626' : 'FF16A34A' } };
  });

  ws.addRow([]);
  ws.addRow([`Total: ${data.records.length} kelas`])
    .getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
}

// ── Rekap Pelanggaran ────────────────────────────────────────
async function buildPelanggaranSheet(wb, data) {
  const ws = wb.addWorksheet('Rekap Pelanggaran');
  const period = `${data.params?.tanggalMulai || '-'} s/d ${data.params?.tanggalSelesai || '-'}`;
  const cols = ['No','NIS','Nama Siswa','Kelas','Jenis Pelanggaran','Poin','Tanggal','Keterangan'];

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = `REKAP PELANGGARAN — ${SCHOOL_NAME}`;
  ws.getCell('A1').font  = { bold: true, size: 13 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `Periode: ${period}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };

  ws.addRow([]);
  const hRow = ws.addRow(new Array(cols.length).fill(''));
  applyHeaderRow(hRow, cols);

  ws.columns = [
    { width: 6 }, { width: 14 }, { width: 32 }, { width: 18 },
    { width: 28 }, { width: 8 }, { width: 14 }, { width: 30 },
  ];

  data.records.forEach((r, i) => {
    const isStripe = i % 2 === 1;
    const row = ws.addRow([
      i + 1,
      r.siswa?.nis || '-',
      r.siswa?.nama || '-',
      r.kelas?.nama || '-',
      r.jenisPelanggaran?.nama || '-',
      r.poin || 0,
      r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID') : '-',
      r.keterangan || '-',
    ]);

    row.eachCell((cell, ci) => {
      cell.border    = border();
      cell.alignment = { vertical: 'middle', horizontal: ci === 6 ? 'center' : 'left' };
      if (isStripe) cell.fill = stripeFill();
    });

    const poin = r.poin || 0;
    if (poin >= 25) row.getCell(6).font = { bold: true, color: { argb: 'FFDC2626' } };
    else if (poin >= 10) row.getCell(6).font = { bold: true, color: { argb: 'FFF97316' } };
  });

  ws.addRow([]);
  ws.addRow([`Total: ${data.records.length} pelanggaran`])
    .getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
}

module.exports = { generateExcel };
