import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate, STATUS_ABSENSI } from '@/lib/utils';
import { AbsensiBadge, PeringatanBadge } from '@/components/ui/Badge';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, User } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { CHART_COLORS } from '@/lib/utils';

export default function SiswaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: siswa, isLoading } = useQuery({
    queryKey: ['siswa-detail', id],
    queryFn: () => api.get(`/siswa/${id}`).then(r => r.data.data),
  });

  const { data: statistik } = useQuery({
    queryKey: ['siswa-statistik', id],
    queryFn: () => api.get(`/siswa/${id}/statistik`).then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="card h-32 animate-pulse bg-dark-700" />)}
      </div>
    );
  }

  if (!siswa) return <div className="card text-center text-dark-500 py-12">Siswa tidak ditemukan</div>;

  const kehadiranData = statistik?.kehadiran ? [
    { name: 'Hadir', value: statistik.kehadiran.hadir, fill: CHART_COLORS.hadir },
    { name: 'Sakit', value: statistik.kehadiran.sakit, fill: CHART_COLORS.sakit },
    { name: 'Izin', value: statistik.kehadiran.izin, fill: CHART_COLORS.izin },
    { name: 'Alpha', value: statistik.kehadiran.alpha, fill: CHART_COLORS.alpha },
    { name: 'Terlambat', value: statistik.kehadiran.terlambat, fill: CHART_COLORS.terlambat },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">Detail Siswa</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            {siswa.foto ? (
              <img src={siswa.foto} className="w-24 h-24 rounded-2xl object-cover border-2 border-dark-600" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                {siswa.nama?.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="label">Nama</p>
              <p className="text-dark-100 font-semibold">{siswa.nama}</p>
            </div>
            <div>
              <p className="label">NIS</p>
              <p className="text-dark-100 font-mono">{siswa.nis}</p>
            </div>
            <div>
              <p className="label">NISN</p>
              <p className="text-dark-100 font-mono">{siswa.nisn || '-'}</p>
            </div>
            <div>
              <p className="label">Kelas Aktif</p>
              <p className="text-dark-100">{siswa.kelasHistori?.[0]?.kelas?.nama || '-'}</p>
            </div>
            <div>
              <p className="label">Jurusan</p>
              <p className="text-dark-100">{siswa.jurusan?.nama}</p>
            </div>
            <div>
              <p className="label">Angkatan</p>
              <p className="text-dark-100">{siswa.angkatan}</p>
            </div>
            <div>
              <p className="label">Jenis Kelamin</p>
              <p className="text-dark-100">{siswa.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
            </div>
            <div>
              <p className="label">Tanggal Lahir</p>
              <p className="text-dark-100">{formatDate(siswa.tanggalLahir)}</p>
            </div>
            <div>
              <p className="label">Status</p>
              <span className="badge-green">{siswa.status}</span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-6 pt-6 border-t border-dark-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-dark-500" />
            <div>
              <p className="text-dark-500 text-xs">Orang Tua</p>
              <p className="text-dark-300">{siswa.namaOrtu || '-'} · {siswa.teleponOrtu || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-dark-500" />
            <div>
              <p className="text-dark-500 text-xs">Alamat</p>
              <p className="text-dark-300 truncate">{siswa.alamat || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats + Poin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kehadiran chart */}
        <div className="lg:col-span-2 card">
          <h3 className="section-title">Statistik Kehadiran</h3>
          {statistik && (
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="bg-dark-900/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-success-400">{statistik.kehadiran.hadir}</p>
                <p className="text-xs text-dark-500">Hadir</p>
              </div>
              <div className="bg-dark-900/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-danger-400">{statistik.kehadiran.alpha}</p>
                <p className="text-xs text-dark-500">Alpha</p>
              </div>
              <div className="bg-dark-900/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary-400">{statistik.kehadiran.persentaseHadir}%</p>
                <p className="text-xs text-dark-500">Kehadiran</p>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={kehadiranData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={70} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {kehadiranData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Poin pelanggaran */}
        <div className="card">
          <h3 className="section-title">Akumulasi Poin</h3>
          {statistik?.akumulasi ? (
            <div className="text-center py-4">
              <div className="relative inline-block">
                <svg viewBox="0 0 80 80" className="w-24 h-24">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#334155" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke={statistik.akumulasi.totalPoin >= 75 ? '#ef4444' : statistik.akumulasi.totalPoin >= 25 ? '#f59e0b' : '#22c55e'}
                    strokeWidth="8"
                    strokeDasharray={`${Math.min((statistik.akumulasi.totalPoin / 150) * 214, 214)} 214`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-dark-100">{statistik.akumulasi.totalPoin}</span>
                  <span className="text-xs text-dark-500">poin</span>
                </div>
              </div>
              <PeringatanBadge status={statistik.akumulasi.statusPeringatan} />
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-dark-500">
                  <span>Warning (25)</span>
                  <span>SP1 (50)</span>
                  <span>SP2 (75)</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((statistik.akumulasi.totalPoin / 150) * 100, 100)}%`,
                      background: statistik.akumulasi.totalPoin >= 75 ? '#ef4444' : statistik.akumulasi.totalPoin >= 25 ? '#f59e0b' : '#22c55e',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : <p className="text-dark-500 text-sm">Tidak ada data</p>}
        </div>
      </div>

      {/* Recent absensi */}
      <div className="card">
        <h3 className="section-title">Riwayat Absensi Terakhir</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kelas</th>
                <th>Sesi</th>
                <th>Status</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {siswa.absensi?.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-dark-500">Belum ada data absensi</td></tr>
              ) : (
                siswa.absensi?.map(a => (
                  <tr key={a.id}>
                    <td>{formatDate(a.tanggal, 'dd MMM yyyy')}</td>
                    <td>{a.kelas?.nama || '-'}</td>
                    <td className="text-dark-400">{a.sesi}</td>
                    <td><AbsensiBadge status={a.status} /></td>
                    <td className="text-dark-400 text-xs">{a.keterangan || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent pelanggaran */}
      <div className="card">
        <h3 className="section-title">Riwayat Pelanggaran</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Poin</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {siswa.pelanggaran?.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-dark-500">Tidak ada pelanggaran</td></tr>
              ) : (
                siswa.pelanggaran?.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.tanggal, 'dd MMM yyyy')}</td>
                    <td>{p.jenisPelanggaran?.nama}</td>
                    <td><span className="text-danger-400 font-bold">{p.poin}</span></td>
                    <td className="text-dark-400 text-xs">{p.keterangan || '-'}</td>
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
