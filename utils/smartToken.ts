import { OverlayConfig, OverlayField } from '../types';
import { encodeBase64UrlUtf8 } from './base64';

type SmartTokenContext = {
  provider?: string;
  studioId?: string;
  controlAccessKey?: string;
};

type SmartTokenField = {
  id: string;
  lb: string;
  ty: OverlayField['type'];
  min?: number;
  max?: number;
  step?: number;
};

const FIELD_TOKEN_LIMIT = 28;
const LABEL_LIMIT = 42;

export const SMART_TOKEN_CAPABILITY_LABELS: Record<string, string> = {
  visibility: 'ظهور',
  audio: 'صوت',
  transform: 'موضع',
  scoreboard: 'نتيجة',
  paging: 'صفحات',
  'probability-shift': 'نسب',
  sponsors: 'داعمين',
};

const STREAM_DECK_SKIP_FIELD_IDS = new Set([
  'audioSceneId',
  'audioUpdateCue',
  'voiceLibraryId',
  'voiceDirectUrl',
  'pagesData',
  'sponsorsData',
  'playerStatsSourceJson',
  'matchStatsSourceJson',
]);

const STREAM_DECK_ALWAYS_INCLUDE = new Set([
  'soundEnabled',
  'sfxEnabled',
  'voiceEnabled',
  'soundVolume',
  'positionX',
  'positionY',
  'scale',
  'homeScore',
  'awayScore',
  'currentPage',
  'probabilityShiftMode',
  'mediaMuted',
  'showGoalProgress',
]);

const compactLabel = (value: string) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > LABEL_LIMIT ? `${clean.slice(0, LABEL_LIMIT - 3)}...` : clean;
};

const isStreamDeckField = (field: OverlayField) => {
  if (STREAM_DECK_SKIP_FIELD_IDS.has(field.id)) return false;
  if (STREAM_DECK_ALWAYS_INCLUDE.has(field.id)) return true;
  if (field.type === 'hidden' || field.type === 'textarea' || field.type === 'image-list') return false;
  return field.type === 'boolean' || field.type === 'number' || field.type === 'range' || field.type === 'select';
};

const describeField = (field: OverlayField): SmartTokenField => ({
  id: field.id,
  lb: compactLabel(field.label || field.id),
  ty: field.type,
  min: field.min,
  max: field.max,
  step: field.step,
});

export const getSmartTokenCapabilities = (overlay: OverlayConfig) => {
  const fieldIds = new Set(overlay.fields.map(field => field.id));
  const capabilities = ['visibility'];

  if (['soundEnabled', 'sfxEnabled', 'voiceEnabled', 'soundVolume'].some(id => fieldIds.has(id))) {
    capabilities.push('audio');
  }
  if (['positionX', 'positionY', 'scale'].some(id => fieldIds.has(id))) {
    capabilities.push('transform');
  }
  if (fieldIds.has('homeScore') && fieldIds.has('awayScore')) {
    capabilities.push('scoreboard');
  }
  if (fieldIds.has('currentPage')) {
    capabilities.push('paging');
  }
  if (fieldIds.has('probabilityShiftMode')) {
    capabilities.push('probability-shift');
  }
  if (fieldIds.has('sponsorsData')) {
    capabilities.push('sponsors');
  }

  return capabilities;
};

export const buildSmartTokenPayload = (
  overlay: OverlayConfig,
  context: SmartTokenContext | null,
  origin: string,
) => {
  const fields = overlay.fields
    .filter(isStreamDeckField)
    .map(describeField)
    .slice(0, FIELD_TOKEN_LIMIT);

  return {
    v: 2,
    s: context?.studioId || '',
    id: overlay.id,
    tp: overlay.type,
    nm: overlay.name,
    sv: context?.provider || 'live-api',
    ct: context?.controlAccessKey || 'studio-live-control',
    u: origin,
    tid: overlay.templateId || overlay.id,
    ic: overlay.templateIcon || '',
    cap: getSmartTokenCapabilities(overlay),
    fs: fields,
  };
};

export const buildSmartToken = (
  overlay: OverlayConfig,
  context: SmartTokenContext | null,
  origin: string,
) => `rge_${encodeBase64UrlUtf8(JSON.stringify(buildSmartTokenPayload(overlay, context, origin)))}`;

export const getSmartTokenCapabilityLabel = (capability: string) =>
  SMART_TOKEN_CAPABILITY_LABELS[capability] || capability;

export const describeSmartToken = (overlay: OverlayConfig) => {
  const payload = buildSmartTokenPayload(overlay, null, '');
  return {
    capabilities: payload.cap,
    capabilityLabels: payload.cap.map(getSmartTokenCapabilityLabel),
    fields: payload.fs,
    fieldCount: payload.fs.length,
    fieldLabels: payload.fs.map(field => field.lb || field.id),
  };
};
