import { useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  Download,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  RECIPIENT_PRESETS,
  type RecipientType,
} from '../engine';
import { useSanitizerStore } from '../hooks/useSanitizerStore';
import { triggerLocalDownload } from '../utils/download';

const HANDOVER_SCOPES: RecipientType[] = [
  'ngo',
  'hospital',
  'municipal',
  'volunteer',
  'custom',
  'default',
];

export function HandoverPage() {
  const {
    input,
    format,
    mode,
    setMode,
    recipientScope,
    setRecipientScope,
    scopeIdentifier,
    regenerateScopeId,
    result,
    setColumnRetained,
    resetColumnOverrides,
    canExport,
    loadSampleDataset,
  } = useSanitizerStore();

  // Local aggregate aid summary by district & assistance with k >= 2 group suppression (P2)
  const aggregateSummary = useMemo(() => {
    if (format !== 'csv' || !result.parseOk || result.csvSanitizedRows.length === 0) {
      return [];
    }
    const headersLower = result.csvSanitizedHeaders.map((h) => h.toLowerCase());
    const distIdx = headersLower.findIndex((h) => h.includes('district') || h.includes('region'));
    const famIdx = headersLower.findIndex((h) => h.includes('family') || h.includes('household'));
    if (distIdx === -1) return [];

    const groups = new Map<string, { records: number; households: number }>();
    for (const row of result.csvSanitizedRows) {
      const district = (row[distIdx] ?? '').trim() || 'Unspecified';
      const famNum = famIdx !== -1 ? Number(row[famIdx]) : 0;
      const prev = groups.get(district) ?? { records: 0, households: 0 };
      groups.set(district, {
        records: prev.records + 1,
        households: prev.households + (Number.isFinite(famNum) ? famNum : 0),
      });
    }

    return Array.from(groups.entries()).map(([district, stats]) => ({
      district,
      suppressed: stats.records < 2,
      records: stats.records,
      households: stats.households,
    }));
  }, [format, result.parseOk, result.csvSanitizedHeaders, result.csvSanitizedRows]);

  const activePreset = RECIPIENT_PRESETS[recipientScope];
  const exportFilename =
    format === 'csv'
      ? recipientScope !== 'default'
        ? `clyro-handover-${recipientScope}.csv`
        : 'clyro-sanitized.csv'
      : 'clyro-sanitized.txt';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-[#F5F5F5]">
            Organization Safe Handover
          </h1>
          <p className="text-[14px] text-[#A3A3A3] mt-1">
            Prepare recipient-specific pseudonymous scopes and minimize CSV columns locally before handover.
          </p>
        </div>

        {!input && (
          <button
            type="button"
            onClick={() => loadSampleDataset('csv')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] transition-colors cursor-pointer self-start"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Synthetic CSV</span>
          </button>
        )}
      </div>

      {/* Recipient Organization Selector */}
      <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#F5F5F5] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#A8E6CF]" />
              <span>Recipient Organization Scope</span>
            </h2>
            <p className="text-[12px] text-[#A3A3A3] mt-0.5">
              Each recipient maintains an independent Web Crypto namespace and mapping table in volatile memory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-md bg-[#111315] border border-[#26282A] font-mono text-[12px] text-[#A8E6CF]">
              {recipientScope === 'default'
                ? 'PHONE_001'
                : `${recipientScope.toUpperCase()}_${scopeIdentifier}_PHONE_001`}
            </span>
            {recipientScope !== 'default' && (
              <button
                type="button"
                onClick={regenerateScopeId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] border border-[#26282A] bg-[#111315] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                title="Generate a fresh cryptographic scope identifier"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Scope ID</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HANDOVER_SCOPES.map((scopeKey) => {
            const preset = RECIPIENT_PRESETS[scopeKey];
            const selected = recipientScope === scopeKey;
            return (
              <button
                key={scopeKey}
                type="button"
                onClick={() => setRecipientScope(scopeKey)}
                className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selected
                    ? 'bg-[#111315] border-[#A8E6CF]/60'
                    : 'bg-[#050505] border-[#1B1D1F] hover:border-[#26282A]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[#F5F5F5]">
                    {preset.label}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selected ? 'bg-[#A8E6CF]' : 'bg-[#26282A]'
                    }`}
                  />
                </div>
                <p className="text-[12px] text-[#A3A3A3] mt-1.5 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-start justify-between flex-wrap gap-3 pt-2 border-t border-[#1B1D1F]">
          <div className="flex items-start gap-2 text-[12px] text-[#A3A3A3] max-w-3xl">
            <AlertTriangle className="w-4 h-4 text-[#E6BA70] shrink-0 mt-0.5" />
            <span>
              <strong>Correlation Notice:</strong> {activePreset.guidance} Independent scope pseudonyms prevent direct token matching across agencies, but shared non-PII attributes (district, household size, urgency) can still allow linkage. Actual delivery occurs outside Clyro.
            </span>
          </div>

          {mode !== 'pseudonym' && (
            <button
              type="button"
              onClick={() => setMode('pseudonym')}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-[#A8E6CF]/40 bg-[#A8E6CF]/10 text-[#A8E6CF] hover:bg-[#A8E6CF]/20 cursor-pointer"
            >
              Switch to Pseudonym Mode
            </button>
          )}
        </div>
      </section>

      {/* Column Minimization Policies */}
      <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
              Operational Column Minimization Policy
            </h2>
            <p className="text-[12px] text-[#A3A3A3] mt-0.5">
              Preview retained vs removed columns. Unknown columns and medical/address/free-text fields require explicit review.
            </p>
          </div>
          {format === 'csv' && result.columnPolicies.length > 0 && (
            <button
              type="button"
              onClick={resetColumnOverrides}
              className="text-[12px] text-[#A3A3A3] hover:text-[#F5F5F5] underline underline-offset-4 cursor-pointer"
            >
              Reset to Preset Defaults
            </button>
          )}
        </div>

        {format !== 'csv' || !result.parseOk || result.columnPolicies.length === 0 ? (
          <div className="p-6 rounded-lg bg-[#050505] border border-[#1B1D1F] text-[13px] text-[#A3A3A3]">
            Load or upload a valid <code className="text-[#F5F5F5]">.csv</code> dataset in the Data Sanitizer to configure per-column minimization policies.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#1B1D1F] text-[#737373] text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Column</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Detected PII</th>
                  <th className="py-2.5 px-3">Policy Rationale</th>
                  <th className="py-2.5 px-3 text-right">Include in Handover</th>
                </tr>
              </thead>
              <tbody>
                {result.columnPolicies.map((col) => (
                  <tr
                    key={col.colIndex}
                    className="border-b border-[#1B1D1F]/70 hover:bg-[#111315]/60"
                  >
                    <td className="py-2.5 px-3 font-mono text-[#F5F5F5]">
                      {col.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${
                          col.classification === 'operational'
                            ? 'bg-[#6DD6A4]/10 border-[#6DD6A4]/35 text-[#6DD6A4]'
                            : col.classification === 'review'
                            ? 'bg-[#E6BA70]/10 border-[#E6BA70]/35 text-[#E6BA70]'
                            : 'bg-[#E87D85]/10 border-[#E87D85]/35 text-[#E87D85]'
                        }`}
                      >
                        {col.classification === 'operational'
                          ? 'Operational'
                          : col.classification === 'review'
                          ? 'Review Required'
                          : 'Sensitive Risk'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {col.hasDetectedPii ? (
                        <span className="text-[#E87D85]">Yes (auto-sanitized if retained)</span>
                      ) : (
                        <span className="text-[#737373]">None detected</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#A3A3A3] text-[12px]">
                      {col.reason}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={col.retained}
                        aria-label={`Include column ${col.name}`}
                        onClick={() => setColumnRetained(col.name, !col.retained)}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                          col.retained
                            ? 'bg-[#A8E6CF]/15 border-[#A8E6CF]/50 text-[#A8E6CF]'
                            : 'bg-[#111315] border-[#26282A] text-[#737373] hover:text-[#F5F5F5]'
                        }`}
                      >
                        {col.retained ? 'Retained' : 'Removed'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Retained Preview + Aggregate Relief Summary + Export */}
      {format === 'csv' && result.parseOk && result.columnPolicies.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-4 space-y-3">
            <h3 className="text-[14px] font-semibold text-[#F5F5F5]">
              Handover Column Summary & Export
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F]">
                <div className="text-[#6DD6A4] font-medium mb-1.5">
                  Retained Columns ({result.csvSanitizedHeaders.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.columnPolicies
                    .filter((p) => p.retained)
                    .map((p) => (
                      <code
                        key={p.colIndex}
                        className="px-2 py-0.5 rounded bg-[#050505] border border-[#26282A] font-mono text-[11px] text-[#F5F5F5]"
                      >
                        {p.name}
                      </code>
                    ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F]">
                <div className="text-[#A3A3A3] font-medium mb-1.5">
                  Removed Columns ({result.columnPolicies.filter((p) => !p.retained).length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.columnPolicies
                    .filter((p) => !p.retained)
                    .map((p) => (
                      <code
                        key={p.colIndex}
                        className="px-2 py-0.5 rounded bg-[#050505] border border-[#1B1D1F] font-mono text-[11px] text-[#737373] line-through"
                      >
                        {p.name}
                      </code>
                    ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canExport}
              onClick={() =>
                triggerLocalDownload(
                  result.sanitizedOutput,
                  exportFilename,
                  'text/csv;charset=utf-8'
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Handover File ({exportFilename})</span>
            </button>
          </div>

          {/* Local Aggregate Aid Summary (P2 with singleton suppression) */}
          <div className="lg:col-span-5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#A8E6CF]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">
                Local Aggregate Aid Summary
              </h3>
            </div>
            <p className="text-[11px] text-[#737373]">
              Groups with fewer than 2 records are suppressed (`&lt;2`) to reduce small-group re-identification risk. Computed locally only.
            </p>
            {aggregateSummary.length === 0 ? (
              <div className="text-[12px] text-[#737373]">
                Include a district/region column to preview local aggregate counts.
              </div>
            ) : (
              <div className="space-y-1.5 text-[12px] font-mono">
                {aggregateSummary.map((item) => (
                  <div
                    key={item.district}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-[#111315] border border-[#1B1D1F]"
                  >
                    <span className="text-[#F5F5F5]">{item.district}</span>
                    {item.suppressed ? (
                      <span className="text-[#E6BA70] text-[11px]">
                        Suppressed (&lt;2 records)
                      </span>
                    ) : (
                      <span className="text-[#A8E6CF]">
                        {item.records} records • {item.households} individuals
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
