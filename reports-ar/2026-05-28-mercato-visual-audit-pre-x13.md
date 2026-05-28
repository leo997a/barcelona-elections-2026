# Mercato Visual Audit — قبل Phase X13

**التاريخ**: 28 مايو 2026
**النطاق**: 10 قوالب Mercato في `components/renderers/MercatoUnifiedRenderer.tsx`

## ملاحظات سريعة لكل قالب

### 1. Agent Call #2 (أولوية قصوى)
- ✗ Avatar = إيموجي 📞 — يبدو mockup
- ✗ صورة اللاعب: لا fallback إذا غير موجودة (مساحة فارغة)
- ✗ Source panel hardcoded: 🔒 + "مصدر مغلق" + 3 stages ثابتة (لا تعكس البيانات)
- ✗ Transcript يفرض `direction: ltr` — يكسر العربي
- ✗ لا مؤشر بصري للـ "call" feel (لا waveform)
- ✓ 3-column layout مناسب 16:9
- ✓ Header bar نظيف

### 2. Deal Radar
- ✗ Radar مجرد decoration — لا blips للمصادر
- ✗ Sources list مسطّح بلا color tiers
- ✗ Cross + diagonal lines مزدحمة
- ✗ Empty state بارد ("أضف المصادر...")
- ✓ SVG radar فكرة قوية

### 3. Club Statement Watch
- ✗ Watermark 📜 — emoji عشوائي يكسر رسميّة البيان
- ✗ Border `2px solid accent` ملون جدًا
- ✗ لا monogram / ختم
- ✗ Layout وسطي يضيع 16:9
- ✓ Typography محترم

### 4. Deadline Hour
- ✗ Stages chevron بدون animation/glow على الـ active
- ✗ Timer كبير لكن منفصل بصريًا
- ✗ لا probability/tension indicator
- ✗ نصوص "0X" بـ font-mono صغيرة
- ✓ تدرج المراحل واضح

### 5. Source Confidence Board
- ✗ Empty state بكل column = "—" يبدو ميت
- ✗ Source items بدون أيقونة/category
- ✗ لا "supporting vs contradicting"
- ✓ Tier colors A/B/C صحيحة

### 6. Hidden Clause Reveal
- ✗ Watermark 📄 + 💼 emoji-heavy
- ✗ لا "redacted" feel للنص
- ✗ القيمة كصندوق منفصل بدون animation
- ✓ Layout مركَّز نظيف

### 7. Medical Tracker
- ✗ Emojis ✈️🏥✍️📢 — childish لقالب طبي
- ✗ Grayscale filter على inactive يعتمد على OS rendering
- ✗ لا stepper connector بين المراحل
- ✗ Active stage بدون pulse
- ✓ Grid 4-cols واضح

### 8. Hijack Alert
- ✗ ⚡ emoji كـ VS divider
- ✗ Risk meter موجود مرتين (header + hijack box)
- ✗ Original/Hijack boxes بسيطة جدًا
- ✗ لا badge للاعب في الوسط
- ✓ Color-code (red للخطر) منطقي

### 9. Personal Terms Desk
- ✗ 3 FieldCards متطابقة → بلا hierarchy
- ✗ Header pills + subtitle كلاهما "مفاوضات" (تكرار)
- ✗ Disclaimer dashed-border صغير
- ✗ لا completion %
- ✓ بسيط ولكن مسطّح

### 10. Here We Go Build-Up
- ✗ Timeline entries كلها شبيهة
- ✗ لا color-code per stage type
- ✗ Vertical line ضعيف
- ✗ لا current/active indicator
- ✓ Vertical timeline structure نفسها صحيحة

## مشاكل عامة (تنطبق على معظم القوالب)

1. **Emoji-driven visuals**: 📞 📜 📄 💼 ✈️ 🏥 ✍️ 📢 ⚡ — يعطي إحساس prototype وليس broadcast.
2. **Empty states ضعيفة**: نص رمادي خافت بدون illustration.
3. **No avatar fallback**: قوالب تطلب image، إذا غير موجودة تترك مساحة فارغة.
4. **Direction handling**: العربي/اللاتيني مختلطان أحيانًا بدون auto-detect.
5. **Hardcoded panels**: Agent Call right panel ثابت لا يقرأ البيانات الفعلية.

## خطة Polish (ستطبَّق في X13)

### Helpers جديدة
- `getInitials(name)` — fallback للصور
- `isArabicText(s)` — لتوجيه text direction تلقائيًا
- `formatCurrency(s)` — معالجة قيم مالية بشكل لائق
- SVG icon components (Phone, Doc, Hospital, Signature, Megaphone, Plane, Warning) — تستبدل الإيموجي

### تعديلات per-variant
1. **AgentCall**: initials avatar + waveform bars + auto-direction transcript + `callStatus`-driven source panel + dynamic stages from `dealStage` field
2. **DealRadar**: blips حقيقية بناءً على sources angles + tier colors
3. **ClubStatement**: حذف 📜، إضافة monogram + stamp + 16:9 layout (body + sidebar)
4. **DeadlineHour**: pulse glow على active stage + standalone timer card مع red glow
5. **SourceConfidence**: empty state أنيق + source-type icons + supporting/contradicting hint
6. **ClauseReveal**: حذف 📄💼 + redacted-style typography + بطاقة قيمة محسّنة
7. **MedicalTracker**: SVG icons بدلاً من emoji + stepper connector line + pulse على active
8. **HijackAlert**: حذف ⚡، إضافة risk gauge في الوسط + activity badges
9. **PersonalTerms**: hero salary card + completion bar + disclaimer ribbon
10. **HereWeGoBuildUp**: color-coded entries حسب stage keyword + active pulse + thicker timeline

### قواعد بقاء آمن (non-breaking)
- لا تغيير في `mercatoVariant` keys.
- لا تغيير في field IDs.
- لا تعديل على `MercatoUnifiedRenderer` props أو signature.
- Audio path لم يُلمس.
- Helper التحويل `evaluateTransitionAttempt` يبقى كما هو.
