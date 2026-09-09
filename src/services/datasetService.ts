/**
 * datasetService.ts
 *
 * Facade service that orchestrates the full dataset processing pipeline.
 *
 * Pipeline:
 *
 * File
 *   ↓
 * parseFile
 *   ↓
 * profileColumns
 *   ↓
 * mapColumns
 *   ↓
 * normalizeDataset
 *   ↓
 * validateDataset
 *   ↓
 * detectDuplicates
 *   ↓
 * generateCleaningSuggestions
 *   ↓
 * qualityScore
 *   ↓
 * ParsedDataset
 *
 * BACKEND REPLACEMENT POINT:
 * Replace `processDataset()` with an API call while keeping
 * the same return type.
 */

import {
  normalizeDataset,
} from './dataNormalizer';

import { parseFile } from './fileParser';

import {
  profileColumns,
  generateCleaningSuggestions,
} from './datasetProfiler';

import { mapColumns } from './schemaMapper';

import { validateDataset } from './dataValidator';

import {
  detectDuplicates,
} from './duplicateDetector';

import { CANONICAL_FIELDS } from '../data/canonicalSchema';

import type {
  ParsedDataset,
  DataQualityScore,
  DatasetHistoryItem,
} from '../types/dataset';


// ─────────────────────────────────────────────────────────────────────────────
// Quality scoring
// ─────────────────────────────────────────────────────────────────────────────

function computeQualityScore(
  dataset: Pick<
    ParsedDataset,
    | 'columnProfiles'
    | 'columnMappings'
    | 'validationIssues'
    | 'totalRows'
  >,
): DataQualityScore {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Completeness
  // ──────────────────────────────────────────────────────────────────────────

  const avgMissing =
    dataset.columnProfiles.length > 0
      ? dataset.columnProfiles.reduce(
          (sum, profile) =>
            sum + profile.missingPercent,
          0,
        ) / dataset.columnProfiles.length
      : 0;

  const completeness = Math.max(
    0,
    Math.round(100 - avgMissing),
  );


  // ──────────────────────────────────────────────────────────────────────────
  // 2. Uniqueness
  // ──────────────────────────────────────────────────────────────────────────

  const duplicateIssue =
    dataset.validationIssues.find(
      (issue) =>
        issue.rule === 'DUPLICATE_PROJECT_ID',
    );

  const duplicatePenalty = duplicateIssue
    ? Math.min(
        30,
        Math.round(
          (duplicateIssue.affectedRows /
            (dataset.totalRows || 1)) *
            100,
        ),
      )
    : 0;

  const uniqueness = Math.max(
    0,
    100 - duplicatePenalty,
  );


  // ──────────────────────────────────────────────────────────────────────────
  // 3. Validity
  // ──────────────────────────────────────────────────────────────────────────

  const errorCount =
    dataset.validationIssues.filter(
      (issue) =>
        issue.severity === 'error',
    ).length;

  const warningCount =
    dataset.validationIssues.filter(
      (issue) =>
        issue.severity === 'warning',
    ).length;

  const validity = Math.max(
    0,
    100 -
      errorCount * 10 -
      warningCount * 3,
  );


  // ──────────────────────────────────────────────────────────────────────────
  // 4. Consistency
  // ──────────────────────────────────────────────────────────────────────────

  const mixedColumns =
    dataset.columnProfiles.filter(
      (profile) =>
        profile.detectedType === 'mixed',
    ).length;

  const consistency = Math.max(
    0,
    100 - mixedColumns * 8,
  );


  // ──────────────────────────────────────────────────────────────────────────
  // 5. Required field coverage
  // ──────────────────────────────────────────────────────────────────────────

  const requiredKeys =
    CANONICAL_FIELDS
      .filter(
        (field) =>
          field.status === 'required',
      )
      .map(
        (field) =>
          field.key,
      );

  const mappedRequired =
    requiredKeys.filter(
      (key) =>
        dataset.columnMappings.some(
          (mapping) =>
            mapping.canonicalField === key &&
            mapping.action === 'accept',
        ),
    ).length;

  const requiredFields =
    requiredKeys.length > 0
      ? Math.round(
          (mappedRequired /
            requiredKeys.length) *
            100,
        )
      : 100;


  // ──────────────────────────────────────────────────────────────────────────
  // Overall quality score
  // ──────────────────────────────────────────────────────────────────────────

  const overall = Math.round(
    completeness * 0.25 +
      uniqueness * 0.2 +
      validity * 0.3 +
      consistency * 0.1 +
      requiredFields * 0.15,
  );


  // ──────────────────────────────────────────────────────────────────────────
  // Grade
  // ──────────────────────────────────────────────────────────────────────────

  const grade: DataQualityScore['grade'] =
    overall >= 90
      ? 'Excellent'
      : overall >= 75
        ? 'Good'
        : overall >= 55
          ? 'Fair'
          : 'Poor';


  return {
    overall,
    grade,

    factors: {
      completeness,
      uniqueness,
      validity,
      consistency,
      requiredFields,
    },
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// ID generator
// ─────────────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `ds_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}


function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dataset processing function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full dataset processing pipeline.
 *
 * BACKEND REPLACEMENT POINT:
 *
 * const formData = new FormData();
 * formData.append('file', file);
 *
 * const response = await fetch(
 *   '/api/datasets',
 *   {
 *     method: 'POST',
 *     body: formData,
 *   },
 * );
 *
 * return response.json() as ParsedDataset;
 */

export async function processDataset(
  file: File,
): Promise<ParsedDataset> {

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Parse
  // ═══════════════════════════════════════════════════════════════════════════

  const {
    rows,
    columns,
  } = await parseFile(file);
  await yieldToBrowser();


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Profile columns
  // ═══════════════════════════════════════════════════════════════════════════

  const columnProfiles =
    profileColumns(
      rows,
      columns,
    );
  await yieldToBrowser();


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Map columns to canonical schema
  // ═══════════════════════════════════════════════════════════════════════════

  const columnMappings =
    mapColumns(columns);
  await yieldToBrowser();


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — Normalize data
  //
  // Raw rows are NOT modified.
  //
  // Example:
  //
  // "₹448,127"
  //      ↓
  // 448127
  //
  // "05-Sep-2024"
  //      ↓
  // "2024-09-05"
  //
  // "" / "N/A" / "-"
  //      ↓
  // null
  // ═══════════════════════════════════════════════════════════════════════════

  const normalizedRows =
    normalizeDataset(
      rows,
      columnMappings,
    );
  await yieldToBrowser();


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — Validate normalized data
  // ═══════════════════════════════════════════════════════════════════════════

  const validationIssues =
    validateDataset(
      normalizedRows,
      columnMappings,
    );
  await yieldToBrowser();


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6 — Detect duplicates
  //
  // Detection levels:
  //
  //   1. Exact duplicates
  //   2. Strong duplicates
  //   3. Potential duplicates
  //
  // IMPORTANT:
  // A duplicate is NOT automatically fraud.
  // It means the record requires review.
  // ═══════════════════════════════════════════════════════════════════════════

  const duplicateDetection =
    detectDuplicates(
      normalizedRows,
    );

  const {
    duplicateGroups,
  } = duplicateDetection;
  await yieldToBrowser();


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7 — Generate cleaning suggestions
  // ═══════════════════════════════════════════════════════════════════════════

  const cleaningSuggestions =
    generateCleaningSuggestions(
      normalizedRows,
      columnProfiles,
    );
  await yieldToBrowser();


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8 — Compute quality score
  // ═══════════════════════════════════════════════════════════════════════════

  const qualityScore =
    computeQualityScore({
      columnProfiles,
      columnMappings,
      validationIssues,
      totalRows:
        normalizedRows.length,
    });


  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 9 — Return processed dataset
  // ═══════════════════════════════════════════════════════════════════════════

  return {

    // Dataset identity
    id: generateId(),

    // File information
    fileName: file.name,

    fileSize: file.size,

    fileType:
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() ??
      'unknown',

    uploadedAt:
      new Date().toISOString(),


    // ────────────────────────────────────────────────────────────────────────
    // Normalized dataset
    // ────────────────────────────────────────────────────────────────────────

    rows: normalizedRows,


    // ────────────────────────────────────────────────────────────────────────
    // Original source columns
    //
    // These are kept so the UI can display:
    //
    // Work
    // State
    // Amount Disbursed
    // etc.
    // ────────────────────────────────────────────────────────────────────────

    columns,


    // Dataset dimensions
    totalRows:
      normalizedRows.length,

    totalColumns:
      columns.length,


    // Processing results
    columnProfiles,

    columnMappings,

    validationIssues,


    // ────────────────────────────────────────────────────────────────────────
    // Duplicate detection results
    //
    // Unlike the previous implementation, this contains the actual
    // row indices for every duplicate group.
    // ────────────────────────────────────────────────────────────────────────

    duplicateGroups,


    // Cleaning recommendations
    cleaningSuggestions,


    // Quality score
    qualityScore,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Dataset History
// ─────────────────────────────────────────────────────────────────────────────
//
// localStorage-backed history.
//
// Can later be replaced with backend API calls.
// ─────────────────────────────────────────────────────────────────────────────

const HISTORY_KEY =
  'mplads_dataset_history';


// ─────────────────────────────────────────────────────────────────────────────
// Get history
// ─────────────────────────────────────────────────────────────────────────────

export function getDatasetHistory():
  DatasetHistoryItem[] {

  try {

    const raw =
      localStorage.getItem(
        HISTORY_KEY,
      );

    return raw
      ? (JSON.parse(
          raw,
        ) as DatasetHistoryItem[])
      : [];

  } catch {

    return [];

  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Save dataset to history
// ─────────────────────────────────────────────────────────────────────────────

export function saveDatasetToHistory(
  dataset: ParsedDataset,
): void {

  const history =
    getDatasetHistory();


  const item: DatasetHistoryItem = {

    id:
      dataset.id,

    fileName:
      dataset.fileName,

    uploadedAt:
      dataset.uploadedAt,

    rows:
      dataset.totalRows,

    columns:
      dataset.totalColumns,

    quality:
      dataset.qualityScore.overall,

    status:
      'ready',

    mappedFields:
      dataset.columnMappings.filter(
        (mapping) =>
          mapping.action === 'accept',
      ).length,

    totalFields:
      CANONICAL_FIELDS.length,
  };


  // Keep the latest 10 datasets.
  const updated = [
    item,
    ...history,
  ].slice(0, 10);


  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(
      updated,
    ),
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Delete dataset from history
// ─────────────────────────────────────────────────────────────────────────────

export function deleteDatasetFromHistory(
  id: string,
): void {

  const history =
    getDatasetHistory().filter(
      (item) =>
        item.id !== id,
    );


  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(
      history,
    ),
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Mark dataset as imported
// ─────────────────────────────────────────────────────────────────────────────

export function markDatasetImported(
  id: string,
): void {

  const history =
    getDatasetHistory().map(
      (item) =>
        item.id === id
          ? {
              ...item,
              status:
                'imported' as const,
            }
          : item,
    );


  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(
      history,
    ),
  );
}