# Phase X.2: REO FotMob Provider Foundation

تاريخ: 2026-05-19
المرحلة: X.2 — بناء مصدر FotMob الأساسي

---

## ما تم بناؤه

### البنية الجديدة
```
deploy/reo-datafabric/
├── providers/
│   ├── __init__.py
│   └── fotmob_provider.py      ← المزوّد الرئيسي
├── tools/
│   └── reo_fotmob_cli.py       ← واجهة سطر الأوامر
├── cache/
│   └── fotmob/                  ← كاش محلي JSON
└── reports/
    └── player_fotmob/           ← تقارير اللاعبين
```

### Endpoints المدعومة
| Endpoint | الوظيفة | الحالة |
|---|---|---|
| `/api/search/suggest` | بحث عن لاعب/فريق | ❌ 404 (API تغيّر) |
| `/api/searchData` | بحث بديل | ❌ 404 (API تغيّر) |
| `/api/playerData?id=` | بيانات لاعب كاملة | ❌ 404 (API تغيّر) |
| `/api/teams?id=` | بيانات فريق | ❌ 404 (API تغيّر) |
| `/api/matches?date=` | مباريات يوم | ❌ 404 (API تغيّر) |
| `/api/matchDetails?matchId=` | تفاصيل مباراة | ❌ 404 (API تغيّر) |

---

## نتيجة الاختبار

**جميع endpoints ترجع HTTP 404 مع صفحة HTML.**

هذا يعني أن FotMob غيّرت بنية API الخاصة بها منذ آخر تحديث للمراجع المستخدمة:
- `pseudo-r/Public-FotMob-API` — آخر تحديث قديم
- `caicedogamer/FotmobScraper` — يستخدم `buildId` + `_next/data` وهو أحدث

### السبب المحتمل:
FotMob انتقلت من `/api/*` endpoints مباشرة إلى Next.js `_next/data/{buildId}/*` endpoints.
هذا يتطلب:
1. استخراج `buildId` من الصفحة الرئيسية
2. بناء URLs بصيغة: `https://www.fotmob.com/_next/data/{buildId}/en/players/{id}/{slug}.json`

### ما لم نفعله (حسب الممنوعات):
- لم نستخدم FlareSolverr
- لم نستخدم SeleniumBase
- لم نستخدم ScraperAPI
- لم نعمل scraping عدواني (محاولتان فقط لكل endpoint)

---

## ماذا نستفيد من FotMob (عند نجاح الاتصال)

| البيان | FBref | FotMob |
|---|---|---|
| إحصائيات الموسم | ✅ شاملة (Big 5) | ✅ لكل لاعب فردي |
| تقييمات المباريات | ❌ | ✅ (rating per match) |
| آخر 10 مباريات | ❌ | ✅ مع أهداف/أسيست/دقائق |
| معلومات شخصية | ❌ | ✅ (طول، قدم، جنسية) |
| تشكيلات المباريات | ❌ | ✅ |
| أحداث المباراة (أهداف، بطاقات) | ❌ | ✅ |
| بيانات الفريق + التشكيلة | ❌ | ✅ |
| مباريات اليوم | ❌ | ✅ |

---

## كيف يختلف عن FBref

- **FBref** = إحصائيات موسم كاملة لـ 3000+ لاعب (Big 5 مجتمعة)
- **FotMob** = بيانات فردية غنية (تقييمات، مباريات أخيرة، معلومات شخصية)
- **الاستخدام المثالي**: FBref للكاش الأساسي + FotMob للتفاصيل الفردية والمباريات

---

## ما بقي لاحقًا لـ Player Intel V2

1. **buildId extraction** — استخراج buildId من صفحة FotMob الرئيسية
2. **_next/data endpoints** — بناء URLs الجديدة
3. **Cookie warmup** — زيارة الصفحة الرئيسية أولاً لإنشاء session
4. **Scrapling fallback** — كما في caicedogamer/FotmobScraper
5. **دمج مع Player Stats Lab** — إضافة FotMob كمصدر ثانوي بجانب FBref

---

## ما لم يُلمس

| العنصر | الحالة |
|---|---|
| PlayerStatsRenderer | لم يُلمس |
| player-stats-bridge | لم يُلمس |
| /api/player-stats | لم يُلمس |
| VPS cache | لم يُلمس |
| التوكنات | لم تُلمس |
| FBref cache | لم يُلمس |

---

## الملفات المُنشأة

| الملف | الوظيفة |
|---|---|
| `deploy/reo-datafabric/providers/__init__.py` | Package marker |
| `deploy/reo-datafabric/providers/fotmob_provider.py` | FotMob API provider مع cache + rate limit + health tracking |
| `deploy/reo-datafabric/tools/reo_fotmob_cli.py` | CLI: search-player, player, team, matches, match, health |

---

## الخلاصة

البنية التحتية جاهزة ومختبرة. الـ provider مكتوب بشكل آمن مع:
- Rate limiting (3 ثوانٍ بين الطلبات)
- Cache محلي (6 ساعات TTL)
- Health tracking (يتوقف بعد 3 فشل متتالي)
- Error handling (لا يكسر شيئًا عند الفشل)

المشكلة الوحيدة: FotMob غيّرت API endpoints إلى `_next/data` format.
الحل في Phase X.3: إضافة buildId extraction + _next/data support.
