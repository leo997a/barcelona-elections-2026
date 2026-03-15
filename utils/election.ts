import { OverlayConfig, OverlayField, OverlayType, SelectOption } from '../types';

export const ELECTION_STYLE_ALIASES: Record<string, string> = {
  RESULTS_HUB: 'RESULTS_BAR',
  SPLIT_BAR_LEFT: 'VERSUS_PANEL',
  COUNTDOWN_TOP: 'COUNTDOWN_BANNER',
  LEAKS_FULL: 'BREAKING_PANEL',
  STATEMENT_FULL: 'QUOTE_PANEL',
  LIVE_TRANSITION: 'VERSUS_PANEL',
  STUDIO_BACKGROUND: 'SIDEBAR_TOWER',
  VOTER_TURNOUT: 'TURNOUT_STRIP',
};

export const resolveElectionStyle = (style: string) => {
  if (!style) return 'RESULTS_BAR';
  return ELECTION_STYLE_ALIASES[style] || style;
};

export const ELECTION_SOUND_OPTIONS = [
  'RESULTS_STING',
  'QUOTE_SWEEP',
  'VERSUS_IMPACT',
  'SIDEBAR_CHIME',
  'DATA_PULSE',
  'COUNTDOWN_TICK',
  'BREAKING_WHOOSH',
  'SOFT_FADE',
];

export const ELECTION_SOUND_IN_DEFAULTS: Record<string, string> = {
  RESULTS_BAR: 'RESULTS_STING',
  QUOTE_PANEL: 'QUOTE_SWEEP',
  VERSUS_PANEL: 'VERSUS_IMPACT',
  SIDEBAR_TOWER: 'SIDEBAR_CHIME',
  TURNOUT_STRIP: 'DATA_PULSE',
  COUNTDOWN_BANNER: 'COUNTDOWN_TICK',
  BREAKING_PANEL: 'BREAKING_WHOOSH',
};

export const ELECTION_SOUND_OUT_DEFAULTS: Record<string, string> = {
  RESULTS_BAR: 'SOFT_FADE',
  QUOTE_PANEL: 'SOFT_FADE',
  VERSUS_PANEL: 'SOFT_FADE',
  SIDEBAR_TOWER: 'SOFT_FADE',
  TURNOUT_STRIP: 'SOFT_FADE',
  COUNTDOWN_BANNER: 'SOFT_FADE',
  BREAKING_PANEL: 'SOFT_FADE',
};

export type ElectionCandidateProfile = 'LAPORTA' | 'FONT' | 'CUSTOM';
export type ElectionStatementSource = 'CANDIDATE_1' | 'CANDIDATE_2' | 'LAPORTA' | 'FONT' | 'CUSTOM';

type ElectionEntityProfile = {
  name: string;
  image: string;
  tag: string;
  color: string;
};

type ResolvedElectionEntity = ElectionEntityProfile & {
  source: ElectionStatementSource;
};

export const ELECTION_CANDIDATE_PROFILE_OPTIONS: SelectOption[] = [
  { value: 'LAPORTA', label: 'خوان لابورتا' },
  { value: 'FONT', label: 'فيكتور فونت' },
  { value: 'CUSTOM', label: 'شخص مخصص' },
];

export const ELECTION_STATEMENT_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'CANDIDATE_1', label: 'المرشح 1' },
  { value: 'CANDIDATE_2', label: 'المرشح 2' },
  { value: 'LAPORTA', label: 'خوان لابورتا' },
  { value: 'FONT', label: 'فيكتور فونت' },
  { value: 'CUSTOM', label: 'شخص مخصص' },
];

export const ELECTION_ENTITY_PRESETS: Record<Exclude<ElectionCandidateProfile, 'CUSTOM'>, ElectionEntityProfile> = {
  LAPORTA: {
    name: 'خوان لابورتا',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Joan_Laporta_2015_%28cropped%29.jpg/220px-Joan_Laporta_2015_%28cropped%29.jpg',
    tag: 'الإدارة الحالية',
    color: '#a50044',
  },
  FONT: {
    name: 'فيكتور فونت',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/V%C3%ADctor_Font_Mante.jpg/220px-V%C3%ADctor_Font_Mante.jpg',
    tag: 'مشروع التجديد',
    color: '#004d98',
  },
};

const STATEMENT_CUSTOM_DEFAULTS: ElectionEntityProfile = {
  name: '',
  image: '',
  tag: 'ضيف خاص',
  color: '#edb111',
};

const CANDIDATE_IDENTITY_KEYS = ['Name', 'Image', 'Tag', 'Color'] as const;
const STATEMENT_CUSTOM_FIELD_IDS = ['statementSubjectName', 'statementSubjectImage', 'statementSubjectTag', 'statementSubjectColor'] as const;

const getFieldIndex = (fields: OverlayField[], fieldId: string) => fields.findIndex(field => field.id === fieldId);

const getFieldValue = (fields: OverlayField[], fieldId: string) => fields.find(field => field.id === fieldId)?.value;

const setFieldValue = (fields: OverlayField[], fieldId: string, value: OverlayField['value']) => {
  const index = getFieldIndex(fields, fieldId);
  if (index === -1) return;
  fields[index] = { ...fields[index], value };
};

const appendMissingField = (fields: OverlayField[], field: OverlayField) => {
  if (getFieldIndex(fields, field.id) === -1) {
    fields.push(field);
  }
};

const includesArabicOrLatinName = (value: string, token: string) => value.toLowerCase().includes(token.toLowerCase());

const inferCandidateProfile = (name: string, image: string): ElectionCandidateProfile => {
  if (
    includesArabicOrLatinName(name, 'لابورتا') ||
    includesArabicOrLatinName(name, 'laporta') ||
    includesArabicOrLatinName(image, 'laporta')
  ) {
    return 'LAPORTA';
  }

  if (
    includesArabicOrLatinName(name, 'فونت') ||
    includesArabicOrLatinName(name, 'victor') ||
    includesArabicOrLatinName(name, 'víctor') ||
    includesArabicOrLatinName(name, 'font') ||
    includesArabicOrLatinName(image, 'font')
  ) {
    return 'FONT';
  }

  return 'CUSTOM';
};

const inferStatementSource = (fields: OverlayField[]): ElectionStatementSource => {
  const author = String(getFieldValue(fields, 'statementAuthor') || '');
  const candidate1Name = String(getFieldValue(fields, 'candidate1Name') || '');
  const candidate2Name = String(getFieldValue(fields, 'candidate2Name') || '');

  if (author && candidate1Name && author.toLowerCase() === candidate1Name.toLowerCase()) return 'CANDIDATE_1';
  if (author && candidate2Name && author.toLowerCase() === candidate2Name.toLowerCase()) return 'CANDIDATE_2';

  const fallbackProfile = inferCandidateProfile(author, String(getFieldValue(fields, 'statementSubjectImage') || ''));
  if (fallbackProfile === 'LAPORTA') return 'LAPORTA';
  if (fallbackProfile === 'FONT') return 'FONT';

  return 'CUSTOM';
};

export const createElectionCandidateProfileField = (
  candidateIndex: 1 | 2,
  value: ElectionCandidateProfile
): OverlayField => ({
  id: `candidate${candidateIndex}Profile`,
  label: `الملف الذكي للمرشح ${candidateIndex}`,
  type: 'select',
  value,
  options: ELECTION_CANDIDATE_PROFILE_OPTIONS,
});

export const createElectionStatementFields = (value: ElectionStatementSource = 'CANDIDATE_1'): OverlayField[] => [
  {
    id: 'statementSource',
    label: 'مصدر شخصية التصريح',
    type: 'select',
    value,
    options: ELECTION_STATEMENT_SOURCE_OPTIONS,
  },
  {
    id: 'statementSubjectName',
    label: 'اسم الشخص المخصص',
    type: 'text',
    value: STATEMENT_CUSTOM_DEFAULTS.name,
  },
  {
    id: 'statementSubjectTag',
    label: 'وصف الشخص المخصص',
    type: 'text',
    value: STATEMENT_CUSTOM_DEFAULTS.tag,
  },
  {
    id: 'statementSubjectImage',
    label: 'صورة الشخص المخصص',
    type: 'image',
    value: STATEMENT_CUSTOM_DEFAULTS.image,
  },
  {
    id: 'statementSubjectColor',
    label: 'لون الشخص المخصص',
    type: 'color',
    value: STATEMENT_CUSTOM_DEFAULTS.color,
  },
];

const ensureElectionSmartFields = (fields: OverlayField[]) => {
  const inferredCandidate1 = inferCandidateProfile(
    String(getFieldValue(fields, 'candidate1Name') || ''),
    String(getFieldValue(fields, 'candidate1Image') || '')
  );
  const inferredCandidate2 = inferCandidateProfile(
    String(getFieldValue(fields, 'candidate2Name') || ''),
    String(getFieldValue(fields, 'candidate2Image') || '')
  );
  const inferredStatementSource = inferStatementSource(fields);

  appendMissingField(fields, createElectionCandidateProfileField(1, inferredCandidate1));
  appendMissingField(fields, createElectionCandidateProfileField(2, inferredCandidate2));
  createElectionStatementFields(inferredStatementSource).forEach(field => appendMissingField(fields, field));
};

const syncCandidatePreset = (
  fields: OverlayField[],
  candidateIndex: 1 | 2,
  changedFieldId?: string
) => {
  const profileFieldId = `candidate${candidateIndex}Profile`;
  const profile = String(getFieldValue(fields, profileFieldId) || 'CUSTOM') as ElectionCandidateProfile;
  const preset = profile === 'CUSTOM' ? null : ELECTION_ENTITY_PRESETS[profile];

  if (!preset) {
    return;
  }

  const identityFieldIds = CANDIDATE_IDENTITY_KEYS.map(key => `candidate${candidateIndex}${key}`);
  const manualIdentityChange = changedFieldId && identityFieldIds.includes(changedFieldId);

  if (manualIdentityChange) {
    const fieldKey = changedFieldId.replace(`candidate${candidateIndex}`, '') as (typeof CANDIDATE_IDENTITY_KEYS)[number];
    const fieldValue = String(getFieldValue(fields, changedFieldId) || '');
    const expectedValue = String(
      fieldKey === 'Name'
        ? preset.name
        : fieldKey === 'Image'
          ? preset.image
          : fieldKey === 'Tag'
            ? preset.tag
            : preset.color
    );

    if (fieldValue !== expectedValue) {
      setFieldValue(fields, profileFieldId, 'CUSTOM');
      return;
    }
  }

  setFieldValue(fields, `candidate${candidateIndex}Name`, preset.name);
  setFieldValue(fields, `candidate${candidateIndex}Image`, preset.image);
  setFieldValue(fields, `candidate${candidateIndex}Tag`, preset.tag);
  setFieldValue(fields, `candidate${candidateIndex}Color`, preset.color);
};

export const normalizeElectionOverlay = (overlay: OverlayConfig, changedFieldId?: string): OverlayConfig => {
  if (overlay.type !== OverlayType.ELECTION) return overlay;

  const fields = overlay.fields.map(field => ({ ...field }));
  ensureElectionSmartFields(fields);

  syncCandidatePreset(fields, 1, changedFieldId);
  syncCandidatePreset(fields, 2, changedFieldId);

  const statementSource = String(getFieldValue(fields, 'statementSource') || inferStatementSource(fields)) as ElectionStatementSource;
  setFieldValue(fields, 'statementSource', statementSource);

  if (statementSource === 'CUSTOM') {
    const author = String(getFieldValue(fields, 'statementAuthor') || '');
    if (!String(getFieldValue(fields, 'statementSubjectName') || '').trim() && author.trim()) {
      setFieldValue(fields, 'statementSubjectName', author);
    }
  }

  if (changedFieldId && STATEMENT_CUSTOM_FIELD_IDS.includes(changedFieldId as (typeof STATEMENT_CUSTOM_FIELD_IDS)[number])) {
    setFieldValue(fields, 'statementSource', 'CUSTOM');
  }

  return {
    ...overlay,
    fields,
  };
};

const resolveCandidateEntity = (fields: OverlayField[], candidateIndex: 1 | 2): ResolvedElectionEntity => ({
  source: candidateIndex === 1 ? 'CANDIDATE_1' : 'CANDIDATE_2',
  name: String(getFieldValue(fields, `candidate${candidateIndex}Name`) || `Candidate ${candidateIndex}`),
  image: String(getFieldValue(fields, `candidate${candidateIndex}Image`) || ''),
  tag: String(getFieldValue(fields, `candidate${candidateIndex}Tag`) || `Candidate ${candidateIndex}`),
  color: String(getFieldValue(fields, `candidate${candidateIndex}Color`) || (candidateIndex === 1 ? '#a50044' : '#004d98')),
});

export const resolveElectionStatementEntity = (fields: OverlayField[]): ResolvedElectionEntity => {
  const source = String(getFieldValue(fields, 'statementSource') || inferStatementSource(fields)) as ElectionStatementSource;

  if (source === 'CANDIDATE_1') return resolveCandidateEntity(fields, 1);
  if (source === 'CANDIDATE_2') return resolveCandidateEntity(fields, 2);

  if (source === 'LAPORTA' || source === 'FONT') {
    return {
      source,
      ...ELECTION_ENTITY_PRESETS[source],
    };
  }

  return {
    source: 'CUSTOM',
    name: String(getFieldValue(fields, 'statementSubjectName') || getFieldValue(fields, 'statementAuthor') || getFieldValue(fields, 'candidate1Name') || 'ضيف خاص'),
    image: String(getFieldValue(fields, 'statementSubjectImage') || getFieldValue(fields, 'candidate1Image') || ''),
    tag: String(getFieldValue(fields, 'statementSubjectTag') || STATEMENT_CUSTOM_DEFAULTS.tag),
    color: String(getFieldValue(fields, 'statementSubjectColor') || STATEMENT_CUSTOM_DEFAULTS.color),
  };
};
