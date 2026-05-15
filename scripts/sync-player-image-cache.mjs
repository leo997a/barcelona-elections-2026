import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const defaults = {
  repo: 'leo997a/graphicsplayer2026',
  branch: 'main',
  sourcePath: 'La Liga/Barcelona',
  out: 'public/player-image-cache/barcelona.json',
};

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [rawKey, ...rest] = arg.replace(/^--/, '').split('=');
  if (!rawKey) return acc;
  acc[rawKey] = rest.length ? rest.join('=') : 'true';
  return acc;
}, {});

const config = {
  repo: args.repo || defaults.repo,
  branch: args.branch || defaults.branch,
  sourcePath: args.path || args.sourcePath || defaults.sourcePath,
  out: args.out || defaults.out,
};

const stripExtension = (name) => name.replace(/\.[^.]+$/, '').trim();

const decodeRepeated = (value) => {
  let current = String(value || '');
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
};

const encodePath = (value) => String(value || '')
  .split('/')
  .map((segment) => encodeURIComponent(decodeRepeated(segment)))
  .join('/');

const normalizeUrl = (value) => {
  const parsed = new URL(String(value || '').trim());
  parsed.pathname = encodePath(parsed.pathname);
  return parsed.href;
};

const normalizeKey = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const buildNameAliases = (name) => {
  const cleanName = String(name || '').trim();
  if (!cleanName) return [];
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const aliases = new Set([cleanName, normalizeKey(cleanName)]);
  if (parts.length >= 2) {
    const surname = parts.slice(1).join(' ');
    aliases.add(surname);
    aliases.add(normalizeKey(surname));
    aliases.add(`${parts[0][0]}. ${surname}`);
    aliases.add(`${normalizeKey(parts[0][0])}. ${normalizeKey(surname)}`);
    aliases.add(`${parts[0][0]} ${surname}`);
    aliases.add(`${normalizeKey(parts[0][0])} ${normalizeKey(surname)}`);
  }
  return Array.from(aliases).filter(Boolean);
};

const addAlias = (cache, key, url) => {
  const cleanKey = String(key || '').trim();
  let cleanUrl = String(url || '').trim();
  try {
    cleanUrl = normalizeUrl(cleanUrl);
  } catch {
    cleanUrl = '';
  }
  if (!cleanKey || !/^https?:\/\//i.test(cleanUrl)) return;
  cache[cleanKey] = cleanUrl;

  const asciiKey = normalizeKey(cleanKey);
  if (asciiKey && asciiKey !== cleanKey && !cache[asciiKey]) {
    cache[asciiKey] = cleanUrl;
  }

  buildNameAliases(cleanKey).forEach((alias) => {
    if (!cache[alias]) cache[alias] = cleanUrl;
  });
};

const apiPath = encodePath(config.sourcePath);
const apiUrl = `https://api.github.com/repos/${config.repo}/contents/${apiPath}?ref=${encodeURIComponent(config.branch)}`;
const response = await fetch(apiUrl, {
  headers: {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'reo-player-cache-sync',
  },
});

if (!response.ok) {
  throw new Error(`GitHub returned ${response.status} for ${apiUrl}`);
}

const items = await response.json();
if (!Array.isArray(items)) {
  throw new Error(`Expected a directory listing for ${config.sourcePath}`);
}

const cache = {};
const jsonManifest = items.find((item) => item.type === 'file' && /\.json$/i.test(item.name || ''));

if (jsonManifest?.download_url) {
  const manifestResponse = await fetch(jsonManifest.download_url, {
    headers: { 'User-Agent': 'reo-player-cache-sync' },
  });
  if (manifestResponse.ok) {
    const manifest = await manifestResponse.json();
    Object.entries(manifest).forEach(([key, url]) => addAlias(cache, key, url));
  }
}

items
  .filter((item) => item.type === 'file' && /\.(png|jpe?g|webp|avif)$/i.test(item.name || '') && item.download_url)
  .forEach((item) => addAlias(cache, stripExtension(item.name), item.download_url));

const sortedCache = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
const outPath = path.resolve(config.out);
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(sortedCache, null, 2)}\n`, 'utf8');

console.log(`Wrote ${Object.keys(sortedCache).length} player image entries to ${config.out}`);
