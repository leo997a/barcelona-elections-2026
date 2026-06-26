import React from 'react';
import {
  BroadcastFlag,
  getBroadcastCssVars,
  getBroadcastLook,
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

const GROUP_WALL_CSS = `
.mondial-group-shell { padding: 34px 40px 24px; display: flex; flex-direction: column; gap: 18px; }
.mondial-group-header { min-height: 82px; display: flex; align-items: center; justify-content: space-between; gap: 30px; direction: rtl; }
.mondial-group-heading { min-width: 0; text-align: right; }
.mondial-group-kicker { color: var(--mondial-a3); font-size: 15px; line-height: 1; font-weight: 950; text-transform: uppercase; letter-spacing: .18em; }
.mondial-group-title { margin-top: 8px; color: var(--mondial-ink); font-size: 42px; line-height: .95; font-weight: 950; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mondial-group-meta { display: flex; align-items: center; gap: 12px; direction: ltr; }
.mondial-group-meta-pill { padding: 9px 15px; border: 3px solid var(--mondial-ink); border-radius: 999px; color: var(--mondial-bg); background: var(--mondial-a3); font-size: 13px; font-weight: 950; white-space: nowrap; }
.mondial-group-grid { flex: 1 1 auto; min-height: 0; display: grid; gap: 14px; direction: ltr; }
.mondial-group-card { position: relative; min-width: 0; min-height: 0; display: grid; grid-template-columns: 56px minmax(0,1fr); overflow: hidden; border: 4px solid var(--group-accent); border-radius: 8px; background: var(--mondial-panel); color: var(--mondial-ink); }
.mondial-group-code { display: flex; align-items: center; justify-content: center; padding: 7px; color: #050505; background: var(--group-accent); font-size: 21px; font-weight: 950; line-height: 1; writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; white-space: nowrap; }
.mondial-group-card-body { min-width: 0; min-height: 0; display: grid; grid-template-rows: repeat(4, minmax(0, 1fr)); padding: 8px 12px; }
.mondial-group-team { min-width: 0; display: grid; grid-template-columns: 28px minmax(0,1fr) 28px 28px; align-items: center; gap: 9px; border-bottom: 1px solid rgba(255,255,255,.14); direction: ltr; }
.mondial-group-team:last-child { border-bottom: 0; }
.mondial-team-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; font-weight: 900; letter-spacing: 0; }
.mondial-team-stat { text-align: center; font-size: 13px; font-weight: 900; color: var(--mondial-muted); }
.mondial-team-points { display: flex; align-items: center; justify-content: center; width: 27px; height: 25px; border-radius: 5px; background: var(--group-accent); color: #050505; font-size: 13px; font-weight: 950; }
.mondial-team-qualified::after { content: ''; position: absolute; right: 0; width: 5px; height: 28px; background: var(--mondial-a3); }
.mondial-group-footer { height: 27px; display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--mondial-muted); font-size: 12px; font-weight: 900; direction: rtl; }
.mondial-group-footer-rail { display: flex; width: 45%; height: 9px; direction: ltr; }
.mondial-group-footer-rail span { flex: 1; }
.mondial-layout-3x4 .mondial-group-grid { gap: 11px 16px; }
.mondial-layout-3x4 .mondial-group-card { grid-template-columns: 50px minmax(0,1fr); }
.mondial-layout-3x4 .mondial-group-card-body { padding: 5px 12px; }
.mondial-layout-3x4 .mondial-group-team { gap: 12px; }
.mondial-layout-3x4 .mondial-team-name { font-size: 15px; }

.mondial-style-stadium .mondial-group-shell { padding: 28px 34px 20px; gap: 14px; }
.mondial-style-stadium .mondial-group-header { min-height: 88px; border-bottom: 8px solid var(--mondial-a3); background: var(--mondial-paper); color: #050505; padding: 10px 18px; transform: skewX(-2deg); }
.mondial-style-stadium .mondial-group-header > * { transform: skewX(2deg); }
.mondial-style-stadium .mondial-group-title { color: #050505; font-family: Impact, 'Arial Narrow', sans-serif; text-transform: uppercase; }
.mondial-style-stadium .mondial-group-kicker { color: var(--mondial-a1); }
.mondial-style-stadium .mondial-group-card { grid-template-columns: minmax(0,1fr); grid-template-rows: 34px minmax(0,1fr); border-color: #050505; border-top: 8px solid var(--group-accent); background: var(--mondial-paper); color: #050505; box-shadow: 7px 7px 0 var(--group-accent); }
.mondial-style-stadium .mondial-group-code { justify-content: flex-start; padding: 4px 12px; color: #050505; background: transparent; font-size: 17px; writing-mode: horizontal-tb; transform: none; }
.mondial-style-stadium .mondial-group-card-body { padding: 0 10px 5px; }
.mondial-style-stadium .mondial-group-team { border-color: rgba(0,0,0,.18); }
.mondial-style-stadium .mondial-team-stat { color: #555; }
.mondial-style-stadium .mondial-team-points { border: 2px solid #050505; }

.mondial-style-signal { background: var(--mondial-paper); color: #050505; }
.mondial-style-signal .mondial-group-shell { padding: 27px 33px 22px; gap: 13px; }
.mondial-style-signal .mondial-group-header { min-height: 86px; padding: 0 18px; border: 5px solid #050505; background: var(--mondial-a1); color: #fff; box-shadow: 11px 9px 0 var(--mondial-a4); }
.mondial-style-signal .mondial-group-title, .mondial-style-signal .mondial-group-kicker { color: #fff; }
.mondial-style-signal .mondial-group-meta-pill { border-color: #050505; background: var(--mondial-a2); color: #050505; }
.mondial-style-signal .mondial-group-card { grid-template-columns: minmax(0,1fr); grid-template-rows: 34px minmax(0,1fr); overflow: visible; border: 4px solid #050505; background: #fff; color: #050505; box-shadow: 6px 6px 0 var(--group-accent); }
.mondial-style-signal .mondial-group-code { justify-content: space-between; padding: 4px 10px; color: #050505; background: var(--group-accent); font-family: 'Courier New', monospace; font-size: 16px; writing-mode: horizontal-tb; transform: none; }
.mondial-style-signal .mondial-group-code::after { content: '01 / 04'; font-size: 10px; letter-spacing: .12em; }
.mondial-style-signal .mondial-group-card-body { padding: 0 9px 4px; }
.mondial-style-signal .mondial-group-team { border-color: rgba(0,0,0,.18); }
.mondial-style-signal .mondial-team-name { font-family: 'Arial Narrow', sans-serif; text-transform: uppercase; }
.mondial-style-signal .mondial-team-stat { color: #555; font-family: 'Courier New', monospace; }
.mondial-style-signal .mondial-team-points { border: 2px solid #050505; }
.mondial-style-signal .mondial-group-footer { color: #050505; }
.mondial-look-mega_pack_black .mondial-group-header { min-height: 104px; align-items: flex-start; }
.mondial-look-mega_pack_black .mondial-group-title { font-size: 58px; line-height: .82; letter-spacing: 0; color: #fff; }
.mondial-look-mega_pack_black .mondial-group-grid { gap: 18px 22px; }
.mondial-look-mega_pack_black .mondial-group-card:nth-child(3n+1) { transform: translateY(-5px); }
.mondial-look-mega_pack_black .mondial-group-card:nth-child(3n+2) { transform: translateY(4px); }
.mondial-look-mega_pack_black .mondial-group-code { font-size: 24px; }
.mondial-look-flag_identity .mondial-group-card { border-radius: 18px 18px 22px 6px; background: var(--mondial-paper); color: #050505; }
.mondial-look-flag_identity .mondial-group-team { border-color: rgba(0,0,0,.18); }
.mondial-look-flag_identity .mondial-team-stat { color: #555; }
.mondial-look-flag_identity .mondial-group-code { color: #050505; background: var(--group-accent); }
.mondial-look-stadium_lights .mondial-group-header { padding: 12px 18px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.56); box-shadow: 0 0 38px color-mix(in srgb, var(--mondial-a1) 30%, transparent); }
.mondial-look-stadium_lights .mondial-group-card { background: rgba(4, 12, 26, .78); backdrop-filter: blur(3px); }
.mondial-look-poster_social .mondial-group-card { transform: rotate(-.35deg); }
.mondial-look-poster_social .mondial-group-card:nth-child(even) { transform: rotate(.35deg); }
`;

const fieldText = (getField: MondialBroadcastProps['getField'], id: string, fallback: string): string => {
  const value = getField(id);
  return value === undefined || value === null || value === '' ? fallback : String(value);
};

const fieldBoolean = (getField: MondialBroadcastProps['getField'], id: string, fallback: boolean): boolean => {
  const value = getField(id);
  return typeof value === 'boolean' ? value : fallback;
};

const TeamRow: React.FC<{
  team: WorldCupGroupTeam;
  showStats: boolean;
}> = ({ team, showStats }) => (
  <div className={`mondial-group-team ${team.qualified ? 'mondial-team-qualified' : ''}`}>
    <BroadcastFlag team={team} compact />
    <span className="mondial-team-name" title={team.name}>{team.name}</span>
    {showStats ? <span className="mondial-team-stat" title="Played">{team.played}</span> : <span />}
    <span className="mondial-team-points" title="Points">{team.points}</span>
  </div>
);

const GroupCard: React.FC<{
  group: WorldCupGroup;
  index: number;
  showStats: boolean;
}> = ({ group, index, showStats }) => (
  <article
    className="mondial-group-card mondial-phase-out-anchor"
    style={{
      '--group-accent': GROUP_ACCENTS[index % GROUP_ACCENTS.length],
      animationDelay: `${.08 + index * .045}s`,
    } as React.CSSProperties}
    aria-label={group.name}
  >
    <div className="mondial-group-code">GROUP {group.code}</div>
    <div className="mondial-group-card-body">
      {group.teams.slice(0, 4).map(team => (
        <TeamRow key={team.id} team={team} showStats={showStats} />
      ))}
    </div>
  </article>
);

export const MondialGroupWall: React.FC<MondialBroadcastProps> = ({ getField, liveData }) => {
  const lookId = getBroadcastLook(getField);
  const styleId = getBroadcastStyle(getField);
  const paletteId = getBroadcastPalette(getField);
  const layout = String(getField('groupWallLayout') || '4x3') === '3x4' ? '3x4' : '4x3';
  const columns = layout === '3x4' ? 3 : 4;
  const payload = selectPayload(liveData, getField('groupsJson'), ['groups', 'worldCupGroups']);
  const groups = normalizeGroups(payload).slice(0, 12);
  const showStats = fieldBoolean(getField, 'showGroupStats', true);
  const title = fieldText(getField, 'groupWallTitle', 'مجموعات كأس العالم 2026');
  const subtitle = fieldText(getField, 'groupWallSubtitle', '48 TEAM · 12 GROUP · ONE WORLD');

  return (
    <section
      className={`mondial-broadcast mondial-group-shell mondial-style-${styleId} mondial-look-${lookId} mondial-layout-${layout} mondial-phase-in`}
      style={getBroadcastCssVars(paletteId)}
      data-template="group_wall"
      data-motion-phase="in-hold-out"
      aria-label={title}
    >
      <style>{MONDIAL_BROADCAST_CSS}{GROUP_WALL_CSS}</style>
      <div className="mondial-chroma-trail" aria-hidden="true" />
      <header className="mondial-group-header mondial-phase-hold">
        <div className="mondial-group-heading">
          <div className="mondial-group-kicker">{subtitle}</div>
          <h2 className="mondial-group-title">{title}</h2>
        </div>
        <div className="mondial-group-meta">
          <div className="mondial-group-meta-pill">{groups.length} GROUPS</div>
          <ReoShowLockup />
        </div>
      </header>

      <div className="mondial-group-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {groups.map((group, index) => (
          <GroupCard key={group.code} group={group} index={index} showStats={showStats} />
        ))}
      </div>

      <footer className="mondial-group-footer">
        <span>FIFA WORLD CUP 2026 · REO SHOW BROADCAST CENTER</span>
        <div className="mondial-group-footer-rail" aria-hidden="true">
          {GROUP_ACCENTS.slice(0, 8).map(color => <span key={color} style={{ background: color }} />)}
        </div>
        <span>{layout === '4x3' ? '4 × 3' : '3 × 4'} GRID</span>
      </footer>
    </section>
  );
};

export default MondialGroupWall;
