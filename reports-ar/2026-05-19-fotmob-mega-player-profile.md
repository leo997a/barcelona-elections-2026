# Phase X.5 — FotMob Mega Player Profile

تاريخ: 2026-05-19  
الفرع: main  
المسار: `deploy/reo-datafabric/`

---

## 1. الفرق بين X.4 و X.5

| | Phase X.4 (deep mapper) | Phase X.5 (mega profile) |
| --- | --- | --- |
| الهدف | استخراج summary منظّم | ملف كامل بدون أي حذف للبيانات |
| recentMatches | محدودة بـ 12 | كل المباريات بدون قطع (56 / 62 / 49 لاعبين الاختبار) |
| statsSection | عناوين فقط | كل الميتركس داخل كل قسم recursive |
| shotmap | غير موجود | كامل + summary (xG, xGOT, on target, inside box…) |
| heatmap | غير موجود | كامل + averageX/Y |
| careerHistory | أول 4 أسطر | كل المواسم لكل category مع tournamentBreakdown + كل الفرق |
| marketValues | latest فقط | كل النقاط (39–70 نقطة لكل لاعب) + summary مع growth |
| trophies | عدد win/RU | بكل تفاصيل seasonsWon و seasonsRunnerUp و teamId |
| flattenedMetrics | لا يوجد | object كبير ~170 metric لكل لاعب |
| unknownButPreserved | لا يوجد | يحفظ أي قسم لا نفهمه |
| qualityReport | جزئي | شامل مع warnings للقيم غير الطبيعية |
| schemaVersion | غير موجود | `player-intel-mega-v1` |

> **الفرق العملي:** ملف الـ Mega أكبر من الـ summary بأكثر من 100×.

---

## 2. الملفات الجديدة / المُحدَّثة

| الملف | الحالة | الوصف |
| --- | --- | --- |
| `deploy/reo-datafabric/tools/build_fotmob_mega_profile.py` | جديد | باني الـ Mega Profile (1100+ سطر) |
| `deploy/reo-datafabric/tools/reo_fotmob_cli.py` | تحديث | إضافة أمر `mega-player` |
| `deploy/reo-datafabric/reports/player_fotmob_mega/lamine-yamal.json` | جديد | الملف الكامل (528 KB) |
| `deploy/reo-datafabric/reports/player_fotmob_mega/lamine-yamal.summary.json` | جديد | summary مختصر (3.9 KB) |
| `deploy/reo-datafabric/reports/player_fotmob_mega/robert-lewandowski.json` | جديد | (553 KB) |
| `deploy/reo-datafabric/reports/player_fotmob_mega/robert-lewandowski.summary.json` | جديد | (4.1 KB) |
| `deploy/reo-datafabric/reports/player_fotmob_mega/cole-palmer.json` | جديد | (479 KB) |
| `deploy/reo-datafabric/reports/player_fotmob_mega/cole-palmer.summary.json` | جديد | (4.2 KB) |

> ملف الـ raw الأصلي يبقى محفوظًا في `deploy/reo-datafabric/cache/fotmob/player_next_data/{id}.json` ولا يُلمس.

---

## 3. الأقسام المستخرجة

```
{
  "schemaVersion": "player-intel-mega-v1",
  "source": "fotmob",
  "generatedAt": "...",
  "player":            { id, name, gender, isCaptain, status, ssr, dataProvider, ... },
  "identity":          { id, name, club, primaryPositionLabel/Key, onLoan },
  "bio":               { age, height, country, foot, shirt, transferValue, injury, internationalDuty, playerInformationMap, playerInformationRaw },
  "club":              { teamId, teamName, onLoan, teamColors },
  "position":          { primaryLabel, primaryKey, allPositions[], nonPrimary[], raw },
  "contract":          { contractEndUtc, birthDateUtc, ... },
  "marketValue":       { count, values[], summary{currentValue, highestValue, lowestValue, firstValue, growthFromFirstPercent} },
  "images":            { playerImage, teamLogo },
  "mainLeague":        { leagueId, leagueName, season, stats[], statsCount },
  "topStatCard":       [ {key, title, statValue, statFormat, per90, percentileRank, percentileRankPer90, sourcePath, raw} ],
  "statsSections":     {
    "shooting":    { title, metrics[], metricsCount },
    "passing":     { ... },
    "possession":  { ... },
    "defending":   { ... },
    "discipline":  { ... }
  },
  "recentMatches":     [ كل المباريات (56/62/49) مع raw + rating + POTM + onBench + ... ],
  "careerHistory":     {
    "careerBySeason": [ كل موسم لكل category (senior/youth/national) ],
    "careerByTeam":   [ كل فريق مع startDate/endDate/transferType/active/role ],
    "fullCareer":     ...,
    "raw":            ...
  },
  "statSeasons":       [ كل المواسم مع كل البطولات + hasDeepStats ],
  "trophies":          { playerTrophies[], coachTrophies[] (مع seasonsWon/RunnerUp بالكامل) },
  "traits":            [ key, title, value, raw ],
  "shotmap":           { available, count, shots[] (كاملة), summary{totalShots, goals, xG, xGOT, ...} },
  "heatmap":           { available, count, coordinates[] (كاملة), summary{averageX, averageY} },
  "keeperShotmap":     { available, raw },
  "nextMatch":         { matchId, homeName, awayName, leagueId, matchDate, raw },
  "relatedLinks":      { teammatesCount, teammates[], mensNationalTeam, womensNationalTeam },
  "rawColumns":        { topLevelKeys, pagePropsKeys, dataKeys },
  "rawPayloadPath":    "...",
  "rawPayloadSizeKB":  595.8,
  "unknownButPreserved": { أي قسم غير متوقع يبقى محفوظ مع sourcePath },
  "flattenedMetrics":  { 170+ metric بسيطة للوصول السريع },
  "roleHints":         [ "attacker_finisher", "creator_winger", ... ],
  "qualityReport":     { availableSections, missingSections, ...counts, warnings }
}
```

---

## 4. أمثلة من اللاعبين الثلاثة

### 4.1 لامين يامال (id 1467236)
- **النادي:** برشلونة — **المركز:** Right Winger — **القدم المفضلة:** يسرى — **العمر:** 18
- **القيمة السوقية:** €182.4m (39 نقطة في تاريخ القيم السوقية)
- **بطولة Main:** LaLiga 2025/2026 → 16 هدف، 11 صناعة، 28 مباراة، 2268 دقيقة، تقييم 8.33
- **statsSections:** Shooting (7 metrics) / Passing (10) / Possession (9) / Defending (11) / Discipline (2) = **39 metric**
- **shotmap:** 117 شوت — xG = 12.81 — xGOT = 12.18
- **heatmap:** 2341 إحداثي
- **traits:** chances_created (0.96)، dribbles_succeeded، goals، …
- **recentMatches:** 56 مباراة كاملة بدون قطع
- **careerHistory:** 9 مواسم، 5 فرق، tournamentBreakdown مفصّل
- **trophies:** 5 بطولات (LaLiga، EURO 2024، …)
- **flattenedMetricsCount:** 175 — **rawPayloadSizeKB:** 595.8
- **roleHints:** `["attacker_finisher", "creator_winger"]`

### 4.2 روبرت ليفاندوفسكي (id 93447)
- **النادي:** برشلونة — **المركز:** Striker
- **statsSections:** 39 metric
- **shotmap:** 61 شوت
- **heatmap:** 657 إحداثي
- **careerHistory:** 34 موسم (مسيرة طويلة)، 6 فرق
- **marketValues:** 70 نقطة تاريخية
- **trophies:** 17 بطولة!
- **recentMatches:** 62
- **flattenedMetricsCount:** 175

### 4.3 كول بالمر (id 1096353)
- **النادي:** Chelsea — **المركز:** Attacking Midfielder
- **statsSections:** 38 metric
- **shotmap:** 61 شوت
- **heatmap:** 1315 إحداثي
- **careerHistory:** 24 موسم، 11 فريق
- **marketValues:** 62 نقطة
- **trophies:** 13 بطولة
- **recentMatches:** 49
- **flattenedMetricsCount:** 172

| اللاعب | حجم Mega | حجم Summary | recentMatches | flattened | warnings |
| --- | --- | --- | --- | --- | --- |
| Lamine Yamal | 528 KB | 3.9 KB | 56 | 175 | [] |
| Lewandowski | 553 KB | 4.1 KB | 62 | 175 | [] |
| Cole Palmer | 479 KB | 4.2 KB | 49 | 172 | [] |

---

## 5. flattenedMetrics — أمثلة

```json
{
  "main_league_goals":        { "value": 16, "label": "Goals", "category": "mainLeague" },
  "top_goals":                { "value": "16", "label": "Goals", "category": "seasonTop", "per90": 0.63, "percentileRank": 100 },
  "top_goals_per90":          { "value": 0.63, "label": "Goals per 90" },
  "top_goals_pct_rank":       { "value": 100, "label": "Goals percentile rank" },
  "shooting_expected_goals":  { "value": "12.81", "label": "xG", "category": "shooting", "per90": 0.51, "percentileRank": 100 },
  "passing_expected_assists": { "value": "10.09", "label": "xA", "percentileRank": 100 },
  "shotmap_xG":               { "value": 12.81, "label": "Shotmap xG", "category": "shotmap" },
  "heatmap_averageX":         { "value": 70.34, "label": "Heatmap averageX" },
  "recent_avg_rating":        { "value": 7.91, "label": "Recent avg rating" },
  "trophies_won_total":       { "value": 5, "label": "Trophies won (total)" },
  "career_seasons_count":     { "value": 9, "label": "Career season entries" },
  "market_currentValue":      { "value": 200000, "label": "currentValue", "category": "marketValue" }
}
```

> 175 metric بهذه السرعة من lookup واحد، بدون الحاجة للدخول recursive.

---

## 6. خيارات الاستخدام

```bash
# مباشرة
python deploy/reo-datafabric/tools/build_fotmob_mega_profile.py --player-id 1467236 --name "Lamine Yamal"

# من خلال الـ CLI الموحّد
python deploy/reo-datafabric/tools/reo_fotmob_cli.py mega-player --id 1467236 --name "Lamine Yamal"
```

- إذا الـ raw JSON موجود في `cache/fotmob/player_next_data/{id}.json` → يقرأ منه فقط (بدون اتصال بالإنترنت).
- إذا غير موجود → يستدعي `FotMobProvider.get_player_next_data` مرة واحدة (مع احترام rate limit و buildId cache).

---

## 7. المبادئ المُحترَمة

- ✅ بدون أي تعديل على Player Stats Lab أو PlayerStatsRenderer.
- ✅ بدون أي تعديل على player-stats-bridge أو `/api/player-stats`.
- ✅ بدون أي تعديل على FBref cache.
- ✅ بدون FlareSolverr / SeleniumBase / scraping عدواني.
- ✅ بدون redesign — فقط طبقة data إضافية مستقلة.
- ✅ raw payload يبقى محفوظًا (لم يُحذف).
- ✅ أي قسم غير معروف يدخل `unknownButPreserved` بدلًا من حذفه.

---

## 8. ماذا بقي للدمج مع FBref لاحقًا

في مرحلة لاحقة (Phase X.6 محتملة) يمكن:

1. **بناء Player Intel V2 Adapter:** يقرأ Mega Profile (FotMob) + FBref cache ويخرج view موحّد للقالب.
2. **mapping بين localizedTitleId في FotMob و FBref columns:** مثلاً `progressive_passes`, `key_passes`, `tackles` للـ 6 metrics التي ما تزال missing في bridge.
3. **متوسطات per-90 موحّدة:** FotMob يعطيها مباشرة من `topStatCard.per90`، FBref يحتاج حسابها يدويًا.
4. **مقاييس percentileRank:** هذه ميزة فريدة في FotMob — FBref لا يقدّمها مباشرة. يمكن استخدامها في القالب لإضافة شريط "أعلى 5% في Big5" مثلاً.
5. **shotmap + heatmap:** بصريات قوية للقالب يمكن رسمها مباشرة من Mega Profile.
6. **marketValue trend:** chart بسيط يعرض نمو القيمة السوقية (يامال: من €80k إلى €200m في 39 نقطة).

---

## 9. Smoke verification

| فحص | النتيجة |
| --- | --- |
| `py_compile fotmob_provider.py` | exit 0 |
| `py_compile reo_fotmob_cli.py` | exit 0 |
| `py_compile inspect_fotmob_json.py` | exit 0 |
| `py_compile build_fotmob_mega_profile.py` | exit 0 |
| Yamal mega build | OK — 175 metric، 56 مباراة |
| Lewandowski mega build | OK — 175 metric، 62 مباراة |
| Palmer mega build | OK — 172 metric، 49 مباراة |
| كل warnings | فارغة `[]` |
| قسم `unknownButPreserved` يحفظ غير المعروف | ✅ |
| الملفات الكاملة > 470 KB | ✅ |
| الـ summaries < 5 KB | ✅ |
| لم يُلمس FBref / Bridge / Player Stats Lab | ✅ |

---

## 10. الـ commit

```
feat: build FotMob mega player profiles
```

الفرع: `main` — push مباشر.
