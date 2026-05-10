import React, { useEffect, useRef } from 'react';
import { RendererProps } from './SharedComponents';

// ─── Barca Premium Renderer ──────────────────────────────────────────────────
// Inspired by: FC Barcelona official identity + La Liga EA Sports visual language
// Design: Blaugrana (wine red + dark blue), gold accents, wireframe Spotify Camp Nou
// ─────────────────────────────────────────────────────────────────────────────

const BARCA_RED    = '#A50044';
const BARCA_BLUE   = '#004D98';
const BARCA_GOLD   = '#EDBB00';

export const BarcaPremiumRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, contentWrapperStyle, playSound, wasVisible,
}) => {
  const headline     = String(getField('headline')    || 'قضية برشلونة');
  const subheadline  = String(getField('subheadline') || 'النتيجة النهائية');
  const bodyText     = String(getField('bodyText')    || 'معلومات إضافية حول هذا الخبر المهم المتعلق بنادي برشلونة.');
  const playerImage  = String(getField('playerImage') || '');
  const badgeMode    = String(getField('badgeMode')   || 'news'); // 'news' | 'stats' | 'lineup'
  const stat1Label   = String(getField('stat1Label')  || 'الأهداف');
  const stat1Value   = String(getField('stat1Value')  || '25');
  const stat2Label   = String(getField('stat2Label')  || 'المباريات');
  const stat2Value   = String(getField('stat2Value')  || '38');
  const stat3Label   = String(getField('stat3Label')  || 'التمريرات');
  const stat3Value   = String(getField('stat3Value')  || '143');
  const showBadge    = Boolean(getField('showBadge')  ?? true);

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) {
      didPlay.current = true;
      playSound('ENTRY').catch(() => {});
    }
  }, [wasVisible, playSound]);

  return (
    <div style={containerStyle}>
      <div style={contentWrapperStyle}>
        {/* Deep dark blaugrana background */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, #0a0016 0%, #06001a 40%, #000d20 100%)` }} />

        {/* Subtle Camp Nou wireframe silhouette */}
        <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 800 400" className="w-full h-auto" fill="none" stroke="white" strokeWidth="1">
            <ellipse cx="400" cy="200" rx="380" ry="180" />
            <ellipse cx="400" cy="200" rx="300" ry="140" />
            <ellipse cx="400" cy="200" rx="220" ry="100" />
            <line x1="20" y1="200" x2="780" y2="200" />
            <line x1="400" y1="20" x2="400" y2="380" />
          </svg>
        </div>

        {/* Left blaugrana stripe column */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1" style={{ background: i % 2 === 0 ? BARCA_RED : BARCA_BLUE, opacity: 0.85 }} />
          ))}
        </div>

        {/* Top gold border */}
        <div className="absolute top-0 inset-x-16 h-0.5" style={{ background: `linear-gradient(90deg, ${BARCA_GOLD}, transparent)` }} />

        {/* Main content */}
        <div className="absolute inset-0 flex" style={{ paddingLeft: '76px' }}>
          
          {/* Left column: Text info */}
          <div className="flex-1 flex flex-col justify-center p-8 gap-5">
            
            {/* Barca badge */}
            {showBadge && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-lg" style={{ background: `linear-gradient(135deg, ${BARCA_RED}, ${BARCA_BLUE})`, color: BARCA_GOLD, border: `2px solid ${BARCA_GOLD}` }}>
                  FCB
                </div>
                <div className="h-px flex-1 opacity-20" style={{ background: BARCA_GOLD }} />
                <span className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: BARCA_GOLD }}>FC BARCELONA</span>
              </div>
            )}

            {/* Headline */}
            <div>
              <h1 className="text-3xl font-black text-white leading-tight">{headline}</h1>
              <p className="text-sm font-bold mt-1" style={{ color: BARCA_GOLD }}>{subheadline}</p>
            </div>

            {/* Body text */}
            {badgeMode === 'news' && (
              <p className="text-sm text-white/60 leading-relaxed max-w-sm">{bodyText}</p>
            )}

            {/* Stats grid for 'stats' mode */}
            {badgeMode === 'stats' && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: stat1Label, value: stat1Value },
                  { label: stat2Label, value: stat2Value },
                  { label: stat3Label, value: stat3Value },
                ].map((s, i) => (
                  <div key={i} className="text-center p-3 rounded-xl border" style={{ borderColor: `${BARCA_GOLD}30`, background: `${BARCA_GOLD}08` }}>
                    <p className="text-2xl font-black" style={{ color: BARCA_GOLD }}>{s.value}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* REO watermark */}
            <div className="flex items-center gap-2 mt-auto">
              <div className="w-4 h-0.5 rounded" style={{ background: BARCA_GOLD }} />
              <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: `${BARCA_GOLD}60` }}>REO SHOW EXCLUSIVE</span>
            </div>
          </div>

          {/* Right column: Player image */}
          {playerImage && (
            <div className="relative w-2/5 h-full overflow-hidden" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}>
              <img src={playerImage} className="w-full h-full object-cover object-top" alt="" />
              {/* Gradient overlay */}
              <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, #000d20 0%, transparent 40%, transparent 70%, #000d20 100%)` }} />
              <div className="absolute bottom-0 inset-x-0 h-1/3" style={{ background: `linear-gradient(to top, #000d20, transparent)` }} />
            </div>
          )}
        </div>

        {/* Bottom blaugrana stripe */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 flex">
          <div className="flex-1" style={{ background: BARCA_RED }} />
          <div className="flex-1" style={{ background: BARCA_BLUE }} />
          <div className="flex-1" style={{ background: BARCA_RED }} />
          <div className="flex-1" style={{ background: BARCA_BLUE }} />
          <div className="flex-1" style={{ background: BARCA_RED }} />
          <div className="flex-1" style={{ background: BARCA_BLUE }} />
        </div>
      </div>
    </div>
  );
};
