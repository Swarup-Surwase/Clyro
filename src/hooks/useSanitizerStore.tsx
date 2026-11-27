import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  clearPseudonymRegistry,
  createPseudonymRegistry,
  runSanitizationPipeline,
  type EntityType,
  type ManualSpan,
  type Mode,
  type PipelineResult,
  type PseudonymRegistry,
  type RecipientType,
} from '../engine';
import { SYNTHETIC_RELIEF_CSV, SYNTHETIC_RELIEF_TXT } from '../fixtures/syntheticRelief';
import type { WorkerRequest, WorkerResponse } from '../workers/sanitizer.worker';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB local cap
export const WORKER_THRESHOLD_CHARS = 40_000;

export type InputSourceKind = 'empty' | 'paste' | 'file' | 'sample';

type UndoSnapshot = {
  input: string;
  format: 'txt' | 'csv';
  manualSpans: ManualSpan[];
};

export type SanitizerSettings = {
  defaultMode: Mode;
  defaultSpreadsheetSafe: boolean;
  preferWorkerForLargeInputs: boolean;
};

type SanitizerContextValue = {
  input: string;
  format: 'txt' | 'csv';
  mode: Mode;
  recipientScope: RecipientType;
  perTypeModes: Partial<Record<EntityType, Mode>>;
  focusedCategories: Set<EntityType>;
  manualSpans: ManualSpan[];
  rejectedEntityIds: Set<string>;
  columnOverrides: Record<string, boolean>;
  spreadsheetSafeExport: boolean;
  sourceKind: InputSourceKind;
  localFileBytes: number;
  isSyntheticSample: boolean;
  fileError: string | null;
  isProcessing: boolean;
  isStale: boolean;
  canUndo: boolean;
  canExport: boolean;
  result: PipelineResult;
  scopeIdentifier: string;
  settings: SanitizerSettings;
  announcement: string;
  // Actions
  setInputText: (next: string, nextSource?: InputSourceKind) => void;
  setFormat: (next: 'txt' | 'csv') => void;
  setMode: (next: Mode) => void;
  setPerTypeMode: (type: EntityType, next: Mode | null) => void;
  setRecipientScope: (next: RecipientType) => void;
  regenerateScopeId: () => void;
  toggleCategoryFilter: (type: EntityType) => void;
  clearCategoryFilters: () => void;
  addManualSpan: (span: Omit<ManualSpan, 'id'>) => void;
  removeManualSpan: (id: string) => void;
  toggleRejectedEntity: (entityId: string) => void;
  setColumnRetained: (columnName: string, retained: boolean) => void;
  resetColumnOverrides: () => void;
  setSpreadsheetSafeExport: (enabled: boolean) => void;
  loadSampleDataset: (kind?: 'csv' | 'txt') => void;
  uploadLocalFile: (file: File) => Promise<void>;
  clearInputOnly: () => void;
  resetSession: () => void;
  undoLastEdit: () => void;
  updateSettings: (partial: Partial<SanitizerSettings>) => void;
  dismissFileError: () => void;
};

const SanitizerContext = createContext<SanitizerContextValue | null>(null);

function detectLikelyFormat(text: string, hintExt?: string): 'txt' | 'csv' {
  if (hintExt === 'csv') return 'csv';
  if (hintExt === 'txt') return 'txt';
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length >= 2) {
    const first = lines[0] ?? '';
    const second = lines[1] ?? '';
    const comma1 = (first.match(/,/g) ?? []).length;
    const comma2 = (second.match(/,/g) ?? []).length;
    if (comma1 >= 2 && comma2 >= 1) {
      return 'csv';
    }
  }
  return 'txt';
}

function createInitialRegistries(): Map<RecipientType, PseudonymRegistry> {
  const map = new Map<RecipientType, PseudonymRegistry>();
  const scopes: RecipientType[] = ['default', 'ngo', 'hospital', 'municipal', 'volunteer', 'custom'];
  for (const s of scopes) {
    map.set(s, createPseudonymRegistry(s));
  }
  return map;
}

export function SanitizerProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState<string>('');
  const [format, setFormatState] = useState<'txt' | 'csv'>('txt');
  const [mode, setModeState] = useState<Mode>('full');
  const [recipientScope, setRecipientScopeState] = useState<RecipientType>('default');
  const [perTypeModes, setPerTypeModes] = useState<Partial<Record<EntityType, Mode>>>({});
  const [focusedCategories, setFocusedCategories] = useState<Set<EntityType>>(() => new Set());
  const [manualSpans, setManualSpans] = useState<ManualSpan[]>([]);
  const [rejectedEntityIds, setRejectedEntityIds] = useState<Set<string>>(() => new Set());
  const [columnOverrides, setColumnOverrides] = useState<Record<string, boolean>>({});
  const [spreadsheetSafeExport, setSpreadsheetSafeExport] = useState<boolean>(true);
  const [sourceKind, setSourceKind] = useState<InputSourceKind>('empty');
  const [localFileBytes, setLocalFileBytes] = useState<number>(0);
  const [isSyntheticSample, setIsSyntheticSample] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [registryEpoch, setRegistryEpoch] = useState<number>(0);
  const [settings, setSettings] = useState<SanitizerSettings>({
    defaultMode: 'full',
    defaultSpreadsheetSafe: true,
    preferWorkerForLargeInputs: true,
  });

  const registriesRef = useRef<Map<RecipientType, PseudonymRegistry>>(createInitialRegistries());

  // Worker state for large inputs
  const workerRef = useRef<Worker | null>(null);
  const workerReqIdRef = useRef<number>(0);
  const [workerResult, setWorkerResult] = useState<PipelineResult | null>(null);
  const [workerPendingId, setWorkerPendingId] = useState<number | null>(null);

  const getRegistryForScope = useCallback((scope: RecipientType): PseudonymRegistry => {
    let reg = registriesRef.current.get(scope);
    if (!reg) {
      reg = createPseudonymRegistry(scope);
      registriesRef.current.set(scope, reg);
    }
    return reg;
  }, []);

  const shouldUseWorker =
    settings.preferWorkerForLargeInputs &&
    input.length > WORKER_THRESHOLD_CHARS &&
    typeof Worker !== 'undefined';

  // Synchronous calculation for normal-size inputs (instantaneous reactivity, zero stale window)
  const syncResult = useMemo<PipelineResult>(() => {
    if (shouldUseWorker) {
      return runSanitizationPipeline({
        input: '',
        format,
        mode,
        recipientScope,
        registry: getRegistryForScope(recipientScope),
      });
    }
    const registry = getRegistryForScope(recipientScope);
    return runSanitizationPipeline({
      input,
      format,
      mode,
      recipientScope,
      registry,
      perTypeModes,
      manualSpans,
      rejectedEntityIds,
      columnOverrides,
      spreadsheetSafeExport,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shouldUseWorker,
    input,
    format,
    mode,
    recipientScope,
    perTypeModes,
    manualSpans,
    rejectedEntityIds,
    columnOverrides,
    spreadsheetSafeExport,
    registryEpoch,
    getRegistryForScope,
  ]);

  // Worker lifecycle for large inputs (>40k chars)
  useEffect(() => {
    if (!shouldUseWorker) {
      setWorkerPendingId(null);
      setWorkerResult(null);
      return;
    }

    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(new URL('../workers/sanitizer.worker.ts', import.meta.url), {
          type: 'module',
        });
      } catch {
        workerRef.current = null;
      }
    }

    const worker = workerRef.current;
    if (!worker) {
      // Fallback safely to sync if worker construction is unavailable
      const reg = getRegistryForScope(recipientScope);
      const fallback = runSanitizationPipeline({
        input,
        format,
        mode,
        recipientScope,
        registry: reg,
        perTypeModes,
        manualSpans,
        rejectedEntityIds,
        columnOverrides,
        spreadsheetSafeExport,
      });
      setWorkerResult(fallback);
      setWorkerPendingId(null);
      return;
    }

    const requestId = ++workerReqIdRef.current;
    setWorkerPendingId(requestId);
    const registry = getRegistryForScope(recipientScope);

    const handleMessage = (ev: MessageEvent<WorkerResponse>) => {
      const data = ev.data;
      if (data.type === 'RESULT' && data.requestId === workerReqIdRef.current) {
        const syncedReg = createPseudonymRegistry(
          data.result.registryState.scopeType,
          data.result.registryState.scopeIdentifier
        );
        syncedReg.mappings = new Map(data.result.registryState.mappings);
        syncedReg.counters = { ...data.result.registryState.counters };
        registriesRef.current.set(recipientScope, syncedReg);

        const { registryState: _unused, ...rest } = data.result;
        void _unused;
        setWorkerResult({ ...rest, registry: syncedReg });
        setWorkerPendingId(null);
      }
    };

    worker.onmessage = handleMessage;
    const req: WorkerRequest = {
      type: 'RUN',
      requestId,
      payload: {
        input,
        format,
        mode,
        recipientScope,
        scopeIdentifier: registry.scopeIdentifier,
        perTypeModes,
        manualSpans,
        rejectedEntityIds: Array.from(rejectedEntityIds),
        columnOverrides,
        spreadsheetSafeExport,
        existingMappings: Array.from(registry.mappings.entries()),
        existingCounters: { ...registry.counters },
      },
    };
    worker.postMessage(req);
  }, [
    shouldUseWorker,
    input,
    format,
    mode,
    recipientScope,
    perTypeModes,
    manualSpans,
    rejectedEntityIds,
    columnOverrides,
    spreadsheetSafeExport,
    registryEpoch,
    getRegistryForScope,
  ]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const activeResult = shouldUseWorker && workerResult ? workerResult : syncResult;
  const isProcessing = shouldUseWorker && workerPendingId !== null;
  const isStale = Boolean(fileError) || isProcessing;
  const canExport =
    input.trim().length > 0 &&
    !isStale &&
    activeResult.parseOk &&
    activeResult.sanitizedOutput.length > 0;

  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((prev) => {
      const next = [...prev, { input, format, manualSpans }];
      return next.length > 15 ? next.slice(next.length - 15) : next;
    });
  }, [input, format, manualSpans]);

  const clearAllRegistries = useCallback((regenerateIds: boolean) => {
    registriesRef.current.forEach((reg) => clearPseudonymRegistry(reg, regenerateIds));
    workerRef.current?.postMessage({ type: 'RESET' } satisfies WorkerRequest);
    setRegistryEpoch((e) => e + 1);
  }, []);

  const setInputText = useCallback(
    (next: string, nextSource: InputSourceKind = 'paste') => {
      setFileError(null);
      if (input !== next) {
        pushUndoSnapshot();
      }
      if (!next) {
        clearAllRegistries(false);
        setManualSpans([]);
        setRejectedEntityIds(new Set());
        setColumnOverrides({});
        setSourceKind('empty');
        setLocalFileBytes(0);
        setIsSyntheticSample(false);
        setInput('');
        return;
      }

      if (input.length === 0) {
        clearAllRegistries(false);
        setFormatState(detectLikelyFormat(next));
      }
      setInput(next);
      setSourceKind(nextSource);
      setLocalFileBytes(new Blob([next]).size);
      setIsSyntheticSample(nextSource === 'sample');
    },
    [input, pushUndoSnapshot, clearAllRegistries]
  );

  const setFormat = useCallback((next: 'txt' | 'csv') => {
    setFormatState(next);
    setFileError(null);
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    setAnnouncement(`Redaction mode switched to ${next}.`);
  }, []);

  const setPerTypeMode = useCallback((type: EntityType, next: Mode | null) => {
    setPerTypeModes((prev) => {
      const updated = { ...prev };
      if (next === null) {
        delete updated[type];
      } else {
        updated[type] = next;
      }
      return updated;
    });
  }, []);

  const setRecipientScope = useCallback((next: RecipientType) => {
    setRecipientScopeState(next);
    setColumnOverrides({});
    setAnnouncement(`Recipient scope changed to ${next}.`);
  }, []);

  const regenerateScopeId = useCallback(() => {
    const reg = getRegistryForScope(recipientScope);
    clearPseudonymRegistry(reg, true);
    setRegistryEpoch((e) => e + 1);
    setAnnouncement(`Generated fresh local scope identifier ${reg.scopeIdentifier}.`);
  }, [recipientScope, getRegistryForScope]);

  const toggleCategoryFilter = useCallback((type: EntityType) => {
    setFocusedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const clearCategoryFilters = useCallback(() => {
    setFocusedCategories(new Set());
  }, []);

  const addManualSpan = useCallback(
    (span: Omit<ManualSpan, 'id'>) => {
      pushUndoSnapshot();
      const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setManualSpans((prev) => [...prev, { ...span, id }]);
      setAnnouncement('Manual redaction span added.');
    },
    [pushUndoSnapshot]
  );

  const removeManualSpan = useCallback((id: string) => {
    setManualSpans((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleRejectedEntity = useCallback((entityId: string) => {
    setRejectedEntityIds((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  const setColumnRetained = useCallback((columnName: string, retained: boolean) => {
    setColumnOverrides((prev) => ({ ...prev, [columnName]: retained }));
  }, []);

  const resetColumnOverrides = useCallback(() => {
    setColumnOverrides({});
  }, []);

  const loadSampleDataset = useCallback(
    (kind: 'csv' | 'txt' = 'csv') => {
      pushUndoSnapshot();
      clearAllRegistries(false);
      setManualSpans([]);
      setRejectedEntityIds(new Set());
      setColumnOverrides({});
      setFileError(null);
      const sampleText = kind === 'csv' ? SYNTHETIC_RELIEF_CSV : SYNTHETIC_RELIEF_TXT;
      setInput(sampleText);
      setFormatState(kind);
      setSourceKind('sample');
      setLocalFileBytes(new Blob([sampleText]).size);
      setIsSyntheticSample(true);
      setAnnouncement(`Loaded synthetic ${kind.toUpperCase()} relief dataset.`);
    },
    [pushUndoSnapshot, clearAllRegistries]
  );

  const uploadLocalFile = useCallback(
    async (file: File) => {
      setFileError(null);
      const lowerName = file.name.toLowerCase();
      const hasValidExt = lowerName.endsWith('.txt') || lowerName.endsWith('.csv');

      if (!hasValidExt) {
        setFileError(
          `Unsupported file format ("${file.name.split('.').pop() || 'unknown'}"). Clyro accepts only local .txt and .csv files.`
        );
        return;
      }

      if (file.size === 0) {
        setFileError('Selected file is empty (0 bytes). Provide a non-empty .txt or .csv file.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(
          `File exceeds the 5 MB local processing cap (${(file.size / (1024 * 1024)).toFixed(2)} MB). Split the dataset locally before loading.`
        );
        return;
      }

      try {
        const text = await file.text();
        // Reject files containing NUL bytes (binary masquerading as .txt/.csv)
        if (text.includes('\u0000')) {
          setFileError('File appears to contain binary data (NUL bytes) and cannot be safely processed as text or CSV.');
          return;
        }

        pushUndoSnapshot();
        clearAllRegistries(false);
        setManualSpans([]);
        setRejectedEntityIds(new Set());
        setColumnOverrides({});

        const nextFormat: 'txt' | 'csv' = lowerName.endsWith('.csv') ? 'csv' : 'txt';
        setInput(text);
        setFormatState(nextFormat);
        setSourceKind('file');
        setLocalFileBytes(file.size);
        setIsSyntheticSample(false);
        setAnnouncement(`Loaded local ${nextFormat.toUpperCase()} file (${file.size} bytes) into browser memory.`);
      } catch {
        setFileError('Unable to read the selected local file. Verify file permissions and UTF-8 encoding.');
      }
    },
    [pushUndoSnapshot, clearAllRegistries]
  );

  const clearInputOnly = useCallback(() => {
    pushUndoSnapshot();
    clearAllRegistries(false);
    setInput('');
    setManualSpans([]);
    setRejectedEntityIds(new Set());
    setColumnOverrides({});
    setFileError(null);
    setSourceKind('empty');
    setLocalFileBytes(0);
    setIsSyntheticSample(false);
    setAnnouncement('Input cleared.');
  }, [pushUndoSnapshot, clearAllRegistries]);

  const resetSession = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESET' } satisfies WorkerRequest);
      workerRef.current.terminate();
      workerRef.current = null;
    }
    registriesRef.current = createInitialRegistries();
    setRegistryEpoch((e) => e + 1);
    setInput('');
    setFormatState('txt');
    setModeState(settings.defaultMode);
    setRecipientScopeState('default');
    setPerTypeModes({});
    setFocusedCategories(new Set());
    setManualSpans([]);
    setRejectedEntityIds(new Set());
    setColumnOverrides({});
    setSpreadsheetSafeExport(settings.defaultSpreadsheetSafe);
    setSourceKind('empty');
    setLocalFileBytes(0);
    setIsSyntheticSample(false);
    setFileError(null);
    setUndoStack([]);
    setWorkerResult(null);
    setWorkerPendingId(null);
    setAnnouncement('Session reset: input, sanitized output, mappings, counts, and worker state cleared.');
  }, [settings.defaultMode, settings.defaultSpreadsheetSafe]);

  const undoLastEdit = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (!last) return prev;
      setInput(last.input);
      setFormatState(last.format);
      setManualSpans(last.manualSpans);
      setFileError(null);
      setAnnouncement('Undid last input change.');
      return prev.slice(0, -1);
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<SanitizerSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const dismissFileError = useCallback(() => {
    setFileError(null);
  }, []);

  const scopeIdentifier = getRegistryForScope(recipientScope).scopeIdentifier;

  const value: SanitizerContextValue = {
    input,
    format,
    mode,
    recipientScope,
    perTypeModes,
    focusedCategories,
    manualSpans,
    rejectedEntityIds,
    columnOverrides,
    spreadsheetSafeExport,
    sourceKind,
    localFileBytes,
    isSyntheticSample,
    fileError,
    isProcessing,
    isStale,
    canUndo: undoStack.length > 0,
    canExport,
    result: activeResult,
    scopeIdentifier,
    settings,
    announcement,
    setInputText,
    setFormat,
    setMode,
    setPerTypeMode,
    setRecipientScope,
    regenerateScopeId,
    toggleCategoryFilter,
    clearCategoryFilters,
    addManualSpan,
    removeManualSpan,
    toggleRejectedEntity,
    setColumnRetained,
    resetColumnOverrides,
    setSpreadsheetSafeExport,
    loadSampleDataset,
    uploadLocalFile,
    clearInputOnly,
    resetSession,
    undoLastEdit,
    updateSettings,
    dismissFileError,
  };

  return <SanitizerContext.Provider value={value}>{children}</SanitizerContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSanitizerStore(): SanitizerContextValue {
  const ctx = useContext(SanitizerContext);
  if (!ctx) {
    throw new Error('useSanitizerStore must be used inside SanitizerProvider');
  }
  return ctx;
}
