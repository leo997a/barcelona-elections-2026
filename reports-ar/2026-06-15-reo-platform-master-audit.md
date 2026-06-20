# REO IDENTITY, TRIAL & ENTITLEMENT PLATFORM

## Master Audit — حقيقة المشروع الحالية

التاريخ: 2026-06-20
المسار المطلوب: `reports-ar/2026-06-15-reo-platform-master-audit.md`
الحالة: تقرير تدقيق وتصميم فقط، دون تعديل كود إنتاجي.

---

## 1. الملخص التنفيذي

المشروع أصبح يعمل كمنصة بث عملية على Hostinger بعد الخروج من حدود Vercel Hobby. الحالة الحالية مستقرة كأداة تشغيل داخلية تعتمد على:

- مفتاح ترخيص محلي.
- تخزين جلسة محلية داخل المتصفح.
- Live API على Hostinger.
- Output عبر `/output/...` مع SSE وpolling fallback.
- Player Stats Bridge منفصل يعمل حيًا.
- Stream Deck عبر Smart Token وLive API.

لكن المشروع ليس بعد منصة عضويات حقيقية. لا يوجد حتى الآن:

- حساب مستخدم حقيقي بالبريد وكلمة المرور عبر Firebase Authentication.
- Studio مستقل منشأ تلقائيًا لكل مستخدم.
- Trial provisioning.
- Entitlement Engine مركزي.
- خطط واشتراكات محسوبة من الخادم.
- جلسة HttpOnly server session.
- لوحة إدارة عضويات.

التقييم العام الحالي:

- كأداة تشغيل داخلية: **82/100**.
- كمنصة SaaS خارجية بعضويات وتجربة مجانية: **42/100**.

سبب الفرق أن طبقة البث والقوالب قطعت شوطًا كبيرًا، بينما الهوية والاستحقاقات لا تزال في مرحلة License Gate محلي.

---

## 2. دليل Git والنشر الحالي

- `HEAD`: `d9c1377d4708e6e2aeeefaf885b6d2e1d98afdd2`
- `origin/main`: `d9c1377d4708e6e2aeeefaf885b6d2e1d98afdd2`
- آخر commit: `fix: clarify local logout wording`
- Hostinger live app: `https://peachpuff-herring-712997.hostingersite.com/`
- اختبار root: `200 text/html` بدون Bot Challenge.
- اختبار `/output/review-output-chrome`: `200 text/html` بدون Bot Challenge.
- اختبار `/api/player-stats`: `200 application/json`، `responseMode=bridge` للثلاثة لاعبين الأساسيين.
- عدد API routes الفعلية بدون `_lib`: **10**.

الـAPI routes الحالية:

1. `api/ai.ts`
2. `api/license.ts`
3. `api/live.ts`
4. `api/player-intel-v2.ts`
5. `api/player-stats.ts`
6. `api/reo-match.ts`
7. `api/stream.ts`
8. `api/admin/session.ts`
9. `api/admin/secrets.ts`
10. `api/sportmonks/player.ts`

هذا يعني أن أي توسعة هوية جديدة يجب أن تتم داخل router موحد أو backend دائم، وليس بإضافة endpoints كثيرة.

---

## 3. جدول الحقيقة الحالي

| الميزة | الحالة | الدليل البرمجي | الدليل الحي | المتبقي | المخاطر |
|---|---|---|---|---|---|
| License Gate | يعمل | `App.tsx` يستخدم `licenseService.getStored()` و`/api/license` | شاشة الدخول تظهر عند عدم وجود ترخيص | استبداله لاحقًا بهوية حقيقية دون كسر المفاتيح القديمة | الاعتماد على localStorage لا يصلح كمنصة خارجية |
| Logout Phase 1 | منجز | `services/sessionService.ts` يمسح مفاتيح REO فقط ويطلق `rge_logout_at` | commit `d9c1377` منشور ومطابق لـ`origin/main` | توثيق الإغلاق في تقرير مستقل | `rge_admin_session` ما زال JWT محليًا |
| Chrome Password Manager | منجز | `App.tsx` يحتوي form حقيقي مع `autocomplete=username/current-password` | مثبت سابقًا في تقرير المرحلة | الانتقال لاحقًا إلى Firebase Auth | ما زالت كلمة الدخول هي مفتاح ترخيص لا حساب حقيقي |
| Player Stats Bridge | يعمل | `api/player-stats.ts` يحتوي diagnostics و`responseMode=bridge` | Robert/Lamine/Cole يرجعون `auth.valid=true` و`realDataAvailable=true` | إصلاح not-found semantics لاحقًا | unknown/missing player يرجعان 200 و`realDataAvailable=true` |
| Main Hostinger App | يعمل | `server/server.ts` يقدم Vite dist ويربط API routes | root وOutput وPlayer Stats تعمل | مراقبة الأداء بعد الاستخدام الطويل | bundle كبير فوق 2MB |
| Output/OBS | يعمل | `App.tsx` يعزل `/output/` عن License Gate ويستخدم SSE | `/output/...` يرجع HTML بدون challenge | اختبار OBS طويل عند كل إصدار كبير | إذا ظهرت حماية خارجية عامة قد تكسر OBS |
| Control links | يعمل مبدئيًا | `syncManager.getControlUrl()` و`/control/:id` | لم يتم تغييره في هذه المرحلة | لاحقًا ربطه بـDynamic Token V2 | التحكم الحالي ليس entitlement-aware |
| Stream Deck | يعمل عبر Live API | `pages/Integrations.tsx` و`utils/smartToken.ts` | لم يتم تغييره في هذه المرحلة | لاحقًا Smart Actions V2 حسب القالب والخطة | التوكن الحالي يحمل قدرات وصفية أكثر من كونه server entitlement |
| Firebase Sync | Legacy/Fallback | `services/syncManager.ts` يقول Output يستخدم `/api/stream + /api/live` وFirebase legacy | غير مطلوب في الاختبار الحالي | إعادة تعريف Firebase كهوية وتخزين، لا كمسار تحكم افتراضي | خلط Firebase القديمة مع Firebase Auth الجديدة |
| Admin Session | موجودة لكنها انتقالية | `services/adminSession.ts` يخزن `rge_admin_session` في localStorage | مستخدمة في Settings/Editor | استبدالها بجلسة HttpOnly لاحقًا | JWT في localStorage خطر أمني |
| Secrets Console | موجودة | `api/admin/secrets.ts` محمي بـadmin session | لا يتم كشف الأسرار في التقارير | ربطه لاحقًا بصلاحيات admin حقيقية | الاعتماد على passcode/JWT محلي |
| Trial Studio | غير موجود | لا توجد collections أو provisioning flow | لا يوجد دليل حي | إنشاء user/studio/membership/subscription idempotent | خطر تكرار trial أو إنشاء بيانات ناقصة |
| Entitlement Engine | غير موجود | توجد roles محلية في `utils/permissions.ts` | لا يوجد قرار server-side شامل | إنشاء engine مركزي يفشل مغلقًا | لو بقيت الصلاحيات client-only يمكن تجاوزها |
| Plans/Subscriptions | غير موجود | لا توجد collections خطط أو اشتراكات | لا يوجد دليل حي | خطط Free/Trial/Pro/Admin + overrides | التسرع بالدفع قبل الاستحقاقات سيخلق فوضى |
| Payment Providers | غير موجود | لا يوجد webhook دفع | لا يوجد دليل حي | adapter manual أولًا ثم Stripe/AsiaCell/Zain لاحقًا | الدفع قبل entitlements غير آمن |
| Members/Invites | غير موجود | لا توجد membership collections | لا يوجد دليل حي | تأجيله بعد الاستوديو والخطط | توسيع مبكر سيزيد التعقيد |
| Passkeys/TOTP/Recovery | تصميم فقط | تقرير `2026-06-15-auth-passkeys-webauthn-design.md` | غير منفذ | مرحلة لاحقة بعد server sessions | تنفيذ مبكر سيكسر التركيز |
| Bot Protection | غير مصمم إنتاجيًا | rate limit بسيط في `api/license.ts` فقط | لا Challenge حاليًا في root/output/API من Node | Risk-based policy وتصميم routes | أي CAPTCHA عام قد يكسر OBS وAPI |
| Player Intel UX | موجود لكنه مؤجل | ملفات `components/player-intel-v2/*` | ليس ضمن هذا النطاق | Backlog منفصل | لا يجب خلطه مع الهوية |

---

## 4. ما تم أو بدأ تنفيذه

### Player Stats Bridge

تم إنشاء وتشغيل جسر مستقل في `cloud/reo-player-stats-bridge/`، مع seed للاعبين، وتوثيق Hostinger، واختبارات remote smoke.

الحالة الحية في التطبيق الرئيسي:

- `responseMode=bridge`
- `auth.valid=true`
- `source=REO Player Stats Bridge`

الثغرة المتبقية:

- unknown player وmissing player يرجعان دلاليًا كأن البيانات حقيقية. هذا مسجل كـbacklog منفصل.

### Hostinger Main Runtime

تم تحويل التطبيق من Vercel-only إلى server دائم:

- `server/server.ts`
- `dist-server/server/server.js`
- `npm run build`
- `npm start`

هذا عالج مشكلة Vercel Fast Origin Transfer وFluid CPU جزئيًا عبر نقل الحمل إلى Hostinger.

### Logout & Session Cleanup

تم تنفيذ Phase 1:

- logout مركزي عبر `sessionService.logout()`.
- تنظيف مفاتيح REO فقط.
- multi-tab logout عبر `rge_logout_at`.
- عدم استخدام `localStorage.clear()`.
- عدم كسر Output.

### Chrome Password Manager Compatibility

تم تحويل شاشة الدخول إلى form حقيقي:

- `type=email`
- `name=username`
- `autocomplete=username`
- `type=password`
- `name=password`
- `autocomplete=current-password`
- دعم Enter.
- زر إظهار/إخفاء.

### Output License Gate Bypass

`App.tsx` يفصل `/output/...` مبكرًا عن License Gate. هذا ضروري لاستمرار OBS بعد logout.

### Stream Deck Smart Token

موجود ويولد وصف قدرات القالب، لكنه ليس بعد مربوطًا بـEntitlement Engine.

---

## 5. ما لم يكتمل بعد

1. حسابات مستخدمين حقيقية.
2. Firebase Authentication بالبريد وكلمة المرور.
3. Email verification flow.
4. Studio مستقل لكل مستخدم.
5. Trial Studio provisioning.
6. 10 trial templates مقيدة بالخطة.
7. فرض REO branding في Trial.
8. Entitlement Engine server-side.
9. Plans collection.
10. Subscriptions collection.
11. Admin Console للعضويات.
12. Dynamic Tokens V2 بهش وتدوير.
13. View/Control/Edit links server-governed.
14. Payment adapter.
15. HttpOnly session.
16. Passkeys/TOTP/Recovery.
17. Bot protection risk-based.
18. Player Stats not-found semantics.
19. Player Intel UX redesign.
20. Smart Control Room.
21. Smart Stream Deck Actions.

---

## 6. الملفات الأعلى خطرًا

| الملف | سبب الخطورة |
|---|---|
| `App.tsx` | يحتوي License Gate وOutput route وlogout state وrouting الداخلي. أي تعديل واسع قد يكسر OBS أو الدخول. |
| `services/syncManager.ts` | مسؤول عن Live API/Firebase legacy/روابط Output وControl. كسره يكسر التشغيل المباشر. |
| `api/live.ts` و`api/stream.ts` | قلب العرض المباشر وSSE. لا يجب لمسهما في Identity Phase إلا بعد اختبارات طويلة. |
| `api/license.ts` | نظام الترخيص الحالي. يجب الحفاظ عليه أثناء Migration. |
| `services/adminSession.ts` | JWT محلي في localStorage. خطر أمني لكنه مستخدم حاليًا. |
| `pages/Settings.tsx` | يجمع الترخيص، admin session، secrets، Firebase config. قابل للفوضى ويحتاج فصل لاحق. |
| `pages/Integrations.tsx` | يولد Stream Deck plugin/token. تغييره قد يكسر أدوات خارجية. |
| `utils/smartToken.ts` | أساس token DNA الحالي. يجب ترحيله لا استبداله دفعة واحدة. |
| `components/renderers/*` | مساحة قوالب حساسة وكبيرة. خارج نطاق الهوية. |

---

## 7. أهم المخاطر قبل منصة العضويات

1. **خلط الترخيص القديم بالهوية الجديدة**: يجب دعم المفاتيح القديمة أثناء migration.
2. **JWT admin في localStorage**: خطر XSS، يجب نقله إلى HttpOnly session لاحقًا.
3. **API count = 10**: إضافة endpoints منفصلة قد تتجاوز الحد. الحل: router موحد.
4. **Output/OBS ضد CAPTCHA**: أي حماية عامة قد تكسر البث.
5. **Client-side entitlements**: لا يكفي إخفاء أزرار في React؛ القرار يجب أن يكون server-side.
6. **Trial duplication**: provisioning يجب أن يكون idempotent.
7. **Token long-lived permissions**: لا يجب وضع الخطة داخل التوكن؛ التوكن يعرف الهوية فقط والقدرات تحسب وقت الطلب.
8. **Firebase legacy sync**: يجب عدم مزجه مع Firebase Auth بلا حدود واضحة.
9. **Secrets في تقارير أو logs**: ممنوع.
10. **Bot protection مزعجة**: يجب أن تكون risk-based لا global challenge.

---

## 8. التوصية التنفيذية

لا تبدأ Phase Identity code الآن قبل اعتماد التصميم. الترتيب الصحيح:

1. إغلاق Phase 1 إنتاجيًا بتقرير closure مطابق.
2. تصميم Bot Protection risk-based.
3. تصميم Identity + Trial + Entitlement.
4. بعد الموافقة فقط: تنفيذ Identity Foundation بأصغر diff.

ما يجب عدم لمسه الآن:

- Output/OBS render path.
- Stream Deck plugin.
- Player Stats Bridge.
- Player Intel UX.
- القوالب والصوت.
- Payments.
- Passkeys/TOTP.

---

## 9. Rollback

هذا التقرير لا يغير كودًا. لا يحتاج rollback. إذا تم اعتماده لاحقًا كcommit تقارير فقط، فالرجوع يكون بحذف ملفات التقارير الجديدة فقط.
