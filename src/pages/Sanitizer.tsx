import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ClipboardPaste,
  Eraser,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { DiffWorkspace } from '../components/workspace/DiffWorkspace';
import { ModeAndFilterBar } from '../components/workspace/ModeAndFilterBar';
import { ReviewAndExportPanel } from '../components/workspace/ReviewAndExportPanel';
import { useSanitizerStore } from '../hooks/useSanitizerStore';
import { formatBytes } from '../utils/download';

export function SanitizerPage() {
  const {
    input,
    format,
    setFormat,
    sourceKind,
    localFileBytes,
    isSyntheticSample,
    fileError,
    dismissFileError,
    canUndo,
    undoLastEdit,
    clearInputOnly,
    loadSampleDataset,
    uploadLocalFile,
    result,
    setMode,
    canExport,
  } = useSanitizerStore();

  const [pasteFocusNonce, setPasteFocusNonce] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Accessible keyboard shortcuts (Alt+1/2/3 mode, Alt+S sample)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === '1') {
        e.preventDefault();
        setMode('full');
      } else if (e.key === '2') {
        e.preventDefault();
        setMode('partial');
      } else if (e.key === '3') {
        e.preventDefault();
        setMode('pseudonym');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        loadSampleDataset('csv');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setMode, loadSampleDataset]);

  const handlePasteClick = () => {
    setPasteFocusNonce((n) => n + 1);
  };

  return (
    <div className="space-y-5">
      {/* Workspace Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-[#F5F5F5]">
            Data Sanitizer
          </h1>
          <p className="text-[14px] text-[#A3A3A3] mt-1">
            Detect, classify and protect sensitive information without uploading your data.
          </p>
        </div>

        {input.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            {isSyntheticSample && (
              <span className="px-2.5 py-1 rounded-full bg-[#A8E6CF]/10 border border-[#A8E6CF]/35 text-[#A8E6CF]">
                Synthetic Demo Fixture
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-[#111315] border border-[#26282A] text-[#A3A3A3]">
              {sourceKind === 'file' ? 'Local File' : sourceKind === 'sample' ? 'Sample' : 'Pasted Text'} • {formatBytes(localFileBytes)}
            </span>
          </div>
        )}
      </div>

      {/* Input Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            aria-label="Upload local TXT or CSV file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadLocalFile(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={handlePasteClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#111315] border border-[#26282A] text-[#F5F5F5] hover:bg-[#191B1D] transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[#A8E6CF]" />
            <span>Paste Text</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#111315] border border-[#26282A] text-[#F5F5F5] hover:bg-[#191B1D] transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#A3A3A3]" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => loadSampleDataset('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#A8E6CF]/12 border border-[#A8E6CF]/40 text-[#A8E6CF] hover:bg-[#A8E6CF]/20 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample</span>
          </button>

          <button
            type="button"
            onClick={() => loadSampleDataset('txt')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-[#26282A] bg-[#050505] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            title="Load plain-text synthetic intake log"
          >
            <span>TXT Sample</span>
          </button>

          <button
            type="button"
            onClick={undoLastEdit}
            disabled={!canUndo}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-[#26282A] bg-[#050505] text-[#A3A3A3] hover:text-[#F5F5F5] disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Undo last in-memory edit"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={clearInputOnly}
            disabled={!input}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-[#26282A] bg-[#050505] text-[#A3A3A3] hover:text-[#E87D85] disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear Input</span>
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-[#737373]">Format</span>
          <div className="inline-flex p-0.5 rounded-md bg-[#050505] border border-[#26282A]">
            <button
              type="button"
              onClick={() => setFormat('txt')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                format === 'txt' ? 'bg-[#191B1D] text-[#F5F5F5]' : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>TXT</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                format === 'csv' ? 'bg-[#191B1D] text-[#A8E6CF]' : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* File Rejection Error */}
      {fileError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-[#E87D85]/10 border border-[#E87D85]/40 text-[13px] text-[#F4B4B9]"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#E87D85] shrink-0 mt-0.5" />
            <span>{fileError}</span>
          </div>
          <button
            type="button"
            onClick={dismissFileError}
            aria-label="Dismiss file error"
            className="text-[#F4B4B9] hover:text-[#F5F5F5] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detection Summary Strip — Reconciled real values only */}
      <section aria-label="Detection summary statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
            Total Detected Occurrences
          </div>
          <div
            data-testid="stat-total-occurrences"
            className="text-[24px] font-semibold font-mono text-[#F5F5F5] mt-1"
          >
            {result.stats.totalOccurrences}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
            Unique Sensitive Entities
          </div>
          <div
            data-testid="stat-unique-entities"
            className="text-[24px] font-semibold font-mono text-[#F5F5F5] mt-1"
          >
            {result.stats.uniqueEntities}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
            Replaced Occurrences
          </div>
          <div
            data-testid="stat-replaced-occurrences"
            className="text-[24px] font-semibold font-mono text-[#A8E6CF] mt-1"
          >
            {result.stats.replacedOccurrences}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F]">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
            Detected Categories
          </div>
          <div
            data-testid="stat-categories-detected"
            className="text-[24px] font-semibold font-mono text-[#F5F5F5] mt-1 flex items-baseline gap-2"
          >
            <span>{result.stats.categoriesDetected} / 6</span>
            {!canExport && input.length > 0 && (
              <span className="text-[11px] font-sans text-[#E6BA70]">Preview check</span>
            )}
          </div>
        </div>
      </section>

      {/* Mode Selector + Focus Filters */}
      <ModeAndFilterBar />

      {/* Main Split-Screen Diff Workspace */}
      <DiffWorkspace pasteFocusNonce={pasteFocusNonce} />

      {/* Review & Local Export */}
      <ReviewAndExportPanel />
    </div>
  );
}
