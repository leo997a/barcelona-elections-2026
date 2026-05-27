# Mercato — مصفوفة الـ Bugs

**التاريخ**: 2026-05-27
**النطاق**: قوالب Mercato + audio scenes + إعدادات + Library
**المصدر**: تدقيق ساكن للكود، مع تتبّع الـ flow من user action إلى DOM/audio.

كل bug مُسجَّل بـ:
- **Area** الموقع في الكود
- **Issue** السلوك المُلاحَظ
- **Severity** (high/medium/low)
- **Reproducible** خطوات معروفة لإعادة الإنتاج
- **Root cause** السبب التقني
- **Recommended fix** الإصلاح المقترح
- **Risk** مخاطرة الإصلاح

---

## الـ Bugs الحرجة (High severity)

### BUG-01 · scene apply ناقص

| | |
|---|---|
| Area | `utils/templateAudioScenes.ts` → `sceneToFieldUpdates()` |
| Issue | الضغط على "تطبيق مشهد" يكتب 3 حقول فقط (`soundInStyle`, `soundOutStyle`, `sfxEnabled`)، يفقد `updateCue`, `volumeMultiplier`, `voiceLibraryId` المحتمل |
| Severity | **HIGH** |
| Reproducible | ✅ نعم — افتح أي قالب Mercato، تبويب الصوت، اضغط "تطبيق" على scene، افحص `overlay.fields` فلن تجد `updateCue` field مكتوبًا |
| Root cause | الـ helper المُكتَب في X5 يرجع object فقير. الـ scene يحوي `enterCue`, `exitCue`, `updateCue`, `ambientCue`, `volumeMultiplier`، لكن الـ helper يستهلك 2 فقط |
| Recommended fix | تحديث `sceneToFieldUpdates` ليكتب: `soundInStyle`, `soundOutStyle`, `sfxEnabled`، **بالإضافة إلى** `audioSceneId` (الآن في `applyScene` فقط)، ثم `playSound('TRANSITION')` cue resolver يقرأ من scene إذا scene متاح |
| Risk | منخفضة — تغيير في util pure |

### BUG-02 · TRANSITION cue يحُقَن لكن لا يُطلَق في Mercato

| | |
|---|---|
| Area | `components/renderers/MercatoUnifiedRenderer.tsx` + `MercatoInnovativeRenderers.tsx` |
| Issue | scene `mercato_private_chat_call` يحدّد `updateCue: 'SOFT_CHAT_INCOMING'`. لا تُسمَع أبدًا. |
| Severity | **HIGH** |
| Reproducible | ✅ نعم — افتح قالب Agent Call على البث، حدّث أي field (chatLines, callDuration). لن يُسمَع أي صوت |
| Root cause | المحرك يدعم `playSound('TRANSITION')` لكن الـ renderers Mercato لا تستدعيه. فقط `LeaderboardRenderer` و `SmartNewsRenderer` يفعلان (للـ pagination). |
| Recommended fix | إضافة `useEffect` في `MercatoUnifiedRenderer` يراقب تغييرات `chatLines/callDuration/probability/...` ويستدعي `playSound('TRANSITION')`. أو طريقة أنظف: hook عام `useFieldChangeSound` في SharedComponents يُستدعى من كل variant |
| Risk | منخفضة — addition فقط، لا تغيير سلوك موجود |

### BUG-03 · نظامان Mercato حيّان معًا

| | |
|---|---|
| Area | `OverlayRenderer.tsx` (السطر 551 + 556) |
| Issue | `MERCATO_AGENT_CALL` (القديم) و `MERCATO_UNIFIED` (الجديد) كلاهما له render branch. Library تعرض كل القوالب القديمة + الـ 10 الجديدة معًا |
| Severity | **HIGH** |
| Reproducible | ✅ نعم — افتح Library → category Mercato → ستجد "ميركاتو — مكالمة الوكيل المباشرة" (القديم) + "ميركاتو — مكالمة الوكيل المباشرة #2" (الجديد) |
| Root cause | X6 أنشأ الـ unified system لكن لم يُحدد deprecation للقديم. القديم له fields مختلفة جزئيًا، deletion سيكسر overlays محفوظة |
| Recommended fix | **خياران**: (أ) إبقاء القديم تحت `templateGroup: 'MERCATO_LEGACY'` + إضافة badge "Legacy" في Library + توجيه المستخدم للجديد. (ب) أو migration script يحوّل overlays القديمة إلى الجديد. الخيار (أ) أأمن. |
| Risk | متوسطة — تغيير في metadata + UI hint |

---

## الـ Bugs المتوسطة (Medium severity)

### BUG-04 · Preview الـ Editor صامت

| | |
|---|---|
| Area | `components/OverlayRenderer.tsx` السطر 380 |
| Issue | `if (isEditor) return;` يحجب كل cues. اختبار scene داخل Editor يبدو "ميت". |
| Severity | **MEDIUM** |
| Reproducible | ✅ نعم — افتح أي قالب في Editor، طبّق scene، لن يُسمَع أي شيء |
| Root cause | تصميم متعمد لتفادي صوت أثناء التحرير. لكنه يخدع المستخدم في اختبار scenes |
| Recommended fix | إضافة "Preview IN/OUT" زر صريح في `<AudioSettingsPanel>` يستدعي `playCue` مباشرة (موجود فعلًا، لكن غير ظاهر بصريًا)، **و** إضافة "Test scene" زر بعد كل scene يضرب `playCue(scene.enterCue)` فورًا |
| Risk | لا — addition فقط |

### BUG-05 · TYPE_FILTERS الفلات لم يُحذف بعد taxonomy

| | |
|---|---|
| Area | `pages/Library.tsx` السطر 53 + 350 |
| Issue | category sidebar (X8) أُضيف فوق `TYPE_FILTERS` القديم. المستخدم يرى 7 categories + 24 type filter متراكبَيْن |
| Severity | **MEDIUM** |
| Reproducible | ✅ نعم — افتح Library → ستجد filter side panel فيه قسمَيْن (الفئة الرئيسية + نوع القالب) |
| Root cause | X8 ركّز على الإضافة، لم يحذف القديم لتفادي كسر |
| Recommended fix | استبدال `TYPE_FILTERS` بـ subcategory filter ديناميكي حسب الـ category النشطة. لو category=mercato، subcategories تظهر (breaking, agents, deal_analysis...). إذا category=ALL، الـ subcategories تختفي |
| Risk | منخفضة — UI only |

### BUG-06 · `audioSceneId` غير قابل للتعديل عبر Editor field UI

| | |
|---|---|
| Area | `pages/Editor.tsx` السطر 3320 (`SOUND_FIELDS` array) |
| Issue | `audioSceneId` لا يظهر في تبويب الصوت كحقل قابل للتعديل |
| Severity | **MEDIUM** |
| Reproducible | ✅ نعم — افتح Editor → تبويب صوت → لن تجد `audioSceneId`. مدار فقط عبر AudioSettingsPanel |
| Root cause | حذف من `SOUND_FIELDS` whitelist في X5 |
| Recommended fix | إضافة `'audioSceneId'` للـ array. لكن نوع الحقل `text` (في constants.ts) — يجب تحويله إلى `select` بـ options من `listAudioScenes()` |
| Risk | منخفضة — field display only |

### BUG-07 · الـ `<AudioSettingsPanel>` يظهر فقط لغير-ELECTION

| | |
|---|---|
| Area | `pages/Editor.tsx` (شرط `draftOverlay.type !== OverlayType.ELECTION`) |
| Issue | قوالب الانتخابات تستخدم نظام صوت مختلف، لكن المستخدم ينتظر تجربة موحّدة |
| Severity | **MEDIUM** |
| Reproducible | ✅ نعم — افتح قالب انتخابي، تبويب صوت — لا panel موحّد |
| Root cause | ELECTION له `ELECTION_SOUND_OPTIONS` و `designStyle`-based defaults. الـ panel الجديد لم يُكيَّف لها |
| Recommended fix | تأجيل (low priority) — ELECTION له audio scenes خاصة بأنماط التصميم. توحيد لاحق في Phase B |
| Risk | عالية لو نُفِّذ الآن |

---

## الـ Bugs البصرية (Visual quality)

### BUG-08 · Mercato templates: spacing و typography غير موحَّد

| | |
|---|---|
| Area | `components/renderers/MercatoUnifiedRenderer.tsx` |
| Issue | 86 hardcoded `text-[Npx]` و 121 inline `style={{...}}` block. كل variant يكرر spacing/font choices |
| Severity | **MEDIUM** |
| Reproducible | grep على `text-\[\d+px\]` يعطي 86 |
| Root cause | لا design tokens (spacing scale, type scale). كل variant يكتب القيم بنفسه |
| Recommended fix | استخراج tokens إلى `utils/mercatoDesignTokens.ts`: `SPACING = { xs:'4px', sm:'8px', md:'12px', lg:'20px', xl:'32px' }`, `TYPE = { eyebrow:'10px', subtitle:'12px', body:'14px', h2:'20px', h1:'28px' }`. كل variant يستخدمهم |
| Risk | عالية لو طُبِّق دفعة واحدة. **يجب** تطبيقه تدريجيًا على variant واحد |

### BUG-09 · Hijack Alert: clubs بدون logos

| | |
|---|---|
| Area | `MercatoUnifiedRenderer.tsx` → `HijackAlertVariant` |
| Issue | الـ original/hijack club كنص فقط في 28px. لا logos أو visual distinction قوي |
| Severity | **LOW** |
| Reproducible | ✅ نعم |
| Root cause | لا fields لـ club logo URLs |
| Recommended fix | إضافة `originalClubLogo` + `hijackClubLogo` كـ image fields. عرضهم 64×64 رأس البطاقة |
| Risk | منخفضة |

### BUG-10 · Personal Terms: محتوى ضحل (3 hero cards فقط)

| | |
|---|---|
| Area | `MercatoUnifiedRenderer.tsx` → `PersonalTermsVariant` |
| Issue | salary/years/agentFee كأرقام فقط. لا breakdown، لا comparison مع قيم سابقة، لا context |
| Severity | **LOW** |
| Reproducible | افتح القالب |
| Root cause | data model فقير |
| Recommended fix | إضافة `previousSalary`, `salaryGrowthPct`, `signOnBonus`, `appearanceBonus`, `releaseClause`. الـ variant يعرض breakdown أوضح |
| Risk | منخفضة |

---

## Bugs خفيفة (Low severity)

### BUG-11 · `playerIntelV2State.ts` untracked عبر 6 phases
- موقع: `components/player-intel-v2/playerIntelV2State.ts`
- خطورة: low (no impact on runtime)
- إصلاح: إما ربطه بـ EditorPanel أو حذفه. القرار للمستخدم.

### BUG-12 · Stream Deck لا يدعم toggle audio أو reset كأزرار مستقلة
- موقع: `pages/Integrations.tsx` (`mapCommand`)
- خطورة: low (Stream Deck يعمل، فقط نقص أزرار)
- إصلاح: إضافة `audio_toggle`, `audio_on`, `audio_off` كـ command options. لا endpoint جديد

### BUG-13 · Diagnostics panel غير موجود في UI
- موقع: `utils/templateRuntime.ts` (`getAllDiagnostics()` متاح، لا panel)
- خطورة: low (developer-facing)
- إصلاح: panel صغير في Editor advanced tab يعرض آخر action لكل overlay

---

## ملخص الجدول

| Bug ID | Severity | Risk to fix | Effort |
|---|---|---|---|
| BUG-01 scene apply ناقص | HIGH | LOW | صغير (~30 دقيقة) |
| BUG-02 TRANSITION cue ميت في Mercato | HIGH | LOW | متوسط (~2 ساعة) |
| BUG-03 نظامان Mercato | HIGH | MEDIUM | متوسط (~3 ساعات) |
| BUG-04 Preview صامت | MEDIUM | NONE | صغير (~15 دقيقة) |
| BUG-05 TYPE_FILTERS مكرر | MEDIUM | LOW | متوسط (~1 ساعة) |
| BUG-06 audioSceneId غير قابل للتعديل | MEDIUM | NONE | صغير (~10 دقائق) |
| BUG-07 AudioSettingsPanel غائب لـ ELECTION | MEDIUM | HIGH | كبير، مؤجَّل |
| BUG-08 Design tokens مفقودة | MEDIUM | HIGH | كبير، تدريجي |
| BUG-09 Hijack Alert بدون logos | LOW | LOW | صغير |
| BUG-10 Personal Terms محتوى ضحل | LOW | LOW | متوسط |
| BUG-11 playerIntelV2State untracked | LOW | NONE | صغير |
| BUG-12 Stream Deck توسيع | LOW | LOW | متوسط |
| BUG-13 Diagnostics panel | LOW | LOW | متوسط |

**الإجمالي**: 3 high + 4 medium + 6 low. الإصلاحات HIGH تأخذ ~5-6 ساعات مع verification صارم.
