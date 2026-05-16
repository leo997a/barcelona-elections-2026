# تقرير 2026-05-16: تزامن توكن Player Stats بين Vercel وVPS

## سبب التعديل

بعد نشر تعديل `api/player-stats` أصبح رابط الإنتاج يرسل هيدر `Authorization` إلى جسر إحصائيات اللاعبين، لكن الجسر كان يرجع:

```json
{
  "provided": true,
  "valid": false
}
```

هذا يعني أن Vercel يرسل توكنًا، لكن توكن الـ VPS غير مطابق أو غير موجود.

## ما تم على Vercel

تم تدوير متغير البيئة:

`REO_PLAYER_STATS_BRIDGE_TOKEN`

بقيمة جديدة آمنة، بدون طباعتها في المخرجات أو حفظها داخل ملفات الواجهة.

## ما تم على VPS

تم تحديث ملف:

`/opt/reo-player-stats-bridge/server.js`

مع نسخة احتياطية تلقائية قبل التعديل، ثم إضافة:

- `REQUIRE_AUTH`
- `REO_PLAYER_STATS_TOKEN`
- فحص `Authorization: Bearer ...`
- إعادة `auth` داخل الرد حتى يسهل التشخيص

تم تشغيل الجسر عبر PM2 مع:

`REQUIRE_AUTH=false`

وهذا يعني أن الجسر يعرف التوكن ويتحقق منه، لكنه لا يقفل الطلبات بعد. هذا هو الوضع الصحيح قبل القفل النهائي.

## نتيجة الاختبار

اختبار VPS المحلي بالتوكن الجديد أعطى:

```json
{
  "ok": true,
  "bridgeConfigured": true,
  "auth": {
    "required": false,
    "provided": true,
    "valid": true
  }
}
```

بعد إعادة نشر Vercel، رابط الإنتاج:

`https://barcelona-elections-2026.vercel.app/api/player-stats`

أعطى:

```json
{
  "bridgeConfigured": true,
  "auth": {
    "required": false,
    "provided": true,
    "valid": true
  }
}
```

## ملاحظة مهمة

لا يجب تفعيل:

`REQUIRE_AUTH=true`

إلا بعد بقاء النتيجة في الإنتاج:

`valid:true`

لفترة كافية ومع كل قوالب Player Stats. بعد ذلك يمكن قفل الجسر نهائيًا بثقة.

## الأمان

تم فحص ملفات الواجهة المبنية داخل `dist` وملفات `public`، ولم يظهر فيها:

- `REO_PLAYER_STATS_BRIDGE_TOKEN`
- `REO_PLAYER_STATS_TOKEN`
- `Authorization: Bearer`

هذا يعني أن التوكن بقي في جهة السيرفر فقط.
