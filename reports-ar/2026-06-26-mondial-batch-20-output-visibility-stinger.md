# تقرير دفعة 20 - تثبيت ظهور/إخفاء روابط الإخراج وانتقال المونديال

التاريخ: 2026-06-26

## الهدف

- معالجة الخلل الخطير في روابط الإخراج مثل:
  `https://peachpuff-herring-712997.hostingersite.com/output/instance-studio-2c7379d9fc98a752-template-mondial-group-wall-mqueo02i-0c2f818f?obs=1&rgev=obs-live-v3`
- منع اعتماد رابط الإخراج على نسخة قديمة من القالب عند فتحه من المحرر.
- تقريب انتقال الظهور/الاختفاء من ملف المرجع:
  `C:\Users\Reo k\Downloads\Video\videoplayback_5.gif`

## ماذا وجدت

- رابط الإخراج نفسه مستقر ولا يحتوي بيانات مضمّنة `d=`، لذلك يجب أن يتحدث من `/api/live`.
- أمر الظهور/الإخفاء كان يمر عبر نشر مؤجل، وهذا خطر في OBS أو عند إغلاق/تغيير النافذة بسرعة.
- زر "فتح الرابط" داخل المحرر كان ينشر `liveOverlay` وليس آخر نسخة مفتوحة في المحرر `draftOverlay`، وهذا قد يجعل رابط الإخراج يبدأ بحالة/إعدادات قديمة.
- مرجع الـ GIF يبدأ بشعار مركزي فوق خلفية سوداء، ثم أقواس ملونة علوية وسفلية تتقابل حول خط منتصف البث.

## التعديلات

- `services/syncManager.ts`
  - أوامر `set_visible` و `toggle_visible` أصبحت تنشر فوريا إلى `/api/live`.
  - تمت إضافة محاولة نشر ثانية قصيرة عند فشل النشر الأول.
  - بقي النشر العادي لبقية التحديثات مؤجلا لتقليل الضغط.

- `pages/Editor.tsx`
  - زر فتح رابط الإخراج ينشر الآن آخر `draftOverlay` مع حالة الظهور الحية الحالية.
  - الرابط نفسه لا يتغير، لكن الحالة المنشورة قبل فتحه أصبحت أحدث.

- `components/renderers/mondial/MondialTransitionLayer.tsx`
  - إضافة طبقة `mondial-transition-arc-stinger`.
  - إضافة شعار مركزي `REO SHOW`.
  - إضافة أقواس ألوان علوية وسفلية وخط بث أفقي، مستوحاة من GIF المرجعي.

- `tests/mondial-runtime-controls.test.mjs`
  - اختبار يثبت أن الظهور/الإخفاء يستخدم نشر فوري.
  - اختبار يثبت أن رابط المحرر يستخدم `draftOverlay`.
  - اختبار يثبت وجود طبقة الأقواس الجديدة في انتقال المونديال.

## التحقق المحلي

- `node --test tests/mondial-runtime-controls.test.mjs tests/mondial-template-contract.test.mjs`
- `npm.cmd run lint`
- `npm.cmd run build`

كلها نجحت محليا.

## ملاحظات النشر

- ناتج البناء الجديد:
  `dist/assets/index-B2coBSXb.js`
- بعد النشر يجب أن يحتوي Hostinger على هذا الباندل بدل:
  `dist/assets/index-gIFGvBJ4.js`
