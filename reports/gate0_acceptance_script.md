# GATE 0 — Acceptance QA Script for Hotfix `615c8f3`

**أنا لا أستطيع تنفيذ هذا الاختبار**. أحتاجك أنت تختبر يدويًا في متصفح حقيقي وتملأ النتائج. الوقت المتوقّع: 10-15 دقيقة.

**القاعدة الصارمة**: لا commit إضافي قبل GATE 0 ينجح فعلًا في المتصفح.

---

## التحضير قبل البدء

1. شغّل المشروع محليًا: `npm run dev`
2. افتح المتصفح على `http://localhost:5173/` (أو الـ port الذي يعرضه vite).
3. **مهم**: انقر في أي مكان أولًا لـ unlock audio (يظهر prompt).
4. افتح DevTools console للمتابعة (F12).
5. افتح صفحتين: Editor + نافذة output منفصلة (زر "افتح output" في top bar).

---

## السيناريوهات الـ 12

### Test G0-1 · Audio Scene picker يعمل + Test IN

| | |
|---|---|
| الإعداد | Editor → افتح "ميركاتو — مكالمة الوكيل المباشرة #2" → تبويب الصوت |
| الخطوات | 1. اكشف قسم "مشهد صوتي" (ربما collapsed). 2. ابحث عن "مكالمة/دردشة خاصة". 3. اضغط زر "اختبار" بجانبه. |
| Expected | صوت "ring" مزدوج (660Hz × 2 pulses) مسموع وليس مزعج |
| Actual sound | _____________________ |
| PASS/FAIL | _____________________ |
| ملاحظة | لو لا صوت أبدًا: تحقق من unlock audio أو volume في system |

### Test G0-2 · Test IN في Audio tab يعمل بعد Apply Scene

| | |
|---|---|
| الإعداد | بعد G0-1 |
| الخطوات | 1. اضغط "تطبيق" بجانب نفس scene. 2. اضغط زر "IN" (ليس "اختبار scene") في قسم SFX. |
| Expected | نفس الصوت (`SOFT_CALL_RING_LIGHT`) لأن `soundInStyle` تم تحديثه |
| Actual | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-3 · Test OUT في Audio tab يعمل

| | |
|---|---|
| الخطوات | اضغط زر "OUT" في قسم SFX |
| Expected | صوت `SOFT_CALL_END` (descending 700→500Hz)، ناعم |
| Actual | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-4 · Test UPDATE الجديد يعمل

| | |
|---|---|
| الإعداد | بعد Apply Scene (G0-2) — `audioUpdateCue` يجب أن يكون `SOFT_CHAT_INCOMING` |
| الخطوات | 1. ابحث عن زر "UPDATE" أصفر في قسم SFX (الزر الثالث في صف 3 أعمدة). 2. اضغطه. 3. تحت الأزرار يجب أن تظهر "cue حالي: SOFT_CHAT_INCOMING". |
| Expected | صوت "incoming chat" (descending 1175→880Hz) مسموع بوضوح |
| Actual | _____________________ |
| Cue الحالي المعروض | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-5 · Diagnostic Strip يعرض Scene الحالي

| | |
|---|---|
| الإعداد | بعد G0-2 |
| الخطوات | انظر للشريط الرفيع أسفل preview |
| Expected | يعرض: `LIVE/OFF · last action · Audio: ON · ✨ مكالمة/دردشة خاصة` |
| Actual نص الشريط | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-6 · Live chatLines update يُسمَع في Output (الاختبار الحاسم)

| | |
|---|---|
| الإعداد | 1. بعد G0-2. 2. اضغط "Take IN" في top bar. 3. افتح output في نافذة جديدة (زر "افتح output"). 4. ضع النافذتين جنبًا إلى جنب. 5. ارفع volume الـ output |
| الخطوات | 1. في Editor → تبويب "أساسي/المحتوى" → ابحث عن field "محادثة JSON". 2. عدّل الـ JSON (غيّر نص رسالة موجودة، أو أضف رسالة جديدة). 3. اضغط خارج الحقل لـ commit. |
| Expected في output | صوت `SOFT_CHAT_INCOMING` يُسمَع (~0.2 ثانية، مسموع بوضوح بعد رفع gain إلى 0.32) |
| Actual sound | _____________________ |
| Diagnostic Strip بعد التغيير | _____________________ |
| PASS/FAIL | _____________________ |
| **هذا هو الاختبار الذي فشل قبل hotfix** | لو فشل ثانيًا: أوقف. لا تكمل. أرسل لي السبب من الـ DiagnosticStrip |

### Test G0-7 · Live callDuration update يُسمَع

| | |
|---|---|
| الإعداد | الـ overlay ما زال live |
| الخطوات | عدّل field "مدة المكالمة" (غيّره من `03:42` إلى `04:15` مثلاً) |
| Expected | نفس صوت `SOFT_CHAT_INCOMING` يُسمَع |
| Actual | _____________________ |
| Diagnostic | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-8 · SFX OFF يحجب UPDATE + يظهر السبب

| | |
|---|---|
| الإعداد | overlay live |
| الخطوات | 1. تبويب الصوت → اضغط "SFX OFF". 2. عدّل chatLines مرة أخرى. |
| Expected | لا صوت. Diagnostic Strip: `UPDATE: المؤثرات معطلة (SFX OFF)` |
| Actual | _____________________ |
| النص في Diagnostic | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-9 · Mute ON يحجب الكل

| | |
|---|---|
| الخطوات | 1. SFX ON أعد للوضع الطبيعي. 2. اضغط زر Mute في TemplateControlBar (أعلى Editor). 3. غيّر chatLines. |
| Expected | لا صوت. Diagnostic Strip: `Audio: OFF` و `UPDATE: الصوت العام مكتوم` |
| Actual | _____________________ |
| Diagnostic | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-10 · Initial load لا يطلق UPDATE

| | |
|---|---|
| الإعداد | تأكد Mute OFF, SFX ON, scene applied |
| الخطوات | 1. أعد تحميل صفحة output (F5). 2. انتظر حتى overlay يظهر. 3. **لا تعدّل أي شيء** لمدة 5 ثوانٍ. |
| Expected | لا cue على التحميل. Diagnostic Strip: `UPDATE: أول mount — لا يصدر صوت` |
| Actual | _____________________ |
| Diagnostic | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-11 · لا double sound

| | |
|---|---|
| الخطوات | 1. عدّل chatLines مرة. 2. عدّل callDuration بسرعة (في نفس الثانية). |
| Expected | صوت واحد لكل تغيير حقيقي، ليس صوتان متراكبان |
| Actual | _____________________ |
| PASS/FAIL | _____________________ |

### Test G0-12 · Volume = 0 يحجب

| | |
|---|---|
| الخطوات | 1. ضع master volume slider على 0. 2. عدّل chatLines. |
| Expected | لا صوت. Diagnostic: `UPDATE: مستوى الصوت صفر` |
| Actual | _____________________ |
| Diagnostic | _____________________ |
| PASS/FAIL | _____________________ |

---

## جدول النتائج (املأه وأرسله لي)

| Test ID | PASS/FAIL | Diagnostic message |
|---|---|---|
| G0-1 Test scene play | ___ | n/a |
| G0-2 Test IN | ___ | n/a |
| G0-3 Test OUT | ___ | n/a |
| G0-4 Test UPDATE button | ___ | n/a |
| G0-5 Strip shows scene | ___ | _________________ |
| **G0-6 Live chatLines update** | ___ | _________________ |
| G0-7 Live callDuration update | ___ | _________________ |
| G0-8 SFX OFF blocks | ___ | _________________ |
| G0-9 Mute ON blocks | ___ | _________________ |
| G0-10 Initial load silent | ___ | _________________ |
| G0-11 No double sound | ___ | n/a |
| G0-12 Volume=0 blocks | ___ | _________________ |

---

## معايير القرار

- **12/12 PASS أو 11/12 (واحد cosmetic فقط)** → نبدأ SETTINGS-UX-X11.
- **G0-6 أو G0-7 FAIL** (الاختبار الحاسم) → نعمل hotfix محدد جديد. لا UX cleanup.
- **3+ FAIL** بأسباب مختلفة → audit أعمق قبل أي تعديل.

---

## لو فشل، الـ Diagnostic Strip سيخبرنا بالسبب

`templateTransitionDiagnostics.ts` يسجّل 8 reasons:

| Reason الإنجليزي | Reason العربي | المعنى |
|---|---|---|
| `master_muted` | الصوت العام مكتوم | `soundEnabled = false` |
| `sfx_disabled` | المؤثرات معطلة (SFX OFF) | `sfxEnabled = false` |
| `volume_zero` | مستوى الصوت صفر | `soundVolume <= 0` |
| `profile_disabled` | profile معطل | runtime profile guard |
| `no_field_change` | لا تغيير في الحقول المراقبة | `watchedKey` لم يتغيّر |
| `first_mount_seeded` | أول mount — لا يصدر صوت | initial seed |
| `no_play_sound_prop` | playSound prop مفقود | bug في props |
| `no_overlay_id` | overlay بدون id | bug في overlay model |

**لو الـ DiagnosticStrip يقول `سُمع` لكن لا تسمع شيئًا**: المشكلة في:
- system volume (تحقق من mixer)
- output window mute (تحقق من tab mute)
- audio context locked (انقر مرة في output window)

**لو الـ DiagnosticStrip يقول `no_field_change`**: الـ chatLines update لا يصل إلى overlay. ابعث لي screenshot.

**لو الـ DiagnosticStrip يقول `first_mount_seeded` رغم أنك عدّلت بالفعل**: bug جديد في module-level state. ابعث لي.

---

## ما سأفعله بعد نتيجتك

| نتيجتك | ما أفعله |
|---|---|
| 11-12/12 PASS | أبدأ SETTINGS-UX-X11 (Audio tab cleanup فقط، حذف تكرار) |
| G0-6/G0-7 فشلا | hotfix-2 محدد بناءً على الـ DiagnosticStrip reason |
| فشل عام | لا commit. اعيد audit قبل أي تعديل |

أنتظر النتائج. لا commit إضافي قبل ذلك.
