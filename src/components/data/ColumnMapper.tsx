import { useState } from 'react';
import { Check, AlertTriangle, ChevronDown } from 'lucide-react';
import type { ColumnMapping } from '@/types/dataset';
import { CANONICAL_FIELDS } from '@/data/canonicalSchema';
import { cn } from '@/lib/utils';

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
}

function ConfidenceBadge({ confidence, action }: { confidence: number; action: ColumnMapping['action'] }) {
  if (action === 'unmapped' || action === 'ignore' || confidence === 0) {
    return <span className="text-xs text-slate-400 italic">--</span>;
  }
  const color =
    confidence >= 90 ? 'text-green-700 bg-green-50 border-green-200'
    : confidence >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200';
  return (
    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', color)}>
      {confidence}%
    </span>
  );
}

function ActionBadge({ action }: { action: ColumnMapping['action'] }) {
  if (action === 'accept') return (
    <span className="flex items-center gap-1 text-[10px] text-green-700 font-medium">
      <Check size={11} /> Accepted
    </span>
  );
  if (action === 'ignore') return (
    <span className="text-[10px] text-slate-400 italic">Ignored</span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
      <AlertTriangle size={11} /> Unmapped
    </span>
  );
}

export function ColumnMapper({ mappings, onMappingsChange }: ColumnMapperProps) {
  const [expanded, setExpanded] = useState(true);

  function updateMapping(idx: number, partial: Partial<ColumnMapping>) {
    const updated = mappings.map((m, i) =>
      i === idx ? { ...m, ...partial, isUserOverride: true } : m,
    );
    onMappingsChange(updated);
  }

  function handleFieldChange(idx: number, value: string) {
    if (value === '__ignore__') {
      updateMapping(idx, { canonicalField: null, action: 'ignore', confidence: mappings[idx].confidence });
    } else if (value === '__unmapped__') {
      updateMapping(idx, { canonicalField: null, action: 'unmapped' });
    } else {
      updateMapping(idx, { canonicalField: value, action: 'accept' });
    }
  }

  // Group canonical fields by group for the dropdown
  const groupedFields = CANONICAL_FIELDS.reduce(
    (acc, f) => {
      acc[f.group] = acc[f.group] ?? [];
      acc[f.group].push(f);
      return acc;
    },
    {} as Record<string, typeof CANONICAL_FIELDS>,
  );

  const accepted = mappings.filter((m) => m.action === 'accept').length;
  const unmapped = mappings.filter((m) => m.action === 'unmapped').length;
  const ignored = mappings.filter((m) => m.action === 'ignore').length;

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <Check size={12} /> {accepted} mapped
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <AlertTriangle size={12} /> {unmapped} unmapped
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          {ignored} ignored
        </div>
      </div>

      {/* Collapsible mapping table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
        >
          <span>Column Mappings ({mappings.length} columns)</span>
          <ChevronDown
            size={16}
            className={cn('text-slate-400 transition-transform', expanded ? 'rotate-180' : '')}
          />
        </button>

        {expanded && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  {['Original Column', 'Canonical Field', 'Confidence', 'Status', 'Actions'].map((h) => (
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
                {mappings.map((mapping, idx) => {
                  const field = CANONICAL_FIELDS.find((f) => f.key === mapping.canonicalField);
                  return (
                    <tr
                      key={mapping.originalColumn}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      {/* Original column */}
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-800 font-medium">
                        {mapping.originalColumn}
                        {mapping.isUserOverride && (
                          <span className="ml-1.5 text-[9px] text-primary-600 font-normal">edited</span>
                        )}
                      </td>

                      {/* Canonical field dropdown */}
                      <td className="px-3 py-2.5">
                        <div className="relative">
                          <select
                            value={
                              mapping.action === 'ignore'
                                ? '__ignore__'
                                : mapping.canonicalField ?? '__unmapped__'
                            }
                            onChange={(e) => handleFieldChange(idx, e.target.value)}
                            className="h-7 w-full max-w-[220px] appearance-none rounded-md border border-slate-200 bg-white pl-2 pr-7 text-xs text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          >
                            <option value="__unmapped__">— Unmapped —</option>
                            <option value="__ignore__">⊘ Ignore this column</option>
                            {Object.entries(groupedFields).map(([group, fields]) => (
                              <optgroup key={group} label={group}>
                                {fields.map((f) => (
                                  <option key={f.key} value={f.key}>
                                    {f.label}
                                    {f.status === 'required' ? ' *' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                        {field && (
                          <p className="mt-0.5 text-[10px] text-slate-400">{field.description}</p>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="px-3 py-2.5">
                        <ConfidenceBadge
                          confidence={mapping.confidence}
                          action={mapping.action}
                        />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <ActionBadge action={mapping.action} />
                      </td>

                      {/* Quick action buttons */}
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          {mapping.action !== 'accept' && mapping.canonicalField && (
                            <button
                              onClick={() => updateMapping(idx, { action: 'accept' })}
                              className="rounded px-2 py-1 text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                            >
                              Accept
                            </button>
                          )}
                          {mapping.action !== 'ignore' && (
                            <button
                              onClick={() => handleFieldChange(idx, '__ignore__')}
                              className="rounded px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              Ignore
                            </button>
                          )}
                          {mapping.action === 'ignore' && (
                            <button
                              onClick={() => updateMapping(idx, { action: 'unmapped' })}
                              className="rounded px-2 py-1 text-[10px] font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        * = Required field. Two columns cannot be mapped to the same field. Use the dropdown to change any mapping.
      </p>
    </div>
  );
}
