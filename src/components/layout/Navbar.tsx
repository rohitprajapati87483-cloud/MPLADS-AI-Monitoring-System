import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, CircleDot, Moon, Sun, ArrowUpRight, ShieldAlert, Copy, IndianRupee, Clock3, X } from 'lucide-react';
import { navigationItems } from '@/data/navigation';
import { useSidebar } from '@/hooks/useSidebar';
import { useTheme } from '@/hooks/useTheme';
import { useCurrentDataset } from '@/services/datasetStore';
import { analyzeDataset, type ProjectRisk } from '@/services/riskEngine';
import { getBackendActions } from '@/services/backendApi';

function usePageTitle(): string { const { pathname } = useLocation(); const item = navigationItems.find(n => n.path === pathname); return item?.label ?? 'MPLADS AI Monitor'; }

function fraudSignals(projects: ProjectRisk[]) {
  return projects.filter(p => {
    const duplicate = p.factors.find(f => f.id === 'duplicate')?.score ?? 0;
    const cost = p.factors.find(f => f.id === 'cost')?.score ?? 0;
    return duplicate >= 10 || (p.riskLevel === 'critical' && cost >= 12);
  }).sort((a,b) => b.riskScore - a.riskScore);
}

function signalLabel(project: ProjectRisk) {
  const duplicate = project.factors.find(f => f.id === 'duplicate')?.score ?? 0;
  if (duplicate >= 10) return { label: 'Potential duplicate / fraud risk', icon: Copy };
  return { label: 'Critical financial risk', icon: IndianRupee };
}

export function Navbar(){
  const {openMobile}=useSidebar(); const pageTitle=usePageTitle(); const {theme,toggleTheme}=useTheme(); const navigate=useNavigate(); const dataset=useCurrentDataset(); const analysis=useMemo(()=>dataset?analyzeDataset(dataset):null,[dataset]); const [q,setQ]=useState(''); const [open,setOpen]=useState(false); const [alertsOpen,setAlertsOpen]=useState(false); const [actionCount,setActionCount]=useState(0); const alertsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{let live=true;const load=()=>getBackendActions().then(d=>{if(live)setActionCount((d.actions||[]).filter(a=>!['CLOSED','VERIFIED'].includes(a.status)).length)}).catch(()=>undefined);void load();const timer=window.setInterval(load,15000);return()=>{live=false;window.clearInterval(timer)}},[]);
  useEffect(()=>{const close=(e:MouseEvent)=>{if(alertsRef.current&&!alertsRef.current.contains(e.target as Node))setAlertsOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
  const results=useMemo(()=>{const x=q.trim().toLowerCase();if(!x||!analysis)return[];return analysis.projectRisks.filter(p=>`${p.projectId} ${p.projectName} ${p.state} ${p.district} ${p.constituency} ${p.mpName} ${p.agency}`.toLowerCase().includes(x)).slice(0,7)},[q,analysis]);
  const frauds=useMemo(()=>fraudSignals(analysis?.projectRisks??[]),[analysis]);
  const alertCount=frauds.length;
  return <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
    <button onClick={openMobile} className="flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" aria-label="Open navigation"><Menu size={20}/></button>
    <div className="hidden items-center gap-2 sm:flex"><img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md lg:hidden" /><h1 className="min-w-0 max-w-[240px] flex-shrink-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</h1></div><div className="flex-1"/>
    <div className="relative hidden md:block"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);setQ('')}if(e.key==='Enter'&&results[0]){navigate(`/projects/${encodeURIComponent(results[0].projectId)}`,{state:{rowIndex:results[0].rowIndex}});setOpen(false);setQ('')}}} placeholder="Search projects, districts..." className="h-8 w-64 rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" aria-label="Search projects"/>{open&&q&&<div className="absolute right-0 top-10 z-50 w-[380px] max-w-[80vw] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">{results.length?results.map(p=><button key={`${p.rowIndex}`} onClick={()=>{navigate(`/projects/${encodeURIComponent(p.projectId)}`,{state:{rowIndex:p.rowIndex}});setOpen(false);setQ('')}} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className="min-w-0"><b className="block truncate text-xs text-slate-800 dark:text-slate-100">{p.projectName}</b><span className="block truncate text-[10px] text-slate-500">{p.state} · {p.constituency} · {p.projectId}</span></span><ArrowUpRight size={13} className="shrink-0 text-slate-400"/></button>):<div className="p-4 text-xs text-slate-500">No matching project in the active dataset.</div>}</div>}</div>
    <div className="relative" ref={alertsRef}>
      <button onClick={()=>setAlertsOpen(v=>!v)} className={"relative flex h-9 items-center justify-center rounded-md px-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 " + (alertCount ? 'text-red-600 dark:text-red-400' : '')} aria-label={alertCount?`${alertCount} potential fraud alerts`:'Open alerts'} aria-expanded={alertsOpen}>
        <Bell size={19}/>{alertCount>0&&<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">{Math.min(99,alertCount)}</span>}
      </button>
      {alertsOpen&&<div className="absolute right-0 top-11 z-50 w-[390px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Risk Alerts</p><p className="text-[10px] text-slate-500 dark:text-slate-400">Potential fraud and critical anomaly signals</p></div><button onClick={()=>setAlertsOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={15}/></button></div>
        {frauds.length ? <div className="max-h-[360px] overflow-y-auto">{frauds.slice(0,8).map(p=>{const s=signalLabel(p);const Icon=s.icon;return <button key={p.rowIndex} onClick={()=>{navigate(`/projects/${encodeURIComponent(p.projectId)}`,{state:{rowIndex:p.rowIndex}});setAlertsOpen(false)}} className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"><Icon size={15}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">{s.label}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{p.projectName}</span><span className="mt-1 block text-[10px] text-slate-400">{p.state} · {p.constituency} · Risk {p.riskScore}</span></span><ArrowUpRight size={14} className="mt-1 shrink-0 text-slate-400"/></button>})}</div> : <div className="p-6 text-center"><ShieldAlert className="mx-auto mb-2 text-green-500" size={24}/><p className="text-xs font-semibold text-slate-900 dark:text-slate-100">No potential fraud signals</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">The active dataset currently has no duplicate/critical financial fraud-risk signals.</p></div>}
        <div className="border-t border-slate-200 p-3 dark:border-slate-700"><button onClick={()=>{navigate('/alerts');setAlertsOpen(false)}} className="w-full rounded-md bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">View all alerts</button>{actionCount>0&&<p className="mt-2 text-center text-[10px] text-slate-500 dark:text-slate-400">{actionCount} open review action{actionCount===1?'':'s'} in Action Center</p>}</div>
      </div>}
    </div>
    <div className="hidden lg:flex items-center gap-2 mr-1" title="Public Fund Guardian — AI monitoring, fraud risk and accountability"><img src="/purpose-logo.svg" alt="Public Fund Guardian" className="h-7 w-[115px] object-cover object-left"/><span className="sr-only">MPLADS AI Monitor</span></div><div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 sm:flex"><CircleDot size={12} className="text-green-500"/><span className="font-medium text-slate-600 dark:text-slate-300">Data:</span><span className="font-semibold text-green-600">{dataset?'Ready':'Awaiting'}</span></div>
    <button onClick={toggleTheme} className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-label="Toggle theme">{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>}<span className="hidden sm:inline">{theme==='dark'?'Light':'Dark'}</span></button>
  </header>
}
