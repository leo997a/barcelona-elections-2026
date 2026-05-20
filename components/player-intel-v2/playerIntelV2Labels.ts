/**
 * Player Intel V2 — Arabic labels for the Preview Lab UI.
 */

export const LAB_LABELS = {
  pageTitle: 'مختبر Player Intel V2',
  pageSubtitle: 'قراءة ملفات Master Profile الناتجة من FotMob + FBref',
  selectPlayer: 'اختر لاعبًا',
  pasteMasterTitle: 'لصق ملف Master JSON كامل',
  pasteMasterHint:
    'اللصق هنا يعمل في المتصفح فقط. لا يُحفظ شيء على الخادم. مفيد عند رغبتك بفحص ملف master الكامل (1+ MB) دون رفعه.',
  pasteButton: 'تحليل JSON الملصوق',
  clearPasted: 'مسح',
  pasteEmptyError: 'الصق أولاً نص JSON صحيح.',
  pasteParseError: 'تعذر قراءة JSON. تأكد من النسخ الكامل بدون تعديل.',
  noSelection: 'لم يُختَر لاعب بعد. اختر من القائمة أو الصق ملف Master.',
  loadingSamples: 'جارٍ تحميل العينات...',
  samplesLoadError: 'تعذر تحميل ملفات العينات.',

  // Player summary section
  playerOverview: 'ملخص اللاعب',
  player: 'اللاعب',
  club: 'النادي',
  season: 'الموسم',
  position: 'المركز',
  generatedAt: 'وُلِّد في',
  imageNotAvailable: 'الصورة غير متاحة في الملخص',

  // Source coverage
  sourceCoverage: 'مصادر البيانات',
  sourceFotmob: 'مصدر FotMob',
  sourceFbref: 'مصدر FBref',
  sourceAvailable: 'متاح',
  sourceMissing: 'غير متاح',
  fbrefGroupsMatched: 'مجموعات FBref المُطابَقة',
  fbrefGroupsMissing: 'مجموعات FBref التي يفتقد اللاعبَ فيها',

  // Counts
  countsTitle: 'عدد الإحصائيات',
  fotmobMetrics: 'إحصائيات FotMob',
  fbrefRawColumns: 'أعمدة FBref الخام',
  canonicalMetrics: 'الإحصائيات الموحَّدة',
  mergedMetrics: 'الإحصائيات المدمجة',
  metricCatalog: 'فهرس المقاييس',
  broadcastCardsCount: 'بطاقات البث',
  broadcastCardsItemTotal: 'إجمالي عناصر البطاقات',

  // Cards section
  broadcastCardsTitle: 'بطاقات البث',
  broadcastCardsHint: 'كل بطاقة تعرض الإحصائيات المتاحة لها فقط.',
  cardItems: 'عدد العناصر',
  previewCard: 'معاينة البطاقة',
  closeCard: 'إخفاء',
  noCardsItems: 'لا توجد عناصر متاحة لهذه البطاقة.',
  cardsNotInSummary:
    'ملف الملخص يعرض الترتيب فقط. الصق ملف master الكامل لرؤية تفاصيل كل بطاقة.',

  // Catalog
  catalogTitle: 'فهرس المقاييس',
  catalogSearch: 'بحث في الإحصائيات',
  catalogColKey: 'المفتاح',
  catalogColLabel: 'التسمية',
  catalogColLabelAr: 'بالعربية',
  catalogColSource: 'المصدر',
  catalogColCategory: 'التصنيف',
  catalogColType: 'النوع',
  catalogColAvailable: 'متاح',
  catalogEmpty:
    'ملف الملخص لا يحتوي فهرس المقاييس الكامل. الصق ملف master الكامل لرؤية كل المقاييس.',
  catalogResults: 'نتيجة',

  // Quality
  qualityTitle: 'تقرير الجودة',
  qualityWarnings: 'تحذيرات الجودة',
  noWarnings: 'لا توجد تحذيرات جودة',
  sourceConflicts: 'تعارضات المصادر',
  noConflicts: 'لا توجد تعارضات بين FotMob و FBref',

  // Misc
  available: 'متاح',
  notAvailable: 'غير متاح',
  yes: 'نعم',
  no: 'لا',
  back: 'رجوع',
} as const;

/**
 * Card key → Arabic title (used when card.title is missing in summary).
 */
export const CARD_AR_TITLES: Record<string, string> = {
  attacker: 'بطاقة هجومية',
  playmaker: 'صانع لعب',
  winger: 'جناح',
  defender: 'مدافع',
  complete_report: 'تقرير كامل',
  form_report: 'تقرير الفورمة',
  market_report: 'تقرير السوق',
  season_report: 'تقرير الموسم',
};

/**
 * FBref stat group → Arabic title.
 */
export const FBREF_GROUP_AR: Record<string, string> = {
  standard: 'الأساسي',
  shooting: 'التسديد',
  passing: 'التمرير',
  pass_types: 'أنواع التمرير',
  gca: 'صناعة الفرص',
  defense: 'الدفاع',
  possession: 'الاستحواذ',
  playing_time: 'دقائق اللعب',
  misc: 'متفرقات',
  keeper: 'حراسة المرمى',
};

/**
 * Common warning keys → human-readable Arabic explanation.
 */
export const WARNING_AR: Record<string, string> = {
  LOW_FOTMOB_METRIC_COUNT: 'عدد إحصائيات FotMob أقل من 100 — تحقق من ملف Mega.',
  LOW_FBREF_GROUPS_MATCHED:
    'أقل من 5 مجموعات FBref تطابقت — تحقق من اسم النادي ومن وجود cache.',
  LOW_MERGED_METRICS_COUNT: 'إجمالي الإحصائيات المدمجة أقل من 250.',
  FBREF_PLAYER_NOT_FOUND_IN_ANY_GROUP:
    'لم يُعثر على اللاعب في أي مجموعة FBref. راجع الاسم.',
  SOURCE_CONFLICTS_DETECTED:
    'توجد فروقات بين قيم FotMob و FBref لبعض الإحصائيات.',
};

export const cardArTitle = (key: string, fallback?: string): string =>
  CARD_AR_TITLES[key] || fallback || key;

export const fbrefGroupAr = (group: string): string =>
  FBREF_GROUP_AR[group] || group;

export const warningAr = (warning: string): string =>
  WARNING_AR[warning] || warning;

/**
 * Clean Arabic label resolver for broadcast metrics.
 * Falls back to English label if no Arabic mapping exists.
 * Detects mojibake (non-Arabic chars in supposedly Arabic text) and skips it.
 */
const METRIC_AR_MAP: Record<string, string> = {
  goals: 'الأهداف',
  assists: 'التمريرات الحاسمة',
  xg: 'الأهداف المتوقعة',
  expected_goals: 'الأهداف المتوقعة',
  xa: 'التمريرات المتوقعة',
  expected_assists: 'التمريرات المتوقعة',
  shots: 'التسديدات',
  shots_on_target: 'على المرمى',
  rating: 'التقييم',
  minutes: 'الدقائق',
  minutes_played: 'الدقائق',
  matches: 'المباريات',
  appearances: 'المشاركات',
  starts: 'بدأ أساسيًا',
  tackles: 'الافتكاكات',
  interceptions: 'الاعتراضات',
  blocks: 'الصدّات',
  clearances: 'التشتيتات',
  touches: 'اللمسات',
  dribbles: 'المراوغات',
  crosses: 'العرضيات',
  key_passes: 'التمريرات المفتاحية',
  progressive_passes: 'التمريرات التقدمية',
  progressive_carries: 'الحمل التقدمي',
  yellow_cards: 'بطاقات صفراء',
  red_cards: 'بطاقات حمراء',
  fouls_committed: 'أخطاء',
  fouls_drawn: 'أخطاء عليه',
  offsides: 'تسلل',
  shot_creating_actions: 'صناعة تسديدات',
  goal_creating_actions: 'صناعة أهداف',
  saves: 'تصديات',
  clean_sheets: 'شِباك نظيفة',
  aerial_duels_won: 'مبارزات هوائية',
  duels_won: 'مبارزات فائزة',
  dribble_success_rate: 'نجاح المراوغة',
  accurate_passes: 'تمريرات دقيقة',
  chances_created: 'فرص مصنوعة',
  penalties_scored: 'ركلات مسجلة',
  market_value: 'القيمة السوقية',
  transfer_value: 'القيمة السوقية',
  // Form report
  recent_matches_count: 'المباريات الأخيرة',
  recent_goals: 'أهداف أخيرة',
  recent_assists: 'صناعات أخيرة',
  recent_minutes: 'دقائق أخيرة',
  recent_avg_rating: 'متوسط التقييم',
  recent_player_of_match_count: 'رجل المباراة',
  recent_yellow_cards: 'صفراء أخيرة',
  recent_red_cards: 'حمراء أخيرة',
  // Market
  currentvalue: 'القيمة الحالية',
  highestvalue: 'أعلى قيمة',
  lowestvalue: 'أدنى قيمة',
  firstvalue: 'أول قيمة',
  growthfromfirstpercent: 'نمو القيمة',
};

function _isMojibake(s: string | null | undefined): boolean {
  if (!s) return true;
  // Arabic chars are in range \u0600-\u06FF. If the string has none, it's mojibake.
  return !/[\u0600-\u06FF]/.test(s);
}

/**
 * Get clean Arabic label for a metric key.
 * Priority: METRIC_AR_MAP > labelAr from data (if not mojibake) > English label.
 */
export function getMetricAr(key: string, labelAr?: string | null, fallbackLabel?: string): string {
  // Try direct map first (most reliable)
  const lower = key.toLowerCase().replace(/^fotmob_/, '').replace(/^fbref_\w+_/, '');
  if (METRIC_AR_MAP[lower]) return METRIC_AR_MAP[lower];
  // Try partial match
  for (const [pat, ar] of Object.entries(METRIC_AR_MAP)) {
    if (lower.includes(pat)) return ar;
  }
  // Try provided labelAr if not mojibake
  if (labelAr && !_isMojibake(labelAr)) return labelAr;
  // Fallback to English
  return fallbackLabel || key;
}

