import Papa from 'papaparse';
import type { FormulaNeutralizationEvent } from './types';

export type ParsedCsvResult =
  | {
      ok: true;
      headers: string[];
      rows: string[][];
      hasBom: boolean;
      lineEnding: '\r\n' | '\n';
      hadTrailingNewline: boolean;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Parses CSV text locally using PapaParse with strict handling for BOM, CRLF/LF,
 * quoted commas, escaped quotes, multiline fields, empty cells, trailing newlines,
 * Unicode, and malformed quote detection.
 */
export function parseCsvLocally(rawInput: string): ParsedCsvResult {
  if (!rawInput || rawInput.trim().length === 0) {
    return { ok: false, error: 'CSV input is empty.' };
  }

  const hasBom = rawInput.startsWith('\uFEFF');
  const cleanText = hasBom ? rawInput.slice(1) : rawInput;
  const lineEnding: '\r\n' | '\n' = cleanText.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingNewline = cleanText.endsWith('\n') || cleanText.endsWith('\r');

  // Check for obvious unclosed quotes before/alongside PapaParse
  let inQuotes = false;
  for (let i = 0; i < cleanText.length; i++) {
    if (cleanText[i] === '"') {
      if (inQuotes && cleanText[i + 1] === '"') {
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    }
  }
  if (inQuotes) {
    return {
      ok: false,
      error: 'Malformed CSV: unclosed quotation mark detected. Fix quotes before processing or exporting.',
    };
  }

  const parsed = Papa.parse<string[]>(cleanText, {
    header: false,
    skipEmptyLines: false,
    quoteChar: '"',
    escapeChar: '"',
  });

  const criticalErrors = parsed.errors.filter((err) => err.type === 'Quotes' || err.type === 'FieldMismatch');
  const quoteError = criticalErrors.find((e) => e.type === 'Quotes');
  if (quoteError) {
    return {
      ok: false,
      error: `Malformed CSV near row ${(quoteError.row ?? 0) + 1}: ${quoteError.message}`,
    };
  }

  const rawRows = parsed.data.map((r) => r.map((cell) => (cell === undefined || cell === null ? '' : String(cell))));

  // Remove single final synthetic empty row produced by a trailing newline
  if (
    hadTrailingNewline &&
    rawRows.length > 1 &&
    rawRows[rawRows.length - 1]?.length === 1 &&
    rawRows[rawRows.length - 1]?.[0] === ''
  ) {
    rawRows.pop();
  }

  if (rawRows.length === 0) {
    return { ok: false, error: 'No CSV rows found.' };
  }

  const headers = rawRows[0] ?? [];
  if (headers.length === 0 || (headers.length === 1 && headers[0] === '')) {
    return { ok: false, error: 'CSV header row is empty.' };
  }

  const dataRows = rawRows.slice(1);
  const warnings: string[] = [];
  const expectedCols = headers.length;
  let mismatchedRows = 0;

  const normalizedRows = dataRows.map((row) => {
    if (row.length !== expectedCols) {
      mismatchedRows++;
    }
    if (row.length < expectedCols) {
      return [...row, ...new Array<string>(expectedCols - row.length).fill('')];
    }
    return row;
  });

  if (mismatchedRows > 0) {
    warnings.push(
      `${mismatchedRows} CSV row(s) had a different column count than the header (${expectedCols} columns) and were padded/preserved during preview.`
    );
  }

  return {
    ok: true,
    headers,
    rows: normalizedRows,
    hasBom,
    lineEnding,
    hadTrailingNewline,
    warnings,
  };
}

/**
 * Checks whether a cell starts with a spreadsheet formula trigger.
 * Preserves ordinary signed numeric values (e.g. "-5", "+12.5") without silent mutation.
 */
export function isFormulaInjectionRisk(cellValue: string): boolean {
  if (!cellValue) return false;
  const first = cellValue[0];
  if (first === '=' || first === '@' || first === '\t' || first === '\r' || first === '\n') {
    return true;
  }
  if (first === '+' || first === '-') {
    // Allow plain signed numbers like -42 or -3.14; neutralize formula-like strings such as +cmd|... or -2+3
    return !/^[+-]\d+(?:\.\d+)?$/.test(cellValue.trim());
  }
  return false;
}

export function applySpreadsheetSafetyToTable(
  headers: string[],
  rows: string[][],
  enabled: boolean
): {
  headers: string[];
  rows: string[][];
  neutralizations: FormulaNeutralizationEvent[];
} {
  if (!enabled) {
    return { headers, rows, neutralizations: [] };
  }

  const neutralizations: FormulaNeutralizationEvent[] = [];

  const safeHeaders = headers.map((cell, colIndex) => {
    if (isFormulaInjectionRisk(cell)) {
      neutralizations.push({
        row: -1,
        col: colIndex,
        columnName: `Header[${colIndex + 1}]`,
        triggerChar: cell[0] ?? '',
      });
      return `'${cell}`;
    }
    return cell;
  });

  const safeRows = rows.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (isFormulaInjectionRisk(cell)) {
        neutralizations.push({
          row: rowIndex,
          col: colIndex,
          columnName: headers[colIndex] ?? `Col ${colIndex + 1}`,
          triggerChar: cell[0] ?? '',
        });
        return `'${cell}`;
      }
      return cell;
    })
  );

  return { headers: safeHeaders, rows: safeRows, neutralizations };
}

/**
 * Serializes sanitized headers and rows back to RFC-4180-compatible CSV using PapaParse.
 * Documented behavior: normalizes line endings to chosen delimiter and quotes fields containing
 * delimiters, quotes, or newlines.
 */
export function serializeCsvLocally(
  headers: string[],
  rows: string[][],
  lineEnding: '\r\n' | '\n' = '\n',
  includeTrailingNewline = true
): string {
  const csv = Papa.unparse([headers, ...rows], {
    quotes: false,
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ',',
    newline: lineEnding,
  });
  return includeTrailingNewline && !csv.endsWith(lineEnding) ? `${csv}${lineEnding}` : csv;
}
