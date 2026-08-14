import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, CheckCircle, Calendar, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { formatDate } from '@/lib/utils';

/* ── Form Semester ── */
function SemesterForm({ tahunAjaranId, initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initial ? {
      nama: initial.nama,
      urutan: initial.urutan,
      mulai: initial.mulai?.split('T')[0],
      selesai: initial.selesai?.split('T')[0],
      aktif: initial.aktif,
    } : { nama: 'Ganjil', urutan: 1, aktif: false },
  });

  const mut = useMutation({
    mutationFn: (d) => {
      const payload = {
        ...d,
        tahunAjaranId,
        urutan: parseInt(d.urutan),
        aktif: d.aktif === true || d.aktif === 'on' || d.aktif === 'true',
      };
      return isEdit
        ? api.put(`/semester/${initial.id}`, payload)
        : api.post('/semester', payload);
    },
    onSuccess: () => { toast.success(isEdit ? 'Semester diperbarui' : 'Semester dibuat'); onSuccess(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Nama Semester *</label>
          <select {...register('nama', { required: true })} className="input">
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div>
          <label className="label">Urutan *</label>
          <select {...register('urutan')} className="input">
            <option value={1}>1 (Pertama)</option>
            <option value={2}>2 (Kedua)</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Tanggal Mulai *</label>
          <input type="date" {...register('mulai', { required: true })} className="input" />
        </div>
        <div>
          <label className="label">Tanggal Selesai *</label>
          <input type="date" {...register('selesai', { required: true })} className="input" />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
        <input type="checkbox" {...register('aktif')} id="smt-aktif"
          style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
        <label htmlFor="smt-aktif" style={{ fontSize: 13, color: 'var(--color-foreground)', cursor: 'pointer' }}>
          Jadikan Aktif
          <span style={{ display: 'block', fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
            Semester lain di tahun ajaran ini otomatis dinonaktifkan
          </span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Semester'}
        </button>
      </div>
    </form>
  );
}

/* ── Panel daftar semester per tahun ajaran ── */
function SemesterPanel({ row }) {
  const qc = useQueryClient();
  const [open, setOpen]         = useState(false);
  const [showForm, setShowForm]  = useState(false);
  const [editSmt, setEditSmt]    = useState(null);

  const { data: semesterList, isLoading } = useQuery({
    queryKey: ['semester', row.id],
    queryFn: () => api.get('/semester', { params: { tahunAjaranId: row.id } }).then(r => r.data.data),
    enabled: open,
  });

  const aktivasiMut = useMutation({
    mutationFn: (id) => api.put(`/semester/${id}`, { aktif: true, tahunAjaranId: row.id }),
    onSuccess: () => { toast.success('Semester diaktifkan'); qc.invalidateQueries(['semester', row.id]); qc.invalidateQueries(['tahun-ajaran']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal'),
  });

  return (
    <div style={{ marginTop: 4 }}>
      {/* Tombol expand */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
          fontSize: 12, color: 'var(--color-primary)', fontWeight: 600,
        }}
      >
        {open
          ? <ChevronUp style={{ width: 13, height: 13 }} />
          : <ChevronDown style={{ width: 13, height: 13 }} />}
        {row.semester?.length ?? 0} semester
      </button>

      {open && (
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
          {isLoading && <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>Memuat...</p>}

          {semesterList?.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '0 0 8px' }}>Belum ada semester</p>
          )}

          {semesterList?.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 0', borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.aktif
                  ? <CheckCircle style={{ width: 13, height: 13, color: '#4ade80', flexShrink: 0 }} />
                  : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid var(--color-border)', flexShrink: 0 }} />
                }
                <span style={{ fontSize: 13, fontWeight: s.aktif ? 700 : 500, color: s.aktif ? 'var(--color-foreground)' : 'var(--color-muted)' }}>
                  Semester {s.urutan} — {s.nama}
                </span>
                {s.aktif && <span className="badge badge-green" style={{ fontSize: 10 }}>Aktif</span>}
                <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                  {formatDate(s.mulai, 'dd MMM yyyy')} – {formatDate(s.selesai, 'dd MMM yyyy')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!s.aktif && (
                  <button
                    onClick={() => aktivasiMut.mutate(s.id)}
                    disabled={aktivasiMut.isPending}
                    className="btn btn-ghost btn-sm btn-icon"
                    style={{ color: '#22c55e', fontSize: 11 }}
                    title="Jadikan Aktif"
                  >
                    <CheckCircle style={{ width: 13, height: 13 }} />
                  </button>
                )}
                <button
                  onClick={() => { setEditSmt(s); setShowForm(true); }}
                  className="btn btn-ghost btn-sm btn-icon"
                  style={{ color: 'var(--color-primary)' }}
                  title="Edit"
                >
                  <Edit style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => { setEditSmt(null); setShowForm(true); }}
            className="btn btn-secondary"
            style={{ marginTop: 10, padding: '5px 12px', fontSize: 12 }}
          >
            <Plus style={{ width: 12, height: 12 }} /> Tambah Semester
          </button>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditSmt(null); }}
        title={editSmt ? 'Edit Semester' : 'Tambah Semester'}
        size="sm"
      >
        <SemesterForm
          tahunAjaranId={row.id}
          initial={editSmt}
          onSuccess={() => {
            setShowForm(false);
            setEditSmt(null);
            qc.invalidateQueries(['semester', row.id]);
            qc.invalidateQueries(['tahun-ajaran']);
          }}
          onCancel={() => { setShowForm(false); setEditSmt(null); }}
        />
      </Modal>
    </div>
  );
}

function TahunAjaranForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initial
      ? { nama: initial.nama, mulai: initial.mulai?.split('T')[0], selesai: initial.selesai?.split('T')[0], aktif: initial.aktif }
      : { aktif: false },
  });
  const mut = useMutation({
    mutationFn: (d) => {
      const p = { ...d, aktif: d.aktif === true || d.aktif === 'on' || d.aktif === 'true' };
      return isEdit ? api.put(`/tahun-ajaran/${initial.id}`, p) : api.post('/tahun-ajaran', p);
    },
    onSuccess: () => { toast.success(isEdit ? 'Diperbarui' : 'Dibuat'); onSuccess(); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });
  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label className="label">Nama * <span style={{ textTransform:'none', fontWeight:400 }}>(contoh: 2025/2026)</span></label>
        <input {...register('nama', { required:'Wajib diisi', pattern:{ value:/^\d{4}\/\d{4}$/, message:'Format: 2025/2026' } })}
          className={`input ${errors.nama ? 'input-error' : ''}`} placeholder="2025/2026" />
        {errors.nama && <p style={{ fontSize:11, color:'#ef4444', marginTop:3 }}>{errors.nama.message}</p>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label className="label">Tanggal Mulai *</label>
          <input type="date" {...register('mulai', { required:true })} className="input" />
        </div>
        <div>
          <label className="label">Tanggal Selesai *</label>
          <input type="date" {...register('selesai', { required:true })} className="input" />
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, border:'1px solid var(--color-border)', background:'var(--color-surface-hover)' }}>
        <input type="checkbox" {...register('aktif')} id="ta-aktif"
          style={{ width:16, height:16, accentColor:'var(--color-primary)', cursor:'pointer' }} />
        <label htmlFor="ta-aktif" style={{ fontSize:13, color:'var(--color-foreground)', cursor:'pointer' }}>
          Jadikan Aktif
          <span style={{ display:'block', fontSize:11, color:'var(--color-muted)', marginTop:1 }}>
            Tahun ajaran lain otomatis dinonaktifkan
          </span>
        </label>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Tahun Ajaran'}
        </button>
      </div>
    </form>
  );
}

export default function TahunAjaranPage() {
  const qc = useQueryClient();
  const [showForm,    setShowForm]    = useState(false);
  const [editData,    setEditData]    = useState(null);
  const [confirmId,   setConfirmId]   = useState(null);
  const [confirmRow,  setConfirmRow]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: () => api.get('/tahun-ajaran').then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/tahun-ajaran/${id}`),
    onSuccess: () => {
      toast.success('Tahun Ajaran berhasil dihapus');
      qc.invalidateQueries(['tahun-ajaran']);
      setConfirmId(null); setConfirmRow(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Gagal menghapus');
      setConfirmId(null); setConfirmRow(null);
    },
  });

  const activateMut = useMutation({
    mutationFn: (id) => api.put(`/tahun-ajaran/${id}`, { aktif: true }),
    onSuccess: () => { toast.success('Diaktifkan'); qc.invalidateQueries(['tahun-ajaran']); },
  });

  const handleDeleteClick = (row) => {
    if (row.aktif) { toast.error('Tidak dapat menghapus tahun ajaran yang sedang aktif'); return; }
    setConfirmId(row.id);
    setConfirmRow(row);
  };

  const hasRelatedData = confirmRow && (confirmRow._count?.kelas || 0) > 0;
  const canDelete      = !hasRelatedData;

  const columns = [
    { header: 'No', cell: (_, i) => i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    {
      header: 'Tahun Ajaran',
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar style={{ width: 15, height: 15, color: 'var(--color-muted)', flexShrink: 0 }}/>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-foreground)' }}>{row.nama}</span>
          {row.aktif && <span className="badge badge-green" style={{ marginLeft: 4 }}>Aktif</span>}
        </div>
      ),
    },
    { 
      header: 'Mulai', 
      cell: (r) => <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-foreground)' }}>
        {formatDate(r.mulai, 'dd MMM yyyy')}
      </span> 
    },
    { 
      header: 'Selesai', 
      cell: (r) => <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-foreground)' }}>
        {formatDate(r.selesai, 'dd MMM yyyy')}
      </span> 
    },
    { 
      header: 'Semester', 
      cell: (r) => <SemesterPanel row={r} />,
      cellClass: 'align-top',
      headerClass: 'text-center' 
    },
    { 
      header: 'Kelas', 
      cell: (r) => <span style={{ fontSize: 13, fontWeight: 600, color: r._count?.kelas > 0 ? 'var(--color-foreground)' : 'var(--color-muted)' }}>
        {r._count?.kelas ?? 0} kelas
      </span>, 
      cellClass: 'text-center', 
      headerClass: 'text-center' 
    },
    {
      header:'Aksi',
      cell:(row) => (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4 }}>
          {/* Aktifkan (hanya jika belum aktif) */}
          {!row.aktif && (
            <button
              onClick={() => activateMut.mutate(row.id)}
              className="btn btn-ghost btn-sm btn-icon"
              style={{ color:'#22c55e' }}
              title="Aktifkan"
              disabled={activateMut.isPending}
            >
              <CheckCircle style={{ width:15, height:15 }}/>
            </button>
          )}
          {/* Edit */}
          <button
            onClick={() => { setEditData(row); setShowForm(true); }}
            className="btn btn-ghost btn-sm btn-icon"
            style={{ color:'var(--color-primary)' }}
            title="Edit"
          >
            <Edit style={{ width:15, height:15 }}/>
          </button>
          {/* Hapus — tampil untuk semua tapi disabled jika aktif */}
          <button
            onClick={() => handleDeleteClick(row)}
            className="btn btn-ghost btn-sm btn-icon"
            style={{ color: row.aktif ? 'var(--color-border)' : '#ef4444', cursor: row.aktif ? 'not-allowed' : 'pointer' }}
            title={row.aktif ? 'Tidak bisa hapus yang aktif' : 'Hapus'}
          >
            <Trash2 style={{ width:15, height:15 }}/>
          </button>
        </div>
      ),
      headerClass:'text-right', cellClass:'text-right',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tahun Ajaran</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>
            {data?.data?.length ?? 0} tahun ajaran terdaftar
          </p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn btn-primary">
          <Plus style={{ width: 16, height: 16 }}/> Tambah Tahun Ajaran
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable 
          columns={columns} 
          data={data?.data} 
          loading={isLoading} 
          emptyMessage="Belum ada data tahun ajaran" 
        />
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditData(null); }} title={editData ? 'Edit Tahun Ajaran' : 'Buat Tahun Ajaran Baru'} size="sm">
        <TahunAjaranForm
          initial={editData}
          onSuccess={() => { setShowForm(false); setEditData(null); qc.invalidateQueries(['tahun-ajaran']); }}
          onCancel={() => { setShowForm(false); setEditData(null); }}
        />
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        open={!!confirmId}
        onClose={() => { setConfirmId(null); setConfirmRow(null); }}
        title="Hapus Tahun Ajaran"
        size="sm"
      >
        {hasRelatedData ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0 16px' }}>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.1)', flexShrink: 0 }}>
              <AlertTriangle style={{ width: 20, height: 20, color: '#ef4444' }}/>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--color-foreground)', fontSize: 14, margin: '0 0 6px' }}>
                Tidak dapat menghapus "{confirmRow?.nama}"
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
                Masih ada <strong style={{ color: '#ef4444' }}>{confirmRow?._count?.kelas} kelas</strong> terkait.
                Hapus semua kelas di tahun ajaran ini terlebih dahulu.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0 16px' }}>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.1)', flexShrink: 0 }}>
              <Trash2 style={{ width: 20, height: 20, color: '#ef4444' }}/>
            </div>
            <div>
              <p style={{ fontSize: 14, color: 'var(--color-foreground)', fontWeight: 600, margin: '0 0 6px' }}>
                Hapus Tahun Ajaran "{confirmRow?.nama}"?
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
                Tahun ajaran dan semua semester terkait akan dihapus permanen. 
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1 }}
            onClick={() => { setConfirmId(null); setConfirmRow(null); }}
          >
            Batal
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={!canDelete || deleteMut.isPending}
            onClick={() => deleteMut.mutate(confirmId)}
          >
            {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
