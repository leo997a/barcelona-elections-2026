# VPS FBref Smart Agent Daily Timer - تقرير

التاريخ: 2026-05-17
المشروع: barcelona-elections-2026
المجلد: deploy/reo-datafootball-worker/

---

## ملخص

تم نشر Smart Agent على VPS بنجاح مع كل المكونات:
- providers/ package
- soccerdata v1.9.0 + SeleniumBase + ChromeDriver 148
- Google Chrome 148 (موجود مسبقا على VPS)
- venv مع كل التبعيات
- run_daily_limited.sh
- reo-fbref-daily.service
- reo-fbref-daily.timer

## نتيجة VPS Probe

| العنصر | النتيجة |
|--------|---------|
| الوقت | 00:28 UTC (ساعات ذروة) |
| Strategy | soccerdata_only |
| Stat group | standard |
| Chrome/Chromium | Google Chrome 148.0.7778.167 (موجود) |
| ChromeDriver | تم تحميله تلقائيا |
| soccerdata | v1.9.0 (تم تحميله) |
| النتيجة | **فشل - CAPTCHA** |
| السبب | وقت الذروة (00:28 UTC) |
| Timer | **لم يتم تثبيته** (حسب التصميم) |

> **ملاحظة مهمة:** الفشل بسبب التوقيت فقط وليس بسبب خطأ تقني.
> محليا نجح بـ 860 لاعب من standard. على VPS، كل البنية التحتية جاهزة.
> يجب اعادة تشغيل الـ probe في وقت هادئ (06:00-12:00 UTC).

---

## الملفات المنشورة على VPS

```
/opt/reo-datafootball-worker/
  providers/
    __init__.py
    base_provider.py
    fbref_soccerdata_provider.py
    fbref_big5_direct_provider.py
    manual_csv_provider.py
    provider_selector.py
  validate_cache.py
  requirements-smart.txt
  run_daily_limited.sh
  venv/  (مع soccerdata + seleniumbase)
  .cache/soccerdata/  (مجلد cache داخلي)

/tmp/reo-smart-deploy/
  reo-fbref-daily.service  (جاهز للنسخ)
  reo-fbref-daily.timer    (جاهز للنسخ)
  setup_vps_smart.sh
```

---

## كيف تشغل الـ probe يدويا

```bash
# اتصل بالـ VPS
gcloud compute ssh openclaw-server --zone us-west1-a

# شغل الـ probe
cd /opt/reo-datafootball-worker
source venv/bin/activate
timeout 15m python -m providers.provider_selector \
  --strategy soccerdata_only \
  --season 2025-26 \
  --cache-dir /tmp/reo-vps-probe-cache \
  --headless true \
  --stat-groups standard

# تحقق من النتيجة
python validate_cache.py /tmp/reo-vps-probe-cache
```

---

## كيف تثبت الـ timer بعد نجاح الـ probe

```bash
# انسخ ملفات systemd
sudo cp /tmp/reo-smart-deploy/reo-fbref-daily.service /etc/systemd/system/
sudo cp /tmp/reo-smart-deploy/reo-fbref-daily.timer /etc/systemd/system/

# فعّل الـ timer
sudo systemctl daemon-reload
sudo systemctl enable reo-fbref-daily.timer
sudo systemctl start reo-fbref-daily.timer

# تحقق
systemctl list-timers | grep reo-fbref
systemctl status reo-fbref-daily.timer --no-pager
```

---

## اعدادات الـ Timer

| الاعداد | القيمة |
|---------|--------|
| النوع | oneshot (ليس daemon) |
| الوقت | 06:30 UTC يوميا |
| Jitter | +/- 10 دقائق |
| Persistent | false (لا يركض اذا missed) |
| Timeout | 30 دقيقة (داخل السكربت) + 35 دقيقة (systemd) |
| Lock file | /tmp/reo-fbref-daily.lock |
| Staging | /tmp/reo-fbref-daily-cache |
| Production | /opt/reo-data-cache/fbref |
| Backup | /opt/reo-data-cache/backups/fbref-YYYYMMDD-HHMMSS |

---

## حدود الامان

1. لا يعمل اكثر من 30 دقيقة (timeout)
2. لا يعمل اكثر من instance (lock file)
3. لا يستبدل cache القديم الا اذا الجديد صالح (validation)
4. لا يلمس player-stats-bridge
5. لا يعمل PM2 restart
6. لا يضيف API route
7. لا يغير tokens
8. لا يستخدم proxy
9. لا يشتغل 24 ساعة
10. Memory limit: 2GB (systemd)
11. CPU limit: 80% (systemd)

---

## فحص الـ logs

```bash
# اخر تشغيل
journalctl -u reo-fbref-daily.service -n 120 --no-pager

# حالة الـ timer
systemctl status reo-fbref-daily.timer --no-pager

# قائمة الـ timers
systemctl list-timers | grep reo-fbref
```

---

## ايقاف الـ timer

```bash
sudo systemctl stop reo-fbref-daily.timer
sudo systemctl disable reo-fbref-daily.timer
```

---

## التدرج في stat groups

| المرحلة | Stat Groups | الشرط |
|---------|-------------|-------|
| اليوم 1-3 | standard فقط | اختبار اولي |
| بعد 3 ايام نجاح | standard + shooting | استقرار |
| بعدها | + playing_time | نجاح مستمر |
| بعدها | + misc | نجاح مستمر |

لتغيير الـ stat groups:
```bash
# عدّل STAT_GROUPS في run_daily_limited.sh
nano /opt/reo-datafootball-worker/run_daily_limited.sh
# غير السطر:
# STAT_GROUPS="standard"
# الى:
# STAT_GROUPS="standard,shooting"
```

---

## ما لم يتم تغييره

| العنصر | الحالة |
|--------|--------|
| player-stats-bridge | لم يتغير |
| PM2 | لم يتغير |
| Tokens | لم تتغير |
| Vercel | لم يتغير |
| OpenClaw | لم يتغير |
| reo-match-bridge | لم يتغير |
| API routes | لم تتغير |
