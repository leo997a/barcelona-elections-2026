/**
 * soundLibrary.ts — Professional broadcast sound recipe map.
 *
 * Each entry below is a *recipe*, not just a label. The recipe is rendered
 * by audioEngine.playFromLibrary which uses small focused helpers
 * (playSubImpact, playGlassReveal, playNewsTicker, playStadiumBed,
 *  playRadarSweep, playOfficialStamp, playTacticalSwipe, playCleanUiClick,
 *  playDocumentaryPulse) so each sound has a genuinely different texture
 * and not just a reskinned BOOM.
 *
 *  Audit summary (what was already in the engine before this layer):
 *
 *    playLuxurySynth         ≈ 33 cues   (LUXURY_*, MERCATO_HIT, GOAL_HORN, …)
 *    playBroadcastPro        ≈ 30 cues   (BREAKING_*, TARGET_*, STADIUM_CHANT…)
 *    playPatternSynth        catch-all   (RESULTS_STING, QUOTE_SWEEP, …)
 *
 *  Those are kept untouched. This library is an additional layer that
 *  registers ~60 *new* keys with rich, distinct recipes. Existing keys
 *  are aliased here only when the new key would otherwise be ambiguous;
 *  no old key is removed or repurposed.
 */

// ─── Recipe primitives ──────────────────────────────────────────────────────
//
// Each generator is small and focused. They take a target AudioNode (the
// per-cue bus) plus the AudioContext + start time, and add a single
// distinctive layer. Combining 2–4 layers per recipe is what gives every
// cue its own personality.
//
export type Helper =
  | 'subImpact'        // deep low-end thud (28–55 Hz)
  | 'glassReveal'      // crystalline tone ascend
  | 'newsTicker'       // 2–3 short clicks like a teleprinter
  | 'stadiumBed'       // wide noise crowd swell
  | 'radarSweep'       // bandpass sweep, sonar feel
  | 'officialStamp'    // double thud like a paper stamp
  | 'tacticalSwipe'    // mid-frequency wipe (board pen)
  | 'cleanUiClick'     // very short digital blip
  | 'documentaryPulse' // slow heartbeat-style pulse
  | 'cinematicRise'    // long fast-rising tonal layer
  | 'cinematicDrop'    // descending sub drop
  | 'shortWhistle'     // referee whistle (short)
  | 'longWhistle'      // referee whistle (long)
  | 'crowdGasp'        // quick bandpass gasp
  | 'matchOpening'     // rising fanfare layer
  | 'cameraShutter'    // quick high-band noise click
  | 'archiveTape'      // tape transport whirr + click
  | 'caseFileOpen'     // soft mid-thud + paper rustle
  | 'evidenceMarker'   // single high ping
  | 'pressureZone'     // low rumble pulse
  | 'heatmapSweep'     // smooth lowpass sweep
  | 'formationSwitch'  // quick chord move
  | 'statPop'          // single mid blip
  | 'precisionClick'   // tight high-mid click
  | 'passMapDraw'      // soft slow rise + tail
  | 'modernSwipeLeft'  // wipe left (panned)
  | 'modernSwipeRight' // wipe right (panned)
  | 'glassWhoosh'      // glass-like high air sweep
  | 'digitalGlitch'    // 4–6 random square blips
  | 'cleanNotification'// 2-tone clean blip
  | 'panelOpen'        // upward pad
  | 'panelClose'       // downward pad
  | 'softLowerThird'   // very soft bass mix for under speech
  | 'sharpLowerThird'  // crisp accented lower third
  | 'finalConfirm'     // single deep stamp + tonal tail
  | 'outroHit'         // short conclusive thud
  | 'kickoffPulse'     // one-shot kick drum + horn
  | 'varCheck'         // tense low pulse + click
  | 'scoreboardTick'   // metallic click
  | 'finalWhistleDrama'// long whistle + low boom
  | 'goalImpactDeep'   // sub impact + crowd
  | 'goalStingerModern'// sub + brass-like riser
  | 'agentRing'        // phone ring tone
  | 'dealAdvancing'    // light upward pulse
  | 'sourceBlip'       // single soft chime
  | 'negotiationTick'  // metronomic tick
  | 'investigationPulse' // doc-style pulsing low
  | 'sourceReveal'     // upward chime + glass
  | 'seriousLowBoom'   // heavy slow boom
  | 'timelineStep'     // very short pip
  | 'storyTransition'  // soft swell
  | 'cinematicPause'   // breath / silence accent
  | 'liveUpdatePing'   // 2-tone alert
  | 'urgentPulse'      // short triple pulse
  | 'importantSoft'    // soft chime
  | 'matchdayOpening'  // big stadium swell + horn
  | 'xRayScan'         // high-band sweep
  | 'medicalScan';     // medical-style ping pattern

export type CueCategory =
  | 'featured'
  | 'news'
  | 'football'
  | 'mercato'
  | 'tactical'
  | 'report'
  | 'lowerthird'
  | 'cinematic'
  | 'experimental';

export type CueTag =
  | 'clean'
  | 'deep'
  | 'short'
  | 'intense'
  | 'official'
  | 'stadium'
  | 'transition'
  | 'newsroom'
  | 'mercato'
  | 'tactical'
  | 'report'
  | 'cinematic'
  | 'soft'
  | 'high-energy';

export type CueRecipe = {
  /** Sound key. Stable identifier, never changes. */
  key: string;
  /** Display label shown in pickers. */
  label: string;
  /** Display category. */
  category: CueCategory;
  /** Total duration in seconds. */
  duration: number;
  /** Output volume 0..1. */
  volume: number;
  /** Reverb send (0–0.25 max — kept low for broadcast). */
  reverb: number;
  /** Free-text tags for filter/search. */
  tags: CueTag[];
  /** Layered helper recipe. */
  layers: Array<{
    helper: Helper;
    /** Start offset within the cue in seconds. */
    at: number;
    /** Optional fundamental frequency in Hz. */
    freq?: number;
    /** Optional gain multiplier 0..1. */
    gain?: number;
    /** Optional duration override in seconds. */
    dur?: number;
    /** Optional stereo pan -1..1. */
    pan?: number;
  }>;
  /** True if this cue is for under-voice use (auto-ducks under spoken audio). */
  underVoice?: boolean;
};

// ─── The library — 60+ professionally distinct cues ─────────────────────────
//
// Conventions used to keep recipes genuinely different:
//  • "deep" = primary helper subImpact at 28–45 Hz, secondary tonal layer.
//  • "clean" = no subImpact; a single tonal layer + maybe one click.
//  • "intense" = subImpact + cinematicRise/glassWhoosh + crowd or pressure layer.
//  • "official" = officialStamp + a low tonal tail.
//  • Every recipe states its duration explicitly; engine fades cleanly.
//
export const SOUND_LIBRARY: CueRecipe[] = [
  // ═════════════════ NEWS / BREAKING ════════════════════════════════════════
  {
    key: 'NEWS_OPENER_DEEP', label: 'News Opener — Deep', category: 'news',
    duration: 1.4, volume: 0.85, reverb: 0.10, tags: ['deep', 'newsroom', 'intense'],
    layers: [
      { helper: 'cinematicRise', at: 0.00, freq: 90,  dur: 1.05, gain: 0.55 },
      { helper: 'subImpact',     at: 0.95, freq: 38,  dur: 0.45, gain: 1.05 },
      { helper: 'glassReveal',   at: 0.42, freq: 880, dur: 0.55, gain: 0.30 },
    ],
  },
  {
    key: 'NEWS_OPENER_CLEAN', label: 'News Opener — Clean', category: 'news',
    duration: 1.05, volume: 0.78, reverb: 0.06, tags: ['clean', 'newsroom'],
    layers: [
      { helper: 'newsTicker',  at: 0.00, gain: 0.55 },
      { helper: 'glassReveal', at: 0.32, freq: 1320, dur: 0.55, gain: 0.42 },
      { helper: 'panelOpen',   at: 0.45, freq: 220,  dur: 0.5,  gain: 0.30 },
    ],
  },
  {
    key: 'BREAKING_HIT_SHORT', label: 'Breaking Hit — Short', category: 'news',
    duration: 0.65, volume: 0.90, reverb: 0.08, tags: ['intense', 'short', 'newsroom'],
    layers: [
      { helper: 'subImpact',  at: 0.00, freq: 32, dur: 0.45, gain: 1.10 },
      { helper: 'glassWhoosh', at: 0.05, dur: 0.45, gain: 0.55 },
    ],
  },
  {
    key: 'BREAKING_HIT_LONG', label: 'Breaking Hit — Long', category: 'news',
    duration: 1.4, volume: 0.92, reverb: 0.10, tags: ['deep', 'intense', 'newsroom'],
    layers: [
      { helper: 'subImpact',     at: 0.00, freq: 30, dur: 0.55, gain: 1.15 },
      { helper: 'cinematicRise', at: 0.10, freq: 110, dur: 0.95, gain: 0.45 },
      { helper: 'glassWhoosh',   at: 0.20, dur: 1.0, gain: 0.40 },
    ],
  },
  {
    key: 'BREAKING_RISER_FAST', label: 'Breaking Riser — Fast', category: 'news',
    duration: 0.85, volume: 0.85, reverb: 0.08, tags: ['intense', 'short', 'transition'],
    layers: [
      { helper: 'cinematicRise', at: 0.00, freq: 120, dur: 0.7, gain: 0.6 },
      { helper: 'subImpact',     at: 0.65, freq: 36,  dur: 0.4, gain: 1.0 },
    ],
  },
  {
    key: 'BREAKING_RISER_SLOW', label: 'Breaking Riser — Slow', category: 'news',
    duration: 1.6, volume: 0.85, reverb: 0.10, tags: ['deep', 'cinematic', 'transition'],
    layers: [
      { helper: 'cinematicRise', at: 0.00, freq: 70, dur: 1.35, gain: 0.55 },
      { helper: 'pressureZone',  at: 0.10, freq: 50, dur: 1.30, gain: 0.40 },
      { helper: 'subImpact',     at: 1.30, freq: 32, dur: 0.30, gain: 1.10 },
    ],
  },
  {
    key: 'URGENT_PULSE', label: 'Urgent Pulse', category: 'news',
    duration: 1.1, volume: 0.80, reverb: 0.05, tags: ['intense', 'short', 'newsroom'],
    layers: [
      { helper: 'urgentPulse', at: 0.00, gain: 0.85 },
    ],
  },
  {
    key: 'NEWS_TICKER_CLEAN', label: 'News Ticker — Clean', category: 'news',
    duration: 0.45, volume: 0.55, reverb: 0.03, tags: ['clean', 'short', 'newsroom'],
    layers: [
      { helper: 'newsTicker', at: 0.00, gain: 0.55 },
    ],
  },
  {
    key: 'OFFICIAL_STAMP_DEEP', label: 'Official Stamp — Deep', category: 'news',
    duration: 0.85, volume: 0.92, reverb: 0.08, tags: ['official', 'deep', 'short'],
    layers: [
      { helper: 'officialStamp', at: 0.00, freq: 64, dur: 0.7, gain: 1.05 },
      { helper: 'subImpact',     at: 0.32, freq: 30, dur: 0.40, gain: 0.95 },
    ],
  },
  {
    key: 'OFFICIAL_CONFIRM', label: 'Official Confirm', category: 'news',
    duration: 0.95, volume: 0.85, reverb: 0.08, tags: ['official', 'clean'],
    layers: [
      { helper: 'officialStamp', at: 0.00, freq: 80, dur: 0.55, gain: 0.95 },
      { helper: 'glassReveal',   at: 0.45, freq: 1100, dur: 0.45, gain: 0.40 },
    ],
  },
  {
    key: 'IMPORTANT_ALERT_SOFT', label: 'Important Alert — Soft', category: 'news',
    duration: 0.85, volume: 0.65, reverb: 0.06, tags: ['soft', 'clean'],
    layers: [
      { helper: 'importantSoft',  at: 0.00, gain: 0.70 },
      { helper: 'cleanNotification', at: 0.40, gain: 0.55 },
    ],
  },
  {
    key: 'LIVE_UPDATE_PING', label: 'Live Update Ping', category: 'news',
    duration: 0.55, volume: 0.60, reverb: 0.04, tags: ['clean', 'short'],
    layers: [
      { helper: 'liveUpdatePing', at: 0.00, gain: 0.65 },
    ],
  },
];

// Append the rest in chunks below (file size kept manageable).

// ═════════════════ FOOTBALL MATCH ═════════════════════════════════════════
SOUND_LIBRARY.push(
  {
    key: 'STADIUM_RISE_REALISTIC', label: 'Stadium Rise — Realistic', category: 'football',
    duration: 2.4, volume: 0.78, reverb: 0.10, tags: ['stadium', 'high-energy', 'cinematic'],
    layers: [
      { helper: 'stadiumBed',    at: 0.00, dur: 2.20, gain: 0.55 },
      { helper: 'cinematicRise', at: 0.30, freq: 120, dur: 1.80, gain: 0.40 },
    ],
  },
  {
    key: 'STADIUM_CROWD_SWELL', label: 'Stadium Crowd Swell', category: 'football',
    duration: 1.9, volume: 0.72, reverb: 0.10, tags: ['stadium'],
    layers: [
      { helper: 'stadiumBed',  at: 0.00, dur: 1.75, gain: 0.62 },
      { helper: 'crowdGasp',   at: 0.85, gain: 0.45 },
    ],
  },
  {
    key: 'GOAL_STINGER_MODERN', label: 'Goal Stinger — Modern', category: 'football',
    duration: 1.6, volume: 0.92, reverb: 0.10, tags: ['intense', 'stadium', 'high-energy'],
    layers: [
      { helper: 'goalStingerModern', at: 0.00, gain: 0.95 },
      { helper: 'stadiumBed',        at: 0.20, dur: 1.35, gain: 0.45 },
    ],
  },
  {
    key: 'GOAL_IMPACT_DEEP', label: 'Goal Impact — Deep', category: 'football',
    duration: 1.4, volume: 0.95, reverb: 0.10, tags: ['deep', 'intense', 'stadium'],
    layers: [
      { helper: 'goalImpactDeep', at: 0.00, gain: 1.10 },
      { helper: 'stadiumBed',     at: 0.18, dur: 1.20, gain: 0.40 },
    ],
  },
  {
    key: 'WHISTLE_SHORT_CLEAN', label: 'Whistle — Short Clean', category: 'football',
    duration: 0.30, volume: 0.75, reverb: 0.04, tags: ['clean', 'short'],
    layers: [
      { helper: 'shortWhistle', at: 0.00, gain: 0.85 },
    ],
  },
  {
    key: 'WHISTLE_LONG_FINAL', label: 'Whistle — Long Final', category: 'football',
    duration: 1.0, volume: 0.85, reverb: 0.06, tags: ['intense'],
    layers: [
      { helper: 'longWhistle', at: 0.00, gain: 0.95 },
    ],
  },
  {
    key: 'KICKOFF_PULSE', label: 'Kickoff Pulse', category: 'football',
    duration: 1.1, volume: 0.85, reverb: 0.08, tags: ['stadium', 'high-energy'],
    layers: [
      { helper: 'kickoffPulse', at: 0.00, gain: 0.95 },
    ],
  },
  {
    key: 'VAR_CHECK_TENSION', label: 'VAR Check — Tension', category: 'football',
    duration: 1.6, volume: 0.78, reverb: 0.10, tags: ['intense', 'tactical'],
    layers: [
      { helper: 'varCheck', at: 0.00, gain: 0.85 },
    ],
  },
  {
    key: 'SCOREBOARD_TICK', label: 'Scoreboard Tick', category: 'football',
    duration: 0.18, volume: 0.50, reverb: 0.02, tags: ['clean', 'short'],
    layers: [
      { helper: 'scoreboardTick', at: 0.00, gain: 0.65 },
    ],
  },
  {
    key: 'MATCHDAY_OPENING', label: 'Matchday Opening', category: 'football',
    duration: 2.5, volume: 0.85, reverb: 0.12, tags: ['stadium', 'cinematic', 'high-energy'],
    layers: [
      { helper: 'matchdayOpening', at: 0.00, gain: 0.90 },
      { helper: 'stadiumBed',      at: 0.40, dur: 2.0, gain: 0.40 },
    ],
  },
  {
    key: 'CROWD_GASP', label: 'Crowd Gasp', category: 'football',
    duration: 1.2, volume: 0.65, reverb: 0.08, tags: ['stadium', 'short'],
    layers: [
      { helper: 'crowdGasp', at: 0.00, gain: 0.85 },
    ],
  },
  {
    key: 'FINAL_WHISTLE_DRAMA', label: 'Final Whistle — Drama', category: 'football',
    duration: 2.2, volume: 0.92, reverb: 0.10, tags: ['intense', 'cinematic'],
    layers: [
      { helper: 'finalWhistleDrama', at: 0.00, gain: 1.0 },
    ],
  },
);

// ═════════════════ MERCATO / TRANSFERS ═════════════════════════════════════
SOUND_LIBRARY.push(
  {
    key: 'HERE_WE_GO_BOOM', label: 'Here We Go — Boom', category: 'mercato',
    duration: 1.4, volume: 0.92, reverb: 0.10, tags: ['mercato', 'deep', 'intense'],
    layers: [
      { helper: 'cinematicRise', at: 0.00, freq: 90,  dur: 0.95, gain: 0.55 },
      { helper: 'subImpact',     at: 0.85, freq: 32,  dur: 0.45, gain: 1.20 },
      { helper: 'glassReveal',   at: 0.55, freq: 880, dur: 0.55, gain: 0.45 },
    ],
  },
  {
    key: 'TRANSFER_LOCK_DEEP', label: 'Transfer Lock — Deep', category: 'mercato',
    duration: 0.95, volume: 0.88, reverb: 0.08, tags: ['mercato', 'official', 'deep'],
    layers: [
      { helper: 'precisionClick', at: 0.00, gain: 0.55 },
      { helper: 'subImpact',      at: 0.10, freq: 36, dur: 0.55, gain: 1.05 },
      { helper: 'officialStamp',  at: 0.30, freq: 90, dur: 0.50, gain: 0.85 },
    ],
  },
  {
    key: 'TARGET_REVEAL_GLASS', label: 'Target Reveal — Glass', category: 'mercato',
    duration: 1.0, volume: 0.78, reverb: 0.10, tags: ['mercato', 'clean', 'soft'],
    layers: [
      { helper: 'glassReveal',  at: 0.00, freq: 660,  dur: 0.55, gain: 0.50 },
      { helper: 'glassReveal',  at: 0.30, freq: 1320, dur: 0.55, gain: 0.45 },
      { helper: 'glassReveal',  at: 0.55, freq: 1760, dur: 0.45, gain: 0.36 },
    ],
  },
  {
    key: 'TARGET_REVEAL_DARK', label: 'Target Reveal — Dark', category: 'mercato',
    duration: 1.05, volume: 0.82, reverb: 0.10, tags: ['mercato', 'deep', 'cinematic'],
    layers: [
      { helper: 'pressureZone', at: 0.00, freq: 56, dur: 0.85, gain: 0.55 },
      { helper: 'glassReveal',  at: 0.45, freq: 880, dur: 0.55, gain: 0.40 },
      { helper: 'subImpact',    at: 0.80, freq: 38, dur: 0.25, gain: 0.85 },
    ],
  },
  {
    key: 'MERCATO_RADAR_SCAN', label: 'Mercato Radar Scan', category: 'mercato',
    duration: 1.1, volume: 0.72, reverb: 0.08, tags: ['mercato', 'tactical'],
    layers: [
      { helper: 'radarSweep', at: 0.00, dur: 1.05, gain: 0.65 },
    ],
  },
  {
    key: 'AGENT_CALL_RING', label: 'Agent Call — Ring', category: 'mercato',
    duration: 1.6, volume: 0.72, reverb: 0.06, tags: ['mercato', 'soft'],
    layers: [
      { helper: 'agentRing', at: 0.00, gain: 0.80 },
    ],
  },
  {
    key: 'DEAL_ADVANCING_PULSE', label: 'Deal Advancing — Pulse', category: 'mercato',
    duration: 1.0, volume: 0.72, reverb: 0.06, tags: ['mercato', 'soft'],
    layers: [
      { helper: 'dealAdvancing', at: 0.00, gain: 0.75 },
    ],
  },
  {
    key: 'CONTRACT_STAMP_PRO', label: 'Contract Stamp — Pro', category: 'mercato',
    duration: 0.85, volume: 0.92, reverb: 0.08, tags: ['mercato', 'official'],
    layers: [
      { helper: 'officialStamp', at: 0.00, freq: 70, dur: 0.65, gain: 1.0 },
      { helper: 'subImpact',     at: 0.32, freq: 32, dur: 0.40, gain: 0.85 },
    ],
  },
  {
    key: 'MEDICAL_CHECK_SCAN', label: 'Medical Check — Scan', category: 'mercato',
    duration: 1.4, volume: 0.72, reverb: 0.08, tags: ['mercato', 'tactical', 'clean'],
    layers: [
      { helper: 'medicalScan', at: 0.00, gain: 0.75 },
    ],
  },
  {
    key: 'DEADLINE_DAY_TENSION', label: 'Deadline Day — Tension', category: 'mercato',
    duration: 1.6, volume: 0.82, reverb: 0.08, tags: ['mercato', 'intense'],
    layers: [
      { helper: 'investigationPulse', at: 0.00, dur: 1.55, gain: 0.85 },
    ],
  },
  {
    key: 'SOURCE_UPDATE_BLIP', label: 'Source Update — Blip', category: 'mercato',
    duration: 0.45, volume: 0.55, reverb: 0.04, tags: ['mercato', 'clean', 'short'],
    layers: [
      { helper: 'sourceBlip', at: 0.00, gain: 0.65 },
    ],
  },
  {
    key: 'NEGOTIATION_TICK', label: 'Negotiation Tick', category: 'mercato',
    duration: 0.95, volume: 0.55, reverb: 0.04, tags: ['mercato', 'soft'],
    layers: [
      { helper: 'negotiationTick', at: 0.00, gain: 0.60 },
    ],
  },
);

// ═════════════════ TACTICAL / ANALYSIS ═════════════════════════════════════
SOUND_LIBRARY.push(
  {
    key: 'TACTICAL_BOARD_SWIPE', label: 'Tactical Board Swipe', category: 'tactical',
    duration: 0.55, volume: 0.65, reverb: 0.06, tags: ['tactical', 'transition', 'short'],
    layers: [
      { helper: 'tacticalSwipe', at: 0.00, dur: 0.50, gain: 0.75 },
    ],
  },
  {
    key: 'DATA_SCAN_CLEAN', label: 'Data Scan — Clean', category: 'tactical',
    duration: 0.85, volume: 0.62, reverb: 0.04, tags: ['tactical', 'clean'],
    layers: [
      { helper: 'radarSweep', at: 0.00, dur: 0.80, gain: 0.55 },
    ],
  },
  {
    key: 'PLAYER_CARD_REVEAL', label: 'Player Card Reveal', category: 'tactical',
    duration: 0.95, volume: 0.78, reverb: 0.06, tags: ['tactical', 'clean'],
    layers: [
      { helper: 'tacticalSwipe', at: 0.00, dur: 0.45, gain: 0.50 },
      { helper: 'glassReveal',   at: 0.35, freq: 1080, dur: 0.55, gain: 0.45 },
    ],
  },
  {
    key: 'X_RAY_SCAN', label: 'X-Ray Scan', category: 'tactical',
    duration: 1.1, volume: 0.72, reverb: 0.06, tags: ['tactical', 'cinematic'],
    layers: [
      { helper: 'xRayScan', at: 0.00, gain: 0.80 },
    ],
  },
  {
    key: 'RADAR_PING', label: 'Radar Ping', category: 'tactical',
    duration: 0.45, volume: 0.55, reverb: 0.06, tags: ['tactical', 'short', 'clean'],
    layers: [
      { helper: 'evidenceMarker', at: 0.00, freq: 880, gain: 0.55 },
      { helper: 'evidenceMarker', at: 0.20, freq: 1320, gain: 0.45 },
    ],
  },
  {
    key: 'HEATMAP_SWEEP', label: 'Heatmap Sweep', category: 'tactical',
    duration: 0.95, volume: 0.62, reverb: 0.06, tags: ['tactical', 'soft'],
    layers: [
      { helper: 'heatmapSweep', at: 0.00, dur: 0.90, gain: 0.65 },
    ],
  },
  {
    key: 'FORMATION_SWITCH', label: 'Formation Switch', category: 'tactical',
    duration: 0.65, volume: 0.65, reverb: 0.04, tags: ['tactical', 'short'],
    layers: [
      { helper: 'formationSwitch', at: 0.00, gain: 0.70 },
    ],
  },
  {
    key: 'STAT_POP', label: 'Stat Pop', category: 'tactical',
    duration: 0.30, volume: 0.55, reverb: 0.03, tags: ['tactical', 'clean', 'short'],
    layers: [
      { helper: 'statPop', at: 0.00, gain: 0.60 },
    ],
  },
  {
    key: 'ANALYSIS_WHOOSH', label: 'Analysis Whoosh', category: 'tactical',
    duration: 0.85, volume: 0.65, reverb: 0.06, tags: ['tactical', 'transition'],
    layers: [
      { helper: 'glassWhoosh',   at: 0.00, dur: 0.85, gain: 0.55 },
      { helper: 'tacticalSwipe', at: 0.20, dur: 0.40, gain: 0.40 },
    ],
  },
  {
    key: 'PRECISION_CLICK', label: 'Precision Click', category: 'tactical',
    duration: 0.20, volume: 0.50, reverb: 0.03, tags: ['tactical', 'clean', 'short'],
    layers: [
      { helper: 'precisionClick', at: 0.00, gain: 0.55 },
    ],
  },
  {
    key: 'PASS_MAP_DRAW', label: 'Pass Map Draw', category: 'tactical',
    duration: 0.95, volume: 0.55, reverb: 0.05, tags: ['tactical', 'soft'],
    layers: [
      { helper: 'passMapDraw', at: 0.00, dur: 0.90, gain: 0.60 },
    ],
  },
  {
    key: 'PRESSURE_ZONE_PULSE', label: 'Pressure Zone Pulse', category: 'tactical',
    duration: 1.05, volume: 0.62, reverb: 0.06, tags: ['tactical', 'deep'],
    layers: [
      { helper: 'pressureZone', at: 0.00, freq: 50, dur: 1.0, gain: 0.65 },
    ],
  },
);

// ═════════════════ REPORTS / DOCUMENTARY ═══════════════════════════════════
SOUND_LIBRARY.push(
  {
    key: 'REPORT_INTRO_DARK', label: 'Report Intro — Dark', category: 'report',
    duration: 1.8, volume: 0.78, reverb: 0.10, tags: ['report', 'cinematic', 'deep'],
    layers: [
      { helper: 'pressureZone',   at: 0.00, freq: 45, dur: 1.6, gain: 0.55 },
      { helper: 'documentaryPulse', at: 0.20, dur: 1.4, gain: 0.40 },
      { helper: 'subImpact',      at: 1.45, freq: 30, dur: 0.30, gain: 0.85 },
    ],
  },
  {
    key: 'DOCUMENTARY_HIT', label: 'Documentary Hit', category: 'report',
    duration: 1.3, volume: 0.85, reverb: 0.08, tags: ['report', 'deep', 'cinematic'],
    layers: [
      { helper: 'subImpact',     at: 0.00, freq: 28, dur: 0.6, gain: 1.10 },
      { helper: 'cinematicRise', at: 0.10, freq: 80, dur: 1.10, gain: 0.40 },
    ],
  },
  {
    key: 'INVESTIGATION_PULSE', label: 'Investigation Pulse', category: 'report',
    duration: 1.6, volume: 0.70, reverb: 0.06, tags: ['report', 'soft', 'deep'],
    layers: [
      { helper: 'investigationPulse', at: 0.00, dur: 1.55, gain: 0.75 },
    ],
  },
  {
    key: 'SOURCE_REVEAL', label: 'Source Reveal', category: 'report',
    duration: 1.1, volume: 0.72, reverb: 0.08, tags: ['report', 'clean'],
    layers: [
      { helper: 'sourceReveal', at: 0.00, gain: 0.80 },
    ],
  },
  {
    key: 'ARCHIVE_TAPE_START', label: 'Archive Tape — Start', category: 'report',
    duration: 1.4, volume: 0.62, reverb: 0.04, tags: ['report', 'soft'],
    layers: [
      { helper: 'archiveTape', at: 0.00, gain: 0.65 },
    ],
  },
  {
    key: 'SERIOUS_LOW_BOOM', label: 'Serious Low Boom', category: 'report',
    duration: 1.6, volume: 0.92, reverb: 0.10, tags: ['report', 'deep', 'cinematic'],
    layers: [
      { helper: 'seriousLowBoom', at: 0.00, gain: 1.0 },
    ],
  },
  {
    key: 'TIMELINE_STEP', label: 'Timeline Step', category: 'report',
    duration: 0.20, volume: 0.45, reverb: 0.03, tags: ['report', 'clean', 'short'],
    layers: [
      { helper: 'timelineStep', at: 0.00, gain: 0.55 },
    ],
  },
  {
    key: 'STORY_TRANSITION', label: 'Story Transition', category: 'report',
    duration: 1.2, volume: 0.65, reverb: 0.08, tags: ['report', 'transition', 'soft'],
    layers: [
      { helper: 'storyTransition', at: 0.00, dur: 1.15, gain: 0.65 },
    ],
  },
  {
    key: 'CAMERA_SHUTTER_SOFT', label: 'Camera Shutter — Soft', category: 'report',
    duration: 0.30, volume: 0.50, reverb: 0.03, tags: ['report', 'short'],
    layers: [
      { helper: 'cameraShutter', at: 0.00, gain: 0.55 },
    ],
  },
  {
    key: 'CINEMATIC_PAUSE', label: 'Cinematic Pause', category: 'report',
    duration: 1.1, volume: 0.62, reverb: 0.06, tags: ['cinematic', 'soft'],
    layers: [
      { helper: 'cinematicPause', at: 0.00, gain: 0.65 },
    ],
  },
  {
    key: 'CASE_FILE_OPEN', label: 'Case File Open', category: 'report',
    duration: 0.85, volume: 0.65, reverb: 0.05, tags: ['report', 'soft'],
    layers: [
      { helper: 'caseFileOpen', at: 0.00, gain: 0.70 },
    ],
  },
  {
    key: 'EVIDENCE_MARKER', label: 'Evidence Marker', category: 'report',
    duration: 0.35, volume: 0.55, reverb: 0.04, tags: ['report', 'clean', 'short'],
    layers: [
      { helper: 'evidenceMarker', at: 0.00, freq: 1320, gain: 0.65 },
    ],
  },
);

// ═════════════════ LOWER THIRD / UI / TRANSITIONS ══════════════════════════
SOUND_LIBRARY.push(
  {
    key: 'LOWER_THIRD_SOFT', label: 'Lower Third — Soft', category: 'lowerthird',
    duration: 0.45, volume: 0.50, reverb: 0.03, tags: ['soft', 'short', 'clean'],
    underVoice: true,
    layers: [
      { helper: 'softLowerThird', at: 0.00, dur: 0.40, gain: 0.55 },
    ],
  },
  {
    key: 'LOWER_THIRD_SHARP', label: 'Lower Third — Sharp', category: 'lowerthird',
    duration: 0.40, volume: 0.62, reverb: 0.03, tags: ['clean', 'short'],
    underVoice: true,
    layers: [
      { helper: 'sharpLowerThird', at: 0.00, dur: 0.35, gain: 0.65 },
    ],
  },
  {
    key: 'MODERN_SWIPE_LEFT', label: 'Modern Swipe — Left', category: 'lowerthird',
    duration: 0.45, volume: 0.62, reverb: 0.03, tags: ['transition', 'short'],
    layers: [
      { helper: 'modernSwipeLeft', at: 0.00, dur: 0.45, gain: 0.65 },
    ],
  },
  {
    key: 'MODERN_SWIPE_RIGHT', label: 'Modern Swipe — Right', category: 'lowerthird',
    duration: 0.45, volume: 0.62, reverb: 0.03, tags: ['transition', 'short'],
    layers: [
      { helper: 'modernSwipeRight', at: 0.00, dur: 0.45, gain: 0.65 },
    ],
  },
  {
    key: 'GLASS_WHOOSH', label: 'Glass Whoosh', category: 'lowerthird',
    duration: 0.65, volume: 0.65, reverb: 0.05, tags: ['transition', 'clean'],
    layers: [
      { helper: 'glassWhoosh', at: 0.00, dur: 0.60, gain: 0.70 },
    ],
  },
  {
    key: 'DIGITAL_GLITCH_SHORT', label: 'Digital Glitch — Short', category: 'lowerthird',
    duration: 0.40, volume: 0.58, reverb: 0.03, tags: ['transition', 'short'],
    layers: [
      { helper: 'digitalGlitch', at: 0.00, gain: 0.60 },
    ],
  },
  {
    key: 'CLEAN_NOTIFICATION', label: 'Clean Notification', category: 'lowerthird',
    duration: 0.40, volume: 0.55, reverb: 0.03, tags: ['clean', 'short'],
    layers: [
      { helper: 'cleanNotification', at: 0.00, gain: 0.60 },
    ],
  },
  {
    key: 'LUXURY_SWEEP_PRO', label: 'Luxury Sweep — Pro', category: 'lowerthird',
    duration: 0.85, volume: 0.72, reverb: 0.06, tags: ['transition', 'cinematic'],
    layers: [
      { helper: 'glassWhoosh', at: 0.00, dur: 0.80, gain: 0.65 },
      { helper: 'tacticalSwipe', at: 0.20, dur: 0.55, gain: 0.45 },
    ],
  },
  {
    key: 'FINAL_CONFIRM', label: 'Final Confirm', category: 'lowerthird',
    duration: 0.85, volume: 0.85, reverb: 0.06, tags: ['official', 'short'],
    layers: [
      { helper: 'finalConfirm', at: 0.00, gain: 0.95 },
    ],
  },
  {
    key: 'OUTRO_HIT', label: 'Outro Hit', category: 'lowerthird',
    duration: 0.95, volume: 0.85, reverb: 0.08, tags: ['deep', 'short'],
    layers: [
      { helper: 'outroHit', at: 0.00, gain: 0.95 },
    ],
  },
  {
    key: 'PANEL_OPEN', label: 'Panel Open', category: 'lowerthird',
    duration: 0.55, volume: 0.55, reverb: 0.04, tags: ['transition', 'clean'],
    layers: [
      { helper: 'panelOpen', at: 0.00, dur: 0.50, gain: 0.60 },
    ],
  },
  {
    key: 'PANEL_CLOSE', label: 'Panel Close', category: 'lowerthird',
    duration: 0.55, volume: 0.55, reverb: 0.04, tags: ['transition', 'clean'],
    layers: [
      { helper: 'panelClose', at: 0.00, dur: 0.50, gain: 0.60 },
    ],
  },
);

// ═════════════════ FEATURED PICK (curated 8 cues) ══════════════════════════
// "Featured" is a virtual category — these keys also appear in their primary
// categories. The picker will show them at the top for quick access.
export const FEATURED_KEYS: string[] = [
  'NEWS_OPENER_DEEP',
  'BREAKING_HIT_SHORT',
  'OFFICIAL_STAMP_DEEP',
  'HERE_WE_GO_BOOM',
  'TRANSFER_LOCK_DEEP',
  'TARGET_REVEAL_GLASS',
  'STADIUM_RISE_REALISTIC',
  'TACTICAL_BOARD_SWIPE',
  'REPORT_INTRO_DARK',
  'LOWER_THIRD_SOFT',
  'GLASS_WHOOSH',
  'FINAL_CONFIRM',
];

// ═════════════════ CINEMATIC TRANSITIONS (extra polish) ════════════════════
SOUND_LIBRARY.push(
  {
    key: 'CINEMATIC_PULSE', label: 'Cinematic Pulse', category: 'cinematic',
    duration: 1.4, volume: 0.78, reverb: 0.10, tags: ['cinematic', 'deep'],
    layers: [
      { helper: 'documentaryPulse', at: 0.00, dur: 1.35, gain: 0.85 },
    ],
  },
  {
    key: 'CINEMATIC_DROP_DEEP', label: 'Cinematic Drop — Deep', category: 'cinematic',
    duration: 1.2, volume: 0.92, reverb: 0.10, tags: ['cinematic', 'deep', 'intense'],
    layers: [
      { helper: 'cinematicDrop', at: 0.00, gain: 1.0 },
    ],
  },
  {
    key: 'CINEMATIC_RISE_SLOW', label: 'Cinematic Rise — Slow', category: 'cinematic',
    duration: 1.6, volume: 0.78, reverb: 0.10, tags: ['cinematic', 'transition'],
    layers: [
      { helper: 'cinematicRise', at: 0.00, freq: 60, dur: 1.55, gain: 0.55 },
    ],
  },
);

// ═════════════════ EXPERIMENTAL ════════════════════════════════════════════
SOUND_LIBRARY.push(
  {
    key: 'NEWSROOM_TYPEWRITER', label: 'Newsroom Typewriter', category: 'experimental',
    duration: 0.85, volume: 0.55, reverb: 0.03, tags: ['newsroom', 'soft'],
    layers: [
      { helper: 'newsTicker', at: 0.00, gain: 0.55 },
      { helper: 'newsTicker', at: 0.30, gain: 0.45 },
      { helper: 'newsTicker', at: 0.55, gain: 0.40 },
    ],
  },
  {
    key: 'TACTICAL_PAD_LOW', label: 'Tactical Pad — Low', category: 'experimental',
    duration: 1.6, volume: 0.55, reverb: 0.06, tags: ['tactical', 'soft', 'deep'],
    layers: [
      { helper: 'pressureZone', at: 0.00, freq: 42, dur: 1.55, gain: 0.55 },
    ],
  },
);

// ═════════════════ Lookup helpers ══════════════════════════════════════════
const LIBRARY_BY_KEY = new Map<string, CueRecipe>();
for (const recipe of SOUND_LIBRARY) {
  LIBRARY_BY_KEY.set(recipe.key, recipe);
}

/** Get a recipe by key. Returns undefined if not in the new library. */
export const getRecipe = (key: string): CueRecipe | undefined => LIBRARY_BY_KEY.get(key);

/** Returns true when the engine should render this cue via the new library. */
export const isLibraryCue = (key: string): boolean => LIBRARY_BY_KEY.has(key);

/** All recipes; never mutate. */
export const getAllRecipes = (): readonly CueRecipe[] => SOUND_LIBRARY;

/** Recipes filtered by category. */
export const getRecipesByCategory = (category: CueCategory): CueRecipe[] =>
  SOUND_LIBRARY.filter(r => r.category === category);

/** All recipe keys (for the picker). */
export const getAllKeys = (): string[] => SOUND_LIBRARY.map(r => r.key);

/** Categories in display order. */
export const CATEGORY_ORDER: CueCategory[] = [
  'featured',
  'news',
  'football',
  'mercato',
  'tactical',
  'report',
  'lowerthird',
  'cinematic',
  'experimental',
];

export const CATEGORY_LABELS: Record<CueCategory, string> = {
  featured:     '⭐ Featured — موصى به',
  news:         '🚨 News & Breaking — أخبار',
  football:     '⚽ Football Match — مباراة',
  mercato:      '⚡ Mercato / Transfers — انتقالات',
  tactical:     '🎯 Tactical Analysis — تحليل تكتيكي',
  report:       '🎬 Reports & Documentary — تقارير',
  lowerthird:   '🪧 Lower Thirds & UI — أشرطة سفلية',
  cinematic:    '🎞️ Cinematic Transitions — انتقالات سينمائية',
  experimental: '🧪 Experimental — تجريبي',
};
