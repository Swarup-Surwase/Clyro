import { buildAuditReport, computeStats, computeValidationCoverage, sanitizeAuditColumnLabel } from './audit';
import {
  applySpreadsheetSafetyToTable,
  parseCsvLocally,
  serializeCsvLocally,
} from './csv';
import { detectEntitiesInText } from './detect';
import { buildDefaultColumnPolicies } from './policies';
import { createPseudonymRegistry, type PseudonymRegistry } from './pseudonyms';
import { redactTextWithEntities } from './redact';
import type {
  AuditReport,
  ColumnPolicyItem,
  Entity,
  EntityType,
  FlaggedCandidate,
  FormulaNeutralizationEvent,
  ManualSpan,
  Mode,
  RecipientType,
  ReplacementSegment,
  SanitizationStats,
} from './types';

export * from './types';
export * from './validators';
export * from './normalize';
export * from './resolveOverlaps';
export * from './detect';
export * from './pseudonyms';
export * from './redact';
export * from './csv';
export * from './policies';
export * from './audit';

export type CsvCellAnalysis = {
  rowIndex: number; // -1 for header
  colIndex: number;
  original: string;
  sanitized: string;
  entities: Entity[];
  segments: ReplacementSegment[];
  flagged: FlaggedCandidate[];
  formulaNeutralized: boolean;
};

export type PipelineOptions = {
  input: string;
  format: 'txt' | 'csv';
  mode: Mode;
  recipientScope: RecipientType;
  registry?: PseudonymRegistry;
  perTypeModes?: Partial<Record<EntityType, Mode>>;
  manualSpans?: ManualSpan[];
  rejectedEntityIds?: Set<string>;
  columnOverrides?: Record<string, boolean>;
  spreadsheetSafeExport?: boolean;
};

export type PipelineResult = {
  format: 'txt' | 'csv';
  parseOk: boolean;
  parseError?: string;
  registry: PseudonymRegistry;
  sanitizedOutput: string;
  // TXT fields
  txtEntities: Entity[];
  txtSegments: ReplacementSegment[];
  // CSV fields
  csvHeaders: string[];
  csvSanitizedHeaders: string[];
  csvRows: string[][];
  csvSanitizedRows: string[][];
  csvCellAnalyses: CsvCellAnalysis[][]; // [0] is header row, [1..] are data rows
  csvHeaderAnalyses: CsvCellAnalysis[];
  columnPolicies: ColumnPolicyItem[];
  formulaNeutralizations: FormulaNeutralizationEvent[];
  csvLineEnding: '\r\n' | '\n';
  csvHadTrailingNewline: boolean;
  // Shared summaries
  allEntities: Entity[];
  flaggedCandidates: FlaggedCandidate[];
  stats: SanitizationStats;
  auditReport: AuditReport;
  warnings: string[];
};

export function runSanitizationPipeline(options: PipelineOptions): PipelineResult {
  const registry = options.registry ?? createPseudonymRegistry(options.recipientScope);
  const spreadsheetSafe = Boolean(options.spreadsheetSafeExport);

  if (!options.input) {
    const emptyStats = computeStats([], [], 0, 0);
    const coverage = computeValidationCoverage([], []);
    const auditReport = buildAuditReport({
      inputFormat: options.format,
      mode: options.mode,
      recipientScope: options.recipientScope,
      scopeIdentifier: registry.scopeIdentifier,
      spreadsheetSafeExport: spreadsheetSafe,
      stats: emptyStats,
      validationCoverage: coverage,
      retainedColumns: [],
      removedColumns: [],
      formulaNeutralizations: [],
      warnings: [],
    });

    return {
      format: options.format,
      parseOk: true,
      registry,
      sanitizedOutput: '',
      txtEntities: [],
      txtSegments: [],
      csvHeaders: [],
      csvSanitizedHeaders: [],
      csvRows: [],
      csvSanitizedRows: [],
      csvCellAnalyses: [],
      csvHeaderAnalyses: [],
      columnPolicies: [],
      formulaNeutralizations: [],
      csvLineEnding: '\n',
      csvHadTrailingNewline: true,
      allEntities: [],
      flaggedCandidates: [],
      stats: emptyStats,
      auditReport,
      warnings: [],
    };
  }

  if (options.format === 'txt') {
    const { entities, flagged } = detectEntitiesInText(options.input, 'Plain text');
    const redacted = redactTextWithEntities(options.input, entities, {
      mode: options.mode,
      registry,
      perTypeModes: options.perTypeModes,
      manualSpans: options.manualSpans?.filter((m) => m.row === undefined),
      rejectedEntityIds: options.rejectedEntityIds,
    });

    const replacedCount = redacted.segments.filter((s) => s.isChanged).length;
    const stats = computeStats(redacted.appliedEntities, flagged, redacted.manualAppliedCount, replacedCount);
    const coverage = computeValidationCoverage(redacted.appliedEntities, flagged);
    const auditReport = buildAuditReport({
      inputFormat: 'txt',
      mode: options.mode,
      recipientScope: options.recipientScope,
      scopeIdentifier: registry.scopeIdentifier,
      spreadsheetSafeExport: false,
      stats,
      validationCoverage: coverage,
      retainedColumns: [],
      removedColumns: [],
      formulaNeutralizations: [],
      warnings: [],
    });

    return {
      format: 'txt',
      parseOk: true,
      registry,
      sanitizedOutput: redacted.sanitizedText,
      txtEntities: entities,
      txtSegments: redacted.segments,
      csvHeaders: [],
      csvSanitizedHeaders: [],
      csvRows: [],
      csvSanitizedRows: [],
      csvCellAnalyses: [],
      csvHeaderAnalyses: [],
      columnPolicies: [],
      formulaNeutralizations: [],
      csvLineEnding: '\n',
      csvHadTrailingNewline: false,
      allEntities: redacted.appliedEntities,
      flaggedCandidates: flagged,
      stats,
      auditReport,
      warnings: auditReport.warnings,
    };
  }

  // CSV processing
  const parsed = parseCsvLocally(options.input);
  if (!parsed.ok) {
    const emptyStats = computeStats([], [], 0, 0);
    const coverage = computeValidationCoverage([], []);
    const auditReport = buildAuditReport({
      inputFormat: 'csv',
      mode: options.mode,
      recipientScope: options.recipientScope,
      scopeIdentifier: registry.scopeIdentifier,
      spreadsheetSafeExport: spreadsheetSafe,
      stats: emptyStats,
      validationCoverage: coverage,
      retainedColumns: [],
      removedColumns: [],
      formulaNeutralizations: [],
      warnings: [parsed.error],
    });
    return {
      format: 'csv',
      parseOk: false,
      parseError: parsed.error,
      registry,
      sanitizedOutput: '',
      txtEntities: [],
      txtSegments: [],
      csvHeaders: [],
      csvSanitizedHeaders: [],
      csvRows: [],
      csvSanitizedRows: [],
      csvCellAnalyses: [],
      csvHeaderAnalyses: [],
      columnPolicies: [],
      formulaNeutralizations: [],
      csvLineEnding: '\n',
      csvHadTrailingNewline: true,
      allEntities: [],
      flaggedCandidates: [],
      stats: emptyStats,
      auditReport,
      warnings: [parsed.error],
    };
  }

  const allAppliedEntities: Entity[] = [];
  const allFlagged: FlaggedCandidate[] = [];
  const columnsWithPii = new Set<number>();
  const headersWithPii = new Set<number>();
  let totalManualApplied = 0;
  let totalReplacedCount = 0;

  const analyzeCell = (cellValue: string, rowIndex: number, colIndex: number, colLabel: string): CsvCellAnalysis => {
    const loc = rowIndex === -1 ? `Header "${colLabel}"` : `Row ${rowIndex + 1}, ${colLabel}`;
    const detected = detectEntitiesInText(cellValue, loc);
    // Make IDs globally unique across cells
    const prefix = `r${rowIndex}_c${colIndex}`;
    const cellEntities = detected.entities.map((e) => ({ ...e, id: `${prefix}_${e.id}` }));
    const cellFlagged = detected.flagged.map((f) => ({ ...f, id: `${prefix}_${f.id}` }));

    const cellManualSpans = options.manualSpans?.filter(
      (m) => m.row === rowIndex && m.col === colIndex
    );

    const redacted = redactTextWithEntities(cellValue, cellEntities, {
      mode: options.mode,
      registry,
      perTypeModes: options.perTypeModes,
      manualSpans: cellManualSpans,
      rejectedEntityIds: options.rejectedEntityIds,
    });

    if (redacted.appliedEntities.length > 0 || redacted.manualAppliedCount > 0) {
      columnsWithPii.add(colIndex);
      if (rowIndex === -1) headersWithPii.add(colIndex);
    }

    allAppliedEntities.push(...redacted.appliedEntities);
    allFlagged.push(...cellFlagged);
    totalManualApplied += redacted.manualAppliedCount;
    totalReplacedCount += redacted.segments.filter((s) => s.isChanged).length;

    return {
      rowIndex,
      colIndex,
      original: cellValue,
      sanitized: redacted.sanitizedText,
      entities: cellEntities,
      segments: redacted.segments,
      flagged: cellFlagged,
      formulaNeutralized: false,
    };
  };

  const csvHeaderAnalyses = parsed.headers.map((h, colIndex) =>
    analyzeCell(h, -1, colIndex, `Col ${colIndex + 1}`)
  );

  const csvDataAnalyses = parsed.rows.map((row, rowIndex) =>
    row.map((cell, colIndex) =>
      analyzeCell(cell, rowIndex, colIndex, parsed.headers[colIndex] ?? `Col ${colIndex + 1}`)
    )
  );

  const columnPolicies = buildDefaultColumnPolicies(
    parsed.headers,
    options.recipientScope,
    columnsWithPii,
    options.columnOverrides
  );

  const retainedIndices = columnPolicies.filter((p) => p.retained).map((p) => p.colIndex);

  const rawSanitizedHeaders = retainedIndices.map((idx) => csvHeaderAnalyses[idx]?.sanitized ?? '');
  const rawSanitizedRows = csvDataAnalyses.map((rowAnalyses) =>
    retainedIndices.map((idx) => rowAnalyses[idx]?.sanitized ?? '')
  );

  const safeTable = applySpreadsheetSafetyToTable(rawSanitizedHeaders, rawSanitizedRows, spreadsheetSafe);

  // Mark formula neutralization status on retained cell analyses
  const neutSet = new Set(safeTable.neutralizations.map((n) => `${n.row}:${n.col}`));
  retainedIndices.forEach((origColIdx, newColIdx) => {
    const hCell = csvHeaderAnalyses[origColIdx];
    if (hCell && neutSet.has(`-1:${newColIdx}`)) {
      hCell.formulaNeutralized = true;
      hCell.sanitized = safeTable.headers[newColIdx] ?? hCell.sanitized;
    }
    csvDataAnalyses.forEach((rowAnalyses, rIdx) => {
      const cell = rowAnalyses[origColIdx];
      if (cell && neutSet.has(`${rIdx}:${newColIdx}`)) {
        cell.formulaNeutralized = true;
        cell.sanitized = safeTable.rows[rIdx]?.[newColIdx] ?? cell.sanitized;
      }
    });
  });

  const sanitizedOutput =
    retainedIndices.length === 0
      ? ''
      : serializeCsvLocally(
          safeTable.headers,
          safeTable.rows,
          parsed.lineEnding,
          parsed.hadTrailingNewline
        );

  const stats = computeStats(allAppliedEntities, allFlagged, totalManualApplied, totalReplacedCount);
  const coverage = computeValidationCoverage(allAppliedEntities, allFlagged);

  const retainedColumns = columnPolicies
    .filter((p) => p.retained)
    .map((p) => sanitizeAuditColumnLabel(p.name, p.colIndex, headersWithPii.has(p.colIndex)));
  const removedColumns = columnPolicies
    .filter((p) => !p.retained)
    .map((p) => sanitizeAuditColumnLabel(p.name, p.colIndex, headersWithPii.has(p.colIndex)));

  const extraWarnings = [...parsed.warnings];
  if (retainedIndices.length === 0) {
    extraWarnings.push('All columns are currently excluded under the handover column policy.');
  }

  const auditReport = buildAuditReport({
    inputFormat: 'csv',
    mode: options.mode,
    recipientScope: options.recipientScope,
    scopeIdentifier: registry.scopeIdentifier,
    spreadsheetSafeExport: spreadsheetSafe,
    stats,
    validationCoverage: coverage,
    retainedColumns,
    removedColumns,
    formulaNeutralizations: safeTable.neutralizations,
    warnings: extraWarnings,
  });

  return {
    format: 'csv',
    parseOk: true,
    registry,
    sanitizedOutput,
    txtEntities: [],
    txtSegments: [],
    csvHeaders: parsed.headers,
    csvSanitizedHeaders: safeTable.headers,
    csvRows: parsed.rows,
    csvSanitizedRows: safeTable.rows,
    csvCellAnalyses: csvDataAnalyses,
    csvHeaderAnalyses,
    columnPolicies,
    formulaNeutralizations: safeTable.neutralizations,
    csvLineEnding: parsed.lineEnding,
    csvHadTrailingNewline: parsed.hadTrailingNewline,
    allEntities: allAppliedEntities,
    flaggedCandidates: allFlagged,
    stats,
    auditReport,
    warnings: auditReport.warnings,
  };
}
