# REO IDENTITY STAGING - CREATE SESSION ROOT CAUSE INVESTIGATION

تاريخ المرحلة: 2026-06-21

## الملخص التنفيذي

المشكلة الظاهرة للمستخدم هي:

`تعذر التحقق من جلسة الحساب`

مع بقاء:

- `GET /api/platform?action=me` يعيد `authenticated:false`
- تسجيل Firebase من جهة المتصفح يعمل
- تأكيد البريد يعمل
- إنشاء جلسة الخادم لا يكتمل

النتيجة التقنية قبل هذه المرحلة: مسار `create-session` كان يبتلع كل أخطاء Firebase Admin داخل رسالة عامة واحدة `AUTHENTICATION_FAILED`. لذلك لم يكن ممكنًا إثبات هل الفشل في:

- إعدادات Firebase Admin
- صيغة المفتاح الخاص
- `verifyIdToken`
- شرط `auth_time`
- `getUser`
- `createSessionCookie`
- كتابة `Set-Cookie`

هذه المرحلة لم تفعل Trial ولم تلمس OBS أو Output أو Control أو Stream Deck أو القوالب أو الصوت.

## ما تم تنفيذه

أضيف تشخيص آمن خلف الفلاج:

`REO_IDENTITY_DIAGNOSTICS_ENABLED=false`

الفلاج معطل افتراضيًا. عند تفعيله فقط، يسجل الخادم مراحل آمنة في Runtime logs، ويرجع للمتصفح `diagnosticId` فقط عند خطأ `create-session`.

## مراحل التشخيص الجديدة

المراحل المسجلة الآن:

- `identity-flags-disabled`
- `identity-env-missing`
- `create-session-start`
- `read-json-body`
- `id-token-received`
- `admin-init-start`
- `admin-init-success`
- `verify-id-token-start`
- `verify-id-token-success`
- `auth-time-check`
- `auth-time-check-failed`
- `auth-time-check-success`
- `get-user-start`
- `get-user-success`
- `create-session-cookie-start`
- `create-session-cookie-success`
- `set-cookie-start`
- `set-cookie-success`
- `<stage>-failed`
- `create-session-handler-failed`

## الحقول الآمنة في Runtime logs

التشخيص يسجل فقط مؤشرات لا تكشف الأسرار:

- `diagnosticId`
- `stage`
- `nodeVersion`
- `identityEnabled`
- `serverSessionsEnabled`
- `firebaseProjectIdConfigured`
- `firebaseClientEmailConfigured`
- `firebasePrivateKeyConfigured`
- `firebasePrivateKeyLength`
- `firebasePrivateKeyHasBeginMarker`
- `firebasePrivateKeyHasEndMarker`
- `firebasePrivateKeyContainsLiteralBackslashN`
- `firebasePrivateKeyContainsDoubleEscapedBackslashN`
- `firebasePrivateKeyContainsRealNewline`
- `firebasePrivateKeyHasOuterQuotes`
- `firebaseProjectIdHashPrefix`
- `firebaseClientEmailDomain`
- `webTokenAudience`
- `webTokenIssuer`
- `tokenEmailVerified`
- `tokenAuthTimeAgeSeconds`
- `tokenIssuedAtSkewSeconds`
- `tokenExpiresInSeconds`
- `tokenUidPrefix`
- `firebaseErrorName`
- `firebaseErrorCode`
- `sanitizedFirebaseErrorMessage`

لا يتم تسجيل:

- التوكن الكامل
- المفتاح الخاص
- البريد الكامل للحساب الخدمي
- رابط أو secret كامل
- session cookie

## نتيجة الاختبار المحلي

تم تنفيذ smoke test محلي بعد البناء:

1. مع Firebase Admin env ناقص:
   - النتيجة: `503 IDENTITY_NOT_CONFIGURED`
   - المتصفح يستلم `diagnosticId` فقط
   - Runtime log يوضح أن `firebaseProjectIdConfigured=false` و`firebasePrivateKeyConfigured=false`

2. مع env شكلي وطلب بدون `idToken`:
   - النتيجة: `400 ID_TOKEN_REQUIRED`
   - المتصفح يستلم `diagnosticId` فقط
   - Runtime log يوضح `idTokenProvided=false`

ملاحظة: الاختبار المحلي احتاج `--experimental-require-module` لأن Node المحلي هو `v22.11.0` بينما المشروع يطلب `>=22.12.0`.

## ما لم يتم إثباته بعد

لم يتم إثبات السبب الحي النهائي على Hostinger في هذه المرحلة لأن التشخيص يجب أن يُنشر أولًا، ثم يتم تشغيل محاولة تسجيل دخول واحدة لإنتاج `diagnosticId` حقيقي من Runtime logs.

بعد النشر، السبب الحقيقي سيظهر من أول مرحلة تفشل:

- إذا فشل عند `identity-env-missing`: متغيرات Firebase Admin ناقصة في Hostinger.
- إذا فشل عند `admin-init-failed`: صيغة service account أو private key غير صالحة.
- إذا فشل عند `verify-id-token-failed`: توكن المتصفح لا يطابق مشروع Firebase Admin أو issuer/audience غير متوافق.
- إذا فشل عند `auth-time-check-failed`: التوكن قديم أكثر من 5 دقائق ويحتاج إعادة تسجيل دخول.
- إذا فشل عند `create-session-cookie-failed`: مشكلة إنشاء session cookie من Firebase Admin.
- إذا نجح حتى `set-cookie-success` ثم بقي `me=false`: مشكلة كوكي/دومين/HTTPS/SameSite أو عدم إرسال الكوكي لاحقًا.

## طريقة الاختبار الحي بعد النشر

1. اضبط مؤقتًا في Hostinger:
   - `REO_IDENTITY_DIAGNOSTICS_ENABLED=true`

2. أعد نشر نفس commit.

3. افتح الموقع وسجل الدخول مرة واحدة.

4. إذا ظهر الخطأ في الواجهة، انسخ `diagnosticId` فقط.

5. افتح Runtime logs في Hostinger وابحث عن نفس `diagnosticId`.

6. المرحلة التي تنتهي بـ `-failed` هي سبب الفشل الفعلي.

7. بعد جمع السبب:
   - أعد `REO_IDENTITY_DIAGNOSTICS_ENABLED=false`
   - أعد النشر أو أعد تشغيل التطبيق.

## التحقق

- TypeScript lint: ناجح.
- Build: ناجح.
- Identity tests: ناجحة، 16/16.
- Smoke test للتشخيص: ناجح.
- عدد ملفات API المباشرة داخل `api/`: 8.

## Rollback

للرجوع:

1. أزل `REO_IDENTITY_DIAGNOSTICS_ENABLED` أو اتركه `false`.
2. ارجع commit التشخيص إذا لزم الأمر.
3. لا توجد تغييرات على Trial أو OBS أو Output أو Control أو Stream Deck أو القوالب أو الصوت.

