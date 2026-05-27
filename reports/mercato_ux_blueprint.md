# مخطط UX المقترح للإعدادات

**التاريخ**: 2026-05-27
**النطاق**: معمارية إعدادات Editor + Library + Audio panel + Stats picker
**الهدف**: تحويل المنتج من "12 tab + 44 useState" إلى "4 tabs + موديل بيانات نظيف" دون كسر سلوك قائم.

---

## 1. المبدأ الموجِّه

> **معدِّل مرة واحدة، يستهلك في عدة مواقع.**

كل قالب الآن له ~30 حقل. الـ Editor يعرضهم flat في tabs. الـ Library يعرض كل قالب بـ accent + icon. الـ AudioSettingsPanel يعرض حقول الصوت بشكل منفصل. **لا يوجد single source-of-truth للـ schema**.

المخطط الجديد: **schema-driven settings**.

```
templateSchema.ts                          ← single source-of-truth
   ↓
   metadata: { id, name, category, subcategory, audioSceneId }
   data fields: { name, club, value, ... }
   visual options: { theme, scale, position }
   audio: { sound, sfx, voice, scene }
   advanced: { rawJson, debugSlots }
```

كل page (Editor, AudioSettingsPanel, Library) يقرأ من نفس الـ schema. **لا تكرار**.

لكن هذا تغيير كبير — **مؤجَّل لـ Phase B**. الآن نقترح Information Architecture بدون تنفيذ schema-driven.

---

## 2. معمارية الإعدادات المقترحة (4 tabs)

| Tab الحالي | يبقى أم يندمج | Tab الجديد |
|---|---|---|
| fields | يبقى نواة | **المحتوى** (Content) |
| candidates | يندمج في content (ELECTION-only) | **المحتوى** |
| time | يندمج في content (ELECTION-only) | **المحتوى** |
| content (ELECTION) | يندمج في content | **المحتوى** |
| camera | يندمج في visual (ELECTION-only) | **العرض** (Visual) |
| turnout | يندمج في content (ELECTION-only) | **المحتوى** |
| images | يندمج في content | **المحتوى** |
| style | يبقى نواة | **العرض** (Visual) |
| position | يندمج في visual | **العرض** |
| sound | يبقى نواة | **الصوت** (Audio) |
| slots | يندمج في advanced | **متقدم** (Advanced) |
| sponsors | يبقى لـ leaderboard فقط | **المحتوى** (سياقي) |

**النتيجة**: 12 tab → 4 tabs:

1. **المحتوى** — كل البيانات (نصوص، أرقام، صور، JSON arrays)
2. **العرض** — theme, design style, scale, position
3. **الصوت** — `<AudioSettingsPanel>` كاملاً
4. **متقدم** — slots, raw JSON, diagnostics, debug

**الفائدة**: المستخدم يعرف فورًا أين كل شيء. التنقّل أسرع 3×.

**المخاطرة**: لو تم التطبيق دفعة واحدة، الـ tab `candidates` يختفي ويختلط الـ ELECTION fields في "المحتوى". يحتاج تجربة بشرية.

---

## 3. حل سريع لـ Audio Panel (الآن)

**اقتراح غير-كاسر**:

داخل `<AudioSettingsPanel>` الحالي، إعادة ترتيب الأقسام بهذا التسلسل:

```
A. Master Mute & Volume
   ├─ Sound enabled toggle (مع status badge)
   ├─ Master volume slider
   └─ "اختبار IN" + "اختبار OUT" buttons (هنا، مُكتشَفون فورًا)

B. Audio Scene
   ├─ Scene picker (always visible، ليس collapsed)
   ├─ Scene description card (يعرض الـ enterCue/exitCue/updateCue حاليًا)
   ├─ "Test Play" زر بعد كل scene
   └─ "Apply" / "Apply + Voice" zr 

C. SFX (advanced override)
   ├─ Cue overrides (soundInStyle/soundOutStyle dropdowns)
   ├─ SFX enabled toggle
   └─ Preview buttons

D. Voice Cue (collapsed by default if voiceEnabled=false)
   ├─ Voice enabled toggle
   ├─ Library / Direct URL
   ├─ Trigger
   └─ Volume + Duck SFX
```

**الفائدة**: المستخدم يرى الـ scene picker **أولًا**، يجرّب، ثم يعدّل لو أراد. لا "أين يختبئ المشهد؟".

---

## 4. Stats Picker UX (Player Intel V2)

النموذج الحالي: hero/secondary forced split. حد 12+24=36 إحصائية.

**المقترح**: **`selectedStats` array موحَّد** بحقول role:

```ts
interface SelectedStat {
  key: string;           // metric id
  role: 'hero' | 'normal' | 'compact'; // عرض دور (لا يحدد layout)
  order: number;
  visible: boolean;
}
```

UI:
- **Selected Stats Bar** (الموجود الآن) لكن يعرض array واحد + role badge بصري لكل واحد.
- **Smart presets** يكتبون الـ array مع role distribution مناسب (preset "complete_report" يعطي 6 hero + 19 normal + 0 compact).
- **Stats Bank Drawer** قابل للطي (موجود) لكن يدعم drag-to-add.

**الـ layout indicator** الحالي يعمل بشكل جيد. يبقى. الـ choice: Hero Cards / Compact Grid / Matrix / Data Table بحسب total count.

**المخاطرة**: تغيير data model — لو تم بدون migration، overlays محفوظة قد تكسر. الحل: backward compatible — لو `playerIntelSelectedStatsJson` فاضي، fallback للـ hero/secondary القديمين.

---

## 5. Library — Information Architecture الجديد

```
┌──────────────────────────────────────┐
│ [Search]  [Sort: recent | name | live] │
├──────────────────────────────────────┤
│ Sidebar              │ Grid           │
│ ─ Categories (7)     │                │
│ ─ Subcategories (20) │ Templates      │
│ (يظهر فقط لو اخترت    │                │
│  category)           │                │
│                      │                │
└──────────────────────────────────────┘
```

**حذف**: `TYPE_FILTERS` array (24 type). الـ subcategory الحقيقي يستبدلها.

**إضافة**: 
- "Recently used" قسم ذكي يعرض آخر 5 قوالب فُتِحت.
- "Favorites" قسم منفصل.
- Search يبحث في name + description + tags (في metadata الـ templateRegistry).

**Quick Actions**:
- Hover على template card → 3 أزرار: "Add to scene" / "Preview" / "Edit".
- Drag template card → يضيفه لـ overlay list (الآن click-only).

---

## 6. Editor — Top bar يصبح Action bar

الـ top bar الحالي يحوي:
- Toggle visibility
- Chroma toggle
- Output URL button
- Templates count
- TemplateControlBar (X1)

**المقترح**: إضافة Quick Action Drawer قابل للسحب:

```
[Take IN]  [Take OUT]  [Audio: 🔊]  [Test scene]  [Output URL]  [⋯ More]
```

كل button مرئي في 1 click. لا dropdown، لا hidden menu. **سرعة الـ live production هدف رقم 1**.

---

## 7. Diagnostic Strip

في أسفل الـ Editor، شريط رفيع يعرض حالة تنفيذ:

```
● LIVE  ·  Last action: show (12s ago)  ·  Audio: ON  ·  Scene: mercato_private_chat_call  ·  Stream Deck: connected
```

**الفائدة**:
- يعرف المستخدم لماذا "scene تطبيق" لم يُسمَع (Editor preview صامت بالتصميم).
- يعرف Stream Deck متصل أم لا (الآن: لا feedback).
- يعرف آخر مرة تم فيها toggle visibility.

ينفّذ من `getAllDiagnostics()` (موجود في X1). فقط الـ UI panel ناقص.

---

## 8. مبدأ "كيف نتجنّب فوضى الإعدادات مستقبلًا"

1. **كل field جديد يجب أن ينتمي لـ `fieldGroup`** (موجود في constants.ts بعد X3). لا "advanced fallback" تلقائي.
2. **كل scene جديد يجب أن يحدّد كل الـ cues** (`enterCue`, `exitCue`, `updateCue`). الـ helper `sceneToFieldUpdates` يكتبهم كلهم.
3. **كل template جديد يستخدم factory** (createMercatoTemplate نمط لـ Mercato. يحتاج `createTemplate` عام مماثل).
4. **`SOUND_FIELDS` whitelist يجب أن يُحدَّث مع كل audio field جديد**. كقاعدة، لو الـ field يبدأ بـ `sound|voice|sfx|audio`، أُضِف تلقائيًا.
5. **متى تُضاف category جديدة في Library**: فقط لو > 5 قوالب من نفس النوع موجودة. لا تكرار.

هذه القاعدة تنشأ كـ `CONTRIBUTING.md` خفيف لاحقًا.

---

## 9. ما ينطبق الآن مقابل ما يُؤجَّل

**الآن (Phase A)**:
- إعادة ترتيب AudioSettingsPanel (Test buttons قبل Scene picker، إلخ).
- إضافة Diagnostic Strip بسيط.
- حذف TYPE_FILTERS من Library واستبداله بـ subcategory.
- إصلاح BUG-01 (scene apply ناقص).

**Phase B (أسبوع)**:
- 12 tab → 4 tabs في Editor.
- `selectedStats` unified array لـ Player Intel V2.
- Mercato Legacy → MERCATO_UNIFIED migration.

**Phase C (مؤجَّل)**:
- Schema-driven `templateSchema.ts`.
- Recently used + Favorites.
- Drag-to-add في Library.

التفاصيل في `mercato_fix_roadmap.md`.
