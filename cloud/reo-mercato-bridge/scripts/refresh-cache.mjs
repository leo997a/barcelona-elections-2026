/**
 * refresh-cache.mjs
 * يلتقط الخلاصتين (الأغلى + الأحدث) ويخزّنهما في data/ كلقطات REO جاهزة.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureFotmobTransfers } from '../lib/fotmobCapture.mjs';
import { buildSnapshot } from '../lib/normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

for (const view of ['fee', 'latest']) {
  process.stdout.write(`capturing ${view}… `);
  const cap = await captureFotmobTransfers({ view, popular: true });
  if (!cap.ok) { console.log('FAILED'); continue; }
  const snap = buildSnapshot(cap.transfers, view, { hits: cap.hits, maxFee: cap.maxFee });
  writeFileSync(resolve(dataDir, `transfers-${view}.json`), JSON.stringify(snap, null, 1), 'utf8');
  console.log(`ok → ${snap.count} transfers (season ${snap.season}), top: ${snap.transfers[0]?.name} ${snap.transfers[0]?.feeLabel}`);
}
console.log('done.');
