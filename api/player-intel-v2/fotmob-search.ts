/**
 * Player Intel V2 — FotMob Live Search API
 *
 * POST /api/player-intel-v2/fotmob-search
 * Body: { query: string, season?: string }
 *
 * Translates Arabic player/club names to English, then searches FotMob's
 * apigw.fotmob.com/searchapi/suggest endpoint.
 *
 * Returns ranked candidates for the user to confirm.
 */
import {
  sendJson,
  sendMethodNotAllowed,
  readJsonBody,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js';
import { searchFotMob, type FotMobSuggestion } from '../_lib/fotmobClient.js';

// ─── Arabic translation maps (kept compact — same source as Python tool) ─────

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
  'ميتلاند نايلي': 'Maitland-Niles',
  'كانسيلو': 'Cancelo',
  'مودريتش': 'Modric', 'لوكا مودريتش': 'Luka Modric',
  'كروس': 'Kroos', 'توني كروس': 'Toni Kroos',
  'فالفيردي': 'Valverde', 'فيدي فالفيردي': 'Fede Valverde',
  'كامافينغا': 'Camavinga', 'إدواردو كامافينغا': 'Eduardo Camavinga',
  'تشواميني': 'Tchouameni', 'أوريليان تشواميني': 'Aurelien Tchouameni',
  'رودريغو': 'Rodrygo',
  'أنشيلوتي': 'Ancelotti', // coach
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
    .replace(/[\u064B-\u065F\u0670]/g, '') // tashkeel
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u0622\u0623\u0625]/g, '\u0627') // alef variants
    .replace(/\u0649/g, '\u064A') // yaa
    .replace(/[\u0624\u0626]/g, '\u0621') // hamza
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
    // English already — try to split into player + club heuristically
    return { player: null, club: null, englishTerm: query.trim() };
  }

  const norm = _normalizeArabic(query);
  let player: string | null = null;
  let club: string | null = null;

  // Match player (longest first)
  const playerEntries = Object.entries(AR_PLAYER_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of playerEntries) {
    if (norm.includes(_normalizeArabic(ar))) { player = en; break; }
  }
  // Match club (longest first)
  const clubEntries = Object.entries(AR_CLUB_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of clubEntries) {
    if (norm.includes(_normalizeArabic(ar))) { club = en; break; }
  }

  // Build English search term
  const englishTerm = [player, club].filter(Boolean).join(' ').trim() || query;
  return { player, club, englishTerm };
}

// ─── Rank suggestions by player + club match ─────────────────────────────────

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
      // Name token match
      const nameTokens = desiredPlayer.split(/\s+/).filter((t) => t.length >= 3);
      const nameHits = nameTokens.filter((t) => nameLower.includes(t)).length;
      if (nameTokens.length > 0) confidence += (nameHits / nameTokens.length) * 0.6;

      // Club bonus
      if (desiredClub && teamLower.includes(desiredClub.split(/\s+/)[0])) confidence += 0.3;

      // FotMob's own search score
      if (typeof s.score === 'number') confidence += Math.min(s.score / 100, 0.1);

      return {
        fotmobId: s.fotmobId,
        name: s.name,
        arabicName: _hasArabicChars(originalQuery) && translated.player ? originalQuery : null,
        club: s.teamName || '',
        position: '', // FotMob suggest doesn't return position
        confidence: Number(Math.min(1, confidence).toFixed(3)),
        isCoach: !!s.isCoach,
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

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

  const query = String(body.query || '').trim();
  if (!query) {
    return sendJson(res, 400, { ok: false, messageAr: 'يرجى كتابة اسم اللاعب.' });
  }

  const translated = _translateQuery(query);
  if (!translated.englishTerm) {
    return sendJson(res, 200, {
      ok: false,
      messageAr: 'لم يتم التعرف على الاسم. جرّب كتابته بالإنجليزي مع اسم النادي.',
      query,
    });
  }

  // Search FotMob (live)
  const suggestions = await searchFotMob(translated.englishTerm);
  if (suggestions.length === 0) {
    // Try fallback: search just the player part
    if (translated.player && translated.player !== translated.englishTerm) {
      const fallback = await searchFotMob(translated.player);
      if (fallback.length > 0) {
        const ranked = _rankMatches(fallback, translated, query);
        return sendJson(res, 200, {
          ok: true,
          query,
          translated: translated.englishTerm,
          messageAr: 'تم العثور على نتائج بالاسم الأساسي.',
          matches: ranked,
        });
      }
    }
    return sendJson(res, 200, {
      ok: false,
      query,
      translated: translated.englishTerm,
      messageAr: 'لم يتم العثور على اللاعب في FotMob. جرّب الاسم الكامل بالإنجليزية.',
      matches: [],
    });
  }

  const ranked = _rankMatches(suggestions, translated, query);
  if (ranked.length === 0) {
    return sendJson(res, 200, {
      ok: false,
      query,
      translated: translated.englishTerm,
      messageAr: 'تم العثور على نتائج لكن لم يتطابق أي منها مع طلبك.',
      matches: [],
    });
  }

  return sendJson(res, 200, {
    ok: true,
    query,
    translated: translated.englishTerm,
    messageAr: ranked.length === 1
      ? 'تم العثور على نتيجة واحدة.'
      : `تم العثور على ${ranked.length} نتائج محتملة.`,
    matches: ranked,
  });
}
