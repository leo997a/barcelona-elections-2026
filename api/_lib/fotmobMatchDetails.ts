import {
  normalizeFotMobMatchDetails,
  type MondialMatchDetails,
} from '../../utils/mondialMatchDetails.js';

const MATCH_DETAILS_URL = (matchId: string) =>
  `https://www.fotmob.com/api/data/matchDetails?matchId=${encodeURIComponent(matchId)}`;

const CACHE_TTL_MS = 12_000;
const STALE_TTL_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 18_000;

type CacheEntry = {
  expiresAt: number;
  staleUntil: number;
  details: MondialMatchDetails;
};

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<MondialMatchDetails>>();

const requireMatchId = (value: unknown): string => {
  const matchId = String(value ?? '').trim();
  if (!/^\d{4,}$/.test(matchId)) {
    throw new Error('matchId is required and must be a FotMob numeric match id.');
  }
  return matchId;
};

const fetchDirectMatchDetails = async (matchId: string): Promise<MondialMatchDetails> => {
  const sourceUrl = MATCH_DETAILS_URL(matchId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.fotmob.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; REO-SHOW/1.0; +https://www.fotmob.com)',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`FotMob match details HTTP ${response.status}`);
    const payload = await response.json() as unknown;
    return normalizeFotMobMatchDetails(payload, {
      sourceMode: 'direct',
      sourceStatus: 'live',
      sourceUrl,
      fetchedAt: new Date().toISOString(),
    });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchBridgeMatchDetails = async (matchId: string): Promise<MondialMatchDetails> => {
  const baseUrl = process.env.REO_BRIDGE_URL?.trim().replace(/\/+$/, '');
  const token = process.env.REO_BRIDGE_TOKEN?.trim();
  if (!baseUrl || !token) throw new Error('REO bridge match details fallback is not configured.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/api/match-details?matchId=${encodeURIComponent(matchId)}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`REO bridge match details HTTP ${response.status}`);
    const payload = await response.json() as unknown;
    const details = normalizeFotMobMatchDetails(payload, {
      sourceMode: 'bridge-fallback',
      sourceStatus: 'live',
      sourceUrl: `${baseUrl}/api/match-details?matchId=${matchId}`,
      fetchedAt: new Date().toISOString(),
    });
    return {
      ...details,
      sourceMode: 'bridge-fallback',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchMatchDetails = async (matchId: string): Promise<MondialMatchDetails> => {
  try {
    return await fetchDirectMatchDetails(matchId);
  } catch (directError) {
    try {
      return await fetchBridgeMatchDetails(matchId);
    } catch (bridgeError) {
      throw new Error(
        `FotMob match details failed: ${directError instanceof Error ? directError.message : 'unknown'}; ` +
        `bridge fallback failed: ${bridgeError instanceof Error ? bridgeError.message : 'unknown'}.`
      );
    }
  }
};

export const getFotMobMatchDetails = async (rawMatchId: unknown): Promise<MondialMatchDetails> => {
  const matchId = requireMatchId(rawMatchId);
  const now = Date.now();
  const cached = cache.get(matchId);
  if (cached && cached.expiresAt > now) return cached.details;
  if (!pending.has(matchId)) {
    pending.set(
      matchId,
      fetchMatchDetails(matchId)
        .then(details => {
          const fetchedAt = Date.now();
          cache.set(matchId, {
            expiresAt: fetchedAt + CACHE_TTL_MS,
            staleUntil: fetchedAt + STALE_TTL_MS,
            details,
          });
          return details;
        })
        .catch(error => {
          const stale = cache.get(matchId);
          if (stale && stale.staleUntil > Date.now()) {
            return { ...stale.details, sourceStatus: 'stale' as const };
          }
          throw error;
        })
        .finally(() => {
          pending.delete(matchId);
        })
    );
  }
  return pending.get(matchId)!;
};

export const getFotMobMatchDetailsUrl = MATCH_DETAILS_URL;
