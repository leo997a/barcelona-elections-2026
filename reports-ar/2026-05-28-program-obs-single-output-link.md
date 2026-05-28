# تقرير مرحلة: رابط OBS عام واحد لكل العرض المباشر

**التاريخ:** 2026-05-28  
**اسم المرحلة:** PROGRAM-OBS-SINGLE-OUTPUT-001  
**نوع المرحلة:** Hotfix UX / Runtime output  
**النطاق:** رابط Browser Source موحد لـ OBS بدون كسر روابط القوالب القديمة.

---

## 1. سبب المرحلة

المشكلة التي ظهرت للمستخدم كانت خطيرة عمليًا:

- وجود زر `OBS URL` داخل كل قالب يعني أن المستخدم قد يضطر لإضافة مصدر Browser Source منفصل لكل قالب داخل OBS.
- هذا لا يناسب التشغيل اليومي، لأن المطلوب هو رابط واحد فقط داخل OBS يتبع حالة الاستوديو: أي قالب يدخل `IN` يظهر، وأي قالب يخرج `OUT` يختفي.
- المستخدم أكد أن العرض المباشر مفتوح عنده، لذلك كان ممنوعًا إغلاقه أو العبث بالسيرفر/المنفذ الحالي.

الهدف كان إضافة مسار Output عام آمن بدون endpoint جديد وبدون تغيير template IDs وبدون كسر روابط `/output/{overlayId}` القديمة.

---

## 2. التشخيص قبل التنفيذ

تم فحص المسار الحالي:

- `pages/Library.tsx` كان ينسخ رابطًا لكل قالب عبر `syncManager.prepareOutputUrl(overlay.id, overlay)`.
- `services/syncManager.ts` كان ينشر snapshot لكل overlay على `/api/live?id={overlayId}`.
- `App.tsx / LiveOutputView` كان يفترض أن حالة `/output/{id}` هي قالب واحد فقط من نوع `OverlayConfig`.
- `api/live.ts` و `api/stream.ts` يقبلان `state: unknown` بالفعل، لذلك لا توجد حاجة لإضافة endpoint جديد.

الاستنتاج: يمكن استخدام نفس `/api/live` و`/api/stream` مع ID داخلي ثابت للبرنامج العام، وتخزين مصفوفة overlays كاملة بدل قالب واحد.

---

## 3. ما تم تنفيذه

### 3.1 معرف داخلي للرابط العام

في `services/syncManager.ts` تمت إضافة:

```ts
PROGRAM_OUTPUT_ID = '__program_output__'
```

هذا ليس template ID ولا يغير أي قالب. هو فقط channel داخلي لحالة العرض العام.

### 3.2 نشر snapshot عام

تمت إضافة `publishProgramSnapshot()` التي تنشر:

- `state: this.currentState`
- إلى `/api/live?id=__program_output__`
- بنفس نظام `clientVersion` الموجود.

كما تم ربطها داخل `flushPendingLiveApi()` بحيث أي تعديل على القوالب ينشر:

- snapshot القالب الفردي كما كان.
- snapshot البرنامج العام الجديد.

هذا يحافظ على التوافق مع الروابط القديمة ويضيف الرابط العام فقط.

### 3.3 بناء رابط OBS العام

تمت إضافة:

- `buildProgramOutputUrl()`
- `prepareProgramOutputUrl()`

الرابط الناتج يستخدم نفس shell query الخاص بـ OBS:

```text
?obs=1&rgev=obs-live-v3#/output/__program_output__
```

### 3.4 دعم مصفوفة overlays داخل LiveOutputView

في `App.tsx` أصبح `LiveOutputView` يدعم حالتين:

- قالب واحد: روابط `/output/{overlayId}` القديمة.
- مصفوفة قوالب: الرابط العام `/output/__program_output__`.

عند وصول مصفوفة، يتم تمرير كل overlay إلى `OverlayRenderer` بدل فلترة `isVisible` مبكرًا. هذا مهم لأن `OverlayRenderer` نفسه مسؤول عن:

- تشغيل دخول `IN`.
- تشغيل خروج `OUT`.
- تشغيل الصوت المرتبط بالانتقال.
- إخفاء القالب بعد نهاية animation.

لو تم فلترة القوالب قبل الرندر، كان من الممكن كسر صوت/حركة الخروج.

### 3.5 زر نسخ رابط OBS العام في Library

في `pages/Library.tsx` تمت إضافة زر:

```text
Program OBS
```

يظهر في تبويب `قوالبي`، وينسخ رابطًا واحدًا عامًا يعرض كل القوالب الحية داخل OBS.

زر `OBS URL` القديم داخل كل بطاقة بقي كما هو للتوافق أو للاستخدام الخاص.

---

## 4. الملفات المعدلة

- `services/syncManager.ts`
- `App.tsx`
- `pages/Library.tsx`
- `reports-ar/2026-05-28-program-obs-single-output-link.md`

---

## 5. ما لم يتم لمسه

لم يتم تعديل:

- `api/`
- `components/renderers/`
- `services/audioEngine.ts`
- `constants.ts`
- Player Intel V2
- Stream Deck
- template IDs
- ملفات صوتية
- secrets أو `.env`

كما لم تتم إضافة أي Vercel function جديدة.

---

## 6. التحقق

### lint

```text
npm run lint
Passed
```

### build

```text
npm run build
Passed
```

ملاحظة: ما زال تحذير حجم bundle الكبير موجودًا كما كان سابقًا:

```text
Some chunks are larger than 500 kB after minification
```

هذا ليس ناتجًا عن هذه المرحلة ويحتاج مرحلة performance/code splitting لاحقة.

### عدد Vercel functions

تم العد باستبعاد `api/_lib`:

```text
10 functions
```

العدد ما زال داخل الحد المطلوب `<= 12`.

---

## 7. اختبار المتصفح / OBS

لم يتم فتح المتصفح أو تشغيل dev server في هذه المرحلة احترامًا لتحذير المستخدم أن العرض المباشر مفتوح لديه، ولتجنب إغلاق أو تعطيل أي output مستخدم داخل OBS.

لذلك هذا التحقق لم يتم ادعاؤه كاختبار بصري/صوتي كامل.

### Manual QA المقترح

1. افتح التطبيق.
2. اذهب إلى `Library`.
3. افتح تبويب `قوالبي`.
4. اضغط `Program OBS`.
5. ضع الرابط المنسوخ في Browser Source واحد داخل OBS.
6. من Operator أو Editor:
   - نفذ `TAKE IN` على قالب.
   - تأكد أنه يظهر في نفس مصدر OBS.
   - نفذ `TAKE OUT`.
   - تأكد أن الخروج والصوت لا ينكسران.
7. شغّل قالبًا ثانيًا بدون تغيير مصدر OBS.
8. تأكد أن المصدر نفسه يعرض القالب الثاني.
9. جرّب رابط `OBS URL` القديم لقالب منفرد وتأكد أنه لا يزال يعمل.

---

## 8. المخاطر المتبقية

1. **تراكب أكثر من قالب حي في نفس الوقت**
   - الرابط العام يعرض كل القوالب التي حالتها LIVE.
   - هذا صحيح تقنيًا، لكن يحتاج سياسة تشغيل واضحة داخل Operator إذا كان المطلوب قالبًا واحدًا فقط في كل لحظة.

2. **أولوية الطبقات**
   - الترتيب الحالي يعتمد على ترتيب `currentState`.
   - إن احتجنا layer ordering احترافي، يجب أن يكون ذلك Phase منفصلة وليس hotfix سريع.

3. **اختبار OBS الفعلي**
   - لم يتم فتح OBS أو المتصفح يدويًا من هذا التنفيذ.
   - يجب تنفيذ checklist أعلاه قبل اعتبار المرحلة مثبتة بصريًا.

---

## 9. التوصية التالية

الأولوية التالية المقترحة:

1. تثبيت سياسة `Program Output` داخل Operator: هل يسمح بأكثر من قالب LIVE أم يتم إخراج السابق تلقائيًا؟
2. إضافة مؤشر صغير في Operator/Library يوضح أن `Program OBS` هو الرابط الموصى به للاستخدام اليومي.
3. مرحلة Visual QA على الرابط العام داخل متصفح فعلي عندما يسمح المستخدم بذلك، بدون المساس بعرض OBS المفتوح.

لا أنصح الآن بإعادة بناء نظام runtime أو audio؛ هذا hotfix محدود وهدفه حل كارثة تعدد روابط OBS فقط.
