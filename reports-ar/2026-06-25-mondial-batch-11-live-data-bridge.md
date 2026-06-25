# تقرير دفعة المونديال 11: الجسر والبيانات المباشرة

التاريخ: 2026-06-25

## الهدف

ربط تغير بيانات FotMob الحية بقوالب المونديال بحيث يعمل مؤثر التحديث والصوت عند تغير النتيجة أو الدقيقة أو الترتيب فعلياً، مع إضافة مسار احتياطي عبر جسر مباريات REO عند تعذر الوصول المباشر إلى FotMob.

## ما تم تنفيذه

1. إضافة بصمة مستقرة باسم `dataVersion` لبيانات كأس العالم.
2. البصمة تتجاهل قيم النقل المتغيرة مثل `fetchedAt` و`bridgeUpdatedAt`، لذلك لا يعمل الأنميشن لمجرد تنفيذ Poll جديد.
3. تغير النتيجة أو حالة المباراة أو بيانات المجموعات يولد بصمة جديدة.
4. محرك المونديال يقارن البصمة السابقة بالجديدة:
   - أول تحميل لا يشغل صوت UPDATE.
   - البيانات المتطابقة لا تشغل مؤثراً.
   - التغير الحقيقي يشغل حركة تحديث تلفزيونية وصوت `TRANSITION`.
   - التحديث أثناء إخفاء القالب لا يعمل لاحقاً فوق صوت الظهور.
5. إضافة طبقة Update Sweep مستقلة داخل `MondialTransitionFrame`.
6. تقليل زمن تحديث قوالب كأس العالم من 75 ثانية إلى 15 ثانية افتراضياً.
7. تقليل cache المصدر المباشر إلى 15 ثانية، مع إبقاء نسخة stale لمدة 30 دقيقة عند انقطاع المصادر.
8. إضافة رؤوس تشخيص آمنة لمسار API:
   - `X-REO-Data-Version`
   - `X-REO-Source-Mode`
   - `X-REO-Source-Status`
9. إضافة مسار احتياطي داخل جسر المباريات:
   - `GET /api/world-cup`
   - يعيد `pageProps` العامة من FotMob بعقد واضح.
10. عند فشل FotMob المباشر، يحاول التطبيق الرئيسي جسر REO، ثم يستخدم النسخة stale إذا تعذر المصدران.
11. إضافة أمر `world-cup` إلى `scripts/reo-cloud-bridge.ps1`.

## حالة المصادر

المسار الأساسي:

```text
قالب المونديال
  -> /api/reo-match?action=world-cup
  -> FotMob مباشرة
```

مسار الاستمرارية:

```text
FotMob المباشر يفشل
  -> REO_BRIDGE_URL/api/world-cup
  -> FotMob من موقع جسر Google VM
  -> تطبيع البيانات داخل التطبيق الرئيسي
```

## نتائج التحقق

- TypeScript للواجهة: ناجح.
- TypeScript للخادم: ناجح.
- Python `py_compile` لجسر المباريات: ناجح.
- بناء Vite الإنتاجي: ناجح.
- الاختبارات: 13/13 ناجحة.
- اختبار FotMob المباشر:
  - المصدر: `fotmob`.
  - الوضع: `direct`.
  - الحالة: `live`.
  - المجموعات: 12.
  - المنتخبات: 48.
  - المباريات: 104.
  - المباريات المباشرة وقت الاختبار: 2.
  - الأدوار: R32 وR16 وQF وSF والنهائي والمركز الثالث.
- اختبار جسر Python:
  - `provider=fotmob`.
  - `sourceMode=reo-match-bridge`.
  - `pageProps` موجودة وصحيحة.
- اختبار Handler:
  - HTTP 200.
  - `dataVersion` في الرأس يطابق الاستجابة.
  - `sourceMode=direct`.

## حدود النشر

- التطبيق الرئيسي مرتبط بـGitHub وHostinger، لذلك تصل تعديلات TypeScript والواجهة وAPI بعد الدفع إلى `main`.
- جسر المباريات يعمل كخدمة Google Compute Engine منفصلة في `cloud/reo-match-bridge`.
- كود `/api/world-cup` الخاص بالجسر أصبح جاهزاً ومختبراً، لكن الخدمة المنفصلة تحتاج رفع `app.py` وإعادة تشغيل `reo-match-bridge`.
- أداة Google Cloud في هذه الجلسة استطاعت قراءة اسم المشروع فقط، ثم مُنعت من فتح قاعدة اعتماد gcloud لأن مجلد إعدادات المستخدم غير قابل للكتابة ضمن صلاحيات الجلسة. لذلك لا يجوز اعتبار نسخة Google VM منشورة قبل تنفيذ تحديث الخدمة من قناة Cloud مصادق عليها.

## نتيجة نشر التطبيق الرئيسي

- الالتزام البرمجي: `51673e1`.
- تم دفعه إلى `origin/main`.
- ملف الواجهة المنشور على Hostinger: `/assets/index-MGkQziiG.js`.
- مسار `/api/reo-match?action=world-cup` أعاد HTTP 200.
- `sourceMode=direct`.
- `sourceStatus=live`.
- `dataVersion=reo-wc-vwlua0-25az` وقت التحقق.
- رأس `X-REO-Data-Version` طابق قيمة `dataVersion` داخل JSON.
- جسر Google VM الحالي ما زال يعرض عقد الحالة القديم بدون قسم `worldCup`، لذلك يبقى نشر ملف `cloud/reo-match-bridge/app.py` على الخدمة المنفصلة خطوة تشغيلية مستقلة.

## الملفات الرئيسية

- `utils/worldCupLiveData.ts`
- `api/_lib/fotmobWorldCup.ts`
- `api/reo-match.ts`
- `components/renderers/Mondial2026Renderer.tsx`
- `components/renderers/mondial/MondialTransitionLayer.tsx`
- `cloud/reo-match-bridge/app.py`
- `tests/mondial-live-data.test.mjs`
