import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_ROOT = path.join(process.cwd(), 'cache', 'fbref');
const DEFAULT_TTL_MINUTES = Number(process.env.FBREF_CACHE_TTL_MINUTES || 720);

const LEAGUES = [
  {
    key: 'la-liga',
    compId: 12,
    name: 'La Liga',
    urlName: 'La-Liga',
    clubs: ['barcelona', 'fc barcelona', 'deportivo alaves', 'alaves', 'real madrid', 'athletic club', 'athletic'],
  },
  {
    key: 'premier-league',
    compId: 9,
    name: 'Premier League',
    urlName: 'Premier-League',
    clubs: ['chelsea', 'chelsea fc', 'man city', 'manchester city', 'arsenal', 'liverpool', 'tottenham'],
  },
];

const TABLE_TYPES = ['stats', 'shooting'];

const METRIC_TO_FBREF = {
  appearances: ['games'],
  starts: ['games_starts', 'starts'],
  minutes: ['minutes'],
  goals: ['goals'],
  non_penalty_goals: ['goals_pens'],
  assists: ['assists'],
  goal_contributions: ['goals_assists'],
  yellow_cards: ['cards_yellow'],
  red_cards: ['cards_red'],
  xg: ['xg'],
  npxg: ['npxg'],
  xa: ['xg_assist', 'xa', 'xag'],
  goals_per90: ['goals_per90'],
  assists_per90: ['assists_per90'],
  xg_per90: ['xg_per90'],
  xa_per90: ['xg_assist_per90', 'xa_per90', 'xag_per90'],
  progressive_passes: ['progressive_passes'],
  progressive_carries: ['progressive_carries'],
  shots: ['shots'],
  shots_on_target: ['shots_on_target'],
  shot_accuracy: ['shots_on_target_pct'],
  shots_per90: ['shots_per90'],
  shots_on_target_per90: ['shots_on_target_per90'],
  goals_per_shot: ['goals_per_shot'],
  average_shot_distance: ['average_shot_distance'],
};

const splitSeason = (season) => {
  const raw = String(season || '').trim();
  const range = raw.match(/(20\d{2})\D{0,3}(\d{2,4})/);
  if (!range) return '2025-2026';
  const start = range[1];
  const end = range[2].length === 2 ? `20${range[2]}` : range[2];
  return `${start}-${end}`;
};

const normalize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const decodeEntities = (value) => String(value || '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&#x27;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const stripTags = (html) => decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

const parseRows = (html, tableType) => {
  const expanded = String(html || '').replace(/<!--/g, '').replace(/-->/g, '');
  const rows = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(expanded))) {
    const rowHtml = rowMatch[1];
    if (!/data-stat=["']player["']/.test(rowHtml) || /thead/i.test(rowHtml)) continue;
    const row = {};
    const cellRegex = /<(?:td|th)\b[^>]*data-stat=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml))) {
      row[cellMatch[1]] = stripTags(cellMatch[2]);
    }
    if (row.player && row.squad) rows.push({ ...row, _tableType: tableType });
  }
  return rows;
};

const leagueForClub = (club) => {
  const normalized = normalize(club);
  const direct = LEAGUES.find((league) => league.clubs.some((candidate) => normalized.includes(candidate) || candidate.includes(normalized)));
  return direct ? [direct] : LEAGUES;
};

const tableUrl = (league, seasonSlug, tableType) => {
  const tablePath = tableType === 'stats' ? 'stats' : tableType;
  return `https://fbref.com/en/comps/${league.compId}/${seasonSlug}/${tablePath}/${seasonSlug}-${league.urlName}-Stats`;
};

const cachePath = (league, seasonSlug) => path.join(CACHE_ROOT, `${league.key}-${seasonSlug}.json`);

const readCache = async (file) => {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const isFresh = (cached, ttlMinutes) => {
  const updatedAt = cached?.updatedAt ? new Date(cached.updatedAt).getTime() : 0;
  return Boolean(updatedAt && Date.now() - updatedAt < ttlMinutes * 60_000);
};

const fetchTable = async (league, seasonSlug, tableType) => {
  const response = await fetch(tableUrl(league, seasonSlug, tableType), {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`FBref ${tableType} fetch failed with ${response.status}`);
  }
  if (/Just a moment|cf-browser-verification|Cloudflare/i.test(text)) {
    throw new Error(`FBref ${tableType} fetch blocked by anti-bot protection`);
  }
  return parseRows(text, tableType);
};

const mergeRows = (tables) => {
  const byPlayer = new Map();
  for (const row of tables.flat()) {
    const key = `${normalize(row.player)}|${normalize(row.squad)}`;
    const existing = byPlayer.get(key) || {};
    byPlayer.set(key, { ...existing, ...row });
  }
  return Array.from(byPlayer.values());
};

const loadLeagueDataset = async (league, seasonSlug, ttlMinutes) => {
  await fs.mkdir(CACHE_ROOT, { recursive: true });
  const file = cachePath(league, seasonSlug);
  const cached = await readCache(file);
  if (cached?.rows?.length && isFresh(cached, ttlMinutes)) return cached;

  try {
    const tables = [];
    for (const tableType of TABLE_TYPES) {
      tables.push(await fetchTable(league, seasonSlug, tableType));
    }
    const payload = {
      source: 'fbref',
      league: league.key,
      season: seasonSlug,
      updatedAt: new Date().toISOString(),
      rows: mergeRows(tables),
    };
    await fs.writeFile(file, JSON.stringify(payload, null, 2));
    return payload;
  } catch (error) {
    if (cached?.rows?.length) {
      return {
        ...cached,
        stale: true,
        warning: `${error instanceof Error ? error.message : String(error)}; using stale FBref cache from ${cached.updatedAt}`,
      };
    }
    throw error;
  }
};

const playerScore = (row, player) => {
  const rowName = normalize(row.player);
  const wantedName = normalize(player.name);
  const rowClub = normalize(row.squad);
  const wantedClub = normalize(player.club);
  let score = 0;
  if (rowName === wantedName) score += 70;
  if (rowName.includes(wantedName) || wantedName.includes(rowName)) score += 35;
  for (const token of wantedName.split(' ').filter((part) => part.length >= 3)) {
    if (rowName.includes(token)) score += 8;
  }
  if (wantedClub && (rowClub === wantedClub || rowClub.includes(wantedClub) || wantedClub.includes(rowClub))) score += 28;
  return score;
};

const findPlayerRow = async (player, seasonSlug, ttlMinutes) => {
  const leagues = leagueForClub(player.club);
  const candidates = [];
  const warnings = [];
  for (const league of leagues) {
    try {
      const dataset = await loadLeagueDataset(league, seasonSlug, ttlMinutes);
      if (dataset.warning) warnings.push(dataset.warning);
      for (const row of dataset.rows || []) {
        const score = playerScore(row, player);
        if (score > 0) candidates.push({ row, score, league: league.key, stale: Boolean(dataset.stale), warnings });
      }
    } catch (error) {
      warnings.push(`${league.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates[0] || candidates[0].score < 30) {
    throw new Error(`FBref player match not found for ${player.name} / ${player.club}. ${warnings.join(' | ')}`.trim());
  }
  return candidates[0];
};

const pickValue = (row, metricKey) => {
  const candidates = METRIC_TO_FBREF[metricKey] || [metricKey];
  for (const key of candidates) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};

export async function getMetric(metricKey, player, meta = {}) {
  const seasonSlug = splitSeason(player?.season || meta.season);
  const ttlMinutes = Number(meta.cacheTtlMinutes || DEFAULT_TTL_MINUTES);
  const match = await findPlayerRow(player || {}, seasonSlug, ttlMinutes);
  const value = pickValue(match.row, metricKey);
  if (!value) {
    throw new Error(`FBref metric ${metricKey} is not mapped or empty for ${player?.name || 'player'}`);
  }
  return {
    label: meta.label || metricKey.replace(/_/g, ' '),
    labelAr: meta.labelAr || meta.label || metricKey.replace(/_/g, ' '),
    value,
    unit: meta.unit || '',
    category: meta.category || 'season',
    provider: match.stale ? 'fbref-stale-cache' : 'fbref',
    confidence: match.stale ? 0.74 : 0.92,
    updatedAt: new Date().toISOString(),
  };
}
