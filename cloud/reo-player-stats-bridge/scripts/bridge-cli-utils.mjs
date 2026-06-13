import { readFileSync, writeFileSync } from 'node:fs';

export function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const prefix = `${name}=`;
  const item = process.argv.find(arg => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : '';
}

export function hasArg(name) {
  return process.argv.includes(name);
}

export function positionalArgs() {
  return process.argv.slice(2).filter(arg => !arg.startsWith('--'));
}

export function requiredEnv(name, fallback = '') {
  const value = String(process.env[name] || fallback || '').trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

export function resolveBridgeConfig() {
  const rawUrl = requiredEnv('REO_PLAYER_STATS_BRIDGE_URL', process.env.BRIDGE_URL);
  const token = requiredEnv('REO_PLAYER_STATS_BRIDGE_TOKEN', process.env.BRIDGE_TOKEN);
  const trimmed = rawUrl.replace(/\/+$/, '');
  const playerStatsUrl = trimmed.endsWith('/api/player-stats') ? trimmed : `${trimmed}/api/player-stats`;
  const baseUrl = playerStatsUrl.replace(/\/api\/player-stats$/, '');
  return { baseUrl, playerStatsUrl, token };
}

export function serviceUrl(config, path) {
  return `${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function readJsonResponse(response) {
  const text = await response.text();
  let json = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON from ${response.url}, got: ${text.slice(0, 200)}`);
    }
  }
  if (!response.ok) {
    const message = json?.error || response.statusText || 'Request failed';
    throw new Error(`${response.status} ${message}`);
  }
  return json;
}

export async function bridgeFetch(config, url, options = {}) {
  const headers = {
    Authorization: `Bearer ${config.token}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(url, { ...options, headers });
  return readJsonResponse(response);
}

export function readJsonFile(filePath) {
  const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new Error(`Unable to parse ${filePath}: ${message}`);
  }
}

export function writeJsonFile(filePath, payload) {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function printSummary(payload) {
  console.log(JSON.stringify(payload, null, 2));
}
