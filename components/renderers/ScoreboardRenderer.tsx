import React from 'react';
import { RendererProps } from './SharedComponents';
import { THEMES } from './OverlayConstants';

export const ScoreboardRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  containerStyle, 
  contentWrapperStyle,
  activeTheme,
  animClass
}) => {
    const designStyle = String(getField('designStyle') || 'CLASSIC');
    const themeKey = String(getField('themePreset') || 'TACTICAL_BLUE');
    const theme = THEMES[themeKey] || activeTheme;
    const competition = String(getField('competition') || getField('channelName') || 'MATCH LIVE');
    const matchStatus = String(getField('matchStatus') || 'LIVE');
    const homeName = String(getField('homeName'));
    const awayName = String(getField('awayName'));
    const homeShort = String(getField('homeShort') || homeName.slice(0, 3).toUpperCase());
    const awayShort = String(getField('awayShort') || awayName.slice(0, 3).toUpperCase());
    const homeScore = String(getField('homeScore'));
    const awayScore = String(getField('awayScore'));
    const time = String(getField('time'));
    const period = String(getField('period'));

    if (designStyle === 'WORLD_FEED') {
      return (
        <div style={containerStyle}>
          <div style={contentWrapperStyle} className="items-start pt-8 subpixel-antialiased">
            <div className={`relative min-w-[760px] overflow-hidden rounded-lg border border-white/10 bg-black/80 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl ${animClass || 'animate-cinematic-blur-in'}`}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent}, ${theme.primary})` }} />
              <div className="flex items-center justify-between px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: theme.text }}>
                <span className="opacity-70">{competition}</span>
                <span className="flex items-center gap-2 text-red-300">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  {matchStatus}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_160px_1fr] items-center">
                <div className="flex items-center justify-end gap-4 px-6 py-3" style={{ background: `linear-gradient(90deg, transparent, ${theme.secondary}dd)` }}>
                  <span className="text-2xl font-black text-white">{homeShort}</span>
                  <img src={String(getField('homeLogo'))} className="h-12 w-12 rounded-full bg-white/10 object-contain p-1.5" alt="home" />
                </div>
                <div className="relative flex h-full items-center justify-center gap-4 bg-white text-gray-950">
                  <span key={homeScore} className="text-5xl font-black tabular-nums">{homeScore}</span>
                  <span className="text-3xl font-black opacity-40">-</span>
                  <span key={awayScore} className="text-5xl font-black tabular-nums">{awayScore}</span>
                  <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-b-md bg-gray-950 px-4 py-1 text-xs font-black text-white shadow-lg">
                    <span style={{ color: theme.accent }}>{time}</span>
                    <span className="opacity-50">{period}</span>
                  </div>
                </div>
                <div className="flex items-center justify-start gap-4 px-6 py-3" style={{ background: `linear-gradient(270deg, transparent, ${theme.secondary}dd)` }}>
                  <img src={String(getField('awayLogo'))} className="h-12 w-12 rounded-full bg-white/10 object-contain p-1.5" alt="away" />
                  <span className="text-2xl font-black text-white">{awayShort}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (designStyle === 'PREMIUM_BAR') {
      return (
        <div style={containerStyle}>
          <div style={contentWrapperStyle} className="items-end pb-14 subpixel-antialiased">
            <div className={`relative w-[1180px] overflow-hidden rounded-md border border-white/10 bg-[#101820]/90 shadow-[0_30px_80px_rgba(0,0,0,0.62)] backdrop-blur-2xl ${animClass || 'animate-news-slide'}`}>
              <div className="absolute inset-y-0 right-0 w-2" style={{ backgroundColor: theme.primary }} />
              <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: theme.accent }} />
              <div className="flex items-center justify-between border-b border-white/10 px-8 py-2 text-xs font-black uppercase tracking-[0.24em] text-white/65">
                <span>{competition}</span>
                <span>{matchStatus}</span>
              </div>
              <div className="grid grid-cols-[1fr_220px_1fr] items-center">
                <div className="flex items-center justify-end gap-5 px-8 py-5">
                  <div className="text-right">
                    <div className="text-3xl font-black text-white">{homeName}</div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: theme.accent }}>{homeShort}</div>
                  </div>
                  <img src={String(getField('homeLogo'))} className="h-16 w-16 object-contain drop-shadow-xl" alt="home" />
                </div>
                <div className="relative flex items-center justify-center gap-5 self-stretch" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}>
                  <span key={homeScore} className="text-6xl font-black text-white tabular-nums drop-shadow-lg">{homeScore}</span>
                  <span className="text-4xl font-black text-white/50">:</span>
                  <span key={awayScore} className="text-6xl font-black text-white tabular-nums drop-shadow-lg">{awayScore}</span>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-black px-5 py-1 text-sm font-black text-white shadow-xl">{time}</div>
                </div>
                <div className="flex items-center justify-start gap-5 px-8 py-5">
                  <img src={String(getField('awayLogo'))} className="h-16 w-16 object-contain drop-shadow-xl" alt="away" />
                  <div className="text-left">
                    <div className="text-3xl font-black text-white">{awayName}</div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: theme.accent }}>{awayShort}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="items-start pt-20 subpixel-antialiased">
            <div className={`flex flex-row items-center backdrop-blur-md text-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden border-b-4 border-t border-white/10 ${animClass || 'animate-cinematic-blur-in'}`}
              style={{ 
                borderBottomColor: theme.primary,
                background: designStyle === 'MINIMAL' 
                  ? `rgba(255,255,255,0.05)` 
                  : designStyle === 'DARK' 
                  ? 'rgba(0,0,0,0.92)' 
                  : 'rgba(17,24,39,0.9)'
              }}>

              {/* Home Team */}
              <div className="flex items-center space-x-4 space-x-reverse p-4 w-72 justify-between"
                style={{ background: `linear-gradient(135deg, ${theme.secondary}CC, ${theme.secondary}88)` }}>
                  <div className="flex items-center gap-4">
                      <img src={String(getField('homeLogo'))} className="w-16 h-16 object-contain bg-white/5 rounded-full p-2 border border-white/10 shadow-lg" alt="home" />
                      <span className="text-2xl font-bold truncate drop-shadow-md" style={{ color: theme.text }}>{String(getField('homeName'))}</span>
                  </div>
                  <span key={String(getField('homeScore'))} className="text-6xl font-mono font-black animate-cinematic-fade-up drop-shadow-xl" style={{ color: theme.accent }}>
                    {String(getField('homeScore'))}
                  </span>
              </div>

              {/* Center Time */}
              <div className="flex flex-col items-center justify-center px-8 py-2 h-full min-h-[90px] border-x border-white/5"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <span className="text-3xl font-mono font-bold tracking-widest drop-shadow-lg" style={{ color: theme.accent }}>{String(getField('time'))}</span>
                  <span className="text-[12px] uppercase tracking-widest mt-1 font-bold" style={{ color: theme.text + '99' }}>{String(getField('period'))}</span>
                  {designStyle === 'MODERN' && (
                    <div className="w-16 h-0.5 mt-2 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                  )}
              </div>

              {/* Away Team */}
              <div className="flex items-center space-x-4 space-x-reverse p-4 w-72 justify-between"
                style={{ background: `linear-gradient(225deg, ${theme.secondary}CC, ${theme.secondary}88)` }}>
                  <span key={String(getField('awayScore'))} className="text-6xl font-mono font-black animate-cinematic-fade-up drop-shadow-xl" style={{ color: theme.accent }}>
                    {String(getField('awayScore'))}
                  </span>
                  <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold truncate text-left drop-shadow-md" style={{ color: theme.text }}>{String(getField('awayName'))}</span>
                      <img src={String(getField('awayLogo'))} className="w-16 h-16 object-contain bg-white/5 rounded-full p-2 border border-white/10 shadow-lg" alt="away" />
                  </div>
              </div>
            </div>
        </div>
      </div>
    );
};
