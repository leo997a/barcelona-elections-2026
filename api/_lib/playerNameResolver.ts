/**
 * Player Name Resolver — Arabic + English + accent-insensitive.
 *
 * Solves three problems that broke FotMob search in earlier phases:
 *  1. FotMob suggest does NOT match accents reliably (Koundé ≠ Koundé in some
 *     queries) — we strip them for the API call but keep them for display.
 *  2. Arabic surnames like "كوندي", "أراوخو", "جيراد مارتن" had no mapping.
 *  3. A single query string was insufficient — we now generate multiple
 *     variations and search them all, deduplicating results.
 *
 * Used only by /api/_lib/playerIntelV2Handlers.ts via internal imports.
 */

// ─── Arabic player aliases ────────────────────────────────────────────────────
// Surname-first form is allowed (FotMob matches surnames well).
// Keep this list expandable; it seeds the resolver but the real power is in
// query expansion + accent normalization.

export const PLAYER_AR_ALIASES: Record<string, string> = {
  // Yamal
  'يامال': 'Lamine Yamal', 'لامين': 'Lamine Yamal', 'لامين يامال': 'Lamine Yamal',
  // Lewandowski
  'ليفاندوفسكي': 'Robert Lewandowski', 'ليفاندوفسكى': 'Robert Lewandowski',
  'ليفا': 'Robert Lewandowski', 'روبرت ليفاندوفسكي': 'Robert Lewandowski',
  // Palmer
  'بالمر': 'Cole Palmer', 'كول بالمر': 'Cole Palmer', 'كول': 'Cole Palmer',
  // Mbappé
  'مبابي': 'Kylian Mbappe', 'كيليان مبابي': 'Kylian Mbappe',
  // Haaland
  'هالاند': 'Erling Haaland', 'إيرلينغ هالاند': 'Erling Haaland', 'ايرلينغ هالاند': 'Erling Haaland',
  // Salah
  'صلاح': 'Mohamed Salah', 'محمد صلاح': 'Mohamed Salah', 'محمدصلاح': 'Mohamed Salah',
  // Vinicius
  'فينيسيوس': 'Vinicius Junior', 'فيني': 'Vinicius', 'فينيسيوس جونيور': 'Vinicius Junior',
  // Bellingham
  'بيلينغهام': 'Jude Bellingham', 'جود بيلينغهام': 'Jude Bellingham',
  // Kane
  'كين': 'Harry Kane', 'هاري كين': 'Harry Kane',
  // Foden
  'فودين': 'Phil Foden', 'فيل فودين': 'Phil Foden',
  // De Bruyne
  'ديبروين': 'De Bruyne', 'كيفن دي بروين': 'Kevin De Bruyne', 'دي بروين': 'De Bruyne',
  // Rodri
  'رودري': 'Rodri',
  // Saka
  'ساكا': 'Bukayo Saka', 'بوكايو ساكا': 'Bukayo Saka',
  // Martinelli
  'مارتينيلي': 'Martinelli',
  // Ødegaard
  'اوديغارد': 'Martin Odegaard', 'أوديغارد': 'Martin Odegaard', 'اوديجارد': 'Martin Odegaard',
  // van Dijk
  'فان دايك': 'Virgil van Dijk', 'فيرجيل فان دايك': 'Virgil van Dijk', 'فاندايك': 'van Dijk',
  // Alisson
  'اليسون': 'Alisson', 'أليسون': 'Alisson',
  // Courtois
  'كورتوا': 'Thibaut Courtois', 'تيبو كورتوا': 'Thibaut Courtois',
  // Modric
  'مودريتش': 'Luka Modric', 'لوكا مودريتش': 'Luka Modric', 'مودريش': 'Luka Modric',
  // Kroos
  'كروس': 'Toni Kroos', 'توني كروس': 'Toni Kroos',
  // Valverde
  'فالفيردي': 'Federico Valverde', 'فيدي فالفيردي': 'Federico Valverde',
  // Camavinga
  'كامافينغا': 'Eduardo Camavinga', 'إدواردو كامافينغا': 'Eduardo Camavinga',
  // Tchouameni
  'تشواميني': 'Aurelien Tchouameni', 'أوريليان تشواميني': 'Aurelien Tchouameni', 'تشاميني': 'Tchouameni',
  // Rodrygo
  'رودريغو': 'Rodrygo',
  // Barcelona players
  'بيدري': 'Pedri',
  'غافي': 'Gavi',
  'رافينيا': 'Raphinha', 'رافينها': 'Raphinha',
  'كوندي': 'Jules Kounde', 'جول كوندي': 'Jules Kounde', 'جولز كوندي': 'Jules Kounde', 'كوندى': 'Jules Kounde',
  'اراوخو': 'Ronald Araujo', 'أراوخو': 'Ronald Araujo', 'رونالد اراوخو': 'Ronald Araujo', 'رونالد أراوخو': 'Ronald Araujo', 'اراهو': 'Ronald Araujo',
  'كوبارسي': 'Pau Cubarsi', 'باو كوبارسي': 'Pau Cubarsi', 'كوبارسى': 'Pau Cubarsi',
  'مارتن': 'Gerard Martin', 'جيرارد مارتن': 'Gerard Martin', 'جيراد مارتن': 'Gerard Martin', 'جيراردو مارتن': 'Gerard Martin',
  'كاسادو': 'Marc Casado', 'مارك كاسادو': 'Marc Casado',
  'فيرمين': 'Fermin Lopez', 'فيرمين لوبيز': 'Fermin Lopez', 'فيرمن': 'Fermin Lopez',
  'دي يونغ': 'Frenkie de Jong', 'فرينكي': 'Frenkie de Jong', 'فرينكي دي يونغ': 'Frenkie de Jong', 'دي يونج': 'de Jong',
  'فيران': 'Ferran Torres', 'فيران توريس': 'Ferran Torres',
  'اولمو': 'Dani Olmo', 'داني اولمو': 'Dani Olmo', 'أولمو': 'Dani Olmo',
  'فاتي': 'Ansu Fati', 'انسو فاتي': 'Ansu Fati', 'أنسو فاتي': 'Ansu Fati',
  'بالدي': 'Alejandro Balde', 'الياندرو بالدي': 'Alejandro Balde',
  'تير شتيغن': 'ter Stegen', 'مارك تير شتيغن': 'Marc-Andre ter Stegen', 'تير ستيغن': 'ter Stegen',
  'كريستنسن': 'Andreas Christensen', 'اندرياس كريستنسن': 'Andreas Christensen',
  'اينيغو': 'Inigo Martinez', 'إنيغو': 'Inigo Martinez', 'اينيجو': 'Inigo Martinez', 'اينيغو مارتينيز': 'Inigo Martinez',
  'لوبيز': 'Lopez',
  'تورنتس': 'Torrents',
  // Chelsea
  'إنزو': 'Enzo Fernandez', 'انزو': 'Enzo Fernandez', 'إنزو فيرنانديز': 'Enzo Fernandez',
  'كايسيدو': 'Moises Caicedo', 'موسى كايسيدو': 'Moises Caicedo', 'كاسيدو': 'Moises Caicedo',
  'جاكسون': 'Nicolas Jackson', 'نيكولا جاكسون': 'Nicolas Jackson',
  'جوكيريس': 'Joao Pedro', // example
  // PSG
  'ديمبيلي': 'Ousmane Dembele', 'عثمان ديمبيلي': 'Ousmane Dembele',
  'دوناروما': 'Donnarumma', 'جانلويجي دوناروما': 'Gianluigi Donnarumma',
  'هاكيمي': 'Achraf Hakimi', 'اشرف حكيمي': 'Achraf Hakimi', 'حكيمي': 'Hakimi',
  // Inter
  'لاوتارو': 'Lautaro Martinez', 'لاوتارو مارتينيز': 'Lautaro Martinez',
  // City
  'الفاريز': 'Julian Alvarez', 'جوليان الفاريز': 'Julian Alvarez',
  // Premier
  'كانسيلو': 'Joao Cancelo',
  'مارتينيز': 'Lisandro Martinez',
};

// ─── Club aliases (kept here for resolver completeness) ──────────────────────

export const CLUB_AR_ALIASES: Record<string, string> = {
  'برشلونة': 'Barcelona', 'برشلونه': 'Barcelona', 'بارسا': 'Barcelona', 'باريسا': 'Barcelona',
  'تشيلسي': 'Chelsea', 'تشيلسى': 'Chelsea', 'تشلسي': 'Chelsea',
  'ريال مدريد': 'Real Madrid', 'الريال': 'Real Madrid', 'ريال': 'Real Madrid', 'ريال مدريدي': 'Real Madrid',
  'باريس سان جيرمان': 'Paris Saint-Germain', 'باريس': 'PSG', 'سان جيرمان': 'PSG', 'بي اس جي': 'PSG', 'باي اس جي': 'PSG',
  'مانشستر سيتي': 'Manchester City', 'مان سيتي': 'Manchester City', 'السيتي': 'Manchester City', 'مانسيتي': 'Manchester City',
  'مانشستر يونايتد': 'Manchester United', 'مان يونايتد': 'Manchester United', 'اليونايتد': 'Manchester United', 'مانيونايتد': 'Manchester United',
  'ليفربول': 'Liverpool', 'الليفر': 'Liverpool',
  'بايرن ميونخ': 'Bayern Munich', 'بايرن': 'Bayern Munich', 'بايرن ميونيخ': 'Bayern Munich',
  'بوروسيا دورتموند': 'Borussia Dortmund', 'دورتموند': 'Dortmund',
  'يوفنتوس': 'Juventus', 'يوفي': 'Juventus', 'اليوفي': 'Juventus',
  'ميلان': 'Milan', 'إيه سي ميلان': 'AC Milan', 'الميلان': 'AC Milan',
  'انتر': 'Inter', 'إنتر': 'Inter', 'انتر ميلان': 'Inter Milan', 'الانتر': 'Inter',
  'نابولي': 'Napoli',
  'روما': 'Roma', 'روما الايطالية': 'AS Roma',
  'أرسنال': 'Arsenal', 'ارسنال': 'Arsenal', 'الارسنال': 'Arsenal',
  'توتنهام': 'Tottenham', 'سبيرز': 'Tottenham',
  'أتلتيكو مدريد': 'Atletico Madrid', 'أتلتيكو': 'Atletico Madrid', 'اتلتيكو': 'Atletico Madrid', 'الأتلتيكو': 'Atletico Madrid',
  'أتلتيك بلباو': 'Athletic Club', 'أتلتيك': 'Athletic Club', 'اتلتيك': 'Athletic Club',
  'ريال سوسيداد': 'Real Sociedad', 'سوسيداد': 'Real Sociedad',
  'إشبيلية': 'Sevilla', 'اشبيلية': 'Sevilla',
  'بيتيس': 'Real Betis',
  'فالنسيا': 'Valencia',
  'فياريال': 'Villarreal',
  'ليل': 'Lille',
  'موناكو': 'Monaco',
  'الهلال': 'Al-Hilal', 'هلال': 'Al-Hilal',
  'النصر': 'Al-Nassr', 'نصر': 'Al-Nassr',
  'الاتحاد': 'Al-Ittihad',
  'الاهلي': 'Al-Ahli',
};

// ─── Normalization ────────────────────────────────────────────────────────────

/** Strip Arabic diacritics + unify letter variants. */
export function normalizeArabic(s: string): string {
  if (!s) return '';
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '') // tashkeel
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u0622\u0623\u0625]/g, '\u0627') // alef variants
    .replace(/\u0649/g, '\u064A') // alef maksura
    .replace(/[\u0624\u0626]/g, '\u0621') // hamza
    .replace(/\u0629/g, '\u0647') // ta marbuta → ha (loose match)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip Latin accents — Koundé → Kounde, Araújo → Araujo. */
export function normalizeLatin(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // combining diacritics
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/ß/gi, 'ss')
    .replace(/[ł]/gi, 'l')
    .replace(/đ/gi, 'd')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // smart quotes
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasArabicChars(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

// ─── Translation: Arabic → English canonical ──────────────────────────────────

/**
 * Translate Arabic player query to English using alias map (longest match first).
 * Returns the canonical English form, or null if no alias matched.
 */
export function translateArabicPlayer(arabicQuery: string): string | null {
  if (!arabicQuery) return null;
  const norm = normalizeArabic(arabicQuery);
  // Sort by length desc so multi-word aliases win
  const entries = Object.entries(PLAYER_AR_ALIASES).sort((a, b) => b[0].length - a[0].length);
  // Try whole-string match first
  for (const [ar, en] of entries) {
    if (normalizeArabic(ar) === norm) return en;
  }
  // Try substring match (e.g. "اراوخو برشلونة" contains "اراوخو")
  for (const [ar, en] of entries) {
    if (norm.includes(normalizeArabic(ar))) return en;
  }
  return null;
}

/** Same for clubs. */
export function translateArabicClub(arabicQuery: string): string | null {
  if (!arabicQuery) return null;
  const norm = normalizeArabic(arabicQuery);
  const entries = Object.entries(CLUB_AR_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of entries) {
    if (normalizeArabic(ar) === norm) return en;
  }
  for (const [ar, en] of entries) {
    if (norm.includes(normalizeArabic(ar))) return en;
  }
  return null;
}

// ─── Arabic → Latin Transliterator ───────────────────────────────────────────
// Maps each Arabic letter to its primary Latin equivalent + alternate variants.
// First entry is the most common; alternates handle ambiguity (ف could be f or v
// because Arabic has no native /v/, و could be w/u/o/v in transliteration).

const TRANSLIT_PRIMARY: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'aa', 'ى': 'a',
  'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'd',
  'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z',
  'ع': '', 'غ': 'gh',
  'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'a',
  'و': 'o', 'ي': 'i',
  'ء': '', 'ؤ': 'o', 'ئ': 'i',
  ' ': ' ',
};

// Letters where the primary transliteration is ambiguous and a swap should
// generate a search variant.
const TRANSLIT_VARIANTS: Record<string, string[]> = {
  'ف': ['v'],            // الفاريز → alfariz / alvariz (catches Álvarez)
  'و': ['u', 'w'],        // كوندي → kondi / kundi / kwndi
  'ي': ['y', 'e'],        // كوندي → kondi / konde / kondy
  'ج': ['g'],             // جوكا → joka / goka
  'ك': ['c'],             // كاسادو → kasado / casado
  'ق': ['k'],             // قاسم → qasim / kasim
  'ا': ['e'],             // مارتن → martin / mertin
  'ه': [''],              // when ه is at end: ﺗﻴﻤﻴ + ه
  'ز': ['s'],             // كاسسي / كاسي forms
};

/** Convert Arabic word to its primary Latin form. */
function _basicTransliterate(arabicWord: string): string {
  let out = '';
  for (const ch of arabicWord) {
    if (TRANSLIT_PRIMARY[ch] !== undefined) {
      out += TRANSLIT_PRIMARY[ch];
    } else if (/[a-zA-Z0-9'\- ]/.test(ch)) {
      out += ch;
    }
    // Skip diacritics and unknown chars
  }
  // Cleanup: collapse repeated letters, strip leading vowel after ال (al-)
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

/**
 * Generate up to N transliteration variants for an Arabic word.
 * Strategy: produce primary form, then swap up to 2 ambiguous letters per
 * variant (avoids combinatorial explosion).
 */
export function transliterateArabic(arabicQuery: string, maxVariants: number = 5): string[] {
  if (!arabicQuery || !hasArabicChars(arabicQuery)) return [];
  const words = normalizeArabic(arabicQuery).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const results = new Set<string>();
  // Per-word primary
  const primaryPerWord = words.map(_basicTransliterate);
  results.add(primaryPerWord.join(' ').trim());

  // Variant 1: substitute ambiguous letters in each word
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    // Find positions of letters with variants
    const ambiguousPositions: Array<{ idx: number; variants: string[] }> = [];
    for (let i = 0; i < w.length; i++) {
      const v = TRANSLIT_VARIANTS[w[i]];
      if (v && v.length > 0) ambiguousPositions.push({ idx: i, variants: v });
    }
    if (ambiguousPositions.length === 0) continue;

    // Generate variants by swapping each ambiguous letter once
    for (const { idx, variants } of ambiguousPositions) {
      for (const sub of variants) {
        let altOut = '';
        for (let i = 0; i < w.length; i++) {
          if (i === idx) altOut += sub;
          else altOut += TRANSLIT_PRIMARY[w[i]] !== undefined ? TRANSLIT_PRIMARY[w[i]] : w[i];
        }
        const allWords = primaryPerWord.slice();
        allWords[wi] = altOut;
        results.add(allWords.join(' ').trim());
        if (results.size >= maxVariants) break;
      }
      if (results.size >= maxVariants) break;
    }
    if (results.size >= maxVariants) break;
  }

  // Strip leading "al " (الـ definite article)
  for (const r of Array.from(results)) {
    if (r.startsWith('al ')) results.add(r.slice(3));
    if (r.startsWith('al')) results.add(r.slice(2));
  }

  return Array.from(results)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 2)
    .slice(0, maxVariants);
}

/**
 * Generate ordered list of search queries to try against FotMob.
 * Strategy:
 *   1. Translate Arabic → English canonical (if applicable)
 *   2. Strip accents from any Latin form
 *   3. Generate combinations: name only, name+club, club+name, surname only
 *   4. Deduplicate while preserving order
 *
 * Higher-priority queries come first (most specific).
 */
export function buildPlayerSearchQueries(
  playerQuery: string,
  clubContext?: { name: string; aliases: string[] } | null,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (q: string) => {
    const cleaned = q.trim().replace(/\s+/g, ' ');
    if (!cleaned) return;
    const k = cleaned.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(cleaned);
  };

  const playerIsArabic = hasArabicChars(playerQuery);

  // Pool of candidate "player name" forms
  const playerForms: string[] = [];

  // A. Translation result (most reliable)
  const translatedFull = playerIsArabic ? translateArabicPlayer(playerQuery) : null;
  if (translatedFull) {
    playerForms.push(translatedFull);
    // Surname only (last token)
    const tokens = translatedFull.split(/\s+/);
    if (tokens.length > 1) playerForms.push(tokens[tokens.length - 1]);
  }

  // B. Phonetic transliteration (works even when alias is missing)
  if (playerIsArabic) {
    const variants = transliterateArabic(playerQuery, 6);
    for (const v of variants) {
      playerForms.push(v);
      const tokens = v.split(/\s+/);
      if (tokens.length > 1) playerForms.push(tokens[tokens.length - 1]);
    }
  }

  // C. Original query (English) — accent-stripped
  if (!playerIsArabic) {
    const stripped = normalizeLatin(playerQuery);
    if (stripped) playerForms.push(stripped);
    // Also keep original (some FotMob matches preserve accents)
    if (playerQuery !== stripped) playerForms.push(playerQuery);
    // Surname-only
    const tokens = stripped.split(/\s+/);
    if (tokens.length > 1) playerForms.push(tokens[tokens.length - 1]);
  }

  // De-duplicate forms
  const uniqueForms: string[] = [];
  const formSeen = new Set<string>();
  for (const f of playerForms) {
    const k = f.toLowerCase();
    if (!formSeen.has(k) && f.trim()) {
      formSeen.add(k);
      uniqueForms.push(f);
    }
  }

  // Pool of club tokens (English-only)
  const clubTokens: string[] = [];
  if (clubContext?.name) {
    clubTokens.push(normalizeLatin(clubContext.name));
    for (const a of (clubContext.aliases || [])) {
      const stripped = normalizeLatin(a);
      if (stripped && !clubTokens.includes(stripped) && !hasArabicChars(stripped)) {
        clubTokens.push(stripped);
      }
    }
  }

  // D. Build queries — most specific first
  for (const p of uniqueForms) {
    if (clubTokens.length > 0) {
      for (const c of clubTokens.slice(0, 2)) {
        push(`${p} ${c}`);     // "Kounde Barcelona"
      }
      for (const c of clubTokens.slice(0, 2)) {
        push(`${c} ${p}`);     // "Barcelona Kounde"
      }
    }
    // Name only — the strongest fallback
    push(p);
  }

  return out.slice(0, 12); // cap at 12 to avoid hammering FotMob
}

// ─── Match scoring ────────────────────────────────────────────────────────────

export type ClubMatchStrength = 'strong' | 'medium' | 'weak' | 'none';
export type MatchedBy = 'exact' | 'alias' | 'surname' | 'club_boost' | 'fuzzy';

export interface ScoredCandidate<T> {
  result: T;
  score: number;
  clubMatch: ClubMatchStrength;
  matchedBy: MatchedBy;
}

interface CandidateLike {
  name: string;
  teamName?: string;
  teamId?: number;
  isCoach?: boolean;
  fotmobId: number;
}

interface ClubContext {
  teamId: number | null;
  name: string;
  aliases: string[];
}

/**
 * Score a single FotMob suggestion against a normalized player + optional club.
 * Returns null if it should be excluded entirely (coach, invalid id).
 *
 * The candidate is matched against ALL provided name variants, and the best
 * variant's score is used. This handles cases where alias gives "Jules Kounde"
 * but FotMob stores "Jules Koundé" — both stripped → exact match.
 */
export function scoreCandidate<T extends CandidateLike>(
  candidate: T,
  resolvedPlayerName: string,    // canonical English name (e.g. "Jules Kounde")
  originalQuery: string,
  clubCtx: ClubContext | null,
  extraVariants: string[] = [],   // transliteration variants etc.
): ScoredCandidate<T> | null {
  if (candidate.isCoach || !candidate.fotmobId || candidate.fotmobId <= 0) return null;

  const candidateName = normalizeLatin(candidate.name).toLowerCase();
  const candidateTeam = normalizeLatin(candidate.teamName || '').toLowerCase();
  const targetName = normalizeLatin(resolvedPlayerName).toLowerCase();
  const originalNorm = normalizeLatin(originalQuery).toLowerCase();
  const targetTokens = targetName.split(/\s+/).filter((t) => t.length >= 2);
  const originalTokens = originalNorm.split(/\s+/).filter((t) => t.length >= 2);

  // Build all name forms to try matching
  const variants = [targetName, ...extraVariants.map((v) => normalizeLatin(v).toLowerCase())]
    .filter((v) => v && v.length >= 2);

  let score = 0;
  let matchedBy: MatchedBy = 'fuzzy';

  // 1. Try exact match against any variant
  let exactHit = false;
  let aliasHit = false;
  let surnameHit = false;
  for (const v of variants) {
    if (candidateName === v) { exactHit = true; break; }
    if (!aliasHit && (candidateName.includes(v) || v.includes(candidateName))) {
      aliasHit = true;
    }
  }

  if (exactHit) {
    score += 120;
    matchedBy = 'exact';
  } else if (aliasHit) {
    score += 90;
    matchedBy = 'alias';
  } else {
    // 3. Surname match across all variants
    for (const v of variants) {
      const tokens = v.split(/\s+/).filter((t) => t.length >= 2);
      if (tokens.length === 0) continue;
      const surname = tokens[tokens.length - 1];
      if (surname.length >= 4 && candidateName.includes(surname)) {
        surnameHit = true;
        break;
      }
    }
    if (surnameHit) {
      score += 60;
      matchedBy = 'surname';
    }
  }

  // 4. Token overlap fuzzy (only if no exact/alias)
  if (score === 0) {
    let bestHits = 0;
    let bestTotal = 0;
    for (const v of variants) {
      const tokens = v.split(/\s+/).filter((t) => t.length >= 2);
      const hits = tokens.filter((t) => candidateName.includes(t)).length;
      if (tokens.length > 0 && (hits / tokens.length) > (bestHits / Math.max(1, bestTotal))) {
        bestHits = hits;
        bestTotal = tokens.length;
      }
    }
    if (bestTotal > 0 && bestHits > 0) {
      score += Math.round((bestHits / bestTotal) * 50);
      matchedBy = 'fuzzy';
    }
  }

  // 5. Original-query token overlap (helps when alias missed)
  if (originalTokens.length > 0) {
    const hits = originalTokens.filter((t) => candidateName.includes(t)).length;
    score += Math.round((hits / originalTokens.length) * 20);
  }

  // 6. Club ranking
  let clubMatch: ClubMatchStrength = 'none';
  if (clubCtx) {
    if (clubCtx.teamId && candidate.teamId === clubCtx.teamId) {
      score += 80;
      clubMatch = 'strong';
      if (matchedBy === 'fuzzy' || matchedBy === 'surname') matchedBy = 'club_boost';
    } else if (clubCtx.name) {
      const clubNorm = normalizeLatin(clubCtx.name).toLowerCase();
      const clubFirst = clubNorm.split(/\s+/)[0];
      if (candidateTeam === clubNorm) {
        score += 60;
        clubMatch = 'strong';
      } else if (candidateTeam.startsWith(clubFirst) || candidateTeam.includes(clubNorm)) {
        score += 40;
        clubMatch = 'medium';
      } else {
        let aliasClubHit = false;
        for (const a of clubCtx.aliases) {
          const aNorm = normalizeLatin(a).toLowerCase();
          if (aNorm && candidateTeam.includes(aNorm.split(/\s+/)[0])) {
            score += 30;
            clubMatch = 'medium';
            aliasClubHit = true;
            break;
          }
        }
        if (!aliasClubHit) {
          score -= 30; // soft penalty, do NOT hide
          clubMatch = 'weak';
        }
      }
    }
  }

  if (score <= 0) return null;
  return { result: candidate, score, clubMatch, matchedBy };
}
