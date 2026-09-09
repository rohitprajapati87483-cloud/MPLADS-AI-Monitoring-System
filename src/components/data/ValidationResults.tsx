import { useState } from 'react';
import { AlertTriangle, XCircle, Info, ChevronDown } from 'lucide-react';
import type { ValidationIssue } from '@/types/dataset';
import { cn } from '@/lib/utils';

interface ValidationResultsProps {
  issues: ValidationIssue[];
}

function SeverityIcon({ severity }: { severity: ValidationIssue['severity'] }) {
  if (severity === 'error') return <XCircle size={14} className="text-red-500 shrink-0" />;
  if (severity === 'warning') return <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
  return <Info size={14} className="text-blue-400 shrink-0" />;
}

function SeverityBadge({ severity }: { severity: ValidationIssue['severity'] }) {
  const map = {
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase', map[severity])}>
      {severity}
    </span>
  );
}

export function ValidationResults({ issues }: ValidationResultsProps) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const filtered = filter === 'all' ? issues : issues.filter((i) => i.severity === filter);

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
          <span className="text-green-500 text-xl">✓</span>
        </div>
        <p className="text-sm font-medium text-slate-700">No validation issues found</p>
        <p className="text-xs text-slate-400 mt-1">The dataset passed all validation checks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: 'all', count: issues.length, color: 'border-slate-200 bg-white text-slate-700' },
          { label: 'Errors', value: 'error', count: errors.length, color: 'border-red-200 bg-red-50 text-red-700' },
          { label: 'Warnings', value: 'warning', count: warnings.length, color: 'border-amber-200 bg-amber-50 text-amber-700' },
          { label: 'Info', value: 'info', count: infos.length, color: 'border-blue-200 bg-blue-50 text-blue-700' },
        ].map(({ label, value, count, color }) => (
          <button
            key={value}
            onClick={() => setFilter(value as typeof filter)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-all',
              color,
              filter === value ? 'ring-1 ring-offset-1 ring-primary-400' : 'opacity-70 hover:opacity-100',
            )}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Issue list */}
      <div className="space-y-2">
        {filtered.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: ValidationIssue }) {
  const [open, setOpen] = useState(false);
  const bg =
    issue.severity === 'error'
      ? 'border-red-200 bg-red-50'
      : issue.severity === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : 'border-blue-100 bg-blue-50';

  return (
    <div className={cn('rounded-lg border p-3', bg)}>
      <div className="flex items-start gap-2">
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={issue.severity} />
            {issue.column && (
              <code className="text-[10px] bg-white/60 rounded px-1 py-0.5 text-slate-600">
                {issue.column}
              </code>
            )}
            <span className="text-[10px] text-slate-500 font-mono">{issue.rule}</span>
          </div>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed">{issue.message}</p>
          {issue.affectedRows > 0 && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              Affected rows: <strong>{issue.affectedRows.toLocaleString()}</strong>
            </p>
          )}
        </div>
        {issue.examples && issue.examples.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="Toggle examples"
          >
            <ChevronDown size={14} className={cn('transition-transform', open ? 'rotate-180' : '')} />
          </button>
        )}
      </div>

      {open && issue.examples && issue.examples.length > 0 && (
        <div className="mt-2 ml-5">
          <p className="text-[10px] text-slate-500 mb-1">Example values:</p>
          <div className="flex flex-wrap gap-1">
            {issue.examples.map((ex, i) => (
              <code key={i} className="text-[10px] bg-white/70 rounded px-1.5 py-0.5 text-slate-600">
                {ex}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
