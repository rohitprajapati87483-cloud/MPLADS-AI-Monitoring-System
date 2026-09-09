import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DashboardFilters {
  state: string; district: string; mpConstituency: string; financialYear: string; agency: string; projectStatus: string; riskLevel: string;
}

type Key = keyof DashboardFilters;
interface FilterBarProps { value: DashboardFilters; options: Record<Key, string[]>; onChange: (key: Key, value: string) => void; onReset: () => void; className?: string; }

function FilterSelect({ label, id, value, options, onChange }: { label: string; id: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <div className="flex flex-col gap-1 min-w-[130px] flex-1">
    <label htmlFor={id} className="text-xs font-medium text-slate-500">{label}</label>
    <div className="relative"><select id={id} value={value} onChange={e => onChange(e.target.value)} className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 pl-3 pr-8 text-xs text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400">
      <option value="">All</option>{options.map(o => <option key={o} value={o}>{o}</option>)}
    </select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></div>
  </div>;
}

export function FilterBar({ value, options, onChange, onReset, className }: FilterBarProps) {
  const fields: [Key,string,string][] = [['state','State','filter-state'],['district','District','filter-district'],['mpConstituency','MP / Constituency','filter-mp'],['financialYear','Financial Year','filter-fy'],['agency','Agency','filter-agency'],['projectStatus','Project Status','filter-status'],['riskLevel','Risk Level','filter-risk']];
  return <div className={cn('rounded-lg border border-slate-200 bg-white p-4 mb-6', className)}><div className="flex flex-wrap items-end gap-3">
    {fields.map(([key,label,id]) => <FilterSelect key={key} label={label} id={id} value={value[key]} options={options[key]} onChange={v => onChange(key,v)} />)}
    <button onClick={onReset} className="h-8 px-3 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">Reset</button>
  </div><p className="mt-2.5 text-[11px] text-slate-400">Filters update dashboard metrics and the high-risk project list.</p></div>;
}
