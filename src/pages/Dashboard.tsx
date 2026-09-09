import { useMemo, useState } from 'react';
import { FolderKanban, IndianRupee, TrendingUp, PieChart as PieChartIcon, ShieldAlert, Bell, Sparkles, Clock, Copy, CreditCard, BarChart3, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar, type DashboardFilters } from '@/components/common/FilterBar';
import { KPICard } from '@/components/common/KPICard';
import { ChartCard } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/common/DataTable';
import { RiskBadge } from '@/components/common/RiskBadge';
import { useCurrentDataset } from '@/services/datasetStore';
import { analyzeDataset, type ProjectRisk } from '@/services/riskEngine';
import { formatCurrency } from '@/utils/formatters';
import type { TableColumn } from '@/types';

const riskCells = ['#22c55e','#eab308','#f97316','#ef4444'];
const statusCells = ['#22c55e','#3b82f6','#f97316','#94a3b8'];
const emptyRisk = [{ name:'No Data', value:1 }];

type Row = Record<string, unknown>;
type TableRow = Record<string, unknown>;
const columns: TableColumn<TableRow>[] = [
  { key:'projectId', header:'Project ID' }, { key:'project', header:'Project' }, { key:'district', header:'District' },
  { key:'sanctionedAmount', header:'Sanctioned' }, { key:'expenditure', header:'Expenditure' }, { key:'progress', header:'Progress' },
  { key:'riskScore', header:'Risk Score' }, { key:'riskLevel', header:'Risk Level', render:(v) => <RiskBadge level={String(v)} /> },
];

const fyOf = (v: unknown) => { if (!v) return ''; const d = new Date(String(v)); if (Number.isNaN(d.getTime())) return ''; const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear()-1; return `${y}-${String(y+1).slice(-2)}`; };
const statusLabel = (s: string) => s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase()+s.slice(1);

export function Dashboard() {
  const dataset = useCurrentDataset();
  const analysis = useMemo(() => dataset ? analyzeDataset(dataset) : null, [dataset]);
  const [filters,setFilters] = useState<DashboardFilters>({state:'',district:'',mpConstituency:'',financialYear:'',agency:'',projectStatus:'',riskLevel:''});

  const options = useMemo(() => analysis ? ({
    state:analysis.states, district:analysis.districts, mpConstituency:[...analysis.constituencies,...analysis.mps].sort(), financialYear:analysis.financialYears,
    agency:analysis.agencies, projectStatus:analysis.statuses.map(statusLabel), riskLevel:['Low','Medium','High','Critical'],
  }) : {state:[],district:[],mpConstituency:[],financialYear:[],agency:[],projectStatus:[],riskLevel:[]}, [analysis]);

  const filtered = useMemo(() => {
    if (!analysis || !dataset) return [] as ProjectRisk[];
    return analysis.projectRisks.filter(p => {
      const row = dataset.rows[p.rowIndex] as Row;
      return (!filters.state || p.state===filters.state) && (!filters.district || p.district===filters.district) &&
        (!filters.mpConstituency || p.constituency===filters.mpConstituency || p.mpName===filters.mpConstituency) &&
        (!filters.financialYear || fyOf(row.start_date)===filters.financialYear) && (!filters.agency || p.agency===filters.agency) &&
        (!filters.projectStatus || statusLabel(p.status)===filters.projectStatus) && (!filters.riskLevel || statusLabel(p.riskLevel)===filters.riskLevel);
    });
  }, [analysis,dataset,filters]);

  const metrics = useMemo(() => {
    const totalSanctioned=filtered.reduce((s,p)=>s+(p.sanctionedAmount??0),0), totalExpenditure=filtered.reduce((s,p)=>s+(p.expenditure??0),0);
    const distribution=['low','medium','high','critical'].map((name,i)=>({name:name[0].toUpperCase()+name.slice(1),value:filtered.filter(p=>p.riskLevel===name).length,fill:riskCells[i]}));
    const status=['completed','in-progress','delayed','pending'].map((name,i)=>({name:statusLabel(name),value:filtered.filter(p=>p.status===name).length,fill:statusCells[i]}));
    const counts={cost:0,delay:0,fund:0,progress:0,duplicate:0,payment:0};
    filtered.forEach(p=>p.factors.forEach(f=>{if(f.id==='cost'&&f.score>0)counts.cost++;if(f.id==='delay'&&f.score>0)counts.delay++;if(f.id==='progress'&&f.score>0)counts.progress++;if(f.id==='duplicate'&&f.score>0)counts.duplicate++;}));
    return {totalSanctioned,totalExpenditure,utilization:totalSanctioned?totalExpenditure/totalSanctioned*100:null,high:filtered.filter(p=>p.riskLevel==='high'||p.riskLevel==='critical').length,critical:filtered.filter(p=>p.riskLevel==='critical').length,delayed:filtered.filter(p=>p.status==='delayed').length,alerts:filtered.filter(p=>p.riskScore>=50).length,distribution,status,counts};
  }, [filtered]);

  const financial = useMemo(() => {
    if (!dataset) return [];
    const buckets = new Map<string,{Sanctioned:number;Released:number;Expenditure:number}>();
    filtered.forEach(p=>{ const d=new Date(String((dataset.rows[p.rowIndex] as Row).start_date??'')); if(Number.isNaN(d.getTime())) return; const q=`Q${Math.floor(d.getMonth()/3)+1}`; const b=buckets.get(q)??{Sanctioned:0,Released:0,Expenditure:0}; b.Sanctioned+=p.sanctionedAmount??0; b.Expenditure+=p.expenditure??0; const r=Number((dataset.rows[p.rowIndex] as Row).amount_released??(dataset.rows[p.rowIndex] as Row).amount_disbursed); if(Number.isFinite(r))b.Released+=r; buckets.set(q,b); });
    return ['Q1','Q2','Q3','Q4'].map(name=>({name,...(buckets.get(name)??{Sanctioned:0,Released:0,Expenditure:0})}));
  }, [dataset,filtered]);

  const tableData=filtered.slice(0,20).map(p=>({projectId:p.projectId,project:p.projectName,district:p.district||'--',sanctionedAmount:formatCurrency(p.sanctionedAmount),expenditure:formatCurrency(p.expenditure),progress:p.progress==null?'--':`${p.progress.toFixed(1)}%`,riskScore:p.riskScore,riskLevel:p.riskLevel}));
  const anomalies=[['cost','Cost Anomaly',IndianRupee,'text-red-500','bg-red-50'],['delay','Delay Anomaly',Clock,'text-orange-500','bg-orange-50'],['fund','Fund Utilization',CreditCard,'text-yellow-600','bg-yellow-50'],['progress','Progress Mismatch',TrendingUp,'text-blue-500','bg-blue-50'],['duplicate','Duplicate Risk',Copy,'text-purple-500','bg-purple-50'],['payment','Payment Anomaly',AlertCircle,'text-pink-500','bg-pink-50']] as const;

  return <div className="max-w-screen-2xl mx-auto"><PageHeader title="MPLADS AI Monitoring Dashboard" description="Monitor development works, expenditure, progress, anomalies and implementation risks." />
    <FilterBar value={filters} options={options} onChange={(k,v)=>setFilters(x=>({...x,[k]:v}))} onReset={()=>setFilters({state:'',district:'',mpConstituency:'',financialYear:'',agency:'',projectStatus:'',riskLevel:''})}/>
    {!dataset || !analysis ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Upload and process an MPLADS dataset in <b>Data Management</b> to populate the dashboard.</div> : <>
      <section className="mb-6"><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Projects" value={filtered.length.toLocaleString('en-IN')} subtitle="Filtered projects" icon={FolderKanban} iconClassName="bg-blue-50 text-blue-600"/>
        <KPICard title="Total Sanctioned" value={formatCurrency(metrics.totalSanctioned)} subtitle="Filtered funds" icon={IndianRupee} iconClassName="bg-green-50 text-green-600"/>
        <KPICard title="Total Expenditure" value={formatCurrency(metrics.totalExpenditure)} subtitle="Funds utilised" icon={BarChart3} iconClassName="bg-indigo-50 text-indigo-600"/>
        <KPICard title="Fund Utilization" value={metrics.utilization==null?'-- %':`${metrics.utilization.toFixed(1)} %`} subtitle="Expenditure / Sanctioned" icon={TrendingUp} iconClassName="bg-amber-50 text-amber-600"/>
        <KPICard title="High Risk Projects" value={metrics.high.toLocaleString('en-IN')} subtitle={`${metrics.critical} critical`} icon={ShieldAlert} iconClassName="bg-orange-50 text-orange-600"/>
        <KPICard title="Critical Alerts" value={metrics.alerts.toLocaleString('en-IN')} subtitle="Risk score ≥ 50" icon={Bell} iconClassName="bg-red-50 text-red-600"/>
      </div></section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"><ChartCard className="lg:col-span-2 min-w-0 overflow-hidden" title="Financial Overview" subtitle="Sanctioned vs Released vs Expenditure"><div className="chart-wrap"><ResponsiveContainer width="100%" height={260}><BarChart data={financial}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="name"/><YAxis/><Tooltip formatter={(v)=>formatCurrency(Number(v))}/><Bar dataKey="Sanctioned" fill="#4338ca"/><Bar dataKey="Released" fill="#6366f1"/><Bar dataKey="Expenditure" fill="#a5b4fc"/></BarChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Project Status" subtitle="Current status distribution"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={metrics.status.length?metrics.status:[{name:'No Data',value:1}]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">{(metrics.status.length?metrics.status:[{name:'No Data',value:1,fill:'#e2e8f0'}]).map((x,i)=><Cell key={x.name} fill={x.fill??statusCells[i]}/>)}</Pie><Legend/></PieChart></ResponsiveContainer></ChartCard></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"><ChartCard title="Risk Overview" subtitle="Low / Medium / High / Critical"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={metrics.distribution.some(x=>x.value)?metrics.distribution:emptyRisk} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">{(metrics.distribution.some(x=>x.value)?metrics.distribution:emptyRisk).map((x,i)=><Cell key={x.name} fill={(x as {fill?:string}).fill??'#e2e8f0'}/>)}</Pie><Legend/></PieChart></ResponsiveContainer></ChartCard>
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]"><div className="flex items-center gap-2 mb-1"><Sparkles size={15} className="text-primary-600"/><h3 className="text-sm font-semibold text-slate-800">AI Anomaly Detection</h3></div><p className="text-xs text-slate-500 mb-4">Rule-based risk signals from the processed dataset.</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{anomalies.map(([id,label,Icon,color,bg])=><div key={id} className="rounded-lg border border-slate-100 p-3"><div className={`flex h-8 w-8 items-center justify-center rounded-md ${bg}`}><Icon size={15} className={color}/></div><p className="text-xs font-medium text-slate-700 mt-2">{label}</p><p className="text-xl font-bold text-slate-800">{metrics.counts[id as keyof typeof metrics.counts]}</p><p className="text-[10px] text-slate-400">Flagged projects</p></div>)}</div></div></div>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-card)]"><div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-800">High-Risk Projects</h3><p className="text-xs text-slate-500 mt-0.5">Top 20 projects requiring review under the current filters.</p></div><DataTable id="high-risk-projects-table" columns={columns} data={tableData} emptyMessage="No projects match the current filters."/></section>
    </>}
  </div>;
}
