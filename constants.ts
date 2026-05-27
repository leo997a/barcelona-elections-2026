
import { OverlayType, OverlayConfig, OverlayField } from './types';
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
        { value: 'mercato_here_we_go', label: 'Here we go' },
        { value: 'mercato_agreement_close', label: 'Agreement close' },
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
  if (id === 'transitionIn' || id === 'transitionOut') return 'transitions';
  if (
    id === 'soundEnabled' || id === 'soundVolume' ||
    id === 'soundInStyle' || id === 'soundOutStyle' ||
    id === 'sfxEnabled' || id === 'voiceEnabled' ||
    id === 'voiceLibraryId' || id === 'voiceDirectUrl' ||
    id === 'voiceTrigger' || id === 'voiceVolume' ||
    id === 'duckSfx' || id === 'audioSceneId'
  ) return 'audio';
  if (id === 'scale' || id === 'positionX' || id === 'positionY' || id === 'themePreset') return 'display';
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
  fields: dedupeFields([...template.fields, ...createBroadcastControlFields(template.fields)]),
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
    { id: 'lastUpdated', label: 'آخر تحديث', type: 'text', value: 'Last update 20:45' },
    { id: 'designStyle', label: 'Style', type: 'hidden', value: designStyle },
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
    { id: 'undecidedLabel', label: 'اسم غير المحسوم', type: 'text', value: 'Other / Undecided' },
    { id: 'undecidedPercent', label: 'نسبة غير المحسوم (%)', type: 'range', value: 9, min: 0, max: 100, step: 0.1 },
    { id: 'undecidedColor', label: 'لون غير المحسوم', type: 'color', value: '#94a3b8' },
    { id: 'targetDate', label: 'تاريخ النهاية (YYYY-MM-DD HH:mm)', type: 'text', value: '2026-06-30 20:00' },
    { id: 'countdownTitle', label: 'عنوان العداد', type: 'text', value: 'Closing Countdown' },
    { id: 'countdownDays', label: 'نص الأيام', type: 'text', value: 'Days' },
    { id: 'countdownHours', label: 'نص الساعات', type: 'text', value: 'Hours' },
    { id: 'countdownMinutes', label: 'نص الدقائق', type: 'text', value: 'Minutes' },
    { id: 'countdownSeconds', label: 'نص الثواني', type: 'text', value: 'Seconds' },
    { id: 'specialText', label: 'نص المحتوى', type: 'textarea', value: specialText },
    { id: 'statementAuthor', label: 'صاحب الاقتباس', type: 'text', value: statementAuthor },
    ...createElectionStatementFields('CANDIDATE_1'),
    { id: 'leaksTitle', label: 'عنوان التدفق العاجل', type: 'text', value: 'Breaking' },
    { id: 'leaksSubtitle', label: 'عنوان فرعي', type: 'text', value: 'Election desk' },
    { id: 'leaksContent', label: 'نص الخبر العاجل', type: 'textarea', value: specialText },
    { id: 'statementTitle', label: 'عنوان الاقتباس', type: 'text', value: 'Key Statement' },
    { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
    { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.05 },
    { id: 'soundInStyle', label: 'مؤثر TAKE IN', type: 'select', value: soundInStyle, options: ELECTION_SOUND_OPTIONS },
    { id: 'soundOutStyle', label: 'مؤثر TAKE OUT', type: 'select', value: soundOutStyle, options: ELECTION_SOUND_OPTIONS },
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
    name: 'كروي عالمي - Scorebug علوي',
    type: OverlayType.SCOREBOARD,
    isVisible: false,
    templateIcon: 'SBUG',
    templateAccent: '#00a86b',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'لوحة نتيجة علوية مدمجة مناسبة للبث المباشر، بتوقيت واضح واختصارات الفرق وشارة LIVE.',
    theme: { primaryColor: '#00a86b', secondaryColor: '#101820', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'competition', label: 'اسم البطولة', type: 'text', value: 'WORLD MATCH LIVE' },
      { id: 'matchStatus', label: 'حالة المباراة', type: 'text', value: 'LIVE' },
      { id: 'homeName', label: 'الفريق المضيف', type: 'text', value: 'Barcelona' },
      { id: 'awayName', label: 'الفريق الضيف', type: 'text', value: 'Madrid' },
      { id: 'homeShort', label: 'اختصار المضيف', type: 'text', value: 'BAR' },
      { id: 'awayShort', label: 'اختصار الضيف', type: 'text', value: 'MAD' },
      { id: 'homeScore', label: 'نتيجة المضيف', type: 'number', value: 2 },
      { id: 'awayScore', label: 'نتيجة الضيف', type: 'number', value: 1 },
      { id: 'period', label: 'الشوط', type: 'text', value: '2nd Half' },
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
    name: 'كروي عالمي - Match Bar فاخر',
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
      { id: 'competition', label: 'اسم البطولة', type: 'text', value: 'ELITE FOOTBALL NIGHT' },
      { id: 'matchStatus', label: 'حالة المباراة', type: 'text', value: 'MATCHDAY LIVE' },
      { id: 'homeName', label: 'الفريق المضيف', type: 'text', value: 'Al Hilal' },
      { id: 'awayName', label: 'الفريق الضيف', type: 'text', value: 'Al Nassr' },
      { id: 'homeShort', label: 'اختصار المضيف', type: 'text', value: 'HIL' },
      { id: 'awayShort', label: 'اختصار الضيف', type: 'text', value: 'NAS' },
      { id: 'homeScore', label: 'نتيجة المضيف', type: 'number', value: 1 },
      { id: 'awayScore', label: 'نتيجة الضيف', type: 'number', value: 1 },
      { id: 'period', label: 'الشوط', type: 'text', value: 'HT' },
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
    name: 'كروي عالمي - تنبيه VAR',
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
      { id: 'subHeadline', label: 'النص الفرعي', type: 'text', value: 'CHECKING POSSIBLE PENALTY' },
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
    templateDescription: 'Lower Third زجاجي لمحلل أو مراسل أو لاعب، مناسب للظهور السريع أثناء المباراة.',
    theme: { primaryColor: '#14b8a6', secondaryColor: '#18181b', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'name', label: 'الاسم', type: 'text', value: 'سامي الجابر' },
      { id: 'role', label: 'الدور', type: 'text', value: 'محلل تكتيكي' },
      { id: 'strapline', label: 'الشريط العلوي', type: 'text', value: 'TACTICAL DESK' },
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
    name: 'كروي عالمي - Match Ticker',
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
      { id: 'competition', label: 'اسم المركز', type: 'text', value: 'MATCH CENTER' },
      { id: 'headline', label: 'عنوان الشريط', type: 'text', value: 'MATCH UPDATE' },
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
    name: 'استوديو التحليلات الذكي (Match Stats)',
    type: OverlayType.MATCH_STATS,
    isVisible: false,
    templateIcon: '📊',
    templateAccent: '#3b82f6',
    templateGroup: 'FOOTBALL_WORLD_FEED',
    templateDescription: 'استوديو بيانات ذكي يعتمد على JSON من WhoScored، يحسب تلقائياً مؤشر الهيمنة، اللاعب المؤثر والمواجهات الثنائية.',
    theme: { primaryColor: '#3b82f6', secondaryColor: '#ef4444', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'dataMode', label: 'مصدر بيانات المباراة', type: 'select', value: 'CLOUD_BRIDGE', options: [
        { value: 'CLOUD_BRIDGE', label: 'REO Cloud Bridge - Google Cloud' },
        { value: 'BRIDGE', label: 'Local Bridge - localhost:3005' },
        { value: 'PASTE_JSON', label: 'JSON يدوي / ملف extractor' },
        { value: 'DEMO', label: 'بيانات تجريبية للاختبار' },
      ] },
      { id: 'manualJson', label: 'JSON المباراة المستورد', type: 'textarea', value: '' },
      { id: 'pollIntervalSec', label: 'تحديث القالب من الجسر كل ثانية', type: 'range', value: 30, min: 10, max: 60, step: 5 },
      { id: 'statsRotateSec', label: 'تبديل مجموعات الإحصائيات كل ثانية', type: 'range', value: 30, min: 10, max: 90, step: 5 },
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
        { value: 'DUAL_RAIL', label: 'Dual Rail' },
        { value: 'TACTICAL_SPLIT', label: 'Tactical Split' },
        { value: 'DATA_TOWER', label: 'Data Tower' },
        { value: 'COMPACT_BROADCAST', label: 'Compact Broadcast' },
        { value: 'GLASS_STUDIO', label: 'Glass Studio' },
        { value: 'NEON_TOUCHLINE', label: 'Neon Touchline' },
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
        { value: 'ULTRA', label: 'Ultra Broadcast' },
        { value: 'STANDARD', label: 'Standard' },
      ] },
      { id: 'matchPanelScale', label: 'مقياس لوحة المباراة', type: 'range', value: 1, min: 0.65, max: 1.6, step: 0.05 },
      { id: 'playerPanelScale', label: 'مقياس لوحة اللاعبين', type: 'range', value: 1, min: 0.65, max: 1.6, step: 0.05 },
      { id: 'showCreatorBadge', label: 'إظهار مربع صانع المحتوى', type: 'boolean', value: true },
      { id: 'creatorName', label: 'اسم صانع المحتوى', type: 'text', value: 'REO Live' },
      { id: 'creatorHandle', label: 'معرف صانع المحتوى', type: 'text', value: '@reo_live' },
      { id: 'creatorLabel', label: 'عنوان مربع صانع المحتوى', type: 'text', value: 'Content Creator' },
      { id: 'creatorAvatar', label: 'صورة صانع المحتوى', type: 'image', value: '' },
      { id: 'creatorBadgeScale', label: 'مقياس مربع صانع المحتوى', type: 'range', value: 1, min: 0.55, max: 1.6, step: 0.05 },
      { id: 'creatorPositionX', label: 'إزاحة مربع صانع المحتوى X', type: 'range', value: 0, min: -760, max: 760, step: 10 },
      { id: 'creatorPositionY', label: 'إزاحة مربع صانع المحتوى Y', type: 'range', value: 0, min: -420, max: 420, step: 10 },
      { id: 'playerImageMapJson', label: 'روابط صور اللاعبين JSON', type: 'textarea', value: '{}' },
      { id: 'playerImageCacheUrl', label: 'رابط كاش صور اللاعبين JSON', type: 'text', value: '/player-image-cache/barcelona.json?v=20260515;/player-image-cache/chelsea.json?v=20260515' },
      { id: 'dataSourceName', label: 'اسم مصدر البيانات الظاهر', type: 'text', value: 'REO Cloud Bridge' },
      { id: 'sourceMatchUrl', label: 'رابط مباراة WhoScored للتشغيل المباشر', type: 'text', value: 'https://www.whoscored.com/matches/1914233/live/spain-laliga-2025-2026-villarreal-sevilla' },
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
    name: 'Player Stats Lab - بطاقة إحصائيات لاعب',
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
        { value: 'CLOUD_BRIDGE', label: 'REO Player Cloud Bridge' },
      ] },
      { id: 'playerStatsMode', label: 'وضع القالب', type: 'select', value: 'SINGLE', options: [
        { value: 'SINGLE', label: 'لاعب واحد' },
        { value: 'COMPARE', label: 'مقارنة لاعبين' },
        { value: 'SCOUT_CARD', label: 'Scout Card / قائمة مراقبة 3 لاعبين' },
      ] },
      { id: 'providerPolicy', label: 'سياسة المصدر', type: 'select', value: 'auto', options: [
        { value: 'auto', label: 'موجِّه تلقائي' },
        { value: 'fbref', label: 'موسم FBref أولًا' },
        { value: 'matchBridge', label: 'جسر المباريات أولًا' },
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
      { id: 'selectedMetricsJson', label: 'Selected metric keys', type: 'hidden', value: '["goals","assists","shots","shots_on_target","xg","xa","key_passes","dribbles_completed","touches_in_box","goals_per90","assists_per90","impact_index"]' },
      { id: 'heroMetricsJson', label: 'Hero metric keys', type: 'hidden', value: '["goals","assists","xg","impact_index"]' },
      { id: 'secondaryMetricsJson', label: 'Secondary metric keys', type: 'hidden', value: '["shots","shots_on_target","key_passes","dribbles_completed","touches_in_box","goals_per90","assists_per90","xa"]' },
      { id: 'hiddenMetricsJson', label: 'Hidden metric keys', type: 'hidden', value: '[]' },
      { id: 'metricNaturalLanguage', label: 'Natural metric search', type: 'hidden', value: '' },
      { id: 'playerStatsLabUiMode', label: 'وضع لوحة التحكم', type: 'hidden', value: 'easy' },
      { id: 'showUnavailableMetrics', label: 'إظهار غير المتاح', type: 'hidden', value: 'false' },
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
        { value: 'english', label: 'English' },
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
      { id: 'playerAName', label: 'اللاعب A', type: 'text', value: 'Robert Lewandowski' },
      { id: 'playerAClub', label: 'نادي اللاعب A', type: 'text', value: 'Barcelona' },
      { id: 'playerAPosition', label: 'مركز اللاعب A', type: 'text', value: 'ST / Forward' },
      { id: 'playerAImage', label: 'صورة صغيرة اللاعب A', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Robert%20Lewandowski.png' },
      { id: 'playerAClubLogo', label: 'شعار نادي اللاعب A', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'playerBName', label: 'اللاعب B', type: 'text', value: 'Cole Palmer' },
      { id: 'playerBClub', label: 'نادي اللاعب B', type: 'text', value: 'Chelsea' },
      { id: 'playerBPosition', label: 'مركز اللاعب B', type: 'text', value: 'AM / RW' },
      { id: 'playerBImage', label: 'صورة صغيرة اللاعب B', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/Premier%20League/Players/Chelsea/Cole_Palmer_5.png' },
      { id: 'playerBClubLogo', label: 'شعار نادي اللاعب B', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/Premier%20League/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%A7%D9%86%D8%AF%D9%8A%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A%D8%A9/Chelsea%20FC.png' },
      { id: 'playerCName', label: 'اللاعب C', type: 'text', value: 'Lamine Yamal' },
      { id: 'playerCClub', label: 'نادي اللاعب C', type: 'text', value: 'Barcelona' },
      { id: 'playerCPosition', label: 'مركز اللاعب C', type: 'text', value: 'RW' },
      { id: 'playerCImage', label: 'صورة صغيرة اللاعب C', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'playerCClubLogo', label: 'شعار نادي اللاعب C', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'playerStatsJson', label: 'إحصائيات اللاعب الأساسية JSON', type: 'textarea', value: '[{"label":"Goals","value":"25","hint":"season total","category":"attack"},{"label":"Shots / 90","value":"3.8","hint":"volume","category":"attack"},{"label":"Key passes","value":"41","hint":"chance creation","category":"passing"},{"label":"Progressive passes","value":"68","hint":"build-up","category":"passing"},{"label":"Recoveries","value":"132","hint":"ball wins","category":"defense"},{"label":"Minutes","value":"2,640","hint":"season load","category":"season"}]' },
      { id: 'playerStatsSourceJson', label: 'JSON كامل من جسر إحصائيات اللاعبين', type: 'textarea', value: '' },
      { id: 'dataSourceName', label: 'اسم مصدر البيانات الظاهر', type: 'text', value: 'REO Player Data Bridge' },
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
    { id: 'designStyle', label: 'Projection style', type: 'select', value: designStyle, options: ['TITLE_STING', 'COMPOSITION_INTRO', 'LINEUP_BOARD', 'COMPACT_SCOREBUG', 'TUNNEL_REVEAL'] },
    { id: 'themePreset', label: 'Projection theme', type: 'select', value: themePreset, options: ['PROJECTION_BLUE', 'PROJECTION_RED', 'PROJECTION_MONO', 'ELITE_SILVER', 'MATCH_NIGHT'] },
    { id: 'watermarkText', label: 'Watermark loop', type: 'text', value: watermarkText },
    { id: 'title', label: 'Main title', type: 'text', value: title },
    { id: 'subtitle', label: 'Subtitle', type: 'text', value: subtitle },
    { id: 'teamName', label: 'Team name', type: 'text', value: teamName },
    { id: 'competition', label: 'Competition label', type: 'text', value: competition },
    { id: 'teamLogo', label: 'Team logo', type: 'image', value: `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName.slice(0, 3))}&background=050712&color=ffffff&size=512&bold=true` },
    { id: 'formation', label: 'Formation', type: 'text', value: formation },
    { id: 'playersCount', label: 'Players shown', type: 'range', value: playersCount, min: 1, max: 8, step: 1 },
    { id: 'pitchNumbers', label: 'Pitch numbers CSV', type: 'text', value: pitchNumbers },
    { id: 'brandMark', label: 'Scorebug brand mark', type: 'text', value: brandMark },
    { id: 'time', label: 'Match time', type: 'text', value: time },
    { id: 'homeScore', label: 'Home score', type: 'number', value: homeScore },
    { id: 'awayScore', label: 'Away score', type: 'number', value: awayScore },
    { id: 'homeLogo', label: 'Home logo', type: 'image', value: `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName.slice(0, 3))}&background=0057ff&color=ffffff&size=256&bold=true` },
    { id: 'awayLogo', label: 'Away logo', type: 'image', value: 'https://ui-avatars.com/api/?name=OPP&background=a50044&color=ffffff&size=256&bold=true' },
    { id: 'scale', label: 'Template scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
    { id: 'positionY', label: 'Vertical offset (Y)', type: 'range', value: 0, min: -1000, max: 1000, step: 10 },
    { id: 'positionX', label: 'Horizontal offset (X)', type: 'range', value: 0, min: -1500, max: 1500, step: 10 },
    ...projectionPlayerDefaults.flatMap(([number, playerName], index) => [
      { id: `player${index + 1}Number`, label: `Player ${index + 1} number`, type: 'text' as const, value: number },
      { id: `player${index + 1}Name`, label: `Player ${index + 1} name`, type: 'text' as const, value: playerName },
      { id: `player${index + 1}Image`, label: `Player ${index + 1} image`, type: 'image' as const, value: '' },
    ]),
    ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', soundInStyle, 'LUXURY_OUT'),
  ],
});

const FOOTBALL_PROJECTION_TEMPLATES: OverlayConfig[] = [
  createFootballProjectionTemplate({
    id: 'template-football-projection-title-sting',
    name: 'Projection Football - Title Sting',
    description: 'Full-screen match sting with oversized typography, moving grid lines, premium sweep motion, and top/bottom broadcast loops.',
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
    name: 'Projection Football - Composition Intro',
    description: 'Team composition opener inspired by arena projection packages with a central crest chamber and strong red/blue geometry.',
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
    name: 'Projection Football - Lineup Board',
    description: 'Integrated lineup board with player columns and tactical pitch, built for pre-match or halftime analysis packages.',
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
    name: 'Projection Football - Compact Scorebug',
    description: 'Small premium scorebug for live match coverage, matching the projection package rather than the older generic scoreboard style.',
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
    name: 'Projection Football - Tunnel Reveal',
    description: 'Tunnel-style reveal for substitutions, extra time, player entrances, or tactical reset moments.',
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
    name: 'شريط الداعمين (Stream Ribbon)',
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
    name: 'التقرير الذكي (AI)',
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
        label: 'تأثير الانتقال (Transition)', 
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
        label: 'هوامش المحتوى (Padding)', 
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
        label: 'حجم القالب (Zoom)', 
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
      { id: 'designStyle', label: 'النمط (Design)', type: 'select' as const, value: 'CLASSIC', options: ['CLASSIC', 'MODERN', 'DARK'] },
      { id: 'themePreset', label: 'الثيم (Colors)', type: 'select' as const, value: 'TACTICAL_BLUE', options: ['TACTICAL_BLUE', 'CLASSIC_RED', 'PITCH_GREEN', 'ROYAL_GOLD', 'NIGHT_PURPLE', 'UCL_BLUE', 'DARK_MATTER'] },
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
    name: 'تعريف ضيف (Lower Third)',
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
      { id: 'designStyle', label: 'النمط (Design)', type: 'select' as const, value: 'CLASSIC', options: ['CLASSIC', 'MODERN', 'MINIMAL'] },
      { id: 'themePreset', label: 'الثيم (Colors)', type: 'select' as const, value: 'TACTICAL_BLUE', options: ['TACTICAL_BLUE', 'CLASSIC_RED', 'PITCH_GREEN', 'ROYAL_GOLD', 'NIGHT_PURPLE', 'DARK_MATTER'] },
      // Position
      { id: 'scale', label: 'حجم القالب', type: 'range' as const, value: 1.2, min: 0.5, max: 3.0, step: 0.1 },
    ]
  },
  {
    id: 'template-exclusive-alert',
    name: 'خبر حصري (Exclusive Alert)',
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
      { id: 'useTTS', label: 'تفعيل النطق الصوتي (TTS)', type: 'boolean', value: true },
      { id: 'ttsText', label: 'نص النطق الصوتي', type: 'text', value: 'حصرياً مع ريو' },
      { id: 'themePreset', label: 'اللون', type: 'select', value: 'CLASSIC_RED', options: ['CLASSIC_RED', 'ROYAL_GOLD', 'TACTICAL_BLUE', 'PITCH_GREEN', 'NIGHT_PURPLE'] },
      { id: 'soundEnabled', label: 'تفعيل الصوت', type: 'boolean', value: true },
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 3, step: 0.1 }
    ]
  },
  {
    id: 'template-guests',
    name: 'ضيوف الحلقة (Guests)',
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
    name: 'قرعة الأبطال (UCL Draw)',
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
    name: 'تغريدة / تعليق (Social Media)',
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
      { id: 'authorHandle', label: 'المعرف (Handle)', type: 'text', value: '@ahmed_m' },
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
      { id: 'designStyle', label: 'النمط (Design)', type: 'select' as const, value: 'MODERN', options: ['MODERN', 'DARK'] },
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
    name: 'H2H مقارنة لاعبين',
    type: OverlayType.H2H_STATS,
    isVisible: false,
    templateIcon: 'H2H',
    templateAccent: '#00E5FF',
    templateGroup: 'REO_BROADCAST',
    templateDescription: 'مقارنة إحصائيات بين لاعبين — Sky Sports / NSL Style',
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
    name: 'ميركاتو - إعلان صفقة سينمائي',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'DEAL',
    templateAccent: '#00F5D4',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'قالب صفقة رئيسية بتصميم سينمائي: لاعب، مسار النادي، قيمة الصفقة، ونسبة الثقة ضمن هوية ميركاتو واحدة.',
    theme: { primaryColor: '#00F5D4', secondaryColor: '#050505', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'designStyle', label: 'Design style', type: 'select', value: 'DEAL_BREAKER', options: ['DEAL_BREAKER', 'MARKET_COMMAND_CENTER', 'RUMOUR_RADAR', 'DONE_DEALS_WALL', 'PLAYER_SEASON_CARD', 'PLAYER_IMPACT_CARD'] },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'sportmonksPlayerId', label: 'Sportmonks player ID', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'Sportmonks search name', type: 'text', value: '' },
      { id: 'playerTeam', label: 'Player team', type: 'text', value: 'Barcelona' },
      { id: 'playerPosition', label: 'Player position', type: 'text', value: 'Forward' },
      { id: 'playerImageLarge', label: 'Player render / large image', type: 'image', value: '' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'seasonLabel', label: 'Season label', type: 'text', value: '2025/26' },
      { id: 'playerName',  label: 'اسم اللاعب',    type: 'text',  value: 'Nico Williams' },
      { id: 'playerImage', label: 'صورة اللاعب',   type: 'image', value: '' },
      { id: 'fromClub',    label: 'النادي المغادر', type: 'text',  value: 'Athletic Club' },
      { id: 'toClub',      label: 'النادي الجديد',  type: 'text',  value: 'Barcelona' },
      { id: 'dealValue',   label: 'قيمة الصفقة',   type: 'text',  value: '58M EUR' },
      { id: 'confidence',  label: 'نسبة التأكد %', type: 'range', value: 78, min: 0, max: 100, step: 1 },
      { id: 'headline',    label: 'العنوان الرئيسي', type: 'text', value: 'TRANSFER DECISION' },
      { id: 'subheadline', label: 'Market subtitle', type: 'text', value: 'Smart live update with deal package, probability and market signal.' },
      { id: 'source',      label: 'المصدر',         type: 'text',  value: 'Reo Show Exclusive' },
      { id: 'marketItems', label: 'Market items JSON or player|from|to|value|confidence|status|tag', type: 'textarea', value: '[{"player":"Nico Williams","from":"Athletic Club","to":"Barcelona","value":"58M EUR","confidence":78,"status":"Advanced talks","tag":"Priority"},{"player":"Joshua Kimmich","from":"Bayern","to":"Barcelona","value":"Free / Bonus","confidence":64,"status":"Monitoring","tag":"Opportunity"},{"player":"Joao Cancelo","from":"Man City","to":"Barcelona","value":"Loan + option","confidence":72,"status":"Expected","tag":"Return"}]' },
      { id: 'playerStatsJson', label: 'Player season stats JSON', type: 'textarea', value: '[{"label":"Goals","value":"14","hint":"League"},{"label":"Assists","value":"9","hint":"All comps"},{"label":"Key passes","value":"61","hint":"Chance creation"},{"label":"Shots / 90","value":"3.4","hint":"Volume"},{"label":"Dribbles","value":"72","hint":"Completed"},{"label":"Minutes","value":"2,418","hint":"Season load"}]' },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'MERCATO_HIT', 'LUXURY_OUT'),
      { id: 'dailyDeals', label: 'Done deals today', type: 'textarea', value: 'Medical passed and contract signed until 2030;Loan completed with buy option;Verbal agreement reached after final call' },
      { id: 'expectedDeals', label: 'Expected deals', type: 'textarea', value: 'Left wing shortlist reduced to two names;Defensive midfielder talks remain open;Full-back return depends on loan formula' },
      { id: 'latestNews', label: 'Latest market news', type: 'textarea', value: 'Board approved the sporting profile and salary range;Agent meeting expected within 48 hours;Outgoing transfers will define the final budget' },
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
    name: 'ميركاتو - غرفة القرار الذكية',
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
      { id: 'designStyle', label: 'Design style', type: 'hidden', value: 'MARKET_COMMAND_CENTER' },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'headline', label: 'Main headline', type: 'text', value: 'MERCATO DECISION ROOM' },
      { id: 'subheadline', label: 'Subtitle', type: 'text', value: 'Integrated transfer intelligence: probability board, completed deals, expected moves and live market signals.' },
      { id: 'playerName', label: 'Featured player', type: 'text', value: 'Nico Williams' },
      { id: 'playerImage', label: 'Featured player image', type: 'image', value: '' },
      { id: 'playerImageLarge', label: 'Featured render / large image', type: 'image', value: '' },
      { id: 'fromClub', label: 'From club', type: 'text', value: 'Athletic Club' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png' },
      { id: 'toClub', label: 'To club', type: 'text', value: 'Barcelona' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'Deal value', type: 'text', value: '58M EUR' },
      { id: 'confidence', label: 'Reliability %', type: 'range', value: 78, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'Source', type: 'text', value: 'Reo Show Mercato Desk' },
      { id: 'marketItems', label: 'Market items JSON or player|from|to|value|confidence|status|tag', type: 'textarea', value: '[{"player":"Nico Williams","from":"Athletic Club","to":"Barcelona","value":"58M EUR","confidence":78,"status":"Advanced talks","tag":"Priority"},{"player":"Joshua Kimmich","from":"Bayern","to":"Barcelona","value":"Free / Bonus","confidence":64,"status":"Monitoring","tag":"Opportunity"},{"player":"Joao Cancelo","from":"Man City","to":"Barcelona","value":"Loan + option","confidence":72,"status":"Expected","tag":"Return"},{"player":"Dani Olmo","from":"Leipzig","to":"Barcelona","value":"60M EUR","confidence":58,"status":"Complicated","tag":"Creative"}]' },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'MERCATO_HIT', 'LUXURY_OUT'),
      { id: 'dailyDeals', label: 'Done deals today', type: 'textarea', value: 'Medical passed and contract signed until 2030;Loan completed with buy option;Verbal agreement reached after final call' },
      { id: 'expectedDeals', label: 'Expected deals', type: 'textarea', value: 'Left wing shortlist reduced to two names;Defensive midfielder talks remain open;Full-back return depends on loan formula' },
      { id: 'latestNews', label: 'Latest news', type: 'textarea', value: 'Board approved the sporting profile and salary range;Agent meeting expected within 48 hours;Outgoing transfers will define the final budget' },
      { id: 'accentColor', label: 'Accent color', type: 'color', value: '#00F5D4' },
      { id: 'fromColor', label: 'From club color', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'To club color', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'Urgent strip', type: 'boolean', value: false },
      { id: 'scale', label: 'Scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'Y position', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'X position', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-probability-radar',
    templateId: 'template-mercato-probability-radar',
    name: 'ميركاتو - مصفوفة توقعات الانتقال',
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
      { id: 'designStyle', label: 'Design style', type: 'hidden', value: 'RUMOUR_RADAR' },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'headline', label: 'Main headline', type: 'text', value: 'PROBABILITY MATRIX' },
      { id: 'playerName', label: 'Featured player', type: 'text', value: 'Nico Williams' },
      { id: 'playerImage', label: 'Featured player image', type: 'image', value: '' },
      { id: 'playerImageLarge', label: 'Featured render / large image', type: 'image', value: '' },
      { id: 'fromClub', label: 'From club', type: 'text', value: 'Athletic' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png' },
      { id: 'toClub', label: 'To club', type: 'text', value: 'Barcelona' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'Deal value', type: 'text', value: '58M EUR' },
      { id: 'confidence', label: 'Transfer probability %', type: 'range', value: 78, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'Source', type: 'text', value: 'Probability model / Reo Show' },
      { id: 'marketItems', label: 'Predicted transfers JSON', type: 'textarea', value: '[{"player":"Nico Williams","from":"Athletic Club","to":"Barcelona","value":"58M EUR","confidence":78,"status":"Hot","tag":"Priority"},{"player":"Kimmich","from":"Bayern","to":"Barcelona","value":"Free","confidence":64,"status":"Watch","tag":"Opportunity"},{"player":"Cancelo","from":"City","to":"Barcelona","value":"Loan","confidence":72,"status":"Expected","tag":"Return"},{"player":"Olmo","from":"Leipzig","to":"Barcelona","value":"60M EUR","confidence":58,"status":"Difficult","tag":"Creative"},{"player":"Merino","from":"Sociedad","to":"Barcelona","value":"25M EUR","confidence":43,"status":"Cold","tag":"Depth"}]' },
      ...broadcastMotionPreset('DATA_RUSH', 'DATA_RUSH_OUT', 'DATA_SLAM', 'BROADCAST_OUT'),
      { id: 'accentColor', label: 'Accent color', type: 'color', value: '#7CFF6B' },
      { id: 'fromColor', label: 'From club color', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'To club color', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'Urgent strip', type: 'boolean', value: false },
      { id: 'scale', label: 'Scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'Y position', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'X position', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-done-deals-wall',
    templateId: 'template-mercato-done-deals-wall',
    name: 'ميركاتو - صفقات تمت اليوم',
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
      { id: 'designStyle', label: 'Design style', type: 'hidden', value: 'DONE_DEALS_WALL' },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'CLEAN_BROADCAST', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'headline', label: 'Main headline', type: 'text', value: 'DONE DEALS TODAY' },
      { id: 'playerName', label: 'Featured player', type: 'text', value: 'Estevao' },
      { id: 'playerImage', label: 'Featured player image', type: 'image', value: '' },
      { id: 'playerImageLarge', label: 'Featured render / large image', type: 'image', value: '' },
      { id: 'fromClub', label: 'From club', type: 'text', value: 'Palmeiras' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: '' },
      { id: 'toClub', label: 'To club', type: 'text', value: 'Chelsea' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/Premier%20League/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%A7%D9%86%D8%AF%D9%8A%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A%D8%A9/Chelsea%20FC.png' },
      { id: 'confidence', label: 'Reliability %', type: 'range', value: 92, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'Source', type: 'text', value: 'Official / Reo Show Desk' },
      { id: 'marketItems', label: 'Completed deals JSON', type: 'textarea', value: '[{"player":"Estevao","from":"Palmeiras","to":"Chelsea","value":"61M EUR","confidence":100,"status":"Official"},{"player":"Endrick","from":"Palmeiras","to":"Real Madrid","value":"47M EUR","confidence":100,"status":"Official"},{"player":"Young Midfielder","from":"Academy","to":"First Team","value":"New contract","confidence":96,"status":"Signed"},{"player":"Full Back","from":"Club A","to":"Club B","value":"Loan","confidence":91,"status":"Completed"},{"player":"Striker","from":"Club C","to":"Club D","value":"35M EUR","confidence":94,"status":"Medical passed"},{"player":"Keeper","from":"Club E","to":"Club F","value":"Free","confidence":98,"status":"Announced"}]' },
      { id: 'dailyDeals', label: 'Done deals today', type: 'textarea', value: 'Official announcement published;Medical passed;Contract signed' },
      ...broadcastMotionPreset('SPOTLIGHT_POP', 'SPOTLIGHT_POP_OUT', 'CINEMA_BOOM', 'LUXURY_OUT'),
      { id: 'accentColor', label: 'Accent color', type: 'color', value: '#19D37F' },
      { id: 'fromColor', label: 'From club color', type: 'color', value: '#111827' },
      { id: 'toColor', label: 'To club color', type: 'color', value: '#0F766E' },
      { id: 'isUrgent', label: 'Urgent strip', type: 'boolean', value: false },
      { id: 'scale', label: 'Scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'Y position', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'X position', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-player-season-card',
    templateId: 'template-mercato-player-season-card',
    name: 'Mercato - Player Season Card',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'CARD',
    templateAccent: '#5EEAD4',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'A high-impact player card for mercato shows: player photo, season metrics, transfer confidence, and source-ready stats.',
    theme: { primaryColor: '#5EEAD4', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'Design style', type: 'hidden', value: 'PLAYER_SEASON_CARD' },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'LUXE_STUDIO', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'headline', label: 'Main headline', type: 'text', value: 'SEASON FORM FILE' },
      { id: 'subheadline', label: 'Subtitle', type: 'text', value: 'Compact scouting card for the current mercato: form, output, availability and transfer signal.' },
      { id: 'playerName', label: 'Player name', type: 'text', value: 'Lamine Yamal' },
      { id: 'playerImage', label: 'Player image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'playerImageLarge', label: 'Player render / large image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'sportmonksPlayerId', label: 'Sportmonks player ID', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'Sportmonks search name', type: 'text', value: 'Lamine Yamal' },
      { id: 'playerTeam', label: 'Player team', type: 'text', value: 'Barcelona' },
      { id: 'playerPosition', label: 'Player position', type: 'text', value: 'RW / Forward' },
      { id: 'seasonLabel', label: 'Season label', type: 'text', value: '2025/26' },
      { id: 'fromClub', label: 'From club', type: 'text', value: 'Barcelona' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'To club', type: 'text', value: 'Barcelona' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'Market package', type: 'text', value: 'Elite youth asset' },
      { id: 'confidence', label: 'Mercato confidence %', type: 'range', value: 88, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'Source', type: 'text', value: 'Sportmonks / Reo cache' },
      { id: 'playerStatsJson', label: 'Player season stats JSON', type: 'textarea', value: '[{"label":"Goals","value":"14","hint":"League output"},{"label":"Assists","value":"9","hint":"All comps"},{"label":"Key passes","value":"61","hint":"Chance creation"},{"label":"Shots / 90","value":"3.4","hint":"Shot volume"},{"label":"Dribbles","value":"72","hint":"Completed"},{"label":"Minutes","value":"2,418","hint":"Season load"}]' },
      { id: 'latestNews', label: 'Market read', type: 'textarea', value: 'Profile is protected as a key project asset;Club expects a central role in the new season;Image source can come from GitHub cache or Sportmonks image_path' },
      { id: 'dailyDeals', label: 'Done deals today', type: 'textarea', value: 'Renewal framework prepared;Sponsor content package ready;Player image cached for broadcast use' },
      { id: 'expectedDeals', label: 'Expected deals', type: 'textarea', value: 'Season stats sync via Sportmonks;Archive card in GitHub after show;Add more La Liga player images to cache' },
      { id: 'marketItems', label: 'Market items JSON', type: 'textarea', value: '[{"player":"Lamine Yamal","from":"Barcelona","to":"Barcelona","value":"Protected","confidence":88,"status":"Untouchable","tag":"Core"},{"player":"Pedri","from":"Barcelona","to":"Barcelona","value":"Key asset","confidence":84,"status":"Core","tag":"Midfield"},{"player":"Pau Cubarsi","from":"Barcelona","to":"Barcelona","value":"Rising","confidence":81,"status":"Breakout","tag":"Defence"}]' },
      { id: 'accentColor', label: 'Accent color', type: 'color', value: '#5EEAD4' },
      { id: 'fromColor', label: 'From club color', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'To club color', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'Urgent strip', type: 'boolean', value: false },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'MERCATO_HIT', 'LUXURY_OUT'),
      { id: 'scale', label: 'Scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'Y position', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'X position', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-player-impact-card',
    templateId: 'template-mercato-player-impact-card',
    name: 'Mercato - Player Impact Forecast',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'IMPT',
    templateAccent: '#60A5FA',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'A wide broadcast card for player impact: progress bars, player cutout, deal route, probability and cinematic motion.',
    theme: { primaryColor: '#60A5FA', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'Design style', type: 'hidden', value: 'PLAYER_IMPACT_CARD' },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'TACTICAL_DARK', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'headline', label: 'Main headline', type: 'text', value: 'IMPACT FORECAST' },
      { id: 'subheadline', label: 'Subtitle', type: 'text', value: 'A fast-reading scouting panel for transfer shows: minutes, progression, creativity and availability.' },
      { id: 'playerName', label: 'Player name', type: 'text', value: 'Pedri' },
      { id: 'playerImage', label: 'Player image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Pedri.png' },
      { id: 'playerImageLarge', label: 'Player render / large image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Pedri.png' },
      { id: 'sportmonksPlayerId', label: 'Sportmonks player ID', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'Sportmonks search name', type: 'text', value: 'Pedri' },
      { id: 'playerTeam', label: 'Player team', type: 'text', value: 'Barcelona' },
      { id: 'playerPosition', label: 'Player position', type: 'text', value: 'CM / AM' },
      { id: 'seasonLabel', label: 'Season label', type: 'text', value: 'Last season' },
      { id: 'fromClub', label: 'From club', type: 'text', value: 'Barcelona' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'To club', type: 'text', value: 'Barcelona' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'Market package', type: 'text', value: 'Creative hub' },
      { id: 'confidence', label: 'Mercato confidence %', type: 'range', value: 74, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'Source', type: 'text', value: 'Reo scouting model' },
      { id: 'playerStatsJson', label: 'Player season stats JSON', type: 'textarea', value: '[{"label":"Appearances","value":"52","hint":"Availability"},{"label":"Minutes","value":"3,210","hint":"Load"},{"label":"Progressive passes","value":"96","hint":"Build-up"},{"label":"Key passes","value":"74","hint":"Chance creation"},{"label":"Duels won","value":"58","hint":"Percent"},{"label":"Pass accuracy","value":"91","hint":"Percent"}]' },
      { id: 'latestNews', label: 'Market read', type: 'textarea', value: 'Creative role remains central;Medical load monitored weekly;Use Sportmonks endpoint when token is configured' },
      { id: 'dailyDeals', label: 'Done deals today', type: 'textarea', value: 'Player image cached;Stats panel ready;Audio cue upgraded' },
      { id: 'expectedDeals', label: 'Expected deals', type: 'textarea', value: 'Connect season statistics API;Auto-archive the final card;Add club-specific visual pack' },
      { id: 'marketItems', label: 'Market items JSON', type: 'textarea', value: '[{"player":"Pedri","from":"Barcelona","to":"Barcelona","value":"Creative hub","confidence":74,"status":"Core player","tag":"Impact"},{"player":"Frenkie de Jong","from":"Barcelona","to":"Barcelona","value":"Midfield control","confidence":68,"status":"Tracked","tag":"Build-up"},{"player":"Gavi","from":"Barcelona","to":"Barcelona","value":"Intensity","confidence":79,"status":"Returning","tag":"Energy"}]' },
      { id: 'accentColor', label: 'Accent color', type: 'color', value: '#60A5FA' },
      { id: 'fromColor', label: 'From club color', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'To club color', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'Urgent strip', type: 'boolean', value: false },
      ...broadcastMotionPreset('DATA_RUSH', 'DATA_RUSH_OUT', 'DATA_SLAM', 'BROADCAST_OUT'),
      { id: 'scale', label: 'Scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'Y position', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'X position', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-contract-exit-watch',
    templateId: 'template-mercato-contract-exit-watch',
    name: 'Mercato - Contract Exit Watch',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'EXIT',
    templateAccent: '#F97316',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'Free-agent and end-of-contract story template with player cutout, probability, route and fast news stack.',
    theme: { primaryColor: '#F97316', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'Design style', type: 'hidden', value: 'DEAL_BREAKER' },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'headline', label: 'Main headline', type: 'text', value: 'CONTRACT EXIT WATCH' },
      { id: 'subheadline', label: 'Subtitle', type: 'text', value: 'End-of-contract scenario: free transfer angle, probability and live market signal.' },
      { id: 'playerName', label: 'Player name', type: 'text', value: 'Robert Lewandowski' },
      { id: 'playerImage', label: 'Player image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Robert%20Lewandowski.png' },
      { id: 'playerImageLarge', label: 'Player render / large image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Robert%20Lewandowski.png' },
      { id: 'sportmonksPlayerId', label: 'Sportmonks player ID', type: 'text', value: '' },
      { id: 'sportmonksSearch', label: 'Sportmonks search name', type: 'text', value: 'Robert Lewandowski' },
      { id: 'playerTeam', label: 'Player team', type: 'text', value: 'Barcelona' },
      { id: 'playerPosition', label: 'Player position', type: 'text', value: 'ST / Forward' },
      { id: 'seasonLabel', label: 'Season label', type: 'text', value: '2025/26' },
      { id: 'fromClub', label: 'From club', type: 'text', value: 'Barcelona' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'To club', type: 'text', value: 'Free agent' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: '' },
      { id: 'dealValue', label: 'Deal package', type: 'text', value: 'Free transfer / end of contract' },
      { id: 'confidence', label: 'Probability %', type: 'range', value: 65, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'Source', type: 'text', value: 'AI Mercato Desk' },
      { id: 'playerStatsJson', label: 'Player season stats JSON', type: 'textarea', value: '[{"label":"Goals","value":"25","hint":"Season output"},{"label":"Shots / 90","value":"3.8","hint":"Penalty-box threat"},{"label":"Touches in box","value":"178","hint":"Area presence"},{"label":"Aerial duels","value":"54%","hint":"Forward contests"},{"label":"Minutes","value":"2,640","hint":"Season load"},{"label":"Big chances","value":"28","hint":"Finishing volume"}]' },
      { id: 'latestNews', label: 'Market read', type: 'textarea', value: 'Contract situation creates a free-transfer scenario;Barcelona decision depends on salary planning;Final route remains open until renewal talks are closed' },
      { id: 'dailyDeals', label: 'Done deals today', type: 'textarea', value: 'Player image resolved from cache;AI prompt can update probability;Contract exit audio cue enabled' },
      { id: 'expectedDeals', label: 'Expected deals', type: 'textarea', value: 'Agent meeting signal;Renewal or exit decision;Archive the final story after broadcast' },
      { id: 'marketItems', label: 'Market items JSON', type: 'textarea', value: '[{"player":"Robert Lewandowski","from":"Barcelona","to":"Free agent","value":"Free transfer / end of contract","confidence":65,"status":"Contract exit","tag":"Exit watch"}]' },
      { id: 'accentColor', label: 'Accent color', type: 'color', value: '#F97316' },
      { id: 'fromColor', label: 'From club color', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'To club color', type: 'color', value: '#111827' },
      { id: 'isUrgent', label: 'Urgent strip', type: 'boolean', value: true },
      ...broadcastMotionPreset('SPOTLIGHT_POP', 'SPOTLIGHT_POP_OUT', 'CONTRACT_STAMP', 'BROADCAST_OUT'),
      { id: 'scale', label: 'Scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'Y position', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'X position', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-mercato-here-we-go-board',
    templateId: 'template-mercato-here-we-go-board',
    name: 'Mercato - Here We Go Board',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'HWG',
    templateAccent: '#22D3EE',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'High-energy transfer confirmation board for multiple quick stories and one featured deal.',
    theme: { primaryColor: '#22D3EE', secondaryColor: '#050608', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      ...commonFields,
      { id: 'designStyle', label: 'Design style', type: 'hidden', value: 'MARKET_COMMAND_CENTER' },
      { id: 'visualVariant', label: 'Look variant', type: 'select', value: 'NEON_GLASS', options: [
        { value: 'NEON_GLASS', label: 'Neon Glass' },
        { value: 'TACTICAL_DARK', label: 'Tactical Dark' },
        { value: 'LUXE_STUDIO', label: 'Luxe Studio' },
        { value: 'CLEAN_BROADCAST', label: 'Clean Broadcast' },
      ] },
      { id: 'headline', label: 'Main headline', type: 'text', value: 'HERE WE GO BOARD' },
      { id: 'subheadline', label: 'Subtitle', type: 'text', value: 'One featured transfer, live probability and rapid deal signals for a mercato show segment.' },
      { id: 'playerName', label: 'Featured player', type: 'text', value: 'Lamine Yamal' },
      { id: 'playerImage', label: 'Player image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'playerImageLarge', label: 'Player render / large image', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/Barcelona/Lamine%20Yamal.png' },
      { id: 'fromClub', label: 'From club', type: 'text', value: 'Barcelona' },
      { id: 'fromClubLogo', label: 'From club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'toClub', label: 'To club', type: 'text', value: 'Barcelona' },
      { id: 'toClubLogo', label: 'To club logo', type: 'image', value: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png' },
      { id: 'dealValue', label: 'Deal package', type: 'text', value: 'Protected asset' },
      { id: 'confidence', label: 'Reliability %', type: 'range', value: 88, min: 0, max: 100, step: 1 },
      { id: 'source', label: 'Source', type: 'text', value: 'Reo Show Mercato Desk' },
      { id: 'marketItems', label: 'Market items JSON', type: 'textarea', value: '[{"player":"Lamine Yamal","from":"Barcelona","to":"Barcelona","value":"Protected asset","confidence":88,"status":"Locked","tag":"Core"},{"player":"Robert Lewandowski","from":"Barcelona","to":"Free agent","value":"Free transfer","confidence":65,"status":"Contract watch","tag":"Exit"},{"player":"Dani Olmo","from":"Barcelona","to":"Barcelona","value":"Creative hub","confidence":74,"status":"Tracked","tag":"Impact"}]' },
      { id: 'dailyDeals', label: 'Done deals today', type: 'textarea', value: 'Contract file updated;Player image cache verified;AI prompt ready for show' },
      { id: 'expectedDeals', label: 'Expected deals', type: 'textarea', value: 'New player card;Club-logo cache expansion;Archive final package to GitHub' },
      { id: 'latestNews', label: 'Latest news', type: 'textarea', value: 'Use the AI box to paste one or many transfer lines;The board will fill player, club, confidence and image automatically;Sound cue set to a stronger transfer sting' },
      ...broadcastMotionPreset('STADIUM_SWEEP', 'STADIUM_SWEEP_OUT', 'HERE_WE_GO_STING', 'LUXURY_OUT'),
      { id: 'accentColor', label: 'Accent color', type: 'color', value: '#22D3EE' },
      { id: 'fromColor', label: 'From club color', type: 'color', value: '#A50044' },
      { id: 'toColor', label: 'To club color', type: 'color', value: '#004D98' },
      { id: 'isUrgent', label: 'Urgent strip', type: 'boolean', value: true },
      { id: 'scale', label: 'Scale', type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY', label: 'Y position', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX', label: 'X position', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-barca-premium',
    templateId: 'template-barca-premium',
    name: 'FCB حزمة برشلونة',
    type: OverlayType.BARCA_PREMIUM,
    isVisible: false,
    templateIcon: 'FCB',
    templateAccent: '#EDBB00',
    templateGroup: 'REO_BROADCAST',
    templateDescription: 'هوية برشلونة المحترفة — La Liga / EA Sports Style',
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
      { id: 'showBadge',   label: 'إظهار شارة FCB',  type: 'boolean', value: true },
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
      { value: 'GRADIENT_FIRE',   label: '⏳ Deadline Day — يوم الحسم الناري' },
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
      { value: 'STORM_WARNING',  label: '⏳ Deadline Day — يوم الحسم العاصف' },
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
    { value: 'sourceExclusive',  label: '🤐 Source Exclusive — مصدر خاص' },
    { value: 'dealHeating',      label: '🔥 Deal Heating — الصفقة تشتعل' },
    { value: 'analysisLab',      label: '🔬 Analysis Lab — فحص فني للاعب' },
  ] },
  { id: 'voicePackId', label: '🗣️ اختيار صوت من المكتبة', type: 'select', value: 'hereWeGo', options: [
    { value: 'none',                label: '— بدون صوت من المكتبة —' },
    { value: 'hereWeGo',            label: '🎙️ Here We Go (ملف صوتي حقيقي)' },
    { value: 'agreementClose',      label: '🤝 الاتفاق يقترب (ملف صوتي حقيقي)' },
    { value: 'thingsAreHappening',  label: '⚡ الأمور تحدث (TTS)' },
    { value: 'official',            label: '🏛️ رسمياً (TTS)' },
    { value: 'dealHeating',         label: '🔥 الصفقة تشتعل (TTS)' },
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
    name: 'ميركاتو — Deadline Day',
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
    name: 'ميركاتو — X-Ray تحليل اللاعب',
    type: OverlayType.MERCATO_X_RAY,
    isVisible: false,
    templateIcon: '🔬',
    templateAccent: '#a855f7',
    templateGroup: 'MERCATO_PACKAGE',
    templateDescription: 'تحليل بصري كامل للاعب — رادار chart + 6 قابليات بأشرطة + heat map للمناطق الأكثر نشاطاً + verdict نهائي.',
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
    name: 'استخبارات اللاعب V2',
    type: OverlayType.PLAYER_INTEL_V2,
    templateId: 'template-player-intel-v2',
    templateDescription: 'قالب بث احترافي يدمج بيانات FotMob و FBref في بطاقة تحليل لاعب متقدمة.',
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
      { id: 'cardType', label: 'نوع البطاقة (Preset)', type: 'select', value: 'attacker_card', options: [
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

// ─── MERCATO-TEMPLATES-X6 — 10 new mercato variants via factory ─────────────
//
// All 10 templates share:
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
    dataFields: [
      { id: 'callerName', label: 'اسم الوكيل', type: 'text', value: 'AGENT — JORGE MENDES' },
      { id: 'callerRole', label: 'الجهة', type: 'text', value: 'GESTIFUTE' },
      { id: 'callDuration', label: 'مدة المكالمة', type: 'text', value: '03:42' },
      { id: 'callStatus', label: 'حالة المكالمة', type: 'select', value: 'live', options: [
        { value: 'live', label: 'مباشرة' },
        { value: 'recorded', label: 'مسجّلة' },
        { value: 'private_source', label: 'مصدر خاص' },
      ] },
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

const _allTemplates: OverlayConfig[] = [
  ...INITIAL_TEMPLATE_DEFINITIONS,
  ...BARCELONA_ELECTION_TEMPLATES,
  ...FOOTBALL_BROADCAST_TEMPLATES,
  ...FOOTBALL_PROJECTION_TEMPLATES,
  ...TRANSFER_TARGETS_TEMPLATES,
  ...BREAKING_HERE_WE_GO_TEMPLATES,
  ...MERCATO_INNOVATIVE_TEMPLATES,
  ...MERCATO_X6_TEMPLATES,
  ...PLAYER_INTEL_V2_TEMPLATES,
];
const _seenIds = new Set<string>();
export const INITIAL_TEMPLATES: OverlayConfig[] = _allTemplates
  .filter(t => {
    if (_seenIds.has(t.id)) return false;
    _seenIds.add(t.id);
    return true;
  })
  .map(withBroadcastControls);
