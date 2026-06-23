# تقرير حالة النشر - المونديال على Hostinger

## تصحيح مهم

هدف الإنتاج الحالي لهذا المشروع هو Hostinger:

`https://peachpuff-herring-712997.hostingersite.com/`

وليست Vercel. محاولة Vercel السابقة كانت فحصًا لمسار نشر قديم، ونتيجتها لا تمثل حالة الإنتاج الحالية.

## حالة GitHub الحالية

فرع العمل:

`codex/mondial-broadcast-batch-02`

آخر commit قبل النشر إلى `main`:

`915bc20372464347feb33d5dd275c819ee57c297`

المقارنة مع `origin/main` أثبتت أن `origin/main` هو أساس الفرع الحالي، لذلك يمكن دفع التغييرات إلى `main` بطريقة fast-forward بدون overwrite.

## حالة Hostinger الحية قبل نشر دفعات المونديال

تم فحص الرابط الرئيسي:

`https://peachpuff-herring-712997.hostingersite.com/`

النتيجة:

- HTTP: `200`
- Server: `hcdn`
- العنوان: `Reo Live Stream - نظام البث السحابي`
- ملف JavaScript المنشور قبل دفعات المونديال:
  - `/assets/index-W_N8qOWd.js`
- ملف CSS المنشور قبل دفعات المونديال:
  - `/assets/index-C0CzFJSu.css`

هذا يعني أن الموقع يعمل، لكنه يحتاج وصول commit المونديال إلى `main` ثم redeploy أو auto-deploy من Hostinger حتى تظهر الحزمة الجديدة.

## التحقق المحلي قبل النشر

تم التحقق من دفعة الثيمات والستايلات محليًا:

- `git diff --check`: نجح، مع تحذيرات CRLF فقط.
- `npm.cmd run build`: نجح.
- `node --test tests\fotmob-world-cup.test.mjs`: نجح، 3 اختبارات.
- معاينة المتصفح لقالب `scoreboard_red` نجحت وأثبتت تطبيق:
  - `effect = scorebug`
  - `motion = on`
  - `transitionSpeed = 1100ms`
  - `--mondial-bg = #120003`
  - `--mondial-panel = #7b020b`
  - `--mondial-a1 = #ff1738`

## خطة النشر الصحيحة

1. دفع الفرع إلى GitHub.
2. fast-forward من الفرع إلى `main`.
3. دفع `main` إلى GitHub.
4. انتظار auto-deploy من Hostinger أو تشغيل Redeploy من hPanel إذا لم يتغير asset hash.
5. التحقق من تغير ملفات `/assets/index-*.js` و`/assets/index-*.css` على Hostinger.

## ملاحظة تشغيلية

إذا بقي Hostinger يعرض نفس الملفات:

- `/assets/index-W_N8qOWd.js`
- `/assets/index-C0CzFJSu.css`

بعد دفع `main`، فمعنى ذلك أن GitHub وصلته التغييرات لكن Hostinger لم يشغل redeploy بعد.
