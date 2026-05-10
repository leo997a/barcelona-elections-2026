import React, { useEffect, useRef } from 'react';
import { RendererProps } from './SharedComponents';

// ─── Transfer News Renderer ──────────────────────────────────────────────────
// Inspired by: Fabrizio Romano + DAZN Bold Typography + NSL Diagonal Accents
// Design: Dramatic reveal, massive bold text, caution-tape accents, confidence meter
// ─────────────────────────────────────────────────────────────────────────────

export const TransferNewsRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, contentWrapperStyle, playSound, wasVisible,
}) => {
  const playerName    = String(getField('playerName')    || 'اسم اللاعب');
  const playerImage   = String(getField('playerImage')   || '');
  const fromClub      = String(getField('fromClub')      || 'النادي المغادر');
  const toClub        = String(getField('toClub')        || 'النادي الجديد');
  const dealValue     = String(getField('dealValue')     || '80M €');
  const confidence    = Number(getField('confidence')    || 85);
  const headline      = String(getField('headline')      || 'DONE DEAL ✅');
  const source        = String(getField('source')        || 'Reo Show Exclusive');
  const accentColor   = String(getField('accentColor')   || '#E9FF00');
  const isUrgent      = Boolean(getField('isUrgent')     ?? true);

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) {
      didPlay.current = true;
      playSound('ENTRY').catch(() => {});
    }
  }, [wasVisible, playSound]);

  const confidenceColor = confidence >= 90 ? '#22c55e' : confidence >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div style={containerStyle}>
      <div style={contentWrapperStyle}>
        {/* Black background */}
        <div className="absolute inset-0 bg-[#050505]" />

        {/* Diagonal caution-tape accent (DAZN-style) */}
        {isUrgent && (
          <div className="absolute top-0 inset-x-0 h-10 overflow-hidden">
            <div className="flex h-full">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-full w-8 shrink-0 odd:opacity-100 even:opacity-0" style={{ background: accentColor, transform: 'skewX(-20deg)', marginRight: '8px' }} />
              ))}
            </div>
            {/* BREAKING text over caution tape */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-black tracking-[0.5em] text-black uppercase">⚡ BREAKING TRANSFER NEWS ⚡</span>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="absolute inset-0 flex" style={{ top: isUrgent ? '40px' : '0' }}>
          
          {/* Left: Player image with dramatic clip-path */}
          <div className="relative w-2/5 h-full overflow-hidden" style={{ clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)' }}>
            {playerImage ? (
              <img src={playerImage} className="w-full h-full object-cover object-top" alt="" />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-950 flex items-center justify-center">
                <span className="text-6xl">⚽</span>
              </div>
            )}
            {/* Vignette */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 40%, #050505 100%)' }} />
          </div>

          {/* Right: Info */}
          <div className="flex-1 flex flex-col justify-center px-8 gap-4">
            
            {/* Player name - MASSIVE */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-1" style={{ color: accentColor }}>TRANSFER</p>
              <h1 className="text-4xl font-black text-white leading-none uppercase tracking-tight">{playerName}</h1>
            </div>

            {/* Deal info */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">من</p>
                <p className="text-sm font-black text-white/70">{fromClub}</p>
              </div>
              <div className="flex flex-col items-center gap-1 px-3">
                <div className="text-xl" style={{ color: accentColor }}>→</div>
                <p className="text-lg font-black" style={{ color: accentColor }}>{dealValue}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">إلى</p>
                <p className="text-sm font-black text-white">{toClub}</p>
              </div>
            </div>

            {/* Headline badge */}
            <div className="inline-flex self-start">
              <div className="px-4 py-2 font-black text-black text-lg tracking-wide" style={{ background: accentColor, clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)' }}>
                {headline}
              </div>
            </div>

            {/* Confidence meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">نسبة التأكد</span>
                <span className="text-sm font-black" style={{ color: confidenceColor }}>{confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${confidence}%`, background: `linear-gradient(90deg, ${confidenceColor}, ${confidenceColor}aa)`, boxShadow: `0 0 10px ${confidenceColor}` }} />
              </div>
            </div>

            {/* Source */}
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">📡 {source}</p>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
      </div>
    </div>
  );
};
