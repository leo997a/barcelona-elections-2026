# تقرير عربي - دفعة 26 - إصلاح مرحلة خروج قوالب المونديال

## السبب

أثناء فحص رابط عرض حي على Hostinger بعد دفعة تحسين السرعة، ظهر خلل مهم في الإخفاء:

- أمر `/api/live` كان يصل بنجاح.
- القالب كان يختفي.
- لكن `data-phase` داخل طبقة انتقال المونديال كان يتحول إلى `hold` بدلا من `out`.

هذا يعني أن خروج stinger الداخلي لا يأخذ مساره الكامل، وقد يظهر الإخفاء كأنه قطع سريع أو انتقال غير صحيح.

## التعديل

تم تعديل `OverlayRenderer` بحيث:

1. عند الدخول يبقى `wasVisible=true`.
2. عند الخروج يبقى `wasVisible=true` طوال مدة `runtimeExitHoldMs`.
3. بعد انتهاء hold فقط يتم:
   - إلغاء تركيب القالب.
   - تصفير كلاس الأنيميشن.
   - تحويل `wasVisible=false`.

بهذا تستطيع `MondialTransitionFrame` قراءة حالة الخروج الصحيحة وإظهار:

- `data-phase="out"` أثناء الخروج.
- `data-effect="stinger"` أو تأثير الخروج المختار.
- نفس اتجاه أقواس stinger بدون انقلاب خاطئ.

## اختبار حماية جديد

تمت إضافة اختبار في:

- `tests/mondial-runtime-controls.test.mjs`

الاختبار يمنع عودة السلوك القديم الذي كان يحدّث `wasVisible` مباشرة إلى نفس قيمة `isVisible` قبل انتهاء خروج القالب.

## التحقق المحلي

- `node --test tests\mondial-runtime-controls.test.mjs`: نجح `11/11`.
- `node_modules\.bin\tsc.cmd --noEmit`: نجح.
- `node_modules\.bin\tsc.cmd -p tsconfig.server.json`: نجح.
- `node_modules\.bin\vite.cmd build`: نجح.

## الحزمة بعد الإصلاح

- JavaScript الرئيسي: `dist/assets/index-B6tpzRX9.js`.
- الحجم: `1701.87 kB`.
- gzip: `410.21 kB`.

ما زلنا محافظين على مكسب تقسيم الحزمة من دفعة 25، مع إصلاح سلوك الخروج.

## تحقق Hostinger

- تم دفع التحديث إلى GitHub في commit:
  - `4b8f58c fix: keep mondial exit phase active`
- Hostinger خدم الحزمة الجديدة بعد المحاولة الرابعة:
  - `assets/index-B6tpzRX9.js`
- فحص الحزمة المنشورة أكد:
  - fallback روابط العرض العامة موجود.
  - lazy chunks موجودة.
  - سرعة الانتقال `760ms` موجودة.
  - لا يوجد عكس خاطئ لاتجاه أقواس stinger.

## تحقق متصفح مباشر

تم فتح الرابط القديم نفسه:

`/output/instance-studio-2c7379d9fc98a752-template-mondial-group-wall-mqueo02i-0c2f818f?obs=1&rgev=obs-live-v3`

النتيجة:

- لا تظهر `Connecting to RGE Cloud`.
- القالب يعرض المجموعات.
- `data-phase="in"`.
- `data-effect="stinger"`.
- `data-transition-speed="760"`.

ثم تم إنشاء رابط دخان مستقل ونشر حالته عبر `/api/live`:

- `POST` الإخفاء: `123ms`.
- أول ظهور لـ `data-phase="out"`: حوالي `225ms`.
- اختفاء القالب بعد الخروج: حوالي `800ms`.
- `POST` الإظهار: `112ms`.
- الحالة النهائية: `phase=in`, `effect=stinger`, `speed=760`.

## النتيجة المطلوبة

عند ضغط إخفاء:

- يصل الأمر بسرعة عبر `/api/live`.
- يدخل القالب مرحلة `out` فعليا.
- يستمر stinger للخروج حتى نهاية مدة الانتقال، ثم يختفي القالب.

وعند ضغط إظهار:

- يعود القالب إلى `in`.
- تبقى السرعة الافتراضية `760ms`.
- يبقى الرابط نفسه دون تغيير.
