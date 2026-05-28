# تقرير مرحلة: REAL-AUDIO-MUSIC-MERCATO-MEDIA-001

التاريخ: 2026-05-28  
الهدف: إدخال مؤثرات صوتية حقيقية، إضافة حزمة موسيقى حقيقية، وبناء 10 قوالب ميركاتو ميديا جديدة تدعم الصور والفيديوهات بروابط مباشرة.

## 1. ملخص تنفيذي

تم تنفيذ المرحلة كإضافة مستقلة وآمنة بدون تغيير مسارات OBS الحالية، وبدون تعديل نظام المفاتيح أو Stream Deck أو Player Intel V2.

النتيجة:

- تمت إضافة 4 ملفات صوتية حقيقية من مجلد `تاثيرات صوتية`.
- تمت إضافة 10 ملفات موسيقى MP3 حقيقية من مجلد `مجلد جديد`.
- تمت إضافة نوع قالب جديد: `MERCATO_MEDIA_STORY`.
- تمت إضافة Renderer جديد: `MercatoMediaStoryRenderer`.
- تمت إضافة 10 قوالب ميركاتو جديدة كليًا تدعم:
  - صورة مباشرة.
  - فيديو مباشر.
  - رابط محلي بصيغة `file:///` أو مسار public.
  - رابط أونلاين مباشر.
  - موسيقى خلفية حقيقية منخفضة.
  - voice cue حقيقي اختياري.

## 2. جرد الأصول

### المؤثرات / الصوت الحقيقي

المصدر:

`F:\reo\reo show music 2026 transfer football\تاثيرات صوتية`

النتيجة:

- 4 ملفات WAV جديدة.
- الحجم الإجمالي التقريبي: 0.44MB.
- تم نسخها إلى:
  - `public/audio/voice-packs/mercato/things-happening-now.wav`
  - `public/audio/voice-packs/mercato/transfer-approaching.wav`
  - `public/audio/voice-packs/mercato/mercato-heating-now.wav`
  - `public/audio/voice-packs/mercato/deal-percentages-current.wav`

بذلك أصبح داخل مكتبة Mercado voice pack:

- `here-we-go.wav`
- `agreement-close.wav`
- `things-happening-now.wav`
- `transfer-approaching.wav`
- `mercato-heating-now.wav`
- `deal-percentages-current.wav`

### الموسيقى الحقيقية

المصدر:

`F:\reo\reo show music 2026 transfer football\مجلد جديد`

النتيجة:

- 10 ملفات MP3.
- الحجم الإجمالي التقريبي: 56.18MB.
- أكبر ملف: 8.82MB.
- تم نسخها إلى:

`public/audio/music-packs/mercato-2026/`

الأسماء الجديدة مستقرة و ASCII حتى لا تتأثر الروابط بمسارات عربية أو مسافات.

## 3. ماذا تغير في النظام؟

### مكتبة الصوت الحقيقي

تم تحديث:

- `utils/voiceLibrary.ts`
- `services/mercatoVoicePacks.ts`
- `constants.ts`

الأصوات الجديدة أصبحت قابلة للاختيار من Audio Settings لكل القوالب عبر `voiceLibraryId`.

مهم: لم يتم تفعيل الصوت الحقيقي تلقائيًا على كل القوالب القديمة. هذا مقصود حتى لا يبدأ صوت مفاجئ في البث أو OBS.

### الموسيقى الحقيقية

تمت إضافة حزمة موسيقى جديدة:

`public/audio/music-packs/mercato-2026/`

الموسيقى مرتبطة فقط بقوالب `MERCATO_MEDIA_STORY` الجديدة، بصوت منخفض افتراضيًا `0.16` وبحد أقصى `0.45` داخل الـ renderer.

### القوالب الجديدة

تمت إضافة 10 قوالب:

1. `template-mercato-media-glass-briefing`
2. `template-mercato-media-neon-map`
3. `template-mercato-media-contract-scanner`
4. `template-mercato-media-airport-tracker`
5. `template-mercato-media-agent-voice-room`
6. `template-mercato-media-deal-heist-board`
7. `template-mercato-media-social-storm`
8. `template-mercato-media-medical-greenlight`
9. `template-mercato-media-club-vault`
10. `template-mercato-media-deadline-war-room`

كل القوالب تستخدم نفس الـ renderer الجديد لتقليل الانفجار في عدد الملفات.

## 4. دعم الميديا

الـ renderer الجديد يدعم:

- `mediaUrl`: الرابط الأساسي.
- `mediaAltUrl`: رابط احتياطي.
- `mediaMode`: auto / image / video.
- `mediaFit`: cover / contain.
- `mediaMuted`: كتم صوت الفيديو الافتراضي حتى لا يتداخل مع الموسيقى.

المسارات المدعومة عمليًا:

- روابط public داخل المشروع مثل `/images/example.png`.
- روابط HTTPS مباشرة لصورة أو فيديو.
- مسارات local يتم تحويلها إلى `file:///` عند الإمكان.

ملاحظة مهمة: الوصول إلى ملفات local خارج المشروع يعتمد على سياسة المتصفح/OBS. الأكثر استقرارًا للبث هو وضع الملف داخل `public/` أو استخدام رابط مباشر.

## 5. ضمانات لم يتم كسرها

لم يتم تعديل:

- `api/`
- `services/audioEngine.ts`
- Player Intel V2
- Stream Deck
- نظام Program OBS link
- نظام المفاتيح
- روابط edit/deep link السابقة

لم يتم تغيير template IDs القديمة.

## 6. المخاطر المتبقية

1. الموسيقى داخل المتصفح قد تحتاج user gesture في بعض المتصفحات العادية، لكن OBS Browser Source غالبًا يسمح بالتشغيل.
2. روابط `file:///` قد لا تعمل في كل بيئات المتصفح بسبب سياسات الأمان.
3. لم يتم اختبار الصوت يدويًا داخل OBS في هذه المرحلة.
4. الملفات الصوتية زادت حجم repo بحوالي 56.6MB تقريبًا.

## 7. التحقق

تم تشغيل:

- `npm run lint` ونجح.
- عدد Vercel functions بقي 10.

سيتم تشغيل `npm run build` بعد كتابة التقرير كتحقق نهائي قبل commit.

## 8. التوصية للمرحلة التالية

الأولوية التالية المقترحة:

1. فتح المتصفح محليًا واختبار 2-3 قوالب من `Mercato Media Story` بصريًا.
2. اختبار تشغيل music bed في OBS Browser Source.
3. إضافة خيار Library واضح لتصفية `ميديا وموسيقى`.
4. تحسين Editor UX لحقول `mediaUrl` و `musicTrackUrl` لاحقًا إذا ازدحمت الشاشة.
5. بعد التأكد بصريًا، يمكن عمل polish للقوالب العشرة واحدًا واحدًا.

