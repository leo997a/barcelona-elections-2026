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

test('all 23 core Mondial templates are registered, rendered, and categorized', async () => {
  const [templates, renderer, taxonomy] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../utils/templateTaxonomy.ts'),
  ]);

  assert.equal(CORE_TEMPLATE_IDS.length, 23);
  assert.equal(CORE_VARIANTS.length, 23);
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

test('match status comes from the selected fixture, not bridge connectivity', async () => {
  const [renderer, obs] = await Promise.all([
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
  ]);

  assert.match(obs, /const matchStatus = matchStatusPresentation\(getField, resolveField\)/);
  assert.match(obs, /const status = matchStatus\.isLive && minute/);
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
  assert.match(obs, /livePlayer\?\.stats/);
});
