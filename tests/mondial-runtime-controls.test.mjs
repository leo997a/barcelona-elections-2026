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
  assert.match(transitionLayer, /mondialTransitionArcStingerIn/);
  assert.match(transitionLayer, /mondialTransitionArcStingerOut/);
  assert.match(transitionLayer, /mondialTransitionArcBandTopIn/);
  assert.match(transitionLayer, /className="mondial-transition-mask"/);
  assert.match(transitionLayer, /className="mondial-transition-rings"/);
  assert.match(transitionLayer, /className="mondial-transition-arc-stinger"/);
  assert.match(transitionLayer, /className="mondial-transition-bug"/);
  assert.match(renderer, /clampNumber\(getField\('transitionSpeedMs'\), 1250, 700, 2400\)/);
  assert.match(renderer, /Math\.max\(700, Math\.round\(transitionSpeedMs \* 1\.05\)\)/);
  assert.match(transitionLayer, /clampNumber\(getField\('transitionSpeedMs'\), 1250, 700, 2400\)/);
  assert.match(transitionLayer, /--mondial-transition-speed: 1250ms;/);
});

test('mondial reference stinger exit uses dedicated out-phase masks and bands', async () => {
  const transitionLayer = await readSource('../components/renderers/mondial/MondialTransitionLayer.tsx');

  assert.match(
    transitionLayer,
    /data-phase='out'][\s\S]*?\.mondial-transition-mask[\s\S]*?mondialTransitionReferenceCoverOut/
  );
  assert.match(
    transitionLayer,
    /data-phase='out'][\s\S]*?\.mondial-transition-rings[\s\S]*?mondialTransitionReferencePulseOut/
  );
  assert.match(
    transitionLayer,
    /data-phase='out'][\s\S]*?span\[data-arc='top'\][\s\S]*?mondialTransitionArcBandTopOut/
  );
  assert.match(
    transitionLayer,
    /data-phase='out'][\s\S]*?span\[data-arc='bottom'\][\s\S]*?mondialTransitionArcBandBottomOut/
  );
  assert.doesNotMatch(
    transitionLayer,
    /data-phase='out'][\s\S]*?mondialTransitionReferenceCoverIn calc\(var\(--mondial-transition-speed\) \* \.62\)/
  );
  assert.doesNotMatch(
    transitionLayer,
    /data-phase='out'][\s\S]*?mondialTransitionArcBandTopIn calc\(var\(--mondial-transition-speed\) \* \.62\)/
  );
});

test('all mondial transition effects carry the REO SHOW brand bug', async () => {
  const transitionLayer = await readSource('../components/renderers/mondial/MondialTransitionLayer.tsx');

  assert.match(transitionLayer, /<span>REO<\/span>\s*<b>SHOW<\/b>/);
  assert.match(
    transitionLayer,
    /data-phase='in'\]\[data-motion='on'\]\s+\.mondial-transition-bug\s*\{[\s\S]*?mondialTransitionArcBugIn/
  );
  assert.match(
    transitionLayer,
    /data-phase='out'\]\[data-motion='on'\]\s+\.mondial-transition-bug\s*\{[\s\S]*?mondialTransitionArcBugOut/
  );
  assert.match(
    transitionLayer,
    /data-effect='stinger'\]\[data-phase='in'\]\[data-motion='on'\]\s+\.mondial-transition-bug\s*\{[\s\S]*?mondialTransitionArcBugIn/
  );
  assert.match(
    transitionLayer,
    /data-effect='stinger'\]\[data-phase='out'\]\[data-motion='on'\]\s+\.mondial-transition-bug\s*\{[\s\S]*?mondialTransitionArcBugOut/
  );
});

test('mondial exit phase stays active until the exit hold completes', async () => {
  const renderer = await readSource('../components/OverlayRenderer.tsx');

  assert.match(
    renderer,
    /else if \(!isNowVisible && prevVisible === true\) \{[\s\S]*?setWasVisible\(true\);[\s\S]*?setAnimCls\(resolveExitClass\(\)\);[\s\S]*?setMounted\(false\);[\s\S]*?setAnimCls\(''\);[\s\S]*?setWasVisible\(false\);[\s\S]*?\}, runtimeExitHoldMs\);/
  );
  assert.doesNotMatch(renderer, /previousVisibilityRef\.current = isNowVisible;\s*setWasVisible\(isNowVisible\);/);
});

test('public output keeps mondial renderers eager and defers inactive template families', async () => {
  const renderer = await readSource('../components/OverlayRenderer.tsx');

  assert.match(renderer, /const ScoreboardRenderer = React\.lazy/);
  assert.match(renderer, /const MercatoUnifiedRenderer = React\.lazy/);
  assert.match(renderer, /const PlayerIntelV2Renderer = React\.lazy/);
  assert.match(renderer, /<React\.Suspense fallback=\{null\}>/);
  assert.match(renderer, /import \{ Mondial2026Renderer \} from '\.\/renderers\/Mondial2026Renderer';/);
  assert.doesNotMatch(renderer, /import \{ ScoreboardRenderer \} from '\.\/renderers\/ScoreboardRenderer';/);
  assert.doesNotMatch(renderer, /import MercatoUnifiedRenderer from '\.\/renderers\/MercatoUnifiedRenderer';/);
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
  assert.match(renderer, /reference_stinger:\s*\{[\s\S]*?soundInStyle: 'LUXURY_SWEEP_PRO'/);
  assert.match(renderer, /reference_stinger:\s*\{[\s\S]*?soundOutStyle: 'OUTRO_HIT'/);
  assert.match(templates, /value: 'LUXURY_SWEEP_PRO'/);
  assert.match(templates, /value: 'PANEL_CLOSE'/);
  assert.match(templates, /value: 'LIVE_UPDATE_PING'/);
  for (const cue of [
    'REO_WHOOSH_IN',
    'REO_TRANSITION',
    'REO_WHOOSH_OUT',
    'REO_DATA_TICK',
    'REO_NOTIFICATION',
    'REO_BREAKING',
  ]) {
    assert.match(templates, new RegExp(`value: '${cue}'`), `${cue} should be selectable in Mondial audio fields`);
  }
  assert.match(templates, /id: 'soundInStyle'[\s\S]*?\.\.\.reoSoundInOptions/);
  assert.match(templates, /id: 'soundOutStyle'[\s\S]*?\.\.\.reoSoundOutOptions/);
  assert.match(templates, /id: 'audioUpdateCue'[\s\S]*?\.\.\.reoUpdateCueOptions/);
  assert.match(editor, /'mondialTheme', 'mondialStyle', 'broadcastLook'/);
});

test('legacy mondial cue names are routed into the professional sound library', async () => {
  const audioEngine = await readSource('../services/audioEngine.ts');

  for (const [legacyCue, libraryCue] of [
    ['DIGITAL_SWEEP', 'LUXURY_SWEEP_PRO'],
    ['GLITCH_TRANSITION', 'DIGITAL_GLITCH_SHORT'],
    ['STADIUM_WHOOSH', 'STADIUM_RISE_REALISTIC'],
    ['BROADCAST_OUT', 'OUTRO_HIT'],
    ['DATA_TICK', 'LIVE_UPDATE_PING'],
    ['SCOREBUG_SNAP', 'SCOREBOARD_TICK'],
  ]) {
    assert.match(audioEngine, new RegExp(`${legacyCue}: '${libraryCue}'`));
  }
  assert.match(audioEngine, /const normalizedCue = LIBRARY_CUE_ALIASES\[requestedCue\] \|\| requestedCue;/);
  assert.match(audioEngine, /if \(isLibraryCue\(normalizedCue\)\)/);
});

test('mondial live refresh stops completely unless automatic refresh or manual update is requested', async () => {
  const renderer = await readSource('../components/renderers/Mondial2026Renderer.tsx');

  assert.match(renderer, /if \(liveRefreshEnabled \|\| forceUpdate\) void fetchFromBridge\(forceUpdate\);/);
  assert.doesNotMatch(renderer, /void fetchFromBridge\(forceUpdate\);\s*if \(intervalRef\.current\) clearInterval/);
  assert.match(renderer, /if \(liveRefreshEnabled \|\| forceUpdate\) void fetchDetails\(\);/);
  assert.doesNotMatch(renderer, /useEffect\(\(\) => \{\s*void fetchDetails\(\);/);
  const overlayRenderer = await readSource('../components/OverlayRenderer.tsx');
  for (const field of ['liveRefreshEnabled', 'manualRefreshNonce', 'pollIntervalSec', 'bridgeApiUrl']) {
    assert.match(overlayRenderer, new RegExp(`'${field}'`));
  }
});

test('all mondial template families expose the shared motion and audio controls', async () => {
  const templates = await readSource('../components/renderers/MondialTemplates.ts');

  for (const field of [
    'broadcastMotion',
    'transitionSpeedMs',
    'transitionIntensity',
    'mondialMotionPreset',
    'soundInStyle',
    'soundOutStyle',
    'audioUpdateCue',
    'duckSfx',
  ]) {
    assert.match(
      templates,
      new RegExp(`const mondialCommonFields[\\s\\S]*?id: '${field}'`),
      `${field} is missing from mondialCommonFields`
    );
  }

  assert.match(templates, /const mondialIraqControlFieldIds = new Set\(\[/);
  for (const field of ['transitionSpeedMs', 'mondialMotionPreset', 'soundInStyle', 'audioUpdateCue', 'duckSfx']) {
    assert.match(
      templates,
      new RegExp(`const mondialIraqControlFieldIds[\\s\\S]*?'${field}'`),
      `${field} is missing from Iraq shared controls`
    );
  }
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

test('output visibility controls publish immediately and editor links use the latest draft snapshot', async () => {
  const [syncManager, editor, overlayRenderer] = await Promise.all([
    readSource('../services/syncManager.ts'),
    readSource('../pages/Editor.tsx'),
    readSource('../components/OverlayRenderer.tsx'),
  ]);

  assert.match(
    syncManager,
    /const isVisibilityCommand = command\.action === 'set_visible' \|\| command\.action === 'toggle_visible';/
  );
  assert.match(syncManager, /const LIVE_PUBLISH_RETRY_DELAYS_MS = \[250, 750, 1500, 3000, 6000\];/);
  assert.match(syncManager, /assertLivePostAccepted\(response, `Live overlay publish \$\{overlay\.id\}`\)/);
  assert.match(syncManager, /publishOverlaySnapshotWithRetry\(overlay/);
  assert.match(syncManager, /publishProgramSnapshotWithRetry\(Boolean\(options\.keepalive\)\)/);
  assert.match(syncManager, /Initial program output snapshot publish failed; retrying in background/);
  assert.match(
    syncManager,
    /public async prepareProgramOutputUrl\(\) \{[\s\S]*?this\.publishProgramSnapshot\(false\)\.catch\(error => \{[\s\S]*?this\.publishProgramSnapshotWithRetry\(false\);[\s\S]*?\}\);[\s\S]*?return this\.buildProgramOutputUrl\(\);[\s\S]*?\}/
  );
  assert.match(
    syncManager,
    /this\.pushToLiveApi\(command\.targetId, changedOverlay \?\? undefined, \{[\s\S]*?immediate: isVisibilityCommand,[\s\S]*?retry: isVisibilityCommand,[\s\S]*?\}\);/
  );
  assert.match(syncManager, /public setOverlayVisibility\(overlayId: string, isVisible: boolean, fallbackOverlay\?: OverlayConfig\) \{/);
  assert.match(syncManager, /const sourceOverlay = existingOverlay \?\? fallbackOverlay;/);
  assert.match(syncManager, /if \(!replaced\) \{[\s\S]*?this\.currentState = \[\.\.\.this\.currentState, nextOverlay\];[\s\S]*?\}/);
  assert.match(syncManager, /this\.pushToLiveApi\(overlayId, nextOverlay, \{ immediate: true, retry: true \}\);/);
  assert.match(editor, /const editorPreviewOverlay = useMemo\(/);
  assert.match(editor, /normalizeElectionOverlay\(\{ \.\.\.draftOverlay, isVisible: true \}\)/);
  assert.match(editor, /const publishDraftVisibility = useCallback\(\(isVisible: boolean\) => \{/);
  assert.match(editor, /setMotionPreviewPhase\('HOLD'\);/);
  assert.match(editor, /syncManager\.setOverlayVisibility\(liveOverlay\.id, isVisible, outputSnapshot\);/);
  assert.match(editor, /overlay=\{draftOverlay\}/);
  assert.match(editor, /config=\{editorPreviewOverlay\}/);
  assert.match(editor, /onShow=\{\(\) => publishDraftVisibility\(true\)\}/);
  assert.match(editor, /onHide=\{\(\) => publishDraftVisibility\(false\)\}/);
  assert.match(editor, /onReset=\{\(\) => publishDraftVisibility\(false\)\}/);
  assert.match(editor, /const outputSnapshot = normalizeElectionOverlay\(draftOverlay\);/);
  assert.match(editor, /prepareOutputUrl\(outputSnapshot\.id, outputSnapshot\)/);
  assert.doesNotMatch(editor, /prepareOutputUrl\(liveOverlay\.id, liveOverlay\)/);
  assert.doesNotMatch(editor, /setMotionPreviewPhase\(isVisible \? 'IN' : 'OUT'\);/);
  assert.doesNotMatch(editor, /runMotionPreview\('IN'\)/);
  assert.doesNotMatch(editor, /runMotionPreview\('OUT'\)/);
  assert.doesNotMatch(editor, /isVisible: liveOverlay\.isVisible/);
  assert.match(overlayRenderer, /const activeTheme = useResolvedTheme\(config\);[\s\S]*?if \(!mounted && !isEditor\) return null;/);
  assert.match(overlayRenderer, /const editorHiddenClass = isEditor && !config\.isVisible && !animCls/);
  assert.match(overlayRenderer, /const outerClassName = \[animCls, editorHiddenClass\]\.filter\(Boolean\)\.join\(' '\);/);
  assert.match(overlayRenderer, /<div className=\{outerClassName\} style=\{containerStyle\}>/);
});

test('public output links poll quickly and stay hidden when live state is missing', async () => {
  const app = await readSource('../App.tsx');

  assert.match(app, /const OUTPUT_TEMPLATE_IDS = INITIAL_TEMPLATES/);
  assert.match(app, /const buildOutputFallbackState = \(id: string \| null\): OutputState \| null => \{/);
  assert.match(app, /createOverlayFromTemplate\(templateId, \[\], 'public-output-fallback'\)/);
  assert.match(app, /isVisible: false,/);
  assert.match(app, /const initialOutputState = embeddedOverlay \?\? cachedOutputState \?\? fallbackOutputState;/);
  assert.match(app, /const pollIntervalMs = isObsBrowser \? 250 : 600;/);
  assert.match(app, /const staleFullFetchMs = isObsBrowser \? 900 : 1400;/);
  assert.match(app, /const missingStateProbeMs = isObsBrowser \? 2200 : 5000;/);
  assert.match(app, /const applyMissingState = \(\) => \{/);
  assert.match(app, /if \(r\.status === 404 \|\| r\.status === 410\) \{[\s\S]*?applyMissingState\(\);[\s\S]*?return false;[\s\S]*?\}/);
  assert.match(app, /void fetchLiveState\(\)\.then\(found => \{[\s\S]*?if \(!found\) startFallback\(\);[\s\S]*?\}\);[\s\S]*?connectSSE\(\);/);
  assert.match(app, /if \(consecutiveLiveMisses >= 8 && Date\.now\(\) - lastMissingProbeAt < missingStateProbeMs\) return;/);
  assert.doesNotMatch(app, /if \(embeddedOverlay\) \{[\s\S]*?return;\s*\}[\s\S]*?if \(!id\) return;/);
  assert.match(app, /if \(!id\) return;\s*if \(embeddedOverlay\) \{/);
  assert.doesNotMatch(app, /startFallback\(\);\s*connectSSE\(\);/);
  assert.match(app, /es\.onopen = \(\) => \{[\s\S]*?consecutiveLiveMisses = 0;[\s\S]*?setConnStatus\('live'\);[\s\S]*?startFallback\(\);[\s\S]*?\};/);
  assert.doesNotMatch(app, /es\.onopen = \(\) => \{\s*stopFallback\(\);/);
  assert.match(app, /connectSSE\(\);/);
});

test('stream deck and match bridge defaults point at the hosted production origin', async () => {
  const [integrations, bridgeExtractor, bridgeApp] = await Promise.all([
    readSource('../pages/Integrations.tsx'),
    readSource('../cloud/reo-match-bridge/extractor/extract_match.py'),
    readSource('../cloud/reo-match-bridge/app.py'),
  ]);

  const hostingerOrigin = 'https://peachpuff-herring-712997.hostingersite.com';
  assert.match(integrations, new RegExp(hostingerOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(bridgeExtractor, new RegExp(hostingerOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(bridgeApp, new RegExp(hostingerOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(integrations, /barcelona-elections-2026\.vercel\.app/);
});

test('stream fallback refresh is fast enough for hostinger live output', async () => {
  const streamApi = await readSource('../api/stream.ts');

  assert.match(streamApi, /const refreshMs = process\.env\.VERCEL \? 1_000 : 600;/);
});

test('hostinger live output state has a persistent file-store fallback', async () => {
  const [liveStore, liveApi, streamApi] = await Promise.all([
    readSource('../api/_lib/liveStore.ts'),
    readSource('../api/live.ts'),
    readSource('../api/stream.ts'),
  ]);

  assert.match(liveStore, /process\.env\.REO_LIVE_STATE_DIR/);
  assert.match(liveStore, /resolve\(process\.cwd\(\), 'data', 'live-state'\)/);
  assert.match(liveStore, /const readFileStoreEntry = async \(id: string\)/);
  assert.match(liveStore, /const writeFileStoreEntry = async \(entry: LiveStateEntry\)/);
  assert.doesNotMatch(liveStore, /const fingerprintState = \(state: unknown\) => \{/);
  assert.match(liveStore, /const persisted = await readFileStoreEntry\(id\)/);
  assert.match(liveStore, /await writeFileStoreEntry\(entry\)/);
  assert.doesNotMatch(liveStore, /stateChanged/);
  assert.match(liveStore, /if \(previousClientVersion && clientVersion <= previousClientVersion\) \{/);
  assert.match(liveStore, /const safeClientVersion = Math\.max\(clientVersion, previousClientVersion \+ 1\);/);
  assert.match(liveStore, /clientVersion: safeClientVersion,/);
  assert.match(liveStore, /const fileStoreDisabled = \(\) => Boolean\(process\.env\.VERCEL\)/);
  assert.match(liveStore, /export const describeLiveStoreMode = \(\) => \{/);
  assert.match(liveStore, /return fileStoreDisabled\(\) \? 'memory' : 'file';/);
  assert.match(liveApi, /res\.setHeader\('X-Live-Store', describeLiveStoreMode\(\)\)/);
  assert.match(streamApi, /res\.setHeader\('X-Live-Store', describeLiveStoreMode\(\)\)/);
});

test('visibility retry publishes frozen snapshot and never overwrites newer state', async () => {
  // Guard: publishOverlaySnapshotWithRetry must freeze clientVersion once
  // and reuse it across retries so a retry cannot land a stale isVisible
  // value on top of a newer OUT/IN command that already succeeded.
  const syncManager = await readSource('../services/syncManager.ts');

  // The retry helper must NOT call this.publishOverlaySnapshot(overlay, ...)
  // inside its retry loop — that function calls nextLiveClientVersion() each
  // time, producing an ever-increasing version that can stomp newer state.
  assert.doesNotMatch(
    syncManager,
    /publishOverlaySnapshotWithRetry[\s\S]*?attempt\(retryIndex\)[\s\S]*?this\.publishOverlaySnapshot\(overlay/
  );

  // Instead it must build body once with a frozen clientVersion.
  assert.match(
    syncManager,
    /publishOverlaySnapshotWithRetry[\s\S]*?frozenClientVersion[\s\S]*?attempt\(0\);/
  );
  assert.match(
    syncManager,
    /publishProgramSnapshotWithRetry[\s\S]*?frozenClientVersion[\s\S]*?attempt\(0\);/
  );

  // The frozen body must be serialised once before the first attempt.
  assert.match(
    syncManager,
    /const frozenClientVersion = this\.nextLiveClientVersion\(\);[\s\S]{0,200}const body = JSON\.stringify\(\{ state: overlay, clientVersion: frozenClientVersion \}\)/
  );
  assert.match(
    syncManager,
    /const frozenClientVersion = this\.nextLiveClientVersion\(\);[\s\S]{0,200}const body = JSON\.stringify\(\{ state: frozenState, clientVersion: frozenClientVersion \}\)/
  );
});

test('output fetchLiveState does not hide template on unexpected 200 response format', async () => {
  // Guard: applyMissingState (which forces isVisible:false) must only be
  // called on explicit 404/410 from the server — never on a 200 response
  // whose shape doesn't match expectations.  Calling it on 200 caused the
  // template to flash hidden whenever the server returned a format the client
  // didn't recognise (e.g. after a server upgrade or format change).
  const app = await readSource('../App.tsx');

  // applyMissingState must appear after the 404/410 guard inside fetchLiveState
  assert.match(
    app,
    /if \(r\.status === 404 \|\| r\.status === 410\) \{[\s\S]*?applyMissingState\(\);[\s\S]*?return false;[\s\S]*?\}/
  );

  // After the two early-return paths (isProgramOutput + id match), the
  // fallthrough must NOT call applyMissingState — it should just fall through
  // to "return false" so the last good state is preserved.
  assert.doesNotMatch(
    app,
    /data\?\.state\?\.id === id[\s\S]{0,300}applyMissingState\(\);/
  );

  // The comment explaining why we preserve last state must be present.
  assert.match(app, /Do NOT call applyMissingState here/);
});
