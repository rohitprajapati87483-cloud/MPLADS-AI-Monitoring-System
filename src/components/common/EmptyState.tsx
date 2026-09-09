import { type LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title = 'No data available',
  description = 'Data will appear here once connected to a data source.',
  icon: Icon = Inbox,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-16',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400 leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
