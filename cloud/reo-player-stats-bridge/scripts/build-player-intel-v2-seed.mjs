import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { positionalArgs, printSummary, readArg } from './bridge-cli-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bridgeRoot = resolve(__dirname, '..');
const repoRoot = resolve(bridgeRoot, '..', '..');
const samplesDir = resolve(repoRoot, 'public', 'player-intel-v2-samples');
const positional = positionalArgs();
const outPath = resolve(
  readArg('--out') || positional[0] || resolve(bridgeRoot, 'data', 'player-intel-v2-seed.generated.json'),
);

const metricCategoryByKey = new Map([
  ['appearances', 'season'],
  ['matches', 'season'],
  ['starts', 'season'],
  ['minutes', 'season'],
  ['goals', 'attack'],
  ['non_penalty_goals', 'attack'],
  ['assists', 'attack'],
  ['shots', 'shooting'],
  ['shots_on_target', 'shooting'],
  ['shot_accuracy', 'shooting'],
  ['xg', 'shooting'],
  ['xa', 'chance_creation'],
  ['key_passes', 'chance_creation'],
  ['crosses', 'chance_creation'],
  ['progressive_passes', 'passing'],
  ['successful_dribbles', 'dribbling'],
  ['progressive_carries', 'possession'],
  ['touches', 'possession'],
  ['fouls_won', 'duels'],
  ['tackles', 'defense'],
  ['interceptions', 'defense'],
  ['blocks', 'defense'],
  ['clearances', 'defense'],
  ['yellow_cards', 'discipline'],
  ['red_cards', 'discipline'],
  ['rating', 'advanced'],
  ['goalkeeper_saves', 'goalkeeping'],
]);

function normalizeMetricKey(key) {
  const aliases = {
    matches: 'appearances',
    fouls_drawn: 'fouls_won',
    dribbles: 'successful_dribbles',
    saves: 'goalkeeper_saves',
  };
  const normalized = String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return aliases[normalized] || normalized;
}

function metricValue(metric) {
  if (!metric || typeof metric !== 'object') return null;
  const value = metric.primaryValue ?? metric.value ?? null;
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : value;
}

function metricProvider(metric, playerProvider) {
  if (metric?.source) return String(metric.source);
  const sources = metric?.sources && typeof metric.sources === 'object' ? Object.keys(metric.sources) : [];
  if (sources.length === 1) return sources[0];
  if (sources.length > 1) return sources.join('+');
  return playerProvider;
}

function metricSourceUrl(metric) {
  const sources = metric?.sources && typeof metric.sources === 'object' ? Object.values(metric.sources) : [];
  for (const source of sources) {
    if (source && typeof source === 'object' && typeof source.sourceUrl === 'string' && source.sourceUrl.trim()) {
      return source.sourceUrl.trim();
    }
  }
  return '';
}

function convertFile(fileName) {
  const filePath = resolve(samplesDir, fileName);
  const input = JSON.parse(readFileSync(filePath, 'utf8'));
  const player = input.player || {};
  const canonicalMetrics = input.canonicalMetrics && typeof input.canonicalMetrics === 'object'
    ? input.canonicalMetrics
    : {};
  const providers = Object.entries(input.sourceCoverage || {})
    .filter(([, available]) => Boolean(available))
    .map(([provider]) => provider);
  const provider = providers.length ? providers.join('+') : 'player-intel-v2-sample';

  const stats = {};
  for (const [rawKey, metric] of Object.entries(canonicalMetrics)) {
    const value = metricValue(metric);
    if (value === null) continue;
    const key = normalizeMetricKey(rawKey);
    stats[key] = {
      key,
      label: metric?.label || key.replace(/_/g, ' '),
      labelAr: metric?.label || key.replace(/_/g, ' '),
      value,
      unit: metric?.unit || '',
      category: metricCategoryByKey.get(key) || 'advanced',
      provider: metricProvider(metric, provider),
      confidence: 0.92,
      sourceUrl: metricSourceUrl(metric),
      updatedAt: input.generatedAt || new Date().toISOString(),
    };
  }

  return {
    id: String(player.id || input.identity?.slug || basename(fileName, '.broadcast.json')).trim(),
    name: String(player.name || '').trim(),
    arabicName: String(player.arabicName || '').trim(),
    aliases: [String(player.name || '').trim()].filter(Boolean),
    club: String(player.club || '').trim(),
    position: String(player.position || '').trim(),
    nationality: String(player.nationality || '').trim(),
    season: String(player.season || input.season || '2025/26').replace('-', '/'),
    provider,
    sourceUrl: `public/player-intel-v2-samples/${fileName}`,
    updatedAt: input.generatedAt || new Date().toISOString(),
    stats,
  };
}

const players = readdirSync(samplesDir)
  .filter(file => file.endsWith('.broadcast.json'))
  .sort()
  .map(convertFile)
  .filter(player => player.name && player.club && Object.keys(player.stats).length);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ mode: 'merge', generatedAt: new Date().toISOString(), players }, null, 2), 'utf8');

printSummary({
  ok: true,
  outPath,
  playerCount: players.length,
  players: players.map(player => ({
    name: player.name,
    club: player.club,
    season: player.season,
    metricCount: Object.keys(player.stats).length,
  })),
});
