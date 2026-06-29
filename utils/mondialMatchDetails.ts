export type MondialMatchDetailTeam = {
  id: string;
  name: string;
  code: string;
  countryCode: string;
  logoUrl: string;
  color?: string;
  score?: number;
};

export type MondialMatchDetailEvent = {
  minute: number;
  extraMinute?: number;
  type: string;
  player: string;
  team: 'home' | 'away' | 'neutral';
  homeScore?: number;
  awayScore?: number;
};

export type MondialMatchDetailPlayer = {
  id?: string;
  name: string;
  number?: number;
  pos?: string;
  x?: number;
  y?: number;
  image?: string;
  rating?: number;
  team?: 'home' | 'away';
};

export type MondialMatchDetailLineup = {
  teamName: string;
  teamCode: string;
  formation: string;
  rating?: number;
  coach?: string;
  starters: MondialMatchDetailPlayer[];
  subs: MondialMatchDetailPlayer[];
};

export type MondialMatchDetailStat = {
  key: string;
  label: string;
  home: number | string;
  away: number | string;
};

export type MondialMatchDetailPotm = {
  id?: string;
  name: string;
  teamName: string;
  team: 'home' | 'away' | 'neutral';
  rating?: number;
  image?: string;
  stats?: Array<{
    key: string;
    label: string;
    value: number | string;
    total?: number;
  }>;
};

export type MondialMatchDetails = {
  schemaVersion: 'reo-match-details-v1';
  provider: 'fotmob' | 'reo-match-bridge';
  sourceMode: 'direct' | 'bridge-fallback' | 'bridge';
  sourceStatus: 'live' | 'stale';
  sourceUrl: string;
  fetchedAt: string;
  dataVersion: string;
  match: {
    id: string;
    competition: string;
    stage: string;
    date: string;
    status: string;
    statusLabel: string;
    minute?: string | number;
    home: MondialMatchDetailTeam;
    away: MondialMatchDetailTeam;
    homeScore: number;
    awayScore: number;
    venue?: string;
  };
  events: MondialMatchDetailEvent[];
  lineups: {
    home?: MondialMatchDetailLineup;
    away?: MondialMatchDetailLineup;
  };
  teamStats: MondialMatchDetailStat[];
  players: MondialMatchDetailPlayer[];
  playerOfTheMatch?: MondialMatchDetailPotm;
  topPlayers: {
    home: MondialMatchDetailPotm[];
    away: MondialMatchDetailPotm[];
  };
  availability: {
    lineups: boolean;
    events: boolean;
    teamStats: boolean;
    playerStats: boolean;
    ratings: boolean;
  };
};

const PLAYER_IMAGE_URL = (id: string | number) =>
  `https://images.fotmob.com/image_resources/playerimages/${id}.png`;

const TEAM_LOGO_URL = (id: string | number) =>
  `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const stringValue = (value: unknown, fallback = ''): string =>
  value === undefined || value === null || value === '' ? fallback : String(value);

const numberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const statIdentity = (stat: MondialMatchDetailStat): string =>
  `${stat.key || ''} ${stat.label || ''}`
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const detailStatValue = (
  stat: MondialMatchDetailStat | undefined,
  side: 'home' | 'away'
): number | undefined => {
  if (!stat) return undefined;
  const raw = stat[side];
  if (typeof raw === 'string') {
    const percent = raw.match(/(-?\d+(?:\.\d+)?)\s*%/);
    if (percent) return Number(percent[1]);
    const ratio = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (ratio) {
      const made = Number(ratio[1]);
      const total = Number(ratio[2]);
      if (Number.isFinite(made) && Number.isFinite(total) && total > 0) {
        return Math.round((made / total) * 100);
      }
    }
  }
  const value = numberValue(raw, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
};

const findMappedStat = (
  stats: MondialMatchDetailStat[],
  aliases: string[]
): MondialMatchDetailStat | undefined => {
  const normalizedAliases = aliases.map(alias => alias.toLowerCase());
  return stats.find(stat => {
    const identity = statIdentity(stat);
    return normalizedAliases.some(alias => identity.includes(alias));
  });
};

const mappedTeamStatFields = (
  stats: MondialMatchDetailStat[]
): Record<string, number> => {
  const statMap: Array<{
    homeField: string;
    awayField: string;
    aliases: string[];
  }> = [
    {
      homeField: 'statPossessionHome',
      awayField: 'statPossessionAway',
      aliases: ['ballpossesion', 'ball possession', 'possession'],
    },
    {
      homeField: 'statXgHome',
      awayField: 'statXgAway',
      aliases: ['expected goals', 'expected goals xg', 'xg'],
    },
    {
      homeField: 'statShotsHome',
      awayField: 'statShotsAway',
      aliases: ['total shots', 'totalshots', 'shots total'],
    },
    {
      homeField: 'statOnTargetHome',
      awayField: 'statOnTargetAway',
      aliases: ['shots on target', 'shotsontarget', 'on target'],
    },
    {
      homeField: 'statShotAccuracyHome',
      awayField: 'statShotAccuracyAway',
      aliases: ['shot accuracy', 'shots accuracy', 'on target percentage'],
    },
    {
      homeField: 'statPressureHome',
      awayField: 'statPressureAway',
      aliases: ['high press', 'high turnovers', 'possession won final 3rd', 'ppda', 'pressure'],
    },
    {
      homeField: 'statFieldTiltHome',
      awayField: 'statFieldTiltAway',
      aliases: ['field tilt', 'final third entries', 'territory'],
    },
    {
      homeField: 'statRecoveriesHome',
      awayField: 'statRecoveriesAway',
      aliases: ['ball recoveries', 'recoveries', 'possession won'],
    },
    {
      homeField: 'statDuelsHome',
      awayField: 'statDuelsAway',
      aliases: ['duels won', 'ground duels won', 'aerial duels won'],
    },
    {
      homeField: 'statCornersHome',
      awayField: 'statCornersAway',
      aliases: ['corners', 'corner kicks'],
    },
    {
      homeField: 'statFoulsHome',
      awayField: 'statFoulsAway',
      aliases: ['fouls committed', 'fouls'],
    },
    {
      homeField: 'statYellowHome',
      awayField: 'statYellowAway',
      aliases: ['yellow cards', 'yellowcards'],
    },
    {
      homeField: 'statPassHome',
      awayField: 'statPassAway',
      aliases: ['accurate passes', 'accuratepasses', 'pass accuracy'],
    },
  ];

  return statMap.reduce<Record<string, number>>((fields, definition) => {
    const stat = findMappedStat(stats, definition.aliases);
    const home = detailStatValue(stat, 'home');
    const away = detailStatValue(stat, 'away');
    if (home !== undefined) fields[definition.homeField] = home;
    if (away !== undefined) fields[definition.awayField] = away;
    return fields;
  }, {});
};

const optionalNumber = (value: unknown): number | undefined => {
  const parsed = numberValue(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const pitchScaleFor = (...values: Array<number | undefined>): number => {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (!finite.length) return 1;
  const max = Math.max(...finite.map(value => Math.abs(value)));
  if (max <= 1.2) return 100;
  if (max <= 10) return 10;
  return 1;
};

const normalizePitchCoordinate = (
  value: number | undefined,
  scale: number,
  min: number,
  max: number
): number | undefined => {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(min, Math.min(max, Number(value) * scale));
};

const countryToIso2 = (value: unknown): string => {
  const token = stringValue(value).trim().toLowerCase();
  if (token.length === 2) return token;
  const map: Record<string, string> = {
    mex: 'mx',
    rsa: 'za',
    kor: 'kr',
    cze: 'cz',
    can: 'ca',
    bih: 'ba',
    qat: 'qa',
    sui: 'ch',
    bra: 'br',
    mar: 'ma',
    hai: 'ht',
    sco: 'gb-sct',
    usa: 'us',
    par: 'py',
    aus: 'au',
    tur: 'tr',
    ger: 'de',
    cuw: 'cw',
    civ: 'ci',
    ecu: 'ec',
    ned: 'nl',
    jpn: 'jp',
    swe: 'se',
    tun: 'tn',
    bel: 'be',
    egy: 'eg',
    irn: 'ir',
    nzl: 'nz',
    esp: 'es',
    cpv: 'cv',
    ksa: 'sa',
    uru: 'uy',
    fra: 'fr',
    sen: 'sn',
    irq: 'iq',
    nor: 'no',
    arg: 'ar',
    alg: 'dz',
    aut: 'at',
    jor: 'jo',
    por: 'pt',
    cod: 'cd',
    uzb: 'uz',
    col: 'co',
    eng: 'gb-eng',
    cro: 'hr',
    gha: 'gh',
    pan: 'pa',
  };
  return map[token] || token;
};

const codeFromTeam = (team: Record<string, unknown> | null, fallback: string): string => {
  const name = stringValue(team?.name).toLowerCase();
  const id = stringValue(team?.id);
  const byId: Record<string, string> = {
    '6710': 'MEX',
    '6316': 'RSA',
    '7804': 'KOR',
    '8496': 'CZE',
    '5810': 'CAN',
    '10106': 'BIH',
    '8030': 'QAT',
    '6694': 'SUI',
    '6237': 'BRA',
    '6262': 'MAR',
    '6279': 'HAI',
    '6216': 'SCO',
    '6713': 'USA',
    '6420': 'PAR',
    '8256': 'AUS',
    '6303': 'TUR',
    '8570': 'GER',
    '8361': 'CUW',
    '6395': 'CIV',
    '6381': 'ECU',
    '6708': 'NED',
    '6260': 'JPN',
    '6709': 'SWE',
    '6410': 'TUN',
    '6304': 'BEL',
    '6308': 'EGY',
    '6552': 'IRN',
    '6636': 'NZL',
    '6720': 'ESP',
    '10307': 'CPV',
    '6355': 'KSA',
    '6719': 'URU',
    '6723': 'FRA',
    '6356': 'SEN',
    '6284': 'IRQ',
    '6417': 'NOR',
    '6706': 'ARG',
    '6249': 'ALG',
    '8572': 'AUT',
    '6263': 'JOR',
    '6725': 'POR',
    '6347': 'COD',
    '10235': 'UZB',
    '6324': 'COL',
    '8495': 'ENG',
    '8573': 'CRO',
    '6421': 'GHA',
    '6281': 'PAN',
  };
  if (byId[id]) return byId[id];
  const byName: Record<string, string> = {
    mexico: 'MEX',
    'south africa': 'RSA',
    'south korea': 'KOR',
    czechia: 'CZE',
    canada: 'CAN',
    'bosnia and herzegovina': 'BIH',
    qatar: 'QAT',
    switzerland: 'SUI',
    brazil: 'BRA',
    morocco: 'MAR',
    haiti: 'HAI',
    scotland: 'SCO',
    usa: 'USA',
    paraguay: 'PAR',
    australia: 'AUS',
    turkey: 'TUR',
    germany: 'GER',
    curacao: 'CUW',
    "cote d'ivoire": 'CIV',
    ecuador: 'ECU',
    netherlands: 'NED',
    japan: 'JPN',
    sweden: 'SWE',
    tunisia: 'TUN',
    belgium: 'BEL',
    egypt: 'EGY',
    iran: 'IRN',
    'new zealand': 'NZL',
    spain: 'ESP',
    'cabo verde': 'CPV',
    'saudi arabia': 'KSA',
    uruguay: 'URU',
    france: 'FRA',
    senegal: 'SEN',
    iraq: 'IRQ',
    norway: 'NOR',
    argentina: 'ARG',
    algeria: 'ALG',
    austria: 'AUT',
    jordan: 'JOR',
    portugal: 'POR',
    'congo dr': 'COD',
    uzbekistan: 'UZB',
    colombia: 'COL',
    england: 'ENG',
    croatia: 'CRO',
    ghana: 'GHA',
    panama: 'PAN',
  };
  return byName[name] || fallback;
};

const normalizeStatus = (raw: Record<string, unknown> | null, finished: boolean): string => {
  if (finished) return 'finished';
  const reason = recordOf(raw?.reason);
  const token = stringValue(reason?.short ?? raw?.status ?? raw?.short).toLowerCase();
  if (token.includes('live') || token.includes("'") || token === 'ht') return 'live';
  if (token.includes('postpon') || token.includes('cancel')) return 'cancelled';
  return 'scheduled';
};

const normalizeTeam = (
  team: Record<string, unknown> | null,
  side: 'home' | 'away',
  score: number,
  color?: string
): MondialMatchDetailTeam => {
  const id = stringValue(team?.id, side);
  const code = codeFromTeam(team, side === 'home' ? 'HOME' : 'AWAY');
  return {
    id,
    name: stringValue(team?.name, side === 'home' ? 'Home' : 'Away'),
    code,
    countryCode: countryToIso2(code),
    logoUrl: stringValue(team?.imageUrl, '') || TEAM_LOGO_URL(id),
    color,
    score,
  };
};

const playerName = (value: unknown): string => {
  const source = recordOf(value);
  if (!source) return stringValue(value);
  const directName = stringValue(
    source.fullName ??
    `${stringValue(source.firstName)} ${stringValue(source.lastName)}`.trim()
  );
  if (directName) return directName;
  const name = source.name;
  if (typeof name === 'string') return name;
  const nameRecord = recordOf(name);
  return stringValue(nameRecord?.fullName ?? `${stringValue(nameRecord?.firstName)} ${stringValue(nameRecord?.lastName)}`.trim());
};

const eventList = (rawEvents: unknown): MondialMatchDetailEvent[] => {
  const eventBox = recordOf(rawEvents);
  const events = Array.isArray(eventBox?.events) ? eventBox.events : [];
  return events.map((eventValue): MondialMatchDetailEvent | null => {
    const event = recordOf(eventValue);
    if (!event) return null;
    const minute = optionalNumber(event.time ?? event.timeStr) ?? 0;
    const player = recordOf(event.player);
    return {
      minute,
      extraMinute: optionalNumber(event.overloadTime),
      type: stringValue(event.type, 'event'),
      player: playerName(player?.name ?? player),
      team: event.isHome === true ? 'home' : event.isHome === false ? 'away' : 'neutral',
      homeScore: optionalNumber(event.homeScore),
      awayScore: optionalNumber(event.awayScore),
    };
  }).filter((event): event is MondialMatchDetailEvent => Boolean(event));
};

const playerRating = (playerId: unknown, playerStats: Record<string, unknown>): number | undefined => {
  const stats = recordOf(playerStats[stringValue(playerId)]);
  const ratingValue = stats?.rating ?? stats?.ratingProps;
  if (typeof ratingValue === 'number' || typeof ratingValue === 'string') return optionalNumber(ratingValue);
  const ratingRecord = recordOf(ratingValue);
  return optionalNumber(ratingRecord?.num ?? ratingRecord?.rating);
};

const lineupPositionLabel = (player: Record<string, unknown>): string => {
  const explicit = stringValue(
    player.positionLabel ??
    player.position ??
    player.positionString ??
    player.positionShort ??
    player.role ??
    player.positionDescription,
    ''
  );
  if (explicit) return explicit;
  return optionalNumber(player.shirtNumber) === 1 ? 'GK' : '';
};

const lineupPlayer = (
  value: unknown,
  index: number,
  team: 'home' | 'away',
  playerStats: Record<string, unknown>
): MondialMatchDetailPlayer | null => {
  const player = recordOf(value);
  if (!player) return null;
  const id = stringValue(player.id, '');
  const horizontal = recordOf(player.horizontalLayout);
  const vertical = recordOf(player.verticalLayout);
  const rawX = optionalNumber(horizontal?.x ?? vertical?.x);
  const rawY = optionalNumber(horizontal?.y ?? vertical?.y);
  const pitchScale = pitchScaleFor(rawX, rawY);
  const x = normalizePitchCoordinate(rawX, pitchScale, 8, 92);
  const y = normalizePitchCoordinate(rawY, pitchScale, 10, 88);
  const pos = lineupPositionLabel(player);
  return {
    id: id || undefined,
    name: stringValue(player.name, `Player ${index + 1}`),
    number: optionalNumber(player.shirtNumber),
    pos,
    x,
    y,
    image: id ? PLAYER_IMAGE_URL(id) : undefined,
    rating: playerRating(id, playerStats),
    team,
  };
};

const normalizeLineup = (
  source: Record<string, unknown> | null,
  side: 'home' | 'away',
  playerStats: Record<string, unknown>
): MondialMatchDetailLineup | undefined => {
  if (!source) return undefined;
  const starters = (Array.isArray(source.starters) ? source.starters : [])
    .map((player, index) => lineupPlayer(player, index, side, playerStats))
    .filter((player): player is MondialMatchDetailPlayer => Boolean(player));
  const subs = (Array.isArray(source.subs) ? source.subs : [])
    .map((player, index) => lineupPlayer(player, index, side, playerStats))
    .filter((player): player is MondialMatchDetailPlayer => Boolean(player));
  const coach = recordOf(source.coach);
  if (!starters.length && !subs.length) return undefined;
  return {
    teamName: stringValue(source.name),
    teamCode: codeFromTeam(source, side === 'home' ? 'HOME' : 'AWAY'),
    formation: stringValue(source.formation, ''),
    rating: optionalNumber(source.rating),
    coach: stringValue(coach?.name, '') || undefined,
    starters,
    subs,
  };
};

const statRows = (statsSource: unknown): MondialMatchDetailStat[] => {
  const periods = recordOf(recordOf(statsSource)?.Periods);
  const all = recordOf(periods?.All);
  const categories = Array.isArray(all?.stats) ? all.stats : [];
  const rows: MondialMatchDetailStat[] = [];
  const seen = new Set<string>();
  categories.forEach(categoryValue => {
    const category = recordOf(categoryValue);
    const stats = Array.isArray(category?.stats) ? category.stats : [];
    stats.forEach(statValue => {
      const stat = recordOf(statValue);
      const values = Array.isArray(stat?.stats) ? stat.stats : [];
      if (!stat || values.length < 2 || values[0] === null || values[0] === undefined || values[1] === null || values[1] === undefined) return;
      const key = stringValue(stat.key, stringValue(stat.title));
      const label = stringValue(stat.title, key);
      const identity = `${key.toLowerCase()}::${label.toLowerCase()}`;
      if (seen.has(identity)) return;
      seen.add(identity);
      rows.push({
        key,
        label,
        home: values[0] as string | number,
        away: values[1] as string | number,
      });
    });
  });
  return rows;
};

const playerStatRows = (statsSource: unknown): NonNullable<MondialMatchDetailPotm['stats']> => {
  const groups = Array.isArray(statsSource) ? statsSource : [];
  const rows: NonNullable<MondialMatchDetailPotm['stats']> = [];
  const seen = new Set<string>();
  groups.forEach(groupValue => {
    const group = recordOf(groupValue);
    const stats = recordOf(group?.stats);
    if (!stats) return;
    Object.entries(stats).forEach(([rawLabel, statValue]) => {
      const item = recordOf(statValue);
      const stat = recordOf(item?.stat);
      const key = stringValue(item?.key, rawLabel).toLowerCase();
      if (!stat || !key || seen.has(key)) return;
      const value = stat.value;
      if (typeof value !== 'number' && typeof value !== 'string') return;
      seen.add(key);
      rows.push({
        key,
        label: key === 'rating_title' ? 'Rating' : rawLabel.replace(/^FotMob\s+/i, ''),
        value,
        total: optionalNumber(stat.total),
      });
    });
  });
  return rows;
};

const normalizePotm = (
  value: unknown,
  homeTeamId: string,
  awayTeamId: string
): MondialMatchDetailPotm | undefined => {
  const source = recordOf(value);
  if (!source) return undefined;
  const id = stringValue(source.id ?? source.playerId, '');
  const teamId = stringValue(source.teamId, '');
  const rating = recordOf(source.rating);
  return {
    id: id || undefined,
    name: playerName(source.name),
    teamName: stringValue(source.teamName, ''),
    team: teamId === homeTeamId ? 'home' : teamId === awayTeamId ? 'away' : 'neutral',
    rating: optionalNumber(rating?.num ?? source.playerRatingRounded ?? source.playerRating),
    image: id ? PLAYER_IMAGE_URL(id) : undefined,
    stats: playerStatRows(source.stats),
  };
};

const normalizeTopPlayers = (value: unknown, homeTeamId: string, awayTeamId: string) => {
  const source = recordOf(value);
  const home = (Array.isArray(source?.homeTopPlayers) ? source.homeTopPlayers : [])
    .map(player => normalizePotm(player, homeTeamId, awayTeamId))
    .filter((player): player is MondialMatchDetailPotm => Boolean(player));
  const away = (Array.isArray(source?.awayTopPlayers) ? source.awayTopPlayers : [])
    .map(player => normalizePotm(player, homeTeamId, awayTeamId))
    .filter((player): player is MondialMatchDetailPotm => Boolean(player));
  return { home, away };
};

const dataVersionOf = (payload: unknown): string => {
  try {
    const text = JSON.stringify(payload);
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return `match-details-${hash.toString(16)}`;
  } catch {
    return `match-details-${Date.now()}`;
  }
};

export const normalizeFotMobMatchDetails = (
  rawPayload: unknown,
  source: {
    sourceMode?: MondialMatchDetails['sourceMode'];
    sourceStatus?: MondialMatchDetails['sourceStatus'];
    sourceUrl?: string;
    fetchedAt?: string;
  } = {}
): MondialMatchDetails => {
  const raw = recordOf(rawPayload) ?? {};
  const general = recordOf(raw.general);
  const header = recordOf(raw.header);
  const content = recordOf(raw.content);
  const headerTeams = Array.isArray(header?.teams) ? header.teams.map(recordOf) : [];
  const homeHeaderTeam = headerTeams[0] ?? recordOf(general?.homeTeam);
  const awayHeaderTeam = headerTeams[1] ?? recordOf(general?.awayTeam);
  const status = recordOf(header?.status);
  const scoreStr = stringValue(status?.scoreStr, '');
  const scoreParts = scoreStr.split(/\s*-\s*/).map(item => Number(item));
  const homeScore = optionalNumber(homeHeaderTeam?.score) ?? scoreParts[0] ?? 0;
  const awayScore = optionalNumber(awayHeaderTeam?.score) ?? scoreParts[1] ?? 0;
  const teamColors = recordOf(recordOf(general?.teamColors)?.darkMode) ?? {};
  const finished = status?.finished === true || general?.finished === true;
  const matchStatus = normalizeStatus(status, finished);
  const home = normalizeTeam(homeHeaderTeam, 'home', homeScore, stringValue(teamColors.home, ''));
  const away = normalizeTeam(awayHeaderTeam, 'away', awayScore, stringValue(teamColors.away, ''));
  const matchFacts = recordOf(content?.matchFacts);
  const lineup = recordOf(content?.lineup);
  const playerStats = recordOf(content?.playerStats) ?? {};
  const homeLineup = normalizeLineup(recordOf(lineup?.homeTeam), 'home', playerStats);
  const awayLineup = normalizeLineup(recordOf(lineup?.awayTeam), 'away', playerStats);
  const players = [
    ...(homeLineup?.starters ?? []),
    ...(homeLineup?.subs ?? []),
    ...(awayLineup?.starters ?? []),
    ...(awayLineup?.subs ?? []),
  ];
  const topPlayers = normalizeTopPlayers(matchFacts?.topPlayers, home.id, away.id);
  const statusLabel = stringValue(recordOf(status?.reason)?.short, finished ? 'FT' : matchStatus.toUpperCase());
  const normalized: MondialMatchDetails = {
    schemaVersion: 'reo-match-details-v1',
    provider: 'fotmob',
    sourceMode: source.sourceMode ?? 'direct',
    sourceStatus: source.sourceStatus ?? 'live',
    sourceUrl: source.sourceUrl ?? '',
    fetchedAt: source.fetchedAt ?? new Date().toISOString(),
    dataVersion: dataVersionOf(rawPayload),
    match: {
      id: stringValue(general?.matchId, ''),
      competition: stringValue(general?.leagueName, 'World Cup'),
      stage: stringValue(general?.leagueRoundName ?? general?.matchRound, ''),
      date: stringValue(general?.matchTimeUTCDate ?? status?.utcTime, ''),
      status: matchStatus,
      statusLabel,
      home,
      away,
      homeScore,
      awayScore,
    },
    events: eventList(matchFacts?.events),
    lineups: {
      home: homeLineup,
      away: awayLineup,
    },
    teamStats: statRows(content?.stats),
    players,
    playerOfTheMatch: normalizePotm(matchFacts?.playerOfTheMatch, home.id, away.id),
    topPlayers,
    availability: {
      lineups: Boolean(homeLineup?.starters.length || awayLineup?.starters.length),
      events: Boolean(eventList(matchFacts?.events).length),
      teamStats: Boolean(statRows(content?.stats).length),
      playerStats: Object.keys(playerStats).length > 0,
      ratings: players.some(player => player.rating !== undefined) || Boolean(matchFacts?.playerOfTheMatch),
    },
  };
  return normalized;
};

export const lineupsToPlayersJson = (
  details: MondialMatchDetails | null | undefined,
  side: 'home' | 'away' = 'home'
): MondialMatchDetailPlayer[] => details?.lineups?.[side]?.starters ?? [];

export const statValueNumber = (value: string | number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

export const findDetailStat = (
  details: MondialMatchDetails | null | undefined,
  keys: string[]
): MondialMatchDetailStat | undefined => {
  const wanted = keys.map(key => key.toLowerCase());
  return details?.teamStats.find(stat =>
    wanted.includes(stat.key.toLowerCase()) || wanted.includes(stat.label.toLowerCase())
  );
};

export const detailEventsToLegacy = (
  details: MondialMatchDetails | null | undefined
): Array<{ minute: number; type: string; player: string; team: string }> =>
  (details?.events ?? []).map(event => ({
    minute: event.minute,
    type: event.type,
    player: event.player,
    team: event.team,
  }));

export const matchDetailsToFields = (
  details: MondialMatchDetails | null | undefined
): Record<string, unknown> => {
  if (!details) return {};
  const home = details.match.home;
  const away = details.match.away;
  const player = details.playerOfTheMatch;
  const playerStats = player?.stats ?? [];
  const playerStatLabels: Record<string, string> = {
    goals: 'الأهداف',
    assists: 'التمريرات الحاسمة',
    expected_goals: 'الأهداف المتوقعة',
    total_shots: 'التسديدات',
    shotsontarget: 'على المرمى',
    accurate_passes: 'التمريرات الدقيقة',
    chances_created: 'الفرص المصنوعة',
    minutes_played: 'الدقائق',
  };
  const featuredPlayerStats = playerStats
    .filter(stat => [
      'goals',
      'assists',
      'expected_goals',
      'total_shots',
      'shotsonTarget'.toLowerCase(),
      'accurate_passes',
      'chances_created',
      'minutes_played',
    ].includes(stat.key.toLowerCase()))
    .slice(0, 6)
    .map(stat => ({
      label: playerStatLabels[stat.key.toLowerCase()] ?? stat.label,
      value: stat.total === undefined ? stat.value : `${stat.value}/${stat.total}`,
    }));
  return {
    selectedMatchId: details.match.id,
    competition: details.match.competition,
    homeTeam: home.name,
    homeName: home.name,
    homeShort: home.code,
    homeCode: home.countryCode || home.code,
    homeLogo: home.logoUrl,
    awayTeam: away.name,
    awayName: away.name,
    awayShort: away.code,
    awayCode: away.countryCode || away.code,
    awayLogo: away.logoUrl,
    homeScore: details.match.homeScore,
    awayScore: details.match.awayScore,
    matchStatus: details.match.status === 'finished' ? 'FT' : details.match.status === 'live' ? 'LIVE' : 'PRE',
    status: details.match.status,
    statusLabel: details.match.statusLabel,
    period: details.match.statusLabel,
    minute: details.match.minute ?? '',
    stage: details.match.stage,
    matchStage: details.match.stage,
    groupBadge: details.match.stage,
    venue: details.match.venue ?? '',
    matchVenue: details.match.venue ?? '',
    code: home.countryCode || home.code,
    teamName: home.name,
    formation: details.lineups.home?.formation || '',
    coach: details.lineups.home?.coach || '',
    playersJson: JSON.stringify(lineupsToPlayersJson(details, 'home')),
    eventsJson: JSON.stringify(detailEventsToLegacy(details)),
    momName: player?.name ?? '',
    momRating: player?.rating ?? '',
    name: player?.name ?? '',
    position: player?.teamName ?? '',
    rating: player?.rating ?? '',
    playerImage: player?.image ?? '',
    statsJson: JSON.stringify(
      featuredPlayerStats.length
        ? featuredPlayerStats
        : details.teamStats.slice(0, 4).map(stat => ({
            label: stat.label,
            value: `${stat.home} / ${stat.away}`,
          }))
    ),
    ...mappedTeamStatFields(details.teamStats),
  };
};
