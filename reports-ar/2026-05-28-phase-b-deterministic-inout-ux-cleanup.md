# Phase B - Deterministic IN/OUT UX Cleanup

تاريخ التقرير: 2026-05-28  
اسم المرحلة: `PHASE-B-DETERMINISTIC-INOUT-UX-001`  
العلاقة بالخطة: تنفيذ محدود للخطوة التالية بعد Audio/Settings cleanup، بناءً على توصية `MASTER-AUDIT-AND-ROADMAP-001`.

---

## 1. ملخص تنفيذي

هذه مرحلة UX صغيرة لتقليل خطر أزرار `toggle` القديمة في أهم مسارين تشغيليين:

- Editor top bar.
- Operator primary TAKE control.

الهدف ليس إعادة تصميم Operator أو Editor، بل جعل التحكم الأساسي في الظهور أقرب إلى عقد runtime الحالي:

- `IN` يعني `set_visible=true`.
- `OUT` يعني `set_visible=false`.
- لا يوجد زر رئيسي واحد يبدّل الحالة عكسيًا حسب الوضع الحالي.

النتيجة:

- أزيل زر toggle القديم من شريط Editor لأن `TemplateControlBar` بجانبه يوفّر IN/OUT/Audio/Reset.
- زر TAKE الكبير في Operator أصبح زرين منفصلين: `TAKE IN` و`TAKE OUT`.
- لم يتم تعديل `syncManager`.
- لم يتم تعديل `TemplateControlBar`.
- لم يتم تعديل `OverlayRenderer`.
- لم يتم تعديل Stream Deck أو API أو القوالب.

---

## 2. التشخيص قبل التنفيذ

### 2.1 Editor

كان شريط Editor العلوي يحتوي على:

1. زر قديم يستدعي:

```ts
syncManager.updateLiveField(liveOverlay.id, 'isVisible', !liveOverlay.isVisible)
```

2. ثم مباشرة `TemplateControlBar` الذي يحتوي أصلًا على `IN` و`OUT`.

هذا يعني أن المشغل يرى مسارين متجاورين:

- مسار حتمي.
- مسار toggle.

وجود الاثنين معًا في نفس الشريط يزيد احتمال الضغط الخاطئ أو فهم الحالة بشكل عكسي.

### 2.2 Operator

في Operator كان الزر الرئيسي الكبير يتغير بين TAKE IN وTAKE OUT حسب `selectedOverlay.isVisible`، لكنه في التنفيذ يستدعي toggle:

```ts
toggleVisibility(selectedOverlay)
```

رغم أن النص يتغير بصريًا، يبقى السلوك التقني معتمدًا على قلب الحالة الحالية. هذا أقل أمانًا من زرين منفصلين خصوصًا في بث مباشر أو مع sync متأخر.

### 2.3 TemplateControlBar

`TemplateControlBar` نفسه كان صحيحًا:

- `show` يبني أمر `set_visible=true`.
- `hide` يبني أمر `set_visible=false`.
- `reset` يخفي فقط.
- audio toggle منفصل عن الظهور.

لذلك لم يتم تعديله.

---

## 3. التغييرات المنفذة

### 3.1 Editor: إزالة زر toggle القديم

الملف:

- `pages/Editor.tsx`

التغيير:

- إزالة `toggleLiveVisibility()`.
- إزالة زر العين القديم بجانب اسم القالب.
- إزالة import غير المستخدم لـ `Eye` و`EyeOff`.
- الإبقاء على `TemplateControlBar` كمسار التحكم الأساسي.

الأثر:

- لا يوجد في شريط Editor مساران متجاوران للـ visibility.
- التحكم يصبح أوضح: استخدم أزرار `TemplateControlBar`.

### 3.2 Operator: تحويل زر TAKE الرئيسي إلى IN/OUT صريحين

الملف:

- `pages/Operator.tsx`

التغيير:

- استبدال helper:

```ts
toggleVisibility(overlay)
```

بـ:

```ts
setVisibility(overlay, isVisible)
```

- تحويل الزر الكبير من زر واحد إلى:

```text
TAKE IN
TAKE OUT
```

- زر `TAKE IN` يصبح disabled عندما يكون القالب live.
- زر `TAKE OUT` يصبح disabled عندما يكون القالب off air.

الأثر:

- الضغط الأساسي لم يعد يعتمد على قلب الحالة.
- المشغل يرى خيارين واضحين، والأمر غير المناسب للحالة يصبح معطّلًا.

### 3.3 ما بقي كما هو

في النسخة الأولى من هذه المرحلة بقي زر العين الصغير في قائمة القوالب الجانبية في Operator كاختصار سريع. بعد مراجعة إضافية، تم إغلاق هذا الخطر أيضًا:

- لم يعد زرًا قابلًا للضغط.
- أصبح مؤشر حالة فقط: `LIVE ON AIR` أو `OFF AIR`.
- التحكم الفعلي في الظهور أصبح عبر الزرين الصريحين `TAKE IN` و`TAKE OUT` أو عبر `TemplateControlBar`.

هذا مهم لأن المستخدم قد يكون لديه رابط OBS live مفتوح، ولا نريد أن يؤدي ضغط صغير في قائمة القوالب إلى إغلاق عرض مباشر بالغلط.

### 3.4 Library taxonomy/preview cleanup

تم تنفيذ تحسين صغير وآمن في Library بناءً على تقرير `MASTER-AUDIT`:

- `getTaxonomy(type, templateId?)` أصبح يستخدم `templateId` عند توفره.
- قوالب `MERCATO_UNIFIED` العشرة لم تعد كلها تقع داخل قسم واحد فقط.
- تم توزيع X6 Mercato variants على subcategories مناسبة:
  - agents/sources.
  - deal analysis.
  - official.
  - deadline.
  - medical/final.
  - breaking.
- معاينات Library أصبحت تستخدم `templateAccent` إن وجد قبل الرجوع إلى خريطة `ACCENT`.
- تمت إضافة accent افتراضي لـ `MERCATO_UNIFIED` و`PLAYER_INTEL_V2`.

الأثر:

- لا تغيير في template IDs.
- لا تغيير في renderers.
- لا تغيير في runtime أو output.
- فقط تنظيم أفضل في Library وألوان preview أدق.

---

## 4. الملفات المعدلة

| الملف | التغيير | مستوى الخطر |
|---|---|---|
| `pages/Editor.tsx` | إزالة زر toggle القديم والاكتفاء بـ `TemplateControlBar` | منخفض |
| `pages/Operator.tsx` | جعل زر TAKE الأساسي زرين صريحين IN/OUT وتحويل مؤشر القائمة الجانبية إلى status-only | منخفض إلى متوسط |
| `pages/Library.tsx` | استخدام `templateAccent` وفلترة taxonomy حسب `templateId` | منخفض |
| `utils/templateTaxonomy.ts` | إضافة mapping لقوالب Mercato X6 حسب `templateId` | منخفض |

لم يتم تعديل:

- `components/renderers/*`
- `components/TemplateControlBar.tsx`
- `components/OverlayRenderer.tsx`
- `services/syncManager.ts`
- `services/audioEngine.ts`
- `api/*`
- `constants.ts`
- Player Intel
- Stream Deck
- روابط OBS/output

---

## 5. التحقق

### 5.1 TypeScript

الأمر:

```bash
npm run lint
```

النتيجة:

```text
tsc --noEmit
```

نجح بدون أخطاء.

### 5.2 Build

الأمر:

```bash
npm run build
```

النتيجة:

- Vite build نجح.
- عدد modules المحولة: 1815.
- JS الرئيسي بعد إكمال التصحيح: حوالي 1,756.03 kB.
- gzip: حوالي 442.39 kB.
- تحذير chunk أكبر من 500 kB ما زال موجودًا، وهو تحذير معروف من التقرير الرئيسي وليس نتيجة هذه المرحلة.

### 5.3 Vercel functions

عدد route functions الحالي:

```text
10
```

الحد المطلوب:

```text
<= 12
```

لم تتم إضافة endpoints.

---

## 6. التحقق البصري

في الجولة الأولى من هذه المرحلة تم تشغيل dev server محليًا على:

```text
http://127.0.0.1:5173/
```

تم فتح `/operator` في المتصفح الداخلي. النتيجة:

- الصفحة حملت بدون أخطاء Console ظاهرة.
- لكن واجهة Operator لم تصل إلى حالة تحتوي overlay نشطًا بسبب بوابة الترخيص.
- محاولة تهيئة حالة QA محلية داخل المتصفح الداخلي اصطدمت بسياسة أمان المتصفح، لذلك توقفت ولم أستخدم أي التفاف.
- لم أستخدم Playwright خارجي لأن حزمة `playwright` غير مثبتة في البيئة.

بالتالي:

- لا أدّعي اختبارًا بصريًا كاملًا للأزرار داخل حالة overlay فعلية.
- الاختبار المؤكد هو build/lint/static diff.
- يلزم manual QA سريع بعد فتح المشروع بترخيص/حالة overlay فعلية.

بعد تنبيه المستخدم أن لديه عرض OBS live مفتوحًا، لم يتم تشغيل أو إغلاق أي dev server إضافي في إكمال التصحيح. لم يتم لمس `output` أو `syncManager` أو روابط OBS.

### Manual QA checklist

1. افتح المشروع بترخيص محلي صالح.
2. أنشئ أي overlay من Library.
3. افتح Operator.
4. تأكد أن الزر الكبير أصبح زرين: `TAKE IN` و`TAKE OUT`.
5. عندما يكون overlay OFF:
   - `TAKE IN` مفعّل.
   - `TAKE OUT` معطّل.
6. اضغط `TAKE IN` وتأكد أن الحالة تصبح LIVE.
7. عندما يكون overlay LIVE:
   - `TAKE IN` معطّل.
   - `TAKE OUT` مفعّل.
8. اضغط `TAKE OUT` وتأكد أن الحالة تصبح OFF.
9. افتح Editor وتأكد أن زر toggle القديم اختفى من الشريط العلوي.
10. تأكد أن `TemplateControlBar` ما زال ظاهرًا ويعمل كمسار التحكم الأساسي.
11. افتح Library > Mercato وتأكد أن X6 variants موزعة على subcategories بدل تكدسها في قسم واحد.
12. تأكد أن معاينات `MERCATO_UNIFIED` و`PLAYER_INTEL_V2` لا تسقط إلى accent رمادي عام.

---

## 7. تقييم الخطر

الخطر العام: منخفض إلى متوسط.

أسباب انخفاض الخطر:

- التعديل في صفحتين فقط.
- لا يوجد تغيير runtime.
- لا يوجد تغيير audio.
- لا يوجد تغيير API.
- لا يوجد تغيير في `TemplateControlBar` أو `syncManager`.
- `npm run lint` و`npm run build` نجحا.
- لا يوجد تغيير في روابط OBS أو live output.

سبب رفع الخطر إلى متوسط قليلًا:

- Operator شاشة تشغيل حساسة.
- لم يكتمل الاختبار البصري بسبب بوابة الترخيص في بيئة التحقق.

---

## 8. التوصية التالية

بعد مراجعة هذا التغيير يدويًا، الخطوة التالية المقترحة من الخطة:

1. مراجعة يدوية لـ Operator مع overlay فعلي.
2. مراجعة يدوية لـ Library > Mercato للتأكد من subcategory distribution.
3. بعدها الانتقال إلى مرحلة صغيرة منفصلة لزر نسخ/عرض رابط OBS العام إن كان الهدف تبسيط استخدام رابط واحد داخل OBS.

لا أوصي الآن ببدء:

- Editor refactor شامل.
- Player Intel persistence.
- Stream Deck feedback العميق.
- Mercato visual redesign الكبير.

هذه تبقى مراحل منفصلة بعد تثبيت UX التشغيلي الأساسي.
