# Mercato Templates Polish · Private Chat/Call Audio · Library Taxonomy

**التاريخ**: 2026-05-22
**الحالة**: مكتمل ميكانيكيًا (lint + build نظيفان، 42/42 static check pass، 10 functions)
**Commit المرجعي السابق**: 16d0868 (AUDIO-PACKS-X5 + MERCATO-TEMPLATES-X6)

---

## 1. لماذا كانت القوالب ضعيفة (X6 Audit)

| القالب | المشكلة قبل X7 |
|---|---|
| Agent Call #2 | layout بسيط (2 أعمدة)، لا hierarchy، لا status pills (LIVE/RECORDED/PRIVATE)، transcript bubbles بدون labels، لا confidence indicator |
| Deal Radar | radar SVG بدائي، sources كقائمة مسطحة بدون progress bars |
| Club Statement | بدون stamp watermark، typography ضعيف |
| Deadline Hour | countdown مدمج مع stages، بصري مزدحم |
| Source Confidence | tiers بدون counters، items صغيرة |
| Clause Reveal | بلا highlight للقيمة، بلا decorative depth |
| Medical Tracker | grid فقط بدون subtitles لكل مرحلة، حالة "الآن/مكتمل/لاحقًا" غير واضحة |
| Hijack Alert | clubs cards متطابقة بدون visual distinction، لا VS divider واضح |
| Personal Terms | 3 cards بدون disclaimer لطبيعة المعلومات |
| Here We Go Build-Up | timeline بـ dot-line بسيط بدون highlight للمرحلة الأخيرة |

السبب الجذري: الـ X6 ركّز على بناء البنية (factory + 10 variants + scenes)، لكن لم يُمَدِّد الـ visual primitives.

---

## 2. تحسين Agent Call #2

### قبل
```
[ deal context ] [ transcript bubbles ]
```

### بعد X7
```
┌──────────────────────────────────────────────────┐
│ 📞  AGENT — JORGE MENDES   |  REPORTER         │
│ ● LIVE  03:42              |  ●●●● ثقة 85%     │
├─────────┬──────────────────┬─────────────────────┤
│ صفقة    │  TRANSCRIPT      │  المصدر             │
│         │                  │                     │
│ 👤 صورة │  AGENT bubble    │  🔒 مصدر مغلق       │
│ Player  │  REPORTER bubble │                     │
│         │                  │  الحالة:           │
│ من › إلى │  AGENT bubble    │  ● اتفاق المبدأ    │
│         │  REPORTER bubble │  ● الفحص الطبي     │
│ €58M    │                  │  ○ الإعلان         │
└─────────┴──────────────────┴─────────────────────┘
```

التحسينات الفعلية:

- **Top bar غني**: callerName + role + status pill (LIVE/RECORDED/PRIVATE_SOURCE) + duration + reporter + confidence bar 85%.
- **3 أعمدة** (260px / 1fr / 220px) — kept inside 16:9 بأمان.
- **Status pills حقيقية** — تتبدل حسب `callStatus` field: `live` (أحمر متحرك)، `recorded` (أصفر)، `private_source` (بنفسجي).
- **Transcript bubbles** بـ corner-radius غير متماثل (chat-app style)، وlabel "AGENT/REPORTER" فوق كل bubble.
- **Player image اختياري** — لو الـ field فاضي **لا يظهر صندوق فارغ قبيح** (`onError → display:none`).
- **From → To clubs** كـ mini card مع arrow.
- **Deal value** كـ hero stat في الـ accent color.
- **Source panel** بدلاً من المساحة الفارغة سابقًا.

### scene جديد: `mercato_private_chat_call`

| | القيمة |
|---|---|
| enterCue | `SOFT_CALL_RING_LIGHT` (rang ناعم 660Hz × 2 pulse) |
| exitCue | `SOFT_CALL_END` (descending 700Hz → 500Hz) |
| updateCue | `SOFT_CHAT_INCOMING` (descending 1175Hz → 880Hz) |
| ambientCue | `SOFT_TYPING_PULSE` (3 quick taps) |
| voiceRecommended | `true` |
| defaultVoiceTrigger | **`manual_only`** |

كل الـ 5 cues الجديدة:
- `sine` waveform فقط
- gain ≤ 0.18
- decay 0.04-0.18s
- **بدون** subBass / shimmer / sweep / random noise
- **مستوحاة من** تجربة المراسلة لكن **ليست نسخًا** من أي تطبيق محمي

تطبيق الـ scene الآن في Agent Call #2 يُولّد إحساس مكالمة خاصة محترم بدون انتهاك حقوق.

---

## 3. WhatsApp-like Original Audio (بدون نسخ)

### السياسة الصارمة

- **لا** ملف صوتي من WhatsApp / Telegram / Messenger.
- **لا** copy لـ default tones من تطبيقات محمية.
- الـ 5 cues الجديدة **synth-generated** عبر WebAudio، sine pure، فريدة.

### الـ cues الجديدة (5)

| Cue | السلوك | الاستخدام |
|---|---|---|
| `SOFT_CHAT_INCOMING` | descending two-tone (D6→A5) | رسالة واردة |
| `SOFT_CHAT_OUTGOING` | ascending two-tone (A5→E6) | رسالة مرسلة |
| `SOFT_CALL_RING_LIGHT` | two evenly-spaced pulses 660Hz | dial ring |
| `SOFT_CALL_END` | descending 700→500Hz | إنهاء مكالمة |
| `SOFT_TYPING_PULSE` | 3 quick taps 1500Hz | typing indicator |

### Direct URL — ما زال يعمل

`utils/voiceLibrary.ts → resolveVoiceUrl()`:
```ts
const direct = (directUrl || '').trim();
if (direct) return direct;  // أولوية مطلقة
```

المستخدم إذا أراد صوت WhatsApp الفعلي **يرفعه/يلصق رابطه بنفسه** عبر `voiceDirectUrl` field في `<AudioSettingsPanel>`. **لا** نوفّره نحن.

ملاحظة لـ TODO المستقبلي (لم تُنفَّذ في X7):

```
TODO: Global local audio upload via IndexedDB.
```

السبب: تنفيذها يحتاج IndexedDB store + UI رفع ملفات + integration مع `resolveVoiceUrl`. هذا تغيير كبير لـ phase منفصل. الآن المستخدم لديه `voiceDirectUrl` field كافٍ.

---

## 4. Polish لكل قالب من العشرة

### Shared primitives (X7 جديد)

أضفت 4 primitives مشتركة في `MercatoUnifiedRenderer`:
- **`<Pill t color label pulse small>`** — badge صغير مع dot متحرك.
- **`<Header t eyebrow title subtitle pills rightSlot accent>`** — header موحّد بـ gradient stripe.
- **`<FieldCard t label value accent large>`** — بطاقة قيمة موحّدة.
- **`<ProgressBar t value color height>`** — شريط تقدم.

كل القوالب الـ 10 تستخدم هذه الـ primitives → consistency بصرية + أقل تكرار.

### القوالب بعد X7

| القالب | التحسين |
|---|---|
| Agent Call #2 | إعادة تصميم كاملة (كما أعلاه) |
| Deal Radar | radar SVG محسّن (cross + diagonal grid)، sources كـ progress bars |
| Club Statement | watermark stamp 📜 خلفية، gradient stripe، typography أقوى |
| Deadline Hour | header منفصل عن stages grid، countdown ضخم 52px في right slot |
| Source Confidence | counter لكل tier، items داخل sub-cards |
| Clause Reveal | gradient stripe + 📄 watermark، value box بـ 2-color highlight |
| Medical Tracker | subtitle لكل مرحلة + label "✓ مكتمل / ● الآن / — لاحقًا" + grayscale للـ inactive |
| Hijack Alert | VS divider بـ ⚡ glow، original vs hijack بـ visual distinction (الـ hijack بـ 2px red border) |
| Personal Terms | disclaimer ribbon أسفل ("بيانات غير قابلة للتأكيد رسميًا") |
| Here We Go Build-Up | vertical timeline حقيقي بـ glowing dots + last entry highlighted بـ green border + background |

كلها داخل **MercatoUnifiedRenderer** (renderer واحد، 10 variants).

---

## 5. Library Taxonomy

### قبل
- `TYPE_FILTERS` flat — 25 filter بسيط فلات.
- لا hierarchy، لا categories.
- Mercato templates مختلطة مع Election ومع Sponsors.

### بعد X8

ملف جديد `utils/templateTaxonomy.ts`:

#### 7 categories:

| Category | labelAr | Icon | Order |
|---|---|---|---|
| `mercato` | ميركاتو | 💼 | 1 |
| `match` | المباريات | ⚽ | 2 |
| `player` | استخبارات اللاعب | 🧠 | 3 |
| `newsroom` | غرفة الأخبار | 📰 | 4 |
| `social_stream` | بث وسوشيال | 🎥 | 5 |
| `utilities` | أدوات عامة | 🔧 | 6 |
| `legacy` | كلاسيكية | 📦 | 99 (دائمًا في الأخير) |

#### subcategories مفصّلة (20):

- **Mercato**: breaking, agents_sources, deal_analysis, official, deadline, medical_final
- **Match**: scoreboards, stats
- **Player**: profile, intel, h2h
- **Newsroom**: breaking, smart_news, lower_thirds
- **Social**: sponsors, viewers, guests, alerts
- **Utilities**: elections, episode, misc
- **Legacy**: classic

#### TYPE_TO_TAXONOMY mapping

كل `OverlayType` مُرفَق بـ `(category, subcategory, priority)`. Library يعرض القوالب مرتبة حسب priority داخل كل category.

#### Library UI

أُضيف **category sidebar** فوق `TYPE_FILTERS` الموجود:

```
الفئة الرئيسية
  📋 كل الفئات
  💼 ميركاتو       ← مع accent ٠٠
  ⚽ المباريات
  🧠 استخبارات اللاعب
  📰 غرفة الأخبار
  🎥 بث وسوشيال
  🔧 أدوات عامة
  📦 كلاسيكية

نوع القالب  ← السابق (يبقى متاح كـ secondary filter)
  الكل
  Match Stats
  Player Stats
  ...
```

اختيار `category=mercato` يُصفّي كل العرض إلى 11 قالب فقط (1 unified + 5 innovative + 4 mercato-related). اختيار `category=player` يعزل Player Intel V2 + Player Stats + Player Profile + H2H + Barca Premium.

**القوالب القديمة لم تختفِ** — كلها مكتشفة في `TYPE_TO_TAXONOMY`. ولو نسي قالب جديد التسجيل، fallback `legacy.classic` يعرضه في القسم الأخير.

---

## 6. اختبار 10 قوالب (تحقق ساكن — 42/42 PASS)

| القالب | shared primitives | بصري قوي | audioScene مناسب | Direct URL يعمل | Voice/SFX منفصلين | لا تكرار حقول | تصنيف صحيح |
|---|---|---|---|---|---|---|---|
| Agent Call #2 | ✅ Pill+Header+ProgressBar | ✅ 3-col premium | ✅ mercato_private_chat_call | ✅ resolveVoiceUrl | ✅ X4 gates | ✅ dedupeFields | ✅ mercato.agents_sources |
| Deal Radar | ✅ Header+ProgressBar | ✅ SVG radar محسّن | ✅ analysis_lab | ✅ | ✅ | ✅ | ✅ mercato.deal_analysis |
| Club Statement | ✅ Pill+Header | ✅ watermark + gradient | ✅ official_club_statement | ✅ | ✅ | ✅ | ✅ mercato.official |
| Deadline Hour | ✅ Pill+Header | ✅ countdown 52px + stages | ✅ deadline_drama | ✅ | ✅ | ✅ | ✅ mercato.deadline |
| Source Confidence | ✅ Header | ✅ tier counters + sub-cards | ✅ analysis_lab | ✅ | ✅ | ✅ | ✅ mercato.agents_sources |
| Clause Reveal | ✅ Pill+Header | ✅ gradient stripe + value box | ✅ transfer_agreement_close | ✅ | ✅ | ✅ | ✅ mercato.official |
| Medical Tracker | ✅ Pill+Header | ✅ 4 stages + grayscale state | ✅ premium_subtle | ✅ | ✅ | ✅ | ✅ mercato.medical_final |
| Hijack Alert | ✅ Pill+Header+ProgressBar | ✅ VS divider + 2-tone | ✅ breaking_news_clean | ✅ | ✅ | ✅ | ✅ mercato.breaking |
| Personal Terms | ✅ Pill+Header+FieldCard | ✅ disclaimer + 3 cards | ✅ mercato_chat_whisper | ✅ | ✅ | ✅ | ✅ mercato.agents_sources |
| Here We Go Build-Up | ✅ Pill+Header | ✅ glowing timeline | ✅ transfer_agreement_close | ✅ | ✅ | ✅ | ✅ mercato.breaking |

---

## 7. النتائج الميكانيكية

| Check | Result |
|---|---|
| `npm run lint` | ✅ Exit 0 |
| `npm run build` | ✅ Exit 0 (1813 modules transformed) |
| Function count | ✅ **10** ≤ 12 |
| Static verification | ✅ **42/42 pass** |
| ملفات صوتية مضافة | ❌ صفر |
| ملفات بأسماء WhatsApp/Telegram/Messenger | ❌ صفر (تأكيد آلي) |
| API endpoints جديدة | ❌ صفر |

---

## 8. الملفات المعدَّلة (8)

```
services/audioEngine.ts                                       (+5 SOFT cues + priority + previewable)
utils/templateAudioScenes.ts                                  (+1 scene: mercato_private_chat_call)
utils/templateTaxonomy.ts                                     (جديد، 110 سطر — 7 categories + 20 subcategories)
constants.ts                                                  (Agent Call #2 يستخدم scene الجديد + 5 fields إضافية: callStatus, playerImage, clubFrom, clubTo, confidencePct)
components/renderers/MercatoUnifiedRenderer.tsx               (إعادة كتابة كاملة — shared primitives + polish لكل 10 variants)
pages/Library.tsx                                             (category sidebar + filter منطقي)
reports-ar/2026-05-22-mercato-template-quality-audio-taxonomy.md   (التقرير)
```

غير ملموس:
- `services/syncManager.ts` — لا تغيير.
- `public/audio/`, `public/sounds/` — لا ملف جديد.
- Player Stats Lab، Player Intel V2 — لم تُلمس.
- Stream Deck plugin — لم يُلمس.
- `api/*` — لا endpoint جديد.

---

## 9. ما لم يُنفَّذ (مؤجَّل لـ phase مستقل)

1. **IndexedDB-backed local audio upload** — TODO واضح في الكود. الآن `voiceDirectUrl` كافٍ للـ URLs.
2. **Per-template audio scene UI shortcut** — حاليًا الـ scene picker موجود في `<AudioSettingsPanel>` فقط. اختصار سريع داخل ControlBar مؤجَّل.
3. **Library two-level breadcrumb** (category › subcategory) — حاليًا category في الـ sidebar فقط، subcategories متاحة في الـ data لكن غير مستهلكة في UI.
