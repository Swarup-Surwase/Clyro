import {
  createPseudonymRegistry,
  runSanitizationPipeline,
  type EntityType,
  type ManualSpan,
  type Mode,
  type PipelineResult,
  type PseudonymRegistry,
  type RecipientType,
} from '../engine';

export type WorkerRequest =
  | {
      type: 'RUN';
      requestId: number;
      payload: {
        input: string;
        format: 'txt' | 'csv';
        mode: Mode;
        recipientScope: RecipientType;
        scopeIdentifier: string;
        perTypeModes: Partial<Record<EntityType, Mode>>;
        manualSpans: ManualSpan[];
        rejectedEntityIds: string[];
        columnOverrides: Record<string, boolean>;
        spreadsheetSafeExport: boolean;
        existingMappings: [string, string][];
        existingCounters: Record<EntityType, number>;
      };
    }
  | {
      type: 'RESET';
    };

export type WorkerResponse = {
  type: 'RESULT';
  requestId: number;
  result: Omit<PipelineResult, 'registry'> & {
    registryState: {
      scopeType: RecipientType;
      scopeIdentifier: string;
      mappings: [string, string][];
      counters: Record<EntityType, number>;
    };
  };
};

let workerRegistryMap = new Map<RecipientType, PseudonymRegistry>();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === 'RESET') {
    workerRegistryMap.clear();
    workerRegistryMap = new Map();
    return;
  }

  if (msg.type === 'RUN') {
    const { payload } = msg;
    const registry = createPseudonymRegistry(payload.recipientScope, payload.scopeIdentifier);
    registry.mappings = new Map(payload.existingMappings);
    registry.counters = { ...payload.existingCounters };
    workerRegistryMap.set(payload.recipientScope, registry);

    const result = runSanitizationPipeline({
      input: payload.input,
      format: payload.format,
      mode: payload.mode,
      recipientScope: payload.recipientScope,
      registry,
      perTypeModes: payload.perTypeModes,
      manualSpans: payload.manualSpans,
      rejectedEntityIds: new Set(payload.rejectedEntityIds),
      columnOverrides: payload.columnOverrides,
      spreadsheetSafeExport: payload.spreadsheetSafeExport,
    });

    const { registry: updatedRegistry, ...rest } = result;
    const response: WorkerResponse = {
      type: 'RESULT',
      requestId: msg.requestId,
      result: {
        ...rest,
        registryState: {
          scopeType: updatedRegistry.scopeType,
          scopeIdentifier: updatedRegistry.scopeIdentifier,
          mappings: Array.from(updatedRegistry.mappings.entries()),
          counters: { ...updatedRegistry.counters },
        },
      },
    };

    self.postMessage(response);
  }
};
