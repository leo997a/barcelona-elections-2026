# Phase X.3: FotMob Provider via apigw + Next.js _next/data

تاريخ: 2026-05-19
المرحلة: X.3 — تصحيح FotMob provider بـ apigw search و Next.js buildId

---

## ملخص

استبدلنا endpoints الفاشلة `/api/*` بطريقتين تعملان فعليًا:

1. **البحث:** `apigw.fotmob.com/searchapi/suggest`
2. **بيانات اللاعب:** `www.fotmob.com/_next/data/{buildId}/...`

---

## النتائج العملية

### Test 1: Lamine Yamal
```
Search:  apigw.fotmob.com/searchapi/suggest?term=Lamine Yamal&lang=en
         → ID: 1467236, Team: Barcelona

buildId: 2sSDGl2tD-ZfIpsvlWMuI (مستخرج من home page)

Player:  /_next/data/{bid}/en/players/1467236/lamine-yamal.json
         → 1108 KB JSON

Report:
  Name:     Lamine Yamal
  Club:     Barcelona
  Position: Right Winger (rightwinger)
  Country:  Spain
  Height:   180 cm
  Foot:     Left
  Recent:   10 matches with goals/assists/minutes
```

### Test 2: Robert Lewandowski
```
ID:       93447
File:     840 KB
Position: Striker
Country:  Poland
Height:   185 cm
Foot:     Right
```

### Test 3: Cole Palmer
```
ID:       1096353
File:     853 KB
Position: Attacking Midfielder
Country:  England
Height:   185 cm
Foot:     Left
```

**كل الاختبارات الثلاثة نجحت ✅**

---

## كيف يعمل

### 1. البحث عبر apigw
```python
GET https://apigw.fotmob.com/searchapi/suggest?term={name}&lang=en
```
يرجع JSON بصيغة:
```json
{
  "squadMemberSuggest": [{
    "options": [{
      "text": "Lamine Yamal|1467236",
      "payload": {"id": "1467236", "teamId": 8634, "teamName": "Barcelona"}
    }]
  }]
}
```

### 2. استخراج buildId
```python
GET https://www.fotmob.com/
regex: /"buildId":"([^"]+)"/
```
يُحفظ في cache 24 ساعة (لأن FotMob يعيد deploy عدة مرات يوميًا).

### 3. _next/data للاعب
```
https://www.fotmob.com/_next/data/{buildId}/en/players/{id}/{slug}.json
  ?lng=en&id={id}&slug={slug}
```
يرجع JSON كامل بحجم 800-1100 KB يحتوي:
- pageProps.data
  - name, birthDate, contractEnd
  - primaryTeam (id, name)
  - positionDescription (label, key)
  - playerInformation (country, height, foot, ...)
  - recentMatches (10 آخر مباريات)
  - mainLeague.stats (إحصائيات الموسم)

### 4. آلية fallback ذكية
- لو buildId قديم → الـ provider يجرّب refresh تلقائي ويعيد المحاولة
- لو 404 على apigw → يسجل SOURCE_SEARCH_FAILED ويتوقف
- لو 403/429 → يسجل SOURCE_BLOCKED_OR_RATE_LIMITED ويتوقف بعد 3 مرات

---

## ميزات السلامة

- Cache محلي: 6 ساعات للاعب، 24 ساعة لـ buildId، 1 ساعة للمباريات
- Rate limit: 3 ثوانٍ بين كل طلب
- Retry: مرتان فقط
- Timeout: 30 ثانية
- Health tracking: يتوقف ذاتيًا بعد 3 فشل متتالي
- لا proxy، لا SeleniumBase، لا FlareSolverr، لا 24/7 polling

---

## الملفات المُنتجة

```
deploy/reo-datafabric/
├── providers/
│   └── fotmob_provider.py        ← updated
├── tools/
│   └── reo_fotmob_cli.py          ← updated
├── cache/fotmob/
│   ├── {hash}.json                ← search + matches + buildId cache
│   └── player_next_data/
│       ├── 1467236.json           ← Lamine Yamal raw (1108 KB)
│       ├── 93447.json             ← Lewandowski raw (840 KB)
│       └── 1096353.json           ← Cole Palmer raw (853 KB)
└── reports/player_fotmob/
    ├── lamine-yamal.json          ← structured report
    ├── robert-lewandowski.json
    └── cole-palmer.json
```

---

## ما لم يُلمس

| العنصر | الحالة |
|---|---|
| Player Stats Lab | لم يُلمس |
| player-stats-bridge | لم يُلمس |
| /api/player-stats | لم يُلمس |
| VPS cache | لم يُلمس |
| التوكنات | لم تُلمس |
| FBref cache | لم يُلمس |
| FlareSolverr / SeleniumBase / proxy | لم يُستخدم |

---

## ملاحظات للمرحلة التالية (Player Intel V2)

1. **rating** field في recent_matches رجع `None` — قد يكون موجود في مكان آخر داخل `pageProps.data` (يحتاج فحص أعمق للـ raw JSON)
2. **mainLeague.stats** — لم تظهر في report لأن البنية تغيرت؛ يحتاج تحديث `build_player_report` ليتعامل مع البنية الجديدة
3. **positionDescription.primaryPosition** لم يعد موجود؛ الجديد: `label` + `key`
4. **buildId** يتغير عدة مرات يوميًا — الـ provider يتعامل تلقائيًا
5. **حجم JSON** 800-1100 KB لكل لاعب — قد نحتاج تخزين انتقائي لاحقًا

---

## الأمر للاستخدام

```powershell
# Search
python deploy/reo-datafabric/tools/reo_fotmob_cli.py search-player --name "Lamine Yamal"

# Player full data
python deploy/reo-datafabric/tools/reo_fotmob_cli.py player --id 1467236 --name "Lamine Yamal"

# Health
python deploy/reo-datafabric/tools/reo_fotmob_cli.py health
```
