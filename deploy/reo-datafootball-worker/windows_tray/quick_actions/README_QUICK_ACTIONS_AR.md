# Quick Actions - اختصارات سريعة

ملفات BAT للتحكم السهل بـ REO Data Sync Tray.
انقر نقرا مزدوجا على اي ملف BAT لتشغيله.

---

## الملفات

| الملف | الوظيفة |
|-------|---------|
| install_tray_startup.bat | تثبيت التشغيل التلقائي عند فتح Windows |
| uninstall_tray_startup.bat | حذف التشغيل التلقائي (بدون حذف logs/cache) |
| run_now.bat | تشغيل sync يدويا الان (مع ForceRun) |
| open_logs.bat | فتح مجلد السجلات |
| open_state.bat | فتح مجلد حالة اخر تشغيل |
| check_task_status.bat | فحص حالة المهمة المجدولة |
| run_task_now.bat | تشغيل المهمة المجدولة يدويا |
| stop_task.bat | ايقاف المهمة المجدولة |
| kill_reo_sync_children.bat | طوارئ: قتل عمليات sync العالقة |
| test_short_timeout.bat | اختبار timeout بدقيقة واحدة |

---

## الاستخدام اليومي

### اول مرة
1. انقر install_tray_startup.bat
2. اعد تشغيل Windows او انقر run_now.bat

### مراقبة
- ابحث عن ايقونة R الزرقاء بجانب الساعة
- كليك يمين للقائمة

### فحص
- انقر check_task_status.bat لرؤية حالة المهمة
- انقر open_logs.bat لقراءة السجلات
- انقر open_state.bat لرؤية اخر تشغيل

### ايقاف
- انقر uninstall_tray_startup.bat لحذف التشغيل التلقائي
- انقر stop_task.bat لايقاف التشغيل الحالي

### طوارئ
- انقر kill_reo_sync_children.bat فقط اذا بقيت عمليات عالقة
- هذا الملف يقرا PID من lock file ويقتل شجرة العمليات
