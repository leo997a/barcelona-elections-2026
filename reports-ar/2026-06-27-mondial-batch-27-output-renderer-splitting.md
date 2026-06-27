# تقرير عربي - دفعة 27 - تسريع رابط العرض بتفكيك عارض القوالب

## الهدف

بعد إصلاح الظهور والإخفاء، بقيت نقطة أداء واضحة في رابط `/output`: العارض كان يحمل كل عائلات القوالب دفعة واحدة، حتى إذا كان الرابط يعرض قالب مونديال واحد فقط.

هذا يبطئ فتح رابط OBS ويزيد احتمال التأخير عند أول تحميل.

## التعديل

تم تعديل `components/OverlayRenderer.tsx` بحيث:

1. تبقى قوالب المونديال الأساسية محملة مباشرة:
   - `Mondial2026Renderer`
   - `MondialIraqRenderer`
2. يتم تحميل القوالب الأخرى عند الحاجة فقط عبر `React.lazy`.
3. تمت إضافة `React.Suspense fallback={null}` داخل طبقة المحتوى حتى لا يظهر أي نص تحميل أو وميض داخل OBS.
4. تم تحويل `RendererProps` إلى import type حتى لا يسحب ملف المكونات المشتركة كاستيراد فعلي من العارض الرئيسي.

بهذا لا يضطر رابط `/output` إلى تحميل قوالب مثل Mercado وPlayer Intel وScoreboard إذا لم تكن مستخدمة في نفس الرابط.

## لماذا أبقينا قوالب المونديال مباشرة؟

المشكلة الحالية التي يركز عليها المستخدم هي سرعة واستقرار قوالب المونديال داخل OBS. لذلك لم يتم تأجيل تحميل `Mondial2026Renderer` في هذه الدفعة، حتى يبقى أول ظهور لقوالب المونديال فوريا قدر الإمكان.

يمكن لاحقا فصل قوالب المونديال داخليا إلى chunks أصغر حسب نوع القالب نفسه، لكن ذلك يحتاج اختبارا بصريا أعمق حتى لا نؤثر على أول frame في البث.

## اختبار حماية جديد

تمت إضافة اختبار في:

- `tests/mondial-runtime-controls.test.mjs`

الاختبار يثبت أن:

- `ScoreboardRenderer` أصبح lazy.
- `MercatoUnifiedRenderer` أصبح lazy.
- `PlayerIntelV2Renderer` أصبح lazy.
- `React.Suspense fallback={null}` موجود.
- `Mondial2026Renderer` بقي import مباشر.

## التحقق المحلي

- `node --test tests\mondial-runtime-controls.test.mjs`: نجح `12/12`.
- `node_modules\.bin\tsc.cmd --noEmit`: نجح.
- `node_modules\.bin\tsc.cmd -p tsconfig.server.json`: نجح.
- `node_modules\.bin\vite.cmd build`: نجح.
- `git diff --check`: نجح.

## نتيجة الحجم

قبل هذه الدفعة:

- JavaScript الرئيسي: `dist/assets/index-B6tpzRX9.js`.
- الحجم: `1701.87 kB`.
- gzip: `410.21 kB`.

بعد هذه الدفعة:

- JavaScript الرئيسي: `dist/assets/index-CNg0muHb.js`.
- الحجم: `1172.37 kB`.
- gzip: `283.74 kB`.

التحسن:

- انخفاض تقريبي في الحجم الخام: `529.50 kB`.
- انخفاض تقريبي في gzip: `126.47 kB`.

## النتيجة

رابط `/output` أصبح أخف بكثير عند البداية، مع الحفاظ على قوالب المونديال مباشرة وسريعة. هذا يقلل وقت فتح الرابط في OBS ويخفف الحمل العام بدون تغيير منطق الظهور أو الإخفاء الذي تم إصلاحه في الدفعات السابقة.

## النشر

تم دفع هذه الدفعة إلى GitHub في commit:

- `2785123 fix: lazy load inactive overlay renderers`

ثم التقط Hostinger النشر وأصبح يخدم الحزمة الجديدة:

- `assets/index-CNg0muHb.js`

## تحقق Hostinger

تم فحص الصفحة العامة مباشرة من:

`https://peachpuff-herring-712997.hostingersite.com/`

النتيجة:

- أصل الواجهة المنشور: `assets/index-CNg0muHb.js`.
- الحزمة المنشورة تحتوي lazy chunks للقوالب غير النشطة مثل `ScoreboardRenderer` و`MercatoUnifiedRenderer`.
- الحزمة المنشورة ما زالت تحتوي عارض المونديال المباشر حتى يبقى رابط OBS سريع الظهور.

هذا يعني أن الدفعة ليست محلية فقط، بل وصلت فعليا إلى النسخة الحية على Hostinger.
