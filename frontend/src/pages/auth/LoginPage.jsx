import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Eye, EyeOff, LogIn, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { toast.error('Username dan password wajib diisi'); return; }
    setLoading(true);
    try {
      const loggedUser = await login(form.username, form.password);
      toast.success('Login berhasil!');
      // Redirect ke absensi hanya jika HANYA punya role piket (tidak merangkap role lain yang lebih tinggi)
      const userRoles = loggedUser?.roles || [loggedUser?.role];
      const hasHigherRole = userRoles.some(r => ['SUPER_ADMIN','ADMIN','BK','WALI_KELAS','KEPALA_SEKOLAH','GURU'].includes(r));
      if (!hasHigherRole && userRoles.includes('PETUGAS_PIKET')) {
        navigate('/absensi');
      } else {
        navigate('/dashboard');
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: 'var(--color-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{ position:'absolute',top:-140,right:-140,width:380,height:380,borderRadius:'50%',background:'var(--color-primary)',opacity:0.07,filter:'blur(80px)',pointerEvents:'none' }}/>
      <div style={{ position:'absolute',bottom:-140,left:-140,width:380,height:380,borderRadius:'50%',background:'var(--color-primary)',opacity:0.05,filter:'blur(80px)',pointerEvents:'none' }}/>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        style={{
          position:'absolute', top:16, right:16,
          display:'flex', alignItems:'center', gap:6,
          padding:'6px 12px', borderRadius:8,
          border:'1px solid var(--color-border)',
          background:'var(--color-surface)',
          cursor:'pointer', fontSize:12,
          color:'var(--color-foreground)',
        }}
      >
        {theme === 'dark' ? <Sun style={{width:13,height:13}}/> : <Moon style={{width:13,height:13}}/>}
        {theme === 'dark' ? 'Terang' : 'Gelap'}
      </button>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:400, position:'relative', zIndex:1, animation:'fadeIn 0.3s ease-out both' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:60, height:60, borderRadius:16, marginBottom:14,
            background:'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
          }}>
            <span style={{ color:'#fff', fontWeight:900, fontSize:18, letterSpacing:'-1px' }}>SK</span>
          </div>
          <h1 style={{
            fontSize:28, fontWeight:900, margin:'0 0 6px',
            background:'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>SIPAKAR</h1>
          <p style={{ color:'var(--color-muted)', fontSize:12, margin:0, lineHeight:1.6 }}>
            Sistem Informasi Rekapitulasi Absensi &amp; Pelanggaran
          </p>
          <p style={{ color:'var(--color-foreground)', fontSize:12, fontWeight:600, margin:'2px 0 0' }}>
            SMKN 1 Kras
          </p>
        </div>

        {/* Form card */}
        <div className="card" style={{ boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--color-foreground)', margin:'0 0 18px' }}>
            Masuk ke Akun
          </h2>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="label">Username / Email</label>
              <input
                type="text"
                className="input"
                placeholder="Masukkan username atau email"
                value={form.username}
                onChange={e => setForm(p => ({...p, username: e.target.value}))}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  style={{ paddingRight: 40 }}
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'var(--color-muted)', display:'flex', alignItems:'center', padding:4,
                  }}
                >
                  {showPass ? <EyeOff style={{width:15,height:15}}/> : <Eye style={{width:15,height:15}}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width:'100%', padding:'11px', fontSize:14, justifyContent:'center', marginTop:2 }}
            >
              {loading ? (
                <>
                  <svg style={{width:15,height:15,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                  Memproses...
                </>
              ) : (
                <><LogIn style={{width:15,height:15}}/> Masuk</>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--color-muted)', marginTop:20, opacity:0.55 }}>
          © 2025 SIPAKAR — SMKN 1 Kras
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
