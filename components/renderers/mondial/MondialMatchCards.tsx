import React from 'react';
import {
  fixturesFromWorldCupData,
  pickWorldCupMatch,
} from '../../../utils/mondialLiveSelectors';
import {
  BroadcastFlag,
  getBroadcastCssVars,
  getBroadcastLook,
  getBroadcastPalette,
  getBroadcastStyle,
  MondialBroadcastProps,
  MONDIAL_BROADCAST_CSS,
  ReoShowLockup,
  selectPayload,
  WorldCupMatch,
  WorldCupTeam,
} from './MondialBroadcastShared';

type MatchLike = Omit<WorldCupMatch, 'status'> & {
  status: string;
  group?: string;
  stage?: string;
  venue?: string;
  statusLabel?: string;
  minute?: string | number;
  liveMinute?: string | number;
  currentMinute?: string | number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
};

const MATCH_CSS = `
.mondial-match-shell { padding: 34px 42px; display: grid; grid-template-rows: 76px 1fr 38px; gap: 16px; }
.mondial-match-top { display: flex; align-items: center; justify-content: space-between; direction: rtl; }
.mondial-match-kicker { color: var(--mondial-a3); font-size: 14px; font-weight: 950; letter-spacing: .18em; text-transform: uppercase; }
.mondial-match-title { color: var(--mondial-ink); font-size: 42px; line-height: .88; font-weight: 950; text-transform: uppercase; }
.mondial-match-center { min-height: 0; display: grid; grid-template-columns: 1fr 310px 1fr; align-items: center; gap: 26px; direction: ltr; }
.mondial-side-team { min-width: 0; min-height: 0; position: relative; display: grid; align-content: center; justify-items: center; gap: 18px; height: 100%; border: 6px solid var(--team-color); background: var(--mondial-panel); box-shadow: 11px 10px 0 #050505; overflow: hidden; }
.mondial-side-team::before { content: ''; position: absolute; inset: -12% -18%; background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--team-color) 44%, transparent), transparent 42%), linear-gradient(125deg, transparent 0 46%, var(--team-color) 46% 51%, transparent 51% 100%); opacity: .72; }
.mondial-side-team .mondial-flag { width: 118px; height: 78px; border-width: 4px; position: relative; z-index: 1; }
.mondial-team-short { position: relative; z-index: 1; color: var(--mondial-paper); font-size: 78px; line-height: .82; font-weight: 950; text-shadow: 7px 5px 0 #050505; }
.mondial-team-name { position: relative; z-index: 1; max-width: 90%; color: var(--mondial-ink); font-size: 26px; font-weight: 950; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mondial-match-scorehub { min-width: 0; display: grid; gap: 14px; justify-items: center; }
.mondial-match-date { min-width: 172px; padding: 9px 18px; border: 5px solid #050505; border-radius: 999px; color: #050505; background: var(--mondial-a3); font-size: 18px; font-weight: 950; text-align: center; box-shadow: 6px 6px 0 var(--mondial-a4); }
.mondial-match-vs { width: 230px; height: 112px; display: grid; place-items: center; border: 6px solid #050505; color: #050505; background: var(--mondial-paper); font-size: 58px; font-weight: 950; line-height: 1; box-shadow: 10px 9px 0 var(--mondial-a2); }
.mondial-match-score { width: 270px; min-height: 142px; display: grid; grid-template-columns: 1fr 36px 1fr; align-items: center; justify-items: center; border: 7px solid #050505; color: #050505; background: var(--mondial-paper); font-size: 86px; font-weight: 950; line-height: .9; box-shadow: 10px 10px 0 var(--mondial-a1), 18px 17px 0 var(--mondial-a3); }
.mondial-match-score small { font-size: 46px; }
.mondial-match-label { padding: 8px 15px; border-radius: 999px; background: #050505; color: var(--mondial-a3); font-size: 15px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
.mondial-match-live-pill { display: inline-flex; align-items: center; gap: 8px; padding: 7px 13px; border: 4px solid #050505; border-radius: 999px; color: #fff; background: #e60023; box-shadow: 6px 6px 0 var(--mondial-a2); font-size: 15px; font-weight: 950; line-height: 1; }
.mondial-match-live-pill i, .mondial-story-live-pill i { width: 8px; height: 8px; border-radius: 999px; background: #fff; box-shadow: 0 0 0 0 rgba(255,255,255,.9); animation: mondialLivePulse 1.08s ease-in-out infinite; }
.mondial-match-live-pill b, .mondial-story-live-pill b { font: inherit; font-variant-numeric: tabular-nums; }
.mondial-match-meta { height: 100%; min-width: 0; display: flex; align-items: center; justify-content: space-between; color: var(--mondial-muted); font-size: 12px; font-weight: 900; text-transform: uppercase; }
.mondial-match-rail { width: 48%; height: 8px; display: flex; direction: ltr; }
.mondial-match-rail span { flex: 1; }
@keyframes mondialLivePulse { 0%, 100% { transform: scale(.76); box-shadow: 0 0 0 0 rgba(255,255,255,.78); } 50% { transform: scale(1.12); box-shadow: 0 0 0 7px rgba(255,255,255,0); } }
.mondial-style-stadium .mondial-side-team { border-color: #050505; background: var(--team-color); }
.mondial-style-stadium .mondial-team-name { color: #050505; background: var(--mondial-paper); padding: 7px 18px; border-radius: 999px; }
.mondial-style-stadium .mondial-match-title { font-family: Impact, 'Arial Narrow', sans-serif; }
.mondial-style-signal { background: var(--mondial-paper); color: #050505; }
.mondial-style-signal .mondial-match-title, .mondial-style-signal .mondial-match-kicker { color: #050505; font-family: 'Courier New', monospace; }
.mondial-style-signal .mondial-side-team { border-color: #050505; box-shadow: 9px 9px 0 var(--team-color); background: #fff; }
.mondial-style-signal .mondial-team-short { color: #050505; text-shadow: 4px 0 0 var(--team-color); font-family: 'Courier New', monospace; }
.mondial-style-signal .mondial-team-name { color: #050505; }
.mondial-style-signal .mondial-match-meta { color: #050505; }
.mondial-look-scoreboard_red .mondial-match-center { grid-template-columns: 1fr 370px 1fr; gap: 34px; }
.mondial-look-scoreboard_red .mondial-match-score { width: 330px; min-height: 172px; border-radius: 30px; font-size: 108px; }
.mondial-look-scoreboard_red .mondial-match-label { background: var(--mondial-a1); color: #fff; border: 4px solid #050505; box-shadow: 6px 6px 0 var(--mondial-a3); }
.mondial-look-stadium_lights.mondial-match-shell { padding: 42px 54px; }
.mondial-look-stadium_lights .mondial-side-team { border-radius: 30px; background: color-mix(in srgb, var(--team-color) 34%, #050505); }
.mondial-look-stadium_lights .mondial-side-team::before { opacity: .9; filter: blur(.2px); }
.mondial-look-mega_pack_black .mondial-side-team { border-radius: 28px 8px 28px 8px; }
.mondial-look-mega_pack_black .mondial-team-short { font-size: 96px; }
.mondial-look-poster_social .mondial-match-center { grid-template-columns: 1fr 250px 1fr; }
.mondial-look-poster_social .mondial-side-team { min-height: 74%; transform: rotate(-1deg); }
.mondial-look-poster_social .mondial-side-team:last-child { transform: rotate(1deg); }

.mondial-story-shell { padding: 18px; display: grid; place-items: center; background: var(--mondial-bg); }
.mondial-story-card { position: relative; width: min(54vh, 44%); max-width: 430px; min-width: 310px; aspect-ratio: 9 / 16; overflow: hidden; border: 7px solid #050505; background: var(--mondial-bg); box-shadow: 16px 14px 0 var(--mondial-a1), 28px 25px 0 var(--mondial-a2); }
.mondial-story-card::before { content: ''; position: absolute; inset: 0; opacity: .84; background: radial-gradient(circle at 18% 12%, var(--mondial-a3), transparent 28%), radial-gradient(circle at 90% 18%, var(--mondial-a4), transparent 30%), linear-gradient(155deg, var(--mondial-a1) 0 25%, transparent 25% 58%, var(--mondial-a2) 58% 75%, transparent 75% 100%); }
.mondial-story-content { position: relative; z-index: 1; height: 100%; padding: 24px; display: grid; grid-template-rows: auto 1fr auto; color: var(--mondial-paper); }
.mondial-story-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.mondial-story-status { display: grid; justify-items: end; gap: 8px; }
.mondial-story-date { padding: 8px 13px; border-radius: 999px; background: var(--mondial-a3); color: #050505; font-size: 13px; font-weight: 950; }
.mondial-story-live-pill { display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px; border: 3px solid #050505; border-radius: 999px; color: #fff; background: #e60023; box-shadow: 5px 5px 0 var(--mondial-a2); font-size: 12px; font-weight: 950; line-height: 1; }
.mondial-story-main { align-self: center; display: grid; gap: 14px; padding-bottom: 46px; }
.mondial-story-team { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; direction: ltr; }
.mondial-story-team .mondial-flag { flex: 0 0 auto; width: 52px; height: 36px; border-width: 2px; }
.mondial-story-team b { min-width: 0; max-width: 232px; font-size: clamp(42px, 9vh, 58px); line-height: .82; font-weight: 950; text-shadow: 6px 4px 0 #050505; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mondial-story-score { display: grid; grid-template-columns: 1fr 26px 1fr; align-items: center; justify-items: center; color: #050505; background: var(--mondial-paper); border: 5px solid #050505; box-shadow: 8px 8px 0 var(--mondial-a3); font-size: 74px; font-weight: 950; line-height: .86; padding: 13px 8px; }
.mondial-story-foot { display: grid; gap: 9px; color: var(--mondial-paper); font-size: 13px; font-weight: 950; text-transform: uppercase; }
.mondial-story-foot span:last-child { color: var(--mondial-a3); }
.mondial-look-poster_social.mondial-story-shell { padding: 0; background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--mondial-a1) 20%, transparent), transparent 48%), var(--mondial-bg); }
.mondial-look-poster_social .mondial-story-card { width: min(68vh, 54%); max-width: 520px; min-width: 360px; border-width: 9px; border-radius: 0; transform: rotate(-1.6deg); box-shadow: 22px 19px 0 var(--mondial-a3), 42px 36px 0 var(--mondial-a1), -22px -18px 0 var(--mondial-a2); }
.mondial-look-poster_social .mondial-story-card::before { opacity: .95; background: linear-gradient(150deg, var(--mondial-a1) 0 22%, transparent 22% 54%, var(--mondial-a2) 54% 70%, var(--mondial-a3) 70% 82%, transparent 82% 100%); }
.mondial-look-poster_social .mondial-story-content { padding: 30px; }
.mondial-look-poster_social .mondial-story-team b { font-size: clamp(54px, 10vh, 76px); }
.mondial-look-poster_social .mondial-story-score { border-width: 7px; font-size: 88px; box-shadow: 11px 10px 0 var(--mondial-a4); }
.mondial-look-flag_identity .mondial-story-card { border-radius: 6px; }
`;

const ACCENTS = ['#0ce8cf', '#b6ff00', '#ff8a18', '#2868ff', '#ff2f9f', '#ff1738'];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asString = (value: unknown, fallback = ''): string =>
  value === undefined || value === null || value === '' ? fallback : String(value);

const asNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const compactShortName = (value: string, name: string): string => {
  const raw = value.trim();
  if (raw && raw.length <= 4) return raw.toUpperCase();
  const latin = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  return latin || name.slice(0, 3).toUpperCase();
};

const teamFrom = (value: unknown, fallbackId: string): WorldCupTeam | null => {
  const source = asRecord(value);
  if (!source) return null;
  const name = asString(source.name ?? source.nameAr ?? source.teamName, '');
  if (!name) return null;
  const shortName = compactShortName(asString(source.shortName ?? source.short ?? source.code, ''), name);
  const countryCode = asString(source.countryCode ?? source.isoCode ?? source.code ?? shortName, '').toLowerCase();
  const flagUrl = asString(source.flagUrl, countryCode ? `https://flagcdn.com/${countryCode}.svg` : '');
  return {
    id: (source.id as string | number | undefined) ?? fallbackId,
    name,
    shortName,
    countryCode,
    flagUrl,
    logoUrl: asString(source.logoUrl ?? source.logo, '') || undefined,
  };
};

const normalizeFixture = (value: unknown, index: number): MatchLike | null => {
  const source = asRecord(value);
  if (!source) return null;
  return {
    id: (source.id as string | number | undefined) ?? `fixture-${index + 1}`,
    home: teamFrom(source.home ?? source.homeTeam, `fixture-${index + 1}-home`),
    away: teamFrom(source.away ?? source.awayTeam, `fixture-${index + 1}-away`),
    homeScore: asNumber(source.homeScore),
    awayScore: asNumber(source.awayScore),
    homePenaltyScore: asNumber(source.homePenaltyScore),
    awayPenaltyScore: asNumber(source.awayPenaltyScore),
    winnerId: source.winnerId as string | number | undefined,
    status: asString(source.status, 'scheduled') as MatchLike['status'],
    statusLabel: asString(source.statusLabel, ''),
    minute: source.minute as string | number | undefined,
    liveMinute: source.liveMinute as string | number | undefined,
    currentMinute: source.currentMinute as string | number | undefined,
    date: asString(source.date, ''),
    group: asString(source.group, ''),
    stage: asString(source.stage, ''),
    venue: asString(source.venue, ''),
    homePlaceholder: asString(source.homePlaceholder, '') || undefined,
    awayPlaceholder: asString(source.awayPlaceholder, '') || undefined,
  };
};

const DEMO_MATCHES: MatchLike[] = [
  {
    id: 'demo-announcement',
    home: { id: 'mar', name: 'Morocco', shortName: 'MAR', countryCode: 'ma', flagUrl: 'https://flagcdn.com/ma.svg' },
    away: { id: 'bra', name: 'Brazil', shortName: 'BRA', countryCode: 'br', flagUrl: 'https://flagcdn.com/br.svg' },
    status: 'scheduled',
    date: '2026-06-13T20:00:00.000Z',
    venue: 'REO Stadium',
    group: 'Group C',
  },
  {
    id: 'demo-full-time',
    home: { id: 'usa', name: 'USA', shortName: 'USA', countryCode: 'us', flagUrl: 'https://flagcdn.com/us.svg' },
    away: { id: 'par', name: 'Paraguay', shortName: 'PAR', countryCode: 'py', flagUrl: 'https://flagcdn.com/py.svg' },
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    statusLabel: 'Full-time',
    date: '2026-06-13T20:00:00.000Z',
    venue: 'REO Stadium',
    group: 'Group D',
  },
];

const normalizeFixtures = (input: unknown): MatchLike[] => {
  const parsed = typeof input === 'string'
    ? (() => {
        try { return JSON.parse(input) as unknown; } catch { return null; }
      })()
    : input;
  const parsedRecord = asRecord(parsed);
  const source: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsedRecord && Array.isArray(parsedRecord.fixtures)
      ? parsedRecord.fixtures
      : [];
  const fixtures = source
    .map((item, index) => normalizeFixture(item, index))
    .filter((item): item is MatchLike => Boolean(item));
  return fixtures.length ? fixtures : DEMO_MATCHES;
};

const fixturesFrom = (liveData: Record<string, unknown> | null | undefined, getField: MondialBroadcastProps['getField']) => {
  const fixtures = fixturesFromWorldCupData(
    liveData,
    selectPayload(liveData, getField('fixturesJson'), ['fixtures', 'matches'])
  );
  return fixtures.length ? fixtures as MatchLike[] : DEMO_MATCHES;
};

const dateLabel = (match: MatchLike): string => {
  if (!match.date) return 'DATE TBC';
  const date = new Date(match.date);
  if (Number.isNaN(date.getTime())) return String(match.date);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).toUpperCase();
};

const minuteText = (value: unknown): string => {
  const raw = typeof value === 'number'
    ? String(value)
    : typeof value === 'string'
      ? value.replace(/[’′]/g, "'").trim()
      : '';
  const match = raw.match(/(\d{1,3}(?:\+\d{1,2})?)/);
  return match?.[1] || '';
};

const liveMinuteText = (match: MatchLike): string =>
  minuteText(match.minute ?? match.liveMinute ?? match.currentMinute ?? match.statusLabel);

const isLiveFixture = (match: MatchLike): boolean => {
  const status = `${match.status || ''} ${match.statusLabel || ''}`.toLowerCase();
  return status.includes('live') || status.includes('مباشر') || match.status === 'live' || Boolean(match.minute || match.liveMinute || match.currentMinute);
};

const liveBadgeText = (match: MatchLike): string => {
  const minute = liveMinuteText(match);
  return minute ? `${minute}'` : '';
};

const pickMatch = (
  fixtures: MatchLike[],
  getField: MondialBroadcastProps['getField'],
  fallbackMode: string
): MatchLike => pickWorldCupMatch(fixtures, {
  mode: String(getField('matchPickMode') || fallbackMode),
  featuredMatchIndex: getField('featuredMatchIndex'),
  selectedMatchId: getField('selectedMatchId'),
  teamCode: getField('matchTeamCode'),
  groupCode: getField('matchGroupCode'),
  roundStage: getField('matchRoundStage'),
  statusFilter: getField('matchStatusFilter'),
}) as MatchLike || fixtures[0] || DEMO_MATCHES[0];

const scoreText = (value: number | undefined) => value === undefined ? '-' : String(value);

const teamColor = (match: MatchLike, side: 'home' | 'away') => {
  const team = side === 'home' ? match.home : match.away;
  const seed = String(team?.shortName || side).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ACCENTS[seed % ACCENTS.length];
};

const TeamPanel: React.FC<{ match: MatchLike; side: 'home' | 'away' }> = ({ match, side }) => {
  const team = side === 'home' ? match.home : match.away;
  return (
    <article className="mondial-side-team" style={{ '--team-color': teamColor(match, side) } as React.CSSProperties}>
      <BroadcastFlag team={team} label={side.toUpperCase()} />
      <div className="mondial-team-short">{team?.shortName || (side === 'home' ? match.homePlaceholder : match.awayPlaceholder) || 'TBD'}</div>
      <div className="mondial-team-name">{team?.name || 'To be decided'}</div>
    </article>
  );
};

const MatchShell: React.FC<{
  getField: MondialBroadcastProps['getField'];
  liveData?: Record<string, unknown> | null;
  mode: 'announcement' | 'full-time';
}> = ({ getField, liveData, mode }) => {
  const lookId = getBroadcastLook(getField);
  const styleId = getBroadcastStyle(getField);
  const paletteId = getBroadcastPalette(getField);
  const fixtures = fixturesFrom(liveData, getField);
  const match = pickMatch(fixtures, getField, mode === 'full-time' ? 'latest' : 'next');
  const title = asString(getField(mode === 'full-time' ? 'fullTimeTitle' : 'matchCardTitle'), mode === 'full-time' ? 'FULL-TIME' : 'MATCH DAY');
  const subtitle = asString(getField('matchCardSubtitle'), match.group || match.stage || 'WORLD CUP 2026');
  const isLive = isLiveFixture(match);
  const minute = liveBadgeText(match);
  const status = mode === 'full-time'
    ? 'FULL-TIME'
    : isLive
      ? `مباشر${minute ? ` ${minute}` : ''}`
      : asString(match.statusLabel || match.status, 'NEXT MATCH').toUpperCase();

  return (
    <section
      className={`mondial-broadcast mondial-match-shell mondial-style-${styleId} mondial-look-${lookId} mondial-phase-in`}
      style={getBroadcastCssVars(paletteId)}
      data-template={mode}
    >
      <style>{MONDIAL_BROADCAST_CSS}{MATCH_CSS}</style>
      <div className="mondial-chroma-trail" aria-hidden="true" />
      <header className="mondial-match-top mondial-phase-hold">
        <div>
          <div className="mondial-match-kicker">{subtitle}</div>
          <h2 className="mondial-match-title">{title}</h2>
        </div>
        <ReoShowLockup compact />
      </header>
      <main className="mondial-match-center">
        <TeamPanel match={match} side="home" />
        <div className="mondial-match-scorehub">
          <div className="mondial-match-date">{dateLabel(match)}</div>
          {isLive && (
            <div className="mondial-match-live-pill" aria-label={`Live match${minute ? ` ${minute}` : ''}`}>
              <i aria-hidden="true" />
              <span>مباشر</span>
              {minute ? <b>{minute}</b> : null}
            </div>
          )}
          {mode === 'full-time' ? (
            <div className="mondial-match-score" aria-label="score">
              <span>{scoreText(match.homeScore)}</span>
              <small>:</small>
              <span>{scoreText(match.awayScore)}</span>
            </div>
          ) : (
            <div className="mondial-match-vs">VS</div>
          )}
          <div className="mondial-match-label">{status}</div>
        </div>
        <TeamPanel match={match} side="away" />
      </main>
      <footer className="mondial-match-meta">
        <span>{match.venue || 'Venue TBC'}</span>
        <div className="mondial-match-rail" aria-hidden="true">
          {ACCENTS.map(color => <span key={color} style={{ background: color }} />)}
        </div>
        <span>REO SHOW - WORLD CUP 2026</span>
      </footer>
    </section>
  );
};

export const MondialMatchAnnouncement: React.FC<MondialBroadcastProps> = props => (
  <MatchShell {...props} mode="announcement" />
);

export const MondialFullTime: React.FC<MondialBroadcastProps> = props => (
  <MatchShell {...props} mode="full-time" />
);

export const MondialSocialStory: React.FC<MondialBroadcastProps> = ({ getField, liveData }) => {
  const lookId = getBroadcastLook(getField);
  const styleId = getBroadcastStyle(getField);
  const paletteId = getBroadcastPalette(getField);
  const fixtures = fixturesFrom(liveData, getField);
  const match = pickMatch(fixtures, getField, 'next');
  const title = asString(getField('storyTitle'), match.status === 'finished' ? 'FULL-TIME' : 'MATCH DAY');
  const scoreMode = match.homeScore !== undefined || match.awayScore !== undefined;
  const isLive = isLiveFixture(match);
  const minute = liveBadgeText(match);

  return (
    <section
      className={`mondial-broadcast mondial-story-shell mondial-style-${styleId} mondial-look-${lookId} mondial-phase-in`}
      style={getBroadcastCssVars(paletteId)}
      data-template="social_story"
    >
      <style>{MONDIAL_BROADCAST_CSS}{MATCH_CSS}</style>
      <div className="mondial-story-card">
        <div className="mondial-story-content">
          <header className="mondial-story-head">
            <ReoShowLockup compact />
            <div className="mondial-story-status">
              <span className="mondial-story-date">{dateLabel(match)}</span>
              {isLive && (
                <span className="mondial-story-live-pill">
                  <i aria-hidden="true" />
                  <span>مباشر</span>
                  {minute ? <b>{minute}</b> : null}
                </span>
              )}
            </div>
          </header>
          <main className="mondial-story-main">
            <div className="mondial-story-team">
              <BroadcastFlag team={match.home} label="HOME" />
              <b>{match.home?.shortName || match.homePlaceholder || 'TBD'}</b>
            </div>
            {scoreMode ? (
              <div className="mondial-story-score">
                <span>{scoreText(match.homeScore)}</span>
                <small>:</small>
                <span>{scoreText(match.awayScore)}</span>
              </div>
            ) : null}
            <div className="mondial-story-team">
              <BroadcastFlag team={match.away} label="AWAY" />
              <b>{match.away?.shortName || match.awayPlaceholder || 'TBD'}</b>
            </div>
          </main>
          <footer className="mondial-story-foot">
            <span>{title}</span>
            <span>{match.group || match.stage || 'WORLD CUP 2026'} - REO SHOW</span>
          </footer>
        </div>
      </div>
    </section>
  );
};

export default MondialMatchAnnouncement;
