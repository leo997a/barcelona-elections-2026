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
- نُشر كود `/api/world-cup` على الخدمة المنفصلة بعد تسجيل الدخول إلى Google Cloud من إعداد مستقل قابل للكتابة.
- تم الاحتفاظ بنسخة احتياطية مؤرخة من `app.py` على الخادم قبل الاستبدال.
- تم فحص صياغة Python من بيئة الخدمة نفسها قبل إعادة التشغيل.

## نتيجة نشر التطبيق الرئيسي

- الالتزام البرمجي: `51673e1`.
- تم دفعه إلى `origin/main`.
- ملف الواجهة المنشور على Hostinger: `/assets/index-MGkQziiG.js`.
- مسار `/api/reo-match?action=world-cup` أعاد HTTP 200.
- `sourceMode=direct`.
- `sourceStatus=live`.
- `dataVersion=reo-wc-vwlua0-25az` وقت التحقق.
- رأس `X-REO-Data-Version` طابق قيمة `dataVersion` داخل JSON.

## نتيجة نشر جسر Google VM

- الحساب المستخدم: `ritchardakram1997@gmail.com`.
- مشروع Google Cloud: `banded-setting-475000-i8`.
- الآلة: `openclaw-server`.
- المنطقة: `us-west1-a`.
- العنوان العام: `34.169.68.109`.
- الخدمة: `reo-match-bridge.service`.
- الحالة بعد النشر: `active (running)`.
- تطابق SHA-256 بين الملف المحلي والمنشور:
  - `5693447e4a804060eae5e18e2583c040d0fb2bae8b38282c73d7fc27ccc1cfe4`.
- فحص `/api/status` من داخل الخادم:
  - `worldCup.enabled=true`.
  - `worldCup.provider=fotmob`.
  - `worldCup.cacheSeconds=15`.
  - `worldCup.endpoint=/api/world-cup`.
- فحص `/api/world-cup` من داخل الخادم:
  - `provider=fotmob`.
  - `sourceMode=reo-match-bridge`.
  - `pageProps` صحيحة وتحتوي 14 مفتاحاً رئيسياً.
  - حجم الاستجابة وقت التحقق: `749727` بايت.
- فحص Hostinger بعد نشر الجسر:
  - `/api/reo-match?action=status` أعاد HTTP 200 وأظهر قسم `worldCup`.
  - `/api/reo-match?action=world-cup` أعاد HTTP 200.
  - `sourceMode=direct`.
  - `sourceStatus=live`.
  - المجموعات: 12.
  - المباريات: 104.
  - رأس `X-REO-Data-Version` طابق `dataVersion` داخل الاستجابة.

## الملفات الرئيسية

- `utils/worldCupLiveData.ts`
- `api/_lib/fotmobWorldCup.ts`
- `api/reo-match.ts`
- `components/renderers/Mondial2026Renderer.tsx`
- `components/renderers/mondial/MondialTransitionLayer.tsx`
- `cloud/reo-match-bridge/app.py`
- `tests/mondial-live-data.test.mjs`
