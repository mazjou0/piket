import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Menu, Moon, Sun, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { getInitials, ROLE_LABELS } from '@/lib/utils';

const PAGE_TITLES = {
  '/dashboard':              'Dashboard',
  '/siswa':                  'Data Siswa',
  '/guru':                   'Data Guru',
  '/kelas':                  'Data Kelas',
  '/jurusan':                'Jurusan',
  '/tahun-ajaran':           'Tahun Ajaran',
  '/absensi':                'Input Absensi',
  '/absensi/rekap':          'Rekap Harian',
  '/absensi/riwayat':        'Riwayat Absensi',
  '/pelanggaran':            'Data Pelanggaran',
  '/pelanggaran/akumulasi':  'Akumulasi Poin',
  '/surat':                  'Surat Otomatis',
  '/laporan':                'Laporan & Export',
  '/bk/dashboard':           'Dashboard BK',
  '/wali-kelas/dashboard':   'Dashboard Wali Kelas',
  '/qr':                     'QR Absensi',
  '/users':                  'User & Role',
  '/hari-libur':             'Hari Libur',
  '/kalender':               'Kalender Akademik',
  '/jenis-pelanggaran':      'Jenis Pelanggaran',
  '/profile':                'Profil Saya',
  '/pengaturan':             'Pengaturan',
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, toggleSidebar } = useThemeStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const title = PAGE_TITLES[location.pathname] || 'SIPAKAR';

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header style={{
      position:        'sticky',
      top:             0,
      zIndex:          10,
      display:         'flex',
      alignItems:      'center',
      gap:             12,
      padding:         '0.65rem 1.25rem',
      backgroundColor: 'var(--color-surface)',
      borderBottom:    '1px solid var(--color-border)',
      boxShadow:       '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Mobile menu */}
      <button
        onClick={toggleSidebar}
        style={{
          padding: 8, borderRadius: 8, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--color-muted)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
        className="lg:hidden"
      >
        <Menu style={{ width: 20, height: 20 }} />
      </button>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: '1rem', fontWeight: 600,
          color: 'var(--color-foreground)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          margin: 0,
        }}>
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          style={{
            padding: 8, borderRadius: 8, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--color-muted)', display: 'flex',
            alignItems: 'center', transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-foreground)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
        >
          {theme === 'dark'
            ? <Sun  style={{ width: 16, height: 16 }} />
            : <Moon style={{ width: 16, height: 16 }} />
          }
        </button>

        {/* Notifications */}
        <button
          style={{
            position: 'relative', padding: 8, borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-muted)', display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <Bell style={{ width: 16, height: 16 }} />
          <span style={{
            position: 'absolute', top: 8, right: 8, width: 7, height: 7,
            borderRadius: '50%', backgroundColor: '#ef4444',
            border: '1.5px solid var(--color-surface)',
          }} />
        </button>

        {/* User dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8, background: 'none',
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 11,
            }}>
              {getInitials(user?.nama || user?.username || 'U')}
            </div>
            {/* Name (hidden on mobile) */}
            <div className="hidden md:block" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', lineHeight: 1.2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.nama || user?.username}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </div>
            </div>
            <ChevronDown
              className="hidden md:block"
              style={{ width: 12, height: 12, color: 'var(--color-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                width: 210, zIndex: 20,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                animation: 'fadeIn 0.18s ease-out both',
              }}>
                {/* User info */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>
                    {user?.nama || user?.username}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>{user?.email}</div>
                  <span style={{
                    display: 'inline-block', marginTop: 6, padding: '2px 8px',
                    borderRadius: 99, fontSize: 10, fontWeight: 700,
                    backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
                    color: 'var(--color-primary)',
                  }}>
                    {ROLE_LABELS[user?.role] || user?.role}
                  </span>
                </div>
                {/* Menu items */}
                <div style={{ padding: 4 }}>
                  {[
                    { icon: User,     label: 'Profil Saya', path: '/profile',     color: null },
                    { icon: Settings, label: 'Pengaturan',  path: '/pengaturan',  color: null },
                  ].map(item => (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setDropdownOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 12px',
                        borderRadius: 8, background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 13, color: 'var(--color-muted)',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-foreground)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
                    >
                      <item.icon style={{ width: 15, height: 15 }} />
                      {item.label}
                    </button>
                  ))}
                  <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '4px 8px' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 12px',
                      borderRadius: 8, background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 13, color: '#ef4444',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut style={{ width: 15, height: 15 }} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
