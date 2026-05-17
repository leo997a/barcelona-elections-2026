# 📡 REO Data Sync Agent — دليل المزامنة التلقائية

## ما هذا؟

نظام مزامنة بيانات اللاعبين من FBref إلى VPS.

```
جهازك (Windows)          →   VPS (openclaw-server)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. fetch_fbref.py          IP سكني (لا 403)
   ↓
2. .cache/fbref/*.json     كاش محلي
   ↓
3. validate_cache.py       هل البيانات سليمة؟
   ↓ نعم
4. tar.gz → SCP            ضغط + نقل عبر gcloud
   ↓
5. install_cache.sh        تثبيت ذري مع backup
   ↓
6. /opt/reo-data-cache/    الكاش الجديد جاهز
```

**لا GCS. لا Google Drive. لا GitHub. فقط SCP مباشر.**

---

## الإعداد لأول مرة

### 1. نسخ ملف الإعداد

```powershell
cd "C:\New folder\barcelona-elections-2026\deploy\reo-datafootball-worker"
cp local.sync.example.json local.sync.json
```

لا تحتاج تعديل شيء إلا إذا تغير اسم السيرفر.

### 2. التأكد من gcloud

```powershell
gcloud auth list
gcloud compute instances list
```

### 3. نسخ سكربت التثبيت إلى VPS (مرة واحدة)

```powershell
gcloud compute scp install_cache_from_upload.sh openclaw-server:/opt/reo-datafootball-worker/ --zone us-west1-a
gcloud compute ssh openclaw-server --zone us-west1-a --command "chmod +x /opt/reo-datafootball-worker/install_cache_from_upload.sh"
```

---

## التشغيل اليدوي

### جلب + فحص فقط (بدون رفع)

```powershell
.\run_local_sync_vps.ps1
```

### جلب + فحص + رفع + تثبيت على VPS

```powershell
.\run_local_sync_vps.ps1 -Upload
```

### رفع كاش موجود بدون إعادة الجلب

```powershell
.\run_local_sync_vps.ps1 -SkipFetch -Upload
```

---

## التشغيل التلقائي عند فتح Windows

### Windows Task Scheduler

1. **Win + R** → `taskschd.msc`
2. **Create Basic Task**
3. الاسم: `REO Data Sync`
4. Trigger: **عند تسجيل الدخول** (At Logon)
5. Action: **Start a Program**
6. Program: `powershell.exe`
7. Arguments:
```
-ExecutionPolicy Bypass -File "C:\New folder\barcelona-elections-2026\deploy\reo-datafootball-worker\run_local_sync_vps.ps1" -Upload
```
8. Start in:
```
C:\New folder\barcelona-elections-2026\deploy\reo-datafootball-worker
```

### ملاحظات:
- يعمل **مرة واحدة عند فتح الجهاز** ثم يتوقف.
- لا يعمل في الخلفية بشكل دائم.
- لا يستهلك موارد بعد الانتهاء.

---

## ماذا يحدث إذا...؟

### ❓ FBref أعطى 403؟
- Worker يحاول مرتين مع انتظار 60 ثانية.
- إذا فشل → الدوري يُسجّل كـ "failed".
- إذا كل الدوريات فشلت → **لا يتم رفع شيء**.
- الكاش القديم على VPS **يبقى كما هو**.

### ❓ الجهاز مغلق؟
- لا يحدث شيء. المزامنة تعمل فقط عند فتح الجهاز.
- الكاش القديم على VPS يبقى صالحاً.
- player-stats-bridge يستمر بقراءة الكاش القديم.

### ❓ الإنترنت انقطع أثناء الرفع؟
- SCP يفشل → الكاش القديم يبقى.
- في المرة القادمة يحاول مرة أخرى.

### ❓ كيف أعرف أن الرفع نجح؟
```powershell
# فحص آخر تحديث على VPS:
gcloud compute ssh openclaw-server --zone us-west1-a --command "cat /opt/reo-data-cache/last_updated.json; echo; ls -lh /opt/reo-data-cache/fbref/"
```

### ❓ كيف أرجع للكاش القديم؟
```bash
# على VPS:
ls /opt/reo-data-cache/backups/
# اختر backup:
cp /opt/reo-data-cache/backups/fbref-YYYYMMDD-HHMMSS/* /opt/reo-data-cache/fbref/
```

---

## حماية الكاش القديم

```
┌──────────────────────────────────────────────────────┐
│  الحالة                        │  النتيجة            │
├──────────────────────────────────────────────────────┤
│  FBref OK + Validation OK      │  ✅ يتم التحديث     │
│  FBref OK + Validation FAIL    │  ❌ لا يتم الرفع    │
│  FBref FAIL (كل الدوريات)      │  ❌ لا يتم الرفع    │
│  FBref جزئي (بعض نجح)          │  ✅ يتم رفع الناجح  │
│  SCP فشل                       │  ❌ كاش VPS لم يتغير│
│  Install فشل على VPS           │  ❌ كاش قديم يبقى   │
└──────────────────────────────────────────────────────┘
```

**قاعدة ذهبية: الكاش القديم لا يُمسح إلا بعد نجاح كل الخطوات.**

---

## الملفات

| الملف | الموقع | الوظيفة |
|-------|--------|---------|
| `run_local_sync_vps.ps1` | جهازك | السكربت الرئيسي |
| `validate_cache.py` | جهازك | فحص الكاش قبل الرفع |
| `install_cache_from_upload.sh` | VPS | تثبيت ذري مع backup |
| `local.sync.json` | جهازك (غير مرفوع) | إعدادات VPS |
| `.cache/fbref/` | جهازك | كاش محلي مؤقت |

---

## ما لا يُلمس

| العنصر | الحالة |
|--------|--------|
| player-stats-bridge | ❌ لم يُلمس |
| pm2 | ❌ لم يُلمس |
| التوكنات | ❌ لم تُلمس |
| Vercel API routes | ❌ 12/12 لم تتغير |
| OpenClaw | ❌ لم يُلمس |
| reo-match-bridge | ❌ لم يُلمس |
