# تحقق نشر الدفعة 44 على Hostinger

التاريخ: 2026-06-28

## النتيجة

تم دفع الدفعة إلى GitHub ثم التقط Hostinger البناء الجديد بنجاح.

الـ commit:

```text
f12903c Upgrade Mondial lineup broadcast visuals
```

الحزمة الحية:

```text
https://peachpuff-herring-712997.hostingersite.com/assets/index-DuS4rAF1.js
```

## فحص الصفحة الحية

الرابط:

```text
https://peachpuff-herring-712997.hostingersite.com/
```

النتيجة:

```text
index.html -> assets/index-DuS4rAF1.js
```

## فحص قالب التشكيلة على OBS

الرابط المفحوص:

```text
https://peachpuff-herring-712997.hostingersite.com/output/qa-template-mondial-lineup?obs=1&rgev=obs-live-v3
```

النتيجة:

```text
HTTP 200
containsNewAsset=true
```

لقطة الإثبات:

```text
reports-ar/2026-06-28-batch-44-hostinger-lineup-preview.png
```

## فحص الصور الحقيقية

تم فحص جسر تفاصيل المباراة:

```text
https://peachpuff-herring-712997.hostingersite.com/api/reo-match?action=match-details&matchId=4667751
```

النتيجة:

```text
sourceStatus=live
home=Mexico
away=South Africa
homeLineup=11
firstImage=https://images.fotmob.com/image_resources/playerimages/1227878.png
```

ثم تم فحص رابط الصورة نفسه:

```text
HTTP 200
content-type=image/png
```

## الخلاصة

صور اللاعبين الحقيقية ظهرت فعليا في لقطة Hostinger الحية لقالب التشكيلة، والقالب أصبح يستخدم `Stadium Motion` افتراضيا مع دعم صور اللاعبين من بيانات FotMob.
