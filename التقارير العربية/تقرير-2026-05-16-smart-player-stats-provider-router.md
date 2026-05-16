# تقرير 2026-05-16 - Smart Player Stats Selection + Provider Router

## الهدف

هذه المرحلة نقلت قالب إحصائيات اللاعبين من فكرة "اجلب كل شيء دائمًا" إلى نظام ذكي يطلب فقط الإحصائيات التي يختارها صانع المحتوى قبل الجلب. الهدف هو تقليل التكلفة، منع تكديس القالب بالأرقام، وتحضير النظام لمصادر متعددة مثل FBref، جسر بيانات المباراة، ومصادر xG مستقبلية.

## ما تم تنفيذه

1. إنشاء كتالوج المقاييس:
   - الملف: `public/stats/metrics.catalog.json`
   - يحتوي على 68 مقياسًا.
   - كل مقياس يحتوي: `key`, `label`, `labelAr`, `category`, `type`, `unit`, `bestFor`, `supportedModes`, `providers`, `preferredProvider`, `seasonSupported`, `matchSupported`, `cacheTtlMinutes`, `cost`, `dependencies`.

2. تطوير واجهة Player Stats Lab:
   - Presets ذكية بدل عشرات الأزرار المباشرة.
   - تصنيفات قابلة للتفعيل مثل: Attack, Shooting, Passing, Defense, Per 90, Goalkeeping.
   - Advanced drawer مع بحث واختيار متعدد.
   - دعم كتابة عربي/إنجليزي مثل: "الأهداف المتوقعة، التسديدات، المراوغات" وتحويلها إلى metric keys.
   - لا يتم طلب البيانات من `/api/player-stats` قبل وجود `selectedMetrics`.

3. تحديث عقد الطلب:
   - عند الضغط على Fetch يتم إرسال:

```json
{
  "mode": "SINGLE",
  "providerPolicy": "auto",
  "player": { "name": "Robert Lewandowski", "club": "Barcelona" },
  "comparisonPlayers": [],
  "season": "2025-2026",
  "selectedMetrics": ["goals", "xg", "shots"],
  "presentation": {
    "heroMetrics": ["goals", "xg"],
    "secondaryMetrics": ["shots"],
    "visualVariant": "ULTRA_LAB"
  }
}
```

4. تحديث `/api/player-stats`:
   - يدعم `POST` ويمرر `selectedMetrics` إلى الجسر.
   - يحافظ على إرسال `Authorization: Bearer` من `REO_PLAYER_STATS_BRIDGE_TOKEN`.
   - لا يطبع التوكن ولا يرسله إلى المتصفح.
   - إذا لم يوجد التوكن، يبقى الطلب يعمل بدون كسر.

5. تحديث VPS Bridge:
   - تمت إضافة:
     - `providers/router.js`
     - `providers/demoProvider.js`
     - `providers/fbrefProvider.js`
     - `providers/matchBridgeProvider.js`
     - `cache/metrics.catalog.json`
   - الراوتر يختار المصدر حسب `providerPolicy` والمقياس.
   - المقاييس الموسمية تذهب افتراضيًا إلى `fbrefProvider`.
   - مقاييس المباراة يمكن توجيهها إلى `matchBridgeProvider`.
   - أي فشل في provider يرجع warning ولا يكسر الرد.

6. توحيد شكل الاستجابة:

```json
{
  "ok": true,
  "bridgeConfigured": true,
  "auth": { "required": true, "provided": true, "valid": true },
  "source": "reo-vps-player-stats-provider-router",
  "mode": "SINGLE",
  "providerPlan": [],
  "selectedMetrics": [],
  "players": [],
  "warnings": [],
  "generatedAt": "ISO_DATE"
}
```

7. إصلاح صور قالب ميركاتو - مصفوفة توقعات الانتقال:
   - القالب صار يقرأ `image`, `playerImage`, أو `renderImage` من عناصر السوق.
   - إذا لم توجد صورة مباشرة، يحاول حل هوية اللاعب من كاش `players.json`.
   - تم إضافة حقل `playerImage` للقالب حتى يمكن إدخال صورة يدويًا عند الحاجة.

8. إضافة مظهر متعدد للقوالب:
   - تمت إضافة `visualVariant` لقوالب الميركاتو.
   - تمت إضافة `playerStatsVisualVariant` لقالب إحصائيات اللاعبين.
   - الهدف هو السماح بعدة أساليب عرض دون نسخ قالب جديد لكل لون أو شكل.

## حالة الحماية

لم يتم تغيير إعدادات التوكن. على الـ VPS بقيت:

- `REQUIRE_AUTH=true`
- التوكن موجود في PM2
- الطلب التجريبي رجع:
  - `auth.required=true`
  - `auth.provided=true`
  - `auth.valid=true`

## نتائج الاختبار

- `npm run lint`: نجح.
- `npm run build`: نجح.
- اختبار مباشر على VPS لجلب مقاييس محددة فقط نجح، والرد رجع فقط:
  - `goals`
  - `xg`
  - `shots`
  - `dribbles_completed`

## كيف نستفيد لاحقًا

1. إضافة Providers حقيقية تدريجيًا:
   - `fbrefProvider` للموسم وPer90.
   - `matchBridgeProvider` لبيانات المباراة المباشرة.
   - `understatProvider` لاحقًا لـ xG/xA.
   - `sportmonksProvider` إذا قررنا استخدام API مدفوع ومنظم.

2. بناء ذكاء اختيار اللاعب:
   - عند كتابة اسم عربي مثل "لامين يامال برشلونة"، يتم ربطه من `players.json`.
   - بعدها يختار القالب الصورة الصغيرة أو الرندر حسب نوع التصميم.

3. تطوير العرض:
   - القالب لا يعرض كل الإحصائيات.
   - يعرض `heroMetrics` أولًا، ثم `secondaryMetrics`، ثم بقية المختار فقط.
   - هذا يجعل البث أخف وأوضح وأكثر احترافية.

## ملاحظات مهمة

- لا يجب إضافة 60 زرًا ظاهرًا في الواجهة.
- أي Provider جديد يجب أن يرجع نفس شكل `stats[metricKey]`.
- لا يتم طلب إحصائيات حقيقية قبل اختيار `selectedMetrics`.
- يجب بقاء التوكن داخل السيرفر فقط.
