/**
 * Player Intel V2 — TypeScript types for the Preview Lab.
 *
 * These match the master summary / master full JSON shape produced by:
 *   deploy/reo-datafabric/tools/build_player_intel_master_profile.py
 *
 * Everything is optional-safe — the lab tolerates partial data.
 */

export interface PlayerIntelSourceCoverage {
  fotmob?: boolean;
  fbref?: boolean;
  fbrefGroupsAvailable?: string[];
  fbrefGroupsMatched?: string[];
}

export interface PlayerIntelCounts {
  fotmobMetrics?: number;
  fbrefRawColumns?: number;
  canonicalMetrics?: number;
  mergedMetrics?: number;
  metricCatalog?: number;
  broadcastCards?: number;
  broadcastCardsItemTotal?: number;
}

export interface PlayerIntelTopCard {
  key: string;
  title?: string;
  itemsCount?: number;
}

export interface PlayerIntelSourceConflict {
  metric: string;
  fotmobValue?: number;
  fbrefValue?: number;
  diff?: number;
  diffPercent?: number;
}

export interface PlayerIntelPaths {
  fotmobMega?: string | null;
  fbrefDir?: string | null;
  fbrefGroupsLoaded?: string[];
}

/**
 * The compact ".master.summary.json" file (committed under public/player-intel-v2-samples).
 */
export interface PlayerIntelMasterSummary {
  schemaVersion?: string;
  generatedAt?: string;
  player?: string;
  club?: string;
  season?: string;
  position?: string;
  sources?: PlayerIntelSourceCoverage;
  counts?: PlayerIntelCounts;
  fbrefGroupsMatched?: string[];
  fbrefGroupsMissingPlayer?: string[];
  topAvailableCards?: PlayerIntelTopCard[];
  canonicalKeys?: string[];
  qualityWarnings?: string[];
  sourceConflicts?: PlayerIntelSourceConflict[];
  paths?: PlayerIntelPaths;
}

/**
 * Master sample index entry (public/player-intel-v2-samples/index.json).
 */
export interface PlayerIntelSampleEntry {
  slug: string;
  summaryFile: string;
  player?: string;
  club?: string;
  season?: string;
  position?: string;
  schemaVersion?: string;
  generatedAt?: string;
  metricsCount?: number;
  fotmobMetrics?: number;
  fbrefRawColumns?: number;
  broadcastCardsCount?: number;
  broadcastCardsItemTotal?: number;
  topAvailableCards?: PlayerIntelTopCard[];
  qualityWarnings?: string[];
  fbrefGroupsMatched?: string[];
  fbrefGroupsMissingPlayer?: string[];
  sources?: PlayerIntelSourceCoverage;
}

export interface PlayerIntelSamplesIndex {
  schemaVersion?: string;
  generatedAt?: string;
  playerCount?: number;
  players: PlayerIntelSampleEntry[];
}

/* ── Full master profile shapes (only populated when user pastes full JSON) ── */

export interface PlayerIntelMetricCatalogItem {
  key: string;
  label?: string | null;
  labelAr?: string | null;
  source?: string;
  category?: string;
  group?: string | null;
  available?: boolean;
  valueType?: string;
  recommendedFor?: string[];
}

export interface PlayerIntelBroadcastCardItem {
  key: string;
  label?: string | null;
  labelAr?: string | null;
  value?: unknown;
  source?: string;
  category?: string;
  per90?: number | null;
  percentileRank?: number | null;
}

export interface PlayerIntelBroadcastCard {
  title?: string;
  items: PlayerIntelBroadcastCardItem[];
  itemsCount?: number;
}

export type PlayerIntelBroadcastCards = Record<string, PlayerIntelBroadcastCard>;

export interface PlayerIntelMergedMetric {
  // Canonical merged metric (has primaryValue + sources):
  primaryValue?: unknown;
  primarySource?: string;
  label?: string;
  category?: string;
  sources?: Record<string, unknown>;
  // Or raw metric:
  value?: unknown;
  source?: string;
  sourceGroup?: string;
  rawColumn?: string;
  normalizedKey?: string;
  rawKey?: string;
  per90?: number | null;
  percentileRank?: number | null;
  confidence?: number;
}

export interface PlayerIntelQualityReport {
  fotmobMetricsCount?: number;
  fbrefGroupsAvailable?: string[];
  fbrefGroupsMatched?: string[];
  fbrefGroupsMissingPlayer?: string[];
  fbrefRawColumnsCount?: number;
  canonicalMetricsCount?: number;
  mergedMetricsCount?: number;
  metricCatalogCount?: number;
  broadcastCardsCount?: number;
  broadcastCardsItemTotal?: number;
  sourceConflicts?: PlayerIntelSourceConflict[];
  duplicateMetrics?: string[];
  warnings?: string[];
}

export interface PlayerIntelMasterFull {
  schemaVersion?: string;
  generatedAt?: string;
  player?: {
    name?: string;
    club?: string;
    season?: string;
    position?: string;
  };
  identity?: Record<string, unknown> & {
    fotmobId?: number;
    fotmobClub?: string;
    fotmobPosition?: string;
  };
  sourceCoverage?: PlayerIntelSourceCoverage;
  sourceFiles?: PlayerIntelPaths;
  fotmob?: {
    fullProfile?: Record<string, unknown> & {
      images?: { playerImage?: string; teamLogo?: string };
    };
  };
  metricCatalog?: Record<string, PlayerIntelMetricCatalogItem>;
  mergedMetrics?: Record<string, PlayerIntelMergedMetric>;
  canonicalMetrics?: Record<string, PlayerIntelMergedMetric>;
  broadcastCards?: PlayerIntelBroadcastCards;
  qualityReport?: PlayerIntelQualityReport;
}

/* ── Preview lab UI state ─────────────────────────────────────────────────── */

export type PreviewSource =
  | { kind: 'sample'; slug: string }
  | { kind: 'pasted' };

export interface PlayerIntelPreviewState {
  selectedSlug: string | null;
  pastedFull: PlayerIntelMasterFull | null;
  searchQuery: string;
  expandedCardKey: string | null;
  pasteError: string | null;
}
