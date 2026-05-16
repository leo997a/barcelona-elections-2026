# تقرير 2026-05-16: حماية Player Stats Bridge وتحذير Toggle

## ما تم تنفيذه

تم تحديث مسار `api/player-stats` حتى يرسل توكن حماية الجسر من السيرفر فقط عند وجود المتغير:

`REO_PLAYER_STATS_BRIDGE_TOKEN`

عند الاتصال بالجسر المحدد في:

`REO_PLAYER_STATS_BRIDGE_URL`

يتم الآن إرسال الهيدر:

`Authorization: Bearer ...`

لكن بدون طباعة التوكن في السجلات، وبدون إرساله إلى الواجهة أو المتصفح. إذا كان التوكن غير موجود، يبقى الطلب يعمل بدون `Authorization` حتى لا يتعطل النظام أثناء مرحلة الانتقال.

## منطق الجسر الحالي

إذا كان `REO_PLAYER_STATS_BRIDGE_URL` موجودًا، يستخدم الموقع هذا المسار كجسر رسمي لإحصائيات اللاعبين ويرسل له الطلب بصيغة `POST` مع `Content-Type: application/json`.

إذا لم يكن موجودًا، يبقى المسار القديم عبر `REO_BRIDGE_URL` متاحًا كخيار رجعي حتى لا تنكسر النسخ الحالية.

## Stream Deck

تم الحفاظ على إصلاح المشكلة القديمة:

- الأزرار القديمة المحفوظة على `toggle` تتحول تلقائيًا إلى `show` عند القراءة الأولى لتجنب الإخفاء المفاجئ.
- المستخدم لا يزال يستطيع اختيار `toggle` يدويًا بعد التحديث.
- عند اختيار `toggle` يظهر تحذير داخل إعدادات الزر:

`Toggle قد يسبب إخفاء غير مقصود إذا تم الضغط مرتين أو وصل أمر مكرر. يفضل استخدام Show/Hide للبث المباشر.`

هذا يجعل السلوك واضحًا ولا يعيد مشكلة الإخفاء التلقائي أثناء البث.

## Firebase

نافذة العرض لا تستمع إلى Firebase افتراضيًا. المسار الرسمي الآن هو:

`Stream Deck -> /api/live -> SSE -> نافذة العرض`

Firebase يبقى خيارًا قديمًا فقط عند تفعيله يدويًا، وهذا يقلل مشاكل التزامن المزدوج.

## كاش الصور

الخطة المعتمدة للمرحلة التالية:

```text
public/identity/
  players.json
  clubs.json

public/images/players/small/
  barcelona/
  chelsea/

public/images/players/render/
  barcelona/
  chelsea/

public/images/clubs/
  premier-league/
  la-liga/
```

الهدف أن يعرف النظام اللاعب من `players.json` وليس من اسم الصورة فقط، ثم يختار الصورة المناسبة حسب نوع القالب:

- `smallImage` للقوالب السريعة والبث المباشر.
- `renderImage` للقوالب الفخمة وبطاقات اللاعبين.
- `clubLogo` لشعار النادي من `clubs.json`.

## خطوات التحقق

تم تشغيل:

- `npm run lint`
- `npm run build`
- فحص JavaScript لإضافة Stream Deck عبر `node --check`

بعد النشر يجب فحص:

`https://barcelona-elections-2026.vercel.app/api/player-stats`

إذا كان الجسر والتوكن متطابقين بين Vercel وVPS يجب أن يظهر داخل الرد:

```json
{
  "bridgeConfigured": true,
  "auth": {
    "provided": true,
    "valid": true
  }
}
```

إذا ظهر `provided:false` فهذا يعني أن Vercel لم يرسل التوكن.
إذا ظهر `provided:true` و `valid:false` فهذا يعني أن توكن Vercel مختلف عن توكن VPS.
