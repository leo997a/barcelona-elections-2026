# تقرير الدفعة الثالثة - قوالب المباريات والستوري

التاريخ: 23 يونيو 2026

## ما تم تنفيذه

- إضافة قالب إعلان مباراة دولي بأسلوب محطة رياضية: علمان، اختصار الفريق، التاريخ، حالة المباراة، وذيل REO SHOW.
- إضافة قالب نتيجة نهاية المباراة Full-Time مع اختيار آخر مباراة من بيانات FotMob.
- إضافة قالب Vertical Story بنسبة 9:16 مستلهم من صور حزمة المونديال، مع خلفية سوداء/نيون، بطاقات أعلام، وشريط ألوان حركي.
- ربط القوالب الثلاثة بنفس نظام اختيار الستايل والثيم:
  - Spectrum
  - Stadium
  - Signal
  - Global / REO / Midnight palettes
- إضافة اختيار المباراة من الإعدادات:
  - المباراة القادمة
  - آخر نتيجة نهائية
  - مباراة محددة برقم الفهرس
- تحسين عرض اختصارات الفرق حتى تظهر مثل JOR / ALG / NOR / SEN بدلا من أسماء طويلة داخل مناطق ضيقة.

## الملفات الأساسية

- `components/renderers/mondial/MondialMatchCards.tsx`
- `components/renderers/mondial/MondialObsTemplates.tsx`
- `components/renderers/Mondial2026Renderer.tsx`
- `components/renderers/MondialTemplates.ts`

## صور التحقق

- `reports-ar/mondial-match-announcement-preview.png`
- `reports-ar/mondial-full-time-preview.png`
- `reports-ar/mondial-social-story-preview.png`

## التحقق

- نجح `npm.cmd run build`.
- نجح `node --test tests\fotmob-world-cup.test.mjs`.
- تم تشغيل الخادم المحلي من `dist-server/server/server.js`.
- تم التأكد من API المونديال:
  - `sourceStatus = live`
  - `groups = 12`
  - `fixtures = 104`
- تم فتح قوالب OBS عبر `/output/...` والتقاط صور فعلية من المتصفح.

## ملاحظات للدفع القادم

- الدفعة التالية يجب أن تركز على حزمة انتقالات أقرب للفيديو المرجعي: دخول/خروج بقناع هندسي، glitch trails، sweep bars، وربط مؤثر صوتي واضح للانتقال.
- توسيع scoreboards لتشمل 3-5 أنماط إضافية من صور المرجع.
- إضافة presets جاهزة تجمع الستايل + الثيم + الانتقال + الصوت بدلا من الاعتماد على اختيار كل حقل منفصلا.
