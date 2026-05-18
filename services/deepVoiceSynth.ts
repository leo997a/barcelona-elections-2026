/**
 * deepVoiceSynth.ts
 *
 *  Studio-quality "deep voice" announcement synthesizer.
 *
 *  Why custom synthesis instead of browser SpeechSynthesisUtterance?
 *  Browser TTS voices are inconsistent, often robotic, and sound amateurish.
 *  This module builds a deep, professional broadcaster voice using Web Audio
 *  formant filters, sub-bass body, plate reverb and tape saturation.
 *
 *  Two modes are exposed:
 *
 *   1. playAnnouncementCue(text, opts)
 *      A short studio "stinger" phrase that plays alongside browser TTS to
 *      add weight, low end and reverb tail. This is what you want for
 *      "HERE WE GO", "BREAKING NEWS", "OFFICIAL", etc.
 *
 *   2. speakWithBrowserTTS(text, opts)
 *      A safe wrapper around browser TTS that picks the deepest available
 *      voice, lowers pitch, and routes a follow-up reverb tail through Web
 *      Audio when supported. Falls back gracefully when voices are missing.
 *
 *   3. playFormantPhrase(text, opts)
 *      A full Web-Audio-only formant phrase (no browser TTS). Useful when
 *      browser TTS is muted or absent. Produces an intelligible, deep,
 *      "trailer voice" pronunciation of short phrases such as "HERE WE GO"
 *      or "BREAKING NEWS".
 */

type VoiceMode = 'BROWSER_TTS_DEEP' | 'STUDIO_STINGER' | 'FORMANT_PHRASE';

export type AnnouncementOptions = {
  mode?: VoiceMode;
  /** Volume 0..1 */
  volume?: number;
  /** Pitch in semitones below default (positive number = deeper) */
  deepness?: number;
  /** Language hint for browser TTS (e.g. 'en-US', 'ar-SA') */
  lang?: string;
  /** When true, skip the studio stinger layer. */
  noStinger?: boolean;
};

const getCtx = (() => {
  let ctx: AudioContext | null = null;
  return () => {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx || ctx.state === 'closed') ctx = new Ctor();
    return ctx;
  };
})();

let cachedReverb: AudioBuffer | null = null;
const buildPlateReverb = (ctx: AudioContext): AudioBuffer => {
  if (cachedReverb) return cachedReverb;
  const sampleRate = ctx.sampleRate;
  const duration = 2.4;
  const len = Math.floor(sampleRate * duration);
  const buf = ctx.createBuffer(2, len, sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i += 1) {
      const t = i / len;
      // dense plate-style decay
      const decay = Math.pow(1 - t, 3.2);
      const noise = (Math.random() * 2 - 1);
      // adds a touch of stereo decorrelation
      data[i] = noise * decay * 0.55 * (ch === 0 ? 1 : 0.92);
    }
  }
  cachedReverb = buf;
  return buf;
};

// ────────────────────────────────────────────────────────────────────────────
//  STUDIO STINGER  — deep, full-bodied "boom" that overlaps the spoken phrase
// ────────────────────────────────────────────────────────────────────────────
const playStudioStinger = (volume: number) => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.8), now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

  // Plate reverb send
  const convolver = ctx.createConvolver();
  convolver.buffer = buildPlateReverb(ctx);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.32;
  master.connect(ctx.destination);
  master.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(ctx.destination);

  // Layer 1 — sub bass body (38 → 24 Hz)
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(38, now);
  sub.frequency.exponentialRampToValueAtTime(24, now + 1.6);
  subGain.gain.setValueAtTime(0.001, now);
  subGain.gain.exponentialRampToValueAtTime(1.05, now + 0.06);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
  sub.connect(subGain);
  subGain.connect(master);
  sub.start(now);
  sub.stop(now + 2.0);

  // Layer 2 — body kick (90 → 56 Hz, sawtooth shaped)
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  const bodyFilter = ctx.createBiquadFilter();
  body.type = 'sawtooth';
  body.frequency.setValueAtTime(90, now);
  body.frequency.exponentialRampToValueAtTime(56, now + 0.7);
  bodyFilter.type = 'lowpass';
  bodyFilter.frequency.setValueAtTime(380, now);
  bodyFilter.frequency.exponentialRampToValueAtTime(180, now + 1.0);
  bodyFilter.Q.value = 0.7;
  bodyGain.gain.setValueAtTime(0.001, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.45, now + 0.04);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  body.connect(bodyFilter);
  bodyFilter.connect(bodyGain);
  bodyGain.connect(master);
  body.start(now);
  body.stop(now + 1.5);

  // Layer 3 — broadcast riser (320 → 1240 Hz, triangle, mid presence)
  const riser = ctx.createOscillator();
  const riserGain = ctx.createGain();
  riser.type = 'triangle';
  riser.frequency.setValueAtTime(320, now + 0.05);
  riser.frequency.exponentialRampToValueAtTime(1240, now + 0.95);
  riserGain.gain.setValueAtTime(0.001, now);
  riserGain.gain.exponentialRampToValueAtTime(0.18, now + 0.18);
  riserGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  riser.connect(riserGain);
  riserGain.connect(master);
  riser.start(now);
  riser.stop(now + 1.4);

  // Layer 4 — air noise sweep (gives the "WHOOSH")
  const noiseLen = Math.floor(ctx.sampleRate * 1.4);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i += 1) {
    const fade = Math.pow(1 - i / noiseLen, 1.4);
    nd[i] = (Math.random() * 2 - 1) * fade;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.Q.value = 0.9;
  noiseFilter.frequency.setValueAtTime(620, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.9);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.22, now + 0.12);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now);
  noise.stop(now + 1.5);
};

// ────────────────────────────────────────────────────────────────────────────
//  BROWSER TTS — find the deepest available voice and pitch it down
// ────────────────────────────────────────────────────────────────────────────
const pickDeepestVoice = (preferredLang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (voices.length === 0) return null;
  const langPrefix = preferredLang.toLowerCase().slice(0, 2);

  // Score each voice — lower score is "deeper" / more authoritative
  const scored = voices.map(v => {
    let score = 0;
    const name = v.name.toLowerCase();
    const matchLang = v.lang.toLowerCase().startsWith(langPrefix) ? 1 : 0;
    score -= matchLang * 100; // strongly prefer matching language

    // Strongly prefer male / authoritative names
    if (/\b(male|man|guy|deep|low|bass)\b/.test(name)) score -= 60;
    if (/\b(daniel|alex|fred|david|mark|james|ryan|matthew|brian|tom|robert)\b/.test(name)) score -= 40;
    if (/\b(majed|tarik|hamed|ali|saleh|fahad|omar|hassan)\b/.test(name)) score -= 40;
    if (/\b(carlos|diego|jorge|manuel|miguel|enrique|ricardo)\b/.test(name)) score -= 30;
    if (/\b(female|woman|girl|lady|ms\.)\b/.test(name)) score += 80;
    if (/\b(samantha|victoria|moira|tessa|amira|hoda|fiona|karen|allison|kate|susan)\b/.test(name)) score += 40;

    // Penalize "novelty" voices
    if (/\b(novelty|whisper|cellos|good news|bad news|trinoids|zarvox|albert)\b/.test(name)) score += 200;

    // Prefer "premium / enhanced / natural" voices
    if (/\b(enhanced|premium|natural|neural|wavenet)\b/.test(name)) score -= 25;
    if (/google/.test(name)) score -= 15;
    if (/microsoft/.test(name)) score -= 10;

    return { voice: v, score };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.voice || voices[0];
};

const speakBrowserTTSDeep = (text: string, opts: AnnouncementOptions) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    const lang = opts.lang || 'en-US';
    utter.lang = lang;
    // Lower rate slightly for gravitas, lower pitch substantially for "deep" feel
    utter.rate = 0.82;
    utter.pitch = 0.45; // very deep
    utter.volume = Math.min(1.0, (opts.volume ?? 0.95));

    const voices = window.speechSynthesis.getVoices();
    const picked = pickDeepestVoice(lang, voices);
    if (picked) utter.voice = picked;

    // Cancel any in-flight speech, then queue this one.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch { /* speech synthesis unavailable */ }
};

// Some browsers populate voices asynchronously. Wait briefly so the picker has
// real options to choose from.
const waitForVoices = (timeoutMs = 500): Promise<void> =>
  new Promise(resolve => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      finish();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    window.setTimeout(finish, timeoutMs);
  });

// ────────────────────────────────────────────────────────────────────────────
//  FORMANT PHRASE — fully synthetic deep voice phrase (no browser TTS)
//
//  This is a simple two-formant vocoder. Each "syllable" in the phrase is
//  rendered with male formant frequencies (F1 around 350-550 Hz, F2 around
//  900-1500 Hz) over a low base frequency (~95 Hz). The result is a deep,
//  intelligible "movie trailer" pronunciation.
// ────────────────────────────────────────────────────────────────────────────
type Syllable = {
  duration: number;
  baseFreq: number;
  f1: number;
  f2: number;
  // amplitude multiplier for stress
  stress: number;
};

// Approximate formant table for short English announcement phrases
const SYLLABLE_PRESETS: Record<string, Syllable> = {
  'here': { duration: 0.32, baseFreq: 95, f1: 480, f2: 2080, stress: 1.0 },
  'we':   { duration: 0.18, baseFreq: 92, f1: 320, f2: 800,  stress: 0.85 },
  'go':   { duration: 0.45, baseFreq: 78, f1: 520, f2: 920,  stress: 1.1 },
  'breaking': { duration: 0.55, baseFreq: 92, f1: 460, f2: 1500, stress: 1.0 },
  'news':     { duration: 0.40, baseFreq: 88, f1: 380, f2: 1200, stress: 1.05 },
  'official': { duration: 0.65, baseFreq: 92, f1: 420, f2: 1400, stress: 1.0 },
  'important':{ duration: 0.65, baseFreq: 95, f1: 460, f2: 1500, stress: 1.05 },
  'this':     { duration: 0.22, baseFreq: 92, f1: 320, f2: 1700, stress: 0.9 },
  'just':     { duration: 0.28, baseFreq: 95, f1: 360, f2: 1100, stress: 0.95 },
  'in':       { duration: 0.20, baseFreq: 92, f1: 380, f2: 2100, stress: 0.85 },
};

const tokenizePhrase = (text: string): Syllable[] => {
  const cleaned = text.toLowerCase().replace(/[^a-z\s]/g, ' ').trim();
  if (!cleaned) {
    return [SYLLABLE_PRESETS.here, SYLLABLE_PRESETS.we, SYLLABLE_PRESETS.go];
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  const syllables: Syllable[] = [];
  for (const w of words) {
    const preset = SYLLABLE_PRESETS[w];
    if (preset) {
      syllables.push(preset);
      continue;
    }
    // Fallback: build a syllable from the word's length so unknown words
    // still produce a recognisable rhythm and male formants.
    const len = Math.min(0.55, 0.18 + w.length * 0.05);
    const baseFreq = 88 + (w.charCodeAt(0) % 12);
    syllables.push({ duration: len, baseFreq, f1: 420, f2: 1300, stress: 0.9 });
  }
  return syllables;
};

const renderFormantPhrase = (syllables: Syllable[], opts: AnnouncementOptions) => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const start = ctx.currentTime + 0.02;
  const volume = Math.max(0, Math.min(1.4, opts.volume ?? 0.95));

  const master = ctx.createGain();
  master.gain.value = volume * 0.7;

  // Voice tone shaping: gentle high-shelf cut, mid presence boost
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 1700;
  presence.Q.value = 0.9;
  presence.gain.value = 4;

  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 220;
  lowShelf.gain.value = 6;

  // Plate reverb send for cinematic depth
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.22;
  const convolver = ctx.createConvolver();
  convolver.buffer = buildPlateReverb(ctx);

  master.connect(lowShelf);
  lowShelf.connect(presence);
  presence.connect(ctx.destination);
  presence.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(ctx.destination);

  let cursor = start;
  for (const syll of syllables) {
    const t0 = cursor;
    const t1 = t0 + syll.duration;
    const dipDown = opts.deepness ?? 0;
    const f0 = Math.max(50, syll.baseFreq - dipDown * 4);

    // Glottal source — saw oscillator with a small descending pitch contour
    const source = ctx.createOscillator();
    source.type = 'sawtooth';
    source.frequency.setValueAtTime(f0 * 1.05, t0);
    source.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * 0.92), t1);

    // Two formant filters in parallel
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = syll.f1;
    f1.Q.value = 8;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = syll.f2;
    f2.Q.value = 9;

    const f1Gain = ctx.createGain();
    f1Gain.gain.value = 1.2;
    const f2Gain = ctx.createGain();
    f2Gain.gain.value = 0.7;

    // Envelope per syllable — quick attack, soft tail
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(syll.stress, t0 + 0.04);
    env.gain.setValueAtTime(syll.stress * 0.85, t1 - 0.06);
    env.gain.exponentialRampToValueAtTime(0.0001, t1);

    source.connect(f1);
    source.connect(f2);
    f1.connect(f1Gain);
    f2.connect(f2Gain);
    f1Gain.connect(env);
    f2Gain.connect(env);
    env.connect(master);
    source.start(t0);
    source.stop(t1 + 0.05);

    // Tiny pause between syllables for natural rhythm
    cursor = t1 + 0.06;
  }
};

// ────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Play a deep, professional broadcaster announcement.
 *
 *  Modes:
 *    - BROWSER_TTS_DEEP — picks the deepest available browser voice, lowers
 *      pitch substantially, and layers a studio stinger underneath.
 *    - STUDIO_STINGER  — only the studio stinger (no spoken word). Useful
 *      for quick branded openers.
 *    - FORMANT_PHRASE  — fully synthetic deep voice, no browser TTS.
 */
export const playAnnouncement = async (text: string, opts: AnnouncementOptions = {}) => {
  const mode = opts.mode || 'BROWSER_TTS_DEEP';
  const volume = opts.volume ?? 0.95;

  if (mode === 'STUDIO_STINGER') {
    playStudioStinger(volume);
    return;
  }

  if (mode === 'FORMANT_PHRASE') {
    if (!opts.noStinger) playStudioStinger(volume);
    const syllables = tokenizePhrase(text);
    renderFormantPhrase(syllables, opts);
    return;
  }

  // BROWSER_TTS_DEEP — wait for voices, then speak alongside the stinger.
  await waitForVoices();
  if (!opts.noStinger) playStudioStinger(volume);
  speakBrowserTTSDeep(text, opts);
};

/** Stop any ongoing announcement. */
export const stopAnnouncement = () => {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch { /* noop */ }
};
