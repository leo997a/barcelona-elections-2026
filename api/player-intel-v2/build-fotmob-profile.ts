/**
 * Player Intel V2 — On-Demand FotMob Profile Builder
 *
 * POST /api/player-intel-v2/build-fotmob-profile
 * Body: { fotmobId: number, name?: string, season?: string, force?: boolean }
 *
 * Fetches the player's full _next/data response from FotMob, builds the
 * broadcast.json shape, and stores it in the runtime cache. The frontend
 * mirrors the result in localStorage for cross-session persistence.
 *
 * NO data fabrication: missing metrics are skipped, never invented.
 */
import {
  sendJson,
  sendMethodNotAllowed,
  readJsonBody,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js';
import { getFotMobPlayer } from '../_lib/fotmobClient.js';
import { buildBroadcastFromFotMob } from '../_lib/fotmobBroadcastBuilder.js';
import { saveProfile, getProfile } from '../_lib/fotmobRuntimeStore.js';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(''); return; }
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST, OPTIONS', { ok: false, messageAr: 'يجب استخدام POST.' });
  }

  let body: Record<string, unknown>;
  try { body = await readJsonBody<Record<string, unknown>>(req); }
  catch { return sendJson(res, 400, { ok: false, messageAr: 'صيغة الطلب غير صحيحة.' }); }

  const fotmobId = Number(body.fotmobId);
  const name = String(body.name || '').trim();
  const season = String(body.season || '2025-26').trim();
  const force = Boolean(body.force);

  if (!Number.isFinite(fotmobId) || fotmobId <= 0) {
    return sendJson(res, 400, { ok: false, messageAr: 'معرّف FotMob غير صالح.' });
  }

  // Slug attempt early so we can check cache
  const tentativeSlug = `${name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'player'}-${fotmobId}`;
  if (!force) {
    const cached = getProfile(tentativeSlug);
    if (cached) {
      return sendJson(res, 200, {
        ok: true,
        cached: true,
        slug: tentativeSlug,
        profile: cached,
        messageAr: 'تم استرجاع البروفايل من الكاش.',
      });
    }
  }

  // Fetch from FotMob
  const player = await getFotMobPlayer(fotmobId, name || undefined, force);
  if (!player) {
    return sendJson(res, 200, {
      ok: false,
      reason: 'fetch_failed',
      messageAr: 'تعذر جلب بيانات اللاعب من FotMob. حاول مرة أخرى لاحقًا.',
    });
  }

  // Validate that we got actual player data
  if (!player.raw || typeof player.raw !== 'object' || !player.raw.name) {
    return sendJson(res, 200, {
      ok: false,
      reason: 'invalid_player_data',
      messageAr: 'بيانات اللاعب غير مكتملة في FotMob.',
    });
  }

  // Build broadcast profile
  let result: ReturnType<typeof buildBroadcastFromFotMob>;
  try {
    result = buildBroadcastFromFotMob(player, season);
  } catch (err) {
    return sendJson(res, 200, {
      ok: false,
      reason: 'build_failed',
      messageAr: 'فشل بناء بروفايل البث. تواصل مع المطور.',
      error: String(err),
    });
  }

  const { profile, slug } = result;

  // Validate that we have at least some data
  const hasAnyMetric = profile.qualityReport.broadcastCardsItemTotal > 0;
  if (!hasAnyMetric) {
    return sendJson(res, 200, {
      ok: false,
      reason: 'no_metrics',
      messageAr: 'البيانات المتاحة محدودة لهذا اللاعب. لا توجد إحصائيات موسم كافية.',
      profile,
      slug,
    });
  }

  // Save to runtime store
  saveProfile(slug, profile);

  return sendJson(res, 200, {
    ok: true,
    cached: false,
    slug,
    profile,
    messageAr: `تم بناء بروفايل ${profile.player.name} بنجاح.`,
    summary: {
      metricsCount: profile.qualityReport.fotmobMetricsCount,
      cardsCount: profile.qualityReport.broadcastCardsCount,
      itemsTotal: profile.qualityReport.broadcastCardsItemTotal,
      warnings: profile.qualityReport.warnings,
    },
  });
}
