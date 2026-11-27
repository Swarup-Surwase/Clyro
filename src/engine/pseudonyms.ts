import type { EntityType, RecipientType } from './types';

export type PseudonymRegistry = {
  scopeType: RecipientType;
  scopeIdentifier: string;
  mappings: Map<string, string>;
  counters: Record<EntityType, number>;
};

const SCOPE_PREFIX_MAP: Record<RecipientType, string> = {
  default: '',
  ngo: 'NGO',
  hospital: 'HOSPITAL',
  municipal: 'MUNICIPAL',
  volunteer: 'VOLUNTEER',
  custom: 'CUSTOM',
};

/**
 * Generates a short random public scope token using Web Crypto (4 uppercase hex chars).
 * Falls back safely if crypto is unavailable in an unusual test runtime.
 */
export function generateScopeIdentifier(): string {
  const bytes = new Uint8Array(2);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 256);
    bytes[1] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export function createPseudonymRegistry(
  scopeType: RecipientType = 'default',
  existingIdentifier?: string
): PseudonymRegistry {
  return {
    scopeType,
    scopeIdentifier: existingIdentifier ?? (scopeType === 'default' ? 'LOCAL' : generateScopeIdentifier()),
    mappings: new Map<string, string>(),
    counters: {
      EMAIL: 0,
      PHONE: 0,
      IP: 0,
      PAN: 0,
      AADHAAR: 0,
      CARD: 0,
    },
  };
}

/**
 * Resolves a deterministic sequential pseudonym token for (type, canonical) within a scope.
 * Repeated equivalent canonical values always return the identical token.
 */
export function getOrAssignPseudonym(
  registry: PseudonymRegistry,
  type: EntityType,
  canonical: string
): string {
  const key = `${type}:${canonical}`;
  const existing = registry.mappings.get(key);
  if (existing) {
    return existing;
  }

  registry.counters[type] += 1;
  const seq = String(registry.counters[type]).padStart(3, '0');
  const scopePrefix = SCOPE_PREFIX_MAP[registry.scopeType];
  const token =
    registry.scopeType === 'default'
      ? `${type}_${seq}`
      : `${scopePrefix}_${registry.scopeIdentifier}_${type}_${seq}`;

  registry.mappings.set(key, token);
  return token;
}

export function clearPseudonymRegistry(registry: PseudonymRegistry, regenerateId = false): void {
  registry.mappings.clear();
  registry.counters = {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    PAN: 0,
    AADHAAR: 0,
    CARD: 0,
  };
  if (regenerateId && registry.scopeType !== 'default') {
    registry.scopeIdentifier = generateScopeIdentifier();
  }
}
