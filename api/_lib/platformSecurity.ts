import type { ServerlessRequest } from './http.js';

type HeaderValue = string | string[] | undefined;

export interface IdentityProfileSource {
  uid: string;
  email?: string | null;
  emailVerified: boolean;
  displayName?: string | null;
  photoURL?: string | null;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const readHeaderValue = (value: HeaderValue) => {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return value?.trim() ?? '';
};

export const getRequestHeader = (request: ServerlessRequest, name: string) => {
  const lowerName = name.toLowerCase();
  return readHeaderValue(request.headers[lowerName] ?? request.headers[name]);
};

export const normalizeIdentityEmail = (email: string) => email.trim().toLowerCase();

export const hasJsonContentType = (request: ServerlessRequest) =>
  getRequestHeader(request, 'content-type').toLowerCase().startsWith('application/json');

export const getClientAddress = (request: ServerlessRequest) => {
  const forwarded = getRequestHeader(request, 'x-forwarded-for').split(',')[0]?.trim();
  return forwarded || 'unknown';
};

export const isTrustedRequestOrigin = (request: ServerlessRequest) => {
  const origin = getRequestHeader(request, 'origin');
  const forwardedHost = getRequestHeader(request, 'x-forwarded-host').split(',')[0]?.trim();
  const host = forwardedHost || getRequestHeader(request, 'host');
  if (!origin || !host) return false;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
};

export const buildIdentityProfile = (source: IdentityProfileSource) => ({
  uid: source.uid,
  email: source.email?.trim() ?? '',
  emailLower: normalizeIdentityEmail(source.email ?? ''),
  displayName: source.displayName?.trim() || null,
  photoURL: source.photoURL?.trim() || null,
  emailVerified: source.emailVerified,
});

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  consume(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const current = this.entries.get(key);
    if (!current || now >= current.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + windowMs });
      this.prune(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }

    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private prune(now: number) {
    if (this.entries.size < 1_000) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}
