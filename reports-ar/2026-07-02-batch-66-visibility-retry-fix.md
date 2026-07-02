# تقرير دفعة 66 — إصلاح جذري لمشكلة الظهور والإخفاء في البث المباشر

التاريخ: 2026-07-02

## الأعراض

أزرار IN/OUT في غرفة التحكم (Operator) كانت تُضغط لكن القالب في رابط `/output/` لا يستجيب أحياناً، أو يتجمّد على حالة قديمة.

## التحليل الجذري

### خطأ 1 — `publishOverlaySnapshotWithRetry` يُولِّد clientVersion جديداً في كل retry

في `services/syncManager.ts`، دالة `publishOverlaySnapshotWithRetry` كانت تستدعي `this.publishOverlaySnapshot(overlay)` داخل كل محاولة. هذه الدالة تستدعي `this.nextLiveClientVersion()` في كل مرة، فتُولِّد `clientVersion` متصاعد.

**النتيجة الكارثية:** لو نجح أمر OUT بـ `clientVersion=1001` وفشل أمر IN الأول بـ `clientVersion=1000` ثم أعاد المحاولة بعد 250ms بـ `clientVersion=1003`، وصل الخادم بـ state `isVisible:true` بـ clientVersion=1003 أعلى من كل شيء سابق → يُكتب فوق حالة OUT → القالب يعود مرئياً بدون أمر من المشغّل.

**الإصلاح:** تجميد `clientVersion` و `body` مرة واحدة قبل أول محاولة، وإعادة استخدام نفس `body` في كل retry بدون إعادة استدعاء `nextLiveClientVersion()`.

### خطأ 2 — `applyMissingState` يُستدعى خطأً على response 200

في `App.tsx`، دالة `fetchLiveState` كانت تستدعي `applyMissingState()` (التي تُخفي القالب قسراً بـ `isVisible:false`) في نهايتها إذا لم يتطابق `data.state.id === id`.

**النتيجة:** في أي حالة حافّة — تغيُّر تنسيق الـ response، أو race condition في الـ polling، أو response جزئي — كان القالب يُخفى رغم وجود state صحيح على الخادم.

**الإصلاح:** حذف `applyMissingState()` من مسار 200 في `fetchLiveState`. الآن تُستدعى فقط على 404/410 الصريح. إذا جاء response بشكل غير متوقع، يُحافَظ على آخر حالة معروفة.

## الملفات المُعدَّلة

| الملف | التغيير |
|-------|---------|
| `services/syncManager.ts` | تجميد `clientVersion` و `body` في `publishOverlaySnapshotWithRetry` و `publishProgramSnapshotWithRetry` |
| `App.tsx` | حذف `applyMissingState()` من مسار 200 في `fetchLiveState` |
| `tests/mondial-runtime-controls.test.mjs` | اختباران جديدان يثبتان الإصلاحين |

## التحقق

```
node --test tests/mondial-runtime-controls.test.mjs tests/template-image-export.test.mjs
→ 22/22 pass

npx tsc --noEmit → نجح
npx tsc -p tsconfig.server.json --noEmit → نجح
npx vite build → نجح
```

## السيناريو المصلَح

```
المشغّل: IN   → clientVersion=1000 → يُرسَل ويُحفظ ✓
المشغّل: OUT  → clientVersion=1001 → يُرسَل ويُحفظ ✓ → القالب يختفي
retry OUT      → يُعيد نفس body بنفس clientVersion=1001 → liveStore يتجاهله لأن stateChanged=false ✓
المشغّل: IN   → clientVersion=1002 → يُرسَل ويُحفظ ✓ → القالب يظهر
```

لم يعد بإمكان الـ retry أن يكتب state قديم فوق state أحدث.
