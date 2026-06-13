import { positionalArgs, printSummary, readArg, readJsonFile } from './bridge-cli-utils.mjs';

const positional = positionalArgs();
const filePath = readArg('--file') || positional.find(arg => arg.toLowerCase().endsWith('.json')) || positional[0];
if (!filePath) {
  throw new Error('Usage: npm run validate:json -- ./players.json');
}

const input = readJsonFile(filePath);
const players = Array.isArray(input) ? input : input.players;
if (!Array.isArray(players)) {
  throw new Error('File must be an array or an object with players array.');
}

const errors = [];
const warnings = [];
const seasons = new Set();
const clubs = new Set();
let statCount = 0;

function addError(index, message) {
  errors.push(`players[${index}]: ${message}`);
}

function addWarning(index, message) {
  warnings.push(`players[${index}]: ${message}`);
}

players.forEach((player, index) => {
  if (!player || typeof player !== 'object' || Array.isArray(player)) {
    addError(index, 'record must be an object');
    return;
  }

  if (!String(player.name || '').trim()) addError(index, 'name is required');
  if (!String(player.club || '').trim()) addError(index, 'club is required');
  if (!String(player.season || '').trim()) addWarning(index, 'season is missing; bridge will default to 2025/26');
  if (!String(player.provider || '').trim()) addWarning(index, 'provider is missing');
  if (!String(player.sourceUrl || '').trim()) addWarning(index, 'sourceUrl is missing');

  if (player.season) seasons.add(String(player.season));
  if (player.club) clubs.add(String(player.club));

  const stats = player.stats && typeof player.stats === 'object' && !Array.isArray(player.stats) ? player.stats : null;
  if (!stats) {
    addWarning(index, 'stats object is missing');
    return;
  }

  for (const [key, stat] of Object.entries(stats)) {
    statCount += 1;
    if (!key.trim()) addError(index, 'stat key must not be empty');
    if (stat && typeof stat === 'object' && !Array.isArray(stat)) {
      if (!('value' in stat)) addError(index, `stat "${key}" is missing value`);
      if (!String(stat.provider || player.provider || '').trim()) addWarning(index, `stat "${key}" provider is missing`);
    }
  }
});

printSummary({
  ok: errors.length === 0,
  file: filePath,
  playerCount: players.length,
  statCount,
  seasons: [...seasons],
  clubs: [...clubs],
  errors,
  warnings,
});

if (errors.length) process.exitCode = 1;

