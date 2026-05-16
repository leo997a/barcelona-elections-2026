import React, { useEffect } from 'react';
import { RendererProps } from './SharedComponents';

// ─── Barca Premium Renderer v2 ───────────────────────────────────────────────
// Reference: NSL player card (nsl_7 = Mégane Sauvé) + La Liga EA Sports
// Design Language:
//   - Full-bleed player photo with team color overlay (deep blue/crimson)
//   - Massive player surname in ultra-condensed black font
//   - Smaller first name above
//   - Bottom info bar: club badge area | stat boxes | context info
//   - Vertical side repeat text watermark on both edges (like NSL)
//   - Black horizontal bar at bottom 30% for text readability
//   - Accent: Barca gold #EDBB00
// ─────────────────────────────────────────────────────────────────────────────

const BARCA_RED  = '#A50044';
const BARCA_BLUE = '#004D98';
const BARCA_GOLD = '#EDBB00';

export const BarcaPremiumRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, contentWrapperStyle, playSound, wasVisible,
}) => {
  const firstName   = String(getField('firstName')    || 'LAMINE');
  const lastName    = String(getField('lastName')     || 'YAMAL');
  const playerImage = String(getField('playerImage')  || '');
  const position    = String(getField('position')     || 'RW');
  const jerseyNum   = String(getField('jerseyNum')    || '27');
  const badgeMode   = String(getField('badgeMode')    || 'player'); // player | news | stats
  const headline    = String(getField('headline')     || 'FC BARCELONA');
  const subline     = String(getField('subline')      || 'LA LIGA • 2024/25');
  const bodyText    = String(getField('bodyText')     || '');
  const stat1L      = String(getField('stat1Label')   || 'GOALS');
  const stat1V      = String(getField('stat1Value')   || '15');
  const stat2L      = String(getField('stat2Label')   || 'APPS');
  const stat2V      = String(getField('stat2Value')   || '38');
  const stat3L      = String(getField('stat3Label')   || 'ASSISTS');
  const stat3V      = String(getField('stat3Value')   || '12');
  const teamColor   = String(getField('teamColor')    || BARCA_BLUE);
  const showBadge   = Boolean(getField('showBadge')   ?? true);

  // NOTE: Entry sound is played by OverlayRenderer — do NOT play here to avoid double audio

  const isPlayerMode = badgeMode === 'player';
  const isNewsMode   = badgeMode === 'news';
  const isStatsMode  = badgeMode === 'stats';

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,900;1,900&family=Oswald:wght@700&family=Tajawal:wght@700;900&display=swap" rel="stylesheet" />
      <div style={contentWrapperStyle} className="overflow-hidden">

        {/* ── FULL BLEED PHOTO ── */}
        {playerImage ? (
          <div className="absolute inset-0">
            <img src={playerImage} alt="" className="w-full h-full object-cover object-top" />
            {/* Team color wash */}
            <div className="absolute inset-0" style={{ background: `${teamColor}40`, mixBlendMode: 'multiply' }} />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${teamColor} 0%, ${BARCA_RED}88 50%, #050010 100%)` }} />
        )}

        {/* ── BOTTOM gradient for text ── */}
        <div className="absolute inset-x-0 bottom-0"
          style={{ height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)' }} />

        {/* ── TOP gradient ── */}
        <div className="absolute inset-x-0 top-0"
          style={{ height: '25%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }} />

        {/* ── BLAUGRANA stripe top bar ── */}
        {showBadge && (
          <div className="absolute top-0 inset-x-0 h-1.5 flex">
            {[BARCA_RED, BARCA_GOLD, BARCA_BLUE, BARCA_RED, BARCA_GOLD, BARCA_BLUE, BARCA_RED, BARCA_GOLD, BARCA_BLUE].map((c, i) => (
              <div key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>
        )}

        {/* ── PLAYER NUMBER — top right ── */}
        {isPlayerMode && (
          <div className="absolute top-6 right-8 text-right">
            <p className="leading-none font-black text-white/15"
              style={{ fontSize: 'clamp(60px, 12vw, 160px)', fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1 }}>
              {jerseyNum}
            </p>
            <div className="w-8 h-0.5 ml-auto" style={{ background: BARCA_GOLD }} />
          </div>
        )}

        {/* ── MAIN TEXT ── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-6">

          {isPlayerMode && (
            <>
              {/* Position label */}
              <p className="font-bold tracking-[0.4em] uppercase mb-1" style={{ fontSize: '10px', color: BARCA_GOLD, fontFamily: 'Barlow Condensed, sans-serif' }}>
                {position} • FC BARCELONA
              </p>
              {/* First name */}
              <p className="text-white/70 font-black uppercase leading-none mb-0" style={{ fontSize: 'clamp(18px, 3vw, 36px)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                {firstName}
              </p>
              {/* Last name — HUGE */}
              <div className="relative mb-4">
                <h1 className="text-white font-black uppercase leading-none"
                  style={{ fontSize: 'clamp(52px, 9vw, 120px)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}>
                  {lastName}
                </h1>
                {/* Underline in gold */}
                <div className="absolute -bottom-1 left-0 h-0.5 w-24" style={{ background: BARCA_GOLD }} />
              </div>

              {/* Stats row */}
              <div className="flex gap-0 mt-4">
                {[{ l: stat1L, v: stat1V }, { l: stat2L, v: stat2V }, { l: stat3L, v: stat3V }].map((s, i) => (
                  <div key={i} className="px-4 py-2 text-center" style={{ borderRight: i < 2 ? `1px solid ${BARCA_GOLD}30` : 'none' }}>
                    <p className="font-black leading-none" style={{ fontSize: 'clamp(24px, 4vw, 48px)', color: BARCA_GOLD, fontFamily: 'Barlow Condensed, sans-serif' }}>{s.v}</p>
                    <p className="uppercase tracking-widest text-white/40" style={{ fontSize: '8px', fontFamily: 'Barlow Condensed, sans-serif' }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {isNewsMode && (
            <>
              <p className="font-bold tracking-[0.35em] uppercase mb-2" style={{ fontSize: '10px', color: BARCA_GOLD, fontFamily: 'Barlow Condensed, sans-serif' }}>FC BARCELONA NEWS</p>
              <h1 className="text-white font-black uppercase leading-none mb-2"
                style={{ fontSize: 'clamp(40px, 7vw, 90px)', fontFamily: 'Barlow Condensed, sans-serif' }}>{headline}</h1>
              <p className="font-bold uppercase mb-3" style={{ fontSize: '14px', color: BARCA_GOLD, fontFamily: 'Barlow Condensed, sans-serif' }}>{subline}</p>
              {bodyText && <p className="text-white/60 text-sm leading-relaxed max-w-xl">{bodyText}</p>}
            </>
          )}

          {isStatsMode && (
            <>
              <p className="font-bold tracking-[0.35em] uppercase mb-2" style={{ fontSize: '10px', color: BARCA_GOLD, fontFamily: 'Barlow Condensed, sans-serif' }}>SEASON STATS</p>
              <h1 className="text-white font-black uppercase leading-none mb-4"
                style={{ fontSize: 'clamp(36px, 5.5vw, 72px)', fontFamily: 'Barlow Condensed, sans-serif' }}>{headline}</h1>
              <div className="grid grid-cols-3 gap-3 max-w-lg">
                {[{ l: stat1L, v: stat1V }, { l: stat2L, v: stat2V }, { l: stat3L, v: stat3V }].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${BARCA_GOLD}30`, padding: '12px 16px' }}>
                    <p className="font-black leading-none" style={{ fontSize: 'clamp(28px, 5vw, 56px)', color: BARCA_GOLD, fontFamily: 'Barlow Condensed, sans-serif' }}>{s.v}</p>
                    <p className="uppercase tracking-widest text-white/40 mt-1" style={{ fontSize: '8px', fontFamily: 'Barlow Condensed, sans-serif' }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── LEFT EDGE vertical repeat ── */}
        <div className="absolute left-0 top-0 bottom-0 w-7 z-20 flex items-center justify-center overflow-hidden"
          style={{ borderRight: `1px solid rgba(255,255,255,0.06)` }}>
          <span className="font-black whitespace-nowrap uppercase text-white/10"
            style={{ fontSize: '7px', transform: 'rotate(-90deg)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.4em' }}>
            FC BARCELONA ⊕ REO SHOW ⊕ FC BARCELONA ⊕ REO SHOW ⊕ FC BARCELONA ⊕ REO SHOW ⊕
          </span>
        </div>

        {/* ── RIGHT EDGE vertical repeat ── */}
        <div className="absolute right-0 top-0 bottom-0 w-7 z-20 flex items-center justify-center overflow-hidden"
          style={{ borderLeft: `1px solid rgba(255,255,255,0.06)` }}>
          <span className="font-black whitespace-nowrap uppercase text-white/10"
            style={{ fontSize: '7px', transform: 'rotate(90deg)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.4em' }}>
            FC BARCELONA ⊕ REO SHOW ⊕ FC BARCELONA ⊕ REO SHOW ⊕ FC BARCELONA ⊕ REO SHOW ⊕
          </span>
        </div>
      </div>
    </div>
  );
};
