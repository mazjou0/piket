import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CheckCircle, Save, Calendar, Users, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const STATUS_OPTIONS = [
  { value: 'HADIR',        label: 'H',  title: 'Hadir',        bg: '#16a34a', bgLight: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  { value: 'SAKIT',        label: 'S',  title: 'Sakit',        bg: '#d97706', bgLight: 'rgba(234,179,8,0.15)',   color: '#fde047' },
  { value: 'IZIN',         label: 'I',  title: 'Izin',         bg: '#1d4ed8', bgLight: 'rgba(59,130,246,0.15)',  color: '#93c5fd' },
  { value: 'ALPHA',        label: 'A',  title: 'Alpha',        bg: '#dc2626', bgLight: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  { value: 'DISPENSASI',   label: 'D',  title: 'Dispensasi',   bg: '#7c3aed', bgLight: 'rgba(139,92,246,0.15)',  color: '#c4b5fd' },
  { value: 'TERLAMBAT',    label: 'T',  title: 'Terlambat',    bg: '#c2410c', bgLight: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  { value: 'PULANG_CEPAT', label: 'PC', title: 'Pulang Cepat', bg: '#be185d', bgLight: 'rgba(236,72,153,0.15)',  color: '#f9a8d4' },
  { value: 'DINAS',        label: 'DN', title: 'Dinas',        bg: '#0e7490', bgLight: 'rgba(6,182,212,0.15)',   color: '#67e8f9' },
  { value: 'LAINNYA',      label: 'L',  title: 'Lainnya',      bg: '#475569', bgLight: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
];

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

/* ── Panel Cari Siswa (inline, muncul di bawah filter saat ada hasil) ── */
function CariSiswaPanel({ tanggal, sesi, semesterId, query, setQuery, kelasId, onSimpanSuccess }) {
  const [debouncedQ, setDebouncedQ] = useState('');
  const [saving, setSaving]         = useState({});
  const [localStatus, setLocalStatus] = useState({});
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(timer.current);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['absensi-search', debouncedQ, tanggal, sesi],
    queryFn: () =>
      api.get('/absensi/search-siswa', { params: { q: debouncedQ, tanggal, sesi } })
        .then(r => r.data.data),
    enabled: debouncedQ.length >= 2,
    keepPreviousData: true,
  });

  const getStatus = (item) => localStatus[item.siswa.id] ?? item.absensi?.status ?? null;
  const sudahAbsen = (item) => localStatus[item.siswa.id] !== undefined || !!item.absensi;

  const handleSimpan = async (item, status) => {
    if (!item.kelas) { toast.error('Siswa tidak terdaftar di kelas aktif'); return; }
    if (!semesterId) { toast.error('Semester aktif tidak ditemukan'); return; }
    setSaving(p => ({ ...p, [item.siswa.id]: true }));
    try {
      await api.post('/absensi/simpan-satu', {
        siswaId: item.siswa.id, kelasId: item.kelas.id,
        tanggal, sesi, semesterId, status,
      });
      setLocalStatus(p => ({ ...p, [item.siswa.id]: status }));
      toast.success(`${item.siswa.nama} — ${STATUS_MAP[status]?.title || status}`);
      // Beritahu parent agar update state kelas juga
      onSimpanSuccess?.(item.siswa.id, item.kelas.id, status);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(p => ({ ...p, [item.siswa.id]: false }));
    }
  };

  if (debouncedQ.length < 2) return null;

  return (
    <div className="card" style={{ padding: 12 }}>
      {isFetching && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 52, borderRadius: 10, background: 'var(--color-surface-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}
      {!isFetching && results?.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '16px 0', margin: 0, fontSize: 13 }}>
          Siswa "{debouncedQ}" tidak ditemukan
        </p>
      )}
      {results?.map(item => {
        const currentStatus = getStatus(item);
        const sudah         = sudahAbsen(item);
        const statusInfo    = currentStatus ? STATUS_MAP[currentStatus] : null;
        const isSaving      = saving[item.siswa.id];
        const rowBg =
          !sudah                          ? 'transparent'              :
          currentStatus === 'ALPHA'       ? 'rgba(239,68,68,0.05)'    :
          currentStatus === 'HADIR'       ? 'rgba(34,197,94,0.05)'    :
          currentStatus === 'SAKIT'       ? 'rgba(234,179,8,0.05)'    :
          currentStatus === 'TERLAMBAT'   ? 'rgba(249,115,22,0.05)'   : 'transparent';
        return (
          <div key={item.siswa.id} style={{
            padding: '10px 12px', borderRadius: 12, marginBottom: 8,
            border: `1px solid ${sudah ? (statusInfo?.bgLight || 'var(--color-border)') : 'var(--color-border)'}`,
            background: rowBg,
          }}>
            {/* Baris atas: avatar + info siswa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: statusInfo?.bgLight || 'var(--color-surface-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: statusInfo?.color || 'var(--color-muted)',
              }}>
                {item.siswa.nama?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
                  {item.siswa.nama}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
                  NISN: <span style={{ fontFamily: 'monospace' }}>{item.siswa.nisn || '—'}</span>
                  {item.kelas
                    ? <span style={{ marginLeft: 8, color: 'var(--color-primary)', fontWeight: 600 }}>{item.kelas.nama}</span>
                    : <span style={{ marginLeft: 8, color: '#ef4444' }}>Tidak ada kelas</span>}
                </p>
                {!sudah && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#f97316', fontWeight: 600 }}>
                    ● Belum diabsen
                  </p>
                )}
                {sudah && currentStatus && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: statusInfo?.color }}>
                    ✓ {statusInfo?.title || currentStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Baris bawah: tombol status — satu baris kecil */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map(s => {
                const isActive = sudah && currentStatus === s.value;
                return (
                  <button key={s.value} onClick={() => handleSimpan(item, s.value)}
                    disabled={isSaving}
                    style={{
                      minWidth: 32, height: 32, padding: '0 6px',
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      border: `1.5px solid ${isActive ? s.bg : 'var(--color-border)'}`,
                      background: isActive ? s.bgLight : 'transparent',
                      color: isActive ? s.color : sudah ? 'var(--color-muted)' : 'rgba(148,163,184,0.5)',
                      cursor: isSaving ? 'wait' : 'pointer',
                      transition: 'all 0.15s',
                      outline: isActive ? `2px solid ${s.bg}` : 'none',
                      outlineOffset: 1,
                      opacity: sudah ? 1 : 0.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSaving && isActive ? '…' : s.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AbsensiPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canDelete    = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
  // Role yang boleh edit absensi tanggal lewat
  const canEditPast  = ['SUPER_ADMIN', 'ADMIN', 'WALI_KELAS'].includes(user?.role);
  const today = new Date().toISOString().split('T')[0];
  const [tanggal,    setTanggal]    = useState(today);
  const [kelasId,    setKelasId]    = useState('');
  const [sesi,       setSesi]       = useState('PAGI');
  const [semesterId, setSemesterId] = useState('');
  const [absensiData, setAbsensiData] = useState({});
  const [searchKelas,  setSearchKelas]  = useState(''); // filter nama di tabel per kelas
  const [searchCari,   setSearchCari]   = useState(''); // cari siswa lintas kelas

  const { data: semester } = useQuery({
    queryKey: ['semester-aktif'],
    queryFn: () => api.get('/semester/aktif').then(r => r.data.data),
  });
  useEffect(() => { if (semester?.id) setSemesterId(semester.id); }, [semester]);

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas', { params: { limit: 100, aktif: true } }).then(r => r.data.data),
  });

  const { data: absensiResponse, isLoading, refetch } = useQuery({
    queryKey: ['absensi-input', tanggal, kelasId, sesi],
    queryFn: () => api.get('/absensi', { params: { tanggal, kelasId, sesi } }).then(r => r.data.data),
    enabled: !!(tanggal && kelasId),
    // Selalu ambil data terbaru dari server (tidak cache stale)
    staleTime: 0,
  });

  // Sync absensiData state setiap kali data dari server berubah
  // useEffect lebih reliable dari onSuccess (deprecated di React Query v5)
  useEffect(() => {
    if (!absensiResponse?.siswa) return;
    const fromServer = {};
    absensiResponse.siswa.forEach(item => {
      fromServer[item.siswa.id] = {
        sudahAbsen: !!item.absensi,
        absensiId:  item.absensi?.id       || null,
        status:     item.absensi?.status     || 'HADIR',
        keterangan: item.absensi?.keterangan || '',
        menit:      item.absensi?.menit      || '',
      };
    });
    setAbsensiData(fromServer);
  }, [absensiResponse]);

  const saveMut = useMutation({
    mutationFn: (payload) => api.post('/absensi/simpan-massal', payload),
    onSuccess: () => {
      toast.success('Absensi berhasil disimpan!');
      qc.invalidateQueries({ queryKey: ['absensi-input'] });
      refetch();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan absensi'),
  });

  const setAllHadir = () => {
    const newData = {};
    absensiResponse?.siswa?.forEach(item => {
      newData[item.siswa.id] = { sudahAbsen: true, status: 'HADIR', keterangan: '', menit: '', absensiId: absensiData[item.siswa.id]?.absensiId || null };
    });
    setAbsensiData(newData);
    toast.success('Semua siswa ditandai Hadir');
  };

  const handleStatusChange = (siswaId, status) => {
    setAbsensiData(prev => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], status, sudahAbsen: true },
    }));
  };

  const handleFieldChange = (siswaId, field, value) => {
    setAbsensiData(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], [field]: value } }));
  };

  const handleHapusAbsensi = async (siswaId, absensiId) => {
    if (!absensiId) return;
    try {
      await api.delete(`/absensi/${absensiId}`);
      // Reset state lokal — tandai belum diabsen
      setAbsensiData(prev => ({
        ...prev,
        [siswaId]: { sudahAbsen: false, absensiId: null, status: 'HADIR', keterangan: '', menit: '' },
      }));
      toast.success('Absensi berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['absensi-input'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus absensi');
    }
  };

  const handleSave = () => {
    if (!kelasId || !semesterId) { toast.error('Pilih kelas dan semester terlebih dahulu'); return; }
    // Hanya kirim siswa yang sudah ditandai (sudahAbsen: true)
    const absensiList = absensiResponse?.siswa
      ?.filter(item => absensiData[item.siswa.id]?.sudahAbsen)
      ?.map(item => ({
        siswaId:    item.siswa.id,
        status:     absensiData[item.siswa.id]?.status || 'HADIR',
        keterangan: absensiData[item.siswa.id]?.keterangan || null,
        menit:      absensiData[item.siswa.id]?.menit ? parseInt(absensiData[item.siswa.id].menit) : null,
      }));
    if (!absensiList?.length) { toast.error('Tidak ada absensi yang perlu disimpan'); return; }
    saveMut.mutate({ kelasId, tanggal, sesi, semesterId, absensiList });
  };

  // Filter siswa per kelas berdasarkan nama / NISN
  const filteredSiswa = absensiResponse?.siswa?.filter(item =>
    !searchKelas ||
    item.siswa.nama.toLowerCase().includes(searchKelas.toLowerCase()) ||
    (item.siswa.nisn || '').includes(searchKelas)
  );

  const counts = {};
  Object.values(absensiData).forEach(d => {
    counts[d.status] = (counts[d.status] || 0) + 1;
  });

  // Apakah sedang mode cari siswa (ada isian di search cari)
  const isCariMode = searchCari.length >= 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filter + Cari Siswa sejajar ── */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div>
            <label className="label">
              Tanggal
              {canEditPast && <span style={{ marginLeft:6, fontSize:10, color:'#f59e0b', fontWeight:400 }}>· bisa pilih tanggal lampau</span>}
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              className="input"
              max={canEditPast ? undefined : today}
            />
            {tanggal < today && (
              <p style={{ fontSize:11, color:'#f59e0b', marginTop:3, display:'flex', alignItems:'center', gap:4 }}>
                ⚠ Tanggal lampau — perubahan akan menimpa absensi yang sudah ada
              </p>
            )}
          </div>
          <div>
            <label className="label">Kelas</label>
            <select value={kelasId} onChange={e => setKelasId(e.target.value)} className="input">
              <option value="">Pilih Kelas...</option>
              {kelasList?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sesi</label>
            <select value={sesi} onChange={e => setSesi(e.target.value)} className="input">
              <option value="PAGI">Pagi</option>
              <option value="SIANG">Siang</option>
            </select>
          </div>
          <div>
            <label className="label">Semester</label>
            <select value={semesterId} onChange={e => setSemesterId(e.target.value)} className="input">
              <option value="">Pilih Semester...</option>
              {semester && <option value={semester.id}>{semester.nama} — {semester.tahunAjaran?.nama}</option>}
            </select>
          </div>
          {/* Cari siswa lintas kelas — sejajar di baris yang sama */}
          <div style={{ position: 'relative' }}>
            <label className="label">Cari Siswa (nama / NISN)</label>
            <Search style={{
              position: 'absolute', left: 10, bottom: 9,
              width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none',
            }} />
            <input
              className="input"
              style={{ paddingLeft: 30, paddingRight: searchCari ? 28 : 10 }}
              placeholder="Nama atau NISN..."
              value={searchCari}
              onChange={e => setSearchCari(e.target.value)}
            />
            {searchCari && (
              <button onClick={() => setSearchCari('')}
                style={{ position: 'absolute', right: 8, bottom: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', padding: 0 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Hasil Cari Siswa (muncul saat ada keyword) ── */}
      {isCariMode && (
        <CariSiswaPanel
          tanggal={tanggal}
          sesi={sesi}
          semesterId={semesterId}
          query={searchCari}
          setQuery={setSearchCari}
          kelasId={kelasId}
          onSimpanSuccess={(siswaId, savedKelasId, status) => {
            // Update state lokal per kelas agar sinkron tanpa reload
            if (savedKelasId === kelasId) {
              setAbsensiData(prev => ({
                ...prev,
                [siswaId]: { ...(prev[siswaId] || {}), status, sudahAbsen: true },
              }));
            }
            // Invalidate semua query absensi-input agar data fresh saat ganti view
            qc.invalidateQueries({ queryKey: ['absensi-input'] });
          }}
        />
      )}

      {/* ── Mode Per Kelas (hanya tampil saat tidak cari) ── */}
      {!isCariMode && (
        <>
          {/* Toolbar */}
          {absensiResponse?.siswa?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-muted)' }}>
                    <Users style={{ width: 15, height: 15 }} />
                    <span><strong style={{ color: 'var(--color-foreground)' }}>{absensiResponse.siswa.length}</strong> siswa</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.slice(0, 6).map(s => (
                      <div key={s.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: s.bgLight, color: s.color }}>
                          {s.label}
                        </span>
                        <span style={{ color: 'var(--color-muted)' }}>{counts[s.value] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    placeholder="Filter nama / NISN..."
                    value={searchKelas}
                    onChange={e => setSearchKelas(e.target.value)}
                    className="input"
                    style={{ width: 170, fontSize: 13 }}
                  />
                  <button onClick={setAllHadir} className="btn btn-secondary">
                    <CheckCircle style={{ width: 15, height: 15 }} /> Semua Hadir
                  </button>
                  <button onClick={handleSave} disabled={saveMut.isPending} className="btn btn-primary">
                    <Save style={{ width: 15, height: 15 }} />
                    {saveMut.isPending ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Belum pilih kelas */}
          {!kelasId && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Calendar style={{ width: 48, height: 48, color: 'var(--color-border)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--color-muted)', fontWeight: 500, margin: 0 }}>
                Pilih kelas untuk mulai input absensi
              </p>
            </div>
          )}

          {/* Loading */}
          {kelasId && isLoading && (
            <div className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ height: 52, borderRadius: 10, background: 'var(--color-surface-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            </div>
          )}

          {/* Daftar siswa per kelas */}
          {kelasId && !isLoading && filteredSiswa && (
            <div className="card" style={{ padding: 12 }}>
              {filteredSiswa.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px 0', margin: 0 }}>
                  {searchKelas ? `Tidak ditemukan "${searchKelas}"` : 'Tidak ada siswa di kelas ini'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredSiswa.map((item, idx) => {
                    const siswa   = item.siswa;
                    const current = absensiData[siswa.id] || { status: 'HADIR', sudahAbsen: false };
                    const sudah   = current.sudahAbsen;
                    const si      = sudah ? STATUS_MAP[current.status] : null;
                    const rowBg   = !sudah ? 'transparent' :
                      current.status === 'ALPHA'     ? 'rgba(239,68,68,0.05)' :
                      current.status === 'HADIR'     ? 'rgba(34,197,94,0.05)' :
                      current.status === 'SAKIT'     ? 'rgba(234,179,8,0.05)' :
                      current.status === 'TERLAMBAT' ? 'rgba(249,115,22,0.05)' : 'transparent';
                    const rowBorder = !sudah ? 'var(--color-border)' :
                      current.status === 'ALPHA'     ? 'rgba(239,68,68,0.15)' :
                      current.status === 'HADIR'     ? 'rgba(34,197,94,0.15)' :
                      current.status === 'SAKIT'     ? 'rgba(234,179,8,0.15)' :
                      current.status === 'TERLAMBAT' ? 'rgba(249,115,22,0.15)' : 'var(--color-border)';
                    return (
                      <div key={siswa.id} style={{ padding: '8px 10px', borderRadius: 10, border: `1px solid ${rowBorder}`, background: rowBg, transition: 'background 0.1s', marginBottom: 3 }}>
                        {/* Satu baris: nomor + avatar + nama + tombol */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--color-muted)', width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                          <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: si?.bgLight || 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: si?.color || 'var(--color-muted)' }}>
                            {siswa.nama?.charAt(0)?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siswa.nama}</p>
                            <p style={{ margin: 0, fontSize: 10, fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                              {siswa.nis}
                              {!sudah && <span style={{ marginLeft: 5, color: '#f97316', fontWeight: 600 }}>· belum</span>}
                              {sudah && si && <span style={{ marginLeft: 5, fontWeight: 700, color: si.color }}>✓ {si.title}</span>}
                            </p>
                          </div>
                          {/* Tombol status — kecil, satu baris */}
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            {STATUS_OPTIONS.map(s => {
                              const isActive = sudah && current.status === s.value;
                              return (
                                <button key={s.value} onClick={() => handleStatusChange(siswa.id, s.value)} title={s.title}
                                  style={{
                                    minWidth: 28, height: 28, padding: '0 5px',
                                    borderRadius: 5, fontSize: 10, fontWeight: 700,
                                    border: `1.5px solid ${isActive ? s.bg : 'var(--color-border)'}`,
                                    background: isActive ? s.bgLight : 'transparent',
                                    color: isActive ? s.color : sudah ? 'var(--color-muted)' : 'rgba(148,163,184,0.4)',
                                    cursor: 'pointer', transition: 'all 0.1s',
                                    outline: isActive ? `2px solid ${s.bg}` : 'none', outlineOffset: 1,
                                    opacity: sudah ? 1 : 0.45,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                  {s.label}
                                </button>
                              );
                            })}
                            {/* Tombol hapus */}
                            {sudah && current.absensiId && canDelete && (
                              <button onClick={() => handleHapusAbsensi(siswa.id, current.absensiId)} title="Hapus absensi"
                                style={{ width: 28, height: 28, borderRadius: 5, fontSize: 13, fontWeight: 700, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Input menit/keterangan — di bawah jika perlu */}
                        {sudah && (current.status === 'TERLAMBAT' || current.status === 'PULANG_CEPAT') && (
                          <input type="number" placeholder="menit" value={current.menit || ''} onChange={e => handleFieldChange(siswa.id, 'menit', e.target.value)} className="input" style={{ marginTop: 5, width: '100%', fontSize: 12, padding: '5px 8px' }} />
                        )}
                        {sudah && ['SAKIT','IZIN','DISPENSASI','LAINNYA'].includes(current.status) && (
                          <input placeholder="keterangan" value={current.keterangan || ''} onChange={e => handleFieldChange(siswa.id, 'keterangan', e.target.value)} className="input" style={{ marginTop: 5, width: '100%', fontSize: 12, padding: '5px 8px' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Floating save */}
          {absensiResponse?.siswa?.length > 0 && (
            <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50 }}>
              <button onClick={handleSave} disabled={saveMut.isPending} className="btn btn-primary"
                style={{ boxShadow: '0 8px 24px rgba(59,130,246,0.4)', padding: '10px 20px' }}>
                <Save style={{ width: 16, height: 16 }} />
                {saveMut.isPending ? 'Menyimpan...' : `Simpan Absensi (${absensiResponse.siswa.length} siswa)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
