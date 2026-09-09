// ─── Raw Data Row ─────────────────────────────────────────────────────────────
export type RawRow = Record<string, string | number | boolean | null>;

// ─── Detected Column Type ─────────────────────────────────────────────────────
export type ColumnDataType = 'text' | 'numeric' | 'date' | 'boolean' | 'mixed' | 'empty';

// ─── Column Profile ───────────────────────────────────────────────────────────
export interface ColumnProfile {
  name: string;
  detectedType: ColumnDataType;
  totalValues: number;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  examples: string[];
  min?: number | string;
  max?: number | string;
  validationStatus: 'valid' | 'warning' | 'invalid';
  validationMessage?: string;
}

// ─── Column Mapping ───────────────────────────────────────────────────────────
export type MappingAction = 'accept' | 'change' | 'ignore' | 'unmapped';

export interface ColumnMapping {
  originalColumn: string;
  canonicalField: string | null; // null = unmapped/ignored
  confidence: number;            // 0–100
  action: MappingAction;
  isUserOverride: boolean;
}

// ─── Validation Issue ─────────────────────────────────────────────────────────
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  column?: string;
  rule: string;
  message: string;
  affectedRows: number;
  examples?: string[];
}

// ─── Duplicate Record ─────────────────────────────────────────────────────────
export interface DuplicateGroup {
  key: string;
  rowIndices: number[];
  count: number;
}

// ─── Cleaning Suggestion ─────────────────────────────────────────────────────
export interface CleaningSuggestion {
  id: string;
  column?: string;
  type: 'trim' | 'normalize_case' | 'normalize_date' | 'to_numeric' | 'remove_duplicates' | 'normalize_percent' | 'other';
  detected: string;
  suggestedFix: string;
  affectedRows: number;
  preview?: string;
  applied: boolean;
}

// ─── Data Quality Score ───────────────────────────────────────────────────────
export interface DataQualityScore {
  overall: number;               // 0–100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: {
    completeness: number;        // missing value penalty
    uniqueness: number;          // duplicate penalty
    validity: number;            // type/format validity
    consistency: number;         // cross-field consistency
    requiredFields: number;      // required canonical field coverage
  };
}

// ─── Parsed Dataset ───────────────────────────────────────────────────────────
export interface ParsedDataset {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  rows: RawRow[];
  columns: string[];
  totalRows: number;
  totalColumns: number;
  columnProfiles: ColumnProfile[];
  columnMappings: ColumnMapping[];
  validationIssues: ValidationIssue[];
  duplicateGroups: DuplicateGroup[];
  cleaningSuggestions: CleaningSuggestion[];
  qualityScore: DataQualityScore;
}

// ─── Dataset History Item ─────────────────────────────────────────────────────
export type DatasetStatus = 'uploaded' | 'processing' | 'ready' | 'imported' | 'failed';

export interface DatasetHistoryItem {
  id: string;
  fileName: string;
  uploadedAt: string;
  rows: number;
  columns: number;
  quality: number;
  status: DatasetStatus;
  mappedFields?: number;
  totalFields?: number;
}

// ─── Workflow Step ────────────────────────────────────────────────────────────
export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface WorkflowStepDef {
  step: WorkflowStep;
  label: string;
  description: string;
}
