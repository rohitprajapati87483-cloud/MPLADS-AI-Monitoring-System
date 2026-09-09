import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface RiskBadgeProps {
  level: RiskLevel | string;
  showDot?: boolean;
  className?: string;
}

const riskConfig: Record<string, { label: string; className: string; dot: string }> = {
  low:      { label: 'Low',      dot: 'bg-green-500',  className: 'bg-green-50 text-green-700 border border-green-200' },
  medium:   { label: 'Medium',   dot: 'bg-yellow-500', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  high:     { label: 'High',     dot: 'bg-orange-500', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  critical: { label: 'Critical', dot: 'bg-red-500',    className: 'bg-red-50 text-red-700 border border-red-200' },
};

export function RiskBadge({ level, showDot = true, className }: RiskBadgeProps) {
  const config = riskConfig[level] ?? {
    label: level,
    dot: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        config.className,
        className,
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
      )}
      {config.label}
    </span>
  );
}
