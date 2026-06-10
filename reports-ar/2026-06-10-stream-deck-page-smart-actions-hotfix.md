# تقرير عربي - Stream Deck Page Smart Actions Hotfix

التاريخ: 2026-06-10  
اسم المرحلة: STREAM-DECK-PAGE-SMART-ACTIONS-HOTFIX

## الملخص التنفيذي

المشكلة التي ظهرت في لقطة الشاشة لم تكن من إضافة `RGE Live Controller` الجديدة فقط، بل من الإضافة القديمة المثبتة داخل Stream Deck باسم:

`reo-template-overlays.sdPlugin`

هذه الإضافة كانت تعرض أوامر عامة مثل `زيادة رقم` و`نقص رقم` حتى عند استخدام قالب ذكي يحتوي على صفحات. هذا كان يخلق تجربة مربكة وخطيرة، لأن المستخدم يريد أمرًا واضحًا مثل `الصفحة التالية` أو `اختيار رقم الصفحة` بدل التفكير في الحقل الداخلي `currentPage`.

تم تنفيذ hotfix محدود وآمن على مستويين:

1. تحديث الإضافة القديمة المثبتة داخل Stream Deck إلى نسخة `2.4.0`.
2. تحديث مولد إضافة `RGE Live Controller` داخل صفحة التكامل إلى نسخة `4.6.0` حتى تحمل التنزيلات الجديدة نفس منطق الصفحات.

## التشخيص

الأسباب التقنية:

- الإضافة القديمة تعتمد قائمة أوامر ثابتة لا تفهم قدرات Smart Token.
- قاموس الحقول القديم كان محدودًا ولا يقرأ حقول `fs` أو قدرات `cap` من التوكن.
- القوالب ذات الصفحات تستخدم داخليًا `currentPage` بقيمة تبدأ من 0، بينما المستخدم يفكر بصيغة صفحة 1، صفحة 2، صفحة 3.
- أمر `زيادة رقم` كان صحيحًا تقنيًا فقط إذا اختار المستخدم `currentPage` يدويًا، لكنه سيئ UX لقالب Smart News.

## ما تم إصلاحه

### 1. الإضافة القديمة `reo-template-overlays.sdPlugin`

تم تحديث المصدر المحلي:

`C:\New folder\uno_overlays_analysis\reo-template-overlays.sdPlugin`

وتم نسخه إلى التثبيت الفعلي:

`C:\Users\Reo k\AppData\Roaming\Elgato\StreamDeck\Plugins\reo-template-overlays.sdPlugin`

التغييرات:

- ترقية `manifest.json` إلى `2.4.0`.
- إضافة أوامر صفحات ذكية:
  - `الصفحة التالية`
  - `الصفحة السابقة`
  - `الصفحة الأولى`
  - `اختيار رقم الصفحة`
- إخفاء اختيار الحقل عند استخدام أوامر الصفحات.
- تحويل `اختيار رقم الصفحة` من رقم ظاهر للمستخدم يبدأ من 1 إلى `currentPage` داخلي يبدأ من 0.
- إعادة تسمية:
  - `زيادة رقم` إلى `زيادة رقم عام`
  - `نقص رقم` إلى `نقص عام`
- إذا كان زر قديم يستخدم `increment-field` مع `currentPage` أو بدون حقل واضح، يتم اقتراح `page-next` بدل الأمر العام.
- إضافة رسالة توضيحية داخل Property Inspector عند اكتشاف قالب فيه صفحات.

### 2. إضافة `RGE Live Controller` الرسمية

تم تحديث مولد الحزمة داخل:

`pages/Integrations.tsx`

التغييرات:

- ترقية النسخة من `4.5.0` إلى `4.6.0`.
- تغيير اسم التنزيل إلى:

`RGE_Live_Controller_v4_6.streamDeckPlugin`

- إضافة أمر:

`slide_go_to`

- إضافة حقل رقم صفحة يظهر فقط عند اختيار `Go to page number`.
- تحويل رقم الصفحة من 1-based في واجهة Stream Deck إلى 0-based داخل `currentPage`.
- تحديث feedback title ليعرض الصفحة الحالية بعد أوامر:
  - next
  - previous
  - reset
  - go to page

## التثبيت المحلي

تم تثبيت نسخة الإضافة القديمة داخل Stream Deck فعليًا:

`C:\Users\Reo k\AppData\Roaming\Elgato\StreamDeck\Plugins\reo-template-overlays.sdPlugin`

وتم إنشاء حزمة احتياطية:

`C:\Users\Reo k\Downloads\Reo_Template_Controller_v2_4.streamDeckPlugin`

تمت إعادة تشغيل تطبيق Stream Deck فقط. لم يتم إغلاق العرض المباشر، ولم يتم لمس روابط OBS أو صفحات القوالب المباشرة.

## الاختبارات

تم تنفيذ اختبارات ثابتة ومنطقية:

- `node --check` على `app.js` للإضافة القديمة.
- `node --check` على `propertyinspector/js/index_pi.js`.
- فحص نصي للتأكد من وجود:
  - `page-next`
  - `page-go-to`
  - `الصفحة التالية`
  - `اختيار رقم الصفحة`
  - `زيادة رقم عام`
- تجربة VM منطقية لقالب `SMART_NEWS`:
  - تحقق أن القائمة تولد `page-next` و`page-go-to`.
  - تحقق أن `اختيار رقم الصفحة = 3` ينتج:

```json
{
  "action": "update_field",
  "fieldId": "currentPage",
  "value": 2
}
```

- تجربة VM على ملف التنفيذ:
  - `page-next` ينتج `increment_field currentPage +1`.
  - `page-go-to` مع صفحة 5 ينتج `currentPage = 4`.

اختبارات المشروع:

- `npm run lint`: نجح.
- `npm run build`: نجح.
- تحذير Vite المتبقي: chunk أكبر من 500KB، وهو تحذير موجود في سياق حجم التطبيق وليس خطأ build.
- عدد Vercel Functions بعد استثناء `api/_lib`: `10`.

## ما لم يتم لمسه

لم يتم تعديل:

- `components/renderers`
- `services/audioEngine.ts`
- `api`
- `constants.ts`
- Player Intel
- قوالب Mercato
- Stream Deck live token schema
- ملفات الأسرار أو `.env`

## ملاحظات تشغيلية

إذا ظلت Stream Deck تعرض القائمة القديمة عند زر موجود مسبقًا:

1. اضغط على زر Stream Deck نفسه مرة أخرى لفتح Property Inspector.
2. إذا بقيت القيم القديمة محفوظة، اختر الأمر من القائمة الجديدة مرة واحدة.
3. للقالب الذكي استخدم:
   - `الصفحة التالية`
   - `الصفحة السابقة`
   - `اختيار رقم الصفحة`

لا تحتاج إلى اختيار `currentPage` يدويًا بعد هذا الإصلاح.

## التوصية التالية

الخطوة التالية المقترحة هي توحيد تجربة Stream Deck بالكامل:

- تقليل وجود الإضافة القديمة تدريجيًا.
- جعل `RGE Live Controller` هو المسار الرسمي الوحيد.
- إضافة أوامر ذكية لكل نوع قالب من Smart Token بدل القوائم العامة.
- تحسين الواجهة العربية داخل Property Inspector الرسمي.
