# 01 — توثيق نقاط FotMob الحقيقية للانتقالات (مرجع تقني)

> هذا أهم أصل تقني في الحزمة: نقطة بيانات الانتقالات الحقيقية في FotMob وكيفية الوصول إليها.

## النقطة الصحيحة المكتشفة

```
GET https://www.fotmob.com/api/data/transfers?orderBy=<O>&page=1&minFeeCurrency=EUR&popular=<bool>
```

| المعامل | القيم | الأثر |
|---------|-------|-------|
| `orderBy` | `amountEuro` | ترتيب حسب **الرسوم** (أغلى الصفقات). |
| `orderBy` | `lastModified` | ترتيب حسب **الأحدث** (صفقات اليوم/الأسبوع). |
| `page` | 1, 2, 3… | صفحات بحجم 50. |
| `minFeeCurrency` | `EUR` | عملة العرض. |
| `popular` | `true` | الصفقات المهمة فقط (موصى به للبث). |

> ⚠️ القيم الخاطئة: `transferDate`, `date`, `dateAdded`, `fee` كلها تُرجع 0 نتائج أو HTML.
> الصحيح حصراً: **`amountEuro`** (رسوم) و **`lastModified`** (أحدث).

## لماذا لا يعمل الاستدعاء المباشر من الخادم؟

النقطة محميّة بترويسة توقيع (`x-mas`) يولّدها متصفح FotMob لكل طلب.
- استدعاء `fetch` مباشر من Node → **HTTP 400** من CloudFront (جسم فارغ).
- نقطة `pub.fotmob.com/beta/news/api/transfer/` (الداخلية) → **400** أيضاً بدون التوقيع.

## الحل المعتمد: جسر بمتصفح (CDP)

نفس نمط `cloud/reo-match-bridge` في أداتكم. نشغّل Chrome (headless) عبر `puppeteer-core`،
نفتح صفحة الانتقالات، ونلتقط استجابة `/api/data/transfers` (التوقيع يُولّد تلقائياً).

الملف: [`../lib/fotmobCapture.mjs`](../lib/fotmobCapture.mjs)
- يلتقط استجابة الشبكة المطابقة لـ `orderBy` المطلوب.
- بديل احتياطي: `page.evaluate(fetch(...))` من داخل سياق الصفحة (يرث التوقيع).

## شكل الصفقة الخام (FotMob)

```jsonc
{
  "name": "Anthony Gordon",
  "playerId": 906937,                  // → صورة اللاعب
  "position": { "label": "LW", "key": "leftwinger_short" },
  "transferDate": "2026-05-29T19:32:29Z",
  "fromClub": "Newcastle", "fromClubFullName": "Newcastle United", "fromClubId": 10261,
  "toClub": "Barcelona",  "toClubFullName": "Barcelona", "toClubId": 8634,   // → شعارات
  "fee": { "feeText": "fee", "localizedFeeText": "transfer_fee", "value": 80000000 },
  "amountEuroEstimated": null,
  "transferType": { "text": "contract", "localizationKey": "contract" },
  "contractExtension": false,
  "onLoan": false,
  "fromDate": "2026-06-30T22:00:00Z", "toDate": "2031-06-29T22:00:00Z",
  "marketValue": 62762307              // قيمة سوقية تقريبية (FotMob)
}
```

## روابط الأصول البصرية (مباشرة، بلا توقيع، تعمل في `<img>`)

```
صورة اللاعب:  https://images.fotmob.com/image_resources/playerimages/{playerId}.png
شعار النادي:  https://images.fotmob.com/image_resources/logo/teamlogo/{clubId}.png
```

## فلترة الموسم 2026/27

```
date >= 2026-05-01T00:00:00Z   // بداية الموسم الحالي
```
انظر `lib/normalize.mjs` (`SEASON_START`, `SEASON_LABEL`).

## نقطة الشائعات (منفصلة — لقالب rumor-mill)

```
https://pub.fotmob.com/beta/news/api/rumour/all?...   // عبر نفس آلية المتصفح
```

## ملاحظات تشغيلية
- **التخزين المؤقت إلزامي:** لا تستدعِ FotMob مع كل طلب. الجسر يخزّن لقطة في `data/transfers-*.json` ويحدّثها عند الطلب أو بمؤقّت.
- **احترام المصدر:** نافذة تحديث معقولة (كل 5–15 دقيقة)، User-Agent واضح.
- **الإسناد:** اعرض «المصدر: FotMob» في الإخراج.
