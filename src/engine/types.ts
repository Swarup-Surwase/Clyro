export type EntityType = 'EMAIL' | 'PHONE' | 'IP' | 'PAN' | 'AADHAAR' | 'CARD';

export type Mode = 'full' | 'partial' | 'pseudonym';

export type ConfidenceLevel = 'pattern' | 'validated';

export type ValidationNote =
  | 'email-pattern'
  | 'phone-in-format'
  | 'ipv4-valid-octets'
  | 'ipv6-parsed'
  | 'pan-format'
  | 'aadhaar-verhoeff-valid'
  | 'aadhaar-verhoeff-invalid'
  | 'card-luhn-valid'
  | 'manual-redaction';

export type Entity = {
  id: string;
  type: EntityType;
  start: number;
  end: number;
  raw: string;
  canonical: string;
  confidence: ConfidenceLevel;
  validationNote: ValidationNote;
  needsReview?: boolean;
  reviewReason?: string;
};

export type FlaggedCandidate = {
  id: string;
  type: 'CARD' | 'AADHAAR' | 'IP' | 'AMBIGUOUS';
  start: number;
  end: number;
  raw: string;
  reason: string;
  locationLabel?: string;
};

export type ManualSpan = {
  id: string;
  start: number;
  end: number;
  row?: number;
  col?: number;
};

export type ReplacementSegment = {
  start: number;
  end: number;
  original: string;
  replacement: string;
  type: EntityType | 'MANUAL';
  entityId: string;
  isChanged: boolean;
  confidence?: ConfidenceLevel;
  validationNote?: ValidationNote;
  needsReview?: boolean;
};

export type CategoryCounts = Record<EntityType, number>;

export type SanitizationStats = {
  totalOccurrences: number;
  uniqueEntities: number;
  replacedOccurrences: number;
  manualOccurrences: number;
  categoriesDetected: number;
  countsByCategory: CategoryCounts;
  uniqueByCategory: CategoryCounts;
  validatedCount: number;
  patternOnlyCount: number;
  reviewNeededCount: number;
  flaggedRejectedCount: number;
};

export type RecipientType = 'default' | 'ngo' | 'hospital' | 'municipal' | 'volunteer' | 'custom';

export type ColumnClassification = 'operational' | 'review' | 'sensitive-risk';

export type ColumnPolicyItem = {
  name: string;
  colIndex: number;
  retained: boolean;
  classification: ColumnClassification;
  reason: string;
  hasDetectedPii: boolean;
};

export type FormulaNeutralizationEvent = {
  row: number;
  col: number;
  columnName: string;
  triggerChar: string;
};

export type ValidationCoverageSummary = {
  luhnCheckedCards: number;
  luhnPassedCards: number;
  luhnRejectedCandidates: number;
  verhoeffCheckedAadhaar: number;
  verhoeffPassedAadhaar: number;
  verhoeffFailedAadhaar: number;
  ipv4RejectedCandidates: number;
  ipv6ParsedCount: number;
};

export type AuditReport = {
  reportVersion: string;
  generatedAtIso: string;
  inputFormat: 'txt' | 'csv';
  mode: Mode;
  recipientScope: RecipientType;
  scopeIdentifier: string;
  spreadsheetSafeExport: boolean;
  totalOccurrences: number;
  uniqueEntities: number;
  replacedOccurrences: number;
  manualRedactions: number;
  countsByCategory: CategoryCounts;
  uniqueByCategory: CategoryCounts;
  validationCoverage: ValidationCoverageSummary;
  retainedColumns: string[];
  removedColumns: string[];
  formulaNeutralizationCount: number;
  warnings: string[];
  disclaimer: string;
};
