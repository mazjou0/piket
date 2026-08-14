import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function SSOCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState('Memverifikasi sesi...');

  useEffect(() => {
    // Kalau sudah login, langsung ke dashboard
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setStatus('Token tidak ditemukan');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    const verify = async () => {
      try {
        setStatus('Memverifikasi token SSO...');
        const res = await api.get(`/auth/sso-callback?token=${token}`);
        const { accessToken, refreshToken, user } = res.data.data;

        // Simpan ke store — sama persis seperti proses login biasa
        const roles = [...new Set([user.role, ...(user.roles || [])])];
        const authState = {
          user: { ...user, roles },
          accessToken,
          refreshToken,
          isAuthenticated: true,
        };

        // Update localStorage langsung (bypass store.login agar tidak hit API login)
        const stored = JSON.parse(localStorage.getItem('sipakar-auth') || '{}');
        stored.state = authState;
        localStorage.setItem('sipakar-auth', JSON.stringify(stored));

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // Update zustand store
        useAuthStore.setState(authState);

        setStatus('Login berhasil! Mengalihkan...');
        toast.success(`Selamat datang, ${user.nama || user.username}`);

        // Redirect sesuai role
        const hasHigherRole = roles.some(r =>
          ['SUPER_ADMIN','ADMIN','BK','WALI_KELAS','KEPALA_SEKOLAH','GURU'].includes(r)
        );
        setTimeout(() => {
          navigate(hasHigherRole ? '/dashboard' : '/absensi', { replace: true });
        }, 500);

      } catch (err) {
        const msg = err.response?.data?.message || 'Verifikasi SSO gagal';
        setStatus(msg);
        toast.error(msg);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    };

    verify();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      gap: 16,
    }}>
      <div style={{
        width: 48, height: 48,
        border: '4px solid var(--color-border)',
        borderTop: '4px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--color-foreground)', fontSize: 14, margin: 0 }}>
        {status}
      </p>
      <p style={{ color: 'var(--color-muted)', fontSize: 12, margin: 0 }}>
        SIPAKAR — SMKN 1 Kras
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
