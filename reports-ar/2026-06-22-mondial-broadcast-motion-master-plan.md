# الخطة الرئيسية لتطوير قوالب المونديال وهوية REO SHOW

التاريخ: 2026-06-22  
الحالة: خطة تنفيذ معتمدة للتقسيم إلى دفعات  
النطاق: قوالب المونديال، المحرر، العرض المباشر، الصوت، الثيمات، الستايلات، والتحقق داخل OBS

## 1. النتيجة المطلوبة

تحويل قوالب المونديال من مجموعة شاشات ثابتة ذات حركات دخول بسيطة إلى حزمة بث رياضي متكاملة لقناة `REO SHOW`، تشمل:

- هوية هندسية مسطحة عالية التباين مستلهمة من مراجع المونديال المرفقة، وليست glassmorphism عامة.
- اختيار مستقل للثيم اللوني، الستايل التركيبي، ونمط الحركة.
- دورة موحدة: `IN -> HOLD -> UPDATE -> OUT`.
- انتقال دخول وخروج متعدد الطبقات ومتزامن مع مؤثر صوتي أصلي.
- معاينة حقيقية داخل المحرر تعيد تشغيل الدخول والثبات والخروج والصوت.
- توسعة منظمة للقوالب لتغطية المباريات، الأحداث، اللاعبين، المجموعات، القرعة، الهوية، والـoutro.
- توافق عملي مع OBS عند 1920x1080 و1280x720، إضافة إلى المقاسات الرأسية.

المرجع الزمني الأساسي للحركة:

- [FIFA World Cup 2026 Theme Motion Graphics Tutorial in After Effects | PARAPIX](https://www.youtube.com/watch?v=cfVtTNOQc0Y)
- مدة المرجع المقاسة: نحو `6.661s`.
- لا يتم نسخ الصوت أو الشعارات المحمية من الفيديو؛ يتم بناء حركة وصوت أصليين لهوية REO SHOW مع نفس منطق الإيقاع والطبقات.

## 2. التشخيص المؤكد

### 2.1 الإعدادات

- أغلب حقول المحتوى الأساسية متصلة بالمحرر والحفظ والرندر.
- `Settings.tsx` لا يدير إعدادات القوالب؛ الإعدادات الفعلية توجد في Editor وحقول Overlay.
- القوالب القديمة لا تدمج تلقائياً مع الحقول الجديدة، لذلك تظهر إعدادات ناقصة أو غير مؤثرة.
- `scale` و`positionX` و`positionY` تطبق في الغلاف العام ثم مرة أخرى داخل محركات المونديال.
- بعض قيم Boolean في قوالب العراق لا يمكن تعطيلها بسبب fallback يعيدها إلى `true`.
- `channelName` معرف لكنه غير مستخدم بصرياً.
- `BROADCAST_OUT` و`SOFT_FADE` موجودان ضمن خيارات الانتقال البصري، بينما هما أسماء صوتية وليسا مفاتيح حركة صحيحة.
- Slots قد تستعيد نسخة أقدم من إعدادات القالب.
- بيانات Bridge متداخلة، بينما Renderer يتوقع بيانات مسطحة.

### 2.2 الأنميشن

- توجد keyframes مستخدمة فعلاً، لكنها حركات دخول one-shot داخل القالب.
- `OverlayRenderer` يدير دخولاً وخروجاً عاماً بمدة تقارب 0.5-0.7 ثانية.
- لا توجد state machine حقيقية لمراحل `enter/hold/update/exit`.
- الخروج يعتمد على timeout ثابت `600ms` وليس نهاية الحركة الفعلية.
- المحرر يعطل lifecycle العام، لذلك لا يعرض Preview سلوك OBS الحقيقي.
- تحديث البيانات أثناء البث لا يطلق حركة تحديث مخصصة.
- توجد CSS animations قديمة وغير مستخدمة، إضافة إلى مكونات legacy غير قابلة للوصول من مسار render الحالي.

### 2.3 الثيمات والستايلات

- توجد ستة themes حالياً، لكن القوالب الجديدة تعتمد لوحة ألوان ثابتة `WC`.
- اختيار الثيم يغيّر الخلفية أكثر مما يغيّر التصميم الداخلي.
- لا يوجد `mondialStyle` مستقل يغيّر geometry، typography، flag treatment، أو composition.
- قوالب العراق تجبر `IRAQ_PRIDE` ولا تسمح بالاختيار.

### 2.4 الصوت

- IN وOUT يعملان في العرض المباشر، لكنهما لا يعملان داخل Preview المحرر.
- `audioUpdateCue` معرف ولا يوجد حدث runtime موحد يشغله عند تحديث البيانات.
- `duckSfx` ظاهر في الواجهة بلا مستهلك فعلي.
- بعض أسماء الحقول قديمة أو متعارضة: `directVoiceUrl` مقابل `voiceDirectUrl`.
- مستويات الصوت غير متسقة بين schema والواجهة وruntime.
- مزامنة الصوت حالياً event-based وليست مرتبطة بعلامات زمنية داخل motion timeline.

## 3. حصر المراجع البصرية

تم حصر `135` ملفاً داخل مجلد التغذية، منها:

- `100 JPG`.
- `8 PNG`.
- `13 GIF`.
- `60` أصلاً بصرياً ثابتاً بعد حذف التكرارات والقصات المختلفة.

عائلات GIF الأساسية:

| العائلة | المدة المرجعية |
|---|---:|
| نتيجتان متزامنتان | 8.40s |
| مقارنة إحصاءات مباراة | 8.40s |
| Outro تميمة وشكر | 2.16s |
| تشكيلة كاملة | 8.40s |
| لاعب وتبديل | 7.41s |
| Goal / Offside / VAR | 7.41s |
| Ident البطولة | 4.08s |
| Match Intro | 8.40s |

سمات الهوية التي يجب تحويلها إلى نظام تصميم:

- أسود وأبيض مع cobalt وcyan وlime وأحمر وبرتقالي مشبع.
- كتل هندسية مسطحة ومناطق قص واضحة.
- chromatic trails خلف البطاقات والعلامات.
- center wipes وmask reveals.
- stagger للصفوف واللاعبين والإحصاءات.
- عدادات رقمية للنتائج والنسب.
- صور لاعبين مقصوصة مع parallax محدود.
- خط condensed ثقيل للعناوين والأرقام.
- أعلام متعددة المعالجات: دائري، pill، stacked، outlined، chromatic.

## 4. القرار المعماري

### 4.1 محرك الحركة

الاختيار: `Web Animations API + CSS variables + Web Audio scheduling`، دون إضافة مكتبة حركة في المرحلة الأولى.

الأسباب:

- مدعوم في Chromium وOBS Browser Source.
- يسمح بالتشغيل، الإيقاف، الإعادة، والانتقال إلى زمن محدد.
- يعطي تحكماً دقيقاً بالـtimeline دون الاعتماد على remount.
- لا يضيف dependency أو bundle كبيراً.
- يمكن مزامنته مع `AudioContext.currentTime` بدقة أعلى من `setTimeout`.

لا تستخدم inline animation strings داخل كل قالب. الحركة تعرف في registry واحد، والقالب يعلن العناصر أو الأدوار التي يملكها فقط.

### 4.2 نموذج الحالة

```text
hidden
  -> entering
  -> holding
  -> updating
  -> holding
  -> exiting
  -> hidden
```

كل انتقال يحمل:

- `phase`.
- `startedAt`.
- `durationMs`.
- `progress` عند الحاجة للمعاينة.
- `motionProfileId`.
- `audioProfileId`.
- `replayKey`.

ينتهي الخروج عبر `animation.finished` أو callback من المحرك، وليس timeout ثابتاً.

### 4.3 فصل الاختيارات

| المحور | الحقل | ما الذي يغيره |
|---|---|---|
| الثيم | `mondialTheme` | الألوان والخلفيات والتباين |
| الستايل | `mondialStyle` | الشكل، الحواف، الأقنعة، الأعلام، ترتيب العناصر |
| الحركة | `mondialMotion` | IN/UPDATE/OUT والتوقيت والـstagger |
| الصوت | `mondialAudioProfile` | whoosh/hit/riser/out cue وعلامات التزامن |
| السرعة | `motionSpeed` | 0.75x / 1x / 1.25x |
| مدة الثبات | `holdDurationMs` | تلقائي أو يدوي |
| المقاس | `formatMode` | 16:9 / 4:5 / 9:16 / auto |

### 4.4 هيكل الملفات المقترح

```text
components/renderers/mondial/
  core/
    MondialMotionProvider.tsx
    useMondialTimeline.ts
    mondialMotionTypes.ts
    mondialMigration.ts
    normalizeMondialData.ts
  presets/
    themeRegistry.ts
    styleRegistry.ts
    motionRegistry.ts
    audioProfileRegistry.ts
    flagStyleRegistry.ts
  shared/
    KineticStage.tsx
    MaskReveal.tsx
    ChromaticTrail.tsx
    FlagBadge.tsx
    TeamIdentity.tsx
    PlayerCutout.tsx
    ScoreCounter.tsx
  families/
    live/
    events/
    results/
    stats/
    lineup/
    groups/
    editorial/
    identity/
    iraq/
```

يبقى `Mondial2026Renderer.tsx` و`MondialIraqRenderer.tsx` محركي توجيه رقيقين فقط.

## 5. كتالوج الثيمات والستايلات

### 5.1 الثيمات اللونية

1. `REO_WORLD_SPECTRUM`: الهوية الأساسية متعددة الألوان.
2. `COBALT_BROADCAST`: أزرق بث دولي مع أبيض وlime.
3. `NIGHT_STADIUM`: أسود وأزرق ليلي مع cyan.
4. `FINAL_GOLD`: نهائي وتتويج.
5. `RED_RESULT`: نتائج وأخبار عاجلة.
6. `CLEAN_INTERNATIONAL`: أبيض وأسود نظيف.
7. `IRAQ_PRIDE`: أخضر وأحمر وأبيض بقواعد تباين ثابتة.
8. `TACTICAL_DATA`: cyan/blue للتحليل والإحصاءات.

### 5.2 الستايلات التركيبية

1. `CHROMATIC_TRAILS`.
2. `FLAT_GEOMETRIC`.
3. `PILL_BADGES`.
4. `PHOTO_CUTOUT`.
5. `DATA_ARENA`.
6. `EDITORIAL_SCORE`.
7. `GROUP_GRID`.
8. `STADIUM_FRAME`.
9. `RUDaw_BLUE_NEWS` باسم داخلي محايد `BLUE_NEWSROOM`.
10. `GOLD_FINALE`.
11. `MINIMAL_CLEAN`.

ليس ضرورياً أن يدعم كل قالب جميع الستايلات. يسجل كل قالب قائمة compatibility واضحة، وتعرض الواجهة الخيارات الصالحة فقط.

## 6. Timeline المرجعي

يتم تحليل المرجع على مستوى keyframes قبل التنفيذ النهائي، ثم تثبيت علامات زمنية قابلة للقياس. الهدف الأولي:

| الزمن | الحركة | الصوت |
|---|---|---|
| 0.00-0.20s | pre-roll خفي | صمت |
| 0.20-0.85s | chromatic burst + outer wipe | riser قصير |
| 0.55-1.35s | primary panel reveal | whoosh عريض |
| 0.90-1.80s | logo/flags/text stagger | ticks خفيفة |
| 1.30-2.20s | score/data settle | impact + sub hit |
| 2.20-5.20s | HOLD مع micro-motion فقط | bed اختياري منخفض |
| 5.20-5.90s | prepare exit | reverse riser |
| 5.90-6.661s | collapse/mask close/trails out | reverse whoosh + tail |

معيار الدقة:

- فرق علامات الحركة الرئيسية لا يتجاوز إطارين عند 60fps.
- فرق المؤثر الصوتي عن علامة الحركة لا يتجاوز `30ms`.
- لا يبدأ OUT قبل اكتمال الـimpact والـsettle.

## 7. استراتيجية الصوت

- بناء مؤثرات أصلية خاصة بـREO SHOW، وعدم استخراج صوت الفيديو المرجعي.
- الاستفادة من `audioEngine.ts` لتكوين طبقات: air whoosh، tonal riser، impact، sub hit، ticks، reverse tail.
- جدولة الطبقات عبر Web Audio clock وليس `setTimeout`.
- تعريف profile موحد لكل motion preset.
- دعم Preview audio بعد ضغط المستخدم زر Replay، لتجنب قيود autoplay.
- توحيد مستوى الصوت إلى نطاق `0..1` في schema والواجهة وruntime.
- تنفيذ `duckSfx` فعلياً باستخدام gain automation عند تشغيل voice cue.
- إيقاف loops وbeds عند OUT أو فقد الاتصال أو تغيير القالب.
- تخزين أي ملفات نهائية أصلية داخل `public/audio/mondial/` مع بيان المصدر والترخيص.

## 8. دفعات التنفيذ

### الدفعة 0: Baseline وتصحيح العقود

النطاق:

- التقاط صور baseline للقوالب الحالية.
- إصلاح تطبيق scale/position المزدوج.
- إصلاح Boolean fields في العراق.
- إصلاح مفاتيح transitionOut غير الصحيحة.
- توحيد volume range.
- إضافة normalizer لبيانات Bridge.
- منع Slot من استعادة إعدادات قديمة فوق النسخة الحالية.

الملفات الحرجة:

- `components/OverlayRenderer.tsx`.
- `components/renderers/Mondial2026Renderer.tsx`.
- `components/renderers/MondialIraqRenderer.tsx`.
- `components/renderers/MondialTemplates.ts`.
- `pages/Editor.tsx`.
- `services/syncManager.ts`.

بوابة القبول:

- كل setting ظاهر يغيّر نتيجة مرئية أو صوتية مثبتة.
- scale يساوي القيمة المختارة مرة واحدة فقط.
- false يبقى false بعد الحفظ وإعادة التحميل.
- Bridge payload الحقيقي يغير الفرق والنتيجة والإحصاءات.

### الدفعة 1: Motion Runtime ومعاينة المحرر

النطاق:

- بناء state machine وtimeline controller.
- إضافة phases إلى عقد renderer.
- استبدال timeout الخروج بنهاية animation.
- إضافة Replay Preview وPreview IN وPreview OUT وFull Sequence.
- دعم seek/scrub في Preview فقط.
- ربط update animation بتغير البيانات الفعلي.

الملفات الحرجة:

- `components/OverlayRenderer.tsx`.
- `components/TemplateControlBar.tsx`.
- `pages/Editor.tsx`.
- `utils/templateRuntime.ts`.
- مجلد `components/renderers/mondial/core/` الجديد.

بوابة القبول:

- Preview يطابق Output في ترتيب المراحل.
- Replay يعيد الحركة دون reload أو remount كامل للتطبيق.
- OUT لا يقطع الصوت أو العناصر قبل نهاية timeline.
- rapid IN/OUT لا يترك overlay عالقاً.

### الدفعة 2: الثيمات والستايلات

النطاق:

- بناء registries للثيم، الستايل، الحركة، الأعلام، والصوت.
- إضافة selectors مرئية مع thumbnails.
- نقل لوحة `WC` الثابتة إلى tokens.
- إتاحة الثيم لقوالب العراق.
- فلترة الستايلات حسب compatibility.
- إضافة schema version وmigration للقوالب القديمة.

بوابة القبول:

- تغيير الثيم يغير كل عناصر القالب وليس الخلفية فقط.
- تغيير الستايل يغير composition فعلياً.
- الاختيار محفوظ ويظهر في Editor وOutput وOBS.
- القوالب القديمة تفتح بقيم default من دون فقدان محتواها.

### الدفعة 3: الحركة والصوت المرجعيان

النطاق:

- تنفيذ `CHROMATIC_TRAILS` و`FLAT_GEOMETRIC` أولاً.
- بناء center wipes، masks، stagger، counters، cutout reveal، reverse exit.
- بناء أربعة audio profiles أصلية: ident، match intro، event alert، result/outro.
- معايرة timeline على مرجع يوتيوب والـGIFs.

القوالب التجريبية الأولى:

- Match Intro.
- Goal / Offside / VAR.
- Full-Time Result.
- Lineup.
- Ident.

بوابة القبول:

- تحقق frame-by-frame عند 60fps.
- توافق صوت/صورة ضمن 30ms.
- لا توجد قفزة layout أو flash عند أول frame أو آخر frame.
- لا يتجاوز render budget المتوسط 16.7ms على 1080p60 في جهاز الاختبار.

### الدفعة 4: قوالب البث الأساسية

إضافة أو ترقية:

1. Scorebug live.
2. Full scoreboard.
3. Match intro.
4. Full-time.
5. Goal.
6. No goal.
7. Offside.
8. VAR decision.
9. Yellow/red card.
10. Substitution.
11. Match stats comparison.
12. Lineup with photos, substitutes, and coach.

بوابة القبول:

- كل قالب يملك IN وUPDATE وOUT وصوتاً مناسباً.
- كل قالب يدعم 1920x1080 و1280x720.
- النص العربي واللاتيني لا يتداخلان.
- الصور المفقودة لها fallback محترم.

### الدفعة 5: التوسعة التحريرية والبطولة

إضافة:

- Results grid ونتيجتان متزامنتان.
- Fixtures وMatch Day rundown.
- Group wall وعرض عدة مجموعات.
- Draw reveal.
- Knockout bracket.
- Qualification/progress cards.
- Player status.
- Player quote وtop stories.
- Team/player showcase.
- Ticker وbreaking headline متعدد الستايلات.

بوابة القبول:

- البيانات الطويلة لا تكسر التخطيط.
- العدد المتغير من الصفوف/الفرق يعاد ترتيبه تلقائياً.
- يتم اختبار حالات empty/loading/error.

### الدفعة 6: الهوية والاستوديو

إضافة:

- REO SHOW World ident.
- Bumper قصير بين الفقرات.
- Outro/Thanks أصلي بدلاً من نسخ التميمة المرجعية.
- خلفيات استوديو افتراضية قابلة للتبديل.
- نظام أعلام محلي متعدد الستايلات.
- حزمة 4:5 و9:16 للمنصات الاجتماعية.

بوابة القبول:

- الهوية تعرض `REO SHOW` بوضوح من أول ثانية.
- لا تعتمد القوالب النهائية على روابط أعلام خارجية.
- assets النهائية أصلية أو مرخصة ومذكورة في manifest.

### الدفعة 7: الاعتمادية والتحقق النهائي

النطاق:

- اختبارات وحدات للregistries، migration، normalizers، وstate machine.
- إضافة visual regression عبر Playwright عند نقاط زمنية ثابتة.
- اختبار OBS Browser Source مع cache disabled و60fps.
- اختبار reconnect وSSE fallback وآخر حالة سليمة.
- اختبار reduced motion.
- تنظيف legacy CSS والمكونات غير القابلة للوصول بعد إثبات عدم استخدامها.

بوابة القبول النهائية:

- `npm run lint` ناجح.
- `npm run build` ناجح.
- لا أخطاء Console في Editor أو Output.
- كل setting في مصفوفة الإعدادات يحمل حالة `PASS`.
- لقطات المقارنة معتمدة للمقاسات الأربعة.
- اختبار IN/OUT متكرر 50 مرة دون overlay عالق أو صوت متكرر.

## 9. المقاسات المستهدفة

| الاستخدام | المقاس |
|---|---:|
| OBS Full HD | 1920x1080 |
| OBS HD | 1280x720 |
| Instagram Post | 1080x1350 |
| Stories / Reels | 1080x1920 |

يجب استخدام design coordinates مع safe areas، وليس تغيير font-size مباشرة حسب viewport.

## 10. الأداء وإتاحة الاستخدام

- استخدام transform وopacity وclip-path قدر الإمكان.
- تجنب blur كبير ومتكرر؛ الهوية المرجعية مسطحة ولا تحتاجه.
- عدم تحريك layout properties المكلفة أثناء البث.
- preload للأعلام والصور والصوت قبل TAKE IN.
- fallback عند فشل الصور أو Web Audio.
- `prefers-reduced-motion` يحول الحركة إلى fade/slide مختصر، مع بقاء المعلومات كاملة.
- منع وميض سريع أو strobe.
- ضمان تباين النصوص والأرقام على جميع themes.

## 11. استراتيجية الترحيل والرجوع

- إضافة `mondialSchemaVersion` لكل Overlay.
- migration يدمج default fields الجديدة مع القيم المحفوظة حسب field id.
- aliases صريحة للحقول القديمة.
- حفظ نسخة من config قبل migration لأول مرة.
- عدم تغيير template IDs الحالية.
- إضافة القوالب الجديدة بمعرفات مستقرة.
- كل دفعة في commit مستقل قابل للرجوع.
- تفعيل runtime الجديد خلف `mondialMotionRuntimeV2` حتى اجتياز الدفعة 3.

## 12. التقارير العربية المستمرة

بعد كل دفعة ينشأ تقرير داخل `reports-ar/` بالصيغة:

```text
YYYY-MM-DD-mondial-phase-N-short-name.md
```

كل تقرير يحتوي:

1. الهدف والنطاق.
2. التشخيص قبل التنفيذ.
3. الملفات المعدلة ولماذا.
4. الإعدادات التي أصبحت فعالة.
5. القوالب المضافة أو المطورة.
6. نتائج lint/build/tests.
7. لقطات Desktop/HD/Vertical.
8. مقارنة مرئية مع المرجع.
9. المشكلات المتبقية.
10. قرار الانتقال إلى الدفعة التالية.

يحدث `reports-ar/INDEX.md` بعد كل دفعة، ولا تعتبر أي دفعة مكتملة قبل وجود التقرير ونتائج التحقق.

## 13. ترتيب التنفيذ الموصى به

الترتيب غير قابل للقفز:

1. الدفعة 0: إصلاح العقود والإعدادات.
2. الدفعة 1: runtime ومعاينة الحركة.
3. الدفعة 2: themes/styles/migration.
4. الدفعة 3: إثبات جودة الحركة والصوت على خمسة قوالب.
5. الدفعة 4: القوالب التشغيلية الأساسية.
6. الدفعة 5: توسعة البطولة والتحرير.
7. الدفعة 6: ident/outro/studio/social.
8. الدفعة 7: OBS، الأداء، الاختبارات، والتنظيف.

هذا الترتيب يمنع تكرار كتابة الأنميشن والصوت داخل عشرات القوالب قبل تثبيت المحرك المشترك.
