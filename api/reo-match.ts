/**
 * REO Match — Unified action router.
 *
 * Routes that previously lived as separate Vercel Serverless Functions:
 *  - GET  /api/reo-match/match           → /api/reo-match?action=match
 *  - GET  /api/reo-match/status          → /api/reo-match?action=status
 *  - GET  /api/reo-match/metrics-catalog → /api/reo-match?action=metrics-catalog
 *  - POST /api/reo-match/control?action=set-match (and start/stop/archive)
 *      → POST /api/reo-match?action=control&control=set-match
 *
 * Backward-compat: the legacy paths still work — frontend has been updated to
 * use the new query-string form. This consolidation keeps Player Intel V2
 * available without exceeding the Hobby plan limit of 12 functions.
 */
import { proxyBridgeGet, proxyBridgePost } from './_lib/reoBridge.js';
import { verifyAdminSession } from './_lib/adminToken.js';
import { getWorldCupSnapshot } from './_lib/fotmobWorldCup.js';
import {
  getBearerToken,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';

const getQuery = (req: ServerlessRequest) => {
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  return qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
};

const controlPath = (control: string | null) => {
  if (control === 'set-match') return '/api/control/set-match';
  if (control === 'start') return '/api/control/start';
  if (control === 'stop') return '/api/control/stop';
  if (control === 'archive') return '/api/control/archive';
  return null;
};

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  const query = getQuery(req);
  const action = query.get('action') || '';

  // ─── GET routes ────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (action === 'match') return proxyBridgeGet(res, '/api/match');
    if (action === 'status') return proxyBridgeGet(res, '/api/status');
    if (action === 'metrics-catalog') return proxyBridgeGet(res, '/api/metrics-catalog');
    if (action === 'world-cup') {
      try {
        const snapshot = await getWorldCupSnapshot();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('X-REO-Data-Version', snapshot.dataVersion);
        res.setHeader('X-REO-Source-Mode', snapshot.sourceMode);
        res.setHeader('X-REO-Source-Status', snapshot.sourceStatus);
        return sendJson(res, 200, snapshot);
      } catch (error) {
        return sendJson(res, 502, {
          error: 'Unable to load the World Cup feed.',
          detail: error instanceof Error ? error.message : 'Unknown FotMob feed error.',
        });
      }
    }
    return sendJson(res, 400, {
      error: 'Invalid action for GET. Use action=match, status, metrics-catalog, or world-cup.',
    });
  }

  // ─── POST routes (control) ────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (action !== 'control') {
      return sendJson(res, 400, {
        error: 'Invalid action for POST. Use action=control&control=set-match|start|stop|archive.',
      });
    }
    const sessionSecret =
      process.env.ADMIN_SESSION_SECRET ||
      process.env.EDITOR_ADMIN_PASSCODE ||
      process.env.ADMIN_ACCESS_CODE;
    const token = getBearerToken(req);
    if (!sessionSecret || !token || !verifyAdminSession(token, sessionSecret)) {
      return sendJson(res, 401, { error: 'Admin session required' });
    }
    const path = controlPath(query.get('control'));
    if (!path) {
      return sendJson(res, 400, {
        error: 'Invalid control. Use control=set-match, start, stop, or archive.',
      });
    }
    return proxyBridgePost(req, res, path);
  }

  return sendMethodNotAllowed(res, 'GET, POST, OPTIONS', { error: 'Method not allowed' });
}
