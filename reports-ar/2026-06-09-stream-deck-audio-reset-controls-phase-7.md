# تقرير عربي - STREAM-DECK-AUDIO-RESET-CONTROLS-007

التاريخ: 2026-06-09
نوع المرحلة: تصحيح محدود لمولّد Stream Deck بدون API جديد

## 1. سبب المرحلة

بعد مرحلة مراجعة الطلبات والتقارير، ظهر أن Stream Deck لا يزال أكبر محور ناقص تشغيليًا:

- لا توجد أوامر صوت مباشرة.
- لا توجد أوامر reset عملية.
- feedback العميق ما زال مؤجلًا.
- التقارير السابقة أوصت بإضافة audio toggle/reset بدون زيادة عدد Vercel functions.

لذلك تم تنفيذ جزء صغير وآمن من Phase Stream Deck:

إضافة أوامر صوت وإعادة ضبط إلى الإضافة المولدة من صفحة `Integrations`، مع إبقاء كل شيء داخل `/api/live` الحالي.

## 2. التشخيص قبل التنفيذ

تم فحص `pages/Integrations.tsx`، وظهر أن الإضافة المولدة:

1. تبني ملف `RGE_Live_Controller_v4_1.streamDeckPlugin`.
2. تقرأ Smart Token من Property Inspector.
3. تستخرج `siteUrl` و`overlayId`.
4. تعمل `GET /api/live?id=<overlayId>`.
5. تطبق الأمر محليًا داخل `applyLiveCommand`.
6. ترسل `POST /api/live?id=<overlayId>` بالحالة الجديدة.

الأوامر القديمة كانت:

- `set_on`
- `set_off`
- `toggle`
- أوامر score.
- أوامر slide.

النقص المؤكد:

- لا يوجد `audio_toggle`.
- لا يوجد `audio_on/audio_off`.
- لا يوجد `sfx_toggle`.
- لا يوجد `voice_toggle`.
- لا يوجد `audio_reset`.
- لا يوجد reset للموضع والحجم.

## 3. ما تم تنفيذه

### 3.1 رفع نسخة الإضافة

تم رفع نسخة manifest من:

`4.1.0`

إلى:

`4.2.0`

وتم تغيير اسم الملف الناتج إلى:

`RGE_Live_Controller_v4_2.streamDeckPlugin`

حتى لا يختلط على المستخدم بين النسخة القديمة والجديدة.

### 3.2 أوامر الصوت الجديدة

تمت إضافة أوامر عامة تظهر في Property Inspector تحت مجموعة:

`الصوت والمشهد`

الأوامر:

- `audio_toggle` - تبديل الصوت العام `soundEnabled`.
- `audio_on` - تشغيل الصوت العام.
- `audio_off` - كتم الصوت العام.
- `sfx_toggle` - تبديل المؤثرات `sfxEnabled`.
- `voice_toggle` - تبديل الصوت الحقيقي `voiceEnabled`.
- `audio_reset` - إعادة ضبط آمنة للصوت.

### 3.3 إعادة ضبط الصوت

أمر `audio_reset` يكتب القيم التالية:

- `soundEnabled = true`
- `sfxEnabled = true`
- `voiceEnabled = false`
- `soundVolume = 0.55`
- `audioUpdateCue = ''`
- `audioSceneId = ''`

الهدف أن يعود القالب إلى حالة صوت آمنة ومهنية بدون تشغيل voice حقيقي مفاجئ.

### 3.4 إعادة ضبط الموضع والحجم

تمت إضافة مجموعة:

`إعادة الضبط`

وفيها:

- `transform_reset`

هذا الأمر يضبط:

- `positionX = 0`
- `positionY = 0`
- `scale = 1`

### 3.5 دعم حقول قديمة أو ناقصة

لأن بعض القوالب القديمة قد لا تحتوي كل حقول الصوت أو الموضع، أضيف داخل كود الإضافة المولدة helper محدود:

- `setFieldValue`
- `getKnownFieldMeta`

هذا helper لا يضيف أي حقل عشوائي. يسمح فقط بحقن حقول معروفة ومحدودة:

- `soundEnabled`
- `sfxEnabled`
- `voiceEnabled`
- `soundVolume`
- `audioUpdateCue`
- `audioSceneId`
- `positionX`
- `positionY`
- `scale`
- `currentPage`

## 4. لماذا لم نعدل API؟

لأن `/api/live` يكفي لهذه المرحلة:

- الإضافة تجلب live state.
- تعدّل fields محليًا.
- ترسل state الجديدة لنفس endpoint.

هذا يحافظ على عدد Vercel functions دون زيادة.

## 5. الملفات المعدلة

تم تعديل ملف كود واحد فقط:

- `pages/Integrations.tsx`

وتم إنشاء هذا التقرير:

- `reports-ar/2026-06-09-stream-deck-audio-reset-controls-phase-7.md`

## 6. المناطق التي لم يتم لمسها

لم يتم تعديل:

- `api/`
- `services/audioEngine.ts`
- `services/syncManager.ts`
- `types.ts`
- `constants.ts`
- `components/renderers`
- Player Intel
- Operator
- Library
- Template IDs
- ملفات الصوت
- secrets / `.env`

## 7. نتائج التحقق

### lint

تم تشغيل:

`npm run lint`

النتيجة: نجح.

### build

تم تشغيل:

`npm run build`

النتيجة: نجح.

ملاحظة: ظهر تحذير Vite المعروف حول chunk أكبر من 500 kB. هذا تحذير أداء قديم وليس نتيجة هذه المرحلة.

### عدد Vercel Functions

تم عد functions داخل `api/` مع استثناء `_lib`.

النتيجة:

`FUNCTION_COUNT=10`

أي أنه بقي تحت الحد المطلوب `<= 12`.

### فحص المتصفح المحلي

تم تشغيل dev server محليًا على:

`http://127.0.0.1:5230/Integrations`

النتيجة:

- استجابة HTTP كانت `200`.
- الصفحة لم تكن بيضاء.
- لا توجد console errors عند التحميل.
- توقفت الصفحة عند بوابة تفعيل الاستوديو.

لم يتم اختبار تنزيل plugin من داخل الصفحة لأن ذلك يحتاج الدخول إلى الاستوديو بعد بوابة التفعيل.

## 8. ما لم يتم إنجازه بعد

هذه المرحلة لا تغلق Stream Deck كاملًا.

المتبقي لاحقًا:

1. feedback حقيقي للحالة على الأزرار.
2. اختبار فعلي داخل برنامج Stream Deck.
3. icons فعلية بدل placeholders.
4. reset أعمق حسب نوع القالب.
5. next/previous template أو Program-level controls.
6. ربط DiagnosticStrip بحالة Stream Deck إن توفرت.

## 9. Manual QA checklist

بعد الدخول إلى الاستوديو:

1. افتح `Integrations`.
2. نزّل `RGE_Live_Controller_v4_2.streamDeckPlugin`.
3. ثبّت الإضافة في Stream Deck.
4. انسخ Smart Token لقالب فيه صوت.
5. جرّب `audio_off` وتأكد أن القالب يصبح صامتًا.
6. جرّب `audio_on` وتأكد أن الصوت يعود.
7. جرّب `audio_toggle`.
8. جرّب `sfx_toggle`.
9. جرّب `voice_toggle` على قالب يدعم voice.
10. جرّب `audio_reset`.
11. جرّب `transform_reset` على قالب تم تحريكه أو تكبيره.
12. تأكد أن IN/OUT القديم لا يزال يعمل.

## 10. الخلاصة

تم تنفيذ أول جزء عملي من مرحلة Stream Deck بدون توسيع API وبدون لمس القوالب أو الصوت runtime.

النتيجة: الإضافة المولدة أصبحت v4.2 وتحتوي أوامر تشغيلية كان المستخدم والتقارير يطلبونها منذ المراحل الأولى: صوت، مؤثرات، صوت حقيقي، reset صوت، وreset موضع/حجم.
