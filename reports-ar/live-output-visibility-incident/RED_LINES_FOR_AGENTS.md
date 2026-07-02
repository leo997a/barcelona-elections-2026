# قوانين خط أحمر للوكلاء: رابط البث المباشر و IN/OUT

هذه القواعد ملزمة لأي وكيل يعمل لاحقا على مسارات output أو OBS أو IN/OUT. لا يكفي نجاح المعاينة داخل المحرر.

## القواعد

1. ممنوع اعتبار إصلاح الظهور/الإخفاء منتهيا بدون فتح رابط output الحقيقي على Hostinger بعد النشر.
2. ممنوع استخدام معاينة المحرر كدليل نهائي على نجاح رابط OBS.
3. معاينة المحرر يجب أن تبقى ظاهرة للتحرير؛ الإظهار والإخفاء يعملان حصرا على الرابط المباشر إلا إذا طلب المستخدم غير ذلك صراحة.
4. ممنوع وضع React hooks بعد `return null` أو أي رجوع مبكر داخل مسار يمكن أن ينتقل من hidden fallback إلى live visible.
5. `liveStore` يجب أن يرفض أي تحديث إذا كان `clientVersion <= previousClientVersion` بدون استثناء بسبب اختلاف payload.
6. ممنوع تخزين حالة البث الحية فقط داخل مجلد الإصدار المتغير؛ يجب استخدام مسار ثابت مثل `REO_LIVE_STATE_DIR` أو `HOME/.reo-live-stream/live-state`.
7. روابط OBS التي تحتوي `obs=1` يجب ألا تعرض طبقة "انقر لتفعيل الصوت"، لأن OBS لا يضغط على الصفحة.
8. أي تعديل يمس output/live state يجب أن يمر على الأقل بهذه الفحوص:

```text
node --test tests/mondial-runtime-controls.test.mjs tests/template-image-export.test.mjs
npx tsc --noEmit
npm run build
```

9. بعد النشر يجب فحص:

```text
/api/live?id=<overlay-id>&full=1
/api/live?id=<overlay-id>&meta=1
/output/<overlay-id>?obs=1&rgev=obs-live-v3
```

10. إذا اضطر الوكيل إلى نشر حالة اختبارية، يجب إعادة الحالة النهائية المتوقعة قبل إنهاء العمل.

## سبب هذه القواعد

حادثة 2026-07-02 أثبتت أن النجاح المحلي أو نجاح المعاينة وحده لا يكشف:

- انهيار React بسبب ترتيب hooks.
- رجوع stale retry فوق أمر أحدث.
- ضياع live state بعد إعادة نشر Hostinger.
- تغطية output بطبقة تفعيل الصوت في OBS.

التقرير الكامل موجود في:

`reports-ar/live-output-visibility-incident/2026-07-02-final-root-cause-and-fix.md`
