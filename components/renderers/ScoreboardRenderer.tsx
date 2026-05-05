import React from 'react';
import { RendererProps } from './SharedComponents';

export const ScoreboardRenderer: React.FC<RendererProps> = ({ 
  config, 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle 
}) => {
    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="items-start pt-20 subpixel-antialiased">
            <div className="flex flex-row items-center bg-gray-900/90 backdrop-blur-md text-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden border-b-4 border-t border-white/10 animate-cinematic-blur-in" style={{ borderColor: config.theme.primaryColor }}>
            <div className="flex items-center space-x-4 space-x-reverse p-4 w-72 justify-between bg-gradient-to-b from-gray-800 to-gray-900">
                <div className="flex items-center gap-4">
                    <img src={String(getField('homeLogo'))} className="w-16 h-16 object-contain bg-white/5 rounded-full p-2 border border-white/10 shadow-lg" />
                    <span className="text-2xl font-bold truncate drop-shadow-md">{String(getField('homeName'))}</span>
                </div>
                <span key={String(getField('homeScore'))} className="text-6xl font-mono font-black animate-cinematic-fade-up text-white/95 drop-shadow-xl">{String(getField('homeScore'))}</span>
            </div>
            <div className="flex flex-col items-center justify-center px-8 py-2 bg-black/60 h-full min-h-[90px] border-x border-white/5">
                <span className="text-3xl font-mono font-bold text-yellow-400 tracking-widest drop-shadow-lg">{String(getField('time'))}</span>
                <span className="text-[12px] text-gray-400 uppercase tracking-widest mt-1 font-bold">{String(getField('period'))}</span>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse p-4 w-72 justify-between bg-gradient-to-b from-gray-800 to-gray-900">
                <span key={String(getField('awayScore'))} className="text-6xl font-mono font-black animate-cinematic-fade-up text-white/95 drop-shadow-xl">{String(getField('awayScore'))}</span>
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold truncate text-left drop-shadow-md">{String(getField('awayName'))}</span>
                    <img src={String(getField('awayLogo'))} className="w-16 h-16 object-contain bg-white/5 rounded-full p-2 border border-white/10 shadow-lg" />
                </div>
            </div>
            </div>
        </div>
      </div>
    );
};
