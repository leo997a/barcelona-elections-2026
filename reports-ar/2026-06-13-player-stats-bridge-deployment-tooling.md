# تقرير مرحلة: أدوات نشر وتشغيل Player Stats Bridge

التاريخ: 2026-06-13  
المرحلة: PLAYER-STATS-BRIDGE-DEPLOYMENT-TOOLING  
الحالة: مكتملة ومتحقق منها محليًا

---

## 1. الهدف

بعد إنشاء جسر إحصائيات اللاعبين المستقل، كانت الخطوة التالية هي جعله قابلًا للنشر والتشغيل والفحص بدون كسر تطبيق Hostinger العامل.

هذه المرحلة لم تربط الجسر بعد بتطبيق REO Live الرئيسي، ولم تعدل واجهة Player Intel، ولم تلمس OBS أو Stream Deck.

الهدف العملي:

- فحص الجسر بعد نشره على Hostinger/VPS.
- استيراد بيانات لاعبين موثوقة بصيغة JSON.
- تصدير نسخة احتياطية من مخزن اللاعبين.
- حماية مخزن JSON من الكتابة فوق ملف تالف.
- توثيق أوامر PowerShell لأن بيئة التشغيل الأساسية ويندوز.

---

## 2. الملفات المضافة أو المعدلة

داخل:

```text
cloud/reo-player-stats-bridge/
```

تمت إضافة:

```text
env.example
scripts/bridge-cli-utils.mjs
scripts/remote-smoke.mjs
scripts/import-json.mjs
scripts/export-json.mjs
```

وتم تعديل:

```text
package.json
README.md
server.js
scripts/verify-contract.mjs
```

---

## 3. أوامر npm الجديدة

تمت إضافة:

```text
npm run smoke:remote
npm run import:json
npm run export:json
```

بالإضافة إلى الأمر السابق:

```text
npm run verify
```

---

## 4. فحص Remote بدون كتابة بيانات

الأمر:

```text
npm run smoke:remote
```

وظيفته:

- يفحص `/health`.
- يفحص `/api/status` بالتوكن.
- يطلب `/api/player-stats`.
- يتأكد أن `bridgeConfigured=true`.
- يتأكد أن `auth.valid=true`.
- لا يكتب أي بيانات.

يمكن تخصيص اللاعب في PowerShell:

```powershell
$env:REO_PLAYER_STATS_BRIDGE_URL="https://<bridge-host>/api/player-stats"
$env:REO_PLAYER_STATS_BRIDGE_TOKEN="<same-token>"
npm run smoke:remote -- "Bernardo Silva" "Manchester City" "goals,assists,rating"
```

---

## 5. استيراد JSON

الأمر:

```text
npm run import:json -- .\players.json
```

وظيفته:

- يقرأ ملف JSON.
- يقبل إما array مباشرة أو object يحتوي `players`.
- يرسل البيانات إلى:

```text
POST /api/control/import-json
```

الوضع الافتراضي:

```text
merge
```

وضع الاستبدال الكامل يجب استخدامه بحذر:

```text
npm run import:json -- .\players.json replace
```

---

## 6. تصدير نسخة احتياطية

تمت إضافة endpoint جديد داخل الجسر المستقل فقط:

```text
GET /api/control/export-json
```

الأمر:

```text
npm run export:json -- .\player-stats-backup.json
```

وظيفته:

- يجلب مخزن اللاعبين الحالي.
- يحفظه كملف JSON.
- لا يطبع التوكن.

هذا مهم قبل أي import بوضع `replace`.

---

## 7. حماية ملف البيانات

تم تعديل قراءة مخزن JSON:

السابق:

- أي خطأ في قراءة الملف كان يعيد مخزنًا فارغًا.

المشكلة:

- لو تلف ملف JSON في الإنتاج، قد يعتبره الجسر فارغًا ثم يكتب فوقه عند أول import/upsert.

الجديد:

- إذا كان الملف غير موجود، يبدأ بمخزن فارغ طبيعي.
- إذا كان الملف موجودًا لكنه تالف، يرجع خطأ واضح ولا يكتب فوقه.

هذا يحمي سجل اللاعبين من الضياع الصامت.

---

## 8. توثيق PowerShell

تم تحديث README بأوامر Windows PowerShell لأن `npm run ... -- --flag` قد يتصرف بشكل مزعج على ويندوز.

الأدوات الآن تقبل:

- flags مثل `--player`.
- أو positional arguments مثل:

```text
npm run smoke:remote -- "Bernardo Silva" "Manchester City" "goals,assists,rating"
```

كما تم إصلاح قراءة JSON لإزالة UTF-8 BOM الذي قد تضيفه بعض أدوات ويندوز.

---

## 9. التحقق المنفذ

تم تشغيل:

```text
npm run verify
```

النتيجة:

```text
ok=true
bridgeConfigured=true
realDataAvailable=true
goals=19
missingMetric=pending
exportedPlayers=1
```

ثم تم تشغيل فحص عملي كامل على سيرفر محلي مؤقت:

1. `smoke:remote` قبل وجود بيانات.
2. `import:json` لملف JSON مؤقت.
3. `smoke:remote` بعد الاستيراد على Bernardo Silva.
4. `export:json` إلى ملف backup مؤقت.

النتيجة النهائية:

```text
cli-tools-ok
```

ثم تم تشغيل:

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

## 10. ما لم يتم لمسه

لم يتم تعديل:

- تطبيق Hostinger العامل.
- `api/player-stats.ts`.
- `api/live.ts`.
- `api/stream.ts`.
- Player Intel UI.
- Stream Deck.
- OBS.
- License gate.
- ملفات الصوت.
- أي secrets.

---

## 11. الخطوة التالية

الخطوة التالية الصحيحة:

1. نشر `cloud/reo-player-stats-bridge` كـ Node.js app مستقل.
2. ضبط token جديد خاص بالجسر.
3. تشغيل:

```text
npm run smoke:remote
```

4. استيراد أول ملف JSON موثوق.
5. تشغيل smoke مرة ثانية للتأكد أن `realDataAvailable=true`.
6. بعدها فقط نضيف إلى تطبيق REO Live الرئيسي:

```text
REO_PLAYER_STATS_BRIDGE_URL
REO_PLAYER_STATS_BRIDGE_TOKEN
```

بهذا يبقى البث الحالي آمنًا، ويتم تفعيل Player Intel الحقيقي تدريجيًا بدون مخاطرة.

