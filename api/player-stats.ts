import {
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';

type PlayerStatsQuery = {
  mode: string;
  season: string;
  categories: string[];
  playerAName: string;
  playerAClub: string;
  playerBName: string;
  playerBClub: string;
  playerCName: string;
  playerCClub: string;
};

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const getQuery = (req: ServerlessRequest) => {
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  return qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
};

const parseQuery = (req: ServerlessRequest): PlayerStatsQuery => {
  const query = getQuery(req);
  const categories = (query.get('categories') || 'all')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  return {
    mode: (query.get('mode') || 'SINGLE').replace('SCOUT_SHORTLIST', 'SCOUT_CARD'),
    season: query.get('season') || '2025/26',
    categories,
    playerAName: query.get('playerAName') || 'Robert Lewandowski',
    playerAClub: query.get('playerAClub') || 'Barcelona',
    playerBName: query.get('playerBName') || 'Cole Palmer',
    playerBClub: query.get('playerBClub') || 'Chelsea',
    playerCName: query.get('playerCName') || 'Lamine Yamal',
    playerCClub: query.get('playerCClub') || 'Barcelona',
  };
};

const ALL_CATEGORY_STATS = [
  { label: 'Appearances', value: 'pending', hint: 'season matches played', category: 'season' },
  { label: 'Starts', value: 'pending', hint: 'first XI appearances', category: 'season' },
  { label: 'Minutes', value: 'pending', hint: 'season load', category: 'season' },
  { label: 'Goals', value: 'pending', hint: 'WhoScored season total', category: 'attack' },
  { label: 'Non-penalty goals', value: 'pending', hint: 'open-play scoring', category: 'attack' },
  { label: 'Assists', value: 'pending', hint: 'direct goal creation', category: 'attack' },
  { label: 'Shots', value: 'pending', hint: 'total attempts', category: 'shooting' },
  { label: 'Shots / 90', value: 'pending', hint: 'normalised shot volume', category: 'shooting' },
  { label: 'Shots on target', value: 'pending', hint: 'accurate attempts', category: 'shooting' },
  { label: 'Shot accuracy', value: 'pending', hint: 'shots on target rate', category: 'shooting' },
  { label: 'Touches in box', value: 'pending', hint: 'penalty-area presence', category: 'attack' },
  { label: 'Big chances', value: 'pending', hint: 'high-value chances', category: 'attack' },
  { label: 'Key passes', value: 'pending', hint: 'chance creation', category: 'chance_creation' },
  { label: 'Big chances created', value: 'pending', hint: 'clear scoring chances made', category: 'chance_creation' },
  { label: 'Through balls', value: 'pending', hint: 'line-breaking supply', category: 'chance_creation' },
  { label: 'Crosses', value: 'pending', hint: 'wide service', category: 'chance_creation' },
  { label: 'Passes', value: 'pending', hint: 'distribution volume', category: 'passing' },
  { label: 'Pass accuracy', value: 'pending', hint: 'distribution quality', category: 'passing' },
  { label: 'Progressive passes', value: 'pending', hint: 'build-up value', category: 'passing' },
  { label: 'Long balls', value: 'pending', hint: 'direct distribution', category: 'passing' },
  { label: 'Final-third passes', value: 'pending', hint: 'advanced ball progression', category: 'passing' },
  { label: 'Successful dribbles', value: 'pending', hint: '1v1 output', category: 'dribbling' },
  { label: 'Dribble success', value: 'pending', hint: 'take-on efficiency', category: 'dribbling' },
  { label: 'Progressive carries', value: 'pending', hint: 'carry distance', category: 'possession' },
  { label: 'Touches', value: 'pending', hint: 'involvement volume', category: 'possession' },
  { label: 'Dispossessed', value: 'pending', hint: 'lost under pressure', category: 'possession' },
  { label: 'Turnovers', value: 'pending', hint: 'possession losses', category: 'possession' },
  { label: 'Recoveries', value: 'pending', hint: 'ball wins', category: 'defense' },
  { label: 'Tackles', value: 'pending', hint: 'defensive actions', category: 'defense' },
  { label: 'Tackle success', value: 'pending', hint: 'duel efficiency', category: 'defense' },
  { label: 'Interceptions', value: 'pending', hint: 'reading play', category: 'defense' },
  { label: 'Clearances', value: 'pending', hint: 'box protection', category: 'defense' },
  { label: 'Blocks', value: 'pending', hint: 'shot/pass blocks', category: 'defense' },
  { label: 'Aerial duels won', value: 'pending', hint: 'air strength', category: 'duels' },
  { label: 'Ground duels won', value: 'pending', hint: 'contact strength', category: 'duels' },
  { label: 'Fouls won', value: 'pending', hint: 'pressure resistance', category: 'duels' },
  { label: 'Fouls committed', value: 'pending', hint: 'discipline load', category: 'discipline' },
  { label: 'Yellow cards', value: 'pending', hint: 'discipline', category: 'discipline' },
  { label: 'Red cards', value: 'pending', hint: 'discipline', category: 'discipline' },
  { label: 'Rating', value: 'pending', hint: 'WhoScored model score', category: 'advanced' },
  { label: 'Player impact index', value: 'pending', hint: 'REO synthetic profile score', category: 'advanced' },
  { label: 'Per 90 profile', value: 'pending', hint: 'normalised comparison', category: 'per90' },
  { label: 'Goalkeeper saves', value: 'pending', hint: 'keeper-only metric', category: 'goalkeeping' },
  { label: 'Save percentage', value: 'pending', hint: 'keeper efficiency', category: 'goalkeeping' },
  { label: 'Clean sheets', value: 'pending', hint: 'keeper/team defensive output', category: 'goalkeeping' },
];

const categoryStats = (categories: string[]) => {
  const wanted = new Set(categories.map(item => item.toLowerCase()));
  const includeAll = wanted.size === 0 || wanted.has('all') || wanted.has('*');
  return ALL_CATEGORY_STATS.filter(stat => includeAll || wanted.has(stat.category));
};

const fallbackPayload = (query: PlayerStatsQuery) => {
  const stats = categoryStats(query.categories);
  const players = [
    { name: query.playerAName, club: query.playerAClub, position: 'AI resolved', season: query.season, stats },
    { name: query.playerBName, club: query.playerBClub, position: 'AI resolved', season: query.season, stats },
    { name: query.playerCName, club: query.playerCClub, position: 'AI resolved', season: query.season, stats },
  ].filter(player => player.name.trim());

  return {
    mode: query.mode,
    season: query.season,
    source: 'REO Player Stats Bridge contract',
    updatedAt: new Date().toISOString(),
    bridgeConfigured: false,
    supportedModes: ['SINGLE', 'COMPARE', 'SCOUT_CARD'],
    supportedCategories: [...new Set(ALL_CATEGORY_STATS.map(stat => stat.category))],
    players,
    notes: [
      'This endpoint is ready for the Google Cloud player extractor.',
      'Configure REO_PLAYER_STATS_BRIDGE_URL or expose /api/player-stats on the REO bridge to return real WhoScored player season data.',
    ],
  };
};

const upstreamUrl = (queryString: string) => {
  const explicit = process.env.REO_PLAYER_STATS_BRIDGE_URL?.trim();
  if (explicit) return `${explicit}${explicit.includes('?') ? '&' : '?'}${queryString}`;

  const bridgeBase = process.env.REO_BRIDGE_URL?.trim();
  if (!bridgeBase) return '';
  return `${trimSlash(bridgeBase)}/api/player-stats?${queryString}`;
};

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, 'GET, OPTIONS', { error: 'Method not allowed' });
  }

  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
  const query = parseQuery(req);
  const url = upstreamUrl(queryString);

  if (url) {
    try {
      const token = process.env.REO_PLAYER_STATS_BRIDGE_TOKEN || process.env.REO_BRIDGE_TOKEN || '';
      const upstream = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
      });
      const payload = await upstream.json().catch(() => null);
      if (upstream.ok && payload) return sendJson(res, 200, payload);
    } catch (error) {
      console.warn('Player stats bridge unavailable', error);
    }
  }

  return sendJson(res, 200, fallbackPayload(query));
}
