# تقرير عربي: SMART-TOKEN-DNA-VISIBLE-AND-TESTED-014

التاريخ: 2026-06-10

## 1. الهدف

بعد مرحلة `STREAM-DECK-SMART-TOKEN-OPERATOR-MUTED-PREVIEW-013` أصبح التوكن أذكى تقنيًا، لكنه كان لا يزال يحتاج وضوحًا بصريًا قبل النسخ: المستخدم يجب أن يعرف من داخل المكتبة أو المحرر ماذا سيحمل التوكن من قدرات وحقول قبل لصقه داخل Stream Deck.

هذه المرحلة تضيف ذلك الوضوح، وتنفذ اختبارًا آليًا مباشرًا لمولد التوكن.

## 2. التشخيص

المشكلة لم تكن في توليد `rge_...` فقط. المشكلة التشغيلية هي أن المستخدم قد ينسخ token دون أن يرى:

- هل هذا القالب يدعم صفحات؟
- هل يدعم score controls؟
- هل يدعم audio controls؟
- هل يحمل probability shift؟
- كم حقلًا سيعرفه Stream Deck؟
- هل التوكن يحذف البيانات الثقيلة مثل JSON؟

لذلك كان مطلوبًا جعل Smart Token مفهومًا قبل استخدامه، لا بعد لصقه فقط داخل Property Inspector.

## 3. التعديل المنفذ

### 3.1 وصف مركزي للتوكن

تم توسيع `utils/smartToken.ts` بإضافة:

- `SMART_TOKEN_CAPABILITY_LABELS`
- `getSmartTokenCapabilityLabel()`
- `describeSmartToken()`

هذه الدوال تعطي واجهة مستقرة لعرض:

- capabilities الأصلية.
- أسماء capabilities بالعربي.
- قائمة حقول التحكم المضغوطة.
- عدد الحقول.

### 3.2 Library: Stream Deck DNA

تم تعديل بطاقة القالب داخل `pages/Library.tsx` لإظهار صندوق صغير:

- `Stream Deck DNA`
- عدد الحقول التي سيحملها التوكن.
- أهم القدرات مثل:
  - ظهور.
  - صوت.
  - موضع.
  - نتيجة.
  - صفحات.
  - نسب.
  - داعمين.

هذا يجعل كل قالب يشرح نفسه قبل نسخ التوكن.

### 3.3 Editor: شارة Smart Token

تم تعديل `pages/Editor.tsx`:

- زر `Smart Token` أصبح يستخدم tooltip فيه قدرات القالب وعدد الحقول.
- تمت إضافة شارة مختصرة على الشاشات الواسعة تعرض عدد الحقول وأهم القدرات.

الهدف: عندما يكون المستخدم داخل القالب نفسه، يعرف بسرعة هل التوكن غني فعلًا أم عام فقط.

## 4. التجربة الآلية

تم تشغيل اختبار Node مؤقت بدون إنشاء ملفات دائمة:

- transpile مؤقت لـ `utils/base64.ts`.
- transpile مؤقت لـ `utils/smartToken.ts`.
- إنشاء overlay وهمي من نوع `SCOREBOARD`.
- توليد token يبدأ بـ `rge_`.
- فك التوكن.
- التأكد من:
  - `v = 2`.
  - وجود `visibility`.
  - وجود `audio`.
  - وجود `transform`.
  - وجود `scoreboard`.
  - وجود `paging`.
  - وجود `probability-shift`.
  - وجود `sponsors`.
  - دخول حقول مثل `homeScore`, `awayScore`, `soundEnabled`, `currentPage`, `probabilityShiftMode`.
  - عدم دخول `pagesData` و`sponsorsData` كحقول ثقيلة.
  - وجود `Version: 4.5.0` داخل صفحة التكاملات.
  - اسم الحزمة `RGE_Live_Controller_v4_5.streamDeckPlugin`.
  - بقاء `toggle` محولًا إلى Show آمن.
  - وجود دعم `field_toggle:`.

نتيجة الاختبار:

```json
{
  "ok": true,
  "capabilities": [
    "visibility",
    "audio",
    "transform",
    "scoreboard",
    "paging",
    "probability-shift",
    "sponsors"
  ],
  "fieldCount": 8
}
```

## 5. نتائج التحقق

- `npm run lint`: نجح.
- `npm run build`: نجح.
- عدد Vercel functions: 10.
- `/Library`: HTTP 200 محليًا.
- `/Integrations`: HTTP 200 محليًا.
- `/Operator`: HTTP 200 محليًا.

تحذير bundle size ظهر كما في السابق، وهو خارج نطاق هذه المرحلة.

## 6. ما لم يتم اختباره

- لم يتم تثبيت Stream Deck plugin داخل برنامج Elgato فعليًا.
- لم يتم الضغط على أزرار جهاز Stream Deck الحقيقي.
- لم يتم تجاوز بوابة الترخيص بصريًا في هذا الفحص.

## 7. الملفات المعدلة

- `utils/smartToken.ts`
- `pages/Library.tsx`
- `pages/Editor.tsx`

## 8. ما لم يتم لمسه

- لم يتم تعديل `api/`.
- لم يتم تعديل `components/renderers/`.
- لم يتم تعديل `services/audioEngine.ts`.
- لم يتم تعديل `constants.ts`.
- لم يتم تعديل Player Intel.
- لم يتم تعديل Stream Deck plugin logic في هذه المرحلة، لأن ذلك تم في المرحلة السابقة.
- لم يتم لمس secrets أو `.env`.

## 9. QA يدوي مطلوب

1. افتح Library بعد الترخيص.
2. لاحظ صندوق `Stream Deck DNA` على كل قالب.
3. افتح قالب Scoreboard وتأكد أن البطاقة تعرض نتيجة/صوت/موضع حسب الحقول.
4. افتح قالب صفحات أو Smart News وتأكد أن `صفحات` تظهر.
5. افتح قالب نسب وتأكد أن `نسب` تظهر عند وجود `probabilityShiftMode`.
6. افتح Editor لنفس القالب وتأكد أن شارة Smart Token تعرض عدد الحقول.
7. انسخ token من Editor ثم الصقه في Stream Deck v4.5.
8. تأكد أن Property Inspector يعرض نفس القدرات تقريبًا.

## 10. التوصية التالية

الخطوة التالية الأفضل هي اختبار v4.5 داخل برنامج Stream Deck الحقيقي. إذا تعذر ذلك، يمكن تنفيذ مرحلة محاكاة أعمق داخل المتصفح عبر صفحة Web Deck داخلية، لكنها لا تغني عن اختبار Elgato الحقيقي.
