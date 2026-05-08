import { getCache } from '@vercel/functions';

const CACHE_NAMESPACE = 'rge-live-output-v2';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface LiveStateEntry {
  id: string;
  state: unknown;
  updatedAt: number;
  version: number;
}

const fallbackStore = new Map<string, LiveStateEntry>();

const cache = getCache({ namespace: CACHE_NAMESPACE });

const keyFor = (id: string) => `overlay:${id}`;

const isLiveEntry = (value: unknown): value is LiveStateEntry => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LiveStateEntry>;
  return typeof candidate.id === 'string' && typeof candidate.updatedAt === 'number';
};

export const getLiveState = async (id: string): Promise<LiveStateEntry | null> => {
  try {
    const cached = await cache.get(keyFor(id));
    if (isLiveEntry(cached)) {
      fallbackStore.set(id, cached);
      return cached;
    }
  } catch (error) {
    console.warn('Runtime cache read failed, using local fallback', error);
  }

  return fallbackStore.get(id) ?? null;
};

export const setLiveState = async (id: string, state: unknown): Promise<LiveStateEntry> => {
  const previous = await getLiveState(id);
  const entry: LiveStateEntry = {
    id,
    state,
    updatedAt: Date.now(),
    version: (previous?.version ?? 0) + 1,
  };

  fallbackStore.set(id, entry);

  try {
    await cache.set(keyFor(id), entry, {
      ttl: CACHE_TTL_SECONDS,
      tags: ['rge-live-output', `rge-live-output:${id}`],
      name: `RGE live output ${id}`,
    });
  } catch (error) {
    console.warn('Runtime cache write failed, using local fallback', error);
  }

  return entry;
};
