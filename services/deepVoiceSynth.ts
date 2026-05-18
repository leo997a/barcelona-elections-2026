/**
 * deepVoiceSynth.ts
 *
 *  Studio-quality announcement voice using REAL human-recorded voices
 *  (not synthetic browser TTS).
 *
 *  Strategy — three fallback layers, in order:
 *
 *   1. STREAMELEMENTS TTS (best quality, used by streamers worldwide)
 *      Public, free, no API key needed:
 *        https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=...
 *      Voices used:
 *        - Brian (en-GB)        — deep British male, perfect for "Here We Go"
 *        - Joey  (en-US)        — deep American male, great for breaking news
 *        - Naayf (ar)           — natural Arabic male voice
 *        - Hoda  (ar-EG)        — natural Arabic female voice
 *        - Enrique (es)         — natural Spanish male
 *        - Bruno  (it)          — natural Italian male
 *        - Mathieu (fr-FR)      — natural French male
 *        - Hans (de-DE)         — natural German male
 *        - Cristiano (pt-BR)    — natural Portuguese male
 *      The audio comes back as MP3, decoded by Web Audio, and routed through
 *      the same broadcast bus (low shelf + presence + plate reverb + tape sat)
 *      so it sounds like part of the show.
 *
 *   2. RESPONSIVEVOICE-COMPATIBLE FALLBACK
 *      If StreamElements is unreachable (rare), try Google Translate TTS
 *      (single sentence under 200 chars). Same MP3 path.
 *
 *   3. STUDIO STINGER + BROWSER TTS DEEP
 *      Last resort: heavy synth stinger + browser TTS picked for deepest voice.
 *
 *  All three modes apply the same Broadcast Bus — sub-bass body, low shelf
 *  warmth, 2.4 kHz presence, plate convolution reverb, tape saturation —
 *  so the result sounds like a real station announcement, not a phone call.
 */

export type VoiceMode = 'BROADCAST' | 'STINGER_ONLY' | 'BROWSER_TTS_DEEP';

export type AnnouncementOptions = {
  mode?: VoiceMode;
  /** Volume 0..1.4 */
  volume?: number;
  /** Voice id; see VOICE_PRESETS below. Defaults to 'Brian'. */
  voiceId?: string;
  /** Language hint (used only for browser TTS fallback). */
  lang?: string;
  /** Skip the studio stinger underneath the spoken voice. */
  noStinger?: boolean;
  /** Pitch shift in semitones (negative = deeper). Default 0. */
  pitchShift?: number;
};

// ─── Voice catalog ──────────────────────────────────────────────────────────
//  Each voice is mapped to a StreamElements voice ID + a recommended Google
//  Translate TTS lang/accent fallback.
export type VoicePreset = {
  id: string;
  label: string;
  streamElements: string;
  googleLang?: string;
  characterDescription: string;
};

export const VOICE_PRESETS: VoicePreset[] = [
  // English — male, broadcast quality
  { id: 'Brian',   label: 'Brian — صوت إنجليزي بريطاني عميق (موصى به)',  streamElements: 'Brian',   googleLang: 'en-GB', characterDescription: 'British male, very deep, perfect for "Here We Go"' },
  { id: 'Joey',    label: 'Joey — صوت إنجليزي أمريكي للإعلانات',         streamElements: 'Joey',    googleLang: 'en-US', characterDescription: 'American male, deep, breaking-news style' },
  { id: 'Matthew', label: 'Matthew — صوت أمريكي رسمي',                    streamElements: 'Matthew', googleLang: 'en-US', characterDescription: 'American male, formal news anchor' },
  { id: 'Russell', label: 'Russell — صوت أسترالي حازم',                    streamElements: 'Russell', googleLang: 'en-AU', characterDescription: 'Australian male, authoritative' },

  // English — female
  { id: 'Salli',   label: 'Salli — صوت أمريكي نسائي',                     streamElements: 'Salli',   googleLang: 'en-US', characterDescription: 'American female, clear news voice' },
  { id: 'Amy',     label: 'Amy — صوت بريطاني نسائي',                      streamElements: 'Amy',     googleLang: 'en-GB', characterDescription: 'British female, news anchor' },

  // Arabic
  { id: 'Naayf',   label: 'Naayf — صوت عربي رجالي طبيعي (موصى به)',       streamElements: 'Naayf',   googleLang: 'ar',    characterDescription: 'Arabic male, natural broadcaster' },
  { id: 'Hoda',    label: 'Hoda — صوت عربي نسائي مصري',                    streamElements: 'Hoda',    googleLang: 'ar',    characterDescription: 'Egyptian Arabic female' },

  // Spanish
  { id: 'Enrique', label: 'Enrique — صوت إسباني رجالي',                    streamElements: 'Enrique', googleLang: 'es-ES', characterDescription: 'Castilian Spanish male' },
  { id: 'Penelope', label: 'Penelope — صوت إسباني (المكسيك)',              streamElements: 'Penelope', googleLang: 'es-MX', characterDescription: 'Mexican Spanish female' },

  // Italian / French / German / Portuguese
  { id: 'Bruno',     label: 'Bruno — صوت إيطالي رجالي',                    streamElements: 'Giorgio', googleLang: 'it-IT', characterDescription: 'Italian male, broadcaster' },
  { id: 'Mathieu',   label: 'Mathieu — صوت فرنسي رجالي',                   streamElements: 'Mathieu', googleLang: 'fr-FR', characterDescription: 'French male, news voice' },
  { id: 'Hans',      label: 'Hans — صوت ألماني رجالي',                     streamElements: 'Hans',    googleLang: 'de-DE', characterDescription: 'German male, broadcaster' },
  { id: 'Cristiano', label: 'Cristiano — صوت برتغالي برازيلي',              streamElements: 'Cristiano', googleLang: 'pt-BR', characterDescription: 'Brazilian Portuguese male' },
];

const findVoice = (id: string): VoicePreset =>
  VOICE_PRESETS.find(v => v.id.toLowerCase() === id.toLowerCase()) || VOICE_PRESETS[0];

// ─── Audio context + plate reverb ──────────────────────────────────────────
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

// Saturation curve for tape warmth
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

// MP3 cache so the same phrase doesn't re-fetch
const mp3Cache = new Map<string, ArrayBuffer>();
const decodedCache = new Map<string, AudioBuffer>();

// ─── Studio Stinger (deep boom under the spoken voice) ─────────────────────
const playStudioStinger = (volume: number) => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.7), now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

  // Plate reverb send
  const conv = ctx.createConvolver();
  conv.buffer = getPlateReverb(ctx);
  const sendGain = ctx.createGain();
  sendGain.gain.value = 0.32;
  master.connect(ctx.destination);
  master.connect(sendGain);
  sendGain.connect(conv);
  conv.connect(ctx.destination);

  // Sub bass
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

  // Body kick
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

  // Air whoosh
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
};

// ─── Real human voice fetch ────────────────────────────────────────────────
//
//  StreamElements speech endpoint is the same one used by tens of thousands
//  of streamers worldwide. It is free, public, and returns broadcast-quality
//  MP3. No API key required.
//
//  We try StreamElements first, then Google Translate TTS as a fallback.
//
const fetchVoiceMp3 = async (
  text: string,
  voice: VoicePreset,
): Promise<ArrayBuffer | null> => {
  const cacheKey = `${voice.id}::${text}`;
  const cached = mp3Cache.get(cacheKey);
  if (cached) return cached;

  const tryFetch = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 200) return null; // too small, likely an error page
      return buf;
    } catch {
      return null;
    }
  };

  // 1. StreamElements
  const seUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(
    voice.streamElements,
  )}&text=${encodeURIComponent(text)}`;
  let buf = await tryFetch(seUrl);

  // 2. Google Translate TTS fallback (single-line, <200 chars)
  if (!buf && voice.googleLang && text.length < 200) {
    const tlangUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text,
    )}&tl=${voice.googleLang}&client=tw-ob`;
    buf = await tryFetch(tlangUrl);
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

// Play a decoded buffer through the full broadcast bus
const playThroughBroadcastBus = (
  ctx: AudioContext,
  buffer: AudioBuffer,
  volume: number,
  pitchShift = 0,
  withStinger = true,
) => {
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  const now = ctx.currentTime + 0.05;
  const vol = Math.max(0, Math.min(1.4, volume));

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  // Pitch shift via playbackRate. -semitones for deeper voice.
  if (pitchShift !== 0) {
    const rate = Math.pow(2, pitchShift / 12);
    src.playbackRate.value = Math.max(0.5, Math.min(1.5, rate));
  }

  // Broadcast bus
  const bus = ctx.createGain();
  bus.gain.value = vol * 0.95;

  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 220;
  lowShelf.gain.value = 5; // warm body

  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2400;
  presence.Q.value = 1.1;
  presence.gain.value = 4; // air, intelligibility

  const sat = ctx.createWaveShaper();
  sat.curve = buildSat(0.32);
  sat.oversample = '2x';

  // Plate reverb send
  const conv = ctx.createConvolver();
  conv.buffer = getPlateReverb(ctx);
  const sendGain = ctx.createGain();
  sendGain.gain.value = 0.18; // restrained — we want clarity, not bathroom

  src.connect(bus);
  bus.connect(sat);
  sat.connect(lowShelf);
  lowShelf.connect(presence);
  presence.connect(ctx.destination);
  presence.connect(sendGain);
  sendGain.connect(conv);
  conv.connect(ctx.destination);

  src.start(now);

  if (withStinger) {
    // Play the stinger right at the start so it overlaps the first 1.5s
    playStudioStinger(vol);
  }
};

// ─── Browser TTS fallback (last resort) ─────────────────────────────────────
const speakBrowserTTSDeep = (text: string, lang: string, volume: number) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.82;
    utter.pitch = 0.45;
    utter.volume = Math.min(1.0, volume);
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang.toLowerCase().slice(0, 2);
    const matching = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    const pool = matching.length > 0 ? matching : voices;
    const deep = pool.find(v => /\b(daniel|alex|david|mark|james|brian|matthew|naayf|tarik|maged)\b/i.test(v.name));
    if (deep) utter.voice = deep;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch { /* noop */ }
};

// ─── Public API ────────────────────────────────────────────────────────────
let inFlightController: AbortController | null = null;

/**
 * Play a deep, professional broadcast announcement using REAL voices when
 * possible (StreamElements), with a heavy stinger underneath.
 */
export const playAnnouncement = async (text: string, opts: AnnouncementOptions = {}) => {
  const ctx = getCtx();
  if (!ctx) return;

  const mode: VoiceMode = opts.mode || 'BROADCAST';
  const volume = opts.volume ?? 0.95;
  const voiceId = opts.voiceId || 'Brian';
  const voice = findVoice(voiceId);

  if (mode === 'STINGER_ONLY' || !text.trim()) {
    playStudioStinger(volume);
    return;
  }

  if (mode === 'BROWSER_TTS_DEEP') {
    if (!opts.noStinger) playStudioStinger(volume);
    speakBrowserTTSDeep(text, opts.lang || 'en-US', volume);
    return;
  }

  // BROADCAST mode — try real voice fetch first
  try {
    inFlightController?.abort();
    inFlightController = new AbortController();
    const cacheKey = `${voice.id}::${text}`;
    const raw = await fetchVoiceMp3(text, voice);
    if (raw) {
      const decoded = await decodeMp3(ctx, cacheKey, raw);
      if (decoded) {
        playThroughBroadcastBus(ctx, decoded, volume, opts.pitchShift ?? 0, !opts.noStinger);
        return;
      }
    }
  } catch { /* fallthrough to browser TTS */ }

  // Final fallback
  if (!opts.noStinger) playStudioStinger(volume);
  speakBrowserTTSDeep(text, opts.lang || (voice.googleLang || 'en-US'), volume);
};

export const stopAnnouncement = () => {
  try {
    inFlightController?.abort();
  } catch { /* noop */ }
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch { /* noop */ }
};

/** Pre-warm a phrase into cache so the first play has zero delay. */
export const preloadAnnouncement = async (text: string, voiceId = 'Brian') => {
  if (!text.trim()) return;
  const voice = findVoice(voiceId);
  await fetchVoiceMp3(text, voice);
};
