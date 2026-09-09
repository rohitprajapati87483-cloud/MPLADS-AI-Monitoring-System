import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Landmark, Search, TrendingUp, WalletCards } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useCurrentDataset } from '@/services/datasetStore';
import { buildConstituencyAllocations, loadAllocationRecords, type AllocationRecord, type ConstituencyAllocation } from '@/services/allocationService';
import { formatCurrency } from '@/utils/formatters';

function pct(value: number) { return `${value.toFixed(1)}%`; }
function utilizationClass(value: number) {
  if (value < 40) return 'text-rose-700 bg-rose-50';
  if (value < 70) return 'text-amber-700 bg-amber-50';
  if (value <= 100) return 'text-emerald-700 bg-emerald-50';
  return 'text-violet-700 bg-violet-50';
}

export function MPConstituency() {
  const dataset = useCurrentDataset();
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const [utilization, setUtilization] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllocationRecords().then(setAllocations).catch(() => setAllocations([])).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => dataset ? buildConstituencyAllocations(dataset, allocations) : [], [dataset, allocations]);
  const states = useMemo(() => [...new Set(rows.map(r => r.state))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter(r => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || `${r.mpName} ${r.constituency} ${r.state}`.toLowerCase().includes(q);
    const matchesState = state === 'all' || r.state === state;
    const matchesUtil = utilization === 'all' || (utilization === 'low' && r.utilization < 40) || (utilization === 'medium' && r.utilization >= 40 && r.utilization < 70) || (utilization === 'high' && r.utilization >= 70);
    return matchesSearch && matchesState && matchesUtil;
  }), [rows, search, state, utilization]);

  const summary = useMemo(() => {
    const matched = rows.filter(r => r.matched);
    const allocated = matched.reduce((s, r) => s + r.allocated, 0);
    const expenditure = matched.reduce((s, r) => s + r.expenditure, 0);
    const sanctioned = matched.reduce((s, r) => s + r.sanctioned, 0);
    return {
      matched: matched.length,
      total: allocations.length,
      allocated,
      expenditure,
      sanctioned,
      utilization: allocated ? expenditure / allocated * 100 : 0,
      low: matched.filter(r => r.utilization < 40).length,
      over: matched.filter(r => r.utilization > 100).length,
    };
  }, [rows, allocations.length]);

  if (!dataset) return (
    <div className="max-w-screen-2xl mx-auto">
      <PageHeader title="MP / Constituency" description="Allocation vs utilization analysis using the official MP allocation dataset and processed MPLADS works." />
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-[var(--shadow-card)]">
        <Landmark className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-900">Process an MPLADS dataset first</h2>
        <p className="mt-1 text-sm text-slate-500">The allocation baseline is available, but utilization requires project expenditure data.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5">
      <PageHeader title="MP / Constituency" description="Allocation vs utilization analysis at MP and constituency level." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Allocated', formatCurrency(summary.allocated), WalletCards],
          ['Expenditure', formatCurrency(summary.expenditure), TrendingUp],
          ['Sanctioned', formatCurrency(summary.sanctioned), Landmark],
          ['Utilization', pct(summary.utilization), TrendingUp],
          ['Low utilization', String(summary.low), AlertTriangle],
        ].map(([label, value, Icon]) => <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]"><div className="flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label as string}</span><Icon className="h-4 w-4 text-slate-400" /></div><div className="mt-2 text-xl font-bold text-slate-900">{value as string}</div></div>)}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search MP, constituency or state" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500" /></div>
          <select value={state} onChange={e => setState(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="all">All states</option>{states.map(s => <option key={s}>{s}</option>)}</select>
          <select value={utilization} onChange={e => setUtilization(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="all">All utilization</option><option value="low">Below 40%</option><option value="medium">40–70%</option><option value="high">70%+</option></select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{filtered.length} constituencies shown</span><span>•</span><span>{summary.matched} allocation records matched to project data</span>{loading && <><span>•</span><span>Loading allocation baseline…</span></>}</div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">MP / Constituency</th><th className="px-4 py-3">State</th><th className="px-4 py-3 text-right">Allocated</th><th className="px-4 py-3 text-right">Sanctioned</th><th className="px-4 py-3 text-right">Expenditure</th><th className="px-4 py-3 text-right">Utilization</th><th className="px-4 py-3 text-right">Remaining</th><th className="px-4 py-3 text-right">Projects</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.slice(0, 250).map(r => <tr key={r.key} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="font-medium text-slate-900">{r.mpName || 'MP not mapped'}</div><div className="text-xs text-slate-500">{r.constituency}</div></td><td className="px-4 py-3 text-slate-600">{r.state}</td><td className="px-4 py-3 text-right font-medium">{formatCurrency(r.allocated)}</td><td className="px-4 py-3 text-right">{formatCurrency(r.sanctioned)}</td><td className="px-4 py-3 text-right">{formatCurrency(r.expenditure)}</td><td className="px-4 py-3 text-right"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${utilizationClass(r.utilization)}`}>{pct(r.utilization)}</span></td><td className={`px-4 py-3 text-right ${r.remaining < 0 ? 'font-semibold text-rose-700' : ''}`}>{formatCurrency(r.remaining)}</td><td className="px-4 py-3 text-right">{r.projectCount}</td></tr>)}</tbody></table></div>
        {filtered.length > 250 && <div className="border-t px-4 py-3 text-xs text-slate-500">Showing first 250 results. Refine the filters to investigate a smaller set.</div>}
      </div>

      {summary.over > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Review signal:</strong> {summary.over} matched constituencies have expenditure above the allocation baseline. This should be verified against the allocation period, carry-forward rules and source records; it is not by itself evidence of misuse.</div>}
    </div>
  );
}
