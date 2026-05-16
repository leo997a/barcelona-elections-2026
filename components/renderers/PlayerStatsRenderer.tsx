import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Crosshair,
  Gauge,
  Radio,
  Repeat,
  ShieldCheck,
  Sparkles,
  Swords,
  Timer,
  TrendingUp,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { RendererProps } from './SharedComponents';

type PlayerStatItem = {
  key?: string;
  label: string;
  labelAr?: string;
  value: string | number;
  hint?: string;
  category?: string;
  per90?: string | number;
  unit?: string;
  provider?: string;
  confidence?: number;
  updatedAt?: string;
};

type PlayerMetricStat = {
  label?: string;
  labelAr?: string;
  value?: string | number;
  unit?: string;
  category?: string;
  provider?: string;
  confidence?: number;
  updatedAt?: string;
};

type PlayerStatsCard = {
  name: string;
  club: string;
  position?: string;
  image?: string;
  clubLogo?: string;
  season?: string;
  headline?: string;
  summary?: string;
  stats?: PlayerStatItem[] | Record<string, PlayerMetricStat>;
};

type PlayerStatsPayload = {
  mode?: string;
  source?: string;
  updatedAt?: string;
  generatedAt?: string;
  season?: string;
  players?: PlayerStatsCard[];
  notes?: string[];
  warnings?: string[];
  selectedMetrics?: string[];
  providerPlan?: unknown;
  presentation?: {
    heroMetrics?: string[];
    secondaryMetrics?: string[];
    visualVariant?: string;
  };
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseJson = <T,>(value: unknown): T | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const splitStats = (value: unknown): PlayerStatItem[] => {
  const parsed = parseJson<unknown>(value);
  if (Array.isArray(parsed)) {
    return parsed
      .map((item): PlayerStatItem | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const label = String(record.label || record.name || '').trim();
        const statValue = String(record.value ?? record.total ?? '').trim();
        if (!label || !statValue) return null;
        return {
          label,
          value: statValue,
          hint: String(record.hint || record.unit || record.caption || '').trim() || undefined,
          category: String(record.category || '').trim() || undefined,
          per90: record.per90 as string | number | undefined,
        };
      })
      .filter((item): item is PlayerStatItem => Boolean(item));
  }

  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => {
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return {
          key,
          label: String(record.label || key.replace(/_/g, ' ')),
          labelAr: String(record.labelAr || record.label || key.replace(/_/g, ' ')),
          value: String(record.value ?? 'pending'),
          hint: String(record.provider || record.category || record.unit || '').trim() || undefined,
          category: String(record.category || '').trim() || undefined,
          unit: String(record.unit || '').trim() || undefined,
          provider: String(record.provider || '').trim() || undefined,
          confidence: Number(record.confidence || 0) || undefined,
          updatedAt: String(record.updatedAt || '').trim() || undefined,
        };
      }
      return {
        key,
        label: key.replace(/_/g, ' '),
        value: String(value),
      };
    });
  }

  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw
    .split(/\n|;/)
    .map((line): PlayerStatItem | null => {
      const [label, statValue, hint, category] = line.split('|').map(part => part?.trim());
      return label && statValue ? { label, value: statValue, hint: hint || undefined, category: category || undefined } : null;
    })
    .filter((item): item is PlayerStatItem => Boolean(item));
};

const normalizeStats = (value: PlayerStatsCard['stats']): PlayerStatItem[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return splitStats(JSON.stringify(value));
  return [];
};

const DEFAULT_STATS: PlayerStatItem[] = [
  { label: 'Goals', value: '25', hint: 'season total', category: 'attack' },
  { label: 'Shots / 90', value: '3.8', hint: 'volume', category: 'attack' },
  { label: 'Key passes', value: '41', hint: 'chance creation', category: 'passing' },
  { label: 'Progressive passes', value: '68', hint: 'build-up', category: 'passing' },
  { label: 'Duels won', value: '54%', hint: 'contests', category: 'defense' },
  { label: 'Recoveries', value: '132', hint: 'ball wins', category: 'defense' },
  { label: 'Touches in box', value: '178', hint: 'danger zone', category: 'attack' },
  { label: 'Minutes', value: '2,640', hint: 'season load', category: 'season' },
];

const statIcon = (label: string): LucideIcon => {
  const key = label.toLowerCase();
  if (key.includes('goal') || key.includes('shot') || key.includes('xg') || key.includes('touch')) return Crosshair;
  if (key.includes('pass') || key.includes('chance') || key.includes('key')) return Activity;
  if (key.includes('duel') || key.includes('tackle') || key.includes('recover') || key.includes('interception')) return ShieldCheck;
  if (key.includes('dribble') || key.includes('carry') || key.includes('progress')) return Zap;
  if (key.includes('minute') || key.includes('start') || key.includes('appearance')) return Timer;
  return BarChart3;
};

const statPercent = (value: unknown, index: number) => {
  const raw = String(value || '').replace(/,/g, '');
  const percent = raw.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) return clamp(Number(percent[1]), 4, 100);
  const numeric = Number(raw.match(/\d+(?:\.\d+)?/)?.[0] || 0);
  if (!numeric) return 34 + ((index * 9) % 38);
  return clamp(numeric > 100 ? 55 + (numeric % 40) : numeric * 8, 10, 100);
};

const formatTime = (value?: string) => {
  if (!value) return 'LIVE DATA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

const buildPlayer = (
  getField: RendererProps['getField'],
  slot: 'A' | 'B' | 'C',
  fallback: PlayerStatsCard,
): PlayerStatsCard => ({
  name: String(getField(`player${slot}Name`) || fallback.name),
  club: String(getField(`player${slot}Club`) || fallback.club),
  position: String(getField(`player${slot}Position`) || fallback.position || ''),
  image: String(getField(`player${slot}Image`) || fallback.image || ''),
  clubLogo: String(getField(`player${slot}ClubLogo`) || fallback.clubLogo || ''),
  season: String(getField('seasonLabel') || fallback.season || '2025/26'),
  stats: splitStats(getField(`player${slot}StatsJson`)).length ? splitStats(getField(`player${slot}StatsJson`)) : fallback.stats,
});

const buildFallbackPayload = (getField: RendererProps['getField']): PlayerStatsPayload => {
  const baseStats = splitStats(getField('playerStatsJson'));
  const playerA: PlayerStatsCard = {
    name: String(getField('playerAName') || getField('playerName') || getField('sourcePlayerName') || 'Robert Lewandowski'),
    club: String(getField('playerAClub') || getField('playerTeam') || getField('sourceClubName') || 'Barcelona'),
    position: String(getField('playerAPosition') || getField('playerPosition') || 'Forward'),
    image: String(getField('playerAImage') || getField('playerImageLarge') || getField('playerImage') || ''),
    clubLogo: String(getField('playerAClubLogo') || getField('clubLogo') || ''),
    season: String(getField('seasonLabel') || '2025/26'),
    stats: baseStats.length ? baseStats : DEFAULT_STATS,
  };

  return {
    mode: String(getField('playerStatsMode') || 'SINGLE'),
    source: String(getField('dataSourceName') || 'REO Player Data Bridge'),
    updatedAt: new Date().toISOString(),
    season: String(getField('seasonLabel') || '2025/26'),
    players: [
      playerA,
      buildPlayer(getField, 'B', {
        name: 'Cole Palmer',
        club: 'Chelsea',
        position: 'AM / RW',
        season: playerA.season,
        stats: [
          { label: 'Goals', value: '16', hint: 'season', category: 'attack' },
          { label: 'Assists', value: '8', hint: 'season', category: 'attack' },
          { label: 'Key passes', value: '58', hint: 'creation', category: 'passing' },
          { label: 'Chances created', value: '70', hint: 'final third', category: 'passing' },
          { label: 'Dribbles', value: '64', hint: 'completed', category: 'attack' },
          { label: 'Minutes', value: '2,820', hint: 'season load', category: 'season' },
        ],
      }),
      buildPlayer(getField, 'C', {
        name: 'Lamine Yamal',
        club: 'Barcelona',
        position: 'RW',
        season: playerA.season,
        stats: [
          { label: 'Goals', value: '14', hint: 'season', category: 'attack' },
          { label: 'Assists', value: '9', hint: 'season', category: 'attack' },
          { label: 'Successful dribbles', value: '72', hint: '1v1', category: 'attack' },
          { label: 'Key passes', value: '61', hint: 'creation', category: 'passing' },
          { label: 'Progressive carries', value: '88', hint: 'advance', category: 'possession' },
          { label: 'Minutes', value: '2,418', hint: 'season load', category: 'season' },
        ],
      }),
    ],
  };
};

const normalizePayload = (payload: PlayerStatsPayload | null, getField: RendererProps['getField']) => {
  const fallback = buildFallbackPayload(getField);
  if (!payload || typeof payload !== 'object') return fallback;
  const players = Array.isArray(payload.players) && payload.players.length ? payload.players : fallback.players;
  return {
    ...fallback,
    ...payload,
    players: players.map((player, index) => ({
      ...fallback.players?.[index],
      ...player,
      stats: normalizeStats(player.stats).length ? normalizeStats(player.stats) : fallback.players?.[index]?.stats || DEFAULT_STATS,
    })),
  };
};

const selectedCategories = (getField: RendererProps['getField']) => [
  ['attack', 'includeAttack'],
  ['shooting', 'includeShooting'],
  ['chance_creation', 'includeChanceCreation'],
  ['passing', 'includePassing'],
  ['dribbling', 'includeDribbling'],
  ['defense', 'includeDefense'],
  ['duels', 'includeDuels'],
  ['possession', 'includePossession'],
  ['discipline', 'includeDiscipline'],
  ['goalkeeping', 'includeGoalkeeping'],
  ['season', 'includeSeasonTotals'],
  ['per90', 'includePer90'],
  ['advanced', 'includeAdvanced'],
].filter(([, fieldId]) => getField(fieldId) !== false).map(([category]) => category);

const PlayerImage = ({ player, accent, large = false }: { player: PlayerStatsCard; accent: string; large?: boolean }) => (
  <div className={`relative overflow-hidden border border-white/10 bg-white/[0.04] ${large ? 'h-full' : 'h-32'}`}>
    {player.image ? (
      <img
        src={player.image}
        alt=""
        className="absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_24px_40px_rgba(0,0,0,.65)]"
        referrerPolicy="no-referrer"
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
    ) : (
      <div className="flex h-full items-center justify-center">
        <UserRound size={large ? 96 : 42} color={accent} />
      </div>
    )}
    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/55 to-transparent" />
  </div>
);

const ClubMark = ({ player, accent }: { player: PlayerStatsCard; accent: string }) => (
  <div className="flex min-w-0 items-center gap-3">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 bg-black/55">
      {player.clubLogo ? (
        <img
          src={player.clubLogo}
          alt=""
          className="h-9 w-9 object-contain"
          referrerPolicy="no-referrer"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <Sparkles size={18} color={accent} />
      )}
    </div>
    <div className="min-w-0">
      <div className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-white/38">{player.club}</div>
      <div className="truncate font-['Barlow_Condensed'] text-[28px] font-black uppercase leading-none text-white">{player.name}</div>
    </div>
  </div>
);

const StatTile = ({ stat, accent, index }: { key?: React.Key; stat: PlayerStatItem; accent: string; index: number }) => {
  const Icon = statIcon(stat.label);
  const width = statPercent(stat.value, index);
  const title = stat.labelAr || stat.label;
  const caption = [stat.provider, stat.category, stat.unit].filter(Boolean).join(' / ') || stat.hint || 'season data';
  return (
    <div className="relative overflow-hidden border border-white/10 bg-black/55 p-4">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.06]">
            <Icon size={17} color={accent} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{title}</div>
            <div className="truncate text-[11px] font-bold text-white/34">{caption}</div>
          </div>
        </div>
        <div className="font-['Barlow_Condensed'] text-[38px] font-black leading-none" style={{ color: accent }}>{stat.value}</div>
      </div>
      <div className="mt-3 h-1.5 bg-white/10">
        <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${width}%`, background: accent }} />
      </div>
    </div>
  );
};

const PlayerColumn = ({
  player,
  accent,
  index,
  statsOverride,
}: {
  key?: React.Key;
  player: PlayerStatsCard;
  accent: string;
  index: number;
  statsOverride?: PlayerStatItem[];
}) => (
  <div className="relative grid min-h-0 grid-rows-[160px_auto_1fr] overflow-hidden border border-white/10 bg-black/70 shadow-[0_28px_80px_rgba(0,0,0,.45)]">
    <div className="absolute left-0 top-0 h-1 w-full" style={{ background: accent }} />
    <PlayerImage player={player} accent={accent} />
    <div className="border-b border-white/10 p-5">
      <ClubMark player={player} accent={accent} />
      <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
        <span>{player.position || 'Player profile'}</span>
        <span>{player.season || 'Season'}</span>
      </div>
    </div>
    <div className="grid min-h-0 gap-2 overflow-hidden p-4">
      {(statsOverride?.length ? statsOverride : normalizeStats(player.stats).length ? normalizeStats(player.stats) : DEFAULT_STATS).slice(0, 6).map((stat, statIndex) => (
        <StatTile key={`${player.name}-${stat.label}-${statIndex}`} stat={stat} accent={accent} index={statIndex + index} />
      ))}
    </div>
  </div>
);

export const PlayerStatsRenderer: React.FC<RendererProps> = ({
  getField,
  containerStyle,
  activeTheme,
}) => {
  const dataMode = String(getField('playerStatsDataMode') || 'MANUAL');
  const statsMode = String(getField('playerStatsMode') || 'SINGLE');
  const apiUrl = String(getField('playerStatsApiUrl') || '/api/player-stats');
  const pollIntervalSec = clamp(toNumber(getField('playerStatsPollSec'), 60), 15, 180);
  const accent = String(getField('accentColor') || activeTheme.accent || '#22d3ee');
  const secondaryAccent = String(getField('secondaryAccentColor') || '#fb7185');
  const scale = clamp(toNumber(getField('scale'), 1), 0.5, 3);
  const positionX = toNumber(getField('positionX'), 0);
  const positionY = toNumber(getField('positionY'), 0);
  const categories = selectedCategories(getField);
  const selectedMetrics = parseJson<string[]>(getField('selectedMetricsJson')) || [];
  const heroMetrics = parseJson<string[]>(getField('heroMetricsJson')) || selectedMetrics.slice(0, 4);
  const secondaryMetrics = parseJson<string[]>(getField('secondaryMetricsJson')) || selectedMetrics.slice(4, 16);
  const visualVariant = String(getField('playerStatsVisualVariant') || 'ULTRA_LAB');
  const sourceJson = String(getField('playerStatsSourceJson') || '').trim();
  const [remotePayload, setRemotePayload] = useState<PlayerStatsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (dataMode === 'MANUAL') {
      setRemotePayload(null);
      return () => { cancelled = true; };
    }

    if (!selectedMetrics.length) {
      setRemotePayload(null);
      return () => { cancelled = true; };
    }

    const fetchPayload = async () => {
      const body = {
        mode: statsMode,
        providerPolicy: String(getField('providerPolicy') || 'auto'),
        selectedMetrics,
        season: String(getField('seasonLabel') || '2025/26'),
        player: {
          name: String(getField('playerAName') || getField('playerName') || getField('sourcePlayerName') || ''),
          club: String(getField('playerAClub') || getField('playerTeam') || getField('sourceClubName') || ''),
        },
        comparisonPlayers: [
          { name: String(getField('playerBName') || ''), club: String(getField('playerBClub') || '') },
          { name: String(getField('playerCName') || ''), club: String(getField('playerCClub') || '') },
        ].filter(player => player.name.trim()),
        presentation: {
          heroMetrics,
          secondaryMetrics,
          visualVariant,
        },
      };

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null) as PlayerStatsPayload | null;
        if (!cancelled && response.ok) setRemotePayload(payload);
      } catch {
        if (!cancelled) setRemotePayload(null);
      }
    };

    fetchPayload();
    const interval = window.setInterval(fetchPayload, pollIntervalSec * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiUrl, dataMode, getField, heroMetrics.join(','), pollIntervalSec, secondaryMetrics.join(','), selectedMetrics.join(','), statsMode, visualVariant]);

  const payload = useMemo(() => {
    if (remotePayload) return normalizePayload(remotePayload, getField);
    return normalizePayload(parseJson<PlayerStatsPayload>(sourceJson), getField);
  }, [getField, remotePayload, sourceJson]);

  const players = payload.players || [];
  const visiblePlayers = statsMode === 'SINGLE' ? players.slice(0, 1) : statsMode === 'COMPARE' ? players.slice(0, 2) : players.slice(0, 3);
  const title = String(getField('headline') || (statsMode === 'COMPARE' ? 'PLAYER DUEL' : statsMode === 'SCOUT_SHORTLIST' ? 'SCOUT SHORTLIST' : 'PLAYER DATA FILE'));
  const subtitle = String(getField('subheadline') || 'WhoScored-style player data bridge with AI-assisted identity and cached broadcast assets');
  const activeHeroMetrics = payload.presentation?.heroMetrics?.length ? payload.presentation.heroMetrics : heroMetrics;
  const activeSecondaryMetrics = payload.presentation?.secondaryMetrics?.length ? payload.presentation.secondaryMetrics : secondaryMetrics;
  const orderedStats = (player: PlayerStatsCard) => {
    const stats = normalizeStats(player.stats).length ? normalizeStats(player.stats) : DEFAULT_STATS;
    const byKey = new Map(stats.map(stat => [stat.key || stat.label, stat]));
    const ordered = [...activeHeroMetrics, ...activeSecondaryMetrics]
      .map(key => byKey.get(key))
      .filter((stat): stat is PlayerStatItem => Boolean(stat));
    return ordered.length ? ordered : stats;
  };
  const frameClass = visualVariant === 'GLASS_SCOUT'
    ? 'bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.18),transparent_34%),#071018]'
    : visualVariant === 'BARCA_RADAR'
      ? 'bg-[linear-gradient(135deg,#130016,#08142b_48%,#050608)]'
      : visualVariant === 'MINIMAL_CAST'
        ? 'bg-[#0b0d12]'
        : 'bg-[#080a0f]';

  return (
    <div
      className="absolute inset-0 overflow-hidden text-white"
      style={{
        ...containerStyle,
        transform: `${containerStyle.transform || ''} translate(${positionX}px, ${positionY}px) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <style>{`
        @keyframes playerDataScan { 0% { transform: translateX(-40%); opacity: .1; } 50% { opacity: .45; } 100% { transform: translateX(70%); opacity: .08; } }
        @keyframes playerCardFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes playerLinePulse { 0%,100% { opacity: .24; } 50% { opacity: .72; } }
      `}</style>
      <div className={`absolute inset-0 ${frameClass}`} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      <div className="absolute inset-y-0 left-[-30%] w-[70%] bg-[linear-gradient(100deg,transparent,rgba(34,211,238,.16),transparent)] blur-sm" style={{ animation: 'playerDataScan 6s linear infinite' }} />

      <div className="relative mx-auto grid h-full w-[1760px] max-w-[96vw] grid-rows-[112px_1fr] gap-5 py-10">
        <header className="grid grid-cols-[1fr_auto] items-end border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.24em] text-white/42">
              <BrainCircuit size={18} color={accent} />
              <span>AI PLAYER STATS</span>
              <span className="h-1 w-1 rounded-full" style={{ background: accent }} />
              <span>{payload.source || 'REO Player Data Bridge'}</span>
            </div>
            <h1 className="mt-2 font-['Barlow_Condensed'] text-[76px] font-black uppercase leading-none tracking-normal text-white">
              {title}
            </h1>
          </div>
          <div className="grid min-w-[340px] grid-cols-2 gap-2 text-right">
            <div className="border border-white/10 bg-black/55 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Mode</div>
              <div className="font-['Barlow_Condensed'] text-3xl font-black uppercase text-white">{statsMode.replace(/_/g, ' ')}</div>
            </div>
            <div className="border border-white/10 bg-black/55 p-4">
              <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                <Radio size={14} color={accent} />
                <span>Updated</span>
              </div>
              <div className="font-['Barlow_Condensed'] text-3xl font-black uppercase text-white">{formatTime(payload.updatedAt || payload.generatedAt)}</div>
            </div>
          </div>
        </header>

        <main className={`grid min-h-0 gap-5 ${statsMode === 'SINGLE' ? 'grid-cols-[520px_1fr]' : statsMode === 'COMPARE' ? 'grid-cols-[1fr_260px_1fr]' : 'grid-cols-3'}`}>
          {statsMode === 'SINGLE' && players[0] && (
            <>
              <section className="relative overflow-hidden border border-white/10 bg-black/70 shadow-[0_28px_90px_rgba(0,0,0,.5)]" style={{ animation: 'playerCardFloat 7s ease-in-out infinite' }}>
                <div className="absolute left-0 top-0 h-1 w-full" style={{ background: accent }} />
                <PlayerImage player={players[0]} accent={accent} large />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <ClubMark player={players[0]} accent={accent} />
                  <p className="mt-4 max-w-[430px] text-lg font-bold leading-snug text-white/62">{players[0].summary || subtitle}</p>
                </div>
              </section>
              <section className="grid min-h-0 grid-rows-[auto_1fr] gap-4">
                <div className="grid grid-cols-4 gap-3">
                  {categories.slice(0, 4).map((category, index) => {
                    const Icon = index === 0 ? Swords : index === 1 ? Repeat : index === 2 ? ShieldCheck : TrendingUp;
                    return (
                      <div key={category} className="border border-white/10 bg-white/[0.045] p-4">
                        <Icon size={20} color={index % 2 ? secondaryAccent : accent} />
                        <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{category}</div>
                        <div className="font-['Barlow_Condensed'] text-3xl font-black uppercase text-white">ON</div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid min-h-0 grid-cols-2 gap-3 overflow-hidden">
                  {orderedStats(players[0]).slice(0, 12).map((stat, index) => (
                    <StatTile key={`${stat.label}-${index}`} stat={stat} accent={index % 2 ? secondaryAccent : accent} index={index} />
                  ))}
                </div>
              </section>
            </>
          )}

          {statsMode === 'COMPARE' && (
            <>
              <PlayerColumn player={visiblePlayers[0] || buildFallbackPayload(getField).players![0]} statsOverride={orderedStats(visiblePlayers[0] || buildFallbackPayload(getField).players![0])} accent={accent} index={0} />
              <div className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden border border-white/10 bg-black/65 p-5">
                <div className="font-['Barlow_Condensed'] text-[86px] font-black leading-none text-white">VS</div>
                <div className="my-5 h-44 w-px bg-white/15" />
                <Gauge size={46} color={accent} />
                <div className="mt-5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/44">Selected data</div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {(selectedMetrics.length ? selectedMetrics : categories).slice(0, 6).map((metric, index) => (
                    <span key={metric} className="border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: index % 2 ? secondaryAccent : accent }}>
                      {metric.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <PlayerColumn player={visiblePlayers[1] || buildFallbackPayload(getField).players![1]} statsOverride={orderedStats(visiblePlayers[1] || buildFallbackPayload(getField).players![1])} accent={secondaryAccent} index={6} />
            </>
          )}

          {statsMode === 'SCOUT_SHORTLIST' && visiblePlayers.map((player, index) => (
            <PlayerColumn key={`${player.name}-${index}`} player={player} statsOverride={orderedStats(player)} accent={index === 0 ? accent : index === 1 ? secondaryAccent : '#facc15'} index={index * 4} />
          ))}
        </main>
      </div>
    </div>
  );
};
