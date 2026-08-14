import { NavLink, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Building2,
  CalendarDays, AlertTriangle, FileText, BarChart3, QrCode,
  ChevronLeft, ChevronRight, Shield, Calendar, UserCheck,
  Heart, ChevronDown, ChevronUp, Settings, ClipboardList, Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react';

/* ── Nav config ── */
const NAV_GROUPS = [
  {
    label: 'UTAMA',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/piket/siswa', icon: Users, label: 'Siswa', excludeRoles: ['SUPER_ADMIN','ADMIN','BK','WALI_KELAS','GURU','KEPALA_SEKOLAH'] },
    ],
  },
  {
    label: 'MASTER DATA',
    excludeRoles: ['PETUGAS_PIKET', 'WALI_KELAS', 'GURU'],
    items: [
      { to: '/siswa',             icon: Users,         label: 'Siswa' },
      { to: '/guru',              icon: GraduationCap, label: 'Guru' },
      { to: '/kelas',             icon: BookOpen,       label: 'Kelas' },
      { to: '/jurusan',           icon: Building2,      label: 'Jurusan' },
      { to: '/tahun-ajaran',      icon: CalendarDays,   label: 'Tahun Ajaran' },
      { to: '/jenis-pelanggaran', icon: AlertTriangle,  label: 'Jenis Pelanggaran' },
      { to: '/hari-libur',        icon: Calendar,       label: 'Hari Libur' },
      { to: '/kalender',          icon: CalendarDays,   label: 'Kalender' },
      { to: '/users',             icon: Shield,         label: 'User & Role',   roles: ['SUPER_ADMIN'] },
      { to: '/petugas-piket',     icon: UserCheck,      label: 'Petugas Piket', roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    label: 'ABSENSI',
    excludeRoles: ['GURU'],
    items: [
      { to: '/absensi',         icon: ClipboardList, label: 'Input Absensi' },
      { to: '/absensi/rekap',   icon: BarChart3,     label: 'Rekap Harian' },
      { to: '/absensi/riwayat', icon: CalendarDays,  label: 'Riwayat Absensi' },
      { to: '/absensi/massal',  icon: Users,         label: 'Absensi Massal', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { to: '/absensi/auto',    icon: Clock,         label: 'Auto Absensi',   roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    label: 'PELANGGARAN',
    items: [
      { to: '/pelanggaran',           icon: AlertTriangle, label: 'Data Pelanggaran' },
      { to: '/pelanggaran/akumulasi', icon: BarChart3,     label: 'Akumulasi Poin',  excludeRoles: ['GURU'] },
    ],
  },
  {
    label: 'SURAT & BK',
    excludeRoles: ['PETUGAS_PIKET', 'GURU'],
    items: [
      { to: '/surat',                icon: FileText,  label: 'Surat Otomatis' },
      { to: '/bk/dashboard',         icon: Heart,     label: 'Dashboard BK',  roles: ['SUPER_ADMIN','ADMIN','BK','KEPALA_SEKOLAH'] },
      { to: '/wali-kelas/dashboard', icon: UserCheck, label: 'Wali Kelas',    roles: ['SUPER_ADMIN','ADMIN','WALI_KELAS'] },
    ],
  },
  {
    label: 'LAPORAN',
    excludeRoles: ['GURU'],
    items: [
      { to: '/laporan', icon: BarChart3, label: 'Laporan & Export' },
      { to: '/qr',      icon: QrCode,   label: 'QR Absensi', excludeRoles: ['PETUGAS_PIKET'] },
    ],
  },
  {
    label: 'PENGATURAN',
    excludeRoles: ['PETUGAS_PIKET', 'ADMIN', 'WALI_KELAS', 'GURU', 'BK', 'KEPALA_SEKOLAH'],
    items: [
      { to: '/pengaturan', icon: Settings, label: 'Pengaturan' },
    ],
  },
];

function canShow(item, userRoles) {
  // userRoles bisa string (role tunggal) atau array
  if (!Array.isArray(userRoles)) userRoles = [userRoles];

  const ROLE_LEVEL = {
    SUPER_ADMIN: 0, ADMIN: 1, BK: 2, KEPALA_SEKOLAH: 2,
    WALI_KELAS: 3, PETUGAS_PIKET: 4, GURU: 5,
  };

  // Level terendah (akses tertinggi) dari semua role user
  const userMinLevel = Math.min(...userRoles.map(r => ROLE_LEVEL[r] ?? 99));

  // roles = daftar role yang boleh lihat item — ambil level tertinggi yang diizinkan
  if (item.roles) {
    const maxAllowedLevel = Math.max(...item.roles.map(r => ROLE_LEVEL[r] ?? -1));
    if (userMinLevel > maxAllowedLevel) return false;
  }

  // excludeRoles = dikecualikan jika SEMUA role user ada di excludeRoles
  // (jika user merangkap role lain yang tidak di-exclude, item tetap tampil)
  if (item.excludeRoles) {
    const hasNonExcludedRole = userRoles.some(r => !item.excludeRoles.includes(r));
    if (!hasNonExcludedRole) return false;
  }

  return true;
}

function NavItem({ item, collapsed }) {
  const location  = useLocation();
  const isActive  =
    location.pathname === item.to ||
    (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={isActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item sidebar-item-inactive'}
      style={collapsed ? { justifyContent: 'center', padding: '0.5rem 0', width: '100%' } : {}}
    >
      <item.icon style={{ width: collapsed ? 20 : 16, height: collapsed ? 20 : 16, flexShrink: 0 }} />
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, toggleSidebarCollapse, setSidebarOpen } = useThemeStore();
  const { user } = useAuthStore();
  // Support multi-role: ambil semua role user
  const userRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const role = user?.role; // role utama untuk backward compat

  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar — update saat resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [expanded, setExpanded] = useState(() => {
    const s = {};
    NAV_GROUPS.forEach(g => { s[g.label] = true; });
    return s;
  });

  const toggle = (label) => setExpanded(p => ({ ...p, [label]: !p[label] }));

  const visibleGroups = NAV_GROUPS
    .filter(g => {
      if (!g.excludeRoles) return true;
      // Grup tampil jika user punya setidaknya satu role yang tidak di-exclude
      return userRoles.some(r => !g.excludeRoles.includes(r));
    })
    .map(g => ({ ...g, items: g.items.filter(item => canShow(item, userRoles)) }))
    .filter(g => g.items.length > 0);

  // Desktop: selalu tampil. Mobile: tampil hanya kalau sidebarOpen.
  const sidebarTranslate = (isMobile && !sidebarOpen) ? 'translateX(-100%)' : 'translateX(0)';

  return (
    <aside
      style={{
        position:        'fixed',
        left:            0,
        top:             0,
        zIndex:          30,
        height:          '100vh',
        display:         'flex',
        flexDirection:   'column',
        width:           sidebarCollapsed ? 64 : 256,
        backgroundColor: 'var(--color-surface)',
        borderRight:     '1px solid var(--color-border)',
        transition:      'width 0.3s, transform 0.3s',
        transform:       sidebarTranslate,
        overflow:        'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      sidebarCollapsed ? '16px 12px' : '16px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink:   0,
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: '-0.5px' }}>SK</span>
        </div>
        {!sidebarCollapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-foreground)', lineHeight: 1 }}>SIPAKAR</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 2 }}>SMKN 1 Kras</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {visibleGroups.map((group) => {
          const isOpen = expanded[group.label] !== false;
          return (
            <div key={group.label} style={{ marginBottom: 4 }}>
              {!sidebarCollapsed && (
                <button
                  onClick={() => toggle(group.label)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 12px',
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--color-muted)',
                    letterSpacing: '0.1em',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: 2,
                  }}
                >
                  <span>{group.label}</span>
                  {isOpen
                    ? <ChevronUp style={{ width: 12, height: 12 }} />
                    : <ChevronDown style={{ width: 12, height: 12 }} />
                  }
                </button>
              )}
              {(isOpen || sidebarCollapsed) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {group.items.map(item => (
                    <NavItem key={item.to} item={item} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: 8, borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
        <button
          onClick={toggleSidebarCollapse}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-muted)',
            transition: 'background 0.15s',
          }}
          title={sidebarCollapsed ? 'Perluas' : 'Ciutkan'}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {sidebarCollapsed
            ? <ChevronRight style={{ width: 16, height: 16 }} />
            : <ChevronLeft  style={{ width: 16, height: 16 }} />
          }
        </button>
      </div>
    </aside>
  );
}
