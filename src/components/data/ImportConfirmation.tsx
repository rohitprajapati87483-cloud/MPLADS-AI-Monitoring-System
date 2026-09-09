import { CheckCircle2, AlertTriangle, XCircle, PackageCheck } from 'lucide-react';
import type { ParsedDataset } from '@/types/dataset';
import { CANONICAL_FIELDS } from '@/data/canonicalSchema';
import { cn } from '@/lib/utils';

interface ImportConfirmationProps {
  dataset: ParsedDataset;
  onImport: () => void;
  onBack: () => void;
  isImporting?: boolean;
}

export function ImportConfirmation({
  dataset,
  onImport,
  onBack,
  isImporting = false,
}: ImportConfirmationProps) {
  const errors = dataset.validationIssues.filter((i) => i.severity === 'error');
  const warnings = dataset.validationIssues.filter((i) => i.severity === 'warning');
  const mappedFields = dataset.columnMappings.filter((m) => m.action === 'accept').length;
  const totalFields = CANONICAL_FIELDS.length;
  const requiredMissing = CANONICAL_FIELDS.filter(
    (f) =>
      f.status === 'required' &&
      !dataset.columnMappings.some((m) => m.canonicalField === f.key && m.action === 'accept'),
  );
  const canImport = errors.length === 0 && requiredMissing.length === 0;

  return (
    <div className="space-y-5">
      {/* Dataset summary card */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Dataset Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Dataset', value: dataset.fileName },
            { label: 'Rows', value: dataset.totalRows.toLocaleString() },
            { label: 'Mapped Fields', value: `${mappedFields} / ${totalFields}` },
            { label: 'Quality Score', value: `${dataset.qualityScore.overall} / 100` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md bg-white border border-slate-200 p-2.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Validation status */}
      <div className="space-y-2">
        {errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">
                {errors.length} error{errors.length > 1 ? 's' : ''} must be resolved before import
              </p>
              <ul className="mt-1 space-y-0.5">
                {errors.slice(0, 3).map((e) => (
                  <li key={e.id} className="text-xs text-red-600">• {e.message}</li>
                ))}
                {errors.length > 3 && (
                  <li className="text-xs text-red-500">...and {errors.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {requiredMissing.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">
                Required fields not mapped: {requiredMissing.map((f) => f.label).join(', ')}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Go back to Map Columns to assign these fields.
              </p>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>{warnings.length} warning{warnings.length > 1 ? 's' : ''}</strong> found.
              You can import with warnings — they will be flagged in analysis.
            </p>
          </div>
        )}

        {canImport && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <CheckCircle2 size={15} className="text-green-500" />
            <p className="text-xs text-green-700 font-medium">
              Dataset is ready for import. All required fields are mapped and no critical errors found.
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isImporting}
          className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ← Back to Review
        </button>
        <button
          onClick={onImport}
          disabled={!canImport || isImporting}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors',
            canImport && !isImporting
              ? 'bg-primary-700 text-white hover:bg-primary-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
          )}
        >
          <PackageCheck size={16} />
          {isImporting ? 'Importing...' : 'Import Dataset'}
        </button>
      </div>

      {!canImport && (
        <p className="text-center text-xs text-slate-400">
          Resolve all errors and map required fields to enable import.
        </p>
      )}
    </div>
  );
}
