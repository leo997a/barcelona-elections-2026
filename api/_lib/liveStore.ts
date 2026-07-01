import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const CACHE_NAMESPACE = 'rge-live-output-v2';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface LiveStateEntry {
  id: string;
  state: unknown;
  updatedAt: number;
  version: number;
  clientVersion: number;
}

const fallbackStore = new Map<string, LiveStateEntry>();
const listeners = new Map<string, Set<(entry: LiveStateEntry) => void>>();
const fileStoreDisabled = () => Boolean(process.env.VERCEL) || process.env.REO_LIVE_STATE_FILE_STORE === 'off';
const fileStoreDir = () => process.env.REO_LIVE_STATE_DIR?.trim() || resolve(process.cwd(), 'data', 'live-state');

export const describeLiveStoreMode = () => {
  if (process.env.VERCEL) return 'runtime-cache';
  return fileStoreDisabled() ? 'memory' : 'file';
};

type RuntimeCache = {
  get: (key: string) => Promise<unknown>;
  set: (
    key: string,
    value: unknown,
    options: { ttl: number; tags: string[]; name: string },
  ) => Promise<unknown>;
};

let runtimeCachePromise: Promise<RuntimeCache | null> | null = null;

const getRuntimeCache = () => {
  if (!process.env.VERCEL) return Promise.resolve(null);
  if (!runtimeCachePromise) {
    runtimeCachePromise = import('@vercel/functions')
      .then(({ getCache }) => getCache({ namespace: CACHE_NAMESPACE }) as RuntimeCache)
      .catch(error => {
        console.warn('Runtime cache unavailable, using process-local live state', error);
        return null;
      });
  }
  return runtimeCachePromise;
};

const keyFor = (id: string) => `overlay:${id}`;
const fileKeyFor = (id: string) => `${createHash('sha256').update(id).digest('hex').slice(0, 48)}.json`;
const fingerprintState = (state: unknown) => {
  try {
    return JSON.stringify(state);
  } catch {
    return String(state);
  }
};

const isLiveEntry = (value: unknown): value is LiveStateEntry => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LiveStateEntry>;
  return typeof candidate.id === 'string' && typeof candidate.updatedAt === 'number';
};

const readFileStoreEntry = async (id: string): Promise<LiveStateEntry | null> => {
  if (fileStoreDisabled()) return null;
  try {
    const raw = await readFile(resolve(fileStoreDir(), fileKeyFor(id)), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (isLiveEntry(parsed) && parsed.id === id) return parsed;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'ENOENT') {
      console.warn('Persistent live state read failed, using memory fallback', error);
    }
  }
  return null;
};

const writeFileStoreEntry = async (entry: LiveStateEntry) => {
  if (fileStoreDisabled()) return;
  try {
    const dir = fileStoreDir();
    await mkdir(dir, { recursive: true });
    const target = resolve(dir, fileKeyFor(entry.id));
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(entry), 'utf8');
    await rename(tmp, target);
  } catch (error) {
    console.warn('Persistent live state write failed, using memory fallback', error);
  }
};

export const getLiveState = async (id: string): Promise<LiveStateEntry | null> => {
  try {
    const cache = await getRuntimeCache();
    const cached = await cache?.get(keyFor(id));
    if (isLiveEntry(cached)) {
      fallbackStore.set(id, cached);
      return cached;
    }
  } catch (error) {
    console.warn('Runtime cache read failed, using local fallback', error);
  }

  const localEntry = fallbackStore.get(id);
  if (localEntry) return localEntry;

  const persisted = await readFileStoreEntry(id);
  if (persisted) {
    fallbackStore.set(id, persisted);
    return persisted;
  }

  return null;
};

export const setLiveState = async (
  id: string,
  state: unknown,
  clientVersion = Date.now(),
): Promise<LiveStateEntry> => {
  const previous = await getLiveState(id);
  const previousClientVersion = previous?.clientVersion ?? 0;
  const stateChanged = previous ? fingerprintState(previous.state) !== fingerprintState(state) : true;
  if (previousClientVersion && clientVersion <= previousClientVersion && !stateChanged) {
    return previous;
  }
  const safeClientVersion = Math.max(clientVersion, previousClientVersion + 1);

  const entry: LiveStateEntry = {
    id,
    state,
    updatedAt: Date.now(),
    version: (previous?.version ?? 0) + 1,
    clientVersion: safeClientVersion,
  };

  fallbackStore.set(id, entry);
  listeners.get(id)?.forEach(listener => listener(entry));

  try {
    const cache = await getRuntimeCache();
    if (cache) {
      await cache.set(keyFor(id), entry, {
        ttl: CACHE_TTL_SECONDS,
        tags: ['rge-live-output', `rge-live-output:${id}`],
        name: `RGE live output ${id}`,
      });
    }
  } catch (error) {
    console.warn('Runtime cache write failed, using local fallback', error);
  }

  await writeFileStoreEntry(entry);

  return entry;
};

export const subscribeLiveState = (
  id: string,
  listener: (entry: LiveStateEntry) => void,
) => {
  const idListeners = listeners.get(id) ?? new Set<(entry: LiveStateEntry) => void>();
  idListeners.add(listener);
  listeners.set(id, idListeners);

  return () => {
    idListeners.delete(listener);
    if (idListeners.size === 0) listeners.delete(id);
  };
};
