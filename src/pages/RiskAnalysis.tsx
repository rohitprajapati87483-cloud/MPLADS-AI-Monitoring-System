import { useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldAlert, TrendingUp, Clock3, Files } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/common/KPICard';
import { RiskBadge } from '@/components/common/RiskBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { useCurrentDataset } from '@/services/datasetStore';
import { analyzeDataset } from '@/services/riskEngine';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import type { RiskLevel } from '@/types';

export function RiskAnalysis() {
  const dataset = useCurrentDataset();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<'all' | RiskLevel>('all');

  const result = useMemo(() => {
    if (!dataset || !Array.isArray(dataset.rows)) return null;
    try {
      return analyzeDataset(dataset);
    } catch (error) {
      console.error('Risk analysis failed:', error);
      return null;
    }
  }, [dataset]);

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    return result.projectRisks.filter((p) => {
      const matchesLevel = level === 'all' || p.riskLevel === level;
      if (!matchesLevel) return false;
      if (!q) return true;
      return [p.projectId, p.projectName, p.state, p.district, p.constituency, p.mpName, p.agency]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [result, query, level]);

  if (!dataset) {
    return (
      <div className="max-w-screen-2xl mx-auto">
        <PageHeader title="Risk Analysis" description="AI-powered risk scoring and anomaly detection across projects." />
        <EmptyState
          icon={ShieldAlert}
          title="No dataset loaded"
          description="Go to Data Management, upload a CSV/XLSX/JSON file, and click Process. Risk Analysis uses the processed dataset from the current browser session."
        />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-screen-2xl mx-auto">
        <PageHeader title="Risk Analysis" description="AI-powered risk scoring and anomaly detection across projects." />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h3 className="font-semibold">Risk engine error</h3>
          <p className="mt-1 text-sm">The dataset was loaded, but the risk engine could not analyze it. Open the browser console for the exact error.</p>
          <p className="mt-2 text-xs">File: {dataset.fileName} · Rows: {dataset.totalRows}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5">
      <PageHeader
        title="Risk Analysis"
        description="AI-powered risk scoring and anomaly detection across the loaded project dataset."
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Files size={17} /> {dataset.fileName}
          </div>
          <div className="text-xs text-slate-500">
            {dataset.totalRows.toLocaleString()} records · {dataset.totalColumns} columns · Quality {dataset.qualityScore.overall}/100
            <span className="ml-1">· Explainable model {result.modelVersion}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Projects" value={result.projects.toLocaleString()} subtitle="Analyzed records" icon={Files} />
        <KPICard title="High Risk" value={result.highRisk.toLocaleString()} subtitle="High + critical" icon={AlertTriangle} iconClassName="bg-orange-50 text-orange-600" />
        <KPICard title="Critical" value={result.criticalRisk.toLocaleString()} subtitle="Immediate review" icon={ShieldAlert} iconClassName="bg-red-50 text-red-600" />
        <KPICard title="Delayed" value={result.delayed.toLocaleString()} subtitle="Timeline anomalies" icon={Clock3} iconClassName="bg-yellow-50 text-yellow-600" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {result.riskDistribution.map((item) => {
          const key = item.name.toLowerCase() as RiskLevel;
          return (
            <button key={item.name} onClick={() => setLevel(level === key ? 'all' : key)} className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-primary-300 transition">
              <div className="flex items-center justify-between gap-2">
                <RiskBadge level={key} />
                <span className="text-xl font-bold text-slate-900">{item.value}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sanctioned</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(result.totalSanctioned)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Expenditure</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(result.totalExpenditure)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Utilization</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatPercent(result.utilizationPercent)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Project Risk Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sorted by risk score. Select a level to filter.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search project, state, agency..." className="h-9 w-full sm:w-72 rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <select value={level} onChange={(e) => setLevel(e.target.value as 'all' | RiskLevel)} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
              <option value="all">All levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Agency</th>
                <th className="px-4 py-3 text-right">Sanctioned</th>
                <th className="px-4 py-3 text-right">Expenditure</th>
                <th className="px-4 py-3 text-right">Progress</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Risk</th>
                <th className="px-4 py-3 text-left">Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No records match the selected filter.</td></tr>
              ) : filtered.map((p) => (
                <tr key={`${p.rowIndex}-${p.projectId}`} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3"><div className="font-medium text-slate-900">{p.projectName}</div><div className="text-xs text-slate-500">{p.projectId}</div></td>
                  <td className="px-4 py-3 text-slate-600">{p.state || '--'}{p.district ? ` · ${p.district}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{p.agency || '--'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.sanctionedAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.expenditure)}</td>
                  <td className="px-4 py-3 text-right">{p.progress == null ? '--' : `${p.progress.toFixed(1)}%`}</td>
                  <td className="px-4 py-3 text-center"><span className="font-bold text-slate-900">{p.riskScore}</span></td>
                  <td className="px-4 py-3 text-center"><RiskBadge level={p.riskLevel} /></td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[360px]">{p.reasons.length ? p.reasons.join(' ') : 'No anomaly detected.'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
          <TrendingUp size={14} /> Showing {filtered.length.toLocaleString()} of {result.projects.toLocaleString()} records.
        </div>
      </div>
    </div>
  );
}
