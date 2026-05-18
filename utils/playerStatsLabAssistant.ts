/**
 * Player Stats Lab — deterministic Arabic/English assistant + coverage helpers.
 *
 * This module is UI-only. It does NOT call any external AI service, the bridge,
 * or the API. It performs a tiny rule-based parse of natural-language input
 * (Arabic + English) and returns a suggested preset, mode, and metric list.
 *
 * It also exposes the metric-key → required FBref stat group mapping so the
 * editor can warn/disable unavailable metrics based on coverage.availableStatGroups.
 */

export type PlayerStatsMode = 'SINGLE' | 'COMPARE' | 'SCOUT_SHORTLIST';
export type PlayerStatsLabUiMode = 'easy' | 'advanced';

export type PlayerStatsAssistResult = {
  ok: boolean;
  message: string;
  mode?: PlayerStatsMode;
  preset?: string;
  metrics?: string[];
  /** Optional detected player to fill into Player A. */
  playerName?: string;
  /** Optional detected club for Player A. */
  clubName?: string;
};

/**
 * Map metric keys → required FBref stat group(s).
 * The bridge reports `coverage.availableStatGroups` (e.g. ["standard", "shooting", ...]).
 * If a metric requires a group that is NOT in availableStatGroups, the metric is
 * effectively unavailable and we should not feature it as Hero by default.
 */
export const METRIC_STAT_GROUP: Record<string, string> = {
  // Standard / season basics
  appearances:           'standard',
  starts:                'standard',
  minutes:               'standard',
  minutes_per_start:     'standard',
  goals:                 'standard',
  assists:               'standard',
  goal_contributions:    'standard',
  goals_per90:           'standard',
  assists_per90:         'standard',
  non_penalty_goals:     'standard',
  yellow_cards:          'standard',
  red_cards:             'standard',
  fouls_committed:       'standard',
  rating:                'standard',
  impact_index:          'standard',
  barcelona_fit_score:   'standard',
  market_risk_score:     'standard',
  // Shooting
  shots:                 'shooting',
  shots_per90:           'shooting',
  shots_on_target:       'shooting',
  shot_accuracy:         'shooting',
  conversion_rate:       'shooting',
  xg:                    'shooting',
  xg_per90:              'shooting',
  touches_in_box:        'shooting',
  big_chances:           'shooting',
  // Passing
  passes:                'passing',
  pass_accuracy:         'passing',
  progressive_passes:    'passing',
  passes_into_penalty_area: 'passing',
  passes_into_final_third:  'passing',
  long_balls:            'passing',
  // Goal & shot creation
  key_passes:            'gca',
  key_passes_per90:      'gca',
  chances_created:       'gca',
  big_chances_created:   'gca',
  through_balls:         'gca',
  xa:                    'gca',
  xa_per90:              'gca',
  // Defense
  tackles:               'defense',
  tackles_won:           'defense',
  interceptions:         'defense',
  clearances:            'defense',
  blocks:                'defense',
  pressures:             'defense',
  recoveries:            'defense',
  ground_duels_won:      'defense',
  duel_win_rate:         'defense',
  // Possession
  touches:               'possession',
  progressive_carries:   'possession',
  dribbles_completed:    'possession',
  dribble_success_rate:  'possession',
  // Goalkeeping
  saves:                 'keeper',
  save_percentage:       'keeper',
  clean_sheets:          'keeper',
  goals_against:         'keeper',
  crosses_stopped:       'keeper',
};

/**
 * Returns true if the metric is supported by the current coverage availableStatGroups.
 * If we have no information at all, assume true (don't gray out everything).
 */
export const isMetricAvailable = (
  metricKey: string,
  availableStatGroups: string[] | undefined,
): boolean => {
  if (!availableStatGroups || availableStatGroups.length === 0) return true;
  const required = METRIC_STAT_GROUP[metricKey];
  if (!required) return true; // Unknown metric — don't block it.
  return availableStatGroups.includes(required);
};

/**
 * Filter a metric key list down to those currently available.
 */
export const filterAvailableMetrics = (
  metrics: string[],
  availableStatGroups: string[] | undefined,
): string[] => metrics.filter(key => isMetricAvailable(key, availableStatGroups));

/**
 * Normalize Arabic input by stripping diacritics and unifying letter forms.
 * Same approach as the existing normalizeMetricText helper.
 */
const normalize = (input: string): string =>
  String(input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A')
    .replace(/\s+/g, ' ')
    .trim();

const matchesAny = (haystack: string, needles: string[]): boolean =>
  needles.some(needle => haystack.includes(normalize(needle)));

type AssistantContext = {
  /** Currently selected hero metrics (used as a soft starting point). */
  currentHero?: string[];
  /** Currently selected secondary metrics. */
  currentSecondary?: string[];
};

/**
 * Deterministic Arabic/English assistant. Returns:
 *   - mode: SINGLE / COMPARE / SCOUT_SHORTLIST inferred from intent words
 *   - preset: Attacker / Playmaker / Defensive / Goalkeeper / Transfer Scout
 *   - metrics: explicit metric mentions ("أهداف", "أسيست", "لكل 90", ...)
 *
 * If neither preset nor explicit metrics are found, ok=false with a clear message.
 */
export const runPlayerStatsAssistant = (
  rawInput: string,
  _ctx: AssistantContext = {},
): PlayerStatsAssistResult => {
  const input = normalize(rawInput);
  if (!input) {
    return { ok: false, message: 'اكتب طلبك أولاً.' };
  }

  // ── Mode detection ───────────────────────────────────────────────
  let mode: PlayerStatsMode | undefined;
  if (matchesAny(input, ['مقارنة', 'مقارن', 'مبارزه', 'مبارزة', 'compare', 'vs', 'duel'])) {
    mode = 'COMPARE';
  } else if (matchesAny(input, ['قائمة', 'استكشاف', 'shortlist', 'scout'])) {
    mode = 'SCOUT_SHORTLIST';
  } else if (matchesAny(input, ['لاعب واحد', 'بطاقه', 'بطاقة', 'single', 'profile'])) {
    mode = 'SINGLE';
  }

  // ── Preset detection ─────────────────────────────────────────────
  let preset: string | undefined;
  if (matchesAny(input, ['هجومي', 'هجوميه', 'هجومية', 'مهاجم', 'striker', 'attacker', 'forward'])) {
    preset = 'Attacker Profile';
  } else if (matchesAny(input, ['صانع لعب', 'صانع', 'تمرير', 'مفتاحي', 'playmaker'])) {
    preset = 'Playmaker Profile';
  } else if (matchesAny(input, ['دفاعي', 'دفاعيه', 'دفاع', 'مدافع', 'defensive', 'defender'])) {
    preset = 'Defensive Profile';
  } else if (matchesAny(input, ['حارس', 'حراسه', 'حراسة', 'goalkeeper', 'keeper'])) {
    preset = 'Goalkeeper Profile';
  } else if (matchesAny(input, ['انتقال', 'انتقالات', 'سكاوت', 'سكاوتنج', 'transfer scout', 'transfer'])) {
    preset = 'Transfer Scout';
  } else if (matchesAny(input, ['مقارنه', 'مقارنة مباشره', 'head to head', 'h2h'])) {
    preset = 'Head-to-Head Comparison';
  } else if (matchesAny(input, ['ملاءمه برشلونه', 'ملاءمة برشلونة', 'برشلونه فت', 'barcelona fit'])) {
    preset = 'Barcelona Fit';
  } else if (matchesAny(input, ['تقرير الموسم', 'تقرير موسم', 'season report', 'full season'])) {
    preset = 'Full Season Report';
  }

  // ── Explicit metric detection ────────────────────────────────────
  const metrics: string[] = [];
  const want = (key: string) => { if (!metrics.includes(key)) metrics.push(key); };
  const isPer90 = matchesAny(input, ['لكل 90', 'لكل تسعين', 'per 90', 'per90', 'p90']);

  if (matchesAny(input, ['اهداف', 'أهداف', 'هدف', 'goals', 'goal'])) {
    want(isPer90 ? 'goals_per90' : 'goals');
  }
  if (matchesAny(input, ['اسيست', 'أسيست', 'تمريرات حاسمه', 'تمريرات حاسمة', 'حاسمه', 'حاسمة', 'assists', 'assist'])) {
    want(isPer90 ? 'assists_per90' : 'assists');
  }
  if (matchesAny(input, ['دقائق', 'minutes'])) want('minutes');
  if (matchesAny(input, ['مشاركات', 'appearances'])) want('appearances');
  if (matchesAny(input, ['اساسي', 'أساسي', 'بدأ', 'starts'])) want('starts');
  if (matchesAny(input, ['تسديدات', 'تسديد', 'shots'])) want(isPer90 ? 'shots_per90' : 'shots');
  if (matchesAny(input, ['على المرمى', 'shots on target'])) want('shots_on_target');
  if (matchesAny(input, ['دقه التسديد', 'دقة التسديد', 'shot accuracy'])) want('shot_accuracy');
  if (matchesAny(input, ['xg', 'الاهداف المتوقعه', 'الأهداف المتوقعة', 'expected goals'])) want('xg');
  if (matchesAny(input, ['xa', 'الاسيست المتوقع', 'expected assists'])) want('xa');
  if (matchesAny(input, ['تمريرات مفتاحيه', 'تمريرات مفتاحية', 'مفتاحيه', 'key passes'])) want('key_passes');
  if (matchesAny(input, ['تمريرات تقدميه', 'تمريرات تقدمية', 'progressive passes'])) want('progressive_passes');
  if (matchesAny(input, ['مراوغات', 'مراوغه', 'مراوغة', 'dribbles'])) want('dribbles_completed');
  if (matchesAny(input, ['افتكاكات', 'تاكلز', 'tackles'])) want('tackles');
  if (matchesAny(input, ['اعتراضات', 'interceptions'])) want('interceptions');
  if (matchesAny(input, ['استرجاعات', 'recoveries'])) want('recoveries');
  if (matchesAny(input, ['تصديات', 'saves'])) want('saves');
  if (matchesAny(input, ['شباك نظيفه', 'شباك نظيفة', 'clean sheets'])) want('clean_sheets');

  // ── Lightweight player/club detection (deterministic, common only) ──
  // Matches well-known aliases used by the broadcast workspace; falls back to
  // empty if not recognized — the user can type the name in Basic tab.
  let playerName: string | undefined;
  let clubName: string | undefined;
  const PLAYER_HINTS: Array<{ name: string; club: string; aliases: string[] }> = [
    { name: 'Robert Lewandowski', club: 'Barcelona', aliases: ['ليفاندوفسكي', 'ليفاندوفسكى', 'lewandowski', 'لاعب الهدف', 'الهداف ليفا'] },
    { name: 'Lamine Yamal',       club: 'Barcelona', aliases: ['لامين يامال', 'يامال', 'yamal', 'lamine'] },
    { name: 'Pedri',              club: 'Barcelona', aliases: ['بيدري', 'pedri'] },
    { name: 'Raphinha',           club: 'Barcelona', aliases: ['رافينيا', 'raphinha'] },
    { name: 'Frenkie de Jong',    club: 'Barcelona', aliases: ['دي يونغ', 'دي يونج', 'de jong'] },
    { name: 'Cole Palmer',        club: 'Chelsea',   aliases: ['كول بالمر', 'بالمر', 'palmer'] },
    { name: 'Erling Haaland',     club: 'Manchester City', aliases: ['هالاند', 'هالاند', 'haaland'] },
    { name: 'Kylian Mbappe',      club: 'Real Madrid', aliases: ['مبابي', 'mbappe'] },
    { name: 'Vinicius Jr',        club: 'Real Madrid', aliases: ['فينيسيوس', 'vinicius', 'vini jr'] },
    { name: 'Jude Bellingham',    club: 'Real Madrid', aliases: ['بيلينغهام', 'بلنغهام', 'bellingham'] },
  ];
  for (const hint of PLAYER_HINTS) {
    if (matchesAny(input, hint.aliases)) {
      playerName = hint.name;
      clubName = hint.club;
      break;
    }
  }

  if (preset || metrics.length > 0 || mode || playerName) {
    return {
      ok: true,
      message: 'تم تطبيق الطلب على القالب.',
      mode,
      preset,
      metrics,
      playerName,
      clubName,
    };
  }

  return {
    ok: false,
    message: 'لم أفهم الطلب بالكامل، استخدم الإعداد اليدوي.',
  };
};
