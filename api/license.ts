import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import { createHmac } from 'crypto';

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

const hmacChunk = (data: string): string =>
  createHmac('sha256', SECRET).update(data).digest('hex').substring(0, 4).toUpperCase();

const encodePayload = (payload: LicensePayload): string => {
  const raw = `${payload.role}|${payload.studioId}|${payload.exp}|${payload.nonce}`;
  return Buffer.from(raw).toString('base64url');
};

const decodePayload = (encoded: string): LicensePayload | null => {
  try {
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    const [role, studioId, exp, nonce] = raw.split('|');
    if (!ROLES.includes(role as LicenseRole)) return null;
    return { role: role as LicenseRole, studioId, exp: Number(exp), nonce };
  } catch {
    return null;
  }
};

const buildKey = (payload: LicensePayload): string => {
  const encoded = encodePayload(payload);
  const parts = encoded.match(/.{1,8}/g) || [encoded];
  const sig = hmacChunk(encoded);
  return `REO-${parts.slice(0, 4).join('-').toUpperCase()}-${sig}`;
};

const parseKey = (key: string): { encoded: string; sig: string } | null => {
  const clean = key.trim().toUpperCase();
  const parts = clean.split('-');
  if (parts.length < 3 || parts[0] !== 'REO') return null;
  const sig = parts[parts.length - 1];
  const encoded = Buffer.from(parts.slice(1, -1).join('').toLowerCase(), 'base64url').toString('base64url');
  return { encoded, sig };
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST', {});

  const body = await readJsonBody<LicenseRequestBody>(req).catch(() => null);
  if (!body?.action) return sendJson(res, 400, { error: 'action مطلوب.' });

  // ── VERIFY ──────────────────────────────────────────────────────────────────
  if (body.action === 'verify') {
    const key = body.key?.trim();
    if (!key) return sendJson(res, 400, { error: 'المفتاح مطلوب.' });

    const parsed = parseKey(key);
    if (!parsed) return sendJson(res, 401, { valid: false, error: 'صيغة المفتاح غير صحيحة.' });

    const expectedSig = hmacChunk(parsed.encoded);
    if (parsed.sig !== expectedSig) {
      return sendJson(res, 401, { valid: false, error: 'المفتاح غير صالح أو مزوّر.' });
    }

    const payload = decodePayload(parsed.encoded);
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
