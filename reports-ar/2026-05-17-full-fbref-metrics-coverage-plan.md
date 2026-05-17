# خطة تغطية FBref الكاملة لمختبر إحصائيات اللاعبين

**التاريخ:** 2026-05-17  
**النطاق:** `deploy/reo-datafootball-worker` + Player Stats Lab لاحقًا

## لماذا `standard` وحده غير كافٍ؟

ملف `fbref-standard-2025-26.json` ممتاز كبداية لأنه يعطي قاعدة اللاعبين الأساسية مثل الاسم، الفريق، المركز، الدقائق، الأهداف، الأسيست وبعض أرقام Per90. لكنه لا يمثل كل بيانات FBref. إذا اعتمدنا عليه وحده فسنقع في أخطاء منتجية واضحة:

- لا توجد تفاصيل التسديد المتقدمة مثل `Shots` و`Shots on Target` إلا من `shooting`.
- لا توجد التمريرات المفتاحية، التمريرات للثلث الأخير، ودقة التمرير التفصيلية إلا من `passing`.
- لا توجد صناعة التسديد/الأهداف إلا من `gca`.
- لا توجد الافتكاكات، الاعتراضات، البلوكات والتشتيت إلا من `defense`.
- لا توجد المراوغة، اللمسات، حمل الكرة والتقدم بالكرة إلا من `possession`.
- لا توجد أنواع التمرير مثل العرضيات والتمريرات البينية إلا من `pass_types`.
- لا توجد تفاصيل وقت اللعب والمشاركات الموسعة إلا من `playing_time`.
- لا توجد الالتحامات والأخطاء وبعض الانضباط التفصيلي إلا من `misc`.
- لا توجد إحصائيات الحراسة إلا من `keeper` ويفضل `keeper_adv` إذا كان مدعومًا.

لذلك تم اعتماد هدف **Full FBref Metrics Coverage** بدل اعتبار `standard` تغطية كاملة.

## مصفوفة التغطية

تمت إضافة ملف:

`deploy/reo-datafootball-worker/metrics_coverage.json`

هذا الملف يعرّف كل metric نريد دعمه ويربطه بـ:

- **label / labelAr:** الاسم الإنجليزي والعربي.
- **statGroup:** المجموعة المطلوبة في FBref.
- **sourceColumn:** اسم العمود بعد فحص المخرجات الحقيقية قدر الإمكان، مع الاعتماد النهائي على `columns-manifest.json`.
- **category:** تصنيف الواجهة مثل الهجوم، التسديد، التمرير، الدفاع، الحراسة.

## مراحل جلب Stat Groups

### المرحلة الأولى

- `standard`

### المرحلة الثانية

- `shooting`
- `passing`
- `gca`

### المرحلة الثالثة

- `defense`
- `possession`
- `pass_types`

### المرحلة الرابعة

- `playing_time`
- `misc`
- `keeper`
- `keeper_adv` إذا كان متاحًا دون ضغط على FBref

## نوع الإحصائيات من كل مجموعة

- **standard:** الأهداف، الأسيست، البطاقات الأساسية، الدقائق الأساسية، بعض Per90.
- **shooting:** التسديدات، التسديدات على المرمى، دقة التسديد، التسديد لكل 90.
- **passing:** إجمالي التمرير، دقة التمرير، التمريرات المفتاحية، التمريرات التقدمية.
- **gca:** Shot-Creating Actions و Goal-Creating Actions.
- **defense:** افتكاكات، بلوكات، اعتراضات، تشتيت.
- **possession:** لمسات، مراوغات، حمل الكرة، حمل تقدمي.
- **pass_types:** عرضيات، تمريرات بينية، أنواع التمرير.
- **playing_time:** مشاركات، أساسي/بديل، دقائق وتوزيع وقت اللعب.
- **misc:** أخطاء، التحامات هوائية، انضباط ومؤشرات مختلطة.
- **keeper / keeper_adv:** تصديات، شباك نظيفة، PSxG ومؤشرات حراسة متقدمة عند توفرها.

## كيف نتعامل مع Partial Coverage؟

تم تعديل منطق التغطية بحيث يكون النجاح نوعين:

1. **Valid partial cache:** مقبول للرفع والاستخدام إذا كان هناك ملف واحد صحيح على الأقل، لكنه يظهر تحذيرًا واضحًا.
2. **Full or near full coverage:** لا يظهر إلا عند توفر كل المجموعات المطلوبة.

`last_updated.json` يجب أن يوضح:

```json
{
  "ok": true,
  "coverage": "partial",
  "availableStatGroups": ["standard"],
  "missingStatGroups": ["shooting", "passing", "gca", "defense", "possession", "pass_types", "playing_time", "misc", "keeper"],
  "warning": "Only partial FBref stat coverage is available. Advanced metrics may be unavailable."
}
```

## كيف لا نخدع القالب بأرقام غير موجودة؟

القاعدة الجديدة:

- لا نعرض رقمًا تجريبيًا عند غياب metric.
- لا نقول إن القالب يدعم `passing` أو `defense` أو `shooting` إذا ملفات هذه المجموعات غير موجودة وصحيحة.
- لا يربط `player-stats-bridge` أي metric إلا بعد التأكد من وجود `requiredStatGroup` في `availableStatGroups`.
- إذا المجموعة غير موجودة، يرجع bridge في Phase B لاحقًا:

```json
{
  "status": "unavailable",
  "reason": "stat_group_not_available",
  "requiredStatGroup": "shooting",
  "availableStatGroups": ["standard"]
}
```

## كيف يطلب Player Stats Lab metrics حسب المتاح؟

1. يقرأ `metrics_coverage.json` لمعرفة المجموعة المطلوبة لكل metric.
2. يقرأ `.cache/fbref/last_updated.json` لمعرفة `availableStatGroups`.
3. يقرأ `.cache/fbref/columns-manifest.json` لمعرفة الأعمدة الفعلية المكتشفة من ملفات الكاش.
4. يعرض في الواجهة:
   - metrics المتاحة كخيارات طبيعية.
   - metrics غير المتاحة إما مخفية أو مع وسم `Unavailable` وسبب واضح.
5. عند الطلب:
   - إذا كان `statGroup` متاحًا والعمود موجودًا، يرجع القيمة الحقيقية.
   - إذا كان `statGroup` غير متاح أو العمود غير موجود، يرجع `unavailable` ولا يخترع رقمًا.

## حماية FBref من الضغط و CAPTCHA

تم اعتماد تشغيل ذكي:

- إذا `standard` موجود وصحيح، لا يعاد جلبه تلقائيًا.
- `-StatGroups missing` يجلب فقط الناقص.
- `-StatGroups all-safe` يحاول التوسعة بأمان ويوقف direct fetches عند إشارات block/CAPTCHA.
- فشل group جديد لا يمسح group قديم ناجح.
- التشغيل اليومي من Tray يستخدم `-StatGroups missing` بدل محاولة كل شيء من الصفر.

## تحديث اعتماد 2026-05-17: حدود التوفر و next-missing

تم تشديد مفهوم `availableStatGroups` بحيث لا يكفي وجود الملف فقط:

- `standard`, `shooting`, `passing`, `gca`, `defense`, `possession`, `pass_types`, `playing_time`, `misc`: الحد الأدنى 500 لاعب.
- `keeper`, `keeper_adv`: الحد الأدنى 40 لاعبًا.

أي ملف أقل من حد مجموعته يبقى محفوظًا كأثر تشخيصي، لكنه لا يدخل `availableStatGroups` ولا يسمح للقالب باعتبار metrics هذه المجموعة متاحة.

تمت إضافة وضع التشغيل:

```powershell
-StatGroups next-missing
```

هذا الوضع يختار أول مجموعة ناقصة فقط، أو أول مجموعتين إذا كانت قيمة `nextMissingBatchSize` في `local.sync.json` تساوي 2. لذلك التشغيل اليومي من Tray يستخدم `next-missing` لتقليل الضغط على FBref، بينما التشغيل اليدوي يسمح باختيار `missing` أو `all-safe`.

كذلك تمت إضافة `metricsAvailability` داخل `last_updated.json`: كل metric يتم فحص `sourceColumn` الخاص به مقابل `columns-manifest.json`. إذا كانت المجموعة متاحة لكن العمود غير موجود، يظهر السبب:

```json
{
  "status": "unavailable",
  "reason": "unavailable_column_missing"
}
```

ولا يتم إرجاع أي رقم تجريبي أو تخميني.
