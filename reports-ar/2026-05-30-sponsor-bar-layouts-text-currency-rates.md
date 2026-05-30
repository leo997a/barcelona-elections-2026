# تقرير مرحلة: شريط الداعمين - أشكال حقيقية، نصوص قابلة للتحرير، عملات وأسعار مباشرة

التاريخ: 2026-05-30  
اسم المرحلة: SPONSOR-BAR-LAYOUTS-TEXT-CURRENCY-RATES-001  
نوع المرحلة: تطوير محدود لقالب موجود + تحسين إدارة الداعمين بدون API جديد

## 1. الهدف

طلب المستخدم أن يصبح شريط الداعمين أكثر احترافية ومرونة، مع معالجة النقاط التالية:

- جعل هدف الدعم اختياريًا وليس ظاهرًا افتراضيًا.
- عدم ترك نص ظاهر داخل القالب بدون حقل يمكن تعديله.
- جعل مدة عرض الصفحة تعمل فقط عندما يوجد أكثر من صفحة داعمين.
- تحويل `sponsorDisplayMode` إلى أشكال بنيوية مختلفة، لا مجرد ألوان.
- توسيع العملات لتشمل الدول العربية وعملات عالمية مهمة مع أعلام.
- إضافة زر يجلب أحدث أسعار الصرف مقابل الدولار مباشرة.
- الحفاظ على المشروع بدون تعديل API أو صوت أو Player Intel أو Stream Deck.

## 2. البحث البصري السريع

تم استخدام بحث ويب للتغذية البصرية قبل التنفيذ. الخلاصة العملية:

- أنظمة البث الرياضي الحديثة تعتمد على مكونات واضحة مثل scorebug وlower thirds وbrowser overlays مع تحكم سريع من غرفة الإنتاج.
- الرسوم الحديثة ليست مجرد لون؛ الفرق الحقيقي يأتي من بنية العرض: شريط مضغوط، بطاقة زجاجية، منصة رقم 1، وإحصاءات حية.
- شريط التبرعات/الدعم الناجح عادة يعرض الإجمالي، آخر دفعة، أعلى داعم، ونسبة مساهمة، لكن هدف الدعم يجب أن يكون اختياريًا حتى لا يظهر كعنصر مزعج دائمًا.
- التصدير/الاستيراد مهم لأن بيانات الداعمين حساسة ومتحركة أثناء البث.

مصادر الإلهام:

- [Wasp3D - Sports Broadcast Graphics Software Explained](https://wasp3d.com/blogs/integrating-live-data-stats-into-sports-graphics-a-complete-guide/)
- [KronoGraph - What are broadcast graphics](https://kronogx.com/en/blog/what-are-broadcast-graphics.html)
- [BanyanBoard EZGrafix](https://banyanboard.com/products/ezgrafix-plug-n-play-sports-graphics/)
- [Red Cross / Tiltify overlay notes](https://www.redcross.org/donations/ways-to-donate/fundraise/peer-to-peer-fundraising-toolkit/tiltify.html)
- [Donatty tip goal widget](https://donatty.com/en/pages/tip_goal)

## 3. الملفات التي تغيرت

- `components/renderers/LeaderboardRenderer.tsx`
- `constants.ts`
- `pages/Editor.tsx`
- `services/currencyService.ts`
- `reports-ar/2026-05-30-sponsor-bar-layouts-text-currency-rates.md`

لم يتم تعديل:

- `api/`
- `services/audioEngine.ts`
- `components/renderers/MercatoUnifiedRenderer.tsx`
- Player Intel
- Stream Deck
- secrets أو `.env`
- أي template ID

## 4. هدف الدعم أصبح اختياريًا

تم تثبيت السلوك المطلوب:

- `showGoalProgress` افتراضيًا `false`.
- `fundraisingGoalUsd` افتراضيًا `0`.
- في renderer أصبح fallback الخاص بالهدف `0` بدل `10000`.
- لا يظهر شريط الهدف إلا إذا كان:
  - `showGoalProgress = true`
  - و`fundraisingGoalUsd > 0`

هذا يمنع ظهور هدف دعم مفاجئ أو افتراضي داخل البث.

## 5. النصوص القابلة للتحرير

تمت إضافة حقول نصية لكل التسميات الظاهرة في شريط الداعمين:

- `sponsorKicker`
- `sponsorPageLabel`
- `sponsorLiveLabel`
- `sponsorTotalLabel`
- `sponsorSupportersLabel`
- `sponsorDonationsLabel`
- `sponsorGoalLabel`
- `sponsorEmptyLabel`
- `sponsorTopLabel`
- `sponsorLatestDonationLabel`
- `sponsorShareLabel`
- `sponsorRankOneLabel`
- `sponsorRankTwoLabel`
- `sponsorRankThreeLabel`
- `sponsorRankDefaultLabel`

بذلك لم يعد القالب يعتمد على نصوص ثابتة مثل “LIVE” أو “آخر دفعة” بدون إمكانية تحرير.

## 6. مدة عرض الصفحة

السلوك الحالي مؤكد:

- `rotationTime` لا يعمل إلا إذا كان `totalPages > 1`.
- إذا كان عدد الداعمين لا يتجاوز الصفحة الأولى، يبقى الشريط ثابتًا ولا يعمل transition.
- إذا زاد العدد عن `itemsPerPage` يبدأ التبديل بين الصفحات مع شريط progress علوي وصوت `TRANSITION` كما كان.

لم يتم تعديل محرك الصوت.

## 7. أشكال العرض الجديدة

تم توسيع `sponsorDisplayMode` إلى خمسة أشكال:

```text
elite_wall
split_podium
ticker_strip
glass_cards
compact_stack
```

الفرق الآن ليس لونًا فقط:

- `elite_wall`: قائمة بث فاخرة مع نسب مساهمة لكل داعم.
- `split_podium`: الداعم الأول يظهر كبطل مستقل، والبقية كقائمة.
- `ticker_strip`: صفوف مضغوطة أسرع للعرض أثناء البرنامج.
- `glass_cards`: شبكة بطاقات زجاجية ثنائية الأعمدة.
- `compact_stack`: قائمة مدمجة للمساحات الضيقة.

تم ضغط `glass_cards` بعد الفحص البصري حتى لا يخرج من إطار 1080p عند عرض 6 داعمين.

## 8. العملات والأسعار

تم توسيع `CURRENCY_OPTIONS` في Editor ليشمل:

- كل العملات العربية/الإقليمية المطلوبة عمليًا: SAR, AED, KWD, QAR, BHD, OMR, YER, IQD, JOD, LBP, SYP, ILS, EGP, SDG, LYD, TND, DZD, MAD, MRU, SOS, DJF, KMF.
- عملات عالمية مهمة: USD, EUR, GBP, CHF, CAD, AUD, NZD, JPY, CNY, HKD, SGD, KRW, INR, PKR, BDT, IDR, MYR, PHP, THB, VND, TRY, BRL, MXN, ARS, CLP, COP, ZAR, NGN, KES, GHS, ETB, TZS, RUB, UAH, SEK, NOK, DKK, PLN, CZK, HUF, RON.
- عملات إضافية مهمة أو إقليمية: AZN, GEL, KZT, UZS, KGS, AMD, AFN, ALL, BAM, MDL, XAF, XOF.

القائمة تعرض الآن label مع علم/رمز البلد بدل الكود فقط.

## 9. زر أحدث الأسعار

تمت إضافة:

```text
currencyService.refreshRates()
```

وتمت إضافة زر داخل غرفة الداعمين:

```text
أحدث الأسعار
```

وظيفته:

- يجلب آخر أسعار الصرف مقابل الدولار من المصدر الخارجي.
- يخزنها في cache داخل المتصفح.
- يعيد احتساب كل الداعمين بالدولار.
- يعطي رسالة نجاح أو فشل واضحة.

لم تتم إضافة endpoint جديد، لذلك لم يزد عدد Vercel functions.

## 10. الفحص البصري

تم تشغيل Vite محليًا على منفذ منفصل:

```text
http://127.0.0.1:5186
```

تم الفحص عبر Chrome headless وCDP بروابط output مدمجة البيانات، وليس عبر حالة الإنتاج أو OBS.

تمت مشاهدة الأشكال:

- `elite_wall`
- `split_podium`
- `glass_cards`
- `ticker_strip`

ملاحظات الفحص:

- النص العربي ظهر باتجاه صحيح.
- هدف الدعم لم يظهر عندما كان `showGoalProgress=false`.
- `glass_cards` احتاج ضغطًا رأسيًا وتم إصلاحه.
- لم يتم اختبار الصوت يدويًا، ولم يتم تغيير ملفات الصوت أو `audioEngine`.

## 11. نتائج التحقق

```text
npm run lint
```

النتيجة: ناجح.

```text
npm run build
```

النتيجة: ناجح.

ملاحظة البناء:

- بقي تحذير حجم bundle الكبير موجودًا، وهو تحذير قديم/معماري وليس نتيجة إضافة API أو ملفات صوت.

عدد Vercel functions الفعلية:

```text
10
```

تم العد باستثناء `api/_lib` لأنها ملفات مساعدة وليست endpoints.

## 12. تقييم الخطر

الخطر متوسط ومنضبط:

- تم تعديل Renderer قائم وليس إضافة قالب جديد.
- تم تعديل constants لحقل واحد موجود أساسًا.
- تم تعديل Editor داخل تبويب Sponsors فقط.
- تم تعديل خدمة العملات فقط.
- لم يتم تغيير template IDs.
- لم يتم تعديل API أو Stream Deck أو Player Intel.

## 13. توصية المرحلة التالية

الأولوية التالية المقترحة:

1. تطبيق قاعدة “كل نص ظاهر قابل للتحرير” على قوالب ميركاتو الأخرى تدريجيًا، قالبًا قالبًا.
2. مراجعة تصميم `glass_cards` و`split_podium` داخل Editor live preview مع بيانات المستخدم الحقيقية.
3. إضافة manual QA checklist لشريط الداعمين داخل التقرير الرئيسي/الفهرس.
4. لاحقًا فقط: تحسين bundle splitting لأن التحذير ما زال موجودًا.

لا أنصح الآن بتعديل `audioEngine` أو API لأن الطلب الحالي انتهى بدون الحاجة لذلك.
