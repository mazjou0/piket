import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DataTable, Pagination } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

const STATUS_OPTS = [
  { value: '',              label: 'Semua Status' },
  { value: 'HADIR',        label: 'Hadir'        },
  { value: 'SAKIT',        label: 'Sakit'        },
  { value: 'IZIN',         label: 'Izin'         },
  { value: 'ALPHA',        label: 'Alpha'        },
  { value: 'DISPENSASI',   label: 'Dispensasi'   },
  { value: 'TERLAMBAT',    label: 'Terlambat'    },
  { value: 'PULANG_CEPAT', label: 'Pulang Cepat' },
  { value: 'DINAS',        label: 'Dinas/PKL'    },
  { value: 'LAINNYA',      label: 'Lainnya'      },
];

export default function AbsensiRiwayatPage() {
  const [page,          setPage]          = useState(1);
  const [kelasId,       setKelasId]       = useState('');
  const [status,        setStatus]        = useState('');
  const today        = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [tanggalMulai,   setTanggalMulai]   = useState(firstOfMonth);
  const [tanggalSelesai, setTanggalSelesai] = useState(today);

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['absensi-riwayat', page, kelasId, status, tanggalMulai, tanggalSelesai],
    queryFn: () => api.get('/laporan/rekap-absensi', {
      params: { page, limit: 30, kelasId, status, tanggalMulai, tanggalSelesai },
    }).then(r => ({ data: r.data.data })),
    enabled: !!tanggalMulai && !!tanggalSelesai,
    keepPreviousData: true,
  });

  const rows = data?.data || [];

  const columns = [
    { header: 'No',    cell: (_, i) => (page-1)*30+i+1, headerClass: 'w-10 text-center', cellClass: 'text-center' },
    { header: 'NIS',   cell: r => <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--color-muted)' }}>{r.siswa?.nis}</span> },
    { header: 'Nama',  cell: r => <span style={{ fontWeight:600 }}>{r.siswa?.nama}</span> },
    { header: 'Kelas', cell: r => <span style={{ fontSize:12 }}>{r.siswa?.kelasHistori?.[0]?.kelas?.nama || '—'}</span> },
    // Kolom status lengkap
    { header: 'H',  cell: r => <span style={{ color:'#4ade80', fontWeight:700 }}>{r.hadir||0}</span>,         cellClass:'text-center', headerClass:'text-center' },
    { header: 'S',  cell: r => <span style={{ color:'#fde047' }}>{r.sakit||0}</span>,                        cellClass:'text-center', headerClass:'text-center' },
    { header: 'I',  cell: r => <span style={{ color:'#93c5fd' }}>{r.izin||0}</span>,                         cellClass:'text-center', headerClass:'text-center' },
    { header: 'A',  cell: r => <span style={{ color:'#f87171', fontWeight:r.alpha>0?700:400 }}>{r.alpha||0}</span>, cellClass:'text-center', headerClass:'text-center' },
    { header: 'D',  cell: r => <span style={{ color:'#5eead4' }}>{r.dispensasi||0}</span>,                   cellClass:'text-center', headerClass:'text-center' },
    { header: 'T',  cell: r => <span style={{ color:'#fb923c' }}>{r.terlambat||0}</span>,                    cellClass:'text-center', headerClass:'text-center' },
    { header: 'PC', cell: r => <span style={{ color:'#f9a8d4' }}>{r.pulangCepat||0}</span>,                  cellClass:'text-center', headerClass:'text-center' },
    { header: 'DN', cell: r => <span style={{ color:'#a78bfa' }}>{r.dinas||0}</span>,                        cellClass:'text-center', headerClass:'text-center' },
    { header: 'L',  cell: r => <span style={{ color:'var(--color-muted)' }}>{r.lainnya||0}</span>,           cellClass:'text-center', headerClass:'text-center' },
    { header: 'Total', cell: r => <span style={{ fontWeight:700 }}>{r.total||0}</span>,                      cellClass:'text-center', headerClass:'text-center' },
    {
      header: '%',
      cell: r => {
        const p = r.total > 0 ? Math.round(((r.hadir||0) / r.total) * 100) : 0;
        return <span style={{ fontWeight:700, color: p < 75 ? '#ef4444' : '#4ade80' }}>{p}%</span>;
      },
      cellClass:'text-center', headerClass:'text-center',
    },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Riwayat Absensi</h1>
      </div>

      {/* Filter */}
      <div className="card">
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
          <div>
            <label className="label">Dari</label>
            <input type="date" value={tanggalMulai} onChange={e => { setTanggalMulai(e.target.value); setPage(1); }} className="input" style={{ width:150 }} />
          </div>
          <span style={{ color:'var(--color-muted)', paddingBottom:6 }}>s/d</span>
          <div>
            <label className="label">Sampai</label>
            <input type="date" value={tanggalSelesai} onChange={e => { setTanggalSelesai(e.target.value); setPage(1); }} className="input" style={{ width:150 }} />
          </div>
          <div>
            <label className="label">Kelas</label>
            <select value={kelasId} onChange={e => { setKelasId(e.target.value); setPage(1); }} className="input" style={{ width:160 }}>
              <option value="">Semua Kelas</option>
              {kelasList?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input" style={{ width:150 }}>
              {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Keterangan */}
      <p style={{ fontSize:11, color:'var(--color-muted)', margin:0 }}>
        H=Hadir · S=Sakit · I=Izin · A=Alpha · D=Dispensasi · T=Terlambat · PC=Pulang Cepat · DN=Dinas/PKL · L=Lainnya
      </p>

      {/* Tabel */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="Tidak ada data untuk periode ini" />
        </div>
      </div>

      {data?.pagination && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
