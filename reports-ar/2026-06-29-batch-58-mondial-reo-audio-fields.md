# دفعة 58 — ربط مكتبة Reo داخل حقول صوت قوالب المونديال

## ما تم
- إضافة خيارات Reo الحقيقية إلى حقول صوت قوالب المونديال:
  - `soundInStyle` لصوت الظهور.
  - `soundOutStyle` لصوت الإخفاء.
  - `audioUpdateCue` لصوت تحديث البيانات.
- تطبيق نفس القوائم على بلوك قوالب العرض/العراق حتى لا تختلف الخيارات بين عائلة وأخرى.
- استخدام قوائم مشتركة داخل `MondialTemplates.ts` بدل نسخ الخيارات يدويًا في كل مكان.

## خيارات Reo الجديدة داخل القوالب
- الظهور: `REO_WHOOSH_IN`, `REO_TRANSITION`, `REO_DATA_IN`, `REO_CROWD`, `REO_IMPACT`, `REO_CINEMA`, `REO_GLITCH`.
- الإخفاء: `REO_WHOOSH_OUT`, `REO_SUBDROP`, `REO_IMPACT`, `REO_CINEMA`, `REO_GLITCH`.
- التحديث: `REO_DATA_TICK`, `REO_DATA_IN`, `REO_CLICK`, `REO_NOTIFICATION`, `REO_POP`, `REO_VAR`, `REO_WHISTLE`, `REO_GOAL`, `REO_BREAKING`.

## لماذا هذا مهم
قبل هذه الدفعة كانت مكتبة Reo ظاهرة في لوحة الصوت وغرفة البث، لكن بعض قوائم قوالب المونديال نفسها كانت ثابتة ولا تعرض هذه الأصوات كاختيارات مباشرة.
الآن يمكن اختيار أصوات Reo من حقول القالب نفسها، مع استمرار تشغيلها كملفات mp3 حقيقية عبر `audioEngine`.

## الحماية
- تم تحديث `tests/mondial-runtime-controls.test.mjs` للتأكد من ظهور مفاتيح Reo داخل خيارات صوت المونديال.
- تم التأكد من أن حقول الظهور/الإخفاء/التحديث تستخدم قوائم Reo المشتركة.

## نتائج الفحص
- `node --test tests\audio-sfx-assets.test.mjs`: نجح 6/6.
- `node --test tests\mondial-runtime-controls.test.mjs`: نجح 16/16.
- `node_modules\.bin\tsc.cmd --noEmit`: نجح.
- `npm run build`: نجح.

## التالي
بعد إغلاق حلقة الصوت، العودة لمسار قوالب المونديال يجب أن تبدأ من:
1. قالب التشكيلة ومواقع اللاعبين.
2. قوالب الإحصائيات وفصل معنى كل لوحة للمشاهد.
3. توسيع قوالب العرض بنفس هوية الحزمة المرجعية.
