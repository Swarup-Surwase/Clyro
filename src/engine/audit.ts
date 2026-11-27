import type {
  AuditReport,
  CategoryCounts,
  Entity,
  EntityType,
  FlaggedCandidate,
  FormulaNeutralizationEvent,
  Mode,
  RecipientType,
  SanitizationStats,
  ValidationCoverageSummary,
} from './types';

export const ENTITY_TYPES: readonly EntityType[] = [
  'EMAIL',
  'PHONE',
  'IP',
  'PAN',
  'AADHAAR',
  'CARD',
] as const;

export function emptyCategoryCounts(): CategoryCounts {
  return {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    PAN: 0,
    AADHAAR: 0,
    CARD: 0,
  };
}

export function computeStats(
  appliedEntities: Entity[],
  flaggedCandidates: FlaggedCandidate[],
  manualOccurrences: number,
  replacedCount: number
): SanitizationStats {
  const countsByCategory = emptyCategoryCounts();
  const uniqueSets: Record<EntityType, Set<string>> = {
    EMAIL: new Set(),
    PHONE: new Set(),
    IP: new Set(),
    PAN: new Set(),
    AADHAAR: new Set(),
    CARD: new Set(),
  };

  let validatedCount = 0;
  let patternOnlyCount = 0;
  let reviewNeededCount = 0;

  for (const ent of appliedEntities) {
    countsByCategory[ent.type] += 1;
    uniqueSets[ent.type].add(ent.canonical);
    if (ent.confidence === 'validated') {
      validatedCount += 1;
    } else {
      patternOnlyCount += 1;
    }
    if (ent.needsReview) {
      reviewNeededCount += 1;
    }
  }

  const uniqueByCategory = emptyCategoryCounts();
  let uniqueEntities = 0;
  let categoriesDetected = 0;

  for (const type of ENTITY_TYPES) {
    uniqueByCategory[type] = uniqueSets[type].size;
    uniqueEntities += uniqueSets[type].size;
    if (countsByCategory[type] > 0) {
      categoriesDetected += 1;
    }
  }

  return {
    totalOccurrences: appliedEntities.length,
    uniqueEntities,
    replacedOccurrences: replacedCount,
    manualOccurrences,
    categoriesDetected,
    countsByCategory,
    uniqueByCategory,
    validatedCount,
    patternOnlyCount,
    reviewNeededCount,
    flaggedRejectedCount: flaggedCandidates.length,
  };
}

export function computeValidationCoverage(
  entities: Entity[],
  flagged: FlaggedCandidate[]
): ValidationCoverageSummary {
  const luhnPassedCards = entities.filter((e) => e.type === 'CARD' && e.validationNote === 'card-luhn-valid').length;
  const luhnRejectedCandidates = flagged.filter((f) => f.type === 'CARD').length;
  const verhoeffPassedAadhaar = entities.filter(
    (e) => e.type === 'AADHAAR' && e.validationNote === 'aadhaar-verhoeff-valid'
  ).length;
  const verhoeffFailedAadhaar = entities.filter(
    (e) => e.type === 'AADHAAR' && e.validationNote === 'aadhaar-verhoeff-invalid'
  ).length;
  const ipv4RejectedCandidates = flagged.filter((f) => f.type === 'IP').length;
  const ipv6ParsedCount = entities.filter((e) => e.type === 'IP' && e.validationNote === 'ipv6-parsed').length;

  return {
    luhnCheckedCards: luhnPassedCards + luhnRejectedCandidates,
    luhnPassedCards,
    luhnRejectedCandidates,
    verhoeffCheckedAadhaar: verhoeffPassedAadhaar + verhoeffFailedAadhaar,
    verhoeffPassedAadhaar,
    verhoeffFailedAadhaar,
    ipv4RejectedCandidates,
    ipv6ParsedCount,
  };
}

/**
 * Sanitizes column names in audit output if a column header itself contained PII.
 */
export function sanitizeAuditColumnLabel(label: string, index: number, hadHeaderPii: boolean): string {
  if (hadHeaderPii) {
    return `REDACTED_COL_${index + 1}`;
  }
  return label;
}

export function buildAuditReport(params: {
  inputFormat: 'txt' | 'csv';
  mode: Mode;
  recipientScope: RecipientType;
  scopeIdentifier: string;
  spreadsheetSafeExport: boolean;
  stats: SanitizationStats;
  validationCoverage: ValidationCoverageSummary;
  retainedColumns: string[];
  removedColumns: string[];
  formulaNeutralizations: FormulaNeutralizationEvent[];
  warnings: string[];
}): AuditReport {
  const warnings = [...params.warnings];

  if (params.mode === 'partial') {
    warnings.push(
      'Partial Mask mode retains suffix/prefix fragments that may expose organizational or regional context.'
    );
  }
  if (params.mode === 'pseudonym') {
    warnings.push(
      'Pseudonymization is not encryption or anonymization. Retained combinations of non-PII attributes can enable linkage.'
    );
  }
  if (params.stats.totalOccurrences === 0 && params.stats.manualOccurrences === 0) {
    warnings.push(
      'Zero pattern-matched entities detected. Unstructured names, addresses, medical details, or obfuscated IDs may still be present.'
    );
  }
  if (params.stats.reviewNeededCount > 0) {
    warnings.push(
      `${params.stats.reviewNeededCount} format-matched Aadhaar candidate(s) did not pass Verhoeff checksum and were masked conservatively.`
    );
  }

  return {
    reportVersion: '1.0.0',
    generatedAtIso: new Date().toISOString(),
    inputFormat: params.inputFormat,
    mode: params.mode,
    recipientScope: params.recipientScope,
    scopeIdentifier: params.scopeIdentifier,
    spreadsheetSafeExport: params.spreadsheetSafeExport,
    totalOccurrences: params.stats.totalOccurrences,
    uniqueEntities: params.stats.uniqueEntities,
    replacedOccurrences: params.stats.replacedOccurrences,
    manualRedactions: params.stats.manualOccurrences,
    countsByCategory: { ...params.stats.countsByCategory },
    uniqueByCategory: { ...params.stats.uniqueByCategory },
    validationCoverage: params.validationCoverage,
    retainedColumns: params.retainedColumns,
    removedColumns: params.removedColumns,
    formulaNeutralizationCount: params.formulaNeutralizations.length,
    warnings,
    disclaimer:
      'Clyro is a local sanitization aid. Pattern matching and checksums do not prove identity issuance or guarantee complete anonymity. Audit reports omit all raw values, original records, filenames, and pseudonym mappings.',
  };
}
