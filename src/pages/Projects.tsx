import { useMemo, useState } from 'react';
import { FolderKanban, Search, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCrore } from '@/utils/formatters';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { RiskBadge } from '@/components/common/RiskBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useCurrentDataset } from '@/services/datasetStore';
import { analyzeDataset } from '@/services/riskEngine';

export function Projects() {
  const dataset = useCurrentDataset();
  const analysis = useMemo(() => dataset ? analyzeDataset(dataset) : null, [dataset]);
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState('');

  const projects = useMemo(() => (analysis?.projectRisks ?? []).filter(p => {
    if (risk && p.riskLevel !== risk) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return `${p.projectId} ${p.projectName} ${p.state} ${p.district} ${p.constituency} ${p.mpName} ${p.agency}`.toLowerCase().includes(q);
  }).slice(0, 100), [analysis, query, risk]);

  return <div className="max-w-screen-2xl mx-auto">
    <PageHeader title="Projects" description="Browse MPLADS-funded projects and open an evidence-based risk investigation." />
    {!dataset || !analysis ? <div className="rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-card)]"><EmptyState icon={FolderKanban} title="No project data available" description="Upload and process an MPLADS dataset to view project listings, statuses and risk details." /></div> : <>
      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-5 shadow-[var(--shadow-card)] flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search project, state, MP, constituency..." className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-primary-400" /></div>
        <select value={risk} onChange={e=>setRisk(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"><option value="">All risk levels</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-xs text-slate-500">Showing {projects.length} projects (maximum 100 per view)</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Project</th><th>Location</th><th>Agency</th><th>Sanctioned</th><th>Expenditure</th><th>Progress</th><th>Risk</th><th>Status</th><th></th></tr></thead><tbody>{projects.map(p=><tr key={`${p.rowIndex}-${p.projectId}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-4 py-3"><p className="font-medium text-slate-800 max-w-[300px] truncate">{p.projectName}</p><p className="text-[10px] text-slate-400">{p.projectId}</p></td><td className="text-xs text-slate-600">{p.district || '—'}{p.state ? `, ${p.state}` : ''}</td><td className="text-xs text-slate-600 max-w-[180px] truncate">{p.agency || '—'}</td><td className="text-xs">{p.sanctionedAmount == null ? '—' : formatCrore(p.sanctionedAmount)}</td><td className="text-xs">{p.expenditure == null ? '—' : formatCrore(p.expenditure)}</td><td className="text-xs">{p.progress == null ? '—' : `${p.progress.toFixed(0)}%`}</td><td><RiskBadge level={p.riskLevel} /></td><td><StatusBadge status={p.status} /></td><td className="pr-4"><Link to={`/projects/${encodeURIComponent(p.projectId)}`} state={{ rowIndex: p.rowIndex }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white hover:border-primary-300"><ArrowUpRight size={12}/>Investigate</Link></td></tr>)}</tbody></table></div>
        {!projects.length && <EmptyState compact title="No matching projects" description="Try changing the search text or risk filter." />}
      </div>
    </>}
  </div>;
}
