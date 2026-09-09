import { formatCrore } from '@/utils/formatters';
import { useMemo } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Clock3, Copy, FileWarning, IndianRupee, Search, ShieldAlert, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { RiskBadge } from '@/components/common/RiskBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useCurrentDataset } from '@/services/datasetStore';
import { analyzeDataset, type ProjectRisk } from '@/services/riskEngine';
import { createBackendAction, notifyAuthority } from '@/services/backendApi';
import { useState } from 'react';

interface AlertItem {
  id: string;
  rowIndex: number;
  severity: 'critical' | 'high' | 'medium';
  type: 'Cost' | 'Delay' | 'Progress' | 'Duplicate' | 'Compliance' | 'Agency' | 'Payment';
  title: string;
  message: string;
  action: string;
  project: ProjectRisk;
}

const iconFor: Record<AlertItem['type'], typeof AlertTriangle> = {
  Cost: IndianRupee,
  Delay: Clock3,
  Progress: TrendingUp,
  Duplicate: Copy,
  Compliance: FileWarning,
  Agency: ShieldAlert,
  Payment: ShieldAlert,
};

const severityRank = { critical: 0, high: 1, medium: 2 };

function buildAlerts(projects: ProjectRisk[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  projects.forEach(project => {
    project.factors.forEach(factor => {
      if (!factor.reason || factor.score <= 0) return;
      const severity = factor.score >= 18 || project.riskLevel === 'critical' ? 'critical' : factor.score >= 10 || project.riskLevel === 'high' ? 'high' : 'medium';
      const typeMap: Record<string, AlertItem['type']> = { cost: 'Cost', delay: 'Delay', progress: 'Progress', duplicate: 'Duplicate', compliance: 'Compliance', agency: 'Agency' };
      const type = typeMap[factor.id];
      if (!type) return;
      alerts.push({
        id: `${project.rowIndex}-${factor.id}`,
        rowIndex: project.rowIndex,
        severity,
        type,
        title: `${type} risk detected`,
        message: factor.reason,
        action: project.recommendations.find(r => r.toLowerCase().includes(type.toLowerCase())) ?? project.recommendations[0] ?? 'Review this record and supporting evidence.',
        project,
      });
    });
    const paymentFactor = project.factors.find(f => f.id === 'cost');
    if (paymentFactor && paymentFactor.score >= 18 && project.expenditure !== null && project.sanctionedAmount !== null) {
      alerts.push({
        id: `${project.rowIndex}-payment`, rowIndex: project.rowIndex,
        severity: project.riskLevel === 'critical' ? 'critical' : 'high', type: 'Payment',
        title: 'Payment / expenditure anomaly',
        message: `Reported expenditure is ${formatCrore(project.expenditure)} against ${formatCrore(project.sanctionedAmount)} sanctioned.`,
        action: 'Verify payment releases, bills, vouchers and supporting financial records.', project,
      });
    }
  });
  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.project.riskScore - a.project.riskScore);
}

export function Alerts() {
  const dataset = useCurrentDataset();
  const analysis = useMemo(() => dataset ? analyzeDataset(dataset) : null, [dataset]);
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const alerts = useMemo(() => buildAlerts(analysis?.projectRisks ?? []), [analysis]);
  const filtered = useMemo(() => alerts.filter(a => {
    if (severity && a.severity !== severity) return false;
    if (type && a.type !== type) return false;
    if (query) {
      const haystack = `${a.title} ${a.message} ${a.project.projectName} ${a.project.state} ${a.project.constituency} ${a.project.mpName}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  }), [alerts, severity, type, query]);

  const critical = alerts.filter(a => a.severity === 'critical').length;
  const high = alerts.filter(a => a.severity === 'high').length;
  const medium = alerts.filter(a => a.severity === 'medium').length;

  return (
    <div className="max-w-screen-2xl mx-auto">
      <PageHeader title="AI Alerts & Recommendations" description="Explainable risk alerts generated from cost, progress, delay, duplicate and compliance signals." />

      {!dataset || !analysis ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <Bell className="mx-auto mb-3 text-slate-400" size={32} />
          <h2 className="text-sm font-semibold text-slate-900">No processed dataset available</h2>
          <p className="mt-1 text-xs text-slate-500">Upload and process an MPLADS dataset before generating monitoring alerts.</p>
          <Link to="/data-management" className="mt-4 inline-flex rounded-md bg-primary-600 px-4 py-2 text-xs font-medium text-white hover:bg-primary-700">Go to Data Management</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <AlertKpi icon={Bell} label="Total Alerts" value={alerts.length} />
            <AlertKpi icon={ShieldAlert} label="Critical" value={critical} tone="critical" />
            <AlertKpi icon={AlertTriangle} label="High" value={high} tone="high" />
            <AlertKpi icon={CheckCircle2} label="Medium" value={medium} tone="medium" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 mb-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search project, state, MP..." className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-primary-400" />
              </div>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"><option value="">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option></select>
              <select value={type} onChange={e => setType(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"><option value="">All alert types</option>{['Cost','Delay','Progress','Duplicate','Compliance','Agency','Payment'].map(x => <option key={x}>{x}</option>)}</select>
              <button onClick={() => { setSeverity(''); setType(''); setQuery(''); }} className="h-9 rounded-md border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50">Reset</button>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Authority email for real notification" className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-primary-400"/><span className="self-center text-[10px] text-slate-400">Backend SMTP required</span></div><p className="mt-2 text-[11px] text-slate-400">Showing {filtered.length} of {alerts.length} generated alerts. Alerts are risk signals for review, not proof of fraud.</p>{actionMessage && <p className="mt-2 text-xs font-medium text-primary-700">{actionMessage}</p>}
          </div>

          <div className="space-y-3">
            {filtered.map(alert => <AlertCard key={alert.id} alert={alert} recipientEmail={recipientEmail} busy={actionBusy === alert.id} onAction={async () => { setActionBusy(alert.id); setActionMessage(''); try { const project = alert.project; const created = await createBackendAction({ projectId: project.projectId, projectName: project.projectName, state: project.state, constituency: project.constituency, mpName: project.mpName, agency: project.agency, riskScore: project.riskScore, riskLevel: project.riskLevel, factors: project.factors, recommendations: project.recommendations }, 7); if (recipientEmail) { const result = await notifyAuthority(created.actionId!, [recipientEmail]); const sent = result.results.some(r => r.status === 'SENT'); setActionMessage(sent ? 'Action created and authority email sent.' : 'Action created, but email delivery failed. Check backend SMTP configuration.'); } else { setActionMessage(`Action ${created.actionId?.slice(0, 8)} created. Add an authority email to send notification.`); } } catch (e) { setActionMessage(e instanceof Error ? e.message : 'Backend action failed. Start the FastAPI server on port 8000.'); } finally { setActionBusy(null); } }} />)}
            {!filtered.length && <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No alerts match the selected filters.</div>}
          </div>
        </>
      )}
    </div>
  );
}

function AlertKpi({ icon: Icon, label, value, tone }: { icon: typeof Bell; label: string; value: number; tone?: 'critical'|'high'|'medium' }) {
  const text = tone === 'critical' ? 'text-red-600' : tone === 'high' ? 'text-orange-600' : tone === 'medium' ? 'text-yellow-600' : 'text-slate-900';
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{label}</span><Icon size={17} className="text-slate-400" /></div><div className={`mt-2 text-2xl font-semibold ${text}`}>{value.toLocaleString('en-IN')}</div></div>;
}

function AlertCard({ alert, recipientEmail, busy, onAction }: { alert: AlertItem; recipientEmail: string; busy: boolean; onAction: () => void }) {
  const Icon = iconFor[alert.type];
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] hover:border-slate-300">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex gap-3 min-w-0">
        <div className="mt-0.5 rounded-md bg-slate-100 p-2"><Icon size={17} className="text-slate-600" /></div>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">{alert.title}</h3><RiskBadge level={alert.severity} /></div><p className="mt-1 text-xs font-medium text-slate-600">{alert.project.projectName}</p><p className="mt-1 text-xs leading-5 text-slate-500">{alert.message}</p></div>
      </div>
      <div className="shrink-0 text-left lg:text-right"><p className="text-lg font-semibold text-slate-900">{alert.project.riskScore}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Risk score</p></div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
      <Mini label="State" value={alert.project.state || '—'} /><Mini label="Constituency" value={alert.project.constituency || '—'} /><Mini label="Status" value={<StatusBadge status={alert.project.status} />} /><Mini label="Action" value={alert.action} />
    </div>
  </div>;
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) { return <div><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 text-xs text-slate-700 line-clamp-2">{value}</div></div>; }
