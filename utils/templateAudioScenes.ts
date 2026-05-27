/**
 * Template Audio Scenes — pre-curated sfx + voice presets that match the
 * subject matter of a template family (call room, breaking news, agreement
 * close, deadline drama, analysis lab, etc.).
 *
 * Each scene is a recipe of cue keys (resolved by services/audioEngine.ts).
 * Applying a scene writes ONLY the audio fields on the overlay; it never
 * toggles the master mute, never auto-enables voice, and never plays a
 * sound by itself.
 *
 * Voice policy:
 *   - voiceRecommended just signals that the scene benefits from a voice
 *     cue. The Editor surfaces a separate "apply with voice" button.
 *   - defaultVoiceTrigger stays 'manual_only' for every scene except
 *     scenes that explicitly want IN-triggered voice (we do not pick that
 *     for any scene right now to avoid surprise audio).
 */
import type { OverlayType } from '../types';

export type AudioSceneId =
  | 'premium_silent'
  | 'premium_subtle'
  | 'mercato_call_room'
  | 'mercato_chat_whisper'
  | 'mercato_private_chat_call'
  | 'breaking_news_clean'
  | 'official_club_statement'
  | 'deadline_drama'
  | 'transfer_agreement_close'
  | 'exclusive_source_call'
  | 'analysis_lab';

export type VoiceTrigger = 'manual_only' | 'on_enter' | 'on_update' | 'on_alert';

export interface AudioScene {
  id: AudioSceneId;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  /**
   * The audio profile id this scene belongs to (matches one of
   * TEMPLATE_AUDIO_PROFILES ids in templateRuntime). Optional — used for
   * future analytics / diagnostics.
   */
  defaultSfxProfile: string;
  /** SFX cue keys (must exist in services/audioEngine catalog) */
  enterCue: string;
  exitCue: string;
  updateCue?: string;
  /**
   * Optional ambient cue. NOT played by default — UI may surface it as a
   * "play ambient" button. Kept here for future expansion.
   */
  ambientCue?: string;
  /** Volume baseline. Final volume = soundVolume × this multiplier. */
  volumeMultiplier: number;
  /** Whether the subject of the template benefits from a voice cue. */
  voiceRecommended: boolean;
  /**
   * Trigger applied when the user explicitly picks "apply scene + enable
   * voice". For every scene we keep 'manual_only' so audio never starts
   * without the user pressing Preview.
   */
  defaultVoiceTrigger: VoiceTrigger;
  /** Preferred OverlayType ids (for sorting in the UI). */
  recommendedFor: OverlayType[];
}

/**
 * Curated registry. Every cue key is one that already exists in
 * services/audioEngine (either via the synth catalog or the new
 * SOFT_CALL_CONNECT / SOFT_CHAT_TICK / SOFT_RECORDING_BEEP /
 * SOFT_NOTIFICATION_PULSE keys added in AUDIO-PACKS-X5).
 *
 * No external mp3/wav files are referenced.
 */
export const TEMPLATE_AUDIO_SCENES: Record<AudioSceneId, AudioScene> = {
  premium_silent: {
    id: 'premium_silent',
    labelAr: 'صامت احترافي',
    labelEn: 'Premium Silent',
    descriptionAr: 'بدون أي مؤثرات. للمحتوى الذي يتحدث عن نفسه.',
    defaultSfxProfile: 'silent',
    enterCue: 'HARD_CUT',
    exitCue: 'HARD_CUT',
    updateCue: 'HARD_CUT',
    volumeMultiplier: 0,
    voiceRecommended: false,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  premium_subtle: {
    id: 'premium_subtle',
    labelAr: 'ناعم احترافي',
    labelEn: 'Premium Subtle',
    descriptionAr: 'دخول وخروج هادئان مناسبان لكل القوالب.',
    defaultSfxProfile: 'premium_subtle',
    enterCue: 'LOWER_THIRD_WIPE',
    exitCue: 'SOFT_FADE',
    updateCue: 'DATA_TICK',
    volumeMultiplier: 0.55,
    voiceRecommended: false,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  mercato_call_room: {
    id: 'mercato_call_room',
    labelAr: 'غرفة مكالمة الميركاتو',
    labelEn: 'Mercato Call Room',
    descriptionAr: 'إحساس مكالمة وكيل: نغمة اتصال خفيفة + tick رسالة + beep تسجيل.',
    defaultSfxProfile: 'mercato_agent_call',
    enterCue: 'SOFT_CALL_CONNECT',
    exitCue: 'SOFT_FADE',
    updateCue: 'SOFT_CHAT_TICK',
    ambientCue: 'SOFT_RECORDING_BEEP',
    volumeMultiplier: 0.55,
    voiceRecommended: true,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  mercato_chat_whisper: {
    id: 'mercato_chat_whisper',
    labelAr: 'دردشة همس',
    labelEn: 'Chat Whisper',
    descriptionAr: 'تنبيه رسائل خفيف، مناسب لقوالب الشروط الشخصية ومحادثات الوكيل.',
    defaultSfxProfile: 'mercato_chat',
    enterCue: 'SOFT_NOTIFICATION_PULSE',
    exitCue: 'SOFT_FADE',
    updateCue: 'SOFT_CHAT_TICK',
    volumeMultiplier: 0.5,
    voiceRecommended: false,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  mercato_private_chat_call: {
    id: 'mercato_private_chat_call',
    labelAr: 'مكالمة/دردشة خاصة',
    labelEn: 'Private Chat & Call',
    descriptionAr: 'مشهد مكالمة خاصة + دردشة (incoming/outgoing/ring/end). أصوات أصلية مستوحاة من تجربة المراسلة بدون نسخ ملفات تطبيقات محمية.',
    defaultSfxProfile: 'mercato_private_chat_call',
    enterCue: 'SOFT_CALL_RING_LIGHT',
    exitCue: 'SOFT_CALL_END',
    updateCue: 'SOFT_CHAT_INCOMING',
    ambientCue: 'SOFT_TYPING_PULSE',
    volumeMultiplier: 0.5,
    voiceRecommended: true,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  breaking_news_clean: {
    id: 'breaking_news_clean',
    labelAr: 'خبر عاجل نظيف',
    labelEn: 'Breaking News Clean',
    descriptionAr: 'افتتاحية خبر عاجل بدون مبالغة في الـ bass.',
    defaultSfxProfile: 'breaking',
    enterCue: 'BREAKING_RISER',
    exitCue: 'SOFT_FADE',
    updateCue: 'DATA_TICK',
    volumeMultiplier: 0.7,
    voiceRecommended: true,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  official_club_statement: {
    id: 'official_club_statement',
    labelAr: 'بيان نادٍ رسمي',
    labelEn: 'Official Club Statement',
    descriptionAr: 'ختم رسمي + sweep هادئ. لقوالب البيانات المكتوبة.',
    defaultSfxProfile: 'official',
    enterCue: 'OFFICIAL_STAMP',
    exitCue: 'SOFT_FADE',
    updateCue: 'DATA_TICK',
    volumeMultiplier: 0.6,
    voiceRecommended: false,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  deadline_drama: {
    id: 'deadline_drama',
    labelAr: 'دراما آخر موعد',
    labelEn: 'Deadline Drama',
    descriptionAr: 'تصاعد توتري لساعة الحسم. قوي لكن ليس صاخبًا.',
    defaultSfxProfile: 'deadline',
    enterCue: 'DEADLINE_ALARM',
    exitCue: 'SOFT_FADE',
    updateCue: 'COUNTDOWN_BEEP',
    volumeMultiplier: 0.7,
    voiceRecommended: true,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  transfer_agreement_close: {
    id: 'transfer_agreement_close',
    labelAr: 'اتفاق وشيك',
    labelEn: 'Agreement Close',
    descriptionAr: 'لحظة الاتفاق على التفاصيل. ختم نهائي مع شعور إغلاق ناعم.',
    defaultSfxProfile: 'transfer',
    enterCue: 'CONTRACT_STAMP',
    exitCue: 'SOFT_FADE',
    updateCue: 'SOFT_CHAT_TICK',
    volumeMultiplier: 0.65,
    voiceRecommended: true,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  exclusive_source_call: {
    id: 'exclusive_source_call',
    labelAr: 'مكالمة مصدر حصري',
    labelEn: 'Exclusive Source Call',
    descriptionAr: 'مصدر حصري على الخط. نغمة اتصال + رسالة تأكيد + beep خفيف.',
    defaultSfxProfile: 'mercato_agent_call',
    enterCue: 'SOFT_CALL_CONNECT',
    exitCue: 'SOFT_FADE',
    updateCue: 'SOFT_RECORDING_BEEP',
    volumeMultiplier: 0.55,
    voiceRecommended: true,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
  analysis_lab: {
    id: 'analysis_lab',
    labelAr: 'مختبر التحليل',
    labelEn: 'Analysis Lab',
    descriptionAr: 'إيقاع بيانات هادئ — مناسب لرادار وثقة المصادر.',
    defaultSfxProfile: 'analysis',
    enterCue: 'TARGET_SCAN',
    exitCue: 'SOFT_FADE',
    updateCue: 'DATA_TICK',
    volumeMultiplier: 0.55,
    voiceRecommended: false,
    defaultVoiceTrigger: 'manual_only',
    recommendedFor: [],
  },
};

export function getAudioScene(id: string): AudioScene | null {
  return (TEMPLATE_AUDIO_SCENES as Record<string, AudioScene>)[id] || null;
}

export function listAudioScenes(): AudioScene[] {
  return Object.values(TEMPLATE_AUDIO_SCENES);
}

/**
 * Map a scene to the field updates the Editor should apply when the user
 * picks "apply scene". Returns ONLY audio-related fields.
 */
export function sceneToFieldUpdates(scene: AudioScene): Record<string, string | number | boolean> {
  return {
    soundInStyle: scene.enterCue,
    soundOutStyle: scene.exitCue,
    sfxEnabled: true,
  };
}

/**
 * Same as above but also enables voice with the scene's default trigger.
 * Caller invokes this only when the user explicitly picks
 * "apply scene + enable voice".
 */
export function sceneToFieldUpdatesWithVoice(scene: AudioScene): Record<string, string | number | boolean> {
  return {
    ...sceneToFieldUpdates(scene),
    voiceEnabled: true,
    voiceTrigger: scene.defaultVoiceTrigger,
  };
}
