import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { ColumnMapping } from '@/types/dataset';
import { CANONICAL_FIELDS, CANONICAL_GROUPS } from '@/data/canonicalSchema';
import { cn } from '@/lib/utils';

interface SchemaValidationPanelProps {
  mappings: ColumnMapping[];
}

export function SchemaValidationPanel({ mappings }: SchemaValidationPanelProps) {
  const acceptedKeys = new Set(
    mappings.filter((m) => m.action === 'accept' && m.canonicalField).map((m) => m.canonicalField!),
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 leading-relaxed">
        Some analytics require specific fields. Missing fields will disable only the dependent
        analysis rather than breaking the application.
      </p>

      {CANONICAL_GROUPS.map((group) => {
        const fields = CANONICAL_FIELDS.filter((f) => f.group === group);
        if (fields.length === 0) return null;

        return (
          <div key={group}>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              {group}
            </h4>
            <div className="space-y-1">
              {fields.map((field) => {
                const isMapped = acceptedKeys.has(field.key);
                const statusIcon =
                  isMapped ? (
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  ) : field.status === 'required' ? (
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-slate-300 shrink-0" />
                  );

                const labelColor = isMapped
                  ? 'text-slate-700'
                  : field.status === 'required'
                  ? 'text-red-600'
                  : 'text-slate-400';

                return (
                  <div key={field.key} className="flex items-center gap-2">
                    {statusIcon}
                    <span className={cn('text-xs', labelColor)}>{field.label}</span>
                    <span
                      className={cn(
                        'ml-auto rounded px-1 py-0.5 text-[9px] font-semibold uppercase',
                        field.status === 'required'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : field.status === 'recommended'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-200',
                      )}
                    >
                      {field.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
