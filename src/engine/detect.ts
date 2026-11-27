import {
  normalizeAadhaar,
  normalizeCard,
  normalizeEmail,
  normalizeIp,
  normalizePan,
  normalizePhone,
} from './normalize';
import { resolveOverlaps } from './resolveOverlaps';
import type { Entity, FlaggedCandidate } from './types';
import {
  isRepeatedDigitSequence,
  isValidLuhn,
  isValidVerhoeff,
  parseAndNormalizeIPv6,
  parseIPv4,
} from './validators';

export type DetectionOutput = {
  entities: Entity[];
  flagged: FlaggedCandidate[];
};

const MAX_CELL_SCAN_LENGTH = 500_000;

const EMAIL_RE =
  /(?<![A-Za-z0-9._%+-])([A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24})(?![A-Za-z0-9@-])/g;

const PHONE_RE =
  /(?<![0-9A-Za-z+])((?:\(\+91\)[\s.-]?|\+91[\s.-]?|91[\s.-]|0(?=[6-9])[\s.-]?)?(?:[6-9][0-9]{9}|[6-9][0-9]{4}[\s.-][0-9]{5}|[6-9][0-9]{2}[\s.-][0-9]{3}[\s.-][0-9]{4}))(?![0-9A-Za-z])/g;

const IPV4_RE =
  /(?<![0-9A-Za-z])((?:[0-9]{1,3}\.){3}[0-9]{1,3})(?![0-9A-Za-z]|\.[0-9A-Za-z])/g;

const IPV6_RE =
  /(?<![0-9A-Za-z:])((?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f:.]{0,24})(?:%([A-Za-z0-9._-]+))?(?![0-9A-Za-z:])/g;

const PAN_RE = /(?<![A-Za-z0-9])([A-Za-z]{5}[0-9]{4}[A-Za-z])(?![A-Za-z0-9])/g;

const AADHAAR_RE =
  /(?<![0-9A-Za-z])([2-9][0-9]{3}(?:[0-9]{8}| [0-9]{4} [0-9]{4}|-[0-9]{4}-[0-9]{4}))(?![0-9A-Za-z])/g;

const CARD_RE =
  /(?<![0-9A-Za-z])([0-9]{13,19}|[0-9]{4}(?: [0-9]{4}){2,3}(?: [0-9]{1,4})?|[0-9]{4}(?:-[0-9]{4}){2,3}(?:-[0-9]{1,4})?|[0-9]{4} [0-9]{6} [0-9]{4,5}|[0-9]{4}-[0-9]{6}-[0-9]{4,5})(?![0-9A-Za-z])/g;

function hasNumericChainNeighbor(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 5), start);
  const after = text.slice(end, Math.min(text.length, end + 5));
  if (/[0-9]{2,}[ -]$/.test(before)) return true;
  if (/^[ -][0-9]{2,}/.test(after)) return true;
  return false;
}

function spansOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

export function detectEntitiesInText(text: string, locationLabel?: string): DetectionOutput {
  if (!text) {
    return { entities: [], flagged: [] };
  }

  const boundedText = text.length > MAX_CELL_SCAN_LENGTH ? text.slice(0, MAX_CELL_SCAN_LENGTH) : text;
  const candidates: Entity[] = [];
  const flaggedRaw: FlaggedCandidate[] = [];
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${++seq}`;

  // 1. Emails
  EMAIL_RE.lastIndex = 0;
  for (let m = EMAIL_RE.exec(boundedText); m !== null; m = EMAIL_RE.exec(boundedText)) {
    const raw = m[1];
    if (!raw) continue;
    const local = raw.split('@')[0] ?? '';
    if (local.includes('..')) continue;
    candidates.push({
      id: nextId('ent'),
      type: 'EMAIL',
      start: m.index,
      end: m.index + raw.length,
      raw,
      canonical: normalizeEmail(raw),
      confidence: 'pattern',
      validationNote: 'email-pattern',
    });
  }

  // 2. Credit Cards (Luhn validated; invalid/repeated flagged separately)
  CARD_RE.lastIndex = 0;
  for (let m = CARD_RE.exec(boundedText); m !== null; m = CARD_RE.exec(boundedText)) {
    const raw = m[1];
    if (!raw) continue;
    const start = m.index;
    const end = start + raw.length;
    if (hasNumericChainNeighbor(boundedText, start, end)) continue;

    const digits = normalizeCard(raw);
    if (digits.length < 13 || digits.length > 19) continue;

    if (isRepeatedDigitSequence(digits)) {
      flaggedRaw.push({
        id: nextId('flag'),
        type: 'CARD',
        start,
        end,
        raw,
        reason: 'Rejected: repeated identical digits heuristic (not counted as validated card).',
        locationLabel,
      });
      continue;
    }

    if (!isValidLuhn(digits)) {
      flaggedRaw.push({
        id: nextId('flag'),
        type: 'CARD',
        start,
        end,
        raw,
        reason: 'Rejected by Luhn checksum — not counted as validated card; review manually if sensitive.',
        locationLabel,
      });
      continue;
    }

    candidates.push({
      id: nextId('ent'),
      type: 'CARD',
      start,
      end,
      raw,
      canonical: digits,
      confidence: 'validated',
      validationNote: 'card-luhn-valid',
    });
  }

  // 3. IPv4 (strict 0-255 octets)
  IPV4_RE.lastIndex = 0;
  for (let m = IPV4_RE.exec(boundedText); m !== null; m = IPV4_RE.exec(boundedText)) {
    const raw = m[1];
    if (!raw) continue;
    const start = m.index;
    const end = start + raw.length;
    if (start >= 2 && boundedText[start - 1] === '.' && /[0-9A-Za-z]/.test(boundedText[start - 2] ?? '')) {
      continue;
    }

    if (parseIPv4(raw)) {
      candidates.push({
        id: nextId('ent'),
        type: 'IP',
        start,
        end,
        raw,
        canonical: normalizeIp(raw),
        confidence: 'validated',
        validationNote: 'ipv4-valid-octets',
      });
    } else {
      flaggedRaw.push({
        id: nextId('flag'),
        type: 'IP',
        start,
        end,
        raw,
        reason: 'Rejected invalid IPv4 candidate (octets must be 0–255 without leading zeros).',
        locationLabel,
      });
    }
  }

  // 4. IPv6 (local RFC 4291 / 5952 parser)
  IPV6_RE.lastIndex = 0;
  for (let m = IPV6_RE.exec(boundedText); m !== null; m = IPV6_RE.exec(boundedText)) {
    let raw = m[0];
    if (!raw) continue;
    const start = m.index;
    // Strip trailing sentence punctuation like "." or single ":" (preserve "::")
    while (raw.length > 2 && (raw.endsWith('.') || (raw.endsWith(':') && !raw.endsWith('::')))) {
      raw = raw.slice(0, -1);
    }
    const end = start + raw.length;
    const normalized = parseAndNormalizeIPv6(raw);
    if (!normalized) continue;

    candidates.push({
      id: nextId('ent'),
      type: 'IP',
      start,
      end,
      raw,
      canonical: normalized,
      confidence: 'validated',
      validationNote: 'ipv6-parsed',
    });
  }

  // 5. Aadhaar (12-digit format with optional Verhoeff validation)
  AADHAAR_RE.lastIndex = 0;
  for (let m = AADHAAR_RE.exec(boundedText); m !== null; m = AADHAAR_RE.exec(boundedText)) {
    const raw = m[1];
    if (!raw) continue;
    const start = m.index;
    const end = start + raw.length;
    if (hasNumericChainNeighbor(boundedText, start, end)) continue;

    const canonical = normalizeAadhaar(raw);
    const verhoeffOk = isValidVerhoeff(canonical);

    candidates.push({
      id: nextId('ent'),
      type: 'AADHAAR',
      start,
      end,
      raw,
      canonical,
      confidence: verhoeffOk ? 'validated' : 'pattern',
      validationNote: verhoeffOk ? 'aadhaar-verhoeff-valid' : 'aadhaar-verhoeff-invalid',
      needsReview: !verhoeffOk,
      reviewReason: verhoeffOk
        ? undefined
        : 'Matches 12-digit Aadhaar format (starts 2–9), but Verhoeff checksum failed. Masked conservatively; not identity-verified.',
    });
  }

  // 6. PAN (5 letters, 4 digits, 1 letter, case-insensitive)
  PAN_RE.lastIndex = 0;
  for (let m = PAN_RE.exec(boundedText); m !== null; m = PAN_RE.exec(boundedText)) {
    const raw = m[1];
    if (!raw) continue;
    candidates.push({
      id: nextId('ent'),
      type: 'PAN',
      start: m.index,
      end: m.index + raw.length,
      raw,
      canonical: normalizePan(raw),
      confidence: 'pattern',
      validationNote: 'pan-format',
    });
  }

  // 7. Indian mobile phones
  PHONE_RE.lastIndex = 0;
  for (let m = PHONE_RE.exec(boundedText); m !== null; m = PHONE_RE.exec(boundedText)) {
    const raw = m[1];
    if (!raw) continue;
    const start = m.index;
    const end = start + raw.length;
    const hasExplicitPrefix = /^(\(\+91\)|\+91|91|0)/.test(raw);
    if (!hasExplicitPrefix && hasNumericChainNeighbor(boundedText, start, end)) {
      continue;
    }
    if (hasExplicitPrefix && /^[ -][0-9]{2,}/.test(boundedText.slice(end, end + 5))) {
      continue;
    }

    candidates.push({
      id: nextId('ent'),
      type: 'PHONE',
      start,
      end,
      raw,
      canonical: normalizePhone(raw),
      confidence: 'pattern',
      validationNote: 'phone-in-format',
    });
  }

  const entities = resolveOverlaps(candidates);

  // Filter out flagged candidates that overlap an accepted entity (e.g. IPv4 inside IPv6)
  const flagged = flaggedRaw.filter(
    (flag) => !entities.some((ent) => spansOverlap(flag, ent))
  );

  return { entities, flagged };
}
