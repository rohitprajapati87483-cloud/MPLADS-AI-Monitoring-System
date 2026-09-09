import { useState, useCallback } from 'react';
import { Database, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { WorkflowStepper } from '@/components/data/WorkflowStepper';
import { UploadZone } from '@/components/data/UploadZone';
import { DatasetOverview } from '@/components/data/DatasetOverview';
import { DataPreview } from '@/components/data/DataPreview';
import { ColumnProfiler } from '@/components/data/ColumnProfiler';
import { ColumnMapper } from '@/components/data/ColumnMapper';
import { SchemaValidationPanel } from '@/components/data/SchemaValidationPanel';
import { DataQuality } from '@/components/data/DataQuality';
import { ValidationResults } from '@/components/data/ValidationResults';
import { CleaningSuggestions } from '@/components/data/CleaningSuggestions';
import { DatasetHistory } from '@/components/data/DatasetHistory';
import { ImportConfirmation } from '@/components/data/ImportConfirmation';

import {
  processDataset,
  getDatasetHistory,
  saveDatasetToHistory,
  deleteDatasetFromHistory,
  markDatasetImported,
} from '@/services/datasetService';
import type { ParsedDataset, WorkflowStep, ColumnMapping, DatasetHistoryItem } from '@/types/dataset';
import { cn } from '@/lib/utils';
import { setCurrentDataset, clearPersistedDataset, persistDataset, loadPersistedDataset, deletePersistedDataset } from '@/services/datasetStore';
import { analyzeDataset } from '@/services/riskEngine';
import { ensureFraudReports } from '@/services/fraudReportService';

// ── Section card wrapper ──────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-card)]', className)}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function DataManagement() {
  const [step, setStep] = useState<WorkflowStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [history, setHistory] = useState<DatasetHistoryItem[]>(() => getDatasetHistory());

  // ── File selected ────────────────────────────────────────────────────────
  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    setParseError(null);
    setDataset(null);
    void clearPersistedDataset();
    setMappings([]);
    setImported(false);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setDataset(null);
    void clearPersistedDataset();
    setMappings([]);
    setParseError(null);
    setStep(1);
    setImported(false);
  }, []);

  // ── Process (Upload → Profile) ────────────────────────────────────────────
  const handleProcess = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setParseError(null);
    try {
      const ds = await processDataset(file);
      setDataset(ds);
      setCurrentDataset(ds);
      setMappings(ds.columnMappings);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setParseError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [file]);

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!dataset) return;
    setIsImporting(true);
    // Simulate brief import (replace with real API call)
    await new Promise((r) => setTimeout(r, 1200));
    const finalDataset = { ...dataset, columnMappings: mappings };
    setDataset(finalDataset);
    await persistDataset(finalDataset);
    setCurrentDataset(finalDataset);
    saveDatasetToHistory(finalDataset);
    ensureFraudReports(finalDataset, analyzeDataset(finalDataset));
    markDatasetImported(finalDataset.id);
    setHistory(getDatasetHistory());
    setImported(true);
    setIsImporting(false);
  }, [dataset, mappings]);

  // ── Cleaning apply (preview only — marks as applied in state) ────────────
  const handleApplyCleaning = useCallback((id: string) => {
    if (!dataset) return;
    const updated = {
      ...dataset,
      cleaningSuggestions: dataset.cleaningSuggestions.map((s) =>
        s.id === id ? { ...s, applied: true } : s,
      ),
    };
    setDataset(updated);
  }, [dataset]);

  // ── History delete ────────────────────────────────────────────────────────
  const handleDeleteHistory = useCallback((id: string) => {
    deleteDatasetFromHistory(id);
    void deletePersistedDataset(id);
    setHistory(getDatasetHistory());
  }, []);

  const handleViewHistory = useCallback(async (id: string) => {
    const saved = await loadPersistedDataset(id);
    if (!saved) {
      setParseError('The saved dataset record could not be loaded. It may have been cleared by the browser.');
      return;
    }
    setDataset(saved);
    setCurrentDataset(saved);
    setMappings(saved.columnMappings);
    setImported(true);
    setParseError(null);
    setStep(2);
    ensureFraudReports(saved, analyzeDataset(saved));
  }, []);

  // ── Step validation ───────────────────────────────────────────────────────
  const canProceedToStep = (target: WorkflowStep): boolean => {
    if (target <= step) return true;
    if (target === 2) return !!dataset;
    if (target === 3) return !!dataset;
    if (target === 4) return !!dataset;
    if (target === 5) return !!dataset;
    if (target === 6) return !!dataset;
    return false;
  };

  const navigate = (target: WorkflowStep) => {
    if (canProceedToStep(target)) setStep(target);
  };

  // ── Updated dataset with current mappings ────────────────────────────────
  const datasetWithMappings = dataset
    ? { ...dataset, columnMappings: mappings }
    : null;

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5">
      {/* Header */}
      <PageHeader
        title="Data Management"
        description="Upload, inspect, validate and prepare MPLADS datasets for analysis."
        action={
          dataset && !imported ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={13} /> Start Over
            </button>
          ) : undefined
        }
      />

      {/* Workflow stepper */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-2 mb-4">
          {([1, 2, 3, 4, 5, 6] as WorkflowStep[]).map((s) => (
            <button
              key={s}
              onClick={() => navigate(s)}
              disabled={!canProceedToStep(s)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                step === s
                  ? 'bg-primary-700 text-white'
                  : canProceedToStep(s)
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-300 cursor-not-allowed',
              )}
            >
              {['Upload', 'Profile', 'Map Columns', 'Validate', 'Review', 'Import'][s - 1]}
            </button>
          ))}
        </div>
        <WorkflowStepper currentStep={step} />
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <Section
          title="Upload Dataset"
          subtitle="Upload your MPLADS dataset file. Supported: CSV, XLSX, XLS, JSON (max 50 MB)."
        >
          <UploadZone
            onFileSelected={handleFileSelected}
            isProcessing={isProcessing}
            selectedFile={file}
            onClear={handleClear}
            error={parseError}
          />
          {file && !isProcessing && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleProcess}
                className="flex items-center gap-2 rounded-md bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
              >
                Process Dataset →
              </button>
            </div>
          )}
          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-primary-600" />
              Parsing and profiling your dataset…
            </div>
          )}
        </Section>
      )}

      {/* ── STEP 2: Profile ── */}
      {step === 2 && dataset && (
        <div className="space-y-4">
          <Section title="Dataset Overview" subtitle="Key statistics about your uploaded dataset.">
            <DatasetOverview dataset={dataset} />
          </Section>

          <Section
            title="Dataset Preview"
            subtitle={`First ${Math.min(20, dataset.totalRows)} rows. Use search to filter. Null values shown in grey.`}
          >
            <DataPreview dataset={dataset} />
          </Section>

          <Section
            title="Column Analysis"
            subtitle="Per-column type detection, missing value analysis, and validation status."
          >
            <ColumnProfiler dataset={dataset} />
          </Section>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded-md bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-800"
            >
              Map Columns →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Map Columns ── */}
      {step === 3 && dataset && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Section
                title="Map Dataset Columns"
                subtitle="Review and confirm the automatic mapping. Use dropdowns to change any mapping."
              >
                <ColumnMapper
                  mappings={mappings}
                  onMappingsChange={setMappings}
                />
              </Section>
            </div>
            <div>
              <Section
                title="Schema Coverage"
                subtitle="MPLADS canonical field requirements."
              >
                <SchemaValidationPanel mappings={mappings} />
              </Section>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep(2)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              ← Back
            </button>
            <button onClick={() => setStep(4)} className="rounded-md bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-800">
              Validate →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Validate ── */}
      {step === 4 && datasetWithMappings && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Section
                title="Validation Results"
                subtitle="Data quality rules applied to your dataset."
              >
                <ValidationResults issues={datasetWithMappings.validationIssues} />
              </Section>
            </div>
            <div>
              <Section title="Data Quality Score" subtitle="Computed from actual dataset metrics.">
                <DataQuality score={datasetWithMappings.qualityScore} />
              </Section>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep(3)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              ← Back
            </button>
            <button onClick={() => setStep(5)} className="rounded-md bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-800">
              Review →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Review ── */}
      {step === 5 && datasetWithMappings && (
        <div className="space-y-4">
          <Section
            title="Suggested Cleaning Actions"
            subtitle="Review and optionally apply these cleaning suggestions before import."
          >
            <CleaningSuggestions
              suggestions={datasetWithMappings.cleaningSuggestions}
              onApply={handleApplyCleaning}
            />
          </Section>

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep(4)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              ← Back
            </button>
            <button onClick={() => setStep(6)} className="rounded-md bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-800">
              Confirm Import →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: Import ── */}
      {step === 6 && datasetWithMappings && (
        <Section title="Ready for Analysis" subtitle="Final review before importing your dataset.">
          {imported ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-500 mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Dataset Imported Successfully</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                <strong>{datasetWithMappings.fileName}</strong> is now ready for analysis.
              </p>
              <button
                onClick={handleClear}
                className="rounded-md bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-800"
              >
                Upload Another Dataset
              </button>
            </div>
          ) : (
            <ImportConfirmation
              dataset={datasetWithMappings}
              onImport={handleImport}
              onBack={() => setStep(5)}
              isImporting={isImporting}
            />
          )}
        </Section>
      )}

      {/* ── Dataset History (always visible) ── */}
      <Section
        title="Dataset History"
        subtitle="Previously processed datasets are retained locally in your browser so the workspace survives page reloads."
      >
        <DatasetHistory
          items={history}
          onDelete={handleDeleteHistory}
          onView={handleViewHistory}
        />
      </Section>

      {/* Sample files notice */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-700">
          <strong>Testing:</strong> Sample datasets are available in{' '}
          <code className="bg-blue-100 rounded px-1">src/data/sampleData/</code> —
          try <code className="bg-blue-100 rounded px-1">datasetA.csv</code> (standard),{' '}
          <code className="bg-blue-100 rounded px-1">datasetB.csv</code> (aliased columns), or{' '}
          <code className="bg-blue-100 rounded px-1">datasetC.csv</code> (incomplete/invalid).
        </p>
      </div>
    </div>
  );
}
