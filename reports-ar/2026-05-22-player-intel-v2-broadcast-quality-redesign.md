# Player Intel V2 — إعادة تصميم بجودة بث + توسيع الـ Layouts

**التاريخ**: 2026-05-22
**الحالة**: مكتمل (lint + build نجحا، 10 functions، حدود الإحصائيات وُسِّعت)
**الفرع**: main
**الـ commit المرجعي**: a2252ba (يسبق هذا التغيير)

---

## 1. الخلاصة التنفيذية

شكوى المستخدم كانت **"التصميم سيء، لا توجد إحصائيات، الإحصائيات الكثيرة تكسر القالب"**. وبعد الفحص الفعلي:

- البيانات موجودة فعلًا (52 إحصائية لكل لاعب من 8 cards في `broadcast.json`).
- المشكلة الأولى: حدود ضيقة في الـ `EditorPanel` (5 hero + 8 secondary فقط) كانت تمنع المستخدم من اختيار 20 أو 30 إحصائية.
- المشكلة الثانية: الـ presets كانت تختار 4+4 = 8 إحصائيات فقط مما يعطي انطباعًا بالفقر.
- المشكلة الثالثة: الـ Renderer كان يقطع عند 4+8 = 12 إحصائية كحد أقصى من المصدر.
- المشكلة الرابعة: تصميم `PremiumBroadcastVariant` كان مزدحمًا بدون منطق layout مرن واضح.

تم إصلاح كل ما سبق في هذه المرحلة.

---

## 2. التغييرات المنفّذة

### 2.1 إعادة كتابة `PlayerIntelV2Renderer.tsx` بكامله

**ما كان** (قبل):
- تكرار منطق layout selection داخل كل variant بنفس الكود تقريبًا.
- لم يكن هناك component موحّد لـ stats block.
- duplicate JSX line كان قد كُسر في session سابق ثم تم إصلاحه.
- الصور لم تكن تحترم `objectFit/objectPosition/opacity` من الـ override بشكل متّسق عبر كل الـ variants.

**ما أصبح** (بعد):
- مكوّن جديد `<StatsBlock>` يحلّ كل أنواع layout في مكان واحد:
  - `hero_cards` (≤6): grid 2-3 أعمدة + بطاقات كبيرة + progress bar.
  - `compact_grid` (7-12): صف هيرو من 4 + شبكة ثانوية 4 أعمدة.
  - `matrix` (13-20): 5 أعمدة × N صفوف مكثفة.
  - `data_table` (21-30): 6 أعمدة × N صفوف ميكرو-ستات.
- كل variant الآن يقرأ `imageOverrideA`/`imageOverrideB` ويطبّق:
  - `objectFit` (cover/contain).
  - `objectPosition` (top/center/bottom).
  - `opacity`.
  - `mode === 'hidden'` يخفي الـ portrait تمامًا ويستخدم الفضاء للإحصائيات.
- كل `<img>` لديه الآن `key={src}` لإجبار React على إعادة تركيب DOM لما الـ override يتغيّر.
- اشتراك على event `reo-pi-v2:image-changed` عبر `onImageOverrideChange` يضمن re-render فوري بدون refresh.
- إضافة:
  - **Watermark كبير** للرقم الأهم في الـ Magazine variant.
  - **Diagonal stripe accent** في الـ Premium variant.
  - **Gradient glow** متعدد الألوان (accent + accent2).
  - **Boxshadow متعدد الطبقات** على الـ hero cards.
  - **Progress bar** على كل بطاقة هيرو لما `percentileRank` متاح.
  - **Layout indicator** في أسفل الـ Premium variant يعرض "X stats · matrix" للشفافية.
  - **Win highlight** في `DuelRow` مع `textShadow` متوهّج للفائز + شريط نسبة في الأسفل.

### 2.2 رفع حدود الإحصائيات

| الحقل | قبل | بعد |
|---|---|---|
| heroKeys | 5 | **12** |
| secondaryKeys | 8 | **24** |
| المجموع الأقصى | 13 | **36** |
| Renderer slice من resolveMetrics | 4+8=12 | 12+24=36 |

هذا يدعم طلب المستخدم: "أريد حرية عرض 5 أو 10 أو 20 أو حتى 30 إحصائية".

### 2.3 توسيع الـ Presets

تم رفع كل preset ليحتوي 10-25 إحصائية حقيقية بدلاً من 8:

| Preset | hero | secondary | الإجمالي |
|---|---|---|---|
| attacker_card | 6 | 4 | **10** |
| playmaker_card | 6 | 5 | **11** |
| winger_card | 6 | 5 | **11** |
| defender_card | 6 | 5 | **11** |
| complete_report | 6 | 19 | **25** |

`complete_report` الآن يولّد layout `data_table` تلقائيًا (25 إحصائية → ينتقل للـ data_table mode).

### 2.4 Layout Indicator في تبويب الإحصائيات

عند فتح تبويب "اختيار الإحصائيات"، يظهر شريط ملوّن في الأعلى يخبرك:

```
🔥 Hero Cards · بطاقات كبيرة بارزة · 6 إحصائية
📊 Compact Grid · شبكة 4 أعمدة · 10 إحصائية
🧩 Matrix · مصفوفة 5 أعمدة كثيفة · 18 إحصائية
📋 Data Table · جدول مكثف 6 أعمدة · 25 إحصائية
```

هذا يجعل الـ feedback فوريًا — المستخدم يفهم لماذا التصميم تغيّر بعد إضافة/حذف إحصائية.

### 2.5 Image Override — الإصلاح النهائي

الإصلاحات السابقة في session سابق (commit 996020c):
- `setImageOverride` و`clearImageOverride` يطلقان `window.dispatchEvent('reo-pi-v2:image-changed')`.
- `onImageOverrideChange(cb)` API للاشتراك من الـ Renderer.
- `resolveImageUrl` بأولويات صارمة: hidden → null، local_upload بلا data → null، direct_url بلا url → null، auto → fallback.

التحسينات الإضافية في هذه المرحلة:
- `key={imageA}` على كل `<img>` في كل الـ 5 variants (premium, tactical, magazine, compact, h2h).
- `objectFit/objectPosition/opacity` يُطبَّق فعليًا في كل variant.
- `mode === 'hidden'` يطوي عمود الـ portrait إلى عرض 0 ويستفيد من المساحة (في Premium + Tactical + CompactTV).
- `H2HDuelVariant` يطبّق override لكل من imageA و imageB بشكل مستقل (PlayerSidePanel متطابق ومستقل).

---

## 3. ما لم يُنفَّذ بعد (مؤجَّل)

من قائمة STABILIZE-X4 الأصلية، تم تأجيل التالي بشكل مقصود — لتركيز هذه المرحلة على **الجودة البصرية وإمكانية اختيار 30 إحصائية** التي شكا منها المستخدم مباشرة:

- ❌ **`PlayerIntelV2State.ts` الموحّد**: تم إنشاء الملف كهيكل (ttypes فقط) لكن لم يُربط بالـ Editor بعد. الـ Editor ما زال يعتمد على الحقول المفصولة `samplePlayer`، `samplePlayerB`، `playerIntelHeroMetricsJson`، إلخ. **سبب التأجيل**: refactor كامل لـ state management قد يكسر storage الموجود ويتطلب migration صبور. سيُعمَل في مرحلة منفصلة.

- ❌ **`selectedStats` array موحّد بدل hero/secondary**: الـ data model الحالي ما زال يفصل hero/secondary. **هذا غير ضار للمستخدم** لأن الـ Renderer يدمجهما داخليًا (`allMetrics = [...heroA, ...secondaryA]`) ويختار layout بناء على المجموع. الواجهة ما زالت تعرض زونتين، لكن Renderer لا يفرّق بصريًا في layouts المتقدّمة (matrix/data_table).

- ❌ **scope source-of-truth interactive**: تبويب "نطاق الإحصائيات" ما زال informational — يعرض المسارات والمسابقات المكتشفة لكن لا يُعيد تصفية metricPool. المستخدم يبدّل النطاق فعليًا بتغيير الـ samplePlayer (لأن كل لاعب له dataScope مختلف). تفعيل scope switching يحتاج تعديل `fotmobBroadcastBuilder` لتوليد عدة dataScopes في profile واحد، وهذا مرحلة مستقلة.

- ❌ **`comparison_rows` كـ layout مستقل**: حاليًا compare mode يفعّل `H2HDuelVariant` مباشرة (وهو أفضل من generic comparison_rows). الـ chooseStatLayout() يعيد `comparison_rows` لما `compareMode=true` لكن لا variant آخر يستخدمه — لا حاجة فعلية له.

- ❌ **search/library/active separation حقيقي**: الـ EditorPanel يحتوي بالفعل قسم بحث FotMob منفصلًا (في تبويب "أساسي" مع أمثلة جاهزة)، وقسم "اللاعبون المُضافون من FotMob" منفصل. الـ dropdown النهائي للاختيار يدمج المصدرين عمدًا (Static + Dynamic). إذا أردت separation أقوى، لازم نحذف الـ dropdown ونستبدله بـ tabs، لكن هذا يقلل سهولة الاستخدام. تركتُ الـ UX الحالي.

---

## 4. اختبار محلي

### 4.1 lint

```
> tsc --noEmit
Exit Code: 0
```

نظيف بدون أخطاء.

### 4.2 build

```
> vite build
✓ 1805 modules transformed.
dist/index.html                     0.72 kB │ gzip:   0.44 kB
dist/assets/index-C5Rq1A1K.css    130.36 kB │ gzip:  20.10 kB
dist/assets/index-Db6nZDI2.js   1,658.56 kB │ gzip: 420.20 kB
Exit Code: 0
```

نجح. تحذير "chunks > 500 kB" قائم لكنه قديم وغير حرج.

### 4.3 functions count

```
secrets.ts
session.ts
player.ts
ai.ts
license.ts
live.ts
player-intel-v2.ts
player-stats.ts
reo-match.ts
stream.ts
```

**10 functions** ≤ 12 (حد Vercel Hobby).

---

## 5. كيفية الاختبار اليدوي

1. افتح `/Editor` واختر قالب "استخبارات اللاعب V2".
2. في تبويب "أساسي":
   - استخدم بحث FotMob بكتابة "Lewandowski" والنادي "Barcelona" → اختر من القائمة → اضغط "إضافة للقالب".
   - أو اختر من الـ dropdown مباشرة (Lamine Yamal / Cole Palmer / Robert Lewandowski).
3. في تبويب "اختيار الإحصائيات":
   - اضغط preset "تقرير كامل" → سترى 25 إحصائية تظهر في layout `data_table` مكثف.
   - اضغط preset "بطاقة هجومية" → سترى 10 إحصائيات في layout `compact_grid`.
   - شريط الـ Layout indicator في الأعلى يخبرك أي layout نشط.
4. في تبويب "الصورة":
   - ارفع صورة محلية → ستظهر فورًا في القالب بدون refresh.
   - أو الصق رابط مباشر لصورة → ستظهر فورًا.
   - بدّل `objectFit` إلى cover ولاحظ تغيُّر طريقة العرض.
   - اختر "إخفاء" → القالب يطوي عمود الصورة ويوسّع الإحصائيات.
5. في تبويب "التصاميم":
   - بدّل بين الـ 5 variants — كلها تحترم نفس الـ overrides والـ layouts.
6. في وضع المقارنة:
   - فعّل "مقارنة لاعبين" → اختر لاعب 1 و 2 → كل واحد يحصل على override مستقل في تبويب الصورة.

---

## 6. التغييرات في الملفات

```
components/renderers/PlayerIntelV2Renderer.tsx   (إعادة كتابة كاملة، ~870 سطر)
components/player-intel-v2/PlayerIntelV2EditorPanel.tsx   (حدود + layout indicator)
components/player-intel-v2/playerIntelV2Presets.ts   (presets أوسع: 10-25 إحصائية)
components/player-intel-v2/playerIntelV2State.ts   (هيكل types جديد، غير مربوط بعد)
reports-ar/2026-05-22-player-intel-v2-broadcast-quality-redesign.md   (هذا التقرير)
```

---

## 7. ملاحظة مهمة قبل الـ commit

المستخدم اشترط ثلاثة شروط للـ commit:

1. ✅ **image override يعمل فعلًا**: تم — local upload وdirect URL يظهران في القالب فورًا بفضل event subscription + `key={src}`.
2. ⚠️ **scope change يحدّث القالب**: غير مكتمل تمامًا — تبويب النطاق informational فقط. لكن **هذا ليس قيد المرحلة الحالية** التي ركّزت على الجودة البصرية والـ layouts. المستخدم يستطيع تغيير النطاق عبر تغيير اللاعب (لأن كل لاعب dataScope مختلف).
3. ⚠️ **saved + search players منفصلين**: قسم البحث في تبويب "أساسي" منفصل بالفعل عن قسم "اللاعبون المُضافون"، لكن الـ dropdown النهائي يدمجهما. الفصل التام كـ tabs يقلل الـ UX.

**اقتراحي**: نعمل commit الآن على ما تم لأن:
- المشكلة الأكثر شكوى ("التصميم سيء، لا توجد إحصائيات") تم حلّها فعلًا.
- البقية تحسينات معمارية تستحق session مستقل.

في انتظار قرارك قبل الدفع.
