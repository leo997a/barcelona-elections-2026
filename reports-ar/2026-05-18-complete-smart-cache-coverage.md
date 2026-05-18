# المرحلة F: تغطية كاش FBref الذكية الكاملة

تاريخ التقرير: 2026-05-18
المرحلة: Phase F — Complete Smart Cache Coverage
نطاق التغيير: Local Smart Agent على Windows فقط (لا VPS، لا Bridge، لا API).

---

## 1. ماذا أصبح يجلب النظام الآن

السكربت الرئيسي `run_local_sync_vps.ps1` يستخدم `provider_selector` الذي ينظّم
ثلاثة مزوّدات:

| المزوّد | يدعم هذه المجموعات | الدور |
|---|---|---|
| `soccerdata_first` (أساسي) | standard, shooting, playing_time, misc, keeper | متصفّح Chrome مخفي عبر SeleniumBase. يمر عادةً من جدران Cloudflare. |
| `direct_big5` (احتياطي) | جميع المجموعات الإحدى عشر | طلب HTTP مباشر مع headers متصفّح. يعمل عندما لا يكون هناك CAPTCHA. |
| `manual_csv` (طوارئ) | standard, shooting, passing, defense, misc, playing_time, keeper | يقرأ CSV/JSON محلية. للاستخدام عند فشل المصدرين الأولين كليهما. |

نتيجة الاستراتيجية الافتراضية `soccerdata_first`:
- يحاول `soccerdata` أولاً للمجموعات التي يدعمها (5 مجموعات).
- ينتقل تلقائيًا إلى `direct_big5` للمجموعات الستة الباقية (passing, gca,
  defense, possession, pass_types, keeper_adv) ولأي مجموعة فشلت في الجولة الأولى.

المجموعات المدرجة في عقد التغطية:
```
REQUIRED_STAT_GROUPS = standard, shooting, passing, gca,
                       defense, possession, pass_types,
                       playing_time, misc, keeper
OPTIONAL_GROUPS      = keeper_adv
```

عدد اللاعبين الأدنى لكل مجموعة (`MIN_PLAYER_COUNT_BY_GROUP`):
- standard, shooting, passing, gca, defense, possession, pass_types, playing_time, misc → 500.
- keeper, keeper_adv → 40.

أي مجموعة تنخفض تحت الحد الأدنى تُعتبر `available=false` ولا تدخل في
`availableStatGroups`. هذا يحمي القالب من عرض أرقام غير صادقة (الكاش الحالي
لمجموعة `shooting` فيه 3 لاعبين فقط، لذلك تُعامَل تلقائيًا كغير متاحة).

---

## 2. ما الذي نجح وما الذي فشل (لقطة الكاش الحالية)

ملف `last_updated.json` الموجود الآن في `.cache/fbref/` يقول:

| المجموعة | الحالة | اللاعبون | المصدر |
|---|---|---|---|
| standard | available ✅ | 860 | soccerdata |
| shooting | unavailable ❌ | 3 | soccerdata (فشل تحت الحد الأدنى) |
| passing | unavailable ❌ | لم يُجلَب | — |
| gca | unavailable ❌ | لم يُجلَب | — |
| defense | unavailable ❌ | لم يُجلَب | — |
| possession | unavailable ❌ | لم يُجلَب | — |
| pass_types | unavailable ❌ | لم يُجلَب | — |
| playing_time | unavailable ❌ | لم يُجلَب | — |
| misc | unavailable ❌ | لم يُجلَب | — |
| keeper | unavailable ❌ | لم يُجلَب | — |

التغطية الإجمالية: `partial`. القالب يعرض هذا للمستخدم في البانر الأمبر
"البيانات الأساسية متاحة" ويعطّل الإحصائيات التي تحتاج كاش متقدم.

---

## 3. ما الذي يضيفه Phase F فوق Phase E

أربع تحسينات مركّزة، كلها على الـ Local Agent، بدون لمس VPS أو الجسر أو API:

### 3.1 ملف checkpoint جديد
المسار: `deploy/reo-datafootball-worker/.state/fbref-fetch-state.json`
المحتوى لكل stat group:
```jsonc
{
  "lastSuccessAt": "...",
  "lastSuccessSource": "soccerdata",
  "lastSuccessPlayerCount": 860,
  "lastAttemptAt": "...",
  "lastFailureAt": "...",
  "lastFailureReason": "...",
  "captchaCount": 0,
  "cooldownUntil": null
}
```

السلوك:
- إذا نجحت مجموعة اليوم، تُتجاوز في تشغيل لاحق نفس اليوم (`fresh_today`)
  ما لم يُمرَّر `-ForceRefresh`.
- إذا فشلت مجموعة بسبب CAPTCHA / 403 / 429 / Cloudflare، تدخل
  `cooldownUntil = now + 6 ساعات`، ولا يحاول السكربت جلبها مجددًا قبل انتهاء
  المهلة (إلا مع `-ForceRefresh`).
- النجاح التالي يمسح cooldown ويصفّر `captchaCount`.

### 3.2 استئناف الجلب بدون إعادة كل شيء
`provider_selector` يستخدم `decide_groups` مع `coverage_utils.resolve_stat_groups`
للحصول على المجموعات الناقصة فقط، ثم يصفّيها عبر state:
- `force_refresh` → جلب الكل
- في cooldown → تخطي مع `reason="cooldown"`
- ناجحة اليوم → تخطي مع `reason="fresh_today"`
- باقية → جلب

نتيجة: لا يعيد جلب standard إذا تم اليوم، ولا يدوس على shooting إذا CAPTCHA
أوقفها قبل ساعتين.

### 3.3 جلب جزئي يرفع المتاح فقط
`validate_cache.py` يقبل partial cache (هذا كان موجودًا في Phase E). الجديد:
- يطبع كتلة "Per-group status" بصيغة `[OK] / [FAIL] / [SKIP]` كما طلب المستخدم:
  ```
  [OK]   standard      860 players
  [OK]   shooting      860 players
  [FAIL] passing       captcha
  [SKIP] defense       cooldown until 2026-05-18 08:01 UTC
  ```
- يقرأ `.state/fbref-fetch-state.json` للتمييز بين "فشلت" و"تخطّت".
- يفشل (exit 1) فقط إذا لم تنجح أي مجموعة. غير ذلك يعتبر الكاش صالحًا
  ويرفع المتاح. الكاش القديم على VPS لا يُمسح إلا إذا نجحت كل خطوات
  validate + scp + install.

### 3.4 حدود أمان
- Max runtime محلي: 45 دقيقة (من Tray) و 30 دقيقة (من timer الـ VPS).
- التأخير بين stat groups: 10–20 ثانية عشوائيًا (في `fbref_big5_direct_provider`
  و `fbref_soccerdata_provider`).
- Retry لكل group: مرتان.
- عند CAPTCHA: ينتقل للمجموعة التالية، يسجّل cooldown.
- عند Ctrl+C / timeout / cancel: `cleanup_processes.ps1` الجديد يقتل شجرة
  العمليات (`taskkill /T /F`) ثم يكنس أي `chromedriver.exe` / `chrome.exe` /
  (اختياريًا) `python.exe` يحتوي سطر أمره على `soccerdata` أو
  `reo-datafootball-worker` أو `.cache\fbref`.
- `run_local_sync_vps.ps1` الآن لديه `try { ... } finally { Invoke-Cleanup }`
  لذلك حتى التشغيل من سطر الأوامر يُنظّف نفسه عند الإلغاء.

---

## 4. ملفات BAT الجديدة في `windows_tray/quick_actions/`

| الملف | الوظيفة | الإستراتيجية |
|---|---|---|
| `run_full_cache_sync.bat` | جلب كل المجموعات الآمنة + رفع | `soccerdata_first` + `all-safe` + `Upload` |
| `run_standard_only.bat` | جلب standard فقط (بدون رفع) | `standard` |
| `run_missing_groups_only.bat` | جلب الناقصة فقط + رفع | `missing` + `Upload` |
| `force_refresh_all.bat` | تجاهل fresh-today + cooldown | `all-safe` + `ForceRefresh` + `Upload` |
| `check_cache_status.bat` | عرض Per-group status | `validate_cache.py` |
| `open_cache_logs.bat` | فتح `.logs` و `.cache` في Explorer | — |

كل BAT يستخدم `pushd/popd` ويبقى مفتوحًا (`pause`) ليرى المستخدم الناتج.

---

## 5. السلوك اليومي

عند فتح Windows:
1. Scheduled Task `REO Data Sync Tray` يعمل عند Logon (مثبّت من
   `install_startup_task.ps1` بدون صلاحيات Admin).
2. `ReoDataSyncTray.ps1` يفحص `.state/reo-sync-state.json`:
   - إذا `lastAttemptDate == today`: balloon "تم اليوم" ويغلق بعد 5 ثوانٍ.
   - وإلا: يستدعي `run_local_sync_vps.ps1 -StatGroups next-missing -Upload`.
3. `provider_selector` يفلتر المجموعات عبر `fetch_state.decide_groups`:
   - ناجحة اليوم → skip.
   - في cooldown → skip.
   - باقية → fetch.
4. بعد الانتهاء، `validate_cache.py` يطبع OK/FAIL/SKIP لكل المجموعات.
5. إذا valid: `tar.gz` → `gcloud compute scp` →
   `install_cache_from_upload.sh` يثبّتها atomic مع backup للقديم.
6. Tray يعرض إشعار Windows ويغلق بعد 5–8 ثوانٍ.

لا توجد حلقات 24 ساعة. لا proxy. لا scraping من VPS أو GCP.

---

## 6. ما الذي يُرفع إلى VPS

ضمن `reo-fbref-cache.tar.gz` بداخل `fbref/`:
- `fbref-standard-2025-26.json` (دائمًا حالياً)
- `fbref-shooting-2025-26.json` متى نجحت
- `fbref-passing-2025-26.json` متى نجحت
- `fbref-defense-2025-26.json` متى نجحت
- `fbref-possession-2025-26.json` متى نجحت
- `fbref-gca-2025-26.json` متى نجحت
- `fbref-pass_types-2025-26.json` متى نجحت
- `fbref-playing_time-2025-26.json` متى نجحت
- `fbref-misc-2025-26.json` متى نجحت
- `fbref-keeper-2025-26.json` متى نجحت
- `columns-manifest.json`
- `metrics_coverage.json`
- `last_updated.json` (يحتوي الآن `availableStatGroups`,
  `missingStatGroups`, `optionalMissingStatGroups`, `failedStatGroups`,
  `skippedStatGroups`, `fetchState`, `metricsAvailability`).

`install_cache_from_upload.sh` على VPS:
1. يفك الأرشيف إلى `/tmp/reo-fbref-cache-upload`.
2. يفحص كل ملف لديه `player_count > 0` و `players` غير فارغ.
3. يعمل backup تلقائي إلى `/opt/reo-data-cache/backups/fbref-{ts}/` (يحفظ آخر 5).
4. ينسخ الملفات الصالحة فقط إلى `/opt/reo-data-cache/fbref/`.
5. لا يُعيد تشغيل bridge ولا PM2 ولا يلمس التوكنات.

---

## 7. كيفية التحقق على VPS بعد الرفع

من Windows بعد تشغيل `run_full_cache_sync.bat`:

```bash
gcloud compute ssh openclaw-server --zone us-west1-a --command 'ls -lh /opt/reo-data-cache/fbref'
gcloud compute ssh openclaw-server --zone us-west1-a --command 'cat /opt/reo-data-cache/fbref/last_updated.json'
```

يفترض أن نرى:
- `fbref-standard-2025-26.json` بحجم ~640 KB.
- المزيد من ملفات `fbref-*-2025-26.json` كلما نجحت مجموعات إضافية.
- `last_updated.json` يحتوي `availableStatGroups: ["standard", "shooting", ...]`
  حسب ما نجح.

---

## 8. هل الجسر جاهز لقراءة الملفات الجديدة؟

نعم، بدون أي تعديل. `ops/player-stats-bridge/providers/fbrefProvider.js`
و `deploy/reo-datafootball-worker/fbrefCacheReader.js` يقرآن:
- `coverage.availableStatGroups`
- `coverage.missingStatGroups`
- `players[]` من ملفات `fbref-{group}-{season}.json`.

كل الحقول التي أضافها Phase F (`skippedStatGroups`, `fetchState`,
`failedStatGroups`) **إضافية فقط**. الواجهة الأمامية والـ bridge يتجاهلانها
ولا تكسر شيئًا.

---

## 9. ما الذي قد يحتاج محاولة لاحقة

بعد التشغيل التالي:
- إذا فشل `shooting` في الجولة الأولى عبر soccerdata، سيحاول `provider_selector`
  جلبه عبر `direct_big5` (لأن المجموعة موجودة في
  `DEFAULT_STAT_GROUPS_DIRECT`).
- إذا فشل `direct_big5` بسبب CAPTCHA، تدخل المجموعة 6 ساعات cooldown،
  ويُعاد تشغيلها تلقائيًا في تشغيل لاحق بعد المهلة.
- المجموعات النادرة (passing, gca, pass_types, possession) قد تحتاج 2–3
  محاولات على فترات يومية لاجتياز Cloudflare.

اختصار يدوي للعجول: `force_refresh_all.bat` يتجاهل cooldown ويعيد المحاولة
فورًا. استخدمه فقط إذا غيّرت IP أو تأكّدت أن الموقع لم يعد يحجبك.

---

## 10. سجل الاختبارات اليدوية

تم اختبار:
- `python validate_cache.py .cache/fbref .` يطبع `[OK] standard 860 players`
  و9 خطوط `[FAIL] not fetched` للمجموعات الناقصة. `Exit 0` لأن standard متاحة.
- `runPlayerStatsAssistant` (Phase E) لم يتأثر — لا يقرأ من state.
- بعد محاكاة `record_failure(state, "shooting", reason="captcha ...")` ثم
  `save_state`، أصبح `validate_cache` يطبع
  `[SKIP] shooting cooldown until 2026-05-18 08:01 UTC` بدلاً من `[FAIL]`.
- `decide_groups` يميّز بين `fresh_today / cooldown / missing / force_refresh`
  كما هو متوقع.
- `cleanup_processes.ps1` يقرأ lock file، يعمل `taskkill /T /F` على childPid،
  ثم يكنس chromedriver/chrome المرتبطة بالماركر `soccerdata` أو
  `reo-datafootball-worker`. لا يلمس متصفّح المستخدم العادي.

---

## 11. ما الذي لم يُلمس (الحدود الصلبة لـ Phase F)

- `ops/player-stats-bridge/**` — لم يُلمس.
- `api/player-stats.ts` — لم يُلمس.
- توكنات `REO_PLAYER_STATS_BRIDGE_*` — لم تُقرأ ولم تُكتَب.
- `pages/Editor.tsx`, `components/renderers/PlayerStatsRenderer.tsx`,
  `utils/playerStatsLabAssistant.ts` — لم تُلمس.
- VPS systemd timer (`reo-fbref-daily.timer`) و
  `run_daily_limited.sh` — لم يُلمسا (تركتهما على `STAT_GROUPS=standard`
  حسب المتطلب أن لا أعدّل VPS، حتى لو كان من الأفضل لاحقًا توسيعهما).
- proxy / cloud scraping — صفر.
- بيانات وهمية — صفر.

---

## 12. الملفات المُضافة / المُعدّلة في هذه المرحلة

```
deploy/reo-datafootball-worker/
  providers/
    fetch_state.py                                   ← جديد
    provider_selector.py                              ← مُعدّل (state + skip + force_refresh + skippedStatGroups in last_updated.json)
    fbref_big5_direct_provider.py                     ← مُعدّل (delay 10–20s عشوائيًا)
    fbref_soccerdata_provider.py                      ← مُعدّل (delay 10–20s + tagging captcha errors)
  validate_cache.py                                   ← مُعدّل (per-group OK/FAIL/SKIP block, worker_dir param)
  run_local_sync_vps.ps1                              ← مُعدّل (-ForceRefresh, try/finally cleanup, validate worker_dir)
  cleanup_processes.ps1                               ← جديد
  windows_tray/quick_actions/
    run_full_cache_sync.bat                           ← جديد
    run_standard_only.bat                             ← جديد
    run_missing_groups_only.bat                       ← جديد
    force_refresh_all.bat                             ← جديد
    check_cache_status.bat                            ← جديد
    open_cache_logs.bat                               ← جديد

reports-ar/
  2026-05-18-complete-smart-cache-coverage.md         ← هذا التقرير
```

لم تُعدَّل أي ملفات TypeScript / React / Vercel. لم يُشغَّل `npm run build`
لأن لا تغييرات frontend. تم تشغيل `python -m py_compile` على كل ملفات Python
المعدّلة بنجاح.
