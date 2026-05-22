/**
 * Player Intel V2 — Per-player image override store (browser-side only).
 *
 * Saves user-customized images (direct URL or local upload as data URL) keyed
 * by player slug. Supports compare mode (slot A vs B). No server calls; uses
 * localStorage with size guard (skips entries > 1.5MB to avoid quota issues).
 */

const STORAGE_KEY = 'reo:player-intel-v2:image-overrides:v1';
const MAX_BYTES_PER_ENTRY = 1_500_000;

export type ImageMode = 'auto' | 'direct_url' | 'local_upload' | 'hidden';
export type ImageObjectFit = 'contain' | 'cover';
export type ImagePosition = 'center' | 'top' | 'bottom';

export interface ImageOverride {
  mode: ImageMode;
  directUrl?: string;
  localDataUrl?: string;
  objectFit?: ImageObjectFit;
  position?: ImagePosition;
  opacity?: number;
  updatedAt: number;
}

interface Stored {
  schema: 1;
  entries: Record<string, ImageOverride>;
}

function _read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schema: 1, entries: {} };
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.schema !== 1) return { schema: 1, entries: {} };
    return parsed;
  } catch {
    return { schema: 1, entries: {} };
  }
}

function _write(s: Stored): boolean {
  try {
    const text = JSON.stringify(s);
    if (text.length > 4_500_000) {
      // Evict oldest entries until size is safe
      const entries = Object.entries(s.entries).sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      while (JSON.stringify(s).length > 4_000_000 && entries.length > 0) {
        const [oldKey] = entries.shift()!;
        delete s.entries[oldKey];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function getImageOverride(playerSlug: string): ImageOverride | null {
  if (!playerSlug) return null;
  return _read().entries[playerSlug] || null;
}

export function setImageOverride(playerSlug: string, override: Partial<ImageOverride>): boolean {
  if (!playerSlug) return false;
  const stored = _read();
  const existing = stored.entries[playerSlug] || { mode: 'auto', updatedAt: Date.now() } as ImageOverride;
  const merged: ImageOverride = {
    ...existing,
    ...override,
    updatedAt: Date.now(),
  };
  // Size guard for data URLs
  if (merged.localDataUrl && merged.localDataUrl.length > MAX_BYTES_PER_ENTRY) {
    return false;
  }
  stored.entries[playerSlug] = merged;
  return _write(stored);
}

export function clearImageOverride(playerSlug: string): void {
  const stored = _read();
  delete stored.entries[playerSlug];
  _write(stored);
}

/**
 * Resolve the URL/data to actually display, given the override state and
 * a fallback (FotMob auto URL).
 *
 * Returns null when the user explicitly hid the image.
 */
export function resolveImageUrl(
  override: ImageOverride | null,
  fallbackUrl: string | null,
): string | null {
  if (!override) return fallbackUrl;
  if (override.mode === 'hidden') return null;
  if (override.mode === 'direct_url' && override.directUrl) return override.directUrl;
  if (override.mode === 'local_upload' && override.localDataUrl) return override.localDataUrl;
  return fallbackUrl;
}

/**
 * Convert a File (image) to a base64 data URL, with size limit.
 * Returns null if the file is too large or not an image.
 */
export function fileToDataUrl(file: File, maxBytes = MAX_BYTES_PER_ENTRY): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(null); return; }
    if (file.size > maxBytes) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else resolve(null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
