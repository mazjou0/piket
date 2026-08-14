import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable } from '@/components/ui/Table';
import { FileDown, FileText, FileSpreadsheet, Printer, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, downloadBlob } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const REPORT_TYPES = [
  { key: 'absensi-siswa',  label: 'Absensi per Siswa',        exportType: 'absensi'     },
  { key: 'absensi-kelas',  label: 'Absensi per Kelas',        exportType: 'rekap-kelas' },
  { key: 'pelanggaran',    label: 'Rekapitulasi Pelanggaran',  exportType: 'pelanggaran' },
  { key: 'matriks',        label: 'Rekap Presensi Matriks',   exportType: null          },
  { key: 'tidak-hadir',    label: 'Rekap Tidak Hadir',        exportType: null          },
];

const PAGE_SIZES = [
  { value: 'A4', label: 'A4 (210×297 mm)' },
  { value: 'F4', label: 'F4 (215×330 mm)' },
];

export default function LaporanPage() {
  const { user } = useAuthStore();
  const [reportType,    setReportType]    = useState('absensi-siswa');
  const [tanggalMulai,  setTanggalMulai]  = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [kelasId,        setKelasId]       = useState('');
  const [pageSize,       setPageSize]      = useState('A4');
  const [exporting,      setExporting]     = useState(null);
  const [showSizeMenu,   setShowSizeMenu]  = useState(false);
  const [searchSiswa,    setSearchSiswa]   = useState('');

  // Data sekolah untuk TTD (best-effort, tidak blocking)
  const { data: sekolahInfo } = useQuery({
    queryKey: ['pengaturan-sekolah'],
    queryFn: () => api.get('/pengaturan/sekolah').then(r => r.data.data).catch(() => ({})),
  });

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const params = { tanggalMulai, tanggalSelesai, ...(kelasId && { kelasId }) };
  const currentType = REPORT_TYPES.find(t => t.key === reportType);

  const { data: rekapAbsensi,     isLoading: l1 } = useQuery({
    queryKey: ['rekap-absensi', params],
    queryFn: () => api.get('/laporan/rekap-absensi', { params }).then(r => r.data.data),
    enabled: reportType === 'absensi-siswa' && !!tanggalMulai && !!tanggalSelesai,
  });

  const { data: rekapKelas,       isLoading: l2 } = useQuery({
    queryKey: ['rekap-kelas', params],
    queryFn: () => api.get('/laporan/rekap-kelas', { params }).then(r => r.data.data),
    enabled: reportType === 'absensi-kelas' && !!tanggalMulai && !!tanggalSelesai,
  });

  const { data: rekapPelanggaran, isLoading: l3 } = useQuery({
    queryKey: ['rekap-pelanggaran', params],
    queryFn: () => api.get('/laporan/rekap-pelanggaran', { params }).then(r => r.data.data),
    enabled: reportType === 'pelanggaran' && !!tanggalMulai && !!tanggalSelesai,
  });

  // Query data matriks — detail absensi harian per siswa per kelas
  const { data: matriksData, isLoading: l4 } = useQuery({
    queryKey: ['rekap-matriks', params],
    queryFn: () => api.get('/laporan/rekap-absensi-detail', { params }).then(r => r.data.data),
    enabled: reportType === 'matriks' && !!tanggalMulai && !!tanggalSelesai && !!kelasId,
  });

  // Query rekap tidak hadir semua kelas — S/I/A/D per tanggal
  const { data: tidakHadirData, isLoading: l5 } = useQuery({
    queryKey: ['rekap-tidak-hadir', params],
    queryFn: () => api.get('/laporan/rekap-tidak-hadir', { params }).then(r => r.data.data),
    enabled: reportType === 'tidak-hadir' && !!tanggalMulai && !!tanggalSelesai,
  });
  // Ekstrak siswa dan tanggal dari response
  const tidakHadirSiswa   = tidakHadirData?.siswa   || [];
  const tidakHadirTanggal = tidakHadirData?.tanggal || [];

  const currentData = reportType === 'absensi-siswa' ? rekapAbsensi
                    : reportType === 'absensi-kelas' ? rekapKelas
                    : reportType === 'matriks'       ? matriksData
                    : reportType === 'tidak-hadir'   ? tidakHadirData
                    : rekapPelanggaran;
  const isLoading   = l1 || l2 || l3 || l4 || l5;

  // Filter absensi per siswa berdasarkan nama / NIS / NISN
  const filteredAbsensi = rekapAbsensi?.filter(r => {
    if (!searchSiswa) return true;
    const q = searchSiswa.toLowerCase();
    return (
      r.siswa?.nama?.toLowerCase().includes(q) ||
      (r.siswa?.nis  || '').includes(searchSiswa) ||
      (r.siswa?.nisn || '').includes(searchSiswa)
    );
  });

  const displayData = reportType === 'absensi-siswa' ? (filteredAbsensi ?? rekapAbsensi)
                    : reportType === 'absensi-kelas' ? rekapKelas
                    : rekapPelanggaran;

  // ── Export Excel / CSV dari backend ─────────────────────
  const handleExport = async (format) => {
    if (!currentData?.length) { toast.error('Tidak ada data untuk diekspor'); return; }
    setExporting(format);
    try {
      const res = await api.get(`/laporan/export/${format}`, {
        params: { type: currentType.exportType, ...params },
        responseType: 'blob',
      });
      const ext  = format === 'excel' ? 'xlsx' : 'csv';
      downloadBlob(res.data, `laporan-${currentType.exportType}-${tanggalMulai}.${ext}`);
      toast.success(`Export ${format.toUpperCase()} berhasil!`);
    } catch {
      toast.error(`Export ${format} gagal`);
    } finally {
      setExporting(null);
    }
  };

  // ── Print / Export PDF — client-side, ringan ─────────────
  const handlePrint = () => {
    if (!currentData?.length) { toast.error('Tidak ada data untuk diprint'); return; }

    const schoolName = sekolahInfo?.nama   || 'SMKN 1 Kras';
    const schoolAddr = sekolahInfo?.alamat || 'Jl. Raya Kras, Kediri, Jawa Timur';
    const schoolPhone= sekolahInfo?.telepon|| '';
    const signerName = user?.nama || user?.username || '';
    const signerNip  = user?.nip  || '';
    const signerRole = user?.role === 'PETUGAS_PIKET' ? 'Petugas Piket,'
                     : user?.role === 'ADMIN'          ? 'Administrator,'
                     : 'Kepala Sekolah,';

    const period     = `${tanggalMulai} s/d ${tanggalSelesai}`;
    const title      = currentType?.label || 'Laporan';
    const psSize     = pageSize === 'F4' ? '215.9mm 330.2mm' : '210mm 297mm';
    const today      = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Build tabel HTML
    let thead = '', tbody = '';

    if (reportType === 'absensi-siswa') {
      thead = `<tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>Kelas</th><th>H</th><th>S</th><th>I</th><th>A</th><th>D</th><th>T</th><th>PC</th><th>DN</th><th>L</th><th>Total</th><th>%</th></tr>`;
      tbody = currentData.map((r, i) => {
        const t = r.total || 0;
        const p = t > 0 ? Math.round((r.hadir / t) * 100) : 0;
        return `<tr>
          <td class="c">${i+1}</td>
          <td class="c mono">${r.siswa?.nisn||r.siswa?.nis||'-'}</td>
          <td>${r.siswa?.nama||'-'}</td>
          <td>${r.siswa?.kelasHistori?.[0]?.kelas?.nama||'-'}</td>
          <td class="c g b">${r.hadir||0}</td>
          <td class="c">${r.sakit||0}</td>
          <td class="c">${r.izin||0}</td>
          <td class="c ${(r.alpha||0)>0?'r':''}">${r.alpha||0}</td>
          <td class="c tl">${r.dispensasi||0}</td>
          <td class="c o">${r.terlambat||0}</td>
          <td class="c">${r.pulangCepat||0}</td>
          <td class="c">${r.dinas||0}</td>
          <td class="c">${r.lainnya||0}</td>
          <td class="c b">${t}</td>
          <td class="c ${p<75?'r':'g'} b">${p}%</td>
        </tr>`;
      }).join('');
    } else if (reportType === 'absensi-kelas') {
      thead = `<tr><th>No</th><th>Kelas</th><th>Jurusan</th><th>H</th><th>S</th><th>I</th><th>A</th><th>D</th><th>T</th><th>PC</th><th>DN</th><th>L</th><th>Total</th><th>% Hadir</th></tr>`;
      tbody = currentData.map((r, i) => {
        const p = r.persentaseHadir || 0;
        return `<tr>
          <td class="c">${i+1}</td>
          <td class="b">${r.kelas?.nama||'-'}</td>
          <td class="c">${r.kelas?.jurusan?.kode||'-'}</td>
          <td class="c g b">${r.hadir||0}</td>
          <td class="c">${r.sakit||0}</td>
          <td class="c">${r.izin||0}</td>
          <td class="c ${(r.alpha||0)>0?'r':''}">${r.alpha||0}</td>
          <td class="c tl">${r.dispensasi||0}</td>
          <td class="c o">${r.terlambat||0}</td>
          <td class="c">${r.pulangCepat||0}</td>
          <td class="c">${r.dinas||0}</td>
          <td class="c">${r.lainnya||0}</td>
          <td class="c b">${r.total||0}</td>
          <td class="c ${p<75?'r':'g'} b">${p}%</td>
        </tr>`;
      }).join('');
    } else {
      thead = `<tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>Kelas</th><th>Jenis Pelanggaran</th><th>Poin</th><th>Tanggal</th></tr>`;
      tbody = currentData.map((r, i) => {
        const p = r.poin || 0;
        return `<tr>
          <td class="c">${i+1}</td>
          <td class="c mono">${r.siswa?.nisn||r.siswa?.nis||'-'}</td>
          <td>${r.siswa?.nama||'-'}</td>
          <td>${r.kelas?.nama||'-'}</td>
          <td>${r.jenisPelanggaran?.nama||'-'}</td>
          <td class="c ${p>=25?'r':p>=10?'o':''} b">${p}</td>
          <td class="c mono">${r.tanggal?new Date(r.tanggal).toLocaleDateString('id-ID'):'-'}</td>
        </tr>`;
      }).join('');
    }

    const html = `<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8"/>
    <title>Laporan ${title}</title>
    <style>
      @page { size: ${psSize}; margin: 12mm 10mm 15mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
      .kop { text-align: center; border-bottom: 2.5px solid #1e293b; padding-bottom: 7px; margin-bottom: 8px; }
      .kop-nama { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; }
      .kop-sub  { font-size: 8.5px; color: #555; margin-top: 2px; }
      .judul    { font-size: 12px; font-weight: 700; text-align: center; margin: 6px 0 2px; text-transform: uppercase; }
      .period   { font-size: 9px; text-align: center; color: #555; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; }
      th { background: #1e293b; color: #fff; font-weight: 700; padding: 4px 5px; text-align: center; border: 0.5px solid #64748b; }
      td { padding: 3px 5px; border: 0.5px solid #cbd5e1; vertical-align: middle; }
      tr:nth-child(even) td { background: #f8fafc; }
      .c    { text-align: center; }
      .b    { font-weight: 700; }
      .mono { font-family: monospace; }
      .g    { color: #16a34a; }
      .r    { color: #dc2626; }
      .o    { color: #f97316; }
      .tl   { color: #0d9488; }
      .note { font-size: 8px; color: #64748b; font-style: italic; margin-top: 5px; }
      .legend { font-size: 8px; color: #64748b; margin-top: 4px; }
      .ttd  { display: flex; justify-content: flex-end; margin-top: 18px; }
      .ttd-box { text-align: center; min-width: 180px; line-height: 1.8; }
      .ttd-name { font-weight: 700; font-size: 10px; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style></head><body>
    <div class="kop">
      <div class="kop-nama">${schoolName}</div>
      <div class="kop-sub">${schoolAddr}${schoolPhone ? ' • Telp. '+schoolPhone : ''}</div>
    </div>
    <div class="judul">Rekap ${title}</div>
    <div class="period">Periode: ${period}</div>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
    <p class="note">Total: ${currentData.length} data | Dicetak: ${new Date().toLocaleString('id-ID')}</p>
    ${reportType !== 'pelanggaran' ? `<p class="legend">Keterangan: H=Hadir · S=Sakit · I=Izin · A=Alpha · D=Dispensasi · T=Terlambat · PC=Pulang Cepat · DN=Dinas/PKL · L=Lainnya</p>` : ''}
    <div class="ttd"><div class="ttd-box">
      Kras, ${today}<br/>
      ${signerRole}<br/><br/><br/>
      <div class="ttd-name">${signerName || '___________________________'}</div>
      ${signerNip ? `NIP. ${signerNip}` : ''}
    </div></div>
    </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast.error('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.'); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  // ── Print rekap 1 siswa (seluruh riwayat absensi) ───────
  const handlePrintSiswa = async (r, overrideMulai, overrideSelesai) => {
    // Gunakan override jika ada (tombol ∞), otherwise pakai filter aktif
    const periodeFrom = overrideMulai  || tanggalMulai;
    const periodeTo   = overrideSelesai || tanggalSelesai;

    const schoolName = sekolahInfo?.nama    || 'SMKN 1 Kras';
    const schoolAddr = sekolahInfo?.alamat  || 'Jl. Raya Kras, Kediri, Jawa Timur';
    const schoolPhone= sekolahInfo?.telepon || '';
    const signerName = user?.nama || user?.username || '';
    const signerNip  = user?.nip  || '';
    const today      = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const psSize     = pageSize === 'F4' ? '215.9mm 330.2mm' : '210mm 297mm';

    // Format label periode yang ramah dibaca
    const fmtTgl = (s) => {
      if (!s) return '-';
      const d = new Date(s);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const periodeLabel = `${fmtTgl(periodeFrom)} s/d ${fmtTgl(periodeTo)}`;

    // Ambil rekap agregat untuk periode yang dipilih
    let rekapData = r; // default pakai data yang sudah ada di tabel
    let detail    = [];

    try {
      // Jika periode berbeda dari filter aktif, fetch ulang rekap
      if (overrideMulai || overrideSelesai) {
        const rekapRes = await api.get('/laporan/rekap-absensi', {
          params: { tanggalMulai: periodeFrom, tanggalSelesai: periodeTo },
        });
        const allRekap = rekapRes.data?.data || [];
        const found = allRekap.find(x => x.siswa?.id === r.siswa?.id);
        if (found) rekapData = found;
      }

      // Ambil detail absensi harian siswa dalam rentang periode
      const raw = await api.get('/absensi/riwayat/siswa/' + r.siswa?.id, {
        params: { limit: 2000 },
      });
      const semua = raw.data?.data || [];
      // Filter manual berdasarkan rentang periode
      detail = semua.filter(d => {
        const tgl = new Date(d.tanggal);
        return tgl >= new Date(periodeFrom) && tgl <= new Date(periodeTo);
      });
      // Urutkan dari terlama ke terbaru
      detail.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    } catch (_) {}

    const t = rekapData.total || 0;
    const p = t > 0 ? Math.round(((rekapData.hadir||0) / t) * 100) : 0;

    // Baris detail — sekarang dirender langsung di template HTML

    const html = `<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8"/><title>Laporan Absensi ${r.siswa?.nama||''}</title>
    <style>
      @page { size: ${psSize}; margin: 15mm 15mm 20mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #1a1a1a; background: #fff; }

      /* KOP SURAT */
      .kop { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #1e293b; padding-bottom: 8px; margin-bottom: 4px; }
      .kop-logo { width: 52px; height: 52px; flex-shrink: 0; }
      .kop-text { flex: 1; text-align: center; }
      .kop-sekolah { font-size: 15pt; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
      .kop-alamat  { font-size: 8pt; color: #444; margin-top: 2px; }
      .kop-garis   { border-top: 1px solid #64748b; margin-top: 4px; padding-top: 2px; font-size: 7.5pt; color: #888; }

      /* JUDUL */
      .judul-wrap { text-align: center; margin: 10px 0 8px; }
      .judul { font-size: 12pt; font-weight: 900; letter-spacing: 1px; text-decoration: underline; text-underline-offset: 3px; }
      .judul-sub { font-size: 9pt; color: #475569; margin-top: 2px; }

      /* INFO SISWA — dua kolom seperti surat resmi */
      .info-wrap { border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 10px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; }
      .info-row  { display: flex; gap: 0; font-size: 9.5pt; line-height: 1.8; }
      .info-key  { min-width: 90px; color: #475569; }
      .info-sep  { width: 14px; text-align: center; }
      .info-val  { font-weight: 600; }
      .pct-ok    { color: #16a34a; font-weight: 800; }
      .pct-low   { color: #dc2626; font-weight: 800; }

      /* REKAP TABEL VERTIKAL */
      .rekap-wrap { margin-bottom: 10px; }
      .rekap-title { font-size: 9pt; font-weight: 700; margin-bottom: 4px; color: #334155; border-left: 3px solid #1e293b; padding-left: 6px; }
      .rekap-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
      .rekap-table th { background: #1e293b; color: #fff; padding: 5px 10px; text-align: left; font-weight: 700; border: 0.5px solid #64748b; }
      .rekap-table th.r { text-align: right; }
      .rekap-table td { padding: 4px 10px; border: 0.5px solid #cbd5e1; }
      .rekap-table td.r { text-align: right; font-weight: 700; }
      .rekap-table tr.total-row td { background: #f1f5f9; font-weight: 800; border-top: 1.5px solid #94a3b8; }
      .rekap-table tr.pct-row  td { background: #f8fafc; font-size: 9pt; }
      .rekap-table tr:nth-child(even) td { background: #f8fafc; }
      .rekap-table tr.total-row td:first-child,
      .rekap-table tr.pct-row  td:first-child { font-weight: 700; color: #334155; }

      /* TABEL DETAIL */
      .detail-title { font-size: 9pt; font-weight: 700; margin: 10px 0 4px; color: #334155; border-left: 3px solid #1e293b; padding-left: 6px; }
      table.detail { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
      table.detail th { background: #1e293b; color: #fff; font-weight: 700; padding: 4px 6px; text-align: center; border: 0.5px solid #64748b; }
      table.detail td { padding: 3px 6px; border: 0.5px solid #cbd5e1; }
      table.detail tr:nth-child(even) td { background: #f8fafc; }
      .c { text-align: center; }
      .mono { font-family: monospace; }

      /* TANDA TANGAN */
      .ttd-wrap { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
      .ttd-left { font-size: 8.5pt; color: #475569; max-width: 55%; line-height: 1.7; }
      .ttd-right { text-align: center; min-width: 180px; font-size: 9pt; line-height: 1.8; }
      .ttd-name { font-weight: 800; font-size: 9.5pt; text-decoration: underline; text-underline-offset: 2px; }
      .ttd-nip { font-size: 8.5pt; color: #475569; }

      .footer-note { font-size: 7.5pt; color: #94a3b8; text-align: center; margin-top: 12px; border-top: 0.5px solid #e2e8f0; padding-top: 5px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>

    <!-- KOP SURAT -->
    <div class="kop">
      <div class="kop-text">
        <div class="kop-sekolah">${schoolName}</div>
        <div class="kop-alamat">${schoolAddr}${schoolPhone ? ' &bull; Telp. '+schoolPhone : ''}</div>
      </div>
    </div>

    <!-- JUDUL -->
    <div class="judul-wrap">
      <div class="judul">LAPORAN ABSENSI SISWA</div>
      <div class="judul-sub">Periode: ${periodeLabel}</div>
    </div>

    <!-- INFO SISWA -->
    <div class="info-wrap">
      <div class="info-grid">
        <div>
          <div class="info-row"><span class="info-key">Nama Siswa</span><span class="info-sep">:</span><span class="info-val">${r.siswa?.nama||'-'}</span></div>
          <div class="info-row"><span class="info-key">NIS</span><span class="info-sep">:</span><span class="info-val mono">${r.siswa?.nis||'-'}</span></div>
          <div class="info-row"><span class="info-key">NISN</span><span class="info-sep">:</span><span class="info-val mono">${r.siswa?.nisn||'-'}</span></div>
          <div class="info-row"><span class="info-key">Kelas</span><span class="info-sep">:</span><span class="info-val">${r.siswa?.kelasHistori?.[0]?.kelas?.nama||'-'}</span></div>
        </div>
        <div>
          <div class="info-row"><span class="info-key">Periode</span><span class="info-sep">:</span><span class="info-val">${periodeLabel}</span></div>
          <div class="info-row"><span class="info-key">Total Hari</span><span class="info-sep">:</span><span class="info-val">${rekapData.total||0} hari</span></div>
          <div class="info-row"><span class="info-key">% Kehadiran</span><span class="info-sep">:</span><span class="${p<75?'pct-low':'pct-ok'}">${p}%</span></div>
          <div class="info-row"><span class="info-key">Dicetak</span><span class="info-sep">:</span><span>${today}</span></div>
        </div>
      </div>
    </div>

    <!-- REKAP VERTIKAL -->
    <div class="rekap-wrap">
      <div class="rekap-title">Rekapitulasi Kehadiran</div>
      <table class="rekap-table">
        <thead>
          <tr><th style="width:50%">Keterangan</th><th class="r" style="width:25%">Jumlah Hari</th><th class="r" style="width:25%">Persentase</th></tr>
        </thead>
        <tbody>
          ${[
            {l:'Hadir',         v:rekapData.hadir||0,        c:'#16a34a'},
            {l:'Sakit',         v:rekapData.sakit||0,        c:'#d97706'},
            {l:'Izin',          v:rekapData.izin||0,         c:'#1d4ed8'},
            {l:'Alpha (Tanpa Keterangan)', v:rekapData.alpha||0, c:'#dc2626'},
            {l:'Dispensasi',    v:rekapData.dispensasi||0,   c:'#0e7490'},
            {l:'Terlambat',     v:rekapData.terlambat||0,    c:'#c2410c'},
            {l:'Pulang Cepat',  v:rekapData.pulangCepat||0,  c:'#be185d'},
            {l:'Dinas / PKL',   v:rekapData.dinas||0,        c:'#7c3aed'},
            {l:'Lainnya',       v:rekapData.lainnya||0,      c:'#475569'},
          ].map(x => {
            const pct = rekapData.total > 0 ? ((x.v / rekapData.total)*100).toFixed(1) : '0.0';
            return `<tr>
              <td style="color:${x.c}">${x.l}</td>
              <td class="r">${x.v}</td>
              <td class="r">${pct}%</td>
            </tr>`;
          }).join('')}
          <tr class="total-row">
            <td>TOTAL</td>
            <td class="r">${rekapData.total||0}</td>
            <td class="r">100%</td>
          </tr>
          <tr class="pct-row">
            <td>Persentase Kehadiran</td>
            <td class="r" colspan="2" style="color:${p<75?'#dc2626':'#16a34a'};font-size:10pt">${p}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- DETAIL HARIAN -->
    ${detail.length > 0 ? `
    <div class="detail-title">Detail Absensi Harian (${detail.length} catatan)</div>
    <table class="detail">
      <thead>
        <tr><th style="width:6%">No</th><th style="width:22%">Tanggal</th><th style="width:12%">Sesi</th><th style="width:18%">Status</th><th>Keterangan</th></tr>
      </thead>
      <tbody>
        ${detail.map((d, i) => {
          const statusColor = d.status==='HADIR'?'#16a34a' : d.status==='ALPHA'?'#dc2626' : d.status==='SAKIT'?'#d97706' : d.status==='TERLAMBAT'?'#c2410c' : d.status==='IZIN'?'#1d4ed8' : '#475569';
          const tgl = d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'}) : '-';
          return `<tr>
            <td class="c">${i+1}</td>
            <td>${tgl}</td>
            <td class="c">${d.sesi||'-'}</td>
            <td class="c" style="color:${statusColor};font-weight:700">${d.status||'-'}</td>
            <td>${d.keterangan||'-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : `<p style="font-size:8.5pt;color:#64748b;margin-top:8px;font-style:italic;">Tidak ada data detail absensi pada periode ini.</p>`}

    <!-- TANDA TANGAN -->
    <div class="ttd-wrap">
      <div class="ttd-left">
        Catatan:<br/>
        H = Hadir &nbsp;·&nbsp; S = Sakit &nbsp;·&nbsp; I = Izin &nbsp;·&nbsp; A = Alpha<br/>
        D = Dispensasi &nbsp;·&nbsp; T = Terlambat &nbsp;·&nbsp; PC = Pulang Cepat<br/>
        DN = Dinas/PKL &nbsp;·&nbsp; L = Lainnya
      </div>
      <div class="ttd-right">
        Kras, ${today}<br/>
        Mengetahui,<br/><br/><br/><br/>
        <div class="ttd-name">${signerName || '___________________________'}</div>
        ${signerNip ? `<div class="ttd-nip">NIP. ${signerNip}</div>` : ''}
      </div>
    </div>

    <div class="footer-note">Dokumen ini dicetak dari Sistem Informasi Presensi &amp; Karakter (SIPAKAR) &mdash; ${schoolName}</div>
    </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast.error('Pop-up diblokir browser.'); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };
  const absensiCols = [
    { header: 'No',   cell: (_, i) => i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    { header: 'NIS',  cell: r => <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--color-muted)' }}>{r.siswa?.nis}</span> },
    { header: 'NISN', cell: r => <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--color-muted)' }}>{r.siswa?.nisn || '—'}</span> },
    { header: 'Nama', cell: r => <span style={{ fontWeight:600 }}>{r.siswa?.nama}</span> },
    { header: 'Kelas',cell: r => <span style={{ fontSize:12 }}>{r.siswa?.kelasHistori?.[0]?.kelas?.nama || '—'}</span> },
    { header: 'H',  cell: r => <span style={{ color:'#22c55e', fontWeight:700 }}>{r.hadir||0}</span>,           cellClass:'text-center', headerClass:'text-center' },
    { header: 'S',  cell: r => <span style={{ color:'#f59e0b' }}>{r.sakit||0}</span>,                          cellClass:'text-center', headerClass:'text-center' },
    { header: 'I',  cell: r => <span style={{ color:'#3b82f6' }}>{r.izin||0}</span>,                           cellClass:'text-center', headerClass:'text-center' },
    { header: 'A',  cell: r => <span style={{ color:'#ef4444', fontWeight:700 }}>{r.alpha||0}</span>,          cellClass:'text-center', headerClass:'text-center' },
    { header: 'D',  cell: r => <span style={{ color:'#14b8a6' }}>{r.dispensasi||0}</span>,                     cellClass:'text-center', headerClass:'text-center' },
    { header: 'T',  cell: r => <span style={{ color:'#f97316' }}>{r.terlambat||0}</span>,                      cellClass:'text-center', headerClass:'text-center' },
    { header: 'PC', cell: r => <span style={{ color:'#a78bfa' }}>{r.pulangCepat||0}</span>,                    cellClass:'text-center', headerClass:'text-center' },
    { header: 'DN', cell: r => <span style={{ color:'#8b5cf6' }}>{r.dinas||0}</span>,                          cellClass:'text-center', headerClass:'text-center' },
    { header: 'L',  cell: r => <span style={{ color:'var(--color-muted)' }}>{r.lainnya||0}</span>,             cellClass:'text-center', headerClass:'text-center' },
    { header: 'Total', cell: r => <span style={{ fontWeight:700 }}>{r.total||0}</span>,                        cellClass:'text-center', headerClass:'text-center' },
    {
      header: '%Hadir',
      cell: r => { const p = r.total > 0 ? Math.round((r.hadir/r.total)*100) : 0; return <span style={{ fontWeight:700, color:p<75?'#ef4444':'#22c55e' }}>{p}%</span>; },
      cellClass: 'text-center', headerClass: 'text-center',
    },
    {
      header: 'Print',
      cell: r => (
        <div style={{ display:'flex', gap:3, justifyContent:'center' }}>
          <button
            onClick={() => handlePrintSiswa(r)}
            title={`Print periode ${tanggalMulai} s/d ${tanggalSelesai}`}
            className="btn btn-ghost btn-icon"
            style={{ color: 'var(--color-primary)', padding: '3px 6px', fontSize: 11 }}
          >
            <Printer style={{ width: 13, height: 13 }} />
          </button>
          <button
            onClick={() => {
              // Print sejak tanggal masuk siswa hingga hari ini
              const masuk = r.siswa?.tanggalMasuk
                ? new Date(r.siswa.tanggalMasuk).toISOString().split('T')[0]
                : `${new Date().getFullYear()-3}-07-01`;
              const today = new Date().toISOString().split('T')[0];
              handlePrintSiswa(r, masuk, today);
            }}
            title="Print seluruh riwayat sejak masuk"
            className="btn btn-ghost btn-icon"
            style={{ color: '#4ade80', padding: '3px 6px', fontSize: 10 }}
          >
            ∞
          </button>
        </div>
      ),
      headerClass: 'text-center w-14', cellClass: 'text-center',
    },
  ];

  const kelasCols = [
    { header: 'No',
      cell: (_, i) => i + 1,
      headerClass: 'text-center', cellClass: 'text-center',
      headerStyle: { width: 40, minWidth: 40 } },
    { header: 'Kelas',
      cell: r => <span style={{ fontWeight:600, fontSize:12 }}>{r.kelas?.nama}</span>,
      headerStyle: { width: 140, minWidth: 100, maxWidth: 160 } },
    { header: 'Jurusan',
      cell: r => <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--color-primary)' }}>{r.kelas?.jurusan?.kode}</span>,
      cellClass: 'text-center', headerClass: 'text-center',
      headerStyle: { width: 60, minWidth: 55 } },
    { header: 'H',  cell: r => <span style={{ color:'#22c55e', fontWeight:700 }}>{r.hadir||0}</span>,    cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:42, minWidth:42 } },
    { header: 'S',  cell: r => <span style={{ color:'#f59e0b' }}>{r.sakit||0}</span>,                   cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:42, minWidth:42 } },
    { header: 'I',  cell: r => <span style={{ color:'#3b82f6' }}>{r.izin||0}</span>,                    cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:42, minWidth:42 } },
    { header: 'A',  cell: r => <span style={{ color:'#ef4444', fontWeight:700 }}>{r.alpha||0}</span>,   cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:42, minWidth:42 } },
    { header: 'D',  cell: r => <span style={{ color:'#14b8a6' }}>{r.dispensasi||0}</span>,              cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:42, minWidth:42 } },
    { header: 'T',  cell: r => <span style={{ color:'#f97316' }}>{r.terlambat||0}</span>,               cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:42, minWidth:42 } },
    { header: 'PC', cell: r => <span style={{ color:'#a78bfa' }}>{r.pulangCepat||0}</span>,             cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:44, minWidth:44 } },
    { header: 'DN', cell: r => {
        if (!r.dinas) return <span style={{ color:'var(--color-muted)' }}>0</span>;
        return (
          <div style={{ textAlign:'center' }}>
            <span style={{ color:'#8b5cf6', fontWeight:700, display:'block' }}>{r.dinas}</span>
            {r.dinasPerSiswa > 0 && (
              <span style={{ fontSize:9, color:'var(--color-muted)' }} title={`${r.dinasTotal} total (${r.jumlahSiswa}s×${r.dinasPerSiswa}h)`}>
                {r.jumlahSiswa}s×{r.dinasPerSiswa}h
              </span>
            )}
          </div>
        );
      }, cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:52, minWidth:52 } },
    { header: 'L',  cell: r => <span style={{ color:'var(--color-muted)' }}>{r.lainnya||0}</span>,      cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:42, minWidth:42 } },
    { header: 'Total',
      cell: r => <span style={{ fontWeight:700 }}>{r.total||0}</span>,
      cellClass:'text-center', headerClass:'text-center', headerStyle:{ width:52, minWidth:52 } },
    {
      header: '%Hadir',
      cell: r => <span style={{ fontWeight:700, color:(r.persentaseHadir||0)<75?'#ef4444':'#22c55e' }}>{r.persentaseHadir||0}%</span>,
      cellClass: 'text-center', headerClass: 'text-center', headerStyle:{ width:60, minWidth:60 },
    },
  ];

  const pelanggaranCols = [
    { header: 'No',    cell: (_, i) => i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    { header: 'Siswa', cell: r => <div><p style={{ fontWeight:600, margin:0 }}>{r.siswa?.nama}</p><p style={{ fontSize:11, color:'var(--color-muted)', fontFamily:'monospace', margin:0 }}>{r.siswa?.nis}</p></div> },
    { header: 'Kelas', cell: r => <span style={{ fontSize:12 }}>{r.kelas?.nama}</span> },
    { header: 'Jenis Pelanggaran', cell: r => <span style={{ fontSize:12 }}>{r.jenisPelanggaran?.nama}</span> },
    { header: 'Poin',  cell: r => <span style={{ color:'#ef4444', fontWeight:700 }}>{r.poin||0}</span>, cellClass:'text-center', headerClass:'text-center' },
    { header: 'Tanggal', cell: r => <span style={{ fontFamily:'monospace', fontSize:12 }}>{formatDate(r.tanggal,'dd/MM/yyyy')}</span> },
  ];

  const currentCols = reportType === 'absensi-siswa' ? absensiCols
                    : reportType === 'absensi-kelas' ? kelasCols
                    : pelanggaranCols;

  // ── Print Matriks Presensi ────────────────────────────────
  const handlePrintMatriks = () => {
    if (!matriksData?.siswa?.length) { toast.error('Tidak ada data. Pastikan sudah pilih kelas.'); return; }

    const schoolName  = sekolahInfo?.nama    || 'SMKN 1 Kras';
    const schoolAddr  = sekolahInfo?.alamat  || 'Jl. Raya Kras, Kediri, Jawa Timur';
    const schoolPhone = sekolahInfo?.telepon || '';
    const psSize      = pageSize === 'F4' ? '330.2mm 215.9mm' : '297mm 210mm'; // landscape
    const today       = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const signerName  = user?.nama || user?.username || '';
    const signerNip   = user?.nip  || '';
    const namaKelas   = kelasList?.find(k => k.id === kelasId)?.nama || '';
    const period      = `${tanggalMulai} s/d ${tanggalSelesai}`;
    const tahunAwal   = new Date(tanggalMulai).getFullYear();
    const tahunAkhir  = new Date(tanggalSelesai).getFullYear();

    const siswaList   = matriksData.siswa;
    const tanggalList = matriksData.tanggal;

    // Bulan terakhir = bulan dari tanggal selesai
    const bulanAkhir  = new Date(tanggalSelesai).getMonth();
    const tahunAkhirN = new Date(tanggalSelesai).getFullYear();
    const namaBulan   = new Date(tanggalSelesai).toLocaleString('id-ID', { month:'long' });

    // Tanggal yang termasuk bulan terakhir
    const tanggalBulanIni = tanggalList.filter(t => {
      const d = new Date(t);
      return d.getMonth() === bulanAkhir && d.getFullYear() === tahunAkhirN;
    });

    const ST = {
      HADIR:       { lbl:'H',  bg:'#dcfce7', color:'#16a34a' },
      SAKIT:       { lbl:'S',  bg:'#fef9c3', color:'#b45309' },
      IZIN:        { lbl:'I',  bg:'#dbeafe', color:'#1d4ed8' },
      ALPHA:       { lbl:'A',  bg:'#fee2e2', color:'#dc2626' },
      TERLAMBAT:   { lbl:'T',  bg:'#ffedd5', color:'#c2410c' },
      DISPENSASI:  { lbl:'D',  bg:'#ede9fe', color:'#7c3aed' },
      PULANG_CEPAT:{ lbl:'PC', bg:'#fce7f3', color:'#be185d' },
      DINAS:       { lbl:'DN', bg:'#cffafe', color:'#0e7490' },
      LAINNYA:     { lbl:'L',  bg:'#f1f5f9', color:'#475569' },
    };

    const fmtTgl  = s => { const d=new Date(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };
    const fmtHari = s => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][new Date(s).getDay()];

    // Helper: cell rekap angka
    const tdRekap = (val, color, bg, stripe) =>
      `<td style="width:14px;text-align:center;border:0.5px solid #cbd5e1;background:${val?(bg||stripe):stripe};font-size:7px;color:${color};font-weight:700;padding:1px 0">${val||''}</td>`;

    // Header kolom tanggal
    const thTgl = tanggalList.map(t => {
      const isMinggu = new Date(t).getDay() === 0;
      const bg = isMinggu ? '#334155' : '#1e293b';
      return `<th style="width:14px;min-width:14px;padding:0;background:${bg};color:#fff;border:0.5px solid #475569;text-align:center">
        <div style="writing-mode:vertical-lr;transform:rotate(180deg);padding:2px 0;line-height:1.1;font-size:6px">${fmtHari(t)}<br/>${fmtTgl(t)}</div>
      </th>`;
    }).join('');

    // Baris tiap siswa
    const rows = siswaList.map((item, idx) => {
      const map = {};
      (item.absensi||[]).forEach(a => { map[a.tanggal?.split?.('T')[0]||a.tanggal] = a.status; });

      // Rekap SEMESTER (semua tanggal)
      let sH=0,sS=0,sI=0,sA=0,sT=0,sD=0;
      Object.values(map).forEach(s => {
        if(s==='HADIR') sH++;
        else if(s==='SAKIT') sS++;
        else if(s==='IZIN') sI++;
        else if(s==='ALPHA') sA++;
        else if(s==='TERLAMBAT') sT++;
        else if(s==='DISPENSASI') sD++;
      });
      const sTotal = sS + sI + sA + sD;

      // Rekap BULAN TERAKHIR
      let bS=0,bI=0,bA=0,bD=0,bT=0;
      tanggalBulanIni.forEach(t => {
        const st = map[t];
        if(st==='SAKIT') bS++;
        else if(st==='IZIN') bI++;
        else if(st==='ALPHA') bA++;
        else if(st==='DISPENSASI') bD++;
        else if(st==='TERLAMBAT') bT++;
      });
      const bTotal = bS + bI + bA + bD;

      // Sel grid harian
      const cells = tanggalList.map(t => {
        const st = map[t];
        const cfg = st ? ST[st] : null;
        if (!st)          return `<td style="width:14px;min-width:14px;padding:0;border:0.5px solid #e2e8f0;background:#f8fafc"></td>`;
        if (st==='HADIR') return `<td style="width:14px;min-width:14px;padding:0;border:0.5px solid #e2e8f0;background:#dcfce7"></td>`;
        return `<td style="width:14px;min-width:14px;padding:0;border:0.5px solid #e2e8f0;background:${cfg?.bg};text-align:center;font-size:6px;color:${cfg?.color};font-weight:700">${cfg?.lbl}</td>`;
      }).join('');

      const stripe = idx%2===1 ? '#f8fafc' : '#fff';
      return `<tr>
        <td style="width:20px;padding:1px 2px;border:0.5px solid #e2e8f0;text-align:center;background:${stripe};font-size:7px">${idx+1}</td>
        <td style="width:150px;padding:1px 4px;border:0.5px solid #e2e8f0;background:${stripe};font-size:7.5px;font-weight:600;white-space:nowrap;overflow:hidden">${item.siswa?.nama||'-'}</td>
        ${tdRekap(sH,'#16a34a','',stripe)}
        ${tdRekap(sS,'#b45309','#fef9c3',stripe)}
        ${tdRekap(sI,'#1d4ed8','#dbeafe',stripe)}
        ${tdRekap(sA,'#dc2626','#fee2e2',stripe)}
        ${tdRekap(sD,'#7c3aed','#ede9fe',stripe)}
        ${tdRekap(sTotal,'#1e293b','#e2e8f0',stripe)}
        <td style="width:4px;background:#94a3b8;border:none;padding:0"></td>
        ${tdRekap(bS,'#b45309','#fef9c3',stripe)}
        ${tdRekap(bI,'#1d4ed8','#dbeafe',stripe)}
        ${tdRekap(bA,'#dc2626','#fee2e2',stripe)}
        ${tdRekap(bD,'#7c3aed','#ede9fe',stripe)}
        ${tdRekap(bTotal,'#1e293b','#e2e8f0',stripe)}
        <td style="width:4px;background:#94a3b8;border:none;padding:0"></td>
        ${cells}
      </tr>`;
    }).join('');

    // Sub-header: semester | bulan | tanggal
    const subHeader = `<tr>
      <th colspan="2" style="background:#0f172a;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 4px;text-align:center">Nama</th>
      <th colspan="6" style="background:#166534;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px;text-align:center">Rekap Semester</th>
      <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
      <th colspan="5" style="background:#1e40af;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px;text-align:center">Bulan ${namaBulan}</th>
      <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
      <th colspan="${tanggalList.length}" style="background:#1e293b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px;text-align:center">Data Harian</th>
    </tr>`;

    const mainHeader = `<tr>
      <th style="width:20px;background:#1e293b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px;text-align:center" rowspan="2">No</th>
      <th style="width:150px;background:#1e293b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 4px;text-align:left" rowspan="2">Nama Siswa</th>
      <th style="width:14px;background:#16a34a;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">H</th>
      <th style="width:14px;background:#fbbf24;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">S</th>
      <th style="width:14px;background:#3b82f6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">I</th>
      <th style="width:14px;background:#dc2626;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">A</th>
      <th style="width:14px;background:#8b5cf6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">D</th>
      <th style="width:14px;background:#334155;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">Jml</th>
      <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
      <th style="width:14px;background:#fbbf24;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">S</th>
      <th style="width:14px;background:#3b82f6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">I</th>
      <th style="width:14px;background:#dc2626;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">A</th>
      <th style="width:14px;background:#8b5cf6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">D</th>
      <th style="width:14px;background:#334155;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">Jml</th>
      <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
      ${thTgl}
    </tr>`;

    const html = `<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8"/>
    <title>Rekap Presensi Matriks - ${namaKelas}</title>
    <style>
      @page { size:${psSize}; margin:8mm 7mm 10mm; }
      *{ box-sizing:border-box; margin:0; padding:0; }
      body{ font-family:Arial,sans-serif; font-size:8px; color:#111; }
      .kop{ text-align:center; border-bottom:2px solid #1e293b; padding-bottom:4px; margin-bottom:4px; }
      .kop-nama{ font-size:13px; font-weight:800; }
      .kop-sub{ font-size:7.5px; color:#555; margin-top:1px; }
      .judul{ font-size:10px; font-weight:700; text-align:center; margin:4px 0 1px; text-transform:uppercase; }
      .period{ font-size:7.5px; text-align:center; color:#555; margin-bottom:5px; }
      table{ border-collapse:collapse; width:100%; }
      td, th { overflow:hidden; }
      .legend{ font-size:7px; color:#555; margin-top:4px; }
      .ttd{ display:flex; justify-content:flex-end; margin-top:10px; }
      .ttd-box{ text-align:center; min-width:150px; line-height:1.8; font-size:8px; }
      .ttd-name{ font-weight:700; }
      @media print{ body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
    <div class="kop">
      <div class="kop-nama">${schoolName}</div>
      <div class="kop-sub">${schoolAddr}${schoolPhone?' • Telp. '+schoolPhone:''}</div>
    </div>
    <div class="judul">Rekap Presensi TA. ${tahunAwal}–${tahunAkhir}</div>
    <div class="period">Kelas: <strong>${namaKelas}</strong> &nbsp;|&nbsp; Periode: ${period}</div>
    <table>
      <thead>
        ${subHeader}
        ${mainHeader}
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="legend">Ket: H=Hadir · S=Sakit · I=Izin · A=Alpha · D=Dispensasi · T=Terlambat · PC=Pulang Cepat · DN=Dinas · L=Lainnya &nbsp;|&nbsp; Jml=Jumlah tidak hadir (S+I+A+D)</p>
    <p class="legend">Dicetak: ${new Date().toLocaleString('id-ID')} &nbsp;|&nbsp; Total: ${siswaList.length} siswa &nbsp;|&nbsp; ${tanggalList.length} hari</p>
    <div class="ttd"><div class="ttd-box">
      Kras, ${today}<br/>Wali Kelas,<br/><br/><br/>
      <div class="ttd-name">${signerName||'___________________________'}</div>
      ${signerNip?`NIP. ${signerNip}`:''}
    </div></div>
    </body></html>`;

    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) { toast.error('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.'); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  // ── Print Rekap Tidak Hadir ──────────────────────────────
  const handlePrintTidakHadir = () => {
    if (!tidakHadirSiswa?.length) { toast.error('Tidak ada data tidak hadir'); return; }
    const schoolName = sekolahInfo?.nama    || 'SMKN 1 Kras';
    const schoolAddr = sekolahInfo?.alamat  || 'Jl. Raya Kras, Kediri, Jawa Timur';
    const schoolPhone= sekolahInfo?.telepon || '';
    const psSize     = pageSize === 'F4' ? '330.2mm 215.9mm' : '297mm 210mm'; // landscape
    const today      = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const signerName = user?.nama || user?.username || '';
    const signerNip  = user?.nip  || '';
    const period     = `${tanggalMulai} s/d ${tanggalSelesai}`;
    const namaBulan  = new Date(tanggalSelesai).toLocaleString('id-ID', { month:'long' });

    const ST = {
      SAKIT:'S', IZIN:'I', ALPHA:'A', DISPENSASI:'D', TERLAMBAT:'T', PULANG_CEPAT:'PC', LAINNYA:'L'
    };
    const ST_COLOR = {
      SAKIT:'#b45309', IZIN:'#1d4ed8', ALPHA:'#dc2626', DISPENSASI:'#7c3aed', TERLAMBAT:'#c2410c'
    };
    const ST_BG = {
      SAKIT:'#fef9c3', IZIN:'#dbeafe', ALPHA:'#fee2e2', DISPENSASI:'#ede9fe', TERLAMBAT:'#ffedd5'
    };

    const fmtTgl  = s => { const d=new Date(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };
    const fmtHari = s => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][new Date(s).getDay()];

    // Header kolom tanggal
    const thTgl = tidakHadirTanggal.map(t => {
      const isMinggu = new Date(t).getDay() === 0;
      return `<th style="width:14px;min-width:14px;padding:0;background:${isMinggu?'#334155':'#1e293b'};color:${isMinggu?'#94a3b8':'#fff'};border:0.5px solid #475569;text-align:center">
        <div style="writing-mode:vertical-lr;transform:rotate(180deg);padding:2px 0;line-height:1.1;font-size:6px">${fmtHari(t)}<br/>${fmtTgl(t)}</div>
      </th>`;
    }).join('');

    const tdN = (val, color, bg, stripe) =>
      `<td style="width:18px;text-align:center;border:0.5px solid #cbd5e1;background:${val?(bg||stripe):stripe};font-size:7px;color:${color};font-weight:700;padding:1px 0">${val||''}</td>`;

    const tbody = tidakHadirSiswa.map((row, i) => {
      const map = {};
      (row.kejadian||[]).forEach(k => { map[k.tanggal] = k; });
      const sm = row.rekap || {};
      const bl = row.rekapBulan || {};
      const smJml = (sm.S||0)+(sm.I||0)+(sm.A||0)+(sm.D||0);
      const blJml = (bl.S||0)+(bl.I||0)+(bl.A||0)+(bl.D||0);
      const stripe = i%2===1 ? '#f8fafc' : '#fff';
      const cells = tidakHadirTanggal.map(t => {
        const k = map[t];
        if (!k) return `<td style="width:14px;min-width:14px;padding:0;border:0.5px solid #e2e8f0;background:${stripe}"></td>`;
        const bg = ST_BG[k.status]||'#fff';
        const color = ST_COLOR[k.status]||'#111';
        const lbl = ST[k.status]||k.status;
        return `<td style="width:14px;min-width:14px;padding:0;border:0.5px solid #e2e8f0;background:${bg};text-align:center;font-size:6px;color:${color};font-weight:700">${lbl}</td>`;
      }).join('');
      return `<tr>
        <td style="width:20px;padding:1px 2px;border:0.5px solid #e2e8f0;text-align:center;background:${stripe};font-size:7px">${i+1}</td>
        <td style="width:150px;padding:1px 5px;border:0.5px solid #e2e8f0;background:${stripe};font-size:7.5px;font-weight:600;white-space:nowrap">${row.siswa?.nama||'-'}</td>
        <td style="width:70px;padding:1px 4px;border:0.5px solid #e2e8f0;background:${stripe};font-size:7px">${row.kelas?.nama||'-'}</td>
        ${tdN(sm.H,'#16a34a','',stripe)}
        ${tdN(sm.S,'#b45309','#fef9c3',stripe)}
        ${tdN(sm.I,'#1d4ed8','#dbeafe',stripe)}
        ${tdN(sm.A,'#dc2626','#fee2e2',stripe)}
        ${tdN(sm.D,'#7c3aed','#ede9fe',stripe)}
        ${tdN(smJml,'#1e293b','#e2e8f0',stripe)}
        <td style="width:4px;background:#94a3b8;border:none;padding:0"></td>
        ${tdN(bl.S,'#b45309','#fef9c3',stripe)}
        ${tdN(bl.I,'#1d4ed8','#dbeafe',stripe)}
        ${tdN(bl.A,'#dc2626','#fee2e2',stripe)}
        ${tdN(bl.D,'#7c3aed','#ede9fe',stripe)}
        ${tdN(blJml,'#1e293b','#e2e8f0',stripe)}
        <td style="width:4px;background:#94a3b8;border:none;padding:0"></td>
        ${cells}
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8"/><title>Rekap Tidak Hadir</title>
    <style>
      @page { size:${psSize}; margin:10mm 8mm 12mm; }
      *{ box-sizing:border-box; margin:0; padding:0; }
      body{ font-family:Arial,sans-serif; font-size:8px; color:#111; }
      .kop{ text-align:center; border-bottom:2px solid #1e293b; padding-bottom:5px; margin-bottom:5px; }
      .kop-nama{ font-size:13px; font-weight:800; }
      .kop-sub{ font-size:7.5px; color:#555; margin-top:1px; }
      .judul{ font-size:11px; font-weight:700; text-align:center; margin:5px 0 2px; text-transform:uppercase; }
      .period{ font-size:8px; text-align:center; color:#555; margin-bottom:6px; }
      table{ border-collapse:collapse; width:100%; }
      .legend{ font-size:7px; color:#555; margin-top:5px; }
      .ttd{ display:flex; justify-content:flex-end; margin-top:12px; }
      .ttd-box{ text-align:center; min-width:160px; line-height:1.8; font-size:8px; }
      .ttd-name{ font-weight:700; }
      @media print{ body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
    <div class="kop">
      <div class="kop-nama">${schoolName}</div>
      <div class="kop-sub">${schoolAddr}${schoolPhone?' • Telp. '+schoolPhone:''}</div>
    </div>
    <div class="judul">Rekap Siswa Tidak Hadir</div>
    <div class="period">Periode: ${period}</div>
    <table>
      <thead>
        <tr>
          <th colspan="3" style="background:#0f172a;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 4px;text-align:center">Data Siswa</th>
          <th colspan="6" style="background:#166534;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px;text-align:center">Rekap Semester</th>
          <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
          <th colspan="5" style="background:#1e40af;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px;text-align:center">Bulan ${namaBulan}</th>
          <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
          <th colspan="${tidakHadirTanggal.length}" style="background:#1e293b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px;text-align:center">Data Harian</th>
        </tr>
        <tr>
          <th style="width:20px;background:#1e293b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px;text-align:center">No</th>
          <th style="width:150px;background:#1e293b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 4px;text-align:left">Nama Siswa</th>
          <th style="width:70px;background:#1e293b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 4px">Kelas</th>
          <th style="width:14px;background:#16a34a;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">H</th>
          <th style="width:14px;background:#f59e0b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">S</th>
          <th style="width:14px;background:#3b82f6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">I</th>
          <th style="width:14px;background:#dc2626;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">A</th>
          <th style="width:14px;background:#8b5cf6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">D</th>
          <th style="width:14px;background:#334155;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">Jml</th>
          <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
          <th style="width:14px;background:#f59e0b;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">S</th>
          <th style="width:14px;background:#3b82f6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">I</th>
          <th style="width:14px;background:#dc2626;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">A</th>
          <th style="width:14px;background:#8b5cf6;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">D</th>
          <th style="width:14px;background:#334155;color:#fff;border:0.5px solid #475569;font-size:7px;padding:2px 1px">Jml</th>
          <th style="width:4px;background:#94a3b8;border:none;padding:0"></th>
          ${thTgl}
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
    <p class="legend">Ket: H=Hadir · S=Sakit · I=Izin · A=Alpha · D=Dispensasi · T=Terlambat · Jml=Total tidak hadir</p>
    <p class="legend">Dicetak: ${new Date().toLocaleString('id-ID')} | Total: ${tidakHadirSiswa.length} siswa</p>
    <div class="ttd"><div class="ttd-box">
      Kras, ${today}<br/>Petugas Piket,<br/><br/><br/>
      <div class="ttd-name">${signerName||'___________________________'}</div>
      ${signerNip?`NIP. ${signerNip}`:''}
    </div></div>
    </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast.error('Pop-up diblokir browser.'); return; }
    w.document.write(html); w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan & Export</h1>
          <p style={{ color:'var(--color-muted)', fontSize:13, marginTop:2 }}>
            Rekap dan ekspor data absensi dan pelanggaran
          </p>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>

          {/* Pilihan ukuran kertas */}
          <div style={{ position:'relative' }}>
            <button className="btn btn-secondary" onClick={() => setShowSizeMenu(v => !v)} style={{ gap:6, minWidth:90 }}>
              {pageSize} <ChevronDown style={{ width:13, height:13 }} />
            </button>
            {showSizeMenu && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:9 }} onClick={() => setShowSizeMenu(false)} />
                <div style={{
                  position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:10,
                  backgroundColor:'var(--color-surface)', border:'1px solid var(--color-border)',
                  borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', overflow:'hidden', minWidth:180,
                }}>
                  {PAGE_SIZES.map(s => (
                    <button key={s.value} onClick={() => { setPageSize(s.value); setShowSizeMenu(false); }}
                      style={{
                        display:'block', width:'100%', padding:'9px 14px', textAlign:'left',
                        background: pageSize === s.value ? 'rgba(var(--color-primary-rgb),0.1)' : 'none',
                        color: pageSize === s.value ? 'var(--color-primary)' : 'var(--color-foreground)',
                        border:'none', cursor:'pointer', fontSize:13,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export PDF — client-side print */}
          {reportType !== 'matriks' && reportType !== 'tidak-hadir' && (
            <button onClick={handlePrint} className="btn btn-danger" style={{ gap:6 }}>
              <FileText style={{ width:15, height:15 }} /> Export PDF
            </button>
          )}
          {reportType === 'matriks' && (
            <button onClick={handlePrintMatriks} className="btn btn-danger" style={{ gap:6 }}>
              <Printer style={{ width:15, height:15 }} /> Print Matriks
            </button>
          )}
          {reportType === 'tidak-hadir' && (
            <button onClick={handlePrintTidakHadir} className="btn btn-danger" style={{ gap:6 }}>
              <Printer style={{ width:15, height:15 }} /> Print
            </button>
          )}

          {/* Export Excel — server-side */}
          {reportType !== 'matriks' && reportType !== 'tidak-hadir' && (
            <button onClick={() => handleExport('excel')} disabled={!!exporting} className="btn btn-success" style={{ gap:6 }}>
              <FileSpreadsheet style={{ width:15, height:15 }} />
              {exporting === 'excel' ? 'Mengekspor...' : 'Export Excel'}
            </button>
          )}

          {/* Export CSV */}
          {reportType !== 'matriks' && reportType !== 'tidak-hadir' && (
            <button onClick={() => handleExport('csv')} disabled={!!exporting} className="btn btn-secondary" style={{ gap:6 }}>
              <FileDown style={{ width:15, height:15 }} />
              {exporting === 'csv' ? 'Mengekspor...' : 'CSV'}
            </button>
          )}

          {/* Print */}
          {reportType !== 'matriks' && (
            <button onClick={handlePrint} className="btn btn-secondary" style={{ gap:6 }}>
              <Printer style={{ width:15, height:15 }} /> Print
            </button>
          )}
        </div>
      </div>

      {/* ── Filter ── */}
      <div className="card">
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'flex-end' }}>
          <div style={{ display:'flex', gap:4, padding:4, background:'var(--color-bg)', borderRadius:10, border:'1px solid var(--color-border)' }}>
            {REPORT_TYPES.map(t => (
              <button key={t.key} onClick={() => setReportType(t.key)}
                style={{
                  padding:'6px 14px', borderRadius:7, fontSize:13, fontWeight:500,
                  border:'none', cursor:'pointer', transition:'all 0.15s',
                  background: reportType === t.key ? 'var(--color-primary)' : 'transparent',
                  color: reportType === t.key ? '#fff' : 'var(--color-muted)',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Shortcut Periode ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label className="label">Shortcut Periode</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {/* Bulan-bulan */}
              {Array.from({length:12},(_,i)=>{
                const d   = new Date(new Date().getFullYear(), i, 1);
                const lbl = d.toLocaleString('id-ID',{month:'short'});
                const y   = d.getFullYear();
                const m0  = String(i+1).padStart(2,'0');
                const last= new Date(y,i+1,0).getDate();
                return (
                  <button key={i} onClick={()=>{
                    setTanggalMulai(`${y}-${m0}-01`);
                    setTanggalSelesai(`${y}-${m0}-${last}`);
                  }}
                    style={{ padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:600, border:'1px solid var(--color-border)', background:'var(--color-surface-hover)', color:'var(--color-muted)', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--color-primary)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--color-border)'}
                  >{lbl}</button>
                );
              })}
              {/* Semester */}
              <button onClick={()=>{
                const y=new Date().getFullYear();
                setTanggalMulai(`${y}-07-01`); setTanggalSelesai(`${y}-12-31`);
              }} style={{ padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:600, border:'1px solid var(--color-border)', background:'rgba(var(--color-primary-rgb),0.08)', color:'var(--color-primary)', cursor:'pointer' }}>
                Ganjil
              </button>
              <button onClick={()=>{
                const y=new Date().getFullYear();
                setTanggalMulai(`${y}-01-01`); setTanggalSelesai(`${y}-06-30`);
              }} style={{ padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:600, border:'1px solid var(--color-border)', background:'rgba(var(--color-primary-rgb),0.08)', color:'var(--color-primary)', cursor:'pointer' }}>
                Genap
              </button>
              {/* Tahun penuh */}
              {[0,1].map(offset=>{
                const y = new Date().getFullYear() - offset;
                return (
                  <button key={y} onClick={()=>{
                    setTanggalMulai(`${y}-01-01`); setTanggalSelesai(`${y}-12-31`);
                  }} style={{ padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:600, border:'1px solid rgba(34,197,94,0.3)', background:'rgba(34,197,94,0.06)', color:'#4ade80', cursor:'pointer' }}>
                    {y}
                  </button>
                );
              })}
              {/* Sejak masuk — hanya tampil di print individual, tidak di filter umum */}
            </div>
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
            <div>
              <label className="label">Dari</label>
              <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className="input" style={{ width:150 }} />
            </div>
            <span style={{ color:'var(--color-muted)', paddingBottom:6, fontSize:13 }}>s/d</span>
            <div>
              <label className="label">Sampai</label>
              <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className="input" style={{ width:150 }} />
            </div>
            <div>
              <label className="label">Kelas</label>
              <select value={kelasId} onChange={e => setKelasId(e.target.value)} className="input" style={{ width:160 }}>
                <option value="">Semua Kelas</option>
                {kelasList?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            {reportType === 'absensi-siswa' && (
              <div>
                <label className="label">Cari Siswa</label>
                <div style={{ position:'relative' }}>
                  <Search style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', width:13, height:13, color:'var(--color-muted)', pointerEvents:'none' }} />
                  <input
                    value={searchSiswa}
                    onChange={e => setSearchSiswa(e.target.value)}
                    placeholder="Nama atau NISN..."
                    className="input"
                    style={{ paddingLeft:28, width:180 }}
                  />
                </div>
                {searchSiswa && filteredAbsensi && (
                  <p style={{ fontSize:11, color:'var(--color-muted)', marginTop:3 }}>
                    {filteredAbsensi.length} siswa ditemukan
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      {currentData?.length > 0 && reportType !== 'pelanggaran' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:12 }}>
            {[
              { label: reportType === 'absensi-kelas' ? 'Total Kelas' : 'Total Siswa', value: displayData?.length ?? 0,                                             color:'var(--color-foreground)' },
              { label: 'Total Hadir',      value: displayData?.reduce((a,r) => a+(r.hadir||0),      0) ?? 0, color:'#22c55e' },
              { label: 'Total Alpha',      value: displayData?.reduce((a,r) => a+(r.alpha||0),      0) ?? 0, color:'#ef4444' },
              { label: 'Total Terlambat',  value: displayData?.reduce((a,r) => a+(r.terlambat||0),  0) ?? 0, color:'#f97316' },
              { label: 'Total Dispensasi', value: displayData?.reduce((a,r) => a+(r.dispensasi||0), 0) ?? 0, color:'#14b8a6' },
              { label: 'Total Dinas/PKL',  value: displayData?.reduce((a,r) => a+(r.dinas||0),      0) ?? 0, color:'#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign:'center', padding:'12px 10px' }}>
                <p style={{ fontSize:24, fontWeight:800, color:s.color, margin:'0 0 4px' }}>{s.value}</p>
                <p style={{ fontSize:11, color:'var(--color-muted)', margin:0 }}>{s.label}</p>
              </div>
            ))}
          </div>
          {reportType === 'absensi-kelas' && (displayData?.some(r => r.dinas > 0)) && (
            <div style={{ marginTop:10, padding:'8px 14px', borderRadius:8, background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', fontSize:11, color:'var(--color-muted)' }}>
              <strong style={{ color:'#a78bfa' }}>Keterangan kolom DN (Dinas/PKL):</strong>{' '}
              Angka besar = <strong>hari PKL unik</strong>. Angka kecil di bawahnya = <strong>jumlah siswa × hari</strong> (contoh: 36s×80h = 36 siswa selama 80 hari PKL).
              Untuk melihat data PKL lengkap, set periode laporan sesuai rentang PKL (mis. 15 Jun – 2 Okt).
            </div>
          )}
        </>
      )}

      {/* ── Tabel data / Matriks ── */}
      {reportType === 'matriks' ? (
        /* ── Preview Matriks ── */
        <div className="card" style={{ padding: 12, marginBottom: 24 }}>
          {!kelasId ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--color-muted)' }}>
              <p style={{ fontSize:14, fontWeight:500 }}>Pilih kelas terlebih dahulu untuk melihat rekap matriks</p>
            </div>
          ) : l4 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {Array.from({length:5}).map((_,i) => (
                <div key={i} style={{ height:36, borderRadius:8, background:'var(--color-surface-hover)', animation:'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : !matriksData?.siswa?.length ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--color-muted)' }}>
              <p>Tidak ada data absensi untuk periode dan kelas yang dipilih</p>
            </div>
          ) : (() => {
              // Bulan terakhir dari tanggalSelesai
              const bulanAkhir  = new Date(tanggalSelesai).getMonth();
              const tahunAkhirN = new Date(tanggalSelesai).getFullYear();
              const namaBulan   = new Date(tanggalSelesai).toLocaleString('id-ID', { month:'short' });
              const tanggalBulanIni = matriksData.tanggal.filter(t => {
                const d = new Date(t); return d.getMonth()===bulanAkhir && d.getFullYear()===tahunAkhirN;
              });
              const ST_STYLE = {
                HADIR:       { bg:'#dcfce7', color:'#16a34a', lbl:'H' },
                SAKIT:       { bg:'#fef9c3', color:'#b45309', lbl:'S' },
                IZIN:        { bg:'#dbeafe', color:'#1d4ed8', lbl:'I' },
                ALPHA:       { bg:'#fee2e2', color:'#dc2626', lbl:'A' },
                DISPENSASI:  { bg:'#ede9fe', color:'#7c3aed', lbl:'D' },
                TERLAMBAT:   { bg:'#ffedd5', color:'#c2410c', lbl:'T' },
                PULANG_CEPAT:{ bg:'#fce7f3', color:'#be185d', lbl:'PC' },
                DINAS:       { bg:'#cffafe', color:'#0e7490', lbl:'DN' },
                LAINNYA:     { bg:'#f1f5f9', color:'#64748b', lbl:'L' },
              };
              const thStyle = (bg) => ({ padding:'3px 4px', background:bg, color:'#fff', border:'1px solid #475569', fontSize:10, textAlign:'center', minWidth:26 });
              const sepStyle = { width:6, background:'#94a3b8', border:'none', padding:0 };
              return (
                <>
                  {/* Legend */}
                  <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)' }}>
                      {matriksData.siswa.length} siswa · {matriksData.tanggal.length} hari
                    </span>
                    {[
                      { k:'H', label:'Hadir',   color:'#16a34a', bg:'#dcfce7' },
                      { k:'S', label:'Sakit',   color:'#b45309', bg:'#fef9c3' },
                      { k:'I', label:'Izin',    color:'#1d4ed8', bg:'#dbeafe' },
                      { k:'A', label:'Alpha',   color:'#dc2626', bg:'#fee2e2' },
                      { k:'T', label:'Terlambat',color:'#c2410c',bg:'#ffedd5' },
                      { k:'D', label:'Dispensasi',color:'#7c3aed',bg:'#ede9fe' },
                    ].map(s => (
                      <span key={s.k} style={{ padding:'2px 7px', borderRadius:5, fontSize:10, fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.color}30` }}>
                        {s.k} = {s.label}
                      </span>
                    ))}
                  </div>

                  {/* Tabel matriks */}
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ borderCollapse:'collapse', fontSize:10, whiteSpace:'nowrap' }}>
                      <thead>
                        {/* Sub-header grup */}
                        <tr>
                          <th colSpan={2} style={{ background:'#0f172a', color:'#fff', border:'1px solid #475569', fontSize:9, padding:'2px 4px', textAlign:'center', position:'sticky', left:0, zIndex:3 }}>Nama</th>
                          <th colSpan={6} style={{ background:'#166534', color:'#fff', border:'1px solid #475569', fontSize:9, padding:'2px', textAlign:'center' }}>Rekap Semester</th>
                          <th style={sepStyle}></th>
                          <th colSpan={5} style={{ background:'#1e40af', color:'#fff', border:'1px solid #475569', fontSize:9, padding:'2px', textAlign:'center' }}>Bulan {namaBulan}</th>
                          <th style={sepStyle}></th>
                          <th colSpan={matriksData.tanggal.length} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', fontSize:9, padding:'2px', textAlign:'center' }}>Data Harian</th>
                        </tr>
                        {/* Header kolom */}
                        <tr>
                          <th style={{ ...thStyle('#1e293b'), position:'sticky', left:0, zIndex:2, width:28 }}>No</th>
                          <th style={{ ...thStyle('#1e293b'), position:'sticky', left:28, zIndex:2, minWidth:160, textAlign:'left', padding:'3px 8px' }}>Nama Siswa</th>
                          {/* Rekap semester */}
                          <th style={thStyle('#16a34a')}>H</th>
                          <th style={thStyle('#f59e0b')}>S</th>
                          <th style={thStyle('#3b82f6')}>I</th>
                          <th style={thStyle('#dc2626')}>A</th>
                          <th style={thStyle('#8b5cf6')}>D</th>
                          <th style={thStyle('#334155')}>Jml</th>
                          <th style={sepStyle}></th>
                          {/* Rekap bulan */}
                          <th style={thStyle('#f59e0b')}>S</th>
                          <th style={thStyle('#3b82f6')}>I</th>
                          <th style={thStyle('#dc2626')}>A</th>
                          <th style={thStyle('#8b5cf6')}>D</th>
                          <th style={thStyle('#334155')}>Jml</th>
                          <th style={sepStyle}></th>
                          {/* Kolom tanggal */}
                          {matriksData.tanggal.map(t => {
                            const d = new Date(t);
                            const hari = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d.getDay()];
                            const tgl  = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                            return (
                              <th key={t} style={{ padding:'2px 0', background: d.getDay()===0?'#334155':'#1e293b', color: d.getDay()===0?'#94a3b8':'#fff', border:'1px solid #475569', fontSize:8, minWidth:26, maxWidth:26, textAlign:'center' }}>
                                <div style={{ writingMode:'vertical-lr', transform:'rotate(180deg)', lineHeight:1.3, fontSize:8 }}>{hari}<br/>{tgl}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {matriksData.siswa.map((item, idx) => {
                          const map = {};
                          (item.absensi||[]).forEach(a => { map[a.tanggal?.split?.('T')[0]||a.tanggal] = a.status; });

                          // Rekap semester
                          let sH=0,sS=0,sI=0,sA=0,sT=0,sD=0;
                          Object.values(map).forEach(s => {
                            if(s==='HADIR') sH++;
                            else if(s==='SAKIT') sS++;
                            else if(s==='IZIN') sI++;
                            else if(s==='ALPHA') sA++;
                            else if(s==='TERLAMBAT') sT++;
                            else if(s==='DISPENSASI') sD++;
                          });
                          const sTotal = sS+sI+sA+sD;

                          // Rekap bulan terakhir
                          let bS=0,bI=0,bA=0,bD=0;
                          tanggalBulanIni.forEach(t => {
                            const st=map[t];
                            if(st==='SAKIT') bS++;
                            else if(st==='IZIN') bI++;
                            else if(st==='ALPHA') bA++;
                            else if(st==='DISPENSASI') bD++;
                          });
                          const bTotal = bS+bI+bA+bD;

                          const stripe = idx%2===1 ? 'var(--color-surface-hover)' : 'transparent';
                          const tdNum  = (val, color, bg) => (
                            <td style={{ padding:'3px 4px', border:'1px solid var(--color-border)', textAlign:'center', fontSize:10, fontWeight:700,
                              background: val?(bg||stripe):stripe, color, minWidth:26 }}>
                              {val||''}
                            </td>
                          );
                          return (
                            <tr key={item.siswa?.id}>
                              <td style={{ padding:'3px 5px', border:'1px solid var(--color-border)', textAlign:'center', fontSize:10, background:stripe, position:'sticky', left:0, zIndex:1 }}>{idx+1}</td>
                              <td style={{ padding:'3px 8px', border:'1px solid var(--color-border)', fontWeight:600, fontSize:11, background:stripe, position:'sticky', left:28, zIndex:1, minWidth:160 }}>{item.siswa?.nama}</td>
                              {/* Rekap semester */}
                              {tdNum(sH,'#16a34a','')}
                              {tdNum(sS,'#b45309','#fef9c3')}
                              {tdNum(sI,'#1d4ed8','#dbeafe')}
                              {tdNum(sA,'#dc2626','#fee2e2')}
                              {tdNum(sD,'#7c3aed','#ede9fe')}
                              {tdNum(sTotal,'#1e293b','#e2e8f0')}
                              <td style={{ width:6, background:'#94a3b8', border:'none' }}></td>
                              {/* Rekap bulan */}
                              {tdNum(bS,'#b45309','#fef9c3')}
                              {tdNum(bI,'#1d4ed8','#dbeafe')}
                              {tdNum(bA,'#dc2626','#fee2e2')}
                              {tdNum(bD,'#7c3aed','#ede9fe')}
                              {tdNum(bTotal,'#1e293b','#e2e8f0')}
                              <td style={{ width:6, background:'#94a3b8', border:'none' }}></td>
                              {/* Grid harian */}
                              {matriksData.tanggal.map(t => {
                                const st = map[t];
                                const ss = st ? ST_STYLE[st] : null;
                                return (
                                  <td key={t} title={st||''} style={{ padding:'2px 1px', border:'1px solid var(--color-border)', textAlign:'center', fontSize:9, fontWeight:700, minWidth:26, maxWidth:26,
                                    background: !st ? stripe : st==='HADIR' ? '#dcfce7' : (ss?.bg||stripe),
                                    color: !st ? 'transparent' : st==='HADIR' ? '#16a34a' : (ss?.color||'#111') }}>
                                    {!st ? '' : st==='HADIR' ? '' : (ss?.lbl||'-')}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()
          }
        </div>
      ) : reportType === 'tidak-hadir' ? (
        /* ── Preview Rekap Tidak Hadir ── */
        <div className="card" style={{ padding: 12, marginBottom: 24 }}>
          {l5 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {Array.from({length:6}).map((_,i) => (
                <div key={i} style={{ height:36, borderRadius:8, background:'var(--color-surface-hover)', animation:'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : !tidakHadirSiswa?.length ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--color-muted)' }}>
              <p style={{ fontSize:14 }}>
                {tanggalMulai && tanggalSelesai
                  ? 'Tidak ada siswa tidak hadir pada periode ini 🎉'
                  : 'Pilih periode untuk melihat rekap tidak hadir'}
              </p>
            </div>
          ) : (() => {
            const namaBulan = new Date(tanggalSelesai).toLocaleString('id-ID', { month:'short' });
            const ST = {
              SAKIT:      { color:'#b45309', bg:'#fef9c3', lbl:'S' },
              IZIN:       { color:'#1d4ed8', bg:'#dbeafe', lbl:'I' },
              ALPHA:      { color:'#dc2626', bg:'#fee2e2', lbl:'A' },
              DISPENSASI: { color:'#7c3aed', bg:'#ede9fe', lbl:'D' },
              TERLAMBAT:  { color:'#c2410c', bg:'#ffedd5', lbl:'T' },
              PULANG_CEPAT:{ color:'#be185d', bg:'#fce7f3', lbl:'PC' },
              LAINNYA:    { color:'#64748b', bg:'#f1f5f9', lbl:'L' },
            };
            // Summary total
            const totals = { S:0, I:0, A:0, D:0, T:0 };
            tidakHadirSiswa.forEach(r => {
              r.kejadian?.forEach(k => {
                if(k.status==='SAKIT') totals.S++;
                else if(k.status==='IZIN') totals.I++;
                else if(k.status==='ALPHA') totals.A++;
                else if(k.status==='DISPENSASI') totals.D++;
                else if(k.status==='TERLAMBAT') totals.T++;
              });
            });
            const thStyle = (bg) => ({ padding:'4px 5px', background:bg, color:'#fff', border:'1px solid #475569', fontSize:11, textAlign:'center', minWidth:26 });
            const sepStyle = { width:6, background:'#94a3b8', border:'none', padding:0 };
            const fmtTgl  = s => { const d=new Date(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };
            const fmtHari = s => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][new Date(s).getDay()];
            return (
              <>
                {/* Summary */}
                <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)' }}>
                    {tidakHadirSiswa.length} siswa · {tidakHadirTanggal.length} hari
                  </span>
                  {[{k:'S',color:'#b45309',bg:'#fef9c3'},{k:'I',color:'#1d4ed8',bg:'#dbeafe'},{k:'A',color:'#dc2626',bg:'#fee2e2'},{k:'D',color:'#7c3aed',bg:'#ede9fe'},{k:'T',color:'#c2410c',bg:'#ffedd5'}]
                    .map(s => totals[s.k] ? (
                      <span key={s.k} style={{ padding:'2px 10px', borderRadius:6, fontSize:11, fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.color}30` }}>
                        {s.k} = {totals[s.k]}
                      </span>
                    ) : null)}
                </div>

                <div style={{ overflowX:'auto' }}>
                  <table style={{ borderCollapse:'collapse', fontSize:11, whiteSpace:'nowrap' }}>
                    <thead>
                      <tr>
                        <th colSpan={3} style={{ background:'#0f172a', color:'#fff', border:'1px solid #475569', fontSize:10, padding:'2px 6px', textAlign:'center', position:'sticky', left:0, zIndex:3 }}>Data Siswa</th>
                        <th colSpan={6} style={{ background:'#166534', color:'#fff', border:'1px solid #475569', fontSize:10, padding:'2px', textAlign:'center' }}>Rekap Semester</th>
                        <th style={sepStyle}></th>
                        <th colSpan={5} style={{ background:'#1e40af', color:'#fff', border:'1px solid #475569', fontSize:10, padding:'2px', textAlign:'center' }}>Bulan {namaBulan}</th>
                        <th style={sepStyle}></th>
                        <th colSpan={tidakHadirTanggal.length} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', fontSize:10, padding:'2px', textAlign:'center' }}>Data Harian</th>
                      </tr>
                      <tr>
                        <th style={{ ...thStyle('#1e293b'), position:'sticky', left:0, zIndex:2, width:28 }}>No</th>
                        <th style={{ ...thStyle('#1e293b'), position:'sticky', left:28, zIndex:2, minWidth:160, textAlign:'left', padding:'4px 8px' }}>Nama Siswa</th>
                        <th style={{ ...thStyle('#1e293b'), minWidth:80 }}>Kelas</th>
                        <th style={thStyle('#16a34a')}>H</th>
                        <th style={thStyle('#f59e0b')}>S</th>
                        <th style={thStyle('#3b82f6')}>I</th>
                        <th style={thStyle('#dc2626')}>A</th>
                        <th style={thStyle('#8b5cf6')}>D</th>
                        <th style={thStyle('#334155')}>Jml</th>
                        <th style={sepStyle}></th>
                        <th style={thStyle('#f59e0b')}>S</th>
                        <th style={thStyle('#3b82f6')}>I</th>
                        <th style={thStyle('#dc2626')}>A</th>
                        <th style={thStyle('#8b5cf6')}>D</th>
                        <th style={thStyle('#334155')}>Jml</th>
                        <th style={sepStyle}></th>
                        {tidakHadirTanggal.map(t => (
                          <th key={t} style={{ padding:'2px 0', background: new Date(t).getDay()===0?'#334155':'#1e293b', color: new Date(t).getDay()===0?'#94a3b8':'#fff', border:'1px solid #475569', fontSize:8, minWidth:26, maxWidth:26, textAlign:'center' }}>
                            <div style={{ writingMode:'vertical-lr', transform:'rotate(180deg)', lineHeight:1.3 }}>{fmtHari(t)}<br/>{fmtTgl(t)}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tidakHadirSiswa.map((row, idx) => {
                        const map = {};
                        (row.kejadian||[]).forEach(k => { map[k.tanggal] = k; });
                        const sm = row.rekap || {};
                        const bl = row.rekapBulan || {};
                        const smJml = (sm.S||0)+(sm.I||0)+(sm.A||0)+(sm.D||0);
                        const blJml = (bl.S||0)+(bl.I||0)+(bl.A||0)+(bl.D||0);
                        const stripe = idx%2===1 ? 'var(--color-surface-hover)' : 'transparent';
                        const tdN = (val, color, bg) => (
                          <td style={{ padding:'3px 4px', border:'1px solid var(--color-border)', textAlign:'center', fontSize:10, fontWeight:700, background:val?(bg||stripe):stripe, color, minWidth:26 }}>
                            {val||''}
                          </td>
                        );
                        return (
                          <tr key={idx}>
                            <td style={{ padding:'3px 5px', border:'1px solid var(--color-border)', textAlign:'center', fontSize:10, background:stripe, position:'sticky', left:0, zIndex:1 }}>{idx+1}</td>
                            <td style={{ padding:'3px 8px', border:'1px solid var(--color-border)', fontWeight:600, fontSize:11, background:stripe, position:'sticky', left:28, zIndex:1, minWidth:160 }}>{row.siswa?.nama}</td>
                            <td style={{ padding:'3px 6px', border:'1px solid var(--color-border)', fontSize:11, background:stripe }}>{row.kelas?.nama}</td>
                            {tdN(sm.H,'#16a34a','')}
                            {tdN(sm.S,'#b45309','#fef9c3')}
                            {tdN(sm.I,'#1d4ed8','#dbeafe')}
                            {tdN(sm.A,'#dc2626','#fee2e2')}
                            {tdN(sm.D,'#7c3aed','#ede9fe')}
                            {tdN(smJml,'#1e293b','#e2e8f0')}
                            <td style={{ width:6, background:'#94a3b8', border:'none' }}></td>
                            {tdN(bl.S,'#b45309','#fef9c3')}
                            {tdN(bl.I,'#1d4ed8','#dbeafe')}
                            {tdN(bl.A,'#dc2626','#fee2e2')}
                            {tdN(bl.D,'#7c3aed','#ede9fe')}
                            {tdN(blJml,'#1e293b','#e2e8f0')}
                            <td style={{ width:6, background:'#94a3b8', border:'none' }}></td>
                            {tidakHadirTanggal.map(t => {
                              const k = map[t];
                              const s = k ? ST[k.status] : null;
                              return (
                                <td key={t} title={k?`${k.status}${k.keterangan?' - '+k.keterangan:''}`:''}
                                  style={{ padding:'2px 1px', border:'1px solid var(--color-border)', textAlign:'center', fontSize:9, fontWeight:700, minWidth:26, maxWidth:26,
                                    background: s ? s.bg : stripe, color: s ? s.color : 'transparent' }}>
                                  {s ? s.lbl : ''}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
          <div style={{ overflowX:'auto' }}>
            <DataTable
              columns={currentCols}
              data={displayData}
              loading={isLoading}
              emptyMessage="Tidak ada data untuk filter yang dipilih"
              tableStyle={reportType === 'absensi-kelas' ? { tableLayout:'fixed', width:'100%' } : undefined}
            />
          </div>
        </div>
      )}

    </div>
  );
}
