export const ASSET_CACHE_VERSION = '20260515';

export const PLAYER_IMAGE_CACHE_URL = `/player-image-cache/barcelona.json?v=${ASSET_CACHE_VERSION}`;
export const LA_LIGA_LOGO_CACHE_URL = `/club-logo-cache/la-liga.json?v=${ASSET_CACHE_VERSION}`;

export const PLAYER_PORTRAIT_CACHE_URLS = [
  PLAYER_IMAGE_CACHE_URL,
  `/player-image-cache/chelsea.json?v=${ASSET_CACHE_VERSION}`,
];

export const PLAYER_RENDER_CACHE_URLS = [
  `/player-image-cache/barcelona-render.json?v=${ASSET_CACHE_VERSION}`,
  `/player-image-cache/chelsea-render.json?v=${ASSET_CACHE_VERSION}`,
  PLAYER_IMAGE_CACHE_URL,
  `/player-image-cache/chelsea.json?v=${ASSET_CACHE_VERSION}`,
];

export const CLUB_LOGO_CACHE_URLS = [
  LA_LIGA_LOGO_CACHE_URL,
  `/club-logo-cache/premier-league.json?v=${ASSET_CACHE_VERSION}`,
];

type AssetRecord = {
  url?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  portrait?: unknown;
  small?: unknown;
  thumbnail?: unknown;
  thumb?: unknown;
  render?: unknown;
  large?: unknown;
  cutout?: unknown;
  aliases?: unknown;
};

export type AssetVariant = 'portrait' | 'render';

export const normalizeAssetKey = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const variantUrl = (record: AssetRecord, variant: AssetVariant) => {
  const preferred = variant === 'render'
    ? [record.render, record.large, record.cutout, record.portrait, record.small, record.thumbnail, record.thumb, record.url, record.imageUrl, record.image]
    : [record.portrait, record.small, record.thumbnail, record.thumb, record.url, record.imageUrl, record.image, record.render, record.large, record.cutout];
  return String(preferred.find(item => typeof item === 'string' && item.trim()) || '').trim();
};

const addAsset = (acc: Record<string, string>, key: unknown, url: unknown) => {
  const normalized = normalizeAssetKey(key);
  const assetUrl = String(url || '').trim();
  if (normalized && /^https?:\/\//i.test(assetUrl)) acc[normalized] = assetUrl;
};

export const parseAssetMap = (value: unknown, variant: AssetVariant = 'portrait'): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, url]) => {
    if (typeof url === 'string') {
      addAsset(acc, key, url);
      return acc;
    }

    if (url && typeof url === 'object') {
      const record = url as AssetRecord;
      const assetUrl = variantUrl(record, variant);
      addAsset(acc, key, assetUrl);

      const aliases = Array.isArray(record.aliases) ? record.aliases : [];
      aliases.forEach(alias => addAsset(acc, alias, assetUrl));
    }

    return acc;
  }, {});
};

export const fetchAssetCache = async (url: string, variant: AssetVariant = 'portrait'): Promise<Record<string, string>> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Asset cache failed: ${response.status}`);
  return parseAssetMap(await response.json(), variant);
};

export const splitAssetCacheUrls = (value: string | string[]) => {
  const items = Array.isArray(value) ? value : String(value || '').split(/[,\n;]+/);
  return Array.from(new Set(items.map(item => item.trim()).filter(Boolean)));
};

export const fetchAssetCaches = async (
  urls: string | string[],
  variant: AssetVariant = 'portrait',
): Promise<Record<string, string>> => {
  const results = await Promise.allSettled(splitAssetCacheUrls(urls).map(url => fetchAssetCache(url, variant)));
  return results.reduce<Record<string, string>>((acc, result) => {
    if (result.status === 'fulfilled') return { ...acc, ...result.value };
    console.warn('Asset cache unavailable', result.reason);
    return acc;
  }, {});
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
