/**
 * FotMob → Broadcast Profile Builder (TypeScript)
 *
 * TypeScript port of build_fotmob_mega_profile.py + build_player_intel_master_profile.py
 * specifically for the broadcast.json shape consumed by PlayerIntelV2Renderer.
 *
 * NO DATA FABRICATION:
 *  - Skips null/undefined/empty values
 *  - Never invents numbers via AI or guesses
 *  - Records "not_available" only in qualityReport, never in broadcast cards
 */

import { PLAYER_IMAGE_URL, TEAM_LOGO_URL, type FotMobPlayerData } from './fotmobClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastCardItem {
  key: string;
  label: string;
  labelAr: string | null;
  value: string | number;
  source: string;
  category?: string;
  per90?: number | null;
  percentileRank?: number | null;
}

export interface BroadcastCard {
  title: string;
  items: BroadcastCardItem[];
  itemsCount: number;
}

export interface BroadcastProfile {
  schemaVersion: 'player-intel-master-v1';
  generatedAt: string;
  source: 'fotmob';
  player: {
    name: string;
    club: string;
    season: string;
    position: string;
  };
  identity: {
    name: string;
    fotmobId: number;
    fotmobClub: string | null;
    fotmobPosition: string | null;
  };
  sourceCoverage: { fotmob: boolean; fbref: boolean };
  broadcastCards: Record<string, BroadcastCard>;
  canonicalMetrics: Record<string, { primaryValue: unknown; primarySource: string; label: string; category: string }>;
  qualityReport: {
    fotmobMetricsCount: number;
    fbrefRawColumnsCount: number;
    mergedMetricsCount: number;
    canonicalMetricsCount: number;
    broadcastCardsCount: number;
    broadcastCardsItemTotal: number;
    warnings: string[];
    sourceConflicts: unknown[];
    fbrefGroupsMatched: string[];
    fbrefGroupsMissingPlayer: string[];
  };
  images: { playerImage: string; teamLogo: string | null };
  mainLeague?: { leagueId?: number; leagueName?: string; season?: string; stats?: Array<{ title?: string; value?: unknown; localizedTitleId?: string }> };
}

// ─── Arabic label map (subset — full list in playerIntelV2Labels.ts) ─────────

const AR_LABELS: Record<string, string> = {
  goals: 'الأهداف',
  assists: 'التمريرات الحاسمة',
  xg: 'الأهداف المتوقعة',
  expected_goals: 'الأهداف المتوقعة',
  xa: 'التمريرات المتوقعة',
  expected_assists: 'التمريرات المتوقعة',
  shots: 'التسديدات',
  shots_on_target: 'على المرمى',
  ShotsOnTarget: 'على المرمى',
  rating: 'التقييم',
  minutes: 'الدقائق',
  minutes_played: 'الدقائق',
  matches: 'المباريات',
  appearances: 'المشاركات',
  starts: 'بدأ أساسيًا',
  yellow_cards: 'بطاقات صفراء',
  red_cards: 'بطاقات حمراء',
  fouls_committed: 'أخطاء',
  fouls_drawn: 'أخطاء عليه',
  offsides: 'تسلل',
  chances_created: 'فرص مصنوعة',
  big_chances_created: 'فرص كبيرة مصنوعة',
  accurate_passes: 'تمريرات دقيقة',
  passes_completed: 'تمريرات منتهية',
  key_passes: 'تمريرات مفتاحية',
  progressive_passes: 'تمريرات تقدمية',
  crosses: 'عرضيات',
  dribbles: 'مراوغات',
  dribbles_succeeded: 'مراوغات ناجحة',
  duels_won: 'مبارزات فائزة',
  aerial_duels_won: 'مبارزات هوائية',
  tackles: 'افتكاكات',
  interceptions: 'اعتراضات',
  blocks: 'صدّات',
  clearances: 'تشتيتات',
  defensive_actions: 'تدخلات دفاعية',
  saves: 'تصديات',
  clean_sheets: 'شِباك نظيفة',
  goals_conceded: 'أهداف عليه',
  shot_creating_actions: 'صناعة تسديدات',
  goal_creating_actions: 'صناعة أهداف',
  touches: 'اللمسات',
  progressive_carries: 'حمل تقدمي',
  market_currentValue: 'القيمة الحالية',
  market_highestValue: 'أعلى قيمة',
  market_lowestValue: 'أدنى قيمة',
  market_firstValue: 'أول قيمة',
  market_growthFromFirstPercent: 'نمو القيمة',
};

function _arLabel(key: string, fallback?: string): string | null {
  const lower = key.toLowerCase().replace(/^fotmob_/, '');
  if (AR_LABELS[lower]) return AR_LABELS[lower];
  if (AR_LABELS[key]) return AR_LABELS[key];
  for (const [pat, ar] of Object.entries(AR_LABELS)) {
    if (lower.includes(pat.toLowerCase())) return ar;
  }
  return fallback || null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const _isPresent = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== '' && !(typeof v === 'string' && v.toLowerCase() === 'matches');

const _toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const _safe = (obj: unknown, ...keys: string[]): unknown => {
  let cur = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
};

const _slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'player';

// ─── FotMob raw → flat metrics map ────────────────────────────────────────────

interface FlatMetric {
  key: string;
  label: string;
  value: unknown;
  category: string;
  per90?: number | null;
  percentileRank?: number | null;
  raw?: unknown;
}

function _extractFlatMetrics(raw: Record<string, unknown>): FlatMetric[] {
  const out: FlatMetric[] = [];

  // mainLeague.stats
  const ml = raw.mainLeague as Record<string, unknown> | undefined;
  const mlStats = ml?.stats as Array<{ title?: string; value?: unknown; localizedTitleId?: string }> | undefined;
  if (Array.isArray(mlStats)) {
    for (const s of mlStats) {
      const key = s.localizedTitleId || s.title;
      if (!key || !_isPresent(s.value)) continue;
      out.push({
        key: `main_league_${key}`,
        label: s.title || key,
        value: s.value,
        category: 'mainLeague',
        raw: s,
      });
    }
  }

  // firstSeasonStats.topStatCard.items
  const fss = raw.firstSeasonStats as Record<string, unknown> | undefined;
  const tsc = fss?.topStatCard as { items?: Array<{ localizedTitleId?: string; title?: string; statValue?: unknown; per90?: number; percentileRank?: number; statFormat?: string }> } | undefined;
  if (tsc?.items && Array.isArray(tsc.items)) {
    for (const it of tsc.items) {
      const key = it.localizedTitleId || it.title;
      if (!key || !_isPresent(it.statValue)) continue;
      out.push({
        key: `top_${key}`,
        label: it.title || key,
        value: it.statValue,
        category: 'seasonTop',
        per90: typeof it.per90 === 'number' ? it.per90 : null,
        percentileRank: typeof it.percentileRank === 'number' ? it.percentileRank : null,
        raw: it,
      });
    }
  }

  // statsSection.items[*].items
  const ss = fss?.statsSection as { items?: Array<{ title?: string; localizedTitleId?: string; items?: Array<{ localizedTitleId?: string; title?: string; statValue?: unknown; per90?: number; percentileRank?: number }> }> } | undefined;
  if (ss?.items && Array.isArray(ss.items)) {
    for (const sub of ss.items) {
      const sectionKey = (sub.localizedTitleId || sub.title || 'unknown').toLowerCase().replace(/\s+/g, '_');
      for (const m of (sub.items || [])) {
        const mkey = m.localizedTitleId || m.title;
        if (!mkey || !_isPresent(m.statValue)) continue;
        out.push({
          key: `${sectionKey}_${mkey}`,
          label: m.title || mkey,
          value: m.statValue,
          category: sectionKey,
          per90: typeof m.per90 === 'number' ? m.per90 : null,
          percentileRank: typeof m.percentileRank === 'number' ? m.percentileRank : null,
          raw: m,
        });
      }
    }
  }

  // recentMatches aggregates
  const recent = raw.recentMatches as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(recent) && recent.length > 0) {
    const goalsRecent = recent.reduce((s, m) => s + (_toNum(m.goals) || 0), 0);
    const assistsRecent = recent.reduce((s, m) => s + (_toNum(m.assists) || 0), 0);
    const minutesRecent = recent.reduce((s, m) => s + (_toNum(m.minutesPlayed) || 0), 0);
    const ratings = recent.map((m) => _toNum(_safe(m, 'ratingProps', 'rating'))).filter((r): r is number => r !== null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const potm = recent.filter((m) => m.playerOfTheMatch).length;
    const yellows = recent.reduce((s, m) => s + (_toNum(m.yellowCards) || 0), 0);
    const reds = recent.reduce((s, m) => s + (_toNum(m.redCards) || 0), 0);

    out.push({ key: 'recent_matches_count', label: 'Recent matches count', value: recent.length, category: 'fotmob' });
    if (goalsRecent > 0) out.push({ key: 'recent_goals', label: 'Recent goals', value: goalsRecent, category: 'fotmob' });
    if (assistsRecent > 0) out.push({ key: 'recent_assists', label: 'Recent assists', value: assistsRecent, category: 'fotmob' });
    if (minutesRecent > 0) out.push({ key: 'recent_minutes', label: 'Recent minutes', value: minutesRecent, category: 'fotmob' });
    if (avgRating !== null) out.push({ key: 'recent_avg_rating', label: 'Recent avg rating', value: Number(avgRating.toFixed(2)), category: 'fotmob' });
    if (potm > 0) out.push({ key: 'recent_player_of_match_count', label: 'Recent POTM', value: potm, category: 'fotmob' });
    if (yellows > 0) out.push({ key: 'recent_yellow_cards', label: 'Recent yellow cards', value: yellows, category: 'fotmob' });
    if (reds > 0) out.push({ key: 'recent_red_cards', label: 'Recent red cards', value: reds, category: 'fotmob' });
  }

  // marketValues summary
  const mv = raw.marketValues as { values?: Array<{ value?: number; date?: string; currency?: string }> } | undefined;
  if (mv?.values && Array.isArray(mv.values) && mv.values.length > 0) {
    const values = mv.values.map((v) => _toNum(v.value)).filter((v): v is number => v !== null);
    if (values.length > 0) {
      const first = mv.values[0];
      const last = mv.values[mv.values.length - 1];
      const firstV = _toNum(first.value);
      const lastV = _toNum(last.value);
      if (lastV !== null) out.push({ key: 'market_currentValue', label: 'Current market value', value: lastV, category: 'marketValue' });
      const high = Math.max(...values);
      const low = Math.min(...values);
      if (high !== lastV) out.push({ key: 'market_highestValue', label: 'Highest value', value: high, category: 'marketValue' });
      if (low !== lastV) out.push({ key: 'market_lowestValue', label: 'Lowest value', value: low, category: 'marketValue' });
      if (firstV !== null && firstV !== lastV) {
        out.push({ key: 'market_firstValue', label: 'First value', value: firstV, category: 'marketValue' });
        if (firstV > 0 && lastV !== null) {
          const growth = ((lastV - firstV) / firstV) * 100;
          out.push({ key: 'market_growthFromFirstPercent', label: 'Growth %', value: Number(growth.toFixed(2)), category: 'marketValue' });
        }
      }
    }
  }

  return out;
}

// ─── Card definitions ─────────────────────────────────────────────────────────

const CARD_DEFINITIONS: Record<string, { titleAr: string; metrics: string[]; fotmobExtras: string[] }> = {
  attacker: {
    titleAr: 'بطاقة هجومية',
    metrics: ['goals', 'assists', 'xg', 'shots', 'shots_on_target', 'rating'],
    fotmobExtras: ['fotmob_recent_goals', 'fotmob_recent_avg_rating'],
  },
  playmaker: {
    titleAr: 'صانع لعب',
    metrics: ['assists', 'xa', 'key_passes', 'shot_creating_actions'],
    fotmobExtras: ['fotmob_passing_chances_created', 'fotmob_passing_accurate_passes'],
  },
  winger: {
    titleAr: 'جناح',
    metrics: ['assists', 'crosses', 'progressive_carries', 'shot_creating_actions'],
    fotmobExtras: ['fotmob_possession_dribbles_succeeded', 'fotmob_possession_dribbles', 'fotmob_possession_touches'],
  },
  defender: {
    titleAr: 'مدافع',
    metrics: ['tackles', 'tackles_won', 'interceptions', 'blocks'],
    fotmobExtras: ['fotmob_defending_defensive_actions', 'fotmob_defending_aerial_duels_won', 'fotmob_defending_clearances'],
  },
  complete_report: {
    titleAr: 'تقرير كامل',
    metrics: ['goals', 'assists', 'matches', 'minutes', 'rating', 'yellow_cards', 'red_cards', 'shots', 'tackles', 'interceptions'],
    fotmobExtras: [],
  },
  form_report: {
    titleAr: 'تقرير الفورمة',
    metrics: [],
    fotmobExtras: ['fotmob_recent_matches_count', 'fotmob_recent_goals', 'fotmob_recent_assists', 'fotmob_recent_minutes', 'fotmob_recent_avg_rating', 'fotmob_recent_player_of_match_count', 'fotmob_recent_yellow_cards', 'fotmob_recent_red_cards'],
  },
  market_report: {
    titleAr: 'تقرير السوق',
    metrics: [],
    fotmobExtras: ['fotmob_market_currentValue', 'fotmob_market_highestValue', 'fotmob_market_lowestValue', 'fotmob_market_firstValue', 'fotmob_market_growthFromFirstPercent'],
  },
  season_report: {
    titleAr: 'تقرير الموسم',
    metrics: ['goals', 'assists', 'matches', 'minutes', 'rating', 'shots_on_target', 'tackles', 'interceptions', 'touches'],
    fotmobExtras: ['fotmob_recent_matches_count'],
  },
};

// ─── Canonical merger (FotMob keys → canonical name) ─────────────────────────

const CANONICAL_FROM_FOTMOB: Record<string, string[]> = {
  goals: ['main_league_goals', 'top_goals', 'shooting_goals'],
  assists: ['main_league_assists', 'top_assists', 'passing_assists'],
  matches: ['main_league_matches'],
  minutes: ['main_league_minutes_played'],
  rating: ['main_league_rating', 'top_rating'],
  yellow_cards: ['main_league_yellow_cards', 'discipline_yellow_cards'],
  red_cards: ['main_league_red_cards', 'discipline_red_cards'],
  shots: ['shooting_shots'],
  shots_on_target: ['shooting_ShotsOnTarget', 'shooting_shots_on_target'],
  xg: ['shooting_expected_goals', 'top_expected_goals'],
  xa: ['passing_expected_assists', 'top_expected_assists'],
  key_passes: ['passing_chances_created', 'passing_big_chances_created'],
  tackles: ['defending_tackles'],
  interceptions: ['defending_interceptions'],
  touches: ['possession_touches'],
  blocks: ['defending_blocks'],
  shot_creating_actions: [],
  goal_creating_actions: [],
  progressive_carries: [],
  crosses: [],
};

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildBroadcastFromFotMob(
  player: FotMobPlayerData,
  season: string,
): { profile: BroadcastProfile; slug: string } {
  const raw = player.raw;
  const flat = _extractFlatMetrics(raw);

  // Index flat metrics by key
  const flatMap = new Map<string, FlatMetric>();
  for (const m of flat) flatMap.set(m.key, m);

  // Build canonical metrics
  const canonical: BroadcastProfile['canonicalMetrics'] = {};
  for (const [canon, candidates] of Object.entries(CANONICAL_FROM_FOTMOB)) {
    for (const c of candidates) {
      const m = flatMap.get(c);
      if (m && _isPresent(m.value)) {
        canonical[canon] = {
          primaryValue: m.value,
          primarySource: 'fotmob',
          label: m.label,
          category: m.category,
        };
        break;
      }
    }
  }

  // Build broadcast cards
  const cards: Record<string, BroadcastCard> = {};
  for (const [cardKey, def] of Object.entries(CARD_DEFINITIONS)) {
    const items: BroadcastCardItem[] = [];

    // Canonical metrics
    for (const mkey of def.metrics) {
      const c = canonical[mkey];
      if (c && _isPresent(c.primaryValue)) {
        items.push({
          key: mkey,
          label: c.label,
          labelAr: _arLabel(mkey, c.label),
          value: c.primaryValue as string | number,
          source: c.primarySource,
          category: c.category,
        });
      }
    }

    // FotMob extras (granular flat metrics)
    for (const ek of def.fotmobExtras) {
      const stripped = ek.replace(/^fotmob_/, '');
      const m = flatMap.get(stripped);
      if (m && _isPresent(m.value)) {
        items.push({
          key: ek,
          label: m.label,
          labelAr: _arLabel(ek, m.label),
          value: m.value as string | number,
          source: 'fotmob',
          category: m.category,
          per90: m.per90,
          percentileRank: m.percentileRank,
        });
      }
    }

    cards[cardKey] = {
      title: def.titleAr,
      items,
      itemsCount: items.length,
    };
  }

  // Identity
  const playerName = String(raw.name || '');
  const primaryTeam = raw.primaryTeam as { teamId?: number; teamName?: string } | undefined;
  const positionDesc = raw.positionDescription as { primaryPosition?: { label?: string; key?: string } } | undefined;
  const club = primaryTeam?.teamName || '';
  const position = positionDesc?.primaryPosition?.label || '';

  // mainLeague summary
  const mlObj = raw.mainLeague as Record<string, unknown> | undefined;

  const itemTotal = Object.values(cards).reduce((s, c) => s + c.itemsCount, 0);

  const profile: BroadcastProfile = {
    schemaVersion: 'player-intel-master-v1',
    generatedAt: new Date().toISOString(),
    source: 'fotmob',
    player: { name: playerName, club, season, position },
    identity: {
      name: playerName,
      fotmobId: player.id,
      fotmobClub: club || null,
      fotmobPosition: position || null,
    },
    sourceCoverage: { fotmob: true, fbref: false },
    broadcastCards: cards,
    canonicalMetrics: canonical,
    qualityReport: {
      fotmobMetricsCount: flat.length,
      fbrefRawColumnsCount: 0,
      mergedMetricsCount: flat.length + Object.keys(canonical).length,
      canonicalMetricsCount: Object.keys(canonical).length,
      broadcastCardsCount: Object.keys(cards).length,
      broadcastCardsItemTotal: itemTotal,
      warnings: flat.length < 30 ? ['LOW_FOTMOB_METRIC_COUNT'] : [],
      sourceConflicts: [],
      fbrefGroupsMatched: [],
      fbrefGroupsMissingPlayer: ['standard', 'shooting', 'passing', 'pass_types', 'gca', 'defense', 'possession', 'playing_time', 'misc', 'keeper'],
    },
    images: {
      playerImage: PLAYER_IMAGE_URL(player.id),
      teamLogo: primaryTeam?.teamId ? TEAM_LOGO_URL(primaryTeam.teamId) : null,
    },
    mainLeague: mlObj
      ? {
          leagueId: mlObj.leagueId as number | undefined,
          leagueName: mlObj.leagueName as string | undefined,
          season: mlObj.season as string | undefined,
          stats: (mlObj.stats as Array<{ title?: string; value?: unknown; localizedTitleId?: string }> | undefined)?.filter((s) => _isPresent(s.value)),
        }
      : undefined,
  };

  const slug = _slugify(playerName) + '-' + player.id;
  return { profile, slug };
}
