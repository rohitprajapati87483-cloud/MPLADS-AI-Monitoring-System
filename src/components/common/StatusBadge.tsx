import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/types';

interface StatusBadgeProps {
  status: ProjectStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed:    { label: 'Completed',    className: 'bg-green-50 text-green-700 border border-green-200' },
  'in-progress':{ label: 'In Progress',  className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  delayed:      { label: 'Delayed',      className: 'bg-red-50 text-red-700 border border-red-200' },
  pending:      { label: 'Pending',      className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  sanctioned:   { label: 'Sanctioned',   className: 'bg-violet-50 text-violet-700 border border-violet-200' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
