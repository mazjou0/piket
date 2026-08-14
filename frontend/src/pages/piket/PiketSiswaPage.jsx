import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Search, ChevronRight, ChevronDown, Phone, User, Users } from 'lucide-react';

const JK_COLOR = { L: '#3b82f6', P: '#ec4899' };

function SiswaBadgeJK({ jk }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
      background: jk === 'L' ? 'rgba(59,130,246,0.12)' : 'rgba(236,72,153,0.12)',
      color: JK_COLOR[jk] || 'var(--color-muted)',
    }}>
      {jk}
    </span>
  );
}

export default function PiketSiswaPage() {
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [search, setSearch]                   = useState('');
  const [expandedId, setExpandedId]           = useState(null);

  const { data: kelasList = [], isLoading: loadingKelas } = useQuery({
    queryKey: ['piket-kelas-list'],
    queryFn: () => api.get('/dashboard/siswa-per-kelas').then(r => r.data.data),
  });

  const { data: siswaList = [], isLoading: loadingSiswa } = useQuery({
    queryKey: ['piket-siswa', selectedKelasId],
    queryFn: () =>
      api.get('/dashboard/siswa-per-kelas', { params: { kelasId: selectedKelasId } })
        .then(r => r.data.data),
    enabled: !!selectedKelasId,
  });

  const kelasSelected = kelasList.find(k => k.id === selectedKelasId);

  const filtered = siswaList.filter(s =>
    !search ||
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    s.nis.includes(search) ||
    (s.nisn || '').includes(search)
  );

  const totalL = filtered.filter(s => s.jenisKelamin === 'L').length;
  const totalP = filtered.filter(s => s.jenisKelamin === 'P').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Siswa</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>
            Pilih kelas untuk melihat daftar siswa
          </p>
        </div>
      </div>

      {/* Grid kelas */}
      <div className="card">
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
          Pilih Kelas ({kelasList.length} kelas)
        </h3>
        {loadingKelas ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 8 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ height: 64, borderRadius: 10, background: 'var(--color-surface-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 8 }}>
            {kelasList.map(k => {
              const isActive = selectedKelasId === k.id;
              return (
                <button
                  key={k.id}
                  onClick={() => { setSelectedKelasId(k.id); setSearch(''); setExpandedId(null); }}
                  style={{
                    padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                    border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isActive ? 'rgba(var(--color-primary-rgb),0.1)' : 'var(--color-surface-hover)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    outline: isActive ? '2px solid rgba(var(--color-primary-rgb),0.3)' : 'none',
                    outlineOffset: 1,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)' }}>
                    {k.nama}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
                    {k.jumlahSiswa} siswa
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Daftar siswa */}
      {selectedKelasId && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
                Kelas {kelasSelected?.nama}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-muted)' }}>
                {filtered.length} siswa{search ? ' ditemukan' : ''} · L: {totalL} · P: {totalP}
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama / NIS / NISN..."
                className="input"
                style={{ paddingLeft: 30, width: 220, fontSize: 13 }}
              />
            </div>
          </div>

          {loadingSiswa ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--color-surface-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px 0', margin: 0, fontSize: 13 }}>
              {search ? `Tidak ada siswa dengan kata kunci "${search}"` : 'Tidak ada siswa di kelas ini'}
            </p>
          ) : (
            <div>
              {filtered.map((siswa, idx) => {
                const isExpanded = expandedId === siswa.id;
                return (
                  <div key={siswa.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : siswa.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', transition: 'background 0.1s',
                        backgroundColor: isExpanded ? 'rgba(var(--color-primary-rgb),0.04)' : 'transparent',
                      }}
                    >
                      <span style={{ fontSize: 11, color: 'var(--color-muted)', width: 22, textAlign: 'center', flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: siswa.jenisKelamin === 'P' ? 'rgba(236,72,153,0.12)' : 'rgba(59,130,246,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: siswa.jenisKelamin === 'P' ? '#ec4899' : '#3b82f6',
                      }}>
                        {siswa.nama?.charAt(0)?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {siswa.nama}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                          NIS: {siswa.nis}{siswa.nisn ? ` · NISN: ${siswa.nisn}` : ''}
                        </p>
                      </div>
                      <SiswaBadgeJK jk={siswa.jenisKelamin} />
                      {isExpanded
                        ? <ChevronDown style={{ width: 14, height: 14, color: 'var(--color-muted)', flexShrink: 0 }} />
                        : <ChevronRight style={{ width: 14, height: 14, color: 'var(--color-muted)', flexShrink: 0 }} />}
                    </button>

                    {isExpanded && (
                      <div style={{
                        padding: '8px 16px 12px 72px', display: 'flex', flexWrap: 'wrap', gap: 12,
                        background: 'rgba(var(--color-primary-rgb),0.04)',
                        borderTop: '1px dashed var(--color-border)',
                      }}>
                        {siswa.namaOrtu && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-muted)' }}>
                            <User style={{ width: 12, height: 12 }} />
                            <span>Orang Tua: <strong style={{ color: 'var(--color-foreground)' }}>{siswa.namaOrtu}</strong></span>
                          </div>
                        )}
                        {(siswa.teleponOrtu || siswa.telepon) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-muted)' }}>
                            <Phone style={{ width: 12, height: 12 }} />
                            <span>{siswa.teleponOrtu || siswa.telepon}</span>
                          </div>
                        )}
                        {siswa.akumulasiPoin?.totalPoin > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{ color: 'var(--color-muted)' }}>Poin Pelanggaran:</span>
                            <span style={{ fontWeight: 700, color: '#ef4444' }}>{siswa.akumulasiPoin.totalPoin}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
