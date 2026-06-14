# تقرير: Bootstrap بيانات Player Intel V2 داخل Player Stats Bridge

التاريخ: 2026-06-14  
المرحلة: PLAYER-STATS-BRIDGE-SEED-BOOTSTRAP-001  
الهدف: جعل جسر إحصائيات اللاعبين يعطي بيانات حقيقية أولية من عينات Player Intel V2 الموجودة في المشروع، بدون الاعتماد على SSH أو استيراد يدوي بالتوكن.

## الملخص التنفيذي

تم تجهيز الجسر بحيث يقرأ ملف seed مدمجًا داخل المشروع عند أول تشغيل أو عندما يكون ملف البيانات التشغيلي فارغًا. هذا يحل مشكلة `realDataAvailable=false` في Hostinger بعد ربط `REO_PLAYER_STATS_BRIDGE_URL` و`REO_PLAYER_STATS_BRIDGE_TOKEN`، لأن الجسر لم يكن يحتوي بيانات فعلية بعد.

الحل لا يضيف API جديدًا، ولا يغير قوالب البث، ولا يلمس Player Intel UI، ولا Stream Deck. التعديل محصور داخل `cloud/reo-player-stats-bridge`.

## مصدر البيانات

لم يتم اختراع بيانات أو إدخال fake data. تم بناء seed من ملفات موجودة أصلًا في المشروع:

- `public/player-intel-v2-samples/cole-palmer.broadcast.json`
- `public/player-intel-v2-samples/lamine-yamal.broadcast.json`
- `public/player-intel-v2-samples/robert-lewandowski.broadcast.json`

هذه العينات مبنية من تغطية `fotmob+fbref` داخل المشروع، وتم تحويل `canonicalMetrics` إلى صيغة الجسر.

## ما تم تنفيذه

1. إضافة سكربت توليد seed:
   - `cloud/reo-player-stats-bridge/scripts/build-player-intel-v2-seed.mjs`

2. إضافة أمر npm:
   - `npm run seed:player-intel-v2 -- .\seeds\player-intel-v2-seed.json`

3. إضافة ملف seed ثابت:
   - `cloud/reo-player-stats-bridge/seeds/player-intel-v2-seed.json`

4. تعديل `server.js`:
   - إضافة `REO_PLAYER_STATS_SEED_FILE`.
   - إذا كانت القيمة `off` يتم تعطيل seed للاختبارات.
   - إذا كان ملف البيانات التشغيلي غير موجود أو فارغًا، يستخدم الجسر seed المدمج.
   - إضافة `seedFile` و`seedAvailable` في `/api/status`.

5. تعديل اختبار العقد:
   - `scripts/verify-contract.mjs` يعطل seed أثناء اختبار upsert الأساسي حتى يبقى الاختبار القديم مستقرًا.

## اللاعبين المستوردين في seed

| اللاعب | النادي | الموسم | عدد المقاييس |
|---|---|---:|---:|
| Cole Palmer | Chelsea | 2025/26 | 20 |
| Lamine Yamal | Barcelona | 2025/26 | 20 |
| Robert Lewandowski | Barcelona | 2025/26 | 22 |

إجمالي المقاييس: 62.

## اختبارات محلية

تم تشغيل:

- `npm run validate:json -- .\seeds\player-intel-v2-seed.json`
  - النتيجة: نجاح.
  - `playerCount=3`
  - `statCount=62`
  - لا أخطاء ولا تحذيرات.

- `npm run verify`
  - النتيجة: نجاح.
  - أكد أن upsert/export/player-stats ما زالت تعمل بدون seed أثناء اختبار العقد.

- اختبار seed fallback محلي:
  - تشغيل الجسر بملف بيانات غير موجود.
  - `/api/status` أعاد `playerCount=3` و`seedAvailable=true`.
  - طلب Lewandowski أعاد:
    - `realDataAvailable=true`
    - `dataStatus=ready`
    - `goals=13`
    - `assists=2`
    - `rating=6.92`

## فحص المشروع

- `npm run build`: نجح.
- عدد Vercel/API functions: 10، أي أقل من حد 12.
- `npm run lint`: فشل محليًا بسبب ملفات Mondial غير متتبعة/خارج نطاق هذه المرحلة:
  - `components/renderers/Mondial2026Renderer.tsx`

هذا الفشل ليس ناتجًا عن ملفات الجسر المعدلة في هذه المرحلة، لكنه يجب تنظيفه في مرحلة منفصلة قبل اعتبار الـ workspace المحلي نظيفًا بالكامل.

## لماذا هذا الحل أفضل من SSH الآن؟

محاولة SSH إلى `82.25.96.194:65002` انتهت بمهلة اتصال. بدل تضييع وقت إضافي في الاتصال، تم اختيار حل هندسي أكثر ثباتًا:

- لا يحتاج فتح SSH.
- لا يحتاج كشف التوكن.
- يعمل مع إعادة نشر Hostinger من GitHub.
- يحافظ على قدرة الاستيراد اليدوي لاحقًا.
- لا يجعل seed بديلًا دائمًا عن البيانات الحية؛ هو فقط bootstrap عند الفراغ.

## المخاطر

الخطر منخفض لأن التعديل محصور في الجسر:

- لا endpoints جديدة.
- لا تغيير في API contract الأساسي.
- لا تغيير في UI.
- لا تغيير في Stream Deck.
- لا تغيير في قوالب Mercato.

الخطر الوحيد: إذا كان ملف البيانات التشغيلي فارغًا عمدًا، سيظهر seed المدمج. يمكن تعطيله عبر:

```env
REO_PLAYER_STATS_SEED_FILE=off
```

## التوصية التالية

بعد نشر هذا التحديث على Hostinger:

1. افتح:
   `https://peachpuff-herring-712997.hostingersite.com/api/player-stats?playerAName=Robert%20Lewandowski&playerAClub=Barcelona&selectedMetrics=goals,assists,rating`

2. يجب أن تظهر:
   - `bridgeConfigured=true`
   - `realDataAvailable=true`
   - `dataStatus=ready`

3. بعدها ننتقل إلى المرحلة الأقوى:
   - استيراد/تحديث لاعبين إضافيين من مصادر موثوقة.
   - ربط Player Intel V2 بسجل تاريخي حقيقي بدل seed أولي فقط.
   - إضافة أدوات إدارة آمنة للنسخ الاحتياطي والاستيراد بدون كشف أسرار.

