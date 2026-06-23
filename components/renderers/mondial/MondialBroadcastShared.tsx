import React from 'react';

export type MondialBroadcastStyle = 'spectrum' | 'stadium' | 'signal';
export type MondialBroadcastPalette = 'global' | 'reo' | 'midnight';

export type WorldCupTeam = {
  id: number | string;
  name: string;
  shortName: string;
  countryCode: string;
  flagUrl: string;
  logoUrl?: string;
};

export type WorldCupGroupTeam = WorldCupTeam & {
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualified?: boolean;
};

export type WorldCupGroup = {
  code: string;
  name: string;
  teams: WorldCupGroupTeam[];
};

export type WorldCupMatch = {
  id: number | string;
  home: WorldCupTeam | null;
  away: WorldCupTeam | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  date?: string;
  winnerId?: number | string;
};

export type WorldCupRound = {
  stage: 'R32' | 'R16' | 'QF' | 'SF' | 'F' | 'BRONZE';
  nameAr: string;
  matches: WorldCupMatch[];
};

export type MondialBroadcastProps = {
  getField: (id: string) => unknown;
  liveData?: Record<string, unknown> | null;
};

type BroadcastPalette = {
  background: string;
  panel: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  accent3: string;
  accent4: string;
};

const PALETTES: Record<MondialBroadcastPalette, BroadcastPalette> = {
  global: {
    background: '#050505',
    panel: '#101010',
    paper: '#ffffff',
    ink: '#ffffff',
    muted: '#a7abb4',
    accent: '#2457ff',
    accent2: '#0ce8cf',
    accent3: '#b6ff00',
    accent4: '#ff146f',
  },
  reo: {
    background: '#050505',
    panel: '#111111',
    paper: '#ffffff',
    ink: '#ffffff',
    muted: '#c1c1c1',
    accent: '#ff1738',
    accent2: '#00d253',
    accent3: '#2457ff',
    accent4: '#f5ff00',
  },
  midnight: {
    background: '#070815',
    panel: '#11142a',
    paper: '#f7f8ff',
    ink: '#ffffff',
    muted: '#afb5d8',
    accent: '#7c35ff',
    accent2: '#19e6e6',
    accent3: '#ff8a18',
    accent4: '#ff2f9f',
  },
};

export const GROUP_ACCENTS = [
  '#00d44b', '#139ebd', '#ff8416', '#2868ff',
  '#7616ff', '#a8f22a', '#ff0d86', '#10d9c0',
  '#ff8b78', '#dd61d7', '#1aaee8', '#ff183c',
];

const COUNTRY_ALIASES: Record<string, string> = {
  eng: 'gb-eng', england: 'gb-eng', 'gb-eng': 'gb-eng',
  sct: 'gb-sct', scotland: 'gb-sct', 'gb-sct': 'gb-sct',
  irq: 'iq', arg: 'ar', fra: 'fr', ger: 'de', bra: 'br', esp: 'es', por: 'pt',
  ned: 'nl', sui: 'ch', cro: 'hr', kor: 'kr', usa: 'us', mex: 'mx', can: 'ca',
  mar: 'ma', sen: 'sn', sau: 'sa', uru: 'uy', col: 'co', ecu: 'ec', irn: 'ir',
  aus: 'au', jpn: 'jp', gha: 'gh', civ: 'ci', alg: 'dz', aut: 'at', qat: 'qa',
  cze: 'cz', bih: 'ba', nzl: 'nz', tun: 'tn', uzb: 'uz', cod: 'cd',
};

const normalizeCountryCode = (value: unknown): string => {
  const raw = String(value || '').trim().toLowerCase();
  return COUNTRY_ALIASES[raw] || raw;
};

export const flagUrlForCode = (value: unknown): string => {
  const code = normalizeCountryCode(value);
  return code ? `https://flagcdn.com/${code}.svg` : '';
};

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const stringValue = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const numberValue = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanValue = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const parseUnknownJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
};

const createTeam = (id: string, name: string, shortName: string, countryCode: string): WorldCupTeam => ({
  id,
  name,
  shortName,
  countryCode: normalizeCountryCode(countryCode),
  flagUrl: flagUrlForCode(countryCode),
});

const DEMO_GROUP_SEEDS: Array<[string, Array<[string, string, string]>]> = [
  ['A', [['Mexico', 'MEX', 'mx'], ['South Africa', 'RSA', 'za'], ['Korea Republic', 'KOR', 'kr'], ['Czechia', 'CZE', 'cz']]],
  ['B', [['Canada', 'CAN', 'ca'], ['Bosnia & Herzegovina', 'BIH', 'ba'], ['Qatar', 'QAT', 'qa'], ['Switzerland', 'SUI', 'ch']]],
  ['C', [['Brazil', 'BRA', 'br'], ['Morocco', 'MAR', 'ma'], ['Haiti', 'HAI', 'ht'], ['Scotland', 'SCO', 'gb-sct']]],
  ['D', [['United States', 'USA', 'us'], ['Paraguay', 'PAR', 'py'], ['Australia', 'AUS', 'au'], ['Turkiye', 'TUR', 'tr']]],
  ['E', [['Germany', 'GER', 'de'], ['Curacao', 'CUW', 'cw'], ["Cote d'Ivoire", 'CIV', 'ci'], ['Ecuador', 'ECU', 'ec']]],
  ['F', [['Netherlands', 'NED', 'nl'], ['Japan', 'JPN', 'jp'], ['Sweden', 'SWE', 'se'], ['Tunisia', 'TUN', 'tn']]],
  ['G', [['Belgium', 'BEL', 'be'], ['Egypt', 'EGY', 'eg'], ['Iran', 'IRN', 'ir'], ['New Zealand', 'NZL', 'nz']]],
  ['H', [['Spain', 'ESP', 'es'], ['Cabo Verde', 'CPV', 'cv'], ['Saudi Arabia', 'KSA', 'sa'], ['Uruguay', 'URU', 'uy']]],
  ['I', [['France', 'FRA', 'fr'], ['Senegal', 'SEN', 'sn'], ['Iraq', 'IRQ', 'iq'], ['Norway', 'NOR', 'no']]],
  ['J', [['Argentina', 'ARG', 'ar'], ['Algeria', 'ALG', 'dz'], ['Austria', 'AUT', 'at'], ['Jordan', 'JOR', 'jo']]],
  ['K', [['Portugal', 'POR', 'pt'], ['Congo DR', 'COD', 'cd'], ['Uzbekistan', 'UZB', 'uz'], ['Colombia', 'COL', 'co']]],
  ['L', [['England', 'ENG', 'gb-eng'], ['Croatia', 'CRO', 'hr'], ['Ghana', 'GHA', 'gh'], ['Panama', 'PAN', 'pa']]],
];

export const DEMO_WORLD_CUP_GROUPS: WorldCupGroup[] = DEMO_GROUP_SEEDS.map(([code, teams]) => ({
  code,
  name: `Group ${code}`,
  teams: teams.map(([name, shortName, countryCode], index) => ({
    ...createTeam(`${code}-${index + 1}`, name, shortName, countryCode),
    position: index + 1,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  })),
}));

const normalizeTeam = (value: unknown, fallbackId: string): WorldCupTeam | null => {
  const source = recordOf(value);
  if (!source) return null;
  const countryCode = normalizeCountryCode(source.countryCode ?? source.code ?? source.isoCode ?? source.shortName);
  const name = stringValue(source.name ?? source.nameAr ?? source.teamName, 'TBD');
  const shortName = stringValue(source.shortName ?? source.short ?? source.code, name.slice(0, 3).toUpperCase());
  return {
    id: (source.id as string | number | undefined) ?? fallbackId,
    name,
    shortName,
    countryCode,
    flagUrl: stringValue(source.flagUrl, flagUrlForCode(countryCode)),
    logoUrl: stringValue(source.logoUrl ?? source.logo, '') || undefined,
  };
};

const normalizeGroupTeam = (value: unknown, fallbackId: string, index: number): WorldCupGroupTeam | null => {
  const source = recordOf(value);
  const team = normalizeTeam(value, fallbackId);
  if (!source || !team) return null;
  const goalsFor = numberValue(source.goalsFor ?? source.gf);
  const goalsAgainst = numberValue(source.goalsAgainst ?? source.ga);
  return {
    ...team,
    position: numberValue(source.position ?? source.rank, index + 1),
    played: numberValue(source.played ?? source.p),
    wins: numberValue(source.wins ?? source.won ?? source.w),
    draws: numberValue(source.draws ?? source.drawn ?? source.d),
    losses: numberValue(source.losses ?? source.lost ?? source.l),
    goalsFor,
    goalsAgainst,
    goalDifference: numberValue(source.goalDifference ?? source.gd, goalsFor - goalsAgainst),
    points: numberValue(source.points ?? source.pts),
    qualified: booleanValue(source.qualified),
  };
};

export const normalizeGroups = (input: unknown): WorldCupGroup[] => {
  const parsed = parseUnknownJson(input);
  const sourceRecord = recordOf(parsed);
  const candidate = Array.isArray(parsed)
    ? parsed
    : sourceRecord && Array.isArray(sourceRecord.groups)
      ? sourceRecord.groups
      : sourceRecord && Array.isArray(sourceRecord.worldCupGroups)
        ? sourceRecord.worldCupGroups
        : [];

  const groups = candidate.map((value, groupIndex) => {
    const source = recordOf(value);
    if (!source) return null;
    const code = stringValue(source.code ?? source.groupCode, String.fromCharCode(65 + groupIndex)).toUpperCase();
    const teamsSource = Array.isArray(source.teams) ? source.teams : [];
    const teams = teamsSource
      .map((team, teamIndex) => normalizeGroupTeam(team, `${code}-${teamIndex + 1}`, teamIndex))
      .filter((team): team is WorldCupGroupTeam => Boolean(team));
    if (!teams.length) return null;
    return { code, name: stringValue(source.name, `Group ${code}`), teams };
  }).filter((group): group is WorldCupGroup => Boolean(group));

  return groups.length ? groups : DEMO_WORLD_CUP_GROUPS;
};

const ROUND_NAMES: Record<WorldCupRound['stage'], string> = {
  R32: 'دور الـ32',
  R16: 'دور الـ16',
  QF: 'ربع النهائي',
  SF: 'نصف النهائي',
  F: 'النهائي',
  BRONZE: 'المركز الثالث',
};

const createPlaceholderMatch = (stage: WorldCupRound['stage'], index: number): WorldCupMatch => {
  const previousStage = stage === 'R16' ? 'R32' : stage === 'QF' ? 'R16' : stage === 'SF' ? 'QF' : 'SF';
  const base = index * 2 + 1;
  if (stage === 'R32') {
    const group = String.fromCharCode(65 + (index % 12));
    const otherGroup = String.fromCharCode(65 + ((index + 1) % 12));
    return {
      id: `${stage}-${index + 1}`,
      home: null,
      away: null,
      homePlaceholder: `1${group}`,
      awayPlaceholder: `2${otherGroup}`,
      status: 'TBD',
    };
  }
  return {
    id: `${stage}-${index + 1}`,
    home: null,
    away: null,
    homePlaceholder: `W ${previousStage}-${base}`,
    awayPlaceholder: `W ${previousStage}-${base + 1}`,
    status: 'TBD',
  };
};

export const DEMO_WORLD_CUP_ROUNDS: WorldCupRound[] = ([
  ['R32', 16], ['R16', 8], ['QF', 4], ['SF', 2], ['F', 1], ['BRONZE', 1],
] as Array<[WorldCupRound['stage'], number]>).map(([stage, count]) => ({
  stage,
  nameAr: ROUND_NAMES[stage],
  matches: Array.from({ length: count }, (_, index) => {
    if (stage === 'F') return createPlaceholderMatch('F', index);
    if (stage === 'BRONZE') {
      return {
        id: 'BRONZE-1',
        home: null,
        away: null,
        homePlaceholder: 'L SF-1',
        awayPlaceholder: 'L SF-2',
        status: 'TBD',
      };
    }
    return createPlaceholderMatch(stage, index);
  }),
}));

const normalizeStage = (value: unknown): WorldCupRound['stage'] | null => {
  const stage = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (stage === 'R32' || stage === 'ROUND32') return 'R32';
  if (stage === 'R16' || stage === 'ROUND16') return 'R16';
  if (stage === 'QF' || stage === 'QUARTERFINAL' || stage === 'QUARTERFINALS') return 'QF';
  if (stage === 'SF' || stage === 'SEMIFINAL' || stage === 'SEMIFINALS') return 'SF';
  if (stage === 'F' || stage === 'FINAL') return 'F';
  if (stage === 'BRONZE' || stage === 'THIRDPLACE') return 'BRONZE';
  return null;
};

const normalizeMatch = (value: unknown, stage: WorldCupRound['stage'], index: number): WorldCupMatch | null => {
  const source = recordOf(value);
  if (!source) return null;
  return {
    id: (source.id as string | number | undefined) ?? `${stage}-${index + 1}`,
    home: normalizeTeam(source.home ?? source.homeTeam, `${stage}-${index + 1}-home`),
    away: normalizeTeam(source.away ?? source.awayTeam, `${stage}-${index + 1}-away`),
    homePlaceholder: stringValue(source.homePlaceholder, '') || undefined,
    awayPlaceholder: stringValue(source.awayPlaceholder, '') || undefined,
    homeScore: source.homeScore === undefined ? undefined : numberValue(source.homeScore),
    awayScore: source.awayScore === undefined ? undefined : numberValue(source.awayScore),
    status: stringValue(source.status, '') || undefined,
    date: stringValue(source.date, '') || undefined,
    winnerId: source.winnerId as string | number | undefined,
  };
};

export const normalizeRounds = (input: unknown): WorldCupRound[] => {
  const parsed = parseUnknownJson(input);
  const sourceRecord = recordOf(parsed);
  const candidate = Array.isArray(parsed)
    ? parsed
    : sourceRecord && Array.isArray(sourceRecord.rounds)
      ? sourceRecord.rounds
      : sourceRecord && Array.isArray(sourceRecord.worldCupRounds)
        ? sourceRecord.worldCupRounds
        : [];

  const normalized = candidate.map(value => {
    const source = recordOf(value);
    const stage = normalizeStage(source?.stage);
    if (!source || !stage) return null;
    const matches = (Array.isArray(source.matches) ? source.matches : [])
      .map((match, index) => normalizeMatch(match, stage, index))
      .filter((match): match is WorldCupMatch => Boolean(match));
    return { stage, nameAr: stringValue(source.nameAr ?? source.name, ROUND_NAMES[stage]), matches };
  }).filter((round): round is WorldCupRound => Boolean(round));

  const byStage = new Map(normalized.map(round => [round.stage, round]));
  return DEMO_WORLD_CUP_ROUNDS.map(fallback => {
    const live = byStage.get(fallback.stage);
    return live && live.matches.length ? live : fallback;
  });
};

export const selectPayload = (
  liveData: Record<string, unknown> | null | undefined,
  fieldValue: unknown,
  keys: string[]
): unknown => {
  if (liveData) {
    for (const key of keys) {
      if (liveData[key] !== undefined) return liveData[key];
    }
    const tournament = recordOf(liveData.tournament);
    if (tournament) {
      for (const key of keys) {
        if (tournament[key] !== undefined) return tournament[key];
      }
    }
  }
  return fieldValue;
};

export const getBroadcastStyle = (getField: MondialBroadcastProps['getField']): MondialBroadcastStyle => {
  const value = String(getField('broadcastStyle') || 'spectrum').toLowerCase();
  return value === 'stadium' || value === 'signal' ? value : 'spectrum';
};

export const getBroadcastPalette = (getField: MondialBroadcastProps['getField']): MondialBroadcastPalette => {
  const value = String(getField('broadcastPalette') || 'global').toLowerCase();
  return value === 'reo' || value === 'midnight' ? value : 'global';
};

export const getBroadcastCssVars = (paletteId: MondialBroadcastPalette): React.CSSProperties => {
  const palette = PALETTES[paletteId];
  return {
    '--mondial-bg': palette.background,
    '--mondial-panel': palette.panel,
    '--mondial-paper': palette.paper,
    '--mondial-ink': palette.ink,
    '--mondial-muted': palette.muted,
    '--mondial-a1': palette.accent,
    '--mondial-a2': palette.accent2,
    '--mondial-a3': palette.accent3,
    '--mondial-a4': palette.accent4,
  } as React.CSSProperties;
};

export const BroadcastFlag: React.FC<{ team: WorldCupTeam | null; label?: string; compact?: boolean }> = ({
  team,
  label,
  compact,
}) => {
  const [failed, setFailed] = React.useState(false);
  const source = team?.flagUrl || flagUrlForCode(team?.countryCode);
  const fallback = team?.shortName || label || 'TBD';
  return (
    <span className={`mondial-flag ${compact ? 'is-compact' : ''}`} aria-label={team?.name || label || 'TBD'}>
      {!failed && source ? (
        <img src={source} alt={team?.name ? `Flag of ${team.name}` : ''} onError={() => setFailed(true)} />
      ) : (
        <span>{fallback.slice(0, 3).toUpperCase()}</span>
      )}
    </span>
  );
};

export const ReoShowLockup: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={`mondial-reo-lockup ${compact ? 'is-compact' : ''}`} aria-label="REO SHOW">
    <span>REO</span>
    <span>SHOW</span>
  </div>
);

export const MONDIAL_BROADCAST_CSS = `
@keyframes mondialBroadcastIn {
  from { opacity: 0; transform: translate3d(0, 5%, 0); clip-path: inset(0 100% 0 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); clip-path: inset(0 0 0 0); }
}
@keyframes mondialBroadcastHold {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(8px, 0, 0); }
}
@keyframes mondialChromaTrail {
  from { transform: translateX(-55%); }
  to { transform: translateX(155%); }
}
.mondial-broadcast {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  color: var(--mondial-ink);
  background: var(--mondial-bg);
  font-family: 'Barlow Condensed', 'Arial Narrow', 'Tajawal', 'Inter', sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}
.mondial-broadcast *, .mondial-broadcast *::before, .mondial-broadcast *::after { box-sizing: border-box; }
.mondial-broadcast::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: .2;
  background-image: linear-gradient(90deg, transparent 49.8%, rgba(255,255,255,.25) 50%, transparent 50.2%), linear-gradient(transparent 49.8%, rgba(255,255,255,.18) 50%, transparent 50.2%);
  background-size: 240px 240px;
}
.mondial-broadcast.mondial-style-stadium::before {
  opacity: .36;
  background-image: linear-gradient(118deg, transparent 0 20%, var(--mondial-a1) 20% 23%, transparent 23% 61%, var(--mondial-a3) 61% 65%, transparent 65% 100%);
  background-size: 100% 100%;
}
.mondial-broadcast.mondial-style-signal::before {
  opacity: .18;
  background-image: repeating-linear-gradient(0deg, transparent 0 30px, var(--mondial-a2) 30px 32px);
  background-size: 100% 100%;
}
.mondial-phase-in { animation: mondialBroadcastIn .78s cubic-bezier(.16,1,.3,1) both; }
.mondial-phase-hold { animation: mondialBroadcastHold 9s 1.2s ease-in-out infinite; }
.mondial-phase-out-anchor { will-change: transform, opacity, clip-path; }
.mondial-chroma-trail {
  position: absolute;
  z-index: -1;
  width: 44%;
  height: 18px;
  left: 0;
  bottom: 0;
  background: linear-gradient(90deg, var(--mondial-a1), var(--mondial-a4), var(--mondial-a2));
  animation: mondialChromaTrail 8s 1.4s linear infinite;
}
.mondial-reo-lockup {
  width: 98px;
  height: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 0 0 auto;
  border: 5px solid currentColor;
  border-radius: 6px;
  color: var(--mondial-bg);
  background: var(--mondial-paper);
  box-shadow: 8px 7px 0 var(--mondial-a1), 15px 13px 0 var(--mondial-a2);
  font-size: 21px;
  font-weight: 950;
  line-height: .78;
}
.mondial-reo-lockup.is-compact { width: 58px; height: 40px; border-width: 3px; font-size: 12px; box-shadow: 5px 4px 0 var(--mondial-a1), 9px 8px 0 var(--mondial-a2); }
.mondial-flag {
  width: 35px;
  height: 24px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid currentColor;
  border-radius: 3px;
  background: #d9dce4;
  color: #050505;
  font: 900 8px/1 'Arial Narrow', sans-serif;
}
.mondial-flag.is-compact { width: 25px; height: 17px; border-width: 1px; }
.mondial-flag img { width: 100%; height: 100%; object-fit: cover; display: block; }
@media (prefers-reduced-motion: reduce) {
  .mondial-broadcast *, .mondial-broadcast *::before, .mondial-broadcast *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
`;
