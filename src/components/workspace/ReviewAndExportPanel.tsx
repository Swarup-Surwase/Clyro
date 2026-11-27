import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { RECIPIENT_PRESETS } from '../../engine';
import { useSanitizerStore } from '../../hooks/useSanitizerStore';
import { triggerLocalDownload, formatBytes } from '../../utils/download';

export function ReviewAndExportPanel() {
  const {
    input,
    format,
    mode,
    recipientScope,
    scopeIdentifier,
    spreadsheetSafeExport,
    setSpreadsheetSafeExport,
    canExport,
    result,
    rejectedEntityIds,
    toggleRejectedEntity,
  } = useSanitizerStore();

  const [showFlaggedDetails, setShowFlaggedDetails] = useState(true);

  if (!input) return null;

  const exportFilename =
    format === 'csv'
      ? recipientScope !== 'default'
        ? `clyro-handover-${recipientScope}.csv`
        : 'clyro-sanitized.csv'
      : 'clyro-sanitized.txt';

  const outputBytes = new Blob([result.sanitizedOutput]).size;
  const reviewableAadhaar = result.allEntities.filter((e) => e.needsReview);
  const flaggedCount = result.flaggedCandidates.length;

  const handleDownload = () => {
    if (!canExport) return;
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    triggerLocalDownload(result.sanitizedOutput, exportFilename, mime);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Validation & Review Queue */}
      <section
        aria-label="Validation and review queue"
        className="lg:col-span-7 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#A8E6CF]" />
            <h3 className="text-[14px] font-semibold text-[#F5F5F5]">
              Validation & Ambiguity Review
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowFlaggedDetails((v) => !v)}
            className="text-[12px] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
          >
            {showFlaggedDetails ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
          <div className="p-2.5 rounded-lg bg-[#111315] border border-[#1B1D1F]">
            <div className="text-[#737373] text-[11px]">Luhn Passed</div>
            <div className="font-mono text-[15px] font-semibold text-[#6DD6A4] mt-0.5">
              {result.auditReport.validationCoverage.luhnPassedCards}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#111315] border border-[#1B1D1F]">
            <div className="text-[#737373] text-[11px]">Luhn Rejected</div>
            <div className="font-mono text-[15px] font-semibold text-[#E6BA70] mt-0.5">
              {result.auditReport.validationCoverage.luhnRejectedCandidates}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#111315] border border-[#1B1D1F]">
            <div className="text-[#737373] text-[11px]">Invalid IPv4 Rejected</div>
            <div className="font-mono text-[15px] font-semibold text-[#E6BA70] mt-0.5">
              {result.auditReport.validationCoverage.ipv4RejectedCandidates}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#111315] border border-[#1B1D1F]">
            <div className="text-[#737373] text-[11px]">Verhoeff Unverified</div>
            <div className="font-mono text-[15px] font-semibold text-[#A3A3A3] mt-0.5">
              {result.auditReport.validationCoverage.verhoeffFailedAadhaar}
            </div>
          </div>
        </div>

        {showFlaggedDetails && (flaggedCount > 0 || reviewableAadhaar.length > 0) ? (
          <div className="space-y-2 max-h-[210px] overflow-y-auto clyro-scroll pr-1">
            {result.flaggedCandidates.map((flag) => (
              <div
                key={flag.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#111315] border border-[#26282A] text-[12px]"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E6BA70]/15 text-[#E6BA70] border border-[#E6BA70]/35">
                      REJECTED {flag.type}
                    </span>
                    <code className="font-mono text-[#F5F5F5] break-all">{flag.raw}</code>
                    {flag.locationLabel && (
                      <span className="text-[11px] text-[#737373]">{flag.locationLabel}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A3A3A3]">{flag.reason}</p>
                </div>
              </div>
            ))}

            {reviewableAadhaar.map((ent) => {
              const isSuppressed = rejectedEntityIds.has(ent.id);
              return (
                <div
                  key={ent.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#111315] border border-[#26282A] text-[12px]"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E87D85]/15 text-[#E87D85] border border-[#E87D85]/35">
                        AADHAAR FORMAT
                      </span>
                      <code className="font-mono text-[#A3A3A3]">XXXX-XXXX-{ent.canonical.slice(-4)}</code>
                    </div>
                    <p className="text-[11px] text-[#737373]">
                      12-digit Aadhaar format matched; Verhoeff checksum failed. Masked conservatively by default.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRejectedEntity(ent.id)}
                    className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                      isSuppressed
                        ? 'border-[#E6BA70]/40 bg-[#E6BA70]/10 text-[#E6BA70]'
                        : 'border-[#26282A] bg-[#050505] text-[#A3A3A3] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {isSuppressed ? 'Restore Mask' : 'Mark False Positive'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12px] text-[#737373]">
            <CheckCircle2 className="w-4 h-4 text-[#6DD6A4]" />
            <span>No rejected candidates or checksum anomalies flagged in current input.</span>
          </div>
        )}
      </section>

      {/* Export & Safe CSV Policy Panel */}
      <section
        aria-label="Local export panel"
        className="lg:col-span-5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-4 flex flex-col justify-between gap-4"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#F5F5F5]">
              Local Sanitized Export
            </h3>
            <span className="text-[11px] font-mono text-[#737373]">
              Blob URL • Revoked after save
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F] space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">Neutral Output Filename</span>
              <code className="font-mono text-[#F5F5F5]">{exportFilename}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">Active Mode & Scope</span>
              <span className="font-mono text-[#A8E6CF]">
                {mode} • {RECIPIENT_PRESETS[recipientScope].shortLabel} ({scopeIdentifier})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">Estimated Output Size</span>
              <span className="font-mono text-[#F5F5F5]">{formatBytes(outputBytes)}</span>
            </div>
          </div>

          {format === 'csv' && (
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#111315] border border-[#1B1D1F] cursor-pointer">
              <input
                type="checkbox"
                checked={spreadsheetSafeExport}
                onChange={(e) => setSpreadsheetSafeExport(e.target.checked)}
                className="mt-0.5 accent-[#A8E6CF]"
              />
              <div className="text-[12px]">
                <div className="font-medium text-[#F5F5F5] flex items-center gap-2">
                  <span>Spreadsheet-Safe CSV Export</span>
                  {result.formulaNeutralizations.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E6BA70]/15 text-[#E6BA70]">
                      {result.formulaNeutralizations.length} neutralized
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#737373] mt-0.5">
                  Prefixes formula triggers (<code>=</code>, <code>@</code>, non-numeric <code>+</code>/<code>-</code>) with <code>&apos;</code> without altering ordinary numbers.
                </div>
              </div>
            </label>
          )}

          <div className="flex items-start gap-2 text-[11px] text-[#737373]">
            {result.stats.totalOccurrences === 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-[#E6BA70] shrink-0 mt-0.5" />
                <span>
                  Zero detected entities does not guarantee absence of names, addresses, or unstructured sensitive notes.
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[#A8E6CF] shrink-0 mt-0.5" />
                <span>
                  Downloaded bytes match the current Sanitized Output preview and omit all pseudonym lookup maps.
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!canExport}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Sanitized File ({exportFilename})</span>
        </button>

        {result.stats.totalOccurrences > 0 && (
          <div className="text-[11px] text-[#737373] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#A8E6CF]" />
            <span>{result.stats.replacedOccurrences} sensitive span(s) transformed locally</span>
          </div>
        )}
      </section>
    </div>
  );
}
