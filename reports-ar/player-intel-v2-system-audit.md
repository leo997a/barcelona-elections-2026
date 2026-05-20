# Player Intel V2 — System Audit (RESET-1)

تاريخ: 2026-05-21  
الهدف: تقييم صريح للنظام الحالي قبل أي تطوير جديد. **بدون أي تعديل، بدون commit.**

---

## 1. المخزون الفعلي

### 1.1 ملفات الواجهة (committed، مستقرة)

| الملف | الحجم تقريبي | الحالة |
| --- | --- | --- |
| `components/player-intel-v2/PlayerIntelV2Preview.tsx` | 552 سطر | يعمل (#/player-intel-v2-preview) |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | ~770 سطر | يعمل |
| `components/player-intel-v2/PlayerIntelV2CardsPanel.tsx` | 172 سطر | يعمل |
| `components/player-intel-v2/PlayerIntelV2MetricTable.tsx` | 142 سطر | يعمل |
| `components/player-intel-v2/PlayerIntelV2SourceCoverage.tsx` | 102 سطر | يعمل |
| `components/player-intel-v2/playerIntelV2Types.ts` | 207 سطر | types فقط |
| `components/player-intel-v2/playerIntelV2Labels.ts` | ~210 سطر | labels عربية + map |
| `components/player-intel-v2/playerIntelV2Presets.ts` | 126 سطر | 8 presets |
| `components/player-intel-v2/playerIntelV2MetricResolver.ts` | ~280 سطر | resolver لكل card |
| `components/player-intel-v2/playerIntelV2PlayerResolver.ts` | 233 سطر | تطبيع عربي + matching |
| `components/renderers/PlayerIntelV2Renderer.tsx` | ~700 سطر | 5 visual variants |
| `api/player-intel-v2/search-player.ts` | 126 سطر | API محلي (registry only) |
| `pages/player-intel-v2-preview.tsx` | 15 سطر | wrapper |

### 1.2 ملفات البيانات في `public/`

| الملف | الحجم |
| --- | --- |
| `index.json` | 1.1 KB — **3 لاعبين فقط** |
| `cole-palmer.broadcast.json` | 37.3 KB |
| `lamine-yamal.broadcast.json` | 37.3 KB |
| `robert-lewandowski.broadcast.json` | 38.3 KB |
| `*.master.summary.json` | 2.5–2.6 KB لكل لاعب (legacy) |

### 1.3 أدوات Python (deploy/reo-datafabric/tools)

| الأداة | الوظيفة | تحتاج إنترنت؟ |
| --- | --- | --- |
| `build_fotmob_mega_profile.py` | يجلب من FotMob ويبني mega | نعم (FotMob apigw + _next/data) |
| `build_player_intel_master_profile.py` | يدمج FotMob mega + FBref cache | لا (يقرأ ملفات محلية) |
| `build_player_intel_public_registry.py` | يصدّر broadcast.json ويحدّث index.json | لا (محلي بحت) |
| `build_player_intel_profile_on_demand.py` | pipeline يستدعي الثلاثة | يعتمد على المرحلة |
| `reo_fotmob_cli.py` | CLI للبحث في FotMob | نعم |
| `inspect_fotmob_json.py` | فحص raw JSON | لا |

### 1.4 Cache محلي (gitignored)

- `deploy/reo-datafabric/cache/fotmob/*` → 10 ملفات JSON محفوظة (player_next_data للاعبين الثلاثة + buildId).
- `deploy/reo-datafootball-worker/.cache/fbref/*` → 13 ملف stat group لـ Big5 (passing, shooting, defense, …) — يحتوي أكثر من 3000 لاعب لكن **لا يستفيد منه Player Intel V2 لأي لاعب جديد** إلا عبر pipeline يدوي.

---

## 2. الإجابات الصريحة على الأسئلة المطروحة

### كم لاعب فعليًا موجود الآن؟
**3 لاعبين فقط:** Lamine Yamal، Robert Lewandowski، Cole Palmer.  
لا يوجد طريق آخر — الـ registry يُحمَّل من `index.json` ولا يحوي غيرهم.

### هل البحث العربي يجلب لاعبًا جديدًا من الإنترنت؟
**لا.** السلوك الفعلي:

1. الـ Editor panel يستدعي `/api/player-intel-v2/search-player` POST.
2. الـ API endpoint (سطر 1–10 من تعليقاته الصريحة):
   > "Returns matches from the existing public/player-intel-v2-samples/index.json. **Does NOT call** /api/player-stats, bridge, VPS, FBref cache, FotMob, or any external service."
3. `resolveQuery` فقط يطبّق الـ Arabic map (يامال → yamal، ليفاندوفسكي → lewandowski) ثم fuzzy matches ضد الـ 3 entries الموجودة.

**الخلاصة:** لو كتبت "صلاح ليفربول" ستحصل على رسالة "لم يتم العثور على اللاعب" — لأن صلاح ليس في الـ registry، حتى لو كان معروفًا في الـ Arabic map.

### هل on-demand builder يبني لاعبًا جديدًا فعلًا؟
**جزئياً.** الـ pipeline موجود لكن:

1. يحتاج `--player-id` يدوي (FotMob ID رقمي).
2. إذا لم يُعطَ ID، يطبع: "Re-run with --player-id <ID> from search results above" ويخرج بـ exit 2.
3. لا auto-resolution من الاسم → ID.
4. لا يعمل من الواجهة — أداة سطر أوامر فقط.
5. لا cron، لا API endpoint يستدعيها.
6. بعد التشغيل اليدوي، يلزم `npm run build` لتحديث `dist/`.

**الخلاصة:** المستخدم النهائي لا يستطيع إضافة لاعب من الواجهة. يحتاج terminal + معرفة FotMob ID + إعادة build.

### ما هي مصادر البيانات الفعلية الآن؟

داخل القالب نفسه (PlayerIntelV2Renderer):
- يقرأ من `/player-intel-v2-samples/{slug}.broadcast.json` فقط.
- لا fetch من FotMob أو FBref وقت العرض.
- البيانات **مجمّدة** عند آخر مرة شُغّل فيها `build_player_intel_public_registry.py`.

### هل FotMob يعمل فعلاً أم بيانات محفوظة؟
**Provider يعمل** (سُجّل في Phase X.4 — Lewandowski و Yamal و Palmer جُلبوا حقيقة من الإنترنت). لكن:
- لا يعمل **داخل الواجهة**.
- يعمل فقط من سطر الأوامر عند بناء mega profile.
- broadcast.json الموجود = snapshot من 2026-05-20.

### هل FBref يعمل فعلاً داخل Player Intel V2 أم مجرد badge؟
**Badge فقط داخل الواجهة.**

التفاصيل:
- FBref cache محلي يحتوي 13 ملف لـ ~3000 لاعب.
- لكن `build_player_intel_master_profile.py` يدمجه فقط عند بنائه master file.
- داخل broadcast.json الناتج، أعمدة FBref محفوظة كـ raw values (مثل `fbref_shooting_standard_sh: 117`) ضمن `broadcastCards`.
- شارة "FBref ✓" في الـ Renderer مبنية على flag `sourceCoverage.fbref` فقط — صحيحة هيكلياً، لكن لا تعكس "live" connection.

### هل المقارنة تعتمد على بيانات حقيقية لكلا اللاعبين؟
**نعم، لكن مقيّدة بالـ 3 لاعبين فقط.**

- في compare mode، الـ Renderer يحمّل `dataA` من broadcast اللاعب الأول + `dataB` من broadcast اللاعب الثاني (سطر 180–186).
- DuelRow يقارن قيم متطابقة الـ key بين الاثنين.
- إذا metric في A وغير موجود في B → يعرض "—" ويلوّن A.
- لكن: الخيار محصور بين Yamal/Lewandowski/Palmer فقط.

### أين يتم حفظ اللاعب الجديد إذا تم بناؤه؟

التسلسل:
1. `build_fotmob_mega_profile.py` → `deploy/reo-datafabric/reports/player_fotmob_mega/{slug}.json` (1+ MB، gitignored)
2. `build_player_intel_master_profile.py` → `deploy/reo-datafabric/reports/player_intel_master/{slug}.master.json` (1+ MB، gitignored)
3. `build_player_intel_public_registry.py` → `public/player-intel-v2-samples/{slug}.broadcast.json` (~37 KB، **يُرفع لـ git**) + تحديث `index.json`.

### ما الملفات التي يجب ألا نلمسها لأنها مستقرة؟

**مستقرة وتعمل:**
- `PlayerIntelV2Renderer.tsx` (5 variants شغالة)
- `playerIntelV2Presets.ts` (8 presets)
- `playerIntelV2Labels.ts` (Arabic map نظيف، 40+ metric)
- `build_player_intel_master_profile.py` (Phase X.6 — تم اختباره مع 3 لاعبين)
- `build_player_intel_public_registry.py` (Phase X.9)
- 3 ملفات broadcast.json الموجودة

**يجب عدم لمسها مطلقًا:**
- `PlayerStatsRenderer.tsx` (القالب القديم)
- `/api/player-stats` و player-stats-bridge على VPS
- FBref cache (`deploy/reo-datafootball-worker/.cache/fbref/`)
- نظام الترخيص (`api/license.ts`، `services/licenseService.ts`)

---

## 3. تقييم النظام (من 10)

| المحور | التقييم | الملاحظة |
| --- | --- | --- |
| **قوة البيانات** | 6/10 | ممتازة (340+ metric لكل لاعب) لكن لـ 3 لاعبين فقط. |
| **سهولة البحث** | 4/10 | UI ظاهر لكن وظيفياً يطابق 3 entries محلية. لا "بحث وبناء" حقيقي. |
| **قابلية إضافة لاعب جديد** | 2/10 | تتطلب terminal + FotMob ID + 3 أوامر + npm build. |
| **جودة التصميم** | 7/10 | 5 variants حقيقية، ألوان متنوعة، RTL نظيف. لكن الـ Premium variant ما زال فيه فراغ في وسط البطاقة عندما القائمة قصيرة. |
| **جودة المقارنة** | 6/10 | تعمل (DuelRow + تلوين الفائز). لكن مقيّدة بـ 3 لاعبين، ولا تدعم metrics بدون قيم في B بشكل لطيف. |
| **جاهزية البث** | 5/10 | تقنياً يعمل (16:9 مع syncManager + isVisible). لكن للمحتوى الحقيقي يلزم بناء كل لاعب يدويًا قبل البث. |

**المتوسط الإجمالي: 5/10** — نظام صلب من الناحية الهندسية، فقير من ناحية المحتوى الجاهز.

---

## 4. السبب الحقيقي لضعف النظام

**السبب الأساسي: عدم وجود Data Engine متصل.**

التشخيص:
1. **ليست مشكلة تصميم** — الـ Renderer ممتاز نسبياً (5 variants، RTL، broadcast quality).
2. **ليست مشكلة UI** — Editor panel فيه search box، metric picker، 4 تبويبات.
3. **ليست مشكلة في تعدد المصادر** — FotMob و FBref مدموجان في master profile بشكل نظيف.
4. **هي مشكلة فجوة بين CLI tools و Frontend:**
   - Tools موجودة وتعمل من سطر الأوامر.
   - الواجهة لا يمكنها استدعاؤها.
   - لا API endpoint للبناء (فقط للبحث في cache المحلي).
   - النتيجة: مكتبة مجمّدة على 3 لاعبين.
5. **هي مشكلة نقص لاعبين** — كنتيجة مباشرة للسبب الرابع.

**المعنى:** الإصلاحات السابقة (X.7 → X.11) أضافت طبقات UI فوق نفس الـ 3 لاعبين. كل phase وعدت "نظام ديناميكي" لكن الديناميكية محصورة بين 3 entries.

---

## 5. ثلاثة مسارات

### مسار A — إصلاح سريع (يوم واحد)

**الهدف:** توسيع المكتبة من 3 إلى 15-20 لاعب يدوياً، بدون تغيير معماري.

**الخطوات:**
1. تحضير قائمة 15-20 لاعب أساسي (كبار النجوم: مبابي، صلاح، هالاند، بيدري، رودريغو، …).
2. تشغيل CLI لكل لاعب: `reo_fotmob_cli.py search-player` للحصول على FotMob ID.
3. تشغيل pipeline لكل واحد:
   ```
   build_fotmob_mega_profile.py --player-id X --name "Y"
   build_player_intel_master_profile.py --player "Y" --club "Z" --season "2025-26"
   ```
4. تشغيل `build_player_intel_public_registry.py` مرة واحدة.
5. `npm run build` و push.

**النتيجة:** المستخدم يرى 15-20 لاعب في dropdown، البحث العربي يعمل لأكثرهم.  
**القيود:** لا اضافة فورية من الواجهة، لا تحديث تلقائي.  
**التكلفة:** ~30 طلب لـ FotMob (3s delay × 20 لاعب × 4 طلبات ≈ 4 دقائق + بعض الصبر).

### مسار B — بناء متوسط (أسبوع)

**الهدف:** على-طلب من الواجهة، بدون تشغيل terminal.

**الخطوات:**
1. **Build endpoint جديد** `/api/player-intel-v2/build-player.ts`:
   - يقبل `{ playerName, club, season }` POST.
   - يستدعي FotMob apigw search داخل الـ serverless function (نفس آلية fotmob_provider.py لكن بـ Node).
   - يستخرج FotMob ID + buildId + raw JSON.
   - يحفظ broadcast.json في S3 / Vercel Blob / KV (لأن file system في Vercel read-only).
2. **registry hosted في KV** بدلاً من ملف static.
3. **fbref data integration** عبر API يقرأ من VPS read-only endpoint (إذا قبلنا limited exposure).
4. **search-player endpoint** يصبح يبني عند عدم العثور.
5. **Toast حقيقي**: "جاري بناء بروفايل اللاعب…" مع progress.

**القيود:**
- يحتاج Vercel Blob أو KV (بدفع).
- FotMob قد يحظر IPs الـ Vercel functions (لم نختبر).
- FBref data integration معقد (cache على VPS، خارج المشروع).

**التكلفة:** ~5–7 أيام عمل.

### مسار C — بناء احترافي حقيقي (أسبوعان)

**الهدف:** نظام إنتاج متكامل بمستوى تجاري.

**الخطوات:**
1. **Player Intel Service** مستقل على VPS (بايثون + FastAPI).
2. **Database** (Postgres أو SQLite) لتخزين registry و profiles.
3. **Job queue** (Redis + RQ) للمعالجة غير المتزامنة.
4. **Build endpoints** على الـ service:
   - `POST /players/build` يبدأ job.
   - `GET /jobs/{id}` يعرض progress.
   - `GET /players/{slug}/broadcast` يعطي JSON جاهز.
5. **Frontend** يستهلك service عبر `/api/proxy/...` بدون CORS.
6. **Cache بدنيمي** — يُعاد بناء profile كل أسبوع تلقائياً.
7. **Auto-suggest** أثناء الكتابة (typeahead).
8. **Image pipeline** — يحمّل صور FotMob ويرفعها لـ CDN خاص (تحاشي broken links).
9. **A11y + i18n** كامل.
10. **Monitoring** + alerts عند فشل FotMob.

**النتيجة:** نظام جاهز لإنتاج 100+ لاعب في أسبوع، تحديث تلقائي، تجربة broadcast حقيقية.  
**التكلفة:** ~10–14 يوم عمل + استضافة DB + مراجعة قانونية لـ FotMob ToS.

---

## 6. التوصية الصريحة

**لا تبنِ المزيد من UI الآن.**

السبب: كل تحسين UI جديد سيظل محدوداً بـ 3 لاعبين، لأن الـ Data Engine هو العنق.

**الترتيب الأمثل:**
1. **اعمل مسار A أولاً** (يوم) — وسّع المكتبة لـ 15-20 لاعب.
2. **اختبر التجربة** — اعرف هل الـ UI كافٍ مع محتوى أكبر.
3. **قرر** بين B و C بناءً على نتيجة 2.

**لا توصية لمسار B الآن** ما لم نتأكد من أن الـ UI الحالي يكفي عند 20 لاعب.

---

## 7. ملاحظات نهائية

- **الـ tooling الموجود ممتاز** — Phase X.5 → X.9 بنوا أساس صلب.
- **الـ UI الموجود كافٍ** للحالة الحالية — لا يحتاج إعادة كتابة.
- **النقطة الوحيدة الحقيقية للضعف**: لا يوجد جسر بين CLI tools والمستخدم النهائي.
- **حلّ الجسر** = مسار B أو C، حسب طموحنا.

**هذا التقرير لم يغيّر أي ملف ولم يعمل commit.**
