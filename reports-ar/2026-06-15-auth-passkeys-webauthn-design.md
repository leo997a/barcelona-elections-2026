# وثيقة تصميم مستقبلية: حسابات حقيقية وPasskeys/WebAuthn

التاريخ: 2026-06-15  
الحالة: خطة مستقبلية فقط، لم يتم تنفيذها في الكود.  
العنوان: مرحلة ثالثة مقترحة للمصادقة الحديثة.

## 1. الهدف

الهدف المستقبلي هو فصل مفهومين:

- مفتاح الترخيص: يحدد حق استخدام المنتج أو الاستوديو.
- حساب المستخدم: يحدد هوية الشخص والجهاز والجلسات وطرق الدخول.

بهذا تصبح تجربة الدخول أقرب للأنظمة العالمية: بريد أو حساب، جلسة آمنة، Passkeys، أجهزة مسجلة، واسترداد منظم، بدل الاعتماد على مفتاح الترخيص ككلمة مرور وحيدة.

## 2. المبادئ

- لا يتم تخزين الأسرار كنص صريح في المتصفح.
- لا يتم تخزين كلمات مرور أو recovery codes كنص صريح في قاعدة البيانات.
- كل challenge يستخدم مرة واحدة وله مدة انتهاء قصيرة.
- الجلسة تكون عبر Cookie آمن:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax` أو `Strict` حسب الحاجة.
- لا يتم استخدام SMS كعامل أساسي.
- Passkeys/WebAuthn تكون المسار المفضل للدخول السريع.
- TOTP يبقى اختياريًا وليس إجباريًا في البداية.

## 3. نموذج الكيانات

الكيانات المقترحة:

- `User`
  - id
  - email
  - displayName
  - createdAt
  - lastLoginAt

- `Studio`
  - id
  - name
  - licenseId

- `StudioMembership`
  - userId
  - studioId
  - role

- `Session`
  - id
  - userId
  - studioId
  - deviceId
  - expiresAt
  - revokedAt

- `WebAuthnCredential`
  - credentialId
  - userId
  - publicKey
  - counter
  - transports
  - deviceName
  - createdAt
  - lastUsedAt

- `AuthChallenge`
  - id
  - userId
  - purpose
  - challengeHash
  - expiresAt
  - usedAt

- `RecoveryCode`
  - id
  - userId
  - codeHash
  - usedAt
  - createdAt

## 4. Register options / register verify

المسارات المقترحة:

- `POST /api/auth/webauthn/register/options`
- `POST /api/auth/webauthn/register/verify`

التدفق:

1. المستخدم يدخل ببريد موثق أو جلسة مؤقتة.
2. الخادم ينشئ challenge قصير العمر.
3. المتصفح يستدعي `navigator.credentials.create`.
4. الخادم يتحقق من attestation/clientData/authenticatorData.
5. يتم تخزين public key والعداد واسم الجهاز.
6. يتم تعليم challenge كـ used.

## 5. Login options / login verify

المسارات المقترحة:

- `POST /api/auth/webauthn/login/options`
- `POST /api/auth/webauthn/login/verify`

التدفق:

1. المستخدم يدخل البريد أو يختار حسابًا محفوظًا.
2. الخادم ينشئ challenge أحادي الاستخدام.
3. المتصفح يستدعي `navigator.credentials.get`.
4. الخادم يتحقق من signature والعداد.
5. يتم إصدار جلسة آمنة عبر Cookie.
6. يتم تحديث `lastUsedAt` للجهاز.

## 6. TOTP اختياري

المسارات المقترحة:

- `POST /api/auth/totp/setup`
- `POST /api/auth/totp/verify-setup`
- `POST /api/auth/totp/verify-login`
- `POST /api/auth/totp/disable`

المبدأ:

- يتم حفظ secret مشفرًا في الخادم أو باستخدام KMS إن توفر.
- لا يتم عرض secret بعد الإعداد.
- TOTP يستخدم كعامل إضافي عند الحاجة، وليس بديلًا عن Passkeys.

## 7. Recovery codes

التصميم:

- توليد 8 إلى 12 كود.
- عرضها مرة واحدة فقط.
- تخزين hash لكل كود.
- عند الاستخدام يتم تعليم الكود كـ used.
- السماح بإعادة توليد مجموعة جديدة بعد تحقق قوي.

## 8. إدارة الأجهزة والجلسات

واجهة مستقبلية داخل الإعدادات:

- قائمة الأجهزة المسجلة.
- آخر استخدام لكل Passkey.
- زر تسمية الجهاز.
- زر إبطال جهاز.
- قائمة الجلسات النشطة.
- زر إبطال جلسة واحدة.
- زر إبطال كل الجلسات عدا الحالية.

## 9. الربط مع مفتاح الترخيص

المفتاح يبقى مسؤولًا عن تفعيل الاستوديو أو ربط الحساب بالاستوديو، لكن بعد الربط:

- المستخدم يدخل بحسابه.
- الترخيص يبقى في الخادم.
- صلاحيات المستخدم تأتي من membership.
- لا يحتاج المستخدم لإدخال مفتاح الترخيص في كل جهاز إذا كان الحساب مخولًا.

## 10. المراحل المقترحة

1. Auth foundation:
   - User
   - Session
   - HttpOnly cookies
   - Membership

2. WebAuthn MVP:
   - register options
   - register verify
   - login options
   - login verify

3. Device management:
   - عرض الأجهزة
   - حذف Passkey
   - إبطال الجلسات

4. TOTP اختياري:
   - setup
   - verify
   - disable

5. Recovery:
   - recovery codes
   - emergency flow

## 11. ما يجب عدم فعله

- لا تستخدم SMS كعامل أساسي.
- لا تخزن مفاتيح أو recovery codes كنص صريح.
- لا تخلط مفتاح الترخيص مع كلمة مرور الحساب.
- لا تنفذ WebAuthn قبل وجود جلسات HttpOnly مستقرة.
- لا تجعل Passkey إلزاميًا قبل وجود recovery flow.

## 12. الخلاصة

هذه المرحلة المستقبلية يجب أن تكون مشروعًا مستقلًا، لا hotfix. البداية الصحيحة هي حسابات وجلسات آمنة، ثم Passkeys، ثم إدارة الأجهزة والاسترداد. تنفيذها الآن داخل hotfix تسجيل الدخول سيكون خطرًا وغير مناسب.

