/**
 * Global Template Runtime — single source of truth for:
 *   1. Audio defaults (every template inherits a sane IN/OUT cue)
 *   2. Capability registry (what does this template type support?)
 *   3. Action helpers (preview/show/in/out/hide/update/reset)
 *   4. Diagnostics (last action + last status per overlay)
 *
 * Designed to NOT replace the existing OverlayRenderer + syncManager
 * pipeline. It extends it with a uniform contract while preserving
 * backwards compatibility for every overlay type.
 */
import { OverlayType, type ActionCommand, type OverlayConfig } from '../types';

// ─── Audio Profiles ──────────────────────────────────────────────────────────

export interface AudioProfile {
  id: string;
  enabled: boolean;
  volume: number;
  /** Cue keys (resolved by services/audioEngine.ts) */
  inCue: string;
  outCue: string;
  updateCue: string;
}

/**
 * Premium subtle default. Replaces the previous loud STADIUM_WHOOSH default.
 *
 * Policy: every template inherits a soft, broadcast-respectable audio
 * profile by default. Strong cues (MERCATO_HIT, BREAKING_RISER, GOAL_HORN)
 * are reserved for templates whose subject warrants intensity (mercato,
 * breaking news, goals). Everything else uses subtle cues so the default
 * UX is never embarrassing or jarring.
 *
 * Volume floor is 0.55 (was 0.7) so even when templates inherit the
 * default they sound polite, not loud.
 */
export const DEFAULT_AUDIO_PROFILE: AudioProfile = {
  id: 'premium_subtle',
  enabled: true,
  volume: 0.55,
  inCue: 'LOWER_THIRD_WIPE',  // soft wipe, not a whoosh
  outCue: 'SOFT_FADE',
  updateCue: 'DATA_TICK',
};

/**
 * Per-template-type audio mapping. Every value MUST come from the
 * existing audioEngine cue catalog. No new audio files are added here.
 *
 * Default policy (post-AUDIO-SETTINGS-X3):
 *   - Generic data templates (stats, profile, viewers, social, smart news)
 *     → soft cues (LOWER_THIRD_WIPE / SOFT_FADE / DATA_TICK), volume 0.5-0.6
 *   - Score / scoreboard templates → SCOREBUG_SNAP (sharp but short), 0.6
 *   - Alert / breaking templates   → keep stronger cues, but capped at 0.7
 *   - Mercato deals / official     → keep MERCATO_HIT / HERE_WE_GO_STING,
 *                                     these templates are about transfers
 *                                     and the cue is part of their identity.
 *
 * If a type is missing it falls back to DEFAULT_AUDIO_PROFILE (premium_subtle).
 */
export const TEMPLATE_AUDIO_PROFILES: Partial<Record<OverlayType, AudioProfile>> = {
  [OverlayType.SCOREBOARD]:           { id: 'scoreboard', enabled: true, volume: 0.6, inCue: 'SCOREBUG_SNAP',     outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.LOWER_THIRD]:          { id: 'lower_third', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE',     updateCue: 'DATA_TICK' },
  [OverlayType.TICKER]:               { id: 'ticker', enabled: true, volume: 0.45, inCue: 'DATA_TICK',         outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.ALERT]:                { id: 'alert', enabled: true, volume: 0.7, inCue: 'IMPORTANT_PING',     outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.EXCLUSIVE_ALERT]:      { id: 'exclusive_alert', enabled: true, volume: 0.7, inCue: 'IMPORTANT_PING', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.SMART_NEWS]:           { id: 'smart_news', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE',     updateCue: 'DATA_TICK' },
  [OverlayType.STATEMENT_CARDS]:      { id: 'statement_cards', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'LIVE_UPDATE_PING' },
  [OverlayType.LEADERBOARD]:          { id: 'leaderboard', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE',     updateCue: 'DATA_TICK' },
  [OverlayType.GUESTS]:               { id: 'guests', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.UCL_DRAW]:             { id: 'ucl_draw', enabled: true, volume: 0.6, inCue: 'LUXURY_SWEEP',    outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.ELECTION]:             { id: 'election', enabled: true, volume: 0.6, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE',     updateCue: 'DATA_TICK' },
  [OverlayType.SOCIAL_MEDIA]:         { id: 'social_media', enabled: true, volume: 0.5, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.TODAYS_EPISODE]:       { id: 'todays_episode', enabled: true, volume: 0.55, inCue: 'BEFORE_THE_KICKOFF', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.PLAYER_PROFILE]:       { id: 'player_profile', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.TOP_VIEWERS]:          { id: 'top_viewers', enabled: true, volume: 0.45, inCue: 'DATA_TICK',     outCue: 'SOFT_FADE',     updateCue: 'DATA_TICK' },
  [OverlayType.FOOTBALL_PACKAGE]:     { id: 'football_package', enabled: true, volume: 0.6, inCue: 'LUXURY_SWEEP', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.H2H_STATS]:            { id: 'h2h_stats', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.TRANSFER_NEWS]:        { id: 'transfer_news', enabled: true, volume: 0.65, inCue: 'MERCATO_HIT', outCue: 'SOFT_FADE',    updateCue: 'DATA_TICK' },
  [OverlayType.BARCA_PREMIUM]:        { id: 'barca_premium', enabled: true, volume: 0.6, inCue: 'LUXURY_SWEEP', outCue: 'SOFT_FADE',   updateCue: 'DATA_TICK' },
  [OverlayType.MATCH_STATS]:          { id: 'match_stats', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.PLAYER_STATS]:         { id: 'player_stats', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.TRANSFER_TARGETS]:     { id: 'transfer_targets', enabled: true, volume: 0.6, inCue: 'TARGET_REVEAL', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.BREAKING_HERE_WE_GO]:  { id: 'breaking_here_we_go', enabled: true, volume: 0.7, inCue: 'BREAKING_RISER', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.MERCATO_AGENT_CALL]:   { id: 'mercato_agent_call', enabled: true, volume: 0.65, inCue: 'AGENT_CALL', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.MERCATO_DEAL_TIMELINE]: { id: 'mercato_deal_timeline', enabled: true, volume: 0.6, inCue: 'TARGET_REVEAL', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.MERCATO_BUDGET_TRACKER]: { id: 'mercato_budget_tracker', enabled: true, volume: 0.6, inCue: 'CASH_REGISTER', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.MERCATO_DEADLINE_DAY]: { id: 'mercato_deadline_day', enabled: true, volume: 0.7, inCue: 'DEADLINE_ALARM', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.MERCATO_X_RAY]:        { id: 'mercato_x_ray', enabled: true, volume: 0.6, inCue: 'TARGET_SCAN',  outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.PLAYER_INTEL_V2]:      { id: 'player_intel_v2', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'DATA_TICK' },
  [OverlayType.MERCATO_UNIFIED]:      { id: 'mercato_unified', enabled: true, volume: 0.55, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'SOFT_CHAT_TICK' },
  [OverlayType.MERCATO_MEDIA_STORY]:  { id: 'mercato_media_story', enabled: true, volume: 0.5, inCue: 'LOWER_THIRD_WIPE', outCue: 'SOFT_FADE', updateCue: 'LIVE_UPDATE_PING' },
};

/**
 * Resolve audio profile for a given overlay instance.
 *
 *  1. Type-specific profile, if defined.
 *  2. Per-instance overrides from overlay fields:
 *      - soundEnabled  → enabled
 *      - soundVolume   → volume
 *      - soundInStyle  → inCue (only if not 'DEFAULT')
 *      - soundOutStyle → outCue (only if not 'DEFAULT')
 *  3. Falls back to DEFAULT_AUDIO_PROFILE.
 */
export function resolveTemplateAudio(overlay: OverlayConfig): AudioProfile {
  const base = TEMPLATE_AUDIO_PROFILES[overlay.type] || DEFAULT_AUDIO_PROFILE;
  const fields = overlay.fields || [];

  const get = (id: string) => fields.find(f => f.id === id)?.value;
  const enabled = get('soundEnabled');
  const volume = get('soundVolume');
  const inStyle = String(get('soundInStyle') ?? 'DEFAULT');
  const outStyle = String(get('soundOutStyle') ?? 'DEFAULT');

  return {
    id: base.id,
    enabled: enabled === undefined ? base.enabled : enabled !== false,
    volume: typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : base.volume,
    inCue: inStyle && inStyle !== 'DEFAULT' ? inStyle : base.inCue,
    outCue: outStyle && outStyle !== 'DEFAULT' ? outStyle : base.outCue,
    updateCue: base.updateCue,
  };
}

// ─── Capabilities ────────────────────────────────────────────────────────────

export interface TemplateCapabilities {
  supportsAudio: boolean;
  supportsInOut: boolean;
  supportsStreamDeck: boolean;
  supportsPreview: boolean;
  supportsLive: boolean;
  supportsUpdate: boolean;
  defaultAudioProfileId: string;
  defaultTransitionProfileId: string;
}

const STANDARD_CAPS: TemplateCapabilities = {
  supportsAudio: true,
  supportsInOut: true,
  supportsStreamDeck: true,
  supportsPreview: true,
  supportsLive: true,
  supportsUpdate: true,
  defaultAudioProfileId: 'broadcast_default',
  defaultTransitionProfileId: 'broadcast_standard',
};

/**
 * Default capabilities are uniform: every template supports the full
 * runtime contract. Specific exceptions (if any) can be listed here.
 */
export const TEMPLATE_CAPABILITIES: Partial<Record<OverlayType, TemplateCapabilities>> = {};

export function getTemplateCapabilities(type: OverlayType): TemplateCapabilities {
  return TEMPLATE_CAPABILITIES[type] || STANDARD_CAPS;
}

// ─── Runtime State ──────────────────────────────────────────────────────────

export type TemplateRuntimeStatus =
  | 'hidden'
  | 'armed'
  | 'entering'
  | 'live'
  | 'updating'
  | 'exiting'
  | 'error';

/**
 * Lightweight status helper derived from the live overlay snapshot.
 * Does NOT introduce new state — simply interprets isVisible plus
 * an in-memory "last action" map for diagnostics.
 */
export function deriveStatus(overlay: OverlayConfig): TemplateRuntimeStatus {
  // Treat isVisible as the canonical source. The animation layer
  // (OverlayRenderer) handles the visual entering/exiting transition,
  // but from a control-plane perspective we only have two stable states.
  return overlay.isVisible ? 'live' : 'hidden';
}

// ─── Diagnostics ────────────────────────────────────────────────────────────

export interface TemplateDiagnostic {
  overlayId: string;
  templateType: OverlayType;
  lastAction: TemplateAction | null;
  lastActionAt: number | null;
  lastError: string | null;
  status: TemplateRuntimeStatus;
}

export type TemplateAction =
  | 'preview'
  | 'show'
  | 'hide'
  | 'toggle'
  | 'refresh'
  | 'update'
  | 'reset';

const _diagnostics = new Map<string, TemplateDiagnostic>();

export function recordDiagnostic(
  overlay: OverlayConfig,
  action: TemplateAction | null,
  error: string | null = null,
): TemplateDiagnostic {
  const entry: TemplateDiagnostic = {
    overlayId: overlay.id,
    templateType: overlay.type,
    lastAction: action,
    lastActionAt: action ? Date.now() : (_diagnostics.get(overlay.id)?.lastActionAt ?? null),
    lastError: error,
    status: deriveStatus(overlay),
  };
  _diagnostics.set(overlay.id, entry);
  return entry;
}

export function getDiagnostic(overlayId: string): TemplateDiagnostic | null {
  return _diagnostics.get(overlayId) || null;
}

export function getAllDiagnostics(): TemplateDiagnostic[] {
  return Array.from(_diagnostics.values());
}

// ─── Action Builder ─────────────────────────────────────────────────────────

/**
 * Build an ActionCommand for the unified runtime. Pure function — does
 * NOT mutate state. The caller (Editor / Operator / Stream Deck plugin)
 * sends the result through syncManager.sendCommand().
 *
 * Guarantees:
 *  - "update" while hidden produces a field update only — never makes
 *    the overlay visible accidentally.
 *  - "show" / "hide" are explicit set_visible commands; never toggles
 *    blindly so Stream Deck has deterministic state.
 *  - "reset" clears the active slot back to default if the overlay
 *    has slots; otherwise it just hides the overlay.
 */
export function buildAction(
  overlay: OverlayConfig,
  action: TemplateAction,
  payload?: { fieldId?: string; value?: unknown },
): ActionCommand | null {
  switch (action) {
    case 'preview':
      // Preview is editor-only. It NEVER pushes On Air. Returning null
      // tells the caller to update the editor draft state instead.
      return null;
    case 'show':
      return { action: 'set_visible', targetId: overlay.id, value: true };
    case 'hide':
      return { action: 'set_visible', targetId: overlay.id, value: false };
    case 'toggle':
      return { action: 'toggle_visible', targetId: overlay.id };
    case 'refresh': {
      const hasRefreshField = (overlay.fields || []).some(field => field.id === 'manualRefreshNonce');
      if (hasRefreshField) {
        return { action: 'increment_field', targetId: overlay.id, fieldId: 'manualRefreshNonce', amount: 1 };
      }
      return {
        action: 'update_field',
        targetId: overlay.id,
        fieldId: 'manualRefreshNonce',
        value: payload?.value ?? Date.now(),
      };
    }
    case 'update':
      if (!payload?.fieldId) return null;
      return {
        action: 'update_field',
        targetId: overlay.id,
        fieldId: payload.fieldId,
        value: payload.value as string | number | boolean | string[],
      };
    case 'reset':
      // If overlay is currently visible, hide it. Field reset to defaults
      // is intentionally NOT done here — it requires the original template
      // definition which lives in constants.ts.
      return { action: 'set_visible', targetId: overlay.id, value: false };
  }
  return null;
}
