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

  const playElectionSynth = async (cue: string) => {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return false;

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

  const playSound = async (type: 'ENTRY' | 'TRANSITION' | 'EXIT') => {
      if (isEditor) return; 
      if (!soundEnabled) return;
      try {
          if (config.type === OverlayType.UCL_DRAW && type === 'ENTRY') {
              if (!audioRef.current) return;
              audioRef.current.src = "https://assets.mixkit.co/active_storage/sfx/1435/1435.wav";
          } else if (config.type === OverlayType.ELECTION) {
              const designStyle = resolveElectionStyle(String(getField('designStyle') || 'RESULTS_BAR'));
              const soundInStyle = String(getField('soundInStyle') || ELECTION_SOUND_IN_DEFAULTS[designStyle] || 'RESULTS_STING');
              const soundOutStyle = String(getField('soundOutStyle') || ELECTION_SOUND_OUT_DEFAULTS[designStyle] || 'SOFT_FADE');
              if (type === 'ENTRY') {
                  const played = await playElectionSynth(soundInStyle);
                  if (played) return;
              } else if (type === 'EXIT') {
                  const played = await playElectionSynth(soundOutStyle);
                  if (played) return;
              } else if (audioRef.current) {
                  audioRef.current.src = SOUND_EFFECTS[type];
              } else return;
          } else if (config.type === OverlayType.TODAYS_EPISODE && type === 'ENTRY') {
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
          requestAnimationFrame(() => setAnimCls(ENTER[config.type] || 'tv-slide-up'));
      } else if (!isNowVisible && wasVisible) {
          playSound('EXIT');
          setAnimCls(EXIT[config.type] || 'tv-slide-down-out');
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
