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
    let pages: any[] = [];
    try {
        const raw = getField('pagesData');
        pages = Array.isArray(raw) ? raw : JSON.parse(String(raw || '[]'));
        if (!Array.isArray(pages)) pages = [];
    } catch (e) {
        pages = ["تحقق من تنسيق البيانات"];
    }

    const containerHeight = Number(getField('containerHeight') || 550);
    const headlineSize = Number(getField('headlineFontSize') || 48);
    const contentSize = Number(getField('contentFontSize') || 30);
    const padding = Number(getField('contentPadding') || 48);

    const widthPercent = Number(getField('containerWidth') || 85); 
    const bgOpacity = Number(getField('bgOpacity') ?? 1); 
    const watermarkText = String(getField('watermarkText') || 'REO LIVE');
    const themeKey = String(getField('themePreset') || 'CLASSIC_RED');
    const currentPageIndex = Number(getField('currentPage') || 0);
    const pageContent = pages[currentPageIndex] || "";
    const currentText = typeof pageContent === 'object' 
        ? (pageContent.text || pageContent.content || JSON.stringify(pageContent))
        : String(pageContent || "");
    
    const rawImages = getField('images');
    const images = Array.isArray(rawImages) ? rawImages : [];
    
    const transitionKey = String(getField('transitionEffect') || 'CINEMATIC');
    const activeTransitionClass = TRANSITIONS[transitionKey] || TRANSITIONS['CINEMATIC'];

    // --- NAVIGATION SOUND EFFECT ---
    const lastPage = React.useRef(currentPageIndex);
    React.useEffect(() => {
        if (currentPageIndex !== lastPage.current) {
            lastPage.current = currentPageIndex;
            // Play sound if not the first mount
            if (typeof playSound === 'function') {
                playSound('TRANSITION');
            }
        }
    }, [currentPageIndex, playSound]);

    return (
      <div style={containerStyle}>
          <div className="absolute inset-0 z-0 transition-opacity duration-1000" style={{ opacity: bgOpacity }}>
               <ModernBackground text={watermarkText} opacity={1} primaryColor={activeTheme.primary} secondaryColor={activeTheme.secondary} />
          </div>
          <div style={contentWrapperStyle} className="relative z-10 subpixel-antialiased">
              <div className="flex flex-row relative rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10" style={{ width: `${widthPercent}%`, height: `${containerHeight}px`, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(20px)', boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset' }}>
                  <div className="w-[42%] h-full relative border-l border-white/5 animate-cinematic-blur-in">
                      <SmartGallery images={images} intervalSeconds={Number(getField('imageInterval') || 10)} />
                      <div className="absolute inset-0 bg-gradient-to-l from-[#0f172a]/80 to-transparent pointer-events-none"></div>
                  </div>
                  <div className="w-[58%] flex flex-col justify-between relative overflow-hidden" style={{ padding: `${padding}px` }}>
                      <div className="absolute top-0 right-0 w-48 h-1.5" style={{ backgroundColor: activeTheme.accent }}></div>
                      <div>
                           <div className="flex items-center gap-3 mb-6">
                               <div className="h-4 w-1 rounded-full" style={{ backgroundColor: activeTheme.accent }}></div>
                               <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">{String(getField('channelName'))}</span>
                           </div>
                           <h1 className="font-black leading-[1.1] mb-6 tracking-tight drop-shadow-2xl" 
                               style={{ 
                                   color: activeTheme.text, 
                                   fontSize: `${headlineSize}px`,
                                   textShadow: '0 4px 30px rgba(0,0,0,0.4)' 
                               }}>
                               {String(getField('headline'))}
                           </h1>
                      </div>
                      
                      <div className="flex-1 flex items-center pr-2 relative overflow-hidden perspective-1000 scrollbar-hide">
                           <div key={currentPageIndex} className={`w-full ${activeTransitionClass}`}>
                              <p className="font-bold leading-[1.4] text-pretty drop-shadow-xl" 
                                 style={{ 
                                     color: 'rgba(255,255,255,0.98)', 
                                     fontSize: `${contentSize}px`,
                                     maxHeight: '100%',
                                     overflow: 'hidden'
                                 }}>
                                 {currentText}
                              </p>
                           </div>
                      </div>

                      <div className="border-t border-white/5 pt-8 mt-6 flex flex-col gap-4">
                           <div className="flex justify-between items-center text-[10px] font-black text-white/30 tracking-[0.2em]">
                               <span>PAGE {currentPageIndex + 1} / {pages.length}</span>
                               <span className="uppercase">{themeKey.replace(/_/g, ' ')}</span>
                           </div>
                           <div className="w-full h-1.5 bg-white/5 rounded-full flex gap-1 overflow-hidden p-[2px]">
                               {pages.map((_: any, i: number) => (
                                   <div key={i} className="h-full transition-all duration-700 ease-in-out flex-1 rounded-full" 
                                        style={{ 
                                            backgroundColor: i === currentPageIndex ? activeTheme.accent : 'rgba(255,255,255,0.05)', 
                                            opacity: i === currentPageIndex ? 1 : 0.3,
                                            transform: i === currentPageIndex ? 'scaleY(1.2)' : 'scaleY(1)' 
                                        }} />
                               ))}
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    );
};
