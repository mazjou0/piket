import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trash2, Plus, UserCheck, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';

const HARI = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_COLOR = ['', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PetugasPiketPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);

  const [showModal, setShowModal] = useState(false);
  const [selectedHari, setSelectedHari] = useState(null); // { hari, namaHari }
  const [searchGuru, setSearchGuru] = useState('');

  // Jadwal piket
  const { data: jadwal, isLoading } = useQuery({
    queryKey: ['petugas-piket'],
    queryFn: () => api.get('/petugas-piket').then(r => r.data.data),
  });

  // Daftar guru untuk dipilih
  const { data: guruData } = useQuery({
    queryKey: ['guru-list-piket', searchGuru],
    queryFn: () => api.get('/guru', { params: { limit: 100, search: searchGuru, aktif: true } }).then(r => r.data.data),
    enabled: showModal,
  });

  const assignMut = useMutation({
    mutationFn: ({ guruId, hari }) => api.post('/petugas-piket', { guruId, hari }),
    onSuccess: (res) => {
      const { akunBaru } = res.data.data || {};
      if (akunBaru) {
        // Tampilkan info akun baru dengan durasi lebih lama
        toast.success(
          `✓ Ditambahkan\nAkun baru dibuat:\nUsername: ${akunBaru.username}\nPassword: ${akunBaru.password}`,
          { duration: 8000 }
        );
        // Toast kedua khusus kredensial agar mudah dicatat
        toast((t) => (
          <div style={{ fontSize: 13 }}>
            <strong>🔑 Kredensial Login</strong>
            <div style={{ marginTop: 6, fontFamily: 'monospace', background: 'rgba(0,0,0,0.1)', padding: '6px 8px', borderRadius: 6 }}>
              <div>Username: <strong>{akunBaru.username}</strong></div>
              <div>Password: <strong>{akunBaru.password}</strong></div>
            </div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Sampaikan ke guru yang bersangkutan</div>
          </div>
        ), { duration: 12000, icon: null });
      } else {
        toast.success(res.data.message);
      }
      qc.invalidateQueries(['petugas-piket']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menambahkan'),
  });

  const removeMut = useMutation({
    mutationFn: (id) => api.delete(`/petugas-piket/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['petugas-piket']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const clearMut = useMutation({
    mutationFn: (hari) => api.delete(`/petugas-piket/hari/${hari}`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['petugas-piket']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal mengosongkan'),
  });

  // Cari guru yang sudah terdaftar di hari yang dipilih
  const assignedGuruIds = selectedHari
    ? (jadwal?.find(j => j.hari === selectedHari.hari)?.petugas || []).map(p => p.guruId)
    : [];

  const filteredGuru = (guruData || []).filter(g => !assignedGuruIds.includes(g.id));

  const openModal = (hari) => {
    setSelectedHari(hari);
    setSearchGuru('');
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ color: 'var(--color-muted)', fontSize: 14 }}>Memuat jadwal...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Jadwal Petugas Piket</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>
            Kelola guru yang bertugas piket setiap hari
          </p>
        </div>
      </div>

      {/* Grid hari */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {(jadwal || []).map((item) => {
          const color = HARI_COLOR[item.hari];
          return (
            <div
              key={item.hari}
              className="card"
              style={{ padding: 0, overflow: 'hidden', border: `1px solid var(--color-border)` }}
            >
              {/* Header hari */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: `${color}18`,
                borderBottom: `2px solid ${color}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-foreground)' }}>
                    {item.namaHari}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: `${color}25`, color,
                    fontWeight: 600,
                  }}>
                    {item.petugas.length} petugas
                  </span>
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {item.petugas.length > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Kosongkan semua piket ${item.namaHari}?`)) {
                            clearMut.mutate(item.hari);
                          }
                        }}
                        title={`Kosongkan piket ${item.namaHari}`}
                        style={{
                          padding: '4px 8px', borderRadius: 6, border: 'none',
                          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        }}
                      >
                        Kosongkan
                      </button>
                    )}
                    <button
                      onClick={() => openModal(item)}
                      title={`Tambah piket ${item.namaHari}`}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none',
                        background: `${color}20`, color,
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Plus style={{ width: 12, height: 12 }} /> Tambah
                    </button>
                  </div>
                )}
              </div>

              {/* Daftar petugas */}
              <div style={{ padding: '8px 0', minHeight: 60 }}>
                {item.petugas.length === 0 ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 60, color: 'var(--color-muted)', fontSize: 13,
                    fontStyle: 'italic',
                  }}>
                    Belum ada petugas
                  </div>
                ) : (
                  item.petugas.map((p, idx) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 16px',
                        background: idx % 2 === 1 ? 'var(--color-surface-hover)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: p.guru.foto
                          ? `url(${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${p.guru.foto}) center/cover`
                          : `${color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color,
                        border: `1.5px solid ${color}40`,
                      }}>
                        {!p.guru.foto && p.guru.nama.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.guru.nama}
                        </p>
                        {p.guru.nip && (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                            {p.guru.nip}
                          </p>
                        )}
                      </div>

                      {/* Hapus */}
                      {canEdit && (
                        <button
                          onClick={() => removeMut.mutate(p.id)}
                          disabled={removeMut.isPending}
                          title="Hapus dari jadwal"
                          style={{
                            padding: 4, borderRadius: 6, border: 'none',
                            background: 'transparent', color: 'var(--color-muted)',
                            cursor: 'pointer', flexShrink: 0,
                            transition: 'color 0.15s, background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <X style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal pilih guru */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setSelectedHari(null); }}
        title={`Tambah Petugas Piket — ${selectedHari?.namaHari || ''}`}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search guru */}
          <input
            type="text"
            value={searchGuru}
            onChange={e => setSearchGuru(e.target.value)}
            placeholder="Cari nama guru..."
            className="input"
            autoFocus
          />

          {/* List guru */}
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredGuru.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                {searchGuru ? 'Guru tidak ditemukan' : 'Semua guru sudah terdaftar untuk hari ini'}
              </div>
            ) : (
              filteredGuru.map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    assignMut.mutate({ guruId: g.id, hari: selectedHari.hari });
                  }}
                  disabled={assignMut.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-hover)', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = HARI_COLOR[selectedHari?.hari] || 'var(--color-primary)';
                    e.currentTarget.style.background = `${HARI_COLOR[selectedHari?.hari]}18` || 'var(--color-surface)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: g.foto
                      ? `url(${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${g.foto}) center/cover`
                      : 'rgba(var(--color-primary-rgb),0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'var(--color-primary)',
                  }}>
                    {!g.foto && g.nama.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)' }}>
                      {g.nama}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                      {g.nip || 'Tanpa NIP'}
                    </p>
                  </div>
                  <Plus style={{ width: 16, height: 16, color: 'var(--color-muted)', flexShrink: 0 }} />
                </button>
              ))
            )}
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => { setShowModal(false); setSelectedHari(null); }}
          >
            Tutup
          </button>
        </div>
      </Modal>
    </div>
  );
}
