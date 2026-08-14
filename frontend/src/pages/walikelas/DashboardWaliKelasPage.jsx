import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AbsensiBadge, PeringatanBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/Table';
import StatCard from '@/components/ui/StatCard';
import { formatDate, CHART_COLORS } from '@/lib/utils';
import { Users, UserCheck, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function DashboardWaliKelasPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kehadiran');

  // Get kelas wali from user profile
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/me').then(r => r.data.data),
  });

  const kelasId = profile?.guru?.kelasWali?.[0]?.id;
  const kelasNama = profile?.guru?.kelasWali?.[0]?.nama;

  const { data: kelasDetail } = useQuery({
    queryKey: ['kelas-detail', kelasId],
    queryFn: () => api.get(`/kelas/${kelasId}`).then(r => r.data.data),
    enabled: !!kelasId,
  });

  const { data: statistikKelas } = useQuery({
    queryKey: ['kelas-statistik', kelasId],
    queryFn: () => api.get(`/kelas/${kelasId}/statistik`).then(r => r.data.data),
    enabled: !!kelasId,
  });

  const today = new Date().toISOString().split('T')[0];
  const { data: absensiHariIni } = useQuery({
    queryKey: ['absensi-walikelas', kelasId, today],
    queryFn: () => api.get('/absensi', { params: { tanggal: today, kelasId, sesi: 'PAGI' } }).then(r => r.data.data),
    enabled: !!kelasId,
  });

  const { data: rekap7Hari } = useQuery({
    queryKey: ['rekap-7hari', kelasId],
    queryFn: () => api.get('/laporan/rekap-kelas', {
      params: {
        tanggalMulai: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        tanggalSelesai: today,
        ...(kelasId && { kelasId }),
      }
    }).then(r => r.data.data),
    enabled: !!kelasId,
  });

  if (!kelasId) {
    return (
      <div className="card text-center py-16">
        <Users className="w-12 h-12 text-dark-600 mx-auto mb-4" />
        <p className="text-dark-400 font-medium">Anda belum ditetapkan sebagai Wali Kelas</p>
        <p className="text-dark-500 text-sm mt-2">Hubungi Admin untuk mengatur kelas Anda</p>
      </div>
    );
  }

  const hadirHariIni = absensiHariIni?.siswa?.filter(s => s.absensi?.status === 'HADIR').length || 0;
  const alphaHariIni = absensiHariIni?.siswa?.filter(s => s.absensi?.status === 'ALPHA').length || 0;
  const terlambatHariIni = absensiHariIni?.siswa?.filter(s => s.absensi?.status === 'TERLAMBAT').length || 0;
  const totalSiswa = kelasDetail?.siswaKelas?.length || 0;

  const chartData = rekap7Hari?.map(r => ({
    kelas: r.kelas?.nama,
    hadir: r.hadir,
    alpha: r.alpha,
    terlambat: r.terlambat,
  })) || [];

  const siswaKolom = [
    { header: 'No', cell: (_, i) => i + 1, headerClass: 'w-12', cellClass: 'text-center' },
    {
      header: 'Siswa',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">
            {r.siswa?.nama?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-dark-100">{r.siswa?.nama}</p>
            <p className="text-xs text-dark-500">{r.siswa?.nis}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Status Hari Ini',
      cell: (r) => {
        const absensi = absensiHariIni?.siswa?.find(a => a.siswa?.id === r.siswa?.id);
        return absensi?.absensi ? <AbsensiBadge status={absensi.absensi.status} /> : <span className="badge-gray">Belum</span>;
      },
    },
    {
      header: 'Akumulasi Poin',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-dark-200">{r.siswa?.akumulasiPoin?.totalPoin || 0}</span>
          <PeringatanBadge status={r.siswa?.akumulasiPoin?.statusPeringatan || 'NORMAL'} />
        </div>
      ),
    },
    {
      header: 'Aksi',
      cell: (r) => (
        <button onClick={() => navigate(`/siswa/${r.siswa?.id}`)} className="btn-secondary btn-sm">
          Detail
        </button>
      ),
      headerClass: 'text-right', cellClass: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Wali Kelas</h1>
          <p className="text-dark-500 text-sm mt-1">
            {kelasNama} — {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Stats hari ini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Siswa" value={totalSiswa} icon={Users} color="blue" />
        <StatCard title="Hadir Hari Ini" value={hadirHariIni} icon={UserCheck} color="green" />
        <StatCard title="Alpha" value={alphaHariIni} icon={AlertCircle} color="red" />
        <StatCard title="Terlambat" value={terlambatHariIni} icon={Clock} color="orange" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-dark-800 border border-dark-700 rounded-xl w-fit">
        {['kehadiran', 'pelanggaran', 'absensi-hari-ini'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {tab.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'kehadiran' && (
        <div className="card">
          <h3 className="section-title">Statistik Kehadiran Kelas — 7 Hari Terakhir</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="kelas" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="hadir" name="Hadir" fill={CHART_COLORS.hadir} radius={[3, 3, 0, 0]} />
              <Bar dataKey="alpha" name="Alpha" fill={CHART_COLORS.alpha} radius={[3, 3, 0, 0]} />
              <Bar dataKey="terlambat" name="Terlambat" fill={CHART_COLORS.terlambat} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'pelanggaran' && (
        <div className="card">
          <h3 className="section-title">Monitoring Poin Pelanggaran</h3>
          <DataTable
            columns={siswaKolom}
            data={statistikKelas?.siswaBerisiko || []}
            emptyMessage="Tidak ada siswa dengan poin pelanggaran"
          />
          {statistikKelas?.siswaBerisiko?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-success-400 font-medium">✓ Semua siswa di bawah ambang peringatan</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'absensi-hari-ini' && (
        <div className="card">
          <h3 className="section-title">Daftar Hadir Hari Ini — {formatDate(new Date())}</h3>
          <div className="space-y-1.5 mt-2">
            {absensiHariIni?.siswa?.map((item, i) => (
              <div key={item.siswa?.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-900/40 border border-dark-700/30">
                <span className="text-xs text-dark-600 w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 font-medium truncate">{item.siswa?.nama}</p>
                  <p className="text-xs text-dark-500">{item.siswa?.nis}</p>
                </div>
                {item.absensi ? (
                  <AbsensiBadge status={item.absensi.status} />
                ) : (
                  <span className="badge-gray">Belum diisi</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full daftar siswa */}
      <div className="card">
        <h3 className="section-title">Daftar Siswa Kelas {kelasNama}</h3>
        <DataTable columns={siswaKolom} data={kelasDetail?.siswaKelas || []} />
      </div>
    </div>
  );
}
