# REO IDENTITY, TRIAL & ENTITLEMENT PLATFORM

## PHASE 2A — IDENTITY FOUNDATION

التاريخ: 2026-06-20

الحالة: منجزة برمجيًا خلف Feature Flags مغلقة افتراضيًا. لم يتم تفعيل الهوية في Production.

---

## 1. الحالة قبل التنفيذ

- النظام الإنتاجي يعتمد على License Gate بالبريد ومفتاح الدخول.
- مشروع Firebase المضمّن في `services/firebase.ts` هو `unoreo` ويخدم Realtime Database للمزامنة القديمة.
- مسار Firebase القديم مغلق افتراضيًا ويستخدم Anonymous Auth عند تفعيله فقط.
- لم يكن Firebase Email/Password Auth موجودًا في واجهة REO.
- لم يكن Firebase Admin SDK موجودًا في الخادم.
- لم يكن Firestore مستخدمًا في التطبيق.
- عدد API functions قبل المرحلة: 10.

حالة متغيرات الهوية محليًا قبل التنفيذ، دون قراءة أو طباعة قيم:

```text
VITE_FIREBASE_API_KEY = EMPTY
VITE_FIREBASE_AUTH_DOMAIN = EMPTY
VITE_FIREBASE_PROJECT_ID = EMPTY
FIREBASE_PROJECT_ID = EMPTY
FIREBASE_CLIENT_EMAIL = EMPTY
FIREBASE_PRIVATE_KEY = EMPTY
```

لا يمكن إثبات Authorized Domains أو تفعيل Email/Password وFirestore من المستودع وحده.

---

## 2. قرار مشروع Firebase

```text
Firebase Project Decision:
- prepare separate staging project
```

السبب:

- مشروع `unoreo` مرتبط بمزامنة قديمة وبيانات تشغيلية.
- خلط حسابات المستخدمين الجديدة مع مشروع المزامنة يزيد خطر كسر البث أو قواعد RTDB.
- Phase 2A لا تنشئ مشروعًا تلقائيًا ولا تنقل بيانات.
- التفعيل يجب أن يبدأ في Staging مستقل بعد إعداد Authorized Domains وEmail/Password وFirestore.

---

## 3. Feature Flags

أضيفت القيم التالية في `.env.example` فقط:

```text
VITE_REO_IDENTITY_ENABLED=false
REO_IDENTITY_ENABLED=false
REO_SERVER_SESSIONS_ENABLED=false
```

السلوك عند `false`:

- License Gate القديم يبقى المسار الفعلي.
- لا يتم تهيئة Firebase Auth الجديد.
- لا يتم تحميل Auth Gateway أو حزمة Firebase Auth الجديدة.
- Output وOBS لا يريان أي Login Gate.
- `/api/platform` يعيد `IDENTITY_DISABLED` ولا ينشئ جلسات.

الحالة النهائية للإنتاج: جميع الأعلام مغلقة.

---

## 4. الملفات البرمجية

أضيفت أو عدلت وحدات الهوية التالية:

- `components/auth/AuthGateway.tsx`
- `components/auth/LoginForm.tsx`
- `components/auth/SignupForm.tsx`
- `components/auth/VerifyEmailView.tsx`
- `components/auth/ForgotPasswordForm.tsx`
- `components/auth/LegacyLicenseGate.tsx`
- `services/auth/identityConfig.ts`
- `services/auth/firebaseAuthClient.ts`
- `services/auth/serverSessionService.ts`
- `services/auth/identitySessionService.ts`
- `types/auth.ts`
- `api/platform.ts`
- `api/_lib/firebaseIdentityAdmin.ts`
- `api/_lib/platformConfig.ts`
- `api/_lib/platformSecurity.ts`
- `server/server.ts`
- `App.tsx`
- `.env.example`
- `firebase/firestore.staging.rules`
- `tests/platform-security.test.mjs`
- `package.json`
- `package-lock.json`

لم يتم تعديل renderers أو Output أو Control أو Stream Deck أو القوالب أو الصوت أو Player Stats.

---

## 5. تدفقات Auth

تم تجهيز التدفقات التالية عند تفعيل Staging:

- إنشاء حساب بالبريد وكلمة المرور.
- تسجيل الدخول.
- إرسال رسالة تأكيد البريد.
- إعادة إرسال رسالة التأكيد مع cooldown لمدة 60 ثانية.
- منع الحساب غير الموثق من دخول الاستوديو.
- إعادة تحميل حالة المستخدم بعد فتح رابط التحقق.
- إرسال Password Reset برسالة عامة لا تكشف وجود البريد.
- تسجيل الخروج من Firebase Client ومن Session Cookie.
- استعادة الحساب من Session Cookie عند Reload.
- مزامنة Logout بين التبويبات عبر event ومفتاح إشعار زمني مخصص للهوية.
- إبقاء Legacy License Access داخل بوابة الهوية.

حقول Chrome Password Manager:

- Login email: `type=email`, `name=username`, `autocomplete=username`.
- Login password: `type=password`, `name=password`, `autocomplete=current-password`.
- Signup password: `autocomplete=new-password`.
- النماذج حقيقية وتدعم Enter وأزرار إظهار/إخفاء كلمة المرور.
- لا يتم تخزين كلمة المرور في localStorage أو IndexedDB من كود REO.

---

## 6. Session Cookie والخادم

تمت إضافة route واحدة فقط:

```text
/api/platform
```

Actions:

- `POST ?action=create-session`
- `POST ?action=destroy-session`
- `GET ?action=me`
- `POST ?action=sync-user-profile`

خصائص الكوكي:

```text
Name=__Host-reo_session
HttpOnly
Secure
SameSite=Lax
Path=/
Max-Age=1..14 days, default 7
```

ضمانات `create-session`:

- تحقق Firebase Admin من ID Token مع فحص الإبطال.
- رفض الحساب Disabled.
- رفض البريد غير الموثق.
- رفض token إذا كان `auth_time` أقدم من خمس دقائق عند إنشاء الجلسة.
- عدم إعادة ID Token أو Session Cookie في JSON.

`destroy-session` يمسح Session Cookie فقط ولا يلغي License أو الأجهزة أو activations.

---

## 7. CSRF وRate Limiting

طلبات POST الحساسة تتطلب:

- `Origin` مطابقًا لـHost الفعلي.
- `Content-Type: application/json`.
- لا يوجد Logout عبر GET.

حدود الخادم الحالية:

- create-session: 10 محاولات لكل IP خلال 10 دقائق.
- destroy-session: 20 محاولة لكل IP خلال دقيقة.
- sync-user-profile: 30 محاولة لكل IP خلال دقيقة.

حماية Signup الإضافية:

- تطبيع البريد.
- Honeypot صامت.
- رفض الإرسال الآلي الأسرع من 900ms.
- الاعتماد على حماية Firebase Auth مع cooldown محلي لإعادة إرسال التحقق.
- لم تتم إضافة CAPTCHA أو Turnstile أو reCAPTCHA.

---

## 8. Firestore User Profile

المسار المجهز:

```text
users/{uid}
```

الحقول:

- uid
- email
- emailLower
- displayName
- photoURL
- emailVerified
- status
- createdAt
- updatedAt
- lastLoginAt
- onboardingStatus

القيم الأولية التي يحددها الخادم فقط:

```text
status=ACTIVE
onboardingStatus=IDENTITY_READY
```

المزامنة transaction idempotent:

- لا تنشئ document مكررًا.
- لا تعيد كتابة `createdAt` بعد الإنشاء.
- تحدث `updatedAt` و`lastLoginAt` بـServer Timestamp.
- لا تقبل `status` أو `role` من العميل.

تمت إضافة `firebase/firestore.staging.rules` كمقترح غير منشور: القراءة للمستخدم الموثق لملفه فقط، والكتابة محظورة من العميل لأن الكتابة تمر عبر Admin SDK.

---

## 9. الاختبارات

### Unit

`npm run test:identity`:

- 6 اختبارات ناجحة.
- Email normalization.
- Profile sanitizer.
- Same-origin validation.
- JSON content-type validation.
- Fixed-window rate limiter.
- Feature flags default disabled.

### Static/Build

- `npm run lint`: ناجح.
- `npm run build`: ناجح.
- تحذير Vite الخاص بحجم main chunk ما زال موجودًا وليس فشلًا.
- Auth Gateway أصبح lazy chunk منفصلًا.

### Browser QA فعلي

تم الاختبار في متصفح Codex على نسخة الإنتاج المحلية:

1. العلم مغلق: ظهر License Gate القديم فقط.
2. حقول License Gate احتفظت بـ`username/current-password`.
3. لا يوجد Vite error overlay أو Console errors.
4. العلم مفعّل محليًا دون Firebase env: ظهرت بوابة Identity ورسالة فشل آمنة.
5. Legacy Access بقي قابلًا للفتح والعمل.
6. Output مع العلم مغلق ومفعّل محليًا لم يعرض License Gate أو Identity Gate.
7. `/api/platform?action=me` عند إغلاق أعلام الخادم أعاد 404 JSON برمز `IDENTITY_DISABLED`.

لم يتم اختبار Signup/Login حقيقيان لأن مشروع Firebase Staging والمتغيرات وAuthorized Domains غير مجهزة بعد. لا يوجد ادعاء بنجاح اتصال Firebase حي.

---

## 10. عدد API Functions

- قبل المرحلة: 10.
- بعد المرحلة: 11.
- الحد: 12.
- تمت إضافة function واحدة فقط: `api/platform.ts`.

---

## 11. مراجعة أمنية

- لا توجد أسرار أو Service Account JSON في Git.
- `.env.example` يحتوي أسماء ومتغيرات فارغة فقط.
- لا تطبع الخدمات ID Token أو Session Cookie أو private key.
- Session Cookie لا يمكن لJavaScript قراءتها.
- Firestore profile لا يقبل role/status من العميل.
- npm audit بعد إضافة Firebase Admin: 12 نتيجة، منها 4 High و7 Moderate و1 Low، دون Critical.
- High الحالية تشمل direct dependencies `vite` و`ws` وtransitive dependencies `@grpc/grpc-js` و`picomatch`.
- لم يتم تشغيل `npm audit fix --force` لأنه تغيير واسع وخارج نطاق Phase 2A؛ يسجل كمرحلة صيانة Dependencies منفصلة.

---

## 12. Checklist تفعيل Staging

1. إنشاء Firebase project منفصل للـStaging.
2. تفعيل Email/Password provider.
3. إضافة نطاق Hostinger التجريبي إلى Authorized Domains.
4. إنشاء Firestore في Staging.
5. مراجعة ونشر `firebase/firestore.staging.rules` يدويًا.
6. إنشاء Service Account مخصص بأقل صلاحيات لازمة.
7. إضافة المتغيرات إلى Hostinger دون رفع JSON إلى Git.
8. تفعيل أعلام الخادم والواجهة في Staging فقط.
9. إعادة النشر.
10. اختبار Signup وVerification وLogin وReset وReload وLogout وتبويبين.

---

## 13. ما لم يتم تنفيذه

لم تبدأ:

- Phase 2B أو Trial Studio.
- Plans أو Subscription أو Payments.
- Entitlement Engine.
- Memberships أو Invitations.
- Tokens V2.
- Admin Users Console.
- Passkeys أو TOTP أو Recovery Codes.
- نقل `rge_admin_session`.
- أي تغيير في Player Stats أو Player Intel أو Smart Control Room.
- أي تغيير في OBS أو Output أو Control أو Stream Deck أو renderers أو القوالب أو الصوت.

---

## 14. Rollback

1. إبقاء الأعلام الثلاثة `false` يعطل الهوية الجديدة دون التأثير على النظام الحالي.
2. Revert للـcommit بعنوان `feat: add identity foundation behind feature flag` يزيل الكود كاملًا.
3. حذف متغيرات Firebase Staging من Hostinger بعد rollback إن كانت أضيفت.
4. لا حاجة لتغيير مشروع `unoreo` لأنه لم يتم تعديله.

---

## 15. Git وPush

- commit المقصود: `feat: add identity foundation behind feature flag`.
- SHA: هو SHA للـcommit الحامل لهذا التقرير، ويعرض صراحة بعد الدفع لأن commit لا يمكنه تضمين بصمته الذاتية.
- Push result: يسجل في الملخص النهائي بعد تنفيذ `git push origin main`.
- Production flag status: `false` لجميع أعلام الهوية.
