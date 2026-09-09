import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, ShieldAlert, Bell, IndianRupee, TrendingUp, Copy, ClipboardCheck,
  Building2, MapPin, Landmark, FileText, Database, Settings, ChevronLeft, ChevronRight, X,
  type LucideIcon,
} from 'lucide-react';
import { navigationItems } from '@/data/navigation';
import { useSidebar } from '@/hooks/useSidebar';
import { cn } from '@/lib/utils';
import { useCurrentDataset } from '@/services/datasetStore';
import { analyzeDataset } from '@/services/riskEngine';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FolderKanban, ShieldAlert, Bell, IndianRupee, TrendingUp, Copy, ClipboardCheck,
  Building2, MapPin, Landmark, FileText, Database, Settings,
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={cn('shrink-0', className)} size={18} />;
}

function fraudRiskCount() {
  const dataset = useCurrentDataset();
  const analysis = React.useMemo(() => dataset ? analyzeDataset(dataset) : null, [dataset]);
  return React.useMemo(() => {
    if (!analysis) return 0;
    return analysis.projectRisks.filter(p => {
      const duplicate = p.factors.find(f => f.id === 'duplicate')?.score ?? 0;
      const cost = p.factors.find(f => f.id === 'cost')?.score ?? 0;
      return duplicate >= 10 || (p.riskLevel === 'critical' && cost >= 12);
    }).length;
  }, [analysis]);
}

function BrandHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <img src="/favicon.svg" alt="MPLADS AI Monitor" className="h-9 w-9 shrink-0 rounded-lg" />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">MPLADS AI Monitor</p>
          <p className="truncate text-[10px] leading-tight text-slate-600 dark:text-slate-300">Risk Intelligence Platform</p>
        </div>
      )}
    </div>
  );
}

function SidebarNavItem({ item, collapsed, onClick, fraudCount }: { item: (typeof navigationItems)[number]; collapsed: boolean; onClick?: () => void; fraudCount?: number }) {
  return (
    <NavLink to={item.path} onClick={onClick} title={collapsed ? item.label : undefined}
      className={({ isActive }) => cn('group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors', 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100', isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300', collapsed && 'justify-center px-2')}>
      <NavIcon name={item.icon} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {item.id === 'alerts' && !!fraudCount && (
        <span className={cn('ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white', 'bg-red-600 ring-2 ring-white dark:ring-slate-950')}>
          {Math.min(99, fraudCount)}
        </span>
      )}
    </NavLink>
  );
}

function DesktopSidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const fraudCount = fraudRiskCount();
  return (
    <aside className={cn('hidden lg:flex h-screen sticky top-0 flex-col border-r border-slate-200 bg-white shrink-0 transition-all duration-200 dark:border-slate-800 dark:bg-slate-950', isCollapsed ? 'w-[56px]' : 'w-[220px]')}>
      <BrandHeader collapsed={isCollapsed} />
      {!isCollapsed && (
        <div className="mx-2 mt-2 rounded-xl border border-primary-100 bg-primary-50/70 p-2.5 dark:border-primary-800/60 dark:bg-primary-950/50">
          <img src="/purpose-logo.svg" alt="Public Fund Guardian — AI monitoring, fraud risk and accountability" className="h-auto w-full" />
        </div>
      )}
      <nav className="flex-1 overflow-y-auto space-y-0.5 px-2 py-3">
        {navigationItems.map(item => <SidebarNavItem key={item.id} item={item} collapsed={isCollapsed} fraudCount={fraudCount} />)}
      </nav>
      <div className="border-t border-slate-200 p-2 dark:border-slate-800">
        <button onClick={toggleCollapsed} className="flex w-full items-center justify-center rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isCollapsed && <span className="ml-2 text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function MobileDrawer() {
  const { isMobileOpen, closeMobile } = useSidebar();
  const location = useLocation();
  const fraudCount = fraudRiskCount();
  React.useEffect(() => { closeMobile(); }, [location.pathname, closeMobile]);
  if (!isMobileOpen) return null;
  return <>
    <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMobile} aria-hidden="true" />
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl dark:bg-slate-950 lg:hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3"><img src="/favicon.svg" alt="MPLADS AI Monitor" className="h-9 w-9 rounded-lg" /><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">MPLADS AI Monitor</p><p className="text-[10px] text-slate-600 dark:text-slate-300">Risk Intelligence Platform</p></div></div>
        <button onClick={closeMobile} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close menu"><X size={18} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto space-y-0.5 px-2 py-3">{navigationItems.map(item => <SidebarNavItem key={item.id} item={item} collapsed={false} onClick={closeMobile} fraudCount={fraudCount} />)}</nav>
    </aside>
  </>;
}

export function Sidebar() { return <><DesktopSidebar /><MobileDrawer /></>; }
