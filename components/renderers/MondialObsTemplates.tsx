import React from 'react';
import {
  normalizeWorldCupScorers,
  scorersFromWorldCupData,
  type MondialLiveScorer,
} from '../../utils/mondialLiveSelectors';
import {
  findDetailStat,
  lineupsToPlayersJson,
  statValueNumber,
  type MondialMatchDetails,
} from '../../utils/mondialMatchDetails';
import {
  clamp,
  MondialFlag,
  MondialTheme,
  safeParse,
} from './MondialSharedComponents';

export interface ReoObsVariantProps {
  t: MondialTheme;
  getField: (id: string) => unknown;
  resolveField?: (fieldId: string, liveKey?: string) => unknown;
  liveData?: Record<string, unknown> | null;
  matchDetails?: MondialMatchDetails | null;
  bridgeStatus?: 'idle' | 'connecting' | 'live' | 'error';
}

type Getter = (id: string) => unknown;

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

type GroupRow = {
  name?: string;
  nameAr?: string;
  code?: string;
  flag?: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  gf?: number;
  ga?: number;
  pts?: number;
};

type LineupPlayer = {
  num?: number;
  number?: number;
  name: string;
  pos?: string;
  x?: number;
  y?: number;
  image?: string;
};

type PositionedLineupPlayer = LineupPlayer & {
  name: string;
  x: number;
  y: number;
  line: LineupLine;
  lineLabel: string;
  rowIndex: number;
  slotIndex: number;
};

type LineupLine = 'goalkeeper' | 'defence' | 'midfield' | 'support' | 'attack';

type LineupSkin = {
  shell: string;
  field: string;
  pitchLine: string;
  panel: string;
  panelText: string;
  chip: string;
  chipText: string;
  title: string;
  muted: string;
  scene?: 'tactical' | 'stadium';
};

const WC = {
  black: '#090909',
  ink: '#151515',
  white: '#ffffff',
  blue: '#1637ff',
  royal: '#304fff',
  cyan: '#08ead1',
  green: '#00cc45',
  lime: '#b6ff00',
  red: '#ff1738',
  orange: '#ff7a00',
  pink: '#ff1595',
  purple: '#7915ff',
  lilac: '#b780ff',
  yellow: '#eeff00',
  coral: '#ff8c78',
};

const COLORS = [
  WC.cyan,
  WC.lime,
  WC.green,
  WC.red,
  WC.pink,
  WC.purple,
  WC.orange,
  WC.royal,
];

const themedColors = (theme?: MondialTheme) => {
  const palette = theme
    ? [theme.accent, theme.accent2, theme.success, theme.danger, theme.gold, theme.warning]
    : COLORS;
  return {
    bg: theme?.bg || WC.black,
    text: theme?.text || WC.white,
    ink: WC.black,
    paper: WC.white,
    accent: theme?.accent || WC.cyan,
    accent2: theme?.accent2 || WC.pink,
    success: theme?.success || WC.green,
    danger: theme?.danger || WC.red,
    gold: theme?.gold || WC.yellow,
    warning: theme?.warning || WC.orange,
    palette: palette.filter(Boolean),
  };
};

const paletteAt = (theme: MondialTheme | undefined, index: number): string => {
  const palette = themedColors(theme).palette;
  return palette[index % palette.length] || COLORS[index % COLORS.length] || WC.cyan;
};

const DEFAULT_GROUP: GroupRow[] = [
  { nameAr: 'العراق', code: 'IQ', played: 2, won: 1, drawn: 1, lost: 0, gf: 2, ga: 1, pts: 4 },
  { nameAr: 'الأرجنتين', code: 'AR', played: 2, won: 1, drawn: 1, lost: 0, gf: 3, ga: 1, pts: 4 },
  { nameAr: 'أستراليا', code: 'AU', played: 2, won: 1, drawn: 0, lost: 1, gf: 2, ga: 3, pts: 3 },
  { nameAr: 'الصين', code: 'CN', played: 2, won: 0, drawn: 0, lost: 2, gf: 0, ga: 2, pts: 0 },
];

const DEFAULT_PLAYERS: LineupPlayer[] = [
  { num: 1, name: 'جلال حسن', pos: 'GK', x: 50, y: 88 },
  { num: 3, name: 'حسين علي', pos: 'DF', x: 15, y: 68 },
  { num: 4, name: 'سعد ناطق', pos: 'DF', x: 38, y: 73 },
  { num: 6, name: 'علي عدنان', pos: 'DF', x: 62, y: 73 },
  { num: 15, name: 'ضرغام إسماعيل', pos: 'DF', x: 85, y: 68 },
  { num: 8, name: 'إبراهيم بايش', pos: 'MF', x: 20, y: 45 },
  { num: 16, name: 'أمير العماري', pos: 'MF', x: 50, y: 50 },
  { num: 11, name: 'زيدان إقبال', pos: 'MF', x: 80, y: 45 },
  { num: 17, name: 'علي جاسم', pos: 'FW', x: 22, y: 20 },
  { num: 9, name: 'أيمن حسين', pos: 'FW', x: 50, y: 14 },
  { num: 10, name: 'مهند علي', pos: 'FW', x: 78, y: 20 },
];

const parseFormationRows = (formation: string): number[] => {
  const rows = (formation.match(/\d+/g) || [])
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0 && value <= 6);
  const total = rows.reduce((sum, value) => sum + value, 0);
  return total >= 8 && total <= 10 ? rows : [4, 3, 3];
};

const playerNumber = (player: Partial<LineupPlayer> | undefined, fallback: number): number =>
  Number.isFinite(Number(player?.num ?? player?.number))
    ? Number(player?.num ?? player?.number)
    : fallback;

const normalizedPlayer = (player: LineupPlayer | undefined, index: number): LineupPlayer => ({
  ...(player || {}),
  name: String(player?.name || DEFAULT_PLAYERS[index]?.name || `لاعب ${index + 1}`),
  pos: String(player?.pos || DEFAULT_PLAYERS[index]?.pos || ''),
  num: playerNumber(player || {}, index + 1),
});

const hasValidPitchPosition = (player: LineupPlayer): boolean =>
  Number.isFinite(Number(player.x)) && Number.isFinite(Number(player.y));

const LINEUP_LINE_LABELS: Record<LineupLine, string> = {
  goalkeeper: 'حراسة',
  defence: 'دفاع',
  midfield: 'وسط',
  support: 'صناعة',
  attack: 'هجوم',
};

const LINEUP_LINE_TAGS: Record<LineupLine, string> = {
  goalkeeper: 'GK',
  defence: 'DEF',
  midfield: 'MID',
  support: 'AM',
  attack: 'ATT',
};

const lineupLineFromPosition = (pos?: string): LineupLine | null => {
  const token = String(pos || '').toUpperCase();
  if (!token) return null;
  if (token.includes('GK') || token.includes('GOAL')) return 'goalkeeper';
  if (token.includes('CB') || token.includes('LB') || token.includes('RB') || token.includes('DF') || token.includes('DEF')) return 'defence';
  if (token.includes('FW') || token.includes('ST') || token.includes('CF') || token.includes('ATT')) return 'attack';
  if (token.includes('AM') || token.includes('WING') || token === 'W' || token.includes('LAM') || token.includes('RAM')) return 'support';
  if (token.includes('CM') || token.includes('DM') || token.includes('MF') || token.includes('MID')) return 'midfield';
  return null;
};

const lineupLineFromRow = (rowIndex: number, rowsLength: number, player?: LineupPlayer): LineupLine => {
  const byPosition = lineupLineFromPosition(player?.pos);
  if (byPosition) return byPosition;
  if (rowIndex === 0) return 'goalkeeper';
  if (rowIndex === 1) return 'defence';
  if (rowIndex === rowsLength - 1) return 'attack';
  if (rowsLength >= 5 && rowIndex === rowsLength - 2) return 'support';
  return 'midfield';
};

const lineupLineFromY = (y: number, direction: string, player?: LineupPlayer): LineupLine => {
  const byPosition = lineupLineFromPosition(player?.pos);
  if (byPosition) return byPosition;
  const defendingScaleY = direction === 'attack_down' ? 100 - y : y;
  if (defendingScaleY >= 80) return 'goalkeeper';
  if (defendingScaleY >= 62) return 'defence';
  if (defendingScaleY >= 39) return 'midfield';
  if (defendingScaleY >= 25) return 'support';
  return 'attack';
};

const mirrorPitchY = (value: number, direction: string): number =>
  direction === 'attack_down' ? 100 - value : value;

const lineupDisplayName = (name: string, mode: string): string => {
  if (mode === 'number_only') return '';
  const clean = name.trim();
  if (mode === 'full') return clean;
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return clean;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const lineupSkin = (style: string, c: ReturnType<typeof themedColors>, teamColor: string): LineupSkin => {
  if (style === 'score_red') {
    return {
      shell: `linear-gradient(135deg, #050505 0%, ${WC.black} 44%, ${WC.red} 44% 56%, #060606 56% 100%)`,
      field: `radial-gradient(circle at 50% 20%, rgba(255,255,255,.08), transparent 38%), linear-gradient(160deg, #0b102a, #071d13 62%, #040404)`,
      pitchLine: 'rgba(255,255,255,.62)',
      panel: '#ffffff',
      panelText: '#050505',
      chip: WC.red,
      chipText: WC.white,
      title: WC.white,
      muted: 'rgba(255,255,255,.68)',
    };
  }
  if (style === 'social_blue') {
    return {
      shell: `linear-gradient(150deg, ${WC.blue} 0 42%, ${WC.green} 42% 72%, #050505 72% 100%)`,
      field: `linear-gradient(145deg, #072bff 0%, #061b73 54%, #011a0a 100%)`,
      pitchLine: 'rgba(255,255,255,.55)',
      panel: '#050505',
      panelText: WC.white,
      chip: WC.lime,
      chipText: '#050505',
      title: WC.white,
      muted: 'rgba(255,255,255,.72)',
    };
  }
  if (style === 'clean_pitch') {
    return {
      shell: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 55%, #e5edf8 100%)',
      field: `linear-gradient(140deg, #0f8b49 0%, #0a6537 50%, #074628 100%)`,
      pitchLine: 'rgba(255,255,255,.7)',
      panel: '#050505',
      panelText: WC.white,
      chip: teamColor || c.accent,
      chipText: '#050505',
      title: '#050505',
      muted: 'rgba(0,0,0,.62)',
    };
  }
  if (style === 'stadium_motion') {
    return {
      shell: `radial-gradient(ellipse at 50% -12%, rgba(255,255,255,.38), transparent 30%), radial-gradient(ellipse at 24% 24%, rgba(8,234,209,.34), transparent 24%), radial-gradient(ellipse at 80% 28%, rgba(255,21,149,.28), transparent 28%), linear-gradient(145deg, #06122f 0%, #081a45 46%, #050505 100%)`,
      field: `radial-gradient(ellipse at 50% 1%, rgba(255,255,255,.28), transparent 18%), radial-gradient(ellipse at 50% 8%, rgba(27,132,255,.55), transparent 38%), linear-gradient(180deg, #071c42 0%, #0a3323 58%, #04110b 100%)`,
      pitchLine: 'rgba(255,255,255,.58)',
      panel: 'rgba(2,6,23,.92)',
      panelText: WC.white,
      chip: WC.cyan,
      chipText: '#050505',
      title: WC.white,
      muted: 'rgba(255,255,255,.72)',
      scene: 'stadium',
    };
  }
  return {
    shell: `radial-gradient(ellipse at 108% -20%, ${c.accent2} 0 17%, transparent 18% 100%), radial-gradient(ellipse at -10% 115%, ${c.accent} 0 20%, transparent 21% 100%), linear-gradient(135deg, #050505 0%, #050505 58%, ${teamColor || c.success} 58% 62%, #050505 62% 100%)`,
    field: `radial-gradient(ellipse at 50% 116%, rgba(255,255,255,.13), transparent 42%), linear-gradient(160deg, #061409 0%, #09261b 50%, #020202 100%)`,
    pitchLine: 'rgba(255,255,255,.52)',
    panel: '#050505',
    panelText: WC.white,
    chip: c.gold,
    chipText: '#050505',
    title: WC.white,
    muted: 'rgba(255,255,255,.68)',
  };
};

const playerRowsFromFormation = (players: LineupPlayer[], formation: string): LineupPlayer[][] => {
  const cleanPlayers = players.slice(0, 11).map(normalizedPlayer);
  const goalkeeperIndex = cleanPlayers.findIndex(player => String(player.pos || '').toUpperCase().includes('GK'));
  const goalkeeper = goalkeeperIndex >= 0
    ? cleanPlayers[goalkeeperIndex]
    : cleanPlayers[0] || normalizedPlayer(undefined, 0);
  const outfield = (goalkeeperIndex >= 0
    ? cleanPlayers.filter((_, index) => index !== goalkeeperIndex)
    : cleanPlayers.slice(1)
  );
  const rows = parseFormationRows(formation);
  const splitRows: LineupPlayer[][] = [[goalkeeper]];
  let cursor = 0;
  rows.forEach(count => {
    const row = outfield.slice(cursor, cursor + count);
    if (row.length) splitRows.push(row);
    cursor += count;
  });
  const leftovers = outfield.slice(cursor);
  if (leftovers.length) {
    const lastRow = splitRows[splitRows.length - 1] || [];
    lastRow.push(...leftovers);
  }
  return splitRows;
};

const rowSlotX = (index: number, count: number): number => {
  if (count <= 1) return 50;
  const min = count >= 5 ? 12 : 18;
  const max = 100 - min;
  return min + ((max - min) * index) / (count - 1);
};

const formationSlotY = (rowIndex: number, outfieldRows: number, direction: string): number => {
  if (rowIndex === 0) return direction === 'attack_down' ? 12 : 88;
  const bottom = 70;
  const top = 18;
  const y = outfieldRows <= 1
    ? 44
    : bottom - ((bottom - top) * (rowIndex - 1)) / (outfieldRows - 1);
  return direction === 'attack_down' ? 100 - y : y;
};

const buildFormationLineup = (
  players: LineupPlayer[],
  formation: string,
  layoutMode: string,
  direction: string
): PositionedLineupPlayer[] => {
  const sourcePlayers = players.slice(0, 11).map(normalizedPlayer);
  const sourceHasEnoughPositions = sourcePlayers.filter(hasValidPitchPosition).length >= 8;
  const rows = playerRowsFromFormation(sourcePlayers.length ? sourcePlayers : DEFAULT_PLAYERS, formation);
  const outfieldRows = Math.max(1, rows.length - 1);
  const autoPositioned = rows.flatMap((row, rowIndex) =>
    row.map((player, playerIndex) => {
      const line = lineupLineFromRow(rowIndex, rows.length, player);
      return {
        ...player,
        x: clamp(rowSlotX(playerIndex, row.length), 8, 92),
        y: clamp(formationSlotY(rowIndex, outfieldRows, direction), 10, 90),
        line,
        lineLabel: LINEUP_LINE_LABELS[line],
        rowIndex,
        slotIndex: playerIndex,
      };
    })
  );

  if (layoutMode === 'source_positions' && sourceHasEnoughPositions) {
    return sourcePlayers.map((player, index) => {
      const sourceY = Number(player.y ?? autoPositioned[index]?.y ?? 50);
      const y = clamp(mirrorPitchY(sourceY, direction), 10, 90);
      const line = lineupLineFromY(y, direction, player);
      return {
        ...player,
        x: clamp(Number(player.x ?? autoPositioned[index]?.x ?? 50), 8, 92),
        y,
        line,
        lineLabel: LINEUP_LINE_LABELS[line],
        rowIndex: autoPositioned[index]?.rowIndex ?? index,
        slotIndex: autoPositioned[index]?.slotIndex ?? 0,
      };
    });
  }

  return autoPositioned.slice(0, 11);
};

const lineupPlayerPhotoUrl = (
  player: LineupPlayer,
  mode: string,
  placement: 'field' | 'list'
): string => {
  if (mode === 'off') return '';
  if (mode === 'list_only' && placement === 'field') return '';
  return String(player.image || '').trim();
};

const ReoLineupPlayerMarker: React.FC<{
  player: PositionedLineupPlayer;
  index: number;
  skin: LineupSkin;
  lineupNameMode: string;
  lineupPhotoMode: string;
  theme?: MondialTheme;
}> = ({ player, index, skin, lineupNameMode, lineupPhotoMode, theme }) => {
  const imageUrl = lineupPlayerPhotoUrl(player, lineupPhotoMode, 'field');
  const number = player.num ?? player.number ?? index + 1;
  const hasImage = Boolean(imageUrl);
  return (
    <div
      className="flex flex-col items-center"
      style={{ animation: `wcBadgePop .72s ${.32 + index * .065}s cubic-bezier(.16,1.18,.3,1) both` }}
    >
      <div
        className={`relative ${hasImage ? 'w-[82px] h-[82px] rounded-[28px]' : 'w-[74px] h-[74px] rounded-[24px]'} border-[5px] border-black flex items-center justify-center overflow-hidden text-[28px] font-black`}
        style={{ background: skin.panel, color: skin.panelText, boxShadow: `-8px 7px 0 ${paletteAt(theme, index)}` }}
      >
        {hasImage ? (
          <>
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top"
              referrerPolicy="no-referrer"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" />
            <span className="absolute right-1 bottom-1 min-w-8 h-8 px-2 rounded-[12px] border-[3px] border-black bg-white text-black flex items-center justify-center text-[20px] leading-none font-black">
              {number}
            </span>
          </>
        ) : number}
      </div>
      <div
        className="mt-2 min-w-[86px] max-w-[158px] rounded-[15px] border-[4px] border-black px-3 py-1 text-center text-[13px] leading-tight font-black whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ background: skin.panel, color: skin.panelText }}
      >
        {lineupDisplayName(player.name, lineupNameMode)}
      </div>
      <div className="mt-1 rounded-full px-3 py-0.5 text-[9px] font-black text-white" style={{ background: '#050505' }}>{player.lineLabel}</div>
    </div>
  );
};

const ReoLineupMiniAvatar: React.FC<{
  player: LineupPlayer;
  index: number;
  lineupPhotoMode: string;
  theme?: MondialTheme;
}> = ({ player, index, lineupPhotoMode, theme }) => {
  const imageUrl = lineupPlayerPhotoUrl(player, lineupPhotoMode, 'list');
  const number = player.num ?? player.number ?? index + 1;
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-[10px] border-[3px] border-black overflow-hidden text-[11px] font-black" style={{ background: paletteAt(theme, index), color: '#050505' }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover object-top"
          referrerPolicy="no-referrer"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      ) : number}
    </span>
  );
};

const DEFAULT_SCORERS: MondialLiveScorer[] = [
  { name: 'كيليان مبابي', team: 'فرنسا', code: 'FR', countryCode: 'fr', goals: 5 },
  { name: 'إيرلينغ هالاند', team: 'النرويج', code: 'NO', countryCode: 'no', goals: 4 },
  { name: 'فينيسيوس جونيور', team: 'البرازيل', code: 'BR', countryCode: 'br', goals: 4 },
  { name: 'أيمن حسين', team: 'العراق', code: 'IQ', countryCode: 'iq', goals: 3 },
];

const text = (getField: Getter, id: string, fallback: string): string => {
  const value = getField(id);
  return value === undefined || value === null || value === '' ? fallback : String(value);
};

const num = (getField: Getter, id: string, fallback: number): number => {
  const value = Number(getField(id));
  return Number.isFinite(value) ? value : fallback;
};

const resolvedText = (
  getField: Getter,
  resolveField: ReoObsVariantProps['resolveField'],
  id: string,
  liveKey: string,
  fallback: string
): string => {
  const value = resolveField ? resolveField(id, liveKey) : getField(id);
  return value === undefined || value === null || value === '' ? fallback : String(value);
};

const resolvedNum = (
  getField: Getter,
  resolveField: ReoObsVariantProps['resolveField'],
  id: string,
  liveKey: string,
  fallback: number
): number => {
  const value = Number(resolveField ? resolveField(id, liveKey) : getField(id));
  return Number.isFinite(value) ? value : fallback;
};

const detailStatNumber = (value: number | string): number => {
  const parsed = statValueNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const detailStatText = (value: number | string): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? String(Number.isInteger(value) ? value : Number(value.toFixed(1)))
    : String(value);

type MatchStatusPresentation = {
  code: string;
  label: string;
  isLive: boolean;
};

const statusLabelAr = (value: string, fallback: string): string => {
  const clean = value.trim();
  if (!clean) return fallback;
  const token = clean.toLowerCase();
  if (token === 'live' || token === 'now' || token.includes('playing') || token.includes('inprogress')) return 'مباشر';
  if (token === 'ht' || token.includes('half')) return 'استراحة';
  if (token === 'aet') return 'بعد الوقت الإضافي';
  if (token === 'pen') return 'ركلات الترجيح';
  if (token === 'ft' || token === 'full-time' || token === 'full time' || token.includes('finish')) return 'انتهت';
  if (token.includes('cancel')) return 'ملغاة';
  if (token === 'pre' || token.includes('schedule') || token.includes('notstarted') || token.includes('next match')) return 'قادمة';
  return clean;
};

const minuteText = (value: string): string =>
  value.trim().replace(/'+$/g, '');

const liveStatusText = (minute: string): string => {
  const clean = minuteText(minute);
  return clean ? `مباشر ${clean}'` : 'مباشر';
};

const matchStatusPresentation = (
  getField: Getter,
  resolveField?: ReoObsVariantProps['resolveField']
): MatchStatusPresentation => {
  const rawValue = resolveField
    ? resolveField('matchStatus', 'status')
    : getField('matchStatus') ?? getField('status');
  const raw = String(rawValue || 'PRE').trim();
  const token = raw.toLowerCase();
  const statusLabel = statusLabelAr(text(getField, 'statusLabel', text(getField, 'period', '')), '');

  if (token === 'live' || token.includes('playing') || token.includes('inprogress')) {
    return { code: 'LIVE', label: 'مباشر', isLive: true };
  }
  if (token === 'ht' || token.includes('half')) {
    return { code: 'HT', label: statusLabel || 'استراحة', isLive: false };
  }
  if (token === 'ft' || token === 'aet' || token === 'pen' || token === 'full-time' || token === 'full time' || token.includes('finish')) {
    const code = token === 'aet' ? 'AET' : token === 'pen' ? 'PEN' : 'FT';
    return { code, label: statusLabel || statusLabelAr(code, 'انتهت'), isLive: false };
  }
  if (token.includes('cancel')) {
    return { code: 'CANCELLED', label: statusLabel || 'ملغاة', isLive: false };
  }
  if (token === 'pre' || token.includes('schedule') || token.includes('notstarted')) {
    return { code: 'PRE', label: statusLabel || 'قادمة', isLive: false };
  }
  return { code: raw.toUpperCase(), label: statusLabel || statusLabelAr(raw, raw.toUpperCase()), isLive: false };
};

const codeFromTeam = (value: string, fallback: string): string => {
  const key = value.trim().toLowerCase();
  const codes: Record<string, string> = {
    iraq: 'IQ', 'العراق': 'IQ',
    argentina: 'AR', 'الأرجنتين': 'AR',
    france: 'FR', 'فرنسا': 'FR',
    brazil: 'BR', 'البرازيل': 'BR',
    spain: 'ES', 'إسبانيا': 'ES',
    usa: 'US', 'أمريكا': 'US',
    mexico: 'MX', 'المكسيك': 'MX',
    portugal: 'PT', 'البرتغال': 'PT',
  };
  return codes[key] || fallback;
};

const KineticStage: React.FC<{
  children: React.ReactNode;
  image?: string;
  dark?: boolean;
  transparent?: boolean;
  theme?: MondialTheme;
}> = ({ children, image, dark = true, transparent, theme }) => {
  const c = themedColors(theme);
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      dir="rtl"
      style={{
        color: dark ? c.text : c.ink,
        background: transparent ? 'transparent' : dark ? c.bg : c.accent,
        fontFamily: "'Cairo', 'Inter', sans-serif",
      }}
    >
      {image && !transparent && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: 'wcPhotoReveal .85s cubic-bezier(.2,.9,.2,1) both' }}
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      )}
      {!transparent && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: image
                ? 'linear-gradient(270deg, rgba(0,0,0,.88) 0%, rgba(0,0,0,.48) 48%, rgba(0,0,0,.15) 100%)'
                : 'transparent',
            }}
          />
          <div
            className="absolute -right-[18%] -top-[44%] w-[68%] h-[118%] rounded-[48%]"
            style={{
              border: `82px solid ${c.accent}`,
              opacity: image ? .45 : .95,
              transform: 'rotate(25deg)',
              animation: 'wcArcSweep 1s cubic-bezier(.16,1,.3,1) both',
            }}
          />
          <div
            className="absolute -right-[12%] -top-[35%] w-[55%] h-[95%] rounded-[48%]"
            style={{
              border: `58px solid ${c.accent2}`,
              opacity: image ? .45 : .95,
              transform: 'rotate(25deg)',
              animation: 'wcArcSweep .92s .08s cubic-bezier(.16,1,.3,1) both',
            }}
          />
          <div
            className="absolute -left-[9%] bottom-[-18%] w-[48%] h-[52%]"
            style={{
              background: c.success,
              borderRadius: '0 100% 0 0',
              animation: 'wcWipeUp .72s .08s cubic-bezier(.16,1,.3,1) both',
            }}
          />
          <div
            className="absolute left-[18%] bottom-[-15%] w-[34%] h-[40%]"
            style={{
              background: c.accent2,
              borderRadius: '100% 100% 0 0',
              animation: 'wcWipeUp .72s .15s cubic-bezier(.16,1,.3,1) both',
            }}
          />
          <div
            className="absolute inset-0 opacity-[.12]"
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent 49.5%, #fff 50%, transparent 50.5%), linear-gradient(transparent 49.5%, #fff 50%, transparent 50.5%)',
              backgroundSize: '280px 280px',
            }}
          />
        </>
      )}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};

const ReoMark: React.FC<{ dark?: boolean; compact?: boolean }> = ({ dark, compact }) => (
  <div
    className="relative flex items-center justify-center shrink-0"
    style={{
      width: compact ? 64 : 92,
      height: compact ? 48 : 70,
      background: dark ? WC.black : WC.white,
      color: dark ? WC.white : WC.black,
      borderRadius: '8px 22px 8px 22px',
      border: `4px solid ${dark ? WC.white : WC.black}`,
      boxShadow: `8px 7px 0 ${WC.red}, 15px 13px 0 ${WC.green}, 22px 19px 0 ${WC.royal}`,
      fontFamily: "'Barlow Condensed', 'Outfit', 'Inter', sans-serif",
      fontSize: compact ? 13 : 17,
      fontWeight: 900,
      letterSpacing: .5,
      lineHeight: .9,
      animation: 'wcLogoKick .7s cubic-bezier(.16,1.3,.3,1) both',
    }}
  >
    <span className="text-center">REO<br />SHOW</span>
  </div>
);

const ColorRail: React.FC<{ vertical?: boolean; theme?: MondialTheme }> = ({ vertical, theme }) => (
  <div className={`flex ${vertical ? 'flex-col h-full w-5' : 'w-full h-5'}`}>
    {themedColors(theme).palette.slice(0, 6).map(color => <span key={color} className="flex-1" style={{ background: color }} />)}
  </div>
);

const FlagOrImage: React.FC<{ code: string; image?: string; size: number }> = ({ code, image, size }) => (
  <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
    <span className="absolute inset-0 flex items-center justify-center">
      <MondialFlag codeOrName={code} size={Math.round(size * .68)} />
    </span>
    {image && (
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        onError={event => { event.currentTarget.style.display = 'none'; }}
      />
    )}
  </span>
);

const FlagStack: React.FC<{ code: string; image?: string; size?: number; delay?: number }> = ({
  code,
  image,
  size = 108,
  delay = 0,
}) => (
  <div
    className="relative shrink-0"
    style={{
      width: size + 28,
      height: size + 28,
      animation: `wcBadgePop .72s ${delay}s cubic-bezier(.16,1.28,.3,1) both`,
    }}
  >
    {[WC.red, WC.green, WC.purple, WC.royal].map((color, index) => (
      <div
        key={color}
        className="absolute rounded-[30%]"
        style={{
          width: size,
          height: size,
          left: 4 + index * 6,
          top: 4 + index * 5,
          background: color,
          border: `4px solid ${WC.black}`,
        }}
      />
    ))}
    <div
      className="absolute left-0 top-0 flex items-center justify-center overflow-hidden rounded-[30%]"
      style={{
        width: size,
        height: size,
        background: WC.white,
        border: `5px solid ${WC.black}`,
      }}
    >
      <FlagOrImage code={code} image={image} size={size} />
    </div>
  </div>
);

const TeamCode: React.FC<{ value: string; color?: string; delay?: number; small?: boolean }> = ({
  value,
  color = WC.red,
  delay = 0,
  small,
}) => (
  <div
    className="relative font-black uppercase leading-none"
    style={{
      fontFamily: "'Barlow Condensed', 'Outfit', 'Inter', sans-serif",
      fontSize: small ? 28 : 52,
      letterSpacing: 1,
      color: WC.white,
      textShadow: `5px 0 0 ${color}, 10px 0 0 ${WC.royal}`,
      animation: `wcTextSlice .58s ${delay}s cubic-bezier(.16,1,.3,1) both`,
    }}
  >
    {value}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; color?: string; dark?: boolean }> = ({
  children,
  color = WC.yellow,
  dark,
}) => (
  <div
    className="px-5 py-2 rounded-full text-[13px] font-black whitespace-nowrap"
    style={{
      background: dark ? WC.black : color,
      color: dark ? WC.white : WC.black,
      border: `3px solid ${WC.black}`,
    }}
  >
    {children}
  </div>
);

const KineticHeader: React.FC<{ title: string; tag?: string; inverse?: boolean; theme?: MondialTheme }> = ({
  title,
  tag = 'WORLD CUP 2026',
  inverse,
  theme,
}) => {
  const c = themedColors(theme);
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-8">
        <ReoMark dark={inverse} />
        <div>
          <div className="text-[13px] font-black tracking-[.22em]" style={{ color: c.gold }}>{tag}</div>
          <div
            className="text-[34px] font-black leading-tight"
            style={{ animation: 'wcTextSlice .65s .16s cubic-bezier(.16,1,.3,1) both' }}
          >
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoreCore: React.FC<{
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  homeImage?: string;
  awayImage?: string;
  homeScore: number;
  awayScore: number;
  status: string;
  detail?: string;
}> = ({ home, away, homeCode, awayCode, homeImage, awayImage, homeScore, awayScore, status, detail }) => (
  <div className="relative flex items-center justify-center gap-16" dir="ltr">
    <div className="flex flex-col items-center gap-3">
      <FlagStack code={homeCode} image={homeImage} size={150} delay={.25} />
      <TeamCode value={homeCode} color={WC.green} delay={.48} />
      <div className="text-[24px] font-black text-center" dir="rtl">{home}</div>
    </div>
    <div className="relative">
      <div
        className="absolute inset-0 rounded-[34px]"
        style={{ background: WC.red, transform: 'translate(-16px, 15px) rotate(-2deg)' }}
      />
      <div
        className="absolute inset-0 rounded-[34px]"
        style={{ background: WC.green, transform: 'translate(15px, 9px) rotate(2deg)' }}
      />
      <div
        className="relative px-16 py-8 rounded-[34px] text-center"
        style={{
          background: WC.white,
          color: WC.black,
          border: `6px solid ${WC.black}`,
          animation: 'wcScorePop .72s .62s cubic-bezier(.16,1.35,.3,1) both',
        }}
      >
        <Pill color={WC.yellow}>{status}</Pill>
        <div className="font-black text-[128px] leading-[.9] tracking-[-.06em] mt-4" style={{ fontFamily: "'Barlow Condensed', 'Outfit', sans-serif" }}>
          {homeScore}<span className="mx-5">:</span>{awayScore}
        </div>
        {detail && <div className="text-[13px] font-black mt-3">{detail}</div>}
      </div>
    </div>
    <div className="flex flex-col items-center gap-3">
      <FlagStack code={awayCode} image={awayImage} size={150} delay={.34} />
      <TeamCode value={awayCode} color={WC.red} delay={.56} />
      <div className="text-[24px] font-black text-center" dir="rtl">{away}</div>
    </div>
  </div>
);

const stageImage = (getField: Getter): string =>
  text(getField, 'sceneImage', text(getField, 'backgroundImage', text(getField, 'heroImage', '')));

export const ReoObsScoreboard: React.FC<ReoObsVariantProps> = ({
  t,
  getField,
  resolveField,
}) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const homeCode = text(getField, 'homeCode', text(getField, 'homeShort', codeFromTeam(home, 'IQ')));
  const awayCode = text(getField, 'awayCode', text(getField, 'awayShort', codeFromTeam(away, 'AR')));
  const homeImage = text(getField, 'homeLogo', '');
  const awayImage = text(getField, 'awayLogo', '');
  const homeScore = resolvedNum(getField, resolveField, 'homeScore', 'homeScore', 1);
  const awayScore = resolvedNum(getField, resolveField, 'awayScore', 'awayScore', 0);
  const minute = resolvedText(getField, resolveField, 'minute', 'minute', '');
  const matchStatus = matchStatusPresentation(getField, resolveField);
  const status = matchStatus.isLive ? liveStatusText(minute) : matchStatus.label;
  const competition = resolvedText(getField, resolveField, 'competition', 'competition', 'FIFA WORLD CUP 2026');
  const stage = text(getField, 'stage', text(getField, 'matchStage', 'GROUP STAGE'));
  const c = themedColors(t);
  return (
    <KineticStage image={stageImage(getField)} theme={t}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={competition} tag="REO SHOW MATCH CENTER" theme={t} />
        <div className="flex-1 flex items-center justify-center">
          <ScoreCore
            home={home}
            away={away}
            homeCode={homeCode}
            awayCode={awayCode}
            homeImage={homeImage}
            awayImage={awayImage}
            homeScore={homeScore}
            awayScore={awayScore}
            status={status}
            detail={stage}
          />
        </div>
        <div className="flex items-end justify-between">
          <Pill color={c.accent}>{text(getField, 'venue', text(getField, 'matchVenue', 'REO SHOW STUDIO'))}</Pill>
          <div className="w-[44%]"><ColorRail theme={t} /></div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsMatchResult: React.FC<ReoObsVariantProps> = props => {
  const proxy: Getter = id => id === 'matchStatus' ? 'FT' : props.getField(id);
  return <ReoObsScoreboard {...props} getField={proxy} bridgeStatus="idle" />;
};

export const ReoObsScorebug: React.FC<ReoObsVariantProps> = ({ t, getField, resolveField }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const homeCode = text(getField, 'homeCode', codeFromTeam(home, 'IQ'));
  const awayCode = text(getField, 'awayCode', codeFromTeam(away, 'AR'));
  const homeImage = text(getField, 'homeLogo', '');
  const awayImage = text(getField, 'awayLogo', '');
  const score = `${resolvedNum(getField, resolveField, 'homeScore', 'homeScore', 1)} : ${resolvedNum(getField, resolveField, 'awayScore', 'awayScore', 0)}`;
  const minute = resolvedText(getField, resolveField, 'minute', 'minute', '');
  const matchStatus = matchStatusPresentation(getField, resolveField);
  const statusDetail = matchStatus.isLive
    ? (minuteText(minute) ? `${minuteText(minute)}'` : 'الآن')
    : matchStatus.code === 'PRE'
      ? text(getField, 'matchTime', '--:--')
      : matchStatus.label;
  const statusCodeLabel = matchStatus.isLive
    ? 'مباشر'
    : matchStatus.code === 'PRE'
      ? 'قادمة'
      : matchStatus.label;
  const c = themedColors(t);
  return (
    <KineticStage transparent theme={t}>
      <div className="absolute top-7 left-1/2 -translate-x-1/2" dir="ltr">
        <div
          className="relative flex items-stretch h-[88px]"
          style={{ animation: 'wcScorebugIn .72s cubic-bezier(.16,1.25,.3,1) both' }}
        >
          <div className="absolute inset-0 rounded-[30px]" style={{ background: c.danger, transform: 'translate(-14px,10px)' }} />
          <div className="absolute inset-0 rounded-[30px]" style={{ background: c.success, transform: 'translate(14px,6px)' }} />
          <div className="relative flex items-stretch rounded-[30px] overflow-hidden border-[5px] border-black bg-white text-black">
            <div className="px-6 flex items-center gap-3 min-w-[220px] justify-end">
              <span className="text-[20px] font-black">{home}</span><FlagOrImage code={homeCode} image={homeImage} size={42} />
            </div>
            <div
              className="px-8 min-w-[150px] flex items-center justify-center bg-black text-white text-[42px] leading-none font-black whitespace-nowrap"
              style={{ fontFamily: "'Barlow Condensed', 'Outfit', sans-serif" }}
            >
              {score}
            </div>
            <div className="px-6 flex items-center gap-3 min-w-[220px]">
              <FlagOrImage code={awayCode} image={awayImage} size={42} /><span className="text-[20px] font-black">{away}</span>
            </div>
            <div className="px-5 flex flex-col items-center justify-center" style={{ background: c.gold }}>
              <span className="text-[10px] font-black">{statusCodeLabel}</span>
              <span className="text-[22px] font-black">{statusDetail}</span>
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsTicker: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const content = text(getField, 'tickerContent', 'REO SHOW تغطية مونديالية خاصة - تحليل مباشر - أخبار ونتائج');
  const items = content.split(/—|--|\||\n/).map(item => item.trim()).filter(Boolean);
  const track = [...items, ...items, ...items];
  const c = themedColors(t);
  return (
    <KineticStage transparent theme={t}>
      <div className="absolute inset-x-0 bottom-0 h-[82px] flex overflow-hidden" dir="ltr" style={{ animation: 'wcTickerIn .6s cubic-bezier(.16,1,.3,1) both' }}>
        <div className="relative w-[290px] shrink-0 flex items-center justify-center bg-black text-white overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-10 skew-x-[-16deg]" style={{ background: c.danger }} />
          <ReoMark compact dark />
          <div className="ml-7">
            <div className="text-[10px] font-black tracking-[.2em] text-[#eeff00]">مونديال 2026</div>
            <div className="text-[18px] font-black">{text(getField, 'tickerLabel', 'أخبار المونديال')}</div>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden bg-white text-black border-y-[5px] border-black">
          <div
            className="h-full flex items-center whitespace-nowrap"
            style={{ minWidth: '220%', animation: `wcTickerRun ${Math.max(12, num(getField, 'scrollSpeed', 22))}s linear infinite` }}
          >
            {track.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-5 px-9 text-[20px] font-black shrink-0" dir="rtl">
                <span className="w-5 h-5 rotate-45 border-[3px] border-black" style={{ background: paletteAt(t, index) }} />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="w-[120px] shrink-0"><ColorRail vertical theme={t} /></div>
      </div>
    </KineticStage>
  );
};

export const ReoObsLowerThird: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const c = themedColors(t);
  const color = text(getField, 'accentOverride', c.accent);
  return (
    <KineticStage transparent theme={t}>
      <div className="absolute left-10 bottom-10" dir="rtl" style={{ animation: 'wcLowerThirdIn .72s cubic-bezier(.16,1.2,.3,1) both' }}>
        <div className="absolute inset-0 rounded-[28px]" style={{ background: c.danger, transform: 'translate(-16px,13px)' }} />
        <div className="absolute inset-0 rounded-[28px]" style={{ background: c.success, transform: 'translate(14px,8px)' }} />
        <div className="relative min-w-[660px] h-[112px] flex bg-white text-black border-[5px] border-black rounded-[28px] overflow-hidden">
          <div className="w-[108px] flex items-center justify-center" style={{ background: color }}>
            <MondialFlag codeOrName={text(getField, 'personFlag', text(getField, 'code', 'IQ'))} size={58} />
          </div>
          <div className="flex-1 px-7 flex flex-col justify-center">
            <div className="text-[31px] font-black leading-none">{text(getField, 'personName', text(getField, 'name', 'أيمن حسين'))}</div>
            <div className="text-[15px] font-black mt-2">{text(getField, 'personRole', text(getField, 'position', 'مهاجم منتخب العراق'))}</div>
          </div>
          <div className="w-[110px] flex flex-col items-center justify-center bg-black text-white">
            <div className="text-[11px] font-black" style={{ color: c.gold }}>{text(getField, 'competitionTag', 'WC 2026')}</div>
            <div className="text-[42px] font-black">{text(getField, 'playerNumber', '9')}</div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsMatchPreview: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const home = text(getField, 'homeName', text(getField, 'homeTeam', 'العراق'));
  const away = text(getField, 'awayName', text(getField, 'awayTeam', 'فرنسا'));
  const homeCode = text(getField, 'homeCode', codeFromTeam(home, 'IQ'));
  const awayCode = text(getField, 'awayCode', codeFromTeam(away, 'FR'));
  const homeImage = text(getField, 'homeLogo', '');
  const awayImage = text(getField, 'awayLogo', '');
  const c = themedColors(t);
  return (
    <KineticStage image={stageImage(getField)} theme={t}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={text(getField, 'matchStage', 'المرحلة الجماعية')} tag="المباراة القادمة · REO SHOW" theme={t} />
        <div className="flex-1 flex items-center justify-center gap-16" dir="ltr">
          <div className="flex flex-col items-center gap-4">
            <FlagStack code={homeCode} image={homeImage} size={150} delay={.24} />
            <TeamCode value={homeCode} color={WC.green} delay={.48} />
            <div className="text-[25px] font-black" dir="rtl">{home}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[90px] font-black leading-none" style={{ color: c.gold, textShadow: `8px 6px 0 ${c.danger}` }}>V</div>
            <Pill color={c.gold}>{text(getField, 'matchDate', '15 JUNE 2026')}</Pill>
            <div className="mt-4 px-9 py-4 bg-white text-black border-[5px] border-black rounded-[25px] text-[48px] font-black">
              {text(getField, 'matchTime', '21:00')}
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <FlagStack code={awayCode} image={awayImage} size={150} delay={.32} />
            <TeamCode value={awayCode} color={WC.red} delay={.56} />
            <div className="text-[25px] font-black" dir="rtl">{away}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Pill color={WC.cyan}>{text(getField, 'matchVenue', 'WORLD CUP STADIUM')}</Pill>
          <Pill color={WC.pink}>{text(getField, 'groupBadge', 'GROUP A · ROUND 3')}</Pill>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsGroupTable: React.FC<ReoObsVariantProps> = ({ t, getField, liveData }) => {
  const raw = String(getField('groupTeamsJson') || getField('standingsJson') || getField('groupJson') || '[]');
  const parsed = safeParse<GroupRow[]>(raw, DEFAULT_GROUP);
  const group = text(getField, 'groupName', text(getField, 'groupLetter', 'A'));
  const liveGroup = Array.isArray(liveData?.groups)
    ? liveData.groups.map(recordOf).find(item => String(item?.code || '').toUpperCase() === group.toUpperCase())
    : null;
  const liveRows = Array.isArray(liveGroup?.teams)
    ? liveGroup.teams.map((value): GroupRow | null => {
        const team = recordOf(value);
        if (!team) return null;
        return {
          name: String(team.name || ''),
          nameAr: String(team.nameAr || team.name || ''),
          code: String(team.countryCode || team.shortName || ''),
          played: Number(team.played || 0),
          won: Number(team.wins || 0),
          drawn: Number(team.draws || 0),
          lost: Number(team.losses || 0),
          gf: Number(team.goalsFor || 0),
          ga: Number(team.goalsAgainst || 0),
          pts: Number(team.points || 0),
        };
      }).filter((row): row is GroupRow => Boolean(row))
    : [];
  const rows = liveRows.length ? liveRows : parsed.length ? parsed : DEFAULT_GROUP;
  const c = themedColors(t);
  return (
    <KineticStage theme={t}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={`ترتيب المجموعة ${group}`} tag="جدول المجموعة · REO SHOW" theme={t} />
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[980px]">
            <div className="absolute inset-0 rounded-[30px]" style={{ background: c.accent2, transform: 'translate(-18px,16px) rotate(-1deg)' }} />
            <div className="absolute inset-0 rounded-[30px]" style={{ background: c.accent, transform: 'translate(18px,10px) rotate(1deg)' }} />
            <div className="relative bg-white text-black border-[6px] border-black rounded-[30px] overflow-hidden">
              <div className="grid grid-cols-[78px_1fr_repeat(6,76px)] bg-black text-white px-5 py-4 text-[12px] font-black">
                <span>#</span><span>المنتخب</span><span>ل</span><span>ف</span><span>ت</span><span>خ</span><span>+/-</span><span>ن</span>
              </div>
              {rows.map((row, index) => {
                const color = paletteAt(t, index);
                const code = row.code || row.flag || 'IQ';
                return (
                  <div
                    key={`${row.nameAr || row.name}-${index}`}
                    className="grid grid-cols-[78px_1fr_repeat(6,76px)] items-center px-5 py-4 border-b-[3px] border-black last:border-b-0 text-[17px] font-black"
                    style={{ animation: `wcRowIn .55s ${.22 + index * .09}s cubic-bezier(.16,1,.3,1) both` }}
                  >
                    <span className="w-11 h-11 rounded-[14px] flex items-center justify-center border-[3px] border-black" style={{ background: color }}>{index + 1}</span>
                    <span className="flex items-center gap-4">
                      <MondialFlag codeOrName={code} size={40} />
                      <span>{row.nameAr || row.name || code}</span>
                    </span>
                    <span>{row.played ?? 0}</span><span>{row.won ?? 0}</span><span>{row.drawn ?? 0}</span><span>{row.lost ?? 0}</span>
                    <span>{(row.gf ?? 0) - (row.ga ?? 0)}</span>
                    <span className="text-[25px]">{row.pts ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsMatchStats: React.FC<ReoObsVariantProps> = ({ t, getField, resolveField, matchDetails }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const homeCode = text(getField, 'homeCode', codeFromTeam(home, 'IQ'));
  const awayCode = text(getField, 'awayCode', codeFromTeam(away, 'AR'));
  const statsViewMode = text(getField, 'statsViewMode', 'dual_bars');
  const statFocus = text(getField, 'statFocus', 'balanced');
  const rows = [
    {
      label: 'الاستحواذ',
      focus: 'control',
      keys: ['BallPossesion', 'Ball possession', 'Possession'],
      homeField: 'statPossessionHome',
      awayField: 'statPossessionAway',
      homeFallback: 48,
      awayFallback: 52,
    },
    {
      label: 'الأهداف المتوقعة',
      focus: 'attack',
      keys: ['expected_goals', 'Expected goals (xG)', 'Expected goals'],
      homeField: 'statXgHome',
      awayField: 'statXgAway',
      homeFallback: 0.8,
      awayFallback: 1.2,
    },
    {
      label: 'التسديدات',
      focus: 'attack',
      keys: ['total_shots', 'Total shots'],
      homeField: 'statShotsHome',
      awayField: 'statShotsAway',
      homeFallback: 8,
      awayFallback: 14,
    },
    {
      label: 'على المرمى',
      focus: 'attack',
      keys: ['ShotsOnTarget', 'Shots on target'],
      homeField: 'statOnTargetHome',
      awayField: 'statOnTargetAway',
      homeFallback: 4,
      awayFallback: 7,
    },
    {
      label: 'دقة التسديد',
      focus: 'accuracy',
      keys: ['Shot accuracy', 'Shots accuracy', 'On target percentage'],
      homeField: 'statShotAccuracyHome',
      awayField: 'statShotAccuracyAway',
      homeFallback: 50,
      awayFallback: 50,
    },
    {
      label: 'الركنيات',
      focus: 'attack',
      keys: ['corners', 'Corners'],
      homeField: 'statCornersHome',
      awayField: 'statCornersAway',
      homeFallback: 3,
      awayFallback: 6,
    },
    {
      label: 'مؤشر الضغط',
      focus: 'pressure',
      keys: ['High press', 'High turnovers', 'Possession won final 3rd', 'PPDA'],
      homeField: 'statPressureHome',
      awayField: 'statPressureAway',
      homeFallback: 61,
      awayFallback: 54,
    },
    {
      label: 'ميل الملعب',
      focus: 'control',
      keys: ['Field tilt', 'Final third entries', 'Territory'],
      homeField: 'statFieldTiltHome',
      awayField: 'statFieldTiltAway',
      homeFallback: 47,
      awayFallback: 53,
    },
    {
      label: 'استرداد الكرة',
      focus: 'pressure',
      keys: ['Ball recoveries', 'Recoveries', 'Possession won'],
      homeField: 'statRecoveriesHome',
      awayField: 'statRecoveriesAway',
      homeFallback: 42,
      awayFallback: 39,
    },
    {
      label: 'التحامات ناجحة',
      focus: 'discipline',
      keys: ['Duels won', 'Ground duels won', 'Aerial duels won'],
      homeField: 'statDuelsHome',
      awayField: 'statDuelsAway',
      homeFallback: 51,
      awayFallback: 49,
    },
    {
      label: 'المخالفات',
      focus: 'discipline',
      keys: ['fouls', 'Fouls', 'Fouls committed'],
      homeField: 'statFoulsHome',
      awayField: 'statFoulsAway',
      homeFallback: 12,
      awayFallback: 9,
    },
    {
      label: 'البطاقات الصفراء',
      focus: 'discipline',
      keys: ['yellow_cards', 'Yellow cards'],
      homeField: 'statYellowHome',
      awayField: 'statYellowAway',
      homeFallback: 2,
      awayFallback: 1,
    },
    {
      label: 'دقة التمرير',
      focus: 'accuracy',
      keys: ['AccuratePasses', 'Accurate passes', 'Pass accuracy'],
      homeField: 'statPassHome',
      awayField: 'statPassAway',
      homeFallback: 78,
      awayFallback: 88,
    },
  ].map(definition => {
    const liveRow = findDetailStat(matchDetails, definition.keys);
    const homeValue = liveRow?.home ?? num(getField, definition.homeField, definition.homeFallback);
    const awayValue = liveRow?.away ?? num(getField, definition.awayField, definition.awayFallback);
    return {
      label: definition.label,
      focus: definition.focus,
      homeValue,
      awayValue,
      homeBar: detailStatNumber(homeValue),
      awayBar: detailStatNumber(awayValue),
    };
  });
  const visibleRows = statFocus === 'balanced'
    ? rows
    : rows.filter(row => row.focus === statFocus);
  const statRows = visibleRows.length >= 3 ? visibleRows : rows;
  const featuredRows = statRows.slice(0, 4);
  const momentumRows = statRows.slice(0, 6);
  const pressureRows = rows
    .filter(row => row.focus === 'pressure' || row.focus === 'accuracy' || row.label === 'ميل الملعب')
    .slice(0, 6);
  const controlRows = rows
    .filter(row => ['control', 'accuracy', 'pressure'].includes(row.focus) || row.label === 'استرداد الكرة')
    .slice(0, 6);
  const shotFlowRows = rows
    .filter(row => row.focus === 'attack' || row.label === 'دقة التسديد')
    .slice(0, 5);
  const homeMomentum = momentumRows.filter(row => row.homeBar >= row.awayBar).length;
  const awayMomentum = momentumRows.length - homeMomentum;
  const homeControlScore = controlRows.filter(row => row.homeBar >= row.awayBar).length;
  const awayControlScore = controlRows.length - homeControlScore;
  const xgRow = rows.find(row => row.label === 'الأهداف المتوقعة') || shotFlowRows[0];
  const shotsRow = rows.find(row => row.label === 'التسديدات') || shotFlowRows[1];
  const c = themedColors(t);
  return (
    <KineticStage theme={t}>
      <div className="w-full h-full p-9 flex flex-col">
        <KineticHeader title="إحصائيات المباراة" tag="بيانات المباراة · REO SHOW" theme={t} />
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[1040px]">
            <div className="absolute inset-0 rounded-[32px]" style={{ background: c.danger, transform: 'translate(-18px,17px)' }} />
            <div className="absolute inset-0 rounded-[32px]" style={{ background: c.success, transform: 'translate(18px,10px)' }} />
            <div className="relative bg-white text-black border-[6px] border-black rounded-[32px] overflow-hidden">
              <div className="grid grid-cols-[1fr_170px_1fr] items-center bg-black text-white px-9 py-5">
                <div className="flex items-center gap-4"><MondialFlag codeOrName={homeCode} size={48} /><TeamCode value={homeCode} color={WC.green} small /></div>
                <div className="text-center text-[12px] font-black text-[#eeff00]">مونديال 2026</div>
                <div className="flex items-center justify-end gap-4"><TeamCode value={awayCode} color={WC.red} small /><MondialFlag codeOrName={awayCode} size={48} /></div>
              </div>
              {statsViewMode === 'key_numbers' ? (
                <div className="p-7 grid grid-cols-4 gap-4">
                  {featuredRows.map(({ label, homeValue, awayValue }, index) => (
                    <div key={label} className="min-h-[165px] border-[5px] border-black rounded-[26px] p-4 flex flex-col justify-between" style={{ background: paletteAt(t, index), animation: `wcBadgePop .55s ${.28 + index * .09}s cubic-bezier(.16,1.25,.3,1) both` }}>
                      <div className="text-[12px] font-black">{label}</div>
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <div className="text-[10px] font-black">{homeCode}</div>
                          <div className="text-[42px] leading-none font-black">{detailStatText(homeValue)}</div>
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-black">{awayCode}</div>
                          <div className="text-[42px] leading-none font-black">{detailStatText(awayValue)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : statsViewMode === 'momentum_grid' ? (
                <div className="p-7 grid grid-cols-[260px_1fr_260px] gap-5 items-stretch">
                  <div className="border-[5px] border-black rounded-[28px] p-5 flex flex-col justify-between" style={{ background: c.accent, animation: 'wcCardRise .62s .22s both' }}>
                    <div className="text-[13px] font-black">زخم {homeCode}</div>
                    <div className="text-[82px] leading-none font-black">{homeMomentum}</div>
                    <div className="text-[11px] font-black">تفوق في {momentumRows.length} مؤشرات</div>
                  </div>
                  <div className="space-y-3">
                    {momentumRows.map(({ label, homeBar, awayBar }, index) => {
                      const total = Math.max(1, homeBar + awayBar);
                      return (
                        <div key={label} className="grid grid-cols-[1fr_170px_1fr] gap-4 items-center font-black" style={{ animation: `wcRowIn .5s ${.3 + index * .07}s both` }}>
                          <div className="h-5 rounded-full bg-gray-200 overflow-hidden" dir="rtl"><div className="h-full" style={{ width: `${homeBar / total * 100}%`, background: c.accent }} /></div>
                          <div className="text-center text-[14px]">{label}</div>
                          <div className="h-5 rounded-full bg-gray-200 overflow-hidden"><div className="h-full" style={{ width: `${awayBar / total * 100}%`, background: c.danger }} /></div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-[5px] border-black rounded-[28px] p-5 flex flex-col justify-between text-white" style={{ background: c.danger, animation: 'wcCardRise .62s .3s both' }}>
                    <div className="text-[13px] font-black">زخم {awayCode}</div>
                    <div className="text-[82px] leading-none font-black">{awayMomentum}</div>
                    <div className="text-[11px] font-black">تفوق في {momentumRows.length} مؤشرات</div>
                  </div>
                </div>
              ) : statsViewMode === 'territory_radar' ? (
                <div className="p-7 grid grid-cols-[300px_1fr_300px] gap-5 items-stretch">
                  <div className="relative overflow-hidden border-[5px] border-black rounded-[30px] p-5 flex flex-col justify-between" style={{ background: c.accent, animation: 'wcCardRise .62s .2s both' }}>
                    <div className="absolute -right-12 -top-14 w-36 h-36 rounded-full bg-white/35" />
                    <div className="relative text-[13px] font-black">سيطرة {homeCode}</div>
                    <div className="relative text-[88px] leading-none font-black">{homeControlScore}</div>
                    <div className="relative text-[11px] font-black">من {controlRows.length} مؤشرات تحكم</div>
                  </div>
                  <div className="relative border-[5px] border-black rounded-[30px] bg-black text-white p-5 overflow-hidden">
                    <div className="absolute inset-0 opacity-25" style={{ background: `linear-gradient(90deg, ${c.accent}, transparent 42%, ${c.danger})` }} />
                    <div className="relative grid grid-cols-2 gap-4 mb-5">
                      {[homeCode, awayCode].map((code, index) => (
                        <div key={code} className="rounded-[24px] bg-white text-black border-[4px] border-black p-4 font-black" style={{ animation: `wcBadgePop .5s ${.24 + index * .09}s both` }}>
                          <div className="flex items-center gap-3"><MondialFlag codeOrName={code} size={38} /><span className="text-[15px]">{code}</span></div>
                          <div className="text-[46px] leading-none mt-3">{index === 0 ? homeControlScore : awayControlScore}</div>
                        </div>
                      ))}
                    </div>
                    <div className="relative space-y-3">
                      {controlRows.map(({ label, homeValue, awayValue, homeBar, awayBar }, index) => {
                        const total = Math.max(1, homeBar + awayBar);
                        const homePct = Math.round((homeBar / total) * 100);
                        const awayPct = 100 - homePct;
                        return (
                          <div key={`territory-${label}`} className="grid grid-cols-[82px_1fr_82px] gap-3 items-center font-black" style={{ animation: `wcRowIn .46s ${.32 + index * .07}s both` }}>
                            <span className="text-[17px]">{detailStatText(homeValue)}</span>
                            <div>
                              <div className="flex justify-between text-[10px] mb-1"><span>{label}</span><span>{homePct}:{awayPct}</span></div>
                              <div className="h-4 rounded-full bg-white/15 overflow-hidden border border-white/25">
                                <div className="h-full" style={{ width: `${homePct}%`, background: `linear-gradient(90deg, ${c.accent}, ${c.gold})` }} />
                              </div>
                            </div>
                            <span className="text-[17px] text-left">{detailStatText(awayValue)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="relative overflow-hidden border-[5px] border-black rounded-[30px] p-5 flex flex-col justify-between text-white" style={{ background: c.danger, animation: 'wcCardRise .62s .28s both' }}>
                    <div className="absolute -left-12 -bottom-14 w-36 h-36 rounded-full bg-black/20" />
                    <div className="relative text-[13px] font-black">سيطرة {awayCode}</div>
                    <div className="relative text-[88px] leading-none font-black">{awayControlScore}</div>
                    <div className="relative text-[11px] font-black">من {controlRows.length} مؤشرات تحكم</div>
                  </div>
                </div>
              ) : statsViewMode === 'xg_shot_flow' ? (
                <div className="p-7 grid grid-cols-[350px_1fr] gap-6 items-stretch">
                  <div className="relative border-[5px] border-black rounded-[30px] overflow-hidden text-black p-6 flex flex-col justify-between" style={{ background: c.gold, animation: 'wcCardRise .62s .22s both' }}>
                    <div className="absolute -right-14 -top-14 w-44 h-44 rounded-full bg-white/45" />
                    <div className="relative text-[14px] font-black">جودة الفرص xG</div>
                    <div className="relative grid grid-cols-2 gap-4 items-end">
                      <div>
                        <div className="text-[12px] font-black">{homeCode}</div>
                        <div className="text-[76px] leading-none font-black">{detailStatText(xgRow?.homeValue ?? 0)}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-[12px] font-black">{awayCode}</div>
                        <div className="text-[76px] leading-none font-black">{detailStatText(xgRow?.awayValue ?? 0)}</div>
                      </div>
                    </div>
                    <div className="relative text-[12px] font-black">التسديدات: {detailStatText(shotsRow?.homeValue ?? 0)} - {detailStatText(shotsRow?.awayValue ?? 0)}</div>
                  </div>
                  <div className="relative bg-black text-white border-[5px] border-black rounded-[30px] p-6 overflow-hidden">
                    <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 18% 20%, ${c.danger}, transparent 30%), radial-gradient(circle at 85% 75%, ${c.accent}, transparent 34%)` }} />
                    <div className="relative flex items-center justify-between mb-5">
                      <div className="text-[34px] leading-none font-black">تدفق التسديد</div>
                      <div className="rounded-full bg-white text-black border-[4px] border-black px-4 py-2 text-[12px] font-black">مباشر</div>
                    </div>
                    <div className="relative grid grid-cols-5 gap-3 h-[300px] items-end">
                      {shotFlowRows.map(({ label, homeValue, awayValue, homeBar, awayBar }, index) => {
                        const maxValue = Math.max(1, homeBar, awayBar);
                        return (
                          <div key={`shot-flow-${label}`} className="h-full flex flex-col justify-end gap-2" style={{ animation: `wcBadgePop .55s ${.3 + index * .08}s both` }}>
                            <div className="grid grid-cols-2 gap-1 items-end h-[210px]">
                              <div className="rounded-t-[14px] border-[3px] border-white/40" style={{ height: `${Math.max(16, (homeBar / maxValue) * 100)}%`, background: c.accent }} />
                              <div className="rounded-t-[14px] border-[3px] border-white/40" style={{ height: `${Math.max(16, (awayBar / maxValue) * 100)}%`, background: c.danger }} />
                            </div>
                            <div className="text-center">
                              <div className="text-[18px] font-black">{detailStatText(homeValue)}:{detailStatText(awayValue)}</div>
                              <div className="text-[9px] font-black text-white/65 leading-tight">{label}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : statsViewMode === 'pressure_accuracy' ? (
                <div className="p-7 grid grid-cols-[1fr_310px] gap-6 items-stretch">
                  <div className="grid grid-cols-2 gap-4">
                    {pressureRows.map(({ label, homeValue, awayValue, homeBar, awayBar }, index) => {
                      const total = Math.max(1, homeBar + awayBar);
                      const homePct = Math.round((homeBar / total) * 100);
                      const awayPct = 100 - homePct;
                      return (
                        <div key={label} className="border-[5px] border-black rounded-[26px] bg-white p-4 flex flex-col justify-between min-h-[154px]" style={{ animation: `wcBadgePop .55s ${.24 + index * .08}s cubic-bezier(.16,1.25,.3,1) both` }}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] font-black">{label}</span>
                            <span className="text-[10px] font-black rounded-full border-[3px] border-black px-2 py-1" style={{ background: paletteAt(t, index) }}>مباشر</span>
                          </div>
                          <div className="grid grid-cols-[1fr_56px_1fr] items-end gap-3 mt-4 font-black">
                            <div>
                              <div className="text-[10px]">{homeCode}</div>
                              <div className="text-[34px] leading-none">{detailStatText(homeValue)}</div>
                              <div className="h-3 rounded-full bg-gray-200 overflow-hidden mt-2" dir="rtl"><div className="h-full" style={{ width: `${homePct}%`, background: c.accent }} /></div>
                            </div>
                            <div className="text-center text-[15px] pb-2">vs</div>
                            <div className="text-left">
                              <div className="text-[10px]">{awayCode}</div>
                              <div className="text-[34px] leading-none">{detailStatText(awayValue)}</div>
                              <div className="h-3 rounded-full bg-gray-200 overflow-hidden mt-2"><div className="h-full" style={{ width: `${awayPct}%`, background: c.danger }} /></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="relative border-[5px] border-black rounded-[30px] overflow-hidden bg-black text-white p-5 flex flex-col justify-between">
                    <div className="absolute inset-0 opacity-35" style={{ background: `radial-gradient(circle at 28% 24%, ${c.danger}, transparent 33%), radial-gradient(circle at 72% 70%, ${c.accent}, transparent 36%)` }} />
                    <div className="relative">
                      <div className="text-[13px] font-black text-white/60">خلاصة الضغط والدقة</div>
                      <div className="text-[38px] leading-[1.1] font-black mt-2">من يفرض نسق المباراة؟</div>
                    </div>
                    <div className="relative space-y-3">
                      {pressureRows.slice(0, 4).map(({ label, homeBar, awayBar }, index) => {
                        const leader = homeBar >= awayBar ? homeCode : awayCode;
                        return (
                          <div key={`leader-${label}`} className="flex items-center justify-between rounded-[18px] bg-white text-black px-4 py-3 font-black" style={{ animation: `wcRowIn .5s ${.42 + index * .08}s both` }}>
                            <span className="text-[12px]">{label}</span>
                            <span className="text-[17px]">{leader}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-7 space-y-3">
                  {statRows.map(({ label, homeValue, awayValue, homeBar, awayBar }, index) => {
                    const total = Math.max(1, homeBar + awayBar);
                    return (
                      <div key={label} style={{ animation: `wcRowIn .5s ${.28 + index * .08}s cubic-bezier(.16,1,.3,1) both` }}>
                        <div className="grid grid-cols-[72px_1fr_150px_1fr_72px] items-center gap-4 font-black">
                          <span className="text-[23px]">{detailStatText(homeValue)}</span>
                          <div className="h-3 bg-gray-200 overflow-hidden rounded-full" dir="rtl"><div className="h-full" style={{ width: `${homeBar / total * 100}%`, background: c.accent }} /></div>
                          <span className="text-center text-[14px]">{label}</span>
                          <div className="h-3 bg-gray-200 overflow-hidden rounded-full"><div className="h-full" style={{ width: `${awayBar / total * 100}%`, background: c.danger }} /></div>
                          <span className="text-[23px] text-left">{detailStatText(awayValue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsLineup: React.FC<ReoObsVariantProps> = ({ t, getField, resolveField, matchDetails }) => {
  const lineupSide = text(getField, 'lineupSide', 'home') === 'away' ? 'away' : 'home';
  const liveLineup = matchDetails?.lineups?.[lineupSide];
  const livePlayers = lineupsToPlayersJson(matchDetails, lineupSide) as LineupPlayer[];
  const parsed = safeParse<LineupPlayer[]>(String(getField('playersJson') || '[]'), DEFAULT_PLAYERS);
  const code = liveLineup?.teamCode || text(getField, 'code', 'IQ');
  const team = text(getField, 'teamName', 'منتخب العراق');
  const displayTeam = liveLineup?.teamName || team;
  const formation = liveLineup?.formation || text(getField, 'formation', '4-3-3');
  const coach = liveLineup?.coach || text(getField, 'coach', '');
  const lineupLayoutMode = text(getField, 'lineupLayoutMode', 'auto_formation');
  const lineupDirection = text(getField, 'lineupDirection', 'attack_up');
  const lineupBoardStyle = text(getField, 'lineupBoardStyle', 'reference_black');
  const lineupNameMode = text(getField, 'lineupNameMode', 'short');
  const lineupPhotoMode = text(getField, 'lineupPhotoMode', 'auto');
  const lineupShowBench = getField('lineupShowBench') !== false && String(getField('lineupShowBench') ?? 'true') !== 'false';
  const sourcePlayers = livePlayers.length ? livePlayers : parsed.length ? parsed : DEFAULT_PLAYERS;
  const players = buildFormationLineup(sourcePlayers, formation, lineupLayoutMode, lineupDirection);
  const c = themedColors(t);
  const teamColor = text(getField, 'color', c.success);
  const skin = lineupSkin(lineupBoardStyle, c, teamColor);
  const status = matchStatusPresentation(getField, resolveField);
  const minute = String(matchDetails?.match.minute ?? getField('minute') ?? '').trim();
  const statusText = status.isLive ? liveStatusText(minute) : status.label;
  const benchPlayers = lineupShowBench ? (liveLineup?.subs ?? []).slice(0, 6).map(normalizedPlayer) : [];
  const lineOrder: LineupLine[] = lineupDirection === 'attack_down'
    ? ['goalkeeper', 'defence', 'midfield', 'support', 'attack']
    : ['attack', 'support', 'midfield', 'defence', 'goalkeeper'];
  const summaryOrder: LineupLine[] = ['goalkeeper', 'defence', 'midfield', 'support', 'attack'];
  const lineCounts = summaryOrder
    .map(line => ({
      line,
      label: LINEUP_LINE_LABELS[line],
      tag: LINEUP_LINE_TAGS[line],
      count: players.filter(player => player.line === line).length,
    }))
    .filter(item => item.count > 0);
  const isStadiumScene = skin.scene === 'stadium';
  const featurePhotoPlayers = players
    .filter(player => Boolean(lineupPlayerPhotoUrl(player, lineupPhotoMode, 'field')))
    .slice(0, 3);

  return (
    <KineticStage theme={t}>
      <div className="w-full h-full p-7 flex items-center justify-center" dir="ltr">
        <div
          className="relative w-[1540px] h-[860px] overflow-hidden rounded-[44px] border-[6px] border-black text-white"
          style={{ background: skin.shell, boxShadow: `18px 18px 0 ${c.ink}` }}
        >
          {isStadiumScene && (
            <>
              <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(ellipse at 50% 3%, rgba(255,255,255,.28), transparent 18%), radial-gradient(ellipse at 50% 34%, rgba(11,115,255,.24), transparent 34%), linear-gradient(180deg, rgba(255,255,255,.06) 0%, transparent 16%, rgba(0,0,0,.22) 58%, rgba(0,0,0,.62) 100%)' }} />
              <div className="absolute inset-x-16 top-8 h-24 rounded-full bg-white/10 blur-[38px]" />
              <div className="absolute left-0 right-0 top-[112px] h-[92px] opacity-35" style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.20) 0 2px, transparent 2px 36px), linear-gradient(180deg, rgba(255,255,255,.10), transparent)' }} />
              <div className="absolute -left-24 bottom-[-130px] w-[560px] h-[260px] rounded-[50%] bg-emerald-400/22 blur-[12px]" />
              <div className="absolute -right-24 bottom-[-130px] w-[560px] h-[260px] rounded-[50%] bg-blue-500/22 blur-[12px]" />
            </>
          )}
          <div className="absolute -right-24 -top-24 w-[460px] h-[460px] rounded-full border-[58px] border-white/10" />
          <div className="absolute -left-28 bottom-16 w-[380px] h-[380px] rounded-full border-[42px] border-white/10" />
          <div className="absolute inset-x-0 top-0"><ColorRail theme={t} /></div>
          <div className="relative z-10 h-full p-8 grid grid-rows-[118px_1fr] gap-7">
            <div className="rounded-[34px] border-[5px] border-black bg-black/88 overflow-hidden" style={{ boxShadow: `10px 10px 0 ${teamColor}` }}>
              <div className="h-full grid grid-cols-[250px_1fr_250px] items-center gap-6 px-7">
                <div className="flex items-center gap-4">
                  <MondialFlag codeOrName={code} size={70} />
                  <div>
                    <div className="text-[12px] font-black tracking-[.2em] text-white/55">LINEUP</div>
                    <div className="text-[42px] leading-none font-black">{formation}</div>
                  </div>
                </div>
                <div className="text-center" dir="rtl">
                  <div className="text-[18px] font-black text-white/62">{coach ? `المدرب: ${coach}` : 'التشكيلة الرسمية'}</div>
                  <div className="text-[56px] leading-none font-black mt-1">{displayTeam}</div>
                </div>
                <div className="flex items-center justify-end gap-4">
                  <div className="rounded-full border-[4px] border-white px-5 py-3 text-[18px] font-black" style={{ background: skin.chip, color: skin.chipText }}>
                    {statusText}
                  </div>
                  <ReoMark compact />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_385px] gap-7 min-h-0">
              <div
                className="relative rounded-[38px] border-[6px] border-black overflow-hidden"
                style={{ background: skin.field, boxShadow: `12px 12px 0 ${c.danger}` }}
              >
                {isStadiumScene && (
                  <>
                    <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(ellipse at 50% 88%, rgba(33,255,141,.34), transparent 28%), radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.20), transparent 17%), repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 3px, transparent 3px 54px)' }} />
                    <div className="absolute inset-x-0 top-0 h-[88px] opacity-45" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.20), transparent), repeating-linear-gradient(90deg, rgba(255,255,255,.24) 0 2px, transparent 2px 28px)' }} />
                    <div className="absolute left-1/2 top-8 w-[72%] h-[120px] -translate-x-1/2 rounded-[50%] border-t-[6px] border-white/20" />
                  </>
                )}
                {isStadiumScene && featurePhotoPlayers.map((player, index) => {
                  const imageUrl = lineupPlayerPhotoUrl(player, lineupPhotoMode, 'field');
                  return (
                    <div
                      key={`lineup-feature-${player.name}-${index}`}
                      className="absolute top-4 bottom-0 w-[210px] opacity-[.16] mix-blend-screen"
                      style={{ [index === 0 ? 'left' : index === 1 ? 'right' : 'left']: index === 2 ? '40%' : '-2%' }}
                    >
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-cover object-top grayscale contrast-125"
                        referrerPolicy="no-referrer"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  );
                })}
                <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(90deg, transparent 0 19%, ${skin.pitchLine} 19% 19.35%, transparent 19.35% 39%, ${skin.pitchLine} 39% 39.35%, transparent 39.35% 59%, ${skin.pitchLine} 59% 59.35%, transparent 59.35% 79%, ${skin.pitchLine} 79% 79.35%, transparent 79.35%)` }} />
                <div className="absolute inset-[42px] rounded-[30px] border-[3px]" style={{ borderColor: skin.pitchLine }} />
                <div className="absolute left-[42px] right-[42px] top-1/2 border-t-[3px]" style={{ borderColor: skin.pitchLine }} />
                <div className="absolute left-1/2 top-1/2 w-36 h-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]" style={{ borderColor: skin.pitchLine }} />
                <div className="absolute left-1/2 top-[42px] w-[34%] h-[74px] -translate-x-1/2 rounded-b-[34px] border-x-[3px] border-b-[3px]" style={{ borderColor: skin.pitchLine }} />
                <div className="absolute left-1/2 bottom-[42px] w-[34%] h-[74px] -translate-x-1/2 rounded-t-[34px] border-x-[3px] border-t-[3px]" style={{ borderColor: skin.pitchLine }} />
                {lineOrder.map((line, index) => (
                  <div
                    key={line}
                    className="absolute left-6 rounded-full border-[3px] border-black px-4 py-2 text-[12px] font-black"
                    style={{
                      top: `${10 + index * 20}%`,
                      background: paletteAt(t, index),
                      color: '#050505',
                      animation: `wcRowIn .46s ${.16 + index * .05}s both`,
                    }}
                  >
                    {LINEUP_LINE_TAGS[line]}
                  </div>
                ))}
                {players.map((player, index) => (
                  <div
                    key={`field-${player.name}-${index}`}
                    className="lineup-player-anchor absolute"
                    data-zone={player.line}
                    data-slot={`${player.rowIndex}-${player.slotIndex}`}
                    style={{
                      left: `${player.x}%`,
                      top: `${player.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <ReoLineupPlayerMarker
                      player={player}
                      index={index}
                      skin={skin}
                      lineupNameMode={lineupNameMode}
                      lineupPhotoMode={lineupPhotoMode}
                      theme={t}
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-[36px] border-[6px] border-black overflow-hidden" style={{ background: skin.panel, color: skin.panelText, boxShadow: `12px 12px 0 ${c.gold}` }} dir="rtl">
                <div className="p-4 border-b-[5px] border-black">
                  <div className="text-[13px] font-black opacity-60">لوحة توزيع اللاعبين</div>
                  <div className="text-[34px] leading-none font-black mt-1">{displayTeam}</div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {lineCounts.map((item, index) => (
                      <div key={item.line} className="rounded-[15px] border-[4px] border-black p-2" style={{ background: paletteAt(t, index), color: '#050505' }}>
                        <div className="text-[9px] font-black">{item.label}</div>
                        <div className="text-[24px] leading-none font-black">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 grid grid-cols-2 gap-1.5">
                  {players.map((player, index) => (
                    <div key={`${player.name}-list-${index}`} className="grid grid-cols-[30px_1fr] items-center gap-2 rounded-[13px] border-[3px] border-black px-2 py-1 text-[10px] font-black min-w-0" style={{ animation: `wcRowIn .45s ${.18 + index * .04}s both` }}>
                      <ReoLineupMiniAvatar player={player} index={index} lineupPhotoMode={lineupPhotoMode} theme={t} />
                      <span className="min-w-0">
                        <span className="block truncate">{player.name}</span>
                        <span className="block text-[8px] opacity-60">{player.pos || LINEUP_LINE_TAGS[player.line]}</span>
                      </span>
                    </div>
                  ))}
                </div>
                {benchPlayers.length > 0 && (
                  <div className="px-5 pb-5">
                    <div className="text-[12px] font-black opacity-60 mb-2">الاحتياط</div>
                    <div className="grid grid-cols-2 gap-2">
                      {benchPlayers.map((player, index) => (
                        <div key={`${player.name}-bench-${index}`} className="rounded-[14px] border-[3px] border-black px-3 py-2 text-[11px] font-black truncate">
                          {player.num ?? player.number ?? index + 12}. {lineupDisplayName(player.name, 'short')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsPlayerSpotlight: React.FC<ReoObsVariantProps> = ({ t, getField, matchDetails }) => {
  const playerSource = text(getField, 'playerSource', 'player_of_match');
  const playerPickIndex = Math.max(0, Math.min(10, Math.round(num(getField, 'playerPickIndex', 1)) - 1));
  const playerStatFocus = text(getField, 'playerStatFocus', 'auto');
  const sourceTopPlayer = playerSource === 'top_home'
    ? matchDetails?.topPlayers.home[playerPickIndex]
    : playerSource === 'top_away'
      ? matchDetails?.topPlayers.away[playerPickIndex]
      : undefined;
  const sourceLineupPlayer = playerSource === 'lineup_home'
    ? lineupsToPlayersJson(matchDetails, 'home')[playerPickIndex]
    : playerSource === 'lineup_away'
      ? lineupsToPlayersJson(matchDetails, 'away')[playerPickIndex]
      : undefined;
  const livePlayer = playerSource === 'manual'
    ? undefined
    : sourceTopPlayer || (playerSource === 'player_of_match' ? matchDetails?.playerOfTheMatch : undefined) || matchDetails?.playerOfTheMatch;
  const detailPlayer = sourceLineupPlayer || matchDetails?.players.find(player =>
    (livePlayer?.id && player.id && String(player.id) === String(livePlayer.id))
    || Boolean(livePlayer?.name && player.name === livePlayer.name)
  );
  const playerSide = sourceLineupPlayer?.team || livePlayer?.team || detailPlayer?.team || 'neutral';
  const image = livePlayer?.image || detailPlayer?.image || text(getField, 'playerImage', '');
  const playerCode = playerSide === 'away'
    ? matchDetails?.match.away.countryCode || matchDetails?.match.away.code
    : matchDetails?.match.home.countryCode || matchDetails?.match.home.code;
  const playerName = livePlayer?.name || detailPlayer?.name || text(getField, 'name', 'أيمن حسين');
  const playerPosition = detailPlayer?.pos || livePlayer?.teamName || text(getField, 'position', 'مهاجم منتخب العراق');
  const ratingValue = livePlayer?.rating ?? detailPlayer?.rating;
  const playerRating = ratingValue !== undefined
    ? detailStatText(ratingValue)
    : text(getField, 'rating', '9.1');
  const manualStats = safeParse<Array<{ label: string; value: string }>>(String(getField('statsJson') || '[]'), []);
  const performanceStats = (livePlayer?.stats ?? []).map(stat => ({
    key: stat.key,
    label: stat.label,
    value: stat.total === undefined ? detailStatText(stat.value) : `${detailStatText(stat.value)}/${stat.total}`,
  }));
  const statFocusTokens: Record<string, string[]> = {
    attack: ['goal', 'shot', 'xg', 'chance', 'assist'],
    passing: ['pass', 'accurate', 'key', 'cross', 'long ball'],
    defense: ['duel', 'tackle', 'interception', 'recovery', 'clearance', 'blocked'],
  };
  const focusTokens = statFocusTokens[playerStatFocus] ?? [];
  const focusedPerformanceStats = focusTokens.length
    ? performanceStats.filter(stat => {
        const statKey = `${stat.key} ${stat.label}`.toLowerCase();
        return focusTokens.some(token => statKey.includes(token));
      })
    : performanceStats;
  const identityStats = [
    detailPlayer?.number !== undefined ? { label: 'رقم القميص', value: String(detailPlayer.number) } : null,
    detailPlayer?.pos ? { label: 'المركز', value: detailPlayer.pos } : null,
    livePlayer?.teamName ? { label: 'المنتخب', value: livePlayer.teamName } : null,
    ratingValue !== undefined ? { label: 'التقييم', value: detailStatText(ratingValue) } : null,
  ].filter((stat): stat is { label: string; value: string } => Boolean(stat));
  const liveStats = [...(focusedPerformanceStats.length ? focusedPerformanceStats : performanceStats), ...identityStats]
    .filter((stat, index, values) => values.findIndex(value => value.label === stat.label) === index);
  const shownStats = liveStats.length
    ? [...liveStats, ...manualStats].slice(0, 4)
    : manualStats.length
      ? manualStats.slice(0, 4)
      : [
    { label: 'الأهداف', value: '2' },
    { label: 'على المرمى', value: '3/4' },
    { label: 'دقة التمرير', value: '79%' },
    { label: 'المسافة', value: '9.4 KM' },
      ];
  const playerCardMode = text(getField, 'playerCardMode', 'hero_stats');
  const spotlightStats = shownStats.slice(0, playerCardMode === 'impact_radar' ? 5 : 4);
  const c = themedColors(t);
  const spotlightCode = playerCode || text(getField, 'code', 'IQ');
  const sourceLabel = playerSource === 'top_home'
    ? 'أفضل لاعبي المضيف'
    : playerSource === 'top_away'
      ? 'أفضل لاعبي الضيف'
      : playerSource === 'lineup_home' || playerSource === 'lineup_away'
        ? 'من التشكيلة المباشرة'
        : playerSource === 'manual'
          ? 'بيانات يدوية'
          : 'رجل المباراة المباشر';
  if (playerCardMode === 'impact_radar') {
    return (
      <KineticStage image={image} theme={t}>
        <div className="w-full h-full p-10 grid grid-cols-[1fr_470px] gap-8 items-center">
          <div>
            <KineticHeader title="رادار التأثير" tag={`${sourceLabel} · REO SHOW`} theme={t} />
            <TeamCode value={spotlightCode} color={c.success} delay={.25} />
            <div className="text-[62px] font-black leading-[1.05] mt-5">{playerName}</div>
            <div className="text-[20px] font-black mt-3 text-[#eeff00]">{playerPosition}</div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {spotlightStats.slice(0, 4).map((stat, index) => (
                <div key={stat.label} className="border-[4px] border-black rounded-[22px] p-4 text-black" style={{ background: paletteAt(t, index), animation: `wcRowIn .5s ${.34 + index * .09}s both` }}>
                  <div className="text-[30px] leading-none font-black">{stat.value}</div>
                  <div className="text-[11px] font-black mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-[520px] flex items-center justify-center">
            <div className="absolute w-[420px] h-[420px] rounded-full border-[6px] border-black bg-white/90" style={{ boxShadow: `16px 14px 0 ${c.danger}` }} />
            {[0, 1, 2, 3, 4].map(index => (
              <div
                key={`radar-${index}`}
                className="absolute w-5 h-5 rounded-full border-[3px] border-black"
                style={{
                  background: paletteAt(t, index),
                  left: `${50 + Math.cos((index / 5) * Math.PI * 2 - Math.PI / 2) * 38}%`,
                  top: `${50 + Math.sin((index / 5) * Math.PI * 2 - Math.PI / 2) * 38}%`,
                  animation: `wcBadgePop .5s ${.42 + index * .08}s both`,
                }}
              />
            ))}
            <div className="relative text-center">
              <MondialFlag codeOrName={spotlightCode} size={96} />
              <div className="mt-5 text-[92px] leading-none font-black text-black">{playerRating}</div>
              <div className="text-[13px] font-black text-black">تقييم التأثير</div>
            </div>
          </div>
        </div>
      </KineticStage>
    );
  }
  if (playerCardMode === 'match_mom') {
    return (
      <KineticStage image={image} theme={t}>
        <div className="w-full h-full p-10 flex items-center justify-center">
          <div className="relative w-[1020px] min-h-[560px]">
            <div className="absolute inset-0 rounded-[40px]" style={{ background: c.gold, transform: 'translate(22px,18px)' }} />
            <div className="relative bg-white text-black border-[7px] border-black rounded-[40px] overflow-hidden">
              <div className="grid grid-cols-[280px_1fr]">
                <div className="p-8 flex flex-col items-center justify-center text-center" style={{ background: c.ink, color: c.paper }}>
                  <MondialFlag codeOrName={spotlightCode} size={118} />
                  <div className="mt-8 text-[102px] leading-none font-black">{playerRating}</div>
                  <div className="text-[12px] font-black text-[#eeff00]">رجل المباراة</div>
                </div>
                <div className="p-9">
                  <div className="text-[13px] font-black text-black/60">{sourceLabel}</div>
                  <div className="text-[72px] leading-[1.02] font-black mt-3">{playerName}</div>
                  <div className="text-[19px] font-black mt-3">{playerPosition}</div>
                  <div className="grid grid-cols-3 gap-3 mt-8">
                    {spotlightStats.slice(0, 3).map((stat, index) => (
                      <div key={stat.label} className="border-[4px] border-black rounded-[20px] p-4" style={{ background: paletteAt(t, index), animation: `wcBadgePop .5s ${.36 + index * .1}s both` }}>
                        <div className="text-[34px] leading-none font-black">{stat.value}</div>
                        <div className="text-[10px] font-black mt-2">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </KineticStage>
    );
  }
  return (
    <KineticStage image={image} theme={t}>
      <div className="w-full h-full p-10 grid grid-cols-[1fr_47%] gap-8">
        <div className="flex flex-col justify-between">
          <KineticHeader title="نجم المباراة" tag={`${sourceLabel} · REO SHOW`} theme={t} />
          <div>
            <TeamCode value={playerCode || text(getField, 'code', 'IQ')} color={c.success} delay={.25} />
            <div className="text-[60px] font-black leading-[1.08] mt-5">{playerName}</div>
            <div className="text-[20px] font-black mt-3 text-[#eeff00]">{playerPosition}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {shownStats.map((stat, index) => (
              <div key={stat.label} className="p-4 border-[4px] border-black rounded-[20px] text-black" style={{ background: paletteAt(t, index), animation: `wcRowIn .5s ${.45 + index * .1}s both` }}>
                <div className="text-[28px] font-black">{stat.value}</div><div className="text-[12px] font-black">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-end justify-center">
          {!image && <FlagStack code={playerCode || text(getField, 'code', 'IQ')} size={260} delay={.25} />}
          <div className="absolute top-7 right-5 bg-white text-black border-[6px] border-black rounded-[32px] px-8 py-5" style={{ boxShadow: `14px 12px 0 ${c.danger}`, animation: 'wcScorePop .7s .55s both' }}>
            <div className="text-[11px] font-black">التقييم</div>
            <div className="text-[70px] leading-none font-black">{playerRating}</div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsGoldenBoot: React.FC<ReoObsVariantProps> = ({ t, getField, liveData }) => {
  const liveScorers = normalizeWorldCupScorers(liveData);
  const boundScorers = scorersFromWorldCupData(liveData, getField('scorersJson'));
  const scorerViewMode = text(getField, 'scorerViewMode', 'race_board');
  const scorerMetric = text(getField, 'scorerMetric', 'goals');
  const scorerLimit = Math.max(3, Math.min(10, num(getField, 'scorerLimit', 6)));
  const scorerMetricConfig = {
    goals: {
      title: 'سباق الحذاء الذهبي',
      label: 'أهداف',
      value: (player: MondialLiveScorer) => player.goals,
    },
    assists: {
      title: 'سباق صناعة الأهداف',
      label: 'أسيست',
      value: (player: MondialLiveScorer) => player.assists ?? 0,
    },
    shots: {
      title: 'سباق التسديد',
      label: 'تسديدات',
      value: (player: MondialLiveScorer) => player.shots ?? player.shotsOnTarget ?? 0,
    },
    rating: {
      title: 'الأعلى تقييماً',
      label: 'تقييم',
      value: (player: MondialLiveScorer) => player.rating ?? 0,
    },
    appearances: {
      title: 'الأكثر مشاركة',
      label: 'مشاركة',
      value: (player: MondialLiveScorer) => player.appearances ?? 0,
    },
    minutes: {
      title: 'الأكثر لعباً',
      label: 'دقيقة',
      value: (player: MondialLiveScorer) => player.minutesPlayed ?? 0,
    },
  } satisfies Record<string, { title: string; label: string; value: (player: MondialLiveScorer) => number }>;
  const activeMetric = scorerMetricConfig[scorerMetric] ?? scorerMetricConfig.goals;
  const scorers = (boundScorers.length ? boundScorers : DEFAULT_SCORERS)
    .map(player => ({
      ...player,
      metricValue: activeMetric.value(player),
      metricLabel: player.metricLabel || activeMetric.label,
    }))
    .sort((a, b) =>
      (b.metricValue - a.metricValue)
      || ((b.goals ?? 0) - (a.goals ?? 0))
      || ((b.assists ?? 0) - (a.assists ?? 0))
      || ((a.rank ?? 999) - (b.rank ?? 999))
    )
    .map((player, index) => ({ ...player, rank: index + 1 }))
    .slice(0, scorerLimit);
  const c = themedColors(t);
  const sourceTag = liveScorers.length ? `${activeMetric.label} مباشر · REO SHOW` : `${activeMetric.label} · REO SHOW`;
  return (
    <KineticStage theme={t}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={activeMetric.title} tag={sourceTag} theme={t} />
        <div className="flex-1 flex items-center justify-center">
          {scorerViewMode === 'podium' ? (
            <div className="grid grid-cols-3 gap-6 w-[1060px] items-end">
              {scorers.slice(0, 3).map((player, index) => (
                <div
                  key={`${player.id ?? player.name}-podium-${index}`}
                  className="border-[6px] border-black rounded-[32px] overflow-hidden bg-white text-black"
                  style={{ minHeight: index === 0 ? 430 : 350, boxShadow: `14px 12px 0 ${paletteAt(t, index)}`, animation: `wcCardRise .65s ${.22 + index * .1}s cubic-bezier(.16,1.2,.3,1) both` }}
                >
                  <div className="h-28 flex items-center justify-between px-6" style={{ background: index === 0 ? c.gold : paletteAt(t, index + 2) }}>
                    <div className="text-[58px] font-black">{player.rank ?? index + 1}</div>
                    <FlagOrImage code={player.code || player.countryCode} image={player.flagUrl} size={70} />
                  </div>
                  <div className="p-6">
                    <div className="text-[28px] leading-[1.08] font-black">{player.nameAr || player.name}</div>
                    <div className="text-[13px] font-black mt-2">{player.team}</div>
                    <div className="mt-7 text-[96px] leading-none font-black">{detailStatText(player.metricValue)}</div>
                    <div className="text-[12px] font-black">{player.metricLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : scorerViewMode === 'compact_ranking' ? (
            <div className="w-[1080px] grid grid-cols-2 gap-4">
              {scorers.map((player, index) => (
                <div key={`${player.id ?? player.name}-compact-${index}`} className="grid grid-cols-[56px_60px_1fr_82px] items-center gap-4 border-[4px] border-black rounded-[22px] bg-white text-black px-4 py-3" style={{ boxShadow: `8px 7px 0 ${paletteAt(t, index)}`, animation: `wcRowIn .45s ${.18 + index * .06}s both` }}>
                  <div className="text-[28px] font-black">{player.rank ?? index + 1}</div>
                  <FlagOrImage code={player.code || player.countryCode} image={player.flagUrl} size={52} />
                  <div><div className="text-[18px] font-black leading-tight">{player.nameAr || player.name}</div><div className="text-[10px] font-black">{player.team}</div></div>
                  <div className="rounded-[16px] border-[4px] border-black text-center py-2" style={{ background: c.gold }}><div className="text-[28px] leading-none font-black">{detailStatText(player.metricValue)}</div></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-[1080px] space-y-3">
              {scorers.map((player, index) => (
                <div
                  key={`${player.id ?? player.name}-${index}`}
                  className="grid grid-cols-[86px_82px_1fr_250px_120px] items-center border-[5px] border-black rounded-[25px] overflow-hidden bg-white text-black"
                  style={{ background: c.paper, color: c.ink, boxShadow: `12px 10px 0 ${paletteAt(t, index)}`, animation: `wcRowIn .55s ${.2 + index * .11}s both` }}
                >
                  <div className="h-full min-h-[86px] flex items-center justify-center text-[42px] font-black" style={{ background: c.ink, color: c.paper }}>{player.rank ?? index + 1}</div>
                  <div className="flex items-center justify-center">
                    <div className="relative w-16 h-16 overflow-hidden rounded-[18px] border-[4px] border-black bg-white">
                      <FlagOrImage code={player.code || player.countryCode} image={player.flagUrl} size={64} />
                      {player.image && (
                        <img
                          src={player.image}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={event => { event.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="px-5">
                    <div className="text-[22px] font-black">{player.nameAr || player.name}</div>
                    <div className="text-[12px] font-black">{player.team}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 px-4 text-[10px] font-black">
                    <span className="rounded-full border-2 border-black px-3 py-1">أسيست {player.assists ?? 0}</span>
                    {player.appearances !== undefined && (
                      <span className="rounded-full border-2 border-black px-3 py-1">مشاركة {player.appearances}</span>
                    )}
                    {player.minutesPlayed !== undefined && (
                      <span className="rounded-full border-2 border-black px-3 py-1">دقيقة {player.minutesPlayed}</span>
                    )}
                  </div>
                  <div className="h-full flex flex-col items-center justify-center" style={{ background: c.gold }}><div className="text-[43px] font-black">{detailStatText(player.metricValue)}</div><div className="text-[10px] font-black">{player.metricLabel}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsQuote: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const image = text(getField, 'authorImage', '');
  const c = themedColors(t);
  return (
    <KineticStage image={image} theme={t}>
      <div className="w-full h-full p-12 flex flex-col justify-between">
        <KineticHeader title={text(getField, 'quoteCategory', 'تصريح بارز')} tag="REO SHOW QUOTE" theme={t} />
        <div className="max-w-[900px]">
          <div className="text-[110px] leading-[.5] font-black text-[#eeff00]">“</div>
          <div className="text-[43px] font-black leading-[1.45]" style={{ animation: 'wcTextSlice .72s .3s both' }}>{text(getField, 'quoteText', 'سنعود أقوى، فالتفاصيل الصغيرة هي التي تصنع المونديال.')}</div>
          <div className="mt-8 inline-flex items-center gap-4 bg-white text-black border-[5px] border-black rounded-[24px] px-6 py-4" style={{ boxShadow: `12px 10px 0 ${c.accent2}` }}>
            <MondialFlag codeOrName={text(getField, 'authorFlag', 'FR')} size={42} />
            <div><div className="text-[19px] font-black">{text(getField, 'authorName', 'مدرب المنتخب')}</div><div className="text-[12px] font-black">{text(getField, 'authorTeam', 'WORLD CUP 2026')}</div></div>
          </div>
        </div>
        <ColorRail theme={t} />
      </div>
    </KineticStage>
  );
};

export const ReoObsPrediction: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const c = themedColors(t);
  const values = [
    { label: `فوز ${text(getField, 'homeTeam', 'العراق')}`, value: clamp(num(getField, 'homeWinPct', 35)), color: c.success },
    { label: 'تعادل', value: clamp(num(getField, 'drawPct', 25)), color: c.gold },
    { label: `فوز ${text(getField, 'awayTeam', 'الأرجنتين')}`, value: clamp(num(getField, 'awayWinPct', 40)), color: c.danger },
  ];
  return (
    <KineticStage theme={t}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={text(getField, 'predictionTitle', 'من سيفوز؟')} tag="REO PREDICTION ENGINE" theme={t} />
        <div className="flex-1 grid grid-cols-3 gap-6 items-center">
          {values.map((item, index) => (
            <div key={item.label} className="relative h-[410px]" style={{ animation: `wcCardRise .65s ${.2 + index * .12}s cubic-bezier(.16,1.2,.3,1) both` }}>
              <div className="absolute inset-0 rounded-[34px]" style={{ background: paletteAt(t, index + 4), transform: 'translate(14px,13px)' }} />
              <div className="relative h-full rounded-[34px] border-[6px] border-black flex flex-col items-center justify-between p-8 text-black" style={{ background: item.color }}>
                <div className="text-[18px] font-black">{item.label}</div>
                <div className="text-[100px] font-black leading-none">{item.value}<span className="text-[35px]">%</span></div>
                <div className="w-full h-6 border-[4px] border-black rounded-full bg-white overflow-hidden"><div className="h-full bg-black" style={{ width: `${item.value}%`, animation: `wcBarGrow .85s ${.55 + index * .1}s both` }} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsVarAlert: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const type = text(getField, 'varAlertType', 'VAR');
  const c = themedColors(t);
  const color = type === 'GOAL' ? c.success : type === 'RED_CARD' ? c.danger : type === 'PENALTY' ? c.warning : c.gold;
  return (
    <KineticStage theme={t}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="absolute inset-y-0 left-0 w-[32%]" style={{ background: c.accent, animation: 'wcSideWipe .55s both' }} />
        <div className="absolute inset-y-0 right-0 w-[32%]" style={{ background: c.danger, animation: 'wcSideWipe .55s both reverse' }} />
        <div className="relative text-center">
          <div className="text-[140px] font-black leading-none" style={{ color, textShadow: `10px 9px 0 ${WC.white}, 20px 18px 0 ${WC.black}`, animation: 'wcScorePop .58s .2s both' }}>{type}</div>
          <div className="mt-10 inline-block bg-white text-black border-[6px] border-black rounded-full px-12 py-5 text-[29px] font-black">{text(getField, 'varMessage', 'مراجعة هدف محتمل')}</div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsAnalysis: React.FC<ReoObsVariantProps> = ({ t, getField, resolveField }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const analysisViewMode = text(getField, 'analysisViewMode', 'tactical_board');
  const keyBattles = [
    text(getField, 'keyBattle1', 'المهاجم ضد قلب الدفاع'),
    text(getField, 'keyBattle2', 'معركة وسط الملعب'),
  ];
  const possessionHome = clamp(num(getField, 'possession', 48), 0, 100);
  const possessionAway = clamp(num(getField, 'possessionAway', 52), 0, 100);
  const c = themedColors(t);
  if (analysisViewMode === 'key_battles') {
    return (
      <KineticStage theme={t}>
        <div className="w-full h-full p-10 flex flex-col">
          <KineticHeader title={`${home} ضد ${away}`} tag="KEY BATTLES · REO SHOW" theme={t} />
          <div className="flex-1 grid grid-cols-2 gap-7 items-center">
            {keyBattles.map((value, index) => (
              <div key={value} className="relative min-h-[420px]" style={{ animation: `wcCardRise .65s ${.22 + index * .12}s both` }}>
                <div className="absolute inset-0 rounded-[34px]" style={{ background: paletteAt(t, index + 3), transform: 'translate(18px,16px)' }} />
                <div className="relative h-full bg-white text-black border-[6px] border-black rounded-[34px] p-8 flex flex-col justify-between">
                  <div>
                    <div className="text-[13px] font-black text-black/60">مواجهة رقم {index + 1}</div>
                    <div className="text-[44px] leading-[1.12] font-black mt-4">{value}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-[22px] border-[4px] border-black p-4" style={{ background: c.accent }}><div className="text-[14px] font-black">{home}</div><div className="text-[42px] font-black">{possessionHome}%</div></div>
                    <div className="rounded-[22px] border-[4px] border-black p-4" style={{ background: c.danger, color: c.paper }}><div className="text-[14px] font-black">{away}</div><div className="text-[42px] font-black">{possessionAway}%</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </KineticStage>
    );
  }
  if (analysisViewMode === 'pressure_map') {
    return (
      <KineticStage theme={t}>
        <div className="w-full h-full p-9 flex flex-col">
          <KineticHeader title="خريطة الضغط والاستحواذ" tag={`${home} × ${away}`} theme={t} />
          <div className="flex-1 grid grid-cols-[1fr_360px] gap-8 items-center">
            <div className="relative h-[560px] bg-white border-[6px] border-black rounded-[34px] overflow-hidden">
              <div className="absolute inset-[7%] border-[4px] border-black rounded-[22px]" />
              <div className="absolute left-[7%] right-[7%] top-1/2 border-t-[4px] border-black" />
              <div className="absolute left-1/2 top-1/2 w-40 h-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-black" />
              {[
                ['ضغط عال', 25, 24, c.danger],
                ['استحواذ', 50, 50, c.gold],
                ['تحولات', 74, 72, c.accent],
                ['مساحة خلفية', 62, 28, c.success],
              ].map(([label, left, top, color], index) => (
                <div key={String(label)} className="absolute -translate-x-1/2 -translate-y-1/2 px-5 py-3 rounded-full border-[4px] border-black text-black text-[14px] font-black" style={{ left: `${left}%`, top: `${top}%`, background: color, animation: `wcBadgePop .55s ${.34 + index * .1}s both` }}>{label}</div>
              ))}
            </div>
            <div className="space-y-6">
              {[{ label: home, value: possessionHome, color: c.accent }, { label: away, value: possessionAway, color: c.danger }].map((item, index) => (
                <div key={item.label} className="border-[5px] border-black rounded-[26px] bg-white text-black p-5" style={{ animation: `wcRowIn .55s ${.32 + index * .11}s both` }}>
                  <div className="flex justify-between text-[17px] font-black"><span>{item.label}</span><span>{item.value}%</span></div>
                  <div className="h-6 rounded-full border-[3px] border-black bg-gray-100 overflow-hidden mt-4"><div className="h-full" style={{ width: `${item.value}%`, background: item.color, animation: `wcBarGrow .8s ${.5 + index * .12}s both` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </KineticStage>
    );
  }
  return (
    <KineticStage theme={t}>
      <div className="w-full h-full p-9 flex flex-col">
        <KineticHeader title={`${home} ضد ${away}`} tag="TACTICAL STUDIO · REO SHOW" theme={t} />
        <div className="flex-1 grid grid-cols-[1fr_520px] gap-7 items-center">
          <div>
            <div className="text-[38px] font-black leading-[1.55]">{text(getField, 'analysisText', 'الضغط العالي يمنح الأفضلية في الثلث الأخير، مع ضرورة حماية المساحة خلف الظهيرين.')}</div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {keyBattles.map((value, index) => (
                <div key={value} className="p-5 border-[4px] border-black rounded-[22px] text-black" style={{ background: paletteAt(t, index), animation: `wcRowIn .55s ${.35 + index * .12}s both` }}>
                  <div className="text-[10px] font-black">KEY BATTLE</div><div className="text-[18px] font-black mt-2">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-[520px] bg-white border-[6px] border-black rounded-[30px] overflow-hidden">
            <div className="absolute inset-[7%] border-[4px] border-black rounded-[20px]" />
            <div className="absolute left-[7%] right-[7%] top-1/2 border-t-[4px] border-black" />
            <div className="absolute left-1/2 top-1/2 w-36 h-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-black" />
            {[['ضغط', 24, 25, c.danger], ['تحول', 53, 50, c.gold], ['مساحة', 76, 68, c.accent]].map(([label, left, top, color], index) => (
              <div key={String(label)} className="absolute -translate-x-1/2 -translate-y-1/2 px-5 py-3 rounded-full border-[4px] border-black text-black text-[14px] font-black" style={{ left: `${left}%`, top: `${top}%`, background: color, animation: `wcBadgePop .55s ${.4 + index * .13}s both` }}>{label}</div>
            ))}
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsMatchReport: React.FC<ReoObsVariantProps> = ({ t, getField, resolveField, matchDetails }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const score = `${resolvedNum(getField, resolveField, 'homeScore', 'homeScore', 2)} : ${resolvedNum(getField, resolveField, 'awayScore', 'awayScore', 1)}`;
  const livePotm = matchDetails?.playerOfTheMatch;
  const momName = livePotm?.name || text(getField, 'momName', 'أيمن حسين');
  const momRating = livePotm?.rating !== undefined
    ? detailStatText(livePotm.rating)
    : text(getField, 'momRating', '8.7');
  const reportViewMode = text(getField, 'reportViewMode', 'post_match');
  const parsedEvents = safeParse<Array<{ minute?: string | number; type?: string; player?: string; team?: string }>>(
    String(getField('eventsJson') || '[]'),
    []
  );
  const timelineEvents = parsedEvents.length
    ? parsedEvents.slice(0, 5)
    : [{ minute: '23', type: 'goal', player: momName, team: 'home' }];
  const c = themedColors(t);
  if (reportViewMode === 'storyline') {
    return (
      <KineticStage image={stageImage(getField)} theme={t}>
        <div className="w-full h-full p-10 flex flex-col">
          <KineticHeader title="خط أحداث المباراة" tag={`${home} × ${away}`} theme={t} />
          <div className="flex-1 grid grid-cols-[360px_1fr] gap-8 items-center">
            <div className="bg-white text-black border-[6px] border-black rounded-[34px] p-8 text-center" style={{ boxShadow: `16px 14px 0 ${c.gold}`, animation: 'wcScorePop .65s .25s both' }}>
              <div className="text-[13px] font-black">النتيجة</div>
              <div className="text-[96px] leading-none font-black mt-3">{score}</div>
              <div className="text-[18px] font-black mt-6">{home}</div>
              <div className="text-[18px] font-black">{away}</div>
            </div>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => (
                <div key={`${event.minute ?? index}-${event.player ?? event.type ?? index}`} className="grid grid-cols-[90px_1fr] gap-5 items-center" style={{ animation: `wcRowIn .5s ${.28 + index * .09}s both` }}>
                  <div className="h-20 rounded-[24px] border-[5px] border-black flex items-center justify-center text-[27px] font-black" style={{ background: paletteAt(t, index) }}>{event.minute ?? '-'}</div>
                  <div className="bg-white text-black border-[5px] border-black rounded-[24px] px-6 py-4">
                    <div className="text-[12px] font-black text-black/60">{event.type || 'event'}</div>
                    <div className="text-[24px] font-black">{event.player || 'حدث المباراة'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </KineticStage>
    );
  }
  if (reportViewMode === 'potm_focus') {
    return (
      <KineticStage image={stageImage(getField)} theme={t}>
        <div className="w-full h-full p-10 flex items-center justify-center">
          <div className="relative w-[1000px]">
            <div className="absolute inset-0 rounded-[42px]" style={{ background: c.danger, transform: 'translate(-20px,16px)' }} />
            <div className="absolute inset-0 rounded-[42px]" style={{ background: c.gold, transform: 'translate(20px,12px)' }} />
            <div className="relative bg-white text-black border-[7px] border-black rounded-[42px] p-10 grid grid-cols-[1fr_300px] gap-7 items-center">
              <div>
                <TeamCode value={`${home} × ${away}`} color={c.success} delay={.25} />
                <div className="text-[44px] font-black leading-[1.2] mt-8">رجل المباراة صنع الفارق</div>
                <div className="text-[28px] font-black leading-[1.45] mt-5">{momName}</div>
                <div className="text-[20px] font-black mt-5 text-black/65">{text(getField, 'reportText', 'مباراة عالية الإيقاع حسمتها التفاصيل في التحولات والكرات الثانية.')}</div>
              </div>
              <div className="rounded-[34px] border-[6px] border-black p-7 text-center" style={{ background: c.ink, color: c.paper, animation: 'wcScorePop .65s .35s both' }}>
                <div className="text-[13px] font-black text-[#eeff00]">تقييم</div>
                <div className="text-[108px] leading-none font-black">{momRating}</div>
                <div className="mt-8 text-[80px] leading-none font-black">{score}</div>
              </div>
            </div>
          </div>
        </div>
      </KineticStage>
    );
  }
  return (
    <KineticStage image={stageImage(getField)} theme={t}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title="تقرير المباراة" tag="POST MATCH · REO SHOW" theme={t} />
        <div className="flex-1 grid grid-cols-[1fr_340px] gap-7 items-center">
          <div>
            <TeamCode value={`${home} × ${away}`} color={c.success} delay={.25} />
            <div className="text-[31px] font-black leading-[1.65] mt-8">{text(getField, 'reportText', 'مباراة عالية الإيقاع حسمتها التفاصيل في التحولات والكرات الثانية.')}</div>
          </div>
          <div className="space-y-6">
            <div className="bg-white text-black border-[6px] border-black rounded-[30px] p-8 text-center" style={{ boxShadow: `14px 12px 0 ${c.danger}`, animation: 'wcScorePop .65s .35s both' }}>
              <div className="text-[11px] font-black">انتهت</div><div className="text-[84px] font-black leading-none">{score}</div>
            </div>
            <div className="border-[5px] border-black rounded-[25px] p-6 text-black" style={{ background: c.gold, animation: 'wcRowIn .55s .55s both' }}>
              <div className="text-[11px] font-black">نجم المباراة</div><div className="text-[25px] font-black mt-2">{momName}</div><div className="text-[49px] font-black">{momRating}</div>
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsIraqSquad: React.FC<ReoObsVariantProps> = props => {
  const proxy: Getter = id => {
    if (id === 'code') return 'IQ';
    if (id === 'teamName') return text(props.getField, 'teamName', 'منتخب العراق');
    if (id === 'playersJson') return props.getField('playersJson') || props.getField('squadJson');
    return props.getField(id);
  };
  return <ReoObsLineup {...props} getField={proxy} />;
};

export const ReoObsIraqPlayerSpotlight: React.FC<ReoObsVariantProps> = props => {
  const proxy: Getter = id => {
    if (id === 'code') return 'IQ';
    if (id === 'name') return props.getField('name') || props.getField('playerName');
    if (id === 'position') return props.getField('position') || props.getField('playerPosition');
    if (id === 'rating') {
      const rating = props.getField('rating');
      return rating === undefined || rating === '' ? props.getField('playerRating') : rating;
    }
    if (id === 'statsJson') {
      return props.getField('statsJson') || JSON.stringify([
        { label: 'أهداف', value: String(props.getField('playerGoals') || 0) },
        { label: 'أسيست', value: String(props.getField('playerAssists') || 0) },
        { label: 'مباريات', value: String(props.getField('playerMatches') || 0) },
        { label: 'النادي', value: String(props.getField('playerClub') || '-') },
      ]);
    }
    return props.getField(id);
  };
  return <ReoObsPlayerSpotlight {...props} getField={proxy} />;
};

export const ReoObsIraqTicker: React.FC<ReoObsVariantProps> = props => {
  const proxy: Getter = id => {
    if (id === 'tickerLabel' && props.getField('iraqTickerLabel')) return props.getField('iraqTickerLabel');
    if (id === 'tickerContent' && props.getField('iraqNews')) return props.getField('iraqNews');
    if (id === 'tickerLabel') return text(props.getField, 'tickerLabel', 'أسود الرافدين');
    if (id === 'tickerContent') return text(props.getField, 'tickerContent', text(props.getField, 'newsText', 'العراق في المونديال - تغطية خاصة من REO SHOW'));
    return props.getField(id);
  };
  return <ReoObsTicker {...props} getField={proxy} />;
};

export const ReoObsIraqHistory: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const proxy: Getter = id => {
    if (id === 'historyYear') return getField('historyYear') || getField('momentYear');
    if (id === 'historyTitle') return getField('historyTitle') || getField('momentTitle');
    if (id === 'historyText') return getField('historyText') || getField('momentDetails');
    return getField(id);
  };
  return (
  <KineticStage image={stageImage(proxy)} theme={t}>
    <div className="w-full h-full p-12 flex flex-col justify-between">
      <KineticHeader title="ذاكرة أسود الرافدين" tag="IRAQ HISTORY · REO SHOW" theme={t} />
      <div className="grid grid-cols-[360px_1fr] items-end gap-12">
        <div className="bg-white text-black border-[6px] border-black rounded-[35px] p-8 text-center" style={{ boxShadow: `16px 14px 0 ${WC.green}`, animation: 'wcScorePop .68s .25s both' }}>
          <div className="text-[12px] font-black">WORLD CUP MEMORY</div><div className="text-[100px] font-black leading-none">{text(proxy, 'historyYear', '1986')}</div>
        </div>
        <div>
          <div className="text-[49px] font-black">{text(proxy, 'historyTitle', 'لحظة عراقية في كأس العالم')}</div>
          <div className="text-[27px] font-black leading-[1.65] mt-5">{text(proxy, 'historyText', 'من الذاكرة إلى مونديال 2026، قصة منتخب يكتب حضوره بجمهوره وشغفه.')}</div>
        </div>
      </div>
      <ColorRail theme={t} />
    </div>
  </KineticStage>
  );
};

export const ReoObsIraqFanPulse: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const proxy: Getter = id => {
    if (id === 'supportPct') {
      const supportPct = getField('supportPct');
      return supportPct === undefined || supportPct === '' ? getField('pulseValue') : supportPct;
    }
    if (id === 'pulseText') return getField('pulseText') || getField('supportMessage');
    return getField(id);
  };
  const support = clamp(num(proxy, 'supportPct', 92));
  const c = themedColors(t);
  return (
    <KineticStage image={stageImage(proxy)} theme={t}>
      <div className="w-full h-full p-12 flex flex-col justify-between">
        <KineticHeader title={text(proxy, 'title', 'نبض الجماهير العراقية')} tag="FAN PULSE · REO SHOW" theme={t} />
        <div className="max-w-[980px]">
          <div className="text-[46px] font-black leading-[1.5]">{text(proxy, 'pulseText', 'المدرج العراقي حاضر بالصوت واللون، وREO SHOW ينقل الإيقاع كما هو.')}</div>
          <div className="mt-9 bg-white text-black border-[6px] border-black rounded-[30px] p-7" style={{ boxShadow: `16px 13px 0 ${c.danger}` }}>
            <div className="flex items-center justify-between"><span className="text-[19px] font-black">مؤشر الحماس</span><span className="text-[58px] font-black">{support}%</span></div>
            <div className="h-8 border-[4px] border-black rounded-full overflow-hidden bg-white"><div className="h-full" style={{ width: `${support}%`, background: `linear-gradient(90deg, ${c.danger}, ${c.success}, ${c.gold})`, animation: 'wcBarGrow 1s .45s both' }} /></div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsIraqDashboard: React.FC<ReoObsVariantProps> = ({ t, getField }) => {
  const rows = safeParse<GroupRow[]>(String(getField('groupTeamsJson') || getField('standingsJson') || '[]'), DEFAULT_GROUP);
  const shown = rows.length ? rows : DEFAULT_GROUP;
  const c = themedColors(t);
  return (
    <KineticStage image={stageImage(getField)} theme={t}>
      <div className="w-full h-full p-9 flex flex-col">
        <KineticHeader title={text(getField, 'title', 'لوحة أسود الرافدين')} tag="IRAQ MATCH CENTER · REO SHOW" theme={t} />
        <div className="flex-1 grid grid-cols-[1fr_500px] gap-7 items-center">
          <div>
            <div className="text-[44px] leading-[1.45] font-black">{text(getField, 'subtitle', 'تغطية خاصة وتحليل مباشر بألوان المونديال')}</div>
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[['جاهزية', '88%', c.success], ['ضغط هجومي', '74%', c.gold], ['نبض الجمهور', '92%', c.danger]].map(([label, value, color], index) => (
                <div key={String(label)} className="border-[4px] border-black rounded-[22px] p-5 text-black" style={{ background: color, animation: `wcRowIn .5s ${.35 + index * .1}s both` }}>
                  <div className="text-[35px] font-black">{value}</div><div className="text-[12px] font-black">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-[28px]" style={{ background: c.danger, transform: 'translate(-13px,12px)' }} />
            <div className="relative bg-white text-black border-[5px] border-black rounded-[28px] overflow-hidden">
              <div className="bg-black text-white px-6 py-4 text-[20px] font-black">ترتيب مجموعة العراق</div>
              {shown.slice(0, 4).map((row, index) => (
                <div key={`${row.nameAr}-${index}`} className="grid grid-cols-[45px_1fr_55px] items-center px-5 py-4 border-b-[3px] border-black last:border-0 font-black">
                  <span className="w-9 h-9 rounded-[11px] border-[3px] border-black flex items-center justify-center" style={{ background: paletteAt(t, index) }}>{index + 1}</span>
                  <span className="flex items-center gap-3"><MondialFlag codeOrName={row.code || 'IQ'} size={35} />{row.nameAr || row.name}</span>
                  <span className="text-[23px]">{row.pts ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};
