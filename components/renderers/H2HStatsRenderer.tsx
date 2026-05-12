import React, { useEffect, useRef } from 'react';
import { RendererProps } from './SharedComponents';

// ─── H2H Stats Renderer v2 ───────────────────────────────────────────────────
// Reference: NSL 2025 Broadcast Package (behance_images/nsl_*)
// Design Language:
//   - Split layout: Left = photo + massive condensed name | Right = stats on dark
//   - Vertical "REO SHOW" watermark on edge (rotated)
//   - Stat bars: thick solid blocks, no gradients
//   - Typography: Oswald-style (Barlow Condensed loaded from Google Fonts)
//   - Color: team colors as full-bleed overlay on photo
// ─────────────────────────────────────────────────────────────────────────────

export const H2HStatsRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, contentWrapperStyle, playSound, wasVisible,
}) => {
  const p1Name = String(getField('player1Name') || 'لامين يامال');
  const p1Image = String(getField('player1Image') || '');
  const p1Color = String(getField('player1Color') || '#004D98');
  const p1Club = String(getField('player1Club') || 'FC BARCELONA');
  const p2Name = String(getField('player2Name') || 'فينيسيوس جونيور');
  const p2Image = String(getField('player2Image') || '');
  const p2Color = String(getField('player2Color') || '#C00000');
  const p2Club = String(getField('player2Club') || 'REAL MADRID');
  const bgImage = String(getField('bgImage') || '');
  const matchLabel = String(getField('matchLabel') || 'HEAD TO HEAD');

  let stats: { label: string; v1: number; v2: number }[] = [];
  try {
    const raw = getField('statsData');
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) stats = parsed;
  } catch { /* ignore */ }
  if (stats.length === 0) stats = [
    { label: 'الأهداف', v1: 15, v2: 18 },
    { label: 'التمريرات', v1: 72, v2: 65 },
    { label: 'الدريبلات', v1: 88, v2: 91 },
    { label: 'التقييم', v1: 89, v2: 92 },
  ];

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) { didPlay.current = true; playSound('ENTRY').catch(() => { }); }
  }, [wasVisible, playSound]);

  const StatBar = ({ v1, v2, label }: { v1: number; v2: number; label: string }) => {
    const total = v1 + v2 || 1;
    const pct1 = Math.round((v1 / total) * 100);
    const pct2 = 100 - pct1;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
          <span style={{ color: p1Color === '#FFFFFF' ? '#ccc' : p1Color }}>{v1}</span>
          <span className="text-white/40">{label}</span>
          <span style={{ color: p2Color === '#FFFFFF' ? '#ccc' : p2Color }}>{v2}</span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-none">
          <div style={{ width: `${pct1}%`, background: p1Color }} className="transition-all duration-1000" />
          <div className="w-px bg-black" />
          <div style={{ width: `${pct2}%`, background: p2Color }} className="transition-all duration-1000" />
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet" />
      <div style={contentWrapperStyle} className="overflow-hidden">

        {/* ── BACKGROUND ── */}
        <div className="absolute inset-0 bg-[#0a0a0a]" />

        {/* ── LEFT HALF: Player 1 ── */}
        <div className="absolute left-0 top-0 bottom-0 w-[46%] overflow-hidden">
          {p1Image ? (
            <img src={p1Image} alt="" className="w-full h-full object-cover object-top scale-110" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(160deg, ${p1Color}aa, #000)` }} />
          )}
          {/* Color wash overlay */}
          <div className="absolute inset-0" style={{ background: `${p1Color}55`, mixBlendMode: 'multiply' }} />
          {/* Gradient fade to center */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 30%, #0a0a0a 100%)' }} />

          {/* Club label */}
          <div className="absolute bottom-[44%] left-6">
            <p className="text-[10px] font-bold tracking-[0.35em] uppercase" style={{ color: p1Color, fontFamily: 'Barlow Condensed, sans-serif' }}>{p1Club}</p>
          </div>

          {/* Massive player name */}
          <div className="absolute bottom-6 left-0 right-0 px-6 overflow-hidden">
            <h1 className="leading-none font-black uppercase text-white"
              style={{ fontSize: 'clamp(28px, 5.5vw, 72px)', fontFamily: 'Barlow Condensed, sans-serif', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              {p1Name}
            </h1>
          </div>
        </div>

        {/* ── RIGHT HALF: Player 2 ── */}
        <div className="absolute right-0 top-0 bottom-0 w-[46%] overflow-hidden">
          {p2Image ? (
            <img src={p2Image} alt="" className="w-full h-full object-cover object-top scale-110" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(200deg, ${p2Color}aa, #000)` }} />
          )}
          <div className="absolute inset-0" style={{ background: `${p2Color}55`, mixBlendMode: 'multiply' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, transparent 30%, #0a0a0a 100%)' }} />

          <div className="absolute bottom-[44%] right-6 text-right">
            <p className="text-[10px] font-bold tracking-[0.35em] uppercase" style={{ color: p2Color === '#FFFFFF' ? '#ccc' : p2Color, fontFamily: 'Barlow Condensed, sans-serif' }}>{p2Club}</p>
          </div>
          <div className="absolute bottom-6 left-0 right-0 px-6 overflow-hidden text-right">
            <h1 className="leading-none font-black uppercase text-white"
              style={{ fontSize: 'clamp(28px, 5.5vw, 72px)', fontFamily: 'Barlow Condensed, sans-serif', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              {p2Name}
            </h1>
          </div>
        </div>

        {/* ── CENTER: Stats panel ── */}
        <div className="absolute inset-y-0 left-[42%] right-[42%] flex flex-col items-center justify-center gap-3 z-10">
          {/* Title badge */}
          <div className="bg-white px-4 py-1 mb-2">
            <span className="text-black text-[10px] font-black tracking-[0.4em] uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{matchLabel}</span>
          </div>

          {/* Vertical divider */}
          <div className="flex flex-col gap-3 w-32">
            {stats.map((s, i) => <StatBar key={i} v1={s.v1} v2={s.v2} label={s.label} />)}
          </div>
        </div>

        {/* ── LEFT EDGE watermark ── */}
        <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center overflow-hidden z-20">
          <div className="text-[7px] font-black tracking-[0.4em] text-white/20 uppercase whitespace-nowrap"
            style={{ transform: 'rotate(-90deg)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.4em' }}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className="mx-3">REO SHOW ⊕</span>)}
          </div>
        </div>

        {/* ── RIGHT EDGE watermark ── */}
        <div className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center overflow-hidden z-20">
          <div className="text-[7px] font-black tracking-[0.4em] text-white/20 uppercase whitespace-nowrap"
            style={{ transform: 'rotate(90deg)', fontFamily: 'Barlow Condensed, sans-serif' }}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className="mx-3">REO SHOW ⊕</span>)}
          </div>
        </div>

        {/* ── TOP label bar ── */}
        <div className="absolute top-0 inset-x-6 h-8 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p1Color }} />
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{p1Club}</span>
          </div>
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">REO SHOW • LIVE</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{p2Club}</span>
            <div className="w-2 h-2 rounded-full" style={{ background: p2Color === '#FFFFFF' ? '#ccc' : p2Color }} />
          </div>
        </div>
      </div>
    </div>
  );
};
