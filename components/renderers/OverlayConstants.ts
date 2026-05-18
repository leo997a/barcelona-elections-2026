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
  'WORLD_FEED': { primary: '#00a86b', secondary: '#101820', text: '#f8fafc', accent: '#f5c518' },
  'ELITE_SILVER': { primary: '#cbd5e1', secondary: '#111827', text: '#f8fafc', accent: '#22d3ee' },
  'MATCH_NIGHT': { primary: '#14b8a6', secondary: '#18181b', text: '#ffffff', accent: '#f97316' },
  'PROJECTION_BLUE': { primary: '#0057ff', secondary: '#050712', text: '#ffffff', accent: '#c8aa63' },
  'PROJECTION_RED': { primary: '#ff4b3e', secondary: '#050505', text: '#ffffff', accent: '#e8eef4' },
  'PROJECTION_MONO': { primary: '#e8eef4', secondary: '#08090d', text: '#ffffff', accent: '#ff4b3e' },
};

export const TRANSITIONS: Record<string, string> = {
    'CINEMATIC': 'animate-cinematic-fade-up',
    'PAGE_FLIP': 'animate-page-flip',
    'NEWS_SLIDE': 'animate-news-slide',
    'ZOOM_IMPACT': 'animate-zoom-impact',
    'CUBE_ROTATE': 'animate-cube-rotate',
    'GLITCH': 'animate-glitch',
    'STADIUM_SWEEP': 'animate-stadium-sweep',
    'TACTICAL_REVEAL': 'animate-tactical-reveal',
    'SCORE_FLASH': 'animate-score-flash',
};

export const SOUND_EFFECTS = {
    ENTRY: null,
    TRANSITION: null,
    EXIT: null
};

export const BROADCAST_TRANSITION_OPTIONS = [
    { value: 'DEFAULT', label: 'تلقائي حسب نوع القالب' },
    { value: 'SCOREBUG_SNAP', label: 'Scorebug Snap' },
    { value: 'STADIUM_SWEEP', label: 'Stadium Sweep' },
    { value: 'LOWER_THIRD_WIPE', label: 'Lower Third Wipe' },
    { value: 'DATA_RUSH', label: 'Data Rush' },
    { value: 'VERTICAL_REVEAL', label: 'Vertical Reveal' },
    { value: 'SPOTLIGHT_POP', label: 'Spotlight Pop' },
    { value: 'GLASS_SWEEP', label: 'Glass Sweep' },
    { value: 'BROADCAST_FADE', label: 'Broadcast Fade' },
];

export const BROADCAST_EXIT_OPTIONS = [
    { value: 'DEFAULT', label: 'تلقائي حسب نوع القالب' },
    { value: 'SCOREBUG_SNAP_OUT', label: 'Scorebug Snap Out' },
    { value: 'STADIUM_SWEEP_OUT', label: 'Stadium Sweep Out' },
    { value: 'LOWER_THIRD_WIPE_OUT', label: 'Lower Third Wipe Out' },
    { value: 'DATA_RUSH_OUT', label: 'Data Rush Out' },
    { value: 'VERTICAL_REVEAL_OUT', label: 'Vertical Reveal Out' },
    { value: 'SPOTLIGHT_POP_OUT', label: 'Spotlight Pop Out' },
    { value: 'GLASS_SWEEP_OUT', label: 'Glass Sweep Out' },
    { value: 'BROADCAST_FADE_OUT', label: 'Broadcast Fade Out' },
];

export const BROADCAST_SOUND_OPTIONS = [
    { value: 'DEFAULT', label: 'تلقائي حسب نوع القالب' },
    { value: 'SCOREBUG_SNAP', label: 'Scorebug Snap' },
    { value: 'STADIUM_WHOOSH', label: 'Stadium Whoosh' },
    { value: 'LOWER_THIRD_WIPE', label: 'Lower Third Wipe' },
    { value: 'DATA_TICK', label: 'Data Tick' },
    { value: 'VAR_BUZZ', label: 'VAR Buzz' },
    { value: 'CROWD_RISE', label: 'Crowd Rise' },
    { value: 'TACTICAL_PULSE', label: 'Tactical Pulse' },
    { value: 'LUXURY_STING', label: 'Luxury Sting' },
    { value: 'LUXURY_SWEEP', label: 'Luxury Sweep' },
    { value: 'LUXURY_IMPACT', label: 'Luxury Impact' },
    { value: 'MERCATO_HIT', label: 'Mercato Hit' },
    { value: 'TRANSFER_RISER', label: 'Transfer Riser' },
    { value: 'DEADLINE_ALARM', label: 'Deadline Alarm' },
    { value: 'HERE_WE_GO_STING', label: 'Here We Go Sting' },
    { value: 'CONTRACT_STAMP', label: 'Contract Stamp' },
    { value: 'AGENT_CALL', label: 'Agent Call' },
    { value: 'CASH_REGISTER', label: 'Cash Register' },
    { value: 'MEDICAL_PASS', label: 'Medical Pass' },
    { value: 'RUMOUR_GLITCH', label: 'Rumour Glitch' },
    { value: 'DEAL_LOCK', label: 'Deal Lock' },
    { value: 'ULTRA_RISER', label: 'Ultra Riser' },
    { value: 'CLUB_REVEAL', label: 'Club Reveal' },
    { value: 'PHOTO_FLASH', label: 'Photo Flash' },
    { value: 'NEWS_STING', label: 'News Sting' },
    { value: 'ELITE_HIT', label: 'Elite Hit' },
    { value: 'TACTICAL_LOCK', label: 'Tactical Lock' },
    { value: 'CINEMA_BOOM', label: 'Cinema Boom' },
    { value: 'DATA_SLAM', label: 'Data Slam' },
    { value: 'LUXURY_OUT', label: 'Luxury Out' },
    { value: 'SOFT_FADE', label: 'Soft Fade' },
    { value: 'BROADCAST_OUT', label: 'Broadcast Out' },
    { value: 'RESULTS_STING', label: 'Results Sting' },
    { value: 'QUOTE_SWEEP', label: 'Quote Sweep' },
    { value: 'VERSUS_IMPACT', label: 'Versus Impact' },
    // ─── New Football / Mercato Sound Pack ──────────────────────────────────
    { value: 'BREAKING_WHOOSH', label: 'Breaking Whoosh' },
    { value: 'TARGET_REVEAL', label: 'Target Reveal' },
    { value: 'TARGET_LOCK', label: 'Target Lock' },
    { value: 'TARGET_SCAN', label: 'Target Scan' },
    { value: 'POSITION_SWITCH', label: 'Position Switch' },
    { value: 'GOAL_FANFARE', label: 'Goal Fanfare' },
    { value: 'STADIUM_CHEER', label: 'Stadium Cheer' },
    { value: 'STADIUM_CHANT', label: 'Stadium Chant' },
    { value: 'WHISTLE_SHORT', label: 'Whistle Short' },
    { value: 'WHISTLE_LONG', label: 'Whistle Long' },
    { value: 'KICKOFF_HORN', label: 'Kickoff Horn' },
    { value: 'PA_ANNOUNCEMENT', label: 'PA Announcement' },
    { value: 'BREAKING_PULSE', label: 'Breaking Pulse' },
    { value: 'BREAKING_RISER', label: 'Breaking Riser' },
    { value: 'BREAKING_HIT', label: 'Breaking Hit' },
    { value: 'OFFICIAL_STAMP', label: 'Official Stamp' },
    { value: 'IMPORTANT_PING', label: 'Important Ping' },
    { value: 'NEWS_TICKER', label: 'News Ticker' },
    { value: 'SCOUT_BEEP', label: 'Scout Beep' },
    { value: 'TRANSFER_REVEAL', label: 'Transfer Reveal' },
    { value: 'CINEMATIC_DROP', label: 'Cinematic Drop' },
    { value: 'CINEMATIC_RISE', label: 'Cinematic Rise' },
    { value: 'IMPACT_BOOM', label: 'Impact Boom' },
    { value: 'GLITCH_TRANSITION', label: 'Glitch Transition' },
    { value: 'DIGITAL_SWEEP', label: 'Digital Sweep' },
    { value: 'MAGIC_REVEAL', label: 'Magic Reveal' },
    { value: 'SUSPENSE_RISE', label: 'Suspense Rise' },
    { value: 'TROPHY_FANFARE', label: 'Trophy Fanfare' },
    { value: 'TIMER_TICK', label: 'Timer Tick' },
    { value: 'COUNTDOWN_FINAL', label: 'Countdown Final' },
];

export type ElectionSynthStep = {
    delay: number;
    duration: number;
    frequency: number;
    toFrequency?: number;
    waveform: OscillatorType;
    gain: number;
};

export const ELECTION_SOUND_PATTERNS: Record<string, ElectionSynthStep[]> = {
    LUXURY_STING: [
        { delay: 0, duration: 0.18, frequency: 62, toFrequency: 54, waveform: 'sine', gain: 0.7 },
        { delay: 0.04, duration: 0.22, frequency: 196, toFrequency: 247, waveform: 'triangle', gain: 0.32 },
        { delay: 0.08, duration: 0.3, frequency: 392, toFrequency: 494, waveform: 'sine', gain: 0.18 },
        { delay: 0.22, duration: 0.42, frequency: 784, toFrequency: 988, waveform: 'sine', gain: 0.11 },
    ],
    LUXURY_SWEEP: [
        { delay: 0, duration: 0.34, frequency: 80, toFrequency: 64, waveform: 'sine', gain: 0.48 },
        { delay: 0.08, duration: 0.42, frequency: 240, toFrequency: 520, waveform: 'triangle', gain: 0.22 },
        { delay: 0.18, duration: 0.36, frequency: 680, toFrequency: 1100, waveform: 'sine', gain: 0.1 },
    ],
    LUXURY_IMPACT: [
        { delay: 0, duration: 0.22, frequency: 48, toFrequency: 38, waveform: 'sine', gain: 0.9 },
        { delay: 0.02, duration: 0.12, frequency: 112, toFrequency: 76, waveform: 'triangle', gain: 0.42 },
        { delay: 0.1, duration: 0.2, frequency: 330, toFrequency: 440, waveform: 'sine', gain: 0.16 },
    ],
    MERCATO_HIT: [
        { delay: 0, duration: 0.2, frequency: 44, toFrequency: 32, waveform: 'sine', gain: 1.0 },
        { delay: 0.035, duration: 0.16, frequency: 118, toFrequency: 84, waveform: 'sawtooth', gain: 0.52 },
        { delay: 0.14, duration: 0.28, frequency: 520, toFrequency: 980, waveform: 'triangle', gain: 0.28 },
        { delay: 0.34, duration: 0.18, frequency: 1240, waveform: 'sine', gain: 0.18 },
    ],
    TRANSFER_RISER: [
        { delay: 0, duration: 0.36, frequency: 92, toFrequency: 180, waveform: 'sawtooth', gain: 0.5 },
        { delay: 0.12, duration: 0.34, frequency: 260, toFrequency: 820, waveform: 'triangle', gain: 0.36 },
        { delay: 0.34, duration: 0.18, frequency: 1180, toFrequency: 1480, waveform: 'sine', gain: 0.22 },
    ],
    DEADLINE_ALARM: [
        { delay: 0, duration: 0.07, frequency: 780, waveform: 'square', gain: 0.45 },
        { delay: 0.12, duration: 0.07, frequency: 780, waveform: 'square', gain: 0.45 },
        { delay: 0.28, duration: 0.22, frequency: 140, toFrequency: 70, waveform: 'sawtooth', gain: 0.5 },
    ],
    CLUB_REVEAL: [
        { delay: 0, duration: 0.28, frequency: 58, toFrequency: 44, waveform: 'sine', gain: 0.72 },
        { delay: 0.08, duration: 0.28, frequency: 294, toFrequency: 440, waveform: 'triangle', gain: 0.34 },
        { delay: 0.26, duration: 0.3, frequency: 880, toFrequency: 1320, waveform: 'sine', gain: 0.16 },
    ],
    PHOTO_FLASH: [
        { delay: 0, duration: 0.045, frequency: 1600, waveform: 'square', gain: 0.3 },
        { delay: 0.055, duration: 0.06, frequency: 1180, waveform: 'triangle', gain: 0.22 },
        { delay: 0.15, duration: 0.2, frequency: 260, toFrequency: 180, waveform: 'sine', gain: 0.18 },
    ],
    NEWS_STING: [
        { delay: 0, duration: 0.13, frequency: 420, toFrequency: 620, waveform: 'triangle', gain: 0.62 },
        { delay: 0.09, duration: 0.18, frequency: 720, toFrequency: 980, waveform: 'sawtooth', gain: 0.4 },
        { delay: 0.26, duration: 0.16, frequency: 1080, waveform: 'sine', gain: 0.2 },
    ],
    ELITE_HIT: [
        { delay: 0, duration: 0.26, frequency: 42, toFrequency: 31, waveform: 'sine', gain: 1.1 },
        { delay: 0.04, duration: 0.18, frequency: 126, toFrequency: 82, waveform: 'sawtooth', gain: 0.56 },
        { delay: 0.16, duration: 0.28, frequency: 640, toFrequency: 1120, waveform: 'triangle', gain: 0.28 },
    ],
    TACTICAL_LOCK: [
        { delay: 0, duration: 0.06, frequency: 220, waveform: 'square', gain: 0.36 },
        { delay: 0.09, duration: 0.06, frequency: 330, waveform: 'square', gain: 0.34 },
        { delay: 0.18, duration: 0.16, frequency: 520, toFrequency: 390, waveform: 'triangle', gain: 0.28 },
    ],
    CINEMA_BOOM: [
        { delay: 0, duration: 0.42, frequency: 38, toFrequency: 28, waveform: 'sine', gain: 1.0 },
        { delay: 0.03, duration: 0.28, frequency: 76, toFrequency: 50, waveform: 'triangle', gain: 0.55 },
        { delay: 0.18, duration: 0.48, frequency: 220, toFrequency: 360, waveform: 'sawtooth', gain: 0.22 },
    ],
    DATA_SLAM: [
        { delay: 0, duration: 0.06, frequency: 920, waveform: 'square', gain: 0.34 },
        { delay: 0.07, duration: 0.08, frequency: 640, waveform: 'square', gain: 0.42 },
        { delay: 0.16, duration: 0.18, frequency: 260, toFrequency: 140, waveform: 'sawtooth', gain: 0.44 },
    ],
    LUXURY_OUT: [
        { delay: 0, duration: 0.24, frequency: 420, toFrequency: 220, waveform: 'triangle', gain: 0.16 },
        { delay: 0.08, duration: 0.28, frequency: 180, toFrequency: 62, waveform: 'sine', gain: 0.24 },
    ],
    SCOREBUG_SNAP: [
        { delay: 0, duration: 0.055, frequency: 180, toFrequency: 320, waveform: 'square', gain: 0.5 },
        { delay: 0.055, duration: 0.09, frequency: 620, toFrequency: 980, waveform: 'triangle', gain: 0.45 },
        { delay: 0.16, duration: 0.12, frequency: 1280, toFrequency: 1040, waveform: 'sine', gain: 0.18 },
    ],
    STADIUM_WHOOSH: [
        { delay: 0, duration: 0.28, frequency: 180, toFrequency: 760, waveform: 'sawtooth', gain: 0.35 },
        { delay: 0.1, duration: 0.34, frequency: 520, toFrequency: 1200, waveform: 'triangle', gain: 0.28 },
        { delay: 0.36, duration: 0.14, frequency: 920, waveform: 'sine', gain: 0.16 },
    ],
    LOWER_THIRD_WIPE: [
        { delay: 0, duration: 0.18, frequency: 360, toFrequency: 620, waveform: 'triangle', gain: 0.36 },
        { delay: 0.12, duration: 0.18, frequency: 720, toFrequency: 860, waveform: 'sine', gain: 0.24 },
    ],
    DATA_TICK: [
        { delay: 0, duration: 0.045, frequency: 820, waveform: 'square', gain: 0.16 },
        { delay: 0.07, duration: 0.045, frequency: 980, waveform: 'square', gain: 0.16 },
        { delay: 0.16, duration: 0.08, frequency: 540, toFrequency: 720, waveform: 'triangle', gain: 0.18 },
    ],
    VAR_BUZZ: [
        { delay: 0, duration: 0.12, frequency: 130, toFrequency: 115, waveform: 'sawtooth', gain: 0.5 },
        { delay: 0.11, duration: 0.12, frequency: 190, toFrequency: 170, waveform: 'square', gain: 0.25 },
        { delay: 0.28, duration: 0.1, frequency: 740, waveform: 'triangle', gain: 0.18 },
    ],
    CROWD_RISE: [
        { delay: 0, duration: 0.42, frequency: 220, toFrequency: 540, waveform: 'sawtooth', gain: 0.28 },
        { delay: 0.18, duration: 0.34, frequency: 440, toFrequency: 880, waveform: 'triangle', gain: 0.2 },
        { delay: 0.42, duration: 0.18, frequency: 1180, waveform: 'sine', gain: 0.12 },
    ],
    TACTICAL_PULSE: [
        { delay: 0, duration: 0.08, frequency: 260, waveform: 'square', gain: 0.28 },
        { delay: 0.13, duration: 0.08, frequency: 390, waveform: 'square', gain: 0.26 },
        { delay: 0.26, duration: 0.15, frequency: 620, toFrequency: 780, waveform: 'triangle', gain: 0.2 },
    ],
    BROADCAST_OUT: [
        { delay: 0, duration: 0.18, frequency: 760, toFrequency: 360, waveform: 'triangle', gain: 0.22 },
        { delay: 0.12, duration: 0.18, frequency: 480, toFrequency: 180, waveform: 'sine', gain: 0.18 },
    ],
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
    // ─── New Football / Mercato Sound Patterns ────────────────────────────────
    TARGET_REVEAL: [
        { delay: 0, duration: 0.18, frequency: 280, toFrequency: 520, waveform: 'sine', gain: 0.42 },
        { delay: 0.12, duration: 0.22, frequency: 620, toFrequency: 880, waveform: 'triangle', gain: 0.38 },
        { delay: 0.32, duration: 0.28, frequency: 1040, waveform: 'sine', gain: 0.3 },
    ],
    TARGET_LOCK: [
        { delay: 0, duration: 0.06, frequency: 320, waveform: 'square', gain: 0.32 },
        { delay: 0.1, duration: 0.06, frequency: 480, waveform: 'square', gain: 0.34 },
        { delay: 0.2, duration: 0.18, frequency: 720, toFrequency: 1080, waveform: 'triangle', gain: 0.32 },
        { delay: 0.4, duration: 0.16, frequency: 60, toFrequency: 40, waveform: 'sine', gain: 0.65 },
    ],
    TARGET_SCAN: [
        { delay: 0, duration: 0.08, frequency: 620, waveform: 'sine', gain: 0.22 },
        { delay: 0.1, duration: 0.08, frequency: 760, waveform: 'sine', gain: 0.24 },
        { delay: 0.2, duration: 0.08, frequency: 920, waveform: 'sine', gain: 0.26 },
        { delay: 0.3, duration: 0.12, frequency: 1080, waveform: 'triangle', gain: 0.22 },
    ],
    POSITION_SWITCH: [
        { delay: 0, duration: 0.14, frequency: 220, toFrequency: 480, waveform: 'sawtooth', gain: 0.32 },
        { delay: 0.08, duration: 0.18, frequency: 540, toFrequency: 760, waveform: 'triangle', gain: 0.28 },
        { delay: 0.24, duration: 0.16, frequency: 880, waveform: 'sine', gain: 0.2 },
    ],
    GOAL_FANFARE: [
        { delay: 0, duration: 0.18, frequency: 220, waveform: 'square', gain: 0.55 },
        { delay: 0.18, duration: 0.18, frequency: 330, waveform: 'square', gain: 0.55 },
        { delay: 0.36, duration: 0.36, frequency: 440, waveform: 'square', gain: 0.6 },
        { delay: 0.04, duration: 0.7, frequency: 55, toFrequency: 44, waveform: 'sawtooth', gain: 0.45 },
    ],
    STADIUM_CHEER: [
        { delay: 0, duration: 0.5, frequency: 180, toFrequency: 360, waveform: 'sawtooth', gain: 0.32 },
        { delay: 0.18, duration: 0.6, frequency: 460, toFrequency: 760, waveform: 'triangle', gain: 0.26 },
        { delay: 0.4, duration: 0.5, frequency: 880, waveform: 'sine', gain: 0.18 },
    ],
    STADIUM_CHANT: [
        { delay: 0, duration: 0.22, frequency: 180, waveform: 'sawtooth', gain: 0.36 },
        { delay: 0.28, duration: 0.22, frequency: 220, waveform: 'sawtooth', gain: 0.34 },
        { delay: 0.56, duration: 0.28, frequency: 260, waveform: 'sawtooth', gain: 0.36 },
        { delay: 0, duration: 1.0, frequency: 60, toFrequency: 50, waveform: 'sine', gain: 0.3 },
    ],
    WHISTLE_SHORT: [
        { delay: 0, duration: 0.14, frequency: 2400, waveform: 'sine', gain: 0.45 },
        { delay: 0, duration: 0.14, frequency: 4800, waveform: 'sine', gain: 0.18 },
    ],
    WHISTLE_LONG: [
        { delay: 0, duration: 0.6, frequency: 2400, toFrequency: 2480, waveform: 'sine', gain: 0.5 },
        { delay: 0, duration: 0.6, frequency: 4800, toFrequency: 4960, waveform: 'sine', gain: 0.18 },
    ],
    KICKOFF_HORN: [
        { delay: 0, duration: 0.32, frequency: 110, waveform: 'sawtooth', gain: 0.62 },
        { delay: 0, duration: 0.32, frequency: 220, waveform: 'sawtooth', gain: 0.32 },
        { delay: 0.34, duration: 0.42, frequency: 165, waveform: 'sawtooth', gain: 0.55 },
    ],
    PA_ANNOUNCEMENT: [
        { delay: 0, duration: 0.08, frequency: 660, waveform: 'sine', gain: 0.3 },
        { delay: 0.12, duration: 0.08, frequency: 880, waveform: 'sine', gain: 0.32 },
        { delay: 0.24, duration: 0.16, frequency: 1100, waveform: 'sine', gain: 0.28 },
    ],
    BREAKING_PULSE: [
        { delay: 0, duration: 0.08, frequency: 880, waveform: 'square', gain: 0.42 },
        { delay: 0.16, duration: 0.08, frequency: 880, waveform: 'square', gain: 0.42 },
        { delay: 0.32, duration: 0.08, frequency: 880, waveform: 'square', gain: 0.42 },
        { delay: 0.48, duration: 0.18, frequency: 60, toFrequency: 40, waveform: 'sine', gain: 0.5 },
    ],
    BREAKING_RISER: [
        { delay: 0, duration: 0.6, frequency: 80, toFrequency: 320, waveform: 'sawtooth', gain: 0.45 },
        { delay: 0.18, duration: 0.5, frequency: 240, toFrequency: 1100, waveform: 'triangle', gain: 0.36 },
        { delay: 0.5, duration: 0.22, frequency: 1280, waveform: 'sine', gain: 0.3 },
    ],
    BREAKING_HIT: [
        { delay: 0, duration: 0.22, frequency: 38, toFrequency: 28, waveform: 'sine', gain: 1.1 },
        { delay: 0.04, duration: 0.16, frequency: 110, toFrequency: 76, waveform: 'sawtooth', gain: 0.6 },
        { delay: 0.18, duration: 0.32, frequency: 580, toFrequency: 1080, waveform: 'triangle', gain: 0.36 },
    ],
    OFFICIAL_STAMP: [
        { delay: 0, duration: 0.18, frequency: 56, toFrequency: 42, waveform: 'sine', gain: 1.05 },
        { delay: 0.05, duration: 0.16, frequency: 140, toFrequency: 92, waveform: 'sawtooth', gain: 0.42 },
        { delay: 0.22, duration: 0.18, frequency: 320, toFrequency: 220, waveform: 'triangle', gain: 0.28 },
    ],
    IMPORTANT_PING: [
        { delay: 0, duration: 0.16, frequency: 880, waveform: 'sine', gain: 0.42 },
        { delay: 0.18, duration: 0.22, frequency: 1320, waveform: 'sine', gain: 0.3 },
    ],
    NEWS_TICKER: [
        { delay: 0, duration: 0.05, frequency: 720, waveform: 'square', gain: 0.18 },
        { delay: 0.07, duration: 0.05, frequency: 920, waveform: 'square', gain: 0.18 },
        { delay: 0.14, duration: 0.05, frequency: 720, waveform: 'square', gain: 0.18 },
    ],
    SCOUT_BEEP: [
        { delay: 0, duration: 0.06, frequency: 620, waveform: 'sine', gain: 0.28 },
        { delay: 0.1, duration: 0.06, frequency: 820, waveform: 'sine', gain: 0.3 },
    ],
    TRANSFER_REVEAL: [
        { delay: 0, duration: 0.32, frequency: 80, toFrequency: 60, waveform: 'sine', gain: 0.65 },
        { delay: 0.1, duration: 0.32, frequency: 220, toFrequency: 480, waveform: 'triangle', gain: 0.36 },
        { delay: 0.32, duration: 0.36, frequency: 720, toFrequency: 1180, waveform: 'sine', gain: 0.28 },
    ],
    CINEMATIC_DROP: [
        { delay: 0, duration: 0.42, frequency: 220, toFrequency: 36, waveform: 'sawtooth', gain: 0.58 },
        { delay: 0.18, duration: 0.42, frequency: 580, toFrequency: 90, waveform: 'triangle', gain: 0.36 },
        { delay: 0.4, duration: 0.32, frequency: 42, toFrequency: 28, waveform: 'sine', gain: 0.95 },
    ],
    CINEMATIC_RISE: [
        { delay: 0, duration: 0.6, frequency: 60, toFrequency: 240, waveform: 'sawtooth', gain: 0.5 },
        { delay: 0.18, duration: 0.5, frequency: 220, toFrequency: 880, waveform: 'triangle', gain: 0.4 },
        { delay: 0.5, duration: 0.3, frequency: 1080, waveform: 'sine', gain: 0.35 },
    ],
    IMPACT_BOOM: [
        { delay: 0, duration: 0.3, frequency: 32, waveform: 'sine', gain: 1.15 },
        { delay: 0.02, duration: 0.18, frequency: 80, waveform: 'sawtooth', gain: 0.55 },
        { delay: 0.12, duration: 0.42, frequency: 280, toFrequency: 480, waveform: 'triangle', gain: 0.28 },
    ],
    GLITCH_TRANSITION: [
        { delay: 0, duration: 0.05, frequency: 620, waveform: 'square', gain: 0.32 },
        { delay: 0.06, duration: 0.05, frequency: 320, waveform: 'square', gain: 0.32 },
        { delay: 0.13, duration: 0.05, frequency: 880, waveform: 'square', gain: 0.32 },
        { delay: 0.2, duration: 0.05, frequency: 240, waveform: 'square', gain: 0.32 },
        { delay: 0.28, duration: 0.18, frequency: 460, toFrequency: 280, waveform: 'sawtooth', gain: 0.28 },
    ],
    DIGITAL_SWEEP: [
        { delay: 0, duration: 0.32, frequency: 240, toFrequency: 1280, waveform: 'sawtooth', gain: 0.32 },
        { delay: 0.12, duration: 0.32, frequency: 480, toFrequency: 1880, waveform: 'triangle', gain: 0.24 },
    ],
    MAGIC_REVEAL: [
        { delay: 0, duration: 0.14, frequency: 660, waveform: 'sine', gain: 0.36 },
        { delay: 0.16, duration: 0.14, frequency: 880, waveform: 'sine', gain: 0.34 },
        { delay: 0.32, duration: 0.18, frequency: 1320, waveform: 'sine', gain: 0.32 },
        { delay: 0.5, duration: 0.22, frequency: 1760, waveform: 'sine', gain: 0.26 },
    ],
    SUSPENSE_RISE: [
        { delay: 0, duration: 0.8, frequency: 56, toFrequency: 110, waveform: 'sine', gain: 0.6 },
        { delay: 0.2, duration: 0.7, frequency: 180, toFrequency: 360, waveform: 'triangle', gain: 0.32 },
    ],
    TROPHY_FANFARE: [
        { delay: 0, duration: 0.16, frequency: 392, waveform: 'square', gain: 0.42 },
        { delay: 0.16, duration: 0.16, frequency: 523, waveform: 'square', gain: 0.42 },
        { delay: 0.32, duration: 0.32, frequency: 659, waveform: 'square', gain: 0.45 },
        { delay: 0.32, duration: 0.32, frequency: 392, waveform: 'sawtooth', gain: 0.3 },
    ],
    TIMER_TICK: [
        { delay: 0, duration: 0.04, frequency: 1320, waveform: 'square', gain: 0.18 },
    ],
    COUNTDOWN_FINAL: [
        { delay: 0, duration: 0.08, frequency: 880, waveform: 'square', gain: 0.32 },
        { delay: 0.16, duration: 0.08, frequency: 880, waveform: 'square', gain: 0.32 },
        { delay: 0.32, duration: 0.08, frequency: 880, waveform: 'square', gain: 0.32 },
        { delay: 0.48, duration: 0.32, frequency: 1320, waveform: 'square', gain: 0.5 },
    ],
    SOFT_FADE: [
        { delay: 0, duration: 0.18, frequency: 620, toFrequency: 400, waveform: 'sine', gain: 0.22 },
        { delay: 0.12, duration: 0.24, frequency: 420, toFrequency: 220, waveform: 'triangle', gain: 0.18 },
    ],
};
