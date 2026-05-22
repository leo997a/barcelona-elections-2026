# Phase UI-X3 — إصلاح تجربة التحرير لـ Player Intel V2

تاريخ: 2026-05-22  
الفرع: main

---

## 1. سبب المشكلة في UI-X2

في UI-X2 وضعنا الـ Bottom Dock في center area لكن:

- **حجم Preview**: كان يستخدم `aspect-video` + `max-w-[1920px]` — أي القالب يُرسم بحجمه الحقيقي الكامل ويفيض من المنطقة المتاحة.
- **لا scaling في Editor**: العرض المباشر (1920×1080) كان نفس عرض المعاينة → القالب يُقطع عند فتح الـ dock.
- **Dock height ثابت**: `max-h-[36vh]` بدون آلية سحب فعلية.
- **Metric Picker مكسور**:
  - `cat.keys.filter((k) => availableMetricKeys.includes(k) || true)` → الـ `|| true` يجعل الفلتر بلا معنى، فيظهر كل metrics في كل الفئات.
  - لا option "الكل".
  - الـ rows طويلة وقبيحة (مجرد أزرار صغيرة).
- **لا fit controls**: لا خيار للمستخدم لتغيير وضع العرض.

---

## 2. كيف تم فصل Editor preview scaling عن live output

### 2.1 PlayerIntelV2EditorFrame (جديد)

ملف: `components/player-intel-v2/PlayerIntelV2EditorFrame.tsx`

```typescript
// canvas منطقي 1920×1080 ثابت
<div style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}>
  <OverlayRenderer ... />
</div>
```

- `ResizeObserver` يحسب الـ scale تلقائيًا عند تغيير حجم الحاوية.
- `fitMode='contain'` (افتراضي): يُلائم العرض والارتفاع مع 4% margin.
- `fitMode='width'`: يستخدم العرض كاملاً.
- `fitMode='actual'`: 100% (للعرض الفعلي).
- مؤشّر سفلي يعرض النسبة الحالية مثل `42%`.

### 2.2 العرض الحقيقي لم يتأثر

- `OverlayRenderer` و `PlayerIntelV2Renderer` لم يُلمسا.
- البث على `#/output/...` يستمر بـ 1920×1080 الحقيقي.
- الـ scale مطبَّق فقط في حاوية Editor.

### 2.3 الاشتراط في Editor.tsx

```typescript
{draftOverlay.type === OverlayType.PLAYER_INTEL_V2 ? (
  <PlayerIntelV2EditorFrame fitMode={piPreviewFit}>
    <OverlayRenderer ... />
  </PlayerIntelV2EditorFrame>
) : (
  /* السلوك القديم لباقي القوالب */
)}
```

أي قالب آخر (ScoreBoard, MatchStats, PlayerStats, ...) **يستخدم الكود القديم بدون تغيير**.

---

## 3. كيف يعمل Dock Resizer

### 3.1 PlayerIntelV2DockResizer (جديد)

ملف: `components/player-intel-v2/PlayerIntelV2DockResizer.tsx`

- شريط 8px أعلى الـ dock، cursor `ns-resize`.
- `onMouseDown` يبدأ السحب، `onMouseMove` يحسب `dy` و يضبط الارتفاع.
- Clamping: `min=220px, max=700px`.
- 3 أزرار سريعة على اليمين:
  - ⌄ تصغير (-80px)
  - ⌃ توسيع (+80px)
  - ⏷ إعادة ضبط (320px default)

### 3.2 State مدار في Editor.tsx

```typescript
const [piDockHeight, setPiDockHeight] = useState<number>(...);
const [piDockCollapsed, setPiDockCollapsed] = useState<boolean>(...);
const [piPreviewFit, setPiPreviewFit] = useState<'contain' | 'width' | 'actual'>(...);
```

كل state محفوظ في localStorage:
- `reo:pi-v2:dock-height-px:v1` → ارتفاع الـ dock بالـ px.
- `reo:player-intel-v2:dock-collapsed:v2` → هل الـ dock مطوي.
- `reo:pi-v2:preview-fit:v1` → contain / width / actual.

### 3.3 تكامل مع Bottom Dock

`PlayerIntelV2BottomDock` أصبح **controlled component** يستقبل `collapsed` + `onToggleCollapsed` من Editor.tsx. لم يعد يدير حالة الـ collapse داخليًا (تجنّب double-state).

---

## 4. كيف تم إصلاح Category Chips

### 4.1 المشكلة

```typescript
let keys = cat.keys.filter((k) => availableMetricKeys.includes(k) || true);
//                                                                  ^^^^^^^^
//                                                                  bug — يجعل الفلتر "كل شيء"
```

### 4.2 الحل

```typescript
const filteredMetrics = useMemo(() => {
  const fromCategories = new Set<string>();
  Object.values(METRIC_CATEGORIES).forEach((cat) => cat.keys.forEach((k) => fromCategories.add(k)));
  const fullPool = new Set<string>([...fromCategories, ...availableMetricKeys]);

  let pool: string[];
  if (activeCategory === 'all') {
    pool = Array.from(fullPool);
  } else {
    const cat = METRIC_CATEGORIES[activeCategory];
    pool = cat ? cat.keys.slice() : [];
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    pool = pool.filter((k) => {
      const ar = getMetricAr(k) || '';
      return k.toLowerCase().includes(q) || ar.toLowerCase().includes(q) || ar.includes(search.trim());
    });
  }
  return pool;
}, [activeCategory, availableMetricKeys, search]);
```

### 4.3 إضافة "الكل"

ريبون الفئات الجديد:
```
[الكل] [هجومية] [صناعة لعب] [تمرير] [استحواذ] [دفاع] [انضباط] [حراسة] [فورمة] [سوق وانتقالات]
```

كل فئة تعرض metrics الخاصة بها فقط. `الكل` يجمع كل الفئات + ما اكتُشف من broadcastA.

### 4.4 البحث يعمل فوق الفلتر

الـ search يفلتر النتائج داخل الفئة المختارة، عربيًا وإنجليزيًا.

---

## 5. كيف أصبح Metric Picker عصريًا

### 5.1 قبل (rows صغيرة):

```
[goals]                   [رئيسية] [ثانوية]
[assists]                 [رئيسية] [ثانوية]
...
```

### 5.2 بعد (cards modern):

```
┌─────────────────────────────────┐
│  الأهداف              [16] FotMob  │
│  goals               top 10%   │
│  [✓ رئيسية] [ثانوية] [×]        │
└─────────────────────────────────┘
```

كل card يعرض:
- **الاسم العربي** (font-bold, 12px).
- **الاسم الإنجليزي** (font-mono, 9px, truncated).
- **القيمة** (badge أبيض على slate خلفية).
- **Source badge**:
  - 🟢 fotmob (emerald)
  - 🔵 fbref (blue)
  - ⚪ other (slate)
- **percentile rank**: "top 10%" badge أصفر إذا متوفر.
- **Actions**:
  - رئيسية / ✓ رئيسية (cyan)
  - ثانوية / ✓ ثانوية (blue)
  - × إزالة (red)

### 5.3 Empty state أنيق

```
"لا توجد إحصائيات متاحة في هذه الفئة من المصدر الحالي."
```

بدلاً من "لا توجد نتائج" المقتضب.

### 5.4 Grid مرن

```
grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto
```

عمود واحد على الموبايل، عمودان على الشاشات الأوسع.

---

## 6. كيف تم منع Preview من الانقطاع

### 6.1 قبل
```
flex-1 overflow-hidden flex items-center justify-center
└── max-w-[1920px] aspect-video
```

عند فتح الـ dock يأخذ ارتفاع 36vh، فالـ aspect-video يتقلّص في العرض لكنه **لا يُقصّ في الارتفاع** فيقطع dock أجزاءه.

### 6.2 بعد

`PlayerIntelV2EditorFrame` يحسب `scale` ديناميكيًا:
```
contain mode: scale = min(safeW / 1920, safeH / 1080)
```

نتيجة: عند فتح dock بارتفاع 700px، الـ container يتقلص في الارتفاع، فالـ scale يقل تلقائيًا، فالقالب **يبقى ظاهرًا بالكامل** لكن أصغر.

### 6.3 fit modes

- **contain** (default): القالب كامل دائمًا، حتى لو صغير جدًا.
- **width**: العرض كامل، قد يُقصّ من الأسفل.
- **actual**: 100%، للمستخدم الذي يريد الحجم الحقيقي.

ال controls تظهر في الزاوية العلوية اليسرى من preview area.

---

## 7. كيف تم التعامل مع Image Fallback

`PortraitImage` (موجود من UI-X2) — silhouette SVG عند فشل تحميل صورة FotMob:

```svg
<circle cx="50" cy="35" r="18" fill="..." />
<path d="M20 110 Q20 75 50 75 Q80 75 80 110 L80 140 L20 140 Z" />
```

مع radial gradient accent خلفه. لا spinner، لا صندوق فارغ.

تم حفظ هذا السلوك دون تغيير.

---

## 8. الحفاظ على التوافق

| الجانب | الحالة |
| --- | --- |
| `PlayerIntelV2Renderer` | لم يُلمس |
| Live broadcast output | بحجم 1920×1080 كاملاً |
| `OverlayRenderer` | لم يُلمس |
| Player Stats Lab | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| FBref cache | لم يُلمس |
| schemaVersion | بدون تغيير |
| profiles في localStorage | تعمل |
| compare mode | يعمل |
| 5 visual variants | تعمل |
| REO Match | يعمل |
| Player Intel V2 search/build/club-resolve | تعمل |
| نظام الترخيص | لم يُلمس |
| التوكنات | لم تُلمس |
| **Vercel Functions** | **10 ≤ 12** ✓ |

---

## 9. الملفات الأساسية التي تغيّرت

| الملف | الحالة |
| --- | --- |
| `pages/Editor.tsx` | إضافة state للـ dock height/collapsed/fit + استبدال preview بـ EditorFrame + إضافة Resizer + fit controls |
| `components/player-intel-v2/PlayerIntelV2EditorFrame.tsx` | جديد — scaling responsive للقالب 1920×1080 |
| `components/player-intel-v2/PlayerIntelV2DockResizer.tsx` | جديد — drag handle مع 3 أزرار سريعة |
| `components/player-intel-v2/PlayerIntelV2BottomDock.tsx` | إعادة كتابة controlled (collapsed + onToggleCollapsed props) |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | إصلاح `filteredMetrics` + إضافة "الكل" + metric cards modern + metricMeta |

---

## 10. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (5.64s) |
| Vercel Functions | **10 ≤ 12** ✓ |
| Preview كامل عند فتح dock | ✓ (scale يتأقلم) |
| Dock height قابل للسحب | ✓ (220px–700px) |
| Dock height محفوظ في localStorage | ✓ |
| Fit controls (contain/width/actual) | ✓ |
| Category "الكل" تعمل | ✓ |
| Category "تمرير" يعرض metrics التمرير فقط | ✓ |
| Category "دفاع" يعرض metrics الدفاع فقط | ✓ |
| Category "هجومية" يعرض metrics الهجوم فقط | ✓ |
| Search على "أهداف" يجد goals | ✓ |
| Metric cards بـ source/rank badges | ✓ |
| Empty state أنيق | ✓ |
| live output 1920×1080 لم يتأثر | ✓ |
| Image silhouette fallback | ✓ |

---

## 11. ما بقي لاحقًا

- **Drag-to-reorder** للـ selected metrics بدلاً من ↑↓ (يحتاج dnd-kit).
- **Source filter chips** (FotMob فقط / FBref فقط / Recent فقط).
- **Scope filter chips** (LaLiga / Recent / All / Unknown).
- **Multi-select** لإضافة عدة metrics دفعة واحدة.
- **Visual polish** أعمق للـ presets الخمسة (تحسينات بصرية).
- **Drag-to-resize** أيضًا للحدود الجانبية بين preview و sidebar.

كل هذه تحسينات بدون كسر أساسيات. التركيز كان: preview كامل + dock resizer + metric picker يعمل فعلاً + cards modern.

---

## 12. التحذيرات الباقية

- `chunk size > 500 kB` من Vite — warning غير حرج لا يمنع Vercel deploy.
- لا تحذيرات أخرى.
