import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { RendererProps } from './SharedComponents';

export const ExclusiveAlertRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle, 
  activeTheme, 
  playSound,
  isEditor
}) => {
    const headline = String(getField('headline'));
    const subHeadline = String(getField('subHeadline'));
    const position = String(getField('position') || 'RIGHT');
    const useTTS = getField('useTTS') === true;
    const ttsText = String(getField('ttsText') || '');

    useEffect(() => {
        if (config.isVisible && useTTS && !isEditor && ttsText) {
            playSound('ENTRY');
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(ttsText);
                utterance.lang = 'ar-SA';
                utterance.rate = 0.75;
                utterance.pitch = 0.3;
                
                const voices = window.speechSynthesis.getVoices();
                const arVoices = voices.filter(v => v.lang.includes('ar'));
                if (arVoices.length > 0) {
                    const maleVoice = arVoices.find(v => /male|tarik|maged/i.test(v.name));
                    if (maleVoice) {
                        utterance.voice = maleVoice;
                    } else {
                        utterance.voice = arVoices[0];
                    }
                }

                window.speechSynthesis.speak(utterance);
            }, 400);
        }
    }, [config.isVisible, isEditor, useTTS, ttsText, playSound]);

    const isRight = position === 'RIGHT';
    const animClass = config.isVisible ? 'animate-zoom-impact' : 'opacity-0 scale-90 blur-md transition-all duration-500';

    return (
        <div style={containerStyle}>
            <div style={contentWrapperStyle} className={`items-start ${isRight ? 'justify-end pr-24' : 'justify-start pl-24'} pt-32 subpixel-antialiased`}>
                
                <div className={`relative flex items-center ${animClass}`} style={{ transformOrigin: isRight ? 'right center' : 'left center' }}>
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] transform skew-x-[-15deg] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-[200%] animate-[panDiagonal_3s_linear_infinite]"></div>
                    </div>
                    
                    <div className={`absolute top-0 ${isRight ? 'right-0' : 'left-0'} w-6 h-full shadow-[0_0_40px_currentColor] transform skew-x-[-15deg] z-20`} style={{ backgroundColor: activeTheme.primary, color: activeTheme.primary }}></div>

                    <div className={`relative z-30 flex items-center gap-10 px-16 py-10 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
                        
                        <div className="relative flex items-center justify-center shrink-0">
                            <div className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ backgroundColor: activeTheme.primary }}></div>
                            <div className="relative w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-[0_0_50px_currentColor] bg-black/80 backdrop-blur-md" style={{ borderColor: activeTheme.primary, color: activeTheme.primary }}>
                                <Sparkles className="w-14 h-14 text-white animate-pulse" />
                            </div>
                        </div>

                        <div className={`flex flex-col ${isRight ? 'text-right' : 'text-left'}`}>
                            <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] tracking-tighter uppercase" style={{ textRendering: 'geometricPrecision' }}>
                                {headline}
                            </h2>
                            <div className={`flex items-center gap-6 mt-4 ${isRight ? 'justify-end' : 'justify-start'}`}>
                                <div className="h-1.5 w-16 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: activeTheme.accent, color: activeTheme.accent }}></div>
                                <span className="text-5xl font-bold tracking-[0.4em] uppercase" style={{ color: activeTheme.accent, textShadow: `0 0 30px ${activeTheme.accent}` }}>
                                    {subHeadline}
                                </span>
                                <div className="h-1.5 w-16 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: activeTheme.accent, color: activeTheme.accent }}></div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};
