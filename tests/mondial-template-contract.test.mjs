import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const readSource = async relativePath =>
  fs.readFile(new URL(relativePath, import.meta.url), 'utf8');

const CORE_TEMPLATE_IDS = [
  'template-mondial-scoreboard-full',
  'template-mondial-scorebug',
  'template-mondial-var-alert',
  'template-mondial-match-preview',
  'template-mondial-lineup',
  'template-mondial-match-result',
  'template-mondial-match-stats',
  'template-mondial-pressure-index',
  'template-mondial-accuracy-control',
  'template-mondial-attack-shot-quality',
  'template-mondial-duels-discipline',
  'template-mondial-territory-control',
  'template-mondial-xg-shot-flow',
  'template-mondial-live-momentum',
  'template-mondial-group-wall',
  'template-mondial-all-flags-wall',
  'template-mondial-team-code-wall',
  'template-mondial-match-announcement',
  'template-mondial-full-time-broadcast',
  'template-mondial-social-story',
  'template-mondial-knockout-bracket',
  'template-mondial-group-table',
  'template-mondial-match-report',
  'template-mondial-quote',
  'template-mondial-analysis',
  'template-mondial-golden-boot',
  'template-mondial-prediction',
  'template-mondial-player-spotlight',
  'template-mondial-ticker',
  'template-mondial-lower-third',
];

const CORE_VARIANTS = [
  'scoreboard',
  'scorebug',
  'var_alert',
  'match_preview',
  'lineup',
  'match_result',
  'match_stats',
  'match_stats',
  'match_stats',
  'match_stats',
  'match_stats',
  'match_stats',
  'match_stats',
  'match_stats',
  'group_wall',
  'flag_wall',
  'team_code_wall',
  'match_announcement',
  'full_time',
  'social_story',
  'knockout_bracket',
  'group_table',
  'match_report',
  'quote',
  'analysis_board',
  'golden_boot',
  'prediction',
  'player_spotlight',
  'ticker',
  'lower_third',
];

const IRAQ_TEMPLATE_IDS = [
  'template-mondial-iraq-squad',
  'template-mondial-iraq-player',
  'template-mondial-iraq-ticker',
  'template-mondial-iraq-history',
  'template-mondial-iraq-fan-pulse',
  'template-mondial-iraq-dashboard',
];

test('all 30 core Mondial templates are registered, rendered, and categorized', async () => {
  const [templates, renderer, taxonomy] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../utils/templateTaxonomy.ts'),
  ]);

  assert.equal(CORE_TEMPLATE_IDS.length, 30);
  assert.equal(CORE_VARIANTS.length, 30);
  const coreTemplateSource = templates.split('export const MONDIAL_IRAQ_TEMPLATES')[0];
  const registeredCoreIds = [
    ...coreTemplateSource.matchAll(/^\s+id:\s*'(template-mondial-[^']+)'/gm),
  ].map(match => match[1]);
  assert.deepEqual(registeredCoreIds, CORE_TEMPLATE_IDS);
  for (const id of CORE_TEMPLATE_IDS) {
    assert.match(templates, new RegExp(`id:\\s*'${id}'`), `${id} is not registered`);
    assert.match(taxonomy, new RegExp(`'${id}'\\s*:`), `${id} has no taxonomy entry`);
  }
  for (const variant of CORE_VARIANTS) {
    assert.match(renderer, new RegExp(`variant === '${variant}'`), `${variant} has no renderer branch`);
  }
});

test('Mondial visual surfaces do not expose the upstream data provider brand', async () => {
  const sources = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
    readSource('../components/renderers/mondial/MondialKnockoutBracket.tsx'),
    readSource('../components/editor/MondialMatchPicker.tsx'),
    readSource('../components/TemplateControlBar.tsx'),
  ]);
  const combined = sources.join('\n');
  assert.doesNotMatch(combined, /fotmob(?:\s+live)?/i);
});

test('Mondial broadcast look presets are selectable and drive renderer classes', async () => {
  const [templates, shared, groupWall, matchCards, identity, bracket] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/mondial/MondialBroadcastShared.tsx'),
    readSource('../components/renderers/mondial/MondialGroupWall.tsx'),
    readSource('../components/renderers/mondial/MondialMatchCards.tsx'),
    readSource('../components/renderers/mondial/MondialTeamIdentity.tsx'),
    readSource('../components/renderers/mondial/MondialKnockoutBracket.tsx'),
  ]);

  assert.match(templates, /id: 'broadcastLook'[\s\S]*?value: 'mega_pack_black'/);
  for (const preset of ['mega_pack_black', 'neon_arc', 'scoreboard_red', 'poster_social', 'flag_identity', 'stadium_lights']) {
    assert.match(templates, new RegExp(`value: '${preset}'`), `${preset} is not selectable`);
    assert.match(shared, new RegExp(`${preset}: \\{ style:`), `${preset} has no style mapping`);
  }

  assert.match(shared, /mega_pack_black: \{ style: 'mega_pack_black', palette: 'mega_black' \}/);
  assert.match(shared, /poster_social: \{ style: 'poster_social', palette: 'poster' \}/);
  assert.match(shared, /flag_identity: \{ style: 'flag_identity', palette: 'flag_identity' \}/);
  assert.match(shared, /stadium_lights: \{ style: 'stadium_lights', palette: 'stadium_lights' \}/);
  assert.match(matchCards, /mondial-look-poster_social\.mondial-story-shell/);
  assert.match(matchCards, /matchStatusLabel\(match, 'قادمة'\)/);
  assert.match(matchCards, /aria-label=\{`مباراة مباشرة/);
  assert.doesNotMatch(matchCards, /Live match/);
  assert.doesNotMatch(matchCards, /NEXT MATCH/);
  assert.doesNotMatch(matchCards, /FULL-TIME/);
  assert.doesNotMatch(matchCards, /MATCH DAY/);
  assert.match(identity, /mondial-look-flag_identity \.mondial-flag-wall/);

  for (const source of [groupWall, matchCards, identity, bracket]) {
    assert.match(source, /const lookId = getBroadcastLook\(getField\)/);
    assert.match(source, /mondial-look-\$\{lookId\}/);
  }
});

test('match status comes from the selected fixture, not bridge connectivity', async () => {
  const [renderer, obs] = await Promise.all([
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
  ]);

  assert.match(obs, /const matchStatus = matchStatusPresentation\(getField, resolveField\)/);
  assert.match(obs, /const status = matchStatus\.isLive \? liveStatusText\(minute\) : matchStatus\.label/);
  assert.match(obs, /statusLabelAr/);
  assert.match(obs, /label: 'مباشر'/);
  assert.doesNotMatch(obs, /`LIVE \$\{minute\}'`/);
  assert.doesNotMatch(obs, /label: 'LIVE'/);
  assert.doesNotMatch(obs, /'NOW'/);
  assert.doesNotMatch(obs, /bridgeStatus === 'live'\s*\?\s*`LIVE/);
  assert.match(renderer, /const isLive = status === 'LIVE';/);
  assert.match(renderer, /resolveField\('matchStatus', 'status'\)[\s\S]*?=== 'LIVE'/);
});

test('partial live stats fall back per row and scorer cards use the richer live contract', async () => {
  const [obs, templates] = await Promise.all([
    readSource('../components/renderers/MondialObsTemplates.tsx'),
    readSource('../components/renderers/MondialTemplates.ts'),
  ]);

  assert.match(obs, /const liveRow = findDetailStat\(matchDetails, definition\.keys\)/);
  assert.match(obs, /liveRow\?\.home \?\? num\(getField, definition\.homeField/);
  assert.match(obs, /liveRow\?\.away \?\? num\(getField, definition\.awayField/);
  assert.doesNotMatch(obs, /liveRows\.length >=/);
  assert.match(templates, /id: 'statXgHome'/);
  assert.match(templates, /id: 'statXgAway'/);

  for (const field of ['nameAr', 'flagUrl', 'assists', 'appearances', 'minutesPlayed', 'image']) {
    assert.match(obs, new RegExp(`player\\.${field}`));
  }
  assert.match(obs, /const boundScorers = scorersFromWorldCupData\(liveData, getField\('scorersJson'\)\)/);
  assert.doesNotMatch(obs, /UPDATED DATA/);
  assert.doesNotMatch(obs, /GOLDEN BOOT · REO SHOW/);
  assert.doesNotMatch(obs, />GOALS</);
  assert.doesNotMatch(obs, /\.sort\(\(a, b\) => b\.goals - a\.goals\)/);
});

test('selected match details are propagated to broadcast cards and player spotlight controls', async () => {
  const [renderer, templates, obs] = await Promise.all([
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
  ]);

  assert.match(renderer, /mergeSelectedMatchDetails/);
  assert.match(renderer, /selectedMatch: selectedFixture/);
  assert.match(renderer, /ReoObsMondialMatchAnnouncement getField=\{getMatchField\} liveData=\{templateLiveData\}/);
  assert.match(renderer, /ReoObsMondialFullTime getField=\{getMatchField\} liveData=\{templateLiveData\}/);
  assert.match(renderer, /ReoObsMondialSocialStory getField=\{getMatchField\} liveData=\{templateLiveData\}/);
  assert.match(
    templates,
    /value: 'player_spotlight' \},[\s\S]*?\.\.\.mondialMatchSelectionFields,[\s\S]*?\.\.\.mondialMatchDataFields\.slice\(0, 6\)/
  );
  assert.match(obs, /matchDetails\?\.playerOfTheMatch/);
  assert.match(obs, /matchDetails\?\.topPlayers\.home\[playerPickIndex\]/);
  assert.match(obs, /lineupsToPlayersJson\(matchDetails, 'home'\)\[playerPickIndex\]/);
  assert.match(obs, /const playerStatFocus = text\(getField, 'playerStatFocus', 'auto'\)/);
  assert.match(obs, /livePlayer\?\.stats/);
});

test('mondial lineup has a defensive auto-formation layout for incomplete live data', async () => {
  const [templates, obs, constants] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
    readSource('../constants.ts'),
  ]);

  for (const field of ['lineupLayoutMode', 'lineupDirection']) {
    assert.match(templates, new RegExp(`id: '${field}'`), `${field} is not exposed in lineup settings`);
    assert.match(constants, new RegExp(`id === '${field}'`), `${field} is not grouped as a display control`);
  }

  assert.match(obs, /const parseFormationRows = \(formation: string\): number\[\]/);
  assert.match(obs, /const buildFormationLineup = \(/);
  assert.match(obs, /layoutMode === 'source_positions' && sourceHasEnoughPositions/);
  assert.match(obs, /const lineupLayoutMode = text\(getField, 'lineupLayoutMode', 'auto_formation'\)/);
  assert.match(obs, /const lineupDirection = text\(getField, 'lineupDirection', 'attack_up'\)/);
  assert.match(obs, /buildFormationLineup\(sourcePlayers, formation, lineupLayoutMode, lineupDirection\)/);
});

test('mondial statistical templates expose and consume real display modes', async () => {
  const [templates, obs, constants] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
    readSource('../constants.ts'),
  ]);

  for (const field of [
    'statsViewMode',
    'statFocus',
    'scorerViewMode',
    'playerCardMode',
    'reportViewMode',
    'analysisViewMode',
  ]) {
    assert.match(templates, new RegExp(`id: '${field}'`), `${field} is not exposed in template settings`);
    assert.match(constants, new RegExp(`id === '${field}'`), `${field} is not grouped as a display control`);
  }

  assert.match(obs, /const statsViewMode = text\(getField, 'statsViewMode', 'dual_bars'\)/);
  assert.match(obs, /const statFocus = text\(getField, 'statFocus', 'balanced'\)/);
  assert.match(obs, /statsViewMode === 'key_numbers'/);
  assert.match(obs, /statsViewMode === 'momentum_grid'/);
  assert.match(obs, /statsViewMode === 'pressure_accuracy'/);
  assert.match(obs, /statsViewMode === 'territory_radar'/);
  assert.match(obs, /statsViewMode === 'xg_shot_flow'/);
  assert.match(obs, /rows\.filter\(row => row\.focus === statFocus\)/);
  assert.match(obs, /statPressureHome/);
  assert.match(obs, /statShotAccuracyHome/);
  assert.match(obs, /statFieldTiltHome/);
  assert.match(obs, /statRecoveriesHome/);
  assert.match(obs, /statDuelsHome/);
  assert.match(templates, /id: 'template-mondial-pressure-index'/);
  assert.match(templates, /id: 'template-mondial-accuracy-control'/);
  assert.match(templates, /id: 'template-mondial-attack-shot-quality'/);
  assert.match(templates, /id: 'template-mondial-duels-discipline'/);
  assert.match(templates, /id: 'template-mondial-territory-control'/);
  assert.match(templates, /id: 'template-mondial-xg-shot-flow'/);
  assert.match(templates, /id: 'template-mondial-live-momentum'/);

  assert.match(obs, /const scorerViewMode = text\(getField, 'scorerViewMode', 'race_board'\)/);
  assert.match(obs, /scorerViewMode === 'podium'/);
  assert.match(obs, /scorerViewMode === 'compact_ranking'/);

  assert.match(obs, /const playerCardMode = text\(getField, 'playerCardMode', 'hero_stats'\)/);
  for (const field of ['playerSource', 'playerPickIndex', 'playerStatFocus']) {
    assert.match(templates, new RegExp(`id: '${field}'`), `${field} is not exposed in player spotlight settings`);
  }
  for (const option of ['top_home', 'top_away', 'lineup_home', 'lineup_away', 'manual']) {
    assert.match(templates, new RegExp(`value: '${option}'`), `${option} is not available as a player source`);
  }
  assert.match(obs, /playerCardMode === 'impact_radar'/);
  assert.match(obs, /playerCardMode === 'match_mom'/);
  assert.match(obs, /focusTokens\.some\(token => statKey\.includes\(token\)\)/);

  assert.match(obs, /const analysisViewMode = text\(getField, 'analysisViewMode', 'tactical_board'\)/);
  assert.match(obs, /analysisViewMode === 'key_battles'/);
  assert.match(obs, /analysisViewMode === 'pressure_map'/);

  assert.match(obs, /const reportViewMode = text\(getField, 'reportViewMode', 'post_match'\)/);
  assert.match(obs, /reportViewMode === 'storyline'/);
  assert.match(obs, /reportViewMode === 'potm_focus'/);
});

test('broadcast look settings drive reference-pack style and palette rendering', async () => {
  const [templates, shared, groupWall, matchCards, identityWall] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/mondial/MondialBroadcastShared.tsx'),
    readSource('../components/renderers/mondial/MondialGroupWall.tsx'),
    readSource('../components/renderers/mondial/MondialMatchCards.tsx'),
    readSource('../components/renderers/mondial/MondialTeamIdentity.tsx'),
  ]);

  for (const look of ['reference_pack', 'match_night', 'scoreboard_red', 'social_blue_green', 'trophy_gold', 'clean_draw']) {
    assert.match(templates, new RegExp(`value: '${look}'`), `${look} is missing from broadcastLook settings`);
    assert.match(shared, new RegExp(`${look}: \\{ style: '[^']+', palette: '[^']+' \\}`), `${look} does not map to style and palette`);
  }

  for (const style of ['spectrum', 'stadium', 'signal', 'neon_arc', 'score_red', 'clean_grid']) {
    assert.match(templates, new RegExp(`value: '${style}'`), `${style} is missing from manual style settings`);
    assert.match(shared, new RegExp(`mondial-style-${style}`), `${style} has no base CSS treatment`);
  }

  for (const palette of ['global', 'reo', 'midnight', 'electric', 'trophy', 'score_red', 'social_green']) {
    assert.match(templates, new RegExp(`value: '${palette}'`), `${palette} is missing from manual palette settings`);
    assert.match(shared, new RegExp(`${palette}: \\{`), `${palette} has no palette definition`);
  }

  for (const rendererSource of [groupWall, matchCards, identityWall]) {
    assert.match(rendererSource, /getBroadcastStyle\(getField\)/);
    assert.match(rendererSource, /getBroadcastPalette\(getField\)/);
    assert.match(rendererSource, /mondial-style-\$\{styleId\}/);
    assert.match(rendererSource, /getBroadcastCssVars\(paletteId\)/);
  }
});

test('mondial OBS templates consume selected kinetic theme colors', async () => {
  const obs = await readSource('../components/renderers/MondialObsTemplates.tsx');

  assert.match(obs, /const themedColors = \(theme\?: MondialTheme\)/);
  assert.match(obs, /const paletteAt = \(theme: MondialTheme \| undefined, index: number\)/);
  assert.match(obs, /theme\?: MondialTheme/);
  assert.match(obs, /<KineticStage image=\{stageImage\(getField\)\} theme=\{t\}>/);
  assert.match(obs, /<KineticStage transparent theme=\{t\}>/);
  assert.match(obs, /<KineticHeader title="سباق الحذاء الذهبي" tag=\{sourceTag\} theme=\{t\}/);
  assert.match(obs, /export const ReoObsGoldenBoot[\s\S]*?const c = themedColors\(t\)/);
  assert.match(obs, /boxShadow: `12px 10px 0 \$\{paletteAt\(t, index\)\}`/);
  assert.match(obs, /background: c\.gold/);
  assert.match(obs, /ColorRail theme=\{t\}/);
  assert.doesNotMatch(obs, /ReoObsGoldenBoot[\s\S]*?COLORS\[index % COLORS\.length\]/);
});

test('mondial broadcast pack templates expose the main theme and translate it into palettes', async () => {
  const [templates, shared] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/mondial/MondialBroadcastShared.tsx'),
  ]);

  assert.match(templates, /const mondialBroadcastPresentationFields[\s\S]*?field\.id === 'mondialTheme'/);
  assert.match(shared, /const THEME_TO_BROADCAST_PALETTE/);
  for (const [theme, palette] of Object.entries({
    MUNDIAL_MAIN: 'global',
    MUNDIAL_NIGHT: 'midnight',
    MUNDIAL_GOLD: 'trophy',
    IRAQ_PRIDE: 'reo',
    TACTICAL_DARK: 'electric',
    CLEAN_BROADCAST: 'stadium_lights',
  })) {
    assert.match(shared, new RegExp(`${theme}: '${palette}'`), `${theme} does not map to ${palette}`);
  }
  assert.match(shared, /const themePalette = getBroadcastThemePalette\(getField\)/);
  assert.match(shared, /return themePalette \|\| BROADCAST_LOOKS\[look\]\.palette/);
});

test('Iraq Mondial templates use shared controls and dedicated renderer variants', async () => {
  const [templates, renderer, obs] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
  ]);

  for (const id of IRAQ_TEMPLATE_IDS) {
    assert.match(templates, new RegExp(`id:\\s*'${id}'`), `${id} is not registered`);
  }
  assert.match(templates, /const mondialIraqControlFields/);
  assert.match(templates, /const mondialIraqControlFieldIds = new Set\(\[/);
  for (const field of ['transitionSpeedMs', 'mondialMotionPreset', 'soundInStyle', 'soundOutStyle', 'audioUpdateCue']) {
    assert.match(
      templates,
      new RegExp(`const mondialIraqControlFieldIds[\\s\\S]*?'${field}'`),
      `${field} is not inherited by Iraq templates`
    );
  }
  assert.match(templates, /MONDIAL_IRAQ_TEMPLATES\.map\(withIraqControls\)/);
  assert.match(renderer, /getField\('mondialVariant'\) \|\| getField\('iraqVariant'\)/);
  assert.match(renderer, /rawVariant === 'player_spotlight'[\s\S]*?'iraq_player_spotlight'/);
  assert.match(renderer, /rawVariant === 'match_ticker'[\s\S]*?'iraq_match_ticker'/);
  for (const variant of ['squad_card', 'iraq_player_spotlight', 'iraq_match_ticker', 'history_moment', 'fan_pulse', 'iraq_dashboard']) {
    assert.match(renderer, new RegExp(`variant === '${variant}'`), `${variant} has no renderer branch`);
  }
  for (const component of ['ReoObsIraqSquad', 'ReoObsIraqPlayerSpotlight', 'ReoObsIraqTicker', 'ReoObsIraqHistory', 'ReoObsIraqFanPulse', 'ReoObsIraqDashboard']) {
    assert.match(obs, new RegExp(`export const ${component}`), `${component} is missing`);
  }
  assert.match(obs, /props\.getField\('playerName'\)/);
  assert.match(obs, /props\.getField\('iraqNews'\)/);
  assert.match(obs, /getField\('momentTitle'\)/);
  assert.match(obs, /getField\('pulseValue'\)/);
  assert.match(obs, /getField\('groupTeamsJson'\) \|\| getField\('standingsJson'\)/);
});
