import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RendererProps } from './SharedComponents';

type TeamStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passesAccurate: number;
  passAccuracy: number;
  corners: number;
  fouls: number;
  offsides: number;
  cards: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  aerialWon: number;
  keyPasses: number;
  dribbles: number;
  saves: number;
};

type PlayerStats = {
  id: string;
  name: string;
  teamId: string;
  isHome: boolean;
  position?: string;
  shirtNo?: string | number;
  shots: number;
  passes: number;
  passesAccurate: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  dribbles: number;
  saves: number;
  clearances: number;
  goals: number;
  assists: number;
  rating: number;
};

type MatchEvent = {
  minute: number;
  label: string;
  player: string;
  isHome: boolean;
  tone: 'goal' | 'card' | 'red' | 'event';
};

type MatchViewData = {
  match: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status?: string;
    competition?: string;
    venue?: string;
  };
  hStats: TeamStats;
  aStats: TeamStats;
  players: PlayerStats[];
  events: MatchEvent[];
  topPassers: PlayerStats[];
  topInterceptors: PlayerStats[];
  topCreators: PlayerStats[];
};

const emptyTeamStats = (): TeamStats => ({
  possession: 0,
  shots: 0,
  shotsOnTarget: 0,
  passes: 0,
  passesAccurate: 0,
  passAccuracy: 0,
  corners: 0,
  fouls: 0,
  offsides: 0,
  cards: 0,
  tackles: 0,
  interceptions: 0,
  clearances: 0,
  aerialWon: 0,
  keyPasses: 0,
  dribbles: 0,
  saves: 0,
});

const DEMO_MATCH_DATA = {
  match: {
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    homeScore: 2,
    awayScore: 1,
    status: 'LIVE',
    competition: 'Match Center',
  },
  homeStats: {
    possession: 58,
    shots: 14,
    shotsOnTarget: 6,
    passes: 522,
    passAccuracy: 91,
    corners: 7,
    fouls: 9,
    tackles: 18,
    interceptions: 11,
    keyPasses: 12,
    dribbles: 16,
    saves: 2,
  },
  awayStats: {
    possession: 42,
    shots: 9,
    shotsOnTarget: 4,
    passes: 391,
    passAccuracy: 86,
    corners: 4,
    fouls: 13,
    tackles: 21,
    interceptions: 9,
    keyPasses: 7,
    dribbles: 10,
    saves: 4,
  },
  goalEvents: [
    { minute: 24, player: 'Pedri', teamId: 'home' },
    { minute: 51, player: 'Vinicius Junior', teamId: 'away' },
    { minute: 77, player: 'Lamine Yamal', teamId: 'home' },
  ],
  cardEvents: [
    { minute: 63, player: 'Aurelien Tchouameni', teamId: 'away', cardType: 'YellowCard' },
  ],
  homePlayers: [
    { name: 'Pedri', teamId: 'home', passes: 82, keyPasses: 4, tackles: 3, interceptions: 2, dribbles: 3, shots: 2, rating: 8.5 },
    { name: 'Lamine Yamal', teamId: 'home', passes: 46, keyPasses: 5, tackles: 1, interceptions: 1, dribbles: 7, shots: 4, rating: 8.8 },
    { name: 'Frenkie de Jong', teamId: 'home', passes: 91, keyPasses: 2, tackles: 4, interceptions: 3, dribbles: 2, shots: 1, rating: 7.7 },
  ],
  awayPlayers: [
    { name: 'Jude Bellingham', teamId: 'away', passes: 55, keyPasses: 3, tackles: 4, interceptions: 2, dribbles: 4, shots: 3, rating: 7.9 },
    { name: 'Federico Valverde', teamId: 'away', passes: 62, keyPasses: 2, tackles: 5, interceptions: 3, dribbles: 2, shots: 2, rating: 7.5 },
    { name: 'Antonio Rudiger', teamId: 'away', passes: 48, keyPasses: 0, tackles: 6, interceptions: 4, clearances: 7, shots: 0, rating: 7.2 },
  ],
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const boolField = (value: unknown, fallback = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  }
  return fallback;
};

const displayName = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.displayName || record.name || record.value || '');
  }
  return String(value);
};

const shortTeam = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '---';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0].length <= 5) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 3).toUpperCase();
};

const playerShortName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : name;
};

const collectNumbers = (value: unknown): number[] => {
  if (typeof value === 'number' && Number.isFinite(value)) return [value];
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', '').trim());
    return Number.isFinite(parsed) ? [parsed] : [];
  }
  if (Array.isArray(value)) return value.flatMap(collectNumbers);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectNumbers);
  return [];
};

const sumMetric = (stats: unknown, aliases: string[]): number => {
  if (!stats || typeof stats !== 'object') return 0;
  const source = stats as Record<string, unknown>;
  return aliases.reduce((sum, key) => {
    const values = collectNumbers(source[key]);
    return sum + values.reduce((inner, item) => inner + item, 0);
  }, 0);
};

const latestMetric = (stats: unknown, aliases: string[]): number => {
  if (!stats || typeof stats !== 'object') return 0;
  const source = stats as Record<string, unknown>;
  for (const key of aliases) {
    const values = collectNumbers(source[key]);
    if (values.length) return values[values.length - 1];
  }
  return 0;
};

const normalizeTeamStats = (source: unknown): TeamStats => {
  const data = (source || {}) as Record<string, unknown>;
  const yellowCards = toNumber(data.yellowCards);
  const redCards = toNumber(data.redCards);
  const passes = toNumber(data.passes);
  const passAccuracy = toNumber(data.passAccuracy);
  const passesAccurate = toNumber(
    data.passesAccurate,
    passes && passAccuracy ? Math.round((passes * passAccuracy) / 100) : 0,
  );
  return {
    possession: toNumber(data.possession),
    shots: toNumber(data.shots),
    shotsOnTarget: toNumber(data.shotsOnTarget),
    passes,
    passesAccurate,
    passAccuracy: passAccuracy || (passes ? Math.round((passesAccurate / passes) * 100) : 0),
    corners: toNumber(data.corners),
    fouls: toNumber(data.fouls),
    offsides: toNumber(data.offsides),
    cards: toNumber(data.cards, yellowCards + redCards),
    tackles: toNumber(data.tackles),
    interceptions: toNumber(data.interceptions),
    clearances: toNumber(data.clearances),
    aerialWon: toNumber(data.aerialWon),
    keyPasses: toNumber(data.keyPasses),
    dribbles: toNumber(data.dribbles),
    saves: toNumber(data.saves),
  };
};

const emptyPlayer = (id: string, name: string, teamId: string, isHome: boolean): PlayerStats => ({
  id,
  name,
  teamId,
  isHome,
  shots: 0,
  passes: 0,
  passesAccurate: 0,
  keyPasses: 0,
  tackles: 0,
  interceptions: 0,
  dribbles: 0,
  saves: 0,
  clearances: 0,
  goals: 0,
  assists: 0,
  rating: 0,
});

const parseScore = (raw: Record<string, unknown>) => {
  const score = String(raw.score || '');
  if (score.includes('-')) {
    const [homeScore, awayScore] = score.split('-').map(part => toNumber(part.trim()));
    return { homeScore, awayScore };
  }
  return {
    homeScore: toNumber(raw.homeScore ?? (raw.home as Record<string, unknown> | undefined)?.score),
    awayScore: toNumber(raw.awayScore ?? (raw.away as Record<string, unknown> | undefined)?.score),
  };
};

const buildTopLists = (players: PlayerStats[]) => ({
  topPassers: [...players].sort((a, b) => b.passes - a.passes).slice(0, 5),
  topInterceptors: [...players]
    .sort((a, b) => (b.interceptions + b.tackles + b.clearances) - (a.interceptions + a.tackles + a.clearances))
    .slice(0, 5),
  topCreators: [...players]
    .sort((a, b) => (b.keyPasses + b.assists) - (a.keyPasses + a.assists))
    .slice(0, 5),
});

const normalizeStructuredOutput = (raw: Record<string, unknown>): MatchViewData | null => {
  const matchRaw = (raw.match || {}) as Record<string, unknown>;
  if (!raw.homeStats && !raw.awayStats && !matchRaw.homeTeam && !matchRaw.awayTeam) return null;

  const homeId = String(matchRaw.homeTeamId || 'home');
  const awayId = String(matchRaw.awayTeamId || 'away');
  const homeTeam = String(matchRaw.homeTeam || raw.homeTeamName || 'Home');
  const awayTeam = String(matchRaw.awayTeam || raw.awayTeamName || 'Away');
  const hStats = normalizeTeamStats(raw.homeStats);
  const aStats = normalizeTeamStats(raw.awayStats);

  const normalizePlayerList = (list: unknown, isHome: boolean): PlayerStats[] => {
    if (!Array.isArray(list)) return [];
    return list.map((player, index) => {
      const source = (player || {}) as Record<string, unknown>;
      const teamId = String(source.teamId || (isHome ? homeId : awayId));
      const normalized = emptyPlayer(
        String(source.id || source.playerId || `${teamId}-${index}`),
        String(source.name || source.playerName || `Player ${index + 1}`),
        teamId,
        isHome,
      );
      normalized.position = source.position ? String(source.position) : undefined;
      normalized.shirtNo = source.shirtNo as string | number | undefined;
      normalized.shots = toNumber(source.shots);
      normalized.passes = toNumber(source.passes);
      normalized.passesAccurate = toNumber(source.passesAccurate);
      normalized.keyPasses = toNumber(source.keyPasses);
      normalized.tackles = toNumber(source.tackles);
      normalized.interceptions = toNumber(source.interceptions);
      normalized.dribbles = toNumber(source.dribbles);
      normalized.saves = toNumber(source.saves);
      normalized.clearances = toNumber(source.clearances);
      normalized.goals = toNumber(source.goals);
      normalized.assists = toNumber(source.assists);
      normalized.rating = toNumber(source.rating);
      return normalized;
    });
  };

  const players = [
    ...normalizePlayerList(raw.homePlayers, true),
    ...normalizePlayerList(raw.awayPlayers, false),
  ];

  const goalEvents = Array.isArray(raw.goalEvents) ? raw.goalEvents : [];
  const cardEvents = Array.isArray(raw.cardEvents) ? raw.cardEvents : [];
  const events: MatchEvent[] = [
    ...goalEvents.map((event: any) => ({
      minute: toNumber(event.minute),
      label: 'GOAL',
      player: String(event.player || 'Unknown'),
      isHome: String(event.teamId || homeId) === homeId,
      tone: 'goal' as const,
    })),
    ...cardEvents.map((event: any) => {
      const cardType = String(event.cardType || 'YellowCard');
      return {
        minute: toNumber(event.minute),
        label: cardType === 'RedCard' || cardType === 'YellowRedCard' ? 'RED CARD' : 'YELLOW CARD',
        player: String(event.player || 'Unknown'),
        isHome: String(event.teamId || homeId) === homeId,
        tone: (cardType === 'RedCard' || cardType === 'YellowRedCard' ? 'red' : 'card') as MatchEvent['tone'],
      };
    }),
  ].sort((a, b) => a.minute - b.minute);

  const topLists = buildTopLists(players);
  return {
    match: {
      homeTeam,
      awayTeam,
      homeScore: toNumber(matchRaw.homeScore),
      awayScore: toNumber(matchRaw.awayScore),
      status: String(matchRaw.status || ''),
      competition: String(matchRaw.competition || ''),
      venue: String(matchRaw.venue || ''),
    },
    hStats,
    aStats,
    players,
    events,
    ...topLists,
  };
};

const normalizeWhoScoredRaw = (raw: Record<string, unknown>): MatchViewData | null => {
  const home = (raw.home || {}) as Record<string, unknown>;
  const away = (raw.away || {}) as Record<string, unknown>;
  if (!raw.events || !home) return null;

  const homeId = String(home.teamId || raw.homeTeamId || 'home');
  const awayId = String(away.teamId || raw.awayTeamId || 'away');
  const score = parseScore(raw);
  const hStats = emptyTeamStats();
  const aStats = emptyTeamStats();
  const teamStatsById: Record<string, TeamStats> = { [homeId]: hStats, [awayId]: aStats };
  const playerDict: Record<string, string> = {};
  const playersById: Record<string, PlayerStats> = {};
  const events: MatchEvent[] = [];

  Object.entries((raw.playerIdNameDictionary || {}) as Record<string, unknown>).forEach(([id, name]) => {
    playerDict[String(id)] = String(name);
  });

  const ensurePlayer = (id: string, teamId: string, fallbackName?: string) => {
    const isHome = teamId === homeId;
    if (!playersById[id]) {
      playersById[id] = emptyPlayer(id, fallbackName || playerDict[id] || `Player ${id}`, teamId, isHome);
    }
    return playersById[id];
  };

  (Array.isArray(raw.events) ? raw.events : []).forEach((event: any) => {
    const teamId = String(event.teamId || '');
    const stats = teamStatsById[teamId];
    if (!stats) return;

    const playerId = event.playerId ? String(event.playerId) : '';
    const player = playerId ? ensurePlayer(playerId, teamId) : null;
    const type = displayName(event.type);
    const outcome = displayName(event.outcomeType);
    const success = ['Successful', 'Success', 'SuccessInPlay', 'SuccessOut'].includes(outcome);

    if (type === 'Pass') {
      stats.passes += 1;
      if (success) stats.passesAccurate += 1;
      if (player) {
        player.passes += 1;
        if (success) player.passesAccurate += 1;
      }
    } else if (['SavedShot', 'MissedShots', 'BlockedShot', 'ShotOnPost', 'Goal'].includes(type)) {
      stats.shots += 1;
      if (player) player.shots += 1;
      if (type === 'SavedShot' || type === 'Goal') stats.shotsOnTarget += 1;
      if (type === 'Goal' && player) player.goals += 1;
    } else if (type === 'CornerAwarded') {
      stats.corners += 1;
    } else if (type === 'Foul') {
      stats.fouls += 1;
    } else if (type === 'Offside') {
      stats.offsides += 1;
    } else if (type === 'Tackle') {
      stats.tackles += 1;
      if (player) player.tackles += 1;
    } else if (type === 'Interception') {
      stats.interceptions += 1;
      if (player) player.interceptions += 1;
    } else if (type === 'Clearance') {
      stats.clearances += 1;
      if (player) player.clearances += 1;
    } else if (type === 'Aerial' && success) {
      stats.aerialWon += 1;
    } else if (type === 'KeyPass') {
      stats.keyPasses += 1;
      if (player) player.keyPasses += 1;
    } else if (['TakeOn', 'Dribble'].includes(type) && success) {
      stats.dribbles += 1;
      if (player) player.dribbles += 1;
    } else if (type === 'Save') {
      stats.saves += 1;
      if (player) player.saves += 1;
    } else if (['YellowCard', 'RedCard', 'YellowRedCard'].includes(type)) {
      stats.cards += 1;
    }

    if (type === 'Goal') {
      events.push({
        minute: toNumber(event.minute),
        label: 'GOAL',
        player: player?.name || playerDict[playerId] || 'Unknown',
        isHome: teamId === homeId,
        tone: 'goal',
      });
    }

    if (['YellowCard', 'RedCard', 'YellowRedCard'].includes(type)) {
      events.push({
        minute: toNumber(event.minute),
        label: type === 'YellowCard' ? 'YELLOW CARD' : 'RED CARD',
        player: player?.name || playerDict[playerId] || 'Unknown',
        isHome: teamId === homeId,
        tone: type === 'YellowCard' ? 'card' : 'red',
      });
    }
  });

  const hydratePlayers = (side: Record<string, unknown>, sideTeamId: string, isHome: boolean) => {
    const sidePlayers = Array.isArray(side.players) ? side.players : [];
    sidePlayers.forEach((player: any, index: number) => {
      const playerId = String(player.playerId || player.id || `${sideTeamId}-${index}`);
      const name = String(player.name || playerDict[playerId] || `Player ${index + 1}`);
      const item = ensurePlayer(playerId, sideTeamId, name);
      item.name = name;
      item.teamId = sideTeamId;
      item.isHome = isHome;
      item.position = player.position || player.field || item.position;
      item.shirtNo = player.shirtNo ?? item.shirtNo;
      const stats = player.stats || {};
      item.passes = Math.max(item.passes, sumMetric(stats, ['passes', 'totalPasses']));
      item.passesAccurate = Math.max(item.passesAccurate, sumMetric(stats, ['passesAccurate', 'accuratePasses', 'accuratePass']));
      item.keyPasses = Math.max(item.keyPasses, sumMetric(stats, ['keyPasses', 'keyPass']));
      item.tackles = Math.max(item.tackles, sumMetric(stats, ['tackles', 'totalTackles']));
      item.interceptions = Math.max(item.interceptions, sumMetric(stats, ['interceptions']));
      item.dribbles = Math.max(item.dribbles, sumMetric(stats, ['dribbles', 'successfulDribbles', 'dribbleWon']));
      item.shots = Math.max(item.shots, sumMetric(stats, ['shots', 'shotsTotal', 'totalShots']));
      item.clearances = Math.max(item.clearances, sumMetric(stats, ['clearances']));
      item.saves = Math.max(item.saves, sumMetric(stats, ['saves']));
      item.rating = Math.max(item.rating, latestMetric(stats, ['ratings', 'rating']), toNumber(player.rating));
    });
  };

  hydratePlayers(home, homeId, true);
  hydratePlayers(away, awayId, false);

  const players = Object.values(playersById);
  const applyPlayerTotals = (stats: TeamStats, isHome: boolean) => {
    const sidePlayers = players.filter(player => player.isHome === isHome);
    stats.passes = Math.max(stats.passes, sidePlayers.reduce((sum, player) => sum + player.passes, 0));
    stats.passesAccurate = Math.max(stats.passesAccurate, sidePlayers.reduce((sum, player) => sum + player.passesAccurate, 0));
    stats.keyPasses = Math.max(stats.keyPasses, sidePlayers.reduce((sum, player) => sum + player.keyPasses, 0));
    stats.tackles = Math.max(stats.tackles, sidePlayers.reduce((sum, player) => sum + player.tackles, 0));
    stats.interceptions = Math.max(stats.interceptions, sidePlayers.reduce((sum, player) => sum + player.interceptions, 0));
    stats.dribbles = Math.max(stats.dribbles, sidePlayers.reduce((sum, player) => sum + player.dribbles, 0));
    stats.shots = Math.max(stats.shots, sidePlayers.reduce((sum, player) => sum + player.shots, 0));
    stats.saves = Math.max(stats.saves, sidePlayers.reduce((sum, player) => sum + player.saves, 0));
    stats.clearances = Math.max(stats.clearances, sidePlayers.reduce((sum, player) => sum + player.clearances, 0));
  };

  applyPlayerTotals(hStats, true);
  applyPlayerTotals(aStats, false);
  const totalPasses = hStats.passes + aStats.passes;
  hStats.possession = toNumber(raw.homePossession, totalPasses ? Math.round((hStats.passes / totalPasses) * 100) : 50);
  aStats.possession = toNumber(raw.awayPossession, 100 - hStats.possession);
  hStats.passAccuracy = hStats.passes ? Math.round((hStats.passesAccurate / hStats.passes) * 100) : hStats.passAccuracy;
  aStats.passAccuracy = aStats.passes ? Math.round((aStats.passesAccurate / aStats.passes) * 100) : aStats.passAccuracy;

  const topLists = buildTopLists(players);
  return {
    match: {
      homeTeam: String(home.name || raw.homeTeamName || 'Home'),
      awayTeam: String(away.name || raw.awayTeamName || 'Away'),
      homeScore: score.homeScore,
      awayScore: score.awayScore,
      status: String(raw.statusCode || raw.period || ''),
      competition: String(raw.competitionName || ''),
      venue: String(raw.venueName || ''),
    },
    hStats,
    aStats,
    players,
    events: events.sort((a, b) => a.minute - b.minute),
    ...topLists,
  };
};

const normalizeMatchData = (rawJson: unknown): MatchViewData | null => {
  if (!rawJson || typeof rawJson !== 'object') return null;
  const raw = rawJson as Record<string, unknown>;
  return normalizeStructuredOutput(raw) || normalizeWhoScoredRaw(raw);
};

export const MatchStatsRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, playSound, wasVisible,
}) => {
  const dataMode = String(getField('dataMode') || 'BRIDGE');
  const apiUrl = String(getField('apiUrl') || 'http://127.0.0.1:3005/api/match');
  const manualJson = String(getField('manualJson') || '');
  const pollIntervalSec = clamp(toNumber(getField('pollIntervalSec'), 10), 3, 60);
  const homeColor = String(getField('homeColor') || '#3b82f6');
  const awayColor = String(getField('awayColor') || '#ef4444');
  const showScorebug = boolField(getField('showScorebug'), true);
  const showDominance = boolField(getField('showDominance'), true);
  const showMotm = boolField(getField('showMotm'), true);
  const showTopStats = boolField(getField('showTopStats'), true);
  const showEvents = boolField(getField('showEvents'), true);
  const showKeyBattle = boolField(getField('showKeyBattle'), true);
  const showAdvancedStats = boolField(getField('showAdvancedStats'), true);
  const panelSide = String(getField('panelSide') || 'RIGHT');

  const [rawJson, setRawJson] = useState<unknown>(null);
  const [errorStatus, setErrorStatus] = useState<string>('');

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) {
      didPlay.current = true;
      playSound('ENTRY').catch(() => { });
    }
  }, [wasVisible, playSound]);

  useEffect(() => {
    if (dataMode === 'DEMO') {
      setRawJson(DEMO_MATCH_DATA);
      setErrorStatus('');
      return undefined;
    }

    if (dataMode === 'PASTE_JSON') {
      if (!manualJson.trim()) {
        setRawJson(null);
        setErrorStatus('الصق JSON المباراة أو استورد ملف extractor من لوحة التحرير.');
        return undefined;
      }

      try {
        setRawJson(JSON.parse(manualJson));
        setErrorStatus('');
      } catch {
        setRawJson(null);
        setErrorStatus('JSON المباراة غير صالح. تأكد من نسخ الملف كاملا بدون حذف الأقواس.');
      }
      return undefined;
    }

    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch(apiUrl, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setErrorStatus('لم تصل بيانات من الجسر المحلي بعد. شغل تطبيق Match Stats ثم ابدأ السحب.');
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setRawJson(data);
          setErrorStatus('');
        }
      } catch {
        if (!cancelled) {
          setErrorStatus('تعذر الاتصال بـ Live Bridge. استخدم زر استيراد JSON كمسار احتياطي مضمون.');
        }
      }
    };

    fetchData();
    const interval = window.setInterval(fetchData, pollIntervalSec * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiUrl, dataMode, manualJson, pollIntervalSec]);

  const parsedData = useMemo(() => normalizeMatchData(rawJson), [rawJson]);

  if (!parsedData) {
    return (
      <div style={containerStyle}>
        <div className="flex h-full w-full items-center justify-center p-8">
          <div className="flex max-w-[520px] flex-col items-center gap-4 rounded-xl border border-red-500/50 bg-black/80 p-8 text-center text-xl font-bold text-white">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
            <div>{errorStatus || 'جاري تجهيز بيانات المباراة...'}</div>
          </div>
        </div>
      </div>
    );
  }

  const { match, hStats, aStats, players, topPassers, topInterceptors, topCreators, events } = parsedData;
  const totalPasses = hStats.passes + aStats.passes;
  const possHome = clamp(Math.round(hStats.possession || (totalPasses ? (hStats.passes / totalPasses) * 100 : 50)), 0, 100);
  const shotTotal = hStats.shots + aStats.shots;
  const shotShare = shotTotal > 0 ? hStats.shots / shotTotal : 0.5;
  const keyTotal = hStats.keyPasses + aStats.keyPasses;
  const keyShare = keyTotal > 0 ? hStats.keyPasses / keyTotal : 0.5;
  const domHome = clamp(Math.round((possHome / 100 * 0.5 + shotShare * 0.3 + keyShare * 0.2) * 100), 0, 100);
  const motm = [...players].filter(player => player.rating > 0).sort((a, b) => b.rating - a.rating)[0];
  const latestEvents = [...events].slice(-4).reverse();
  const keyCreator = topCreators.find(player => player.keyPasses > 0 || player.assists > 0);
  const keyDefender = topInterceptors.find(player => player.tackles > 0 || player.interceptions > 0 || player.clearances > 0);
  const panelJustify = panelSide === 'LEFT' ? 'justify-start' : 'justify-end';
  const advancedStats = [
    { label: 'دقة التمرير', home: hStats.passAccuracy, away: aStats.passAccuracy, suffix: '%' },
    { label: 'ركنيات', home: hStats.corners, away: aStats.corners },
    { label: 'مراوغات ناجحة', home: hStats.dribbles, away: aStats.dribbles },
    { label: 'تصديات', home: hStats.saves, away: aStats.saves },
    { label: 'أخطاء', home: hStats.fouls, away: aStats.fouls },
    { label: 'تسلل', home: hStats.offsides, away: aStats.offsides },
    { label: 'بطاقات', home: hStats.cards, away: aStats.cards },
    { label: 'إبعادات', home: hStats.clearances, away: aStats.clearances },
    { label: 'التحامات هوائية', home: hStats.aerialWon, away: aStats.aerialWon },
  ];

  const SimpleStatBar = ({
    label,
    v1,
    v2,
    display1,
    display2,
    suffix = '',
  }: {
    label: string;
    v1: number;
    v2: number;
    display1?: React.ReactNode;
    display2?: React.ReactNode;
    suffix?: string;
  }) => {
    const total = Math.max(1, Math.abs(v1) + Math.abs(v2));
    const pct1 = clamp((v1 / total) * 100, 0, 100);
    return (
      <div className="mb-2.5">
        <div className="mb-1.5 flex justify-between text-[11px] text-white/70">
          <span className="text-sm font-bold" style={{ color: homeColor, fontFamily: 'Barlow Condensed' }}>{display1 ?? v1}{suffix}</span>
          <span className="font-bold uppercase tracking-widest text-white/55">{label}</span>
          <span className="text-sm font-bold" style={{ color: awayColor, fontFamily: 'Barlow Condensed' }}>{display2 ?? v2}{suffix}</span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full transition-all duration-1000" style={{ width: `${pct1}%`, background: homeColor }} />
          <div className="h-full transition-all duration-1000" style={{ width: `${100 - pct1}%`, background: awayColor }} />
        </div>
      </div>
    );
  };

  const TopList = ({ title, data, valKey }: { title: string; data: PlayerStats[]; valKey: keyof PlayerStats }) => (
    <div className="flex-1 rounded-xl border border-white/5 bg-black/40 p-3">
      <h3 className="mb-2 border-b border-white/5 pb-1.5 text-center text-[9px] uppercase tracking-widest text-white/40">{title}</h3>
      <div className="flex flex-col gap-1.5">
        {data.length ? data.slice(0, 3).map((player, index) => (
          <div key={`${player.id}-${index}`} className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-4 w-1.5 shrink-0 rounded-sm" style={{ background: player.isHome ? homeColor : awayColor }} />
              <span className="max-w-[100px] truncate text-xs font-bold text-white" title={player.name}>{playerShortName(player.name)}</span>
            </div>
            <span className="font-['Barlow_Condensed'] text-sm font-black" style={{ color: player.isHome ? homeColor : awayColor }}>
              {Number(player[valKey]) || 0}
            </span>
          </div>
        )) : (
          <div className="rounded bg-white/5 px-2 py-3 text-center text-[11px] text-white/35">لا توجد بيانات كافية</div>
        )}
      </div>
    </div>
  );

  const AdvancedStatTile: React.FC<{ label: string; home: number; away: number; suffix?: string }> = ({ label, home, away, suffix = '' }) => {
    const homeWins = home > away;
    const awayWins = away > home;
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.045] px-2.5 py-2">
        <div className="mb-1 text-center text-[9px] font-black uppercase tracking-widest text-white/40">{label}</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-['Barlow_Condensed'] text-xl font-black">
          <div className="text-left" style={{ color: homeWins ? homeColor : 'rgba(255,255,255,0.55)' }}>{home}{suffix}</div>
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${clamp((home / Math.max(1, home + away)) * 100, 0, 100)}%`, background: `linear-gradient(90deg, ${homeColor}, ${awayColor})` }} />
          </div>
          <div className="text-right" style={{ color: awayWins ? awayColor : 'rgba(255,255,255,0.55)' }}>{away}{suffix}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Cairo:wght@600;700&display=swap" rel="stylesheet" />
      <div className={`flex h-full w-full ${panelJustify} overflow-hidden p-8`} style={{ direction: 'ltr' }}>
        <div dir="rtl" className="flex h-full w-[480px] flex-col gap-3 font-['Cairo']">
          {showScorebug && (
            <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
              <div className="absolute right-2 top-1 flex items-center gap-1">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-red-500">{dataMode === 'BRIDGE' ? 'LIVE DATA' : 'JSON DATA'}</span>
              </div>

              <div className="relative mt-2 flex h-16 min-w-0 flex-1 flex-col justify-center pl-4">
                <div className="absolute bottom-0 left-0 top-0 w-1.5" style={{ background: homeColor }} />
                <div className="font-['Barlow_Condensed'] text-3xl font-black text-white">{shortTeam(match.homeTeam)}</div>
                <div className="max-w-[130px] truncate text-[9px] font-bold uppercase tracking-widest text-white/40">{match.homeTeam}</div>
              </div>
              <div className="mt-2 flex h-16 items-center justify-center bg-black/80 px-6 font-['Barlow_Condensed'] text-4xl font-black text-white">
                {match.homeScore} <span className="mx-2 text-2xl text-white/30">:</span> {match.awayScore}
              </div>
              <div className="relative mt-2 flex h-16 min-w-0 flex-1 flex-col items-end justify-center pr-4">
                <div className="absolute bottom-0 right-0 top-0 w-1.5" style={{ background: awayColor }} />
                <div className="font-['Barlow_Condensed'] text-3xl font-black text-white">{shortTeam(match.awayTeam)}</div>
                <div className="max-w-[130px] truncate text-[9px] font-bold uppercase tracking-widest text-white/40">{match.awayTeam}</div>
              </div>
            </div>
          )}

          {showDominance && (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 rounded-xl border border-white/5 bg-black/40 p-3">
                <div className="mb-2 text-center text-[10px] uppercase tracking-widest text-white/50">Live Dominance Index</div>
                <div className="flex items-center gap-3 font-['Barlow_Condensed'] text-2xl font-black">
                  <div style={{ color: homeColor }}>{domHome}%</div>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10 shadow-inner">
                    <div className="absolute bottom-0 left-0 top-0 transition-all duration-1000" style={{ width: `${domHome}%`, background: `linear-gradient(90deg, ${homeColor}, ${awayColor})` }} />
                    <div className="absolute bottom-0 left-1/2 top-0 z-10 w-0.5 bg-white" />
                  </div>
                  <div style={{ color: awayColor }}>{100 - domHome}%</div>
                </div>
              </div>

              <SimpleStatBar label="الاستحواذ" v1={possHome} v2={100 - possHome} suffix="%" />
              <SimpleStatBar
                label="التسديدات (على المرمى)"
                v1={hStats.shots}
                v2={aStats.shots}
                display1={`${hStats.shots} (${hStats.shotsOnTarget})`}
                display2={`${aStats.shots} (${aStats.shotsOnTarget})`}
              />
              <SimpleStatBar label="التمريرات" v1={hStats.passes} v2={aStats.passes} />
              <SimpleStatBar label="الفرص المفتاحية" v1={hStats.keyPasses} v2={aStats.keyPasses} />
              <SimpleStatBar label="التدخلات والقطع" v1={hStats.tackles + hStats.interceptions} v2={aStats.tackles + aStats.interceptions} />
            </div>
          )}

          {showAdvancedStats && (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>Advanced Match Data</span>
                <span>{dataMode === 'BRIDGE' ? 'AUTO 60S' : 'SNAPSHOT'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {advancedStats.map(stat => (
                  <AdvancedStatTile key={stat.label} {...stat} />
                ))}
              </div>
            </div>
          )}

          {showEvents && latestEvents.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>Match Events</span>
                <span>{match.status || match.competition || 'LIVE'}</span>
              </div>
              <div className="flex flex-col gap-2">
                {latestEvents.map((event, index) => (
                  <div key={`${event.minute}-${event.player}-${index}`} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.04] px-3 py-1.5">
                    <div className="w-9 text-center font-['Barlow_Condensed'] text-xl font-black" style={{ color: event.isHome ? homeColor : awayColor }}>{event.minute}'</div>
                    <div className={`rounded px-2 py-0.5 text-[9px] font-black ${event.tone === 'goal' ? 'bg-emerald-500/15 text-emerald-300' : event.tone === 'red' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
                      {event.label}
                    </div>
                    <div className="min-w-0 flex-1 truncate text-xs font-bold text-white">{event.player}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showTopStats && (
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 shadow-2xl backdrop-blur-xl">
              <TopList title="صناع الفرص" data={topCreators} valKey="keyPasses" />
              <TopList title="قاطعي الكرات" data={topInterceptors} valKey="interceptions" />
            </div>
          )}

          {showKeyBattle && keyCreator && keyDefender && (
            <div className="rounded-2xl border border-cyan-400/20 bg-black/60 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 text-center text-[10px] font-black uppercase tracking-widest text-cyan-300/70">Key Battle</div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-bold text-white">{keyCreator.name}</div>
                  <div className="font-['Barlow_Condensed'] text-xl font-black" style={{ color: keyCreator.isHome ? homeColor : awayColor }}>
                    {keyCreator.keyPasses + keyCreator.assists}
                  </div>
                  <div className="text-[10px] text-white/40">فرص</div>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 font-['Barlow_Condensed'] text-sm font-black text-white/50">VS</div>
                <div className="min-w-0 text-right">
                  <div className="truncate text-sm font-bold text-white">{keyDefender.name}</div>
                  <div className="font-['Barlow_Condensed'] text-xl font-black" style={{ color: keyDefender.isHome ? homeColor : awayColor }}>
                    {keyDefender.tackles + keyDefender.interceptions + keyDefender.clearances}
                  </div>
                  <div className="text-[10px] text-white/40">افتكاكات</div>
                </div>
              </div>
            </div>
          )}

          {showMotm && motm && (
            <div className="relative mt-1">
              <div className="absolute -top-3 left-4 z-10 rounded-t-lg bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-0.5 font-['Barlow_Condensed'] text-[10px] font-black tracking-widest text-black">
                LIVE MOTM
              </div>
              <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-amber-500/30 bg-black/60 p-3 shadow-[0_0_20px_rgba(245,158,11,0.1)] backdrop-blur-xl">
                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative z-10 flex flex-col">
                  <h1 className="text-base font-bold leading-tight text-white">{motm.name}</h1>
                  <h3 className="text-[10px] uppercase tracking-widest text-white/50">{motm.isHome ? match.homeTeam : match.awayTeam}</h3>
                </div>
                <div className="relative z-10 font-['Barlow_Condensed'] text-4xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                  {motm.rating.toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
