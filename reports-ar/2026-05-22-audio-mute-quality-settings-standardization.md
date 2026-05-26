# Audio Mute Fix · Premium Subtle Defaults · Settings Standardization

**التاريخ**: 2026-05-22
**الحالة**: مكتمل ميكانيكيًا (lint + build نظيفان، 23/23 static check pass، 10 functions)
**الـ commit المرجعي السابق**: 4a03abb (PLATFORM-X1)

---

## 1. سبب أن Mute لم يكن يوقف IN

**Audit حقيقي للمسار**:

| المكان | السلوك القديم | المشكلة |
|---|---|---|
| `OverlayRenderer.playSound` | `if (!soundEnabled) return` يقرأ `getField('soundEnabled') !== false` | لو الحقل **غير موجود** يرجع `undefined !== false === true` → الصوت يعمل |
| `services/syncManager.processAction` case `update_field` | `fields.map(field => field.id === id ? {...field, value} : field)` | لو الحقل غير موجود فـ `map` لا يضيفه → `setImageOverride('soundEnabled', false)` يصبح **no-op** على الـ overlays القديمة |
| `useMercatoAudio` في `MercatoInnovativeRenderers` | يقرأ `enableVoice` و `enableSfx` فقط | يتجاهل تمامًا الـ `soundEnabled` العام → Mute العام لا يُسكت Mercato |
| `audioEngine.playCue` | لا يفحص أي شيء على مستوى الـ overlay | يعمل دائمًا — صحيح، لأن المسؤولية على الـ caller |

**خلاصة الـ root cause**: دالة `update_field` كانت لا تضيف الحقل إذا لم يكن موجودًا. أي overlay محفوظ من قبل تطبيق `withBroadcastControls` (دفعة من session سابقة، أو override من Stream Deck) لم يكن لديه حقل `soundEnabled` في array الـ fields، فالضغط على زر Mute يحدّث... **لا شيء**.

أيضًا الـ Mercato renderers لها مسار صوتي مستقل (`playMercatoStory`) لم يكن يستشير الـ universal `soundEnabled`. هذا تسرب صوتي ثاني.

---

## 2. الإصلاح: Universal Audio Gate

### 2.1 ملف جديد `utils/templateAudioGate.ts`

دالة `shouldPlayTemplateSound(overlay, eventType)` هي **المصدر الوحيد** لقرار "هل نُشغّل صوتًا؟":

```ts
1. soundEnabled === false   → false
2. soundVolume <= 0          → false
3. profile.enabled === false → false
4. profile.volume <= 0       → false
5. ENTRY + isVisible !== true → false  (anti-random-fire)
وإلا → true
```

كل callsite للصوت يستشيرها قبل الـ `playCue`:

- `OverlayRenderer.playSound('ENTRY')` → gate('ENTRY')
- `OverlayRenderer.playSound('EXIT')` → gate('EXIT')
- `OverlayRenderer.playSound('TRANSITION')` → gate('TRANSITION')

**الضمان**: لا يوجد مسار صوت يتجاوز الـ gate. Mute يوقف IN و OUT و كل cue فورًا. Volume = 0 يعمل نفس عمل Mute.

### 2.2 إصلاح `update_field` في `services/syncManager.ts`

أضفت **auto-injection للحقول المعروفة** فقط. القائمة محصورة بـ 6 broadcast-control fields:

```ts
soundEnabled, soundVolume, soundInStyle, soundOutStyle,
transitionIn, transitionOut
```

الآن الضغط على Mute في `<TemplateControlBar>` يصل لـ `update_field` → إذا الحقل غير موجود يُضاف، وإذا موجود يُحدَّث. لا مزيد من "ضغطة بدون أثر".

**خاصية أمان**: القائمة محصورة لتفادي injection عشوائي لأي field id من خارج. لا يمكن لـ Stream Deck أن يضيف حقولًا بأسماء عشوائية.

### 2.3 إصلاح `useMercatoAudio`

الـ hook الآن يقرأ `soundEnabled` و `soundVolume` العامين أولًا:

```ts
const universalSound = getField('soundEnabled') !== false;
const universalVolume = Number(getField('soundVolume') ?? 0.7);
const universalGate = universalSound && universalVolume > 0;
const enableVoice = universalGate && getField('enableVoice') !== false;
const enableSfx   = universalGate && getField('enableSfx')   !== false;
```

**نتيجة**: ضغط Mute في الـ ControlBar يُسكت Mercato voice و sfx معًا فورًا.

---

## 3. سياسة الصوت الجديدة: premium_subtle

### 3.1 `DEFAULT_AUDIO_PROFILE` تغيّر

| | قبل | بعد |
|---|---|---|
| `id` | `broadcast_default` | `premium_subtle` |
| `volume` | 0.7 | **0.55** |
| `inCue` | `STADIUM_WHOOSH` (whoosh ثقيل) | **`LOWER_THIRD_WIPE`** (wipe ناعم) |
| `outCue` | `BROADCAST_OUT` | **`SOFT_FADE`** |
| `updateCue` | `DATA_TICK` | `DATA_TICK` (نفس، لأنه أصلًا ناعم) |

### 3.2 Per-template profiles خفّت بشكل منهجي

**القوالب الناعمة** (Stats / Profile / Smart News / Player Intel V2) تستخدم الآن:
- IN: `LOWER_THIRD_WIPE` (wipe ناعم)
- OUT: `SOFT_FADE`
- Volume: 0.55

**القوالب القوية** (Mercato / Breaking / Goal / Alert) أبقيت قوية ولكن مكسورة الذيل:
- Mercato Hit / Here We Go: 0.65-0.7 (كان 0.75-0.85)
- Breaking Riser: 0.7 (كان 0.85)
- Deadline Alarm: 0.7 (كان 0.85)
- Alert: `IMPORTANT_PING` بدل `VAR_BUZZ` المزعج

**التغييرات على `SOUND_IN_DEFAULTS`**:

| القالب | قبل | بعد |
|---|---|---|
| ALERT | `VAR_BUZZ` | `IMPORTANT_PING` |
| EXCLUSIVE_ALERT | `VAR_BUZZ` | `IMPORTANT_PING` |
| SMART_NEWS | `TACTICAL_PULSE` | `LOWER_THIRD_WIPE` |
| LEADERBOARD | `DATA_SLAM` | `LOWER_THIRD_WIPE` |
| GUESTS | `STADIUM_WHOOSH` | `LOWER_THIRD_WIPE` |
| PLAYER_PROFILE | `PLAYER_ENTRANCE` | `LOWER_THIRD_WIPE` |
| H2H_STATS | `DATA_SLAM` | `LOWER_THIRD_WIPE` |
| MATCH_STATS | `DATA_SLAM` | `LOWER_THIRD_WIPE` |
| PLAYER_STATS | `DATA_SLAM` | `LOWER_THIRD_WIPE` |
| PLAYER_INTEL_V2 | `DATA_SLAM` | `LOWER_THIRD_WIPE` |

**التغيير على `SOUND_OUT_DEFAULTS`**: كل الـ 28 نوع تستخدم الآن **`SOFT_FADE`** (بدل `BROADCAST_OUT` الثقيل).

### 3.3 ما لم يتغيّر (سياسة الإبقاء على الهوية)

- **MERCATO_HIT / HERE_WE_GO_STING / DEAL_LOCK** كـ IN cues لقوالب الـ Mercato — هذه الأصوات هي **هوية** القالب وقد طلبها المستخدم سابقًا. لم نلمسها.
- **BREAKING_RISER** لـ Breaking Here We Go — هوية القالب.
- **DEADLINE_ALARM** لـ Mercato Deadline Day — هوية.
- **GOAL_HORN / SCOREBUG_SNAP** للسكور — هوية.
- **BEFORE_THE_KICKOFF** لـ Today's Episode — يستخدم mp3 حقيقي.

السياسة: ما لم يكن "صوت توقيع" للقالب، يصبح ناعمًا.

### 3.4 لم تُضف أي ملفات صوتية جديدة

تأكدت من `public/sounds/` و `public/audio/`. لم تُضَف ولم تُحذف ملفات صوتية. كل التغييرات على مستوى الـ mapping في الكود.

---

## 4. توحيد الإعدادات: dedup + groups

### 4.1 `dedupeFields(fields)` في `constants.ts`

دالة جديدة تحذف الـ fields المتكررة (بنفس `id`) وتحتفظ بأول occurrence فقط. تُطبَع تحذير في dev console عند اكتشاف تكرار.

### 4.2 `withBroadcastControls` الآن dedupes

```ts
const withBroadcastControls = (template: OverlayConfig): OverlayConfig => ({
  ...template,
  fields: dedupeFields([...template.fields, ...createBroadcastControlFields(template.fields)]),
});
```

نتيجة: لو قالب يحتوي `soundEnabled` صراحة + `createBroadcastControlFields` يضيفه أيضًا، النسخة الأولى هي المعتمدة. **لا تكرار في array الـ fields لأي قالب**.

### 4.3 `normalizeTemplateFields(fields)` و `FIELD_GROUP_ORDER`

ترتيب موحّد للحقول عبر كل القوالب:

```
1. content     (text, names, numbers, images, JSON data)
2. display     (scale, positionX/Y, themePreset)
3. transitions (transitionIn, transitionOut)
4. audio       (soundEnabled, soundVolume, soundInStyle, soundOutStyle)
5. advanced    (everything else)
```

`fieldGroup(id)` يصنّف الحقل. الـ Editor يمكنه استخدام `normalizeTemplateFields` لاحقًا لعرض الحقول مجمّعة. لم أربطها بـ Editor UI الآن — سياسة الترتيب موجودة وجاهزة، لكن تطبيقها على UI الـ Editor الفعلي (تجميع الأقسام بصريًا) هو تغيير UI أكبر يستحق phase منفصل لتفادي كسر التصميم. الدالة exported وجاهزة للاستهلاك.

---

## 5. التحقق الساكن (23/23 PASS)

شغّلت سكربت تحقق آلي يفحص كل شرط من شروط هذه المرحلة (ثم حذفته):

| Check | Result |
|---|---|
| 1. `shouldPlayTemplateSound` exported | ✅ |
| 2. OverlayRenderer.playSound يستشير الـ gate | ✅ |
| 3. `if (!soundEnabled) return` القديم محذوف من الكود (موجود في تعليق فقط) | ✅ |
| 4. `update_field` يحقن الحقول المفقودة (KNOWN_FIELDS) | ✅ |
| 5a. `DEFAULT_AUDIO_PROFILE.id === 'premium_subtle'` | ✅ |
| 5b. الـ default IN/OUT cues ناعمة (LOWER_THIRD_WIPE / SOFT_FADE) | ✅ |
| 5c. الـ default volume = 0.55 | ✅ |
| 6a. PLAYER_INTEL_V2 لم يعد يستخدم DATA_SLAM كافتراضي | ✅ |
| 6 · MATCH_STATS / H2H_STATS / PLAYER_STATS / SMART_NEWS / ALERT / EXCLUSIVE_ALERT / GUESTS | ✅ كلها تخلت عن الـ cues المزعجة |
| 7. كل الـ 28 قالب OUT = SOFT_FADE (0 BROADCAST_OUT) | ✅ |
| 8. useMercatoAudio يحترم الـ universal soundEnabled | ✅ |
| 9. dedupeFields مربوط في withBroadcastControls | ✅ |
| 10. normalizeTemplateFields مُصدَّر | ✅ |
| 11. INITIAL_TEMPLATES يمر عبر dedupeFields | ✅ |
| 12. resolveTemplateAudio fallback chain سليم | ✅ |
| 13. function count ≤ 12 | ✅ (10) |
| 14. لا endpoint جديد | ✅ |

---

## 6. اختبار 5 قوالب (تحقق ساكن لكل شرط)

كل من القوالب الخمسة تم التحقق منه ضد الـ 7 شروط الصوتية:

| القالب | mute=ON+IN | mute=OFF+IN | mute=ON+OUT | mute=OFF+OUT | volume=0+IN/OUT | افتراضي ناعم |
|---|---|---|---|---|---|---|
| Player Intel V2 | ✅ gate يحجب | ✅ LOWER_THIRD_WIPE | ✅ gate يحجب | ✅ SOFT_FADE | ✅ shouldPlay() = false | ✅ |
| Match Stats | ✅ | ✅ LOWER_THIRD_WIPE | ✅ | ✅ SOFT_FADE | ✅ | ✅ |
| Scoreboard | ✅ | ✅ SCOREBUG_SNAP (هوية) | ✅ | ✅ SOFT_FADE | ✅ | ✅ |
| Smart News | ✅ | ✅ LOWER_THIRD_WIPE | ✅ | ✅ SOFT_FADE | ✅ | ✅ |
| Breaking Here We Go | ✅ | ✅ BREAKING_RISER (هوية) | ✅ | ✅ SOFT_FADE | ✅ | ✅ |

**ضمان أن update لا يعيد ENTER cue على القالب الـ live**: الـ gate يفحص `eventType === 'ENTRY'` فقط على تغيّر `false → true` (السطر 425 في OverlayRenderer)، فالـ ENTRY لا تطلق على update_field البحت. هذا غير متغيّر من PHASE PLATFORM-X1.

---

## 7. الـ Settings: لا تكرار

### قبل التعديل

`createBroadcastControlFields` كان يضيف الحقول بشرط `!hasField(...)`. لكن:
- `withBroadcastControls` كان يدمج: `[...template.fields, ...createBroadcastControlFields(...)]`
- لو القالب يحتوي حقلًا بنفس الـ id من قبل، الحقل موجود مرتين في array الـ fields النهائي

### بعد التعديل

```ts
fields: dedupeFields([...template.fields, ...createBroadcastControlFields(...)])
```

النسخة الأولى من كل id هي الفائزة. أي تكرار يُسجَّل في dev console كتحذير. النتيجة:

- `soundEnabled` يظهر مرة واحدة فقط في كل قالب.
- `soundVolume` يظهر مرة واحدة فقط.
- `soundInStyle` يظهر مرة واحدة فقط.
- `soundOutStyle` يظهر مرة واحدة فقط.
- `transitionIn / transitionOut` نفس الشيء.

---

## 8. الملفات المعدّلة

```
utils/templateAudioGate.ts                       (جديد، 70 سطر)
utils/templateRuntime.ts                         (DEFAULT_AUDIO_PROFILE + TEMPLATE_AUDIO_PROFILES — سياسة premium_subtle)
components/OverlayRenderer.tsx                   (gate موحّد + soft cues defaults)
components/renderers/MercatoInnovativeRenderers.tsx  (universal soundEnabled gate)
services/syncManager.ts                          (update_field يحقن الحقول المفقودة)
constants.ts                                     (dedupeFields + normalizeTemplateFields + withBroadcastControls dedup)
reports-ar/2026-05-22-audio-mute-quality-settings-standardization.md  (هذا التقرير)
```

غير ملموسة:

- `services/audioEngine.ts` — المرجع للأصوات. لم نُغيّر cue واحد. غيّرنا الـ defaults map فقط.
- `public/sounds/`, `public/audio/` — لا ملفات صوتية أُضيفت أو حُذفت.
- `api/*` — لا endpoint جديد. الـ count = 10.
- `components/player-intel-v2/playerIntelV2State.ts` — ما زال untracked كما هو.
- Player Intel V2 Renderer / EditorPanel — لم يُلمس.
- Player Stats Lab — لم يُلمس.

---

## 9. النتائج الميكانيكية

| Check | Result |
|---|---|
| `npm run lint` | ✅ Exit 0 |
| `npm run build` | ✅ Exit 0 (1808 modules transformed) |
| Function count | ✅ **10** ≤ 12 |
| Static verification | ✅ **23/23 pass** |
| ملفات صوتية مضافة | ❌ صفر |
| API endpoints جديدة | ❌ صفر |

---

## 10. ما لم يتغيّر (مقصود)

- **UI تجميع الأقسام في Editor.tsx**: `normalizeTemplateFields` متاح كـ helper، لكن لم أعدّل الـ Editor ليجمّع الحقول بصريًا في sections. هذا تغيير UI كبير يخاطر بكسر التصميم. السياسة موجودة + الدالة جاهزة، التطبيق على UI الفعلي مؤجَّل.
- **الـ cues التوقيعية**: MERCATO_HIT / HERE_WE_GO_STING / DEAL_LOCK / BREAKING_RISER / DEADLINE_ALARM / GOAL_HORN / SCOREBUG_SNAP / BEFORE_THE_KICKOFF — هذه أصوات "هوية" القوالب الخاصة بها، لم تُلمس.

---

## 11. الـ Commit

سأنفّذ بعد موافقتك:

```
git add utils/templateAudioGate.ts utils/templateRuntime.ts components/OverlayRenderer.tsx components/renderers/MercatoInnovativeRenderers.tsx services/syncManager.ts constants.ts reports-ar/2026-05-22-audio-mute-quality-settings-standardization.md
git commit -m "fix: standardize template audio mute quality and settings"
git push origin main
```

ملاحظة: `playerIntelV2State.ts` ما زال untracked ولن يُضاف.
