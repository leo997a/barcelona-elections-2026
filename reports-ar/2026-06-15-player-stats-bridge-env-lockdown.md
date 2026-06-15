# تقرير Phase 0: تثبيت Player Stats Bridge Environment وإزالة الرابط الافتراضي

التاريخ: 2026-06-15  
المرحلة: REO ACCESS & MEMBERSHIP FOUNDATION - Phase 0  
النطاق: `/api/player-stats` فقط.  
الحالة: تم تنفيذ تعديل صغير بعد تحقق حي من Runtime.

## 1. الملخص التنفيذي

تم التحقق من أن تطبيق REO الرئيسي على Hostinger أصبح يستخدم متغير البيئة:

`REO_PLAYER_STATS_BRIDGE_URL`

بدل الاعتماد على الرابط الافتراضي الثابت داخل الكود. بعد هذا التحقق، تمت إزالة الرابط الافتراضي الثابت من `api/player-stats.ts` حتى لا يبقى التطبيق مرتبطًا بعنوان Hostinger ثابت داخل المصدر.

هذا يجعل الاتصال بالجسر قرار Runtime واضحًا:

- إذا كان `REO_PLAYER_STATS_BRIDGE_URL` موجودًا: يحاول التطبيق الاتصال بالجسر.
- إذا لم يكن موجودًا: لا يستخدم رابطًا صامتًا مخفيًا في الكود.
- التشخيص يبقى ظاهرًا وآمنًا دون كشف الرابط الكامل أو التوكن.

## 2. سبب المرحلة

في المرحلة السابقة كان التطبيق يعمل لأن الكود يحتوي رابطًا افتراضيًا ثابتًا:

`https://lightslategray-toad-139780.hostingersite.com/api/player-stats`

هذا كان حلًا انتقاليًا مفيدًا لإعادة الخدمة، لكنه ليس الوضع المعماري النهائي. بعد إضافة المتغير إلى Hostinger، يجب أن يعتمد التطبيق على البيئة لا على ثابت داخل الكود.

## 3. التحقق الحي قبل التعديل

تم اختبار endpoint الحي مع cache-buster على:

`https://peachpuff-herring-712997.hostingersite.com/api/player-stats`

النتيجة الآمنة للاعبين الأساسيين:

| اللاعب | bridgeUrlEnvConfigured | bridgeUrlDefaultUsed | responseMode | upstreamStatus | auth.valid | realDataAvailable |
|---|---:|---:|---|---:|---:|---:|
| Robert Lewandowski | true | false | bridge | 200 | true | true |
| Lamine Yamal | true | false | bridge | 200 | true | true |
| Cole Palmer | true | false | bridge | 200 | true | true |

ظهرت محاولة واحدة عابرة لـ Cole Palmer أعادت `503/fallback`، ثم أعيد الاختبار مباشرة وعاد:

- `upstreamStatus=200`
- `responseMode=bridge`
- `auth.valid=true`
- `realDataAvailable=true`

لذلك اعتبرت المشكلة تعثرًا لحظيًا في upstream لا فشل إعدادات Runtime.

## 4. التحقق من الجسر نفسه

تم اختبار:

`https://lightslategray-toad-139780.hostingersite.com/health`

النتيجة:

- `ok=true`
- `service=reo-player-stats-bridge`
- `authConfigured=true`

لم تتم طباعة أي توكن أو جزء من توكن.

## 5. التعديل التقني

تم تعديل:

- `api/player-stats.ts`

التغيير:

- إزالة `DEFAULT_PLAYER_STATS_BRIDGE_URL`.
- جعل `playerStatsBridgeUrl()` يقرأ فقط من `process.env.REO_PLAYER_STATS_BRIDGE_URL`.
- إبقاء التشخيص:
  - `bridgeUrlConfigured`
  - `bridgeUrlEnvConfigured`
  - `bridgeUrlDefaultUsed`
  - `bridgeTokenConfigured`
  - `upstreamAttempted`
  - `upstreamStatus`
  - `responseMode`

بعد التعديل، إذا لم يكن env موجودًا فلن يستعمل التطبيق رابطًا ثابتًا في الكود.

## 6. ما لم يتم لمسه

لم يتم تعديل:

- Player Intel UI.
- OBS.
- Output.
- Control.
- Stream Deck.
- القوالب.
- الصوت.
- نظام العضويات.
- Firebase.
- secrets أو `.env`.

## 7. نتائج الفحص المحلي

تم تشغيل:

- `npm run lint`
- `npm run build`

النتيجة:

- lint: ناجح.
- build: ناجح.
- ظهر تحذير حجم bundle أكبر من 500 kB، وهو تحذير معروف وليس فشلًا.

عدد ملفات API الفعلية بقي:

- `10`

ولم يتم إضافة endpoint جديد.

## 8. طريقة Rollback

إذا حدث فشل بعد النشر:

1. تأكد أولًا من وجود `REO_PLAYER_STATS_BRIDGE_URL` في Hostinger للتطبيق الرئيسي.
2. تأكد من وجود `REO_PLAYER_STATS_BRIDGE_TOKEN`.
3. إذا كانت المتغيرات سليمة وبقي الفشل، اعكس commit هذه المرحلة فقط.
4. لا تحتاج إلى تغيير OBS أو Stream Deck أو روابط Output.

## 9. الخلاصة

Phase 0 نجحت في نقل الاعتماد من رابط ثابت داخل الكود إلى متغير بيئة فعلي. هذه خطوة صغيرة لكنها ضرورية قبل بناء REO Access & Membership Center، لأنها تمنع وجود إعدادات تشغيل مخفية داخل المصدر.

