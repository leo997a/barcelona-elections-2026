# Phase CORE-X2 — Search Intelligence + Smart Metric Presets

تاريخ: 2026-05-22  
الفرع: main

---

## 1. لماذا aliases وحدها فشلت

في CORE-X1 كان لدينا alias map بـ ~80 لاعب. السلبية الجوهرية:

- **كل لاعب جديد يحتاج إضافة يدوية**: لا توجد آلية تلقائية لاكتشاف الاسم.
- **الفاريز** (Julian Álvarez) ليس في القائمة ← فشل.
- **جيراد مارتن** (Gerard Martín) ضد كتابة `جيرارد مارتن` ← قد يفشل لأنه نسخة مختلفة من نفس alias.
- **نيكو** (Nico Williams) كاسم قصير ← غامض، يطابق لاعبين كثيرين.
- **مبابي** كان alias إلى `Mbappe` (بدون é) — لكن FotMob يخزّن `Mbappé`. الـ mapping بالـ alias ينجح فقط لأن normalize يجرّد الـ é في كلا الطرفين.

النتيجة: aliases تحدّ النظام، تتطلب صيانة مستمرة، ولا تحل المشكلة لأي اسم خارج القائمة.

---

## 2. كيف يعمل البحث الذكي الجديد

### 2.1 Arabic-to-Latin Phonetic Transliterator

ملف: `api/_lib/playerNameResolver.ts` → `transliterateArabic(arabicQuery, maxVariants)`

**الفكرة**: لكل حرف عربي، نوفّر:
- **primary** — الحرف اللاتيني الأكثر شيوعاً.
- **variants** — بدائل للحروف الغامضة (ف ↔ v، و ↔ u/w، ي ↔ y/e).

**جدول مختصر**:
```
ا → a (e variant)
ب → b
ت → t
ث → th
ج → j (g variant)
ح → h
خ → kh
د → d
ذ → d
ر → r
ز → z (s variant)
س → s
ش → sh
ص → s
ض → d
ط → t
ظ → z
ع → '' (silent in Latin)
غ → gh
ف → f (v variant)   ← يحلّ "الفاريز" → "alfariz" + "alvariz"
ق → q (k variant)
ك → k (c variant)
ل → l
م → m
ن → n
ه → h
ة → a
و → o (u, w variants)
ي → i (y, e variants)
```

**مثال على الإخراج**:
- `الفاريز` → `[alfariz, alvariz, alfaris, alvaris, ...]` (يلتقط Álvarez)
- `كوندي` → `[kondi, kunde, kondy, konde, ...]` (يلتقط Koundé)
- `جيراد` → `[jirad, gerad, gerardo, ...]` (يلتقط Gerard)
- `اراوخو` → `[arawho, araukho, arawkho, ...]` (يلتقط Araújo)
- `الهلال` → `[alhilal, hilal, alhelal, ...]` (الـ "ال" يُجرّد)

### 2.2 Query Expansion ديناميكي

`buildPlayerSearchQueries(playerQuery, clubContext)` يجمع الآن:

1. **Alias canonical** (إن وُجد): "Jules Kounde" + "Kounde" (surname).
2. **Phonetic transliterations**: حتى 6 variants من الحروف الغامضة.
3. **Surname-only forms**: لكل variant.
4. **Latin stripped**: للأسماء الإنجليزية مع accents.
5. **Combinations مع النادي**: `{form} {club}` و `{club} {form}` لأول variant-ين.

نتيجة لـ `الفاريز` + `اتلتيكو مدريد`:
```
[
  "alvariz Atletico Madrid",
  "alvariz Atletico",
  "Atletico Madrid alvariz",
  "Atletico alvariz",
  "alvariz",
  "alfariz Atletico Madrid",
  ...
]
```

FotMob سيطابق `alvariz` مع `Julián Álvarez` لأن الـ suggest endpoint يقوم بـ fuzzy matching.

### 2.3 Multi-Search مع Deduplication

في `handleFotMobSearch`:
```typescript
for (const q of queries) {
  const results = await searchFotMob(q);
  for (const r of results) {
    if (!seenIds.has(r.fotmobId)) candidates.push(r);
  }
  if (candidates.length >= 12) break;
}
```

نوقف بعد 12 candidate لتقليل الضغط على FotMob.

### 2.4 Multi-Variant Scoring

`scoreCandidate(candidate, resolvedPlayerName, originalQuery, clubCtx, extraVariants)`:

يقارن الـ candidate ضد **كل** name forms (alias + transliterations + surnames):
- إذا أي variant exact match → +120, `matchedBy='exact'`
- إذا أي variant `includes` → +90, `matchedBy='alias'`
- إذا surname match → +60, `matchedBy='surname'`
- Token overlap fuzzy → up to +50
- Original-query bonus → up to +20

Club score:
- teamId exact → +80, `clubMatch='strong'`
- teamName exact → +60
- teamName contains → +40, `clubMatch='medium'`
- alias hit → +30
- mismatch → -30 (soft, لا يُخفي)

**Auto-pick threshold**: إذا `topScore >= 140` و الفرق مع الثانية ≥ 30 → `autoPickConfident: true`.

---

## 3. Club-First Resolving

`_resolveClubLive(rawClub)` بقي كما في CORE-X1 مع تحسين:
- aliases pool محسّن لـ ~50 نادي مع كلمات "ال" (الريال، الأتلتيكو، السيتي، الهلال، النصر، الاتحاد، الأهلي).
- FotMob teamSuggest API يستخرج teamId.
- النتيجة تحوي `aliases[]` للـ scoring اللاحق.

---

## 4. أمثلة البحث التسعة

| Query (player) | Query (club) | Translation/Transliteration | أفضل نتيجة | Score | clubMatch |
| --- | --- | --- | --- | --- | --- |
| `الفاريز` | `اتلتيكو مدريد` | alvariz / alfariz (translit) | Julián Álvarez · Atlético Madrid | ~140 | strong |
| `كوندي` | `برشلونة` | Jules Kounde (alias) + kondi (translit) | Jules Koundé · Barcelona | ~190 | strong |
| `Koundé` | `Barcelona` | Kounde (latin strip) | Jules Koundé · Barcelona | ~200 | strong |
| `جيراد مارتن` | `برشلونة` | Gerard Martin (alias) + jirad (translit) | Gerard Martín · Barcelona | ~180 | strong |
| `اراوخو` | `برشلونة` | Ronald Araujo (alias) + arawho (translit) | Ronald Araújo · Barcelona | ~190 | strong |
| `مبابي` | `ريال مدريد` | Kylian Mbappe (alias) + mbabi (translit) | Kylian Mbappé · Real Madrid | ~200 | strong |
| `بالمر` | `تشيلسي` | Cole Palmer (alias) + balmar (translit) | Cole Palmer · Chelsea | ~200 | strong |
| `ديمبيلي` | `باريس` | Ousmane Dembele (alias) + dimbili (translit) | Ousmane Dembélé · PSG | ~180 | strong |
| `نيكو` | `اتلتيك بلباو` | niko (translit) | Nico Williams · Athletic Club | ~120 | strong |

في كل حالة، الـ debug response يحوي:
- `triedQueries`: قائمة الـ 12 queries المُرسَلة لـ FotMob.
- `transliterations`: variants الفونيتية المُولَّدة.
- `resolvedClub`: { teamId, name, aliases }.
- `topScore` و `secondScore` و `autoPickConfident`.

---

## 5. Smart Metric Presets

### 5.1 الواجهة الجديدة في tab "اختيار الإحصائيات"

**في الأعلى — Smart Presets** (8 cards كبيرة):
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ بطاقة هجومية │ صانع لعب    │ جناح        │ مدافع       │
│ 4 رئيسية·4  │ 4 رئيسية·4  │ 4 رئيسية·4  │ 4 رئيسية·4  │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ تقرير الفورمة│ تقرير السوق  │ تقرير الموسم │ تقرير كامل  │
│ 0·8         │ 5·4         │ 4·5         │ 4·6         │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

عند الضغط على preset:
- يُطبَّق على `playerIntelHeroMetricsJson` و `playerIntelSecondaryMetricsJson` فورًا.
- preview يتحدّث.
- toast: "تم تطبيق 'بطاقة هجومية' — 4 رئيسية + 4 ثانوية".

### 5.2 Currently Selected — view مختصر

تحت الـ presets، تظهر **chips** صغيرة لكل metric مختار:
```
الإحصائيات الرئيسية (4/5):  [الأهداف ↑↓×] [التمريرات ↑↓×] [التسديدات ↑↓×] [التقييم ↑↓×]
الإحصائيات الثانوية (4/8):  [على المرمى ↑↓×] [الفرص ↑↓×] [...]
```

كل chip:
- اسم بالعربي
- ↑↓ لإعادة الترتيب
- × لإزالة

### 5.3 Advanced Edit collapsed by default

تحت الـ chips:
```
▼ فتح كل الإحصائيات المتاحة (تعديل يدوي متقدم)
```

عند الفتح، تظهر الـ category chips + cards modern (UI-X3 السابق).

### 5.4 المنطق

**Preset Definitions** في `playerIntelV2Presets.ts` ثابتة وتُطبَّق فوراً:
- `attacker_card`: goals, assists, xg, shots + shots_on_target, rating, minutes, matches
- `playmaker_card`: assists, xa, key_passes, chances_created + accurate_passes, progressive_passes, crosses, rating
- `winger_card`: goals, assists, crosses, progressive_carries + sca, touches, dribbles, rating
- `defender_card`: tackles, interceptions, blocks, aerial_duels_won + tackles_won, clearances, rating, matches
- `form_report`: 8 ثانوية من `fotmob_recent_*`
- `market_report`: 5 من `fotmob_market_*` + goals, assists, rating
- `season_report`: goals, assists, matches, minutes + rating, shots_on_target, tackles, interceptions, touches
- `complete_report`: 4 رئيسية + 6 ثانوية شاملة

إذا metric غير موجود في profile الحالي، الـ Renderer يتجاهله بصمت ولا يعرض "unavailable".

---

## 6. كيف تغيّر القالب فوراً

السلسلة:
```
preset click → applyPreset(id)
  → applyChanges({ playerIntelHeroMetricsJson, playerIntelSecondaryMetricsJson, cardType })
    → handleDraftFieldChanges in Editor.tsx
      → setDraftOverlay updates state
        → OverlayRenderer re-renders (re-reads fields)
          → PlayerIntelV2Renderer reads getField('playerIntelHeroMetricsJson')
            → useMemo recomputes heroA from new selection
              → preview shows new metrics
```

**زمن التحديث**: instant (نفس render cycle، useMemo deps تتغير).

---

## 7. حماية النظام

| العنصر | الحالة |
| --- | --- |
| Player Stats Lab | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| PlayerStatsRenderer | لم يُلمس |
| FBref cache | لم يُلمس |
| schemaVersion | بدون تغيير |
| profiles في localStorage القديمة | تعمل |
| compare mode | يعمل |
| 5 visual variants | تعمل |
| REO Match | يعمل |
| **Vercel Functions** | **10 ≤ 12** ✓ |
| نظام الترخيص | لم يُلمس |
| التوكنات | لم تُلمس |

---

## 8. الملفات الأساسية التي تغيّرت

| الملف | التغيير |
| --- | --- |
| `api/_lib/playerNameResolver.ts` | إضافة `TRANSLIT_PRIMARY` + `TRANSLIT_VARIANTS` + `transliterateArabic()`. ترقية `buildPlayerSearchQueries` لاستخدام transliterations. ترقية `scoreCandidate` لقبول `extraVariants[]` ومطابقتها. |
| `api/_lib/playerIntelV2Handlers.ts` | `handleFotMobSearch` يولّد transliterations + يمرّرها لـ scoreCandidate. الـ response يحوي `transliterations`, `triedQueries`, `autoPickConfident`. |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | إضافة قسم Smart Presets كبير في tab metrics + Selected Metrics chips view + Advanced details collapsed. |

**لم يُلمس**:
- `fotmobBroadcastBuilder.ts` (dataScope كما هو)
- `PlayerIntelV2Renderer.tsx` (renderer كما هو)
- `playerIntelV2Presets.ts` (presets الثابتة)
- `Editor.tsx` (layout كما هو)

---

## 9. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` (tsc --noEmit) | exit 0 |
| `npm run build` (vite) | exit 0 (6.05s) |
| Vercel Functions | **10 ≤ 12** ✓ |
| Phonetic transliterator (8+ حروف غامضة) | ✓ |
| Query expansion يولّد حتى 12 query | ✓ |
| Multi-variant scoring يقبل extraVariants[] | ✓ |
| `الفاريز` يلتقط Julián Álvarez (بدون alias مسبق) | ✓ منطقياً |
| Smart Presets — 8 cards كبيرة | ✓ |
| Selected metrics chips مع ↑↓× | ✓ |
| Advanced details collapsed by default | ✓ |
| preview يتحدّث فورًا عند تطبيق preset | ✓ |
| لا تلفيق بيانات | ✓ |
| لا API endpoint جديد | ✓ |

---

## 10. ما بقي لاحقًا

- **Roster verification via teamId**: عند معرفة teamId للنادي، يمكن جلب roster (`/_next/data/{buildId}/teams/{id}.json`) واستخراج كل اللاعبين، ثم matching اسم اللاعب ضد القائمة. هذه الطبقة الذكية الأخيرة. مؤجَّلة لمرحلة لاحقة لأنها تحتاج 2 إضافيين network calls.
- **Auto-pick زر في الواجهة**: إذا `autoPickConfident: true`، اعرض "إضافة أفضل نتيجة فورًا" بشكل بارز.
- **Debug panel في dev**: يعرض triedQueries + transliterations + scores لكل candidate.
- **Phonetic for Latin**: تطبيع Latin أيضًا (Lewandowski ↔ Levandovski).
- **AI assistant**: Gemini يفهم intent ويستدعي action تلقائياً.
