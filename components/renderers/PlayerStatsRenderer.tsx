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
  Info,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { RendererProps } from './SharedComponents';

type PlayerMetricValue = {
  status: 'available' | 'unavailable' | 'error';
  value?: string | number;
  source?: string;
  statGroup?: string;
  reason?: string;
  requiredStatGroup?: string;
  requiredColumn?: string;
  message?: string;
  label?: string; // Add optional fields from legacy
  labelAr?: string;
  category?: string;
  unit?: string;
};

type CoverageBlock = {
  status: string;
  availableStatGroups: string[];
  missingStatGroups: string[];
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
  metrics?: Record<string, PlayerMetricValue>;
  stats?: any; // Legacy
};

type PlayerStatsPayload = {
  mode?: string;
  source?: string;
  updatedAt?: string;
  generatedAt?: string;
  season?: string;
  coverage?: CoverageBlock;
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

const DEFAULT_METRICS: Record<string, PlayerMetricValue> = {
  goals: { status: 'available', value: '25', source: 'fbref', statGroup: 'standard' },
  shots_per90: { status: 'available', value: '3.8', source: 'fbref', statGroup: 'shooting' },
  key_passes: { status: 'available', value: '41', source: 'fbref', statGroup: 'passing' },
  progressive_passes: { status: 'available', value: '68', source: 'fbref', statGroup: 'passing' },
  duels_won: { status: 'available', value: '54', source: 'fbref', statGroup: 'defense' },
  recoveries: { status: 'available', value: '132', source: 'fbref', statGroup: 'defense' },
  touches_in_box: { status: 'available', value: '178', source: 'fbref', statGroup: 'attack' },
  minutes: { status: 'available', value: '2,640', source: 'fbref', statGroup: 'standard' },
};

const normalizePlayerStatsResponse = (payload: any): PlayerStatsPayload | null => {
  if (!payload || typeof payload !== 'object') return null;
  
  const clone = { ...payload } as PlayerStatsPayload;
  
  if (Array.isArray(clone.players)) {
    clone.players = clone.players.map(player => {
      // Fix Unknown position: try to extract from player's own pos field
      if (!player.position || player.position === 'Unknown') {
        player.position = (player as any).pos || player.position || 'Unknown';
      }

      // If it already has metrics, it's the new format
      if (player.metrics) return player;
      
      // If it has stats, it's the legacy format. We adapt it.
      const adaptedMetrics: Record<string, PlayerMetricValue> = {};
      if (Array.isArray(player.stats)) {
        player.stats.forEach((stat: any, index: number) => {
          const key = stat.key || stat.label?.toLowerCase().replace(/\\s+/g, '_') || `stat_${index}`;
          adaptedMetrics[key] = {
            status: stat.value === 'unavailable' || stat.value === 'pending' ? 'unavailable' : 'available',
            value: stat.value,
            source: stat.provider === 'demoProvider' || stat.provider === 'demo' ? 'demo' : (stat.provider || 'legacy'),
            statGroup: stat.category || 'legacy',
            reason: stat.warning || 'legacy_data',
            label: stat.label,
            labelAr: stat.labelAr,
            category: stat.category,
            unit: stat.unit
          };
        });
      } else if (player.stats && typeof player.stats === 'object') {
        Object.entries(player.stats).forEach(([key, val]: [string, any]) => {
          if (val && typeof val === 'object') {
            adaptedMetrics[key] = {
              status: val.value === 'unavailable' || val.value === 'pending' ? 'unavailable' : 'available',
              value: val.value,
              source: val.provider === 'demoProvider' || val.provider === 'demo' ? 'demo' : (val.provider || 'legacy'),
              statGroup: val.category || 'legacy',
              reason: val.warning || 'legacy_data',
              label: val.label,
              labelAr: val.labelAr,
              category: val.category,
              unit: val.unit
            };
          } else {
             adaptedMetrics[key] = {
              status: 'available',
              value: String(val),
              source: 'legacy'
            };
          }
        });
      }
      
      return { ...player, metrics: Object.keys(adaptedMetrics).length > 0 ? adaptedMetrics : DEFAULT_METRICS };
    });
  }
  
  return clone;
};

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
  const percent = raw.match(/(\\d+(?:\\.\\d+)?)\\s*%/);
  if (percent) return clamp(Number(percent[1]), 4, 100);
  const numeric = Number(raw.match(/\\d+(?:\\.\\d+)?/)?.[0] || 0);
  if (!numeric) return 34 + ((index * 9) % 38);
  return clamp(numeric > 100 ? 55 + (numeric % 40) : numeric * 8, 10, 100);
};

const formatTime = (value?: string) => {
  if (!value) return 'LIVE DATA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
  metrics: parseJson<any>(getField(`player${slot}StatsJson`)) ? normalizePlayerStatsResponse({ players: [{ stats: parseJson(getField(`player${slot}StatsJson`)) }] })?.players?.[0]?.metrics : fallback.metrics,
});

const buildFallbackPayload = (getField: RendererProps['getField']): PlayerStatsPayload => {
  const legacyStats = parseJson<any>(getField('playerStatsJson'));
  const parsedMetrics = legacyStats ? normalizePlayerStatsResponse({ players: [{ stats: legacyStats }] })?.players?.[0]?.metrics : null;
  const mode = String(getField('playerStatsMode') || 'SINGLE');
  
  const playerA: PlayerStatsCard = {
    name: String(getField('playerAName') || getField('playerName') || getField('sourcePlayerName') || 'Robert Lewandowski'),
    club: String(getField('playerAClub') || getField('playerTeam') || getField('sourceClubName') || 'Barcelona'),
    position: String(getField('playerAPosition') || getField('playerPosition') || 'Forward'),
    image: String(getField('playerAImage') || getField('playerImageLarge') || getField('playerImage') || ''),
    clubLogo: String(getField('playerAClubLogo') || getField('clubLogo') || ''),
    season: String(getField('seasonLabel') || '2025/26'),
    metrics: parsedMetrics || DEFAULT_METRICS,
  };

  // Build players list based on mode -- SINGLE mode gets only player A
  const playersList: PlayerStatsCard[] = [playerA];
  if (mode === 'COMPARE' || mode === 'SCOUT_SHORTLIST') {
    playersList.push(buildPlayer(getField, 'B', {
      name: '',
      club: '',
      position: '',
      season: playerA.season,
      metrics: {},
    }));
  }
  if (mode === 'SCOUT_SHORTLIST') {
    playersList.push(buildPlayer(getField, 'C', {
      name: '',
      club: '',
      position: '',
      season: playerA.season,
      metrics: {},
    }));
  }

  return {
    mode,
    source: String(getField('dataSourceName') || 'REO Player Data Bridge'),
    updatedAt: new Date().toISOString(),
    season: String(getField('seasonLabel') || '2025/26'),
    coverage: { status: 'partial', availableStatGroups: ['standard'], missingStatGroups: ['advanced'] },
    players: playersList.filter(p => p.name.trim()),
  };
};

const normalizePayload = (payload: PlayerStatsPayload | null, getField: RendererProps['getField']) => {
  const fallback = buildFallbackPayload(getField);
  const normalized = normalizePlayerStatsResponse(payload);
  if (!normalized || typeof normalized !== 'object') return fallback;

  // If API returned real players with real metrics, use them directly
  const hasRealPlayers = Array.isArray(normalized.players) && normalized.players.length > 0;
  if (!hasRealPlayers) return fallback;

  // Enrich API players with editor fields (image, clubLogo) but NEVER override metrics
  const enrichedPlayers = normalized.players!.map((player, index) => {
    const slot = index === 0 ? 'A' : index === 1 ? 'B' : 'C';
    return {
      ...player,
      image: player.image || String(getField(`player${slot}Image`) || getField('playerImageLarge') || getField('playerImage') || ''),
      clubLogo: player.clubLogo || String(getField(`player${slot}ClubLogo`) || getField('clubLogo') || ''),
      metrics: player.metrics && Object.keys(player.metrics).length > 0 ? player.metrics : DEFAULT_METRICS,
    };
  });

  return {
    ...normalized,
    source: normalized.source || fallback.source,
    coverage: normalized.coverage || fallback.coverage,
    players: enrichedPlayers,
  };
};

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

const StatTile = ({ metricKey, metric, accent, index }: { metricKey: string; metric: PlayerMetricValue; accent: string; index: number; key?: React.Key }) => {
  const displayLabel = metric.labelAr || metric.label || metricKey.replace(/_/g, ' ');
  const Icon = statIcon(displayLabel);
  
  if (metric.status === 'unavailable' || metric.status === 'error') {
    return (
      <div className="relative overflow-hidden border border-white/5 bg-black/40 p-4 opacity-50 grayscale">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/5 bg-white/[0.03]">
              <AlertCircle size={17} color="#666" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{displayLabel}</div>
              <div className="truncate text-[9px] font-bold text-rose-400/80 uppercase">
                {metric.reason === 'stat_group_not_available' ? `Requires ${metric.requiredStatGroup}` : metric.reason?.replace(/_/g, ' ') || 'Missing'}
              </div>
            </div>
          </div>
          <div className="font-['Barlow_Condensed'] text-xl font-black uppercase leading-none text-white/20">Unavailable</div>
        </div>
      </div>
    );
  }

  const width = statPercent(metric.value, index);
  const caption = [metric.source === 'demo' ? 'demo' : metric.source, metric.statGroup, metric.unit].filter(Boolean).join(' / ');
  
  return (
    <div className="relative overflow-hidden border border-white/10 bg-black/55 p-4">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.06]">
            <Icon size={17} color={accent} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{displayLabel}</div>
            <div className="truncate text-[11px] font-bold text-white/34">{caption || 'season data'}</div>
          </div>
        </div>
        <div className="font-['Barlow_Condensed'] text-[38px] font-black leading-none" style={{ color: accent }}>{metric.value}</div>
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
  metricsOverride,
}: {
  player: PlayerStatsCard;
  accent: string;
  index: number;
  metricsOverride?: Array<[string, PlayerMetricValue]>;
  key?: React.Key;
}) => {
  const displayMetrics = metricsOverride || Object.entries(player.metrics || DEFAULT_METRICS);
  
  return (
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
        {displayMetrics.slice(0, 6).map(([key, metric], statIndex) => (
          <StatTile key={`${player.name}-${key}-${statIndex}`} metricKey={key} metric={metric} accent={accent} index={statIndex + index} />
        ))}
      </div>
    </div>
  );
};

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
  
  const orderedMetrics = (player: PlayerStatsCard): Array<[string, PlayerMetricValue]> => {
    const metricsMap = player.metrics || DEFAULT_METRICS;
    const ordered = [...activeHeroMetrics, ...activeSecondaryMetrics]
      .filter(key => metricsMap[key])
      .map(key => [key, metricsMap[key]] as [string, PlayerMetricValue]);
    return ordered.length ? ordered : Object.entries(metricsMap);
  };

  const frameClass = visualVariant === 'GLASS_SCOUT'
    ? 'bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.18),transparent_34%),#071018]'
    : visualVariant === 'BARCA_RADAR'
      ? 'bg-[linear-gradient(135deg,#130016,#08142b_48%,#050608)]'
      : visualVariant === 'MINIMAL_CAST'
        ? 'bg-[#0b0d12]'
        : 'bg-[#080a0f]';
        
  const coverage = payload.coverage;

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
        
        {coverage && (
           <div className="absolute top-1 right-1 flex items-center gap-2 bg-black/60 border border-white/10 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-[0.1em] backdrop-blur-md z-10">
              <Info size={13} className={coverage.status === 'full' ? 'text-emerald-400' : 'text-amber-400'} />
              <span className={coverage.status === 'full' ? 'text-emerald-200' : 'text-amber-200'}>
                 {coverage.status === 'full' ? 'FULL FBREF CACHE' : 'PARTIAL FBREF CACHE'}
              </span>
              <span className="text-white/40 ml-2">Available: {coverage.availableStatGroups?.slice(0, 2).join(', ')}{coverage.availableStatGroups?.length > 2 ? '...' : ''}</span>
           </div>
        )}

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

        <main className={`grid min-h-0 gap-5 ${statsMode === 'SINGLE' ? 'grid-cols-[460px_1fr]' : statsMode === 'COMPARE' ? 'grid-cols-[1fr_260px_1fr]' : 'grid-cols-3'}`}>
          {statsMode === 'SINGLE' && players[0] && (() => {
            const allMetrics = orderedMetrics(players[0]);
            const availableMetrics = allMetrics.filter(([_, m]) => m.status === 'available');
            const missingMetrics = allMetrics.filter(([_, m]) => m.status === 'unavailable' || m.status === 'error');
            const showUnavailableBox = getField('showUnavailableMetrics') === 'true' && missingMetrics.length > 0;
            
            return (
            <>
              <section className="relative overflow-hidden border border-white/10 bg-black/70 shadow-[0_28px_90px_rgba(0,0,0,.5)]" style={{ animation: 'playerCardFloat 7s ease-in-out infinite' }}>
                <div className="absolute left-0 top-0 h-1 w-full" style={{ background: accent }} />
                <PlayerImage player={players[0]} accent={accent} large />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <ClubMark player={players[0]} accent={accent} />
                  <p className="mt-4 max-w-[430px] text-lg font-bold leading-snug text-white/62">{players[0].summary || subtitle}</p>
                </div>
              </section>
              <section className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-4">
                
                {/* Hero Metrics Area - Centered & Larger */}
                {availableMetrics.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 p-4">
                    {availableMetrics.slice(0, 4).map(([key, metric], index) => {
                       return (
                        <div key={key} className="flex flex-col items-center justify-center text-center p-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40 mb-1">{metric.labelAr || metric.label || key.replace(/_/g, ' ')}</div>
                          <div className="font-['Barlow_Condensed'] text-[42px] font-black uppercase text-white" style={{ color: index % 2 ? secondaryAccent : accent }}>
                            {metric.value}
                          </div>
                          <div className="text-[9px] font-bold text-white/30 uppercase mt-1">{metric.source === 'demo' ? 'demo' : metric.source} / {metric.statGroup}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Secondary Metrics Area */}
                <div className="grid min-h-0 grid-cols-2 gap-3 overflow-hidden mt-2">
                  {availableMetrics.slice(4, 16).map(([key, metric], index) => (
                    <StatTile key={`${key}-${index}`} metricKey={key} metric={metric} accent={index % 2 ? secondaryAccent : accent} index={index} />
                  ))}
                </div>

                {/* Missing Advanced Metrics Box */}
                {showUnavailableBox && (
                  <div className="mt-auto border border-dashed border-rose-500/30 bg-rose-500/5 p-3 flex flex-col gap-1.5">
                    <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Missing Advanced Metrics</div>
                    <div className="text-[10px] text-white/40 leading-snug">
                      {missingMetrics.map(([k, m]) => (
                        <div key={k}>- <strong className="text-white/60">{k.replace(/_/g, ' ')}</strong> requires <span className="text-rose-300/80">{m.requiredStatGroup || m.statGroup}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </>
          )})()}

          {statsMode === 'COMPARE' && (
            <>
              <PlayerColumn player={visiblePlayers[0] || players[0]} metricsOverride={orderedMetrics(visiblePlayers[0] || players[0])} accent={accent} index={0} />
              <div className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden border border-white/10 bg-black/65 p-5">
                <div className="font-['Barlow_Condensed'] text-[86px] font-black leading-none text-white">VS</div>
                <div className="my-5 h-44 w-px bg-white/15" />
                <Gauge size={46} color={accent} />
                <div className="mt-5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/44">Selected data</div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {(selectedMetrics.length ? selectedMetrics : []).slice(0, 6).map((metric, index) => (
                    <span key={metric} className="border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: index % 2 ? secondaryAccent : accent }}>
                      {metric.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              {visiblePlayers[1] ? (
                 <PlayerColumn player={visiblePlayers[1]} metricsOverride={orderedMetrics(visiblePlayers[1])} accent={secondaryAccent} index={6} />
              ) : (
                 <div className="flex items-center justify-center border border-white/10 bg-black/40 p-5 text-white/20 font-black uppercase tracking-widest text-sm">
                   Awaiting Player 2
                 </div>
              )}
            </>
          )}

          {statsMode === 'SCOUT_SHORTLIST' && visiblePlayers.map((player, index) => (
            <PlayerColumn key={`${player.name}-${index}`} player={player} metricsOverride={orderedMetrics(player)} accent={index === 0 ? accent : index === 1 ? secondaryAccent : '#facc15'} index={index * 4} />
          ))}
        </main>
      </div>
    </div>
  );
};
