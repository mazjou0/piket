import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { downloadFromApi } from '@/lib/download';
import { DataTable } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Edit, Trash2, Upload, FileDown, FileSpreadsheet, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

/* ── Checkbox ── */
function Cb({ checked, indeterminate, onChange }) {
  return (
    <input type="checkbox" checked={checked} ref={el => { if (el) el.indeterminate = indeterminate; }} onChange={onChange}
      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
  );
}

/* ── Form Tambah/Edit Jurusan ── */
function JurusanForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initial ? { nama: initial.nama, singkatan: initial.singkatan } : {},
  });
  const mut = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/jurusan/${initial.id}`, { nama: d.nama, singkatan: d.singkatan }) : api.post('/jurusan', d),
    onSuccess: () => { toast.success(isEdit ? 'Jurusan diperbarui' : 'Jurusan ditambahkan'); onSuccess(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });
  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!isEdit && (
        <div>
          <label className="label">Kode Jurusan *</label>
          <input {...register('kode', { required: 'Wajib diisi' })} className={`input ${errors.kode ? 'input-error' : ''}`} placeholder="RPL" style={{ textTransform: 'uppercase' }} />
          {errors.kode && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.kode.message}</p>}
          <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>Kode tidak dapat diubah setelah tersimpan</p>
        </div>
      )}
      <div>
        <label className="label">Nama Lengkap Jurusan *</label>
        <input {...register('nama', { required: 'Wajib diisi' })} className={`input ${errors.nama ? 'input-error' : ''}`} placeholder="Rekayasa Perangkat Lunak" />
        {errors.nama && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.nama.message}</p>}
      </div>
      <div>
        <label className="label">Singkatan *</label>
        <input {...register('singkatan', { required: 'Wajib diisi' })} className={`input ${errors.singkatan ? 'input-error' : ''}`} placeholder="RPL" style={{ textTransform: 'uppercase' }} />
        {errors.singkatan && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.singkatan.message}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Jurusan'}
        </button>
      </div>
    </form>
  );
}

/* ── Halaman ── */
export default function JurusanPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role !== 'GURU';
  const [showForm,    setShowForm]    = useState(false);
  const [editData,    setEditData]    = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleteName,  setDeleteName]  = useState('');
  const [deleteRow,   setDeleteRow]   = useState(null);
  const [showImport,  setShowImport]  = useState(false);
  const [importFile,  setImportFile]  = useState(null);
  const [downloading, setDownloading] = useState('');

  /* ── Selection ── */
  const [selected, setSelected]               = useState(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['jurusan'],
    queryFn: () => api.get('/jurusan', { params: { limit: 100 } }).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/jurusan/${id}`),
    onSuccess: () => { toast.success('Jurusan dihapus'); qc.invalidateQueries(['jurusan']); setDeleteId(null); setDeleteRow(null); },
    onError: (e) => { toast.error(e.response?.data?.message || 'Gagal menghapus'); setDeleteId(null); setDeleteRow(null); },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids) => api.delete('/jurusan', { data: { ids } }),
    onSuccess: (res) => {
      toast.success(res.data.message || `${selected.size} jurusan berhasil dinonaktifkan`);
      qc.invalidateQueries(['jurusan']);
      setSelected(new Set());
      setShowBulkConfirm(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const importMut = useMutation({
    mutationFn: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/jurusan/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    onSuccess: (res) => { toast.success(res.data.message); qc.invalidateQueries(['jurusan']); setShowImport(false); setImportFile(null); },
    onError: () => toast.error('Import gagal'),
  });

  const handleTemplate = async () => { setDownloading('template'); await downloadFromApi('/master/template/jurusan', 'template-import-jurusan.xlsx'); setDownloading(''); };
  const handleExport   = async () => {
    setDownloading('export');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Jurusan');
      ws.columns = [{ header: 'Kode *', key: 'kode', width: 12 }, { header: 'Nama Lengkap *', key: 'nama', width: 40 }, { header: 'Singkatan *', key: 'singkatan', width: 16 }];
      ws.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });
      data?.data?.forEach(j => ws.addRow([j.kode, j.nama, j.singkatan]));
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf]));
      const a = document.createElement('a'); a.href = url; a.download = `data-jurusan-${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url);
      toast.success('Export berhasil!');
    } catch { toast.error('Export gagal'); }
    setDownloading('');
  };

  const handleDeleteClick = (row) => { setDeleteId(row.id); setDeleteName(row.nama); setDeleteRow(row); };
  const hasData  = deleteRow && ((deleteRow._count?.kelas || 0) > 0 || (deleteRow._count?.siswa || 0) > 0);
  const canDelete = !hasData;

  /* ── Selection helpers ── */
  const rows        = data?.data ?? [];
  const allIds      = rows.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected;
  const toggleAll   = () => { if (allSelected) { const s = new Set(selected); allIds.forEach(id => s.delete(id)); setSelected(s); } else { const s = new Set(selected); allIds.forEach(id => s.add(id)); setSelected(s); } };
  const toggleOne   = (id) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const columns = [
    { header: <Cb checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />, cell: (row) => <Cb checked={selected.has(row.id)} indeterminate={false} onChange={() => toggleOne(row.id)} />, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    { header: 'No',          cell: (_, i) => i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center text-xs' },
    { header: 'Kode',        cell: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>{r.kode}</span> },
    { header: 'Nama Jurusan', cell: (r) => <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>{r.nama}</span> },
    { header: 'Singkatan',   cell: (r) => r.singkatan },
    { header: 'Kelas',       cell: (r) => <span className="badge badge-blue">{r._count?.kelas ?? 0}</span>, cellClass: 'text-center', headerClass: 'text-center' },
    { header: 'Siswa',       cell: (r) => <span style={{ fontSize: 13, fontWeight: 600 }}>{r._count?.siswa ?? 0}</span>, cellClass: 'text-center', headerClass: 'text-center' },
    {
      header: 'Aksi',
      cell: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {canEdit && <button onClick={() => { setEditData(row); setShowForm(true); }} className="btn btn-ghost btn-icon" style={{ color: 'var(--color-primary)' }} title="Edit"><Edit style={{ width: 15, height: 15 }} /></button>}
          {canEdit && <button onClick={() => handleDeleteClick(row)} className="btn btn-ghost btn-icon" style={{ color: '#ef4444' }} title="Hapus"><Trash2 style={{ width: 15, height: 15 }} /></button>}
        </div>
      ),
      headerClass: 'text-right', cellClass: 'text-right',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Jurusan</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>{rows.length} jurusan terdaftar</p>
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
            <Plus style={{ width: 15, height: 15 }} /> Tambah Jurusan
          </button>}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'rgba(var(--color-primary-rgb),0.08)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>{selected.size} jurusan dipilih</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}><X style={{ width: 13, height: 13 }} /> Batal Pilih</button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowBulkConfirm(true)}><Trash2 style={{ width: 13, height: 13 }} /> Hapus {selected.size} Jurusan</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="Tidak ada data jurusan" />
      </div>

      {/* ── Modal Form ── */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditData(null); }} title={editData ? 'Edit Jurusan' : 'Tambah Jurusan'} size="sm">
        <JurusanForm initial={editData} onSuccess={() => { setShowForm(false); setEditData(null); qc.invalidateQueries(['jurusan']); }} onCancel={() => { setShowForm(false); setEditData(null); }} />
      </Modal>

      {/* ── Modal Import ── */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportFile(null); }} title="Import Data Jurusan dari Excel" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => { setShowImport(false); setImportFile(null); }}>Batal</button><button className="btn btn-primary" disabled={!importFile || importMut.isPending} onClick={() => importMut.mutate(importFile)}>{importMut.isPending ? 'Mengimpor...' : 'Import'}</button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', fontSize: 12, color: 'var(--color-muted)' }}>
            <p style={{ fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 8 }}>📋 Format Kolom</p>
            <p style={{ lineHeight: 1.8, margin: 0 }}><strong>Kode *</strong>, <strong>Nama Lengkap *</strong>, <strong>Singkatan *</strong></p>
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

      {/* ── Konfirmasi Hapus Satu (custom karena ada validasi relasi) ── */}
      <Modal open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteRow(null); }} title="Hapus Jurusan" size="xs"
        footer={<><button className="btn btn-secondary" onClick={() => { setDeleteId(null); setDeleteRow(null); }}>Batal</button><button className="btn btn-danger" disabled={!canDelete || deleteMut.isPending} onClick={() => deleteMut.mutate(deleteId)}>{deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}</button></>}
      >
        {hasData ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0' }}>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.1)', flexShrink: 0 }}><AlertTriangle style={{ width: 20, height: 20, color: '#ef4444' }} /></div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--color-foreground)', fontSize: 13, margin: '0 0 6px' }}>Tidak dapat menghapus "{deleteName}"</p>
              <ul style={{ fontSize: 12, color: 'var(--color-muted)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                {(deleteRow?._count?.kelas || 0) > 0 && <li><strong style={{ color: '#ef4444' }}>{deleteRow._count.kelas} kelas</strong> masih aktif</li>}
                {(deleteRow?._count?.siswa || 0) > 0 && <li><strong style={{ color: '#ef4444' }}>{deleteRow._count.siswa} siswa</strong> terdaftar</li>}
              </ul>
              <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}>Pindahkan atau hapus data terkait terlebih dahulu.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0' }}>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.1)', flexShrink: 0 }}><Trash2 style={{ width: 20, height: 20, color: '#ef4444' }} /></div>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>Jurusan <strong style={{ color: 'var(--color-foreground)' }}>"{deleteName}"</strong> akan dihapus permanen.</p>
          </div>
        )}
      </Modal>

      {/* ── Konfirmasi Hapus Massal ── */}
      <ConfirmDialog open={showBulkConfirm} onClose={() => setShowBulkConfirm(false)} onConfirm={() => bulkDeleteMut.mutate([...selected])} loading={bulkDeleteMut.isPending}
        title="Hapus Jurusan Terpilih"
        message={`${selected.size} jurusan yang dipilih akan dihapus. Jurusan yang masih memiliki kelas atau siswa aktif akan otomatis diblokir oleh server. Lanjutkan?`}
        confirmLabel={`Ya, Hapus ${selected.size} Jurusan`}
      />
    </div>
  );
}
