/**
 * Global Voice Library — registry of REAL pre-recorded voice cues that
 * are bundled with the project under public/audio/voice-packs.
 *
 * IMPORTANT POLICY:
 *   - This file does NOT add new audio assets.
 *   - Every entry MUST point to a file that actually exists on disk.
 *   - When a template-specific voice is needed, it goes here so every
 *     template (not just Mercato) can pick it from a unified picker.
 *
 * Triggers (when to play the voice):
 *   - manual_only → only fires when user clicks Preview / Play Voice
 *   - on_enter    → fires once when overlay becomes visible (IN)
 *   - on_update   → fires when key data fields change while live
 *   - on_alert    → fires only when an explicit alert action is dispatched
 *
 * The default voice trigger is `manual_only` to avoid surprise audio.
 */

export type VoiceTrigger = 'manual_only' | 'on_enter' | 'on_update' | 'on_alert';

export type VoiceCategory = 'mercato' | 'call' | 'news' | 'official' | 'alert' | 'custom' | 'generic';

export interface VoiceLibraryEntry {
  id: string;
  labelAr: string;
  labelEn: string;
  url: string;
  category: VoiceCategory;
  durationMs?: number;
  /** Templates this cue is most appropriate for. UI may surface them first. */
  recommendedFor?: string[];
  /**
   * If true, the entry is shown in the picker but the option is disabled
   * because the audio file is not present yet (placeholder for a future
   * audio-pack delivery). resolveVoiceUrl returns null for these.
   */
  unavailable?: boolean;
}

/**
 * Only entries that point to real files in public/audio/voice-packs.
 * Verified at AUDIO-X4: 2 wav files exist.
 */
export const VOICE_LIBRARY: VoiceLibraryEntry[] = [
  {
    id: 'mercato_here_we_go',
    labelAr: 'هير وي غو — Here we go',
    labelEn: 'Here we go',
    url: '/audio/voice-packs/mercato/here-we-go.wav',
    category: 'mercato',
    recommendedFor: ['BREAKING_HERE_WE_GO', 'TRANSFER_NEWS', 'MERCATO_AGENT_CALL', 'MERCATO_DEAL_TIMELINE'],
  },
  {
    id: 'mercato_agreement_close',
    labelAr: 'الاتفاق وشيك — Agreement close',
    labelEn: 'Agreement close',
    url: '/audio/voice-packs/mercato/agreement-close.wav',
    category: 'mercato',
    recommendedFor: ['BREAKING_HERE_WE_GO', 'TRANSFER_NEWS', 'MERCATO_DEAL_TIMELINE'],
  },
  {
    id: 'mercato_things_happening_now',
    labelAr: 'الأمور تحدث الآن',
    labelEn: 'Things are happening now',
    url: '/audio/voice-packs/mercato/things-happening-now.wav',
    category: 'mercato',
    durationMs: 1800,
    recommendedFor: ['TRANSFER_NEWS', 'MERCATO_UNIFIED', 'MERCATO_MEDIA_STORY', 'MERCATO_DEADLINE_DAY'],
  },
  {
    id: 'mercato_transfer_approaching',
    labelAr: 'الانتقال يقترب',
    labelEn: 'Transfer approaching',
    url: '/audio/voice-packs/mercato/transfer-approaching.wav',
    category: 'mercato',
    durationMs: 1500,
    recommendedFor: ['TRANSFER_NEWS', 'MERCATO_UNIFIED', 'MERCATO_MEDIA_STORY', 'MERCATO_DEAL_TIMELINE'],
  },
  {
    id: 'mercato_heating_now',
    labelAr: 'الميركاتو يشتعل الآن',
    labelEn: 'Mercato heating now',
    url: '/audio/voice-packs/mercato/mercato-heating-now.wav',
    category: 'mercato',
    durationMs: 1900,
    recommendedFor: ['TRANSFER_NEWS', 'MERCATO_UNIFIED', 'MERCATO_MEDIA_STORY', 'MERCATO_DEADLINE_DAY'],
  },
  {
    id: 'mercato_deal_percentages_current',
    labelAr: 'النسب الحالية للصفقات',
    labelEn: 'Current deal percentages',
    url: '/audio/voice-packs/mercato/deal-percentages-current.wav',
    category: 'mercato',
    durationMs: 1700,
    recommendedFor: ['TRANSFER_NEWS', 'MERCATO_UNIFIED', 'MERCATO_MEDIA_STORY', 'MERCATO_X_RAY'],
  },
];

export const NO_VOICE_OPTION = { id: 'none', labelAr: '— بدون صوت —', labelEn: 'No voice', url: '', category: 'generic' as const };

export function getVoiceEntry(id: string): VoiceLibraryEntry | null {
  return VOICE_LIBRARY.find(e => e.id === id) || null;
}

export function listVoicesForTemplate(templateType: string): VoiceLibraryEntry[] {
  // Recommended first, then everything else. Never empty: every template
  // can browse the full library. Unavailable entries are still listed but
  // marked so the UI can disable them.
  const recommended = VOICE_LIBRARY.filter(e => e.recommendedFor?.includes(templateType));
  const others = VOICE_LIBRARY.filter(e => !e.recommendedFor?.includes(templateType));
  return [...recommended, ...others];
}

export function listVoicesByCategory(category: VoiceCategory): VoiceLibraryEntry[] {
  return VOICE_LIBRARY.filter(e => e.category === category);
}

/**
 * Resolve which URL to actually play for a voice cue.
 * Priority:
 *   1. directUrl (user-supplied — highest priority, full control)
 *   2. library entry by id (only if not marked unavailable)
 *   3. null (no voice)
 */
export function resolveVoiceUrl(libraryId: string | undefined, directUrl: string | undefined): string | null {
  const direct = (directUrl || '').trim();
  if (direct) return direct;
  if (!libraryId || libraryId === 'none') return null;
  const entry = getVoiceEntry(libraryId);
  if (!entry || entry.unavailable) return null;
  return entry.url || null;
}
