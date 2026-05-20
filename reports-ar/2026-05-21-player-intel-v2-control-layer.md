# Phase X.10 — Player Intel V2: Control Layer + Real Broadcast Variants

تاريخ: 2026-05-21  
الفرع: main

---

## 1. ما الذي كان ناقصًا

| المشكلة | الحالة قبل |
| --- | --- |
| اختيار الإحصائيات | عدد فقط (4/5/6) — بدون تحكم بأسماء |
| ترتيب الإحصائيات | غير ممكن |
| إخفاء metric | غير ممكن |
| تنوع التصاميم | كان لون فقط (3 themes) |
| المقارنة (compare) | غير مكتملة، Player B لم يكن مرئيًا |
| لاعب واحد بدلاً من اثنين | كان دائمًا يظهر VS |
| المساعد الذكي | لم يكن مفيدًا فعلاً |
| زر "تحديث البطاقة" | غير موجود |

---

## 2. ما تم بناؤه

### 2.1 Editor Panel جديد مستقل

ملف: `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx`  
يظهر فقط عند `OverlayType.PLAYER_INTEL_V2` (لا يلمس Player Stats Lab القديم).

4 تبويبات:
- **أساسي**: اختيار الوضع (single/compare)، اللاعب الأول، اللاعب الثاني (في compare)، Preset cards.
- **اختيار الإحصائيات**: بحث + 9 تصنيفات + 3 zones (Hero/Secondary/Hidden) مع أزرار ↑↓ ونقل وحذف.
- **التصاميم**: 5 visual variants + 3 themes ألوان.
- **المساعد**: textarea + 4 أمثلة جاهزة.

### 2.2 Metric Picker حقيقي

- `playerIntelHeroMetricsJson` (max 5)
- `playerIntelSecondaryMetricsJson` (max 8)
- `playerIntelHiddenMetricsJson` (للاحتفاظ بدون عرض)

التصنيفات:
- هجومية، صناعة لعب، تمرير، دفاع، حيازة، دقائق ومشاركات، انضباط، تقييم وفورمة، سوق وانتقالات.

### 2.3 Presets Smart

ملف: `components/player-intel-v2/playerIntelV2Presets.ts`

8 presets، كل واحد يملأ Hero و Secondary بإحصائيات مناسبة:
- بطاقة هجومية: goals, assists, xg, shots + shots_on_target, rating, minutes, matches
- صانع لعب: assists, xa, key_passes, chances_created + accurate_passes, progressive_passes, crosses, rating
- جناح: goals, assists, crosses, progressive_carries + sca, touches, dribbles, rating
- مدافع: tackles, interceptions, blocks, aerial_duels_won + tackles_won, clearances, rating, matches
- تقرير الفورمة، تقرير السوق، تقرير الموسم، تقرير كامل

بعد تطبيق preset، المستخدم يستطيع تعديل كل metric يدويًا.

### 2.4 5 Visual Variants حقيقية

ملف: `components/renderers/PlayerIntelV2Renderer.tsx` (أُعيد كتابته بالكامل)

| Variant | Layout | الاستخدام |
| --- | --- | --- |
| **Premium Broadcast Card** | صورة 30% يمين + Hero grid + Secondary row | بث عام (الافتراضي) |
| **Tactical Data Board** | Sidebar 20% + 4×3 grid مكثف | تحليل تكتيكي |
| **Magazine Player Profile** | صورة 42% كبيرة + 4 أرقام عملاقة | مجلة/بوست |
| **Compact TV Overlay** | شريط أفقي 110px في الأسفل | overlay أثناء البث المباشر |
| **Head-to-Head Duel** | لاعب\|VS\|لاعب — تلقائي في compare mode | مقارنة مباشرة |

كل variant مختلف **في الـ layout الفعلي** — ليس مجرد لون.

### 2.5 Compare Mode حقيقي

- في `single` mode: لا يظهر VS، لا يظهر Player B، حقول compare مخفية في Editor.
- في `compare` mode: تلقائيًا يظهر `H2HDuelVariant`:
  - لاعب A على اليسار مع صورة وaسم
  - لاعب B على اليمين مع صورة واسم
  - في الوسط: VS كبير + 6 أزواج metrics
  - **اللاعب الفائز في كل metric** يُلوَّن باللون accent مع glow
  - إذا metric غير موجود لـ B → يعرض `—` بدون كسر

### 2.6 Refresh Button موحد

زر "تحديث البطاقة" أعلى لوحة Player Intel V2 يعرض toast:
> ✓ تم تحديث البطاقة — 4 رئيسية و 6 ثانوية

ليس "Operation completed successfully".

### 2.7 المساعد الذكي

أمثلة عاملة فعلاً:
- "بطاقة هجومية لليفاندوفسكي" → يختار Lewandowski + attacker preset.
- "تقرير كامل لكول بالمر" → يختار Cole Palmer + complete preset.
- "مقارنة بين ليفاندوفسكي ويامال" → يفعّل compare mode + يختار اللاعبين.
- "بطاقة صانع لعب ليامال" → يختار Yamal + playmaker preset.

تطابق العربية والإنجليزية:
- مقارنة / vs / ضد / بين → compare mode
- هجوم / attacker → attacker_card
- صانع / playmaker → playmaker_card
- جناح / winger، مدافع / defender، فورمة / form، سوق / market، موسم / season، كامل / complete

---

## 3. تعريب كامل

كل العناصر بالعربي:
- اختيار اللاعب ✓
- نوع البطاقة ✓
- الإحصائيات الرئيسية / الثانوية / المخفية ✓
- النمط البصري ✓
- نمط الألوان ✓
- تحديث البطاقة ✓
- لاعب واحد / مقارنة لاعبين ✓
- اللاعب الأول / اللاعب الثاني ✓
- ابحث عن إحصائية ✓
- إخفاء / نقل للرئيسية / نقل للثانوية ✓

أسماء المفاتيح الداخلية تبقى بالإنجليزية في الكود.

---

## 4. حماية النظام القديم

| الجانب | الحالة |
| --- | --- |
| Player Stats Lab | لم يُلمس |
| PlayerStatsRenderer.tsx | لم يُلمس |
| player-stats-bridge | لم يُلمس |
| /api/player-stats | لم يُلمس |
| FBref cache | لم يُلمس |
| FotMob provider | لم يُلمس |
| VPS | لم يُلمس |
| نظام الترخيص | لم يُلمس |
| Preview Lab (X.7) | لم يُلمس — يبقى يعمل |
| القوالب الأخرى | لم تُلمس |

التعديلات الوحيدة على ملفات موجودة:
- `pages/Editor.tsx`: إضافة 5 أسطر لاستدعاء `PlayerIntelV2EditorPanel`
- `constants.ts`: تحديث fields template (هذا قالب جديد، ليس قديم)

---

## 5. الملفات الجديدة

| الملف | الوصف |
| --- | --- |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | Editor panel كامل (~530 سطر) |
| `components/player-intel-v2/playerIntelV2Presets.ts` | 8 presets + 9 categories |
| `components/renderers/PlayerIntelV2Renderer.tsx` | أُعيد كتابته بـ 5 variants (~600 سطر) |

---

## 6. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (6.02s) |
| لا تعارض types | ✅ |
| Player Intel V2 Editor Panel يظهر | ✅ |
| metric picker يعمل | ✅ |
| presets تطبّق hero/secondary | ✅ |
| 5 variants مختلفة فعلاً في layout | ✅ |
| compare mode يعرض VS | ✅ |
| single mode لا يعرض VS | ✅ |

---

## 7. ما بقي للمرحلة التالية (X.11 محتمل)

1. **AI integration حقيقي للمساعد** عبر geminiService (الآن regex بسيط).
2. **Drag & Drop** للترتيب بدلاً من ↑↓.
3. **مقارنة 3 لاعبين** (triple H2H).
4. **Live updates** من VPS (إذا قررنا).
5. **Animation entry/exit**.
6. **Sound cues** عند الظهور.
7. **مكتبة لاعبين أوسع** (Pedri, Gavi, Raphinha, ...).
