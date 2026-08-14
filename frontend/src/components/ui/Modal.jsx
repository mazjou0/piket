import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZES = { xs: 360, sm: 460, md: 560, lg: 720, xl: 960 };

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  /* Kunci scroll halaman saat modal terbuka */
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  /* Render langsung ke document.body via Portal —
     keluar dari semua parent container, sehingga position:fixed
     selalu relatif terhadap viewport, bukan parent */
  return createPortal(
    <div
      data-modal-overlay="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        transform: 'translate3d(0, 0, 0)', /* Force GPU layer & new stacking context */
        willChange: 'transform',
        isolation: 'isolate', /* Create new stacking context */
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: SIZES[size] ?? 560,
          maxHeight: 'calc(100vh - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          animation: 'modalIn 0.18s ease-out both',
          margin: 'auto', /* Additional centering fallback */
          transform: 'translate3d(0, 0, 0)', /* Force new layer */
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          borderRadius: '14px 14px 0 0',
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-foreground)' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 7, border: 'none',
              background: 'none', cursor: 'pointer', color: 'var(--color-muted)',
              transition: 'all .15s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-foreground)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body — bagian yang bisa scroll */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 18px',
        }}>
          {children}
        </div>

        {/* Footer — selalu terlihat, tidak ikut scroll */}
        {footer && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 8, padding: '12px 18px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
            borderRadius: '0 0 14px 14px',
          }}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(.96) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
      `}</style>
    </div>,
    document.body   /* ← Portal target: langsung ke body */
  );
}
