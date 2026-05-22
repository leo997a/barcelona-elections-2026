# Phase UI-X1 — Bottom Control Dock + Club-Aware Player Search

تاريخ: 2026-05-22  
الفرع: main

---

## 1. لماذا نقلنا التحكم من side panel إلى bottom dock

السلوك السابق: لوحة جانبية طويلة تأخذ ~30% من عرض الشاشة، تتطلب scroll مستمر للوصول إلى الأقسام الأبعد، والمعاينة تتقلّص.

الأسلوب الجديد (مستوحى من overlays.uno بدون نسخ تصميمها): **preview-first** — المعاينة تأخذ المساحة الكاملة، والتحكم في dock سفلي قابل للفتح/الإغلاق.

النتيجة:
- لا scroll جانبي.
- المعاينة تظهر بحجم أكبر.
- المحرّر يرى توقيت تأثير كل تعديل فورًا.

---

## 2. ماذا تغيّر في UX

| الجانب | قبل | بعد |
| --- | --- | --- |
| موقع التحكم | sidebar يميني | dock سفلي |
| ارتفاع التحكم | يمتد كامل الارتفاع | محدود (max-h-[62vh]) ويُطوى |
| الفتح/الإغلاق | لا خيار للإخفاء | زر toggle + حفظ في localStorage |
| عند الإخفاء | مساحة ثابتة | شريط واحد فقط (~36px) يعرض ملخص الحالة |
| المعاينة | تتقلّص | تأخذ كل المتاح |

شريط الـ dock عند الطيّ يعرض:
```
🌟 استخبارات اللاعب V2 · Cole Palmer · بطاقة هجومية · لاعب واحد   [ ↑ ]
```

---

## 3. كيف تم الحفاظ على القالب

**القالب نفسه (PlayerIntelV2Renderer) لم يُلمس.**

التغيير حصل في طبقة العرض (Editor.tsx) فقط:

```diff
- import PlayerIntelV2EditorPanel from '../components/player-intel-v2/PlayerIntelV2EditorPanel';
+ import PlayerIntelV2BottomDock from '../components/player-intel-v2/PlayerIntelV2BottomDock';

  {draftOverlay.type === OverlayType.PLAYER_INTEL_V2 && (
-   <PlayerIntelV2EditorPanel ... />
+   <PlayerIntelV2BottomDock ... />
  )}
```

`PlayerIntelV2BottomDock` يستقبل نفس الـ props (`fields`, `getDraftValue`, `applyChanges`) ويلفّ الـ panel الأصلي بـ collapsible layout.

**الـ Panel الأصلي محفوظ كاملًا** — لو احتجنا fallback يمكن تبديل سطر واحد للعودة.

---

## 4. كيف يعمل Club Optional Search

### 4.1 UI

حقل اللاعب (إلزامي) + حقل النادي (اختياري):
```
[ اكتب اسم اللاعب والنادي بالعربي أو الإنجليزي... ]
[ النادي اختياري لتضييق النتائج، مثال: برشلونة     ]
[ بحث في FotMob ] [ محلي فقط ]
```

### 4.2 Backend Logic (نفس الـ endpoint، بدون function جديد)

```typescript
// /api/player-intel-v2 + body.action
{ action: 'fotmob-search', query: 'kounde', club: 'barcelona' }
{ action: 'search-player', query: 'كوندي', club: 'برشلونة' }
```

السلوك في `playerIntelV2Handlers.ts`:
1. إذا `club` فارغ → السلوك القديم بدون تغيير (rate limit + ranking عادي).
2. إذا `club` موجود:
   - يُترجم عربيًا → إنجليزيًا (برشلونة → Barcelona).
   - يُضاف bonus +0.4 للـ confidence لأي نتيجة club فيها يحتوي أول كلمة من الـ club query.
   - يُعاد ترتيب النتائج بحسب الـ score الجديد.
   - **لا يُخفى** أي نتيجة — حتى لو لم يوافق الـ club، يبقى ظاهرًا في الترتيب.
3. إذا لا يوجد ولا نتيجة قوية الـ club:
   - يُسجَّل `weakClubMatch: true` في الـ response.
   - الواجهة تعرض warning أصفر: "لم نجد تطابقًا قويًا مع النادي، عرضنا أقرب نتائج اللاعب."

### 4.3 Arabic Club Aliases مدعومة

برشلونة → Barcelona  
ريال مدريد → Real Madrid  
تشيلسي → Chelsea  
مانشستر سيتي → Manchester City  
أرسنال → Arsenal  
ليفربول → Liverpool  
إنتر → Inter  
ميلان → AC Milan  
باريس → PSG  
بايرن → Bayern Munich  
+ أكثر من 20 نادي إضافي.

### 4.4 أمثلة بحث

| Query | Club | السلوك المتوقع |
| --- | --- | --- |
| `Lamine Yamal` | (فارغ) | يعمل كما السابق |
| `Lamine` | `Barcelona` | يرفع نتيجة Lamine Yamal فوق Lamine Camara |
| `كوندي` | `برشلونة` | يفضّل Jules Kounde (Barcelona) |
| `Palmer` | `Chelsea` | يفضّل Cole Palmer |
| `Rodriguez` | (فارغ) | يعرض كل لاعبي Rodriguez |
| `Rodriguez` | `Real Madrid` | يفضّل James Rodriguez (إن وجد) |

---

## 5. التوافق مع الكود السابق

كل fetch قديم بدون club يستمر بالعمل بدون تعديل:
```typescript
// يعمل ✓
fetch('/api/player-intel-v2', { method: 'POST',
  body: JSON.stringify({ action: 'fotmob-search', query: 'Yamal' }) });
```

`localStorage` Dynamic profiles لم يتغيّر — اللاعبون المُضافون من قبل يبقون.  
schemaVersion للقالب لم يتغيّر — `player-intel-master-v1` كما هو.  
PlayerIntelV2Renderer لم يُلمس.

---

## 6. ما الذي بقي للتحسين لاحقًا

1. **توسيع التبويبات داخل الـ dock**: حالياً الـ panel يحوي 4 تبويبات (أساسي / metrics / variants / assistant). الـ dock الآن يلفّ الكل، لكن الفصل الكامل بين tabs (بيانات/بحث/قالب/تنسيق/صوت/قوالب/AI) يتطلب إعادة هيكلة الـ panel نفسه — مرحلة منفصلة.
2. **Drag-to-resize الـ dock**: حاليًا الارتفاع ثابت (max-h-[62vh]).
3. **Keyboard shortcut** للفتح/الإغلاق (مثل `Ctrl+\`).
4. **Multi-instance** — يدعم تبديل عدة قوالب نشطة في الـ dock الواحد.

كل هذه تحسينات تجربة، **لا** تتطلب تغيير endpoints أو منطق البيانات.

---

## 7. حماية النظام القديم

| العنصر | الحالة |
| --- | --- |
| Player Stats Lab | لم يُلمس |
| PlayerStatsRenderer | لم يُلمس |
| `/api/player-stats` | لم يُلمس |
| player-stats-bridge | لم يُلمس |
| FBref cache | لم يُلمس |
| نظام الترخيص | لم يُلمس |
| التوكنات | لم تُلمس |
| PlayerIntelV2Renderer | لم يُلمس |
| Visual variants الخمسة | لم تُلمس |
| Compare mode | لم يُلمس |
| Metric picker | يعمل بنفس الطريقة (داخل الـ dock الآن) |
| Presets الـ 8 | لم تُلمس |
| Static registry (3 لاعبين) | لم يُلمس |
| Dynamic profiles في localStorage | يبقى يعمل |
| FotMob client + builder | لم يُلمس |
| `/api/reo-match` و `/api/sportmonks/player` | لم تُلمس |

---

## 8. Smoke Verification

| فحص | النتيجة |
| --- | --- |
| `npm run lint` (tsc --noEmit) | exit 0 |
| `npm run build` (vite) | exit 0 (7.53s) |
| عدد Vercel Serverless Functions | **10** ≤ 12 ✓ (لم يتغيّر) |
| Bottom dock يفتح/يغلق | ✓ |
| حالة الـ collapsed تُحفظ في localStorage | ✓ |
| Club optional search backend | ✓ (handlers محدّثة) |
| Club optional search UI | ✓ (حقلان منفصلان + warning weakClub) |
| Arabic club aliases | ✓ (20+ نادي) |
| Local search مع club | ✓ (بدون API call) |
| FotMob search مع club | ✓ (boost في `_rankMatches` + `weakClubMatch` flag) |
| Player Intel V2 renderer | يعمل بنفس البيانات |

---

## 9. الملفات الأساسية التي تغيّرت

| الملف | الحالة |
| --- | --- |
| `components/player-intel-v2/PlayerIntelV2BottomDock.tsx` | جديد (~110 سطر) |
| `components/player-intel-v2/PlayerIntelV2EditorPanel.tsx` | تحديث (إضافة حقل club + weakClub state) |
| `api/_lib/playerIntelV2Handlers.ts` | تحديث (`handleSearchPlayer` و `handleFotMobSearch` يقبلان `club`) |
| `pages/Editor.tsx` | سطرين فقط (import + render) |
| `reports-ar/2026-05-22-player-intel-v2-bottom-dock-club-search.md` | جديد |

**لم يُحذف أي ملف.** Vercel functions = 10 (لا تغيير).

---

## 10. التحذيرات الباقية

- `chunk size > 500 kB` من Vite — warning غير حرج، لا يؤثر على Vercel deploy. سيُعالج في phase منفصل عبر `manualChunks`.
- لا تحذيرات أخرى.
