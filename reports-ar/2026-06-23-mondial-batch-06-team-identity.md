# تقرير الدفعة السادسة - قوالب هوية المنتخبات والأعلام

التاريخ: 2026-06-23  
الفرع: `codex/mondial-broadcast-batch-02`

## نطاق الدفعة

هذه الدفعة وسعت مكتبة قوالب المونديال باتجاه واضح من الصور المرجعية داخل مجلد الأفكار: جدران الأعلام، أكواد المنتخبات، والهوية البصرية المشوهة بأسلوب رياضي تلفزيوني دولي. الهدف أن لا تكون القوالب مقتصرة على المجموعات والنتائج، بل تشمل عناصر الهوية التي تستخدمها القنوات قبل المباراة، أثناء الانتقال، وبين الفقرات.

## ما تم تنفيذه

- إضافة renderer جديد:
  - `components/renderers/mondial/MondialTeamIdentity.tsx`
- إضافة قالبين جديدين:
  - `template-mondial-all-flags-wall`
  - `template-mondial-team-code-wall`
- ربط القالبين بمحرك مونديال 2026:
  - `flag_wall`
  - `team_code_wall`
- ربط القالبين بقائمة التصدير في:
  - `components/renderers/mondial/MondialObsTemplates.tsx`
- جعل القالبين يستخدمان نفس مصدر المجموعات:
  - FotMob/REO API عند توفر `groups` أو `worldCupGroups`
  - `groupsJson` كاحتياط يدوي
  - بيانات DEMO عند عدم توفر مصدر حي
- دعم إعدادات فعلية داخل القالبين:
  - `Broadcast style`
  - `Theme palette`
  - `Motion + SFX preset`
  - عدد الأعمدة
  - عدد المنتخبات المعروضة
  - إظهار/إخفاء شارات المجموعات

## التفاصيل البصرية

- قالب `All Flags Identity Wall` يعرض 48 بطاقة علم مع أكواد المنتخبات وشارات المجموعات، بأسلوب نيون أسود قريب من لوحات الهوية المرجعية.
- قالب `Stylized Team Codes` يعرض أكواد المنتخبات في 4 أعمدة مع تأثير chromatic/glitch وتوزيع مشابه لصورة الأسماء المشوهة في المراجع.
- تم تعديل القياسات بعد الفحص البصري حتى لا تقطع الصفوف الأخيرة، وحتى تبقى الأكواد مقروءة داخل 16:9.

## الملفات المعدلة

- `components/renderers/Mondial2026Renderer.tsx`
- `components/renderers/MondialTemplates.ts`
- `components/renderers/mondial/MondialObsTemplates.tsx`
- `components/renderers/mondial/MondialTeamIdentity.tsx`

## إثبات التشغيل

- تم تشغيل build بنجاح:
  - `npm.cmd run build`
- تم تشغيل اختبارات FotMob World Cup بنجاح:
  - `node --test tests\fotmob-world-cup.test.mjs`
- تم فتح القالبين على مسار output محلي عبر Vite.
- تحقق DOM:
  - جدار الأعلام: `48` بطاقة `.mondial-flag-tile`
  - جدار الأكواد: `48` عنصر `.mondial-code-item`

## المخرجات البصرية

- لقطة جدار الأعلام:
  - `reports-ar/mondial-all-flags-wall-preview.png`
- لقطة جدار أكواد المنتخبات:
  - `reports-ar/mondial-team-code-wall-preview.png`

## نتيجة الدفعة

أصبحت مكتبة المونديال تحتوي الآن على قوالب هوية كاملة للمنتخبات، لا فقط قوالب مباراة أو جدول. هذا يقرّب الأداة من حزمة بث رياضية متكاملة لقناة REO SHOW: مجموعات، مباريات، نتائج، انتقالات، ستايلات، وثيمات، والآن جدران أعلام وأكواد منتخبات قابلة للتخصيص.
