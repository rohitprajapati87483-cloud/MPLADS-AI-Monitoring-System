/** Optimized MPLADS validator: one main row pass + one IQR sort. */
import type { RawRow, ColumnMapping, ValidationIssue } from '../types/dataset';
import { CANONICAL_FIELDS, CANONICAL_FIELD_MAP } from '../data/canonicalSchema';
import { isDate } from './datasetProfiler';

let issueCounter = 0;
const nextId = () => `issue_${++issueCounter}`;

function isMissing(v: unknown): boolean { return v === null || v === undefined || String(v).trim() === ''; }
function toNumber(v: unknown): number | null {
  if (isMissing(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[₹$€£,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function toDate(v: unknown): Date | null {
  if (isMissing(v)) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
function getCol(key: string, mappings: ColumnMapping[]): string | null {
  return mappings.find(m => m.canonicalField === key && m.action === 'accept')?.originalColumn ?? null;
}
function add(issues: ValidationIssue[], severity: ValidationIssue['severity'], rule: string, message: string, affectedRows: number, column?: string, examples?: string[]) {
  if (!affectedRows) return;
  issues.push({ id: nextId(), severity, rule, message, affectedRows, ...(column ? { column } : {}), ...(examples?.length ? { examples } : {}) });
}

export function validateDataset(rows: RawRow[], mappings: ColumnMapping[]): ValidationIssue[] {
  issueCounter = 0;
  const issues: ValidationIssue[] = [];
  if (!rows.length) return issues;

  const cols: Record<string, string | null> = {};
  for (const key of [
    'project_id','estimated_cost','sanctioned_cost','expenditure','amount_disbursed',
    'physical_progress','financial_progress','recommendation_date','sanction_date','start_date',
    'expected_completion_date','actual_completion_date','status','image','work_description',
  ]) cols[key] = getCol(key, mappings);

  const required = CANONICAL_FIELDS.filter(f => f.status === 'required')
    .map(f => ({ field: f, col: getCol(f.key, mappings) }))
    .filter((x): x is { field: typeof x.field; col: string } => !!x.col);

  const counts: Record<string, number> = {};
  const examples: Record<string, string[]> = {};
  const invalidNumeric: Record<string, number> = {};
  const negative: Record<string, number> = {};
  const invalidProgress: Record<string, number> = {};
  const invalidDate: Record<string, number> = {};
  const missingRequired: Record<string, number> = {};
  const idCounts = new Map<string, number>();
  const sanctionedValues: number[] = [];

  const inc = (obj: Record<string, number>, key: string, ex?: unknown) => {
    obj[key] = (obj[key] ?? 0) + 1;
    if (ex !== undefined && (examples[key]?.length ?? 0) < 3) (examples[key] ??= []).push(String(ex));
  };

  const today = new Date(); today.setHours(23,59,59,999);
  let expectedBeforeStart = 0, actualBeforeStart = 0, futureActual = 0;
  let sanctionedAboveEstimated = 0, expenditureAboveSanctioned = 0, disbursedAboveSanctioned = 0;
  let financialPhysicalMismatch = 0, delayed = 0, completedIncomplete = 0, completedNoImage = 0, missingDescription = 0;
  let expectedEx: string[] = [], actualEx: string[] = [], futureEx: string[] = [], mismatchEx: string[] = [];
  const duplicateIds = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (cols.project_id) {
      const v = row[cols.project_id];
      if (!isMissing(v)) {
        const k = String(v).trim().toLowerCase();
        idCounts.set(k, (idCounts.get(k) ?? 0) + 1);
      }
    }

    for (const key of ['estimated_cost','sanctioned_cost','expenditure','amount_disbursed']) {
      const col = cols[key]; if (!col) continue;
      const raw = row[col];
      if (isMissing(raw)) continue;
      const n = toNumber(raw);
      if (n === null) inc(invalidNumeric, key, raw);
      else if (n < 0) inc(negative, key, raw);
      if (key === 'sanctioned_cost' && n !== null && n >= 0) sanctionedValues.push(n);
    }

    for (const key of ['physical_progress','financial_progress']) {
      const col = cols[key]; if (!col) continue;
      const raw = row[col]; if (isMissing(raw)) continue;
      const n = toNumber(raw);
      if (n === null || n < 0 || n > 100) inc(invalidProgress, key, raw);
    }

    for (const key of ['recommendation_date','sanction_date','start_date','expected_completion_date','actual_completion_date']) {
      const col = cols[key]; if (!col) continue;
      const raw = row[col]; if (isMissing(raw)) continue;
      if (!isDate(String(raw)) && !toDate(raw)) inc(invalidDate, key, raw);
    }

    const start = cols.start_date ? toDate(row[cols.start_date]) : null;
    const expected = cols.expected_completion_date ? toDate(row[cols.expected_completion_date]) : null;
    const actual = cols.actual_completion_date ? toDate(row[cols.actual_completion_date]) : null;
    const estimated = cols.estimated_cost ? toNumber(row[cols.estimated_cost]) : null;
    const sanctioned = cols.sanctioned_cost ? toNumber(row[cols.sanctioned_cost]) : null;
    const expenditure = cols.expenditure ? toNumber(row[cols.expenditure]) : null;
    const disbursed = cols.amount_disbursed ? toNumber(row[cols.amount_disbursed]) : null;
    const physical = cols.physical_progress ? toNumber(row[cols.physical_progress]) : null;
    const financial = cols.financial_progress ? toNumber(row[cols.financial_progress]) : null;

    if (start && expected && expected < start) { expectedBeforeStart++; if (expectedEx.length < 3) expectedEx.push(String(i+1)); }
    if (start && actual && actual < start) { actualBeforeStart++; if (actualEx.length < 3) actualEx.push(String(i+1)); }
    if (actual && actual > today) { futureActual++; if (futureEx.length < 3) futureEx.push(String(i+1)); }
    if (estimated !== null && sanctioned !== null && sanctioned > estimated * 1.05) sanctionedAboveEstimated++;
    if (sanctioned !== null && expenditure !== null && expenditure > sanctioned * 1.05) expenditureAboveSanctioned++;
    if (sanctioned !== null && disbursed !== null && disbursed > sanctioned * 1.05) disbursedAboveSanctioned++;
    if (physical !== null && financial !== null && financial - physical >= 30) { financialPhysicalMismatch++; if (mismatchEx.length < 3) mismatchEx.push(String(i+1)); }
    if (expected && actual && actual > expected) delayed++;

    const status = cols.status ? String(row[cols.status] ?? '').trim().toLowerCase() : '';
    if (status.includes('completed') && physical !== null && physical < 100) completedIncomplete++;
    if (status.includes('completed') && cols.image && isMissing(row[cols.image])) completedNoImage++;
    if (cols.work_description && isMissing(row[cols.work_description])) missingDescription++;

    for (const { field, col } of required) if (isMissing(row[col])) missingRequired[field.key] = (missingRequired[field.key] ?? 0) + 1;
  }

  if (cols.project_id) {
    let dup = 0; const ex: string[] = [];
    for (const [id, count] of idCounts) if (count > 1) { dup += count - 1; if (ex.length < 3) ex.push(id); }
    add(issues,'warning','DUPLICATE_PROJECT_ID',`${dup} duplicate Project IDs found.`,dup,cols.project_id,ex);
  }

  for (const key of ['estimated_cost','sanctioned_cost','expenditure','amount_disbursed']) {
    const col = cols[key]; if (!col) continue; const label = CANONICAL_FIELD_MAP[key]?.label ?? col;
    add(issues,'error','NON_NUMERIC_VALUE',`${invalidNumeric[key] ?? 0} rows in "${label}" contain non-numeric values.`,invalidNumeric[key] ?? 0,col,examples[key]);
    add(issues,'error','NEGATIVE_FINANCIAL_VALUE',`${negative[key] ?? 0} rows in "${label}" contain negative financial values.`,negative[key] ?? 0,col,examples[key]);
  }
  for (const key of ['physical_progress','financial_progress']) {
    const col = cols[key]; if (!col) continue; const label = CANONICAL_FIELD_MAP[key]?.label ?? col;
    add(issues,'error','INVALID_PERCENTAGE',`${invalidProgress[key] ?? 0} rows in "${label}" have values outside the valid range (0–100).`,invalidProgress[key] ?? 0,col,examples[key]);
  }
  for (const key of ['recommendation_date','sanction_date','start_date','expected_completion_date','actual_completion_date']) {
    const col = cols[key]; if (!col) continue; const label = CANONICAL_FIELD_MAP[key]?.label ?? col;
    add(issues,'error','INVALID_DATE',`${invalidDate[key] ?? 0} rows in "${label}" contain unrecognised date values.`,invalidDate[key] ?? 0,col,examples[key]);
  }
  add(issues,'error','EXPECTED_COMPLETION_BEFORE_START',`${expectedBeforeStart} rows have an expected completion date before the start date.`,expectedBeforeStart,undefined,expectedEx);
  add(issues,'error','ACTUAL_COMPLETION_BEFORE_START',`${actualBeforeStart} rows have an actual completion date before the start date.`,actualBeforeStart,undefined,actualEx);
  add(issues,'warning','FUTURE_COMPLETION_DATE',`${futureActual} rows have an actual completion date in the future.`,futureActual,cols.actual_completion_date ?? undefined, futureEx);
  add(issues,'warning','SANCTIONED_EXCEEDS_ESTIMATED',`${sanctionedAboveEstimated} rows have sanctioned cost more than 5% above estimated cost. These entries should be reviewed.`,sanctionedAboveEstimated);
  add(issues,'warning','EXPENDITURE_EXCEEDS_SANCTIONED',`${expenditureAboveSanctioned} rows have expenditure exceeding sanctioned cost by more than 5%.`,expenditureAboveSanctioned);
  add(issues,'warning','DISBURSED_EXCEEDS_SANCTIONED',`${disbursedAboveSanctioned} rows have amount disbursed exceeding sanctioned cost by more than 5%.`,disbursedAboveSanctioned);
  add(issues,'warning','FINANCIAL_PHYSICAL_MISMATCH',`${financialPhysicalMismatch} rows have financial progress at least 30 percentage points above physical progress.`,financialPhysicalMismatch,undefined,mismatchEx);
  add(issues,'warning','PROJECT_COMPLETION_DELAY',`${delayed} rows were completed after their expected completion date.`,delayed);
  add(issues,'warning','COMPLETED_WITH_INCOMPLETE_PROGRESS',`${completedIncomplete} projects are marked completed but have physical progress below 100%.`,completedIncomplete);
  add(issues,'warning','COMPLETED_PROJECT_MISSING_IMAGE',`${completedNoImage} completed projects do not have image evidence.`,completedNoImage,cols.image ?? undefined);
  add(issues,'info','MISSING_WORK_DESCRIPTION',`${missingDescription} rows are missing a work description.`,missingDescription,cols.work_description ?? undefined);

  if (sanctionedValues.length >= 10 && cols.sanctioned_cost) {
    sanctionedValues.sort((a,b)=>a-b);
    const q = (p:number) => { const x=(sanctionedValues.length-1)*p,l=Math.floor(x),u=Math.ceil(x); return l===u?sanctionedValues[l]:sanctionedValues[l]+(sanctionedValues[u]-sanctionedValues[l])*(x-l); };
    const upper = q(.75) + 1.5*(q(.75)-q(.25));
    let outliers = 0; for (const v of sanctionedValues) if (v > upper) outliers++;
    add(issues,'warning','STATISTICAL_COST_OUTLIER',`${outliers} projects have sanctioned costs above the statistical upper outlier threshold and should be reviewed.`,outliers,cols.sanctioned_cost);
  }

  for (const { field, col } of required) add(issues,'warning','MISSING_VALUES_IN_REQUIRED',`${missingRequired[field.key] ?? 0} rows are missing values in the required field "${field.label}".`,missingRequired[field.key] ?? 0,col);
  return issues;
}
