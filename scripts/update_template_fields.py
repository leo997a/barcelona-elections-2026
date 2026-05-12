with open('constants.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# ─── 1. Update H2H: remove matchTitle, update p2Color, add new fields ────────
c = c.replace(
    "{ id: 'matchTitle',   label: 'عنوان المقارنة', type: 'text',  value: 'مقارنة النجوم' },\n",
    "",
    1
)
c = c.replace(
    "{ id: 'player2Color',label: 'لون اللاعب الثاني', type: 'color', value: '#FFFFFF' },",
    """{ id: 'player2Color',label: 'لون اللاعب الثاني', type: 'color', value: '#C00000' },
      { id: 'player1Club',  label: 'نادي اللاعب الأول', type: 'text', value: 'FC BARCELONA' },
      { id: 'player2Club',  label: 'نادي اللاعب الثاني', type: 'text', value: 'REAL MADRID' },
      { id: 'matchLabel',   label: 'تسمية المقارنة', type: 'text', value: 'HEAD TO HEAD' },""",
    1
)

# ─── 2. Update Transfer: add fromColor, toColor ───────────────────────────────
c = c.replace(
    "{ id: 'accentColor', label: 'لون التمييز',    type: 'color', value: '#E9FF00' },",
    """{ id: 'accentColor', label: 'لون التمييز',    type: 'color', value: '#E9FF00' },
      { id: 'fromColor',   label: 'لون نادي المصدر', type: 'color', value: '#A50044' },
      { id: 'toColor',     label: 'لون النادي الجديد', type: 'color', value: '#000000' },""",
    1
)

# ─── 3. Update Barca fields: replace headline/subheadline/bodyText/playerImage/badgeMode block ──
OLD_BARCA = """      { id: 'headline',    label: 'العنوان الرئيسي',  type: 'text',     value: 'FC Barcelona' },
      { id: 'subheadline', label: 'العنوان الفرعي',   type: 'text',     value: 'النتيجة النهائية' },
      { id: 'bodyText',    label: 'النص',             type: 'textarea', value: 'معلومات حول هذا الخبر.' },
      { id: 'playerImage', label: 'صورة اللاعب',      type: 'image',    value: '' },
      { id: 'badgeMode',   label: 'نمط العرض', type: 'select', value: 'news', options: [{value:'news',label:'خبر'},{value:'stats',label:'إحصائيات'}] },"""
NEW_BARCA = """      { id: 'firstName',  label: 'الاسم الأول', type: 'text',  value: 'LAMINE' },
      { id: 'lastName',   label: 'اسم العائلة', type: 'text',  value: 'YAMAL' },
      { id: 'position',   label: 'المركز', type: 'text', value: 'RW' },
      { id: 'jerseyNum',  label: 'رقم القميص', type: 'text', value: '27' },
      { id: 'playerImage',label: 'صورة اللاعب', type: 'image', value: '' },
      { id: 'teamColor',  label: 'لون الفريق', type: 'color', value: '#004D98' },
      { id: 'badgeMode',  label: 'نمط العرض', type: 'select', value: 'player', options: [
          {value:'player',label:'بطاقة لاعب'},
          {value:'news',  label:'خبر'},
          {value:'stats', label:'إحصائيات'}
        ] },
      { id: 'headline',   label: 'العنوان (للخبر/الإحصائيات)', type: 'text', value: 'FC BARCELONA' },
      { id: 'subline',    label: 'السطر الفرعي', type: 'text', value: 'LA LIGA 2024/25' },
      { id: 'bodyText',   label: 'النص', type: 'textarea', value: '' },"""

c = c.replace(OLD_BARCA, NEW_BARCA, 1)

# remove duplicate showBadge if it's already there and conflicts  
# keep showBadge as is

with open('constants.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print("H2H match_label found:", 'matchLabel' in c)
print("Transfer fromColor found:", 'fromColor' in c)
print("Barca firstName found:", 'firstName' in c)
print("Done.")
