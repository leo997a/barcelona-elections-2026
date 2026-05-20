/**
 * Player Intel V2 — Player Search API
 *
 * POST /api/player-intel-v2/search-player
 * Body: { query: string, season?: string, mode?: 'search_only' | 'build_profile' }
 *
 * Returns matches from the existing public/player-intel-v2-samples/index.json.
 * Does NOT call /api/player-stats, bridge, VPS, FBref cache, FotMob, or any
 * external service. Pure local search over the registry.
 */
import {
  sendJson,
  sendMethodNotAllowed,
  readJsonBody,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js';
import {
  resolveQuery,
  type RegistryEntry,
} from '../../components/player-intel-v2/playerIntelV2PlayerResolver.js';
import { promises as fs } from 'fs';
import path from 'path';

interface RegistryFile {
  schemaVersion?: string;
  generatedAt?: string;
  playerCount?: number;
  players: RegistryEntry[];
}

async function _readRegistry(): Promise<RegistryFile | null> {
  // Check both source (public/) and serverless-bundled paths
  const candidates = [
    path.join(process.cwd(), 'public', 'player-intel-v2-samples', 'index.json'),
    path.join(process.cwd(), 'dist', 'player-intel-v2-samples', 'index.json'),
  ];
  for (const p of candidates) {
    try {
      const text = await fs.readFile(p, 'utf-8');
      return JSON.parse(text) as RegistryFile;
    } catch {
      // try next
    }
  }
  return null;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST, OPTIONS', {
      ok: false,
      reason: 'method_not_allowed',
      messageAr: 'يجب استخدام POST.',
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody<Record<string, unknown>>(req);
  } catch {
    return sendJson(res, 400, {
      ok: false,
      reason: 'invalid_body',
      messageAr: 'صيغة الطلب غير صحيحة.',
    });
  }

  const query = String(body.query || '').trim();
  if (!query) {
    return sendJson(res, 400, {
      ok: false,
      reason: 'missing_query',
      messageAr: 'يرجى كتابة اسم اللاعب للبحث.',
    });
  }

  const registry = await _readRegistry();
  if (!registry || !Array.isArray(registry.players)) {
    return sendJson(res, 200, {
      ok: false,
      reason: 'registry_unavailable',
      messageAr: 'مكتبة اللاعبين غير جاهزة. شغّل أداة بناء المكتبة محليًا.',
      matches: [],
    });
  }

  const matches = resolveQuery(query, registry.players);
  if (matches.length === 0) {
    return sendJson(res, 200, {
      ok: false,
      reason: 'player_not_found',
      messageAr: 'لم يتم العثور على اللاعب. جرّب كتابة الاسم بالإنجليزي أو أضف النادي.',
      query,
      registrySize: registry.players.length,
      matches: [],
    });
  }

  return sendJson(res, 200, {
    ok: true,
    query,
    registrySize: registry.players.length,
    matches: matches.slice(0, 10).map((m) => ({
      id: m.entry.id,
      name: m.entry.name,
      club: m.entry.club,
      season: m.entry.season,
      position: m.entry.position,
      file: m.entry.file,
      broadcastPath: `/player-intel-v2-samples/${m.entry.file || `${m.entry.id}.broadcast.json`}`,
      confidence: Number(m.score.toFixed(3)),
      alreadyAvailable: m.alreadyAvailable,
    })),
  });
}
