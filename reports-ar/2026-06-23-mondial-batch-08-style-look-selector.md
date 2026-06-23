# تقرير الدفعة 8 - اختيار الثيمات والستايلات للمونديال

## الهدف

حل مشكلة أن إعدادات الستايل والثيم كانت موجودة لكنها غير واضحة أو تبدو غير فعالة داخل المحرر ولوحة التشغيل.

## ما تم تنفيذه

- إضافة حقل جديد باسم `broadcastLook` كحزمة جاهزة للستايل التلفزيوني.
- ربط كل حزمة تلقائيا مع `broadcastStyle` و `broadcastPalette` حتى يغير اختيار واحد شكل القالب وألوانه معا.
- إبقاء وضع `manual` لمن يريد التحكم اليدوي بالستايل والباليت كل واحد على حدة.
- نقل حقول المونديال المهمة إلى تبويب التنسيق في المحرر:
  - `broadcastLook`
  - `broadcastStyle`
  - `broadcastPalette`
  - `mondialMotionPreset`
  - `transitionSpeedMs`
  - `transitionIntensity`
- جعل لوحة التشغيل تعتبر `look` و `palette` ضمن إعدادات التنسيق.
- تعريب أسماء حقول الحركة والصوت الأساسية حتى تظهر بوضوح للمستخدم.

## الحزم الجديدة

- `reference_pack`: ستايل الصور المرجعية، خلفية سوداء وأقواس نيون.
- `match_night`: ستايل مباراة تلفزيونية مع طاقة ملعب.
- `scoreboard_red`: ستايل النتائج الحمراء ولقطات full-time.
- `social_blue_green`: ستايل منشورات وسوشيال أزرق/أخضر.
- `trophy_gold`: ستايل ذهبي خاص بحزمة البطولة.
- `clean_draw`: ستايل جداول ومجموعات نظيف.
- `manual`: تحكم يدوي كامل.

## التحقق

- `git diff --check`: نجح بدون أخطاء، مع تحذيرات CRLF فقط.
- `npm.cmd run build`: نجح.
- `node --test tests\fotmob-world-cup.test.mjs`: نجح، 3 اختبارات.
- فحص المتصفح المحلي لقالب `scoreboard_red` أكد:
  - `effect = scorebug`
  - `motion = on`
  - `transitionSpeed = 1100ms`
  - `--mondial-bg = #120003`
  - `--mondial-panel = #7b020b`
  - `--mondial-a1 = #ff1738`

## لقطة المعاينة

`reports-ar/mondial-style-look-selector-preview.png`
