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
  const categories = (query.get('categories') || 'attack,passing,defense,possession,season,per90')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  return {
    mode: query.get('mode') || 'SINGLE',
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

const categoryStats = (categories: string[]) => {
  const include = (category: string) => categories.includes(category);
  return [
    ...(include('attack') ? [
      { label: 'Goals', value: 'pending', hint: 'WhoScored season total', category: 'attack' },
      { label: 'Shots / 90', value: 'pending', hint: 'per-match attack volume', category: 'attack' },
      { label: 'Touches in box', value: 'pending', hint: 'penalty-area presence', category: 'attack' },
    ] : []),
    ...(include('passing') ? [
      { label: 'Key passes', value: 'pending', hint: 'chance creation', category: 'passing' },
      { label: 'Progressive passes', value: 'pending', hint: 'build-up value', category: 'passing' },
      { label: 'Pass accuracy', value: 'pending', hint: 'distribution quality', category: 'passing' },
    ] : []),
    ...(include('defense') ? [
      { label: 'Recoveries', value: 'pending', hint: 'ball wins', category: 'defense' },
      { label: 'Tackles', value: 'pending', hint: 'defensive actions', category: 'defense' },
      { label: 'Interceptions', value: 'pending', hint: 'reading play', category: 'defense' },
    ] : []),
    ...(include('possession') ? [
      { label: 'Successful dribbles', value: 'pending', hint: '1v1 output', category: 'possession' },
      { label: 'Progressive carries', value: 'pending', hint: 'carry distance', category: 'possession' },
    ] : []),
    ...(include('season') ? [
      { label: 'Appearances', value: 'pending', hint: 'season total', category: 'season' },
      { label: 'Minutes', value: 'pending', hint: 'season load', category: 'season' },
    ] : []),
    ...(include('per90') ? [
      { label: 'Per 90 profile', value: 'pending', hint: 'normalised comparison', category: 'per90' },
    ] : []),
  ];
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
