import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Clock, ToggleLeft, ToggleRight, Save, Info } from 'lucide-react';

export default function AutoAbsensiSetting() {
  const [form, setForm] = useState({
    enabled: false,
    jamPagi: '07:00',
    enableSiang: false,
    jamSiang: '13:00',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['setting-auto-absensi'],
    queryFn: () => api.get('/pengaturan/auto-absensi').then(r => r.data.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        enabled: data.enabled ?? false,
        jamPagi: data.jamPagi || '07:00',
        enableSiang: data.enableSiang ?? false,
        jamSiang: data.jamSiang || '13:00',
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (payload) => api.put('/pengaturan/auto-absensi', payload),
    onSuccess: () => toast.success('Pengaturan auto-absensi disimpan'),
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  const handleSave = () => saveMut.mutate(form);

  const Toggle = ({ value, onChange, label }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      {value
        ? <ToggleRight style={{ width: 32, height: 32, color: 'var(--color-primary)' }} />
        : <ToggleLeft style={{ width: 32, height: 32, color: 'var(--color-muted)' }} />}
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: value ? 'var(--color-primary)' : 'var(--color-muted)',
      }}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ padding: 8, borderRadius: 9, background: 'rgba(var(--color-primary-rgb),0.12)' }}>
          <Clock style={{ width: 18, height: 18, color: 'var(--color-primary)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
            ⏰ Auto Absensi Terjadwal
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
            Sistem otomatis mencatat semua siswa sebagai HADIR sesuai jadwal
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: 80, borderRadius: 10, background: 'var(--color-surface-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Toggle aktif/nonaktif */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: form.enabled ? 'rgba(34,197,94,0.05)' : 'var(--color-surface-hover)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>
                Status Auto Absensi
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
                {form.enabled ? '✅ Aktif — absensi HADIR otomatis dijalankan sesuai jadwal' : '⏸ Nonaktif — tidak ada absensi otomatis'}
              </p>
            </div>
            <Toggle
              value={form.enabled}
              onChange={v => setForm(f => ({ ...f, enabled: v }))}
              label={form.enabled ? 'Aktif' : 'Nonaktif'}
            />
          </div>

          {/* Jadwal Pagi */}
          <div style={{ opacity: form.enabled ? 1 : 0.5, pointerEvents: form.enabled ? 'auto' : 'none' }}>
            <label className="label" style={{ marginBottom: 6, display: 'block' }}>
              Jam Auto-Absensi Pagi (Sesi PAGI)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="time"
                value={form.jamPagi}
                onChange={e => setForm(f => ({ ...f, jamPagi: e.target.value }))}
                className="input"
                style={{ width: 140 }}
              />
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                Sistem akan otomatis catat HADIR jam ini setiap Senin–Jumat
              </span>
            </div>
          </div>

          {/* Jadwal Siang */}
          <div style={{ opacity: form.enabled ? 1 : 0.5, pointerEvents: form.enabled ? 'auto' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="label" style={{ margin: 0 }}>
                Sesi SIANG (Opsional)
              </label>
              <Toggle
                value={form.enableSiang}
                onChange={v => setForm(f => ({ ...f, enableSiang: v }))}
                label={form.enableSiang ? 'Aktif' : 'Nonaktif'}
              />
            </div>
            {form.enableSiang && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="time"
                  value={form.jamSiang}
                  onChange={e => setForm(f => ({ ...f, jamSiang: e.target.value }))}
                  className="input"
                  style={{ width: 140 }}
                />
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  Auto-absensi HADIR sesi siang jam ini
                </span>
              </div>
            )}
          </div>

          {/* Info penting */}
          <div style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.06)', display: 'flex', gap: 8 }}>
            <Info style={{ width: 15, height: 15, color: '#fde047', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--color-foreground)' }}>Catatan penting:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                <li>Auto-absensi hanya mencatat siswa yang <strong>belum ada absensi</strong> di hari tersebut</li>
                <li>Hari libur dan hari Sabtu–Minggu dilewati otomatis</li>
                <li>Petugas piket tetap bisa mengubah status (Sakit/Izin/dll) via menu Input Absensi</li>
                <li>Perubahan jadwal aktif setelah klik Simpan — tidak perlu restart server</li>
              </ul>
            </div>
          </div>

          {/* Tombol simpan */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saveMut.isPending}
              className="btn btn-primary"
            >
              <Save style={{ width: 15, height: 15 }} />
              {saveMut.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
