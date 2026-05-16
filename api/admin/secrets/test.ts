// ─── Admin Secrets Test API ────────────────────────────────────────────────
// Tests connectivity to external services WITHOUT revealing any secret values.
// Protected by admin session JWT.
//
// SECURITY:
// - NEVER logs or returns any token/secret value
// - Only returns boolean status and latency

import { verifyAdminSession } from '../../_lib/adminToken.js';
import {
  getBearerToken,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../../_lib/http.js';

interface TestResult {
  service: string;
  configured: boolean;
  reachable: boolean;
  auth: {
    required: boolean;
    provided: boolean;
    valid: boolean;
  };
  latencyMs: number;
  error?: string;
}

interface TestBody {
  service?: string;
}

async function testPlayerStatsBridge(): Promise<TestResult> {
  const bridgeUrl = process.env.REO_PLAYER_STATS_BRIDGE_URL?.trim();
  const bridgeToken = process.env.REO_PLAYER_STATS_BRIDGE_TOKEN?.trim();

  const result: TestResult = {
    service: 'Player Stats Bridge',
    configured: Boolean(bridgeUrl),
    reachable: false,
    auth: {
      required: true,
      provided: Boolean(bridgeToken),
      valid: false,
    },
    latencyMs: 0,
  };

  if (!bridgeUrl) {
    result.error = 'REO_PLAYER_STATS_BRIDGE_URL not configured';
    return result;
  }

  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (bridgeToken) {
      headers.Authorization = `Bearer ${bridgeToken}`;
    }

    // Use a lightweight POST to test connectivity
    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mode: 'SINGLE',
        season: '2025/26',
        player: { name: 'Robert Lewandowski', club: 'Barcelona' },
        selectedMetrics: ['goals'],
        providerPolicy: 'auto',
      }),
      signal: AbortSignal.timeout(8000),
    });

    result.latencyMs = Date.now() - start;
    result.reachable = true;

    if (response.ok) {
      const data = await response.json().catch(() => null);
      // Check if the bridge returned valid auth info
      if (data?.auth) {
        result.auth.required = data.auth.required ?? true;
        result.auth.provided = data.auth.provided ?? Boolean(bridgeToken);
        result.auth.valid = data.auth.valid ?? false;
      } else {
        // If response is OK and has players, auth is valid
        result.auth.valid = Boolean(data?.players);
      }
    } else if (response.status === 401 || response.status === 403) {
      result.auth.valid = false;
      result.error = `Auth failed (HTTP ${response.status})`;
    } else {
      result.error = `HTTP ${response.status}`;
    }
  } catch (err) {
    result.latencyMs = Date.now() - start;
    result.error = err instanceof Error ? err.message : 'Connection failed';
  }

  return result;
}

async function testGeminiApi(): Promise<TestResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  const result: TestResult = {
    service: 'Gemini API',
    configured: Boolean(apiKey),
    reachable: false,
    auth: {
      required: true,
      provided: Boolean(apiKey),
      valid: false,
    },
    latencyMs: 0,
  };

  if (!apiKey) {
    result.error = 'GEMINI_API_KEY not configured';
    return result;
  }

  const start = Date.now();
  try {
    // Lightweight model list request to test key validity
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    result.latencyMs = Date.now() - start;
    result.reachable = true;
    result.auth.valid = response.ok;

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
    }
  } catch (err) {
    result.latencyMs = Date.now() - start;
    result.error = err instanceof Error ? err.message : 'Connection failed';
  }

  return result;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST', { error: 'Method not allowed' });
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

  // ── Parse request ──
  const body = await readJsonBody<TestBody>(req).catch(() => ({} as TestBody));
  const service = body.service?.toLowerCase() ?? 'all';

  const results: TestResult[] = [];

  if (service === 'all' || service === 'bridge' || service === 'player_stats') {
    results.push(await testPlayerStatsBridge());
  }

  if (service === 'all' || service === 'gemini') {
    results.push(await testGeminiApi());
  }

  if (results.length === 0) {
    return sendJson(res, 400, { error: `Unknown service: ${body.service}` });
  }

  return sendJson(res, 200, {
    results,
    allHealthy: results.every(r => r.configured && r.reachable && r.auth.valid),
    testedAt: new Date().toISOString(),
  });
}
