import {
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import {
  MERCATO_FALLBACK_TRANSFERS,
  tag,
  type MercatoTransferCard,
} from '../utils/data/mercatoFallbackData.js';

type BridgeView = 'fee' | 'latest' | 'probability' | 'medical' | 'sources';
type ResponseMode = 'bridge' | 'fallback';

const DEFAULT_TRANSFERS_BRIDGE_URL = 'https://reo-mercato-bridge-871752181341.us-central1.run.app/api/feed';

interface SourceStatus {
  configured: boolean;
  attempted: boolean;
  ok: boolean;
  status: number | null;
  tokenConfigured: boolean;
  endpoint: string | null;
  error?: string;
}

const VALID_VIEWS = new Set<BridgeView>(['fee', 'latest', 'probability', 'medical', 'sources']);

const envText = (key: string): string => process.env[key]?.trim() || '';

const getQuery = (req: ServerlessRequest) => {
  const rawUrl = (req as unknown as { url?: string }).url ?? '';
  const qIndex = rawUrl.indexOf('?');
  return qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const unwrap = (value: unknown): unknown => {
  const record = asRecord(value);
  return record && 'value' in record ? record.value : value;
};

const textFrom = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const raw = unwrap(record[key]);
    if (raw === null || raw === undefined) continue;
    const text = String(raw).trim();
    if (text) return text;
  }
  return undefined;
};

const numberFrom = (record: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = Number(unwrap(record[key]));
    if (Number.isFinite(value)) return value;
  }
  return undefined;
};

const arrayFrom = <T>(record: Record<string, unknown>, keys: string[]): T[] | undefined => {
  for (const key of keys) {
    const raw = unwrap(record[key]);
    if (Array.isArray(raw)) return raw as T[];
  }
  return undefined;
};

const getTransferList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];

  for (const key of ['transfers', 'cards', 'items', 'data', 'payload', 'players']) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
    const nested = asRecord(candidate);
    if (nested && Array.isArray(nested.transfers)) return nested.transfers;
    if (nested && Array.isArray(nested.items)) return nested.items;
    if (nested && Array.isArray(nested.cards)) return nested.cards;
  }

  if ('name' in record || 'playerName' in record || 'fromClub' in record || 'toClub' in record) return [record];
  return [];
};

const tagText = (record: Record<string, unknown>, keys: string[], source: string) => {
  const value = textFrom(record, keys);
  return value ? tag(value, source) : undefined;
};

const tagNumber = (record: Record<string, unknown>, keys: string[], source: string) => {
  const value = numberFrom(record, keys);
  return value !== undefined ? tag(value, source) : undefined;
};

const tagArray = <T>(record: Record<string, unknown>, keys: string[], source: string) => {
  const value = arrayFrom<T>(record, keys);
  return value ? tag(value, source) : undefined;
};

const normalizeCard = (raw: unknown, index: number, source: string): MercatoTransferCard | null => {
  const record = asRecord(raw);
  if (!record) return null;

  const name = textFrom(record, ['name', 'playerName', 'player', 'displayName']);
  if (!name) return null;

  return {
    id: textFrom(record, ['id', 'transferId', 'playerId']) || `mercato-${source}-${index + 1}`,
    name: tag(name, source),
    playerImage: tagText(record, ['playerImage', 'image', 'photo', 'profileImage'], source),
    position: tagText(record, ['position', 'role'], source),
    age: tagText(record, ['age'], source),
    nationality: tagText(record, ['nationality', 'country'], source),
    fromClub: tagText(record, ['fromClub', 'clubFrom', 'currentClub', 'sourceClub'], source),
    fromLogo: tagText(record, ['fromLogo', 'clubFromLogo', 'currentClubLogo'], source),
    toClub: tagText(record, ['toClub', 'clubTo', 'expectedClub', 'destinationClub'], source),
    toLogo: tagText(record, ['toLogo', 'clubToLogo', 'expectedClubLogo'], source),
    fee: tagText(record, ['fee', 'feeLabel', 'feeFotmob', 'dealValue'], source),
    feeValue: tagNumber(record, ['feeValue'], source),
    marketValue: tagText(record, ['marketValue', 'marketValueLabel'], source),
    date: tagText(record, ['date', 'transferDate'], source),
    status: tagText(record, ['status', 'transferStatus', 'transferType'], source),
    transferType: tagText(record, ['transferType', 'type'], source),
    probability: tagNumber(record, ['probability', 'confidencePct'], source),
    oldProbability: tagNumber(record, ['oldProbability', 'previousProbability'], source),
    primarySource: tagText(record, ['primarySource', 'sourceText', 'source'], source) || tag(source, source),
    sourceText: tagText(record, ['sourceText', 'primarySource', 'source'], source) || tag(source, source),
    sources: tagArray(record, ['sources', '_sources'], source),
    chatLines: tagArray(record, ['chatLines'], source),
    clauseTitle: tagText(record, ['clauseTitle'], source),
    clauseBody: tagText(record, ['clauseBody'], source),
    clauseValue: tagText(record, ['clauseValue'], source),
    salary: tagText(record, ['salary'], source),
    contractYears: tagText(record, ['contractYears'], source),
    agentFee: tagText(record, ['agentFee'], source),
    medicalStage: tagText(record, ['medicalStage'], source),
    riskLevel: tagText(record, ['riskLevel'], source),
    hijackClub: tagText(record, ['hijackClub'], source),
    transferHistory: tagArray(record, ['transferHistory'], source),
    valueHistory: tagArray(record, ['valueHistory'], source),
    seasonStats: asRecord(record.seasonStats) ? tag(record.seasonStats, source) : undefined,
    _sources: [{ name: source, status: 'live' }],
  };
};

const resolveBridgeUrl = (base: string, view: BridgeView, limit: number, endpoint: 'feed' | 'transfermarkt') => {
  const parsed = new URL(base);
  if (!/\/api\/(feed|mercato|transfermarkt)\b/.test(parsed.pathname)) {
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/api/${endpoint}`;
  }
  parsed.searchParams.set('view', view);
  parsed.searchParams.set('limit', String(limit));
  return parsed.toString();
};

const makeStatus = (baseUrl: string, token: string): SourceStatus => ({
  configured: Boolean(baseUrl),
  attempted: false,
  ok: false,
  status: null,
  tokenConfigured: Boolean(token),
  endpoint: baseUrl || null,
});

const fetchBridge = async (
  source: string,
  baseUrl: string,
  token: string,
  view: BridgeView,
  limit: number,
  endpoint: 'feed' | 'transfermarkt',
): Promise<{ payload?: unknown; cards: MercatoTransferCard[]; status: SourceStatus }> => {
  const status = makeStatus(baseUrl, token);
  if (!baseUrl) return { cards: [], status };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = resolveBridgeUrl(baseUrl, view, limit, endpoint);
    status.endpoint = url;
    status.attempted = true;
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    status.status = response.status;
    status.ok = response.ok;
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      status.error = `HTTP ${response.status}`;
      return { payload, cards: [], status };
    }
    const cards = getTransferList(payload)
      .map((item, index) => normalizeCard(item, index, source))
      .filter(Boolean) as MercatoTransferCard[];
    return { payload, cards, status };
  } catch (error) {
    status.error = error instanceof Error ? error.message : 'bridge fetch failed';
    return { cards: [], status };
  } finally {
    clearTimeout(timeout);
  }
};

const filterCards = (cards: MercatoTransferCard[], query: URLSearchParams): MercatoTransferCard[] => {
  const player = (query.get('player') || '').trim().toLowerCase();
  const club = (query.get('club') || '').trim().toLowerCase();
  if (!player && !club) return cards;

  return cards.filter(card => {
    const name = String(card.name?.value || '').toLowerCase();
    const from = String(card.fromClub?.value || '').toLowerCase();
    const to = String(card.toClub?.value || '').toLowerCase();
    return (!player || name.includes(player)) && (!club || from.includes(club) || to.includes(club));
  });
};

const resolveView = (raw: string | null): BridgeView => {
  const value = String(raw || 'fee') as BridgeView;
  return VALID_VIEWS.has(value) ? value : 'fee';
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

  const query = getQuery(req);
  const view = resolveView(query.get('view'));
  const limit = Math.max(1, Math.min(24, Number(query.get('limit') || 6) || 6));
  const transfersEnvUrl = envText('REO_TRANSFERS_BRIDGE_URL');
  const transfersUrl = transfersEnvUrl || DEFAULT_TRANSFERS_BRIDGE_URL;
  const transfermarktUrl = envText('REO_TRANSFERMARKT_BRIDGE_URL');
  const transfers = await fetchBridge(
    'fotmob',
    transfersUrl,
    envText('REO_TRANSFERS_BRIDGE_TOKEN'),
    view,
    limit,
    'feed',
  );

  const transfermarkt = transfers.cards.length
    ? { cards: [] as MercatoTransferCard[], status: makeStatus(transfermarktUrl, envText('REO_TRANSFERMARKT_BRIDGE_TOKEN')) }
    : await fetchBridge(
      'transfermarkt',
      transfermarktUrl,
      envText('REO_TRANSFERMARKT_BRIDGE_TOKEN'),
      view,
      limit,
      'transfermarkt',
    );

  let cards = [...transfers.cards, ...transfermarkt.cards];
  let responseMode: ResponseMode = cards.length ? 'bridge' : 'fallback';
  if (!cards.length) cards = MERCATO_FALLBACK_TRANSFERS;

  cards = filterCards(cards, query).slice(0, limit);
  const bridgeEnvConfigured = Boolean(transfersEnvUrl || transfermarktUrl);
  const bridgeConfigured = Boolean(transfersUrl || transfermarktUrl);
  const upstreamAttempted = transfers.status.attempted || transfermarkt.status.attempted;
  const upstreamStatus = transfers.status.status ?? transfermarkt.status.status;
  const bridgeTokenConfigured = Boolean(envText('REO_TRANSFERS_BRIDGE_TOKEN') || envText('REO_TRANSFERMARKT_BRIDGE_TOKEN'));

  return sendJson(res, 200, {
    ok: true,
    service: 'reo-mercato-details',
    view,
    responseMode,
    sourceMode: responseMode,
    source: responseMode === 'bridge' ? 'REO online mercato bridge' : 'REO fallback sample',
    fetchedAt: new Date().toISOString(),
    count: cards.length,
    bridgeConfigured,
    bridgeUrlConfigured: bridgeConfigured,
    bridgeUrlEnvConfigured: bridgeEnvConfigured,
    bridgeUrlDefaultUsed: !transfersEnvUrl,
    bridgeTokenConfigured,
    upstreamAttempted,
    upstreamStatus,
    auth: {
      required: bridgeTokenConfigured,
      provided: bridgeTokenConfigured,
      valid: !bridgeTokenConfigured || responseMode === 'bridge',
    },
    sources: {
      fotmob: transfers.status,
      transfermarkt: transfermarkt.status,
    },
    warnings: [
      ...(!transfersEnvUrl ? ['Using default REO Cloud Run mercato bridge because REO_TRANSFERS_BRIDGE_URL is not configured.'] : []),
      ...(bridgeConfigured && responseMode === 'fallback' ? ['Configured mercato bridge returned no usable transfer cards.'] : []),
    ],
    transfers: cards,
  });
}
