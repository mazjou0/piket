import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Layout from '@/components/layout/Layout';
import { Component } from 'react';

/* ── Error Boundary — tampilkan error di layar alih-alih blank ── */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#f87171', fontFamily: 'monospace', background: '#0f172a', minHeight: '100vh' }}>
          <h2 style={{ color: '#ef4444' }}>⚠ Terjadi Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error?.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#94a3b8' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Auth
import LoginPage from '@/pages/auth/LoginPage';
import SSOCallbackPage from '@/pages/auth/SSOCallbackPage';

// Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage';
import DashboardPiketPage from '@/pages/dashboard/DashboardPiketPage';

// Master Data
import SiswaPage             from '@/pages/master/SiswaPage';
import SiswaDetailPage       from '@/pages/master/SiswaDetailPage';
import GuruPage              from '@/pages/master/GuruPage';
import KelasPage             from '@/pages/master/KelasPage';
import JurusanPage           from '@/pages/master/JurusanPage';
import TahunAjaranPage       from '@/pages/master/TahunAjaranPage';
import UserPage              from '@/pages/master/UserPage';
import HariLiburPage         from '@/pages/master/HariLiburPage';
import KalenderPage          from '@/pages/master/KalenderPage';
import JenisPelanggaranPage  from '@/pages/master/JenisPelanggaranPage';
import PetugasPiketPage      from '@/pages/master/PetugasPiketPage';

// Absensi
import AbsensiPage       from '@/pages/absensi/AbsensiPage';
import AbsensiRiwayatPage from '@/pages/absensi/AbsensiRiwayatPage';
import AbsensiRekapPage  from '@/pages/absensi/AbsensiRekapPage';
import AutoAbsensiPage   from '@/pages/absensi/AutoAbsensiPage';
import AbsensiMassalPage from '@/pages/absensi/AbsensiMassalPage';

// Pelanggaran
import PelanggaranPage          from '@/pages/pelanggaran/PelanggaranPage';
import PelanggaranAkumulasiPage from '@/pages/pelanggaran/PelanggaranAkumulasiPage';

// Surat & BK
import SuratPage              from '@/pages/surat/SuratPage';
import LaporanPage            from '@/pages/laporan/LaporanPage';
import DashboardBKPage        from '@/pages/bk/DashboardBKPage';
import DashboardWaliKelasPage from '@/pages/walikelas/DashboardWaliKelasPage';

// QR & Profile
import QRCodePage    from '@/pages/qr/QRCodePage';
import ProfilePage   from '@/pages/profile/ProfilePage';
import PengaturanPage from '@/pages/pengaturan/PengaturanPage';

// Piket
import PiketSiswaPage from '@/pages/piket/PiketSiswaPage';

// 404
import NotFoundPage from '@/pages/NotFoundPage';

/* ----------------------------------------------------------------
   Route guards
---------------------------------------------------------------- */
const PIKET_ALLOWED = [
  '/dashboard', '/absensi', '/absensi/rekap', '/absensi/riwayat',
  '/pelanggaran', '/pelanggaran/akumulasi', '/laporan', '/profile',
];

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0) {
    // user.roles adalah array semua role yang dimiliki user
    const userRoles = user?.roles || [user?.role];

    // Level tertinggi yang diizinkan dari daftar roles yang boleh akses route ini
    const maxAllowedLevel = Math.max(...roles.map(r => ROLE_LEVEL[r] ?? -1));

    // Level terendah (akses tertinggi) yang dimiliki user dari semua rolenya
    const userMinLevel = Math.min(...userRoles.map(r => ROLE_LEVEL[r] ?? 99));

    if (userMinLevel > maxAllowedLevel) {
      // Arahkan ke halaman yang sesuai dengan role utama
      if (user?.roles?.includes('PETUGAS_PIKET') && !user?.roles?.some(r => ['SUPER_ADMIN','ADMIN','BK','WALI_KELAS'].includes(r))) {
        return <Navigate to="/absensi" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

/* Semua role kecuali PETUGAS_PIKET */
const NOT_PIKET = ['SUPER_ADMIN', 'ADMIN', 'BK', 'WALI_KELAS', 'GURU', 'KEPALA_SEKOLAH'];
/* Role yang bisa lihat master data — GURU read-only, PETUGAS_PIKET tidak boleh */
const MASTER_VIEWERS = ['SUPER_ADMIN', 'ADMIN', 'BK', 'WALI_KELAS', 'GURU', 'KEPALA_SEKOLAH'];
/* Role yang bisa edit master data — tidak termasuk GURU */
const MASTER_EDITORS = ['SUPER_ADMIN', 'ADMIN', 'BK', 'WALI_KELAS', 'KEPALA_SEKOLAH'];
/* Role yang bisa akses absensi — PETUGAS_PIKET termasuk.
   GURU ikut masuk agar guru multi-role (GURU+PETUGAS_PIKET) lolos frontend guard;
   backend tetap authorize('PETUGAS_PIKET') sehingga GURU murni masih ditolak di server. */
const ABSENSI_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'BK', 'WALI_KELAS', 'PETUGAS_PIKET', 'KEPALA_SEKOLAH', 'GURU'];
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const SUPER_ADMIN_ONLY = ['SUPER_ADMIN'];
const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PETUGAS_PIKET', 'BK', 'WALI_KELAS', 'GURU', 'KEPALA_SEKOLAH'];

// Hierarki role — semakin kecil index, semakin tinggi akses
const ROLE_LEVEL = {
  SUPER_ADMIN: 0, ADMIN: 1, BK: 2, KEPALA_SEKOLAH: 2,
  WALI_KELAS: 3, PETUGAS_PIKET: 4, GURU: 5,
};

function hasMinRole(userRole, minRole) {
  return (ROLE_LEVEL[userRole] ?? 99) <= (ROLE_LEVEL[minRole] ?? 99);
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route path="/sso/callback" element={<SSOCallbackPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute roles={ALL_ROLES}><Layout /></ProtectedRoute>}>

          {/* Dashboard — semua role */}
          <Route path="/dashboard" element={
            // Jika role PETUGAS_PIKET tunggal (tidak kombinasi dengan role lain), tampilkan DashboardPiketPage
            user?.roles?.length === 1 && user?.roles.includes('PETUGAS_PIKET')
              ? <DashboardPiketPage />
              : <DashboardPage />
          } />

          {/* ── Master Data ── */}
          {/* GURU: lihat Siswa, Guru, Kelas, Jurusan, Hari Libur, Kalender */}
          {/* PETUGAS_PIKET: tidak boleh akses sama sekali */}
          <Route path="/siswa"             element={<ProtectedRoute roles={MASTER_VIEWERS}><SiswaPage /></ProtectedRoute>} />
          <Route path="/siswa/:id"         element={<ProtectedRoute roles={MASTER_VIEWERS}><SiswaDetailPage /></ProtectedRoute>} />
          <Route path="/guru"              element={<ProtectedRoute roles={MASTER_VIEWERS}><GuruPage /></ProtectedRoute>} />
          <Route path="/kelas"             element={<ProtectedRoute roles={MASTER_VIEWERS}><KelasPage /></ProtectedRoute>} />
          <Route path="/jurusan"           element={<ProtectedRoute roles={MASTER_VIEWERS}><JurusanPage /></ProtectedRoute>} />
          <Route path="/hari-libur"        element={<ProtectedRoute roles={MASTER_VIEWERS}><HariLiburPage /></ProtectedRoute>} />
          <Route path="/kalender"          element={<ProtectedRoute roles={MASTER_VIEWERS}><KalenderPage /></ProtectedRoute>} />
          {/* Hanya MASTER_EDITORS — tidak include GURU dan PETUGAS_PIKET */}
          <Route path="/tahun-ajaran"      element={<ProtectedRoute roles={MASTER_EDITORS}><TahunAjaranPage /></ProtectedRoute>} />
          <Route path="/jenis-pelanggaran" element={<ProtectedRoute roles={MASTER_EDITORS}><JenisPelanggaranPage /></ProtectedRoute>} />
          <Route path="/users"             element={<ProtectedRoute roles={SUPER_ADMIN_ONLY}><UserPage /></ProtectedRoute>} />
          <Route path="/petugas-piket"     element={<ProtectedRoute roles={ADMIN_ROLES}><PetugasPiketPage /></ProtectedRoute>} />

          {/* ── Absensi — PETUGAS_PIKET bisa, GURU tidak ── */}
          <Route path="/absensi"         element={<ProtectedRoute roles={ABSENSI_ROLES}><AbsensiPage /></ProtectedRoute>} />
          <Route path="/absensi/rekap"   element={<ProtectedRoute roles={ABSENSI_ROLES}><AbsensiRekapPage /></ProtectedRoute>} />
          <Route path="/absensi/riwayat" element={<ProtectedRoute roles={ABSENSI_ROLES}><AbsensiRiwayatPage /></ProtectedRoute>} />
          <Route path="/absensi/massal"  element={<ProtectedRoute roles={ADMIN_ROLES}><AbsensiMassalPage /></ProtectedRoute>} />
          <Route path="/absensi/auto"    element={<ProtectedRoute roles={ADMIN_ROLES}><AutoAbsensiPage /></ProtectedRoute>} />

          {/* ── Pelanggaran — GURU hanya bisa lihat Data Pelanggaran ── */}
          <Route path="/pelanggaran"           element={<PelanggaranPage />} />
          <Route path="/pelanggaran/akumulasi" element={<ProtectedRoute roles={[...MASTER_EDITORS, 'PETUGAS_PIKET', 'GURU']}><PelanggaranAkumulasiPage /></ProtectedRoute>} />

          {/* ── Surat & BK — GURU tidak boleh akses ── */}
          <Route path="/surat" element={<ProtectedRoute roles={MASTER_EDITORS}><SuratPage /></ProtectedRoute>} />
          <Route path="/bk/dashboard" element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'BK', 'KEPALA_SEKOLAH']}><DashboardBKPage /></ProtectedRoute>} />
          <Route path="/wali-kelas/dashboard" element={<ProtectedRoute roles={['WALI_KELAS']}><DashboardWaliKelasPage /></ProtectedRoute>} />

          {/* ── Laporan — GURU tidak boleh akses, PETUGAS_PIKET boleh ── */}
          <Route path="/laporan" element={<ProtectedRoute roles={ABSENSI_ROLES}><LaporanPage /></ProtectedRoute>} />

          {/* ── QR — GURU tidak boleh akses ── */}
          <Route path="/qr" element={<ProtectedRoute roles={MASTER_EDITORS}><QRCodePage /></ProtectedRoute>} />

          {/* ── Profile & Pengaturan ── */}
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/pengaturan"  element={<ProtectedRoute roles={SUPER_ADMIN_ONLY}><PengaturanPage /></ProtectedRoute>} />

          {/* ── Piket Siswa ── */}
          <Route path="/piket/siswa" element={<PiketSiswaPage />} />

        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
