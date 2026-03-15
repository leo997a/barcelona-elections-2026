
import { OverlayType, OverlayConfig, OverlayField } from './types';
import { ELECTION_SOUND_OPTIONS } from './utils/election';

// Helper to add common fields
const commonFields: OverlayField[] = [
  { id: 'channelName', label: 'اسم القناة (الحقوق)', type: 'text', value: 'REO LIVE' },
];

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
  headline = 'ط§ظ†طھط®ط§ط¨ط§طھ ط¨ط±ط´ظ„ظˆظ†ط© 2026',
  subheadline = 'طھط؛ط·ظٹط© ظ„ط­ط¸ظٹط© ظ…ط¨ط§ط´ط±ط© ظ„ط³ط¨ط§ظ‚ ط±ط¦ط§ط³ط© ظ†ط§ط¯ظٹ ط¨ط±ط´ظ„ظˆظ†ط©',
  statusBadge = 'LIVE',
  phaseLabel = 'Live count',
  sourceLabel = 'Barcelona Elections Center',
  specialText = 'ظ„ط§ط¨ظˆط±طھط§ ظٹط¤ظƒط¯ ط£ظ† ط§ظ„ط³ط¨ط§ظ‚ ظ…ط§ ط²ط§ظ„ ظ…ظپطھظˆط­ط§ظ‹ ظ…ط¹ ط§ط±طھظپط§ط¹ ظ…ط¹ط¯ظ„ ط§ظ„ظ…ط´ط§ط±ظƒط© ظپظٹ ط§ظ„ط³ط§ط¹ط§طھ ط§ظ„ط£ط®ظٹط±ط©.',
  statementAuthor = 'ط®ظˆط§ظ† ظ„ط§ط¨ظˆط±طھط§',
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
    { id: 'headline', label: 'ط§ظ„ط¹ظ†ظˆط§ظ† ط§ظ„ط±ط¦ظٹط³ظٹ', type: 'text', value: headline },
    { id: 'subheadline', label: 'ط§ظ„ط¹ظ†ظˆط§ظ† ط§ظ„طھظˆط¶ظٹط­ظٹ', type: 'text', value: subheadline },
    { id: 'watermarkText', label: 'ط§ظ„ط­ظ‚ظˆظ‚', type: 'text', value: 'REO SHOW' },
    { id: 'statusBadge', label: 'ط´ط§ط±ط© ط§ظ„ط­ط§ظ„ط©', type: 'text', value: statusBadge },
    { id: 'phaseLabel', label: 'ظ…ط±ط­ظ„ط© ط§ظ„طھط؛ط·ظٹط©', type: 'text', value: phaseLabel },
    { id: 'sourceLabel', label: 'ط§ظ„ظ…طµط¯ط±', type: 'text', value: sourceLabel },
    { id: 'lastUpdated', label: 'ط¢ط®ط± طھط­ط¯ظٹط«', type: 'text', value: 'Last update 20:45' },
    { id: 'designStyle', label: 'Style', type: 'hidden', value: designStyle },
    { id: 'themePreset', label: 'ط§ظ„ظ„ظˆظ† ط§ظ„ط£ط³ط§ط³ظٹ', type: 'select', value: themePreset, options: ['BARCA_RED', 'BARCA_BLUE', 'ROYAL_GOLD', 'DARK_MATTER'] },
    { id: 'barcaLogo', label: 'ط´ط¹ط§ط± ط¨ط±ط´ظ„ظˆظ†ط©', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png' },
    { id: 'scale', label: 'ط­ط¬ظ… ط§ظ„ظ‚ط§ظ„ط¨', type: 'range', value: scale, min: 0.5, max: 1.8, step: 0.05 },
    { id: 'positionY', label: 'ط¥ط²ط§ط­ط© ط¹ظ…ظˆط¯ظٹط© (Y)', type: 'range', value: positionY, min: -700, max: 700, step: 10 },
    { id: 'positionX', label: 'ط¥ط²ط§ط­ط© ط£ظپظ‚ظٹط© (X)', type: 'range', value: positionX, min: -1200, max: 1200, step: 10 },
    { id: 'currentVoters', label: 'ط¹ط¯ط¯ ط§ظ„ظ…طµظˆطھظٹظ† ط§ظ„ط­ط§ظ„ظٹ', type: 'number', value: 25000 },
    { id: 'totalVoters', label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†ط§ط®ط¨ظٹظ†', type: 'number', value: 114504 },
    { id: 'turnoutTitle', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط¥ظ‚ط¨ط§ظ„', type: 'text', value: 'ظ†ط³ط¨ط© ط§ظ„ظ…ط´ط§ط±ظƒط©' },
    { id: 'turnoutSubtitle', label: 'ط§ظ„ط¹ظ†ظˆط§ظ† ط§ظ„ظپط±ط¹ظٹ ظ„ظ„ط¥ظ‚ط¨ط§ظ„', type: 'text', value: 'ط¥ط¬ظ…ط§ظ„ظٹ ظ‡ظٹط¦ط© ط§ظ„طھطµظˆظٹطھ' },
    { id: 'currentVotersTitle', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ظ…طµظˆطھظٹظ† ط§ظ„ط­ط§ظ„ظٹظٹظ†', type: 'text', value: 'ط§ظ„ظ…طµظˆطھظˆظ† ط­طھظ‰ ط§ظ„ط¢ظ†' },
    { id: 'candidate1Name', label: 'ط§ط³ظ… ط§ظ„ظ…ط±ط´ط­ 1', type: 'text', value: 'ط®ظˆط§ظ† ظ„ط§ط¨ظˆط±طھط§' },
    { id: 'candidate1Image', label: 'طµظˆط±ط© ط§ظ„ظ…ط±ط´ط­ 1', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Joan_Laporta_2015_%28cropped%29.jpg/220px-Joan_Laporta_2015_%28cropped%29.jpg' },
    { id: 'candidate1Percent', label: 'ظ†ط³ط¨ط© ط§ظ„ظ…ط±ط´ط­ 1 (%)', type: 'range', value: 52, min: 0, max: 100, step: 0.1 },
    { id: 'candidate1Votes', label: 'ط£طµظˆط§طھ ط§ظ„ظ…ط±ط´ط­ 1', type: 'number', value: 48310 },
    { id: 'candidate1Delta', label: 'طھط؛ظٹط± ط§ظ„ظ…ط±ط´ط­ 1 (%)', type: 'number', value: 2.6 },
    { id: 'candidate1Tag', label: 'ظˆطµظپ ط§ظ„ظ…ط±ط´ط­ 1', type: 'text', value: 'Incumbent' },
    { id: 'candidate1Color', label: 'ظ„ظˆظ† ط§ظ„ظ…ط±ط´ط­ 1', type: 'color', value: '#a50044' },
    { id: 'candidate2Name', label: 'ط§ط³ظ… ط§ظ„ظ…ط±ط´ط­ 2', type: 'text', value: 'ظپظٹظƒطھظˆط± ظپظˆظ†طھ' },
    { id: 'candidate2Image', label: 'طµظˆط±ط© ط§ظ„ظ…ط±ط´ط­ 2', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/V%C3%ADctor_Font_Mante.jpg/220px-V%C3%ADctor_Font_Mante.jpg' },
    { id: 'candidate2Percent', label: 'ظ†ط³ط¨ط© ط§ظ„ظ…ط±ط´ط­ 2 (%)', type: 'range', value: 39, min: 0, max: 100, step: 0.1 },
    { id: 'candidate2Votes', label: 'ط£طµظˆط§طھ ط§ظ„ظ…ط±ط´ط­ 2', type: 'number', value: 36140 },
    { id: 'candidate2Delta', label: 'طھط؛ظٹط± ط§ظ„ظ…ط±ط´ط­ 2 (%)', type: 'number', value: -1.4 },
    { id: 'candidate2Tag', label: 'ظˆطµظپ ط§ظ„ظ…ط±ط´ط­ 2', type: 'text', value: 'Renewal project' },
    { id: 'candidate2Color', label: 'ظ„ظˆظ† ط§ظ„ظ…ط±ط´ط­ 2', type: 'color', value: '#004d98' },
    { id: 'showUndecided', label: 'ط¥ط¸ظ‡ط§ط± ط؛ظٹط± ط§ظ„ظ…ط­ط³ظˆظ…', type: 'boolean', value: true },
    { id: 'undecidedLabel', label: 'ط§ط³ظ… ط؛ظٹط± ط§ظ„ظ…ط­ط³ظˆظ…', type: 'text', value: 'Other / Undecided' },
    { id: 'undecidedPercent', label: 'ظ†ط³ط¨ط© ط؛ظٹط± ط§ظ„ظ…ط­ط³ظˆظ… (%)', type: 'range', value: 9, min: 0, max: 100, step: 0.1 },
    { id: 'undecidedColor', label: 'ظ„ظˆظ† ط؛ظٹط± ط§ظ„ظ…ط­ط³ظˆظ…', type: 'color', value: '#94a3b8' },
    { id: 'targetDate', label: 'طھط§ط±ظٹط® ط§ظ„ظ†ظ‡ط§ظٹط© (YYYY-MM-DD HH:mm)', type: 'text', value: '2026-06-30 20:00' },
    { id: 'countdownTitle', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط¹ط¯ط§ط¯', type: 'text', value: 'Closing Countdown' },
    { id: 'countdownDays', label: 'ظ†طµ ط§ظ„ط£ظٹط§ظ…', type: 'text', value: 'Days' },
    { id: 'countdownHours', label: 'ظ†طµ ط§ظ„ط³ط§ط¹ط§طھ', type: 'text', value: 'Hours' },
    { id: 'countdownMinutes', label: 'ظ†طµ ط§ظ„ط¯ظ‚ط§ط¦ظ‚', type: 'text', value: 'Minutes' },
    { id: 'countdownSeconds', label: 'ظ†طµ ط§ظ„ط«ظˆط§ظ†ظٹ', type: 'text', value: 'Seconds' },
    { id: 'specialText', label: 'ظ†طµ ط§ظ„ظ…ط­طھظˆظ‰', type: 'textarea', value: specialText },
    { id: 'statementAuthor', label: 'طµط§ط­ط¨ ط§ظ„ط§ظ‚طھط¨ط§ط³', type: 'text', value: statementAuthor },
    { id: 'leaksTitle', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„طھط¯ظپظ‚ ط§ظ„ط¹ط§ط¬ظ„', type: 'text', value: 'Breaking' },
    { id: 'leaksSubtitle', label: 'ط¹ظ†ظˆط§ظ† ظپط±ط¹ظٹ', type: 'text', value: 'Election desk' },
    { id: 'leaksContent', label: 'ظ†طµ ط§ظ„ط®ط¨ط± ط§ظ„ط¹ط§ط¬ظ„', type: 'textarea', value: specialText },
    { id: 'statementTitle', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط§ظ‚طھط¨ط§ط³', type: 'text', value: 'Key Statement' },
    { id: 'soundEnabled', label: 'طھظپط¹ظٹظ„ ط§ظ„طµظˆطھ', type: 'boolean', value: true },
    { id: 'soundVolume', label: 'ظ…ط³طھظˆظ‰ ط§ظ„طµظˆطھ', type: 'range', value: 0.7, min: 0, max: 1, step: 0.05 },
    { id: 'soundInStyle', label: 'ظ…ط¤ط«ط± TAKE IN', type: 'select', value: soundInStyle, options: ELECTION_SOUND_OPTIONS },
    { id: 'soundOutStyle', label: 'ظ…ط¤ط«ط± TAKE OUT', type: 'select', value: soundOutStyle, options: ELECTION_SOUND_OPTIONS },
  ],
});

const BARCELONA_ELECTION_TEMPLATES: OverlayConfig[] = [
  createElectionTemplate({
    id: 'template-election-results-bar',
    name: 'ط¨ط±ط´ظ„ظˆظ†ط© 2026 - شريط النتائج',
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
    name: 'ط¨ط±ط´ظ„ظˆظ†ط© 2026 - بطاقة اقتباس',
    description: 'بطاقة اقتباس مدمجة بصورة المرشح ونص كبير مناسب للمداخلات والتصريحات.',
    icon: 'QTE',
    accent: '#38bdf8',
    designStyle: 'STATEMENT_FULL',
    headline: 'تصريحات انتخابات برشلونة 2026',
    subheadline: 'تصميم اقتباس مخصص للنصوص المهمة داخل البث المباشر',
    statusBadge: 'QUOTE',
    phaseLabel: 'Statement',
    specialText: 'هذه ليست ليلة أرقام فقط، بل لحظة تحديد اتجاه برشلونة لسنوات قادمة.',
    statementAuthor: 'ط®ظˆط§ظ† ظ„ط§ط¨ظˆط±طھط§',
    soundInStyle: 'QUOTE_SWEEP',
    soundOutStyle: 'SOFT_FADE',
  }),
  createElectionTemplate({
    id: 'template-election-versus-panel',
    name: 'ط¨ط±ط´ظ„ظˆظ†ط© 2026 - مواجهة المرشحين',
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
    name: 'ط¨ط±ط´ظ„ظˆظ†ط© 2026 - برج جانبي',
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
    name: 'ط¨ط±ط´ظ„ظˆظ†ط© 2026 - شريط الإقبال',
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
      { 
        id: 'scale', 
        label: 'حجم القالب', 
        type: 'range', 
        value: 1.3, // Larger default
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
      { id: 'homeName', label: 'الفريق المضيف', type: 'text', value: 'الهلال' },
      { id: 'awayName', label: 'الفريق الضيف', type: 'text', value: 'النصر' },
      { id: 'homeScore', label: 'نتائج المضيف', type: 'number', value: 2 },
      { id: 'awayScore', label: 'نتائج الضيف', type: 'number', value: 1 },
      { id: 'period', label: 'الشوط', type: 'text', value: 'الشوط الثاني' },
      { id: 'time', label: 'الوقت', type: 'text', value: '74:30' },
      { id: 'homeLogo', label: 'شعار المضيف', type: 'image', value: 'https://picsum.photos/200/200?random=1' },
      { id: 'awayLogo', label: 'شعار الضيف', type: 'image', value: 'https://picsum.photos/200/200?random=2' },
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
      { 
        id: 'scale', 
        label: 'حجم القالب', 
        type: 'range', 
        value: 1.2, 
        min: 0.5, 
        max: 3.0, 
        step: 0.1 
      },
      { id: 'headline', label: 'العنوان الرئيسي', type: 'text', value: 'عاجل' },
      { id: 'content', label: 'نص الخبر', type: 'text', value: 'انطلاق فعاليات البطولة اليوم بمشاركة واسعة...' },
      { id: 'scrollSpeed', label: 'سرعة التمرير', type: 'number', value: 10 },
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
      { 
        id: 'scale', 
        label: 'حجم القالب', 
        type: 'range', 
        value: 1.2, 
        min: 0.5, 
        max: 3.0, 
        step: 0.1 
      },
      { id: 'name', label: 'الاسم', type: 'text', value: 'أحمد محمد' },
      { id: 'role', label: 'المنصب', type: 'text', value: 'محلل رياضي' },
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
      { id: 'candidate1Name', label: 'اسم المرشح 1', type: 'text', value: 'خوان لابورتا' },
      { id: 'candidate1Image', label: 'صورة المرشح 1', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Joan_Laporta_2015_%28cropped%29.jpg/220px-Joan_Laporta_2015_%28cropped%29.jpg' },
      { id: 'candidate1Percent', label: 'نسبة المرشح 1 (%)', type: 'range', value: 52, min: 0, max: 100, step: 0.1 },
      { id: 'candidate1Votes', label: 'أصوات المرشح 1', type: 'number', value: 48310 },
      { id: 'candidate1Delta', label: 'تغير المرشح 1 (%)', type: 'number', value: 2.6 },
      { id: 'candidate1Tag', label: 'وصف المرشح 1', type: 'text', value: 'الإدارة الحالية' },
      { id: 'candidate1Color', label: 'لون المرشح 1', type: 'color', value: '#a50044' },

      // Candidate 2
      { id: 'candidate2Name', label: 'اسم المرشح 2', type: 'text', value: 'فيكتور فونت' },
      { id: 'candidate2Image', label: 'صورة المرشح 2', type: 'image', value: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/V%C3%ADctor_Font_Mante.jpg/220px-V%C3%ADctor_Font_Mante.jpg' },
      { id: 'candidate2Percent', label: 'نسبة المرشح 2 (%)', type: 'range', value: 39, min: 0, max: 100, step: 0.1 },
      { id: 'candidate2Votes', label: 'أصوات المرشح 2', type: 'number', value: 36140 },
      { id: 'candidate2Delta', label: 'تغير المرشح 2 (%)', type: 'number', value: -1.4 },
      { id: 'candidate2Tag', label: 'وصف المرشح 2', type: 'text', value: 'مشروع تجديد' },
      { id: 'candidate2Color', label: 'لون المرشح 2', type: 'color', value: '#004d98' },

      // Undecided / Residual bloc
      { id: 'showUndecided', label: 'إظهار غير المحسوم', type: 'boolean', value: true },
      { id: 'undecidedLabel', label: 'اسم غير المحسوم', type: 'text', value: 'أوراق أخرى / غير محسوم' },
      { id: 'undecidedPercent', label: 'نسبة غير المحسوم (%)', type: 'range', value: 9, min: 0, max: 100, step: 0.1 },
      { id: 'undecidedColor', label: 'لون غير المحسوم', type: 'color', value: '#6b7280' },

      // Countdown
      { id: 'targetDate', label: 'تاريخ النهاية (YYYY-MM-DD HH:mm)', type: 'text', value: '2026-06-30 20:00' },

      // Special Modules Content
      { id: 'specialText', label: 'نص (تسريبات/تصريح/ملاحظة)', type: 'textarea', value: 'تقدّم لابورتا في فرز الدفعة الأخيرة مع ارتفاع ملحوظ في المشاركة داخل برشلونة.' },
      { id: 'statementAuthor', label: 'صاحب التصريح', type: 'text', value: 'خوان لابورتا' },
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
  ...BARCELONA_ELECTION_TEMPLATES
];
