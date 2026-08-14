import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { downloadFromApi } from '@/lib/download';
import { DataTable, Pagination } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Edit, Trash2, Upload, FileDown, FileSpreadsheet, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

/* ── Checkbox ── */
function Cb({ checked, indeterminate, onChange }) {
  return (
    <input type="checkbox" checked={checked} ref={el => { if (el) el.indeterminate = indeterminate; }} onChange={onChange}
      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
  );
}

/* ── Form ── */
function GuruForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;

  // Hanya ambil field scalar yang relevan untuk form — buang field relasi
  // (user, kelasWali, absensiDibuat, _count) agar tidak dikirim ke backend
  const defaultValues = isEdit ? {
    nip          : initial.nip          ?? '',
    nama         : initial.nama         ?? '',
    jenisKelamin : initial.jenisKelamin ?? 'L',
    email        : initial.email        ?? '',
    telepon      : initial.telepon      ?? '',
    alamat       : initial.alamat       ?? '',
  } : { jenisKelamin: 'L' };

  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  const mut = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/guru/${initial.id}`, d) : api.post('/guru', d),
    onSuccess: () => { toast.success(isEdit ? 'Data guru diperbarui' : 'Guru berhasil ditambahkan'); onSuccess(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });
  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">NIP</label>
          <input {...register('nip')} className="input" placeholder="Kosongkan jika tidak ada" disabled={isEdit} />
        </div>
        <div>
          <label className="label">Nama Lengkap *</label>
          <input {...register('nama', { required: 'Wajib diisi' })} className={`input ${errors.nama ? 'input-error' : ''}`} placeholder="Nama lengkap" />
          {errors.nama && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.nama.message}</p>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Jenis Kelamin *</label>
          <select {...register('jenisKelamin')} className="input">
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" {...register('email')} className="input" placeholder="email@sekolah.sch.id" />
        </div>
      </div>
      <div>
        <label className="label">Telepon</label>
        <input {...register('telepon')} className="input" placeholder="08xxxxxxxxxx" />
      </div>
      <div>
        <label className="label">Alamat</label>
        <textarea {...register('alamat')} className="input" rows={2} placeholder="Alamat lengkap" style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Guru'}
        </button>
      </div>
    </form>
  );
}

/* ── Halaman ── */
export default function GuruPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isGuru = user?.role === 'GURU';
  const canEdit = !isGuru;
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [downloading, setDownloading] = useState('');

  /* ── Selection ── */
  const [selected, setSelected]         = useState(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['guru', page, search],
    queryFn: () => api.get('/guru', { params: { page, limit: 20, search } }).then(r => r.data),
    keepPreviousData: true,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/guru/${id}`),
    onSuccess: () => { toast.success('Guru berhasil dihapus'); qc.invalidateQueries(['guru']); setDeleteId(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids) => api.delete('/guru', { data: { ids } }),
    onSuccess: (res) => {
      toast.success(res.data.message || `${selected.size} guru berhasil dihapus`);
      qc.invalidateQueries(['guru']);
      setSelected(new Set());
      setShowBulkConfirm(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const importMut = useMutation({
    mutationFn: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/guru/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    onSuccess: (res) => { toast.success(res.data.message); qc.invalidateQueries(['guru']); setShowImport(false); setImportFile(null); },
    onError: () => toast.error('Import gagal'),
  });

  const handleTemplate = async () => { setDownloading('template'); await downloadFromApi('/master/template/guru', 'template-import-guru.xlsx'); setDownloading(''); };
  const handleExport   = async () => { setDownloading('export');   await downloadFromApi('/master/export/guru',   `data-guru-${Date.now()}.xlsx`); setDownloading(''); };

  /* ── Selection helpers ── */
  const rows        = data?.data ?? [];
  const allIds      = rows.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected;
  const toggleAll   = () => { if (allSelected) { const s = new Set(selected); allIds.forEach(id => s.delete(id)); setSelected(s); } else { const s = new Set(selected); allIds.forEach(id => s.add(id)); setSelected(s); } };
  const toggleOne   = (id) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const columns = [
    { header: <Cb checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />, cell: (row) => <Cb checked={selected.has(row.id)} indeterminate={false} onChange={() => toggleOne(row.id)} />, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    { header: 'No', cell: (_, i) => (page - 1) * 20 + i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center text-xs' },
    {
      header: 'Guru',
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{row.nama?.charAt(0)}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)' }}>{row.nama}</div>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace' }}>{row.nip || '—'}</div>
          </div>
        </div>
      ),
    },
    { header: 'L/P',       cell: (r) => <span className={r.jenisKelamin === 'L' ? 'badge badge-blue' : 'badge badge-pink'}>{r.jenisKelamin}</span>, cellClass: 'text-center', headerClass: 'text-center' },
    { header: 'Email',     cell: (r) => <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.email || '—'}</span> },
    { header: 'Telepon',   cell: (r) => <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.telepon || '—'}</span> },
    { header: 'Wali Kelas',cell: (r) => r.kelasWali?.length ? <span className="badge badge-green">{r.kelasWali.map(k => k.nama).join(', ')}</span> : <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>—</span> },
    {
      header: 'Aksi',
      cell: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {canEdit && <button onClick={() => { setEditData(row); setShowForm(true); }} className="btn btn-ghost btn-icon" style={{ color: 'var(--color-primary)' }} title="Edit"><Edit style={{ width: 15, height: 15 }} /></button>}
          {canEdit && <button onClick={() => { setDeleteId(row.id); setDeleteName(row.nama); }} className="btn btn-ghost btn-icon" style={{ color: '#ef4444' }} title="Hapus"><Trash2 style={{ width: 15, height: 15 }} /></button>}
        </div>
      ),
      headerClass: 'text-right', cellClass: 'text-right',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Guru</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>{data?.pagination?.total ?? 0} guru terdaftar</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {canEdit && (
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
              {[
                { label: 'Template', icon: FileSpreadsheet, color: '#22c55e', action: handleTemplate, key: 'template' },
                { label: 'Import',   icon: Upload,          color: '#f59e0b', action: () => setShowImport(true), key: 'import' },
                { label: downloading === 'export' ? 'Mengekspor...' : 'Export', icon: FileDown, color: '#3b82f6', action: handleExport, key: 'export' },
              ].map((btn, idx, arr) => (
                <button key={btn.key} onClick={btn.action} disabled={downloading === btn.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--color-surface-hover)', border: 'none', borderRight: idx < arr.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--color-foreground)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                >
                  <btn.icon style={{ width: 14, height: 14, color: btn.color }} />{btn.label}
                </button>
              ))}
            </div>
          )}
          {canEdit && <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn btn-primary">
            <Plus style={{ width: 15, height: 15 }} /> Tambah Guru
          </button>}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'rgba(var(--color-primary-rgb),0.08)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>{selected.size} guru dipilih</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}><X style={{ width: 13, height: 13 }} /> Batal Pilih</button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowBulkConfirm(true)}><Trash2 style={{ width: 13, height: 13 }} /> Hapus {selected.size} Guru</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Cari nama, NIP..." className="w-64" />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="Tidak ada data guru" />
      </div>
      {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={data.pagination.limit} onPageChange={setPage} />}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditData(null); }} title={editData ? 'Edit Data Guru' : 'Tambah Guru Baru'} size="md">
        <GuruForm initial={editData} onSuccess={() => { setShowForm(false); setEditData(null); qc.invalidateQueries(['guru']); }} onCancel={() => { setShowForm(false); setEditData(null); }} />
      </Modal>

      <Modal open={showImport} onClose={() => { setShowImport(false); setImportFile(null); }} title="Import Data Guru dari Excel" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setShowImport(false)}>Batal</button><button className="btn btn-primary" disabled={!importFile || importMut.isPending} onClick={() => importMut.mutate(importFile)}>{importMut.isPending ? 'Mengimpor...' : 'Import'}</button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', fontSize: 12, color: 'var(--color-muted)' }}>
            <p style={{ fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 8 }}>📋 Format Kolom</p>
            <p style={{ lineHeight: 1.8, margin: 0 }}>NIP, <strong>Nama Lengkap *</strong>, <strong>Jenis Kelamin *</strong> (L/P), Email, Telepon, Alamat</p>
            <button onClick={handleTemplate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)', width: '100%' }}>
              <FileSpreadsheet style={{ width: 14, height: 14, color: '#22c55e' }} /> Download Template
            </button>
          </div>
          <div>
            <label className="label">File Excel (.xlsx)</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files[0])} className="input" />
          </div>
          {importFile && <p style={{ fontSize: 12, color: '#22c55e' }}>✓ {importFile.name}</p>}
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Hapus Guru" message={`Guru "${deleteName}" akan dihapus dari sistem. Lanjutkan?`} confirmLabel="Ya, Hapus"
      />
      <ConfirmDialog open={showBulkConfirm} onClose={() => setShowBulkConfirm(false)} onConfirm={() => bulkDeleteMut.mutate([...selected])} loading={bulkDeleteMut.isPending}
        title="Hapus Guru Terpilih" message={`${selected.size} guru yang dipilih akan dihapus dari sistem. Lanjutkan?`} confirmLabel={`Ya, Hapus ${selected.size} Guru`}
      />
    </div>
  );
}
