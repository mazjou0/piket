import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const COLOR_THEMES = {
  blue:    { name:'Biru',   primary:'#3b82f6', primaryDark:'#1d4ed8', primaryRgb:'59,130,246' },
  indigo:  { name:'Indigo', primary:'#6366f1', primaryDark:'#4338ca', primaryRgb:'99,102,241' },
  violet:  { name:'Violet', primary:'#8b5cf6', primaryDark:'#6d28d9', primaryRgb:'139,92,246' },
  emerald: { name:'Hijau',  primary:'#10b981', primaryDark:'#059669', primaryRgb:'16,185,129' },
  rose:    { name:'Rose',   primary:'#f43f5e', primaryDark:'#be123c', primaryRgb:'244,63,94'  },
  orange:  { name:'Oranye', primary:'#f97316', primaryDark:'#c2410c', primaryRgb:'249,115,22' },
  teal:    { name:'Teal',   primary:'#14b8a6', primaryDark:'#0f766e', primaryRgb:'20,184,166' },
  cyan:    { name:'Cyan',   primary:'#06b6d4', primaryDark:'#0e7490', primaryRgb:'6,182,212'  },
};

export const FONT_SIZE_OPTIONS = [
  { key:'sm', label:'Kecil',  value:'13px' },
  { key:'md', label:'Sedang', value:'14px' },
  { key:'lg', label:'Besar',  value:'15px' },
];

export const RADIUS_OPTIONS = [
  { key:'none', label:'Kotak',        value:'0px'  },
  { key:'sm',   label:'Sedikit',      value:'6px'  },
  { key:'md',   label:'Sedang',       value:'10px' },
  { key:'lg',   label:'Bulat',        value:'14px' },
  { key:'full', label:'Sangat Bulat', value:'20px' },
];

export function applyTheme({ mode, colorKey, fontSize, radius }) {
  const root  = document.documentElement;
  const color = COLOR_THEMES[colorKey] || COLOR_THEMES.blue;

  root.classList.toggle('dark', mode === 'dark');

  root.style.setProperty('--color-primary',      color.primary);
  root.style.setProperty('--color-primary-dark',  color.primaryDark);
  root.style.setProperty('--color-primary-rgb',   color.primaryRgb);

  const fs = FONT_SIZE_OPTIONS.find(f => f.key === fontSize)?.value || '14px';
  const r  = RADIUS_OPTIONS.find(o => o.key === radius)?.value      || '10px';
  root.style.setProperty('--font-size-base', fs);
  root.style.setProperty('--radius', r);
  root.style.fontSize = fs;

  if (mode === 'dark') {
    root.style.setProperty('--color-bg',            '#0f172a');
    root.style.setProperty('--color-surface',       '#1e293b');
    root.style.setProperty('--color-surface-hover', '#334155');
    root.style.setProperty('--color-border',        '#334155');
    root.style.setProperty('--color-foreground',    '#f1f5f9');
    root.style.setProperty('--color-muted',         '#94a3b8');
    root.style.setProperty('--color-input-bg',      '#0f172a');
  } else {
    root.style.setProperty('--color-bg',            '#f1f5f9');
    root.style.setProperty('--color-surface',       '#ffffff');
    root.style.setProperty('--color-surface-hover', '#f8fafc');
    root.style.setProperty('--color-border',        '#e2e8f0');
    root.style.setProperty('--color-foreground',    '#0f172a');
    root.style.setProperty('--color-muted',         '#64748b');
    root.style.setProperty('--color-input-bg',      '#ffffff');
  }
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme:      'dark',
      colorTheme: 'blue',
      fontSize:   'md',
      radius:     'md',
      sidebarOpen:      true,
      sidebarCollapsed: false,

      applyCurrentTheme() {
        const { theme, colorTheme, fontSize, radius } = get();
        applyTheme({ mode: theme, colorKey: colorTheme, fontSize, radius });
      },
      toggleTheme() {
        const n = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: n });
        const { colorTheme, fontSize, radius } = get();
        applyTheme({ mode: n, colorKey: colorTheme, fontSize, radius });
      },
      setTheme(t) {
        set({ theme: t });
        const { colorTheme, fontSize, radius } = get();
        applyTheme({ mode: t, colorKey: colorTheme, fontSize, radius });
      },
      setColorTheme(k) {
        set({ colorTheme: k });
        const { theme, fontSize, radius } = get();
        applyTheme({ mode: theme, colorKey: k, fontSize, radius });
      },
      setFontSize(f) {
        set({ fontSize: f });
        const { theme, colorTheme, radius } = get();
        applyTheme({ mode: theme, colorKey: colorTheme, fontSize: f, radius });
      },
      setRadius(r) {
        set({ radius: r });
        const { theme, colorTheme, fontSize } = get();
        applyTheme({ mode: theme, colorKey: colorTheme, fontSize, radius: r });
      },
      toggleSidebar()          { set(s => ({ sidebarOpen: !s.sidebarOpen })); },
      toggleSidebarCollapse()  { set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })); },
      setSidebarOpen(v)        { set({ sidebarOpen: v }); },
    }),
    {
      name: 'sipakar-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme({
            mode:     state.theme      || 'dark',
            colorKey: state.colorTheme || 'blue',
            fontSize: state.fontSize   || 'md',
            radius:   state.radius     || 'md',
          });
        }
      },
    }
  )
);
