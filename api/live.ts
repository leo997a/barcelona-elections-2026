import {
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';

// ─── In-memory live state store ───────────────────────────────────────────────
// Persists across warm invocations of the same Vercel function instance.
// For single-user broadcast use-cases this is perfectly reliable.
const store = new Map<string, { state: unknown; updatedAt: number }>();

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  // CORS for browser fetch calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  // Extract overlay ID from query string
  // URL pattern: /api/live?id=instance-xxx
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  const params = qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
  const id = params.get('id');

  if (!id) return sendJson(res, 400, { error: 'id مطلوب' });

  // ── GET: return current live state ──────────────────────────────────────────
  if (req.method === 'GET') {
    const entry = store.get(id);
    if (!entry) return sendJson(res, 404, { error: 'لا توجد بيانات حية بعد' });
    return sendJson(res, 200, entry);
  }

  // ── POST: push new state from main app ──────────────────────────────────────
  if (req.method === 'POST') {
    const body = await readJsonBody<{ state: unknown }>(req).catch(() => null);
    if (!body?.state) return sendJson(res, 400, { error: 'state مطلوب' });

    store.set(id, { state: body.state, updatedAt: Date.now() });
    return sendJson(res, 200, { ok: true, updatedAt: store.get(id)!.updatedAt });
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}
