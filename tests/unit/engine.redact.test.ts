import { describe, expect, it } from 'vitest';
import {
  createPseudonymRegistry,
  detectEntitiesInText,
  FULL_MASK_MARKER,
  redactTextWithEntities,
} from '../../src/engine';

describe('Redaction Modes & Pseudonymization Consistency', () => {
  const sample =
    'Email1: ravi@example.com, Email2: ravi@example.com, Other: team@example.org. ' +
    'Phone1: +91 98765 43210, Phone2: 9876543210, Phone3: 9820111223. ' +
    'IP: 192.0.2.10, PAN: ABCDE1234F, Aadhaar: 2345 6789 0123, Card: 4111 1111 1111 1111.';

  it('replaces every detected entity with [REDACTED] in full mask mode while preserving text', () => {
    const { entities } = detectEntitiesInText(sample);
    const registry = createPseudonymRegistry('default');
    const result = redactTextWithEntities(sample, entities, { mode: 'full', registry });

    expect(result.segments).toHaveLength(entities.length);
    expect(result.segments.every((s) => s.replacement === FULL_MASK_MARKER)).toBe(true);
    expect(result.sanitizedText).not.toContain('ravi@example.com');
    expect(result.sanitizedText).not.toContain('9876543210');
    expect(result.sanitizedText).not.toContain('ABCDE1234F');
    expect(result.sanitizedText).not.toContain('4111 1111 1111 1111');
    expect(result.sanitizedText).toContain('Email1: [REDACTED], Email2: [REDACTED]');
  });

  it('applies conservative partial masking retaining only intended minimal context', () => {
    const { entities } = detectEntitiesInText(sample);
    const registry = createPseudonymRegistry('default');
    const result = redactTextWithEntities(sample, entities, { mode: 'partial', registry });

    expect(result.sanitizedText).toContain('r***@***');
    expect(result.sanitizedText).toContain('XXXXXX3210');
    expect(result.sanitizedText).toContain('192.X.X.X');
    expect(result.sanitizedText).toContain('XXXXX123X');
    expect(result.sanitizedText).toContain('XXXX-XXXX-0123');
    expect(result.sanitizedText).toContain('XXXX-XXXX-XXXX-1111');
    expect(result.sanitizedText).not.toContain('example.com');
    expect(result.sanitizedText).not.toContain('98765');
  });

  it('assigns identical pseudonyms to repeated canonical values and distinct tokens to distinct entities', () => {
    const { entities } = detectEntitiesInText(sample);
    const registry = createPseudonymRegistry('default');
    const result = redactTextWithEntities(sample, entities, { mode: 'pseudonym', registry });

    expect(result.sanitizedText).toContain('Email1: EMAIL_001, Email2: EMAIL_001, Other: EMAIL_002.');
    expect(result.sanitizedText).toContain('Phone1: PHONE_001, Phone2: PHONE_001, Phone3: PHONE_002.');
    expect(result.sanitizedText).toContain('IP: IP_001, PAN: PAN_001, Aadhaar: AADHAAR_001, Card: CARD_001.');
  });

  it('maintains independent namespaced pseudonyms across recipient scopes', () => {
    const { entities } = detectEntitiesInText('Contact: +91 98765 43210 and 9876543210');
    const ngoReg = createPseudonymRegistry('ngo', 'A7F2');
    const hospReg = createPseudonymRegistry('hospital', 'B8C3');

    const ngoOut = redactTextWithEntities('Contact: +91 98765 43210 and 9876543210', entities, {
      mode: 'pseudonym',
      registry: ngoReg,
    });
    const hospOut = redactTextWithEntities('Contact: +91 98765 43210 and 9876543210', entities, {
      mode: 'pseudonym',
      registry: hospReg,
    });

    expect(ngoOut.sanitizedText).toBe('Contact: NGO_A7F2_PHONE_001 and NGO_A7F2_PHONE_001');
    expect(hospOut.sanitizedText).toBe('Contact: HOSPITAL_B8C3_PHONE_001 and HOSPITAL_B8C3_PHONE_001');
  });
});
