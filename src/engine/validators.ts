/**
 * Local-only format and checksum validators.
 * Never makes network calls or contacts external registries.
 */

const VERHOEFF_D: readonly number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P: readonly number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Validates numeric string using the Luhn checksum algorithm.
 * Expects digits only; returns false if empty or non-digits.
 */
export function isValidLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    const digit = digits.charCodeAt(i) - 48;
    if (shouldDouble) {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += digit;
    }
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Rejects trivial all-same-digit sequences (e.g. 0000000000000000, 1111111111111111).
 */
export function isRepeatedDigitSequence(digits: string): boolean {
  if (digits.length === 0) return false;
  const first = digits[0];
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== first) return false;
  }
  return true;
}

/**
 * Validates a 12-digit numeric string against the Verhoeff checksum.
 * Note: Verhoeff validity does not prove government issuance.
 */
export function isValidVerhoeff(digits: string): boolean {
  if (!/^\d{12}$/.test(digits)) {
    return false;
  }
  let c = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    const digit = digits.charCodeAt(len - 1 - i) - 48;
    const pRow = VERHOEFF_P[i % 8];
    const dRow = VERHOEFF_D[c];
    if (!pRow || !dRow) return false;
    const mapped = pRow[digit];
    if (mapped === undefined) return false;
    const next = dRow[mapped];
    if (next === undefined) return false;
    c = next;
  }
  return c === 0;
}

/**
 * Validates strict dotted IPv4 address (each octet 0..255, no leading zeros like "01").
 */
export function parseIPv4(candidate: string): number[] | null {
  const parts = candidate.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith('0')) return null;
    const num = Number(part);
    if (!Number.isInteger(num) || num < 0 || num > 255) return null;
    octets.push(num);
  }
  return octets;
}

/**
 * Parses IPv6 (including compressed "::", IPv4-mapped suffix, and optional "%zone").
 * Returns normalized RFC 5952 lowercase representation or null if invalid.
 */
export function parseAndNormalizeIPv6(candidate: string): string | null {
  if (!candidate || candidate.length > 64) return null;

  let addrPart = candidate;
  let zonePart: string | null = null;

  const pctIndex = candidate.indexOf('%');
  if (pctIndex !== -1) {
    addrPart = candidate.slice(0, pctIndex);
    zonePart = candidate.slice(pctIndex + 1);
    if (!zonePart || !/^[A-Za-z0-9._-]+$/.test(zonePart)) {
      return null;
    }
  }

  // Must contain at least two colons to be IPv6
  const colonCount = (addrPart.match(/:/g) ?? []).length;
  if (colonCount < 2) return null;

  // Reject triple colons
  if (addrPart.includes(':::')) return null;

  const doubleColonParts = addrPart.split('::');
  if (doubleColonParts.length > 2) return null;

  const hasCompression = doubleColonParts.length === 2;
  const leftRaw = doubleColonParts[0] ?? '';
  const rightRaw = doubleColonParts[1] ?? '';

  const parseSide = (side: string, allowIpv4Tail: boolean): number[] | null => {
    if (side === '') return [];
    const tokens = side.split(':');
    const hextets: number[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === undefined || token === '') return null;

      if (token.includes('.')) {
        // Embedded IPv4 only allowed as the very last token on the right/only side
        if (!allowIpv4Tail || i !== tokens.length - 1) {
          return null;
        }
        const ipv4 = parseIPv4(token);
        if (!ipv4 || ipv4.length !== 4) return null;
        const [a, b, c, d] = ipv4;
        if (a === undefined || b === undefined || c === undefined || d === undefined) return null;
        hextets.push((a << 8) | b);
        hextets.push((c << 8) | d);
      } else {
        if (!/^[0-9A-Fa-f]{1,4}$/.test(token)) return null;
        hextets.push(parseInt(token, 16));
      }
    }
    return hextets;
  };

  const leftHextets = parseSide(leftRaw, !hasCompression);
  const rightHextets = hasCompression ? parseSide(rightRaw, true) : [];

  if (!leftHextets || !rightHextets) return null;

  const totalExplicit = leftHextets.length + rightHextets.length;
  if (hasCompression) {
    if (totalExplicit >= 8) return null;
  } else {
    if (totalExplicit !== 8) return null;
  }

  const zeroFillCount = 8 - totalExplicit;
  const full: number[] = [
    ...leftHextets,
    ...new Array<number>(zeroFillCount).fill(0),
    ...rightHextets,
  ];

  if (full.length !== 8) return null;

  // Format per RFC 5952: compress longest run of >=2 zeros, first wins ties
  let bestStart = -1;
  let bestLen = 0;
  let currStart = -1;
  let currLen = 0;

  for (let i = 0; i < 8; i++) {
    if (full[i] === 0) {
      if (currStart === -1) {
        currStart = i;
        currLen = 1;
      } else {
        currLen++;
      }
      if (currLen > bestLen) {
        bestStart = currStart;
        bestLen = currLen;
      }
    } else {
      currStart = -1;
      currLen = 0;
    }
  }

  if (bestLen < 2) {
    bestStart = -1;
    bestLen = 0;
  }

  const parts: string[] = [];
  let i = 0;
  while (i < 8) {
    if (i === bestStart) {
      parts.push('');
      if (i === 0) parts.push('');
      i += bestLen;
      if (i === 8) parts.push('');
    } else {
      const val = full[i];
      if (val === undefined) return null;
      parts.push(val.toString(16));
      i++;
    }
  }

  const normalized = parts.join(':');
  return zonePart !== null ? `${normalized}%${zonePart.toLowerCase()}` : normalized;
}
