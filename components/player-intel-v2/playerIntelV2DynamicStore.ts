/**
 * Player Intel V2 — Client-side dynamic profile store.
 *
 * Mirrors profiles built on-demand via /api/player-intel-v2/build-fotmob-profile
 * into localStorage so users see them after refresh. Combines with the static
 * registry (public/player-intel-v2-samples/index.json) to produce the full
 * dropdown list.
 */

const STORAGE_KEY = 'reo:player-intel-v2:dynamic-profiles:v1';
const STORAGE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface DynamicEntry {
  id: string; // slug
  name: string;
  club: string;
  season: string;
  position: string;
  source: 'fotmob';
  builtAt: number;
  // Stored profile (broadcast shape)
  profile: unknown;
}

interface StoredShape {
  schema: 1;
  entries: Record<string, DynamicEntry>;
}

function _read(): StoredShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schema: 1, entries: {} };
    const parsed = JSON.parse(raw) as StoredShape;
    if (parsed.schema !== 1 || typeof parsed.entries !== 'object') {
      return { schema: 1, entries: {} };
    }
    // Evict expired
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed.entries)) {
      if (now - v.builtAt > STORAGE_TTL_MS) delete parsed.entries[k];
    }
    return parsed;
  } catch {
    return { schema: 1, entries: {} };
  }
}

function _write(shape: StoredShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  } catch {
    // localStorage may be full or disabled — fail silently
  }
}

export function saveDynamicProfile(slug: string, profile: unknown, meta: {
  name: string; club: string; season: string; position: string;
}): void {
  const store = _read();
  store.entries[slug] = {
    id: slug,
    name: meta.name,
    club: meta.club,
    season: meta.season,
    position: meta.position,
    source: 'fotmob',
    builtAt: Date.now(),
    profile,
  };
  _write(store);
}

export function listDynamicProfiles(): DynamicEntry[] {
  const store = _read();
  return Object.values(store.entries).sort((a, b) => b.builtAt - a.builtAt);
}

export function getDynamicProfile(slug: string): DynamicEntry | null {
  const store = _read();
  return store.entries[slug] || null;
}

export function deleteDynamicProfile(slug: string): void {
  const store = _read();
  delete store.entries[slug];
  _write(store);
}
