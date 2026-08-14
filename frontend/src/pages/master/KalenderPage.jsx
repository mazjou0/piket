import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { formatDate } from '@/lib/utils';

const JENIS_COLORS = { kegiatan: '#3b82f6', ujian: '#ef4444', libur: '#22c55e', lainnya: '#8b5cf6' };

export default function KalenderPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role !== 'GURU';
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['kalender', tahun, bulan],
    queryFn: () => api.get('/kalender', { params: { tahun, bulan } }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => api.post('/kalender', d),
    onSuccess: () => { toast.success('Kegiatan ditambahkan'); qc.invalidateQueries(['kalender']); setShowForm(false); reset(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/kalender/${id}`),
    onSuccess: () => { toast.success('Dihapus'); qc.invalidateQueries(['kalender']); setDeleteId(null); },
  });

  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Kalender Akademik</h1>
        {canEdit && <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus style={{ width: 16, height: 16 }} /> Tambah Kegiatan</button>}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="input w-36">
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="input w-24">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-dark-700 rounded-xl animate-pulse" />)}</div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-500">Tidak ada kegiatan di bulan ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.data?.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-dark-900/50 rounded-xl border border-dark-700">
                <div className="w-2 h-12 rounded-full shrink-0" style={{ background: JENIS_COLORS[item.jenis] || '#3b82f6' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark-100">{item.judul}</p>
                  <p className="text-xs text-dark-500 mt-0.5">
                    {formatDate(item.tanggalMulai, 'dd MMM')}
                    {item.tanggalSelesai && ` – ${formatDate(item.tanggalSelesai, 'dd MMM yyyy')}`}
                    {!item.tanggalSelesai && ` ${formatDate(item.tanggalMulai, 'yyyy')}`}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg bg-dark-700 text-dark-400">{item.jenis}</span>
                <button onClick={() => setDeleteId(item.id)} className="btn-ghost btn-sm p-1.5 text-danger-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tambah Kegiatan Kalender" size="sm"
        footer={<><button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button><button className="btn-primary" type="submit" form="kal-form" disabled={createMut.isPending}>{createMut.isPending ? 'Menyimpan...' : 'Simpan'}</button></>}
      >
        <form id="kal-form" onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div><label className="label">Judul *</label><input {...register('judul', { required: true })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Tanggal Mulai *</label><input type="date" {...register('tanggalMulai', { required: true })} className="input" /></div>
            <div><label className="label">Tanggal Selesai</label><input type="date" {...register('tanggalSelesai')} className="input" /></div>
          </div>
          <div><label className="label">Jenis</label><select {...register('jenis')} className="input"><option value="kegiatan">Kegiatan</option><option value="ujian">Ujian</option><option value="libur">Libur</option><option value="lainnya">Lainnya</option></select></div>
          <div><label className="label">Keterangan</label><textarea {...register('keterangan')} className="input" rows={2} /></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Hapus Kegiatan" message="Kegiatan akan dihapus dari kalender." />
    </div>
  );
}
