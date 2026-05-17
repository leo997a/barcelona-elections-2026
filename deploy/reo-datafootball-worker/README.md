# REO DataFootball Worker

## ما هذا؟
Worker منفصل يجلب إحصائيات اللاعبين الموسمية من FBref ويحفظها كـ JSON cache.

**لا يستخدم Selenium.** يعمل بـ `requests` + `pandas` فقط.

## البنية على VPS

```
/opt/reo-datafootball-worker/     ← هذا المجلد
├── fetch_fbref.py                ← السكربت الرئيسي
├── config.json                   ← إعدادات الدوريات
├── requirements.txt              ← dependencies
├── run.sh                        ← سكربت تشغيل
├── venv/                         ← Python virtual environment
└── README.md                     ← أنت تقرأ هذا

/opt/reo-data-cache/              ← مجلد الـ cache
├── fbref/
│   ├── la-liga-2025-26.json
│   ├── premier-league-2025-26.json
│   ├── bundesliga-2025-26.json
│   ├── serie-a-2025-26.json
│   └── ligue-1-2025-26.json
├── last_updated.json
├── worker.log
└── .lock                         ← lock file أثناء التشغيل
```

## التثبيت على VPS

```bash
# 1. أنشئ المجلدات
sudo mkdir -p /opt/reo-datafootball-worker
sudo mkdir -p /opt/reo-data-cache/fbref

# 2. انسخ الملفات
sudo cp fetch_fbref.py config.json requirements.txt run.sh /opt/reo-datafootball-worker/

# 3. أنشئ virtual environment
cd /opt/reo-datafootball-worker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. اجعل run.sh قابل للتنفيذ
chmod +x run.sh

# 5. شغّل يدوياً للتجربة
./run.sh
```

## Cron

```bash
# تعديل crontab
crontab -e

# أضف (كل 6 ساعات، تجنب أوقات البث 18:00-01:00 UTC):
0 6,12 * * * /opt/reo-datafootball-worker/run.sh
```

## قواعد أمان

| ✅ آمن | ❌ ممنوع |
|--------|----------|
| تشغيل يدوي عبر SSH | تشغيل أثناء البث |
| cron في 06:00 و 12:00 UTC | cron في 18:00-01:00 UTC |
| قراءة cache من bridge | scraping أثناء طلب API |
| rate limiting 5 ثوانٍ | طلبات متتالية بدون تأخير |

## كيف يقرأ player-stats-bridge من الـ cache

`reo-player-stats-bridge` على port 8095 يقرأ من `/opt/reo-data-cache/fbref/` فقط.
لا يشغل أي scraping. إذا لم يجد بيانات اللاعب → يرجع `{ status: "unavailable" }`.
