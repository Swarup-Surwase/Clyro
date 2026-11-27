import { parseAndNormalizeIPv6, parseIPv4 } from './validators';

/**
 * Canonicalizes an email by preserving local-part case and lowercasing the domain.
 * Documented policy per SKILL.md Section 5.
 */
export function normalizeEmail(raw: string): string {
  const atIndex = raw.lastIndexOf('@');
  if (atIndex === -1) return raw.trim();
  const local = raw.slice(0, atIndex);
  const domain = raw.slice(atIndex + 1).toLowerCase();
  return `${local}@${domain}`;
}

/**
 * Canonicalizes Indian mobile numbers (+91 / 0 trunk / 10-digit) to "+91XXXXXXXXXX".
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return `+91${digits.slice(-10)}`;
}

/**
 * Canonicalizes IPv4 or IPv6 into standard form.
 */
export function normalizeIp(raw: string): string {
  const ipv4 = parseIPv4(raw);
  if (ipv4) {
    return ipv4.join('.');
  }
  const ipv6 = parseAndNormalizeIPv6(raw);
  if (ipv6) {
    return ipv6;
  }
  return raw.toLowerCase();
}

/**
 * Canonicalizes PAN to uppercase.
 */
export function normalizePan(raw: string): string {
  return raw.toUpperCase();
}

/**
 * Canonicalizes Aadhaar to 12 ungrouped digits.
 */
export function normalizeAadhaar(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Canonicalizes payment card digits by stripping spaces and hyphens.
 */
export function normalizeCard(raw: string): string {
  return raw.replace(/\D/g, '');
}
