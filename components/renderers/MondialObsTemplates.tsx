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

const matchStatusPresentation = (
  getField: Getter,
  resolveField?: ReoObsVariantProps['resolveField']
): MatchStatusPresentation => {
  const rawValue = resolveField
    ? resolveField('matchStatus', 'status')
    : getField('matchStatus') ?? getField('status');
  const raw = String(rawValue || 'PRE').trim();
  const token = raw.toLowerCase();
  const statusLabel = text(getField, 'statusLabel', text(getField, 'period', ''));

  if (token === 'live' || token.includes('playing') || token.includes('inprogress')) {
    return { code: 'LIVE', label: 'LIVE', isLive: true };
  }
  if (token === 'ht' || token.includes('half')) {
    return { code: 'HT', label: statusLabel || 'HT', isLive: false };
  }
  if (token === 'ft' || token === 'aet' || token === 'pen' || token.includes('finish')) {
    const code = token === 'aet' ? 'AET' : token === 'pen' ? 'PEN' : 'FT';
    return { code, label: statusLabel || code, isLive: false };
  }
  if (token.includes('cancel')) {
    return { code: 'CANCELLED', label: statusLabel || 'CANCELLED', isLive: false };
  }
  if (token === 'pre' || token.includes('schedule') || token.includes('notstarted')) {
    return { code: 'PRE', label: statusLabel || 'NEXT MATCH', isLive: false };
  }
  return { code: raw.toUpperCase(), label: statusLabel || raw.toUpperCase(), isLive: false };
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
}> = ({ children, image, dark = true, transparent }) => (
  <div
    className="relative w-full h-full overflow-hidden"
    dir="rtl"
    style={{
      color: dark ? WC.white : WC.black,
      background: transparent ? 'transparent' : dark ? WC.black : WC.royal,
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
            border: `82px solid ${WC.cyan}`,
            opacity: image ? .45 : .95,
            transform: 'rotate(25deg)',
            animation: 'wcArcSweep 1s cubic-bezier(.16,1,.3,1) both',
          }}
        />
        <div
          className="absolute -right-[12%] -top-[35%] w-[55%] h-[95%] rounded-[48%]"
          style={{
            border: `58px solid ${WC.pink}`,
            opacity: image ? .45 : .95,
            transform: 'rotate(25deg)',
            animation: 'wcArcSweep .92s .08s cubic-bezier(.16,1,.3,1) both',
          }}
        />
        <div
          className="absolute -left-[9%] bottom-[-18%] w-[48%] h-[52%]"
          style={{
            background: WC.green,
            borderRadius: '0 100% 0 0',
            animation: 'wcWipeUp .72s .08s cubic-bezier(.16,1,.3,1) both',
          }}
        />
        <div
          className="absolute left-[18%] bottom-[-15%] w-[34%] h-[40%]"
          style={{
            background: WC.royal,
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

const ColorRail: React.FC<{ vertical?: boolean }> = ({ vertical }) => (
  <div className={`flex ${vertical ? 'flex-col h-full w-5' : 'w-full h-5'}`}>
    {COLORS.slice(0, 6).map(color => <span key={color} className="flex-1" style={{ background: color }} />)}
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

const KineticHeader: React.FC<{ title: string; tag?: string; inverse?: boolean }> = ({
  title,
  tag = 'WORLD CUP 2026',
  inverse,
}) => (
  <div className="flex items-center justify-between gap-6">
    <div className="flex items-center gap-8">
      <ReoMark dark={inverse} />
      <div>
        <div className="text-[13px] font-black tracking-[.22em]" style={{ color: WC.yellow }}>{tag}</div>
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
  const minute = resolvedText(getField, resolveField, 'minute', 'minute', '67');
  const matchStatus = matchStatusPresentation(getField, resolveField);
  const status = matchStatus.isLive && minute ? `LIVE ${minute}'` : matchStatus.label;
  const competition = resolvedText(getField, resolveField, 'competition', 'competition', 'FIFA WORLD CUP 2026');
  const stage = text(getField, 'stage', text(getField, 'matchStage', 'GROUP STAGE'));
  return (
    <KineticStage image={stageImage(getField)}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={competition} tag="REO SHOW MATCH CENTER" />
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
          <Pill color={WC.cyan}>{text(getField, 'venue', text(getField, 'matchVenue', 'REO SHOW STUDIO'))}</Pill>
          <div className="w-[44%]"><ColorRail /></div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsMatchResult: React.FC<ReoObsVariantProps> = props => {
  const proxy: Getter = id => id === 'matchStatus' ? 'FULL-TIME' : props.getField(id);
  return <ReoObsScoreboard {...props} getField={proxy} bridgeStatus="idle" />;
};

export const ReoObsScorebug: React.FC<ReoObsVariantProps> = ({ getField, resolveField }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const homeCode = text(getField, 'homeCode', codeFromTeam(home, 'IQ'));
  const awayCode = text(getField, 'awayCode', codeFromTeam(away, 'AR'));
  const homeImage = text(getField, 'homeLogo', '');
  const awayImage = text(getField, 'awayLogo', '');
  const score = `${resolvedNum(getField, resolveField, 'homeScore', 'homeScore', 1)} : ${resolvedNum(getField, resolveField, 'awayScore', 'awayScore', 0)}`;
  const minute = resolvedText(getField, resolveField, 'minute', 'minute', '67');
  const matchStatus = matchStatusPresentation(getField, resolveField);
  const statusDetail = matchStatus.isLive
    ? (minute ? `${minute}'` : 'NOW')
    : matchStatus.code === 'PRE'
      ? text(getField, 'matchTime', '--:--')
      : matchStatus.label;
  return (
    <KineticStage transparent>
      <div className="absolute top-7 left-1/2 -translate-x-1/2" dir="ltr">
        <div
          className="relative flex items-stretch h-[88px]"
          style={{ animation: 'wcScorebugIn .72s cubic-bezier(.16,1.25,.3,1) both' }}
        >
          <div className="absolute inset-0 rounded-[30px]" style={{ background: WC.red, transform: 'translate(-14px,10px)' }} />
          <div className="absolute inset-0 rounded-[30px]" style={{ background: WC.green, transform: 'translate(14px,6px)' }} />
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
            <div className="px-5 flex flex-col items-center justify-center" style={{ background: WC.yellow }}>
              <span className="text-[10px] font-black">{matchStatus.code}</span>
              <span className="text-[22px] font-black">{statusDetail}</span>
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsTicker: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const content = text(getField, 'tickerContent', 'REO SHOW تغطية مونديالية خاصة - تحليل مباشر - أخبار ونتائج');
  const items = content.split(/—|--|\||\n/).map(item => item.trim()).filter(Boolean);
  const track = [...items, ...items, ...items];
  return (
    <KineticStage transparent>
      <div className="absolute inset-x-0 bottom-0 h-[82px] flex overflow-hidden" dir="ltr" style={{ animation: 'wcTickerIn .6s cubic-bezier(.16,1,.3,1) both' }}>
        <div className="relative w-[290px] shrink-0 flex items-center justify-center bg-black text-white overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-10 bg-red-500 skew-x-[-16deg]" />
          <ReoMark compact dark />
          <div className="ml-7">
            <div className="text-[10px] font-black tracking-[.2em] text-[#eeff00]">WORLD CUP 2026</div>
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
                <span className="w-5 h-5 rotate-45 border-[3px] border-black" style={{ background: COLORS[index % COLORS.length] }} />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="w-[120px] shrink-0"><ColorRail vertical /></div>
      </div>
    </KineticStage>
  );
};

export const ReoObsLowerThird: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const color = text(getField, 'accentOverride', WC.cyan);
  return (
    <KineticStage transparent>
      <div className="absolute left-10 bottom-10" dir="rtl" style={{ animation: 'wcLowerThirdIn .72s cubic-bezier(.16,1.2,.3,1) both' }}>
        <div className="absolute inset-0 rounded-[28px]" style={{ background: WC.red, transform: 'translate(-16px,13px)' }} />
        <div className="absolute inset-0 rounded-[28px]" style={{ background: WC.green, transform: 'translate(14px,8px)' }} />
        <div className="relative min-w-[660px] h-[112px] flex bg-white text-black border-[5px] border-black rounded-[28px] overflow-hidden">
          <div className="w-[108px] flex items-center justify-center" style={{ background: color }}>
            <MondialFlag codeOrName={text(getField, 'personFlag', text(getField, 'code', 'IQ'))} size={58} />
          </div>
          <div className="flex-1 px-7 flex flex-col justify-center">
            <div className="text-[31px] font-black leading-none">{text(getField, 'personName', text(getField, 'name', 'أيمن حسين'))}</div>
            <div className="text-[15px] font-black mt-2">{text(getField, 'personRole', text(getField, 'position', 'مهاجم منتخب العراق'))}</div>
          </div>
          <div className="w-[110px] flex flex-col items-center justify-center bg-black text-white">
            <div className="text-[11px] font-black text-[#eeff00]">{text(getField, 'competitionTag', 'WC 2026')}</div>
            <div className="text-[42px] font-black">{text(getField, 'playerNumber', '9')}</div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsMatchPreview: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const home = text(getField, 'homeName', text(getField, 'homeTeam', 'العراق'));
  const away = text(getField, 'awayName', text(getField, 'awayTeam', 'فرنسا'));
  const homeCode = text(getField, 'homeCode', codeFromTeam(home, 'IQ'));
  const awayCode = text(getField, 'awayCode', codeFromTeam(away, 'FR'));
  const homeImage = text(getField, 'homeLogo', '');
  const awayImage = text(getField, 'awayLogo', '');
  return (
    <KineticStage image={stageImage(getField)}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={text(getField, 'matchStage', 'المرحلة الجماعية')} tag="NEXT MATCH · REO SHOW" />
        <div className="flex-1 flex items-center justify-center gap-16" dir="ltr">
          <div className="flex flex-col items-center gap-4">
            <FlagStack code={homeCode} image={homeImage} size={150} delay={.24} />
            <TeamCode value={homeCode} color={WC.green} delay={.48} />
            <div className="text-[25px] font-black" dir="rtl">{home}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[90px] font-black leading-none" style={{ color: WC.yellow, textShadow: `8px 6px 0 ${WC.red}` }}>V</div>
            <Pill color={WC.yellow}>{text(getField, 'matchDate', '15 JUNE 2026')}</Pill>
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

export const ReoObsGroupTable: React.FC<ReoObsVariantProps> = ({ getField, liveData }) => {
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
  return (
    <KineticStage>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={`ترتيب المجموعة ${group}`} tag="GROUP TABLE · REO SHOW" />
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[980px]">
            <div className="absolute inset-0 rounded-[30px]" style={{ background: WC.pink, transform: 'translate(-18px,16px) rotate(-1deg)' }} />
            <div className="absolute inset-0 rounded-[30px]" style={{ background: WC.cyan, transform: 'translate(18px,10px) rotate(1deg)' }} />
            <div className="relative bg-white text-black border-[6px] border-black rounded-[30px] overflow-hidden">
              <div className="grid grid-cols-[78px_1fr_repeat(6,76px)] bg-black text-white px-5 py-4 text-[12px] font-black">
                <span>#</span><span>المنتخب</span><span>ل</span><span>ف</span><span>ت</span><span>خ</span><span>+/-</span><span>ن</span>
              </div>
              {rows.map((row, index) => {
                const color = COLORS[index % COLORS.length];
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

export const ReoObsMatchStats: React.FC<ReoObsVariantProps> = ({ getField, resolveField, matchDetails }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const homeCode = text(getField, 'homeCode', codeFromTeam(home, 'IQ'));
  const awayCode = text(getField, 'awayCode', codeFromTeam(away, 'AR'));
  const rows = [
    {
      label: 'الاستحواذ',
      keys: ['BallPossesion', 'Ball possession', 'Possession'],
      homeField: 'statPossessionHome',
      awayField: 'statPossessionAway',
      homeFallback: 48,
      awayFallback: 52,
    },
    {
      label: 'الأهداف المتوقعة',
      keys: ['expected_goals', 'Expected goals (xG)', 'Expected goals'],
      homeField: 'statXgHome',
      awayField: 'statXgAway',
      homeFallback: 0.8,
      awayFallback: 1.2,
    },
    {
      label: 'التسديدات',
      keys: ['total_shots', 'Total shots'],
      homeField: 'statShotsHome',
      awayField: 'statShotsAway',
      homeFallback: 8,
      awayFallback: 14,
    },
    {
      label: 'على المرمى',
      keys: ['ShotsOnTarget', 'Shots on target'],
      homeField: 'statOnTargetHome',
      awayField: 'statOnTargetAway',
      homeFallback: 4,
      awayFallback: 7,
    },
    {
      label: 'الركنيات',
      keys: ['corners', 'Corners'],
      homeField: 'statCornersHome',
      awayField: 'statCornersAway',
      homeFallback: 3,
      awayFallback: 6,
    },
    {
      label: 'المخالفات',
      keys: ['fouls', 'Fouls', 'Fouls committed'],
      homeField: 'statFoulsHome',
      awayField: 'statFoulsAway',
      homeFallback: 12,
      awayFallback: 9,
    },
    {
      label: 'البطاقات الصفراء',
      keys: ['yellow_cards', 'Yellow cards'],
      homeField: 'statYellowHome',
      awayField: 'statYellowAway',
      homeFallback: 2,
      awayFallback: 1,
    },
    {
      label: 'دقة التمرير',
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
      homeValue,
      awayValue,
      homeBar: detailStatNumber(homeValue),
      awayBar: detailStatNumber(awayValue),
    };
  });
  return (
    <KineticStage>
      <div className="w-full h-full p-9 flex flex-col">
        <KineticHeader title="إحصائيات المباراة" tag="MATCH DATA · REO SHOW" />
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[1040px]">
            <div className="absolute inset-0 rounded-[32px]" style={{ background: WC.red, transform: 'translate(-18px,17px)' }} />
            <div className="absolute inset-0 rounded-[32px]" style={{ background: WC.green, transform: 'translate(18px,10px)' }} />
            <div className="relative bg-white text-black border-[6px] border-black rounded-[32px] overflow-hidden">
              <div className="grid grid-cols-[1fr_170px_1fr] items-center bg-black text-white px-9 py-5">
                <div className="flex items-center gap-4"><MondialFlag codeOrName={homeCode} size={48} /><TeamCode value={homeCode} color={WC.green} small /></div>
                <div className="text-center text-[12px] font-black text-[#eeff00]">WORLD CUP 2026</div>
                <div className="flex items-center justify-end gap-4"><TeamCode value={awayCode} color={WC.red} small /><MondialFlag codeOrName={awayCode} size={48} /></div>
              </div>
              <div className="p-7 space-y-3">
                {rows.map(({ label, homeValue, awayValue, homeBar, awayBar }, index) => {
                  const total = Math.max(1, homeBar + awayBar);
                  return (
                    <div key={label} style={{ animation: `wcRowIn .5s ${.28 + index * .08}s cubic-bezier(.16,1,.3,1) both` }}>
                      <div className="grid grid-cols-[72px_1fr_150px_1fr_72px] items-center gap-4 font-black">
                        <span className="text-[23px]">{detailStatText(homeValue)}</span>
                        <div className="h-3 bg-gray-200 overflow-hidden rounded-full" dir="rtl"><div className="h-full bg-[#304fff]" style={{ width: `${homeBar / total * 100}%` }} /></div>
                        <span className="text-center text-[14px]">{label}</span>
                        <div className="h-3 bg-gray-200 overflow-hidden rounded-full"><div className="h-full bg-[#ff1738]" style={{ width: `${awayBar / total * 100}%` }} /></div>
                        <span className="text-[23px] text-left">{detailStatText(awayValue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsLineup: React.FC<ReoObsVariantProps> = ({ getField, matchDetails }) => {
  const lineupSide = text(getField, 'lineupSide', 'home') === 'away' ? 'away' : 'home';
  const liveLineup = matchDetails?.lineups?.[lineupSide];
  const livePlayers = lineupsToPlayersJson(matchDetails, lineupSide) as LineupPlayer[];
  const parsed = safeParse<LineupPlayer[]>(String(getField('playersJson') || '[]'), DEFAULT_PLAYERS);
  const players = livePlayers.length ? livePlayers : parsed.length ? parsed : DEFAULT_PLAYERS;
  const code = liveLineup?.teamCode || text(getField, 'code', 'IQ');
  const team = text(getField, 'teamName', 'منتخب العراق');
  const displayTeam = liveLineup?.teamName || team;
  const formation = liveLineup?.formation || text(getField, 'formation', '4-3-3');
  const coach = liveLineup?.coach || text(getField, 'coach', '');
  return (
    <KineticStage>
      <div className="w-full h-full p-8 flex items-center justify-center">
        <div className="relative w-[1240px] h-[700px]">
          <div className="absolute inset-0 rounded-[34px]" style={{ background: WC.red, transform: 'translate(-18px,17px)' }} />
          <div className="absolute inset-0 rounded-[34px]" style={{ background: WC.green, transform: 'translate(18px,10px)' }} />
          <div className="relative w-full h-full bg-white text-black border-[6px] border-black rounded-[34px] overflow-hidden">
            <div className="h-[76px] bg-black text-white flex items-center justify-between px-8">
              <div className="flex items-center gap-4"><MondialFlag codeOrName={code} size={44} /><span className="text-[25px] font-black">{displayTeam}</span></div>
              <div className="flex items-center gap-3">
                {coach && <span className="max-w-[310px] truncate text-[12px] font-black text-white/70">{coach}</span>}
                <Pill color={WC.yellow}>{formation}</Pill>
              </div>
            </div>
            <div className="grid grid-cols-[300px_1fr] h-[calc(100%_-_76px)]">
              <div className="p-5 border-r-[5px] border-black overflow-hidden">
                <div className="text-[13px] font-black mb-2">STARTING XI</div>
                {players.map((player, index) => (
                  <div key={`${player.name}-${index}`} className="flex items-center gap-3 py-1.5 border-b-2 border-black/15 text-[12px] font-black" style={{ animation: `wcRowIn .45s ${.18 + index * .045}s both` }}>
                    <span className="w-8 h-8 flex items-center justify-center rounded-[10px] border-[3px] border-black" style={{ background: COLORS[index % COLORS.length] }}>{player.num ?? player.number ?? index + 1}</span>
                    <span className="flex-1">{player.name}</span><span>{player.pos}</span>
                  </div>
                ))}
              </div>
              <div className="relative m-6 border-[4px] border-black rounded-[26px] overflow-hidden" style={{ background: '#f5f5f2' }}>
                <div className="absolute inset-x-[8%] top-[5%] bottom-[5%] border-[3px] border-black rounded-[20px]" />
                <div className="absolute left-[8%] right-[8%] top-1/2 border-t-[3px] border-black" />
                <div className="absolute left-1/2 top-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-black" />
                {players.map((player, index) => (
                  <div
                    key={`field-${player.name}-${index}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{
                      left: `${clamp(player.x ?? DEFAULT_PLAYERS[index]?.x ?? 50, 8, 92)}%`,
                      top: `${clamp(player.y ?? DEFAULT_PLAYERS[index]?.y ?? 50, 10, 84)}%`,
                      animation: `wcBadgePop .58s ${.38 + index * .065}s cubic-bezier(.16,1.28,.3,1) both`,
                    }}
                  >
                    <div className="w-12 h-12 rounded-full border-[4px] border-black flex items-center justify-center overflow-hidden text-[15px] font-black" style={{ background: COLORS[index % COLORS.length] }}>
                      {player.image ? <img src={player.image} alt="" className="w-full h-full object-cover" /> : player.num ?? player.number ?? index + 1}
                    </div>
                    <div className="mt-1 bg-black text-white rounded-full px-2 py-1 text-[9px] font-black whitespace-nowrap">{player.name.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsPlayerSpotlight: React.FC<ReoObsVariantProps> = ({ getField, matchDetails }) => {
  const livePlayer = matchDetails?.playerOfTheMatch;
  const detailPlayer = matchDetails?.players.find(player =>
    (livePlayer?.id && player.id && String(player.id) === String(livePlayer.id))
    || Boolean(livePlayer?.name && player.name === livePlayer.name)
  );
  const playerSide = livePlayer?.team || detailPlayer?.team || 'neutral';
  const image = livePlayer?.image || detailPlayer?.image || text(getField, 'playerImage', '');
  const playerCode = playerSide === 'away'
    ? matchDetails?.match.away.countryCode || matchDetails?.match.away.code
    : matchDetails?.match.home.countryCode || matchDetails?.match.home.code;
  const playerName = livePlayer?.name || text(getField, 'name', 'أيمن حسين');
  const playerPosition = detailPlayer?.pos || livePlayer?.teamName || text(getField, 'position', 'مهاجم منتخب العراق');
  const ratingValue = livePlayer?.rating ?? detailPlayer?.rating;
  const playerRating = ratingValue !== undefined
    ? detailStatText(ratingValue)
    : text(getField, 'rating', '9.1');
  const manualStats = safeParse<Array<{ label: string; value: string }>>(String(getField('statsJson') || '[]'), []);
  const performanceStats = (livePlayer?.stats ?? []).map(stat => ({
    label: stat.label,
    value: stat.total === undefined ? detailStatText(stat.value) : `${detailStatText(stat.value)}/${stat.total}`,
  }));
  const identityStats = [
    detailPlayer?.number !== undefined ? { label: 'رقم القميص', value: String(detailPlayer.number) } : null,
    detailPlayer?.pos ? { label: 'المركز', value: detailPlayer.pos } : null,
    livePlayer?.teamName ? { label: 'المنتخب', value: livePlayer.teamName } : null,
    ratingValue !== undefined ? { label: 'التقييم', value: detailStatText(ratingValue) } : null,
  ].filter((stat): stat is { label: string; value: string } => Boolean(stat));
  const liveStats = [...performanceStats, ...identityStats]
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
  return (
    <KineticStage image={image}>
      <div className="w-full h-full p-10 grid grid-cols-[1fr_47%] gap-8">
        <div className="flex flex-col justify-between">
          <KineticHeader title="نجم المباراة" tag="PLAYER SPOTLIGHT" />
          <div>
            <TeamCode value={playerCode || text(getField, 'code', 'IQ')} color={WC.green} delay={.25} />
            <div className="text-[60px] font-black leading-[1.08] mt-5">{playerName}</div>
            <div className="text-[20px] font-black mt-3 text-[#eeff00]">{playerPosition}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {shownStats.map((stat, index) => (
              <div key={stat.label} className="p-4 border-[4px] border-black rounded-[20px] text-black" style={{ background: COLORS[index % COLORS.length], animation: `wcRowIn .5s ${.45 + index * .1}s both` }}>
                <div className="text-[28px] font-black">{stat.value}</div><div className="text-[12px] font-black">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-end justify-center">
          {!image && <FlagStack code={playerCode || text(getField, 'code', 'IQ')} size={260} delay={.25} />}
          <div className="absolute top-7 right-5 bg-white text-black border-[6px] border-black rounded-[32px] px-8 py-5" style={{ boxShadow: `14px 12px 0 ${WC.red}`, animation: 'wcScorePop .7s .55s both' }}>
            <div className="text-[11px] font-black">RATING</div>
            <div className="text-[70px] leading-none font-black">{playerRating}</div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsGoldenBoot: React.FC<ReoObsVariantProps> = ({ getField, liveData }) => {
  const liveScorers = normalizeWorldCupScorers(liveData);
  const manualScorers = scorersFromWorldCupData(null, getField('scorersJson'));
  const scorers = (liveScorers.length ? liveScorers : manualScorers.length ? manualScorers : DEFAULT_SCORERS)
    .slice(0, Math.max(3, Math.min(10, num(getField, 'scorerLimit', 6))));
  const sourceTag = liveScorers.length ? 'UPDATED DATA · REO SHOW' : 'GOLDEN BOOT · REO SHOW';
  return (
    <KineticStage>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title="سباق الحذاء الذهبي" tag={sourceTag} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[1080px] space-y-3">
            {scorers.map((player, index) => (
              <div
                key={`${player.id ?? player.name}-${index}`}
                className="grid grid-cols-[86px_82px_1fr_250px_120px] items-center border-[5px] border-black rounded-[25px] overflow-hidden bg-white text-black"
                style={{ boxShadow: `12px 10px 0 ${COLORS[index % COLORS.length]}`, animation: `wcRowIn .55s ${.2 + index * .11}s both` }}
              >
                <div className="h-full min-h-[86px] flex items-center justify-center text-[42px] font-black bg-black text-white">{player.rank ?? index + 1}</div>
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
                <div className="h-full flex flex-col items-center justify-center" style={{ background: WC.yellow }}><div className="text-[43px] font-black">{player.goals}</div><div className="text-[10px] font-black">GOALS</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsQuote: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const image = text(getField, 'authorImage', '');
  return (
    <KineticStage image={image}>
      <div className="w-full h-full p-12 flex flex-col justify-between">
        <KineticHeader title={text(getField, 'quoteCategory', 'تصريح بارز')} tag="REO SHOW QUOTE" />
        <div className="max-w-[900px]">
          <div className="text-[110px] leading-[.5] font-black text-[#eeff00]">“</div>
          <div className="text-[43px] font-black leading-[1.45]" style={{ animation: 'wcTextSlice .72s .3s both' }}>{text(getField, 'quoteText', 'سنعود أقوى، فالتفاصيل الصغيرة هي التي تصنع المونديال.')}</div>
          <div className="mt-8 inline-flex items-center gap-4 bg-white text-black border-[5px] border-black rounded-[24px] px-6 py-4" style={{ boxShadow: `12px 10px 0 ${WC.pink}` }}>
            <MondialFlag codeOrName={text(getField, 'authorFlag', 'FR')} size={42} />
            <div><div className="text-[19px] font-black">{text(getField, 'authorName', 'مدرب المنتخب')}</div><div className="text-[12px] font-black">{text(getField, 'authorTeam', 'WORLD CUP 2026')}</div></div>
          </div>
        </div>
        <ColorRail />
      </div>
    </KineticStage>
  );
};

export const ReoObsPrediction: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const values = [
    { label: `فوز ${text(getField, 'homeTeam', 'العراق')}`, value: clamp(num(getField, 'homeWinPct', 35)), color: WC.green },
    { label: 'تعادل', value: clamp(num(getField, 'drawPct', 25)), color: WC.yellow },
    { label: `فوز ${text(getField, 'awayTeam', 'الأرجنتين')}`, value: clamp(num(getField, 'awayWinPct', 40)), color: WC.red },
  ];
  return (
    <KineticStage>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title={text(getField, 'predictionTitle', 'من سيفوز؟')} tag="REO PREDICTION ENGINE" />
        <div className="flex-1 grid grid-cols-3 gap-6 items-center">
          {values.map((item, index) => (
            <div key={item.label} className="relative h-[410px]" style={{ animation: `wcCardRise .65s ${.2 + index * .12}s cubic-bezier(.16,1.2,.3,1) both` }}>
              <div className="absolute inset-0 rounded-[34px]" style={{ background: COLORS[(index + 4) % COLORS.length], transform: 'translate(14px,13px)' }} />
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

export const ReoObsVarAlert: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const type = text(getField, 'varAlertType', 'VAR');
  const color = type === 'GOAL' ? WC.green : type === 'RED_CARD' ? WC.red : type === 'PENALTY' ? WC.orange : WC.yellow;
  return (
    <KineticStage>
      <div className="w-full h-full flex items-center justify-center">
        <div className="absolute inset-y-0 left-0 w-[32%] bg-[#304fff]" style={{ animation: 'wcSideWipe .55s both' }} />
        <div className="absolute inset-y-0 right-0 w-[32%] bg-[#ff1738]" style={{ animation: 'wcSideWipe .55s both reverse' }} />
        <div className="relative text-center">
          <div className="text-[140px] font-black leading-none" style={{ color, textShadow: `10px 9px 0 ${WC.white}, 20px 18px 0 ${WC.black}`, animation: 'wcScorePop .58s .2s both' }}>{type}</div>
          <div className="mt-10 inline-block bg-white text-black border-[6px] border-black rounded-full px-12 py-5 text-[29px] font-black">{text(getField, 'varMessage', 'مراجعة هدف محتمل')}</div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsAnalysis: React.FC<ReoObsVariantProps> = ({ getField, resolveField }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  return (
    <KineticStage>
      <div className="w-full h-full p-9 flex flex-col">
        <KineticHeader title={`${home} ضد ${away}`} tag="TACTICAL STUDIO · REO SHOW" />
        <div className="flex-1 grid grid-cols-[1fr_520px] gap-7 items-center">
          <div>
            <div className="text-[38px] font-black leading-[1.55]">{text(getField, 'analysisText', 'الضغط العالي يمنح الأفضلية في الثلث الأخير، مع ضرورة حماية المساحة خلف الظهيرين.')}</div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {[text(getField, 'keyBattle1', 'المهاجم ضد قلب الدفاع'), text(getField, 'keyBattle2', 'معركة وسط الملعب')].map((value, index) => (
                <div key={value} className="p-5 border-[4px] border-black rounded-[22px] text-black" style={{ background: COLORS[index], animation: `wcRowIn .55s ${.35 + index * .12}s both` }}>
                  <div className="text-[10px] font-black">KEY BATTLE</div><div className="text-[18px] font-black mt-2">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-[520px] bg-white border-[6px] border-black rounded-[30px] overflow-hidden">
            <div className="absolute inset-[7%] border-[4px] border-black rounded-[20px]" />
            <div className="absolute left-[7%] right-[7%] top-1/2 border-t-[4px] border-black" />
            <div className="absolute left-1/2 top-1/2 w-36 h-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-black" />
            {[['ضغط', 24, 25, WC.red], ['تحول', 53, 50, WC.lime], ['مساحة', 76, 68, WC.royal]].map(([label, left, top, color], index) => (
              <div key={String(label)} className="absolute -translate-x-1/2 -translate-y-1/2 px-5 py-3 rounded-full border-[4px] border-black text-black text-[14px] font-black" style={{ left: `${left}%`, top: `${top}%`, background: color, animation: `wcBadgePop .55s ${.4 + index * .13}s both` }}>{label}</div>
            ))}
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsMatchReport: React.FC<ReoObsVariantProps> = ({ getField, resolveField, matchDetails }) => {
  const home = resolvedText(getField, resolveField, 'homeTeam', 'homeTeam', 'العراق');
  const away = resolvedText(getField, resolveField, 'awayTeam', 'awayTeam', 'الأرجنتين');
  const score = `${resolvedNum(getField, resolveField, 'homeScore', 'homeScore', 2)} : ${resolvedNum(getField, resolveField, 'awayScore', 'awayScore', 1)}`;
  const livePotm = matchDetails?.playerOfTheMatch;
  const momName = livePotm?.name || text(getField, 'momName', 'أيمن حسين');
  const momRating = livePotm?.rating !== undefined
    ? detailStatText(livePotm.rating)
    : text(getField, 'momRating', '8.7');
  return (
    <KineticStage image={stageImage(getField)}>
      <div className="w-full h-full p-10 flex flex-col">
        <KineticHeader title="تقرير المباراة" tag="POST MATCH · REO SHOW" />
        <div className="flex-1 grid grid-cols-[1fr_340px] gap-7 items-center">
          <div>
            <TeamCode value={`${home} × ${away}`} color={WC.green} delay={.25} />
            <div className="text-[31px] font-black leading-[1.65] mt-8">{text(getField, 'reportText', 'مباراة عالية الإيقاع حسمتها التفاصيل في التحولات والكرات الثانية.')}</div>
          </div>
          <div className="space-y-6">
            <div className="bg-white text-black border-[6px] border-black rounded-[30px] p-8 text-center" style={{ boxShadow: `14px 12px 0 ${WC.red}`, animation: 'wcScorePop .65s .35s both' }}>
              <div className="text-[11px] font-black">FULL-TIME</div><div className="text-[84px] font-black leading-none">{score}</div>
            </div>
            <div className="border-[5px] border-black rounded-[25px] p-6 text-black" style={{ background: WC.yellow, animation: 'wcRowIn .55s .55s both' }}>
              <div className="text-[11px] font-black">MAN OF THE MATCH</div><div className="text-[25px] font-black mt-2">{momName}</div><div className="text-[49px] font-black">{momRating}</div>
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
  const proxy: Getter = id => id === 'code' ? 'IQ' : props.getField(id);
  return <ReoObsPlayerSpotlight {...props} getField={proxy} />;
};

export const ReoObsIraqTicker: React.FC<ReoObsVariantProps> = props => {
  const proxy: Getter = id => {
    if (id === 'tickerLabel') return text(props.getField, 'tickerLabel', 'أسود الرافدين');
    if (id === 'tickerContent') return text(props.getField, 'tickerContent', text(props.getField, 'newsText', 'العراق في المونديال - تغطية خاصة من REO SHOW'));
    return props.getField(id);
  };
  return <ReoObsTicker {...props} getField={proxy} />;
};

export const ReoObsIraqHistory: React.FC<ReoObsVariantProps> = ({ getField }) => (
  <KineticStage image={stageImage(getField)}>
    <div className="w-full h-full p-12 flex flex-col justify-between">
      <KineticHeader title="ذاكرة أسود الرافدين" tag="IRAQ HISTORY · REO SHOW" />
      <div className="grid grid-cols-[360px_1fr] items-end gap-12">
        <div className="bg-white text-black border-[6px] border-black rounded-[35px] p-8 text-center" style={{ boxShadow: `16px 14px 0 ${WC.green}`, animation: 'wcScorePop .68s .25s both' }}>
          <div className="text-[12px] font-black">WORLD CUP MEMORY</div><div className="text-[100px] font-black leading-none">{text(getField, 'historyYear', '1986')}</div>
        </div>
        <div>
          <div className="text-[49px] font-black">{text(getField, 'historyTitle', 'لحظة عراقية في كأس العالم')}</div>
          <div className="text-[27px] font-black leading-[1.65] mt-5">{text(getField, 'historyText', 'من الذاكرة إلى مونديال 2026، قصة منتخب يكتب حضوره بجمهوره وشغفه.')}</div>
        </div>
      </div>
      <ColorRail />
    </div>
  </KineticStage>
);

export const ReoObsIraqFanPulse: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const support = clamp(num(getField, 'supportPct', 92));
  return (
    <KineticStage image={stageImage(getField)}>
      <div className="w-full h-full p-12 flex flex-col justify-between">
        <KineticHeader title={text(getField, 'title', 'نبض الجماهير العراقية')} tag="FAN PULSE · REO SHOW" />
        <div className="max-w-[980px]">
          <div className="text-[46px] font-black leading-[1.5]">{text(getField, 'pulseText', 'المدرج العراقي حاضر بالصوت واللون، وREO SHOW ينقل الإيقاع كما هو.')}</div>
          <div className="mt-9 bg-white text-black border-[6px] border-black rounded-[30px] p-7" style={{ boxShadow: `16px 13px 0 ${WC.red}` }}>
            <div className="flex items-center justify-between"><span className="text-[19px] font-black">مؤشر الحماس</span><span className="text-[58px] font-black">{support}%</span></div>
            <div className="h-8 border-[4px] border-black rounded-full overflow-hidden bg-white"><div className="h-full" style={{ width: `${support}%`, background: `linear-gradient(90deg, ${WC.red}, ${WC.green}, ${WC.lime})`, animation: 'wcBarGrow 1s .45s both' }} /></div>
          </div>
        </div>
      </div>
    </KineticStage>
  );
};

export const ReoObsIraqDashboard: React.FC<ReoObsVariantProps> = ({ getField }) => {
  const rows = safeParse<GroupRow[]>(String(getField('groupTeamsJson') || '[]'), DEFAULT_GROUP);
  const shown = rows.length ? rows : DEFAULT_GROUP;
  return (
    <KineticStage image={stageImage(getField)}>
      <div className="w-full h-full p-9 flex flex-col">
        <KineticHeader title={text(getField, 'title', 'لوحة أسود الرافدين')} tag="IRAQ MATCH CENTER · REO SHOW" />
        <div className="flex-1 grid grid-cols-[1fr_500px] gap-7 items-center">
          <div>
            <div className="text-[44px] leading-[1.45] font-black">{text(getField, 'subtitle', 'تغطية خاصة وتحليل مباشر بألوان المونديال')}</div>
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[['جاهزية', '88%', WC.green], ['ضغط هجومي', '74%', WC.yellow], ['نبض الجمهور', '92%', WC.red]].map(([label, value, color], index) => (
                <div key={String(label)} className="border-[4px] border-black rounded-[22px] p-5 text-black" style={{ background: color, animation: `wcRowIn .5s ${.35 + index * .1}s both` }}>
                  <div className="text-[35px] font-black">{value}</div><div className="text-[12px] font-black">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-[28px]" style={{ background: WC.red, transform: 'translate(-13px,12px)' }} />
            <div className="relative bg-white text-black border-[5px] border-black rounded-[28px] overflow-hidden">
              <div className="bg-black text-white px-6 py-4 text-[20px] font-black">ترتيب مجموعة العراق</div>
              {shown.slice(0, 4).map((row, index) => (
                <div key={`${row.nameAr}-${index}`} className="grid grid-cols-[45px_1fr_55px] items-center px-5 py-4 border-b-[3px] border-black last:border-0 font-black">
                  <span className="w-9 h-9 rounded-[11px] border-[3px] border-black flex items-center justify-center" style={{ background: COLORS[index] }}>{index + 1}</span>
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
