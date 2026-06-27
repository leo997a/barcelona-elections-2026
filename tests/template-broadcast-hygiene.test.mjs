import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const readSource = async relativePath =>
  fs.readFile(new URL(relativePath, import.meta.url), 'utf8');

test('all templates inherit normalized broadcast control ordering', async () => {
  const [constants, editor] = await Promise.all([
    readSource('../constants.ts'),
    readSource('../pages/Editor.tsx'),
  ]);

  assert.match(
    constants,
    /fields:\s*normalizeTemplateFields\(\[\.\.\.template\.fields,\s*\.\.\.createBroadcastControlFields\(template\.fields\)\]\)/,
  );
  assert.match(constants, /export const INITIAL_TEMPLATES:[\s\S]*?\.map\(withBroadcastControls\)/);
  assert.match(editor, /import \{ INITIAL_TEMPLATES, normalizeTemplateFields \} from '\.\.\/constants'/);
  assert.match(editor, /const orderedDraftFields = useMemo\([\s\S]*?normalizeTemplateFields\(draftOverlay\.fields\)/);
  assert.match(editor, /orderedDraftFields\.map\(\(field\) =>/);
});

test('statement source timeline has an editable broadcast label', async () => {
  const [constants, renderer] = await Promise.all([
    readSource('../constants.ts'),
    readSource('../components/renderers/StatementCardsRenderer.tsx'),
  ]);

  assert.match(constants, /id: 'sourceTimelineLabel'/);
  assert.match(renderer, /const sourceTimelineLabel = String\(getField\('sourceTimelineLabel'\)/);
  assert.doesNotMatch(renderer, /source monitor/i);
});

test('raw data and player bridge fields stay in advanced settings', async () => {
  const constants = await readSource('../constants.ts');

  assert.match(constants, /id\.endsWith\('Json'\)/);
  assert.match(constants, /id\.startsWith\('include'\)/);
  assert.match(constants, /id === 'playerStatsDataMode'/);
  assert.match(constants, /id === 'playerStatsApiUrl'/);
  assert.match(constants, /id === 'playerStatsPollSec'/);
  assert.match(constants, /id === 'statsData'/);
  assert.match(constants, /id === 'playerStatsMode'[\s\S]*?\) return 'display'/);
});

test('public broadcast renderers do not expose raw provider or bridge labels', async () => {
  const sources = await Promise.all([
    readSource('../components/renderers/StatementCardsRenderer.tsx'),
    readSource('../components/renderers/PlayerIntelV2Renderer.tsx'),
    readSource('../components/renderers/PlayerStatsRenderer.tsx'),
    readSource('../components/renderers/MatchStatsRenderer.tsx'),
    readSource('../components/renderers/TransferNewsRenderer.tsx'),
    readSource('../components/renderers/BreakingHereWeGoRenderer.tsx'),
    readSource('../components/renderers/MercatoUnifiedRenderer.tsx'),
    readSource('../components/renderers/TopViewersRenderer.tsx'),
  ]);
  const combined = sources.join('\n');

  for (const pattern of [
    />\s*FotMob\s*[✓â]/i,
    />\s*FBref\s*[✓â]/i,
    /FBref \+ FotMob/i,
    /REO Player Data Bridge/i,
    /REO Cloud Bridge/i,
    /REO Live Bridge/i,
    /Reo Show Mercato Desk/i,
    /Live transfer desk/i,
    />\s*SOURCE\s*</,
    />\s*LIVE\s*</,
    /SOURCE CONFIDENCE BOARD/i,
    /TOP SOURCE/i,
  ]) {
    assert.doesNotMatch(combined, pattern);
  }

  assert.match(combined, /cleanBroadcastSourceName/);
  assert.match(combined, /coverageLabel\(sourceCoverage\)/);
});

test('template settings avoid legacy bridge wording in visible labels', async () => {
  const sources = await Promise.all([
    readSource('../pages/Editor.tsx'),
    readSource('../utils/election.ts'),
    readSource('../constants.ts'),
    readSource('../utils/templateRegistry.ts'),
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/renderers/MondialSharedComponents.tsx'),
  ]);
  const combined = sources.join('\n');
  const legacyWords = [
    'REO Cloud Bridge',
    'Live Bridge',
    'Local Bridge',
    'REO Player Cloud Bridge',
    'REO data bridge',
    'Custom bridge URL',
    'Visible data source name',
    'World Cup data source',
    'Player Stats look',
    'Look variant',
    'موسم FBref',
    'جسر المباريات أولًا',
    'رابط مباراة WhoScored',
    'قالب بث احترافي يدمج بيانات FotMob',
    'JSON من WhoScored',
  ];

  assert.doesNotMatch(combined, new RegExp(legacyWords.join('|'), 'i'));
  assert.doesNotMatch(combined, /label:\s*['"]Field['"]/);
});

test('template style controls are editable and drive their renderer style', async () => {
  const [constants, electionOverlay] = await Promise.all([
    readSource('../constants.ts'),
    readSource('../components/ElectionOverlay.tsx'),
  ]);

  assert.match(constants, /const ELECTION_DESIGN_STYLE_OPTIONS = \[/);
  assert.match(constants, /const MERCATO_DESIGN_STYLE_OPTIONS = \[/);
  assert.doesNotMatch(constants, /id:\s*'designStyle'[\s\S]{0,120}type:\s*'hidden'/);
  assert.match(constants, /id: 'designStyle'[\s\S]*?type: 'select'[\s\S]*?options: ELECTION_DESIGN_STYLE_OPTIONS/);
  assert.match(constants, /id: 'designStyle'[\s\S]*?type: 'select'[\s\S]*?options: MERCATO_DESIGN_STYLE_OPTIONS/);
  assert.match(
    electionOverlay,
    /const designStyle = rawDesignStyle[\s\S]*?resolveElectionStyle\(rawDesignStyle\)[\s\S]*?: templateVariantMap/
  );
});
