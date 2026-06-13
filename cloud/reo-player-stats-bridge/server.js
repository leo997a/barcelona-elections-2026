import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.REO_PLAYER_STATS_BRIDGE_PORT || 3015);
const HOST = process.env.REO_PLAYER_STATS_BRIDGE_HOST || '0.0.0.0';
const TOKEN = String(process.env.REO_PLAYER_STATS_BRIDGE_TOKEN || '').trim();
const DATA_FILE = resolve(
  process.env.REO_PLAYER_STATS_DATA_FILE || resolve(__dirname, 'data', 'player-stats.json'),
);
const ALLOWED_ORIGINS = String(process.env.REO_PLAYER_STATS_ALLOWED_ORIGINS || '*')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const KNOWN_METRICS = [
  ['appearances', 'Appearances', 'season'],
  ['starts', 'Starts', 'season'],
  ['minutes', 'Minutes', 'season'],
  ['goals', 'Goals', 'attack'],
  ['non_penalty_goals', 'Non-penalty goals', 'attack'],
  ['assists', 'Assists', 'attack'],
  ['shots', 'Shots', 'shooting'],
  ['shots_per_90', 'Shots / 90', 'shooting'],
  ['shots_on_target', 'Shots on target', 'shooting'],
  ['shot_accuracy', 'Shot accuracy', 'shooting'],
  ['touches_in_box', 'Touches in box', 'attack'],
  ['big_chances', 'Big chances', 'attack'],
  ['key_passes', 'Key passes', 'chance_creation'],
  ['big_chances_created', 'Big chances created', 'chance_creation'],
  ['through_balls', 'Through balls', 'chance_creation'],
  ['crosses', 'Crosses', 'chance_creation'],
  ['passes', 'Passes', 'passing'],
  ['pass_accuracy', 'Pass accuracy', 'passing'],
  ['progressive_passes', 'Progressive passes', 'passing'],
  ['long_balls', 'Long balls', 'passing'],
  ['final_third_passes', 'Final-third passes', 'passing'],
  ['successful_dribbles', 'Successful dribbles', 'dribbling'],
  ['dribble_success', 'Dribble success', 'dribbling'],
  ['progressive_carries', 'Progressive carries', 'possession'],
  ['touches', 'Touches', 'possession'],
  ['dispossessed', 'Dispossessed', 'possession'],
  ['turnovers', 'Turnovers', 'possession'],
  ['recoveries', 'Recoveries', 'defense'],
  ['tackles', 'Tackles', 'defense'],
  ['tackle_success', 'Tackle success', 'defense'],
  ['interceptions', 'Interceptions', 'defense'],
  ['clearances', 'Clearances', 'defense'],
  ['blocks', 'Blocks', 'defense'],
  ['aerial_duels_won', 'Aerial duels won', 'duels'],
  ['ground_duels_won', 'Ground duels won', 'duels'],
  ['fouls_won', 'Fouls won', 'duels'],
  ['fouls_committed', 'Fouls committed', 'discipline'],
  ['yellow_cards', 'Yellow cards', 'discipline'],
  ['red_cards', 'Red cards', 'discipline'],
  ['rating', 'Rating', 'advanced'],
  ['player_impact_index', 'Player impact index', 'advanced'],
  ['per_90_profile', 'Per 90 profile', 'per90'],
  ['goalkeeper_saves', 'Goalkeeper saves', 'goalkeeping'],
  ['save_percentage', 'Save percentage', 'goalkeeping'],
  ['clean_sheets', 'Clean sheets', 'goalkeeping'],
];

const METRIC_BY_KEY = new Map(KNOWN_METRICS.map(([key, label, category]) => [key, { key, label, category }]));
const METRIC_BY_LABEL = new Map(KNOWN_METRICS.map(([key, label, category]) => [normaliseMetricKey(label), { key, label, category }]));

function nowIso() {
  return new Date().toISOString();
}

function normaliseText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normaliseMetricKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/\/\s*90/g, ' per 90')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function listFrom(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function setCors(req, res) {
  const requestOrigin = req.headers.origin || '';
  const allowAll = ALLOWED_ORIGINS.includes('*');
  const allowedOrigin = allowAll || ALLOWED_ORIGINS.includes(requestOrigin) ? (allowAll ? '*' : requestOrigin) : '';
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-REO-Bridge-Token');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function authState(req) {
  const authHeader = String(req.headers.authorization || '');
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = String(req.headers['x-reo-bridge-token'] || '').trim();
  const providedToken = bearer || headerToken;
  const required = Boolean(TOKEN);
  return {
    required,
    provided: Boolean(providedToken),
    valid: required ? safeCompare(providedToken, TOKEN) : false,
  };
}

function requireAuth(req, res) {
  if (!TOKEN) {
    sendJson(res, 503, {
      error: 'REO_PLAYER_STATS_BRIDGE_TOKEN is not configured.',
      auth: { required: true, provided: false, valid: false },
    });
    return null;
  }
  const auth = authState(req);
  if (!auth.valid) {
    sendJson(res, auth.provided ? 403 : 401, {
      error: auth.provided ? 'Invalid bridge token.' : 'Authorization required.',
      auth,
    });
    return null;
  }
  return auth;
}

function readStore() {
  try {
    const raw = readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      updatedAt: parsed.updatedAt || null,
      players: Array.isArray(parsed.players) ? parsed.players : [],
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { version: 1, updatedAt: null, players: [] };
    }
    const message = error instanceof Error ? error.message : 'Unknown data file error';
    throw new Error(`Unable to read player stats data file: ${message}`);
  }
}

function writeStore(store) {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  const nextStore = {
    version: 1,
    updatedAt: nowIso(),
    players: Array.isArray(store.players) ? store.players : [],
  };
  const tmpFile = `${DATA_FILE}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(nextStore, null, 2), 'utf8');
  renameSync(tmpFile, DATA_FILE);
  return nextStore;
}

function playerId(record) {
  return createHash('sha1')
    .update([
      normaliseText(record.name),
      normaliseText(record.club),
      normaliseText(record.season),
    ].join('|'))
    .digest('hex')
    .slice(0, 16);
}

function normaliseStat(key, stat, fallbackLabel, fallbackCategory) {
  if (stat && typeof stat === 'object' && !Array.isArray(stat)) {
    const resolvedKey = normaliseMetricKey(stat.key || key);
    const known = METRIC_BY_KEY.get(resolvedKey) || METRIC_BY_LABEL.get(resolvedKey);
    return {
      key: known?.key || resolvedKey || key,
      label: stat.label || known?.label || fallbackLabel || key,
      labelAr: stat.labelAr || stat.label || known?.label || fallbackLabel || key,
      value: stat.value ?? 'pending',
      unit: stat.unit || '',
      category: stat.category || known?.category || fallbackCategory || 'advanced',
      provider: stat.provider || 'manual',
      confidence: Number.isFinite(Number(stat.confidence)) ? Number(stat.confidence) : 0.9,
      sourceUrl: stat.sourceUrl || '',
      updatedAt: stat.updatedAt || nowIso(),
    };
  }
  const metricKey = normaliseMetricKey(key);
  const known = METRIC_BY_KEY.get(metricKey) || METRIC_BY_LABEL.get(metricKey);
  return {
    key: known?.key || metricKey || key,
    label: known?.label || fallbackLabel || key,
    labelAr: known?.label || fallbackLabel || key,
    value: stat ?? 'pending',
    unit: '',
    category: known?.category || fallbackCategory || 'advanced',
    provider: 'manual',
    confidence: 0.9,
    sourceUrl: '',
    updatedAt: nowIso(),
  };
}

function normaliseRecord(input) {
  const name = String(input?.name || '').trim();
  const club = String(input?.club || '').trim();
  const season = String(input?.season || '').trim() || '2025/26';
  if (!name || !club) {
    throw new Error('Player record requires name and club.');
  }
  const stats = {};
  const inputStats = input.stats && typeof input.stats === 'object' && !Array.isArray(input.stats) ? input.stats : {};
  for (const [key, value] of Object.entries(inputStats)) {
    const stat = normaliseStat(key, value);
    stats[stat.key] = stat;
  }
  const aliases = Array.isArray(input.aliases) ? input.aliases.map(String).map(item => item.trim()).filter(Boolean) : [];
  const record = {
    id: input.id || '',
    name,
    arabicName: String(input.arabicName || '').trim(),
    aliases,
    club,
    position: String(input.position || '').trim(),
    nationality: String(input.nationality || '').trim(),
    season,
    provider: String(input.provider || 'manual').trim(),
    sourceUrl: String(input.sourceUrl || '').trim(),
    updatedAt: String(input.updatedAt || nowIso()).trim(),
    stats,
  };
  record.id = record.id || playerId(record);
  return record;
}

function upsertPlayers(store, records) {
  const byId = new Map(store.players.map(record => [record.id || playerId(record), record]));
  for (const item of records) {
    const record = normaliseRecord(item);
    byId.set(record.id, record);
  }
  return { ...store, players: [...byId.values()] };
}

function parseRequest(req, body) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const query = url.searchParams;
  const mode = String(body.mode || query.get('mode') || 'SINGLE').replace('SCOUT_SHORTLIST', 'SCOUT_CARD');
  const needsSecondPlayer = mode === 'COMPARE' || mode === 'SCOUT_CARD';
  const needsThirdPlayer = mode === 'SCOUT_CARD';
  const comparisons = Array.isArray(body.comparisonPlayers) ? body.comparisonPlayers : [];
  const player = body.player && typeof body.player === 'object' ? body.player : {};
  const players = [
    {
      name: String(player.name || body.playerAName || query.get('playerAName') || 'Robert Lewandowski'),
      club: String(player.club || body.playerAClub || query.get('playerAClub') || 'Barcelona'),
    },
    {
      name: String(comparisons[0]?.name || body.playerBName || query.get('playerBName') || (needsSecondPlayer ? 'Cole Palmer' : '')),
      club: String(comparisons[0]?.club || body.playerBClub || query.get('playerBClub') || (needsSecondPlayer ? 'Chelsea' : '')),
    },
    {
      name: String(comparisons[1]?.name || body.playerCName || query.get('playerCName') || (needsThirdPlayer ? 'Lamine Yamal' : '')),
      club: String(comparisons[1]?.club || body.playerCClub || query.get('playerCClub') || (needsThirdPlayer ? 'Barcelona' : '')),
    },
  ].filter(item => item.name.trim());
  return {
    mode,
    season: String(body.season || query.get('season') || '2025/26'),
    categories: listFrom(body.categories || query.get('categories') || ''),
    providerPolicy: String(body.providerPolicy || query.get('providerPolicy') || 'auto'),
    selectedMetrics: listFrom(body.selectedMetrics || query.get('selectedMetrics') || query.get('metrics') || ''),
    presentation: body.presentation,
    players,
  };
}

function recordAliases(record) {
  return [record.name, record.arabicName, ...(Array.isArray(record.aliases) ? record.aliases : [])]
    .map(normaliseText)
    .filter(Boolean);
}

function findRecord(store, requested, season) {
  const wantedName = normaliseText(requested.name);
  const wantedClub = normaliseText(requested.club);
  const wantedSeason = normaliseText(season);
  const candidates = store.players.filter(record => recordAliases(record).includes(wantedName));
  const sameSeason = candidates.filter(record => normaliseText(record.season) === wantedSeason);
  const exact = sameSeason.find(record => normaliseText(record.club) === wantedClub);
  if (exact) return { record: exact, quality: 'exact' };
  if (sameSeason.length) return { record: sameSeason[0], quality: 'name-season' };
  if (candidates.length) return { record: candidates[0], quality: 'name-only' };
  return { record: null, quality: 'missing' };
}

function requestedMetricKeys(query) {
  if (query.selectedMetrics.length) return query.selectedMetrics.map(normaliseMetricKey).filter(Boolean);
  if (query.categories.length) {
    const categories = new Set(query.categories.map(item => normaliseText(item)));
    if (categories.has('all') || categories.has('*')) return KNOWN_METRICS.map(([key]) => key);
    return KNOWN_METRICS.filter(([, , category]) => categories.has(normaliseText(category))).map(([key]) => key);
  }
  return [];
}

function pendingStat(key) {
  const known = METRIC_BY_KEY.get(key) || METRIC_BY_LABEL.get(key);
  return {
    key,
    label: known?.label || key.replace(/_/g, ' '),
    labelAr: known?.label || key.replace(/_/g, ' '),
    value: 'pending',
    unit: '',
    category: known?.category || 'advanced',
    provider: 'missing',
    confidence: 0,
    sourceUrl: '',
    updatedAt: nowIso(),
  };
}

function buildPlayerPayload(requested, recordMatch, query) {
  const { record, quality } = recordMatch;
  const requestedKeys = requestedMetricKeys(query);
  const warnings = [];
  if (!record) {
    const stats = {};
    for (const key of requestedKeys) stats[key] = pendingStat(key);
    warnings.push(`No player stats record found for ${requested.name} (${requested.club}).`);
    return {
      player: {
        name: requested.name,
        club: requested.club,
        season: query.season,
        stats,
        dataStatus: 'missing',
      },
      warnings,
      realDataAvailable: false,
    };
  }

  if (quality !== 'exact') {
    warnings.push(`Matched ${requested.name} by ${quality}; requested club was ${requested.club}, stored club is ${record.club}.`);
  }

  const stats = {};
  const sourceStats = record.stats && typeof record.stats === 'object' ? record.stats : {};
  const keys = requestedKeys.length ? requestedKeys : Object.keys(sourceStats);
  for (const key of keys) {
    stats[key] = sourceStats[key] || pendingStat(key);
  }
  const hasRealMetric = Object.values(stats).some(stat => stat.value !== 'pending' && stat.provider !== 'missing');
  return {
    player: {
      id: record.id,
      name: record.name,
      arabicName: record.arabicName || '',
      club: record.club,
      position: record.position || '',
      nationality: record.nationality || '',
      season: record.season,
      provider: record.provider || 'manual',
      sourceUrl: record.sourceUrl || '',
      updatedAt: record.updatedAt || '',
      stats,
      dataStatus: hasRealMetric ? 'ready' : 'pending',
    },
    warnings,
    realDataAvailable: hasRealMetric,
  };
}

function handleStatus(req, res, auth) {
  const store = readStore();
  const seasons = [...new Set(store.players.map(player => player.season).filter(Boolean))];
  sendJson(res, 200, {
    ok: true,
    service: 'reo-player-stats-bridge',
    auth,
    dataFile: DATA_FILE,
    playerCount: store.players.length,
    seasons,
    updatedAt: store.updatedAt,
    time: nowIso(),
  });
}

function handleMetrics(req, res, auth) {
  sendJson(res, 200, {
    ok: true,
    service: 'reo-player-stats-bridge',
    auth,
    metrics: KNOWN_METRICS.map(([key, label, category]) => ({ key, label, category })),
    categories: [...new Set(KNOWN_METRICS.map(([, , category]) => category))],
  });
}

async function handlePlayerStats(req, res, auth) {
  const body = req.method === 'POST' ? await readBody(req) : {};
  const query = parseRequest(req, body);
  const store = readStore();
  const warnings = [];
  const players = [];
  let realDataAvailable = false;
  for (const requested of query.players) {
    const payload = buildPlayerPayload(requested, findRecord(store, requested, query.season), query);
    warnings.push(...payload.warnings);
    players.push(payload.player);
    realDataAvailable = realDataAvailable || payload.realDataAvailable;
  }
  sendJson(res, 200, {
    mode: query.mode,
    season: query.season,
    providerPolicy: query.providerPolicy,
    providerPlan: ['reo-player-stats-json-store'],
    selectedMetrics: query.selectedMetrics,
    presentation: query.presentation,
    source: 'REO Player Stats Bridge',
    updatedAt: store.updatedAt || nowIso(),
    bridgeConfigured: true,
    realDataAvailable,
    auth,
    supportedModes: ['SINGLE', 'COMPARE', 'SCOUT_CARD'],
    supportedCategories: [...new Set(KNOWN_METRICS.map(([, , category]) => category))],
    warnings,
    players,
  });
}

async function handleUpsert(req, res, auth) {
  const body = await readBody(req);
  const recordInput = body.player || body;
  const store = readStore();
  const nextStore = writeStore(upsertPlayers(store, [recordInput]));
  const record = normaliseRecord(recordInput);
  sendJson(res, 200, {
    ok: true,
    service: 'reo-player-stats-bridge',
    auth,
    action: 'upsert-player',
    id: record.id,
    playerCount: nextStore.players.length,
    updatedAt: nextStore.updatedAt,
  });
}

async function handleImport(req, res, auth) {
  const body = await readBody(req);
  const mode = body.mode === 'replace' ? 'replace' : 'merge';
  const records = Array.isArray(body.players) ? body.players : [];
  if (!records.length) {
    sendJson(res, 400, { error: 'Import requires a non-empty players array.', auth });
    return;
  }
  const baseStore = mode === 'replace' ? { version: 1, updatedAt: null, players: [] } : readStore();
  const nextStore = writeStore(upsertPlayers(baseStore, records));
  sendJson(res, 200, {
    ok: true,
    service: 'reo-player-stats-bridge',
    auth,
    action: 'import-json',
    mode,
    imported: records.length,
    playerCount: nextStore.players.length,
    updatedAt: nextStore.updatedAt,
  });
}

function handleExport(req, res, auth) {
  const store = readStore();
  sendJson(res, 200, {
    ok: true,
    service: 'reo-player-stats-bridge',
    auth,
    exportedAt: nowIso(),
    ...store,
  });
}

async function route(req, res) {
  setCors(req, res);
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'reo-player-stats-bridge',
      authConfigured: Boolean(TOKEN),
      time: nowIso(),
    });
    return;
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    if (url.pathname === '/api/status' && req.method === 'GET') return handleStatus(req, res, auth);
    if (url.pathname === '/api/metrics-catalog' && req.method === 'GET') return handleMetrics(req, res, auth);
    if (url.pathname === '/api/player-stats' && (req.method === 'GET' || req.method === 'POST')) return await handlePlayerStats(req, res, auth);
    if (url.pathname === '/api/control/upsert-player' && req.method === 'POST') return await handleUpsert(req, res, auth);
    if (url.pathname === '/api/control/import-json' && req.method === 'POST') return await handleImport(req, res, auth);
    if (url.pathname === '/api/control/export-json' && req.method === 'GET') return handleExport(req, res, auth);
    sendJson(res, 404, { error: 'Route not found.', auth });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Internal server error',
      auth,
    });
  }
}

const server = createServer((req, res) => {
  route(req, res).catch(error => {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Internal server error' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`REO Player Stats Bridge listening on ${HOST}:${PORT}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
