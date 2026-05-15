import { proxyBridgePost } from '../_lib/reoBridge.js';
import { verifyAdminSession } from '../_lib/adminToken.js';
import {
  getBearerToken,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js';

const getQuery = (req: ServerlessRequest) => {
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  return qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
};

const actionPath = (action: string | null) => {
  if (action === 'set-match') return '/api/control/set-match';
  if (action === 'start') return '/api/control/start';
  if (action === 'stop') return '/api/control/stop';
  if (action === 'archive') return '/api/control/archive';
  return null;
};

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST, OPTIONS', { error: 'Method not allowed' });
  }

  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.EDITOR_ADMIN_PASSCODE ||
    process.env.ADMIN_ACCESS_CODE;
  const token = getBearerToken(req);
  if (!sessionSecret || !token || !verifyAdminSession(token, sessionSecret)) {
    return sendJson(res, 401, { error: 'Admin session required' });
  }

  const path = actionPath(getQuery(req).get('action'));
  if (!path) {
    return sendJson(res, 400, { error: 'Invalid action. Use set-match, start, stop, or archive.' });
  }

  return proxyBridgePost(req, res, path);
}
