import React, { useEffect, useMemo } from 'react';
import { RendererProps } from './SharedComponents';

type MediaKind = 'image' | 'video' | 'none';

type VariantPreset = {
  id: string;
  eyebrow: string;
  accent: string;
  secondary: string;
  bg: string;
  layout: 'briefing' | 'map' | 'scanner' | 'airport' | 'voice' | 'dossier' | 'social' | 'medical' | 'vault' | 'warroom';
};

type MediaThemePreset = {
  accent: string;
  secondary: string;
  bg: string;
};

type StoryItem = {
  label: string;
  value: string;
  note?: string;
};

const VARIANTS: Record<string, VariantPreset> = {
  glass_briefing: {
    id: 'glass_briefing',
    eyebrow: 'غرفة زجاجية',
    accent: '#22d3ee',
    secondary: '#7c5cff',
    bg: 'linear-gradient(135deg, #06131f 0%, #101624 45%, #05080f 100%)',
    layout: 'briefing',
  },
  neon_negotiation_map: {
    id: 'neon_negotiation_map',
    eyebrow: 'خريطة المفاوضات',
    accent: '#21f6aa',
    secondary: '#38bdf8',
    bg: 'radial-gradient(circle at 25% 35%, #063b34 0%, #081421 45%, #05070d 100%)',
    layout: 'map',
  },
  contract_scanner: {
    id: 'contract_scanner',
    eyebrow: 'ماسح العقود',
    accent: '#fbbf24',
    secondary: '#fb7185',
    bg: 'linear-gradient(135deg, #1f1605 0%, #100b07 50%, #050505 100%)',
    layout: 'scanner',
  },
  airport_tracker: {
    id: 'airport_tracker',
    eyebrow: 'لوحة الوصول',
    accent: '#60a5fa',
    secondary: '#f97316',
    bg: 'linear-gradient(135deg, #07111f 0%, #071827 48%, #03060c 100%)',
    layout: 'airport',
  },
  agent_voice_room: {
    id: 'agent_voice_room',
    eyebrow: 'غرفة صوت المصدر',
    accent: '#ef4444',
    secondary: '#f59e0b',
    bg: 'radial-gradient(circle at 70% 30%, #351111 0%, #111827 50%, #050508 100%)',
    layout: 'voice',
  },
  deal_heist_board: {
    id: 'deal_heist_board',
    eyebrow: 'لوحة خطف الصفقة',
    accent: '#f43f5e',
    secondary: '#22c55e',
    bg: 'linear-gradient(135deg, #190811 0%, #111827 52%, #040406 100%)',
    layout: 'dossier',
  },
  social_storm: {
    id: 'social_storm',
    eyebrow: 'عاصفة السوشيال',
    accent: '#ec4899',
    secondary: '#22d3ee',
    bg: 'radial-gradient(circle at 50% 15%, #2a0f2d 0%, #101827 55%, #05060b 100%)',
    layout: 'social',
  },
  medical_greenlight: {
    id: 'medical_greenlight',
    eyebrow: 'الضوء الطبي الأخضر',
    accent: '#22c55e',
    secondary: '#a3e635',
    bg: 'radial-gradient(circle at 35% 45%, #052e16 0%, #07131f 50%, #030506 100%)',
    layout: 'medical',
  },
  club_vault: {
    id: 'club_vault',
    eyebrow: 'خزنة النادي',
    accent: '#c8aa63',
    secondary: '#38bdf8',
    bg: 'linear-gradient(135deg, #15110a 0%, #101827 54%, #030405 100%)',
    layout: 'vault',
  },
  deadline_war_room: {
    id: 'deadline_war_room',
    eyebrow: 'غرفة اليوم الأخير',
    accent: '#fb923c',
    secondary: '#ef4444',
    bg: 'radial-gradient(circle at 70% 30%, #3b1605 0%, #111827 50%, #050505 100%)',
    layout: 'warroom',
  },
};

const MEDIA_THEMES: Record<string, MediaThemePreset> = {
  studio_cyan: {
    accent: '#22d3ee',
    secondary: '#7c5cff',
    bg: 'linear-gradient(135deg, #06131f 0%, #101624 45%, #05080f 100%)',
  },
  royal_gold: {
    accent: '#d4af37',
    secondary: '#38bdf8',
    bg: 'linear-gradient(135deg, #171108 0%, #111827 55%, #040405 100%)',
  },
  deadline_orange: {
    accent: '#fb923c',
    secondary: '#ef4444',
    bg: 'radial-gradient(circle at 72% 28%, #3b1605 0%, #111827 52%, #050505 100%)',
  },
  medical_green: {
    accent: '#22c55e',
    secondary: '#a3e635',
    bg: 'radial-gradient(circle at 35% 45%, #052e16 0%, #07131f 50%, #030506 100%)',
  },
  source_red: {
    accent: '#ef4444',
    secondary: '#f59e0b',
    bg: 'radial-gradient(circle at 70% 30%, #351111 0%, #111827 50%, #050508 100%)',
  },
  violet_social: {
    accent: '#ec4899',
    secondary: '#22d3ee',
    bg: 'radial-gradient(circle at 50% 15%, #2a0f2d 0%, #101827 55%, #05060b 100%)',
  },
  midnight_blue: {
    accent: '#60a5fa',
    secondary: '#21f6aa',
    bg: 'linear-gradient(135deg, #07111f 0%, #071827 48%, #03060c 100%)',
  },
};

const DEFAULT_MEDIA = 'https://images.unsplash.com/photo-1522778119026-d647f0565c6a?auto=format&fit=crop&w=1800&q=90';

const getString = (getField: RendererProps['getField'], id: string, fallback = '') =>
  String(getField(id) ?? fallback);

const getNumber = (getField: RendererProps['getField'], id: string, fallback: number) => {
  const raw = Number(getField(id));
  return Number.isFinite(raw) ? raw : fallback;
};

const normalizeDirectUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) return '';
  if (/^[a-z]+:\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:')) return value;
  if (/^[a-z]:[\\/]/i.test(value)) return `file:///${value.replace(/\\/g, '/')}`;
  return value;
};

const detectMediaKind = (url: string, mode: string): MediaKind => {
  if (!url) return 'none';
  if (mode === 'image' || mode === 'video') return mode;
  if (/^data:image\//i.test(url)) return 'image';
  if (/^data:video\//i.test(url)) return 'video';
  if (/\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(url)) return 'image';
  if (/\.(mp4|webm|ogg|ogv|mov|m4v|m3u8)(\?|#|$)/i.test(url)) return 'video';
  return 'video';
};

const parseStoryItems = (raw: string): StoryItem[] => {
  const text = raw.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => ({
          label: String(item?.label || item?.title || ''),
          value: String(item?.value || item?.text || ''),
          note: item?.note ? String(item.note) : undefined,
        }))
        .filter(item => item.label || item.value);
    }
  } catch {
    // Semicolon fallback below.
  }
  return text
    .split(/[;\n]+/)
    .map((line, index) => {
      const [label, value, note] = line.split('|').map(part => part.trim());
      return { label: label || `نقطة ${index + 1}`, value: value || label || '', note };
    })
    .filter(item => item.value);
};

const useMusicBed = (
  visible: boolean,
  isEditor: boolean | undefined,
  soundEnabled: boolean,
  enabled: boolean,
  url: string,
  volume: number,
) => {
  useEffect(() => {
    if (isEditor || !visible || !soundEnabled || !enabled || !url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(0.45, volume));
    audio.preload = 'auto';
    const play = window.setTimeout(() => {
      void audio.play().catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(play);
      audio.pause();
      audio.src = '';
    };
  }, [visible, isEditor, soundEnabled, enabled, url, volume]);
};

const MediaStage: React.FC<{
  url: string;
  altUrl: string;
  mode: string;
  fit: string;
  muted: boolean;
  accent: string;
  overlayOpacity: number;
  blurPx: number;
  brightness: number;
}> = ({ url, altUrl, mode, fit, muted, accent, overlayOpacity, blurPx, brightness }) => {
  const src = normalizeDirectUrl(url || altUrl || DEFAULT_MEDIA);
  const kind = detectMediaKind(src, mode);
  const objectFit = fit === 'contain' ? 'contain' : 'cover';
  const mediaFilter = `brightness(${brightness})${blurPx > 0 ? ` blur(${blurPx}px)` : ''}`;
  const mediaTransform = blurPx > 0 ? 'scale(1.03)' : undefined;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {kind === 'image' ? (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit, objectPosition: 'center', filter: mediaFilter, transform: mediaTransform }}
          referrerPolicy="no-referrer"
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <video
          key={src}
          src={src}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit, objectPosition: 'center', filter: mediaFilter, transform: mediaTransform }}
          muted={muted}
          autoPlay
          playsInline
          loop
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(90deg, rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${Math.max(0.28, overlayOpacity - 0.34)}), rgba(0,0,0,.16)), radial-gradient(circle at 72% 30%, ${accent}44, transparent 42%)`,
      }} />
      <div className="absolute inset-0 opacity-[0.13]" style={{
        backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
      }} />
    </div>
  );
};

const Header: React.FC<{ preset: VariantPreset; headline: string; subline: string; source: string; panelOpacity: number }> = ({ preset, headline, subline, source, panelOpacity }) => (
  <div className="relative z-10 flex items-start justify-between gap-8">
    <div className="min-w-0">
      <div className="text-[13px] font-black" style={{ color: preset.accent }}>{preset.eyebrow}</div>
      <div className="mt-2 font-['Barlow_Condensed'] text-[72px] font-black uppercase leading-[0.86] text-white drop-shadow-[0_10px_24px_rgba(0,0,0,.55)]">
        {headline}
      </div>
      <div className="mt-3 max-w-3xl text-[19px] font-bold leading-snug text-white/72">{subline}</div>
    </div>
    <div className="shrink-0 border px-4 py-3 text-right" style={{ borderColor: `${preset.accent}66`, background: `rgba(5,8,13,${panelOpacity})` }}>
      <div className="text-[10px] font-black text-white/42">المصدر</div>
      <div className="mt-1 max-w-[260px] text-[15px] font-black uppercase text-white">{source}</div>
    </div>
  </div>
);

const Metric: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div className="border px-4 py-3" style={{ borderColor: `${accent}55`, background: 'rgba(255,255,255,.055)' }}>
    <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/42">{label}</div>
    <div className="mt-1 font-['Barlow_Condensed'] text-[34px] font-black uppercase leading-none" style={{ color: accent }}>{value}</div>
  </div>
);

const Waveform: React.FC<{ accent: string }> = ({ accent }) => (
  <div className="flex h-20 items-end gap-1.5">
    {Array.from({ length: 34 }).map((_, i) => (
      <span
        key={i}
        className="w-1.5 rounded-full"
        style={{
          height: `${28 + ((i * 17) % 62)}%`,
          background: i % 5 === 0 ? '#fff' : accent,
          animation: `mediaWave ${0.55 + (i % 7) * 0.06}s ease-in-out ${i * 0.025}s infinite alternate`,
        }}
      />
    ))}
  </div>
);

const ItemsList: React.FC<{ items: StoryItem[]; accent: string; numbered?: boolean }> = ({ items, accent, numbered }) => (
  <div className="space-y-2">
    {items.slice(0, 5).map((item, index) => (
      <div key={`${item.label}-${index}`} className="flex items-start gap-3 border px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,.12)', background: 'rgba(0,0,0,.28)' }}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black" style={{ background: `${accent}26`, color: accent }}>
          {numbered ? index + 1 : '•'}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/48">{item.label}</div>
          <div className="mt-0.5 text-[15px] font-bold leading-snug text-white">{item.value}</div>
          {item.note && <div className="mt-1 text-[11px] font-semibold text-white/48">{item.note}</div>}
        </div>
      </div>
    ))}
  </div>
);

const VariantBody: React.FC<{
  preset: VariantPreset;
  player: string;
  fromClub: string;
  toClub: string;
  value: string;
  confidence: number;
  status: string;
  timer: string;
  items: StoryItem[];
}> = ({ preset, player, fromClub, toClub, value, confidence, status, timer, items }) => {
  const c = preset.accent;
  const route = `${fromClub || 'النادي الأول'} ← ${toClub || 'النادي الثاني'}`;

  if (preset.layout === 'map') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_420px] gap-8">
        <div className="relative h-[330px] border" style={{ borderColor: `${c}66`, background: 'rgba(0,0,0,.42)' }}>
          <div className="absolute left-[12%] top-[48%] h-5 w-5 rounded-full" style={{ background: c, boxShadow: `0 0 36px ${c}` }} />
          <div className="absolute right-[12%] top-[28%] h-5 w-5 rounded-full" style={{ background: preset.secondary, boxShadow: `0 0 36px ${preset.secondary}` }} />
          <div className="absolute left-[15%] right-[15%] top-[40%] h-px rotate-[-8deg]" style={{ background: `linear-gradient(90deg, ${c}, ${preset.secondary})` }} />
          <div className="absolute bottom-6 left-8 font-['Barlow_Condensed'] text-5xl font-black uppercase text-white">{route}</div>
          <div className="absolute right-8 top-8 text-right">
            <div className="text-[11px] font-black text-white/42">نسبة الحسم</div>
            <div className="font-['Barlow_Condensed'] text-7xl font-black" style={{ color: c }}>{confidence}%</div>
          </div>
        </div>
        <ItemsList items={items} accent={c} numbered />
      </div>
    );
  }

  if (preset.layout === 'scanner') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[440px_1fr] gap-8">
        <div className="relative overflow-hidden border p-8" style={{ borderColor: `${c}77`, background: 'rgba(255,255,255,.88)', color: '#111827' }}>
          <div className="absolute inset-x-0 top-1/2 h-1 animate-[scanLine_2.2s_linear_infinite]" style={{ background: c, boxShadow: `0 0 26px ${c}` }} />
          <div className="text-[11px] font-black text-black/42">بند خاص</div>
          <div className="mt-6 font-['Barlow_Condensed'] text-6xl font-black uppercase leading-none">{player}</div>
          <div className="mt-5 h-px bg-black/20" />
          <div className="mt-5 text-[18px] font-black uppercase">{value}</div>
          <div className="mt-2 text-[14px] font-bold text-black/60">{status}</div>
        </div>
        <ItemsList items={items} accent={c} />
      </div>
    );
  }

  if (preset.layout === 'airport') {
    return (
      <div className="relative z-10 mt-auto border p-5" style={{ borderColor: `${c}66`, background: 'rgba(3,8,14,.76)' }}>
        <div className="grid grid-cols-[160px_1fr_1fr_180px] gap-3 border-b pb-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/42" style={{ borderColor: 'rgba(255,255,255,.12)' }}>
          <div>الوقت</div><div>من</div><div>إلى</div><div>الحالة</div>
        </div>
        {[['الآن', fromClub, toClub, status], ['التالي', player, value, `${confidence}%`], ['الأخير', 'فحص طبي', 'توقيع', timer]].map((row, index) => (
          <div key={index} className="grid grid-cols-[160px_1fr_1fr_180px] gap-3 py-4 font-['JetBrains_Mono'] text-[22px] font-black uppercase text-white" style={{ borderBottom: '1px solid rgba(255,255,255,.10)' }}>
            {row.map((cell, i) => <div key={i} style={{ color: i === 3 ? c : undefined }}>{cell}</div>)}
          </div>
        ))}
      </div>
    );
  }

  if (preset.layout === 'voice') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[360px_1fr] items-end gap-10">
        <div className="border p-6" style={{ borderColor: `${c}66`, background: 'rgba(0,0,0,.55)' }}>
          <div className="text-[11px] font-black text-white/42">خط التسجيل</div>
          <div className="mt-4 font-['Barlow_Condensed'] text-5xl font-black uppercase text-white">{status}</div>
          <div className="mt-6"><Waveform accent={c} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="اللاعب" value={player} accent={c} />
          <Metric label="الصفقة" value={value} accent={preset.secondary} />
          <Metric label="الثقة" value={`${confidence}%`} accent={c} />
        </div>
      </div>
    );
  }

  if (preset.layout === 'dossier' || preset.layout === 'social') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_380px] gap-6">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="الهدف" value={player} accent={c} />
          <Metric label="المسار" value={route} accent={preset.secondary} />
          <Metric label="القيمة" value={value} accent={c} />
          <Metric label="الإشارة" value={status} accent={preset.secondary} />
        </div>
        <ItemsList items={items} accent={c} numbered={preset.layout === 'social'} />
      </div>
    );
  }

  if (preset.layout === 'medical') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[360px_1fr] gap-8">
        <div className="relative flex aspect-square items-center justify-center rounded-full border" style={{ borderColor: `${c}77`, background: `${c}12`, boxShadow: `0 0 80px ${c}22 inset` }}>
          <div className="absolute inset-8 rounded-full border" style={{ borderColor: `${c}55` }} />
          <div className="text-center">
            <div className="font-['Barlow_Condensed'] text-7xl font-black" style={{ color: c }}>{confidence}%</div>
            <div className="text-[11px] font-black text-white/50">جاهزية</div>
          </div>
        </div>
        <ItemsList items={items} accent={c} numbered />
      </div>
    );
  }

  if (preset.layout === 'vault') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_320px] gap-6">
        <div className="grid grid-cols-3 gap-3">
          <Metric label="التقييم" value={value} accent={c} />
          <Metric label="المشتري" value={toClub} accent={preset.secondary} />
          <Metric label="البائع" value={fromClub} accent={c} />
        </div>
        <div className="border p-5 text-center" style={{ borderColor: `${c}66`, background: 'rgba(0,0,0,.48)' }}>
          <div className="text-[11px] font-black text-white/42">فتح الخزنة</div>
          <div className="mt-4 font-['Barlow_Condensed'] text-7xl font-black" style={{ color: c }}>{confidence}%</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full" style={{ width: `${confidence}%`, background: c }} /></div>
        </div>
      </div>
    );
  }

  if (preset.layout === 'warroom') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[300px_1fr] gap-6">
        <div className="border p-5 text-center" style={{ borderColor: `${c}77`, background: 'rgba(0,0,0,.58)' }}>
          <div className="text-[11px] font-black text-white/42">الساعة</div>
          <div className="mt-2 font-['Barlow_Condensed'] text-7xl font-black leading-none" style={{ color: c }}>{timer}</div>
          <div className="mt-3 text-[15px] font-bold uppercase text-white/62">{status}</div>
        </div>
        <ItemsList items={items} accent={c} numbered />
      </div>
    );
  }

  return (
    <div className="relative z-10 mt-auto grid grid-cols-[1fr_360px] gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="اللاعب" value={player} accent={c} />
        <Metric label="المسار" value={route} accent={preset.secondary} />
        <Metric label="الثقة" value={`${confidence}%`} accent={c} />
      </div>
      <ItemsList items={items} accent={c} />
    </div>
  );
};

const PremiumGlassCard: React.FC<{
  accent: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ accent, className = '', style, children }) => (
  <div
    className={`relative overflow-hidden border ${className}`}
    style={{
      borderColor: `${accent}55`,
      background: 'linear-gradient(135deg, rgba(255,255,255,.105), rgba(255,255,255,.035)), rgba(3,6,12,.54)',
      boxShadow: '0 18px 52px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.12)',
      ...style,
    }}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
    {children}
  </div>
);

const PremiumMetric: React.FC<{ label: string; value: string; accent: string; compact?: boolean }> = ({ label, value, accent, compact }) => (
  <PremiumGlassCard accent={accent} className={compact ? 'px-3 py-2.5' : 'px-4 py-3'}>
    <div className="text-[10px] font-black text-white/46">{label}</div>
    <div className={`mt-1 font-['Barlow_Condensed'] font-black uppercase leading-none ${compact ? 'text-[28px]' : 'text-[38px]'}`} style={{ color: accent }}>
      {value}
    </div>
    <div className="mt-3 h-1 overflow-hidden bg-white/10">
      <div className="h-full w-2/3" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </div>
  </PremiumGlassCard>
);

const PremiumConfidenceSeal: React.FC<{ confidence: number; accent: string; label?: string }> = ({ confidence, accent, label = 'درجة الثقة' }) => (
  <div className="relative flex h-[190px] w-[190px] shrink-0 items-center justify-center border" style={{ borderColor: `${accent}66`, background: 'rgba(0,0,0,.34)' }}>
    <div className="absolute inset-5 border" style={{ borderColor: `${accent}33` }} />
    <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: `${accent}55` }} />
    <div className="absolute bottom-0 top-0 left-1/2 w-px" style={{ background: `${accent}33` }} />
    <div className="relative text-center">
      <div className="font-['Barlow_Condensed'] text-[76px] font-black leading-none" style={{ color: accent }}>{confidence}%</div>
      <div className="mt-1 text-[11px] font-black text-white/48">{label}</div>
    </div>
  </div>
);

const PremiumWaveform: React.FC<{ accent: string; dense?: boolean }> = ({ accent, dense }) => (
  <div className={`flex items-end ${dense ? 'h-28 gap-1' : 'h-20 gap-1.5'}`}>
    {Array.from({ length: dense ? 52 : 34 }).map((_, i) => (
      <span
        key={i}
        className="w-1.5 rounded-full"
        style={{
          height: `${18 + ((i * 19) % 76)}%`,
          background: i % 6 === 0 ? '#fff' : i % 4 === 0 ? `${accent}99` : accent,
          animation: `mediaWave ${0.52 + (i % 7) * 0.055}s ease-in-out ${i * 0.018}s infinite alternate`,
        }}
      />
    ))}
  </div>
);

const PremiumItemsList: React.FC<{ items: StoryItem[]; accent: string; numbered?: boolean }> = ({ items, accent, numbered }) => (
  <div className="space-y-3">
    {items.slice(0, 4).map((item, index) => (
      <div
        key={`${item.label}-${index}`}
        className="relative flex items-start gap-3 overflow-hidden border px-3 py-2.5"
        style={{
          borderColor: `${accent}33`,
          background: 'linear-gradient(90deg, rgba(255,255,255,.09), rgba(0,0,0,.18))',
        }}
      >
        <div className="absolute inset-y-0 right-0 w-1" style={{ background: accent }} />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border text-[11px] font-black" style={{ borderColor: `${accent}55`, color: accent }}>
          {numbered ? String(index + 1).padStart(2, '0') : '•'}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black text-white/48">{item.label}</div>
          <div className="mt-0.5 text-[15px] font-bold leading-snug text-white">{item.value}</div>
          {item.note && <div className="mt-1 text-[11px] font-semibold text-white/48">{item.note}</div>}
        </div>
      </div>
    ))}
  </div>
);

const PremiumRouteSpine: React.FC<{ fromClub: string; toClub: string; accent: string; secondary: string }> = ({ fromClub, toClub, accent, secondary }) => (
  <div className="grid grid-cols-[1fr_180px_1fr] items-center gap-4">
    <PremiumGlassCard accent={accent} className="px-4 py-4 text-center">
      <div className="text-[10px] font-black text-white/42">نقطة البداية</div>
      <div className="mt-1 font-['Barlow_Condensed'] text-4xl font-black uppercase text-white">{fromClub}</div>
    </PremiumGlassCard>
    <div className="relative h-14">
      <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: `linear-gradient(90deg, ${accent}, ${secondary})` }} />
      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center border bg-black/60 text-xl font-black" style={{ borderColor: `${secondary}88`, color: secondary }}>
        ←
      </div>
    </div>
    <PremiumGlassCard accent={secondary} className="px-4 py-4 text-center">
      <div className="text-[10px] font-black text-white/42">الوجهة</div>
      <div className="mt-1 font-['Barlow_Condensed'] text-4xl font-black uppercase text-white">{toClub}</div>
    </PremiumGlassCard>
  </div>
);

const PremiumVariantBody: React.FC<{
  preset: VariantPreset;
  player: string;
  fromClub: string;
  toClub: string;
  value: string;
  confidence: number;
  status: string;
  timer: string;
  items: StoryItem[];
}> = ({ preset, player, fromClub, toClub, value, confidence, status, timer, items }) => {
  const c = preset.accent;
  const route = `${fromClub || 'النادي الأول'} ← ${toClub || 'النادي الثاني'}`;

  if (preset.layout === 'map') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_390px] gap-7">
        <PremiumGlassCard accent={c} className="relative h-[340px] p-7">
          <div className="absolute inset-6 opacity-35" style={{ backgroundImage: `linear-gradient(${c}24 1px, transparent 1px), linear-gradient(90deg, ${preset.secondary}20 1px, transparent 1px)`, backgroundSize: '54px 54px' }} />
          {[
            ['12%', '62%', c, 'مصدر أول'],
            ['42%', '34%', preset.secondary, 'اتصال النادي'],
            ['72%', '52%', c, 'عرض مشروط'],
            ['86%', '24%', preset.secondary, 'قرار نهائي'],
          ].map(([left, top, color, label], index) => (
            <div key={index} className="absolute" style={{ left, top }}>
              <div className="h-4 w-4 border bg-black" style={{ borderColor: color as string, boxShadow: `0 0 24px ${color}` }} />
              <div className="mt-2 whitespace-nowrap text-[10px] font-black text-white/58">{label}</div>
            </div>
          ))}
          <div className="absolute left-[14%] right-[14%] top-[48%] h-px -rotate-6" style={{ background: `linear-gradient(90deg, ${c}, ${preset.secondary})` }} />
          <div className="absolute bottom-7 right-7 left-7">
            <PremiumRouteSpine fromClub={fromClub} toClub={toClub} accent={c} secondary={preset.secondary} />
          </div>
          <div className="absolute left-7 top-7 text-left">
            <div className="text-[11px] font-black text-white/42">مؤشر الحسم</div>
            <div className="font-['Barlow_Condensed'] text-7xl font-black leading-none" style={{ color: c }}>{confidence}%</div>
          </div>
        </PremiumGlassCard>
        <PremiumItemsList items={items} accent={c} numbered />
      </div>
    );
  }

  if (preset.layout === 'scanner') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[470px_1fr] gap-8">
        <div className="relative overflow-hidden border p-8" style={{ borderColor: `${c}88`, background: 'linear-gradient(135deg, rgba(255,255,255,.94), rgba(231,224,207,.86))', color: '#111827' }}>
          <div className="absolute inset-x-0 top-1/2 h-1 animate-[scanLine_2.2s_linear_infinite]" style={{ background: c, boxShadow: `0 0 26px ${c}` }} />
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-black text-black/45">ملف قانوني مشفّر</div>
            <div className="border px-3 py-1 text-[10px] font-black" style={{ borderColor: `${c}99`, color: '#111827' }}>قيد الفحص</div>
          </div>
          <div className="mt-7 font-['Barlow_Condensed'] text-7xl font-black uppercase leading-none">{player}</div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="border border-black/15 p-3">
              <div className="text-[10px] font-black text-black/45">قيمة البند</div>
              <div className="mt-1 text-xl font-black">{value}</div>
            </div>
            <div className="border border-black/15 p-3">
              <div className="text-[10px] font-black text-black/45">الحالة</div>
              <div className="mt-1 text-xl font-black">{status}</div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {[confidence, Math.max(18, confidence - 22), Math.min(96, confidence + 11)].map((width, index) => (
              <div key={index} className="h-2 bg-black/12">
                <div className="h-full" style={{ width: `${width}%`, background: index === 1 ? '#111827' : c }} />
              </div>
            ))}
          </div>
        </div>
        <PremiumItemsList items={items} accent={c} />
      </div>
    );
  }

  if (preset.layout === 'airport') {
    const rows = [
      ['الآن', fromClub, toClub, status],
      ['التالي', player, value, `${confidence}%`],
      ['الأخير', 'فحص طبي', 'توقيع', timer],
    ];
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_260px] gap-6">
        <PremiumGlassCard accent={c} className="p-5">
          <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(255,255,255,.12)' }}>
            <div className="font-['Barlow_Condensed'] text-4xl font-black text-white">بيان المسار الخاص</div>
            <div className="text-[12px] font-black" style={{ color: c }}>{timer}</div>
          </div>
          <div className="grid grid-cols-[130px_1fr_1fr_170px] gap-3 text-[11px] font-black text-white/42">
            <div>الوقت</div><div>من</div><div>إلى</div><div>الحالة</div>
          </div>
          {rows.map((row, index) => (
            <div key={index} className="mt-3 grid grid-cols-[130px_1fr_1fr_170px] gap-3 border px-3 py-3 font-['JetBrains_Mono'] text-[20px] font-black uppercase text-white" style={{ borderColor: 'rgba(255,255,255,.11)', background: index === 0 ? `${c}14` : 'rgba(0,0,0,.26)' }}>
              {row.map((cell, i) => <div key={i} style={{ color: i === 3 ? c : undefined }}>{cell}</div>)}
            </div>
          ))}
        </PremiumGlassCard>
        <PremiumConfidenceSeal confidence={confidence} accent={c} label="جاهزية الوصول" />
      </div>
    );
  }

  if (preset.layout === 'voice') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[420px_1fr] items-end gap-8">
        <PremiumGlassCard accent={c} className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black text-white/42">اتصال مشفّر</div>
            <div className="h-2 w-2 animate-pulse" style={{ background: c }} />
          </div>
          <div className="mt-4 font-['Barlow_Condensed'] text-6xl font-black uppercase text-white">{status}</div>
          <div className="mt-6"><PremiumWaveform accent={c} dense /></div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] font-bold text-white/58">
            <div className="border p-2" style={{ borderColor: `${c}33` }}>المصدر: {fromClub}</div>
            <div className="border p-2" style={{ borderColor: `${c}33` }}>الوجهة: {toClub}</div>
          </div>
        </PremiumGlassCard>
        <div className="grid grid-cols-3 gap-3">
          <PremiumMetric label="اللاعب" value={player} accent={c} />
          <PremiumMetric label="قيمة الملف" value={value} accent={preset.secondary} />
          <PremiumMetric label="الثقة" value={`${confidence}%`} accent={c} />
        </div>
      </div>
    );
  }

  if (preset.layout === 'dossier') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_380px] gap-6">
        <PremiumGlassCard accent={c} className="relative min-h-[300px] p-6">
          <div className="absolute inset-6 opacity-30" style={{ backgroundImage: `linear-gradient(135deg, transparent 0 48%, ${c}55 49% 51%, transparent 52% 100%)`, backgroundSize: '120px 120px' }} />
          <div className="relative grid grid-cols-2 gap-4">
            <PremiumMetric label="الهدف" value={player} accent={c} />
            <PremiumMetric label="المسار" value={route} accent={preset.secondary} />
            <PremiumMetric label="القيمة" value={value} accent={c} />
            <PremiumMetric label="الإشارة" value={status} accent={preset.secondary} />
          </div>
          <div className="relative mt-5 border px-4 py-3 text-[13px] font-bold text-white/70" style={{ borderColor: `${c}44` }}>
            لوحة تحقيق مخصصة للروايات المعقدة: منافس جديد، وكيل يتحرك، أو عرض يدخل من الباب الخلفي.
          </div>
        </PremiumGlassCard>
        <PremiumItemsList items={items} accent={c} numbered />
      </div>
    );
  }

  if (preset.layout === 'social') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[360px_1fr] gap-7">
        <PremiumGlassCard accent={c} className="p-5">
          <div className="text-[11px] font-black text-white/42">نبض الجمهور</div>
          <div className="mt-2 font-['Barlow_Condensed'] text-7xl font-black leading-none" style={{ color: c }}>#{Math.max(1, Math.round(confidence / 10))}</div>
          <div className="mt-4 space-y-2">
            {['تفاعل مرتفع', 'مصدر يحتاج تحقق', 'موجة قابلة للتهدئة'].map((label, index) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-2 flex-1 bg-white/10"><div className="h-full" style={{ width: `${Math.max(24, confidence - index * 18)}%`, background: index === 1 ? preset.secondary : c }} /></div>
                <div className="w-28 text-[11px] font-black text-white/50">{label}</div>
              </div>
            ))}
          </div>
        </PremiumGlassCard>
        <div className="grid grid-cols-2 gap-3">
          <PremiumMetric label="اللاعب" value={player} accent={c} compact />
          <PremiumMetric label="الملف" value={value} accent={preset.secondary} compact />
          <div className="col-span-2">
            <PremiumItemsList items={items} accent={c} numbered />
          </div>
        </div>
      </div>
    );
  }

  if (preset.layout === 'medical') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[330px_1fr] gap-8">
        <PremiumGlassCard accent={c} className="p-6 text-center">
          <div className="mx-auto grid h-48 w-48 place-items-center border" style={{ borderColor: `${c}66`, background: `${c}10` }}>
            <div>
              <div className="font-['Barlow_Condensed'] text-7xl font-black" style={{ color: c }}>{confidence}%</div>
              <div className="text-[11px] font-black text-white/50">مؤشر الجاهزية</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] font-black text-white/52">
            <div className="border py-2" style={{ borderColor: `${c}33` }}>صورة</div>
            <div className="border py-2" style={{ borderColor: `${c}33` }}>فحص</div>
            <div className="border py-2" style={{ borderColor: `${c}33` }}>توقيع</div>
          </div>
        </PremiumGlassCard>
        <PremiumItemsList items={items} accent={c} numbered />
      </div>
    );
  }

  if (preset.layout === 'vault') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_300px] gap-6">
        <PremiumGlassCard accent={c} className="p-6">
          <div className="grid grid-cols-3 gap-3">
            <PremiumMetric label="التقييم" value={value} accent={c} />
            <PremiumMetric label="المشتري" value={toClub} accent={preset.secondary} />
            <PremiumMetric label="البائع" value={fromClub} accent={c} />
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[confidence, 72, 54, 38].map((height, index) => (
              <div key={index} className="flex h-24 items-end bg-white/8">
                <div className="w-full" style={{ height: `${height}%`, background: index % 2 ? preset.secondary : c }} />
              </div>
            ))}
          </div>
        </PremiumGlassCard>
        <PremiumConfidenceSeal confidence={confidence} accent={c} label="فتح الخزنة" />
      </div>
    );
  }

  if (preset.layout === 'warroom') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[280px_1fr] gap-6">
        <PremiumGlassCard accent={c} className="p-5 text-center">
          <div className="text-[11px] font-black text-white/42">ساعة الإغلاق</div>
          <div className="mt-2 font-['Barlow_Condensed'] text-7xl font-black leading-none" style={{ color: c }}>{timer}</div>
          <div className="mt-3 text-[15px] font-bold uppercase text-white/62">{status}</div>
          <div className="mt-5 h-2 bg-white/10"><div className="h-full" style={{ width: `${confidence}%`, background: c }} /></div>
        </PremiumGlassCard>
        <div className="grid grid-cols-[1fr_360px] gap-4">
          <div className="grid grid-cols-2 gap-3">
            <PremiumMetric label="اللاعب" value={player} accent={c} compact />
            <PremiumMetric label="المسار" value={route} accent={preset.secondary} compact />
            <PremiumMetric label="القيمة" value={value} accent={c} compact />
            <PremiumMetric label="الثقة" value={`${confidence}%`} accent={preset.secondary} compact />
          </div>
          <PremiumItemsList items={items} accent={c} numbered />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mt-auto grid grid-cols-[1fr_360px] gap-6">
      <div className="space-y-5">
        <PremiumRouteSpine fromClub={fromClub} toClub={toClub} accent={c} secondary={preset.secondary} />
        <div className="grid grid-cols-3 gap-3">
          <PremiumMetric label="اللاعب" value={player} accent={c} />
          <PremiumMetric label="القيمة" value={value} accent={preset.secondary} />
          <PremiumMetric label="الثقة" value={`${confidence}%`} accent={c} />
        </div>
      </div>
      <PremiumItemsList items={items} accent={c} />
    </div>
  );
};

export const MercatoMediaStoryRenderer: React.FC<RendererProps> = ({
  config,
  getField,
  containerStyle,
  contentWrapperStyle,
  isEditor,
}) => {
  const variant = getString(getField, 'mercatoMediaVariant', 'glass_briefing');
  const basePreset = VARIANTS[variant] || VARIANTS.glass_briefing;
  const mediaTheme = getString(getField, 'mediaTheme', '');
  const theme = MEDIA_THEMES[mediaTheme] || {
    accent: basePreset.accent,
    secondary: basePreset.secondary,
    bg: basePreset.bg,
  };
  const preset = { ...basePreset, accent: theme.accent, secondary: theme.secondary, bg: theme.bg };
  const headline = getString(getField, 'headline', 'الميركاتو مباشر');
  const subline = getString(getField, 'subline', 'قصة سوق انتقالات سينمائية بميديا حقيقية وموسيقى مناسبة للبث.');
  const source = getString(getField, 'sourceLabel', 'مكتب الميركاتو');
  const player = getString(getField, 'playerName', 'لاعب مستهدف');
  const fromClub = getString(getField, 'fromClub', 'النادي البائع');
  const toClub = getString(getField, 'toClub', 'النادي المهتم');
  const value = getString(getField, 'dealValue', 'قيمة قيد التفاوض');
  const status = getString(getField, 'dealStatus', 'تفاوض مباشر');
  const timer = getString(getField, 'timerLabel', '00:14:26');
  const confidence = Math.max(0, Math.min(100, getNumber(getField, 'confidencePct', 76)));
  const mediaUrl = getString(getField, 'mediaUrl', '');
  const mediaAltUrl = getString(getField, 'mediaAltUrl', '');
  const mediaMode = getString(getField, 'mediaMode', 'auto');
  const mediaFit = getString(getField, 'mediaFit', 'cover');
  const mediaMuted = getField('mediaMuted') !== false;
  const mediaOverlayOpacity = Math.max(0.2, Math.min(0.92, getNumber(getField, 'mediaOverlayOpacity', 0.62)));
  const mediaBlurPx = Math.max(0, Math.min(14, getNumber(getField, 'mediaBlurPx', 0)));
  const mediaBrightness = Math.max(0.45, Math.min(1.35, getNumber(getField, 'mediaBrightness', 0.86)));
  const panelOpacity = Math.max(0.25, Math.min(0.92, getNumber(getField, 'panelOpacity', 0.58)));
  const textScale = Math.max(0.82, Math.min(1.16, getNumber(getField, 'textScale', 1)));
  const soundEnabled = getField('soundEnabled') !== false;
  const musicEnabled = getField('musicEnabled') !== false;
  const musicTrackUrl = normalizeDirectUrl(getString(getField, 'musicTrackUrl', ''));
  const musicVolume = getNumber(getField, 'musicVolume', 0.16);
  const storyItems = useMemo(() => parseStoryItems(getString(getField, 'storyItems', '')), [getField]);

  useMusicBed(config.isVisible, isEditor, soundEnabled, musicEnabled, musicTrackUrl, musicVolume);

  const items = storyItems.length > 0 ? storyItems : [
    { label: 'المصدر', value: 'أدخل مصدرًا موثوقًا أو اتركها كنقطة مراجعة' },
    { label: 'الخطوة التالية', value: 'الفحص الطبي أو الأوراق النهائية حسب القصة' },
    { label: 'الخطر', value: 'تأكد من عدم نشر معلومة غير مؤكدة' },
  ];

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes mediaWave { from { transform: scaleY(.28); opacity: .55; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes scanLine { 0% { transform: translateY(-180px); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(180px); opacity: 0; } }
      `}</style>
      <div style={{ ...contentWrapperStyle, background: preset.bg, fontFamily: 'Tajawal, Barlow Condensed, sans-serif', direction: 'rtl' }} className="relative overflow-hidden">
        <MediaStage
          url={mediaUrl}
          altUrl={mediaAltUrl}
          mode={mediaMode}
          fit={mediaFit}
          muted={mediaMuted}
          accent={preset.accent}
          overlayOpacity={mediaOverlayOpacity}
          blurPx={mediaBlurPx}
          brightness={mediaBrightness}
        />
        <div className="relative z-10 flex h-full w-full flex-col p-9" style={{ transform: `scale(${textScale})`, transformOrigin: 'center center' }}>
          <Header preset={preset} headline={headline} subline={subline} source={source} panelOpacity={panelOpacity} />
          <PremiumVariantBody
            preset={preset}
            player={player}
            fromClub={fromClub}
            toClub={toClub}
            value={value}
            confidence={confidence}
            status={status}
            timer={timer}
            items={items}
          />
        </div>
        <div className="absolute bottom-5 left-9 z-20 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/38">
          <span className="h-2 w-2 rounded-full" style={{ background: musicEnabled ? preset.accent : 'rgba(255,255,255,.24)' }} />
          {musicEnabled ? 'موسيقى حقيقية' : 'الموسيقى متوقفة'}
        </div>
      </div>
    </div>
  );
};

export default MercatoMediaStoryRenderer;
