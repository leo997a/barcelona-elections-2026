import React from 'react';
import { RendererProps } from './SharedComponents';

export const SocialMediaRenderer: React.FC<RendererProps> = ({ 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle, 
  activeTheme, 
  animClass 
}) => {
    const platform = String(getField('platform') || 'X (Twitter)');
    const authorName = String(getField('authorName') || '');
    const authorHandle = String(getField('authorHandle') || '');
    const authorImage = String(getField('authorImage') || '');
    const content = String(getField('content') || '');
    const likes = Number(getField('likes') || 0);
    const time = String(getField('time') || '');
    const themePreset = String(getField('themePreset') || 'LIGHT');
    
    const isDark = themePreset === 'DARK';
    const isGlass = themePreset === 'GLASS';

    const bgStyle = isGlass ? 'bg-white/10 backdrop-blur-2xl border border-white/20' : isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100';
    const textColor = isDark || isGlass ? 'text-white' : 'text-gray-900';
    const subTextColor = isDark || isGlass ? 'text-gray-400' : 'text-gray-500';

    const platformIcon = () => {
        if (platform === 'Instagram') return <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5"><div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-white rounded-md relative flex items-center justify-center"><div className="w-2.5 h-2.5 border-2 border-white rounded-full"></div><div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full"></div></div></div></div>;
        if (platform === 'YouTube') return <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center"><div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white ml-1"></div></div>;
        if (platform === 'Facebook') return <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-3xl font-serif">f</div>;
        return <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-black text-2xl font-serif">X</div>;
    };

    return (
        <div style={containerStyle}>
            <div style={contentWrapperStyle} className="relative z-10 p-12 subpixel-antialiased">
                <div className={`w-[800px] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] p-8 flex flex-col gap-6 ${bgStyle} ${animClass}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <img src={authorImage} alt={authorName} className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-transparent" />
                            <div className="flex flex-col">
                                <span className={`text-2xl font-bold ${textColor}`}>{authorName}</span>
                                <span className={`text-lg font-mono ${subTextColor}`}>{authorHandle}</span>
                            </div>
                        </div>
                        <div className="shrink-0 drop-shadow-md">
                            {platformIcon()}
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="py-2">
                        <p className={`text-3xl leading-relaxed font-medium text-balance ${textColor}`} style={{ direction: 'rtl' }}>
                            {content}
                        </p>
                    </div>
                    
                    {/* Footer */}
                    <div className={`flex items-center gap-8 pt-6 border-t ${isDark || isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                        <div className={`flex items-center gap-2 ${subTextColor}`}>
                            <span className="text-xl">❤️</span>
                            <span className="text-xl font-bold font-mono">{likes.toLocaleString()}</span>
                        </div>
                        <div className={`text-xl ${subTextColor} font-medium`}>
                            {time}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
