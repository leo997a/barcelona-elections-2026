# تقرير مرحلة: Player Stats Bridge Standalone Architecture

التاريخ: 2026-06-13  
المرحلة: PLAYER-STATS-BRIDGE-OPTION-3  
الحالة: مكتملة محليًا ومتحقق منها، جاهزة للنشر كخدمة مستقلة

---

## 1. الملخص التنفيذي

تم تنفيذ الخيار الثالث باعتباره المعمارية الصحيحة والنهائية لإحصائيات اللاعبين:

> جسر مستقل لإحصائيات اللاعبين، منفصل عن تطبيق REO Live الرئيسي، ومنفصل عن جسر المباريات الحالي.

الهدف من هذه المرحلة لم يكن تغيير واجهة الاستوديو أو كسر روابط Hostinger التي أصبحت تعمل، بل إضافة طبقة خلفية مستقلة يستطيع تطبيق REO Live الاتصال بها لاحقًا عبر:

```text
REO_PLAYER_STATS_BRIDGE_URL
REO_PLAYER_STATS_BRIDGE_TOKEN
```

النتيجة:

- تطبيق Hostinger الحالي لم يتم كسره.
- OBS وOutput/Control وStream Deck لا يحتاجون أي تغيير الآن.
- لم تتم إضافة API function جديدة داخل `api/`.
- عدد functions بقي 10، أي أقل من حد 12.
- الجسر الجديد يفرض التوكن.
- الجسر لا يخترع بيانات وهمية.
- أي لاعب أو metric غير موجودة تعود `pending` بوضوح.
- عند استيراد بيانات موثوقة، يرجع `realDataAvailable=true`.

---

## 2. التشخيص قبل التنفيذ

كان تطبيق REO Live يدعم أصلًا متغيرين مخصصين لإحصائيات Player Intel:

```text
REO_PLAYER_STATS_BRIDGE_URL
REO_PLAYER_STATS_BRIDGE_TOKEN
```

لكن عند فحص الجسر الموجود حاليًا، اتضح أنه جسر مباريات وليس جسر إحصائيات لاعبين:

```text
/health      يعمل
/api/status  يعمل
/api/player-stats  غير موجود
```

لذلك كانت نتيجة التطبيق:

```text
bridgeConfigured=false
```

هذا لا يعني أن Hostinger فشل. بل يعني أن موقع REO Live يعمل، لكن Player Intel لا يمتلك مصدر بيانات لاعبين حقيقيًا حتى الآن.

---

## 3. قرار المعمارية

تم اعتماد فصل المسؤوليات:

| الجزء | المسؤولية |
|---|---|
| REO Live Hostinger App | الاستوديو، المكتبة، القوالب، Output، Control، Stream Deck، الترخيص |
| reo-match-bridge | بيانات المباريات الحية الحالية |
| reo-player-stats-bridge | إحصائيات اللاعبين الموسمية/المتقدمة |

هذا يمنع خلط جسر المباريات بجسر اللاعبين، ويجعل كل خدمة قابلة للنشر والصيانة والاختبار بشكل مستقل.

---

## 4. ما تم إنشاؤه

تم إنشاء خدمة مستقلة داخل:

```text
cloud/reo-player-stats-bridge/
```

الملفات:

```text
cloud/reo-player-stats-bridge/.gitignore
cloud/reo-player-stats-bridge/package.json
cloud/reo-player-stats-bridge/server.js
cloud/reo-player-stats-bridge/README.md
cloud/reo-player-stats-bridge/data/.gitkeep
cloud/reo-player-stats-bridge/scripts/verify-contract.mjs
```

الخدمة مبنية بـ Node.js فقط، بدون dependencies إضافية، حتى تكون خفيفة وسهلة النشر على Hostinger Node.js أو VPS.

---

## 5. نقاط النهاية

عام:

```text
GET /health
```

محمي بالتوكن:

```text
GET  /api/status
GET  /api/metrics-catalog
GET  /api/player-stats
POST /api/player-stats
POST /api/control/upsert-player
POST /api/control/import-json
```

طرق المصادقة:

```text
Authorization: Bearer <token>
```

أو:

```text
X-REO-Bridge-Token: <token>
```

---

## 6. سياسة البيانات

تم تثبيت قاعدة مهمة:

> الجسر لا يصنع إحصائيات وهمية.

إذا طلب Player Intel لاعبًا غير موجود في مخزن البيانات:

- يرجع اللاعب بحالة `missing`.
- يرجع metric المطلوبة بقيمة `pending`.
- يضيف warning واضح.

إذا كان اللاعب موجودًا لكن metric معينة ناقصة:

- لا يتم اختراعها.
- ترجع `pending`.

إذا وُجدت بيانات مستوردة وموثوقة:

- يرجع `realDataAvailable=true`.
- ترجع القيم كما تم إدخالها.

---

## 7. التخزين

التخزين الحالي:

```text
JSON file store
```

المسار الافتراضي:

```text
cloud/reo-player-stats-bridge/data/player-stats.json
```

في الإنتاج يجب استخدام مسار دائم خارج Git:

```text
REO_PLAYER_STATS_DATA_FILE=/var/lib/reo-player-stats-bridge/player-stats.json
```

الكتابة تتم بأسلوب آمن:

- كتابة ملف مؤقت.
- ثم rename.
- هذا يقلل خطر تلف JSON أثناء التحديث.

---

## 8. متغيرات البيئة المطلوبة للجسر

على خدمة الجسر نفسها:

```text
PORT=3015
REO_PLAYER_STATS_BRIDGE_TOKEN=<secret>
REO_PLAYER_STATS_DATA_FILE=<persistent-json-path>
REO_PLAYER_STATS_ALLOWED_ORIGINS=https://peachpuff-herring-712997.hostingersite.com
```

على تطبيق REO Live الرئيسي في Hostinger:

```text
REO_PLAYER_STATS_BRIDGE_URL=https://<bridge-host>/api/player-stats
REO_PLAYER_STATS_BRIDGE_TOKEN=<same-secret>
```

مهم:

- لا يتم وضع التوكن داخل Git.
- لا يتم إرسال التوكن داخل التقارير.
- لا يتم استخدام روابط Vercel القديمة داخل OBS أو Stream Deck.

---

## 9. التحقق المحلي

تم تشغيل:

```text
npm run verify
```

داخل:

```text
cloud/reo-player-stats-bridge/
```

النتيجة:

```text
ok: true
bridgeConfigured: true
realDataAvailable: true
player: Robert Lewandowski
goals: 19
missingMetric: pending
```

ماذا تحقق الاختبار؟

- `/health` يعمل بدون توكن.
- `/api/status` يرفض الطلب بدون توكن.
- upsert للاعب واحد يعمل.
- `/api/player-stats` يرجع عقدًا متوافقًا مع التطبيق الرئيسي.
- القيم المستوردة ترجع كما هي.
- metric الناقصة لا تتحول إلى fake data.

---

## 10. تحقق التطبيق الرئيسي

تم تشغيل من جذر المشروع:

```text
npm run lint
npm run build
```

النتيجة:

- lint: ناجح.
- build: ناجح.
- يوجد تحذير حجم chunk الكبير، وهو تحذير سابق وليس فشلًا.

عدد functions بعد المرحلة:

```text
10
```

الحد المطلوب:

```text
<= 12
```

إذن لم يتم كسر حد Vercel/Hostinger API.

---

## 11. ما لم يتم لمسه

لم يتم تعديل:

- `api/player-stats.ts`
- `api/live.ts`
- `api/stream.ts`
- `services/audioEngine.ts`
- `components/renderers`
- القوالب
- Player Intel UI
- Stream Deck plugin
- License gate
- ملفات الصوت
- أسرار أو tokens داخل Git

العمل كان إضافة خدمة مستقلة جديدة فقط.

---

## 12. خطوات النشر التالية

1. إنشاء Node.js app ثانية على Hostinger أو VPS للجسر.
2. نشر مجلد:

```text
cloud/reo-player-stats-bridge/
```

3. ضبط متغيرات الجسر:

```text
REO_PLAYER_STATS_BRIDGE_TOKEN
REO_PLAYER_STATS_DATA_FILE
REO_PLAYER_STATS_ALLOWED_ORIGINS
```

4. اختبار:

```text
GET /health
GET /api/status
POST /api/control/upsert-player
POST /api/player-stats
```

5. بعد نجاح الجسر، ضبط تطبيق REO Live الرئيسي:

```text
REO_PLAYER_STATS_BRIDGE_URL
REO_PLAYER_STATS_BRIDGE_TOKEN
```

6. إعادة نشر تطبيق REO Live الرئيسي.
7. فحص:

```text
/api/player-stats
Player Intel V2
Library
Operator
Output
Control
Stream Deck
OBS
```

---

## 13. المخاطر المتبقية

| الخطر | الحالة | المعالجة |
|---|---|---|
| لا توجد بيانات لاعبين حقيقية بعد | متوقع | استيراد JSON موثوق أو بناء جامع بيانات لاحقًا |
| الجسر يحتاج hosting مستقل | متوقع | نشر كـ Node.js app ثانية |
| JSON file store ليس قاعدة بيانات كبيرة | مقبول الآن | يمكن ترقيته لاحقًا إلى SQLite/Redis |
| صور/مصادر اللاعبين ليست جزءًا من الجسر | مقصود | الجسر يركز على stats فقط |
| Player Intel UI قد يحتاج تحسين قراءة warnings | مؤجل | مرحلة منفصلة بعد الربط |

---

## 14. التوصية

لا نربط المتغيرات داخل تطبيق REO Live الرئيسي إلا بعد نشر الجسر المستقل واختباره.

الأولوية القادمة:

1. نشر `reo-player-stats-bridge` كخدمة مستقلة.
2. توليد token جديد خاص بالجسر.
3. إدخال أول batch بيانات حقيقي.
4. ربط تطبيق REO Live عبر `REO_PLAYER_STATS_BRIDGE_URL`.
5. اختبار Player Intel V2 على Hostinger.

هذه هي الطريقة الأقل خطرًا لأنها لا تمس الأداة التي تعمل الآن، وتضيف مصدر بيانات حقيقي تدريجيًا.

