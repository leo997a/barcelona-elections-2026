import React, { useEffect, useMemo, useState } from 'react';
import { RendererProps } from './SharedComponents';

type TeamStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  blockedShots: number;
  shotAccuracy: number;
  goals: number;
  passes: number;
  passesAccurate: number;
  passAccuracy: number;
  corners: number;
  crosses: number;
  longBalls: number;
  throughBalls: number;
  keyPasses: number;
  finalThirdEntries: number;
  boxTouches: number;
  dribbles: number;
  dribbleSuccessRate: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  blocks: number;
  aerialWon: number;
  aerialLost: number;
  aerialWinRate: number;
  saves: number;
  saveRate: number;
  fouls: number;
  offsides: number;
  yellowCards: number;
  redCards: number;
  cards: number;
  dispossessed: number;
  turnovers: number;
  ballRecoveries: number;
};

type PlayerStats = {
  id: string;
  name: string;
  teamId: string;
  isHome: boolean;
  position?: string;
  shirtNo?: string | number;
  shots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  blockedShots: number;
  shotAccuracy: number;
  passes: number;
  passesAccurate: number;
  passAccuracy: number;
  keyPasses: number;
  crosses: number;
  longBalls: number;
  throughBalls: number;
  finalThirdPasses: number;
  boxTouches: number;
  tackles: number;
  interceptions: number;
  dribbles: number;
  dribbleSuccess: number;
  dribbleSuccessRate: number;
  aerialWon: number;
  aerialLost: number;
  blocks: number;
  ballRecoveries: number;
  dispossessed: number;
  turnovers: number;
  foulsCommitted: number;
  saves: number;
  clearances: number;
  goals: number;
  assists: number;
};

type MatchEvent = {
  minute: number;
  label: string;
  player: string;
  isHome: boolean;
  tone: 'goal' | 'card' | 'red' | 'event';
};

type MatchViewData = {
  meta?: {
    extractedAt?: string;
    sourceUrl?: string;
    scoreSource?: string;
  };
  match: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    homeTeamId?: string | number;
    awayTeamId?: string | number;
    homeLogo?: string;
    awayLogo?: string;
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

type StatItem = {
  id: string;
  label: string;
  home: number;
  away: number;
  suffix?: string;
  decimals?: number;
};

type StatGroup = {
  id: string;
  title: string;
  subtitle: string;
  items: StatItem[];
};

const numberKeys: Array<keyof TeamStats> = [
  'possession',
  'shots',
  'shotsOnTarget',
  'shotsOffTarget',
  'blockedShots',
  'shotAccuracy',
  'goals',
  'passes',
  'passesAccurate',
  'passAccuracy',
  'corners',
  'crosses',
  'longBalls',
  'throughBalls',
  'keyPasses',
  'finalThirdEntries',
  'boxTouches',
  'dribbles',
  'dribbleSuccessRate',
  'tackles',
  'interceptions',
  'clearances',
  'blocks',
  'aerialWon',
  'aerialLost',
  'aerialWinRate',
  'saves',
  'saveRate',
  'fouls',
  'offsides',
  'yellowCards',
  'redCards',
  'cards',
  'dispossessed',
  'turnovers',
  'ballRecoveries',
];

const emptyTeamStats = (): TeamStats => numberKeys.reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {} as TeamStats);

const DEMO_MATCH_DATA = {
  meta: { extractedAt: new Date().toISOString() },
  match: {
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    homeTeamId: 65,
    awayTeamId: 52,
    homeScore: 2,
    awayScore: 1,
    status: 'LIVE',
    competition: 'Match Center',
  },
  homeStats: {
    possession: 58,
    shots: 14,
    shotsOnTarget: 6,
    shotsOffTarget: 5,
    blockedShots: 3,
    passes: 522,
    passesAccurate: 475,
    passAccuracy: 91,
    corners: 7,
    crosses: 18,
    longBalls: 31,
    throughBalls: 4,
    keyPasses: 12,
    finalThirdEntries: 42,
    boxTouches: 24,
    dribbles: 16,
    dribbleSuccessRate: 64,
    tackles: 18,
    interceptions: 11,
    clearances: 13,
    blocks: 4,
    aerialWon: 9,
    aerialLost: 8,
    aerialWinRate: 53,
    saves: 2,
    saveRate: 67,
    fouls: 9,
    offsides: 2,
    yellowCards: 1,
    redCards: 0,
    cards: 1,
    dispossessed: 8,
    turnovers: 6,
    ballRecoveries: 47,
  },
  awayStats: {
    possession: 42,
    shots: 9,
    shotsOnTarget: 4,
    shotsOffTarget: 3,
    blockedShots: 2,
    passes: 391,
    passesAccurate: 336,
    passAccuracy: 86,
    corners: 4,
    crosses: 13,
    longBalls: 42,
    throughBalls: 2,
    keyPasses: 7,
    finalThirdEntries: 31,
    boxTouches: 17,
    dribbles: 10,
    dribbleSuccessRate: 56,
    tackles: 21,
    interceptions: 9,
    clearances: 18,
    blocks: 7,
    aerialWon: 8,
    aerialLost: 9,
    aerialWinRate: 47,
    saves: 4,
    saveRate: 67,
    fouls: 13,
    offsides: 1,
    yellowCards: 3,
    redCards: 0,
    cards: 3,
    dispossessed: 11,
    turnovers: 9,
    ballRecoveries: 39,
  },
  goalEvents: [
    { minute: 24, player: 'Pedri', teamId: 65 },
    { minute: 51, player: 'Vinicius Junior', teamId: 52 },
    { minute: 77, player: 'Lamine Yamal', teamId: 65 },
  ],
  cardEvents: [
    { minute: 63, player: 'Aurelien Tchouameni', teamId: 52, cardType: 'YellowCard' },
  ],
  homePlayers: [
    { id: '1', name: 'Pedri', teamId: 65, passes: 82, passesAccurate: 74, passAccuracy: 90, keyPasses: 4, tackles: 3, interceptions: 2, dribbles: 3, dribbleSuccess: 3, shots: 2, shotsOnTarget: 1, ballRecoveries: 6 },
    { id: '2', name: 'Lamine Yamal', teamId: 65, passes: 46, passesAccurate: 38, passAccuracy: 83, keyPasses: 5, crosses: 7, tackles: 1, interceptions: 1, dribbles: 7, dribbleSuccess: 7, shots: 4, shotsOnTarget: 2, boxTouches: 5 },
    { id: '3', name: 'Frenkie de Jong', teamId: 65, passes: 91, passesAccurate: 84, passAccuracy: 92, keyPasses: 2, tackles: 4, interceptions: 3, dribbles: 2, dribbleSuccess: 2, shots: 1, shotsOnTarget: 0, ballRecoveries: 8 },
  ],
  awayPlayers: [
    { id: '4', name: 'Jude Bellingham', teamId: 52, passes: 55, passesAccurate: 48, passAccuracy: 87, keyPasses: 3, tackles: 4, interceptions: 2, dribbles: 4, dribbleSuccess: 4, shots: 3, shotsOnTarget: 2, boxTouches: 4 },
    { id: '5', name: 'Federico Valverde', teamId: 52, passes: 62, passesAccurate: 54, passAccuracy: 87, keyPasses: 2, longBalls: 5, tackles: 5, interceptions: 3, dribbles: 2, dribbleSuccess: 2, shots: 2, shotsOnTarget: 1, ballRecoveries: 7 },
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

const teamLogoUrl = (teamId: unknown) => {
  const id = String(teamId || '').trim();
  return id ? `https://d2zywfiolv4f83.cloudfront.net/img/teams/${id}.png` : '';
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
  if (words.length >= 2) return words.map(word => word[0]).join('').slice(0, 3).toUpperCase();
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
  return aliases.reduce((sum, key) => sum + collectNumbers(source[key]).reduce((inner, item) => inner + item, 0), 0);
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

const emptyPlayer = (id: string, name: string, teamId: string, isHome: boolean): PlayerStats => ({
  id,
  name,
  teamId,
  isHome,
  shots: 0,
  shotsOnTarget: 0,
  shotsOffTarget: 0,
  blockedShots: 0,
  shotAccuracy: 0,
  passes: 0,
  passesAccurate: 0,
  passAccuracy: 0,
  keyPasses: 0,
  crosses: 0,
  longBalls: 0,
  throughBalls: 0,
  finalThirdPasses: 0,
  boxTouches: 0,
  tackles: 0,
  interceptions: 0,
  dribbles: 0,
  dribbleSuccess: 0,
  dribbleSuccessRate: 0,
  aerialWon: 0,
  aerialLost: 0,
  blocks: 0,
  ballRecoveries: 0,
  dispossessed: 0,
  turnovers: 0,
  foulsCommitted: 0,
  saves: 0,
  clearances: 0,
  goals: 0,
  assists: 0,
});

const finalizePlayerStats = (player: PlayerStats) => {
  if (!player.passesAccurate && player.passAccuracy && player.passes) {
    player.passesAccurate = Math.round((player.passAccuracy / 100) * player.passes);
  }
  if (!player.passAccuracy && player.passes) {
    player.passAccuracy = (player.passesAccurate / player.passes) * 100;
  }
  if (!player.shotAccuracy && player.shots) {
    player.shotAccuracy = (player.shotsOnTarget / player.shots) * 100;
  }
  const dribbleAttempts = player.dribbles + player.dispossessed;
  if (!player.dribbleSuccess && player.dribbles) {
    player.dribbleSuccess = player.dribbles;
  }
  if (!player.dribbleSuccessRate && dribbleAttempts) {
    player.dribbleSuccessRate = (player.dribbleSuccess / Math.max(1, dribbleAttempts)) * 100;
  }
};

const playerImpactScore = (player: PlayerStats) => (
  player.goals * 12
  + player.assists * 8
  + player.shotsOnTarget * 4
  + player.keyPasses * 3
  + player.dribbles * 2
  + player.boxTouches
  + player.tackles * 2
  + player.interceptions * 2
  + player.clearances
  + player.blocks * 2
  + player.ballRecoveries
  + player.saves * 5
);

const normalizeTeamStats = (source: unknown): TeamStats => {
  const stats = emptyTeamStats();
  if (!source || typeof source !== 'object') return stats;
  const raw = source as Record<string, unknown>;
  numberKeys.forEach(key => {
    stats[key] = toNumber(raw[key]);
  });
  stats.cards = toNumber(raw.cards, stats.yellowCards + stats.redCards);
  stats.shotsOffTarget = toNumber(raw.shotsOffTarget, Math.max(0, stats.shots - stats.shotsOnTarget - stats.blockedShots));
  stats.shotAccuracy = toNumber(raw.shotAccuracy, stats.shots ? (stats.shotsOnTarget / stats.shots) * 100 : 0);
  stats.passAccuracy = toNumber(raw.passAccuracy, stats.passes ? (stats.passesAccurate / stats.passes) * 100 : 0);
  stats.aerialWinRate = toNumber(raw.aerialWinRate, stats.aerialWon + stats.aerialLost ? (stats.aerialWon / (stats.aerialWon + stats.aerialLost)) * 100 : 0);
  return stats;
};

const buildTopLists = (players: PlayerStats[]) => {
  const byName = (a: PlayerStats, b: PlayerStats) => a.name.localeCompare(b.name);
  const byPasses = (a: PlayerStats, b: PlayerStats) => b.passes - a.passes || byName(a, b);
  const byCreators = (a: PlayerStats, b: PlayerStats) => (b.keyPasses + b.assists) - (a.keyPasses + a.assists) || byPasses(a, b);
  const byDefenders = (a: PlayerStats, b: PlayerStats) => (b.tackles + b.interceptions + b.clearances) - (a.tackles + a.interceptions + a.clearances) || byName(a, b);
  return {
    topPassers: [...players].sort(byPasses).slice(0, 4),
    topCreators: [...players].sort(byCreators).slice(0, 4),
    topInterceptors: [...players].sort(byDefenders).slice(0, 4),
  };
};

const parseScore = (raw: Record<string, unknown>) => {
  const score = String(raw.score || '');
  if (score.includes('-')) {
    const [home, away] = score.split('-').map(part => toNumber(part.trim()));
    return { home, away };
  }
  return {
    home: toNumber(raw.homeScore),
    away: toNumber(raw.awayScore),
  };
};

const normalizeExtractorOutput = (raw: Record<string, unknown>): MatchViewData => {
  const matchRaw = (raw.match || {}) as Record<string, unknown>;
  const homeId = String(matchRaw.homeTeamId || 'home');
  const awayId = String(matchRaw.awayTeamId || 'away');
  const homeTeam = String(matchRaw.homeTeam || raw.homeTeamName || 'Home');
  const awayTeam = String(matchRaw.awayTeam || raw.awayTeamName || 'Away');
  const hStats = normalizeTeamStats(raw.homeStats);
  const aStats = normalizeTeamStats(raw.awayStats);

  if (!hStats.saveRate && aStats.shotsOnTarget) hStats.saveRate = (hStats.saves / Math.max(1, aStats.shotsOnTarget)) * 100;
  if (!aStats.saveRate && hStats.shotsOnTarget) aStats.saveRate = (aStats.saves / Math.max(1, hStats.shotsOnTarget)) * 100;

  const normalizePlayerList = (list: unknown, isHome: boolean): PlayerStats[] => {
    if (!Array.isArray(list)) return [];
    return list.map((player, index) => {
      const source = (player || {}) as Record<string, unknown>;
      const teamId = String(source.teamId || (isHome ? homeId : awayId));
      return {
        ...emptyPlayer(
          String(source.id || source.playerId || `${teamId}-${index}`),
          String(source.name || source.playerName || `Player ${index + 1}`),
          teamId,
          isHome,
        ),
        position: source.position ? String(source.position) : undefined,
        shirtNo: source.shirtNo as string | number | undefined,
        shots: toNumber(source.shots),
        shotsOnTarget: toNumber(source.shotsOnTarget),
        shotsOffTarget: toNumber(source.shotsOffTarget),
        blockedShots: toNumber(source.blockedShots),
        passes: toNumber(source.passes),
        passesAccurate: toNumber(source.passesAccurate),
        passAccuracy: toNumber(source.passAccuracy),
        keyPasses: toNumber(source.keyPasses),
        crosses: toNumber(source.crosses),
        longBalls: toNumber(source.longBalls),
        throughBalls: toNumber(source.throughBalls),
        finalThirdPasses: toNumber(source.finalThirdPasses),
        boxTouches: toNumber(source.boxTouches),
        tackles: toNumber(source.tackles),
        interceptions: toNumber(source.interceptions),
        dribbles: toNumber(source.dribbles),
        dribbleSuccess: toNumber(source.dribbleSuccess),
        dribbleSuccessRate: toNumber(source.dribbleSuccessRate),
        aerialWon: toNumber(source.aerialWon),
        aerialLost: toNumber(source.aerialLost),
        blocks: toNumber(source.blocks),
        ballRecoveries: toNumber(source.ballRecoveries),
        dispossessed: toNumber(source.dispossessed),
        turnovers: toNumber(source.turnovers),
        foulsCommitted: toNumber(source.foulsCommitted),
        saves: toNumber(source.saves),
        clearances: toNumber(source.clearances),
        goals: toNumber(source.goals),
        assists: toNumber(source.assists),
      };
    });
  };

  const players = [
    ...normalizePlayerList(raw.homePlayers, true),
    ...normalizePlayerList(raw.awayPlayers, false),
  ];
  players.forEach(finalizePlayerStats);

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

  return {
    meta: raw.meta as MatchViewData['meta'],
    match: {
      homeTeam,
      awayTeam,
      homeTeamId: matchRaw.homeTeamId as string | number | undefined,
      awayTeamId: matchRaw.awayTeamId as string | number | undefined,
      homeLogo: String(matchRaw.homeLogo || matchRaw.homeLogoUrl || teamLogoUrl(matchRaw.homeTeamId)),
      awayLogo: String(matchRaw.awayLogo || matchRaw.awayLogoUrl || teamLogoUrl(matchRaw.awayTeamId)),
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
    ...buildTopLists(players),
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
    const qualifiers = Array.isArray(event.qualifiers) ? event.qualifiers.map((q: any) => displayName(q.type || q)).join(' ') : '';

    if (type === 'Pass') {
      stats.passes += 1;
      if (success) stats.passesAccurate += 1;
      if (qualifiers.includes('Cross')) stats.crosses += 1;
      if (qualifiers.includes('Longball') || qualifiers.includes('LongBall')) stats.longBalls += 1;
      if (qualifiers.includes('Throughball') || qualifiers.includes('ThroughBall')) stats.throughBalls += 1;
      if (toNumber(event.endX) >= 66 && toNumber(event.x) < 66) stats.finalThirdEntries += 1;
      if (player) {
        player.passes += 1;
        if (success) player.passesAccurate += 1;
        if (qualifiers.includes('Cross')) player.crosses += 1;
        if (qualifiers.includes('Longball') || qualifiers.includes('LongBall')) player.longBalls += 1;
        if (qualifiers.includes('Throughball') || qualifiers.includes('ThroughBall')) player.throughBalls += 1;
        if (toNumber(event.endX) >= 66 && toNumber(event.x) < 66) player.finalThirdPasses += 1;
      }
    } else if (['SavedShot', 'MissedShots', 'BlockedShot', 'ShotOnPost', 'Goal'].includes(type)) {
      stats.shots += 1;
      if (player) player.shots += 1;
      if (type === 'SavedShot' || type === 'Goal') {
        stats.shotsOnTarget += 1;
        if (player) player.shotsOnTarget += 1;
      }
      if (type === 'MissedShots' || type === 'ShotOnPost') {
        stats.shotsOffTarget += 1;
        if (player) player.shotsOffTarget += 1;
      }
      if (type === 'BlockedShot') {
        stats.blockedShots += 1;
        if (player) player.blockedShots += 1;
      }
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
    } else if (type === 'Aerial') {
      if (success) {
        stats.aerialWon += 1;
        if (player) player.aerialWon += 1;
      } else {
        stats.aerialLost += 1;
        if (player) player.aerialLost += 1;
      }
    } else if (type === 'KeyPass') {
      stats.keyPasses += 1;
      if (player) player.keyPasses += 1;
    } else if (['TakeOn', 'Dribble'].includes(type)) {
      if (success) {
        stats.dribbles += 1;
        if (player) {
          player.dribbles += 1;
          player.dribbleSuccess += 1;
        }
      } else {
        stats.dispossessed += 1;
        if (player) player.dispossessed += 1;
      }
    } else if (type === 'Save') {
      stats.saves += 1;
      if (player) player.saves += 1;
    } else if (type === 'BallRecovery') {
      stats.ballRecoveries += 1;
      if (player) player.ballRecoveries += 1;
    } else if (type === 'Dispossessed') {
      stats.dispossessed += 1;
      if (player) player.dispossessed += 1;
    } else if (type === 'Turnover') {
      stats.turnovers += 1;
      if (player) player.turnovers += 1;
    } else if (type === 'BlockedPass' || type === 'Block') {
      stats.blocks += 1;
      if (player) player.blocks += 1;
    } else if (['YellowCard', 'RedCard', 'YellowRedCard'].includes(type)) {
      if (type === 'YellowCard') stats.yellowCards += 1;
      else stats.redCards += 1;
      stats.cards += 1;
    }

    if (toNumber(event.x) >= 83 && toNumber(event.y) >= 20 && toNumber(event.y) <= 80) {
      stats.boxTouches += 1;
      if (player) player.boxTouches += 1;
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
      item.passAccuracy = Math.max(item.passAccuracy, latestMetric(stats, ['passAccuracy', 'passSuccess', 'passSuccessRate']));
      item.keyPasses = Math.max(item.keyPasses, sumMetric(stats, ['keyPasses', 'keyPass']));
      item.assists = Math.max(item.assists, sumMetric(stats, ['assists', 'goalAssist']));
      item.tackles = Math.max(item.tackles, sumMetric(stats, ['tackles', 'totalTackles']));
      item.interceptions = Math.max(item.interceptions, sumMetric(stats, ['interceptions']));
      item.dribbles = Math.max(item.dribbles, sumMetric(stats, ['dribbles', 'successfulDribbles', 'dribbleWon']));
      item.dribbleSuccess = Math.max(item.dribbleSuccess, sumMetric(stats, ['dribbleSuccess', 'successfulDribbles', 'dribbleWon']));
      item.dribbleSuccessRate = Math.max(item.dribbleSuccessRate, latestMetric(stats, ['dribbleSuccessRate', 'dribbleSuccess']));
      item.shots = Math.max(item.shots, sumMetric(stats, ['shots', 'shotsTotal', 'totalShots']));
      item.shotsOnTarget = Math.max(item.shotsOnTarget, sumMetric(stats, ['shotsOnTarget', 'shotsOnTargetTotal', 'ontargetScoringAtt']));
      item.shotsOffTarget = Math.max(item.shotsOffTarget, sumMetric(stats, ['shotsOffTarget', 'shotOffTarget', 'offTarget']));
      item.blockedShots = Math.max(item.blockedShots, sumMetric(stats, ['blockedShots', 'shotsBlocked']));
      item.shotAccuracy = Math.max(item.shotAccuracy, latestMetric(stats, ['shotAccuracy', 'shotsOnTargetAccuracy']));
      item.crosses = Math.max(item.crosses, sumMetric(stats, ['crosses', 'totalCrosses', 'accurateCrosses']));
      item.longBalls = Math.max(item.longBalls, sumMetric(stats, ['longBalls', 'accurateLongBalls', 'longBall']));
      item.throughBalls = Math.max(item.throughBalls, sumMetric(stats, ['throughBalls', 'throughBall']));
      item.finalThirdPasses = Math.max(item.finalThirdPasses, sumMetric(stats, ['finalThirdPasses', 'passesToFinalThird', 'finalThirdEntries']));
      item.boxTouches = Math.max(item.boxTouches, sumMetric(stats, ['boxTouches', 'touchesInBox', 'penaltyAreaTouches']));
      item.aerialWon = Math.max(item.aerialWon, sumMetric(stats, ['aerialWon', 'aerialsWon']));
      item.aerialLost = Math.max(item.aerialLost, sumMetric(stats, ['aerialLost', 'aerialsLost']));
      item.blocks = Math.max(item.blocks, sumMetric(stats, ['blocks', 'blockedPass', 'blockedPasses']));
      item.ballRecoveries = Math.max(item.ballRecoveries, sumMetric(stats, ['ballRecoveries', 'recoveries']));
      item.dispossessed = Math.max(item.dispossessed, sumMetric(stats, ['dispossessed']));
      item.turnovers = Math.max(item.turnovers, sumMetric(stats, ['turnovers', 'unsuccessfulTouches']));
      item.foulsCommitted = Math.max(item.foulsCommitted, sumMetric(stats, ['foulsCommitted', 'fouls']));
      item.clearances = Math.max(item.clearances, sumMetric(stats, ['clearances']));
      item.saves = Math.max(item.saves, sumMetric(stats, ['saves']));
      item.goals = Math.max(item.goals, sumMetric(stats, ['goals']));
    });
  };

  hydratePlayers(home, homeId, true);
  hydratePlayers(away, awayId, false);

  const players = Object.values(playersById);
  players.forEach(finalizePlayerStats);
  const finalizeStats = (stats: TeamStats, opponent: TeamStats) => {
    stats.possession = stats.passes + opponent.passes ? (stats.passes / (stats.passes + opponent.passes)) * 100 : 50;
    stats.passAccuracy = stats.passes ? (stats.passesAccurate / stats.passes) * 100 : 0;
    stats.shotAccuracy = stats.shots ? (stats.shotsOnTarget / stats.shots) * 100 : 0;
    stats.aerialWinRate = stats.aerialWon + stats.aerialLost ? (stats.aerialWon / (stats.aerialWon + stats.aerialLost)) * 100 : 0;
    stats.saveRate = opponent.shotsOnTarget ? (stats.saves / Math.max(1, opponent.shotsOnTarget)) * 100 : 0;
    stats.cards = stats.yellowCards + stats.redCards;
  };
  finalizeStats(hStats, aStats);
  finalizeStats(aStats, hStats);

  return {
    meta: { extractedAt: new Date().toISOString() },
    match: {
      homeTeam: String(home.name || raw.homeTeamName || 'Home'),
      awayTeam: String(away.name || raw.awayTeamName || 'Away'),
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeLogo: String(home.logo || home.logoUrl || teamLogoUrl(homeId)),
      awayLogo: String(away.logo || away.logoUrl || teamLogoUrl(awayId)),
      homeScore: score.home,
      awayScore: score.away,
      status: String(raw.statusCode || raw.status || ''),
      competition: String(raw.competitionName || ''),
      venue: String(raw.venueName || ''),
    },
    hStats,
    aStats,
    players,
    events: events.sort((a, b) => a.minute - b.minute),
    ...buildTopLists(players),
  };
};

const normalizeMatchData = (raw: unknown): MatchViewData | null => {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (source.match && source.homeStats && source.awayStats) return normalizeExtractorOutput(source);
  return normalizeWhoScoredRaw(source);
};

const formatStat = (value: number, suffix = '', decimals = 0) => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = decimals > 0 ? safe.toFixed(decimals) : Math.round(safe).toString();
  return `${fixed}${suffix}`;
};

const makeStat = (id: string, label: string, home: number, away: number, suffix = '', decimals = 0): StatItem => ({
  id,
  label,
  home: Number.isFinite(home) ? home : 0,
  away: Number.isFinite(away) ? away : 0,
  suffix,
  decimals,
});

const TeamCrest: React.FC<{ src?: string; name: string; color: string; side: 'home' | 'away' }> = ({ src, name, color, side }) => {
  const [failed, setFailed] = useState(false);
  const initials = shortTeam(name);
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black/45 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 opacity-25" style={{ background: `linear-gradient(135deg, ${color}, transparent 70%)` }} />
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          className="relative z-10 h-12 w-12 object-contain"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="relative z-10 font-['Barlow_Condensed'] text-2xl font-black text-white">{initials}</span>
      )}
      <div className={`absolute bottom-1 h-1.5 w-7 rounded-full ${side === 'home' ? 'left-4' : 'right-4'}`} style={{ background: color }} />
    </div>
  );
};

export const MatchStatsRenderer: React.FC<RendererProps> = ({
  getField,
  containerStyle,
  activeTheme,
}) => {
  const dataMode = String(getField('dataMode') || 'CLOUD_BRIDGE');
  const apiUrl = String(getField('apiUrl') || (dataMode === 'CLOUD_BRIDGE' ? '/api/reo-match/match' : 'http://127.0.0.1:3005/api/match'));
  const manualJson = String(getField('manualJson') || '');
  const pollIntervalSec = clamp(toNumber(getField('pollIntervalSec'), 10), 3, 60);
  const statsRotateSec = clamp(toNumber(getField('statsRotateSec'), 30), 10, 90);
  const homeColor = String(getField('homeColor') || activeTheme.primary || '#2563eb');
  const awayColor = String(getField('awayColor') || activeTheme.secondary || '#ef4444');
  const showScorebug = boolField(getField('showScorebug'), true);
  const showEvents = boolField(getField('showEvents'), true);
  const showKeyBattle = boolField(getField('showKeyBattle'), true);
  const showDominance = boolField(getField('showDominance'), true);
  const showMotm = boolField(getField('showMotm'), true);
  const showTopStats = boolField(getField('showTopStats'), true);
  const showAdvancedStats = boolField(getField('showAdvancedStats'), true);
  const showPlayerTicker = boolField(getField('showPlayerTicker'), true);
  const playerRotateSec = clamp(toNumber(getField('playerRotateSec'), 30), 15, 120);
  const panelSide = String(getField('panelSide') || 'LEFT');
  const requestedPlayerSide = String(getField('playerPanelSide') || 'RIGHT');
  const playerPanelSide = requestedPlayerSide === panelSide ? (panelSide === 'LEFT' ? 'RIGHT' : 'LEFT') : requestedPlayerSide;
  const visualStyle = String(getField('visualStyle') || 'DUAL_RAIL');
  const playerMetricPreset = String(getField('playerMetricPreset') || 'ALL');
  const dataSourceName = String(getField('dataSourceName') || (dataMode === 'CLOUD_BRIDGE' ? 'REO Cloud Bridge' : 'REO Live Bridge'));

  const [rawJson, setRawJson] = useState<unknown>(dataMode === 'DEMO' ? DEMO_MATCH_DATA : null);
  const [errorStatus, setErrorStatus] = useState<string>('');
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activePlayerGroupIndex, setActivePlayerGroupIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (dataMode === 'DEMO') {
        setRawJson(DEMO_MATCH_DATA);
        setErrorStatus('');
        return;
      }

      if (dataMode === 'PASTE_JSON') {
        try {
          setRawJson(JSON.parse(manualJson));
          setErrorStatus('');
        } catch {
          setErrorStatus('ملف JSON غير صالح');
        }
        return;
      }

      try {
        const res = await fetch(apiUrl, { cache: 'no-store', mode: 'cors' });
        if (!res.ok) throw new Error(`Bridge ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setRawJson(json);
          setErrorStatus('');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorStatus(`لا توجد بيانات مباشرة من ${dataSourceName}: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }
    };

    fetchData();
    const interval = window.setInterval(fetchData, pollIntervalSec * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiUrl, dataMode, dataSourceName, manualJson, pollIntervalSec]);

  const parsedData = useMemo(() => normalizeMatchData(rawJson), [rawJson]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveGroupIndex(index => index + 1);
    }, statsRotateSec * 1000);
    return () => window.clearInterval(interval);
  }, [statsRotateSec]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActivePlayerGroupIndex(index => index + 1);
    }, playerRotateSec * 1000);
    return () => window.clearInterval(interval);
  }, [playerRotateSec]);

  if (!parsedData) {
    return (
      <div style={containerStyle}>
        <div className="flex h-full w-full items-center justify-center p-8">
          <div className="flex max-w-[560px] flex-col items-center gap-4 rounded-lg border border-red-500/45 bg-black/85 p-7 text-center font-['Cairo'] text-lg font-bold text-white shadow-2xl">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
            <div>{errorStatus || 'جاري تجهيز بيانات المباراة...'}</div>
          </div>
        </div>
      </div>
    );
  }

  const { match, hStats, aStats, players, topPassers, topInterceptors, topCreators, events, meta } = parsedData;
  const possHome = clamp(Math.round(hStats.possession || 50), 0, 100);
  const shotShare = hStats.shots + aStats.shots > 0 ? hStats.shots / (hStats.shots + aStats.shots) : 0.5;
  const keyShare = hStats.keyPasses + aStats.keyPasses > 0 ? hStats.keyPasses / (hStats.keyPasses + aStats.keyPasses) : 0.5;
  const territoryShare = hStats.finalThirdEntries + aStats.finalThirdEntries > 0 ? hStats.finalThirdEntries / (hStats.finalThirdEntries + aStats.finalThirdEntries) : 0.5;
  const domHome = clamp(Math.round((possHome / 100 * 0.38 + shotShare * 0.27 + keyShare * 0.2 + territoryShare * 0.15) * 100), 0, 100);
  const impactPlayer = players
    .map(player => ({ player, score: playerImpactScore(player) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name))[0];
  const latestEvents = [...events].slice(-3).reverse();
  const keyCreator = topCreators.find(player => player.keyPasses > 0 || player.assists > 0);
  const keyDefender = topInterceptors.find(player => player.tackles > 0 || player.interceptions > 0 || player.clearances > 0);
  const matchSideClass = panelSide === 'LEFT' ? 'left-6' : 'right-6';
  const playerSideClass = playerPanelSide === 'LEFT' ? 'left-6' : 'right-6';
  const matchPanelWidth = visualStyle === 'COMPACT_BROADCAST' ? 'w-[470px]' : visualStyle === 'DATA_TOWER' ? 'w-[500px]' : 'w-[540px]';
  const playerPanelWidth = visualStyle === 'COMPACT_BROADCAST' ? 'w-[430px]' : visualStyle === 'DATA_TOWER' ? 'w-[460px]' : 'w-[500px]';
  const panelSurface = visualStyle === 'TACTICAL_SPLIT'
    ? 'border-white/15 bg-slate-950/92'
    : visualStyle === 'DATA_TOWER'
      ? 'border-cyan-300/20 bg-black/92'
      : 'border-white/10 bg-black/90';
  const totalMetrics = 31;
  const playerValue = (player: PlayerStats, key: keyof PlayerStats) => {
    const value = player[key];
    return typeof value === 'number' ? value : 0;
  };
  type PlayerGroup = {
    title: string;
    subtitle: string;
    key: keyof PlayerStats;
    suffix: string;
    category: 'PASSING' | 'ATTACK' | 'DEFENSE';
    players: PlayerStats[];
  };
  const makePlayerGroup = (
    title: string,
    subtitle: string,
    key: keyof PlayerStats,
    suffix: string,
    category: PlayerGroup['category'],
  ): PlayerGroup => ({
    title,
    subtitle,
    key,
    suffix,
    category,
    players: [...players]
      .sort((a, b) => playerValue(b, key) - playerValue(a, key) || playerImpactScore(b) - playerImpactScore(a) || a.name.localeCompare(b.name))
      .slice(0, 5),
  });
  const allPlayerGroups = [
    makePlayerGroup('أفضل الممرين', 'أعلى حجم تمرير في المباراة', 'passes', 'تمريرة', 'PASSING'),
    makePlayerGroup('أدق الممرين', 'نسبة التمريرات الصحيحة لكل لاعب', 'passAccuracy', '%', 'PASSING'),
    makePlayerGroup('تمريرات صحيحة', 'أكثر تمريرات وصلت للزميل', 'passesAccurate', 'صحيحة', 'PASSING'),
    makePlayerGroup('تمريرات مفتاحية', 'أكثر صناعة للفرص المباشرة', 'keyPasses', 'مفتاحية', 'PASSING'),
    makePlayerGroup('أكثر صناعة', 'تمريرات حاسمة مسجلة', 'assists', 'أسيست', 'PASSING'),
    makePlayerGroup('أكثر تسديدا', 'إجمالي محاولات التسديد', 'shots', 'تسديدة', 'ATTACK'),
    makePlayerGroup('على المرمى', 'التسديدات بين القائمين', 'shotsOnTarget', 'على المرمى', 'ATTACK'),
    makePlayerGroup('دقة التسديد', 'نسبة التسديدات على المرمى', 'shotAccuracy', '%', 'ATTACK'),
    makePlayerGroup('الهدافون', 'الأهداف المسجلة من اللاعبين', 'goals', 'هدف', 'ATTACK'),
    makePlayerGroup('مراوغات ناجحة', 'تجاوزات ناجحة بالكرة', 'dribbles', 'مراوغة', 'ATTACK'),
    makePlayerGroup('نجاح المراوغة', 'نسبة نجاح محاولات المراوغة', 'dribbleSuccessRate', '%', 'ATTACK'),
    makePlayerGroup('كرات عرضية', 'أكثر إرسالا للعرضيات', 'crosses', 'عرضية', 'PASSING'),
    makePlayerGroup('كرات طويلة', 'تمريرات طويلة نحو الأمام', 'longBalls', 'طويلة', 'PASSING'),
    makePlayerGroup('كرات بينية', 'تمريرات تخترق الخطوط', 'throughBalls', 'بينية', 'PASSING'),
    makePlayerGroup('للثلث الأخير', 'تمريرات أو دخول لمنطقة الخطورة', 'finalThirdPasses', 'تمريرة', 'PASSING'),
    makePlayerGroup('لمسات في المنطقة', 'لمسات داخل منطقة الجزاء', 'boxTouches', 'لمسة', 'ATTACK'),
    makePlayerGroup('أفضل المتدخلين', 'أكثر تدخلات دفاعية', 'tackles', 'تدخل', 'DEFENSE'),
    makePlayerGroup('قاطعو الكرات', 'أكثر اعتراضا لمسار اللعب', 'interceptions', 'اعتراض', 'DEFENSE'),
    makePlayerGroup('الإبعادات', 'إبعاد الخطر من المناطق الدفاعية', 'clearances', 'إبعاد', 'DEFENSE'),
    makePlayerGroup('استرجاع الكرة', 'أكثر لاعبين استعادوا الاستحواذ', 'ballRecoveries', 'استرجاع', 'DEFENSE'),
  ];
  const playerGroups = allPlayerGroups.filter(group =>
    (playerMetricPreset === 'ALL' || group.category === playerMetricPreset) && group.players.length > 0
  );
  const activePlayerGroup = playerGroups[activePlayerGroupIndex % Math.max(1, playerGroups.length)];

  const groups: StatGroup[] = [
    {
      id: 'control',
      title: 'السيطرة والنسق',
      subtitle: 'استحواذ، إيقاع، وتقدم للمناطق الخطرة',
      items: [
        makeStat('possession', 'الاستحواذ', possHome, 100 - possHome, '%'),
        makeStat('dominance', 'مؤشر الهيمنة', domHome, 100 - domHome, '%'),
        makeStat('passes', 'التمريرات', hStats.passes, aStats.passes),
        makeStat('passAccuracy', 'دقة التمرير', hStats.passAccuracy, aStats.passAccuracy, '%'),
        makeStat('finalThird', 'دخول الثلث الأخير', hStats.finalThirdEntries, aStats.finalThirdEntries),
        makeStat('recoveries', 'استرجاع الكرة', hStats.ballRecoveries, aStats.ballRecoveries),
      ],
    },
    {
      id: 'attack',
      title: 'الإنتاج الهجومي',
      subtitle: 'تسديد، صناعة فرص، ولمسات داخل المنطقة',
      items: [
        makeStat('shots', 'إجمالي التسديدات', hStats.shots, aStats.shots),
        makeStat('onTarget', 'على المرمى', hStats.shotsOnTarget, aStats.shotsOnTarget),
        makeStat('offTarget', 'خارج المرمى', hStats.shotsOffTarget, aStats.shotsOffTarget),
        makeStat('blockedShots', 'تسديدات محجوبة', hStats.blockedShots, aStats.blockedShots),
        makeStat('shotAccuracy', 'دقة التسديد', hStats.shotAccuracy, aStats.shotAccuracy, '%'),
        makeStat('keyPasses', 'تمريرات مفتاحية', hStats.keyPasses, aStats.keyPasses),
        makeStat('boxTouches', 'لمسات داخل المنطقة', hStats.boxTouches, aStats.boxTouches),
      ],
    },
    {
      id: 'passing',
      title: 'جودة البناء',
      subtitle: 'تنويع التمرير والكرات العرضية والطويلة',
      items: [
        makeStat('accuratePasses', 'تمريرات صحيحة', hStats.passesAccurate, aStats.passesAccurate),
        makeStat('corners', 'ركنيات', hStats.corners, aStats.corners),
        makeStat('crosses', 'كرات عرضية', hStats.crosses, aStats.crosses),
        makeStat('longBalls', 'كرات طويلة', hStats.longBalls, aStats.longBalls),
        makeStat('throughBalls', 'كرات بينية', hStats.throughBalls, aStats.throughBalls),
        makeStat('dribbles', 'مراوغات ناجحة', hStats.dribbles, aStats.dribbles),
        makeStat('dribbleRate', 'نجاح المراوغة', hStats.dribbleSuccessRate, aStats.dribbleSuccessRate, '%'),
      ],
    },
    {
      id: 'defense',
      title: 'العمل الدفاعي',
      subtitle: 'ضغط، افتكاك، وتنظيف مناطق الخطورة',
      items: [
        makeStat('tackles', 'تدخلات', hStats.tackles, aStats.tackles),
        makeStat('interceptions', 'اعتراضات', hStats.interceptions, aStats.interceptions),
        makeStat('clearances', 'إبعادات', hStats.clearances, aStats.clearances),
        makeStat('blocks', 'تصديات دفاعية', hStats.blocks, aStats.blocks),
        makeStat('aerialWon', 'التحامات هوائية ناجحة', hStats.aerialWon, aStats.aerialWon),
        makeStat('aerialRate', 'نسبة الفوز هوائيا', hStats.aerialWinRate, aStats.aerialWinRate, '%'),
      ],
    },
    {
      id: 'discipline',
      title: 'الانضباط والحراسة',
      subtitle: 'أخطاء، بطاقات، وتصديات الحراس',
      items: [
        makeStat('saves', 'تصديات الحارس', hStats.saves, aStats.saves),
        makeStat('saveRate', 'نسبة التصدي', hStats.saveRate, aStats.saveRate, '%'),
        makeStat('fouls', 'أخطاء', hStats.fouls, aStats.fouls),
        makeStat('offsides', 'تسللات', hStats.offsides, aStats.offsides),
        makeStat('yellowCards', 'بطاقات صفراء', hStats.yellowCards, aStats.yellowCards),
        makeStat('redCards', 'بطاقات حمراء', hStats.redCards, aStats.redCards),
        makeStat('turnovers', 'فقدان الكرة', hStats.dispossessed + hStats.turnovers, aStats.dispossessed + aStats.turnovers),
      ],
    },
  ];

  const activeGroup = groups[activeGroupIndex % groups.length];

  const StatRow: React.FC<{ item: StatItem; index: number }> = ({ item, index }) => {
    const max = Math.max(1, Math.abs(item.home), Math.abs(item.away));
    const homeWidth = clamp((item.home / max) * 100, 4, 100);
    const awayWidth = clamp((item.away / max) * 100, 4, 100);
    const homeLead = item.home > item.away;
    const awayLead = item.away > item.home;
    return (
      <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2.5" style={{ animation: `reoStatIn 420ms ease ${index * 55}ms both` }}>
        <div className="mb-1.5 grid grid-cols-[54px_1fr_54px] items-center gap-2">
          <div className="font-['Barlow_Condensed'] text-2xl font-black text-left" style={{ color: homeLead ? homeColor : 'rgba(255,255,255,0.72)' }}>
            {formatStat(item.home, item.suffix, item.decimals)}
          </div>
          <div className="truncate text-center text-[11px] font-black text-white/75">{item.label}</div>
          <div className="font-['Barlow_Condensed'] text-2xl font-black text-right" style={{ color: awayLead ? awayColor : 'rgba(255,255,255,0.72)' }}>
            {formatStat(item.away, item.suffix, item.decimals)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex justify-end">
            <div className="h-1.5 rounded-full" style={{ width: `${homeWidth}%`, background: homeColor }} />
          </div>
          <div>
            <div className="h-1.5 rounded-full" style={{ width: `${awayWidth}%`, background: awayColor }} />
          </div>
        </div>
      </div>
    );
  };

  const PlayerLine: React.FC<{ player: PlayerStats; value: number; label: string }> = ({ player, value, label }) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: player.isHome ? homeColor : awayColor }} />
        <div className="min-w-0">
          <div className="truncate text-xs font-bold text-white">{playerShortName(player.name)}</div>
          <div className="truncate text-[9px] font-semibold text-white/35">{label}</div>
        </div>
      </div>
      <div className="font-['Barlow_Condensed'] text-2xl font-black" style={{ color: player.isHome ? homeColor : awayColor }}>
        {Math.round(value)}
      </div>
    </div>
  );

  const PlayerStatsPanel = () => {
    if (!showPlayerTicker || !activePlayerGroup) return null;
    return (
      <div dir="rtl" className={`absolute inset-y-6 ${playerSideClass} z-20 flex ${playerPanelWidth} max-w-[calc(50vw-42px)] flex-col overflow-hidden rounded-lg border ${panelSurface} p-3 font-['Cairo'] text-white shadow-2xl backdrop-blur-xl`}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${awayColor}, ${homeColor})` }} />
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">PLAYER COMMAND</div>
            <div className="truncate text-2xl font-black">{activePlayerGroup.title}</div>
            <div className="truncate text-[10px] font-bold text-white/45">{activePlayerGroup.subtitle}</div>
          </div>
          <div className="shrink-0 rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-center">
            <div className="font-['Barlow_Condensed'] text-xl font-black">{allPlayerGroups.length}</div>
            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/40">PLAYER STATS</div>
          </div>
        </div>
        <div key={activePlayerGroup.title} className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {activePlayerGroup.players.map((player, index) => {
            const value = playerValue(player, activePlayerGroup.key);
            const maxValue = Math.max(1, ...activePlayerGroup.players.map(item => playerValue(item, activePlayerGroup.key)));
            const color = player.isHome ? homeColor : awayColor;
            return (
              <div
                key={`${activePlayerGroup.title}-${player.id}-${index}`}
                className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-white/10 px-3 py-2"
                style={{ animation: `reoStatIn 420ms ease ${index * 65}ms both` }}
              >
                <div className="absolute bottom-0 right-0 top-0 opacity-15 transition-all duration-700" style={{ width: `${clamp((value / maxValue) * 100, 3, 100)}%`, background: color }} />
                <div className="relative z-10 flex h-full items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/35 font-['Barlow_Condensed'] text-xl font-black" style={{ color }}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">{playerShortName(player.name)}</div>
                      <div className="truncate text-[9px] font-bold text-white/40">{player.isHome ? match.homeTeam : match.awayTeam}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-['Barlow_Condensed'] text-4xl font-black leading-none" style={{ color }}>{Math.round(value)}</div>
                    <div className="text-[8px] font-black text-white/40">{activePlayerGroup.suffix}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">SOURCE</div>
            <div className="truncate text-xs font-black text-white/70">{dataSourceName}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {playerGroups.map((group, index) => (
              <div
                key={group.title}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: index === activePlayerGroupIndex % playerGroups.length ? 28 : 7,
                  background: index === activePlayerGroupIndex % playerGroups.length ? `linear-gradient(90deg, ${homeColor}, ${awayColor})` : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>
        </div>
        {impactPlayer ? (
          <div className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200/70">LIVE IMPACT</div>
                <div className="truncate text-sm font-black">{impactPlayer.player.name}</div>
              </div>
              <div className="font-['Barlow_Condensed'] text-3xl font-black text-amber-300">{Math.round(impactPlayer.score)}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes reoStatIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="relative h-full w-full overflow-hidden p-6" style={{ direction: 'ltr' }}>
        <div dir="rtl" className={`absolute inset-y-6 ${matchSideClass} flex ${matchPanelWidth} max-w-[calc(50vw-42px)] flex-col gap-3 overflow-hidden font-['Cairo'] text-white`}>
          {showScorebug && (
            <div className={`relative overflow-hidden rounded-lg border ${panelSurface} p-3 shadow-2xl backdrop-blur-xl`}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${homeColor}, #f8fafc, ${awayColor})` }} />
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                <span>{dataMode === 'BRIDGE' ? 'LIVE BRIDGE' : dataMode}</span>
                <span>{meta?.extractedAt ? new Date(meta.extractedAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : 'LIVE'}</span>
              </div>
              <div dir="ltr" className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <TeamCrest src={match.homeLogo} name={match.homeTeam} color={homeColor} side="home" />
                  <div dir="ltr" className="min-w-0 text-left">
                    <div className="text-[15px] font-black leading-tight" style={{ overflowWrap: 'anywhere' }}>{match.homeTeam}</div>
                    <div className="font-['Barlow_Condensed'] text-2xl font-black" style={{ color: homeColor }}>{shortTeam(match.homeTeam)}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/55 px-5 py-2 text-center shadow-inner">
                  <div className="font-['Barlow_Condensed'] text-5xl font-black leading-none">
                    {match.homeScore}<span className="mx-2 text-white/30">:</span>{match.awayScore}
                  </div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">{match.competition || match.venue || 'MATCH CENTER'}</div>
                </div>
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <div dir="ltr" className="min-w-0 text-right">
                    <div className="text-[15px] font-black leading-tight" style={{ overflowWrap: 'anywhere' }}>{match.awayTeam}</div>
                    <div className="font-['Barlow_Condensed'] text-2xl font-black" style={{ color: awayColor }}>{shortTeam(match.awayTeam)}</div>
                  </div>
                  <TeamCrest src={match.awayLogo} name={match.awayTeam} color={awayColor} side="away" />
                </div>
              </div>
            </div>
          )}

          {showDominance && (
            <div className={`rounded-lg border ${panelSurface} p-3 shadow-2xl backdrop-blur-xl`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Momentum</div>
                  <div className="text-sm font-black text-white/85">مؤشر السيطرة المباشر</div>
                </div>
                <div className="font-['Barlow_Condensed'] text-3xl font-black">
                  <span style={{ color: homeColor }}>{domHome}</span>
                  <span className="text-white/30"> / </span>
                  <span style={{ color: awayColor }}>{100 - domHome}</span>
                </div>
              </div>
              <div className="relative h-4 overflow-hidden rounded-full bg-white/10">
                <div className="absolute inset-y-0 left-0 transition-all duration-1000" style={{ width: `${domHome}%`, background: homeColor }} />
                <div className="absolute inset-y-0 right-0 transition-all duration-1000" style={{ width: `${100 - domHome}%`, background: awayColor }} />
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/75" />
              </div>
            </div>
          )}

          {showAdvancedStats && (
            <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border ${panelSurface} p-3 shadow-2xl backdrop-blur-xl`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-black">{activeGroup.title}</div>
                  <div className="truncate text-[10px] font-bold text-white/45">{activeGroup.subtitle}</div>
                </div>
                <div className="shrink-0 rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-center">
                  <div className="font-['Barlow_Condensed'] text-xl font-black">{totalMetrics}+</div>
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/40">STATS</div>
                </div>
              </div>
              <div key={activeGroup.id} className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-2 overflow-hidden">
                {activeGroup.items.map((item, index) => <StatRow key={item.id} item={item} index={index} />)}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {groups.map((group, index) => (
                  <div
                    key={group.id}
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: index === activeGroupIndex % groups.length ? 28 : 7,
                      background: index === activeGroupIndex % groups.length ? `linear-gradient(90deg, ${homeColor}, ${awayColor})` : 'rgba(255,255,255,0.18)',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {(showEvents || showTopStats || showKeyBattle || showMotm) && (
            <div className="grid grid-cols-2 gap-3">
              {showEvents && (
                <div className={`min-h-[132px] rounded-lg border ${panelSurface} p-3 shadow-2xl backdrop-blur-xl`}>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">أحداث المباراة</div>
                  <div className="flex flex-col gap-1.5">
                    {latestEvents.length ? latestEvents.map((event, index) => (
                      <div key={`${event.minute}-${event.player}-${index}`} className="grid grid-cols-[34px_auto_1fr] items-center gap-2 rounded-md bg-white/10 px-2 py-1.5">
                        <div className="font-['Barlow_Condensed'] text-xl font-black" style={{ color: event.isHome ? homeColor : awayColor }}>{event.minute}'</div>
                        <div className={`rounded px-1.5 py-0.5 text-[8px] font-black ${event.tone === 'goal' ? 'bg-emerald-400/15 text-emerald-300' : event.tone === 'red' ? 'bg-red-400/15 text-red-300' : 'bg-amber-400/15 text-amber-300'}`}>{event.label}</div>
                        <div className="min-w-0 truncate text-[11px] font-bold text-white/85">{event.player}</div>
                      </div>
                    )) : (
                      <div className="rounded-md bg-white/10 px-3 py-5 text-center text-xs font-bold text-white/40">لا توجد أحداث حاسمة بعد</div>
                    )}
                  </div>
                </div>
              )}

              {showMotm && impactPlayer ? (
                <div className="relative min-h-[132px] overflow-hidden rounded-lg border border-amber-300/30 bg-black/90 p-3 shadow-2xl backdrop-blur-xl">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/70">LIVE IMPACT</div>
                  <div className="mt-2 min-w-0">
                    <div className="truncate text-lg font-black">{impactPlayer.player.name}</div>
                    <div className="truncate text-[10px] font-bold text-white/45">{impactPlayer.player.isHome ? match.homeTeam : match.awayTeam}</div>
                  </div>
                  <div className="absolute bottom-2 left-3 font-['Barlow_Condensed'] text-5xl font-black text-amber-300">{Math.round(impactPlayer.score)}</div>
                </div>
              ) : showKeyBattle && keyCreator && keyDefender ? (
                <div className={`min-h-[132px] rounded-lg border ${panelSurface} p-3 shadow-2xl backdrop-blur-xl`}>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/70">Key Battle</div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="min-w-0 text-right">
                      <div className="truncate text-sm font-black">{playerShortName(keyCreator.name)}</div>
                      <div className="font-['Barlow_Condensed'] text-2xl font-black" style={{ color: keyCreator.isHome ? homeColor : awayColor }}>{keyCreator.keyPasses + keyCreator.assists}</div>
                    </div>
                    <div className="rounded-full border border-white/10 px-2 py-1 font-['Barlow_Condensed'] text-sm font-black text-white/45">VS</div>
                    <div className="min-w-0 text-left">
                      <div className="truncate text-sm font-black">{playerShortName(keyDefender.name)}</div>
                      <div className="font-['Barlow_Condensed'] text-2xl font-black" style={{ color: keyDefender.isHome ? homeColor : awayColor }}>{keyDefender.tackles + keyDefender.interceptions + keyDefender.clearances}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {showTopStats && (
            <div className={`grid grid-cols-3 gap-2 rounded-lg border ${panelSurface} p-2.5 shadow-2xl backdrop-blur-xl`}>
              {topCreators[0] && <PlayerLine player={topCreators[0]} value={topCreators[0].keyPasses + topCreators[0].assists} label="صناعة" />}
              {topPassers[0] && <PlayerLine player={topPassers[0]} value={topPassers[0].passes} label="تمرير" />}
              {topInterceptors[0] && <PlayerLine player={topInterceptors[0]} value={topInterceptors[0].tackles + topInterceptors[0].interceptions + topInterceptors[0].clearances} label="دفاع" />}
            </div>
          )}
        </div>
        <PlayerStatsPanel />
      </div>
    </div>
  );
};
