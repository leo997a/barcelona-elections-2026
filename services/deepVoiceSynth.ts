/**
 * deepVoiceSynth.ts — Studio broadcast announcement voice (rewritten v3).
 *
 *  Goals of this rewrite:
 *
 *   1. NO OVERLAP. A single global mutex ensures only one announcement
 *      runs at a time. Calling playAnnouncement again cancels everything
 *      currently in flight.
 *
 *   2. AUTO LANGUAGE SPLIT. If the spoken text mixes Arabic with Latin,
 *      it is segmented at language boundaries and each segment plays
 *      sequentially through the voice configured for that language.
 *
 *   3. MULTIPLE PROVIDERS. Each voice is fetched from one of:
 *        - microsoftEdge   (high-quality Neural voices via /api/tts proxy)
 *        - streamElements  (free public, decent English)
 *        - googleTranslate (better Arabic than StreamElements)
 *        - customUrl       (user-supplied MP3, ultimate quality)
 *      No silent automatic fallback — if the chosen provider fails, we
 *      stop. No browser TTS sneaking in to ruin the take.
 *
 *   4. BROADCAST BUS. All voices route through the same audio bus
 *      (sub-bass body, low shelf warmth, presence boost, plate reverb,
 *      tape saturation) so they sound like part of the show.
 */

export type VoiceMode = 'BROADCAST' | 'STINGER_ONLY';
export type VoiceProvider = 'microsoftEdge' | 'streamElements' | 'googleTranslate' | 'customUrl';

export type VoiceLane = {
  /** Provider to use for fetching the audio. */
  provider: VoiceProvider;
  /** Provider-specific voice id (e.g. 'Brian', 'ar-SA-HamedNeural', or full URL for customUrl). */
  voiceId: string;
};

export type AnnouncementOptions = {
  mode?: VoiceMode;
  /** Volume multiplier 0..1.4. */
  volume?: number;
  /** Voice for English / Latin / Romance languages. */
  primary?: VoiceLane;
  /** Voice for Arabic / Hebrew / RTL scripts. */
  secondary?: VoiceLane;
  /** Skip the studio stinger underneath the spoken voice. */
  noStinger?: boolean;
  /** Pitch shift (semitones, negative = deeper). */
  pitchShift?: number;
};

// ─── Voice catalog (per-provider) ───────────────────────────────────────────
export type VoicePreset = {
  id: string;
  label: string;
  provider: VoiceProvider;
  /** ISO language family hint for auto-routing: 'arabic' | 'latin' */
  lang: 'arabic' | 'latin';
  description: string;
};

export const VOICE_PRESETS: VoicePreset[] = [
  // ─── Microsoft Edge Neural (best quality, deep) — via /api/tts proxy ─────
  // English — male
  { id: 'en-US-GuyNeural',        label: '🎙️ Guy (US, Edge Neural) — رجالي عميق احترافي',        provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, deep US English male' },
  { id: 'en-US-DavisNeural',      label: '🎙️ Davis (US, Edge Neural) — مذيع رسمي',                provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, formal news anchor' },
  { id: 'en-US-TonyNeural',       label: '🎙️ Tony (US, Edge Neural) — هادر للخبر العاجل',         provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, energetic male' },
  { id: 'en-GB-RyanNeural',       label: '🎙️ Ryan (UK, Edge Neural) — بريطاني فخم',                provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, British male' },
  // English — female
  { id: 'en-US-AriaNeural',       label: '🎙️ Aria (US, Edge Neural) — نسائي رسمي',                 provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, US female anchor' },

  // Arabic — male / female (these are the SOLUTION for proper Arabic)
  { id: 'ar-SA-HamedNeural',      label: '🎙️ حامد (SA, Edge Neural) — عربي فصيح ضخم (موصى به)',    provider: 'microsoftEdge', lang: 'arabic', description: 'Edge Neural, Saudi male, very deep' },
  { id: 'ar-EG-ShakirNeural',     label: '🎙️ شاكر (EG, Edge Neural) — مصري احترافي',                provider: 'microsoftEdge', lang: 'arabic', description: 'Edge Neural, Egyptian male' },
  { id: 'ar-SA-ZariyahNeural',    label: '🎙️ زاريا (SA, Edge Neural) — نسائي فصيح',                 provider: 'microsoftEdge', lang: 'arabic', description: 'Edge Neural, Saudi female' },
  { id: 'ar-EG-SalmaNeural',      label: '🎙️ سلمى (EG, Edge Neural) — نسائي مصري',                  provider: 'microsoftEdge', lang: 'arabic', description: 'Edge Neural, Egyptian female' },

  // Spanish / French / German / Italian / Portuguese (for non-English shows)
  { id: 'es-ES-AlvaroNeural',     label: '🎙️ Álvaro (ES) — إسباني رجالي',                            provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, Castilian male' },
  { id: 'fr-FR-HenriNeural',      label: '🎙️ Henri (FR) — فرنسي رجالي',                              provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, French male' },
  { id: 'it-IT-DiegoNeural',      label: '🎙️ Diego (IT) — إيطالي رجالي',                             provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, Italian male' },
  { id: 'pt-BR-AntonioNeural',    label: '🎙️ António (BR) — برتغالي برازيلي',                        provider: 'microsoftEdge', lang: 'latin',  description: 'Edge Neural, Brazilian male' },

  // ─── StreamElements (free public, fallback option) ───────────────────────
  { id: 'Brian',                  label: '🌐 Brian (StreamElements) — بريطاني للستريمر',              provider: 'streamElements', lang: 'latin',  description: 'StreamElements TTS' },
  { id: 'Joey',                   label: '🌐 Joey (StreamElements) — أمريكي عميق',                    provider: 'streamElements', lang: 'latin',  description: 'StreamElements TTS' },
  { id: 'Naayf',                  label: '🌐 Naayf (StreamElements) — عربي رجالي',                    provider: 'streamElements', lang: 'arabic', description: 'StreamElements TTS' },

  // ─── Google Translate TTS (decent Arabic fallback, single sentence) ──────
  { id: 'gt-ar',                  label: '🌐 Google TTS (عربي)',                                       provider: 'googleTranslate', lang: 'arabic', description: 'Google Translate TTS Arabic' },
  { id: 'gt-en',                  label: '🌐 Google TTS (إنجليزي)',                                    provider: 'googleTranslate', lang: 'latin',  description: 'Google Translate TTS English' },

  // ─── Custom URL — user supplies their own pre-recorded MP3 ───────────────
  { id: 'CUSTOM_URL',             label: '📁 رابط MP3 مخصص — رفع ملف صوتي خاص',                       provider: 'customUrl',      lang: 'latin',  description: 'User-provided MP3 URL' },
];

const findVoice = (id: string): VoicePreset =>
  VOICE_PRESETS.find(v => v.id === id) || VOICE_PRESETS[0];

// ─── Audio context + bus helpers ─────────────────────────────────────────────
let _ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!_ctx || _ctx.state === 'closed') _ctx = new Ctor();
  return _ctx;
};

let _reverbBuffer: AudioBuffer | null = null;
const getPlateReverb = (ctx: AudioContext): AudioBuffer => {
  if (_reverbBuffer) return _reverbBuffer;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 2.6);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i += 1) {
      const t = i / len;
      const decay = Math.pow(1 - t, 3.0);
      data[i] = (Math.random() * 2 - 1) * decay * 0.6 * (ch === 0 ? 1 : 0.9);
    }
  }
  _reverbBuffer = buf;
  return buf;
};

const buildSat = (amt: number): Float32Array => {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amt * 12;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

// MP3 + decoded buffer cache
const mp3Cache = new Map<string, ArrayBuffer>();
const decodedCache = new Map<string, AudioBuffer>();

// ─── Studio Stinger (deep boom) ─────────────────────────────────────────────
type StingerHandle = {
  master: GainNode;
  stop: () => void;
};

const playStudioStinger = (volume: number): StingerHandle | null => {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.7), now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

  const conv = ctx.createConvolver();
  conv.buffer = getPlateReverb(ctx);
  const sendGain = ctx.createGain();
  sendGain.gain.value = 0.32;
  master.connect(ctx.destination);
  master.connect(sendGain);
  sendGain.connect(conv);
  conv.connect(ctx.destination);

  const sub = ctx.createOscillator();
  const subG = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(38, now);
  sub.frequency.exponentialRampToValueAtTime(24, now + 1.6);
  subG.gain.setValueAtTime(0.001, now);
  subG.gain.exponentialRampToValueAtTime(0.95, now + 0.06);
  subG.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
  sub.connect(subG); subG.connect(master);
  sub.start(now); sub.stop(now + 2.0);

  const body = ctx.createOscillator();
  const bodyG = ctx.createGain();
  const bodyF = ctx.createBiquadFilter();
  body.type = 'sawtooth';
  body.frequency.setValueAtTime(90, now);
  body.frequency.exponentialRampToValueAtTime(56, now + 0.7);
  bodyF.type = 'lowpass';
  bodyF.frequency.setValueAtTime(380, now);
  bodyF.frequency.exponentialRampToValueAtTime(180, now + 1.0);
  bodyG.gain.setValueAtTime(0.001, now);
  bodyG.gain.exponentialRampToValueAtTime(0.42, now + 0.04);
  bodyG.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  body.connect(bodyF); bodyF.connect(bodyG); bodyG.connect(master);
  body.start(now); body.stop(now + 1.5);

  const noiseLen = Math.floor(ctx.sampleRate * 1.4);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i += 1) {
    nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 1.4);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFlt = ctx.createBiquadFilter();
  noiseFlt.type = 'bandpass';
  noiseFlt.Q.value = 0.9;
  noiseFlt.frequency.setValueAtTime(620, now);
  noiseFlt.frequency.exponentialRampToValueAtTime(2400, now + 0.9);
  const noiseG = ctx.createGain();
  noiseG.gain.setValueAtTime(0.001, now);
  noiseG.gain.exponentialRampToValueAtTime(0.18, now + 0.12);
  noiseG.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  noise.connect(noiseFlt); noiseFlt.connect(noiseG); noiseG.connect(master);
  noise.start(now); noise.stop(now + 1.5);

  return {
    master,
    stop: () => {
      try { master.gain.cancelScheduledValues(ctx.currentTime); } catch { /* noop */ }
      try { master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); } catch { /* noop */ }
      try { sub.stop(); } catch { /* noop */ }
      try { body.stop(); } catch { /* noop */ }
      try { noise.stop(); } catch { /* noop */ }
    },
  };
};

// ─── Voice fetchers (one per provider) ──────────────────────────────────────
const tryFetch = async (url: string, signal?: AbortSignal): Promise<ArrayBuffer | null> => {
  try {
    const res = await fetch(url, { signal, mode: 'cors' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 200) return null;
    return buf;
  } catch {
    return null;
  }
};

const fetchVoiceMp3 = async (
  text: string,
  voice: VoicePreset,
  signal?: AbortSignal,
): Promise<ArrayBuffer | null> => {
  const cacheKey = `${voice.provider}::${voice.id}::${text}`;
  const cached = mp3Cache.get(cacheKey);
  if (cached) return cached;

  let buf: ArrayBuffer | null = null;

  if (voice.provider === 'microsoftEdge') {
    // Calls our own /api/tts proxy (server-side calls Microsoft Edge TTS)
    const url = `/api/tts?voice=${encodeURIComponent(voice.id)}&text=${encodeURIComponent(text)}`;
    buf = await tryFetch(url, signal);
  } else if (voice.provider === 'streamElements') {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice.id)}&text=${encodeURIComponent(text)}`;
    buf = await tryFetch(url, signal);
  } else if (voice.provider === 'googleTranslate') {
    const lang = voice.id === 'gt-ar' ? 'ar' : 'en';
    if (text.length < 200) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
      buf = await tryFetch(url, signal);
    }
  } else if (voice.provider === 'customUrl') {
    // voice.id stores the URL (text param ignored — file is fixed)
    if (voice.id && voice.id !== 'CUSTOM_URL') {
      buf = await tryFetch(voice.id, signal);
    }
  }

  if (buf) mp3Cache.set(cacheKey, buf);
  return buf;
};

const decodeMp3 = async (
  ctx: AudioContext,
  cacheKey: string,
  raw: ArrayBuffer,
): Promise<AudioBuffer | null> => {
  const cached = decodedCache.get(cacheKey);
  if (cached) return cached;
  try {
    const buf = await ctx.decodeAudioData(raw.slice(0));
    decodedCache.set(cacheKey, buf);
    return buf;
  } catch {
    return null;
  }
};

// ─── Language detection + segmentation ──────────────────────────────────────
//
// Splits a string into runs of "arabic" or "latin" so we can use the
// appropriate voice for each segment. Numbers and punctuation attach to
// the previous run to avoid jarring switches.
//
const isArabic = (ch: string) => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/.test(ch);
const isLatin  = (ch: string) => /[a-zA-Z]/.test(ch);
const isNeutral = (ch: string) => !isArabic(ch) && !isLatin(ch);

type TextSegment = { text: string; lang: 'arabic' | 'latin' };

export const segmentText = (text: string): TextSegment[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const segments: TextSegment[] = [];
  let current: TextSegment | null = null;
  for (const ch of trimmed) {
    let lang: 'arabic' | 'latin' | null = null;
    if (isArabic(ch)) lang = 'arabic';
    else if (isLatin(ch)) lang = 'latin';

    if (lang === null) {
      // neutral character — attach to current run if there is one
      if (current) current.text += ch;
      else current = { text: ch, lang: 'latin' };
    } else if (!current) {
      current = { text: ch, lang };
    } else if (current.lang !== lang) {
      // Trim trailing whitespace from current before pushing
      const finalized = { ...current, text: current.text.trim() };
      if (finalized.text) segments.push(finalized);
      current = { text: ch, lang };
    } else {
      current.text += ch;
    }
  }
  if (current) {
    const finalized = { ...current, text: current.text.trim() };
    if (finalized.text) segments.push(finalized);
  }
  return segments;
};

// ─── Broadcast bus playback ─────────────────────────────────────────────────
type SourceHandle = {
  source: AudioBufferSourceNode;
  bus: GainNode;
  endsAt: number;
};

const playBufferThroughBus = (
  ctx: AudioContext,
  buffer: AudioBuffer,
  startAt: number,
  volume: number,
  pitchShift = 0,
): SourceHandle => {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  if (pitchShift !== 0) {
    const rate = Math.pow(2, pitchShift / 12);
    src.playbackRate.value = Math.max(0.5, Math.min(1.5, rate));
  }
  const bus = ctx.createGain();
  bus.gain.value = Math.max(0, Math.min(1.4, volume)) * 0.95;

  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 220;
  lowShelf.gain.value = 5;

  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2400;
  presence.Q.value = 1.1;
  presence.gain.value = 4;

  const sat = ctx.createWaveShaper();
  sat.curve = buildSat(0.32);
  sat.oversample = '2x';

  const conv = ctx.createConvolver();
  conv.buffer = getPlateReverb(ctx);
  const sendGain = ctx.createGain();
  sendGain.gain.value = 0.18;

  src.connect(bus);
  bus.connect(sat);
  sat.connect(lowShelf);
  lowShelf.connect(presence);
  presence.connect(ctx.destination);
  presence.connect(sendGain);
  sendGain.connect(conv);
  conv.connect(ctx.destination);

  src.start(startAt);
  const dur = buffer.duration / src.playbackRate.value;
  return { source: src, bus, endsAt: startAt + dur };
};

// ─── Playback session (mutex) ───────────────────────────────────────────────
//
// Only one announcement can play at a time. Calling playAnnouncement again
// cancels the in-flight session entirely (stinger + sources + fetches).
//
type Session = {
  controller: AbortController;
  stinger: StingerHandle | null;
  sources: SourceHandle[];
  cancelled: boolean;
};

let activeSession: Session | null = null;

const cancelActiveSession = () => {
  if (!activeSession) return;
  activeSession.cancelled = true;
  try { activeSession.controller.abort(); } catch { /* noop */ }
  if (activeSession.stinger) {
    try { activeSession.stinger.stop(); } catch { /* noop */ }
  }
  for (const h of activeSession.sources) {
    try { h.source.stop(); } catch { /* noop */ }
    try {
      const ctx = getCtx();
      if (ctx) {
        h.bus.gain.cancelScheduledValues(ctx.currentTime);
        h.bus.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }
    } catch { /* noop */ }
  }
  activeSession = null;
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    }, { once: true });
  });

// ─── Public API ─────────────────────────────────────────────────────────────

const DEFAULT_PRIMARY: VoiceLane   = { provider: 'microsoftEdge', voiceId: 'en-US-GuyNeural' };
const DEFAULT_SECONDARY: VoiceLane = { provider: 'microsoftEdge', voiceId: 'ar-SA-HamedNeural' };

const resolveLaneVoice = (lane: VoiceLane | undefined, fallback: VoiceLane, langHint: 'arabic' | 'latin'): VoicePreset => {
  const id = (lane?.voiceId || fallback.voiceId).trim();
  // Custom URL: build a synthetic preset on the fly
  if (lane?.provider === 'customUrl') {
    return {
      id,
      label: 'Custom URL',
      provider: 'customUrl',
      lang: langHint,
      description: 'User-provided MP3 URL',
    };
  }
  const found = VOICE_PRESETS.find(v => v.id === id && v.provider === (lane?.provider || fallback.provider));
  if (found) return found;
  // Build a synthetic preset matching the requested id + provider
  return {
    id,
    label: id,
    provider: lane?.provider || fallback.provider,
    lang: langHint,
    description: '',
  };
};

/** Play a deep, professional broadcast announcement. Cancels any in-flight one. */
export const playAnnouncement = async (text: string, opts: AnnouncementOptions = {}) => {
  const ctx = getCtx();
  if (!ctx) return;

  // Cancel anything currently playing — strict mutex.
  cancelActiveSession();

  const mode: VoiceMode = opts.mode || 'BROADCAST';
  const volume = opts.volume ?? 0.95;
  const primaryLane = opts.primary || DEFAULT_PRIMARY;
  const secondaryLane = opts.secondary || DEFAULT_SECONDARY;

  // Fresh session
  const session: Session = {
    controller: new AbortController(),
    stinger: null,
    sources: [],
    cancelled: false,
  };
  activeSession = session;

  try {
    if (ctx.state === 'suspended') await ctx.resume();

    if (mode === 'STINGER_ONLY' || !text.trim()) {
      if (!opts.noStinger) session.stinger = playStudioStinger(volume);
      return;
    }

    // Segment by language and resolve a voice for each segment.
    const segments = segmentText(text);
    if (segments.length === 0) return;

    // Fetch all MP3s in parallel, but maintain order for sequential playback.
    const audioBuffers: (AudioBuffer | null)[] = await Promise.all(
      segments.map(async seg => {
        if (session.cancelled) return null;
        const lane = seg.lang === 'arabic' ? secondaryLane : primaryLane;
        const voice = resolveLaneVoice(lane, seg.lang === 'arabic' ? DEFAULT_SECONDARY : DEFAULT_PRIMARY, seg.lang);
        const raw = await fetchVoiceMp3(seg.text, voice, session.controller.signal);
        if (!raw || session.cancelled) return null;
        const cacheKey = `${voice.provider}::${voice.id}::${seg.text}`;
        return decodeMp3(ctx, cacheKey, raw);
      }),
    );

    if (session.cancelled || !activeSession || activeSession !== session) return;

    // Stinger plays once at the very start
    if (!opts.noStinger) session.stinger = playStudioStinger(volume);

    // Schedule segments back-to-back (no overlap)
    let cursor = ctx.currentTime + 0.08;
    for (const buf of audioBuffers) {
      if (session.cancelled) break;
      if (!buf) continue;
      const handle = playBufferThroughBus(ctx, buf, cursor, volume, opts.pitchShift ?? 0);
      session.sources.push(handle);
      cursor = handle.endsAt + 0.05; // tiny gap so syllables don't smear
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      // Real error — silently swallow, we don't want crashes
    }
  } finally {
    if (activeSession === session) {
      // Don't clear immediately — let the audio finish
      // The next playAnnouncement call will overwrite it
    }
  }
};

/** Stop any ongoing announcement immediately. */
export const stopAnnouncement = () => {
  cancelActiveSession();
};

/** Pre-warm a phrase + voice into cache. */
export const preloadAnnouncement = async (text: string, voice: VoiceLane) => {
  if (!text.trim()) return;
  const v = resolveLaneVoice(voice, DEFAULT_PRIMARY, voice.provider === 'microsoftEdge' && voice.voiceId.startsWith('ar-') ? 'arabic' : 'latin');
  await fetchVoiceMp3(text, v).catch(() => null);
};
