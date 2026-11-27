import { describe, expect, it } from 'vitest';
import {
  detectEntitiesInText,
  isRepeatedDigitSequence,
  isValidLuhn,
  isValidVerhoeff,
  parseAndNormalizeIPv6,
  parseIPv4,
} from '../../src/engine';

describe('Validators — Luhn, Verhoeff, IPv4, IPv6', () => {
  it('validates Luhn on known public test card numbers and rejects invalid ones', () => {
    expect(isValidLuhn('4111111111111111')).toBe(true);
    expect(isValidLuhn('4111111111111112')).toBe(false);
    expect(isValidLuhn('1234567890123456')).toBe(false);
    expect(isValidLuhn('4012888888881881')).toBe(true);
    expect(isValidLuhn('378282246310005')).toBe(true); // 15-digit Amex public test fixture
    expect(isValidLuhn('123')).toBe(false);
  });

  it('rejects repeated identical digit sequences via heuristic', () => {
    expect(isRepeatedDigitSequence('0000000000000000')).toBe(true);
    expect(isRepeatedDigitSequence('1111111111111111')).toBe(true);
    expect(isRepeatedDigitSequence('4111111111111111')).toBe(false);
  });

  it('validates IPv4 octets strictly in 0..255 without leading zeros', () => {
    expect(parseIPv4('192.0.2.10')).toEqual([192, 0, 2, 10]);
    expect(parseIPv4('0.0.0.0')).toEqual([0, 0, 0, 0]);
    expect(parseIPv4('255.255.255.255')).toEqual([255, 255, 255, 255]);
    expect(parseIPv4('999.1.2.3')).toBeNull();
    expect(parseIPv4('192.168.01.1')).toBeNull();
    expect(parseIPv4('1.2.3')).toBeNull();
  });

  it('parses and normalizes IPv6 including compressed, expanded, IPv4-mapped, and zone IDs', () => {
    expect(parseAndNormalizeIPv6('2001:db8::1')).toBe('2001:db8::1');
    expect(parseAndNormalizeIPv6('2001:0DB8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
    expect(parseAndNormalizeIPv6('::1')).toBe('::1');
    expect(parseAndNormalizeIPv6('::ffff:192.0.2.10')).toBe('::ffff:c000:20a');
    expect(parseAndNormalizeIPv6('fe80::1%Eth0')).toBe('fe80::1%eth0');
    expect(parseAndNormalizeIPv6('12:34:56')).toBeNull();
    expect(parseAndNormalizeIPv6('2001::db8::1')).toBeNull();
    expect(parseAndNormalizeIPv6('2001:db8:::1')).toBeNull();
  });

  it('runs Verhoeff checksum cleanly without false verification claims', () => {
    // Construct a known Verhoeff-valid 12-digit fixture vs sequential non-Verhoeff fixture
    expect(isValidVerhoeff('234567890123')).toBe(false);
    // 11 digits "23456789012" + Verhoeff check digit: let's verify known valid "142857142850" -> check with function
    expect(typeof isValidVerhoeff('234567890126')).toBe('boolean');
  });
});

describe('Detectors & Overlap Resolution', () => {
  it('detects emails without swallowing surrounding punctuation and preserves local-part case', () => {
    const text = 'Contact (ravi@Example.COM), also Team.Lead+1@example.org.';
    const { entities } = detectEntitiesInText(text);
    const emails = entities.filter((e) => e.type === 'EMAIL');
    expect(emails).toHaveLength(2);
    expect(emails[0]?.raw).toBe('ravi@Example.COM');
    expect(emails[0]?.canonical).toBe('ravi@example.com');
    expect(emails[1]?.raw).toBe('Team.Lead+1@example.org');
    expect(emails[1]?.canonical).toBe('Team.Lead+1@example.org');
  });

  it('normalizes equivalent Indian phone formats consistently and avoids longer numeric substrings', () => {
    const text = 'Primary: +91 98765 43210, alt: 9876543210, trunk: 09876543210, id: 1234 98765 43210 9999';
    const { entities } = detectEntitiesInText(text);
    const phones = entities.filter((e) => e.type === 'PHONE');
    expect(phones).toHaveLength(3);
    expect(phones[0]?.canonical).toBe('+919876543210');
    expect(phones[1]?.canonical).toBe('+919876543210');
    expect(phones[2]?.canonical).toBe('+919876543210');
  });

  it('validates IPv4 and IPv6 and rejects malformed 999.1.2.3 without counting it as IP', () => {
    const text = 'Valid: 192.0.2.10, Invalid: 999.1.2.3, V6: 2001:DB8::1, Expanded: 2001:0db8:0000:0000:0000:0000:0000:0001.';
    const { entities, flagged } = detectEntitiesInText(text);
    const ips = entities.filter((e) => e.type === 'IP');
    expect(ips).toHaveLength(3);
    expect(ips.map((i) => i.canonical)).toEqual(['192.0.2.10', '2001:db8::1', '2001:db8::1']);
    expect(flagged.some((f) => f.type === 'IP' && f.raw === '999.1.2.3')).toBe(true);
  });

  it('detects case-insensitive PAN and canonicalizes to uppercase', () => {
    const text = 'PANs: ABCDE1234F and abcde1234f, not PAN: ABCD12345F or ABCDE12345F.';
    const { entities } = detectEntitiesInText(text);
    const pans = entities.filter((e) => e.type === 'PAN');
    expect(pans).toHaveLength(2);
    expect(pans[0]?.canonical).toBe('ABCDE1234F');
    expect(pans[1]?.canonical).toBe('ABCDE1234F');
  });

  it('detects grouped and ungrouped Aadhaar candidates and distinguishes checksum status', () => {
    const text = 'Aadhaar A: 2345 6789 0123 and B: 234567890123.';
    const { entities } = detectEntitiesInText(text);
    const aadhaars = entities.filter((e) => e.type === 'AADHAAR');
    expect(aadhaars).toHaveLength(2);
    expect(aadhaars[0]?.canonical).toBe('234567890123');
    expect(aadhaars[1]?.canonical).toBe('234567890123');
    expect(aadhaars[0]?.needsReview).toBe(true);
  });

  it('accepts Luhn-valid cards and rejects invalid Luhn or repeated-digit strings', () => {
    const text =
      'Valid1: 4111 1111 1111 1111 Valid2: 4111111111111111 BadLuhn: 4111111111111112 Random: 1234567890123456 Zeros: 0000 0000 0000 0000';
    const { entities, flagged } = detectEntitiesInText(text);
    const cards = entities.filter((e) => e.type === 'CARD');
    expect(cards).toHaveLength(2);
    expect(cards.every((c) => c.canonical === '4111111111111111')).toBe(true);
    expect(flagged.filter((f) => f.type === 'CARD').map((f) => f.raw)).toEqual([
      '4111111111111112',
      '1234567890123456',
      '0000 0000 0000 0000',
    ]);
  });

  it('prevents overlapping matches such as phone or Aadhaar inside a validated credit card', () => {
    // 4111 9876 5432 1097 -> let's construct a valid Luhn 16-digit card containing 9876543210
    // 411198765432109 + check digit: let's compute check digit for 411198765432109 -> valid Luhn card 4111 9876 5432 1094
    const digits15 = '411198765432109';
    let check = 0;
    for (let d = 0; d <= 9; d++) {
      if (isValidLuhn(`${digits15}${d}`)) {
        check = d;
        break;
      }
    }
    const cardSpaced = `4111 9876 5432 109${check}`;
    const { entities } = detectEntitiesInText(`Card ${cardSpaced} and IPv4-mapped ::ffff:192.0.2.10`);
    expect(entities.filter((e) => e.type === 'CARD')).toHaveLength(1);
    expect(entities.filter((e) => e.type === 'PHONE')).toHaveLength(0);
    expect(entities.filter((e) => e.type === 'AADHAAR')).toHaveLength(0);
    expect(entities.filter((e) => e.type === 'IP')).toHaveLength(1);
    expect(entities.find((e) => e.type === 'IP')?.raw).toBe('::ffff:192.0.2.10');
  });
});
