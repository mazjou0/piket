import { useThemeStore, COLOR_THEMES, FONT_SIZE_OPTIONS, RADIUS_OPTIONS } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { Sun, Moon, Check, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Mini live preview ── */
function Preview() {
  return (
    <div style={{ borderRadius:10, border:'1px solid var(--color-border)', overflow:'hidden', background:'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)' }}>
        <div style={{ width:24, height:24, borderRadius:6, background:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'#fff', fontSize:9, fontWeight:900 }}>SK</span>
        </div>
        <div style={{ height:8, width:60, borderRadius:4, background:'var(--color-foreground)', opacity:0.7 }}/>
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
          <div style={{ width:20, height:20, borderRadius:5, background:'var(--color-surface-hover)' }}/>
          <div style={{ width:20, height:20, borderRadius:5, background:'var(--color-surface-hover)' }}/>
        </div>
      </div>
      {/* Body */}
      <div style={{ display:'flex', height:110 }}>
        {/* Sidebar */}
        <div style={{ width:80, background:'var(--color-surface)', borderRight:'1px solid var(--color-border)', padding:6, display:'flex', flexDirection:'column', gap:3 }}>
          {[true,false,false,false].map((a,i) => (
            <div key={i} style={{ height:18, borderRadius:5, background:a?`rgba(var(--color-primary-rgb),0.15)`:'transparent', borderLeft:a?`2px solid var(--color-primary)`:'2px solid transparent', paddingLeft:4, display:'flex', alignItems:'center' }}>
              <div style={{ height:5, width:a?28:20, borderRadius:3, background:a?'var(--color-primary)':'var(--color-muted)', opacity:a?0.8:0.25 }}/>
            </div>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex:1, padding:8, display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
            {['var(--color-primary)','#22c55e','#f59e0b'].map((c,i) => (
              <div key={i} style={{ borderRadius:6, padding:'6px 8px', background:'var(--color-surface)', border:'1px solid var(--color-border)' }}>
                <div style={{ width:14, height:14, borderRadius:4, background:c, opacity:0.3, marginBottom:4 }}/>
                <div style={{ height:5, borderRadius:3, background:c, opacity:0.7 }}/>
              </div>
            ))}
          </div>
          <div style={{ flex:1, borderRadius:6, background:'var(--color-surface)', border:'1px solid var(--color-border)', padding:'5px 6px', display:'flex', alignItems:'flex-end', gap:2 }}>
            {[35,62,45,82,55,72,50].map((h,i) => (
              <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:'2px 2px 0 0', background:'var(--color-primary)', opacity:0.6 }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom:16 }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:'var(--color-foreground)', margin:'0 0 16px', paddingBottom:12, borderBottom:'1px solid var(--color-border)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function PengaturanPage() {
  const { theme, colorTheme, fontSize, radius, setTheme, setColorTheme, setFontSize, setRadius } = useThemeStore();
  const { user } = useAuthStore();

  const handleReset = () => {
    setTheme('dark');
    setColorTheme('blue');
    setFontSize('md');
    setRadius('md');
    toast.success('Pengaturan direset ke default');
  };

  return (
    <div style={{ maxWidth:800, margin:'0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p style={{ color:'var(--color-muted)', fontSize:13, marginTop:2 }}>Sesuaikan tampilan dan preferensi</p>
        </div>
        <button onClick={handleReset} className="btn btn-secondary">
          <RotateCcw style={{ width:14, height:14 }}/> Reset Default
        </button>
      </div>

      {/* Preview */}
      <Section title="🖥 Pratinjau Live">
        <Preview />
        <p style={{ fontSize:11, color:'var(--color-muted)', marginTop:8, textAlign:'center' }}>
          Pratinjau berubah secara real-time saat Anda memilih tema
        </p>
      </Section>

      {/* Mode */}
      <Section title="🌓 Mode Tampilan">
        <div style={{ display:'flex', gap:12 }}>
          {[
            { v:'dark',  label:'Mode Gelap',  icon:Moon, desc:'Nyaman di malam hari'  },
            { v:'light', label:'Mode Terang', icon:Sun,  desc:'Segar dan lebih cerah' },
          ].map(opt => {
            const active = theme === opt.v;
            return (
              <button
                key={opt.v}
                onClick={() => setTheme(opt.v)}
                style={{
                  flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                  padding:'16px 12px', borderRadius:10, cursor:'pointer', transition:'all .2s',
                  border: active ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                  background: active ? 'rgba(var(--color-primary-rgb),0.06)' : 'var(--color-surface-hover)',
                }}
              >
                <div style={{ padding:10, borderRadius:10, background: active?'rgba(var(--color-primary-rgb),0.15)':'var(--color-surface)' }}>
                  <opt.icon style={{ width:22, height:22, color: active?'var(--color-primary)':'var(--color-muted)' }}/>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color: active?'var(--color-primary)':'var(--color-foreground)' }}>{opt.label}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted)', marginTop:2 }}>{opt.desc}</div>
                </div>
                {active && <span style={{ fontSize:10, color:'var(--color-primary)', fontWeight:700, display:'flex', alignItems:'center', gap:3 }}><Check style={{ width:11, height:11 }}/> Aktif</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Warna */}
      <Section title="🎨 Warna Utama">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {Object.entries(COLOR_THEMES).map(([key, c]) => {
            const active = colorTheme === key;
            return (
              <button
                key={key}
                onClick={() => setColorTheme(key)}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  padding:'10px 6px', borderRadius:10, cursor:'pointer', transition:'all .2s',
                  border: active ? `2px solid ${c.primary}` : '2px solid var(--color-border)',
                  background: active ? `${c.primary}18` : 'var(--color-surface-hover)',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                }}
              >
                <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${c.primary},${c.primaryDark})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow: active?`0 4px 14px ${c.primary}55`:'none' }}>
                  {active && <Check style={{ width:16, height:16, color:'#fff' }} strokeWidth={3}/>}
                </div>
                <span style={{ fontSize:10, fontWeight:600, color: active?c.primary:'var(--color-muted)', textAlign:'center', lineHeight:1.3 }}>
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
        {/* Preview warna terpilih */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, border:'1px solid var(--color-border)', background:'var(--color-surface-hover)' }}>
          <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg,${COLOR_THEMES[colorTheme]?.primary},${COLOR_THEMES[colorTheme]?.primaryDark})` }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--color-foreground)' }}>{COLOR_THEMES[colorTheme]?.name}</div>
            <div style={{ fontSize:11, color:'var(--color-muted)', fontFamily:'monospace' }}>{COLOR_THEMES[colorTheme]?.primary}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:12 }}>Tombol</button>
            <span className="badge badge-blue">Badge</span>
          </div>
        </div>
      </Section>

      {/* Font Size */}
      <Section title="🔡 Ukuran Teks">
        <div style={{ display:'flex', gap:10 }}>
          {FONT_SIZE_OPTIONS.map(opt => {
            const active = fontSize === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFontSize(opt.key)}
                style={{
                  flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  padding:'14px 8px', borderRadius:10, cursor:'pointer', transition:'all .2s',
                  border: active?'2px solid var(--color-primary)':'2px solid var(--color-border)',
                  background: active?'rgba(var(--color-primary-rgb),0.06)':'var(--color-surface-hover)',
                }}
              >
                <span style={{ fontWeight:800, lineHeight:1, fontSize:opt.value, color: active?'var(--color-primary)':'var(--color-foreground)' }}>Aa</span>
                <span style={{ fontSize:12, fontWeight:700, color: active?'var(--color-primary)':'var(--color-foreground)' }}>{opt.label}</span>
                <span style={{ fontSize:10, color:'var(--color-muted)', fontFamily:'monospace' }}>{opt.value}</span>
                {active && <span style={{ fontSize:10, color:'var(--color-primary)', fontWeight:700 }}>✓ Aktif</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Border Radius */}
      <Section title="⬜ Sudut Komponen">
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {RADIUS_OPTIONS.map(opt => {
            const active = radius === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setRadius(opt.key)}
                style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'10px 14px', borderRadius:10, cursor:'pointer', transition:'all .2s', textAlign:'left',
                  border: active?'2px solid var(--color-primary)':'2px solid var(--color-border)',
                  background: active?'rgba(var(--color-primary-rgb),0.06)':'var(--color-surface-hover)',
                }}
              >
                <div style={{ width:44, height:24, flexShrink:0, borderRadius:opt.value, background: active?'var(--color-primary)':'var(--color-border)', transition:'all .2s' }}/>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color: active?'var(--color-primary)':'var(--color-foreground)' }}>{opt.label}</span>
                <span style={{ fontSize:11, color:'var(--color-muted)', fontFamily:'monospace' }}>{opt.value}</span>
                {active && <Check style={{ width:15, height:15, color:'var(--color-primary)', flexShrink:0 }}/>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Info */}
      <Section title="ℹ️ Informasi Akun & Aplikasi">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
          {[
            ['Username',  user?.username || '—'],
            ['Role',      user?.role?.replace(/_/g,' ') || '—'],
            ['Email',     user?.email || '—'],
            ['Versi App', '1.0.0'],
            ['Tema Aktif',`${theme==='dark'?'Gelap':'Terang'} · ${COLOR_THEMES[colorTheme]?.name}`],
            ['Sekolah',   'SMKN 1 Kras'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--color-border)' }}>
              <span style={{ fontSize:12, color:'var(--color-muted)' }}>{k}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)', maxWidth:'60%', textAlign:'right', wordBreak:'break-word' }}>{v}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
