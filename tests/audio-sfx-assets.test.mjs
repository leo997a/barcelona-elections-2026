import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const audioEnginePath = path.join(repoRoot, 'services', 'audioEngine.ts');
const audioSettingsPanelPath = path.join(repoRoot, 'components', 'AudioSettingsPanel.tsx');
const source = fs.readFileSync(audioEnginePath, 'utf8');
const audioSettingsPanelSource = fs.readFileSync(audioSettingsPanelPath, 'utf8');

const expectedReoCueFiles = {
  REO_WHISTLE: '/audio/sfx/football/whistle_short.mp3',
  REO_CROWD: '/audio/sfx/football/crowd_applause.mp3',
  REO_VAR: '/audio/sfx/football/var_buzzer.mp3',
  REO_GOAL: '/audio/sfx/football/goal_roar.mp3',
  REO_DATA_IN: '/audio/sfx/toko/data/data_02.mp3',
  REO_DATA_TICK: '/audio/sfx/toko/data/data_01.mp3',
  REO_WHOOSH_IN: '/audio/sfx/toko/whoosh/whoosh_01.mp3',
  REO_WHOOSH_OUT: '/audio/sfx/toko/whoosh/whoosh_03.mp3',
  REO_TRANSITION: '/audio/sfx/toko/whoosh/whoosh_02.mp3',
  REO_CLICK: '/audio/sfx/toko/click/click_01.mp3',
  REO_NOTIFICATION: '/audio/sfx/toko/notification/notification_01.mp3',
  REO_POP: '/audio/sfx/toko/bubble/bubble_01.mp3',
  REO_IMPACT: '/audio/sfx/toko/impact/impact_02.mp3',
  REO_SUBDROP: '/audio/sfx/toko/subdrop/subdrop_01.mp3',
  REO_RISER: '/audio/sfx/cinematic/riser.mp3',
  REO_CINEMA: '/audio/sfx/cinematic/impact.mp3',
  REO_GLITCH: '/audio/sfx/ui/glitch_flash.mp3',
  REO_BREAKING: '/sounds/special/breaking_news.mp3',
};

const getCueFileEntries = () => {
  const mapBlock = source.match(/const CUE_TO_FILE_MAP:[\s\S]*?= \{([\s\S]*?)\};/);
  assert.ok(mapBlock, 'CUE_TO_FILE_MAP block should exist');
  return [...mapBlock[1].matchAll(/([A-Z0-9_]+):\s*'([^']+)'/g)].map(([, cue, url]) => ({ cue, url }));
};

test('mapped audio cue files are shipped from public assets', () => {
  const entries = getCueFileEntries();
  assert.ok(entries.length >= 8, 'expected broadcast cue file mappings');

  for (const { cue, url } of entries) {
    if (!url.startsWith('/sounds/') && !url.startsWith('/audio/')) continue;
    const assetPath = path.join(repoRoot, 'public', url.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `${cue} points to missing asset ${url}`);
    assert.ok(fs.statSync(assetPath).size > 1000, `${cue} points to empty or tiny asset ${url}`);
  }
});

test('goal and transition cues resolve to the shipped broadcast SFX pack', () => {
  assert.match(source, /GOAL_HORN:\s*'\/audio\/sfx\/football\/goal_roar\.mp3'/);
  assert.match(source, /SCOREBUG_SNAP:\s*'\/sounds\/show\/scoreboard_in\.mp3'/);
  assert.match(source, /BROADCAST_OUT:\s*'\/sounds\/hide\/whoosh_out\.mp3'/);
});

test('library-visible football and soft cues resolve to real files before synth fallback', () => {
  assert.match(source, /VAR_BUZZ:\s*'\/audio\/sfx\/football\/var_buzzer\.mp3'/);
  assert.match(source, /WHISTLE_SHORT:\s*'\/audio\/sfx\/football\/whistle_short\.mp3'/);
  assert.match(source, /STADIUM_CHEER:\s*'\/audio\/sfx\/football\/crowd_applause\.mp3'/);
  assert.match(source, /CINEMA_BOOM:\s*'\/audio\/sfx\/toko\/subdrop\/subdrop_01\.mp3'/);
  assert.match(source, /ULTRA_RISER:\s*'\/audio\/sfx\/cinematic\/riser\.mp3'/);
  assert.match(source, /SOFT_CHAT_TICK:\s*'\/audio\/sfx\/toko\/click\/click_01\.mp3'/);
  assert.match(source, /SOFT_NOTIFICATION_PULSE:\s*'\/audio\/sfx\/toko\/bubble\/bubble_01\.mp3'/);
});

test('Reo audio library cues stay visible and backed by real files', () => {
  const entries = new Map(getCueFileEntries().map(({ cue, url }) => [cue, url]));

  assert.match(source, /const _reoEntries: PreviewableCue\[\] = \[/);
  assert.match(source, /export const PREVIEWABLE_CUES: PreviewableCue\[\] = \[\s*\.\.\._reoEntries,/);
  assert.match(audioSettingsPanelSource, /reo:\s*'.*Reo.*'/);

  for (const [cue, url] of Object.entries(expectedReoCueFiles)) {
    assert.equal(entries.get(cue), url, `${cue} should point to ${url}`);
    assert.match(
      source,
      new RegExp(`\\{ value:\\s*'${cue}'[\\s\\S]*?category:\\s*'reo'`),
      `${cue} should be visible under the reo category`,
    );
  }
});

test('Reo file cues are not converted into library aliases', () => {
  const aliasBlock = source.match(/const LIBRARY_CUE_ALIASES:[\s\S]*?= \{([\s\S]*?)\};/);
  assert.ok(aliasBlock, 'LIBRARY_CUE_ALIASES block should exist');
  for (const cue of Object.keys(expectedReoCueFiles)) {
    assert.doesNotMatch(aliasBlock[1], new RegExp(`${cue}\\s*:`), `${cue} must remain a direct file cue`);
  }
});
