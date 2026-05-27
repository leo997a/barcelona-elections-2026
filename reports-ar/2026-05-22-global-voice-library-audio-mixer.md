# Global Voice Library · Audio Mixer · Stable Audio UX

**التاريخ**: 2026-05-22
**الحالة**: مكتمل ميكانيكيًا (lint + build نظيفان، 25/25 static check pass، 10 functions)
**Commit المرجعي السابق**: 9d2c38f (AUDIO-SETTINGS-X3)

---

## 1. الـ Audit الفعلي

### 1.1 لماذا "Audio Profile" كان يظهر فقط في بعض القوالب

ملف `constants.ts` السطر 2330 يُعرّف `mercatoAudioFields(defaultProfile)` التي تُحقن:

- `audioProfile` (Fabrizio Breaking / Arabic Breaking / ...)
- `voicePackId` (here-we-go / agreement-close / ...)
- `customVoiceUrl`
- `audioIntensity`
- `enableVoice`
- `enableSfx`

ثم تُستدعى **في 5 قوالب فقط** (Mercato Agent Call / Deal Timeline / Budget Tracker / Deadline Day / X-Ray). باقي الـ 23 قالب لا تملك أي حقل `voicePackId` ولا `audioProfile`. لذا الـ Voice Library كانت محصورة في Mercato.

### 1.2 لماذا المستخدم يلاحظ "auto-mute"

في `TemplateControlBar` (PHASE-X3):

```ts
const audio = resolveTemplateAudio(overlay);
// ...
{audio.enabled ? <Volume2/> : <VolumeX/>}
{audio.enabled ? 'صوت' : 'صامت'}
```

`resolveTemplateAudio` يُرجع `enabled: true` افتراضيًا لو الحقل غير موجود (بناءً على `TEMPLATE_AUDIO_PROFILES[type].enabled = true`). لكن **بعد ضغطة Mute، الحقل يُحقن بـ `false` (شكرًا لـ auto-injection)**. الزر يصبح يقرأ `false` → يعرض "صامت" → المستخدم يرى الزر تحوّل ولم يعرف لماذا.

السبب الحقيقي: الـ source-of-truth للـ "هل الزر يقول مُفعَّل؟" كان **resolved profile (يخدع البصر)** بدلاً من **field المباشر**.

### 1.3 audio fields الفعلية

| الحقل | أين يُخزَّن | يقرأه | يكتبه |
|---|---|---|---|
| `soundEnabled` | overlay.fields | OverlayRenderer.playSound, ControlBar | ControlBar.toggleAudio, AudioSettingsPanel |
| `soundVolume` | overlay.fields | OverlayRenderer.playCue, gate | AudioSettingsPanel |
| `sfxEnabled` (جديد X4) | overlay.fields | shouldPlayTemplateSound | AudioSettingsPanel |
| `voiceEnabled` (جديد X4) | overlay.fields | shouldPlayVoiceCue, useMercatoAudio | AudioSettingsPanel |
| `voiceLibraryId` (جديد X4) | overlay.fields | resolveVoiceUrl, useMercatoAudio | AudioSettingsPanel |
| `voiceDirectUrl` (جديد X4) | overlay.fields | resolveVoiceUrl | AudioSettingsPanel |
| `voiceTrigger` (جديد X4) | overlay.fields | shouldPlayVoiceCue | AudioSettingsPanel |
| `voiceVolume` (جديد X4) | overlay.fields | OverlayRenderer voice fire, AudioSettingsPanel preview | AudioSettingsPanel |
| `duckSfx` (جديد X4) | overlay.fields | (planned ducking — متاح كـ flag) | AudioSettingsPanel |
| `enableVoice/enableSfx` (Mercato legacy) | overlay.fields (Mercato فقط) | useMercatoAudio (fallback) | لم يعد UI mutator له |

**مفتاح**: IN/OUT لا يلمس أي من هذه الحقول. تأكد من ذلك بفحص `processAction` cases:
- `set_visible` يُغيّر `isVisible` فقط.
- `toggle_visible` يُغيّر `isVisible` فقط.
- `update_field` يُغيّر field واحدًا محدد بالـ id الذي يأتي من الـ caller.

لا يوجد كود يكتب `soundEnabled = false` تلقائيًا أبدًا.

---

## 2. الإصلاحات

### 2.1 ControlBar يقرأ field مباشرة (الإصلاح الأساسي للـ "auto-mute")

`components/TemplateControlBar.tsx`:

```ts
// قبل (X3)
const audio = resolveTemplateAudio(overlay);
{audio.enabled ? 'صوت' : 'صامت'}

// بعد (X4)
const soundEnabledField = overlay.fields.find(f => f.id === 'soundEnabled');
const soundEnabled = soundEnabledField === undefined ? true : soundEnabledField.value !== false;
{soundEnabled ? 'صوت' : 'صامت'}
```

النتيجة: زر Mute يعكس **الحالة الحقيقية للحقل**، بلا غموض. لا يبدو "تحول لوحده"، فهو يحدث فقط عند ضغط المستخدم.

### 2.2 Voice Library عالمية في `utils/voiceLibrary.ts`

ملف جديد يحتوي:

```ts
export const VOICE_LIBRARY: VoiceLibraryEntry[] = [
  { id: 'mercato_here_we_go', url: '/audio/voice-packs/mercato/here-we-go.wav', ... },
  { id: 'mercato_agreement_close', url: '/audio/voice-packs/mercato/agreement-close.wav', ... },
];
```

**سياسة صارمة**: كل entry يشير إلى ملف **موجود فعليًا** على القرص. لا entries لملفات وهمية. أي قالب يستطيع استدعاء `listVoicesForTemplate('PLAYER_INTEL_V2')` للحصول على نفس القائمة.

### 2.3 الحقول العالمية مُحقَنة لكل قالب

في `constants.ts → createBroadcastControlFields`، أُضيفت 7 حقول جديدة بشرط `!hasField(...)`:

| الحقل | افتراضي |
|---|---|
| `sfxEnabled` | `true` |
| `voiceEnabled` | **`false`** (لا يشتغل تلقائيًا — يحتاج تفعيل صريح) |
| `voiceLibraryId` | `'none'` |
| `voiceDirectUrl` | `''` |
| `voiceTrigger` | `'manual_only'` (لا يطلق صوتًا تلقائيًا) |
| `voiceVolume` | `0.9` |
| `duckSfx` | `true` |

كل القوالب الـ 28 ترث هذه الحقول عبر `withBroadcastControls`. **Voice Library متاحة لكل القوالب** لكنها **مخفية في الـ UI** لأن `voiceEnabled` افتراضيًا `false` — الـ `<AudioSettingsPanel>` يستعمل progressive disclosure ولا يعرض الـ dropdown إلا حين `voiceEnabled === true`.

### 2.4 `<AudioSettingsPanel>` — قسم الصوت الموحّد

مكوّن جديد في `components/AudioSettingsPanel.tsx` يعرض 4 أقسام:

- **A. Master**: `soundEnabled` toggle + `soundVolume` slider.
- **B. SFX**: `sfxEnabled` toggle + Preview IN/OUT buttons. (تفاصيل الـ cues تبقى مع الحقول الفردية في الـ legacy section).
- **C. Voice**: `voiceEnabled` toggle. عند التفعيل تظهر:
  - dropdown مكتبة أصوات (recommended أولًا حسب template type)
  - حقل رابط مباشر (له الأولوية على المكتبة)
  - dropdown trigger
  - voice volume slider
  - duck SFX checkbox
  - زر Preview Voice
- **D. Advanced**: زر Reset audio settings + معاينة JSON الحالية.

مدمج في `pages/Editor.tsx` بأعلى تبويب "صوت" لكل القوالب (باستثناء ELECTION التي لها معالج خاص).

### 2.5 Voice + SFX منفصلان عبر gate موحّد

`utils/templateAudioGate.ts`:

```ts
shouldPlayTemplateSound(overlay, eventType)
  → soundEnabled !== false
  → soundVolume > 0
  → sfxEnabled !== false (ENTRY/EXIT/TRANSITION)
  → profile.enabled !== false
  → ENTRY: isVisible === true
```

```ts
shouldPlayVoiceCue(overlay, trigger)
  → soundEnabled !== false
  → voiceEnabled === true
  → voiceVolume > 0
  → trigger === 'manual' OR voiceTrigger field === trigger
```

النتيجة: **يمكن تشغيل Voice بدون SFX** و **العكس**:

- `sfxEnabled=false` + `voiceEnabled=true` → IN لا يُشغّل cue، لكن Voice يُشغَّل (إذا trigger=on_enter).
- `sfxEnabled=true` + `voiceEnabled=false` → IN يُشغّل cue، لا voice.
- `soundEnabled=false` → كلاهما متوقف.

### 2.6 OverlayRenderer يطلق Voice cue على الـ trigger الصحيح

في `components/OverlayRenderer.tsx`:

```ts
const trigger = type === 'ENTRY' ? 'on_enter'
              : type === 'TRANSITION' ? 'on_update' : null;
if (trigger && shouldPlayVoiceCue(gateConfig, trigger)) {
  const url = resolveVoiceUrl(libraryId, directUrl);
  if (url) new Audio(url).play();
}
```

افتراضيًا `voiceTrigger='manual_only'` → لا voice على IN/OUT حتى المستخدم يبدّل. هذا يحقق شرط "**لا تشغل voice cue تلقائيًا في كل IN إلا إذا المستخدم اختار ذلك**".

### 2.7 `useMercatoAudio` يحترم الـ universal toggles

```ts
// قبل (X3)
const enableVoice = universalGate && getField('enableVoice') !== false;
const enableSfx = universalGate && getField('enableSfx') !== false;

// بعد (X4)
const voiceEnabledUniversal = getField('voiceEnabled');
const voiceEnabledResolved = voiceEnabledUniversal === undefined
  ? getField('enableVoice') !== false  // legacy fallback
  : voiceEnabledUniversal === true;
// نفس النمط لـ sfxEnabled / enableSfx
```

النتيجة: تبديل `voiceEnabled` في `<AudioSettingsPanel>` يُسكِت Mercato فورًا. الـ Mercato overlays القديمة التي تستخدم `enableVoice/enableSfx` تستمر بالعمل (backward compat).

أيضًا الـ Mercato الآن يفضّل `voiceLibraryId` الجديد على `voicePackId` القديم:

```ts
const voicePackId = universalLibraryId && universalLibraryId !== 'none'
  ? universalLibraryId : legacyPackId;
const customVoiceUrl = universalDirectUrl || String(getField('customVoiceUrl') || '');
```

---

## 3. منع Auto-Mute

### 3.1 ضمانات

- IN/OUT **لا** يكتب أي حقل صوت. التحقق المباشر في `processAction` cases (PHASE-X1): `set_visible` يُغيّر isVisible فقط.
- الـ `<TemplateControlBar>` يقرأ field مباشرة (X4 الإصلاح الأساسي) بدلاً من resolved profile.
- الـ `<AudioSettingsPanel>` لا يكتب إلا على ضغط زر/تغيير قيمة. لا useEffect يغيّر الحالة.
- `voiceTrigger` افتراضيًا `'manual_only'` → ما من سرعة pop-up أصوات بدون نية.

### 3.2 السيناريوهات المختبرة (تحقق ساكن)

| السيناريو | النتيجة المضمونة |
|---|---|
| `soundEnabled=true` + ضغط IN | `soundEnabled` يبقى `true`. عرض الزر "مُفعَّل". cue يُشغَّل. |
| `soundEnabled=true` + ضغط OUT | `soundEnabled` يبقى `true`. cue exit يُشغَّل. |
| تغيير preset/variant | لا تغيير في `soundEnabled` (presets لا تلمس audio fields). |
| `voiceEnabled=true` + IN/OUT | `voiceEnabled` يبقى `true`. voice cue يُشغَّل فقط إن `voiceTrigger='on_enter'`. |
| `sfxEnabled=false` + IN | لا cue، لكن `sfxEnabled` يبقى `false` (لا يُعاد لـ true). |

---

## 4. الأصوات الافتراضية الآن

من PHASE-X3 (مُحفَظ):

- `DEFAULT_AUDIO_PROFILE = premium_subtle`، volume 0.55، IN=`LOWER_THIRD_WIPE`، OUT=`SOFT_FADE`.
- 28 قالب OUT = `SOFT_FADE`.
- القوالب الناعمة IN = `LOWER_THIRD_WIPE`.
- القوالب التوقيعية (Mercato/Breaking/Goal/Deadline) محفوظة بأصواتها الأصلية مع volume أخفض (0.65-0.7).

X4 لم يغيّر السياسة — أبقى على defaults الناعمة وأضاف **حرية اختيار الصوت الحقيقي** كطبقة منفصلة فوقها.

---

## 5. اختبار 5 قوالب (تحقق ساكن — 25/25 PASS)

سكربت verify-audio-x4 يثبت لكل القوالب الخمسة:

| القالب | قسم Audio | Voice Library متاحة | Voice مخفي إلا عند تفعيل | Mute يوقف الكل | IN/OUT لا يغير mute | افتراضي ناعم |
|---|---|---|---|---|---|---|
| Player Intel V2 | ✅ AudioSettingsPanel | ✅ عبر voiceLibraryId field | ✅ default `voiceEnabled=false` | ✅ gate موحّد | ✅ field-direct read | ✅ LOWER_THIRD_WIPE |
| Match Stats | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scoreboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ SCOREBUG_SNAP (هوية) |
| Smart News | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mercato Breaking (Fabrizio) | ✅ | ✅ + legacy compat | ✅ | ✅ | ✅ | ✅ HERE_WE_GO (هوية) |

تشغيل voice بدون sfx: ✅ مضمون عبر فصل الـ gates.
تعطيل sfx مع بقاء voice: ✅ نفس الشيء.

---

## 6. النتائج الميكانيكية

| Check | Result |
|---|---|
| `npm run lint` | ✅ Exit 0 |
| `npm run build` | ✅ Exit 0 (1810 modules transformed) |
| Function count | ✅ **10** ≤ 12 |
| Static verification | ✅ **25/25 pass** |
| ملفات صوتية مضافة | ❌ صفر (بقي here-we-go.wav + agreement-close.wav فقط) |
| API endpoints جديدة | ❌ صفر |

---

## 7. الملفات المعدّلة (8)

```
utils/voiceLibrary.ts                                  (جديد، +85 سطر)
components/AudioSettingsPanel.tsx                      (جديد، +280 سطر)
utils/templateAudioGate.ts                             (إضافة shouldPlayVoiceCue + sfxEnabled gate)
components/OverlayRenderer.tsx                         (voice cue routing on ENTER trigger)
components/TemplateControlBar.tsx                      (field-direct read — fix الـ "auto-mute")
components/renderers/MercatoInnovativeRenderers.tsx    (universal voice/sfx + legacy fallback)
constants.ts                                           (7 حقول universal جديدة في createBroadcastControlFields)
pages/Editor.tsx                                       (AudioSettingsPanel مدمج في sound tab + SOUND_FIELDS موسّع)
reports-ar/2026-05-22-global-voice-library-audio-mixer.md  (هذا التقرير)
```

غير ملموس:

- `services/audioEngine.ts` — لا تغيير في cues.
- `services/syncManager.ts` — لا تغيير في processAction.
- ملفات الصوت في `public/` — صفر إضافة، صفر حذف.
- Player Stats Lab — لم يُلمس.
- Player Intel V2 Renderer/Editor — لم يُلمس.
- Stream Deck plugin generator — لم يُلمس.
- `api/*` — لا endpoint جديد.

---

## 8. الـ Commit

سأنفّذ بعد الاطلاع:

```
git add utils/voiceLibrary.ts components/AudioSettingsPanel.tsx utils/templateAudioGate.ts components/OverlayRenderer.tsx components/TemplateControlBar.tsx components/renderers/MercatoInnovativeRenderers.tsx constants.ts pages/Editor.tsx reports-ar/2026-05-22-global-voice-library-audio-mixer.md
git commit -m "fix: add global voice library and stable audio mixer settings"
git push origin main
```

`playerIntelV2State.ts` يبقى untracked.
