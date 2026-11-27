import { getOrAssignPseudonym, type PseudonymRegistry } from './pseudonyms';
import type { Entity, EntityType, ManualSpan, Mode, ReplacementSegment } from './types';

export const FULL_MASK_MARKER = '[REDACTED]';

/**
 * Generates conservative partial mask retaining minimal operational/verification context.
 * Never leaks more characters than intended for short tokens.
 */
export function formatPartialMask(entity: Entity): string {
  switch (entity.type) {
    case 'EMAIL': {
      const atIdx = entity.canonical.lastIndexOf('@');
      if (atIdx <= 0) return '***@***';
      const local = entity.canonical.slice(0, atIdx);
      if (local.length <= 1) return '*@***';
      return `${local[0]}***@***`;
    }
    case 'PHONE': {
      const digits = entity.canonical.replace(/\D/g, '');
      const last10 = digits.slice(-10);
      if (last10.length < 5) return 'XXXXXX';
      return `XXXXXX${last10.slice(-4)}`;
    }
    case 'AADHAAR': {
      const digits = entity.canonical.replace(/\D/g, '');
      if (digits.length < 4) return 'XXXX-XXXX-XXXX';
      return `XXXX-XXXX-${digits.slice(-4)}`;
    }
    case 'CARD': {
      const digits = entity.canonical.replace(/\D/g, '');
      if (digits.length <= 4) return 'XXXX';
      const maskedCount = digits.length - 4;
      const last4 = digits.slice(-4);
      const maskedChunks: string[] = [];
      for (let i = 0; i < maskedCount; i += 4) {
        maskedChunks.push('X'.repeat(Math.min(4, maskedCount - i)));
      }
      return `${maskedChunks.join('-')}-${last4}`;
    }
    case 'PAN': {
      // Mask first 5 letters and last letter; reveal only middle 3 digits
      if (entity.canonical.length !== 10) return 'XXXXXXXXXX';
      return `XXXXX${entity.canonical.slice(5, 8)}X`;
    }
    case 'IP': {
      if (entity.canonical.includes(':')) {
        const clean = entity.canonical.split('%')[0] ?? entity.canonical;
        const firstGroup = clean.split(':')[0] || 'XXXX';
        return `${firstGroup}:XXXX::XXXX`;
      }
      const firstOctet = entity.canonical.split('.')[0] ?? 'X';
      return `${firstOctet}.X.X.X`;
    }
  }
}

export type RedactTextOptions = {
  mode: Mode;
  registry: PseudonymRegistry;
  perTypeModes?: Partial<Record<EntityType, Mode>>;
  manualSpans?: ManualSpan[];
  rejectedEntityIds?: Set<string>;
};

export type RedactTextResult = {
  sanitizedText: string;
  segments: ReplacementSegment[];
  appliedEntities: Entity[];
  manualAppliedCount: number;
};

/**
 * Applies redaction cleanly over ordered non-overlapping spans, preventing offset drift.
 * Note: pseudonym tokens are always resolved in first-occurrence order when mode (or per-type mode) is pseudonym,
 * AND we can pre-register all active entities in order so toggling modes preserves stable token ordering!
 */
export function registerEntitiesInOrder(
  entities: Entity[],
  registry: PseudonymRegistry,
  rejectedEntityIds?: Set<string>
): void {
  for (const entity of entities) {
    if (rejectedEntityIds?.has(entity.id)) continue;
    getOrAssignPseudonym(registry, entity.type, entity.canonical);
  }
}

export function redactTextWithEntities(
  originalText: string,
  entities: Entity[],
  options: RedactTextOptions
): RedactTextResult {
  const { mode, registry, perTypeModes, manualSpans = [], rejectedEntityIds } = options;

  const activeEntities = entities.filter((e) => !rejectedEntityIds?.has(e.id));

  // Pre-register canonical tokens in deterministic occurrence order so switching modes
  // keeps consistent pseudonym indices across the dataset.
  registerEntitiesInOrder(activeEntities, registry);

  type SpanOp =
    | { kind: 'entity'; entity: Entity }
    | { kind: 'manual'; span: ManualSpan };

  const allOps: SpanOp[] = activeEntities.map((entity) => ({ kind: 'entity', entity }));

  // Add manual spans that don't overlap already active auto-detected entities
  for (const mSpan of manualSpans) {
    if (mSpan.start < 0 || mSpan.end <= mSpan.start || mSpan.end > originalText.length) continue;
    const overlapsAuto = activeEntities.some(
      (e) => mSpan.start < e.end && e.start < mSpan.end
    );
    const overlapsOtherManual = allOps.some(
      (op) =>
        op.kind === 'manual' &&
        mSpan.start < op.span.end &&
        op.span.start < mSpan.end
    );
    if (!overlapsAuto && !overlapsOtherManual) {
      allOps.push({ kind: 'manual', span: mSpan });
    }
  }

  allOps.sort((a, b) => {
    const startA = a.kind === 'entity' ? a.entity.start : a.span.start;
    const startB = b.kind === 'entity' ? b.entity.start : b.span.start;
    return startA - startB;
  });

  if (allOps.length === 0) {
    return {
      sanitizedText: originalText,
      segments: [],
      appliedEntities: [],
      manualAppliedCount: 0,
    };
  }

  const parts: string[] = [];
  const segments: ReplacementSegment[] = [];
  let cursor = 0;
  let manualAppliedCount = 0;

  for (const op of allOps) {
    if (op.kind === 'entity') {
      const entity = op.entity;
      if (entity.start > cursor) {
        parts.push(originalText.slice(cursor, entity.start));
      }
      const effectiveMode = perTypeModes?.[entity.type] ?? mode;
      let replacement: string;
      if (effectiveMode === 'full') {
        replacement = FULL_MASK_MARKER;
      } else if (effectiveMode === 'partial') {
        replacement = formatPartialMask(entity);
      } else {
        replacement = getOrAssignPseudonym(registry, entity.type, entity.canonical);
      }

      parts.push(replacement);
      segments.push({
        start: entity.start,
        end: entity.end,
        original: entity.raw,
        replacement,
        type: entity.type,
        entityId: entity.id,
        isChanged: replacement !== entity.raw,
        confidence: entity.confidence,
        validationNote: entity.validationNote,
        needsReview: entity.needsReview,
      });
      cursor = entity.end;
    } else {
      const span = op.span;
      if (span.start > cursor) {
        parts.push(originalText.slice(cursor, span.start));
      }
      const original = originalText.slice(span.start, span.end);
      const replacement = FULL_MASK_MARKER;
      parts.push(replacement);
      segments.push({
        start: span.start,
        end: span.end,
        original,
        replacement,
        type: 'MANUAL',
        entityId: span.id,
        isChanged: replacement !== original,
        validationNote: 'manual-redaction',
      });
      manualAppliedCount += 1;
      cursor = span.end;
    }
  }

  if (cursor < originalText.length) {
    parts.push(originalText.slice(cursor));
  }

  return {
    sanitizedText: parts.join(''),
    segments,
    appliedEntities: activeEntities,
    manualAppliedCount,
  };
}
