
import { OverlayType, OverlayConfig, OverlayField } from './types';
import { MONDIAL_2026_TEMPLATES } from './components/renderers/MondialTemplates';
import {
  createElectionCandidateProfileField,
  createElectionStatementFields,
  ELECTION_ENTITY_PRESETS,
  ELECTION_SOUND_OPTIONS,
} from './utils/election';
import {
  BROADCAST_EXIT_OPTIONS,
  BROADCAST_SOUND_OPTIONS,
  BROADCAST_TRANSITION_OPTIONS,
} from './components/renderers/OverlayConstants';

// Helper to add common fields
const commonFields: OverlayField[] = [
  { id: 'channelName', label: 'اسم القناة (الحقوق)', type: 'text', value: 'REO LIVE' },
];

const ELECTION_DESIGN_STYLE_OPTIONS = [
  { value: 'RESULTS_HUB', label: 'نتائج / مركز بث' },
  { value: 'SPLIT_BAR_LEFT', label: 'مواجهة مرشحين' },
  { value: 'COUNTDOWN_TOP', label: 'عد تنازلي' },
  { value: 'LEAKS_FULL', label: 'خبر عاجل' },
  { value: 'STATEMENT_FULL', label: 'تصريح كامل' },
  { value: 'LIVE_TRANSITION', label: 'انتقال مباشر' },
  { value: 'STUDIO_BACKGROUND', label: 'خلفية استوديو' },
  { value: 'VOTER_TURNOUT', label: 'نسبة مشاركة' },
];

const MERCATO_DESIGN_STYLE_OPTIONS = [
  { value: 'DEAL_BREAKER', label: 'إعلان صفقة رئيسي' },
  { value: 'MARKET_COMMAND_CENTER', label: 'غرفة قيادة السوق' },
  { value: 'RUMOUR_RADAR', label: 'رادار الشائعات' },
  { value: 'DONE_DEALS_WALL', label: 'جدار الصفقات المحسومة' },
  { value: 'PLAYER_SEASON_CARD', label: 'بطاقة موسم اللاعب' },
  { value: 'PLAYER_IMPACT_CARD', label: 'توقع تأثير اللاعب' },
];

const createBroadcastControlFields = (existingFields: OverlayField[]): OverlayField[] => {
  const hasField = (id: string) => existingFields.some(field => field.id === id);
  const additions: OverlayField[] = [];

  if (!hasField('transitionIn')) {
    additions.push({
      id: 'transitionIn',
      label: 'انتقال الظهور',
      type: 'select',
      value: 'DEFAULT',
      options: BROADCAST_TRANSITION_OPTIONS,
    });
  }

  if (!hasField('transitionOut')) {
    additions.push({
      id: 'transitionOut',
      label: 'انتقال الإخفاء',
      type: 'select',
      value: 'DEFAULT',
      options: BROADCAST_EXIT_OPTIONS,
    });
  }

  if (!hasField('soundEnabled')) {
    additions.push({ id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true });
  }

  if (!hasField('soundVolume')) {
    additions.push({ id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.05 });
  }

  if (!hasField('soundInStyle')) {
    additions.push({
      id: 'soundInStyle',
      label: 'مؤثر الظهور',
      type: 'select',
      value: 'DEFAULT',
      options: BROADCAST_SOUND_OPTIONS,
    });
  }

  if (!hasField('soundOutStyle')) {
    additions.push({
      id: 'soundOutStyle',
      label: 'مؤثر الإخفاء',
      type: 'select',
      value: 'DEFAULT',
      options: BROADCAST_SOUND_OPTIONS,
    });
  }

  // ─── AUDIO-X4: Universal voice/sfx controls (hidden in UI by default) ──────
  // Every template inherits these fields so the voice library is technically
  // available everywhere. The Editor UI only surfaces them when sfxEnabled
  // or voiceEnabled flips on, so default templates stay clean.

  if (!hasField('sfxEnabled')) {
    additions.push({ id: 'sfxEnabled', label: 'تفعيل المؤثرات', type: 'boolean', value: true });
  }

  if (!hasField('voiceEnabled')) {
    additions.push({ id: 'voiceEnabled', label: 'تفعيل الصوت الحقيقي', type: 'boolean', value: false });
  }

  if (!hasField('voiceLibraryId')) {
    additions.push({
      id: 'voiceLibraryId',
      label: 'صوت من المكتبة',
      type: 'select',
      value: 'none',
      // Options resolved at render time from utils/voiceLibrary.
      options: [
        { value: 'none', label: '— بدون صوت —' },
        { value: 'mercato_here_we_go', label: 'تأكيد الصفقة' },
        { value: 'mercato_agreement_close', label: 'الاتفاق قريب' },
        { value: 'mercato_things_happening_now', label: 'الأمور تحدث الآن' },
        { value: 'mercato_transfer_approaching', label: 'الانتقال يقترب' },
        { value: 'mercato_heating_now', label: 'الميركاتو يشتعل الآن' },
        { value: 'mercato_deal_percentages_current', label: 'النسب الحالية للصفقات' },
      ],
    });
  }

  if (!hasField('voiceDirectUrl')) {
    additions.push({ id: 'voiceDirectUrl', label: 'رابط صوت مباشر (mp3/wav)', type: 'text', value: '' });
  }

  if (!hasField('voiceTrigger')) {
    additions.push({
      id: 'voiceTrigger',
      label: 'متى يشتغل الصوت',
      type: 'select',
      value: 'manual_only',
      options: [
        { value: 'manual_only', label: 'يدوي فقط' },
        { value: 'on_enter', label: 'عند الدخول IN' },
        { value: 'on_update', label: 'عند التحديث' },
        { value: 'on_alert', label: 'عند تنبيه' },
      ],
    });
  }

  if (!hasField('voiceVolume')) {
    additions.push({ id: 'voiceVolume', label: 'مستوى الصوت الحقيقي', type: 'range', value: 0.9, min: 0, max: 1.5, step: 0.05 });
  }

  if (!hasField('duckSfx')) {
    additions.push({ id: 'duckSfx', label: 'خفض المؤثرات أثناء الصوت', type: 'boolean', value: true });
  }

  if (!hasField('audioSceneId')) {
    additions.push({ id: 'audioSceneId', label: 'مشهد صوتي', type: 'text', value: '' });
  }

  // Phase A1 — dedicated UPDATE cue field (was implicit; now explicit so
  // templates that fire playSound('TRANSITION') can read it directly).
  if (!hasField('audioUpdateCue')) {
    additions.push({ id: 'audioUpdateCue', label: 'مؤثر التحديث', type: 'text', value: '' });
  }

  return additions;
};

/**
 * Field group ordering. When the editor renders fields by group, this
 * order is used so every template feels consistent.
 */
export const FIELD_GROUP_ORDER = [
  'content',     // text, names, numbers, images
  'display',     // size, position, theme
  'transitions', // transitionIn / transitionOut
  'audio',       // soundEnabled / soundVolume / soundInStyle / soundOutStyle
  'advanced',    // raw / debug / template-specific
] as const;

export type FieldGroup = typeof FIELD_GROUP_ORDER[number];

/**
 * Pure helper. Returns deduplicated fields, keeping the first occurrence
 * of each id. Subsequent duplicates are dropped. Emits a console warn in
 * dev for traceability.
 */
export const dedupeFields = (fields: OverlayField[]): OverlayField[] => {
  const seen = new Set<string>();
  const out: OverlayField[] = [];
  for (const f of fields) {
    if (seen.has(f.id)) {
      // Helpful trace in dev only; never throws.
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[dedupeFields] duplicate field id "${f.id}" dropped`);
      }
      continue;
    }
    seen.add(f.id);
    out.push(f);
  }
  return out;
};

/**
 * Identify which group a field belongs to. Conservative: defaults to
 * 'content' for unknown ids, keeping current behavior intact.
 */
export const fieldGroup = (id: string): FieldGroup => {
  if (
    id === 'transitionIn' || id === 'transitionOut' ||
    id === 'transitionEffect' || id === 'transitionSpeedMs' ||
    id === 'transitionIntensity' || id === 'broadcastMotion' ||
    id === 'mondialMotionPreset'
  ) return 'transitions';
  if (
    id === 'soundEnabled' || id === 'soundVolume' ||
    id === 'soundInStyle' || id === 'soundOutStyle' ||
    id === 'sfxEnabled' || id === 'voiceEnabled' ||
    id === 'voiceLibraryId' || id === 'voiceDirectUrl' ||
    id === 'voiceTrigger' || id === 'voiceVolume' ||
    id === 'duckSfx' || id === 'audioSceneId' ||
    id === 'audioUpdateCue' ||
    id === 'primaryCustomUrl' || id === 'secondaryCustomUrl' ||
    id === 'customVoiceUrl' ||
    id === 'musicEnabled' || id === 'musicTrackUrl' ||
    id === 'musicVolume' || id === 'musicLoop'
  ) return 'audio';
  if (
    id === 'scale' || id === 'positionX' || id === 'positionY' ||
    id === 'containerWidth' || id === 'sidebarWidth' ||
    id === 'themePreset' || id === 'visualTheme' || id === 'mediaTheme' ||
    id === 'designStyle' || id === 'visualStyle' || id === 'visualVariant' ||
    id === 'playerStatsVisualVariant' || id === 'broadcastLook' ||
    id === 'broadcastStyle' || id === 'broadcastPalette' ||
    id === 'mondialTheme' || id === 'displayMode' || id === 'position' ||
    id === 'playerStatsMode' ||
    id === 'panelSide' || id === 'playerPanelSide' || id === 'scorebugPosition' ||
    id === 'varPosition' || id === 'lineupSide' || id === 'lineupLayoutMode' ||
    id === 'lineupDirection' || id === 'lineupBoardStyle' ||
    id === 'lineupNameMode' || id === 'lineupPhotoMode' ||
    id === 'lineupShowBench' || id === 'groupWallLayout' ||
    id === 'identityColumns' || id === 'matrixLayout' || id === 'badgeMode' ||
    id === 'activePosition' || id === 'focusMode' || id === 'speakerMode' ||
    id === 'statementDensity' || id === 'statementLayout' || id === 'motionMode' ||
    id === 'statsViewMode' || id === 'statFocus' ||
    id === 'scorerViewMode' || id === 'scorerCardStyle' || id === 'scorerMetric' || id === 'playerCardMode' ||
    id === 'reportViewMode' || id === 'analysisViewMode' ||
    id === 'matchStatsDisplayMode' || id === 'playerStatsLayoutMode'
  ) return 'display';
  if (
    id.endsWith('Json') || id.startsWith('include') ||
    id === 'manualJson' || id === 'apiUrl' || id === 'bridgeApiUrl' ||
    id === 'sourceMatchUrl' || id === 'playerImageMapJson' ||
    id === 'playerImageCacheUrl' || id === 'manualRefreshNonce' ||
    id === 'pollIntervalSec' || id === 'liveRefreshEnabled' ||
    id === 'dataSourceName' || id === 'dataMode' || id === 'providerPolicy' ||
    id === 'playerStatsDataMode' || id === 'playerStatsApiUrl' ||
    id === 'playerStatsPollSec' || id === 'statsData' ||
    id === 'matchPickMode' || id === 'matchGroupCode' || id === 'matchRoundStage' ||
    id === 'matchStatusFilter' || id === 'selectedMatchId'
  ) return 'advanced';
  return 'content';
};

/**
 * Stable-sort fields so display order is consistent across templates.
 * Order:
 *   1. Content fields (in their original order)
 *   2. Display fields
 *   3. Transitions
 *   4. Audio
 *   5. Advanced
 *
 * Within a group, original order is preserved.
 */
export const normalizeTemplateFields = (fields: OverlayField[]): OverlayField[] => {
  const deduped = dedupeFields(fields);
  const groups: Record<FieldGroup, OverlayField[]> = {
    content: [], display: [], transitions: [], audio: [], advanced: [],
  };
  for (const f of deduped) groups[fieldGroup(f.id)].push(f);
  return [
    ...groups.content,
    ...groups.display,
    ...groups.transitions,
    ...groups.audio,
    ...groups.advanced,
  ];
};

const withBroadcastControls = (template: OverlayConfig): OverlayConfig => ({
  ...template,
  fields: normalizeTemplateFields([...template.fields, ...createBroadcastControlFields(template.fields)]),
});

const broadcastMotionPreset = (
  transitionIn: string,
  transitionOut: string,
  soundInStyle: string,
  soundOutStyle = 'BROADCAST_OUT',
): OverlayField[] => [
  { id: 'transitionIn', label: 'انتقال الظهور', type: 'select', value: transitionIn, options: BROADCAST_TRANSITION_OPTIONS },
  { id: 'transitionOut', label: 'انتقال الإخفاء', type: 'select', value: transitionOut, options: BROADCAST_EXIT_OPTIONS },
  { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
  { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.75, min: 0, max: 3, step: 0.05 },
  { id: 'soundInStyle', label: 'مؤثر الظهور', type: 'select', value: soundInStyle, options: BROADCAST_SOUND_OPTIONS },
  { id: 'soundOutStyle', label: 'مؤثر الإخفاء', type: 'select', value: soundOutStyle, options: BROADCAST_SOUND_OPTIONS },
];

const LAPORTA_PRESET = ELECTION_ENTITY_PRESETS.LAPORTA;
const FONT_PRESET = ELECTION_ENTITY_PRESETS.FONT;

type ElectionTemplateOptions = {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  designStyle: string;
  headline?: string;
  subheadline?: string;
  statusBadge?: string;
  phaseLabel?: string;
  sourceLabel?: string;
  specialText?: string;
  statementAuthor?: string;
  positionX?: number;
  positionY?: number;
  scale?: number;
  themePreset?: string;
  soundInStyle: string;
  soundOutStyle: string;
};

const createElectionTemplate = ({
  id,
  name,
  description,
  icon,
  accent,
  designStyle,
  headline = 'انتخابات برشلونة 2026',
  subheadline = 'تغطية لحظية مباشرة لسباق رئاسة نادي برشلونة',
  statusBadge = 'LIVE',
  phaseLabel = 'Live count',
  sourceLabel = 'Barcelona Elections Center',
  specialText = 'لابورتا يؤكد أن السباق ما زال مفتوحاً مع ارتفاع معدل المشاركة في الساعات الأخيرة.',
  statementAuthor = 'خوان لابورتا',
  positionX = 0,
  positionY = 0,
  scale = 1,
  themePreset = 'BARCA_RED',
  soundInStyle,
  soundOutStyle,
}: ElectionTemplateOptions): OverlayConfig => ({
  id,
  templateId: id,
  templateDescription: description,
  templateIcon: icon,
  templateAccent: accent,
  templateGroup: 'BARCELONA_2026',
  name,
  type: OverlayType.ELECTION,
  isVisible: false,
  theme: {
    primaryColor: '#a50044',
    secondaryColor: '#004d98',
    backgroundColor: 'transparent',
    fontFamily: 'Tajawal'
  },
  slots: {},
  fields: [
    ...commonFields,
    { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: headline },
    { id: 'subheadline', label: 'العنوان التوضيحي', type: 'text', value: subheadline },
    { id: 'watermarkText', label: 'الحقوق', type: 'text', value: 'REO SHOW' },
    { id: 'statusBadge', label: 'شارة الحالة', type: 'text', value: statusBadge },
    { id: 'phaseLabel', label: 'مرحلة التغطية', type: 'text', value: phaseLabel },
    { id: 'sourceLabel', label: 'المصدر', type: 'text', value: sourceLabel },
    { id: 'lastUpdated', label: 'آخر تحديث', type: 'text', value: 'آخر تحديث 20:45' },
    { id: 'designStyle', label: 'التصميم (الستايل)', type: 'select', value: designStyle, options: ELECTION_DESIGN_STYLE_OPTIONS },
    { id: 'themePreset', label: 'اللون الأساسي', type: 'select', value: themePreset, options: ['BARCA_RED', 'BARCA_BLUE', 'ROYAL_GOLD', 'DARK_MATTER'] },
    { id: 'barcaLogo', label: 'شعار برشلونة', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png' },
    { id: 'scale', label: 'حجم القالب', type: 'range', value: scale, min: 0.5, max: 1.8, step: 0.05 },
    { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: positionY, min: -700, max: 700, step: 10 },
    { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: positionX, min: -1200, max: 1200, step: 10 },
    { id: 'currentVoters', label: 'عدد المصوتين الحالي', type: 'number', value: 25000 },
    { id: 'totalVoters', label: 'إجمالي الناخبين', type: 'number', value: 114504 },
    { id: 'turnoutTitle', label: 'عنوان الإقبال', type: 'text', value: 'نسبة المشاركة' },
    { id: 'turnoutSubtitle', label: 'العنوان الفرعي للإقبال', type: 'text', value: 'إجمالي هيئة التصويت' },
    { id: 'currentVotersTitle', label: 'عنوان المصوتين الحاليين', type: 'text', value: 'المصوتون حتى الآن' },
    createElectionCandidateProfileField(1, 'LAPORTA'),
    { id: 'candidate1Name', label: 'اسم المرشح 1', type: 'text', value: LAPORTA_PRESET.name },
    { id: 'candidate1Image', label: 'صورة المرشح 1', type: 'image', value: LAPORTA_PRESET.image },
    { id: 'candidate1Percent', label: 'نسبة المرشح 1 (%)', type: 'range', value: 52, min: 0, max: 100, step: 0.1 },
    { id: 'candidate1Votes', label: 'أصوات المرشح 1', type: 'number', value: 48310 },
    { id: 'candidate1Delta', label: 'تغير المرشح 1 (%)', type: 'number', value: 2.6 },
    { id: 'candidate1Tag', label: 'وصف المرشح 1', type: 'text', value: LAPORTA_PRESET.tag },
    { id: 'candidate1Color', label: 'لون المرشح 1', type: 'color', value: LAPORTA_PRESET.color },
    createElectionCandidateProfileField(2, 'FONT'),
    { id: 'candidate2Name', label: 'اسم المرشح 2', type: 'text', value: FONT_PRESET.name },
    { id: 'candidate2Image', label: 'صورة المرشح 2', type: 'image', value: FONT_PRESET.image },
    { id: 'candidate2Percent', label: 'نسبة المرشح 2 (%)', type: 'range', value: 39, min: 0, max: 100, step: 0.1 },
    { id: 'candidate2Votes', label: 'أصوات المرشح 2', type: 'number', value: 36140 },
    { id: 'candidate2Delta', label: 'تغير المرشح 2 (%)', type: 'number', value: -1.4 },
    { id: 'candidate2Tag', label: 'وصف المرشح 2', type: 'text', value: FONT_PRESET.tag },
    { id: 'candidate2Color', label: 'لون المرشح 2', type: 'color', value: FONT_PRESET.color },
    { id: 'showUndecided', label: 'إظهار غير المحسوم', type: 'boolean', value: true },
    { id: 'undecidedLabel', label: 'اسم غير المحسوم', type: 'text', value: 'آخرون / غير محسوم' },
    { id: 'undecidedPercent', label: 'نسبة غير المحسوم (%)', type: 'range', value: 9, min: 0, max: 100, step: 0.1 },
    { id: 'undecidedColor', label: 'لون غير المحسوم', type: 'color', value: '#94a3b8' },
    { id: 'targetDate', label: 'تاريخ النهاية (YYYY-MM-DD HH:mm)', type: 'text', value: '2026-06-30 20:00' },
    { id: 'countdownTitle', label: 'عنوان العداد', type: 'text', value: 'العد التنازلي للإغلاق' },
    { id: 'countdownDays', label: 'نص الأيام', type: 'text', value: 'أيام' },
    { id: 'countdownHours', label: 'نص الساعات', type: 'text', value: 'ساعات' },
    { id: 'countdownMinutes', label: 'نص الدقائق', type: 'text', value: 'دقائق' },
    { id: 'countdownSeconds', label: 'نص الثواني', type: 'text', value: 'ثوان' },
    { id: 'specialText', label: 'نص المحتوى', type: 'textarea', value: specialText },
    { id: 'statementAuthor', label: 'صاحب الاقتباس', type: 'text', value: statementAuthor },
    ...createElectionStatementFields('CANDIDATE_1'),
    { id: 'leaksTitle', label: 'عنوان التدفق العاجل', type: 'text', value: 'عاجل' },
    { id: 'leaksSubtitle', label: 'عنوان فرعي', type: 'text', value: 'مكتب الانتخابات' },
    { id: 'leaksContent', label: 'نص الخبر العاجل', type: 'textarea', value: specialText },
    { id: 'statementTitle', label: 'عنوان الاقتباس', type: 'text', value: 'تصريح بارز' },
    { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
    { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.05 },
    { id: 'soundInStyle', label: 'مؤثر الإدخال', type: 'select', value: soundInStyle, options: ELECTION_SOUND_OPTIONS },
    { id: 'soundOutStyle', label: 'مؤثر الإخراج', type: 'select', value: soundOutStyle, options: ELECTION_SOUND_OPTIONS },
  ],
});

const BARCELONA_ELECTION_TEMPLATES: OverlayConfig[] = [
  createElectionTemplate({
    id: 'template-election-results-bar',
    name: 'برشلونة 2026 - شريط النتائج',
    description: 'شريط نتائج سفلي حديث للبث المباشر مع نسب المرشحين والأصوات وآخر تحديث.',
    icon: 'BAR',
    accent: '#edb111',
    designStyle: 'RESULTS_HUB',
    statusBadge: 'RESULTS',
    phaseLabel: 'Live count',
    soundInStyle: 'RESULTS_STING',
    soundOutStyle: 'SOFT_FADE',
  }),
  createElectionTemplate({
    id: 'template-election-quote-panel',
    name: 'برشلونة 2026 - بطاقة اقتباس',
    description: 'بطاقة اقتباس مدمجة بصورة المرشح ونص كبير مناسب للمداخلات والتصريحات.',
    icon: 'QTE',
    accent: '#38bdf8',
    designStyle: 'STATEMENT_FULL',
    headline: 'تصريحات انتخابات برشلونة 2026',
    subheadline: 'تصميم اقتباس مخصص للنصوص المهمة داخل البث المباشر',
    statusBadge: 'QUOTE',
    phaseLabel: 'Statement',
    specialText: 'هذه ليست ليلة أرقام فقط، بل لحظة تحديد اتجاه برشلونة لسنوات قادمة.',
    statementAuthor: 'خوان لابورتا',
    soundInStyle: 'QUOTE_SWEEP',
    soundOutStyle: 'SOFT_FADE',
  }),
  createElectionTemplate({
    id: 'template-election-versus-panel',
    name: 'برشلونة 2026 - مواجهة المرشحين',
    description: 'لوحة مواجهة ثنائية حديثة بين المرشحين مع نسب ودلتا وأسلوب بصري مناسب للبث.',
    icon: 'VS',
    accent: '#f8fafc',
    designStyle: 'SPLIT_BAR_LEFT',
    statusBadge: 'RACE',
    phaseLabel: 'Head to head',
    soundInStyle: 'VERSUS_IMPACT',
    soundOutStyle: 'SOFT_FADE',
  }),
  createElectionTemplate({
    id: 'template-election-sidebar-tower',
    name: 'برشلونة 2026 - برج جانبي',
    description: 'لوحة عمودية على يمين الشاشة لعرض النسب والحالة والمشاركة بدون حجب البث.',
    icon: 'SIDE',
    accent: '#60a5fa',
    designStyle: 'RESULTS_HUB',
    statusBadge: 'LIVE',
    phaseLabel: 'Sidebar',
    soundInStyle: 'SIDEBAR_CHIME',
    soundOutStyle: 'SOFT_FADE',
    scale: 0.95,
  }),
  createElectionTemplate({
    id: 'template-election-turnout-strip',
    name: 'برشلونة 2026 - شريط الإقبال',
    description: 'شريط بيانات سريع لعرض نسبة المشاركة والوقت الحالي مناسب مع بقية القوالب.',
    icon: 'TURN',
    accent: '#22c55e',
    designStyle: 'VOTER_TURNOUT',
    headline: 'مشاركة أعضاء برشلونة 2026',
    subheadline: 'تحديث سريع لنسبة الإقبال في الانتخابات',
    statusBadge: 'TURNOUT',
    phaseLabel: 'Data',
    soundInStyle: 'DATA_PULSE',
    soundOutStyle: 'SOFT_FADE',
  }),
];

const FOOTBALL_BROADCAST_TEMPLATES: OverlayConfig[] = [
  {
    id: 'template-football-world-scorebug',
    templateId: 'template-football-world-scorebug',
    name: 'كروي عالمي — شريط النتيجة العلوي',
    type: OverlayType.SCOREBOARD,
    isVisible: false,
    templateIcon: 'SBUG',
    templateAccent: '#00a86b',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'لوحة نتيجة علوية مدمجة مناسبة للبث المباشر، بتوقيت واضح واختصارات الفرق وشارة مباشر.',
    theme: { primaryColor: '#00a86b', secondaryColor: '#101820', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'competition', label: 'اسم البطولة', type: 'text', value: 'مباراة عالمية مباشرة' },
      { id: 'matchStatus', label: 'حالة المباراة', type: 'text', value: 'مباشر' },
      { id: 'homeName', label: 'الفريق المضيف', type: 'text', value: 'Barcelona' },
      { id: 'awayName', label: 'الفريق الضيف', type: 'text', value: 'Madrid' },
      { id: 'homeShort', label: 'اختصار المضيف', type: 'text', value: 'BAR' },
      { id: 'awayShort', label: 'اختصار الضيف', type: 'text', value: 'MAD' },
      { id: 'homeScore', label: 'نتيجة المضيف', type: 'number', value: 2 },
      { id: 'awayScore', label: 'نتيجة الضيف', type: 'number', value: 1 },
      { id: 'period', label: 'الشوط', type: 'text', value: 'الشوط الثاني' },
      { id: 'time', label: 'الوقت', type: 'text', value: '74:30' },
      { id: 'homeLogo', label: 'شعار المضيف', type: 'image', value: 'https://ui-avatars.com/api/?name=BAR&background=101820&color=ffffff&size=256&bold=true' },
      { id: 'awayLogo', label: 'شعار الضيف', type: 'image', value: 'https://ui-avatars.com/api/?name=MAD&background=111827&color=ffffff&size=256&bold=true' },
      { id: 'designStyle', label: 'النمط', type: 'select', value: 'WORLD_FEED', options: ['WORLD_FEED', 'PREMIUM_BAR', 'CLASSIC', 'MODERN', 'DARK'] },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'WORLD_FEED', options: ['WORLD_FEED', 'ELITE_SILVER', 'MATCH_NIGHT', 'TACTICAL_BLUE', 'PITCH_GREEN', 'ROYAL_GOLD'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.05, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      ...broadcastMotionPreset('SCOREBUG_SNAP', 'SCOREBUG_SNAP_OUT', 'SCOREBUG_SNAP', 'BROADCAST_OUT'),
    ],
  },
  {
    id: 'template-football-premium-matchbar',
    templateId: 'template-football-premium-matchbar',
    name: 'كروي عالمي — شريط المباراة الفاخر',
    type: OverlayType.SCOREBOARD,
    isVisible: false,
    templateIcon: 'MBAR',
    templateAccent: '#f5c518',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'شريط نتيجة سفلي عريض بتوازن بصري مناسب للمباريات الكبيرة والاستوديو التحليلي.',
    theme: { primaryColor: '#cbd5e1', secondaryColor: '#111827', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'competition', label: 'اسم البطولة', type: 'text', value: 'ليلة كروية نخبوية' },
      { id: 'matchStatus', label: 'حالة المباراة', type: 'text', value: 'يوم المباراة مباشر' },
      { id: 'homeName', label: 'الفريق المضيف', type: 'text', value: 'Al Hilal' },
      { id: 'awayName', label: 'الفريق الضيف', type: 'text', value: 'Al Nassr' },
      { id: 'homeShort', label: 'اختصار المضيف', type: 'text', value: 'HIL' },
      { id: 'awayShort', label: 'اختصار الضيف', type: 'text', value: 'NAS' },
      { id: 'homeScore', label: 'نتيجة المضيف', type: 'number', value: 1 },
      { id: 'awayScore', label: 'نتيجة الضيف', type: 'number', value: 1 },
      { id: 'period', label: 'الشوط', type: 'text', value: 'استراحة بين الشوطين' },
      { id: 'time', label: 'الوقت', type: 'text', value: '45:00' },
      { id: 'homeLogo', label: 'شعار المضيف', type: 'image', value: 'https://ui-avatars.com/api/?name=HIL&background=0f172a&color=ffffff&size=256&bold=true' },
      { id: 'awayLogo', label: 'شعار الضيف', type: 'image', value: 'https://ui-avatars.com/api/?name=NAS&background=18181b&color=ffffff&size=256&bold=true' },
      { id: 'designStyle', label: 'النمط', type: 'select', value: 'PREMIUM_BAR', options: ['PREMIUM_BAR', 'WORLD_FEED', 'CLASSIC', 'MODERN', 'DARK'] },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'ELITE_SILVER', options: ['ELITE_SILVER', 'WORLD_FEED', 'MATCH_NIGHT', 'TACTICAL_BLUE', 'ROYAL_GOLD'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'STADIUM_WHOOSH', 'BROADCAST_OUT'),
    ],
  },
  {
    id: 'template-football-var-alert',
    templateId: 'template-football-var-alert',
    name: 'كروي عالمي — تنبيه حكم الفيديو',
    type: OverlayType.EXCLUSIVE_ALERT,
    isVisible: false,
    templateIcon: 'VAR',
    templateAccent: '#f97316',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'تنبيه حكم الفيديو أو قرار مهم بظهور قوي وصوت مميز دون الاعتماد على ملفات خارجية.',
    theme: { primaryColor: '#f97316', secondaryColor: '#18181b', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'النص الرئيسي', type: 'text', value: 'VAR' },
      { id: 'subHeadline', label: 'النص الفرعي', type: 'text', value: 'مراجعة ركلة جزاء محتملة' },
      { id: 'position', label: 'الموقع', type: 'select', value: 'RIGHT', options: ['RIGHT', 'LEFT'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.25, min: 0.5, max: 3.0, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 40, min: -1000, max: 1000, step: 10 },
      { id: 'useTTS', label: 'تفعيل النطق الصوتي', type: 'boolean', value: false },
      { id: 'ttsText', label: 'نص النطق الصوتي', type: 'text', value: 'قرار من حكم الفيديو' },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'MATCH_NIGHT', options: ['MATCH_NIGHT', 'CLASSIC_RED', 'ROYAL_GOLD', 'TACTICAL_BLUE'] },
      ...broadcastMotionPreset('SPOTLIGHT_POP', 'SPOTLIGHT_POP_OUT', 'VAR_BUZZ', 'BROADCAST_OUT'),
    ],
  },
  {
    id: 'template-football-broadcast-lower',
    templateId: 'template-football-broadcast-lower',
    name: 'كروي عالمي - تعريف محلل',
    type: OverlayType.LOWER_THIRD,
    isVisible: false,
    templateIcon: 'LOW3',
    templateAccent: '#22d3ee',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'شريط تعريفي زجاجي لمحلل أو مراسل أو لاعب، مناسب للظهور السريع أثناء المباراة.',
    theme: { primaryColor: '#14b8a6', secondaryColor: '#18181b', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'name', label: 'الاسم', type: 'text', value: 'سامي الجابر' },
      { id: 'role', label: 'الدور', type: 'text', value: 'محلل تكتيكي' },
      { id: 'strapline', label: 'الشريط العلوي', type: 'text', value: 'طاولة التحليل' },
      { id: 'teamBadge', label: 'شارة الفريق/القناة', type: 'image', value: 'https://ui-avatars.com/api/?name=TV&background=14b8a6&color=ffffff&size=256&bold=true' },
      { id: 'designStyle', label: 'النمط', type: 'select', value: 'BROADCAST_GLASS', options: ['BROADCAST_GLASS', 'CLASSIC', 'MODERN', 'MINIMAL'] },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'MATCH_NIGHT', options: ['MATCH_NIGHT', 'WORLD_FEED', 'ELITE_SILVER', 'TACTICAL_BLUE', 'ROYAL_GOLD'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      ...broadcastMotionPreset('LOWER_THIRD_WIPE', 'LOWER_THIRD_WIPE_OUT', 'LOWER_THIRD_WIPE', 'SOFT_FADE'),
    ],
  },
  {
    id: 'template-football-match-ticker',
    templateId: 'template-football-match-ticker',
    name: 'كروي عالمي — شريط أخبار المباراة',
    type: OverlayType.TICKER,
    isVisible: false,
    templateIcon: 'TICK',
    templateAccent: '#00a86b',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'شريط أخبار كروي سريع للأهداف والتبديلات والبطاقات وتصريحات ما بعد المباراة.',
    theme: { primaryColor: '#00a86b', secondaryColor: '#101820', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'competition', label: 'اسم المركز', type: 'text', value: 'مركز المباراة' },
      { id: 'headline', label: 'عنوان الشريط', type: 'text', value: 'تحديث المباراة' },
      { id: 'content', label: 'نص الشريط', type: 'text', value: 'هدف رائع في الدقيقة 74 بعد هجمة منظمة من الجهة اليسرى، والجهاز الفني يجهز التبديل الأول.' },
      { id: 'designStyle', label: 'النمط', type: 'select', value: 'MATCH_FEED', options: ['MATCH_FEED', 'CLASSIC'] },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'WORLD_FEED', options: ['WORLD_FEED', 'MATCH_NIGHT', 'CLASSIC_RED', 'TACTICAL_BLUE', 'ROYAL_GOLD'] },
      { id: 'scrollSpeed', label: 'سرعة التمرير', type: 'range', value: 15, min: 1, max: 30, step: 1 },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      ...broadcastMotionPreset('DATA_RUSH', 'DATA_RUSH_OUT', 'DATA_TICK', 'BROADCAST_OUT'),
    ],
  },
  {
    id: 'template-football-smart-match-stats',
    templateId: 'template-football-smart-match-stats',
    name: 'استوديو التحليلات الذكي — إحصائيات المباراة',
    type: OverlayType.MATCH_STATS,
    isVisible: false,
    templateIcon: '📊',
    templateAccent: '#3b82f6',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'استوديو بيانات ذكي يعتمد على مصدر مباراة مباشر، يحسب تلقائياً مؤشر الهيمنة، اللاعب المؤثر والمواجهات الثنائية.',
    theme: { primaryColor: '#3b82f6', secondaryColor: '#ef4444', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'dataMode', label: 'مصدر بيانات المباراة', type: 'select', value: 'CLOUD_BRIDGE', options: [
        { value: 'CLOUD_BRIDGE', label: 'بيانات REO المباشرة' },
        { value: 'BRIDGE', label: 'جسر مخصص' },
        { value: 'PASTE_JSON', label: 'JSON يدوي / ملف الاستخراج' },
        { value: 'DEMO', label: 'بيانات تجريبية للاختبار' },
      ] },
      { id: 'manualJson', label: 'JSON المباراة المستورد', type: 'textarea', value: '' },
      { id: 'pollIntervalSec', label: 'تحديث القالب من الجسر كل ثانية', type: 'range', value: 30, min: 10, max: 60, step: 5 },
      { id: 'statsRotateSec', label: 'تبديل مجموعات الإحصائيات كل ثانية', type: 'range', value: 30, min: 10, max: 90, step: 5 },
      { id: 'themePreset', label: 'ثيم إحصائيات المباراة', type: 'select', value: 'BROADCAST_BLUE', options: [
        { value: 'BROADCAST_BLUE', label: 'Broadcast Blue' },
        { value: 'WORLD_CUP_NEON', label: 'World Cup Neon' },
        { value: 'PITCH_GREEN', label: 'Pitch Green' },
        { value: 'NIGHT_GOLD', label: 'Night Gold' },
        { value: 'DERBY_RED', label: 'Derby Red' },
        { value: 'CLEAN_STUDIO', label: 'Clean Studio' },
      ] },
      { id: 'matchStatsDisplayMode', label: 'وضع عرض إحصائيات المباراة', type: 'select', value: 'FULL_COMMAND', options: [
        { value: 'FULL_COMMAND', label: 'مركز تحكم كامل' },
        { value: 'TEAM_STATS_ONLY', label: 'إحصائيات الفرق فقط' },
        { value: 'PLAYER_IMPACT', label: 'تركيز تأثير اللاعب' },
        { value: 'TIMELINE_FLOW', label: 'الأحداث مع الإحصائيات' },
      ] },
      { id: 'matchMetricPreset', label: 'تركيز إحصائيات المباراة', type: 'select', value: 'SMART', options: [
        { value: 'SMART', label: 'ذكي بدون تكرار' },
        { value: 'ALL', label: 'كل الإحصائيات' },
        { value: 'CONTROL', label: 'السيطرة والنسق' },
        { value: 'ATTACK', label: 'الهجوم والتسديد' },
        { value: 'PASSING', label: 'البناء والتمرير' },
        { value: 'DEFENSE', label: 'الدفاع والاسترجاع' },
        { value: 'DISCIPLINE', label: 'الحراسة والانضباط' },
      ] },
      { id: 'showPlayerTicker', label: 'إظهار لوحة إحصائيات اللاعبين', type: 'boolean', value: true },
      { id: 'playerRotateSec', label: 'تبديل فئة اللاعبين كل ثانية', type: 'range', value: 30, min: 15, max: 120, step: 5 },
      { id: 'showScorebug', label: 'إظهار شريط النتيجة', type: 'boolean', value: true },
      { id: 'showEvents', label: 'إظهار أحداث المباراة', type: 'boolean', value: true },
      { id: 'showKeyBattle', label: 'إظهار المواجهة الأبرز', type: 'boolean', value: true },
      { id: 'showAdvancedStats', label: 'إظهار الإحصائيات المتقدمة', type: 'boolean', value: true },
      { id: 'panelSide', label: 'مكان لوحة المباراة', type: 'select', value: 'LEFT', options: [
        { value: 'RIGHT', label: 'يمين الشاشة' },
        { value: 'LEFT', label: 'يسار الشاشة' },
      ] },
      { id: 'playerPanelSide', label: 'مكان لوحة اللاعبين', type: 'select', value: 'RIGHT', options: [
        { value: 'RIGHT', label: 'يمين الشاشة' },
        { value: 'LEFT', label: 'يسار الشاشة' },
      ] },
      { id: 'visualStyle', label: 'نمط تصميم القالب', type: 'select', value: 'DUAL_RAIL', options: [
        { value: 'DUAL_RAIL', label: 'سكتان مزدوجتان' },
        { value: 'TACTICAL_SPLIT', label: 'تقسيم تكتيكي' },
        { value: 'DATA_TOWER', label: 'برج البيانات' },
        { value: 'COMPACT_BROADCAST', label: 'بث مدمج' },
        { value: 'GLASS_STUDIO', label: 'استوديو زجاجي' },
        { value: 'NEON_TOUCHLINE', label: 'خط تماس نيون' },
      ] },
      { id: 'playerMetricPreset', label: 'تركيز لوحة اللاعبين', type: 'select', value: 'SMART', options: [
        { value: 'SMART', label: 'ذكي بدون تكرار' },
        { value: 'ALL', label: 'كل الفئات' },
        { value: 'PASSING', label: 'تمرير وصناعة' },
        { value: 'ATTACK', label: 'هجوم وتسديد' },
        { value: 'DEFENSE', label: 'دفاع واسترجاع' },
        { value: 'KEEPER', label: 'تصديات الحراس' },
      ] },
      { id: 'teamStatsSide', label: 'ترتيب جهات إحصائيات الفريقين', type: 'select', value: 'HOME_LEFT', options: [
        { value: 'HOME_LEFT', label: 'المضيف يسار / الضيف يمين' },
        { value: 'AWAY_LEFT', label: 'الضيف يسار / المضيف يمين' },
      ] },
      { id: 'enablePanelTransitions', label: 'تفعيل انتقالات اللوحات', type: 'boolean', value: false },
      { id: 'broadcastMotion', label: 'حركة خفيفة داخل القالب', type: 'boolean', value: true },
      { id: 'broadcastQuality', label: 'دقة العرض للبث', type: 'select', value: 'ULTRA', options: [
        { value: 'ULTRA', label: 'بث فائق' },
        { value: 'STANDARD', label: 'قياسي' },
      ] },
      { id: 'matchPanelScale', label: 'مقياس لوحة المباراة', type: 'range', value: 1, min: 0.65, max: 1.6, step: 0.05 },
      { id: 'playerPanelScale', label: 'مقياس لوحة اللاعبين', type: 'range', value: 1, min: 0.65, max: 1.6, step: 0.05 },
      { id: 'showCreatorBadge', label: 'إظهار مربع صانع المحتوى', type: 'boolean', value: true },
      { id: 'creatorName', label: 'اسم صانع المحتوى', type: 'text', value: 'REO Live' },
      { id: 'creatorHandle', label: 'معرف صانع المحتوى', type: 'text', value: '@reo_live' },
      { id: 'creatorLabel', label: 'عنوان مربع صانع المحتوى', type: 'text', value: 'صانع محتوى' },
      { id: 'creatorAvatar', label: 'صورة صانع المحتوى', type: 'image', value: '' },
      { id: 'creatorBadgeScale', label: 'مقياس مربع صانع المحتوى', type: 'range', value: 1, min: 0.55, max: 1.6, step: 0.05 },
      { id: 'creatorPositionX', label: 'إزاحة مربع صانع المحتوى X', type: 'range', value: 0, min: -760, max: 760, step: 10 },
      { id: 'creatorPositionY', label: 'إزاحة مربع صانع المحتوى Y', type: 'range', value: 0, min: -420, max: 420, step: 10 },
      { id: 'playerImageMapJson', label: 'روابط صور اللاعبين JSON', type: 'textarea', value: '{}' },
      { id: 'playerImageCacheUrl', label: 'رابط كاش صور اللاعبين JSON', type: 'text', value: '/player-image-cache/barcelona.json?v=20260515;/player-image-cache/chelsea.json?v=20260515' },
      { id: 'dataSourceName', label: 'اسم مصدر البيانات الظاهر', type: 'text', value: 'بيانات REO المباشرة' },
      { id: 'sourceMatchUrl', label: 'رابط مصدر المباراة للتشغيل المباشر', type: 'text', value: 'https://www.whoscored.com/matches/1914233/live/spain-laliga-2025-2026-villarreal-sevilla' },
      { id: 'apiUrl', label: 'رابط API بيانات المباراة', type: 'text', value: '/api/reo-match?action=match' },
      { id: 'homeColor', label: 'لون المضيف', type: 'color', value: '#3b82f6' },
      { id: 'awayColor', label: 'لون الضيف', type: 'color', value: '#ef4444' },
      { id: 'showDominance', label: 'إظهار مؤشر الهيمنة', type: 'boolean', value: true },
      { id: 'showMotm', label: 'إظهار اللاعب المؤثر', type: 'boolean', value: true },
      { id: 'showTopStats', label: 'إظهار أفضل 5 (ممرين/قاطعين)', type: 'boolean', value: true },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
    ],
  },
  {
    id: 'template-football-player-stats-lab',
    templateId: 'template-football-player-stats-lab',
    name: 'مختبر إحصائيات اللاعب — بطاقة لاعب',
    type: OverlayType.PLAYER_STATS,
    isVisible: false,
    templateIcon: 'PLYR',
    templateAccent: '#22d3ee',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'قالب بث حديث لإحصائيات اللاعبين: لاعب واحد، مقارنة لاعبين، أو قائمة مراقبة بثلاثة لاعبين مع جلب من جسر بيانات اللاعبين وكاش صور بجودتين.',
    theme: { primaryColor: '#22d3ee', secondaryColor: '#fb7185', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'playerStatsDataMode', label: 'مصدر بيانات اللاعب', type: 'select', value: 'MANUAL', options: [
        { value: 'MANUAL', label: 'يدوي / من صندوق الذكاء' },
        { value: 'CLOUD_BRIDGE', label: 'بيانات REO للاعبين' },
      ] },
      { id: 'playerStatsMode', label: 'وضع القالب', type: 'select', value: 'SINGLE', options: [
        { value: 'SINGLE', label: 'لاعب واحد' },
        { value: 'COMPARE', label: 'مقارنة لاعبين' },
        { value: 'SCOUT_SHORTLIST', label: 'بطاقة كشاف / قائمة مراقبة 3 لاعبين' },
      ] },
      { id: 'providerPolicy', label: 'سياسة المصدر', type: 'select', value: 'auto', options: [
        { value: 'auto', label: 'موجِّه تلقائي' },
        { value: 'fbref', label: 'بيانات الموسم أولًا' },
        { value: 'matchBridge', label: 'بيانات المباراة أولًا' },
        { value: 'demo', label: 'وضع تجريبي آمن' },
      ] },
      { id: 'metricPreset', label: 'القالب الذكي', type: 'select', value: 'Attacker Profile', options: [
        { value: 'Attacker Profile', label: 'ملف هجومي' },
        { value: 'Playmaker Profile', label: 'ملف صانع لعب' },
        { value: 'Defensive Profile', label: 'ملف دفاعي' },
        { value: 'Goalkeeper Profile', label: 'ملف حارس مرمى' },
        { value: 'Transfer Scout', label: 'استكشاف انتقالات' },
        { value: 'Barcelona Fit', label: 'ملاءمة برشلونة' },
        { value: 'Head-to-Head Comparison', label: 'مقارنة مباشرة' },
        { value: 'Full Season Report', label: 'تقرير الموسم الكامل' },
      ] },
      { id: 'selectedMetricsJson', label: 'مفاتيح الإحصائيات المختارة', type: 'hidden', value: '["goals","assists","shots","shots_on_target","xg","xa","key_passes","dribbles_completed","touches_in_box","goals_per90","assists_per90","impact_index"]' },
      { id: 'heroMetricsJson', label: 'مفاتيح الإحصائيات الرئيسية', type: 'hidden', value: '["goals","assists","xg","impact_index"]' },
      { id: 'secondaryMetricsJson', label: 'مفاتيح الإحصائيات الثانوية', type: 'hidden', value: '["shots","shots_on_target","key_passes","dribbles_completed","touches_in_box","goals_per90","assists_per90","xa"]' },
      { id: 'hiddenMetricsJson', label: 'مفاتيح الإحصائيات المخفية', type: 'hidden', value: '[]' },
      { id: 'metricNaturalLanguage', label: 'بحث الإحصائيات الطبيعي', type: 'hidden', value: '' },
      { id: 'playerStatsLabUiMode', label: 'وضع لوحة التحكم', type: 'hidden', value: 'easy' },
      { id: 'showUnavailableMetrics', label: 'إظهار غير المتاح', type: 'hidden', value: 'false' },
      { id: 'themePreset', label: 'ثيم بطاقة اللاعب', type: 'select', value: 'CYAN_PINK', options: [
        { value: 'CYAN_PINK', label: 'Cyan Pink' },
        { value: 'NEON_GREEN', label: 'Neon Green' },
        { value: 'ROYAL_GOLD', label: 'Royal Gold' },
        { value: 'BARCA_NIGHT', label: 'Barca Night' },
        { value: 'CLEAN_LIGHT', label: 'Clean Light' },
      ] },
      { id: 'playerStatsLayoutMode', label: 'توزيع إحصائيات اللاعب', type: 'select', value: 'AUTO', options: [
        { value: 'AUTO', label: 'تلقائي حسب النمط' },
        { value: 'HERO_FIRST', label: 'أرقام رئيسية كبيرة' },
        { value: 'METRIC_GRID', label: 'شبكة إحصائيات كثيفة' },
        { value: 'SCOUT_COMPACT', label: 'كشاف مختصر' },
      ] },
      { id: 'playerStatsVisualVariant', label: 'نمط العرض', type: 'select', value: 'CLEAN_BROADCAST', options: [
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
        { value: 'ULTRA_LAB', label: 'مختبر متقدم' },
        { value: 'COMPACT_CARD', label: 'بطاقة مختصرة' },
        { value: 'GLASS_SCOUT', label: 'زجاج استكشافي' },
        { value: 'BARCA_RADAR', label: 'رادار برشلونة' },
        { value: 'MINIMAL_CAST', label: 'بث مينيمال' },
      ] },
      { id: 'titleMode', label: 'لغة العنوان', type: 'select', value: 'arabic', options: [
        { value: 'arabic', label: 'عربي (افتراضي)' },
        { value: 'english', label: 'إنجليزي' },
        { value: 'custom', label: 'مخصص (استخدم الحقل أدناه)' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي (للعنوان المخصص)', type: 'text', value: '' },
      { id: 'subheadline', label: 'السطر المساعد', type: 'text', value: '' },
      { id: 'seasonLabel', label: 'الموسم', type: 'text', value: '2025/26' },
      { id: 'playerStatsApiUrl', label: 'رابط API لجلب إحصائيات اللاعبين', type: 'text', value: '/api/player-stats' },
      { id: 'playerStatsPollSec', label: 'تحديث بيانات اللاعب كل ثانية', type: 'range', value: 60, min: 15, max: 180, step: 5 },
      { id: 'sourcePlayerName', label: 'اسم اللاعب بالعربي أو الإنجليزي للبحث', type: 'text', value: 'ليفاندوفسكي' },
      { id: 'sourceClubName', label: 'النادي للبحث', type: 'text', value: 'Barcelona' },
      { id: 'playerStatsPrompt', label: 'نص الذكاء/ملاحظات البحث', type: 'textarea', value: 'اكتب اسم اللاعب والنادي أو فكرة المقارنة هنا ثم استخدم صندوق الذكاء.' },
      { id: 'includeAttack', label: 'جلب الهجوم والتسديد', type: 'boolean', value: true },
      { id: 'includeShooting', label: 'جلب التسديد المفصل', type: 'boolean', value: true },
      { id: 'includeChanceCreation', label: 'جلب صناعة الفرص', type: 'boolean', value: true },
      { id: 'includePassing', label: 'جلب التمرير والصناعة', type: 'boolean', value: true },
      { id: 'includeDribbling', label: 'جلب المراوغة', type: 'boolean', value: true },
      { id: 'includeDefense', label: 'جلب الدفاع والاسترجاع', type: 'boolean', value: true },
      { id: 'includeDuels', label: 'جلب الالتحامات', type: 'boolean', value: true },
      { id: 'includePossession', label: 'جلب المراوغات والحمل', type: 'boolean', value: true },
      { id: 'includeDiscipline', label: 'جلب الانضباط', type: 'boolean', value: false },
      { id: 'includeGoalkeeping', label: 'جلب إحصاءات الحراسة', type: 'boolean', value: false },
      { id: 'includeSeasonTotals', label: 'إظهار إجمالي الموسم', type: 'boolean', value: true },
      { id: 'includePer90', label: 'إظهار متوسط لكل 90 دقيقة', type: 'boolean', value: true },
      { id: 'includeAdvanced', label: 'جلب مؤشرات متقدمة', type: 'boolean', value: true },
      { id: 'playerAName', label: 'اسم اللاعب الأول', type: 'text', value: 'Robert Lewandowski' },
      { id: 'playerAClub', label: 'نادي اللاعب الأول', type: 'text', value: 'Barcelona' },
      { id: 'playerAPosition', label: 'مركز اللاعب الأول', type: 'text', value: 'ST / Forward' },
      { id: 'playerAImage', label: 'صورة اللاعب الأول', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Robert%20Lewandowski.png' },
      { id: 'playerAClubLogo', label: 'شعار نادي اللاعب الأول', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'playerBName', label: 'اسم اللاعب الثاني', type: 'text', value: 'Cole Palmer' },
      { id: 'playerBClub', label: 'نادي اللاعب الثاني', type: 'text', value: 'Chelsea' },
      { id: 'playerBPosition', label: 'مركز اللاعب الثاني', type: 'text', value: 'AM / RW' },
      { id: 'playerBImage', label: 'صورة اللاعب الثاني', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/Premier%20League/Players/Chelsea/Cole_Palmer_5.png' },
      { id: 'playerBClubLogo', label: 'شعار نادي اللاعب الثاني', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/Premier%20League/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%A7%D9%86%D8%AF%D9%8A%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A%D8%A9/Chelsea%20FC.png' },
      { id: 'playerCName', label: 'اسم اللاعب الثالث', type: 'text', value: 'Lamine Yamal' },
      { id: 'playerCClub', label: 'نادي اللاعب الثالث', type: 'text', value: 'Barcelona' },
      { id: 'playerCPosition', label: 'مركز اللاعب الثالث', type: 'text', value: 'RW' },
      { id: 'playerCImage', label: 'صورة اللاعب الثالث', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'playerCClubLogo', label: 'شعار نادي اللاعب الثالث', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'playerStatsJson', label: 'إحصائيات اللاعب الأساسية JSON', type: 'textarea', value: '[{"label":"الأهداف","value":"25","hint":"إجمالي الموسم","category":"attack"},{"label":"التسديدات / 90","value":"3.8","hint":"كثافة التسديد","category":"attack"},{"label":"تمريرات مفتاحية","value":"41","hint":"صناعة الفرص","category":"passing"},{"label":"تمريرات تقدمية","value":"68","hint":"البناء للأمام","category":"passing"},{"label":"استرجاع الكرة","value":"132","hint":"افتكاك واستعادة","category":"defense"},{"label":"الدقائق","value":"2,640","hint":"حمل الموسم","category":"season"}]' },
      { id: 'playerStatsSourceJson', label: 'JSON كامل من جسر إحصائيات اللاعبين', type: 'textarea', value: '' },
      { id: 'dataSourceName', label: 'اسم مصدر البيانات الظاهر', type: 'text', value: 'بيانات REO للاعبين' },
      { id: 'accentColor', label: 'لون اللاعب/الجانب الأول', type: 'color', value: '#22d3ee' },
      { id: 'secondaryAccentColor', label: 'لون اللاعب/الجانب الثاني', type: 'color', value: '#fb7185' },
      ...broadcastMotionPreset('DATA_RUSH', 'DATA_RUSH_OUT', 'DATA_SLAM', 'BROADCAST_OUT'),
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1, min: 0.5, max: 3, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -700, max: 700, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -1200, max: 1200, step: 5 },
    ],
  },
];

type ProjectionTemplateOptions = {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  designStyle: string;
  themePreset: string;
  title: string;
  subtitle: string;
  teamName?: string;
  competition?: string;
  watermarkText?: string;
  formation?: string;
  playersCount?: number;
  pitchNumbers?: string;
  homeScore?: number;
  awayScore?: number;
  time?: string;
  brandMark?: string;
  soundInStyle?: string;
};

const projectionPlayerDefaults = [
  ['10', 'MBAPPE'],
  ['7', 'GRIEZMANN'],
  ['11', 'DEMBELE'],
  ['8', 'TCHOUAMENI'],
  ['14', 'RABIOT'],
  ['22', 'HERNANDEZ'],
  ['4', 'KOUNDE'],
  ['1', 'MAIGNAN'],
];

const createFootballProjectionTemplate = ({
  id,
  name,
  description,
  icon,
  accent,
  designStyle,
  themePreset,
  title,
  subtitle,
  teamName = 'FRANCE',
  competition = 'COMPOSITION',
  watermarkText = 'PROJECTION LIVE',
  formation = '4 3 3',
  playersCount = 5,
  pitchNumbers = '11,7,10,8,14,22,4,5,2,13,1',
  homeScore = 0,
  awayScore = 1,
  time = '55:34',
  brandMark = 'V',
  soundInStyle = 'LUXURY_SWEEP',
}: ProjectionTemplateOptions): OverlayConfig => ({
  id,
  templateId: id,
  name,
  type: OverlayType.FOOTBALL_PACKAGE,
  isVisible: false,
  templateIcon: icon,
  templateAccent: accent,
  templateGroup: 'FOOTBALL_PROJECTION',
  templateDescription: description,
  theme: { primaryColor: accent, secondaryColor: '#050712', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
  slots: {},
  fields: [
    ...commonFields,
    { id: 'designStyle', label: 'نمط البروجكشن', type: 'select', value: designStyle, options: ['TITLE_STING', 'COMPOSITION_INTRO', 'LINEUP_BOARD', 'COMPACT_SCOREBUG', 'TUNNEL_REVEAL'] },
    { id: 'themePreset', label: 'ثيم البروجكشن', type: 'select', value: themePreset, options: ['PROJECTION_BLUE', 'PROJECTION_RED', 'PROJECTION_MONO', 'ELITE_SILVER', 'MATCH_NIGHT'] },
    { id: 'watermarkText', label: 'نص الخلفية المتكرر', type: 'text', value: watermarkText },
    { id: 'title', label: 'العنوان الرئيسي', type: 'text', value: title },
    { id: 'subtitle', label: 'العنوان الفرعي', type: 'text', value: subtitle },
    { id: 'teamName', label: 'اسم الفريق', type: 'text', value: teamName },
    { id: 'competition', label: 'اسم البطولة', type: 'text', value: competition },
    { id: 'teamLogo', label: 'شعار الفريق', type: 'image', value: `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName.slice(0, 3))}&background=050712&color=ffffff&size=512&bold=true` },
    { id: 'formation', label: 'الخطة', type: 'text', value: formation },
    { id: 'playersCount', label: 'عدد اللاعبين الظاهرين', type: 'range', value: playersCount, min: 1, max: 8, step: 1 },
    { id: 'pitchNumbers', label: 'أرقام مراكز الملعب CSV', type: 'text', value: pitchNumbers },
    { id: 'brandMark', label: 'علامة شريط النتيجة', type: 'text', value: brandMark },
    { id: 'time', label: 'وقت المباراة', type: 'text', value: time },
    { id: 'homeScore', label: 'نتيجة المضيف', type: 'number', value: homeScore },
    { id: 'awayScore', label: 'نتيجة الضيف', type: 'number', value: awayScore },
    { id: 'homeLogo', label: 'شعار المضيف', type: 'image', value: `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName.slice(0, 3))}&background=0057ff&color=ffffff&size=256&bold=true` },
    { id: 'awayLogo', label: 'شعار الضيف', type: 'image', value: 'https://ui-avatars.com/api/?name=OPP&background=a50044&color=ffffff&size=256&bold=true' },
    { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
    { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
    { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
    ...projectionPlayerDefaults.flatMap(([number, playerName], index) => [
      { id: `player${index + 1}Number`, label: `رقم اللاعب ${index + 1}`, type: 'text' as const, value: number },
      { id: `player${index + 1}Name`, label: `اسم اللاعب ${index + 1}`, type: 'text' as const, value: playerName },
      { id: `player${index + 1}Image`, label: `صورة اللاعب ${index + 1}`, type: 'image' as const, value: '' },
    ]),
    ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', soundInStyle, 'LUXURY_OUT'),
  ],
});

const FOOTBALL_PROJECTION_TEMPLATES: OverlayConfig[] = [
  createFootballProjectionTemplate({
    id: 'template-football-projection-title-sting',
    name: 'بروجكشن فوتبول — ضربة العنوان',
    description: 'افتتاحية مباراة كاملة الشاشة بطباعة ضخمة وخطوط شبكة متحركة وحركة دخول فاخرة وحلقات بث علوية وسفلية.',
    icon: 'PROJ',
    accent: '#0057ff',
    designStyle: 'TITLE_STING',
    themePreset: 'PROJECTION_BLUE',
    title: 'TEMPS',
    subtitle: 'ADDITIONNEL',
    competition: 'MATCH STING',
    soundInStyle: 'LUXURY_SWEEP',
  }),
  createFootballProjectionTemplate({
    id: 'template-football-projection-composition-intro',
    name: 'بروجكشن فوتبول — مقدمة التشكيل',
    description: 'افتتاحية لتشكيلة الفريق مستوحاة من حزم إسقاط الملاعب، مع شعار مركزي وهندسة حمراء/زرقاء قوية.',
    icon: 'COMP',
    accent: '#ff4b3e',
    designStyle: 'COMPOSITION_INTRO',
    themePreset: 'PROJECTION_RED',
    title: 'FRANCE',
    subtitle: 'STARTING XI',
    competition: 'COMPOSITION',
    playersCount: 8,
    soundInStyle: 'LUXURY_IMPACT',
  }),
  createFootballProjectionTemplate({
    id: 'template-football-projection-lineup-board',
    name: 'بروجكشن فوتبول — لوحة التشكيلة',
    description: 'لوحة تشكيل متكاملة بأعمدة لاعبين وملعب تكتيكي، مناسبة لما قبل المباراة أو تحليل ما بين الشوطين.',
    icon: 'LINE',
    accent: '#c8aa63',
    designStyle: 'LINEUP_BOARD',
    themePreset: 'PROJECTION_MONO',
    title: 'LINEUP',
    subtitle: 'STARTERS',
    competition: 'FRANCE',
    playersCount: 5,
    formation: '4 3 3',
    soundInStyle: 'LUXURY_STING',
  }),
  createFootballProjectionTemplate({
    id: 'template-football-projection-compact-scorebug',
    name: 'بروجكشن فوتبول — شريط نتيجة مدمج',
    description: 'شريط نتيجة صغير وفاخر لتغطية المباريات المباشرة، متوافق مع هوية البروجكشن بدل أسلوب اللوحات العامة القديمة.',
    icon: 'SBUG',
    accent: '#0057ff',
    designStyle: 'COMPACT_SCOREBUG',
    themePreset: 'PROJECTION_BLUE',
    title: 'MATCH',
    subtitle: 'LIVE',
    competition: 'LIVE',
    homeScore: 0,
    awayScore: 1,
    time: '55:34',
    soundInStyle: 'SCOREBUG_SNAP',
  }),
  createFootballProjectionTemplate({
    id: 'template-football-projection-tunnel-reveal',
    name: 'بروجكشن فوتبول — كشف الممر',
    description: 'ظهور بأسلوب ممر اللاعبين للتبديلات أو الوقت بدل الضائع أو دخول اللاعبين أو لحظات إعادة الضبط التكتيكي.',
    icon: 'TUNL',
    accent: '#0057ff',
    designStyle: 'TUNNEL_REVEAL',
    themePreset: 'PROJECTION_BLUE',
    title: 'ENTREE',
    subtitle: 'DES JOUEURS',
    competition: 'STADIUM LIVE',
    soundInStyle: 'LUXURY_SWEEP',
  }),
];

const INITIAL_TEMPLATE_DEFINITIONS: OverlayConfig[] = [
  {
    id: 'template-leaderboard-ribbon',
    name: 'شريط الداعمين — شريط البث',
    type: OverlayType.LEADERBOARD,
    isVisible: true,
    theme: {
      primaryColor: '#f59e0b', // Gold default
      secondaryColor: '#000000',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      // --- Data ---
      { id: 'headline', label: 'عنوان القائمة', type: 'text', value: 'TOP SUPPORTERS' },
      { id: 'sponsorsData', label: 'بيانات الداعمين', type: 'hidden', value: '[]' },
      { id: 'sponsorKicker', label: 'النص العلوي الصغير', type: 'text', value: 'REO SUPPORT WALL' },
      { id: 'sponsorPageLabel', label: 'تسمية الصفحة', type: 'text', value: 'الصفحة' },
      { id: 'sponsorTotalLabel', label: 'تسمية الإجمالي', type: 'text', value: 'الإجمالي' },
      { id: 'sponsorLiveLabel', label: 'تسمية حالة البث المباشر', type: 'text', value: 'LIVE' },
      { id: 'sponsorSupportersLabel', label: 'تسمية الداعمين', type: 'text', value: 'الداعمين' },
      { id: 'sponsorDonationsLabel', label: 'تسمية الدفعات', type: 'text', value: 'الدفعات' },
      { id: 'sponsorGoalLabel', label: 'تسمية هدف الدعم', type: 'text', value: 'هدف الدعم' },
      { id: 'sponsorEmptyLabel', label: 'رسالة عدم وجود داعمين', type: 'text', value: 'بانتظار بيانات الداعمين' },
      { id: 'sponsorTopLabel', label: 'تسمية أعلى داعم', type: 'text', value: 'أعلى داعم الآن' },
      { id: 'sponsorLatestDonationLabel', label: 'تسمية آخر دفعة', type: 'text', value: 'آخر دفعة' },
      { id: 'sponsorShareLabel', label: 'تسمية نسبة المساهمة', type: 'text', value: 'نسبة من إجمالي الدعم' },
      { id: 'sponsorRankOneLabel', label: 'تسمية المركز الأول', type: 'text', value: 'الأول' },
      { id: 'sponsorRankTwoLabel', label: 'تسمية المركز الثاني', type: 'text', value: 'الثاني' },
      { id: 'sponsorRankThreeLabel', label: 'تسمية المركز الثالث', type: 'text', value: 'الثالث' },
      { id: 'sponsorRankDefaultLabel', label: 'تسمية باقي المراكز', type: 'text', value: 'داعم' },
      
      // --- Layout & Dimensions (4K NATIVE DEFAULTS) ---
      { 
        id: 'sidebarWidth', 
        label: 'عرض الشريط (px)', 
        type: 'range', 
        value: 650, // Massive increase for sharpness
        min: 400, 
        max: 1200, 
        step: 10 
      },
      { 
        id: 'itemsPerPage', 
        label: 'عدد الأسماء في الصفحة', 
        type: 'range', 
        value: 6, 
        min: 3, 
        max: 10, 
        step: 1 
      },
      { id: 'rotationTime', label: 'مدة عرض الصفحة (ثواني)', type: 'number', value: 10 },

      // --- Typography Control (High DPI Defaults) ---
      { 
        id: 'headerFontSize', 
        label: 'حجم خط العنوان', 
        type: 'range', 
        value: 48, // Large default
        min: 24, 
        max: 96, 
        step: 1 
      },
      { 
        id: 'nameFontSize', 
        label: 'حجم خط الأسماء', 
        type: 'range', 
        value: 28, // Large default
        min: 18, 
        max: 60, 
        step: 1 
      },
      { 
        id: 'amountFontSize', 
        label: 'حجم خط المبلغ', 
        type: 'range', 
        value: 20, // Large default
        min: 14, 
        max: 48, 
        step: 1 
      },

      // --- Appearance & Style ---
      { 
        id: 'themePreset', 
        label: 'نط الألوان', 
        type: 'select', 
        value: 'ROYAL_GOLD',
        options: ['ROYAL_GOLD', 'CLASSIC_RED', 'TACTICAL_BLUE', 'NIGHT_PURPLE', 'DARK_MATTER', 'NEWS_ORANGE', 'PITCH_GREEN']
      },
      { 
        id: 'bgOpacity', 
        label: 'شفافية الخلفية', 
        type: 'range', 
        value: 0.92, 
        min: 0, 
        max: 1, 
        step: 0.05 
      },
      
      // --- Toggles ---
      { id: 'showAvatars', label: 'إظهار الصور الرمزية', type: 'boolean', value: true },
      { id: 'showAmounts', label: 'إظهار المبالغ', type: 'boolean', value: true },
      { id: 'showRanks', label: 'إظهار الترتيب (أرقام)', type: 'boolean', value: true },
      { id: 'showSponsorStats', label: 'إظهار إجمالي الدعم', type: 'boolean', value: true },
      { id: 'showGoalProgress', label: 'إظهار هدف الدعم', type: 'boolean', value: false },
      { id: 'fundraisingGoalUsd', label: 'هدف الدعم بالدولار', type: 'number', value: 0 },
      { id: 'sponsorDisplayMode', label: 'شكل شريط الداعمين', type: 'select', value: 'elite_wall', options: [
        { value: 'elite_wall', label: 'جدار فاخر' },
        { value: 'split_podium', label: 'منصة بطل + قائمة' },
        { value: 'ticker_strip', label: 'شريط تيكر عريض' },
        { value: 'glass_cards', label: 'بطاقات زجاجية' },
        { value: 'compact_stack', label: 'قائمة مدمجة' },
      ] },

      // --- Positioning ---
      { 
        id: 'positionX', 
        label: 'إزاحة أفقية (X)', 
        type: 'range', 
        value: 50, 
        min: 0, 
        max: 1500, 
        step: 10 
      },
      { 
        id: 'positionY', 
        label: 'إزاحة عمودية (Y)', 
        type: 'range', 
        value: 0, 
        min: -1000, 
        max: 1000, 
        step: 10 
      },
      { 
        id: 'scale', 
        label: 'حجم الكلي (Scale)', 
        type: 'range', 
        value: 1.0, // Reset to 1 because base size is now huge
        min: 0.5, 
        max: 3.0, 
        step: 0.05 
      },
    ]
  },
  {
    id: 'template-smart-news-1',
    name: 'التقرير الذكي — الذكاء الاصطناعي',
    type: OverlayType.SMART_NEWS,
    isVisible: true,
    theme: {
      primaryColor: '#dc2626', 
      secondaryColor: '#111827',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      // --- المحتوى ---
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'تقرير المباراة' },
      { id: 'rawText', label: 'النص الكامل (AI)', type: 'textarea', value: 'الصق النص هنا...' },
      
      // --- إعدادات AI الجديدة ---
      { 
        id: 'aiPageCount', 
        label: 'عدد الشرائح المستهدف (AI)', 
        type: 'range', 
        value: 6, 
        min: 2, 
        max: 20, 
        step: 1 
      },

      { id: 'pagesData', label: 'البيانات (JSON)', type: 'hidden', value: '["شريحة 1", "شريحة 2"]' },
      { id: 'currentPage', label: 'رقم الصفحة', type: 'number', value: 0 },
      
      // --- المؤثرات (NEW) ---
      { 
        id: 'transitionEffect', 
        label: 'تأثير الانتقال', 
        type: 'select', 
        value: 'CINEMATIC',
        options: ['CINEMATIC', 'PAGE_FLIP', 'NEWS_SLIDE', 'ZOOM_IMPACT', 'CUBE_ROTATE', 'GLITCH', 'STADIUM_SWEEP', 'TACTICAL_REVEAL', 'SCORE_FLASH']
      },

      // --- الثيمات والألوان ---
      { 
        id: 'themePreset', 
        label: 'لون القالب (الثيم)', 
        type: 'select', 
        value: 'CLASSIC_RED',
        options: ['CLASSIC_RED', 'TACTICAL_BLUE', 'PITCH_GREEN', 'ROYAL_GOLD', 'NIGHT_PURPLE', 'DARK_MATTER', 'NEWS_ORANGE']
      },

      // --- الصور (High Res Default) ---
      { 
        id: 'images', 
        label: 'معرض الصور', 
        type: 'image-list', 
        value: [
          'https://images.unsplash.com/photo-1522778119026-d647f0565c6a?auto=format&fit=crop&w=1920&q=100'
        ] 
      },
      { 
        id: 'containerHeight', 
        label: 'ارتفاع البطاقة (px)', 
        type: 'range', 
        value: 550, 
        min: 300, 
        max: 1000, 
        step: 50 
      },
      { 
        id: 'headlineFontSize', 
        label: 'حجم خط العنوان', 
        type: 'range', 
        value: 48, 
        min: 24, 
        max: 120, 
        step: 2 
      },
      { 
        id: 'contentFontSize', 
        label: 'حجم خط المحتوى', 
        type: 'range', 
        value: 30, 
        min: 14, 
        max: 80, 
        step: 2 
      },
      { 
        id: 'contentPadding', 
        label: 'هوامش المحتوى', 
        type: 'range', 
        value: 48, 
        min: 0, 
        max: 150, 
        step: 4 
      },
      { id: 'imageInterval', label: 'مدة قلب الصورة (ثواني)', type: 'range', value: 10, min: 3, max: 60, step: 1 },

      // --- التحكم الحر بالأبعاد والموقع (Free Transform) ---
      { 
        id: 'scale', 
        label: 'حجم القالب', 
        type: 'range', 
        value: 1.1, 
        min: 0.5, 
        max: 3.0, 
        step: 0.1 
      },
      { 
        id: 'positionY', 
        label: 'الموقع العمودي (Y)', 
        type: 'range', 
        value: 0, 
        min: -1000, 
        max: 1000, 
        step: 10 
      },
      { 
        id: 'positionX', 
        label: 'الموقع الأفقي (X)', 
        type: 'range', 
        value: 0, 
        min: -1500, 
        max: 1500, 
        step: 10 
      },
      { 
        id: 'containerWidth', 
        label: 'عرض البطاقة (%)', 
        type: 'range', 
        value: 90, 
        min: 30, 
        max: 100, 
        step: 5 
      },
      
      // --- الخلفية والعلامة المائية ---
      { id: 'watermarkText', label: 'نص الخلفية المتحرك', type: 'text', value: 'REO LIVE' },
      { 
        id: 'bgOpacity', 
        label: 'شفافية الخلفية الكاملة', 
        type: 'range', 
        value: 0.95, 
        min: 0, 
        max: 1, 
        step: 0.05 
      },

      // --- الصوت ---
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.1 }
    ]
  },
  {
    id: 'template-soccer',
    name: 'لوحة نتائج كرة القدم',
    type: OverlayType.SCOREBOARD,
    isVisible: true,
    theme: {
      primaryColor: '#2563eb',
      secondaryColor: '#dc2626',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'homeName', label: 'الفريق المضيف', type: 'text' as const, value: 'الهلال' },
      { id: 'awayName', label: 'الفريق الضيف', type: 'text' as const, value: 'النصر' },
      { id: 'homeScore', label: 'نتيجة المضيف', type: 'number' as const, value: 2 },
      { id: 'awayScore', label: 'نتيجة الضيف', type: 'number' as const, value: 1 },
      { id: 'period', label: 'الشوط', type: 'text' as const, value: 'الشوط الثاني' },
      { id: 'time', label: 'الوقت', type: 'text' as const, value: '74:30' },
      { id: 'homeLogo', label: 'شعار المضيف', type: 'image' as const, value: 'https://picsum.photos/200/200?random=1' },
      { id: 'awayLogo', label: 'شعار الضيف', type: 'image' as const, value: 'https://picsum.photos/200/200?random=2' },
      // Appearance
      { id: 'designStyle', label: 'النمط', type: 'select' as const, value: 'CLASSIC', options: ['CLASSIC', 'MODERN', 'DARK'] },
      { id: 'themePreset', label: 'الثيم', type: 'select' as const, value: 'TACTICAL_BLUE', options: ['TACTICAL_BLUE', 'CLASSIC_RED', 'PITCH_GREEN', 'ROYAL_GOLD', 'NIGHT_PURPLE', 'UCL_BLUE', 'DARK_MATTER'] },
      // Position
      { id: 'scale', label: 'حجم القالب', type: 'range' as const, value: 1.3, min: 0.5, max: 3.0, step: 0.1 },
      { id: 'positionY', label: 'الموقع العمودي (Y)', type: 'range' as const, value: 0, min: -1000, max: 1000, step: 10 },
    ]
  },
  {
    id: 'template-news',
    name: 'شريط أخبار عاجلة',
    type: OverlayType.TICKER,
    isVisible: true,
    theme: {
      primaryColor: '#b91c1c',
      secondaryColor: '#ffffff',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text' as const, value: 'عاجل' },
      { id: 'content', label: 'نص الخبر', type: 'text' as const, value: 'انطلاق فعاليات البطولة اليوم بمشاركة واسعة...' },
      // Appearance
      { id: 'themePreset', label: 'الثيم', type: 'select' as const, value: 'CLASSIC_RED', options: ['CLASSIC_RED', 'TACTICAL_BLUE', 'PITCH_GREEN', 'ROYAL_GOLD', 'NIGHT_PURPLE', 'NEWS_ORANGE', 'DARK_MATTER'] },
      // Position
      { id: 'scale', label: 'حجم القالب', type: 'range' as const, value: 1.2, min: 0.5, max: 3.0, step: 0.1 },
      // Sound
      { id: 'scrollSpeed', label: 'سرعة التمرير (1-30)', type: 'range' as const, value: 10, min: 1, max: 30, step: 1 },
    ]
  },
  {
    id: 'template-lower',
    name: 'تعريف ضيف — الشريط السفلي',
    type: OverlayType.LOWER_THIRD,
    isVisible: true,
    theme: {
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'name', label: 'الاسم', type: 'text' as const, value: 'أحمد محمد' },
      { id: 'role', label: 'المنصب', type: 'text' as const, value: 'محلل رياضي' },
      // Appearance
      { id: 'designStyle', label: 'النمط', type: 'select' as const, value: 'CLASSIC', options: ['CLASSIC', 'MODERN', 'MINIMAL'] },
      { id: 'themePreset', label: 'الثيم', type: 'select' as const, value: 'TACTICAL_BLUE', options: ['TACTICAL_BLUE', 'CLASSIC_RED', 'PITCH_GREEN', 'ROYAL_GOLD', 'NIGHT_PURPLE', 'DARK_MATTER'] },
      // Position
      { id: 'scale', label: 'حجم القالب', type: 'range' as const, value: 1.2, min: 0.5, max: 3.0, step: 0.1 },
    ]
  },
  {
    id: 'template-exclusive-alert',
    name: 'خبر حصري — تنبيه خاص',
    type: OverlayType.EXCLUSIVE_ALERT,
    isVisible: false,
    theme: {
      primaryColor: '#ef4444',
      secondaryColor: '#000000',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'النص الرئيسي', type: 'text', value: 'حصرياً' },
      { id: 'subHeadline', label: 'النص الفرعي', type: 'text', value: 'مع REO' },
      { id: 'position', label: 'الموقع', type: 'select', value: 'RIGHT', options: ['RIGHT', 'LEFT'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.5, min: 0.5, max: 3.0, step: 0.1 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 100, min: -1000, max: 1000, step: 10 },
      { id: 'useTTS', label: 'تفعيل النطق الصوتي', type: 'boolean', value: true },
      { id: 'ttsText', label: 'نص النطق الصوتي', type: 'text', value: 'حصرياً مع ريو' },
      { id: 'themePreset', label: 'اللون', type: 'select', value: 'CLASSIC_RED', options: ['CLASSIC_RED', 'ROYAL_GOLD', 'TACTICAL_BLUE', 'PITCH_GREEN', 'NIGHT_PURPLE'] },
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.1 }
    ]
  },
  {
    id: 'template-guests',
    name: 'ضيوف الحلقة',
    type: OverlayType.GUESTS,
    isVisible: false,
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#0f172a',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'عنوان الفقرة', type: 'text', value: 'ضيوف الحلقة' },
      { id: 'watermarkText', label: 'الحقوق', type: 'text', value: 'REO SHOW' },
      { id: 'designStyle', label: 'التصميم (الستايل)', type: 'select', value: 'STYLE_1', options: ['STYLE_1', 'STYLE_2', 'STYLE_3'] },
      { id: 'themePreset', label: 'اللون الأساسي', type: 'select', value: 'TACTICAL_BLUE', options: ['CLASSIC_RED', 'ROYAL_GOLD', 'TACTICAL_BLUE', 'PITCH_GREEN', 'NIGHT_PURPLE'] },
      { id: 'guestsCount', label: 'عدد الضيوف', type: 'range', value: 3, min: 1, max: 6, step: 1 },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      
      // Guest 1
      { id: 'guest1Name', label: 'اسم الضيف 1', type: 'text', value: 'محمد العويس' },
      { id: 'guest1Image', label: 'صورة الضيف 1', type: 'image', value: 'https://picsum.photos/400/400?random=11' },
      // Guest 2
      { id: 'guest2Name', label: 'اسم الضيف 2', type: 'text', value: 'سالم الدوسري' },
      { id: 'guest2Image', label: 'صورة الضيف 2', type: 'image', value: 'https://picsum.photos/400/400?random=12' },
      // Guest 3
      { id: 'guest3Name', label: 'اسم الضيف 3', type: 'text', value: 'ياسر الشهراني' },
      { id: 'guest3Image', label: 'صورة الضيف 3', type: 'image', value: 'https://picsum.photos/400/400?random=13' },
      // Guest 4
      { id: 'guest4Name', label: 'اسم الضيف 4', type: 'text', value: 'سلمان الفرج' },
      { id: 'guest4Image', label: 'صورة الضيف 4', type: 'image', value: 'https://picsum.photos/400/400?random=14' },
      // Guest 5
      { id: 'guest5Name', label: 'اسم الضيف 5', type: 'text', value: 'نواف العقيدي' },
      { id: 'guest5Image', label: 'صورة الضيف 5', type: 'image', value: 'https://picsum.photos/400/400?random=15' },
      // Guest 6
      { id: 'guest6Name', label: 'اسم الضيف 6', type: 'text', value: 'علي البليهي' },
      { id: 'guest6Image', label: 'صورة الضيف 6', type: 'image', value: 'https://picsum.photos/400/400?random=16' },
    ]
  },
  {
    id: 'template-ucl-draw',
    name: 'قرعة الأبطال',
    type: OverlayType.UCL_DRAW,
    isVisible: false,
    theme: {
      primaryColor: '#001489',
      secondaryColor: '#000836',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'OITAVOS DE FINAL' },
      { id: 'watermarkText', label: 'الحقوق', type: 'text', value: 'REO SHOW' },
      { id: 'designStyle', label: 'التصميم (الستايل)', type: 'select', value: 'STYLE_1', options: ['STYLE_1', 'STYLE_2', 'STYLE_3'] },
      { id: 'themePreset', label: 'اللون الأساسي', type: 'select', value: 'UCL_BLUE', options: ['UCL_BLUE', 'DARK_MATTER', 'ROYAL_GOLD'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
      { id: 'centerImage', label: 'صورة المنتصف (الكأس)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg' },
      
      { id: 'pair1', label: 'المواجهة 1 (باريس/نيوكاسل)', type: 'select', value: 'UNDECIDED', options: ['UNDECIDED', 'BARCA_LEFT', 'CHELSEA_LEFT'] },
      { id: 'pair2', label: 'المواجهة 2 (غلطة/أتلتيكو)', type: 'select', value: 'UNDECIDED', options: ['UNDECIDED', 'LIV_LEFT', 'TOT_LEFT'] },
      { id: 'pair3', label: 'المواجهة 3 (مدريد/بودو)', type: 'select', value: 'UNDECIDED', options: ['UNDECIDED', 'SPORTING_LEFT', 'CITY_LEFT'] },
      { id: 'pair4', label: 'المواجهة 4 (أتلانتا/ليفركوزن)', type: 'select', value: 'UNDECIDED', options: ['UNDECIDED', 'ARSENAL_LEFT', 'BAYERN_LEFT'] },

      // Fixed Teams
      { id: 'teamL1', label: 'فريق يسار 1 (باريس)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg' },
      { id: 'teamR1', label: 'فريق يمين 1 (نيوكاسل)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg' },
      
      { id: 'teamL2', label: 'فريق يسار 2 (غلطة سراي)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Galatasaray_Sports_Club_Logo.png/200px-Galatasaray_Sports_Club_Logo.png' },
      { id: 'teamR2', label: 'فريق يمين 2 (أتلتيكو)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Atletico_Madrid_2017_logo.svg/200px-Atletico_Madrid_2017_logo.svg.png' },

      { id: 'teamL3', label: 'فريق يسار 3 (ريال مدريد)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/200px-Real_Madrid_CF.svg.png' },
      { id: 'teamR3', label: 'فريق يمين 3 (بودو)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/FK_Bod%C3%B8-Glimt.svg/200px-FK_Bod%C3%B8-Glimt.svg.png' },

      { id: 'teamL4', label: 'فريق يسار 4 (أتلانتا)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/66/AtalantaBC.svg/200px-AtalantaBC.svg.png' },
      { id: 'teamR4', label: 'فريق يمين 4 (ليفركوزن)', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/59/Bayer_04_Leverkusen_logo.svg/200px-Bayer_04_Leverkusen_logo.svg.png' },

      // Variable Teams
      { id: 'varBarca', label: 'شعار برشلونة', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg' },
      { id: 'varChelsea', label: 'شعار تشيلسي', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg' },
      
      { id: 'varLiv', label: 'شعار ليفربول', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg' },
      { id: 'varTot', label: 'شعار توتنهام', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg' },

      { id: 'varSporting', label: 'شعار سبورتنغ', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e2/Sporting_Clube_de_Portugal_crest.svg/200px-Sporting_Clube_de_Portugal_crest.svg.png' },
      { id: 'varCity', label: 'شعار مان سيتي', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/200px-Manchester_City_FC_badge.svg.png' },

      { id: 'varArsenal', label: 'شعار أرسنال', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg' },
      { id: 'varBayern', label: 'شعار بايرن', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg' },
      
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.1 }
    ]
  },
  {
    id: 'template-election',
    name: 'انتخابات برشلونة 2026',
    type: OverlayType.ELECTION,
    isVisible: false,
    theme: {
      primaryColor: '#a50044', // Barca Red
      secondaryColor: '#004d98', // Barca Blue
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'انتخابات برشلونة 2026' },
      { id: 'subheadline', label: 'العنوان التوضيحي', type: 'text', value: 'تغطية مباشرة لسباق رئاسة النادي في 2026' },
      { id: 'watermarkText', label: 'الحقوق', type: 'text', value: 'REO SHOW' },
      { id: 'statusBadge', label: 'شارة الحالة', type: 'text', value: 'تغطية مباشرة' },
      { id: 'phaseLabel', label: 'مرحلة النتائج', type: 'text', value: 'نتائج أولية' },
      { id: 'sourceLabel', label: 'المصدر', type: 'text', value: 'مركز برشلونة الانتخابي' },
      { id: 'lastUpdated', label: 'آخر تحديث', type: 'text', value: 'آخر تحديث 20:45' },
      { id: 'designStyle', label: 'التصميم (الستايل)', type: 'select', value: 'RESULTS_HUB', options: ['RESULTS_HUB', 'SPLIT_BAR_LEFT', 'COUNTDOWN_TOP', 'LEAKS_FULL', 'STATEMENT_FULL', 'LIVE_TRANSITION', 'STUDIO_BACKGROUND', 'VOTER_TURNOUT'] },
      { id: 'themePreset', label: 'اللون الأساسي', type: 'select', value: 'BARCA_RED', options: ['BARCA_RED', 'BARCA_BLUE', 'ROYAL_GOLD', 'DARK_MATTER'] },
      { id: 'barcaLogo', label: 'شعار برشلونة', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png' },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },

      // Customization for Leaks & Statements
      { id: 'boxColor', label: 'لون الصندوق (التسريبات/التصريحات)', type: 'color', value: '#0f172a' },
      { id: 'accentColor', label: 'لون التمييز (التسريبات/التصريحات)', type: 'color', value: '#eab308' },

      // Voter Turnout Fields
      { id: 'currentVoters', label: 'عدد المصوتين الحالي', type: 'number', value: 25000 },
      { id: 'totalVoters', label: 'إجمالي الناخبين', type: 'number', value: 114504 },
      { id: 'turnoutTitle', label: 'عنوان الإقبال', type: 'text', value: 'نسبة المشاركة في التصويت' },
      { id: 'turnoutSubtitle', label: 'العنوان الفرعي للإقبال', type: 'text', value: 'إجمالي الناخبين المسموح لهم' },
      { id: 'currentVotersTitle', label: 'عنوان المصوتين الحاليين', type: 'text', value: 'المصوتين حتى الآن' },

      // Studio Background specific
      { id: 'cameraX', label: 'موقع الكاميرا (X)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'cameraY', label: 'موقع الكاميرا (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'cameraScale', label: 'حجم الكاميرا', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
      { id: 'bgImage', label: 'صورة الخلفية', type: 'image', value: 'https://images.unsplash.com/photo-1518632765486-a09a4c1aeb82?q=80&w=2000&auto=format&fit=crop' },

      // Candidate 1
      createElectionCandidateProfileField(1, 'LAPORTA'),
      { id: 'candidate1Name', label: 'اسم المرشح 1', type: 'text', value: LAPORTA_PRESET.name },
      { id: 'candidate1Image', label: 'صورة المرشح 1', type: 'image', value: LAPORTA_PRESET.image },
      { id: 'candidate1Percent', label: 'نسبة المرشح 1 (%)', type: 'range', value: 52, min: 0, max: 100, step: 0.1 },
      { id: 'candidate1Votes', label: 'أصوات المرشح 1', type: 'number', value: 48310 },
      { id: 'candidate1Delta', label: 'تغير المرشح 1 (%)', type: 'number', value: 2.6 },
      { id: 'candidate1Tag', label: 'وصف المرشح 1', type: 'text', value: LAPORTA_PRESET.tag },
      { id: 'candidate1Color', label: 'لون المرشح 1', type: 'color', value: LAPORTA_PRESET.color },

      // Candidate 2
      createElectionCandidateProfileField(2, 'FONT'),
      { id: 'candidate2Name', label: 'اسم المرشح 2', type: 'text', value: FONT_PRESET.name },
      { id: 'candidate2Image', label: 'صورة المرشح 2', type: 'image', value: FONT_PRESET.image },
      { id: 'candidate2Percent', label: 'نسبة المرشح 2 (%)', type: 'range', value: 39, min: 0, max: 100, step: 0.1 },
      { id: 'candidate2Votes', label: 'أصوات المرشح 2', type: 'number', value: 36140 },
      { id: 'candidate2Delta', label: 'تغير المرشح 2 (%)', type: 'number', value: -1.4 },
      { id: 'candidate2Tag', label: 'وصف المرشح 2', type: 'text', value: FONT_PRESET.tag },
      { id: 'candidate2Color', label: 'لون المرشح 2', type: 'color', value: FONT_PRESET.color },

      // Undecided / Residual bloc
      { id: 'showUndecided', label: 'إظهار غير المحسوم', type: 'boolean', value: true },
      { id: 'undecidedLabel', label: 'اسم غير المحسوم', type: 'text', value: 'أوراق أخرى / غير محسوم' },
      { id: 'undecidedPercent', label: 'نسبة غير المحسوم (%)', type: 'range', value: 9, min: 0, max: 100, step: 0.1 },
      { id: 'undecidedColor', label: 'لون غير المحسوم', type: 'color', value: '#6b7280' },

      // Countdown
      { id: 'targetDate', label: 'تاريخ النهاية (YYYY-MM-DD HH:mm)', type: 'text', value: '2026-06-30 20:00' },

      // Special Modules Content
      { id: 'specialText', label: 'نص (تسريبات/تصريح/ملاحظة)', type: 'textarea', value: 'تقدّم لابورتا في فرز الدفعة الأخيرة مع ارتفاع ملحوظ في المشاركة داخل برشلونة.' },
      { id: 'statementAuthor', label: 'صاحب التصريح', type: 'text', value: LAPORTA_PRESET.name },
      ...createElectionStatementFields('CANDIDATE_1'),
      { id: 'leaksTitle', label: 'عنوان التسريبات', type: 'text', value: 'عاجل' },
      { id: 'leaksSubtitle', label: 'عنوان فرعي للتسريبات', type: 'text', value: 'تسريب خاص' },
      { id: 'leaksContent', label: 'محتوى التسريب', type: 'textarea', value: 'نص التسريب هنا...' },
      { id: 'statementTitle', label: 'عنوان التصريح', type: 'text', value: 'بيان رسمي' },
      { id: 'transitionTitle', label: 'عنوان الانتقال', type: 'text', value: 'الانتقال للبث المباشر' },
      { id: 'transitionSubtitle', label: 'عنوان فرعي للانتقال', type: 'text', value: 'انتخابات برشلونة 2026' },
      { id: 'liveText', label: 'نص المباشر', type: 'text', value: 'LIVE' },
      { id: 'countdownTitle', label: 'عنوان العداد', type: 'text', value: 'الوقت المتبقي' },
      { id: 'countdownDays', label: 'نص الأيام', type: 'text', value: 'يوم' },
      { id: 'countdownHours', label: 'نص الساعات', type: 'text', value: 'ساعة' },
      { id: 'countdownMinutes', label: 'نص الدقائق', type: 'text', value: 'دقيقة' },
      { id: 'countdownSeconds', label: 'نص الثواني', type: 'text', value: 'ثانية' },
      
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.1 }
    ]
  },
  {
    id: 'template-social-media',
    name: 'تغريدة / تعليق — شبكات التواصل',
    type: OverlayType.SOCIAL_MEDIA,
    isVisible: false,
    theme: {
      primaryColor: '#1da1f2',
      secondaryColor: '#ffffff',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'platform', label: 'المنصة', type: 'select', value: 'X (Twitter)', options: ['X (Twitter)', 'Instagram', 'Facebook', 'YouTube'] },
      { id: 'authorName', label: 'اسم الحساب', type: 'text', value: 'أحمد محمد' },
      { id: 'authorHandle', label: 'المعرف', type: 'text', value: '@ahmed_m' },
      { id: 'authorImage', label: 'صورة الحساب', type: 'image', value: 'https://ui-avatars.com/api/?name=Ahmed&background=random' },
      { id: 'content', label: 'نص التعليق', type: 'textarea', value: 'مباراة رائعة وأداء ممتاز من الفريقين! #برشلونة' },
      { id: 'likes', label: 'الإعجابات', type: 'number', value: 1200 },
      { id: 'time', label: 'وقت النشر', type: 'text', value: 'منذ ساعتين' },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'LIGHT', options: ['LIGHT', 'DARK', 'GLASS'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.2, min: 0.5, max: 2.0, step: 0.1 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.1 }
    ]
  },
  {
    id: 'template-player-profile',
    name: 'بطاقة إحصائيات لاعب',
    type: OverlayType.PLAYER_PROFILE,
    isVisible: false,
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1e3a8a',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'playerName', label: 'اسم اللاعب', type: 'text' as const, value: 'Lionel Messi' },
      { id: 'playerNumber', label: 'رقم اللاعب', type: 'text' as const, value: '10' },
      { id: 'playerRole', label: 'المركز', type: 'text' as const, value: 'Forward' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image' as const, value: 'https://picsum.photos/400/600?random=88' },
      { id: 'clubLogo', label: 'شعار النادي', type: 'image' as const, value: 'https://picsum.photos/100?random=99' },
      { id: 'stat1Label', label: 'الإحصائية 1 (الاسم)', type: 'text' as const, value: 'Goals' },
      { id: 'stat1Value', label: 'الإحصائية 1 (القيمة)', type: 'text' as const, value: '34' },
      { id: 'stat2Label', label: 'الإحصائية 2 (الاسم)', type: 'text' as const, value: 'Assists' },
      { id: 'stat2Value', label: 'الإحصائية 2 (القيمة)', type: 'text' as const, value: '15' },
      { id: 'stat3Label', label: 'الإحصائية 3 (الاسم)', type: 'text' as const, value: 'Rating' },
      { id: 'stat3Value', label: 'الإحصائية 3 (القيمة)', type: 'text' as const, value: '9.8' },
      { id: 'designStyle', label: 'النمط', type: 'select' as const, value: 'MODERN', options: ['MODERN', 'DARK'] },
      { id: 'themePreset', label: 'الثيم', type: 'select' as const, value: 'TACTICAL_BLUE', options: ['TACTICAL_BLUE', 'CLASSIC_RED', 'PITCH_GREEN', 'ROYAL_GOLD', 'DARK_MATTER'] },
      { id: 'scale', label: 'حجم القالب', type: 'range' as const, value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range' as const, value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range' as const, value: 0, min: -1500, max: 1500, step: 10 },
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean' as const, value: true }
    ]
  },
  {
    id: 'template-todays-episode',
    name: 'حلقة اليوم فيها',
    type: OverlayType.TODAYS_EPISODE,
    isVisible: false,
    theme: {
      primaryColor: '#f59e0b',
      secondaryColor: '#1e293b',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal'
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'حلقة اليوم فيها :' },
      { id: 'itemsCount', label: 'عدد المحاور', type: 'range', value: 4, min: 1, max: 8, step: 1 },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'MODERN_GLASS', options: ['MODERN_GLASS', 'DARK_NEON', 'CLEAN_LIGHT'] },
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.1 },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      ...Array.from({ length: 8 }).flatMap((_, i) => [
          { id: `item${i+1}Name`, label: `اسم المحور ${i+1}`, type: 'text' as const, value: `موضوع ${i+1}` },
          { id: `item${i+1}Image`, label: `صورة المحور ${i+1}`, type: 'image' as const, value: `https://picsum.photos/400/600?random=${i+10}` },
          { id: `item${i+1}Scale`, label: `تكبير صورة ${i+1}`, type: 'range' as const, value: 1.0, min: 0.5, max: 2.5, step: 0.1 },
          { id: `item${i+1}PosX`, label: `إزاحة أفقية (X) ${i+1}`, type: 'range' as const, value: 0, min: -200, max: 200, step: 5 },
          { id: `item${i+1}PosY`, label: `إزاحة عمودية (Y) ${i+1}`, type: 'range' as const, value: 0, min: -200, max: 200, step: 5 },
      ])
    ]
  },
  // ── TOP VIEWERS TEMPLATE ──────────────────────────────────────────────────
  {
    id: 'template-top-viewers',
    templateId: 'template-top-viewers',
    name: 'أبرز المتفاعلين',
    type: OverlayType.TOP_VIEWERS,
    isVisible: false,
    templateIcon: '🏆',
    templateAccent: '#f59e0b',
    templateGroup: 'BROADCAST',
    templateDescription: 'قالب يعرض أبرز متفاعلي القناة مع صورهم وبياناتهم بمساعدة الذكاء الاصطناعي.',
    theme: { primaryColor: '#f59e0b', secondaryColor: '#1e3a5f', backgroundColor: '#0f172a', fontFamily: 'Inter' },
    slots: {},
    fields: [
      { id: 'channelName', label: 'اسم القناة', type: 'text', value: 'REO LIVE' },
      { id: 'channelLogo', label: 'شعار القناة', type: 'image', value: '' },
      { id: 'title', label: 'عنوان القالب', type: 'text', value: 'أبرز المتفاعلين' },
      { id: 'viewerCount', label: 'عدد المتفاعلين (1-10)', type: 'range', value: 5, min: 1, max: 10, step: 1 },
      { id: 'displayMode', label: 'نمط العرض', type: 'select', value: 'TICKER', options: ['TICKER', 'CARDS'] },
      { id: 'themePreset', label: 'الثيم', type: 'select', value: 'BLUE', options: ['BLUE', 'GOLD', 'RED', 'GREEN', 'PURPLE'] },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: false },
      ...Array.from({ length: 10 }).flatMap((_, i) => [
        { id: `viewer${i+1}Name`,  label: `اسم المتفاعل ${i+1}`,  type: 'text'  as const, value: i === 0 ? 'محمد العمري' : i === 1 ? 'سارة الغامدي' : i === 2 ? 'خالد المطيري' : '' },
        { id: `viewer${i+1}Image`, label: `صورة المتفاعل ${i+1}`, type: 'image' as const, value: i < 3 ? `https://ui-avatars.com/api/?name=${encodeURIComponent(['محمد','سارة','خالد'][i] || '')}&background=random&size=200` : '' },
        { id: `viewer${i+1}Badge`, label: `وسام/لقب المتفاعل ${i+1}`, type: 'text' as const, value: i === 0 ? '🥇 المتفاعل الأول' : i === 1 ? '🥈 المتفاعلة الثانية' : i === 2 ? '🥉 المتفاعل الثالث' : '' },
      ])
    ]
  },
  ...FOOTBALL_PROJECTION_TEMPLATES,
  ...FOOTBALL_BROADCAST_TEMPLATES,
  ...BARCELONA_ELECTION_TEMPLATES,
  // ─── Reo Show Broadcast Identity Templates ────────────────────────────────
  {
    id: 'template-h2h-stats',
    templateId: 'template-h2h-stats',
    name: 'مقارنة مباشرة بين لاعبين',
    type: OverlayType.H2H_STATS,
    isVisible: false,
    templateIcon: 'H2H',
    templateAccent: '#00E5FF',
    templateGroup: 'REO_BROADCAST',
    templateDescription: 'مقارنة إحصائيات بين لاعبين بأسلوب بث رياضي فاخر.',
    theme: { primaryColor: '#00E5FF', secondaryColor: '#0B132B', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
            { id: 'player1Name', label: 'اسم اللاعب الأول', type: 'text',  value: 'لامين يامال' },
      { id: 'player1Image',label: 'صورة اللاعب الأول', type: 'image', value: '' },
      { id: 'player1Color',label: 'لون اللاعب الأول', type: 'color', value: '#004D98' },
      { id: 'player2Name', label: 'اسم اللاعب الثاني', type: 'text',  value: 'فينيسيوس' },
      { id: 'player2Image',label: 'صورة اللاعب الثاني', type: 'image', value: '' },
      { id: 'player2Color',label: 'لون اللاعب الثاني', type: 'color', value: '#C00000' },
      { id: 'player1Club',  label: 'نادي اللاعب الأول', type: 'text', value: 'FC BARCELONA' },
      { id: 'player2Club',  label: 'نادي اللاعب الثاني', type: 'text', value: 'REAL MADRID' },
      { id: 'matchLabel',   label: 'تسمية المقارنة', type: 'text', value: 'HEAD TO HEAD' },
      { id: 'statsData', label: 'الإحصائيات (JSON)', type: 'textarea', value: '[{"label":"الأهداف","v1":15,"v2":18},{"label":"التمريرات","v1":12,"v2":9},{"label":"الدريبلات","v1":88,"v2":91},{"label":"التقييم","v1":89,"v2":92}]' },
      { id: 'bgColor',     label: 'لون الخلفية', type: 'color', value: '#0B132B' },
      { id: 'scale',       label: 'الحجم',  type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY',   label: 'موضع Y', type: 'range', value: 0,   min: -500, max: 500, step: 5 },
      { id: 'positionX',   label: 'موضع X', type: 'range', value: 0,   min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-transfer-news',
    templateId: 'template-transfer-news',
    name: 'ميركاتو — إعلان صفقة سينمائي',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'DEAL',
    templateAccent: '#00F5D4',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'قالب صفقة رئيسية بتصميم سينمائي: لاعب، مسار النادي، قيمة الصفقة، ونسبة الثقة ضمن هوية ميركاتو واحدة.',
    theme: { primaryColor: '#00F5D4', secondaryColor: '#050505', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'designStyle', label: 'نمط قصة الميركاتو', type: 'select', value: 'DEAL_BREAKER', options: [
        { value: 'DEAL_BREAKER', label: 'كسر الصفقة' },
        { value: 'MARKET_COMMAND_CENTER', label: 'غرفة قيادة السوق' },
        { value: 'RUMOUR_RADAR', label: 'رادار الشائعات' },
        { value: 'DONE_DEALS_WALL', label: 'جدار الصفقات المحسومة' },
        { value: 'PLAYER_SEASON_CARD', label: 'بطاقة موسم اللاعب' },
        { value: 'PLAYER_IMPACT_CARD', label: 'توقع تأثير اللاعب' },
      ] },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'sportmonksPlayerId', label: 'معرّف اللاعب في Sportmonks', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'اسم البحث في Sportmonks', type: 'text', value: '' },
      { id: 'playerTeam', label: 'فريق اللاعب', type: 'text', value: 'برشلونة' },
      { id: 'playerPosition', label: 'مركز اللاعب', type: 'text', value: 'مهاجم' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: '' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'seasonLabel', label: 'وسم الموسم', type: 'text', value: '2025/26' },
      { id: 'playerName',  label: 'اسم اللاعب',    type: 'text',  value: 'Nico Williams' },
      { id: 'playerImage', label: 'صورة اللاعب',   type: 'image', value: '' },
      { id: 'fromClub',    label: 'النادي المغادر', type: 'text',  value: 'Athletic Club' },
      { id: 'toClub',      label: 'النادي الجديد',  type: 'text',  value: 'Barcelona' },
      { id: 'dealValue',   label: 'قيمة الصفقة',   type: 'text',  value: '58M EUR' },
      { id: 'confidence',  label: 'نسبة التأكد %', type: 'range', value: 78, min: 0, max: 100, step: 1 },
      { id: 'headline',    label: 'العنوان الرئيسي', type: 'text', value: 'TRANSFER DECISION' },
      { id: 'subheadline', label: 'عنوان السوق الفرعي', type: 'text', value: 'تحديث مباشر ذكي يجمع ملف الصفقة ونسبة الثقة وإشارة السوق.' },
      { id: 'source',      label: 'المصدر',         type: 'text',  value: 'Reo Show Exclusive' },
      { id: 'marketItems', label: 'عناصر السوق JSON أو player|from|to|value|confidence|status|tag', type: 'textarea', value: '[{"player":"نيكو ويليامز","from":"أتلتيك بلباو","to":"برشلونة","value":"58 مليون يورو","confidence":78,"status":"محادثات متقدمة","tag":"أولوية"},{"player":"جوشوا كيميش","from":"بايرن","to":"برشلونة","value":"حر / مكافآت","confidence":64,"status":"مراقبة","tag":"فرصة"},{"player":"جواو كانسيلو","from":"مانشستر سيتي","to":"برشلونة","value":"إعارة + خيار","confidence":72,"status":"متوقع","tag":"عودة"}]' },
      { id: 'playerStatsJson', label: 'إحصائيات موسم اللاعب JSON', type: 'textarea', value: '[{"label":"الأهداف","value":"14","hint":"الدوري"},{"label":"التمريرات الحاسمة","value":"9","hint":"كل البطولات"},{"label":"تمريرات مفتاحية","value":"61","hint":"صناعة فرص"},{"label":"تسديدات / 90","value":"3.4","hint":"حجم التهديد"},{"label":"مراوغات","value":"72","hint":"مكتملة"},{"label":"الدقائق","value":"2,418","hint":"حمل الموسم"}]' },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'MERCATO_HIT', 'LUXURY_OUT'),
      { id: 'dailyDeals', label: 'صفقات محسومة اليوم', type: 'textarea', value: 'اكتب فقط ما تم تأكيده من مصدر واضح;أضف حالة الفحص الطبي عند وجود إعلان;حدّث مدة العقد بعد التوثيق' },
      { id: 'expectedDeals', label: 'صفقات متوقعة', type: 'textarea', value: 'القائمة المختصرة تحتاج تحديثًا من مصدر موثوق;المفاوضات المالية ما زالت مفتوحة;شكل الإعارة يحدد مسار الحسم' },
      { id: 'latestNews', label: 'آخر أخبار السوق', type: 'textarea', value: 'اكتب إشارة السوق المؤكدة هنا;ضع اجتماع الوكيل أو النادي عند وجود مصدر;لا ترفع درجة الثقة بلا دليل' },
      { id: 'accentColor', label: 'لون التمييز',    type: 'color', value: '#00F5D4' },
      { id: 'fromColor',   label: 'لون نادي المصدر', type: 'color', value: '#A50044' },
      { id: 'toColor',     label: 'لون النادي الجديد', type: 'color', value: '#000000' },
      { id: 'isUrgent',    label: 'شريط عاجل',      type: 'boolean', value: true },
      { id: 'scale',       label: 'الحجم',  type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY',   label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX',   label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-command-center',
    templateId: 'template-mercato-command-center',
    name: 'ميركاتو — غرفة القرار الذكية',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'MKT',
    templateAccent: '#00F5D4',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'حزمة ميركاتو متكاملة: صفقة رئيسية، احتمالات، صفقات تمت، صفقات متوقعة، وآخر إشارات السوق في غرفة بث واحدة.',
    theme: { primaryColor: '#00F5D4', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'نمط التصميم', type: 'select', value: 'MARKET_COMMAND_CENTER', options: MERCATO_DESIGN_STYLE_OPTIONS },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'غرفة قرار الميركاتو' },
      { id: 'subheadline', label: 'العنوان الفرعي', type: 'text', value: 'لوحة واحدة للصفقة الرئيسية، الاحتمالات، الصفقات المحسومة، والتحركات المنتظرة.' },
      { id: 'playerName', label: 'اللاعب الرئيسي', type: 'text', value: 'نيكو ويليامز' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image', value: '' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: '' },
      { id: 'fromClub', label: 'النادي الحالي', type: 'text', value: 'أتلتيك بلباو' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png' },
      { id: 'toClub', label: 'النادي الوجهة', type: 'text', value: 'برشلونة' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'قيمة الصفقة', type: 'text', value: '58 مليون يورو' },
      { id: 'confidence', label: 'نسبة الثقة (%)', type: 'range', value: 78, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'المصدر', type: 'text', value: 'غرفة ميركاتو Reo Show' },
      { id: 'marketItems', label: 'عناصر السوق JSON أو player|from|to|value|confidence|status|tag', type: 'textarea', value: '[{"player":"نيكو ويليامز","from":"أتلتيك بلباو","to":"برشلونة","value":"58 مليون يورو","confidence":78,"status":"محادثات متقدمة","tag":"أولوية"},{"player":"جوشوا كيميش","from":"بايرن","to":"برشلونة","value":"حر / مكافآت","confidence":64,"status":"مراقبة","tag":"فرصة"},{"player":"جواو كانسيلو","from":"مانشستر سيتي","to":"برشلونة","value":"إعارة + خيار","confidence":72,"status":"متوقع","tag":"عودة"},{"player":"داني أولمو","from":"لايبزيغ","to":"برشلونة","value":"60 مليون يورو","confidence":58,"status":"معقّدة","tag":"إبداع"}]' },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'MERCATO_HIT', 'LUXURY_OUT'),
      { id: 'dailyDeals', label: 'صفقات محسومة اليوم', type: 'textarea', value: 'أضف الصفقة المؤكدة فقط;حدّث نتيجة الفحص بعد الإعلان;لا تكتب مدة العقد قبل وجود مصدر' },
      { id: 'expectedDeals', label: 'صفقات متوقعة', type: 'textarea', value: 'الجناح الأيسر ضمن قائمة مختصرة;محور الوسط ما زال مفتوحًا;الظهير يعتمد على صيغة الإعارة' },
      { id: 'latestNews', label: 'آخر الأخبار', type: 'textarea', value: 'اكتب آخر إشارة موثقة;أضف موعد اجتماع أو اتصال إذا تأكد;اربط كل نقطة بدرجة ثقة مناسبة' },
      { id: 'accentColor', label: 'لون التمييز', type: 'color', value: '#00F5D4' },
      { id: 'fromColor', label: 'لون النادي الحالي', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'لون النادي الوجهة', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'شريط عاجل', type: 'boolean', value: false },
      { id: 'scale', label: 'الحجم', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-probability-radar',
    templateId: 'template-mercato-probability-radar',
    name: 'ميركاتو — مصفوفة توقعات الانتقال',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'RADR',
    templateAccent: '#7CFF6B',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'مصفوفة احتمالات عصرية للصفقات المتوقعة، تعرض كل اسم كنسبة انتقال واضحة داخل لوحة تحليل سوق الانتقالات.',
    theme: { primaryColor: '#7CFF6B', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'نمط التصميم', type: 'select', value: 'RUMOUR_RADAR', options: MERCATO_DESIGN_STYLE_OPTIONS },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'مصفوفة الاحتمالات' },
      { id: 'playerName', label: 'اللاعب الرئيسي', type: 'text', value: 'نيكو ويليامز' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image', value: '' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: '' },
      { id: 'fromClub', label: 'النادي الحالي', type: 'text', value: 'أتلتيك بلباو' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png' },
      { id: 'toClub', label: 'النادي الوجهة', type: 'text', value: 'برشلونة' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'قيمة الصفقة', type: 'text', value: '58 مليون يورو' },
      { id: 'confidence', label: 'احتمال الانتقال (%)', type: 'range', value: 78, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'المصدر', type: 'text', value: 'نموذج الاحتمالات / Reo Show' },
      { id: 'marketItems', label: 'توقعات الانتقال JSON', type: 'textarea', value: '[{"player":"نيكو ويليامز","from":"أتلتيك بلباو","to":"برشلونة","value":"58 مليون يورو","confidence":78,"status":"ساخن","tag":"أولوية"},{"player":"كيميش","from":"بايرن","to":"برشلونة","value":"حر","confidence":64,"status":"مراقبة","tag":"فرصة"},{"player":"كانسيلو","from":"مانشستر سيتي","to":"برشلونة","value":"إعارة","confidence":72,"status":"متوقع","tag":"عودة"},{"player":"أولمو","from":"لايبزيغ","to":"برشلونة","value":"60 مليون يورو","confidence":58,"status":"صعب","tag":"إبداع"},{"player":"ميرينو","from":"سوسيداد","to":"برشلونة","value":"25 مليون يورو","confidence":43,"status":"بارد","tag":"عمق"}]' },
      ...broadcastMotionPreset('DATA_RUSH', 'DATA_RUSH_OUT', 'DATA_SLAM', 'BROADCAST_OUT'),
      { id: 'accentColor', label: 'لون التمييز', type: 'color', value: '#7CFF6B' },
      { id: 'fromColor', label: 'لون النادي الحالي', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'لون النادي الوجهة', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'شريط عاجل', type: 'boolean', value: false },
      { id: 'scale', label: 'الحجم', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-done-deals-wall',
    templateId: 'template-mercato-done-deals-wall',
    name: 'ميركاتو — صفقات تمت اليوم',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'DONE',
    templateAccent: '#19D37F',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'لوحة صفقات تمت اليوم بتقسيم احترافي: اللاعب، النادي المغادر، النادي الجديد، القيمة، وحالة الإعلان.',
    theme: { primaryColor: '#19D37F', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'نمط التصميم', type: 'select', value: 'DONE_DEALS_WALL', options: MERCATO_DESIGN_STYLE_OPTIONS },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'CLEAN_BROADCAST', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'صفقات حُسمت اليوم' },
      { id: 'playerName', label: 'اللاعب الرئيسي', type: 'text', value: 'إستيفاو' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image', value: '' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: '' },
      { id: 'fromClub', label: 'النادي الحالي', type: 'text', value: 'بالميراس' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: '' },
      { id: 'toClub', label: 'النادي الوجهة', type: 'text', value: 'تشيلسي' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/Premier%20League/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%A7%D9%86%D8%AF%D9%8A%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A%D8%A9/Chelsea%20FC.png' },
      { id: 'confidence', label: 'نسبة الثقة (%)', type: 'range', value: 92, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'المصدر', type: 'text', value: 'إعلان رسمي / مكتب Reo Show' },
      { id: 'marketItems', label: 'الصفقات المحسومة JSON', type: 'textarea', value: '[{"player":"إستيفاو","from":"بالميراس","to":"تشيلسي","value":"61 مليون يورو","confidence":100,"status":"رسمي"},{"player":"إندريك","from":"بالميراس","to":"ريال مدريد","value":"47 مليون يورو","confidence":100,"status":"رسمي"},{"player":"لاعب وسط شاب","from":"الأكاديمية","to":"الفريق الأول","value":"عقد جديد","confidence":96,"status":"موقّع"},{"player":"ظهير","from":"نادي أ","to":"نادي ب","value":"إعارة","confidence":91,"status":"مكتمل"},{"player":"مهاجم","from":"نادي ج","to":"نادي د","value":"35 مليون يورو","confidence":94,"status":"فحص طبي"},{"player":"حارس","from":"نادي هـ","to":"نادي و","value":"حر","confidence":98,"status":"معلن"}]' },
      { id: 'dailyDeals', label: 'صفقات محسومة اليوم', type: 'textarea', value: 'إعلان رسمي منشور;فحص طبي مؤكد;توقيع العقد' },
      ...broadcastMotionPreset('SPOTLIGHT_POP', 'SPOTLIGHT_POP_OUT', 'CINEMA_BOOM', 'LUXURY_OUT'),
      { id: 'accentColor', label: 'لون التمييز', type: 'color', value: '#19D37F' },
      { id: 'fromColor', label: 'لون النادي الحالي', type: 'color', value: '#111827' },
      { id: 'toColor', label: 'لون النادي الوجهة', type: 'color', value: '#0F766E' },
      { id: 'isUrgent', label: 'شريط عاجل', type: 'boolean', value: false },
      { id: 'scale', label: 'الحجم', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-player-season-card',
    templateId: 'template-mercato-player-season-card',
    name: 'ميركاتو — بطاقة موسم اللاعب',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'CARD',
    templateAccent: '#5EEAD4',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'بطاقة بث عالية التأثير لملف اللاعب: صورة، أرقام الموسم، درجة الثقة، وملاحظات قابلة للتحديث قبل الحلقة.',
    theme: { primaryColor: '#5EEAD4', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'نمط التصميم', type: 'select', value: 'PLAYER_SEASON_CARD', options: MERCATO_DESIGN_STYLE_OPTIONS },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'LUXE_STUDIO', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'ملف مستوى الموسم' },
      { id: 'subheadline', label: 'العنوان الفرعي', type: 'text', value: 'بطاقة مختصرة للميركاتو: المستوى، الإنتاج، الجاهزية، وإشارة السوق.' },
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'لامين يامال' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'sportmonksPlayerId', label: 'معرّف اللاعب في Sportmonks', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'اسم البحث في Sportmonks', type: 'text', value: 'Lamine Yamal' },
      { id: 'playerTeam', label: 'فريق اللاعب', type: 'text', value: 'برشلونة' },
      { id: 'playerPosition', label: 'مركز اللاعب', type: 'text', value: 'جناح أيمن / مهاجم' },
      { id: 'seasonLabel', label: 'وسم الموسم', type: 'text', value: '2025/26' },
      { id: 'fromClub', label: 'النادي الحالي', type: 'text', value: 'برشلونة' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'النادي الوجهة', type: 'text', value: 'برشلونة' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'ملف السوق', type: 'text', value: 'أصل شبابي نخبة' },
      { id: 'confidence', label: 'نسبة ثقة الميركاتو (%)', type: 'range', value: 88, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'المصدر', type: 'text', value: 'Sportmonks / ذاكرة Reo' },
      { id: 'playerStatsJson', label: 'إحصائيات موسم اللاعب JSON', type: 'textarea', value: '[{"label":"الأهداف","value":"14","hint":"إنتاج الدوري"},{"label":"التمريرات الحاسمة","value":"9","hint":"كل البطولات"},{"label":"تمريرات مفتاحية","value":"61","hint":"صناعة فرص"},{"label":"تسديدات / 90","value":"3.4","hint":"حجم التسديد"},{"label":"مراوغات","value":"72","hint":"مكتملة"},{"label":"الدقائق","value":"2,418","hint":"حمل الموسم"}]' },
      { id: 'latestNews', label: 'قراءة السوق', type: 'textarea', value: 'اللاعب محفوظ كأصل أساسي في المشروع;الدور المتوقع مركزي في الموسم الجديد;يمكن تحديث الصورة من ذاكرة GitHub أو image_path في Sportmonks' },
      { id: 'dailyDeals', label: 'صفقات محسومة اليوم', type: 'textarea', value: 'إطار التجديد جاهز;حزمة المحتوى قابلة للنشر;صورة اللاعب محفوظة للبث' },
      { id: 'expectedDeals', label: 'صفقات متوقعة', type: 'textarea', value: 'مزامنة أرقام الموسم من Sportmonks;أرشفة البطاقة بعد الحلقة;توسيع صور لاعبي الليغا في الذاكرة' },
      { id: 'marketItems', label: 'عناصر السوق JSON', type: 'textarea', value: '[{"player":"لامين يامال","from":"برشلونة","to":"برشلونة","value":"محمي","confidence":88,"status":"غير قابل للمساس","tag":"أساسي"},{"player":"بيدري","from":"برشلونة","to":"برشلونة","value":"أصل مهم","confidence":84,"status":"أساسي","tag":"وسط"},{"player":"باو كوبارسي","from":"برشلونة","to":"برشلونة","value":"صاعد","confidence":81,"status":"انفجار","tag":"دفاع"}]' },
      { id: 'accentColor', label: 'لون التمييز', type: 'color', value: '#5EEAD4' },
      { id: 'fromColor', label: 'لون النادي الحالي', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'لون النادي الوجهة', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'شريط عاجل', type: 'boolean', value: false },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'MERCATO_HIT', 'LUXURY_OUT'),
      { id: 'scale', label: 'الحجم', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-player-impact-card',
    templateId: 'template-mercato-player-impact-card',
    name: 'ميركاتو — توقع تأثير اللاعب',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'IMPT',
    templateAccent: '#60A5FA',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'بطاقة عريضة لتوقع تأثير اللاعب: مؤشرات تقدم، صورة اللاعب، مسار الصفقة، درجة الثقة، وحركة سينمائية.',
    theme: { primaryColor: '#60A5FA', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'نمط التصميم', type: 'select', value: 'PLAYER_IMPACT_CARD', options: MERCATO_DESIGN_STYLE_OPTIONS },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'TACTICAL_DARK', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'توقع التأثير' },
      { id: 'subheadline', label: 'العنوان الفرعي', type: 'text', value: 'لوحة قراءة سريعة: الدقائق، التقدم بالكرة، الإبداع، والجاهزية.' },
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'بيدري' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Pedri.png' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Pedri.png' },
      { id: 'sportmonksPlayerId', label: 'معرّف اللاعب في Sportmonks', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'اسم البحث في Sportmonks', type: 'text', value: 'Pedri' },
      { id: 'playerTeam', label: 'فريق اللاعب', type: 'text', value: 'برشلونة' },
      { id: 'playerPosition', label: 'مركز اللاعب', type: 'text', value: 'وسط / صانع لعب' },
      { id: 'seasonLabel', label: 'وسم الموسم', type: 'text', value: 'الموسم الماضي' },
      { id: 'fromClub', label: 'النادي الحالي', type: 'text', value: 'برشلونة' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'النادي الوجهة', type: 'text', value: 'برشلونة' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'ملف السوق', type: 'text', value: 'محور إبداعي' },
      { id: 'confidence', label: 'نسبة ثقة الميركاتو (%)', type: 'range', value: 74, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'المصدر', type: 'text', value: 'نموذج كشافة Reo' },
      { id: 'playerStatsJson', label: 'إحصائيات موسم اللاعب JSON', type: 'textarea', value: '[{"label":"المشاركات","value":"52","hint":"الجاهزية"},{"label":"الدقائق","value":"3,210","hint":"الحمل"},{"label":"تمريرات تقدمية","value":"96","hint":"البناء"},{"label":"تمريرات مفتاحية","value":"74","hint":"صناعة فرص"},{"label":"ثنائيات ناجحة","value":"58","hint":"نسبة"},{"label":"دقة التمرير","value":"91","hint":"نسبة"}]' },
      { id: 'latestNews', label: 'قراءة السوق', type: 'textarea', value: 'الدور الإبداعي ما زال مركزيًا;الحمل البدني يراقب أسبوعيًا;استخدم Sportmonks عند توفر التوكن' },
      { id: 'dailyDeals', label: 'صفقات محسومة اليوم', type: 'textarea', value: 'صورة اللاعب محفوظة;لوحة الأرقام جاهزة;المؤثر الصوتي مضبوط' },
      { id: 'expectedDeals', label: 'صفقات متوقعة', type: 'textarea', value: 'ربط API أرقام الموسم;أرشفة البطاقة النهائية;إضافة حزمة ألوان خاصة بالنادي' },
      { id: 'marketItems', label: 'عناصر السوق JSON', type: 'textarea', value: '[{"player":"بيدري","from":"برشلونة","to":"برشلونة","value":"محور إبداعي","confidence":74,"status":"لاعب أساسي","tag":"تأثير"},{"player":"فرينكي دي يونغ","from":"برشلونة","to":"برشلونة","value":"تحكم الوسط","confidence":68,"status":"متابعة","tag":"بناء"},{"player":"غافي","from":"برشلونة","to":"برشلونة","value":"كثافة","confidence":79,"status":"عودة","tag":"طاقة"}]' },
      { id: 'accentColor', label: 'لون التمييز', type: 'color', value: '#60A5FA' },
      { id: 'fromColor', label: 'لون النادي الحالي', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'لون النادي الوجهة', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'شريط عاجل', type: 'boolean', value: false },
      ...broadcastMotionPreset('DATA_RUSH', 'DATA_RUSH_OUT', 'DATA_SLAM', 'BROADCAST_OUT'),
      { id: 'scale', label: 'الحجم', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-contract-exit-watch',
    templateId: 'template-mercato-contract-exit-watch',
    name: 'ميركاتو — مراقبة نهاية العقد',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'EXIT',
    templateAccent: '#F97316',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'قالب قصة نهاية عقد أو انتقال حر: صورة اللاعب، نسبة الاحتمال، مسار القرار، وشريط أخبار سريع.',
    theme: { primaryColor: '#F97316', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'نمط التصميم', type: 'select', value: 'DEAL_BREAKER', options: MERCATO_DESIGN_STYLE_OPTIONS },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'مراقبة نهاية العقد' },
      { id: 'subheadline', label: 'العنوان الفرعي', type: 'text', value: 'سيناريو نهاية العقد: زاوية انتقال حر، نسبة الاحتمال، وإشارة السوق الحية.' },
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'روبرت ليفاندوفسكي' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Robert%20Lewandowski.png' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Robert%20Lewandowski.png' },
      { id: 'sportmonksPlayerId', label: 'معرّف اللاعب في Sportmonks', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'اسم البحث في Sportmonks', type: 'text', value: 'Robert Lewandowski' },
      { id: 'playerTeam', label: 'فريق اللاعب', type: 'text', value: 'برشلونة' },
      { id: 'playerPosition', label: 'مركز اللاعب', type: 'text', value: 'مهاجم صريح' },
      { id: 'seasonLabel', label: 'وسم الموسم', type: 'text', value: '2025/26' },
      { id: 'fromClub', label: 'النادي الحالي', type: 'text', value: 'برشلونة' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'النادي الوجهة', type: 'text', value: 'انتقال حر' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: '' },
      { id: 'dealValue', label: 'حزمة الصفقة', type: 'text', value: 'انتقال حر / نهاية عقد' },
      { id: 'confidence', label: 'نسبة الاحتمال (%)', type: 'range', value: 65, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'المصدر', type: 'text', value: 'مكتب ميركاتو Reo' },
      { id: 'playerStatsJson', label: 'إحصائيات موسم اللاعب JSON', type: 'textarea', value: '[{"label":"الأهداف","value":"25","hint":"إنتاج الموسم"},{"label":"تسديدات / 90","value":"3.8","hint":"تهديد منطقة الجزاء"},{"label":"لمسات داخل المنطقة","value":"178","hint":"حضور هجومي"},{"label":"ثنائيات هوائية","value":"54%","hint":"صراعات المهاجم"},{"label":"الدقائق","value":"2,640","hint":"حمل الموسم"},{"label":"فرص كبيرة","value":"28","hint":"حجم الإنهاء"}]' },
      { id: 'latestNews', label: 'قراءة السوق', type: 'textarea', value: 'وضع العقد يفتح سيناريو انتقال حر;قرار النادي مرتبط بتخطيط الرواتب;المسار النهائي يبقى مفتوحًا حتى حسم مفاوضات التجديد' },
      { id: 'dailyDeals', label: 'صفقات محسومة اليوم', type: 'textarea', value: 'صورة اللاعب موجودة في الذاكرة;يمكن تحديث النسبة من صندوق الذكاء;مؤثر نهاية العقد جاهز' },
      { id: 'expectedDeals', label: 'صفقات متوقعة', type: 'textarea', value: 'إشارة اجتماع وكيل;قرار تجديد أو خروج;أرشفة القصة النهائية بعد البث' },
      { id: 'marketItems', label: 'عناصر السوق JSON', type: 'textarea', value: '[{"player":"روبرت ليفاندوفسكي","from":"برشلونة","to":"انتقال حر","value":"انتقال حر / نهاية عقد","confidence":65,"status":"مراقبة العقد","tag":"خروج"}]' },
      { id: 'accentColor', label: 'لون التمييز', type: 'color', value: '#F97316' },
      { id: 'fromColor', label: 'لون النادي الحالي', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'لون النادي الوجهة', type: 'color', value: '#111827' },
      { id: 'isUrgent', label: 'شريط عاجل', type: 'boolean', value: true },
      ...broadcastMotionPreset('SPOTLIGHT_POP', 'SPOTLIGHT_POP_OUT', 'CONTRACT_STAMP', 'BROADCAST_OUT'),
      { id: 'scale', label: 'الحجم', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-here-we-go-board',
    templateId: 'template-mercato-here-we-go-board',
    name: 'ميركاتو — لوحة الحسم النهائي',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'HWG',
    templateAccent: '#22D3EE',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'لوحة حسم سريعة لصفقة رئيسية وعدة إشارات سوق قابلة للتحديث أثناء الحلقة.',
    theme: { primaryColor: '#22D3EE', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'نمط التصميم', type: 'select', value: 'MARKET_COMMAND_CENTER', options: MERCATO_DESIGN_STYLE_OPTIONS },
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'زجاج نيون' },
        { value: 'TACTICAL_DARK', label: 'تكتيكي داكن' },
        { value: 'LUXE_STUDIO', label: 'استوديو فاخر' },
        { value: 'CLEAN_BROADCAST', label: 'بث نظيف' },
      ] },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'لوحة الحسم النهائي' },
      { id: 'subheadline', label: 'العنوان الفرعي', type: 'text', value: 'صفقة بارزة، نسبة مباشرة، وإشارات سريعة لفقرة ميركاتو حية.' },
      { id: 'playerName', label: 'اللاعب الرئيسي', type: 'text', value: 'لامين يامال' },
      { id: 'playerImage', label: 'صورة اللاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'playerImageLarge', label: 'رندر/صورة كبيرة للاعب', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'fromClub', label: 'النادي الحالي', type: 'text', value: 'برشلونة' },
      { id: 'fromClubLogo', label: 'شعار النادي الحالي', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'النادي الوجهة', type: 'text', value: 'برشلونة' },
      { id: 'toClubLogo', label: 'شعار النادي الوجهة', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'حزمة الصفقة', type: 'text', value: 'أصل محمي' },
      { id: 'confidence', label: 'نسبة الثقة (%)', type: 'range', value: 88, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'المصدر', type: 'text', value: 'غرفة ميركاتو Reo Show' },
      { id: 'marketItems', label: 'عناصر السوق JSON', type: 'textarea', value: '[{"player":"لامين يامال","from":"برشلونة","to":"برشلونة","value":"أصل محمي","confidence":88,"status":"مغلق","tag":"أساسي"},{"player":"روبرت ليفاندوفسكي","from":"برشلونة","to":"انتقال حر","value":"انتقال حر","confidence":65,"status":"مراقبة عقد","tag":"خروج"},{"player":"داني أولمو","from":"برشلونة","to":"برشلونة","value":"محور إبداعي","confidence":74,"status":"متابعة","tag":"تأثير"}]' },
      { id: 'dailyDeals', label: 'صفقات محسومة اليوم', type: 'textarea', value: 'ملف العقد محدّث;صورة اللاعب مؤكدة في الذاكرة;صندوق الذكاء جاهز للعرض' },
      { id: 'expectedDeals', label: 'صفقات متوقعة', type: 'textarea', value: 'بطاقة لاعب جديدة;توسيع ذاكرة شعارات الأندية;أرشفة الحزمة النهائية' },
      { id: 'latestNews', label: 'آخر الأخبار', type: 'textarea', value: 'الصق سطرًا أو عدة أسطر انتقال في صندوق الذكاء;اللوحة تملأ اللاعب والنادي والثقة والصورة عند توفرها;المؤثر مضبوط كإشارة ميركاتو قوية' },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'HERE_WE_GO_STING', 'LUXURY_OUT'),
      { id: 'accentColor', label: 'لون التمييز', type: 'color', value: '#22D3EE' },
      { id: 'fromColor', label: 'لون النادي الحالي', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'لون النادي الوجهة', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'شريط عاجل', type: 'boolean', value: true },
      { id: 'scale', label: 'الحجم', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-barca-premium',
    templateId: 'template-barca-premium',
    name: 'برشلونة — حزمة النادي',
    type: OverlayType.BARCA_PREMIUM,
    isVisible: false,
    templateIcon: 'FCB',
    templateAccent: '#EDBB00',
    templateGroup: 'REO_BROADCAST',
    templateDescription: 'هوية برشلونة المحترفة بأسلوب دوري إسباني حديث.',
    theme: { primaryColor: '#EDBB00', secondaryColor: '#06001a', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'firstName',  label: 'الاسم الأول', type: 'text',  value: 'LAMINE' },
      { id: 'lastName',   label: 'اسم العائلة', type: 'text',  value: 'YAMAL' },
      { id: 'position',   label: 'المركز', type: 'text', value: 'RW' },
      { id: 'jerseyNum',  label: 'رقم القميص', type: 'text', value: '27' },
      { id: 'playerImage',label: 'صورة اللاعب', type: 'image', value: '' },
      { id: 'teamColor',  label: 'لون الفريق', type: 'color', value: '#004D98' },
      { id: 'badgeMode',  label: 'نمط العرض', type: 'select', value: 'player', options: [
          {value:'player',label:'بطاقة لاعب'},
          {value:'news',  label:'خبر'},
          {value:'stats', label:'إحصائيات'}
        ] },
      { id: 'headline',   label: 'العنوان (للخبر/الإحصائيات)', type: 'text', value: 'FC BARCELONA' },
      { id: 'subline',    label: 'السطر الفرعي', type: 'text', value: 'LA LIGA 2024/25' },
      { id: 'bodyText',   label: 'النص', type: 'textarea', value: '' },
      { id: 'stat1Label',  label: 'إحصائية 1 اسم',  type: 'text',  value: 'الأهداف' },
      { id: 'stat1Value',  label: 'إحصائية 1 رقم',  type: 'text',  value: '25' },
      { id: 'stat2Label',  label: 'إحصائية 2 اسم',  type: 'text',  value: 'المباريات' },
      { id: 'stat2Value',  label: 'إحصائية 2 رقم',  type: 'text',  value: '38' },
      { id: 'stat3Label',  label: 'إحصائية 3 اسم',  type: 'text',  value: 'التمريرات' },
      { id: 'stat3Value',  label: 'إحصائية 3 رقم',  type: 'text',  value: '143' },
      { id: 'showBadge',   label: 'إظهار شارة النادي',  type: 'boolean', value: true },
      { id: 'scale',       label: 'الحجم',  type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY',   label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX',   label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
];

// ─── Mercato Targets Templates (TRANSFER_TARGETS) ──────────────────────────
const buildTransferTargetsTemplate = (
  id: string,
  name: string,
  description: string,
  icon: string,
  displayMode: 'SEQUENCE' | 'SLIDE' | 'CYCLE',
  visualTheme: string = 'NEON_GLASS',
  accentColor: string = '#edb111',
): OverlayConfig => ({
  id,
  templateId: id,
  name,
  type: OverlayType.TRANSFER_TARGETS,
  isVisible: false,
  templateIcon: icon,
  templateAccent: accentColor,
  templateGroup: 'MERCATO_PACKAGE',
  templateDescription: description,
  theme: { primaryColor: accentColor, secondaryColor: '#04060a', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
  slots: {},
  fields: [
    ...commonFields,
    { id: 'displayMode', label: 'وضع العرض', type: 'select', value: displayMode, options: [
      { value: 'SEQUENCE', label: 'ظهور متتابع مع صوت' },
      { value: 'SLIDE',    label: 'سلايد عصري لمركز واحد' },
      { value: 'CYCLE',    label: 'دوران تلقائي بين المراكز' },
    ] },
    { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: visualTheme, options: [
      { value: 'CLEAN_BROADCAST', label: '🗞️ Newsroom Pro — استوديو إخباري احترافي' },
      { value: 'TACTICAL_DARK',   label: '🎙️ Fabrizio Dark — أسود تكتيكي على غرار Fabrizio' },
      { value: 'BARCA_HERITAGE',  label: '🏛️ Club Official — هوية النادي الرسمية' },
      { value: 'CARBON_FIBER',    label: '⚙️ Tactical Board — لوحة تكتيكية بألياف كربون' },
      { value: 'NEON_GLASS',      label: '📡 Mercato Radar — رادار الميركاتو نيوني' },
      { value: 'GRADIENT_FIRE',   label: '⏳ يوم الحسم الناري' },
      { value: 'EMERALD_FIELD',   label: '💼 Financial Desk — مكتب الصفقات المالية' },
      { value: 'RETRO_ANALOG',    label: '📞 Agent Room — غرفة الوكلاء الدافئة' },
      { value: 'HOLOGRAM_PURPLE', label: '🩻 Medical X-Ray — أشعة طبية بنفسجية' },
      { value: 'LUXE_GOLD',       label: '🏆 Luxury Studio — استوديو فاخر ذهبي' },
    ] },
    { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'أهداف برشلونة في سوق الانتقالات' },
    { id: 'subheadline', label: 'العنوان الفرعي', type: 'text', value: 'Mercato Targets — Reo Show' },
    { id: 'clubName', label: 'اسم النادي', type: 'text', value: 'FC Barcelona' },
    { id: 'clubLogo', label: 'شعار النادي', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png' },
    { id: 'accentColor', label: 'لون التمييز', type: 'color', value: accentColor },
    { id: 'sidePanelWidth', label: 'عرض الشريط الجانبي %', type: 'range', value: 30, min: 22, max: 50, step: 1 },
    { id: 'sequenceInterval', label: 'الفاصل بين الأهداف (ث) - وضع تتابع', type: 'range', value: 4, min: 2, max: 15, step: 1 },
    { id: 'cycleInterval', label: 'الفاصل بين المراكز (ث) - وضع الدوران', type: 'range', value: 30, min: 10, max: 120, step: 5 },
    { id: 'enabledPositions', label: 'المراكز المفعلة (مفصولة بفاصلة)', type: 'text', value: 'pos1,pos2,pos3,pos4' },
    { id: 'activePosition', label: 'المركز النشط (لوضع السلايد)', type: 'select', value: 'pos1', options: [
      { value: 'pos1', label: 'رأس الحربة' },
      { value: 'pos2', label: 'الجناح' },
      { value: 'pos3', label: 'الوسط' },
      { value: 'pos4', label: 'قلب الدفاع' },
      { value: 'pos5', label: 'الظهير' },
      { value: 'pos6', label: 'حارس المرمى' },
    ] },
    { id: 'soundPerTarget', label: 'مؤثر صوتي لكل هدف', type: 'select', value: 'TARGET_REVEAL', options: BROADCAST_SOUND_OPTIONS },
    { id: 'showRating', label: 'إظهار التقييم', type: 'boolean', value: true },
    { id: 'showCountry', label: 'إظهار الجنسية', type: 'boolean', value: false },

    // Position 1 — Striker (default 4 targets)
    { id: 'pos1Label', label: 'اسم المركز 1 (عربي)', type: 'text', value: 'رأس الحربة' },
    { id: 'pos1LabelEn', label: 'اسم المركز 1 (إنجليزي)', type: 'text', value: 'STRIKER' },
    { id: 'pos1Targets', label: 'أهداف المركز 1 — JSON: name, image, club, clubLogo, age, value, rating, nationality (أو سطور بفواصل |)', type: 'textarea', value: '[\n  {"name":"Erling Haaland","image":"https://img.a.transfermarkt.technology/portrait/big/418560-1709108116.jpg","club":"Manchester City","clubLogo":"https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg","age":"25","value":"180M EUR","rating":"94","nationality":"NOR"},\n  {"name":"Victor Osimhen","image":"https://img.a.transfermarkt.technology/portrait/big/401923-1701118619.jpg","club":"Napoli","clubLogo":"https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg","age":"27","value":"110M EUR","rating":"88","nationality":"NGA"},\n  {"name":"Julian Alvarez","image":"https://img.a.transfermarkt.technology/portrait/big/433351-1717677020.jpg","club":"Atletico Madrid","clubLogo":"https://upload.wikimedia.org/wikipedia/en/f/f9/Atletico_Madrid_2017_logo.svg","age":"26","value":"95M EUR","rating":"86","nationality":"ARG"}\n]' },

    // Position 2 — Winger
    { id: 'pos2Label', label: 'اسم المركز 2', type: 'text', value: 'الجناح' },
    { id: 'pos2LabelEn', label: 'اسم المركز 2 (EN)', type: 'text', value: 'WINGER' },
    { id: 'pos2Targets', label: 'أهداف المركز 2', type: 'textarea', value: '[\n  {"name":"Bradley Barcola","image":"","club":"PSG","clubLogo":"","age":"23","value":"75M EUR","rating":"85","nationality":"FRA"},\n  {"name":"Rafael Leao","image":"","club":"AC Milan","clubLogo":"","age":"26","value":"90M EUR","rating":"86","nationality":"POR"}\n]' },

    // Position 3 — Midfield
    { id: 'pos3Label', label: 'اسم المركز 3', type: 'text', value: 'الوسط' },
    { id: 'pos3LabelEn', label: 'اسم المركز 3 (EN)', type: 'text', value: 'MIDFIELD' },
    { id: 'pos3Targets', label: 'أهداف المركز 3', type: 'textarea', value: '[\n  {"name":"Joshua Kimmich","image":"","club":"Bayern Munich","clubLogo":"","age":"31","value":"45M EUR","rating":"87","nationality":"GER"},\n  {"name":"Martin Zubimendi","image":"","club":"Real Sociedad","clubLogo":"","age":"27","value":"60M EUR","rating":"83","nationality":"ESP"}\n]' },

    // Position 4 — Centre back
    { id: 'pos4Label', label: 'اسم المركز 4', type: 'text', value: 'قلب الدفاع' },
    { id: 'pos4LabelEn', label: 'اسم المركز 4 (EN)', type: 'text', value: 'CENTRE-BACK' },
    { id: 'pos4Targets', label: 'أهداف المركز 4', type: 'textarea', value: '[\n  {"name":"William Saliba","image":"","club":"Arsenal","clubLogo":"","age":"25","value":"85M EUR","rating":"86","nationality":"FRA"},\n  {"name":"Goncalo Inacio","image":"","club":"Sporting CP","clubLogo":"","age":"24","value":"55M EUR","rating":"82","nationality":"POR"}\n]' },

    // Position 5 — Full back
    { id: 'pos5Label', label: 'اسم المركز 5', type: 'text', value: 'الظهير' },
    { id: 'pos5LabelEn', label: 'اسم المركز 5 (EN)', type: 'text', value: 'FULL-BACK' },
    { id: 'pos5Targets', label: 'أهداف المركز 5', type: 'textarea', value: '[]' },

    // Position 6 — Goalkeeper
    { id: 'pos6Label', label: 'اسم المركز 6', type: 'text', value: 'حارس المرمى' },
    { id: 'pos6LabelEn', label: 'اسم المركز 6 (EN)', type: 'text', value: 'GOALKEEPER' },
    { id: 'pos6Targets', label: 'أهداف المركز 6', type: 'textarea', value: '[]' },

    // AI prompt for fast filling
    { id: 'aiPrompt', label: 'صندوق الذكاء (للحقن السريع)', type: 'textarea', value: 'اكتب اسم المركز ثم قائمة اللاعبين كل اسم في سطر، أو قم بلصق JSON مباشرة في حقل أهداف المركز.' },

    { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.6, step: 0.05 },
    { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -400, max: 400, step: 5 },
    { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -400, max: 400, step: 5 },
    ...broadcastMotionPreset(
      displayMode === 'SEQUENCE' ? 'GLASS_SWEEP' : displayMode === 'SLIDE' ? 'STADIUM_SWEEP' : 'LOWER_THIRD_WIPE',
      'STADIUM_SWEEP_OUT',
      displayMode === 'SEQUENCE' ? 'TARGET_REVEAL' : displayMode === 'SLIDE' ? 'TRANSFER_REVEAL' : 'POSITION_SWITCH',
      'LUXURY_OUT',
    ),
  ],
});

// 3 قوالب أساسية فقط — كل واحد يحتوي على كل الثيمات الـ 5 داخل قائمة منسدلة
const TRANSFER_TARGETS_TEMPLATES: OverlayConfig[] = [
  buildTransferTargetsTemplate(
    'template-transfer-targets-sequence',
    'أهداف النادي — ظهور متتابع بصوت',
    'شريط جانبي يسار. كل هدف يظهر بعد الآخر مع تأثير صوتي مخصص. 5 ثيمات بصرية في الإعدادات.',
    '🎯', 'SEQUENCE', 'NEON_GLASS', '#22d3ee',
  ),
  buildTransferTargetsTemplate(
    'template-transfer-targets-slide',
    'أهداف النادي — سلايد لمركز واحد',
    'يعرض كل أهداف مركز واحد دفعة واحدة بانتقال متدرج. 5 ثيمات بصرية في الإعدادات.',
    '🎯', 'SLIDE', 'CLEAN_BROADCAST', '#3b82f6',
  ),
  buildTransferTargetsTemplate(
    'template-transfer-targets-cycle',
    'أهداف النادي — دوران تلقائي',
    'الشريط يدور تلقائياً بين كل المراكز كل 30 ثانية (قابل للتعديل). 5 ثيمات بصرية.',
    '🎯', 'CYCLE', 'TACTICAL_DARK', '#ff4b3e',
  ),
];

// ─── Breaking Here We Go Templates (BREAKING_HERE_WE_GO) ────────────────────
const buildBreakingHereWeGoTemplate = (
  id: string,
  name: string,
  description: string,
  icon: string,
  variant: 'BREAKING' | 'OFFICIAL' | 'IMPORTANT',
  newsTitle: string,
  newsBody: string,
  visualTheme: string = 'CINEMATIC_RED',
): OverlayConfig => ({
  id,
  templateId: id,
  name,
  type: OverlayType.BREAKING_HERE_WE_GO,
  isVisible: false,
  templateIcon: icon,
  templateAccent: variant === 'BREAKING' ? '#dc2626' : variant === 'OFFICIAL' ? '#1d4ed8' : '#ea580c',
  templateGroup: 'BREAKING_PACKAGE',
  templateDescription: description,
  theme: {
    primaryColor: variant === 'BREAKING' ? '#dc2626' : variant === 'OFFICIAL' ? '#1d4ed8' : '#ea580c',
    secondaryColor: '#000000',
    backgroundColor: 'transparent',
    fontFamily: 'Tajawal',
  },
  slots: {},
  fields: [
    ...commonFields,
    { id: 'variant', label: 'نوع الخبر', type: 'select', value: variant, options: [
      { value: 'BREAKING',  label: 'خبر عاجل (أحمر)' },
      { value: 'OFFICIAL',  label: 'خبر رسمي (أزرق)' },
      { value: 'IMPORTANT', label: 'خبر مهم (برتقالي)' },
    ] },
    { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: visualTheme, options: [
      { value: 'MONO_BROADCAST', label: '🗞️ Newsroom Pro — استوديو إخباري احترافي' },
      { value: 'CINEMATIC_RED',  label: '🎙️ Fabrizio Dark — أسود تكتيكي على غرار Fabrizio' },
      { value: 'OFFICIAL_BLUE',  label: '🏛️ Club Official — هوية النادي الرسمية' },
      { value: 'CLASSIFIED',     label: '⚙️ Tactical Board — لوحة تكتيكية سرية' },
      { value: 'NEON_CYBER',     label: '📡 Mercato Radar — رادار الميركاتو نيوني' },
      { value: 'STORM_WARNING',  label: '⏳ يوم الحسم العاصف' },
      { value: 'GLOBAL_PULSE',   label: '💼 Financial Desk — مكتب الصفقات المالية' },
      { value: 'BLOOD_MOON',     label: '📞 Agent Room — غرفة الوكلاء العميقة' },
      { value: 'BREAKING_GLASS', label: '🩻 Medical X-Ray — أشعة طبية' },
      { value: 'LUXE_GOLD',      label: '🏆 Luxury Studio — استوديو فاخر ذهبي' },
    ] },
    { id: 'headline', label: 'النص الكبير في المقدمة', type: 'text', value: 'HERE WE GO' },
    { id: 'newsTitle', label: 'عنوان الخبر', type: 'text', value: newsTitle },
    { id: 'newsBody', label: 'تفاصيل الخبر', type: 'textarea', value: newsBody },
    { id: 'newsImage', label: 'صورة الخبر', type: 'image', value: '' },
    { id: 'sourceLabel', label: 'المصدر', type: 'text', value: 'Reo Show — Mercato Desk' },
    { id: 'showTimestamp', label: 'إظهار الوقت', type: 'boolean', value: true },
    { id: 'showStingerLayer', label: 'طبقة المؤثر الصوتي العميق', type: 'boolean', value: true },

    // Intro sequence
    { id: 'introDuration', label: 'مدة المقدمة الدرامية (ms)', type: 'range', value: 2200, min: 1000, max: 4500, step: 100 },

    // ─── Pro Broadcast Voice (StreamElements TTS — runs from the browser, no proxy needed) ─
    { id: 'voiceEnabled', label: 'تفعيل الصوت الاحترافي', type: 'boolean', value: true },
    { id: 'voiceMode', label: 'نمط الصوت', type: 'select', value: 'BROADCAST', options: [
      { value: 'BROADCAST',    label: '🎙️ Broadcast — صوت بشري حقيقي + Stinger (موصى به)' },
      { value: 'STINGER_ONLY', label: '💥 Stinger Only — مؤثر استوديو فقط بدون كلام' },
    ] },
    { id: 'voiceText', label: 'النص المنطوق (يدعم العربي + الإنجليزي معاً)', type: 'text', value: 'Here we go' },

    // Primary lane — English / Latin scripts
    { id: 'primaryProvider', label: '🎤 الصوت الأساسي — المصدر (للإنجليزي واللغات اللاتينية)', type: 'select', value: 'streamElements', options: [
      { value: 'streamElements',   label: '🌐 StreamElements (الافتراضي، يعمل مباشرة)' },
      { value: 'customUrl',        label: '📁 رابط MP3 مخصص (الجودة القصوى)' },
      { value: 'googleTranslate',  label: '🌐 Google Translate TTS (احتياطي)' },
      { value: 'microsoftEdge',    label: '🎯 Microsoft Edge Neural — (يحتاج /api/tts، يستخدم StreamElements تلقائياً حالياً)' },
    ] },
    { id: 'primaryVoiceId', label: 'صوت الأساسي', type: 'select', value: 'Brian', options: [
      // StreamElements (these actually work in production today)
      { value: 'Brian',   label: '🇬🇧 Brian — بريطاني عميق (موصى به)' },
      { value: 'Joey',    label: '🇺🇸 Joey — أمريكي للإعلانات' },
      { value: 'Matthew', label: '🇺🇸 Matthew — أمريكي رسمي' },
      { value: 'Russell', label: '🇦🇺 Russell — أسترالي حازم' },
      { value: 'Salli',   label: '🇺🇸 Salli — نسائي أمريكي' },
      { value: 'Amy',     label: '🇬🇧 Amy — نسائي بريطاني' },
      { value: 'Enrique', label: '🇪🇸 Enrique — إسباني رجالي' },
      { value: 'Mathieu', label: '🇫🇷 Mathieu — فرنسي رجالي' },
      { value: 'gt-en',   label: '🌐 Google Translate (English)' },
      // Microsoft Edge entries — currently routed via StreamElements automatically
      { value: 'en-US-GuyNeural',     label: '🎯 Guy (Edge) — يستخدم Joey حالياً' },
      { value: 'en-US-DavisNeural',   label: '🎯 Davis (Edge) — يستخدم Joey حالياً' },
      { value: 'en-GB-RyanNeural',    label: '🎯 Ryan (Edge) — يستخدم Brian حالياً' },
    ] },
    { id: 'primaryCustomUrl', label: 'رابط MP3 مخصص للأساسي (إن اخترت "رابط MP3 مخصص")', type: 'text', value: '' },

    // Secondary lane — Arabic
    { id: 'secondaryProvider', label: '🎤 الصوت الثانوي — المصدر (للعربية فقط)', type: 'select', value: 'streamElements', options: [
      { value: 'streamElements',   label: '🌐 StreamElements (الافتراضي، يعمل مباشرة)' },
      { value: 'customUrl',        label: '📁 رابط MP3 مخصص (الجودة القصوى)' },
      { value: 'googleTranslate',  label: '🌐 Google Translate TTS (احتياطي)' },
      { value: 'microsoftEdge',    label: '🎯 Microsoft Edge Neural — (يحتاج /api/tts، يستخدم StreamElements تلقائياً حالياً)' },
    ] },
    { id: 'secondaryVoiceId', label: 'صوت الثانوي (عربي)', type: 'select', value: 'Naayf', options: [
      { value: 'Naayf',  label: '🇸🇦 Naayf — عربي رجالي طبيعي (موصى به)' },
      { value: 'Hoda',   label: '🇪🇬 Hoda — عربي نسائي مصري' },
      { value: 'gt-ar',  label: '🌐 Google Translate (عربي)' },
      // Microsoft Edge entries — currently routed via StreamElements automatically
      { value: 'ar-SA-HamedNeural',   label: '🎯 حامد (Edge) — يستخدم Naayf حالياً' },
      { value: 'ar-EG-ShakirNeural',  label: '🎯 شاكر (Edge) — يستخدم Naayf حالياً' },
      { value: 'ar-SA-ZariyahNeural', label: '🎯 زاريا (Edge) — يستخدم Hoda حالياً' },
    ] },
    { id: 'secondaryCustomUrl', label: 'رابط MP3 مخصص للعربي (إن اخترت "رابط MP3 مخصص")', type: 'text', value: '' },

    { id: 'voiceVolume', label: 'حجم الصوت المنطوق', type: 'range', value: 0.95, min: 0, max: 1.4, step: 0.05 },
    { id: 'voicePitchShift', label: 'تعديل النغمة (semitones، سالب = أعمق)', type: 'range', value: 0, min: -6, max: 6, step: 1 },

    { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.4, step: 0.05 },
    { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -300, max: 300, step: 5 },
    { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -300, max: 300, step: 5 },

    ...broadcastMotionPreset(
      'SPOTLIGHT_POP',
      'BROADCAST_FADE_OUT',
      variant === 'BREAKING' ? 'BREAKING_RISER' : variant === 'OFFICIAL' ? 'OFFICIAL_STAMP' : 'IMPORTANT_PING',
      'BROADCAST_OUT',
    ),
  ],
});

// 3 قوالب أساسية فقط — كل واحد يحتوي على كل الثيمات الـ 5 داخل قائمة منسدلة
const BREAKING_HERE_WE_GO_TEMPLATES: OverlayConfig[] = [
  buildBreakingHereWeGoTemplate(
    'template-breaking-news',
    'خبر عاجل — Here We Go',
    'مقدمة صوتية درامية + بطاقة خبر عاجل. 5 ثيمات بصرية للاختيار من الإعدادات.',
    '🚨', 'BREAKING',
    'صفقة كبرى تنتظر الإعلان رسمياً',
    'وفقاً لمصادر موثوقة، اللاعب سيوقع عقده الجديد خلال الساعات القادمة بعد اتفاق شامل بين الأطراف.',
    'CINEMATIC_RED',
  ),
  buildBreakingHereWeGoTemplate(
    'template-breaking-official',
    'خبر رسمي — إعلان النادي',
    'إعلان رسمي بصوت "Here We Go" الفخم. 5 ثيمات بصرية في الإعدادات.',
    '✅', 'OFFICIAL',
    'إعلان رسمي من النادي',
    'أعلن النادي رسمياً عن إتمام الصفقة وتم توقيع جميع الأوراق القانونية بنجاح.',
    'OFFICIAL_BLUE',
  ),
  buildBreakingHereWeGoTemplate(
    'template-breaking-important',
    'خبر مهم — تطور حصري',
    'خبر مهم يلفت الأنظار. 5 ثيمات بصرية للاختيار من الإعدادات.',
    '🔔', 'IMPORTANT',
    'تطور مهم في الصفقة',
    'تشير المعطيات إلى تقدم جوهري في المفاوضات مع تفاصيل جديدة من غرفة المفاوضات خلال الساعات القادمة.',
    'LUXE_GOLD',
  ),
];

// ─── 5 Innovative Mercato Templates ─────────────────────────────────────────

// Shared audio fields injected into every mercato innovative template so
// editors get one consistent UX. Profile-driven workflow: pick a profile
// and the cues are auto-selected. Editors can still override anything.
const mercatoAudioFields = (defaultProfile: string): OverlayField[] => [
  { id: 'audioProfile', label: '🎚️ Audio Profile', type: 'select', value: defaultProfile, options: [
    { value: 'fabrizioBreaking', label: '🎙️ Fabrizio Breaking — Here we go' },
    { value: 'arabicBreaking',   label: '⚡ Arabic Breaking — الأمور تحدث' },
    { value: 'officialClub',     label: '🏛️ Official Club — رسمياً' },
    { value: 'deadlineDrama',    label: '⏳ Deadline Drama — الليلة قد تُحسم الصفقة' },
    { value: 'sourceExclusive',  label: '🤐 مصدر خاص' },
    { value: 'dealHeating',      label: '🔥 Deal Heating — الصفقة تشتعل' },
    { value: 'analysisLab',      label: '🔬 Analysis Lab — فحص فني للاعب' },
  ] },
  { id: 'voicePackId', label: '🗣️ اختيار صوت من المكتبة', type: 'select', value: 'hereWeGo', options: [
    { value: 'none',                label: '— بدون صوت من المكتبة —' },
    { value: 'hereWeGo',            label: '🎙️ Here We Go (ملف صوتي حقيقي)' },
    { value: 'agreementClose',      label: '🤝 الاتفاق يقترب (ملف صوتي حقيقي)' },
    { value: 'transferApproaching', label: 'الانتقال يقترب (ملف صوتي حقيقي)' },
    { value: 'dealPercentagesCurrent', label: 'النسب الحالية للصفقات (ملف صوتي حقيقي)' },
    { value: 'thingsAreHappening',  label: '⚡ الأمور تحدث الآن (ملف صوتي حقيقي)' },
    { value: 'official',            label: '🏛️ رسمياً (TTS)' },
    { value: 'dealHeating',         label: '🔥 الميركاتو يشتعل الآن (ملف صوتي حقيقي)' },
    { value: 'deadlineTonight',     label: '⏳ الليلة قد تُحسم الصفقة (TTS)' },
    { value: 'sourceSpecial',       label: '🤐 مصدر خاص (TTS)' },
    { value: 'advancedTalks',       label: '🤝 المفاوضات تتقدم (TTS)' },
    { value: 'criticalStage',       label: '🚨 العملية دخلت المرحلة الحاسمة (TTS)' },
  ] },
  { id: 'signaturePhrase', label: '🗣️ Signature Phrase (نص العبارة — يدوي)', type: 'text', value: '' },
  { id: 'customVoiceUrl',  label: '📁 رابط ملف صوتي (mp3/wav) — أعلى أولوية للجودة', type: 'text', value: '' },
  { id: 'audioIntensity',  label: '⚡ Intensity — قوة المؤثر', type: 'range', value: 1.0, min: 0.3, max: 1.4, step: 0.05 },
  { id: 'enableVoice',     label: '🎤 تفعيل الصوت المنطوق', type: 'boolean', value: true },
  { id: 'enableSfx',       label: '🔊 تفعيل المؤثرات الصوتية', type: 'boolean', value: true },
];

const MERCATO_INNOVATIVE_TEMPLATES: OverlayConfig[] = [
  // ── 1. AGENT CALL ──────────────────────────────────────────────────────────
  {
    id: 'template-mercato-agent-call',
    templateId: 'template-mercato-agent-call',
    name: 'ميركاتو — مكالمة الوكيل المباشرة',
    type: OverlayType.MERCATO_AGENT_CALL,
    isVisible: false,
    templateIcon: '📞',
    templateAccent: '#ff4b3e',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'محاكاة مكالمة وكيل لاعبين على الهواء — chat bubbles متتابعة + waveform متحرك + بطاقة صفقة جانبية. فكرة لم تُستخدم في أي أداة بث كروية.',
    theme: { primaryColor: '#ff4b3e', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: 'TACTICAL_DARK', options: [
        { value: 'CLEAN_BROADCAST', label: '🔷 Clean Broadcast' },
        { value: 'TACTICAL_DARK',   label: '⚫ Tactical Dark' },
        { value: 'LUXE_GOLD',       label: '🟡 Luxe Gold' },
        { value: 'EMERALD_FIELD',   label: '🟢 Emerald Field' },
        { value: 'HOLOGRAM_PURPLE', label: '💜 Hologram Purple' },
      ] },
      { id: 'callerName',    label: 'اسم الوكيل / المتصل', type: 'text', value: 'AGENT — JORGE MENDES' },
      { id: 'callerRole',    label: 'دور المتصل',           type: 'text', value: 'GESTIFUTE' },
      { id: 'reporterName',  label: 'اسم المراسل',          type: 'text', value: 'REO MERCATO DESK' },
      { id: 'callDuration',  label: 'مدة المكالمة',         type: 'text', value: '03:42' },
      { id: 'dealHeadline',  label: 'عنوان الصفقة',         type: 'text', value: 'Negotiating €58M deal — final stage' },
      { id: 'playerName',    label: 'اسم اللاعب',           type: 'text', value: 'Nico Williams' },
      { id: 'playerImage',   label: 'صورة اللاعب',          type: 'image', value: '' },
      { id: 'clubFrom',      label: 'النادي المغادر',        type: 'text', value: 'Athletic Club' },
      { id: 'clubTo',        label: 'النادي الجديد',         type: 'text', value: 'Barcelona' },
      { id: 'dealValue',     label: 'قيمة الصفقة',          type: 'text', value: '€58M + bonuses' },
      { id: 'chatLines', label: 'محادثة المكالمة (JSON أو سطور متناوبة)', type: 'textarea', value: JSON.stringify([
        { side: 'reporter', text: 'Jorge, can you confirm the deal is done?' },
        { side: 'agent',    text: 'We are very close. Medical is scheduled.' },
        { side: 'reporter', text: 'What about the fee? Reports say €58M.' },
        { side: 'agent',    text: 'The clubs have agreed. Announcement soon.' },
        { side: 'reporter', text: 'Here we go?' },
        { side: 'agent',    text: 'Here we go.' },
      ], null, 2) },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.4, step: 0.05 },
      { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      ...mercatoAudioFields('fabrizioBreaking'),
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'AGENT_CALL', 'LUXURY_OUT'),
    ],
  },

  // ── 2. DEAL TIMELINE ───────────────────────────────────────────────────────
  {
    id: 'template-mercato-deal-timeline',
    templateId: 'template-mercato-deal-timeline',
    name: 'ميركاتو — خط زمني الصفقة',
    type: OverlayType.MERCATO_DEAL_TIMELINE,
    isVisible: false,
    templateIcon: '⏱️',
    templateAccent: '#10b981',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'خط زمني أفقي للصفقة من أول تواصل حتى التوقيع — كل مرحلة بتاريخ وحالة (تمت / جارية / قادمة) مع نسبة تقدم كلية.',
    theme: { primaryColor: '#10b981', secondaryColor: '#001a0e', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: 'EMERALD_FIELD', options: [
        { value: 'CLEAN_BROADCAST', label: '🔷 Clean Broadcast' },
        { value: 'TACTICAL_DARK',   label: '⚫ Tactical Dark' },
        { value: 'LUXE_GOLD',       label: '🟡 Luxe Gold' },
        { value: 'EMERALD_FIELD',   label: '🟢 Emerald Field' },
        { value: 'HOLOGRAM_PURPLE', label: '💜 Hologram Purple' },
      ] },
      { id: 'headline',    label: 'العنوان',          type: 'text', value: 'DEAL TIMELINE' },
      { id: 'playerName',  label: 'اسم اللاعب',       type: 'text', value: 'Lamine Yamal' },
      { id: 'playerImage', label: 'صورة اللاعب',      type: 'image', value: '' },
      { id: 'fromClub',    label: 'النادي المغادر',    type: 'text', value: 'Barcelona' },
      { id: 'toClub',      label: 'النادي الجديد',     type: 'text', value: 'Barcelona' },
      { id: 'dealValue',   label: 'قيمة الصفقة',      type: 'text', value: 'Contract Renewal' },
      { id: 'timelineSteps', label: 'مراحل الصفقة (JSON)', type: 'textarea', value: JSON.stringify([
        { date: 'Apr 12', label: 'First Contact',     description: 'Initial talks open between clubs', status: 'done' },
        { date: 'May 02', label: 'Verbal Agreement',  description: 'Salary structure agreed in principle', status: 'done' },
        { date: 'May 18', label: 'Medical',           description: 'Scheduled tomorrow at La Masia', status: 'active' },
        { date: 'May 22', label: 'Signature',         description: 'Press conference + official photos', status: 'pending' },
      ], null, 2) },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.4, step: 0.05 },
      { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      ...mercatoAudioFields('arabicBreaking'),
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'TARGET_REVEAL', 'LUXURY_OUT'),
    ],
  },

  // ── 3. BUDGET TRACKER ──────────────────────────────────────────────────────
  {
    id: 'template-mercato-budget-tracker',
    templateId: 'template-mercato-budget-tracker',
    name: 'ميركاتو — متتبع ميزانية النادي',
    type: OverlayType.MERCATO_BUDGET_TRACKER,
    isVisible: false,
    templateIcon: '💰',
    templateAccent: '#3b82f6',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'دفتر حسابات النادي في الميركاتو — صفقات واردة (مبيعات) وصادرة (شراء) مع رصيد متبقٍ وبار نسبة الميزانية.',
    theme: { primaryColor: '#3b82f6', secondaryColor: '#0b1117', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: 'CLEAN_BROADCAST', options: [
        { value: 'CLEAN_BROADCAST', label: '🔷 Clean Broadcast' },
        { value: 'TACTICAL_DARK',   label: '⚫ Tactical Dark' },
        { value: 'LUXE_GOLD',       label: '🟡 Luxe Gold' },
        { value: 'EMERALD_FIELD',   label: '🟢 Emerald Field' },
        { value: 'HOLOGRAM_PURPLE', label: '💜 Hologram Purple' },
      ] },
      { id: 'clubName',      label: 'اسم النادي',          type: 'text',  value: 'FC Barcelona' },
      { id: 'clubLogo',      label: 'شعار النادي',          type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png' },
      { id: 'seasonLabel',   label: 'الموسم',               type: 'text',  value: 'Mercato 2026/27' },
      { id: 'initialBudget', label: 'الميزانية الأولية (M€)', type: 'number', value: 150 },
      { id: 'ledgerEntries', label: 'سجل الصفقات (JSON)', type: 'textarea', value: JSON.stringify([
        { type: 'out', player: 'João Cancelo',   club: 'Manchester City', amount: 25, date: 'Jul 03' },
        { type: 'in',  player: 'João Félix',     club: 'Atletico Madrid', amount: 12, date: 'Jul 11' },
        { type: 'out', player: 'Vitor Roque',    club: 'Real Betis',      amount: 30, date: 'Jul 18' },
        { type: 'in',  player: 'Marcos Alonso',  club: 'Free agent',      amount: 0,  date: 'Aug 02' },
      ], null, 2) },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.4, step: 0.05 },
      { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      ...mercatoAudioFields('officialClub'),
      ...broadcastMotionPreset('DATA_RUSH', 'DATA_RUSH_OUT', 'CASH_REGISTER', 'BROADCAST_OUT'),
    ],
  },

  // ── 4. DEADLINE DAY ────────────────────────────────────────────────────────
  {
    id: 'template-mercato-deadline-day',
    templateId: 'template-mercato-deadline-day',
    name: 'ميركاتو — اليوم الأخير',
    type: OverlayType.MERCATO_DEADLINE_DAY,
    isVisible: false,
    templateIcon: '⏳',
    templateAccent: '#fbbf24',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'عداد عكسي حي ليوم انتهاء الميركاتو + تغذية صفقات مباشرة (Breaking / Done / Rumor) + إحصائيات سريعة.',
    theme: { primaryColor: '#fbbf24', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: 'TACTICAL_DARK', options: [
        { value: 'CLEAN_BROADCAST', label: '🔷 Clean Broadcast' },
        { value: 'TACTICAL_DARK',   label: '⚫ Tactical Dark' },
        { value: 'LUXE_GOLD',       label: '🟡 Luxe Gold' },
        { value: 'EMERALD_FIELD',   label: '🟢 Emerald Field' },
        { value: 'HOLOGRAM_PURPLE', label: '💜 Hologram Purple' },
      ] },
      { id: 'headline',    label: 'العنوان الكبير',    type: 'text', value: 'DEADLINE DAY' },
      { id: 'subline',     label: 'العنوان الفرعي',    type: 'text', value: 'SUMMER MERCATO 2026 — CLOSES TONIGHT' },
      { id: 'targetTime',  label: 'وقت الإغلاق (ISO)', type: 'text', value: new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 16) },
      { id: 'liveDeals', label: 'صفقات مباشرة (JSON)', type: 'textarea', value: JSON.stringify([
        { time: '14:08', player: 'João Cancelo',    from: 'Man City',      to: 'Barcelona', status: 'done' },
        { time: '15:32', player: 'Bruno Guimarães', from: 'Newcastle',     to: 'Man City',  status: 'breaking' },
        { time: '16:11', player: 'Frenkie de Jong', from: 'Barcelona',     to: 'Liverpool', status: 'rumor' },
        { time: '17:04', player: 'Marc Guéhi',      from: 'Crystal Palace', to: 'Newcastle', status: 'breaking' },
      ], null, 2) },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.4, step: 0.05 },
      { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      ...mercatoAudioFields('deadlineDrama'),
      ...broadcastMotionPreset('SPOTLIGHT_POP', 'SPOTLIGHT_POP_OUT', 'DEADLINE_ALARM', 'BROADCAST_OUT'),
    ],
  },

  // ── 5. X-RAY ───────────────────────────────────────────────────────────────
  {
    id: 'template-mercato-x-ray',
    templateId: 'template-mercato-x-ray',
    name: 'ميركاتو — أشعة تحليل اللاعب',
    type: OverlayType.MERCATO_X_RAY,
    isVisible: false,
    templateIcon: '🔬',
    templateAccent: '#a855f7',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'تحليل بصري كامل للاعب: رادار، ست قابليات بأشرطة، خريطة حرارة للمناطق الأكثر نشاطاً، وحكم نهائي.',
    theme: { primaryColor: '#a855f7', secondaryColor: '#08001a', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: 'HOLOGRAM_PURPLE', options: [
        { value: 'CLEAN_BROADCAST', label: '🔷 Clean Broadcast' },
        { value: 'TACTICAL_DARK',   label: '⚫ Tactical Dark' },
        { value: 'LUXE_GOLD',       label: '🟡 Luxe Gold' },
        { value: 'EMERALD_FIELD',   label: '🟢 Emerald Field' },
        { value: 'HOLOGRAM_PURPLE', label: '💜 Hologram Purple' },
      ] },
      { id: 'playerName',     label: 'اسم اللاعب',       type: 'text',  value: 'Pedri González' },
      { id: 'playerImage',    label: 'صورة اللاعب',      type: 'image', value: '' },
      { id: 'position',       label: 'المركز',            type: 'text',  value: 'CM — Central Midfielder' },
      { id: 'playerAge',      label: 'العمر',             type: 'text',  value: '23' },
      { id: 'overallRating',  label: 'التقييم الكلي',     type: 'range', value: 88, min: 50, max: 99, step: 1 },
      { id: 'verdict',        label: 'الحكم النهائي',     type: 'text',  value: 'GENERATIONAL TALENT — PROFILE FITS BARÇA DNA' },
      { id: 'radarStats', label: 'إحصائيات الرادار (JSON: label + value 0-100)', type: 'textarea', value: JSON.stringify([
        { label: 'PASSING',  value: 92 },
        { label: 'VISION',   value: 90 },
        { label: 'DRIBBLE',  value: 85 },
        { label: 'TEMPO',    value: 88 },
        { label: 'DEFENSE',  value: 70 },
        { label: 'STAMINA',  value: 78 },
      ], null, 2) },
      { id: 'heatZones', label: 'مناطق الحرارة (JSON: x, y, intensity 0-1)', type: 'textarea', value: JSON.stringify([
        { x: 50, y: 50, intensity: 1.0 },
        { x: 40, y: 45, intensity: 0.85 },
        { x: 60, y: 55, intensity: 0.85 },
        { x: 35, y: 60, intensity: 0.65 },
        { x: 65, y: 40, intensity: 0.65 },
        { x: 50, y: 30, intensity: 0.55 },
      ], null, 2) },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.4, step: 0.05 },
      { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -300, max: 300, step: 5 },
      ...mercatoAudioFields('analysisLab'),
      ...broadcastMotionPreset('VERTICAL_REVEAL', 'VERTICAL_REVEAL_OUT', 'TARGET_SCAN', 'BROADCAST_OUT'),
    ],
  },
];

// Deduplicate by id to prevent any accidental duplicates
// ─── Player Intel V2 Template ─────────────────────────────────────────────────

const PLAYER_INTEL_V2_TEMPLATES: OverlayConfig[] = [
  {
    id: 'template-player-intel-v2',
    name: 'استخبارات اللاعب — الإصدار الثاني',
    type: OverlayType.PLAYER_INTEL_V2,
    templateId: 'template-player-intel-v2',
    templateDescription: 'قالب بث احترافي يدمج البيانات المباشرة والموسمية في بطاقة تحليل لاعب متقدمة.',
    templateIcon: '🧠',
    templateAccent: '#22d3ee',
    templateGroup: 'PLAYER_INTEL',
    fields: [
      { id: 'mode', label: 'الوضع', type: 'select', value: 'single', options: [
        { label: 'لاعب واحد', value: 'single' },
        { label: 'مقارنة لاعبين', value: 'compare' },
      ]},
      { id: 'samplePlayer', label: 'اللاعب الأول', type: 'select', value: 'lamine-yamal', options: [
        { label: '— يُحمَّل من المكتبة —', value: 'lamine-yamal' },
      ]},
      { id: 'samplePlayerB', label: 'اللاعب الثاني', type: 'select', value: 'robert-lewandowski', options: [
        { label: '— يُحمَّل من المكتبة —', value: 'robert-lewandowski' },
      ]},
      { id: 'cardType', label: 'نوع البطاقة', type: 'select', value: 'attacker_card', options: [
        { label: 'بطاقة هجومية', value: 'attacker_card' },
        { label: 'صانع لعب', value: 'playmaker_card' },
        { label: 'جناح', value: 'winger_card' },
        { label: 'مدافع', value: 'defender_card' },
        { label: 'تقرير الفورمة', value: 'form_report' },
        { label: 'تقرير السوق', value: 'market_report' },
        { label: 'تقرير الموسم', value: 'season_report' },
        { label: 'تقرير كامل', value: 'complete_report' },
        { label: 'مخصّص (يدوي)', value: 'custom' },
      ]},
      { id: 'visualVariant', label: 'النمط البصري', type: 'select', value: 'premium_broadcast', options: [
        { label: 'Premium Broadcast Card', value: 'premium_broadcast' },
        { label: 'Tactical Data Board', value: 'tactical_board' },
        { label: 'Magazine Player Profile', value: 'magazine_profile' },
        { label: 'Compact TV Overlay', value: 'compact_tv' },
        { label: 'Head-to-Head Duel', value: 'h2h_duel' },
      ]},
      { id: 'visualTheme', label: 'نمط الألوان', type: 'select', value: 'broadcast_dark', options: [
        { label: 'Broadcast Dark', value: 'broadcast_dark' },
        { label: 'Barcelona Night', value: 'barcelona_night' },
        { label: 'Clean Studio', value: 'clean_studio' },
      ]},
      // Manual metric selection (JSON arrays of metric keys)
      { id: 'playerIntelHeroMetricsJson', label: '__hero', type: 'hidden', value: '[]' },
      { id: 'playerIntelSecondaryMetricsJson', label: '__secondary', type: 'hidden', value: '[]' },
      { id: 'playerIntelHiddenMetricsJson', label: '__hidden', type: 'hidden', value: '[]' },
      { id: 'showSources', label: 'إظهار المصادر', type: 'boolean', value: true },
      { id: 'showFooter', label: 'إظهار Footer', type: 'boolean', value: true },
      { id: 'masterJson', label: 'لصق Master JSON', type: 'textarea', value: '' },
      { id: 'masterJsonB', label: 'لصق Master JSON للاعب الثاني', type: 'textarea', value: '' },
    ],
    slots: {},
    theme: {
      primaryColor: '#22d3ee',
      secondaryColor: '#0f172a',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal, sans-serif',
    },
    isVisible: false,
  },
];

// ─── MERCATO-TEMPLATES-X6/X7 — unified mercato variants via factory ─────────
//
// All templates share:
//   - OverlayType.MERCATO_UNIFIED (one renderer branches on mercatoVariant)
//   - inherited broadcast controls (transitions + audio + voice via
//     withBroadcastControls)
//   - per-template default audioSceneId (matches utils/templateAudioScenes)
//
// The factory keeps the per-template fields list focused on data only.

interface MercatoTemplateInput {
  id: string;
  variant: string;            // mercatoVariant value
  name: string;
  templateIcon: string;
  templateAccent: string;
  description: string;
  audioSceneId: string;       // matches utils/templateAudioScenes id
  dataFields: OverlayField[]; // template-specific data fields
  /**
   * Phase X11/X12 — opt-in SFX-OFF default for templates whose subject
   * (real human conversations, private calls, intimate chat) is hurt by
   * synthesized SFX. The user can re-enable SFX from AudioSettingsPanel.
   * If undefined, withBroadcastControls injects the global default
   * (sfxEnabled: true).
   */
  sfxEnabledDefault?: boolean;
}

const createMercatoTemplate = (input: MercatoTemplateInput): OverlayConfig => ({
  id: input.id,
  templateId: input.id,
  name: input.name,
  type: OverlayType.MERCATO_UNIFIED,
  isVisible: false,
  templateIcon: input.templateIcon,
  templateAccent: input.templateAccent,
  templateGroup: 'MERCATO_PACKAGE',
  templateDescription: input.description,
  theme: { primaryColor: input.templateAccent, secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
  slots: {},
  fields: [
    { id: 'mercatoVariant', label: 'نوع القالب', type: 'hidden', value: input.variant },
    { id: 'audioSceneId', label: 'مشهد صوتي افتراضي', type: 'hidden', value: input.audioSceneId },
    // Phase X11/X12 — when sfxEnabledDefault is set, inject the field
    // BEFORE withBroadcastControls (which uses dedupeFields keep-first).
    // This wins over the default true and lets the call template ship
    // with SFX OFF. The user can re-enable from AudioSettingsPanel.
    ...(input.sfxEnabledDefault === false
      ? [{ id: 'sfxEnabled', label: 'تفعيل المؤثرات', type: 'boolean' as const, value: false }]
      : []),
    { id: 'visualTheme', label: 'نمط التصميم', type: 'select', value: 'TACTICAL_DARK', options: [
      { value: 'TACTICAL_DARK', label: '⚫ Tactical Dark' },
      { value: 'CLEAN_BROADCAST', label: '🔷 Clean Broadcast' },
      { value: 'LUXE_GOLD', label: '🟡 Luxe Gold' },
    ] },
    ...input.dataFields,
    { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.4, step: 0.05 },
    { id: 'positionY', label: 'إزاحة Y', type: 'range', value: 0, min: -300, max: 300, step: 5 },
    { id: 'positionX', label: 'إزاحة X', type: 'range', value: 0, min: -300, max: 300, step: 5 },
  ],
});

const mercatoTodayLabel = (): string => {
  try {
    return new Intl.DateTimeFormat('ar-IQ', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  } catch {
    return '29 مايو 2026';
  }
};

const globalProbabilityDealFields = (idx: number): OverlayField[] => [
  { id: `deal${idx}Player`, label: `صفقة ${idx} — اسم اللاعب`, type: 'text', value: `اسم اللاعب ${idx}` },
  { id: `deal${idx}From`, label: `صفقة ${idx} — النادي الحالي`, type: 'text', value: 'النادي الحالي' },
  { id: `deal${idx}To`, label: `صفقة ${idx} — النادي المهتم`, type: 'text', value: 'النادي المهتم' },
  { id: `deal${idx}OldPct`, label: `صفقة ${idx} — النسبة السابقة`, type: 'range', value: 0, min: 0, max: 100, step: 1 },
  { id: `deal${idx}NewPct`, label: `صفقة ${idx} — النسبة الجديدة`, type: 'range', value: 0, min: 0, max: 100, step: 1 },
  { id: `deal${idx}Image`, label: `صفقة ${idx} — صورة اللاعب`, type: 'image', value: '' },
  { id: `deal${idx}FromLogo`, label: `صفقة ${idx} — شعار النادي الحالي`, type: 'image', value: '' },
  { id: `deal${idx}ToLogo`, label: `صفقة ${idx} — شعار النادي المهتم`, type: 'image', value: '' },
  { id: `deal${idx}Fee`, label: `صفقة ${idx} — قيمة الصفقة`, type: 'text', value: 'غير محدد' },
  { id: `deal${idx}Status`, label: `صفقة ${idx} — حالة المفاوضات`, type: 'text', value: 'بانتظار البيانات' },
  { id: `deal${idx}Source`, label: `صفقة ${idx} — المصدر`, type: 'text', value: 'غير محدد' },
];

const MERCATO_X6_TEMPLATES: OverlayConfig[] = [
  // 1. Agent Call #2
  createMercatoTemplate({
    id: 'template-mercato-x6-agent-call',
    variant: 'agent_call',
    name: 'ميركاتو — مكالمة الوكيل المباشرة #2',
    templateIcon: '📞',
    templateAccent: '#22d3ee',
    description: 'مكالمة وكيل بواجهة بث احترافية: transcript حي + سياق صفقة + لوحة مصدر خاص. مشهد صوتي: مكالمة/دردشة خاصة بأصوات أصلية.',
    audioSceneId: 'mercato_private_chat_call',
    // Phase X11/X12 — call template ships with SFX OFF by default. Synth
    // call/chat tones felt amateurish in manual QA. The voice path stays
    // available for production-quality audio. User can re-enable from
    // AudioSettingsPanel → SFX section if they prefer the cues.
    sfxEnabledDefault: false,
    dataFields: [
      { id: 'callerName', label: 'اسم الوكيل', type: 'text', value: 'AGENT — JORGE MENDES' },
      { id: 'callerRole', label: 'الجهة', type: 'text', value: 'GESTIFUTE' },
      { id: 'callDuration', label: 'مدة المكالمة', type: 'text', value: '03:42' },
      { id: 'callStatus', label: 'حالة المكالمة', type: 'select', value: 'live', options: [
        { value: 'live', label: 'مباشرة' },
        { value: 'recorded', label: 'مسجّلة' },
        { value: 'private_source', label: 'مصدر خاص' },
      ] },
      { id: 'callStatusLiveLabel', label: 'تسمية حالة مباشر', type: 'text', value: 'مباشرة' },
      { id: 'callStatusRecordedLabel', label: 'تسمية حالة مسجلة', type: 'text', value: 'مسجلة' },
      { id: 'callStatusPrivateLabel', label: 'تسمية حالة مصدر خاص', type: 'text', value: 'مصدر خاص' },
      { id: 'callStageClosingLabel', label: 'تسمية مرحلة الإغلاق', type: 'text', value: 'إغلاق وشيك' },
      { id: 'callStageAdvancedLabel', label: 'تسمية مرحلة الحسم', type: 'text', value: 'حسم متقدم' },
      { id: 'callStageActiveLabel', label: 'تسمية مرحلة التفاوض', type: 'text', value: 'تفاوض نشط' },
      { id: 'callStageEarlyLabel', label: 'تسمية مرحلة الرصد', type: 'text', value: 'رصد أولي' },
      { id: 'callRoomEyebrow', label: 'نص غرفة الاتصال العلوي', type: 'text', value: 'MERCATO CALL ROOM' },
      { id: 'callRoomTitle', label: 'عنوان غرفة الاتصال', type: 'text', value: 'غرفة اتصال الصفقة' },
      { id: 'callReporterLabel', label: 'تسمية المراسل', type: 'text', value: 'المراسل' },
      { id: 'callReporterName', label: 'اسم مكتب المراسل', type: 'text', value: 'REO MERCATO DESK' },
      { id: 'callConfidenceLabel', label: 'تسمية نسبة الثقة', type: 'text', value: 'ثقة' },
      { id: 'callDealFileLabel', label: 'تسمية ملف الصفقة', type: 'text', value: 'ملف الصفقة' },
      { id: 'callFromLabel', label: 'تسمية من نادي', type: 'text', value: 'من' },
      { id: 'callToLabel', label: 'تسمية إلى نادي', type: 'text', value: 'إلى' },
      { id: 'callValueLabel', label: 'تسمية قيمة الصفقة', type: 'text', value: 'القيمة' },
      { id: 'callReporterMetricLabel', label: 'تسمية عدد رسائل المراسل', type: 'text', value: 'REPORTER' },
      { id: 'callAgentMetricLabel', label: 'تسمية عدد رسائل الوكيل', type: 'text', value: 'AGENT' },
      { id: 'callTranscriptLabel', label: 'تسمية قناة النص', type: 'text', value: 'قناة مشفرة · transcript' },
      { id: 'callMessageCountLabel', label: 'تسمية عدد الرسائل', type: 'text', value: 'رسالة' },
      { id: 'callEmptyLabel', label: 'رسالة انتظار المكالمة', type: 'text', value: 'في انتظار بدء المكالمة' },
      { id: 'callSourceLabel', label: 'تسمية لوحة المصدر', type: 'text', value: 'المصدر' },
      { id: 'callSourceClosedBadge', label: 'شارة المصدر المغلق', type: 'text', value: 'مغلق' },
      { id: 'callSourceFollowBadge', label: 'شارة متابعة المصدر', type: 'text', value: 'متابعة' },
      { id: 'callSourcePrivateTitle', label: 'عنوان المصدر الخاص', type: 'text', value: 'مصدر خاص مغلق' },
      { id: 'callSourceClosedTitle', label: 'عنوان المصدر المغلق', type: 'text', value: 'مصدر مغلق' },
      { id: 'callSourceInfo', label: 'وصف المصدر', type: 'text', value: 'المعلومة من داخل غرفة المفاوضات' },
      { id: 'callLastSignalLabel', label: 'تسمية آخر إشارة', type: 'text', value: 'آخر إشارة' },
      { id: 'callProgressLabel', label: 'تسمية تقدم الصفقة', type: 'text', value: 'تقدم الصفقة' },
      { id: 'callProgressStage1Label', label: 'مرحلة التقدم الأولى', type: 'text', value: 'اتفاق المبدأ' },
      { id: 'callProgressStage2Label', label: 'مرحلة التقدم الثانية', type: 'text', value: 'الفحص الطبي' },
      { id: 'callProgressStage3Label', label: 'مرحلة التقدم الثالثة', type: 'text', value: 'الإعلان الرسمي' },
      { id: 'callFooterLabel', label: 'تذييل لوحة الاتصال', type: 'text', value: 'REO MERCATO INTEL' },
      { id: 'dealHeadline', label: 'عنوان الصفقة', type: 'text', value: 'Negotiating €58M deal — final stage' },
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Nico Williams' },
      { id: 'playerImage', label: 'صورة اللاعب (اختياري)', type: 'image', value: '' },
      { id: 'clubFrom', label: 'من نادي', type: 'text', value: 'Athletic Club' },
      { id: 'clubTo', label: 'إلى نادي', type: 'text', value: 'Barcelona' },
      { id: 'dealValue', label: 'قيمة الصفقة', type: 'text', value: '€58M + bonuses' },
      { id: 'confidencePct', label: 'نسبة الثقة (%)', type: 'range', value: 85, min: 0, max: 100, step: 1 },
      { id: 'chatLines', label: 'محادثة JSON', type: 'textarea', value: JSON.stringify([
        { side: 'reporter', text: 'Jorge, can you confirm the deal is done?' },
        { side: 'agent',    text: 'We are very close. Medical scheduled.' },
        { side: 'reporter', text: 'And the fee? Reports say €58M.' },
        { side: 'agent',    text: 'Clubs agreed. Announcement very soon.' },
        { side: 'reporter', text: 'Here we go?' },
        { side: 'agent',    text: 'Here we go.' },
      ], null, 2) },
    ],
  }),
  // 2. Deal Radar
  createMercatoTemplate({
    id: 'template-mercato-x6-deal-radar',
    variant: 'deal_radar',
    name: 'ميركاتو — رادار صفقة',
    templateIcon: '📡',
    templateAccent: '#22d3ee',
    description: 'رادار احتمالية الصفقة + كومة المصادر بدرجات الموثوقية.',
    audioSceneId: 'analysis_lab',
    dataFields: [
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Player Name' },
      { id: 'probability', label: 'احتمالية الصفقة (%)', type: 'range', value: 65, min: 0, max: 100, step: 1 },
      { id: 'sources', label: 'المصادر JSON', type: 'textarea', value: JSON.stringify([
        { name: 'Fabrizio Romano', reliability: 95 },
        { name: 'David Ornstein', reliability: 90 },
        { name: 'Local outlet', reliability: 60 },
      ], null, 2) },
    ],
  }),
  // 3. Probability Shift Matrix
  createMercatoTemplate({
    id: 'template-mercato-x7-probability-shift-matrix',
    variant: 'probability_shift',
    name: 'ميركاتو — مصفوفة تحوّل نسب الصفقات',
    templateIcon: '٪',
    templateAccent: '#64ff6a',
    description: 'قالب عصري يعرض النسب القديمة ثم يتحول بزر واحد إلى نسب اليوم مع حركة ومؤثر تحديث صوتي.',
    audioSceneId: 'analysis_lab',
    dataFields: [
      { id: 'probabilityShiftMode', label: 'حالة عرض النسب', type: 'hidden', value: 'old' },
      { id: 'audioUpdateCue', label: 'مؤثر تحديث النسب', type: 'hidden', value: 'DATA_TICK' },
      { id: 'soundInStyle', label: 'مؤثر دخول النسب', type: 'hidden', value: 'DATA_RUSH' },
      { id: 'soundOutStyle', label: 'مؤثر خروج النسب', type: 'hidden', value: 'SOFT_FADE' },
      { id: 'voiceLibraryId', label: 'صوت النسب', type: 'hidden', value: 'mercato_deal_percentages_current' },
      { id: 'matrixLayout', label: 'شكل المصفوفة', type: 'select', value: 'luxury_wall', options: [
        { value: 'luxury_wall', label: 'جدار صفقات فاخر لكل لاعب' },
        { value: 'split_board', label: 'لوحة سينمائية مقسومة' },
        { value: 'trading_floor', label: 'غرفة سوق الصفقات' },
        { value: 'hologram_grid', label: 'هولوجرام الهدف الرئيسي' },
      ] },
      { id: 'matrixTitle', label: 'عنوان القالب', type: 'text', value: 'مصفوفة نسب الصفقات' },
      { id: 'matrixSubtitle', label: 'وصف قصير', type: 'text', value: 'النموذج القديم يتحول إلى تحديث اليوم' },
      { id: 'updateDate', label: 'تاريخ تحديث النسب', type: 'text', value: mercatoTodayLabel() },
      { id: 'featuredDealIndex', label: 'الصفقة الرئيسية', type: 'select', value: '1', options: [
        { value: '1', label: 'الصفقة 1' },
        { value: '2', label: 'الصفقة 2' },
        { value: '3', label: 'الصفقة 3' },
        { value: '4', label: 'الصفقة 4' },
      ] },
      { id: 'deal1Player', label: 'صفقة 1 — اللاعب', type: 'text', value: 'الهدف الأول' },
      { id: 'deal1From', label: 'صفقة 1 — من نادي', type: 'text', value: 'النادي الحالي' },
      { id: 'deal1To', label: 'صفقة 1 — إلى نادي', type: 'text', value: 'Barcelona' },
      { id: 'deal1OldPct', label: 'صفقة 1 — النسبة القديمة', type: 'range', value: 40, min: 0, max: 100, step: 1 },
      { id: 'deal1NewPct', label: 'صفقة 1 — نسبة اليوم', type: 'range', value: 78, min: 0, max: 100, step: 1 },
      { id: 'deal1Image', label: 'صفقة 1 — صورة اللاعب', type: 'image', value: '' },
      { id: 'deal2Player', label: 'صفقة 2 — اللاعب', type: 'text', value: 'الهدف الثاني' },
      { id: 'deal2From', label: 'صفقة 2 — من نادي', type: 'text', value: 'النادي الحالي' },
      { id: 'deal2To', label: 'صفقة 2 — إلى نادي', type: 'text', value: 'Barcelona' },
      { id: 'deal2OldPct', label: 'صفقة 2 — النسبة القديمة', type: 'range', value: 58, min: 0, max: 100, step: 1 },
      { id: 'deal2NewPct', label: 'صفقة 2 — نسبة اليوم', type: 'range', value: 85, min: 0, max: 100, step: 1 },
      { id: 'deal2Image', label: 'صفقة 2 — صورة اللاعب', type: 'image', value: '' },
      { id: 'deal3Player', label: 'صفقة 3 — اللاعب', type: 'text', value: 'الهدف الثالث' },
      { id: 'deal3From', label: 'صفقة 3 — من نادي', type: 'text', value: 'النادي الحالي' },
      { id: 'deal3To', label: 'صفقة 3 — إلى نادي', type: 'text', value: 'Barcelona' },
      { id: 'deal3OldPct', label: 'صفقة 3 — النسبة القديمة', type: 'range', value: 60, min: 0, max: 100, step: 1 },
      { id: 'deal3NewPct', label: 'صفقة 3 — نسبة اليوم', type: 'range', value: 64, min: 0, max: 100, step: 1 },
      { id: 'deal3Image', label: 'صفقة 3 — صورة اللاعب', type: 'image', value: '' },
      { id: 'deal4Player', label: 'صفقة 4 — اللاعب', type: 'text', value: 'الهدف الرابع' },
      { id: 'deal4From', label: 'صفقة 4 — من نادي', type: 'text', value: 'النادي الحالي' },
      { id: 'deal4To', label: 'صفقة 4 — إلى نادي', type: 'text', value: 'Barcelona' },
      { id: 'deal4OldPct', label: 'صفقة 4 — النسبة القديمة', type: 'range', value: 50, min: 0, max: 100, step: 1 },
      { id: 'deal4NewPct', label: 'صفقة 4 — نسبة اليوم', type: 'range', value: 42, min: 0, max: 100, step: 1 },
      { id: 'deal4Image', label: 'صفقة 4 — صورة اللاعب', type: 'image', value: '' },
    ],
  }),
  // Global deal probability network — all clubs, six deals, ten structures.
  createMercatoTemplate({
    id: 'template-mercato-x8-global-deal-probability-network',
    variant: 'global_probability_shift',
    name: 'ميركاتو — شبكة تحوّل نسب الصفقات العالمية',
    templateIcon: '٪',
    templateAccent: '#38f5c8',
    description: 'قالب عالمي ذكي لعرض تحوّل نسب ست صفقات بين أي أندية، بعشرة تصاميم مستقلة وحركة وصوت تحديث.',
    audioSceneId: 'analysis_lab',
    dataFields: [
      { id: 'probabilityShiftMode', label: 'حالة عرض النسب', type: 'hidden', value: 'old' },
      { id: 'audioUpdateCue', label: 'مؤثر تحديث النسب', type: 'hidden', value: 'TARGET_REVEAL_DARK' },
      { id: 'soundInStyle', label: 'مؤثر دخول القالب', type: 'hidden', value: 'TARGET_REVEAL' },
      { id: 'soundOutStyle', label: 'مؤثر خروج القالب', type: 'hidden', value: 'SOFT_FADE' },
      { id: 'matrixLayout', label: 'نوع تصميم شبكة الصفقات', type: 'select', value: 'global_exchange', options: [
        { value: 'global_exchange', label: 'بورصة الانتقالات العالمية' },
        { value: 'orbit_network', label: 'مدارات الأندية والصفقات' },
        { value: 'broadcast_wall', label: 'جدار غرفة الأخبار' },
        { value: 'route_race', label: 'سباق مسارات التفاوض' },
        { value: 'deal_ticker_lab', label: 'مختبر حركة السوق' },
        { value: 'intelligence_center', label: 'مركز الذكاء الانتقالي' },
        { value: 'player_focus_lab', label: 'مختبر اللاعب المحوري' },
        { value: 'market_pulse_board', label: 'لوحة نبض السوق' },
        { value: 'global_route_grid', label: 'رادار المسارات العالمية' },
        { value: 'executive_watch_room', label: 'غرفة مراقبة تنفيذية' },
      ] },
      { id: 'matrixEyebrow', label: 'النص العلوي', type: 'text', value: 'GLOBAL MERCATO INTELLIGENCE' },
      { id: 'matrixTitle', label: 'عنوان القالب', type: 'text', value: 'شبكة تحوّل نسب الصفقات العالمية' },
      { id: 'matrixSubtitle', label: 'وصف القالب', type: 'text', value: 'قراءة مباشرة لحركة الصفقات بين الأندية' },
      { id: 'updateDate', label: 'تاريخ تحديث النسب', type: 'text', value: mercatoTodayLabel() },
      { id: 'oldLabel', label: 'تسمية النسب السابقة', type: 'text', value: 'النسبة السابقة' },
      { id: 'newLabel', label: 'تسمية النسب الجديدة', type: 'text', value: 'النسبة الجديدة' },
      { id: 'movementLabel', label: 'تسمية الحركة', type: 'text', value: 'حركة السوق' },
      { id: 'featuredLabel', label: 'تسمية الصفقة الرئيسية', type: 'text', value: 'الصفقة الرئيسية' },
      { id: 'sourceLabel', label: 'تسمية المصدر', type: 'text', value: 'المصدر' },
      { id: 'fromClubLabel', label: 'تسمية النادي الحالي', type: 'text', value: 'النادي الحالي' },
      { id: 'toClubLabel', label: 'تسمية الوجهة المحتملة', type: 'text', value: 'الوجهة المحتملة' },
      { id: 'readyLabel', label: 'تسمية حالة ما قبل التحديث', type: 'text', value: 'جاهز للتحديث' },
      { id: 'previousAverageLabel', label: 'تسمية متوسط السوق السابق', type: 'text', value: 'متوسط السوق السابق' },
      { id: 'currentAverageLabel', label: 'تسمية متوسط السوق الحالي', type: 'text', value: 'متوسط السوق الحالي' },
      { id: 'risingFallingLabel', label: 'تسمية الصفقات الصاعدة والمتراجعة', type: 'text', value: 'صفقات صاعدة / متراجعة' },
      { id: 'showDealFee', label: 'إظهار قيمة الصفقة', type: 'boolean', value: true },
      { id: 'showDealStatus', label: 'إظهار حالة الصفقة', type: 'boolean', value: true },
      { id: 'showDealSource', label: 'إظهار مصدر الصفقة', type: 'boolean', value: true },
      { id: 'showClubLabels', label: 'إظهار تسميات الأندية', type: 'boolean', value: true },
      { id: 'showAverageSummary', label: 'إظهار متوسطات النسب الكلية', type: 'boolean', value: true },
      { id: 'showTransitionBanner', label: 'إظهار لحظة التحول الدرامية', type: 'boolean', value: true },
      { id: 'showProbabilityTrack', label: 'إظهار مسار النسبة', type: 'boolean', value: true },
      { id: 'showDealDelta', label: 'إظهار مقدار التغير', type: 'boolean', value: true },
      { id: 'probabilityHistoryJson', label: 'سجل تحوّل النسب', type: 'hidden', value: '[]' },
      { id: 'featuredDealIndex', label: 'الصفقة الرئيسية', type: 'select', value: '1', options: [1, 2, 3, 4, 5, 6].map(idx => ({
        value: String(idx),
        label: `الصفقة ${idx}`,
      })) },
      ...[1, 2, 3, 4, 5, 6].flatMap(globalProbabilityDealFields),
    ],
  }),
  // 3. Club Statement
  createMercatoTemplate({
    id: 'template-mercato-x6-club-statement',
    variant: 'club_statement',
    name: 'ميركاتو — بيان نادٍ رسمي',
    templateIcon: '📜',
    templateAccent: '#fbbf24',
    description: 'بيان نادٍ رسمي بتنسيق صحفي. مشهد صوتي: ختم رسمي.',
    audioSceneId: 'official_club_statement',
    dataFields: [
      { id: 'clubName', label: 'اسم النادي', type: 'text', value: 'FC BARCELONA' },
      { id: 'statementTitle', label: 'عنوان البيان', type: 'text', value: 'بيان رسمي' },
      { id: 'statementBody', label: 'نص البيان', type: 'textarea', value: 'يعلن النادي عن...' },
      { id: 'statementDate', label: 'تاريخ البيان', type: 'text', value: '22 May 2026' },
    ],
  }),
  // 4. Deadline Hour
  createMercatoTemplate({
    id: 'template-mercato-x6-deadline-hour',
    variant: 'deadline_hour',
    name: 'ميركاتو — ساعة الحسم',
    templateIcon: '⏱️',
    templateAccent: '#ef4444',
    description: 'عداد تنازلي + مرحلة الصفقة. مشهد صوتي: دراما آخر موعد.',
    audioSceneId: 'deadline_drama',
    dataFields: [
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Player' },
      { id: 'dealStatus', label: 'حالة الصفقة', type: 'text', value: 'مفاوضات نهائية' },
      { id: 'minutesLeft', label: 'دقائق متبقية', type: 'text', value: '12' },
      { id: 'secondsLeft', label: 'ثوان متبقية', type: 'text', value: '34' },
      { id: 'dealStage', label: 'المرحلة', type: 'select', value: 'agreement', options: [
        { value: 'rumor', label: 'شائعة' },
        { value: 'talks', label: 'محادثات' },
        { value: 'agreement', label: 'اتفاق' },
        { value: 'medical', label: 'طبي' },
        { value: 'announce', label: 'إعلان' },
      ] },
    ],
  }),
  // 5. Source Confidence
  createMercatoTemplate({
    id: 'template-mercato-x6-source-confidence',
    variant: 'source_confidence',
    name: 'ميركاتو — لوحة ثقة المصادر',
    templateIcon: '🎯',
    templateAccent: '#22c55e',
    description: 'تصنيف المصادر (A/B/C) مع الحالة الحالية. مشهد صوتي: مختبر التحليل.',
    audioSceneId: 'analysis_lab',
    dataFields: [
      { id: 'sources', label: 'مصادر JSON', type: 'textarea', value: JSON.stringify([
        { name: 'Fabrizio Romano', tier: 'A', status: 'تأكيد' },
        { name: 'David Ornstein', tier: 'A', status: 'تأكيد' },
        { name: 'L\'Equipe', tier: 'B', status: 'محتمل' },
        { name: 'Local source', tier: 'C', status: 'شائعة' },
      ], null, 2) },
    ],
  }),
  // 6. Clause Reveal
  createMercatoTemplate({
    id: 'template-mercato-x6-clause-reveal',
    variant: 'clause_reveal',
    name: 'ميركاتو — كشف بند مخفي',
    templateIcon: '📄',
    templateAccent: '#f59e0b',
    description: 'كشف بند خاص في عقد اللاعب. مشهد صوتي: اتفاق وشيك.',
    audioSceneId: 'transfer_agreement_close',
    dataFields: [
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Player' },
      { id: 'clauseTitle', label: 'عنوان البند', type: 'text', value: 'بند فسخ' },
      { id: 'clauseBody', label: 'نص البند', type: 'textarea', value: 'في حال انتقال اللاعب...' },
      { id: 'clauseValue', label: 'القيمة', type: 'text', value: '€100M' },
    ],
  }),
  // 7. Medical Tracker
  createMercatoTemplate({
    id: 'template-mercato-x6-medical-tracker',
    variant: 'medical_tracker',
    name: 'ميركاتو — متابعة الفحص الطبي',
    templateIcon: '🏥',
    templateAccent: '#22c55e',
    description: '4 مراحل: وصول، فحص طبي، توقيع، إعلان. مشهد صوتي: ناعم احترافي.',
    audioSceneId: 'premium_subtle',
    dataFields: [
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Player' },
      { id: 'medicalStage', label: 'المرحلة الحالية', type: 'select', value: 'medical', options: [
        { value: 'travel', label: 'وصول' },
        { value: 'medical', label: 'فحص طبي' },
        { value: 'signing', label: 'توقيع' },
        { value: 'announce', label: 'إعلان' },
      ] },
    ],
  }),
  // 8. Hijack Alert
  createMercatoTemplate({
    id: 'template-mercato-x6-hijack-alert',
    variant: 'hijack_alert',
    name: 'ميركاتو — إنذار خطف صفقة',
    templateIcon: '⚠️',
    templateAccent: '#ef4444',
    description: 'تنبيه نادٍ منافس يحاول خطف الصفقة. مشهد صوتي: خبر عاجل نظيف.',
    audioSceneId: 'breaking_news_clean',
    dataFields: [
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Player' },
      { id: 'originalClub', label: 'النادي الأصلي', type: 'text', value: 'Original Club' },
      { id: 'hijackClub', label: 'النادي الخاطف', type: 'text', value: 'Hijack Club' },
      { id: 'riskLevel', label: 'مستوى الخطر (%)', type: 'range', value: 70, min: 0, max: 100, step: 5 },
    ],
  }),
  // 9. Personal Terms
  createMercatoTemplate({
    id: 'template-mercato-x6-personal-terms',
    variant: 'personal_terms',
    name: 'ميركاتو — مكتب الشروط الشخصية',
    templateIcon: '💼',
    templateAccent: '#22d3ee',
    description: 'الشروط الشخصية: راتب، سنوات، عمولة، حالة. مشهد صوتي: دردشة همس.',
    audioSceneId: 'mercato_chat_whisper',
    dataFields: [
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Player' },
      { id: 'salary', label: 'الراتب السنوي', type: 'text', value: '€12M' },
      { id: 'contractYears', label: 'سنوات العقد', type: 'text', value: '5' },
      { id: 'agentFee', label: 'عمولة الوكيل', type: 'text', value: '€5M' },
      { id: 'termsStatus', label: 'الحالة', type: 'text', value: 'مفاوضات نهائية' },
    ],
  }),
  // 10. Here We Go Build-Up
  createMercatoTemplate({
    id: 'template-mercato-x6-here-we-go-buildup',
    variant: 'here_we_go_buildup',
    name: 'ميركاتو — تمهيد قبل الحسم',
    templateIcon: '📈',
    templateAccent: '#22d3ee',
    description: 'جدول زمني من شائعة إلى محادثات متقدمة. مشهد صوتي: اتفاق وشيك.',
    audioSceneId: 'transfer_agreement_close',
    dataFields: [
      { id: 'playerName', label: 'اسم اللاعب', type: 'text', value: 'Player' },
      { id: 'timelineEntries', label: 'الجدول الزمني JSON', type: 'textarea', value: JSON.stringify([
        { stage: 'شائعة أولى', date: '15 May', note: 'تقارير من Fabrizio Romano' },
        { stage: 'بداية محادثات', date: '18 May', note: 'تواصل بين الناديين' },
        { stage: 'اتفاق المبدأ', date: '21 May', note: 'الناديان يقتربان من تفاهم' },
        { stage: 'تفاصيل الشروط', date: '22 May', note: 'الفحص الطبي قريب' },
      ], null, 2) },
    ],
  }),
];

const MERCATO_MUSIC_TRACKS = [
  { value: '/audio/music-packs/mercato-2026/before-the-kickoff-2026.mp3', label: 'قبل ضربة البداية 2026' },
  { value: '/audio/music-packs/mercato-2026/deadline-drumline-a.mp3', label: 'طبول اليوم الأخير A' },
  { value: '/audio/music-packs/mercato-2026/deadline-drumline-b.mp3', label: 'طبول اليوم الأخير B' },
  { value: '/audio/music-packs/mercato-2026/drumline-tension.mp3', label: 'توتر الإيقاع' },
  { value: '/audio/music-packs/mercato-2026/mercato-blitz-a.mp3', label: 'هجوم الميركاتو A' },
  { value: '/audio/music-packs/mercato-2026/mercato-blitz-b.mp3', label: 'هجوم الميركاتو B' },
  { value: '/audio/music-packs/mercato-2026/panic-to-victory.mp3', label: 'من الفوضى إلى الحسم' },
  { value: '/audio/music-packs/mercato-2026/eleventh-hour.mp3', label: 'الساعة الحاسمة' },
  { value: '/audio/music-packs/mercato-2026/transfer-deadline-a.mp3', label: 'إغلاق السوق A' },
  { value: '/audio/music-packs/mercato-2026/transfer-deadline-b.mp3', label: 'إغلاق السوق B' },
];

const MERCATO_MEDIA_THEMES = [
  { value: 'studio_cyan', label: 'استوديو سماوي زجاجي' },
  { value: 'royal_gold', label: 'ذهبي ملكي فاخر' },
  { value: 'deadline_orange', label: 'برتقالي اليوم الأخير' },
  { value: 'medical_green', label: 'أخضر الفحص الطبي' },
  { value: 'source_red', label: 'أحمر مصادر عاجلة' },
  { value: 'violet_social', label: 'بنفسجي سوشيال' },
  { value: 'midnight_blue', label: 'أزرق منتصف الليل' },
];

interface MercatoMediaStoryTemplateInput {
  id: string;
  variant: string;
  name: string;
  icon: string;
  accent: string;
  description: string;
  headline: string;
  subline: string;
  source: string;
  playerName: string;
  fromClub: string;
  toClub: string;
  dealValue: string;
  dealStatus: string;
  confidencePct: number;
  timerLabel: string;
  musicTrackUrl: string;
  voiceLibraryId: string;
  mediaTheme: string;
  mediaUrl?: string;
  mediaMode?: string;
  mediaFit?: string;
  mediaMuted?: boolean;
  mediaOverlayOpacity?: number;
  mediaBlurPx?: number;
  mediaBrightness?: number;
  panelOpacity?: number;
  textScale?: number;
  musicVolume?: number;
  soundVolume?: number;
  scale?: number;
  positionX?: number;
  positionY?: number;
  storyItems: Array<{ label: string; value: string; note?: string }>;
}

const createMercatoMediaStoryTemplate = (input: MercatoMediaStoryTemplateInput): OverlayConfig => ({
  id: input.id,
  templateId: input.id,
  name: input.name,
  type: OverlayType.MERCATO_MEDIA_STORY,
  isVisible: false,
  templateIcon: input.icon,
  templateAccent: input.accent,
  templateGroup: 'MERCATO_MEDIA_2026',
  templateDescription: input.description,
  theme: { primaryColor: input.accent, secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
  slots: {},
  fields: [
    ...commonFields,
    { id: 'mercatoMediaVariant', label: 'نوع قالب الميركاتو', type: 'hidden', value: input.variant },
    { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: input.headline },
    { id: 'subline', label: 'السطر الداعم', type: 'textarea', value: input.subline },
    { id: 'sourceLabel', label: 'اسم المصدر', type: 'text', value: input.source },
    { id: 'playerName', label: 'اللاعب / الهدف', type: 'text', value: input.playerName },
    { id: 'fromClub', label: 'من النادي', type: 'text', value: input.fromClub },
    { id: 'toClub', label: 'إلى النادي', type: 'text', value: input.toClub },
    { id: 'dealValue', label: 'قيمة الصفقة', type: 'text', value: input.dealValue },
    { id: 'dealStatus', label: 'حالة الصفقة', type: 'text', value: input.dealStatus },
    { id: 'confidencePct', label: 'نسبة الحسم (%)', type: 'range', value: input.confidencePct, min: 0, max: 100, step: 1 },
    { id: 'timerLabel', label: 'الوقت / الوسم', type: 'text', value: input.timerLabel },
    { id: 'storyItems', label: 'نقاط القصة JSON', type: 'textarea', value: JSON.stringify(input.storyItems, null, 2) },
    { id: 'mediaUrl', label: 'الصورة/الفيديو الرئيسي', type: 'text', value: input.mediaUrl || '' },
    { id: 'mediaAltUrl', label: 'صورة/فيديو احتياطي', type: 'text', value: '' },
    { id: 'mediaMode', label: 'نوع الميديا', type: 'select', value: input.mediaMode || 'auto', options: [
      { value: 'auto', label: 'تلقائي' },
      { value: 'image', label: 'صورة فقط' },
      { value: 'video', label: 'فيديو فقط' },
    ] },
    { id: 'mediaFit', label: 'ملاءمة الميديا', type: 'select', value: input.mediaFit || 'cover', options: [
      { value: 'cover', label: 'ملء الشاشة' },
      { value: 'contain', label: 'إظهار كامل' },
    ] },
    { id: 'mediaMuted', label: 'كتم صوت الفيديو', type: 'boolean', value: input.mediaMuted ?? true },
    { id: 'mediaTheme', label: 'ثيم القالب', type: 'select', value: input.mediaTheme, options: MERCATO_MEDIA_THEMES },
    { id: 'mediaOverlayOpacity', label: 'قوة تعتيم الميديا', type: 'range', value: input.mediaOverlayOpacity ?? 0.62, min: 0.2, max: 0.92, step: 0.01 },
    { id: 'mediaBlurPx', label: 'نعومة الخلفية', type: 'range', value: input.mediaBlurPx ?? 0, min: 0, max: 14, step: 1 },
    { id: 'mediaBrightness', label: 'سطوع الميديا', type: 'range', value: input.mediaBrightness ?? 0.86, min: 0.45, max: 1.35, step: 0.01 },
    { id: 'panelOpacity', label: 'شفافية اللوحات', type: 'range', value: input.panelOpacity ?? 0.58, min: 0.25, max: 0.92, step: 0.01 },
    { id: 'textScale', label: 'حجم النص', type: 'range', value: input.textScale ?? 1.0, min: 0.82, max: 1.16, step: 0.01 },
    { id: 'musicEnabled', label: 'تشغيل الموسيقى الحقيقية', type: 'boolean', value: true },
    { id: 'musicTrackUrl', label: 'مقطع الموسيقى', type: 'select', value: input.musicTrackUrl, options: MERCATO_MUSIC_TRACKS },
    { id: 'musicVolume', label: 'مستوى الموسيقى', type: 'range', value: input.musicVolume ?? 0.16, min: 0, max: 0.45, step: 0.01 },
    { id: 'voiceEnabled', label: 'تشغيل النداء الصوتي الحقيقي', type: 'boolean', value: false },
    { id: 'voiceLibraryId', label: 'النداء الصوتي', type: 'select', value: input.voiceLibraryId, options: [
      { value: 'none', label: 'بدون نداء' },
      { value: 'mercato_things_happening_now', label: 'الأمور تحدث الآن' },
      { value: 'mercato_transfer_approaching', label: 'الانتقال يقترب' },
      { value: 'mercato_heating_now', label: 'الميركاتو يشتعل الآن' },
      { value: 'mercato_deal_percentages_current', label: 'النسب الحالية للصفقات' },
      { value: 'mercato_here_we_go', label: 'ها نحن ذا' },
      { value: 'mercato_agreement_close', label: 'الاتفاق قريب' },
    ] },
    { id: 'voiceTrigger', label: 'توقيت النداء الصوتي', type: 'select', value: 'manual_only', options: [
      { value: 'manual_only', label: 'يدوي فقط' },
      { value: 'on_enter', label: 'عند IN' },
      { value: 'on_update', label: 'عند UPDATE' },
    ] },
    { id: 'voiceVolume', label: 'مستوى النداء', type: 'range', value: 0.9, min: 0, max: 1.5, step: 0.05 },
    { id: 'sfxEnabled', label: 'تشغيل مؤثرات الدخول/الخروج', type: 'boolean', value: false },
    { id: 'soundVolume', label: 'مستوى المؤثرات', type: 'range', value: input.soundVolume ?? 0.7, min: 0, max: 3, step: 0.05 },
    { id: 'soundInStyle', label: 'مؤثر IN', type: 'select', value: 'LOWER_THIRD_WIPE', options: BROADCAST_SOUND_OPTIONS },
    { id: 'soundOutStyle', label: 'مؤثر OUT', type: 'select', value: 'SOFT_FADE', options: BROADCAST_SOUND_OPTIONS },
    { id: 'transitionIn', label: 'حركة الدخول IN', type: 'select', value: 'GLASS_SWEEP', options: BROADCAST_TRANSITION_OPTIONS },
    { id: 'transitionOut', label: 'حركة الخروج OUT', type: 'select', value: 'GLASS_SWEEP_OUT', options: BROADCAST_EXIT_OPTIONS },
    { id: 'audioSceneId', label: 'مشهد الصوت', type: 'hidden', value: 'premium_subtle' },
    { id: 'scale', label: 'حجم القالب', type: 'range', value: input.scale ?? 1.0, min: 0.5, max: 1.4, step: 0.05 },
    { id: 'positionY', label: 'تحريك عمودي Y', type: 'range', value: input.positionY ?? 0, min: -300, max: 300, step: 5 },
    { id: 'positionX', label: 'تحريك أفقي X', type: 'range', value: input.positionX ?? 0, min: -300, max: 300, step: 5 },
  ],
});

const MERCATO_MEDIA_STORY_TEMPLATES: OverlayConfig[] = [
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-glass-briefing',
    variant: 'glass_briefing',
    name: 'ميركاتو ميديا — مجلس الصفقة الملكي',
    icon: 'GLS',
    accent: '#22d3ee',
    description: 'مجلس قرار فاخر للصفقات الكبيرة: صورة أو فيديو بملء الشاشة، طبقات زجاجية، مسار صفقة، وموسيقى حقيقية منخفضة.',
    headline: 'مجلس الصفقة',
    subline: 'افتتاحية فاخرة لملف انتقال مهم: من يملك القرار، أين يتحرك المال، وما الإشارة التي تستحق البث.',
    source: 'مكتب الميركاتو',
    playerName: 'لاعب مستهدف',
    fromClub: 'النادي الحالي',
    toClub: 'النادي المهتم',
    dealValue: 'قيمة قيد التفاوض',
    dealStatus: 'محادثات متقدمة',
    confidencePct: 78,
    timerLabel: 'LIVE',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[4].value,
    voiceLibraryId: 'mercato_things_happening_now',
    mediaTheme: 'studio_cyan',
    mediaOverlayOpacity: 0.66,
    mediaBlurPx: 1,
    mediaBrightness: 0.82,
    panelOpacity: 0.64,
    textScale: 0.98,
    musicVolume: 0.15,
    storyItems: [
      { label: 'قرار المجلس', value: 'هل الصفقة تستحق فتح ملف رئيسي في الحلقة؟' },
      { label: 'ثقل الصفقة', value: 'قيمة إعلامية عالية إذا توفرت صورة أو فيديو قوي' },
      { label: 'مفتاح البث', value: 'استخدم خلفية لاعب أو لقطة خبرية لإعطاء القالب فخامته' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-neon-map',
    variant: 'neon_negotiation_map',
    name: 'ميركاتو ميديا — أطلس الظل للمفاوضات',
    icon: 'MAP',
    accent: '#21f6aa',
    description: 'أطلس مصادر متحرك للصفقات الغامضة: عقد اتصال، مسار أندية، ونقاط قرار تظهر مثل غرفة عمليات.',
    headline: 'أطلس الظل',
    subline: 'حوّل التسريبات المتفرقة إلى خريطة مفهومة: من بدأ الاتصال، أين تعطلت الصفقة، ومن يملك الضوء الأخير.',
    source: 'سلسلة المصادر',
    playerName: 'لاعب تحت المتابعة',
    fromClub: 'النادي الأول',
    toClub: 'النادي الثاني',
    dealValue: 'عرض + متغيرات',
    dealStatus: 'تحت المتابعة',
    confidencePct: 62,
    timerLabel: '48H',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[5].value,
    voiceLibraryId: 'mercato_deal_percentages_current',
    mediaTheme: 'midnight_blue',
    mediaOverlayOpacity: 0.7,
    mediaBlurPx: 2,
    mediaBrightness: 0.78,
    panelOpacity: 0.66,
    textScale: 0.95,
    musicVolume: 0.14,
    storyItems: [
      { label: 'عقدة المصدر', value: 'أول إشارة تحتاج تثبيت قبل رفع درجة الثقة' },
      { label: 'عقدة النادي', value: 'المفاوضات تنتقل من استفسار إلى شروط مالية', note: 'لا يوجد حسم نهائي' },
      { label: 'عقدة القرار', value: 'العرض الرسمي هو نقطة التحول الحقيقية' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-contract-scanner',
    variant: 'contract_scanner',
    name: 'ميركاتو ميديا — ختم العقد السري',
    icon: 'DOC',
    accent: '#fbbf24',
    description: 'مظهر وثائقي فاخر للبنود السرية، شروط الخروج، الرواتب، والقيود القانونية التي تغيّر مسار الصفقة.',
    headline: 'ختم العقد',
    subline: 'القالب المناسب عندما تصبح القصة ليست لاعبًا فقط، بل بندًا صغيرًا قادرًا على قلب السوق.',
    source: 'مكتب العقود',
    playerName: 'اسم اللاعب',
    fromClub: 'النادي المالك',
    toClub: 'النادي المهتم',
    dealValue: 'قيمة البند',
    dealStatus: 'البند قيد الفحص',
    confidencePct: 58,
    timerLabel: 'DOC',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[9].value,
    voiceLibraryId: 'mercato_transfer_approaching',
    mediaTheme: 'royal_gold',
    mediaOverlayOpacity: 0.54,
    mediaBlurPx: 0,
    mediaBrightness: 0.94,
    panelOpacity: 0.72,
    textScale: 1.0,
    musicVolume: 0.13,
    storyItems: [
      { label: 'الختم الأول', value: 'البند موجود كزاوية تحليلية وليس كحقيقة نهائية' },
      { label: 'الختم المالي', value: 'القيمة والراتب والمتغيرات تحتاج مصدرًا واضحًا' },
      { label: 'الختم الأحمر', value: 'أي رقم نهائي يجب أن يبقى محجوبًا قبل التأكيد' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-airport-tracker',
    variant: 'airport_tracker',
    name: 'ميركاتو ميديا — بيان الطائرة الخاصة',
    icon: 'AIR',
    accent: '#60a5fa',
    description: 'بيان سفر فاخر لأيام الوصول والفحص والتوقيع: يبدو كلوحة طائرة خاصة لا كجدول مطار عادي.',
    headline: 'المسار الخاص',
    subline: 'عندما يتحول الخبر من مفاوضات إلى حركة فعلية: سفر، وصول، فحص، ثم توقيع.',
    source: 'رصد السفر',
    playerName: 'لاعب قادم',
    fromClub: 'مدينة الانطلاق',
    toClub: 'وجهة الصفقة',
    dealValue: 'إعارة / شراء',
    dealStatus: 'في الطريق',
    confidencePct: 72,
    timerLabel: '18:40',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[0].value,
    voiceLibraryId: 'mercato_transfer_approaching',
    mediaTheme: 'deadline_orange',
    mediaOverlayOpacity: 0.68,
    mediaBlurPx: 1,
    mediaBrightness: 0.8,
    panelOpacity: 0.58,
    textScale: 0.95,
    musicVolume: 0.13,
    storyItems: [
      { label: 'إشارة السفر', value: 'أي معلومة عن الرحلة يجب أن تكون قابلة للتحقق' },
      { label: 'نافذة الوصول', value: 'الفحص أو التصوير يصبح محور القصة عند توفر صورة أو فيديو' },
      { label: 'لحظة الإعلان', value: 'لا تجعل الوصول يعني توقيعًا إلا إذا تأكد رسميًا' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-agent-voice-room',
    variant: 'agent_voice_room',
    name: 'ميركاتو ميديا — غرفة الاتصال المشفّر',
    icon: 'VOC',
    accent: '#ef4444',
    description: 'غرفة اتصال مشفّر لمصادر الوكلاء: موجة صوت، ميديا خلفية، ونداء حقيقي عند الحاجة فقط.',
    headline: 'اتصال مشفّر',
    subline: 'قالب يصلح للخبر الذي يبدأ من مكالمة أو رسالة صوتية، مع إحساس غامض وفخم لا يشبه واجهات الدردشة العادية.',
    source: 'مصدر خاص',
    playerName: 'اسم اللاعب',
    fromClub: 'النادي الحالي',
    toClub: 'النادي المتابع',
    dealValue: 'شروط مالية',
    dealStatus: 'المصدر متصل',
    confidencePct: 51,
    timerLabel: 'REC',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[3].value,
    voiceLibraryId: 'mercato_things_happening_now',
    mediaTheme: 'source_red',
    mediaOverlayOpacity: 0.74,
    mediaBlurPx: 3,
    mediaBrightness: 0.72,
    panelOpacity: 0.66,
    textScale: 0.96,
    musicVolume: 0.12,
    storyItems: [
      { label: 'نبرة المصدر', value: 'المعلومة الصوتية تحتاج صياغة دقيقة لا تصعيدًا فارغًا' },
      { label: 'العائق الخفي', value: 'الراتب أو العمولة أو مدة العقد قد تكون مركز القصة' },
      { label: 'مستوى الثقة', value: 'لا يوجد عرض رسمي إلا إذا أدخلته أنت بوضوح' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-deal-heist-board',
    variant: 'deal_heist_board',
    name: 'ميركاتو ميديا — عملية خطف الصفقة',
    icon: 'HST',
    accent: '#f43f5e',
    description: 'عملية تحقيق بصرية لسباق الأندية: خيوط منافسين، وكيل يتحرك، وعرض قد يغير اتجاه الملف.',
    headline: 'عملية خطف',
    subline: 'قالب للتوتر الحقيقي: نادٍ يدخل متأخرًا، عرض أعلى، أو وكيل يفتح بابًا جديدًا.',
    source: 'رصد المنافسين',
    playerName: 'هدف الصفقة',
    fromClub: 'النادي المالك',
    toClub: 'النادي المنافس',
    dealValue: 'عرض محتمل',
    dealStatus: 'منافسة مفتوحة',
    confidencePct: 66,
    timerLabel: 'ALERT',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[6].value,
    voiceLibraryId: 'mercato_heating_now',
    mediaTheme: 'source_red',
    mediaOverlayOpacity: 0.76,
    mediaBlurPx: 2,
    mediaBrightness: 0.74,
    panelOpacity: 0.68,
    textScale: 0.95,
    musicVolume: 0.16,
    storyItems: [
      { label: 'خيط المنافس', value: 'ناد آخر يستفسر عن الشروط ولا يعني ذلك عرضًا رسميًا' },
      { label: 'خيط الوكيل', value: 'طرف اللاعب يستمع ويقارن بين المسارات' },
      { label: 'خيط القرار', value: 'الاتجاه لا يتغير إلا عند ظهور عرض موثق' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-social-storm',
    variant: 'social_storm',
    name: 'ميركاتو ميديا — بورصة نبض الجماهير',
    icon: 'SOC',
    accent: '#ec4899',
    description: 'بورصة اجتماعية فاخرة تقرأ الضجيج ولا تكرره: منشور، لقطة شاشة، ترند، ورد فعل جماهيري مصمم للبث.',
    headline: 'نبض الجماهير',
    subline: 'استخدمه عندما تصبح الصورة أو الفيديو محور الحديث: ترند، تلميح لاعب، أو موجة جماهيرية تحتاج قراءة هادئة.',
    source: 'إشارات الجمهور',
    playerName: 'اسم اللاعب',
    fromClub: 'النادي',
    toClub: 'نفس النادي / وجهة جديدة',
    dealValue: 'تجديد / انتقال',
    dealStatus: 'يتصدر الحديث',
    confidencePct: 91,
    timerLabel: '#1',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[4].value,
    voiceLibraryId: 'mercato_deal_percentages_current',
    mediaTheme: 'violet_social',
    mediaOverlayOpacity: 0.52,
    mediaBlurPx: 0,
    mediaBrightness: 0.96,
    panelOpacity: 0.56,
    textScale: 0.92,
    musicVolume: 0.15,
    storyItems: [
      { label: 'مؤشر الضجيج', value: 'التفاعل العالي لا يعني خبرًا مؤكدًا' },
      { label: 'مؤشر المزاج', value: 'المحتوى البصري يرفع أو يخفض حرارة القصة' },
      { label: 'مؤشر الرسمي', value: 'لا يعتبر تأكيدًا إلا ببيان واضح من النادي أو المصدر' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-medical-greenlight',
    variant: 'medical_greenlight',
    name: 'ميركاتو ميديا — مختبر الضوء الأخضر',
    icon: 'MED',
    accent: '#22c55e',
    description: 'مختبر بصري أنيق للفحص الطبي والجاهزية النهائية، مناسب للصور والفيديوهات القصيرة من يوم التوقيع.',
    headline: 'مختبر الجاهزية',
    subline: 'قالب نظيف وفاخر عندما تصل الصفقة إلى آخر حاجز: الفحص، الصورة، ثم التوقيع.',
    source: 'مكتب الفحص',
    playerName: 'اسم اللاعب',
    fromClub: 'النادي السابق',
    toClub: 'النادي الجديد',
    dealValue: 'قيمة متوقعة',
    dealStatus: 'بانتظار التأكيد',
    confidencePct: 88,
    timerLabel: 'PASS',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[2].value,
    voiceLibraryId: 'mercato_transfer_approaching',
    mediaTheme: 'medical_green',
    mediaOverlayOpacity: 0.58,
    mediaBlurPx: 1,
    mediaBrightness: 0.9,
    panelOpacity: 0.62,
    textScale: 0.96,
    musicVolume: 0.11,
    storyItems: [
      { label: 'بوابة الوصول', value: 'الوصول أو الموعد الطبي يحتاج مصدرًا واضحًا' },
      { label: 'بوابة الفحص', value: 'نتيجة الفحص لا تكتب إلا بعد التأكيد' },
      { label: 'بوابة التوقيع', value: 'الصورة النهائية لا تعني إعلانًا قبل البيان' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-club-vault',
    variant: 'club_vault',
    name: 'ميركاتو ميديا — خزنة التمويل الذهبية',
    icon: 'VLT',
    accent: '#c8aa63',
    description: 'خزنة مالية فاخرة لشرح التقييم، سقف الرواتب، المتغيرات، وشكل الدفع دون تحويلها إلى جدول ممل.',
    headline: 'خزنة التمويل',
    subline: 'عندما تكون الصفقة ليست خبرًا فقط بل معادلة ميزانية: قيمة، متغيرات، ورواتب.',
    source: 'الغرفة المالية',
    playerName: 'اسم اللاعب',
    fromClub: 'النادي البائع',
    toClub: 'النادي المشتري',
    dealValue: 'تقييم قابل للتعديل',
    dealStatus: 'فحص الميزانية',
    confidencePct: 43,
    timerLabel: 'CAP',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[8].value,
    voiceLibraryId: 'mercato_deal_percentages_current',
    mediaTheme: 'royal_gold',
    mediaOverlayOpacity: 0.64,
    mediaBlurPx: 1,
    mediaBrightness: 0.8,
    panelOpacity: 0.7,
    textScale: 0.95,
    musicVolume: 0.13,
    storyItems: [
      { label: 'باب الميزانية', value: 'الصفقات الخارجة قد تفتح مساحة العرض النهائي' },
      { label: 'باب المتغيرات', value: 'الحوافز والإضافات قد تبدو صغيرة لكنها تغير الصفقة' },
      { label: 'باب السقف', value: 'لا تضع رقمًا نهائيًا دون مصدر مالي واضح' },
    ],
  }),
  createMercatoMediaStoryTemplate({
    id: 'template-mercato-media-deadline-war-room',
    variant: 'deadline_war_room',
    name: 'ميركاتو ميديا — مركز قيادة اليوم الأخير',
    icon: 'WAR',
    accent: '#fb923c',
    description: 'مركز قيادة فاخر لآخر ساعات السوق: ساعة إغلاق، اتصالات متزامنة، ومؤشرات قرار مباشرة.',
    headline: 'مركز القيادة',
    subline: 'قالب للضغط الحقيقي في اليوم الأخير: كل دقيقة لها معنى، وكل اتصال قد يغير القصة.',
    source: 'مكتب الإغلاق',
    playerName: 'اسم اللاعب',
    fromClub: 'النادي الحالي',
    toClub: 'الوجهة المحتملة',
    dealValue: 'عرض نهائي محتمل',
    dealStatus: 'الوقت يضغط',
    confidencePct: 39,
    timerLabel: '00:42',
    musicTrackUrl: MERCATO_MUSIC_TRACKS[1].value,
    voiceLibraryId: 'mercato_heating_now',
    mediaTheme: 'deadline_orange',
    mediaOverlayOpacity: 0.78,
    mediaBlurPx: 2,
    mediaBrightness: 0.72,
    panelOpacity: 0.66,
    textScale: 0.94,
    musicVolume: 0.17,
    storyItems: [
      { label: 'خط الوكيل', value: 'الوكيل ينتظر إشارة النادي النهائية' },
      { label: 'خط اللاعب', value: 'طرف اللاعب لم يحسم كل التفاصيل بعد' },
      { label: 'خط الأوراق', value: 'الوثائق يجب أن تتحرك قبل الإغلاق' },
    ],
  }),
];

const STATEMENT_THEME_OPTIONS = [
  { value: 'STATEMENT_CYAN', label: 'تصريحات — سيان تحليلي' },
  { value: 'STATEMENT_GOLD', label: 'تصريحات — ذهبي رسمي' },
  { value: 'STATEMENT_CRIMSON', label: 'تصريحات — أحمر جدلي' },
  { value: 'STATEMENT_GREEN', label: 'تصريحات — أخضر مصدري' },
  { value: 'STATEMENT_MAGENTA', label: 'تصريحات — ماجنتا ذكي' },
];

const STATEMENT_LAYOUT_OPTIONS = [
  { value: 'press_grid', label: 'شبكة مؤتمر صحفي' },
  { value: 'solo_authority', label: 'طرف واحد / تصريح رئيسي' },
  { value: 'debate_split', label: 'مواجهة أطراف' },
  { value: 'source_timeline', label: 'خط زمني للمصادر' },
  { value: 'intel_wall', label: 'جدار رصد ذكي' },
];

const DEFAULT_STATEMENT_ITEMS = [
  {
    speaker: 'خوان لابورتا',
    role: 'رئيس برشلونة',
    party: 'إدارة النادي',
    quote: 'الأولوية الآن هي حماية المشروع الرياضي واتخاذ قرارات واضحة في التوقيت المناسب.',
    stance: 'رسمي',
    tone: 'حاسم',
    source: 'مؤتمر صحفي',
    time: 'اليوم',
    confidence: 92,
    photo: '',
    logo: '',
  },
  {
    speaker: 'مصدر مقرب',
    role: 'مصدر داخل النادي',
    party: 'غرفة المتابعة',
    quote: 'هناك أكثر من مسار مفتوح، لكن القرار النهائي مرتبط بالتفاصيل المالية والرياضية معا.',
    stance: 'مصدر',
    tone: 'حذر',
    source: 'صندوق الذكاء',
    time: 'قبل قليل',
    confidence: 76,
    photo: '',
    logo: '',
  },
  {
    speaker: 'ممثل اللاعب',
    role: 'وكيل / محيط اللاعب',
    party: 'طرف خارجي',
    quote: 'المحادثات مستمرة، وكل الأطراف تريد إنهاء الملف بدون ضجيج إعلامي زائد.',
    stance: 'رد فعل',
    tone: 'هادئ',
    source: 'تصريح منسوب',
    time: 'متابعة مباشرة',
    confidence: 68,
    photo: '',
    logo: '',
  },
];

type StatementTemplateInput = {
  id: string;
  name: string;
  icon: string;
  accent: string;
  description: string;
  layout: string;
  themePreset: string;
  headline: string;
  subtitle: string;
  cardCount: number;
  focusMode?: string;
  density?: string;
};

const createStatementTemplate = (input: StatementTemplateInput): OverlayConfig => {
  const statementsJson = JSON.stringify(DEFAULT_STATEMENT_ITEMS, null, 2);
  const pagesData = JSON.stringify(DEFAULT_STATEMENT_ITEMS.map(item => item.quote));

  return {
    id: input.id,
    templateId: input.id,
    name: input.name,
    type: OverlayType.STATEMENT_CARDS,
    isVisible: false,
    templateIcon: input.icon,
    templateAccent: input.accent,
    templateGroup: 'STATEMENT_INTELLIGENCE',
    templateDescription: input.description,
    theme: {
      primaryColor: input.accent,
      secondaryColor: '#061016',
      backgroundColor: 'transparent',
      fontFamily: 'Tajawal',
    },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'headline', label: 'عنوان لوحة التصريحات', type: 'text', value: input.headline },
      { id: 'subtitle', label: 'السطر الداعم', type: 'text', value: input.subtitle },
      { id: 'rawText', label: 'النص الخام لصندوق الذكاء', type: 'textarea', value: 'الصق هنا تصريحا واحدا أو عدة تصريحات، وسيحوّلها صندوق الذكاء إلى بطاقات منظمة.' },
      { id: 'aiInstruction', label: 'تعليمات AI الخاصة بالتصريحات', type: 'textarea', value: 'استخرج المتحدث، الجهة، نص التصريح، درجة الحسم، المصدر، الوقت، ونبرة التصريح. لا تضف معلومة غير موجودة في النص.' },
      { id: 'aiPageCount', label: 'عدد بطاقات التصريحات المستهدف (AI)', type: 'range', value: input.cardCount, min: 1, max: 15, step: 1 },
      { id: 'statementCardCount', label: 'عدد البطاقات المعروضة', type: 'range', value: input.cardCount, min: 1, max: 15, step: 1 },
      { id: 'statementsJson', label: 'JSON التصريحات', type: 'textarea', value: statementsJson },
      { id: 'pagesData', label: 'بيانات التنقل (JSON)', type: 'hidden', value: pagesData },
      { id: 'currentPage', label: 'التصريح النشط', type: 'number', value: 0 },
      { id: 'statementLayout', label: 'تخطيط التصريحات', type: 'select', value: input.layout, options: STATEMENT_LAYOUT_OPTIONS },
      { id: 'focusMode', label: 'طريقة عرض البطاقات', type: 'select', value: input.focusMode || 'ALL', options: [
        { value: 'ALL', label: 'كل البطاقات' },
        { value: 'CURRENT', label: 'التصريح النشط فقط' },
        { value: 'WINDOW', label: 'نافذة حول التصريح النشط' },
      ] },
      { id: 'speakerMode', label: 'نوع الأطراف', type: 'select', value: 'AUTO', options: [
        { value: 'AUTO', label: 'ذكي حسب النص' },
        { value: 'SINGLE', label: 'طرف واحد' },
        { value: 'MULTI', label: 'عدة أطراف' },
        { value: 'OFFICIAL_PLUS_REACTIONS', label: 'رسمي + ردود فعل' },
      ] },
      { id: 'statementDensity', label: 'كثافة التصميم', type: 'select', value: input.density || 'auto', options: [
        { value: 'auto', label: 'تلقائي' },
        { value: 'comfortable', label: 'مريح' },
        { value: 'compact', label: 'كثيف' },
        { value: 'broadcast', label: 'بث كبير' },
      ] },
      { id: 'themePreset', label: 'ثيم التصريحات', type: 'select', value: input.themePreset, options: STATEMENT_THEME_OPTIONS },
      { id: 'transitionEffect', label: 'حركة تبديل التصريح', type: 'select', value: 'TACTICAL_REVEAL', options: ['CINEMATIC', 'NEWS_SLIDE', 'ZOOM_IMPACT', 'GLITCH', 'TACTICAL_REVEAL', 'SCORE_FLASH'] },
      { id: 'motionMode', label: 'حركة الخلفية', type: 'select', value: 'quote_pop', options: [
        { value: 'quote_pop', label: 'نبض تصريح' },
        { value: 'scan', label: 'مسح إخباري' },
        { value: 'calm', label: 'هادئ' },
        { value: 'none', label: 'بدون حركة' },
      ] },
      { id: 'statementAccentColor', label: 'لون تمييز التصريحات', type: 'color', value: input.accent },
      { id: 'statementPanelColor', label: 'لون خلفية البطاقات', type: 'color', value: '#08131c' },
      { id: 'images', label: 'صور خلفية أو متحدثين عامة', type: 'image-list', value: [] },
      { id: 'sourceLabel', label: 'المصدر الافتراضي', type: 'text', value: 'صندوق الذكاء' },
      { id: 'sourceTimelineLabel', label: 'عنوان لوحة المصادر', type: 'text', value: 'شبكة المصادر' },
      { id: 'eventLabel', label: 'وسم أعلى اللوحة', type: 'text', value: 'statement intelligence' },
      { id: 'footerNote', label: 'ملاحظة أسفل اللوحة', type: 'text', value: 'تصريحات متعددة الأطراف' },
      { id: 'statementAuthor', label: 'المتحدث الافتراضي', type: 'text', value: 'مصدر التصريح' },
      { id: 'showSpeakerImage', label: 'إظهار صورة المتحدث', type: 'boolean', value: true },
      { id: 'showSource', label: 'إظهار المصدر', type: 'boolean', value: true },
      { id: 'showTime', label: 'إظهار الوقت', type: 'boolean', value: true },
      { id: 'showIndex', label: 'إظهار رقم البطاقة', type: 'boolean', value: true },
      { id: 'showTone', label: 'إظهار نبرة التصريح', type: 'boolean', value: true },
      { id: 'showConfidence', label: 'إظهار مؤشر الثقة', type: 'boolean', value: true },
      { id: 'showAiLabel', label: 'إظهار عداد AI', type: 'boolean', value: true },
      { id: 'containerWidth', label: 'عرض القالب (%)', type: 'range', value: 90, min: 40, max: 100, step: 5 },
      { id: 'containerHeight', label: 'ارتفاع القالب (px)', type: 'range', value: 650, min: 300, max: 980, step: 10 },
      { id: 'fontScale', label: 'تكبير النص', type: 'range', value: 1, min: 0.7, max: 1.5, step: 0.05 },
      { id: 'cardGap', label: 'المسافة بين البطاقات', type: 'range', value: 14, min: 6, max: 34, step: 1 },
      { id: 'panelOpacity', label: 'شفافية البطاقات', type: 'range', value: 0.86, min: 0.35, max: 1, step: 0.05 },
      { id: 'bgOpacity', label: 'كثافة الخلفية', type: 'range', value: 0.92, min: 0.2, max: 1, step: 0.05 },
      { id: 'scale', label: 'حجم القالب', type: 'range', value: 1.0, min: 0.5, max: 1.8, step: 0.05 },
      { id: 'positionY', label: 'إزاحة عمودية (Y)', type: 'range', value: 0, min: -700, max: 700, step: 10 },
      { id: 'positionX', label: 'إزاحة أفقية (X)', type: 'range', value: 0, min: -1200, max: 1200, step: 10 },
      ...broadcastMotionPreset('GLASS_SWEEP', 'GLASS_SWEEP_OUT', 'LOWER_THIRD_WIPE', 'SOFT_FADE'),
    ],
  };
};

const STATEMENT_TEMPLATES: OverlayConfig[] = [
  createStatementTemplate({
    id: 'template-statements-press-grid',
    name: 'تصريحات — شبكة المؤتمر الذكي',
    icon: 'STMT',
    accent: '#38bdf8',
    description: 'قالب تصريحات عام يقسم تصريحات طرف واحد أو عدة أطراف إلى بطاقات ذكية من 1 إلى 15 بطاقة مع تحكم كامل بالمصدر والنبرة والثقة.',
    layout: 'press_grid',
    themePreset: 'STATEMENT_CYAN',
    headline: 'غرفة التصريحات',
    subtitle: 'بطاقات ذكية منسقة من النص الخام أو صندوق الذكاء',
    cardCount: 6,
  }),
  createStatementTemplate({
    id: 'template-statements-solo-authority',
    name: 'تصريح — بطاقة طرف واحد فاخرة',
    icon: 'SOLO',
    accent: '#facc15',
    description: 'قالب مخصص لتصريح واحد قوي: اقتباس كبير، بطاقة هوية للمتحدث، مصدر، مؤشر ثقة، وتحكم سريع في التركيز.',
    layout: 'solo_authority',
    themePreset: 'STATEMENT_GOLD',
    headline: 'تصريح رسمي',
    subtitle: 'طرف واحد / رسالة مركزية',
    cardCount: 1,
    focusMode: 'CURRENT',
    density: 'broadcast',
  }),
  createStatementTemplate({
    id: 'template-statements-debate-split',
    name: 'تصريحات — مواجهة أطراف',
    icon: 'DUEL',
    accent: '#fb7185',
    description: 'قالب يقارن تصريحات عدة أطراف في واجهة مواجهة عصرية مناسبة للجدل وردود الفعل.',
    layout: 'debate_split',
    themePreset: 'STATEMENT_CRIMSON',
    headline: 'تصريحات الأطراف',
    subtitle: 'موقف مقابل موقف — قراءة سريعة للنبرة والمصدر',
    cardCount: 4,
    density: 'comfortable',
  }),
  createStatementTemplate({
    id: 'template-statements-source-timeline',
    name: 'تصريحات — خط زمني للمصادر',
    icon: 'TIME',
    accent: '#4ade80',
    description: 'قالب يرصد تسلسل التصريحات زمنيا مع مصدر ووقت لكل بطاقة، مناسب لمتابعة تطور القصة.',
    layout: 'source_timeline',
    themePreset: 'STATEMENT_GREEN',
    headline: 'تسلسل التصريحات',
    subtitle: 'من قال ماذا؟ ومتى؟ وبأي درجة ثقة؟',
    cardCount: 8,
    focusMode: 'WINDOW',
    density: 'compact',
  }),
  createStatementTemplate({
    id: 'template-statements-intel-wall',
    name: 'تصريحات — جدار الرصد الذكي',
    icon: 'WALL',
    accent: '#d8b4fe',
    description: 'جدار تصريحات كثيف يعرض حتى 15 بطاقة في لقطة واحدة، مناسب لنشرة مصادر أو ملخص ردود فعل واسع.',
    layout: 'intel_wall',
    themePreset: 'STATEMENT_MAGENTA',
    headline: 'رصد التصريحات',
    subtitle: 'لوحة استخبارات تحريرية لكل الأطراف والمصادر',
    cardCount: 15,
    density: 'compact',
  }),
];

const _allTemplates: OverlayConfig[] = [
  ...INITIAL_TEMPLATE_DEFINITIONS,
  ...BARCELONA_ELECTION_TEMPLATES,
  ...STATEMENT_TEMPLATES,
  ...FOOTBALL_BROADCAST_TEMPLATES,
  ...FOOTBALL_PROJECTION_TEMPLATES,
  ...TRANSFER_TARGETS_TEMPLATES,
  ...BREAKING_HERE_WE_GO_TEMPLATES,
  ...MERCATO_INNOVATIVE_TEMPLATES,
  ...MERCATO_X6_TEMPLATES,
  ...MERCATO_MEDIA_STORY_TEMPLATES,
  ...PLAYER_INTEL_V2_TEMPLATES,
  ...MONDIAL_2026_TEMPLATES,
];
const _seenIds = new Set<string>();
export const INITIAL_TEMPLATES: OverlayConfig[] = _allTemplates
  .filter(t => {
    if (_seenIds.has(t.id)) return false;
    _seenIds.add(t.id);
    return true;
  })
  .map(withBroadcastControls);
