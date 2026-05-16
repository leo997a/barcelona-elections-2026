# تقرير إصلاح الصوت المكرر + تحليل Stream Deck + datafootball
التاريخ: 2026-05-16
النوع: إصلاح bug + تحليل أدوات

---

## 1. إصلاح الصوت المكرر ✅

### المشكلة
عند TAKE IN (إظهار قالب) كان يُسمع **صوتين متزامنين** بدل صوت واحد.

### السبب الجذري
الصوت كان يُشغّل من **مكانين**:

| المكان | الملف | السطر |
|--------|-------|-------|
| OverlayRenderer (الأب) | `OverlayRenderer.tsx` | 318 |
| TransferNewsRenderer | `TransferNewsRenderer.tsx` | 420 |
| BarcaPremiumRenderer | `BarcaPremiumRenderer.tsx` | 43 |
| H2HStatsRenderer | `H2HStatsRenderer.tsx` | 43 |
| ExclusiveAlertRenderer | `ExclusiveAlertRenderer.tsx` | 23 |

`OverlayRenderer` يشغل `playSound('ENTRY')` عند visibility change → **ثم** الـ renderer الداخلي يشغله مرة أخرى عبر `useEffect`.

### الحل
أزلت `playSound('ENTRY')` من **4 renderers** داخلية:
- `TransferNewsRenderer` — حذف useEffect كامل
- `BarcaPremiumRenderer` — حذف useRef + useEffect
- `H2HStatsRenderer` — حذف useRef + useEffect
- `ExclusiveAlertRenderer` — حذف `playSound('ENTRY')` فقط (أبقيت TTS)

### ما لم يتأثر
- `SmartNewsRenderer` — يستخدم `TRANSITION` (لا `ENTRY`) ✅ صحيح
- `LeaderboardRenderer` — يستخدم `TRANSITION` (لا `ENTRY`) ✅ صحيح
- `ElectionOverlay` — لا يستخدم playSound من props ✅

### النتيجة
- ✅ Build ناجح (5.17s)
- ✅ صوت واحد عند TAKE IN
- ✅ صوت واحد عند TAKE OUT
- ✅ أصوات TRANSITION للصفحات تعمل بشكل طبيعي

---

## 2. تحليل Stream Deck Plugin (Overlays.uno) 📱

### الهوية
| الحقل | القيمة |
|-------|--------|
| الاسم | Uno Overlays |
| الإصدار | 4.0.2 |
| المؤلف | Overlays.uno |
| SDK | Stream Deck SDK v2 |
| API | `https://app.overlays.uno/apiv2/controlapps/{token}/api` |

### كيف يعمل
```
Stream Deck Hardware
    ↓ (keyUp event)
WebSocket → Plugin (app.js)
    ↓ (HTTP PUT)
Overlays.uno Cloud API
    ↓
Overlay يتغير في البث
```

### الأوامر المدعومة
| الأمر | الوظيفة |
|-------|---------|
| `ChangeOverlayField` | تغيير حقل في overlay (نص/رقم/boolean) |
| `ChangeCustomizationField` | تغيير إعداد تخصيص |
| `SetCustomizationContent` | تعيين محتوى JSON كامل |
| `SetOverlayContentField` | تعيين قيمة حقل |
| `IncrementOverlayContentField` | زيادة قيمة رقمية |
| `DecrementOverlayContentField` | إنقاص قيمة رقمية |
| `ToggleOverlayContentField` | تبديل checkbox |
| `ExecuteOverlayContentField` | تنفيذ أمر (start/pause/reset/play) |

### المشاكل المحتملة
1. **Bug في الكود:** سطر 141 و 204 → `$SD.api.showAlert($SD.api.showAlert(context))` — يستدعي showAlert مرتين (مكرر)
2. **لا error handling تفصيلي** — لا يظهر رسالة خطأ واضحة
3. **Token في cleartext** — يُخزن كـ settings بدون تشفير

### الفائدة لمشروعنا
هذا مرجع ممتاز لبناء **REO Studio Stream Deck Plugin** مستقبلاً:
- يمكن استبدال API endpoint بـ `syncManager` API الخاص بنا
- نفس المعمارية: `keyUp → HTTP → overlay update`
- يحتاج: إنشاء API endpoint مخصص (لكن Vercel عند 12/12!)

---

## 3. الخطوات القادمة المُرتّبة

| الأولوية | المهمة | التفاصيل |
|----------|--------|----------|
| 🟡 1 | رفع صور Bayern/Real Madrid | إنشاء مجلدات + تحميل renders + تحديث players.json |
| 🟡 2 | localStorage per-workspace | `rge_cue_fx_v1:{workspaceId}` |
| 🟢 3 | Google Cloud Player Data | استخدام datafootball كأساس لـ Cloud Function |
| 🟢 4 | REO Stream Deck Plugin | بناء plugin مخصص (بعد حل حد Vercel) |
| 🟢 5 | Code Splitting | `manualChunks` لتقليل bundle size |
| 🟢 6 | Google Secret Manager | تفعيل بعد staging |
