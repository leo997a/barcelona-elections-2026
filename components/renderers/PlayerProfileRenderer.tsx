import React from 'react';
import { RendererProps } from './SharedComponents';
import { THEMES } from './OverlayConstants';

export const PlayerProfileRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  containerStyle, 
  contentWrapperStyle,
  activeTheme,
  animClass
}) => {
    const name = String(getField('playerName') || 'Lionel Messi');
    const number = String(getField('playerNumber') || '10');
    const role = String(getField('playerRole') || 'Forward');
    const image = String(getField('playerImage') || 'https://picsum.photos/400/600');
    const clubLogo = String(getField('clubLogo') || 'https://picsum.photos/100');
    const stat1Label = String(getField('stat1Label') || 'Goals');
    const stat1Value = String(getField('stat1Value') || '34');
    const stat2Label = String(getField('stat2Label') || 'Assists');
    const stat2Value = String(getField('stat2Value') || '15');
    const stat3Label = String(getField('stat3Label') || 'Rating');
    const stat3Value = String(getField('stat3Value') || '9.8');
    
    const designStyle = String(getField('designStyle') || 'MODERN');
    const themeKey = String(getField('themePreset') || 'TACTICAL_BLUE');
    const theme = THEMES[themeKey] || activeTheme;

    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="items-end justify-start pb-20 pr-20 subpixel-antialiased">
            
            {/* Main Card */}
            <div className={`relative flex flex-col w-[450px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden border border-white/10 ${animClass || 'animate-cinematic-blur-in'}`}
                 style={{ backgroundColor: designStyle === 'DARK' ? 'rgba(10,10,15,0.95)' : 'rgba(20,25,35,0.85)', backdropFilter: 'blur(20px)' }}>
                
                {/* Header / Image Area */}
                <div className="relative h-64 overflow-hidden bg-gradient-to-t from-gray-900 to-transparent flex items-end">
                    <div className="absolute top-0 right-0 p-6 z-20">
                        <span className="text-6xl font-black text-white/20 italic drop-shadow-lg font-mono">#{number}</span>
                    </div>
                    
                    {/* Player Image */}
                    <img src={image} className="absolute inset-0 w-full h-full object-cover object-top mix-blend-luminosity opacity-80" alt={name} />
                    
                    {/* Gradient Overlay to blend image into background */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,15,1)] via-[rgba(10,10,15,0.4)] to-transparent"></div>
                    
                    {/* Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: theme.primary }}></div>

                    {/* Logo */}
                    <div className="absolute top-6 left-6 z-20 w-16 h-16 bg-white/10 rounded-full p-2 backdrop-blur-md border border-white/20 shadow-xl">
                        <img src={clubLogo} className="w-full h-full object-contain drop-shadow-md" alt="club" />
                    </div>

                    {/* Basic Info */}
                    <div className="relative z-20 w-full p-6 pb-2">
                        <div className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: theme.accent }}>{role}</div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-none drop-shadow-lg">{name}</h2>
                    </div>
                </div>

                {/* Stats Area */}
                <div className="p-6 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: stat1Label, value: stat1Value },
                            { label: stat2Label, value: stat2Value },
                            { label: stat3Label, value: stat3Value }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-3 border border-white/5 relative overflow-hidden group">
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: theme.primary }}></div>
                                <span className="text-3xl font-black text-white drop-shadow-md mb-1 font-mono relative z-10">{stat.value}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest relative z-10">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Bar Accent */}
                <div className="h-1.5 w-full opacity-50" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}></div>
            </div>

        </div>
      </div>
    );
};
