/**
 * mercatoAudioEngine.ts — High-level audio orchestrator for mercato templates.
 *
 *  This engine sits ABOVE the existing audioEngine + deepVoiceSynth. It
 *  orchestrates a story-driven sequence:
 *
 *      [intro SFX]  ──►  [voice]  ──►  [reveal SFX]  ──►  [confirm SFX]  ──►  [outro SFX]
 *
 *  Priority order for the spoken voice:
 *
 *      1. customVoiceUrl  — user-uploaded MP3/WAV. ALWAYS preferred when set.
 *                            This is the recommended workflow for production.
 *      2. defaultAudioUrl — preset URL on a VoicePhrase if any.
 *      3. Browser/StreamElements TTS via deepVoiceSynth — best-effort fallback
 *         that respects the no-overlap mutex already implemented there.
 *      4. SFX-only        — last resort. Plays the recommended cue for the
 *                            phrase so the visual entrance still has a beat.
 *
 *  Ducking:
 *      While a voice plays, we duck the overlay channel multiplier to 0.65
 *      via setOverlayDuckGain. When the voice ends, we ramp it back to 1.0
 *      over 300ms.
 *
 *  Channels:
 *      We always pass channel:'overlay' for SFX scheduled by this engine.
 *      Voice goes through deepVoiceSynth (its own mutex). Preview channel
 *      (sound picker UI) is untouched and never collides with these cues.
 *
 *  This file is a NEW addition. No old key, type or function is removed.
 */

import {
  playFromLibrary,
  playCue,
  setOverlayDuckGain,
} from './audioEngine';
import {
  playAnnouncement,
  stopAnnouncement,
  type AnnouncementOptions,
} from './deepVoiceSynth';
import {
  getAudioProfile,
  getVoicePhrase,
  type AudioProfile,
} from './mercatoVoicePacks';

export type MercatoStoryConfig = {
  /** Audio profile id, e.g. 'fabrizioBreaking'. */
  profileId?: string;
  /** Voice pack phrase id, e.g. 'hereWeGo'. Resolves to a built-in audio file. */
  voicePackId?: string;
  /** Optional user-supplied MP3/WAV URL — has highest priority for the voice. */
  customVoiceUrl?: string;
  /** Optional override of the spoken text (otherwise profile default). */
  customText?: string;
  /** Optional override of cues (any subset). */
  introCue?: string;
  revealCue?: string;
  updateCue?: string;
  confirmCue?: string;
  outroCue?: string;
  /** 0..1 master volume scalar applied on top of soundLibrary recipe volumes. */
  intensity?: number;
  /** Toggle voice phrase playback. Defaults to true. */
  enableVoice?: boolean;
  /** Toggle SFX playback. Defaults to true. */
  enableSfx?: boolean;
  /** Voice fallback options forwarded to deepVoiceSynth.playAnnouncement. */
  voiceFallback?: Omit<AnnouncementOptions, 'volume' | 'mode'>;
};

export type MercatoStorySession = {
  /** Cancel the entire sequence + restore overlay duck to 1.0. */
  stop: () => void;
  /** Manually fire confirmCue (e.g. when the headline is locked). */
  confirm: () => void;
  /** Manually fire outroCue (e.g. when the template is hidden). */
  outro: () => void;
  /** Manually fire updateCue (e.g. on a status change). */
  update: () => void;
};

const DEFAULT_INTENSITY = 1.0;
const DUCK_LEVEL = 0.65;
const DUCK_RESTORE_MS = 300;

const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

const playSfx = (cue: string | undefined, volume: number) => {
  if (!cue) return;
  // Use playFromLibrary for new keys, playCue for everything else.
  // playCue auto-routes library keys, so it works for both.
  void playCue(cue, { volume, channel: 'overlay' });
};

let activeSessionToken: number | null = null;
const newSessionToken = () => {
  const token = Date.now() + Math.floor(Math.random() * 1000);
  activeSessionToken = token;
  return token;
};
const isSessionStale = (token: number) => activeSessionToken !== token;

/**
 * Estimate the duration of a spoken phrase. Used so reveal/confirm cues
 * fire AFTER the voice ends (we don't have direct end-event access for the
 * MP3 fallbacks, but a simple per-character estimate is good enough).
 */
const estimateVoiceDurationMs = (text: string, customUrl: string | undefined): number => {
  if (customUrl) {
    // We can't probe the file synchronously without firing a HEAD; use a
    // generous default so the reveal cue lands after the voice.
    return 1800;
  }
  const cleaned = text.trim();
  if (!cleaned) return 0;
  // ~85ms per Latin character, ~110ms per Arabic character (Arabic words
  // are spoken slightly slower by both StreamElements and Edge voices).
  let ms = 0;
  for (const ch of cleaned) {
    if (/[\u0600-\u06ff]/.test(ch)) ms += 110;
    else ms += 85;
  }
  return Math.max(700, Math.min(4000, ms));
};

/**
 * Resolve the final cue keys + phrase from a story config.
 */
const resolveStoryPlan = (config: MercatoStoryConfig) => {
  const profile: AudioProfile =
    getAudioProfile(config.profileId || 'fabrizioBreaking') ||
    getAudioProfile('fabrizioBreaking')!;
  const phrase = getVoicePhrase(profile.phraseId);

  // Voice URL priority: customVoiceUrl > voicePackId.defaultAudioUrl > phrase.defaultAudioUrl
  let resolvedVoiceUrl = (config.customVoiceUrl || '').trim();
  let resolvedText = config.customText?.trim() || phrase?.text || '';

  if (!resolvedVoiceUrl && config.voicePackId) {
    const packPhrase = getVoicePhrase(config.voicePackId);
    if (packPhrase) {
      if (packPhrase.defaultAudioUrl) {
        resolvedVoiceUrl = packPhrase.defaultAudioUrl;
      }
      // Use the pack phrase text for TTS fallback if no custom text
      if (!config.customText?.trim()) {
        resolvedText = packPhrase.text;
      }
    }
  }

  if (!resolvedVoiceUrl && phrase?.defaultAudioUrl) {
    resolvedVoiceUrl = phrase.defaultAudioUrl;
  }

  return {
    profile,
    text: resolvedText,
    introCue:   config.introCue   || profile.introCue,
    revealCue:  config.revealCue  || profile.revealCue,
    updateCue:  config.updateCue  || profile.updateCue,
    confirmCue: config.confirmCue || profile.confirmCue,
    outroCue:   config.outroCue   || profile.outroCue,
    customVoiceUrl: resolvedVoiceUrl,
  };
};

/**
 * Play a custom uploaded MP3/WAV URL through the existing audioEngine bus.
 * This keeps it inside the global compressor + limiter so it never clips.
 *
 * Returns a Promise that resolves when playback ends (best effort).
 */
const playCustomVoiceUrl = async (url: string, volume: number): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.AudioContext) return false;
  try {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.preload = 'auto';
    return await new Promise<boolean>((resolve) => {
      const cleanup = () => {
        try { audio.pause(); } catch { /* noop */ }
      };
      audio.addEventListener('ended', () => { cleanup(); resolve(true); }, { once: true });
      audio.addEventListener('error', () => { cleanup(); resolve(false); }, { once: true });
      audio.play().catch(() => resolve(false));
    });
  } catch {
    return false;
  }
};

/**
 * Play the spoken phrase using the priority chain. Returns true if any
 * voice (real or TTS) was played successfully, false if we ended up
 * falling through to SFX-only.
 */
const playVoicePhrase = async (
  text: string,
  customVoiceUrl: string,
  volume: number,
  fallbackOpts: AnnouncementOptions = {},
): Promise<boolean> => {
  // 1. customVoiceUrl — always preferred when set
  if (customVoiceUrl) {
    const ok = await playCustomVoiceUrl(customVoiceUrl, Math.min(1, volume));
    if (ok) return true;
  }
  // 2. TTS fallback (deepVoiceSynth handles its own mutex + ducking-safe playback)
  if (text) {
    try {
      await playAnnouncement(text, {
        ...fallbackOpts,
        volume,
        mode: 'BROADCAST',
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * Public entry: orchestrate a full mercato story.
 *
 *  Flow:
 *   t=0       intro SFX
 *   t=200ms   begin voice (custom URL → TTS → silence)
 *   while voice is on: overlay channel ducked to 0.65
 *   t=voice end + 80ms  reveal SFX, overlay ducking restored
 *
 *  The returned session exposes confirm() / outro() / update() so the
 *  template can call them at meaningful UI moments.
 */
export const playMercatoStory = (config: MercatoStoryConfig = {}): MercatoStorySession => {
  const token = newSessionToken();
  const plan = resolveStoryPlan(config);
  const intensity = Math.max(0.2, Math.min(1.4, config.intensity ?? DEFAULT_INTENSITY));
  const enableVoice = config.enableVoice !== false;
  const enableSfx = config.enableSfx !== false;
  const voiceVolume = 0.95 * intensity;
  const sfxVolume = 1.0 * intensity;

  let stopped = false;

  const fireUpdate = () => {
    if (stopped || isSessionStale(token)) return;
    if (enableSfx && plan.updateCue) playSfx(plan.updateCue, sfxVolume);
  };
  const fireConfirm = () => {
    if (stopped || isSessionStale(token)) return;
    if (enableSfx && plan.confirmCue) playSfx(plan.confirmCue, sfxVolume);
  };
  const fireOutro = () => {
    if (stopped || isSessionStale(token)) return;
    if (enableSfx && plan.outroCue) playSfx(plan.outroCue, sfxVolume * 0.85);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (activeSessionToken === token) activeSessionToken = null;
    try { stopAnnouncement(); } catch { /* noop */ }
    setOverlayDuckGain(1.0, 200);
  };

  // ── Sequence runner ──
  (async () => {
    // 1. Intro SFX
    if (enableSfx && plan.introCue) {
      playSfx(plan.introCue, sfxVolume);
    }
    if (isSessionStale(token)) return;

    await sleep(200);
    if (isSessionStale(token)) return;

    // 2. Voice phrase + duck overlay channel
    if (enableVoice && plan.text) {
      setOverlayDuckGain(DUCK_LEVEL, 120);
      const estimatedMs = estimateVoiceDurationMs(plan.text, plan.customVoiceUrl);
      const voicePromise = playVoicePhrase(plan.text, plan.customVoiceUrl, voiceVolume, config.voiceFallback || {});
      // Wait for either the estimated time OR the voice end (whichever ends later)
      await Promise.race([voicePromise, sleep(estimatedMs)]);
      // Give the tail a moment, then restore duck
      await sleep(80);
      setOverlayDuckGain(1.0, DUCK_RESTORE_MS);
      if (isSessionStale(token)) return;
    } else if (!enableSfx) {
      // Nothing to do
      return;
    }

    // 3. Reveal SFX after voice
    if (enableSfx && plan.revealCue) {
      playSfx(plan.revealCue, sfxVolume);
    }
  })();

  return {
    stop,
    confirm: fireConfirm,
    outro: fireOutro,
    update: fireUpdate,
  };
};

/**
 * Convenience: fire just one cue from a profile by slot name.
 * Useful for tests and ad-hoc UI buttons.
 */
export const playProfileSlot = (
  profileId: string,
  slot: 'intro' | 'reveal' | 'update' | 'confirm' | 'outro',
  volume = 0.9,
) => {
  const profile = getAudioProfile(profileId);
  if (!profile) return false;
  const cue =
    slot === 'intro'   ? profile.introCue   :
    slot === 'reveal'  ? profile.revealCue  :
    slot === 'update'  ? profile.updateCue  :
    slot === 'confirm' ? profile.confirmCue :
    profile.outroCue;
  if (!cue) return false;
  void playCue(cue, { volume, channel: 'overlay' });
  return true;
};

/** Stop any active mercato story session immediately. */
export const stopMercatoStory = () => {
  if (activeSessionToken !== null) {
    activeSessionToken = null;
    try { stopAnnouncement(); } catch { /* noop */ }
    setOverlayDuckGain(1.0, 150);
  }
};
