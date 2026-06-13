# REO Player Stats Bridge

Standalone player statistics bridge for REO Live / Player Intel V2.

This service is intentionally separate from the main Hostinger studio and from
the existing `reo-match-bridge`. It exposes one production contract that the
main app already understands through:

```text
REO_PLAYER_STATS_BRIDGE_URL=https://<bridge-host>/api/player-stats
REO_PLAYER_STATS_BRIDGE_TOKEN=<same bearer token>
```

## Why this exists

The existing match bridge is for live WhoScored match extraction:

```text
/api/match
/api/status
/api/control/start
```

It does not expose `/api/player-stats`, so Player Intel falls back to `pending`
values. This bridge owns the player-statistics contract independently.

## Runtime

- Node.js 20.19+ or 22.x
- No npm dependencies
- JSON file store by default
- Bearer-token authentication for all API routes except `/health`
- Atomic JSON writes for import/upsert actions

## Environment

```bash
PORT=3015
REO_PLAYER_STATS_BRIDGE_TOKEN=replace-with-long-random-token
REO_PLAYER_STATS_DATA_FILE=/var/lib/reo-player-stats-bridge/player-stats.json
REO_PLAYER_STATS_ALLOWED_ORIGINS=https://peachpuff-herring-712997.hostingersite.com
```

Do not commit the token or the real data file.

## Endpoints

Public:

```text
GET /health
```

Authenticated:

```text
GET  /api/status
GET  /api/metrics-catalog
GET  /api/player-stats
POST /api/player-stats
POST /api/control/upsert-player
POST /api/control/import-json
GET  /api/control/export-json
```

## Data policy

This service does not invent real football statistics. If a requested player or
metric is missing, it returns `pending` with a warning. Real values appear only
after you import or upsert trusted data.

## Upsert one player

```bash
curl -X POST "$BRIDGE_URL/api/control/upsert-player" \
  -H "Authorization: Bearer $REO_PLAYER_STATS_BRIDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Robert Lewandowski",
    "arabicName": "Robert Lewandowski",
    "club": "Barcelona",
    "season": "2025/26",
    "position": "ST",
    "provider": "trusted-json",
    "sourceUrl": "https://source.example",
    "stats": {
      "goals": { "value": 19, "unit": "", "provider": "trusted-json", "confidence": 0.95 },
      "assists": { "value": 4, "unit": "", "provider": "trusted-json", "confidence": 0.95 },
      "rating": { "value": 7.42, "unit": "", "provider": "trusted-json", "confidence": 0.9 }
    }
  }'
```

## Import batch

```bash
curl -X POST "$BRIDGE_URL/api/control/import-json" \
  -H "Authorization: Bearer $REO_PLAYER_STATS_BRIDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "mode": "merge", "players": [ ... ] }'
```

Use `"mode": "replace"` only when you want to replace the full store.

## Export backup

```bash
curl "$BRIDGE_URL/api/control/export-json" \
  -H "Authorization: Bearer $REO_PLAYER_STATS_BRIDGE_TOKEN"
```

The response contains the current JSON store. Save it before any replace import.

## Verify locally

```bash
npm run verify
```

The verifier starts the bridge on a random local port, writes a temporary player
record, requests stats, and confirms:

- auth is enforced,
- `bridgeConfigured` is true,
- real imported values are returned,
- missing metrics remain `pending`.

## Remote smoke test

After deploying the bridge, run a read-only smoke test from your machine:

```bash
REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats" \
REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>" \
npm run smoke:remote
```

Optional player override:

```bash
npm run smoke:remote -- --player "Bernardo Silva" --club "Manchester City" --metrics goals,assists,rating
```

This checks `/health`, authenticated `/api/status`, and the public player-stats
contract. It does not write data.

Windows PowerShell positional form:

```powershell
$env:REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats"
$env:REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>"
npm run smoke:remote -- "Bernardo Silva" "Manchester City" "goals,assists,rating"
```

## Import/export CLI

Import trusted data:

```bash
REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats" \
REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>" \
npm run import:json -- --file ./players.json
```

Windows PowerShell:

```powershell
$env:REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats"
$env:REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>"
npm run import:json -- .\players.json
```

Replace the full store only when intentional:

```bash
npm run import:json -- --file ./players.json --replace
```

Windows PowerShell:

```powershell
npm run import:json -- .\players.json replace
```

Export a backup:

```bash
REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats" \
REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>" \
npm run export:json -- --out ./player-stats-backup.json
```

Windows PowerShell:

```powershell
npm run export:json -- .\player-stats-backup.json
```

## Hostinger integration

After deploying this bridge as its own Node.js app, set these variables in the
main REO Live Hostinger app:

```bash
REO_PLAYER_STATS_BRIDGE_URL=https://<bridge-host>/api/player-stats
REO_PLAYER_STATS_BRIDGE_TOKEN=<same-token>
```

Then redeploy only the main REO Live app and check:

```bash
curl "https://peachpuff-herring-712997.hostingersite.com/api/player-stats?playerAName=Robert%20Lewandowski&playerAClub=Barcelona&selectedMetrics=goals,assists,rating"
```

Expected:

```json
{
  "bridgeConfigured": true,
  "auth": { "valid": true },
  "realDataAvailable": true,
  "players": [
    {
      "name": "Robert Lewandowski",
      "dataStatus": "ready"
    }
  ]
}
```

Missing metrics remain `pending` instead of being invented.
