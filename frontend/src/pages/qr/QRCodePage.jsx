import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { QrCode, Scan, Download, RefreshCw, Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { formatDate } from '@/lib/utils';

function QRDisplay({ qrDataUrl, siswa, expiresAt, token }) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${siswa?.nis || token}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-dark-900/50 rounded-2xl border border-dark-700">
      <div className="bg-white p-3 rounded-xl">
        <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
      </div>
      {siswa && (
        <div className="text-center">
          <p className="font-semibold text-dark-100">{siswa.nama}</p>
          <p className="text-xs text-dark-500">{siswa.nis}</p>
        </div>
      )}
      <p className="text-xs text-dark-500">Berlaku hingga: {formatDate(expiresAt, 'dd MMM yyyy HH:mm')}</p>
      <button onClick={handleDownload} className="btn btn-secondary" style={{ gap: 6 }}>
        <Download style={{ width: 14, height: 14 }} /> Download QR
      </button>
    </div>
  );
}

export default function QRCodePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('generate');
  const [generatedQR, setGeneratedQR] = useState(null);
  const [bulkQRList, setBulkQRList] = useState([]);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-list'],
    queryFn: () => api.get('/kelas', { params: { limit: 100, aktif: true } }).then(r => r.data.data),
  });

  const { data: siswaList } = useQuery({
    queryKey: ['siswa-aktif'],
    queryFn: () => api.get('/siswa', { params: { limit: 500, status: 'AKTIF' } }).then(r => r.data.data),
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/qr/events').then(r => r.data.data),
  });

  const { data: semester } = useQuery({
    queryKey: ['semester-aktif'],
    queryFn: () => api.get('/semester/aktif').then(r => r.data.data),
  });

  const { register: regSingle, handleSubmit: hsSingle, reset: resetSingle } = useForm({
    defaultValues: { expiresInHours: 24 },
  });

  const { register: regBulk, handleSubmit: hsBulk } = useForm({
    defaultValues: { expiresInHours: 24 },
  });

  const { register: regEvent, handleSubmit: hsEvent } = useForm();

  const genSingleMut = useMutation({
    mutationFn: (d) => api.post('/qr/generate', d),
    onSuccess: (res) => {
      setGeneratedQR(res.data.data);
      toast.success('QR Code berhasil dibuat');
    },
  });

  const genBulkMut = useMutation({
    mutationFn: (d) => api.post('/qr/generate-bulk', d),
    onSuccess: (res) => {
      setBulkQRList(res.data.data.qrList);
      toast.success(`${res.data.data.total} QR Code berhasil dibuat`);
    },
  });

  const createEventMut = useMutation({
    mutationFn: (d) => api.post('/qr/events', d),
    onSuccess: () => { toast.success('Event berhasil dibuat'); qc.invalidateQueries(['events']); },
  });

  const scanMut = useMutation({
    mutationFn: (d) => api.post('/qr/scan', d),
    onSuccess: (res) => {
      setScanResult(res.data.data);
      toast.success(res.data.message);
      setScanToken('');
    },
  });

  const handleScan = () => {
    if (!scanToken.trim()) { toast.error('Masukkan token QR'); return; }
    scanMut.mutate({ token: scanToken, semesterId: semester?.id });
  };

  const downloadAllQR = () => {
    bulkQRList.forEach((item) => {
      const a = document.createElement('a');
      a.href = item.qrDataUrl;
      a.download = `qr-${item.siswa.nis}.png`;
      a.click();
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Code Absensi</h1>
          <p className="text-dark-500 text-sm mt-1">Generate dan scan QR Code untuk absensi kegiatan</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-dark-800 border border-dark-700 rounded-xl w-fit">
        {[
          { key: 'generate', label: 'Generate QR', icon: QrCode },
          { key: 'bulk', label: 'Generate Massal', icon: RefreshCw },
          { key: 'scan', label: 'Scan QR', icon: Scan },
          { key: 'events', label: 'Event', icon: Plus },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Generate single */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title">Generate QR Siswa</h3>
            <form onSubmit={hsSingle(d => genSingleMut.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Siswa *</label>
                <select {...regSingle('siswaId', { required: true })} className="input">
                  <option value="">Pilih Siswa...</option>
                  {siswaList?.map(s => (
                    <option key={s.id} value={s.id}>{s.nama} — {s.nis}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Event (opsional)</label>
                <select {...regSingle('eventId')} className="input">
                  <option value="">Tanpa Event</option>
                  {events?.map(e => (
                    <option key={e.id} value={e.id}>{e.nama} — {formatDate(e.tanggal, 'dd/MM/yyyy')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Berlaku (jam)</label>
                <input type="number" {...regSingle('expiresInHours')} className="input" min="1" max="168" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: 6 }} disabled={genSingleMut.isPending}>
                <QrCode style={{ width: 16, height: 16 }} />
                {genSingleMut.isPending ? 'Generating...' : 'Generate QR'}
              </button>
            </form>
          </div>
          <div className="card flex items-center justify-center min-h-[300px]">
            {generatedQR ? (
              <QRDisplay
                qrDataUrl={generatedQR.qrDataUrl}
                siswa={generatedQR.siswa}
                expiresAt={generatedQR.expiresAt}
                token={generatedQR.token}
              />
            ) : (
              <div className="text-center">
                <QrCode className="w-16 h-16 text-dark-700 mx-auto mb-3" />
                <p className="text-dark-500">QR Code akan muncul di sini</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate bulk */}
      {activeTab === 'bulk' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="section-title">Generate QR Massal per Kelas</h3>
            <form onSubmit={hsBulk(d => genBulkMut.mutate(d))} className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="label">Kelas *</label>
                <select {...regBulk('kelasId', { required: true })} className="input w-44">
                  <option value="">Pilih Kelas...</option>
                  {kelasList?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Berlaku (jam)</label>
                <input type="number" {...regBulk('expiresInHours')} className="input w-24" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ gap: 6 }} disabled={genBulkMut.isPending}>
                <RefreshCw style={{ width: 15, height: 15 }} />
                {genBulkMut.isPending ? 'Generating...' : 'Generate Semua'}
              </button>
              {bulkQRList.length > 0 && (
                <button type="button" onClick={downloadAllQR} className="btn btn-secondary" style={{ gap: 6 }}>
                  <Download style={{ width: 15, height: 15 }} /> Download Semua ({bulkQRList.length})
                </button>
              )}
            </form>
          </div>

          {bulkQRList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {bulkQRList.map(item => (
                <QRDisplay
                  key={item.token}
                  qrDataUrl={item.qrDataUrl}
                  siswa={item.siswa}
                  expiresAt={new Date(Date.now() + 24 * 3600000)}
                  token={item.token}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scan QR */}
      {activeTab === 'scan' && (
        <div className="max-w-lg">
          <div className="card">
            <h3 className="section-title">Scan QR Code</h3>
            <p className="text-sm text-dark-400 mb-4">
              Masukkan token QR (dari scan barcode/manual) untuk mencatat kehadiran.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">Token QR *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanToken}
                    onChange={e => setScanToken(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                    className="input flex-1"
                    placeholder="Scan atau ketik token QR..."
                    autoFocus
                  />
                  <button onClick={handleScan} disabled={scanMut.isPending} className="btn btn-primary" style={{ gap: 6 }}>
                    <Scan style={{ width: 15, height: 15 }} />
                    {scanMut.isPending ? '...' : 'Scan'}
                  </button>
                </div>
              </div>

              {scanResult && (
                <div className="p-4 bg-success-600/10 border border-success-600/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success-600/20 flex items-center justify-center">
                      <span className="text-success-400 text-lg">✓</span>
                    </div>
                    <div>
                      <p className="font-semibold text-success-400">Kehadiran Tercatat</p>
                      <p className="text-sm text-dark-300">{scanResult.siswa?.nama} — {scanResult.siswa?.nis}</p>
                      <p className="text-xs text-dark-500">{new Date(scanResult.waktu).toLocaleTimeString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Events */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title">Buat Event Sekolah</h3>
            <form onSubmit={hsEvent(d => createEventMut.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Nama Event *</label>
                <input {...regEvent('nama', { required: true })} className="input" placeholder="Upacara Kemerdekaan" />
              </div>
              <div>
                <label className="label">Tanggal *</label>
                <input type="date" {...regEvent('tanggal', { required: true })} className="input" />
              </div>
              <div>
                <label className="label">Lokasi</label>
                <input {...regEvent('lokasi')} className="input" placeholder="Lapangan Utama" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea {...regEvent('deskripsi')} className="input" rows={2} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: 6 }} disabled={createEventMut.isPending}>
                {createEventMut.isPending ? 'Menyimpan...' : 'Buat Event'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="section-title">Daftar Event</h3>
            <div className="space-y-2">
              {events?.length === 0 ? (
                <p className="text-dark-500 text-sm text-center py-8">Belum ada event</p>
              ) : (
                events?.map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-xl border border-dark-700">
                    <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark-100 truncate">{event.nama}</p>
                      <p className="text-xs text-dark-500">{formatDate(event.tanggal)} · {event.lokasi || '-'}</p>
                    </div>
                    <span className={`badge ${event.aktif ? 'badge-green' : 'badge-gray'}`}>
                      {event.aktif ? 'Aktif' : 'Selesai'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
