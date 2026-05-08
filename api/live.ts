import {
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import { getLiveState, setLiveState } from './_lib/liveStore.js';

const getQuery = (req: ServerlessRequest) => {
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  return qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
};

const applyNoCacheHeaders = (res: ServerlessResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  applyNoCacheHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  const query = getQuery(req);
  const id = query.get('id');
  if (!id) return sendJson(res, 400, { error: 'id is required' });

  if (req.method === 'GET') {
    const entry = await getLiveState(id);
    if (!entry) return sendJson(res, 404, { error: 'No live state has been published yet' });

    if (query.get('meta') === '1') {
      res.setHeader('X-Live-Version', String(entry.version));
      return sendJson(res, 200, {
        id: entry.id,
        updatedAt: entry.updatedAt,
        version: entry.version,
        clientVersion: entry.clientVersion,
      });
    }

    res.setHeader('X-Live-Version', String(entry.version));
    return sendJson(res, 200, entry);
  }

  if (req.method === 'POST') {
    const body = await readJsonBody<{ state?: unknown } | unknown>(req).catch(() => null);
    const state = body && typeof body === 'object' && 'state' in body ? (body as { state?: unknown }).state : body;
    if (!state) return sendJson(res, 400, { error: 'state is required' });

    const clientVersion = body && typeof body === 'object' && 'clientVersion' in body
      ? Number((body as { clientVersion?: unknown }).clientVersion)
      : Date.now();
    const entry = await setLiveState(id, state, Number.isFinite(clientVersion) ? clientVersion : Date.now());
    return sendJson(res, 200, {
      ok: true,
      updatedAt: entry.updatedAt,
      version: entry.version,
      clientVersion: entry.clientVersion,
    });
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}
