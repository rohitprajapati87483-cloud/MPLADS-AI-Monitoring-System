/**
 * fileParser.ts
 *
 * Parses File objects (CSV, XLSX, XLS, JSON) into arrays of raw row objects.
 *
 * SERVICE CONTRACT — To replace with a backend API:
 *   Change the implementation of `parseFile()` to POST the file to your
 *   API endpoint and return the JSON response. The types remain unchanged.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { RawRow } from '../types/dataset';

export type SupportedFileType = 'csv' | 'xlsx' | 'xls' | 'json';

export type FileParseErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'EMPTY_FILE'
  | 'PARSE_ERROR'
  | 'INVALID_JSON'
  | 'NOT_TABULAR'
  | 'ENCODING_ERROR';

export class FileParseError extends Error {
  code: FileParseErrorCode;
  constructor(message: string, code: FileParseErrorCode) {
    super(message);
    this.name = 'FileParseError';
    this.code = code;
  }
}

/** Detect file type from extension */
export function detectFileType(fileName: string): SupportedFileType | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  if (ext === 'json') return 'json';
  return null;
}

/** Validate file before parsing */
export function validateFile(file: File): void {
  const type = detectFileType(file.name);
  if (!type) {
    throw new FileParseError(
      `Unsupported file format. Please upload a CSV, XLSX, XLS, or JSON file.`,
      'UNSUPPORTED_FORMAT',
    );
  }
  if (file.size === 0) {
    throw new FileParseError('The uploaded file is empty.', 'EMPTY_FILE');
  }
  // 50 MB limit
  if (file.size > 50 * 1024 * 1024) {
    throw new FileParseError(
      'File is too large. Maximum supported size is 50 MB.',
      'PARSE_ERROR',
    );
  }
}

/** Read file as ArrayBuffer */
function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
    reader.onerror = () => reject(new FileParseError('Failed to read file.', 'ENCODING_ERROR'));
    reader.readAsArrayBuffer(file);
  });
}

/** Read file as text */
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = () => reject(new FileParseError('Failed to read file.', 'ENCODING_ERROR'));
    reader.readAsText(file, 'UTF-8');
  });
}

/** Parse CSV using PapaParse */
async function parseCSV(file: File): Promise<RawRow[]> {
  const text = await readAsText(file);
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new FileParseError(
      'Could not parse CSV. Please ensure the file is properly formatted.',
      'PARSE_ERROR',
    );
  }

  if (result.data.length === 0) {
    throw new FileParseError(
      'The CSV file contains no data rows.',
      'EMPTY_FILE',
    );
  }

  return result.data;
}

/** Parse XLSX/XLS using SheetJS */
async function parseExcel(file: File): Promise<RawRow[]> {
  const buffer = await readAsArrayBuffer(file);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    throw new FileParseError(
      'Unable to open the Excel file. The file may be corrupted.',
      'PARSE_ERROR',
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new FileParseError('The Excel file contains no sheets.', 'EMPTY_FILE');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: null,
    blankrows: false,
    raw: false,
  });

  if (rows.length === 0) {
    throw new FileParseError(
      'The Excel file contains no data rows.',
      'EMPTY_FILE',
    );
  }

  return rows;
}

/** Parse JSON */
async function parseJSON(file: File): Promise<RawRow[]> {
  const text = await readAsText(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new FileParseError(
      'Invalid JSON format. Please ensure the file is valid JSON.',
      'INVALID_JSON',
    );
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new FileParseError('The JSON file contains an empty array.', 'EMPTY_FILE');
    }
    if (typeof parsed[0] !== 'object' || parsed[0] === null) {
      throw new FileParseError(
        'JSON must be an array of objects (tabular data).',
        'NOT_TABULAR',
      );
    }
    return parsed as RawRow[];
  }

  // Handle {data: [...]} wrapper
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    if (arrayKey) {
      return obj[arrayKey] as RawRow[];
    }
  }

  throw new FileParseError(
    'The JSON file does not contain readable tabular data.',
    'NOT_TABULAR',
  );
}

/**
 * Main parse function.
 * Returns raw rows and detected column names.
 *
 * BACKEND REPLACEMENT POINT:
 *   Replace this with:
 *   const formData = new FormData();
 *   formData.append('file', file);
 *   const res = await fetch('/api/parse', { method: 'POST', body: formData });
 *   return res.json(); // { rows, columns }
 */
export async function parseFile(file: File): Promise<{ rows: RawRow[]; columns: string[] }> {
  validateFile(file);
  const type = detectFileType(file.name)!;

  let rows: RawRow[];
  if (type === 'csv') rows = await parseCSV(file);
  else if (type === 'xlsx' || type === 'xls') rows = await parseExcel(file);
  else rows = await parseJSON(file);

  // Normalize: ensure all rows have the same keys as the first row
  const columns = rows.length > 0
    ? Object.keys(rows[0]).map((k) => String(k).trim()).filter(Boolean)
    : [];

  // Trim string values
  const normalized = rows.map((row) => {
    const out: RawRow = {};
    for (const col of columns) {
      const v = row[col];
      out[col] = typeof v === 'string' ? v.trim() : v;
    }
    return out;
  });

  return { rows: normalized, columns };
}
