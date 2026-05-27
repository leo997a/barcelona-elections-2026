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

export interface VoiceLibraryEntry {
  id: string;
  labelAr: string;
  labelEn: string;
  url: string;
  category: 'mercato' | 'breaking' | 'sport' | 'generic';
  durationMs?: number;
  /** Templates this cue is most appropriate for. UI may surface them first. */
  recommendedFor?: string[];
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
];

export const NO_VOICE_OPTION = { id: 'none', labelAr: '— بدون صوت —', labelEn: 'No voice', url: '', category: 'generic' as const };

export function getVoiceEntry(id: string): VoiceLibraryEntry | null {
  return VOICE_LIBRARY.find(e => e.id === id) || null;
}

export function listVoicesForTemplate(templateType: string): VoiceLibraryEntry[] {
  // Recommended first, then everything else. Never empty: every template
  // can browse the full library.
  const recommended = VOICE_LIBRARY.filter(e => e.recommendedFor?.includes(templateType));
  const others = VOICE_LIBRARY.filter(e => !e.recommendedFor?.includes(templateType));
  return [...recommended, ...others];
}

/**
 * Resolve which URL to actually play for a voice cue.
 * Priority:
 *   1. directUrl (user-supplied — highest priority, full control)
 *   2. library entry by id
 *   3. null (no voice)
 */
export function resolveVoiceUrl(libraryId: string | undefined, directUrl: string | undefined): string | null {
  const direct = (directUrl || '').trim();
  if (direct) return direct;
  if (!libraryId || libraryId === 'none') return null;
  const entry = getVoiceEntry(libraryId);
  return entry?.url || null;
}
