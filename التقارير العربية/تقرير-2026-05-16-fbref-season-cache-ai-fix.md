# تقرير مرحلة 2026-05-16: إصلاح صندوق AI ومرحلة FBref Season Cache

## اسم المرحلة

Real Provider Implementation Phase 1: FBref Season Cache

هذه المرحلة ليست إضافة مصادر كثيرة. الهدف كان واضحًا: تثبيت مسار FBref الحقيقي لإحصائيات الموسم فقط، مع عدم كسر القالب إذا فشل المصدر أو حظره الموقع.

## المشكلة التي ظهرت في صندوق AI

رسالة الواجهة كانت تقول إن مفاتيح Gemini غير موجودة، لكن فحص Vercel Logs كشف أن السبب الحقيقي مختلف:

- دالة `/api/ai` كانت تستورد `utils/playerIdentity.ts`.
- بيئة Vercel Serverless تبحث عن ملف JavaScript في وقت التشغيل.
- النتيجة كانت `ERR_MODULE_NOT_FOUND`، لذلك كان صندوق AI يفشل قبل الوصول إلى Gemini أصلًا.

تم إصلاح الاستيراد إلى:

```ts
import { resolveClubIdentity, resolvePlayerIdentity } from '../utils/playerIdentity.js';
```

بهذا يصبح المسار مناسبًا لبناء TypeScript وتشغيل Vercel.

## ما تم إصلاحه في قوالب الميركاتو

تمت إعادة حقول الصور التي اختفت من عدة قوالب ميركاتو:

- `playerImage`
- `playerImageLarge`
- `fromClubLogo`
- `toClubLogo`

وشملت الحقول قوالب مثل:

- Mercato command center
- مصفوفة توقعات الانتقال
- Done deals
- Season card
- Impact card
- Contract exit
- Here we go / featured transfer

كما تم تعديل الرندر حتى يفضّل الصورة الكبيرة عند توفرها:

```ts
playerImageLarge || playerImage || sportmonksPlayer.image_path
```

هذا يعني أن القالب الفخم يستطيع استخدام صورة render كبيرة، بينما القوالب السريعة تستطيع استخدام الصورة الصغيرة.

كما تم ربط صندوق AI الخاص بالميركاتو بكاش الهوية المحلي. عند كتابة مثال مثل "ليفاندوفسكي قريب من مغادرة برشلونة بنسبة 65%" أصبح الرد يضيف تلقائيًا:

- `playerImage`
- `playerImageLarge`
- `clubLogo`
- `fromClubLogo`
- `toClubLogo` عند وجود نادي وجهة معروف
- صورة اللاعب داخل `marketItems`

هذا يمنع حالة وجود حقل صورة في القالب لكن صندوق AI لا يملؤه.

## إصلاح مقارنة Player Stats

في وضع المقارنة، كان القالب يميل إلى عرض بيانات عامة أو افتراضية بدل احترام المقاييس المختارة من Smart Metric Selector.

تم تعديل `PlayerStatsRenderer` حتى:

- يمرر `selectedMetrics` فعليًا إلى أعمدة المقارنة.
- يعرض فقط الإحصائيات المختارة بدل تكديس كل شيء.
- يستخدم `generatedAt` إذا لم يوجد `updatedAt`.
- يحافظ على نفس شكل القالب بدون كسر الواجهة.

كما تم إصلاح `/api/player-stats` نفسه حتى لا يضيف لاعبين افتراضيين مثل Cole Palmer وLamine Yamal عند طلب وضع `SINGLE`. الآن اللاعبان الافتراضيان لا يدخلان إلا عند `COMPARE` أو `SCOUT_CARD`، وهذا يمنع warnings وطلبات غير مطلوبة في وضع لاعب واحد.

## FBref Provider الحقيقي

تم إنشاء Provider حقيقي في:

```text
ops/player-stats-bridge/providers/fbrefProvider.js
```

ويعمل بالمبدأ التالي:

1. يحدد الدوري من النادي، حاليًا La Liga و Premier League كبداية.
2. يبني رابط FBref حسب الموسم والدوري.
3. يجلب جداول الموسم، خصوصًا `stats` و`shooting`.
4. يقرأ الجداول حتى لو كانت داخل HTML comments، وهي طريقة شائعة في FBref.
5. يدمج صفوف اللاعب بين الجداول.
6. يحفظ النتيجة في:

```text
cache/fbref/<league>-<season>.json
```

7. إذا فشل الجلب لاحقًا، يستخدم الكاش القديم إذا كان موجودًا.
8. يطابق اللاعب بالاسم والنادي.
9. يحول أعمدة FBref إلى مفاتيح `metrics.catalog.json`.
10. يرجع فقط `selectedMetrics`.

## أمثلة التحويل

```text
goals            <- goals / Gls
assists          <- assists / Ast
shots            <- shots / Sh
shots_on_target  <- shots_on_target / SoT
xg               <- xg / xG
xa               <- xg_assist أو xa أو xag
minutes          <- minutes / Min
starts           <- games_starts / Starts
appearances      <- games / MP
```

## Provider Router

تم تحديث:

```text
ops/player-stats-bridge/providers/router.js
```

حتى يحترم السياسة التالية:

- `providerPolicy = fbref`: استخدم FBref فقط.
- `providerPolicy = matchBridge`: استخدم جسر المباراة فقط.
- `providerPolicy = demo`: استخدم بيانات demo فقط.
- `providerPolicy = auto`: اختر المصدر حسب نوع metric.

الموسم الكامل يبدأ من FBref، وبيانات المباراة الحية تبقى للجسر الحالي.

## ماذا يحدث إذا فشل FBref؟

تم تنفيذ السلوك الآمن:

- لا ينكسر القالب.
- لا يتم اختراع أرقام مزيفة.
- يرجع provider warning واضح.
- الإحصائية ترجع `value: "unavailable"` إذا لا يوجد كاش صالح.

هذا مهم للبث، لأن الرقم المزيف أخطر من الرقم غير المتاح.

## نتيجة اختبار FBref على السيرفر

تم اختبار الجسر على VPS مع التوكن، والحماية بقيت فعالة:

```text
auth.required = true
auth.provided = true
auth.valid = true
```

لكن FBref أعطى رد 403 من السيرفر بسبب حماية Cloudflare. لذلك النتيجة الحالية:

- البنية الحقيقية والكاش والتحويل موجودة.
- إذا نجح الجلب لاحقًا سيتم حفظ الكاش واستخدامه.
- إذا استمر الحظر، يرجع warning ولا يكسر القالب.

الحل التالي ليس إضافة مصادر كثيرة عشوائيًا، بل تجهيز طريقة seed للكاش أو مسار جلب موثوق لا يخالف استقرار النظام.

## الملفات الرئيسية في هذه المرحلة

```text
api/ai.ts
api/player-stats.ts
components/renderers/TransferNewsRenderer.tsx
components/renderers/PlayerStatsRenderer.tsx
constants.ts
ops/player-stats-bridge/providers/fbrefProvider.js
ops/player-stats-bridge/providers/router.js
```

## التحقق المحلي

تم تشغيل:

```bash
npm run lint
npm run build
```

والأمران نجحا.

## الخلاصة العملية

هذه المرحلة أصلحت سبب تعطل صندوق AI الحقيقي، أعادت حقول صور الميركاتو، ربطت المقارنة بالمقاييس المختارة، وبدأت FBref كمصدر موسم حقيقي مع كاش وتحويل آمن. لا تزال نقطة FBref 403 تحتاج معالجة منفصلة، لكنها الآن لا تكسر القالب ولا تعطي أرقامًا وهمية.
