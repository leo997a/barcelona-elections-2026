# تقرير تثبيت الإنتاج — FX + الصور + خطة Secret Manager
التاريخ: 2026-05-16
النوع: تثبيت إنتاج + ربط صوتي + تدقيق أمني

---

## المرحلة 1: اختبار الإنتاج الفعلي ✅

### /api/player-stats
```json
{
  "ok": true,
  "bridgeConfigured": true,
  "auth": {
    "required": true,
    "provided": true,
    "valid": true
  },
  "source": "reo-vps-player-stats-provider-router"
}
```
**النتيجة:** ✅ يعمل — `auth.valid=true`

### /Settings
- ✅ يعمل بدون 404
- ✅ يظهر فقط لـ OWNER و ADMIN_ASSISTANT (مخفي من Sidebar لـ SUBSCRIBER/VIEWER)
- ✅ لا يحتوي Audio Controls (تم نقلها إلى BroadcastControl)
- ✅ Admin Secrets Vault يتطلب تسجيل دخول PASSCODE

### /BroadcastControl
- ✅ يعمل بدون 404
- ✅ OWNER و ADMIN_ASSISTANT يستطيعان تعديل الصوت + FX
- ✅ SUBSCRIBER يستطيع تعديل صوته (per-cue FX محلي في localStorage)
- ✅ VIEWER يرى فقط — الأزرار معطلة + FX sliders مخفية

### Sidebar
- ✅ SUBSCRIBER و VIEWER لا يرون Settings
- ✅ Role Badge ملون يظهر تحت اللوغو
- ✅ BroadcastControl ظاهر لجميع الأدوار

---

## المرحلة 2: ربط Per-Cue FX بالصوت الحقيقي ✅

### المشكلة
Sliders في BroadcastControl كانت شكلية فقط — تحفظ في localStorage لكن لا تؤثر على الصوت.

### الحل
تم تعديل `getCueFx()` في `services/audioEngine.ts`:

```
قبل: getCueFx = cue => CUE_FX_CONFIG[cue] || defaults
بعد: getCueFx = cue => overrides[cue] || CUE_FX_CONFIG[cue] || defaults
```

**التفاصيل التقنية:**
1. `loadFxOverrides()` يقرأ `rge_cue_fx_v1` من localStorage
2. Cache لمدة 2 ثانية لتجنب قراءة متكررة
3. `invalidateCueFxCache()` يُستدعى من BroadcastControl عند كل تغيير slider
4. Validation: `typeof === 'number'` + clamp (reverb: 0-1, subBass: 0-1.5)
5. Fallback: إذا فشل الـ parse → يستخدم الافتراضي

### حماية إضافية
- ❌ لا يُقرأ localStorage في server-side (`typeof localStorage === 'undefined'`)
- ❌ لا يُخزن أي secret — فقط أرقام reverb/subBass
- ✅ إذا كانت القيم فاسدة → fallback تلقائي

### ملاحظة localStorage
مفتاح `rge_cue_fx_v1` حالياً مشترك لكل المستخدمين على نفس المتصفح.
**مطلوب لاحقاً:** تغيير إلى `rge_cue_fx_v1:{workspaceId}` قبل إطلاق مستخدمين حقيقيين.

---

## المرحلة 3: فحص صور Bayern و Real Madrid ✅

### نتائج الفحص

| النادي | smallImage | renderImage | clubLogo | الحالة |
|--------|:---------:|:-----------:|:--------:|--------|
| Chelsea (4) | ✅ OK | ✅ OK | ✅ OK | تعمل |
| Barcelona (12) | ✅ OK | ✅ OK | ✅ OK | تعمل |
| Athletic (1) | ⬜ فارغ | ⬜ فارغ | ⬜ فارغ | لا توجد صور |
| Bayern (8) | ❌ 404 | ❌ 404 | ❌ 404 | مجلد غير موجود |
| Real Madrid (8) | ❌ 404 | ❌ 404 | ❌ 404 | مجلد غير موجود |

### الإجراء المتخذ
تم **مسح URLs المكسورة** (16 لاعب × 3 حقول = 48 URL) وتحويلها إلى `""` فارغ.

**السبب:** مجلدات `Bundesliga/Bayern/` و `La Liga/Real Madrid/` غير موجودة في GitHub repo `graphicsplayer2026`.

### المطلوب لاحقاً
1. تحميل renders اللاعبين إلى GitHub repo
2. إنشاء مجلدات: `Bundesliga/Bayern/` + `La Liga/Real Madrid/`
3. تحديث URLs في players.json بعد الرفع
4. لا تُستخدم صور عشوائية بلا مصدر

---

## المرحلة 4: خطة Google Secret Manager ⏸️

تم كتابة خطة تفصيلية في:
`التقارير العربية/2026-05-16-google-secret-manager-plan.md`

**الملخص:**
- ❌ لم يُفعّل
- ❌ لا service account JSON
- ❌ لا credentials في GitHub
- ✅ خطة أوامر gcloud جاهزة
- ✅ قواعد أمان صارمة موثقة
- ✅ شروط تفعيل واضحة (staging + موافقة المالك)

---

## المرحلة 5: Vercel Functions ✅

- عدد Functions: **12/12** (لم يتغير)
- لا route جديد أُضيف
- لا حاجة لـ Vercel Pro الآن

---

## فحص الأمان النهائي

| الفحص | النتيجة |
|-------|---------|
| `npx tsc --noEmit` | ✅ نظيف |
| `npm run build` | ✅ نجح (6.08s) |
| dist/ — `REO_PLAYER_STATS_TOKEN` | ✅ مرجع اسم فقط (UI text) |
| dist/ — `GEMINI_API_KEY` | ✅ `SET_IN_VERCEL_ONLY` snippet |
| dist/ — `LICENSE_SECRET` | ✅ مرجع اسم فقط |
| dist/ — service account JSON | ✅ غير موجود |
| dist/ — Authorization Bearer (ثابت) | ✅ dynamic fetch فقط |
| `/api/player-stats` auth.valid | ✅ true |
| Vercel functions | ✅ 12/12 |

---

## الملفات المعدّلة

| الملف | التعديل |
|-------|---------|
| `services/audioEngine.ts` | `getCueFx` يقرأ localStorage overrides + cache + invalidate |
| `pages/BroadcastControl.tsx` | `invalidateCueFxCache()` عند كل تغيير slider |
| `public/identity/players.json` | مسح 48 URL مكسورة (Bayern+Real Madrid) |

---

## Commits

```
2978648 feat: wire per-cue FX to audioEngine + clear broken Bayern/Real Madrid image URLs
cdd1b1e feat: role-aware sidebar + per-cue FX sliders + confirm rotation + Bayern/Real Madrid players (33 total)
```
