# تقرير مرحلة: تجهيز نشر Hostinger وأمان الأسرار لجسر إحصائيات اللاعبين

التاريخ: 2026-06-13  
المرحلة: PLAYER-STATS-BRIDGE-HOSTINGER-RUNBOOK-AND-SECRETS  
الحالة: مكتملة ومتحقق منها

---

## 1. الهدف

بعد تجهيز جسر إحصائيات اللاعبين وأدوات الفحص والاستيراد، كانت الخطوة التالية هي جعل النشر على Hostinger أوضح وأقل عرضة للخطأ.

هذه المرحلة ركزت على:

- إعداد Runbook واضح لنشر الجسر كتطبيق Node.js مستقل.
- توليد token محلي آمن بدون طباعته في الطرفية.
- فحص ملفات JSON قبل الاستيراد.
- توثيق الأوامر العملية قبل ربط الجسر بتطبيق REO Live الرئيسي.

لم يتم لمس تطبيق Hostinger العامل، ولم يتم تعديل OBS أو Stream Deck أو Player Intel UI.

---

## 2. الملفات المضافة

تمت إضافة:

```text
cloud/reo-player-stats-bridge/HOSTINGER.md
cloud/reo-player-stats-bridge/scripts/init-secret-env.mjs
cloud/reo-player-stats-bridge/scripts/validate-json.mjs
```

وتم تعديل:

```text
cloud/reo-player-stats-bridge/package.json
cloud/reo-player-stats-bridge/README.md
```

---

## 3. Hostinger Runbook

تم إنشاء ملف:

```text
cloud/reo-player-stats-bridge/HOSTINGER.md
```

يوضح إعدادات Hostinger الدقيقة:

```text
Repository: barcelona-elections-2026
Branch: main
Root directory: cloud/reo-player-stats-bridge
Framework preset: Other / Node.js
Node.js version: 22.x
Package manager: npm
Install command: npm install
Build command: npm run verify
Start command: npm start
Entry file: server.js
```

السبب:

إذا تركنا Hostinger يكتشف المشروع من الجذر قد يراه كتطبيق Vite/Next مثل التطبيق الرئيسي، وهذا غير صحيح للجسر.

الجسر يجب أن ينشر من:

```text
cloud/reo-player-stats-bridge
```

وليس من جذر المشروع.

---

## 4. مولد الأسرار المحلي

تمت إضافة:

```text
npm run secrets:init
```

هذا الأمر:

- يولد token يبدأ بـ `rpsb_`.
- يكتب القيم داخل:

```text
.env.generated
```

- لا يطبع السر في الطرفية.
- يرفض الكتابة فوق ملف موجود إلا عند استخدام `--force`.

الملف `.env.generated` مشمول أصلًا في `.gitignore` عبر:

```text
.env.*
```

تم اختباره ثم حذف الملف الناتج حتى لا يبقى سر محلي غير مطلوب.

---

## 5. فحص JSON قبل الاستيراد

تمت إضافة:

```text
npm run validate:json
```

مثال PowerShell:

```powershell
npm run validate:json -- .\players.json
```

الفحص يتحقق من:

- وجود `players`.
- وجود `name`.
- وجود `club`.
- وجود stats object إن أمكن.
- وجود `value` داخل كل metric.
- التحذير عند غياب `provider` أو `sourceUrl`.

هذا لا يجلب بيانات ولا يخترعها؛ فقط يفحص الملف قبل إرساله للجسر.

---

## 6. أوامر npm الحالية للجسر

أصبح لدى الجسر:

```text
npm run start
npm run verify
npm run smoke:remote
npm run import:json
npm run export:json
npm run validate:json
npm run secrets:init
```

هذه تغطي دورة التشغيل الأساسية:

1. تشغيل الخدمة.
2. اختبار العقد محليًا.
3. اختبار الجسر بعد النشر.
4. فحص بيانات JSON.
5. استيراد بيانات.
6. تصدير backup.
7. توليد token محلي آمن.

---

## 7. التحقق المنفذ

تم اختبار:

```text
npm run secrets:init
```

النتيجة:

- تم إنشاء `.env.generated`.
- لم تتم طباعة السر.
- تم التأكد من وجود token.
- تم حذف الملف بعد الاختبار.

تم اختبار:

```text
npm run validate:json
```

على ملف JSON مؤقت:

```text
ok=true
playerCount=1
statCount=2
errors=[]
warnings=[]
```

ثم:

```text
npm run verify
```

النتيجة:

```text
ok=true
bridgeConfigured=true
realDataAvailable=true
missingMetric=pending
exportedPlayers=1
```

ثم من جذر المشروع:

```text
npm run lint
npm run build
```

النتيجة:

- lint ناجح.
- build ناجح.
- تحذير chunk الكبير ما زال تحذيرًا غير كاسر.

عدد functions:

```text
10
```

---

## 8. ما لم يتم لمسه

لم يتم تعديل:

- تطبيق REO Live العامل على Hostinger.
- `api/player-stats.ts`.
- `api/live.ts`.
- `api/stream.ts`.
- Player Intel UI.
- Stream Deck.
- OBS.
- License gate.
- القوالب.
- ملفات الصوت.
- أي secret حقيقي.

---

## 9. الخطوة التالية

الخطوة التالية العملية:

1. في Hostinger أنشئ Node.js app جديد.
2. استخدم `HOSTINGER.md` حرفيًا لإعداد الحقول.
3. شغّل `npm run secrets:init` محليًا أو ولّد token آمن بنفسك.
4. انسخ قيمة `REO_PLAYER_STATS_BRIDGE_TOKEN` إلى Hostinger.
5. بعد النشر افتح:

```text
https://<bridge-host>/health
```

6. ثم نفذ:

```powershell
$env:REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats"
$env:REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>"
npm run smoke:remote
```

7. بعد نجاح smoke، استورد أول ملف لاعبين موثوق.
8. بعدها فقط نربط تطبيق REO Live الرئيسي بالمتغيرين:

```text
REO_PLAYER_STATS_BRIDGE_URL
REO_PLAYER_STATS_BRIDGE_TOKEN
```

بهذا يبقى البث الحالي آمنًا، ونضيف بيانات Player Intel الحقيقية تدريجيًا.

