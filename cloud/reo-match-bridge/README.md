# REO Match Bridge

Cloud-hosted WhoScored match extractor for the REO broadcast template.

The Vercel app stays on Vercel. This service runs only the extraction bridge on a
Google Compute Engine VM and exposes an authenticated JSON API for Vercel to
proxy.

## Endpoints

- `GET /health` public health check
- `GET /api/status` authenticated status
- `GET /api/match` authenticated latest match payload
- `GET /api/metrics-catalog` authenticated list of supported metrics
- `POST /api/control/set-match` authenticated `{ "url": "https://www.whoscored.com/matches/.../live/..." }`
- `POST /api/control/start` authenticated optional `{ "url": "...", "intervalSec": 60 }`
- `POST /api/control/stop` authenticated manual stop

## Safety Defaults

- One polling worker only.
- Minimum interval defaults to 30 seconds.
- Default extraction interval is 60 seconds.
- Backoff increases after errors.
- Service stops automatically when WhoScored status matches a final status.
- Service stops after `REO_MAX_RUNTIME_SECONDS` even if the final status is not detected.
- Browser cleanup runs under the dedicated `reo-bridge` Linux user.

## Required Environment

`/etc/reo-match-bridge.env`:

```bash
REO_BRIDGE_TOKEN=replace-with-secret
REO_DEFAULT_MATCH_URL=
REO_AUTOSTART=0
REO_EXTRACT_INTERVAL=60
REO_MAX_RUNTIME_SECONDS=14400
REO_ALLOWED_ORIGINS=https://barcelona-elections-2026.vercel.app
PORT=3005
```

Optional GitHub archive after final whistle:

```bash
REO_ARCHIVE_GITHUB_TOKEN=github-token-with-contents-write
REO_ARCHIVE_GITHUB_REPO=owner/repo
REO_ARCHIVE_GITHUB_BRANCH=main
REO_ARCHIVE_BASE_PATH=match-archive
```

When enabled, the bridge writes the final payload into:

```text
match-archive/<season>/<competition>/<round>/<date>_<matchId>_<home>-vs-<away>.json
```

If the file already exists, the bridge updates it using the GitHub Contents API
SHA instead of failing on duplicate paths.

Use Vercel env vars:

```bash
REO_BRIDGE_URL=http://<vm-ip>:3005
REO_BRIDGE_TOKEN=<same-secret>
```
