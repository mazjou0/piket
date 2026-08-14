import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { DataTable, Pagination } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { PeringatanBadge } from '@/components/ui/Badge';
import { Plus, Trash2, Eye, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';

/* ── Searchable Select Siswa ── */
function SiswaSearchSelect({ value, onChange, siswaList = [] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = siswaList.find(s => s.id === value);

  const filtered = query.length < 1 ? [] : siswaList.filter(s =>
    s.nama.toLowerCase().includes(query.toLowerCase()) ||
    s.nis.includes(query)
  ).slice(0, 30);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (s) => {
    onChange(s.id);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Input pencarian */}
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-muted)', pointerEvents: 'none' }} />
        <input
          className="input"
          style={{ paddingLeft: 32 }}
          placeholder={selected ? `${selected.nama} — ${selected.nis}` : 'Ketik nama atau NIS siswa...'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query) setOpen(true); }}
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={handleClear}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
          >×</button>
        )}
      </div>

      {/* Dropdown hasil pencarian */}
      {open && query.length >= 1 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-muted)' }}>
              {siswaList.length === 0 ? 'Memuat data siswa...' : `Tidak ada siswa "${query}"`}
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                  borderBottom: '1px solid var(--color-border)',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ fontSize: 13, color: 'var(--color-foreground)', fontWeight: 500 }}>{s.nama}</span>
                <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace', marginLeft: 8, flexShrink: 0 }}>{s.nis}</span>
              </button>
            ))
          )}
          {filtered.length === 30 && (
            <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--color-muted)', fontStyle: 'italic', borderTop: '1px solid var(--color-border)' }}>
              Menampilkan 30 hasil. Ketik lebih spesifik untuk mempersempit.
            </div>
          )}
        </div>
      )}

      {/* Tampilkan pilihan saat sudah dipilih dan tidak sedang mengetik */}
      {selected && !query && (
        <div style={{ marginTop: 4, padding: '4px 10px', borderRadius: 6, background: 'rgba(var(--color-primary-rgb), 0.1)', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>{selected.nama}</span>
          <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'monospace' }}>{selected.nis}</span>
        </div>
      )}
    </div>
  );
}

function PelanggaranForm({ onSuccess, onCancel }) {
  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-aktif'],
    queryFn: () => api.get('/siswa', { params: { limit: 2000, status: 'AKTIF' } }).then(r => r.data.data),
  });
  const { data: jenisList } = useQuery({
    queryKey: ['jenis-pelanggaran'],
    queryFn: () => api.get('/pelanggaran/jenis').then(r => r.data.data),
  });
  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas', { params: { limit: 100, aktif: true } }).then(r => r.data.data),
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: { tanggal: new Date().toISOString().split('T')[0] },
  });

  const mut = useMutation({
    mutationFn: (data) => api.post('/pelanggaran', data),
    onSuccess: () => { toast.success('Pelanggaran berhasil dicatat'); onSuccess(); },
  });

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label">Siswa *</label>
        <Controller
          name="siswaId"
          control={control}
          rules={{ required: 'Siswa wajib dipilih' }}
          render={({ field }) => (
            <SiswaSearchSelect
              value={field.value || ''}
              onChange={field.onChange}
              siswaList={siswaList}
            />
          )}
        />
        {errors.siswaId && <p style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.siswaId.message}</p>}
      </div>
      <div>
        <label className="label">Kelas</label>
        <select {...register('kelasId')} className="input">
          <option value="">Pilih Kelas...</option>
          {kelasList?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Jenis Pelanggaran *</label>
        <select {...register('jenisPelanggaranId', { required: true })} className="input">
          <option value="">Pilih Jenis...</option>
          {jenisList?.map(j => <option key={j.id} value={j.id}>{j.nama} ({j.poin} poin)</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tanggal *</label>
        <input type="date" {...register('tanggal', { required: true })} className="input" />
      </div>
      <div>
        <label className="label">Keterangan</label>
        <textarea {...register('keterangan')} className="input" rows={2} placeholder="Deskripsi pelanggaran..." />
      </div>
      <div>
        <label className="label">Tindakan</label>
        <input {...register('tindakan')} className="input" placeholder="Tindakan yang diambil..." />
      </div>

      {/* ── Acuan Poin ── */}
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        border: '1px solid rgba(234,179,8,0.25)',
        background: 'rgba(234,179,8,0.05)',
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#fde047', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle style={{ width: 13, height: 13 }} /> Acuan Tindakan Berdasarkan Akumulasi Poin
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { poin: '≤ 20',  color: '#4ade80', tindakan: 'Teguran lisan dan pembinaan oleh wali kelas' },
            { poin: '21–40', color: '#fde047', tindakan: 'Peringatan tertulis (SP-1) dan pemanggilan orang tua' },
            { poin: '41–60', color: '#fb923c', tindakan: 'SP-2, pembinaan oleh BK dan Wakasek Kesiswaan' },
            { poin: '61–80', color: '#f87171', tindakan: 'SP-3 dan kontrak pembinaan bersama orang tua' },
            { poin: '> 100', color: '#ef4444', tindakan: 'Sidang Dewan Guru untuk menentukan sanksi lebih lanjut' },
          ].map(row => (
            <div key={row.poin} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11 }}>
              <span style={{
                minWidth: 48, padding: '1px 6px', borderRadius: 4, textAlign: 'center',
                fontWeight: 700, fontSize: 10, flexShrink: 0,
                background: `${row.color}18`, color: row.color,
                border: `1px solid ${row.color}40`,
              }}>
                {row.poin}
              </span>
              <span style={{ color: 'var(--color-muted)', lineHeight: 1.5 }}>{row.tindakan}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : 'Catat Pelanggaran'}
        </button>
      </div>
    </form>
  );
}

export default function PelanggaranPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role !== 'GURU';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pelanggaran', page, search, tanggalMulai, tanggalSelesai],
    queryFn: () => api.get('/pelanggaran', { params: { page, limit: 20, search, tanggalMulai, tanggalSelesai } }).then(r => r.data),
    keepPreviousData: true,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/pelanggaran/${id}`),
    onSuccess: () => { toast.success('Pelanggaran dihapus'); qc.invalidateQueries(['pelanggaran']); setDeleteId(null); },
  });

  const columns = [
    {
      header: 'No',
      cell: (_, i) => <span className="text-dark-500">{(page - 1) * 20 + i + 1}</span>,
      headerClass: 'w-12 text-center', cellClass: 'text-center',
    },
    {
      header: 'Siswa',
      cell: (row) => (
        <div>
          <p className="font-medium text-dark-100">{row.siswa?.nama}</p>
          <p className="text-xs text-dark-500">{row.siswa?.nis} · {row.kelas?.nama}</p>
        </div>
      ),
    },
    {
      header: 'Jenis Pelanggaran',
      cell: (row) => (
        <div>
          <p className="text-dark-200">{row.jenisPelanggaran?.nama}</p>
          <span className={`text-xs ${row.jenisPelanggaran?.kategori === 'berat' ? 'text-danger-400' : row.jenisPelanggaran?.kategori === 'sedang' ? 'text-warning-400' : 'text-dark-500'}`}>
            {row.jenisPelanggaran?.kategori}
          </span>
        </div>
      ),
    },
    {
      header: 'Poin',
      cell: (row) => <span className="font-bold text-danger-400 text-lg">{row.poin}</span>,
      cellClass: 'text-center', headerClass: 'text-center',
    },
    {
      header: 'Tanggal',
      cell: (row) => formatDate(row.tanggal, 'dd MMM yyyy'),
    },
    {
      header: 'Keterangan',
      cell: (row) => <span className="text-dark-400 text-xs truncate max-w-[150px] block">{row.keterangan || '-'}</span>,
    },
    {
      header: 'Aksi',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setDetail(row)} className="btn-ghost btn-sm p-1.5"><Eye className="w-3.5 h-3.5" /></button>
          {canEdit && <button onClick={() => setDeleteId(row.id)} className="btn-ghost btn-sm p-1.5 text-danger-400"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      ),
      headerClass: 'text-right', cellClass: 'text-right',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Pelanggaran</h1>
          <p className="text-dark-500 text-sm mt-1">{data?.pagination?.total ?? 0} total pelanggaran tercatat</p>
        </div>
        {canEdit && <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus style={{ width: 16, height: 16 }} /> Catat Pelanggaran
        </button>}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Cari nama, NIS..." className="w-56" />
        <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className="input w-36" />
        <span className="self-center text-dark-500">s/d</span>
        <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className="input w-36" />
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data?.data} loading={isLoading} />
      </div>
      {data?.pagination && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages}
          total={data.pagination.total} limit={data.pagination.limit} onPageChange={setPage} />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Catat Pelanggaran Baru" size="md">
        <PelanggaranForm onSuccess={() => { setShowForm(false); qc.invalidateQueries(['pelanggaran']); }} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Pelanggaran" size="sm">
        {detail && (
          <div className="space-y-3 text-sm">
            <div><span className="label inline-block">Siswa</span><p className="text-dark-100">{detail.siswa?.nama}</p></div>
            <div><span className="label inline-block">Jenis</span><p className="text-dark-100">{detail.jenisPelanggaran?.nama}</p></div>
            <div><span className="label inline-block">Poin</span><p className="text-danger-400 font-bold text-xl">{detail.poin}</p></div>
            <div><span className="label inline-block">Tanggal</span><p className="text-dark-100">{formatDate(detail.tanggal)}</p></div>
            <div><span className="label inline-block">Keterangan</span><p className="text-dark-300">{detail.keterangan || '-'}</p></div>
            <div><span className="label inline-block">Tindakan</span><p className="text-dark-300">{detail.tindakan || '-'}</p></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Hapus Pelanggaran" message="Data pelanggaran akan dihapus permanen. Poin akumulasi akan diperbarui otomatis." />
    </div>
  );
}
