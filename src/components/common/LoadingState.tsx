import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
  className?: string;
}

export function LoadingState({
  message = 'Loading data...',
  compact = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-16',
        className,
      )}
    >
      <Loader2 size={24} className="animate-spin text-primary-600 mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
