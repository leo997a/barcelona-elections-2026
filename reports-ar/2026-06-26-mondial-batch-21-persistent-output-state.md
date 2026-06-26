# تقرير دفعة 21 - تثبيت حالة روابط الإخراج بعد إعادة نشر Hostinger

التاريخ: 2026-06-26

## سبب الدفعة

بعد نشر دفعة 20 على Hostinger ظهر أصل الواجهة الجديد:

`assets/index-B2coBSXb.js`

لكن فحص رابط الإخراج القديم أعاد `404` من:

`/api/live?id=instance-studio-2c7379d9fc98a752-template-mondial-group-wall-mqueo02i-0c2f818f&full=1`

هذا أثبت أن حالة `/api/live` في Hostinger كانت تعتمد على الذاكرة فقط. بعد أي redeploy أو restart تضيع الحالة خلف الرابط، حتى لو كان الرابط نفسه ثابتاً.

## الإصلاح

- `api/_lib/liveStore.ts`
  - إضافة تخزين ملفي دائم عند عدم العمل على Vercel.
  - المسار الافتراضي:
    `data/live-state`
  - يمكن تغييره عبر:
    `REO_LIVE_STATE_DIR`
  - يمكن تعطيله عبر:
    `REO_LIVE_STATE_FILE_STORE=off`
  - أسماء الملفات مشتقة من SHA-256 للمعرف، وليست من النص الخام للرابط.
  - الكتابة تتم عبر ملف مؤقت ثم rename لتقليل خطر الملف نصف المكتوب.

## النتيجة المتوقعة

- رابط `/output/<id>` يبقى نفسه.
- بعد أن يفتح المستخدم الرابط من الأداة مرة واحدة، تبقى آخر حالة منشورة قابلة للقراءة من `/api/live` حتى بعد إعادة تشغيل عملية Node أو redeploy عادي في Hostinger.
- أوامر إظهار/إخفاء دفعة 20 ستكتب أيضاً إلى التخزين الدائم، لا إلى الذاكرة فقط.

## التحقق

- `node --test tests/mondial-runtime-controls.test.mjs tests/mondial-template-contract.test.mjs`
- `npm.cmd run lint`
- `npm.cmd run build`
- تحقق عملي من `dist-server/api/_lib/liveStore.js`:
  - كتابة حالة إلى `REO_LIVE_STATE_DIR` مؤقت.
  - إعادة import للموديول باسم جديد لمحاكاة restart.
  - قراءة الحالة من الملف بنجاح:

```json
{"id":"codex-file-store-test","ok":true,"version":1,"clientVersion":1000}
```

## تحقق Hostinger بعد النشر

تم نشر إصلاح التخزين الدائم إلى Hostinger، ثم تشغيل سموك مباشر على:

`https://peachpuff-herring-712997.hostingersite.com/api/live`

نتيجة فحص وضع التخزين:

```json
{"post":200,"get":200,"store":"file","visible":false,"version":1}
```

نتيجة فحص تبديل الظهور/الإخفاء:

```json
{"store1":"file","afterShow":true,"versionAfterShow":2,"store2":"file","afterHide":false,"versionAfterHide":3}
```

هذا يثبت أن `/api/live` على Hostinger لم يعد يعتمد على ذاكرة العملية فقط، وأن أوامر الظهور/الإخفاء الجديدة تصل إلى الحالة المقروءة من رابط الإخراج.

## ملاحظة على الرابط القديم الذي كان مكسوراً

الرابط القديم:

`/output/instance-studio-2c7379d9fc98a752-template-mondial-group-wall-mqueo02i-0c2f818f`

أعاد `404` عند فحص `/api/live` بعد النشر، وهذا متوقع لأن حالته كانت محفوظة في الذاكرة القديمة وضاعت أثناء redeploy قبل وجود التخزين الدائم. بعد فتح/تحديث نفس القالب من الأداة مرة واحدة، ستُنشر الحالة من جديد إلى التخزين الملفي وتبقى مرتبطة بنفس الرابط.
