import {
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import {
  describeLiveStoreMode,
  getLiveState,
  setLiveState,
  subscribeLiveState,
  type LiveStateEntry,
} from './_lib/liveStore.js';

type StreamRequest = ServerlessRequest & {
  url?: string;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type StreamResponse = ServerlessResponse & {
  write?: (chunk: string) => boolean | void;
  flushHeaders?: () => void;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getId = (req: StreamRequest) => {
  const rawUrl = req.url ?? '';
  const qIndex = rawUrl.indexOf('?');
  const params = qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
  return params.get('id');
};

const applyNoCacheHeaders = (res: StreamResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

const writeSse = (res: StreamResponse, value: string) => {
  res.write?.(value);
};

export default async function handler(req: StreamRequest, res: StreamResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Live-Store', describeLiveStoreMode());
  applyNoCacheHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  const id = getId(req);
  if (!id) return sendJson(res, 400, { error: 'id is required' });

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

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!res.write) {
    const entry = await getLiveState(id);
    return sendJson(res, entry ? 200 : 404, entry ?? { error: 'Streaming is unavailable in this runtime' });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, no-transform, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  let lastVersion = -1;
  let lastHeartbeat = Date.now();
  req.on?.('close', () => {
    closed = true;
  });

  const emitEntry = (entry: LiveStateEntry | null) => {
    if (!entry || entry.version === lastVersion || closed) return;
    lastVersion = entry.version;
    writeSse(res, `id: ${entry.version}\ndata: ${JSON.stringify(entry.state)}\n\n`);
  };

  const unsubscribe = subscribeLiveState(id, emitEntry);

  writeSse(res, 'retry: 3000\n\n');
  writeSse(res, ': connected\n\n');
  emitEntry(await getLiveState(id));

  const startedAt = Date.now();
  const maxConnectionMs = process.env.VERCEL ? 55_000 : 6 * 60 * 60 * 1000;
  const refreshMs = process.env.VERCEL ? 1_000 : 600;
  while (!closed && Date.now() - startedAt < maxConnectionMs) {
    emitEntry(await getLiveState(id));

    const now = Date.now();
    if (now - lastHeartbeat > 12_000) {
      lastHeartbeat = now;
      writeSse(res, ': ping\n\n');
    }

    await delay(refreshMs);
  }

  unsubscribe();
  res.end('');
}
