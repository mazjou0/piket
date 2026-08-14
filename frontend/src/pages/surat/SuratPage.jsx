import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable, Pagination } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { Plus, Printer, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';

/* ── Komponen pencarian siswa dengan autocomplete ── */
function SiswaSearchInput({ value, onChange }) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(null);
  const wrapRef = useRef(null);

  // Cari siswa ke backend saat query berubah (min 2 karakter)
  const { data: results, isFetching } = useQuery({
    queryKey: ['siswa-search', query],
    queryFn: () => api.get('/siswa', { params: { search: query, limit: 10, status: 'AKTIF' } }).then(r => r.data.data),
    enabled: query.length >= 2,
    keepPreviousData: true,
  });

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pilih = (siswa) => {
    setSelected(siswa);
    setQuery('');
    setOpen(false);
    onChange(siswa.id);
  };

  const reset = () => {
    setSelected(null);
    setQuery('');
    onChange('');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {selected ? (
        // Tampilan setelah siswa dipilih
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-primary)',
          background: 'rgba(var(--color-primary-rgb),0.08)',
        }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)' }}>{selected.nama}</span>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', marginLeft: 8, fontFamily: 'monospace' }}>{selected.nis}</span>
          </div>
          <button type="button" onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 2, display: 'flex' }} title="Ganti siswa">
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ) : (
        // Input pencarian
        <input
          className="input"
          placeholder="Ketik nama atau NIS siswa..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          autoComplete="off"
        />
      )}

      {/* Dropdown hasil pencarian */}
      {open && query.length >= 2 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 4, borderRadius: 8, border: '1px solid var(--color-border)',
          background: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {isFetching && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-muted)' }}>Mencari...</div>
          )}
          {!isFetching && (!results || results.length === 0) && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-muted)' }}>Siswa tidak ditemukan</div>
          )}
          {results?.map(s => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => pilih(s)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-border)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)' }}>{s.nama}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
                  {s.nis} {s.kelasHistori?.[0]?.kelas?.nama ? `· ${s.kelasHistori[0].kelas.nama}` : ''}
                </div>
              </div>
              {s.jurusan && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(var(--color-primary-rgb),0.15)', color: 'var(--color-primary)', fontWeight: 600, flexShrink: 0 }}>
                  {s.jurusan.kode}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SuratForm({ onSuccess, onCancel }) {
  const [siswaId, setSiswaId] = useState('');
  const { register, handleSubmit } = useForm();
  const mut = useMutation({
    mutationFn: (d) => api.post('/surat', { ...d, siswaId }),
    onSuccess: () => { toast.success('Surat berhasil dibuat'); onSuccess(); },
  });

  const onSubmit = (d) => {
    if (!siswaId) { toast.error('Pilih siswa terlebih dahulu'); return; }
    mut.mutate(d);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className="label">Siswa *</label>
        <SiswaSearchInput value={siswaId} onChange={setSiswaId} />
      </div>
      <div>
        <label className="label">Jenis Surat *</label>
        <select {...register('jenis', { required: true })} className="input">
          <option value="SP1">Surat Peringatan 1 (SP1)</option>
          <option value="SP2">Surat Peringatan 2 (SP2)</option>
          <option value="SP3">Surat Peringatan 3 (SP3)</option>
          <option value="PANGGILAN_ORTU">Surat Panggilan Orang Tua</option>
        </select>
      </div>
      <div>
        <label className="label">Perihal *</label>
        <input {...register('perihal', { required: true })} className="input" />
      </div>
      <div>
        <label className="label">Isi Surat</label>
        <textarea {...register('isi')} className="input" rows={4} placeholder="Isi surat... (opsional, akan diisi otomatis jika kosong)" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={mut.isPending}>
          {mut.isPending ? 'Menyimpan...' : 'Buat Surat'}
        </button>
      </div>
    </form>
  );
}

export default function SuratPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [jenis, setJenis] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['surat', page, jenis],
    queryFn: () => api.get('/surat', { params: { page, limit: 20, ...(jenis && { jenis }) } }).then(r => r.data),
    keepPreviousData: true,
  });

  const terbitkanMut = useMutation({
    mutationFn: (id) => api.put(`/surat/${id}/terbitkan`),
    onSuccess: () => { toast.success('Surat diterbitkan'); qc.invalidateQueries(['surat']); },
  });

  const handleCetak = (id) => {
    window.open(`/api/surat/${id}/cetak`, '_blank');
  };

  const statusColor = { DRAFT: 'badge-gray', TERBIT: 'badge-blue', TERKIRIM: 'badge-green' };
  const jenisColor = { SP1: 'badge-yellow', SP2: 'badge-red', SP3: 'badge-red', PANGGILAN_ORTU: 'badge-red' };

  const columns = [
    { header: 'No', cell: (_, i) => (page - 1) * 20 + i + 1, headerClass: 'w-12', cellClass: 'text-center' },
    { header: 'Nomor', cell: (r) => <span className="font-mono text-xs text-dark-400">{r.nomor}</span> },
    { header: 'Siswa', cell: (r) => <div><p className="font-medium text-dark-100">{r.siswa?.nama}</p><p className="text-xs text-dark-500">{r.siswa?.nis}</p></div> },
    { header: 'Jenis', cell: (r) => <span className={jenisColor[r.jenis] || 'badge-gray'}>{r.jenis?.replace('_', ' ')}</span> },
    { header: 'Total Poin', cell: (r) => <span className="font-bold text-danger-400">{r.totalPoin}</span>, cellClass: 'text-center' },
    { header: 'Tanggal', cell: (r) => formatDate(r.tanggal, 'dd/MM/yyyy') },
    { header: 'Status', cell: (r) => <span className={statusColor[r.status]}>{r.status}</span> },
    {
      header: 'Aksi',
      cell: (r) => (
        <div className="flex gap-1 justify-end">
          {r.status === 'DRAFT' && <button onClick={() => terbitkanMut.mutate(r.id)} className="btn-ghost btn-sm p-1.5 text-success-400" title="Terbitkan"><CheckCircle className="w-3.5 h-3.5" /></button>}
          <button onClick={() => handleCetak(r.id)} className="btn-ghost btn-sm p-1.5 text-primary-400" title="Cetak"><Printer className="w-3.5 h-3.5" /></button>
        </div>
      ),
      headerClass: 'text-right', cellClass: 'text-right',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Surat Otomatis</h1>
          <p className="text-dark-500 text-sm mt-1">SP1, SP2, SP3, dan Panggilan Orang Tua</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus style={{ width: 15, height: 15 }} /> Buat Surat
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {['', 'SP1', 'SP2', 'SP3', 'PANGGILAN_ORTU'].map(j => (
          <button key={j} onClick={() => setJenis(j)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${jenis === j ? 'bg-primary-600 text-white' : 'text-dark-400 hover:bg-dark-700'}`}>
            {j || 'Semua'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden"><DataTable columns={columns} data={data?.data} loading={isLoading} /></div>
      {data?.pagination && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={data.pagination.limit} onPageChange={setPage} />}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Buat Surat Baru" size="md">
        <SuratForm onSuccess={() => { setShowForm(false); qc.invalidateQueries(['surat']); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
