# إصلاح مفتاح Firebase Admin عبر Base64

تاريخ المرحلة: 2026-06-22

## السبب النهائي

أثبتت Runtime Logs في Hostinger أن إنشاء جلسة الهوية فشل عند:

`admin-init-failed`

وبرمز:

`app/invalid-credential`

والرسالة:

`Failed to parse private key`

هذا يعني أن تسجيل الحساب، البريد، Firebase Client، وNode ليست السبب المباشر. السبب كان تنسيق `FIREBASE_PRIVATE_KEY` داخل Hostinger، حيث وصل إلى Node بصيغة double escaped تحتوي `\\n` بدل صيغة قابلة للتحويل بشكل ثابت.

## الحل

تم إضافة دعم متغير جديد:

`FIREBASE_PRIVATE_KEY_BASE64`

الخادم يقرأ هذا المتغير أولًا ويفكّه إلى PEM حقيقي. إذا لم يكن موجودًا، يرجع إلى `FIREBASE_PRIVATE_KEY` القديم مع دعم كل من:

- `\\n`
- `\n`

## الملفات المعدلة

- `api/_lib/firebaseIdentityAdmin.ts`
  - قراءة `FIREBASE_PRIVATE_KEY_BASE64` أولًا.
  - fallback آمن للمتغير القديم.

- `api/_lib/platformConfig.ts`
  - اعتبار المفتاح مضبوطًا إذا وُجد Base64 أو المتغير القديم.

- `api/_lib/identityDiagnostics.ts`
  - إضافة تشخيص آمن يوضح هل المصدر `base64` أو `plain`.
  - لا يتم تسجيل أي مفتاح أو secret.

## التحقق المحلي

- TypeScript lint عبر `tsc --noEmit`: ناجح.
- Vite build: ناجح.
- Server build عبر `tsc -p tsconfig.server.json`: ناجح.

ملاحظة: تم تشغيل الأوامر عبر `node_modules/.bin` بدل `npm` بسبب قيود PowerShell على `npm.ps1` في هذه البيئة.

## خطوات Hostinger

1. أضف المتغير:
   `FIREBASE_PRIVATE_KEY_BASE64`

2. الصق القيمة التي تم توليدها من service account JSON.

3. احفظ المتغيرات.

4. أعد النشر.

5. جرّب تسجيل الدخول.

6. عند النجاح يجب أن تظهر في Runtime Logs:
   - `admin-init-success`
   - `verify-id-token-success`
   - `auth-time-check-success`
   - `get-user-success`
   - `create-session-cookie-success`
   - `set-cookie-success`

7. بعد ثبوت `authenticated:true` أعد:
   `REO_IDENTITY_DIAGNOSTICS_ENABLED=false`

ثم أعد النشر النهائي.

## Rollback

يمكن الرجوع بحذف `FIREBASE_PRIVATE_KEY_BASE64` والاعتماد على `FIREBASE_PRIVATE_KEY` القديم، لكن الأفضل إبقاء Base64 لأنه يمنع مشاكل escape داخل لوحات الاستضافة.

