# Audio Scenes · Soft Cues · 10 Mercato Templates

**التاريخ**: 2026-05-22
**الحالة**: مكتمل ميكانيكيًا (lint + build نظيفان، 53/53 static check pass، 10 functions)
**Commit المرجعي السابق**: f520502 (AUDIO-X4)

---

## 1. لماذا احتجنا Audio Scenes

بعد X4 الـ Voice Library أصبحت متاحة لكل القوالب، لكن:

- اختيار enterCue/exitCue/updateCue كان منفصلًا — المستخدم يضبط 3 حقول مختلفة لينشئ "إحساس مكالمة".
- لا توجد طريقة سريعة لتطبيق "هوية صوتية" متماسكة على قالب (call room، breaking news، official statement، إلخ).
- استدعاء "احم لها" بضغطة واحدة كان مفقودًا.

**الحل**: registry جديد `templateAudioScenes.ts` يحتوي 10 مشاهد صوتية محترمة، كل مشهد:

```ts
{ id, labelAr, descriptionAr, defaultSfxProfile,
  enterCue, exitCue, updateCue?, ambientCue?,
  volumeMultiplier, voiceRecommended, defaultVoiceTrigger,
  recommendedFor: [...] }
```

المستخدم يضغط "تطبيق" فيُكتب إلى `soundInStyle/soundOutStyle/sfxEnabled/audioSceneId` دفعة واحدة. **لا يلمس soundEnabled ولا voiceEnabled** إلا إن ضغط "+ Voice" صراحة.

---

## 2. Call/Chat Scene — كيف يعمل

`mercato_call_room`:

| | القيمة |
|---|---|
| enterCue | `SOFT_CALL_CONNECT` |
| exitCue | `SOFT_FADE` |
| updateCue | `SOFT_CHAT_TICK` |
| ambientCue | `SOFT_RECORDING_BEEP` (متاح، غير مُشغَّل تلقائيًا) |
| volumeMultiplier | 0.55 |
| voiceRecommended | `true` |
| defaultVoiceTrigger | `manual_only` |

الـ 4 cues الجديدة (`SOFT_CALL_CONNECT`, `SOFT_CHAT_TICK`, `SOFT_RECORDING_BEEP`, `SOFT_NOTIFICATION_PULSE`) أُضيفت في `services/audioEngine.ts`:

```ts
} else if (cue === 'SOFT_CALL_CONNECT') {
  hit(now,        880, 0.10, 0.18, 'sine');
  hit(now + 0.18, 1100, 0.12, 0.18, 'sine');
} else if (cue === 'SOFT_CHAT_TICK') {
  hit(now, 1320, 0.06, 0.16, 'sine');
  hit(now + 0.01, 1980, 0.04, 0.10, 'sine');
}
// ...
```

**سياسة الجودة** (متبعة في الـ 4 cues):

- `sine` فقط — لا `sawtooth/square` حادة.
- gain ≤ 0.18 (سقف منخفض).
- decay قصير (0.06-0.18s) — pip سريع.
- لا `subBass`، لا `shimmer`، لا `sweep`، لا `random noise`.

النتيجة: الـ cue يُسمَع كـ pip ناعم محترم، **ليس صوت واتساب الحقيقي ولا synth مزعج**.

---

## 3. منع الأصوات المزعجة كافتراضي

| القالب | الافتراضي قبل (X3) | الافتراضي الآن (X5) |
|---|---|---|
| كل القوالب | `inCue: 'STADIUM_WHOOSH'` (DEFAULT_AUDIO_PROFILE) | `inCue: 'LOWER_THIRD_WIPE'` |
| 10 mercato-x6 | لا scene افتراضي | scene محدد لكل قالب (10 مشاهد، أنعمها premium_subtle) |
| MERCATO_UNIFIED runtime profile | — | `inCue: LOWER_THIRD_WIPE`, `updateCue: SOFT_CHAT_TICK` (scene مكالمة) |

أيضًا في `SOUND_PRIORITY`:
- `SOFT_CHAT_TICK: 18` (low priority — لا يُعطّل scoreboard cues)
- `SOFT_RECORDING_BEEP: 15`
- `SOFT_CALL_CONNECT: 25`
- `SOFT_NOTIFICATION_PULSE: 22`

**خاصية أمان**: تطبيق Scene **لا** يُغيّر `soundEnabled` أو `voiceEnabled` تلقائيًا. الحقل `audioSceneId` فقط يحفظ الاسم. المستخدم يحتاج لضغطة "+ Voice" صريحة لتفعيل voice مع المشهد.

---

## 4. 10 قوالب Mercato جديدة

### 4.1 Factory pattern

أضفت `createMercatoTemplate(input)` في `constants.ts`. الـ factory:

- ينشئ `OverlayConfig` بـ `type: OverlayType.MERCATO_UNIFIED`.
- يحقن `mercatoVariant` (hidden) لاختيار الـ layout.
- يحقن `audioSceneId` (hidden) لـ default scene.
- يضيف الـ scale/positionX/positionY القياسية.
- يستقبل `dataFields` فقط (بيانات القالب — اسم اللاعب، إلخ).
- يمر تلقائيًا عبر `withBroadcastControls` → `dedupeFields` (لا تكرار).

### 4.2 القوالب الـ 10

| # | id | variant | audioScene | Icon |
|---|---|---|---|---|
| 1 | `template-mercato-x6-agent-call` | `agent_call` | `mercato_call_room` | 📞 |
| 2 | `template-mercato-x6-deal-radar` | `deal_radar` | `analysis_lab` | 📡 |
| 3 | `template-mercato-x6-club-statement` | `club_statement` | `official_club_statement` | 📜 |
| 4 | `template-mercato-x6-deadline-hour` | `deadline_hour` | `deadline_drama` | ⏱️ |
| 5 | `template-mercato-x6-source-confidence` | `source_confidence` | `analysis_lab` | 🎯 |
| 6 | `template-mercato-x6-clause-reveal` | `clause_reveal` | `transfer_agreement_close` | 📄 |
| 7 | `template-mercato-x6-medical-tracker` | `medical_tracker` | `premium_subtle` | 🏥 |
| 8 | `template-mercato-x6-hijack-alert` | `hijack_alert` | `breaking_news_clean` | ⚠️ |
| 9 | `template-mercato-x6-personal-terms` | `personal_terms` | `mercato_chat_whisper` | 💼 |
| 10 | `template-mercato-x6-here-we-go-buildup` | `here_we_go_buildup` | `transfer_agreement_close` | 📈 |

كل قالب ضمن `templateGroup: 'MERCATO_PACKAGE'` فيظهر مع باقي قوالب Mercato في الـ Library.

### 4.3 Renderer واحد بدل 10

`components/renderers/MercatoUnifiedRenderer.tsx` — renderer واحد يبني الـ layout حسب `mercatoVariant`. كل variant مكوّن React صغير:

- `AgentCallVariant` — call panel (transcript) + deal context sidebar.
- `DealRadarVariant` — SVG radar مع probability sweep + sources reliability bars.
- `ClubStatementVariant` — official press card مع date/title/body.
- `DeadlineHourVariant` — countdown + 5-stage progress bar.
- `SourceConfidenceVariant` — 3 columns (Tier A/B/C) مع status.
- `ClauseRevealVariant` — clause card مع value highlight.
- `MedicalTrackerVariant` — 4 stages grid (وصول/فحص/توقيع/إعلان) مع icons.
- `HijackAlertVariant` — alert + risk meter + 2 club cards (original vs hijack).
- `PersonalTermsVariant` — 3-card grid (راتب / سنوات / عمولة).
- `HereWeGoBuildUpVariant` — vertical timeline.

كل variant يستخدم نفس `THEMES` و `safeParse` helpers — لا تكرار.

---

## 5. Direct URL يعمل

`utils/voiceLibrary.ts → resolveVoiceUrl(libraryId, directUrl)`:

```ts
const direct = (directUrl || '').trim();
if (direct) return direct;  // ← أولوية مطلقة
if (!libraryId || libraryId === 'none') return null;
const entry = getVoiceEntry(libraryId);
if (!entry || entry.unavailable) return null;
return entry.url || null;
```

في `<AudioSettingsPanel>` المستخدم يكتب `voiceDirectUrl`، يضغط "معاينة الصوت" → `new Audio(url).play()`. يعمل في كل القوالب الـ 38 (28 قديم + 10 جديد).

---

## 6. لا ملفات صوتية جديدة

`public/audio/voice-packs/mercato/` يحتوي **2 ملف فقط** كما كان:
- `here-we-go.wav`
- `agreement-close.wav`

لم تُضف أي `.wav/.mp3/.ogg` جديد. الـ 4 cues الجديدة (SOFT_CALL_CONNECT/CHAT_TICK/RECORDING_BEEP/NOTIFICATION_PULSE) **synth-generated** عبر WebAudio API داخل `playLuxurySynth`.

---

## 7. Voice Library — Categories موسّعة

`type VoiceCategory = 'mercato' | 'call' | 'news' | 'official' | 'alert' | 'custom' | 'generic'`

أُضيف `unavailable: boolean` flag على entries — يسمح بعرض placeholders في الـ UI كـ disabled (لـ audio packs مستقبلية)، لكن `resolveVoiceUrl` يرجع `null` لها فلا تُشغَّل.

`listVoicesByCategory(category)` exported.

الحالي: 2 entries (mercato_here_we_go، mercato_agreement_close). كلاهما يشير لملفات حقيقية.

---

## 8. اختبار 10 قوالب (تحقق ساكن — 53/53 PASS)

| القالب | يظهر في Library | audioScene افتراضي | Variant rendered | IN/OUT يعمل | Voice مخفي بدون تفعيل | لا تكرار حقول |
|---|---|---|---|---|---|---|
| Agent Call #2 | ✅ | mercato_call_room | ✅ | ✅ via OverlayRenderer | ✅ default voiceEnabled=false | ✅ via dedupeFields |
| Deal Radar | ✅ | analysis_lab | ✅ | ✅ | ✅ | ✅ |
| Club Statement | ✅ | official_club_statement | ✅ | ✅ | ✅ | ✅ |
| Deadline Hour | ✅ | deadline_drama | ✅ | ✅ | ✅ | ✅ |
| Source Confidence | ✅ | analysis_lab | ✅ | ✅ | ✅ | ✅ |
| Clause Reveal | ✅ | transfer_agreement_close | ✅ | ✅ | ✅ | ✅ |
| Medical Tracker | ✅ | premium_subtle | ✅ | ✅ | ✅ | ✅ |
| Hijack Alert | ✅ | breaking_news_clean | ✅ | ✅ | ✅ | ✅ |
| Personal Terms | ✅ | mercato_chat_whisper | ✅ | ✅ | ✅ | ✅ |
| Here We Go Build-Up | ✅ | transfer_agreement_close | ✅ | ✅ | ✅ | ✅ |

كلها ترث `withBroadcastControls` → 14 audio/transition fields موحَّدة + dedupeFields.

---

## 9. النتائج الميكانيكية

| Check | Result |
|---|---|
| `npm run lint` | ✅ Exit 0 |
| `npm run build` | ✅ Exit 0 (1812 modules transformed) |
| Function count | ✅ **10** ≤ 12 |
| Static verification | ✅ **53/53 pass** |
| ملفات صوتية مضافة | ❌ صفر |
| API endpoints جديدة | ❌ صفر |

---

## 10. الملفات المعدَّلة (10)

```
utils/templateAudioScenes.ts                              (جديد، 215 سطر — 10 مشاهد)
components/renderers/MercatoUnifiedRenderer.tsx           (جديد، 410 سطر — 10 variants)
utils/voiceLibrary.ts                                     (categories موسّعة + unavailable + listVoicesByCategory)
components/AudioSettingsPanel.tsx                         (scene picker مع +Voice button)
services/audioEngine.ts                                   (4 SOFT cues + priority + previewable)
constants.ts                                              (createMercatoTemplate factory + 10 templates + audioSceneId field)
types.ts                                                  (OverlayType.MERCATO_UNIFIED)
components/OverlayRenderer.tsx                            (MERCATO_UNIFIED routing + ENTER/EXIT/SOUND maps)
utils/templateRuntime.ts                                  (TEMPLATE_AUDIO_PROFILES[MERCATO_UNIFIED])
utils/templateRegistry.ts                                 (icon/accent/description لـ MERCATO_UNIFIED)
reports-ar/2026-05-22-audio-scenes-and-10-mercato-templates.md  (التقرير)
```

غير ملموس:
- `services/syncManager.ts` — لا تغيير.
- `public/sounds/`, `public/audio/` — لا ملف جديد.
- Player Stats Lab، Player Intel V2، Stream Deck plugin — لم تُلمس.
- `api/*` — لا endpoint جديد.
