import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { DataTable } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { formatDate } from '@/lib/utils';

export default function HariLiburPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role !== 'GURU';
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['hari-libur', tahun],
    queryFn: () => api.get('/hari-libur', { params: { tahun } }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => api.post('/hari-libur', d),
    onSuccess: () => { toast.success('Hari libur ditambahkan'); qc.invalidateQueries(['hari-libur']); setShowForm(false); reset(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/hari-libur/${id}`),
    onSuccess: () => { toast.success('Dihapus'); qc.invalidateQueries(['hari-libur']); setDeleteId(null); },
  });

  const columns = [
    { header: 'No', cell: (_, i) => i + 1, headerClass: 'w-12 text-center', cellClass: 'text-center' },
    { 
      header: 'Tanggal', 
      cell: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-foreground)' }}>
        {formatDate(r.tanggal, 'dd MMMM yyyy')}
      </span> 
    },
    { 
      header: 'Nama Hari Libur', 
      cell: (r) => <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>{r.nama}</span> 
    },
    { 
      header: 'Jenis', 
      cell: (r) => <span className={`badge ${r.jenis === 'nasional' ? 'badge-blue' : 'badge-yellow'}`}>
        {r.jenis}
      </span> 
    },
    { 
      header: 'Keterangan', 
      cell: (r) => <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
        {r.keterangan || '—'}
      </span> 
    },
    { 
      header: 'Aksi', 
      cell: (r) => (
        <button 
          onClick={() => setDeleteId(r.id)} 
          className="btn btn-ghost btn-sm btn-icon" 
          style={{ color: '#ef4444' }}
          title="Hapus"
        >
          <Trash2 style={{ width: 15, height: 15 }} />
        </button>
      ), 
      headerClass: 'text-right', 
      cellClass: 'text-right' 
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hari Libur</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 2 }}>
            {data?.data?.length ?? 0} hari libur terdaftar untuk tahun {tahun}
          </p>
        </div>
        {canEdit && <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus style={{ width: 16, height: 16 }} /> Tambah Hari Libur
        </button>}
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label className="label" style={{ margin: 0, fontSize: 12 }}>Filter Tahun:</label>
        <select 
          value={tahun} 
          onChange={e => setTahun(e.target.value)} 
          className="input" 
          style={{ width: 120 }}
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <DataTable 
          columns={columns} 
          data={data?.data} 
          loading={isLoading} 
          emptyMessage="Tidak ada data hari libur"
        />
      </div>

      <Modal 
        open={showForm} 
        onClose={() => { setShowForm(false); reset(); }} 
        title="Tambah Hari Libur" 
        size="sm"
      >
        <form 
          onSubmit={handleSubmit(d => createMut.mutate(d))} 
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label className="label">Tanggal *</label>
            <input 
              type="date" 
              {...register('tanggal', { required: 'Tanggal harus diisi' })} 
              className="input" 
            />
          </div>

          <div>
            <label className="label">Nama Hari Libur *</label>
            <input 
              {...register('nama', { required: 'Nama harus diisi' })} 
              className="input" 
              placeholder="e.g. Hari Kemerdekaan RI"
            />
          </div>

          <div>
            <label className="label">Jenis</label>
            <select {...register('jenis')} className="input">
              <option value="nasional">Nasional</option>
              <option value="sekolah">Sekolah</option>
            </select>
          </div>

          <div>
            <label className="label">Keterangan</label>
            <textarea 
              {...register('keterangan')} 
              className="input" 
              rows={2}
              placeholder="Keterangan tambahan (opsional)"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={() => { setShowForm(false); reset(); }}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => deleteMut.mutate(deleteId)} 
        loading={deleteMut.isPending} 
        title="Hapus Hari Libur" 
        message="Hari libur ini akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        variant="danger"
      />
    </div>
  );
}
