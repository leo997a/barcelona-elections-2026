import React, { useEffect, useRef, useState } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import ElectionOverlay from './ElectionOverlay';
import { ELECTION_SOUND_IN_DEFAULTS, ELECTION_SOUND_OUT_DEFAULTS, resolveElectionStyle } from '../utils/election';
import { THEMES } from './renderers/OverlayConstants';
import { playCue, stopCue } from '../services/audioEngine';
import { resolveTemplateAudio, recordDiagnostic } from '../utils/templateRuntime';
import { shouldPlayTemplateSound, shouldPlayVoiceCue } from '../utils/templateAudioGate';
import { resolveVoiceUrl } from '../utils/voiceLibrary';
import { RendererProps } from './renderers/SharedComponents';

// Renderers
import { LeaderboardRenderer } from './renderers/LeaderboardRenderer';
import { SmartNewsRenderer } from './renderers/SmartNewsRenderer';
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

// ─── TV Animation Maps ────────────────────────────────────────────────────────
const ENTER: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]:      'tv-drop-in',
  [OverlayType.LOWER_THIRD]:     'tv-slide-left',
  [OverlayType.TICKER]:          'tv-slide-right',
  [OverlayType.ALERT]:           'tv-zoom-flash',
  [OverlayType.EXCLUSIVE_ALERT]: 'tv-zoom-flash',
  [OverlayType.SMART_NEWS]:      'tv-slide-up',
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
};

const EXIT: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]:      'tv-drop-out',
  [OverlayType.LOWER_THIRD]:     'tv-slide-left-out',
  [OverlayType.TICKER]:          'tv-slide-right-out',
  [OverlayType.ALERT]:           'tv-zoom-out',
  [OverlayType.EXCLUSIVE_ALERT]: 'tv-zoom-out',
  [OverlayType.SMART_NEWS]:      'tv-slide-down-out',
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
};

const DEFAULT_ENTER_KEY: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'SCOREBUG_SNAP',
  [OverlayType.LOWER_THIRD]: 'LOWER_THIRD_WIPE',
  [OverlayType.TICKER]: 'DATA_RUSH',
  [OverlayType.ALERT]: 'SPOTLIGHT_POP',
  [OverlayType.EXCLUSIVE_ALERT]: 'SPOTLIGHT_POP',
  [OverlayType.SMART_NEWS]: 'GLASS_SWEEP',
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
};

const SOUND_IN_DEFAULTS: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'SCOREBUG_SNAP',
  [OverlayType.LOWER_THIRD]: 'LOWER_THIRD_WIPE',
  [OverlayType.TICKER]: 'DATA_TICK',
  [OverlayType.ALERT]: 'IMPORTANT_PING',
  [OverlayType.EXCLUSIVE_ALERT]: 'IMPORTANT_PING',
  [OverlayType.SMART_NEWS]: 'LOWER_THIRD_WIPE',
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
};

const SOUND_OUT_DEFAULTS: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'SOFT_FADE',
  [OverlayType.LOWER_THIRD]: 'SOFT_FADE',
  [OverlayType.TICKER]: 'SOFT_FADE',
  [OverlayType.ALERT]: 'SOFT_FADE',
  [OverlayType.EXCLUSIVE_ALERT]: 'SOFT_FADE',
  [OverlayType.SMART_NEWS]: 'SOFT_FADE',
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

  @keyframes tvScorebugSnapOut   { from{transform:translateY(0) scale(1);opacity:1} to{transform:translateY(-40px) scale(.92);opacity:0;filter:blur(8px)} }
  @keyframes tvStadiumSweepOut   { from{transform:translateX(0);opacity:1} to{transform:translateX(-18%) skewX(8deg);opacity:0;filter:blur(10px)} }
  @keyframes tvLowerThirdWipeOut { from{clip-path:inset(0 0 0 0);transform:translateX(0);opacity:1} to{clip-path:inset(0 0 0 100%);transform:translateX(-36px);opacity:.2} }
  @keyframes tvDataRushOut       { from{transform:translateY(0) scaleX(1);opacity:1} to{transform:translateY(64px) scaleX(.94);opacity:0;filter:blur(8px)} }
  @keyframes tvVerticalRevealOut { from{clip-path:inset(0 0 0 0);transform:translateY(0);opacity:1} to{clip-path:inset(100% 0 0 0);transform:translateY(20px);opacity:0} }
  @keyframes tvSpotlightPopOut   { from{transform:scale(1);opacity:1;filter:brightness(1)} 40%{transform:scale(1.04);filter:brightness(1.5)} to{transform:scale(.82);opacity:0;filter:blur(16px) brightness(2)} }
  @keyframes tvGlassSweepOut     { from{transform:translateY(0) scale(1);opacity:1} to{transform:translateY(28px) scale(.985);opacity:0;filter:blur(10px)} }
  @keyframes tvBroadcastFadeOut  { from{opacity:1;filter:blur(0)} to{opacity:0;filter:blur(8px)} }

  .tv-drop-in        { animation: tvDropIn        .65s cubic-bezier(.22,1,.36,1) both }
  .tv-slide-left     { animation: tvSlideLeft     .65s cubic-bezier(.22,1,.36,1) both }
  .tv-slide-right    { animation: tvSlideRight    .65s cubic-bezier(.22,1,.36,1) both }
  .tv-slide-up       { animation: tvSlideUp       .65s cubic-bezier(.22,1,.36,1) both }
  .tv-zoom-flash     { animation: tvZoomFlash     .65s cubic-bezier(.22,1,.36,1) both }

  .tv-drop-out       { animation: tvDropOut       .55s ease-in both }
  .tv-slide-left-out { animation: tvSlideLeftOut  .55s ease-in both }
  .tv-slide-right-out{ animation: tvSlideRightOut .55s ease-in both }
  .tv-slide-down-out { animation: tvSlideDownOut  .55s ease-in both }
  .tv-zoom-out       { animation: tvZoomOut       .55s ease-in both }

  .tv-scorebug-snap      { animation: tvScorebugSnap      .52s cubic-bezier(.18,1,.32,1) both }
  .tv-stadium-sweep      { animation: tvStadiumSweep      .72s cubic-bezier(.18,1,.32,1) both }
  .tv-lower-third-wipe   { animation: tvLowerThirdWipe    .62s cubic-bezier(.22,1,.36,1) both }
  .tv-data-rush          { animation: tvDataRush          .6s cubic-bezier(.22,1,.36,1) both }
  .tv-vertical-reveal    { animation: tvVerticalReveal    .68s cubic-bezier(.22,1,.36,1) both }
  .tv-spotlight-pop      { animation: tvSpotlightPop      .58s cubic-bezier(.18,1,.32,1) both }
  .tv-glass-sweep        { animation: tvGlassSweep        .7s cubic-bezier(.22,1,.36,1) both }
  .tv-broadcast-fade     { animation: tvBroadcastFade     .5s ease-out both }

  .tv-scorebug-snap-out      { animation: tvScorebugSnapOut      .45s ease-in both }
  .tv-stadium-sweep-out      { animation: tvStadiumSweepOut      .55s ease-in both }
  .tv-lower-third-wipe-out   { animation: tvLowerThirdWipeOut    .5s ease-in both }
  .tv-data-rush-out          { animation: tvDataRushOut          .48s ease-in both }
  .tv-vertical-reveal-out    { animation: tvVerticalRevealOut    .5s ease-in both }
  .tv-spotlight-pop-out      { animation: tvSpotlightPopOut      .48s ease-in both }
  .tv-glass-sweep-out        { animation: tvGlassSweepOut        .5s ease-in both }
  .tv-broadcast-fade-out     { animation: tvBroadcastFadeOut     .42s ease-in both }
`;

interface OverlayRendererProps {
  config: OverlayConfig;
  chromaKey?: boolean;
  isEditor?: boolean;
}

const OverlayRenderer: React.FC<OverlayRendererProps> = ({ config, chromaKey, isEditor = false }) => {
  const getField = (id: string) => config.fields.find(f => f.id === id)?.value;
  
  const scale = Number(getField('scale') || 1);
  const posX = Number(getField('positionX') || 0);
  const posY = Number(getField('positionY') || 0);
  const soundVolume = Number(getField('soundVolume') ?? 0.7);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Animation state
  const [mounted, setMounted] = useState(isEditor || config.isVisible);
  const [animCls, setAnimCls] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [wasVisible, setWasVisible] = useState(isEditor || config.isVisible);

  const resolveEnterClass = () => {
      const selected = String(getField('transitionIn') || 'DEFAULT');
      const key = selected === 'DEFAULT' ? DEFAULT_ENTER_KEY[config.type] : selected;
      return (key && ENTER_BY_KEY[key]) || ENTER[config.type] || 'tv-slide-up';
  };

  const resolveExitClass = () => {
      const selected = String(getField('transitionOut') || 'DEFAULT');
      const key = selected === 'DEFAULT' ? DEFAULT_EXIT_KEY[config.type] : selected;
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
          if (sceneUpdateCue) return sceneUpdateCue;
          // Universal transition fallback — resolve via runtime profile
          // so every template ticks consistently.
          return resolveTemplateAudio(config).updateCue;
      }
      const fieldCue = String(getField(type === 'EXIT' ? 'soundOutStyle' : 'soundInStyle') || 'DEFAULT');
      if (fieldCue !== 'DEFAULT') return fieldCue;
      // ENTRY / EXIT: prefer the per-type SOUND_*_DEFAULTS map for backward
      // compatibility, then fall back to the universal runtime profile so
      // NO template ever plays a generic STADIUM_WHOOSH by accident.
      const profile = resolveTemplateAudio(config);
      return type === 'EXIT'
          ? SOUND_OUT_DEFAULTS[config.type] || profile.outCue
          : SOUND_IN_DEFAULTS[config.type] || profile.inCue;
  };

  const playSound = async (type: 'ENTRY' | 'TRANSITION' | 'EXIT') => {
      if (isEditor) return;
      // Single universal audio gate. Replaces the old `if (!soundEnabled) return`
      // check, plus consults runtime profile + volume floor + visibility.
      // Note: For EXIT we pass the *outgoing* visibility, since by the time
      // the EXIT cue fires, isVisible has already flipped to false.
      const gateEvent = type === 'EXIT' ? 'EXIT' : type === 'TRANSITION' ? 'TRANSITION' : 'ENTRY';
      // Build a temp config view that satisfies the ENTRY visibility check.
      const gateConfig = type === 'ENTRY' ? { ...config, isVisible: true } : config;
      const sfxAllowed = shouldPlayTemplateSound(gateConfig, gateEvent);
      if (sfxAllowed) {
          try {
              const cue = resolveSynthCue(type);
              if (type === 'EXIT') stopCue('BEFORE_THE_KICKOFF', 120);
              await playCue(cue, {
                  volume: soundVolume,
                  loop: cue === 'BEFORE_THE_KICKOFF',
                  loopStart: cue === 'BEFORE_THE_KICKOFF' ? 19 : undefined,
                  loopEnd: cue === 'BEFORE_THE_KICKOFF' ? 79 : undefined,
              });
          } catch (e) { /* Ignore */ }
      }
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
                      const a = new Audio(url);
                      a.volume = Math.max(0, Math.min(1, voiceVol));
                      void a.play();
                  } catch { /* ignore */ }
              }
          }
      }
  };

  // ── Strict Mode & Debounce Guards ──────────────────────────────────────────
  // Prevents double-play from React Strict Mode (dev) or rapid state changes.
  const previousVisibilityRef = useRef<boolean | null>(null);
  const lastSoundAt = useRef(0);
  const lastCommandId = useRef(0);
  const SOUND_DEBOUNCE_MS = 300;

  useEffect(() => {
      if (isEditor) {
          setMounted(true);
          setAnimCls('');
          return;
      }

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
              playSound('ENTRY');
          }
          setMounted(true);
          requestAnimationFrame(() => setAnimCls(resolveEnterClass()));
          recordDiagnostic(config, 'show');
      } else if (!isNowVisible && prevVisible === true) {
          if (now - lastSoundAt.current > SOUND_DEBOUNCE_MS) {
              lastSoundAt.current = now;
              playSound('EXIT');
          }
          setAnimCls(resolveExitClass());
          timer.current = setTimeout(() => {
              // Ensure this is still the latest command
              if (commandId === lastCommandId.current) {
                  setMounted(false);
                  setAnimCls('');
              }
          }, 600);
          recordDiagnostic(config, 'hide');
      }

      previousVisibilityRef.current = isNowVisible;
      setWasVisible(isNowVisible);
      return () => clearTimeout(timer.current);
  }, [config.isVisible, isEditor, config.type]);

  if (!mounted && !isEditor) return null;

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
