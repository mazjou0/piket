import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Clock, ToggleLeft, ToggleRight, Save, Info,
  CheckCircle, Calendar, Zap, Play, RefreshCw,
} from 'lucide-react';

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
    >
      {value
        ? <ToggleRight style={{ width: 36, height: 36, color: 'var(--color-primary)' }} />
        : <ToggleLeft  style={{ width: 36, height: 36, color: 'var(--color-muted)'   }} />}
    </button>
  );
}

export default function AutoAbsensiPage() {
  const [form, setForm] = useState({
    enabled: false,
    jamPagi: '07:00',
    enableSiang: false,
    jamSiang: '13:00',
    hariKerja: [1,2,3,4,5],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['setting-auto-absensi'],
    queryFn: () => api.get('/pengaturan/auto-absensi').then(r => r.data.data),
  });

  // Log eksekusi auto-absensi
  const { data: logData, refetch: refetchLog, isFetching: logFetching } = useQuery({
    queryKey: ['auto-absensi-log'],
    queryFn: () => api.get('/pengaturan/auto-absensi/log').then(r => r.data.data),
    refetchInterval: 30000, // auto refresh tiap 30 detik
  });

  useEffect(() => {
    if (data) {
      setForm({
        enabled:     data.enabled     ?? false,
        jamPagi:     data.jamPagi     || '07:00',
        enableSiang: data.enableSiang ?? false,
        jamSiang:    data.jamSiang    || '13:00',
        hariKerja:   data.hariKerja   || [1,2,3,4,5],
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (payload) => api.put('/pengaturan/auto-absensi', payload),
    onSuccess: () => toast.success('Pengaturan auto-absensi berhasil disimpan'),
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  // Jalankan manual absensi hari ini
  const manualMut = useMutation({
    mutationFn: ({ sesi }) => api.post('/absensi/simpan-massal-tingkat', {
      tanggal: new Date().toISOString().split('T')[0],
      sesi,
      status: 'HADIR',
    }),
    onSuccess: (res, { sesi }) => {
      toast.success(`Manual ${sesi}: ${res.data.data?.baru ?? 0} siswa dicatat HADIR`);
      refetchLog();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menjalankan manual'),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 12, background: 'var(--color-surface-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>

      {/* Header */}
      <div>
        <h1 className="page-title">Auto Absensi Terjadwal</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>
          Sistem otomatis mencatat semua siswa aktif sebagai HADIR sesuai jadwal
        </p>
      </div>

      {/* Status card */}
      <div className="card" style={{
        border: `1px solid ${form.enabled ? 'rgba(34,197,94,0.35)' : 'var(--color-border)'}`,
        background: form.enabled ? 'rgba(34,197,94,0.05)' : 'var(--color-surface-hover)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: 10, borderRadius: 10, flexShrink: 0,
              background: form.enabled ? 'rgba(34,197,94,0.15)' : 'var(--color-surface)',
            }}>
              <Zap style={{
                width: 22, height: 22,
                color: form.enabled ? '#4ade80' : 'var(--color-muted)',
              }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
                Status Auto Absensi
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-muted)' }}>
                {form.enabled
                  ? '✅ Aktif — absensi HADIR otomatis berjalan sesuai jadwal'
                  : '⏸ Nonaktif — tidak ada absensi otomatis'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: form.enabled ? '#4ade80' : 'var(--color-muted)',
            }}>
              {form.enabled ? 'Aktif' : 'Nonaktif'}
            </span>
            <Toggle value={form.enabled} onChange={v => set('enabled', v)} />
          </div>
        </div>
      </div>

      {/* Jadwal Pagi */}
      <div className="card" style={{ opacity: form.enabled ? 1 : 0.55 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Clock style={{ width: 16, height: 16, color: '#f59e0b' }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
            Sesi Pagi
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label className="label">Jam Mulai</label>
            <input
              type="time"
              value={form.jamPagi}
              onChange={e => set('jamPagi', e.target.value)}
              disabled={!form.enabled}
              className="input"
              style={{ width: 130 }}
            />
          </div>
          <div style={{ flex: 1, paddingTop: 20 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
              Setiap <strong style={{ color: 'var(--color-foreground)' }}>Senin – Jumat</strong>, sistem akan mencatat
              semua siswa aktif sebagai <strong style={{ color: '#4ade80' }}>HADIR</strong> pada jam ini.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface-hover)', fontSize: 12, color: 'var(--color-muted)' }}>
          Jadwal cron: setiap hari <strong style={{ fontFamily: 'monospace', color: 'var(--color-foreground)' }}>{form.jamPagi}</strong> WIB (Senin–Jumat)
        </div>

        {/* Pilihan hari kerja */}
        <div style={{ marginTop: 14 }}>
          <label className="label" style={{ marginBottom: 8, display: 'block' }}>
            Hari Aktif Auto Absensi
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { val: 1, label: 'Sen' },
              { val: 2, label: 'Sel' },
              { val: 3, label: 'Rab' },
              { val: 4, label: 'Kam' },
              { val: 5, label: 'Jum' },
              { val: 6, label: 'Sab' },
              { val: 0, label: 'Min' },
            ].map(h => {
              const isOn = form.hariKerja?.includes(h.val);
              return (
                <button
                  key={h.val}
                  type="button"
                  disabled={!form.enabled}
                  onClick={() => {
                    const next = isOn
                      ? form.hariKerja.filter(d => d !== h.val)
                      : [...(form.hariKerja || []), h.val].sort((a,b)=>a-b);
                    if (next.length === 0) return; // minimal 1 hari
                    set('hariKerja', next);
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: form.enabled ? 'pointer' : 'not-allowed',
                    border: `1.5px solid ${isOn ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isOn ? 'rgba(var(--color-primary-rgb),0.12)' : 'var(--color-surface-hover)',
                    color: isOn ? 'var(--color-primary)' : 'var(--color-muted)',
                    opacity: form.enabled ? 1 : 0.5,
                    transition: 'all 0.15s',
                  }}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6 }}>
            Aktif: {(form.hariKerja || []).length === 0
              ? 'Tidak ada hari dipilih'
              : (form.hariKerja || []).map(d => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d]).join(', ')
            }
            {' '}·{' '}
            <button type="button" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-primary)', fontSize:11, padding:0 }}
              onClick={() => set('hariKerja', [1,2,3,4,5])}>
              Reset Senin–Jumat
            </button>
          </p>
        </div>
      </div>

      {/* Jadwal Siang */}
      <div className="card" style={{ opacity: form.enabled ? 1 : 0.55 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.enableSiang ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock style={{ width: 16, height: 16, color: '#6366f1' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
                Sesi Siang <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-muted)' }}>(Opsional)</span>
              </h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: form.enableSiang ? 'var(--color-primary)' : 'var(--color-muted)' }}>
              {form.enableSiang ? 'Aktif' : 'Nonaktif'}
            </span>
            <Toggle
              value={form.enableSiang}
              onChange={v => set('enableSiang', v)}
            />
          </div>
        </div>

        {form.enableSiang && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <label className="label">Jam Mulai</label>
              <input
                type="time"
                value={form.jamSiang}
                onChange={e => set('jamSiang', e.target.value)}
                disabled={!form.enabled}
                className="input"
                style={{ width: 130 }}
              />
            </div>
            <div style={{ flex: 1, paddingTop: 20 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                Auto-absensi <strong style={{ color: '#4ade80' }}>HADIR</strong> sesi siang pada jam ini.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info penting */}
      <div style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.06)', display: 'flex', gap: 10 }}>
        <Info style={{ width: 16, height: 16, color: '#fde047', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--color-foreground)', display: 'block', marginBottom: 4 }}>Catatan Penting:</strong>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Hanya mencatat siswa yang <strong>belum ada absensi</strong> di hari tersebut</li>
            <li>Hari libur dan hari Sabtu–Minggu dilewati otomatis</li>
            <li>Petugas piket tetap bisa mengubah status (Sakit/Izin/dll) via Input Absensi</li>
            <li>Perubahan jadwal aktif langsung setelah disimpan — tanpa perlu restart server</li>
          </ul>
        </div>
      </div>

      {/* Tombol simpan */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={saveMut.mutate.bind(null, form)}
          disabled={saveMut.isPending}
          className="btn btn-primary"
          style={{ padding: '9px 24px' }}
        >
          <Save style={{ width: 15, height: 15 }} />
          {saveMut.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      {/* Jadwal aktif summary */}
      {form.enabled && (
        <div className="card" style={{ border: '1px solid rgba(var(--color-primary-rgb),0.2)', background: 'rgba(var(--color-primary-rgb),0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Calendar style={{ width: 15, height: 15, color: 'var(--color-primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)' }}>
              Jadwal Aktif Saat Ini
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
              <CheckCircle style={{ width: 14, height: 14, color: '#4ade80', flexShrink: 0 }} />
              <span style={{ color: 'var(--color-muted)' }}>Sesi Pagi:</span>
              <strong style={{ color: 'var(--color-foreground)', fontFamily: 'monospace' }}>{form.jamPagi} WIB</strong>
              <span style={{ color: 'var(--color-muted)' }}>
                setiap {(form.hariKerja || [1,2,3,4,5]).map(d => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d]).join(', ')}
              </span>
            </div>
            {form.enableSiang && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
                <CheckCircle style={{ width: 14, height: 14, color: '#818cf8', flexShrink: 0 }} />
                <span style={{ color: 'var(--color-muted)' }}>Sesi Siang:</span>
                <strong style={{ color: 'var(--color-foreground)', fontFamily: 'monospace' }}>{form.jamSiang} WIB</strong>
                <span style={{ color: 'var(--color-muted)' }}>
                  setiap {(form.hariKerja || [1,2,3,4,5]).map(d => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d]).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Jalankan Manual ── */}
      <div className="card" style={{ border: '1px solid rgba(var(--color-primary-rgb),0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Play style={{ width: 15, height: 15, color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)' }}>
            Jalankan Manual Sekarang
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-muted)' }}>
          Catat semua siswa aktif sebagai <strong>HADIR</strong> hari ini tanpa menunggu jadwal otomatis.
          Siswa yang sudah ada absensinya akan dilewati.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => manualMut.mutate({ sesi: 'PAGI' })}
            disabled={manualMut.isPending}
            className="btn btn-primary"
            style={{ fontSize: 13 }}
          >
            <Play style={{ width: 13, height: 13 }} />
            {manualMut.isPending ? 'Memproses...' : 'Jalankan Sesi Pagi'}
          </button>
          {form.enableSiang && (
            <button
              onClick={() => manualMut.mutate({ sesi: 'SIANG' })}
              disabled={manualMut.isPending}
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              <Play style={{ width: 13, height: 13 }} />
              Jalankan Sesi Siang
            </button>
          )}
        </div>
      </div>

      {/* ── Log Eksekusi ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar style={{ width: 15, height: 15, color: 'var(--color-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)' }}>
              Log Eksekusi
            </span>
          </div>
          <button
            onClick={() => refetchLog()}
            disabled={logFetching}
            className="btn btn-secondary"
            style={{ padding: '5px 12px', fontSize: 12 }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} />
            {logFetching ? 'Memuat...' : 'Refresh'}
          </button>
        </div>

        {!logData?.length ? (
          <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', padding: '16px 0' }}>
            Belum ada log eksekusi
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {logData.map((log, i) => {
              const statusColor = log.status === 'SUKSES' ? '#4ade80' : log.status === 'SKIP' ? '#f59e0b' : '#ef4444';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface-hover)',
                  fontSize: 12,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{
                      padding: '1px 7px', borderRadius: 4, fontWeight: 700, fontSize: 10, flexShrink: 0,
                      background: `${statusColor}22`, color: statusColor,
                    }}>{log.status}</span>
                    <div>
                      <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>
                        Sesi {log.sesi}
                      </span>
                      {log.alasan && (
                        <span style={{ color: 'var(--color-muted)', marginLeft: 6 }}>— {log.alasan}</span>
                      )}
                      {log.status === 'SUKSES' && (
                        <span style={{ color: 'var(--color-muted)', marginLeft: 6 }}>
                          {log.baru} baru · {log.sudahAda} sudah ada
                          {log.durasi ? ` · ${log.durasi}ms` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'var(--color-muted)', fontSize: 11, flexShrink: 0 }}>
                    {log.waktu ? new Date(log.waktu).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
