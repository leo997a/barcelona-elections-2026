import { ELECTION_SOUND_PATTERNS } from '../components/renderers/OverlayConstants';

export type BroadcastSoundPhase = 'ENTRY' | 'TRANSITION' | 'EXIT';

export type SoundCue =
  | 'SCOREBUG_SNAP'
  | 'LOWER_THIRD_WIPE'
  | 'DATA_TICK'
  | 'VAR_BUZZ'
  | 'TACTICAL_PULSE'
  | 'STADIUM_WHOOSH'
  | 'MERCATO_HIT'
  | 'DATA_SLAM'
  | 'BROADCAST_OUT'
  | 'SOFT_FADE'
  | 'LUXURY_STING'
  | 'LUXURY_SWEEP'
  | 'LUXURY_IMPACT'
  | 'LUXURY_OUT'
  | 'GOAL_HORN'
  | 'BREAKING_NEWS_ALARM'
  | 'PLAYER_ENTRANCE'
  | 'COUNTDOWN_BEEP'
  | 'CARD_FLASH'
  | 'CROWD_ROAR'
  | 'WHISTLE'
  | 'HARD_CUT'
  | 'BEFORE_THE_KICKOFF'
  | 'TRANSFER_RISER'
  | 'DEADLINE_ALARM'
  | 'HERE_WE_GO_STING'
  | 'CONTRACT_STAMP'
  | 'AGENT_CALL'
  | 'CASH_REGISTER'
  | 'MEDICAL_PASS'
  | 'RUMOUR_GLITCH'
  | 'DEAL_LOCK'
  | 'ULTRA_RISER'
  | 'CLUB_REVEAL'
  | 'PHOTO_FLASH'
  | 'NEWS_STING'
  | 'ELITE_HIT'
  | 'TACTICAL_LOCK'
  | 'CINEMA_BOOM'
  | 'CROWD_RISE'
  | 'RESULTS_STING'
  | 'QUOTE_SWEEP'
  | 'VERSUS_IMPACT'
  | string;

type PlayCueOptions = {
  volume?: number;
  allowFile?: boolean;
  forceSynth?: boolean;
  loop?: boolean;
  loopStart?: number;
  loopEnd?: number;
};

type AudioGraph = {
  context: AudioContext;
  masterGain: GainNode;
  compressor: DynamicsCompressorNode;
  limiter: DynamicsCompressorNode;
};

// Per-cue reverb/subBass intensity config (0 = off, 1 = full)
const CUE_FX_CONFIG: Record<string, { reverb: number; subBass: number }> = {
  GOAL_HORN:           { reverb: 0.28, subBass: 1.0 },
  BREAKING_NEWS_ALARM: { reverb: 0.22, subBass: 0.72 },
  MERCATO_HIT:         { reverb: 0.24, subBass: 1.0 },
  ELITE_HIT:           { reverb: 0.24, subBass: 1.0 },
  CINEMA_BOOM:         { reverb: 0.32, subBass: 1.2 },
  HERE_WE_GO_STING:    { reverb: 0.26, subBass: 1.1 },
  DEAL_LOCK:           { reverb: 0.26, subBass: 1.1 },
  CONTRACT_STAMP:      { reverb: 0.20, subBass: 1.1 },
  DATA_SLAM:           { reverb: 0.14, subBass: 0.72 },
  TRANSFER_RISER:      { reverb: 0.22, subBass: 0.68 },
  CLUB_REVEAL:         { reverb: 0.22, subBass: 0.68 },
  STADIUM_WHOOSH:      { reverb: 0.22, subBass: 0.68 },
  LUXURY_SWEEP:        { reverb: 0.22, subBass: 0.68 },
  SCOREBUG_SNAP:       { reverb: 0.10, subBass: 0.42 },
  DATA_TICK:           { reverb: 0.08, subBass: 0.30 },
  LUXURY_OUT:          { reverb: 0.06, subBass: 0.0 },
  BROADCAST_OUT:       { reverb: 0.06, subBass: 0.0 },
  SOFT_FADE:           { reverb: 0.04, subBass: 0.0 },
  LOWER_THIRD_WIPE:    { reverb: 0.10, subBass: 0.0 },
  PLAYER_ENTRANCE:     { reverb: 0.18, subBass: 0.50 },
  ULTRA_RISER:         { reverb: 0.20, subBass: 0.80 },
  CASH_REGISTER:       { reverb: 0.16, subBass: 0.60 },
};

// Read per-cue FX overrides from localStorage (set by BroadcastControl UI)
// Falls back to CUE_FX_CONFIG defaults if no override or parse error
const FX_STORAGE_KEY = 'rge_cue_fx_v1';
let _fxOverridesCache: Record<string, { reverb: number; subBass: number }> | null = null;
let _fxCacheTs = 0;

const loadFxOverrides = (): Record<string, { reverb: number; subBass: number }> => {
  // Cache for 2 seconds to avoid reading localStorage on every cue play
  const now = Date.now();
  if (_fxOverridesCache && now - _fxCacheTs < 2000) return _fxOverridesCache;
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(FX_STORAGE_KEY);
    if (!raw) { _fxOverridesCache = {}; _fxCacheTs = now; return {}; }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) { _fxOverridesCache = {}; _fxCacheTs = now; return {}; }
    _fxOverridesCache = parsed;
    _fxCacheTs = now;
    return parsed;
  } catch { _fxOverridesCache = {}; _fxCacheTs = now; return {}; }
};

const getCueFx = (cue: string): { reverb: number; subBass: number } => {
  const defaults = CUE_FX_CONFIG[cue] || { reverb: 0.12, subBass: 0.0 };
  const overrides = loadFxOverrides();
  const ov = overrides[cue];
  if (!ov || typeof ov.reverb !== 'number' || typeof ov.subBass !== 'number') return defaults;
  return { reverb: Math.max(0, Math.min(ov.reverb, 1)), subBass: Math.max(0, Math.min(ov.subBass, 1.5)) };
};

/** Force invalidate FX cache (called after slider change) */
export const invalidateCueFxCache = () => { _fxOverridesCache = null; _fxCacheTs = 0; };

/**
 * Cues available for preview in the control panel.
 *
 * This list is intentionally curated to ~12 broadcast-grade entries with
 * meaningful labels for editors. The underlying SoundCue keys are *not*
 * removed — saved overlays that reference legacy cue names still play
 * correctly through playCue. We just hide the long catalog from the
 * sounds picker so it doesn't feel cluttered or repetitive.
 */
export const PREVIEWABLE_CUES: { value: string; label: string; category: string }[] = [
  // News / breaking — short, clean, broadcast-style
  { value: 'BREAKING_RISER',    label: 'News Opener — افتتاحية خبر',         category: 'news' },
  { value: 'BREAKING_HIT',      label: 'Breaking Hit — ضربة الخبر العاجل',   category: 'news' },
  { value: 'OFFICIAL_STAMP',    label: 'Official Stamp — ختم رسمي',          category: 'news' },
  { value: 'HERE_WE_GO_STING',  label: 'Here We Go Boom — إعلان الصفقة',     category: 'news' },

  // Mercato / transfers
  { value: 'DEAL_LOCK',         label: 'Transfer Lock — قفل الصفقة',         category: 'mercato' },
  { value: 'TARGET_REVEAL',     label: 'Target Reveal — كشف الهدف',          category: 'mercato' },
  { value: 'TARGET_SCAN',       label: 'Radar Scan — مسح الرادار',           category: 'mercato' },
  { value: 'DEADLINE_ALARM',    label: 'Deadline Tension — نهاية الميركاتو', category: 'mercato' },

  // Football / studio
  { value: 'STADIUM_WHOOSH',    label: 'Stadium Rise — صعود الجمهور',        category: 'studio' },
  { value: 'LUXURY_SWEEP',      label: 'Tactical Swipe — انتقال تكتيكي',     category: 'studio' },
  { value: 'LOWER_THIRD_WIPE',  label: 'Soft Lower Third — تعريف ناعم',      category: 'studio' },
  { value: 'CONTRACT_STAMP',    label: 'Final Confirm — تأكيد نهائي',        category: 'studio' },
];

const CUE_TO_FILE_MAP: Partial<Record<string, string>> = {
  SCOREBUG_SNAP: '/sounds/show/scoreboard_in.mp3',
  LOWER_THIRD_WIPE: '/sounds/show/lower_third_in.mp3',
  MERCATO_HIT: '/sounds/show/transfer_hit.mp3',
  DATA_SLAM: '/sounds/show/player_stats_data.mp3',
  BROADCAST_OUT: '/sounds/hide/whoosh_out.mp3',
  SOFT_FADE: '/sounds/hide/fade_out.mp3',
  GOAL_HORN: '/sounds/special/goal_horn.mp3',
  BREAKING_NEWS_ALARM: '/sounds/special/breaking_news.mp3',
  BEFORE_THE_KICKOFF: '/sounds/before_the_kickoff.mp3',
};

const PRELOAD_CUES: SoundCue[] = [
  'SCOREBUG_SNAP',
  'LOWER_THIRD_WIPE',
  'MERCATO_HIT',
  'DATA_SLAM',
  'BROADCAST_OUT',
  'SOFT_FADE',
  'GOAL_HORN',
  'BREAKING_NEWS_ALARM',
  'BEFORE_THE_KICKOFF',
];

const SOUND_PRIORITY: Record<string, number> = {
  GOAL_HORN: 100,
  BREAKING_NEWS_ALARM: 90,
  LUXURY_SWEEP: 80,
  LUXURY_STING: 80,
  STADIUM_WHOOSH: 75,
  MERCATO_HIT: 70,
  DATA_SLAM: 60,
  SCOREBUG_SNAP: 50,
  PLAYER_ENTRANCE: 50,
  VAR_BUZZ: 45,
  LOWER_THIRD_WIPE: 40,
  TACTICAL_PULSE: 35,
  DATA_TICK: 20,
  BROADCAST_OUT: 15,
  LUXURY_OUT: 15,
  SOFT_FADE: 10,
  HARD_CUT: 0,
};

const DEFAULT_COOLDOWN_MS = 250;
const bufferCache = new Map<string, AudioBuffer>();
const loadingCache = new Map<string, Promise<AudioBuffer | null>>();
const failedUrls = new Set<string>();
const lastPlayedAt = new Map<string, number>();
const activeSources = new Map<string, Set<AudioBufferSourceNode>>();

let graph: AudioGraph | null = null;
let reverbBuffer: AudioBuffer | null = null;
let masterVolume = 1.12;
let activePriority: { cue: string; priority: number; until: number } | null = null;
let unlockPromise: Promise<boolean> | null = null;

const clampVolume = (value = 1) => Math.max(0, Math.min(value, 3));

const getAudioContextCtor = () => {
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
};

const getGraph = (): AudioGraph | null => {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) return null;

  if (!graph || graph.context.state === 'closed') {
    const context = new AudioContextCtor();
    const masterGain = context.createGain();
    const compressor = context.createDynamicsCompressor();

    // Safety Limiter: brick-wall at -1 dB to prevent clipping
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    masterGain.gain.value = masterVolume;
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 4.5;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.18;

    // Chain: masterGain → compressor → limiter → destination
    masterGain.connect(compressor);
    compressor.connect(limiter);
    limiter.connect(context.destination);
    graph = { context, masterGain, compressor, limiter };

    // Generate impulse-response buffer for reverb
    const irLen = Math.floor(context.sampleRate * 1.4);
    const irBuf = context.createBuffer(2, irLen, context.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        const decay = Math.exp(-3.2 * i / irLen);
        d[i] = (Math.random() * 2 - 1) * decay * 0.35;
      }
    }
    reverbBuffer = irBuf;
  }

  return graph;
};

export const setMasterVolume = (volume: number) => {
  masterVolume = Math.max(0, Math.min(volume, 1.5));
  if (graph) {
    graph.masterGain.gain.setTargetAtTime(masterVolume, graph.context.currentTime, 0.02);
  }
};

export const getMasterVolume = () => masterVolume;

export const unlockAudio = async () => {
  if (unlockPromise) return unlockPromise;

  unlockPromise = (async () => {
    const audioGraph = getGraph();
    if (!audioGraph) return false;

    try {
      if (audioGraph.context.state === 'suspended') {
        await audioGraph.context.resume();
      }
      void preloadSounds();
      return true;
    } catch {
      return false;
    }
  })();

  return unlockPromise;
};

export const preloadSounds = async (cues: SoundCue[] = PRELOAD_CUES) => {
  const audioGraph = getGraph();
  if (!audioGraph) return;

  await Promise.all(
    cues.map(async cue => {
      const url = CUE_TO_FILE_MAP[cue];
      if (!url) return;
      await loadAudioBuffer(url);
    })
  );
};

const loadAudioBuffer = async (url: string): Promise<AudioBuffer | null> => {
  const audioGraph = getGraph();
  if (!audioGraph || failedUrls.has(url)) return null;

  const cached = bufferCache.get(url);
  if (cached) return cached;

  const existing = loadingCache.get(url);
  if (existing) return existing;

  const loading = (async () => {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Sound file not available: ${url}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioGraph.context.decodeAudioData(arrayBuffer.slice(0));
      bufferCache.set(url, buffer);
      return buffer;
    } catch {
      failedUrls.add(url);
      return null;
    } finally {
      loadingCache.delete(url);
    }
  })();

  loadingCache.set(url, loading);
  return loading;
};

const canPlayCue = (cue: string) => {
  if (cue === 'HARD_CUT') return true;

  const now = Date.now();
  const lastPlayed = lastPlayedAt.get(cue) ?? 0;
  if (now - lastPlayed < DEFAULT_COOLDOWN_MS) return false;

  const priority = SOUND_PRIORITY[cue] ?? 35;
  if (activePriority && activePriority.until > now && priority < activePriority.priority) {
    return false;
  }

  return true;
};

const markCueActive = (cue: string, durationMs: number) => {
  const now = Date.now();
  lastPlayedAt.set(cue, now);
  activePriority = {
    cue,
    priority: SOUND_PRIORITY[cue] ?? 35,
    until: now + Math.max(durationMs, DEFAULT_COOLDOWN_MS),
  };
};

const createNoiseBuffer = (context: AudioContext, duration: number) => {
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const fade = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * fade;
  }
  return buffer;
};

const trackSource = (cue: string, source: AudioBufferSourceNode) => {
  const sources = activeSources.get(cue) ?? new Set<AudioBufferSourceNode>();
  sources.add(source);
  activeSources.set(cue, sources);
  source.onended = () => {
    sources.delete(source);
    if (sources.size === 0) activeSources.delete(cue);
  };
};

export const stopCue = (cue: SoundCue, fadeOutMs = 120) => {
  const audioGraph = getGraph();
  const sources = activeSources.get(cue);
  if (!audioGraph || !sources) return;

  window.setTimeout(() => {
    sources.forEach(source => {
      try {
        source.stop();
      } catch {
        /* source may already be stopped */
      }
    });
    activeSources.delete(cue);
  }, Math.max(0, fadeOutMs));
};

const playFileCue = async (cue: string, options: PlayCueOptions) => {
  const audioGraph = getGraph();
  const url = CUE_TO_FILE_MAP[cue];
  if (!audioGraph || !url) return false;

  const buffer = await loadAudioBuffer(url);
  if (!buffer) return false;

  const now = audioGraph.context.currentTime;
  const source = audioGraph.context.createBufferSource();
  const gain = audioGraph.context.createGain();
  const volume = clampVolume(options.volume);
  const offset = Math.max(0, options.loopStart ?? 0);

  source.buffer = buffer;
  source.loop = Boolean(options.loop);
  if (options.loopStart !== undefined) source.loopStart = Math.max(0, options.loopStart);
  if (options.loopEnd !== undefined) source.loopEnd = Math.min(buffer.duration, options.loopEnd);

  gain.gain.setValueAtTime(Math.min(volume, 1) * 0.82, now);
  source.connect(gain);
  gain.connect(audioGraph.masterGain);
  trackSource(cue, source);
  source.start(now, Math.min(offset, Math.max(0, buffer.duration - 0.05)));

  markCueActive(cue, options.loop ? 1200 : Math.min(buffer.duration * 1000, 1800));
  return true;
};

const connectTimedGain = (context: AudioContext, duration: number, volume: number) => {
  const gain = context.createGain();
  const now = context.currentTime;
  gain.gain.setValueAtTime(clampVolume(volume) * 0.82, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  return gain;
};

const playLuxurySynth = (cue: string, volume: number) => {
  const audioGraph = getGraph();
  if (!audioGraph) return false;

  const context = audioGraph.context;
  const now = context.currentTime;
  const fx = getCueFx(cue);
  const master = connectTimedGain(context, 2.2, volume);

  // Per-cue reverb send
  if (reverbBuffer && fx.reverb > 0) {
    const convolver = context.createConvolver();
    convolver.buffer = reverbBuffer;
    const reverbGain = context.createGain();
    reverbGain.gain.setValueAtTime(fx.reverb, now);
    master.connect(reverbGain);
    reverbGain.connect(convolver);
    convolver.connect(audioGraph.masterGain);
  }
  master.connect(audioGraph.masterGain);

  const hit = (start: number, frequency: number, duration: number, gainValue: number, type: OscillatorType = 'sine') => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * 0.52), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue * 1.15, start + 0.008);
    gain.gain.setValueAtTime(gainValue * 0.9, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + 0.06);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.1);
  };

  // Sub-bass layer scaled by per-cue config
  const subBass = (start: number, frequency: number, duration: number, gainValue: number) => {
    if (fx.subBass <= 0) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.6), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue * fx.subBass, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  };

  const shimmer = (start: number, base: number, duration: number, gainValue: number) => {
    [1, 1.5, 2, 2.5, 3, 4].forEach((ratio, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const pan = context.createStereoPanner();
      osc.type = index % 3 === 0 ? 'sine' : index % 3 === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(base * ratio, start);
      osc.detune.setValueAtTime(index * 7 - 12, start);
      const panVal = (index % 2 ? 1 : -1) * (0.25 + index * 0.08);
      pan.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal)), start);
      const layerGain = gainValue / (index * 0.6 + 1);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(layerGain, start + 0.025 + index * 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + 0.08);
      osc.connect(gain);
      gain.connect(pan);
      pan.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.12);
    });
  };

  const sweep = (start: number, duration: number, from: number, to: number, gainValue: number, type: BiquadFilterType) => {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = createNoiseBuffer(context, duration);
    filter.type = type;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    filter.Q.setValueAtTime(0.75, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.02);
  };

  if (cue === 'GOAL_HORN') {
    subBass(now, 30, 0.9, 0.95);
    hit(now, 55, 0.82, 1.2, 'sawtooth');
    hit(now + 0.12, 82, 0.68, 0.92, 'sawtooth');
    hit(now + 0.28, 110, 0.42, 0.55, 'sawtooth');
    shimmer(now + 0.06, 220, 1.0, 0.32);
    sweep(now, 1.1, 180, 5200, 0.34, 'lowpass');
    sweep(now + 0.15, 0.7, 800, 3600, 0.18, 'bandpass');
  } else if (cue === 'BREAKING_NEWS_ALARM') {
    subBass(now, 40, 0.5, 0.72);
    [0, 0.14, 0.28, 0.42].forEach(delay => hit(now + delay, 880, 0.14, 0.56, 'square'));
    hit(now, 68, 0.52, 0.78);
    shimmer(now + 0.06, 440, 0.4, 0.18);
    sweep(now, 0.6, 3200, 460, 0.24, 'bandpass');
  } else if (cue === 'PLAYER_ENTRANCE') {
    hit(now, 48, 0.42, 0.72);
    shimmer(now + 0.06, 260, 0.52, 0.22);
    sweep(now, 0.48, 220, 4200, 0.2, 'highpass');
  } else if (cue === 'COUNTDOWN_BEEP') {
    hit(now, 1040, 0.12, 0.38, 'square');
  } else if (cue === 'CARD_FLASH') {
    hit(now, 180, 0.16, 0.48, 'square');
    hit(now + 0.035, 920, 0.08, 0.3, 'square');
  } else if (cue === 'MERCATO_HIT' || cue === 'ELITE_HIT') {
    subBass(now, 28, 0.6, 1.0);
    hit(now, 42, 0.52, 1.25);
    hit(now + 0.03, 118, 0.22, 0.58);
    hit(now + 0.12, 196, 0.16, 0.38, 'triangle');
    shimmer(now + 0.06, 260, 0.72, 0.36);
    sweep(now + 0.015, 0.62, 2200, 160, 0.38, 'bandpass');
    sweep(now + 0.1, 0.68, 360, 5200, 0.28, 'highpass');
  } else if (cue === 'TRANSFER_RISER' || cue === 'CLUB_REVEAL' || cue === 'STADIUM_WHOOSH' || cue === 'LUXURY_SWEEP') {
    subBass(now, 36, 0.52, 0.68);
    hit(now, 56, 0.52, 0.78);
    hit(now + 0.14, 92, 0.28, 0.42, 'triangle');
    shimmer(now + 0.03, 240, 0.88, 0.32);
    sweep(now, 0.82, 260, 6200, 0.34, 'highpass');
    sweep(now + 0.2, 0.5, 1200, 380, 0.16, 'bandpass');
  } else if (cue === 'DEADLINE_ALARM' || cue === 'PHOTO_FLASH' || cue === 'NEWS_STING' || cue === 'TACTICAL_LOCK') {
    hit(now, cue === 'PHOTO_FLASH' ? 920 : 86, 0.22, 0.66);
    hit(now + 0.09, cue === 'DEADLINE_ALARM' ? 780 : 180, 0.14, 0.42);
    shimmer(now + 0.05, cue === 'NEWS_STING' ? 520 : 360, 0.36, 0.22);
    sweep(now + 0.01, 0.3, 3400, 520, 0.18, 'bandpass');
  } else if (cue === 'CINEMA_BOOM') {
    subBass(now, 22, 0.85, 1.2);
    hit(now, 34, 0.82, 1.3);
    hit(now + 0.04, 72, 0.48, 0.62);
    hit(now + 0.12, 142, 0.28, 0.35, 'triangle');
    shimmer(now + 0.08, 180, 0.6, 0.18);
    sweep(now, 0.92, 140, 2800, 0.32, 'lowpass');
    sweep(now + 0.1, 0.6, 600, 3400, 0.2, 'bandpass');
  } else if (cue === 'DATA_SLAM') {
    subBass(now, 45, 0.32, 0.72);
    hit(now, 90, 0.24, 0.85);
    hit(now + 0.06, 140, 0.16, 0.62);
    hit(now + 0.12, 220, 0.1, 0.38, 'square');
    shimmer(now + 0.04, 620, 0.38, 0.34);
    sweep(now + 0.008, 0.32, 3600, 380, 0.26, 'bandpass');
  } else if (cue === 'HERE_WE_GO_STING' || cue === 'DEAL_LOCK' || cue === 'CONTRACT_STAMP') {
    subBass(now, 26, 0.65, 1.1);
    hit(now, 38, 0.68, 1.35);
    hit(now + 0.03, 86, 0.36, 0.88);
    hit(now + 0.15, cue === 'CONTRACT_STAMP' ? 132 : 176, 0.22, 0.68);
    hit(now + 0.32, 264, 0.14, 0.42, 'triangle');
    shimmer(now + 0.06, 330, 0.82, 0.4);
    sweep(now, 0.62, 2800, 140, 0.4, 'bandpass');
    sweep(now + 0.18, 0.48, 480, 4200, 0.22, 'highpass');
  } else if (cue === 'AGENT_CALL' || cue === 'RUMOUR_GLITCH' || cue === 'MEDICAL_PASS') {
    hit(now, cue === 'MEDICAL_PASS' ? 64 : 112, 0.28, 0.78);
    hit(now + 0.1, cue === 'RUMOUR_GLITCH' ? 920 : 440, 0.12, 0.42);
    hit(now + 0.18, cue === 'RUMOUR_GLITCH' ? 620 : 660, 0.1, 0.34);
    shimmer(now + 0.08, cue === 'AGENT_CALL' ? 520 : 300, 0.42, 0.2);
    sweep(now + 0.01, 0.36, 3600, 300, 0.22, 'bandpass');
  } else if (cue === 'CASH_REGISTER' || cue === 'ULTRA_RISER') {
    hit(now, 44, 0.5, 1.02);
    shimmer(now + 0.04, cue === 'CASH_REGISTER' ? 760 : 240, 0.7, 0.34);
    sweep(now, 0.72, cue === 'ULTRA_RISER' ? 180 : 3400, cue === 'ULTRA_RISER' ? 6200 : 540, 0.36, cue === 'ULTRA_RISER' ? 'highpass' : 'bandpass');
  } else if (cue === 'LUXURY_IMPACT' || cue === 'VAR_BUZZ') {
    hit(now, 52, 0.55, 0.95);
    hit(now + 0.025, 104, 0.22, 0.35);
    shimmer(now + 0.08, 196, 0.58, 0.18);
    sweep(now + 0.02, 0.46, 1800, 180, 0.22, 'bandpass');
  } else if (cue === 'LUXURY_OUT' || cue === 'BROADCAST_OUT' || cue === 'SOFT_FADE') {
    hit(now, 110, 0.52, 0.42);
    hit(now + 0.06, 72, 0.38, 0.22);
    shimmer(now, 330, 0.52, 0.16);
    sweep(now, 0.56, 900, 100, 0.18, 'lowpass');
  } else if (cue === 'SCOREBUG_SNAP' || cue === 'DATA_TICK') {
    subBass(now, 50, 0.18, 0.42);
    hit(now, 72, 0.38, 0.65);
    hit(now + 0.04, 180, 0.12, 0.32, 'square');
    shimmer(now + 0.02, 440, 0.42, 0.22);
    sweep(now + 0.004, 0.28, 2600, 580, 0.18, 'bandpass');
  } else {
    hit(now, 58, 0.62, 0.62);
    shimmer(now + 0.06, 220, 0.72, 0.18);
    sweep(now, 0.62, 420, 4200, 0.2, 'highpass');
    sweep(now + 0.16, 0.52, 3600, 520, 0.14, 'bandpass');
  }

  window.setTimeout(() => {
    try {
      master.disconnect();
    } catch {
      /* no-op */
    }
  }, 2800);

  markCueActive(cue, 1200);
  return true;
};

const playPatternSynth = (cue: string, volume: number) => {
  const audioGraph = getGraph();
  if (!audioGraph) return false;

  const pattern = ELECTION_SOUND_PATTERNS[cue] || ELECTION_SOUND_PATTERNS.RESULTS_STING;
  const now = audioGraph.context.currentTime;
  const master = audioGraph.context.createGain();
  master.connect(audioGraph.masterGain);
  master.gain.setValueAtTime(clampVolume(volume) * 0.28, now);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

  pattern.forEach(step => {
    const oscillator = audioGraph.context.createOscillator();
    const gain = audioGraph.context.createGain();
    const startAt = now + step.delay;
    const endAt = startAt + step.duration;

    oscillator.type = step.waveform;
    oscillator.frequency.setValueAtTime(step.frequency, startAt);
    if (step.toFrequency) oscillator.frequency.exponentialRampToValueAtTime(step.toFrequency, endAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(step.gain, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.03);
  });

  window.setTimeout(() => {
    try {
      master.disconnect();
    } catch {
      /* no-op */
    }
  }, 1400);

  markCueActive(cue, 900);
  return true;
};

// ─── Broadcast Pro synth ─────────────────────────────────────────────────────
//
//  Higher-quality, channel-grade synthesis for sports / news broadcast cues.
//  Layers used:
//    • Sub bass body (sine, 28-50 Hz) for weight
//    • Body kick (saw + lowpass) for the "punch"
//    • Mid presence layer (triangle/saw) for clarity in small speakers
//    • Air noise sweep through bandpass for "WHOOSH"
//    • Plate-style convolution reverb on a parallel send (per-cue strength)
//    • Soft tape saturation via WaveShaper for warmth (no harsh digital edge)
//
//  Each cue has a per-cue config that maps it to a "shape" (HIT, RISER,
//  PULSE, SWEEP, FANFARE, WHISTLE, CHANT, TICK, REVEAL, GLITCH, DROP).
//
const BROADCAST_PRO_SHAPES_LEGACY: Record<string, string> = {
  // Kept only as a comment reference. Each cue now has its own per-cue
  // recipe inside playBroadcastPro for a unique sonic signature.
};

const buildSaturationCurve = (amount: number): Float32Array => {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amount * 12;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

const playBroadcastPro = (cue: string, volume: number): boolean => {
  const audioGraph = getGraph();
  if (!audioGraph) return false;

  const ctx = audioGraph.context;
  const now = ctx.currentTime;
  const vol = clampVolume(volume);
  const fx = getCueFx(cue);

  // Build a clean per-cue mini-bus
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, now);
  bus.gain.exponentialRampToValueAtTime(vol * 0.92, now + 0.02);
  bus.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

  // Tape saturation for warmth
  const saturator = ctx.createWaveShaper();
  saturator.curve = buildSaturationCurve(0.35);
  saturator.oversample = '2x';

  // Presence boost (mid-high clarity, around 2.4 kHz)
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2400;
  presence.Q.value = 1.1;
  presence.gain.value = 3.5;

  // Low-shelf for warm body
  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 220;
  lowShelf.gain.value = 4;

  bus.connect(saturator);
  saturator.connect(lowShelf);
  lowShelf.connect(presence);
  presence.connect(audioGraph.masterGain);

  // Plate reverb send (per-cue)
  if (reverbBuffer && fx.reverb > 0) {
    const convolver = ctx.createConvolver();
    convolver.buffer = reverbBuffer;
    const sendGain = ctx.createGain();
    sendGain.gain.setValueAtTime(fx.reverb * 0.85, now);
    presence.connect(sendGain);
    sendGain.connect(convolver);
    convolver.connect(audioGraph.masterGain);
  }

  // Helper voicings for shapes
  const tone = (start: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', toFreq?: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (toFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.setValueAtTime(gain * 0.85, start + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(start);
    osc.stop(start + dur + 0.06);
  };

  const sub = (start: number, freq: number, dur: number, gain: number) => {
    if (fx.subBass <= 0 && gain < 0.6) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(18, freq * 0.6), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain * Math.max(0.45, fx.subBass), start + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(start);
    osc.stop(start + dur + 0.06);
  };

  const noiseSweep = (start: number, dur: number, fromHz: number, toHz: number, gain: number, q = 0.9) => {
    const buf = createNoiseBuffer(ctx, dur);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.Q.value = q;
    flt.frequency.setValueAtTime(fromHz, start);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(bus);
    src.start(start);
    src.stop(start + dur + 0.05);
  };

  // ── Per-cue sound recipes — each cue has a unique sonic signature ──────
  switch (cue) {
    // ─── BREAKING / NEWS family ─────────────────────────────────────
    case 'BREAKING_HIT':
      // Heavy news impact — short and punchy
      sub(now, 32, 0.4, 1.1);
      tone(now, 56, 0.28, 0.92, 'sawtooth', 38);
      tone(now + 0.04, 142, 0.22, 0.42, 'triangle', 90);
      tone(now + 0.18, 540, 0.42, 0.28, 'sine', 320);
      noiseSweep(now, 0.42, 2200, 220, 0.36, 0.85);
      break;
    case 'BREAKING_RISER':
      // Slow tense rise into a hit
      sub(now, 36, 0.95, 0.62);
      tone(now, 64, 0.85, 0.42, 'sawtooth', 220);
      tone(now + 0.25, 180, 0.65, 0.36, 'triangle', 880);
      tone(now + 0.55, 880, 0.42, 0.4, 'sine', 1480);
      noiseSweep(now, 1.05, 180, 5200, 0.36, 0.62);
      // Final hit
      sub(now + 0.95, 38, 0.3, 0.95);
      tone(now + 0.95, 64, 0.18, 0.7, 'sawtooth', 32);
      break;
    case 'BREAKING_PULSE':
      // 4 quick alarm pulses + sub drop
      [0, 0.14, 0.28, 0.42].forEach(d => {
        tone(now + d, 880, 0.07, 0.5, 'square');
        tone(now + d, 1320, 0.07, 0.18, 'sine');
      });
      sub(now + 0.55, 50, 0.4, 0.7);
      noiseSweep(now + 0.5, 0.45, 2800, 480, 0.22, 0.8);
      break;
    case 'BREAKING_WHOOSH':
      // Long air whoosh into a low thud
      sub(now + 0.7, 60, 0.35, 0.85);
      tone(now + 0.7, 96, 0.25, 0.62, 'sawtooth', 50);
      noiseSweep(now, 0.95, 4800, 280, 0.5, 0.7);
      noiseSweep(now + 0.18, 0.6, 320, 3200, 0.22, 0.85);
      break;
    case 'OFFICIAL_STAMP':
      // Two-stage thud — like a stamp being pressed
      sub(now, 42, 0.18, 0.95);
      tone(now, 110, 0.12, 0.78, 'square', 70);
      // gap, then deeper second stamp
      sub(now + 0.22, 32, 0.35, 1.15);
      tone(now + 0.22, 84, 0.22, 0.85, 'sawtooth', 50);
      noiseSweep(now + 0.22, 0.45, 1600, 240, 0.28, 0.8);
      break;
    case 'IMPORTANT_PING':
      // Two-tone bell ping (high-low)
      tone(now, 1480, 0.12, 0.5, 'sine');
      tone(now, 2960, 0.12, 0.18, 'triangle');
      tone(now + 0.18, 880, 0.32, 0.42, 'sine');
      tone(now + 0.18, 1760, 0.32, 0.16, 'triangle');
      sub(now + 0.18, 110, 0.3, 0.32);
      break;
    case 'NEWS_TICKER':
      // Three short clicks
      [0, 0.08, 0.16].forEach((d, i) => {
        tone(now + d, 980 - i * 80, 0.045, 0.32, 'square');
      });
      break;

    // ─── MERCATO / TRANSFER family ──────────────────────────────────
    case 'TARGET_REVEAL':
      // Soft rise + crystal ping (the "discovery" sound)
      tone(now, 220, 0.18, 0.32, 'triangle', 440);
      tone(now + 0.16, 660, 0.22, 0.42, 'sine', 880);
      tone(now + 0.34, 1320, 0.32, 0.36, 'sine', 1760);
      sub(now + 0.34, 88, 0.32, 0.42);
      noiseSweep(now, 0.5, 880, 4800, 0.18, 0.95);
      break;
    case 'TARGET_LOCK':
      // 2 beeps then a deep lock-in thud
      tone(now, 880, 0.07, 0.42, 'square');
      tone(now + 0.12, 1320, 0.07, 0.42, 'square');
      sub(now + 0.32, 48, 0.32, 0.95);
      tone(now + 0.32, 160, 0.18, 0.6, 'sawtooth', 80);
      break;
    case 'TARGET_SCAN':
      // Stepping scanner sweeping up
      [0, 0.08, 0.16, 0.24, 0.32].forEach((d, i) => {
        tone(now + d, 480 + i * 180, 0.06, 0.32, 'square');
      });
      tone(now + 0.42, 1480, 0.18, 0.36, 'triangle');
      noiseSweep(now, 0.5, 320, 2400, 0.14, 1.0);
      break;
    case 'POSITION_SWITCH':
      // Quick swoosh + low whoosh — for transitions between positions
      tone(now, 220, 0.14, 0.32, 'sawtooth', 540);
      tone(now + 0.08, 540, 0.18, 0.36, 'triangle', 880);
      sub(now, 70, 0.34, 0.55);
      noiseSweep(now, 0.42, 1200, 4800, 0.22, 0.9);
      break;
    case 'SCOUT_BEEP':
      // Quick sonar-style beep
      tone(now, 720, 0.08, 0.28, 'sine');
      tone(now + 0.14, 1080, 0.1, 0.32, 'sine');
      break;
    case 'TRANSFER_REVEAL':
      // Big transfer announcement — riser + horn-like fanfare
      sub(now, 50, 0.6, 0.85);
      tone(now, 80, 0.5, 0.7, 'sawtooth', 60);
      tone(now + 0.2, 220, 0.45, 0.5, 'triangle', 480);
      tone(now + 0.4, 660, 0.4, 0.45, 'sine', 1080);
      tone(now + 0.6, 880, 0.35, 0.42, 'square');
      tone(now + 0.6, 1320, 0.35, 0.28, 'sawtooth');
      noiseSweep(now, 0.85, 320, 5200, 0.32, 0.78);
      break;

    // ─── FOOTBALL / STADIUM family ──────────────────────────────────
    case 'GOAL_FANFARE':
      // Huge stadium goal celebration
      sub(now, 48, 1.1, 0.85);
      tone(now, 220, 0.22, 0.62, 'square');
      tone(now + 0.22, 330, 0.22, 0.62, 'square');
      tone(now + 0.44, 440, 0.45, 0.7, 'square');
      tone(now + 0.44, 660, 0.45, 0.5, 'sawtooth');
      noiseSweep(now + 0.7, 0.6, 480, 3600, 0.22, 0.78);
      break;
    case 'STADIUM_CHEER':
      // Wave of crowd noise (sustained, no melody)
      sub(now, 42, 1.4, 0.5);
      noiseSweep(now, 1.4, 200, 600, 0.45, 0.5);
      noiseSweep(now + 0.2, 1.2, 800, 2200, 0.32, 0.55);
      noiseSweep(now + 0.4, 1.0, 2200, 4800, 0.18, 0.6);
      break;
    case 'STADIUM_CHANT':
      // 4-beat ultra chant pattern
      sub(now, 60, 1.4, 0.42);
      [0, 0.36, 0.72, 1.08].forEach((d, i) => {
        tone(now + d, 220, 0.28, 0.5, 'sawtooth');
        tone(now + d, 330, 0.28, 0.32, 'triangle');
      });
      noiseSweep(now, 1.4, 240, 1400, 0.2, 0.65);
      break;
    case 'WHISTLE_SHORT':
      tone(now, 2400, 0.16, 0.55, 'sine', 2480);
      tone(now, 4800, 0.16, 0.18, 'triangle', 4960);
      noiseSweep(now, 0.16, 2200, 2700, 0.1, 1.4);
      break;
    case 'WHISTLE_LONG':
      tone(now, 2400, 0.85, 0.6, 'sine', 2520);
      tone(now, 4800, 0.85, 0.18, 'triangle', 5040);
      noiseSweep(now, 0.85, 2200, 2700, 0.1, 1.4);
      break;
    case 'KICKOFF_HORN':
      // Two-blast ship horn for kickoff
      sub(now, 55, 0.4, 0.7);
      tone(now, 110, 0.32, 0.7, 'sawtooth');
      tone(now, 220, 0.32, 0.45, 'sawtooth');
      // gap then second blast (different pitch)
      sub(now + 0.45, 50, 0.42, 0.7);
      tone(now + 0.45, 165, 0.42, 0.65, 'sawtooth');
      tone(now + 0.45, 330, 0.42, 0.42, 'sawtooth');
      break;
    case 'PA_ANNOUNCEMENT':
      // 3-tone PA chime (high-mid-low like real airport bells)
      tone(now, 1320, 0.32, 0.45, 'sine');
      tone(now + 0.34, 1080, 0.32, 0.45, 'sine');
      tone(now + 0.68, 880, 0.42, 0.4, 'sine');
      // each with a gentle harmonic
      tone(now, 2640, 0.32, 0.18, 'triangle');
      tone(now + 0.34, 2160, 0.32, 0.18, 'triangle');
      tone(now + 0.68, 1760, 0.42, 0.16, 'triangle');
      break;
    case 'TROPHY_FANFARE':
      // Cinematic trophy fanfare — major chord arpeggio
      sub(now, 55, 1.4, 0.55);
      // C-major triad ascending
      tone(now, 261, 0.18, 0.5, 'square');
      tone(now + 0.16, 329, 0.18, 0.5, 'square');
      tone(now + 0.32, 392, 0.32, 0.55, 'square');
      tone(now + 0.62, 523, 0.55, 0.62, 'square');
      // brass-style harmony
      tone(now + 0.32, 196, 0.42, 0.32, 'sawtooth');
      tone(now + 0.62, 261, 0.55, 0.36, 'sawtooth');
      noiseSweep(now + 0.85, 0.55, 480, 4200, 0.18, 0.8);
      break;

    // ─── CINEMATIC family ───────────────────────────────────────────
    case 'CINEMATIC_DROP':
      // Inception-style brrrrm — the iconic deep drop
      sub(now, 220, 0.45, 0.95);
      tone(now, 440, 0.4, 0.62, 'sawtooth', 32);
      tone(now + 0.2, 220, 0.55, 0.42, 'triangle', 50);
      sub(now + 0.45, 30, 0.85, 1.2);
      noiseSweep(now, 0.65, 5200, 180, 0.5, 0.65);
      break;
    case 'CINEMATIC_RISE':
      // Long cinematic riser
      sub(now, 50, 1.4, 0.55);
      tone(now, 70, 1.0, 0.45, 'sawtooth', 240);
      tone(now + 0.3, 220, 0.85, 0.42, 'triangle', 880);
      tone(now + 0.7, 880, 0.6, 0.4, 'sine', 1480);
      noiseSweep(now, 1.4, 220, 6800, 0.45, 0.62);
      break;
    case 'IMPACT_BOOM':
      // Earth-shaking boom
      sub(now, 28, 0.6, 1.3);
      tone(now, 38, 0.45, 1.05, 'sawtooth', 22);
      tone(now + 0.04, 76, 0.32, 0.65, 'triangle');
      tone(now + 0.18, 220, 0.5, 0.32, 'sine', 110);
      noiseSweep(now, 0.7, 1800, 120, 0.45, 0.78);
      break;
    case 'GLITCH_TRANSITION':
      // Digital chirps that scramble
      [0, 0.06, 0.13, 0.2, 0.27, 0.34].forEach((d, i) => {
        const f = [620, 280, 980, 220, 540, 1280][i];
        tone(now + d, f, 0.04, 0.42, 'square');
      });
      noiseSweep(now + 0.4, 0.22, 460, 240, 0.3, 1.2);
      tone(now + 0.4, 60, 0.18, 0.5, 'sawtooth', 38);
      break;
    case 'DIGITAL_SWEEP':
      // Smooth digital high-to-low sweep
      tone(now, 4800, 0.5, 0.42, 'sawtooth', 240);
      tone(now + 0.1, 2400, 0.45, 0.36, 'triangle', 320);
      sub(now + 0.4, 60, 0.4, 0.5);
      noiseSweep(now, 0.6, 6800, 320, 0.32, 0.7);
      break;
    case 'MAGIC_REVEAL':
      // Sparkle ascending bells
      [0, 0.12, 0.25, 0.4, 0.55].forEach((d, i) => {
        const f = [660, 880, 1320, 1760, 2640][i];
        tone(now + d, f, 0.32, 0.34, 'sine');
        tone(now + d, f * 1.5, 0.32, 0.14, 'triangle');
      });
      sub(now + 0.6, 110, 0.4, 0.36);
      break;
    case 'SUSPENSE_RISE':
      // Slow tension build, no pay-off
      sub(now, 50, 1.6, 0.7);
      tone(now, 80, 1.4, 0.45, 'sine', 220);
      tone(now + 0.4, 220, 1.2, 0.32, 'triangle', 540);
      noiseSweep(now + 0.4, 1.2, 320, 1800, 0.18, 0.85);
      break;

    // ─── UTILITY family ─────────────────────────────────────────────
    case 'TIMER_TICK':
      // Subtle tick for clocks
      tone(now, 1320, 0.04, 0.22, 'square');
      break;
    case 'COUNTDOWN_FINAL':
      // 3 short beeps then a long horn
      [0, 0.18, 0.36].forEach(d => {
        tone(now + d, 880, 0.08, 0.42, 'square');
      });
      sub(now + 0.55, 55, 0.55, 0.7);
      tone(now + 0.55, 1320, 0.55, 0.62, 'square');
      tone(now + 0.55, 880, 0.55, 0.42, 'sawtooth');
      break;

    default:
      // Fallback for any unmapped cue
      sub(now, 55, 0.7, 0.5);
      tone(now, 220, 0.5, 0.4, 'triangle', 660);
      noiseSweep(now, 0.7, 320, 3200, 0.22, 0.8);
  }

  window.setTimeout(() => {
    try { bus.disconnect(); } catch { /* noop */ }
  }, 3200);

  markCueActive(cue, 1400);
  return true;
};

const playSynthCue = (cue: string, volume: number) => {
  if (cue === 'HARD_CUT') {
    markCueActive(cue, DEFAULT_COOLDOWN_MS);
    return true;
  }

  const broadcastProCues = new Set([
    'BREAKING_RISER',
    'BREAKING_PULSE',
    'BREAKING_HIT',
    'BREAKING_WHOOSH',
    'OFFICIAL_STAMP',
    'IMPORTANT_PING',
    'NEWS_TICKER',
    'TARGET_REVEAL',
    'TARGET_LOCK',
    'TARGET_SCAN',
    'POSITION_SWITCH',
    'SCOUT_BEEP',
    'TRANSFER_REVEAL',
    'GOAL_FANFARE',
    'STADIUM_CHEER',
    'STADIUM_CHANT',
    'WHISTLE_SHORT',
    'WHISTLE_LONG',
    'KICKOFF_HORN',
    'PA_ANNOUNCEMENT',
    'TROPHY_FANFARE',
    'CINEMATIC_DROP',
    'CINEMATIC_RISE',
    'IMPACT_BOOM',
    'GLITCH_TRANSITION',
    'DIGITAL_SWEEP',
    'MAGIC_REVEAL',
    'SUSPENSE_RISE',
    'TIMER_TICK',
    'COUNTDOWN_FINAL',
  ]);

  if (broadcastProCues.has(cue)) return playBroadcastPro(cue, volume);

  const luxuryCues = new Set([
    'LUXURY_STING',
    'LUXURY_SWEEP',
    'LUXURY_IMPACT',
    'LUXURY_OUT',
    'SCOREBUG_SNAP',
    'DATA_TICK',
    'VAR_BUZZ',
    'BROADCAST_OUT',
    'SOFT_FADE',
    'MERCATO_HIT',
    'TRANSFER_RISER',
    'DEADLINE_ALARM',
    'HERE_WE_GO_STING',
    'CONTRACT_STAMP',
    'AGENT_CALL',
    'CASH_REGISTER',
    'MEDICAL_PASS',
    'RUMOUR_GLITCH',
    'DEAL_LOCK',
    'ULTRA_RISER',
    'CLUB_REVEAL',
    'PHOTO_FLASH',
    'NEWS_STING',
    'ELITE_HIT',
    'TACTICAL_LOCK',
    'CINEMA_BOOM',
    'DATA_SLAM',
    'STADIUM_WHOOSH',
    'GOAL_HORN',
    'BREAKING_NEWS_ALARM',
    'PLAYER_ENTRANCE',
    'COUNTDOWN_BEEP',
    'CARD_FLASH',
  ]);

  if (luxuryCues.has(cue)) return playLuxurySynth(cue, volume);
  return playPatternSynth(cue, volume);
};

export const playCue = async (cue: SoundCue, options: PlayCueOptions = {}) => {
  if (!cue) return false;
  const normalizedCue = String(cue);

  if (!canPlayCue(normalizedCue)) return false;

  const audioGraph = getGraph();
  if (!audioGraph) return false;

  try {
    if (audioGraph.context.state === 'suspended') {
      await audioGraph.context.resume();
    }

    if (!options.forceSynth && options.allowFile !== false) {
      const playedFile = await playFileCue(normalizedCue, options);
      if (playedFile) return true;
    }

    return playSynthCue(normalizedCue, options.volume ?? 1);
  } catch {
    return false;
  }
};

export const playUISound = async (cue: 'UI_CLICK' | 'UI_SUCCESS' | 'UI_ERROR' | 'UI_NOTIFICATION' | 'UI_TOGGLE_ON' | 'UI_TOGGLE_OFF', volume = 0.35) => {
  return playCue(cue, { volume, forceSynth: true });
};
