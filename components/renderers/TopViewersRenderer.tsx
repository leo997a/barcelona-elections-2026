import React, { useEffect, useState } from 'react';
import { RendererProps } from './SharedComponents';

interface Viewer {
  rank: number;
  name: string;
  image: string;
  badge: string;
}

const parseViewers = (getField: (id: string) => unknown, count: number): Viewer[] => {
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

// ─── Rank medal colors ────────────────────────────────────────────────────────
const MEDAL: Record<number, { color: string; icon: string }> = {
  1: { color: '#FFD700', icon: '👑' },
  2: { color: '#C0C0C0', icon: '🥈' },
  3: { color: '#CD7F32', icon: '🥉' },
};

// ─── Single card with staggered entrance ─────────────────────────────────────

const ViewerRow: React.FC<{
  v: Viewer;
  accent: string;
  delay: number;
  compact: boolean;
}> = ({ v, accent, delay, compact }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const medal = MEDAL[v.rank];
  const rankColor = medal?.color || accent;

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(-40px) scale(0.95)',
        transition: `opacity 0.55s cubic-bezier(.22,1,.36,1), transform 0.55s cubic-bezier(.22,1,.36,1)`,
        transitionDelay: `${delay}ms`,
      }}
      className="relative flex items-center gap-3 group"
    >
      {/* Glow line on left edge */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-70"
        style={{ backgroundColor: rankColor }}
      />

      {/* Rank badge */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 shadow-lg"
        style={{ borderColor: rankColor + '88', backgroundColor: rankColor + '22', color: rankColor }}
      >
        {medal ? medal.icon : v.rank}
      </div>

      {/* Avatar */}
      <div
        className="flex-shrink-0 rounded-xl overflow-hidden border-2 shadow-lg"
        style={{
          width: compact ? 44 : 52,
          height: compact ? 44 : 52,
          borderColor: rankColor + '66',
        }}
      >
        {v.image ? (
          <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-lg font-black text-white"
            style={{ background: `linear-gradient(135deg, ${accent}99, ${accent}22)` }}
          >
            {v.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name + badge */}
      <div className="flex-1 min-w-0 pl-1">
        <p
          className="text-white font-black text-sm truncate leading-tight"
          style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
        >
          {v.name}
        </p>
        {v.badge && (
          <span
            className="text-[10px] font-bold mt-0.5 inline-block truncate max-w-full"
            style={{ color: accent }}
          >
            {v.badge}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Main Renderer ────────────────────────────────────────────────────────────

export const TopViewersRenderer: React.FC<RendererProps> = ({
  config, getField, containerStyle, contentWrapperStyle, animClass,
}) => {
  const viewerCount  = Math.min(Number(getField('viewerCount') || 5), 10);
  const title        = String(getField('title') || 'أبرز المتفاعلين');
  const channelName  = String(getField('channelName') || 'REO LIVE');
  const channelLogo  = String(getField('channelLogo') || '');
  const themePreset  = String(getField('themePreset') || 'BLUE');
  const viewers      = parseViewers(getField, viewerCount);

  const THEMES: Record<string, { accent: string; bg: string; glow: string }> = {
    BLUE:   { accent: '#60a5fa', bg: 'linear-gradient(180deg,#0a1628 0%,#0d1f3c 100%)', glow: 'rgba(59,130,246,0.25)' },
    GOLD:   { accent: '#fbbf24', bg: 'linear-gradient(180deg,#1a1000 0%,#2d1e00 100%)', glow: 'rgba(251,191,36,0.25)' },
    RED:    { accent: '#f87171', bg: 'linear-gradient(180deg,#1a0000 0%,#2d0000 100%)', glow: 'rgba(239,68,68,0.25)' },
    GREEN:  { accent: '#34d399', bg: 'linear-gradient(180deg,#001a0d 0%,#002d1a 100%)', glow: 'rgba(16,185,129,0.25)' },
    PURPLE: { accent: '#a78bfa', bg: 'linear-gradient(180deg,#0d0020 0%,#1a003d 100%)', glow: 'rgba(139,92,246,0.25)' },
  };

  const theme = THEMES[themePreset] || THEMES.BLUE;
  const compact = viewerCount > 6;

  return (
    <div style={containerStyle}>
      <div
        style={contentWrapperStyle}
        className={`relative z-10 flex items-center justify-start h-full pl-10 ${animClass}`}
      >
        {viewers.length > 0 && (
          <div
            className="relative flex flex-col"
            style={{
              background: theme.bg,
              borderRadius: 20,
              border: `1px solid ${theme.accent}33`,
              boxShadow: `0 0 60px ${theme.glow}, inset 0 0 40px rgba(0,0,0,0.4)`,
              width: 300,
              overflow: 'hidden',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Animated top glow bar */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: theme.accent + '22' }}
            >
              <div className="flex items-center gap-2.5">
                {channelLogo ? (
                  <img src={channelLogo} alt="logo" className="w-8 h-8 rounded-full object-cover border" style={{ borderColor: theme.accent + '44' }} />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border"
                    style={{ backgroundColor: theme.accent + '22', borderColor: theme.accent + '44', color: theme.accent }}>
                    {channelName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-white text-xs font-black leading-none">{channelName}</p>
                  <p className="text-[9px] mt-0.5 font-bold" style={{ color: theme.accent }}>{title}</p>
                </div>
              </div>
              {/* Live dot */}
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
                <span className="text-[9px] font-black" style={{ color: theme.accent }}>LIVE</span>
              </div>
            </div>

            {/* Viewers list */}
            <div className="flex flex-col gap-3 px-5 py-4">
              {viewers.map((v, i) => (
                <ViewerRow
                  key={v.rank}
                  v={v}
                  accent={theme.accent}
                  delay={300 + i * 120}
                  compact={compact}
                />
              ))}
            </div>

            {/* Bottom shimmer */}
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.accent}66, transparent)`,
                animation: 'shimmer 3s ease-in-out infinite reverse',
              }}
            />
          </div>
        )}

        <style>{`
          @keyframes shimmer {
            0%   { opacity: 0.2; transform: scaleX(0.3); }
            50%  { opacity: 1;   transform: scaleX(1); }
            100% { opacity: 0.2; transform: scaleX(0.3); }
          }
        `}</style>
      </div>
    </div>
  );
};
