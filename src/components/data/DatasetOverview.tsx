import { FileText, Table2, LayoutGrid, HardDrive, AlertTriangle, Copy } from 'lucide-react';
import type { ParsedDataset } from '@/types/dataset';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  colorClass?: string;
}

function StatCard({ label, value, sub, icon, colorClass }: StatCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', colorClass ?? 'bg-slate-100 text-slate-500')}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface DatasetOverviewProps {
  dataset: ParsedDataset;
}

export function DatasetOverview({ dataset }: DatasetOverviewProps) {
  const avgMissing =
    dataset.columnProfiles.length > 0
      ? (
          dataset.columnProfiles.reduce((s, p) => s + p.missingPercent, 0) /
          dataset.columnProfiles.length
        ).toFixed(1)
      : '0.0';

  const duplicateRows = dataset.duplicateGroups.reduce((s, g) => s + g.count, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Dataset"
          value={dataset.fileName.length > 16 ? dataset.fileName.slice(0, 14) + '…' : dataset.fileName}
          sub={dataset.fileName}
          icon={<FileText size={18} />}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Rows"
          value={formatNumber(dataset.totalRows)}
          sub="data records"
          icon={<Table2 size={18} />}
          colorClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Columns"
          value={String(dataset.totalColumns)}
          sub="detected fields"
          icon={<LayoutGrid size={18} />}
          colorClass="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="File Size"
          value={formatBytes(dataset.fileSize)}
          sub={dataset.fileType.toUpperCase()}
          icon={<HardDrive size={18} />}
          colorClass="bg-slate-100 text-slate-500"
        />
        <StatCard
          label="Duplicate Rows"
          value={formatNumber(duplicateRows)}
          sub={duplicateRows > 0 ? 'may need review' : 'none found'}
          icon={<Copy size={18} />}
          colorClass={
            duplicateRows > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
          }
        />
        <StatCard
          label="Missing Values"
          value={`${avgMissing}%`}
          sub="average across columns"
          icon={<AlertTriangle size={18} />}
          colorClass={
            parseFloat(avgMissing) > 20
              ? 'bg-red-50 text-red-500'
              : parseFloat(avgMissing) > 5
              ? 'bg-amber-50 text-amber-600'
              : 'bg-green-50 text-green-600'
          }
        />
      </div>
    </div>
  );
}
