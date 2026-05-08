import {
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import { getLiveState, setLiveState } from './_lib/liveStore.js';

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

const writeSse = (res: StreamResponse, value: string) => {
  res.write?.(value);
};

export default async function handler(req: StreamRequest, res: StreamResponse) {
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

  if (req.method === 'POST') {
    const body = await readJsonBody<{ state?: unknown } | unknown>(req).catch(() => null);
    const state = body && typeof body === 'object' && 'state' in body ? (body as { state?: unknown }).state : body;
    if (!state) return sendJson(res, 400, { error: 'state is required' });

    const entry = await setLiveState(id, state);
    return sendJson(res, 200, { ok: true, updatedAt: entry.updatedAt, version: entry.version });
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
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  let lastVersion = -1;
  let lastHeartbeat = Date.now();
  req.on?.('close', () => {
    closed = true;
  });

  writeSse(res, ': connected\n\n');

  const startedAt = Date.now();
  while (!closed && Date.now() - startedAt < 55_000) {
    const entry = await getLiveState(id);
    if (entry && entry.version !== lastVersion) {
      lastVersion = entry.version;
      writeSse(res, `data: ${JSON.stringify(entry.state)}\n\n`);
    }

    const now = Date.now();
    if (now - lastHeartbeat > 12_000) {
      lastHeartbeat = now;
      writeSse(res, ': ping\n\n');
    }

    await delay(220);
  }

  res.end('');
}
