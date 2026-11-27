import { Download, FileCheck2, Printer, ShieldAlert, Sparkles } from 'lucide-react';
import { ENTITY_TYPES, RECIPIENT_PRESETS } from '../engine';
import { ENTITY_META } from '../components/shared/EntityMeta';
import { useSanitizerStore } from '../hooks/useSanitizerStore';
import { triggerLocalDownload } from '../utils/download';

export function AuditPage() {
  const { input, result, loadSampleDataset } = useSanitizerStore();
  const audit = result.auditReport;

  const maxCategoryCount = Math.max(
    1,
    ...ENTITY_TYPES.map((t) => audit.countsByCategory[t])
  );

  const handleDownloadAuditJson = () => {
    const json = JSON.stringify(audit, null, 2);
    triggerLocalDownload(json, 'clyro-privacy-audit.json', 'application/json;charset=utf-8');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-[#F5F5F5]">
            Privacy Audit Report
          </h1>
          <p className="text-[14px] text-[#A3A3A3] mt-1">
            Count-based local verification summary. Contains zero raw identifiers, filenames, or re-identification mappings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!input && (
            <button
              type="button"
              onClick={() => loadSampleDataset('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border border-[#26282A] bg-[#111315] text-[#A8E6CF] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Synthetic Sample</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border border-[#26282A] bg-[#0C0D0E] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Summary</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadAuditJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit JSON</span>
          </button>
        </div>
      </div>

      {/* Key Audit Metadata */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] uppercase tracking-wider text-[#737373]">Input Format</div>
          <div className="font-mono text-[18px] font-semibold text-[#F5F5F5] mt-1">
            {audit.inputFormat.toUpperCase()}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] uppercase tracking-wider text-[#737373]">Active Mode</div>
          <div className="font-mono text-[18px] font-semibold text-[#A8E6CF] mt-1 capitalize">
            {audit.mode}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] uppercase tracking-wider text-[#737373]">Recipient Scope</div>
          <div className="font-mono text-[15px] font-semibold text-[#F5F5F5] mt-1">
            {RECIPIENT_PRESETS[audit.recipientScope].shortLabel} ({audit.scopeIdentifier})
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] uppercase tracking-wider text-[#737373]">Processing Timestamp</div>
          <div className="font-mono text-[12px] text-[#A3A3A3] mt-1.5 break-all">
            {audit.generatedAtIso}
          </div>
        </div>
      </section>

      {/* Category Distribution & Validation Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-7 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
              Entity Breakdown (Occurrences vs Unique)
            </h2>
            <span className="font-mono text-[12px] text-[#A8E6CF]">
              {audit.replacedOccurrences} / {audit.totalOccurrences} replaced
            </span>
          </div>

          <div className="space-y-3">
            {ENTITY_TYPES.map((type) => {
              const meta = ENTITY_META[type];
              const total = audit.countsByCategory[type];
              const unique = audit.uniqueByCategory[type];
              const widthPct = total === 0 ? 0 : Math.max(4, Math.round((total / maxCategoryCount) * 100));
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${meta.badgeClass}`}>
                        {meta.shortCode}
                      </span>
                      <span className="text-[#F5F5F5]">{meta.label}</span>
                    </div>
                    <span className="font-mono text-[#A3A3A3]">
                      {total} occurrences ({unique} unique)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#111315] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${meta.barClass}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#A8E6CF]" />
            <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
              Validation & Export Coverage
            </h2>
          </div>

          <dl className="space-y-2.5 text-[12.5px]">
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B1D1F]">
              <dt className="text-[#A3A3A3]">Luhn Card Checksum Passed</dt>
              <dd className="font-mono text-[#6DD6A4]">{audit.validationCoverage.luhnPassedCards}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B1D1F]">
              <dt className="text-[#A3A3A3]">Luhn Card Candidates Rejected</dt>
              <dd className="font-mono text-[#E6BA70]">{audit.validationCoverage.luhnRejectedCandidates}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B1D1F]">
              <dt className="text-[#A3A3A3]">Aadhaar Verhoeff Valid / Unverified</dt>
              <dd className="font-mono text-[#F5F5F5]">
                {audit.validationCoverage.verhoeffPassedAadhaar} / {audit.validationCoverage.verhoeffFailedAadhaar}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B1D1F]">
              <dt className="text-[#A3A3A3]">IPv6 Addresses Parsed</dt>
              <dd className="font-mono text-[#F5F5F5]">{audit.validationCoverage.ipv6ParsedCount}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B1D1F]">
              <dt className="text-[#A3A3A3]">Invalid IPv4 Rejected</dt>
              <dd className="font-mono text-[#E6BA70]">{audit.validationCoverage.ipv4RejectedCandidates}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-[#A3A3A3]">Spreadsheet Formula Neutralizations</dt>
              <dd className="font-mono text-[#F5F5F5]">{audit.formulaNeutralizationCount}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Warnings & Clean JSON Proof */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#E6BA70]" />
            <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
              Active Warnings & Limitations
            </h2>
          </div>
          {audit.warnings.length === 0 ? (
            <p className="text-[12.5px] text-[#A3A3A3]">
              No unresolved parsing or checksum warnings for the current dataset. Continue manual review for names, street addresses, or free-text medical context.
            </p>
          ) : (
            <ul className="space-y-2 text-[12.5px] text-[#A3A3A3]">
              {audit.warnings.map((w, i) => (
                <li
                  key={i}
                  className="p-2.5 rounded-lg bg-[#111315] border border-[#1B1D1F] text-[#E5E5E5]"
                >
                  {w}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-[#737373] pt-2 border-t border-[#1B1D1F]">
            {audit.disclaimer}
          </p>
        </section>

        <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-3">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
            Sanitized Audit Payload Preview
          </h2>
          <pre className="p-3 rounded-lg bg-[#050505] border border-[#1B1D1F] font-mono text-[11px] text-[#A3A3A3] overflow-auto max-h-[260px] clyro-scroll">
            {JSON.stringify(audit, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
