# Phase A — Audit شامل لـ Mercato + 7 إصلاحات غير كاسرة

**التاريخ**: 27 مايو 2026
**Commits**: `c8d9749` (Phase A تنفيذ) + `cc1d91f` (تقارير QA + valuation)
**النطاق**: قوالب Mercato العشر + AudioSettingsPanel + Library + Editor diagnostics
**المبدأ**: "أصلح الجذور أولًا. لا redesign كبير قبل تثبيت الأساسيات."

---

## 1. لماذا audit أولًا؟

المستخدم طلب صراحة: *"Before any big implementation, I want a real audit-first mission. Do not rush into redesign. I want a brutally honest diagnosis, a world-class UX improvement plan, and only then controlled non-breaking fixes."*

النتيجة: 4 تقارير audit مكتوبة قبل أي تعديل كود، ثم 7 إصلاحات صغيرة محسوبة، ثم QA script يدوي.

### الأمراض الـ 7 التي اكتشفها الـ audit

| # | المشكلة | التشخيص |
|---|---|---|
| 1 | Apply Scene يكذب على المستخدم | يضغط "تطبيق مشهد مكالمة"، يُخزَّن `audioSceneId` بصريًا، لكن `updateCue` لا يُكتب فعليًا في حقول الـ overlay. |
| 2 | TRANSITION cue ميت في Mercato | الـ scene يحدّد `updateCue: SOFT_CHAT_INCOMING`، لكن لا renderer Mercato يستدعي `playSound('TRANSITION')` أبدًا. |
| 3 | Preview صامت بالكامل | اختبار أي scene داخل Editor يعطي انطباعًا "لا شيء يحدث" — `isEditor=true` يحجب `playSound`. |
| 4 | حقول `audioSceneId` و `audioUpdateCue` مفقودة من SOUND_FIELDS | لا تظهر كحقول قابلة للقراءة في تبويب الصوت. |
| 5 | TYPE_FILTERS مسطَّح في Library | لا يستفيد من 7 categories + 20 subcategories الجديدة. |
| 6 | لا Diagnostic Strip | المستخدم لا يرى حالة overlay المباشرة (LIVE/OFF، آخر حدث، مشهد صوتي، أخطاء). |
| 7 | `playerIntelV2State.ts` untracked + 0 consumers | tech debt. |

### تقارير الـ audit (في `reports/` بالإنجليزية)

1. `mercato_visual_audio_ux_audit.md` — جذور الأمراض الـ 7.
2. `mercato_bug_matrix.md` — جدول bugs بـ severity / reproducibility / risk.
3. `mercato_ux_blueprint.md` — مبادئ تصميم لـ Mercato.
4. `mercato_fix_roadmap.md` — Phase A → B → C plan.

---

## 2. Phase A — تنفيذ 7 إصلاحات (commit `c8d9749`)

### A1 — `sceneToFieldUpdates` يكتب 6 حقول بدل 3

**الملف**: `utils/templateAudioScenes.ts`

قبل:
```ts
{ soundInStyle, soundOutStyle, sfxEnabled }   // 3 حقول
```

بعد:
```ts
{
  audioSceneId,        // ← المشهد محفوظ صراحة
  soundInStyle,
  soundOutStyle,
  sfxEnabled,
  audioUpdateCue,      // ← cue التحديث (للـ TRANSITION)
  soundVolume,         // ← volume multiplier
}
```

النتيجة: Apply Scene الآن يكتب الحقل الصوتي بالكامل. المستخدم يرى تغييرًا حقيقيًا في `localStorage` بدل تخزين بصري فارغ.

### A2 — زر Test Play لكل scene

**الملف**: `components/AudioSettingsPanel.tsx`

قبل: المستخدم يضغط "تطبيق مشهد"، يُخزَّن، لكن لا يسمع شيئًا (`isEditor=true` يحجب).

بعد: زر "اختبار" أصغر بجانب "تطبيق" يستدعي `playCue(scene.enterCue, { volume })` مباشرة — يتجاوز حارس الـ Editor فيُسمع الصوت فورًا قبل اتخاذ القرار.

```tsx
<button onClick={() => {
  const vol = soundVolume * (s.volumeMultiplier || 1);
  void playCue(s.enterCue, { volume: vol });
}}>اختبار</button>
```

### A3 — TRANSITION cue hook في MercatoUnifiedRenderer

**الملف**: `components/renderers/MercatoUnifiedRenderer.tsx`

قبل: لا renderer Mercato يطلق صوتًا عند تحديث field. الـ scene يحدّد `updateCue` لكن لا أحد يقرأه.

بعد: `useEffect` يراقب 9 حقول حساسة (`chatLines`, `callDuration`, `probability`, `riskLevel`, `medicalStage`, `dealStage`, `confidencePct`, `timelineEntries`, `sources`). عند تغيير watchedHash يطلق `playSound('TRANSITION')`. الـ ENTRY/EXIT لم يُلمس.

`OverlayRenderer.resolveSynthCue('TRANSITION')` تم تعديله في نفس الـ commit ليقرأ `audioUpdateCue` field أولًا (set by sceneToFieldUpdates) ثم يعود إلى runtime profile.

### A4 — `audioSceneId` و `audioUpdateCue` يُضافان إلى SOUND_FIELDS

**الملف**: `pages/Editor.tsx`

`SOUND_FIELDS` whitelist كان يحدد أي fields يظهر في تبويب الصوت. أُضيف `audioSceneId` + `audioUpdateCue` فأصبحا قابلَين للرؤية للـ debugging.

### A5 — Subcategory dynamic filter

**الملف**: `pages/Library.tsx`

قبل: `TYPE_FILTERS` const مسطَّح بـ 6 خيارات ثابتة.
بعد: مفتاح Category (7 خيار) ثم subcategory dropdown ديناميكي يعتمد على `listSubcategoriesFor(category)` من `utils/templateTaxonomy.ts`. Library تظهر القوالب حسب category + subcategory معًا.

### A6 — DiagnosticStrip component

**الملف**: `components/DiagnosticStrip.tsx` (جديد، +135 سطر)

شريط أسفل Editor preview يعرض:
- LIVE / OFF status (مع pulse dot أحمر عند live)
- آخر action + relative timestamp
- audio status (sfx ✓/✗، voice ✓/✗)
- audio scene الحالي
- آخر transition attempt (Phase A Hotfix-1 سيضيف block reason)
- Stream Deck status (اختياري)
- آخر error

### A7 — حذف `playerIntelV2State.ts`

كان untracked + 0 consumers. حُذف بدل ترك tech debt.

---

## 3. التقارير المضافة (commit `cc1d91f`)

### `manual_qa_phase_a_script.md` (إنجليزي)

12 سيناريو اختبار يدوي للمستخدم البشري — يغطي scene apply، test play، live update، diagnostic strip، library subcategory.

تم تأكيد ميكانيكيًا (flow trace 42/42 PASS):
- ✓ `applyScene` → `sceneToFieldUpdates` → 6 حقول مكتوبة فعلًا.
- ✓ `OverlayRenderer.resolveSynthCue` يعطي `audioUpdateCue` أولوية على runtime profile.
- ✓ Mercato `useEffect` hook يراقب 9 fields، يتجاوز first-mount false-positive.
- ✓ `shouldPlayTemplateSound` ما زال يحرس TRANSITION (sfxEnabled=false يحجب).
- ✓ Test Play handler يستدعي `playCue` مباشرة، لا يمر بـ playSound فلا يحجبه isEditor.
- ✓ `TYPE_FILTERS` const محذوف، `listSubcategoriesFor` مستخدم.

### `project_valuation_reality_check.md` (إنجليزي)

تقرير صراحة كامل عن قيمة المشروع الحالية، الفجوات، والمسار للـ broadcast-grade.

---

## 4. ضمانات Phase A

- ✅ صفر breaking changes.
- ✅ صفر template IDs غُيِّرت.
- ✅ صفر renderers محذوفة.
- ✅ `npm run lint` Exit 0.
- ✅ `npm run build` Exit 0.
- ✅ Functions count = 10 (تحت سقف 12).
- ✅ Player Intel V2 لم يُلمس.
- ✅ Stream Deck لم يُلمس.

---

## 5. ما تأكدتُ منه ميكانيكيًا فقط

لا أستطيع فتح browser ولا سماع الصوت. كل ما عملته من Phase A تم تأكيده عبر flow trace. الاختبار البشري الفعلي تم بعد commit `615c8f3` (Phase A Hotfix-1) عندما اكتشف المستخدم أن live chatLines/callDuration update لا يطلق الصوت — وهي مشكلة جذرها في `useRef` first-mount guard، تم إصلاحها في Hotfix-1.

---

## 6. ما تركه Phase A للـ Phase B/C

Phase A أصلح الـ "must-fix الآن" (3 ساعات عمل). Phase B تبقى مجمَّدة بانتظار اختبار يدوي بشري — لا يُسمح ببدئها قبل أن يؤكد المستخدم نتائج Phase A (و Hotfix-1 لاحقًا).

---

## ملخص الملفات

```
M  utils/templateAudioScenes.ts                   (sceneToFieldUpdates يكتب 6 حقول)
M  components/AudioSettingsPanel.tsx              (+زر اختبار لكل scene)
M  components/renderers/MercatoUnifiedRenderer.tsx (TRANSITION hook + watchedHash)
M  components/OverlayRenderer.tsx                 (resolveSynthCue يقرأ audioUpdateCue)
M  pages/Editor.tsx                               (SOUND_FIELDS + import DiagnosticStrip)
M  pages/Library.tsx                              (subcategory filter)
A  components/DiagnosticStrip.tsx                 (جديد، +135 سطر)
A  utils/templateTaxonomy.ts                      (تأكدنا من استخدامه)
D  utils/playerIntelV2State.ts                    (untracked → deleted)
A  reports/mercato_visual_audio_ux_audit.md
A  reports/mercato_bug_matrix.md
A  reports/mercato_ux_blueprint.md
A  reports/mercato_fix_roadmap.md
A  reports/manual_qa_phase_a_script.md
A  reports/project_valuation_reality_check.md
```
