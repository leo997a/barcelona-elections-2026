import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasArg } from './bridge-cli-utils.mjs';

const bridgeDir = fileURLToPath(new URL('..', import.meta.url));
const outputFile = join(bridgeDir, '.env.generated');
const force = hasArg('--force') || process.argv.includes('force');

if (existsSync(outputFile) && !force) {
  console.log(JSON.stringify({
    ok: false,
    file: outputFile,
    message: 'Secret file already exists. Use --force to replace it.',
  }, null, 2));
  process.exitCode = 1;
} else {
  const token = `rpsb_${randomBytes(32).toString('base64url')}`;
  const content = [
    '# Generated locally. Do not commit this file.',
    'PORT=3015',
    'REO_PLAYER_STATS_BRIDGE_HOST=0.0.0.0',
    `REO_PLAYER_STATS_BRIDGE_TOKEN=${token}`,
    'REO_PLAYER_STATS_DATA_FILE=/var/lib/reo-player-stats-bridge/player-stats.json',
    'REO_PLAYER_STATS_ALLOWED_ORIGINS=https://peachpuff-herring-712997.hostingersite.com',
    'REO_PLAYER_STATS_BRIDGE_URL=https://your-player-stats-bridge.example.com/api/player-stats',
    '',
  ].join('\n');
  writeFileSync(outputFile, content, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    file: outputFile,
    message: 'Generated .env.generated. The secret was written to the file and was not printed.',
  }, null, 2));
}
