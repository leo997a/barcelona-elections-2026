import {
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

const appendParam = (params: URLSearchParams, key: string, value: string | null) => {
  const clean = value?.trim();
  if (clean) params.set(key, clean);
};

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, 'GET, OPTIONS', { error: 'Method not allowed' });
  }

  const token = process.env.SPORTMONKS_API_TOKEN?.trim();
  if (!token) {
    return sendJson(res, 200, {
      ok: false,
      configured: false,
      reason: 'missing SPORTMONKS_API_TOKEN',
      setup: 'Set SPORTMONKS_API_TOKEN in the Vercel project environment. Never expose the token in browser fields.',
    });
  }

  const query = getQuery(req);
  const playerId = query.get('playerId')?.trim();
  const search = query.get('search')?.trim();

  if (!playerId && !search) {
    return sendJson(res, 400, { ok: false, error: 'playerId or search is required' });
  }

  const endpoint = playerId
    ? `players/${encodeURIComponent(playerId)}`
    : `players/search/${encodeURIComponent(search || '')}`;
  const params = new URLSearchParams({ api_token: token });
  appendParam(params, 'include', query.get('include') || 'metadata;position;detailedPosition;statistics');
  appendParam(params, 'select', query.get('select') || 'name,display_name,common_name,image_path,date_of_birth,height,weight');
  appendParam(params, 'timezone', query.get('timezone'));

  const url = `https://api.sportmonks.com/v3/football/${endpoint}?${params.toString()}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'reo-live-stream-sportmonks-proxy',
      },
    });
    const text = await upstream.text();
    const payload = text ? JSON.parse(text) as unknown : null;

    if (!upstream.ok) {
      return sendJson(res, upstream.status, {
        ok: false,
        configured: true,
        status: upstream.status,
        data: payload,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      configured: true,
      provider: 'Sportmonks Football API v3',
      data: payload,
    });
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : 'Sportmonks request failed',
    });
  }
}
