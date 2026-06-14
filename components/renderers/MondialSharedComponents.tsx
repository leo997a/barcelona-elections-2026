/**
 * MondialSharedComponents.tsx
 * المكونات المشتركة لقوالب مونديال 2026 — Reo Show
 *
 * ثيمات + مكونات UI + أدوات مشتركة بين كل القوالب
 * متوافق 100% مع بنية المشروع الرئيسي
 */
import React from 'react';

// ─── ثيمات المونديال ─────────────────────────────────────────────────────────

export interface MondialTheme {
  bg: string;
  surface: string;
  surfaceLight: string;
  surfaceDeep: string;
  border: string;
  text: string;
  sub: string;
  dim: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  gold: string;
  success: string;
  warning: string;
  danger: string;
  // خاص بالعراق
  iraq1?: string;
  iraq2?: string;
}

export const MONDIAL_THEMES: Record<string, MondialTheme> = {
  // الثيم الرئيسي للمونديال — أمريكا + كأس العالم
  MUNDIAL_MAIN: {
    bg: 'radial-gradient(ellipse at 50% -20%, rgba(0, 79, 254, 0.45) 0%, rgba(8, 12, 32, 0.97) 60%, rgba(3, 5, 10, 1) 100%)',
    surface: 'rgba(8, 16, 40, 0.45)',
    surfaceLight: 'rgba(15, 30, 75, 0.65)',
    surfaceDeep: 'rgba(4, 8, 20, 0.85)',
    border: 'rgba(0, 79, 254, 0.25)',
    text: '#F4F6F9',
    sub: '#94A3C8',
    dim: '#4A5680',
    accent: '#FF2D55',     // Victory Red
    accentSoft: 'rgba(255, 45, 85, 0.12)',
    accent2: '#004FFE',    // Electric Blue
    gold: '#FFE600',       // Sunlight Yellow
    success: '#00FFA9',    // Shankarrao Green
    warning: '#FFA978',    // Rare Peach
    danger: '#FF2D55',
  },

  // ثيم الليل — مباريات المساء
  MUNDIAL_NIGHT: {
    bg: 'radial-gradient(ellipse at 30% 20%, rgba(157, 34, 251, 0.4) 0%, rgba(5, 5, 20, 0.98) 60%, rgba(0, 0, 0, 1) 100%)',
    surface: 'rgba(15, 8, 40, 0.45)',
    surfaceLight: 'rgba(30, 15, 70, 0.65)',
    surfaceDeep: 'rgba(5, 2, 20, 0.85)',
    border: 'rgba(157, 34, 251, 0.3)',
    text: '#EEE8FF',
    sub: '#9080C8',
    dim: '#504070',
    accent: '#9D22FB',     // Vibrant Purple
    accentSoft: 'rgba(157, 34, 251, 0.12)',
    accent2: '#00FFF0',    // Arena Cyan
    gold: '#FFE600',
    success: '#00FFA9',
    warning: '#FFA978',
    danger: '#FF2D55',
  },

  // ثيم الذهبي — الفائزون والنجوم
  MUNDIAL_GOLD: {
    bg: 'radial-gradient(ellipse at 60% 30%, rgba(120, 80, 0, 0.45) 0%, rgba(10, 8, 4, 0.98) 70%, rgba(0,0,0,1) 100%)',
    surface: 'rgba(40, 30, 5, 0.5)',
    surfaceLight: 'rgba(70, 55, 10, 0.7)',
    surfaceDeep: 'rgba(15, 10, 2, 0.9)',
    border: 'rgba(255, 230, 0, 0.35)',
    text: '#FFF8DC',
    sub: '#D4AA40',
    dim: '#7A6020',
    accent: '#FFE600',
    accentSoft: 'rgba(255, 230, 0, 0.10)',
    accent2: '#FFA978',
    gold: '#FFE600',
    success: '#00FFA9',
    warning: '#FFA978',
    danger: '#FF2D55',
  },

  // ثيم العراق 🇮🇶 — ألوان العلم العراقي
  IRAQ_PRIDE: {
    bg: 'radial-gradient(ellipse at 50% -20%, rgba(0, 122, 61, 0.4) 0%, rgba(5, 15, 8, 0.98) 65%, rgba(0, 0, 0, 1) 100%)',
    surface: 'rgba(0, 30, 12, 0.55)',
    surfaceLight: 'rgba(0, 45, 18, 0.7)',
    surfaceDeep: 'rgba(0, 10, 5, 0.88)',
    border: 'rgba(0, 122, 61, 0.35)',
    text: '#F0FFF4',
    sub: '#86EFAC',
    dim: '#166534',
    accent: '#00FFA9',
    accentSoft: 'rgba(0, 255, 169, 0.12)',
    accent2: '#FF2D55',
    gold: '#FFE600',
    success: '#00FFA9',
    warning: '#FFA978',
    danger: '#FF2D55',
    iraq1: '#007A3D',
    iraq2: '#C8102E',
  },

  // التحليل التكتيكي — نفس ثيم المشروع الرئيسي
  TACTICAL_DARK: {
    bg: 'radial-gradient(ellipse at 50% -20%, rgba(0, 255, 240, 0.3) 0%, rgba(6, 10, 20, 0.98) 65%, rgba(2, 4, 8, 1) 100%)',
    surface: 'rgba(10, 20, 38, 0.5)',
    surfaceLight: 'rgba(20, 35, 65, 0.7)',
    surfaceDeep: 'rgba(5, 10, 20, 0.9)',
    border: 'rgba(0, 255, 240, 0.3)',
    text: '#ffffff',
    sub: '#94a3b8',
    dim: '#475569',
    accent: '#00FFF0',
    accentSoft: 'rgba(0, 255, 240, 0.10)',
    accent2: '#9D22FB',
    gold: '#FFE600',
    success: '#00FFA9',
    warning: '#FFA978',
    danger: '#FF2D55',
  },

  // بث نظيف — مناسب للإحصائيات
  CLEAN_BROADCAST: {
    bg: 'linear-gradient(135deg, #060a13 0%, #0c1424 100%)',
    surface: 'rgba(15, 23, 42, 0.55)',
    surfaceLight: 'rgba(30, 41, 59, 0.7)',
    surfaceDeep: 'rgba(8, 12, 24, 0.9)',
    border: 'rgba(100, 116, 139, 0.3)',
    text: '#f1f5f9',
    sub: '#94a3b8',
    dim: '#64748b',
    accent: '#004FFE',
    accentSoft: 'rgba(0, 79, 254, 0.10)',
    accent2: '#00FFF0',
    gold: '#FFE600',
    success: '#00FFA9',
    warning: '#FFA978',
    danger: '#FF2D55',
  },
};

export const getMondialTheme = (id: string): MondialTheme =>
  MONDIAL_THEMES[id] || MONDIAL_THEMES.MUNDIAL_MAIN;

// ─── مساعدات ─────────────────────────────────────────────────────────────────

export const safeParse = <T,>(s: string, fallback: T): T => {
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/;
export const isRtl = (s: string): boolean => ARABIC_RE.test(s);

export const clamp = (v: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, v));

// ─── CSS المدمجة ─────────────────────────────────────────────────────────────

export const MONDIAL_KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap');

@keyframes mondialPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes mondialGlow {
  0%, 100% { box-shadow: 0 0 8px currentColor; }
  50% { box-shadow: 0 0 24px currentColor, 0 0 44px currentColor; }
}
@keyframes mondialWave {
  0%, 100% { transform: scaleY(0.2); }
  50% { transform: scaleY(1); }
}
@keyframes mondialSlideIn {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes mondialCountUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes goldShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes iraqWave {
  0% { transform: rotate(-1.5deg) scale(1); }
  50% { transform: rotate(1.5deg) scale(1.04); }
  100% { transform: rotate(-1.5deg) scale(1); }
}
`;

// ─── مكون: خلفية الاستاد المضيئة ─────────────────────────────────────────────

export const MondialStadiumBackground: React.FC<{
  accentColor?: string;
  accentColor2?: string;
}> = ({ accentColor = '#004FFE', accentColor2 = '#FF2D55' }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Stadium ambient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% -20%, ${accentColor}40 0%, rgba(8, 12, 28, 0.98) 65%, #03050a 100%)`,
        }}
      />
      {/* Pitch grass grid line texture */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Curved glowing neon arches */}
      <div
        className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[130%] h-[55%] rounded-[100%] opacity-25 filter blur-[45px]"
        style={{
          background: `radial-gradient(ellipse at center, ${accentColor} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -bottom-[15%] left-[-15%] w-[70%] h-[45%] rounded-full opacity-15 filter blur-[55px]"
        style={{
          background: `radial-gradient(circle, ${accentColor2} 0%, transparent 70%)`,
        }}
      />
      {/* Light spotlight beam effects */}
      <div
        className="absolute top-0 left-[22%] w-[1px] h-full opacity-15"
        style={{
          background: `linear-gradient(to bottom, ${accentColor}, transparent)`,
          transform: 'rotate(12deg)',
          transformOrigin: 'top',
        }}
      />
      <div
        className="absolute top-0 right-[22%] w-[1px] h-full opacity-15"
        style={{
          background: `linear-gradient(to bottom, ${accentColor}, transparent)`,
          transform: 'rotate(-12deg)',
          transformOrigin: 'top',
        }}
      />
    </div>
  );
};

// ─── مكون: Badge زر الحالة ────────────────────────────────────────────────────

export const MondialPill: React.FC<{
  t: MondialTheme;
  color?: string;
  label: string;
  pulse?: boolean;
  small?: boolean;
  gold?: boolean;
}> = ({ t, color, label, pulse, small, gold }) => {
  const c = gold ? t.gold : (color || t.accent);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wider ${small ? 'px-2.5 py-0.5 text-[9px]' : 'px-3.5 py-1 text-[10px]'}`}
      style={{
        background: `linear-gradient(135deg, ${c}15, ${c}28)`,
        color: c,
        border: `1px solid ${c}40`,
        boxShadow: `0 2px 8px ${c}12`,
        textShadow: `0 0 6px ${c}30`,
      }}
    >
      {pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: c, animation: 'mondialPulse 1.2s ease-in-out infinite, mondialGlow 1.2s ease-in-out infinite' }}
        />
      )}
      {label}
    </span>
  );
};

// ─── مكون: شريط التقدم ───────────────────────────────────────────────────────

export const MondialBar: React.FC<{
  t: MondialTheme;
  value: number;
  color?: string;
  height?: number;
  glow?: boolean;
}> = ({ t, value, color, height = 6, glow }) => {
  const c = color || t.accent;
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ background: `rgba(255,255,255,0.05)`, height }}
    >
      <div
        className="h-full rounded-full transition-all duration-750 ease-out"
        style={{
          width: `${clamp(value)}%`,
          background: `linear-gradient(90deg, ${c}88, ${c})`,
          boxShadow: glow ? `0 0 10px ${c}` : undefined,
        }}
      />
    </div>
  );
};

// ─── مكون: Header قالب ───────────────────────────────────────────────────────

export const MondialHeader: React.FC<{
  t: MondialTheme;
  eyebrow: string;
  title: string;
  subtitle?: string;
  pills?: React.ReactNode;
  rightSlot?: React.ReactNode;
  accent?: string;
}> = ({ t, eyebrow, title, subtitle, pills, rightSlot, accent }) => (
  <div
    className="rounded-2xl px-6 py-4 relative overflow-hidden"
    style={{
      background: 'rgba(6, 12, 30, 0.45)',
      backdropFilter: 'blur(16px)',
      border: `1px solid ${accent ? `${accent}40` : t.border}`,
      boxShadow: `inset 0 0 20px rgba(255, 255, 255, 0.02), 0 8px 32px rgba(0, 0, 0, 0.35)`,
    }}
  >
    {/* Decorative diagonal accent line */}
    <div
      className="absolute top-0 right-0 h-full w-48 opacity-10 pointer-events-none"
      style={{
        background: `linear-gradient(135deg, ${accent || t.accent} 0%, transparent 100%)`,
        clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0 100%)',
      }}
    />
    {/* شريط اللون العلوي */}
    <div
      className="absolute top-0 left-0 right-0 h-[3px]"
      style={{
        background: `linear-gradient(to right, transparent, ${accent || t.accent}, ${t.gold}, ${accent || t.accent}, transparent)`,
      }}
    />
    <div className="flex items-start justify-between gap-3 relative z-10">
      <div className="min-w-0 flex-1">
        <div
          className="text-[9.5px] font-black uppercase tracking-[0.35em] mb-1"
          style={{ color: accent || t.accent, textShadow: `0 0 10px ${accent || t.accent}30` }}
        >
          {eyebrow}
        </div>
        <div
          className="text-[23px] font-black leading-tight tracking-tight text-white"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-[11px] mt-1 font-medium" style={{ color: t.sub }}>
            {subtitle}
          </div>
        )}
        {pills && <div className="flex flex-wrap gap-1.5 mt-2.5">{pills}</div>}
      </div>
      {rightSlot && <div className="shrink-0 text-right">{rightSlot}</div>}
    </div>
  </div>
);

// ─── مكون: بطاقة بيانات ───────────────────────────────────────────────────────

export const MondialFieldCard: React.FC<{
  t: MondialTheme;
  label: string;
  value: string | number;
  accent?: string;
  large?: boolean;
  gold?: boolean;
}> = ({ t, label, value, accent, large, gold }) => {
  const c = gold ? t.gold : (accent || t.text);
  return (
    <div
      className="rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 0 12px rgba(255,255,255,0.01), 0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      <div
        className="text-[9.5px] font-black uppercase tracking-widest"
        style={{ color: t.sub }}
      >
        {label}
      </div>
      <div
        className={`font-black mt-1.5 ${large ? 'text-[30px]' : 'text-[19px]'}`}
        style={{
          color: c,
          animation: gold ? 'mondialCountUp 0.5s ease' : undefined,
          textShadow: `0 0 15px ${c}30`,
        }}
      >
        {value ?? '—'}
      </div>
    </div>
  );
};

// ─── مكون: علم الدولة والمساعدات ──────────────────────────────────────────────────

export const emojiToCountryCode = (emoji: string): string | null => {
  if (!emoji) return null;
  const chars = Array.from(emoji);
  if (chars.length < 2) return null;
  
  const codePoints = chars.map(c => c.codePointAt(0));
  const isRegionalIndicator = (cp?: number) => cp && cp >= 0x1F1E6 && cp <= 0x1F1FF;
  
  if (isRegionalIndicator(codePoints[0]) && isRegionalIndicator(codePoints[1])) {
    const firstLetter = String.fromCharCode(codePoints[0]! - 0x1F1E6 + 65);
    const secondLetter = String.fromCharCode(codePoints[1]! - 0x1F1E6 + 65);
    return (firstLetter + secondLetter).toLowerCase();
  }
  return null;
};

export const getFlagUrl = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  
  // 1. Check if it is a flag emoji
  const fromEmoji = emojiToCountryCode(trimmed);
  let code = fromEmoji || trimmed.toLowerCase();
  
  // Specific checks for England
  if (trimmed === '🏴󠁧󠁢󠁥󠁮󠁧󠁿' || code === 'eng' || code === 'gb-eng') {
    return 'https://flagcdn.com/w80/gb-eng.png';
  }

  // 2. Map common country names/codes
  const mapping: Record<string, string> = {
    // 3-letter codes
    'irq': 'iq', 'arg': 'ar', 'fra': 'fr', 'bra': 'br', 'ger': 'de',
    'esp': 'es', 'ptg': 'pt', 'por': 'pt', 'ned': 'nl', 'bel': 'be', 'ita': 'it', 'usa': 'us', 'custom-usa': 'us', 'mex': 'mx',
    'can': 'ca', 'jpn': 'jp', 'kor': 'kr', 'mar': 'ma', 'sen': 'sn', 'gha': 'gh', 'ngr': 'ng',
    'sau': 'sa', 'irn': 'ir', 'aus': 'au', 'uru': 'uy', 'col': 'co', 'chi': 'cl', 'ecu': 'ec',
    'sui': 'ch', 'den': 'dk', 'swe': 'se', 'nor': 'no', 'cro': 'hr', 'srb': 'rs', 'pol': 'pl',
    'cze': 'cz', 'tur': 'tr', 'ukr': 'ua', 'rus': 'ru',
    // Arabic names
    'العراق': 'iq', 'الأرجنتين': 'ar', 'فرنسا': 'fr', 'البرازيل': 'br', 'ألمانيا': 'de',
    'إنجلترا': 'gb-eng', 'إسبانيا': 'es', 'البرتغال': 'pt', 'هولندا': 'nl', 'بلجيكا': 'be',
    'إيطاليا': 'it', 'الولايات المتحدة': 'us', 'أمريكا': 'us', 'المكسيك': 'mx', 'كندا': 'ca', 'اليابان': 'jp',
    'كوريا الجنوبية': 'kr', 'المغرب': 'ma', 'السنغال': 'sn', 'غانا': 'gh', 'نيجيريا': 'ng',
    'السعودية': 'sa', 'إيران': 'ir', 'أستراليا': 'au', 'أوروغواي': 'uy', 'كولومبيا': 'co',
    'تشيلي': 'cl', 'الإكوادور': 'ec', 'سويسرا': 'ch', 'الدنمارك': 'dk', 'السويد': 'se',
    'النرويج': 'no', 'كرواتيا': 'hr', 'صربيا': 'rs', 'بولندا': 'pl', 'التشيك': 'cz',
    'تركيا': 'tr', 'أوكرانيا': 'ua', 'روسيا': 'ru',
    // English names
    'iraq': 'iq', 'argentina': 'ar', 'france': 'fr', 'brazil': 'br', 'germany': 'de',
    'spain': 'es', 'portugal': 'pt', 'netherlands': 'nl', 'belgium': 'be', 'italy': 'it',
    'mexico': 'mx', 'canada': 'ca', 'japan': 'jp', 'south korea': 'kr', 'morocco': 'ma',
    'senegal': 'sn', 'ghana': 'gh', 'nigeria': 'ng', 'saudi arabia': 'sa', 'iran': 'ir',
    'australia': 'au', 'uruguay': 'uy', 'colombia': 'co', 'switzerland': 'ch', 'norway': 'no'
  };

  code = mapping[code] || code;
  return `https://flagcdn.com/w80/${code}.png`;
};

export const MondialFlag: React.FC<{
  codeOrName: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ codeOrName, size = 24, className, style }) => {
  const [srcIndex, setSrcIndex] = React.useState(0);
  const trimmed = (codeOrName || '').trim();
  const fromEmoji = emojiToCountryCode(trimmed);
  const code = (fromEmoji || trimmed).toLowerCase();

  // Normalize England and other country codes
  const normCode = (code === 'eng' || code === 'gb-eng' || trimmed === '🏴󠁧󠁢󠁥󠁮󠁧󠁿') ? 'gb-eng' : code;

  const sources = React.useMemo(() => {
    if (!normCode) return [];
    return [
      `https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/1x1/${normCode}.svg`,
      `https://flagcdn.com/w80/${normCode}.png`
    ];
  }, [normCode]);

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setSrcIndex(-1); // Fallback to text
    }
  };

  const bgStyle = {
    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
  };

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/20 shadow-md ${className || ''}`}
      style={{
        width: size,
        height: size,
        ...bgStyle,
        ...style
      }}
    >
      {srcIndex !== -1 && sources[srcIndex] ? (
        <img
          src={sources[srcIndex]}
          alt={codeOrName}
          className="w-full h-full object-cover"
          onError={handleImgError}
        />
      ) : (
        <span
          className="font-black text-white"
          style={{
            fontSize: size * 0.35,
            fontFamily: "'Orbitron', 'Inter', sans-serif",
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}
        >
          {trimmed.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
};

const FLAG_EMOJIS: Record<string, string> = {
  'ARG': '🇦🇷', 'FRA': '🇫🇷', 'BRA': '🇧🇷', 'GER': '🇩🇪', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'ESP': '🇪🇸', 'POR': '🇵🇹', 'NED': '🇳🇱', 'BEL': '🇧🇪', 'ITA': '🇮🇹',
  'USA': '🇺🇸', 'MEX': '🇲🇽', 'CAN': '🇨🇦', 'JPN': '🇯🇵', 'KOR': '🇰🇷',
  'MAR': '🇲🇦', 'SEN': '🇸🇳', 'GHA': '🇬🇭', 'NGR': '🇳🇬',
  'IRQ': '🇮🇶', 'SAU': '🇸🇦', 'IRN': '🇮🇷', 'AUS': '🇦🇺',
  'URU': '🇺🇾', 'COL': '🇨🇴', 'CHI': '🇨🇱', 'ECU': '🇪🇨',
  'SUI': '🇨🇭', 'DEN': '🇩🇰', 'SWE': '🇸🇪', 'NOR': '🇳🇴',
  'CRO': '🇭🇷', 'SRB': '🇷🇸', 'POL': '🇵🇱', 'CZE': '🇨🇿',
  'TUR': '🇹🇷', 'UKR': '🇺🇦', 'RUS': '🇷🇺',
};

export const getFlag = (code: string): string =>
  FLAG_EMOJIS[code.toUpperCase()] || '🏳️';

// ─── مكون: مقارنة فريقين (شريط مزدوج) ──────────────────────────────────────

export const MondialDualBar: React.FC<{
  t: MondialTheme;
  label: string;
  homeVal: number;
  awayVal: number;
  homeColor: string;
  awayColor: string;
  showNumbers?: boolean;
  percentage?: boolean;
}> = ({ t, label, homeVal, awayVal, homeColor, awayColor, showNumbers = true, percentage }) => {
  const total = homeVal + awayVal;
  const homePct = total > 0 ? (homeVal / total) * 100 : 50;
  const awayPct = 100 - homePct;
  const fmt = (v: number) => percentage ? `${v}%` : String(v);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        {showNumbers && (
          <span className="text-[12px] font-black w-10 text-left" style={{ color: homeColor }}>
            {fmt(homeVal)}
          </span>
        )}
        <span className="text-[10px] font-bold flex-1 text-center" style={{ color: t.sub }}>
          {label}
        </span>
        {showNumbers && (
          <span className="text-[12px] font-black w-10 text-right" style={{ color: awayColor }}>
            {fmt(awayVal)}
          </span>
        )}
      </div>
      <div className="flex h-[5px] rounded-full overflow-hidden gap-0.5">
        <div
          className="rounded-full transition-all duration-700"
          style={{ width: `${homePct}%`, background: homeColor, boxShadow: `0 0 6px ${homeColor}` }}
        />
        <div
          className="rounded-full transition-all duration-700"
          style={{ width: `${awayPct}%`, background: awayColor, boxShadow: `0 0 6px ${awayColor}` }}
        />
      </div>
    </div>
  );
};

// ─── مكون: شعار الفريق ────────────────────────────────────────────────────────

export const MondialTeamLogo: React.FC<{
  t: MondialTheme;
  name: string;
  shortName?: string;
  logo?: string;
  size?: number;
  color?: string;
}> = ({ t, name, shortName, logo, size = 52, color }) => {
  const [srcIndex, setSrcIndex] = React.useState(0);
  const abbr = shortName || name.slice(0, 3).toUpperCase();
  
  const fromEmoji = emojiToCountryCode(name || shortName || '');
  const code = (fromEmoji || name || shortName || '').toLowerCase();
  const normCode = (code === 'eng' || code === 'gb-eng') ? 'gb-eng' : code;

  const sources = React.useMemo(() => {
    if (logo) return [logo];
    if (!normCode) return [];
    return [
      `https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/1x1/${normCode}.svg`,
      `https://flagcdn.com/w120/${normCode}.png`
    ];
  }, [logo, normCode]);

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setSrcIndex(-1); // Text fallback
    }
  };

  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: srcIndex === -1 ? `${color || t.accent}20` : `${color || t.border}`,
        border: `2px solid ${color || (srcIndex === -1 ? `${t.accent}50` : t.border)}`,
      }}
    >
      {srcIndex !== -1 && sources[srcIndex] ? (
        <img
          src={sources[srcIndex]}
          alt={name}
          className="w-full h-full object-cover p-0"
          onError={handleImgError}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-black"
          style={{
            color: color || t.text,
            fontSize: size * 0.3,
          }}
        >
          {abbr}
        </div>
      )}
    </div>
  );
};

// ─── مكون: Waveform للبث المباشر ─────────────────────────────────────────────

export const MondialWaveform: React.FC<{
  color: string;
  bars?: number;
  height?: number;
}> = ({ color, bars = 10, height = 16 }) => (
  <div className="flex items-end gap-[2px]" style={{ height }} aria-hidden>
    {Array.from({ length: bars }).map((_, i) => (
      <span
        key={i}
        style={{
          width: 2,
          height: '100%',
          background: color,
          borderRadius: 1,
          animation: `mondialWave 1.${(i % 9) + 1}s ease-in-out ${i * 0.08}s infinite`,
          transformOrigin: 'bottom',
        }}
      />
    ))}
  </div>
);

// ─── مكون: Trophy Icon ────────────────────────────────────────────────────────

export const TrophyIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#FFD700',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
);

// ─── مكون: Live Indicator ─────────────────────────────────────────────────────

export const MondialLiveBadge: React.FC<{
  t: MondialTheme;
  label?: string;
}> = ({ t, label = 'LIVE' }) => (
  <div
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
    style={{ background: `${t.danger}20`, border: `1px solid ${t.danger}60` }}
  >
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: t.danger, animation: 'mondialPulse 1s ease-in-out infinite' }}
    />
    <span className="text-[10px] font-black tracking-widest" style={{ color: t.danger }}>
      {label}
    </span>
  </div>
);

// ─── مكون: نجمة التقييم ───────────────────────────────────────────────────────

export const MondialRating: React.FC<{
  t: MondialTheme;
  value: number; // 0–10
  max?: number;
}> = ({ t, value, max = 10 }) => {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? t.gold : pct >= 60 ? t.success : pct >= 40 ? t.warning : t.danger;
  return (
    <div className="flex items-center gap-2">
      <div
        className="text-[28px] font-black leading-none"
        style={{ color, textShadow: `0 0 12px ${color}` }}
      >
        {value.toFixed(1)}
      </div>
      <div className="flex-1">
        <MondialBar t={t} value={pct} color={color} height={4} glow />
      </div>
    </div>
  );
};

// ─── نص: وضع البيانات ─────────────────────────────────────────────────────────

export const DATA_MODE_LABELS: Record<string, string> = {
  CLOUD_BRIDGE: '☁️ جسر REO السحابي',
  BRIDGE: '🔌 جسر محلي',
  PASTE_JSON: '📋 JSON يدوي',
  DEMO: '🎮 بيانات تجريبية',
};
