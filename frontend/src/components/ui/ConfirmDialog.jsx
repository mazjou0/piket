import Modal from './Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message,
  loading,
  variant = 'danger',
  confirmLabel,
  cancelLabel = 'Batal',
}) {
  const isDanger   = variant === 'danger';
  const btnClass   = isDanger ? 'btn btn-danger' : 'btn btn-primary';
  const defaultLabel = isDanger ? 'Ya, Hapus' : 'Ya, Lanjutkan';

  return (
    <Modal open={open} onClose={onClose} title={title} size="xs"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={btnClass}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Memproses...' : (confirmLabel || defaultLabel)}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3 py-2">
        <div className={`p-2.5 rounded-xl shrink-0 ${isDanger ? 'bg-red-500/10' : 'bg-primary/10'}`}>
          {isDanger
            ? <Trash2 className="w-5 h-5 text-red-500" />
            : <AlertTriangle className="w-5 h-5 text-primary" />
          }
        </div>
        <p className="text-sm text-muted leading-relaxed pt-0.5">
          {message || 'Apakah Anda yakin ingin melanjutkan tindakan ini?'}
        </p>
      </div>
    </Modal>
  );
}
