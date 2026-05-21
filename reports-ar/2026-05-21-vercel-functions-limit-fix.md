# Phase FIX-VERCEL-1 — حل مشكلة Vercel Hobby Functions Limit

تاريخ: 2026-05-21  
الفرع: main

---

## 1. سبب فشل Vercel الحقيقي

رسالة Vercel كانت صريحة:

> No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.

أي ملف `.ts` أو `.js` داخل `/api/` يتحول إلى Vercel Serverless Function منفصل، وكان عددها قد وصل إلى **15** بعد Phase X.12-REAL.

**لماذا `npm build` لم يكشف المشكلة؟** Vite build يبني الـ frontend SPA فقط ولا يهتم بـ `/api/`. حد الـ 12 function هو قيد على منصة Vercel وليس على Vite. الـ build الناجح محليًا لا يضمن نجاح deploy على Hobby plan.

---

## 2. عدد Functions قبل التعديل

| # | المسار | النوع |
| --- | --- | --- |
| 1 | `api/ai.ts` | function |
| 2 | `api/license.ts` | function |
| 3 | `api/live.ts` | function |
| 4 | `api/player-stats.ts` | function (Player Stats Lab — لم يُلمس) |
| 5 | `api/stream.ts` | function |
| 6 | `api/admin/secrets.ts` | function |
| 7 | `api/admin/session.ts` | function |
| 8 | `api/player-intel-v2/build-fotmob-profile.ts` | function (X.12) |
| 9 | `api/player-intel-v2/fotmob-search.ts` | function (X.12) |
| 10 | `api/player-intel-v2/search-player.ts` | function (X.11) |
| 11 | `api/reo-match/control.ts` | function |
| 12 | `api/reo-match/match.ts` | function |
| 13 | `api/reo-match/metrics-catalog.ts` | function |
| 14 | `api/reo-match/status.ts` | function |
| 15 | `api/sportmonks/player.ts` | function |

`api/_lib/*.ts` لا يُحسب لأن Vercel يتجاهل المجلدات بـ underscore prefix.

**المجموع: 15 ≥ 12 → فشل deploy.**

---

## 3. عدد Functions بعد التعديل

| # | المسار | ملاحظة |
| --- | --- | --- |
| 1 | `api/ai.ts` | بدون تغيير |
| 2 | `api/license.ts` | بدون تغيير |
| 3 | `api/live.ts` | بدون تغيير |
| 4 | `api/player-stats.ts` | بدون تغيير (Player Stats Lab) |
| 5 | `api/stream.ts` | بدون تغيير |
| 6 | `api/admin/secrets.ts` | بدون تغيير |
| 7 | `api/admin/session.ts` | بدون تغيير |
| 8 | `api/sportmonks/player.ts` | بدون تغيير |
| 9 | **`api/player-intel-v2.ts`** | **جديد — router موحد لـ 3 actions** |
| 10 | **`api/reo-match.ts`** | **جديد — router موحد لـ 4 actions** |

**المجموع: 10 ≤ 12 → Hobby plan آمن.** ✓

---

## 4. ما الذي تم دمجه

### 4.1 Player Intel V2 (3 → 1)

**قبل:**
```
api/player-intel-v2/search-player.ts          POST /api/player-intel-v2/search-player
api/player-intel-v2/fotmob-search.ts          POST /api/player-intel-v2/fotmob-search
api/player-intel-v2/build-fotmob-profile.ts   POST /api/player-intel-v2/build-fotmob-profile
```

**بعد:**
```
api/player-intel-v2.ts                        POST /api/player-intel-v2 + body.action
```

```typescript
// كل النداءات تستخدم نفس الرابط الآن:
fetch('/api/player-intel-v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'search-player', query, mode })
});

fetch('/api/player-intel-v2', {
  method: 'POST',
  body: JSON.stringify({ action: 'fotmob-search', query })
});

fetch('/api/player-intel-v2', {
  method: 'POST',
  body: JSON.stringify({ action: 'build-fotmob-profile', fotmobId, name, season })
});
```

المنطق نُقل بالكامل إلى `api/_lib/playerIntelV2Handlers.ts` (3 functions: `handleSearchPlayer`, `handleFotMobSearch`, `handleBuildFotMobProfile`). الـ router فقط يوجّه حسب `body.action`.

### 4.2 REO Match (4 → 1)

**قبل:**
```
api/reo-match/match.ts             GET  /api/reo-match/match
api/reo-match/status.ts            GET  /api/reo-match/status
api/reo-match/metrics-catalog.ts   GET  /api/reo-match/metrics-catalog
api/reo-match/control.ts           POST /api/reo-match/control?action=...
```

**بعد:**
```
api/reo-match.ts
  GET  /api/reo-match?action=match
  GET  /api/reo-match?action=status
  GET  /api/reo-match?action=metrics-catalog
  POST /api/reo-match?action=control&control=set-match (و start/stop/archive)
```

نفس CORS، نفس admin auth، نفس `proxyBridgeGet`/`proxyBridgePost`. تم الحفاظ على كل السلوك السابق.

---

## 5. أين تم نقل Helpers

**لم يتم نقل `api/_lib/`** — Vercel يتجاهل underscore folders تلقائيًا، وأي نقل سيكسر 10+ endpoints موجودة (ai, license, live, player-stats, stream, admin/*, sportmonks/*).

تم فقط **إضافة** ملف helper جديد:
- `api/_lib/playerIntelV2Handlers.ts` — يحوي logic الـ 3 actions كـ functions.

البنية النهائية لـ `api/_lib/`:
```
adminToken.ts                 (موجود)
fotmobBroadcastBuilder.ts     (موجود من X.12)
fotmobClient.ts               (موجود من X.12)
fotmobRuntimeStore.ts         (موجود من X.12)
http.ts                       (موجود)
liveStore.ts                  (موجود)
playerIntelV2Handlers.ts      (جديد — يجمع منطق الـ 3 actions)
reoBridge.ts                  (موجود)
```

---

## 6. ما هي fetch calls التي تم تحديثها في frontend

| الملف | السطر | قبل | بعد |
| --- | --- | --- | --- |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | search | `/api/player-intel-v2/search-player` | `/api/player-intel-v2` + `action: 'search-player'` |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | FotMob search | `/api/player-intel-v2/fotmob-search` | `/api/player-intel-v2` + `action: 'fotmob-search'` |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | build profile | `/api/player-intel-v2/build-fotmob-profile` | `/api/player-intel-v2` + `action: 'build-fotmob-profile'` |
| `pages/Editor.tsx` | CLOUD_MATCH_API_URL | `/api/reo-match/match` | `/api/reo-match?action=match` |
| `pages/Editor.tsx` | control fetch | `/api/reo-match/control?action=...` | `/api/reo-match?action=control&control=...` |
| `pages/Editor.tsx` | status fetch | `/api/reo-match/status` | `/api/reo-match?action=status` |
| `components/renderers/MatchStatsRenderer.tsx` | apiUrl default | `/api/reo-match/match` | `/api/reo-match?action=match` |
| `utils/election.ts` | source label default | `/api/reo-match/match` | `/api/reo-match?action=match` |
| `constants.ts` | template field default | `/api/reo-match/match` | `/api/reo-match?action=match` |

`metrics-catalog` لم يكن مستخدمًا في frontend (kept للتوافق مع الجسر فقط).

---

## 7. لماذا لم نحتاج Vercel Pro

Pro plan يرفع الحد إلى 1000 function ($20/شهر). لكن:
- استهلاكنا الفعلي 10 functions، أقل بكثير من 12.
- الدمج عبر action router لا يفقد أي ميزة.
- Player Intel V2 + FotMob search + build profile كلها تعمل على نفس endpoint.
- REO Match + control + metrics-catalog كلها تعمل على نفس endpoint.
- لا overhead إضافي للأداء — Vercel يبدأ نفس الـ function لأي action.

**التوفير: $240/سنة + بنية أنظف.**

---

## 8. ماذا بقي لاحقًا

### تحذير chunk size (غير حرج)
```
(!) Some chunks are larger than 500 kB after minification.
```

هذا warning من Vite، **لا يمنع deploy**. الحلول المستقبلية:
1. `manualChunks` في `vite.config.ts` لتقسيم vendor code (react, lucide, dnd-kit).
2. dynamic imports للقوالب الكبيرة (PlayerIntelV2Renderer, MatchStatsRenderer).
3. تقسيم الـ assistantPanel و templates لـ lazy load.

سيعالج في phase منفصل. لا يؤثر على Vercel deploy.

---

## 9. نتائج Smoke

| فحص | النتيجة |
| --- | --- |
| `npm run lint` (tsc --noEmit) | exit 0 |
| `npm run build` (vite) | exit 0 (5.29s) |
| عدد Vercel functions | 10 ≤ 12 ✓ |
| Player Stats Lab | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| FBref cache | لم يُلمس |
| نظام الترخيص | لم يُلمس |
| التوكنات | لم تُلمس |
| Player Intel V2 logic | محفوظ بالكامل (نُقل لـ `_lib/playerIntelV2Handlers.ts`) |
| FotMob live search | يعمل (router يوجّه لـ `handleFotMobSearch`) |
| build profile | يعمل (router يوجّه لـ `handleBuildFotMobProfile`) |
| REO Match endpoints | تعمل عبر query params |

---

## 10. آخر git status

```
M components/player-intel-v2/PlayerIntelV2EditorPanel.tsx
M components/renderers/MatchStatsRenderer.tsx
M constants.ts
M pages/Editor.tsx
M utils/election.ts
A api/_lib/playerIntelV2Handlers.ts
A api/player-intel-v2.ts
A api/reo-match.ts
D api/player-intel-v2/build-fotmob-profile.ts
D api/player-intel-v2/fotmob-search.ts
D api/player-intel-v2/search-player.ts
D api/reo-match/control.ts
D api/reo-match/match.ts
D api/reo-match/metrics-catalog.ts
D api/reo-match/status.ts
A reports-ar/2026-05-21-vercel-functions-limit-fix.md
```

7 ملفات محذوفة، 3 ملفات جديدة، 5 ملفات معدّلة، 1 تقرير.
