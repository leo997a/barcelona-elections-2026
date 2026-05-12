import React, { useEffect, useRef } from 'react';
import { RendererProps } from './SharedComponents';

// ─── Transfer News Renderer v2 ───────────────────────────────────────────────
// Reference: NSL scorebug (nsl_7, nsl_9) + DAZN bold + Sky Sports breaking news
// Design Language:
//   - FULL SCREEN dramatic layout
//   - Player photo bleeds out of frame (out-of-bounds effect via negative margin)
//   - Black/dark bottom 40% bar for all info (like NSL scorebug but full-width)
//   - Club names in massive Barlow Condensed uppercase
//   - Arrow separating clubs is massive (→)
//   - Confidence = filled solid bar, no gradient
//   - Diagonal "DONE DEAL" badge in team accent color
//   - Vertical "REO SHOW" on left edge
// ─────────────────────────────────────────────────────────────────────────────

export const TransferNewsRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, contentWrapperStyle, playSound, wasVisible,
}) => {
  const playerName  = String(getField('playerName')   || 'اسم اللاعب');
  const playerImage = String(getField('playerImage')  || '');
  const fromClub    = String(getField('fromClub')     || 'BARCELONA');
  const toClub      = String(getField('toClub')       || 'JUVENTUS');
  const dealValue   = String(getField('dealValue')    || '€80M');
  const confidence  = Math.min(100, Math.max(0, Number(getField('confidence') || 85)));
  const headline    = String(getField('headline')     || 'DONE DEAL');
  const source      = String(getField('source')       || 'Reo Show Exclusive');
  const accentColor = String(getField('accentColor')  || '#E9FF00');
  const isUrgent    = Boolean(getField('isUrgent')    ?? true);
  const fromColor   = String(getField('fromColor')    || '#A50044');
  const toColor     = String(getField('toColor')      || '#000000');

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) { didPlay.current = true; playSound('ENTRY').catch(() => {}); }
  }, [wasVisible, playSound]);

  const confidenceColor = confidence >= 85 ? '#22c55e' : confidence >= 65 ? accentColor : '#ef4444';

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,900;1,900&family=Tajawal:wght@700;900&display=swap" rel="stylesheet" />
      <div style={contentWrapperStyle} className="overflow-hidden">

        {/* ── Full dark background ── */}
        <div className="absolute inset-0 bg-[#080808]" />

        {/* ── Background subtle texture (diamond pattern) ── */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />

        {/* ── TOP: Urgent breaking banner ── */}
        {isUrgent && (
          <div className="absolute top-0 inset-x-0 z-30" style={{ height: '36px' }}>
            {/* Diagonal stripes */}
            <div className="absolute inset-0 overflow-hidden" style={{ background: accentColor }}>
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, black 0, black 10px, transparent 10px, transparent 20px)'
              }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-6">
              <span className="text-[11px] font-black tracking-[0.5em] uppercase text-black"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                ◆ TRANSFER NEWS ◆ REO SHOW EXCLUSIVE ◆ TRANSFER NEWS ◆
              </span>
            </div>
          </div>
        )}

        {/* ── PLAYER PHOTO: Left 45%, bleeds into right ── */}
        <div className="absolute" style={{ left: 0, top: isUrgent ? '36px' : 0, bottom: 0, width: '52%' }}>
          {playerImage ? (
            <div className="w-full h-full relative overflow-visible">
              <img src={playerImage} alt="" className="absolute h-full w-auto object-cover object-top"
                style={{ top: '-5%', right: '-15%', maxWidth: '130%' }} />
              {/* Gradient to make photo blend left→right */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #08080820 30%, #080808 95%)' }} />
              <div className="absolute bottom-0 inset-x-0 h-2/5" style={{ background: 'linear-gradient(to top, #080808, transparent)' }} />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${fromColor}30, #080808)` }}>
              <span style={{ fontSize: '120px', opacity: 0.15 }}>⚽</span>
            </div>
          )}
        </div>

        {/* ── RIGHT INFO COLUMN ── */}
        <div className="absolute flex flex-col justify-center" style={{ left: '40%', right: '28px', top: isUrgent ? '36px' : 0, bottom: 0, padding: '24px 0' }}>

          {/* Player name — MASSIVE */}
          <div className="mb-4">
            <p className="uppercase text-white/40 font-bold tracking-[0.3em] mb-1"
              style={{ fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif' }}>PLAYER</p>
            <h1 className="text-white uppercase leading-[0.9] font-black"
              style={{ fontSize: 'clamp(40px, 6vw, 84px)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.02em' }}>
              {playerName}
            </h1>
          </div>

          {/* Transfer direction */}
          <div className="flex items-center gap-3 mb-4">
            <div style={{ background: fromColor, padding: '6px 14px' }}>
              <span className="font-black uppercase text-white" style={{ fontSize: '15px', fontFamily: 'Barlow Condensed, sans-serif' }}>{fromClub}</span>
            </div>
            <span className="font-black text-white/40" style={{ fontSize: '24px' }}>→</span>
            <div style={{ background: toColor === '#000000' ? '#222' : toColor, padding: '6px 14px' }}>
              <span className="font-black uppercase text-white" style={{ fontSize: '15px', fontFamily: 'Barlow Condensed, sans-serif' }}>{toClub}</span>
            </div>
          </div>

          {/* Deal value — huge */}
          <div className="mb-5">
            <p className="uppercase text-white/30 font-bold tracking-[0.3em] mb-0.5"
              style={{ fontSize: '9px', fontFamily: 'Barlow Condensed, sans-serif' }}>FEE</p>
            <p className="font-black leading-none" style={{ fontSize: 'clamp(32px, 4.5vw, 60px)', color: accentColor, fontFamily: 'Barlow Condensed, sans-serif' }}>
              {dealValue}
            </p>
          </div>

          {/* DONE DEAL badge */}
          <div className="mb-5 self-start">
            <div className="inline-flex items-center gap-2 px-4 py-2 font-black uppercase text-black"
              style={{ background: accentColor, fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px', clipPath: 'polygon(0 0, 100% 0, 94% 100%, 0 100%)' }}>
              ✓ {headline}
            </div>
          </div>

          {/* Confidence bar */}
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">RELIABILITY</span>
              <span className="font-black" style={{ color: confidenceColor, fontSize: '13px', fontFamily: 'Barlow Condensed, sans-serif' }}>{confidence}%</span>
            </div>
            <div className="h-2 bg-white/10">
              <div style={{ width: `${confidence}%`, background: confidenceColor, height: '100%', transition: 'width 1.5s ease' }} />
            </div>
          </div>

          {/* Source */}
          <p className="text-white/20 uppercase font-bold tracking-widest" style={{ fontSize: '9px', fontFamily: 'Barlow Condensed, sans-serif' }}>
            📡 {source}
          </p>
        </div>

        {/* ── LEFT EDGE vertical watermark ── */}
        <div className="absolute left-0 top-0 bottom-0 w-6 z-20 flex items-center justify-center overflow-hidden">
          <span className="text-white/15 font-black tracking-[0.5em] whitespace-nowrap uppercase"
            style={{ fontSize: '7px', transform: 'rotate(-90deg)', fontFamily: 'Barlow Condensed, sans-serif' }}>
            REO SHOW ⊕ REO SHOW ⊕ REO SHOW ⊕ REO SHOW ⊕ REO SHOW ⊕
          </span>
        </div>

        {/* ── RIGHT EDGE vertical watermark ── */}
        <div className="absolute right-0 top-0 bottom-0 w-6 z-20 flex items-center justify-center overflow-hidden">
          <span className="text-white/15 font-black tracking-[0.5em] whitespace-nowrap uppercase"
            style={{ fontSize: '7px', transform: 'rotate(90deg)', fontFamily: 'Barlow Condensed, sans-serif' }}>
            REO SHOW ⊕ REO SHOW ⊕ REO SHOW ⊕ REO SHOW ⊕ REO SHOW ⊕
          </span>
        </div>
      </div>
    </div>
  );
};
