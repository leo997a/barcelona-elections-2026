# تقرير مرحلة: Single Program Mode داخل الأوبريتور

**التاريخ:** 2026-05-28  
**اسم المرحلة:** OPERATOR-SINGLE-PROGRAM-MODE-002  
**نوع المرحلة:** Operator UX / Runtime policy  
**النطاق:** إضافة وضع اختياري يمنع تراكم القوالب الحية عند استخدام Program OBS، بدون تغيير السلوك الافتراضي.

---

## 1. سبب المرحلة

بعد إضافة رابط `Program OBS` العام داخل Operator، بقي سؤال تشغيلي مهم:

هل يجب أن يسمح البرنامج بأكثر من قالب LIVE في نفس الوقت، أم يخرج السابق تلقائيًا عند إدخال قالب جديد؟

الجواب الآمن:

- لا نغيّر السلوك الافتراضي، لأن بعض البثوث تحتاج أكثر من overlay في نفس الوقت.
- نضيف وضعًا اختياريًا اسمه `Single Program`.
- يكون OFF افتراضيًا.
- عند تفعيله فقط، أي `TAKE IN` يخرج القوالب الأخرى ثم يدخل القالب الحالي.

---

## 2. التشخيص

تم فحص:

- `pages/Operator.tsx`
  - الزر الكبير `TAKE IN` كان يستدعي `setVisibility(selectedOverlay, true)`.
  - `TAKE OUT` كان يستدعي `setVisibility(selectedOverlay, false)`.
  - زر `Program OBS` والعداد كانا موجودين من المرحلة السابقة.

- `components/TemplateControlBar.tsx`
  - يحتوي IN/OUT/Reset مستقلين.
  - كان يرسل أوامر مباشرة عبر `syncManager.sendCommand`.
  - لو أضفنا Single Program للزر الكبير فقط، كان شريط التحكم الصغير سيتجاوز السياسة الجديدة.

القرار:

توسيع `TemplateControlBar` اختياريًا ليقبل overrides من المضيف، بدون تغيير سلوكه الافتراضي في Editor أو أي مكان آخر.

---

## 3. ما تم تنفيذه

### 3.1 حالة Single Program محفوظة محليًا

في `pages/Operator.tsx` تمت إضافة:

```ts
rge_operator_single_program_mode
```

القيمة تحفظ في `localStorage`:

- `1` = مفعل.
- `0` أو غير موجود = غير مفعل.

الوضع الافتراضي OFF.

### 3.2 زر Toggle داخل Operator

تمت إضافة زر:

```text
Single Program
```

بشكل toggle واضح في الشريط العلوي.

عند التفعيل:

- يتغير لون الزر.
- يصبح واضحًا أن `TAKE IN` سيعمل كسياسة برنامج واحد.

### 3.3 منطق TAKE IN الجديد

تمت إضافة:

```ts
takeInOverlay(overlay)
```

إذا كان `Single Program` مفعلًا:

1. يمر على كل القوالب.
2. أي قالب آخر `isVisible = true` يتم إخراجه.
3. ثم يدخل القالب الحالي.

إذا كان غير مفعل:

يعمل السلوك القديم كما هو.

### 3.4 ربط TemplateControlBar بنفس السياسة

تم توسيع `components/TemplateControlBar.tsx` بإضافات اختيارية:

- `onShow`
- `onHide`
- `onReset`
- `allowShowWhenLive`

السلوك الافتراضي لم يتغير. إذا لم يمرر المضيف هذه props، يبقى الشريط يستخدم `syncManager.sendCommand` كما كان.

في Operator فقط، تم تمرير:

- `onShow={() => takeInOverlay(selectedOverlay)}`
- `onHide={() => takeOutOverlay(selectedOverlay)}`
- `onReset={() => takeOutOverlay(selectedOverlay)}`

هذا يمنع وجود مسارين مختلفين لـ IN/OUT داخل Operator.

### 3.5 تنظيف حالة "القالب الحالي حي لكن يوجد أكثر من قالب حي"

إذا كان القالب المحدد Live بالفعل وكان `Single Program` مفعلًا ويوجد أكثر من قالب Live، يسمح زر IN بتنظيف البرنامج وإخراج البقية.

---

## 4. الملفات المعدلة

- `pages/Operator.tsx`
- `components/TemplateControlBar.tsx`
- `reports-ar/2026-05-28-operator-single-program-mode.md`

---

## 5. ما لم يتم لمسه

لم يتم تعديل:

- `api/`
- `components/renderers/`
- `services/audioEngine.ts`
- `services/syncManager.ts`
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

### Browser QA

تم تشغيل Vite مؤقتًا على:

```text
http://127.0.0.1:5194
```

تم اختبار السيناريو التالي:

1. قالب أول LIVE.
2. قالب ثان OFF.
3. `Single Program` مفعل.
4. اختيار القالب الثاني.
5. الضغط على `TAKE IN`.

النتيجة:

```json
{
  "spNextLocatorCount": 1,
  "spTakeInLocatorCount": 1,
  "spProgramOneFinal": 1,
  "spProgramTwoFinal": 0,
  "hasNextLiveHeading": true,
  "errorLogs": []
}
```

المعنى:

- القالب الثاني دخل.
- العداد بقي `PROGRAM 1`.
- لم يحدث تراكم إلى `PROGRAM 2`.
- لا توجد أخطاء console.

### تنظيف الاختبار

- حُذف ملف QA المؤقت.
- تم إغلاق dev server المؤقت على `5194`.

---

## 7. المخاطر المتبقية

1. **هذا الوضع لا يغير السلوك الافتراضي**
   - وهذا مقصود.
   - المستخدم يجب أن يفعّله عندما يريد برنامجًا واحدًا فقط.

2. **الوضع محفوظ محليًا**
   - كل متصفح/استوديو يحتفظ بخياره محليًا.
   - لا يوجد sync cloud لهذا الإعداد في هذه المرحلة.

3. **إخراج القوالب الأخرى يعني تشغيل OUT**
   - هذا مناسب للبث غالبًا.
   - إذا أراد المستخدم cut فوري بدون OUT لاحقًا، يحتاج خيارًا منفصلًا.

---

## 8. التوصية التالية

الخطوة التالية المقترحة:

1. إضافة مؤشر أو تلميح صغير بجانب `PROGRAM {count}` يوضح هل الوضع Multi أو Single.
2. بعد ذلك يمكن الانتقال إلى Stream Deck: أزرار `Program OBS`, `Single Program`, `TAKE IN`, `TAKE OUT`, و`Reset`.
3. لا أنصح بتعديل runtime/audio الآن؛ هذه المرحلة كافية لضبط التشغيل اليومي داخل Operator.
