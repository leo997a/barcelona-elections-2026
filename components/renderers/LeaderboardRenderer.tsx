import React, { useState, useEffect } from 'react';
import { RendererProps } from './SharedComponents';
import { Sponsor } from '../../types';

export const LeaderboardRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle, 
  activeTheme, 
  animClass, 
  wasVisible, 
  playSound 
}) => {
    const [leaderboardPage, setLeaderboardPage] = useState(0);

    const sponsors: Sponsor[] = JSON.parse(String(getField('sponsorsData') || '[]'));
    const headline = String(getField('headline'));
    const sidebarWidth = Number(getField('sidebarWidth') || 360);
    const itemsPerPage = Number(getField('itemsPerPage') || 7);
    const rotationTime = Number(getField('rotationTime') || 15);
    const bgOpacity = Number(getField('bgOpacity') ?? 0.85);

    const headerFontSize = Number(getField('headerFontSize') || 24);
    const nameFontSize = Number(getField('nameFontSize') || 16);
    const amountFontSize = Number(getField('amountFontSize') || 11);

    const showAvatars = getField('showAvatars') !== false;
    const showAmounts = getField('showAmounts') !== false;
    const showRanks = getField('showRanks') !== false;
    
    const totalPages = Math.ceil(sponsors.length / itemsPerPage);

    useEffect(() => {
        if (config.isVisible) {
            if (totalPages > 1) {
                const interval = setInterval(() => {
                    setLeaderboardPage(prev => {
                        const next = (prev + 1) % totalPages;
                        playSound('TRANSITION');
                        return next;
                    });
                }, rotationTime * 1000);
                return () => clearInterval(interval);
            }
        }
        setLeaderboardPage(0);
    }, [config.isVisible, totalPages, rotationTime, playSound]);

    const currentSponsors = sponsors.slice(leaderboardPage * itemsPerPage, (leaderboardPage + 1) * itemsPerPage);

    const leaderboardContainerStyle = { ...containerStyle, opacity: 1 };
    const sidebarWrapperStyle = { ...contentWrapperStyle, justifyContent: 'flex-start', paddingLeft: '0px' };

    const getRankStyle = (rank: number) => {
        if (rank === 1) return { bg: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', text: '#3e2723', icon: '👑', border: '#FFD700' };
        if (rank === 2) return { bg: 'linear-gradient(135deg, #E0E0E0 0%, #9E9E9E 100%)', text: '#212121', icon: '', border: '#C0C0C0' };
        if (rank === 3) return { bg: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', text: '#3e2723', icon: '', border: '#CD7F32' };
        return { bg: 'rgba(255,255,255,0.1)', text: '#9ca3af', icon: '', border: 'rgba(255,255,255,0.05)' };
    };

    let componentAnimClass = 'opacity-0';
    if (config.isVisible) {
        componentAnimClass = 'animate-slide-in-from-left';
    } else if (wasVisible) {
        componentAnimClass = 'animate-slide-out-to-left';
    }

    return (
        <div style={leaderboardContainerStyle}>
            <div style={sidebarWrapperStyle} className="relative z-10 h-full flex flex-col justify-center subpixel-antialiased">
                <div className={`relative flex flex-col overflow-hidden rounded-r-[3rem] shadow-2xl ${componentAnimClass}`}
                     style={{ 
                         width: `${sidebarWidth}px`,
                         backgroundColor: `rgba(0,0,0,${bgOpacity})`,
                         backdropFilter: 'blur(40px) saturate(1.5)', 
                         WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                         boxShadow: `0 0 0 1px ${activeTheme.primary}40 inset, 0 30px 60px rgba(0,0,0,0.6)`,
                         transform: 'translateZ(0)',
                         willChange: 'transform, opacity'
                     }}>
                    
                    {totalPages > 1 && config.isVisible && (
                        <div className="h-1.5 bg-white/5 w-full">
                            <div key={leaderboardPage} className="h-full origin-left" 
                              style={{ backgroundColor: activeTheme.accent, animation: `progressLinear ${rotationTime}s linear forwards` }}></div>
                            <style>{`@keyframes progressLinear { 0% { width: 0%; } 100% { width: 100%; } }`}</style>
                        </div>
                    )}

                    <div className="p-8 relative overflow-hidden bg-gradient-to-b from-white/10 to-transparent">
                        <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: activeTheme.primary }}></div>
                        <h1 
                          className="font-black text-white uppercase tracking-tighter leading-none" 
                          style={{ 
                              textShadow: `0 4px 20px ${activeTheme.primary}80`, 
                              fontSize: `${headerFontSize}px`,
                              textRendering: 'geometricPrecision' 
                          }}
                        >
                            {headline}
                        </h1>
                        <div className="flex items-center gap-3 mt-3">
                           <span className="text-xs text-gray-400 font-mono tracking-[0.2em] uppercase font-bold">{String(getField('channelName'))}</span>
                           <div className="h-px flex-1 bg-white/20"></div>
                        </div>
                    </div>

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
                                        {showRanks && (
                                            <div className="w-10 h-10 flex items-center justify-center rounded-lg font-black text-lg shrink-0 shadow-lg relative overflow-hidden"
                                                 style={{ background: style.bg, color: style.text, textRendering: 'optimizeLegibility' }}>
                                                {style.icon || globalRank}
                                            </div>
                                        )}

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
};
