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

type StoryItem = {
  label: string;
  value: string;
  note?: string;
};

const VARIANTS: Record<string, VariantPreset> = {
  glass_briefing: {
    id: 'glass_briefing',
    eyebrow: 'REO GLASS BRIEFING',
    accent: '#22d3ee',
    secondary: '#7c5cff',
    bg: 'linear-gradient(135deg, #06131f 0%, #101624 45%, #05080f 100%)',
    layout: 'briefing',
  },
  neon_negotiation_map: {
    id: 'neon_negotiation_map',
    eyebrow: 'NEGOTIATION MAP',
    accent: '#21f6aa',
    secondary: '#38bdf8',
    bg: 'radial-gradient(circle at 25% 35%, #063b34 0%, #081421 45%, #05070d 100%)',
    layout: 'map',
  },
  contract_scanner: {
    id: 'contract_scanner',
    eyebrow: 'CONTRACT SCANNER',
    accent: '#fbbf24',
    secondary: '#fb7185',
    bg: 'linear-gradient(135deg, #1f1605 0%, #100b07 50%, #050505 100%)',
    layout: 'scanner',
  },
  airport_tracker: {
    id: 'airport_tracker',
    eyebrow: 'TRANSFER FLIGHT BOARD',
    accent: '#60a5fa',
    secondary: '#f97316',
    bg: 'linear-gradient(135deg, #07111f 0%, #071827 48%, #03060c 100%)',
    layout: 'airport',
  },
  agent_voice_room: {
    id: 'agent_voice_room',
    eyebrow: 'SOURCE VOICE ROOM',
    accent: '#ef4444',
    secondary: '#f59e0b',
    bg: 'radial-gradient(circle at 70% 30%, #351111 0%, #111827 50%, #050508 100%)',
    layout: 'voice',
  },
  deal_heist_board: {
    id: 'deal_heist_board',
    eyebrow: 'DEAL HEIST BOARD',
    accent: '#f43f5e',
    secondary: '#22c55e',
    bg: 'linear-gradient(135deg, #190811 0%, #111827 52%, #040406 100%)',
    layout: 'dossier',
  },
  social_storm: {
    id: 'social_storm',
    eyebrow: 'SOCIAL STORM',
    accent: '#ec4899',
    secondary: '#22d3ee',
    bg: 'radial-gradient(circle at 50% 15%, #2a0f2d 0%, #101827 55%, #05060b 100%)',
    layout: 'social',
  },
  medical_greenlight: {
    id: 'medical_greenlight',
    eyebrow: 'MEDICAL GREENLIGHT',
    accent: '#22c55e',
    secondary: '#a3e635',
    bg: 'radial-gradient(circle at 35% 45%, #052e16 0%, #07131f 50%, #030506 100%)',
    layout: 'medical',
  },
  club_vault: {
    id: 'club_vault',
    eyebrow: 'CLUB VAULT',
    accent: '#c8aa63',
    secondary: '#38bdf8',
    bg: 'linear-gradient(135deg, #15110a 0%, #101827 54%, #030405 100%)',
    layout: 'vault',
  },
  deadline_war_room: {
    id: 'deadline_war_room',
    eyebrow: 'DEADLINE WAR ROOM',
    accent: '#fb923c',
    secondary: '#ef4444',
    bg: 'radial-gradient(circle at 70% 30%, #3b1605 0%, #111827 50%, #050505 100%)',
    layout: 'warroom',
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
      return { label: label || `Item ${index + 1}`, value: value || label || '', note };
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
}> = ({ url, altUrl, mode, fit, muted, accent }) => {
  const src = normalizeDirectUrl(url || altUrl || DEFAULT_MEDIA);
  const kind = detectMediaKind(src, mode);
  const objectFit = fit === 'contain' ? 'contain' : 'cover';

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {kind === 'image' ? (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit, objectPosition: 'center' }}
          referrerPolicy="no-referrer"
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <video
          key={src}
          src={src}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit, objectPosition: 'center' }}
          muted={muted}
          autoPlay
          playsInline
          loop
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(90deg, rgba(0,0,0,.92), rgba(0,0,0,.52), rgba(0,0,0,.16)), radial-gradient(circle at 72% 30%, ${accent}44, transparent 42%)`,
      }} />
      <div className="absolute inset-0 opacity-[0.13]" style={{
        backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
      }} />
    </div>
  );
};

const Header: React.FC<{ preset: VariantPreset; headline: string; subline: string; source: string }> = ({ preset, headline, subline, source }) => (
  <div className="relative z-10 flex items-start justify-between gap-8">
    <div className="min-w-0">
      <div className="text-[11px] font-black uppercase tracking-[0.42em]" style={{ color: preset.accent }}>{preset.eyebrow}</div>
      <div className="mt-2 font-['Barlow_Condensed'] text-[72px] font-black uppercase leading-[0.86] text-white drop-shadow-[0_10px_24px_rgba(0,0,0,.55)]">
        {headline}
      </div>
      <div className="mt-3 max-w-3xl text-[19px] font-bold leading-snug text-white/72">{subline}</div>
    </div>
    <div className="shrink-0 border px-4 py-3 text-right" style={{ borderColor: `${preset.accent}66`, background: 'rgba(5,8,13,.62)' }}>
      <div className="text-[10px] font-black uppercase tracking-[0.26em] text-white/42">source</div>
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
          {numbered ? index + 1 : '>'}
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
  const route = `${fromClub || 'Club A'} -> ${toClub || 'Club B'}`;

  if (preset.layout === 'map') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_420px] gap-8">
        <div className="relative h-[330px] border" style={{ borderColor: `${c}66`, background: 'rgba(0,0,0,.42)' }}>
          <div className="absolute left-[12%] top-[48%] h-5 w-5 rounded-full" style={{ background: c, boxShadow: `0 0 36px ${c}` }} />
          <div className="absolute right-[12%] top-[28%] h-5 w-5 rounded-full" style={{ background: preset.secondary, boxShadow: `0 0 36px ${preset.secondary}` }} />
          <div className="absolute left-[15%] right-[15%] top-[40%] h-px rotate-[-8deg]" style={{ background: `linear-gradient(90deg, ${c}, ${preset.secondary})` }} />
          <div className="absolute bottom-6 left-8 font-['Barlow_Condensed'] text-5xl font-black uppercase text-white">{route}</div>
          <div className="absolute right-8 top-8 text-right">
            <div className="text-[11px] font-black uppercase tracking-[0.32em] text-white/42">probability</div>
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
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-black/42">private clause</div>
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
          <div>time</div><div>from</div><div>to</div><div>status</div>
        </div>
        {[['NOW', fromClub, toClub, status], ['NEXT', player, value, `${confidence}%`], ['FINAL', 'medical', 'signature', timer]].map((row, index) => (
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
          <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/42">recording line</div>
          <div className="mt-4 font-['Barlow_Condensed'] text-5xl font-black uppercase text-white">{status}</div>
          <div className="mt-6"><Waveform accent={c} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="player" value={player} accent={c} />
          <Metric label="deal" value={value} accent={preset.secondary} />
          <Metric label="confidence" value={`${confidence}%`} accent={c} />
        </div>
      </div>
    );
  }

  if (preset.layout === 'dossier' || preset.layout === 'social') {
    return (
      <div className="relative z-10 mt-auto grid grid-cols-[1fr_380px] gap-6">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="target" value={player} accent={c} />
          <Metric label="route" value={route} accent={preset.secondary} />
          <Metric label="fee" value={value} accent={c} />
          <Metric label="signal" value={status} accent={preset.secondary} />
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
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/50">greenlight</div>
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
          <Metric label="valuation" value={value} accent={c} />
          <Metric label="buyer" value={toClub} accent={preset.secondary} />
          <Metric label="seller" value={fromClub} accent={c} />
        </div>
        <div className="border p-5 text-center" style={{ borderColor: `${c}66`, background: 'rgba(0,0,0,.48)' }}>
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/42">vault unlock</div>
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
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/42">clock</div>
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
        <Metric label="player" value={player} accent={c} />
        <Metric label="route" value={route} accent={preset.secondary} />
        <Metric label="confidence" value={`${confidence}%`} accent={c} />
      </div>
      <ItemsList items={items} accent={c} />
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
  const preset = VARIANTS[variant] || VARIANTS.glass_briefing;
  const headline = getString(getField, 'headline', 'MERCATO LIVE');
  const subline = getString(getField, 'subline', 'A cinematic market story with real media and music bed.');
  const source = getString(getField, 'sourceLabel', 'REO MERCATO DESK');
  const player = getString(getField, 'playerName', 'Target Player');
  const fromClub = getString(getField, 'fromClub', 'Selling Club');
  const toClub = getString(getField, 'toClub', 'Buying Club');
  const value = getString(getField, 'dealValue', 'EUR 58M');
  const status = getString(getField, 'dealStatus', 'LIVE NEGOTIATION');
  const timer = getString(getField, 'timerLabel', '00:14:26');
  const confidence = Math.max(0, Math.min(100, getNumber(getField, 'confidencePct', 76)));
  const mediaUrl = getString(getField, 'mediaUrl', '');
  const mediaAltUrl = getString(getField, 'mediaAltUrl', '');
  const mediaMode = getString(getField, 'mediaMode', 'auto');
  const mediaFit = getString(getField, 'mediaFit', 'cover');
  const mediaMuted = getField('mediaMuted') !== false;
  const soundEnabled = getField('soundEnabled') !== false;
  const musicEnabled = getField('musicEnabled') !== false;
  const musicTrackUrl = normalizeDirectUrl(getString(getField, 'musicTrackUrl', ''));
  const musicVolume = getNumber(getField, 'musicVolume', 0.16);
  const storyItems = useMemo(() => parseStoryItems(getString(getField, 'storyItems', '')), [getField]);

  useMusicBed(config.isVisible, isEditor, soundEnabled, musicEnabled, musicTrackUrl, musicVolume);

  const items = storyItems.length > 0 ? storyItems : [
    { label: 'Source', value: 'Two independent confirmations' },
    { label: 'Next step', value: 'Medical and final paperwork' },
    { label: 'Risk', value: 'A rival club is monitoring the file' },
  ];

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes mediaWave { from { transform: scaleY(.28); opacity: .55; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes scanLine { 0% { transform: translateY(-180px); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(180px); opacity: 0; } }
      `}</style>
      <div style={{ ...contentWrapperStyle, background: preset.bg, fontFamily: 'Tajawal, Barlow Condensed, sans-serif' }} className="relative overflow-hidden">
        <MediaStage
          url={mediaUrl}
          altUrl={mediaAltUrl}
          mode={mediaMode}
          fit={mediaFit}
          muted={mediaMuted}
          accent={preset.accent}
        />
        <div className="relative z-10 flex h-full w-full flex-col p-9">
          <Header preset={preset} headline={headline} subline={subline} source={source} />
          <VariantBody
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
          {musicEnabled ? 'real music bed' : 'music off'}
        </div>
      </div>
    </div>
  );
};

export default MercatoMediaStoryRenderer;
