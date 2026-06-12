# تقرير مرحلة Hostinger Live Bus وإصلاح استهلاك Origin Transfer

**التاريخ:** 2026-06-13
**الحالة:** جاهزة للمراجعة والنشر إلى Hostinger بعد نقل متغيرات البيئة يدويًا
**الهدف:** إيقاف نمط الاستهلاك المزدوج، تجهيز خادم Node دائم، وإطلاق روابط تحكم وإخراج نظيفة دون كسر Stream Deck أو Live API الحالي.

## الملخص التنفيذي

أكدت صور Vercel أن مشروع `barcelona-elections-2026` وحده استهلك:

- `34.16 GB` من Fast Origin Transfer، أي `100%` من الاستهلاك الظاهر.
- `26.49 GB` من Fast Data Transfer، أي `100%` من الاستهلاك الظاهر.
- `4h 29m` من Fluid Active CPU مقابل حد `4h`.

كشف تدقيق الكود ثلاثة أسباب مباشرة وقابلة للإصلاح:

1. نافذة العرض كانت تشغّل SSE وpolling معًا حتى عند نجاح SSE.
2. كل اتصال SSE كان يقرأ Runtime Cache كل `220ms`، أي قرابة `250` قراءة خلال اتصال مدته 55 ثانية.
3. غرفة التحكم كانت تعيد نشر الحالة الكاملة كل 30 ثانية حتى دون تغيير حقيقي.

تم إصلاح هذه الأسباب، وتجهيز المشروع للعمل كتطبيق Node دائم على Hostinger مع الحفاظ على مسارات Vercel الحالية وعدد Functions الحالي.

## ما تم تنفيذه

### 1. إصلاح fallback الحقيقي

- يبدأ الاتصال الآن عبر SSE فقط.
- عند نجاح SSE يتوقف polling.
- لا يبدأ `/api/live` polling إلا عند فشل SSE أو انقطاعه.
- أبقينا `/api/live` لأن Stream Deck وغرفة التحكم يعتمدان عليه فعليًا.

### 2. بث فوري مناسب لـHostinger

- أضيف اشتراك داخلي event-driven داخل `liveStore`.
- عند تشغيل المشروع على Hostinger، يصل التحديث إلى SSE فور الكتابة داخل عملية Node نفسها.
- تم إلغاء القراءة كل `220ms`.
- Hostinger يجري فحصًا احتياطيًا كل 12 ثانية فقط، مع heartbeat.
- Vercel يستخدم فحصًا كل ثانية للتوافق بين نسخ Functions بدل `220ms`.
- اتصال Hostinger يمكن أن يبقى مفتوحًا حتى 6 ساعات بدل إعادة الفتح كل 55 ثانية.

### 3. إزالة النشر الدوري غير الضروري

- أزيل `setInterval` الذي كان يعيد نشر جميع القوالب كل 30 ثانية.
- بقي النشر الأولي عند فتح غرفة التحكم.
- بقي النشر الفوري عند تغيير حالة أو حقل فعلي.

### 4. روابط نظيفة مثل نموذج UNO

أصبح المشروع يولد ويفهم الروابط التالية:

```text
/output/<overlay-id>
/control/<overlay-id>
```

أمثلة بعد نشر Hostinger:

```text
https://peachpuff-herring-712997.hostingersite.com/output/<overlay-id>
https://peachpuff-herring-712997.hostingersite.com/control/<overlay-id>
```

- رابط Output يدخل مباشرة إلى العرض دون بوابة الترخيص.
- رابط Control يدخل إلى غرفة التحكم المحمية ويركز القالب المحدد.
- أضيف زر مستقل لنسخ رابط التحكم النظيف داخل بطاقة كل قالب في المكتبة.
- الروابط القديمة `#/output/...` ما زالت مدعومة لحماية التوافق.

> ملاحظة أمنية صريحة: الجزء الحالي بعد `/control/` و`/output/` هو معرّف القالب المستقر، وليس بعدُ توكن صلاحيات منفصلًا مثل UNO. إنشاء `controlToken` و`outputToken` مختلفين يحتاج مخزن جلسات دائمًا وقواعد صلاحيات، ويجب تنفيذه مع Firebase Custom Tokens أو قاعدة بيانات آمنة في مرحلة مستقلة.

### 5. الاحتفاظ بآخر حالة داخل OBS

- تحفظ نافذة Output آخر حالة سليمة محليًا بحد أقصى 1MB.
- بعد انقطاع الشبكة أو إعادة تشغيل خادم Hostinger لا تصبح الشاشة فارغة.
- إذا تعذر التخزين المحلي، تبقى آخر حالة داخل الذاكرة ما دامت النافذة مفتوحة.

### 6. خادم Node خاص بـHostinger

أضيف خادم Node واحد يقوم بـ:

- تقديم ملفات Vite من `dist`.
- إعادة `index.html` لمسارات SPA النظيفة، ومنها `/output/*` و`/control/*`.
- تشغيل نفس معالجات API العشرة الحالية دون إضافة endpoint جديد.
- تقديم assets بكاش طويل، و`index.html` بدون كاش لمنع نسخ واجهة قديمة.
- تشغيل `/api/stream` كاتصال طويل مناسب لخادم دائم.

إعدادات Hostinger المقترحة بعد دفع هذه المرحلة:

```text
Framework: Node.js / Other
Root directory: ./
Node.js: 22.x
Build command: npm run build
Start command: npm start
```

لا يجب اختيار نشر Vite ثابت فقط، لأن ذلك سيعطل الـAPI والمزامنة.

## نتائج الاختبار الفعلية

### فحوص المصدر والبناء

- `npm run lint`: ناجح.
- `npm run build`: ناجح.
- بناء Vite: ناجح.
- بناء خادم Node عبر `tsc -p tsconfig.server.json`: ناجح.
- عدد Vercel Functions: `10`، ولم يرتفع.
- يوجد تحذير bundle قديم/مستمر: ملف JavaScript الرئيسي قرابة `2.02 MB` قبل gzip و`505 KB` بعد gzip.

### اختبارات خادم Node المحلية

| الاختبار | النتيجة |
|---|---|
| `/` | `200` |
| `/output/demo-overlay?obs=1` | `200` |
| `/control/demo-overlay` | `200` |
| `POST /api/live` | ناجح |
| `GET /api/live` بعد النشر | أعاد الحالة والإصدار الصحيحين |
| استقبال SSE بعد POST | ناجح وفوري |

### اختبار متصفح فعلي

- فُتح `/output/demo-overlay?obs=1` في المتصفح الفعلي.
- لم تظهر بوابة الترخيص في Output.
- لم تظهر أخطاء Console.
- فُتح `/control/demo-overlay` وظهرت بوابة التحكم/الترخيص كما هو متوقع.
- بعد إعادة تشغيل خادم Node بدون إعادة نشر الحالة، بقي Output على آخر حالة محفوظة ولم يظهر `Connecting to RGE Cloud`.

لم يتم إجراء اختبار صوتي أو اختبار داخل OBS الفعلي في هذه المرحلة.

## ما لم يتم تنفيذه عمدًا

- لم يتم تفعيل Firebase المدمج القديم؛ تفعيله مباشرة دون Rules آمنة خطر.
- لم يتم حذف `/api/live` أو `/api/stream` لأن Stream Deck يعتمد عليهما.
- لم يتم إنشاء endpoint جديد.
- لم يتم لمس secrets أو `.env`.
- لم يتم الضغط على Deploy داخل Hostinger.
- لم يتم نقل متغيرات البيئة.
- لم يتم إنشاء توكنات Control/Output منفصلة زائفة.

## الخطر المتبقي

حالة Live على Hostinger حاليًا process-local. هذا مناسب لتطبيق Node واحد، لكنه لا يضمن مشاركة الحالة إذا شغّلت Hostinger أكثر من process أو أعادت تشغيل التطبيق. Output يحتفظ بآخر حالة محليًا، لكن الكتابات الجديدة تحتاج عودة الخادم.

الحل النهائي متعدد الأجهزة هو المرحلة التالية:

1. إنشاء سجل جلسات دائم يحتوي `showId` وhash لـ`controlToken` و`outputToken`.
2. إصدار Firebase Custom Token بصلاحية `control` أو `output`.
3. كتابة Firebase Security Rules تمنع Output من الكتابة.
4. نقل الحالة الصغيرة فقط إلى RTDB دون صور Base64 أو فيديو.
5. إبقاء `/api/live` كجسر توافق مؤقت لـStream Deck حتى تحديث الإضافة.

## المصادر الرسمية المستخدمة في القرار

- [Firebase Realtime Database: القراءة والكتابة والاستماع للتغييرات](https://firebase.google.com/docs/database/web/read-and-write)
- [Firebase Realtime Database: العمل دون اتصال وPresence](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Firebase: إنشاء Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Hostinger: نشر تطبيق Node.js](https://www.hostinger.com/support/1583667-how-to-deploy-a-node-js-website-in-hostinger/)

## التوصية

الخطوة العملية التالية هي دفع هذه المرحلة، ثم إعادة ضبط إعداد Hostinger ليعمل كتطبيق Node باستخدام `npm run build` و`npm start`، ونقل متغيرات البيئة يدويًا دون عرضها أو تخزينها في Git. بعد نجاح الرابط المؤقت واختبار OBS، تبدأ مرحلة التوكنات المنفصلة وFirebase الآمن.
