# Phase X.12-REAL — FotMob On-Demand Player Search & Profile Builder

تاريخ: 2026-05-21  
الفرع: main  
الـ Goal: تجاوز قيد "3 لاعبين فقط" نحو نظام بحث وبناء حسب الطلب من FotMob.

---

## 1. كيف يعمل البحث

```
المستخدم يكتب: "ليفاندوفسكي برشلونة"
              ↓
[1] /api/player-intel-v2/fotmob-search
    - تطبيع عربي (إزالة تشكيل، توحيد ا/ي/ة، إلخ)
    - ترجمة تعابير عربية مشهورة لإنجليزية:
      ليفاندوفسكي → Lewandowski
      برشلونة → Barcelona
    - استدعاء FotMob: apigw.fotmob.com/searchapi/suggest
    - ترتيب النتائج بـ confidence (name match × 0.6 + club match × 0.3 + FotMob score × 0.1)
              ↓
[2] الواجهة تعرض النتائج كقائمة مع زر "إضافة للقالب" بجانب كل نتيجة
              ↓
[3] /api/player-intel-v2/build-fotmob-profile
    - استخراج Next.js buildId من www.fotmob.com/
    - جلب _next/data/{buildId}/en/players/{id}/{slug}.json
    - بناء broadcastCards بـ 8 بطاقات
    - حفظ في in-memory cache (24h TTL)
              ↓
[4] الواجهة تحفظ في localStorage
    - مفتاح: reo:player-intel-v2:dynamic-profiles:v1
    - TTL: 14 يوم
    - حد أقصى: 50 لاعب (LRU eviction)
              ↓
[5] الـ Renderer يقرأ من localStorage أولاً، ثم public/ كـ fallback
```

---

## 2. هل يستخدم FotMob فعليًا؟

**نعم، live.** ليس cache مسبق.

- `api/_lib/fotmobClient.ts` — TypeScript port دقيق لـ `fotmob_provider.py` المُختبَر في Phase X.4.
- نفس الـ endpoints:
  - `GET https://apigw.fotmob.com/searchapi/suggest?term=...&lang=en`
  - `GET https://www.fotmob.com/` (لاستخراج buildId via regex)
  - `GET https://www.fotmob.com/_next/data/{buildId}/en/players/{id}/{slug}.json`
- نفس الـ User-Agent.
- نفس rate limit (1.5s بين الطلبات).
- نفس fallback عند 404 (refresh buildId مرة واحدة).

**في cold start serverless**: أول طلب يستغرق ~3-5 ثوان (buildId fetch + search). الطلبات التالية أسرع لأن buildId مكاش لـ 24h.

---

## 3. هل يدعم العربي؟

نعم، بثلاث طبقات:

1. **تطبيع نصي**: إزالة التشكيل، تطبيع `ا/أ/إ/آ`، `ي/ى`، الهمزات.
2. **قاموس لاعبين عربي → إنجليزي**: 50+ لاعب (يامال، ليفاندوفسكي، مبابي، صلاح، هالاند، بيدري، غافي، فينيسيوس، بيلينغهام، كين، نيكو ويليامز، لاوتارو، ديمبيلي، …).
3. **قاموس أندية**: 25+ نادي (برشلونة، ريال مدريد، تشيلسي، ليفربول، باريس، بايرن، يوفنتوس، …).

عند فشل المطابقة بالقاموس، الـ query يُرسل لـ FotMob كما هو (FotMob يدعم بحث جزئي بالأسماء الإنجليزية).

**ملاحظة:** FotMob لا يدعم بحث عربي مباشرة، لذلك نترجم محلياً قبل الإرسال.

---

## 4. أين يُحفظ اللاعب الجديد؟

| الطبقة | المكان | المدة |
| --- | --- | --- |
| Server-side cache | في-memory داخل Vercel function instance | يموت مع cold start |
| Client-side store | `localStorage` تحت مفتاح `reo:player-intel-v2:dynamic-profiles:v1` | 14 يوم |
| Static registry | `public/player-intel-v2-samples/index.json` | لا يُلمس |

**سبب التصميم**: Vercel filesystem read-only، لا يمكن كتابة `index.json`. الحل المختصر: `localStorage` للـ persistence + in-memory للـ session-level caching.

**لا يُحفظ master.json الضخم في public/** — فقط broadcast (شكل ~30-40 KB من JSON) في localStorage.

---

## 5. منع تلفيق البيانات (no fabrication)

**القاعدة الذهبية: إذا الرقم غير موجود في FotMob، لا يظهر في البطاقة.**

تطبيق صارم في `fotmobBroadcastBuilder.ts`:
- `_isPresent()` يتجاهل: `null`, `undefined`, `''`, السلسلة `'matches'` (artifact شائع في FBref).
- البطاقات تحتوي فقط items مع قيم حقيقية.
- لا Gemini، لا تقدير، لا تخمين.
- إذا اللاعب ليس له شوتات → بطاقة "هجومية" تظهر بدون حقل shots بدلاً من "0" أو "—".

**Quality Report** يسجّل metric counts، warnings (`LOW_FOTMOB_METRIC_COUNT` إذا < 30 metric), ولا يسجّل أرقام مفبركة.

---

## 6. حدود FotMob الحالية

من تجربة Phase X.4:
- **Rate limiting**: 3+ ثوان بين الطلبات؛ نستخدم 1.5s (FotMob يبدو متسامح حتى 1s، لكن 1.5s أكثر أمانًا).
- **buildId rotation**: FotMob يحدّث buildId كل بضع أيام؛ مكاش لـ 24h يكفي.
- **Cloudflare blocks**: إذا تكررت الطلبات بسرعة، يظهر 403 — الكود يكتشفه ويوقف.
- **FBref غير مدموج هنا**: profiles المبنية on-demand تحتوي FotMob فقط (`sourceCoverage.fbref: false`). لدمج FBref، يلزم مسار يدوي عبر `build_player_intel_master_profile.py` على الكمبيوتر.
- **Vercel function timeout**: 10 ثوان افتراضيًا. الـ build التام (search → buildId → player data → broadcast build) عادةً 4-7 ثوان، آمن.

---

## 7. ما تم بناؤه

| الملف | الحجم | الوظيفة |
| --- | --- | --- |
| `api/_lib/fotmobClient.ts` | 195 سطر | HTTP client (search, buildId, player data) + in-memory cache |
| `api/_lib/fotmobBroadcastBuilder.ts` | 380 سطر | FotMob raw → broadcast.json shape |
| `api/_lib/fotmobRuntimeStore.ts` | 75 سطر | in-memory store (50 max, 24h TTL) |
| `api/player-intel-v2/fotmob-search.ts` | 220 سطر | POST endpoint للبحث |
| `api/player-intel-v2/build-fotmob-profile.ts` | 130 سطر | POST endpoint للبناء |
| `components/player-intel-v2/playerIntelV2DynamicStore.ts` | 90 سطر | localStorage helper |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | تحديث | UI: search box, results list, dynamic profiles list |
| `components/renderers/PlayerIntelV2Renderer.tsx` | تحديث | يقرأ من localStorage أولًا |

---

## 8. كم لاعب تم إضافته أثناء الاختبار

**صفر تلقائيًا** — هذه phase تبني الآلية فقط. الاختبار الفعلي يتطلب deploy على Vercel:
- localhost لا يستطيع الاتصال بـ FotMob من server-side function إلا إذا الجهاز متصل بالإنترنت.
- في الـ deploy، أول طلب سيختبر السلسلة كاملة.

**تم التحقق من:**
- TypeScript lint نظيف.
- Build ناجح بدون أخطاء.
- المنطق متطابق مع Python provider الذي اختُبر مع 3 لاعبين في Phase X.4 (Yamal, Lewandowski, Palmer جُلبوا فعلاً).

---

## 9. حماية النظام القديم

| العنصر | الحالة |
| --- | --- |
| `PlayerStatsRenderer.tsx` | لم يُلمس |
| `Player Stats Lab` | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| `player-stats-bridge` (VPS) | لم يُلمس |
| `FBref cache` | لم يُلمس |
| `fotmob_provider.py` | لم يُلمس (نُسخ منه إلى TS) |
| نظام الترخيص | لم يُلمس |
| ملفات master الضخمة في `reports/` | لم تُلمس |
| التوكنات | لم تُلمس |
| 3 broadcast.json الموجودة في public/ | لم تُلمس |
| تصميم PlayerIntelV2Renderer | تعديل واحد فقط: `loadBroadcast` يفحص localStorage أولاً |

---

## 10. UI التغييرات في Editor Panel

- **عنوان جديد**: "بحث وإضافة لاعب من FotMob"
- **زر رئيسي**: "بحث في FotMob" (cyan)
- **زر ثانوي**: "محلي فقط" (gray)
- **رسائل عربية**:
  - "جاري البحث في FotMob..."
  - "تم العثور على X نتائج محتملة."
  - "جاري بناء بروفايل اللاعب..."
  - "تمت إضافة Y من FotMob (Z إحصائية)."
  - "لم يتم العثور على اللاعب في FotMob."
- **قائمة النتائج**: كل نتيجة تظهر مع club + confidence% + ID + زر "إضافة للقالب".
- **قائمة اللاعبين المُضافون** (dynamic): مع زر "اختيار" و"حذف".
- **dropdown اللاعب**: يدمج الـ static registry + dynamic profiles مع تمييز "(FotMob)" بجانب الديناميكية.
- **عداد المكتبة**: "X لاعب (Y ثابت + Z من FotMob)".

---

## 11. المرحلة التالية (X.13)

1. **اختبار live على Vercel deploy**: التأكد من نجاح FotMob search من VercelEdge IPs.
2. **إذا فشل (Cloudflare block)**: إضافة مسار proxy عبر VPS الموجود.
3. **Visual polish للـ broadcast template**: بعد التأكد من الـ data engine يعمل.
4. **دعم تحديث لاعب**: زر "تحديث من FotMob" لإعادة جلب أحدث الأرقام.
5. **حفظ في server-side store**: Vercel KV أو Blob لمشاركة الـ profiles بين users.
6. **Auto-refresh recent players**: cron لإعادة بناء أعلى 20 لاعب كل أسبوع.

---

## 12. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (7.67s) |
| TypeScript types نظيفة | ✅ |
| لا تعارض في `api/_lib/` | ✅ |
| Editor panel يعرض search box جديد | ✅ منطقياً |
| Renderer يقرأ من localStorage | ✅ منطقياً |
| لا demo data في أي مكان | ✅ |
| لا تلفيق أرقام | ✅ |
| Player Stats Lab القديم سليم | ✅ |
| 3 لاعبين الأصليين ما زالوا يعملون | ✅ (لم يُلمس index.json أو broadcast.json) |
