# تقرير عربي: STREAM-DECK-SMART-TOKEN-OPERATOR-MUTED-PREVIEW-013

التاريخ: 2026-06-10

## 1. ملخص تنفيذي

هذه المرحلة عالجت ثلاث مشاكل تشغيلية خطيرة:

1. Stream Deck كان يعتمد على Token بسيط لا يعرف إلا اسم القالب ونوعه، لذلك لا يستطيع بناء أوامر ذكية حسب حقول كل قالب.
2. أمر `toggle` القديم كان خطرًا أثناء البث، لأن ضغطة مكررة أو إعداد خاطئ يمكن أن يحول زر العرض إلى إخفاء.
3. معاينة غرفة التحكم كانت تعرض القالب بصريًا، لكنها لم تضمن كتم كل مسارات الصوت والوسائط داخل المعاينة.

تم تنفيذ إصلاح محدود بدون API جديد، وبدون تعديل renderers، وبدون تغيير template IDs.

## 2. التشخيص

### Stream Deck

التوكن السابق كان يحمل:

- studio id.
- overlay id.
- type.
- name.
- control key.
- site url.

هذا لا يكفي. قالب Scoreboard يحتاج أوامر نتائج، قالب صفحات يحتاج next/prev، قالب نسب يحتاج تحويل old/today، وبعض القوالب فيها booleans قابلة للتحكم. لذلك كان Stream Deck يعرض أوامر عامة أكثر من اللازم ولا يفهم ما يمكن التحكم به داخل القالب.

### Toggle

داخل plugin كان `toggle` يرسل `toggle_visible`، أي أنه يقلب الحالة. هذا خطر في البث لأن زرًا اسمه عرض قد يخفي القالب إذا كانت الحالة live أو إذا وصلت ضغطة مكررة.

### Operator Preview Audio

`Operator.tsx` كان يبني معاينة بـ:

```tsx
{ ...selectedOverlay, isVisible: true }
```

هذا يجعل المعاينة مرئية، لكنه لا يفرض كتم media/audio fields. `OverlayRenderer` لا يشغل مؤثرات الدخول في وضع editor، لكن أي renderer أو media داخلي يعتمد على حقول media/audio قد يبقى قابلًا لإخراج صوت.

## 3. التعديلات المنفذة

### 3.1 Smart Token v2

أضيف ملف:

`utils/smartToken.ts`

المولّد الجديد يبني Token بصيغة `rge_...` مع:

- `v: 2`
- معرف القالب.
- نوع القالب.
- اسم القالب.
- templateId.
- icon مختصر.
- `cap`: قدرات القالب مثل visibility/audio/transform/scoreboard/paging/probability-shift/sponsors.
- `fs`: ملخص مضغوط للحقول القابلة للتحكم، بدون تخزين قيم الحقول.

المهم: لا يتم وضع قيم النصوص أو الصور أو JSON داخل التوكن، بل metadata فقط.

### 3.2 Library Token

تم استبدال توليد التوكن اليدوي في `pages/Library.tsx` بالمولّد المركزي الجديد.

### 3.3 Editor Token Button

تمت إضافة زر `Smart Token` داخل محرر القالب نفسه في شريط التحكم العلوي، بجانب رابط التعديل ورابط القالب.

هذا يحقق طلب أن يكون التوكن قابلًا للنسخ من داخل القالب نفسه، وليس فقط من المكتبة.

### 3.4 Stream Deck Plugin v4.5

تم رفع manifest إلى:

`4.5.0`

واسم التنزيل أصبح:

`RGE_Live_Controller_v4_5.streamDeckPlugin`

داخل Property Inspector:

- يعرض اسم القالب.
- يعرض نوع القالب.
- يعرض template id.
- يعرض عدد الحقول داخل التوكن.
- يعرض capabilities.
- يبني قائمة الأوامر حسب `cap/fs`.

الأوامر الذكية الحالية:

- Show / TAKE IN.
- Hide / TAKE OUT.
- Audio controls إذا وجدت حقول الصوت.
- Reset position/scale إذا وجدت حقول التحويل.
- Scoreboard controls إذا وجدت homeScore/awayScore.
- Pages/Slides controls إذا وجد currentPage.
- Probability old/today إذا وجد probabilityShiftMode.
- Toggles ديناميكية للحقول boolean القادمة من التوكن.

### 3.5 إصلاح toggle الخطر

أمر `toggle` القديم لم يعد يقلب الحالة في v4.5.

تم تحويله إلى:

```js
set_visible = true
```

أي أن أي زر قديم مضبوط على toggle سيعمل كزر Show آمن، ولن يخفي قالبًا live بسبب ضغطة مكررة.

### 3.6 Operator Silent Preview

تم تعديل `pages/Operator.tsx` ليبني معاينة صامتة فقط:

- `soundEnabled = false`
- `sfxEnabled = false`
- `voiceEnabled = false`
- `soundVolume = 0`
- `voiceVolume = 0`
- `mediaMuted = true`

هذه القيم تطبق على نسخة preview فقط ولا تغير بيانات القالب الحقيقية ولا OBS.

## 4. الملفات المعدلة

- `utils/smartToken.ts`
- `pages/Library.tsx`
- `pages/Editor.tsx`
- `pages/Integrations.tsx`
- `pages/Operator.tsx`

## 5. ما لم يتم لمسه

- لم يتم تعديل `api/`.
- لم يتم تعديل `components/renderers/`.
- لم يتم تعديل `services/audioEngine.ts`.
- لم يتم تغيير template IDs.
- لم يتم تعديل Player Intel.
- لم يتم تعديل ملفات secrets أو `.env`.
- لم تتم إضافة Vercel functions.

## 6. نتائج التحقق

- `npm run lint`: نجح.
- `npm run build`: نجح.
- عدد Vercel functions: 10.
- `/Library`: HTTP 200 محليًا.
- `/Operator`: HTTP 200 محليًا.
- `/Integrations`: HTTP 200 محليًا.

ملاحظة: ظهر تحذير bundle size المعروف سابقًا أثناء build. لم يتم فتحه كجزء من هذه المرحلة.

## 7. ما لم يتم اختباره يدويًا

- لم يتم تثبيت ملف Stream Deck v4.5 داخل برنامج Elgato فعليًا.
- لم يتم اختبار الضغط الحقيقي على جهاز Stream Deck.
- لم يتم اختبار UI الداخلي بعد بوابة الترخيص داخل المتصفح في هذه المرحلة.

## 8. QA يدوي مطلوب

1. افتح Library بعد الترخيص.
2. انسخ Smart Token من بطاقة قالب.
3. افتح Editor لنفس القالب وانسخ Smart Token من الزر الجديد.
4. نزّل `RGE_Live_Controller_v4_5.streamDeckPlugin`.
5. ثبّت الإضافة في Stream Deck.
6. ألصق token لقالب Scoreboard وتأكد أن أوامر النتائج تظهر.
7. ألصق token لقالب Smart News أو أي قالب فيه `currentPage` وتأكد أن أوامر الصفحات تظهر.
8. ألصق token لقالب النسب وتأكد أن أوامر old/today تظهر إذا كان فيه `probabilityShiftMode`.
9. جرّب زر Show عدة مرات، ويجب ألا يخفي القالب.
10. جرّب Hide لإخراج القالب.
11. افتح Operator وتأكد أن المعاينة لا تخرج صوتًا إلى سطح المكتب.
12. تأكد أن OBS الحقيقي لا يزال يستقبل الصوت من رابط OBS وليس من معاينة Operator.

## 9. التوصية التالية

بعد هذا الإصلاح، المرحلة التالية يجب أن تكون:

- إعادة تصميم تجربة غرفة التحكم بصريًا وسلوكيًا بشكل أوسع.
- تقسيم أزرار Operator إلى طبقات: بث، محتوى، صفحات، صوت، روابط.
- إضافة بطاقة Stream Deck داخل كل قالب تعرض capabilities التي سيحملها التوكن قبل نسخه.

لكن لا أنصح بفتح هذا redesign قبل تجربة v4.5 يدويًا، لأن اختبار Stream Deck الحقيقي سيكشف هل نحتاج أوامر إضافية قبل تجميل الواجهة.
