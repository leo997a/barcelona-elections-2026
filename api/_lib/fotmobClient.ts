/**
 * FotMob HTTP client — TypeScript port of fotmob_provider.py
 *
 * Endpoints:
 *  - apigw.fotmob.com/searchapi/suggest  (player/team search)
 *  - www.fotmob.com/                      (home page → buildId)
 *  - www.fotmob.com/_next/data/{buildId}/en/players/{id}/{slug}.json (player data)
 *
 * Does NOT use FlareSolverr / SeleniumBase / proxies. Pure fetch with rate
 * limiting (1.5s between requests) and 25s timeout.
 *
 * In-memory caches:
 *  - buildId (24h TTL)
 *  - player search results (1h TTL)
 *  - player full data (6h TTL)
 *
 * Used only by /api/player-intel-v2/* endpoints.
 */

const APIGW_BASE = 'https://apigw.fotmob.com';
const WWW_BASE = 'https://www.fotmob.com';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/125.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 25_000;
const RATE_LIMIT_MS = 1_500;

// ─── In-memory cache (lives for the duration of the serverless instance) ─────

interface CacheEntry<T> { value: T; expiresAt: number; }
const _cache = new Map<string, CacheEntry<unknown>>();

function _cacheGet<T>(key: string): T | null {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return e.value as T;
}

function _cacheSet<T>(key: string, value: T, ttlMs: number): void {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ─── Rate limit ──────────────────────────────────────────────────────────────

let _lastRequestAt = 0;
async function _rateLimit(): Promise<void> {
  const elapsed = Date.now() - _lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  _lastRequestAt = Date.now();
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function _fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function _fetchJson<T = unknown>(url: string): Promise<T | null> {
  await _rateLimit();
  try {
    const r = await _fetchWithTimeout(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': WWW_BASE,
        'Referer': WWW_BASE + '/',
      },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function _fetchHtml(url: string): Promise<string | null> {
  await _rateLimit();
  try {
    const r = await _fetchWithTimeout(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

// ─── buildId ─────────────────────────────────────────────────────────────────

export async function getBuildId(forceRefresh = false): Promise<string | null> {
  const cacheKey = 'fotmob:buildId';
  if (!forceRefresh) {
    const cached = _cacheGet<string>(cacheKey);
    if (cached) return cached;
  }

  const html = await _fetchHtml(WWW_BASE + '/');
  if (!html) return null;

  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) return null;

  const bid = m[1];
  _cacheSet(cacheKey, bid, 24 * 60 * 60 * 1000);
  return bid;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface FotMobSuggestion {
  fotmobId: number;
  name: string;
  teamId?: number;
  teamName?: string;
  isCoach?: boolean;
  score?: number;
}

export async function searchFotMob(term: string): Promise<FotMobSuggestion[]> {
  const cleanTerm = term.trim();
  if (!cleanTerm) return [];

  const cacheKey = `fotmob:search:${cleanTerm.toLowerCase()}`;
  const cached = _cacheGet<FotMobSuggestion[]>(cacheKey);
  if (cached) return cached;

  const url = `${APIGW_BASE}/searchapi/suggest?term=${encodeURIComponent(cleanTerm)}&lang=en`;
  const data = await _fetchJson<{ squadMemberSuggest?: Array<{ options?: Array<{ text?: string; payload?: { id?: number; teamId?: number; teamName?: string; isCoach?: boolean }; score?: number }> }> }>(url);
  if (!data) return [];

  const out: FotMobSuggestion[] = [];
  const blocks = data.squadMemberSuggest || [];
  for (const block of blocks) {
    for (const opt of (block.options || [])) {
      const text = opt.text || '';
      const [namePart, idPart] = text.includes('|') ? text.split('|') : [text, ''];
      const payload = opt.payload || {};
      const id = Number(payload.id || idPart);
      if (!Number.isFinite(id) || id <= 0) continue;
      out.push({
        fotmobId: id,
        name: namePart.trim(),
        teamId: payload.teamId,
        teamName: payload.teamName,
        isCoach: payload.isCoach,
        score: typeof opt.score === 'number' ? opt.score : undefined,
      });
    }
  }

  _cacheSet(cacheKey, out, 60 * 60 * 1000); // 1h
  return out;
}

// ─── Universal team/club search ──────────────────────────────────────────────

export interface FotMobTeamSuggestion {
  teamId: number;
  name: string;
  countryCode?: string;
  leagueName?: string;
  score?: number;
}

/**
 * Search FotMob for teams (clubs). Uses the same /searchapi/suggest endpoint
 * but reads the teamSuggest block. Useful for resolving Arabic club names
 * (e.g. "برشلونة" → teamId 8634) without relying on a static alias map.
 */
export async function searchFotMobTeams(term: string): Promise<FotMobTeamSuggestion[]> {
  const cleanTerm = term.trim();
  if (!cleanTerm) return [];

  const cacheKey = `fotmob:teamSearch:${cleanTerm.toLowerCase()}`;
  const cached = _cacheGet<FotMobTeamSuggestion[]>(cacheKey);
  if (cached) return cached;

  const url = `${APIGW_BASE}/searchapi/suggest?term=${encodeURIComponent(cleanTerm)}&lang=en`;
  const data = await _fetchJson<{
    teamSuggest?: Array<{
      options?: Array<{
        text?: string;
        payload?: { id?: number; teamName?: string; countryCode?: string; leagueName?: string };
        score?: number;
      }>;
    }>;
  }>(url);
  if (!data) return [];

  const out: FotMobTeamSuggestion[] = [];
  const blocks = data.teamSuggest || [];
  for (const block of blocks) {
    for (const opt of (block.options || [])) {
      const text = opt.text || '';
      const [namePart, idPart] = text.includes('|') ? text.split('|') : [text, ''];
      const payload = opt.payload || {};
      const id = Number(payload.id || idPart);
      if (!Number.isFinite(id) || id <= 0) continue;
      out.push({
        teamId: id,
        name: (payload.teamName || namePart || '').trim(),
        countryCode: payload.countryCode,
        leagueName: payload.leagueName,
        score: typeof opt.score === 'number' ? opt.score : undefined,
      });
    }
  }

  _cacheSet(cacheKey, out, 6 * 60 * 60 * 1000); // 6h (clubs change rarely)
  return out;
}

// ─── Player full data via _next/data ─────────────────────────────────────────

function _slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface FotMobPlayerData {
  id: number;
  raw: Record<string, unknown>;
}

export async function getFotMobPlayer(
  fotmobId: number,
  name?: string,
  forceRefresh = false,
): Promise<FotMobPlayerData | null> {
  const slug = _slugify(name || `player-${fotmobId}`);
  const cacheKey = `fotmob:player:${fotmobId}`;

  if (!forceRefresh) {
    const cached = _cacheGet<FotMobPlayerData>(cacheKey);
    if (cached) return cached;
  }

  const buildId = await getBuildId(forceRefresh);
  if (!buildId) return null;

  const url =
    `${WWW_BASE}/_next/data/${buildId}/en/players/${fotmobId}/${slug}.json` +
    `?lng=en&id=${fotmobId}&slug=${slug}`;

  let data = await _fetchJson<{ pageProps?: { data?: Record<string, unknown> } }>(url);

  // If 404, refresh buildId once and retry
  if (!data) {
    const newBuildId = await getBuildId(true);
    if (newBuildId && newBuildId !== buildId) {
      const retryUrl =
        `${WWW_BASE}/_next/data/${newBuildId}/en/players/${fotmobId}/${slug}.json` +
        `?lng=en&id=${fotmobId}&slug=${slug}`;
      data = await _fetchJson<{ pageProps?: { data?: Record<string, unknown> } }>(retryUrl);
    }
  }

  if (!data || !data.pageProps?.data) return null;

  const result: FotMobPlayerData = {
    id: fotmobId,
    raw: data.pageProps.data,
  };

  _cacheSet(cacheKey, result, 6 * 60 * 60 * 1000); // 6h
  return result;
}

export const PLAYER_IMAGE_URL = (id: number): string =>
  `https://images.fotmob.com/image_resources/playerimages/${id}.png`;

export const TEAM_LOGO_URL = (id: number): string =>
  `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;
