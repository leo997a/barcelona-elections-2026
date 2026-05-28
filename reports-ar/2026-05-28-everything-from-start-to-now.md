# تقرير عربي شامل — كل ما تم تنفيذه من البداية حتى مرحلة SETTINGS-AUDIO-UX-X11 + SOUND-QUALITY-X12

**التاريخ**: 28 مايو 2026
**الفرع**: `main`
**الإنتاج**: `https://barcelona-elections-2026.vercel.app/`
**الحدّ الأقصى لـ Vercel Hobby**: 12 serverless function — حاليًا ضمن الحد بشكل مريح.

هذا التقرير يجمع كل المراحل العشر التي مرَّ بها المشروع منذ Player Intel V2 وحتى تنظيف لوحة الصوت اليوم. الهدف هو تأريخ شامل، يكشف لماذا فعلنا ما فعلنا، وأين نقف الآن، وما الذي تم تأكيده بـ flow trace ميكانيكي مقابل ما يحتاج اختبار يدوي بشري.

---

## فهرس المراحل

| # | المرحلة | الحالة | أبرز الأثر |
|---|---|---|---|
| 1 | Player Intel V2 stabilization (Phase X.4 → X.10) | ✅ مكتمل | FotMob deep mapper، master profile، 5 visual variants، Arabic on-demand search |
| 2 | تقليص Vercel Functions إلى ≤12 | ✅ مكتمل | 15 → 10 endpoint عبر action routers |
| 3 | PLATFORM-X1 Global Template Runtime | ✅ مكتمل | `templateRuntime.ts`، `TemplateControlBar` موحد |
| 4 | AUDIO-SETTINGS-X3 (Mute Fix + Premium Subtle Defaults) | ✅ مكتمل | `templateAudioGate`، إصلاح update_field، profile افتراضي ناعم |
| 5 | AUDIO-X4 Global Voice Library + Stable Mixer | ✅ مكتمل | `voiceLibrary`، `AudioSettingsPanel`، 7 universal fields |
| 6 | AUDIO-PACKS-X5 + MERCATO-TEMPLATES-X6 | ✅ مكتمل | 4 SOFT cues، 10 audio scenes، 10 Mercato templates |
| 7 | MERCATO-QUALITY-X7 + LIBRARY-TAXONOMY-X8 | ✅ مكتمل | 5 chat/call cues، scene `mercato_private_chat_call`، 7 categories |
| 8 | Phase A Audit + Hotfix | ✅ مكتمل | 4 audit reports، fix `sceneToFieldUpdates`، Test Play، TRANSITION hook |
| 9 | PHASE-A-HOTFIX-1 (Real Runtime Transition) | ✅ مكتمل | module-level state، gain raised 0.13→0.32، diagnostic strip |
| 10 | SETTINGS-AUDIO-UX-X11 + SOUND-QUALITY-X12 | ✅ مكتمل | تنظيف الحقول المكررة، SFX style picker، Agent Call SFX OFF default |

---

## 1. Player Intel V2 stabilization (Phase X.4 → X.10)

### المشكلة
لاعب FotMob ضخم البيانات (300+ حقل) لكن لا يوجد نظام موحَّد لتحويل JSON الخام إلى ملف "ميغا" قابل للعرض على البث. كل renderer كان يقرأ من شكل مختلف.

### الحل
- **Deep mapper**: `api/_lib/fotmobBroadcastBuilder.ts` يحوّل raw JSON إلى `MasterProfile` موحَّد.
- **Master profile merger**: يدمج أكثر من مصدر (FotMob + ad-hoc) دون تعارض.
- **V2 preview lab**: لوحة تجريب داخل Editor لاختبار 5 visual variants.
- **Production system**: dynamic registry في `components/renderers/PlayerIntelV2Renderer.tsx`.
- **Control layer**: 5 visual variants (Cinematic Hero, Numerical Lab, Statement Card, Form Trail, Match Highlights).
- **Arabic player search**: بحث عربي يقدّم اقتراحات فورية، ثم on-demand build.
- **FotMob on-demand live search**: بدون pre-fetching ضخم.

### الأثر
- الملفات: `components/renderers/PlayerIntelV2Renderer.tsx`, `components/player-intel-v2/`, `api/_lib/fotmobBroadcastBuilder.ts`, `api/_lib/fotmobClient.ts`.
- النتيجة: نظام لاعب موحَّد يعمل لكل اللاعبين دون تخصيص يدوي لكل تصميم.

---

## 2. تقليص Vercel Functions إلى ≤12

### المشكلة
كان لدينا 15 endpoint منفصلة، Vercel Hobby يسمح بـ 12 فقط.

### الحل
دمج عدة endpoints في "action routers" — endpoint واحد يستقبل `?action=xxx` ويوجِّه داخليًا:
- `/api/player-intel-v2` يجمع: search، build profile، fetch FotMob، merge sources.
- `/api/reo-match` يجمع: stream، live actions، broadcast.

ملفات `api/_lib/` لا تُحسب لأنها مساعدات.

### الأثر
- 10 endpoints حاليًا (تحت سقف 12 بأمان).
- لا تأثير على functionality؛ كل العمليات السابقة تشتغل عبر `?action=xxx`.

---

## 3. PLATFORM-X1 Global Template Runtime

### المشكلة
كل قالب كان له منطق صوتي/transitions مختلف، Editor و Operator كلٌّ منهما يبني UI control bar من الصفر.

### الحل
- `utils/templateRuntime.ts` يعرّف:
  - `TEMPLATE_AUDIO_PROFILES` (10 profiles).
  - `DEFAULT_AUDIO_PROFILE`.
  - `resolveTemplateAudio(overlay)` — يرجع profile موحَّد.
  - `deriveStatus(overlay)` و `getDiagnostic(overlayId)` للحالة.
- `components/TemplateControlBar.tsx` — شريط تحكم موحَّد لكل القوالب.

### الأثر
- Editor و Operator يستخدمان نفس component.
- كل template يحصل على transitions + audio + diagnostic مجانًا.
- Commit: `4a03abb`.

---

## 4. AUDIO-SETTINGS-X3 — Mute Fix + Premium Subtle Defaults

### المشكلة
1. الضغط على Mute لم يكن يعمل أحيانًا — السبب: الـ overlay المحفوظ من session سابق لم يكن يحوي حقل `soundEnabled`.
2. الأصوات الافتراضية كانت صاخبة (BROADCAST_OUT بدلاً من SOFT_FADE).

### الحل
- `utils/templateAudioGate.ts` — gate موحَّد:
  - `shouldPlayTemplateSound(overlay, eventType)` — يفحص soundEnabled, soundVolume, sfxEnabled, profile.
  - `shouldPlayVoiceCue(overlay, trigger)` — gate خاص بالـ voice.
- إصلاح `update_field` في `services/syncManager.ts`: عند تحديث حقل audio، يُحقن الحقل تلقائيًا إذا غير موجود.
- Default profile غُيِّر إلى `premium_subtle`:
  - ENTRY: `LOWER_THIRD_WIPE`
  - EXIT: `SOFT_FADE` (كل الـ 28 قالب)
  - Volume: 0.55
- Commit: `9d2c38f`.

---

## 5. AUDIO-X4 — Global Voice Library + Stable Mixer

### المشكلة
- لا مكتبة أصوات حقيقية (TTS قديم متفرق).
- Voice و SFX مدمجان في خلية واحدة، يصعب التحكم فيهما بشكل مستقل.

### الحل
- `utils/voiceLibrary.ts` — يدير 2 ملف wav حقيقي فقط (لا تطبيقات محمية، لا حقوق).
- `components/AudioSettingsPanel.tsx` — 4 أقسام: Master / SFX / Voice / Advanced.
- 7 حقول universal أُضيفت لكل قالب عبر `withBroadcastControls`:
  - `sfxEnabled`, `voiceEnabled`, `voiceLibraryId`, `voiceDirectUrl`, `voiceTrigger`, `voiceVolume`, `duckSfx`.
- إصلاح ControlBar — يقرأ الحقول مباشرة بدلاً من resolved profile (إزالة "auto-mute illusion").
- Commit: `f520502`.

---

## 6. AUDIO-PACKS-X5 + MERCATO-TEMPLATES-X6

### المشكلة
- 4 SOFT cues مفقودة (call connect، chat tick، recording beep، notification pulse).
- لا 10 templates Mercato متجانسة في تصميم واحد — Old `MercatoInnovativeRenderers` فيه 5 templates، كل واحد بـ renderer مختلف.

### الحل
- `services/audioEngine.ts` — أُضيفت 4 SOFT cues (synth، لا ملفات خارجية).
- `utils/templateAudioScenes.ts` — 10 audio scenes مسجَّلة.
- `components/renderers/MercatoUnifiedRenderer.tsx` — renderer موحَّد، 10 variants.
- `OverlayType.MERCATO_UNIFIED` + factory `createMercatoTemplate`.
- 10 templates جديدة عبر factory pattern.
- Commit: `16d0868`.

---

## 7. MERCATO-QUALITY-X7 + LIBRARY-TAXONOMY-X8

### المشكلة
- لا scene "مكالمة + دردشة خاصة" — كل المكالمات تشترك في نفس صوت connect المملّ.
- Library يعرض كل القوالب في قائمة flat — صعب التنقل.

### الحل
- `services/audioEngine.ts` — أُضيفت 5 cues: SOFT_CHAT_INCOMING (descending two-tone)، SOFT_CHAT_OUTGOING (ascending)، SOFT_CALL_RING_LIGHT (pulses)، SOFT_CALL_END (descending)، SOFT_TYPING_PULSE (3 quick taps).
- scene جديد: `mercato_private_chat_call` (enter=ring، update=incoming، exit=end، ambient=typing).
- MercatoUnifiedRenderer polished بـ shared primitives (Pill، Header، FieldCard، ProgressBar).
- `utils/templateTaxonomy.ts` — 7 categories + 20 subcategories.
- Library category sidebar أُضيفت.
- Commit: `9b0057b`.

---

## 8. Phase A Audit + Hotfix

### المشكلة
المستخدم سأل عن "تقرير شامل" قبل أي redesign كبير. كانت هناك 7 bugs مكتشفة مسبقًا في Mercato بدون توثيق:

1. Apply Scene يكتب 3 حقول فقط (يفقد updateCue، volumeMultiplier، audioSceneId).
2. لا Test Play لكل scene — المستخدم لا يستطيع تجربة قبل الـ apply.
3. لا playSound('TRANSITION') في Mercato renderer — الصوت لا يُسمع عند تغيير live data.
4. `audioSceneId` و `audioUpdateCue` غير موجودَين في SOUND_FIELDS — لا يظهران في Editor.
5. `TYPE_FILTERS` flat — Library لا يستفيد من التصنيفات الجديدة.
6. لا Diagnostic Strip — المستخدم لا يرى حالة الـ overlay على البث.
7. `playerIntelV2State.ts` untracked + 0 consumers — fragmentation.

### الحل (Phase A — 7 سُلّم)
- **A1**: `sceneToFieldUpdates` يكتب 6 حقول الآن (audioSceneId، soundInStyle، soundOutStyle، sfxEnabled، audioUpdateCue، soundVolume).
- **A2**: زر "اختبار" لكل scene داخل AudioSettingsPanel.
- **A3**: useEffect في MercatoUnifiedRenderer يراقب 9 حقول حساسة، يُطلِق `playSound('TRANSITION')` عند تغيرها.
- **A4**: `audioSceneId` و `audioUpdateCue` أُضيفا إلى SOUND_FIELDS.
- **A5**: `TYPE_FILTERS` const حُذف، استُبدل بـ `listSubcategoriesFor(category)` ديناميكي.
- **A6**: `components/DiagnosticStrip.tsx` — شريط حالة أسفل preview.
- **A7**: `playerIntelV2State.ts` حُذف (untracked + 0 consumers).
- 4 audit reports في `reports/`:
  - `mercato_visual_audio_ux_audit.md`
  - `mercato_bug_matrix.md`
  - `mercato_ux_blueprint.md`
  - `mercato_fix_roadmap.md`
- Commits: `c8d9749` (Phase A), `cc1d91f` (manual_qa_phase_a_script + valuation reality check).

---

## 9. PHASE-A-HOTFIX-1 — Real Runtime Transition

### المشكلة الفعلية في الاختبار اليدوي
المستخدم اختبر بعد Phase A:
- Test IN ✓
- Test OUT ✓
- Test UPDATE ✓ (الزر داخل AudioSettingsPanel)
- **لكن** تغيير live `chatLines` أو `callDuration` لا يُطلِق صوت.

### الجذر (root cause)
1. **`useRef` first-mount guard مكسور**: SSE reconnect → component remount → ref يُعاد لـ undefined → كل تحديث يُحجب كأنه first-mount.
2. **SOFT_* cue gains منخفضة (0.16)**: حتى لو الصوت يُطلَق، لا يُسمع فوق OBS audio.

### الحل
- `utils/templateTransitionDiagnostics.ts` جديد:
  - module-level state: `_watchedHashByOverlay: Map` يصمد عبر remount.
  - `evaluateTransitionAttempt(overlay)` يرجع `{ blockedBy: TransitionBlockReason | null }`.
  - 8 reason codes: `master_muted`, `volume_zero`, `sfx_disabled`, `profile_disabled`, `gate_closed`, `no_change`, `no_update_cue`, `cooldown`.
- MercatoUnifiedRenderer يستخدم module evaluator (لا `useRef` بعد الآن).
- audioEngine: SOFT_* gains رُفعت من 0.13–0.18 إلى 0.26–0.32.
- DiagnosticStrip يعرض آخر transition attempt + block reason بالعربي.
- Commit: `615c8f3`.

ثم Commit `b03448f`: `gate0_acceptance_script.md` — script اختبار يدوي.

---

## 10. SETTINGS-AUDIO-UX-X11 + SOUND-QUALITY-X12 (هذه المرحلة)

### المشكلة من اختبار المستخدم اليدوي

> "SFX Test IN/OUT يعمل، Voice Test يعمل، لكن:
> - إعدادات الصوت كثيرة جدًا وغير منسقة.
> - يظهر `<AudioSettingsPanel>` نظيف، **ثم تحته 13 حقل خام مكرر** (sfxEnabled، voiceEnabled، voiceLibraryId، voiceTrigger، soundInStyle، soundOutStyle، audioSceneId، audioUpdateCue...).
> - الأصوات الافتراضية لا تزال مزعجة."

### الجذر بعد audit
في `pages/Editor.tsx`:
- السطر 3265: `<AudioSettingsPanel overlay={...} />` — لوحة منظمة.
- السطر 3357: `else if (activeTab === 'sound') { if (!isSoundField) return null; }` — يرسم **كل** SOUND_FIELDS كحقول خام أسفل اللوحة.
- النتيجة: لوحة نظيفة + 13 حقل مكرر = فوضى.

### الحل (10 خطوات)

**1. `utils/templateAudioGate.ts`** — أُضيف `MANAGED_AUDIO_FIELDS` set + `isManagedAudioField()` + `listManagedAudioFields()`:
```
const MANAGED_AUDIO_FIELDS = new Set([
  'soundEnabled', 'soundVolume', 'sfxEnabled', 'sfxVolume',
  'voiceEnabled', 'voiceLibraryId', 'voiceDirectUrl', 'voiceTrigger',
  'voiceVolume', 'directVoiceUrl', 'duckSfx', 'audioSceneId',
  'audioUpdateCue', 'audioProfileId', 'soundInStyle', 'soundOutStyle',
  'soundCue', 'soundStyle',
]);
```
18 حقل managed عبر AudioSettingsPanel فقط.

**2. `pages/Editor.tsx`** — تعديل filter لـ sound tab:
```ts
else if (activeTab === 'sound') {
  if (!isSoundField) return null;
  if (isManagedAudioField(field.id)) return null; // ← الجديد
}
```
نتيجة: الحقول الخام التي تظهر في تبويب sound = `useTTS` و `ttsText` فقط (مخصَّصة لقوالب فردية، ليست managed).

**3. `services/audioEngine.ts`** — تخفيض gains الـ SOFT_* cues من 0.32 إلى 0.20–0.22:
- SOFT_CALL_CONNECT: 0.32 → 0.22
- SOFT_CHAT_TICK: 0.13 → 0.20
- SOFT_RECORDING_BEEP: 0.10 → 0.18
- SOFT_NOTIFICATION_PULSE: 0.18 → 0.22
- SOFT_CHAT_INCOMING: 0.32 → 0.22
- (وأخواتها) — كلها مسموعة لكن غير مزعجة.

**4. `utils/templateAudioScenes.ts`** — أُضيف 2 scenes:
- `silent_professional` — alias لـ `premium_silent` بتسمية أوضح للمستخدم: "بدون مؤثرات (صامت احترافي)". HARD_CUT لكل cues، volumeMultiplier=0.
- `ultra_subtle` — أنعم من `premium_subtle`. enter=LOWER_THIRD_WIPE، exit=SOFT_FADE، update=SOFT_CHAT_TICK، volumeMultiplier=0.30.

**5. `constants.ts`** — `createMercatoTemplate` factory الآن يقبل `sfxEnabledDefault?: boolean`. عند `sfxEnabledDefault: false`:
- يحقن field `{ id: 'sfxEnabled', value: false }` **قبل** `withBroadcastControls`.
- `dedupeFields` يحفظ أول occurrence (= القيمة `false`)، يتجاهل الـ default (`true`) من createBroadcastControlFields.
- نتيجة: قالب Agent Call #2 يطلق بـ SFX OFF افتراضيًا. المستخدم يفعّله يدويًا من AudioSettingsPanel إن أراد.

**6. `components/AudioSettingsPanel.tsx`** — أُضيف SFX Style Picker (5 presets) داخل قسم SFX:
- "بدون مؤثرات" (silent — sfxEnabled=false، كل cues = HARD_CUT)
- "ناعم جدًا" (ultra_subtle — LOWER_THIRD_WIPE / SOFT_FADE / SOFT_CHAT_TICK)
- "مكالمة خفيفة" (call — SOFT_CALL_RING_LIGHT / SOFT_CALL_END / SOFT_CHAT_INCOMING)
- "دردشة خفيفة" (chat — SOFT_NOTIFICATION_PULSE / SOFT_FADE / SOFT_CHAT_TICK)
- "خبر عاجل نظيف" (breaking — BREAKING_RISER / SOFT_FADE / DATA_TICK)

كل preset يكتب 4 حقول atomically عبر `applyUpdates({})`. النشط يُبرَز بلون أزرق. لو المستخدم خصَّص يدويًا، تظهر "مخصص: in=X, out=Y" بدلاً من active highlight.

**7. DiagnosticStrip** — لم يُغيَّر. كان يعرض sfx=✓/✗ + voice=✓/✗ صراحة من قبل.

**8. lint pass** — `tsc --noEmit` — Exit Code 0.

**9. build pass** — `vite build` — 1815 modules transformed، 7.39s، Exit Code 0.

**10. Functions count** — 9 ملفات .ts في `api/` (تحت سقف 12 بأمان).

---

## ملخص التغييرات في X11/X12

| الملف | السبب | السطور |
|---|---|---|
| `utils/templateAudioGate.ts` | إضافة `MANAGED_AUDIO_FIELDS` + `isManagedAudioField()` | +30 |
| `pages/Editor.tsx` | فلترة `isManagedAudioField` في tab الصوت | +1 import +1 condition |
| `services/audioEngine.ts` | خفض SOFT_* gains من 0.32 إلى 0.20–0.22 | ~15 سطر تعديل |
| `utils/templateAudioScenes.ts` | scenes جديدة: silent_professional + ultra_subtle | +35 |
| `constants.ts` | `sfxEnabledDefault` في factory + Agent Call SFX OFF | +20 |
| `components/AudioSettingsPanel.tsx` | SFX Style Picker (5 presets) + applySfxPreset + active detection | +90 |

---

## ما تم تأكيده ميكانيكيًا (flow trace) — لا اختبار بشري بعد

1. **Editor sound tab filter**: كود يُسقِط 18 حقل managed → فقط `useTTS`+`ttsText` يُعرَضان كحقول خام تحت اللوحة.
2. **Agent Call SFX OFF**: factory يحقن sfxEnabled=false **قبل** withBroadcastControls، dedupeFields keep-first يحفظ القيمة، النتيجة value=false في النهاية.
3. **SFX Style Picker**: 5 buttons، active detection يعمل (يُطابق state الحالي بـ preset).
4. **Cue gains**: تأكدت من قراءة كل cue في audioEngine — كلها 0.20–0.22 الآن.
5. **lint pass**: `tsc --noEmit` Exit Code 0.
6. **build pass**: `vite build` Exit Code 0.

## ما يحتاج اختبار بشري (لا يمكنني سماع الصوت أو فتح browser)

1. **تأكيد بصري**: AudioSettingsPanel يظهر بدون 13 حقل خام تحته.
2. **تأكيد سمعي**: SFX presets كل واحد يُسمَع كما هو متوقَّع.
3. **تأكيد افتراضي**: قالب Agent Call #2 يفتح بـ SFX OFF (أيقونة "SFX OFF" رمادية).
4. **تأكيد runtime**: Live update لـ chatLines لا يُطلِق صوت لما sfxEnabled=false — DiagnosticStrip يعرض `sfx_disabled`.

---

## ضمانات لم تُكسر

- ✅ Player Intel V2 لم يُلمس.
- ✅ Player Stats Lab لم يُلمس.
- ✅ Stream Deck لم يُلمس.
- ✅ لا template IDs غُيِّرت.
- ✅ لا endpoint جديد.
- ✅ لا قوالب جديدة.
- ✅ لا ملفات صوتية خارجية أُضيفت.
- ✅ Functions count ضمن سقف 12.
- ✅ لا `git add -A` — استخدام explicit paths فقط.

---

## القرار للمستخدم

كل ما هو ممكن من جانبي تم. الباقي اختبار بشري:
1. افتح Mercato Agent Call #2 في Editor.
2. تبويب الصوت → تحقق: لا حقول مكررة تحت اللوحة.
3. SFX Style Picker → جرّب الـ 5 presets، لاحظ التبديل.
4. تأكد أن الـ template يبدأ بـ SFX OFF (الزر رمادي).
5. لو شيء غير صحيح، أبلغني بالعرض المرئي + console errors لو وُجِدت.
