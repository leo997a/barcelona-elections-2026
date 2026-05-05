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
