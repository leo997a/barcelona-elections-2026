/**
 * ═══════════════════════════════════════════════════════════════════════
 * REO Player Stats Bridge — FBref Cache Reader Module
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * This module reads from /opt/reo-data-cache/fbref/ ONLY.
 * It NEVER triggers scraping, Selenium, or any external HTTP request.
 * 
 * If data is not found in cache → returns { status: "unavailable" }
 * If cache is stale → returns data + { warning: "stale" }
 * 
 * Usage in player-stats-bridge server.js:
 *   const { searchPlayerInCache, getCacheStatus } = require('./fbrefCacheReader');
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = '/opt/reo-data-cache/fbref';
const LAST_UPDATED_FILE = '/opt/reo-data-cache/last_updated.json';
const STALE_THRESHOLD_HOURS = 24; // Consider cache stale after 24h

/**
 * Search for a player across all cached league files.
 * 
 * @param {string} playerName - Player name to search (partial match supported)
 * @param {object} options - Optional filters
 * @param {string} options.league - Filter by league ID (e.g., "la-liga")
 * @param {string} options.season - Filter by season (e.g., "2025-26")
 * @param {string} options.team - Filter by team name
 * @param {string[]} options.metrics - Specific metrics to return
 * @returns {object} Result with status, data, and optional warnings
 */
function searchPlayerInCache(playerName, options = {}) {
  if (!playerName || typeof playerName !== 'string') {
    return {
      status: 'error',
      error: 'Player name is required',
      data: null,
    };
  }

  // Check if cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    return {
      status: 'unavailable',
      warning: 'Cache directory does not exist. Worker has not run yet.',
      data: null,
    };
  }

  const searchLower = playerName.toLowerCase().trim();
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    return {
      status: 'unavailable',
      warning: 'No cached league data found. Run the worker first.',
      data: null,
    };
  }

  const matches = [];

  for (const file of files) {
    // Apply league filter if specified
    if (options.league && !file.startsWith(options.league)) {
      continue;
    }
    // Apply season filter if specified
    if (options.season && !file.includes(options.season)) {
      continue;
    }

    try {
      const filepath = path.join(CACHE_DIR, file);
      const raw = fs.readFileSync(filepath, 'utf-8');
      const cacheData = JSON.parse(raw);

      if (!cacheData.players || !Array.isArray(cacheData.players)) {
        continue;
      }

      for (const player of cacheData.players) {
        if (!player.player) continue;

        const nameMatch = player.player.toLowerCase().includes(searchLower);
        if (!nameMatch) continue;

        // Apply team filter if specified
        if (options.team && player.team) {
          if (!player.team.toLowerCase().includes(options.team.toLowerCase())) {
            continue;
          }
        }

        // Build result
        let playerData = { ...player };

        // If specific metrics requested, filter to those only
        if (options.metrics && Array.isArray(options.metrics)) {
          const filtered = {
            player: playerData.player,
            team: playerData.team,
            league: playerData.league,
            league_name: playerData.league_name,
            season: playerData.season,
          };
          for (const metric of options.metrics) {
            if (playerData[metric] !== undefined) {
              filtered[metric] = playerData[metric];
            }
          }
          playerData = filtered;
        }

        matches.push({
          ...playerData,
          _source_file: file,
          _fetched_at: cacheData.fetched_at,
        });
      }
    } catch (err) {
      // Skip corrupted files silently
      console.error(`[fbrefCacheReader] Error reading ${file}:`, err.message);
      continue;
    }
  }

  if (matches.length === 0) {
    return {
      status: 'unavailable',
      warning: `Player "${playerName}" not found in cache`,
      data: null,
    };
  }

  // Check staleness
  const warnings = [];
  const oldestFetch = matches.reduce((oldest, m) => {
    const t = new Date(m._fetched_at).getTime();
    return t < oldest ? t : oldest;
  }, Infinity);

  const hoursAgo = (Date.now() - oldestFetch) / (1000 * 60 * 60);
  if (hoursAgo > STALE_THRESHOLD_HOURS) {
    warnings.push(
      `Cache is ${Math.round(hoursAgo)}h old. Consider running the worker.`
    );
  }

  // Return best match (exact match first, then first partial)
  const exactMatch = matches.find(
    m => m.player.toLowerCase() === searchLower
  );
  const bestMatch = exactMatch || matches[0];

  return {
    status: 'ok',
    data: bestMatch,
    alternatives: matches.length > 1 ? matches.slice(0, 5) : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get the overall cache status for health checks.
 * @returns {object} Cache status summary
 */
function getCacheStatus() {
  const result = {
    cache_dir: CACHE_DIR,
    exists: fs.existsSync(CACHE_DIR),
    leagues: [],
    last_updated: null,
    is_locked: fs.existsSync('/opt/reo-data-cache/.lock'),
  };

  if (!result.exists) return result;

  // Read last_updated
  if (fs.existsSync(LAST_UPDATED_FILE)) {
    try {
      result.last_updated = JSON.parse(
        fs.readFileSync(LAST_UPDATED_FILE, 'utf-8')
      );
    } catch (e) {
      result.last_updated = null;
    }
  }

  // List cached leagues
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const filepath = path.join(CACHE_DIR, file);
      const stat = fs.statSync(filepath);
      const cacheData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      result.leagues.push({
        file,
        league: cacheData.league,
        season: cacheData.season,
        player_count: cacheData.player_count,
        fetched_at: cacheData.fetched_at,
        file_size_kb: Math.round(stat.size / 1024),
      });
    } catch (e) {
      result.leagues.push({ file, error: e.message });
    }
  }

  return result;
}

/**
 * Search multiple players at once (for H2H comparisons).
 * @param {string[]} playerNames 
 * @param {object} options
 * @returns {object} Results keyed by player name
 */
function searchMultiplePlayers(playerNames, options = {}) {
  const results = {};
  for (const name of playerNames) {
    results[name] = searchPlayerInCache(name, options);
  }
  return results;
}

module.exports = {
  searchPlayerInCache,
  getCacheStatus,
  searchMultiplePlayers,
  CACHE_DIR,
};
