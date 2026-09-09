import { format } from 'date-fns';
import { Eye, Trash2, RefreshCw } from 'lucide-react';
import type { DatasetHistoryItem, DatasetStatus } from '@/types/dataset';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: DatasetStatus }) {
  const map: Record<DatasetStatus, string> = {
    uploaded: 'bg-slate-100 text-slate-600 border-slate-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    imported: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels: Record<DatasetStatus, string> = {
    uploaded: 'Uploaded', processing: 'Processing', ready: 'Ready',
    imported: 'Imported', failed: 'Failed',
  };
  return (
    <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold uppercase', map[status])}>
      {labels[status]}
    </span>
  );
}

function QualityBar({ quality }: { quality: number }) {
  const color = quality >= 80 ? 'bg-green-500' : quality >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${quality}%` }} />
      </div>
      <span className="text-xs text-slate-600">{quality}</span>
    </div>
  );
}

interface DatasetHistoryProps {
  items: DatasetHistoryItem[];
  onDelete: (id: string) => void;
  onReprocess?: (id: string) => void;
  onView?: (id: string) => void;
}

export function DatasetHistory({ items, onDelete, onReprocess, onView }: DatasetHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <p className="text-sm font-medium text-slate-600">No datasets uploaded yet</p>
        <p className="text-xs text-slate-400 mt-1">
          Uploaded datasets will appear here and persist across sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {['Dataset', 'Uploaded', 'Rows', 'Columns', 'Quality', 'Status', 'Actions'].map((h) => (
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
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[200px] truncate" title={item.fileName}>
                {item.fileName}
                {item.mappedFields != null && (
                  <p className="text-[10px] text-slate-400 font-normal">
                    {item.mappedFields} / {item.totalFields} fields mapped
                  </p>
                )}
              </td>
              <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                {format(new Date(item.uploadedAt), 'dd MMM yyyy, HH:mm')}
              </td>
              <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">
                {item.rows.toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">
                {item.columns}
              </td>
              <td className="px-3 py-2.5">
                <QualityBar quality={item.quality} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1">
                  {onView && (
                    <button
                      onClick={() => onView(item.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <Eye size={11} /> View
                    </button>
                  )}
                  {onReprocess && (
                    <button
                      onClick={() => onReprocess(item.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      <RefreshCw size={11} /> Reprocess
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
