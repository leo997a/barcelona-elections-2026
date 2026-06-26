import React from 'react';
import {
  BroadcastFlag,
  DEMO_WORLD_CUP_ROUNDS,
  getBroadcastCssVars,
  getBroadcastLook,
  getBroadcastPalette,
  getBroadcastStyle,
  GROUP_ACCENTS,
  MondialBroadcastProps,
  MONDIAL_BROADCAST_CSS,
  normalizeRounds,
  ReoShowLockup,
  selectPayload,
  WorldCupMatch,
  WorldCupRound,
  WorldCupTeam,
} from './MondialBroadcastShared';

const KNOCKOUT_CSS = `
.mondial-bracket-shell { padding: 18px 22px 14px; display: flex; flex-direction: column; gap: 8px; }
.mondial-bracket-header { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 18px; direction: rtl; }
.mondial-bracket-heading { min-width: 0; text-align: right; }
.mondial-bracket-kicker { color: var(--mondial-a3); font-size: 10px; line-height: 1; font-weight: 950; letter-spacing: .18em; }
.mondial-bracket-title { margin-top: 5px; color: var(--mondial-ink); font-size: 28px; line-height: 1; font-weight: 950; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mondial-bracket-meta { display: flex; align-items: center; gap: 10px; direction: ltr; }
.mondial-bracket-status { display: flex; align-items: center; gap: 7px; padding: 6px 11px; border: 3px solid var(--mondial-ink); border-radius: 999px; background: var(--mondial-a3); color: #050505; font-size: 10px; font-weight: 950; }
.mondial-bracket-status::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--mondial-a1); }
.mondial-bracket-route { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 1.46fr 1.2fr 1.05fr .95fr 1.26fr .95fr 1.05fr 1.2fr 1.46fr; gap: 5px; direction: ltr; }
.mondial-bracket-column { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.mondial-stage-label { height: 22px; display: flex; align-items: center; justify-content: center; padding: 0 5px; border: 3px solid var(--mondial-stage-color); border-radius: 5px; color: var(--mondial-ink); background: var(--mondial-panel); font-size: 9px; font-weight: 950; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mondial-match-list { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: space-around; padding: 2px 0; }
.mondial-match-card { position: relative; min-width: 0; height: 56px; flex: 0 0 auto; overflow: hidden; border: 3px solid var(--mondial-stage-color); border-radius: 5px; background: var(--mondial-panel); color: var(--mondial-ink); }
.mondial-match-card::after { content: ''; position: absolute; z-index: -1; top: 50%; width: 9px; border-top: 2px solid var(--mondial-stage-color); }
.mondial-bracket-column[data-side='left'] .mondial-match-card::after { right: -10px; }
.mondial-bracket-column[data-side='right'] .mondial-match-card::after { left: -10px; }
.mondial-match-route-meta { height: 13px; min-width: 0; display: grid; grid-template-columns: 28px minmax(0,1fr); align-items: center; gap: 3px; padding: 0 4px; background: var(--mondial-stage-color); color: #050505; font-size: 7px; font-weight: 950; line-height: 1; letter-spacing: .03em; text-transform: uppercase; }
.mondial-match-route-meta span, .mondial-match-route-meta b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mondial-match-route-meta span { font-family: 'Courier New', monospace; }
.mondial-match-route-meta b { font-weight: 950; }
.mondial-match-teams { height: calc(100% - 13px); min-height: 0; }
.mondial-match-team { height: 50%; min-width: 0; display: grid; grid-template-columns: 19px minmax(0,1fr) 20px; align-items: center; gap: 4px; padding: 1px 4px; direction: ltr; }
.mondial-match-team + .mondial-match-team { border-top: 1px solid rgba(255,255,255,.15); }
.mondial-match-team.is-winner { background: color-mix(in srgb, var(--mondial-stage-color) 24%, transparent); }
.mondial-match-team-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 8px; font-weight: 900; }
.mondial-match-placeholder { color: var(--mondial-muted); font-family: 'Courier New', monospace; letter-spacing: .03em; }
.mondial-match-score { text-align: center; font-size: 11px; font-weight: 950; }
.mondial-center-column .mondial-stage-label { background: var(--mondial-a3); border-color: #050505; color: #050505; }
.mondial-center-column .mondial-match-card { height: 82px; border-width: 4px; border-color: #050505; background: var(--mondial-paper); color: #050505; box-shadow: 6px 5px 0 var(--mondial-a1), 11px 9px 0 var(--mondial-a2); }
.mondial-center-column .mondial-match-team { grid-template-columns: 23px minmax(0,1fr) 25px; padding: 3px 6px; }
.mondial-center-column .mondial-match-team + .mondial-match-team { border-color: rgba(0,0,0,.18); }
.mondial-center-column .mondial-match-team-name { font-size: 10px; }
.mondial-center-stack { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 38px; padding: 10px 2px; }
.mondial-final-block, .mondial-bronze-block { display: flex; flex-direction: column; gap: 8px; }
.mondial-final-trophy { height: 46px; display: flex; align-items: center; justify-content: center; color: var(--mondial-a3); font-size: 38px; font-weight: 950; line-height: 1; text-shadow: 5px 3px 0 var(--mondial-a1), 9px 6px 0 var(--mondial-a2); }
.mondial-bronze-block .mondial-stage-label { background: var(--mondial-a4); color: #050505; }
.mondial-bronze-block .mondial-match-card { height: 70px; border-width: 4px; box-shadow: 5px 5px 0 var(--mondial-a4); }
.mondial-bracket-footer { height: 18px; display: flex; align-items: center; justify-content: space-between; color: var(--mondial-muted); font-size: 9px; font-weight: 900; direction: rtl; }
.mondial-bracket-color-rail { width: 42%; height: 7px; display: flex; direction: ltr; }
.mondial-bracket-color-rail span { flex: 1; }

.mondial-style-stadium .mondial-bracket-header { min-height: 79px; padding: 8px 14px; border-left: 16px solid var(--mondial-a3); background: var(--mondial-paper); color: #050505; }
.mondial-style-stadium .mondial-bracket-title { color: #050505; font-family: Impact, 'Arial Narrow', sans-serif; text-transform: uppercase; }
.mondial-style-stadium .mondial-bracket-kicker { color: var(--mondial-a1); }
.mondial-style-stadium .mondial-stage-label { border-color: #050505; background: var(--mondial-stage-color); color: #050505; }
.mondial-style-stadium .mondial-match-card { border-color: #050505; border-left: 7px solid var(--mondial-stage-color); background: var(--mondial-paper); color: #050505; }
.mondial-style-stadium .mondial-match-team + .mondial-match-team { border-color: rgba(0,0,0,.18); }
.mondial-style-stadium .mondial-match-placeholder { color: #555; }
.mondial-style-stadium .mondial-match-card::after { border-color: #fff; }

.mondial-style-signal { background: var(--mondial-paper); color: #050505; }
.mondial-style-signal .mondial-bracket-header { min-height: 78px; padding: 7px 14px; border: 5px solid #050505; background: var(--mondial-a1); box-shadow: 10px 8px 0 var(--mondial-a4); }
.mondial-style-signal .mondial-bracket-title, .mondial-style-signal .mondial-bracket-kicker { color: #fff; font-family: 'Courier New', monospace; }
.mondial-style-signal .mondial-stage-label { border-color: #050505; background: var(--mondial-stage-color); color: #050505; border-radius: 0; font-family: 'Courier New', monospace; }
.mondial-style-signal .mondial-match-card { overflow: visible; border-color: #050505; border-radius: 0; background: #fff; color: #050505; box-shadow: 4px 4px 0 var(--mondial-stage-color); }
.mondial-style-signal .mondial-match-team + .mondial-match-team { border-color: rgba(0,0,0,.22); }
.mondial-style-signal .mondial-match-team-name, .mondial-style-signal .mondial-match-score { font-family: 'Courier New', monospace; }
.mondial-style-signal .mondial-match-placeholder { color: #555; }
.mondial-style-signal .mondial-bracket-footer { color: #050505; }
.mondial-look-mega_pack_black.mondial-bracket-shell { padding: 22px 28px 16px; }
.mondial-look-mega_pack_black .mondial-bracket-header { min-height: 82px; align-items: flex-start; }
.mondial-look-mega_pack_black .mondial-bracket-title { font-size: 42px; line-height: .84; }
.mondial-look-mega_pack_black .mondial-bracket-route { gap: 8px; }
.mondial-look-mega_pack_black .mondial-match-card { border-radius: 14px; }
.mondial-look-scoreboard_red .mondial-center-column .mondial-match-card { height: 96px; border-radius: 16px; }
.mondial-look-scoreboard_red .mondial-final-trophy { height: 58px; font-size: 48px; color: var(--mondial-a3); }
.mondial-look-flag_identity .mondial-stage-label { border-radius: 0 12px 0 12px; }
.mondial-look-flag_identity .mondial-match-card { border-radius: 3px 12px 3px 12px; }
.mondial-look-stadium_lights .mondial-bracket-header { padding: 10px 16px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.52); box-shadow: 0 0 38px color-mix(in srgb, var(--mondial-a1) 30%, transparent); }
.mondial-look-stadium_lights .mondial-match-card { background: rgba(4, 12, 26, .78); }
`;

type Stage = WorldCupRound['stage'];

const STAGE_META: Record<Exclude<Stage, 'BRONZE'>, { label: string; color: string }> = {
  R32: { label: 'دور الـ32', color: '#0ce8cf' },
  R16: { label: 'دور الـ16', color: '#b6ff00' },
  QF: { label: 'ربع النهائي', color: '#ff8a18' },
  SF: { label: 'نصف النهائي', color: '#ff2f9f' },
  F: { label: 'النهائي', color: '#f5ff00' },
};

const expectedCount: Record<Stage, number> = { R32: 16, R16: 8, QF: 4, SF: 2, F: 1, BRONZE: 1 };

const VISUAL_STAGE_ORDER: Partial<Record<Stage, number[]>> = {
  R32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  R16: [89, 90, 93, 94, 91, 92, 95, 96],
  QF: [97, 98, 99, 100],
  SF: [101, 102],
};

const splitStage = (matches: WorldCupMatch[]): [WorldCupMatch[], WorldCupMatch[]] => {
  const midpoint = Math.ceil(matches.length / 2);
  return [matches.slice(0, midpoint), matches.slice(midpoint)];
};

const mergeMatchMetadata = (match: WorldCupMatch | undefined, fallback: WorldCupMatch | undefined): WorldCupMatch => {
  if (!match) return fallback as WorldCupMatch;
  if (!fallback) return match;
  return {
    ...fallback,
    ...match,
    home: match.home ?? fallback.home,
    away: match.away ?? fallback.away,
    homePlaceholder: match.homePlaceholder ?? fallback.homePlaceholder,
    awayPlaceholder: match.awayPlaceholder ?? fallback.awayPlaceholder,
    matchNo: match.matchNo ?? fallback.matchNo,
    routeLabel: match.routeLabel ?? fallback.routeLabel,
    venueLabel: match.venueLabel ?? fallback.venueLabel,
    kickoffLabel: match.kickoffLabel ?? fallback.kickoffLabel,
  };
};

const orderMatchesForBracket = (matches: WorldCupMatch[], stage: Stage): WorldCupMatch[] => {
  const order = VISUAL_STAGE_ORDER[stage];
  if (!order) return matches;
  const byMatchNo = new Map(matches.filter(match => match.matchNo).map(match => [match.matchNo, match]));
  const ordered = order.map(matchNo => byMatchNo.get(matchNo)).filter((match): match is WorldCupMatch => Boolean(match));
  const orderedIds = new Set(ordered.map(match => match.id));
  return [...ordered, ...matches.filter(match => !orderedIds.has(match.id))];
};

const roundMatches = (rounds: WorldCupRound[], stage: Stage): WorldCupMatch[] => {
  const live = rounds.find(round => round.stage === stage)?.matches || [];
  const fallback = DEMO_WORLD_CUP_ROUNDS.find(round => round.stage === stage)?.matches || [];
  const matches = Array.from({ length: expectedCount[stage] }, (_, index) => mergeMatchMetadata(live[index], fallback[index]));
  return orderMatchesForBracket(matches, stage);
};

const isWinner = (match: WorldCupMatch, team: WorldCupTeam | null): boolean =>
  Boolean(team && match.winnerId !== undefined && String(match.winnerId) === String(team.id));

const scoreLabel = (score: number | undefined): string => score === undefined ? '–' : String(score);

const MatchTeam: React.FC<{
  match: WorldCupMatch;
  team: WorldCupTeam | null;
  placeholder?: string;
  score?: number;
}> = ({ match, team, placeholder, score }) => {
  const name = team?.name || placeholder || 'TBD';
  return (
    <div className={`mondial-match-team ${isWinner(match, team) ? 'is-winner' : ''}`}>
      <BroadcastFlag team={team} label={placeholder} compact />
      <span className={`mondial-match-team-name ${team ? '' : 'mondial-match-placeholder'}`} title={name}>{name}</span>
      <span className="mondial-match-score">{scoreLabel(score)}</span>
    </div>
  );
};

const MatchCard: React.FC<{ match: WorldCupMatch }> = ({ match }) => {
  const matchLabel = match.matchNo ? `M${match.matchNo}` : String(match.id);
  const routeLabel = match.routeLabel || [match.homePlaceholder, match.awayPlaceholder].filter(Boolean).join(' vs ');
  const routeTitle = [routeLabel, match.kickoffLabel, match.venueLabel].filter(Boolean).join(' · ');
  return (
    <article className="mondial-match-card mondial-phase-out-anchor" aria-label={`Match ${matchLabel}`}>
      <div className="mondial-match-route-meta" title={routeTitle || matchLabel}>
        <span>{matchLabel}</span>
        <b>{routeLabel || match.venueLabel || 'TBD'}</b>
      </div>
      <div className="mondial-match-teams">
        <MatchTeam match={match} team={match.home} placeholder={match.homePlaceholder} score={match.homeScore} />
        <MatchTeam match={match} team={match.away} placeholder={match.awayPlaceholder} score={match.awayScore} />
      </div>
    </article>
  );
};

const StageColumn: React.FC<{
  stage: Exclude<Stage, 'F' | 'BRONZE'>;
  matches: WorldCupMatch[];
  side: 'left' | 'right';
}> = ({ stage, matches, side }) => {
  const meta = STAGE_META[stage];
  return (
    <div
      className="mondial-bracket-column"
      data-side={side}
      style={{ '--mondial-stage-color': meta.color } as React.CSSProperties}
    >
      <div className="mondial-stage-label">{meta.label}</div>
      <div className="mondial-match-list">
        {matches.map(match => <MatchCard key={match.id} match={match} />)}
      </div>
    </div>
  );
};

const fieldText = (getField: MondialBroadcastProps['getField'], id: string, fallback: string): string => {
  const value = getField(id);
  return value === undefined || value === null || value === '' ? fallback : String(value);
};

export const MondialKnockoutBracket: React.FC<MondialBroadcastProps> = ({ getField, liveData }) => {
  const lookId = getBroadcastLook(getField);
  const styleId = getBroadcastStyle(getField);
  const paletteId = getBroadcastPalette(getField);
  const payload = selectPayload(liveData, getField('roundsJson'), ['rounds', 'worldCupRounds']);
  const rounds = normalizeRounds(payload);
  const title = fieldText(getField, 'bracketTitle', 'طريق نهائي كأس العالم 2026');
  const subtitle = fieldText(getField, 'bracketSubtitle', 'ROUND OF 32 · ROAD TO THE FINAL');
  const sourceStatus = String(liveData?.sourceStatus || liveData?.source || (liveData ? 'LIVE' : 'DEMO')).toUpperCase();

  const [r32Left, r32Right] = splitStage(roundMatches(rounds, 'R32'));
  const [r16Left, r16Right] = splitStage(roundMatches(rounds, 'R16'));
  const [qfLeft, qfRight] = splitStage(roundMatches(rounds, 'QF'));
  const [sfLeft, sfRight] = splitStage(roundMatches(rounds, 'SF'));
  const finalMatch = roundMatches(rounds, 'F')[0];
  const bronzeMatch = roundMatches(rounds, 'BRONZE')[0];

  return (
    <section
      className={`mondial-broadcast mondial-bracket-shell mondial-style-${styleId} mondial-look-${lookId} mondial-phase-in`}
      style={getBroadcastCssVars(paletteId)}
      data-template="knockout_bracket"
      data-motion-phase="in-hold-out"
      aria-label={title}
    >
      <style>{MONDIAL_BROADCAST_CSS}{KNOCKOUT_CSS}</style>
      <div className="mondial-chroma-trail" aria-hidden="true" />
      <header className="mondial-bracket-header mondial-phase-hold">
        <div className="mondial-bracket-heading">
          <div className="mondial-bracket-kicker">{subtitle}</div>
          <h2 className="mondial-bracket-title">{title}</h2>
        </div>
        <div className="mondial-bracket-meta">
          <div className="mondial-bracket-status">{sourceStatus}</div>
          <ReoShowLockup compact />
        </div>
      </header>

      <div className="mondial-bracket-route">
        <StageColumn stage="R32" matches={r32Left} side="left" />
        <StageColumn stage="R16" matches={r16Left} side="left" />
        <StageColumn stage="QF" matches={qfLeft} side="left" />
        <StageColumn stage="SF" matches={sfLeft} side="left" />

        <div
          className="mondial-bracket-column mondial-center-column"
          style={{ '--mondial-stage-color': STAGE_META.F.color } as React.CSSProperties}
        >
          <div className="mondial-center-stack">
            <div className="mondial-final-block">
              <div className="mondial-final-trophy" aria-hidden="true">WC26</div>
              <div className="mondial-stage-label">النهائي · FINAL</div>
              <MatchCard match={finalMatch} />
            </div>
            <div className="mondial-bronze-block">
              <div className="mondial-stage-label">المركز الثالث</div>
              <MatchCard match={bronzeMatch} />
            </div>
          </div>
        </div>

        <StageColumn stage="SF" matches={sfRight} side="right" />
        <StageColumn stage="QF" matches={qfRight} side="right" />
        <StageColumn stage="R16" matches={r16Right} side="right" />
        <StageColumn stage="R32" matches={r32Right} side="right" />
      </div>

      <footer className="mondial-bracket-footer">
        <span>32 MATCHES · 48 TEAMS · 1 CHAMPION</span>
        <div className="mondial-bracket-color-rail" aria-hidden="true">
          {GROUP_ACCENTS.slice(0, 8).map(color => <span key={color} style={{ background: color }} />)}
        </div>
        <span>REO SHOW · WORLD CUP 2026</span>
      </footer>
    </section>
  );
};

export default MondialKnockoutBracket;
