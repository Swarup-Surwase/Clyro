import { describe, expect, it } from 'vitest';
import { createPseudonymRegistry, runSanitizationPipeline } from '../../src/engine';
import { SYNTHETIC_RELIEF_CSV } from '../../src/fixtures/syntheticRelief';

describe('Full Sanitization Pipeline & Audit Reconciliation', () => {
  it('reconciles occurrence counts, unique counts, and pseudonymized CSV export on synthetic dataset', () => {
    const registry = createPseudonymRegistry('default');
    const result = runSanitizationPipeline({
      input: SYNTHETIC_RELIEF_CSV,
      format: 'csv',
      mode: 'pseudonym',
      recipientScope: 'default',
      registry,
    });

    expect(result.parseOk).toBe(true);
    expect(result.stats.categoriesDetected).toBe(6);

    // Check exact reconciliation: totalOccurrences == sum of countsByCategory == replacedOccurrences
    const sumByCat = Object.values(result.stats.countsByCategory).reduce((a, b) => a + b, 0);
    expect(result.stats.totalOccurrences).toBe(sumByCat);
    expect(result.stats.replacedOccurrences).toBe(result.stats.totalOccurrences);

    // Repeated email ravi@example.com in rows 1 & 2 gets EMAIL_001 both times
    expect(result.csvSanitizedRows[0]?.[6]).toBe('EMAIL_001');
    expect(result.csvSanitizedRows[1]?.[6]).toBe('EMAIL_001');
    expect(result.csvSanitizedRows[2]?.[6]).toBe('EMAIL_002');

    // Repeated phone +91 98765 43210 and 9876543210 get PHONE_001 both times
    expect(result.csvSanitizedRows[0]?.[7]).toBe('PHONE_001');
    expect(result.csvSanitizedRows[1]?.[7]).toBe('PHONE_001');

    // Valid card 4111...1111 gets CARD_001 in both rows; invalid 4111...1112 & 1234567890123456 & 0000... are NOT masked as CARD
    expect(result.csvSanitizedRows[0]?.[11]).toBe('CARD_001');
    expect(result.csvSanitizedRows[1]?.[11]).toBe('CARD_001');
    expect(result.csvSanitizedRows[2]?.[11]).toBe('4111111111111112');
    expect(result.stats.countsByCategory.CARD).toBe(2);
    expect(result.stats.uniqueByCategory.CARD).toBe(1);
    expect(result.auditReport.validationCoverage.luhnRejectedCandidates).toBe(3);

    // Operational relief data preserved
    expect(result.csvSanitizedRows[0]?.[1]).toBe('Pune');
    expect(result.csvSanitizedRows[0]?.[2]).toBe('5');
    expect(result.csvSanitizedRows[0]?.[3]).toBe('Food, clean water, and tarpaulin');

    // Audit report contains zero raw PII values
    const auditJson = JSON.stringify(result.auditReport);
    expect(auditJson).not.toContain('ravi@example.com');
    expect(auditJson).not.toContain('9876543210');
    expect(auditJson).not.toContain('ABCDE1234F');
    expect(auditJson).not.toContain('4111');
  });

  it('applies recipient column minimization policies safely in NGO handover scope', () => {
    const result = runSanitizationPipeline({
      input: SYNTHETIC_RELIEF_CSV,
      format: 'csv',
      mode: 'pseudonym',
      recipientScope: 'ngo',
    });

    expect(result.parseOk).toBe(true);
    expect(result.csvSanitizedHeaders).toContain('district');
    expect(result.csvSanitizedHeaders).toContain('family_size');
    expect(result.csvSanitizedHeaders).toContain('assistance');
    expect(result.csvSanitizedHeaders).not.toContain('aadhaar');
    expect(result.csvSanitizedHeaders).not.toContain('card');
    expect(result.csvSanitizedHeaders).not.toContain('pan');
    expect(result.csvSanitizedHeaders).not.toContain('notes');
  });

  it('handles empty input and no-match input with appropriate warnings', () => {
    const empty = runSanitizationPipeline({
      input: '',
      format: 'txt',
      mode: 'full',
      recipientScope: 'default',
    });
    expect(empty.stats.totalOccurrences).toBe(0);
    expect(empty.sanitizedOutput).toBe('');

    const noMatch = runSanitizationPipeline({
      input: 'District: Pune. Five blankets needed at community hall.',
      format: 'txt',
      mode: 'full',
      recipientScope: 'default',
    });
    expect(noMatch.stats.totalOccurrences).toBe(0);
    expect(noMatch.warnings.some((w) => w.includes('Zero pattern-matched entities'))).toBe(true);
  });
});
