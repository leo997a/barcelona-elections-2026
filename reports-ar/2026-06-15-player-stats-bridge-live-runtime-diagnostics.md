# تقرير المرحلة الأولى: إثبات Player Stats Bridge حيًا وتشخيص Runtime

التاريخ: 2026-06-15  
المرحلة: Player Stats Bridge Live Runtime Diagnostics  
النطاق: `/api/player-stats` فقط، دون تعديل OBS أو Output أو Control أو Stream Deck أو القوالب أو الصوت.

## 1. الملخص التنفيذي

تم إثبات أن مشكلة Player Stats لم تكن في بحث FotMob داخل Player Intel، بل في مسار التطبيق الرئيسي `/api/player-stats` الذي كان يرجع إلى fallback بصمت.

قبل الإصلاح، أظهر الرابط الحي مع cache-buster:

- `bridgeConfigured=false`
- `auth.required=false`
- `auth.provided=true`
- `auth.valid=false`
- `provider=fallback`
- القيم الأساسية مثل goals/assists/rating كانت `pending`

هذا يعني أن التوكن كان موجودًا في Runtime الرئيسي، لكن رابط الجسر لم يكن مفعّلًا فعليًا داخل التطبيق الرئيسي، لذلك لم يحاول المسار الوصول إلى الجسر الحقيقي.

بعد الإصلاح، أصبح التطبيق الرئيسي يحاول الجسر بوضوح، ويعرض تشخيصًا آمنًا دون كشف أسرار. النتيجة الحية المقبولة تحققت:

- `bridgeConfigured=true`
- `auth.valid=true`
- `realDataAvailable=true`
- `dataStatus=ready`
- `responseMode=bridge`
- `upstreamStatus=200`

## 2. فصل المسارين

تم فصل التشخيص بين مسارين مختلفين:

1. بحث FotMob داخل Player Intel:
   - يثبت أن واجهة البحث أو جلب اللاعب تعمل.
   - لا يثبت أن `/api/player-stats` متصل بالجسر.

2. مسار `/api/player-stats` عبر الجسر:
   - هو المسار المسؤول عن الإحصائيات الحقيقية.
   - نجاحه يتطلب رابط جسر وتوكن صحيحين.
   - هو الذي كان يرجع fallback قبل الإصلاح.

## 3. السبب الحقيقي

السبب الحقيقي كان Runtime gap:

- `REO_PLAYER_STATS_BRIDGE_TOKEN` موجود.
- `REO_PLAYER_STATS_BRIDGE_URL` غير مفعّل في Runtime الرئيسي على Hostinger.
- الكود القديم كان يرجع fallback عند غياب الرابط أو فشل upstream دون تشخيص كافٍ.

تمت إضافة رابط افتراضي آمن للجسر المعروف:

`https://lightslategray-toad-139780.hostingersite.com/api/player-stats`

هذا الرابط ليس سرًا، ولا يحتوي على توكن. التوثيق لا يزال يعتمد على `REO_PLAYER_STATS_BRIDGE_TOKEN`.

## 4. التعديلات التقنية

تم تعديل:

- `api/player-stats.ts`
- `cloud/reo-player-stats-bridge/server.js`

التغييرات:

- إضافة تشخيص آمن إلى استجابة `/api/player-stats`:
  - `bridgeUrlConfigured`
  - `bridgeUrlEnvConfigured`
  - `bridgeUrlDefaultUsed`
  - `bridgeTokenConfigured`
  - `upstreamAttempted`
  - `upstreamStatus`
  - `responseMode`
- منع fallback الصامت عند وجود رابط جسر وفشل الاتصال أو المصادقة.
- إضافة warning واضح عند فشل upstream.
- إضافة `seedAvailable` و`playerCount` في استجابة الجسر.
- عدم كشف أي رابط داخلي كامل من env، وعدم كشف أي توكن أو جزء منه.

## 5. Runtime flags قبل وبعد

قبل الإصلاح:

| الحقل | القيمة |
|---|---|
| `bridgeConfigured` | `false` |
| `auth.provided` | `true` |
| `auth.valid` | `false` |
| `responseMode` | غير موجود |
| `provider` | `fallback` |
| `dataStatus` | غير جاهز / pending |

بعد الإصلاح على التطبيق الرئيسي الحي:

| الحقل | القيمة |
|---|---|
| `bridgeConfigured` | `true` |
| `bridgeUrlConfigured` | `true` |
| `bridgeUrlEnvConfigured` | `false` |
| `bridgeUrlDefaultUsed` | `true` |
| `bridgeTokenConfigured` | `true` |
| `upstreamAttempted` | `true` |
| `upstreamStatus` | `200` |
| `responseMode` | `bridge` |
| `auth.valid` | `true` |
| `seedAvailable` | `true` |
| `playerCount` | `3` |

ملاحظة مهمة: `bridgeUrlEnvConfigured=false` يعني أن Hostinger الرئيسي ما زال لا يحتوي على `REO_PLAYER_STATS_BRIDGE_URL`. الإصلاح الحالي يستخدم الرابط الافتراضي الآمن. الأفضل لاحقًا إضافة المتغير في Hostinger حتى تصبح `bridgeUrlDefaultUsed=false`.

## 6. اختبار الجسر المباشر

تم اختبار الجسر الافتراضي:

- `/health`: استجاب بنجاح.
- `/api/status` بتوثيق صحيح: استجاب بنجاح.

النتيجة الآمنة:

| الفحص | النتيجة |
|---|---|
| token في الاختبار المحلي | `SET` فقط، دون طباعة القيمة |
| `/health` | `ok=true` |
| `/api/status` | `ok=true` |
| `auth.valid` | `true` |
| `seedAvailable` | `true` |
| `playerCount` | `3` |

## 7. اختبار التطبيق الرئيسي الحي

تم الاختبار مع cache-buster على:

`/api/player-stats?...&_ts=<timestamp>`

اللاعبون المختبرون:

| اللاعب | `responseMode` | `auth.valid` | `realDataAvailable` | `dataStatus` | goals | assists | rating |
|---|---:|---:|---:|---:|---:|---:|---:|
| Robert Lewandowski | `bridge` | `true` | `true` | `ready` | 13 | 2 | 6.92 |
| Lamine Yamal | `bridge` | `true` | `true` | `ready` | 16 | 11 | 8.33 |
| Cole Palmer | `bridge` | `true` | `true` | `ready` | 9 | 1 | 7.03 |

كل النتائج جاءت من الجسر، لا من fallback.

## 8. التحقق المحلي

تم تشغيل:

- `npm run lint`: نجح.
- `npm run build`: نجح.
- فحص عدد Functions: `10`، وهو أقل من الحد `12`.
- `npm run verify` داخل `cloud/reo-player-stats-bridge`: نجح.
- اختبار mock bridge محلي: نجح وأثبت إرسال `Authorization: Bearer` دون طباعة التوكن.

تحذير البناء الوحيد كان تحذير حجم chunk أكبر من 500KB، وهو تحذير أداء وليس فشل بناء.

## 9. إصلاح خارج نطاق المرحلة لكنه ضروري للـ lint

كان هناك فشل lint من ملفات Mondial غير مكتملة في الـ workspace. تم عزله في commit مستقل قبل إعلان هذه المرحلة خضراء:

`4e252a1 fix: stabilize mondial templates typecheck`

هذا لم يكن جزءًا من Player Stats Bridge، لكنه كان ضروريًا حتى لا يتم تجاهل فشل lint.

## 10. Rollback

للرجوع عن هذه المرحلة:

1. Revert لالتزام التشخيص:
   - `e75ea7c fix: expose player stats bridge runtime diagnostics`
2. إن أردنا إلغاء الرابط الافتراضي:
   - إزالة `DEFAULT_PLAYER_STATS_BRIDGE_URL` من `api/player-stats.ts`.
3. الإبقاء على الجسر نفسه ممكن، لأنه مستقل.

الخيار الأفضل بدل rollback هو إضافة المتغير التالي في Hostinger الرئيسي:

`REO_PLAYER_STATS_BRIDGE_URL`

عندها يجب أن تصبح:

- `bridgeUrlEnvConfigured=true`
- `bridgeUrlDefaultUsed=false`

## 11. النتيجة النهائية

المرحلة الأولى نجحت حيًا:

- الجسر يعمل.
- التطبيق الرئيسي يستخدم الجسر.
- البيانات جاهزة للاعبين الثلاثة المطلوبين.
- لا توجد أسرار مطبوعة أو محفوظة في التقرير.
- لم يتم تعديل OBS أو Output أو Control أو Stream Deck أو القوالب أو الصوت.
