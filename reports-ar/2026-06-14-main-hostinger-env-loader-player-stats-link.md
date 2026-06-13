# تقرير عربي - ربط التطبيق الرئيسي بجسر إحصائيات اللاعبين على Hostinger

التاريخ: 2026-06-14  
النطاق: خادم التطبيق الرئيسي فقط + تشغيل Hostinger  
الهدف: إنهاء مشكلة `bridgeConfigured=false` بعد أن أصبح جسر الإحصائيات يعمل بتوثيق صحيح.

## المشكلة

بعد إصلاح جسر الإحصائيات نفسه أصبح:

```text
/health -> authConfigured=true
/api/status مع التوكن -> auth.valid=true
```

لكن التطبيق الرئيسي بقي يعرض:

```text
bridgeConfigured=false
```

السبب العملي أن خادم التطبيق الرئيسي على Hostinger لا يقرأ متغيرات `.env` المحلية بنفسه، وكان يعتمد على حقن Hostinger فقط. هذا جعل ربط:

```text
REO_PLAYER_STATS_BRIDGE_URL
REO_PLAYER_STATS_BRIDGE_TOKEN
```

غير مضمون في runtime.

## التعديل

تمت إضافة loader بسيط داخل:

```text
server/server.ts
```

يقرأ عند تشغيل Node:

```text
.env
.env.local
../public_html/.builds/config/.env
```

ثم يضع المتغيرات في `process.env` إذا لم تكن موجودة أصلًا.

## لماذا هذا حل آمن؟

- لا يغير أي endpoint.
- لا يمس القوالب أو الصوت أو Stream Deck.
- لا يضيف dependency.
- لا يطبع أو يخزن أسرارًا داخل Git.
- يسمح بإصلاح متغيرات Hostinger مباشرة من SSH بملف `.env.local` نظيف.

## الاختبارات

تم تشغيل:

```bash
npm run lint
npm run build
```

النتيجة:

- lint ناجح.
- build ناجح.
- بقي تحذير حجم bundle الكبير كما هو سابقًا وليس من هذا التعديل.

## الخطوة التشغيلية بعد النشر

بعد نشر هذا التعديل يجب وضع ملف `.env.local` على خادم Hostinger للتطبيق الرئيسي يحتوي:

```text
REO_PLAYER_STATS_BRIDGE_URL=https://lightslategray-toad-139780.hostingersite.com/api/player-stats
REO_PLAYER_STATS_BRIDGE_TOKEN=<same-token>
```

ثم إعادة تشغيل التطبيق الرئيسي واختبار:

```text
https://peachpuff-herring-712997.hostingersite.com/api/player-stats?playerAName=Robert%20Lewandowski&playerAClub=Barcelona&selectedMetrics=goals,assists,rating
```

المتوقع:

```text
bridgeConfigured=true
auth.valid=true
```

