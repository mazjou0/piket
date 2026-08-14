import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { downloadFromApi } from '@/lib/download';
import { DataTable, Pagination } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { PeringatanBadge } from '@/components/ui/Badge';
import { Plus, Upload, Eye, Edit, Trash2, FileDown, FileSpreadsheet, X } from 'lucide-react';
import toast from 'react-hot-toast';
import SiswaForm from '@/components/forms/SiswaForm';

/* ── Komponen Checkbox ── */
function Cb({ checked, indeterminate, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={el => { if (el) el.indeterminate = indeterminate; }}
      onChange={onChange}
      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
    />
  );
}

export default function SiswaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = !['GURU'].includes(user?.role);

  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [kelasId, setKelasId]   = useState('');
  const [status, setStatus]     = useState('AKTIF');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [downloading, setDownloading] = useState('');

  /* ── Selection state ── */
  const [selected, setSelected] = useState(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['siswa', page, search, kelasId, status],
    queryFn: () => api.get('/siswa', { params: { page, limit: 20, search, kelasId, status } }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas', { params: { limit: 100, aktif: true } }).then(r => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/siswa/${id}`),
    onSuccess: () => { toast.success('Siswa berhasil dihapus'); qc.invalidateQueries(['siswa']); setDeleteId(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal'),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids) => api.delete('/siswa', { data: { ids } }),
    onSuccess: (res) => {
      toast.success(res.data.message || `${selected.size} siswa berhasil dihapus`);
      qc.invalidateQueries(['siswa']);
      setSelected(new Set());
      setShowBulkConfirm(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  });

  const importMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/siswa/import/dapodik', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => { toast.success(res.data.message); qc.invalidateQueries(['siswa']); setShowImport(false); setImportFile(null); },
    onError: () => toast.error('Import gagal'),
  });

  const handleTemplate = async () => { setDownloading('template'); await downloadFromApi('/master/template/siswa', 'template-import-siswa.xlsx'); setDownloading(''); };
  const handleExport   = async () => { setDownloading('export');   await downloadFromApi('/master/export/siswa',   `data-siswa-${Date.now()}.xlsx`, { status, kelasId }); setDownloading(''); };

  /* ── Selection helpers ── */
  const rows         = data?.data ?? [];
  const allIds       = rows.map(r => r.id);
  const allSelected  = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) { const s = new Set(selected); allIds.forEach(id => s.delete(id)); setSelected(s); }
    else             { const s = new Set(selected); allIds.forEach(id => s.add(id));    setSelected(s); }
  };
  const toggleOne = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const columns = [
    {
      header: <Cb checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />,
      cell: (row) => <Cb checked={selected.has(row.id)} indeterminate={false} onChange={() => toggleOne(row.id)} />,
      headerClass: 'w-10 text-center', cellClass: 'text-center',
    },
    { header: 'No', cell: (_, i) => (page - 1) * 20 + i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center text-xs' },
    {
      header: 'Siswa',
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {row.foto
            ? <img src={row.foto} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} alt="" />
            : <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{row.nama?.charAt(0)}</div>
          }
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)' }}>{row.nama}</div>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace' }}>{row.nis}</div>
          </div>
        </div>
      ),
    },
    { header: 'Kelas',    cell: (row) => row.kelasHistori?.[0]?.kelas?.nama || <span style={{ color: 'var(--color-muted)' }}>—</span> },
    { header: 'Jurusan',  cell: (row) => <span className="badge badge-blue">{row.jurusan?.kode}</span> },
    { header: 'Angkatan', cell: (row) => <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>{row.angkatan}</span>, cellClass: 'text-center', headerClass: 'text-center' },
    {
      header: 'Poin',
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{row.akumulasiPoin?.totalPoin ?? 0}</span>
          <PeringatanBadge status={row.akumulasiPoin?.statusPeringatan} />
        </div>
      ),
    },
    {
      header: 'Aksi',
      cell: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <button onClick={() => navigate(`/siswa/${row.id}`)} className="btn btn-ghost btn-icon" title="Detail"><Eye style={{ width: 15, height: 15 }} /></button>
          {canEdit && <button onClick={() => { setEditData(row); setShowForm(true); }} className="btn btn-ghost btn-icon" style={{ color: 'var(--color-primary)' }} title="Edit"><Edit style={{ width: 15, height: 15 }} /></button>}
          {canEdit && <button onClick={() => { setDeleteId(row.id); setDeleteName(row.nama); }} className="btn btn-ghost btn-icon" style={{ color: '#ef4444' }} title="Hapus"><Trash2 style={{ width: 15, height: 15 }} /></button>}
        </div>
      ),
      headerClass: 'text-right', cellClass: 'text-right',
    },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Siswa</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>{data?.pagination?.total ?? 0} siswa terdaftar</p>
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
            <Plus style={{ width: 15, height: 15 }} /> Tambah Siswa
          </button>}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 12, borderRadius: 10, background: 'rgba(var(--color-primary-rgb),0.08)', border: '1px solid rgba(var(--color-primary-rgb),0.2)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
            {selected.size} siswa dipilih
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
              <X style={{ width: 13, height: 13 }} /> Batal Pilih
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowBulkConfirm(true)}>
              <Trash2 style={{ width: 13, height: 13 }} /> Hapus {selected.size} Siswa
            </button>
          </div>
        </div>
      )}

      {/* ── Filter ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Cari nama, NIS, NISN..." className="w-60" />
        <select value={kelasId} onChange={e => { setKelasId(e.target.value); setPage(1); }} className="input" style={{ width: 160 }}>
          <option value="">Semua Kelas</option>
          {kelasList?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input" style={{ width: 120 }}>
          <option value="AKTIF">Aktif</option>
          <option value="LULUS">Lulus</option>
          <option value="PINDAH">Pindah</option>
          <option value="">Semua</option>
        </select>
      </div>

      {/* ── Tabel ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="Tidak ada data siswa" />
      </div>
      {data?.pagination && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={data.pagination.limit} onPageChange={setPage} />
      )}

      {/* ── Modal Form Tambah/Edit ── */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditData(null); }} title={editData ? 'Edit Data Siswa' : 'Tambah Siswa Baru'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditData(null); }}>Batal</button><button type="submit" form="siswa-form" className="btn btn-primary">{editData ? 'Simpan Perubahan' : 'Tambah Siswa'}</button></>}
      >
        <SiswaForm formId="siswa-form" initialData={editData} kelasList={kelasList || []}
          onSuccess={() => { setShowForm(false); setEditData(null); qc.invalidateQueries(['siswa']); }}
          onCancel={() => { setShowForm(false); setEditData(null); }}
        />
      </Modal>

      {/* ── Modal Import ── */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportFile(null); }} title="Import Data Siswa dari Excel" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => { setShowImport(false); setImportFile(null); }}>Batal</button><button className="btn btn-primary" disabled={!importFile || importMut.isPending} onClick={() => importMut.mutate(importFile)}>{importMut.isPending ? 'Mengimpor...' : 'Import'}</button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', fontSize: 12, color: 'var(--color-muted)' }}>
            <p style={{ fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 8 }}>📋 Format Kolom</p>
            <p style={{ lineHeight: 1.8, margin: 0 }}><strong>NIS *</strong>, NISN, <strong>Nama Lengkap *</strong>, <strong>Jenis Kelamin *</strong> (L/P), Tempat Lahir, Tanggal Lahir, Agama, <strong>Kode Jurusan *</strong>, <strong>Angkatan *</strong>, Nama Orang Tua, Telepon Orang Tua</p>
            <button onClick={handleTemplate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)', width: '100%' }}>
              <FileSpreadsheet style={{ width: 14, height: 14, color: '#22c55e' }} /> Download Template Kosong
            </button>
          </div>
          <div>
            <label className="label">File Excel (.xlsx)</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files[0])} className="input" />
          </div>
          {importFile && <p style={{ fontSize: 12, color: '#22c55e' }}>✓ {importFile.name}</p>}
        </div>
      </Modal>

      {/* ── Konfirmasi Hapus Satu ── */}
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Hapus Siswa" message={`Siswa "${deleteName}" akan dihapus. Riwayat absensi dan pelanggaran tetap tersimpan.`} confirmLabel="Ya, Hapus"
      />

      {/* ── Konfirmasi Hapus Massal ── */}
      <ConfirmDialog open={showBulkConfirm} onClose={() => setShowBulkConfirm(false)} onConfirm={() => bulkDeleteMut.mutate([...selected])} loading={bulkDeleteMut.isPending}
        title="Hapus Siswa Terpilih" message={`${selected.size} siswa yang dipilih akan dihapus. Riwayat absensi dan pelanggaran tetap tersimpan. Lanjutkan?`} confirmLabel={`Ya, Hapus ${selected.size} Siswa`}
      />
    </div>
  );
}
