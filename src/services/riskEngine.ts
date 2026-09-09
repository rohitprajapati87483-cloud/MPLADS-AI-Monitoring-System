import type { DuplicateGroup, ParsedDataset, RawRow } from '@/types/dataset';
import type { RiskLevel, ProjectStatus } from '@/types';

/**
 * Explainable MPLADS risk engine.
 *
 * Important: a risk score is a screening signal, not proof of fraud.
 * The engine uses only fields that are actually present in the loaded dataset.
 * When sanctioned/expected/progress fields are unavailable, it falls back to
 * peer benchmarking and explicitly explains the limitation.
 */

export interface RiskFactor {
  id: 'cost' | 'progress' | 'delay' | 'duplicate' | 'compliance' | 'agency';
  label: string;
  score: number;
  max: number;
  reason?: string;
}

export interface ProjectRisk {
  rowIndex: number;
  projectId: string;
  projectName: string;
  state: string;
  district: string;
  constituency: string;
  mpName: string;
  agency: string;
  sanctionedAmount: number | null;
  expenditure: number | null;
  progress: number | null;
  status: ProjectStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  reasons: string[];
  recommendations: string[];
}

export interface RiskSummary {
  projects: number;
  totalSanctioned: number;
  totalReleased: number;
  totalExpenditure: number;
  utilizationPercent: number | null;
  highRisk: number;
  criticalRisk: number;
  delayed: number;
  duplicateRows: number;
  alerts: number;
  riskDistribution: { name: string; value: number }[];
  anomalyCounts: Record<'cost' | 'delay' | 'fund' | 'progress' | 'duplicate' | 'payment' | 'agency', number>;
  financialQuarter: { name: string; Sanctioned: number; Released: number; Expenditure: number }[];
  topProjects: ProjectRisk[];
  states: string[];
  districts: string[];
  constituencies: string[];
  mps: string[];
  agencies: string[];
  statuses: string[];
  financialYears: string[];
  modelVersion: string;
}

export interface RiskAnalysisResult extends RiskSummary {
  projectRisks: ProjectRisk[];
}

type Row = RawRow & Record<string, unknown>;

const MODEL_VERSION = 'MPLADS-XRisk-1.0';

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[₹$€£,%\s,]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string => String(v ?? '').trim();
const normalize = (v: unknown): string => str(v).toLowerCase().replace(/\s+/g, ' ').trim();

const date = (v: unknown): Date | null => {
  const s = str(v);
  if (!s) return null;
  const native = new Date(s);
  if (!Number.isNaN(native.getTime())) return native;

  const m = s.match(/^(\d{1,2})[-\/]([A-Za-z]{3,9})[-\/](\d{4})$/);
  if (!m) return null;
  const parsed = new Date(`${m[1]} ${m[2]} ${m[3]}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

const statusOf = (row: Row): ProjectStatus => {
  const s = normalize(row.status);
  if (s.includes('delay')) return 'delayed';
  if (s.includes('complete')) return 'completed';
  if (s.includes('sanction')) return 'sanctioned';
  if (s.includes('pending')) return 'pending';
  return 'in-progress';
};

const levelOf = (score: number): RiskLevel =>
  score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

function duplicateRowSet(groups: DuplicateGroup[]): Set<number> {
  const set = new Set<number>();
  for (const group of groups) for (const index of group.rowIndices) set.add(index);
  return set;
}

function financialAmount(row: Row): number | null {
  return num(row.expenditure ?? row.amount_disbursed ?? row.amount_released);
}

function sanctionedAmount(row: Row): number | null {
  return num(row.sanctioned_cost ?? row.sanctioned_amount);
}

function peerKey(row: Row): string {
  const category = normalize(row.work_category ?? row.workCategory) || 'all';
  const state = normalize(row.state) || 'all';
  return `${category}|${state}`;
}

interface Benchmark {
  peerAmounts: Map<string, number[]>;
  peerP95: Map<string, number>;
  agencyStats: Map<string, { count: number; delayed: number; amounts: number[] }>;
  globalDelayedRate: number;
}

function buildBenchmark(rows: Row[]): Benchmark {
  const peerAmounts = new Map<string, number[]>();
  const agencyStats = new Map<string, { count: number; delayed: number; amounts: number[] }>();
  let delayed = 0;

  rows.forEach((row) => {
    const amount = financialAmount(row);
    if (amount !== null && amount >= 0) {
      const key = peerKey(row);
      const values = peerAmounts.get(key) ?? [];
      values.push(amount);
      peerAmounts.set(key, values);
    }

    const agency = normalize(row.implementing_agency ?? row.agency);
    if (agency) {
      const stat = agencyStats.get(agency) ?? { count: 0, delayed: 0, amounts: [] };
      stat.count += 1;
      if (statusOf(row) === 'delayed') {
        stat.delayed += 1;
        delayed += 1;
      }
      if (amount !== null) stat.amounts.push(amount);
      agencyStats.set(agency, stat);
    } else if (statusOf(row) === 'delayed') {
      delayed += 1;
    }
  });

  const peerP95 = new Map<string, number>();
  peerAmounts.forEach((values, key) => {
    const p95 = percentile(values, 0.95);
    if (p95 !== null) peerP95.set(key, p95);
  });

  return {
    peerAmounts,
    peerP95,
    agencyStats,
    globalDelayedRate: rate(delayed, rows.length),
  };
}

function factorCost(row: Row, benchmark: Benchmark): RiskFactor {
  const estimated = num(row.estimated_cost);
  const sanctioned = sanctionedAmount(row);
  const expenditure = financialAmount(row);

  let score = 0;
  const reasons: string[] = [];

  if (sanctioned !== null && expenditure !== null && sanctioned > 0) {
    const overrun = ((expenditure - sanctioned) / sanctioned) * 100;
    if (overrun > 25) {
      score = 25;
      reasons.push(`Reported expenditure is ${overrun.toFixed(1)}% above sanctioned cost.`);
    } else if (overrun > 15) {
      score = 20;
      reasons.push(`Reported expenditure is ${overrun.toFixed(1)}% above sanctioned cost.`);
    } else if (overrun > 5) {
      score = 10;
      reasons.push(`Reported expenditure is ${overrun.toFixed(1)}% above sanctioned cost.`);
    }
  }

  if (estimated !== null && sanctioned !== null && estimated > 0) {
    const variance = ((sanctioned - estimated) / estimated) * 100;
    if (variance > 25) {
      score = Math.max(score, 12);
      reasons.push(`Sanctioned cost is ${variance.toFixed(1)}% above the estimate.`);
    } else if (variance > 10) {
      score = Math.max(score, 6);
      reasons.push(`Sanctioned cost is ${variance.toFixed(1)}% above the estimate.`);
    }
  }
  if (estimated !== null && sanctioned === null && expenditure !== null && estimated > 0) {
    const overEstimate = ((expenditure - estimated) / estimated) * 100;
    if (overEstimate > 25) {
      score = Math.max(score, 18);
      reasons.push(`Reported expenditure is ${overEstimate.toFixed(1)}% above the estimated cost.`);
    } else if (overEstimate > 10) {
      score = Math.max(score, 8);
      reasons.push(`Reported expenditure is ${overEstimate.toFixed(1)}% above the estimated cost.`);
    }
  }

  // Actual MPLADS portal extracts may contain only Amount Disbursed. In that
  // case, benchmark the amount against similar works instead of inventing a
  // sanctioned-cost comparison.
  if (expenditure !== null && (sanctionedAmount(row) === null && estimated === null)) {
    const key = peerKey(row);
    const peers = benchmark.peerAmounts.get(key) ?? [];
    const p95 = benchmark.peerP95.get(key);
    if (peers.length >= 10 && p95 !== undefined && expenditure > p95) {
      const percentileRank = rate(peers.filter(v => v <= expenditure).length, peers.length);
      if (percentileRank >= 0.99) score = Math.max(score, 20);
      else if (percentileRank >= 0.95) score = Math.max(score, 15);
      else score = Math.max(score, 10);
      reasons.push(`Disbursed amount is unusually high for similar works in the same state/category (above the peer 95th percentile).`);
    }
  }

  return {
    id: 'cost',
    label: 'Cost anomaly',
    score: clamp(score, 0, 25),
    max: 25,
    reason: reasons.length ? reasons.join(' ') : undefined,
  };
}

function factorProgress(row: Row): RiskFactor {
  let physical = num(row.physical_progress);
  let financial = num(row.financial_progress);

  // If explicit financial progress is unavailable, derive it only when a
  // sanctioned amount and expenditure are available.
  if (financial === null) {
    const sanctioned = sanctionedAmount(row);
    const expenditure = financialAmount(row);
    if (sanctioned !== null && expenditure !== null && sanctioned > 0) {
      financial = clamp((expenditure / sanctioned) * 100, 0, 150);
    }
  }

  if (physical === null || financial === null) {
    return { id: 'progress', label: 'Progress mismatch', score: 0, max: 20 };
  }

  const gap = financial - physical;
  let score = 0;
  if (gap > 40) score = 20;
  else if (gap > 30) score = 15;
  else if (gap > 20) score = 8;

  return {
    id: 'progress',
    label: 'Progress mismatch',
    score,
    max: 20,
    reason: score ? `Financial progress is ${gap.toFixed(1)} percentage points ahead of physical progress.` : undefined,
  };
}

function factorDelay(row: Row): RiskFactor {
  const expected = date(row.expected_completion_date ?? row.expected_completion);
  const actual = date(row.actual_completion_date ?? row.actual_completion ?? row.completion_date);
  const today = new Date();
  let score = 0;
  let reason: string | undefined;

  if (expected && actual && actual > expected) {
    const days = Math.ceil((actual.getTime() - expected.getTime()) / 86400000);
    score = days > 180 ? 20 : days > 90 ? 15 : 10;
    reason = `Actual completion was ${days} days after the expected completion date.`;
  } else if (expected && !actual && expected < today) {
    const days = Math.floor((today.getTime() - expected.getTime()) / 86400000);
    score = days > 180 ? 20 : days > 90 ? 15 : 10;
    reason = `Expected completion date was exceeded by ${days} days.`;
  } else if (normalize(row.status).includes('delay')) {
    score = 15;
    reason = 'The source record explicitly marks this work as delayed.';
  }

  return { id: 'delay', label: 'Delay anomaly', score, max: 20, reason };
}

function factorDuplicate(rowIndex: number, duplicateRows: Set<number>): RiskFactor {
  const score = duplicateRows.has(rowIndex) ? 20 : 0;
  return {
    id: 'duplicate',
    label: 'Duplicate risk',
    score,
    max: 20,
    reason: score ? 'This record belongs to a duplicate/similarity review group.' : undefined,
  };
}

function factorCompliance(row: Row, validationIssueCount: number): RiskFactor {
  let score = 0;
  const reasons: string[] = [];

  if (!str(row.work_description ?? row.description)) {
    score += 4;
    reasons.push('Work description is missing.');
  }
  if (!str(row.image) && !str(row.document)) {
    score += 4;
    reasons.push('No project evidence image/document is available.');
  }
  if (financialAmount(row) === null) {
    score += 2;
    reasons.push('No financial amount is available for screening.');
  }
  if (validationIssueCount > 0) score += Math.min(2, validationIssueCount);

  return {
    id: 'compliance',
    label: 'Compliance/data quality',
    score: clamp(score, 0, 10),
    max: 10,
    reason: reasons.length ? reasons.join(' ') : validationIssueCount ? 'Validation issues were detected for this record.' : undefined,
  };
}

function factorAgency(row: Row, benchmark: Benchmark): RiskFactor {
  const agency = normalize(row.implementing_agency ?? row.agency);
  if (!agency) return { id: 'agency', label: 'Agency anomaly', score: 0, max: 5 };

  const stat = benchmark.agencyStats.get(agency);
  if (!stat || stat.count < 5) return { id: 'agency', label: 'Agency anomaly', score: 0, max: 5 };

  const agencyDelayRate = rate(stat.delayed, stat.count);
  const peerDelayGap = agencyDelayRate - benchmark.globalDelayedRate;
  if (peerDelayGap >= 0.25) {
    return {
      id: 'agency',
      label: 'Agency anomaly',
      score: 5,
      max: 5,
      reason: `This agency's delayed-work rate is ${(peerDelayGap * 100).toFixed(1)} percentage points above the dataset baseline.`,
    };
  }

  return { id: 'agency', label: 'Agency anomaly', score: 0, max: 5 };
}

function recommendations(factors: RiskFactor[]): string[] {
  const out: string[] = [];
  for (const f of factors) {
    if (!f.reason) continue;
    if (f.id === 'cost') out.push('Review sanctioned/estimated cost, disbursement and supporting financial records.');
    if (f.id === 'progress') out.push('Verify reported physical progress against financial utilization and site evidence.');
    if (f.id === 'delay') out.push('Review the implementation timeline and obtain an updated completion plan.');
    if (f.id === 'duplicate') out.push('Compare the flagged record with related works before taking further action.');
    if (f.id === 'compliance') out.push('Complete missing documentation and resolve data-quality issues.');
    if (f.id === 'agency') out.push('Review the agency\'s delay pattern and compare it with similar implementing agencies.');
  }
  return [...new Set(out)];
}

export function analyzeDataset(dataset: ParsedDataset): RiskAnalysisResult {
  const rows = dataset.rows as Row[];
  const duplicateRows = duplicateRowSet(dataset.duplicateGroups ?? []);
  const benchmark = buildBenchmark(rows);

  // ValidationIssue currently has no row index. Use a deliberately small
  // dataset-level quality signal rather than pretending it belongs to a row.
  const issueSignal = dataset.validationIssues.reduce((n, i) => n + i.affectedRows, 0);
  const validationPerRow = issueSignal > 0 ? Math.min(2, Math.ceil(issueSignal / Math.max(rows.length, 1) * 10)) : 0;

  let totalSanctioned = 0;
  let totalReleased = 0;
  let totalExpenditure = 0;
  let delayed = 0;
  const projectRisks: ProjectRisk[] = [];
  const counts = { cost: 0, delay: 0, fund: 0, progress: 0, duplicate: 0, payment: 0, agency: 0 };
  const quarters = new Map<string, { Sanctioned: number; Released: number; Expenditure: number }>();
  const sets = {
    states: new Set<string>(),
    districts: new Set<string>(),
    constituencies: new Set<string>(),
    mps: new Set<string>(),
    agencies: new Set<string>(),
    statuses: new Set<string>(),
    financialYears: new Set<string>(),
  };

  rows.forEach((row, index) => {
    const sanctioned = sanctionedAmount(row);
    const released = num(row.amount_released ?? row.amount_disbursed);
    const expenditure = financialAmount(row);

    if (sanctioned !== null) totalSanctioned += sanctioned;
    if (released !== null) totalReleased += released;
    if (expenditure !== null) totalExpenditure += expenditure;

    const status = statusOf(row);
    if (status === 'delayed') delayed++;

    const factors = [
      factorCost(row, benchmark),
      factorProgress(row),
      factorDelay(row),
      factorDuplicate(index, duplicateRows),
      factorCompliance(row, validationPerRow),
      factorAgency(row, benchmark),
    ];

    const score = clamp(factors.reduce((sum, f) => sum + f.score, 0), 0, 100);
    const reasons = factors.filter(f => f.reason).map(f => f.reason as string);
    const level = levelOf(score);

    if (factors[0].score > 0) counts.cost++;
    if (factors[1].score > 0) counts.progress++;
    if (factors[2].score > 0) counts.delay++;
    if (factors[3].score > 0) counts.duplicate++;
    if (factors[5].score > 0) counts.agency++;
    if (factors[0].score >= 18 && expenditure !== null) counts.payment++;
    if (released !== null && sanctioned !== null && sanctioned > 0 && released > sanctioned * 1.05) counts.fund++;

    const state = str(row.state);
    const district = str(row.district);
    const constituency = str(row.constituency);
    const mp = str(row.mp_name);
    const agency = str(row.implementing_agency ?? row.agency);
    if (state) sets.states.add(state);
    if (district) sets.districts.add(district);
    if (constituency) sets.constituencies.add(constituency);
    if (mp) sets.mps.add(mp);
    if (agency) sets.agencies.add(agency);
    sets.statuses.add(status);

    const start = date(row.start_date);
    if (start) {
      const fyStart = start.getMonth() >= 3 ? start.getFullYear() : start.getFullYear() - 1;
      sets.financialYears.add(`${fyStart}-${String(fyStart + 1).slice(-2)}`);
      const q = `Q${Math.floor(start.getMonth() / 3) + 1}`;
      const bucket = quarters.get(q) ?? { Sanctioned: 0, Released: 0, Expenditure: 0 };
      bucket.Sanctioned += sanctioned ?? 0;
      bucket.Released += released ?? 0;
      bucket.Expenditure += expenditure ?? 0;
      quarters.set(q, bucket);
    }

    projectRisks.push({
      rowIndex: index,
      projectId: str(row.project_id) || str(row.source_row_number) || `ROW-${index + 1}`,
      projectName: str(row.project_name) || str(row.work) || `Project ${index + 1}`,
      state,
      district,
      constituency,
      mpName: mp,
      agency,
      sanctionedAmount: sanctioned,
      expenditure,
      progress: num(row.physical_progress ?? row.financial_progress),
      status,
      riskScore: score,
      riskLevel: level,
      factors,
      reasons,
      recommendations: recommendations(factors),
    });
  });

  projectRisks.sort((a, b) => b.riskScore - a.riskScore || a.projectName.localeCompare(b.projectName));
  const distribution = (['low', 'medium', 'high', 'critical'] as RiskLevel[]).map(level => ({
    name: level[0].toUpperCase() + level.slice(1),
    value: projectRisks.filter(p => p.riskLevel === level).length,
  }));
  const highRisk = projectRisks.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length;
  const criticalRisk = projectRisks.filter(p => p.riskLevel === 'critical').length;
  const alerts = projectRisks.filter(p => p.riskScore >= 50).length;

  return {
    projects: rows.length,
    totalSanctioned,
    totalReleased,
    totalExpenditure,
    utilizationPercent: totalSanctioned > 0 ? (totalExpenditure / totalSanctioned) * 100 : null,
    highRisk,
    criticalRisk,
    delayed,
    duplicateRows: duplicateRows.size,
    alerts,
    riskDistribution: distribution,
    anomalyCounts: counts,
    financialQuarter: ['Q1', 'Q2', 'Q3', 'Q4'].map(name => ({
      name,
      ...(quarters.get(name) ?? { Sanctioned: 0, Released: 0, Expenditure: 0 }),
    })),
    topProjects: projectRisks.slice(0, 25),
    projectRisks,
    states: [...sets.states].sort(),
    districts: [...sets.districts].sort(),
    constituencies: [...sets.constituencies].sort(),
    mps: [...sets.mps].sort(),
    agencies: [...sets.agencies].sort(),
    statuses: [...sets.statuses].sort(),
    financialYears: [...sets.financialYears].sort(),
    modelVersion: MODEL_VERSION,
  };
}
