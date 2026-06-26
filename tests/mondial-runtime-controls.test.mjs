import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = async (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('legacy mondial templates keep their manual transition fields', async () => {
  const [source, templates] = await Promise.all([
    readSource('../components/OverlayRenderer.tsx'),
    readSource('../components/renderers/MondialTemplates.ts'),
  ]);

  assert.match(
    source,
    /if \(!isMondialTemplate \|\| !hasField\('mondialMotionPreset'\)\) return null;/
  );
  assert.match(source, /const fieldCue = String\(getField\(type === 'EXIT'/);
  assert.match(source, /if \(fieldCue !== 'DEFAULT'\) return fieldCue;/);
  assert.match(templates, /id: 'transitionIn'[\s\S]*?value: 'MONDIAL_STINGER'/);
  assert.match(templates, /id: 'transitionOut'[\s\S]*?value: 'MONDIAL_STINGER_OUT'/);
});

test('mondial transition speed controls both outer and inner animation layers', async () => {
  const [renderer, transitionLayer] = await Promise.all([
    readSource('../components/OverlayRenderer.tsx'),
    readSource('../components/renderers/mondial/MondialTransitionLayer.tsx'),
  ]);

  assert.match(renderer, /'--tv-enter-speed': `\$\{transitionSpeedMs\}ms`/);
  assert.match(renderer, /setTimeout\(\(\) => setAnimCls\(''\), editorExitHoldMs\)/);
  assert.match(renderer, /}, runtimeExitHoldMs\);/);
  assert.match(renderer, /@keyframes tvMondialReferenceCoverIn/);
  assert.match(renderer, /@keyframes tvMondialReferenceCoverOut/);
  assert.match(transitionLayer, /getField\('transitionSpeedMs'\)/);
  assert.match(transitionLayer, /getField\('transitionIntensity'\)/);
  assert.match(transitionLayer, /mondialTransitionReferenceCoverIn/);
  assert.match(transitionLayer, /mondialTransitionReferenceCoverOut/);
  assert.match(transitionLayer, /className="mondial-transition-mask"/);
  assert.match(transitionLayer, /className="mondial-transition-rings"/);
});

test('all selectable mondial motion presets have runtime transition effects', async () => {
  const [templates, renderer, transitionLayer] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../components/OverlayRenderer.tsx'),
    readSource('../components/renderers/mondial/MondialTransitionLayer.tsx'),
  ]);

  for (const preset of [
    'reference_stinger',
    'scorebug_snap',
    'group_wall_rush',
    'stadium_sweep',
    'glass_sweep',
    'spotlight_pop',
    'side_wipe',
    'story_glitch',
  ]) {
    assert.match(templates, new RegExp(`value: '${preset}'`));
    assert.match(renderer, new RegExp(`\\b${preset}: \\{`));
    assert.match(transitionLayer, new RegExp(`\\b${preset}: \\{`));
  }
});

test('motion preset sound defaults remain overridable and visible in the editor', async () => {
  const [templates, editor, renderer] = await Promise.all([
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../pages/Editor.tsx'),
    readSource('../components/OverlayRenderer.tsx'),
  ]);

  assert.match(templates, /id: 'soundInStyle'[\s\S]*?value: 'DEFAULT'/);
  assert.match(templates, /id: 'soundOutStyle'[\s\S]*?value: 'DEFAULT'/);
  assert.match(templates, /id: 'audioUpdateCue'[\s\S]*?value: 'DEFAULT'/);
  assert.match(templates, /Reference stinger - full-screen TV mask \+ sweep SFX/);
  assert.match(renderer, /reference_stinger:\s*\{[\s\S]*?soundInStyle: 'DIGITAL_SWEEP'/);
  assert.match(renderer, /reference_stinger:\s*\{[\s\S]*?soundOutStyle: 'BROADCAST_OUT'/);
  assert.match(editor, /'mondialTheme', 'mondialStyle', 'broadcastLook'/);
});

test('remote controls can create the complete mondial broadcast settings', async () => {
  const source = await readSource('../services/syncManager.ts');

  for (const field of [
    'audioUpdateCue',
    'broadcastLook',
    'broadcastStyle',
    'broadcastPalette',
    'mondialTheme',
    'mondialMotionPreset',
    'transitionSpeedMs',
    'transitionIntensity',
    'broadcastMotion',
  ]) {
    assert.match(source, new RegExp(`\\b${field}:`));
  }
});
