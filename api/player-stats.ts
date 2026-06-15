import {
  readJsonBody,
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
  providerPolicy: string;
  selectedMetrics: string[];
  presentation?: {
    heroMetrics?: string[];
    secondaryMetrics?: string[];
    visualVariant?: string;
  };
};

type PlayerStatsBody = {
  mode?: string;
  providerPolicy?: string;
  player?: { name?: string; club?: string };
  comparisonPlayers?: Array<{ name?: string; club?: string }>;
  season?: string;
  selectedMetrics?: string[];
  presentation?: {
    heroMetrics?: string[];
    secondaryMetrics?: string[];
    visualVariant?: string;
  };
};

type PlayerStatsDiagnostics = {
  bridgeUrlConfigured: boolean;
  bridgeUrlEnvConfigured: boolean;
  bridgeUrlDefaultUsed: boolean;
  bridgeTokenConfigured: boolean;
  upstreamAttempted: boolean;
  upstreamStatus: number | null;
  responseMode: 'bridge' | 'legacy' | 'fallback';
};

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const playerStatsBridgeUrl = () => {
  const raw = process.env.REO_PLAYER_STATS_BRIDGE_URL?.trim() || '';
  if (!raw) return '';
  const trimmed = trimSlash(raw);
  return trimmed.endsWith('/api/player-stats') ? trimmed : `${trimmed}/api/player-stats`;
};

const playerStatsBridgeUrlEnvConfigured = () => Boolean(process.env.REO_PLAYER_STATS_BRIDGE_URL?.trim());

const playerStatsBridgeToken = () => process.env.REO_PLAYER_STATS_BRIDGE_TOKEN?.trim() || '';

const getQuery = (req: ServerlessRequest) => {
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  return qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
};

const parseQuery = (req: ServerlessRequest): PlayerStatsQuery => {
  const query = getQuery(req);
  const mode = (query.get('mode') || 'SINGLE').replace('SCOUT_SHORTLIST', 'SCOUT_CARD');
  const needsSecondPlayer = mode === 'COMPARE' || mode === 'SCOUT_CARD';
  const needsThirdPlayer = mode === 'SCOUT_CARD';
  const categories = (query.get('categories') || 'all')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  return {
    mode,
    season: query.get('season') || '2025/26',
    categories,
    playerAName: query.get('playerAName') || 'Robert Lewandowski',
    playerAClub: query.get('playerAClub') || 'Barcelona',
    playerBName: query.get('playerBName') || (needsSecondPlayer ? 'Cole Palmer' : ''),
    playerBClub: query.get('playerBClub') || (needsSecondPlayer ? 'Chelsea' : ''),
    playerCName: query.get('playerCName') || (needsThirdPlayer ? 'Lamine Yamal' : ''),
    playerCClub: query.get('playerCClub') || (needsThirdPlayer ? 'Barcelona' : ''),
    providerPolicy: query.get('providerPolicy') || 'auto',
    selectedMetrics: listFrom(query.get('selectedMetrics') || query.get('metrics') || ''),
  };
};

const queryObject = (req: ServerlessRequest): Record<string, string> => {
  const query = getQuery(req);
  return Object.fromEntries(query.entries());
};

const listFrom = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const parseBodyQuery = async (req: ServerlessRequest): Promise<PlayerStatsQuery> => {
  if (req.method === 'POST') {
    const body = await readJsonBody<PlayerStatsBody>(req).catch(() => ({} as PlayerStatsBody));
    const comparisons = Array.isArray(body.comparisonPlayers) ? body.comparisonPlayers : [];
    const mode = String(body.mode || 'SINGLE').replace('SCOUT_SHORTLIST', 'SCOUT_CARD');
    const needsSecondPlayer = mode === 'COMPARE' || mode === 'SCOUT_CARD';
    const needsThirdPlayer = mode === 'SCOUT_CARD';
    return {
      mode,
      season: String(body.season || '2025/26'),
      categories: [],
      playerAName: String(body.player?.name || 'Robert Lewandowski'),
      playerAClub: String(body.player?.club || 'Barcelona'),
      playerBName: String(comparisons[0]?.name || (needsSecondPlayer ? 'Cole Palmer' : '')),
      playerBClub: String(comparisons[0]?.club || (needsSecondPlayer ? 'Chelsea' : '')),
      playerCName: String(comparisons[1]?.name || (needsThirdPlayer ? 'Lamine Yamal' : '')),
      playerCClub: String(comparisons[1]?.club || (needsThirdPlayer ? 'Barcelona' : '')),
      providerPolicy: String(body.providerPolicy || 'auto'),
      selectedMetrics: listFrom(body.selectedMetrics),
      presentation: body.presentation,
    };
  }

  const query = parseQuery(req);
  return {
    ...query,
    providerPolicy: getQuery(req).get('providerPolicy') || 'auto',
    selectedMetrics: listFrom(getQuery(req).get('selectedMetrics') || getQuery(req).get('metrics') || ''),
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

const metricStats = (selectedMetrics: string[]) => {
  if (!selectedMetrics.length) return [];
  const byLabel = new Map(ALL_CATEGORY_STATS.map(stat => [
    stat.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    stat,
  ]));
  return selectedMetrics.map(key => {
    const fallback = byLabel.get(key) || ALL_CATEGORY_STATS.find(stat => stat.label.toLowerCase() === key.replace(/_/g, ' '));
    return {
      key,
      label: fallback?.label || key.replace(/_/g, ' '),
      labelAr: fallback?.label || key.replace(/_/g, ' '),
      value: 'pending',
      unit: '',
      category: fallback?.category || 'advanced',
      provider: 'fallback',
      confidence: 0.35,
      updatedAt: new Date().toISOString(),
    };
  });
};

const fallbackPayload = (
  query: PlayerStatsQuery,
  diagnostics: PlayerStatsDiagnostics,
  extraWarnings: string[] = [],
) => {
  const statsArray = query.selectedMetrics.length ? metricStats(query.selectedMetrics) : categoryStats(query.categories);
  const stats = Object.fromEntries(statsArray.map(stat => [stat.key || stat.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'), stat]));
  const players = [
    { name: query.playerAName, club: query.playerAClub, position: 'AI resolved', season: query.season, stats },
    { name: query.playerBName, club: query.playerBClub, position: 'AI resolved', season: query.season, stats },
    { name: query.playerCName, club: query.playerCClub, position: 'AI resolved', season: query.season, stats },
  ].filter(player => player.name.trim());

  return {
    mode: query.mode,
    season: query.season,
    providerPolicy: query.providerPolicy,
    providerPlan: [],
    selectedMetrics: query.selectedMetrics,
    presentation: query.presentation,
    source: 'REO Player Stats Bridge contract',
    updatedAt: new Date().toISOString(),
    bridgeConfigured: diagnostics.bridgeUrlConfigured,
    bridgeUrlConfigured: diagnostics.bridgeUrlConfigured,
    bridgeUrlEnvConfigured: diagnostics.bridgeUrlEnvConfigured,
    bridgeUrlDefaultUsed: diagnostics.bridgeUrlDefaultUsed,
    bridgeTokenConfigured: diagnostics.bridgeTokenConfigured,
    upstreamAttempted: diagnostics.upstreamAttempted,
    upstreamStatus: diagnostics.upstreamStatus,
    responseMode: diagnostics.responseMode,
    auth: {
      required: diagnostics.bridgeUrlConfigured,
      provided: diagnostics.bridgeTokenConfigured,
      valid: false,
    },
    supportedModes: ['SINGLE', 'COMPARE', 'SCOUT_CARD'],
    supportedCategories: [...new Set(ALL_CATEGORY_STATS.map(stat => stat.category))],
    warnings: [
      ...extraWarnings,
      ...(query.selectedMetrics.length ? [] : ['No selectedMetrics were provided; returning compatibility fallback only.']),
    ],
    players,
    notes: [
      'This endpoint is ready for the Google Cloud player extractor.',
      'Configure REO_PLAYER_STATS_BRIDGE_URL or expose /api/player-stats on the REO bridge to return real WhoScored player season data.',
    ],
  };
};

const withDiagnostics = (
  payload: Record<string, unknown>,
  diagnostics: PlayerStatsDiagnostics,
  warnings: string[] = [],
) => ({
  ...payload,
  bridgeUrlConfigured: diagnostics.bridgeUrlConfigured,
  bridgeUrlEnvConfigured: diagnostics.bridgeUrlEnvConfigured,
  bridgeUrlDefaultUsed: diagnostics.bridgeUrlDefaultUsed,
  bridgeTokenConfigured: diagnostics.bridgeTokenConfigured,
  upstreamAttempted: diagnostics.upstreamAttempted,
  upstreamStatus: diagnostics.upstreamStatus,
  responseMode: diagnostics.responseMode,
  warnings: [
    ...warnings,
    ...(Array.isArray(payload.warnings) ? payload.warnings : []),
  ],
});

const legacyBridgeUrl = (queryString: string) => {
  const bridgeBase = process.env.REO_BRIDGE_URL?.trim();
  if (!bridgeBase) return '';
  return `${trimSlash(bridgeBase)}/api/player-stats?${queryString}`;
};

const bridgeHeaders = (jsonBody = false, allowLegacyToken = false): Record<string, string> => {
  const headers: Record<string, string> = jsonBody
    ? { 'Content-Type': 'application/json' }
    : { Accept: 'application/json' };
  const bridgeToken = playerStatsBridgeToken() || (allowLegacyToken ? process.env.REO_BRIDGE_TOKEN?.trim() : '');
  if (bridgeToken) {
    headers.Authorization = `Bearer ${bridgeToken}`;
  }
  return headers;
};

const fetchExplicitBridge = (url: string, query: PlayerStatsQuery, params: Record<string, string>) => fetch(url, {
  method: 'POST',
  headers: bridgeHeaders(true),
  body: JSON.stringify({
    ...query,
    player: {
      name: query.playerAName,
      club: query.playerAClub,
    },
    comparisonPlayers: [
      { name: query.playerBName, club: query.playerBClub },
      { name: query.playerCName, club: query.playerCClub },
    ].filter(player => player.name.trim()),
    query: params,
  }),
  cache: 'no-store',
});

const fetchLegacyBridge = (url: string) => fetch(url, {
  headers: bridgeHeaders(false, true),
  cache: 'no-store',
});

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'GET, POST, OPTIONS', { error: 'Method not allowed' });
  }

  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
  const query = await parseBodyQuery(req);
  const explicitUrl = playerStatsBridgeUrl();
  const legacyUrl = explicitUrl ? '' : legacyBridgeUrl(queryString);
  const url = explicitUrl || legacyUrl;
  const diagnostics: PlayerStatsDiagnostics = {
    bridgeUrlConfigured: Boolean(explicitUrl),
    bridgeUrlEnvConfigured: playerStatsBridgeUrlEnvConfigured(),
    bridgeUrlDefaultUsed: Boolean(explicitUrl) && !playerStatsBridgeUrlEnvConfigured(),
    bridgeTokenConfigured: Boolean(playerStatsBridgeToken()),
    upstreamAttempted: Boolean(url),
    upstreamStatus: null,
    responseMode: explicitUrl ? 'bridge' : (legacyUrl ? 'legacy' : 'fallback'),
  };

  if (url) {
    try {
      const upstream = explicitUrl
        ? await fetchExplicitBridge(explicitUrl, query, queryObject(req))
        : await fetchLegacyBridge(url);
      diagnostics.upstreamStatus = upstream.status;
      const payload = await upstream.json().catch(() => null);
      if (explicitUrl && upstream.ok && payload && typeof payload === 'object') {
        return sendJson(res, upstream.status, withDiagnostics(payload as Record<string, unknown>, diagnostics));
      }
      if (!explicitUrl && upstream.ok && payload && typeof payload === 'object') {
        return sendJson(res, 200, withDiagnostics(payload as Record<string, unknown>, diagnostics));
      }
      if (explicitUrl) {
        diagnostics.responseMode = 'fallback';
        return sendJson(res, 200, fallbackPayload(query, diagnostics, [
          `Configured player stats bridge returned HTTP ${upstream.status}; compatibility fallback returned pending values.`,
        ]));
      }
    } catch (error) {
      console.warn('Player stats bridge unavailable', error);
      if (explicitUrl) {
        diagnostics.responseMode = 'fallback';
        return sendJson(res, 200, fallbackPayload(query, diagnostics, [
          'Configured player stats bridge could not be reached; compatibility fallback returned pending values.',
        ]));
      }
    }
  }

  return sendJson(res, 200, fallbackPayload(query, diagnostics));
}
