const PdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
PdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

const SCHOOL_NAME  = process.env.SCHOOL_NAME    || 'SMKN 1 Kras';
const SCHOOL_ADDR  = process.env.SCHOOL_ADDRESS || 'Jl. Raya Kras, Kediri, Jawa Timur';
const SCHOOL_PHONE = process.env.SCHOOL_PHONE   || '(0354) 123456';

// ─── Ukuran kertas ───────────────────────────────────────────
// pdfmake sudah kenal 'A4'; F4 = 215.9 × 330.2 mm → pt (1mm = 2.8346pt)
const PAGE_SIZES = {
  A4: 'A4',
  F4: [612.3, 935.4], // 215.9mm × 330.2mm dalam poin
};

// ─── Helpers ─────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
const fmtDateLong = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const STATUS_LABELS = {
  HADIR: 'Hadir', SAKIT: 'Sakit', IZIN: 'Izin', ALPHA: 'Alpha',
  DISPENSASI: 'Dispensasi', TERLAMBAT: 'Terlambat',
  PULANG_CEPAT: 'Pulang Cepat', DINAS: 'Dinas', LAINNYA: 'Lainnya',
};

function kop(orient) {
  const lineLen = orient === 'landscape' ? 750 : 515;
  return [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: SCHOOL_NAME,  style: 'kopNama' },
            { text: SCHOOL_ADDR,  style: 'kopAlamat' },
            { text: `Telp: ${SCHOOL_PHONE}`, style: 'kopAlamat' },
          ],
        },
      ],
      margin: [0, 0, 0, 6],
    },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: lineLen, y2: 0, lineWidth: 2, lineColor: '#1e293b' }],
      margin: [0, 0, 0, 8],
    },
  ];
}

function ttd(signer, tanggal) {
  // signer = { nama, nip, role } dari user yang login
  // Fallback ke kepala sekolah jika tidak ada signer
  const nama = (signer && signer.nama) || process.env.SCHOOL_PRINCIPAL_NAME || '';
  const nip  = (signer && signer.nip)  || process.env.SCHOOL_PRINCIPAL_NIP  || '';
  const jabatan = (signer && signer.role === 'PETUGAS_PIKET')
    ? 'Petugas Piket,'
    : (signer && signer.role === 'ADMIN')
    ? 'Administrator,'
    : 'Kepala Sekolah,';

  return {
    columns: [
      { width: '*', text: '' },
      {
        width: 220,
        stack: [
          { text: `Kras, ${fmtDateLong(tanggal || new Date())}` },
          { text: jabatan },
          { text: '\n\n\n' },
          { text: nama || '_'.repeat(28), bold: !!nama, decoration: nama ? undefined : 'underline' },
          { text: `NIP. ${nip || '______________________'}` },
        ],
        alignment: 'center',
        fontSize: 10,
      },
    ],
    margin: [0, 20, 0, 0],
  };
}

function pdfStyles() {
  return {
    kopNama:    { fontSize: 15, bold: true, alignment: 'center', color: '#0f172a' },
    kopAlamat:  { fontSize: 9,  alignment: 'center', color: '#475569' },
    judul:      { fontSize: 13, bold: true, alignment: 'center', margin: [0, 8, 0, 4] },
    subjudul:   { fontSize: 10, alignment: 'center', color: '#475569', margin: [0, 0, 0, 10] },
    thdr:       { bold: true, color: '#ffffff', fontSize: 9, alignment: 'center' },
    cell:       { fontSize: 9 },
    cellCenter: { fontSize: 9, alignment: 'center' },
    note:       { fontSize: 8, color: '#64748b', italics: true, margin: [0, 6, 0, 0] },
    footer:     { fontSize: 8, color: '#94a3b8', alignment: 'center' },
  };
}

const THDR_FILL = { fillColor: '#1e293b' };
const STRIPE    = { fillColor: '#f8fafc' };

// ─── Builder: Rekap Absensi per Siswa ────────────────────────
function buildRekapAbsensiPDF(data, pageSize) {
  const { records, params } = data;
  const orient = 'landscape';
  const ps = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;

  const body = [
    [
      { text: 'No',       style: 'thdr', ...THDR_FILL },
      { text: 'NISN',     style: 'thdr', ...THDR_FILL },
      { text: 'Nama Siswa', style: 'thdr', ...THDR_FILL },
      { text: 'Kelas',    style: 'thdr', ...THDR_FILL },
      { text: 'Hadir',    style: 'thdr', ...THDR_FILL },
      { text: 'Sakit',    style: 'thdr', ...THDR_FILL },
      { text: 'Izin',     style: 'thdr', ...THDR_FILL },
      { text: 'Alpha',    style: 'thdr', ...THDR_FILL },
      { text: 'Terlambat', style: 'thdr', ...THDR_FILL },
      { text: 'Dispensasi', style: 'thdr', ...THDR_FILL },
      { text: 'Total',    style: 'thdr', ...THDR_FILL },
      { text: '% Hadir',  style: 'thdr', ...THDR_FILL },
    ],
    ...records.map((r, i) => {
      const total = r.total || 0;
      const pct   = total > 0 ? Math.round((r.hadir / total) * 100) : 0;
      const fill  = i % 2 === 1 ? STRIPE : {};
      return [
        { text: i + 1, style: 'cellCenter', ...fill },
        { text: r.siswa?.nisn || r.siswa?.nis || '-', style: 'cellCenter', ...fill },
        { text: r.siswa?.nama || '-', style: 'cell', ...fill },
        { text: r.siswa?.kelasHistori?.[0]?.kelas?.nama || '-', style: 'cell', ...fill },
        { text: r.hadir || 0, style: 'cellCenter', color: '#16a34a', bold: true, ...fill },
        { text: r.sakit || 0, style: 'cellCenter', ...fill },
        { text: r.izin  || 0, style: 'cellCenter', ...fill },
        { text: r.alpha || 0, style: 'cellCenter', color: r.alpha > 0 ? '#dc2626' : undefined, bold: r.alpha > 0, ...fill },
        { text: r.terlambat || 0, style: 'cellCenter', ...fill },
        { text: r.dispensasi || 0, style: 'cellCenter', ...fill },
        { text: total, style: 'cellCenter', bold: true, ...fill },
        { text: `${pct}%`, style: 'cellCenter', color: pct < 75 ? '#dc2626' : '#16a34a', bold: true, ...fill },
      ];
    }),
  ];

  return {
    pageSize: ps,
    pageOrientation: orient,
    pageMargins: [30, 50, 30, 50],
    footer: (cur, count) => ({ text: `Halaman ${cur} dari ${count}`, style: 'footer', margin: [0, 10] }),
    content: [
      ...kop(orient),
      { text: 'REKAP ABSENSI SISWA', style: 'judul' },
      { text: `Periode: ${params.tanggalMulai || '-'} s/d ${params.tanggalSelesai || '-'}`, style: 'subjudul' },
      {
        table: {
          headerRows: 1,
          widths: [20, 55, '*', 65, 30, 30, 25, 30, 45, 45, 30, 38],
          body,
        },
        layout: 'lightHorizontalLines',
      },
      { text: `Total: ${records.length} siswa`, style: 'note' },
      ttd(data.signer),
    ],
    styles: pdfStyles(),
  };
}

// ─── Builder: Rekap Absensi per Kelas ────────────────────────
function buildRekapKelasPDF(data, pageSize) {
  const { records, params } = data;
  const ps = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;

  const body = [
    [
      { text: 'No',      style: 'thdr', ...THDR_FILL },
      { text: 'Kelas',   style: 'thdr', ...THDR_FILL },
      { text: 'Jurusan', style: 'thdr', ...THDR_FILL },
      { text: 'Hadir',   style: 'thdr', ...THDR_FILL },
      { text: 'Sakit',   style: 'thdr', ...THDR_FILL },
      { text: 'Izin',    style: 'thdr', ...THDR_FILL },
      { text: 'Alpha',   style: 'thdr', ...THDR_FILL },
      { text: 'Terlambat', style: 'thdr', ...THDR_FILL },
      { text: 'Total',   style: 'thdr', ...THDR_FILL },
      { text: '% Hadir', style: 'thdr', ...THDR_FILL },
    ],
    ...records.map((r, i) => {
      const fill = i % 2 === 1 ? STRIPE : {};
      return [
        { text: i + 1, style: 'cellCenter', ...fill },
        { text: r.kelas?.nama || '-', style: 'cell', bold: true, ...fill },
        { text: r.kelas?.jurusan?.kode || '-', style: 'cellCenter', ...fill },
        { text: r.hadir || 0, style: 'cellCenter', color: '#16a34a', bold: true, ...fill },
        { text: r.sakit || 0, style: 'cellCenter', ...fill },
        { text: r.izin  || 0, style: 'cellCenter', ...fill },
        { text: r.alpha || 0, style: 'cellCenter', color: r.alpha > 0 ? '#dc2626' : undefined, bold: r.alpha > 0, ...fill },
        { text: r.terlambat || 0, style: 'cellCenter', ...fill },
        { text: r.total || 0, style: 'cellCenter', bold: true, ...fill },
        { text: `${r.persentaseHadir || 0}%`, style: 'cellCenter', color: (r.persentaseHadir || 0) < 75 ? '#dc2626' : '#16a34a', bold: true, ...fill },
      ];
    }),
  ];

  return {
    pageSize: ps,
    pageOrientation: 'landscape',
    pageMargins: [30, 50, 30, 50],
    footer: (cur, count) => ({ text: `Halaman ${cur} dari ${count}`, style: 'footer', margin: [0, 10] }),
    content: [
      ...kop('landscape'),
      { text: 'REKAP ABSENSI PER KELAS', style: 'judul' },
      { text: `Periode: ${params.tanggalMulai || '-'} s/d ${params.tanggalSelesai || '-'}`, style: 'subjudul' },
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 60, 35, 35, 30, 35, 50, 35, 42],
          body,
        },
        layout: 'lightHorizontalLines',
      },
      { text: `Total: ${records.length} kelas`, style: 'note' },
      ttd(data.signer),
    ],
    styles: pdfStyles(),
  };
}

// ─── Builder: Rekap Pelanggaran ───────────────────────────────
function buildRekapPelanggaranPDF(data, pageSize) {
  const { records, params } = data;
  const ps = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;

  const body = [
    [
      { text: 'No',       style: 'thdr', ...THDR_FILL },
      { text: 'NISN',     style: 'thdr', ...THDR_FILL },
      { text: 'Nama Siswa', style: 'thdr', ...THDR_FILL },
      { text: 'Kelas',    style: 'thdr', ...THDR_FILL },
      { text: 'Jenis Pelanggaran', style: 'thdr', ...THDR_FILL },
      { text: 'Poin',     style: 'thdr', ...THDR_FILL },
      { text: 'Tanggal',  style: 'thdr', ...THDR_FILL },
      { text: 'Keterangan', style: 'thdr', ...THDR_FILL },
    ],
    ...records.map((r, i) => {
      const fill = i % 2 === 1 ? STRIPE : {};
      return [
        { text: i + 1, style: 'cellCenter', ...fill },
        { text: r.siswa?.nisn || r.siswa?.nis || '-', style: 'cellCenter', ...fill },
        { text: r.siswa?.nama || '-', style: 'cell', ...fill },
        { text: r.kelas?.nama || '-', style: 'cell', ...fill },
        { text: r.jenisPelanggaran?.nama || '-', style: 'cell', ...fill },
        { text: r.poin || 0, style: 'cellCenter', color: (r.poin || 0) >= 25 ? '#dc2626' : '#f97316', bold: true, ...fill },
        { text: fmtDate(r.tanggal), style: 'cellCenter', ...fill },
        { text: r.keterangan || '-', style: 'cell', ...fill },
      ];
    }),
  ];

  return {
    pageSize: ps,
    pageOrientation: 'landscape',
    pageMargins: [30, 50, 30, 50],
    footer: (cur, count) => ({ text: `Halaman ${cur} dari ${count}`, style: 'footer', margin: [0, 10] }),
    content: [
      ...kop('landscape'),
      { text: 'REKAP PELANGGARAN SISWA', style: 'judul' },
      { text: `Periode: ${params?.tanggalMulai || '-'} s/d ${params?.tanggalSelesai || '-'}`, style: 'subjudul' },
      {
        table: {
          headerRows: 1,
          widths: [20, 55, '*', 65, 90, 28, 60, 80],
          body,
        },
        layout: 'lightHorizontalLines',
      },
      { text: `Total: ${records.length} pelanggaran`, style: 'note' },
      ttd(data.signer),
    ],
    styles: pdfStyles(),
  };
}

// ─── Builder: Surat ───────────────────────────────────────────
function buildSuratPDF(data) {
  const { surat, siswa } = data;
  return {
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 60],
    content: [
      ...kop('portrait'),
      { text: `Nomor: ${surat.nomor}`, margin: [0, 10, 0, 5] },
      { text: `Perihal: ${surat.perihal}`, margin: [0, 0, 0, 20] },
      { text: 'Kepada Yth.', margin: [0, 0, 0, 5] },
      { text: `Orang Tua/Wali Siswa\n${siswa.nama} (${siswa.nis})`, bold: true, margin: [0, 0, 0, 20] },
      {
        text: surat.isi || `Dengan hormat, bersama surat ini kami informasikan bahwa putra/putri Bapak/Ibu atas nama ${siswa.nama} (${siswa.nis}) telah mencapai akumulasi poin pelanggaran sebesar ${surat.totalPoin} poin.\n\nDemikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.`,
        margin: [0, 0, 0, 40],
      },
      ttd(data.signer, surat.tanggal),
    ],
    styles: pdfStyles(),
  };
}

// ─── Main export ─────────────────────────────────────────────
const generatePDF = async (data, pageSize = 'A4') => {
  let doc;
  switch (data.type) {
    case 'absensi':     doc = buildRekapAbsensiPDF(data, pageSize); break;
    case 'rekap-kelas': doc = buildRekapKelasPDF(data, pageSize);   break;
    case 'pelanggaran': doc = buildRekapPelanggaranPDF(data, pageSize); break;
    case 'surat':       doc = buildSuratPDF(data);                  break;
    default:
      doc = {
        pageSize: PAGE_SIZES[pageSize] || PAGE_SIZES.A4,
        content: [{ text: 'Laporan tidak dikenali', style: 'judul' }],
        styles: pdfStyles(),
      };
  }

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = PdfMake.createPdf(doc);
      pdfDoc.getBuffer((buf) => resolve(buf));
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePDF };
