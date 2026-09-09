/** Fast, single-pass dataset profiling for large MPLADS files. */
import type { RawRow, ColumnProfile, ColumnDataType, CleaningSuggestion } from '../types/dataset';

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/,
  /^\d{2}[\/\-]\d{2}[\/\-]\d{4}/,
  /^\d{2}[\/\-]\d{2}[\/\-]\d{2}/,
  /^\d{1,2} [A-Za-z]+ \d{4}/,
  /^[A-Za-z]+ \d{1,2},? \d{4}/,
];

export function isDate(value: string): boolean {
  return DATE_PATTERNS.some((p) => p.test(value)) && !Number.isNaN(Date.parse(value));
}

export function isNumeric(value: string): boolean {
  const cleaned = value.replace(/[,₹$€£%\s]/g, '');
  return cleaned !== '' && Number.isFinite(Number(cleaned));
}

function isBoolean(value: string): boolean {
  return ['true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase());
}

function detectValueType(value: unknown): ColumnDataType {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'boolean' || value === true || value === false) return 'boolean';
  if (typeof value === 'number') return Number.isFinite(value) ? 'numeric' : 'empty';
  const str = String(value).trim();
  if (!str) return 'empty';
  if (isBoolean(str)) return 'boolean';
  if (isDate(str)) return 'date';
  if (isNumeric(str)) return 'numeric';
  return 'text';
}

function finalizeType(counts: Record<ColumnDataType, number>, nonEmpty: number): ColumnDataType {
  if (nonEmpty === 0) return 'empty';
  let dominant: ColumnDataType = 'text';
  let max = -1;
  for (const type of ['text', 'numeric', 'date', 'boolean'] as ColumnDataType[]) {
    if (counts[type] > max) { max = counts[type]; dominant = type; }
  }
  return max / nonEmpty >= 0.8 ? dominant : 'mixed';
}

export function profileColumns(rows: RawRow[], columns: string[]): ColumnProfile[] {
  const n = rows.length;
  const state = new Map<string, {
    missing: number;
    nonEmpty: number;
    unique: Set<string>;
    examples: string[];
    exampleSet: Set<string>;
    counts: Record<ColumnDataType, number>;
    trim: number;
    currency: number;
    nonIsoDate: number;
  }>();

  for (const col of columns) {
    state.set(col, {
      missing: 0, nonEmpty: 0, unique: new Set(), examples: [], exampleSet: new Set(),
      counts: { text: 0, numeric: 0, date: 0, boolean: 0, mixed: 0, empty: 0 },
      trim: 0, currency: 0, nonIsoDate: 0,
    });
  }

  for (const row of rows) {
    for (const col of columns) {
      const s = state.get(col)!;
      const value = row[col];
      if (value === null || value === undefined || String(value).trim() === '') {
        s.missing++;
        continue;
      }
      s.nonEmpty++;
      const str = String(value);
      s.unique.add(str);
      if (s.examples.length < 3 && !s.exampleSet.has(str)) { s.exampleSet.add(str); s.examples.push(str); }
      if (typeof value === 'string' && value !== value.trim()) s.trim++;
      if (typeof value === 'string' && /[₹$€£,]/.test(value) && Number.isFinite(Number(value.replace(/[₹$€£,\s]/g, '')))) s.currency++;
      if (typeof value === 'string' && isDate(value) && !/^\d{4}-\d{2}-\d{2}/.test(value)) s.nonIsoDate++;
      const type = detectValueType(value);
      if (type !== 'empty') s.counts[type]++;
    }
  }

  return columns.map((col) => {
    const s = state.get(col)!;
    const missingPercent = n ? Number(((s.missing / n) * 100).toFixed(1)) : 0;
    const detectedType = finalizeType(s.counts, s.nonEmpty);
    let validationStatus: ColumnProfile['validationStatus'] = 'valid';
    let validationMessage: string | undefined;
    if (detectedType === 'empty') { validationStatus = 'invalid'; validationMessage = 'Column contains no values.'; }
    else if (missingPercent > 50) { validationStatus = 'warning'; validationMessage = `High missing value rate: ${missingPercent}%`; }
    else if (missingPercent > 20) { validationStatus = 'warning'; validationMessage = `${missingPercent}% values are missing.`; }
    else if (detectedType === 'mixed') { validationStatus = 'warning'; validationMessage = 'Column contains mixed data types.'; }
    return { name: col, detectedType, totalValues: n, missingCount: s.missing, missingPercent, uniqueCount: s.unique.size, examples: s.examples, validationStatus, validationMessage };
  });
}

/** Kept for backward compatibility. Use duplicateDetector for MPLADS duplicate analysis. */
export function findDuplicateRows(rows: RawRow[]): { duplicateCount: number; duplicateRowIndices: Set<number> } {
  const seen = new Set<string>();
  const duplicateRowIndices = new Set<number>();
  rows.forEach((row, i) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) duplicateRowIndices.add(i);
    else seen.add(key);
  });
  return { duplicateCount: duplicateRowIndices.size, duplicateRowIndices };
}

export function generateCleaningSuggestions(rows: RawRow[], profiles: ColumnProfile[]): CleaningSuggestion[] {
  const suggestions: CleaningSuggestion[] = [];
  // Cleaning suggestions are derived from profiles plus one lightweight scan per column.
  for (const profile of profiles) {
    const col = profile.name;
    let trim = 0, currency = 0, nonIso = 0;
    for (const row of rows) {
      const v = row[col];
      if (typeof v !== 'string') continue;
      if (v !== v.trim()) trim++;
      if ((profile.detectedType === 'numeric' || profile.detectedType === 'mixed') && /[₹$€£,]/.test(v) && Number.isFinite(Number(v.replace(/[₹$€£,\s]/g, '')))) currency++;
      if ((profile.detectedType === 'date' || profile.detectedType === 'mixed') && isDate(v) && !/^\d{4}-\d{2}-\d{2}/.test(v)) nonIso++;
    }
    if (trim) suggestions.push({ id: `trim_${col}`, column: col, type: 'trim', detected: `${trim} values with leading/trailing whitespace`, suggestedFix: 'Trim whitespace from all values in this column', affectedRows: trim, preview: 'e.g. "  Rajasthan  " → "Rajasthan"', applied: false });
    if (currency) suggestions.push({ id: `numeric_${col}`, column: col, type: 'to_numeric', detected: `${currency} values with currency symbols or commas`, suggestedFix: 'Remove currency symbols and convert to numeric', affectedRows: currency, preview: 'e.g. "₹2,50,000" → 250000', applied: false });
    if (nonIso) suggestions.push({ id: `date_${col}`, column: col, type: 'normalize_date', detected: `${nonIso} dates in non-standard format`, suggestedFix: 'Normalize all dates to YYYY-MM-DD format', affectedRows: nonIso, preview: 'e.g. "12/04/2025" → "2025-04-12"', applied: false });
  }
  return suggestions;
}
