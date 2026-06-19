# REO ACCESS & MEMBERSHIP FOUNDATION — Phase 1

## Logout & Session Cleanup

التاريخ: 2026-06-15  
النطاق: إغلاق Phase 0 إنتاجيًا ثم تنفيذ Phase 1 فقط لخروج المستخدم وتنظيف الجلسة.

---

## 1. إغلاق Phase 0 إنتاجيًا

تم تثبيت حالة Phase 0 قبل أي تعديل متعلق بالخروج.

### حالة commit

- `HEAD`: `f660a9b`
- `origin/main`: `f660a9b`
- محاولة تأكيد نفس الـ commit من واجهة Hostinger نفسها تعذرت لأن صفحة hPanel طلبت تسجيل دخول. لم يتم إدخال أي بيانات دخول داخل Hostinger.

### اختبار endpoint الحي

تم اختبار:

- Robert Lewandowski
- Lamine Yamal
- Cole Palmer
- لاعب غير موجود
- طلب بدون player

النتيجة الحية لكل الحالات:

| الحالة | النتيجة |
|---|---|
| `bridgeConfigured` | `true` |
| `bridgeUrlEnvConfigured` | `true` |
| `bridgeUrlDefaultUsed` | `false` |
| `bridgeTokenConfigured` | `true` |
| `upstreamAttempted` | `true` |
| `upstreamStatus` | `200` |
| `responseMode` | `bridge` |
| `auth.valid` | `true` |
| `realDataAvailable` | `true` |
| `dataStatus` | `ready` |
| `source` | `REO Player Stats Bridge` |

لم يتم طباعة رابط الجسر الكامل، ولم يتم طباعة التوكن أو أي secret.

الخلاصة: Phase 0 مجمدة وظيفيًا. لم يتم تعديل `api/player-stats.ts` أو الجسر في هذه المرحلة.

---

## 2. Discovery لنظام الدخول الحالي

النظام الحالي ليس Membership System كاملًا. هو License Gate:

- شاشة الدخول في `App.tsx`.
- التحقق يتم عبر `licenseService.activate()` إلى `/api/license`.
- حالة الترخيص تحفظ في `localStorage` باسم `rge_license_v1`.
- البريد يحفظ في `rge_license_email`.
- جلسة Vault/Admin تحفظ في `rge_admin_session`.
- Firebase الموجود في `syncManager` يستخدم للمزامنة الاختيارية، وليس Auth Provider لحسابات المستخدمين في هذه المرحلة.

المشكلة قبل الإصلاح:

- زر الإلغاء كان موجودًا داخل Settings فقط.
- كان يمسح الترخيص ثم يعمل `window.location.reload()`.
- لم يكن يمسح بريد الدخول.
- لم يكن يمسح جلسة المسؤول.
- لم يكن يزامن logout بين التبويبات.
- لم تكن هناك نقطة مركزية واحدة للخروج.

---

## 3. ما تم تنفيذه

### خدمة خروج مركزية

أضيفت `services/sessionService.ts` لتكون نقطة واحدة للخروج:

- تستدعي `licenseService.revoke()`.
- تمسح `rge_license_email`.
- تمسح `rge_admin_session`.
- لا تستخدم `localStorage.clear()`.
- لا تستخدم `sessionStorage.clear()`.
- ترسل حدثًا داخليًا `reo:session-logout`.
- تكتب إشارة غير سرية `rge_logout_at` لتزامن التبويبات.

### ربط App

تم ربط `App.tsx` بالخدمة المركزية:

- عند logout يتم تصفير حالة الترخيص من الذاكرة.
- يتم مسح حقل المفتاح والبريد من الواجهة.
- يتم الرجوع إلى شاشة الدخول.
- يتم استخدام `history.replaceState` لتقليل رجوع صفحة محمية بزر Back.
- تم وضع guard يمنع حدث logout من تغيير صفحات `/output/...` حتى لا يتأثر OBS أو روابط العرض.

### زر Logout واضح

تمت إضافة زر خروج في `Sidebar`:

- يظهر للمستخدم المسجل.
- يعرض حالة loading.
- يمنع الضغط المتكرر أثناء التنفيذ.
- يعرض رسالة خطأ مفهومة عند الفشل.

### Settings

زر Settings أصبح يوضح أنه خروج محلي من الجهاز، وليس إلغاء ترخيص:

- أصبح يستدعي `sessionService.logout()`.
- لم يعد يستخدم reload مباشرًا كحل وحيد.
- النص المعروض: "تسجيل الخروج من هذا الجهاز".
- الوصف المعروض: "سيتم إنهاء الجلسة المحلية فقط، ولن يتم إلغاء مفتاح الترخيص."

---

## 3.1 مراجعة نهائية قبل الدفع

تمت مراجعة `licenseService.revoke()` قبل الدفع:

- التنفيذ محلي فقط: يحذف `rge_license_v1` من `localStorage`.
- لا يرسل أي طلب إلى `/api/license`.
- لا يعطل الجهاز.
- لا يلغي مفتاح الترخيص.
- لا يؤثر في عدد activations أو أجهزة أخرى.
- لا يوجد remote failure path لأن `revoke()` ليس طلبًا شبكيًا.

قرار المراجعة: لا يوجد Blocking متعلق بإلغاء الترخيص، لكن تم تغيير نص Settings حتى لا يوحي بأن الزر يلغي المفتاح.

---

## 4. ما لم يتم لمسه

لم يتم تعديل:

- Player Stats Bridge.
- OBS Output.
- Control routes.
- Stream Deck.
- القوالب.
- الصوت.
- نظام العضويات.
- الخطط أو الدفع.
- الصلاحيات التجارية.
- أي endpoint جديد.

---

## 5. الاختبارات

### أوامر المشروع

- `npm run lint`: ناجح.
- `npm run build`: ناجح.

ملاحظة: يوجد تحذير bundle size قديم من Vite، لكنه ليس فشل build.

### اختبار المتصفح المحلي

تم تشغيل build محليًا على:

`http://127.0.0.1:4178`

تم تنفيذ:

1. فتح شاشة الدخول.
2. إنشاء مفتاح اختبار محلي داخل الذاكرة فقط، دون طباعته.
3. تسجيل الدخول عبر form الحقيقي.
4. التأكد من ظهور التطبيق وزر `REO Access`/logout.
5. الضغط على Logout من الـ Sidebar.
6. التأكد من الرجوع إلى شاشة الدخول.
7. إعادة فتح تبويب جديد بعد logout والتأكد أنه يبدأ من شاشة الدخول ولا يعرض التطبيق.

### Back / Refresh

- بعد logout لم يرجع التطبيق إلى شاشة محمية.

### تعدد التبويبات

تم تنفيذ اختبار Chrome فعلي بتبويبين:

- تسجيل الدخول في التبويب الأول نجح.
- فتح تبويب ثان لنفس التطبيق أظهر الجلسة النشطة.
- الضغط على Logout من التبويب الأول أخرج التبويب الثاني أيضًا.
- إعادة الدخول بعد وجود `rge_logout_at` القديم نجحت.
- Refresh بعد إعادة الدخول لم يسبب logout جديدًا أو redirect loop.

### Output / OBS

تم اختبار مسار Output مشابه لاستخدام OBS:

- فتح `/output/review-output-chrome` لم يعرض License Gate.
- بعد Logout من لوحة التطبيق بقي Output يعمل.
- بعد Refresh لصفحة Output بقي المسار خارج License Gate.
- فقدان `localStorage` لا يمنع تحميل Output لأن `App.tsx` يعيد `LiveOutputView` قبل License Gate عند وجود `/output/...`.

### Deep Link بعد Logout

تم اختبار رابط محمي مباشر:

- فتح `/#/Operator` بعد logout أعاد شاشة الدخول.
- Refresh لنفس الرابط بقي على شاشة الدخول.
- لم يظهر محتوى صفحة محمية قبل شاشة الدخول في الاختبار.

---

## 5.1 Backlog المسجل من المراجعة

### `rge_admin_session`

`rge_admin_session` ليس flag بسيطًا. هو JWT محفوظ في `localStorage`، يحتوي payload فيه:

- `role`
- `scope`
- `iat`
- `exp`

السيرفر يتحقق منه عبر `/api/admin/session` وواجهات الإدارة. هذا مسجل كـ Phase 2 backlog لتحسين نموذج الجلسة لاحقًا، دون بناء Roles أو Membership في هذه المرحلة.

### Player Stats Input Validation & Not-Found Semantics

أثناء مراجعة Phase 0، حالتا اللاعب غير الموجود وطلب بدون player أعادتا `200/ready/realDataAvailable=true`. هذا مسجل كـ backlog مستقل لأن دلالات not-found تحتاج إصلاحًا لاحقًا. لم يتم تعديل Player Stats في Phase 1.

---

## 6. عدد API Functions

عدد ملفات API الحالية خارج `_lib`:

`10`

العدد ما زال أقل من حد 12.

---

## 7. Rollback

للتراجع عن هذه المرحلة:

1. أعد `App.tsx` إلى النسخة السابقة.
2. أعد `components/Sidebar.tsx` إلى النسخة السابقة.
3. أعد `pages/Settings.tsx` إلى النسخة السابقة.
4. احذف `services/sessionService.ts`.

لا توجد migrations أو endpoints جديدة.

---

## 8. قرار المرحلة

Phase 1 نفذت كتغيير صغير ومحافظ:

- لا Membership.
- لا Payment.
- لا Roles جديدة.
- لا تغييرات في البث أو القوالب.
- لا أسرار في diff أو logs.

المرحلة جاهزة للمراجعة قبل push.
