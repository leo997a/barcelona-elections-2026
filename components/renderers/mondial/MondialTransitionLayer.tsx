import React from 'react';
import {
  getBroadcastCssVars,
  getBroadcastPalette,
  MondialBroadcastProps,
} from './MondialBroadcastShared';

type MondialTransitionEffect =
  | 'stinger'
  | 'stadium'
  | 'scorebug'
  | 'data'
  | 'spotlight'
  | 'side'
  | 'glass'
  | 'fade';

type MondialTransitionPhase = 'in' | 'hold' | 'out';

const PRESET_EFFECTS: Record<string, { in: MondialTransitionEffect; out: MondialTransitionEffect }> = {
  reference_stinger: { in: 'stinger', out: 'stinger' },
  scorebug_snap: { in: 'scorebug', out: 'scorebug' },
  group_wall_rush: { in: 'data', out: 'data' },
  stadium_sweep: { in: 'stadium', out: 'stadium' },
  glass_sweep: { in: 'glass', out: 'glass' },
  spotlight_pop: { in: 'spotlight', out: 'spotlight' },
  side_wipe: { in: 'side', out: 'side' },
  story_glitch: { in: 'glass', out: 'glass' },
};

const EFFECT_BY_KEY: Record<string, MondialTransitionEffect> = {
  MONDIAL_STINGER: 'stinger',
  MONDIAL_STINGER_OUT: 'stinger',
  STADIUM_SWEEP: 'stadium',
  STADIUM_SWEEP_OUT: 'stadium',
  SCOREBUG_SNAP: 'scorebug',
  SCOREBUG_SNAP_OUT: 'scorebug',
  DATA_RUSH: 'data',
  DATA_RUSH_OUT: 'data',
  SPOTLIGHT_POP: 'spotlight',
  SPOTLIGHT_POP_OUT: 'spotlight',
  LOWER_THIRD_WIPE: 'side',
  LOWER_THIRD_WIPE_OUT: 'side',
  GLASS_SWEEP: 'glass',
  GLASS_SWEEP_OUT: 'glass',
  BROADCAST_FADE: 'fade',
  BROADCAST_FADE_OUT: 'fade',
  DEFAULT: 'stinger',
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const fieldBoolean = (getField: MondialBroadcastProps['getField'], id: string, fallback: boolean): boolean => {
  const value = getField(id);
  return typeof value === 'boolean' ? value : fallback;
};

const normalizeEffect = (
  getField: MondialBroadcastProps['getField'],
  phase: 'in' | 'out'
): MondialTransitionEffect => {
  const preset = String(getField('mondialMotionPreset') || 'reference_stinger');
  if (preset !== 'custom' && PRESET_EFFECTS[preset]) return PRESET_EFFECTS[preset][phase];
  const fieldId = phase === 'out' ? 'transitionOut' : 'transitionIn';
  const key = String(getField(fieldId) || 'MONDIAL_STINGER').toUpperCase();
  return EFFECT_BY_KEY[key] || 'stinger';
};

export const MONDIAL_TRANSITION_CSS = `
@keyframes mondialTransitionContentIn {
  0% { opacity: 0; transform: translate3d(calc(var(--mondial-transition-intensity) * -34px), 0, 0) skewX(-4deg) scale(1.035); filter: blur(12px) brightness(1.5) saturate(1.35); clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
  44% { opacity: 1; filter: blur(3px) brightness(1.3) saturate(1.2); clip-path: polygon(0 0, 78% 0, 100% 100%, 0 100%); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) skewX(0) scale(1); filter: none; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
}
@keyframes mondialTransitionContentOut {
  0% { opacity: 1; transform: translate3d(0, 0, 0) skewX(0) scale(1); filter: none; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
  100% { opacity: 0; transform: translate3d(calc(var(--mondial-transition-intensity) * 46px), 0, 0) skewX(5deg) scale(1.035); filter: blur(12px) brightness(1.45) saturate(1.35); clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%); }
}
@keyframes mondialTransitionStackIn {
  0% { opacity: 0; transform: translateX(-135%) skewX(-18deg); }
  16% { opacity: .95; }
  72% { opacity: .78; }
  100% { opacity: 0; transform: translateX(135%) skewX(-18deg); }
}
@keyframes mondialTransitionStackOut {
  0% { opacity: 0; transform: translateX(135%) skewX(18deg); }
  16% { opacity: .92; }
  100% { opacity: 0; transform: translateX(-135%) skewX(18deg); }
}
@keyframes mondialTransitionScan {
  0% { opacity: 0; transform: translateY(100%); }
  18% { opacity: .85; }
  100% { opacity: 0; transform: translateY(-100%); }
}
@keyframes mondialTransitionFlash {
  0%, 100% { opacity: 0; transform: scale(.92); }
  36% { opacity: .78; transform: scale(1.06); }
}
@keyframes mondialTransitionScoreBars {
  0% { opacity: 0; transform: scaleX(.2); }
  38% { opacity: .92; transform: scaleX(1.04); }
  100% { opacity: 0; transform: scaleX(1.25); }
}
@keyframes mondialLiveUpdateSweep {
  0% { opacity: 0; transform: translateX(-118%) skewX(-16deg); }
  18% { opacity: .96; }
  72% { opacity: .72; }
  100% { opacity: 0; transform: translateX(118%) skewX(-16deg); }
}
@keyframes mondialLiveUpdateScan {
  0% { opacity: 0; transform: translateY(52px) scaleX(.78); }
  30% { opacity: .9; }
  100% { opacity: 0; transform: translateY(-52px) scaleX(1.08); }
}
.mondial-transition-frame {
  --mondial-transition-speed: 860ms;
  --mondial-transition-intensity: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  color: var(--mondial-ink);
}
.mondial-transition-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  transform-origin: center;
  will-change: transform, opacity, clip-path, filter;
}
.mondial-transition-frame[data-phase='in'][data-motion='on'] .mondial-transition-content {
  animation: mondialTransitionContentIn var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-phase='out'][data-motion='on'] .mondial-transition-content {
  animation: mondialTransitionContentOut calc(var(--mondial-transition-speed) * .72) cubic-bezier(.7,0,.84,0) both;
}
.mondial-transition-overlay,
.mondial-transition-flash,
.mondial-transition-scan {
  position: absolute;
  inset: -12%;
  z-index: 20;
  pointer-events: none;
}
.mondial-transition-overlay {
  display: grid;
  grid-template-columns: 18% 10% 14% 8% 22% 12% 16%;
  gap: 12px;
  mix-blend-mode: screen;
  opacity: 0;
}
.mondial-transition-overlay span {
  min-width: 0;
  border-radius: 2px;
  background: var(--stripe);
  box-shadow: 0 0 26px color-mix(in srgb, var(--stripe) 52%, transparent);
}
.mondial-transition-frame[data-phase='in'][data-motion='on'] .mondial-transition-overlay {
  animation: mondialTransitionStackIn var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-phase='out'][data-motion='on'] .mondial-transition-overlay {
  animation: mondialTransitionStackOut calc(var(--mondial-transition-speed) * .72) cubic-bezier(.7,0,.84,0) both;
}
.mondial-transition-flash {
  opacity: 0;
  background:
    radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--mondial-a3) 76%, transparent), transparent 22%),
    radial-gradient(circle at 18% 82%, color-mix(in srgb, var(--mondial-a2) 58%, transparent), transparent 28%),
    radial-gradient(circle at 84% 16%, color-mix(in srgb, var(--mondial-a4) 58%, transparent), transparent 30%);
  mix-blend-mode: screen;
}
.mondial-transition-frame[data-phase='in'][data-motion='on'] .mondial-transition-flash,
.mondial-transition-frame[data-phase='out'][data-motion='on'] .mondial-transition-flash {
  animation: mondialTransitionFlash calc(var(--mondial-transition-speed) * .78) ease-out both;
}
.mondial-transition-scan {
  opacity: 0;
  background:
    repeating-linear-gradient(0deg, transparent 0 20px, color-mix(in srgb, var(--mondial-paper) 20%, transparent) 20px 22px),
    linear-gradient(90deg, transparent 0 10%, color-mix(in srgb, var(--mondial-a2) 45%, transparent) 42%, color-mix(in srgb, var(--mondial-a4) 42%, transparent) 60%, transparent 92%);
  mix-blend-mode: screen;
}
.mondial-transition-frame[data-phase='in'][data-motion='on'] .mondial-transition-scan,
.mondial-transition-frame[data-phase='out'][data-motion='on'] .mondial-transition-scan {
  animation: mondialTransitionScan var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='scorebug'] .mondial-transition-overlay {
  grid-template-columns: repeat(5, 1fr);
  inset: 8% -10%;
  transform-origin: center;
}
.mondial-transition-frame[data-effect='scorebug'][data-phase='in'][data-motion='on'] .mondial-transition-overlay,
.mondial-transition-frame[data-effect='scorebug'][data-phase='out'][data-motion='on'] .mondial-transition-overlay {
  animation-name: mondialTransitionScoreBars;
}
.mondial-transition-frame[data-effect='data'] .mondial-transition-overlay span,
.mondial-transition-frame[data-effect='data'] .mondial-transition-scan {
  border-radius: 0;
}
.mondial-transition-frame[data-effect='stadium'] .mondial-transition-flash {
  background:
    radial-gradient(ellipse at 50% 5%, color-mix(in srgb, var(--mondial-paper) 62%, transparent), transparent 30%),
    radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--mondial-a3) 58%, transparent), transparent 32%),
    radial-gradient(ellipse at 100% 100%, color-mix(in srgb, var(--mondial-a2) 58%, transparent), transparent 32%);
}
.mondial-transition-frame[data-effect='side'] .mondial-transition-overlay {
  inset: 58% -12% 10%;
  grid-template-columns: 16% 26% 18% 34%;
}
.mondial-transition-frame[data-effect='glass'] .mondial-transition-overlay span {
  background: color-mix(in srgb, var(--stripe) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--mondial-paper) 28%, transparent);
  backdrop-filter: blur(7px);
}
.mondial-transition-frame[data-effect='spotlight'] .mondial-transition-overlay {
  display: none;
}
.mondial-transition-frame[data-effect='fade'] .mondial-transition-overlay,
.mondial-transition-frame[data-effect='fade'] .mondial-transition-scan {
  display: none;
}
.mondial-transition-live-update {
  position: absolute;
  inset: 0;
  z-index: 24;
  overflow: hidden;
  pointer-events: none;
  mix-blend-mode: screen;
}
.mondial-transition-live-update::before {
  content: '';
  position: absolute;
  inset: -18% -28%;
  background:
    linear-gradient(90deg,
      transparent 0 18%,
      color-mix(in srgb, var(--mondial-a2) 84%, transparent) 18% 26%,
      transparent 26% 34%,
      color-mix(in srgb, var(--mondial-a3) 88%, transparent) 34% 43%,
      transparent 43% 53%,
      color-mix(in srgb, var(--mondial-a4) 82%, transparent) 53% 61%,
      transparent 61% 100%);
  filter: blur(2px) saturate(1.25);
  animation: mondialLiveUpdateSweep calc(var(--mondial-transition-speed) * .82) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-live-update::after {
  content: '';
  position: absolute;
  inset: 38% 8%;
  border-top: 3px solid color-mix(in srgb, var(--mondial-paper) 72%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--mondial-a2) 62%, transparent);
  box-shadow: 0 0 28px color-mix(in srgb, var(--mondial-a3) 58%, transparent);
  animation: mondialLiveUpdateScan calc(var(--mondial-transition-speed) * .7) ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .mondial-transition-frame[data-motion='on'] .mondial-transition-content,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-overlay,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-flash,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-scan {
    animation-duration: 1ms !important;
  }
}
`;

type MondialTransitionFrameProps = {
  getField: MondialBroadcastProps['getField'];
  isVisible: boolean;
  wasVisible?: boolean;
  isEditor?: boolean;
  updateKey?: number;
  dataVersion?: string;
  children: React.ReactNode;
};

export const MondialTransitionFrame: React.FC<MondialTransitionFrameProps> = ({
  getField,
  isVisible,
  wasVisible,
  isEditor,
  updateKey = 0,
  dataVersion = '',
  children,
}) => {
  const motionEnabled = fieldBoolean(getField, 'broadcastMotion', true);
  const phase: MondialTransitionPhase = isEditor
    ? 'in'
    : isVisible
      ? 'in'
      : wasVisible
        ? 'out'
        : 'hold';
  const effect = normalizeEffect(getField, phase === 'out' ? 'out' : 'in');
  const speed = clampNumber(getField('transitionSpeedMs'), 860, 360, 1500);
  const intensity = clampNumber(getField('transitionIntensity'), 1, 0.2, 1.8);
  const paletteId = getBroadcastPalette(getField);
  const cssVars = {
    ...getBroadcastCssVars(paletteId),
    '--mondial-transition-speed': `${speed}ms`,
    '--mondial-transition-intensity': intensity,
  } as React.CSSProperties;
  const stripes = ['var(--mondial-a1)', 'var(--mondial-a3)', 'var(--mondial-a2)', 'var(--mondial-a4)', 'var(--mondial-paper)', 'var(--mondial-a1)', 'var(--mondial-a2)'];

  return (
    <div
      className="mondial-transition-frame"
      style={cssVars}
      data-phase={phase}
      data-effect={effect}
      data-motion={motionEnabled ? 'on' : 'off'}
      data-transition-speed={speed}
      data-version={dataVersion}
    >
      <style>{MONDIAL_TRANSITION_CSS}</style>
      <div className="mondial-transition-content">{children}</div>
      <div className="mondial-transition-overlay" aria-hidden="true">
        {stripes.map((color, index) => (
          <span key={`${color}-${index}`} style={{ '--stripe': color } as React.CSSProperties} />
        ))}
      </div>
      <div className="mondial-transition-flash" aria-hidden="true" />
      <div className="mondial-transition-scan" aria-hidden="true" />
      {motionEnabled && updateKey > 0 && (
        <div
          key={`live-update-${updateKey}`}
          className="mondial-transition-live-update"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default MondialTransitionFrame;
