# Phase A - Audio/Settings Cleanup Hotfix

تاريخ التقرير: 2026-05-28  
اسم المرحلة: `PHASE-A-AUDIO-SETTINGS-CLEANUP-001`  
العلاقة بالتقرير السابق: تنفيذ محدود لأول توصية من `MASTER-AUDIT-AND-ROADMAP-001`.

---

## 1. ملخص تنفيذي

هذه مرحلة تنفيذ صغيرة ومحدودة جدًا على Audio/Settings فقط. لم يتم فتح إعادة تصميم، ولم يتم تعديل القوالب، ولم يتم لمس API أو Player Intel أو Stream Deck.

الهدف كان معالجة أربع نقاط منخفضة الخطر ظهرت في التدقيق:

1. زر Test UPDATE في لوحة الصوت يجب أن يطابق runtime fallback الحقيقي.
2. Reset audio يجب أن يمسح `audioUpdateCue` ولا يترك cue قديمًا.
3. تطبيق مشهد صامت يجب أن يطفئ SFX فعليًا بدل إبقاء `sfxEnabled=true`.
4. تطبيق presets/scenes/reset من Editor يجب أن يستخدم batch update بدل عدة تحديثات متتابعة.

النتيجة:

- `npm run lint` نجح.
- `npm run build` نجح.
- عدد Vercel functions بقي 10.
- لا توجد endpoints جديدة.
- لا توجد template IDs جديدة أو معدلة.
- لا توجد ملفات صوت جديدة.

---

## 2. التشخيص قبل التنفيذ

### 2.1 AudioSettingsPanel

اللوحة كانت تدعم أصلًا `onUpdateMany`، لكن Editor لم يكن يمررها. لذلك أي preset أو scene أو reset كان يمكن أن يتحول إلى عدة نداءات منفصلة عبر `onUpdate`، وهذا يخلق حالات وسطية غير ضرورية في live sync.

تم التأكد أيضًا أن:

- `previewUpdate()` كان يستخدم `audioUpdateCue || DATA_TICK`.
- التعليق يقول إن السلوك يجب أن يطابق runtime transition، لكن runtime يستخدم fallback من `resolveTemplateAudio(config).updateCue`.
- `resetAudio()` كان يعيد معظم القيم، لكنه لا يمسح `audioUpdateCue`.

### 2.2 templateAudioScenes

المشهد `silent_professional` ومشهد الصمت القديم يستخدمان `volumeMultiplier: 0`، لكن `sceneToFieldUpdates()` كان يكتب دائمًا:

```ts
sfxEnabled: true
```

هذا يجعل state تقول إن المؤثرات مفعّلة رغم أن المشهد صامت بالمعنى العملي. الخطر هنا UX وتشخيصي أكثر من كونه كسر runtime، لكنه مهم لأن DiagnosticStrip والـ Editor يجب أن يعكسا المعنى الحقيقي.

### 2.3 Editor

`Editor.tsx` كان يمرر إلى `AudioSettingsPanel`:

```tsx
onUpdate={(id, val) => handleDraftFieldChange(id, val)}
```

ولم يكن يمرر:

```tsx
onUpdateMany={(updates) => handleDraftFieldChanges(updates)}
```

رغم أن `handleDraftFieldChanges()` موجود ومستخدم في أماكن أخرى داخل Editor. لذلك كان الإصلاح آمنًا ومحليًا.

---

## 3. التغييرات المنفذة

### 3.1 مطابقة Test UPDATE لمسار runtime

الملف:

- `components/AudioSettingsPanel.tsx`

التغيير:

- إضافة `resolveTemplateAudio`.
- جعل `previewUpdate()` يستخدم:

```ts
audioUpdateCue || resolveTemplateAudio(overlay).updateCue || 'DATA_TICK'
```

الأثر:

- زر Test UPDATE أصبح أقرب لمسار `OverlayRenderer.resolveSynthCue('TRANSITION')`.
- القوالب التي لديها profile update cue خاص لن تسقط عشوائيًا إلى `DATA_TICK` داخل الاختبار.

### 3.2 Reset audio أصبح batch ويمسح update cue

الملف:

- `components/AudioSettingsPanel.tsx`

التغيير:

- استبدال سلسلة `onUpdate(...)` داخل `resetAudio()` بنداء واحد إلى `applyUpdates(...)`.
- إضافة:

```ts
audioUpdateCue: ''
```

الأثر:

- Reset لا يترك cue تحديث قديمًا.
- عند توفر `onUpdateMany` يصبح reset تحديثًا واحدًا منطقيًا بدل عدة تحديثات متتابعة.
- لا يلمس reset ملفات صوت أو voice assets.

### 3.3 المشاهد الصامتة تطفئ SFX فعليًا

الملف:

- `utils/templateAudioScenes.ts`

التغيير:

- إضافة:

```ts
const hasAudibleSfx = scene.volumeMultiplier > 0;
```

- ثم:

```ts
sfxEnabled: hasAudibleSfx
```

الأثر:

- `silent_professional` ومشاهد volume zero لم تعد تكتب `sfxEnabled=true`.
- المعنى داخل state أصبح أوضح: المشهد الصامت يعني SFX off.
- المشاهد ذات volume أعلى من صفر تعمل كما كانت.

### 3.4 تمرير batch updates من Editor إلى AudioSettingsPanel

الملف:

- `pages/Editor.tsx`

التغيير:

```tsx
onUpdateMany={(updates) => handleDraftFieldChanges(updates)}
```

الأثر:

- presets/scenes/reset أصبحت تمر عبر handler جماعي موجود أصلًا.
- يقل عدد sync updates الوسطية.
- لا توجد بنية جديدة ولا refactor.

---

## 4. الملفات المعدلة

| الملف | نوع التغيير | مستوى الخطر |
|---|---|---|
| `components/AudioSettingsPanel.tsx` | preview/update/reset cleanup | منخفض |
| `utils/templateAudioScenes.ts` | معنى صريح للمشاهد الصامتة | منخفض إلى متوسط |
| `pages/Editor.tsx` | تمرير `onUpdateMany` الموجود أصلًا | منخفض |

لم يتم تعديل:

- `components/renderers/*`
- `services/audioEngine.ts`
- `api/*`
- `constants.ts`
- `types.ts`
- Player Intel
- Stream Deck
- قوالب Mercato

---

## 5. التحقق

### 5.1 TypeScript

الأمر:

```bash
npm run lint
```

النتيجة:

```text
tsc --noEmit
```

نجح بدون أخطاء.

### 5.2 Build

الأمر:

```bash
npm run build
```

النتيجة:

- Vite build نجح.
- عدد modules المحولة: 1815.
- حجم JS الرئيسي: حوالي 1,755.03 kB.
- gzip: حوالي 442.32 kB.
- التحذير القديم ما زال موجودًا: chunk أكبر من 500 kB.

هذا التحذير ليس نتيجة هذا hotfix، وكان موجودًا في تقرير التدقيق كخطر performance لاحق.

### 5.3 Vercel functions

عدد route functions الحالي:

```text
10
```

الحد الداخلي المطلوب:

```text
<= 12
```

لم تتم إضافة أي endpoints.

---

## 6. ما لم يتم اختباره بصريًا أو صوتيًا

لم يتم فتح المتصفح في هذه المرحلة، ولم يتم ادعاء اختبار بصري أو سمعي مباشر.

السبب:

- التغيير صغير ومحدود.
- التحقق المطلوب بعد التنفيذ تم عبر lint/build/function count.
- الاختبار الصوتي الحقيقي يحتاج تشغيل التطبيق والمتصفح وinteraction يدوي.

### Manual QA checklist المقترح

1. افتح Editor على قالب يدعم Audio tab.
2. افتح Audio tab وتأكد أن الحقول الخام المدارة لا تظهر بعد `AudioSettingsPanel`.
3. اضغط Test UPDATE على قالب له update cue خاص وتأكد أن الصوت يطابق runtime.
4. اختر preset صامت وتأكد أن SFX يظهر off.
5. اختر `silent_professional` من scene picker وتأكد أن `sfxEnabled` يصبح false.
6. جرّب Reset audio وتأكد أن `audioUpdateCue` يعود فارغًا.
7. جرّب preset آخر بعد reset وتأكد أنه يكتب cue جديدًا.
8. راقب DiagnosticStrip عند UPDATE للتأكد من عدم ظهور reason غير متوقع.

---

## 7. تقييم الخطر

الخطر العام: منخفض.

أسباب انخفاض الخطر:

- التعديل في 3 ملفات فقط.
- لا يوجد endpoint.
- لا يوجد template ID.
- لا يوجد تغيير في renderer بصري.
- لا يوجد تغيير في `audioEngine.ts`.
- `onUpdateMany` كان موجودًا أصلًا في `AudioSettingsPanel` و`handleDraftFieldChanges` موجود أصلًا في Editor.

نقطة الخطر الوحيدة:

- أي مشهد `volumeMultiplier: 0` سيطفئ SFX بدل تركه مفعّلًا. هذا مقصود للمشاهد الصامتة، لكنه تغيير سلوكي يجب ملاحظته في QA.

---

## 8. التوصية التالية

بعد هذا hotfix، الأفضل عدم فتح Editor refactor بعد.

الخطوة التالية المقترحة:

1. اختبار يدوي Audio tab في المتصفح.
2. إن نجح، تنفيذ Phase B صغير: تقليل toggle legacy في Editor/Operator أو توضيحه.
3. بعدها Library taxonomy لـ `MERCATO_UNIFIED`.

لا أوصي الآن ببدء:

- Mercato visual redesign الكبير.
- Stream Deck feedback العميق.
- Player Intel persistence.
- Code splitting.

هذه كلها مراحل أكبر ويجب أن تأتي بعد تثبيت السلوك التشغيلي الأساسي.

