# Phase X.4: FotMob Raw JSON Deep Mapper

تاريخ: 2026-05-19
المرحلة: X.4 — تعميق استخراج البيانات من Raw JSON

---

## ملخص

بعد نجاح Phase X.3 في جلب raw JSON بحجم 800–1100 KB لكل لاعب، هذه المرحلة استخرجت
كل الأقسام المفيدة منه: top stat card، main league stats، recent matches مع
ratings حقيقية، career history، traits، trophies، market values، وغيرها.

---

## ما تم بناؤه

### 1. أداة الفحص (Inspector)

ملف: `deploy/reo-datafabric/tools/inspect_fotmob_json.py`

استخدام:
```powershell
python deploy/reo-datafabric/tools/inspect_fotmob_json.py --player-id 1467236
```

تطبع:
- Top-level keys
- pageProps keys
- pageProps.data keys مع type/size لكل واحد
- Sections summary (populated vs empty)
- Keyword search recursive لـ: rating, ratingProps, stats, mainLeague,
  recentMatches, careerHistory, season, statSeasons, minutesPlayed, goals,
  assists, xG, xA, shots, shotmap, position, primaryTeam, league,
  topStatCard, statsSection, marketValues, traits, trophies
- Sample من mainLeague stats
- Sample من firstSeasonStats.topStatCard.items
- Sample من recentMatches[0..4] مع الـ ratings
- Sample من careerHistory categories
- Sample من traits items

### 2. Mapper محسّن في الـ Provider

ملف: `deploy/reo-datafabric/providers/fotmob_provider.py`

دوال استخراج جديدة (top-level helpers):
- `_extract_summary` — identity + club + position + bio + transfer value
- `_extract_top_stat_card` — Goals/Assists/Rating/Matches/Started/Minutes مع percentile ranks
- `_extract_main_league_stats` — 8 stats من mainLeague (LaLiga, Premier League, ...)
- `_extract_recent_matches` — 12 آخر مباريات مع rating حقيقي
- `_extract_career_history` — senior/youth/national team
- `_extract_traits` — 6 صفات (Chances created, Aerial duels, ...)
- `_extract_trophies` — won/runner-up by tournament
- `_extract_market_values` — first + latest قيمة سوقية
- `_extract_stat_seasons_index` — 4 مواسم متاحة
- `_extract_next_match` — معلومات المباراة القادمة

### 3. Image URL

تلقائي لكل لاعب:
```
https://images.fotmob.com/image_resources/playerimages/{playerId}.png
```

### 4. تقارير اللاعبين

كل لاعب يحفظ في:
```
deploy/reo-datafabric/reports/player_fotmob/{slug}.json
```

البنية الجديدة:
```json
{
  "source": "fotmob",
  "method": "next_data",
  "player_id": 1467236,
  "summary": { ...identity + club + position + bio... },
  "season_top_stats": [ ...6 headline stats... ],
  "main_league_stats": [ ...8 league stats... ],
  "recent_matches": [ ...12 matches with ratings... ],
  "career_history": [ ...senior/youth/national... ],
  "traits": [ ...6 playing style... ],
  "trophies": [ ...won/runner_up by tournament... ],
  "market_values": { first + latest },
  "stat_seasons_index": [ ...4 seasons... ],
  "next_match": { ...if scheduled... },
  "image_url": "https://images.fotmob.com/image_resources/playerimages/{id}.png",
  "availableSections": [ ...18 populated sections... ],
  "missingSections": [ ...empty sections... ],
  "extractedMetrics": [ ...19 items... ],
  "rawPayloadSizeKB": 595.8,
  "rawPayloadPath": "...",
  "raw_top_keys": [ ...all 27 keys... ]
}
```

---

## النتائج العملية (3 لاعبين)

### 1. Lamine Yamal (ID 1467236)
```
Position:  Right Winger
Country:   Spain
Height:    180 cm
Foot:      Left
Age:       18
Shirt:     #10
Value:     €182.4m

Season Top Stats:
  Goals:    16 (rank: 100%)
  Assists:  11 (rank: 100%)
  Rating:   8.33 (rank: 100%)
  Matches:  28 (rank: 55%)
  Started:  26 (rank: 87%)
  Minutes:  2268 (rank: 89%)

Recent (5 of 56):
  vs Celta Vigo:        rating=7.7, G=1, A=0, 44 min
  vs Atletico Madrid:   rating=9.0, G=1, A=0, 90 min
  vs Espanyol:          rating=9.3, G=1, A=2, 90 min
  vs Atletico Madrid:   rating=8.3, G=0, A=0, 90 min
  vs Atletico Madrid:   rating=8.6, G=0, A=0, 90 min

Traits:
  Chances created:     0.96
  Aerial duels:        0.00
  Defensive actions:   0.34
  Goals:               0.99
  Shot attempts:       1.00
  Touches:             0.99
```

### 2. Robert Lewandowski (ID 93447)
```
Position:  Striker
Country:   Poland
Height:    185 cm
Foot:      Right
Age:       37
Shirt:     #9
Value:     9.3m

Season: 13 G, 2 A, rating 6.92, 30 matches, 1566 min
Recent:  6.8 / 6.0 / 6.4 / 7.9 / 7.7 ratings
```

### 3. Cole Palmer (ID 1096353)
```
Position:  Attacking Midfielder
Country:   England
Height:    185 cm
Foot:      Left
Age:       24
Shirt:     #10
Value:     101m

Season: 9 G, 1 A, rating 7.03, 25 matches, 1875 min
```

---

## الإصلاحات

### 1. Position display
**قبل:**
```
Position: {'label': 'Right Winger', 'key': 'rightwinger'} (None)
```
**بعد:**
```
Position: Right Winger
```

السبب: البنية الفعلية هي `positionDescription.primaryPosition.label`. الـ mapper الجديد يقرأ المسار الصحيح.

### 2. Logging إلى stdout
أضفت `logger.handlers[0]` يستخدم `sys.stdout` بدل `stderr`.
أضفت `logger.propagate = False` لمنع التكرار.
هذا يقلل ظهور logs الحمراء `NativeCommandError` في PowerShell.

### 3. Recent matches ratings
**قبل:** rating كان `None` دائمًا.
**بعد:** rating من `recentMatches[i].ratingProps.rating` (string مثل "7.7", "9.0", "9.3").

---

## مقاييس الجودة

| المقياس | القيمة |
|---|---|
| Top-level data sections في raw JSON | 27 |
| Sections مستخرجة في report | 18-19 |
| Sections فارغة (طبيعي للاعبين بدون نشاط دولي) | 2 (internationalDuty, coachStats) |
| Recent matches متاحة | 56 (نحفظ 12) |
| Career seasons متاحة | 4 |
| Traits متاحة | 6 |
| Stats blocks في mainLeague | 8 |
| حجم raw payload | 580-600 KB |
| حجم report structured | 14-19 KB |

---

## الأوامر للاستخدام

```powershell
# Inspect raw JSON
python deploy/reo-datafabric/tools/inspect_fotmob_json.py --player-id 1467236

# Build full structured report
python deploy/reo-datafabric/tools/reo_fotmob_cli.py player --id 1467236 --name "Lamine Yamal"

# Search
python deploy/reo-datafabric/tools/reo_fotmob_cli.py search-player --name "Lamine Yamal"
```

---

## ما لم يُلمس

| العنصر | الحالة |
|---|---|
| Player Stats Lab | لم يُلمس |
| player-stats-bridge | لم يُلمس |
| /api/player-stats | لم يُلمس |
| FBref cache | لم يُلمس |
| FlareSolverr / SeleniumBase / proxy | لم يُستخدم |

---

## الخطوات التالية المقترحة

1. **Phase X.5** — استخراج `firstSeasonStats.shotmap` (heatmap لمواقع التسديدات)
2. **Phase X.6** — استخراج `firstSeasonStats.statsSection` (Shooting/Passing/Possession sections)
3. **Phase X.7** — استخراج `statSeasons[].tournaments[].stats` لكل المواسم (4 مواسم × N بطولات)
4. **Phase X.8** — دمج FotMob كمصدر ثانوي في Player Stats Lab بجانب FBref
5. **Phase Y** — قالب جديد "Player Spotlight" يستخدم traits + image_url + market_values
