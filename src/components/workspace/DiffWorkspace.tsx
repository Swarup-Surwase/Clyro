import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Lock,
  Scissors,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useSanitizerStore } from '../../hooks/useSanitizerStore';
import { triggerLocalDownload } from '../../utils/download';
import {
  HighlightOriginalText,
  HighlightSanitizedFromOriginal,
} from './SafeHighlightedText';

type MobilePane = 'original' | 'sanitized' | 'stacked';

type DiffWorkspaceProps = {
  pasteFocusNonce?: number;
};

export function DiffWorkspace({ pasteFocusNonce = 0 }: DiffWorkspaceProps) {
  const {
    input,
    format,
    mode,
    sourceKind,
    focusedCategories,
    manualSpans,
    canExport,
    isProcessing,
    result,
    recipientScope,
    setInputText,
    addManualSpan,
    removeManualSpan,
    loadSampleDataset,
    uploadLocalFile,
  } = useSanitizerStore();

  const [leftView, setLeftView] = useState<'diff' | 'edit'>('diff');
  const [csvViewMode, setCsvViewMode] = useState<'table' | 'raw'>('table');
  const [mobilePane, setMobilePane] = useState<MobilePane>('stacked');
  const [copied, setCopied] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [forceEmptyEdit, setForceEmptyEdit] = useState(false);

  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef<'left' | 'right' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pasteFocusNonce > 0) {
      setForceEmptyEdit(true);
      setLeftView('edit');
      setCsvViewMode('raw');
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [pasteFocusNonce]);

  useEffect(() => {
    if (input.length > 0) {
      setForceEmptyEdit(false);
    }
  }, [input]);

  useEffect(() => {
    if (sourceKind === 'sample' || sourceKind === 'file') {
      setLeftView('diff');
      setCsvViewMode(format === 'csv' ? 'table' : 'raw');
    }
  }, [sourceKind, format]);

  const exportFilename =
    format === 'csv'
      ? recipientScope !== 'default'
        ? `clyro-handover-${recipientScope}.csv`
        : 'clyro-sanitized.csv'
      : 'clyro-sanitized.txt';

  const handleSyncScroll = (source: 'left' | 'right') => {
    if (syncingScrollRef.current && syncingScrollRef.current !== source) return;
    const fromEl = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
    const toEl = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
    if (!fromEl || !toEl) return;

    syncingScrollRef.current = source;
    toEl.scrollTop = fromEl.scrollTop;
    toEl.scrollLeft = fromEl.scrollLeft;
    window.requestAnimationFrame(() => {
      syncingScrollRef.current = null;
    });
  };

  const handleCopySanitized = async () => {
    if (!result.sanitizedOutput) return;
    try {
      await navigator.clipboard.writeText(result.sanitizedOutput);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked in restricted headless environments
    }
  };

  const handleDownload = () => {
    if (!canExport) return;
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    triggerLocalDownload(result.sanitizedOutput, exportFilename, mime);
  };

  const handleTextareaSelect = () => {
    const el = textareaRef.current;
    if (!el || format !== 'txt') {
      setSelectionRange(null);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (end > start) {
      setSelectionRange({ start, end, text: input.slice(start, end) });
    } else {
      setSelectionRange(null);
    }
  };

  const handleApplyManualSelection = () => {
    if (!selectionRange || format !== 'txt') return;
    addManualSpan({ start: selectionRange.start, end: selectionRange.end });
    setSelectionRange(null);
    setLeftView('diff');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadLocalFile(file);
    }
  };

  // Empty state before any input (unless user explicitly clicked Paste Text / Start Typing)
  if (!input && !forceEmptyEdit) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border border-dashed p-8 sm:p-12 text-center transition-colors ${
          isDragging
            ? 'border-[#A8E6CF] bg-[#A8E6CF]/5'
            : 'border-[#26282A] bg-[#0C0D0E]'
        }`}
      >
        <input
          ref={dropInputRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadLocalFile(f);
            e.target.value = '';
          }}
        />
        <div className="max-w-lg mx-auto space-y-5">
          <div className="w-11 h-11 rounded-lg bg-[#111315] border border-[#26282A] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-[#A8E6CF]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[18px] font-semibold tracking-tight text-[#F5F5F5]">
              Ready for local sanitization
            </h2>
            <p className="text-[14px] text-[#A3A3A3] leading-relaxed">
              Paste raw relief records, drop a local <code className="text-[#F5F5F5]">.csv</code> or{' '}
              <code className="text-[#F5F5F5]">.txt</code> file (up to 5 MB), or load the synthetic
              Indian relief dataset to inspect detection and redaction live.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => loadSampleDataset('csv')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Synthetic Relief Sample</span>
            </button>
            <button
              type="button"
              onClick={() => dropInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium border border-[#26282A] bg-[#111315] text-[#F5F5F5] hover:border-[#3A3D40] transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload TXT / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setForceEmptyEdit(true);
                setLeftView('edit');
                window.requestAnimationFrame(() => textareaRef.current?.focus());
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium border border-[#26282A] bg-[#050505] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Start Typing</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const linesOriginal = input.split('\n');
  const linesSanitized = result.sanitizedOutput.split('\n');
  const retainedColSet = new Set(
    result.columnPolicies.filter((p) => p.retained).map((p) => p.colIndex)
  );
  const showCsvTable = format === 'csv' && csvViewMode === 'table' && result.parseOk;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`space-y-3 rounded-xl transition-colors ${
        isDragging ? 'ring-2 ring-[#A8E6CF]' : ''
      }`}
    >
      {/* CSV Parse Error Banner */}
      {format === 'csv' && !result.parseOk && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#E87D85]/10 border border-[#E87D85]/35 text-[13px] text-[#F4B4B9]"
        >
          <AlertCircle className="w-4 h-4 text-[#E87D85] shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">CSV Parsing Failed — Export Disabled</div>
            <div className="text-[12px] opacity-90 mt-0.5">{result.parseError}</div>
          </div>
        </div>
      )}

      {/* Zero-detection reminder */}
      {result.parseOk &&
        result.stats.totalOccurrences === 0 &&
        result.stats.manualOccurrences === 0 &&
        !isProcessing && (
          <div
            role="status"
            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#E6BA70]/10 border border-[#E6BA70]/30 text-[12px] text-[#F4D8A8]"
          >
            <AlertCircle className="w-4 h-4 text-[#E6BA70] shrink-0 mt-0.5" />
            <span>
              Zero pattern-matched entities detected. Absence of automated matches does not guarantee absence of personal names, street addresses, or free-text medical details. Review text manually or use select-and-redact in Edit mode.
            </span>
          </div>
        )}

      {/* View mode & Mobile pane controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {format === 'csv' && result.parseOk && (
            <div className="inline-flex p-0.5 rounded-md bg-[#0C0D0E] border border-[#26282A]">
              <button
                type="button"
                onClick={() => setCsvViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium cursor-pointer ${
                  csvViewMode === 'table'
                    ? 'bg-[#191B1D] text-[#F5F5F5]'
                    : 'text-[#737373] hover:text-[#F5F5F5]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Structured CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setCsvViewMode('raw')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium cursor-pointer ${
                  csvViewMode === 'raw'
                    ? 'bg-[#191B1D] text-[#F5F5F5]'
                    : 'text-[#737373] hover:text-[#F5F5F5]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Raw CSV Text</span>
              </button>
            </div>
          )}

          {(!showCsvTable || leftView === 'edit') && (
            <div className="inline-flex p-0.5 rounded-md bg-[#0C0D0E] border border-[#26282A]">
              <button
                type="button"
                onClick={() => {
                  setLeftView('diff');
                  if (format === 'csv') setCsvViewMode('table');
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium cursor-pointer ${
                  leftView === 'diff'
                    ? 'bg-[#191B1D] text-[#F5F5F5]'
                    : 'text-[#737373] hover:text-[#F5F5F5]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Annotated View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeftView('edit');
                  if (format === 'csv') setCsvViewMode('raw');
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium cursor-pointer ${
                  leftView === 'edit'
                    ? 'bg-[#191B1D] text-[#F5F5F5]'
                    : 'text-[#737373] hover:text-[#F5F5F5]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Raw Input</span>
              </button>
            </div>
          )}

          {showCsvTable && leftView === 'diff' && (
            <button
              type="button"
              onClick={() => {
                setCsvViewMode('raw');
                setLeftView('edit');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium bg-[#0C0D0E] border border-[#26282A] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Raw CSV</span>
            </button>
          )}

          {selectionRange && format === 'txt' && (
            <button
              type="button"
              onClick={handleApplyManualSelection}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium bg-[#A8E6CF]/15 border border-[#A8E6CF]/40 text-[#A8E6CF] hover:bg-[#A8E6CF]/25 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Redact Selection ({selectionRange.text.length} chars)</span>
            </button>
          )}
        </div>

        {/* Mobile pane switcher (<lg) */}
        <div className="flex lg:hidden p-0.5 rounded-md bg-[#0C0D0E] border border-[#26282A]">
          {(['stacked', 'original', 'sanitized'] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize cursor-pointer ${
                mobilePane === pane
                  ? 'bg-[#191B1D] text-[#F5F5F5]'
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              {pane}
            </button>
          ))}
        </div>
      </div>

      {/* Manual spans bar if any */}
      {manualSpans.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-[#0C0D0E] border border-[#1B1D1F] text-[12px]">
          <span className="text-[#A3A3A3]">Manual Redactions ({manualSpans.length}):</span>
          {manualSpans.map((m, idx) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111315] border border-[#26282A] font-mono text-[11px] text-[#F5F5F5]"
            >
              <span>Span #{idx + 1} ({m.start}:{m.end})</span>
              <button
                type="button"
                onClick={() => removeManualSpan(m.id)}
                aria-label={`Remove manual redaction ${idx + 1}`}
                className="text-[#737373] hover:text-[#E87D85] cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Split-Screen Diff Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT PANEL — ORIGINAL INPUT */}
        <section
          aria-label="Original input"
          className={`flex flex-col rounded-xl bg-[#0C0D0E] border border-[#26282A] overflow-hidden min-h-[380px] max-h-[580px] ${
            mobilePane === 'sanitized' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-2.5 border-b border-[#1B1D1F] bg-[#111315] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E87D85]" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#F5F5F5]">
                Original Input
              </span>
              <span className="text-[11px] font-mono text-[#737373]">
                {format === 'csv' && result.parseOk
                  ? `${result.csvRows.length} rows × ${result.csvHeaders.length} cols`
                  : `${linesOriginal.length} lines`}
              </span>
            </div>
            <span className="text-[11px] text-[#737373]">Inert local memory</span>
          </div>

          <div
            ref={leftScrollRef}
            onScroll={() => handleSyncScroll('left')}
            className="flex-1 overflow-auto clyro-scroll"
          >
            {leftView === 'edit' ? (
              <textarea
                ref={textareaRef}
                aria-label="Original raw text or CSV input"
                value={input}
                onChange={(e) => setInputText(e.target.value, 'paste')}
                onSelect={handleTextareaSelect}
                spellCheck={false}
                placeholder="Paste raw disaster relief records or CSV rows here..."
                className="w-full h-full min-h-[330px] p-4 bg-[#0C0D0E] text-[#F5F5F5] font-mono text-[12.5px] leading-[1.65] resize-none focus:outline-none"
              />
            ) : showCsvTable ? (
              <table className="w-full border-collapse text-left font-mono text-[12px]">
                <thead className="sticky top-0 z-10 bg-[#111315]">
                  <tr>
                    <th className="px-2.5 py-2 border-b border-r border-[#1B1D1F] text-[10px] text-[#737373] w-10">
                      #
                    </th>
                    {result.csvHeaderAnalyses.map((cell, cIdx) => (
                      <th
                        key={`oh_${cIdx}`}
                        className={`px-3 py-2 border-b border-r border-[#1B1D1F] font-semibold whitespace-nowrap ${
                          retainedColSet.has(cIdx) ? 'text-[#F5F5F5]' : 'text-[#737373] bg-[#050505]/40'
                        }`}
                      >
                        <HighlightOriginalText
                          text={cell.original}
                          entities={cell.entities}
                          focusedCategories={focusedCategories}
                        />
                        {!retainedColSet.has(cIdx) && (
                          <span className="ml-1.5 text-[9px] font-sans uppercase px-1 py-0.5 rounded bg-[#26282A] text-[#A3A3A3]">
                            Removed
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.csvCellAnalyses.map((row, rIdx) => (
                    <tr key={`or_${rIdx}`} className="hover:bg-[#111315]/70">
                      <td className="px-2.5 py-2 border-b border-r border-[#1B1D1F] text-[11px] text-[#737373] align-top">
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td
                          key={`oc_${rIdx}_${cIdx}`}
                          className={`px-3 py-2 border-b border-r border-[#1B1D1F] align-top whitespace-pre-wrap break-words max-w-[260px] ${
                            retainedColSet.has(cIdx)
                              ? 'text-[#D4D4D4]'
                              : 'text-[#737373] opacity-55 bg-[#050505]/30'
                          }`}
                        >
                          <HighlightOriginalText
                            text={cell.original}
                            entities={cell.entities}
                            focusedCategories={focusedCategories}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-3 font-mono text-[12.5px] leading-[1.65]">
                {format === 'txt' ? (
                  <div className="flex">
                    <div
                      aria-hidden="true"
                      className="select-none pr-3 mr-3 border-r border-[#1B1D1F] text-right text-[#737373] min-w-[2.5rem]"
                    >
                      {linesOriginal.map((_, idx) => (
                        <div key={idx}>{idx + 1}</div>
                      ))}
                    </div>
                    <div className="flex-1 whitespace-pre-wrap break-words text-[#E5E5E5]">
                      <HighlightOriginalText
                        text={input}
                        entities={result.txtEntities}
                        manualSpans={manualSpans}
                        focusedCategories={focusedCategories}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-[#E5E5E5]">{input}</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL — SANITIZED OUTPUT */}
        <section
          aria-label="Sanitized output"
          className={`flex flex-col rounded-xl bg-[#0C0D0E] border border-[#26282A] overflow-hidden min-h-[380px] max-h-[580px] ${
            mobilePane === 'original' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-2.5 border-b border-[#1B1D1F] bg-[#111315] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#6DD6A4] shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#F5F5F5] truncate">
                Sanitized Output
              </span>
              <span className="text-[11px] font-mono text-[#A8E6CF] hidden sm:inline">
                {mode === 'full' ? 'Full Mask' : mode === 'partial' ? 'Partial Mask' : 'Pseudonymized'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => void handleCopySanitized()}
                disabled={!canExport}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-[#26282A] bg-[#0C0D0E] text-[#A3A3A3] hover:text-[#F5F5F5] disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#6DD6A4]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!canExport}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-[#A8E6CF]/15 border border-[#A8E6CF]/40 text-[#A8E6CF] hover:bg-[#A8E6CF]/25 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <div
            ref={rightScrollRef}
            onScroll={() => handleSyncScroll('right')}
            className="flex-1 overflow-auto clyro-scroll"
          >
            {isProcessing ? (
              <div className="p-6 text-[13px] text-[#A3A3A3] font-mono">
                Processing large dataset in local Web Worker…
              </div>
            ) : showCsvTable ? (
              result.csvSanitizedHeaders.length === 0 ? (
                <div className="p-6 text-[13px] text-[#E6BA70]">
                  All columns are currently excluded by your Safe Handover policy. Enable at least one column in Safe Handover to preview and export CSV output.
                </div>
              ) : (
                <table className="w-full border-collapse text-left font-mono text-[12px]">
                  <thead className="sticky top-0 z-10 bg-[#111315]">
                    <tr>
                      <th className="px-2.5 py-2 border-b border-r border-[#1B1D1F] text-[10px] text-[#737373] w-10">
                        #
                      </th>
                      {result.columnPolicies
                        .filter((p) => p.retained)
                        .map((policy) => {
                          const cell = result.csvHeaderAnalyses[policy.colIndex];
                          if (!cell) return null;
                          return (
                            <th
                              key={`sh_${policy.colIndex}`}
                              className="px-3 py-2 border-b border-r border-[#1B1D1F] font-semibold text-[#F5F5F5] whitespace-nowrap"
                            >
                              <HighlightSanitizedFromOriginal
                                originalText={cell.original}
                                sanitizedFallback={cell.sanitized}
                                segments={cell.segments}
                                focusedCategories={focusedCategories}
                                formulaNeutralized={cell.formulaNeutralized}
                              />
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody>
                    {result.csvCellAnalyses.map((row, rIdx) => (
                      <tr key={`sr_${rIdx}`} className="hover:bg-[#111315]/70">
                        <td className="px-2.5 py-2 border-b border-r border-[#1B1D1F] text-[11px] text-[#737373] align-top">
                          {rIdx + 1}
                        </td>
                        {result.columnPolicies
                          .filter((p) => p.retained)
                          .map((policy) => {
                            const cell = row[policy.colIndex];
                            if (!cell) return null;
                            return (
                              <td
                                key={`sc_${rIdx}_${policy.colIndex}`}
                                className="px-3 py-2 border-b border-r border-[#1B1D1F] align-top whitespace-pre-wrap break-words max-w-[260px] text-[#E5E5E5]"
                              >
                                <HighlightSanitizedFromOriginal
                                  originalText={cell.original}
                                  sanitizedFallback={cell.sanitized}
                                  segments={cell.segments}
                                  focusedCategories={focusedCategories}
                                  formulaNeutralized={cell.formulaNeutralized}
                                />
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <div className="p-3 font-mono text-[12.5px] leading-[1.65]">
                <div className="flex">
                  <div
                    aria-hidden="true"
                    className="select-none pr-3 mr-3 border-r border-[#1B1D1F] text-right text-[#737373] min-w-[2.5rem]"
                  >
                    {linesSanitized.map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  <div
                    data-testid="sanitized-output-text"
                    className="flex-1 whitespace-pre-wrap break-words text-[#E5E5E5]"
                  >
                    {format === 'txt' ? (
                      <HighlightSanitizedFromOriginal
                        originalText={input}
                        sanitizedFallback={result.sanitizedOutput}
                        segments={result.txtSegments}
                        focusedCategories={focusedCategories}
                      />
                    ) : (
                      result.sanitizedOutput
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
