import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export default function Select({ value, onChange, options = [], placeholder, className, disabled }) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input appearance-none pr-8"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
    </div>
  );
}
