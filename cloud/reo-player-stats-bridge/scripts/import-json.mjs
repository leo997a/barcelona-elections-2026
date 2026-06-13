import {
  bridgeFetch,
  hasArg,
  positionalArgs,
  printSummary,
  readArg,
  readJsonFile,
  resolveBridgeConfig,
  serviceUrl,
} from './bridge-cli-utils.mjs';

const positional = positionalArgs();
const filePath = readArg('--file') || positional.find(arg => arg.toLowerCase().endsWith('.json')) || positional[0];
if (!filePath) {
  throw new Error('Usage: npm run import:json -- ./players.json [replace]');
}

const input = readJsonFile(filePath);
const players = Array.isArray(input) ? input : input.players;
if (!Array.isArray(players) || players.length === 0) {
  throw new Error('Import file must be an array or an object with a non-empty players array.');
}

const config = resolveBridgeConfig();
const mode = hasArg('--replace') || positional.includes('replace') || process.env.REO_PLAYER_STATS_IMPORT_MODE === 'replace' || input.mode === 'replace' ? 'replace' : 'merge';
const result = await bridgeFetch(config, serviceUrl(config, '/api/control/import-json'), {
  method: 'POST',
  body: JSON.stringify({ mode, players }),
});

printSummary({
  ok: true,
  action: result.action,
  mode: result.mode,
  imported: result.imported,
  playerCount: result.playerCount,
  updatedAt: result.updatedAt,
});
