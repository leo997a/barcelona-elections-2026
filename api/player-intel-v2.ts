/**
 * Player Intel V2 — Unified action router.
 *
 * POST /api/player-intel-v2
 * Body: { action: "search-player" | "fotmob-search" | "build-fotmob-profile", ... }
 *
 * Replaces three separate endpoints (search-player.ts, fotmob-search.ts,
 * build-fotmob-profile.ts) with one Vercel Serverless Function to stay under
 * the Hobby plan limit of 12 functions.
 *
 * Logic lives in api/_lib/playerIntelV2Handlers.ts; this file is just routing.
 */
import {
  sendJson,
  sendMethodNotAllowed,
  readJsonBody,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import {
  handleSearchPlayer,
  handleFotMobSearch,
  handleBuildFotMobProfile,
  handleClubResolve,
} from './_lib/playerIntelV2Handlers.js';

const ALLOWED_ACTIONS = ['search-player', 'fotmob-search', 'build-fotmob-profile', 'club-resolve'] as const;

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
      messageAr: 'يجب استخدام POST.',
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody<Record<string, unknown>>(req);
  } catch {
    return sendJson(res, 400, { ok: false, messageAr: 'صيغة الطلب غير صحيحة.' });
  }

  const action = String(body.action || '').trim();
  if (!action) {
    return sendJson(res, 400, {
      ok: false,
      reason: 'missing_action',
      messageAr: 'يجب تحديد action داخل body.',
      allowedActions: ALLOWED_ACTIONS,
    });
  }

  try {
    let result;
    switch (action) {
      case 'search-player':
        result = await handleSearchPlayer(body);
        break;
      case 'fotmob-search':
        result = await handleFotMobSearch(body);
        break;
      case 'build-fotmob-profile':
        result = await handleBuildFotMobProfile(body);
        break;
      case 'club-resolve':
        result = await handleClubResolve(body);
        break;
      default:
        return sendJson(res, 400, {
          ok: false,
          reason: 'unknown_action',
          messageAr: `الـ action "${action}" غير معروف.`,
          allowedActions: ALLOWED_ACTIONS,
        });
    }
    return sendJson(res, result.status, result.body);
  } catch (err) {
    // Never leak stack traces to clients
    return sendJson(res, 500, {
      ok: false,
      reason: 'internal_error',
      messageAr: 'حدث خطأ داخلي. حاول لاحقًا.',
    });
  }
}
