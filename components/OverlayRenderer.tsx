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
  const soundEnabled = getField('soundEnabled') === true;
  const soundVolume = Number(getField('soundVolume') ?? 0.7);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [wasVisible, setWasVisible] = useState(false);
  
  const playElectionSynth = async (cue: string) => {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return false;

      if (!sharedAudioContext) {
          sharedAudioContext = new AudioContextCtor();
      }

      if (sharedAudioContext.state === 'suspended') {
          await sharedAudioContext.resume();
      }

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
          if (step.toFrequency) {
              oscillator.frequency.exponentialRampToValueAtTime(step.toFrequency, endAt);
          }

          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(step.gain, startAt + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

          oscillator.connect(gain);
          gain.connect(master);
          oscillator.start(startAt);
          oscillator.stop(endAt + 0.03);
      });

      window.setTimeout(() => {
          master.disconnect();
      }, 1400);

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
              } else {
                  return;
              }
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
      if (config.isVisible && !wasVisible) playSound('ENTRY');
      else if (!config.isVisible && wasVisible) playSound('EXIT');
      setWasVisible(config.isVisible);
  }, [config.isVisible, isEditor]);

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
      transition: 'opacity 0.5s ease-in-out',
      opacity: config.isVisible ? 1 : 0,
      pointerEvents: 'none',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      transform: 'translateZ(0)',
      willChange: 'transform, opacity'
  };

  const contentWrapperStyle: React.CSSProperties = {
      transform: `translate(${posX}px, ${posY}px) scale(${scale})`,
      transformOrigin: 'center center',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
  };

  const themeKey = String(getField('themePreset') || 'CLASSIC_RED');
  const activeTheme = THEMES[themeKey] || THEMES['CLASSIC_RED'];
  
  let animClass = 'opacity-0';
  if (config.isVisible) {
      animClass = 'animate-cinematic-fade-up';
  } else if (wasVisible) {
      animClass = 'opacity-0 scale-95 transition-all duration-700';
  }

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
      animClass
  };

  return (
      <>
          {config.type === OverlayType.LEADERBOARD && <LeaderboardRenderer {...props} />}
          {config.type === OverlayType.SMART_NEWS && <SmartNewsRenderer {...props} />}
          {config.type === OverlayType.SCOREBOARD && <ScoreboardRenderer {...props} />}
          {config.type === OverlayType.TICKER && <TickerRenderer {...props} />}
          {config.type === OverlayType.LOWER_THIRD && <LowerThirdRenderer {...props} />}
          {config.type === OverlayType.EXCLUSIVE_ALERT && <ExclusiveAlertRenderer {...props} />}
          {config.type === OverlayType.GUESTS && <GuestsRenderer {...props} />}
          {config.type === OverlayType.SOCIAL_MEDIA && <SocialMediaRenderer {...props} />}
          {config.type === OverlayType.TODAYS_EPISODE && <TodaysEpisodeRenderer {...props} />}
          {config.type === OverlayType.UCL_DRAW && <UclDrawRenderer {...props} />}
          {config.type === OverlayType.ELECTION && (
              <ElectionOverlay
                  config={config}
                  audioRef={audioRef}
                  containerStyle={containerStyle}
                  contentWrapperStyle={contentWrapperStyle}
                  themes={THEMES}
              />
          )}
      </>
  );
};

export default OverlayRenderer;
