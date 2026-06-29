import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const audioEnginePath = path.join(repoRoot, 'services', 'audioEngine.ts');
const source = fs.readFileSync(audioEnginePath, 'utf8');

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
