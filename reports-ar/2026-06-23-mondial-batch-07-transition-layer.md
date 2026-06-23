# تقرير دفعة 07 - طبقة انتقال مونديالية داخلية

## الهدف
ربط إعدادات الحركة الخاصة بقوالب المونديال بتأثير بصري حقيقي داخل القالب نفسه، وليس فقط غلاف OverlayRenderer الخارجي. الدفعة تعالج ملاحظة أن الإعدادات موجودة لكن أثرها البصري لم يكن واضحا داخل قوالب المونديال.

## ما تم تنفيذه
- إضافة `MondialTransitionFrame` كطبقة انتقال عامة لكل قوالب `Mondial2026Renderer`.
- دعم انتقالات داخلية مستوحاة من الهوية المرجعية: stinger هندسي، scorebug snap، data rush، glass sweep، side wipe، spotlight، وfade.
- ربط اختيار `mondialMotionPreset` بالتأثير الداخلي تلقائيا.
- دعم التحكم اليدوي عبر `transitionIn` و `transitionOut` عند اختيار preset مخصص.
- إضافة إعدادات جديدة قابلة للتحكم من واجهة القالب:
  - `broadcastMotion`: تشغيل أو إيقاف الحركة الداخلية.
  - `transitionSpeedMs`: سرعة الانتقال من 360 إلى 1500ms.
  - `transitionIntensity`: شدة الحركة من 0.2 إلى 1.8.
- الإبقاء على مؤثرات الصوت من المسار المركزي في `OverlayRenderer` حتى لا يحدث تشغيل صوت مزدوج داخل المعاينة أو OBS.

## نتيجة التحقق
- `npm.cmd run build`: نجح.
- `node --test tests\fotmob-world-cup.test.mjs`: نجح، 3 اختبارات مرت.
- `git diff --check`: لا توجد أخطاء whitespace.
- تحقق Browser محلي عبر رابط output مدمج:
  - `foundFrame = true`
  - `phase = in`
  - `effect = stinger`
  - `motion = on`
  - `transitionSpeed = 1500`
  - `contentAnimation = mondialTransitionContentIn`
  - `overlayAnimation = mondialTransitionStackIn`
  - `groupCards = 12`

## لقطة التحقق
`reports-ar/mondial-transition-layer-preview.png`

## ملاحظات التنفيذ
الصوت موجود في `OverlayRenderer` من خلال حقول `soundInStyle` و `soundOutStyle` و `audioUpdateCue`. هذه الدفعة لم تنقل الصوت داخل renderer الفرعي عمدا، لأن ذلك كان سيضاعف المؤثرات عند الظهور والإخفاء.
