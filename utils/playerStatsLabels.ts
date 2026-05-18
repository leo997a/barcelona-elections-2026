/**
 * Player Stats Lab — Centralized Labels (Arabic + English)
 * UTF-8 safe. All Arabic text lives here, never inline in JSX.
 */

// ─── Tab Labels ─────────────────────────────────────────────
export const LABELS = {
  tabs: {
    setup:    { ar: 'الإعداد',      en: 'Setup' },
    presets:  { ar: 'القوالب',      en: 'Presets' },
    metrics:  { ar: 'الإحصائيات',   en: 'Metrics' },
    coverage: { ar: 'التغطية',      en: 'Coverage' },
    visuals:  { ar: 'المظهر',       en: 'Visuals' },
    advanced: { ar: 'متقدم',        en: 'Advanced' },
  },

  // ─── Setup Tab ──────────────────────────────────────────────
  setup: {
    playerMode:      { ar: 'وضع اللاعب',       en: 'Player Mode' },
    singlePlayer:    { ar: 'لاعب واحد',         en: 'Single Player' },
    comparePlayers:  { ar: 'مقارنة لاعبين',     en: 'Compare Players' },
    scoutShortlist:  { ar: 'قائمة الاستكشاف',   en: 'Scout Shortlist' },
    targetPlayer:    { ar: 'اللاعب الأساسي',    en: 'Target Player' },
    secondPlayer:    { ar: 'اللاعب الثاني',     en: 'Second Player' },
    playerName:      { ar: 'اسم اللاعب',        en: 'Player Name' },
    club:            { ar: 'النادي',             en: 'Club' },
    season:          { ar: 'الموسم',             en: 'Season' },
    fetch:           { ar: 'جلب الإحصائيات',     en: 'Fetch Stats' },
    fetching:        { ar: 'جارٍ جلب البيانات...', en: 'Fetching...' },
  },

  // ─── Metrics Tab ────────────────────────────────────────────
  metrics: {
    heroMetrics:       { ar: 'الإحصائيات الرئيسية',    en: 'Hero Metrics' },
    secondaryMetrics:  { ar: 'الإحصائيات الثانوية',     en: 'Secondary Metrics' },
    hiddenMetrics:     { ar: 'إحصائيات مخفية',          en: 'Hidden Metrics' },
    missingMetrics:    { ar: 'إحصائيات غير متاحة',      en: 'Missing Metrics' },
    moveUp:            { ar: '↑',                        en: '↑' },
    moveDown:          { ar: '↓',                        en: '↓' },
    toHero:            { ar: '★ رئيسي',                  en: '★ Hero' },
    toSecondary:       { ar: '→ ثانوي',                  en: '→ Secondary' },
    hide:              { ar: 'إخفاء',                    en: 'Hide' },
    unhide:            { ar: 'إظهار',                    en: 'Unhide' },
    remove:            { ar: 'حذف',                      en: 'Remove' },
    search:            { ar: 'ابحث عن إحصائية...',       en: 'Search metric...' },
    limitWarning:      { ar: 'الحد الأقصى',              en: 'Max limit' },
  },

  // ─── Presets Tab ────────────────────────────────────────────
  presets: {
    title:      { ar: 'القوالب الجاهزة',  en: 'Presets' },
    categories: { ar: 'التصنيفات',        en: 'Categories' },
  },

  // ─── Coverage Tab ──────────────────────────────────────────
  coverage: {
    cacheStatus:      { ar: 'حالة الكاش',                en: 'Cache Status' },
    fullCache:        { ar: 'كاش كامل متاح',              en: 'Full Cache Available' },
    partialCache:     { ar: 'كاش جزئي',                   en: 'Partial Cache' },
    availableGroups:  { ar: 'المجموعات المتاحة',          en: 'Available Groups' },
    missingGroups:    { ar: 'المجموعات الناقصة',          en: 'Missing Groups' },
    noData:           { ar: 'لا توجد بيانات تغطية. اجلب الإحصائيات أولاً.', en: 'No coverage data. Fetch stats first.' },
    advancedWarning:  { ar: 'البيانات المتقدمة غير متاحة لأن كاش البيانات التفصيلية غير مكتمل.', en: 'Advanced data unavailable — detailed cache not yet synced.' },
    lastUpdated:      { ar: 'آخر تحديث',                  en: 'Last Updated' },
  },

  // ─── Visuals Tab ───────────────────────────────────────────
  visuals: {
    visualVariant:    { ar: 'نمط العرض',             en: 'Visual Variant' },
    showMissingBox:   { ar: 'إظهار صندوق الناقص',    en: 'Show Missing Box' },
    scale:            { ar: 'الحجم',                  en: 'Scale' },
    accentColor:      { ar: 'اللون الرئيسي',         en: 'Accent Color' },
  },

  // ─── Panel Controls ────────────────────────────────────────
  panel: {
    expand:       { ar: 'توسيع اللوحة',         en: 'Expand Panel' },
    collapse:     { ar: 'تصغير اللوحة',          en: 'Collapse Panel' },
    openModal:    { ar: 'فتح محرر الإحصائيات',   en: 'Open Stats Editor' },
    closeModal:   { ar: 'إغلاق',                 en: 'Close' },
  },

  // ─── Renderer ──────────────────────────────────────────────
  renderer: {
    playerDataFile:    { ar: 'ملف بيانات اللاعب',  en: 'PLAYER DATA FILE' },
    playerDuel:        { ar: 'مبارزة اللاعبين',     en: 'PLAYER DUEL' },
    scoutShortlist:    { ar: 'قائمة الاستكشاف',     en: 'SCOUT SHORTLIST' },
    missingAdvanced:   { ar: 'إحصائيات متقدمة غير متاحة', en: 'Missing Advanced Metrics' },
    requires:          { ar: 'يتطلب',              en: 'requires' },
    awaitingPlayer2:   { ar: 'بانتظار اللاعب الثاني', en: 'Awaiting Player 2' },
    partialFbref:      { ar: 'البيانات الأساسية',  en: 'CORE METRICS' },
    fullFbref:         { ar: 'كاش كامل',            en: 'FULL FBREF CACHE' },
    available:         { ar: 'المصدر',              en: 'Source' },
  },

  // ─── Messages ──────────────────────────────────────────────
  messages: {
    fetchSuccess: { ar: 'تم جلب البيانات بنجاح.',     en: 'Stats fetched successfully.' },
    fetchError:   { ar: 'حدث خطأ أثناء جلب البيانات.', en: 'Failed to fetch stats.' },
  },
} as const;

// ─── Metric Labels (key → Arabic / English) ─────────────────
export const METRIC_LABELS: Record<string, { ar: string; en: string }> = {
  goals:                 { ar: 'الأهداف',                en: 'Goals' },
  assists:               { ar: 'التمريرات الحاسمة',      en: 'Assists' },
  minutes:               { ar: 'الدقائق',                en: 'Minutes' },
  appearances:           { ar: 'المشاركات',              en: 'Appearances' },
  starts:                { ar: 'بدأ أساسياً',            en: 'Starts' },
  shots:                 { ar: 'التسديدات',              en: 'Shots' },
  shots_on_target:       { ar: 'تسديدات على المرمى',     en: 'Shots on Target' },
  shot_accuracy:         { ar: 'دقة التسديد',            en: 'Shot Accuracy' },
  xg:                    { ar: 'الأهداف المتوقعة',       en: 'Expected Goals (xG)' },
  xa:                    { ar: 'الأسيست المتوقع',        en: 'Expected Assists (xA)' },
  xg_per90:              { ar: 'xG لكل 90 دقيقة',        en: 'xG per 90' },
  xa_per90:              { ar: 'xA لكل 90 دقيقة',        en: 'xA per 90' },
  goals_per90:           { ar: 'أهداف لكل 90 دقيقة',     en: 'Goals per 90' },
  assists_per90:         { ar: 'أسيست لكل 90 دقيقة',     en: 'Assists per 90' },
  shots_per90:           { ar: 'تسديدات لكل 90',         en: 'Shots per 90' },
  non_penalty_goals:     { ar: 'أهداف بدون ركلات جزاء',   en: 'Non-Penalty Goals' },
  key_passes:            { ar: 'التمريرات المفتاحية',    en: 'Key Passes' },
  key_passes_per90:      { ar: 'مفتاحية لكل 90',         en: 'Key Passes per 90' },
  chances_created:       { ar: 'الفرص المصنوعة',         en: 'Chances Created' },
  big_chances_created:   { ar: 'فرص كبيرة مصنوعة',       en: 'Big Chances Created' },
  through_balls:         { ar: 'الكرات البينية',         en: 'Through Balls' },
  progressive_passes:    { ar: 'التمريرات التقدمية',     en: 'Progressive Passes' },
  passes_into_penalty_area: { ar: 'تمريرات لمنطقة الجزاء', en: 'Passes into Penalty Area' },
  passes_into_final_third:  { ar: 'تمريرات للثلث الأخير',  en: 'Passes into Final Third' },
  passes:                { ar: 'التمريرات',              en: 'Passes' },
  pass_accuracy:         { ar: 'دقة التمرير',            en: 'Pass Accuracy' },
  progressive_carries:   { ar: 'الحمل التقدمي',          en: 'Progressive Carries' },
  dribbles_completed:    { ar: 'المراوغات الناجحة',      en: 'Dribbles Completed' },
  dribble_success_rate:  { ar: 'نسبة نجاح المراوغة',     en: 'Dribble Success Rate' },
  touches:               { ar: 'اللمسات',                en: 'Touches' },
  touches_in_box:        { ar: 'لمسات في منطقة الجزاء',  en: 'Touches in Box' },
  tackles:               { ar: 'الافتكاكات',             en: 'Tackles' },
  tackles_won:           { ar: 'افتكاكات ناجحة',         en: 'Tackles Won' },
  interceptions:         { ar: 'الاعتراضات',             en: 'Interceptions' },
  clearances:            { ar: 'التشتيت',                en: 'Clearances' },
  blocks:                { ar: 'التصديات',               en: 'Blocks' },
  pressures:             { ar: 'الضغط',                  en: 'Pressures' },
  recoveries:            { ar: 'الاسترجاعات',            en: 'Recoveries' },
  ground_duels_won:      { ar: 'المبارزات الأرضية',      en: 'Ground Duels Won' },
  duel_win_rate:         { ar: 'نسبة الفوز بالمبارزات',  en: 'Duel Win Rate' },
  fouls_committed:       { ar: 'الأخطاء المرتكبة',       en: 'Fouls Committed' },
  yellow_cards:          { ar: 'البطاقات الصفراء',       en: 'Yellow Cards' },
  red_cards:             { ar: 'البطاقات الحمراء',       en: 'Red Cards' },
  saves:                 { ar: 'التصديات',               en: 'Saves' },
  save_percentage:       { ar: 'نسبة التصدي',            en: 'Save Percentage' },
  clean_sheets:          { ar: 'شباك نظيفة',             en: 'Clean Sheets' },
  goals_against:         { ar: 'أهداف ضد',               en: 'Goals Against' },
  crosses_stopped:       { ar: 'عرضيات متوقفة',          en: 'Crosses Stopped' },
  goal_contributions:    { ar: 'المساهمات التهديفية',    en: 'Goal Contributions' },
  rating:                { ar: 'التقييم',                en: 'Rating' },
  impact_index:          { ar: 'مؤشر التأثير',           en: 'Impact Index' },
  barcelona_fit_score:   { ar: 'ملاءمة برشلونة',         en: 'Barcelona Fit Score' },
  market_risk_score:     { ar: 'مؤشر المخاطرة',          en: 'Market Risk Score' },
};

/**
 * Get the Arabic label for a metric key.
 * Falls back to humanized key if not found.
 */
export const getMetricLabel = (key: string, lang: 'ar' | 'en' = 'ar'): string => {
  const entry = METRIC_LABELS[key];
  if (entry) return entry[lang];
  return key.replace(/_/g, ' ');
};

/**
 * Get label from LABELS object, defaulting to Arabic.
 */
export const t = (entry: { ar: string; en: string }, lang: 'ar' | 'en' = 'ar'): string => entry[lang];
