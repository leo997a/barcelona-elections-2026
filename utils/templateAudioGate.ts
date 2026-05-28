/**
 * Universal Audio Gate.
 *
 * Single source of truth for "should this template fire any audio cue?".
 * Every audio entry-point in the codebase MUST consult this gate before
 * calling audioEngine.playCue / playMercatoStory / etc.
 *
 * Gate rules (any one returning false short-circuits to false):
 *   1. soundEnabled field is explicitly false      → false
 *   2. soundVolume field is 0 or negative          → false
 *   3. config.isVisible is false (no audio when hidden, except EXIT)
 *   4. resolveTemplateAudio(config).enabled is false → false
 *
 * The gate is defensive: if a field is missing it ASSUMES sound is
 * enabled at the default volume (backwards compatible with old saved
 * overlays). The bug we fix in this phase: previously each renderer
 * inlined its own check, with subtle differences. Some checked
 * `soundEnabled !== false`, some checked `enableSfx`, Mercato had its
 * own gate, etc.
 */
import type { OverlayConfig } from '../types';
import { resolveTemplateAudio } from './templateRuntime';

export type AudioEventType = 'ENTRY' | 'EXIT' | 'TRANSITION' | 'ALERT' | 'SUCCESS' | 'ERROR';

const fieldValue = (overlay: OverlayConfig, id: string): unknown => {
  return overlay.fields?.find(f => f.id === id)?.value;
};

/**
 * Pure function. Returns true if this template instance should play
 * any audio for the given event type.
 *
 * @param overlay   The current overlay config
 * @param eventType The event we are about to fire audio for
 */
export function shouldPlayTemplateSound(
  overlay: OverlayConfig,
  eventType: AudioEventType,
): boolean {
  // 1. Master mute (covers everything)
  const enabled = fieldValue(overlay, 'soundEnabled');
  if (enabled === false) return false;

  // 2. Volume is muted to zero
  const vol = fieldValue(overlay, 'soundVolume');
  if (typeof vol === 'number' && vol <= 0) return false;

  // 3. SFX disabled — blocks ENTRY / EXIT / TRANSITION cues only.
  //    Voice cues are guarded separately via shouldPlayVoiceCue.
  if (eventType === 'ENTRY' || eventType === 'EXIT' || eventType === 'TRANSITION') {
    const sfx = fieldValue(overlay, 'sfxEnabled');
    if (sfx === false) return false;
  }

  // 4. Runtime profile gate (template-type level)
  const profile = resolveTemplateAudio(overlay);
  if (profile.enabled === false) return false;
  if (profile.volume <= 0) return false;

  // 5. ENTRY only fires when overlay is visible (anti-random-fire guard)
  //    EXIT fires during exit transition; we do not block it here.
  if (eventType === 'ENTRY' && overlay.isVisible !== true) {
    return false;
  }

  return true;
}

/**
 * Voice-specific gate. Used by Mercato + any template that fires a
 * pre-recorded voice cue. Independent of SFX so the user can run voice
 * without SFX or vice-versa.
 *
 * @param overlay  The overlay config
 * @param trigger  The trigger that just fired (must match voiceTrigger
 *                 field, or 'manual' for explicit Preview clicks).
 */
export function shouldPlayVoiceCue(
  overlay: OverlayConfig,
  trigger: 'on_enter' | 'on_update' | 'on_alert' | 'manual',
): boolean {
  // Master mute
  if (fieldValue(overlay, 'soundEnabled') === false) return false;
  if (fieldValue(overlay, 'voiceEnabled') !== true) return false;
  const vol = fieldValue(overlay, 'voiceVolume');
  if (typeof vol === 'number' && vol <= 0) return false;
  // Manual preview always wins (user-initiated)
  if (trigger === 'manual') return true;
  const configured = String(fieldValue(overlay, 'voiceTrigger') ?? 'manual_only');
  return configured === trigger;
}

/**
 * Returns the resolved volume to actually use, after applying the gate.
 * Returns 0 if the gate is closed.
 */
export function resolveTemplateVolume(overlay: OverlayConfig, eventType: AudioEventType): number {
  if (!shouldPlayTemplateSound(overlay, eventType)) return 0;
  const vol = fieldValue(overlay, 'soundVolume');
  const profile = resolveTemplateAudio(overlay);
  if (typeof vol === 'number' && vol >= 0) return vol;
  return profile.volume;
}

/**
 * Phase X11 — single source-of-truth for "this field is owned by
 * AudioSettingsPanel, do NOT render it as a raw field elsewhere".
 *
 * The Editor's sound tab used to mount AudioSettingsPanel AND then iterate
 * over every audio field, rendering each one as a raw input. Result: a
 * clean panel followed by 13 duplicate raw inputs. This helper centralizes
 * the list so any callsite that walks template fields can skip them.
 */
const MANAGED_AUDIO_FIELDS: ReadonlySet<string> = new Set([
  'soundEnabled',
  'soundVolume',
  'sfxEnabled',
  'sfxVolume',
  'voiceEnabled',
  'voiceLibraryId',
  'voiceDirectUrl',
  'voiceTrigger',
  'voiceVolume',
  'directVoiceUrl',
  'duckSfx',
  'audioSceneId',
  'audioUpdateCue',
  'audioProfileId',
  'soundInStyle',
  'soundOutStyle',
  'soundCue',
  'soundStyle',
]);

export function isManagedAudioField(fieldId: string): boolean {
  return MANAGED_AUDIO_FIELDS.has(fieldId);
}

export function listManagedAudioFields(): readonly string[] {
  return Array.from(MANAGED_AUDIO_FIELDS);
}
