import React from 'react';
import { RendererProps } from './SharedComponents';
import { THEMES } from './OverlayConstants';

export const LowerThirdRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  containerStyle, 
  contentWrapperStyle,
  activeTheme,
  animClass
}) => {
    const name = String(getField('name') || 'الاسم');
    const role = String(getField('role') || 'المنصب');
    const designStyle = String(getField('designStyle') || 'CLASSIC');
    const themeKey = String(getField('themePreset') || 'TACTICAL_BLUE');
    const theme = THEMES[themeKey] || activeTheme;

    // STYLE 1: Classic Skewed (original)
    if (designStyle === 'CLASSIC') {
        return (
            <div style={containerStyle}>
                <div style={contentWrapperStyle} className="items-end justify-start pb-24 pr-24 subpixel-antialiased">
                    <div className={`flex flex-col relative filter drop-shadow-2xl ${animClass || 'animate-slide-in-right'}`}>
                        <div className="px-16 py-6 text-5xl font-black text-white shadow-xl transform skew-x-[-10deg] origin-bottom-right border-r-8"
                            style={{ background: `linear-gradient(135deg, #1a1a2e, #16213e)`, borderColor: theme.primary }}>
                            <div className="transform skew-x-[10deg] tracking-tight">{name}</div>
                        </div>
                        <div className="px-12 py-4 text-3xl font-bold text-white/95 shadow-lg w-max mt-2 transform skew-x-[-10deg] origin-top-right ml-8 flex items-center gap-3"
                            style={{ backgroundColor: theme.primary }}>
                            <div className="transform skew-x-[10deg] flex items-center gap-3">
                                <span className="w-4 h-4 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></span>
                                {role}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // STYLE 2: Modern Glass
    if (designStyle === 'MODERN') {
        return (
            <div style={containerStyle}>
                <div style={contentWrapperStyle} className="items-end justify-start pb-20 pr-16 subpixel-antialiased">
                    <div className={`flex items-center gap-0 filter drop-shadow-2xl ${animClass || 'animate-modern-slide-up'}`}>
                        <div className="w-1.5 h-24 rounded-l-full" style={{ backgroundColor: theme.primary }}></div>
                        <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-8 py-5 rounded-r-2xl">
                            <div className="text-4xl font-black tracking-tight" style={{ color: theme.text }}>{name}</div>
                            <div className="flex items-center gap-3 mt-1.5">
                                <div className="text-lg font-semibold" style={{ color: theme.accent }}>{role}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // STYLE 3: Minimal Bold
    return (
        <div style={containerStyle}>
            <div style={contentWrapperStyle} className="items-end justify-start pb-20 pr-16 subpixel-antialiased">
                <div className={`filter drop-shadow-2xl ${animClass || 'animate-news-slide'}`}>
                    <div className="px-8 py-4 rounded-lg" style={{ backgroundColor: theme.primary }}>
                        <div className="text-4xl font-black text-white tracking-tight uppercase">{name}</div>
                    </div>
                    <div className="px-8 py-2 mt-1 bg-black/70 backdrop-blur-sm rounded-lg border-l-4" style={{ borderColor: theme.accent }}>
                        <div className="text-xl font-bold uppercase tracking-widest" style={{ color: theme.accent }}>{role}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
