import React, { useEffect, useState, useRef } from 'react';
import { RendererProps } from './SharedComponents';

interface Viewer {
  name: string;
  image: string;
  badge: string;
  rank: number;
}

// Parse viewers from flat fields: viewer1Name, viewer1Image, viewer1Badge …
const parseViewers = (getField: (id: string) => any, count: number): Viewer[] => {
  const list: Viewer[] = [];
  for (let i = 1; i <= count; i++) {
    const name = String(getField(`viewer${i}Name`) || '').trim();
    if (!name) continue;
    list.push({
      rank: i,
      name,
      image: String(getField(`viewer${i}Image`) || ''),
      badge: String(getField(`viewer${i}Badge`) || `#${i}`),
    });
  }
  return list;
};

// ─── Single viewer avatar (ticker mode) ───────────────────────────────────────

const ViewerAvatar: React.FC<{ v: Viewer; accent: string; delay: number; style?: string }> = ({ v, accent, delay, style }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="flex flex-col items-center gap-2 flex-shrink-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.85)',
        transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        minWidth: 90,
      }}
    >
      {/* Rank badge */}
      <div className="relative">
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full opacity-50 blur-md scale-110"
          style={{ backgroundColor: accent }} />
        {/* Avatar */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 shadow-xl"
          style={{ borderColor: accent }}>
          {v.image ? (
            <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white"
              style={{ background: `linear-gradient(135deg, ${accent}88, ${accent}22)` }}>
              {v.name.charAt(0)}
            </div>
          )}
        </div>
        {/* Rank number */}
        <div
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-lg border border-black/30"
          style={{ background: v.rank === 1 ? '#f59e0b' : v.rank === 2 ? '#94a3b8' : v.rank === 3 ? '#b45309' : '#374151' }}
        >
          {v.rank === 1 ? '👑' : v.rank}
        </div>
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-white font-bold text-sm leading-tight whitespace-nowrap max-w-[100px] truncate" title={v.name}>
          {v.name}
        </p>
        {v.badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block"
            style={{ backgroundColor: accent + '33', color: accent }}>
            {v.badge}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Card mode viewer ──────────────────────────────────────────────────────────

const ViewerCard: React.FC<{ v: Viewer; accent: string; delay: number }> = ({ v, accent, delay }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const rankColor = v.rank === 1 ? '#f59e0b' : v.rank === 2 ? '#94a3b8' : v.rank === 3 ? '#b45309' : accent;

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(60px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
      }}
      className="flex items-center gap-4 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-3.5 border border-white/10 shadow-xl"
    >
      {/* Rank */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 shadow"
        style={{ backgroundColor: rankColor + '33', color: rankColor, border: `2px solid ${rankColor}66` }}>
        {v.rank === 1 ? '👑' : v.rank}
      </div>

      {/* Avatar */}
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 shrink-0 shadow-lg"
        style={{ borderColor: rankColor }}>
        {v.image ? (
          <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-black"
            style={{ background: `linear-gradient(135deg, ${accent}88, ${accent}11)`, color: 'white' }}>
            {v.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name & badge */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base truncate">{v.name}</p>
        {v.badge && <p className="text-sm font-medium mt-0.5" style={{ color: accent }}>{v.badge}</p>}
      </div>
    </div>
  );
};

// ─── Main Renderer ────────────────────────────────────────────────────────────

export const TopViewersRenderer: React.FC<RendererProps> = ({ config, getField, containerStyle, contentWrapperStyle, animClass }) => {
  const viewerCount = Number(getField('viewerCount') || 5);
  const displayMode = String(getField('displayMode') || 'TICKER');
  const title = String(getField('title') || 'أبرز المتفاعلين');
  const channelName = String(getField('channelName') || 'REO LIVE');
  const channelLogo = String(getField('channelLogo') || '');
  const themePreset = String(getField('themePreset') || 'BLUE');
  const viewers = parseViewers(getField, Math.min(viewerCount, 10));

  const THEMES: Record<string, { accent: string; bg: string; border: string }> = {
    BLUE:   { accent: '#3b82f6', bg: 'linear-gradient(135deg,#0f172a,#1e3a5f)', border: '#3b82f6' },
    GOLD:   { accent: '#f59e0b', bg: 'linear-gradient(135deg,#1a1200,#3d2c00)', border: '#f59e0b' },
    RED:    { accent: '#ef4444', bg: 'linear-gradient(135deg,#1a0000,#3d0000)', border: '#ef4444' },
    GREEN:  { accent: '#10b981', bg: 'linear-gradient(135deg,#001a0f,#003d22)', border: '#10b981' },
    PURPLE: { accent: '#8b5cf6', bg: 'linear-gradient(135deg,#0f0020,#250050)', border: '#8b5cf6' },
  };

  const theme = THEMES[themePreset] || THEMES.BLUE;

  return (
    <div style={containerStyle}>
      <div style={contentWrapperStyle} className={`relative z-10 flex flex-col items-center justify-end pb-16 ${animClass}`}>

        {/* ── TICKER MODE ── */}
        {displayMode === 'TICKER' && viewers.length > 0 && (
          <div
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: theme.bg,
              border: `2px solid ${theme.accent}44`,
              minWidth: 900,
              maxWidth: 1400,
            }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-8 py-3 border-b" style={{ borderColor: theme.accent + '33' }}>
              <div className="flex items-center gap-3">
                {channelLogo && <img src={channelLogo} alt="logo" className="w-8 h-8 rounded-full object-cover" />}
                <span className="text-white font-black text-lg tracking-wide">{channelName}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
                <span className="font-bold text-sm" style={{ color: theme.accent }}>{title}</span>
              </div>
            </div>

            {/* Avatars row */}
            <div className="flex items-start gap-6 px-8 py-6 justify-center flex-wrap">
              {viewers.map((v, i) => (
                <ViewerAvatar key={i} v={v} accent={theme.accent} delay={i * 150} />
              ))}
            </div>
          </div>
        )}

        {/* ── CARDS MODE ── */}
        {displayMode === 'CARDS' && viewers.length > 0 && (
          <div
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: theme.bg,
              border: `2px solid ${theme.accent}44`,
              width: 520,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: theme.accent + '33' }}>
              <div className="flex items-center gap-3">
                {channelLogo && <img src={channelLogo} alt="logo" className="w-9 h-9 rounded-full object-cover" />}
                <div>
                  <p className="text-white font-black text-base">{channelName}</p>
                  <p className="text-xs font-medium" style={{ color: theme.accent }}>{title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
                <span className="text-xs font-black text-white/60">LIVE</span>
              </div>
            </div>

            {/* Cards list */}
            <div className="flex flex-col gap-2.5 p-5">
              {viewers.slice(0, 5).map((v, i) => (
                <ViewerCard key={i} v={v} accent={theme.accent} delay={i * 120} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
