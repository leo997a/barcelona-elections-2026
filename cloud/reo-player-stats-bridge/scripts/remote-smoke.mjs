import {
  bridgeFetch,
  positionalArgs,
  printSummary,
  readArg,
  readJsonResponse,
  resolveBridgeConfig,
  serviceUrl,
} from './bridge-cli-utils.mjs';

const config = resolveBridgeConfig();
const positional = positionalArgs();
const playerName = readArg('--player') || process.env.REO_PLAYER_STATS_SMOKE_PLAYER || positional[0] || 'Robert Lewandowski';
const playerClub = readArg('--club') || process.env.REO_PLAYER_STATS_SMOKE_CLUB || positional[1] || 'Barcelona';
const season = readArg('--season') || process.env.REO_PLAYER_STATS_SMOKE_SEASON || '2025/26';
const metricsInput = readArg('--metrics') || process.env.REO_PLAYER_STATS_SMOKE_METRICS || positional.slice(2).join(',') || 'goals,assists,rating';
const metrics = metricsInput
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const healthResponse = await fetch(serviceUrl(config, '/health'));
const health = await readJsonResponse(healthResponse);
if (!health.ok) throw new Error('Health check failed.');

const status = await bridgeFetch(config, serviceUrl(config, '/api/status'));
if (!status.ok || !status.auth?.valid) throw new Error('Authenticated status check failed.');

const stats = await bridgeFetch(config, config.playerStatsUrl, {
  method: 'POST',
  body: JSON.stringify({
    mode: 'SINGLE',
    season,
    player: { name: playerName, club: playerClub },
    selectedMetrics: metrics,
    providerPolicy: 'auto',
  }),
});

if (!stats.bridgeConfigured) throw new Error('bridgeConfigured should be true.');
if (!stats.auth?.valid) throw new Error('Player stats auth.valid should be true.');

printSummary({
  ok: true,
  bridge: {
    health: health.ok,
    authConfigured: health.authConfigured,
    playerCount: status.playerCount,
    seasons: status.seasons,
    updatedAt: status.updatedAt,
  },
  playerStats: {
    bridgeConfigured: stats.bridgeConfigured,
    realDataAvailable: stats.realDataAvailable,
    player: stats.players?.[0]?.name || playerName,
    dataStatus: stats.players?.[0]?.dataStatus || 'unknown',
    warnings: stats.warnings || [],
  },
});
