# Phase X.8 — Player Intel V2 Broadcast Template

تاريخ: 2026-05-19  
الفرع: main  
Commit: `feat: add Player Intel V2 broadcast template`

---

## 1. ما هو Player Intel V2؟

قالب بث (Overlay) جديد ومستقل تمامًا عن Player Stats Lab القديم. يعرض بطاقة تحليل لاعب احترافية بجودة بث 16:9 مبنية على بيانات **Player Intel Master Profile** (FotMob + FBref مدمجين).

| الخاصية | القيمة |
| --- | --- |
| OverlayType | `PLAYER_INTEL_V2` |
| Template ID | `template-player-intel-v2` |
| الاسم العربي | استخبارات اللاعب V2 |
| الأيقونة | 🧠 |
| اللون | `#22d3ee` (cyan) |
| المجموعة | `PLAYER_INTEL` |

---

## 2. الفرق بين Preview Lab (X.7) و Broadcast Template (X.8)

| | Preview Lab (X.7) | Broadcast Template (X.8) |
| --- | --- | --- |
| الغرض | استكشاف وفحص البيانات | عرض بث مباشر |
| الوصول | `#/player-intel-v2-preview` | من Library → إنشاء قالب جديد |
| التصميم | Dashboard / جدول / بحث | بطاقة 16:9 broadcast quality |
| يظهر في Library | لا | نعم |
| يدعم Live/Hidden | لا | نعم |
| يدعم syncManager | لا | نعم |
| يدعم OBS output | لا | نعم |
| يعرض metricCatalog | نعم (340+ metric) | لا (4-12 metric فقط) |

---

## 3. كيف يستخدم Master Profile

### 3.1 مصادر البيانات (بدون API)

| المصدر | الآلية |
| --- | --- |
| Sample summary | `public/player-intel-v2-samples/{slug}.master.summary.json` (2.5 KB) |
| Pasted master JSON | حقل `masterJson` في Editor (client-side فقط) |
| Config fields | `samplePlayer`, `cardType`, `heroMetricsCount`, ... |

> لا يوجد fetch من الإنترنت. لا API backend. لا scraping.

### 3.2 Metric Resolver

`components/player-intel-v2/playerIntelV2MetricResolver.ts` يأخذ:
- البيانات (full master أو summary)
- نوع البطاقة (cardType)
- عدد hero/secondary metrics

ويرجع:
```ts
{
  heroMetrics: ResolvedMetric[],
  secondaryMetrics: ResolvedMetric[],
  meta: { player, club, season, position, imageUrl, cardTitle, cardTitleAr },
  sourceCoverage: { fotmob, fbref },
  qualityWarnings: string[],
  isSummaryOnly: boolean,
}
```

**Tolerant:** يتجاهل null، يتجاهل missing، لا يفشل أبدًا.

---

## 4. كيف يختار broadcastCards

| cardType في Editor | يقرأ من | المحتوى |
| --- | --- | --- |
| `attacker_card` | `broadcastCards.attacker` | goals, assists, xg, shots, rating, recent |
| `playmaker_card` | `broadcastCards.playmaker` | assists, xa, key_passes, sca, gca |
| `winger_card` | `broadcastCards.winger` | crosses, dribbles, touches, sca |
| `defender_card` | `broadcastCards.defender` | tackles, interceptions, blocks, aerial |
| `form_report` | `broadcastCards.form_report` | recent matches, goals, assists, rating, POTM |
| `market_report` | `broadcastCards.market_report` | currentValue, highest, growth |
| `season_report` | `broadcastCards.season_report` | goals, assists, matches, minutes, rating |
| `complete_report` | `broadcastCards.complete_report` | 10 metrics شاملة |

> إذا البيانات summary فقط (بدون broadcastCards)، يستخدم `mainLeague.stats` كبديل.

---

## 5. إعدادات القالب في Editor

| الحقل | النوع | الخيارات |
| --- | --- | --- |
| اختيار لاعب | select | Lamine Yamal / Lewandowski / Cole Palmer |
| نوع البطاقة | select | 8 أنواع |
| إحصائيات رئيسية | select | 4 / 5 / 6 |
| إحصائيات ثانوية | select | 4 / 6 / 8 |
| النمط البصري | select | Broadcast Dark / Barcelona Night / Clean Studio |
| إظهار المصادر | boolean | ✓ |
| إظهار Footer | boolean | ✓ |
| لصق Master JSON | textarea | (اختياري — للبيانات الكاملة) |

> **بسيط ونظيف** — لا API URL، لا provider policy، لا debug panel.

---

## 6. التصميم البصري

### 6.1 الأنماط الثلاثة

| النمط | الخلفية | اللون الرئيسي |
| --- | --- | --- |
| Broadcast Dark | gradient أسود/رمادي داكن | cyan `#22d3ee` |
| Barcelona Night | gradient بنفسجي/أسود | أحمر برشلوني `#a50044` |
| Clean Studio | gradient رمادي/أزرق داكن | أزرق `#3b82f6` |

### 6.2 البنية

```
┌─────────────────────────────────────────────────────────────┐
│  [صورة اللاعب]  │  [عنوان البطاقة]                         │
│                  │  [اسم اللاعب - كبير]                     │
│                  │  [النادي • المركز • الموسم]              │
│                  │                                           │
│                  │  ┌─────┐ ┌─────┐ ┌─────┐                │
│                  │  │Hero │ │Hero │ │Hero │  (3-6 metrics)  │
│                  │  │Metric│ │Metric│ │Metric│               │
│                  │  └─────┘ └─────┘ └─────┘                │
│                  │                                           │
│                  │  [Secondary] [Secondary] [Secondary] ... │
│                  │                                           │
│                  │  [FotMob ✓] [FBref ✓]                   │
├─────────────────────────────────────────────────────────────┤
│  REO Data Fabric • FotMob + FBref                           │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Hero Metric Card
- اسم المقياس (عربي إذا متاح)
- القيمة بخط كبير
- شريط percentile rank (إذا متاح)

### 6.4 Secondary Metric Chip
- اسم مختصر
- قيمة بخط متوسط

---

## 7. كيف يحافظ على Player Stats القديم

| الجانب | الحالة |
| --- | --- |
| `PlayerStatsRenderer.tsx` | لم يُلمس |
| `OverlayType.PLAYER_STATS` | يبقى كما هو |
| Player Stats Lab في Editor | لم يُلمس |
| `player-stats-bridge` | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| FBref cache | لم يُلمس (read-only في Phase X.6 فقط) |
| FotMob provider | لم يُلمس |
| Preview Lab (X.7) | يبقى يعمل بشكل مستقل |

> التعديلات على ملفات موجودة:
> - `types.ts`: سطر واحد (إضافة `PLAYER_INTEL_V2` للـ enum)
> - `OverlayRenderer.tsx`: سطرين (import + render line)
> - `constants.ts`: إضافة template definition + spread في `_allTemplates`
> - `utils/templateRegistry.ts`: إضافة fallback meta entry

---

## 8. الملفات الجديدة

| الملف | الوصف |
| --- | --- |
| `components/renderers/PlayerIntelV2Renderer.tsx` | الـ renderer الرئيسي (بطاقة 16:9) |
| `components/player-intel-v2/playerIntelV2MetricResolver.ts` | resolver يحوّل JSON إلى metrics جاهزة |

---

## 9. Smoke verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` (tsc --noEmit) | exit 0 |
| `npm run build` | exit 0، built in 5.56s |
| OverlayType.PLAYER_INTEL_V2 مسجّل | ✅ |
| Template يظهر في Library | ✅ (عبر INITIAL_TEMPLATES) |
| OverlayRenderer يعرض القالب | ✅ |
| templateRegistry fallback meta | ✅ |
| Player Stats القديم لم يُلمس | ✅ |
| Preview Lab يبقى يعمل | ✅ |
| لا API backend جديد | ✅ |
| لا scraping | ✅ |
| لا demo data | ✅ |

---

## 10. ماذا بقي للمرحلة القادمة

1. **Phase X.9 (محتمل):** ربط القالب بـ API endpoint يقرأ master profile من VPS.
2. **بحث لاعبين:** إضافة search field يبحث في FotMob ويبني master profile on-demand.
3. **مقارنة لاعبين:** mode جديد يعرض لاعبين جنبًا إلى جنب.
4. **Animations:** دخول/خروج متحرك للبطاقة.
5. **Sound cues:** ربط بـ audioEngine عند الظهور.
6. **Arabic labels كاملة:** ترجمة كل 340+ metric.
7. **Season comparison:** عرض تطور اللاعب عبر المواسم.
