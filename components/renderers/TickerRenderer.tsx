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
    const designStyle = String(getField('designStyle') || 'CLASSIC');
    const competition = String(getField('competition') || getField('channelName') || 'MATCH CENTER');
    // Convert speed (1-30) to duration: higher speed = lower duration
    const animDuration = Math.max(5, 60 - scrollSpeed * 2);

    if (designStyle === 'MATCH_FEED') {
      return (
        <div style={containerStyle}>
          <div style={contentWrapperStyle} className="items-end pb-8 subpixel-antialiased">
            <div className={`relative flex h-24 w-[94%] items-center overflow-hidden rounded-md border border-white/10 bg-black/80 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl ${animClass || 'animate-slide-in-right'}`}>
              <div className="flex h-full min-w-[310px] items-center gap-4 px-8 text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 text-xl font-black">90</div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] opacity-70">{competition}</div>
                  <div className="text-3xl font-black leading-none">{headline}</div>
                </div>
              </div>
              <div className="mx-5 h-10 w-px bg-white/15" />
              <div className="relative flex h-full flex-1 items-center overflow-hidden">
                <div
                  className="whitespace-nowrap px-4 text-3xl font-black text-white"
                  style={{ animation: `marquee ${animDuration}s linear infinite`, willChange: 'transform' }}
                >
                  {content}
                  <span className="mx-12" style={{ color: theme.accent }}>•</span>
                  {content}
                  <span className="mx-12" style={{ color: theme.accent }}>•</span>
                  {content}
                </div>
              </div>
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: theme.accent }} />
            </div>
          </div>
        </div>
      );
    }

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
