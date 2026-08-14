import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

const COL = [
  { key: 'hadir',       label: 'H',   title: 'Hadir',        color: '#4ade80' },
  { key: 'sakit',       label: 'S',   title: 'Sakit',        color: '#fde047' },
  { key: 'izin',        label: 'I',   title: 'Izin',         color: '#93c5fd' },
  { key: 'alpha',       label: 'A',   title: 'Alpha',        color: '#f87171' },
  { key: 'dispensasi',  label: 'D',   title: 'Dispensasi',   color: '#5eead4' },
  { key: 'terlambat',   label: 'T',   title: 'Terlambat',    color: '#fb923c' },
  { key: 'pulangCepat', label: 'PC',  title: 'Pulang Cepat', color: '#f9a8d4' },
  { key: 'dinas',       label: 'DN',  title: 'Dinas/PKL',    color: '#a78bfa' },
  { key: 'lainnya',     label: 'L',   title: 'Lainnya',      color: '#94a3b8' },
];

export default function AbsensiRekapPage() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['rekap-harian', tanggal],
    queryFn: () => api.get('/absensi/rekap-harian', { params: { tanggal } }).then(r => r.data),
  });

  const rows = data?.data || [];

  // Summary kartu
  const summary = rows.reduce((acc, r) => {
    COL.forEach(c => { acc[c.key] = (acc[c.key] || 0) + (r[c.key] || 0); });
    acc.total = (acc.total || 0) + (r.total || 0);
    return acc;
  }, {});

  const columns = [
    { header: 'No',     cell: (_, i) => i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    { header: 'Kelas',  cell: r => <span style={{ fontWeight: 600 }}>{r.kelas?.nama}</span> },
    { header: 'Jurusan',cell: r => <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-primary)' }}>{r.kelas?.jurusan?.singkatan || '—'}</span> },
    ...COL.map(c => ({
      header: c.label,
      cell: r => {
        const v = r[c.key] || 0;
        return v > 0
          ? <span style={{ color: c.color, fontWeight: 700 }} title={c.title}>{v}</span>
          : <span style={{ color: 'var(--color-muted)' }}>0</span>;
      },
      cellClass: 'text-center', headerClass: 'text-center',
    })),
    {
      header: 'Total',
      cell: r => <span style={{ fontWeight: 700 }}>{r.total || 0}</span>,
      cellClass: 'text-center', headerClass: 'text-center',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rekap Harian</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>{formatDate(tanggal)}</p>
        </div>
        <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="input" style={{ width: 160 }} />
      </div>

      {/* Kartu summary */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: 10 }}>
          {[...COL, { key: 'total', label: 'Total', title: 'Total', color: 'var(--color-foreground)' }].map(c => (
            <div key={c.key} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: c.color, margin: '0 0 3px' }}>{summary[c.key] || 0}</p>
              <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: 0 }} title={c.title}>{c.title || c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Keterangan singkatan */}
      <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>
        H=Hadir · S=Sakit · I=Izin · A=Alpha · D=Dispensasi · T=Terlambat · PC=Pulang Cepat · DN=Dinas/PKL · L=Lainnya
      </p>

      {/* Tabel */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="Tidak ada data absensi hari ini" />
        </div>
      </div>
    </div>
  );
}
