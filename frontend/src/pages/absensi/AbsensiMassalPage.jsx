import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Calendar, History, RefreshCw, Trash2, RotateCcw } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'HADIR',       label: 'Hadir',        color: '#4ade80' },
  { value: 'SAKIT',       label: 'Sakit',        color: '#f59e0b' },
  { value: 'IZIN',        label: 'Izin',         color: '#6366f1' },
  { value: 'ALPHA',       label: 'Alpha',        color: '#ef4444' },
  { value: 'DISPENSASI',  label: 'Dispensasi',   color: '#14b8a6' },
  { value: 'DINAS',       label: 'Dinas / PKL',  color: '#8b5cf6' },
];

const STATUS_COLOR = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s.color]));

/* ── Panel Riwayat Absensi Massal ── */
function RiwayatMassalPanel({ onRefetch, onIsiUlang }) {
  const qc = useQueryClient();
  const [konfirmHapus, setKonfirmHapus] = useState(null); // log item yang akan dihapus

  // Load daftar kelas untuk lookup nama dari UUID
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-aktif'],
    queryFn: () => api.get('/kelas', { params: { aktif: true, limit: 100 } }).then(r => r.data.data),
  });
  const kelasMap = Object.fromEntries(kelasList.map(k => [k.id, k.nama]));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['riwayat-massal'],
    queryFn: () => api.get('/audit', { params: { tabel: 'absensi', limit: 30 } })
      .then(r => r.data.data?.filter(a =>
        ['SIMPAN_MASSAL_TINGKAT','SIMPAN_MASSAL_RENTANG'].includes(a.aksi)
      )),
  });

  // Mutation hapus massal
  const hapusMut = useMutation({
    mutationFn: (payload) => api.delete('/absensi/massal', { data: payload }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setKonfirmHapus(null);
      refetch();
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Gagal menghapus');
      setKonfirmHapus(null);
    },
  });

  const fmtTgl = (s) => s
    ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

  const resolveKelas = (d) => {
    if (d.kelasNama?.length) return d.kelasNama;
    const ids = d.kelasIds || [];
    if (ids.length) {
      const names = ids.map(id => kelasMap[id] || null).filter(Boolean);
      if (names.length) return names;
      return ids;
    }
    if (d.tingkat) {
      const roman = d.tingkat === 10 ? 'X' : d.tingkat === 11 ? 'XI' : 'XII';
      return [`Semua Kelas ${roman}`];
    }
    return [];
  };

  // Bangun payload hapus dari log item
  const buildHapusPayload = (d) => ({
    kelasIds: d.kelasIds || [],
    tanggalMulai:  d.tanggalMulai  || d.tanggal,
    tanggalSelesai: d.tanggalSelesai || d.tanggal,
    sesi: d.sesi || undefined,
    status: d.status || undefined,
  });

  // Bangun payload isi ulang (timpa) dari log item
  const buildIsiUlangPayload = (d, isRentang) => {
    if (isRentang) {
      return {
        kelasIds: d.kelasIds || [],
        tanggalMulai: d.tanggalMulai,
        tanggalSelesai: d.tanggalSelesai,
        sesi: d.sesi || 'PAGI',
        status: d.status || 'HADIR',
        keterangan: d.keterangan,
        overwrite: true,
      };
    }
    return {
      kelasIds: d.kelasIds || [],
      tanggal: d.tanggal,
      sesi: d.sesi || 'PAGI',
      status: d.status || 'HADIR',
      keterangan: d.keterangan,
    };
  };

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History style={{ width: 15, height: 15, color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)' }}>
            Riwayat Absensi Massal
          </span>
        </div>
        <button onClick={() => refetch()} disabled={isLoading}
          className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 64, borderRadius: 8, background: 'var(--color-surface-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
          Belum ada riwayat absensi massal
        </p>
      )}

      {data?.map((log, i) => {
        const d          = log.dataAfter || {};
        const isRentang  = log.aksi === 'SIMPAN_MASSAL_RENTANG';
        const statusVal  = d.status || '-';
        const statusClr  = STATUS_COLOR[statusVal] || 'var(--color-muted)';
        const kelasArr   = resolveKelas(d);
        const kelasTxt   = kelasArr.length > 5
          ? `${kelasArr.slice(0,5).join(', ')} +${kelasArr.length-5} lainnya`
          : kelasArr.join(', ') || '-';
        const isKonfirm  = konfirmHapus?.id === (log.id || i);

        return (
          <div key={log.id || i} style={{
            padding: '10px 12px', borderRadius: 8, marginBottom: 6,
            background: 'var(--color-surface-hover)',
            border: `1px solid ${isKonfirm ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`,
            transition: 'border-color 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Badge tipe */}
              <div style={{
                flexShrink: 0, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, marginTop: 2,
                background: isRentang ? 'rgba(139,92,246,0.15)' : 'rgba(var(--color-primary-rgb),0.12)',
                color: isRentang ? '#a78bfa' : 'var(--color-primary)',
                whiteSpace: 'nowrap',
              }}>
                {isRentang ? '📅 Rentang' : '📋 Per Kelas'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                    background: `${statusClr}18`, color: statusClr, border: `1px solid ${statusClr}30`,
                  }}>{statusVal}</span>
                  {isRentang ? (
                    <span style={{ fontSize: 12, color: 'var(--color-foreground)', fontWeight: 600 }}>
                      {fmtTgl(d.tanggalMulai)} — {fmtTgl(d.tanggalSelesai)}
                      {d.jumlahHari ? <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> ({d.jumlahHari} hari kerja)</span> : ''}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--color-foreground)', fontWeight: 600 }}>
                      {fmtTgl(d.tanggal)}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Kelas: <span style={{ color: 'var(--color-foreground)' }}>{kelasTxt}</span>
                  {d.jumlahSiswa ? <span> · {d.jumlahSiswa} siswa</span> : ''}
                  {d.baru !== undefined && <span> · Baru: <strong style={{ color: '#4ade80' }}>{d.baru}</strong> · Update: <strong style={{ color: '#f59e0b' }}>{d.diupdate ?? d.diupdate}</strong></span>}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--color-muted)' }}>
                  {log.user?.username || '—'} · {fmtTgl(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Tombol aksi */}
              {!isKonfirm && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {/* Isi Ulang — pindah ke tab + isi form */}
                  <button
                    onClick={() => onIsiUlang?.(buildIsiUlangPayload(d, isRentang), isRentang)}
                    title="Isi ulang dengan pengaturan yang sama"
                    className="btn btn-ghost btn-icon"
                    style={{ color: 'var(--color-primary)', fontSize: 12, padding: '4px 8px' }}
                  >
                    <RotateCcw style={{ width: 13, height: 13 }} />
                  </button>
                  {/* Hapus */}
                  <button
                    onClick={() => setKonfirmHapus({ id: log.id || i, payload: buildHapusPayload(d), kelasTxt })}
                    title="Hapus semua record absensi ini"
                    className="btn btn-ghost btn-icon"
                    style={{ color: '#ef4444', fontSize: 12, padding: '4px 8px' }}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              )}
            </div>

            {/* Panel konfirmasi hapus */}
            {isKonfirm && (
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#f87171', fontWeight: 600 }}>
                  ⚠ Hapus semua record absensi untuk kelas ini?
                </p>
                <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--color-muted)' }}>
                  Kelas: <strong>{konfirmHapus.kelasTxt}</strong> · Status: <strong>{statusVal}</strong>
                  {isRentang ? ` · ${fmtTgl(d.tanggalMulai)} — ${fmtTgl(d.tanggalSelesai)}` : ` · ${fmtTgl(d.tanggal)}`}
                  <br />Tindakan ini <strong>tidak dapat dibatalkan</strong>.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setKonfirmHapus(null)}
                    className="btn btn-secondary"
                    style={{ padding: '5px 16px', fontSize: 12 }}
                    disabled={hapusMut.isPending}
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => hapusMut.mutate(konfirmHapus.payload)}
                    className="btn btn-danger"
                    style={{ padding: '5px 16px', fontSize: 12 }}
                    disabled={hapusMut.isPending}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                    {hapusMut.isPending ? 'Menghapus...' : 'Ya, Hapus Semua'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {data?.length >= 30 && (
        <p style={{ fontSize: 11, color: 'var(--color-muted)', textAlign: 'center', marginTop: 6 }}>
          Menampilkan 30 riwayat terbaru
        </p>
      )}
    </div>
  );
}

/* ── Tab: Massal per Tingkat / Kelas ── */
function MassalTingkatForm({ onDone, prefill }) {
  const [form, setForm] = useState({
    mode: 'tingkat', tingkat: '10', kelasIds: [],
    tanggal: new Date().toISOString().split('T')[0],
    sesi: 'PAGI', status: 'HADIR', keterangan: '',
    ...(prefill || {}),
  });
  const [result, setResult] = useState(null);

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-aktif'],
    queryFn: () => api.get('/kelas', { params: { aktif: true, limit: 100 } }).then(r => r.data.data),
  });

  const mut = useMutation({
    mutationFn: (payload) => api.post('/absensi/simpan-massal-tingkat', payload),
    onSuccess: (res) => { toast.success(res.data.message); setResult(res.data.data); onDone?.(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  const toggleKelas = (id) => setForm(f => ({
    ...f, kelasIds: f.kelasIds.includes(id) ? f.kelasIds.filter(k=>k!==id) : [...f.kelasIds, id],
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault(); setResult(null);
    const payload = { tanggal: form.tanggal, sesi: form.sesi, status: form.status, keterangan: form.keterangan || undefined };
    if (form.mode === 'tingkat') { payload.tingkat = parseInt(form.tingkat); }
    else { if (!form.kelasIds.length) { toast.error('Pilih minimal satu kelas'); return; } payload.kelasIds = form.kelasIds; }
    mut.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[['tingkat','Per Tingkat'],['kelas','Pilih Kelas']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => set('mode', v)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: form.mode===v ? 'var(--color-primary)' : 'var(--color-surface-hover)', color: form.mode===v ? '#fff' : 'var(--color-muted)' }}>{l}</button>
        ))}
      </div>
      {form.mode === 'tingkat' ? (
        <div><label className="label">Tingkat</label>
          <select value={form.tingkat} onChange={e => set('tingkat', e.target.value)} className="input">
            <option value="10">Kelas 10</option><option value="11">Kelas 11</option><option value="12">Kelas 12</option>
          </select>
        </div>
      ) : (
        <div><label className="label">Pilih Kelas</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', maxHeight: 160, overflowY: 'auto' }}>
            {kelasList?.map(k => (
              <button key={k.id} type="button" onClick={() => toggleKelas(k.id)}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: form.kelasIds.includes(k.id) ? 'var(--color-primary)' : 'var(--color-surface)', color: form.kelasIds.includes(k.id) ? '#fff' : 'var(--color-foreground)' }}
              >{k.nama}</button>
            ))}
          </div>
          {form.kelasIds.length > 0 && <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>{form.kelasIds.length} kelas dipilih</p>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label className="label">Tanggal</label><input type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} className="input" required /></div>
        <div><label className="label">Sesi</label><select value={form.sesi} onChange={e => set('sesi', e.target.value)} className="input"><option value="PAGI">Pagi</option><option value="SIANG">Siang</option></select></div>
      </div>
      <div><label className="label">Status Absensi</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} type="button" onClick={() => set('status', s.value)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${form.status===s.value ? s.color : 'var(--color-border)'}`, background: form.status===s.value ? `${s.color}22` : 'var(--color-surface-hover)', color: form.status===s.value ? s.color : 'var(--color-muted)' }}
            >{s.label}</button>
          ))}
        </div>
      </div>
      <div><label className="label">Keterangan (opsional)</label><input value={form.keterangan} onChange={e => set('keterangan', e.target.value)} className="input" placeholder="Contoh: Libur HUT sekolah" /></div>
      <button type="submit" className="btn btn-primary" disabled={mut.isPending} style={{ alignSelf: 'flex-end', padding: '9px 24px' }}>
        <Users style={{ width: 15, height: 15 }} />{mut.isPending ? 'Menyimpan...' : 'Simpan Absensi Massal'}
      </button>
      {result && (
        <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#4ade80', fontSize: 13 }}>✅ Berhasil</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>Kelas: {result.kelas?.join(', ')} · {result.jumlahSiswa} siswa · Baru: <strong style={{ color: '#4ade80' }}>{result.baru}</strong> · Update: <strong style={{ color: '#f59e0b' }}>{result.diupdate}</strong></p>
        </div>
      )}
    </form>
  );
}

/* ── Tab: Massal Rentang Tanggal ── */
function MassalRentangForm({ onDone, prefill }) {
  const [form, setForm] = useState({
    kelasIds: [], tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date().toISOString().split('T')[0],
    sesi: 'PAGI', status: 'DINAS', keterangan: '', overwrite: false,
    ...(prefill || {}),
  });
  const [result, setResult] = useState(null);

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-aktif'],
    queryFn: () => api.get('/kelas', { params: { aktif: true, limit: 100 } }).then(r => r.data.data),
  });

  const mut = useMutation({
    mutationFn: (payload) => api.post('/absensi/simpan-massal-rentang', payload),
    onSuccess: (res) => { toast.success(res.data.message); setResult(res.data.data); onDone?.(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  const toggleKelas = (id) => setForm(f => ({
    ...f, kelasIds: f.kelasIds.includes(id) ? f.kelasIds.filter(k=>k!==id) : [...f.kelasIds, id],
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault(); setResult(null);
    if (!form.kelasIds.length) { toast.error('Pilih minimal satu kelas'); return; }
    mut.mutate({ kelasIds: form.kelasIds, tanggalMulai: form.tanggalMulai, tanggalSelesai: form.tanggalSelesai, sesi: form.sesi, status: form.status, keterangan: form.keterangan || undefined, hariKerja: [1,2,3,4,5], skipHariLibur: true, overwrite: form.overwrite });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><label className="label">Pilih Kelas *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', maxHeight: 160, overflowY: 'auto' }}>
          {kelasList?.map(k => (
            <button key={k.id} type="button" onClick={() => toggleKelas(k.id)}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: form.kelasIds.includes(k.id) ? 'var(--color-primary)' : 'var(--color-surface)', color: form.kelasIds.includes(k.id) ? '#fff' : 'var(--color-foreground)' }}
            >{k.nama}</button>
          ))}
        </div>
        {form.kelasIds.length > 0 && <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>{form.kelasIds.length} kelas dipilih</p>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div><label className="label">Tanggal Mulai</label><input type="date" value={form.tanggalMulai} onChange={e => set('tanggalMulai', e.target.value)} className="input" required /></div>
        <div><label className="label">Tanggal Selesai</label><input type="date" value={form.tanggalSelesai} onChange={e => set('tanggalSelesai', e.target.value)} className="input" required /></div>
        <div><label className="label">Sesi</label><select value={form.sesi} onChange={e => set('sesi', e.target.value)} className="input"><option value="PAGI">Pagi</option><option value="SIANG">Siang</option></select></div>
      </div>
      <div><label className="label">Status Absensi</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} type="button" onClick={() => set('status', s.value)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${form.status===s.value ? s.color : 'var(--color-border)'}`, background: form.status===s.value ? `${s.color}22` : 'var(--color-surface-hover)', color: form.status===s.value ? s.color : 'var(--color-muted)' }}
            >{s.label}</button>
          ))}
        </div>
      </div>
      <div><label className="label">Keterangan (opsional)</label><input value={form.keterangan} onChange={e => set('keterangan', e.target.value)} className="input" placeholder="Contoh: PKL Gelombang 1" /></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--color-muted)' }}>
        <input type="checkbox" checked={form.overwrite} onChange={e => set('overwrite', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--color-primary)' }} />
        Timpa absensi yang sudah ada
      </label>
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)', fontSize: 12, color: 'var(--color-muted)' }}>
        <strong style={{ color: 'var(--color-foreground)' }}>Info:</strong> Hanya memproses hari Senin–Jumat dan melewati hari libur nasional secara otomatis. Maksimal rentang 6 bulan.
      </div>
      <button type="submit" className="btn btn-primary" disabled={mut.isPending} style={{ alignSelf: 'flex-end', padding: '9px 24px' }}>
        <Calendar style={{ width: 15, height: 15 }} />{mut.isPending ? 'Memproses...' : 'Simpan Absensi Rentang'}
      </button>
      {result && (
        <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#4ade80', fontSize: 13 }}>✅ Selesai</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.8 }}>
            Kelas: {result.kelas?.join(', ')}<br />
            {result.jumlahHariDiproses} hari kerja · {result.jumlahSiswa} siswa · Baru: <strong style={{ color: '#4ade80' }}>{result.baru}</strong> · Update: <strong style={{ color: '#f59e0b' }}>{result.diupdate}</strong> · Dilewati: <strong>{result.dilewati}</strong>
          </p>
        </div>
      )}
    </form>
  );
}

/* ── Halaman Utama ── */
export default function AbsensiMassalPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('tingkat');
  const [prefillRentang, setPrefillRentang]   = useState(null);
  const [prefillTingkat, setPrefillTingkat]   = useState(null);

  const handleDone = () => {
    qc.invalidateQueries({ queryKey: ['riwayat-massal'] });
  };

  // Dipanggil dari tombol Isi Ulang di riwayat
  const handleIsiUlang = (payload, isRentang) => {
    if (isRentang) {
      setPrefillRentang(payload);
      setTab('rentang');
    } else {
      setPrefillTingkat(payload);
      setTab('tingkat');
    }
    toast.success('Form sudah diisi ulang — cek dan klik Simpan');
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Absensi Massal</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>
            Input absensi sekaligus untuk banyak kelas atau rentang tanggal
          </p>
        </div>
      </div>

      {/* Tab — 3 tab sejajar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
        {[
          { key: 'tingkat', label: '📋 Per Tingkat / Kelas', desc: 'Satu hari' },
          { key: 'rentang', label: '📅 Rentang Tanggal',     desc: 'PKL, magang, dll' },
          { key: 'riwayat', label: '🕒 Riwayat',             desc: 'Rekam yang sudah diset' },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab===t.key ? 700 : 500, fontSize: 13, color: tab===t.key ? 'var(--color-primary)' : 'var(--color-muted)', borderBottom: tab===t.key ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -1 }}
          >
            {t.label}
            <span style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Konten tab */}
      {tab === 'tingkat' && <div className="card"><MassalTingkatForm onDone={handleDone} prefill={prefillTingkat} /></div>}
      {tab === 'rentang' && <div className="card"><MassalRentangForm onDone={handleDone} prefill={prefillRentang} /></div>}
      {tab === 'riwayat' && <RiwayatMassalPanel onIsiUlang={handleIsiUlang} />}
    </div>
  );
}
