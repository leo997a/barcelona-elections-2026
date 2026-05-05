import React from 'react';
import { RendererProps } from './SharedComponents';

export const GuestsRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle, 
  activeTheme, 
  animClass 
}) => {
    const headline = String(getField('headline') || 'ضيوف الحلقة');
    const watermarkText = String(getField('watermarkText') || 'REO SHOW');
    const designStyle = String(getField('designStyle') || 'STYLE_1');
    const guestsCount = Number(getField('guestsCount') || 3);

    const guests = [];
    for (let i = 1; i <= guestsCount; i++) {
        guests.push({
            name: String(getField(`guest${i}Name`) || `ضيف ${i}`),
            image: String(getField(`guest${i}Image`) || `https://picsum.photos/400/400?random=${i}`)
        });
    }

    return (
        <div style={containerStyle}>
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
};
