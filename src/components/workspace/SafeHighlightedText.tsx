import { Fragment } from 'react';
import type { Entity, EntityType, ManualSpan, ReplacementSegment } from '../../engine';
import { ENTITY_META, MANUAL_META } from '../shared/EntityMeta';

type HighlightOriginalProps = {
  text: string;
  entities: Entity[];
  manualSpans?: ManualSpan[];
  focusedCategories: Set<EntityType>;
};

/**
 * Renders original text strictly using React text nodes (never innerHTML)
 * so untrusted strings such as <script> payloads remain completely inert.
 */
export function HighlightOriginalText({
  text,
  entities,
  manualSpans = [],
  focusedCategories,
}: HighlightOriginalProps) {
  if (!text) {
    return <span className="text-[#737373] italic">—</span>;
  }

  type SpanMarker =
    | { kind: 'entity'; start: number; end: number; entity: Entity }
    | { kind: 'manual'; start: number; end: number; span: ManualSpan };

  const spans: SpanMarker[] = [
    ...entities.map((entity) => ({
      kind: 'entity' as const,
      start: entity.start,
      end: entity.end,
      entity,
    })),
    ...manualSpans
      .filter((m) => !entities.some((e) => m.start < e.end && e.start < m.end))
      .map((span) => ({
        kind: 'manual' as const,
        start: span.start,
        end: span.end,
        span,
      })),
  ].sort((a, b) => a.start - b.start);

  if (spans.length === 0) {
    return <>{text}</>;
  }

  const nodes: Array<{ key: string; node: React.ReactNode }> = [];
  let cursor = 0;
  const hasFilter = focusedCategories.size > 0;

  spans.forEach((item, idx) => {
    if (item.start > cursor) {
      nodes.push({
        key: `plain_${idx}_${cursor}`,
        node: text.slice(cursor, item.start),
      });
    }

    const slice = text.slice(item.start, item.end);

    if (item.kind === 'manual') {
      nodes.push({
        key: `man_${item.span.id}`,
        node: (
          <mark
            className={`rounded-[3px] px-1 py-0.5 font-mono inline-flex items-center gap-1 align-baseline ${MANUAL_META.highlightClass}`}
            title="Manual redaction selection"
          >
            <span>{slice}</span>
            <span className="text-[9px] font-semibold tracking-wider uppercase opacity-80 border border-current/30 rounded px-0.5">
              {MANUAL_META.shortCode}
            </span>
          </mark>
        ),
      });
    } else {
      const ent = item.entity;
      const meta = ENTITY_META[ent.type];
      const isFocused = !hasFilter || focusedCategories.has(ent.type);
      nodes.push({
        key: `ent_${ent.id}_${idx}`,
        node: (
          <mark
            data-entity-type={ent.type}
            className={`rounded-[3px] px-1 py-0.5 font-mono inline-flex items-center gap-1 align-baseline transition-opacity ${
              isFocused ? meta.highlightClass : `${meta.dimHighlightClass} opacity-45`
            }`}
            title={`${meta.label} (${ent.validationNote})${ent.needsReview ? ' — Checksum review suggested' : ''}`}
          >
            <span>{slice}</span>
            <span className="text-[9px] font-semibold tracking-wider uppercase opacity-90 border border-current/30 rounded px-0.5">
              {meta.shortCode}
            </span>
          </mark>
        ),
      });
    }

    cursor = item.end;
  });

  if (cursor < text.length) {
    nodes.push({
      key: `tail_${cursor}`,
      node: text.slice(cursor),
    });
  }

  return (
    <>
      {nodes.map((n) => (
        <Fragment key={n.key}>{n.node}</Fragment>
      ))}
    </>
  );
}

type HighlightSanitizedFromOriginalProps = {
  originalText: string;
  sanitizedFallback: string;
  segments: ReplacementSegment[];
  focusedCategories: Set<EntityType>;
  formulaNeutralized?: boolean;
};

export function HighlightSanitizedFromOriginal({
  originalText,
  sanitizedFallback,
  segments,
  focusedCategories,
  formulaNeutralized = false,
}: HighlightSanitizedFromOriginalProps) {
  if (!sanitizedFallback) {
    return <span className="text-[#737373] italic">—</span>;
  }

  if (segments.length === 0) {
    return (
      <>
        {formulaNeutralized && (
          <span className="inline-block mr-1 text-[10px] font-mono px-1 py-0.5 rounded bg-[#E6BA70]/15 text-[#E6BA70] border border-[#E6BA70]/35">
            SAFE-CSV
          </span>
        )}
        {sanitizedFallback}
      </>
    );
  }

  const hasFilter = focusedCategories.size > 0;
  const parts: Array<{ key: string; node: React.ReactNode }> = [];
  let cursor = 0;

  if (formulaNeutralized && sanitizedFallback.startsWith("'")) {
    parts.push({
      key: 'safe_prefix',
      node: (
        <span
          className="bg-[#E6BA70]/20 text-[#E6BA70] px-0.5 rounded font-mono border border-[#E6BA70]/40 mr-0.5"
          title="Spreadsheet formula trigger neutralized with leading apostrophe"
        >
          &apos;
        </span>
      ),
    });
  }

  segments.forEach((seg, idx) => {
    if (seg.start > cursor) {
      parts.push({
        key: `u_${idx}_${cursor}`,
        node: originalText.slice(cursor, seg.start),
      });
    }

    const isFocused =
      seg.type === 'MANUAL' || !hasFilter || focusedCategories.has(seg.type);

    const badgeCode = seg.type === 'MANUAL' ? MANUAL_META.shortCode : ENTITY_META[seg.type].shortCode;
    const label = seg.type === 'MANUAL' ? 'Manual redaction' : ENTITY_META[seg.type].label;

    parts.push({
      key: `rep_${seg.entityId}_${idx}`,
      node: (
        <mark
          data-replacement-type={seg.type}
          className={`rounded-[3px] px-1 py-0.5 font-mono inline-flex items-center gap-1 align-baseline ${
            isFocused
              ? 'bg-[#A8E6CF]/15 text-[#A8E6CF] border-b border-[#A8E6CF]/60'
              : 'bg-[#191B1D] text-[#737373] border-b border-[#26282A] opacity-55'
          }`}
          title={`Replaced ${label}`}
        >
          <span>{seg.replacement}</span>
          <span className="text-[9px] font-semibold uppercase opacity-80 border border-current/30 rounded px-0.5">
            {badgeCode}
          </span>
        </mark>
      ),
    });

    cursor = seg.end;
  });

  if (cursor < originalText.length) {
    parts.push({
      key: `tail_${cursor}`,
      node: originalText.slice(cursor),
    });
  }

  return (
    <>
      {parts.map((p) => (
        <Fragment key={p.key}>{p.node}</Fragment>
      ))}
    </>
  );
}
