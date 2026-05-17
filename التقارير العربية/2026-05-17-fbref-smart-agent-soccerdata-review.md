# FBref Smart Agent - مراجعة soccerdata والاستراتيجيات الذكية

التاريخ: 2026-05-17
المشروع: barcelona-elections-2026
المجلد: deploy/reo-datafootball-worker/

---

## لماذا فشل requests البسيط؟

الـ `fetch_fbref.py` الأصلي كان يستخدم:
```python
requests.get(url) + pandas.read_html()
```

هذا فشل لأن FBref يستخدم:
- Cloudflare حماية
- Rate limiting صارم (403 بعد عدة طلبات)
- فحص User-Agent و TLS fingerprint
- حظر IP addresses المشبوهة (حتى السكنية أحيانا)

**النتيجة:** 403 Forbidden لكل الدوريات الخمسة حتى من جهاز Windows محلي.

---

## ما تعلمناه من soccerdata

المستودع: [probberechts/soccerdata](https://github.com/probberechts/soccerdata)
الترخيص: Apache 2.0

### اكتشافات مهمة:

1. **SeleniumBase**: soccerdata يستخدم `seleniumbase` (متصفح Chrome غير مكتشف) بدلا من `requests` العادي
2. **Big 5 Combined**: بدلا من 5 طلبات منفصلة (واحد لكل دوري)، يستخدم endpoint واحد يجمع كل الدوريات
3. **Rate limit = 7 ثوان**: تأخير 7 ثوان بين الطلبات (وليس 5 كما استخدمنا)
4. **5 stat types فقط**: `standard`, `shooting`, `playing_time`, `misc`, `keeper`
5. **Cache محلي ذكي**: يحفظ HTML خام ويعيد قراءته بدلا من تكرار الطلبات

### لماذا Big 5 Combined افضل:

| الطريقة | عدد الطلبات | احتمال الحظر |
|---------|------------|-------------|
| 5 دوريات منفصلة | 5+ لكل stat type | عالي جدا |
| Big 5 Combined | 1 لكل stat type | منخفض |

endpoint واحد `/comps/Big5/stats/players/` يعطيك كل لاعبي الدوريات الخمسة في جدول واحد.

---

## لماذا player-recommender مفيد

المستودع: [alexgasconn/player-recommender](https://github.com/alexgasconn/player-recommender)

يحتوي URLs مباشرة لـ 9 stat groups:

| Stat Group | Endpoint |
|-----------|----------|
| standard_stats | `/comps/Big5/stats/players/` |
| shooting | `/comps/Big5/shooting/players/` |
| passing | `/comps/Big5/passing/players/` |
| pass_types | `/comps/Big5/passing_types/players/` |
| gca | `/comps/Big5/gca/players/` |
| defense | `/comps/Big5/defense/players/` |
| possession | `/comps/Big5/possession/players/` |
| playing_time | `/comps/Big5/playingtime/players/` |
| misc | `/comps/Big5/misc/players/` |

هذه URLs تعمل كـ fallback عندما soccerdata لا يعمل.

---

## لماذا An-FBref-Memoriam يثبت ان soccerdata + cache ممكن

المستودع: [idtw/An-FBref-Memoriam](https://github.com/idtw/An-FBref-Memoriam-for-Player-Scouting-and-Team-Analysis)

- يستخدم soccerdata مباشرة للـ player scouting
- يثبت ان المكتبة تعمل فعلا لجلب بيانات اللاعبين
- يدمج عدة stat groups في تحليل واحد

---

## دور football-analysis

المستودع: [marclamberts/football-analysis](https://github.com/marclamberts/football-analysis)

- **ليس scraper مباشر** بل مصدر افكار تحليلية
- افكار مفيدة لاحقا: radars, roles, xG analysis, player comparison
- لا نستخدمه في الكود لكن يفيدنا في تصميم الـ cache format

---

## الاستراتيجيات الثلاث

```
Strategy 1: soccerdata (SeleniumBase)
  - الافضل لتجاوز الحظر
  - يحتاج Chrome مثبت
  - 5 stat types

Strategy 2: direct Big5 (requests + headers)
  - لا يحتاج Chrome
  - 9 stat types
  - يفشل اذا FBref يحظر requests العادية

Strategy 3: manual CSV/JSON
  - لا يحتاج انترنت
  - يقرأ ملفات محلية
  - للطوارئ فقط
```

### منطق الـ fallback:

```
soccerdata_first:
  1. جرب soccerdata
  2. اذا فشل كله -> جرب direct Big5
  3. اذا فشل الاثنين -> لا ترفع شيئا
```

---

## لماذا لا نستخدم proxy الان

- Proxy يضيف تعقيد وتكلفة
- soccerdata + SeleniumBase يتجاوز معظم الحماية بدون proxy
- اذا soccerdata نجح محليا، لا نحتاج proxy
- نضيف proxy لاحقا فقط اذا كل الاستراتيجيات فشلت

## لماذا لا نربط bridge قبل cache ناجح

- player-stats-bridge يعتمد على cache موجود وصحيح
- اذا ربطناه بـ cache فارغ، البث المباشر يتوقف
- **القاعدة:** اول cache ناجح حقيقي -> ثم نربط bridge

---

## النتيجة

| العنصر | الحالة |
|--------|--------|
| providers/ package | تم انشاؤه |
| fbref_soccerdata_provider.py | تم |
| fbref_big5_direct_provider.py | تم |
| manual_csv_provider.py | تم |
| provider_selector.py | تم |
| validate_cache.py (محدث) | تم |
| run_local_sync_vps.ps1 (محدث) | تم |
| requirements-smart.txt | تم |
| local.sync.example.json (محدث) | تم |

---

## Attribution

هذا العمل يستفيد هندسيا من المشاريع التالية (كمراجع فقط، لم يتم نسخ كود):

- **soccerdata** by Pieter Robberechts (Apache 2.0)
- **player-recommender** by Alex Gascon
- **An-FBref-Memoriam** by idtw
- **football-analysis** by Marc Lamberts

لم يتم نسخ اي كود مباشرة. تمت كتابة implementation خاص بنا بناء على الافكار الهندسية.
