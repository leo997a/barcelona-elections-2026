# تدقيق Mercato — البصري والصوتي وتجربة الإعدادات

**التاريخ**: 2026-05-27
**النطاق**: قوالب Mercato + نظام الصوت + الإعدادات + الـ runtime
**الحالة**: تدقيق ساكن مكتمل، صفر تعديلات على الكود حتى الآن
**Commit مرجعي**: `9b0057b` (آخر phase: MERCATO-QUALITY-X7 + LIBRARY-TAXONOMY-X8)

---

## 1. الخلاصة التنفيذية

المنتج وصل إلى **مرحلة العمل المستقر تقنيًا** (lint/build نظيفان، 10 functions، 56 قالب)، لكنه **لم يصل إلى المستوى الاحترافي العالمي** بعد. السبب الرئيسي: **9 phases متراكمة في يومين** أضافت طبقات (audio gates، scenes، voice library، taxonomy، unified renderer، control bar) دون توحيد فعلي بينها. النتيجة: أنظمة متجاورة تبدو متكاملة لكنها فعليًا تحتوي **5 bugs جذرية** تجعل الـ UX مكسورًا في المسار الحرج للمستخدم.

### النتيجة الإجمالية: **62 / 100**

| البُعد | الدرجة | السبب |
|---|---|---|
| جودة كود Mercato البصرية | 65/100 | Unified renderer جيد بنيويًا، لكن hardcoded sizes (86) و inline styles (121) تجعل الـ polish مرهقًا |
| منطق نظام الصوت | 50/100 | gates مبنية، لكن TRANSITION cue لا يُسمَع أبدًا في Mercato، scene apply ناقص 3 حقول |
| تجربة Editor (إعدادات + Preview) | 55/100 | Preview صامت بالكامل، لا feedback عند تطبيق scene، 12 tab، 44 useState |
| Library taxonomy | 60/100 | 7 categories مضافة، لكن 24 type filter فلات ما زال موجودًا فوقها |
| اتساق الـ runtime | 80/100 | gates و debounce متينة، تسجيل diagnostics يعمل |
| Stream Deck | 75/100 | يعمل عبر `/api/live` بدون تغيير، لكن لا feedback لحالة overlay |
| Type safety | 70/100 | 37 `any` leak في المشروع، صفر في Mercato unified renderer |

### المخاطر الكبرى

1. **Scene picker يكذب على المستخدم** — يضغط "تطبيق مشهد مكالمة"، يخزَّن `audioSceneId` بصريًا، لكن `updateCue` لا يُكتب فعليًا في حقول الـ overlay.
2. **TRANSITION cue ميت في Mercato** — الـ scene يحدّد `updateCue: SOFT_CHAT_INCOMING`، لكن لا renderer Mercato يستدعي `playSound('TRANSITION')` أبدًا.
3. **Preview صامت بالكامل** — اختبار أي scene داخل Editor يعطي انطباعًا "لا شيء يحدث".
4. **Two Mercato systems live** — `MercatoInnovativeRenderers` (5 templates، 1044 سطر) و `MercatoUnifiedRenderer` (10 templates، 736 سطر) كلاهما active. Agent Call موجود في الاثنين.
5. **`playerIntelV2State.ts` ما زال untracked** عبر 6 phases متتالية. علامة أن الخطط تُنسى.

### الانتصارات الكبرى

1. **Audio gate موحّد** (`shouldPlayTemplateSound` + `shouldPlayVoiceCue`) — 0 بدائل غامضة.
2. **`update_field` auto-injects** الحقول المفقودة — Mute فعلًا يصل.
3. **Voice/SFX منفصلون** — يمكن تشغيل voice بدون SFX والعكس.
4. **`createMercatoTemplate` factory** — تجنّب 600 سطر تكرار في constants.
5. **0 ملف صوتي محظور** (whatsapp/telegram/messenger) — السياسة محفوظة.

---

## 2. درجات الأقسام التفصيلية

### A. التدقيق البصري — قوالب Mercato

| القالب | الحالة | النقطة الحرجة |
|---|---|---|
| Agent Call (الأصلي) | acceptable | renderer قديم 980 سطر، يعمل لكن غير محسّن X7 |
| Agent Call #2 (الجديد) | acceptable | تصميم 3 أعمدة جيد، لكن Player Image card يبقى فارغًا (no graceful empty state داخل الكارد نفسه) |
| Deal Radar | acceptable | SVG ناجح، لكن sources كقائمة بسيطة بدون hierarchy |
| Club Statement | weak | watermark خلفية فقط، لا real "official letter" feel |
| Deadline Hour | good | countdown 52px واضح، 5 stages مرتبة |
| Source Confidence | acceptable | tier counters منطقي، لكن tier C lonely visually |
| Clause Reveal | acceptable | gradient stripe + value box جيد، body text يحتاج better typography |
| Medical Tracker | good | 4 stages مع icon + state label الأفضل في المجموعة |
| Hijack Alert | acceptable | VS divider قوي، لكن النوادي cards متشابهة جدًا (تحتاج logos) |
| Personal Terms | weak | 3 hero cards فقط، disclaimer ribbon جيد لكن المحتوى ضحل |
| Here We Go Build-Up | good | timeline glowing dots + last entry highlight يعمل بصريًا |

**درجة المتوسط**: 60/100 — أقوى ما فيه: Medical Tracker, Deadline Hour, Build-Up. أضعف: Club Statement, Personal Terms.

### B. التدقيق الصوتي — السلوك الفعلي

**النتيجة: 50/100**

| الحدث | المتوقع | الفعلي | الجذر |
|---|---|---|---|
| Apply scene "Private Chat Call" | يُكتب enterCue + exitCue + updateCue + sfxEnabled + audioSceneId + volume multiplier | يُكتب soundInStyle + soundOutStyle + sfxEnabled + audioSceneId فقط (4 من 6) | `sceneToFieldUpdates` ناقص، `applyScene` يضيف audioSceneId لكن الباقي مفقود |
| ENTRY في Editor preview | يُسمَع | لا يُسمَع | `isEditor` يحجب `playSound` بـ early return |
| TRANSITION/UPDATE cue في Mercato live | يُسمَع عند تحديث field | لا يُسمَع أبدًا | لا renderer Mercato يستدعي `playSound('TRANSITION')` |
| Voice trigger `on_enter` لـ Mercato | voice cue يبدأ مع IN | يعمل | OverlayRenderer.playSound يحوي trigger map صحيح |
| Mute toggle بعد X4 | يُسكت IN+OUT+voice | يعمل | gate موحّد، update_field auto-injects |
| Volume = 0 | يحجب الكل | يعمل | gate يعيد false |
| Old enableVoice/enableSfx Mercato | يحترم universal voiceEnabled | يعمل (X4 fallback) | useMercatoAudio يدمج المسارين |

### C. التدقيق UX للإعدادات

**النتيجة: 55/100**

- **12 tab في Editor** (fields, candidates, time, content, camera, style, turnout, images, position, sound, slots, sponsors).
- **44 useState** في Editor.tsx (4,018 سطر).
- **`SOUND_FIELDS` ترتيب عشوائي**: `useTTS/ttsText` بين الأساسيات، voice في الأخير.
- **`audioSceneId` غير موجود في SOUND_FIELDS** — لو AudioSettingsPanel فشل، الحقل غير قابل للتعديل.
- **`<AudioSettingsPanel>` يظهر فقط في غير-ELECTION**. ELECTION له مسار خاص. هذا يكسر الاتساق.
- **Scene picker collapsed by default** (`showScenePicker=false`) — المستخدم لا يكتشف وجوده.
- **+Voice button** يظهر فقط لـ scenes حيث `voiceRecommended=true` — قاعدة منطقية لكن غير شفافة في UI.

### D. تدقيق اختيار الإحصائيات (Player Intel V2)

**النتيجة: 65/100**

- النظام موسَّع (12 hero + 24 secondary حد أقصى = 36 إحصائية).
- Smart presets موجودة (8 presets، أكبرها complete_report بـ 25 إحصائية).
- Layout indicator يعكس الحالة الحالية (Hero/Compact/Matrix/Data Table).
- **مشاكل**:
  - الـ scope tab informational فقط (لا يفلتر metricPool).
  - hero/secondary forced split، رغم أن المستخدم طلب unified `selectedStats` array.
  - `playerIntelV2State.ts` نموذج مُعرَّف لكن غير مربوط، عبر 6 phases.

### E. تدقيق Stream Deck و Runtime

**النتيجة: 75/100**

- Stream Deck plugin يعمل عبر `/api/live` GET → POST، بدون endpoint جديد.
- ENTRY/EXIT guards (`previousVisibilityRef !== true` + `SOUND_DEBOUNCE_MS=300`) متين.
- `recordDiagnostic` يكتب آخر action تلقائيًا.
- **مشاكل**:
  - لا UI panel يعرض `getAllDiagnostics()` (الـ data جاهزة، الـ panel غير منفّذ).
  - Stream Deck plugin لا يدعم toggle audio أو reset كأزرار مستقلة.
  - لا feedback من overlay state إلى Stream Deck button color.

---

## 3. أهم 10 مشاكل (مرتبة بالخطورة)

| # | المشكلة | الخطورة | الجذر |
|---|---|---|---|
| 1 | TRANSITION cue غير مفعّل في Mercato | عالية | لا `playSound('TRANSITION')` في أي Mercato renderer |
| 2 | scene apply ناقص (`updateCue`/`soundVolume` لا يُكتبان) | عالية | `sceneToFieldUpdates` يكتب 3 حقول من 6 |
| 3 | Preview الـ Editor صامت بالكامل | متوسطة | `isEditor` early-return يخدع المستخدم في الاختبار |
| 4 | نظامان renderer لـ Mercato يعملان معًا | عالية | `MercatoInnovativeRenderers` + `MercatoUnifiedRenderer` |
| 5 | Library عنده 2 فلتر متراكب (taxonomy + TYPE_FILTERS) | متوسطة | category sidebar أُضيف فوق القديم بدون حذف |
| 6 | 12 tab في Editor، 44 useState | متوسطة | لم يُنفَّذ refactor، Election tabs مدمجة مع العامة |
| 7 | `audioSceneId` غير قابل للتعديل عبر field UI | منخفضة | حذف من SOUND_FIELDS |
| 8 | Hijack Alert clubs cards بدون شعارات | منخفضة | بصرية فقط |
| 9 | `playerIntelV2State.ts` untracked عبر 6 phases | منخفضة | حالة منسية |
| 10 | 86 `text-[Npx]` + 121 inline style في unified renderer | منخفضة | لا design tokens، يصعب tweaking |

## 4. أهم 10 إصلاحات موصى بها

| # | الإصلاح | المتأثر | المخاطرة |
|---|---|---|---|
| 1 | إكمال `sceneToFieldUpdates` ليكتب updateCue + sceneVolumeMultiplier | utils/templateAudioScenes.ts | منخفضة |
| 2 | إضافة `playSound('TRANSITION')` hook في MercatoUnifiedRenderer عند تغيير key fields | MercatoUnifiedRenderer.tsx | منخفضة |
| 3 | إضافة "Test play" زر في scene picker — يستدعي `playCue(scene.enterCue)` مباشرة | AudioSettingsPanel.tsx | لا |
| 4 | تحويل 5 templates Mercato القديمة إلى MERCATO_UNIFIED variants (deprecate المحرك القديم) | constants.ts + OverlayRenderer.tsx | متوسطة |
| 5 | حذف TYPE_FILTERS من Library واستبدالها بـ subcategory filter داخل category | pages/Library.tsx | منخفضة |
| 6 | إضافة `audioSceneId` إلى SOUND_FIELDS كـ legacy fallback | pages/Editor.tsx | لا |
| 7 | كتابة `MANUAL_TEST_SCRIPT.md` بـ 50 سيناريو ليتأكد المستخدم بنفسه | جديد | لا |
| 8 | إضافة diagnostics panel صغير في Editor يعرض آخر action لكل overlay | pages/Editor.tsx | منخفضة |
| 9 | حسم `playerIntelV2State.ts`: ربط أو حذف | components/player-intel-v2/* | منخفضة |
| 10 | استخراج design tokens (spacing, font sizes) إلى ملف واحد | components/renderers/* | عالية (refactor) |

---

## 5. الخلاصة الصريحة

المشروع **شغّال** لكنه لم يبلغ بعد مستوى أداة بث عالمية. أكبر فجوة: **الـ audio scene picker يبدو يعمل لكنه فعليًا لا يكتب كل ما يجب**، و **Preview الـ Editor صامت** فيخدع المستخدم. هاتان مشكلتان غير مرئيتان من السطح — تحتاج تدقيق كود.

الإصلاحات الموصى بها قابلة للتنفيذ في **3-5 phases صغيرة آمنة** بدون أي redesign كبير. التفاصيل في `mercato_fix_roadmap.md`.

---

**التقارير المرافقة**:
- `reports/mercato_bug_matrix.md` — جدول bug-by-bug مع reproducible steps
- `reports/mercato_ux_blueprint.md` — معمارية إعدادات مقترحة
- `reports/mercato_fix_roadmap.md` — Phase A/B/C
