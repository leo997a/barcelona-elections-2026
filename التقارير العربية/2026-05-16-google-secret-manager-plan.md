# خطة تفعيل Google Secret Manager — تصميم فقط
التاريخ: 2026-05-16
الحالة: ⏸️ لم يُفعّل — خطة مستقبلية

---

## أ. الوضع الحالي

| المكوّن | مكان التخزين | الحالة |
|---------|-------------|--------|
| `GEMINI_API_KEY` | Vercel Environment Variables | ✅ آمن |
| `EDITOR_ADMIN_PASSCODE` | Vercel Environment Variables | ✅ آمن |
| `ADMIN_SESSION_SECRET` | Vercel Environment Variables | ✅ آمن |
| `LICENSE_SECRET` | Vercel Environment Variables | ✅ آمن |
| `LICENSE_ADMIN_SECRET` | Vercel Environment Variables | ✅ آمن |
| `REO_PLAYER_STATS_BRIDGE_TOKEN` | Vercel Environment Variables | ✅ آمن |
| `REO_PLAYER_STATS_TOKEN` | VPS / PM2 env أو `.env` محمي | ✅ آمن |
| `secretProvider` | `EnvSecretProvider` فقط | ✅ يعمل |

**لا يوجد:**
- ❌ service account JSON في المشروع
- ❌ credentials في GitHub
- ❌ secrets في `dist/` أو `public/`

---

## ب. الوضع المستقبلي المقترح (VPS)

### الهدف
نقل `REO_PLAYER_STATS_TOKEN` من ملف `.env` على VPS إلى Google Secret Manager.

### الآلية
- استخدام **Application Default Credentials** (ADC)
- لا يوجد key file ولا service account JSON في المشروع
- الـ VM يستخدم service account مربوط بـ GCE metadata
- الكود يستدعي `@google-cloud/secret-manager` SDK

### المزايا
| الميزة | الوصف |
|--------|-------|
| تدوير تلقائي | يمكن تدوير التوكن بدون إعادة نشر |
| تدقيق | Cloud Audit Logs لكل access |
| أمان أعلى | لا ملفات `.env` على القرص |
| IAM | صلاحيات دقيقة per-secret |

---

## ج. الأوامر المقترحة (لا تُنفّذ الآن)

```bash
# 1. تفعيل الخدمة
gcloud services enable secretmanager.googleapis.com

# 2. إنشاء السر
gcloud secrets create reo-player-stats-token \
  --replication-policy=automatic

# 3. إضافة القيمة
printf "%s" "$REO_PLAYER_STATS_TOKEN" | \
  gcloud secrets versions add reo-player-stats-token --data-file=-

# 4. ربط الصلاحية بـ VM service account
gcloud secrets add-iam-policy-binding reo-player-stats-token \
  --member="serviceAccount:YOUR_VM_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 5. اختبار القراءة من VM
gcloud secrets versions access latest --secret=reo-player-stats-token
```

⚠️ **هذه الأوامر لا تُنفّذ إلا بعد:**
1. اختبار منفصل على بيئة staging
2. موافقة المالك
3. backup للتوكن الحالي

---

## د. قواعد الأمان الصارمة

| القاعدة | التفاصيل |
|---------|----------|
| ❌ لا نعطي الوكيل token كامل | الوكيل يرى fingerprint فقط |
| ❌ لا نرفع service account JSON | يُستخدم ADC حصراً |
| ❌ لا credentials في GitHub | ممنوع نهائياً |
| ❌ لا تفعيل بدون اختبار | لا `SECRET_PROVIDER=google_secret_manager` إلا بعد staging |
| ✅ نقل secret واحد في كل مرة | `REO_PLAYER_STATS_TOKEN` أولاً، ثم الباقي تدريجياً |
| ✅ fallback إلى env | إذا فشل GSM، يقرأ من env |

---

## هـ. التغييرات المطلوبة في الكود (مستقبلاً)

| الملف | التغيير |
|-------|---------|
| `services/secrets/secretProvider.ts` | إضافة `GoogleSecretProvider` class |
| `services/secrets/secretProvider.ts` | factory function تختار بناءً على `SECRET_PROVIDER` env |
| `.env.example` | إضافة `SECRET_PROVIDER=env` (default) |
| `package.json` | إضافة `@google-cloud/secret-manager` dependency |

**لا يُنفّذ أي من هذا الآن.**

---

## و. متى يُفعّل؟

**شروط التفعيل:**
1. ✅ RBAC مستقر على الإنتاج (تم)
2. ✅ Secrets Vault يعرض metadata بأمان (تم)
3. ⬜ إعداد GCP project مع billing
4. ⬜ ربط VM service account
5. ⬜ اختبار staging ناجح
6. ⬜ موافقة المالك النهائية
