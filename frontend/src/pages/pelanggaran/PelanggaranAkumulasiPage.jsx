import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable } from '@/components/ui/Table';
import { PeringatanBadge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SearchInput from '@/components/ui/SearchInput';

export default function PelanggaranAkumulasiPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['akumulasi-list', search],
    queryFn: () => api.get('/siswa', { params: { limit: 500, status: 'AKTIF', search } }).then(r => r.data.data),
  });

  const filtered = data?.filter(s => {
    if (!filterStatus) return true;
    return s.akumulasiPoin?.statusPeringatan === filterStatus;
  }).sort((a, b) => (b.akumulasiPoin?.totalPoin || 0) - (a.akumulasiPoin?.totalPoin || 0)) || [];

  const poinBar = (poin) => {
    const pct = Math.min((poin / 150) * 100, 100);
    const color = poin >= 75 ? 'bg-danger-500' : poin >= 25 ? 'bg-warning-500' : 'bg-success-500';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-bold text-dark-200 w-8 text-right">{poin}</span>
      </div>
    );
  };

  const columns = [
    { header: 'No', cell: (_, i) => i + 1, headerClass: 'w-12', cellClass: 'text-center' },
    { header: 'Siswa', cell: (r) => <div><p className="font-medium text-dark-100">{r.nama}</p><p className="text-xs text-dark-500">{r.nis}</p></div> },
    { header: 'Kelas', cell: (r) => r.kelasHistori?.[0]?.kelas?.nama || '-' },
    { header: 'Jurusan', cell: (r) => <span className="text-xs text-dark-500">{r.jurusan?.kode}</span> },
    { header: 'Akumulasi Poin', cell: (r) => poinBar(r.akumulasiPoin?.totalPoin || 0) },
    { header: 'Status', cell: (r) => <PeringatanBadge status={r.akumulasiPoin?.statusPeringatan || 'NORMAL'} /> },
    { header: 'Aksi', cell: (r) => <button onClick={() => navigate(`/siswa/${r.id}`)} className="btn-secondary btn-sm">Detail</button>, headerClass: 'text-right', cellClass: 'text-right' },
  ];

  const STATUS_OPTIONS = ['', 'WARNING', 'SP1', 'SP2', 'PANGGILAN_ORTU', 'REKOMENDASI_BK'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Akumulasi Poin Pelanggaran</h1>
          <p className="text-dark-500 text-sm mt-1">{filtered.length} siswa</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama, NIS..." className="w-56" />
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-primary-600 text-white' : 'text-dark-400 hover:bg-dark-700'}`}>
              {s || 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: 'REKOMENDASI BK', status: 'REKOMENDASI_BK', color: 'text-danger-400' },
          { label: 'PANGGILAN ORTU', status: 'PANGGILAN_ORTU', color: 'text-red-400' },
          { label: 'SP2 (≥75)', status: 'SP2', color: 'text-orange-400' },
          { label: 'SP1 (≥50)', status: 'SP1', color: 'text-warning-400' },
          { label: 'WARNING (≥25)', status: 'WARNING', color: 'text-dark-400' },
        ].map(item => {
          const count = data?.filter(s => s.akumulasiPoin?.statusPeringatan === item.status).length || 0;
          return (
            <div key={item.status} className="card text-center py-3">
              <p className={`text-2xl font-bold ${item.color}`}>{count}</p>
              <p className="text-xs text-dark-500 mt-1">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={filtered} loading={isLoading} />
      </div>
    </div>
  );
}
