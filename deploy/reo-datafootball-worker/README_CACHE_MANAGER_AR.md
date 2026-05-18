# REO Cache Manager — دليل الاستخدام

## ما هي الأداة الرئيسية؟

ملف واحد يتحكم بكل شيء:
```
windows_tray\quick_actions\REO_CACHE_MANAGER.bat
```

انقر مرتين عليه وستظهر قائمة بالخيارات.

---

## الخيارات المتاحة

| # | الخيار | الوظيفة | الوقت التقريبي |
|---|---|---|---|
| 1 | Check cache status | عرض حالة الكاش المحلي | ~10 ثوانٍ |
| 2 | Run daily safe sync | جلب المجموعات الناقصة عبر soccerdata + رفع | 5-15 دقيقة |
| 3 | Import manual FBref bundle | استيراد ملفات HTML/CSV أو ZIP | 1-5 دقائق |
| 4 | Upload existing cache to VPS | رفع الكاش الحالي بدون جلب جديد | ~30 ثانية |
| 5 | Show last run report | عرض تقرير آخر تشغيل + توصية | فوري |
| 6 | Open logs folder | فتح مجلد السجلات | فوري |
| 7 | Install daily startup sync | تثبيت التشغيل التلقائي عند فتح Windows | فوري |

---

## كيف أجهز fbref_manual_bundle.zip؟

### الخطوات:
1. افتح الروابط الخمسة من المتصفح العادي (واحد تلو الآخر بفاصل 30 ثانية):
   - https://fbref.com/en/comps/Big5/passing/players/Big-5-European-Leagues-Stats
   - https://fbref.com/en/comps/Big5/gca/players/Big-5-European-Leagues-Stats
   - https://fbref.com/en/comps/Big5/defense/players/Big-5-European-Leagues-Stats
   - https://fbref.com/en/comps/Big5/possession/players/Big-5-European-Leagues-Stats
   - https://fbref.com/en/comps/Big5/passing_types/players/Big-5-European-Leagues-Stats

2. لكل صفحة: `Ctrl+S` → احفظ كـ HTML:
   - `passing.html`
   - `gca.html`
   - `defense.html`
   - `possession.html`
   - `pass_types.html`

3. اضغط الملفات الخمسة في ZIP واحد باسم:
   ```
   fbref_manual_bundle.zip
   ```

4. ضع الـ ZIP في:
   ```
   deploy\reo-datafootball-worker\.manual\fbref\fbref_manual_bundle.zip
   ```

5. شغّل `REO_CACHE_MANAGER.bat` واختر خيار 3.

### أسماء الملفات المطلوبة داخل ZIP:
```
passing.html (أو .csv)
gca.html (أو .csv)
defense.html (أو .csv)
possession.html (أو .csv)
pass_types.html (أو .csv)
```

---

## كيف أعرف آخر تشغيل؟

اختر خيار 5 من القائمة. سيعرض:
- تاريخ ووقت آخر تشغيل
- المدة
- النتيجة (نجاح / جزئي / فشل)
- المجموعات المتاحة والناقصة
- هل تم الرفع إلى VPS
- توصية التشغيل التالية

---

## متى أشغّل daily sync؟

- **أقل من 12 ساعة من آخر تشغيل:** لا تحتاج إلا إذا لديك بث مهم.
- **12-24 ساعة:** يمكن تشغيل daily sync.
- **أكثر من 24 ساعة:** يُنصح بالتشغيل.
- **بعد مباريات جديدة:** شغّل لتحديث الأرقام.

---

## متى أستخدم manual bundle؟

- عندما تكون هناك مجموعات ناقصة (passing, gca, defense, possession, pass_types).
- عندما يكون FBref يحجب الطلبات المباشرة (403).
- لا تحتاج manual bundle إذا كل المجموعات متاحة.

---

## ماذا أفعل إذا ظهرت CAPTCHA؟

1. إذا ظهرت CAPTCHA في المتصفح: حلّها يدويًا ثم احفظ الصفحة.
2. إذا حفظت صفحة CAPTCHA بالغلط: الأداة سترفضها تلقائيًا مع رسالة:
   ```
   CAPTCHA_OR_BLOCK_PAGE: found 'just a moment' in passing.html
   ```
3. احذف الملف الفاسد وأعد حفظ الصفحة بعد حل CAPTCHA.

---

## ما لا يُلمس

| العنصر | الحالة |
|---|---|
| player-stats-bridge | لا يتغير |
| PM2 | لا يتغير |
| Nginx | لا يتغير |
| Vercel | لا يتغير |
| التوكنات | لا تتغير |
| الكاش القديم على VPS | محمي بالـ backup |
