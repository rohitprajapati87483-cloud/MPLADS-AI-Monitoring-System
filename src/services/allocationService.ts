import Papa from 'papaparse';
import type { ParsedDataset, RawRow } from '@/types/dataset';

export interface AllocationRecord {
  srNo: number;
  state: string;
  mpName: string;
  constituency: string;
  allocatedAmount: number;
}

export interface ConstituencyAllocation {
  key: string;
  state: string;
  constituency: string;
  mpName: string;
  allocated: number;
  sanctioned: number;
  expenditure: number;
  projectCount: number;
  highRiskProjects: number;
  utilization: number;
  remaining: number;
  matched: boolean;
}

const clean = (value: unknown) => String(value ?? '').trim();
const norm = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const num = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(clean(value).replace(/[₹,%\s,]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const keyFor = (state: unknown, constituency: unknown) => `${norm(state)}::${norm(constituency)}`;

export async function loadAllocationRecords(): Promise<AllocationRecord[]> {
  const response = await fetch('/mplads_allocations.csv');
  if (!response.ok) throw new Error('Allocation dataset could not be loaded.');
  const text = await response.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return parsed.data.slice(1).map((r) => ({
    srNo: Number(r[0]) || 0,
    state: clean(r[1]),
    mpName: clean(r[2]),
    constituency: clean(r[3]),
    allocatedAmount: num(r[4]),
  })).filter(r => r.state && r.constituency && r.allocatedAmount > 0);
}

export function buildConstituencyAllocations(dataset: ParsedDataset, allocations: AllocationRecord[]): ConstituencyAllocation[] {
  const grouped = new Map<string, ConstituencyAllocation>();
  const allocationMap = new Map(allocations.map(a => [keyFor(a.state, a.constituency), a]));

  for (const row of dataset.rows as RawRow[]) {
    const state = clean(row.state);
    const constituency = clean(row.constituency);
    if (!state || !constituency) continue;
    const key = keyFor(state, constituency);
    const existing = grouped.get(key) ?? {
      key,
      state,
      constituency,
      mpName: clean(row.mp_name),
      allocated: 0,
      sanctioned: 0,
      expenditure: 0,
      projectCount: 0,
      highRiskProjects: 0,
      utilization: 0,
      remaining: 0,
      matched: false,
    };
    const sanctioned = num(row.sanctioned_cost ?? row.sanctioned_amount ?? row.estimated_cost);
    const expenditure = num(row.expenditure ?? row.amount_disbursed);
    existing.sanctioned += sanctioned;
    existing.expenditure += expenditure;
    existing.projectCount += 1;
    grouped.set(key, existing);
  }

  for (const a of allocations) {
    const key = keyFor(a.state, a.constituency);
    const existing = grouped.get(key) ?? {
      key,
      state: a.state,
      constituency: a.constituency,
      mpName: a.mpName,
      allocated: 0,
      sanctioned: 0,
      expenditure: 0,
      projectCount: 0,
      highRiskProjects: 0,
      utilization: 0,
      remaining: 0,
      matched: false,
    };
    existing.allocated = a.allocatedAmount;
    existing.mpName = a.mpName || existing.mpName;
    existing.matched = existing.projectCount > 0;
    existing.utilization = existing.allocated > 0 ? (existing.expenditure / existing.allocated) * 100 : 0;
    existing.remaining = existing.allocated - existing.expenditure;
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .map(r => ({ ...r, utilization: r.allocated > 0 ? (r.expenditure / r.allocated) * 100 : 0, remaining: r.allocated - r.expenditure }))
    .sort((a, b) => b.allocated - a.allocated);
}
