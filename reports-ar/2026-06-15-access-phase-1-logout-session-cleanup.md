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

زر "إلغاء الترخيص" في Settings لم يعد ينفذ منطقًا منفصلًا:

- أصبح يستدعي `sessionService.logout()`.
- لم يعد يستخدم reload مباشرًا كحل وحيد.

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
- في أداة المتصفح الداخلية، تبويب واحد أعطى DOM فارغًا بعد Back بسبب مشكلة في harness، لكن تبويب جديد وrefresh بعد إزالة التخزين أثبتا أن الجلسة لا تعود.

### تعدد التبويبات

تم تنفيذ آلية التزامن بالكود عبر `rge_logout_at` وحدث `storage`.

لم يكتمل اختبار التبويبين آليًا بالكامل لأن أداة المتصفح الداخلية رفضت الإدخال لاحقًا بسبب مشكلة `Browser Use virtual clipboard is not installed`. لم يتم الالتفاف على سياسة المتصفح. يلزم اختبار يدوي سريع:

1. افتح تبويبين للتطبيق.
2. سجل الدخول.
3. اضغط Logout من التبويب الأول.
4. يجب أن ينتقل التبويب الثاني إلى شاشة الدخول أو يفقد حالة المستخدم القديمة عند أول تفاعل/refresh.

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
