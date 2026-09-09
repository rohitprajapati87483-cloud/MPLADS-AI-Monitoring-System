import { useState } from 'react';
import { Lightbulb, Check, ChevronDown } from 'lucide-react';
import type { CleaningSuggestion } from '@/types/dataset';
import { cn } from '@/lib/utils';

interface CleaningSuggestionsProps {
  suggestions: CleaningSuggestion[];
  onApply: (id: string) => void;
}

const TYPE_LABELS: Record<CleaningSuggestion['type'], string> = {
  trim: 'Whitespace Trim',
  normalize_case: 'Case Normalize',
  normalize_date: 'Date Format',
  to_numeric: 'Convert to Numeric',
  remove_duplicates: 'Remove Duplicates',
  normalize_percent: 'Normalize Percentage',
  other: 'Other',
};

export function CleaningSuggestions({ suggestions, onApply }: CleaningSuggestionsProps) {
  const [expanded, setExpanded] = useState(true);

  if (suggestions.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
        <Check size={15} className="text-green-500" />
        <p className="text-xs text-green-700">No cleaning actions needed — the dataset looks clean!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-500" />
          <span className="text-sm font-medium text-slate-700">
            Suggested Cleaning Actions ({suggestions.filter((s) => !s.applied).length} pending)
          </span>
        </div>
        <ChevronDown
          size={16}
          className={cn('text-slate-400 transition-transform', expanded ? 'rotate-180' : '')}
        />
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {suggestions.map((s) => (
            <div key={s.id} className={cn('px-4 py-3', s.applied ? 'opacity-50' : '')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5">
                      {TYPE_LABELS[s.type]}
                    </span>
                    {s.column && (
                      <code className="text-[10px] text-slate-500 bg-slate-100 rounded px-1 py-0.5">
                        {s.column}
                      </code>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {s.affectedRows.toLocaleString()} rows affected
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Detected:</span> {s.detected}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <span className="font-medium text-slate-700">Fix:</span> {s.suggestedFix}
                  </p>
                  {s.preview && (
                    <p className="mt-1 text-[10px] text-slate-400 italic bg-slate-50 rounded px-2 py-1">
                      {s.preview}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onApply(s.id)}
                  disabled={s.applied}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    s.applied
                      ? 'bg-green-50 text-green-600 cursor-not-allowed'
                      : 'bg-primary-700 text-white hover:bg-primary-800',
                  )}
                >
                  {s.applied ? '✓ Applied' : 'Apply'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
