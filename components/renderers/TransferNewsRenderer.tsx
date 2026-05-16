import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BadgeEuro,
  Crosshair,
  Gauge,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { RendererProps } from './SharedComponents';
import { resolvePlayerIdentity } from '../../utils/playerIdentity';

type MarketItem = {
  player: string;
  from: string;
  to: string;
  value: string;
  confidence: number;
  status: string;
  tag?: string;
  image?: string;
};

type PlayerStat = {
  label: string;
  value: string;
  hint?: string;
};

const FALLBACK_CLUB_LOGOS: Record<string, string> = {
  barcelona: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png',
  'fc barcelona': 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Barcelona.png',
  athletic: 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png',
  'athletic club': 'https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/Athletic%20Club%20Bilbao.png',
};

const fallbackClubLogo = (name: string) => FALLBACK_CLUB_LOGOS[name.trim().toLowerCase()] || '';

const STAT_ICON_POOL: LucideIcon[] = [Activity, Crosshair, Gauge, TrendingUp, Zap, ShieldCheck];

const getStatIcon = (label: string, index: number): LucideIcon => {
  const key = label.toLowerCase();
  if (key.includes('goal') || key.includes('shot') || key.includes('xg')) return Crosshair;
  if (key.includes('assist') || key.includes('pass') || key.includes('chance') || key.includes('key')) return Activity;
  if (key.includes('dribble') || key.includes('carry') || key.includes('progress')) return Zap;
  if (key.includes('minute') || key.includes('match') || key.includes('start')) return ShieldCheck;
  if (key.includes('value') || key.includes('market') || key.includes('fee')) return BadgeEuro;
  if (key.includes('confidence') || key.includes('probability') || key.includes('rate')) return Gauge;
  return STAT_ICON_POOL[index % STAT_ICON_POOL.length];
};

const clampPercent = (value: unknown, fallback = 70) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
};

const splitFeed = (value: unknown, fallback: string[]) => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw
    .split(/\n|;/)
    .map(item => item.trim())
    .filter(Boolean);
};

const parseMarketItems = (value: unknown): MarketItem[] => {
  const fallback: MarketItem[] = [
    { player: 'Nico Williams', from: 'Athletic Club', to: 'Barcelona', value: '58M EUR', confidence: 78, status: 'Advanced talks', tag: 'Priority' },
    { player: 'Joshua Kimmich', from: 'Bayern', to: 'Barcelona', value: 'Free / bonus', confidence: 64, status: 'Monitoring', tag: 'Opportunity' },
    { player: 'Joao Cancelo', from: 'Man City', to: 'Barcelona', value: 'Loan + option', confidence: 72, status: 'Expected', tag: 'Return' },
    { player: 'Dani Olmo', from: 'Leipzig', to: 'Barcelona', value: '60M EUR', confidence: 58, status: 'Complicated', tag: 'Creative' },
  ];

  const raw = String(value || '').trim();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        player: String(item.player || item.name || fallback[index % fallback.length].player),
        from: String(item.from || fallback[index % fallback.length].from),
        to: String(item.to || fallback[index % fallback.length].to),
        value: String(item.value || item.dealValue || fallback[index % fallback.length].value),
        confidence: clampPercent(item.confidence, fallback[index % fallback.length].confidence),
        status: String(item.status || fallback[index % fallback.length].status),
        tag: String(item.tag || fallback[index % fallback.length].tag || 'Tracked'),
        image: String(item.image || item.playerImage || item.renderImage || ''),
      }));
    }
  } catch {
    return raw.split(/\n|;/).map((line, index) => {
      const [player, from, to, value, confidence, status, tag] = line.split('|').map(part => part?.trim());
      return {
        player: player || fallback[index % fallback.length].player,
        from: from || fallback[index % fallback.length].from,
        to: to || fallback[index % fallback.length].to,
        value: value || fallback[index % fallback.length].value,
        confidence: clampPercent(confidence, fallback[index % fallback.length].confidence),
        status: status || fallback[index % fallback.length].status,
        tag: tag || fallback[index % fallback.length].tag,
        image: '',
      };
    });
  }

  return fallback;
};

const parsePlayerStats = (value: unknown): PlayerStat[] => {
  const fallback: PlayerStat[] = [
    { label: 'Goals', value: '14', hint: 'Season' },
    { label: 'Assists', value: '9', hint: 'All comps' },
    { label: 'Key passes', value: '61', hint: 'Chance creation' },
    { label: 'Shots / 90', value: '3.4', hint: 'Shot volume' },
    { label: 'Dribbles', value: '72', hint: 'Completed' },
    { label: 'Minutes', value: '2,418', hint: 'Availability' },
  ];
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const stats = parsed
        .map((item): PlayerStat | null => {
          if (!item || typeof item !== 'object') return null;
          const record = item as Record<string, unknown>;
          return {
            label: String(record.label || record.name || '').trim(),
            value: String(record.value || record.total || '').trim(),
            hint: String(record.hint || record.caption || record.unit || '').trim() || undefined,
          };
        })
        .filter((item): item is PlayerStat => Boolean(item?.label && item.value));
      return stats.length ? stats : fallback;
    }

    if (parsed && typeof parsed === 'object') {
      const stats = Object.entries(parsed as Record<string, unknown>).map(([label, statValue]) => ({
        label,
        value: String(statValue),
      }));
      return stats.length ? stats : fallback;
    }
  } catch {
    const stats = raw
      .split(/\n|;/)
      .map((line): PlayerStat | null => {
        const [label, statValue, hint] = line.split('|').map(part => part?.trim());
        return label && statValue ? { label, value: statValue, hint: hint || undefined } : null;
      })
      .filter((item): item is PlayerStat => Boolean(item));
    return stats.length ? stats : fallback;
  }

  return fallback;
};

const getSportmonksPlayer = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== 'object') return null;
  const outer = payload as Record<string, unknown>;
  const rawData = outer.data && typeof outer.data === 'object' && 'data' in (outer.data as Record<string, unknown>)
    ? (outer.data as Record<string, unknown>).data
    : outer.data;
  if (Array.isArray(rawData)) return rawData.find(item => item && typeof item === 'object') as Record<string, unknown> || null;
  return rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : null;
};

const confidenceTone = (confidence: number, accentColor: string) => {
  if (confidence >= 86) return '#22c55e';
  if (confidence >= 68) return accentColor;
  if (confidence >= 48) return '#f59e0b';
  return '#fb7185';
};

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const marketItemImage = (item: MarketItem, fallbackImage = '') => {
  if (item.image) return item.image;
  const identity = resolvePlayerIdentity(`${item.player} ${item.to || item.from}`, item.to || item.from);
  return identity?.player.renderImage || identity?.player.smallImage || fallbackImage;
};

const visualVariantClass = (variant: string) => {
  if (variant === 'TACTICAL_DARK') return 'bg-[#05070b]';
  if (variant === 'LUXE_STUDIO') return 'bg-[radial-gradient(circle_at_78%_10%,rgba(250,204,21,.16),transparent_30%),#06070a]';
  if (variant === 'CLEAN_BROADCAST') return 'bg-[#0b1117]';
  return 'bg-[radial-gradient(circle_at_20%_10%,rgba(0,245,212,.14),transparent_34%),#05070b]';
};

const SectionTitle = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2">
    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/42">{label}</div>
    {value !== undefined && <div className="font-['Barlow_Condensed'] text-2xl font-black leading-none text-white">{value}</div>}
  </div>
);

const MiniMetric = ({ label, value, color }: { label: string; value: React.ReactNode; color: string }) => (
  <div className="border border-white/10 bg-white/[0.045] px-4 py-3">
    <div className="font-['Barlow_Condensed'] text-4xl font-black leading-none" style={{ color }}>{value}</div>
    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/38">{label}</div>
  </div>
);

const ConfidenceBar = ({ value, color }: { value: number; color: string }) => (
  <div className="h-2 bg-white/10">
    <div className="h-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
  </div>
);

const ClubPill = ({ label, color, logo }: { label: string; color: string; logo?: string }) => (
  <div className="grid grid-cols-[42px_1fr] border border-white/12 bg-black/45">
    <div className="flex h-12 items-center justify-center overflow-hidden text-sm font-black text-white" style={{ background: color }}>
      {logo ? (
        <img
          src={logo}
          alt=""
          className="h-9 w-9 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,.45)]"
          referrerPolicy="no-referrer"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      ) : initials(label)}
    </div>
    <div className="flex h-12 min-w-0 items-center px-4 text-xl font-black uppercase text-white">
      <span className="truncate">{label}</span>
    </div>
  </div>
);

const MarketRows = ({ items, accentColor }: { items: MarketItem[]; accentColor: string }) => (
  <div className="space-y-2">
    {items.slice(0, 5).map((item, index) => {
      const tone = confidenceTone(item.confidence, accentColor);
      return (
        <div key={`${item.player}-${index}`} className="grid grid-cols-[34px_1fr_92px] items-center gap-3 border border-white/10 bg-black/38 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center bg-white/10 font-['Barlow_Condensed'] text-xl font-black text-white/70">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-black leading-tight text-white">{item.player}</div>
            <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/38">
              {item.from} to {item.to} / {item.status}
            </div>
          </div>
          <div className="text-right">
            <div className="font-['Barlow_Condensed'] text-3xl font-black leading-none" style={{ color: tone }}>{item.confidence}%</div>
            <div className="mt-1 h-1 bg-white/10">
              <div className="h-full" style={{ width: `${item.confidence}%`, background: tone }} />
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const NewsStack = ({ title, items, color }: { title: string; items: string[]; color: string }) => (
  <div className="border border-white/10 bg-white/[0.04] p-4">
    <SectionTitle label={title} value={items.length} />
    <div className="mt-3 space-y-2">
      {items.slice(0, 4).map((item, index) => (
        <div key={`${item}-${index}`} className="grid grid-cols-[20px_1fr] gap-3 text-sm font-bold leading-tight text-white/82">
          <div className="mt-1 h-2 w-2" style={{ background: color }} />
          <div className="min-w-0">{item}</div>
        </div>
      ))}
    </div>
  </div>
);

export const TransferNewsRenderer: React.FC<RendererProps> = ({
  getField,
  containerStyle,
  contentWrapperStyle,
  playSound,
  wasVisible,
}) => {
  const playerName = String(getField('playerName') || 'Nico Williams');
  const playerImage = String(getField('playerImage') || '');
  const playerImageLarge = String(getField('playerImageLarge') || '');
  const fromClub = String(getField('fromClub') || 'Athletic Club');
  const toClub = String(getField('toClub') || 'Barcelona');
  const fromClubLogo = String(getField('fromClubLogo') || fallbackClubLogo(fromClub));
  const toClubLogo = String(getField('toClubLogo') || fallbackClubLogo(toClub));
  const clubLogo = String(getField('clubLogo') || toClubLogo);
  const leagueLogo = String(getField('leagueLogo') || '');
  const dealValue = String(getField('dealValue') || '58M EUR');
  const confidence = clampPercent(getField('confidence'), 78);
  const headline = String(getField('headline') || 'Mercato Intelligence');
  const subheadline = String(getField('subheadline') || 'Live transfer desk tracking probability, completed deals and market signals.');
  const source = String(getField('source') || 'Reo Show Mercato Desk');
  const accentColor = String(getField('accentColor') || '#00F5D4');
  const fromColor = String(getField('fromColor') || '#A50044');
  const toColor = String(getField('toColor') || '#004D98');
  const designStyle = String(getField('designStyle') || 'DEAL_BREAKER');
  const visualVariant = String(getField('visualVariant') || 'NEON_GLASS');
  const isUrgent = Boolean(getField('isUrgent') ?? true);
  const sportmonksPlayerId = String(getField('sportmonksPlayerId') || '').trim();
  const sportmonksSearch = String(getField('sportmonksSearch') || '').trim();
  const playerTeam = String(getField('playerTeam') || toClub || 'Barcelona');
  const playerPosition = String(getField('playerPosition') || 'Forward');
  const seasonLabel = String(getField('seasonLabel') || '2025/26');
  const playerStatsJson = String(getField('playerStatsJson') || '');
  const [sportmonksPayload, setSportmonksPayload] = useState<unknown>(null);

  const marketItems = useMemo(() => parseMarketItems(getField('marketItems')), [getField]);
  const playerStats = useMemo(() => parsePlayerStats(playerStatsJson), [playerStatsJson]);
  const sportmonksPlayer = getSportmonksPlayer(sportmonksPayload);
  const displayPlayerName = String(sportmonksPlayer?.display_name || sportmonksPlayer?.common_name || sportmonksPlayer?.name || playerName);
  const displayPlayerImage = playerImageLarge || playerImage || String(sportmonksPlayer?.image_path || '');
  const latestNews = splitFeed(getField('latestNews'), [
    'Board approved the sporting profile and salary range.',
    'Agent meeting expected within 48 hours.',
    'Outgoing transfers will define the final budget.',
  ]);
  const dailyDeals = splitFeed(getField('dailyDeals'), [
    'Medical passed and contract signed until 2030.',
    'Loan completed with buy option.',
    'Verbal agreement reached after final call.',
  ]);
  const expectedDeals = splitFeed(getField('expectedDeals'), [
    'Left wing shortlist reduced to two names.',
    'Defensive midfielder talks remain open.',
    'Full-back return depends on loan formula.',
  ]);

  const featured = marketItems[0] || {
    player: playerName,
    from: fromClub,
    to: toClub,
    value: dealValue,
    confidence,
    status: 'Tracked',
    tag: 'Featured',
  };
  const featuredConfidence = clampPercent(featured.confidence, confidence);
  const featuredTone = confidenceTone(featuredConfidence, accentColor);
  const logoForClub = (label: string) => {
    const normalized = label.trim().toLowerCase();
    const from = fromClub.trim().toLowerCase();
    const to = toClub.trim().toLowerCase();
    if (normalized && (normalized === from || from.includes(normalized) || normalized.includes(from))) return fromClubLogo;
    if (normalized && (normalized === to || to.includes(normalized) || normalized.includes(to))) return toClubLogo || clubLogo;
    return '';
  };

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) {
      didPlay.current = true;
      playSound('ENTRY').catch(() => {});
    }
  }, [wasVisible, playSound]);

  useEffect(() => {
    let cancelled = false;
    if (!sportmonksPlayerId && !sportmonksSearch) {
      setSportmonksPayload(null);
      return () => {
        cancelled = true;
      };
    }

    const params = new URLSearchParams({
      include: 'metadata;position;detailedPosition;statistics',
      select: 'name,display_name,common_name,image_path,date_of_birth,height,weight',
    });
    if (sportmonksPlayerId) params.set('playerId', sportmonksPlayerId);
    else params.set('search', sportmonksSearch);

    fetch(`/api/sportmonks/player?${params.toString()}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() as Promise<unknown> : null)
      .then(payload => {
        if (!cancelled) setSportmonksPayload(payload);
      })
      .catch(() => {
        if (!cancelled) setSportmonksPayload(null);
      });

    return () => {
      cancelled = true;
    };
  }, [sportmonksPlayerId, sportmonksSearch]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes mercatoScan { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
        @keyframes mercatoRise { from { opacity: 0; transform: translateY(26px); filter: blur(8px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes mercatoPulse { 0%, 100% { opacity: .36; } 50% { opacity: .82; } }
      `}</style>
      <div style={contentWrapperStyle} className="overflow-hidden text-white">
        <div className={`absolute inset-0 ${visualVariantClass(visualVariant)}`} />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.75) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute left-0 top-0 h-full w-2" style={{ background: fromColor }} />
        <div className="absolute right-0 top-0 h-full w-2" style={{ background: toColor }} />
        <div className="absolute inset-x-0 top-0 h-14 border-b border-white/10 bg-black/72">
          <div className="flex h-full items-center justify-between px-8 font-black uppercase">
            <div className="flex items-center gap-4">
              <span className="h-2 w-2" style={{ background: isUrgent ? '#fb3b52' : accentColor, animation: 'mercatoPulse 1.2s ease-in-out infinite' }} />
              <Sparkles className="h-4 w-4 text-white/42" strokeWidth={2.4} />
              {leagueLogo && <img src={leagueLogo} alt="" className="h-7 w-7 object-contain opacity-85" referrerPolicy="no-referrer" />}
              <span className="text-[11px] tracking-[0.36em] text-white/54">REO MERCATO INTELLIGENCE</span>
            </div>
            <div className="text-[11px] tracking-[0.28em]" style={{ color: accentColor }}>{source}</div>
          </div>
        </div>
        <div className="absolute inset-x-0 top-14 h-px overflow-hidden bg-white/10">
          <div className="h-full w-1/3" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, animation: 'mercatoScan 3.4s linear infinite' }} />
        </div>
        <div className="absolute inset-0 pt-14 font-['Tajawal']" style={{ animation: 'mercatoRise .62s cubic-bezier(.22,1,.36,1) both' }}>
          {children}
        </div>
      </div>
    </div>
  );

  if (designStyle === 'PLAYER_SEASON_CARD') {
    return (
      <Shell>
        <div className="grid h-full grid-cols-[440px_1fr] gap-7 p-9">
          <section className="relative overflow-hidden border border-white/10 bg-black/58">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${fromColor}, ${accentColor}, ${toColor})` }} />
            <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 18%, ${accentColor}55, transparent 44%)` }} />
            {displayPlayerImage ? (
              <img src={displayPlayerImage} alt={displayPlayerName} className="absolute inset-x-0 bottom-0 mx-auto h-[88%] w-auto object-contain drop-shadow-[0_32px_70px_rgba(0,0,0,.8)]" referrerPolicy="no-referrer" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-['Barlow_Condensed'] text-[180px] font-black text-white/[0.06]">{initials(displayPlayerName)}</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/72 to-transparent p-6">
              <SectionTitle label="mercato player card" value={seasonLabel} />
              <div className="mt-4 font-['Barlow_Condensed'] text-[68px] font-black uppercase leading-[.82] tracking-normal">{displayPlayerName}</div>
              <div className="mt-3 flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-white/48">
                <span>{playerTeam}</span>
                <span className="h-1.5 w-1.5" style={{ background: accentColor }} />
                <span>{playerPosition}</span>
              </div>
            </div>
          </section>

          <section className="flex min-w-0 flex-col justify-between">
            <div className="border border-white/10 bg-[#070a10]/78 p-7">
              <SectionTitle label="season intelligence" value={sportmonksPlayer ? 'API' : 'MANUAL'} />
              <h1 className="mt-5 font-['Barlow_Condensed'] text-[82px] font-black uppercase leading-[.78] tracking-normal">{headline}</h1>
              <p className="mt-5 max-w-[820px] text-xl font-bold leading-tight text-white/62">{subheadline}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {playerStats.slice(0, 6).map((stat, index) => {
                const Icon = getStatIcon(stat.label, index);
                return (
                <div key={`${stat.label}-${index}`} className="relative min-h-[144px] overflow-hidden border border-white/10 bg-white/[0.05] p-5" style={{ animation: `mercatoRise .45s ease ${index * 55}ms both` }}>
                  <div className="absolute inset-y-0 -left-1/2 w-full opacity-18" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, animation: 'mercatoScan 4.8s linear infinite' }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">{stat.label}</div>
                      <div className="flex h-9 w-9 items-center justify-center border border-white/10 bg-black/40" style={{ color: index === 0 ? accentColor : '#9ca3af' }}>
                        <Icon className="h-4 w-4" strokeWidth={2.4} />
                      </div>
                    </div>
                    <div className="mt-4 font-['Barlow_Condensed'] text-6xl font-black leading-none" style={{ color: index === 0 ? accentColor : '#fff' }}>{stat.value}</div>
                    <div className="mt-2 truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/36">{stat.hint || 'season metric'}</div>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="grid grid-cols-[1fr_220px] gap-3">
              <NewsStack title="market read" items={latestNews} color={accentColor} />
              <div className="border border-white/10 bg-black/45 p-4">
                <SectionTitle label="deal signal" value={`${confidence}%`} />
                <div className="mt-8 font-['Barlow_Condensed'] text-7xl font-black leading-none" style={{ color: featuredTone }}>{confidence}%</div>
                <div className="mt-4"><ConfidenceBar value={confidence} color={featuredTone} /></div>
              </div>
            </div>
          </section>
        </div>
      </Shell>
    );
  }

  if (designStyle === 'PLAYER_IMPACT_CARD') {
    return (
      <Shell>
        <div className="grid h-full grid-cols-[1fr_500px] gap-7 p-9">
          <section className="relative overflow-hidden border border-white/10 bg-[#070a10]/82 p-8">
            <div className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 opacity-25" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, animation: 'mercatoScan 5.5s ease-in-out infinite' }} />
            <div className="relative z-10">
              <SectionTitle label="impact forecast" value={seasonLabel} />
              <h1 className="mt-6 font-['Barlow_Condensed'] text-[92px] font-black uppercase leading-[.78] tracking-normal">{displayPlayerName}</h1>
              <p className="mt-5 max-w-[860px] text-2xl font-bold leading-tight text-white/62">{subheadline}</p>
              <div className="mt-10 space-y-4">
                {playerStats.slice(0, 6).map((stat, index) => {
                  const width = Math.min(100, Math.max(18, Number.parseFloat(stat.value.replace(/[^\d.]/g, '')) || 50));
                  const Icon = getStatIcon(stat.label, index);
                  return (
                    <div key={`${stat.label}-${index}`} className="grid grid-cols-[54px_190px_1fr_100px] items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/[0.055]" style={{ color: index % 2 ? '#60a5fa' : accentColor }}>
                        <Icon className="h-5 w-5" strokeWidth={2.4} />
                      </div>
                      <div className="truncate text-lg font-black text-white/72">{stat.label}</div>
                      <div className="h-3 bg-white/10">
                        <div className="h-full" style={{ width: `${width}%`, background: index % 2 ? '#60a5fa' : accentColor }} />
                      </div>
                      <div className="font-['Barlow_Condensed'] text-4xl font-black leading-none text-right">{stat.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden border border-white/10 bg-black/58">
            {displayPlayerImage ? (
              <img src={displayPlayerImage} alt={displayPlayerName} className="absolute inset-x-0 bottom-0 mx-auto h-[95%] w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-['Barlow_Condensed'] text-[180px] font-black text-white/[0.06]">{initials(displayPlayerName)}</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <SectionTitle label="transfer probability" value={`${confidence}%`} />
              <div className="mt-5 flex items-end justify-between">
                <div className="font-['Barlow_Condensed'] text-[94px] font-black leading-none" style={{ color: featuredTone }}>{confidence}%</div>
                <div className="text-right text-sm font-black uppercase tracking-[0.18em] text-white/50">
                  <div>{fromClub}</div>
                  <div style={{ color: accentColor }}>TO</div>
                  <div>{toClub}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Shell>
    );
  }

  if (designStyle === 'MARKET_COMMAND_CENTER') {
    return (
      <Shell>
        <div className="grid h-full grid-cols-[.92fr_1.18fr_.9fr] gap-5 p-8">
          <section className="flex min-w-0 flex-col justify-between border border-white/10 bg-black/50 p-6">
            <div>
              <SectionTitle label="Market room" value="LIVE" />
              <h1 className="mt-5 font-['Barlow_Condensed'] text-[86px] font-black uppercase leading-[.78] tracking-normal">
                {headline}
              </h1>
              <p className="mt-5 text-xl font-bold leading-tight text-white/62">{subheadline}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="done" value={dailyDeals.length} color="#22c55e" />
              <MiniMetric label="expected" value={expectedDeals.length} color={accentColor} />
              <MiniMetric label="news" value={latestNews.length} color="#60a5fa" />
            </div>
          </section>

          <section className="border border-white/10 bg-[#070a10]/78 p-6">
            <SectionTitle label="Transfer probability board" value={`${featuredConfidence}%`} />
            <div className="mt-5 grid grid-cols-[1fr_170px] gap-5">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/38">{featured.tag || 'Featured target'}</div>
                <div className="mt-2 truncate font-['Barlow_Condensed'] text-[64px] font-black uppercase leading-none">{featured.player}</div>
                <div className="mt-4 grid grid-cols-[1fr_52px_1fr] items-center gap-3">
                  <ClubPill label={featured.from} color={fromColor} logo={logoForClub(featured.from) || fromClubLogo} />
                  <div className="flex h-12 items-center justify-center border border-white/10 bg-white/[0.06] font-['Barlow_Condensed'] text-3xl font-black" style={{ color: accentColor }}>TO</div>
                  <ClubPill label={featured.to} color={toColor} logo={logoForClub(featured.to) || toClubLogo || clubLogo} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MiniMetric label="package" value={featured.value} color={accentColor} />
                  <MiniMetric label="status" value={featured.status} color={featuredTone} />
                </div>
              </div>
              <div className="flex flex-col justify-between border border-white/10 bg-white/[0.04] p-4">
                <div className="text-center">
                  <div className="font-['Barlow_Condensed'] text-[88px] font-black leading-none" style={{ color: featuredTone }}>{featuredConfidence}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">confidence</div>
                </div>
                <ConfidenceBar value={featuredConfidence} color={featuredTone} />
              </div>
            </div>
            <div className="mt-5">
              <MarketRows items={marketItems} accentColor={accentColor} />
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-3 gap-3">
            <NewsStack title="Deals completed" items={dailyDeals} color="#22c55e" />
            <NewsStack title="Expected next" items={expectedDeals} color={accentColor} />
            <NewsStack title="Latest signals" items={latestNews} color="#60a5fa" />
          </section>
        </div>
      </Shell>
    );
  }

  if (designStyle === 'RUMOUR_RADAR') {
    return (
      <Shell>
        <div className="grid h-full grid-cols-[420px_1fr] gap-6 p-10">
          <section className="flex flex-col justify-between border border-white/10 bg-black/58 p-7">
            <div>
              <SectionTitle label="Probability model" value={`${confidence}%`} />
              <h1 className="mt-5 font-['Barlow_Condensed'] text-[78px] font-black uppercase leading-[.82] tracking-normal">
                {headline}
              </h1>
              <div className="relative mt-6 h-[310px] overflow-hidden border border-white/10 bg-white/[0.035]">
                {marketItemImage(featured, displayPlayerImage) ? (
                  <img
                    src={marketItemImage(featured, displayPlayerImage)}
                    alt=""
                    className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto object-contain drop-shadow-[0_26px_38px_rgba(0,0,0,.68)]"
                    referrerPolicy="no-referrer"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-['Barlow_Condensed'] text-[112px] font-black text-white/[0.08]">
                    {initials(displayPlayerName)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/36">focus target</div>
              <div className="mt-2 text-4xl font-black leading-none">{displayPlayerName}</div>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <ClubPill label={fromClub} color={fromColor} logo={fromClubLogo} />
                <ClubPill label={toClub} color={toColor} logo={toClubLogo || clubLogo} />
              </div>
            </div>
          </section>

          <section className="border border-white/10 bg-[#070a10]/82 p-7">
            <SectionTitle label="Likelihood matrix" value="0-100" />
            <div className="mt-7 space-y-5">
              {marketItems.slice(0, 7).map((item, index) => {
                const tone = confidenceTone(item.confidence, accentColor);
                return (
                  <div key={`${item.player}-${index}`} className="grid grid-cols-[74px_230px_1fr_96px] items-center gap-4">
                    <div className="relative h-16 overflow-hidden border border-white/10 bg-black/40">
                      {marketItemImage(item) ? (
                        <img
                          src={marketItemImage(item)}
                          alt=""
                          className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto object-contain"
                          referrerPolicy="no-referrer"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-['Barlow_Condensed'] text-2xl font-black text-white/38">{initials(item.player)}</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-3xl font-black leading-none">{item.player}</div>
                      <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/36">{item.from} to {item.to}</div>
                    </div>
                    <div className="relative h-12 border border-white/10 bg-white/[0.035]">
                      <div className="absolute inset-y-0 left-0" style={{ width: `${item.confidence}%`, background: `linear-gradient(90deg, ${tone}33, ${tone})` }} />
                      <div className="absolute inset-y-0 left-[50%] w-px bg-white/18" />
                      <div className="absolute inset-0 flex items-center px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{item.status}</div>
                    </div>
                    <div className="font-['Barlow_Condensed'] text-5xl font-black leading-none text-right" style={{ color: tone }}>{item.confidence}%</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <MiniMetric label="hot targets" value={marketItems.filter(item => item.confidence >= 75).length} color="#22c55e" />
              <MiniMetric label="watch list" value={marketItems.filter(item => item.confidence < 75 && item.confidence >= 50).length} color={accentColor} />
              <MiniMetric label="low signal" value={marketItems.filter(item => item.confidence < 50).length} color="#fb7185" />
            </div>
          </section>
        </div>
      </Shell>
    );
  }

  if (designStyle === 'DONE_DEALS_WALL') {
    return (
      <Shell>
        <div className="h-full p-9">
          <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.32em] text-white/42">official market board</div>
              <h1 className="mt-2 font-['Barlow_Condensed'] text-[86px] font-black uppercase leading-none tracking-normal">{headline}</h1>
            </div>
            <MiniMetric label="completed" value={marketItems.length} color="#22c55e" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {marketItems.slice(0, 6).map((item, index) => (
              <div key={`${item.player}-${index}`} className="relative min-h-[190px] overflow-hidden border border-white/10 bg-[#070a10]/86 p-5">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: index % 2 ? accentColor : '#22c55e' }} />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-['Barlow_Condensed'] text-5xl font-black uppercase leading-none">{item.player}</div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{item.tag || 'Completed transfer'}</div>
                  </div>
                  <div className="border border-emerald-300/30 bg-emerald-300/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">done</div>
                </div>
                <div className="mt-7 grid grid-cols-[1fr_34px_1fr] items-center gap-2">
                  <ClubPill label={item.from} color={fromColor} logo={logoForClub(item.from)} />
                  <div className="text-center font-['Barlow_Condensed'] text-3xl font-black text-white/40">{'>'}</div>
                  <ClubPill label={item.to} color={toColor} logo={logoForClub(item.to)} />
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div className="font-['Barlow_Condensed'] text-4xl font-black leading-none" style={{ color: accentColor }}>{item.value}</div>
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-white/44">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid h-full grid-cols-[.92fr_1.08fr]">
        <section className="relative overflow-hidden border-r border-white/10 bg-black/45">
          {displayPlayerImage ? (
            <img src={displayPlayerImage} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-84" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#070a10]">
              <div className="font-['Barlow_Condensed'] text-[230px] font-black leading-none text-white/[0.06]">{initials(displayPlayerName)}</div>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,11,.18),rgba(5,7,11,.92))]" />
          <div className="absolute bottom-8 left-8 right-8 border border-white/10 bg-black/72 p-5">
            <SectionTitle label="featured deal" value={confidence >= 86 ? 'HOT' : 'LIVE'} />
            <div className="mt-4 font-['Barlow_Condensed'] text-[72px] font-black uppercase leading-[.82] tracking-normal">{displayPlayerName}</div>
          </div>
        </section>

        <section className="flex flex-col justify-center p-10">
          <div className="max-w-[860px]">
            <div className="inline-flex border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em]" style={{ color: accentColor }}>
              <Radio className="mr-2 h-4 w-4" strokeWidth={2.4} />
              {isUrgent ? 'breaking transfer desk' : 'transfer desk'}
            </div>
            <h1 className="mt-5 font-['Barlow_Condensed'] text-[100px] font-black uppercase leading-[.78] tracking-normal">{headline}</h1>
            <p className="mt-5 max-w-[720px] text-2xl font-bold leading-tight text-white/62">{subheadline}</p>

            <div className="mt-8 grid grid-cols-[1fr_72px_1fr] items-center gap-4">
              <ClubPill label={fromClub} color={fromColor} logo={fromClubLogo} />
              <div className="flex h-16 items-center justify-center border border-white/10 bg-white/[0.05] font-['Barlow_Condensed'] text-5xl font-black" style={{ color: accentColor }}>TO</div>
              <ClubPill label={toClub} color={toColor} logo={toClubLogo || clubLogo} />
            </div>

            <div className="mt-8 grid grid-cols-[1fr_220px] gap-4">
              <div className="border border-white/10 bg-white/[0.045] p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.26em] text-white/38">deal package</div>
                <div className="mt-2 font-['Barlow_Condensed'] text-6xl font-black leading-none" style={{ color: accentColor }}>{dealValue}</div>
              </div>
              <div className="border border-white/10 bg-white/[0.045] p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">confidence</div>
                    <div className="mt-1 font-['Barlow_Condensed'] text-6xl font-black leading-none" style={{ color: featuredTone }}>{confidence}%</div>
                  </div>
                </div>
                <div className="mt-4">
                  <ConfidenceBar value={confidence} color={featuredTone} />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <NewsStack title="latest market signal" items={latestNews} color={accentColor} />
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
};
