/**
 * Player Intel V2 — Arabic-aware player resolver.
 *
 * Resolves a free-text query (Arabic or English, with optional club name)
 * to a registry entry. Pure client-side — no network calls.
 */

// ─── Arabic name dictionary ───────────────────────────────────────────────────
// Maps Arabic transliterations to a canonical token that exists in player IDs
// or English names. Keep this conservative — only add names we actually support.

export const ARABIC_PLAYER_MAP: Record<string, string> = {
  // Players
  'يامال': 'yamal',
  'لامين': 'lamine',
  'لامين يامال': 'lamine yamal',
  'ليفاندوفسكي': 'lewandowski',
  'ليفاندوفسكى': 'lewandowski',
  'ليفا': 'lewandowski',
  'روبرت ليفاندوفسكي': 'robert lewandowski',
  'بالمر': 'palmer',
  'كول بالمر': 'cole palmer',
  'كول': 'cole',
  // Hints for future additions (resolver will surface as not_found until data exists)
  'مبابي': 'mbappe',
  'بيدري': 'pedri',
  'غافي': 'gavi',
  'رافينيا': 'raphinha',
  'دي يونغ': 'de jong',
  'فيرمين': 'fermin',
  'ديمبيلي': 'dembele',
  'هالاند': 'haaland',
  'فينيسيوس': 'vinicius',
  'بيلينغهام': 'bellingham',
  'صلاح': 'salah',
  'محمد صلاح': 'mohamed salah',
};

export const ARABIC_CLUB_MAP: Record<string, string> = {
  'برشلونة': 'barcelona',
  'برشلونه': 'barcelona',
  'تشيلسي': 'chelsea',
  'تشيلسى': 'chelsea',
  'ريال مدريد': 'real madrid',
  'ريال': 'real madrid',
  'مدريد': 'madrid',
  'باريس': 'psg',
  'باريس سان جيرمان': 'psg',
  'مانشستر سيتي': 'manchester city',
  'مان سيتي': 'manchester city',
  'مانشستر يونايتد': 'manchester united',
  'مان يونايتد': 'manchester united',
  'ليفربول': 'liverpool',
  'بايرن': 'bayern munich',
  'بايرن ميونخ': 'bayern munich',
  'دورتموند': 'borussia dortmund',
  'يوفنتوس': 'juventus',
  'يوفي': 'juventus',
  'ميلان': 'milan',
  'انتر': 'inter',
  'إنتر': 'inter',
  'نابولي': 'napoli',
  'أرسنال': 'arsenal',
  'ارسنال': 'arsenal',
  'توتنهام': 'tottenham',
  'اتلتيكو': 'atletico madrid',
  'أتلتيكو': 'atletico madrid',
};

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Arabic normalization: strip diacritics, unify letter variants.
 */
export function normalizeArabic(s: string): string {
  if (!s) return '';
  return s
    // Remove tashkeel (diacritics)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove tatweel
    .replace(/\u0640/g, '')
    // Unify alef
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    // Unify yaa
    .replace(/\u0649/g, '\u064A')
    // Unify hamza variants
    .replace(/[\u0624\u0626]/g, '\u0621')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * English normalization: lowercase, strip accents, collapse whitespace.
 */
export function normalizeEnglish(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Translate any Arabic tokens to their English canonical form.
 * Returns a single normalized lowercase English-ish string suitable for matching.
 */
export function translateArabicQuery(query: string): string {
  let out = normalizeArabic(query);
  // Match longest phrases first
  const sortByLengthDesc = (m: Record<string, string>) =>
    Object.entries(m).sort((a, b) => b[0].length - a[0].length);

  for (const [ar, en] of sortByLengthDesc(ARABIC_PLAYER_MAP)) {
    const arNorm = normalizeArabic(ar);
    if (out.includes(arNorm)) {
      out = out.replace(arNorm, en);
    }
  }
  for (const [ar, en] of sortByLengthDesc(ARABIC_CLUB_MAP)) {
    const arNorm = normalizeArabic(ar);
    if (out.includes(arNorm)) {
      out = out.replace(arNorm, en);
    }
  }
  return normalizeEnglish(out);
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface RegistryEntry {
  id: string;
  name: string;
  club: string;
  season?: string;
  position?: string;
  file?: string;
}

export interface ResolvedMatch {
  entry: RegistryEntry;
  score: number;
  alreadyAvailable: boolean;
}

/**
 * Token-based fuzzy match: how many tokens from the query appear in the candidate.
 */
function _tokenScore(queryNorm: string, candidateNorm: string): number {
  if (!queryNorm || !candidateNorm) return 0;
  if (queryNorm === candidateNorm) return 1.0;
  const qTokens = queryNorm.split(/\s+/).filter((t) => t.length >= 2);
  if (qTokens.length === 0) return 0;
  let hits = 0;
  for (const tok of qTokens) {
    if (candidateNorm.includes(tok)) hits += 1;
  }
  return hits / qTokens.length;
}

/**
 * Resolve a query against a registry of players.
 * Returns sorted matches with confidence scores.
 */
export function resolveQuery(query: string, registry: RegistryEntry[]): ResolvedMatch[] {
  if (!query || !query.trim()) return [];
  const queryNorm = translateArabicQuery(query);
  if (!queryNorm) return [];

  const matches: ResolvedMatch[] = [];
  for (const entry of registry) {
    const candidateName = normalizeEnglish(entry.name || '');
    const candidateClub = normalizeEnglish(entry.club || '');
    const candidateId = normalizeEnglish((entry.id || '').replace(/-/g, ' '));
    const combined = `${candidateName} ${candidateClub} ${candidateId}`.replace(/\s+/g, ' ').trim();

    const nameScore = _tokenScore(queryNorm, candidateName);
    const combinedScore = _tokenScore(queryNorm, combined);
    const score = Math.max(nameScore * 1.1, combinedScore);

    if (score >= 0.4) {
      matches.push({
        entry,
        score: Math.min(score, 1.0),
        alreadyAvailable: true,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

/**
 * Detect compare intent and split query into two player queries.
 * Returns { isCompare, queryA, queryB } or null if not a compare query.
 */
export function detectCompareQuery(query: string): { queryA: string; queryB: string } | null {
  const norm = normalizeArabic(query);
  // Splits: "X و Y", "X vs Y", "بين X و Y", "X ضد Y"
  const compareKeywords = /(?:^|\s)(?:مقارنة|بين|vs|ضد)(?:\s|$)/i.test(norm);
  if (!compareKeywords && !/\sو\s|\sand\s/i.test(norm)) return null;

  // Strip leading compare keywords
  let cleaned = norm.replace(/^(مقارنة|بين|compare)\s+/i, '');

  // Split on "و" or "and" or "vs" or "ضد"
  const parts = cleaned.split(/\s+(?:و|and|vs|ضد)\s+/i).map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return { queryA: parts[0], queryB: parts[1] };
  }
  return null;
}

/**
 * Detect preset hint from a free-text query.
 */
export function detectPresetIntent(query: string): string | null {
  const t = normalizeArabic(query).toLowerCase();
  if (/هجوم|attacker|striker/.test(t)) return 'attacker_card';
  if (/صانع|playmaker|creator/.test(t)) return 'playmaker_card';
  if (/جناح|winger/.test(t)) return 'winger_card';
  if (/مدافع|defender/.test(t)) return 'defender_card';
  if (/فورمة|الفورمه|form/.test(t)) return 'form_report';
  if (/سوق|market|قيمة/.test(t)) return 'market_report';
  if (/موسم|season/.test(t)) return 'season_report';
  if (/كامل|complete|full|شامل/.test(t)) return 'complete_report';
  return null;
}
