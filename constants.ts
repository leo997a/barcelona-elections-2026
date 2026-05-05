
import { OverlayType, OverlayConfig, OverlayField } from './types';
import {
  createElectionCandidateProfileField,
  createElectionStatementFields,
  ELECTION_ENTITY_PRESETS,
  ELECTION_SOUND_OPTIONS,
} from './utils/election';

// Helper to add common fields
const commonFields: OverlayField[] = [
  { id: 'channelName', label: 'اسم القناة (الحقوق)', type: 'text', value: 'REO LIVE' },
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
    { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 1, step: 0.05 },
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

export const INITIAL_TEMPLATES: OverlayConfig[] = [
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
        options: ['CINEMATIC', 'PAGE_FLIP', 'NEWS_SLIDE', 'ZOOM_IMPACT', 'CUBE_ROTATE', 'GLITCH']
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
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 1, step: 0.1 }
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
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 1, step: 0.1 }
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
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 1, step: 0.1 }
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
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 1, step: 0.1 }
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
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 1, step: 0.1 }
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
      { id: 'soundVolume', label: 'مستوى الصوت', type: 'range', value: 0.7, min: 0, max: 1, step: 0.1 },
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
  ...BARCELONA_ELECTION_TEMPLATES
];
