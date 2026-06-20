# REO Identity, Trial & Entitlement Platform

## Phase 2B — Trial Studio Provisioning

التاريخ: 2026-06-20
الحالة: مكتملة برمجيًا خلف Feature Flags معطلة افتراضيًا
النطاق: إنشاء بنية Trial Studio فقط، من دون Entitlements أو Tokens V2 أو Payments أو ربط Runtime

---

## 1. الملخص التنفيذي

أضيف مسار آمن وذري لتجهيز استوديو تجريبي بعد نجاح هوية Firebase والجلسة الخادمية. التنفيذ يستخدم نفس `api/platform.ts` حتى يبقى عدد وظائف API ضمن الحد، ويكتب إلى Firestore بواسطة Firebase Admin فقط.

كل شيء معطل افتراضيًا عبر:

- `VITE_REO_TRIAL_PROVISIONING_ENABLED=false`
- `REO_TRIAL_PROVISIONING_ENABLED=false`

عند التفعيل المتزامن للواجهتين، يتم بعد مزامنة ملف المستخدم:

1. إنشاء Studio واحد deterministic للمستخدم.
2. إنشاء Owner Membership.
3. إنشاء اشتراك `trial / TRIALING` لمدة 14 يومًا افتراضيًا.
4. إنشاء 10 Overlay Seed records deterministic.
5. فرض `REO_REQUIRED` و`REO LIVE` داخل بيانات Trial.

لم يتم إنشاء توكنات فعلية ولم يتم ربط هذه السجلات بـOBS أو Output أو Control أو Stream Deck. هذا مقصود حتى لا ننشئ روابط غير آمنة قبل Entitlement Engine وTokens V2.

---

## 2. التشخيص قبل التنفيذ

- المشروع يملك قرابة 90 قالبًا، لكن حالة القوالب الحالية ما زالت تُدار محليًا عبر `syncManager`.
- Smart Token الحالي payload قابل للقراءة من العميل، وليس توكن صلاحيات خادميًا مناسبًا لمنصة عضويات.
- إنشاء Trial Tokens الآن كان سيعطي إحساسًا زائفًا بالحماية ويخلط Phase 2B مع Phase 2C وTokens V2.
- المسار الصحيح هو تخزين Metadata وروابط deterministic غير مفعلة Runtime، ثم تطبيق Entitlements لاحقًا عند نقاط التنفيذ.

---

## 3. نموذج البيانات

ينشئ المسار أو يكمل السجلات التالية داخل transaction واحدة:

- `users/{uid}`
  - `primaryStudioId`
  - `onboardingStatus = TRIAL_READY`
- `studios/{studioId}`
  - `ownerUid`
  - `status = ACTIVE`
  - `trialProvisioned = true`
  - `provisioningVersion = 1`
  - `brandingPolicy = REO_REQUIRED`
  - `templateLimit = 10`
- `studios/{studioId}/members/{uid}`
  - `role = OWNER`
  - `status = ACTIVE`
- `studios/{studioId}/subscription/current`
  - `planId = trial`
  - `status = TRIALING`
  - `trialStartedAt`
  - `trialEndsAt`
  - `provider = manual`
- `studios/{studioId}/overlays/{overlayId}`
  - `templateId`
  - `order`
  - `outputPath`
  - `controlPath`
  - `trialTemplate = true`
  - `brandingRequired = true`
  - `brandingLocked = true`
  - `seedOverrides.channelName = REO LIVE`

لا توجد حقول token أو secrets داخل هذه السجلات.

---

## 4. القوالب التجريبية العشرة

1. `template-lower`
2. `template-exclusive-alert`
3. `template-news`
4. `template-soccer`
5. `template-football-smart-match-stats`
6. `template-leaderboard-ribbon`
7. `template-top-viewers`
8. `template-player-profile`
9. `template-mercato-x6-deal-radar`
10. `template-mercato-x8-global-deal-probability-network`

تم استخدام IDs الحالية دون تغيير أي Template ID.

---

## 5. ضمانات Idempotency والأمان

- `studioId` مشتق deterministic من Firebase UID بواسطة SHA-256، ولا يحتوي البريد أو UID الخام.
- Overlay IDs ثابتة لكل مستخدم وترتيب القالب.
- إعادة الطلب لا تنشئ Studio ثانيًا ولا تضاعف Overlays.
- إذا كان `primaryStudioId` موجودًا وصحيحًا، يعاد استخدامه.
- إذا كان Studio مملوكًا لحساب آخر، تتوقف العملية بخطأ conflict.
- لا يتم تخفيض اشتراك غير Trial أو استبداله بصمت.
- لا يتم تمديد `trialEndsAt` عند إعادة الطلب.
- أي محاولة لتعطيل Branding في seed موجود توقف العملية.
- يجب وجود Identity Profile قبل provisioning.
- يتم قبول `primaryStudioId` بصيغة مقيدة فقط لمنع path injection.
- مدة Trial مقيدة خادميًا بين 1 و30 يومًا.
- كل الكتابات تتم في Firestore transaction واحدة، لذلك لا تبقى حالة نصف مكتملة عند الفشل.
- فشل provisioning ينهي الجلسة الخادمية وجلسة Firebase في الواجهة، لكنه لا يحذف المستخدم أو ملفه أو بياناته.

---

## 6. API

أضيف الإجرائان داخل الوظيفة الحالية فقط:

- `POST /api/platform?action=provision-trial`
- `GET /api/platform?action=studio`

كلاهما يتطلب:

- Identity enabled.
- Server sessions enabled.
- Trial provisioning enabled.
- جلسة `__Host-reo_session` صحيحة وبريدًا مؤكدًا.

الحماية الإضافية:

- Same-origin check وJSON فقط لعملية POST.
- Rate limit: خمس محاولات provisioning في الساعة لكل عنوان.
- Rate limit: 60 قراءة studio في الدقيقة لكل عنوان.
- لا تُرجع الاستجابة أي secret أو Firebase token.

عدد وظائف API بعد التنفيذ: **11 من 12**. لم تتم إضافة endpoint file جديد.

---

## 7. الاختبارات الآلية

نتيجة اختبارات الهوية وTrial: **12 من 12 ناجحة**.

غطت الاختبارات:

- flags معطلة افتراضيًا.
- 10 Template IDs فريدة.
- ثبات studio وoverlay IDs للمستخدم نفسه.
- اختلاف studio بين المستخدمين.
- مدة Trial الافتراضية.
- Branding الإلزامي.
- عدم وجود token material في seed.
- إعادة استخدام Studio موجود.
- رفض Studio ID غير صالح.
- تقييد المدة القصوى إلى 30 يومًا.

نتيجة TypeScript lint: ناجحة.
نتيجة build: ناجحة مع warning bundle size القديم فقط.

---

## 8. اختبار المتصفح والخادم الفعلي

تم تشغيل build الإنتاجي وخادم Node محليًا، ثم التحقق عبر المتصفح الفعلي:

- عند تعطيل Identity وTrial بقيت الواجهة القديمة فعالة.
- لم تظهر Identity Gateway.
- ظهر Logout الخاص بالجلسة القديمة الموجودة في المتصفح.
- لا توجد console errors في الصفحة الرئيسية.
- فتح `/output/phase2b-qa` لم يعرض Login أو Signup.
- Output وصل إلى حالة `Connecting to RGE Cloud...` دون console errors.
- عند تعطيل Identity أعاد platform API: `IDENTITY_DISABLED`.
- في تشغيل معزول به Identity مفعلة وTrial معطلة أعاد provisioning: `TRIAL_PROVISIONING_DISABLED`.

ملاحظة Runtime محلية:

- جهاز التطوير الحالي يستخدم Node `22.11.0`.
- `firebase-admin@14` يسحب `jwks-rsa` الذي يتطلب Node `22.12.0` أو أحدث.
- تم إعلان `engines.node >= 22.12.0` في المشروع.
- شُغل اختبار الخادم محليًا على 22.11 باستخدام خيار التوافق التجريبي فقط لأغراض QA. يجب أن يستخدم Hostinger إصدار Node 22.12 أو أحدث دون هذا الخيار.

لم يُختبر provisioning حقيقي إلى Firestore لأن Firebase staging credentials والمشروع التجريبي غير مفعلة في هذه البيئة. لذلك لا يوجد ادعاء بأن Studio حقيقيًا أُنشئ إنتاجيًا.

---

## 9. ما لم يتغير

لم يتم تعديل:

- OBS runtime.
- Output behavior.
- Control behavior.
- Stream Deck.
- Audio system.
- Renderers.
- Template definitions أو IDs.
- Player Stats Bridge.
- Player Intel V2.
- Live API state.

---

## 10. إعداد التفعيل المستقبلي

بعد تجهيز Firebase staging واختباره:

1. تأكيد Node 22.12 أو أحدث في Hostinger.
2. إضافة Firebase public/admin variables دون نسخها إلى Git.
3. تفعيل Identity وServer Sessions أولًا.
4. تفعيل `REO_TRIAL_PROVISIONING_ENABLED=true` في الخادم.
5. تفعيل `VITE_REO_TRIAL_PROVISIONING_ENABLED=true` في build الواجهة.
6. إنشاء مستخدم تجريبي ببريد مؤكد.
7. التحقق من وجود Studio وMember وSubscription وعشرة Overlays في Firestore.
8. إعادة login للتأكد أن العدد يبقى عشرة وأن `trialEndsAt` لا يتغير.

---

## 11. Rollback

الرجوع الآمن الأول:

- `VITE_REO_TRIAL_PROVISIONING_ENABLED=false`
- `REO_TRIAL_PROVISIONING_ENABLED=false`

هذا يوقف Phase 2B فورًا دون تعطيل نظام الترخيص القديم أو حذف البيانات.

للرجوع البرمجي الكامل يمكن revert للـcommit الخاص بـPhase 2B. لا تحذف سجلات Firestore يدويًا قبل أخذ نسخة احتياطية ومراجعة ملكية Studio.

---

## 12. المرحلة التالية

Phase 2C هي Entitlement Engine، لكنها لم تبدأ هنا. قبلها يجب إجراء اختبار Firebase staging حقيقي لـPhase 2A وPhase 2B. Tokens V2 وPlans وPayments وRoles خارج هذا الـcommit.
