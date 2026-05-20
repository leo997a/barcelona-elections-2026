/**
 * Runtime store for on-demand FotMob profiles.
 *
 * Vercel functions have read-only filesystems, so we keep a per-instance
 * in-memory cache. The frontend mirrors this in localStorage so a refresh
 * still shows previously-built players.
 *
 * Deployment scope:
 *  - serverless instance memory (cold start = empty)
 *  - frontend localStorage (persistent client-side)
 *
 * NOT a database. NOT shared between users. Per-session by design until we
 * add a real backend store (Phase X.13+).
 */

import type { BroadcastProfile } from './fotmobBroadcastBuilder.js';

interface StoreEntry {
  slug: string;
  profile: BroadcastProfile;
  builtAt: number;
}

const _store = new Map<string, StoreEntry>();
const MAX_ENTRIES = 50;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function _evictExpired(): void {
  const now = Date.now();
  for (const [k, v] of _store.entries()) {
    if (now - v.builtAt > TTL_MS) _store.delete(k);
  }
  // LRU: if too many, drop oldest
  if (_store.size > MAX_ENTRIES) {
    const sorted = Array.from(_store.entries()).sort((a, b) => a[1].builtAt - b[1].builtAt);
    while (_store.size > MAX_ENTRIES && sorted.length > 0) {
      const [k] = sorted.shift()!;
      _store.delete(k);
    }
  }
}

export function saveProfile(slug: string, profile: BroadcastProfile): void {
  _evictExpired();
  _store.set(slug, { slug, profile, builtAt: Date.now() });
}

export function getProfile(slug: string): BroadcastProfile | null {
  _evictExpired();
  const e = _store.get(slug);
  return e ? e.profile : null;
}

export function listProfiles(): Array<{ slug: string; name: string; club: string; builtAt: number }> {
  _evictExpired();
  return Array.from(_store.values()).map((e) => ({
    slug: e.slug,
    name: e.profile.player.name,
    club: e.profile.player.club,
    builtAt: e.builtAt,
  }));
}
