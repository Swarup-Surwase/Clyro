import { useMemo, useState } from 'react';
import { ArrowRight, Edit3, FileSpreadsheet, ShieldCheck, X } from 'lucide-react';
import {
  createPseudonymRegistry,
  ENTITY_TYPES,
  RECIPIENT_PRESETS,
  runSanitizationPipeline,
  type EntityType,
  type Mode,
  type RecipientType,
} from '../../engine';
import { LANDING_DEMO_CSV } from '../../fixtures/syntheticRelief';
import { useRouter } from '../../hooks/useRouter';
import { useSanitizerStore } from '../../hooks/useSanitizerStore';
import { ENTITY_META } from '../shared/EntityMeta';
import {
  HighlightOriginalText,
  HighlightSanitizedFromOriginal,
} from '../workspace/SafeHighlightedText';

const PRESET_TXT_REFERRAL = [
  'HOSPITAL REFERRAL INTAKE (SYNTHETIC)',
  'District: Satara | Household Size: 4 | Triage: Urgent respiratory kit',
  'Contact: doctor.intake@example.org | Alt: (ravi@example.com)',
  'Phone: +91 98201 11223 (also 9820111223) | Node: 2001:db8::1',
  'ID Fixtures: PAN PQRSX5678K | Aadhaar 3456-7890-1234',
  'Valid Test Card: 4111 1111 1111 1111 | Rejected Luhn: 4111111111111112',
].join('\n');

export function InteractiveDemoSection() {
  const { navigate } = useRouter();
  const { setInputText, setFormat, setMode, setRecipientScope } = useSanitizerStore();

  const [demoMode, setDemoMode] = useState<Mode>('pseudonym');
  const [demoScope, setDemoScope] = useState<RecipientType>('default');
  const [sourceTab, setSourceTab] = useState<'csv' | 'txt' | 'custom'>('csv');
  const [customText, setCustomText] = useState<string>(
    'Relief request Pune (Family 5): contact ravi@example.com or +91 98765 43210, ID 2345 6789 0123, card 4111 1111 1111 1111 (ignore invalid 4111111111111112).'
  );
  const [focusedTypes, setFocusedTypes] = useState<Set<EntityType>>(() => new Set());

  const activeFormat = sourceTab === 'csv' ? 'csv' : 'txt';
  const activeInput =
    sourceTab === 'csv'
      ? LANDING_DEMO_CSV
      : sourceTab === 'txt'
      ? PRESET_TXT_REFERRAL
      : customText;

  // Shared sanitization engine transforming live input or synthetic demonstration rows
  const demoResult = useMemo(() => {
    const fixedId =
      demoScope === 'ngo' ? 'A7F2' : demoScope === 'hospital' ? 'B8C3' : undefined;
    const registry = createPseudonymRegistry(demoScope, fixedId);
    return runSanitizationPipeline({
      input: activeInput,
      format: activeFormat,
      mode: demoMode,
      recipientScope: demoScope,
      registry,
    });
  }, [activeInput, activeFormat, demoMode, demoScope]);

  const toggleFocusType = (type: EntityType) => {
    setFocusedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleOpenInWorkspace = () => {
    setFormat(activeFormat);
    setMode(demoMode);
    setRecipientScope(demoScope);
    setInputText(activeInput, sourceTab === 'custom' ? 'paste' : 'sample');
    navigate('/app');
  };

  const retainedColIndices =
    activeFormat === 'csv'
      ? demoResult.columnPolicies.filter((p) => p.retained).map((p) => p.colIndex)
      : [];

  return (
    <section className="py-20 sm:py-28 border-t border-[#1B1D1F]">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#A8E6CF]">
              Interactive Engine Sandbox • Synthetic Data Only
            </div>
            <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#F5F5F5]">
              Sensitive data in.
              <br />
              <span className="text-[#A3A3A3]">Protected information out.</span>
            </h2>
          </div>

          {/* Mode + Scope Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="radiogroup"
              aria-label="Demonstration redaction mode"
              className="inline-flex p-1 rounded-lg bg-[#0C0D0E] border border-[#26282A]"
            >
              {(
                [
                  { id: 'full', label: 'Full Mask' },
                  { id: 'partial', label: 'Partial Mask' },
                  { id: 'pseudonym', label: 'Pseudonymization' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={demoMode === m.id}
                  onClick={() => setDemoMode(m.id)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer ${
                    demoMode === m.id
                      ? 'bg-[#F5F5F5] text-[#050505]'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="inline-flex p-1 rounded-lg bg-[#0C0D0E] border border-[#26282A]">
              {(['default', 'ngo', 'hospital'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setDemoScope(sc)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono cursor-pointer ${
                    demoScope === sc
                      ? 'bg-[#A8E6CF]/15 text-[#A8E6CF] border border-[#A8E6CF]/35'
                      : 'text-[#737373] hover:text-[#F5F5F5] border border-transparent'
                  }`}
                >
                  {RECIPIENT_PRESETS[sc].shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Realistic Integrated Workspace Frame */}
        <div className="rounded-xl border border-[#26282A] bg-[#0C0D0E] overflow-hidden shadow-2xl">
          {/* Top bar with live dataset tabs */}
          <div className="px-4 py-3 border-b border-[#1B1D1F] bg-[#111315] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 mr-2" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-[#26282A]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#26282A]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#26282A]" />
              </div>

              {(
                [
                  { id: 'csv', label: 'Disaster CSV', icon: FileSpreadsheet },
                  { id: 'txt', label: 'Hospital TXT', icon: ShieldCheck },
                  { id: 'custom', label: 'Try Your Text', icon: Edit3 },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = sourceTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium border cursor-pointer ${
                      active
                        ? 'bg-[#191B1D] border-[#3A3D40] text-[#F5F5F5]'
                        : 'bg-[#0C0D0E] border-[#1B1D1F] text-[#737373] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <Icon className="w-3 h-3 text-[#A8E6CF]" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-[#A8E6CF]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Local In-Browser Execution</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#050505] border border-[#26282A] text-[#F5F5F5]">
                {demoResult.stats.totalOccurrences} occurrences • {demoResult.stats.uniqueEntities} unique •{' '}
                {demoResult.stats.categoriesDetected}/6 categories
              </span>
            </div>
          </div>

          {/* Dual Side-by-Side Interactive Comparison */}
          <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-[#1B1D1F]">
            {/* Original Input (Table or Editable TXT) */}
            <div className="overflow-x-auto clyro-scroll min-h-[220px]">
              <div className="px-4 py-2 border-b border-[#1B1D1F] bg-[#0C0D0E] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#E87D85] uppercase tracking-wider">
                  {sourceTab === 'custom' ? 'Interactive Synthetic Input (Editable)' : 'Original Relief Input'}
                </span>
                <span className="text-[#737373]">
                  {sourceTab === 'custom' ? 'Type or edit directly' : 'Synthetic records only'}
                </span>
              </div>

              {sourceTab === 'csv' ? (
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-[#1B1D1F] text-[#737373] bg-[#050505]/40">
                      {demoResult.csvHeaders.map((h, cIdx) => (
                        <th key={`dh_${cIdx}`} className="px-2.5 py-2 whitespace-nowrap font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {demoResult.csvCellAnalyses.map((row, rIdx) => (
                      <tr key={`dr_${rIdx}`} className="border-b border-[#1B1D1F]/60">
                        {row.map((cell, cIdx) => (
                          <td
                            key={`dc_${rIdx}_${cIdx}`}
                            className={`px-2.5 py-2 whitespace-nowrap ${
                              retainedColIndices.includes(cIdx)
                                ? 'text-[#D4D4D4]'
                                : 'text-[#737373] opacity-50'
                            }`}
                          >
                            <HighlightOriginalText
                              text={cell.original}
                              entities={cell.entities}
                              focusedCategories={focusedTypes}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : sourceTab === 'txt' ? (
                <div className="p-4 font-mono text-[12px] leading-[1.65] whitespace-pre-wrap text-[#D4D4D4]">
                  <HighlightOriginalText
                    text={activeInput}
                    entities={demoResult.txtEntities}
                    focusedCategories={focusedTypes}
                  />
                </div>
              ) : (
                <textarea
                  aria-label="Interactive landing sanitizer input"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  spellCheck={false}
                  rows={6}
                  className="w-full h-full min-h-[180px] p-4 bg-[#0C0D0E] text-[#F5F5F5] font-mono text-[12px] leading-[1.65] resize-none focus:outline-none"
                />
              )}
            </div>

            {/* Sanitized Output */}
            <div className="overflow-x-auto clyro-scroll min-h-[220px]">
              <div className="px-4 py-2 border-b border-[#1B1D1F] bg-[#0C0D0E] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6DD6A4] uppercase tracking-wider">
                  Sanitized Output ({demoMode} • {RECIPIENT_PRESETS[demoScope].shortLabel})
                </span>
                <span className="text-[#A8E6CF]">
                  {demoScope !== 'default'
                    ? `${demoResult.csvSanitizedHeaders.length}/${demoResult.csvHeaders.length || 1} cols retained`
                    : demoMode === 'pseudonym'
                    ? 'ravi@example.com → EMAIL_001 across rows'
                    : 'Operational fields preserved'}
                </span>
              </div>

              {sourceTab === 'csv' ? (
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-[#1B1D1F] text-[#737373] bg-[#050505]/40">
                      {demoResult.columnPolicies
                        .filter((p) => p.retained)
                        .map((policy) => (
                          <th
                            key={`sh_${policy.colIndex}`}
                            className="px-2.5 py-2 whitespace-nowrap font-medium text-[#F5F5F5]"
                          >
                            {demoResult.csvHeaderAnalyses[policy.colIndex]?.sanitized}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {demoResult.csvCellAnalyses.map((row, rIdx) => (
                      <tr key={`sr_${rIdx}`} className="border-b border-[#1B1D1F]/60">
                        {demoResult.columnPolicies
                          .filter((p) => p.retained)
                          .map((policy) => {
                            const cell = row[policy.colIndex];
                            if (!cell) return null;
                            return (
                              <td
                                key={`sc_${rIdx}_${policy.colIndex}`}
                                className="px-2.5 py-2 whitespace-nowrap text-[#F5F5F5]"
                              >
                                <HighlightSanitizedFromOriginal
                                  originalText={cell.original}
                                  sanitizedFallback={cell.sanitized}
                                  segments={cell.segments}
                                  focusedCategories={focusedTypes}
                                />
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 font-mono text-[12px] leading-[1.65] whitespace-pre-wrap text-[#F5F5F5]">
                  <HighlightSanitizedFromOriginal
                    originalText={activeInput}
                    sanitizedFallback={demoResult.sanitizedOutput}
                    segments={demoResult.txtSegments}
                    focusedCategories={focusedTypes}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Interactive Entity Category Focus Chips & Open in Workspace */}
          <div className="px-4 py-3 border-t border-[#1B1D1F] bg-[#111315] flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#737373] font-mono mr-1">Focus:</span>
              {ENTITY_TYPES.map((key) => {
                const meta = ENTITY_META[key];
                const isActive = focusedTypes.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleFocusType(key)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono border cursor-pointer ${
                      isActive
                        ? meta.badgeClass
                        : 'border-[#26282A] bg-[#0C0D0E] text-[#A3A3A3] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <span>{meta.shortCode}</span>
                    <span className="opacity-75">{demoResult.stats.countsByCategory[key]}</span>
                  </button>
                );
              })}
              {focusedTypes.size > 0 && (
                <button
                  type="button"
                  onClick={() => setFocusedTypes(new Set())}
                  className="inline-flex items-center gap-0.5 text-[#737373] hover:text-[#F5F5F5] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
              {demoResult.auditReport.validationCoverage.luhnRejectedCandidates > 0 && (
                <span className="text-[#E6BA70] font-mono">
                  • Luhn rejected {demoResult.auditReport.validationCoverage.luhnRejectedCandidates} invalid card
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenInWorkspace}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#A8E6CF] hover:underline cursor-pointer"
            >
              <span>Load in Full Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
