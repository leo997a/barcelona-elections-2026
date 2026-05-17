import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = '/opt/reo-data-cache/fbref';

// Normalization utility
const normalize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Scoring function for player match
const playerScore = (row, player) => {
  // Check for common player name fields in row
  const rawRowName = row.player || row.Player || row.player_name || '';
  const rowName = normalize(rawRowName);
  const wantedName = normalize(player.name);
  
  // Check for common club name fields in row
  const rawRowClub = row.team || row.squad || row.Squad || row.Team || row.club || '';
  const rowClub = normalize(rawRowClub);
  const wantedClub = normalize(player.club);
  
  let score = 0;
  if (rowName === wantedName) score += 70;
  else if (rowName.includes(wantedName) || wantedName.includes(rowName)) score += 35;
  
  for (const token of wantedName.split(' ').filter((part) => part.length >= 3)) {
    if (rowName.includes(token)) score += 8;
  }
  
  if (wantedClub && (rowClub === wantedClub || rowClub.includes(wantedClub) || wantedClub.includes(rowClub))) {
    score += 28;
  }
  return score;
};

// Global cache for JSON files to avoid reading from disk on every metric
const memoryCache = new Map();

async function readJsonSafely(filePath) {
  try {
    if (memoryCache.has(filePath)) {
      return memoryCache.get(filePath);
    }
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    memoryCache.set(filePath, parsed);
    return parsed;
  } catch (error) {
    return null;
  }
}

export async function clearCache() {
  memoryCache.clear();
}

export async function checkCacheHealth() {
  const lastUpdated = await readJsonSafely(path.join(CACHE_DIR, 'last_updated.json'));
  if (!lastUpdated || !lastUpdated.ok) {
    return { status: 'unavailable', warning: 'fbref_cache_unavailable' };
  }
  return { 
    status: lastUpdated.coverage, 
    availableStatGroups: lastUpdated.availableStatGroups || [],
    missingStatGroups: lastUpdated.missingStatGroups || []
  };
}

export async function getMetric(metricKey, player, meta = {}) {
  // 1. Check if cache exists
  const lastUpdated = await readJsonSafely(path.join(CACHE_DIR, 'last_updated.json'));
  if (!lastUpdated) {
    return { status: 'unavailable', reason: 'fbref_cache_unavailable' };
  }
  
  // 2. Lookup metric in metrics_coverage.json
  const metricsCoverage = await readJsonSafely(path.join(CACHE_DIR, 'metrics_coverage.json'));
  if (!metricsCoverage) {
    return { status: 'unavailable', reason: 'metrics_coverage_file_missing' };
  }
  
  const metricInfo = metricsCoverage[metricKey];
  if (!metricInfo) {
    return { status: 'unavailable', reason: 'metric_not_mapped' };
  }
  
  const statGroup = metricInfo.requiredStatGroup || metricInfo.statGroup;
  const sourceColumn = metricInfo.sourceColumn;
  
  const baseResponse = {
    source: 'fbref',
    statGroup: statGroup,
  };
  
  // 3. Check availableStatGroups
  const availableGroups = lastUpdated.availableStatGroups || [];
  if (!availableGroups.includes(statGroup)) {
    return {
      ...baseResponse,
      status: 'unavailable',
      reason: 'stat_group_not_available',
      requiredStatGroup: statGroup,
    };
  }
  
  // 4. Check columns-manifest
  const manifest = await readJsonSafely(path.join(CACHE_DIR, 'columns-manifest.json'));
  if (manifest && manifest.statGroups && manifest.statGroups[statGroup]) {
    const groupManifest = manifest.statGroups[statGroup];
    if (groupManifest.columns && !groupManifest.columns.includes(sourceColumn)) {
      return {
        ...baseResponse,
        status: 'unavailable',
        reason: 'unavailable_column_missing',
        requiredColumn: sourceColumn,
        requiredStatGroup: statGroup
      };
    }
  }
  
  // 5. Read player from stat group file
  const season = meta.season || player.season || '2025-26';
  const groupFile = path.join(CACHE_DIR, `fbref-${statGroup}-${season}.json`);
  const groupData = await readJsonSafely(groupFile);
  
  if (!groupData || !groupData.players) {
    return { ...baseResponse, status: 'unavailable', reason: 'stat_group_file_missing_or_invalid' };
  }
  
  // Match player
  let bestMatch = null;
  let bestScore = 0;
  
  for (const row of groupData.players) {
    const score = playerScore(row, player);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }
  
  if (!bestMatch || bestScore < 30) {
    return { ...baseResponse, status: 'unavailable', reason: 'player_not_found' };
  }
  
  // Extract value
  const value = bestMatch[sourceColumn];
  if (value === undefined || value === null || String(value).trim() === '') {
    return { ...baseResponse, status: 'unavailable', reason: 'metric_value_empty' };
  }
  
  return {
    ...baseResponse,
    status: 'available',
    value: isNaN(Number(value)) ? value : Number(value),
  };
}
