# REO Unified Transfers Bridge (FotMob × Transfermarkt)

جسر انتقالات موحّد: خلاصة FotMob الحيّة (صور/شعارات/حدث) + عمق Transfermarkt المرجعي (رسوم/قيمة/مسيرة).

## التشغيل
```bash
npm install
node scripts/refresh-cache.mjs   # التقاط أولي من FotMob (يشغّل Chrome)
node server.js                   # http://127.0.0.1:4319
```

## المسارات
| المسار | الوصف |
|--------|-------|
| `/` | لوحة الدمج البصرية (صور/شعارات حقيقية + تبويبات + زر تحديث). |
| `/overview` | الصورة العامة لكل القوالب الـ32 + مصدر بيانات كلٍّ. |
| `/api/feed?view=fee\|latest` | بطاقات مدموجة من الكاش. |
| `/api/refresh?view=fee\|latest` | التقاط حيّ من FotMob ثم دمج. |
| `/health` | فحص. |

## المكوّنات
- `lib/fotmobCapture.mjs` — التقاط FotMob عبر Chrome/CDP (يتجاوز توقيع x-mas).
- `lib/normalize.mjs` — تطبيع + فلترة موسم 2026/27 (`SEASON_START`).
- `lib/mergeSources.mjs` — الدمج العبقري + وسم مصادر الحقول.
- `server.js` — الخادم + الكاش + التحديث.

## البيئة
```
PORT=4319
REO_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

## ملاحظات
- يخزّن لقطات في `data/transfers-*.json` (لا يستدعي FotMob مع كل طلب).
- متجر Transfermarkt يُقرأ من `../REO-TRANSFERMARKT-INTEL` (حقيقي إن وُجد، وإلا بذرة DEMO).
- التفاصيل في `HANDOFF/`.
