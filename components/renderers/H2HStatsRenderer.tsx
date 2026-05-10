import React, { useEffect, useRef } from 'react';
import { RendererProps } from './SharedComponents';

// ─── H2H Stats Renderer ─────────────────────────────────────────────────────
// Inspired by: Sky Sports / NSL 2025 Broadcast Package
// Design: High-contrast dark arena, glowing animated stat bars, diagonal accents
// ─────────────────────────────────────────────────────────────────────────────

export const H2HStatsRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, contentWrapperStyle, activeTheme, playSound, wasVisible,
}) => {
  const p1Name    = String(getField('player1Name')    || 'لامين يامال');
  const p1Image   = String(getField('player1Image')   || '');
  const p1Color   = String(getField('player1Color')   || '#004D98');
  const p2Name    = String(getField('player2Name')    || 'فينيسيوس');
  const p2Image   = String(getField('player2Image')   || '');
  const p2Color   = String(getField('player2Color')   || '#FFFFFF');

  // Stats: stored as JSON array [{label, v1, v2}]
  let stats: { label: string; v1: number; v2: number }[] = [];
  try {
    const raw = getField('statsData');
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) stats = parsed;
  } catch { /* ignore */ }

  if (stats.length === 0) {
    stats = [
      { label: 'الأهداف',     v1: 15, v2: 18 },
      { label: 'التمريرات',  v1: 72, v2: 65 },
      { label: 'الدريبلات',  v1: 88, v2: 91 },
      { label: 'التقييم',    v1: 89, v2: 92 },
    ];
  }

  const title   = String(getField('matchTitle')  || 'مقارنة اللاعبين');
  const bgColor = String(getField('bgColor')     || '#0B132B');

  // Play entry sound
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
        {/* Background */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${bgColor} 0%, #0a0f1e 60%, #111827 100%)` }} />
        
        {/* Grid lines overlay (NSL-style) */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Glowing accent top border */}
        <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg, ${p1Color}, ${activeTheme.accent}, ${p2Color})` }} />

        {/* Content */}
        <div className="relative z-10 w-full h-full flex flex-col p-8 gap-6">

          {/* Title */}
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">REO SHOW • STATS</p>
            <h2 className="text-2xl font-black text-white tracking-wide">{title}</h2>
          </div>

          {/* Player Headers */}
          <div className="flex items-center justify-between gap-4">
            {/* Player 1 */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2" style={{ borderColor: p1Color }}>
                {p1Image ? <img src={p1Image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full" style={{ background: p1Color }} />}
              </div>
              <div>
                <p className="text-lg font-black text-white leading-none">{p1Name}</p>
                <div className="h-1 w-full mt-1 rounded-full" style={{ background: p1Color }} />
              </div>
            </div>

            {/* VS Badge */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm">
              <span className="text-[10px] font-black text-white/60">VS</span>
            </div>

            {/* Player 2 */}
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2" style={{ borderColor: p2Color === '#FFFFFF' ? '#888' : p2Color }}>
                {p2Image ? <img src={p2Image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/20" />}
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-white leading-none">{p2Name}</p>
                <div className="h-1 w-full mt-1 rounded-full" style={{ background: p2Color === '#FFFFFF' ? '#888' : p2Color }} />
              </div>
            </div>
          </div>

          {/* Stats Bars */}
          <div className="flex-1 flex flex-col justify-center gap-4">
            {stats.map((stat, i) => {
              const total = stat.v1 + stat.v2 || 1;
              const pct1 = (stat.v1 / total) * 100;
              const pct2 = (stat.v2 / total) * 100;
              return (
                <div key={i} className="space-y-1.5">
                  {/* Values + Label */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-white min-w-[2rem]" style={{ color: p1Color }}>{stat.v1}</span>
                    <span className="font-bold text-white/50 text-[10px] uppercase tracking-wider">{stat.label}</span>
                    <span className="font-black text-white min-w-[2rem] text-right" style={{ color: p2Color === '#FFFFFF' ? '#aaa' : p2Color }}>{stat.v2}</span>
                  </div>
                  {/* Bar */}
                  <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct1}%`, background: p1Color, boxShadow: `0 0 8px ${p1Color}80` }} />
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct2}%`, background: p2Color === '#FFFFFF' ? '#888' : p2Color, boxShadow: `0 0 8px ${p2Color}80` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom watermark */}
          <div className="text-center">
            <span className="text-[9px] font-black tracking-[0.3em] text-white/20 uppercase">REO LIVE • POWERED BY AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
