const VOLATILE_LIVE_DATA_KEYS = new Set([
  'bridgeUpdatedAt',
  'dataVersion',
  'fetchedAt',
  'generatedAt',
  'lastUpdatedAt',
  'nextPollAt',
  'requestId',
  'serverTime',
  'sourceMode',
  'sourceStatus',
  'updatedAt',
]);

const normalizeForFingerprint = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeForFingerprint);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !VOLATILE_LIVE_DATA_KEYS.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeForFingerprint(entryValue)])
  );
};

export const createWorldCupDataVersion = (value: unknown): string => {
  const serialized = JSON.stringify(normalizeForFingerprint(value));
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `reo-wc-${(hash >>> 0).toString(36)}-${serialized.length.toString(36)}`;
};

export const getWorldCupDataVersion = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const existing = (value as Record<string, unknown>).dataVersion;
    if (typeof existing === 'string' && existing.trim()) return existing.trim();
  }
  return createWorldCupDataVersion(value);
};
