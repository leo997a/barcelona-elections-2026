/**
 * mercatoVoicePacks.ts — Voice phrase library + Audio Profiles for mercato templates.
 *
 * This module DOES NOT play audio. It is a pure data module that the
 * MercatoAudioEngine consumes. No fetch, no AudioContext, no side effects.
 *
 * What it does:
 *   1. Lists short signature phrases (Arabic, English, mixed) that mercato
 *      templates can speak to introduce a story (Here we go, الأمور تحدث, ...).
 *   2. Maps each phrase to a recommended SFX cue (from soundLibrary.ts) so
 *      that even if the spoken voice fails, the template still has a
 *      tasteful sound effect to play instead.
 *   3. Defines Audio Profiles — a single dropdown choice that pre-selects
 *      the phrase + 4 cue slots (intro / reveal / confirm / outro) so the
 *      editor never has to wire 5 things by hand.
 *
 * This file references soundLibrary.ts only by KEY (string). It does not
 * import the engine, so it is safe to import from anywhere.
 */

export type VoiceLanguage = 'ar' | 'en' | 'mixed';
export type AudioIntensity = 'soft' | 'medium' | 'high' | 'cinematic';

export type VoicePhrase = {
  id: string;
  label: string;
  language: VoiceLanguage;
  text: string;
  /**
   * Optional pre-recorded MP3/WAV URL. When set, MercatoAudioEngine plays
   * this file directly (highest priority). Recommended for production.
   */
  defaultAudioUrl?: string;
  /**
   * Default audio profile to use when this phrase is selected.
   */
  recommendedProfile: string;
  /**
   * Single recommended cue when the editor only wants a quick SFX preview
   * of the phrase intent (no spoken voice).
   */
  recommendedCue: string;
  intensity: AudioIntensity;
};

// ─── Voice phrases ──────────────────────────────────────────────────────────
//
// Short, broadcast-style lines. Editors can pick one of these directly or
// override the text via customText in the template. Pre-recorded mp3 urls
// are intentionally left blank — the recommended workflow is for the user
// to upload their own studio-quality file via customVoiceUrl in the
// template, since browser TTS and online TTS engines never sound as
// professional as a real voice. The system still works with TTS as a
// fallback so nothing is broken if no file is provided.
export const VOICE_PHRASES: VoicePhrase[] = [
  {
    id: 'hereWeGo',
    label: '🎙️ Here we go — هير وي قو (Fabrizio)',
    language: 'en',
    text: 'Here we go',
    recommendedProfile: 'fabrizioBreaking',
    recommendedCue: 'HERE_WE_GO_BOOM',
    intensity: 'high',
  },
  {
    id: 'thingsAreHappening',
    label: '⚡ الأمور تحدث',
    language: 'ar',
    text: 'الأمور تحدث',
    recommendedProfile: 'arabicBreaking',
    recommendedCue: 'NEWS_OPENER_DEEP',
    intensity: 'high',
  },
  {
    id: 'official',
    label: '🏛️ رسمياً',
    language: 'ar',
    text: 'رسميًا',
    recommendedProfile: 'officialClub',
    recommendedCue: 'OFFICIAL_STAMP_DEEP',
    intensity: 'medium',
  },
  {
    id: 'dealHeating',
    label: '🔥 الصفقة تشتعل',
    language: 'ar',
    text: 'الصفقة تشتعل',
    recommendedProfile: 'dealHeating',
    recommendedCue: 'BREAKING_HIT_LONG',
    intensity: 'high',
  },
  {
    id: 'deadlineTonight',
    label: '⏳ الليلة قد تُحسم الصفقة',
    language: 'ar',
    text: 'الليلة قد تُحسم الصفقة',
    recommendedProfile: 'deadlineDrama',
    recommendedCue: 'DEADLINE_DAY_TENSION',
    intensity: 'cinematic',
  },
  {
    id: 'sourceSpecial',
    label: '🤐 مصدر خاص',
    language: 'ar',
    text: 'مصدر خاص',
    recommendedProfile: 'sourceExclusive',
    recommendedCue: 'SOURCE_UPDATE_BLIP',
    intensity: 'soft',
  },
  {
    id: 'advancedTalks',
    label: '🤝 المفاوضات تتقدم',
    language: 'ar',
    text: 'المفاوضات تتقدم',
    recommendedProfile: 'arabicBreaking',
    recommendedCue: 'NEGOTIATION_TICK',
    intensity: 'medium',
  },
  {
    id: 'criticalStage',
    label: '🚨 العملية دخلت المرحلة الحاسمة',
    language: 'ar',
    text: 'العملية دخلت المرحلة الحاسمة',
    recommendedProfile: 'deadlineDrama',
    recommendedCue: 'BREAKING_RISER_SLOW',
    intensity: 'cinematic',
  },
  {
    id: 'breakingNews',
    label: '🚨 Breaking news',
    language: 'en',
    text: 'Breaking news',
    recommendedProfile: 'fabrizioBreaking',
    recommendedCue: 'BREAKING_HIT_SHORT',
    intensity: 'high',
  },
  {
    id: 'analysisProbe',
    label: '🔬 فحص فني للاعب',
    language: 'ar',
    text: 'فحص فني للاعب',
    recommendedProfile: 'analysisLab',
    recommendedCue: 'X_RAY_SCAN',
    intensity: 'medium',
  },
];

// ─── Audio Profiles ─────────────────────────────────────────────────────────
//
// A profile is a complete audio identity for a mercato story. Picking a
// profile fills in 5 things at once:
//   • signature phrase (text + language)
//   • intro cue   (when the template enters)
//   • reveal cue  (after the spoken phrase ends)
//   • confirm cue (when the headline is locked / shown definitively)
//   • outro cue   (when the template exits)
//
// All cue keys reference soundLibrary.ts. Editors can override any field
// in the template, but the profile is the fast path.

export type AudioProfile = {
  id: string;
  label: string;
  description: string;
  phraseId: string; // VoicePhrase.id
  introCue: string;
  revealCue: string;
  updateCue?: string;
  confirmCue: string;
  outroCue: string;
  intensity: AudioIntensity;
};

export const AUDIO_PROFILES: AudioProfile[] = [
  {
    id: 'fabrizioBreaking',
    label: '🎙️ Fabrizio Breaking — هير وي قو',
    description: 'إعلان صفقة على غرار فابريزيو رومانو — الصوت الإنجليزي الكلاسيكي.',
    phraseId: 'hereWeGo',
    introCue: 'HERE_WE_GO_BOOM',
    revealCue: 'TARGET_REVEAL_GLASS',
    confirmCue: 'OFFICIAL_STAMP_DEEP',
    outroCue: 'FINAL_CONFIRM',
    intensity: 'high',
  },
  {
    id: 'arabicBreaking',
    label: '⚡ Arabic Breaking — الأمور تحدث',
    description: 'افتتاحية خبر عاجل بالعربية بأسلوب القنوات الكروية الفصيحة.',
    phraseId: 'thingsAreHappening',
    introCue: 'NEWS_OPENER_DEEP',
    revealCue: 'BREAKING_HIT_SHORT',
    updateCue: 'LIVE_UPDATE_PING',
    confirmCue: 'TRANSFER_LOCK_DEEP',
    outroCue: 'BROADCAST_OUT',
    intensity: 'high',
  },
  {
    id: 'officialClub',
    label: '🏛️ Official Club — رسمياً',
    description: 'إعلان رسمي من النادي. هادئ ومتوازن وموثوق.',
    phraseId: 'official',
    introCue: 'OFFICIAL_STAMP_DEEP',
    revealCue: 'CONTRACT_STAMP_PRO',
    confirmCue: 'OFFICIAL_CONFIRM',
    outroCue: 'FINAL_CONFIRM',
    intensity: 'medium',
  },
  {
    id: 'deadlineDrama',
    label: '⏳ Deadline Drama — الليلة قد تُحسم الصفقة',
    description: 'تصاعد درامي ليوم انتهاء الميركاتو، نبرة ساخنة وحماسية.',
    phraseId: 'deadlineTonight',
    introCue: 'DEADLINE_DAY_TENSION',
    revealCue: 'BREAKING_RISER_SLOW',
    updateCue: 'URGENT_PULSE',
    confirmCue: 'HERE_WE_GO_BOOM',
    outroCue: 'OUTRO_HIT',
    intensity: 'cinematic',
  },
  {
    id: 'sourceExclusive',
    label: '🤐 Source Exclusive — مصدر خاص',
    description: 'نبرة هادئة تشير إلى تسريب من مصدر داخلي.',
    phraseId: 'sourceSpecial',
    introCue: 'SOURCE_UPDATE_BLIP',
    revealCue: 'NEWS_TICKER_CLEAN',
    confirmCue: 'IMPORTANT_ALERT_SOFT',
    outroCue: 'SOFT_FADE',
    intensity: 'soft',
  },
  {
    id: 'dealHeating',
    label: '🔥 Deal Heating — الصفقة تشتعل',
    description: 'الصفقة دخلت مرحلة ساخنة، مؤثرات حادة سريعة.',
    phraseId: 'dealHeating',
    introCue: 'BREAKING_RISER_FAST',
    revealCue: 'BREAKING_HIT_LONG',
    updateCue: 'NEGOTIATION_TICK',
    confirmCue: 'TRANSFER_LOCK_DEEP',
    outroCue: 'OUTRO_HIT',
    intensity: 'high',
  },
  {
    id: 'analysisLab',
    label: '🔬 Analysis Lab — فحص فني للاعب',
    description: 'تحليل تكتيكي بصوت رادار وأشعة، نمط تقرير معمق.',
    phraseId: 'analysisProbe',
    introCue: 'X_RAY_SCAN',
    revealCue: 'DATA_SCAN_CLEAN',
    updateCue: 'RADAR_PING',
    confirmCue: 'PRECISION_CLICK',
    outroCue: 'GLASS_WHOOSH',
    intensity: 'medium',
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────
const PHRASE_BY_ID = new Map<string, VoicePhrase>();
for (const p of VOICE_PHRASES) PHRASE_BY_ID.set(p.id, p);

const PROFILE_BY_ID = new Map<string, AudioProfile>();
for (const p of AUDIO_PROFILES) PROFILE_BY_ID.set(p.id, p);

export const getVoicePhrase = (id: string): VoicePhrase | undefined => PHRASE_BY_ID.get(id);
export const getAudioProfile = (id: string): AudioProfile | undefined => PROFILE_BY_ID.get(id);
export const listAudioProfiles = (): readonly AudioProfile[] => AUDIO_PROFILES;
export const listVoicePhrases = (): readonly VoicePhrase[] => VOICE_PHRASES;

/** Resolve a profile + phrase pair from a template's audioProfile field. */
export const resolveAudioProfile = (audioProfileId: string | undefined) => {
  const profile = audioProfileId ? PROFILE_BY_ID.get(audioProfileId) : undefined;
  if (!profile) {
    return { profile: AUDIO_PROFILES[0], phrase: PHRASE_BY_ID.get(AUDIO_PROFILES[0].phraseId)! };
  }
  return { profile, phrase: PHRASE_BY_ID.get(profile.phraseId) || VOICE_PHRASES[0] };
};
