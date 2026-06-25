import { createWorldCupDataVersion } from '../../utils/worldCupLiveData.js';

const WORLD_CUP_URL = 'https://www.fotmob.com/leagues/77/overview/world-cup';
const TEAM_LOGO_URL = (id: string | number) =>
  `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;
const CACHE_TTL_MS = 15_000;
const STALE_TTL_MS = 30 * 60_000;
const REQUEST_TIMEOUT_MS = 20_000;

export type WorldCupStage = 'R32' | 'R16' | 'QF' | 'SF' | 'F' | 'BRONZE';

export type WorldCupTeam = {
  id: string | number;
  name: string;
  nameAr: string;
  shortName: string;
  countryCode: string;
  flagUrl: string;
  logoUrl: string;
};

export type WorldCupStanding = WorldCupTeam & {
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualified: boolean;
  possibleQualification: boolean;
};

export type WorldCupGroup = {
  code: string;
  name: string;
  nameAr: string;
  teams: WorldCupStanding[];
};

export type WorldCupMatch = {
  id: string | number;
  stage?: WorldCupStage;
  group?: string;
  home: WorldCupTeam | null;
  away: WorldCupTeam | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  homeScore?: number;
  awayScore?: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  winnerId?: string | number;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  statusLabel?: string;
  date?: string;
  venue?: string;
  pageUrl?: string;
  matchNo?: number;
  routeLabel?: string;
  venueLabel?: string;
  kickoffLabel?: string;
};

export type WorldCupRound = {
  stage: WorldCupStage;
  name: string;
  nameAr: string;
  participantCount: number;
  matches: WorldCupMatch[];
};

export type WorldCupSnapshot = {
  leagueId: 77;
  competition: 'World Cup';
  season: string;
  provider: 'fotmob';
  sourceMode: 'direct' | 'bridge-fallback';
  sourceUrl: string;
  sourceStatus: 'live' | 'stale';
  fetchedAt: string;
  dataVersion: string;
  groups: WorldCupGroup[];
  bestThird: WorldCupStanding[];
  rounds: WorldCupRound[];
  fixtures: WorldCupMatch[];
};

type OfficialKnockoutRoute = {
  matchNo: number;
  homePlaceholder: string;
  awayPlaceholder: string;
  routeLabel: string;
  venueLabel: string;
  kickoffLabel: string;
};

const officialRoute = (
  matchNo: number,
  homePlaceholder: string,
  awayPlaceholder: string,
  venueLabel: string,
  kickoffLabel: string
): OfficialKnockoutRoute => ({
  matchNo,
  homePlaceholder,
  awayPlaceholder,
  routeLabel: `${homePlaceholder} vs ${awayPlaceholder}`,
  venueLabel,
  kickoffLabel,
});

const OFFICIAL_KNOCKOUT_ROUTES: Record<WorldCupStage, OfficialKnockoutRoute[]> = {
  R32: [
    officialRoute(73, '2A', '2B', 'Inglewood', 'Jun 28'),
    officialRoute(74, '1E', '3 A/B/C/D/F', 'Foxborough', 'Jun 29'),
    officialRoute(75, '1F', '2C', 'Guadalupe', 'Jun 29'),
    officialRoute(76, '1C', '2F', 'Houston', 'Jun 29'),
    officialRoute(77, '1I', '3 C/D/F/G/H', 'East Rutherford', 'Jun 30'),
    officialRoute(78, '2E', '2I', 'Arlington', 'Jun 30'),
    officialRoute(79, '1A', '3 C/E/F/H/I', 'Mexico City', 'Jun 30'),
    officialRoute(80, '1L', '3 E/H/I/J/K', 'Atlanta', 'Jul 1'),
    officialRoute(81, '1D', '3 B/E/F/I/J', 'Santa Clara', 'Jul 1'),
    officialRoute(82, '1G', '3 A/E/H/I/J', 'Seattle', 'Jul 1'),
    officialRoute(83, '2K', '2L', 'Toronto', 'Jul 2'),
    officialRoute(84, '1H', '2J', 'Inglewood', 'Jul 2'),
    officialRoute(85, '1B', '3 E/F/G/I/J', 'Vancouver', 'Jul 2'),
    officialRoute(86, '1J', '2H', 'Miami Gardens', 'Jul 3'),
    officialRoute(87, '1K', '3 D/E/I/J/L', 'Kansas City', 'Jul 3'),
    officialRoute(88, '2D', '2G', 'Arlington', 'Jul 3'),
  ],
  R16: [
    officialRoute(89, 'W74', 'W77', 'Philadelphia', 'Jul 4'),
    officialRoute(90, 'W73', 'W75', 'Houston', 'Jul 4'),
    officialRoute(91, 'W76', 'W78', 'East Rutherford', 'Jul 5'),
    officialRoute(92, 'W79', 'W80', 'Mexico City', 'Jul 5'),
    officialRoute(93, 'W83', 'W84', 'Arlington', 'Jul 6'),
    officialRoute(94, 'W81', 'W82', 'Seattle', 'Jul 6'),
    officialRoute(95, 'W86', 'W88', 'Atlanta', 'Jul 7'),
    officialRoute(96, 'W85', 'W87', 'Vancouver', 'Jul 7'),
  ],
  QF: [
    officialRoute(97, 'W89', 'W90', 'Foxborough', 'Jul 9'),
    officialRoute(98, 'W93', 'W94', 'Inglewood', 'Jul 10'),
    officialRoute(99, 'W91', 'W92', 'Miami Gardens', 'Jul 11'),
    officialRoute(100, 'W95', 'W96', 'Kansas City', 'Jul 11'),
  ],
  SF: [
    officialRoute(101, 'W97', 'W98', 'Arlington', 'Jul 14'),
    officialRoute(102, 'W99', 'W100', 'Atlanta', 'Jul 15'),
  ],
  F: [
    officialRoute(104, 'W101', 'W102', 'East Rutherford', 'Jul 19'),
  ],
  BRONZE: [
    officialRoute(103, 'L101', 'L102', 'Miami Gardens', 'Jul 18'),
  ],
};

type CountryIdentity = {
  code: string;
  ar: string;
  short: string;
};

const COUNTRY_IDENTITIES: Record<string, CountryIdentity> = {
  mexico: { code: 'mx', ar: 'المكسيك', short: 'MEX' },
  'south korea': { code: 'kr', ar: 'كوريا الجنوبية', short: 'KOR' },
  'korea republic': { code: 'kr', ar: 'كوريا الجنوبية', short: 'KOR' },
  czechia: { code: 'cz', ar: 'التشيك', short: 'CZE' },
  'south africa': { code: 'za', ar: 'جنوب أفريقيا', short: 'RSA' },
  canada: { code: 'ca', ar: 'كندا', short: 'CAN' },
  switzerland: { code: 'ch', ar: 'سويسرا', short: 'SUI' },
  'bosnia and herzegovina': { code: 'ba', ar: 'البوسنة والهرسك', short: 'BIH' },
  qatar: { code: 'qa', ar: 'قطر', short: 'QAT' },
  brazil: { code: 'br', ar: 'البرازيل', short: 'BRA' },
  morocco: { code: 'ma', ar: 'المغرب', short: 'MAR' },
  scotland: { code: 'gb-sct', ar: 'اسكتلندا', short: 'SCO' },
  haiti: { code: 'ht', ar: 'هايتي', short: 'HAI' },
  usa: { code: 'us', ar: 'الولايات المتحدة', short: 'USA' },
  'united states': { code: 'us', ar: 'الولايات المتحدة', short: 'USA' },
  australia: { code: 'au', ar: 'أستراليا', short: 'AUS' },
  paraguay: { code: 'py', ar: 'باراغواي', short: 'PAR' },
  turkiye: { code: 'tr', ar: 'تركيا', short: 'TUR' },
  turkey: { code: 'tr', ar: 'تركيا', short: 'TUR' },
  germany: { code: 'de', ar: 'ألمانيا', short: 'GER' },
  'ivory coast': { code: 'ci', ar: 'ساحل العاج', short: 'CIV' },
  "cote d'ivoire": { code: 'ci', ar: 'ساحل العاج', short: 'CIV' },
  ecuador: { code: 'ec', ar: 'الإكوادور', short: 'ECU' },
  curacao: { code: 'cw', ar: 'كوراساو', short: 'CUW' },
  netherlands: { code: 'nl', ar: 'هولندا', short: 'NED' },
  japan: { code: 'jp', ar: 'اليابان', short: 'JPN' },
  sweden: { code: 'se', ar: 'السويد', short: 'SWE' },
  tunisia: { code: 'tn', ar: 'تونس', short: 'TUN' },
  egypt: { code: 'eg', ar: 'مصر', short: 'EGY' },
  iran: { code: 'ir', ar: 'إيران', short: 'IRN' },
  belgium: { code: 'be', ar: 'بلجيكا', short: 'BEL' },
  'new zealand': { code: 'nz', ar: 'نيوزيلندا', short: 'NZL' },
  spain: { code: 'es', ar: 'إسبانيا', short: 'ESP' },
  uruguay: { code: 'uy', ar: 'أوروغواي', short: 'URU' },
  'cape verde': { code: 'cv', ar: 'الرأس الأخضر', short: 'CPV' },
  'saudi arabia': { code: 'sa', ar: 'السعودية', short: 'KSA' },
  norway: { code: 'no', ar: 'النرويج', short: 'NOR' },
  france: { code: 'fr', ar: 'فرنسا', short: 'FRA' },
  senegal: { code: 'sn', ar: 'السنغال', short: 'SEN' },
  iraq: { code: 'iq', ar: 'العراق', short: 'IRQ' },
  argentina: { code: 'ar', ar: 'الأرجنتين', short: 'ARG' },
  austria: { code: 'at', ar: 'النمسا', short: 'AUT' },
  jordan: { code: 'jo', ar: 'الأردن', short: 'JOR' },
  algeria: { code: 'dz', ar: 'الجزائر', short: 'ALG' },
  colombia: { code: 'co', ar: 'كولومبيا', short: 'COL' },
  'dr congo': { code: 'cd', ar: 'الكونغو الديمقراطية', short: 'COD' },
  'congo dr': { code: 'cd', ar: 'الكونغو الديمقراطية', short: 'COD' },
  portugal: { code: 'pt', ar: 'البرتغال', short: 'POR' },
  uzbekistan: { code: 'uz', ar: 'أوزبكستان', short: 'UZB' },
  england: { code: 'gb-eng', ar: 'إنجلترا', short: 'ENG' },
  ghana: { code: 'gh', ar: 'غانا', short: 'GHA' },
  panama: { code: 'pa', ar: 'بنما', short: 'PAN' },
  croatia: { code: 'hr', ar: 'كرواتيا', short: 'CRO' },
};

const STAGE_META: Record<string, Pick<WorldCupRound, 'stage' | 'name' | 'nameAr'>> = {
  '1/16': { stage: 'R32', name: 'Round of 32', nameAr: 'دور الـ32' },
  '1/8': { stage: 'R16', name: 'Round of 16', nameAr: 'دور الـ16' },
  '1/4': { stage: 'QF', name: 'Quarterfinals', nameAr: 'ربع النهائي' },
  '1/2': { stage: 'SF', name: 'Semifinals', nameAr: 'نصف النهائي' },
  final: { stage: 'F', name: 'Final', nameAr: 'النهائي' },
  bronze: { stage: 'BRONZE', name: 'Third place', nameAr: 'المركز الثالث' },
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {};

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && value.trim() && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

const asBoolean = (value: unknown): boolean => value === true;

const normalizeName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘]/g, "'")
  .replace(/[^a-zA-Z0-9' ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const identityFor = (name: string): CountryIdentity => {
  const normalized = normalizeName(name);
  return COUNTRY_IDENTITIES[normalized] ?? {
    code: 'un',
    ar: name,
    short: name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'TBD',
  };
};

const flagUrlFor = (countryCode: string) =>
  countryCode === 'un'
    ? ''
    : `https://flagcdn.com/w160/${countryCode}.png`;

const parseScores = (score: string) => {
  const match = score.match(/(-?\d+)\s*[-:]\s*(-?\d+)/);
  return match
    ? { goalsFor: Number(match[1]), goalsAgainst: Number(match[2]) }
    : { goalsFor: 0, goalsAgainst: 0 };
};

const makeTeam = (rawValue: unknown): WorldCupTeam | null => {
  const raw = asRecord(rawValue);
  const name = asString(raw.name) || asString(raw.homeTeam) || asString(raw.awayTeam);
  const id = raw.id ?? raw.teamId ?? raw.homeTeamId ?? raw.awayTeamId;
  if (!name || (typeof id !== 'string' && typeof id !== 'number')) return null;
  const identity = identityFor(name);
  return {
    id,
    name,
    nameAr: identity.ar,
    shortName: asString(raw.shortName) || identity.short,
    countryCode: identity.code,
    flagUrl: flagUrlFor(identity.code),
    logoUrl: TEAM_LOGO_URL(id),
  };
};

const normalizeStanding = (rawValue: unknown): WorldCupStanding | null => {
  const raw = asRecord(rawValue);
  const team = makeTeam(raw);
  if (!team) return null;
  const { goalsFor, goalsAgainst } = parseScores(asString(raw.scoresStr));
  const qualificationColor = asString(raw.qualColor).toLowerCase();
  return {
    ...team,
    position: asNumber(raw.idx),
    played: asNumber(raw.played),
    wins: asNumber(raw.wins),
    draws: asNumber(raw.draws),
    losses: asNumber(raw.losses),
    goalsFor,
    goalsAgainst,
    goalDifference: asNumber(raw.goalConDiff, goalsFor - goalsAgainst),
    points: asNumber(raw.pts),
    qualified: qualificationColor === '#2ad572',
    possibleQualification: qualificationColor === '#ffd908',
  };
};

const getMatchStatus = (statusValue: unknown): WorldCupMatch['status'] => {
  const status = asRecord(statusValue);
  if (asBoolean(status.cancelled)) return 'cancelled';
  if (asBoolean(status.finished)) return 'finished';
  if (asBoolean(status.started)) return 'live';
  return 'scheduled';
};

const getWinnerId = (home: Record<string, unknown>, away: Record<string, unknown>) => {
  if (asBoolean(home.winner)) return home.id as string | number;
  if (asBoolean(away.winner)) return away.id as string | number;
  return undefined;
};

const normalizeMatchup = (rawValue: unknown, stage: WorldCupStage, index = 0): WorldCupMatch | null => {
  const matchup = asRecord(rawValue);
  const match = asRecord(asArray(matchup.matches)[0]);
  if (!Object.keys(match).length) return null;
  const homeRaw = asRecord(match.home);
  const awayRaw = asRecord(match.away);
  const isHomeTbd = asBoolean(matchup.tbdTeam1);
  const isAwayTbd = asBoolean(matchup.tbdTeam2);
  const status = getMatchStatus(match.status);
  const started = status === 'live' || status === 'finished';
  const venue = asRecord(match.venueInfo);
  const routeMeta = OFFICIAL_KNOCKOUT_ROUTES[stage]?.[index];
  const result: WorldCupMatch = {
    id: match.matchId as string | number,
    stage,
    home: isHomeTbd ? null : makeTeam(homeRaw),
    away: isAwayTbd ? null : makeTeam(awayRaw),
    status,
    date: asString(asRecord(match.status).utcTime) || asString(match.matchDate) || undefined,
    pageUrl: asString(match.pageUrl) || undefined,
    venue: asString(venue.name) || undefined,
    matchNo: routeMeta?.matchNo,
    routeLabel: routeMeta?.routeLabel,
    venueLabel: routeMeta?.venueLabel,
    kickoffLabel: routeMeta?.kickoffLabel,
  };
  if (isHomeTbd) result.homePlaceholder = asString(homeRaw.name) || asString(matchup.homeTeam) || 'TBD';
  if (isAwayTbd) result.awayPlaceholder = asString(awayRaw.name) || asString(matchup.awayTeam) || 'TBD';
  if (started) {
    result.homeScore = asNumber(homeRaw.score);
    result.awayScore = asNumber(awayRaw.score);
    const winnerId = getWinnerId(homeRaw, awayRaw);
    if (winnerId !== undefined) result.winnerId = winnerId;
  }
  return result;
};

const normalizeFixture = (rawValue: unknown): WorldCupMatch | null => {
  const raw = asRecord(rawValue);
  const homeRaw = asRecord(raw.home);
  const awayRaw = asRecord(raw.away);
  const statusRaw = asRecord(raw.status);
  const status = getMatchStatus(statusRaw);
  const result: WorldCupMatch = {
    id: raw.id as string | number,
    group: asString(raw.group) || undefined,
    home: makeTeam(homeRaw),
    away: makeTeam(awayRaw),
    status,
    statusLabel: asString(asRecord(statusRaw.reason).short) || undefined,
    date: asString(statusRaw.utcTime) || undefined,
    pageUrl: asString(raw.pageUrl) || undefined,
  };
  if (status === 'live' || status === 'finished') {
    const score = parseScores(asString(statusRaw.scoreStr));
    result.homeScore = score.goalsFor;
    result.awayScore = score.goalsAgainst;
  }
  return result.home && result.away ? result : null;
};

export const normalizeFotMobWorldCup = (pagePropsValue: unknown): WorldCupSnapshot => {
  const pageProps = asRecord(pagePropsValue);
  const tableContainer = asRecord(asArray(pageProps.table)[0]);
  const tableData = asRecord(tableContainer.data);
  const rawTables = asArray(tableData.tables);

  const groups = rawTables
    .map((value): WorldCupGroup | null => {
      const raw = asRecord(value);
      const leagueName = asString(raw.leagueName);
      const code = leagueName.match(/^Grp\.\s*([A-L])$/i)?.[1]?.toUpperCase();
      if (!code) return null;
      const standings = asArray(asRecord(raw.table).all)
        .map(normalizeStanding)
        .filter((team): team is WorldCupStanding => Boolean(team));
      return {
        code,
        name: `Group ${code}`,
        nameAr: `المجموعة ${code}`,
        teams: standings,
      };
    })
    .filter((group): group is WorldCupGroup => Boolean(group));

  const bestThirdTable = rawTables.find((value) =>
    asString(asRecord(value).leagueName).toLowerCase().includes('best 3rd'));
  const bestThird = asArray(asRecord(asRecord(bestThirdTable).table).all)
    .map(normalizeStanding)
    .filter((team): team is WorldCupStanding => Boolean(team));

  const playoff = asRecord(pageProps.playoff);
  const rounds = asArray(playoff.rounds)
    .map((value): WorldCupRound | null => {
      const raw = asRecord(value);
      const meta = STAGE_META[asString(raw.stage)];
      if (!meta) return null;
      const matches = asArray(raw.matchups)
        .map((matchup, index) => normalizeMatchup(matchup, meta.stage, index))
        .filter((match): match is WorldCupMatch => Boolean(match));
      return {
        ...meta,
        participantCount: asNumber(raw.participantCount, matches.length * 2),
        matches,
      };
    })
    .filter((round): round is WorldCupRound => Boolean(round));

  const bronzeMeta = STAGE_META.bronze;
  const bronzeMatchup = asRecord(playoff.bronzeFinal);
  const normalizedBronze = normalizeMatchup(bronzeMatchup, bronzeMeta.stage, 0);
  if (normalizedBronze) {
    rounds.push({
      ...bronzeMeta,
      participantCount: 2,
      matches: [normalizedBronze],
    });
  }

  const fixturesRoot = asRecord(pageProps.fixtures);
  const fixtures = asArray(fixturesRoot.allMatches)
    .map(normalizeFixture)
    .filter((match): match is WorldCupMatch => Boolean(match));

  const details = asRecord(pageProps.details);
  const selectedSeason = details.selectedSeason;
  const season = typeof selectedSeason === 'object'
    ? asString(asRecord(selectedSeason).name, '2026')
    : String(selectedSeason || '2026');

  if (groups.length !== 12) {
    throw new Error(`FotMob World Cup payload has ${groups.length} groups; expected 12.`);
  }
  if (!rounds.some((round) => round.stage === 'R32')) {
    throw new Error('FotMob World Cup payload is missing the Round of 32 bracket.');
  }

  const snapshot = {
    leagueId: 77,
    competition: 'World Cup',
    season,
    provider: 'fotmob',
    sourceMode: 'direct',
    sourceUrl: WORLD_CUP_URL,
    sourceStatus: 'live',
    fetchedAt: new Date().toISOString(),
    groups,
    bestThird,
    rounds,
    fixtures,
  } satisfies Omit<WorldCupSnapshot, 'dataVersion'>;

  return {
    ...snapshot,
    dataVersion: createWorldCupDataVersion(snapshot),
  };
};

let cache: { expiresAt: number; staleUntil: number; snapshot: WorldCupSnapshot } | null = null;
let pendingRequest: Promise<WorldCupSnapshot> | null = null;

const fetchWorldCupSnapshot = async (): Promise<WorldCupSnapshot> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(WORLD_CUP_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; REO-SHOW/1.0; +https://www.fotmob.com)',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`FotMob responded with HTTP ${response.status}.`);
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match?.[1]) throw new Error('FotMob page did not contain __NEXT_DATA__.');
    const nextData = asRecord(JSON.parse(match[1]));
    const props = asRecord(nextData.props);
    return normalizeFotMobWorldCup(asRecord(props.pageProps));
  } finally {
    clearTimeout(timeout);
  }
};

const fetchWorldCupSnapshotFromBridge = async (): Promise<WorldCupSnapshot> => {
  const baseUrl = process.env.REO_BRIDGE_URL?.trim().replace(/\/+$/, '');
  const token = process.env.REO_BRIDGE_TOKEN?.trim();
  if (!baseUrl || !token) throw new Error('REO match bridge fallback is not configured.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/api/world-cup`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`REO match bridge responded with HTTP ${response.status}.`);
    const payload = asRecord(await response.json());
    const pageProps = payload.pageProps;
    if (!pageProps) throw new Error('REO match bridge World Cup response is missing pageProps.');
    const snapshot = normalizeFotMobWorldCup(pageProps);
    return {
      ...snapshot,
      sourceMode: 'bridge-fallback',
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const getWorldCupSnapshot = async (): Promise<WorldCupSnapshot> => {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.snapshot;
  if (!pendingRequest) {
    pendingRequest = fetchWorldCupSnapshot()
      .catch(async (directError) => {
        try {
          return await fetchWorldCupSnapshotFromBridge();
        } catch (bridgeError) {
          throw new Error(
            `FotMob direct failed: ${directError instanceof Error ? directError.message : 'unknown error'}; ` +
            `bridge fallback failed: ${bridgeError instanceof Error ? bridgeError.message : 'unknown error'}.`
          );
        }
      })
      .then((snapshot) => {
        const fetchedAt = Date.now();
        cache = {
          expiresAt: fetchedAt + CACHE_TTL_MS,
          staleUntil: fetchedAt + STALE_TTL_MS,
          snapshot,
        };
        return snapshot;
      })
      .catch((error) => {
        if (cache && cache.staleUntil > Date.now()) {
          return { ...cache.snapshot, sourceStatus: 'stale' as const };
        }
        throw error;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
};

