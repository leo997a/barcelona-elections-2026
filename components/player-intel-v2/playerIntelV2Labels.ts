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
