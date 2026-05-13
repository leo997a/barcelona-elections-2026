import {
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './http.js';

type JsonRecord = Record<string, unknown>;

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const bridgeConfig = () => {
  const baseUrl = process.env.REO_BRIDGE_URL || '';
  const token = process.env.REO_BRIDGE_TOKEN || '';
  if (!baseUrl || !token) {
    return null;
  }
  return {
    baseUrl: trimSlash(baseUrl),
    token,
  };
};

const bridgeFetch = async (path: string, init?: RequestInit) => {
  const config = bridgeConfig();
  if (!config) {
    return {
      ok: false,
      status: 503,
      json: async () => ({
        error: 'REO cloud bridge is not configured',
        missing: ['REO_BRIDGE_URL', 'REO_BRIDGE_TOKEN'],
      }),
    } as Response;
  }

  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
};

export const proxyBridgeGet = async (
  response: ServerlessResponse,
  path: string,
) => {
  try {
    const upstream = await bridgeFetch(path);
    const payload = await upstream.json().catch(() => ({ error: 'Invalid bridge response' }));
    return sendJson(response, upstream.status, payload);
  } catch (error) {
    return sendJson(response, 502, {
      error: 'Could not reach REO cloud bridge',
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }
};

export const proxyBridgePost = async (
  request: ServerlessRequest,
  response: ServerlessResponse,
  path: string,
) => {
  try {
    const body = await readJsonBody<JsonRecord>(request).catch(() => ({}));
    const upstream = await bridgeFetch(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
    const payload = await upstream.json().catch(() => ({ error: 'Invalid bridge response' }));
    return sendJson(response, upstream.status, payload);
  } catch (error) {
    return sendJson(response, 502, {
      error: 'Could not reach REO cloud bridge',
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }
};
