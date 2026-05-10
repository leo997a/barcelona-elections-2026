with open('constants.ts', 'r', encoding='utf-8') as f:
    c = f.read()

OLD = '  ...BARCELONA_ELECTION_TEMPLATES\n];\n\nexport const INITIAL_TEMPLATES'
NEW = """  ...BARCELONA_ELECTION_TEMPLATES,
  // ─── Reo Show Broadcast Identity Templates ────────────────────────────────
  {
    id: 'template-h2h-stats',
    templateId: 'template-h2h-stats',
    name: 'H2H مقارنة لاعبين',
    type: OverlayType.H2H_STATS,
    isVisible: false,
    templateIcon: 'H2H',
    templateAccent: '#00E5FF',
    templateGroup: 'REO_BROADCAST',
    templateDescription: 'مقارنة إحصائيات بين لاعبين — Sky Sports / NSL Style',
    theme: { primaryColor: '#00E5FF', secondaryColor: '#0B132B', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'matchTitle',   label: 'عنوان المقارنة', type: 'text',  value: 'مقارنة النجوم' },
      { id: 'player1Name', label: 'اسم اللاعب الأول', type: 'text',  value: 'لامين يامال' },
      { id: 'player1Image',label: 'صورة اللاعب الأول', type: 'image', value: '' },
      { id: 'player1Color',label: 'لون اللاعب الأول', type: 'color', value: '#004D98' },
      { id: 'player2Name', label: 'اسم اللاعب الثاني', type: 'text',  value: 'فينيسيوس' },
      { id: 'player2Image',label: 'صورة اللاعب الثاني', type: 'image', value: '' },
      { id: 'player2Color',label: 'لون اللاعب الثاني', type: 'color', value: '#FFFFFF' },
      { id: 'statsData', label: 'الإحصائيات (JSON)', type: 'textarea', value: '[{"label":"الأهداف","v1":15,"v2":18},{"label":"التمريرات","v1":12,"v2":9},{"label":"الدريبلات","v1":88,"v2":91},{"label":"التقييم","v1":89,"v2":92}]' },
      { id: 'bgColor',     label: 'لون الخلفية', type: 'color', value: '#0B132B' },
      { id: 'scale',       label: 'الحجم',  type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY',   label: 'موضع Y', type: 'range', value: 0,   min: -500, max: 500, step: 5 },
      { id: 'positionX',   label: 'موضع X', type: 'range', value: 0,   min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-transfer-news',
    templateId: 'template-transfer-news',
    name: 'خبر انتقال حصري',
    type: OverlayType.TRANSFER_NEWS,
    isVisible: false,
    templateIcon: 'DEAL',
    templateAccent: '#E9FF00',
    templateGroup: 'REO_BROADCAST',
    templateDescription: 'خبر انتقال جريء DAZN-style مع مؤشر نسبة التأكد',
    theme: { primaryColor: '#E9FF00', secondaryColor: '#050505', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'playerName',  label: 'اسم اللاعب',    type: 'text',  value: 'اسم اللاعب' },
      { id: 'playerImage', label: 'صورة اللاعب',   type: 'image', value: '' },
      { id: 'fromClub',    label: 'النادي المغادر', type: 'text',  value: 'برشلونة' },
      { id: 'toClub',      label: 'النادي الجديد',  type: 'text',  value: 'البديل' },
      { id: 'dealValue',   label: 'قيمة الصفقة',   type: 'text',  value: '80M €' },
      { id: 'confidence',  label: 'نسبة التأكد %', type: 'range', value: 85, min: 0, max: 100, step: 1 },
      { id: 'headline',    label: 'العنوان الرئيسي', type: 'text', value: 'DONE DEAL' },
      { id: 'source',      label: 'المصدر',         type: 'text',  value: 'Reo Show Exclusive' },
      { id: 'accentColor', label: 'لون التمييز',    type: 'color', value: '#E9FF00' },
      { id: 'isUrgent',    label: 'شريط عاجل',      type: 'boolean', value: true },
      { id: 'scale',       label: 'الحجم',  type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY',   label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX',   label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
  {
    id: 'template-barca-premium',
    templateId: 'template-barca-premium',
    name: 'FCB حزمة برشلونة',
    type: OverlayType.BARCA_PREMIUM,
    isVisible: false,
    templateIcon: 'FCB',
    templateAccent: '#EDBB00',
    templateGroup: 'REO_BROADCAST',
    templateDescription: 'هوية برشلونة المحترفة — La Liga / EA Sports Style',
    theme: { primaryColor: '#EDBB00', secondaryColor: '#06001a', backgroundColor: 'transparent', fontFamily: 'Tajawal' },
    slots: {},
    fields: [
      { id: 'headline',    label: 'العنوان الرئيسي',  type: 'text',     value: 'FC Barcelona' },
      { id: 'subheadline', label: 'العنوان الفرعي',   type: 'text',     value: 'النتيجة النهائية' },
      { id: 'bodyText',    label: 'النص',             type: 'textarea', value: 'معلومات حول هذا الخبر.' },
      { id: 'playerImage', label: 'صورة اللاعب',      type: 'image',    value: '' },
      { id: 'badgeMode',   label: 'نمط العرض', type: 'select', value: 'news', options: [{value:'news',label:'خبر'},{value:'stats',label:'إحصائيات'}] },
      { id: 'stat1Label',  label: 'إحصائية 1 اسم',  type: 'text',  value: 'الأهداف' },
      { id: 'stat1Value',  label: 'إحصائية 1 رقم',  type: 'text',  value: '25' },
      { id: 'stat2Label',  label: 'إحصائية 2 اسم',  type: 'text',  value: 'المباريات' },
      { id: 'stat2Value',  label: 'إحصائية 2 رقم',  type: 'text',  value: '38' },
      { id: 'stat3Label',  label: 'إحصائية 3 اسم',  type: 'text',  value: 'التمريرات' },
      { id: 'stat3Value',  label: 'إحصائية 3 رقم',  type: 'text',  value: '143' },
      { id: 'showBadge',   label: 'إظهار شارة FCB',  type: 'boolean', value: true },
      { id: 'scale',       label: 'الحجم',  type: 'range', value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
      { id: 'positionY',   label: 'موضع Y', type: 'range', value: 0, min: -500, max: 500, step: 5 },
      { id: 'positionX',   label: 'موضع X', type: 'range', value: 0, min: -800, max: 800, step: 5 },
    ],
  },
];

export const INITIAL_TEMPLATES"""

if OLD in c:
    c = c.replace(OLD, NEW, 1)
    print('OK - templates added')
else:
    print('FAIL - target not found')

with open('constants.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('Saved.')
