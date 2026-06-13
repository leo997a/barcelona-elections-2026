import {
  bridgeFetch,
  printSummary,
  readArg,
  resolveBridgeConfig,
  serviceUrl,
  writeJsonFile,
} from './bridge-cli-utils.mjs';

const config = resolveBridgeConfig();
const outputPath = readArg('--out') || process.argv[2] || '';
const result = await bridgeFetch(config, serviceUrl(config, '/api/control/export-json'));

const exportPayload = {
  version: result.version || 1,
  updatedAt: result.updatedAt || null,
  players: Array.isArray(result.players) ? result.players : [],
};

if (outputPath) {
  writeJsonFile(outputPath, exportPayload);
  printSummary({
    ok: true,
    action: 'export-json',
    outputPath,
    playerCount: exportPayload.players.length,
    updatedAt: exportPayload.updatedAt,
  });
} else {
  printSummary(exportPayload);
}
