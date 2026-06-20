# Risk-Based Bot Protection Design

التاريخ: 2026-06-20
المسار المطلوب: `reports-ar/2026-06-15-bot-protection-risk-based-design.md`
الحالة: تصميم فقط، دون تنفيذ.

---

## 1. الهدف

الحماية المطلوبة يجب أن تمنع إساءة الاستخدام دون إزعاج المستخدم الطبيعي ودون كسر:

- OBS Output.
- روابط `/output/...`.
- روابط `/control/...`.
- Stream Deck.
- `/api/live`.
- `/api/stream`.
- `/api/player-stats`.

أي API يجب أن يرجع JSON دائمًا، لا صفحة HTML CAPTCHA.

---

## 2. نتيجة الاكتشاف الحالية

تم اختبار المسارات الحية من Hostinger:

| المسار | النتيجة | Challenge |
|---|---:|---|
| `/` | `200 text/html` | لا |
| `/output/review-output-chrome` | `200 text/html` | لا |
| `/api/player-stats` | `200 application/json` | لا |
| `/api/live?id=__program_output__&full=1` | `404 application/json` عند عدم وجود state | لا |
| Player Stats Bridge `/health` | `200 application/json` | لا |

النتيجة:

- لا توجد حاليًا صفحة Bot Verification عامة على المسارات المختبرة من Node fetch.
- إذا ظهرت للمستخدم في Chrome فقد تكون من طبقة خارجية مؤقتة مثل Hostinger hPanel/session/browser/security extension أو حماية منصة، وليست من كود REO الحالي.
- لا يوجد Turnstile/Cloudflare challenge داخل كود REO حسب البحث الحالي.

---

## 3. السبب المحتمل لأي Bot Verification سابق

الأسباب المرجحة بالترتيب:

1. حماية Hostinger/hPanel أو جلسة إدارة الاستضافة، خصوصًا أثناء عمليات نشر أو SSH أو إعدادات Node.
2. حماية عامة على مستوى مزود الاستضافة إن تم تفعيلها لاحقًا.
3. Extension أو Security product في Chrome.
4. طلبات متكررة جدًا من المتصفح أثناء التطوير.
5. Rate limiting داخلي موجود فقط في `api/license.ts` لكنه يعيد JSON ولا يعيد CAPTCHA.

لا يوجد دليل حالي أن `/output` أو `/api/player-stats` يعيدان HTML challenge.

---

## 4. السياسة المطلوبة

### لا Challenge مطلقًا لهذه المسارات

- `/output/*`
- `/api/live`
- `/api/stream`
- `/api/player-stats`
- `/api/reo-match` للطلبات الموثقة.
- ملفات assets داخل `/assets/*`.
- ملفات الصوت والصور العامة المستخدمة في OBS.

السبب: OBS وStream Deck لا يستطيعان التعامل مع CAPTCHA.

### Challenge صامت أو مشروط فقط

يسمح بالحماية فقط في:

- Signup جديد.
- Login بعد محاولات فاشلة.
- Reset password.
- Admin login.
- Token creation.
- Payment checkout.
- Import/export حساس.

---

## 5. التصميم المقترح

### 5.1 Risk Score

كل طلب حساس يأخذ درجة خطر:

| العامل | الوزن |
|---|---:|
| IP جديد جدًا | +1 |
| جهاز غير موثوق | +1 |
| محاولات فاشلة متكررة | +3 |
| Signup متكرر من نفس IP | +3 |
| User-Agent مفقود أو غريب | +2 |
| طلب API حساس بدون JSON accept | +2 |
| معدل طلبات مرتفع | +3 |
| جلسة موثقة ومستقرة | -2 |
| جهاز موثوق | -3 |

القرار:

- `0-2`: السماح.
- `3-5`: rate limit فقط.
- `6-8`: Turnstile invisible/managed في واجهة بشرية.
- `9+`: رفض JSON واضح أو إيقاف مؤقت.

### 5.2 Trusted Device

بعد login ناجح:

- إنشاء device id عشوائي.
- حفظ hash على الخادم.
- حفظ cookie آمن للمتصفح.
- لا يطبق على Output/OBS.

### 5.3 Rate Limiting

مطلوب rate limit server-side للآتي:

- `/api/auth/login`
- `/api/auth/signup`
- `/api/auth/verify-email`
- `/api/tokens/create`
- `/api/admin/*`
- `/api/billing/*`

لا تستخدم CAPTCHA كبديل عن rate limiting.

### 5.4 API JSON Contract

أي API محمي يجب أن يرجع:

```json
{
  "error": "rate_limited",
  "retryAfterSec": 60,
  "challengeRequired": false
}
```

ولا يرجع HTML.

---

## 6. Turnstile/Challenge Placement

إذا تقرر استخدام Cloudflare Turnstile:

- يكون داخل صفحات بشرية فقط.
- لا يكون أمام `/output/*`.
- لا يكون أمام `/api/live` أو `/api/stream`.
- لا يكون عالميًا على الدومين.
- يستخدم Managed/Invisible عند ارتفاع risk score فقط.

---

## 7. Hostinger Global Challenge Risk

إذا كانت Hostinger تفرض Challenge عالميًا ولا تسمح باستثناء Routes:

1. افصل Output/API على subdomain لا يمر عبر challenge.
2. أو استخدم CDN/WAF يسمح route bypass.
3. أو ضع API على backend مستقل مع JSON-only responses.

لا يجوز حل المشكلة بتقليل أمان كل شيء، ولا يجوز وضع OBS خلف CAPTCHA.

---

## 8. الملفات المتوقعة لاحقًا

تصميم فقط، لا تنفذ الآن.

ملفات محتملة:

- `server/security/riskScore.ts`
- `server/security/rateLimiter.ts`
- `server/security/trustedDevice.ts`
- `server/security/jsonErrors.ts`
- `api/_router/auth.ts`
- `api/_router/admin.ts`

يفضل دمج routes داخل router موحد بدل إضافة functions كثيرة.

---

## 9. اختبارات القبول

1. فتح الموقع 20 مرة من جهاز طبيعي لا يعرض CAPTCHA متكررًا.
2. Refresh عشر مرات لا يعرض Challenge.
3. تسجيل دخول صحيح لا يعرض Challenge بعد كل دخول.
4. التنقل بين الصفحات لا يعرض Challenge.
5. Output داخل Chrome وOBS لا يعرض Challenge مطلقًا.
6. Player Stats API يرجع JSON دائمًا.
7. محاولات Login فاشلة متكررة ترفع risk score.
8. Signup جديد يرى Challenge فقط عند الحاجة.
9. الجهاز الموثوق لا يعاد تحديه دون سبب.
10. IP مشبوه يتم تقييده.

---

## 10. Rollback

لأن هذا التقرير تصميم فقط فلا يوجد rollback. عند التنفيذ لاحقًا يجب أن يكون كل شيء خلف feature flag مثل:

- `RISK_PROTECTION_ENABLED=false`
- `TURNSTILE_ENABLED=false`

حتى يمكن تعطيل الحماية فورًا إذا أثرت على البث.
