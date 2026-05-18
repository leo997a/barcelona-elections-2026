# Phase F.1: إصلاح تحويل بيانات soccerdata + إعادة محاولة آمنة

تاريخ: 2026-05-18
المرحلة: Phase F.1 — Fix soccerdata cache conversion + safe retry

---

## المشكلة

عند تشغيل `run_missing_groups_only.bat` في Phase F، كان soccerdata يفتح Chrome
ويجلب الجداول بنجاح من FBref، لكن تحويل DataFrame إلى قائمة لاعبين كان يفشل
بخطأ:

```
boolean value of NA is ambiguous
```

السبب: دالة `_df_to_players` في `fbref_soccerdata_provider.py` كانت تستخدم:
```python
if val != val:  # NaN check
```

هذا يفشل عندما `val` يكون `pandas.NA` (وليس `numpy.nan`)، لأن pandas يرفض
تحويل `pd.NA` إلى boolean ويرمي `TypeError`.

النتيجة: كل المجموعات (shooting, playing_time, misc, keeper) كانت ترجع 0 لاعبين
رغم أن البيانات موجودة في الـ DataFrame.

---

## الإصلاح

### 1. دالة `_safe_native(value)` جديدة

تحوّل أي قيمة pandas/numpy إلى Python native بأمان:
- `pd.NA`, `np.nan`, `pd.NaT`, `None` → `None`
- `np.int64(42)` → `42`
- `np.float64(3.14)` → `3.14`
- `np.bool_(False)` → `False`
- `str`, `int`, `float`, `bool` → كما هي
- أي شيء آخر → `str(value)`

تستخدم `pd.isna(value)` بدلاً من `val != val`، مع حماية ضد الحالة التي
يرجع فيها `pd.isna` مصفوفة (عند تمرير list-like).

### 2. إعادة كتابة `_df_to_players`

- تستخدم `df.itertuples(index=False, name=None)` بدلاً من `df.iterrows()`.
  هذا أسرع بـ 10-50x ويتجنب إنشاء pandas Series لكل صف (الذي كان يسبب
  مشاكل boolean evaluation).
- تحوّل أسماء الأعمدة إلى lowercase مرة واحدة قبل الحلقة.
- تستدعي `_safe_native()` لكل قيمة.

### 3. إضافة `import pandas as pd` في أعلى الملف

كان مفقودًا — `pd` كان يُستخدم فقط داخل `_df_to_players` ضمنيًا عبر
`hasattr(val, 'item')`. الآن مطلوب صراحة لـ `pd.isna()`.

---

## اختبار الوحدة (smoke test)

تم اختبار `_safe_native` على 9 حالات:
```
pd.NA       → None  ✅
np.nan      → None  ✅
None        → None  ✅
np.int64(42)→ 42    ✅
np.float64  → 3.14  ✅
'hello'     → 'hello' ✅
True        → True  ✅
np.False_   → False ✅
pd.NaT      → None  ✅
```

---

## نتائج التشغيل بعد الإصلاح

### الأمر المستخدم
```
run_soccerdata_missing_only.bat
```
(يستخدم `soccerdata_only` بدون direct_big5 fallback)

### النتائج

| المجموعة | اللاعبون | الحالة |
|---|---|---|
| standard | 860 | ✅ OK (من جلب سابق) |
| shooting | 2,795 | ✅ OK |
| playing_time | 3,509 | ✅ OK |
| misc | 2,797 | ✅ OK |
| keeper | 180 | ✅ OK |
| passing | — | ❌ غير مدعوم من soccerdata v1.9.0 |
| gca | — | ❌ غير مدعوم من soccerdata v1.9.0 |
| defense | — | ❌ غير مدعوم من soccerdata v1.9.0 |
| possession | — | ❌ غير مدعوم من soccerdata v1.9.0 |
| pass_types | — | ❌ غير مدعوم من soccerdata v1.9.0 |

**5 مجموعات OK من أصل 10 مطلوبة.**

### validate_cache.py
```
Status:  [OK] VALID - safe to upload
Files:   5/5 valid
Players: 10,141 total
Coverage: partial
Available groups: standard, shooting, playing_time, misc, keeper
Missing groups:   passing, gca, defense, possession, pass_types
-> 5 OK, 5 FAIL, 0 SKIP
```

### الرفع إلى VPS
```
/opt/reo-data-cache/fbref/
  columns-manifest.json        4.1K
  fbref-keeper-2025-26.json    142K
  fbref-misc-2025-26.json      1.7M
  fbref-playing_time-2025-26.json  2.5M
  fbref-shooting-2025-26.json  1.5M
  fbref-standard-2025-26.json  647K
  last_updated.json            21K
  metrics_coverage.json        8.0K
```

### العمليات المتبقية
```
chromedriver.exe: 0
chrome.exe (agent-related): 0
```

---

## لماذا 5 مجموعات فقط وليس 10؟

مكتبة `soccerdata` v1.9.0 تدعم فقط 5 أنواع stat_type:
- `standard`
- `shooting`
- `playing_time`
- `misc`
- `keeper`

المجموعات الخمس الباقية (`passing`, `gca`, `defense`, `possession`, `pass_types`)
تحتاج إما:
1. ترقية soccerdata إلى إصدار أحدث يدعمها (إذا وُجد).
2. استخدام `direct_big5` provider (يدعم كل الـ 11 مجموعة) — لكنه حاليًا
   محجوب بـ 403 من Cloudflare.
3. انتظار تغيّر IP أو استخدام وقت مختلف من اليوم حيث FBref أقل حماية.

الخطوة التالية المقترحة: تشغيل `run_missing_groups_only.bat` (الذي يستخدم
`soccerdata_first` مع fallback إلى direct) في وقت لاحق عندما ينتهي cooldown
الـ 403 (أو من IP مختلف).

---

## التغييرات في هذا الـ Commit

| الملف | التغيير |
|---|---|
| `providers/fbref_soccerdata_provider.py` | إضافة `import pandas as pd`، دالة `_safe_native()` جديدة، إعادة كتابة `_df_to_players` باستخدام `itertuples` + `_safe_native` |
| `.gitignore` | إضافة `deploy/reo-datafootball-worker/.state/` و `.logs/` |
| `windows_tray/quick_actions/run_soccerdata_missing_only.bat` | BAT جديد: soccerdata_only + missing + Upload |

---

## ما لم يُلمس

- VPS scripts — صفر
- player-stats-bridge — صفر
- /api/player-stats — صفر
- Frontend / TypeScript — صفر
- التوكنات — صفر
- تصميم القالب — صفر
- force_refresh_all — لم يُستخدم
- scraping جديد — صفر

---

## الخلاصة

إصلاح سطر واحد (`pd.isna` بدل `val != val`) + إعادة هيكلة الحلقة حوّل
النتيجة من **0 لاعبين** إلى **10,141 لاعب** عبر 5 مجموعات. الكاش على VPS
أصبح الآن يحتوي بيانات حقيقية لـ shooting و playing_time و misc و keeper
بالإضافة إلى standard. المجموعات الخمس الباقية تحتاج direct_big5 أو ترقية
soccerdata — وهذا موضوع Phase G.
