import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import aiHandler from '../api/ai.js';
import imageProxyHandler from '../api/image-proxy.js';
import licenseHandler from '../api/license.js';
import liveHandler from '../api/live.js';
import mercatoHandler from '../api/mercato.js';
import platformHandler from '../api/platform.js';
import playerIntelV2Handler from '../api/player-intel-v2.js';
import playerStatsHandler from '../api/player-stats.js';
import reoMatchHandler from '../api/reo-match.js';
import streamHandler from '../api/stream.js';
import adminSecretsHandler from '../api/admin/secrets.js';
import adminSessionHandler from '../api/admin/session.js';
import sportmonksPlayerHandler from '../api/sportmonks/player.js';

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => unknown | Promise<unknown>;

const apiRoutes = new Map<string, ApiHandler>([
  ['/api/ai', aiHandler as ApiHandler],
  ['/api/image-proxy', imageProxyHandler as ApiHandler],
  ['/api/license', licenseHandler as ApiHandler],
  ['/api/live', liveHandler as ApiHandler],
  ['/api/mercato', mercatoHandler as ApiHandler],
  ['/api/platform', platformHandler as ApiHandler],
  ['/api/player-intel-v2', playerIntelV2Handler as ApiHandler],
  ['/api/player-stats', playerStatsHandler as ApiHandler],
  ['/api/reo-match', reoMatchHandler as ApiHandler],
  ['/api/stream', streamHandler as ApiHandler],
  ['/api/admin/secrets', adminSecretsHandler as ApiHandler],
  ['/api/admin/session', adminSessionHandler as ApiHandler],
  ['/api/sportmonks/player', sportmonksPlayerHandler as ApiHandler],
]);

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const serverDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(serverDir, '..', '..');
const distDir = resolve(projectRoot, 'dist');
const indexPath = resolve(distDir, 'index.html');

const parseEnvValue = (value: string) => {
  const raw = value.trim();
  const quote = raw[0];
  if ((quote === '"' || quote === "'") && raw.endsWith(quote)) return raw.slice(1, -1);
  return raw;
};

const loadEnvFile = (filePath: string) => {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const separator = normalized.indexOf('=');
    if (separator <= 0) continue;
    const key = normalized.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key]) continue;
    process.env[key] = parseEnvValue(normalized.slice(separator + 1));
  }
};

const loadRuntimeEnv = () => {
  const candidates = [
    resolve(projectRoot, '.env'),
    resolve(projectRoot, '.env.local'),
    resolve(projectRoot, '..', 'public_html', '.builds', 'config', '.env'),
  ];
  for (const candidate of candidates) loadEnvFile(candidate);
};

loadRuntimeEnv();

const port = Number(process.env.PORT || 3000);

const sendJsonError = (response: ServerResponse, statusCode: number, message: string) => {
  if (response.headersSent) {
    response.end();
    return;
  }
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ error: message }));
};

const sendFile = (response: ServerResponse, filePath: string, cacheControl: string) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream');
  response.setHeader('Cache-Control', cacheControl);
  createReadStream(filePath).pipe(response);
};

const resolveStaticFile = (pathname: string) => {
  try {
    const decodedPath = decodeURIComponent(pathname);
    const filePath = resolve(distDir, `.${decodedPath}`);
    if (filePath !== distDir && !filePath.startsWith(`${distDir}${sep}`)) return null;
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
    return filePath;
  } catch {
    return null;
  }
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const apiHandler = apiRoutes.get(requestUrl.pathname);

  if (apiHandler) {
    try {
      await apiHandler(request, response);
    } catch (error) {
      console.error(`API request failed: ${requestUrl.pathname}`, error);
      sendJsonError(response, 500, 'Internal server error');
    }
    return;
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    sendJsonError(response, 404, 'API route not found');
    return;
  }

  const staticFile = resolveStaticFile(requestUrl.pathname);
  if (staticFile) {
    const immutable = requestUrl.pathname.startsWith('/assets/');
    sendFile(response, staticFile, immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
    return;
  }

  if (!existsSync(indexPath)) {
    sendJsonError(response, 503, 'Frontend build is missing. Run npm run build first.');
    return;
  }

  sendFile(response, indexPath, 'no-cache');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`REO Live server listening on port ${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
