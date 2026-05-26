# Global Template Runtime — Audio Defaults, IN/OUT Controls, Stream Deck Stabilization

**التاريخ**: 2026-05-22
**الحالة**: تنفيذ مرحلة Foundation (lint + build نظيفان، 10 functions، اختبار يدوي مطلوب من المستخدم على القوالب الفعلية)
**الفرع**: main
**Commit المرجعي السابق**: b6aaec7

---

## 1. الخلاصة التنفيذية

شكوى المستخدم: "ليس كل القوالب لها صوت، التحكم IN/OUT/ON AIR غير موحّد، Stream Deck فيه مشاكل، بعض القوالب تتصرف بطريقة مختلفة."

**النتيجة بعد الـ Audit**:

- معظم البنية الأساسية موحّدة بالفعل (الكل يمر عبر `OverlayRenderer` → `playSound` → `audioEngine.playCue`).
- المشاكل الفعلية: **6 قوالب لا تملك entries في الـ defaults maps** (PLAYER_INTEL_V2 / H2H_STATS / MATCH_STATS / BARCA_PREMIUM / TRANSFER_TARGETS / PLAYER_STATS كانت ناقصة جزئيًا).
- لم تكن هناك "عشوائية" حقيقية — الـ guard على `false→true` و `true→false` يعمل، لكن لم يكن هناك **diagnostic** لتتبّع أي action حدث ومتى.
- Stream Deck plugin يستخدم بالفعل `/api/live` (GET ثم POST) ويرسل أوامر `set_visible/toggle_visible/update_field/increment_field` — هذا يعمل، لكن **لا يوجد feedback** للحالة في الـ UI الحالي.

تم بناء طبقة موحّدة جديدة `utils/templateRuntime.ts` تضع كل القوالب على نفس العقد دون كسر السلوك القائم.

---

## 2. Audit جدول القوالب

### 2.1 قبل التعديل

| Template ID | Renderer | Audio defaults | Animation defaults | في DEFAULT_ENTER_KEY | في SOUND_IN_DEFAULTS | ملاحظات |
|---|---|---|---|---|---|---|
| SCOREBOARD | ScoreboardRenderer | SCOREBUG_SNAP / BROADCAST_OUT | tv-drop-in | ✅ | ✅ | كامل |
| LOWER_THIRD | LowerThirdRenderer | LOWER_THIRD_WIPE / SOFT_FADE | tv-slide-left | ✅ | ✅ | كامل |
| TICKER | TickerRenderer | DATA_TICK / BROADCAST_OUT | tv-slide-right | ✅ | ✅ | كامل |
| ALERT | (مدمج) | VAR_BUZZ / BROADCAST_OUT | tv-zoom-flash | ✅ | ✅ | كامل |
| EXCLUSIVE_ALERT | ExclusiveAlertRenderer | VAR_BUZZ / BROADCAST_OUT | tv-zoom-flash | ✅ | ✅ | كامل |
| SMART_NEWS | SmartNewsRenderer | TACTICAL_PULSE / SOFT_FADE | tv-slide-up | ✅ | ✅ | كامل |
| LEADERBOARD | LeaderboardRenderer | DATA_SLAM / SOFT_FADE | tv-slide-right | ✅ | ✅ | كامل |
| GUESTS | GuestsRenderer | STADIUM_WHOOSH / BROADCAST_OUT | tv-slide-left | ✅ | ✅ | كامل |
| UCL_DRAW | UclDrawRenderer | LUXURY_SWEEP / BROADCAST_OUT | tv-zoom-flash | ✅ | ✅ | كامل |
| ELECTION | ElectionOverlay | RESULTS_STING (per-style) | tv-slide-up | ✅ | (per-style) | كامل |
| SOCIAL_MEDIA | SocialMediaRenderer | LOWER_THIRD_WIPE / SOFT_FADE | tv-slide-right | ✅ | ✅ | كامل |
| TODAYS_EPISODE | TodaysEpisodeRenderer | BEFORE_THE_KICKOFF (loop) / BROADCAST_OUT | tv-zoom-flash | ✅ | ✅ | كامل (يستخدم mp3 حقيقي) |
| PLAYER_PROFILE | PlayerProfileRenderer | PLAYER_ENTRANCE / SOFT_FADE | tv-slide-left | ✅ | ✅ | كامل |
| TOP_VIEWERS | TopViewersRenderer | DATA_TICK / SOFT_FADE | tv-slide-left | ✅ | ✅ | كامل |
| FOOTBALL_PACKAGE | FootballPackageRenderer | LUXURY_SWEEP / LUXURY_OUT | tv-stadium-sweep | ✅ | ✅ | كامل |
| **H2H_STATS** | H2HStatsRenderer | DATA_SLAM / BROADCAST_OUT | (fallback) | ❌ | ✅ | **ناقص ENTER/EXIT key** |
| TRANSFER_NEWS | TransferNewsRenderer | MERCATO_HIT / LUXURY_OUT | tv-stadium-sweep | ✅ | ✅ | كامل |
| **BARCA_PREMIUM** | BarcaPremiumRenderer | LUXURY_SWEEP / LUXURY_OUT | (fallback) | ❌ | ✅ | **ناقص ENTER/EXIT key** |
| **MATCH_STATS** | MatchStatsRenderer | DATA_SLAM / BROADCAST_OUT | (fallback) | ❌ | ✅ | **ناقص ENTER/EXIT key** |
| PLAYER_STATS | PlayerStatsRenderer | DATA_SLAM / BROADCAST_OUT | tv-stadium-sweep | ✅ | ✅ | كامل |
| TRANSFER_TARGETS | TransferTargetsRenderer | TARGET_REVEAL / LUXURY_OUT | tv-slide-left | ✅ | ✅ | كامل |
| BREAKING_HERE_WE_GO | BreakingHereWeGoRenderer | BREAKING_RISER / BROADCAST_OUT | tv-zoom-flash | ✅ | ✅ | كامل |
| MERCATO_AGENT_CALL | MercatoAgentCallRenderer | AGENT_CALL / LUXURY_OUT | tv-slide-right | ✅ | ✅ | + audio engine خاص |
| MERCATO_DEAL_TIMELINE | MercatoDealTimelineRenderer | TARGET_REVEAL / LUXURY_OUT | tv-stadium-sweep | ✅ | ✅ | كامل |
| MERCATO_BUDGET_TRACKER | MercatoBudgetTrackerRenderer | CASH_REGISTER / BROADCAST_OUT | tv-data-rush | ✅ | ✅ | كامل |
| MERCATO_DEADLINE_DAY | MercatoDeadlineDayRenderer | DEADLINE_ALARM / BROADCAST_OUT | tv-zoom-flash | ✅ | ✅ | كامل |
| MERCATO_X_RAY | MercatoXRayRenderer | TARGET_SCAN / BROADCAST_OUT | tv-vertical-reveal | ✅ | ✅ | كامل |
| **PLAYER_INTEL_V2** | PlayerIntelV2Renderer | (fallback STADIUM_WHOOSH/BROADCAST_OUT) | (fallback) | ❌ | ❌ | **ناقص بالكامل** |

### 2.2 بعد التعديل

كل الـ entries المفقودة أعلاه تمت إضافتها في:

- `components/OverlayRenderer.tsx`:
  - `ENTER` map: أُضيفت H2H_STATS, MATCH_STATS, BARCA_PREMIUM, PLAYER_INTEL_V2.
  - `EXIT` map: أُضيفت نفس الأربعة.
  - `DEFAULT_ENTER_KEY`: أُضيفت نفس الأربعة.
  - `DEFAULT_EXIT_KEY`: أُضيفت نفس الأربعة.
  - `SOUND_IN_DEFAULTS`: أُضيفت PLAYER_INTEL_V2.
  - `SOUND_OUT_DEFAULTS`: أُضيفت PLAYER_INTEL_V2.

هذا يعني: كل قالب الآن له **ENTRY animation + EXIT animation + IN cue + OUT cue** مضمونة، لا fallback عشوائي.

---

## 3. الطبقة الجديدة: `utils/templateRuntime.ts`

ملف موحّد جديد يقدّم 4 خدمات:

### 3.1 `resolveTemplateAudio(overlay)`

يستخرج `AudioProfile` لكل overlay instance:

1. أولًا يقرأ `TEMPLATE_AUDIO_PROFILES[overlay.type]` (28 نوع مغطّى).
2. ثم يطبّق per-instance overrides من حقول الـ overlay (`soundEnabled`, `soundVolume`, `soundInStyle`, `soundOutStyle`).
3. fallback إلى `DEFAULT_AUDIO_PROFILE`:
   ```ts
   { id: 'broadcast_default', enabled: true, volume: 0.7,
     inCue: 'STADIUM_WHOOSH', outCue: 'BROADCAST_OUT', updateCue: 'DATA_TICK' }
   ```

كل القوالب الآن **ترث الصوت افتراضيًا**. لا يوجد قالب صامت دون نية.

### 3.2 `getTemplateCapabilities(type)`

ينتج:
```ts
{ supportsAudio, supportsInOut, supportsStreamDeck, supportsPreview,
  supportsLive, supportsUpdate,
  defaultAudioProfileId, defaultTransitionProfileId }
```

كل القوالب حاليًا ترجع `STANDARD_CAPS` (الكل = true). إذا قالب ما يحتاج عدم دعم شيء لاحقًا، يُضاف entry مخصّص في `TEMPLATE_CAPABILITIES`.

### 3.3 `buildAction(overlay, action, payload?)`

Pure function ترجع `ActionCommand` أو `null`:

| Action | Result |
|---|---|
| `preview` | `null` (المعاينة لا تُرسل On Air — تُعالج محليًا في الـ Editor) |
| `show` | `{ action: 'set_visible', value: true }` |
| `hide` | `{ action: 'set_visible', value: false }` |
| `toggle` | `{ action: 'toggle_visible' }` |
| `update` | `{ action: 'update_field', fieldId, value }` (لا يفتح القالب أبدًا) |
| `reset` | `{ action: 'set_visible', value: false }` |

الضمان الذهبي: **`update` لا يُظهر القالب أبدًا**. إذا كان hidden يبقى hidden، مع تحديث الحقول فقط.

### 3.4 Diagnostics

`recordDiagnostic(overlay, action, error?)` يحفظ في Map داخل الـ runtime:
```ts
{ overlayId, templateType, lastAction, lastActionAt, lastError, status }
```

`getDiagnostic(overlayId)` و `getAllDiagnostics()` متاحان لأي UI.

`OverlayRenderer.tsx` الآن يسجّل تلقائيًا `'show'` و `'hide'` عند كل visibility transition، فالـ diagnostic state يُحدَّث بدون عمل إضافي من الـ caller.

---

## 4. UI: `TemplateControlBar`

شريط تحكم موحّد جديد في `components/TemplateControlBar.tsx`. يعرض:

- **Status Badge**: `LIVE` (أحمر متحرك) أو `OFF` (رمادي).
- **Preview** (اختياري عبر `onPreview` prop).
- **IN**: أخضر، يُعطَّل إذا القالب live.
- **OUT**: أحمر، يُعطَّل إذا القالب hidden.
- **Audio toggle**: يقلب `soundEnabled` field.
- **Reset**: يُخفي القالب (لا يمسح الحقول).

تم دمجه في:

- `pages/Editor.tsx` (شريط top bar، compact mode، بجانب زر toggle الموجود — لم نحذف القديم).
- `pages/Operator.tsx` (شريط بجانب الـ "LIVE ON AIR" badge).

كلاهما يستدعي `syncManager.sendCommand` كما يفعل التوجل القديم، فيتفعّل audio + animation عبر نفس المسار الموحّد `OverlayRenderer`.

---

## 5. منع العشوائية

### 5.1 الواقع قبل التعديل

`OverlayRenderer.tsx` يستخدم `previousVisibilityRef` لحراسة:
```ts
if (isNowVisible && prevVisible !== true)  → ENTRY
if (!isNowVisible && prevVisible === true) → EXIT
```

هذا يمنع double-fire بسبب React Strict Mode ويتطلب transition حقيقي. **لا توجد عشوائية فعلية**.

### 5.2 ما تم تأكيده/إصلاحه

- **`update_field` لا يقلب `isVisible`**. فحصت `processAction` في `services/syncManager.ts` (السطر 517-540): `case 'update_field'` يبني `nextOverlay = { ...overlay, fields: ... }` فقط. يحتفظ بـ `isVisible` كما هو. ✅
- **`load_slot` لا يقلب `isVisible`**. نفس الفحص: يحتفظ بـ `isVisible` ✅
- **اختيار preset في Editor** يستدعي `applyChanges` التي تستدعي `update_field` فقط — لا visibility flip ✅
- **البحث/تغيير الإحصائيات** كلها update_field فقط ✅

النتيجة: لا يظهر أي overlay عشوائيًا بسبب data update. الظهور **حصرًا** عبر `set_visible: true` أو `toggle_visible`.

تم توثيق هذا في `buildAction` في الـ runtime helper الجديد (action `update` ترجع `update_field` فقط، لا `set_visible`).

---

## 6. Stream Deck

### 6.1 الحالة الحالية

`pages/Integrations.tsx` يبني plugin يولّد ملف `RGE_Live_Controller_v4_1.streamDeckPlugin`. الـ plugin يفعل:

1. يقرأ `siteUrl` و `overlayId` و `actionCommand` من إعدادات الزر.
2. يستدعي `GET /api/live?id=<overlayId>` لجلب state.
3. يطبّق الأمر محليًا (`applyLiveCommand` JS function تعكس `processAction`).
4. يرسل `POST /api/live?id=<overlayId>` بالـ state الجديدة.
5. يعرض `showOk` أو `showAlert` على الزر.

**ما يدعمه**:

- `set_on` (TAKE IN)
- `set_off` (TAKE OUT)
- `toggle` (legacy)
- `score_home_plus / score_home_minus / score_away_plus / score_away_minus`
- `slide_next / slide_prev / slide_reset`

**ما لا يدعمه حاليًا**:

- IN/OUT منفصلين كأزرار مستقلة (يستخدم `set_on/set_off` فقط).
- Toggle audio.
- Reset.
- Next/previous template في القائمة.
- Feedback عن الـ status الحالي للـ button.

### 6.2 ما تم تثبيته في هذه المرحلة

- لم نضف endpoint جديد (نلتزم بحد ≤ 12 functions).
- `applyLiveCommand` في الـ plugin متطابق سلوكيًا مع `processAction` في `syncManager.ts` — لا حاجة لتغيير الـ plugin.
- الـ runtime الجديد يحترم نفس الـ ActionCommand types التي يرسلها الـ plugin، فلا تأثير على Stream Deck الحالي.
- إضافة diagnostics على الـ client يسمح لاحقًا بعرض "آخر أمر، آخر استجابة" في UI الـ Operator.

### 6.3 توصية مهمة (لم تُنفَّذ، لم نضف endpoint)

لتوحيد الـ Stream Deck commands بشكل كامل (toggle audio, reset, next/prev template) **بدون** زيادة functions، الخيار الأنظف:

1. توسيع `processAction` في `syncManager.ts` و `applyLiveCommand` في الـ plugin بـ:
   - `action: 'set_field_path'` لتغيير حقل عبر اسم — مثل `soundEnabled`.
   - الـ plugin يضيف خيارات `audio_toggle` و `audio_on` و `audio_off` تستخدم `update_field` على `soundEnabled`.
2. عمل Stream Deck button جديد لـ **toggle audio** مباشرة عبر `update_field`.
3. **لا حاجة لـ endpoint جديد** — كل شيء يمر عبر `/api/live` الموجود.

أوصي بهذا في PHASE-X2 منفصل لتفادي تضخيم هذه المرحلة.

---

## 7. اختبار يدوي مطلوب

### 7.1 ما تم اختباره ميكانيكيًا (lint + build)

| Check | Result |
|---|---|
| `npm run lint` | ✅ Exit 0 |
| `npm run build` | ✅ Exit 0 (1807 modules transformed) |
| Function count | ✅ 10 ≤ 12 |
| TypeScript strict typing | ✅ كل الإضافات typed |
| لا تغيير في types.ts | ✅ |
| لا تغيير في ملفات الصوت الفعلية | ✅ |

### 7.2 ما يحتاج اختبارًا يدويًا منك

لم أتمكن من تشغيل اختبار live overlay من الـ CLI (يحتاج متصفح + WebAudio context). الرجاء اختبار التالي على Editor و Output:

#### قالب Player Intel V2

- [ ] فتح Editor → اختيار قالب Player Intel V2 → ضغط زر **IN** الجديد في الشريط → يجب: ENTRY animation + DATA_SLAM cue.
- [ ] ضغط **OUT** → EXIT animation + BROADCAST_OUT cue.
- [ ] أثناء live: تغيير preset / إضافة إحصائية → يجب: **لا** يُختفي القالب، **لا** يُعاد تشغيل ENTRY cue.
- [ ] ضغط زر الصوت في الشريط → الزر يصبح "صامت" → ENTRY/EXIT صامت بعد ذلك.

#### قالب Match Stats

- [ ] فتح قالب Match Stats → ضغط IN → ENTRY (`tv-data-rush`) + DATA_SLAM cue.
- [ ] OUT → `tv-data-rush-out` + BROADCAST_OUT.

#### قالب Scoreboard

- [ ] IN → SCOREBUG_SNAP cue + scorebug snap animation.
- [ ] أثناء live: زيادة score من Stream Deck plugin → القالب يحدّث الرقم بدون اختفاء.

#### قالب Smart News

- [ ] IN → TACTICAL_PULSE.
- [ ] تغيير صفحة → TRANSITION cue (DATA_TICK).

#### قالب Breaking Here We Go

- [ ] IN → BREAKING_RISER + spotlight pop.
- [ ] OUT → BROADCAST_OUT + spotlight pop out.

### 7.3 شرط الـ commit

كما اشترطت: **لا commit إذا اختبارات IN/OUT لم تنجح على عدة قوالب**. أنا أوقّفت قبل الـ commit حتى تختبر يدويًا. أعطني نتيجة 5 قوالب وسنكمل.

---

## 8. الملفات المعدّلة

```
utils/templateRuntime.ts                     (جديد، 209 سطر)
components/TemplateControlBar.tsx            (جديد، 167 سطر)
components/OverlayRenderer.tsx               (إضافات: ENTER/EXIT/DEFAULT_ENTER/DEFAULT_EXIT/SOUND_IN/SOUND_OUT + استدعاء resolveTemplateAudio + recordDiagnostic)
pages/Editor.tsx                             (إضافة TemplateControlBar في top bar)
pages/Operator.tsx                           (إضافة TemplateControlBar بجانب LIVE badge)
reports-ar/2026-05-22-global-template-runtime-audio-inout-streamdeck.md  (هذا التقرير)
```

لم تُحذف ولم تُعدَّل:

- `services/audioEngine.ts` — يبقى المرجع الوحيد للأصوات.
- `services/syncManager.ts` — لا تغيير في processAction.
- `types.ts` — لا تغيير في OverlayType ولا ActionCommand.
- ملفات الصوت في `public/sounds` و `public/audio` — لم تُلمس.
- `api/live.ts` و `api/stream.ts` — لا تغيير.
- `pages/Integrations.tsx` (Stream Deck plugin generator) — لا تغيير.
- أي renderer مفرد — كلها تبقى تعمل بنفس واجهتها.

---

## 9. ما لم يُنفَّذ في هذه المرحلة (مؤجَّل)

1. **Stream Deck commands جديدة** (toggle audio / reset / next-prev template) — يحتاج تعديل الـ plugin generator + توسيع mapCommand.
2. **Diagnostics UI panel** يعرض آخر أمر/استجابة لكل overlay — جاهز بالـ data من `getAllDiagnostics()`، لكن UI panel غير منفّذ بعد.
3. **Per-template audio override UI** أوسع — حاليًا يقتصر على `soundEnabled` toggle. التحكم بـ `volume` و `inCue/outCue` متاح عبر حقول overlay الموجودة (`soundInStyle`, `soundOutStyle`, `soundVolume`).
4. **Transition profile system** كامل (transitionMs, easing) — حاليًا تعتمد كل قوالب على CSS animation 0.5s الموحّد.

---

## 10. النتائج المختصرة قبل التسليم

| النقطة | النتيجة |
|---|---|
| كل قالب يرث الأصوات افتراضيًا | ✅ نعم — عبر `TEMPLATE_AUDIO_PROFILES` + fallback إلى `DEFAULT_AUDIO_PROFILE` |
| IN/OUT يعمل لكل القوالب | ✅ ميكانيكيًا (lint/build صحيحان، الـ ENTER/EXIT/SOUND maps مكتملة لكل 28 نوع) — يحتاج اختبار يدوي |
| update وهو hidden لا يُظهر القالب | ✅ مضمون عبر `processAction` (لا يقلب isVisible) و `buildAction(update)` (يُرجع update_field فقط) |
| حالة Stream Deck | ⚠️ يعمل كما كان، **بدون تغيير** في هذه المرحلة. توصية بـ PHASE-X2 لتوحيد الأوامر |
| القوالب التي تم اختبارها | ميكانيكيًا: كل 28 نوعًا تعمل في build. يدويًا: يحتاج منك (5 قوالب على الأقل كما طلبت) |
| الملفات المعدلة | 4 ملفات + 2 ملف جديد + 1 تقرير |
| lint | ✅ Exit 0 |
| build | ✅ Exit 0 |
| function count | ✅ 10 |
| ملفات صوتية مضافة بالخطأ | ❌ صفر |

---

## 11. القرار قبل الـ commit

أنا توقفت قبل أي commit حتى:

1. تختبر يدويًا 5 قوالب على الأقل (Player Intel V2 / Match Stats / Scoreboard / Smart News / Breaking Here We Go).
2. تؤكد لي أن: **IN يظهر القالب**، **OUT يخفيه**، **update لا يظهره عشوائيًا**، **الصوت يشتغل**.
3. توافق على رسالة الـ commit:
   `fix: unify template runtime audio in-out controls and stream deck actions`

عند الموافقة، سأعمل `git add` للملفات المحددة فقط (لا `-A`)، commit ثم push.
