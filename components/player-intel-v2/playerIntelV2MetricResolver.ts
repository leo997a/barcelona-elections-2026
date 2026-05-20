/**
 * Player Intel V2 — Metric Resolver
 *
 * Reads a master JSON (full or summary) + cardType and returns structured
 * metrics ready for the broadcast renderer. Tolerant: skips nulls, missing
 * sections, and unavailable metrics without crashing.
 */

import type {
  PlayerIntelBroadcastCardItem,
  PlayerIntelBroadcastCards,
  PlayerIntelMasterFull,
  PlayerIntelMasterSummary,
  PlayerIntelTopCard,
} from './playerIntelV2Types';
import { CARD_AR_TITLES } from './playerIntelV2Labels';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardType =
  | 'attacker_card'
  | 'playmaker_card'
  | 'winger_card'
  | 'defender_card'
  | 'form_report'
  | 'market_report'
  | 'season_report'
  | 'complete_report';

export interface ResolvedMetric {
  key: string;
  label: string;
  labelAr: string | null;
  value: unknown;
  formattedValue: string;
  source: string;
  category: string;
  rank: number | null;
  per90: number | null;
}

export interface ResolvedData {
  heroMetrics: ResolvedMetric[];
  secondaryMetrics: ResolvedMetric[];
  meta: {
    player: string;
    club: string;
    season: string;
    position: string;
    imageUrl: string | null;
    cardTitle: string;
    cardTitleAr: string;
  };
  sourceCoverage: {
    fotmob: boolean;
    fbref: boolean;
  };
  qualityWarnings: string[];
  isSummaryOnly: boolean;
}

// ─── Card key mapping ─────────────────────────────────────────────────────────

const CARD_TYPE_TO_KEY: Record<CardType, string> = {
  attacker_card: 'attacker',
  playmaker_card: 'playmaker',
  winger_card: 'winger',
  defender_card: 'defender',
  form_report: 'form_report',
  market_report: 'market_report',
  season_report: 'season_report',
  complete_report: 'complete_report',
};

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatMetricValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === '') return '';

  const numVal = typeof value === 'number' ? value : parseFloat(String(value));

  // Market value (large numbers in EUR)
  if (key && (key.includes('market') || key.includes('Value')) && !isNaN(numVal)) {
    if (numVal >= 1_000_000) return `€${(numVal / 1_000_000).toFixed(1)}m`;
    if (numVal >= 1_000) return `€${(numVal / 1_000).toFixed(0)}k`;
    return `€${numVal}`;
  }

  // Percentage
  if (key && (key.includes('pct') || key.includes('percent') || key.includes('rate'))) {
    if (!isNaN(numVal)) return `${numVal.toFixed(1)}%`;
  }

  // Per90
  if (key && key.includes('per90')) {
    if (!isNaN(numVal)) return `${numVal.toFixed(2)} /90`;
  }

  // Rating (1-10 scale)
  if (key && key.includes('rating')) {
    if (!isNaN(numVal)) return numVal.toFixed(2);
  }

  // Minutes (comma-separated)
  if (key && key.includes('minute')) {
    if (!isNaN(numVal) && numVal >= 100) return numVal.toLocaleString('en-US');
  }

  // Growth percent
  if (key && key.includes('growth')) {
    if (!isNaN(numVal)) return `${numVal > 0 ? '+' : ''}${numVal.toFixed(1)}%`;
  }

  // Generic number
  if (!isNaN(numVal)) {
    if (Number.isInteger(numVal)) return String(numVal);
    return numVal.toFixed(2);
  }

  return String(value);
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

function _resolveFromFull(
  full: PlayerIntelMasterFull,
  cardType: CardType,
  heroCount: number,
  secondaryCount: number,
): ResolvedData {
  const cards: PlayerIntelBroadcastCards | undefined = full.broadcastCards;
  const cardKey = CARD_TYPE_TO_KEY[cardType];
  const card = cards?.[cardKey];

  const items: PlayerIntelBroadcastCardItem[] = card?.items || [];

  const toResolved = (it: PlayerIntelBroadcastCardItem): ResolvedMetric | null => {
    if (it.value === null || it.value === undefined || it.value === '') return null;
    return {
      key: it.key,
      label: it.label || it.key,
      labelAr: it.labelAr || null,
      value: it.value,
      formattedValue: formatMetricValue(it.value, it.key),
      source: it.source || 'unknown',
      category: it.category || '',
      rank: typeof it.percentileRank === 'number' ? it.percentileRank : null,
      per90: typeof it.per90 === 'number' ? it.per90 : null,
    };
  };

  const resolved = items.map(toResolved).filter((m): m is ResolvedMetric => m !== null);
  const hero = resolved.slice(0, heroCount);
  const secondary = resolved.slice(heroCount, heroCount + secondaryCount);

  const player = full.player?.name || '';
  const club = full.player?.club || '';
  const season = full.player?.season || '';
  const position = full.player?.position || '';
  const imageUrl =
    (full.fotmob?.fullProfile as Record<string, unknown> | undefined)?.images
      ? ((full.fotmob?.fullProfile as Record<string, unknown>)?.images as Record<string, string>)?.playerImage || null
      : null;

  const qr = full.qualityReport;
  return {
    heroMetrics: hero,
    secondaryMetrics: secondary,
    meta: {
      player,
      club,
      season,
      position,
      imageUrl,
      cardTitle: card?.title || cardKey,
      cardTitleAr: CARD_AR_TITLES[cardKey] || card?.title || cardKey,
    },
    sourceCoverage: {
      fotmob: full.sourceCoverage?.fotmob ?? false,
      fbref: full.sourceCoverage?.fbref ?? false,
    },
    qualityWarnings: qr?.warnings || [],
    isSummaryOnly: false,
  };
}

function _resolveFromSummary(
  summary: PlayerIntelMasterSummary,
  cardType: CardType,
  heroCount: number,
): ResolvedData {
  // Summary doesn't have full card items — use topAvailableCards + mainLeague stats
  const cardKey = CARD_TYPE_TO_KEY[cardType];
  const topCards: PlayerIntelTopCard[] = summary.topAvailableCards || [];
  const matchedCard = topCards.find((c) => c.key === cardKey);

  // Build minimal metrics from summary.mainLeague.stats if available
  const mainStats = (summary as Record<string, unknown>).mainLeague as
    | { stats?: Array<{ title?: string; value?: unknown }> }
    | undefined;
  const statsArr = mainStats?.stats || [];

  const hero: ResolvedMetric[] = statsArr
    .filter((s) => s.value !== null && s.value !== undefined)
    .slice(0, heroCount)
    .map((s) => ({
      key: (s.title || '').toLowerCase().replace(/\s+/g, '_'),
      label: s.title || '',
      labelAr: null,
      value: s.value,
      formattedValue: formatMetricValue(s.value, (s.title || '').toLowerCase()),
      source: 'fotmob',
      category: 'mainLeague',
      rank: null,
      per90: null,
    }));

  return {
    heroMetrics: hero,
    secondaryMetrics: [],
    meta: {
      player: summary.player || '',
      club: summary.club || '',
      season: summary.season || '',
      position: summary.position || '',
      imageUrl: null,
      cardTitle: matchedCard?.title || cardKey,
      cardTitleAr: CARD_AR_TITLES[cardKey] || matchedCard?.title || cardKey,
    },
    sourceCoverage: {
      fotmob: summary.sources?.fotmob ?? false,
      fbref: summary.sources?.fbref ?? false,
    },
    qualityWarnings: summary.qualityWarnings || [],
    isSummaryOnly: true,
  };
}

/**
 * Main resolver entry point.
 *
 * Accepts either a full master JSON or a summary. Determines which mode
 * to use based on presence of `broadcastCards` key.
 */
export function resolveMetrics(
  data: PlayerIntelMasterFull | PlayerIntelMasterSummary | null,
  cardType: CardType,
  heroCount: number = 5,
  secondaryCount: number = 6,
): ResolvedData {
  if (!data) {
    return {
      heroMetrics: [],
      secondaryMetrics: [],
      meta: {
        player: '',
        club: '',
        season: '',
        position: '',
        imageUrl: null,
        cardTitle: cardType,
        cardTitleAr: CARD_AR_TITLES[CARD_TYPE_TO_KEY[cardType]] || cardType,
      },
      sourceCoverage: { fotmob: false, fbref: false },
      qualityWarnings: [],
      isSummaryOnly: true,
    };
  }

  // Detect full vs summary by checking for broadcastCards
  if ('broadcastCards' in data && (data as PlayerIntelMasterFull).broadcastCards) {
    return _resolveFromFull(data as PlayerIntelMasterFull, cardType, heroCount, secondaryCount);
  }

  return _resolveFromSummary(data as PlayerIntelMasterSummary, cardType, heroCount);
}
