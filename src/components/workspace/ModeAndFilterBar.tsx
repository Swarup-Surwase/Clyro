import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Filter, SlidersHorizontal, X } from 'lucide-react';
import { ENTITY_TYPES, type EntityType, type Mode } from '../../engine';
import { useSanitizerStore } from '../../hooks/useSanitizerStore';
import { ENTITY_META } from '../shared/EntityMeta';

const MODE_OPTIONS: Array<{
  id: Mode;
  label: string;
  hint: string;
}> = [
  { id: 'full', label: 'Full Mask', hint: '[REDACTED]' },
  { id: 'partial', label: 'Partial Mask', hint: 'XXXX-XXXX-1234' },
  { id: 'pseudonym', label: 'Pseudonymization', hint: 'EMAIL_001' },
];

export function ModeAndFilterBar() {
  const {
    mode,
    setMode,
    perTypeModes,
    setPerTypeMode,
    focusedCategories,
    toggleCategoryFilter,
    clearCategoryFilters,
    result,
  } = useSanitizerStore();

  const [showPerTypeDrawer, setShowPerTypeDrawer] = useState(false);
  const overrideCount = Object.keys(perTypeModes).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 rounded-lg bg-[#0C0D0E] border border-[#1B1D1F]">
        {/* Three-option segmented control */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#737373]">
            Redaction Mode
          </span>
          <div
            role="radiogroup"
            aria-label="Redaction mode"
            className="inline-flex p-1 rounded-lg bg-[#050505] border border-[#26282A]"
          >
            {MODE_OPTIONS.map((opt) => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(opt.id)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-[#F5F5F5] text-[#050505]'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`hidden sm:inline font-mono text-[10px] ${
                      active ? 'text-[#050505]/70' : 'text-[#737373]'
                    }`}
                  >
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowPerTypeDrawer((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] border transition-colors cursor-pointer ${
              overrideCount > 0 || showPerTypeDrawer
                ? 'border-[#A8E6CF]/40 bg-[#A8E6CF]/10 text-[#A8E6CF]'
                : 'border-[#26282A] bg-[#111315] text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Per-Category Rules{overrideCount > 0 ? ` (${overrideCount})` : ''}</span>
            {showPerTypeDrawer ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Display Focus Filters — explicitly separated from redaction policy */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#737373] mr-1"
            title="Highlight filter focuses visual markers without excluding unselected categories from sanitization"
          >
            <Filter className="w-3 h-3" />
            <span>Focus Highlight:</span>
          </span>

          {ENTITY_TYPES.map((type: EntityType) => {
            const meta = ENTITY_META[type];
            const Icon = meta.icon;
            const count = result.stats.countsByCategory[type];
            const active = focusedCategories.has(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategoryFilter(type)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                  active
                    ? meta.badgeClass
                    : 'border-[#26282A] bg-[#111315] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#3A3D40]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{meta.label}</span>
                <span className="font-mono text-[10px] opacity-80">{count}</span>
              </button>
            );
          })}

          {focusedCategories.size > 0 && (
            <button
              type="button"
              onClick={clearCategoryFilters}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>All</span>
            </button>
          )}
        </div>
      </div>

      {/* Per-category policy drawer (P2 enhancement) */}
      {showPerTypeDrawer && (
        <div className="p-3.5 rounded-lg bg-[#0C0D0E] border border-[#26282A] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ENTITY_TYPES.map((type) => {
            const meta = ENTITY_META[type];
            const current = perTypeModes[type] ?? 'inherit';
            return (
              <div
                key={type}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[#111315] border border-[#1B1D1F]"
              >
                <div className="flex items-center gap-2 text-[12px]">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${meta.badgeClass}`}>
                    {meta.shortCode}
                  </span>
                  <span className="text-[#F5F5F5] font-medium">{meta.label}</span>
                </div>
                <select
                  aria-label={`${meta.label} redaction rule`}
                  value={current}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPerTypeMode(type, v === 'inherit' ? null : (v as Mode));
                  }}
                  className="bg-[#050505] border border-[#26282A] rounded px-2 py-1 text-[11px] text-[#F5F5F5]"
                >
                  <option value="inherit">Global ({mode})</option>
                  <option value="full">Full Mask</option>
                  <option value="partial">Partial Mask</option>
                  <option value="pseudonym">Pseudonym</option>
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode-specific privacy advisories */}
      {mode === 'partial' && (
        <div
          role="note"
          className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#E6BA70]/10 border border-[#E6BA70]/30 text-[12px] text-[#F4D8A8]"
        >
          <AlertTriangle className="w-4 h-4 text-[#E6BA70] shrink-0 mt-0.5" />
          <span>
            <strong>Partial Mask Advisory:</strong> Retained suffix digits or IP prefixes reduce secrecy and can still identify individuals when combined with district or household metadata.
          </span>
        </div>
      )}

      {mode === 'pseudonym' && (
        <div
          role="note"
          className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#111315] border border-[#26282A] text-[12px] text-[#A3A3A3]"
        >
          <AlertTriangle className="w-4 h-4 text-[#A8E6CF] shrink-0 mt-0.5" />
          <span>
            <strong>Pseudonymization Notice:</strong> Repeated canonical values receive identical session tokens (<code className="text-[#A8E6CF]">EMAIL_001</code>, <code className="text-[#A8E6CF]">PHONE_001</code>). Pseudonymization is not encryption or formal anonymization, and re-identification maps are never persisted or exported.
          </span>
        </div>
      )}
    </div>
  );
}
