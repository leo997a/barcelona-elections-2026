export type MondialLiveTeam = {
  id: string | number;
  name: string;
  shortName: string;
  countryCode: string;
  flagUrl: string;
  logoUrl?: string;
};

export type MondialLiveMatch = {
  id: string | number;
  home: MondialLiveTeam | null;
  away: MondialLiveTeam | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  homeScore?: number;
  awayScore?: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  status: string;
  statusLabel?: string;
  minute?: string | number;
  date?: string;
  group?: string;
  stage?: string;
  venue?: string;
  matchNo?: number;
};

export type MondialMatchSelection = {
  mode?: string;
  featuredMatchIndex?: unknown;
  selectedMatchId?: unknown;
  teamCode?: unknown;
  groupCode?: unknown;
  roundStage?: unknown;
  statusFilter?: unknown;
};

export type MondialLiveScorer = {
  id?: string | number;
  name: string;
  nameAr?: string;
  team: string;
  code: string;
  countryCode: string;
  flagUrl?: string;
  goals: number;
  assists?: number;
  appearances?: number;
  minutesPlayed?: number;
  rank?: number;
  image?: string;
};

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
};

const stringValue = (value: unknown, fallback = ''): string =>
  value === undefined || value === null || value === '' ? fallback : String(value);

const optionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeCountryCode = (value: unknown): string =>
  stringValue(value).trim().toLowerCase().replace(/_/g, '-');

const normalizeTeam = (value: unknown, fallbackId: string): MondialLiveTeam | null => {
  const source = recordOf(value);
  if (!source) return null;
  const name = stringValue(source.name ?? source.nameAr ?? source.teamName);
  if (!name) return null;
  const shortName = stringValue(
    source.shortName ?? source.short ?? source.code,
    name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || name.slice(0, 3).toUpperCase()
  ).toUpperCase();
  const countryCode = normalizeCountryCode(source.countryCode ?? source.isoCode ?? source.code ?? shortName);
  return {
    id: (source.id as string | number | undefined) ?? fallbackId,
    name,
    shortName,
    countryCode,
    flagUrl: stringValue(source.flagUrl, countryCode ? `https://flagcdn.com/${countryCode}.svg` : ''),
    logoUrl: stringValue(source.logoUrl ?? source.logo, '') || undefined,
  };
};

const normalizeStatus = (value: unknown): string => {
  const status = stringValue(value, 'scheduled').toLowerCase();
  if (status.includes('live') || status.includes('playing') || status === 'inprogress') return 'live';
  if (status.includes('finish') || status === 'ft' || status === 'aet' || status === 'pen') return 'finished';
  if (status.includes('cancel') || status.includes('postpon')) return 'cancelled';
  return 'scheduled';
};

const normalizeMatch = (value: unknown, index: number): MondialLiveMatch | null => {
  const source = recordOf(value);
  if (!source) return null;
  const status = normalizeStatus(source.status ?? source.matchStatus);
  const home = normalizeTeam(source.home ?? source.homeTeam, `fixture-${index + 1}-home`);
  const away = normalizeTeam(source.away ?? source.awayTeam, `fixture-${index + 1}-away`);
  const homePlaceholder = stringValue(source.homePlaceholder, '') || undefined;
  const awayPlaceholder = stringValue(source.awayPlaceholder, '') || undefined;
  if (!home && !away && !homePlaceholder && !awayPlaceholder) return null;
  return {
    id: (source.id as string | number | undefined) ?? `fixture-${index + 1}`,
    home,
    away,
    homePlaceholder,
    awayPlaceholder,
    homeScore: optionalNumber(source.homeScore),
    awayScore: optionalNumber(source.awayScore),
    homePenaltyScore: optionalNumber(source.homePenaltyScore),
    awayPenaltyScore: optionalNumber(source.awayPenaltyScore),
    status,
    statusLabel: stringValue(source.statusLabel, '') || undefined,
    minute: source.minute as string | number | undefined,
    date: stringValue(source.date, '') || undefined,
    group: stringValue(source.group, '') || undefined,
    stage: stringValue(source.stage, '') || undefined,
    venue: stringValue(source.venue ?? source.venueLabel, '') || undefined,
    matchNo: optionalNumber(source.matchNo ?? source.matchNumber),
  };
};

const listFrom = (input: unknown, keys: string[]): unknown[] => {
  const parsed = parseJson(input);
  if (Array.isArray(parsed)) return parsed;
  const source = recordOf(parsed);
  if (!source) return [];
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  const tournament = recordOf(source.tournament);
  if (tournament) {
    for (const key of keys) {
      if (Array.isArray(tournament[key])) return tournament[key] as unknown[];
    }
  }
  return [];
};

export const normalizeWorldCupFixtures = (input: unknown): MondialLiveMatch[] =>
  listFrom(input, ['fixtures', 'matches'])
    .map(normalizeMatch)
    .filter((match): match is MondialLiveMatch => Boolean(match));

export const fixturesFromWorldCupData = (
  liveData: Record<string, unknown> | null | undefined,
  manualFixtures: unknown
): MondialLiveMatch[] => {
  const liveFixtures = normalizeWorldCupFixtures(liveData);
  const roundMatches = Array.isArray(liveData?.rounds)
    ? liveData.rounds.flatMap((roundValue, roundIndex) => {
        const round = recordOf(roundValue);
        const stage = stringValue(round?.stage, '');
        return (Array.isArray(round?.matches) ? round.matches : [])
          .map((match, matchIndex) => normalizeMatch(match, roundIndex * 100 + matchIndex))
          .filter((match): match is MondialLiveMatch => Boolean(match))
          .map(match => ({ ...match, stage: match.stage || stage }));
      })
    : [];
  const combined = [...liveFixtures, ...roundMatches];
  const unique = [...new Map(combined.map(match => [String(match.id), match])).values()];
  return unique.length ? unique : normalizeWorldCupFixtures(manualFixtures);
};

const normalizedToken = (value: unknown): string =>
  stringValue(value).trim().toUpperCase().replace(/^GROUP\s+/, '').replace(/[^A-Z0-9]/g, '');

const dateValue = (match: MondialLiveMatch): number => {
  if (!match.date) return 0;
  const parsed = Date.parse(match.date);
  return Number.isFinite(parsed) ? parsed : 0;
};

const matchesTeam = (match: MondialLiveMatch, value: unknown): boolean => {
  const token = normalizedToken(value);
  if (!token) return false;
  return [match.home, match.away].some(team => team && [
    team.id,
    team.name,
    team.shortName,
    team.countryCode,
  ].some(candidate => normalizedToken(candidate) === token));
};

const filterByStatus = (matches: MondialLiveMatch[], value: unknown): MondialLiveMatch[] => {
  const filter = stringValue(value, 'any').toLowerCase();
  return !filter || filter === 'any' ? matches : matches.filter(match => match.status === filter);
};

const nextMatch = (matches: MondialLiveMatch[]): MondialLiveMatch | undefined => {
  const live = matches.find(match => match.status === 'live');
  if (live) return live;
  const scheduled = matches
    .filter(match => match.status === 'scheduled')
    .sort((a, b) => dateValue(a) - dateValue(b));
  return scheduled[0] || matches[0];
};

const latestMatch = (matches: MondialLiveMatch[]): MondialLiveMatch | undefined =>
  matches
    .filter(match => match.status === 'finished' || match.homeScore !== undefined || match.awayScore !== undefined)
    .sort((a, b) => dateValue(b) - dateValue(a))[0] || matches[0];

export const pickWorldCupMatch = (
  fixtures: MondialLiveMatch[],
  selection: MondialMatchSelection = {}
): MondialLiveMatch | undefined => {
  if (!fixtures.length) return undefined;
  const filtered = filterByStatus(fixtures, selection.statusFilter);
  const candidates = filtered.length ? filtered : fixtures;
  const mode = stringValue(selection.mode, 'next').toLowerCase();

  if (mode === 'latest') return latestMatch(candidates);
  if (mode === 'live') return candidates.find(match => match.status === 'live') || nextMatch(candidates);
  if (mode === 'match_id') {
    const id = stringValue(selection.selectedMatchId).trim();
    return candidates.find(match => String(match.id) === id) || nextMatch(candidates);
  }
  if (mode === 'team') {
    return candidates.find(match => matchesTeam(match, selection.teamCode)) || nextMatch(candidates);
  }
  if (mode === 'group') {
    const group = normalizedToken(selection.groupCode);
    return candidates.find(match => normalizedToken(match.group) === group) || nextMatch(candidates);
  }
  if (mode === 'round') {
    const stage = normalizedToken(selection.roundStage);
    return candidates.find(match => normalizedToken(match.stage) === stage) || nextMatch(candidates);
  }
  if (mode === 'featured') {
    const index = Math.max(0, (Number(selection.featuredMatchIndex) || 1) - 1);
    return candidates[index] || candidates[0];
  }
  return nextMatch(candidates);
};

const formatMatchDate = (dateValueInput: string | undefined): { date: string; time: string } => {
  if (!dateValueInput) return { date: '', time: '' };
  const date = new Date(dateValueInput);
  if (Number.isNaN(date.getTime())) return { date: dateValueInput, time: '' };
  return {
    date: new Intl.DateTimeFormat('ar-IQ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Baghdad',
    }).format(date),
    time: new Intl.DateTimeFormat('ar-IQ', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Baghdad',
    }).format(date),
  };
};

export const selectedMatchToFields = (
  match: MondialLiveMatch | undefined,
  competition = 'FIFA World Cup 2026'
): Record<string, unknown> => {
  if (!match) return {};
  const home = match.home;
  const away = match.away;
  const formatted = formatMatchDate(match.date);
  const stage = match.group
    ? `المجموعة ${normalizedToken(match.group)}`
    : stringValue(match.stage, 'WORLD CUP 2026');
  const status = match.status === 'live'
    ? 'LIVE'
    : match.status === 'finished'
      ? 'FT'
      : match.status === 'cancelled'
        ? 'CANCELLED'
        : 'PRE';
  return {
    selectedMatchId: match.id,
    competition,
    homeTeam: home?.name ?? match.homePlaceholder ?? 'TBD',
    homeName: home?.name ?? match.homePlaceholder ?? 'TBD',
    homeShort: home?.shortName ?? 'TBD',
    homeCode: home?.countryCode || home?.shortName || 'TBD',
    homeLogo: home?.logoUrl || home?.flagUrl || '',
    awayTeam: away?.name ?? match.awayPlaceholder ?? 'TBD',
    awayName: away?.name ?? match.awayPlaceholder ?? 'TBD',
    awayShort: away?.shortName ?? 'TBD',
    awayCode: away?.countryCode || away?.shortName || 'TBD',
    awayLogo: away?.logoUrl || away?.flagUrl || '',
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    homePenaltyScore: match.homePenaltyScore,
    awayPenaltyScore: match.awayPenaltyScore,
    minute: match.minute ?? '',
    period: match.statusLabel ?? '',
    matchStatus: status,
    status,
    statusLabel: match.statusLabel ?? '',
    stage,
    matchStage: stage,
    groupBadge: stage,
    venue: match.venue ?? '',
    matchVenue: match.venue ?? '',
    matchDate: formatted.date,
    matchTime: formatted.time,
    code: home?.countryCode || home?.shortName || 'TBD',
    teamName: home?.name ?? match.homePlaceholder ?? 'TBD',
  };
};

const normalizeScorer = (value: unknown, index: number): MondialLiveScorer | null => {
  const source = recordOf(value);
  if (!source) return null;
  const name = stringValue(source.name ?? source.ParticipantName ?? source.participantName);
  if (!name) return null;
  const countryCode = normalizeCountryCode(
    source.countryCode ?? source.code ?? source.ParticipantCountryCode
  );
  return {
    id: source.id as string | number | undefined ?? source.ParticiantId as string | number | undefined,
    name,
    nameAr: stringValue(source.nameAr, '') || undefined,
    team: stringValue(source.team ?? source.teamName ?? source.TeamName, 'World Cup'),
    code: countryCode || stringValue(source.code, ''),
    countryCode,
    flagUrl: stringValue(source.flagUrl, '') || undefined,
    goals: optionalNumber(source.goals ?? source.value ?? source.StatValue) ?? 0,
    assists: optionalNumber(source.assists ?? source.SubStatValue),
    appearances: optionalNumber(source.appearances ?? source.matchesPlayed ?? source.MatchesPlayed),
    minutesPlayed: optionalNumber(source.minutesPlayed ?? source.MinutesPlayed),
    rank: optionalNumber(source.rank ?? source.Rank) ?? index + 1,
    image: stringValue(source.image ?? source.imageUrl, '') || undefined,
  };
};

export const normalizeWorldCupScorers = (input: unknown): MondialLiveScorer[] =>
  listFrom(input, ['topScorers', 'scorers'])
    .map(normalizeScorer)
    .filter((scorer): scorer is MondialLiveScorer => Boolean(scorer))
    .sort((a, b) =>
      (b.goals - a.goals)
      || ((b.assists ?? 0) - (a.assists ?? 0))
      || ((a.minutesPlayed ?? Number.MAX_SAFE_INTEGER) - (b.minutesPlayed ?? Number.MAX_SAFE_INTEGER))
      || ((a.rank ?? 999) - (b.rank ?? 999))
    );

export const scorersFromWorldCupData = (
  liveData: Record<string, unknown> | null | undefined,
  manualScorers: unknown
): MondialLiveScorer[] => {
  const liveScorers = normalizeWorldCupScorers(liveData);
  return liveScorers.length ? liveScorers : normalizeWorldCupScorers(manualScorers);
};
