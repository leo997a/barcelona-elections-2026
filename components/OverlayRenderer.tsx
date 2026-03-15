
import React, { useEffect, useRef, useState } from 'react';
import { OverlayConfig, OverlayType, Sponsor } from '../types';
import { Sparkles } from 'lucide-react';
import ElectionOverlay from './ElectionOverlay';
import { ELECTION_SOUND_IN_DEFAULTS, ELECTION_SOUND_OUT_DEFAULTS, resolveElectionStyle } from '../utils/election';

interface OverlayRendererProps {
  config: OverlayConfig;
  chromaKey?: boolean;
  isEditor?: boolean;
}

// --- THEME PRESETS ---
const THEMES: Record<string, { primary: string, secondary: string, text: string, accent: string }> = {
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

const TRANSITIONS: Record<string, string> = {
    'CINEMATIC': 'animate-cinematic-fade-up',
    'PAGE_FLIP': 'animate-page-flip',
    'NEWS_SLIDE': 'animate-news-slide',
    'ZOOM_IMPACT': 'animate-zoom-impact',
    'CUBE_ROTATE': 'animate-cube-rotate',
    'GLITCH': 'animate-glitch',
};

const SOUND_EFFECTS = {
    ENTRY: "https://assets.mixkit.co/active_storage/sfx/3120/3120.wav", 
    TRANSITION: "https://assets.mixkit.co/active_storage/sfx/3120/3120.wav", 
    EXIT: "https://assets.mixkit.co/active_storage/sfx/204/204.wav"
};

type ElectionSynthStep = {
    delay: number;
    duration: number;
    frequency: number;
    toFrequency?: number;
    waveform: OscillatorType;
    gain: number;
};

const ELECTION_SOUND_PATTERNS: Record<string, ElectionSynthStep[]> = {
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

let sharedAudioContext: AudioContext | null = null;

// --- COMPONENTS ---

const ModernBackground = ({ text, opacity, primaryColor, secondaryColor }: any) => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-gray-950">
             <div className="absolute inset-0 transition-colors duration-1000 ease-in-out" style={{ backgroundColor: secondaryColor }}></div>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] flex flex-wrap content-center items-center justify-center opacity-[0.04]" style={{ transform: 'rotate(-5deg)', willChange: 'transform' }}>
                 <div className="w-full h-full flex flex-wrap content-center justify-center animate-[panDiagonal_200s_linear_infinite]">
                     {Array.from({ length: 60 }).map((_, i) => (
                         <div key={i} className="text-[120px] font-black uppercase text-transparent m-12 whitespace-nowrap" style={{ WebkitTextStroke: '2px white' }}>{text}</div>
                     ))}
                 </div>
             </div>
             <style>{`@keyframes panDiagonal { 0% { transform: translate(-10%, -10%); } 50% { transform: translate(5%, 5%); } 100% { transform: translate(-10%, -10%); } }`}</style>
             <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-[0.15] transition-colors duration-1000" style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }}></div>
             <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-[0.1] transition-colors duration-1000" style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }}></div>
        </div>
    );
};

const SmartGallery = ({ images, intervalSeconds }: any) => {
    const [activeIndex, setActiveIndex] = useState(0);
    useEffect(() => {
        if (!images || images.length <= 1) return;
        const interval = setInterval(() => { setActiveIndex((prev) => (prev + 1) % images.length); }, intervalSeconds * 1000);
        return () => clearInterval(interval);
    }, [images.length, intervalSeconds]);

    if (!images || images.length === 0) return <div className="w-full h-full bg-black/20 flex items-center justify-center text-white/20">NO IMG</div>;

    return (
        <div className="w-full h-full relative overflow-hidden shadow-inner bg-gray-900">
            {images.map((img: string, idx: number) => (
                <div key={idx} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === activeIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
                     <img src={img} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                </div>
            ))}
        </div>
    );
};

const OverlayRenderer: React.FC<OverlayRendererProps> = ({ config, chromaKey, isEditor = false }) => {
  const getField = (id: string) => config.fields.find(f => f.id === id)?.value;
  
  const scale = Number(getField('scale') || 1);
  const posX = Number(getField('positionX') || 0);
  const posY = Number(getField('positionY') || 0);
  const soundEnabled = getField('soundEnabled') === true;
  const soundVolume = Number(getField('soundVolume') ?? 0.7);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [wasVisible, setWasVisible] = useState(false);
  
  // Internal Pagination for Leaderboard
  const [leaderboardPage, setLeaderboardPage] = useState(0);

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

  // Play Sound Logic
  const playSound = async (type: 'ENTRY' | 'TRANSITION' | 'EXIT') => {
      if (isEditor) return; 
      if (!soundEnabled) return;
      try {
          if (config.type === OverlayType.UCL_DRAW && type === 'ENTRY') {
              if (!audioRef.current) return;
              audioRef.current.src = "https://assets.mixkit.co/active_storage/sfx/1435/1435.wav"; // Epic cinematic impact
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

  // Leaderboard Auto-Rotation Logic
  useEffect(() => {
      if (config.type === OverlayType.LEADERBOARD && config.isVisible) {
          const rotationTime = Number(getField('rotationTime') || 15) * 1000;
          const sponsors: Sponsor[] = JSON.parse(String(getField('sponsorsData') || '[]'));
          const itemsPerPage = Number(getField('itemsPerPage') || 8);
          const totalPages = Math.ceil(sponsors.length / itemsPerPage);
          
          if (totalPages > 1) {
              const interval = setInterval(() => {
                  setLeaderboardPage(prev => {
                      const next = (prev + 1) % totalPages;
                      playSound('TRANSITION');
                      return next;
                  });
              }, rotationTime);
              return () => clearInterval(interval);
          }
      }
      setLeaderboardPage(0); // Reset when hidden
  }, [config.isVisible, config.type]);

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
      // High-DPI & Hardware Acceleration Enhancements
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
      // Ensure children inherit subpixel rendering
      backfaceVisibility: 'hidden',
  };

  // ------------------------------------------------------------------
  // RENDERER: LEADERBOARD (UPDATED: NATIVE 4K RESOLUTION)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.LEADERBOARD) {
      const sponsors: Sponsor[] = JSON.parse(String(getField('sponsorsData') || '[]'));
      const headline = String(getField('headline'));
      const themeKey = String(getField('themePreset') || 'ROYAL_GOLD');
      const activeTheme = THEMES[themeKey] || THEMES['ROYAL_GOLD'];
      
      const sidebarWidth = Number(getField('sidebarWidth') || 360);
      const itemsPerPage = Number(getField('itemsPerPage') || 7);
      const rotationTime = Number(getField('rotationTime') || 15);
      const bgOpacity = Number(getField('bgOpacity') ?? 0.85);

      // Font Sizes
      const headerFontSize = Number(getField('headerFontSize') || 24);
      const nameFontSize = Number(getField('nameFontSize') || 16);
      const amountFontSize = Number(getField('amountFontSize') || 11);

      const showAvatars = getField('showAvatars') !== false;
      const showAmounts = getField('showAmounts') !== false;
      const showRanks = getField('showRanks') !== false;
      
      const currentSponsors = sponsors.slice(leaderboardPage * itemsPerPage, (leaderboardPage + 1) * itemsPerPage);
      const totalPages = Math.ceil(sponsors.length / itemsPerPage);

      // Animation State
      let animClass = 'opacity-0';
      if (config.isVisible) {
          animClass = 'animate-slide-in-from-left';
      } else if (wasVisible) {
          animClass = 'animate-slide-out-to-left';
      }

      const leaderboardContainerStyle = { ...containerStyle, opacity: 1 };
      const sidebarWrapperStyle = { ...contentWrapperStyle, justifyContent: 'flex-start', paddingLeft: '0px' };

      // Helper to determine rank styling
      const getRankStyle = (rank: number) => {
          if (rank === 1) return { bg: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', text: '#3e2723', icon: '👑', border: '#FFD700' };
          if (rank === 2) return { bg: 'linear-gradient(135deg, #E0E0E0 0%, #9E9E9E 100%)', text: '#212121', icon: '', border: '#C0C0C0' };
          if (rank === 3) return { bg: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', text: '#3e2723', icon: '', border: '#CD7F32' };
          return { bg: 'rgba(255,255,255,0.1)', text: '#9ca3af', icon: '', border: 'rgba(255,255,255,0.05)' };
      };

      return (
          <div style={leaderboardContainerStyle}>
              <audio ref={audioRef} />
              
              <div style={sidebarWrapperStyle} className="relative z-10 h-full flex flex-col justify-center subpixel-antialiased">
                  
                  {/* RIBBON CONTAINER */}
                  <div className={`relative flex flex-col overflow-hidden rounded-r-[3rem] shadow-2xl ${animClass}`}
                       style={{ 
                           width: `${sidebarWidth}px`,
                           backgroundColor: `rgba(0,0,0,${bgOpacity})`,
                           // FORCE 4K QUALITY: Use Box Shadow for Borders & Backdrop Filter
                           backdropFilter: 'blur(40px) saturate(1.5)', 
                           WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                           boxShadow: `0 0 0 1px ${activeTheme.primary}40 inset, 0 30px 60px rgba(0,0,0,0.6)`,
                           transform: 'translateZ(0)', // GPU Force
                           willChange: 'transform, opacity'
                       }}>
                      
                      {/* Timer Bar */}
                      {totalPages > 1 && config.isVisible && (
                          <div className="h-1.5 bg-white/5 w-full">
                              <div key={leaderboardPage} className="h-full origin-left" 
                                style={{ backgroundColor: activeTheme.accent, animation: `progressLinear ${rotationTime}s linear forwards` }}></div>
                              <style>{`@keyframes progressLinear { 0% { width: 0%; } 100% { width: 100%; } }`}</style>
                          </div>
                      )}

                      {/* Header Section */}
                      <div className="p-8 relative overflow-hidden bg-gradient-to-b from-white/10 to-transparent">
                          <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: activeTheme.primary }}></div>
                          <h1 
                            className="font-black text-white uppercase tracking-tighter leading-none" 
                            style={{ 
                                textShadow: `0 4px 20px ${activeTheme.primary}80`, 
                                fontSize: `${headerFontSize}px`,
                                textRendering: 'geometricPrecision' // Sharper Text
                            }}
                          >
                              {headline}
                          </h1>
                          <div className="flex items-center gap-3 mt-3">
                             <span className="text-xs text-gray-400 font-mono tracking-[0.2em] uppercase font-bold">{String(getField('channelName'))}</span>
                             <div className="h-px flex-1 bg-white/20"></div>
                          </div>
                      </div>

                      {/* Sponsors List */}
                      <div className="px-4 pb-6 flex flex-col gap-3">
                          {sponsors.length === 0 ? (
                              <div className="h-40 flex flex-col items-center justify-center text-gray-500 gap-2 border-2 border-dashed border-white/10 rounded-2xl bg-black/20 m-2">
                                  <span className="text-4xl opacity-30">✨</span>
                                  <span className="text-sm font-bold opacity-60">Waiting for data...</span>
                              </div>
                          ) : (
                              currentSponsors.map((sponsor, index) => {
                                  const globalRank = (leaderboardPage * itemsPerPage) + index + 1;
                                  const style = getRankStyle(globalRank);
                                  const isTop3 = globalRank <= 3;
                                  
                                  const displayAmount = sponsor.usdAmount ? `$${sponsor.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '$0';
                                  
                                  return (
                                      <div 
                                        key={sponsor.id} 
                                        className="relative flex items-center gap-4 p-3.5 rounded-xl transition-all animate-cinematic-fade-up group"
                                        style={{ 
                                            background: isTop3 ? `linear-gradient(90deg, ${activeTheme.primary}15, transparent)` : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isTop3 ? style.border + '50' : 'rgba(255,255,255,0.03)'}`,
                                            animationDelay: `${index * 60}ms`,
                                            transform: 'translateZ(0)'
                                        }}
                                      >
                                          {/* Rank Box */}
                                          {showRanks && (
                                              <div className="w-10 h-10 flex items-center justify-center rounded-lg font-black text-lg shrink-0 shadow-lg relative overflow-hidden"
                                                   style={{ background: style.bg, color: style.text, textRendering: 'optimizeLegibility' }}>
                                                  {style.icon || globalRank}
                                              </div>
                                          )}

                                          {/* Avatar */}
                                          {showAvatars && (
                                              <div className="relative">
                                                   <img 
                                                    src={sponsor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sponsor.name)}&background=random&size=128`} 
                                                    className={`rounded-full object-cover shadow-md ${isTop3 ? 'w-14 h-14 border-2 border-white/40' : 'w-10 h-10 border border-white/10'}`}
                                                    style={{ imageRendering: 'high-quality' }}
                                                    alt=""
                                                   />
                                                   {globalRank === 1 && <div className="absolute -top-3 -right-2 text-2xl animate-bounce drop-shadow-md">👑</div>}
                                              </div>
                                          )}

                                          {/* Text Info */}
                                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                                              <h3 
                                                className={`font-bold truncate leading-tight tracking-wide ${isTop3 ? 'text-white' : 'text-gray-300'}`}
                                                style={{ fontSize: `${nameFontSize}px`, textRendering: 'geometricPrecision' }}
                                              >
                                                  {sponsor.name}
                                              </h3>
                                              {showAmounts && (
                                                  <div className="flex items-center gap-1 mt-1">
                                                      <span 
                                                        className={`font-mono font-bold tracking-tight`} 
                                                        style={{ 
                                                            color: activeTheme.accent,
                                                            fontSize: `${amountFontSize}px`,
                                                            textRendering: 'geometricPrecision'
                                                        }}
                                                      >
                                                          {/* ONLY SHOW USD */}
                                                          {displayAmount}
                                                      </span>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })
                          )}
                      </div>

                      {/* Footer Pagination */}
                      {totalPages > 1 && (
                          <div className="mt-auto p-4 bg-black/40 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-2">
                               {Array.from({length: totalPages}).map((_, i) => (
                                   <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === leaderboardPage ? 'w-8 bg-white shadow-[0_0_10px_white]' : 'w-2 bg-white/20'}`}></div>
                               ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }
  
  // ------------------------------------------------------------------
  // RENDERER: SMART NEWS (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.SMART_NEWS) {
      // (Existing Smart News Code)
      const pages = JSON.parse(String(getField('pagesData') || '["..."]'));
      const widthPercent = Number(getField('containerWidth') || 85); 
      const bgOpacity = Number(getField('bgOpacity') ?? 1); 
      const watermarkText = String(getField('watermarkText') || 'REO LIVE');
      const themeKey = String(getField('themePreset') || 'CLASSIC_RED');
      const activeTheme = THEMES[themeKey] || THEMES['CLASSIC_RED'];
      const currentPageIndex = Number(getField('currentPage') || 0);
      const currentText = pages[currentPageIndex] || "";
      const transitionKey = String(getField('transitionEffect') || 'CINEMATIC');
      const activeTransitionClass = TRANSITIONS[transitionKey] || TRANSITIONS['CINEMATIC'];

      return (
        <div style={containerStyle}>
            <audio ref={audioRef} />
            <div className="absolute inset-0 z-0 transition-opacity duration-1000" style={{ opacity: bgOpacity }}>
                 <ModernBackground text={watermarkText} opacity={1} primaryColor={activeTheme.primary} secondaryColor={activeTheme.secondary} />
            </div>
            <div style={contentWrapperStyle} className="relative z-10 subpixel-antialiased">
                <div className="flex flex-row relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10" style={{ width: `${widthPercent}%`, height: '550px', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)', boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset' }}>
                    <div className="w-[40%] h-full relative border-l border-white/5 animate-cinematic-blur-in">
                        <SmartGallery images={(getField('images') as string[]) || []} intervalSeconds={Number(getField('imageInterval') || 10)} />
                    </div>
                    <div className="w-[60%] p-12 flex flex-col justify-between relative">
                        <div className="absolute top-0 right-0 w-32 h-1" style={{ backgroundColor: activeTheme.accent }}></div>
                        <div>
                             <div className="flex items-center gap-3 mb-4"><span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">{String(getField('channelName'))}</span></div>
                             <h1 className="text-5xl font-extrabold leading-tight mb-2 tracking-tight" style={{ color: activeTheme.text, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>{String(getField('headline'))}</h1>
                        </div>
                        <div className="flex-1 flex items-center pr-2 relative overflow-hidden perspective-1000">
                             <div key={currentPageIndex} className={`w-full ${activeTransitionClass}`}>
                                <p className="text-3xl font-medium leading-relaxed text-balance drop-shadow-md" style={{ color: 'rgba(255,255,255,0.95)' }}>{currentText}</p>
                             </div>
                        </div>
                        <div className="border-t border-white/5 pt-6 flex flex-col gap-3">
                             <div className="flex justify-between items-center text-xs font-mono text-white/40"><span>PAGE {currentPageIndex + 1} / {pages.length}</span><span className="uppercase tracking-widest">{themeKey.replace('_', ' ')}</span></div>
                             <div className="w-full h-1 bg-white/5 rounded-full flex gap-0.5 overflow-hidden">
                                 {pages.map((_: any, i: number) => (
                                     <div key={i} className="h-full transition-all duration-700 ease-in-out flex-1 rounded-full" style={{ backgroundColor: i === currentPageIndex ? activeTheme.accent : 'transparent', opacity: i === currentPageIndex ? 1 : 0.2, transform: i === currentPageIndex ? 'scaleY(1.5)' : 'scaleY(1)' }} />
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // ------------------------------------------------------------------
  // RENDERER: SCOREBOARD (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.SCOREBOARD) {
    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="items-start pt-20 subpixel-antialiased">
            <div className="flex flex-row items-center bg-gray-900/90 backdrop-blur-md text-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden border-b-4 border-t border-white/10 animate-cinematic-blur-in" style={{ borderColor: config.theme.primaryColor }}>
            <div className="flex items-center space-x-4 space-x-reverse p-4 w-72 justify-between bg-gradient-to-b from-gray-800 to-gray-900">
                <div className="flex items-center gap-4">
                    <img src={String(getField('homeLogo'))} className="w-16 h-16 object-contain bg-white/5 rounded-full p-2 border border-white/10 shadow-lg" />
                    <span className="text-2xl font-bold truncate drop-shadow-md">{String(getField('homeName'))}</span>
                </div>
                <span key={String(getField('homeScore'))} className="text-6xl font-mono font-black animate-cinematic-fade-up text-white/95 drop-shadow-xl">{String(getField('homeScore'))}</span>
            </div>
            <div className="flex flex-col items-center justify-center px-8 py-2 bg-black/60 h-full min-h-[90px] border-x border-white/5">
                <span className="text-3xl font-mono font-bold text-yellow-400 tracking-widest drop-shadow-lg">{String(getField('time'))}</span>
                <span className="text-[12px] text-gray-400 uppercase tracking-widest mt-1 font-bold">{String(getField('period'))}</span>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse p-4 w-72 justify-between bg-gradient-to-b from-gray-800 to-gray-900">
                <span key={String(getField('awayScore'))} className="text-6xl font-mono font-black animate-cinematic-fade-up text-white/95 drop-shadow-xl">{String(getField('awayScore'))}</span>
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold truncate text-left drop-shadow-md">{String(getField('awayName'))}</span>
                    <img src={String(getField('awayLogo'))} className="w-16 h-16 object-contain bg-white/5 rounded-full p-2 border border-white/10 shadow-lg" />
                </div>
            </div>
            </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDERER: TICKER (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.TICKER) {
    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="items-end pb-10 subpixel-antialiased">
            <div className="w-full h-20 bg-gray-900 flex items-center relative shadow-2xl border-t-2 border-b border-gray-800 animate-slide-in-right">
            <div className="z-20 h-full px-10 flex flex-col justify-center text-white text-2xl font-black shadow-[10px_0_30px_rgba(0,0,0,0.8)]" style={{ backgroundColor: config.theme.primaryColor, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                <span>{String(getField('headline'))}</span>
            </div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center bg-gradient-to-r from-gray-900 to-gray-800">
                <div className="whitespace-nowrap animate-marquee text-white text-3xl font-bold px-4 tracking-wide">
                {String(getField('content'))} <span className="mx-12 text-red-500 text-4xl align-middle">•</span> {String(getField('content'))}
                </div>
            </div>
            </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDERER: LOWER THIRD (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.LOWER_THIRD) {
    return (
      <div style={containerStyle}>
         <div style={contentWrapperStyle} className="items-end justify-start pb-24 pr-24 subpixel-antialiased">
            <div className="flex flex-col relative animate-slide-in-right filter drop-shadow-2xl">
            <div className="px-16 py-6 text-5xl font-black text-white shadow-xl transform skew-x-[-10deg] origin-bottom-right bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-r-8" style={{ borderColor: config.theme.primaryColor }}>
                <div className="transform skew-x-[10deg] tracking-tight">{String(getField('name'))}</div>
            </div>
            <div className="px-12 py-4 text-3xl font-bold text-white/95 shadow-lg w-max mt-2 transform skew-x-[-10deg] origin-top-right ml-8 flex items-center gap-3" style={{ backgroundColor: config.theme.primaryColor }}>
                <div className="transform skew-x-[10deg] flex items-center gap-3">
                    <span className="w-4 h-4 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></span>
                    {String(getField('role'))}
                </div>
            </div>
            </div>
         </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDERER: EXCLUSIVE ALERT (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.EXCLUSIVE_ALERT) {
      const headline = String(getField('headline'));
      const subHeadline = String(getField('subHeadline'));
      const position = String(getField('position') || 'RIGHT');
      const useTTS = getField('useTTS') === true;
      const ttsText = String(getField('ttsText') || '');
      const themeKey = String(getField('themePreset') || 'CLASSIC_RED');
      const activeTheme = THEMES[themeKey] || THEMES['CLASSIC_RED'];

      // TTS Logic
      useEffect(() => {
          if (config.isVisible && useTTS && !isEditor && ttsText) {
              playSound('ENTRY');
              setTimeout(() => {
                  const utterance = new SpeechSynthesisUtterance(ttsText);
                  utterance.lang = 'ar-SA';
                  
                  // Make it sound like a deep, rough, grand broadcaster
                  utterance.rate = 0.75; // Slower, more deliberate pacing
                  utterance.pitch = 0.3; // Very deep pitch
                  
                  // Try to find a male Arabic voice if available
                  const voices = window.speechSynthesis.getVoices();
                  const arVoices = voices.filter(v => v.lang.includes('ar'));
                  if (arVoices.length > 0) {
                      const maleVoice = arVoices.find(v => /male|tarik|maged/i.test(v.name));
                      if (maleVoice) {
                          utterance.voice = maleVoice;
                      } else {
                          utterance.voice = arVoices[0];
                      }
                  }

                  window.speechSynthesis.speak(utterance);
              }, 400);
          }
      }, [config.isVisible, isEditor, useTTS, ttsText]);

      const isRight = position === 'RIGHT';
      const animClass = config.isVisible ? 'animate-zoom-impact' : 'opacity-0 scale-90 blur-md transition-all duration-500';

      return (
          <div style={containerStyle}>
              <audio ref={audioRef} />
              <div style={contentWrapperStyle} className={`items-start ${isRight ? 'justify-end pr-24' : 'justify-start pl-24'} pt-32 subpixel-antialiased`}>
                  
                  <div className={`relative flex items-center ${animClass}`} style={{ transformOrigin: isRight ? 'right center' : 'left center' }}>
                      
                      {/* Crazy Background Shapes */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] transform skew-x-[-15deg] overflow-hidden">
                          {/* Animated Light Sweep */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-[200%] animate-[panDiagonal_3s_linear_infinite]"></div>
                      </div>
                      
                      {/* Accent Glowing Bar */}
                      <div className={`absolute top-0 ${isRight ? 'right-0' : 'left-0'} w-6 h-full shadow-[0_0_40px_currentColor] transform skew-x-[-15deg] z-20`} style={{ backgroundColor: activeTheme.primary, color: activeTheme.primary }}></div>

                      <div className={`relative z-30 flex items-center gap-10 px-16 py-10 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          {/* Pulsing Badge */}
                          <div className="relative flex items-center justify-center shrink-0">
                              <div className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ backgroundColor: activeTheme.primary }}></div>
                              <div className="relative w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-[0_0_50px_currentColor] bg-black/80 backdrop-blur-md" style={{ borderColor: activeTheme.primary, color: activeTheme.primary }}>
                                  <Sparkles className="w-14 h-14 text-white animate-pulse" />
                              </div>
                          </div>

                          {/* Typography */}
                          <div className={`flex flex-col ${isRight ? 'text-right' : 'text-left'}`}>
                              <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] tracking-tighter uppercase" style={{ textRendering: 'geometricPrecision' }}>
                                  {headline}
                              </h2>
                              <div className={`flex items-center gap-6 mt-4 ${isRight ? 'justify-end' : 'justify-start'}`}>
                                  <div className="h-1.5 w-16 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: activeTheme.accent, color: activeTheme.accent }}></div>
                                  <span className="text-5xl font-bold tracking-[0.4em] uppercase" style={{ color: activeTheme.accent, textShadow: `0 0 30px ${activeTheme.accent}` }}>
                                      {subHeadline}
                                  </span>
                                  <div className="h-1.5 w-16 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: activeTheme.accent, color: activeTheme.accent }}></div>
                              </div>
                          </div>

                      </div>
                  </div>

              </div>
          </div>
      );
  }

  // ------------------------------------------------------------------
  // RENDERER: GUESTS (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.GUESTS) {
      const headline = String(getField('headline') || 'ضيوف الحلقة');
      const watermarkText = String(getField('watermarkText') || 'REO SHOW');
      const designStyle = String(getField('designStyle') || 'STYLE_1');
      const themeKey = String(getField('themePreset') || 'TACTICAL_BLUE');
      const activeTheme = THEMES[themeKey] || THEMES['TACTICAL_BLUE'];
      const guestsCount = Number(getField('guestsCount') || 3);

      const guests = [];
      for (let i = 1; i <= guestsCount; i++) {
          guests.push({
              name: String(getField(`guest${i}Name`) || `ضيف ${i}`),
              image: String(getField(`guest${i}Image`) || `https://picsum.photos/400/400?random=${i}`)
          });
      }

      const animClass = config.isVisible ? 'animate-cinematic-fade-up' : 'opacity-0 scale-95 transition-all duration-700';

      return (
          <div style={containerStyle}>
              <audio ref={audioRef} />
              <div style={contentWrapperStyle} className="relative z-10">
                  <div className={`w-full h-full flex flex-col justify-center items-center subpixel-antialiased ${animClass}`}>
                  
                  {/* Header */}
                  <div className="mb-12 text-center relative">
                      <h2 className="text-6xl font-black text-white uppercase tracking-wider drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" style={{ textRendering: 'geometricPrecision' }}>
                          {headline}
                      </h2>
                      <div className="h-1.5 w-32 mx-auto mt-4 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: activeTheme.primary, color: activeTheme.primary }}></div>
                  </div>

                  {/* Guests Grid */}
                  <div className="flex flex-wrap justify-center gap-8 px-10 max-w-[1800px]">
                      {guests.map((guest, index) => {
                          
                          // STYLE 1: Modern Glassmorphism
                          if (designStyle === 'STYLE_1') {
                              return (
                                  <div key={index} className="relative group" style={{ animationDelay: `${index * 100}ms` }}>
                                      <div className="w-64 h-64 rounded-3xl overflow-hidden border-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                          <img src={guest.image} className="w-full h-full object-cover" alt={guest.name} />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                      </div>
                                      <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-2 transition-transform duration-500">
                                          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-center shadow-xl">
                                              <h3 className="text-2xl font-bold text-white truncate">{guest.name}</h3>
                                              <div className="h-0.5 w-1/2 mx-auto mt-2 rounded-full" style={{ backgroundColor: activeTheme.accent }}></div>
                                          </div>
                                      </div>
                                  </div>
                              );
                          }

                          // STYLE 2: Cyberpunk / Angled
                          if (designStyle === 'STYLE_2') {
                              return (
                                  <div key={index} className="relative group" style={{ animationDelay: `${index * 100}ms` }}>
                                      <div className="w-64 h-64 overflow-hidden border-b-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] transform skew-x-[-10deg] transition-all duration-500 group-hover:skew-x-0" style={{ borderColor: activeTheme.primary }}>
                                          <img src={guest.image} className="w-full h-full object-cover transform skew-x-[10deg] group-hover:skew-x-0 transition-all duration-500 scale-110" alt={guest.name} />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                      </div>
                                      <div className="absolute bottom-4 left-0 right-0 text-center transform skew-x-[-10deg] group-hover:skew-x-0 transition-all duration-500">
                                          <h3 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-[0_5px_10px_rgba(0,0,0,1)]" style={{ textShadow: `0 0 10px ${activeTheme.primary}` }}>
                                              {guest.name}
                                          </h3>
                                      </div>
                                  </div>
                              );
                          }

                          // STYLE 3: Minimalist / Clean
                          return (
                              <div key={index} className="relative flex flex-col items-center group" style={{ animationDelay: `${index * 100}ms` }}>
                                  <div className="w-60 h-60 rounded-full overflow-hidden border-8 shadow-2xl transition-transform duration-500 group-hover:scale-105" style={{ borderColor: activeTheme.secondary }}>
                                      <img src={guest.image} className="w-full h-full object-cover" alt={guest.name} />
                                  </div>
                                  <div className="mt-6 px-8 py-2 rounded-full shadow-lg" style={{ backgroundColor: activeTheme.primary }}>
                                      <h3 className="text-xl font-bold text-white uppercase tracking-wider">{guest.name}</h3>
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Watermark */}
                  <div className="absolute bottom-10 right-10 opacity-50 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeTheme.accent }}></div>
                      <span className="text-sm font-mono font-bold text-white uppercase tracking-[0.3em]">{watermarkText}</span>
                  </div>

                  </div>
              </div>
          </div>
      );
  }

  // ------------------------------------------------------------------
  // RENDERER: UCL DRAW (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.UCL_DRAW) {
      const headline = String(getField('headline') || 'OITAVOS DE FINAL');
      const watermarkText = String(getField('watermarkText') || 'REO SHOW');
      const designStyle = String(getField('designStyle') || 'STYLE_1');
      const themeKey = String(getField('themePreset') || 'UCL_BLUE');
      const activeTheme = THEMES[themeKey] || THEMES['UCL_BLUE'];
      const centerImage = String(getField('centerImage') || 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg');

      const pair1 = String(getField('pair1') || 'UNDECIDED');
      const pair2 = String(getField('pair2') || 'UNDECIDED');
      const pair3 = String(getField('pair3') || 'UNDECIDED');
      const pair4 = String(getField('pair4') || 'UNDECIDED');

      const getPairImages = (selection: string, optA: string, imgA: string, optB: string, imgB: string, isLeft: boolean) => {
          if (selection === 'UNDECIDED') return [imgA, imgB];
          if (selection === optA) return isLeft ? [imgA] : [imgB];
          if (selection === optB) return isLeft ? [imgB] : [imgA];
          return [imgA, imgB];
      };

      const p1Left = getPairImages(pair1, 'BARCA_LEFT', String(getField('varBarca')), 'CHELSEA_LEFT', String(getField('varChelsea')), true);
      const p1Right = getPairImages(pair1, 'BARCA_LEFT', String(getField('varBarca')), 'CHELSEA_LEFT', String(getField('varChelsea')), false);

      const p2Left = getPairImages(pair2, 'LIV_LEFT', String(getField('varLiv')), 'TOT_LEFT', String(getField('varTot')), true);
      const p2Right = getPairImages(pair2, 'LIV_LEFT', String(getField('varLiv')), 'TOT_LEFT', String(getField('varTot')), false);

      const p3Left = getPairImages(pair3, 'SPORTING_LEFT', String(getField('varSporting')), 'CITY_LEFT', String(getField('varCity')), true);
      const p3Right = getPairImages(pair3, 'SPORTING_LEFT', String(getField('varSporting')), 'CITY_LEFT', String(getField('varCity')), false);

      const p4Left = getPairImages(pair4, 'ARSENAL_LEFT', String(getField('varArsenal')), 'BAYERN_LEFT', String(getField('varBayern')), true);
      const p4Right = getPairImages(pair4, 'ARSENAL_LEFT', String(getField('varArsenal')), 'BAYERN_LEFT', String(getField('varBayern')), false);

      const renderBox = (images: string[], isDecided: boolean = false) => (
          <div className={`flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] w-56 h-20 relative z-10 transition-all duration-500
              ${designStyle === 'STYLE_1' ? 'rounded-2xl bg-white border-2' : ''}
              ${designStyle === 'STYLE_2' ? 'skew-x-[-10deg] bg-gradient-to-r from-gray-100 to-white border-b-4' : ''}
              ${designStyle === 'STYLE_3' ? 'rounded-full bg-black/40 backdrop-blur-md border border-white/20' : ''}
          `} style={{ 
              borderColor: designStyle === 'STYLE_1' ? (isDecided ? '#fbbf24' : 'rgba(255,255,255,0.8)') : (designStyle === 'STYLE_2' ? activeTheme.accent : undefined),
              boxShadow: isDecided && designStyle === 'STYLE_1' ? `0 0 20px rgba(251,191,36,0.5)` : undefined
          }}>
              <div className={`flex items-center justify-center gap-4 ${designStyle === 'STYLE_2' ? 'skew-x-[10deg]' : ''}`}>
                  {images.map((img, idx) => (
                      <React.Fragment key={idx}>
                          <img src={img} className="w-12 h-12 object-contain drop-shadow-md transition-transform duration-500 hover:scale-110" />
                          {idx < images.length - 1 && <span className="text-gray-400 font-black text-2xl opacity-40">/</span>}
                      </React.Fragment>
                  ))}
              </div>
          </div>
      );

      const renderMatchup = (fixedImg: string, varImages: string[], isLeft: boolean, index: number, isDecided: boolean) => (
          <div className="flex flex-col gap-4 relative group" style={{ animationDelay: `${index * 100}ms` }}>
              {/* Bracket Lines */}
              <div className={`absolute top-10 bottom-10 w-12 border-y-2 opacity-60 group-hover:opacity-100 transition-all duration-500 ${isLeft ? '-right-12 border-r-2 rounded-r-xl' : '-left-12 border-l-2 rounded-l-xl'}`} style={{ borderColor: '#fbbf24' }}>
                  <div className={`absolute top-1/2 w-12 border-t-2`} style={{ borderColor: '#fbbf24', [isLeft ? 'left' : 'right']: '100%' }}></div>
              </div>
              
              {renderBox([fixedImg], true)}
              {renderBox(varImages, isDecided)}
          </div>
      );

      const animClass = config.isVisible ? 'animate-cinematic-fade-up' : 'opacity-0 scale-95 transition-all duration-700';

      return (
          <div style={containerStyle}>
              <audio ref={audioRef} />
              
              {/* Background */}
              <div className="absolute inset-0 z-0 overflow-hidden bg-[#020617]">
                  <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-40" style={{ background: activeTheme.primary }}></div>
                  <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-40" style={{ background: activeTheme.accent }}></div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              </div>

              <div style={contentWrapperStyle} className="relative z-10">
                  <div className={`w-full h-full flex flex-col justify-center items-center subpixel-antialiased relative ${animClass}`}>
                  
                  {/* FORCE LTR to fix RTL layout flipping the left/right columns */}
                  <div className="flex justify-between items-center w-full max-w-[1600px] px-16" style={{ direction: 'ltr' }}>
                      
                      {/* Left Column */}
                      <div className="flex flex-col gap-8">
                          {renderMatchup(String(getField('teamL1')), p1Left, true, 1, pair1 !== 'UNDECIDED')}
                          {renderMatchup(String(getField('teamL2')), p2Left, true, 2, pair2 !== 'UNDECIDED')}
                          {renderMatchup(String(getField('teamL3')), p3Left, true, 3, pair3 !== 'UNDECIDED')}
                          {renderMatchup(String(getField('teamL4')), p4Left, true, 4, pair4 !== 'UNDECIDED')}
                      </div>

                      {/* Center Content */}
                      <div className="flex flex-col items-center justify-center px-12">
                          <div className="bg-white/10 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/20 mb-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                              <h1 className="text-4xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg text-center" style={{ textRendering: 'geometricPrecision' }}>
                                  {headline}
                              </h1>
                          </div>
                          
                          {/* Trophy Placeholder / Center Graphic */}
                          <div className="relative w-80 h-80 flex items-center justify-center">
                              <div className="absolute inset-0 rounded-full animate-pulse opacity-20 blur-2xl" style={{ backgroundColor: activeTheme.accent }}></div>
                              <img src={centerImage} className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] relative z-10" alt="Center Graphic" />
                          </div>
                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col gap-8">
                          {renderMatchup(String(getField('teamR1')), p1Right, false, 1, pair1 !== 'UNDECIDED')}
                          {renderMatchup(String(getField('teamR2')), p2Right, false, 2, pair2 !== 'UNDECIDED')}
                          {renderMatchup(String(getField('teamR3')), p3Right, false, 3, pair3 !== 'UNDECIDED')}
                          {renderMatchup(String(getField('teamR4')), p4Right, false, 4, pair4 !== 'UNDECIDED')}
                      </div>

                  </div>

                  {/* Watermark */}
                  <div className="absolute bottom-8 right-12 opacity-60 flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10" style={{ direction: 'ltr' }}>
                      <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: activeTheme.accent, color: activeTheme.accent }}></div>
                      <span className="text-sm font-mono font-bold text-white uppercase tracking-[0.4em]">{watermarkText}</span>
                  </div>

                  </div>
              </div>
          </div>
      );
  }

  // ------------------------------------------------------------------
  // RENDERER: ELECTION (4K)
  // ------------------------------------------------------------------
  if (config.type === OverlayType.ELECTION) {
      return (
          <ElectionOverlay
              config={config}
              audioRef={audioRef}
              containerStyle={containerStyle}
              contentWrapperStyle={contentWrapperStyle}
              themes={THEMES}
          />
      );
  }

  return <div style={containerStyle}>Unknown Overlay</div>;
};

export default OverlayRenderer;
