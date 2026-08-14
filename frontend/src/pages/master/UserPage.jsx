import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { downloadFromApi } from '@/lib/download';
import { DataTable, Pagination } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { RoleBadge } from '@/components/ui/Badge';
import SearchInput from '@/components/ui/SearchInput';
import { Plus, Edit, Trash2, Key, UserX, AlertTriangle, Upload, FileDown, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { formatDateTime, ROLE_LABELS } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const ROLES = Object.entries(ROLE_LABELS);

/* ── Multi-role checkbox selector ── */
function RolesSelector({ value = [], onChange }) {
  const toggle = (role) => {
    const next = value.includes(role)
      ? value.filter(r => r !== role)
      : [...value, role];
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ROLES.map(([val, lbl]) => (
        <label
          key={val}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${value.includes(val) ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: value.includes(val) ? 'rgba(var(--color-primary-rgb),0.08)' : 'var(--color-surface-hover)',
            transition: 'all 0.15s',
          }}
        >
          <input
            type="checkbox"
            checked={value.includes(val)}
            onChange={() => toggle(val)}
            style={{ width: 15, height: 15, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, fontWeight: value.includes(val) ? 600 : 400, color: value.includes(val) ? 'var(--color-primary)' : 'var(--color-foreground)' }}>
            {lbl}
          </span>
        </label>
      ))}
      {value.length === 0 && (
        <p style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Pilih minimal 1 role</p>
      )}
    </div>
  );
}

function UserForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;

  // Inisialisasi roles dari data awal
  const initialRoles = initial
    ? [...new Set([initial.role, ...(initial.roles || [])])]
    : ['PETUGAS_PIKET'];

  const [selectedRoles, setSelectedRoles] = useState(initialRoles);

  const { data: guruList } = useQuery({
    queryKey: ['guru-list-user-form'],
    queryFn: () => api.get('/guru', { params: { limit: 200, aktif: true } }).then(r => r.data.data),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initial
      ? { ...initial, guruId: initial.guru?.id || '' }
      : { aktif: true, guruId: '' },
  });

  const mut = useMutation({
    mutationFn: (d) => {
      if (selectedRoles.length === 0) throw new Error('Pilih minimal 1 role');
      const payload = {
        ...d,
        // Role utama = role dengan hierarki tertinggi (angka terkecil)
        role: selectedRoles.reduce((best, r) => {
          const LEVEL = { SUPER_ADMIN:0, ADMIN:1, BK:2, KEPALA_SEKOLAH:2, WALI_KELAS:3, PETUGAS_PIKET:4, GURU:5 };
          return (LEVEL[r] ?? 99) < (LEVEL[best] ?? 99) ? r : best;
        }, selectedRoles[0]),
        roles: selectedRoles,
      };
      if (payload.guruId === '') payload.guruId = null;
      return isEdit ? api.put(`/users/${initial.id}`, payload) : api.post('/users', payload);
    },
    onSuccess: () => { toast.success(isEdit ? 'User diperbarui' : 'User dibuat'); onSuccess(); },
    onError: (e) => toast.error(e.response?.data?.message || e.message || 'Gagal menyimpan'),
  });

  const guruOptions = guruList || [];

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!isEdit && (
        <div>
          <label className="label">Username *</label>
          <input
            {...register('username', { required: 'Username wajib diisi' })}
            className={`input ${errors.username ? 'input-error' : ''}`}
            placeholder="username"
            autoComplete="off"
          />
          {errors.username && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.username.message}</p>}
        </div>
      )}

      <div>
        <label className="label">Email *</label>
        <input
          type="email"
          {...register('email', { required: 'Email wajib diisi' })}
          className={`input ${errors.email ? 'input-error' : ''}`}
          placeholder="email@sekolah.sch.id"
          autoComplete="off"
        />
        {errors.email && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.email.message}</p>}
      </div>

      {!isEdit && (
        <div>
          <label className="label">
            Password *
            <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--color-muted)', marginLeft: 4 }}>(minimal 6 karakter)</span>
          </label>
          <input
            type="password"
            {...register('password', {
              required: 'Password wajib diisi',
              minLength: { value: 6, message: 'Password minimal 6 karakter' },
            })}
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="Min. 6 karakter"
            autoComplete="new-password"
          />
          {errors.password && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.password.message}</p>}
        </div>
      )}

      {/* Multi-role selector */}
      <div>
        <label className="label">
          Role / Jabatan *
          <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--color-muted)', marginLeft: 4 }}>
            (bisa pilih lebih dari satu jika guru merangkap)
          </span>
        </label>
        <RolesSelector value={selectedRoles} onChange={setSelectedRoles} />
        {selectedRoles.length > 1 && (
          <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6, padding: '6px 10px', borderRadius: 6, background: 'rgba(var(--color-primary-rgb),0.06)', border: '1px solid rgba(var(--color-primary-rgb),0.15)' }}>
            Role utama: <strong style={{ color: 'var(--color-primary)' }}>{ROLE_LABELS[selectedRoles.reduce((best, r) => {
              const LEVEL = { SUPER_ADMIN:0, ADMIN:1, BK:2, KEPALA_SEKOLAH:2, WALI_KELAS:3, PETUGAS_PIKET:4, GURU:5 };
              return (LEVEL[r] ?? 99) < (LEVEL[best] ?? 99) ? r : best;
            }, selectedRoles[0])]}</strong>
            {' '}(otomatis dipilih dari hierarki tertinggi)
          </p>
        )}
      </div>

      <div>
        <label className="label">
          Hubungkan ke Guru
          <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--color-muted)', marginLeft: 4 }}>(opsional)</span>
        </label>
        <select {...register('guruId')} className="input">
          <option value="">— Tidak dihubungkan —</option>
          {guruOptions.map(g => (
            <option key={g.id} value={g.id}>
              {g.nama}{g.nip ? ` — ${g.nip}` : ''}{g.userId ? ' ✓ sudah punya akun' : ''}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>
          Diperlukan agar NIP muncul di laporan dan fitur Wali Kelas/BK/Piket dapat digunakan
        </p>
      </div>

      {isEdit && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-hover)',
        }}>
          <input
            type="checkbox"
            {...register('aktif')}
            id="user-aktif"
            style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
          <label htmlFor="user-aktif" style={{ fontSize: 13, color: 'var(--color-foreground)', cursor: 'pointer' }}>
            Akun Aktif
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending || selectedRoles.length === 0}>
          {mut.isPending ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}

export default function UserPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.role === 'SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [downloading, setDownloading] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.get('/users', { params: { page, limit: 20, search } }).then(r => r.data),
    keepPreviousData: true,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      const msg = isSuperAdmin ? 'User berhasil dihapus permanen' : 'User berhasil dinonaktifkan';
      toast.success(msg);
      qc.invalidateQueries(['users']);
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, newPassword }) => api.put(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { toast.success('Password berhasil direset'); setResetId(null); setNewPass(''); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal reset password'),
  });

  const importMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/users/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      const { berhasil, gagal, errors } = res.data.data;
      toast.success(`Import selesai: ${berhasil} berhasil, ${gagal} gagal`);
      if (errors?.length) {
        errors.slice(0, 3).forEach(e => toast.error(`${e.row}: ${e.error}`, { duration: 5000 }));
        if (errors.length > 3) toast(`...dan ${errors.length - 3} error lainnya`, { icon: '⚠️' });
      }
      qc.invalidateQueries(['users']);
      setShowImport(false);
      setImportFile(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Import gagal'),
  });

  const handleTemplate = async () => {
    setDownloading('template');
    await downloadFromApi('/master/template/user', 'template-import-user.xlsx');
    setDownloading('');
  };

  const handleExport = async () => {
    setDownloading('export');
    await downloadFromApi('/master/export/user', `export-user-${Date.now()}.xlsx`);
    setDownloading('');
  };

  const columns = [
    {
      header: 'No',
      cell: (_, i) => (page - 1) * 20 + i + 1,
      headerClass: 'w-12 text-center',
      cellClass: 'text-center',
    },
    {
      header: 'User',
      cell: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: 'var(--color-foreground)', margin: 0 }}>{r.username}</p>
          <p style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace', margin: 0 }}>{r.email}</p>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (r) => {
        const allRoles = [...new Set([r.role, ...(r.roles || [])])];
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allRoles.map(role => <RoleBadge key={role} role={role} />)}
          </div>
        );
      },
    },
    {
      header: 'Guru',
      cell: (r) => r.guru
        ? (
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)' }}>{r.guru.nama}</p>
            {r.guru.nip && <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace' }}>{r.guru.nip}</p>}
          </div>
        )
        : <span style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic' }}>—</span>,
    },
    {
      header: 'Status',
      cell: (r) => r.aktif
        ? <span className="badge badge-green">Aktif</span>
        : <span className="badge badge-red">Non-aktif</span>,
    },
    {
      header: 'Login Terakhir',
      cell: (r) => <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
        {formatDateTime(r.lastLogin) || '—'}
      </span>,
    },
    {
      header: 'Aksi',
      cell: (r) => {
        const isSelf = r.id === currentUser?.id;
        return (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            {/* Edit */}
            <button
              onClick={() => { setEditData(r); setShowForm(true); }}
              className="btn btn-ghost btn-sm btn-icon"
              style={{ color: 'var(--color-primary)' }}
              title="Edit user"
            >
              <Edit style={{ width: 15, height: 15 }} />
            </button>

            {/* Reset Password */}
            <button
              onClick={() => setResetId(r.id)}
              className="btn btn-ghost btn-sm btn-icon"
              style={{ color: '#f59e0b' }}
              title="Reset password"
            >
              <Key style={{ width: 15, height: 15 }} />
            </button>

            {/* Hapus / Nonaktifkan */}
            <button
              onClick={() => !isSelf && setDeleteTarget({ id: r.id, username: r.username, role: r.role })}
              className="btn btn-ghost btn-sm btn-icon"
              style={{ color: isSelf ? 'var(--color-border)' : '#ef4444', cursor: isSelf ? 'not-allowed' : 'pointer' }}
              title={isSelf ? 'Tidak bisa hapus akun sendiri' : isSuperAdmin ? 'Hapus permanen' : 'Nonaktifkan'}
              disabled={isSelf}
            >
              {isSuperAdmin ? <Trash2 style={{ width: 15, height: 15 }} /> : <UserX style={{ width: 15, height: 15 }} />}
            </button>
          </div>
        );
      },
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User & Role</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>
            {data?.pagination?.total ?? 0} user terdaftar
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Tombol Template / Import / Export — hanya SUPER_ADMIN */}
          {isSuperAdmin && (
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
              {[
                { label: downloading === 'template' ? 'Loading...' : 'Template', icon: FileSpreadsheet, color: '#22c55e', action: handleTemplate, key: 'template' },
                { label: 'Import',   icon: Upload,          color: '#f59e0b', action: () => setShowImport(true), key: 'import' },
                { label: downloading === 'export'   ? 'Loading...' : 'Export',   icon: FileDown,        color: '#3b82f6', action: handleExport,   key: 'export'   },
              ].map((btn, idx, arr) => (
                <button
                  key={btn.key}
                  onClick={btn.action}
                  disabled={downloading !== ''}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', fontSize: 12, fontWeight: 500,
                    background: 'var(--color-surface)',
                    color: downloading !== '' ? 'var(--color-muted)' : btn.color,
                    border: 'none',
                    borderRight: idx < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: downloading !== '' ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <btn.icon style={{ width: 14, height: 14 }} />
                  {btn.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn btn-primary">
            <Plus style={{ width: 16, height: 16 }} /> Tambah User
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Cari username, email..."
          style={{ width: 280 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable columns={columns} data={data?.data} loading={isLoading} emptyMessage="Tidak ada data user" />
      </div>

      {data?.pagination && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onPageChange={setPage}
        />
      )}

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditData(null); }}
        title={editData ? 'Edit User' : 'Tambah User'}
        size="sm"
      >
        <UserForm
          initial={editData}
          onSuccess={() => { setShowForm(false); setEditData(null); qc.invalidateQueries(['users']); }}
          onCancel={() => { setShowForm(false); setEditData(null); }}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetId}
        onClose={() => { setResetId(null); setNewPass(''); }}
        title="Reset Password User"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Password Baru</label>
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="input"
              placeholder="Min. 6 karakter"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setResetId(null); setNewPass(''); }}>
              Batal
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!newPass || newPass.length < 6 || resetMut.isPending}
              onClick={() => resetMut.mutate({ id: resetId, newPassword: newPass })}
            >
              {resetMut.isPending ? 'Menyimpan...' : 'Reset Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Konfirmasi Hapus / Nonaktifkan */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={isSuperAdmin ? 'Hapus User Permanen' : 'Nonaktifkan User'}
        size="sm"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0 16px' }}>
          <div style={{ padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.1)', flexShrink: 0 }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#ef4444' }} />
          </div>
          <div>
            {isSuperAdmin ? (
              <>
                <p style={{ fontWeight: 700, color: 'var(--color-foreground)', fontSize: 14, margin: '0 0 6px' }}>
                  Hapus "{deleteTarget?.username}" secara permanen?
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
                  Data user akan <strong style={{ color: '#ef4444' }}>dihapus permanen</strong> dari database
                  dan tidak bisa dipulihkan. Relasi dengan guru juga akan diputus.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 700, color: 'var(--color-foreground)', fontSize: 14, margin: '0 0 6px' }}>
                  Nonaktifkan "{deleteTarget?.username}"?
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
                  User tidak akan bisa login. Akun dapat diaktifkan kembali kapan saja melalui menu Edit.
                </p>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>
            Batal
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate(deleteTarget.id)}
          >
            {deleteMut.isPending
              ? 'Memproses...'
              : isSuperAdmin ? 'Ya, Hapus Permanen' : 'Ya, Nonaktifkan'
            }
          </button>
        </div>
      </Modal>

      {/* Modal Import User */}
      <Modal
        open={showImport}
        onClose={() => { setShowImport(false); setImportFile(null); }}
        title="Import User dari Excel"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowImport(false); setImportFile(null); }}>
              Batal
            </button>
            <button
              className="btn btn-primary"
              disabled={!importFile || importMut.isPending}
              onClick={() => importMut.mutate(importFile)}
            >
              {importMut.isPending ? 'Mengimpor...' : 'Import'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', fontSize: 13, color: 'var(--color-foreground)', lineHeight: 1.7 }}>
            <strong>Petunjuk:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              <li>Download template terlebih dahulu via tombol <strong>Template</strong></li>
              <li>Kolom wajib: Username, Email, Password, Role</li>
              <li>Password minimal 6 karakter</li>
              <li>Role valid: ADMIN, PETUGAS_PIKET, BK, WALI_KELAS, GURU, KEPALA_SEKOLAH</li>
              <li>Username/email yang sudah ada akan dilewati</li>
            </ul>
          </div>

          <div>
            <label className="label">Pilih File Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={e => setImportFile(e.target.files[0] || null)}
              className="input"
              style={{ paddingTop: 6 }}
            />
            {importFile && (
              <p style={{ fontSize: 12, color: '#22c55e', marginTop: 6 }}>
                ✓ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
