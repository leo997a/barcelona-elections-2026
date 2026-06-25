# تقرير الدفعة 15: اختيار المباراة وربط تفاصيل FotMob

التاريخ: 26 يونيو 2026

## الهدف

تحويل قوالب المونديال من حقول يدوية عامة إلى قوالب مرتبطة بمباراة حقيقية محددة، مع بقاء الحقول اليدوية كخطة احتياطية.

## ما تم تنفيذه

- إضافة endpoint جديد: `/api/reo-match?action=match-details&matchId=<id>`.
- استخدام endpoint الحالي في FotMob: `/api/data/matchDetails?matchId=<id>`.
- إضافة fallback عبر جسر Google Cloud: `/api/match-details?matchId=<id>`.
- إضافة cache قصير مع stale fallback لمنع انقطاع القالب عند تعطل المصدر مؤقتاً.
- إضافة منتقي مباريات داخل المحرر وواجهة المشغل:
  - بحث باسم المنتخب أو الرمز أو Match ID.
  - فلترة حسب المرحلة والحالة.
  - اختيار المباراة بضغطة واحدة.
  - تثبيت Match ID وتعبئة حقول المباراة المتوافقة تلقائياً.
- منع إظهار حقل Match ID الخام عند توفر المنتقي.
- ربط القوالب التالية بتفاصيل المباراة:
  - إحصائيات المباراة.
  - تشكيلة المباراة.
  - نجم المباراة.
  - تقرير المباراة.
- إضافة اختيار المضيف أو الضيف داخل قالب التشكيلة.
- تنظيف إحصائيات FotMob من الصفوف الفارغة والمكررة.
- تثبيت مؤشرات الإحصائيات المعروضة: الاستحواذ، xG، التسديدات، على المرمى، الركنيات، والبطاقات الصفراء.
- دعم صيغة اسم اللاعب النصية وصيغة `fullName/firstName/lastName`.
- منع طلب تفاصيل FotMob للمعرفات المؤقتة غير الرقمية مثل `M73`.

## التحقق

- `tsc --noEmit`: ناجح.
- `tsc -p tsconfig.server.json`: ناجح.
- اختبارات المونديال: 18 من 18 ناجحة.
- `vite build`: ناجح.
- `git diff --check`: ناجح.
- فحص FotMob مباشر للمباراة `4667751`:
  - المباراة: Mexico ضد South Africa.
  - المصدر: direct.
  - الأحداث: 21.
  - الإحصائيات النظيفة: 37.
  - التشكيلات: متوفرة.
  - نجم المباراة: Julián Quiñones.
  - التقييم: 8.8.

## حالة النشر

- commit الوظيفي: `d59221f feat: bind mondial templates to live match details`.
- تم الدفع إلى `origin/main` بنجاح.
- تم نشر الحزمة على Hostinger.
- حزمة الواجهة المنشورة: `assets/index-CUKT3KqS.js`.
- endpoint الإنتاجي:
  - الرابط: `https://peachpuff-herring-712997.hostingersite.com/api/reo-match?action=match-details&matchId=4667751`
  - الحالة: HTTP 200.
  - العقد: `reo-match-details-v1`.
  - المصدر: `direct`.
- تحقق المتصفح:
  - عنوان الصفحة: `Reo Live Stream - نظام البث السحابي`.
  - بوابة التفعيل العربية ظهرت بصورة صحيحة.
  - لا توجد أخطاء console.
  - لقطة الإثبات: `reports-ar/evidence-mondial-batch-15-hostinger.png`.

## نشر جسر Google VM

- الخادم: `openclaw-server` في المنطقة `us-west1-a`.
- تم إنشاء نسخة احتياطية مؤرخة من `/opt/reo-match-bridge/app.py` قبل الاستبدال.
- تم فحص الملف الجديد بواسطة `py_compile` ثم إعادة تشغيل `reo-match-bridge.service`.
- حالة الخدمة بعد النشر: `active (running)`.
- بصمة SHA-256 المحلية والخادم:
  - `78c6f6aa8618cc0c149356d46126cef083f47f27f26d085d36f8980d5500e400`
- تحقق مصادق من داخل الخادم:
  - `/api/status`: HTTP 200 و`ok=true`.
  - مسار تفاصيل المباراة المعلن: `/api/match-details?matchId=<id>`.
  - `/api/match-details?matchId=4667751`: HTTP 200.
  - المصدر: `reo-match-bridge`.
  - المباراة: Mexico ضد South Africa.
  - الإحصائيات: متوفرة.
  - الأحداث: 21.
  - التشكيلات: متوفرة للفريقين.
  - نجم المباراة: Julián Quiñones.
- لم تتم طباعة أو نقل قيمة `REO_BRIDGE_TOKEN` خارج الخادم أثناء التحقق.
