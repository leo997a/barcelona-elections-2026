# تقرير قرار: تصحيح Build Command لجسر Player Stats على Hostinger

التاريخ: 2026-06-13  
المرحلة: PLAYER-STATS-BRIDGE-HOSTINGER-BUILD-COMMAND-CORRECTION  
الحالة: مكتملة ومتحقق منها

---

## 1. سبب القرار

تمت مراجعة ملاحظة مهمة بخصوص إعداد Hostinger:

```text
Build command: npm run verify
```

هذا الأمر كان مناسبًا محليًا لأنه يشغل اختبار عقد كامل، لكنه ليس build حقيقيًا. داخل Hostinger قد يكون غير مثالي لأنه:

- يفتح خادمًا مؤقتًا.
- يستخدم منفذًا محليًا عشوائيًا.
- يعتمد على سلوك بيئة build.
- قد يفشل رغم أن التطبيق نفسه سليم.

لذلك القرار الصحيح:

```text
Build command: npm run hostinger:build
```

والأمر الجديد ينفذ:

```text
node --check server.js
```

أي فحص syntax خفيف وآمن لبيئة Hostinger.

---

## 2. ما تم تعديله

تم تعديل:

```text
cloud/reo-player-stats-bridge/package.json
cloud/reo-player-stats-bridge/HOSTINGER.md
cloud/reo-player-stats-bridge/README.md
```

تمت إضافة script:

```text
npm run hostinger:build
```

ويستخدم:

```text
node --check server.js
```

---

## 3. ما يبقى محليًا

لا يزال الأمر التالي مهمًا قبل كل نشر:

```text
npm run verify
```

لكن مكانه الصحيح:

- جهاز التطوير.
- CI.
- قبل commit/push.

وليس كـ Build command داخل Hostinger.

---

## 4. مسار البيانات الأولي

تم تعديل توصية أول اختبار Hostinger إلى:

```text
REO_PLAYER_STATS_DATA_FILE=./data/player-stats.json
```

السبب:

- هذا أسهل للاختبار الأول داخل تطبيق Hostinger.
- لا يحتاج معرفة user path الحقيقي.

لكن يجب اعتباره تجريبيًا حتى نتأكد أن Hostinger يحافظ على الملف بعد redeploy.

للإنتاج النهائي، VPS أفضل لتخزين JSON دائم مثل:

```text
/var/lib/reo-player-stats-bridge/player-stats.json
```

---

## 5. التحقق

تم تشغيل:

```text
npm run hostinger:build
npm run verify
npm run lint
npm run build
```

النتائج:

- `hostinger:build`: ناجح.
- `verify`: ناجح.
- `lint`: ناجح.
- `build`: ناجح.
- تحذير chunk الكبير ما زال تحذيرًا غير كاسر.

عدد functions:

```text
10
```

---

## 6. رأيي النهائي

نعم، التوصية صحيحة:

- لا نلمس تطبيق REO Live الرئيسي الآن.
- ننشر الجسر كتطبيق Node.js ثانٍ مستقل.
- لا نضع `REO_PLAYER_STATS_BRIDGE_URL` داخل الجسر نفسه.
- لا نستخدم `npm run verify` كـ Build command في Hostinger.
- نستخدم `npm run hostinger:build`.
- نربط الجسر بالتطبيق الرئيسي فقط بعد نجاح `/health` و`smoke:remote` والاستيراد والتصدير.

