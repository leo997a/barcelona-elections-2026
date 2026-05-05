import React from 'react';
import { RendererProps, ModernBackground, SmartGallery } from './SharedComponents';
import { TRANSITIONS } from './OverlayConstants';

export const SmartNewsRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle, 
  activeTheme 
}) => {
    const pages = JSON.parse(String(getField('pagesData') || '["..."]'));
    const widthPercent = Number(getField('containerWidth') || 85); 
    const bgOpacity = Number(getField('bgOpacity') ?? 1); 
    const watermarkText = String(getField('watermarkText') || 'REO LIVE');
    const themeKey = String(getField('themePreset') || 'CLASSIC_RED');
    const currentPageIndex = Number(getField('currentPage') || 0);
    const currentText = pages[currentPageIndex] || "";
    const transitionKey = String(getField('transitionEffect') || 'CINEMATIC');
    const activeTransitionClass = TRANSITIONS[transitionKey] || TRANSITIONS['CINEMATIC'];

    return (
      <div style={containerStyle}>
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
};
