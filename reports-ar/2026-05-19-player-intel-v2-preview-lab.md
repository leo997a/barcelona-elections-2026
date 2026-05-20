# Phase X.7 — Player Intel V2 Preview Lab

تاريخ: 2026-05-19  
الفرع: main  
الرابط: `#/player-intel-v2-preview`

---

## 1. لماذا Preview Lab قبل القالب النهائي؟

قبل بناء قالب البث الجديد (Phase X.8 لاحقًا)، نحتاج فضاءً مستقلًا لاستعراض بيانات Master Profile الناتجة من Phase X.6 والتحقق من:

- **هل البيانات وصلت بشكل صحيح من المصدرين؟** FotMob + FBref.
- **ما البطاقات الجاهزة للعرض؟** attacker، playmaker، defender، …
- **هل توجد تعارضات؟** بين المصادر.
- **ما الإحصائيات المتاحة فعلًا؟** عبر فهرس قابل للبحث.

> Preview Lab هو **read-only**. لا يعدّل بيانات. لا يُغيّر قالبًا. لا يربك Player Stats Lab الحالي.

---

## 2. الملفات الجديدة

| الملف | الوصف |
| --- | --- |
| `components/player-intel-v2/playerIntelV2Types.ts` | كل الأنواع TypeScript للملخص والملف الكامل |
| `components/player-intel-v2/playerIntelV2Labels.ts` | تسميات عربية (LAB_LABELS, CARD_AR_TITLES, FBREF_GROUP_AR, WARNING_AR) |
| `components/player-intel-v2/PlayerIntelV2Preview.tsx` | المكوّن الأعلى (player picker، paste، سُمّاريات، quality، cards، catalog) |
| `components/player-intel-v2/PlayerIntelV2SourceCoverage.tsx` | لوحة مصادر البيانات + groups المُطابَقة |
| `components/player-intel-v2/PlayerIntelV2CardsPanel.tsx` | عرض البطاقات مع إمكانية الفتح/الإغلاق |
| `components/player-intel-v2/PlayerIntelV2MetricTable.tsx` | جدول قابل للبحث لـ metricCatalog |
| `pages/player-intel-v2-preview.tsx` | wrapper الصفحة |
| `App.tsx` (تحديث) | hash route `#/player-intel-v2-preview` يتجاوز license gate |
| `deploy/reo-datafabric/tools/export_player_intel_v2_samples.py` | أداة Python لنسخ ملفات summary إلى public/ |
| `public/player-intel-v2-samples/index.json` | فهرس مولّد |
| `public/player-intel-v2-samples/lamine-yamal.master.summary.json` | عينة (2.5 KB) |
| `public/player-intel-v2-samples/robert-lewandowski.master.summary.json` | عينة (2.6 KB) |
| `public/player-intel-v2-samples/cole-palmer.master.summary.json` | عينة (2.5 KB) |

---

## 3. كيف يصل المختبر إلى Master Profile؟

### 3.1 Sample mode (الافتراضي)
- يُحمَّل `public/player-intel-v2-samples/index.json` عند فتح الصفحة.
- يعرض اللاعبين كأزرار اختيار.
- اختيار لاعب يُحمّل ملف summary الصغير (2.5 KB) فقط.
- البيانات المتاحة في هذا الوضع: counts، sources، topAvailableCards (بدون items)، canonicalKeys، warnings، conflicts.

### 3.2 Paste mode
- يوجد textarea يقبل JSON كامل من ملف `*.master.json` (1+ MB).
- المعالجة **client-side فقط** — لا fetch، لا upload، لا حفظ.
- بعد parse ناجح، تظهر:
  - تفاصيل كل بطاقة مع metric items (label, value, percentile rank).
  - فهرس metricCatalog كامل (340+ metric) قابل للبحث.
  - صورة اللاعب من `fotmob.fullProfile.images.playerImage`.

> **السبب:** ملفات master الكبيرة (~1 MB لكل لاعب) gitignored ولا تُرفع. هذا يحمي الـ repo من تراكم runtime data.

---

## 4. لماذا لا نضع ملفات master في git؟

| السبب | التفصيل |
| --- | --- |
| الحجم | كل ملف ~1.0–1.2 MB، 3 لاعبين = 3.5 MB، بضع عشرات لاحقًا = >50 MB |
| Runtime data | تتغير كل يوم (مع تحديث FBref/FotMob)، لا تستحق commit |
| لا حاجة في الإنتاج | المختبر يعمل بـ summaries (2.5 KB) أو paste manual |
| Vercel deploy وقت | كل MB إضافي يُبطئ الـ deploy |

`.gitignore` يحوي:
```
deploy/reo-datafabric/reports/player_fotmob_mega/
deploy/reo-datafabric/reports/player_intel_master/
```

---

## 5. كيف تعمل Broadcast Cards في المختبر؟

8 بطاقات معرَّفة في Phase X.6 (داخل `BROADCAST_CARDS_DEF`):

| key | الترجمة | عناصر يامال |
| --- | --- | --- |
| `complete_report` | تقرير كامل | 10 |
| `season_report` | تقرير الموسم | 9 |
| `attacker` | بطاقة هجومية | 8 |
| `form_report` | تقرير الفورمة | 8 |
| `market_report` | تقرير السوق | 5 |
| `playmaker` | صانع لعب | 4 |
| `winger` | جناح | 4 |
| `defender` | مدافع | 4 |

في **summary mode**، تظهر البطاقات كأزرار مع itemsCount فقط.  
في **paste mode**، تظهر تفاصيل كل عنصر داخل البطاقة (label + value + source + percentile rank إذا متاح).

> هذا يسمح للمنتج/المُحرر باختبار أي بطاقة قبل ربطها بقالب البث.

---

## 6. واجهة UI

### 6.1 الأقسام
1. **Header** — عنوان عربي + زر رجوع (إن وُجد).
2. **Player picker / Paste** — اختيار لاعب أو لصق JSON.
3. **Player overview** — اسم + نادي + موسم + مركز + صورة + 7 chips للعدد.
4. **Source Coverage** — FotMob badge + FBref badge + مجموعات مُطابَقة وأخرى مفقودة.
5. **Quality Report** — warnings + conflicts (أو رسالة "لا توجد مشاكل").
6. **Broadcast Cards** — قائمة 8 بطاقات (قابلة للتوسيع في paste mode).
7. **Metric Catalog** — جدول قابل للبحث (active فقط في paste mode).

### 6.2 ميزات التصميم
- RTL كامل، Tajawal font.
- Dark panel (gray-950 + gray-900 borders).
- Sticky header مع backdrop blur.
- Badges ملوّنة للمصادر (أخضر = متاح، رمادي = غير متاح).
- Conflicts باللون الأحمر، warnings بالبرتقالي، success بالأخضر.
- بدون صندوق AI.
- بدون تبويبات كثيرة.
- لا lyrical decorations — فقط معلومات.

---

## 7. الفصل عن النظام القديم

| الجانب | الحالة |
| --- | --- |
| `PlayerStatsRenderer` | لم يُلمس |
| `Player Stats Lab` (داخل Editor) | لم يُلمس |
| `player-stats-bridge` على VPS | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| `OverlayType` enum | لم يُضَف عنصر جديد |
| `OverlayRenderer` | لم يُلمس |
| `templateRegistry` | لم يُلمس |
| `audioEngine` | لم يُلمس |
| `License gate` | تم تجاوزه فقط لهذا الـ hash route |
| `Vercel config` | لم يُلمس |

> التعديل الوحيد على ملف موجود هو 2 سطر في `App.tsx`:
> 1. import للصفحة الجديدة.
> 2. early return إذا hash يبدأ بـ `#/player-intel-v2-preview`.

---

## 8. Smoke verification

| فحص | النتيجة |
| --- | --- |
| `python -m py_compile export_player_intel_v2_samples.py` | exit 0 |
| تشغيل الأداة | 3 ملفات منسوخة + index.json |
| `npm run lint` (tsc --noEmit) | exit 0 |
| `npm run build` | exit 0، built in 9.01s |
| ملف samples في dist | ✅ كل الملفات الـ 4 منسوخة من public/ |
| الحجم الإجمالي للـ samples | ~13 KB (3 ملفات + index) |
| Vite build size warning | فقط chunk size > 500 KB (متوقع لمشروع كبير) |

---

## 9. كيفية الاستخدام محليًا

```bash
# 1. تحديث ملفات samples (إذا تغيّرت master)
python deploy/reo-datafabric/tools/export_player_intel_v2_samples.py

# 2. تشغيل dev server
npm run dev

# 3. افتح في المتصفح
http://localhost:3000/#/player-intel-v2-preview
```

> الرابط **يستخدم hash** فلا يحتاج license gate.  
> على Vercel سيكون: `https://barcelona-elections-2026.vercel.app/#/player-intel-v2-preview`

---

## 10. ماذا بقي لـ Phase X.8

ما سيُبنى لاحقاً (ليس الآن):

1. **OverlayType جديد** مثل `PLAYER_INTEL_V2` في `types.ts`.
2. **PlayerIntelV2Renderer** قالب بث فعلي مرتبط بـ syncManager.
3. **API endpoint** يقرأ master profile من VPS (إذا قررنا رفع البيانات إلى cache مركزي).
4. **اختيار card من المختبر** ↔ مجال `selectedCardKey` في الـ overlay.
5. **Comparison mode** — مقارنة لاعبين جنبًا إلى جنب باستخدام canonical metrics.
6. **Live updates** — إعادة بناء master profile تلقائيًا كل ساعة.

> الفلسفة: **نفصل الاستكشاف عن الإنتاج.** المختبر يساعدنا نقرر شكل القالب قبل بناءه.

---

## 11. الـ commit

```
feat: add Player Intel V2 preview lab
```

الفرع: `main` — push بعد build ناجح.
