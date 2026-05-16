// ─── Admin Secrets API (Consolidated) ──────────────────────────────────────
// Single endpoint handling both status and test actions.
// Merged to stay within Vercel Hobby plan's 12 serverless function limit.
//
// SECURITY:
// - Protected by admin session JWT
// - NEVER returns actual secret values
// - Only metadata (exists, length, last4, fingerprint) flows to client

import { createHash } from 'crypto';
import { verifyAdminSession } from '../_lib/adminToken.js';
import {
  getBearerToken,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js';

// ── Types ──────────────────────────────────────────────────────────────────

interface SecretsBody {
  action?: 'status' | 'test';
  service?: string;
}

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

interface TestResult {
  service: string;
  configured: boolean;
  reachable: boolean;
  auth: { required: boolean; provided: boolean; valid: boolean };
  latencyMs: number;
  error?: string;
}

// ── Secret Registry ────────────────────────────────────────────────────────

const MONITORED_SECRETS = [
  { envVar: 'REO_PLAYER_STATS_BRIDGE_URL',   purpose: 'VPS Bridge endpoint',      risk: 'medium' },
  { envVar: 'REO_PLAYER_STATS_BRIDGE_TOKEN', purpose: 'VPS Bridge auth token',    risk: 'critical' },
  { envVar: 'GEMINI_API_KEY',                 purpose: 'AI text generation',       risk: 'high' },
  { envVar: 'LICENSE_SECRET',                 purpose: 'License key signing',      risk: 'high' },
  { envVar: 'LICENSE_ADMIN_SECRET',           purpose: 'License generation auth',  risk: 'critical' },
  { envVar: 'ADMIN_SESSION_SECRET',           purpose: 'JWT session signing',      risk: 'high' },
  { envVar: 'EDITOR_ADMIN_PASSCODE',         purpose: 'Admin login passcode',     risk: 'high' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

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
    fingerprint: exists ? createHash('sha256').update(value).digest('hex').slice(0, 16) : '',
    purpose,
    risk,
    lastCheckedAt: new Date().toISOString(),
  };
}

// ── ACTION: status ─────────────────────────────────────────────────────────

function handleStatus(res: ServerlessResponse) {
  const secrets = MONITORED_SECRETS.map(s => getSecretMetadata(s.envVar, s.purpose, s.risk));
  const summary = {
    total: secrets.length,
    configured: secrets.filter(s => s.exists).length,
    missing: secrets.filter(s => !s.exists).length,
    critical: secrets.filter(s => s.risk === 'critical' && !s.exists).length,
  };
  return sendJson(res, 200, { secrets, summary, checkedAt: new Date().toISOString() });
}

// ── ACTION: test ───────────────────────────────────────────────────────────

async function testPlayerStatsBridge(): Promise<TestResult> {
  const bridgeUrl = process.env.REO_PLAYER_STATS_BRIDGE_URL?.trim();
  const bridgeToken = process.env.REO_PLAYER_STATS_BRIDGE_TOKEN?.trim();
  const result: TestResult = {
    service: 'Player Stats Bridge',
    configured: Boolean(bridgeUrl),
    reachable: false,
    auth: { required: true, provided: Boolean(bridgeToken), valid: false },
    latencyMs: 0,
  };
  if (!bridgeUrl) { result.error = 'REO_PLAYER_STATS_BRIDGE_URL not configured'; return result; }

  const start = Date.now();
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (bridgeToken) headers.Authorization = `Bearer ${bridgeToken}`;
    const response = await fetch(bridgeUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ mode: 'SINGLE', season: '2025/26', player: { name: 'Robert Lewandowski', club: 'Barcelona' }, selectedMetrics: ['goals'], providerPolicy: 'auto' }),
      signal: AbortSignal.timeout(8000),
    });
    result.latencyMs = Date.now() - start;
    result.reachable = true;
    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data?.auth) { result.auth.required = data.auth.required ?? true; result.auth.provided = data.auth.provided ?? Boolean(bridgeToken); result.auth.valid = data.auth.valid ?? false; }
      else { result.auth.valid = Boolean(data?.players); }
    } else if (response.status === 401 || response.status === 403) {
      result.error = `Auth failed (HTTP ${response.status})`;
    } else { result.error = `HTTP ${response.status}`; }
  } catch (err) { result.latencyMs = Date.now() - start; result.error = err instanceof Error ? err.message : 'Connection failed'; }
  return result;
}

async function testGeminiApi(): Promise<TestResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const result: TestResult = {
    service: 'Gemini API',
    configured: Boolean(apiKey),
    reachable: false,
    auth: { required: true, provided: Boolean(apiKey), valid: false },
    latencyMs: 0,
  };
  if (!apiKey) { result.error = 'GEMINI_API_KEY not configured'; return result; }

  const start = Date.now();
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { signal: AbortSignal.timeout(5000) });
    result.latencyMs = Date.now() - start;
    result.reachable = true;
    result.auth.valid = response.ok;
    if (!response.ok) result.error = `HTTP ${response.status}`;
  } catch (err) { result.latencyMs = Date.now() - start; result.error = err instanceof Error ? err.message : 'Connection failed'; }
  return result;
}

async function handleTest(res: ServerlessResponse, service: string) {
  const results: TestResult[] = [];
  if (service === 'all' || service === 'bridge' || service === 'player_stats') results.push(await testPlayerStatsBridge());
  if (service === 'all' || service === 'gemini') results.push(await testGeminiApi());
  if (results.length === 0) return sendJson(res, 400, { error: `Unknown service: ${service}` });
  return sendJson(res, 200, { results, allHealthy: results.every(r => r.configured && r.reachable && r.auth.valid), testedAt: new Date().toISOString() });
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return sendMethodNotAllowed(res, 'GET, POST', { error: 'Method not allowed' });
  }

  // ── Auth: require valid admin session ──
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.EDITOR_ADMIN_PASSCODE || process.env.ADMIN_ACCESS_CODE;
  if (!sessionSecret) return sendJson(res, 503, { error: 'Admin session not configured.' });

  const token = getBearerToken(req);
  if (!token) return sendJson(res, 401, { error: 'Authorization required.' });

  const payload = verifyAdminSession(token, sessionSecret);
  if (!payload) return sendJson(res, 401, { error: 'Invalid or expired session.' });

  // ── Route by action ──
  if (req.method === 'GET') {
    // GET = status (backward compat)
    return handleStatus(res);
  }

  const body = await readJsonBody<SecretsBody>(req).catch(() => ({} as SecretsBody));
  const action = body.action || 'status';

  if (action === 'status') return handleStatus(res);
  if (action === 'test') return handleTest(res, body.service?.toLowerCase() ?? 'all');

  return sendJson(res, 400, { error: `Unknown action: ${action}` });
}
