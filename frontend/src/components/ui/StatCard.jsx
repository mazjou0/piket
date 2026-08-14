import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

const VARIANT_MAP = {
  green:  { bg: 'bg-[#22c55e]/10', icon: 'text-[#22c55e]', border: 'border-[#22c55e]/20' },
  red:    { bg: 'bg-[#ef4444]/10', icon: 'text-[#ef4444]', border: 'border-[#ef4444]/20' },
  yellow: { bg: 'bg-[#f59e0b]/10', icon: 'text-[#f59e0b]', border: 'border-[#f59e0b]/20' },
  orange: { bg: 'bg-[#f97316]/10', icon: 'text-[#f97316]', border: 'border-[#f97316]/20' },
  purple: { bg: 'bg-[#8b5cf6]/10', icon: 'text-[#8b5cf6]', border: 'border-[#8b5cf6]/20' },
  pink:   { bg: 'bg-[#ec4899]/10', icon: 'text-[#ec4899]', border: 'border-[#ec4899]/20' },
  cyan:   { bg: 'bg-[#06b6d4]/10', icon: 'text-[#06b6d4]', border: 'border-[#06b6d4]/20' },
  blue:   { bg: 'bg-primary/10',   icon: 'text-primary',   border: 'border-primary/20'   },
};

export default function StatCard({
  title, value, icon: Icon, color = 'blue',
  trend, subtitle, loading, suffix,
}) {
  const c = VARIANT_MAP[color] || VARIANT_MAP.blue;

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-surface-hover" />
          <div className="h-3 w-24 bg-surface-hover rounded" />
        </div>
        <div className="h-8 w-14 bg-surface-hover rounded" />
      </div>
    );
  }

  return (
    <div className={cn('card stat-card border hover:shadow-md transition-all duration-200', c.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {value ?? 0}
            {suffix && <span className="text-sm font-normal text-muted ml-1">{suffix}</span>}
          </p>
          {subtitle && (
            <p className="text-xs text-muted mt-1 truncate">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 mt-1.5 text-xs font-medium',
              trend >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
            )}>
              {trend >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {Math.abs(trend)}% dari kemarin
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl shrink-0', c.bg)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
      </div>
    </div>
  );
}
