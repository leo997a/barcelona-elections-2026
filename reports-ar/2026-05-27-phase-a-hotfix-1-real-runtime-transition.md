# Phase A Hotfix-1 — تشغيل صوت التحديث الحقيقي على البث المباشر

**التاريخ**: 27 مايو 2026
**Commits**: `615c8f3` (الإصلاح) + `b03448f` (gate0 acceptance script)
**Trigger**: المستخدم اختبر Phase A يدويًا واكتشف أن Test UPDATE داخل Editor يعمل، **لكن** تغيير `chatLines` أو `callDuration` على البث المباشر لا يُسمع له صوت.

---

## 1. الجذر — لماذا فشل الصوت في الـ live runtime؟

### السبب الأول — `useRef` first-mount guard مكسور

`MercatoUnifiedRenderer` كان يستخدم `useRef` لتتبع watchedHash والتحقق من first-mount لتجنب false-positive عند ركوب القالب أول مرة. لكن في الواقع:

1. SSE reconnect أو Firebase resubscribe → component remount.
2. عند الـ remount، `useRef.current` يُعاد تهيئته إلى `undefined`.
3. عند أول effect بعد الـ remount، الـ guard يحسب أن "هذا أول mount" ويتجاهل التغيير.
4. النتيجة: كل تحديث يصبح "first mount" بنظر الـ guard، فلا يُطلَق `playSound('TRANSITION')` أبدًا.

### السبب الثاني — gains الـ SOFT_* cues منخفضة جدًا

حتى لو أُطلِق الصوت، الـ gains كانت 0.13 → 0.18. هذا أنعم من اللازم — أعلى من mute لكن أقل من سماع فوق OBS audio أو background sound. النتيجة: المستخدم يظن أن الصوت "لم يطلق" مع أنه أُطلق فعلًا.

---

## 2. الإصلاح — module-level state يصمد عبر remount

### `utils/templateTransitionDiagnostics.ts` (جديد، +160 سطر)

نقلت الـ state إلى module scope بدل `useRef`:

```ts
// Module-level Map keyed by overlay.id — survives remount
const _watchedHashByOverlay = new Map<string, string>();
const _lastAttemptByOverlay = new Map<string, TransitionAttempt>();
```

ثم دالة pure تقيِّم كل محاولة:

```ts
export function evaluateTransitionAttempt(
  overlay: OverlayConfig,
  watchedHash: string,
  hasPlaySound: boolean,
): TransitionAttempt {
  // 1. Seed on first sight (no fire)
  // 2. Identical hash → blocked: no_change
  // 3. Apply audio gates: master_muted, volume_zero, sfx_disabled, profile_disabled, gate_closed
  // 4. Resolve cue: no_update_cue if both audioUpdateCue and profile.updateCue empty
  // 5. Cooldown: blocked: cooldown if last attempt < 250ms
  // 6. Otherwise → blockedBy = null (allowed to fire)
}
```

8 reason codes موثَّقة:
- `master_muted` — الصوت العام مكتوم
- `volume_zero` — مستوى الصوت صفر
- `sfx_disabled` — المؤثرات معطلة
- `profile_disabled` — profile معطل
- `gate_closed` — حارس universal الـ gate أغلق
- `no_change` — watched fields لم تتغيَّر
- `no_update_cue` — لا cue معرَّف
- `cooldown` — انتظار 250ms بين محاولات

### `MercatoUnifiedRenderer` يستخدم evaluator

استبدل `useRef` بالكامل:

```tsx
useEffect(() => {
  const attempt = evaluateTransitionAttempt(config, watchedKey, !!playSound);
  if (attempt.blockedBy === null) {
    void playSound('TRANSITION');
  }
}, [watchedKey, playSound, config]);
```

النتيجة: عند remount، الـ Map الجديدة تُحدَّث من نفس watchedHash السابق، فالـ false-positive يختفي.

### رفع gains الـ SOFT_* cues

**الملف**: `services/audioEngine.ts`

| Cue | قبل | بعد |
|---|---|---|
| SOFT_CALL_CONNECT | 0.16 | 0.32 |
| SOFT_CHAT_INCOMING | 0.16 | 0.32 |
| SOFT_CHAT_OUTGOING | 0.13 | 0.30 |
| SOFT_CALL_RING_LIGHT | 0.18 | 0.32 |
| SOFT_CALL_END | 0.16 | 0.30 |
| SOFT_TYPING_PULSE | 0.13 | 0.26 |
| SOFT_CHAT_TICK | 0.13 | 0.20 |
| SOFT_RECORDING_BEEP | 0.10 | 0.18 |
| SOFT_NOTIFICATION_PULSE | 0.18 | 0.32 |

ملاحظة: المستخدم بعد ذلك (في X12) قال "ما زالت مزعجة" فأعدتُ خفضها إلى 0.20–0.22 — توازن وسط بين الـ 0.13 الأصلي و 0.32 المؤقت.

---

## 3. تحسين DiagnosticStrip (commit `615c8f3`)

أضفت قسمًا جديدًا للـ strip:

```
UPDATE: مسموح | مكتوم رئيسي | SFX OFF | لا تغيير | لا cue | تبريد
```

`reasonLabelAr(reason)` يحوِّل الـ 8 reason codes إلى نص عربي مفهوم.

النتيجة: لو المستخدم غيَّر field ولم يُسمع شيء، Strip يخبره فورًا "SFX OFF" أو "لا تغيير في الحقول المراقبة" أو "تبريد 250ms".

---

## 4. زر Test UPDATE في AudioSettingsPanel

أضفت زرًا ثالثًا في صف SFX (3 أعمدة الآن: IN / OUT / UPDATE):

```tsx
<button onClick={previewUpdate} disabled={!audioUpdateCue}>
  UPDATE
</button>
```

`previewUpdate` يقرأ `audioUpdateCue` field مباشرة من overlay (الذي كتبه `sceneToFieldUpdates` في Phase A1). Fallback إلى `DATA_TICK` لو غير معرَّف. الزر يُعرَض tooltip بالـ cue الحالي.

---

## 5. `gate0_acceptance_script.md` (commit `b03448f`)

12 سيناريو bare-minimum للمستخدم البشري لاختبار Phase A + Hotfix-1:

1. قالب Mercato Agent Call #2 مع scene `mercato_private_chat_call`.
2. Test IN في AudioSettingsPanel → يجب أن يُسمع `SOFT_CALL_RING_LIGHT`.
3. Test OUT → `SOFT_CALL_END`.
4. Test UPDATE → `SOFT_CHAT_INCOMING` (descending 1175→880Hz).
5. Apply Scene → DiagnosticStrip يعرض اسم المشهد.
6. Live Output: تغيير chatLines → UPDATE sound + Strip يعرض "مسموح".
7. Live Output: تغيير callDuration → نفس النتيجة.
8. SFX OFF + تغيير chatLines → Strip يعرض "SFX OFF" ولا صوت.
9. Mute ON + IN/OUT/UPDATE → Strip يعرض "مكتوم رئيسي".

---

## 6. ضمانات Hotfix-1

- ✅ لا breaking changes.
- ✅ لا template IDs غُيِّرت.
- ✅ `npm run lint` Exit 0.
- ✅ `npm run build` Exit 0.
- ✅ Functions = 10.
- ✅ Player Intel V2 لم يُلمس.
- ✅ Stream Deck لم يُلمس.
- ✅ Mercato/Football templates غير المعنية لم تُلمس.

---

## 7. ما لم أستطع التحقق منه

- لا أستطيع فتح browser ولا سماع الصوت.
- اعتمدت على flow trace + احتساب prevHash للـ evaluator.
- المستخدم بعد ذلك أكَّد: Test UPDATE يعمل ✓، live update يعمل ✓.

---

## ملخص الملفات

```
A  utils/templateTransitionDiagnostics.ts                 (جديد، +160 سطر)
M  components/renderers/MercatoUnifiedRenderer.tsx        (استبدال useRef بالـ evaluator)
M  components/AudioSettingsPanel.tsx                      (زر Test UPDATE)
M  components/DiagnosticStrip.tsx                         (UPDATE row + reasonLabelAr)
M  services/audioEngine.ts                                (رفع gains 0.13→0.32)
A  reports/gate0_acceptance_script.md                     (12 سيناريو QA يدوي)
```
