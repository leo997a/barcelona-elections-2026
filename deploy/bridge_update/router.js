import * as fbrefProvider from './fbrefProvider.js';
import * as demoProvider from './demoProvider.js';

const unique = (arr) => {
  const result = [];
  for (const item of (Array.isArray(arr) ? arr : String(arr || '').split(','))) {
    const val = String(item).trim();
    if (val && !result.includes(val)) result.push(val);
  }
  return result;
};

const normalizePlayer = (pObj, fallbackName, fallbackClub) => {
  return {
    name: pObj?.name || fallbackName,
    club: pObj?.club || fallbackClub,
    season: pObj?.season,
  };
};

export async function routePlayerStats(input, auth) {
  let selectedMetrics = unique(input.selectedMetrics);
  const warnings = [];
  
  if (!selectedMetrics.length) {
    // If no metrics supplied, we use default standard metrics as a fallback
    selectedMetrics = ['goals', 'assists', 'minutes', 'yellow_cards', 'red_cards'];
  }

  const mode = String(input.mode || 'SINGLE').replace('SCOUT_SHORTLIST', 'SCOUT_CARD');
  const season = String(input.season || '2025-26');
  
  const playersInput = [
    normalizePlayer(input.player, input.playerAName, input.playerAClub),
    ...(Array.isArray(input.comparisonPlayers)
      ? input.comparisonPlayers.map((player) => normalizePlayer(player, '', ''))
      : []),
  ].filter((player) => player.name);

  // Clear memory cache per request to always get fresh reads if cache is updated
  if (fbrefProvider.clearCache) {
    await fbrefProvider.clearCache();
  }

  // Verify FBref Cache health
  const cacheHealth = await fbrefProvider.checkCacheHealth();
  let coverageBlock = {
    status: 'unavailable',
    availableStatGroups: [],
    missingStatGroups: []
  };
  
  if (cacheHealth.status === 'unavailable') {
    warnings.push('fbref_cache_unavailable: ' + (cacheHealth.warning || 'Cache missing or invalid'));
  } else {
    coverageBlock = {
      status: cacheHealth.status,
      availableStatGroups: cacheHealth.availableStatGroups || [],
      missingStatGroups: cacheHealth.missingStatGroups || []
    };
    if (cacheHealth.status === 'partial') {
      warnings.push('FBref cache coverage is partial. Advanced metrics may be unavailable.');
    }
  }

  const players = [];
  const ALLOW_DEMO = process.env.ALLOW_DEMO_PLAYER_STATS === 'true';

  for (const player of playersInput.length ? playersInput : [normalizePlayer({}, 'Lamine Yamal', 'Barcelona')]) {
    const playerWithSeason = { ...player, season: player.season || season };
    const metrics = {};

    for (const metricKey of selectedMetrics) {
      try {
        let result = await fbrefProvider.getMetric(metricKey, playerWithSeason, { season });
        
        // If unavailable and demo is allowed, use demo
        if (result.status === 'unavailable' && ALLOW_DEMO && demoProvider) {
          try {
             // old demoProvider structure returning { value, provider, etc }
             const demoRes = await demoProvider.getMetric(metricKey, playerWithSeason, {});
             result = {
               status: 'available',
               value: demoRes.value,
               source: 'demoProvider',
               statGroup: 'demo',
               warning: 'fbref_cache_unavailable_using_demo'
             };
          } catch (e) {
             // keep original unavailable result
          }
        }
        
        metrics[metricKey] = result;
      } catch (error) {
        metrics[metricKey] = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        };
      }
    }

    players.push({
      name: player.name,
      club: player.club,
      position: player.position || 'Unknown',
      season: playerWithSeason.season,
      metrics,
    });
  }

  return {
    ok: true,
    bridgeConfigured: true,
    source: 'fbref-cache',
    coverage: coverageBlock,
    mode,
    selectedMetrics,
    players,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
