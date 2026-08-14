import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import { formatDate, CHART_COLORS } from '@/lib/utils';
import {
  Users, UserCheck, Stethoscope, FileCheck, AlertCircle, Clock,
  LogOut, Briefcase, TrendingUp, Award, BarChart3
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { AbsensiBadge, PeringatanBadge } from '@/components/ui/Badge';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const CustomTooltip = ({ active, payload, label }) => {
  const { theme } = useThemeStore();
  const bg     = theme === 'dark' ? '#1e293b' : '#ffffff';
  const border = theme === 'dark' ? '#334155' : '#e2e8f0';
  const text   = theme === 'dark' ? '#f1f5f9' : '#0f172a';
  const muted  = theme === 'dark' ? '#94a3b8' : '#64748b';

  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: text, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <p style={{ color: muted, marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: muted }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const [chartDays, setChartDays] = useState(7);

  // Warna grid/axis ikut mode
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const tickColor = theme === 'dark' ? '#64748b' : '#94a3b8';
  const tooltipBg = theme === 'dark' ? '#1e293b' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#e2e8f0';

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary-today').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  const { data: chartHarian } = useQuery({
    queryKey: ['chart-harian', chartDays],
    queryFn: () => api.get(`/dashboard/chart-harian?days=${chartDays}`).then(r => r.data.data),
  });

  const { data: chartBulanan } = useQuery({
    queryKey: ['chart-bulanan'],
    queryFn: () => api.get(`/dashboard/chart-bulanan?tahun=${new Date().getFullYear()}`).then(r => r.data.data),
  });

  const { data: topAlpha } = useQuery({
    queryKey: ['top-alpha'],
    queryFn: () => api.get('/dashboard/top-alpha?limit=10').then(r => r.data.data),
  });

  const { data: topTerlambat } = useQuery({
    queryKey: ['top-terlambat'],
    queryFn: () => api.get('/dashboard/top-terlambat?limit=10').then(r => r.data.data),
  });

  const { data: kelasTerbaik } = useQuery({
    queryKey: ['kelas-terbaik'],
    queryFn: () => api.get('/dashboard/kelas-terbaik?limit=5').then(r => r.data.data),
  });

  const { data: summaryBK } = useQuery({
    queryKey: ['summary-bk'],
    queryFn: () => api.get('/dashboard/summary-bk').then(r => r.data.data),
    enabled: ['SUPER_ADMIN', 'ADMIN', 'BK', 'KEPALA_SEKOLAH'].includes(user?.role),
  });

  const stats = [
    { key: 'hadir',       label: 'Hadir',        icon: UserCheck,    color: 'green' },
    { key: 'sakit',       label: 'Sakit',         icon: Stethoscope,  color: 'yellow' },
    { key: 'izin',        label: 'Izin',          icon: FileCheck,    color: 'blue' },
    { key: 'alpha',       label: 'Alpha',         icon: AlertCircle,  color: 'red' },
    { key: 'dispensasi',  label: 'Dispensasi',    icon: Briefcase,    color: 'purple' },
    { key: 'terlambat',   label: 'Terlambat',     icon: Clock,        color: 'orange' },
    { key: 'pulangCepat', label: 'Pulang Cepat',  icon: LogOut,       color: 'pink' },
    { key: 'totalSiswa',  label: 'Total Siswa',   icon: Users,        color: 'cyan' },
  ];

  const pieData = summary ? [
    { name: 'Hadir', value: summary.hadir, color: CHART_COLORS.hadir },
    { name: 'Sakit', value: summary.sakit, color: CHART_COLORS.sakit },
    { name: 'Izin', value: summary.izin, color: CHART_COLORS.izin },
    { name: 'Alpha', value: summary.alpha, color: CHART_COLORS.alpha },
    { name: 'Terlambat', value: summary.terlambat, color: CHART_COLORS.terlambat },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Selamat Datang, {user?.nama?.split(' ')[0] || user?.username} 👋</h1>
          <p className="text-dark-500 text-sm mt-1">{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-xl">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          <span className="text-xs text-dark-400">Live data</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <StatCard
            key={s.key}
            title={s.label}
            value={summary?.[s.key] ?? 0}
            icon={s.icon}
            color={s.color}
            loading={loadingSummary}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily area chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Tren Kehadiran</h3>
            <div className="flex gap-1">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    chartDays === d ? 'bg-primary-600 text-white' : 'text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  {d}H
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartHarian || []} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                {Object.entries(CHART_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="tanggal" tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: tickColor }} />
              <Area type="monotone" dataKey="hadir"     name="Hadir"     stroke={CHART_COLORS.hadir}     fill={`url(#grad-hadir)`}     strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="alpha"     name="Alpha"     stroke={CHART_COLORS.alpha}     fill={`url(#grad-alpha)`}     strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="terlambat" name="Terlambat" stroke={CHART_COLORS.terlambat} fill={`url(#grad-terlambat)`} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 className="section-title">Distribusi Hari Ini</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-dark-500 text-sm">
              Belum ada data hari ini
            </div>
          )}
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-dark-400">{d.name}</span>
                </div>
                <span className="text-dark-300 font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

        <div className="card">
          <h3 className="section-title">Grafik Bulanan {new Date().getFullYear()}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartBulanan || []} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="namaBulan" tick={{ fill: tickColor, fontSize: 10 }} tickFormatter={v => v?.slice(0, 3)} />
              <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: tickColor }} />
              <Bar dataKey="hadir"     name="Hadir"     fill={CHART_COLORS.hadir}     radius={[3,3,0,0]} />
              <Bar dataKey="alpha"     name="Alpha"     fill={CHART_COLORS.alpha}     radius={[3,3,0,0]} />
              <Bar dataKey="terlambat" name="Terlambat" fill={CHART_COLORS.terlambat} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Alpha */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-danger-500" />
            <h3 className="section-title mb-0">Top 10 Alpha</h3>
          </div>
          <div className="space-y-2">
            {topAlpha?.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-xs text-dark-500 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 truncate">{item.siswa?.nama}</p>
                  <p className="text-xs text-dark-500">{item.siswa?.kelasHistori?.[0]?.kelas?.nama || '-'}</p>
                </div>
                <span className="text-danger-400 text-sm font-bold">{item.jumlahAlpha}x</span>
              </div>
            )) ?? <p className="text-dark-500 text-sm">Tidak ada data</p>}
          </div>
        </div>

        {/* Top Terlambat */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-warning-500" />
            <h3 className="section-title mb-0">Top 10 Terlambat</h3>
          </div>
          <div className="space-y-2">
            {topTerlambat?.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-xs text-dark-500 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 truncate">{item.siswa?.nama}</p>
                  <p className="text-xs text-dark-500">{item.siswa?.kelasHistori?.[0]?.kelas?.nama || '-'}</p>
                </div>
                <span className="text-warning-400 text-sm font-bold">{item.jumlahTerlambat}x</span>
              </div>
            )) ?? <p className="text-dark-500 text-sm">Tidak ada data</p>}
          </div>
        </div>

        {/* Kelas Terbaik + BK summary */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-success-500" />
              <h3 className="section-title mb-0">Kelas Terbaik</h3>
            </div>
            <div className="space-y-2">
              {kelasTerbaik?.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-success-600/10 flex items-center justify-center">
                    <span className="text-success-500 text-xs font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-200 truncate">{item.kelas?.nama}</p>
                  </div>
                  <span className="text-success-400 text-sm font-bold">{item.persentaseHadir}%</span>
                </div>
              )) ?? <p className="text-dark-500 text-sm">Tidak ada data</p>}
            </div>
          </div>

          {summaryBK && (
            <div className="card border border-danger-600/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-danger-500" />
                <h3 className="text-sm font-semibold text-dark-100">Monitoring BK</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-dark-900/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-danger-400">{summaryBK.risikoTinggi}</p>
                  <p className="text-xs text-dark-500">Risiko Tinggi</p>
                </div>
                <div className="bg-dark-900/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-warning-400">{summaryBK.totalPelanggaran}</p>
                  <p className="text-xs text-dark-500">Pelanggaran</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
