import {
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import { getLiveState, setLiveState } from './_lib/liveStore.js';

const getId = (req: ServerlessRequest) => {
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  const params = qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
  return params.get('id');
};

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  const id = getId(req);
  if (!id) return sendJson(res, 400, { error: 'id is required' });

  if (req.method === 'GET') {
    const entry = await getLiveState(id);
    if (!entry) return sendJson(res, 404, { error: 'No live state has been published yet' });
    return sendJson(res, 200, entry);
  }

  if (req.method === 'POST') {
    const body = await readJsonBody<{ state?: unknown } | unknown>(req).catch(() => null);
    const state = body && typeof body === 'object' && 'state' in body ? (body as { state?: unknown }).state : body;
    if (!state) return sendJson(res, 400, { error: 'state is required' });

    const entry = await setLiveState(id, state);
    return sendJson(res, 200, { ok: true, updatedAt: entry.updatedAt, version: entry.version });
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}
