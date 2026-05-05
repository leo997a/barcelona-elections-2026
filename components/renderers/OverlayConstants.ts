export const THEMES: Record<string, { primary: string, secondary: string, text: string, accent: string }> = {
  'CLASSIC_RED': { primary: '#b91c1c', secondary: '#0f172a', text: '#ffffff', accent: '#ef4444' },
  'TACTICAL_BLUE': { primary: '#1e40af', secondary: '#0b1120', text: '#f0f9ff', accent: '#3b82f6' },
  'PITCH_GREEN': { primary: '#047857', secondary: '#064e3b', text: '#ecfdf5', accent: '#10b981' },
  'ROYAL_GOLD': { primary: '#d97706', secondary: '#18181b', text: '#fffbeb', accent: '#fbbf24' },
  'NIGHT_PURPLE': { primary: '#6d28d9', secondary: '#1e1b4b', text: '#f5f3ff', accent: '#8b5cf6' },
  'DARK_MATTER': { primary: '#374151', secondary: '#111827', text: '#f9fafb', accent: '#9ca3af' },
  'NEWS_ORANGE': { primary: '#c2410c', secondary: '#1c1917', text: '#fff7ed', accent: '#f97316' },
  'UCL_BLUE': { primary: '#001489', secondary: '#000836', text: '#ffffff', accent: '#00e5ff' },
  'BARCA_RED': { primary: '#a50044', secondary: '#000000', text: '#ffffff', accent: '#edb111' },
  'BARCA_BLUE': { primary: '#004d98', secondary: '#000000', text: '#ffffff', accent: '#edb111' },
};

export const TRANSITIONS: Record<string, string> = {
    'CINEMATIC': 'animate-cinematic-fade-up',
    'PAGE_FLIP': 'animate-page-flip',
    'NEWS_SLIDE': 'animate-news-slide',
    'ZOOM_IMPACT': 'animate-zoom-impact',
    'CUBE_ROTATE': 'animate-cube-rotate',
    'GLITCH': 'animate-glitch',
};

export const SOUND_EFFECTS = {
    ENTRY: "https://assets.mixkit.co/active_storage/sfx/3120/3120.wav", 
    TRANSITION: "https://assets.mixkit.co/active_storage/sfx/3120/3120.wav", 
    EXIT: "https://assets.mixkit.co/active_storage/sfx/204/204.wav"
};

export type ElectionSynthStep = {
    delay: number;
    duration: number;
    frequency: number;
    toFrequency?: number;
    waveform: OscillatorType;
    gain: number;
};

export const ELECTION_SOUND_PATTERNS: Record<string, ElectionSynthStep[]> = {
    RESULTS_STING: [
        { delay: 0, duration: 0.14, frequency: 420, toFrequency: 560, waveform: 'triangle', gain: 0.7 },
        { delay: 0.1, duration: 0.22, frequency: 660, toFrequency: 940, waveform: 'sawtooth', gain: 0.9 },
        { delay: 0.26, duration: 0.32, frequency: 980, toFrequency: 1220, waveform: 'sine', gain: 0.45 },
    ],
    QUOTE_SWEEP: [
        { delay: 0, duration: 0.28, frequency: 280, toFrequency: 520, waveform: 'sine', gain: 0.45 },
        { delay: 0.12, duration: 0.24, frequency: 480, toFrequency: 760, waveform: 'triangle', gain: 0.4 },
        { delay: 0.3, duration: 0.2, frequency: 860, waveform: 'sine', gain: 0.18 },
    ],
    VERSUS_IMPACT: [
        { delay: 0, duration: 0.2, frequency: 120, toFrequency: 90, waveform: 'sawtooth', gain: 0.9 },
        { delay: 0.04, duration: 0.12, frequency: 220, toFrequency: 180, waveform: 'square', gain: 0.45 },
        { delay: 0.16, duration: 0.18, frequency: 540, toFrequency: 700, waveform: 'triangle', gain: 0.32 },
    ],
    SIDEBAR_CHIME: [
        { delay: 0, duration: 0.18, frequency: 660, waveform: 'sine', gain: 0.4 },
        { delay: 0.14, duration: 0.2, frequency: 880, waveform: 'sine', gain: 0.38 },
        { delay: 0.28, duration: 0.24, frequency: 1040, waveform: 'triangle', gain: 0.28 },
    ],
    DATA_PULSE: [
        { delay: 0, duration: 0.08, frequency: 240, waveform: 'square', gain: 0.3 },
        { delay: 0.1, duration: 0.08, frequency: 320, waveform: 'square', gain: 0.34 },
        { delay: 0.2, duration: 0.12, frequency: 440, waveform: 'triangle', gain: 0.28 },
    ],
    COUNTDOWN_TICK: [
        { delay: 0, duration: 0.05, frequency: 920, waveform: 'square', gain: 0.2 },
        { delay: 0.1, duration: 0.05, frequency: 920, waveform: 'square', gain: 0.2 },
        { delay: 0.24, duration: 0.18, frequency: 560, toFrequency: 740, waveform: 'triangle', gain: 0.32 },
    ],
    BREAKING_WHOOSH: [
        { delay: 0, duration: 0.34, frequency: 980, toFrequency: 240, waveform: 'sawtooth', gain: 0.8 },
        { delay: 0.08, duration: 0.22, frequency: 640, toFrequency: 320, waveform: 'triangle', gain: 0.38 },
    ],
    SOFT_FADE: [
        { delay: 0, duration: 0.18, frequency: 620, toFrequency: 400, waveform: 'sine', gain: 0.22 },
        { delay: 0.12, duration: 0.24, frequency: 420, toFrequency: 220, waveform: 'triangle', gain: 0.18 },
    ],
};
