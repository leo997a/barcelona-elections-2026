export const PLAYER_IMAGE_CACHE_URL = '/player-image-cache/barcelona.json?v=20260515';
export const LA_LIGA_LOGO_CACHE_URL = '/club-logo-cache/la-liga.json?v=20260515';

export const normalizeAssetKey = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

export const parseAssetMap = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, url]) => {
    const normalized = normalizeAssetKey(key);
    const assetUrl = String(url || '').trim();
    if (normalized && /^https?:\/\//i.test(assetUrl)) acc[normalized] = assetUrl;
    return acc;
  }, {});
};

export const fetchAssetCache = async (url: string): Promise<Record<string, string>> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Asset cache failed: ${response.status}`);
  return parseAssetMap(await response.json());
};

export const assetCandidates = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) return [];
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return Array.from(new Set([
    text,
    last,
    first && last ? `${first[0]} ${last}` : '',
    first && last ? `${first[0]}. ${last}` : '',
  ].filter(Boolean)));
};

export const findAssetUrl = (candidates: unknown[], map: Record<string, string>) => {
  for (const candidate of candidates) {
    const direct = String(candidate || '').trim();
    if (/^https?:\/\//i.test(direct)) return direct;
    const found = map[normalizeAssetKey(candidate)];
    if (found) return found;
  }
  return '';
};
