import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ParsedDataset, ColumnProfile } from '@/types/dataset';
import { cn } from '@/lib/utils';

function StatusIcon({ status }: { status: ColumnProfile['validationStatus'] }) {
  if (status === 'valid') return <CheckCircle2 size={14} className="text-green-500" />;
  if (status === 'warning') return <AlertTriangle size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

function TypeBadge({ type }: { type: ColumnProfile['detectedType'] }) {
  const map: Record<string, string> = {
    text: 'bg-blue-50 text-blue-700 border-blue-200',
    numeric: 'bg-green-50 text-green-700 border-green-200',
    date: 'bg-purple-50 text-purple-700 border-purple-200',
    boolean: 'bg-amber-50 text-amber-700 border-amber-200',
    mixed: 'bg-orange-50 text-orange-700 border-orange-200',
    empty: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize', map[type] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
      {type}
    </span>
  );
}

function MissingBar({ percent }: { percent: number }) {
  const color =
    percent === 0 ? 'bg-green-500' : percent < 10 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="text-xs text-slate-600">{percent}%</span>
    </div>
  );
}

interface ColumnProfilerProps {
  dataset: ParsedDataset;
}

export function ColumnProfiler({ dataset }: ColumnProfilerProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {['Column', 'Type', 'Values', 'Missing', 'Unique', 'Examples', 'Status'].map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataset.columnProfiles.map((profile, i) => (
            <tr
              key={profile.name}
              className={cn(
                'border-b border-slate-100 transition-colors hover:bg-slate-50',
                i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white',
              )}
            >
              <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[160px] truncate" title={profile.name}>
                {profile.name}
              </td>
              <td className="px-3 py-2.5">
                <TypeBadge type={profile.detectedType} />
              </td>
              <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">
                {profile.totalValues.toLocaleString()}
              </td>
              <td className="px-3 py-2.5">
                <MissingBar percent={profile.missingPercent} />
              </td>
              <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">
                {profile.uniqueCount.toLocaleString()}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {profile.examples.slice(0, 2).map((ex, j) => (
                    <span
                      key={j}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 max-w-[100px] truncate"
                      title={ex}
                    >
                      {ex || '""'}
                    </span>
                  ))}
                  {profile.examples.length === 0 && (
                    <span className="text-[10px] italic text-slate-300">none</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={profile.validationStatus} />
                  {profile.validationMessage && (
                    <span className="text-[10px] text-slate-500 max-w-[120px]" title={profile.validationMessage}>
                      {profile.validationMessage.length > 30
                        ? profile.validationMessage.slice(0, 28) + '…'
                        : profile.validationMessage}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
