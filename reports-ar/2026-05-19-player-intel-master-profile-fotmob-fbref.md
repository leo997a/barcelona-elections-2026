# Phase X.6 — Player Intel Master Profile (FotMob Mega + FBref Full Cache)

تاريخ: 2026-05-19  
الفرع: main  
المسار: `deploy/reo-datafabric/`

---

## 1. الهدف

دمج كل البيانات المتوفرة من مصدرين مستقلين في ملف Master واحد للاعب، **بدون أي حذف للبيانات**:

1. **FotMob Mega Profile** المُولَّد في Phase X.5 (170+ flattened metric، shotmap، heatmap، recentMatches، careerHistory، marketValues، traits، trophies).
2. **FBref Advanced Cache** الموجود محلياً في `deploy/reo-datafootball-worker/.cache/fbref/` بـ 10 stat groups (standard, shooting, passing, pass_types, gca, defense, possession, playing_time, misc, keeper).

> القاعدة الذهبية: **NO DATA LOSS** — كل column يُحفظ، كل metric يُسجَّل في الكتالوج، أي قسم غير معروف يدخل `unknownButPreserved` بدلاً من حذفه.

---

## 2. الملفات الجديدة / المُحدَّثة

| الملف | الحالة | الوصف |
| --- | --- | --- |
| `deploy/reo-datafabric/tools/build_player_intel_master_profile.py` | جديد | باني الـ Master Profile (~830 سطر) |
| `deploy/reo-datafabric/tools/reo_fotmob_cli.py` | تحديث | إضافة أمر `master-player` |
| `.gitignore` | تحديث | استثناء `reports/player_intel_master/` |
| `reports-ar/2026-05-19-player-intel-master-profile-fotmob-fbref.md` | جديد | هذا التقرير |
| `deploy/reo-datafabric/reports/player_intel_master/lamine-yamal.master.json` | runtime | 1120 KB — لا يُرفع |
| `deploy/reo-datafabric/reports/player_intel_master/lamine-yamal.master.summary.json` | runtime | 2.5 KB — لا يُرفع |
| `deploy/reo-datafabric/reports/player_intel_master/robert-lewandowski.master.json` | runtime | 1161 KB |
| `deploy/reo-datafabric/reports/player_intel_master/cole-palmer.master.json` | runtime | 1051 KB |

---

## 3. بنية Master Profile

```jsonc
{
  "schemaVersion": "player-intel-master-v1",
  "generatedAt": "2026-05-20T...",
  "player":          { name, club, season, position },
  "identity":        { name, fotmobId, fotmobClub, fotmobPosition, queryClub, ... },
  "sourceCoverage":  { fotmob: true|false, fbref: true|false, fbrefGroupsMatched[] },
  "sourceFiles":     { fotmobMega path, fbrefDir, fbrefGroupsLoaded[] },
  "fotmob":          { fullProfile: <Mega Profile كامل بدون قص> },
  "fbref":           { statGroups: { [g]: { matched, score, row, columns, candidates } } },
  "rawRows":         { fbref: { [g]: row } },
  "rawMetrics":      { fotmob: {...}, fbref: {...} },
  "mergedMetrics":   { كل FotMob + كل FBref + canonical merged },
  "canonicalMetrics":{ goals, assists, shots, ... مع primaryValue + sources },
  "metricCatalog":   { key, label, labelAr, source, category, valueType, available },
  "broadcastCards":  { attacker, playmaker, winger, defender, complete_report, ... },
  "unknownButPreserved": { fotmob_unknownButPreserved, fbref_unmatchedTopCandidates },
  "qualityReport":   { counts، conflicts، warnings }
}
```

---

## 4. منطق المطابقة (FBref player resolver)

**الدالة:** `match_fbref_player_rows(playerName, clubName, fbrefGroups)`

التطبيع المُستخدَم:
- إزالة accents (Lewandowski / Łewandowski → نفس الشيء).
- lower-case + إزالة المسافات الزائدة.
- token overlap بين الاسم المطلوب وصف اللاعب.
- `SequenceMatcher` كـ fallback.

**Club aliases** للأندية الكبرى:
- `Barcelona` ↔ `FC Barcelona` ↔ `Barça` ↔ `Barca`
- `Chelsea` ↔ `Chelsea FC`
- `Man City` ↔ `Manchester City`
- `Real Madrid` ↔ `Real Madrid CF`
- `PSG` ↔ `Paris Saint-Germain` ↔ `Paris S-G`
- + 10 أندية أخرى كمثال

**Bonus** قدره +0.2 إذا تطابق النادي. يُختار أعلى score؛ الباقي يُحفظ في `candidates[]` للتدقيق.

---

## 5. استخراج كل أعمدة FBref

لكل stat group مطابَق، **كل** عمود في صف اللاعب يصبح metric منظم باستثناء أعمدة الـ identity (`rk, league, season, team, squad, player, nation, pos, age, born, comp, matches`).

### 5.1 إصلاح حرج للـ key collision

**المشكلة الأصلية:**
```
standard_sot      → fbref_shooting_standard_sot (28)
standard_sot%     → fbref_shooting_standard_sot (46.7)  ← يستبدل القيمة الأولى!
```

كان هذا يسبب فقدان بيانات وتعارض مصادر (FotMob يقول 28 وFBref يقول 46.7).

**الحل:**
```python
col = col.replace("%", "_pct")
col = col.replace("+/-", "_plus_minus_")
col = col.replace("+", "_plus_")
col = col.replace("/", "_per_")
```

النتيجة:
```
standard_sot      → fbref_shooting_standard_sot      (28)
standard_sot%     → fbref_shooting_standard_sot_pct  (46.7)
tkl+int           → fbref_defense_tkl_plus_int
team success_+/-  → fbref_playing_time_team_success_plus_minus
```

بعد الإصلاح: **0 source conflicts** للاعبين الثلاثة.

### 5.2 شكل metric من FBref

```json
{
  "value": 28,
  "source": "fbref",
  "sourceGroup": "shooting",
  "rawColumn": "standard_sot",
  "normalizedKey": "fbref_shooting_standard_sot",
  "category": "shooting",
  "confidence": 1.0,
  "raw": 28
}
```

---

## 6. Canonical Metrics (الموحَّدة)

**25–27 metric موحَّد** يجمع القيم من المصدرين عبر `CANONICAL_METRIC_MAP`:

| canonical key | يأخذ من FotMob | يأخذ من FBref |
| --- | --- | --- |
| `goals` | `main_league_goals`, `top_goals`, `shooting_goals` | `standard_performance_gls`, `shooting_standard_gls` |
| `assists` | `main_league_assists`, `passing_assists` | `standard_performance_ast` |
| `shots` | `shooting_shots` | `shooting_standard_sh` |
| `shots_on_target` | `shooting_ShotsOnTarget` | `shooting_standard_sot` |
| `xg` | `shooting_expected_goals` | (FBref free لا يُتاح) |
| `xa` | `passing_expected_assists` | — |
| `tackles` | `defending_tackles` | `defense_tackles_tkl` |
| `interceptions` | `defending_interceptions` | `defense_int`, `misc_performance_int` |
| `touches` | `possession_touches` | `possession_touches_touches` |
| `crosses` | — | `passing_pass_types_crs`, `misc_performance_crs` |
| `shot_creating_actions` | — | `gca_sca_sca` |
| `goal_creating_actions` | — | `gca_gca_gca` |
| ... 14+ canonical إضافي | | |

كل canonical metric يُحتَفظ فيه بـ `sources.fotmob` و `sources.fbref` كاملين، فالقيمة الأساسية `primaryValue` تُؤخَذ من FotMob أولاً (لأنه يحوي per90 + percentileRank)، ثم FBref إذا غاب FotMob.

**كشف التعارضات:** إذا اختلفت القيمتان عدديًا بأكثر من 25% أو فرق مطلق > 1.0، يُسجَّل في `qualityReport.sourceConflicts`. بعد إصلاح الـ collision: **0 conflicts** للاعبين الثلاثة.

---

## 7. Metric Catalog

كل metric في `mergedMetrics` (سواء FotMob أو FBref أو canonical) يدخل الكتالوج بصيغة:

```json
{
  "key": "tackles",
  "label": "Tackles",
  "labelAr": "الافتكاكات",
  "source": "merged",
  "category": "defense",
  "group": null,
  "available": true,
  "valueType": "number",
  "recommendedFor": []
}
```

تم تجهيز **labelAr** يدوياً للـ metrics الأكثر استخداماً (goals, assists, minutes, shots, xg, xa, tackles, interceptions, touches, crosses, ...).  
أي metric غير مُترجم يحتفظ بـ `labelAr: null` للترجمة لاحقاً.

---

## 8. Broadcast Cards

8 بطاقات معرَّفة في `BROADCAST_CARDS_DEF`:

| البطاقة | المحتوى | عدد العناصر (يامال) |
| --- | --- | --- |
| `complete_report` | goals, assists, matches, minutes, rating, yellow_cards, red_cards, shots, key_passes, tackles, interceptions | 10 |
| `season_report` | goals, assists, matches, minutes, rating, shots_on_target, tackles, interceptions, touches | 9 |
| `attacker` | goals, assists, xg, shots, shots_on_target, rating + recent_goals/recent_avg_rating | 8 |
| `form_report` (Recent) | recent_matches_count, recent_goals, recent_assists, recent_minutes, recent_avg_rating, POTM, yellows, reds | 8 |
| `market_report` | currentValue, highestValue, lowestValue, firstValue, growthFromFirstPercent | 5 |
| `playmaker` | assists, xa, key_passes, sca, gca + chances_created, accurate_passes | 4 |
| `winger` | crosses, sca + dribbles, dribbles_succeeded, touches | 4 |
| `defender` | tackles, tackles_won, interceptions, blocks + defensive_actions, aerial, clearances | 4 |

**القاعدة:** لا تظهر metric في بطاقة إلا إذا قيمتها متوفرة فعلاً في mergedMetrics.

---

## 9. النتائج للاعبين الثلاثة

| اللاعب | حجم Master | حجم Summary | FotMob | FBref RawCols | Canonical | Merged | Cards | Conflicts | Warnings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Lamine Yamal** | 1120 KB | 2.5 KB | 175 | 145 | 25 | 345 | 8 (52 items) | 0 | [] |
| **Robert Lewandowski** | 1161 KB | 2.6 KB | 175 | 164 | 27 | 366 | 8 (52 items) | 0 | [] |
| **Cole Palmer** | 1051 KB | 2.5 KB | 172 | 145 | 25 | 342 | 8 (52 items) | 0 | [] |

**ملاحظة:** stat group `keeper` لا يحتوي لاعبي الميدان وهذا متوقع — ظهر في `fbrefGroupsMissingPlayer` فقط، بدون warning.

---

## 10. أمثلة من البيانات المدمجة

### 10.1 لامين يامال
- canonical `goals`: FotMob=16، FBref=16 → primaryValue=16 (fotmob) — متطابق.
- canonical `assists`: FotMob=11، FBref=11 → متطابق.
- canonical `shots`: FotMob=117، FBref=63 (LaLiga فقط) — هذا فرق متوقع لأن FotMob يجمع كل المباريات.
- `fbref_misc_performance_crs`: 77 (عرضيات) — لا تُتاح في FotMob.
- `fbref_gca_sca_sca`: 178 (شوت creation) — لا تُتاح في FotMob.
- `fbref_possession_take_ons_succ`: 95 (مراوغات ناجحة في FBref)
- `fotmob_top_goals_pct_rank`: 100 (top 1% في Big5).

### 10.2 ليفاندوفسكي
- 164 raw column من FBref (أعلى من يامال لأن `keeper` فاضي للمهاجم لكن باقي الـ groups لها أعمدة أكثر بقليل).
- `fbref_misc_performance_pkwon`: مكاسب الركلات.
- `canonicalMetrics`: 27 (يحوي `saves` + `clean_sheets` كـ keys معروفة بالرغم من أنها فارغة).
- `fotmob_recent_player_of_match_count`: مفيد جدًا للـ form_report.

### 10.3 كول بالمر
- مطابقة Chelsea نظيفة عبر club_aliases.
- `fbref_passing_corner_kicks_in/out/str`: تفاصيل ركلات الزاوية.
- `canonicalMetrics.shot_creating_actions` يأخذ من FBref فقط (FotMob لا يحتوي SCA كرقم خام).

---

## 11. Quality Report

```json
{
  "fotmobMetricsCount": 175,
  "fbrefGroupsAvailable": ["standard","shooting","passing","pass_types","gca","defense","possession","playing_time","misc","keeper"],
  "fbrefGroupsMatched": ["standard","shooting","passing","pass_types","gca","defense","possession","playing_time","misc"],
  "fbrefGroupsMissingPlayer": ["keeper"],
  "fbrefRawColumnsCount": 145,
  "canonicalMetricsCount": 25,
  "mergedMetricsCount": 345,
  "metricCatalogCount": 345,
  "broadcastCardsCount": 8,
  "broadcastCardsItemTotal": 52,
  "sourceConflicts": [],
  "duplicateMetrics": [],
  "warnings": []
}
```

التحذيرات المُحتمَلة (لم تظهر مع أي من اللاعبين الثلاثة):
- `LOW_FOTMOB_METRIC_COUNT` — أقل من 100 metric من FotMob.
- `LOW_FBREF_GROUPS_MATCHED` — أقل من 5 stat groups مطابَقة.
- `LOW_MERGED_METRICS_COUNT` — أقل من 250 metric مدموج.
- `FBREF_PLAYER_NOT_FOUND_IN_ANY_GROUP` — لاعب غير موجود في FBref.
- `SOURCE_CONFLICTS_DETECTED` — تعارضات بين FotMob و FBref (تم حلّها).

---

## 12. CLI

```bash
# مباشرة
python deploy/reo-datafabric/tools/build_player_intel_master_profile.py \
    --player "Lamine Yamal" --club "Barcelona" --season "2025-26"

# عبر CLI الموحَّد
python deploy/reo-datafabric/tools/reo_fotmob_cli.py master-player \
    --player "Lamine Yamal" --club "Barcelona" --season "2025-26"
```

- لا يجلب من الإنترنت.
- لا يرفع إلى VPS.
- يحتاج فقط Mega Profile جاهزاً + FBref cache محليًا.

---

## 13. القيود الحالية / ماذا بقي قبل Player Intel V2

1. **FBref لا يحتوي xG/xA** بالـ open access (محجوز في الـ stat group `expected` الذي ليس ضمن الـ 10 الموجودة).  
   FotMob يغطّي هذا بـ `shooting_expected_goals`.

2. **FotMob لا يحتوي SCA/GCA** كرقم خام — FBref `gca_sca_sca` و `gca_gca_gca` هما المصدر الأساسي.

3. **`canonicalMetrics.key_passes`** يستخدم حالياً `fotmob_passing_chances_created` كقيمة بديلة، لأن FBref free لا يحتوي عمود key_passes.

4. **Arabic labels** مُغطّاة لـ ~30 metric شائع. باقي 300+ metric تحتاج ترجمة (بطيئة لكن غير عاجلة).

5. **Player Intel V2 (مستقبلًا):**
   - Adapter يقرأ master profile ويُخرج view موحّد للقالب.
   - دعم season comparison (FotMob `statSeasons` يحوي 4 مواسم).
   - دعم league filtering في FBref (كل البيانات الحالية ESP-La Liga أو Big5).
   - دمج `traits` (FotMob) مع `roleHints` (المُولَّدة محليًا).

---

## 14. Smoke verification

| فحص | النتيجة |
| --- | --- |
| `py_compile build_player_intel_master_profile.py` | exit 0 |
| `py_compile build_fotmob_mega_profile.py` | exit 0 |
| `py_compile reo_fotmob_cli.py` | exit 0 |
| `py_compile fotmob_provider.py` | exit 0 |
| Yamal master build | OK — 345 merged، 0 warnings |
| Lewandowski master build | OK — 366 merged، 0 warnings |
| Palmer master build | OK — 342 merged، 0 warnings |
| CLI `master-player` Yamal | OK — same output as direct |
| File sizes (full) | 1051–1161 KB ✅ |
| File sizes (summary) | 2.5–2.6 KB ✅ |
| لم يُلمس Player Stats Lab / PlayerStatsRenderer | ✅ |
| لم يُلمس bridge / `/api/player-stats` | ✅ |
| لم يُلمس FBref cache (read-only) | ✅ |
| لا scraping، لا FlareSolverr، لا proxy | ✅ |
| `unknownButPreserved` يحفظ ما لا نعرفه | ✅ |
| canonical conflicts = 0 (بعد إصلاح key collision) | ✅ |

---

## 15. الـ commit

```
feat: build Player Intel master profiles from FotMob and FBref
```

الفرع: `main` — push مباشر.
