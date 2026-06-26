# تقرير دفعة 22 - تثبيت سرعة رابط العرض واتجاه انتقال المونديال

## سبب المشكلة

كان رابط العرض العام يعتمد على SSE ثم يوقف الـ polling بمجرد فتح اتصال SSE. إذا فتح الاتصال لكنه لم يرسل حدثا فوريا، يبقى رابط OBS أو الرابط العام بطيئا في التقاط أمر الإظهار/الإخفاء. الإعداد السابق كان يفحص كل 2500ms في OBS و3000ms في المتصفح العادي.

وجدت أيضا أن انتقال stinger في الخروج كان يعكس الأقواس فعليا:

- القوس العلوي في الخروج كان يستخدم حركة القوس السفلي مع `reverse`.
- القوس السفلي في الخروج كان يستخدم حركة القوس العلوي مع `reverse`.

هذا هو سبب الإحساس بأن الخروج أو الدخول أصبح بالمقلوب.

## ما تم إصلاحه

1. جعل رابط العرض يستخدم polling سريع موازي لـ SSE بدلا من إيقافه عند `onopen`.
2. تقليل polling إلى:
   - OBS: كل `400ms`.
   - المتصفح العادي: كل `800ms`.
3. إضافة fallback عام للرابط: إذا ضاعت حالة `/api/live` بعد إعادة تشغيل أو نشر، يحاول الرابط بناء نسخة عرض من `templateId` الموجود داخل الرابط بدلا من الوقوف على شاشة `Connecting`.
4. تقليل مدى سرعة انتقال قوالب المونديال:
   - الافتراضي: `520ms`.
   - الحد الأدنى: `240ms`.
   - الحد الأعلى: `780ms`.
5. تقليل انتظار الخروج حتى لا يبقى القالب معلقا بعد الضغط على إخفاء.
6. تصحيح اتجاه stinger:
   - الخروج يستخدم نفس اتجاه حركة القوس العلوي/السفلي، بدون swap وبدون `reverse`.

## الملفات المعدلة

- `App.tsx`
- `components/OverlayRenderer.tsx`
- `components/renderers/MondialTemplates.ts`
- `components/renderers/mondial/MondialTransitionLayer.tsx`
- `tests/mondial-runtime-controls.test.mjs`

## التحقق المحلي

- `node --test tests/mondial-runtime-controls.test.mjs`
  - النتيجة: 9/9 ناجح.
- `node_modules\.bin\tsc.cmd --noEmit`
  - النتيجة: ناجح.
- `node_modules\.bin\tsc.cmd -p tsconfig.server.json`
  - النتيجة: ناجح.
- `node_modules\.bin\vite.cmd build`
  - النتيجة: ناجح.
  - أصل الواجهة المحلي الجديد: `dist/assets/index-DIJAj21q.js`.

## ملاحظة مهمة

الرابط القديم الذي ضاعت حالته قبل وجود التخزين الدائم لن تعود له بياناته القديمة تلقائيا من السيرفر، لكن بعد هذه الدفعة لن يقف على شاشة اتصال فارغة إذا كان `templateId` واضحا في الرابط. وعند ضغط إظهار/إخفاء من الأداة سيتم نشر الحالة إلى `/api/live` بسرعة أكبر وبمسار دائم.

## تحقق Hostinger بعد النشر

تم دفع commit:

`d61551f fix: speed up mondial output transitions`

ثم التقط Hostinger الحزمة الجديدة:

`https://peachpuff-herring-712997.hostingersite.com/assets/index-DIJAj21q.js`

فحص محتوى الحزمة المنشورة أعاد:

- `public-output-fallback`: موجود.
- polling السريع `400 / 800`: موجود.
- سرعة `520`: موجودة.
- swap/reverse القديم للأقواس: غير موجود.
- خروج القوس العلوي يستخدم `mondialTransitionArcBandTopIn` مع `.62`: موجود.

## تحقق Playwright على الرابط العام

تم فتح رابط المستخدم القديم:

`https://peachpuff-herring-712997.hostingersite.com/output/instance-studio-2c7379d9fc98a752-template-mondial-group-wall-mqueo02i-0c2f818f?obs=1&rgev=obs-live-v3`

نتيجة DOM:

- `Connecting to RGE Cloud`: غير ظاهر.
- `.mondial-transition-frame`: ظاهر.
- `data-phase`: `in`.
- `data-effect`: `stinger`.
- `data-motion`: `on`.
- `data-transition-speed`: `520`.
- حركة القوس العلوي: `mondialTransitionArcBandTopIn`.
- حركة القوس السفلي: `mondialTransitionArcBandBottomIn`.

## اختبار إظهار/إخفاء حي

تم إنشاء رابط اختبار على Hostinger ونشر الحالة عبر `/api/live`:

- `POST /api/live`: أعاد `200`.
- `X-Live-Store`: `file`.
- زمن التقاط الإخفاء في صفحة العرض: `473ms`.
- زمن التقاط الإظهار في صفحة العرض: `19ms`.
- الحالة النهائية: `phase=in`, `effect=stinger`, `speed=520`.
