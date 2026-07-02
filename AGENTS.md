# Agent Instructions

## Live Output / OBS Red Lines

This repository has a documented critical incident for hosted output visibility:

- Incident report: `reports-ar/live-output-visibility-incident/2026-07-02-final-root-cause-and-fix.md`
- Agent red lines: `reports-ar/live-output-visibility-incident/RED_LINES_FOR_AGENTS.md`

For any change touching hosted output, OBS links, IN/OUT visibility, `OverlayRenderer`, `App.tsx` output mode, `api/_lib/liveStore.ts`, `/api/live`, `/api/stream`, or editor visibility controls:

1. Do not declare the task complete from editor preview only. Verify the real hosted `/output/...?...obs=1` link after deploy.
2. Editor preview must stay visible for editing. SHOW/HIDE and IN/OUT are live-output behavior only unless the user explicitly asks otherwise.
3. Never place React hooks after an early return in render paths that can switch from hidden fallback to visible live state.
4. `liveStore` must reject every stale or equal client version: `clientVersion <= previousClientVersion` must not write, even if the payload differs.
5. Hosted live state must not depend only on a release-local directory. Keep the persistent file store outside the changing release folder, or use an explicit stable `REO_LIVE_STATE_DIR`.
6. OBS output links must not show a click-to-enable-audio gate. `obs=1` should render the output directly.
7. Verification minimum: run `node --test tests/mondial-runtime-controls.test.mjs tests/template-image-export.test.mjs`, `npx tsc --noEmit`, and `npm run build`; then verify the hosted asset, `/api/live`, and real browser render.
8. If a deploy restarts Hostinger, re-check that `/api/live?id=<overlay-id>&full=1` still returns the expected state and does not fall back to 404.
9. If live state is reseeded during verification, restore the final expected visible state before finishing.

These are blocking rules, not suggestions.
