import React, { useEffect } from 'react';
import { RendererProps } from './SharedComponents';

export const TodaysEpisodeRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle, 
  activeTheme, 
  wasVisible 
}) => {
    const headline = String(getField('headline') || 'حلقة اليوم فيها :');
    const itemsCount = Number(getField('itemsCount') || 4);
    const themePreset = String(getField('themePreset') || 'MODERN_GLASS');

    // Handle Custom Audio Loop
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !config.isVisible) return;
        const handleTimeUpdate = () => {
            if (audio.currentTime >= 79) {
                audio.currentTime = 19;
                audio.play().catch(() => {});
            }
        };
        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => { audio.removeEventListener('timeupdate', handleTimeUpdate); };
    }, [audioRef, config.isVisible]);

    const items = [];
    for (let i = 1; i <= itemsCount; i++) {
        items.push({
            name: String(getField(`item${i}Name`) || `موضوع ${i}`),
            image: String(getField(`item${i}Image`) || `https://picsum.photos/400/600?random=${i}`),
            scale: Number(getField(`item${i}Scale`) || 1.0),
            posX: Number(getField(`item${i}PosX`) || 0),
            posY: Number(getField(`item${i}PosY`) || 0),
        });
    }

    const isGlass = themePreset === 'MODERN_GLASS';
    const isDarkNeon = themePreset === 'DARK_NEON';

    const slideClass = config.isVisible
        ? 'opacity-100 translate-x-0 transition-all duration-700 ease-out'
        : wasVisible
        ? 'opacity-0 translate-x-full transition-all duration-700 ease-in'
        : 'opacity-0 translate-x-full';

    const getItemSize = () => {
        if (itemsCount === 1) return 'w-[500px] h-[700px]';
        if (itemsCount === 2) return 'w-[400px] h-[600px]';
        if (itemsCount === 3) return 'w-[350px] h-[500px]';
        if (itemsCount === 4) return 'w-[300px] h-[450px]';
        return 'w-[260px] h-[380px]';
    };

    return (
        <div style={containerStyle}>
            {/* Inline keyframes for episode animation */}
            <style>{`
              @keyframes episode-fade-up {
                from { opacity: 0; transform: translateY(40px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>

            {/* Background */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${config.isVisible ? 'opacity-100' : 'opacity-0'}`}>
                {isDarkNeon && (
                    <div className="absolute inset-0 bg-black/90">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full blur-[150px] opacity-30" style={{ backgroundColor: activeTheme.primary }}></div>
                    </div>
                )}
                {isGlass && (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-slate-800/90 backdrop-blur-sm"></div>
                )}
                {themePreset === 'CLEAN_LIGHT' && (
                    <div className="absolute inset-0 bg-slate-50/95">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent"></div>
                    </div>
                )}
            </div>

            <div style={contentWrapperStyle} className="relative z-10 p-16">
                <div className={`w-full max-w-[1700px] mx-auto flex flex-col justify-center items-center h-full ${slideClass}`}>
                    
                    {/* Headline */}
                    <div className="mb-16 text-center relative z-20">
                        <h1 className={`text-6xl md:text-8xl font-black uppercase tracking-tight 
                            ${themePreset === 'CLEAN_LIGHT' ? 'text-slate-900 drop-shadow-sm' : 'text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]'}
                        `} style={{ textShadow: isDarkNeon ? `0 0 40px ${activeTheme.primary}` : undefined }}>
                            {headline}
                        </h1>
                        <div className="h-2 w-48 mx-auto mt-6 rounded-full shadow-lg" 
                             style={{ backgroundColor: activeTheme.accent, boxShadow: `0 0 20px ${activeTheme.accent}80` }}></div>
                    </div>

                    {/* Items Grid */}
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 w-full">
                        {items.map((item, index) => (
                            <div 
                                key={index} 
                                className={`relative group ${getItemSize()}`}
                                style={{ 
                                    animation: config.isVisible 
                                        ? `episode-fade-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) ${index * 0.15}s both` 
                                        : 'none'
                                }}
                            >
                                <div className={`w-full h-full rounded-3xl overflow-hidden relative shadow-2xl transition-all duration-500 ease-out transform group-hover:scale-[1.03] group-hover:-translate-y-2
                                    ${isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : ''}
                                    ${isDarkNeon ? 'bg-black/50 border-2' : ''}
                                    ${themePreset === 'CLEAN_LIGHT' ? 'bg-white border border-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.1)]' : ''}
                                `} style={{ 
                                    borderColor: isDarkNeon ? activeTheme.primary : undefined,
                                    boxShadow: isDarkNeon ? `0 0 30px ${activeTheme.primary}40` : undefined
                                }}>
                                    {/* Image */}
                                    <div className="absolute inset-0 overflow-hidden bg-gray-800">
                                        <img 
                                            src={item.image} 
                                            alt={item.name}
                                            className="absolute w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                            style={{
                                                transform: `scale(${item.scale}) translate(${item.posX}px, ${item.posY}px)`,
                                                transformOrigin: 'center center'
                                            }}
                                        />
                                        <div className={`absolute inset-0 bg-gradient-to-t 
                                            ${themePreset === 'CLEAN_LIGHT' ? 'from-white via-white/20 to-transparent' : 'from-black/90 via-black/30 to-transparent'}
                                        `}></div>
                                    </div>

                                    {/* Name */}
                                    <div className="absolute bottom-0 w-full p-6 pb-8 text-center translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                        <h2 className={`text-3xl md:text-4xl font-black uppercase tracking-wider
                                            ${themePreset === 'CLEAN_LIGHT' ? 'text-slate-900' : 'text-white drop-shadow-[0_4px_10px_rgba(0,0,0,1)]'}
                                        `}>
                                            {item.name}
                                        </h2>
                                        {isDarkNeon && (
                                            <div className="w-1/2 h-1 mx-auto mt-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: activeTheme.accent }}></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
