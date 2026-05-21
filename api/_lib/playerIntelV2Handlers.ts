/**
 * Player Intel V2 — handler functions (logic only, no Vercel routing).
 *
 * Used by /api/player-intel-v2.ts (unified router) to dispatch by action.
 * Each handler returns { status: number; body: unknown } for the router to send.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { searchFotMob, getFotMobPlayer, type FotMobSuggestion } from './fotmobClient.js';
import { buildBroadcastFromFotMob } from './fotmobBroadcastBuilder.js';
import { saveProfile, getProfile } from './fotmobRuntimeStore.js';
import {
  resolveQuery,
  type RegistryEntry,
} from '../../components/player-intel-v2/playerIntelV2PlayerResolver.js';

export interface HandlerResult {
  status: number;
  body: unknown;
}

// ─── Arabic translation maps (kept in this file so router stays slim) ────────

const AR_PLAYER_MAP: Record<string, string> = {
  'يامال': 'Yamal', 'لامين يامال': 'Lamine Yamal', 'لامين': 'Lamine',
  'ليفاندوفسكي': 'Lewandowski', 'ليفاندوفسكى': 'Lewandowski',
  'بالمر': 'Palmer', 'كول بالمر': 'Cole Palmer',
  'مبابي': 'Mbappe', 'كيليان مبابي': 'Kylian Mbappe',
  'هالاند': 'Haaland', 'إيرلينغ هالاند': 'Erling Haaland',
  'بيدري': 'Pedri',
  'غافي': 'Gavi',
  'رافينيا': 'Raphinha', 'رافينها': 'Raphinha',
  'فينيسيوس': 'Vinicius', 'فيني': 'Vinicius',
  'بيلينغهام': 'Bellingham', 'جود بيلينغهام': 'Jude Bellingham',
  'صلاح': 'Salah', 'محمد صلاح': 'Mohamed Salah',
  'كين': 'Kane', 'هاري كين': 'Harry Kane',
  'نيكو ويليامز': 'Nico Williams', 'ويليامز': 'Williams',
  'لاوتارو': 'Lautaro', 'لاوتارو مارتينيز': 'Lautaro Martinez',
  'الفاريز': 'Alvarez', 'جوليان الفاريز': 'Julian Alvarez',
  'ديمبيلي': 'Dembele', 'عثمان ديمبيلي': 'Ousmane Dembele',
  'دي يونغ': 'de Jong',
  'فيرمين': 'Fermin', 'فيرمين لوبيز': 'Fermin Lopez',
  'كاسادو': 'Casado', 'مارك كاسادو': 'Marc Casado',
  'كوبارسي': 'Cubarsi', 'باو كوبارسي': 'Pau Cubarsi',
  'إنزو': 'Enzo', 'إنزو فيرنانديز': 'Enzo Fernandez',
  'كايسيدو': 'Caicedo', 'موسى كايسيدو': 'Moises Caicedo',
  'فودين': 'Foden',
  'ديبروين': 'De Bruyne', 'كيفن دي بروين': 'Kevin De Bruyne',
  'رودري': 'Rodri',
  'ساكا': 'Saka', 'بوكايو ساكا': 'Bukayo Saka',
  'مارتينيلي': 'Martinelli',
  'أوديغارد': 'Odegaard', 'مارتن أوديغارد': 'Martin Odegaard',
  'فان دايك': 'van Dijk', 'فيرجيل فان دايك': 'Virgil van Dijk',
  'أليسون': 'Alisson',
  'كورتوا': 'Courtois', 'تيبو كورتوا': 'Thibaut Courtois',
  'كانسيلو': 'Cancelo',
  'مودريتش': 'Modric', 'لوكا مودريتش': 'Luka Modric',
  'كروس': 'Kroos', 'توني كروس': 'Toni Kroos',
  'فالفيردي': 'Valverde', 'فيدي فالفيردي': 'Fede Valverde',
  'كامافينغا': 'Camavinga', 'إدواردو كامافينغا': 'Eduardo Camavinga',
  'تشواميني': 'Tchouameni', 'أوريليان تشواميني': 'Aurelien Tchouameni',
  'رودريغو': 'Rodrygo',
};

const AR_CLUB_MAP: Record<string, string> = {
  'برشلونة': 'Barcelona', 'برشلونه': 'Barcelona',
  'تشيلسي': 'Chelsea', 'تشيلسى': 'Chelsea',
  'ريال مدريد': 'Real Madrid', 'ريال': 'Real',
  'باريس سان جيرمان': 'PSG', 'باريس': 'PSG', 'سان جيرمان': 'PSG',
  'مانشستر سيتي': 'Manchester City', 'مان سيتي': 'Manchester City',
  'مانشستر يونايتد': 'Manchester United', 'مان يونايتد': 'Manchester United',
  'ليفربول': 'Liverpool',
  'بايرن ميونخ': 'Bayern Munich', 'بايرن': 'Bayern',
  'بوروسيا دورتموند': 'Borussia Dortmund', 'دورتموند': 'Dortmund',
  'يوفنتوس': 'Juventus', 'يوفي': 'Juventus',
  'ميلان': 'Milan', 'إيه سي ميلان': 'AC Milan',
  'انتر ميلان': 'Inter', 'انتر': 'Inter', 'إنتر': 'Inter',
  'نابولي': 'Napoli',
  'أرسنال': 'Arsenal', 'ارسنال': 'Arsenal',
  'توتنهام': 'Tottenham',
  'أتلتيكو مدريد': 'Atletico Madrid', 'أتلتيكو': 'Atletico',
  'أتلتيك بلباو': 'Athletic Club', 'أتلتيك': 'Athletic Club',
  'إشبيلية': 'Sevilla',
  'بيتيس': 'Real Betis',
  'فالنسيا': 'Valencia',
  'فياريال': 'Villarreal',
};

function _normalizeArabic(s: string): string {
  if (!s) return '';
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/[\u0624\u0626]/g, '\u0621')
    .replace(/\s+/g, ' ')
    .trim();
}

function _hasArabicChars(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

interface TranslatedQuery {
  player: string | null;
  club: string | null;
  englishTerm: string;
}

function _translateQuery(query: string): TranslatedQuery {
  if (!_hasArabicChars(query)) {
    return { player: null, club: null, englishTerm: query.trim() };
  }
  const norm = _normalizeArabic(query);
  let player: string | null = null;
  let club: string | null = null;
  const playerEntries = Object.entries(AR_PLAYER_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of playerEntries) {
    if (norm.includes(_normalizeArabic(ar))) { player = en; break; }
  }
  const clubEntries = Object.entries(AR_CLUB_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of clubEntries) {
    if (norm.includes(_normalizeArabic(ar))) { club = en; break; }
  }
  const englishTerm = [player, club].filter(Boolean).join(' ').trim() || query;
  return { player, club, englishTerm };
}

interface RankedMatch {
  fotmobId: number;
  name: string;
  arabicName: string | null;
  club: string;
  position: string;
  confidence: number;
  isCoach: boolean;
}

function _rankMatches(suggestions: FotMobSuggestion[], translated: TranslatedQuery, originalQuery: string): RankedMatch[] {
  const desiredClub = (translated.club || '').toLowerCase();
  const desiredPlayer = (translated.player || translated.englishTerm).toLowerCase();
  return suggestions
    .filter((s) => !s.isCoach && s.fotmobId > 0)
    .map((s) => {
      const nameLower = s.name.toLowerCase();
      const teamLower = (s.teamName || '').toLowerCase();
      let confidence = 0;
      const nameTokens = desiredPlayer.split(/\s+/).filter((t) => t.length >= 3);
      const nameHits = nameTokens.filter((t) => nameLower.includes(t)).length;
      if (nameTokens.length > 0) confidence += (nameHits / nameTokens.length) * 0.6;
      if (desiredClub && teamLower.includes(desiredClub.split(/\s+/)[0])) confidence += 0.3;
      if (typeof s.score === 'number') confidence += Math.min(s.score / 100, 0.1);
      return {
        fotmobId: s.fotmobId,
        name: s.name,
        arabicName: _hasArabicChars(originalQuery) && translated.player ? originalQuery : null,
        club: s.teamName || '',
        position: '',
        confidence: Number(Math.min(1, confidence).toFixed(3)),
        isCoach: !!s.isCoach,
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

// ─── Handler 1: search-player (local registry only) ──────────────────────────

interface RegistryFile { players: RegistryEntry[]; }

async function _readRegistry(): Promise<RegistryFile | null> {
  const candidates = [
    path.join(process.cwd(), 'public', 'player-intel-v2-samples', 'index.json'),
    path.join(process.cwd(), 'dist', 'player-intel-v2-samples', 'index.json'),
  ];
  for (const p of candidates) {
    try {
      const text = await fs.readFile(p, 'utf-8');
      return JSON.parse(text) as RegistryFile;
    } catch { /* try next */ }
  }
  return null;
}

export async function handleSearchPlayer(body: Record<string, unknown>): Promise<HandlerResult> {
  const query = String(body.query || '').trim();
  if (!query) {
    return { status: 400, body: { ok: false, reason: 'missing_query', messageAr: 'يرجى كتابة اسم اللاعب للبحث.' } };
  }
  const registry = await _readRegistry();
  if (!registry || !Array.isArray(registry.players)) {
    return {
      status: 200,
      body: { ok: false, reason: 'registry_unavailable', messageAr: 'مكتبة اللاعبين غير جاهزة.', matches: [] },
    };
  }
  const matches = resolveQuery(query, registry.players);
  if (matches.length === 0) {
    return {
      status: 200,
      body: {
        ok: false,
        reason: 'player_not_found',
        messageAr: 'لم يتم العثور على اللاعب. جرّب كتابة الاسم بالإنجليزي أو أضف النادي.',
        query,
        registrySize: registry.players.length,
        matches: [],
      },
    };
  }
  return {
    status: 200,
    body: {
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
    },
  };
}

// ─── Handler 2: fotmob-search (live FotMob search) ───────────────────────────

export async function handleFotMobSearch(body: Record<string, unknown>): Promise<HandlerResult> {
  const query = String(body.query || '').trim();
  if (!query) {
    return { status: 400, body: { ok: false, messageAr: 'يرجى كتابة اسم اللاعب.' } };
  }
  const translated = _translateQuery(query);
  if (!translated.englishTerm) {
    return {
      status: 200,
      body: { ok: false, messageAr: 'لم يتم التعرف على الاسم. جرّب كتابته بالإنجليزي مع اسم النادي.', query },
    };
  }
  const suggestions = await searchFotMob(translated.englishTerm);
  if (suggestions.length === 0) {
    if (translated.player && translated.player !== translated.englishTerm) {
      const fallback = await searchFotMob(translated.player);
      if (fallback.length > 0) {
        return {
          status: 200,
          body: {
            ok: true,
            query,
            translated: translated.englishTerm,
            messageAr: 'تم العثور على نتائج بالاسم الأساسي.',
            matches: _rankMatches(fallback, translated, query),
          },
        };
      }
    }
    return {
      status: 200,
      body: {
        ok: false,
        query,
        translated: translated.englishTerm,
        messageAr: 'لم يتم العثور على اللاعب في FotMob. جرّب الاسم الكامل بالإنجليزية.',
        matches: [],
      },
    };
  }
  const ranked = _rankMatches(suggestions, translated, query);
  if (ranked.length === 0) {
    return {
      status: 200,
      body: {
        ok: false,
        query,
        translated: translated.englishTerm,
        messageAr: 'تم العثور على نتائج لكن لم يتطابق أي منها مع طلبك.',
        matches: [],
      },
    };
  }
  return {
    status: 200,
    body: {
      ok: true,
      query,
      translated: translated.englishTerm,
      messageAr: ranked.length === 1 ? 'تم العثور على نتيجة واحدة.' : `تم العثور على ${ranked.length} نتائج محتملة.`,
      matches: ranked,
    },
  };
}

// ─── Handler 3: build-fotmob-profile ─────────────────────────────────────────

export async function handleBuildFotMobProfile(body: Record<string, unknown>): Promise<HandlerResult> {
  const fotmobId = Number(body.fotmobId);
  const name = String(body.name || '').trim();
  const season = String(body.season || '2025-26').trim();
  const force = Boolean(body.force);

  if (!Number.isFinite(fotmobId) || fotmobId <= 0) {
    return { status: 400, body: { ok: false, messageAr: 'معرّف FotMob غير صالح.' } };
  }
  const tentativeSlug =
    `${name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'player'}-${fotmobId}`;
  if (!force) {
    const cached = getProfile(tentativeSlug);
    if (cached) {
      return {
        status: 200,
        body: { ok: true, cached: true, slug: tentativeSlug, profile: cached, messageAr: 'تم استرجاع البروفايل من الكاش.' },
      };
    }
  }
  const player = await getFotMobPlayer(fotmobId, name || undefined, force);
  if (!player) {
    return {
      status: 200,
      body: { ok: false, reason: 'fetch_failed', messageAr: 'تعذر جلب بيانات اللاعب من FotMob. حاول مرة أخرى لاحقًا.' },
    };
  }
  if (!player.raw || typeof player.raw !== 'object' || !player.raw.name) {
    return {
      status: 200,
      body: { ok: false, reason: 'invalid_player_data', messageAr: 'بيانات اللاعب غير مكتملة في FotMob.' },
    };
  }
  let result: ReturnType<typeof buildBroadcastFromFotMob>;
  try {
    result = buildBroadcastFromFotMob(player, season);
  } catch (err) {
    return {
      status: 200,
      body: { ok: false, reason: 'build_failed', messageAr: 'فشل بناء بروفايل البث.', error: String(err) },
    };
  }
  const { profile, slug } = result;
  if (profile.qualityReport.broadcastCardsItemTotal === 0) {
    return {
      status: 200,
      body: {
        ok: false,
        reason: 'no_metrics',
        messageAr: 'البيانات المتاحة محدودة لهذا اللاعب. لا توجد إحصائيات موسم كافية.',
        profile,
        slug,
      },
    };
  }
  saveProfile(slug, profile);
  return {
    status: 200,
    body: {
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
    },
  };
}
