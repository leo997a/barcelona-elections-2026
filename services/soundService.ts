
/**
 * soundService — Web Audio API synthesized broadcast sounds
 * No external files needed. All sounds generated in real-time.
 */

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
  return ctx;
};

/** Unlock audio on first user gesture (call once) */
export const unlockAudio = () => {
  try { getCtx().resume(); } catch { /* ignore */ }
};

/** TV broadcast "sting" — ascending chime for overlay SHOW */
export const playShow = () => {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    const freqs = [523, 659, 784, 1047]; // C5-E5-G5-C6
    freqs.forEach((freq, i) => {
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      const t    = now + i * 0.07;
      osc.type            = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch { /* ignore if audio locked */ }
};

/** Whoosh-down — descending slide for overlay HIDE */
export const playHide = () => {
  try {
    const ac   = getCtx();
    const now  = ac.currentTime;
    // noise burst
    const bufLen = ac.sampleRate * 0.25;
    const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src    = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain   = ac.createGain();

    src.buffer      = buf;
    filter.type     = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.22);
    filter.Q.value  = 0.8;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(now);
    src.stop(now + 0.25);
  } catch { /* ignore */ }
};

/** Soft click for UI interactions */
export const playClick = () => {
  try {
    const ac   = getCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const now  = ac.currentTime;
    osc.type            = 'sine';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch { /* ignore */ }
};
