import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createWorldCupDataVersion,
  getWorldCupDataVersion,
} from '../dist-server/utils/worldCupLiveData.js';

const readSource = async (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('live data fingerprint ignores transport timestamps', () => {
  const base = {
    fetchedAt: '2026-06-25T10:00:00Z',
    sourceStatus: 'live',
    fixtures: [{ id: 1, status: 'live', homeScore: 1, awayScore: 0 }],
    meta: { bridgeUpdatedAt: '2026-06-25T10:00:00Z' },
  };
  const refreshed = {
    ...base,
    fetchedAt: '2026-06-25T10:00:15Z',
    meta: { bridgeUpdatedAt: '2026-06-25T10:00:15Z' },
  };

  assert.equal(createWorldCupDataVersion(base), createWorldCupDataVersion(refreshed));
  assert.notEqual(
    createWorldCupDataVersion(base),
    createWorldCupDataVersion({
      ...refreshed,
      fixtures: [{ id: 1, status: 'live', homeScore: 2, awayScore: 0 }],
    })
  );
});

test('explicit server data version wins over client fallback hashing', () => {
  assert.equal(getWorldCupDataVersion({ dataVersion: 'reo-wc-server-1' }), 'reo-wc-server-1');
});

test('mondial renderer triggers one transition for each meaningful live update', async () => {
  const [renderer, transitionLayer] = await Promise.all([
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../components/renderers/mondial/MondialTransitionLayer.tsx'),
  ]);

  assert.match(renderer, /const applyLiveData = useCallback/);
  assert.match(renderer, /if \(versionRef\.current === nextVersion\) \{[\s\S]*?setLiveData\(data\);[\s\S]*?return;/);
  assert.match(renderer, /playedUpdateSequenceRef/);
  assert.match(renderer, /playedUpdateSequenceRef\.current = updateSequence;[\s\S]*?if \(isEditor \|\| !config\.isVisible\) return;/);
  assert.match(renderer, /playSound\?\.\('TRANSITION'\)/);
  assert.match(renderer, /updateKey=\{updateSequence\}/);
  assert.match(transitionLayer, /mondial-transition-live-update/);
  assert.match(transitionLayer, /key=\{`live-update-\$\{updateKey\}`\}/);
});

test('world cup API and match bridge expose the fallback contract', async () => {
  const [apiSource, bridgeSource, bridgeScript] = await Promise.all([
    readSource('../api/_lib/fotmobWorldCup.ts'),
    readSource('../cloud/reo-match-bridge/app.py'),
    readSource('../scripts/reo-cloud-bridge.ps1'),
  ]);

  assert.match(apiSource, /fetchWorldCupSnapshotFromBridge/);
  assert.match(apiSource, /`\$\{baseUrl\}\/api\/world-cup`/);
  assert.match(apiSource, /sourceMode: 'bridge-fallback'/);
  assert.match(bridgeSource, /if path == "\/api\/world-cup":/);
  assert.match(bridgeSource, /fetch_world_cup_page_props/);
  assert.match(bridgeScript, /'world-cup' \{ Invoke-ReoGet '\/api\/world-cup' \}/);
});
