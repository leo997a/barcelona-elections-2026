import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import { createHmac } from 'crypto';

// ─── Rate Limiter (in-memory, per serverless instance) ─────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (
  key: string,
  maxAttempts: number,
  windowMs: number,
): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= maxAttempts) return false; // blocked
  entry.count++;
  return true; // allowed
};

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 5 * 60 * 1000);

// ─── License key format: REO-XXXX-XXXX-XXXX-XXXX ─────────────────────────────
// Payload (before encoding): role|studioId|expiry|nonce
// HMAC-SHA256 with LICENSE_SECRET → base36 chunk

const SECRET = process.env.LICENSE_SECRET || 'rge-default-secret-change-in-prod';
const ROLES = ['VIEWER', 'OPERATOR', 'EDITOR', 'ADMIN'] as const;
type LicenseRole = typeof ROLES[number];

interface LicensePayload {
  role: LicenseRole;
  studioId: string;
  exp: number; // unix seconds, 0 = never
  nonce: string;
}

interface LicenseRequestBody {
  action: 'verify' | 'generate';
  key?: string;
  // generate-only (admin only via env flag)
  role?: LicenseRole;
  studioId?: string;
  daysValid?: number;
  adminSecret?: string;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

// Use full 8-char HMAC prefix as signature for better collision resistance
const hmacSig = (data: string): string =>
  createHmac('sha256', SECRET).update(data).digest('hex').substring(0, 8).toUpperCase();

// HEX is case-insensitive → safe to uppercase in the key display
const encodePayload = (payload: LicensePayload): string => {
  const raw = `${payload.role}|${payload.studioId}|${payload.exp}|${payload.nonce}`;
  return Buffer.from(raw, 'utf8').toString('hex').toUpperCase();
};

const decodePayload = (hexStr: string): LicensePayload | null => {
  try {
    const raw = Buffer.from(hexStr.toLowerCase(), 'hex').toString('utf8');
    const [role, studioId, exp, nonce] = raw.split('|');
    if (!ROLES.includes(role as LicenseRole)) return null;
    return { role: role as LicenseRole, studioId, exp: Number(exp), nonce };
  } catch {
    return null;
  }
};

// Key format: REO-{HEX_CHUNK_1}-{HEX_CHUNK_2}-...-{SIG}
// We take first 24 hex chars (split into 3×8) + 8-char sig = REO-XXXXXXXX-XXXXXXXX-XXXXXXXX-SSSSSSSS
const buildKey = (payload: LicensePayload): string => {
  const hex = encodePayload(payload); // full hex
  const sig = hmacSig(hex);
  // store full hex in first chunks separated by dashes
  const chunks = hex.match(/.{1,8}/g) || [hex];
  return `REO-${chunks.join('-')}-${sig}`;
};

const parseKey = (key: string): { hex: string; sig: string } | null => {
  const clean = key.trim().toUpperCase().replace(/\s/g, '');
  const parts = clean.split('-');
  // parts[0] = "REO", parts[last] = sig, middle = hex chunks
  if (parts.length < 3 || parts[0] !== 'REO') return null;
  const sig = parts[parts.length - 1];
  const hex = parts.slice(1, -1).join('');
  return { hex, sig };
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST', {});

  const body = await readJsonBody<LicenseRequestBody>(req).catch(() => null);
  if (!body?.action) return sendJson(res, 400, { error: 'action مطلوب.' });

  // Client IP for rate limiting (Vercel sets x-forwarded-for)
  const clientIp = String(
    (Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for']) ?? 'unknown'
  ).split(',')[0].trim();

  // ── VERIFY ──────────────────────────────────────────────────────────────────
  if (body.action === 'verify') {
    // Rate limit: 10 verify attempts per IP per minute
    if (!checkRateLimit(`verify:${clientIp}`, 10, 60_000)) {
      return sendJson(res, 429, { error: 'محاولات كثيرة. حاول بعد دقيقة.' });
    }
    const key = body.key?.trim();
    if (!key) return sendJson(res, 400, { error: 'المفتاح مطلوب.' });

    const parsed = parseKey(key);
    if (!parsed) return sendJson(res, 401, { valid: false, error: 'صيغة المفتاح غير صحيحة.' });

    const expectedSig = hmacSig(parsed.hex);
    if (parsed.sig !== expectedSig) {
      return sendJson(res, 401, { valid: false, error: 'المفتاح غير صالح أو مزوّر.' });
    }

    const payload = decodePayload(parsed.hex);
    if (!payload) return sendJson(res, 401, { valid: false, error: 'تعذّر قراءة المفتاح.' });

    if (payload.exp > 0 && payload.exp < Math.floor(Date.now() / 1000)) {
      return sendJson(res, 401, { valid: false, error: 'انتهت صلاحية المفتاح.' });
    }

    return sendJson(res, 200, {
      valid: true,
      role: payload.role,
      studioId: payload.studioId,
      exp: payload.exp,
    });
  }

  // ── GENERATE (admin only) ────────────────────────────────────────────────────
  if (body.action === 'generate') {
    // Rate limit: 3 generate attempts per IP per 5 minutes
    if (!checkRateLimit(`generate:${clientIp}`, 3, 5 * 60_000)) {
      return sendJson(res, 429, { error: 'محاولات توليد كثيرة. حاول بعد 5 دقائق.' });
    }
    const adminSecret = process.env.LICENSE_ADMIN_SECRET;
    if (!adminSecret || body.adminSecret !== adminSecret) {
      return sendJson(res, 403, { error: 'غير مصرح. يلزم سر المسؤول.' });
    }

    const role = (body.role || 'EDITOR') as LicenseRole;
    if (!ROLES.includes(role)) return sendJson(res, 400, { error: 'الدور غير صالح.' });

    const studioId = body.studioId?.trim() || `studio-${Date.now()}`;
    const daysValid = Number(body.daysValid) || 0;
    const exp = daysValid > 0 ? Math.floor(Date.now() / 1000) + daysValid * 86400 : 0;
    const nonce = Math.random().toString(36).substring(2, 10);

    const payload: LicensePayload = { role, studioId, exp, nonce };
    const key = buildKey(payload);

    return sendJson(res, 200, {
      key,
      role,
      studioId,
      exp,
      expiresAt: exp > 0 ? new Date(exp * 1000).toISOString() : 'لا تنتهي',
    });
  }

  return sendJson(res, 400, { error: 'action غير معروف.' });
}
