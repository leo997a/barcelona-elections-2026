// ─── Admin Secrets Status API ──────────────────────────────────────────────
// Returns METADATA ONLY for monitored secrets.
// NEVER returns actual secret values.
// Protected by admin session JWT.

import { createHash } from 'crypto';
import { verifyAdminSession } from '../../_lib/adminToken.js';
import {
  getBearerToken,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../../_lib/http.js';

interface SecretStatusItem {
  name: string;
  envVar: string;
  location: string;
  exists: boolean;
  length: number;
  last4: string;
  fingerprint: string;
  purpose: string;
  risk: string;
  lastCheckedAt: string;
}

// Registry of secrets to monitor — ONLY metadata is returned
const MONITORED_SECRETS = [
  { envVar: 'REO_PLAYER_STATS_BRIDGE_URL',   purpose: 'VPS Bridge endpoint',      risk: 'medium' },
  { envVar: 'REO_PLAYER_STATS_BRIDGE_TOKEN', purpose: 'VPS Bridge auth token',    risk: 'critical' },
  { envVar: 'GEMINI_API_KEY',                 purpose: 'AI text generation',       risk: 'high' },
  { envVar: 'LICENSE_SECRET',                 purpose: 'License key signing',      risk: 'high' },
  { envVar: 'LICENSE_ADMIN_SECRET',           purpose: 'License generation auth',  risk: 'critical' },
  { envVar: 'ADMIN_SESSION_SECRET',           purpose: 'JWT session signing',      risk: 'high' },
  { envVar: 'EDITOR_ADMIN_PASSCODE',         purpose: 'Admin login passcode',     risk: 'high' },
];

function getSecretMetadata(envVar: string, purpose: string, risk: string): SecretStatusItem {
  const value = process.env[envVar]?.trim() ?? '';
  const exists = value.length > 0;

  return {
    name: envVar.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    envVar,
    location: 'process.env (Vercel)',
    exists,
    length: exists ? value.length : 0,
    last4: exists ? value.slice(-4) : '',
    fingerprint: exists
      ? createHash('sha256').update(value).digest('hex').slice(0, 16)
      : '',
    purpose,
    risk,
    lastCheckedAt: new Date().toISOString(),
  };
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, 'GET', { error: 'Method not allowed' });
  }

  // ── Auth: require valid admin session ──
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.EDITOR_ADMIN_PASSCODE ||
    process.env.ADMIN_ACCESS_CODE;

  if (!sessionSecret) {
    return sendJson(res, 503, { error: 'Admin session not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return sendJson(res, 401, { error: 'Authorization required.' });
  }

  const payload = verifyAdminSession(token, sessionSecret);
  if (!payload) {
    return sendJson(res, 401, { error: 'Invalid or expired session.' });
  }

  // ── Build metadata response (NO secret values) ──
  const secrets = MONITORED_SECRETS.map(s =>
    getSecretMetadata(s.envVar, s.purpose, s.risk)
  );

  const summary = {
    total: secrets.length,
    configured: secrets.filter(s => s.exists).length,
    missing: secrets.filter(s => !s.exists).length,
    critical: secrets.filter(s => s.risk === 'critical' && !s.exists).length,
  };

  return sendJson(res, 200, { secrets, summary, checkedAt: new Date().toISOString() });
}
