# MASTER-AUDIT-AND-ROADMAP-001

تاريخ التقرير: 2026-05-28  
النطاق: تدقيق معماري شامل بعد مراحل Player Intel V2، Audio Runtime، Mercato، Phase A، Hotfix-1، X11/X12، X13.  
حالة التنفيذ: لا توجد تعديلات كود في هذه المرحلة. هذا التقرير تشخيص وخريطة طريق فقط.

---

## 1. الملخص التنفيذي

المشروع وصل إلى مرحلة متقدمة جدًا من ناحية الوظائف: لديه Editor فعلي، Library منظّمة بتصنيف جديد، Operator، Audio runtime عالمي، قوالب Mercato كثيرة، Player Intel V2، Stream Deck plugin generator، تقارير عربية وإنجليزية، ومسار Vercel مضبوط حاليًا تحت سقف عدد functions.

لكن المشروع لم يصل بعد إلى مستوى منتج خارجي مستقر بالكامل. هو أقرب إلى منصة بث داخلية قوية تعمل يوميًا مع مستخدم خبير يعرف القيود، وليس بعد إلى SaaS/منتج عام يمكن تسليمه لفريق غير تقني بدون مخاطر UX وصيانة.

### هل هو مستقر؟

نعم، مستقر نسبيًا من ناحية البناء والـ TypeScript:

- `npm run lint` نجح.
- `npm run build` نجح.
- عدد Vercel API functions الحالي: 10، وهو تحت سقف 12 المطلوب.

لكن الاستقرار التشغيلي ما زال يعتمد على الانضباط:

- Editor كبير جدًا ومركزي.
- Player Intel V2 لا يزال يعتمد كثيرًا على `localStorage` وذاكرة runtime.
- Stream Deck موجود، لكنه ناقص feedback وaudio/reset controls.
- بعض مسارات Mercato القديمة والجديدة متداخلة.
- توجد فجوات صغيرة في Audio Settings قد تنتج سلوكًا غير متوقع عند reset/preview/silent scenes.

### هل هو جاهز للاستخدام اليومي؟

نعم، للاستخدام اليومي الداخلي أو من مشغل واحد يعرف النظام.  
لا، إذا كان المقصود تشغيله من عدة مستخدمين أو بيئة بث حرجة بدون manual QA.

### هل هو جاهز كمنتج خارجي؟

ليس بعد. يحتاج أولًا:

- تقليل فوضى Editor.
- تثبيت عقود Audio/IN/OUT.
- توحيد تجربة Mercato داخل Library.
- حل state/scope في Player Intel V2.
- تقوية Stream Deck feedback.
- إضافة اختبارات تشغيلية وبصرية على أهم المسارات.

### التقييم العام

**76 / 100**

هذا تقييم جيد لمشروع إنتاج داخلي متقدم، لكنه لا يزال أقل من عتبة المنتج الخارجي بسبب الصيانة، الاختبارات، Stream Deck، وتراكم منطق كبير في ملفات مركزية.

---

## 2. جدول التقييم

| المحور | التقييم | الحالة | الملاحظة الأساسية |
|---|---:|---|---|
| Editor UX | 68/100 | يعمل لكن ثقيل | `pages/Editor.tsx` وصل إلى 4034 سطرًا وفيه state وUI وruntime wiring في ملف واحد. |
| Audio system | 82/100 | قوي بعد X11/X12 | الفصل بين Master/SFX/Voice جيد، لكن reset/preview/silent scene تحتاج hotfix صغير. |
| Mercato templates | 78/100 | غنية لكن متداخلة | القوالب الجديدة أفضل، لكن يوجد تداخل مع legacy/innovative وازدواجية في التصنيف. |
| Library taxonomy | 75/100 | تحسن واضح | `TYPE_FILTERS` القديم اختفى، لكن `MERCATO_UNIFIED` لا يستطيع تقسيم 10 variants بدقة عبر `OverlayType` فقط. |
| Player Intel V2 | 72/100 | قوي وظيفيًا، ناقص معماريًا | البحث والبناء موجودان، لكن state/scope/persistence لم يكتملوا كمنتج. |
| Stream Deck | 61/100 | أساس موجود | plugin generator موجود، لكن feedback محدود ولا توجد audio toggle/reset controls. |
| Runtime stability | 80/100 | جيد | IN/OUT عبر `TemplateControlBar` أفضل، لكن toggle القديم ما زال ظاهرًا في Editor/Operator. |
| Build/Vercel | 83/100 | آمن حاليًا | 10 functions فقط، build ينجح، لكن bundle الرئيسي ضخم. |
| Code maintainability | 63/100 | أكبر خطر حالي | ملفات كبيرة جدًا، inline styles كثيرة، helpers متكررة، واختبارات قليلة. |

---

## 3. أهم 15 مشكلة حالية

| # | المشكلة | الخطورة | السبب التقني | Hotfix أم Phase؟ | خطر الإصلاح |
|---:|---|---|---|---|---|
| 1 | حجم `Editor.tsx` أصبح خطرًا | عالية | 4034 سطرًا تجمع state/UI/preview/runtime/Player Intel dock/audio wiring | Phase | عالٍ إذا تم refactor دفعة واحدة |
| 2 | Audio reset لا يمسح `audioUpdateCue` | متوسطة | `AudioSettingsPanel.resetAudio()` يعيد معظم الحقول ولا يمسح cue التحديث | Hotfix | منخفض |
| 3 | Preview update لا يطابق دائمًا runtime | متوسطة | `previewUpdate()` يستخدم `audioUpdateCue || DATA_TICK` بدل fallback من `resolveTemplateAudio(config).updateCue` | Hotfix | منخفض |
| 4 | `silent_professional` قد يترك SFX مفعّلًا | متوسطة | `sceneToFieldUpdates()` يضع `sfxEnabled: true` حتى للمشهد الصامت ولا يضبط volume عندما multiplier = 0 | Hotfix | منخفض إلى متوسط |
| 5 | Audio preset/scene updates ليست batched في Editor | متوسطة | `Editor.tsx` يمرر `onUpdate` فقط إلى `AudioSettingsPanel`، فتُرسل عدة تحديثات متتالية للحقل الواحد | Phase A صغير | متوسط |
| 6 | التصنيف لا يفرّق بين variants العشرة لـ `MERCATO_UNIFIED` | متوسطة | `getTaxonomy(type, templateId?)` يملك `templateId` لكنه يعتمد فعليًا على `OverlayType` | Phase | متوسط |
| 7 | Library preview accent ناقص للأنواع الجديدة | منخفضة | خريطة `ACCENT` في `Library.tsx` لا تشمل بعض الأنواع المهمة مثل `MERCATO_UNIFIED` و`PLAYER_INTEL_V2` | Hotfix | منخفض |
| 8 | ازدواجية Mercato بين القديم والجديد | متوسطة | توجد `TransferNewsRenderer` و`MercatoInnovativeRenderers` و`MercatoUnifiedRenderer` مع overlap وظيفي | Phase | متوسط |
| 9 | مسار صوت Mercato القديم منفصل | متوسطة | `MercatoInnovativeRenderers.tsx` يستخدم `mercatoAudioEngine` بجانب `audioEngine` العالمي | Phase | متوسط إلى عالٍ |
| 10 | Player Intel dynamic profiles غير durable | عالية | profiles تُحفظ في `localStorage` وذاكرة runtime، ولا يوجد تخزين مشترك مضمون | Phase E | متوسط |
| 11 | Player Intel scope لا يزال أقرب إلى عرض معلومات | عالية | Scope tab يقرأ coverage لكنه لا يقدم selector كاملًا يغيّر مصدر الحسابات بوضوح | Phase E | متوسط |
| 12 | `api/player-stats.ts` قد يرجع fallback/pending بدل unavailable صريح | متوسطة | عند بعض حالات `selectedMetrics` توجد قيم `pending` وثقة منخفضة بدل warnings/unavailable صارمة | Hotfix أو Phase | متوسط بسبب عقد API |
| 13 | أزرار toggle القديمة ما زالت بجانب IN/OUT | متوسطة | `Operator.tsx` و`Editor.tsx` ما زالا يعرضان toggle/TAKE بجانب `TemplateControlBar` | Phase B | متوسط |
| 14 | Stream Deck ناقص feedback وaudio controls | عالية | plugin يولد أوامر show/hide/toggle وبعض score/news فقط، ولا يوجد state feedback واضح أو reset/audio | Phase D | متوسط |
| 15 | bundle الرئيسي ضخم | متوسطة | build ينتج JS chunk بحجم 1.755 MB minified و442 KB gzip | Phase F | متوسط |

---

## 4. أهم 15 مكسب تم إنجازه ولا يجب كسره

| # | المكسب | ماذا أصبح يعمل؟ | ما الذي لا يجب كسره؟ |
|---:|---|---|---|
| 1 | TypeScript/build baseline | `npm run lint` و`npm run build` ينجحان | لا تدخل phase بدون الحفاظ على هذا الخط. |
| 2 | عدد functions آمن | 10 functions فقط تحت سقف 12 | لا تضف endpoint جديد إلا بضرورة قصوى. |
| 3 | AudioSettingsPanel مركزي | Master/SFX/Voice/Advanced منظمة في واجهة واحدة | لا تعيد الحقول الخام أسفل اللوحة. |
| 4 | `templateAudioGate` | فصل واضح بين SFX وVoice مع أسباب blocking | لا تخلط voice mute مع sfx mute. |
| 5 | `audioEngine.ts` العالمي | runtime audio موحد لغالب القوالب | لا تعد لمسارات صوتية مشتتة بدون خطة. |
| 6 | Transition diagnostics | أسباب واضحة مثل `sfx_disabled` و`first_mount_seeded` | لا تزيل diagnostics أثناء hotfix. |
| 7 | DiagnosticStrip | شريط تشخيص يقرأ حالة الصوت والانتقال | يجب تطويره لا حذفه. |
| 8 | IN/OUT deterministic عبر `TemplateControlBar` | `set_visible` أوضح من toggle | لا تستبدله بتoggle عشوائي. |
| 9 | Library taxonomy الجديد | `TYPE_FILTERS` القديم اختفى لصالح taxonomy/sidebar | لا ترجع للفلترة القديمة. |
| 10 | X6 Mercato Unified | 10 variants تعمل عبر renderer موحد | لا تغيّر template IDs. |
| 11 | Mercato Agent Call SFX default off | القالب الأكثر حساسية لم يعد مزعجًا افتراضيًا | لا تجعل المؤثرات الصاخبة default. |
| 12 | Mercato Avatar fallback | القوالب الجديدة لا تظهر صناديق صور فارغة بسهولة | لا تكسر fallback للصور/الأحرف. |
| 13 | Player Intel V2 search/build | البحث المحلي وFotMob builder موجودان | لا تكسر `/api/player-intel-v2` multiplex. |
| 14 | Player Intel image override/fallback | الصور لا تعتمد على مصدر واحد فقط | لا تزيل override store بدون بديل. |
| 15 | التقارير العربية | أصبح هناك سجل عربي واسع لكل المراحل | استمر بربط كل phase بتقرير مستقل. |

---

## 5. نتائج التحقيق حسب المحور

### 5.1 بنية المشروع

البنية الرئيسية واضحة:

- `pages/`: الشاشات الكبرى مثل Editor, Library, Operator, Integrations, Settings.
- `components/`: renderers، AudioSettingsPanel، OverlayRenderer، TemplateControlBar، DiagnosticStrip.
- `components/renderers/`: قوالب العرض، منها Mercato وPlayer Intel وMatch Stats.
- `utils/`: taxonomy، registry، runtime، audio gate/scenes/diagnostics، player identity.
- `services/`: audio engine، sync manager، sound library، mercato audio القديم.
- `api/`: 10 functions فعلية بعد استثناء `_lib`.
- `constants.ts`: catalog كبير جدًا للقوالب والحقول.
- `reports-ar/`: 34 ملفًا قبل هذا التقرير.

المشكلة ليست غياب التنظيم، بل أن بعض العقد أصبحت كبيرة جدًا وتحمل مسؤوليات أكثر من اللازم.

### 5.2 Editor

الـ Editor يعمل، لكنه أكبر ملف خطر في المشروع:

- الحجم: 4034 سطرًا.
- يحتوي على state للـ AI، Player Intel، live preview، fields، tabs، audio، imports، layout، diagnostics.
- عدد tabs كبير ومتغير حسب نوع القالب.
- Audio tab يبدو أنظف بعد X11، لأن `isManagedAudioField(field.id)` يمنع ظهور الحقول المدارة الخام تحت `AudioSettingsPanel`.
- ما يزال يسمح بعرض حقول `useTTS` و`ttsText` كحقول خام، وهذا مقبول لأن Voice content يختلف عن SFX settings.

الاستنتاج: لا تبدأ بـ Editor refactor شامل الآن. يجب أولًا تثبيت hotfixes الصغيرة ثم تحديد seams آمنة للاستخراج لاحقًا.

### 5.3 Library

Library تحسنت:

- `TYPE_FILTERS` القديم اختفى فعليًا.
- التصنيف يعتمد على `templateTaxonomy.ts`.
- توجد categories/subcategories واضحة.

لكن توجد فجوتان:

- `MERCATO_UNIFIED` نوع واحد يمثل 10 variants، وهذا يجعل taxonomy حسب `OverlayType` غير كافٍ.
- بعض preview accents في `Library.tsx` لا تعرف الأنواع الجديدة، فتسقط إلى لون عام.

### 5.4 Audio system

النظام الحالي قوي ومهني أكثر من السابق:

- `AudioSettingsPanel` يفصل Master/SFX/Voice.
- `templateAudioGate` يمنع الخلط بين SFX وVoice.
- `templateAudioScenes` يوفر scenes محترمة.
- `audioEngine` هو runtime المركزي.
- `DiagnosticStrip` و`templateTransitionDiagnostics` يساعدان في فهم لماذا صوت update اشتغل أو لم يشتغل.

لكن توجد hotfixes صغيرة مهمّة:

- reset لا يمسح update cue.
- preview update لا يستخدم fallback runtime الصحيح.
- silent scene يجب أن تكون صامتة في state والمعنى، لا فقط في الاسم.
- تطبيق scene/preset من Editor يرسل عدة updates بدل batch واحد.

### 5.5 Mercato templates

المشروع لديه حاليًا حزمة Mercato غنية:

- قوالب قديمة/legacy.
- TransferNews بتصاميم متعددة.
- Innovative renderers.
- X6 Unified renderer لعشرة variants.

الجديد أفضل بصريًا وتنظيميًا، خصوصًا `MercatoUnifiedRenderer`. لا تظهر صناديق صور فارغة بشكل واضح في unified بسبب fallback initials/avatar.

لكن ما زال هناك تداخل:

- المستخدم قد لا يعرف أي قالب Mercato هو "الرسمي".
- بعض renderers القديمة لها مسار صوت مختلف.
- taxonomy لا يشرح variants العشرة بدقة.
- بعض التصاميم القديمة قد تبدو mockup مقارنة بـ X13 polish.

### 5.6 Player Intel V2

Player Intel V2 هو أحد أقوى أجزاء المشروع وظيفيًا، لكنه لا يزال ناقصًا كمنتج:

- البحث المحلي وFotMob on-demand builder موجودان.
- يوجد dynamic profile store في المتصفح.
- توجد image override/fallback.
- Renderer قوي ويعرض scope label.

المشاكل الأكبر:

- dynamic profiles ليست durable أو shared.
- scope UI لم يتحول بعد إلى مصدر تحكم كامل.
- `all_available` لا يزال معطلًا.
- بعض مسارات stats تستخدم fallback/pending بدل unavailable الصريح.

### 5.7 Runtime / IN / OUT

المسار العالمي أفضل من السابق:

- `TemplateControlBar` يستخدم `set_visible` لـ IN/OUT.
- `syncManager` لا يجعل update يظهر overlay مخفيًا عشوائيًا.
- `OverlayRenderer` لا يشغل الصوت داخل editor.
- audio follows visibility في entry/exit.

لكن:

- توجد أزرار toggle قديمة في Editor/Operator.
- وجود toggle بجانب IN/OUT deterministic قد يسبب أخطاء تشغيلية.
- يجب توحيد الخطاب: IN/OUT هو المسار الأساسي، toggle legacy فقط.

### 5.8 Stream Deck

الموجود فعليًا:

- صفحة Integrations تولد plugin ZIP.
- plugin فيه manifest وproperty inspector وactions.
- يدعم set_on/set_off/toggle وبعض score/news controls.
- يوجد تحذير أن toggle legacy.

الناقص:

- feedback حقيقي للحالة.
- audio mute/reset controls.
- reset/update presets للقوالب الحديثة.
- icons فعلية بدل placeholders.
- ربط واضح مع DiagnosticStrip.

Stream Deck يحتاج phase منفصلة، ولا يجب فتحه قبل تثبيت runtime/audio contract.

### 5.9 Vercel/API

الوضع جيد الآن:

- عدد functions: 10.
- السقف المطلوب: لا يتجاوز 12.
- `api/player-intel-v2.ts` multiplex جيد بدل endpoints كثيرة.
- `api/stream.ts` لديه maxDuration 60 في `vercel.json`.
- لا توجد حاجة لإضافة endpoints الآن.

الخطر الحقيقي:

- bundle الرئيسي كبير جدًا.
- `api/ai.ts` ملف كبير.
- أي توسع عشوائي في API قد يعيد مشكلة Vercel functions.

### 5.10 جودة الكود

أكبر الملفات:

| الملف | عدد الأسطر التقريبي |
|---|---:|
| `pages/Editor.tsx` | 4034 |
| `constants.ts` | 3009 |
| `components/renderers/MatchStatsRenderer.tsx` | 1918 |
| `services/audioEngine.ts` | 1828 |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | 1551 |
| `components/renderers/PlayerIntelV2Renderer.tsx` | 1166 |
| `components/renderers/MercatoUnifiedRenderer.tsx` | 1149 |
| `components/renderers/MercatoInnovativeRenderers.tsx` | 1043 |
| `api/ai.ts` | 1025 |

مؤشرات سريعة:

- `as any`: حوالي 12.
- `console.warn`: حوالي 11.
- `console.log`: حوالي 2.
- `style={{`: حوالي 810.
- `localStorage`: حوالي 52.
- `TODO/FIXME/@ts-ignore`: لم يظهر وجودها في البحث السريع.

الاستنتاج: المشكلة ليست TypeScript مكسورًا، بل تراكم ملفات مركزية وUI inline state.

---

## 6. خريطة الطريق المقترحة

### Phase A — Hotfixes صغيرة

هدفها تثبيت السلوك بدون refactor كبير.

الأولوية:

1. Audio reset يمسح `audioUpdateCue`.
2. Preview update يستخدم `resolveTemplateAudio(config).updateCue` كfallback.
3. `silent_professional` يجعل `sfxEnabled=false` أو يضبط معنى الصمت بشكل واضح.
4. تمرير `onUpdateMany` من Editor إلى `AudioSettingsPanel` لتجنب updates متتابعة عند preset/scene.
5. Library accent للأنيواع الجديدة.

لا يجب أن تتضمن هذه المرحلة:

- أي تغيير template IDs.
- أي endpoint جديد.
- أي تعديل كبير في renderers.

### Phase B — UX cleanup

هدفها إزالة الالتباس التشغيلي.

الأولوية:

1. جعل IN/OUT deterministic هو المسار الأساسي في Editor/Operator.
2. تخفيض ظهور toggle القديم أو وضعه كadvanced/legacy.
3. ترتيب Audio tab بحيث تكون Voice content منفصلة بوضوح عن SFX.
4. تنظيف Library category/subcategory naming.
5. تحسين DiagnosticStrip ليعرض حالة Stream Deck عند توفرها.

### Phase C — Visual polish

هدفها رفع مستوى القوالب، خاصة Mercato.

الأولوية:

1. تحديد "Mercato recommended templates" داخل Library.
2. فصل legacy/experimental بصريًا.
3. مراجعة TransferNews والـ Innovative renderers مقارنة بـ X6 Unified.
4. إزالة أي boxes فارغة متبقية في القوالب القديمة.
5. تحسين Arabic fit في أكثر القوالب استخدامًا.

### Phase D — Stream Deck

هدفها تحويل Stream Deck من generator أساسي إلى remote control موثوق.

الأولوية:

1. Audio mute/unmute action.
2. Reset action آمن.
3. Feedback/state polling أو status endpoint ضمن الموجود إن أمكن بدون endpoint جديد.
4. أزرار مخصصة لـ Mercato update scenes.
5. Icons فعلية ومفهومة.

### Phase E — Player Intel state/scope

هدفها تثبيت Player Intel كمنتج.

الأولوية:

1. تعريف source of truth للـ dynamic profiles.
2. تصميم scope selector حقيقي.
3. جعل selected metrics contract صارمًا.
4. تحويل fallback/pending إلى unavailable/warnings عندما لا توجد بيانات.
5. توثيق coverage boundaries للمشغل.

### Phase F — Tests / performance / documentation

هدفها حماية المنتج من regressions.

الأولوية:

1. Browser smoke tests لـ Editor/Library/Operator.
2. اختبارات runtime audio gate.
3. اختبار function count في CI أو script.
4. تقسيم bundle عبر dynamic imports أو manual chunks.
5. توثيق operator manual وmanual QA checklists.

---

## 7. التوصية الواضحة

### أول شيء يجب تنفيذه

ابدأ بـ **Audio/Settings cleanup** كـ Phase A صغيرة جدًا.

السبب:

- المخاطر منخفضة.
- الملفات محدودة.
- يثبت تجربة يومية حساسة.
- لا يحتاج endpoint.
- لا يلمس template IDs.
- لا يفتح refactor ضخم.

الترتيب المقترح لأول PR/commit لاحق:

1. Fix reset/update preview/silent scene.
2. تمرير batch updates من Editor إلى AudioSettingsPanel إن أمكن بدون كسر.
3. تشغيل `npm run lint`.
4. تشغيل `npm run build`.
5. تحديث تقرير عربي صغير للـ hotfix.

### ما الذي يجب تأجيله؟

- Editor refactor شامل.
- إعادة تصميم Mercato بالكامل.
- Player Intel persistence المعقد.
- Stream Deck feedback العميق.
- أي تقسيم bundle كبير.

### ما الذي يجب عدم لمسه الآن؟

- template IDs.
- secrets أو `.env`.
- عدد endpoints.
- Player Intel search/build contracts.
- Stream Deck token format.
- ملفات الصوت الخارجية أو إضافة audio assets جديدة.
- أي deploy أو Telegram/public action.

---

## 8. Manual QA checklist للمراحل التالية

لا يجب ادعاء اختبار بصري/صوتي إلا بعد فتح المتصفح فعليًا. للمراحل القادمة:

1. افتح Editor على قالب صوتي عادي.
2. تأكد أن Audio tab لا يعرض الحقول المدارة الخام تحت `AudioSettingsPanel`.
3. جرّب silent preset ثم IN/OUT/UPDATE في runtime.
4. جرّب Mercato Agent Call وتأكد أن SFX off افتراضيًا.
5. جرّب `MERCATO_UNIFIED` variant مع صورة فارغة وتأكد أن avatar fallback يظهر.
6. افتح Library وتحقق من subcategory الخاصة بـ Mercato.
7. افتح Operator وتأكد أن IN/OUT لا يسبب toggle عكسي.
8. جرّب Player Intel search ثم refresh وتأكد من حدود localStorage.
9. تحقق من Stream Deck plugin generated ZIP وحالة الأزرار.
10. بعد أي تعديل: `npm run lint` و`npm run build` وعد functions.

---

## 9. حالة التحقق في هذه المرحلة

تم في هذه المرحلة:

- قراءة بنية المشروع.
- فحص الملفات الكبيرة.
- فحص Editor/Library/Audio/Mercato/Player Intel/Runtime/Stream Deck/Vercel.
- تشغيل `npm run lint`: نجح.
- تشغيل `npm run build`: نجح مع warning لحجم chunk.
- عدّ API functions: 10.
- إنشاء هذا التقرير العربي فقط.

لم يتم في هذه المرحلة:

- تعديل components.
- تعديل pages.
- تعديل services.
- تعديل utils.
- تعديل constants.
- تعديل api.
- إضافة endpoint.
- تغيير template IDs.
- تشغيل deploy.
- إرسال Telegram أو أي public action.
- استخدام `git add -A`.
- بدء Phase تنفيذية.

