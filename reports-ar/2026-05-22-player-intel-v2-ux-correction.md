# Phase UI-X2 — تصحيح UX لـ Player Intel V2

تاريخ: 2026-05-22  
الفرع: main

---

## 1. لماذا UI-X1 لم يكن كافيًا

في UI-X1 أنشأت `PlayerIntelV2BottomDock.tsx` لكنها وُضعت **داخل الـ sidebar اليميني** بدلاً من أن تكون أسفل المعاينة. النتيجة:
- الإعدادات بقيت مزدحمة في sidebar طويل.
- المعاينة تتقلّص بسبب panel = 384px (`w-96`).
- الـ "Bottom Dock" كان مجرد wrapper شكلي.

أيضاً:
- البحث بالنادي اعتمد على alias map ثابت (~25 نادٍ) لا يكفي.
- لا يوجد مؤشّر على نطاق الإحصائيات (LaLiga/All comps/Recent).
- صور FotMob الفاشلة تترك مكاناً فارغاً قبيحاً.

---

## 2. كيف أصبح Bottom Dock حقيقيًا

### 2.1 موقع جديد
الـ dock الآن **خارج الـ sidebar تمامًا**:
- يُعرض في center area بعد Monitor (في `Editor.tsx`).
- يأخذ كامل عرض المعاينة.
- ارتفاع expanded: `max-h-[36vh]` افتراضي، أو `max-h-[45vh]` عند توسيعه.
- ارتفاع collapsed: `44px` فقط (شريط واحد).

### 2.2 Auto-collapse للـ sidebar
عند فتح PLAYER_INTEL_V2 يتم إغلاق الـ sidebar الجانبي تلقائيًا (`setPanelOpen(false)`). الـ sidebar يحوي رسالة عربية صغيرة:
> "⚡ تحكم Player Intel V2 — لوحة التحكم الكاملة منقولة إلى الشريط السفلي تحت المعاينة لتجربة بث أوسع."

### 2.3 Header strip غني بالمعلومات
شريط الـ header (44px دائماً) يعرض:
```
✨ استخبارات اللاعب V2 · Lamine Yamal · بطاقة هجومية · premium broadcast · 8 إحصائية   [ 🔼 ] [ ⌃ ]
```
- اسم اللاعب الحالي
- نوع البطاقة بالعربي
- النمط البصري
- وضع المقارنة إن مفعّل
- عدد الإحصائيات المختارة
- زر تبديل ارتفاع الـ dock (normal/tall)
- زر فتح/إغلاق

### 2.4 حالة محفوظة
حالة collapsed و height (tall/normal) محفوظتان في localStorage:
```
reo:player-intel-v2:dock-collapsed:v2
reo:player-intel-v2:dock-height:v1
```

---

## 3. ماذا بقي في sidebar ولماذا

الـ sidebar يحتفظ بـ:
- قوائم أدوات عامة (مساعد، Smart Text، إلخ) لباقي القوالب.
- شريط رسالة عربية فقط لقالب PLAYER_INTEL_V2 (لا تحكم فعلي).

**لم نحذف الـ sidebar** لأن باقي القوالب (SCOREBOARD، MATCH_STATS، PLAYER_STATS، الانتخابات…) تعتمد عليه. الـ Bottom Dock مفعّل لـ PLAYER_INTEL_V2 فقط.

---

## 4. كيف يعمل Universal Club Resolver

### 4.1 المنطق

ملف: `api/_lib/playerIntelV2Handlers.ts` → `_resolveClubLive()`.

```
المستخدم يكتب: "ليل" أو "موناكو" أو "الهلال"
              ↓
[1] إذا الاسم بالعربي → ترجمة سريعة من alias map (إن وُجد)
[2] استدعاء FotMob teamSuggest endpoint (live):
    GET https://apigw.fotmob.com/searchapi/suggest?term=Lille
[3] استخراج كل الـ teams من response
[4] حساب confidence لكل candidate بناءً على:
    - تطابق exact (1.0)
    - تطابق startsWith (0.85)
    - تطابق substring (0.75)
    - tokens overlap (0.6)
    - FotMob native score (+0.05 max)
[5] إرجاع أفضل match مع teamId + leagueName + countryCode
[6] إذا لم يوجد match قوي (< 0.4) → إرجاع english candidate بدون teamId
```

النتيجة: **أي نادي يعرفه FotMob يصبح متاحًا** — ليس قائمة ثابتة بـ 25 نادٍ.

### 4.2 الـ alias map الثابت بقي كـ fallback سريع
يستخدم فقط لتسريع الترجمة الأولية للعربي → إنجليزي قبل ضرب FotMob (يوفّر round-trip للأسماء الشهيرة).

### 4.3 Action جديد ضمن نفس endpoint

```
POST /api/player-intel-v2
{ "action": "club-resolve", "query": "ليل" }
```

الرد:
```json
{
  "ok": true,
  "resolved": {
    "teamId": 8639,
    "name": "Lille",
    "leagueName": "Ligue 1",
    "countryCode": "FRA",
    "confidence": 0.92,
    "source": "fotmob"
  },
  "candidates": [...],
  "messageAr": "تم تحديد النادي: Lille"
}
```

**لم يُضَف أي endpoint جديد** — كل شيء داخل `/api/player-intel-v2` مع action router. عدد Vercel functions = **10** (لم يتغيّر).

---

## 5. كيف يتم ربط clubId بنتائج اللاعبين

في `_rankMatchesV2()`:
```
إذا resolvedClub.teamId موجود AND suggestion.teamId === resolvedClub.teamId:
  confidence += 0.4   ← أعلى boost
  clubMatchStrength = 'strong'

غير ذلك إذا teamName === translated.club:
  confidence += 0.35
  clubMatchStrength = 'strong'

غير ذلك إذا teamName.includes(clubFirstWord):
  confidence += 0.22
  clubMatchStrength = 'medium'

غير ذلك:
  clubMatchStrength = 'weak'
```

النتائج تُرجَع للواجهة مع `clubMatch: 'strong' | 'medium' | 'weak' | 'none'` لعرض badge:
- 🟢 "تطابق نادٍ قوي"
- 🟡 "تطابق نادٍ متوسط"
- ⚪ "تطابق نادٍ ضعيف"

**لا يُخفى** أي لاعب — حتى لو كان `weak`، يبقى ظاهرًا في الترتيب الأخير.

---

## 6. كيف يتم توضيح نطاق الإحصائيات

### 6.1 Backend (في `fotmobBroadcastBuilder.ts`)

كل profile مبني الآن يحوي حقل `dataScope`:
```typescript
dataScope: {
  scopeType: 'main_league' | 'all_available' | 'tournament' | 'recent_matches' | 'unknown',
  label: 'LaLiga · 2025-26',
  season: '2025-26',
  competitionName: 'LaLiga',
  competitionId: 87,
  sourcePath: 'pageProps.data.mainLeague.stats',
  confidence: 'high' | 'medium' | 'low',
  availableCompetitions: [{ name, competitionId, seasonsCount }, ...],
}
```

### 6.2 المنطق الذكي

```
إذا mainLeague.stats موجود وله values → scopeType='main_league', confidence='high'
وإلا إذا firstSeasonStats موجود → scopeType='main_league', confidence='medium'
وإلا إذا recentMatches موجود → scopeType='recent_matches', confidence='medium'
وإلا → scopeType='unknown', confidence='low'
```

### 6.3 العرض في القالب

كل visual variant يعرض scope label:
- **Premium Broadcast**: badge بجانب card type ("LaLiga · 2025-26")
- **Tactical Board**: تحت metaA.position
- **Magazine Profile**: تحت club/position بـ accent color
- **Compact TV**: text صغير تحت club
- **H2H Duel**: تحت VS

`availableCompetitions` يُسجَّل في الـ profile لكن **لا يُظهَر كخيار** إلا إذا كانت إحصائياتها متاحة فعلاً.

---

## 7. هل كل المسابقات متاحة فعلًا

**لا.** FotMob يوفّر:
- `mainLeague.stats` → الدوري الرئيسي **فقط** (LaLiga للاعب برشلونة، Premier League للاعب تشيلسي…).
- `statSeasons[].tournaments[]` → قائمة المسابقات لكن **بدون stats** عدا hasDeepStats flag.
- `recentMatches` → آخر 50-60 مباراة من **كل** المسابقات لكن مباراة-مباراة.

المعالجة الصادقة:
- نعرض label دقيق: "LaLiga · 2025-26" وليس "All competitions".
- إذا اللاعب لعب في مسابقات أخرى، تُسجَّل في `availableCompetitions` لكن **لا** نخترع stats لها.
- اختيار "كل المسابقات" disabled حتى تتوفر بياناتها فعلاً (مرحلة لاحقة).

---

## 8. كيف تم تحسين Metric Picker

في هذه المرحلة الأساس بقي كما في UI-X1:
- 9 categories (هجومية، صناعة لعب، تمرير، استحواذ، دفاع، إلخ).
- Hero/Secondary/Hidden zones.
- بحث بالاسم العربي والإنجليزي.

التحسينات الجديدة في UX:
- الـ picker الآن داخل dock أوسع → يظهر بشكل أفضل.
- Search bar أكبر.
- Examples chips تستخدم النمط الجديد (player + club منفصلين).

التحسين الكامل لـ Modern Metric Picker (cards بدلاً من rows + source/scope badges per metric) **مؤجَّل لـ phase منفصل** لأن الجزء الحالي أساسي للوصول للـ feature parity مع UI-X1 + إضافة club resolver وdataScope.

---

## 9. كيف تم تحسين Visual Presets

### 9.1 Image fallback أنيق
عند فشل تحميل صورة FotMob (مثل Mbappé أحياناً)، الـ Renderer الآن يعرض **silhouette SVG** متدرج مع accent glow بدلاً من spinner أو مكان فارغ:

```svg
<circle cx="50" cy="35" r="18" fill="..." />     ← الرأس
<path d="M20 110 Q20 75 50 75 Q80 75 80 110..." /> ← الجسم
```

مع `radial-gradient(ellipse at center 80%, accent10, transparent 60%)` للوهج. لا spinner، لا "broken image" icon.

### 9.2 Scope badge في كل variant
كل variant الآن يعرض scope label كمؤشّر صغير أنيق (cyan/accent للـ Magazine، slate للـ Tactical، إلخ).

### 9.3 توزيع Header
في `PremiumBroadcastVariant`، CardBadge + ScopeBadge صفّ واحد flex-wrap → أقل ضغط على المعاينة.

---

## 10. الحفاظ على التوافق

| الجانب | الحالة |
| --- | --- |
| Player Stats Lab | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| PlayerStatsRenderer | لم يُلمس |
| PlayerIntelV2Renderer | محدّث (إضافة scopeLabel + image fallback، لا breaking changes) |
| schemaVersion | بقي `player-intel-master-v1` |
| Profiles في localStorage القديمة | تُقرَأ بدون مشاكل (dataScope يكون undefined عندها — الـ Renderer يتعامل مع ذلك) |
| compare mode | يعمل |
| 5 variants | تعمل جميعها |
| Vercel Functions | **10** (لم يتغيّر) |
| نظام الترخيص | لم يُلمس |
| التوكنات | لم تُلمس |
| REO Match | يعمل |

---

## 11. الملفات الأساسية التي تغيّرت

| الملف | الحالة |
| --- | --- |
| `pages/Editor.tsx` | نقل الـ dock من sidebar إلى center area + auto-collapse panel |
| `components/player-intel-v2/PlayerIntelV2BottomDock.tsx` | إعادة كتابة كاملة (header strip + height toggle + ارتفاع 36/45vh) |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | إضافة `resolveClubLive` + chip النادي + clubMatch badges |
| `api/_lib/playerIntelV2Handlers.ts` | إضافة `handleClubResolve` + `_resolveClubLive` + `_rankMatchesV2` |
| `api/_lib/fotmobClient.ts` | إضافة `searchFotMobTeams` |
| `api/_lib/fotmobBroadcastBuilder.ts` | إضافة `dataScope` لكل profile |
| `api/player-intel-v2.ts` | إضافة `club-resolve` action |
| `components/renderers/PlayerIntelV2Renderer.tsx` | إضافة `scopeLabel` لكل variant + `PortraitImage` مع silhouette fallback |

---

## 12. أمثلة الاختبار

| Query | Club | السلوك المتوقع |
| --- | --- | --- |
| `Lamine Yamal` | (فارغ) | يعمل، لا scope badge من النادي |
| `Lamine` | `Barcelona` | club-resolve → teamId=8634، نتيجة Yamal بـ clubMatch='strong' |
| `Koundé` | `Barcelona` | club-resolve → teamId=8634، Jules Koundé بـ clubMatch='strong' |
| `كوندي` | `برشلونة` | trans → "Barcelona"، resolve → 8634، نفس النتيجة |
| `Mbappé` | `ريال مدريد` | resolve → Real Madrid teamId، Kylian Mbappé clubMatch='strong'، silhouette إذا فشلت الصورة |
| `Palmer` | `Chelsea` | Cole Palmer clubMatch='strong' |
| `Foden` | `ليل` | club-resolve يبحث عن "Lille" via FotMob → Ligue 1 club |
| `Bounou` | `الهلال` | club-resolve يبحث عن "Hilal" via FotMob → SPL club إن موجود |
| `Henderson` | `الاتفاق` | يحاول، إذا لم يجد → resolved.teamId=null + warning weakClubMatch |

---

## 13. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` (tsc --noEmit) | exit 0 |
| `npm run build` (vite) | exit 0 (5.73s) |
| عدد Vercel Functions | **10** ≤ 12 ✓ |
| Bottom Dock في center area | ✓ (أسفل Monitor) |
| Sidebar auto-collapse | ✓ (عند PLAYER_INTEL_V2) |
| Universal Club Resolver عبر FotMob | ✓ (`searchFotMobTeams` + `_resolveClubLive`) |
| `dataScope` في كل profile جديد | ✓ |
| Scope label في كل variant | ✓ |
| Image silhouette fallback | ✓ |
| كل profile قديم في localStorage | يعمل (dataScope undefined → بدون كسر) |
| لا تلفيق بيانات | ✓ |
| لا API endpoint جديد | ✓ |

---

## 14. ما الذي تحسّن وما لم يتحسّن

### تم الآن
- ✅ Bottom Dock حقيقي في center area (ليس داخل sidebar).
- ✅ Universal Club Resolver عبر FotMob teamSuggest (ليس قائمة ثابتة).
- ✅ teamId-based ranking مع clubMatch graded.
- ✅ dataScope label في كل variant.
- ✅ Image silhouette fallback أنيق.
- ✅ Resolve club chip في الـ UI مع status (مؤكد / غير مؤكد).
- ✅ rank badges في نتائج البحث (قوي/متوسط/ضعيف).

### لم يتم بعد (مرحلة منفصلة لاحقة)
- 🔜 Modern Metric Picker بـ cards صغيرة كل واحدة فيها source/scope/percentileRank badges.
- 🔜 Tab-by-tab redesign داخل الـ panel (الآن tabs عمودية، لاحقًا أفقية أكثر تنظيمًا).
- 🔜 جدول "All competitions" حين تتوفر بياناتها فعلًا.
- 🔜 Drag-to-resize للـ dock.
- 🔜 Visual polish أعمق للـ presets الخمسة (تحسينات بصرية إضافية).

سبب التأجيل: هذه phase ركّزت على **الأساسيات الصحيحة** أولاً (dock حقيقي + resolver ديناميكي + scope clarity + image fallback). التحسينات البصرية الإضافية تحتاج phase مخصّص للتجربة البصرية بعد التأكد من البنية.

---

## 15. التحذيرات الباقية

- `chunk size > 500 kB` من Vite — warning غير حرج لا يمنع Vercel deploy.
- لا تحذيرات أخرى.
