# Manual QA Script — Phase A (commit `c8d9749`)

**صريح**: أنا (Claude) **لا أستطيع** فتح متصفح أو سماع صوت. هذا script ليس "اختبارًا قمت به"، بل **قائمة مرجعية لك** لتختبرها أنت في 10-15 دقيقة. كل سيناريو فيه expected vs actual columns لتملأها.

ما أنا قمت به فعلًا: **flow trace** على مستوى الكود — 42/42 check تثبت أن الـ wiring متّصل من user click إلى DOM/audio call. هذا أقوى من lint لكنه **لا يستبدل** اختبار بشري حقيقي.

---

## كيف تستخدم هذا الـ script

1. شغّل المشروع محليًا (`npm run dev`).
2. لكل سيناريو، نفّذ الخطوات بالترتيب.
3. املأ عمود "Actual" (`✓` أو `✗ + شرح`).
4. لو وجدت `✗`، أرسل لي الـ row مع تفاصيل لأبحث في bug.
5. **لا** تبدأ Phase B قبل أن تكتمل الـ 12 سيناريو.

---

## السيناريوهات الـ 12

### S1 · Test Play لـ scene يُسمَع داخل Editor (A2)

| | |
|---|---|
| الإعداد | افتح Editor → اختر قالب "ميركاتو — مكالمة الوكيل المباشرة #2" → تبويب "صوت" |
| الخطوات | 1. اضغط رأس قسم "مشهد صوتي" لكشفه. 2. ابحث عن سطر "مكالمة/دردشة خاصة". 3. اضغط زر "اختبار" الأخضر بجانبه. |
| المتوقع | سماع صوت قصير (~0.5 ثانية): two-pulse light ring (`SOFT_CALL_RING_LIGHT`) |
| Actual |  |

### S2 · Apply scene يحدّث Diagnostic Strip (A1 + A6)

| | |
|---|---|
| الإعداد | نفس القالب من S1 |
| الخطوات | 1. اضغط "تطبيق" بجانب "مكالمة/دردشة خاصة". 2. انظر للشريط الرفيع أسفل preview. |
| المتوقع | الـ Diagnostic Strip يعرض `Sparkles + مكالمة/دردشة خاصة`. قبل التطبيق كان "بدون مشهد" |
| Actual |  |

### S3 · audioSceneId persisted في الـ overlay (A1)

| | |
|---|---|
| الإعداد | افتح DevTools console |
| الخطوات | 1. بعد S2، أكتب: `JSON.stringify(window.__overlays?.find(o=>o.id===window.location.hash.split('/')[2])?.fields?.find(f=>f.id==='audioSceneId'))`. (أو افحص localStorage) |
| المتوقع | يجب أن يحوي `value: 'mercato_private_chat_call'`. أيضًا `audioUpdateCue` يجب أن يكون `'SOFT_CHAT_INCOMING'` |
| Actual |  |
| ملاحظة | لو الـ console call لا يعمل، افحص localStorage مفتاح `reo-overlays-state-v2` أو ما يماثل |

### S4 · TRANSITION cue يُسمَع عند تغيير chatLines في Live (A3)

| | |
|---|---|
| الإعداد | بعد S2: 1. اضغط Take IN في الـ TemplateControlBar. 2. افتح Output في نافذة جديدة (زر "افتح output"). 3. ضع النافذتين جنبًا إلى جنب. |
| الخطوات | 1. في Editor → تبويب "أساسي/المحتوى" → عدّل JSON الـ chatLines (أضف رسالة جديدة). 2. اضغط خارج الحقل لـ commit التغيير. |
| المتوقع | في نافذة Output، يُسمَع cue قصير: descending two-tone (`SOFT_CHAT_INCOMING`). الـ overlay لا يختفي ولا يعيد ENTRY animation |
| Actual |  |

### S5 · TRANSITION cue يحترم SFX OFF (A3 + gate)

| | |
|---|---|
| الإعداد | بعد S4، الـ overlay live |
| الخطوات | 1. في تبويب الصوت → اضغط زر SFX ليصبح OFF. 2. عدّل chatLines مرة ثانية. |
| المتوقع | لا cue. Diagnostic Strip يعرض `sfx=✗` |
| Actual |  |

### S6 · Voice ON + SFX OFF — voice ما زال يعمل

| | |
|---|---|
| الإعداد | بعد S5 (sfx off)، overlay live |
| الخطوات | 1. في تبويب الصوت → فعّل Voice. 2. اختر voiceLibraryId = "هير وي غو" (أو أي scene voice). 3. اضغط زر "معاينة الصوت". |
| المتوقع | الصوت الحقيقي (.wav) يُسمَع، رغم أن SFX off. إذا حدث TRANSITION، فقط voice يُسمَع — لا cue |
| Actual |  |

### S7 · Mute العام يُسكت الكل + IN/OUT لا يكسره (A4)

| | |
|---|---|
| الإعداد | overlay live |
| الخطوات | 1. اضغط زر Mute في TemplateControlBar (أعلى Editor). 2. اضغط Take OUT. 3. اضغط Take IN. 4. عدّل chatLines. |
| المتوقع | لا أي صوت في كل الخطوات. Diagnostic Strip يعرض `Audio: OFF` ولا يتغيّر بسبب IN/OUT |
| Actual |  |

### S8 · audioSceneId قابل للتعديل عبر Editor field UI (A4)

| | |
|---|---|
| الإعداد | في Editor → تبويب "صوت" |
| الخطوات | scroll حتى تجد حقل "مشهد صوتي" (text field — fallback لو panel فشل). |
| المتوقع | الحقل يظهر، قيمته الحالية = `mercato_private_chat_call`، قابل للتعديل يدوي |
| Actual |  |

### S9 · Library: subcategories ديناميكية، TYPE_FILTERS اختفت (A5)

| | |
|---|---|
| الإعداد | افتح Library |
| الخطوات | 1. تأكد أن الـ sidebar الأيمن لا يحوي قائمة 24 type filter القديمة. 2. اضغط "ميركاتو" في "الفئة الرئيسية". 3. تأكد أن قسم جديد "المجموعة الفرعية" ظهر مع 6 خيارات (عاجل وميركاتو، وكلاء ومصادر، تحليل صفقة، رسمي ووثائق، الحسم، الفحص). 4. اضغط "وكلاء ومصادر". |
| المتوقع | الـ catalog يُفلتر إلى قوالب Mercato/agents فقط. اضغط "كل الفئات" → الـ subcategories تختفي |
| Actual |  |

### S10 · Library يحفظ الفلتر بين Tab Catalog و Mine

| | |
|---|---|
| الإعداد | في Library |
| الخطوات | 1. اختر category=ميركاتو، subcategory=وكلاء. 2. غيّر للـ tab "قوالبي". |
| المتوقع | الفلتر يُطبَّق على كل الـ tabs (ليس مزدوج state) |
| Actual |  |

### S11 · Update field عندما الـ overlay hidden لا يجعله يظهر (X1 regression check)

| | |
|---|---|
| الإعداد | overlay hidden (Take OUT) |
| الخطوات | 1. عدّل chatLines. 2. عدّل callDuration. 3. عدّل probability. |
| المتوقع | الـ overlay يبقى hidden. لا cue. Diagnostic Strip "OFF". |
| Actual |  |

### S12 · 5 قوالب Mercato أخرى تستفيد من TRANSITION

| | |
|---|---|
| الإعداد | لكل قالب من: Deal Radar، Hijack Alert، Medical Tracker، Deadline Hour، Source Confidence |
| الخطوات | 1. افتحه في Library. 2. اعمل Take IN. 3. عدّل الحقل المرتبط (probability / riskLevel / medicalStage / dealStage / sources). |
| المتوقع | كل قالب يُطلق TRANSITION cue (الـ scene الافتراضي مختلف لكل قالب — analysis_lab يستخدم DATA_TICK، breaking_news_clean يستخدم DATA_TICK، إلخ) |
| Actual |  |

---

## ملخص النتائج

| Score | معنى |
|---|---|
| 12/12 PASS | Phase A نجح في المتصفح، يمكن البدء بـ Phase B |
| 10-11/12 | حالة جيدة، ابحث في الـ failures قبل B |
| ≤ 9/12 | Phase A لم يحلّ المشاكل فعلًا — لا تبدأ B |

أرسل لي النتائج الفعلية وأبحث في أي failure قبل Phase B.

---

## ما تأكدتُ منه ميكانيكيًا (Flow trace 42/42 PASS)

- ✓ `applyScene` → `sceneToFieldUpdates` → 6 fields مكتوبة (audioSceneId, soundInStyle, soundOutStyle, sfxEnabled, audioUpdateCue, soundVolume)
- ✓ `OverlayRenderer.resolveSynthCue` يقرأ `audioUpdateCue` field عند TRANSITION، ويعطيه أولوية على runtime profile
- ✓ Mercato `useEffect` hook يراقب 9 fields، يتجاوز first-mount false-positive
- ✓ `shouldPlayTemplateSound` ما زال يحرس TRANSITION (sfxEnabled=false يحجب)
- ✓ Test Play handler يستدعي `playCue` مباشرة، **لا يمر بـ playSound** فلا يحجبه isEditor
- ✓ `TYPE_FILTERS` const محذوف، `listSubcategoriesFor` مستخدم، subcategoryFilter في كلا catalogList و myList
- ✓ Category change يعيد activeSubcategory إلى 'ALL' (لا orphaned filter)
- ✓ كل الـ 7 categories لها ≥ 1 subcategory في taxonomy
- ✓ DiagnosticStrip يستخدم `liveOverlay` (state الفعلي)، يقرأ `getDiagnostic`، يعرض scene name، LIVE/OFF من `deriveStatus`
- ✓ `playerIntelV2State.ts` محذوف من القرص + 0 imports remaining
- ✓ 10 endpoints (لم يتغيّر)

ما لم يتأكد منه (يحتاجك): الصوت الفعلي يُسمَع، الـ animations تعمل، الـ UI يبدو صحيحًا.
