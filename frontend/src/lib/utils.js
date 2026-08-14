import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import { id } from 'date-fns/locale';

/* ── Tailwind class merger ── */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/* ── Date formatting ── */
export function formatDate(date, fmt = 'dd MMMM yyyy') {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(d) ? format(d, fmt, { locale: id }) : '—';
  } catch {
    return '—';
  }
}
export const formatDateTime  = (d) => formatDate(d, 'dd MMM yyyy HH:mm');
export const formatDateShort = (d) => formatDate(d, 'dd/MM/yyyy');
export const formatTime      = (d) => formatDate(d, 'HH:mm');

/* ── Number ── */
export const formatNumber = (n) =>
  new Intl.NumberFormat('id-ID').format(n ?? 0);

/* ── String ── */
export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export function truncate(str, max = 40) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/* ── Download ── */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Debounce ── */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Role labels ── */
export const ROLE_LABELS = {
  SUPER_ADMIN:    'Super Admin',
  ADMIN:          'Admin',
  PETUGAS_PIKET:  'Petugas Piket',
  BK:             'Bimbingan Konseling',
  WALI_KELAS:     'Wali Kelas',
  GURU:           'Guru',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
};

/* ── Status maps ── */
export const STATUS_ABSENSI = {
  HADIR:        { label: 'Hadir',        color: '#22c55e' },
  SAKIT:        { label: 'Sakit',        color: '#f59e0b' },
  IZIN:         { label: 'Izin',         color: '#3b82f6' },
  ALPHA:        { label: 'Alpha',        color: '#ef4444' },
  DISPENSASI:   { label: 'Dispensasi',   color: '#8b5cf6' },
  TERLAMBAT:    { label: 'Terlambat',    color: '#f97316' },
  PULANG_CEPAT: { label: 'Pulang Cepat', color: '#ec4899' },
  DINAS:        { label: 'Dinas',        color: '#06b6d4' },
  LAINNYA:      { label: 'Lainnya',      color: '#94a3b8' },
};

export const CHART_COLORS = {
  hadir:       '#22c55e',
  sakit:       '#f59e0b',
  izin:        '#3b82f6',
  alpha:       '#ef4444',
  dispensasi:  '#8b5cf6',
  terlambat:   '#f97316',
  pulangCepat: '#ec4899',
};
