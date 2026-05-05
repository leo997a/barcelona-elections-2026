import React from 'react';
import { RendererProps } from './SharedComponents';

export const UclDrawRenderer: React.FC<RendererProps> = ({ 
  getField, 
  audioRef, 
  containerStyle, 
  contentWrapperStyle, 
  activeTheme, 
  animClass 
}) => {
    const headline = String(getField('headline') || 'OITAVOS DE FINAL');
    const watermarkText = String(getField('watermarkText') || 'REO SHOW');
    const designStyle = String(getField('designStyle') || 'STYLE_1');
    const centerImage = String(getField('centerImage') || 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg');

    const pair1 = String(getField('pair1') || 'UNDECIDED');
    const pair2 = String(getField('pair2') || 'UNDECIDED');
    const pair3 = String(getField('pair3') || 'UNDECIDED');
    const pair4 = String(getField('pair4') || 'UNDECIDED');

    const getPairImages = (selection: string, optA: string, imgA: string, optB: string, imgB: string, isLeft: boolean) => {
        if (selection === 'UNDECIDED') return [imgA, imgB];
        if (selection === optA) return isLeft ? [imgA] : [imgB];
        if (selection === optB) return isLeft ? [imgB] : [imgA];
        return [imgA, imgB];
    };

    const p1Left = getPairImages(pair1, 'BARCA_LEFT', String(getField('varBarca')), 'CHELSEA_LEFT', String(getField('varChelsea')), true);
    const p1Right = getPairImages(pair1, 'BARCA_LEFT', String(getField('varBarca')), 'CHELSEA_LEFT', String(getField('varChelsea')), false);

    const p2Left = getPairImages(pair2, 'LIV_LEFT', String(getField('varLiv')), 'TOT_LEFT', String(getField('varTot')), true);
    const p2Right = getPairImages(pair2, 'LIV_LEFT', String(getField('varLiv')), 'TOT_LEFT', String(getField('varTot')), false);

    const p3Left = getPairImages(pair3, 'SPORTING_LEFT', String(getField('varSporting')), 'CITY_LEFT', String(getField('varCity')), true);
    const p3Right = getPairImages(pair3, 'SPORTING_LEFT', String(getField('varSporting')), 'CITY_LEFT', String(getField('varCity')), false);

    const p4Left = getPairImages(pair4, 'ARSENAL_LEFT', String(getField('varArsenal')), 'BAYERN_LEFT', String(getField('varBayern')), true);
    const p4Right = getPairImages(pair4, 'ARSENAL_LEFT', String(getField('varArsenal')), 'BAYERN_LEFT', String(getField('varBayern')), false);

    const renderBox = (images: string[], isDecided: boolean = false) => (
        <div className={`flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] w-56 h-20 relative z-10 transition-all duration-500
            ${designStyle === 'STYLE_1' ? 'rounded-2xl bg-white border-2' : ''}
            ${designStyle === 'STYLE_2' ? 'skew-x-[-10deg] bg-gradient-to-r from-gray-100 to-white border-b-4' : ''}
            ${designStyle === 'STYLE_3' ? 'rounded-full bg-black/40 backdrop-blur-md border border-white/20' : ''}
        `} style={{ 
            borderColor: designStyle === 'STYLE_1' ? (isDecided ? '#fbbf24' : 'rgba(255,255,255,0.8)') : (designStyle === 'STYLE_2' ? activeTheme.accent : undefined),
            boxShadow: isDecided && designStyle === 'STYLE_1' ? `0 0 20px rgba(251,191,36,0.5)` : undefined
        }}>
            <div className={`flex items-center justify-center gap-4 ${designStyle === 'STYLE_2' ? 'skew-x-[10deg]' : ''}`}>
                {images.map((img, idx) => (
                    <React.Fragment key={idx}>
                        <img src={img} className="w-12 h-12 object-contain drop-shadow-md transition-transform duration-500 hover:scale-110" />
                        {idx < images.length - 1 && <span className="text-gray-400 font-black text-2xl opacity-40">/</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    const renderMatchup = (fixedImg: string, varImages: string[], isLeft: boolean, index: number, isDecided: boolean) => (
        <div className="flex flex-col gap-4 relative group" style={{ animationDelay: `${index * 100}ms` }}>
            <div className={`absolute top-10 bottom-10 w-12 border-y-2 opacity-60 group-hover:opacity-100 transition-all duration-500 ${isLeft ? '-right-12 border-r-2 rounded-r-xl' : '-left-12 border-l-2 rounded-l-xl'}`} style={{ borderColor: '#fbbf24' }}>
                <div className={`absolute top-1/2 w-12 border-t-2`} style={{ borderColor: '#fbbf24', [isLeft ? 'left' : 'right']: '100%' }}></div>
            </div>
            
            {renderBox([fixedImg], true)}
            {renderBox(varImages, isDecided)}
        </div>
    );

    return (
        <div style={containerStyle}>
            <div className="absolute inset-0 z-0 overflow-hidden bg-[#020617]">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-40" style={{ background: activeTheme.primary }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-40" style={{ background: activeTheme.accent }}></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            </div>

            <div style={contentWrapperStyle} className="relative z-10">
                <div className={`w-full h-full flex flex-col justify-center items-center subpixel-antialiased relative ${animClass}`}>
                
                <div className="flex justify-between items-center w-full max-w-[1600px] px-16" style={{ direction: 'ltr' }}>
                    
                    <div className="flex flex-col gap-8">
                        {renderMatchup(String(getField('teamL1')), p1Left, true, 1, pair1 !== 'UNDECIDED')}
                        {renderMatchup(String(getField('teamL2')), p2Left, true, 2, pair2 !== 'UNDECIDED')}
                        {renderMatchup(String(getField('teamL3')), p3Left, true, 3, pair3 !== 'UNDECIDED')}
                        {renderMatchup(String(getField('teamL4')), p4Left, true, 4, pair4 !== 'UNDECIDED')}
                    </div>

                    <div className="flex flex-col items-center justify-center px-12">
                        <div className="bg-white/10 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/20 mb-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            <h1 className="text-4xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg text-center" style={{ textRendering: 'geometricPrecision' }}>
                                {headline}
                            </h1>
                        </div>
                        
                        <div className="relative w-80 h-80 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full animate-pulse opacity-20 blur-2xl" style={{ backgroundColor: activeTheme.accent }}></div>
                            <img src={centerImage} className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] relative z-10" alt="Center Graphic" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-8">
                        {renderMatchup(String(getField('teamR1')), p1Right, false, 1, pair1 !== 'UNDECIDED')}
                        {renderMatchup(String(getField('teamR2')), p2Right, false, 2, pair2 !== 'UNDECIDED')}
                        {renderMatchup(String(getField('teamR3')), p3Right, false, 3, pair3 !== 'UNDECIDED')}
                        {renderMatchup(String(getField('teamR4')), p4Right, false, 4, pair4 !== 'UNDECIDED')}
                    </div>

                </div>

                <div className="absolute bottom-8 right-12 opacity-60 flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10" style={{ direction: 'ltr' }}>
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: activeTheme.accent, color: activeTheme.accent }}></div>
                    <span className="text-sm font-mono font-bold text-white uppercase tracking-[0.4em]">{watermarkText}</span>
                </div>

                </div>
            </div>
        </div>
    );
};
