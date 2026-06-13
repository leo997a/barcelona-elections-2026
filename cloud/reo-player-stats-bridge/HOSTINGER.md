# Hostinger Deployment Runbook

This service must be deployed as a separate Node.js app from the main REO Live
studio. Do not reuse the main app slot unless you intentionally want to replace
the working studio.

## 1. Create a New Node.js App

In Hostinger:

```text
Websites -> Node.js -> Add / Start
```

Choose GitHub import:

```text
Repository: barcelona-elections-2026
Branch: main
Root directory: cloud/reo-player-stats-bridge
```

Use these settings:

```text
Framework preset: Other / Node.js
Node.js version: 22.x
Package manager: npm
Install command: npm install
Build command: npm run hostinger:build
Start command: npm start
Entry file: server.js
```

If Hostinger only shows an entry-file field, use:

```text
server.js
```

If it asks for output directory, leave it empty. This is an API service, not a
static Vite/Next build.

Why not `npm run verify` as the Hostinger build command?

`npm run verify` starts a temporary local server and runs contract tests. It is
excellent on your machine before deployment, but hosting build environments can
block temporary ports or behave differently. `npm run hostinger:build` performs
a lightweight syntax check that is safer for Hostinger's build step.

Before pushing a release, still run locally:

```powershell
npm run verify
```

## 2. Environment Variables

Set these on the bridge app itself:

```text
REO_PLAYER_STATS_BRIDGE_TOKEN=<new-long-token>
REO_PLAYER_STATS_DATA_FILE=./data/player-stats.json
REO_PLAYER_STATS_ALLOWED_ORIGINS=https://peachpuff-herring-712997.hostingersite.com
```

Optional:

```text
PORT=<Hostinger usually sets this automatically>
REO_PLAYER_STATS_BRIDGE_HOST=0.0.0.0
```

Do not set `REO_PLAYER_STATS_BRIDGE_URL` on the bridge app. That variable is for
the main REO Live app after the bridge is live.

The `./data/player-stats.json` path is the safest first Hostinger test value
because it stays inside this app. Treat it as experimental until you confirm
Hostinger keeps the file across redeploys. For permanent production storage, a
VPS path such as `/var/lib/reo-player-stats-bridge/player-stats.json` is better.

## 3. First Smoke Test

After deployment, open:

```text
https://<bridge-host>/health
```

Expected:

```json
{
  "ok": true,
  "authConfigured": true
}
```

Then from your local machine:

```powershell
cd "C:\New folder\barcelona-elections-2026\cloud\reo-player-stats-bridge"
$env:REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats"
$env:REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>"
npm run smoke:remote
```

Before importing data, `realDataAvailable` may be false. That is correct.

## 4. Import Trusted Data

Validate first:

```powershell
npm run validate:json -- .\players.json
```

Import:

```powershell
npm run import:json -- .\players.json
```

Check again:

```powershell
npm run smoke:remote -- "Bernardo Silva" "Manchester City" "goals,assists,rating"
```

## 5. Connect Main REO Live App

Only after smoke tests pass, add these variables to the main REO Live Hostinger
app:

```text
REO_PLAYER_STATS_BRIDGE_URL=https://<bridge-host>/api/player-stats
REO_PLAYER_STATS_BRIDGE_TOKEN=<same-token>
```

Redeploy the main REO Live app.

## 6. Verification After Main App Redeploy

Check:

```text
https://peachpuff-herring-712997.hostingersite.com/api/player-stats?playerAName=Bernardo%20Silva&playerAClub=Manchester%20City&selectedMetrics=goals,assists,rating
```

Expected:

```text
bridgeConfigured=true
auth.valid=true
```

If the player was imported, also expect:

```text
realDataAvailable=true
players[0].dataStatus=ready
```

Then test Player Intel V2 from the UI.

## 7. Rollback

If anything looks wrong:

1. Remove `REO_PLAYER_STATS_BRIDGE_URL` from the main REO Live app.
2. Redeploy the main app.
3. The app will return to compatibility fallback.

This should not affect Output, Control, OBS, Stream Deck, or license login.
