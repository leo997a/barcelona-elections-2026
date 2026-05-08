import React, { useEffect, useRef, useState } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import ElectionOverlay from './ElectionOverlay';
import { ELECTION_SOUND_IN_DEFAULTS, ELECTION_SOUND_OUT_DEFAULTS, resolveElectionStyle } from '../utils/election';
import { THEMES, SOUND_EFFECTS, ELECTION_SOUND_PATTERNS } from './renderers/OverlayConstants';
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
  [OverlayType.ALERT]: 'VAR_BUZZ',
  [OverlayType.EXCLUSIVE_ALERT]: 'VAR_BUZZ',
  [OverlayType.SMART_NEWS]: 'TACTICAL_PULSE',
  [OverlayType.LEADERBOARD]: 'DATA_TICK',
  [OverlayType.GUESTS]: 'STADIUM_WHOOSH',
  [OverlayType.UCL_DRAW]: 'STADIUM_WHOOSH',
  [OverlayType.SOCIAL_MEDIA]: 'LOWER_THIRD_WIPE',
  [OverlayType.TODAYS_EPISODE]: 'CROWD_RISE',
  [OverlayType.PLAYER_PROFILE]: 'LOWER_THIRD_WIPE',
  [OverlayType.TOP_VIEWERS]: 'DATA_TICK',
  [OverlayType.FOOTBALL_PACKAGE]: 'LUXURY_SWEEP',
};

const SOUND_OUT_DEFAULTS: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]: 'BROADCAST_OUT',
  [OverlayType.LOWER_THIRD]: 'SOFT_FADE',
  [OverlayType.TICKER]: 'BROADCAST_OUT',
  [OverlayType.ALERT]: 'BROADCAST_OUT',
  [OverlayType.EXCLUSIVE_ALERT]: 'BROADCAST_OUT',
  [OverlayType.SMART_NEWS]: 'SOFT_FADE',
  [OverlayType.LEADERBOARD]: 'SOFT_FADE',
  [OverlayType.GUESTS]: 'BROADCAST_OUT',
  [OverlayType.UCL_DRAW]: 'BROADCAST_OUT',
  [OverlayType.ELECTION]: 'SOFT_FADE',
  [OverlayType.SOCIAL_MEDIA]: 'SOFT_FADE',
  [OverlayType.TODAYS_EPISODE]: 'BROADCAST_OUT',
  [OverlayType.PLAYER_PROFILE]: 'SOFT_FADE',
  [OverlayType.TOP_VIEWERS]: 'SOFT_FADE',
  [OverlayType.FOOTBALL_PACKAGE]: 'LUXURY_OUT',
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

let sharedAudioContext: AudioContext | null = null;

const OverlayRenderer: React.FC<OverlayRendererProps> = ({ config, chromaKey, isEditor = false }) => {
  const getField = (id: string) => config.fields.find(f => f.id === id)?.value;
  
  const scale = Number(getField('scale') || 1);
  const posX = Number(getField('positionX') || 0);
  const posY = Number(getField('positionY') || 0);
  const soundEnabled = getField('soundEnabled') !== false;
  const soundVolume = Number(getField('soundVolume') ?? 0.7);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Animation state
  const [mounted, setMounted] = useState(isEditor || config.isVisible);
  const [animCls, setAnimCls] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [wasVisible, setWasVisible] = useState(isEditor || config.isVisible);

  const createNoiseBuffer = (ac: AudioContext, duration: number) => {
      const buffer = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * duration)), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
          const fade = 1 - i / data.length;
          data[i] = (Math.random() * 2 - 1) * fade;
      }
      return buffer;
  };

  const playLuxurySound = async (cue: string) => {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return false;

      if (!sharedAudioContext) sharedAudioContext = new AudioContextCtor();
      const ac = sharedAudioContext;
      if (ac.state === 'suspended') await ac.resume();

      const now = ac.currentTime;
      const master = ac.createGain();
      const compressor = ac.createDynamicsCompressor();
      master.gain.setValueAtTime(Math.max(0, Math.min(soundVolume, 1)) * 0.34, now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      compressor.threshold.value = -22;
      compressor.knee.value = 28;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.006;
      compressor.release.value = 0.18;
      master.connect(compressor);
      compressor.connect(ac.destination);

      const hit = (start: number, frequency: number, duration: number, gainValue: number) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, start);
          osc.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * 0.58), start + duration);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          osc.connect(gain);
          gain.connect(master);
          osc.start(start);
          osc.stop(start + duration + 0.04);
      };

      const shimmer = (start: number, base: number, duration: number, gainValue: number) => {
          [1, 1.5, 2, 2.5].forEach((ratio, index) => {
              const osc = ac.createOscillator();
              const gain = ac.createGain();
              const pan = ac.createStereoPanner();
              osc.type = index % 2 ? 'triangle' : 'sine';
              osc.frequency.setValueAtTime(base * ratio, start);
              osc.detune.setValueAtTime(index * 4 - 6, start);
              pan.pan.setValueAtTime(index % 2 ? 0.35 : -0.3, start);
              gain.gain.setValueAtTime(0.0001, start);
              gain.gain.exponentialRampToValueAtTime(gainValue / (index + 1), start + 0.04 + index * 0.015);
              gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
              osc.connect(gain);
              gain.connect(pan);
              pan.connect(master);
              osc.start(start);
              osc.stop(start + duration + 0.05);
          });
      };

      const sweep = (start: number, duration: number, from: number, to: number, gainValue: number, type: BiquadFilterType) => {
          const source = ac.createBufferSource();
          const filter = ac.createBiquadFilter();
          const gain = ac.createGain();
          source.buffer = createNoiseBuffer(ac, duration);
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

      if (cue === 'LUXURY_IMPACT' || cue === 'VAR_BUZZ') {
          hit(now, 52, 0.55, 0.95);
          hit(now + 0.025, 104, 0.22, 0.35);
          shimmer(now + 0.08, 196, 0.58, 0.18);
          sweep(now + 0.02, 0.46, 1800, 180, 0.22, 'bandpass');
      } else if (cue === 'LUXURY_OUT' || cue === 'BROADCAST_OUT' || cue === 'SOFT_FADE') {
          hit(now, 110, 0.42, 0.3);
          shimmer(now, 330, 0.38, 0.1);
          sweep(now, 0.42, 900, 120, 0.12, 'lowpass');
      } else if (cue === 'SCOREBUG_SNAP' || cue === 'DATA_TICK') {
          hit(now, 72, 0.32, 0.5);
          shimmer(now + 0.025, 440, 0.34, 0.16);
          sweep(now + 0.005, 0.2, 2600, 620, 0.12, 'bandpass');
      } else {
          hit(now, 58, 0.62, 0.62);
          shimmer(now + 0.06, 220, 0.72, 0.18);
          sweep(now, 0.62, 420, 4200, 0.2, 'highpass');
          sweep(now + 0.16, 0.52, 3600, 520, 0.14, 'bandpass');
      }

      window.setTimeout(() => {
          try { master.disconnect(); compressor.disconnect(); } catch {}
      }, 1800);
      return true;
  };

  const playElectionSynth = async (cue: string) => {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return false;

      if (cue.startsWith('LUXURY_') || ['SCOREBUG_SNAP', 'DATA_TICK', 'VAR_BUZZ', 'BROADCAST_OUT'].includes(cue)) {
          return playLuxurySound(cue);
      }

      if (!sharedAudioContext) sharedAudioContext = new AudioContextCtor();
      if (sharedAudioContext.state === 'suspended') await sharedAudioContext.resume();

      const pattern = ELECTION_SOUND_PATTERNS[cue] || ELECTION_SOUND_PATTERNS.RESULTS_STING;
      const now = sharedAudioContext.currentTime;
      const master = sharedAudioContext.createGain();
      master.connect(sharedAudioContext.destination);
      master.gain.setValueAtTime(Math.max(0, Math.min(soundVolume, 1)) * 0.16, now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

      pattern.forEach(step => {
          const oscillator = sharedAudioContext!.createOscillator();
          const gain = sharedAudioContext!.createGain();
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

      window.setTimeout(() => master.disconnect(), 1400);
      return true;
  };

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
          const fieldCue = String(getField(type === 'EXIT' ? 'soundOutStyle' : 'soundInStyle') || 'DEFAULT');
          if (fieldCue !== 'DEFAULT') return fieldCue;
          return type === 'EXIT'
              ? ELECTION_SOUND_OUT_DEFAULTS[designStyle] || 'SOFT_FADE'
              : ELECTION_SOUND_IN_DEFAULTS[designStyle] || 'RESULTS_STING';
      }

      const fieldCue = String(getField(type === 'EXIT' ? 'soundOutStyle' : 'soundInStyle') || 'DEFAULT');
      if (fieldCue !== 'DEFAULT') return fieldCue;
      if (type === 'TRANSITION') return 'DATA_TICK';
      return type === 'EXIT'
          ? SOUND_OUT_DEFAULTS[config.type] || 'BROADCAST_OUT'
          : SOUND_IN_DEFAULTS[config.type] || 'STADIUM_WHOOSH';
  };

  const playSound = async (type: 'ENTRY' | 'TRANSITION' | 'EXIT') => {
      if (isEditor) return; 
      if (!soundEnabled) return;
      try {
          const cue = resolveSynthCue(type);
          if (!(config.type === OverlayType.TODAYS_EPISODE && type === 'ENTRY' && String(getField('soundInStyle') || 'DEFAULT') === 'DEFAULT')) {
              const played = await playElectionSynth(cue);
              if (played) return;
          }

          if (config.type === OverlayType.TODAYS_EPISODE && type === 'ENTRY') {
              if (!audioRef.current) return;
              audioRef.current.src = "/sounds/before_the_kickoff.mp3";
              audioRef.current.currentTime = 19;
              audioRef.current.volume = Math.min(soundVolume, 1);
              await audioRef.current.play();
              return;
          } else {
              if (!audioRef.current) return;
              audioRef.current.src = SOUND_EFFECTS[type];
          }
          if (!audioRef.current) return;
          audioRef.current.volume = Math.min(soundVolume, 1);
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
      } catch (e) { /* Ignore */ }
  };

  useEffect(() => {
      if (isEditor) {
          setMounted(true);
          setAnimCls('');
          return;
      }

      const isNowVisible = config.isVisible;
      
      if (isNowVisible && !wasVisible) {
          clearTimeout(timer.current);
          playSound('ENTRY');
          setMounted(true);
          requestAnimationFrame(() => setAnimCls(resolveEnterClass()));
      } else if (!isNowVisible && wasVisible) {
          playSound('EXIT');
          setAnimCls(resolveExitClass());
          timer.current = setTimeout(() => {
              setMounted(false);
              setAnimCls('');
          }, 600);
      }
      
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

  return (
      <>
          <style dangerouslySetInnerHTML={{ __html: CSS }} />
          <div className={animCls} style={containerStyle}>
              {/* Audio element for local playback */}
              {!isEditor && <audio ref={audioRef} style={{ display: 'none' }} />}
              
              <div className="absolute inset-0 pointer-events-none" style={contentWrapperStyle}>
                  {config.type === OverlayType.LEADERBOARD && <LeaderboardRenderer {...props} />}
                  {config.type === OverlayType.SMART_NEWS && <SmartNewsRenderer {...props} />}
                  {config.type === OverlayType.SCOREBOARD && <ScoreboardRenderer {...props} />}
                  {config.type === OverlayType.TICKER && <TickerRenderer {...props} />}
                  {config.type === OverlayType.LOWER_THIRD && <LowerThirdRenderer {...props} />}
                  {config.type === OverlayType.EXCLUSIVE_ALERT && <ExclusiveAlertRenderer {...props} />}
                  {config.type === OverlayType.GUESTS && <GuestsRenderer {...props} />}
                  {config.type === OverlayType.SOCIAL_MEDIA && <SocialMediaRenderer {...props} />}
                  {config.type === OverlayType.TODAYS_EPISODE && <TodaysEpisodeRenderer {...props} />}
                  {config.type === OverlayType.PLAYER_PROFILE && <PlayerProfileRenderer {...props} />}
                  {config.type === OverlayType.TOP_VIEWERS && <TopViewersRenderer {...props} />}
                  {config.type === OverlayType.FOOTBALL_PACKAGE && <FootballPackageRenderer {...props} />}
                  {config.type === OverlayType.UCL_DRAW && <UclDrawRenderer {...props} />}
                  {config.type === OverlayType.ELECTION && (
                      <ElectionOverlay
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
