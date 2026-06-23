import React from 'react';
import {
  BroadcastFlag,
  getBroadcastCssVars,
  getBroadcastPalette,
  getBroadcastStyle,
  GROUP_ACCENTS,
  MondialBroadcastProps,
  MONDIAL_BROADCAST_CSS,
  normalizeGroups,
  ReoShowLockup,
  selectPayload,
  WorldCupGroup,
  WorldCupGroupTeam,
} from './MondialBroadcastShared';

const TEAM_IDENTITY_CSS = `
.mondial-identity-shell { padding: 38px 44px 30px; display: flex; flex-direction: column; gap: 22px; }
.mondial-identity-header { min-height: 102px; display: flex; align-items: center; justify-content: space-between; gap: 28px; direction: ltr; }
.mondial-identity-title-wrap { min-width: 0; }
.mondial-identity-kicker { color: var(--mondial-a3); font-size: 15px; font-weight: 950; letter-spacing: .2em; text-transform: uppercase; }
.mondial-identity-title { margin-top: 9px; color: var(--mondial-ink); font-size: 54px; line-height: .9; font-weight: 950; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 5px 0 0 var(--mondial-a1), -5px 0 0 var(--mondial-a4); }
.mondial-identity-meta { display: flex; align-items: center; gap: 12px; }
.mondial-identity-pill { padding: 10px 17px; border: 4px solid #050505; border-radius: 999px; color: #050505; background: var(--mondial-a3); font-size: 14px; font-weight: 950; text-transform: uppercase; box-shadow: 7px 6px 0 var(--mondial-a1); }
.mondial-identity-stage { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; border: 4px solid rgba(255,255,255,.13); border-radius: 12px; background: rgba(0,0,0,.2); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); }
.mondial-identity-sweep { position: absolute; inset: -12%; pointer-events: none; background: linear-gradient(112deg, transparent 0 18%, color-mix(in srgb, var(--mondial-a2) 72%, transparent) 18% 22%, transparent 22% 35%, color-mix(in srgb, var(--mondial-a4) 68%, transparent) 35% 39%, transparent 39% 100%); mix-blend-mode: screen; opacity: .7; animation: mondialIdentitySweep 4.6s cubic-bezier(.16,1,.3,1) infinite; }
.mondial-flag-wall { position: relative; z-index: 1; height: 100%; display: grid; gap: 13px 17px; padding: 26px 38px; direction: ltr; }
.mondial-flag-tile { min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 7px; border: 4px solid #050505; border-radius: 18px; color: #050505; background: var(--mondial-paper); box-shadow: 7px 7px 0 var(--team-accent), 14px 14px 0 color-mix(in srgb, var(--team-accent) 45%, #050505); animation: mondialIdentityTileIn .58s cubic-bezier(.16,1,.3,1) both; }
.mondial-flag-tile-name { min-width: 0; width: 100%; text-align: center; font-size: 20px; line-height: .86; font-weight: 950; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mondial-flag-tile-code { display: none; }
.mondial-flag-tile-group { display: inline-flex; width: fit-content; padding: 2px 7px; border-radius: 999px; color: #050505; background: var(--team-accent); font-size: 9px; line-height: 1; font-weight: 950; }
.mondial-code-wall { position: relative; z-index: 1; height: 100%; display: grid; gap: 24px; padding: 18px 52px; direction: ltr; }
.mondial-code-column { display: flex; flex-direction: column; justify-content: center; gap: 4px; min-width: 0; }
.mondial-code-item { position: relative; display: flex; align-items: center; gap: 12px; min-width: 0; animation: mondialIdentityTileIn .5s cubic-bezier(.16,1,.3,1) both; }
.mondial-code-text { position: relative; display: inline-block; color: var(--mondial-paper); font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif; font-size: 30px; line-height: .76; font-weight: 950; letter-spacing: .02em; text-transform: uppercase; text-shadow: -6px 0 0 var(--team-accent), 6px 0 0 var(--mondial-a4), 11px 0 0 var(--mondial-a1); filter: drop-shadow(0 6px 0 rgba(0,0,0,.62)); }
.mondial-code-group { flex: 0 0 auto; width: 24px; height: 20px; display: grid; place-items: center; border: 3px solid #050505; border-radius: 7px; color: #050505; background: var(--team-accent); font-size: 11px; font-weight: 950; box-shadow: 3px 3px 0 var(--mondial-a1); }
.mondial-identity-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--mondial-muted); font-size: 12px; font-weight: 950; letter-spacing: .04em; text-transform: uppercase; }
.mondial-identity-rail { display: flex; width: min(420px, 46%); height: 10px; direction: ltr; }
.mondial-identity-rail span { flex: 1; }

.mondial-style-score_red .mondial-identity-title { text-shadow: 6px 5px 0 var(--mondial-a3), 11px 10px 0 #050505; }
.mondial-style-score_red .mondial-identity-stage { border-color: #050505; background: color-mix(in srgb, var(--mondial-panel) 78%, #050505); box-shadow: 12px 12px 0 var(--mondial-a1); }
.mondial-style-clean_grid .mondial-identity-stage { background: var(--mondial-paper); border-color: #050505; box-shadow: none; }
.mondial-style-clean_grid .mondial-identity-title { color: #050505; text-shadow: none; }
.mondial-style-clean_grid .mondial-code-text { color: #050505; text-shadow: none; filter: none; }
.mondial-style-clean_grid .mondial-identity-kicker, .mondial-style-clean_grid .mondial-identity-footer { color: #303030; }

@keyframes mondialIdentityTileIn {
  from { opacity: 0; transform: translateY(22px) scale(.94); filter: blur(8px) saturate(1.6); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0) saturate(1); }
}
@keyframes mondialIdentitySweep {
  0% { transform: translateX(-115%) skewX(-14deg); opacity: 0; }
  12% { opacity: .75; }
  46% { opacity: .52; }
  100% { transform: translateX(115%) skewX(-14deg); opacity: 0; }
}
`;

const fieldText = (getField: MondialBroadcastProps['getField'], id: string, fallback: string): string => {
  const value = getField(id);
  return value === undefined || value === null || value === '' ? fallback : String(value);
};

const fieldNumber = (getField: MondialBroadcastProps['getField'], id: string, fallback: number): number => {
  const parsed = Number(getField(id));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const fieldBoolean = (getField: MondialBroadcastProps['getField'], id: string, fallback: boolean): boolean => {
  const value = getField(id);
  return typeof value === 'boolean' ? value : fallback;
};

const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const getGroups = (liveData: Record<string, unknown> | null | undefined, getField: MondialBroadcastProps['getField']): WorldCupGroup[] => {
  const payload = selectPayload(liveData, getField('groupsJson'), ['groups', 'worldCupGroups']);
  return normalizeGroups(payload).slice(0, 12);
};

const flattenTeams = (groups: WorldCupGroup[], limit: number): Array<WorldCupGroupTeam & { groupCode: string; globalIndex: number }> =>
  groups.flatMap((group, groupIndex) =>
    group.teams.slice(0, 4).map((team, teamIndex) => ({
      ...team,
      groupCode: group.code,
      globalIndex: groupIndex * 4 + teamIndex,
    }))
  ).slice(0, limit);

const chunk = <T,>(items: T[], columns: number): T[][] => {
  const perColumn = Math.ceil(items.length / columns);
  return Array.from({ length: columns }, (_, index) => items.slice(index * perColumn, (index + 1) * perColumn));
};

const IdentityFrame: React.FC<{
  getField: MondialBroadcastProps['getField'];
  teamsCount: number;
  modeLabel: string;
  children: React.ReactNode;
}> = ({ getField, teamsCount, modeLabel, children }) => {
  const styleId = getBroadcastStyle(getField);
  const paletteId = getBroadcastPalette(getField);
  const title = fieldText(getField, 'identityTitle', 'WORLD CUP 2026 TEAM IDENTITY');
  const subtitle = fieldText(getField, 'identitySubtitle', '48 NATIONAL TEAMS - REO SHOW');

  return (
    <section
      className={`mondial-broadcast mondial-identity-shell mondial-style-${styleId} mondial-phase-in`}
      style={getBroadcastCssVars(paletteId)}
      data-template={modeLabel}
      data-motion-phase="in-hold-out"
      aria-label={title}
    >
      <style>{MONDIAL_BROADCAST_CSS}{TEAM_IDENTITY_CSS}</style>
      <div className="mondial-chroma-trail" aria-hidden="true" />
      <header className="mondial-identity-header mondial-phase-hold">
        <div className="mondial-identity-title-wrap">
          <div className="mondial-identity-kicker">{subtitle}</div>
          <h2 className="mondial-identity-title">{title}</h2>
        </div>
        <div className="mondial-identity-meta">
          <div className="mondial-identity-pill">{teamsCount} TEAMS</div>
          <ReoShowLockup />
        </div>
      </header>

      <div className="mondial-identity-stage">
        <div className="mondial-identity-sweep" aria-hidden="true" />
        {children}
      </div>

      <footer className="mondial-identity-footer">
        <span>REO SHOW - WORLD CUP 2026 IDENTITY SYSTEM</span>
        <div className="mondial-identity-rail" aria-hidden="true">
          {GROUP_ACCENTS.slice(0, 8).map(color => <span key={color} style={{ background: color }} />)}
        </div>
        <span>{modeLabel.replace(/_/g, ' ')}</span>
      </footer>
    </section>
  );
};

export const MondialFlagIdentityWall: React.FC<MondialBroadcastProps> = ({ getField, liveData }) => {
  const groups = getGroups(liveData, getField);
  const limit = clampNumber(fieldNumber(getField, 'identityLimit', 48), 12, 48);
  const columns = clampNumber(fieldNumber(getField, 'identityColumns', 8), 4, 12);
  const showGroups = fieldBoolean(getField, 'showIdentityGroups', true);
  const teams = flattenTeams(groups, limit);

  return (
    <IdentityFrame getField={getField} teamsCount={teams.length} modeLabel="flag_wall">
      <div className="mondial-flag-wall" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {teams.map(team => {
          const accent = GROUP_ACCENTS[team.globalIndex % GROUP_ACCENTS.length];
          return (
            <article
              key={`${team.groupCode}-${team.id}`}
              className="mondial-flag-tile mondial-phase-out-anchor"
              style={{
                '--team-accent': accent,
                animationDelay: `${.06 + team.globalIndex * .018}s`,
              } as React.CSSProperties}
            >
              <BroadcastFlag team={team} />
              <div>
                <div className="mondial-flag-tile-name">{team.shortName}</div>
                <div className="mondial-flag-tile-code">{team.name}</div>
                {showGroups && <span className="mondial-flag-tile-group">GROUP {team.groupCode}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </IdentityFrame>
  );
};

export const MondialTeamCodeWall: React.FC<MondialBroadcastProps> = ({ getField, liveData }) => {
  const groups = getGroups(liveData, getField);
  const limit = clampNumber(fieldNumber(getField, 'identityLimit', 48), 12, 48);
  const columns = clampNumber(fieldNumber(getField, 'identityColumns', 4), 3, 6);
  const showGroups = fieldBoolean(getField, 'showIdentityGroups', true);
  const teams = flattenTeams(groups, limit);
  const columnsData = chunk(teams, columns);

  return (
    <IdentityFrame getField={getField} teamsCount={teams.length} modeLabel="team_code_wall">
      <div className="mondial-code-wall" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {columnsData.map((column, columnIndex) => (
          <div className="mondial-code-column" key={`code-column-${columnIndex}`}>
            {column.map(team => {
              const accent = GROUP_ACCENTS[team.globalIndex % GROUP_ACCENTS.length];
              return (
                <div
                  key={`${team.groupCode}-${team.id}`}
                  className="mondial-code-item mondial-phase-out-anchor"
                  style={{
                    '--team-accent': accent,
                    animationDelay: `${.05 + team.globalIndex * .016}s`,
                  } as React.CSSProperties}
                  title={team.name}
                >
                  {showGroups && <span className="mondial-code-group">{team.groupCode}</span>}
                  <span className="mondial-code-text">{team.shortName}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </IdentityFrame>
  );
};

export default MondialFlagIdentityWall;
