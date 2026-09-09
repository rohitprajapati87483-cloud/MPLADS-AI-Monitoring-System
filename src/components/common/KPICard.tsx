import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconClassName?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            iconClassName ?? 'bg-primary-50 text-primary-700',
          )}
        >
          <Icon size={20} />
        </div>
      </div>

    </div>
  );
}
