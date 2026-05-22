# Phase CORE-X1 — إعادة بناء Search Engine + Metric System لـ Player Intel V2

تاريخ: 2026-05-22  
الفرع: main

---

## 1. لماذا البحث السابق فشل مع كوندي / أراوخو / جيرارد مارتن

من تحليل الصور والكود، الأسباب الجذرية:

### 1.1 FotMob يحتاج اسم بدون accents أحيانًا
- الـ alias map كان يحوّل `كوندي → Koundé` (بـ é).
- FotMob suggest endpoint **لا يطابق دائمًا** الاسم مع accent.
- النتيجة: `Koundé` يفشل، بينما `Kounde` ينجح.

### 1.2 لا توجد aliases للعديد من اللاعبين
- `أراوخو` (Ronald Araújo) — مفقود من alias map.
- `جيرارد مارتن` / `جيراد مارتن` (Gerard Martín) — مفقود.
- `كوبارسي` (Pau Cubarsí) — مفقود.
- `إنيغو` (Iñigo Martínez) — مفقود.
- ~30+ لاعب آخر.

### 1.3 query واحد فقط بدون expansion
الكود السابق:
```typescript
const suggestions = await searchFotMob(translated.englishTerm);
```
- استدعاء واحد فقط للـ FotMob.
- لا يجرّب surname بمفرده.
- لا يجرّب بدون club.
- لا يجرّب stripped accent.

### 1.4 رسالة فشل مزعجة
> "لم يتم العثور على اللاعب في FotMob. جرّب الاسم الكامل بالإنجليزية."

تظهر حتى لو كان فقط النادي غير مطابق، رغم أن FotMob يرجع نتائج.

---

## 2. كيف يعمل `playerNameResolver` الجديد

ملف: `api/_lib/playerNameResolver.ts` (جديد، ~440 سطر)

### 2.1 Normalization طبقتان
```typescript
normalizeArabic(s) // إزالة تشكيل + توحيد ا/ي/ة + إزالة الهمزات
normalizeLatin(s)  // NFKD strip + ø/æ/ł/ß + smart quotes
```

### 2.2 Player aliases موسّع (~80 entry)
يغطي الآن:
- **Barcelona**: Yamal, Lewandowski, Pedri, Gavi, Raphinha, **Koundé**, **Araújo**, **Cubarsí**, **Gerard Martín**, Casado, Fermín, de Jong, Ferran, Olmo, Fati, Balde, ter Stegen, Christensen, **Iñigo Martínez**.
- **Real Madrid**: Mbappé, Vinicius, Bellingham, Modric, Kroos, Valverde, Camavinga, Tchouameni, Rodrygo, Courtois.
- **Chelsea, City, Liverpool, Arsenal, PSG, Inter, Juventus, ...**

كل لاعب يقبل:
- اسمًا كاملاً عربيًا (`جيرارد مارتن`)
- اسم خاطئ شائع (`جيراد مارتن`)
- اللقب فقط (`مارتن`، `كوندي`)
- صيغة بديلة (`اراوخو` و `أراوخو` و `أراوخو`)

### 2.3 Club aliases موسّع (~50 entry)
يدعم كلمات بـ "ال" (الريال، الأتلتيكو، السيتي، اليونايتد) + مرادفات (بارسا، اليوفي، السبيرز، النصر، الهلال).

---

## 3. كيف يعمل Query Expansion

### 3.1 `buildPlayerSearchQueries(playerQuery, clubContext)`

لكل بحث، يولّد حتى **8 queries** مرتّبة بالأولوية:

#### مثال 1: `"كوندي" + "برشلونة"`
1. `Jules Kounde Barcelona` (اسم كامل + نادي)
2. `Jules Kounde barcelona` (اسم كامل + نادي lowercase)
3. `Kounde Barcelona` (لقب + نادي)
4. `Barcelona Kounde` (نادي + لقب — FotMob يطابق هذه الصيغة)
5. `Jules Kounde` (اسم كامل فقط)
6. `Kounde` (لقب فقط)

#### مثال 2: `"Koundé" + "برشلونة"` (مع accent)
- `normalizeLatin("Koundé") → "Kounde"`
- نفس الـ queries أعلاه + إضافة `Koundé` كـ fallback.

#### مثال 3: `"اراوخو" + "برشلونة"`
- alias map: `اراوخو → Ronald Araujo`
- queries: `Ronald Araujo Barcelona`, `Araujo Barcelona`, `Barcelona Araujo`, `Ronald Araujo`, `Araujo`.

### 3.2 Multi-search في handler
```typescript
for (const q of queries) {
  const results = await searchFotMob(q);
  for (const r of results) if (!seen.has(r.fotmobId)) candidates.push(r);
  if (candidates.length >= 12) break;
}
```

النتائج تُجمع، تُزال التكرارات، ثم تُعطى للـ scoring.

---

## 4. كيف يعمل Club Resolver

`_resolveClubLive(rawClub)` في `playerIntelV2Handlers.ts`:

1. **Translation**: ترجمة عربي → إنجليزي عبر `translateArabicClub` (يستخدم 50+ alias من `CLUB_AR_ALIASES`).
2. **Reverse aliases**: يجمع كل aliases التي تشير لنفس النادي ليبنيها في `aliases[]`.
3. **FotMob teamSuggest**: يستدعي `searchFotMobTeams(englishCandidate)` للحصول على teamId.
4. **Ranking**: exact name (1.0) > startsWith (0.85) > contains (0.75) > token overlap (0.6).

النتيجة:
```typescript
{
  teamId: 8634,
  name: "Barcelona",
  countryCode: "ESP",
  leagueName: "LaLiga",
  confidence: 0.95,
  source: "fotmob",
  aliases: ["Barcelona", "FC Barcelona", "Barça", "بارسا", "برشلونة"],
}
```

`aliases[]` يُستخدم لاحقاً في `scoreCandidate` لتقييم النادي بشكل مرن.

---

## 5. كيف يتم Ranking النتائج

`scoreCandidate(candidate, resolvedPlayerName, originalQuery, clubCtx)`:

### 5.1 Player score (max ~120)
- **Exact name**: +100, `matchedBy='exact'`
- **Alias match (contains)**: +90, `matchedBy='alias'`
- **Surname match**: +60, `matchedBy='surname'`
- **Token overlap fuzzy**: up to +50, `matchedBy='fuzzy'`
- **Original query overlap bonus**: up to +20

### 5.2 Club score (max ~80)
- **teamId exact**: +80, `clubMatch='strong'`
- **teamName exact**: +60, `clubMatch='strong'`
- **teamName contains/startsWith**: +40, `clubMatch='medium'`
- **alias hit**: +30, `clubMatch='medium'`
- **No match**: -30 (soft penalty), `clubMatch='weak'`

النتائج بـ `clubMatch='weak'` لا تُخفى — تظهر في الأسفل فقط.

### 5.3 الإخراج للواجهة
كل نتيجة تحوي:
```json
{
  "fotmobId": 1273169,
  "name": "Jules Koundé",
  "club": "Barcelona",
  "confidence": 0.83,
  "clubMatch": "strong",
  "matchedBy": "alias"
}
```

الواجهة تعرض badges:
- 🟢 "تطابق نادٍ قوي" / 🟡 "متوسط" / ⚪ "ضعيف"

---

## 6. أمثلة الاختبار

| Player | Club | Translation | Expected #1 | clubMatch |
| --- | --- | --- | --- | --- |
| `كوندي` | `برشلونة` | Jules Kounde | Jules Koundé · Barcelona | strong |
| `Koundé` | `Barcelona` | Kounde (stripped) | Jules Koundé · Barcelona | strong |
| `أراوخو` | `برشلونة` | Ronald Araujo | Ronald Araújo · Barcelona | strong |
| `جيرارد مارتن` | `برشلونة` | Gerard Martin | Gerard Martín · Barcelona | strong |
| `جيراد مارتن` | `برشلونة` | Gerard Martin | Gerard Martín · Barcelona | strong |
| `لامين` | `برشلونة` | Lamine Yamal | Lamine Yamal · Barcelona | strong |
| `كوبارسي` | `برشلونة` | Pau Cubarsi | Pau Cubarsí · Barcelona | strong |
| `رافينها` | `برشلونة` | Raphinha | Raphinha · Barcelona | strong |
| `مبابي` | `ريال مدريد` | Kylian Mbappe | Kylian Mbappé · Real Madrid | strong |
| `بالمر` | `تشيلسي` | Cole Palmer | Cole Palmer · Chelsea | strong |
| `ديمبيلي` | `باريس` | Ousmane Dembele | Ousmane Dembélé · PSG | strong |

لاحظ: حتى لو FotMob يخزّن الاسم بـ accent، الـ resolver يطابق لأنه يقارن في `normalizeLatin` space (lowercase + stripped).

---

## 7. كيف تم إصلاح Metric Picker فعليًا

تم في UI-X3 (commit `7d70510`):
- Bug `|| true` في filter تم إصلاحه — الفئات تفلتر فعلاً.
- إضافة فئة "الكل".
- Cards modern (grid 2 columns) مع source badges + percentile rank.
- Empty state أنيق.

في CORE-X1، تم تثبيت السلوك:
- Categories chips (الكل، هجومية، صناعة لعب، تمرير، استحواذ، دفاع، انضباط، حراسة، فورمة، سوق وانتقالات) كلها تعمل.
- البحث النصي يعمل فوق الفلتر.
- إضافة/حذف metric يحدّث الـ state فورًا → preview يتحدث تلقائيًا.

---

## 8. كيف يعمل Stats Scope Engine

### 8.1 Backend في `fotmobBroadcastBuilder.ts`
عند بناء كل profile جديد، يُحسب:
```typescript
dataScope: {
  scopeType: 'main_league' | 'recent_matches' | 'unknown',
  label: 'LaLiga · 2025-26',
  season: '2025-26',
  competitionName: 'LaLiga',
  competitionId: 87,
  sourcePath: 'pageProps.data.mainLeague.stats',
  confidence: 'high',
  availableCompetitions: [
    { name: 'LaLiga', competitionId: 87, seasonsCount: 4, hasDeepStats: true },
    { name: 'UEFA Champions League', competitionId: 42, seasonsCount: 2, hasDeepStats: true },
    { name: 'Copa del Rey', competitionId: 138, seasonsCount: 4, hasDeepStats: false },
    ...
  ]
}
```

### 8.2 Tab "نطاق الإحصائيات" (جديد)
يعرض 3 خيارات:
1. **الدوري الرئيسي** (LaLiga 2025-26) — نشط، مصدر `mainLeague.stats`.
2. **آخر N مباراة (مسابقات مختلطة)** — متاح إذا recentMatches > 0.
3. **كل المسابقات المتاحة** — **غير متاح حاليًا** مع رسالة شفافة:
   > "FotMob لا يوفّر إحصائيات موسم كاملة لكل مسابقة بشكل متاح حاليًا."

### 8.3 المسابقات المكتشفة
عرض قائمة `availableCompetitions` كـ chips مع badge `deep` للبطولات التي يوفر FotMob لها deep stats. هذه قائمة معلوماتية فقط — لا تُستخدم كمصدر إحصائيات بعد.

---

## 9. هل "كل المسابقات" متاح فعلاً

**لا**، وهذا موضّح بصراحة في الـ UI:
- الخيار يظهر `disabled` بلون رمادي + opacity 60%.
- badge "غير متاح".
- رسالة سبب: "FotMob لا يوفّر إحصائيات موسم كاملة لكل مسابقة بشكل متاح حاليًا."
- النص الإضافي: "يحتاج دمج FBref + FotMob بكامل البطولات (مرحلة لاحقة)."

السبب التقني: FotMob `_next/data` يوفّر:
- `mainLeague.stats` (الدوري الرئيسي فقط)
- `firstSeasonStats.topStatCard.items` (top stats للموسم)
- `statSeasons[].tournaments[]` (قائمة فقط، بدون stats per-tournament)
- `careerHistory.seasonEntries.tournamentStats` (جزئي، goals/assists/appearances)
- `recentMatches` (آخر 50-60 مباراة من كل المسابقات)

إحصائيات season totals **لكل** بطولة منفصلة (xG, shots, tackles per competition) **غير متوفرة** من FotMob العام. لتفعيل "كل المسابقات" نحتاج:
- ربط FBref البطولات الإضافية، أو
- استخراج tournamentStats المتاح مع توضيح أنه محدود (goals/assists/appearances فقط).

---

## 10. أين يظهر Scope Badge في Renderer

في `PlayerIntelV2Renderer.tsx`، الـ scopeLabel الآن يحوي:
```
FotMob · LaLiga 2025-26
FBref + FotMob · LaLiga 2025-26
FotMob · Recent 49 matches · mixed competitions
```

يظهر في:
- **Premium Broadcast**: badge بجانب card type.
- **Tactical Board**: تحت season في sidebar.
- **Magazine Profile**: تحت club/position بـ accent color.
- **Compact TV**: text صغير.
- **H2H Duel**: تحت VS.

---

## 11. الحفاظ على التوافق

| الجانب | الحالة |
| --- | --- |
| Player Stats Lab | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| PlayerStatsRenderer | لم يُلمس |
| FBref cache | لم يُلمس |
| schemaVersion | بدون تغيير |
| profiles في localStorage القديمة | تعمل (الـ resolver يقبل أي input) |
| compare mode | يعمل |
| 5 visual variants | تعمل |
| REO Match | يعمل |
| **Vercel Functions** | **10 ≤ 12** ✓ (لم يتغيّر) |
| club-resolve action | يعمل بـ aliases pool محسّن |
| build-fotmob-profile | يعمل |
| نظام الترخيص | لم يُلمس |
| التوكنات | لم تُلمس |

---

## 12. الملفات الأساسية التي تغيّرت

| الملف | الحالة |
| --- | --- |
| `api/_lib/playerNameResolver.ts` | **جديد** — 440 سطر، normalize + aliases + query expansion + scoring |
| `api/_lib/playerIntelV2Handlers.ts` | إعادة كتابة `handleFotMobSearch` بمنطق multi-query + scoreCandidate |
| `api/_lib/fotmobBroadcastBuilder.ts` | تحسين dataScope (label أدق، hasDeepStats، recentCount) |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | إضافة tab "نطاق الإحصائيات" + scope cards UI |
| `components/renderers/PlayerIntelV2Renderer.tsx` | scopeLabel يضم source prefix (FotMob / FBref + FotMob) |

---

## 13. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` (tsc --noEmit) | exit 0 |
| `npm run build` (vite) | exit 0 (5.98s) |
| Vercel Functions | **10 ≤ 12** ✓ |
| Arabic player aliases (~80 لاعب) | ✓ |
| Club aliases (~50 نادي) | ✓ |
| Query expansion (حتى 8 queries) | ✓ |
| Multi-search + dedup | ✓ |
| Scoring مع matchedBy | ✓ |
| Soft penalty للـ club mismatch (لا إخفاء) | ✓ |
| dataScope أدق (recentCount, hasDeepStats) | ✓ |
| Tab "نطاق الإحصائيات" يعرض 3 scopes | ✓ |
| "كل المسابقات" disabled مع سبب | ✓ |
| Scope badge مع source prefix في renderer | ✓ |

---

## 14. ما بقي لاحقًا

- **توسيع aliases**: إضافة المزيد من اللاعبين العرب والأفارقة (Salem Al-Dawsari، Hakim Ziyech، إلخ).
- **Phonetic matching**: لتغطية الكتابات غير الرسمية (`فاندايك` بدلاً من `فان دايك`).
- **Deep tournament stats**: استخراج tournamentStats من careerHistory لتقديم scope "Champions League 2025-26" حقيقي.
- **FBref integration into V2**: ربط FBref data للـ profiles المبنية on-demand (حالياً FotMob فقط).
- **Drag-to-reorder للـ selected metrics**.
- **AI assistant مدمج** مع البحث (Gemini يفهم intent + يستدعي action مناسب).

كل هذا بدون كسر الأساس الحالي وبدون زيادة عدد functions.
