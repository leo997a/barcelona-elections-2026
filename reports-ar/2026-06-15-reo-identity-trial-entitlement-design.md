# REO Identity, Trial & Entitlement Platform — Initial Implementation Design

التاريخ: 2026-06-20
الحالة: تصميم تنفيذي أولي فقط. لا يوجد كود إنتاجي في هذه المرحلة.

---

## 1. القرار المعماري

الهدف هو نقل REO Live من License Gate محلي إلى منصة حسابات واستوديوهات واستحقاقات، لكن دون كسر:

- المفاتيح القديمة.
- Output/OBS.
- Stream Deck.
- Control links.
- Player Stats Bridge.
- القوالب الحالية.

المعماريّة المقترحة:

- Firebase Authentication للحسابات البشرية.
- Cloud Firestore للهوية والاستوديوهات والخطط والاشتراكات والتوكنات.
- Firebase Realtime Database أو Live API الحالي لحالة البث السريعة.
- Hostinger backend دائم للتحقق من ID tokens، provisioning، entitlements، tokens، admin.
- Router موحد لتجنب تجاوز 12 API functions.

---

## 2. فصل المفاهيم

| المفهوم | التعريف |
|---|---|
| User | حساب بشري عبر Firebase Auth. |
| Studio | مساحة عمل مستقلة للبث والقوالب والروابط. |
| Membership | علاقة user بـstudio مع role. |
| Subscription | حالة خطة studio: trial/pro/expired/suspended. |
| Plan | تعريف الميزات والحدود. |
| Entitlement | القرار النهائي: هل هذا الطلب مسموح الآن؟ |
| Token | رابط view/control/edit/API يعرّف القالب أو الاستوديو، ولا يحمل الخطة نفسها. |

القاعدة الأساسية:

> لا تضع قدرات الخطة داخل token طويل العمر. التوكن يعرف المورد، والـEntitlement Engine يحسب السماح وقت الطلب.

---

## 3. Collections المقترحة

### `users/{uid}`

```json
{
  "email": "user@example.com",
  "displayName": "",
  "status": "ACTIVE",
  "createdAt": "...",
  "updatedAt": "...",
  "lastLoginAt": "...",
  "primaryStudioId": "studio_x"
}
```

### `studios/{studioId}`

```json
{
  "ownerUid": "firebase_uid",
  "name": "REO Studio",
  "slug": "reo-studio",
  "status": "ACTIVE",
  "createdAt": "...",
  "updatedAt": "...",
  "trialProvisioned": true,
  "brandingPolicy": "REO_REQUIRED"
}
```

### `studios/{studioId}/members/{uid}`

```json
{
  "role": "OWNER",
  "status": "ACTIVE",
  "invitedBy": null,
  "joinedAt": "..."
}
```

### `studios/{studioId}/subscription/current`

```json
{
  "planId": "trial",
  "status": "TRIALING",
  "trialStartedAt": "...",
  "trialEndsAt": "...",
  "provider": "manual",
  "providerSubscriptionId": null,
  "adminOverride": null
}
```

### `plans/{planId}`

```json
{
  "name": "Trial",
  "status": "ACTIVE",
  "limits": {
    "templates": 10,
    "studios": 1,
    "members": 1,
    "outputLinks": 10,
    "controlLinks": 10
  },
  "features": {
    "brandingRequired": true,
    "streamDeck": "limited",
    "playerIntel": "basic",
    "apiTokens": false
  }
}
```

### `studios/{studioId}/overlays/{overlayId}`

```json
{
  "templateId": "LOWER_THIRD",
  "name": "قالب تجريبي",
  "fields": {},
  "createdBy": "uid",
  "createdAt": "...",
  "updatedAt": "...",
  "trialTemplate": true
}
```

### `tokens/{tokenId}`

```json
{
  "hash": "sha256_or_argon_hash",
  "studioId": "studio_x",
  "overlayId": "overlay_y",
  "type": "VIEW",
  "status": "ACTIVE",
  "createdAt": "...",
  "expiresAt": null,
  "lastUsedAt": null
}
```

القيمة الكاملة للتوكن تظهر مرة واحدة فقط.

### `auditLogs/{logId}`

```json
{
  "actorUid": "uid",
  "studioId": "studio_x",
  "action": "SUBSCRIPTION_CHANGED",
  "target": "studios/studio_x/subscription/current",
  "createdAt": "...",
  "metadata": {}
}
```

---

## 4. API routes المقترحة

لا تضف endpoint جديد لكل عملية. استخدم router موحد:

### `api/platform.ts` أو `api/_router/platform.ts`

مسارات داخلية:

- `POST /api/platform?action=signup-complete`
- `POST /api/platform?action=provision-trial`
- `GET /api/platform?action=me`
- `GET /api/platform?action=studio`
- `GET /api/platform?action=entitlements`
- `POST /api/platform?action=create-token`
- `POST /api/platform?action=revoke-token`
- `POST /api/platform?action=admin-update-subscription`

إذا بقيت البنية الحالية على Hostinger server، يمكن تسجيل route واحد في `server/server.ts` بدل زيادة function count.

---

## 5. Identity Foundation — Phase 2A

النطاق:

- إضافة Firebase Auth client config.
- Signup/Login/Logout بالبريد.
- Email verification.
- Backend verification عبر Firebase Admin SDK.
- إنشاء `users/{uid}` فقط بعد تحقق البريد أو أول login ناجح حسب القرار النهائي.

ممنوع في هذه المرحلة:

- Trial provisioning.
- Plans.
- Payments.
- Passkeys.
- TOTP.

ملفات متوقعة:

- `services/auth/firebaseAuthClient.ts`
- `services/auth/authState.ts`
- `server/auth/firebaseAdmin.ts`
- `api/platform.ts`
- `components/auth/LoginForm.tsx`
- `components/auth/SignupForm.tsx`
- `reports-ar/2026-..-identity-foundation.md`

---

## 6. Trial Studio Provisioning — Phase 2B

بعد نجاح Identity فقط:

- إنشاء studio id.
- إنشاء member owner.
- إنشاء subscription current بحالة `TRIALING`.
- نسخ 10 قوالب Trial.
- إنشاء links/tokens أولية.
- فرض REO branding.

المهم:

- العملية idempotent.
- لو فشل منتصفها، يمكن إعادتها دون duplications.
- لا تحذف بيانات المستخدم عند failure.

---

## 7. القوالب التجريبية العشرة المقترحة

القائمة المقترحة يجب أن تكون قابلة للتعديل والتحكم:

1. Lower Third عربي.
2. Breaking News نظيف.
3. Ticker عربي.
4. Scoreboard مبسط.
5. Match Stats مختصر.
6. Sponsor Bar محدود.
7. Top Viewers بسيط.
8. Player Intel Basic.
9. Mercato Deal Radar نسخة Trial.
10. Global Probability Mini بنطاق محدود.

سياسة Trial:

- لا يسمح بتجاوز 10.
- لا يسمح بإزالة REO branding.
- يسمح بتعديل النصوص والصور الأساسية.
- Control/Output يعملان.
- Stream Deck محدود.

---

## 8. Entitlement Engine — Phase 2C

دالة مركزية:

```ts
canAccess({
  user,
  studio,
  membership,
  subscription,
  plan,
  resource,
  action
})
```

ترجع:

```json
{
  "allowed": true,
  "reason": "OK",
  "limits": {},
  "brandingRequired": true
}
```

قرارات يجب أن تكون server-side:

- إنشاء overlay.
- حفظ overlay.
- إنشاء token.
- استخدام control token.
- إزالة branding.
- استخدام Stream Deck.
- export/import.
- admin operations.

الواجهة يمكن أن تخفي الأزرار، لكنها ليست مصدر الحقيقة.

---

## 9. Plans & Subscription Foundation — Phase 2D

ابدأ بدون دفع:

- Manual activation من Admin.
- Trial to Pro.
- Pro to Expired.
- Suspended.
- Grace period.

لا تضف Stripe أو AsiaCell أو Zain Cash قبل أن يعمل Entitlement Engine.

---

## 10. Admin Console — Phase 2E

يعرض:

- Users.
- Studios.
- Subscriptions.
- Plan status.
- Trial end.
- Manual upgrade/downgrade.
- Suspend/unsuspend.
- Audit logs.

ممنوع:

- عرض الأسرار.
- عرض token full value.
- تنفيذ admin actions بدون server verification.

---

## 11. Dynamic Tokens V2 — Phase 2F

أنواع التوكن:

- View.
- Control.
- Edit.
- API.
- Stream Deck.

القواعد:

- full token يظهر مرة واحدة.
- قاعدة البيانات تخزن hash فقط.
- token ID منفصل عن secret.
- التوكن يبقى بعد الترقية أو التخفيض.
- القدرات تتغير فورًا من Entitlement Engine.
- revoke/rotate مسجل في audit log.

---

## 12. Migration Plan

### المرحلة 1

أبق License Gate القديم كما هو، وأضف Identity خلف feature flag.

### المرحلة 2

اسمح للمستخدم الحالي بربط license key بحساب Firebase.

### المرحلة 3

أنشئ studio من license الحالي إذا لم يوجد.

### المرحلة 4

حوّل Smart Tokens القديمة إلى tokens V2 تدريجيًا.

### المرحلة 5

اجعل License Gate legacy fallback، لا المصدر الأساسي.

---

## 13. Feature Flags

مطلوب قبل التنفيذ:

- `REO_IDENTITY_ENABLED=false`
- `REO_TRIAL_PROVISIONING_ENABLED=false`
- `REO_ENTITLEMENTS_ENABLED=false`
- `REO_TOKENS_V2_ENABLED=false`
- `REO_RISK_PROTECTION_ENABLED=false`

---

## 14. Expected Function Count

الحالي: 10.

المقترح:

- لا تضف أكثر من route واحد جديد للمنصة.
- الأفضل: `api/platform.ts` فقط.

بعد الإضافة المتوقعة:

- 11 من 12 كحد أقصى.

إذا احتجنا auth/admin/billing متعددة، يجب دمجها في نفس router.

---

## 15. Commit Order المقترح

1. `docs: add reo platform master audit and implementation design`
2. `feat: add identity foundation behind feature flag`
3. `feat: add trial studio provisioning`
4. `feat: add entitlement engine`
5. `feat: add manual plan and subscription admin foundation`
6. `feat: add dynamic tokens v2`
7. `feat: add members and sharing foundation`
8. `feat: add payment provider adapter`
9. `fix: harden server sessions`
10. `feat: add passkeys and recovery foundation`

لا يتم تنفيذ commit 2 قبل مراجعة واعتماد هذا التصميم.

---

## 16. اختبارات القبول المستقبلية

### حساب جديد

1. Signup.
2. Email verification.
3. إنشاء profile.
4. إنشاء trial studio.
5. owner membership.
6. subscription = trialing.
7. 10 trial templates.
8. branding إلزامي.

### Trial Limits

1. القوالب العشرة تعمل.
2. القالب الحادي عشر مرفوض من الخادم.
3. Branding لا يمكن إزالته.
4. DevTools لا يمنح PRO.

### Admin Activation

1. Admin يغيّر Trial إلى Pro.
2. نفس الحساب يرى الميزات الجديدة.
3. نفس token يعمل بقدرات جديدة.
4. Audit log يسجل العملية.

### Tokens

1. full token يظهر مرة واحدة.
2. DB تحتوي hash فقط.
3. revoke فوري.
4. rotation يبطل القديم.
5. View لا يتحكم.
6. Control لا يعدل.

---

## 17. المخاطر

1. توسيع `App.tsx` أكثر بدل فصل auth components.
2. كسر Output بسبب ربطه بالهوية البشرية.
3. تجاوز API count.
4. تخزين جلسات حساسة في localStorage.
5. بناء trial قبل email verification.
6. عدم وجود idempotency في provisioning.
7. تمرير خطة المستخدم داخل token.
8. إضافة CAPTCHA على OBS.
9. خلط Firebase Realtime legacy مع Firestore identity.
10. البدء بالدفع قبل entitlements.

---

## 18. التوصية النهائية

ابدأ التنفيذ لاحقًا بـIdentity Foundation فقط، خلف feature flag، وبأقل ملفات ممكنة. لا تنشئ Trial ولا Plans ولا Tokens V2 في نفس commit.

أول commit تنفيذي مقترح بعد اعتماد التصميم:

`feat: add identity foundation behind feature flag`

ولا يبدأ قبل موافقة صريحة.
