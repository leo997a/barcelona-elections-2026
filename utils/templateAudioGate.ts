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
  // 1. Explicit per-instance disable
  const enabled = fieldValue(overlay, 'soundEnabled');
  if (enabled === false) return false;

  // 2. Volume is muted to zero
  const vol = fieldValue(overlay, 'soundVolume');
  if (typeof vol === 'number' && vol <= 0) return false;

  // 3. Runtime profile gate (template-type level)
  const profile = resolveTemplateAudio(overlay);
  if (profile.enabled === false) return false;
  if (profile.volume <= 0) return false;

  // 4. ENTRY only fires when overlay is visible (anti-random-fire guard)
  //    EXIT fires during exit transition; we do not block it here.
  if (eventType === 'ENTRY' && overlay.isVisible !== true) {
    return false;
  }

  return true;
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
