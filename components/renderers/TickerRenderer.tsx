import React from 'react';
import { RendererProps } from './SharedComponents';

export const TickerRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle 
}) => {
    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="items-end pb-10 subpixel-antialiased">
            <div className="w-full h-20 bg-gray-900 flex items-center relative shadow-2xl border-t-2 border-b border-gray-800 animate-slide-in-right">
            <div className="z-20 h-full px-10 flex flex-col justify-center text-white text-2xl font-black shadow-[10px_0_30px_rgba(0,0,0,0.8)]" style={{ backgroundColor: config.theme.primaryColor, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                <span>{String(getField('headline'))}</span>
            </div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center bg-gradient-to-r from-gray-900 to-gray-800">
                <div className="whitespace-nowrap animate-marquee text-white text-3xl font-bold px-4 tracking-wide">
                {String(getField('content'))} <span className="mx-12 text-red-500 text-4xl align-middle">•</span> {String(getField('content'))}
                </div>
            </div>
            </div>
        </div>
      </div>
    );
};
