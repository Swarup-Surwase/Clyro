import type { Entity, EntityType } from './types';

/**
 * Priority order for resolving overlapping matches.
 * Validated/composite identifiers win over embedded numeric fragments.
 */
const TYPE_PRIORITY: Record<EntityType, number> = {
  EMAIL: 6,
  CARD: 5,
  IP: 4,
  AADHAAR: 3,
  PAN: 2,
  PHONE: 1,
};

function spansOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Resolves overlapping entity candidates deterministically.
 * Order of preference:
 *   1. Validation confidence ('validated' before 'pattern' when overlapping)
 *   2. Higher type priority (EMAIL > CARD > IP > AADHAAR > PAN > PHONE)
 *   3. Longer span length
 *   4. Earlier start offset
 * Retained spans are returned sorted ascending by start offset with no overlaps.
 */
export function resolveOverlaps(candidates: Entity[]): Entity[] {
  if (candidates.length === 0) return [];

  const ranked = [...candidates].sort((a, b) => {
    const prioDiff = TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type];
    if (prioDiff !== 0) return prioDiff;

    const confA = a.confidence === 'validated' ? 1 : 0;
    const confB = b.confidence === 'validated' ? 1 : 0;
    if (confB !== confA) return confB - confA;

    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;

    return a.start - b.start;
  });

  const accepted: Entity[] = [];
  for (const candidate of ranked) {
    const overlapsExisting = accepted.some((existing) => spansOverlap(candidate, existing));
    if (!overlapsExisting) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}
