import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useForm } from 'react-hook-form';
import { getInitials, ROLE_LABELS, formatDateTime } from '@/lib/utils';
import { User, Lock, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [tab, setTab] = useState('info');

  const { register: regPass, handleSubmit: hsPass, reset: resetPass, watch } = useForm();
  const newPassword = watch('newPassword');

  const changePassMut = useMutation({
    mutationFn: (d) => api.put('/auth/change-password', d),
    onSuccess: () => {
      toast.success('Password berhasil diubah. Silakan login kembali.');
      resetPass();
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="card">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {getInitials(user?.nama || user?.username || 'U')}
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark-50">{user?.nama || user?.username}</h2>
            <p className="text-dark-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge badge-blue">{ROLE_LABELS[user?.role] || user?.role}</span>
              <span className="badge badge-green">Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-dark-800 border border-dark-700 rounded-xl w-fit">
        {[
          { key: 'info', label: 'Informasi', icon: User },
          { key: 'password', label: 'Password', icon: Lock },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {tab === 'info' && (
        <div className="card space-y-4">
          <h3 className="section-title">Informasi Akun</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="label">Username</p>
              <p className="text-dark-200 font-medium">{user?.username}</p>
            </div>
            <div>
              <p className="label">Email</p>
              <p className="text-dark-200">{user?.email || '-'}</p>
            </div>
            <div>
              <p className="label">Role</p>
              <p className="text-dark-200">{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
            <div>
              <p className="label">Status</p>
              <span className="badge-green">Aktif</span>
            </div>
          </div>

          {/* Account activity */}
          <div className="pt-4 border-t border-dark-700">
            <div className="flex items-center gap-2 text-sm text-dark-500">
              <Clock className="w-4 h-4" />
              <span>Login terakhir: {formatDateTime(user?.lastLogin) || 'Baru saja'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <div className="card">
          <h3 className="section-title">Ubah Password</h3>
          <form onSubmit={hsPass(d => changePassMut.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Password Lama *</label>
              <input
                type="password"
                {...regPass('currentPassword', { required: 'Wajib diisi' })}
                className="input"
                placeholder="Masukkan password lama"
              />
            </div>
            <div>
              <label className="label">Password Baru *</label>
              <input
                type="password"
                {...regPass('newPassword', {
                  required: 'Wajib diisi',
                  minLength: { value: 6, message: 'Minimal 6 karakter' },
                })}
                className="input"
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div>
              <label className="label">Konfirmasi Password Baru *</label>
              <input
                type="password"
                {...regPass('confirmPassword', {
                  required: 'Wajib diisi',
                  validate: v => v === newPassword || 'Password tidak cocok',
                })}
                className="input"
                placeholder="Ulangi password baru"
              />
            </div>

            <div className="p-3 bg-warning-600/10 border border-warning-600/20 rounded-xl text-xs text-warning-400">
              ⚠ Setelah mengubah password, Anda akan diminta login ulang.
            </div>

            <button type="submit" className="btn-primary w-full" disabled={changePassMut.isPending}>
              <Lock className="w-4 h-4" />
              {changePassMut.isPending ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
