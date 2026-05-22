# Player Intel V2 — State Architecture Audit
**التاريخ:** 2026-05-22  
**المرحلة:** STABILIZE-X4 — Pre-Implementation Audit

---

## 1. State الحالي للاعب النشط

### المشكلة الرئيسية: **تداخل وعدم وضوح**

#### أين يتم حفظ اللاعب النشط؟
- **Player A:** `samplePlayer` field (string slug)
- **Player B:** `samplePlayerB` field (string slug)
- **Mode:** `mode` field ('single' | 'compare')

#### المشاكل:
1. **لا يوجد state واضح للاعب "النشط"** — فقط slug في field
2. **search results تختلط مع saved players** في نفس dropdown
3. **عند البحث عن لاعب جديد:**
   - `searchResults` state محلي في EditorPanel
   - `fotmobMatches` state منفصل
   - لا يوجد فصل واضح بين "candidates" و "selected player"
4. **اختيار لاعب يحدث بطرق متعددة:**
   - من dropdown (registry)
   - من search results (local)
   - من FotMob matches (API)
   - من dynamic profiles (localStorage)

---

## 2. أين يتم حفظ اللاعبين المضافين؟

### Static Registry:
- **الموقع:** `/public/player-intel-v2-samples/index.json`
- **النوع:** Static JSON file
- **المحتوى:** `{ players: RegistryEntry[] }`

### Dynamic Profiles (FotMob on-demand):
- **الموقع:** `localStorage` key: `'reo:player-intel-v2:dynamic-profiles:v1'`
- **الشكل:**
```typescript
{
  schema: 1,
  entries: {
    [slug]: {
      id: string,
      name: string,
      club: string,
      season: string,
      position: string,
      source: 'fotmob',
      builtAt: number,
      profile: PlayerIntelMasterFull
    }
  }
}
```

### Combined Registry:
- **الموقع:** `combinedRegistry` useMemo في EditorPanel
- **المنطق:** Dynamic first, then static (no duplicates)
- **المشكلة:** يُستخدم لملء dropdown، لكن لا يفصل بين "library" و "search results"

---

## 3. أين يتم حفظ نتائج البحث؟

### Local Search Results:
- **State:** `searchResults` في EditorPanel
- **النوع:** `Array<ResolverEntry & { score: number }>`
- **المشكلة:** يختلط مع registry في UI

### FotMob Search Results:
- **State:** `fotmobMatches` في EditorPanel
- **النوع:** `Array<{ fotmobId, name, club, confidence, clubMatch }>`
- **المشكلة:** منفصل تمامًا عن local search

### Search Status:
- **Local:** `searchStatus` state
- **FotMob:** `fotmobStatus` state
- **المشكلة:** نظامان منفصلان للبحث بدون تنسيق

---

## 4. أين يتم اختيار اللاعب داخل dropdown؟

### الوضع الحالي:
- **لا يوجد dropdown واحد واضح!**
- Registry يُستخدم لتحديث field options في Editor.tsx
- EditorPanel يعرض search results كـ buttons منفصلة
- FotMob matches تُعرض كـ list منفصلة

### المشكلة:
- **لا يوجد "active player selector" واضح**
- **لا يوجد فصل بين:**
  - Library (saved players)
  - Search candidates
  - Active player A/B

---

## 5. أين يتم اختيار player A/B في compare mode؟

### الوضع الحالي:
- `mode` field: 'single' | 'compare'
- `samplePlayer` = Player A
- `samplePlayerB` = Player B

### المشكلة:
- **لا يوجد UI واضح لاختيار A vs B**
- عند البحث، لا يوجد زر "اختر كـ Player B"
- compare mode يتطلب تغيير mode ثم تغيير playerB يدويًا

---

## 6. أين يتم حفظ image override؟

### الموقع:
- **localStorage key:** `'reo:player-intel-v2:image-overrides:v1'`
- **الشكل:**
```typescript
{
  schema: 1,
  entries: {
    [playerSlug]: {
      mode: 'auto' | 'direct_url' | 'local_upload' | 'hidden',
      directUrl?: string,
      localDataUrl?: string,
      objectFit?: 'contain' | 'cover',
      position?: 'center' | 'top' | 'bottom',
      opacity?: number,
      updatedAt: number
    }
  }
}
```

### المنطق الحالي:
- **مفتاح:** player slug (e.g., 'lamine-yamal')
- **مستقل لكل لاعب** ✓ (جيد)
- **Compare mode:** كل لاعب له override مستقل ✓ (جيد)

---

## 7. لماذا local upload لا يتغلب على cache image؟

### التحليل:

#### في `resolveImageUrl()`:
```typescript
export function resolveImageUrl(
  override: ImageOverride | null,
  fallbackUrl: string | null,
): string | null {
  if (!override) return fallbackUrl;
  if (override.mode === 'hidden') return null;
  if (override.mode === 'local_upload') {
    return override.localDataUrl || null; // ✓ صحيح
  }
  if (override.mode === 'direct_url') {
    return override.directUrl || null; // ✓ صحيح
  }
  return fallbackUrl;
}
```

**المنطق صحيح نظريًا!** ✓

#### المشكلة المحتملة:
1. **في Renderer:**
   - `imageVersion` state يتحدث عند تغيير override ✓
   - `useMemo` يعيد حساب override عند تغيير imageVersion ✓
   - **لكن:** قد يكون هناك caching في browser للصورة القديمة

2. **في ImageEditor:**
   - `apply()` يحفظ override ✓
   - `onChange?.()` يُستدعى ✓
   - **لكن:** لا يوجد force refresh للـ Renderer

3. **الاحتمال الأكبر:**
   - **Browser image cache** يحتفظ بالصورة القديمة
   - **لا يوجد cache-busting** (e.g., `?v=${updatedAt}`)
   - **img key** لا يتغير عند تغيير override

---

## 8. أين يتم حفظ activeScope؟

### الوضع الحالي:
**لا يوجد `activeScope` field!** ❌

#### Scope يأتي من:
1. **Data source:** `dataScope` object في broadcast JSON
2. **لا يوجد اختيار scope من UI**
3. **لا يوجد scope selector في EditorPanel**

### المشكلة:
- **Scope ثابت حسب البيانات المحملة**
- **لا يمكن تبديل scope (season vs league vs all competitions)**
- **لا يوجد source of truth لـ activeScope**

---

## 9. أين يتم حفظ selectedStats؟

### الوضع الحالي:
- **Hero metrics:** `playerIntelHeroMetricsJson` field (JSON string array)
- **Secondary metrics:** `playerIntelSecondaryMetricsJson` field (JSON string array)
- **Hidden metrics:** `playerIntelHiddenMetricsJson` field (JSON string array)

### الشكل:
```typescript
// مجرد array من keys
["goals", "assists", "xG", "shots_on_target"]
```

### المشاكل:
1. **لا يوجد `selectedStats` unified array**
2. **مقسّم إلى hero/secondary/hidden بشكل صارم**
3. **لا يوجد metadata لكل stat:**
   - order
   - role (hero/normal/compact)
   - visible
   - scopeId
   - source
4. **لا يوجد ربط بين stat و scope**

---

## 10. هل selectedStats مرتبطة باللاعب أم بالقالب أم عامة؟

### الوضع الحالي:
**مرتبطة بالقالب (card) — عامة لكل اللاعبين** ✓

#### المنطق:
- `cardType` يحدد preset
- Preset يحدد hero/secondary keys
- نفس الـ keys تُطبق على أي لاعب

### المشكلة:
- **لا يوجد per-player stat selection**
- **compare mode يستخدم نفس stats لـ A و B** (منطقي)
- **لكن:** لا يوجد fallback إذا stat غير متاح للاعب معين

---

## 11. ملخص المشاكل الحرجة

### 🔴 Critical Issues:

1. **State Mixing:**
   - Search results تختلط مع saved players
   - لا يوجد فصل واضح بين candidates و active player

2. **Image Override Priority:**
   - المنطق صحيح، لكن browser caching يمنع التحديث الفوري
   - لا يوجد cache-busting mechanism

3. **Scope Management:**
   - لا يوجد activeScope field
   - لا يوجد scope selector
   - Scope ثابت حسب البيانات

4. **Metric Selection:**
   - مقسّم إلى hero/secondary بشكل صارم
   - لا يوجد unified selectedStats array
   - لا يوجد metadata (order, role, visible)

5. **UX Complexity:**
   - تبويب "اختيار الإحصائيات" معقد جدًا
   - لا يوجد smart presets واضحة
   - metric bank مفتوح دائمًا (48 metrics)

---

## 12. الحل المقترح: State Model الجديد

```typescript
type PlayerIntelV2State = {
  // Mode
  mode: 'single' | 'compare';

  // Search (temporary, not saved)
  search: {
    playerQuery: string;
    clubQuery: string;
    resolvedClub?: {
      teamId: number | null;
      name: string;
      confidence: number;
    };
    candidates: Array<{
      id: string;
      name: string;
      club: string;
      source: 'local' | 'fotmob';
      confidence: number;
    }>;
    isSearching: boolean;
    lastSearchDebug?: unknown;
  };

  // Library (saved players)
  library: {
    profiles: Array<{
      id: string;
      name: string;
      club: string;
      season: string;
      position: string;
      source: 'static' | 'fotmob';
      addedAt: number;
    }>;
  };

  // Active players
  active: {
    playerAId: string | null;
    playerBId: string | null;
  };

  // Card configuration
  card: {
    cardType: string; // preset ID or 'custom'
    visualVariant: string;
    colorTheme: string;
    activeScopeId: string; // NEW!
    selectedStats: Array<{
      key: string;
      labelAr: string;
      labelEn: string;
      order: number;
      role: 'hero' | 'normal' | 'compact';
      visible: boolean;
      scopeId: string;
    }>;
    statLayoutMode: 'auto' | 'hero_cards' | 'compact_grid' | 'matrix' | 'data_table' | 'comparison_rows';
  };

  // Image overrides (per player)
  imageOverrides: {
    [profileId: string]: {
      mode: 'auto' | 'direct_url' | 'local_upload' | 'hidden';
      directUrl?: string;
      localDataUrl?: string;
      objectFit?: 'contain' | 'cover';
      position?: 'center' | 'top' | 'bottom';
      updatedAt: number;
    };
  };
};
```

---

## 13. الخطوات التالية

### Phase 1: State Separation
1. ✅ Audit complete
2. ⏳ فصل search candidates عن library
3. ⏳ إضافة active player state واضح
4. ⏳ إضافة activeScopeId field

### Phase 2: Image Override Fix
1. ⏳ إضافة cache-busting (updatedAt في URL)
2. ⏳ إضافة img key يتغير مع override
3. ⏳ اختبار local upload vs cache

### Phase 3: Scope Management
1. ⏳ إضافة scope selector
2. ⏳ تحديد scopes المتاحة من البيانات
3. ⏳ ربط selectedStats بـ activeScope

### Phase 4: Metric Selection UX
1. ⏳ إضافة smart presets (كبيرة وواضحة)
2. ⏳ إخفاء metric bank (فتح عند الطلب)
3. ⏳ إضافة unified selectedStats array
4. ⏳ إلغاء الاعتماد الإجباري على hero/secondary

### Phase 5: Renderer Layouts
1. ⏳ تحسين hero_cards (1-6 stats)
2. ⏳ تحسين compact_grid (7-12 stats)
3. ⏳ تحسين matrix (13-20 stats)
4. ⏳ تحسين data_table (21-30 stats)
5. ⏳ تحسين comparison_rows (compare mode)

---

## 14. Functions Count Check

**الوضع الحالي:** يجب التحقق من عدد functions قبل البدء

```bash
# سيتم التحقق بعد الـ audit
```

---

**نهاية Audit — جاهز للتنفيذ**
