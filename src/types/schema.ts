// ─── Field Status ─────────────────────────────────────────────────────────────

export type FieldStatus =
  | 'required'
  | 'recommended'
  | 'optional';


// ─── Expected Data Type ────────────────────────────────────────────────────────

export type ExpectedDataType =
  | 'text'
  | 'numeric'
  | 'date'
  | 'percent'
  | 'boolean';


// ─── Canonical Field ──────────────────────────────────────────────────────────

export interface CanonicalField {
  key: string;

  label: string;

  group: string;

  status: FieldStatus;

  description: string;

  expectedType: ExpectedDataType;

  /**
   * Alternative names that may appear in uploaded datasets.
   */
  aliases: string[];

  /**
   * Whether multiple source columns may map to this field.
   */
  unique: boolean;
}


// ─── Schema Validation Summary ────────────────────────────────────────────────

export interface SchemaValidationSummary {
  requiredPresent: string[];

  requiredMissing: string[];

  recommendedPresent: string[];

  recommendedMissing: string[];

  optionalPresent: string[];

  optionalMissing: string[];

  totalMapped: number;

  totalFields: number;

  canImport: boolean;
}