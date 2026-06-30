/**
 * server.js — REO Unified Transfers (FotMob + Transfermarkt)
 * يخدم لوحة بصرية + واجهة دمج + زر تحديث حيّ.
 *
 * المسارات:
 *   GET /                      → لوحة المعاينة
 *   GET /api/feed?view=fee|latest   → بطاقات مدموجة (من الكاش)
 *   GET /api/refresh?view=...        → التقاط حيّ من FotMob ثم دمج (يشغّل Chrome)
 *   GET /health
 *
 * ملاحظة: الصور/الشعارات تأتي مباشرة من images.fotmob.com عبر وسم <img> في المتصفح.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureFotmobTransfers } from './lib/fotmobCapture.mjs';
import { buildSnapshot } from './lib/normalize.mjs';
import { mergeSnapshot } from './lib/mergeSources.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4319);
const HOST = process.env.HOST || '0.0.0.0';
const BRIDGE_TOKEN = process.env.REO_TRANSFERS_BRIDGE_TOKEN || process.env.REO_BRIDGE_TOKEN || '';
const dataDir = resolve(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

// ── متجر Transfermarkt المرجعي (حقيقي إن وُجد، وإلا بذرة DEMO) ──
function loadTmStore() {
  const real = resolve(__dirname, '..', 'REO-TRANSFERMARKT-INTEL', 'bridge', 'data', 'transfermarkt-store.json');
  const demo = resolve(__dirname, '..', 'REO-TRANSFERMARKT-INTEL', 'preview', 'seed-demo.json');
  for (const f of [real, demo]) {
    if (existsSync(f)) {
      try {
        const j = JSON.parse(readFileSync(f, 'utf8'));
        return { players: j.players || [], clubs: j.clubs || [] };
      } catch {}
    }
  }
  return { players: [], clubs: [] };
}
let TM_STORE = loadTmStore();

function snapshotPath(view) { return join(dataDir, `transfers-${view}.json`); }

function readCachedSnapshot(view) {
  const p = snapshotPath(view);
  if (existsSync(p)) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch {} }
  return null;
}

function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function isAuthorized(req) {
  if (!BRIDGE_TOKEN) return true;
  return req.headers.authorization === `Bearer ${BRIDGE_TOKEN}`;
}

function sendUnauthorized(res) {
  return sendJson(res, 401, { ok: false, error: 'Unauthorized mercato bridge request' });
}

async function refresh(view) {
  const cap = await captureFotmobTransfers({ view, popular: true });
  if (!cap.ok) return null;
  const snap = buildSnapshot(cap.transfers, view, { hits: cap.hits, maxFee: cap.maxFee });
  writeFileSync(snapshotPath(view), JSON.stringify(snap, null, 1), 'utf8');
  return snap;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.end('');
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(readFileSync(join(__dirname, 'dashboard.html')));
    return;
  }
  if (url.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'reo-mercato-bridge', tmPlayers: TM_STORE.players.length });

  if (url.pathname === '/overview') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(readFileSync(join(__dirname, 'overview.html')));
    return;
  }

  if (url.pathname === '/api/feed') {
    if (!isAuthorized(req)) return sendUnauthorized(res);
    const view = url.searchParams.get('view') === 'latest' ? 'latest' : 'fee';
    let snap = readCachedSnapshot(view);
    if (!snap) snap = await refresh(view);
    if (!snap) return sendJson(res, 503, { ok: false, error: 'no data; try /api/refresh' });
    return sendJson(res, 200, mergeSnapshot(snap, TM_STORE));
  }

  if (url.pathname === '/api/refresh') {
    if (!isAuthorized(req)) return sendUnauthorized(res);
    const view = url.searchParams.get('view') === 'latest' ? 'latest' : 'fee';
    try {
      const snap = await refresh(view);
      if (!snap) return sendJson(res, 502, { ok: false, error: 'capture failed' });
      TM_STORE = loadTmStore();
      return sendJson(res, 200, mergeSnapshot(snap, TM_STORE));
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : 'error' });
    }
  }

  res.statusCode = 404; res.end('Not found');
});

server.listen(PORT, HOST, () => console.log(`\n  REO Unified Transfers -> http://${HOST}:${PORT}\n`));
