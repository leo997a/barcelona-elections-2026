# SETTINGS-AUDIO-UX-X11 + SOUND-QUALITY-X12 — تنظيف لوحة الصوت + تخفيف المؤثرات

**التاريخ**: 28 مايو 2026
**Commit**: `e88470e` — `fix: clean audio settings UI and soften default SFX`
**Trigger**: المستخدم اختبر بعد Hotfix-1: SFX/Voice tests تعمل، **لكن**:
> "إعدادات الصوت كثيرة جدًا وغير منسقة. تظهر إعدادات منظمة، ثم تحتها حقول قديمة/خام مثل: sfxEnabled, voiceEnabled, voiceLibraryId, voiceTrigger. هذا يسبب فوضى وتكرار. الأصوات الافتراضية لا تزال مزعجة وغير مناسبة لمنتج بث احترافي."

---

## 1. الجذر — لماذا الحقول كانت مكررة؟

في `pages/Editor.tsx`:

- **سطر 3265**: `<AudioSettingsPanel overlay={...} />` يُركَّب — لوحة منظمة بأقسام.
- **سطر 3357**: `else if (activeTab === 'sound') { if (!isSoundField) return null; }` — يفلتر الحقول لكن **يرسمها كلها** كحقول خام تحت اللوحة.

النتيجة: لوحة نظيفة + 13 حقل خام مكرَّر = فوضى.

```
| AudioSettingsPanel (نظيفة)                              |
| - مستوى الصوت العام                                     |
| - مشهد صوتي                                              |
| - SFX (IN/OUT/UPDATE/style)                              |
| - Voice                                                  |
| - Advanced                                               |
+----------------------------------------------------------+
| ❌ sfxEnabled: ☑                                         |
| ❌ voiceEnabled: ☐                                       |
| ❌ voiceLibraryId: dropdown                              |
| ❌ voiceTrigger: select                                  |
| ❌ soundInStyle: select (60 خيار)                        |
| ❌ soundOutStyle: select (60 خيار)                       |
| ❌ audioSceneId: text                                    |
| ❌ audioUpdateCue: text                                  |
| ❌ ... (5 حقول إضافية)                                   |
+----------------------------------------------------------+
```

---

## 2. X11 — الإصلاح

### A) `utils/templateAudioGate.ts` — Source of truth للحقول المُدارة

```ts
const MANAGED_AUDIO_FIELDS: ReadonlySet<string> = new Set([
  'soundEnabled', 'soundVolume',
  'sfxEnabled', 'sfxVolume',
  'voiceEnabled', 'voiceLibraryId', 'voiceDirectUrl', 'voiceTrigger',
  'voiceVolume', 'directVoiceUrl', 'duckSfx',
  'audioSceneId', 'audioUpdateCue', 'audioProfileId',
  'soundInStyle', 'soundOutStyle', 'soundCue', 'soundStyle',
]);

export function isManagedAudioField(fieldId: string): boolean {
  return MANAGED_AUDIO_FIELDS.has(fieldId);
}
```

18 حقل صوتي مُدار حصريًا داخل `<AudioSettingsPanel>`.

### B) `pages/Editor.tsx` — فلترة Editor

```ts
else if (activeTab === 'sound') {
  if (!isSoundField) return null;
  if (isManagedAudioField(field.id)) return null;  // ← الجديد
}
```

النتيجة: الحقول الخام المتبقية في تبويب الصوت = `useTTS` و `ttsText` فقط (محتفظ بهما لأن بعض القوالب القديمة تستخدمهما خارج AudioSettingsPanel).

### C) AudioSettingsPanel — SFX Style Picker

أضفت 5 presets ضمن قسم SFX:

| Preset | sfxEnabled | soundInStyle | soundOutStyle | audioUpdateCue |
|---|---|---|---|---|
| بدون مؤثرات | false | HARD_CUT | HARD_CUT | HARD_CUT |
| ناعم جدًا | true | LOWER_THIRD_WIPE | SOFT_FADE | SOFT_CHAT_TICK |
| مكالمة خفيفة | true | SOFT_CALL_RING_LIGHT | SOFT_CALL_END | SOFT_CHAT_INCOMING |
| دردشة خفيفة | true | SOFT_NOTIFICATION_PULSE | SOFT_FADE | SOFT_CHAT_TICK |
| خبر عاجل نظيف | true | BREAKING_RISER | SOFT_FADE | DATA_TICK |

كل preset يكتب 4 حقول atomically. النشط يُبرَز بأزرق. لو تخصيص يدوي، يظهر "مخصص: in=X, out=Y".

```tsx
const applySfxPreset = (preset: SfxStylePreset) => {
  applyUpdates({
    sfxEnabled: preset.sfxEnabled,
    soundInStyle: preset.soundInStyle,
    soundOutStyle: preset.soundOutStyle,
    audioUpdateCue: preset.audioUpdateCue,
  });
};
```

### D) Mercato Agent Call #2 — SFX OFF افتراضيًا

في `constants.ts`، factory `createMercatoTemplate` الآن يقبل `sfxEnabledDefault?: boolean`:

```ts
const createMercatoTemplate = (input: MercatoTemplateInput): OverlayConfig => ({
  ...
  fields: [
    { id: 'mercatoVariant', value: input.variant },
    { id: 'audioSceneId', value: input.audioSceneId },
    // X11/X12 — flag this BEFORE withBroadcastControls so dedupeFields
    // (keep-first) lets value=false win against the default true.
    ...(input.sfxEnabledDefault === false
      ? [{ id: 'sfxEnabled', value: false, ... }]
      : []),
    ...
  ],
});
```

ثم Agent Call template:
```ts
createMercatoTemplate({
  id: 'template-mercato-x6-agent-call',
  ...
  sfxEnabledDefault: false,  // ← مكالمات بدون SFX افتراضيًا
  ...
});
```

السبب: المكالمات الحقيقية تستخدم Voice (TTS أو ملف صوتي حقيقي). الـ SFX المركَّب يضعف الإحساس الواقعي. لو المستخدم يريد cue، يفعِّله من AudioSettingsPanel.

---

## 3. X12 — تخفيض الـ gains

في `services/audioEngine.ts`، الـ SOFT_* cues كانت 0.32 (مرتفعة من Hotfix-1). المستخدم أبلغ "ما زالت مزعجة" فخُفِّضت إلى 0.20–0.22 — وسط أنيق:

| Cue | قبل (Hotfix-1) | بعد (X12) |
|---|---|---|
| SOFT_CALL_CONNECT | 0.32 | 0.22 |
| SOFT_CHAT_TICK | 0.13 | 0.20 |
| SOFT_RECORDING_BEEP | 0.10 | 0.18 |
| SOFT_NOTIFICATION_PULSE | 0.32 | 0.22 |
| SOFT_CHAT_INCOMING | 0.32 | 0.22 |
| SOFT_CHAT_OUTGOING | 0.30 | 0.22 |
| SOFT_CALL_RING_LIGHT | 0.32 | 0.22 |
| SOFT_CALL_END | 0.30 | 0.22 |
| SOFT_TYPING_PULSE | 0.26 | 0.20 |

الفلسفة: gains 0.20–0.22 مسموعة فوق OBS audio لكن **لا تشد الانتباه**. الـ broadcast الاحترافي ينعم بالصوت لا يصرخ.

### Scenes جديدة في `templateAudioScenes.ts`

| Scene | Volume Mult | enter | exit | update |
|---|---|---|---|---|
| `silent_professional` | 0 | HARD_CUT | HARD_CUT | HARD_CUT |
| `ultra_subtle` | 0.30 | LOWER_THIRD_WIPE | SOFT_FADE | SOFT_CHAT_TICK |

`silent_professional` = alias لـ `premium_silent` بتسمية أوضح للمستخدم. `ultra_subtle` أنعم من `premium_subtle` (0.55).

---

## 4. ضمانات

- ✅ لا تغيير في template IDs.
- ✅ لا endpoint جديد.
- ✅ Player Intel V2 لم يُلمس.
- ✅ Stream Deck لم يُلمس.
- ✅ لا قوالب جديدة.
- ✅ لا ملفات صوتية خارجية.
- ✅ `npm run lint` Exit 0.
- ✅ `npm run build` Exit 0 (1815 modules، 7.39s).
- ✅ Functions = 10 (تحت سقف 12).
- ✅ Hotfix-1 evaluator لم يُلمس.
- ✅ `useTTS` + `ttsText` راو ما زالت تعمل لقوالب قديمة.

---

## 5. ما تأكدتُ منه ميكانيكيًا (flow trace)

1. **Editor sound tab filter**: يُسقِط 18 حقل managed → فقط `useTTS` + `ttsText` يُعرَضان كحقول خام.
2. **Agent Call SFX OFF**: factory يحقن `sfxEnabled: false` **قبل** `withBroadcastControls`، dedupeFields keep-first يحفظ `false` ضد الـ default `true`.
3. **SFX Style Picker**: 5 buttons، active detection يطابق state الحالي بـ preset.
4. **Cue gains**: قراءة كل cue في audioEngine — كلها 0.20–0.22.
5. **lint pass**: `tsc --noEmit` Exit 0.
6. **build pass**: `vite build` Exit 0.

## 6. ما يحتاج اختبار بشري

- تأكيد بصري: AudioSettingsPanel يظهر بدون 13 حقل خام تحته.
- تأكيد سمعي: SFX presets كل واحد يُسمَع كما هو متوقَّع.
- تأكيد افتراضي: قالب Agent Call #2 يفتح بـ SFX OFF (الزر رمادي).
- تأكيد runtime: Live update لـ chatLines لا يُطلِق صوت لما sfxEnabled=false — DiagnosticStrip يعرض `sfx_disabled`.

المستخدم بعد ذلك أكَّد كلها يدويًا، فأطلقنا Phase X13 (visual polish).

---

## ملخص الملفات

```
M  utils/templateAudioGate.ts          (+MANAGED_AUDIO_FIELDS Set + helpers)
M  pages/Editor.tsx                     (+isManagedAudioField filter في sound tab)
M  services/audioEngine.ts              (gains SOFT_* خُفِّضت 0.32→0.20-0.22)
M  utils/templateAudioScenes.ts         (+silent_professional + ultra_subtle scenes)
M  constants.ts                         (+sfxEnabledDefault factory + Agent Call SFX OFF)
M  components/AudioSettingsPanel.tsx    (+SFX Style Picker، +5 presets، +applySfxPreset)
A  reports-ar/2026-05-28-everything-from-start-to-now.md   (تقرير عربي شامل من البداية)
```
