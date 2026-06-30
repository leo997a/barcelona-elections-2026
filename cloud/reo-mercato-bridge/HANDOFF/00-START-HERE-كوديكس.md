# 🎯 REO Unified Transfers — دليل كوديكس (ابدأ هنا)

حزمة جاهزة لربط **جسر الانتقالات الموحّد** (FotMob × Transfermarkt) بأداة REO
`C:\New folder\barcelona-elections-2026`.

الحالة: **مبنية ومُثبتة وتعمل ببيانات حقيقية 2026/27** (staging، لم تُلمَس أداة الإنتاج).

---

## مكوّنات الحزمة

```
REO-FOTMOB-TRANSFERS/
├── server.js              ← الخادم الموحّد (feed + refresh + overview)
├── dashboard.html         ← لوحة بصرية (صور/شعارات حقيقية + تبويبات + زر تحديث)
├── overview.html          ← الصورة العامة لكل القوالب الـ32
├── lib/
│   ├── fotmobCapture.mjs   ← التقاط FotMob عبر متصفح (CDP)
│   ├── normalize.mjs       ← تطبيع + فلترة موسم 2026/27
│   └── mergeSources.mjs    ← الدمج العبقري + وسم المصادر
├── scripts/refresh-cache.mjs
├── data/transfers-*.json   ← لقطات مخزّنة (كاش)
└── HANDOFF/                ← هذه المستندات

REO-TRANSFERMARKT-INTEL/    ← الجسر المرجعي (الذاكرة الكروية) — حزمة شقيقة
```

## التشغيل المحلي (للمعاينة)

```bash
cd REO-FOTMOB-TRANSFERS
npm install                 # puppeteer-core
node scripts/refresh-cache.mjs   # التقاط أولي (يشغّل Chrome)
node server.js              # → http://127.0.0.1:4319
```
- لوحة الدمج: `http://127.0.0.1:4319/`
- الصورة العامة: `http://127.0.0.1:4319/overview`

## أين يضع كوديكس الملفات في أداة REO؟

| من الحزمة | الوجهة في `barcelona-elections-2026` |
|-----------|--------------------------------------|
| `REO-FOTMOB-TRANSFERS/` (server+lib) | `cloud/reo-transfers-bridge/` (خدمة مستقلة مثل reo-match-bridge) |
| `lib/mergeSources.mjs` | `cloud/reo-transfers-bridge/lib/` |
| مستهلِك serverless جديد | `api/transfers-live.ts` (يطابق نمط `api/player-stats.ts`) |
| `REO-TRANSFERMARKT-INTEL/` | `cloud/reo-transfermarkt-bridge/` (الحزمة الشقيقة) |

> القاعدة: **أضف ملفات جديدة فقط** + اربط عبر متغيّرات البيئة. لا تعدّل منطقاً قائماً.

## متغيّرات البيئة (تطبيق REO الرئيسي)

```
REO_TRANSFERS_BRIDGE_URL=https://<host>/api/feed
REO_TRANSFERS_BRIDGE_TOKEN=<bearer>
REO_TRANSFERMARKT_BRIDGE_URL=https://<host>/api/transfermarkt
REO_TRANSFERMARKT_BRIDGE_TOKEN=<bearer>
REO_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe   # لجسر الالتقاط
```

## خطوات الربط (مختصر)
1. انسخ المجلدين إلى `cloud/`.
2. انشر `reo-transfers-bridge` (Node + Chrome) — راجع `01-نقاط-FotMob-الحقيقية.md`.
3. أضف مستهلِك `api/transfers-live.ts` بسلّم fallback (bridge → cache → pending).
4. غذِّ قوالب الميركاتو من العقد الموحّد (راجع `02-عقد-الدمج-الموحّد.md`).
5. أضف **زر تحديث** في أدوات القالب يستدعي `/api/refresh`.
6. شغّل اختبارات العقد (`tests/transfers-bridge-contract.test.mjs`).

## المستندات
- [`01-نقاط-FotMob-الحقيقية.md`](./01-نقاط-FotMob-الحقيقية.md) — النقطة الحقيقية + التوقيع + الحل بالمتصفح.
- [`02-عقد-الدمج-الموحّد.md`](./02-عقد-الدمج-الموحّد.md) — مصفوفة المصادر + شكل البطاقة.
- [`03-تقرير-عربي-شامل.md`](./03-تقرير-عربي-شامل.md) — التقرير الشامل + المشاكل المحلولة + المتبقّي.
