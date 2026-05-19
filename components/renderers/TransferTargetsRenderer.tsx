import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Sparkles, Target, Activity, Zap, Shield, Star } from 'lucide-react';
import { RendererProps } from './SharedComponents';
import { playCue } from '../../services/audioEngine';

/**
 * TransferTargetsRenderer — قالب أهداف النادي في سوق الانتقالات
 * 5 Visual Themes: NEON_GLASS, TACTICAL_DARK, LUXE_GOLD, CLEAN_BROADCAST, GRADIENT_FIRE
 * 3 Display Modes: SEQUENCE, SLIDE, CYCLE
 * Per-position: 1-7 targets with player image, name, club, club logo, age, value
 */

const POSITION_CONFIG: Array<{ id: string; key: string; arabic: string; english: string; color: string; icon: any }> = [
  { id: 'pos1', key: 'striker',  arabic: 'رأس الحربة',  english: 'STRIKER',     color: '#ef4444', icon: Zap },
  { id: 'pos2', key: 'winger',   arabic: 'الجناح',      english: 'WINGER',      color: '#f97316', icon: Activity },
  { id: 'pos3', key: 'midfield', arabic: 'الوسط',       english: 'MIDFIELD',    color: '#22d3ee', icon: Star },
  { id: 'pos4', key: 'defender', arabic: 'قلب الدفاع',  english: 'CENTRE-BACK', color: '#3b82f6', icon: Shield },
  { id: 'pos5', key: 'fullback', arabic: 'الظهير',      english: 'FULL-BACK',   color: '#8b5cf6', icon: Activity },
  { id: 'pos6', key: 'keeper',   arabic: 'حارس المرمى', english: 'GOALKEEPER',  color: '#22c55e', icon: Shield },
];

type TargetItem = {
  name: string;
  image: string;
  clubName: string;
  clubLogo: string;
  age?: string;
  value?: string;
  rating?: string;
  nationality?: string;
};

const parseTargets = (raw: unknown): TargetItem[] => {
  const text = String(raw || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item): TargetItem | null => {
          if (!item || typeof item !== 'object') return null;
          const r = item as Record<string, unknown>;
          const name = String(r.name || r.player || '').trim();
          if (!name) return null;
          return {
            name,
            image: String(r.image || r.playerImage || ''),
            clubName: String(r.club || r.clubName || r.from || ''),
            clubLogo: String(r.clubLogo || r.logo || ''),
            age: String(r.age || ''),
            value: String(r.value || r.fee || r.price || ''),
            rating: String(r.rating || ''),
            nationality: String(r.nationality || r.nation || ''),
          };
        })
        .filter((item): item is TargetItem => Boolean(item))
        .slice(0, 7);
    }
  } catch { /* fallthrough */ }
  return text.split(/\n|;/).map((line): TargetItem | null => {
    const parts = line.split('|').map(p => p?.trim());
    if (!parts[0]) return null;
    return {
      name: parts[0],
      image: parts[1] || '',
      clubName: parts[2] || '',
      clubLogo: parts[3] || '',
      age: parts[4] || '',
      value: parts[5] || '',
    };
  }).filter((item): item is TargetItem => Boolean(item)).slice(0, 7);
};

const initials = (value: string) =>
  value.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

// ─── Visual Theme Definitions (5 modern broadcast styles) ───────────────────
type ThemeStyle = {
  panelBg: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentGlow: string;
  pattern: 'grid' | 'lines' | 'dots' | 'gradient' | 'none';
  cornerStyle: 'sharp' | 'cut' | 'rounded';
};

const THEME_STYLES: Record<string, ThemeStyle> = {
  NEON_GLASS: {
    panelBg: 'linear-gradient(180deg, rgba(8,12,24,0.96) 0%, rgba(15,18,32,0.92) 50%, rgba(8,12,24,0.96) 100%)',
    cardBg: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.4) 100%)',
    cardBorder: 'rgba(255,255,255,0.12)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    accentGlow: 'rgba(34,211,238,0.4)',
    pattern: 'grid',
    cornerStyle: 'cut',
  },
  TACTICAL_DARK: {
    panelBg: 'linear-gradient(180deg, #050608 0%, #0a0d14 100%)',
    cardBg: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.6) 100%)',
    cardBorder: 'rgba(255,255,255,0.08)',
    textPrimary: '#e8eef4',
    textSecondary: 'rgba(232,238,244,0.5)',
    accentGlow: 'rgba(255,75,62,0.35)',
    pattern: 'lines',
    cornerStyle: 'sharp',
  },
  LUXE_GOLD: {
    panelBg: 'linear-gradient(180deg, #0a0805 0%, #14100a 50%, #0a0805 100%)',
    cardBg: 'linear-gradient(135deg, rgba(237,177,17,0.08) 0%, rgba(0,0,0,0.5) 100%)',
    cardBorder: 'rgba(237,177,17,0.22)',
    textPrimary: '#fff9e6',
    textSecondary: 'rgba(255,249,230,0.55)',
    accentGlow: 'rgba(237,177,17,0.5)',
    pattern: 'gradient',
    cornerStyle: 'cut',
  },
  CLEAN_BROADCAST: {
    panelBg: 'linear-gradient(180deg, #0b1117 0%, #131820 100%)',
    cardBg: 'rgba(20,26,36,0.85)',
    cardBorder: 'rgba(255,255,255,0.1)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.55)',
    accentGlow: 'rgba(59,130,246,0.35)',
    pattern: 'none',
    cornerStyle: 'sharp',
  },
  GRADIENT_FIRE: {
    panelBg: 'linear-gradient(180deg, #1a0808 0%, #0a0408 50%, #16060c 100%)',
    cardBg: 'linear-gradient(135deg, rgba(220,38,38,0.12) 0%, rgba(0,0,0,0.5) 100%)',
    cardBorder: 'rgba(248,113,113,0.25)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,200,200,0.55)',
    accentGlow: 'rgba(248,113,113,0.5)',
    pattern: 'dots',
    cornerStyle: 'rounded',
  },
  CARBON_FIBER: {
    panelBg: 'repeating-linear-gradient(45deg, #0a0a0c 0 4px, #131316 4px 8px), linear-gradient(180deg, #0a0a0c 0%, #161618 100%)',
    cardBg: 'linear-gradient(135deg, rgba(20,20,24,0.85) 0%, rgba(8,8,10,0.92) 100%)',
    cardBorder: 'rgba(180,180,200,0.18)',
    textPrimary: '#f5f5f7',
    textSecondary: 'rgba(255,255,255,0.5)',
    accentGlow: 'rgba(255,255,255,0.18)',
    pattern: 'lines',
    cornerStyle: 'sharp',
  },
  BARCA_HERITAGE: {
    panelBg: 'linear-gradient(180deg, #0a0228 0%, #1a0432 35%, #2d0048 65%, #16012d 100%)',
    cardBg: 'linear-gradient(135deg, rgba(165,0,68,0.18) 0%, rgba(0,77,152,0.12) 100%)',
    cardBorder: 'rgba(237,177,17,0.32)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,228,180,0.6)',
    accentGlow: 'rgba(237,177,17,0.5)',
    pattern: 'gradient',
    cornerStyle: 'cut',
  },
  EMERALD_FIELD: {
    panelBg: 'linear-gradient(180deg, #001a0e 0%, #00261a 50%, #001208 100%)',
    cardBg: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0.5) 100%)',
    cardBorder: 'rgba(16,185,129,0.28)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(180,255,220,0.6)',
    accentGlow: 'rgba(16,185,129,0.45)',
    pattern: 'grid',
    cornerStyle: 'sharp',
  },
  RETRO_ANALOG: {
    panelBg: 'linear-gradient(180deg, #1a1208 0%, #0d0905 100%)',
    cardBg: 'rgba(28,20,10,0.92)',
    cardBorder: 'rgba(245,194,66,0.3)',
    textPrimary: '#fff3d4',
    textSecondary: 'rgba(245,194,66,0.6)',
    accentGlow: 'rgba(245,194,66,0.45)',
    pattern: 'lines',
    cornerStyle: 'rounded',
  },
  HOLOGRAM_PURPLE: {
    panelBg: 'linear-gradient(180deg, #08001a 0%, #14002e 50%, #060010 100%)',
    cardBg: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(8,0,26,0.85) 100%)',
    cardBorder: 'rgba(216,180,254,0.3)',
    textPrimary: '#f5e8ff',
    textSecondary: 'rgba(216,180,254,0.6)',
    accentGlow: 'rgba(168,85,247,0.55)',
    pattern: 'dots',
    cornerStyle: 'cut',
  },
};

const PatternBackground: React.FC<{ pattern: string; color: string }> = ({ pattern, color }) => {
  if (pattern === 'grid') {
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    );
  }
  if (pattern === 'lines') {
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${color}40 0, ${color}40 1px, transparent 1px, transparent 18px)`,
        }}
      />
    );
  }
  if (pattern === 'dots') {
    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, ${color}80 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
        }}
      />
    );
  }
  if (pattern === 'gradient') {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${color}25 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${color}18 0%, transparent 60%)`,
        }}
      />
    );
  }
  return null;
};

// Card frame with theme-specific corners
const cardClipPath = (style: ThemeStyle['cornerStyle']) => {
  if (style === 'cut') return 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))';
  if (style === 'rounded') return undefined;
  return undefined;
};

export const TransferTargetsRenderer: React.FC<RendererProps> = ({
  config,
  getField,
  containerStyle,
  contentWrapperStyle,
  isEditor,
}) => {
  const displayMode = String(getField('displayMode') || 'SEQUENCE');
  const visualTheme = String(getField('visualTheme') || 'NEON_GLASS');
  const theme = THEME_STYLES[visualTheme] || THEME_STYLES.NEON_GLASS;
  const subheadline = String(getField('subheadline') || 'Mercato Targets — Reo Show');
  const clubName = String(getField('clubName') || 'FC Barcelona');
  const clubLogo = String(getField('clubLogo') || 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png');
  const accentColor = String(getField('accentColor') || '#edb111');
  const sidePanelWidth = Number(getField('sidePanelWidth') || 30);
  const sequenceInterval = Number(getField('sequenceInterval') || 4);
  const cycleInterval = Number(getField('cycleInterval') || 30);
  const enabledPositions = String(getField('enabledPositions') || 'pos1,pos2,pos3,pos4').split(',').map(s => s.trim()).filter(Boolean);
  const activePositionKey = String(getField('activePosition') || 'pos1');
  const soundEnabled = getField('soundEnabled') !== false;
  const soundVolume = Number(getField('soundVolume') ?? 0.7);
  const soundPerTarget = String(getField('soundPerTarget') || 'TARGET_REVEAL');
  const showRating = getField('showRating') !== false;
  const showCountry = getField('showCountry') === true;

  // Build position groups
  const positions = useMemo(() => {
    return POSITION_CONFIG.map(pos => {
      const positionLabel = String(getField(`${pos.id}Label`) || pos.arabic);
      const positionEnglish = String(getField(`${pos.id}LabelEn`) || pos.english);
      const targets = parseTargets(getField(`${pos.id}Targets`));
      return { ...pos, label: positionLabel, english: positionEnglish, targets };
    }).filter(p => enabledPositions.includes(p.id) && p.targets.length > 0);
  }, [getField, enabledPositions.join(',')]);

  const [activePosIndex, setActivePosIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const targetSoundDebounce = useRef<number>(0);

  const currentPos = useMemo(() => {
    if (positions.length === 0) return null;
    if (displayMode === 'SLIDE') {
      const found = positions.find(p => p.id === activePositionKey);
      return found || positions[0];
    }
    return positions[activePosIndex % positions.length];
  }, [displayMode, positions, activePosIndex, activePositionKey]);

  // CYCLE rotation
  useEffect(() => {
    if (displayMode !== 'CYCLE' || positions.length <= 1 || isEditor) return;
    const ms = Math.max(5, cycleInterval) * 1000;
    const timer = window.setInterval(() => {
      setActivePosIndex(idx => (idx + 1) % positions.length);
      setRevealedCount(0);
      if (soundEnabled) {
        playCue('POSITION_SWITCH', { volume: soundVolume * 0.85 }).catch(() => undefined);
      }
    }, ms);
    return () => window.clearInterval(timer);
  }, [displayMode, positions.length, cycleInterval, soundEnabled, soundVolume, isEditor]);

  // SEQUENCE reveal one by one
  useEffect(() => {
    if (!currentPos || isEditor) return;
    setRevealedCount(0);
    if (displayMode === 'SLIDE') {
      setRevealedCount(currentPos.targets.length);
      return;
    }
    let cancelled = false;
    const interval = Math.max(1, sequenceInterval);
    const reveal = (index: number) => {
      if (cancelled) return;
      if (index > currentPos.targets.length) return;
      setRevealedCount(index);
      if (index > 0 && soundEnabled) {
        const now = Date.now();
        if (now - targetSoundDebounce.current > 250) {
          targetSoundDebounce.current = now;
          playCue(soundPerTarget, { volume: soundVolume }).catch(() => undefined);
        }
      }
      if (index < currentPos.targets.length) {
        window.setTimeout(() => reveal(index + 1), interval * 1000);
      }
    };
    window.setTimeout(() => reveal(1), 200);
    return () => { cancelled = true; };
  }, [currentPos?.id, displayMode, sequenceInterval, soundEnabled, soundVolume, soundPerTarget, isEditor]);

  useEffect(() => {
    if (isEditor && currentPos) setRevealedCount(currentPos.targets.length);
  }, [isEditor, currentPos?.id, currentPos?.targets.length]);

  if (!currentPos) {
    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="flex items-center justify-center text-white/50">
          <div className="text-center">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>أضف أهدافًا في الإعدادات لمراكز اللعب</p>
          </div>
        </div>
      </div>
    );
  }

  const sidebarWidthPercent = Math.max(20, Math.min(60, sidePanelWidth));
  const PosIcon = currentPos.icon;

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes ttScan { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
        @keyframes ttPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.95; } }
        @keyframes ttRevealCard {
          0% { opacity: 0; transform: translateX(-50px) scale(0.9); filter: blur(8px); }
          60% { opacity: 1; transform: translateX(4px) scale(1.015); filter: blur(0); }
          100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
        }
        @keyframes ttSlideIn {
          0% { opacity: 0; transform: translateY(40px) scale(0.94); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes ttHeaderGlow {
          0%, 100% { box-shadow: 0 0 22px ${theme.accentGlow}; }
          50% { box-shadow: 0 0 50px ${theme.accentGlow}; }
        }
        @keyframes ttImageZoom {
          0% { transform: scale(1.15); filter: blur(8px); opacity: 0; }
          100% { transform: scale(1); filter: blur(0); opacity: 1; }
        }
        @keyframes ttRankSpin {
          0% { transform: rotate(-90deg) scale(0); opacity: 0; }
          100% { transform: rotate(0) scale(1); opacity: 1; }
        }
        @keyframes ttBadgeShine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      <div style={contentWrapperStyle} className="overflow-hidden font-['Tajawal']">
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${sidebarWidthPercent}%`,
            background: theme.panelBg,
            borderRight: `2px solid ${accentColor}55`,
            boxShadow: `8px 0 60px rgba(0,0,0,0.7), inset -1px 0 0 ${theme.cardBorder}`,
            color: theme.textPrimary,
            direction: 'rtl',
          }}
        >
          <PatternBackground pattern={theme.pattern} color={accentColor} />

          {/* Position color accent strip */}
          <div
            className="absolute top-0 right-0 h-full w-2"
            style={{ background: `linear-gradient(180deg, ${currentPos.color} 0%, ${currentPos.color}88 100%)`, boxShadow: `-3px 0 12px ${currentPos.color}66` }}
          />

          {/* Top scanline */}
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/5">
            <div
              className="h-full w-1/3"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                animation: 'ttScan 3.6s linear infinite',
              }}
            />
          </div>

          {/* Header — Club identity */}
          <div className="relative z-10 px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
            <div className="flex items-center gap-3">
              {clubLogo ? (
                <div
                  className="relative w-14 h-14 flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
                  }}
                >
                  <img
                    src={clubLogo}
                    alt=""
                    className="relative z-10 w-12 h-12 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ) : null}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] font-black uppercase tracking-[0.32em]"
                  style={{ color: theme.textSecondary }}
                >
                  MERCATO TARGETS
                </div>
                <div
                  className="font-['Barlow_Condensed'] text-[26px] font-black leading-tight truncate mt-0.5"
                  style={{ color: theme.textPrimary }}
                >
                  {clubName}
                </div>
              </div>
              <Sparkles className="w-4 h-4" style={{ color: accentColor }} strokeWidth={2.4} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: '#ef4444', animation: 'ttPulse 1.4s ease-in-out infinite', boxShadow: '0 0 8px #ef4444' }}
              />
              <span
                className="text-[10px] font-black uppercase tracking-[0.28em]"
                style={{ color: '#ef4444' }}
              >
                LIVE TARGET BOARD
              </span>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${theme.cardBorder}, transparent)` }} />
            </div>
          </div>

          {/* Position banner */}
          <div
            className="relative z-10 mx-4 my-4 px-4 py-3.5 overflow-hidden"
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              clipPath: cardClipPath(theme.cornerStyle),
              animation: 'ttHeaderGlow 3.4s ease-in-out infinite',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: currentPos.color }} />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center border"
                  style={{ borderColor: `${currentPos.color}66`, background: `${currentPos.color}18` }}
                >
                  <PosIcon className="w-5 h-5" style={{ color: currentPos.color }} strokeWidth={2.4} />
                </div>
                <div>
                  <div
                    className="text-[9px] font-black uppercase tracking-[0.28em]"
                    style={{ color: theme.textSecondary }}
                  >
                    {currentPos.english}
                  </div>
                  <div
                    className="font-['Barlow_Condensed'] text-[28px] font-black leading-none mt-1"
                    style={{ color: currentPos.color }}
                  >
                    {currentPos.label}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className="font-['Barlow_Condensed'] text-[42px] font-black leading-none"
                  style={{ color: accentColor, textShadow: `0 0 18px ${accentColor}66` }}
                >
                  {currentPos.targets.length}
                </div>
                <div
                  className="text-[9px] font-black uppercase tracking-[0.18em]"
                  style={{ color: theme.textSecondary }}
                >
                  TARGETS
                </div>
              </div>
            </div>
          </div>

          {/* Targets list — bigger, modern player cards */}
          <div
            className="relative z-10 px-3 pb-4 space-y-2.5 overflow-y-auto"
            style={{ maxHeight: 'calc(100% - 250px)' }}
          >
            {currentPos.targets.map((t, idx) => {
              const isRevealed = idx < revealedCount;
              const isFeatured = idx === 0;
              if (!isRevealed) {
                return (
                  <div
                    key={`placeholder-${idx}`}
                    className="h-[96px]"
                    style={{ background: theme.cardBg, border: `1px dashed ${theme.cardBorder}`, opacity: 0.3 }}
                  />
                );
              }
              const animation = displayMode === 'SLIDE'
                ? `ttSlideIn 0.55s cubic-bezier(.22,1,.36,1) ${idx * 80}ms both`
                : 'ttRevealCard 0.6s cubic-bezier(.22,1,.36,1) both';
              return (
                <div
                  key={`${currentPos.id}-${idx}-${t.name}`}
                  className="relative grid items-stretch overflow-hidden"
                  style={{
                    gridTemplateColumns: '88px 1fr 36px',
                    gap: 0,
                    minHeight: '96px',
                    background: theme.cardBg,
                    border: `1px solid ${isFeatured ? `${accentColor}66` : theme.cardBorder}`,
                    boxShadow: isFeatured ? `0 0 22px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.06)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    clipPath: cardClipPath(theme.cornerStyle),
                    animation,
                  }}
                >
                  {/* Featured glow side bar */}
                  {isFeatured ? (
                    <div
                      className="absolute right-0 top-0 h-full w-1"
                      style={{ background: `linear-gradient(180deg, ${accentColor}, ${currentPos.color})` }}
                    />
                  ) : null}

                  {/* Player image */}
                  <div
                    className="relative h-full overflow-hidden"
                    style={{
                      background: `linear-gradient(160deg, ${currentPos.color}25 0%, rgba(0,0,0,0.4) 100%)`,
                      borderRight: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    {/* Backdrop pattern */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: `radial-gradient(circle at 50% 110%, ${currentPos.color}55 0%, transparent 60%)`,
                      }}
                    />
                    {t.image ? (
                      <img
                        src={t.image}
                        alt={t.name}
                        className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto object-contain"
                        referrerPolicy="no-referrer"
                        style={{ animation: 'ttImageZoom 0.6s cubic-bezier(.22,1,.36,1) both' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center font-['Barlow_Condensed'] text-2xl font-black"
                        style={{ color: theme.textSecondary }}
                      >
                        {initials(t.name)}
                      </div>
                    )}
                    {/* Rank badge */}
                    <div
                      className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center text-[12px] font-black"
                      style={{
                        background: isFeatured ? accentColor : 'rgba(0,0,0,0.78)',
                        color: isFeatured ? '#000' : '#fff',
                        boxShadow: isFeatured ? `0 0 12px ${accentColor}88` : 'none',
                        animation: 'ttRankSpin 0.5s cubic-bezier(.22,1,.36,1) both',
                      }}
                    >
                      {idx + 1}
                    </div>
                  </div>

                  {/* Player info */}
                  <div className="flex flex-col justify-center min-w-0 px-3.5 py-2.5">
                    {/* Name */}
                    <div
                      className="font-['Barlow_Condensed'] text-[22px] font-black leading-tight truncate"
                      style={{ color: theme.textPrimary, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                      dir="ltr"
                    >
                      {t.name}
                    </div>
                    {/* Club row */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {t.clubLogo ? (
                        <img
                          src={t.clubLogo}
                          alt=""
                          className="w-4 h-4 object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : null}
                      <span
                        className="text-[11px] font-bold uppercase tracking-wide truncate"
                        style={{ color: theme.textSecondary }}
                      >
                        {t.clubName || '—'}
                      </span>
                      {showCountry && t.nationality ? (
                        <span
                          className="text-[10px] font-black px-1.5 py-0.5 border"
                          style={{ borderColor: theme.cardBorder, color: theme.textSecondary }}
                        >
                          {t.nationality}
                        </span>
                      ) : null}
                    </div>
                    {/* Stats row: age, value, rating */}
                    {(t.age || t.value || (showRating && t.rating)) ? (
                      <div className="mt-2 flex items-center gap-3 text-[10px] font-black uppercase">
                        {t.age && (
                          <div className="flex items-center gap-1">
                            <span style={{ color: theme.textSecondary }}>AGE</span>
                            <span style={{ color: theme.textPrimary }}>{t.age}</span>
                          </div>
                        )}
                        {showRating && t.rating && (
                          <div
                            className="flex items-center gap-1 px-1.5 py-0.5"
                            style={{
                              background: `${accentColor}22`,
                              border: `1px solid ${accentColor}55`,
                            }}
                          >
                            <Star className="w-2.5 h-2.5" style={{ color: accentColor }} strokeWidth={3} />
                            <span style={{ color: accentColor }}>{t.rating}</span>
                          </div>
                        )}
                        {t.value && (
                          <div className="ml-auto flex items-center gap-1">
                            <span
                              className="font-['Barlow_Condensed'] text-[13px] font-black"
                              style={{ color: accentColor, textShadow: `0 0 8px ${accentColor}66` }}
                            >
                              {t.value}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Target indicator */}
                  <div
                    className="flex flex-col items-center justify-center pr-1.5 gap-1"
                    style={{ borderLeft: `1px solid ${theme.cardBorder}` }}
                  >
                    <Crosshair
                      className="w-4 h-4"
                      style={{ color: isFeatured ? accentColor : currentPos.color }}
                      strokeWidth={2.4}
                    />
                    <div
                      className="text-[8px] font-black tracking-wider"
                      style={{ color: theme.textSecondary }}
                    >
                      {isFeatured ? 'TOP' : `#${idx + 1}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="absolute bottom-0 inset-x-0 px-5 py-3"
            style={{ borderTop: `1px solid ${theme.cardBorder}`, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.22em]">
              <div className="flex items-center gap-2" style={{ color: theme.textSecondary }}>
                <Activity className="w-3 h-3" strokeWidth={2.4} />
                <span className="truncate">{subheadline}</span>
              </div>
              {displayMode === 'CYCLE' && positions.length > 1 ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {positions.map((p, idx) => (
                    <div
                      key={p.id}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: idx === activePosIndex ? '12px' : '5px',
                        height: '5px',
                        background: idx === activePosIndex ? accentColor : 'rgba(255,255,255,0.18)',
                        boxShadow: idx === activePosIndex ? `0 0 8px ${accentColor}` : 'none',
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferTargetsRenderer;
