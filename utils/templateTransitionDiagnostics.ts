/**
 * Template Transition Diagnostics — module-level state to track WHY a
 * transition cue did or did not fire.
 *
 * Phase-A-Hotfix-1: the renderer-local first-mount guard was suppressing
 * legitimate transitions in two cases:
 *   1. The renderer remounts (e.g. when output reconnects to SSE).
 *   2. The watched key was identical to the seed (no actual change).
 *
 * This module:
 *   - Tracks watched-key per overlay.id at module scope (survives remount).
 *   - Records every attempt + reason for blocking (or success).
 *   - Surfaces the most recent attempt for the DiagnosticStrip to show.
 */

import type { OverlayConfig } from '../types';
import { shouldPlayTemplateSound } from './templateAudioGate';

export type TransitionBlockReason =
  | 'master_muted'
  | 'sfx_disabled'
  | 'volume_zero'
  | 'profile_disabled'
  | 'no_field_change'
  | 'first_mount_seeded'
  | 'no_play_sound_prop'
  | 'no_overlay_id';

export interface TransitionAttempt {
  overlayId: string;
  templateType: string;
  watchedHashBefore: string | null;
  watchedHashAfter: string;
  cueResolved: string | null;
  blockedBy: TransitionBlockReason | null; // null = success
  at: number;
}

const _watchedHashByOverlay = new Map<string, string>();
const _lastAttemptByOverlay = new Map<string, TransitionAttempt>();

/**
 * Try to fire a transition cue for an overlay instance.
 *
 * Returns the attempt record (with blockedBy = null on success). Caller
 * (Renderer) should invoke playSound('TRANSITION') only if the return
 * value's blockedBy is null.
 *
 * Use this instead of a useRef-based guard so module state survives
 * remounts (e.g. when output reconnects to SSE).
 */
export function evaluateTransitionAttempt(
  overlay: OverlayConfig,
  watchedHash: string,
  hasPlaySoundProp: boolean,
): TransitionAttempt {
  const overlayId = overlay.id || '';
  const before = _watchedHashByOverlay.get(overlayId) ?? null;

  const baseAttempt: Omit<TransitionAttempt, 'blockedBy'> = {
    overlayId,
    templateType: overlay.type,
    watchedHashBefore: before,
    watchedHashAfter: watchedHash,
    cueResolved: null,
    at: Date.now(),
  };

  const finish = (blockedBy: TransitionBlockReason | null): TransitionAttempt => {
    const a: TransitionAttempt = { ...baseAttempt, blockedBy };
    _lastAttemptByOverlay.set(overlayId, a);
    return a;
  };

  if (!overlayId) return finish('no_overlay_id');
  if (!hasPlaySoundProp) {
    // Still seed the hash so the next valid call can detect change.
    _watchedHashByOverlay.set(overlayId, watchedHash);
    return finish('no_play_sound_prop');
  }

  // First time we see this overlay.id at module scope: seed and skip.
  // This is the "first mount" case but uses module state rather than
  // useRef so it survives renderer remount.
  if (before === null) {
    _watchedHashByOverlay.set(overlayId, watchedHash);
    return finish('first_mount_seeded');
  }

  // No change → no transition.
  if (before === watchedHash) {
    return finish('no_field_change');
  }

  // There IS a change. Update stored hash and check audio gates.
  _watchedHashByOverlay.set(overlayId, watchedHash);

  const fieldVal = (id: string) => overlay.fields.find(f => f.id === id)?.value;
  if (fieldVal('soundEnabled') === false) return finish('master_muted');
  const vol = fieldVal('soundVolume');
  if (typeof vol === 'number' && vol <= 0) return finish('volume_zero');
  if (fieldVal('sfxEnabled') === false) return finish('sfx_disabled');

  // Re-use the central gate for any future rule additions.
  if (!shouldPlayTemplateSound(overlay, 'TRANSITION')) {
    return finish('profile_disabled');
  }

  return finish(null);
}

export function getLastTransitionAttempt(overlayId: string): TransitionAttempt | null {
  return _lastAttemptByOverlay.get(overlayId) ?? null;
}

/**
 * Force-clears the seeded hash for an overlay. Useful in tests / when an
 * operator explicitly requests a transition reset.
 */
export function resetTransitionSeed(overlayId: string): void {
  _watchedHashByOverlay.delete(overlayId);
  _lastAttemptByOverlay.delete(overlayId);
}

export function reasonLabelAr(reason: TransitionBlockReason | null): string {
  if (reason === null) return 'سُمع';
  switch (reason) {
    case 'master_muted':       return 'الصوت العام مكتوم';
    case 'sfx_disabled':       return 'المؤثرات معطلة (SFX OFF)';
    case 'volume_zero':        return 'مستوى الصوت صفر';
    case 'profile_disabled':   return 'profile معطل';
    case 'no_field_change':    return 'لا تغيير في الحقول المراقبة';
    case 'first_mount_seeded': return 'أول mount — لا يصدر صوت';
    case 'no_play_sound_prop': return 'playSound prop مفقود';
    case 'no_overlay_id':      return 'overlay بدون id';
    default:                   return String(reason);
  }
}
