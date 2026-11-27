import { CheckCircle2, Cpu, Keyboard, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Mode } from '../engine';
import { MAX_FILE_SIZE_BYTES, useSanitizerStore, WORKER_THRESHOLD_CHARS } from '../hooks/useSanitizerStore';
import { formatBytes } from '../utils/download';

export function SettingsPage() {
  const { settings, updateSettings, resetSession, scopeIdentifier, recipientScope } =
    useSanitizerStore();

  const localStorageKeys = typeof window !== 'undefined' ? window.localStorage.length : 0;
  const sessionStorageKeys = typeof window !== 'undefined' ? window.sessionStorage.length : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-[#F5F5F5]">
          Local Session Settings
        </h1>
        <p className="text-[14px] text-[#A3A3A3] mt-1">
          All preferences exist solely in volatile memory for the active browser tab.
        </p>
      </div>

      <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-4">
        <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Sanitization Defaults</h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[#1B1D1F]">
          <div>
            <div className="text-[13px] font-medium text-[#F5F5F5]">Default Reset Mode</div>
            <div className="text-[12px] text-[#737373]">
              Mode selected automatically after a session reset (recommended: Full Mask).
            </div>
          </div>
          <select
            aria-label="Default redaction mode"
            value={settings.defaultMode}
            onChange={(e) => updateSettings({ defaultMode: e.target.value as Mode })}
            className="bg-[#111315] border border-[#26282A] rounded-md px-3 py-1.5 text-[12px] text-[#F5F5F5]"
          >
            <option value="full">Full Mask ([REDACTED])</option>
            <option value="partial">Partial Mask</option>
            <option value="pseudonym">Pseudonymization</option>
          </select>
        </div>

        <label className="flex items-center justify-between gap-3 py-2 border-b border-[#1B1D1F] cursor-pointer">
          <div>
            <div className="text-[13px] font-medium text-[#F5F5F5]">
              Default Spreadsheet-Safe CSV Export
            </div>
            <div className="text-[12px] text-[#737373]">
              Neutralize cells starting with formula triggers (=, @, non-numeric +/-) upon export.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.defaultSpreadsheetSafe}
            onChange={(e) => updateSettings({ defaultSpreadsheetSafe: e.target.checked })}
            className="accent-[#A8E6CF] w-4 h-4"
          />
        </label>

        <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
          <div>
            <div className="text-[13px] font-medium text-[#F5F5F5] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#A8E6CF]" />
              <span>Use Background Web Worker for Large Inputs</span>
            </div>
            <div className="text-[12px] text-[#737373]">
              Offloads datasets exceeding {WORKER_THRESHOLD_CHARS.toLocaleString()} characters to an isolated worker thread (cap {formatBytes(MAX_FILE_SIZE_BYTES)}).
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.preferWorkerForLargeInputs}
            onChange={(e) => updateSettings({ preferWorkerForLargeInputs: e.target.checked })}
            className="accent-[#A8E6CF] w-4 h-4"
          />
        </label>
      </section>

      <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#6DD6A4]" />
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
            Live Browser Storage & Memory Check
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
          <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F]">
            <div className="text-[#737373]">localStorage keys</div>
            <div className="font-mono text-[16px] text-[#6DD6A4] mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{localStorageKeys}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F]">
            <div className="text-[#737373]">sessionStorage keys</div>
            <div className="font-mono text-[16px] text-[#6DD6A4] mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{sessionStorageKeys}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F]">
            <div className="text-[#737373]">Active Volatile Scope</div>
            <div className="font-mono text-[14px] text-[#F5F5F5] mt-1">
              {recipientScope}:{scopeIdentifier}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={resetSession}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium border border-[#E87D85]/40 bg-[#E87D85]/10 text-[#E87D85] hover:bg-[#E87D85]/20 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Purge Volatile Session State & Reset Worker</span>
        </button>
      </section>

      <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-[#A3A3A3]" />
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Keyboard Shortcuts</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] font-mono">
          <div className="flex justify-between p-2 rounded bg-[#111315] border border-[#1B1D1F]">
            <span className="text-[#A3A3A3]">Full Mask Mode</span>
            <kbd className="text-[#F5F5F5]">Alt + 1</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#111315] border border-[#1B1D1F]">
            <span className="text-[#A3A3A3]">Partial Mask Mode</span>
            <kbd className="text-[#F5F5F5]">Alt + 2</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#111315] border border-[#1B1D1F]">
            <span className="text-[#A3A3A3]">Pseudonymization Mode</span>
            <kbd className="text-[#F5F5F5]">Alt + 3</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#111315] border border-[#1B1D1F]">
            <span className="text-[#A3A3A3]">Load Synthetic CSV Sample</span>
            <kbd className="text-[#F5F5F5]">Alt + S</kbd>
          </div>
        </div>
      </section>
    </div>
  );
}
