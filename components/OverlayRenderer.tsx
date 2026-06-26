import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import ElectionOverlay from './ElectionOverlay';
import { ELECTION_SOUND_IN_DEFAULTS, ELECTION_SOUND_OUT_DEFAULTS, resolveElectionStyle } from '../utils/election';
import { THEMES } from './renderers/OverlayConstants';
import { playCue, stopCue, setOverlayDuckGain } from '../services/audioEngine';
import { resolveTemplateAudio, recordDiagnostic } from '../utils/templateRuntime';
import { shouldPlayTemplateSound, shouldPlayVoiceCue } from '../utils/templateAudioGate';
import { resolveVoiceUrl } from '../utils/voiceLibrary';
import { RendererProps } from './renderers/SharedComponents';

// Renderers
import { LeaderboardRenderer } from './renderers/LeaderboardRenderer';
import { SmartNewsRenderer } from './renderers/SmartNewsRenderer';
import { StatementCardsRenderer } from './renderers/StatementCardsRenderer';
import { ScoreboardRenderer } from './renderers/ScoreboardRenderer';
import { TickerRenderer } from './renderers/TickerRenderer';
import { LowerThirdRenderer } from './renderers/LowerThirdRenderer';
import { ExclusiveAlertRenderer } from './renderers/ExclusiveAlertRenderer';
import { GuestsRenderer } from './renderers/GuestsRenderer';
import { SocialMediaRenderer } from './renderers/SocialMediaRenderer';
import { UclDrawRenderer } from './renderers/UclDrawRenderer';
import { TodaysEpisodeRenderer } from './renderers/TodaysEpisodeRenderer';
import { PlayerProfileRenderer } from './renderers/PlayerProfileRenderer';
import { TopViewersRenderer } from './renderers/TopViewersRenderer';
import { FootballPackageRenderer } from './renderers/FootballPackageRenderer';
import { H2HStatsRenderer } from './renderers/H2HStatsRenderer';
import { TransferNewsRenderer } from './renderers/TransferNewsRenderer';
import { BarcaPremiumRenderer } from './renderers/BarcaPremiumRenderer';
import { MatchStatsRenderer } from './renderers/MatchStatsRenderer';
import { PlayerStatsRenderer } from './renderers/PlayerStatsRenderer';
import { TransferTargetsRenderer } from './renderers/TransferTargetsRenderer';
import { BreakingHereWeGoRenderer } from './renderers/BreakingHereWeGoRenderer';
import {
  MercatoAgentCallRenderer,
  MercatoDealTimelineRenderer,
  MercatoBudgetTrackerRenderer,
  MercatoDeadlineDayRenderer,
  MercatoXRayRenderer,
} from './renderers/MercatoInnovativeRenderers';
import MercatoUnifiedRenderer from './renderers/MercatoUnifiedRenderer';
import MercatoMediaStoryRenderer from './renderers/MercatoMediaStoryRenderer';
import { PlayerIntelV2Renderer } from './renderers/PlayerIntelV2Renderer';
import { Mondial2026Renderer } from './renderers/Mondial2026Renderer';
import { MondialIraqRenderer } from './renderers/MondialIraqRenderer';

// ─── TV Animation Maps ────────────────────────────────────────────────────────
const ENTER: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]:      'tv-drop-in',
  [OverlayType.LOWER_THIRD]:     'tv-slide-left',
  [OverlayType.TICKER]:          'tv-slide-right',
  [OverlayType.ALERT]:           'tv-zoom-flash',
  [OverlayType.EXCLUSIVE_ALERT]: 'tv-zoom-flash',
  [OverlayType.SMART_NEWS]:      'tv-slide-up',
  [OverlayType.STATEMENT_CARDS]: 'tv-glass-sweep',
  [OverlayType.LEADERBOARD]:     'tv-slide-right',
  [OverlayType.GUESTS]:          'tv-slide-left',
  [OverlayType.UCL_DRAW]:        'tv-zoom-flash',
  [OverlayType.ELECTION]:        'tv-slide-up',
  [OverlayType.SOCIAL_MEDIA]:    'tv-slide-right',
  [OverlayType.TODAYS_EPISODE]:  'tv-zoom-flash',
  [OverlayType.PLAYER_PROFILE]:  'tv-slide-left',
  [OverlayType.TOP_VIEWERS]:     'tv-slide-left',
  [OverlayType.FOOTBALL_PACKAGE]: 'tv-stadium-sweep',
  [OverlayType.TRANSFER_NEWS]: 'tv-stadium-sweep',
  [OverlayType.PLAYER_STATS]: 'tv-stadium-sweep',
  [OverlayType.TRANSFER_TARGETS]: 'tv-slide-left',
  [OverlayType.BREAKING_HERE_WE_GO]: 'tv-zoom-flash',
  [OverlayType.MERCATO_AGENT_CALL]: 'tv-slide-right',
  [OverlayType.MERCATO_DEAL_TIMELINE]: 'tv-stadium-sweep',
  [OverlayType.MERCATO_BUDGET_TRACKER]: 'tv-data-rush',
  [OverlayType.MERCATO_DEADLINE_DAY]: 'tv-zoom-flash',
  [OverlayType.MERCATO_X_RAY]: 'tv-vertical-reveal',
  [OverlayType.H2H_STATS]: 'tv-data-rush',
  [OverlayType.MATCH_STATS]: 'tv-data-rush',
  [OverlayType.BARCA_PREMIUM]: 'tv-stadium-sweep',
  [OverlayType.PLAYER_INTEL_V2]: 'tv-stadium-sweep',
  [OverlayType.MERCATO_UNIFIED]: 'tv-stadium-sweep',
  [OverlayType.MERCATO_MEDIA_STORY]: 'tv-glass-sweep',
  [OverlayType.MONDIAL_LIVE]: 'tv-stadium-sweep',
  [OverlayType.MONDIAL_STATS]: 'tv-data-rush',
  [OverlayType.MONDIAL_RESULTS]: 'tv-mondial-stinger',
  [OverlayType.MONDIAL_QUOTES]: 'tv-slide-left',
  [OverlayType.MONDIAL_REPORTS]: 'tv-slide-up',
  [OverlayType.MONDIAL_ANALYSIS]: 'tv-stadium-sweep',
  [OverlayType.MONDIAL_STARS]: 'tv-slide-right',
  [OverlayType.MONDIAL_IRAQ]: 'tv-stadium-sweep',
};

const EXIT: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]:      'tv-drop-out',
  [OverlayType.LOWER_THIRD]:     'tv-slide-left-out',
  [OverlayType.TICKER]:          'tv-slide-right-out',
  [OverlayType.ALERT]:           'tv-zoom-out',
  [OverlayType.EXCLUSIVE_ALERT]: 'tv-zoom-out',
  [OverlayType.SMART_NEWS]:      'tv-slide-down-out',
  [OverlayType.STATEMENT_CARDS]: 'tv-glass-sweep-out',
  [OverlayType.LEADERBOARD]:     'tv-slide-right-out',
  [OverlayType.GUESTS]:          'tv-slide-left-out',
  [OverlayType.UCL_DRAW]:        'tv-zoom-out',
  [OverlayType.ELECTION]:        'tv-slide-down-out',
  [OverlayType.SOCIAL_MEDIA]:    'tv-slide-right-out',
  [OverlayType.TODAYS_EPISODE]:  'tv-zoom-out',
  [OverlayType.PLAYER_PROFILE]:  'tv-slide-left-out',
  [OverlayType.TOP_VIEWERS]:     'tv-slide-left-out',
  [OverlayType.FOOTBALL_PACKAGE]: 'tv-stadium-sweep-out',
  [OverlayType.TRANSFER_NEWS]: 'tv-stadium-sweep-out',
  [OverlayType.PLAYER_STATS]: 'tv-stadium-sweep-out',
  [OverlayType.TRANSFER_TARGETS]: 'tv-slide-left-out',
  [OverlayType.BREAKING_HERE_WE_GO]: 'tv-zoom-out',
  [OverlayType.MERCATO_AGENT_CALL]: 'tv-slide-right-out',
  [OverlayType.MERCATO_DEAL_TIMELINE]: 'tv-stadium-sweep-out',
  [OverlayType.MERCATO_BUDGET_TRACKER]: 'tv-data-rush-out',
  [OverlayType.MERCATO_DEADLINE_DAY]: 'tv-zoom-out',
  [OverlayType.MERCATO_X_RAY]: 'tv-vertical-reveal-out',
  [OverlayType.H2H_STATS]: 'tv-data-rush-out',
  [OverlayType.MATCH_STATS]: 'tv-data-rush-out',
  [OverlayType.BARCA_PREMIUM]: 'tv-stadium-sweep-out',
  [OverlayType.PLAYER_INTEL_V2]: 'tv-stadium-sweep-out',
  [OverlayType.MERCATO_UNIFIED]: 'tv-stadium-sweep-out',
  [OverlayType.MERCATO_MEDIA_STORY]: 'tv-glass-sweep-out',
  [OverlayType.MONDIAL_LIVE]: 'tv-stadium-sweep-out',
  [OverlayType.MONDIAL_STATS]: 'tv-data-rush-out',
  [OverlayType.MONDIAL_RESULTS]: 'tv-mondial-stinger-out',
  [OverlayType.MONDIAL_QUOTES]: 'tv-slide-left-out',
  [OverlayType.MONDIAL_REPORTS]: 'tv-slide-down-out',
  [OverlayType.MONDIAL_ANALYSIS]: 'tv-stadium-sweep-out',
  [OverlayType.MONDIAL_STARS]: 'tv-slide-right-out',
  [OverlayType.MONDIAL_IRAQ]: 'tv-stadium-sweep-out',
};

const DEFAULT_ENTER_KEY: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'SCOREBUG_SNAP',
  [OverlayType.LOWER_THIRD]: 'LOWER_THIRD_WIPE',
  [OverlayType.TICKER]: 'DATA_RUSH',
  [OverlayType.ALERT]: 'SPOTLIGHT_POP',
  [OverlayType.EXCLUSIVE_ALERT]: 'SPOTLIGHT_POP',
  [OverlayType.SMART_NEWS]: 'GLASS_SWEEP',
  [OverlayType.STATEMENT_CARDS]: 'GLASS_SWEEP',
  [OverlayType.LEADERBOARD]: 'VERTICAL_REVEAL',
  [OverlayType.GUESTS]: 'STADIUM_SWEEP',
  [OverlayType.UCL_DRAW]: 'STADIUM_SWEEP',
  [OverlayType.ELECTION]: 'DATA_RUSH',
  [OverlayType.SOCIAL_MEDIA]: 'GLASS_SWEEP',
  [OverlayType.TODAYS_EPISODE]: 'STADIUM_SWEEP',
  [OverlayType.PLAYER_PROFILE]: 'LOWER_THIRD_WIPE',
  [OverlayType.TOP_VIEWERS]: 'VERTICAL_REVEAL',
  [OverlayType.FOOTBALL_PACKAGE]: 'STADIUM_SWEEP',
  [OverlayType.TRANSFER_NEWS]: 'STADIUM_SWEEP',
  [OverlayType.PLAYER_STATS]: 'DATA_RUSH',
  [OverlayType.TRANSFER_TARGETS]: 'STADIUM_SWEEP',
  [OverlayType.BREAKING_HERE_WE_GO]: 'SPOTLIGHT_POP',
  [OverlayType.MERCATO_AGENT_CALL]: 'STADIUM_SWEEP',
  [OverlayType.MERCATO_DEAL_TIMELINE]: 'STADIUM_SWEEP',
  [OverlayType.MERCATO_BUDGET_TRACKER]: 'DATA_RUSH',
  [OverlayType.MERCATO_DEADLINE_DAY]: 'SPOTLIGHT_POP',
  [OverlayType.MERCATO_X_RAY]: 'VERTICAL_REVEAL',
  [OverlayType.H2H_STATS]: 'DATA_RUSH',
  [OverlayType.MATCH_STATS]: 'DATA_RUSH',
  [OverlayType.BARCA_PREMIUM]: 'STADIUM_SWEEP',
  [OverlayType.PLAYER_INTEL_V2]: 'STADIUM_SWEEP',
  [OverlayType.MERCATO_UNIFIED]: 'STADIUM_SWEEP',
  [OverlayType.MERCATO_MEDIA_STORY]: 'GLASS_SWEEP',
};

const DEFAULT_EXIT_KEY: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'SCOREBUG_SNAP_OUT',
  [OverlayType.LOWER_THIRD]: 'LOWER_THIRD_WIPE_OUT',
  [OverlayType.TICKER]: 'DATA_RUSH_OUT',
  [OverlayType.ALERT]: 'SPOTLIGHT_POP_OUT',
  [OverlayType.EXCLUSIVE_ALERT]: 'SPOTLIGHT_POP_OUT',
  [OverlayType.SMART_NEWS]: 'GLASS_SWEEP_OUT',
  [OverlayType.STATEMENT_CARDS]: 'GLASS_SWEEP_OUT',
  [OverlayType.LEADERBOARD]: 'VERTICAL_REVEAL_OUT',
  [OverlayType.GUESTS]: 'STADIUM_SWEEP_OUT',
  [OverlayType.UCL_DRAW]: 'STADIUM_SWEEP_OUT',
  [OverlayType.ELECTION]: 'DATA_RUSH_OUT',
  [OverlayType.SOCIAL_MEDIA]: 'GLASS_SWEEP_OUT',
  [OverlayType.TODAYS_EPISODE]: 'STADIUM_SWEEP_OUT',
  [OverlayType.PLAYER_PROFILE]: 'LOWER_THIRD_WIPE_OUT',
  [OverlayType.TOP_VIEWERS]: 'VERTICAL_REVEAL_OUT',
  [OverlayType.FOOTBALL_PACKAGE]: 'STADIUM_SWEEP_OUT',
  [OverlayType.TRANSFER_NEWS]: 'STADIUM_SWEEP_OUT',
  [OverlayType.PLAYER_STATS]: 'DATA_RUSH_OUT',
  [OverlayType.TRANSFER_TARGETS]: 'STADIUM_SWEEP_OUT',
  [OverlayType.BREAKING_HERE_WE_GO]: 'SPOTLIGHT_POP_OUT',
  [OverlayType.MERCATO_AGENT_CALL]: 'STADIUM_SWEEP_OUT',
  [OverlayType.MERCATO_DEAL_TIMELINE]: 'STADIUM_SWEEP_OUT',
  [OverlayType.MERCATO_BUDGET_TRACKER]: 'DATA_RUSH_OUT',
  [OverlayType.MERCATO_DEADLINE_DAY]: 'SPOTLIGHT_POP_OUT',
  [OverlayType.MERCATO_X_RAY]: 'VERTICAL_REVEAL_OUT',
  [OverlayType.H2H_STATS]: 'DATA_RUSH_OUT',
  [OverlayType.MATCH_STATS]: 'DATA_RUSH_OUT',
  [OverlayType.BARCA_PREMIUM]: 'STADIUM_SWEEP_OUT',
  [OverlayType.PLAYER_INTEL_V2]: 'STADIUM_SWEEP_OUT',
  [OverlayType.MERCATO_UNIFIED]: 'STADIUM_SWEEP_OUT',
  [OverlayType.MERCATO_MEDIA_STORY]: 'GLASS_SWEEP_OUT',
};

const ENTER_BY_KEY: Record<string, string> = {
  SCOREBUG_SNAP: 'tv-scorebug-snap',
  STADIUM_SWEEP: 'tv-stadium-sweep',
  LOWER_THIRD_WIPE: 'tv-lower-third-wipe',
  DATA_RUSH: 'tv-data-rush',
  VERTICAL_REVEAL: 'tv-vertical-reveal',
  SPOTLIGHT_POP: 'tv-spotlight-pop',
  GLASS_SWEEP: 'tv-glass-sweep',
  BROADCAST_FADE: 'tv-broadcast-fade',
  MONDIAL_STINGER: 'tv-mondial-stinger',
};

const EXIT_BY_KEY: Record<string, string> = {
  SCOREBUG_SNAP_OUT: 'tv-scorebug-snap-out',
  STADIUM_SWEEP_OUT: 'tv-stadium-sweep-out',
  LOWER_THIRD_WIPE_OUT: 'tv-lower-third-wipe-out',
  DATA_RUSH_OUT: 'tv-data-rush-out',
  VERTICAL_REVEAL_OUT: 'tv-vertical-reveal-out',
  SPOTLIGHT_POP_OUT: 'tv-spotlight-pop-out',
  GLASS_SWEEP_OUT: 'tv-glass-sweep-out',
  BROADCAST_FADE_OUT: 'tv-broadcast-fade-out',
  MONDIAL_STINGER_OUT: 'tv-mondial-stinger-out',
};

const EXIT_KEY_ALIASES: Record<string, string> = {
  BROADCAST_OUT: 'STADIUM_SWEEP_OUT',
  SOFT_FADE: 'BROADCAST_FADE_OUT',
  DEFAULT_OUT: 'STADIUM_SWEEP_OUT',
};

const SOUND_IN_DEFAULTS: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'SCOREBUG_SNAP',
  [OverlayType.LOWER_THIRD]: 'LOWER_THIRD_WIPE',
  [OverlayType.TICKER]: 'DATA_TICK',
  [OverlayType.ALERT]: 'IMPORTANT_PING',
  [OverlayType.EXCLUSIVE_ALERT]: 'IMPORTANT_PING',
  [OverlayType.SMART_NEWS]: 'LOWER_THIRD_WIPE',
  [OverlayType.STATEMENT_CARDS]: 'LOWER_THIRD_WIPE',
  [OverlayType.LEADERBOARD]: 'LOWER_THIRD_WIPE',
  [OverlayType.GUESTS]: 'LOWER_THIRD_WIPE',
  [OverlayType.UCL_DRAW]: 'LUXURY_SWEEP',
  [OverlayType.SOCIAL_MEDIA]: 'LOWER_THIRD_WIPE',
  [OverlayType.TODAYS_EPISODE]: 'BEFORE_THE_KICKOFF',
  [OverlayType.PLAYER_PROFILE]: 'LOWER_THIRD_WIPE',
  [OverlayType.TOP_VIEWERS]: 'DATA_TICK',
  [OverlayType.FOOTBALL_PACKAGE]: 'LUXURY_SWEEP',
  [OverlayType.TRANSFER_NEWS]: 'MERCATO_HIT',
  [OverlayType.H2H_STATS]: 'LOWER_THIRD_WIPE',
  [OverlayType.MATCH_STATS]: 'LOWER_THIRD_WIPE',
  [OverlayType.PLAYER_STATS]: 'LOWER_THIRD_WIPE',
  [OverlayType.BARCA_PREMIUM]: 'LUXURY_SWEEP',
  [OverlayType.TRANSFER_TARGETS]: 'TARGET_REVEAL',
  [OverlayType.BREAKING_HERE_WE_GO]: 'BREAKING_RISER',
  [OverlayType.MERCATO_AGENT_CALL]: 'AGENT_CALL',
  [OverlayType.MERCATO_DEAL_TIMELINE]: 'TARGET_REVEAL',
  [OverlayType.MERCATO_BUDGET_TRACKER]: 'CASH_REGISTER',
  [OverlayType.MERCATO_DEADLINE_DAY]: 'DEADLINE_ALARM',
  [OverlayType.MERCATO_X_RAY]: 'TARGET_SCAN',
  [OverlayType.PLAYER_INTEL_V2]: 'LOWER_THIRD_WIPE',
  [OverlayType.MERCATO_UNIFIED]: 'LOWER_THIRD_WIPE',
  [OverlayType.MERCATO_MEDIA_STORY]: 'LOWER_THIRD_WIPE',
  [OverlayType.MONDIAL_LIVE]: 'GLITCH_TRANSITION',
  [OverlayType.MONDIAL_STATS]: 'GLITCH_TRANSITION',
  [OverlayType.MONDIAL_RESULTS]: 'GLITCH_TRANSITION',
  [OverlayType.MONDIAL_QUOTES]: 'GLITCH_TRANSITION',
  [OverlayType.MONDIAL_REPORTS]: 'GLITCH_TRANSITION',
  [OverlayType.MONDIAL_ANALYSIS]: 'GLITCH_TRANSITION',
  [OverlayType.MONDIAL_STARS]: 'GLITCH_TRANSITION',
  [OverlayType.MONDIAL_IRAQ]: 'GLITCH_TRANSITION',
};

const SOUND_OUT_DEFAULTS: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'SOFT_FADE',
  [OverlayType.LOWER_THIRD]: 'SOFT_FADE',
  [OverlayType.TICKER]: 'SOFT_FADE',
  [OverlayType.ALERT]: 'SOFT_FADE',
  [OverlayType.EXCLUSIVE_ALERT]: 'SOFT_FADE',
  [OverlayType.SMART_NEWS]: 'SOFT_FADE',
  [OverlayType.STATEMENT_CARDS]: 'SOFT_FADE',
  [OverlayType.LEADERBOARD]: 'SOFT_FADE',
  [OverlayType.GUESTS]: 'SOFT_FADE',
  [OverlayType.UCL_DRAW]: 'SOFT_FADE',
  [OverlayType.ELECTION]: 'SOFT_FADE',
  [OverlayType.SOCIAL_MEDIA]: 'SOFT_FADE',
  [OverlayType.TODAYS_EPISODE]: 'SOFT_FADE',
  [OverlayType.PLAYER_PROFILE]: 'SOFT_FADE',
  [OverlayType.TOP_VIEWERS]: 'SOFT_FADE',
  [OverlayType.FOOTBALL_PACKAGE]: 'SOFT_FADE',
  [OverlayType.TRANSFER_NEWS]: 'SOFT_FADE',
  [OverlayType.H2H_STATS]: 'SOFT_FADE',
  [OverlayType.MATCH_STATS]: 'SOFT_FADE',
  [OverlayType.PLAYER_STATS]: 'SOFT_FADE',
  [OverlayType.BARCA_PREMIUM]: 'SOFT_FADE',
  [OverlayType.TRANSFER_TARGETS]: 'SOFT_FADE',
  [OverlayType.BREAKING_HERE_WE_GO]: 'SOFT_FADE',
  [OverlayType.MERCATO_AGENT_CALL]: 'SOFT_FADE',
  [OverlayType.MERCATO_DEAL_TIMELINE]: 'SOFT_FADE',
  [OverlayType.MERCATO_BUDGET_TRACKER]: 'SOFT_FADE',
  [OverlayType.MERCATO_DEADLINE_DAY]: 'SOFT_FADE',
  [OverlayType.MERCATO_X_RAY]: 'SOFT_FADE',
  [OverlayType.PLAYER_INTEL_V2]: 'SOFT_FADE',
  [OverlayType.MERCATO_UNIFIED]: 'SOFT_FADE',
  [OverlayType.MERCATO_MEDIA_STORY]: 'SOFT_FADE',
  [OverlayType.MONDIAL_LIVE]: 'DIGITAL_SWEEP',
  [OverlayType.MONDIAL_STATS]: 'DIGITAL_SWEEP',
  [OverlayType.MONDIAL_RESULTS]: 'DIGITAL_SWEEP',
  [OverlayType.MONDIAL_QUOTES]: 'DIGITAL_SWEEP',
  [OverlayType.MONDIAL_REPORTS]: 'DIGITAL_SWEEP',
  [OverlayType.MONDIAL_ANALYSIS]: 'DIGITAL_SWEEP',
  [OverlayType.MONDIAL_STARS]: 'DIGITAL_SWEEP',
  [OverlayType.MONDIAL_IRAQ]: 'DIGITAL_SWEEP',
};

const MONDIAL_TYPES = new Set<OverlayType>([
  OverlayType.MONDIAL_LIVE,
  OverlayType.MONDIAL_STATS,
  OverlayType.MONDIAL_RESULTS,
  OverlayType.MONDIAL_QUOTES,
  OverlayType.MONDIAL_REPORTS,
  OverlayType.MONDIAL_ANALYSIS,
  OverlayType.MONDIAL_STARS,
  OverlayType.MONDIAL_IRAQ,
]);

type MondialMotionPreset = {
  transitionIn: string;
  transitionOut: string;
  soundInStyle: string;
  soundOutStyle: string;
  audioUpdateCue: string;
};

const MONDIAL_MOTION_PRESETS: Record<string, MondialMotionPreset> = {
  reference_stinger: {
    transitionIn: 'MONDIAL_STINGER',
    transitionOut: 'MONDIAL_STINGER_OUT',
    soundInStyle: 'DIGITAL_SWEEP',
    soundOutStyle: 'BROADCAST_OUT',
    audioUpdateCue: 'DIGITAL_SWEEP',
  },
  scorebug_snap: {
    transitionIn: 'SCOREBUG_SNAP',
    transitionOut: 'SCOREBUG_SNAP_OUT',
    soundInStyle: 'SCOREBUG_SNAP',
    soundOutStyle: 'DIGITAL_SWEEP',
    audioUpdateCue: 'SCOREBUG_SNAP',
  },
  group_wall_rush: {
    transitionIn: 'DATA_RUSH',
    transitionOut: 'DATA_RUSH_OUT',
    soundInStyle: 'DATA_SLAM',
    soundOutStyle: 'DIGITAL_SWEEP',
    audioUpdateCue: 'DATA_TICK',
  },
  stadium_sweep: {
    transitionIn: 'STADIUM_SWEEP',
    transitionOut: 'STADIUM_SWEEP_OUT',
    soundInStyle: 'STADIUM_WHOOSH',
    soundOutStyle: 'BROADCAST_OUT',
    audioUpdateCue: 'DATA_TICK',
  },
  glass_sweep: {
    transitionIn: 'GLASS_SWEEP',
    transitionOut: 'GLASS_SWEEP_OUT',
    soundInStyle: 'DIGITAL_SWEEP',
    soundOutStyle: 'SOFT_FADE',
    audioUpdateCue: 'DIGITAL_SWEEP',
  },
  spotlight_pop: {
    transitionIn: 'SPOTLIGHT_POP',
    transitionOut: 'SPOTLIGHT_POP_OUT',
    soundInStyle: 'TROPHY_FANFARE',
    soundOutStyle: 'BROADCAST_OUT',
    audioUpdateCue: 'SCOREBUG_SNAP',
  },
  side_wipe: {
    transitionIn: 'LOWER_THIRD_WIPE',
    transitionOut: 'LOWER_THIRD_WIPE_OUT',
    soundInStyle: 'LOWER_THIRD_WIPE',
    soundOutStyle: 'SOFT_FADE',
    audioUpdateCue: 'DATA_TICK',
  },
  story_glitch: {
    transitionIn: 'GLASS_SWEEP',
    transitionOut: 'GLASS_SWEEP_OUT',
    soundInStyle: 'GLITCH_TRANSITION',
    soundOutStyle: 'SOFT_FADE',
    audioUpdateCue: 'GLITCH_TRANSITION',
  },
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
};

const CSS = `
  @keyframes tvDropIn     { from{transform:translateY(-80px) scaleY(.6);opacity:0;filter:blur(6px)} 60%{transform:translateY(8px) scaleY(1.02);opacity:1;filter:blur(0)} to{transform:translateY(0) scaleY(1);opacity:1} }
  @keyframes tvSlideLeft  { from{transform:translateX(-120px) scale(.95);opacity:0;filter:blur(4px)} 70%{transform:translateX(6px) scale(1.01);opacity:1;filter:blur(0)} to{transform:translateX(0) scale(1);opacity:1} }
  @keyframes tvSlideRight { from{transform:translateX(120px) scale(.95);opacity:0;filter:blur(4px)} 70%{transform:translateX(-6px) scale(1.01);opacity:1;filter:blur(0)} to{transform:translateX(0) scale(1);opacity:1} }
  @keyframes tvSlideUp    { from{transform:translateY(80px) scale(.96);opacity:0;filter:blur(4px)} 70%{transform:translateY(-4px) scale(1.01);opacity:1;filter:blur(0)} to{transform:translateY(0) scale(1);opacity:1} }
  @keyframes tvZoomFlash  { 0%{transform:scale(.7);opacity:0;filter:brightness(3) blur(8px)} 50%{transform:scale(1.04);opacity:1;filter:brightness(1.3) blur(0)} to{transform:scale(1);opacity:1;filter:brightness(1)} }

  @keyframes tvDropOut      { from{transform:translateY(0);opacity:1}        to{transform:translateY(-100px) scaleY(.5);opacity:0;filter:blur(6px)} }
  @keyframes tvSlideLeftOut { from{transform:translateX(0);opacity:1}        to{transform:translateX(-140px) scale(.92);opacity:0;filter:blur(4px)} }
  @keyframes tvSlideRightOut{ from{transform:translateX(0);opacity:1}        to{transform:translateX(140px) scale(.92);opacity:0;filter:blur(4px)} }
  @keyframes tvSlideDownOut { from{transform:translateY(0);opacity:1}        to{transform:translateY(100px) scale(.94);opacity:0;filter:blur(4px)} }
  @keyframes tvZoomOut      { from{transform:scale(1);opacity:1;filter:brightness(1)} 40%{transform:scale(1.06);filter:brightness(1.5)} to{transform:scale(.5);opacity:0;filter:brightness(3) blur(8px)} }

  @keyframes tvScorebugSnap      { 0%{transform:translateY(-42px) scale(.92);opacity:0;filter:blur(8px)} 62%{transform:translateY(4px) scale(1.015);opacity:1;filter:blur(0)} 100%{transform:translateY(0) scale(1);opacity:1} }
  @keyframes tvStadiumSweep      { 0%{transform:translateX(18%) skewX(-8deg);opacity:0;filter:blur(10px) brightness(1.4)} 70%{transform:translateX(-1.5%) skewX(0);opacity:1;filter:blur(0) brightness(1.08)} 100%{transform:translateX(0);opacity:1;filter:brightness(1)} }
  @keyframes tvLowerThirdWipe    { 0%{clip-path:inset(0 100% 0 0);transform:translateX(32px);opacity:.65} 100%{clip-path:inset(0 0 0 0);transform:translateX(0);opacity:1} }
  @keyframes tvDataRush          { 0%{transform:translateY(64px) scaleX(.94);opacity:0;filter:blur(8px)} 55%{opacity:1} 100%{transform:translateY(0) scaleX(1);opacity:1;filter:blur(0)} }
  @keyframes tvVerticalReveal    { 0%{clip-path:inset(100% 0 0 0);transform:translateY(20px);opacity:.35} 100%{clip-path:inset(0 0 0 0);transform:translateY(0);opacity:1} }
  @keyframes tvSpotlightPop      { 0%{transform:scale(.82);opacity:0;filter:blur(16px) brightness(2.2)} 58%{transform:scale(1.045);opacity:1;filter:blur(0) brightness(1.35)} 100%{transform:scale(1);opacity:1;filter:brightness(1)} }
  @keyframes tvGlassSweep        { 0%{transform:translateY(28px) scale(.985);opacity:0;backdrop-filter:blur(0);filter:blur(10px)} 100%{transform:translateY(0) scale(1);opacity:1;filter:blur(0)} }
  @keyframes tvBroadcastFade     { 0%{opacity:0;filter:blur(8px)} 100%{opacity:1;filter:blur(0)} }
  @keyframes tvMondialStinger    { 0%,26%{clip-path:polygon(0 0,0 0,0 100%,0 100%);transform:translateX(-5%) skewX(-4deg) scale(1.035);opacity:0;filter:blur(14px) brightness(1.8) saturate(1.45)} 50%{clip-path:polygon(0 0,46% 0,68% 100%,0 100%);opacity:.55;filter:blur(7px) brightness(1.45) saturate(1.34)} 74%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);transform:translateX(1.5%) skewX(1deg) scale(1.012);opacity:1;filter:blur(0) brightness(1.14)} 100%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);transform:translateX(0) skewX(0) scale(1);opacity:1;filter:brightness(1)} }
  @keyframes tvMondialStingerOut { 0%,26%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);transform:translateX(0) skewX(0) scale(1);opacity:1;filter:brightness(1)} 56%{clip-path:polygon(16% 0,100% 0,100% 100%,0 100%);transform:translateX(-1.5%) skewX(-2deg) scale(1.015);opacity:.72;filter:brightness(1.35) saturate(1.34)} 100%{clip-path:polygon(100% 0,100% 0,100% 100%,100% 100%);transform:translateX(8%) skewX(7deg) scale(1.04);opacity:0;filter:blur(14px) brightness(1.75)} }
  @keyframes tvMondialReferenceCoverIn { 0%{transform:translateX(-126%) skewX(-14deg) scaleX(1.08);opacity:0;clip-path:polygon(0 0,0 0,0 100%,0 100%)} 14%{opacity:1} 34%{transform:translateX(-18%) skewX(-10deg) scaleX(1.12);clip-path:polygon(0 0,100% 0,90% 100%,0 100%)} 56%{transform:translateX(0) skewX(-2deg) scaleX(1.06);clip-path:polygon(-8% 0,108% 0,100% 100%,0 100%)} 80%{transform:translateX(72%) skewX(-10deg) scaleX(1.12);opacity:1;clip-path:polygon(14% 0,100% 0,100% 100%,0 100%)} 100%{transform:translateX(126%) skewX(-14deg) scaleX(1.08);opacity:0;clip-path:polygon(100% 0,100% 0,100% 100%,100% 100%)} }
  @keyframes tvMondialReferenceCoverOut { 0%{transform:translateX(126%) skewX(14deg) scaleX(1.08);opacity:0;clip-path:polygon(100% 0,100% 0,100% 100%,100% 100%)} 16%{opacity:1} 42%{transform:translateX(16%) skewX(10deg) scaleX(1.12);clip-path:polygon(0 0,100% 0,100% 100%,10% 100%)} 64%{transform:translateX(0) skewX(2deg) scaleX(1.06);clip-path:polygon(-8% 0,108% 0,100% 100%,0 100%)} 84%{transform:translateX(-72%) skewX(10deg) scaleX(1.12);opacity:1;clip-path:polygon(0 0,86% 0,100% 100%,0 100%)} 100%{transform:translateX(-126%) skewX(14deg) scaleX(1.08);opacity:0;clip-path:polygon(0 0,0 0,0 100%,0 100%)} }
  @keyframes tvMondialStingerBars { 0%{transform:translateX(-135%) skewX(-18deg);opacity:0} 18%{opacity:.95} 58%{opacity:.85} 100%{transform:translateX(135%) skewX(-18deg);opacity:0} }

  @keyframes tvScorebugSnapOut   { from{transform:translateY(0) scale(1);opacity:1} to{transform:translateY(-40px) scale(.92);opacity:0;filter:blur(8px)} }
  @keyframes tvStadiumSweepOut   { from{transform:translateX(0);opacity:1} to{transform:translateX(-18%) skewX(8deg);opacity:0;filter:blur(10px)} }
  @keyframes tvLowerThirdWipeOut { from{clip-path:inset(0 0 0 0);transform:translateX(0);opacity:1} to{clip-path:inset(0 0 0 100%);transform:translateX(-36px);opacity:.2} }
  @keyframes tvDataRushOut       { from{transform:translateY(0) scaleX(1);opacity:1} to{transform:translateY(64px) scaleX(.94);opacity:0;filter:blur(8px)} }
  @keyframes tvVerticalRevealOut { from{clip-path:inset(0 0 0 0);transform:translateY(0);opacity:1} to{clip-path:inset(100% 0 0 0);transform:translateY(20px);opacity:0} }
  @keyframes tvSpotlightPopOut   { from{transform:scale(1);opacity:1;filter:brightness(1)} 40%{transform:scale(1.04);filter:brightness(1.5)} to{transform:scale(.82);opacity:0;filter:blur(16px) brightness(2)} }
  @keyframes tvGlassSweepOut     { from{transform:translateY(0) scale(1);opacity:1} to{transform:translateY(28px) scale(.985);opacity:0;filter:blur(10px)} }
  @keyframes tvBroadcastFadeOut  { from{opacity:1;filter:blur(0)} to{opacity:0;filter:blur(8px)} }

  .tv-drop-in        { animation: tvDropIn        var(--tv-enter-speed, .65s) cubic-bezier(.22,1,.36,1) both }
  .tv-slide-left     { animation: tvSlideLeft     var(--tv-enter-speed, .65s) cubic-bezier(.22,1,.36,1) both }
  .tv-slide-right    { animation: tvSlideRight    var(--tv-enter-speed, .65s) cubic-bezier(.22,1,.36,1) both }
  .tv-slide-up       { animation: tvSlideUp       var(--tv-enter-speed, .65s) cubic-bezier(.22,1,.36,1) both }
  .tv-zoom-flash     { animation: tvZoomFlash     var(--tv-enter-speed, .65s) cubic-bezier(.22,1,.36,1) both }

  .tv-drop-out       { animation: tvDropOut       var(--tv-exit-speed, .55s) ease-in both }
  .tv-slide-left-out { animation: tvSlideLeftOut  var(--tv-exit-speed, .55s) ease-in both }
  .tv-slide-right-out{ animation: tvSlideRightOut var(--tv-exit-speed, .55s) ease-in both }
  .tv-slide-down-out { animation: tvSlideDownOut  var(--tv-exit-speed, .55s) ease-in both }
  .tv-zoom-out       { animation: tvZoomOut       var(--tv-exit-speed, .55s) ease-in both }

  .tv-scorebug-snap      { animation: tvScorebugSnap      var(--tv-enter-speed, .52s) cubic-bezier(.18,1,.32,1) both }
  .tv-stadium-sweep      { animation: tvStadiumSweep      var(--tv-enter-speed, .72s) cubic-bezier(.18,1,.32,1) both }
  .tv-lower-third-wipe   { animation: tvLowerThirdWipe    var(--tv-enter-speed, .62s) cubic-bezier(.22,1,.36,1) both }
  .tv-data-rush          { animation: tvDataRush          var(--tv-enter-speed, .6s) cubic-bezier(.22,1,.36,1) both }
  .tv-vertical-reveal    { animation: tvVerticalReveal    var(--tv-enter-speed, .68s) cubic-bezier(.22,1,.36,1) both }
  .tv-spotlight-pop      { animation: tvSpotlightPop      var(--tv-enter-speed, .58s) cubic-bezier(.18,1,.32,1) both }
  .tv-glass-sweep        { animation: tvGlassSweep        var(--tv-enter-speed, .7s) cubic-bezier(.22,1,.36,1) both }
  .tv-broadcast-fade     { animation: tvBroadcastFade     var(--tv-enter-speed, .5s) ease-out both }
  .tv-mondial-stinger    { position:relative; isolation:isolate; animation: tvMondialStinger var(--tv-enter-speed, .98s) cubic-bezier(.16,1,.3,1) both }
  .tv-mondial-stinger::before { content:''; position:absolute; inset:-18% -24%; z-index:5; pointer-events:none; background:linear-gradient(90deg,#03040a 0 18%,rgba(5,6,14,.98) 18% 100%),radial-gradient(circle at 30% 52%,rgba(255,255,255,.16),transparent 34%); box-shadow:inset 0 0 90px rgba(255,255,255,.12); animation:tvMondialReferenceCoverIn var(--tv-enter-speed, .98s) cubic-bezier(.16,1,.3,1) both }
  .tv-mondial-stinger::after { content:''; position:absolute; inset:-14%; z-index:6; pointer-events:none; background:linear-gradient(90deg,transparent 0 16%,rgba(255,23,56,.94) 16% 24%,transparent 24% 32%,rgba(182,255,0,.9) 32% 43%,transparent 43% 52%,rgba(12,232,207,.9) 52% 63%,transparent 63% 100%),repeating-linear-gradient(90deg,transparent 0 34px,rgba(255,255,255,.13) 34px 36px); mix-blend-mode:screen; animation:tvMondialStingerBars var(--tv-enter-bar-speed, .84s) cubic-bezier(.16,1,.3,1) both }

  .tv-scorebug-snap-out      { animation: tvScorebugSnapOut      var(--tv-exit-speed, .45s) ease-in both }
  .tv-stadium-sweep-out      { animation: tvStadiumSweepOut      var(--tv-exit-speed, .55s) ease-in both }
  .tv-lower-third-wipe-out   { animation: tvLowerThirdWipeOut    var(--tv-exit-speed, .5s) ease-in both }
  .tv-data-rush-out          { animation: tvDataRushOut          var(--tv-exit-speed, .48s) ease-in both }
  .tv-vertical-reveal-out    { animation: tvVerticalRevealOut    var(--tv-exit-speed, .5s) ease-in both }
  .tv-spotlight-pop-out      { animation: tvSpotlightPopOut      var(--tv-exit-speed, .48s) ease-in both }
  .tv-glass-sweep-out        { animation: tvGlassSweepOut        var(--tv-exit-speed, .5s) ease-in both }
  .tv-broadcast-fade-out     { animation: tvBroadcastFadeOut     var(--tv-exit-speed, .42s) ease-in both }
  .tv-mondial-stinger-out    { position:relative; isolation:isolate; animation: tvMondialStingerOut var(--tv-exit-speed, .72s) cubic-bezier(.7,0,.84,0) both }
  .tv-mondial-stinger-out::before { content:''; position:absolute; inset:-18% -24%; z-index:5; pointer-events:none; background:linear-gradient(90deg,#03040a 0 18%,rgba(5,6,14,.98) 18% 100%),radial-gradient(circle at 70% 50%,rgba(255,255,255,.16),transparent 34%); box-shadow:inset 0 0 90px rgba(255,255,255,.12); animation:tvMondialReferenceCoverOut var(--tv-exit-speed, .72s) cubic-bezier(.7,0,.84,0) both }
  .tv-mondial-stinger-out::after { content:''; position:absolute; inset:-14%; z-index:6; pointer-events:none; background:linear-gradient(90deg,transparent 0 14%,rgba(12,232,207,.9) 14% 24%,transparent 24% 34%,rgba(255,47,159,.9) 34% 45%,transparent 45% 56%,rgba(182,255,0,.86) 56% 66%,transparent 66% 100%),repeating-linear-gradient(90deg,transparent 0 34px,rgba(255,255,255,.13) 34px 36px); mix-blend-mode:screen; animation:tvMondialStingerBars var(--tv-exit-bar-speed, .58s) cubic-bezier(.7,0,.84,0) reverse both }

  @media (prefers-reduced-motion: reduce) {
    .tv-drop-in, .tv-slide-left, .tv-slide-right, .tv-slide-up, .tv-zoom-flash,
    .tv-drop-out, .tv-slide-left-out, .tv-slide-right-out, .tv-slide-down-out, .tv-zoom-out,
    .tv-scorebug-snap, .tv-stadium-sweep, .tv-lower-third-wipe, .tv-data-rush,
    .tv-vertical-reveal, .tv-spotlight-pop, .tv-glass-sweep, .tv-broadcast-fade, .tv-mondial-stinger,
    .tv-scorebug-snap-out, .tv-stadium-sweep-out, .tv-lower-third-wipe-out,
    .tv-data-rush-out, .tv-vertical-reveal-out, .tv-spotlight-pop-out,
    .tv-glass-sweep-out, .tv-broadcast-fade-out, .tv-mondial-stinger-out {
      animation-duration: 1ms !important;
    }
  }
`;

interface OverlayRendererProps {
  config: OverlayConfig;
  chromaKey?: boolean;
  isEditor?: boolean;
  editorPreviewPhase?: 'IN' | 'OUT' | 'HOLD';
  editorPreviewKey?: number;
  editorPreviewAudio?: boolean;
}

const RUNTIME_UPDATE_IGNORED_FIELDS = new Set([
  'scale',
  'positionX',
  'positionY',
  'transitionIn',
  'transitionOut',
  'transitionEffect',
  'soundEnabled',
  'soundVolume',
  'soundInStyle',
  'soundOutStyle',
  'audioUpdateCue',
  'duckSfx',
  'voiceLibraryId',
  'voiceDirectUrl',
  'voiceVolume',
  'voiceTrigger',
  'broadcastMotion',
  'broadcastQuality',
  'broadcastLook',
  'broadcastStyle',
  'broadcastPalette',
  'mondialTheme',
  'mondialMotionPreset',
  'transitionSpeedMs',
  'transitionIntensity',
  'chromaKey',
]);

const OverlayRenderer: React.FC<OverlayRendererProps> = ({
  config,
  chromaKey,
  isEditor = false,
  editorPreviewPhase = 'HOLD',
  editorPreviewKey = 0,
  editorPreviewAudio = true,
}) => {
  const getField = (id: string) => config.fields.find(f => f.id === id)?.value;
  const hasField = (id: string) => config.fields.some(f => f.id === id);
  
  const scale = Number(getField('scale') || 1);
  const posX = Number(getField('positionX') || 0);
  const posY = Number(getField('positionY') || 0);
  const soundVolume = Number(getField('soundVolume') ?? 0.7);
  const isMondialTemplate = MONDIAL_TYPES.has(config.type);
  const mondialMotionEnabled = !isMondialTemplate || Boolean(getField('broadcastMotion') ?? true);
  const transitionSpeedMs = isMondialTemplate
      ? clampNumber(getField('transitionSpeedMs'), 980, 360, 1500)
      : 650;
  const exitTransitionMs = isMondialTemplate
      ? Math.max(260, Math.round(transitionSpeedMs * 0.72))
      : 550;
  const mondialExitHoldMs = mondialMotionEnabled ? exitTransitionMs + 140 : 40;
  const editorExitHoldMs = isMondialTemplate ? mondialExitHoldMs : 650;
  const runtimeExitHoldMs = isMondialTemplate ? mondialExitHoldMs : 600;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Animation state
  const [mounted, setMounted] = useState(isEditor || config.isVisible);
  const [animCls, setAnimCls] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [wasVisible, setWasVisible] = useState(isEditor || config.isVisible);

  const resolveMondialMotionPreset = (): MondialMotionPreset | null => {
      if (!isMondialTemplate || !hasField('mondialMotionPreset')) return null;
      const key = String(getField('mondialMotionPreset') || 'reference_stinger');
      if (!key || key === 'custom') return null;
      return MONDIAL_MOTION_PRESETS[key] || MONDIAL_MOTION_PRESETS.reference_stinger;
  };

  const resolveEnterClass = () => {
      if (!mondialMotionEnabled) return '';
      const selected = resolveMondialMotionPreset()?.transitionIn || String(getField('transitionIn') || 'DEFAULT');
      const key = selected === 'DEFAULT' ? DEFAULT_ENTER_KEY[config.type] : selected;
      return (key && ENTER_BY_KEY[key]) || ENTER[config.type] || 'tv-slide-up';
  };

  const resolveExitClass = () => {
      if (!mondialMotionEnabled) return '';
      const selected = resolveMondialMotionPreset()?.transitionOut || String(getField('transitionOut') || 'DEFAULT');
      const normalized = EXIT_KEY_ALIASES[selected] || selected;
      const key = normalized === 'DEFAULT' ? DEFAULT_EXIT_KEY[config.type] : normalized;
      return (key && EXIT_BY_KEY[key]) || EXIT[config.type] || 'tv-slide-down-out';
  };

  const resolveSynthCue = (type: 'ENTRY' | 'TRANSITION' | 'EXIT') => {
      if (config.type === OverlayType.ELECTION) {
          const designStyle = resolveElectionStyle(String(getField('designStyle') || 'RESULTS_BAR'));
          if (type === 'TRANSITION') {
              return String(getField('audioUpdateCue') || '') || resolveTemplateAudio(config).updateCue;
          }
          const fieldCue = String(getField(type === 'EXIT' ? 'soundOutStyle' : 'soundInStyle') || 'DEFAULT');
          if (fieldCue !== 'DEFAULT') return fieldCue;
          return type === 'EXIT'
              ? ELECTION_SOUND_OUT_DEFAULTS[designStyle] || 'SOFT_FADE'
              : ELECTION_SOUND_IN_DEFAULTS[designStyle] || 'RESULTS_STING';
      }

      if (type === 'TRANSITION') {
          // Phase A3 — prefer scene-level audioUpdateCue if present
          // (set by sceneToFieldUpdates), otherwise fall back to the
          // template's runtime profile updateCue.
          const sceneUpdateCue = String(getField('audioUpdateCue') || '');
          const isGlobalProbabilityShift = config.type === OverlayType.MERCATO_UNIFIED
              && String(getField('mercatoVariant') || '') === 'global_probability_shift';
          // Existing instances created before the global probability redesign
          // still carry LIVE_UPDATE_PING. Upgrade that weak default at runtime
          // while preserving any explicit custom cue selected by the user.
          if (isGlobalProbabilityShift && (!sceneUpdateCue || sceneUpdateCue === 'LIVE_UPDATE_PING')) {
              return 'TARGET_REVEAL_DARK';
          }
          if (sceneUpdateCue && sceneUpdateCue !== 'DEFAULT') return sceneUpdateCue;
          const mondialPreset = resolveMondialMotionPreset();
          if (mondialPreset) return mondialPreset.audioUpdateCue;
          // Universal transition fallback — resolve via runtime profile
          // so every template ticks consistently.
          return resolveTemplateAudio(config).updateCue;
      }
      const fieldCue = String(getField(type === 'EXIT' ? 'soundOutStyle' : 'soundInStyle') || 'DEFAULT');
      if (fieldCue !== 'DEFAULT') return fieldCue;
      const mondialPreset = resolveMondialMotionPreset();
      if (mondialPreset) {
          return type === 'EXIT' ? mondialPreset.soundOutStyle : mondialPreset.soundInStyle;
      }
      // ENTRY / EXIT: prefer the per-type SOUND_*_DEFAULTS map for backward
      // compatibility, then fall back to the universal runtime profile so
      // NO template ever plays a generic STADIUM_WHOOSH by accident.
      const profile = resolveTemplateAudio(config);
      return type === 'EXIT'
          ? SOUND_OUT_DEFAULTS[config.type] || profile.outCue
          : SOUND_IN_DEFAULTS[config.type] || profile.inCue;
  };

  const playSound = async (type: 'ENTRY' | 'TRANSITION' | 'EXIT', allowEditorPreview = false) => {
      const isPreviewSound = isEditor && allowEditorPreview;
      if (isEditor && !allowEditorPreview) return;
      // Single universal audio gate. Replaces the old `if (!soundEnabled) return`
      // check, plus consults runtime profile + volume floor + visibility.
      // Note: For EXIT we pass the *outgoing* visibility, since by the time
      // the EXIT cue fires, isVisible has already flipped to false.
      const gateEvent = type === 'EXIT' ? 'EXIT' : type === 'TRANSITION' ? 'TRANSITION' : 'ENTRY';
      // Build a temp config view that satisfies the ENTRY visibility check.
      const gateConfig = type === 'ENTRY' ? { ...config, isVisible: true } : config;
      const sfxAllowed = isPreviewSound
          ? Boolean(getField('soundEnabled') ?? true)
          : shouldPlayTemplateSound(gateConfig, gateEvent);
      if (sfxAllowed) {
          try {
              const cue = resolveSynthCue(type);
              if (type === 'EXIT') stopCue('BEFORE_THE_KICKOFF', 120);
              await playCue(cue, {
                  volume: soundVolume,
                  channel: isPreviewSound ? 'preview' : 'overlay',
                  loop: cue === 'BEFORE_THE_KICKOFF',
                  loopStart: cue === 'BEFORE_THE_KICKOFF' ? 19 : undefined,
                  loopEnd: cue === 'BEFORE_THE_KICKOFF' ? 79 : undefined,
              });
          } catch (e) { /* Ignore */ }
      }
      if (isPreviewSound) return;
      // Voice cue: independent of sfx. Fires only on the configured trigger.
      if (type === 'ENTRY' || type === 'EXIT' || type === 'TRANSITION') {
          const trigger = type === 'ENTRY' ? 'on_enter' : type === 'TRANSITION' ? 'on_update' : null;
          if (trigger && shouldPlayVoiceCue(gateConfig, trigger)) {
              const libraryId = String(getField('voiceLibraryId') || 'none');
              const directUrl = String(getField('voiceDirectUrl') || '');
              const voiceVol = Number(getField('voiceVolume') ?? 0.9);
              const url = resolveVoiceUrl(libraryId, directUrl);
              if (url) {
                  try {
                      const shouldDuck = Boolean(getField('duckSfx') ?? true);
                      if (shouldDuck) setOverlayDuckGain(0.42, 120);
                      const a = new Audio(url);
                      a.volume = Math.max(0, Math.min(1, voiceVol));
                      const restoreDuck = () => {
                          if (shouldDuck) setOverlayDuckGain(1, 260);
                      };
                      a.addEventListener('ended', restoreDuck, { once: true });
                      a.addEventListener('error', restoreDuck, { once: true });
                      window.setTimeout(restoreDuck, 12000);
                      void a.play().catch(restoreDuck);
                  } catch { /* ignore */ }
              }
          }
      }
  };

  // ── Strict Mode & Debounce Guards ──────────────────────────────────────────
  // Prevents double-play from React Strict Mode (dev) or rapid state changes.
  const previousVisibilityRef = useRef<boolean | null>(null);
  const lastSoundAt = useRef(0);
  const lastDataCueAt = useRef(0);
  const lastCommandId = useRef(0);
  const lastDataFingerprint = useRef<string | null>(null);
  const SOUND_DEBOUNCE_MS = 300;
  const DATA_CUE_DEBOUNCE_MS = 550;

  const runtimeDataFingerprint = useMemo(() => {
      return JSON.stringify(
          config.fields
              .filter(field => !RUNTIME_UPDATE_IGNORED_FIELDS.has(field.id))
              .map(field => [field.id, field.value])
      );
  }, [config.fields]);

  useEffect(() => {
      if (!isEditor) return;
      clearTimeout(timer.current);
      setMounted(true);
      if (!editorPreviewKey || editorPreviewPhase === 'HOLD') {
          setAnimCls('');
          return;
      }

      if (editorPreviewPhase === 'IN') {
          setAnimCls('');
          if (editorPreviewAudio) void playSound('ENTRY', true);
          requestAnimationFrame(() => setAnimCls(resolveEnterClass()));
          return;
      }

      if (editorPreviewPhase === 'OUT') {
          if (editorPreviewAudio) void playSound('EXIT', true);
          setAnimCls(resolveExitClass());
          timer.current = setTimeout(() => setAnimCls(''), editorExitHoldMs);
      }

      return () => clearTimeout(timer.current);
  }, [isEditor, editorPreviewKey, editorPreviewPhase, editorPreviewAudio, config.type, editorExitHoldMs, mondialMotionEnabled, transitionSpeedMs]);

  useEffect(() => {
      if (isEditor) return;

      const isNowVisible = config.isVisible;
      const prevVisible = previousVisibilityRef.current;
      const now = Date.now();
      const commandId = ++lastCommandId.current;

      // Guard: only fire ENTRY when transitioning false→true
      // Guard: only fire EXIT when transitioning true→false
      // Guard: skip if same state (Strict Mode re-run)
      // Guard: debounce rapid successive triggers
      if (isNowVisible && prevVisible !== true) {
          clearTimeout(timer.current);
          if (now - lastSoundAt.current > SOUND_DEBOUNCE_MS) {
              lastSoundAt.current = now;
              void playSound('ENTRY');
          }
          setMounted(true);
          requestAnimationFrame(() => setAnimCls(resolveEnterClass()));
          recordDiagnostic(config, 'show');
      } else if (!isNowVisible && prevVisible === true) {
          if (now - lastSoundAt.current > SOUND_DEBOUNCE_MS) {
              lastSoundAt.current = now;
              void playSound('EXIT');
          }
          setAnimCls(resolveExitClass());
          timer.current = setTimeout(() => {
              // Ensure this is still the latest command
              if (commandId === lastCommandId.current) {
                  setMounted(false);
                  setAnimCls('');
              }
          }, runtimeExitHoldMs);
          recordDiagnostic(config, 'hide');
      }

      previousVisibilityRef.current = isNowVisible;
      setWasVisible(isNowVisible);
      return () => clearTimeout(timer.current);
  }, [config.isVisible, isEditor, config.type, runtimeExitHoldMs, mondialMotionEnabled, transitionSpeedMs]);

  useEffect(() => {
      if (isEditor || !config.isVisible) {
          lastDataFingerprint.current = runtimeDataFingerprint;
          return;
      }
      if (lastDataFingerprint.current === null) {
          lastDataFingerprint.current = runtimeDataFingerprint;
          return;
      }
      if (lastDataFingerprint.current !== runtimeDataFingerprint) {
          const now = Date.now();
          if (now - lastDataCueAt.current > DATA_CUE_DEBOUNCE_MS) {
              lastDataCueAt.current = now;
              void playSound('TRANSITION');
              recordDiagnostic(config, 'update');
          }
          lastDataFingerprint.current = runtimeDataFingerprint;
      }
  }, [runtimeDataFingerprint, config.isVisible, isEditor, config.id, config.type]);

  if (!mounted && !isEditor) return null;

  const transitionCssVars = isMondialTemplate
      ? ({
          '--tv-enter-speed': `${transitionSpeedMs}ms`,
          '--tv-exit-speed': `${exitTransitionMs}ms`,
          '--tv-enter-bar-speed': `${Math.max(220, Math.round(transitionSpeedMs * 0.86))}ms`,
          '--tv-exit-bar-speed': `${Math.max(180, Math.round(exitTransitionMs * 0.82))}ms`,
        } as React.CSSProperties)
      : {};

  const containerStyle: React.CSSProperties = {
      backgroundColor: chromaKey ? '#00b140' : 'transparent',
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      overflow: 'hidden',
      fontFamily: config.theme.fontFamily,
      direction: 'rtl',
      pointerEvents: 'none',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      ...transitionCssVars,
  };

  const contentWrapperStyle: React.CSSProperties = {
      transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
      transformOrigin: 'center center',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
  };

  const themeKey = String(getField('themePreset') || 'CLASSIC_RED');
  const activeTheme = THEMES[themeKey] || THEMES['CLASSIC_RED'];
  
  let innerAnimClass = '';
  // Removed old opacity-0 logic because the outer wrapper handles the entire element animation now

  const props: RendererProps = {
      config,
      getField,
      audioRef,
      containerStyle,
      contentWrapperStyle,
      playSound,
      isEditor,
      wasVisible,
      activeTheme,
      animClass: innerAnimClass
  };

  const activeSlot = String(getField('activeSlot') || '');

  return (
      <>
          <style dangerouslySetInnerHTML={{ __html: CSS }} />
          <div className={animCls} style={containerStyle}>
              {/* Audio element for local playback */}
              {!isEditor && <audio ref={audioRef} style={{ display: 'none' }} />}
              
              <div className="absolute inset-0 pointer-events-none" style={contentWrapperStyle}>
                  {config.type === OverlayType.LEADERBOARD && <LeaderboardRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.SMART_NEWS && <SmartNewsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.STATEMENT_CARDS && <StatementCardsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.SCOREBOARD && <ScoreboardRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.TICKER && <TickerRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.LOWER_THIRD && <LowerThirdRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.EXCLUSIVE_ALERT && <ExclusiveAlertRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.GUESTS && <GuestsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.SOCIAL_MEDIA && <SocialMediaRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.TODAYS_EPISODE && <TodaysEpisodeRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.PLAYER_PROFILE && <PlayerProfileRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.TOP_VIEWERS && <TopViewersRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.FOOTBALL_PACKAGE && <FootballPackageRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.H2H_STATS && <H2HStatsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MATCH_STATS && <MatchStatsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.PLAYER_STATS && <PlayerStatsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.TRANSFER_NEWS && <TransferNewsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.BARCA_PREMIUM && <BarcaPremiumRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.UCL_DRAW && <UclDrawRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.TRANSFER_TARGETS && <TransferTargetsRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.BREAKING_HERE_WE_GO && <BreakingHereWeGoRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MERCATO_AGENT_CALL && <MercatoAgentCallRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MERCATO_DEAL_TIMELINE && <MercatoDealTimelineRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MERCATO_BUDGET_TRACKER && <MercatoBudgetTrackerRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MERCATO_DEADLINE_DAY && <MercatoDeadlineDayRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MERCATO_X_RAY && <MercatoXRayRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MERCATO_UNIFIED && <MercatoUnifiedRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MERCATO_MEDIA_STORY && <MercatoMediaStoryRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.PLAYER_INTEL_V2 && <PlayerIntelV2Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_LIVE && <Mondial2026Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_STATS && <Mondial2026Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_RESULTS && <Mondial2026Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_QUOTES && <Mondial2026Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_REPORTS && <Mondial2026Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_ANALYSIS && <Mondial2026Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_STARS && <Mondial2026Renderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.MONDIAL_IRAQ && <MondialIraqRenderer key={activeSlot} {...props} />}
                  {config.type === OverlayType.ELECTION && (
                      <ElectionOverlay
                          key={activeSlot}
                          config={config}
                          audioRef={audioRef}
                          containerStyle={{}}
                          contentWrapperStyle={{}}
                          themes={THEMES}
                      />
                  )}
              </div>
          </div>
      </>
  );
};

export default OverlayRenderer;
