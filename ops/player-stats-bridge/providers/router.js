import fs from 'node:fs';
import path from 'node:path';
import * as demoProvider from './demoProvider.js';
import * as fbrefProvider from './fbrefProvider.js';
import * as matchBridgeProvider from './matchBridgeProvider.js';

const CATALOG_PATH = path.join(process.cwd(), 'cache', 'metrics.catalog.json');

const loadCatalog = () => {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')).metrics || [];
  } catch {
    return [];
  }
};

const catalog = loadCatalog();
const catalogByKey = new Map(catalog.map((metric) => [metric.key, metric]));

const unique = (items) => Array.from(new Set((items || []).map(String).map((item) => item.trim()).filter(Boolean)));

const normalizePlayer = (player, fallbackName, fallbackClub) => ({
  name: String(player?.name || fallbackName).trim(),
  club: String(player?.club || fallbackClub).trim(),
  position: String(player?.position || 'AI resolved').trim(),
  season: String(player?.season || '').trim(),
});

const providerForMetric = (metricKey, policy = 'auto') => {
  const metric = catalogByKey.get(metricKey) || {};
  if (policy === 'demo') return 'demo';
  if (policy === 'fbref') return 'fbref';
  if (policy === 'matchBridge') return 'matchBridge';
  if (metric.preferredProvider === 'matchBridge' || (metric.matchSupported && !metric.seasonSupported)) return 'matchBridge';
  if (['xg', 'xa', 'npxg', 'xg_per90', 'xa_per90'].includes(metricKey)) return 'fbref';
  if ([
    'season',
    'per90',
    'attack',
    'shooting',
    'chance_creation',
    'passing',
    'dribbling',
    'possession',
    'defense',
    'duels',
    'discipline',
    'advanced',
    'goalkeeping',
  ].includes(metric.category)) return 'fbref';
  return 'demo';
};

const providerModule = (provider) => (provider === 'fbref' ? fbrefProvider : provider === 'matchBridge' ? matchBridgeProvider : demoProvider);

const planFor = (selectedMetrics, providerPolicy) => selectedMetrics.map((metricKey) => {
  const metric = catalogByKey.get(metricKey) || {};
  const provider = providerForMetric(metricKey, providerPolicy);
  return {
    metricKey,
    provider,
    preferredProvider: metric.preferredProvider || provider,
    category: metric.category || 'advanced',
    cost: metric.cost || 'low',
  };
});

const unavailableMetric = (metricKey, meta, provider, reason) => ({
  label: meta.label || metricKey.replace(/_/g, ' '),
  labelAr: meta.labelAr || meta.label || metricKey.replace(/_/g, ' '),
  value: 'unavailable',
  unit: meta.unit || '',
  category: meta.category || 'advanced',
  provider,
  confidence: 0,
  updatedAt: new Date().toISOString(),
  warning: reason,
});

export async function routePlayerStats(input, auth) {
  const selectedMetrics = unique(input.selectedMetrics);
  const warnings = [];
  if (!selectedMetrics.length) warnings.push('No selectedMetrics supplied. The bridge did not fetch a full 60+ metric dump.');
  const mode = String(input.mode || 'SINGLE').replace('SCOUT_SHORTLIST', 'SCOUT_CARD');
  const season = String(input.season || '2025/26');
  const providerPolicy = String(input.providerPolicy || 'auto');
  const playersInput = [
    normalizePlayer(input.player, input.playerAName || 'Robert Lewandowski', input.playerAClub || 'Barcelona'),
    ...(Array.isArray(input.comparisonPlayers)
      ? input.comparisonPlayers.map((player, index) => normalizePlayer(player, index ? 'Lamine Yamal' : 'Cole Palmer', index ? 'Barcelona' : 'Chelsea'))
      : []),
  ].filter((player) => player.name);
  const providerPlan = planFor(selectedMetrics, providerPolicy);
  const players = [];
  for (const player of playersInput.length ? playersInput : [normalizePlayer({}, 'Robert Lewandowski', 'Barcelona')]) {
    const playerWithSeason = { ...player, season: player.season || season };
    const stats = {};
    for (const plan of providerPlan) {
      const meta = { ...(catalogByKey.get(plan.metricKey) || { label: plan.metricKey.replace(/_/g, ' '), labelAr: plan.metricKey.replace(/_/g, ' '), category: plan.category }), season };
      try {
        stats[plan.metricKey] = await providerModule(plan.provider).getMetric(plan.metricKey, playerWithSeason, meta);
      } catch (error) {
        const reason = `${plan.provider} failed for ${plan.metricKey}: ${error instanceof Error ? error.message : String(error)}`;
        warnings.push(reason);
        stats[plan.metricKey] = plan.provider === 'demo'
          ? await demoProvider.getMetric(plan.metricKey, playerWithSeason, { ...meta, provider: 'demoProvider', confidence: 0.54 })
          : unavailableMetric(plan.metricKey, meta, plan.provider, reason);
      }
    }
    players.push({
      name: player.name,
      club: player.club,
      position: player.position || 'AI resolved',
      season,
      stats,
    });
  }
  return {
    ok: true,
    bridgeConfigured: true,
    auth,
    source: 'reo-vps-player-stats-provider-router',
    mode,
    providerPolicy,
    providerPlan,
    selectedMetrics,
    presentation: input.presentation || {},
    players,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
