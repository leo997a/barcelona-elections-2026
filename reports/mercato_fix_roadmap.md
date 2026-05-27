# خريطة طريق الإصلاح — Mercato + Audio + UX

**التاريخ**: 2026-05-27
**Commit مرجعي**: `9b0057b`
**المبدأ**: "أصلح الجذور أولًا. لا redesign كبير قبل تثبيت الأساسيات."

---

## Phase A — Must-fix الآن (ساعات)

تركيز: إصلاح الـ 3 high-severity bugs + 2 medium بدون كسر، تعزيز UX feedback.

| # | Item | Risk | Effort | Impact |
|---|---|---|---|---|
| A1 | إصلاح `sceneToFieldUpdates` ليكتب `audioSceneId` ضمنه + ضمان أن `applyScene` لا يحتاج post-processing | 🟢 LOW | 15 min | عالي — scene apply يصبح كاملًا |
| A2 | إضافة "Test Play" زر بعد كل scene في `<AudioSettingsPanel>` يستدعي `playCue(scene.enterCue)` فورًا | 🟢 NONE | 20 min | عالي — يحل صمت Editor preview |
| A3 | إضافة `playSound('TRANSITION')` hook في `MercatoUnifiedRenderer` يراقب changes في key fields (chatLines, callDuration, probability) | 🟢 LOW | 1 ساعة | عالي — UPDATE cue يصبح حيًّا |
| A4 | إضافة `audioSceneId` إلى `SOUND_FIELDS` whitelist في Editor.tsx | 🟢 NONE | 5 min | متوسط — backward compat |
| A5 | استبدال `TYPE_FILTERS` flat بـ subcategory dynamic filter (يعرض subcategories الحالية فقط لو category != ALL) | 🟢 LOW | 45 min | متوسط — Library أنظف |
| A6 | إضافة Diagnostic Strip أسفل Editor يعرض `getAllDiagnostics()` للـ overlay الحالي | 🟢 LOW | 30 min | متوسط — feedback شفاف |
| A7 | حسم `playerIntelV2State.ts`: إما توثيق "deferred" في README أو حذف | 🟢 NONE | 5 min | منخفض — house cleaning |

**إجمالي Phase A**: ~3 ساعات. صفر breaking changes. 1 commit واحد.

**النتيجة المتوقعة**:
- Score visual quality: 60 → 70
- Score audio: 50 → 75
- Score Editor UX: 55 → 65
- Overall: 62 → 73

**شروط النجاح**:
- `npm run lint` exit 0
- `npm run build` exit 0
- functions = 10
- لا تغيير في template IDs
- لا حذف renderers
- اختبار يدوي على Agent Call #2: scene apply يصدر صوتًا فعلًا، UPDATE cue يُسمَع عند تغيير chatLines

---

## Phase B — Polish next (أسبوع)

تركيز: توحيد systems متجاورة، تنظيف 12 tab → 4 tabs، deprecate Mercato legacy.

| # | Item | Risk | Effort | Impact |
|---|---|---|---|---|
| B1 | Editor 12 tabs → 4 tabs (المحتوى/العرض/الصوت/متقدم). ELECTION-specific tabs تختفي ضمن "المحتوى" | 🟡 MEDIUM | يوم | عالي |
| B2 | `selectedStats` unified array لـ Player Intel V2 (مع backward compat لـ hero/secondary) | 🟡 MEDIUM | يوم | عالي |
| B3 | Mercato Legacy migration: 5 قوالب قديمة → MERCATO_UNIFIED variants. حذف `MercatoInnovativeRenderers.tsx` | 🟡 MEDIUM | يوم | عالي — حذف 1044 سطر |
| B4 | استخراج design tokens (`SPACING`, `TYPE`, `RADIUS`) إلى `utils/mercatoDesignTokens.ts` وتطبيقهم على variant واحد كنموذج | 🟢 LOW | يوم | متوسط — قاعدة لـ tokens مستقبلية |
| B5 | إضافة Stream Deck commands جديدة: `audio_toggle`, `audio_on`, `audio_off`, `reset` (لا endpoint جديد، فقط `mapCommand` extension) | 🟢 LOW | نصف يوم | متوسط |
| B6 | Diagnostics panel كامل في Editor advanced tab — يعرض كل overlays + last action + last error | 🟢 LOW | نصف يوم | منخفض-متوسط |

**إجمالي Phase B**: ~6 أيام. كل item commit مستقل.

**النتيجة المتوقعة**:
- Code organization: 4 → 7
- Editor maintainability: من 4018 سطر إلى ~2000
- constants.ts: من 2983 إلى ~2200 (بعد حذف Mercato legacy)
- Overall: 73 → 82

**شروط النجاح لكل item B**:
- اختبار يدوي للـ user flow الكامل (open → edit → preview → live → output → SD).
- snapshot قبل + بعد للـ visual quality (screenshots).
- 0 regressions في القوالب غير-Mercato.

---

## Phase C — Optional future (شهر)

تركيز: schema-driven design، test infrastructure، performance.

| # | Item | Risk | Effort | Impact |
|---|---|---|---|---|
| C1 | `templateSchema.ts` schema-driven design — كل قالب schema واحد، الـ Editor يولّد الـ form من الـ schema | 🔴 HIGH | أسبوع | عالي جدًا (تنظيف 700+ field declarations) |
| C2 | Vitest + React Testing Library — تغطية 60%+ للـ runtime/audio/state | 🟡 MEDIUM | أسبوع | عالي (regression safety) |
| C3 | Playwright visual regression للـ 27 OverlayType في 1920×1080 | 🟡 MEDIUM | أسبوع | عالي (UI safety) |
| C4 | Audio QA harness — سكربت يولّد كل cues كـ wav artifacts للمراجعة البشرية | 🟢 LOW | يومان | متوسط |
| C5 | Performance budget — JS bundle 1730KB → ≤800KB عبر code-splitting per route | 🟡 MEDIUM | 3 أيام | متوسط |
| C6 | `ARCHITECTURE.md` + `TEMPLATE_GUIDE.md` يشرحان المعمارية والتسجيل | 🟢 LOW | يومان | متوسط (onboarding) |
| C7 | Recently used + Favorites + Drag-to-add في Library | 🟢 LOW | يوم | متوسط |

**إجمالي Phase C**: ~3 أسابيع. الـ commits متباعدة، تختبر بشكل واسع.

**النتيجة المتوقعة**:
- Test coverage: 1/10 → 7/10
- Performance: 5/10 → 8/10
- Developer onboarding: 2/10 → 8/10
- Overall: 82 → 92

---

## التوصية الصارمة

1. **ابدأ بـ Phase A الآن** — 3 ساعات، صفر مخاطرة، يحل أكبر شكوى (scene لا يُسمَع، UPDATE cue ميت).

2. **توقّف بعد Phase A لـ اختبار يدوي بشري**. لا تقفز إلى Phase B بدون تأكيد أن Phase A فعلًا حلّ شيئًا للمستخدم. لو وجد bugs غير متوقعة في الاختبار، ندخل في hotfixes أولًا.

3. **Phase B يتطلب موافقة صريحة منك** — لأنه يحذف 1044 سطر renderer (Mercato legacy). يجب أن نوثّق migration script لـ overlays محفوظة. إذا لا overlays Mercato محفوظة فعلًا، الحذف بسيط.

4. **Phase C اختياري** — investment كبير. ينفّذ فقط إذا قررنا أن المنتج يجب أن يكون "broadcast-grade فعلًا". لو الهدف "internal tool"، Phase B كافٍ.

---

## معايير القرار

اختر Phase A فقط إذا:
- تريد إصلاحات سريعة آمنة، صفر مخاطرة.
- لديك وقت ساعتين للتجربة بعد commit.

اختر Phase A + B إذا:
- تقبل أسبوع عمل كامل.
- تقبل migration script لمستخدمين متعدّدين.
- تريد codebase أصغر بـ 30%.

اختر Phase A + B + C إذا:
- المنتج سيُستخدم في إنتاج فعلي طويل الأمد.
- يحتاج onboarding للمطورين الجدد.
- الميزانية تسمح بشهر تطوير.

---

## الالتزام

- **لن أبدأ Phase A قبل موافقتك الصريحة**.
- **لن أنفّذ Phase B دون اختبار يدوي بشري بعد A**.
- **Phase C يُناقَش بعد إكمال B**.

اخترت أيًا منها أو شيئًا مختلفًا، أنفّذ بانضباط.
