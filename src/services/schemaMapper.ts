/**
 * schemaMapper.ts
 *
 * Semantic column-name → canonical-field mapping.
 *
 * STEP 3B:
 * - Adds deterministic mappings for the actual MPLADS dataset columns.
 * - Adds deterministic mappings for synthetic AI-demo fields.
 * - Keeps generic semantic/fuzzy mapping as a fallback.
 * - Leaves IDA unmapped until its meaning is verified.
 *
 * BACKEND REPLACEMENT POINT:
 * Replace with: POST /api/map-columns { columns: string[] }
 * The response shape (ColumnMapping[]) remains unchanged.
 */

import { CANONICAL_FIELDS } from '../data/canonicalSchema';
import type { ColumnMapping } from '../types/dataset';

// ── Normalization ─────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// ── MPLADS deterministic mappings ────────────────────────────────────────────
//
// normalizeKey() removes punctuation, spaces, symbols and parentheses.
//
// Examples:
//
// "Sr. No." → "srno"
// "Amount Disbursed ( ₹ )" → "amountdisbursed"
// "Estimated Cost (₹) [Synthetic Demo]" →
// "estimatedcostsyntheticdemo"

const MPLADS_EXACT_MAPPINGS: Record<string, string> = {
  // ── Actual MPLADS fields ──────────────────────────────────────────────────

  srno: 'source_row_number',

  workcategory: 'work_category',

  work: 'project_name',

  state: 'state',

  workdescription: 'work_description',

  honblemembersofparliament: 'mp_name',

  constituency: 'constituency',

  image: 'image',

  completiondate: 'actual_completion_date',

  amountdisbursed: 'amount_disbursed',

  // ── Synthetic AI-demo fields ──────────────────────────────────────────────
  //
  // These fields are synthetic/enriched demo fields and are mapped to
  // canonical financial/progress/date fields for AI prototyping.

  estimatedcostsyntheticdemo: 'estimated_cost',

  sanctionedcostsyntheticdemo: 'sanctioned_cost',

  expendituresyntheticdemo: 'expenditure',

  startdatesyntheticdemo: 'start_date',

  expectedcompletiondatesyntheticdemo:
    'expected_completion_date',

  physicalprogresssyntheticdemo:
    'physical_progress',

  financialprogresssyntheticdemo:
    'financial_progress',

  projectstatussyntheticdemo: 'status',
};

// IDA is intentionally excluded.
//
// We do NOT yet know whether IDA means:
// - Implementing Agency
// - District Authority
// - another administrative identifier
//
// Therefore it must not be automatically mapped to
// implementing_agency.

const MPLADS_UNMAPPED = new Set([
  'ida',
]);

// ── Levenshtein distance ──────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from(
    { length: m + 1 },
    (_, i) =>
      Array.from(
        { length: n + 1 },
        (_, j) =>
          i === 0
            ? j
            : j === 0
              ? i
              : 0,
      ),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 +
            Math.min(
              dp[i - 1][j],
              dp[i][j - 1],
              dp[i - 1][j - 1],
            );
    }
  }

  return dp[m][n];
}

function levenshteinSimilarity(
  a: string,
  b: string,
): number {
  const maxLen = Math.max(a.length, b.length);

  if (maxLen === 0) return 100;

  return Math.round(
    ((maxLen - levenshtein(a, b)) / maxLen) * 100,
  );
}

// ── Mapping candidate ─────────────────────────────────────────────────────────

interface MappingCandidate {
  canonicalKey: string;
  confidence: number;
}

// ── Deterministic MPLADS matching ────────────────────────────────────────────

function findMPLADSMatch(
  columnName: string,
): MappingCandidate | null {
  const keySource = normalizeKey(columnName);

  // Explicitly keep uncertain columns unmapped.
  if (MPLADS_UNMAPPED.has(keySource)) {
    return null;
  }

  const canonicalKey =
    MPLADS_EXACT_MAPPINGS[keySource];

  if (!canonicalKey) {
    return null;
  }

  return {
    canonicalKey,
    confidence: 100,
  };
}

// ── Generic semantic matching ─────────────────────────────────────────────────

function findBestMatch(
  columnName: string,
): MappingCandidate | null {
  const normSource = normalize(columnName);
  const keySource = normalizeKey(columnName);

  let best: MappingCandidate | null = null;

  for (const field of CANONICAL_FIELDS) {
    let confidence = 0;

    // ────────────────────────────────────────────────────────────────────────
    // 1. Exact normalized match with canonical key/label
    // ────────────────────────────────────────────────────────────────────────

    if (
      normalizeKey(field.key) === keySource ||
      normalizeKey(field.label) === keySource
    ) {
      confidence = 100;
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Alias exact matches
    // ────────────────────────────────────────────────────────────────────────

    if (confidence < 95) {
      for (const alias of field.aliases) {
        const normAlias = normalize(alias);
        const keyAlias = normalizeKey(alias);

        if (
          normAlias === normSource ||
          keyAlias === keySource
        ) {
          confidence = Math.max(
            confidence,
            95,
          );
          break;
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Contains / is-contained-by alias
    // ────────────────────────────────────────────────────────────────────────

    if (confidence < 85) {
      for (const alias of field.aliases) {
        const normAlias = normalize(alias);

        if (
          normSource.includes(normAlias) ||
          normAlias.includes(normSource)
        ) {
          const ratio =
            Math.min(
              normSource.length,
              normAlias.length,
            ) /
            Math.max(
              normSource.length,
              normAlias.length,
            );

          confidence = Math.max(
            confidence,
            Math.round(70 + ratio * 22),
          );
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. Levenshtein similarity
    // ────────────────────────────────────────────────────────────────────────

    if (confidence < 70) {
      for (const alias of field.aliases) {
        const sim = levenshteinSimilarity(
          normalizeKey(columnName),
          normalizeKey(alias),
        );

        if (sim > 65) {
          confidence = Math.max(
            confidence,
            Math.round(sim * 0.85),
          );
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Keep strongest candidate
    // ────────────────────────────────────────────────────────────────────────

    if (
      confidence >
      (best?.confidence ?? 0)
    ) {
      best = {
        canonicalKey: field.key,
        confidence,
      };
    }
  }

  // Below 45% = unmapped.
  if (
    !best ||
    best.confidence < 45
  ) {
    return null;
  }

  return best;
}

// ── Main mapping ──────────────────────────────────────────────────────────────

/**
 * Map dataset columns to canonical fields.
 *
 * Priority:
 *
 * 1. Deterministic MPLADS mapping
 * 2. Explicitly unmapped uncertain MPLADS fields
 * 3. Generic semantic mapping
 */
export function mapColumns(
  columns: string[],
): ColumnMapping[] {
  const usedUniqueFields =
    new Set<string>();

  const mappings: ColumnMapping[] = [];

  for (const col of columns) {
    const normalizedColumn =
      normalizeKey(col);

    // ────────────────────────────────────────────────────────────────────────
    // STEP 1: MPLADS deterministic mapping
    // ────────────────────────────────────────────────────────────────────────

    const mpladsMatch =
      findMPLADSMatch(col);

    if (mpladsMatch) {
      const field =
        CANONICAL_FIELDS.find(
          (f) =>
            f.key ===
            mpladsMatch.canonicalKey,
        );

      if (field) {
        // Prevent duplicate mapping for unique fields.
        if (
          field.unique &&
          usedUniqueFields.has(
            mpladsMatch.canonicalKey,
          )
        ) {
          mappings.push({
            originalColumn: col,
            canonicalField: null,
            confidence:
              mpladsMatch.confidence,
            action: 'unmapped',
            isUserOverride: false,
          });

          continue;
        }

        if (field.unique) {
          usedUniqueFields.add(
            mpladsMatch.canonicalKey,
          );
        }

        mappings.push({
          originalColumn: col,
          canonicalField:
            mpladsMatch.canonicalKey,
          confidence:
            mpladsMatch.confidence,
          action: 'accept',
          isUserOverride: false,
        });

        continue;
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2: Explicitly unmapped MPLADS fields
    // ────────────────────────────────────────────────────────────────────────

    if (
      MPLADS_UNMAPPED.has(
        normalizedColumn,
      )
    ) {
      mappings.push({
        originalColumn: col,
        canonicalField: null,
        confidence: 0,
        action: 'unmapped',
        isUserOverride: false,
      });

      continue;
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: Generic semantic mapping
    // ────────────────────────────────────────────────────────────────────────

    const match =
      findBestMatch(col);

    if (!match) {
      mappings.push({
        originalColumn: col,
        canonicalField: null,
        confidence: 0,
        action: 'unmapped',
        isUserOverride: false,
      });

      continue;
    }

    const field =
      CANONICAL_FIELDS.find(
        (f) =>
          f.key ===
          match.canonicalKey,
      )!;

    // Prevent duplicate mapping for unique fields.
    if (
      field.unique &&
      usedUniqueFields.has(
        match.canonicalKey,
      )
    ) {
      mappings.push({
        originalColumn: col,
        canonicalField: null,
        confidence:
          match.confidence,
        action: 'unmapped',
        isUserOverride: false,
      });

      continue;
    }

    if (field.unique) {
      usedUniqueFields.add(
        match.canonicalKey,
      );
    }

    mappings.push({
      originalColumn: col,
      canonicalField:
        match.canonicalKey,
      confidence:
        match.confidence,
      action:
        match.confidence >= 70
          ? 'accept'
          : 'unmapped',
      isUserOverride: false,
    });
  }

  return mappings;
}