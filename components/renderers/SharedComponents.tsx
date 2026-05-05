import React, { useState, useEffect } from 'react';
import { OverlayConfig } from '../../types';

export interface RendererProps {
  config: OverlayConfig;
  getField: (id: string) => any;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  containerStyle: React.CSSProperties;
  contentWrapperStyle: React.CSSProperties;
  playSound: (type: 'ENTRY' | 'TRANSITION' | 'EXIT') => Promise<void>;
  isEditor?: boolean;
  wasVisible: boolean;
  activeTheme: { primary: string; secondary: string; text: string; accent: string };
  animClass: string;
}

export const ModernBackground = ({ text, opacity, primaryColor, secondaryColor }: any) => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-gray-950">
             <div className="absolute inset-0 transition-colors duration-1000 ease-in-out" style={{ backgroundColor: secondaryColor }}></div>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] flex flex-wrap content-center items-center justify-center opacity-[0.04]" style={{ transform: 'rotate(-5deg)', willChange: 'transform' }}>
                 <div className="w-full h-full flex flex-wrap content-center justify-center animate-[panDiagonal_200s_linear_infinite]">
                     {Array.from({ length: 60 }).map((_, i) => (
                         <div key={i} className="text-[120px] font-black uppercase text-transparent m-12 whitespace-nowrap" style={{ WebkitTextStroke: '2px white' }}>{text}</div>
                     ))}
                 </div>
             </div>
             <style>{`@keyframes panDiagonal { 0% { transform: translate(-10%, -10%); } 50% { transform: translate(5%, 5%); } 100% { transform: translate(-10%, -10%); } }`}</style>
             <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-[0.15] transition-colors duration-1000" style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }}></div>
             <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-[0.1] transition-colors duration-1000" style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }}></div>
        </div>
    );
};

export const SmartGallery = ({ images, intervalSeconds }: any) => {
    const [activeIndex, setActiveIndex] = useState(0);
    useEffect(() => {
        if (!images || images.length <= 1) return;
        const interval = setInterval(() => { setActiveIndex((prev) => (prev + 1) % images.length); }, intervalSeconds * 1000);
        return () => clearInterval(interval);
    }, [images.length, intervalSeconds]);

    if (!images || images.length === 0) return <div className="w-full h-full bg-black/20 flex items-center justify-center text-white/20">NO IMG</div>;

    return (
        <div className="w-full h-full relative overflow-hidden shadow-inner bg-gray-900">
            {images.map((img: string, idx: number) => (
                <div key={idx} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === activeIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
                     <img src={img} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                </div>
            ))}
        </div>
    );
};
