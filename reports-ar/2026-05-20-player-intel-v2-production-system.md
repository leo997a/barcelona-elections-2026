# Phase X.9 — Player Intel V2 Production System

تاريخ: 2026-05-20  
الفرع: main

---

## 1. المشكلة السابقة

- القالب كان محدودًا بـ 3 لاعبين hardcoded في constants.ts.
- الـ renderer كان يقرأ `.master.summary.json` (2.5 KB) الذي لا يحوي `broadcastCards` → لا إحصائيات تظهر.
- Arabic labels كانت mojibake (╪د┘╪ث...) لأن JSON يُقرأ بترميز خاطئ في بعض البيئات.
- التصميم كان يبدو كـ dashboard فارغ وليس بطاقة بث.

---

## 2. الحلول المُطبَّقة

### 2.1 Registry ديناميكي

أداة جديدة: `deploy/reo-datafabric/tools/build_player_intel_public_registry.py`

- تفحص كل ملفات `*.master.json` في `reports/player_intel_master/`.
- تستخرج broadcast subset (~35 KB) يحوي `broadcastCards` مع قيم حقيقية.
- تكتب `public/player-intel-v2-samples/index.json` بقائمة كل اللاعبين.
- أي لاعب جديد يُضاف تلقائيًا بعد تشغيل الأداة.

### 2.2 قائمة لاعبين ديناميكية

- الـ renderer يحمّل `index.json` عند التشغيل.
- يحدّث خيارات `samplePlayer` في Editor ديناميكيًا.
- لا حاجة لتعديل constants.ts عند إضافة لاعب جديد.

### 2.3 Arabic labels نظيفة

- أضفت `METRIC_AR_MAP` في `playerIntelV2Labels.ts` مع 40+ ترجمة نظيفة.
- دالة `getMetricAr()` تكشف mojibake وتتجاهلها.
- الأولوية: map ثابت > labelAr من JSON (إذا ليس mojibake) > English fallback.

### 2.4 تصميم broadcast حقيقي

- خلفية radial gradient داكنة (ليست flat).
- صورة اللاعب 28% من العرض مع gradient fade.
- Badge نوع البطاقة بلون accent.
- Hero metrics بـ 3 أعمدة مع percentile bar.
- Secondary metrics بـ 4 أعمدة مضغوطة.
- Source badges صغيرة (FotMob ✓ / FBref ✓).
- Footer شفاف بـ gradient.
- لا فراغات ضخمة.

---

## 3. كيف تضيف لاعب جديد

```bash
# 1. بناء FotMob Mega Profile
python deploy/reo-datafabric/tools/build_fotmob_mega_profile.py --player-id XXXXX --name "Player Name"

# 2. بناء Master Profile (FotMob + FBref)
python deploy/reo-datafabric/tools/build_player_intel_master_profile.py --player "Player Name" --club "Club" --season "2025-26"

# 3. تحديث Registry العام
python deploy/reo-datafabric/tools/build_player_intel_public_registry.py

# 4. إعادة بناء الواجهة
npm run build
```

بعد هذه الخطوات، اللاعب الجديد يظهر تلقائيًا في قائمة Player Intel V2.

---

## 4. لصق Master JSON

بديل سريع بدون تشغيل أوامر:
1. افتح ملف `*.master.json` (1+ MB) محليًا.
2. انسخ المحتوى كاملاً.
3. الصقه في حقل "لصق Master JSON" في إعدادات القالب.
4. القالب يعرض البيانات فورًا (client-side فقط).

---

## 5. الملفات المُعدَّلة / الجديدة

| الملف | الحالة |
| --- | --- |
| `deploy/reo-datafabric/tools/build_player_intel_public_registry.py` | جديد |
| `components/renderers/PlayerIntelV2Renderer.tsx` | أُعيد كتابته بالكامل |
| `components/player-intel-v2/playerIntelV2Labels.ts` | إضافة METRIC_AR_MAP + getMetricAr() |
| `components/player-intel-v2/playerIntelV2MetricResolver.ts` | استخدام getMetricAr() |
| `constants.ts` | إزالة hardcoded options |
| `public/player-intel-v2-samples/index.json` | تحديث بصيغة registry |
| `public/player-intel-v2-samples/*.broadcast.json` | تحديث |

---

## 6. ما بقي للمرحلة التالية

1. إضافة المزيد من اللاعبين (Pedri, Gavi, Raphinha, ...).
2. Animations دخول/خروج.
3. Sound cues عند الظهور.
4. مقارنة لاعبين (split-screen).
5. Season comparison mode.
6. ربط بـ API endpoint على VPS (اختياري).
