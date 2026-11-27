import { describe, expect, it } from 'vitest';
import {
  applySpreadsheetSafetyToTable,
  isFormulaInjectionRisk,
  parseCsvLocally,
  serializeCsvLocally,
} from '../../src/engine';

describe('CSV Parsing, Edge Cases & Spreadsheet Safety', () => {
  it('handles UTF-8 BOM, CRLF, quoted commas, escaped quotes, multiline cells, Unicode, and trailing newline', () => {
    const csv =
      '\uFEFFdistrict,notes,email\r\n' +
      'Pune,"Line 1, ""quoted""\r\nLine 2 (पुणे)",ravi@example.com\r\n' +
      'Nashik,,team@example.org\r\n';

    const parsed = parseCsvLocally(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.hasBom).toBe(true);
    expect(parsed.lineEnding).toBe('\r\n');
    expect(parsed.hadTrailingNewline).toBe(true);
    expect(parsed.headers).toEqual(['district', 'notes', 'email']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.[1]).toBe('Line 1, "quoted"\r\nLine 2 (पुणे)');
    expect(parsed.rows[1]?.[1]).toBe('');

    const reserialized = serializeCsvLocally(parsed.headers, parsed.rows, '\n', true);
    const reparsed = parseCsvLocally(reserialized);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.rows).toEqual(parsed.rows);
  });

  it('rejects malformed CSV with unclosed quotes clearly', () => {
    const badCsv = 'a,b\n"unclosed quote,val\n';
    const parsed = parseCsvLocally(badCsv);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.toLowerCase()).toContain('unclosed');
    }
  });

  it('neutralizes formula injection triggers while preserving ordinary negative numbers', () => {
    expect(isFormulaInjectionRisk('=SUM(A1:A5)')).toBe(true);
    expect(isFormulaInjectionRisk('@cmd')).toBe(true);
    expect(isFormulaInjectionRisk('+cmd|calc')).toBe(true);
    expect(isFormulaInjectionRisk('-2+3')).toBe(true);
    expect(isFormulaInjectionRisk('-42')).toBe(false);
    expect(isFormulaInjectionRisk('-3.14')).toBe(false);
    expect(isFormulaInjectionRisk('Pune')).toBe(false);

    const safe = applySpreadsheetSafetyToTable(
      ['district', 'family_size', 'notes'],
      [
        ['Pune', '-5', '=HYPERLINK("http://bad")'],
        ['Satara', '3', '+cmd|note'],
      ],
      true
    );

    expect(safe.rows[0]?.[1]).toBe('-5');
    expect(safe.rows[0]?.[2]).toBe("'=HYPERLINK(\"http://bad\")");
    expect(safe.rows[1]?.[2]).toBe("'+cmd|note");
    expect(safe.neutralizations).toHaveLength(2);
  });
});
