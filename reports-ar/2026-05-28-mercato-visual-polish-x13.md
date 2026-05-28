# MERCATO-VISUAL-POLISH-X13 — تقرير عربي شامل

**التاريخ**: 28 مايو 2026
**Commit السابق**: `e88470e` (تنظيف لوحة الصوت)
**النطاق**: `components/renderers/MercatoUnifiedRenderer.tsx` فقط
**القيود المحترمة**: لا قوالب جديدة · لا endpoint جديد · لا تغيير في template IDs · لا لمس Player Intel V2 / Stream Deck · لا ملفات صوتية جديدة · لا redesign للـ Editor · لا git add -A · الصوت لم يُلمس.

---

## 1. ما الذي كان ضعيفًا بصريًا (audit مكتوب)

التفاصيل الكاملة في `reports-ar/2026-05-28-mercato-visual-audit-pre-x13.md`. الخلاصة:

- **Emoji-driven**: 📞 📜 📄 💼 ✈️ 🏥 ✍️ 📢 ⚡ موزَّعة على 7 من 10 قوالب، تعطي إحساس prototype.
- **Empty states ميتة**: نص رمادي خافت "أضف المصادر..." بدون illustration.
- **No avatar fallback**: قوالب تطلب `playerImage` لكن لا fallback، مساحة فارغة قبيحة.
- **Source panel ثابت** في Agent Call: 3 stages مكتوبة hardcoded لا تعكس البيانات.
- **Transcript مكسور**: `direction: ltr` مفروض على كل الرسائل، يكسر الرسائل العربية.
- **Hijack Alert**: ⚡ كـ VS divider بدون gauge بصري للخطر.
- **Medical Tracker**: emojis childish لقالب طبي.
- **Club Statement**: 📜 emoji watermark + border ملون جدًا، يكسر رسميَّة البيان.

---

## 2. كيف تم تحسين Agent Call #2 (الأولوية القصوى)

### قبل
- إيموجي 📞 كـ avatar.
- صورة لاعب بدون fallback (مساحة فارغة).
- transcript يفرض LTR.
- right panel فيه 3 stages مكتوبة بالكود (لا تستجيب للبيانات).

### بعد
- **Avatar حقيقي** من `getInitials(callerName)`. إذا اسم `AGENT — JORGE MENDES` يصبح `JM` على circle ملوَّن. صورة player في left card تستخدم نفس Avatar مع image fallback تلقائي إن فشل التحميل.
- **Live indicator على avatar الوكيل**: نقطة حمراء صغيرة فيها أيقونة phone عند `callStatus === 'live'`.
- **Waveform animation**: 10 bars متحركة بجانب اسم الوكيل عند live.
- **Right panel ديناميكي**: يقرأ `callStatus` و `confidencePct`. الـ stages الثلاث (اتفاق المبدأ 40% / فحص طبي 70% / إعلان 95%) تُلوَّن وتتحرك حسب نسبة الثقة الفعلية.
- **Privacy mode**: لون مختلف وأيقونة `lock` عند `callStatus === 'private_source'`.
- **Transcript ذكي**: كل رسالة تُختبَر بـ `isRtl(line.text)` فتُوجَّه تلقائيًا يمين/يسار حسب لغتها.
- **Empty state أنيق**: أيقونة phone + "في انتظار بدء المكالمة" بدلاً من "أضف محادثة المكالمة في الإعدادات".
- **Deal headline**: `line-clamp-2` يمنع الكسر.

---

## 3. ما تغيَّر في كل قالب من العشرة

### Agent Call (#1) — أعلاه

### Deal Radar (#2)
- **قبل**: radar مجرد ديكور، sources list مسطح بنفس اللون، lines قطرية مزدحمة.
- **بعد**: blips حقيقية ترسم فوق الـ radar (max 8) في حلقات حسب tier — A على الحلقة الداخلية / B الوسطى / C الخارجية. ألوان tier على blips + source list + ProgressBar الموحَّد. lines القطرية حُذفت. Empty state بأيقونة pulse + "في انتظار رصد المصادر".

### Club Statement Watch (#3)
- **قبل**: watermark 📜 إيموجي + border ملون جدًا.
- **بعد**: layout `[160px monogram | 1fr body]`. monogram = حرفان من اسم النادي على circle بحجم 96px مع icon stamp تحته. accent strip فقط، لا border ملون. body فيه auto-direction للنص. clock icon بجانب التاريخ.

### Deadline Hour (#4)
- **قبل**: stages chevron بدون glow على active. timer بدون container.
- **بعد**: timer داخل rounded card مع red glow box-shadow ووجود icon clock بجانبه. active stage فيه `boxShadow: 0 0 18px accent60` + نقطة pulse فوقه. progress bar أحمر يبين النسبة (idx/5). connector chevron `›` استُبدل بـ Icon.

### Source Confidence Board (#5)
- **قبل**: empty `—` لكل column = ميت.
- **بعد**: header rightSlot يعرض A/B/C counts. كل column عليه Icon (check / pulse / warning). كل source card عليه `borderRight: 3px tier-color`. empty state بـ "لا مصادر في هذه الطبقة". source name بـ auto-direction.

### Hidden Clause Reveal (#6)
- **قبل**: 📄 watermark + 💼 emoji في القيمة.
- **بعد**: watermark = SVG `doc` icon بـ opacity 0.05. اللاعب فيه avatar (initials أو image). pill إضافي "CLASSIFIED · CLAUSE" بجانب الـ pill الرئيسي. القيمة فيها `briefcase` SVG icon بدل 💼.

### Medical Tracker (#7)
- **قبل**: ✈️🏥✍️📢 emojis childish + grayscale CSS filter.
- **بعد**: SVG icons (`plane` / `hospital` / `signature` / `megaphone`) داخل circle ملوَّن. badge رقم خطوة (01/02/03/04) في كل بطاقة. **connector line gradient** خلف البطاقات. active stage glow + pulse dot. dim stages بـ opacity 0.55 بدل grayscale (يعمل عبر كل المتصفحات). header rightSlot فيه avatar للاعب.

### Hijack Alert (#8)
- **قبل**: ⚡ emoji + risk meter موجود مرتين.
- **بعد**: **risk gauge SVG** في الوسط — half-circle بثلاث طبقات لون (success/warning/danger) مع needle محسوب من الـ risk%. النادي الأصلي والخاطف كل واحد عليه avatar (initials). VS divider صار text بسيط تحت الـ gauge. badge "تقدم الاختراق" تحت progress bar الأحمر.

### Personal Terms Desk (#9)
- **قبل**: 3 FieldCards متماثلة بلا hierarchy. disclaimer في dashed box.
- **بعد**: layout `[1.4fr | 1fr | 1fr]`. الراتب في **hero card** بـ gradient + briefcase watermark + font-size 44 + "net per season" subtitle. years و agentFee تبقى FieldCards. disclaimer تحوَّل إلى progress card يبين completion% (filled fields / 3) + warning icon.

### Here We Go Build-Up (#10)
- **قبل**: timeline entries كلها متشابهة، vertical line بسيط.
- **بعد**: **stageHints helper** يقرأ keyword الـ stage (شائعة/محادثات/متقدم/اتفاق/طبي/توقيع/إعلان) ويعطي color + icon + weight. الـ active stage يحدَّد كأقصى weight في القائمة. timeline line أصبحت gradient (dim → accent → success). كل entry عليه border-right ملون + icon بجانب اسم المرحلة. active entry فيه pill "الآن" + glow shadow. note فيه auto-direction.

---

## 4. كيف تم منع الصناديق الفارغة

1. **`Avatar` component**: لو ما فيه image يرسم initials على circle ملوَّن. لو فيه image وفشل التحميل، `onError` يحقن `<span data-initials>` بدلاً من تركه فارغًا.
2. **Empty states**: 4 قوالب (Agent Call / Deal Radar / Source Confidence / Here We Go) صارت تعرض icon + نص توضيحي بدلاً من نص رمادي مفرد.
3. **Image fallback في Agent Call**: left card الـ player الآن تستخدم Avatar مع image prop — يرسم initials لو الصورة غير موجودة، يبدّلها لو فشل التحميل.
4. **في Personal Terms**: hero salary يعرض `—` كقيمة افتراضية كبيرة ومتناسقة بدل صندوق فارغ.

---

## 5. كيف حافظنا على الصوت والإعدادات

- **لم يُلمس** أي من الملفات التالية: `AudioSettingsPanel.tsx`, `templateAudioGate.ts`, `audioEngine.ts`, `templateAudioScenes.ts`, `pages/Editor.tsx`, `constants.ts`.
- **`evaluateTransitionAttempt`** في `MercatoUnifiedRenderer` يبقى كما هو من Phase A Hotfix-1.
- **watchedKey** يبقى نفسه (9 fields).
- **`mercatoVariant`** keys لم تتغيَّر — كل القوالب الـ 10 تستجيب لنفس الـ variant ids.
- **field IDs** كلها كما هي — `callerName`, `chatLines`, `confidencePct`, `medicalStage`, إلخ.
- **template IDs** = نفسها (`template-mercato-x6-agent-call`, إلخ).
- **`sfxEnabledDefault: false`** على Agent Call باقي.

النتيجة: لو فتحت AudioSettingsPanel، لا تكرار للحقول، SFX OFF default للمكالمة باقي، Test IN/OUT/UPDATE تعمل.

---

## 6. نتيجة lint / build / functions

| الفحص | النتيجة |
|---|---|
| `npm run lint` (`tsc --noEmit`) | Exit Code 0 ✓ |
| `npm run build` (vite) | 1815 modules · 7.05s · Exit Code 0 ✓ |
| Bundle size | 1,755 KB (442 KB gzip) — مقابل 1,742 KB قبل X13 (+13 KB لإيقونات SVG inline) |
| Functions count | 9 (أقل من سقف 12) — لم يُضَف endpoint |

---

## 7. الملفات المعدَّلة

```
M  components/renderers/MercatoUnifiedRenderer.tsx
A  reports-ar/2026-05-28-mercato-visual-audit-pre-x13.md
A  reports-ar/2026-05-28-mercato-visual-polish-x13.md
```

---

## 8. ما لا أستطيع التحقق منه (يحتاج اختبار بشري)

- لا أستطيع فتح browser لأتحقق بصريًا من الـ 10 قوالب في Library.
- لا أستطيع التحقق من 16:9 rendering على شاشة فعلية.
- لا أستطيع تأكيد أن الـ animations (waveform, pulse, glow) تشتغل بسلاسة.

ما تأكدتُ منه ميكانيكيًا:
- TypeScript يجمِّع بدون أخطاء.
- Vite build ينجح بدون warnings جديدة.
- لا تغيير في field IDs أو template IDs.
- لا تغيير في الـ Audio path (الذي تم تنظيفه في e88470e).
- Avatar component يحقن initials fallback في `onError` للصور.
- 7 إيموجي حُذفت (📞 📜 📄 💼 ✈️ 🏥 ✍️ 📢 ⚡) واستُبدلت بـ SVG glyphs.
