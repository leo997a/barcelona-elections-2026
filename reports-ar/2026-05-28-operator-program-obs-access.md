# تقرير مرحلة: Program OBS داخل شاشة الأوبريتور

**التاريخ:** 2026-05-28  
**اسم المرحلة:** OPERATOR-PROGRAM-OBS-ACCESS-001  
**نوع المرحلة:** UX Hotfix / Operator workflow  
**النطاق:** جعل رابط OBS العام متاحًا من شاشة التشغيل نفسها، مع عداد واضح للقوالب الحية.

---

## 1. سبب المرحلة

بعد إضافة رابط OBS عام واحد:

```text
/output/__program_output__
```

كان الرابط متاحًا من Library فقط. هذا جيد أثناء الإعداد، لكنه غير كافٍ أثناء التشغيل اليومي، لأن المشغّل يكون غالبًا في شاشة Operator وليس Library.

المطلوب العملي:

- نسخ رابط Program OBS من شاشة Operator مباشرة.
- معرفة عدد القوالب التي ستظهر داخل هذا الرابط.
- عدم تغيير سلوك IN/OUT القديم.

---

## 2. التشخيص

تم فحص:

- `pages/Operator.tsx`
  - يحتوي TAKE IN / TAKE OUT.
  - يحتوي `TemplateControlBar`.
  - لا يحتوي زرًا مباشرًا لنسخ رابط Program OBS.
  - لا يعرض عدد القوالب الحية التي ستظهر في الرابط العام.

- `services/syncManager.ts`
  - يحتوي بالفعل `prepareProgramOutputUrl()`.
  - ينشر snapshot عام لكل القوالب.
  - لا يحتاج أي تعديل لهذه المرحلة.

القرار:

إضافة UX داخل Operator فقط، بدون تغيير runtime أو API.

---

## 3. ما تم تنفيذه

### 3.1 زر Program OBS داخل Operator

تمت إضافة زر:

```text
Program OBS
```

في شريط Operator العلوي.

الزر:

- يستدعي `syncManager.prepareProgramOutputUrl()`.
- ينسخ الرابط إلى Clipboard.
- يعطي feedback سريعًا `Copied`.

### 3.2 عداد Program

تمت إضافة badge:

```text
PROGRAM {count}
```

يعرض عدد القوالب التي حالتها `isVisible = true`.

هذا يساعد المشغّل على معرفة ماذا سيظهر داخل رابط OBS العام قبل أن يراجع OBS نفسه.

### 3.3 عدم تغيير السلوك القديم

لم يتم فرض Single Program Mode.

السبب:

- بعض البثوث تحتاج أكثر من قالب حي في نفس الوقت، مثل Ticker + Lower Third.
- تغيير السلوك الافتراضي إلى قالب واحد فقط قد يكسر استخدامات موجودة.

لذلك هذه المرحلة تضيف رؤية وتحكمًا أفضل، ولا تغيّر طريقة ظهور القوالب.

---

## 4. الملفات المعدلة

- `pages/Operator.tsx`
- `reports-ar/2026-05-28-operator-program-obs-access.md`

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

### lint الأولي

```text
npm run lint
Passed
```

### Browser QA

تم تشغيل Vite مؤقتًا على:

```text
http://127.0.0.1:5192
```

وتمت تجربة المسار من الواجهة نفسها:

1. فتح Library.
2. إضافة قالب من الكتالوج.
3. الرجوع إلى Library.
4. فتح Operator من زر الأوبريتور.
5. التحقق من ظهور زر `Program OBS`.
6. التحقق من ظهور عداد `PROGRAM 1` عندما يوجد قالب LIVE.

نتيجة الفحص:

```json
{
  "programButton": 1,
  "program1": 1,
  "program0": 0,
  "takeIn": 1,
  "errorLogs": []
}
```

المعنى:

- زر Program OBS ظهر مرة واحدة.
- عداد PROGRAM قرأ القوالب الحية بشكل صحيح.
- لا توجد أخطاء console.

### تنظيف الاختبار

- حُذف ملف QA المؤقت.
- تم إغلاق dev server المؤقت على `5192`.

---

## 7. المخاطر المتبقية

1. **لا يوجد Single Program Mode بعد**
   - النظام ما زال يسمح بأكثر من قالب LIVE في الوقت نفسه.
   - هذا مقصود حاليًا لتجنب كسر استخدامات التراكب.

2. **عداد Program لا يمنع التراكب**
   - هو يعرض الحالة فقط.
   - إذا أراد المستخدم وضع تشغيل يمنع التراكب، يجب تنفيذه كخيار واضح منفصل.

3. **Clipboard permission**
   - إذا منع المتصفح النسخ، يظهر alert بدل الفشل الصامت.

---

## 8. التوصية التالية

الأولوية التالية:

1. إضافة خيار اختياري `Single Program Mode` داخل Operator، يكون OFF افتراضيًا.
2. عند تفعيله فقط: TAKE IN لقالب يخرج القوالب الأخرى تلقائيًا.
3. إبقاء الوضع الحالي للأشخاص الذين يريدون Ticker + Lower Third أو أكثر من overlay في نفس الوقت.

لا أنصح بجعل Single Program Mode افتراضيًا الآن؛ الأفضل أن يكون اختيارًا واضحًا للمستخدم.
