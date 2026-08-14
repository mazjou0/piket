import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * SiswaForm
 * Props:
 *  - initialData  : data siswa untuk mode edit, null untuk mode tambah
 *  - kelasList    : array kelas aktif
 *  - onSuccess    : callback setelah berhasil simpan
 *  - onCancel     : callback tombol batal
 *  - formId       : id form HTML (opsional, default 'siswa-form')
 *                   dipakai di SiswaPage untuk menghubungkan tombol submit di footer Modal
 */
export default function SiswaForm({ initialData, kelasList, onSuccess, onCancel, formId = 'siswa-form' }) {
  const isEdit = !!initialData;

  const { data: jurusanList } = useQuery({
    queryKey: ['jurusan-list'],
    queryFn: () => api.get('/jurusan', { params: { limit: 100 } }).then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData ? {
      ...initialData,
      tanggalLahir: initialData.tanggalLahir?.split('T')[0],
    } : {
      jenisKelamin: 'L',
      agama: 'Islam',
      angkatan: new Date().getFullYear(),
      status: 'AKTIF',
    },
  });

  // Setelah jurusanList selesai dimuat, reset form agar nilai jurusanId
  // terbaca ulang oleh <select> yang kini sudah punya option-nya
  useEffect(() => {
    if (isEdit && jurusanList?.length) {
      reset({
        ...initialData,
        tanggalLahir: initialData.tanggalLahir?.split('T')[0],
      }, { keepDirtyValues: true });
    }
  }, [jurusanList]);

  const mut = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/siswa/${initialData.id}`, data)
      : api.post('/siswa', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Data siswa diperbarui' : 'Siswa berhasil ditambahkan');
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  });

  const onSubmit = (data) => {
    if (!data.jurusanId) { toast.error('Pilih jurusan terlebih dahulu'); return; }
    mut.mutate(data);
  };

  const G = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
  const err = (msg) => <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{msg}</p>;

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* NIS + NISN */}
      <div style={G}>
        <div>
          <label className="label">NIS *</label>
          <input
            {...register('nis', { required: 'NIS wajib diisi' })}
            className={`input ${errors.nis ? 'input-error' : ''}`}
            placeholder="00000001"
            disabled={isEdit}
          />
          {errors.nis && err(errors.nis.message)}
        </div>
        <div>
          <label className="label">NISN</label>
          <input {...register('nisn')} className="input" placeholder="0000000000" />
        </div>
      </div>

      {/* Nama Lengkap */}
      <div>
        <label className="label">Nama Lengkap *</label>
        <input
          {...register('nama', { required: 'Nama wajib diisi' })}
          className={`input ${errors.nama ? 'input-error' : ''}`}
          placeholder="Nama lengkap siswa"
        />
        {errors.nama && err(errors.nama.message)}
      </div>

      {/* Jenis Kelamin + Agama */}
      <div style={G}>
        <div>
          <label className="label">Jenis Kelamin *</label>
          <select {...register('jenisKelamin')} className="input">
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div>
          <label className="label">Agama</label>
          <select {...register('agama')} className="input">
            {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Jurusan + Kelas */}
      <div style={G}>
        <div>
          <label className="label">Jurusan *</label>
          <select {...register('jurusanId', { required: true })} className={`input ${errors.jurusanId ? 'input-error' : ''}`}>
            <option value="">Pilih Jurusan</option>
            {jurusanList?.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
          </select>
          {errors.jurusanId && err('Jurusan wajib dipilih')}
        </div>
        <div>
          <label className="label">Kelas</label>
          <select {...register('kelasId')} className="input">
            <option value="">Pilih Kelas</option>
            {kelasList?.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
      </div>

      {/* Angkatan + Tanggal Lahir */}
      <div style={G}>
        <div>
          <label className="label">Angkatan</label>
          <input type="number" {...register('angkatan')} className="input" />
        </div>
        <div>
          <label className="label">Tanggal Lahir</label>
          <input type="date" {...register('tanggalLahir')} className="input" />
        </div>
      </div>

      {/* Tempat Lahir */}
      <div>
        <label className="label">Tempat Lahir</label>
        <input {...register('tempatLahir')} className="input" placeholder="Kota kelahiran" />
      </div>

      {/* Alamat */}
      <div>
        <label className="label">Alamat</label>
        <textarea {...register('alamat')} className="input" rows={2} placeholder="Alamat lengkap" style={{ resize: 'vertical' }} />
      </div>

      {/* Telepon Siswa + Nama Ortu */}
      <div style={G}>
        <div>
          <label className="label">No. Telepon Siswa</label>
          <input {...register('telepon')} className="input" placeholder="0812xxxx" />
        </div>
        <div>
          <label className="label">Nama Orang Tua</label>
          <input {...register('namaOrtu')} className="input" placeholder="Nama ayah/ibu" />
        </div>
      </div>

      {/* HP Ortu + Email Ortu */}
      <div style={G}>
        <div>
          <label className="label">No. HP Orang Tua</label>
          <input {...register('teleponOrtu')} className="input" placeholder="0812xxxx" />
        </div>
        <div>
          <label className="label">Email Orang Tua</label>
          <input type="email" {...register('emailOrtu')} className="input" placeholder="ortu@email.com" />
        </div>
      </div>

    </form>
  );
}
