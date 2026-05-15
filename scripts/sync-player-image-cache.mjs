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

const ARABIC_PLAYER_ALIASES = {
  '\u0644\u0627\u0645\u064a\u0646 \u064a\u0627\u0645\u0627\u0644': 'Lamine Yamal',
  '\u064a\u0627\u0645\u0627\u0644': 'Lamine Yamal',
  '\u0628\u064a\u062f\u0631\u064a': 'Pedri',
  '\u063a\u0627\u0641\u064a': 'Gavi',
  '\u062c\u0627\u0641\u064a': 'Gavi',
  '\u0631\u0627\u0641\u064a\u0646\u064a\u0627': 'Raphinha',
  '\u0644\u064a\u0641\u0627\u0646\u062f\u0648\u0641\u0633\u0643\u064a': 'Robert Lewandowski',
  '\u0631\u0648\u0628\u0631\u062a \u0644\u064a\u0641\u0627\u0646\u062f\u0648\u0641\u0633\u0643\u064a': 'Robert Lewandowski',
  '\u062f\u0627\u0646\u064a \u0623\u0648\u0644\u0645\u0648': 'Dani Olmo',
  '\u062f\u0627\u0646\u064a \u0627\u0648\u0644\u0645\u0648': 'Dani Olmo',
  '\u0623\u0648\u0644\u0645\u0648': 'Dani Olmo',
  '\u0627\u0648\u0644\u0645\u0648': 'Dani Olmo',
  '\u0641\u0631\u064a\u0646\u0643\u064a \u062f\u064a \u064a\u0648\u0646\u063a': 'Frenkie de Jong',
  '\u062f\u064a \u064a\u0648\u0646\u063a': 'Frenkie de Jong',
  '\u0641\u064a\u0631\u0627\u0646 \u062a\u0648\u0631\u064a\u0633': 'Ferran Torres',
  '\u062a\u0648\u0631\u064a\u0633': 'Ferran Torres',
  '\u0623\u0631\u0627\u062e\u0648': 'Ronald Araujo',
  '\u0627\u0631\u0627\u062e\u0648': 'Ronald Araujo',
  '\u0631\u0648\u0646\u0627\u0644\u062f \u0623\u0631\u0627\u062e\u0648': 'Ronald Araujo',
  '\u0628\u0627\u0648 \u0643\u0648\u0628\u0627\u0631\u0633\u064a': 'Pau Cubarsi',
  '\u0643\u0648\u0628\u0627\u0631\u0633\u064a': 'Pau Cubarsi',
  '\u0643\u0648\u0646\u062f\u064a': 'Jules Kounde',
  '\u062c\u0648\u0644\u0632 \u0643\u0648\u0646\u062f\u064a': 'Jules Kounde',
  '\u0643\u0627\u0633\u0627\u062f\u0648': 'Marc Casado',
  '\u0645\u0627\u0631\u0643 \u0643\u0627\u0633\u0627\u062f\u0648': 'Marc Casado',
  '\u0628\u0627\u0644\u062f\u064a': 'Alejandro Balde',
  '\u0623\u0644\u064a\u062e\u0627\u0646\u062f\u0631\u0648 \u0628\u0627\u0644\u062f\u064a': 'Alejandro Balde',
  '\u0641\u064a\u0631\u0645\u064a\u0646': 'Fermin',
  '\u0628\u0631\u0646\u0627\u0644': 'Marc Bernal',
  '\u0645\u0627\u0631\u0643 \u0628\u0631\u0646\u0627\u0644': 'Marc Bernal',
  '\u062a\u0634\u064a\u0632\u0646\u064a': 'Wojciech Szczesny',
  '\u0634\u062a\u0634\u064a\u0633\u0646\u064a': 'Wojciech Szczesny',
  '\u062c\u0648\u0627\u0646 \u063a\u0627\u0631\u0633\u064a\u0627': 'Joan Garcia',
  '\u0625\u0631\u064a\u0643 \u063a\u0627\u0631\u0633\u064a\u0627': 'Eric Garcia',
  '\u0627\u0631\u064a\u0643 \u063a\u0627\u0631\u0633\u064a\u0627': 'Eric Garcia',
  '\u062c\u064a\u0631\u0627\u0631\u062f \u0645\u0627\u0631\u062a\u0646': 'Gerard Martin',
  '\u062c\u0648\u0641\u0631\u064a \u062a\u0648\u0631\u064a\u0646\u062a\u0633': 'Jofre Torrents',
  '\u0643\u0627\u0646\u0633\u064a\u0644\u0648': 'Joao Cancelo',
  '\u062c\u0648\u0627\u0648 \u0643\u0627\u0646\u0633\u064a\u0644\u0648': 'Joao Cancelo',
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

Object.entries(ARABIC_PLAYER_ALIASES).forEach(([alias, target]) => {
  const url = cache[target] || cache[normalizeKey(target)];
  if (url) addAlias(cache, alias, url);
});

const sortedCache = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
const outPath = path.resolve(config.out);
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(sortedCache, null, 2)}\n`, 'utf8');

console.log(`Wrote ${Object.keys(sortedCache).length} player image entries to ${config.out}`);
