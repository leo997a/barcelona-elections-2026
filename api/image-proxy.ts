import {
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 9000;

const getQuery = (req: ServerlessRequest) => {
  const rawUrl = req.url ?? '';
  const qIndex = rawUrl.indexOf('?');
  return qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
};

const isBlockedHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
};

const isLikelyImageUrl = (url: URL) =>
  /\.(png|jpe?g|webp|gif|svg)(?:$|[?#])/i.test(url.pathname);

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, 'GET, OPTIONS', { error: 'Method not allowed' });
  }

  const rawUrl = getQuery(req).get('url') || '';
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return sendJson(res, 400, { error: 'A valid image url is required' });
  }

  if (!['http:', 'https:'].includes(target.protocol) || isBlockedHost(target.hostname)) {
    return sendJson(res, 400, { error: 'Unsupported image url' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.8,*/*;q=0.1',
        'User-Agent': 'REO-Show-Image-Export/1.0',
      },
    });

    if (!response.ok) {
      return sendJson(res, response.status, { error: `Image request failed: ${response.status}` });
    }

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
    if (!contentType.startsWith('image/') && !isLikelyImageUrl(target)) {
      return sendJson(res, 415, { error: 'The requested url is not an image' });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      return sendJson(res, 413, { error: 'Image is too large' });
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      return sendJson(res, 413, { error: 'Image is too large' });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Length', String(bytes.byteLength));
    res.end(bytes);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Image request timed out'
      : 'Image proxy failed';
    return sendJson(res, 502, { error: message });
  } finally {
    clearTimeout(timeout);
  }
}
