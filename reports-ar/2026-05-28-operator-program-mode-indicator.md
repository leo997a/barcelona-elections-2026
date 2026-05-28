# تقرير مرحلة: مؤشر وضع Program داخل الأوبريتور

**التاريخ:** 2026-05-28  
**اسم المرحلة:** OPERATOR-PROGRAM-MODE-INDICATOR-003  
**نوع المرحلة:** UX polish / Operator clarity  
**النطاق:** توضيح هل رابط Program OBS يعمل بوضع `MULTI` أو `SINGLE` داخل شاشة Operator.

---

## 1. سبب المرحلة

بعد إضافة `Single Program Mode` أصبح لدى المستخدم وضعان:

- `MULTI`: يمكن أن يظهر أكثر من قالب LIVE داخل Program OBS.
- `SINGLE`: أي TAKE IN يخرج القوالب الأخرى ويبقي قالبًا واحدًا.

لكن العداد السابق كان يعرض فقط:

```text
PROGRAM {count}
```

وهذا لا يكفي أثناء التشغيل السريع، لأن المشغّل يحتاج أن يرى الوضع الحالي فورًا بدون استنتاجه من زر منفصل.

---

## 2. التشخيص

تم فحص `pages/Operator.tsx`:

- يوجد `liveOverlaysCount`.
- يوجد `singleProgramMode`.
- يوجد badge للعداد.
- يوجد زر `Single Program`.

النقص:

- لا يوجد label مباشر داخل badge يوضح الوضع الحالي.
- عنوان الـ tooltip كان عامًا ولا يشرح الفرق بين الوضعين.

---

## 3. ما تم تنفيذه

### 3.1 إضافة label داخل badge

أصبح badge البرنامج يعرض:

```text
PROGRAM 0  MULTI
PROGRAM 1  SINGLE
```

حسب الحالة الفعلية.

### 3.2 Tooltip أوضح

تمت إضافة نص مختلف حسب الوضع:

- في `SINGLE`:
  - يوضح أن TAKE IN يخرج القوالب الأخرى ويبقي قالبًا واحدًا.

- في `MULTI`:
  - يوضح أن Program OBS يسمح بعرض أكثر من قالب حي.

### 3.3 لا تغيير في المنطق

هذه المرحلة لم تضف منطق تشغيل جديد. هي فقط وضوح بصري وتشغيلي فوق المنطق الموجود.

---

## 4. الملفات المعدلة

- `pages/Operator.tsx`
- `reports-ar/2026-05-28-operator-program-mode-indicator.md`

---

## 5. ما لم يتم لمسه

لم يتم تعديل:

- `api/`
- `components/renderers/`
- `components/TemplateControlBar.tsx`
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
http://127.0.0.1:5195
```

تم اختبار المسار التالي من الواجهة نفسها:

1. فتح Library.
2. إضافة قالب.
3. الرجوع إلى Library.
4. فتح Operator من زر الأوبريتور.
5. التأكد من ظهور `MULTI`.
6. الضغط على `Single Program`.
7. التأكد من ظهور `SINGLE`.
8. التأكد من بقاء زر `Program OBS`.

نتيجة الاختبار:

```json
{
  "addCount": 61,
  "operatorButtonCount": 1,
  "multi": 1,
  "singleToggle": 1,
  "single": 1,
  "programButton": 1,
  "errorLogs": []
}
```

المعنى:

- الوضع `MULTI` ظهر.
- زر `Single Program` ظهر.
- بعد التفعيل ظهر `SINGLE`.
- زر `Program OBS` بقي ظاهرًا.
- لا توجد أخطاء console.

### تنظيف الاختبار

- حُذف ملف QA المؤقت.
- تم إغلاق dev server المؤقت على `5195`.

---

## 7. المخاطر المتبقية

لا توجد مخاطر runtime جديدة، لأن هذه المرحلة UI label فقط.

الملاحظة الوحيدة:

- النصوص `SINGLE/MULTI` إنجليزية لأنها مختصرة ومناسبة لمساحة شريط Operator.
- يمكن لاحقًا تعريبها إلى `واحد/متعدد` إذا أردنا واجهة عربية بالكامل.

---

## 8. التوصية التالية

الأولوية التالية:

1. الانتقال إلى مرحلة Stream Deck الفعلية:
   - إظهار Program OBS.
   - إظهار Single Program.
   - أزرار TAKE IN / TAKE OUT / Reset.
2. أو إضافة Manual QA checklist داخل التقرير الرئيسي للفريق الذي يستخدم OBS.

هذه المرحلة أغلقت نقص الوضوح داخل Operator قبل توسيع Stream Deck.
