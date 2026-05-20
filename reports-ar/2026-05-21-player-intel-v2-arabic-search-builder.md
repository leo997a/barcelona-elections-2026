# Phase X.11 — Player Intel V2: Arabic Player Search + On-Demand Profile Builder

تاريخ: 2026-05-21  
الفرع: main

---

## 1. المشكلة السابقة

قبل هذه المرحلة، Player Intel V2 كان يعرض فقط 3 لاعبين:
- Lamine Yamal
- Robert Lewandowski
- Cole Palmer

السبب: dropdown يقرأ من `index.json` فقط، بدون أي طريقة لإضافة لاعب جديد بالعربي أو الإنجليزي من داخل الواجهة.

---

## 2. ما تم بناؤه

### 2.1 Arabic-Aware Player Resolver (TypeScript)

ملف: `components/player-intel-v2/playerIntelV2PlayerResolver.ts`

- **`normalizeArabic`**: إزالة التشكيل، توحيد ا/أ/إ/آ، توحيد ي/ى، توحيد الهمزات.
- **`normalizeEnglish`**: lowercase + إزالة accents.
- **`ARABIC_PLAYER_MAP`**: ~20 اسم عربي ↔ إنجليزي (يامال، ليفاندوفسكي، بالمر، مبابي، بيدري، غافي، صلاح، …).
- **`ARABIC_CLUB_MAP`**: ~25 نادي (برشلونة، تشيلسي، ريال مدريد، باريس، مان سيتي، ليفربول، بايرن، يوفنتوس، إنتر، …).
- **`translateArabicQuery`**: تحويل query عربي إلى صيغة إنجليزية موحّدة.
- **`resolveQuery`**: matching مع scoring قائم على token overlap.
- **`detectCompareQuery`**: كشف "مقارنة بين X و Y" / "X vs Y" / "X ضد Y".
- **`detectPresetIntent`**: كشف نوع البطاقة (هجوم/صانع لعب/فورمة/سوق/...).

### 2.2 Search API Endpoint (Vercel function)

ملف: `api/player-intel-v2/search-player.ts`

- POST endpoint مستقل تمامًا عن `/api/player-stats` القديم.
- يقرأ `public/player-intel-v2-samples/index.json` وdist fallback.
- يستخدم `resolveQuery` لمطابقة الـ query.
- يرجع matches مرتبة بالـ confidence score.
- يحترم CORS و method check.

### 2.3 Search UI داخل Editor Panel

في تبويب "أساسي" داخل `PlayerIntelV2EditorPanel.tsx`:

- **مربع بحث** بـ placeholder: "اكتب اسم اللاعب أو النادي بالعربي أو الإنجليزي..."
- **زرّان**: "بحث وبناء البروفايل" + "بحث فقط".
- **رسائل حالة عربية**:
  - ✓ "تم العثور على X داخل المكتبة وتحديده."
  - ⚠ "لم يتم العثور على اللاعب. اكتب الاسم بالإنجليزي أو أضف النادي."
- **قائمة نتائج** عند وجود أكثر من تطابق، مع زر "لاعب 1" / "لاعب 2" (في compare mode).
- **أمثلة جاهزة** قابلة للنقر.
- **Enter** يطلق البحث.

### 2.4 المساعد الذكي يستخدم الـ resolver الجديد

`runAssistant` الآن:
- يكشف intent المقارنة عبر `detectCompareQuery`.
- يقسّم الـ query إلى queryA + queryB ويبحث عن كلٍّ في registry.
- يكشف preset عبر `detectPresetIntent`.
- يطبّق mode + players + preset + hero/secondary metrics في خطوة واحدة.
- toast بالعربي:
  - "تم اختيار ليفاندوفسكي وتطبيق بطاقة هجومية"
  - "مقارنة: ليفاندوفسكي ضد يامال (بطاقة هجومية)"

أمثلة جاهزة في تبويب المساعد:
- بطاقة هجومية لليفاندوفسكي
- تقرير كامل لكول بالمر
- مقارنة بين ليفاندوفسكي ويامال
- بطاقة صانع لعب ليامال
- أريد إحصائيات ديمبيلي مع باريس
- ابحث عن مبابي ريال مدريد

### 2.5 On-Demand Profile Builder (Python)

ملف: `deploy/reo-datafabric/tools/build_player_intel_profile_on_demand.py`

Pipeline يعمل محليًا فقط:
1. Resolve query (Arabic/English) → player + club.
2. Search FotMob via existing CLI (يطلب `--player-id` للجولة الأولى).
3. Build mega profile (Phase X.5).
4. Build master profile (Phase X.6).
5. Update public registry (Phase X.9).
6. Verify broadcast.json size ≤ 200 KB.

**يعيد استخدام الأدوات الموجودة فقط** — لا scraping جديد، لا FlareSolverr، لا Selenium.

---

## 3. حالة "لاعب غير موجود"

النظام **لا يخترع بيانات أبدًا**:
- إذا الـ query لا يطابق أي لاعب في registry → رسالة عربية واضحة.
- إذا اللاعب موجود في `ARABIC_PLAYER_MAP` لكن ليس في registry → رسالة "هذا اللاعب غير موجود في المكتبة بعد. يمكن إضافته عبر أداة البناء عند توفر مصدر بيانات."
- لا demo، لا أرقام مخترعة، لا fallback عشوائي.

---

## 4. كيف تضيف لاعب جديد

### الطريقة 1: عبر On-Demand Builder

```bash
# الخطوة الأولى: ابحث في FotMob لمعرفة player ID
python deploy/reo-datafabric/tools/reo_fotmob_cli.py search-player --name "Pedri"

# الخطوة الثانية: استخدم الـ ID لبناء البروفايل الكامل
python deploy/reo-datafabric/tools/build_player_intel_profile_on_demand.py \
    --query "بيدري برشلونة" \
    --player-id <ID> \
    --season "2025-26"

# الخطوة الثالثة: أعد بناء الواجهة
npm run build
```

### الطريقة 2: لصق Master JSON في Editor

ما زال متاحًا — حقل "لصق Master JSON" يقبل ملف master كامل client-side بدون upload.

---

## 5. حماية النظام القديم

| الجانب | الحالة |
| --- | --- |
| Player Stats Lab | لم يُلمس |
| PlayerStatsRenderer.tsx | لم يُلمس |
| /api/player-stats | لم يُلمس |
| player-stats-bridge | لم يُلمس |
| VPS | لم يُلمس |
| FBref cache | لم يُلمس |
| FotMob provider | يُستدعى فقط من `build_player_intel_profile_on_demand.py` كأداة سطر أوامر |
| التوكنات | لم تُلمس |
| نظام الترخيص | لم يُلمس |
| Player Intel V2 الحالي | أُضيف له فقط، لم يُكسر شيء |

---

## 6. الملفات الجديدة / المعدّلة

| الملف | الحالة |
| --- | --- |
| `components/player-intel-v2/playerIntelV2PlayerResolver.ts` | جديد (~200 سطر) |
| `api/player-intel-v2/search-player.ts` | جديد |
| `deploy/reo-datafabric/tools/build_player_intel_profile_on_demand.py` | جديد |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | تحديث (search UI + assistant integration) |
| `reports-ar/2026-05-21-player-intel-v2-arabic-search-builder.md` | جديد |

---

## 7. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (5.93s) |
| `py_compile build_player_intel_profile_on_demand.py` | exit 0 |
| Player Intel V2 ما زال يعمل | ✅ |
| Search box يظهر في تبويب أساسي | ✅ |
| البحث المحلي عن "ليفاندوفسكي" يجد Robert Lewandowski | ✅ منطقياً |
| البحث عن "Cole Palmer Chelsea" يجد Cole Palmer | ✅ منطقياً |
| البحث عن "لاعب وهمي" يعرض رسالة عربية واضحة | ✅ |
| المساعد يدعم compare via "مقارنة بين X و Y" | ✅ |
| لا يظهر أي demo data | ✅ |

---

## 8. ما لا يزال يحتاج مصدر بيانات أوسع

- **مكتبة لاعبين أوسع**: حالياً 3 فقط في registry. الإضافة تتطلب توليد master profile لكل لاعب جديد.
- **بحث FotMob auto-resolver**: حالياً `build_player_intel_profile_on_demand.py` يحتاج `--player-id` يدوي. الجولة القادمة يمكنها parsing نتائج `search-player` تلقائيًا.
- **Compact broadcast generator**: إذا الملف الناتج > 200 KB، نحتاج وضع "compact" يحذف raw players list.
- **Multi-source resolver**: حاليًا فقط FotMob. لاحقًا يمكن دمج SportMonks أو مصادر أخرى موجودة.

---

## 9. ما الذي بقي للمرحلة التالية (X.12)

1. ربط `build_player_intel_profile_on_demand` بـ Vercel function (مع cron محدود) ليبني on-demand من الواجهة.
2. تحويل API search إلى Edge function لتسريع الاستجابة.
3. إضافة 10-15 لاعب جاهزين في registry.
4. Auto-suggestion أثناء الكتابة.
5. حفظ آخر بحث لكل user في localStorage.
