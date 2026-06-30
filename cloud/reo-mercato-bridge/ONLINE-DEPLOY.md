# جسر الميركاتو الأونلاين

هذه النسخة هي خدمة الجسر التي تستهلكها القوالب عبر `/api/mercato` في تطبيق REO.

## التشغيل

```bash
npm install
npm start
```

الخدمة تستمع افتراضيًا على:

```text
0.0.0.0:${PORT:-4319}
```

## المسارات

- `GET /health`
- `GET /api/feed?view=fee|latest`
- `GET /api/refresh?view=fee|latest`

## الحماية

إذا تم ضبط أحد المتغيرين التاليين، تصبح مسارات البيانات محمية:

```text
REO_TRANSFERS_BRIDGE_TOKEN=...
REO_BRIDGE_TOKEN=...
```

عندها يجب أن يرسل تطبيق REO:

```text
Authorization: Bearer <token>
```

## ربطه مع تطبيق REO على Hostinger

بعد نشر هذه الخدمة على رابط عام، ضع في بيئة تطبيق REO:

```text
REO_TRANSFERS_BRIDGE_URL=https://YOUR-MERCATO-BRIDGE.example.com/api/feed
REO_TRANSFERS_BRIDGE_TOKEN=YOUR_TOKEN_IF_USED
```

القوالب لا تتصل بهذا الرابط من المتصفح مباشرة. هي تطلب `/api/mercato` من نفس موقع REO، وهذا المسار يتولى الاتصال بالجسر الأونلاين وإرجاع البيانات بتشخيص واضح.
