/**
 * dataNormalizer.ts
 *
 * Converts mapped raw dataset rows into a clean canonical representation.
 *
 * IMPORTANT:
 * - Raw source data is never modified.
 * - Original source row number is preserved.
 * - Empty values become null.
 * - Currency and numeric values become numbers.
 * - Dates become YYYY-MM-DD.
 * - Text values are trimmed.
 *
 * Pipeline:
 *
 * Raw Row
 *   ↓
 * Column Mapping
 *   ↓
 * Canonical Row
 *   ↓
 * Normalization
 *   ↓
 * Validation
 */

import type { RawRow, ColumnMapping } from '../types/dataset';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NormalizedValue =
  | string
  | number
  | boolean
  | null;

export type NormalizedRow = Record<string, NormalizedValue>;

// ── Numeric fields ────────────────────────────────────────────────────────────

const NUMERIC_FIELDS = new Set([
  'source_row_number',
  'latitude',
  'longitude',
  'allocated_amount',
  'estimated_cost',
  'sanctioned_cost',
  'sanctioned_amount',
  'amount_released',
  'amount_disbursed',
  'expenditure',
  'final_cost',
  'physical_progress',
  'financial_progress',
]);

// ── Date fields ──────────────────────────────────────────────────────────────

const DATE_FIELDS = new Set([
  'recommendation_date',
  'sanction_date',
  'start_date',
  'expected_completion_date',
  'expected_completion',
  'actual_completion_date',
  'actual_completion',
]);

// ── Text fields ───────────────────────────────────────────────────────────────

const TEXT_FIELDS = new Set([
  'project_id',
  'project_name',
  'work_description',
  'description',
  'state',
  'district',
  'constituency',
  'mp_name',
  'house',
  'tenure',
  'work_category',
  'sub_category',
  'asset_type',
  'implementing_agency',
  'agency',
  'status',
  'image',
  'document',
  'source_dataset',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert empty/whitespace values to null.
 */
function normalizeEmpty(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (
      trimmed === '' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'n/a' ||
      trimmed.toLowerCase() === 'na' ||
      trimmed === '-'
    ) {
      return null;
    }

    return trimmed;
  }

  return value;
}

/**
 * Parse a numeric value.
 *
 * Handles values such as:
 *
 * "₹ 3,00,000"
 * "₹3,00,000"
 * "300000"
 * "3,00,000"
 * " 300000 "
 */
function normalizeNumber(value: unknown): number | null {
  const normalized = normalizeEmpty(value);

  if (normalized === null) {
    return null;
  }

  if (typeof normalized === 'number') {
    return Number.isFinite(normalized)
      ? normalized
      : null;
  }

  if (typeof normalized !== 'string') {
    return null;
  }

  const cleaned = normalized
    .replace(/₹/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/%/g, '');

  if (cleaned === '') {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}

/**
 * Normalize dates to YYYY-MM-DD.
 *
 * Supported examples:
 * - 05-Sep-2024
 * - 05/09/2024
 * - 05-09-2024
 * - 2024-09-05
 * - JavaScript Date-compatible strings
 */
function normalizeDate(value: unknown): string | null {
  const normalized = normalizeEmpty(value);

  if (normalized === null) {
    return null;
  }

  if (normalized instanceof Date) {
    if (Number.isNaN(normalized.getTime())) {
      return null;
    }

    return normalized.toISOString().slice(0, 10);
  }

  if (typeof normalized !== 'string') {
    return null;
  }

  const valueString = normalized.trim();

  // Already YYYY-MM-DD
  const isoMatch = valueString.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (isoMatch) {
    return isValidDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    )
      ? valueString
      : null;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const numericMatch = valueString.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);

    if (!isValidDate(year, month, day)) {
      return null;
    }

    return formatDate(year, month, day);
  }

  // DD-MMM-YYYY / DD-Month-YYYY
  const monthMatch = valueString.match(
    /^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{4})$/,
  );

  if (monthMatch) {
    const day = Number(monthMatch[1]);
    const month = parseMonth(monthMatch[2]);
    const year = Number(monthMatch[3]);

    if (
      month === null ||
      !isValidDate(year, month, day)
    ) {
      return null;
    }

    return formatDate(year, month, day);
  }

  // Last fallback
  const parsed = new Date(valueString);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseMonth(value: string): number | null {
  const month = value.toLowerCase().slice(0, 3);

  const months: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  return months[month] ?? null;
}

function isValidDate(
  year: number,
  month: number,
  day: number,
): boolean {
  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatDate(
  year: number,
  month: number,
  day: number,
): string {
  return [
    year.toString().padStart(4, '0'),
    month.toString().padStart(2, '0'),
    day.toString().padStart(2, '0'),
  ].join('-');
}

/**
 * Normalize text.
 */
function normalizeText(value: unknown): string | null {
  const normalized = normalizeEmpty(value);

  if (normalized === null) {
    return null;
  }

  return String(normalized)
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Value normalization ──────────────────────────────────────────────────────

function normalizeValue(
  canonicalField: string,
  value: unknown,
): NormalizedValue {
  if (NUMERIC_FIELDS.has(canonicalField)) {
    return normalizeNumber(value);
  }

  if (DATE_FIELDS.has(canonicalField)) {
    return normalizeDate(value);
  }

  if (TEXT_FIELDS.has(canonicalField)) {
    return normalizeText(value);
  }

  // Generic fallback
  const normalized = normalizeEmpty(value);

  if (
    normalized === null ||
    typeof normalized === 'string' ||
    typeof normalized === 'number' ||
    typeof normalized === 'boolean'
  ) {
    return normalized as NormalizedValue;
  }

  return String(normalized);
}

// ── Row normalization ─────────────────────────────────────────────────────────

/**
 * Convert one raw row into a canonical normalized row.
 */
export function normalizeRow(
  rawRow: RawRow,
  mappings: ColumnMapping[],
  rowIndex: number,
): NormalizedRow {
  const normalizedRow: NormalizedRow = {};

  for (const mapping of mappings) {
    if (!mapping.canonicalField) {
      continue;
    }

    const sourceColumn = mapping.originalColumn;
    const canonicalField = mapping.canonicalField;

    const rawValue = rawRow[sourceColumn];

    normalizedRow[canonicalField] =
      normalizeValue(
        canonicalField,
        rawValue,
      );
  }

  // Always preserve source row information.
  if (
    normalizedRow.source_row_number === null ||
    normalizedRow.source_row_number === undefined
  ) {
    normalizedRow.source_row_number =
      rowIndex + 1;
  }

  return normalizedRow;
}

/**
 * Normalize the complete dataset.
 */
export function normalizeDataset(
  rows: RawRow[],
  mappings: ColumnMapping[],
): NormalizedRow[] {
  return rows.map((row, index) =>
    normalizeRow(
      row,
      mappings,
      index,
    ),
  );
}

