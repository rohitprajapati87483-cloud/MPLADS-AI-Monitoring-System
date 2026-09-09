import type { CanonicalField } from '../types/schema';

export const CANONICAL_FIELDS: CanonicalField[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // PROJECT IDENTITY
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'project_id',
    label: 'Project ID',
    group: 'Project Identity',
    status: 'recommended',
    description: 'Unique identifier for an MPLADS work/project.',
    expectedType: 'text',
    aliases: [
      'project id',
      'project_id',
      'work id',
      'work no',
      'work number',
      'project no',
      'project number',
      'sr no',
      'serial no',
      'serial number',
      's no',
      'sno',
      'sl no',
      'sl number',
    ],
    unique: true,
  },

  {
    key: 'project_name',
    label: 'Project Name',
    group: 'Project Identity',
    status: 'recommended',
    description: 'Name/title of the MPLADS work.',
    expectedType: 'text',
    aliases: [
      'project name',
      'project_name',
      'work name',
      'name of work',
      'work title',
      'project title',
      'work',
    ],
    unique: false,
  },

  {
    key: 'work_description',
    label: 'Work Description',
    group: 'Project Identity',
    status: 'recommended',
    description: 'Detailed description of the MPLADS work.',
    expectedType: 'text',
    aliases: [
      'work description',
      'work_description',
      'description of work',
      'project description',
      'project details',
      'work details',
      'details of work',
      'particulars',
      'remarks',
      'scope',
      'brief description',
    ],
    unique: false,
  },

  // Backward-compatible legacy field.
  {
    key: 'description',
    label: 'Description (Legacy)',
    group: 'Project Identity',
    status: 'optional',
    description: 'Legacy description field retained for compatibility.',
    expectedType: 'text',
    aliases: [],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GEOGRAPHY
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'state',
    label: 'State / UT',
    group: 'Geography',
    status: 'recommended',
    description: 'State or Union Territory where the work is located.',
    expectedType: 'text',
    aliases: [
      'state',
      'state name',
      'state/ut',
      'state ut',
      'union territory',
      'province',
    ],
    unique: false,
  },

  {
    key: 'district',
    label: 'District',
    group: 'Geography',
    status: 'recommended',
    description: 'District where the work is implemented.',
    expectedType: 'text',
    aliases: [
      'district',
      'district name',
      'dist',
      'dist name',
      'district/city',
    ],
    unique: false,
  },

  {
    key: 'constituency',
    label: 'Constituency',
    group: 'Geography',
    status: 'recommended',
    description: 'Parliamentary constituency associated with the work.',
    expectedType: 'text',
    aliases: [
      'constituency',
      'constituency name',
      'lok sabha constituency',
      'parliament constituency',
      'parliamentary constituency',
      'pc',
    ],
    unique: false,
  },

  {
    key: 'latitude',
    label: 'Latitude',
    group: 'Geography',
    status: 'optional',
    description: 'Latitude of the work location.',
    expectedType: 'numeric',
    aliases: [
      'latitude',
      'lat',
      'geo lat',
      'gps latitude',
    ],
    unique: false,
  },

  {
    key: 'longitude',
    label: 'Longitude',
    group: 'Geography',
    status: 'optional',
    description: 'Longitude of the work location.',
    expectedType: 'numeric',
    aliases: [
      'longitude',
      'long',
      'lon',
      'lng',
      'geo long',
      'gps longitude',
    ],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MP INFORMATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'mp_name',
    label: 'MP Name',
    group: 'MP Information',
    status: 'recommended',
    description: 'Name of the Hon’ble Member of Parliament.',
    expectedType: 'text',
    aliases: [
      'mp name',
      'mp',
      'member of parliament',
      'honble member of parliament',
      "hon'ble members of parliament",
      'honble mp',
      'honourable mp',
      'recommending mp',
      'mp member name',
    ],
    unique: false,
  },

  {
    key: 'house',
    label: 'House',
    group: 'MP Information',
    status: 'optional',
    description: 'Lok Sabha or Rajya Sabha.',
    expectedType: 'text',
    aliases: [
      'house',
      'house type',
      'lok sabha',
      'rajya sabha',
      'ls/rs',
      'parliament house',
    ],
    unique: false,
  },

  {
    key: 'tenure',
    label: 'Tenure',
    group: 'MP Information',
    status: 'optional',
    description: 'Parliamentary tenure associated with the work.',
    expectedType: 'text',
    aliases: [
      'tenure',
      'mp tenure',
      'parliamentary tenure',
      'term',
      'session',
    ],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CLASSIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'work_category',
    label: 'Work Category',
    group: 'Classification',
    status: 'recommended',
    description: 'Category/type of MPLADS work.',
    expectedType: 'text',
    aliases: [
      'work category',
      'work_category',
      'category',
      'work type',
      'type of work',
      'nature of work',
      'scheme type',
      'sector',
    ],
    unique: false,
  },

  {
    key: 'sub_category',
    label: 'Sub Category',
    group: 'Classification',
    status: 'optional',
    description: 'More specific classification of the work.',
    expectedType: 'text',
    aliases: [
      'sub category',
      'subcategory',
      'sub_category',
      'sub type',
      'sub sector',
      'work sub type',
    ],
    unique: false,
  },

  {
    key: 'asset_type',
    label: 'Asset Type',
    group: 'Classification',
    status: 'optional',
    description: 'Type of public asset created or improved.',
    expectedType: 'text',
    aliases: [
      'asset type',
      'asset',
      'type of asset',
      'public asset',
    ],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // IMPLEMENTATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'implementing_agency',
    label: 'Implementing Agency',
    group: 'Implementation',
    status: 'recommended',
    description: 'Agency responsible for implementing the MPLADS work.',
    expectedType: 'text',
    aliases: [
      'implementing agency',
      'implementing_agency',
      'executing agency',
      'execution agency',
      'agency name',
      'department',
      'nodal agency',
    ],
    unique: false,
  },

  {
    key: 'agency',
    label: 'Agency (Legacy)',
    group: 'Implementation',
    status: 'optional',
    description: 'Legacy agency field retained for compatibility.',
    expectedType: 'text',
    aliases: [
      'agency',
      'contractor',
    ],
    unique: false,
  },

  {
    key: 'vendor',
    label: 'Vendor',
    group: 'Implementation',
    status: 'optional',
    description: 'Vendor/contractor associated with implementation or payment.',
    expectedType: 'text',
    aliases: [
      'vendor',
      'vendor name',
      'contractor name',
      'contractor',
      'supplier',
    ],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FINANCIAL
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'allocated_amount',
    label: 'Allocated Amount',
    group: 'Financial',
    status: 'recommended',
    description: 'Amount allocated to the MP/constituency for the relevant period.',
    expectedType: 'numeric',
    aliases: [
      'allocated amount',
      'allocated_amount',
      'allocation',
      'allocation amount',
      'fund allocation',
      'allocated funds',
    ],
    unique: false,
  },

  {
    key: 'estimated_cost',
    label: 'Estimated Cost',
    group: 'Financial',
    status: 'optional',
    description: 'Estimated cost of the work.',
    expectedType: 'numeric',
    aliases: [
      'estimated cost',
      'estimated_cost',
      'estimate',
      'estimated amount',
      'cost estimate',
      'dpr cost',
      'project cost',
      'total estimated cost',
    ],
    unique: false,
  },

  {
    key: 'sanctioned_cost',
    label: 'Sanctioned Cost',
    group: 'Financial',
    status: 'optional',
    description: 'Sanctioned cost of the work.',
    expectedType: 'numeric',
    aliases: [
      'sanctioned cost',
      'sanctioned_cost',
      'sanction cost',
      'cost sanctioned',
      'sanctioned project cost',
    ],
    unique: false,
  },

  {
    key: 'sanctioned_amount',
    label: 'Sanctioned Amount',
    group: 'Financial',
    status: 'optional',
    description: 'Amount sanctioned for the work. Retained for compatibility.',
    expectedType: 'numeric',
    aliases: [
      'sanctioned amount',
      'sanction amount',
      'amount sanctioned',
      'sanctioned',
      'sanction',
      'recommended amount',
      'amount recommended',
    ],
    unique: false,
  },

  {
    key: 'amount_released',
    label: 'Amount Released',
    group: 'Financial',
    status: 'optional',
    description: 'Amount released against the work.',
    expectedType: 'numeric',
    aliases: [
      'amount released',
      'amount_released',
      'released amount',
      'release amount',
      'released',
      'funds released',
    ],
    unique: false,
  },

  {
    key: 'amount_disbursed',
    label: 'Amount Disbursed',
    group: 'Financial',
    status: 'recommended',
    description: 'Amount disbursed/vendor payment released against the work.',
    expectedType: 'numeric',
    aliases: [
      'amount disbursed',
      'amount_disbursed',
      'amount disbursed rupees',
      'disbursed amount',
      'total disbursed',
      'vendor payment',
      'payment released',
    ],
    unique: false,
  },

  {
    key: 'expenditure',
    label: 'Expenditure',
    group: 'Financial',
    status: 'optional',
    description: 'Actual expenditure incurred on the work.',
    expectedType: 'numeric',
    aliases: [
      'expenditure',
      'amount spent',
      'amount utilized',
      'utilized amount',
      'utilisation',
      'utilization',
      'spent',
      'expense',
      'actual expenditure',
    ],
    unique: false,
  },

  {
    key: 'final_cost',
    label: 'Final Cost',
    group: 'Financial',
    status: 'optional',
    description: 'Final/actual cost of the completed work.',
    expectedType: 'numeric',
    aliases: [
      'final cost',
      'final_cost',
      'actual cost',
      'actual project cost',
      'final expenditure',
    ],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DATES / TIMELINE
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'recommendation_date',
    label: 'Recommendation Date',
    group: 'Dates',
    status: 'optional',
    description: 'Date on which the MP recommended the work.',
    expectedType: 'date',
    aliases: [
      'recommendation date',
      'recommendation_date',
      'recommended date',
      'mp recommendation date',
      'date of recommendation',
    ],
    unique: false,
  },

  {
    key: 'sanction_date',
    label: 'Sanction Date',
    group: 'Dates',
    status: 'optional',
    description: 'Date on which the work was sanctioned.',
    expectedType: 'date',
    aliases: [
      'sanction date',
      'sanction_date',
      'date of sanction',
      'sanctioned date',
      'sanction order date',
    ],
    unique: false,
  },

  {
    key: 'start_date',
    label: 'Start Date',
    group: 'Dates',
    status: 'optional',
    description: 'Date on which work commenced.',
    expectedType: 'date',
    aliases: [
      'start date',
      'start_date',
      'commencement date',
      'date of start',
      'work start date',
      'date started',
    ],
    unique: false,
  },

  {
    key: 'expected_completion_date',
    label: 'Expected Completion Date',
    group: 'Dates',
    status: 'optional',
    description: 'Expected/target completion date.',
    expectedType: 'date',
    aliases: [
      'expected completion',
      'expected completion date',
      'expected_completion_date',
      'due date',
      'target completion',
      'target date',
      'scheduled completion',
    ],
    unique: false,
  },

  // Legacy compatibility.
  {
    key: 'expected_completion',
    label: 'Expected Completion (Legacy)',
    group: 'Dates',
    status: 'optional',
    description: 'Legacy expected completion field.',
    expectedType: 'date',
    aliases: [],
    unique: false,
  },

  {
    key: 'actual_completion_date',
    label: 'Actual Completion Date',
    group: 'Dates',
    status: 'recommended',
    description: 'Actual date on which the work was completed.',
    expectedType: 'date',
    aliases: [
      'actual completion',
      'actual completion date',
      'actual_completion_date',
      'date of completion',
      'completed date',
      'completion date',
      'completion actual',
    ],
    unique: false,
  },

  // Legacy compatibility.
  {
    key: 'actual_completion',
    label: 'Actual Completion (Legacy)',
    group: 'Dates',
    status: 'optional',
    description: 'Legacy actual completion field.',
    expectedType: 'date',
    aliases: [],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRESS
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'physical_progress',
    label: 'Physical Progress (%)',
    group: 'Progress',
    status: 'optional',
    description: 'Physical progress of the work from 0 to 100 percent.',
    expectedType: 'percent',
    aliases: [
      'physical progress',
      'physical_progress',
      'physical progress %',
      'work progress',
      'percent complete',
      '% complete',
      'completion %',
      'completion percentage',
    ],
    unique: false,
  },

  {
    key: 'financial_progress',
    label: 'Financial Progress (%)',
    group: 'Progress',
    status: 'optional',
    description: 'Financial progress/utilization percentage.',
    expectedType: 'percent',
    aliases: [
      'financial progress',
      'financial_progress',
      'financial progress %',
      'fund utilization %',
      'fund utilisation %',
      'utilization %',
      'utilisation %',
    ],
    unique: false,
  },

  {
    key: 'status',
    label: 'Project Status',
    group: 'Progress',
    status: 'optional',
    description: 'Current implementation status of the work.',
    expectedType: 'text',
    aliases: [
      'status',
      'work status',
      'project status',
      'current status',
      'implementation status',
      'stage',
    ],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EVIDENCE
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'image',
    label: 'Image / Photograph',
    group: 'Evidence',
    status: 'optional',
    description: 'Photograph/evidence associated with the work.',
    expectedType: 'text',
    aliases: [
      'image',
      'image url',
      'photo',
      'photograph',
      'work image',
      'asset image',
      'image link',
    ],
    unique: false,
  },

  {
    key: 'document',
    label: 'Document',
    group: 'Evidence',
    status: 'optional',
    description: 'Supporting document/evidence associated with the work.',
    expectedType: 'text',
    aliases: [
      'document',
      'document url',
      'document link',
      'supporting document',
      'file',
      'attachment',
    ],
    unique: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE / TRACEABILITY
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'source_row_number',
    label: 'Source Row Number',
    group: 'Source & Traceability',
    status: 'optional',
    description: 'Original row number in the source dataset.',
    expectedType: 'numeric',
    aliases: [
      'source row number',
      'source_row_number',
      'source row',
      'original row',
    ],
    unique: false,
  },

  {
    key: 'source_dataset',
    label: 'Source Dataset',
    group: 'Source & Traceability',
    status: 'optional',
    description: 'Name or identifier of the source dataset.',
    expectedType: 'text',
    aliases: [
      'source dataset',
      'source_dataset',
      'dataset source',
      'source file',
    ],
    unique: false,
  },

  {
    key: 'import_timestamp',
    label: 'Import Timestamp',
    group: 'Source & Traceability',
    status: 'optional',
    description: 'Timestamp when the dataset was imported.',
    expectedType: 'date',
    aliases: [
      'import timestamp',
      'import_timestamp',
      'import date',
      'uploaded at',
    ],
    unique: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Derived helpers
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_FIELD_KEYS = CANONICAL_FIELDS.map(
  (field) => field.key,
);

export const CANONICAL_FIELD_MAP = Object.fromEntries(
  CANONICAL_FIELDS.map((field) => [field.key, field]),
) as Record<string, CanonicalField>;

export const CANONICAL_GROUPS = [
  'Project Identity',
  'Geography',
  'MP Information',
  'Classification',
  'Implementation',
  'Financial',
  'Dates',
  'Progress',
  'Evidence',
  'Source & Traceability',
] as const;