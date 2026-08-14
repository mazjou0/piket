import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

function JenisForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initial || { poin: 5, kategori: 'ringan', aktif: true },
  });
  
  const mut = useMutation({
    mutationFn: (d) => {
      const p = { ...d, poin: parseInt(d.poin) };
      return isEdit ? api.put(`/pelanggaran/jenis/${initial.id}`, p) : api.post('/pelanggaran/jenis', p);
    },
    onSuccess: () => { toast.success(isEdit ? 'Diperbarui' : 'Ditambahkan'); onSuccess(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label">Kode *</label>
        <input 
          {...register('kode', { required: 'Wajib diisi' })} 
          className={`input ${errors.kode ? 'input-error' : ''}`}
          placeholder="TLB" 
          style={{ textTransform: 'uppercase' }} 
          disabled={isEdit} 
        />
        {errors.kode && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.kode.message}</p>}
      </div>

      <div>
        <label className="label">Nama Pelanggaran *</label>
        <input 
          {...register('nama', { required: 'Wajib diisi' })} 
          className={`input ${errors.nama ? 'input-error' : ''}`}
          placeholder="Terlambat masuk sekolah" 
        />
        {errors.nama && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.nama.message}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Poin *</label>
          <input 
            type="number" 
            {...register('poin', { required: true, min: 1 })} 
            className="input" 
            min="1" 
            max="200" 
          />
        </div>
        <div>
          <label className="label">Kategori</label>
          <select {...register('kategori')} className="input">
            <option value="ringan">Ringan</option>
            <option value="sedang">Sedang</option>
            <option value="berat">Berat</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Deskripsi</label>
        <textarea 
          {...register('deskripsi')} 
          className="input" 
          rows={2} 
          placeholder="Keterangan pelanggaran (opsional)..." 
          style={{ resize: 'vertical' }} 
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah'}
        </button>
      </div>
    </form>
  );
}

export default function JenisPelanggaranPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['jenis-pelanggaran'],
    queryFn: () => api.get('/pelanggaran/jenis').then(r => ({ data: r.data.data })),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.put(`/pelanggaran/jenis/${id}`, { aktif: false }),
    onSuccess: () => { toast.success('Jenis pelanggaran dinonaktifkan'); qc.invalidateQueries(['jenis-pelanggaran']); setDeleteId(null); },
    onError: () => toast.error('Gagal menghapus'),
  });

  const KATEGORI_BADGE = {
    ringan: 'badge-green',
    sedang: 'badge-yellow',
    berat: 'badge-red',
  };

  const columns = [
    { header: 'No', cell: (_, i) => i + 1, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    {
      header: 'Kode',
      cell: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>
        {r.kode}
      </span>,
    },
    {
      header: 'Nama Pelanggaran',
      cell: (r) => <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>{r.nama}</span>,
    },
    {
      header: 'Poin',
      cell: (r) => (
        <span style={{ 
          fontWeight: 800, 
          fontSize: 15,
          color: r.poin >= 25 ? '#ef4444' : r.poin >= 15 ? '#f97316' : '#22c55e'
        }}>
          {r.poin}
        </span>
      ),
      cellClass: 'text-center', 
      headerClass: 'text-center',
    },
    {
      header: 'Kategori',
      cell: (r) => <span className={`badge ${KATEGORI_BADGE[r.kategori] || 'badge-gray'}`}>
        {r.kategori}
      </span>,
    },
    {
      header: 'Deskripsi',
      cell: (r) => <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
        {r.deskripsi || '—'}
      </span>,
    },
    {
      header: 'Aksi',
      cell: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
          <button 
            onClick={() => { setEditData(row); setShowForm(true); }}
            className="btn btn-ghost btn-sm btn-icon" 
            style={{ color: 'var(--color-primary)' }} 
            title="Edit"
          >
            <Edit style={{ width: 15, height: 15 }}/>
          </button>
          <button 
            onClick={() => { setDeleteId(row.id); setDeleteName(row.nama); }}
            className="btn btn-ghost btn-sm btn-icon" 
            style={{ color: '#ef4444' }} 
            title="Nonaktifkan"
          >
            <Trash2 style={{ width: 15, height: 15 }}/>
          </button>
        </div>
      ),
      headerClass: 'text-right', 
      cellClass: 'text-right',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Jenis Pelanggaran</h1>
          <p style={{ color:'var(--color-muted)', fontSize:13, marginTop:2 }}>
            {data?.data?.length ?? 0} jenis pelanggaran terdaftar
          </p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn btn-primary">
          <Plus style={{ width: 16, height: 16 }}/> Tambah Jenis Pelanggaran
        </button>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <DataTable columns={columns} data={data?.data} loading={isLoading} emptyMessage="Tidak ada data" />
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditData(null); }} title={editData ? 'Edit Jenis Pelanggaran' : 'Tambah Jenis Pelanggaran'} size="sm">
        <JenisForm
          initial={editData}
          onSuccess={() => { setShowForm(false); setEditData(null); qc.invalidateQueries(['jenis-pelanggaran']); }}
          onCancel={() => { setShowForm(false); setEditData(null); }}
        />
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Nonaktifkan Jenis Pelanggaran"
        size="sm"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0 16px' }}>
          <div style={{ padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.1)', flexShrink: 0 }}>
            <Trash2 style={{ width: 20, height: 20, color: '#ef4444' }}/>
          </div>
          <div>
            <p style={{ fontSize: 14, color: 'var(--color-foreground)', fontWeight: 600, margin: '0 0 6px' }}>
              Nonaktifkan "{deleteName}"?
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
              Jenis pelanggaran ini akan dinonaktifkan dan tidak dapat digunakan untuk pencatatan pelanggaran baru.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1 }}
            onClick={() => setDeleteId(null)}
          >
            Batal
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate(deleteId)}
          >
            {deleteMut.isPending ? 'Menonaktifkan...' : 'Ya, Nonaktifkan'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
