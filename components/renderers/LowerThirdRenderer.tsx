import React from 'react';
import { RendererProps } from './SharedComponents';

export const LowerThirdRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle 
}) => {
    return (
      <div style={containerStyle}>
         <div style={contentWrapperStyle} className="items-end justify-start pb-24 pr-24 subpixel-antialiased">
            <div className="flex flex-col relative animate-slide-in-right filter drop-shadow-2xl">
            <div className="px-16 py-6 text-5xl font-black text-white shadow-xl transform skew-x-[-10deg] origin-bottom-right bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-r-8" style={{ borderColor: config.theme.primaryColor }}>
                <div className="transform skew-x-[10deg] tracking-tight">{String(getField('name'))}</div>
            </div>
            <div className="px-12 py-4 text-3xl font-bold text-white/95 shadow-lg w-max mt-2 transform skew-x-[-10deg] origin-top-right ml-8 flex items-center gap-3" style={{ backgroundColor: config.theme.primaryColor }}>
                <div className="transform skew-x-[10deg] flex items-center gap-3">
                    <span className="w-4 h-4 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></span>
                    {String(getField('role'))}
                </div>
            </div>
            </div>
         </div>
      </div>
    );
};
