import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const token = 'verify-player-stats-token';
const tempDir = mkdtempSync(join(tmpdir(), 'reo-player-stats-bridge-'));
const dataFile = join(tempDir, 'player-stats.json');
const port = 39115 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const bridgeDir = fileURLToPath(new URL('..', import.meta.url));

const child = spawn(process.execPath, ['server.js'], {
  cwd: bridgeDir,
  env: {
    ...process.env,
    PORT: String(port),
    REO_PLAYER_STATS_BRIDGE_HOST: '127.0.0.1',
    REO_PLAYER_STATS_BRIDGE_TOKEN: token,
    REO_PLAYER_STATS_DATA_FILE: dataFile,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', chunk => {
  output += chunk.toString('utf8');
});
child.stderr.on('data', chunk => {
  output += chunk.toString('utf8');
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function stopChild() {
  if (child.exitCode !== null || child.signalCode) return;
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 1500);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { response, json };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await wait(150);
    }
  }
  throw new Error(`Bridge did not start. Output:\n${output}`);
}

try {
  await waitForServer();

  const unauthorized = await fetch(`${baseUrl}/api/status`);
  if (unauthorized.status !== 401) throw new Error(`Expected 401 without token, got ${unauthorized.status}`);

  const upsert = await request('/api/control/upsert-player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Robert Lewandowski',
      arabicName: '\u0631\u0648\u0628\u0631\u062a \u0644\u064a\u0641\u0627\u0646\u062f\u0648\u0641\u0633\u0643\u064a',
      club: 'Barcelona',
      season: '2025/26',
      position: 'ST',
      provider: 'verified-json',
      sourceUrl: 'https://example.test/source',
      stats: {
        goals: { value: 19, unit: '', provider: 'verified-json', confidence: 0.96 },
        assists: { value: 4, unit: '', provider: 'verified-json', confidence: 0.96 },
        rating: { value: 7.42, unit: '', provider: 'verified-json', confidence: 0.9 },
      },
    }),
  });
  if (!upsert.response.ok || !upsert.json.ok) throw new Error('upsert-player failed');

  const status = await request('/api/status');
  if (status.json.playerCount !== 1) throw new Error(`Expected playerCount=1, got ${status.json.playerCount}`);

  const stats = await request('/api/player-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'SINGLE',
      season: '2025/26',
      player: { name: 'Robert Lewandowski', club: 'Barcelona' },
      selectedMetrics: ['goals', 'assists', 'rating', 'shots'],
      providerPolicy: 'auto',
    }),
  });
  if (!stats.response.ok) throw new Error(`player-stats failed with HTTP ${stats.response.status}`);
  if (!stats.json.bridgeConfigured) throw new Error('bridgeConfigured should be true');
  if (!stats.json.auth?.valid) throw new Error('auth.valid should be true');
  if (!stats.json.realDataAvailable) throw new Error('realDataAvailable should be true');
  const player = stats.json.players?.[0];
  if (player?.stats?.goals?.value !== 19) throw new Error('goals value was not returned from store');
  if (player?.stats?.shots?.value !== 'pending') throw new Error('missing metric should be pending, not fake');

  const exported = await request('/api/control/export-json');
  if (!exported.response.ok) throw new Error(`export-json failed with HTTP ${exported.response.status}`);
  if (exported.json.players?.length !== 1) throw new Error('export-json should include the imported player');

  console.log(JSON.stringify({
    ok: true,
    status: status.json,
    sample: {
      bridgeConfigured: stats.json.bridgeConfigured,
      realDataAvailable: stats.json.realDataAvailable,
      player: player.name,
      goals: player.stats.goals.value,
      missingMetric: player.stats.shots.value,
      exportedPlayers: exported.json.players.length,
    },
  }, null, 2));
} finally {
  await stopChild();
  rmSync(tempDir, { recursive: true, force: true });
}
