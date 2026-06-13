# تقرير عربي - Hotfix بيئة Hostinger لجسر إحصائيات اللاعبين

التاريخ: 2026-06-14  
المرحلة: Player Stats Bridge / Hostinger Runtime Env Hotfix  
النطاق: جسر إحصائيات اللاعبين المستقل فقط، بدون تعديل التطبيق الرئيسي أو القوالب.

## الملخص التنفيذي

بعد نشر جسر إحصائيات اللاعبين على Hostinger ظهر الخطأ:

```json
{"error":"REO_PLAYER_STATS_BRIDGE_TOKEN is not configured."}
```

الفحص عبر SSH أثبت أن الجسر نفسه يعمل ويستجيب، وأن الخطأ ليس من الكود الأساسي ولا من رابط الاستضافة، بل من بيئة التشغيل: متغيرات Hostinger كانت مخزنة في ملف إعداد داخلي داخل:

```text
public_html/.builds/config/.env
```

لكن `server.js` لم يكن يقرأ هذا الملف مباشرة، لذلك بقي `REO_PLAYER_STATS_BRIDGE_TOKEN` فارغًا داخل runtime.

## التشخيص

تم التأكد من الآتي:

- الجسر منشور على Hostinger كـ Node.js app مستقل.
- آخر commit منشور وقت الفحص كان `968feca`.
- `/api/status` كان يرد 503 بسبب عدم وجود التوكن داخل runtime.
- ملف إعداد Hostinger كان موجودًا ويحتوي على مفاتيح الجسر.
- كان هناك خطأ مطبعي في اسم متغير التوكن داخل إعدادات Hostinger:

```text
REO_PLAYER_STATS_BRIDGE_TOKE
```

بدل:

```text
REO_PLAYER_STATS_BRIDGE_TOKEN
```

- بعد تصحيح الاسم داخل ملف الإعداد، بقيت المشكلة لأن الجسر لا يقرأ ملف `.env` الداخلي تلقائيًا.

## التعديل المنفذ

تم تعديل:

```text
cloud/reo-player-stats-bridge/server.js
```

بإضافة loader صغير وبدون dependencies لقراءة ملفات `.env` قبل قراءة ثوابت التشغيل.

المسارات التي يدعمها الآن:

- `.env` داخل مجلد الجسر.
- `.env.local` داخل مجلد الجسر.
- `.env` داخل مجلد التشغيل.
- `.env.local` داخل مجلد التشغيل.
- ملف Hostinger الداخلي:

```text
public_html/.builds/config/.env
```

الـ loader لا يطبع الأسرار ولا يغيّر أي API contract.

## التوثيق

تم تحديث:

```text
cloud/reo-player-stats-bridge/README.md
```

لشرح أن الجسر يقرأ ملفات `.env` محليًا حتى يعمل على Hostinger سواء وصلت المتغيرات كـ process env أو كملف `.builds/config/.env`.

## الاختبارات

تم تشغيل:

```bash
node --check cloud/reo-player-stats-bridge/server.js
npm run verify
npm run lint
npm run build
```

النتيجة:

- فحص syntax للجسر: ناجح.
- verifier الخاص بالجسر: ناجح.
- lint الرئيسي: ناجح.
- build الرئيسي: ناجح.

ملاحظة: بقي تحذير حجم bundle الكبير في Vite كما هو سابقًا، وليس ناتجًا عن هذا التعديل.

## الخطر

الخطر منخفض جدًا لأن التعديل:

- محصور في الجسر المستقل.
- لا يغيّر endpoints.
- لا يغيّر صيغة البيانات.
- لا يلمس القوالب أو غرفة التحكم أو Stream Deck.
- لا يضيف dependencies.
- لا يطبع أو يخزن أسرارًا داخل Git.

## المطلوب بعد النشر

بعد وصول هذا commit إلى Hostinger وإعادة تشغيل تطبيق الجسر:

1. اختبار:

```text
https://lightslategray-toad-139780.hostingersite.com/health
```

2. اختبار `/api/status` مع التوكن.
3. ضبط التطبيق الرئيسي بهذه القيم:

```text
REO_PLAYER_STATS_BRIDGE_URL=https://lightslategray-toad-139780.hostingersite.com/api/player-stats
REO_PLAYER_STATS_BRIDGE_TOKEN=<same-token>
```

4. إعادة نشر التطبيق الرئيسي فقط.
5. اختبار Player Intel V2 والتأكد أن `bridgeConfigured=true`.

