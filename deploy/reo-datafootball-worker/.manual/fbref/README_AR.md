# كيف تحفظ جدول FBref يدويًا وتستورده

## الهدف

إكمال المجموعات الناقصة (passing, gca, defense, possession, pass_types)
بدون ضرب FBref مباشرة من السكربت — فقط من المتصفح العادي.

---

## الخطوات

### 1. افتح صفحة FBref من المتصفح العادي

| المجموعة | الرابط |
|---|---|
| passing | https://fbref.com/en/comps/Big5/passing/players/Big-5-European-Leagues-Stats |
| gca | https://fbref.com/en/comps/Big5/gca/players/Big-5-European-Leagues-Stats |
| defense | https://fbref.com/en/comps/Big5/defense/players/Big-5-European-Leagues-Stats |
| possession | https://fbref.com/en/comps/Big5/possession/players/Big-5-European-Leagues-Stats |
| pass_types | https://fbref.com/en/comps/Big5/passing_types/players/Big-5-European-Leagues-Stats |

### 2. احفظ الصفحة

**طريقة HTML (مفضلة):**
- Ctrl+S → "Save as" → اختر "Webpage, Complete" أو "Webpage, HTML Only"
- سمّ الملف باسم المجموعة: `passing.html`, `gca.html`, إلخ
- ضعه في هذا المجلد: `.manual/fbref/`

**طريقة CSV (بديلة):**
- في صفحة FBref، اضغط "Share & Export" فوق الجدول
- اختر "Get table as CSV (for Excel)"
- انسخ المحتوى إلى ملف نصي وسمّه: `passing.csv`, `gca.csv`, إلخ
- ضعه في `.manual/fbref/`

### 3. شغّل الاستيراد

انقر مرتين على:
```
windows_tray/quick_actions/import_manual_fbref_cache.bat
```

أو من PowerShell:
```powershell
.\run_local_sync_vps.ps1 -Strategy manual_fbref -StatGroups missing -Upload
```

### 4. ماذا يحدث؟

1. يقرأ الملفات من `.manual/fbref/`
2. يحوّلها إلى JSON بنفس الصيغة المستخدمة
3. يحفظها في `.cache/fbref/` (مثل: `fbref-passing-2025-26.json`)
4. يشغّل `validate_cache.py` للتأكد من صحة البيانات
5. إذا نجح: يضغط ويرفع إلى VPS
6. إذا فشل: لا يرفع شيئًا والكاش القديم محمي

---

## أسماء الملفات المطلوبة

```
.manual/fbref/
├── passing.html      (أو passing.csv)
├── gca.html          (أو gca.csv)
├── defense.html      (أو defense.csv)
├── possession.html   (أو possession.csv)
└── pass_types.html   (أو pass_types.csv)
```

---

## ملاحظات مهمة

- لا تحتاج إنترنت أثناء الاستيراد (الملفات محلية).
- الملف يجب أن يحتوي جدول FBref الكامل (Big 5 European Leagues).
- الحد الأدنى: 500 لاعب لكل مجموعة (إلا keeper: 40).
- إذا الملف أقل من 500 لاعب، سيُرفض في validation.
- لا تحذف الملفات بعد الاستيراد — يمكنك إعادة الاستيراد لاحقًا.
- الكاش القديم على VPS لا يُمسح إلا بعد نجاح كل الخطوات.

---

## ما لا يُلمس

- player-stats-bridge: لا يتغير
- PM2: لا يتغير
- Nginx: لا يتغير
- Vercel: لا يتغير
- التوكنات: لا تتغير
- الكاش الحالي: محمي بالـ backup
