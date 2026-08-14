import { cn } from '@/lib/utils';
import { InboxIcon } from 'lucide-react';

export default function EmptyState({
  icon: Icon = InboxIcon,
  title = 'Tidak ada data',
  description,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-dark-700 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-dark-500" />
      </div>
      <p className="font-semibold text-dark-300">{title}</p>
      {description && <p className="text-sm text-dark-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
