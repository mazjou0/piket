import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { downloadFromApi } from '@/lib/download';
import { DataTable, Pagination } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Edit, Trash2, Upload, FileDown, FileSpreadsheet, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

/* ── Checkbox ── */
function Cb({ checked, indeterminate, onChange }) {
  return (
    <input type="checkbox" checked={checked} ref={el => { if (el) el.indeterminate = indeterminate; }} onChange={onChange}
      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
  );
}

/* ── Form Tambah/Edit Kelas ── */
function KelasForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const { data: jurusanList } = useQuery({ queryKey: ['jurusan-list'],      queryFn: () => api.get('/jurusan',      { params: { limit: 100 } }).then(r => r.data.data) });
  const { data: tahunList }   = useQuery({ queryKey: ['tahun-ajaran-list'], queryFn: () => api.get('/tahun-ajaran').then(r => r.data.data) });
  const { data: guruList }    = useQuery({ queryKey: ['guru-list-select'],  queryFn: () => api.get('/guru',         { params: { limit: 200, aktif: true } }).then(r => r.data.data) });

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initial
      ? { nama: initial.nama, tingkat: String(initial.tingkat), jurusanId: initial.jurusanId, tahunAjaranId: initial.tahunAjaranId, waliKelasId: initial.waliKelasId || '', kapasitas: initial.kapasitas || 36 }
      : { kapasitas: 36 },
  });

  const mut = useMutation({
    mutationFn: (d) => {
      const p = { ...d, tingkat: parseInt(d.tingkat), kapasitas: parseInt(d.kapasitas) };
      if (!p.waliKelasId) delete p.waliKelasId;
      return isEdit ? api.put(`/kelas/${initial.id}`, p) : api.post('/kelas', p);
    },
    onSuccess: () => { toast.success(isEdit ? 'Kelas diperbarui' : 'Kelas ditambahkan'); onSuccess(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className="label">Nama Kelas *</label>
        <input {...register('nama', { required: 'Wajib diisi' })} className={`input ${errors.nama ? 'input-error' : ''}`} placeholder="X RPL 1" />
        {errors.nama && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.nama.message}</p>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Tingkat *</label>
          <select {...register('tingkat', { required: true })} className="input">
            <option value="">Pilih...</option>
            <option value="10">X (10)</option>
            <option value="11">XI (11)</option>
            <option value="12">XII (12)</option>
          </select>
        </div>
        <div>
          <label className="label">Kapasitas</label>
          <input type="number" {...register('kapasitas')} className="input" min="1" max="50" />
        </div>
      </div>
      <div>
        <label className="label">Jurusan *</label>
        <select {...register('jurusanId', { required: true })} className="input">
          <option value="">Pilih Jurusan...</option>
          {jurusanList?.map(j => <option key={j.id} value={j.id}>{j.nama} ({j.kode})</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tahun Ajaran *</label>
        <select {...register('tahunAjaranId', { required: true })} className="input">
          <option value="">Pilih Tahun Ajaran...</option>
          {tahunList?.map(t => <option key={t.id} value={t.id}>{t.nama}{t.aktif ? ' ✓ Aktif' : ''}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Wali Kelas</label>
        <select {...register('waliKelasId')} className="input">
          <option value="">— Belum Ditentukan —</option>
          {guruList?.map(g => <option key={g.id} value={g.id}>{g.nama}{g.nip ? ` (${g.nip})` : ''}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Kelas'}
        </button>
      </div>
    </form>
  );
}

/* ── Halaman ── */
export default function KelasPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role !== 'GURU';
  const [page, setPage]         = useState(1);
  const [filterTA, setFilterTA] = useState('');
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
    queryKey: ['kelas', page, filterTA],
    queryFn: () => api.get('/kelas', { params: { page, limit: 30, ...(filterTA && { tahunAjaranId: filterTA }) } }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: tahunList } = useQuery({ queryKey: ['tahun-ajaran-list'], queryFn: () => api.get('/tahun-ajaran').then(r => r.data.data) });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/kelas/${id}`),
    onSuccess: () => { toast.success('Kelas berhasil dihapus'); qc.invalidateQueries(['kelas']); setDeleteId(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids) => api.delete('/kelas', { data: { ids } }),
    onSuccess: (res) => {
      toast.success(res.data.message || `${selected.size} kelas berhasil dihapus`);
      qc.invalidateQueries(['kelas']);
      setSelected(new Set());
      setShowBulkConfirm(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const importMut = useMutation({
    mutationFn: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/kelas/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    onSuccess: (res) => { toast.success(res.data.message); qc.invalidateQueries(['kelas']); setShowImport(false); setImportFile(null); },
    onError: () => toast.error('Import gagal'),
  });

  const handleTemplate = async () => { setDownloading('template'); await downloadFromApi('/master/template/kelas', 'template-import-kelas.xlsx'); setDownloading(''); };
  const handleExport   = async () => { setDownloading('export');   await downloadFromApi('/master/export/kelas',   `data-kelas-${Date.now()}.xlsx`, filterTA ? { tahunAjaranId: filterTA } : {}); setDownloading(''); };

  /* ── Selection helpers ── */
  const rows        = data?.data ?? [];
  const allIds      = rows.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected;
  const toggleAll   = () => { if (allSelected) { const s = new Set(selected); allIds.forEach(id => s.delete(id)); setSelected(s); } else { const s = new Set(selected); allIds.forEach(id => s.add(id)); setSelected(s); } };
  const toggleOne   = (id) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const columns = [
    { header: <Cb checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />, cell: (row) => <Cb checked={selected.has(row.id)} indeterminate={false} onChange={() => toggleOne(row.id)} />, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    { header: 'No', cell: (_, i) => (page - 1) * 30 + i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center text-xs' },
    {
      header: 'Kelas',
      cell: (r) => (<div><div style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>{r.nama}</div><div style={{ fontSize: 11, color: 'var(--color-muted)' }}>Tingkat {r.tingkat}</div></div>),
    },
    { header: 'Jurusan',     cell: (r) => <span className="badge badge-blue">{r.jurusan?.kode}</span> },
    { header: 'Tahun Ajaran', cell: (r) => <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.tahunAjaran?.nama}</span> },
    { header: 'Wali Kelas',  cell: (r) => r.waliKelas ? <span style={{ fontSize: 12 }}>{r.waliKelas.nama}</span> : <span style={{ color: 'var(--color-muted)', fontSize: 12, fontStyle: 'italic' }}>Belum ditentukan</span> },
    {
      header: 'Siswa',
      cell: (r) => (<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users style={{ width: 13, height: 13, color: 'var(--color-muted)' }} /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>{r._count?.siswaKelas ?? 0}</span><span style={{ fontSize: 11, color: 'var(--color-muted)' }}>/ {r.kapasitas}</span></div>),
    },
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
          <h1 className="page-title">Data Kelas</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>{data?.pagination?.total ?? 0} kelas</p>
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
            <Plus style={{ width: 15, height: 15 }} /> Tambah Kelas
          </button>}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'rgba(var(--color-primary-rgb),0.08)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>{selected.size} kelas dipilih</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}><X style={{ width: 13, height: 13 }} /> Batal Pilih</button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowBulkConfirm(true)}><Trash2 style={{ width: 13, height: 13 }} /> Hapus {selected.size} Kelas</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <select value={filterTA} onChange={e => { setFilterTA(e.target.value); setPage(1); }} className="input" style={{ width: 200 }}>
          <option value="">Semua Tahun Ajaran</option>
          {tahunList?.map(t => <option key={t.id} value={t.id}>{t.nama}{t.aktif ? ' ✓' : ''}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="Tidak ada data kelas" />
      </div>
      {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={data.pagination.limit} onPageChange={setPage} />}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditData(null); }} title={editData ? 'Edit Kelas' : 'Tambah Kelas Baru'} size="md">
        <KelasForm initial={editData} onSuccess={() => { setShowForm(false); setEditData(null); qc.invalidateQueries(['kelas']); }} onCancel={() => { setShowForm(false); setEditData(null); }} />
      </Modal>

      <Modal open={showImport} onClose={() => { setShowImport(false); setImportFile(null); }} title="Import Data Kelas dari Excel" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => { setShowImport(false); setImportFile(null); }}>Batal</button><button className="btn btn-primary" disabled={!importFile || importMut.isPending} onClick={() => importMut.mutate(importFile)}>{importMut.isPending ? 'Mengimpor...' : 'Import'}</button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', fontSize: 12, color: 'var(--color-muted)' }}>
            <p style={{ fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 8 }}>📋 Format Kolom</p>
            <p style={{ lineHeight: 1.8, margin: 0 }}><strong>Nama Kelas *</strong>, <strong>Tingkat *</strong>, <strong>Kode Jurusan *</strong>, <strong>Tahun Ajaran *</strong>, NIP Wali Kelas, Kapasitas</p>
            <button onClick={handleTemplate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)', width: '100%' }}>
              <FileSpreadsheet style={{ width: 14, height: 14, color: '#22c55e' }} /> Download Template
            </button>
          </div>
          <div>
            <label className="label">File Excel (.xlsx)</label>
            <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files[0])} className="input" />
          </div>
          {importFile && <p style={{ fontSize: 12, color: '#22c55e' }}>✓ {importFile.name}</p>}
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Hapus Kelas" message={`Kelas "${deleteName}" akan dihapus.`} confirmLabel="Ya, Hapus"
      />
      <ConfirmDialog open={showBulkConfirm} onClose={() => setShowBulkConfirm(false)} onConfirm={() => bulkDeleteMut.mutate([...selected])} loading={bulkDeleteMut.isPending}
        title="Hapus Kelas Terpilih" message={`${selected.size} kelas yang dipilih akan dihapus. Lanjutkan?`} confirmLabel={`Ya, Hapus ${selected.size} Kelas`}
      />
    </div>
  );
}
