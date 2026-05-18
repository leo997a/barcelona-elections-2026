import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Sparkles, Target, ShieldCheck, Activity, Star } from 'lucide-react';
import { RendererProps } from './SharedComponents';
import { playCue } from '../../services/audioEngine';

/**
 * TransferTargetsRenderer — قالب أهداف النادي في سوق الانتقالات
 *
 *  Display modes:
 *   - SEQUENCE: Each target name appears one after another with a sound cue between.
 *               Configurable interval per target (default 4s).
 *   - SLIDE:    A single position is shown with a horizontal slide of all of its targets.
 *   - CYCLE:    Auto-rotates between positions every N seconds (default 30s).
 *               Within each position, each target is shown briefly.
 *
 *  Sidebar layout: ~30% wide vertical strip on the left.
 *  Configurable per position: 1 to 7 player names, each with image and club logo.
 *  Up to 6 positions: GK, CB, FB, MID, WING, ST.
 */

const POSITION_CONFIG: Array<{ id: string; key: string; arabic: string; english: string; color: string }> = [
  { id: 'pos1', key: 'striker',  arabic: 'رأس الحربة',     english: 'STRIKER',    color: '#ef4444' },
  { id: 'pos2', key: 'winger',   arabic: 'الجناح',         english: 'WINGER',     color: '#f97316' },
  { id: 'pos3', key: 'midfield', arabic: 'الوسط',          english: 'MIDFIELD',   color: '#22d3ee' },
  { id: 'pos4', key: 'defender', arabic: 'قلب الدفاع',     english: 'CENTRE-BACK', color: '#3b82f6' },
  { id: 'pos5', key: 'fullback', arabic: 'الظهير',         english: 'FULL-BACK',  color: '#8b5cf6' },
  { id: 'pos6', key: 'keeper',   arabic: 'حارس المرمى',    english: 'GOALKEEPER', color: '#22c55e' },
];

type TargetItem = {
  name: string;
  image: string;
  clubName: string;
  clubLogo: string;
  age?: string;
  value?: string;
};

const parseTargets = (raw: unknown): TargetItem[] => {
  const text = String(raw || '').trim();
  if (!text) return [];
  // Try JSON
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
          };
        })
        .filter((item): item is TargetItem => Boolean(item))
        .slice(0, 7);
    }
  } catch { /* fallthrough */ }
  // Pipe-separated lines: name|image|club|clubLogo|age|value
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
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

export const TransferTargetsRenderer: React.FC<RendererProps> = ({
  config,
  getField,
  containerStyle,
  contentWrapperStyle,
  isEditor,
}) => {
  // Mode: SEQUENCE | SLIDE | CYCLE
  const displayMode = String(getField('displayMode') || 'SEQUENCE');
  const headline = String(getField('headline') || 'أهداف برشلونة في سوق الانتقالات');
  const subheadline = String(getField('subheadline') || 'Mercato Targets — Reo Show');
  const clubName = String(getField('clubName') || 'FC Barcelona');
  const clubLogo = String(getField('clubLogo') || 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png');
  const accentColor = String(getField('accentColor') || '#edb111');
  const sidePanelWidth = Number(getField('sidePanelWidth') || 30);
  const sequenceInterval = Number(getField('sequenceInterval') || 4); // seconds between targets in sequence mode
  const cycleInterval = Number(getField('cycleInterval') || 30); // seconds per position in cycle mode
  const enabledPositions = String(getField('enabledPositions') || 'pos1,pos2,pos3,pos4').split(',').map(s => s.trim()).filter(Boolean);
  const activePositionKey = String(getField('activePosition') || 'pos1');
  const soundEnabled = getField('soundEnabled') !== false;
  const soundVolume = Number(getField('soundVolume') ?? 0.7);
  const soundPerTarget = String(getField('soundPerTarget') || 'TARGET_REVEAL');

  // Build position groups
  const positions = useMemo(() => {
    return POSITION_CONFIG.map(pos => {
      const positionLabel = String(getField(`${pos.id}Label`) || pos.arabic);
      const positionEnglish = String(getField(`${pos.id}LabelEn`) || pos.english);
      const targets = parseTargets(getField(`${pos.id}Targets`));
      return { ...pos, label: positionLabel, english: positionEnglish, targets };
    }).filter(p => enabledPositions.includes(p.id) && p.targets.length > 0);
  }, [getField, enabledPositions.join(',')]);

  // Active position index for SLIDE / CYCLE modes
  const [activePosIndex, setActivePosIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const targetSoundDebounce = useRef<number>(0);

  // Determine which position to render
  const currentPos = useMemo(() => {
    if (positions.length === 0) return null;
    if (displayMode === 'SLIDE') {
      const found = positions.find(p => p.id === activePositionKey);
      return found || positions[0];
    }
    return positions[activePosIndex % positions.length];
  }, [displayMode, positions, activePosIndex, activePositionKey]);

  // CYCLE mode: rotate positions every cycleInterval seconds
  useEffect(() => {
    if (displayMode !== 'CYCLE' || positions.length <= 1 || isEditor) return;
    const ms = Math.max(5, cycleInterval) * 1000;
    const timer = window.setInterval(() => {
      setActivePosIndex(idx => (idx + 1) % positions.length);
      setRevealedCount(0);
      // Play a position-switch sound on rotation
      if (soundEnabled) {
        playCue('POSITION_SWITCH', { volume: soundVolume * 0.85 }).catch(() => undefined);
      }
    }, ms);
    return () => window.clearInterval(timer);
  }, [displayMode, positions.length, cycleInterval, soundEnabled, soundVolume, isEditor]);

  // SEQUENCE mode (and CYCLE inner sequence): reveal targets one by one
  useEffect(() => {
    if (!currentPos || isEditor) return;
    setRevealedCount(0);
    if (displayMode === 'SLIDE') {
      // SLIDE shows them all already
      setRevealedCount(currentPos.targets.length);
      return;
    }
    let cancelled = false;
    const interval = Math.max(1, sequenceInterval);
    const reveal = (index: number) => {
      if (cancelled) return;
      if (index > currentPos.targets.length) return;
      setRevealedCount(index);
      // Sound cue per target appearing (skip first reveal of first target, played by entrance)
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
    // Initial reveal: target 1 appears immediately, then next ones at intervals
    window.setTimeout(() => reveal(1), 200);
    return () => { cancelled = true; };
  }, [currentPos?.id, displayMode, sequenceInterval, soundEnabled, soundVolume, soundPerTarget, isEditor]);

  // Editor: show all targets revealed
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

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes ttScan { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
        @keyframes ttPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.95; } }
        @keyframes ttRevealCard {
          0% { opacity: 0; transform: translateX(-40px) scale(0.92); filter: blur(6px); }
          60% { opacity: 1; transform: translateX(2px) scale(1.01); filter: blur(0); }
          100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
        }
        @keyframes ttSlideIn {
          0% { opacity: 0; transform: translateX(60px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes ttHeaderGlow {
          0%, 100% { box-shadow: 0 0 22px rgba(237,177,17,0.18); }
          50% { box-shadow: 0 0 38px rgba(237,177,17,0.35); }
        }
      `}</style>
      <div style={contentWrapperStyle} className="overflow-hidden font-['Tajawal']">
        {/* SIDEBAR — left strip */}
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${sidebarWidthPercent}%`,
            background: 'linear-gradient(180deg, rgba(5,7,11,0.98) 0%, rgba(8,10,16,0.96) 60%, rgba(5,7,11,0.98) 100%)',
            borderRight: `2px solid ${accentColor}55`,
            boxShadow: '8px 0 60px rgba(0,0,0,0.7)',
            color: '#fff',
            direction: 'rtl',
          }}
        >
          {/* Background grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* Position color accent strip */}
          <div className="absolute top-0 right-0 h-full w-1.5" style={{ background: currentPos.color }} />
          {/* Top scanline */}
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/5">
            <div
              className="h-full w-1/3"
              style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, animation: 'ttScan 3.6s linear infinite' }}
            />
          </div>

          {/* Header — Club identity */}
          <div className="relative z-10 px-5 pt-5 pb-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              {clubLogo ? (
                <img
                  src={clubLogo}
                  alt=""
                  className="w-12 h-12 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : null}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.32em] text-white/45">MERCATO TARGETS</div>
                <div className="font-['Barlow_Condensed'] text-2xl font-black leading-tight truncate">{clubName}</div>
              </div>
              <Sparkles className="w-4 h-4 text-white/35" strokeWidth={2.4} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: '#ef4444', animation: 'ttPulse 1.4s ease-in-out infinite' }}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-red-400">LIVE TARGET BOARD</span>
            </div>
          </div>

          {/* Position banner */}
          <div
            className="relative z-10 mx-4 my-4 px-4 py-3 border border-white/10 bg-black/40 overflow-hidden"
            style={{ animation: 'ttHeaderGlow 3.4s ease-in-out infinite' }}
          >
            <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: currentPos.color }} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/40">{currentPos.english}</div>
                <div
                  className="font-['Barlow_Condensed'] text-3xl font-black leading-none mt-1"
                  style={{ color: currentPos.color }}
                >
                  {currentPos.label}
                </div>
              </div>
              <div className="text-right">
                <div className="font-['Barlow_Condensed'] text-4xl font-black leading-none" style={{ color: accentColor }}>
                  {currentPos.targets.length}
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">TARGETS</div>
              </div>
            </div>
          </div>

          {/* Targets list */}
          <div className="relative z-10 px-3 pb-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 240px)' }}>
            {currentPos.targets.map((t, idx) => {
              const isRevealed = idx < revealedCount;
              if (!isRevealed) {
                // Render placeholder slot to keep layout stable
                return (
                  <div
                    key={`placeholder-${idx}`}
                    className="h-[72px] border border-white/5 bg-white/[0.02]"
                  />
                );
              }
              const animation = displayMode === 'SLIDE'
                ? `ttSlideIn 0.55s cubic-bezier(.22,1,.36,1) ${idx * 90}ms both`
                : 'ttRevealCard 0.6s cubic-bezier(.22,1,.36,1) both';
              return (
                <div
                  key={`${currentPos.id}-${idx}-${t.name}`}
                  className="relative grid grid-cols-[56px_1fr_28px] gap-3 border border-white/10 bg-black/45 hover:bg-black/55 transition-colors"
                  style={{ animation }}
                >
                  {/* Player image */}
                  <div className="relative w-14 h-[72px] overflow-hidden bg-gradient-to-b from-white/5 to-black/30 border-r border-white/8">
                    {t.image ? (
                      <img
                        src={t.image}
                        alt={t.name}
                        className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-['Barlow_Condensed'] text-base font-black text-white/40">
                        {initials(t.name)}
                      </div>
                    )}
                    {/* Rank badge */}
                    <div
                      className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-[10px] font-black"
                      style={{ background: idx === 0 ? accentColor : 'rgba(0,0,0,0.7)', color: idx === 0 ? '#000' : '#fff' }}
                    >
                      {idx + 1}
                    </div>
                  </div>

                  {/* Player info */}
                  <div className="flex flex-col justify-center min-w-0 py-2">
                    <div className="font-['Barlow_Condensed'] text-xl font-black leading-tight text-white truncate" dir="ltr">{t.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {t.clubLogo ? (
                        <img
                          src={t.clubLogo}
                          alt=""
                          className="w-3.5 h-3.5 object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : null}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/55 truncate">
                        {t.clubName || '—'}
                      </span>
                    </div>
                    {(t.age || t.value) ? (
                      <div className="mt-1 flex items-center gap-2 text-[9px] font-black uppercase tracking-wide">
                        {t.age && <span className="text-white/45">العمر: {t.age}</span>}
                        {t.value && <span style={{ color: accentColor }}>{t.value}</span>}
                      </div>
                    ) : null}
                  </div>

                  {/* Target indicator */}
                  <div className="flex items-center justify-center pr-1">
                    <Crosshair
                      className="w-4 h-4"
                      style={{ color: idx === 0 ? accentColor : currentPos.color }}
                      strokeWidth={2.4}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 inset-x-0 px-5 py-3 border-t border-white/8 bg-black/55">
            <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.22em]">
              <div className="flex items-center gap-2 text-white/45">
                <Activity className="w-3 h-3" strokeWidth={2.4} />
                <span>{subheadline}</span>
              </div>
              {displayMode === 'CYCLE' && positions.length > 1 ? (
                <div className="flex items-center gap-1">
                  {positions.map((p, idx) => (
                    <div
                      key={p.id}
                      className="w-2 h-2 rounded-full"
                      style={{ background: idx === activePosIndex ? accentColor : 'rgba(255,255,255,0.18)' }}
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
