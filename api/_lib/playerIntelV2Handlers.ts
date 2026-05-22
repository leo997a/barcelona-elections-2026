/**
 * Player Intel V2 — handler functions (logic only, no Vercel routing).
 *
 * Used by /api/player-intel-v2.ts (unified router) to dispatch by action.
 * Each handler returns { status: number; body: unknown } for the router to send.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { searchFotMob, searchFotMobTeams, getFotMobPlayer, type FotMobSuggestion, type FotMobTeamSuggestion } from './fotmobClient.js';
import { buildBroadcastFromFotMob } from './fotmobBroadcastBuilder.js';
import { saveProfile, getProfile } from './fotmobRuntimeStore.js';
import {
  resolveQuery,
  type RegistryEntry,
} from '../../components/player-intel-v2/playerIntelV2PlayerResolver.js';
import {
  CLUB_AR_ALIASES as PLAYER_RESOLVER_CLUB_ALIASES,
  buildPlayerSearchQueries,
  hasArabicChars as hasArabicCharsExternal,
  normalizeArabic as normalizeArabicExternal,
  normalizeLatin,
  scoreCandidate,
  translateArabicClub,
  translateArabicPlayer,
  type ClubMatchStrength,
  type MatchedBy,
} from './playerNameResolver.js';

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

// ─── Universal club resolver ─────────────────────────────────────────────────

interface ResolvedClub {
  teamId: number | null;
  name: string;
  countryCode?: string;
  leagueName?: string;
  confidence: number; // 0..1
  source: 'fotmob' | 'alias' | 'raw';
  aliases: string[]; // for downstream ranking
}

/** Resolve a club name (Arabic or English) to FotMob teamId via live search. */
async function _resolveClubLive(rawClub: string): Promise<ResolvedClub | null> {
  const trimmed = rawClub.trim();
  if (!trimmed) return null;

  // Translate Arabic → English using extended map
  let englishCandidate = trimmed;
  const aliasesPool: string[] = [trimmed];
  if (hasArabicCharsExternal(trimmed)) {
    const translated = translateArabicClub(trimmed);
    if (translated) {
      englishCandidate = translated;
      aliasesPool.push(translated);
    } else {
      // No alias hit — strip and use as-is, will likely fail FotMob lookup
      englishCandidate = normalizeArabicExternal(trimmed);
    }
  } else {
    englishCandidate = normalizeLatin(trimmed);
    aliasesPool.push(englishCandidate);
  }

  // Add reverse aliases (any AR key that maps to same English club)
  for (const [ar, en] of Object.entries(PLAYER_RESOLVER_CLUB_ALIASES)) {
    if (en.toLowerCase() === englishCandidate.toLowerCase()) {
      aliasesPool.push(ar);
    }
  }

  // Live FotMob search for teams
  const teams = await searchFotMobTeams(englishCandidate);
  if (teams.length === 0) {
    return englishCandidate
      ? { teamId: null, name: englishCandidate, confidence: 0.4, source: englishCandidate !== trimmed ? 'alias' : 'raw', aliases: aliasesPool }
      : null;
  }

  // Pick best match: name token overlap
  const target = englishCandidate.toLowerCase();
  const targetTokens = target.split(/\s+/).filter((t) => t.length >= 2);
  const ranked = teams
    .map((t) => {
      const nameLower = t.name.toLowerCase();
      let score = 0;
      if (nameLower === target) score = 1.0;
      else if (nameLower.startsWith(target)) score = 0.85;
      else if (nameLower.includes(target)) score = 0.75;
      else {
        const hits = targetTokens.filter((tok) => nameLower.includes(tok)).length;
        score = targetTokens.length > 0 ? (hits / targetTokens.length) * 0.6 : 0.3;
      }
      if (typeof t.score === 'number') score += Math.min(t.score / 200, 0.05);
      return { team: t, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 0.4) {
    return { teamId: null, name: englishCandidate, confidence: 0.3, source: 'raw', aliases: aliasesPool };
  }

  return {
    teamId: best.team.teamId,
    name: best.team.name,
    countryCode: best.team.countryCode,
    leagueName: best.team.leagueName,
    confidence: Number(Math.min(1, best.score).toFixed(3)),
    source: 'fotmob',
    aliases: aliasesPool,
  };
}

export async function handleClubResolve(body: Record<string, unknown>): Promise<HandlerResult> {
  const query = String(body.query || body.club || '').trim();
  if (!query) {
    return { status: 400, body: { ok: false, messageAr: 'يرجى كتابة اسم النادي للبحث.' } };
  }
  const resolved = await _resolveClubLive(query);
  if (!resolved) {
    return {
      status: 200,
      body: { ok: false, messageAr: 'لم يتم العثور على النادي. جرّب اسمًا آخر.', candidates: [] },
    };
  }

  // Also return top 5 candidates for the UI to show as chips
  const teams = await searchFotMobTeams(_hasArabicChars(query) ? resolved.name : query);
  return {
    status: 200,
    body: {
      ok: true,
      query,
      resolved,
      candidates: teams.slice(0, 5).map((t) => ({
        teamId: t.teamId,
        name: t.name,
        countryCode: t.countryCode,
        leagueName: t.leagueName,
      })),
      messageAr: resolved.teamId
        ? `تم تحديد النادي: ${resolved.name}`
        : 'لم يتم تأكيد النادي — سيتم استخدامه لتحسين الترتيب فقط.',
    },
  };
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
  const club = String(body.club || '').trim();
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

  // Optional club re-ranking (Arabic-aware, non-strict)
  let weakClubMatch = false;
  let ranked = matches;
  if (club) {
    const clubNormEn = (() => {
      if (!_hasArabicChars(club)) return club.toLowerCase();
      const arNorm = _normalizeArabic(club);
      for (const [ar, en] of Object.entries(AR_CLUB_MAP).sort((a, b) => b[0].length - a[0].length)) {
        if (arNorm.includes(_normalizeArabic(ar))) return en.toLowerCase();
      }
      return arNorm.toLowerCase();
    })();
    const clubFirstWord = clubNormEn.split(/\s+/)[0] || clubNormEn;
    let strongHit = false;
    ranked = matches
      .map((m) => {
        const entryClub = (m.entry.club || '').toLowerCase();
        let bonus = 0;
        if (entryClub && clubFirstWord && entryClub.includes(clubFirstWord)) {
          bonus = 0.4;
          strongHit = true;
        }
        return { ...m, score: Math.min(1, m.score + bonus) };
      })
      .sort((a, b) => b.score - a.score);
    if (!strongHit) weakClubMatch = true;
  }

  return {
    status: 200,
    body: {
      ok: true,
      query,
      club: club || null,
      weakClubMatch,
      registrySize: registry.players.length,
      matches: ranked.slice(0, 10).map((m) => ({
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
  const clubInput = String(body.club || '').trim();
  if (!query) {
    return { status: 400, body: { ok: false, messageAr: 'يرجى كتابة اسم اللاعب.' } };
  }

  // 1. Resolve club universally
  const resolvedClub = clubInput ? await _resolveClubLive(clubInput) : null;
  const clubCtx = resolvedClub ? {
    teamId: resolvedClub.teamId,
    name: resolvedClub.name,
    aliases: resolvedClub.aliases,
  } : null;

  // 2. Translate player query (Arabic→English) for display
  const translatedPlayer = hasArabicCharsExternal(query)
    ? translateArabicPlayer(query)
    : null;
  const resolvedPlayerName = translatedPlayer || normalizeLatin(query) || query;

  // 3. Build multiple search queries
  const queries = buildPlayerSearchQueries(query, clubCtx);
  if (queries.length === 0) {
    return {
      status: 200,
      body: { ok: false, messageAr: 'لم يتم التعرف على الاسم.', query },
    };
  }

  // 4. Execute searches in order, dedupe by fotmobId
  const seenIds = new Set<number>();
  const allCandidates: FotMobSuggestion[] = [];
  for (const q of queries) {
    const results = await searchFotMob(q);
    for (const r of results) {
      if (!seenIds.has(r.fotmobId)) {
        seenIds.add(r.fotmobId);
        allCandidates.push(r);
      }
    }
    // Early exit: if we already have a high-quality strong match, no need to continue
    if (allCandidates.length >= 12) break;
  }

  if (allCandidates.length === 0) {
    return {
      status: 200,
      body: {
        ok: false,
        query,
        club: clubInput || null,
        resolvedClub,
        translatedPlayer,
        triedQueries: queries,
        messageAr: 'لم نجد نتيجة قوية. جرّب اسمًا آخر أو أضف النادي.',
        matches: [],
      },
    };
  }

  // 5. Score every candidate
  const scored = allCandidates
    .map((c) => scoreCandidate(c, resolvedPlayerName, query, clubCtx))
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (scored.length === 0) {
    return {
      status: 200,
      body: {
        ok: false,
        query,
        club: clubInput || null,
        resolvedClub,
        translatedPlayer,
        triedQueries: queries,
        messageAr: 'تم العثور على نتائج لكن لم يتطابق أي منها مع طلبك.',
        matches: [],
      },
    };
  }

  const weakClubMatch = !!clubInput && !scored.some((s) => s.clubMatch === 'strong');
  const visible = scored.map((s) => ({
    fotmobId: s.result.fotmobId,
    name: s.result.name,
    arabicName: hasArabicCharsExternal(query) ? query : null,
    club: s.result.teamName || '',
    position: '',
    confidence: Number(Math.min(1, s.score / 200).toFixed(3)),
    isCoach: !!s.result.isCoach,
    clubMatch: s.clubMatch,
    matchedBy: s.matchedBy,
  }));

  return {
    status: 200,
    body: {
      ok: true,
      query,
      club: clubInput || null,
      resolvedClub,
      translatedPlayer,
      weakClubMatch,
      messageAr: weakClubMatch
        ? 'النادي غير متطابق بشكل قوي — عرضنا أفضل النتائج المتاحة.'
        : visible.length === 1
        ? 'تم العثور على نتيجة واحدة.'
        : `تم العثور على ${visible.length} نتائج محتملة.`,
      matches: visible,
    },
  };
}

// (Old _rankMatchesV2 left in file but no longer used; handler now uses scoreCandidate.)

// ─── V2 ranker that uses resolved teamId for exact match boost ────────────────

interface RankedMatchV2 {
  fotmobId: number;
  name: string;
  arabicName: string | null;
  club: string;
  position: string;
  confidence: number;
  isCoach: boolean;
  _clubMatchStrength: 'strong' | 'medium' | 'weak' | 'none';
}

function _rankMatchesV2(
  suggestions: FotMobSuggestion[],
  translated: TranslatedQuery,
  originalQuery: string,
  resolvedClub: ResolvedClub | null,
): RankedMatchV2[] {
  const desiredClub = (translated.club || '').toLowerCase();
  const desiredPlayer = (translated.player || translated.englishTerm).toLowerCase();
  const teamIdTarget = resolvedClub?.teamId || null;

  return suggestions
    .filter((s) => !s.isCoach && s.fotmobId > 0)
    .map((s) => {
      const nameLower = s.name.toLowerCase();
      const teamLower = (s.teamName || '').toLowerCase();

      let confidence = 0;
      // Player name match
      const nameTokens = desiredPlayer.split(/\s+/).filter((t) => t.length >= 3);
      const nameHits = nameTokens.filter((t) => nameLower.includes(t)).length;
      if (nameTokens.length > 0) confidence += (nameHits / nameTokens.length) * 0.55;

      // Club match — graded
      let clubStrength: RankedMatchV2['_clubMatchStrength'] = 'none';
      if (teamIdTarget && s.teamId === teamIdTarget) {
        confidence += 0.4;
        clubStrength = 'strong';
      } else if (desiredClub && teamLower) {
        if (teamLower === desiredClub) {
          confidence += 0.35;
          clubStrength = 'strong';
        } else if (teamLower.includes(desiredClub.split(/\s+/)[0])) {
          confidence += 0.22;
          clubStrength = 'medium';
        } else if (desiredClub.includes(teamLower.split(/\s+/)[0])) {
          confidence += 0.18;
          clubStrength = 'medium';
        } else {
          clubStrength = 'weak';
        }
      }

      if (typeof s.score === 'number') confidence += Math.min(s.score / 100, 0.1);

      return {
        fotmobId: s.fotmobId,
        name: s.name,
        arabicName: _hasArabicChars(originalQuery) && translated.player ? originalQuery : null,
        club: s.teamName || '',
        position: '',
        confidence: Number(Math.min(1, confidence).toFixed(3)),
        isCoach: !!s.isCoach,
        _clubMatchStrength: clubStrength,
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
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
