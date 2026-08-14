import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PeringatanBadge } from '@/components/ui/Badge';
import { AlertTriangle, Users, TrendingUp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardBKPage() {
  const navigate = useNavigate();

  const { data: summaryBK } = useQuery({
    queryKey: ['summary-bk'],
    queryFn: () => api.get('/dashboard/summary-bk').then(r => r.data.data),
  });

  const { data: akumulasiList } = useQuery({
    queryKey: ['akumulasi-all'],
    queryFn: () => api.get('/siswa', {
      params: { status: 'AKTIF', limit: 200 }
    }).then(r => r.data.data),
  });

  const risikoData = akumulasiList?.filter(s => s.akumulasiPoin?.totalPoin >= 25)
    .sort((a, b) => (b.akumulasiPoin?.totalPoin || 0) - (a.akumulasiPoin?.totalPoin || 0))
    .slice(0, 20) || [];

  const chartData = risikoData.slice(0, 10).map(s => ({
    nama: s.nama?.split(' ')[0],
    poin: s.akumulasiPoin?.totalPoin || 0,
  }));

  const warningGroups = {
    REKOMENDASI_BK: akumulasiList?.filter(s => s.akumulasiPoin?.statusPeringatan === 'REKOMENDASI_BK') || [],
    PANGGILAN_ORTU: akumulasiList?.filter(s => s.akumulasiPoin?.statusPeringatan === 'PANGGILAN_ORTU') || [],
    SP2:            akumulasiList?.filter(s => s.akumulasiPoin?.statusPeringatan === 'SP2') || [],
    SP1:            akumulasiList?.filter(s => s.akumulasiPoin?.statusPeringatan === 'SP1') || [],
    WARNING:        akumulasiList?.filter(s => s.akumulasiPoin?.statusPeringatan === 'WARNING') || [],
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard BK</h1>
          <p className="text-dark-500 text-sm mt-1">Monitoring siswa berisiko berdasarkan poin pelanggaran</p>
        </div>
      </div>

      {/* Risk summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(warningGroups).map(([status, list]) => {
          const colors = {
            REKOMENDASI_BK: 'border-danger-600/30 text-danger-400',
            PANGGILAN_ORTU: 'border-red-600/30 text-red-400',
            SP2:            'border-orange-600/30 text-orange-400',
            SP1:            'border-yellow-600/30 text-yellow-400',
            WARNING:        'border-dark-500/30 text-dark-400',
          };
          return (
            <div key={status} className={`card border text-center ${colors[status]}`}>
              <p className="text-3xl font-bold">{list.length}</p>
              <p className="text-xs mt-1 text-dark-500">
                {status.replace('_', ' ')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="section-title">Top 10 Poin Pelanggaran Tertinggi</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="nama" tick={{ fill: '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="poin" name="Poin" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed risk table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Siswa Berisiko (Poin ≥ 25)</h3>
          <span className="text-sm text-dark-500">{risikoData.length} siswa</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Total Poin</th>
                <th>Status Peringatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {risikoData.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-dark-500">Tidak ada siswa berisiko saat ini</td></tr>
              ) : (
                risikoData.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-center text-dark-500">{i + 1}</td>
                    <td>
                      <p className="font-medium text-dark-100">{s.nama}</p>
                      <p className="text-xs text-dark-500">{s.nis}</p>
                    </td>
                    <td>{s.kelasHistori?.[0]?.kelas?.nama || '-'}</td>
                    <td className="text-center">
                      <span className={`font-bold text-lg ${s.akumulasiPoin?.totalPoin >= 75 ? 'text-danger-400' : s.akumulasiPoin?.totalPoin >= 25 ? 'text-warning-400' : 'text-dark-400'}`}>
                        {s.akumulasiPoin?.totalPoin || 0}
                      </span>
                    </td>
                    <td><PeringatanBadge status={s.akumulasiPoin?.statusPeringatan} /></td>
                    <td>
                      <button onClick={() => navigate(`/siswa/${s.id}`)} className="btn-secondary btn-sm">Detail</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
