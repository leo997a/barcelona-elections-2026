import { useCallback, useRef, useState } from 'react';
import { OverlayConfig, OverlayField, OverlayType } from '../../types';
import {
  MERCATO_FALLBACK_TRANSFERS,
  type MercatoSourceItem,
} from './mercatoFallbackData';

export type BridgeView = 'fee' | 'latest' | 'probability' | 'medical' | 'sources';
export type RefreshState = 'idle' | 'loading' | 'success' | 'error';
export type UnifiedCard = Record<string, unknown>;

export interface TemplateDataApi {
  state: RefreshState;
  lastUpdated: number | null;
  error: string | null;
  refresh: (view?: BridgeView) => Promise<void>;
}

const MISSING = new Set(['missing', 'pending', '', null, undefined]);

const MERCATO_DATA_TYPES = new Set<OverlayType>([
  OverlayType.MERCATO_LIVE_CARD,
  OverlayType.MERCATO_UNIFIED,
  OverlayType.MERCATO_MEDIA_STORY,
  OverlayType.MERCATO_AGENT_CALL,
  OverlayType.MERCATO_DEAL_TIMELINE,
  OverlayType.MERCATO_BUDGET_TRACKER,
  OverlayType.MERCATO_DEADLINE_DAY,
  OverlayType.MERCATO_X_RAY,
  OverlayType.TRANSFER_NEWS,
  OverlayType.TRANSFER_TARGETS,
  OverlayType.BREAKING_HERE_WE_GO,
]);

const COMMON_DATA_FIELD_IDS = new Set([
  'playerName',
  'playerImage',
  'fromClub',
  'toClub',
  'fromLogo',
  'toLogo',
  'clubFrom',
  'clubTo',
  'dealValue',
  'fee',
  'marketValue',
  'position',
  'date',
  'sourceText',
  'sources',
  'chatLines',
  'probability',
  'confidencePct',
  'riskLevel',
  'dealStage',
  'dealStatus',
  'clauseTitle',
  'clauseBody',
  'clauseValue',
  'medicalStage',
  'hijackClub',
  'salary',
  'contractYears',
  'agentFee',
  'termsStatus',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function unwrap(value: unknown): unknown {
  const record = asRecord(value);
  if (record && 'value' in record) return record.value;
  return value;
}

function readPath(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    const record = asRecord(cur);
    if (!record || !(key in record)) return undefined;
    cur = record[key];
  }
  return unwrap(cur);
}

function readAny(card: UnifiedCard, paths: string[]): unknown {
  for (const path of paths) {
    const value = readPath(card, path);
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && MISSING.has(value.trim())) continue;
    return value;
  }
  return undefined;
}

function asText(card: UnifiedCard, paths: string[]): string | undefined {
  const value = readAny(card, paths);
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const text = String(value).trim();
  return MISSING.has(text) ? undefined : text;
}

function asNumber(card: UnifiedCard, paths: string[]): number | undefined {
  const value = readAny(card, paths);
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asArray<T = unknown>(card: UnifiedCard, paths: string[]): T[] | undefined {
  const value = readAny(card, paths);
  return Array.isArray(value) ? value as T[] : undefined;
}

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return !MISSING.has(value.trim());
  return true;
}

function normalizeCards(payload: unknown): UnifiedCard[] {
  if (Array.isArray(payload)) return payload.filter(Boolean).map(item => item as UnifiedCard);
  const record = asRecord(payload);
  if (!record) return MERCATO_FALLBACK_TRANSFERS as unknown as UnifiedCard[];

  const candidates = [
    record.transfers,
    record.cards,
    record.items,
    record.data,
    record.payload,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(Boolean).map(item => item as UnifiedCard);
    const nested = asRecord(candidate);
    if (nested && Array.isArray(nested.transfers)) return nested.transfers.filter(Boolean).map(item => item as UnifiedCard);
  }

  if ('name' in record || 'playerName' in record || 'fromClub' in record || 'toClub' in record) {
    return [record as UnifiedCard];
  }

  return MERCATO_FALLBACK_TRANSFERS as unknown as UnifiedCard[];
}

function addQuery(url: string, params: Record<string, string>): string {
  try {
    const isRelative = url.startsWith('/');
    const parsed = new URL(url, window.location.origin);
    for (const [key, value] of Object.entries(params)) {
      if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
    }
    return isRelative ? `${parsed.pathname}${parsed.search}` : parsed.toString();
  } catch {
    return url;
  }
}

function isLocalBridgeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1';
  } catch {
    return false;
  }
}

function bridgeUrl(config: OverlayConfig, view: BridgeView): string {
  const rawField = config.fields.find(field => field.id === 'bridgeApiUrl')?.value;
  const raw = typeof rawField === 'string' ? rawField.trim() : '';
  const params = { view, limit: '6' };

  if (!raw) return addQuery('/api/mercato', params);
  if (raw.startsWith('/api/mercato')) return addQuery(raw, params);
  if (raw.startsWith('/api/feed')) return addQuery('/api/mercato', params);
  if (isLocalBridgeUrl(raw)) return addQuery('/api/mercato', params);

  try {
    const parsed = new URL(raw);
    if (!/\/api\/(feed|mercato|transfermarkt)\b/.test(parsed.pathname)) {
      parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/api/feed`;
    }
    return addQuery(parsed.toString(), params);
  } catch {
    return addQuery('/api/mercato', params);
  }
}

function templateKey(config: OverlayConfig): string {
  const variant = config.fields.find(field => field.id === 'mercatoVariant')?.value;
  return String(variant || config.templateId || config.id || config.type);
}

export function isMercatoDataTemplate(config: OverlayConfig): boolean {
  return MERCATO_DATA_TYPES.has(config.type)
    || String(config.templateGroup || '').startsWith('MERCATO')
    || String(config.templateId || config.id || '').includes('mercato');
}

function fieldIdSet(config: OverlayConfig): Set<string> {
  return new Set((config.fields || []).map(field => field.id));
}

function createUpdater(config: OverlayConfig) {
  const ids = fieldIdSet(config);
  const updates: Partial<Record<string, OverlayField['value']>> = {};

  const set = (id: string, value: unknown, forceKnown = false) => {
    if (!isNonEmpty(value)) return;
    if (!ids.has(id) && !COMMON_DATA_FIELD_IDS.has(id) && !forceKnown) return;
    updates[id] = value as OverlayField['value'];
  };

  const setJson = (id: string, value: unknown) => {
    if (!isNonEmpty(value)) return;
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    set(id, text);
  };

  return { updates, set, setJson, has: (id: string) => ids.has(id) };
}

function dealHeadline(card: UnifiedCard): string | undefined {
  const player = asText(card, ['name.value', 'name', 'playerName.value', 'playerName']);
  const from = asText(card, ['fromClub.value', 'fromClub', 'clubFrom.value', 'clubFrom']);
  const to = asText(card, ['toClub.value', 'toClub', 'clubTo.value', 'clubTo']);
  const fee = asText(card, ['fee.value', 'fee', 'feeLabel.value', 'feeLabel']);
  if (!player) return undefined;
  const route = from && to ? `${from} -> ${to}` : to || from || '';
  return [player, route, fee].filter(Boolean).join(' | ');
}

function applySingleDeal(config: OverlayConfig, card: UnifiedCard) {
  const u = createUpdater(config);
  const player = asText(card, ['name.value', 'name', 'playerName.value', 'playerName']);
  const image = asText(card, ['playerImage.value', 'playerImage', 'image.value', 'image', 'photo.value', 'photo']);
  const from = asText(card, ['fromClub.value', 'fromClub', 'clubFrom.value', 'clubFrom', 'currentClub.value', 'currentClub']);
  const to = asText(card, ['toClub.value', 'toClub', 'clubTo.value', 'clubTo', 'expectedClub.value', 'expectedClub']);
  const fromLogo = asText(card, ['fromLogo.value', 'fromLogo', 'clubFromLogo.value', 'clubFromLogo']);
  const toLogo = asText(card, ['toLogo.value', 'toLogo', 'clubToLogo.value', 'clubToLogo']);
  const fee = asText(card, ['fee.value', 'fee', 'feeLabel.value', 'feeLabel', 'dealValue.value', 'dealValue']);
  const market = asText(card, ['marketValue.value', 'marketValue', 'marketValueLabel.value', 'marketValueLabel']);
  const position = asText(card, ['position.value', 'position']);
  const date = asText(card, ['date.value', 'date']);
  const status = asText(card, ['status.value', 'status', 'transferType.value', 'transferType']);
  const source = asText(card, ['primarySource.value', 'primarySource', 'sourceText.value', 'sourceText']);
  const probability = asNumber(card, ['probability.value', 'probability', 'confidencePct.value', 'confidencePct']);

  u.set('playerName', player);
  u.set('playerImage', image);
  u.set('fromClub', from);
  u.set('clubFrom', from);
  u.set('toClub', to);
  u.set('clubTo', to);
  u.set('fromLogo', fromLogo);
  u.set('toLogo', toLogo);
  u.set('fee', fee);
  u.set('dealValue', fee);
  u.set('marketValue', market);
  u.set('position', position);
  u.set('date', date);
  u.set('sourceText', source);
  u.set('dealStatus', status);
  u.set('dealStage', status);
  u.set('termsStatus', status);
  u.set('confidencePct', probability);
  u.set('probability', probability);
  u.set('dealHeadline', dealHeadline(card));

  const sources = asArray<MercatoSourceItem>(card, ['sources.value', 'sources', '_sources']);
  if (sources?.length) u.setJson('sources', sources);

  const chatLines = asArray(card, ['chatLines.value', 'chatLines']);
  if (chatLines?.length) u.setJson('chatLines', chatLines);

  u.set('clauseTitle', asText(card, ['clauseTitle.value', 'clauseTitle']));
  u.set('clauseBody', asText(card, ['clauseBody.value', 'clauseBody']));
  u.set('clauseValue', asText(card, ['clauseValue.value', 'clauseValue']) || fee);
  u.set('medicalStage', asText(card, ['medicalStage.value', 'medicalStage']));
  u.set('riskLevel', asText(card, ['riskLevel.value', 'riskLevel']));
  u.set('hijackClub', asText(card, ['hijackClub.value', 'hijackClub']));
  u.set('salary', asText(card, ['salary.value', 'salary']));
  u.set('contractYears', asText(card, ['contractYears.value', 'contractYears']));
  u.set('agentFee', asText(card, ['agentFee.value', 'agentFee']));

  return u.updates;
}

function applyMultiDeal(config: OverlayConfig, cards: UnifiedCard[], max = 6) {
  const u = createUpdater(config);

  cards.slice(0, max).forEach((card, index) => {
    const idx = index + 1;
    const player = asText(card, ['name.value', 'name', 'playerName.value', 'playerName']);
    const from = asText(card, ['fromClub.value', 'fromClub', 'clubFrom.value', 'clubFrom']);
    const to = asText(card, ['toClub.value', 'toClub', 'clubTo.value', 'clubTo']);
    const image = asText(card, ['playerImage.value', 'playerImage', 'image.value', 'image']);
    const fromLogo = asText(card, ['fromLogo.value', 'fromLogo']);
    const toLogo = asText(card, ['toLogo.value', 'toLogo']);
    const fee = asText(card, ['fee.value', 'fee', 'dealValue.value', 'dealValue']);
    const status = asText(card, ['status.value', 'status']);
    const source = asText(card, ['primarySource.value', 'primarySource', 'sourceText.value', 'sourceText']);
    const probability = asNumber(card, ['probability.value', 'probability', 'confidencePct.value', 'confidencePct']);
    const oldProbability = asNumber(card, ['oldProbability.value', 'oldProbability']);

    u.set(`deal${idx}Player`, player, true);
    u.set(`deal${idx}From`, from, true);
    u.set(`deal${idx}To`, to, true);
    u.set(`deal${idx}Image`, image, true);
    u.set(`deal${idx}FromLogo`, fromLogo, true);
    u.set(`deal${idx}ToLogo`, toLogo, true);
    u.set(`deal${idx}Fee`, fee, true);
    u.set(`deal${idx}Status`, status, true);
    u.set(`deal${idx}Source`, source, true);
    u.set(`deal${idx}NewPct`, probability, true);
    u.set(`deal${idx}OldPct`, oldProbability, true);
  });

  const updateDate = new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  u.set('updateDate', updateDate);
  return u.updates;
}

export function buildMercatoTemplateUpdates(
  config: OverlayConfig,
  cards: UnifiedCard[],
): Partial<Record<string, OverlayField['value']>> {
  if (!isMercatoDataTemplate(config)) return {};
  const normalized = cards.length ? cards : MERCATO_FALLBACK_TRANSFERS as unknown as UnifiedCard[];
  const primary = normalized[0] || {};
  const key = templateKey(config);

  if (key.includes('probability_shift') || key.includes('global_probability_shift')) {
    return { ...applySingleDeal(config, primary), ...applyMultiDeal(config, normalized, key.includes('global') ? 6 : 4) };
  }

  return applySingleDeal(config, primary);
}

export function useTemplateData(
  config: OverlayConfig,
  onFieldsUpdate: (updates: Partial<Record<string, OverlayField['value']>>) => void,
): TemplateDataApi {
  const [state, setState] = useState<RefreshState>('idle');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const refresh = useCallback(async (view: BridgeView = 'fee') => {
    if (!isMercatoDataTemplate(config)) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState('loading');
    setError(null);
    try {
      const response = await fetch(bridgeUrl(config, view), {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const cards = normalizeCards(payload);
      const updates = buildMercatoTemplateUpdates(config, cards);
      if (Object.keys(updates).length) onFieldsUpdate(updates);
      setState('success');
      setLastUpdated(Date.now());
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'unknown');
    } finally {
      loadingRef.current = false;
    }
  }, [config, onFieldsUpdate]);

  return { state, lastUpdated, error, refresh };
}
