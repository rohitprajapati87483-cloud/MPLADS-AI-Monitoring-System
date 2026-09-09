import type { ParsedDataset } from '@/types/dataset';
import type { ProjectRisk, RiskAnalysisResult } from './riskEngine';

export interface FraudRiskReport {
  id: string;
  projectId: string;
  projectName: string;
  datasetId: string;
  datasetName: string;
  generatedAt: string;
  riskScore: number;
  riskLevel: string;
  triggerType: string;
  reasons: string[];
  factors: ProjectRisk['factors'];
  recommendations: string[];
  project: ProjectRisk;
  raw: Record<string, unknown>;
}

const KEY = 'mplads-fraud-risk-reports';

function read(): FraudRiskReport[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as FraudRiskReport[]; } catch { return []; }
}
function write(items: FraudRiskReport[]) { localStorage.setItem(KEY, JSON.stringify(items.slice(0, 500))); }

export function isFraudRiskProject(project: ProjectRisk): boolean {
  const duplicate = project.factors.find(f => f.id === 'duplicate')?.score ?? 0;
  const cost = project.factors.find(f => f.id === 'cost')?.score ?? 0;
  const compliance = project.factors.find(f => f.id === 'compliance')?.score ?? 0;
  return duplicate >= 10 || (project.riskLevel === 'critical' && cost >= 12) || (project.riskLevel === 'critical' && compliance >= 8);
}

function triggerType(project: ProjectRisk): string {
  const d = project.factors.find(f => f.id === 'duplicate')?.score ?? 0;
  const c = project.factors.find(f => f.id === 'cost')?.score ?? 0;
  if (d >= 10 && c > 0) return 'Duplicate + financial anomaly';
  if (d >= 10) return 'Potential duplicate / similarity anomaly';
  if (c > 0) return 'Critical financial anomaly';
  return 'Critical compliance anomaly';
}

export function buildFraudRiskReport(dataset: ParsedDataset, project: ProjectRisk): FraudRiskReport {
  return {
    id: `fr_${dataset.id}_${project.rowIndex}`,
    projectId: project.projectId,
    projectName: project.projectName,
    datasetId: dataset.id,
    datasetName: dataset.fileName,
    generatedAt: new Date().toISOString(),
    riskScore: project.riskScore,
    riskLevel: project.riskLevel,
    triggerType: triggerType(project),
    reasons: project.reasons.length ? project.reasons : ['The project crossed the configured review threshold.'],
    factors: project.factors,
    recommendations: project.recommendations,
    project,
    raw: dataset.rows[project.rowIndex] ?? {},
  };
}

export function ensureFraudReports(dataset: ParsedDataset, analysis: RiskAnalysisResult): FraudRiskReport[] {
  const existing = read();
  const byId = new Map(existing.map(r => [r.id, r]));
  for (const project of analysis.projectRisks) {
    if (!isFraudRiskProject(project)) continue;
    const id = `fr_${dataset.id}_${project.rowIndex}`;
    if (!byId.has(id)) byId.set(id, buildFraudRiskReport(dataset, project));
  }
  const next = [...byId.values()].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  write(next);
  return next;
}

export function getFraudRiskReports(): FraudRiskReport[] { return read(); }
export function getFraudRiskReport(id: string): FraudRiskReport | null { return read().find(r => r.id === id) ?? null; }
export function clearFraudRiskReports() { localStorage.removeItem(KEY); }

function esc(v: unknown) { return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] || c)); }
function money(v: unknown) { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[₹,$€£,%\s,]/g, '')); return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—'; }

export function buildProjectFraudReportHtml(report: FraudRiskReport): string {
  const p = report.project;
  const factors = report.factors.map(f => `<tr><td>${esc(f.label)}</td><td>${f.score} / ${f.max}</td><td>${esc(f.reason || 'No material signal')}</td></tr>`).join('');
  const reasons = report.reasons.map(r => `<li>${esc(r)}</li>`).join('');
  const actions = report.recommendations.map(r => `<li>${esc(r)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Project Risk Report - ${esc(report.projectId)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:34px;line-height:1.5}h1{margin:0 0 5px}h2{margin-top:26px;border-bottom:1px solid #dbe2ea;padding-bottom:6px}.meta{color:#64748b;font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid #dbe2ea;border-radius:9px;padding:12px}.value{font-size:20px;font-weight:700}.risk{color:${p.riskLevel==='critical'?'#dc2626':p.riskLevel==='high'?'#ea580c':'#ca8a04'}}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #dbe2ea;padding:8px;text-align:left}th{background:#f1f5f9}li{margin:5px 0}.notice{margin-top:24px;padding:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:12px}@media print{body{margin:18px}.no-print{display:none}}</style></head><body><h1>MPLADS AI Monitor — Project Risk Report</h1><div class="meta">Generated ${new Date(report.generatedAt).toLocaleString('en-IN')} · Dataset: ${esc(report.datasetName)} · Report ID: ${esc(report.id)}</div><h2>Project identity</h2><div class="grid"><div class="card"><div class="meta">Project ID</div><div class="value">${esc(p.projectId)}</div></div><div class="card"><div class="meta">Risk score</div><div class="value risk">${p.riskScore}/100</div></div><div class="card"><div class="meta">Risk level</div><div class="value risk">${esc(p.riskLevel.toUpperCase())}</div></div><div class="card"><div class="meta">State</div><div>${esc(p.state||'—')}</div></div><div class="card"><div class="meta">District</div><div>${esc(p.district||'—')}</div></div><div class="card"><div class="meta">Constituency / MP</div><div>${esc(p.constituency||'—')} / ${esc(p.mpName||'—')}</div></div><div class="card"><div class="meta">Implementing agency</div><div>${esc(p.agency||'—')}</div></div><div class="card"><div class="meta">Sanctioned amount</div><div>${money(p.sanctionedAmount)}</div></div><div class="card"><div class="meta">Expenditure</div><div>${money(p.expenditure)}</div></div></div><h2>Why this project was flagged</h2><p><strong>Primary trigger:</strong> ${esc(report.triggerType)}</p><ul>${reasons}</ul><h2>Risk-factor evidence</h2><table><thead><tr><th>Factor</th><th>Score</th><th>Evidence / reason</th></tr></thead><tbody>${factors}</tbody></table><h2>Recommended review actions</h2><ol>${actions || '<li>Review project records and supporting evidence.</li>'}</ol><h2>Source record</h2><table><tbody>${Object.entries(report.raw).slice(0,40).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table><div class="notice"><strong>Human review safeguard:</strong> This report records a potential fraud/anomaly risk signal. It does not establish fraud, misconduct or criminality. Verify the underlying records before enforcement or financial action.</div></body></html>`;
}
