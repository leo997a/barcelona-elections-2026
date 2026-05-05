import React from 'react';
import { RendererProps } from './SharedComponents';
import { THEMES } from './OverlayConstants';

export const TickerRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  containerStyle, 
  contentWrapperStyle,
  activeTheme,
  animClass
}) => {
    const headline = String(getField('headline') || 'عاجل');
    const content = String(getField('content') || '');
    const scrollSpeed = Number(getField('scrollSpeed') || 10);
    const themeKey = String(getField('themePreset') || 'CLASSIC_RED');
    const theme = THEMES[themeKey] || activeTheme;
    // Convert speed (1-30) to duration: higher speed = lower duration
    const animDuration = Math.max(5, 60 - scrollSpeed * 2);

    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="items-end pb-10 subpixel-antialiased">
            <div className={`w-full h-20 flex items-center relative shadow-2xl border-t-2 border-b border-white/10 ${animClass || 'animate-slide-in-right'}`}
              style={{ background: `linear-gradient(135deg, ${theme.secondary}, #0a0a0a)`, borderTopColor: theme.primary }}>

              {/* Label Badge */}
              <div className="z-20 h-full px-10 flex flex-col justify-center text-white text-2xl font-black shadow-[10px_0_30px_rgba(0,0,0,0.8)] shrink-0"
                style={{ backgroundColor: theme.primary, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                  <span>{headline}</span>
              </div>

              {/* Separator dot */}
              <div className="w-2 h-2 rounded-full mx-4 shrink-0 animate-pulse" style={{ backgroundColor: theme.accent }}></div>

              {/* Scrolling Content */}
              <div className="flex-1 overflow-hidden relative h-full flex items-center">
                  <div
                    className="whitespace-nowrap text-white text-3xl font-bold px-4 tracking-wide"
                    style={{ 
                      animation: `marquee ${animDuration}s linear infinite`,
                      willChange: 'transform'
                    }}>
                    {content}
                    <span className="mx-12" style={{ color: theme.primary }}>•</span>
                    {content}
                    <span className="mx-12" style={{ color: theme.primary }}>•</span>
                    {content}
                  </div>
              </div>

              {/* Right accent */}
              <div className="w-2 h-full shrink-0" style={{ backgroundColor: theme.primary }}></div>
            </div>
        </div>
      </div>
    );
};
