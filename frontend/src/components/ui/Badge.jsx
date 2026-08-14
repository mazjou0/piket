import { cn } from '@/lib/utils';

export const STATUS_ABSENSI_STYLE = {
  HADIR:        { label: 'Hadir',        cls: 'badge-green'  },
  SAKIT:        { label: 'Sakit',        cls: 'badge-yellow' },
  IZIN:         { label: 'Izin',         cls: 'badge-blue'   },
  ALPHA:        { label: 'Alpha',        cls: 'badge-red'    },
  DISPENSASI:   { label: 'Dispensasi',   cls: 'badge-purple' },
  TERLAMBAT:    { label: 'Terlambat',    cls: 'badge-orange' },
  PULANG_CEPAT: { label: 'Pulang Cepat', cls: 'badge-pink'   },
  DINAS:        { label: 'Dinas',        cls: 'badge-cyan'   },
  LAINNYA:      { label: 'Lainnya',      cls: 'badge-gray'   },
};

export const STATUS_PERINGATAN_STYLE = {
  NORMAL:         { label: 'Normal',              cls: 'badge-gray'   },
  WARNING:        { label: 'Peringatan',           cls: 'badge-yellow' },
  SP1:            { label: 'SP1',                 cls: 'badge-orange' },
  SP2:            { label: 'SP2',                 cls: 'badge-red'    },
  PANGGILAN_ORTU: { label: 'Panggilan Ortu',      cls: 'badge-red'    },
  REKOMENDASI_BK: { label: 'Rekomendasi BK',      cls: 'badge-red'    },
};

export function AbsensiBadge({ status }) {
  const s = STATUS_ABSENSI_STYLE[status];
  if (!s) return <span className="badge badge-gray">{status}</span>;
  return <span className={cn('badge', s.cls)}>{s.label}</span>;
}

export function PeringatanBadge({ status }) {
  const s = STATUS_PERINGATAN_STYLE[status];
  if (!s) return null;
  return <span className={cn('badge', s.cls)}>{s.label}</span>;
}

export function RoleBadge({ role }) {
  const map = {
    SUPER_ADMIN:    'badge-purple',
    ADMIN:          'badge-blue',
    PETUGAS_PIKET:  'badge-cyan',
    BK:             'badge-pink',
    WALI_KELAS:     'badge-green',
    GURU:           'badge-yellow',
    KEPALA_SEKOLAH: 'badge-orange',
  };
  return (
    <span className={cn('badge', map[role] || 'badge-gray')}>
      {role?.replace(/_/g, ' ')}
    </span>
  );
}

export function StatusBadge({ active, labelOn = 'Aktif', labelOff = 'Non-aktif' }) {
  return active
    ? <span className="badge badge-green">{labelOn}</span>
    : <span className="badge badge-gray">{labelOff}</span>;
}
