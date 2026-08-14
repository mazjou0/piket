import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useThemeStore } from '@/stores/themeStore';

export default function Layout() {
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen } = useThemeStore();

  const sidebarW = sidebarCollapsed ? 64 : 256;

  return (
    <div style={{ backgroundColor: 'var(--color-bg)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.55)' }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar — fixed, tidak ikut scroll */}
      <Sidebar />

      {/* Konten utama — margin kiri = lebar sidebar */}
      <div
        id="layout-content"
        style={{
          marginLeft: sidebarW,
          transition: 'margin-left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <style>{`
          @media (max-width: 1023px) {
            #layout-content { margin-left: 0 !important; }
          }
        `}</style>

        {/* Header — sticky di atas */}
        <Header />

        {/* Konten halaman — bisa expand sesuai isi */}
        <main style={{ flex: 1, padding: '1.25rem 1.5rem' }}>
          <div
            style={{ maxWidth: 1600, margin: '0 auto', paddingBottom: '3rem' }}
          >
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}
