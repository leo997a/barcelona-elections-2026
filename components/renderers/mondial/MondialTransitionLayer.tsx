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
  0%, 28% { opacity: 0; transform: translate3d(calc(var(--mondial-transition-intensity) * -42px), 0, 0) skewX(-5deg) scale(1.045); filter: blur(14px) brightness(1.7) saturate(1.45); clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
  48% { opacity: .35; filter: blur(8px) brightness(1.45) saturate(1.35); clip-path: polygon(0 0, 42% 0, 64% 100%, 0 100%); }
  70% { opacity: 1; transform: translate3d(calc(var(--mondial-transition-intensity) * 8px), 0, 0) skewX(1.6deg) scale(1.012); filter: blur(1px) brightness(1.18) saturate(1.16); clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) skewX(0) scale(1); filter: none; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
}
@keyframes mondialTransitionContentOut {
  0%, 28% { opacity: 1; transform: translate3d(0, 0, 0) skewX(0) scale(1); filter: none; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
  54% { opacity: .72; transform: translate3d(calc(var(--mondial-transition-intensity) * -12px), 0, 0) skewX(-2deg) scale(1.016); filter: blur(2px) brightness(1.28) saturate(1.22); clip-path: polygon(12% 0, 100% 0, 100% 100%, 0 100%); }
  100% { opacity: 0; transform: translate3d(calc(var(--mondial-transition-intensity) * 58px), 0, 0) skewX(7deg) scale(1.045); filter: blur(14px) brightness(1.65) saturate(1.45); clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%); }
}
@keyframes mondialTransitionReferenceCoverIn {
  0% { opacity: 0; transform: translateX(-124%) skewX(-14deg) scaleX(1.08); clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
  12% { opacity: 1; }
  32% { opacity: 1; transform: translateX(-18%) skewX(-10deg) scaleX(1.12); clip-path: polygon(0 0, 100% 0, 90% 100%, 0 100%); }
  52% { opacity: 1; transform: translateX(0) skewX(-2deg) scaleX(1.06); clip-path: polygon(-8% 0, 108% 0, 100% 100%, 0 100%); }
  76% { opacity: 1; transform: translateX(72%) skewX(-10deg) scaleX(1.12); clip-path: polygon(14% 0, 100% 0, 100% 100%, 0 100%); }
  100% { opacity: 0; transform: translateX(124%) skewX(-14deg) scaleX(1.08); clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%); }
}
@keyframes mondialTransitionReferenceCoverOut {
  0% { opacity: 0; transform: translateX(124%) skewX(14deg) scaleX(1.08); clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%); }
  14% { opacity: 1; }
  40% { opacity: 1; transform: translateX(16%) skewX(10deg) scaleX(1.12); clip-path: polygon(0 0, 100% 0, 100% 100%, 10% 100%); }
  62% { opacity: 1; transform: translateX(0) skewX(2deg) scaleX(1.06); clip-path: polygon(-8% 0, 108% 0, 100% 100%, 0 100%); }
  84% { opacity: 1; transform: translateX(-74%) skewX(10deg) scaleX(1.12); clip-path: polygon(0 0, 86% 0, 100% 100%, 0 100%); }
  100% { opacity: 0; transform: translateX(-124%) skewX(14deg) scaleX(1.08); clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
}
@keyframes mondialTransitionReferencePulseIn {
  0%, 18% { opacity: 0; transform: scale(.82) rotate(-4deg); }
  46% { opacity: .88; transform: scale(1.02) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.18) rotate(2deg); }
}
@keyframes mondialTransitionReferencePulseOut {
  0%, 18% { opacity: 0; transform: scale(1.12) rotate(3deg); }
  50% { opacity: .78; transform: scale(.98) rotate(0deg); }
  100% { opacity: 0; transform: scale(.78) rotate(-3deg); }
}
@keyframes mondialTransitionArcStingerIn {
  0% { opacity: 0; transform: scale(.22); filter: blur(10px) brightness(1.4); }
  14% { opacity: 1; transform: scale(.38); filter: blur(2px) brightness(1.25); }
  38% { opacity: 1; transform: scale(.98); filter: blur(0) brightness(1.12); }
  68% { opacity: .98; transform: scale(1.08); filter: blur(0) brightness(1.18); }
  100% { opacity: 0; transform: scale(1.32); filter: blur(8px) brightness(1.35); }
}
@keyframes mondialTransitionArcStingerOut {
  0% { opacity: 0; transform: scale(1.24); filter: blur(8px) brightness(1.32); }
  18% { opacity: .96; transform: scale(1.06); filter: blur(0) brightness(1.2); }
  58% { opacity: 1; transform: scale(.82); filter: blur(0) brightness(1.1); }
  100% { opacity: 0; transform: scale(.24); filter: blur(12px) brightness(1.45); }
}
@keyframes mondialTransitionArcBandTopIn {
  0% { transform: translate3d(-50%, -112%, 0) rotate(var(--rotation)) scale(.72); }
  44% { transform: translate3d(-50%, -54%, 0) rotate(var(--rotation)) scale(1); }
  100% { transform: translate3d(-50%, -118%, 0) rotate(var(--rotation)) scale(1.12); }
}
@keyframes mondialTransitionArcBandBottomIn {
  0% { transform: translate3d(-50%, 12%, 0) rotate(var(--rotation)) scale(.72); }
  44% { transform: translate3d(-50%, -46%, 0) rotate(var(--rotation)) scale(1); }
  100% { transform: translate3d(-50%, 18%, 0) rotate(var(--rotation)) scale(1.12); }
}
@keyframes mondialTransitionArcBugIn {
  0%, 10% { opacity: 0; transform: translate(-50%, -50%) scale(.56); filter: blur(8px); }
  32%, 70% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.22); filter: blur(8px); }
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
  --mondial-transition-speed: 920ms;
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
  animation: mondialTransitionContentOut calc(var(--mondial-transition-speed) * .56) cubic-bezier(.7,0,.84,0) both;
}
.mondial-transition-overlay,
.mondial-transition-mask,
.mondial-transition-rings,
.mondial-transition-flash,
.mondial-transition-scan,
.mondial-transition-arc-stinger,
.mondial-transition-bug {
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
  animation: mondialTransitionStackOut calc(var(--mondial-transition-speed) * .56) cubic-bezier(.7,0,.84,0) both;
}
.mondial-transition-mask {
  inset: -18% -24%;
  z-index: 26;
  opacity: 0;
  overflow: hidden;
  transform-origin: center;
  background:
    linear-gradient(90deg, #03040a 0 18%, color-mix(in srgb, var(--mondial-ink) 92%, #05050b) 18% 100%),
    radial-gradient(circle at 28% 50%, color-mix(in srgb, var(--mondial-a1) 42%, transparent), transparent 38%);
  box-shadow: inset 0 0 92px color-mix(in srgb, var(--mondial-paper) 12%, transparent);
}
.mondial-transition-mask::before,
.mondial-transition-mask::after {
  content: '';
  position: absolute;
  inset: -8%;
  pointer-events: none;
}
.mondial-transition-mask::before {
  background:
    linear-gradient(90deg,
      transparent 0 14%,
      color-mix(in srgb, var(--mondial-a3) 94%, transparent) 14% 24%,
      transparent 24% 32%,
      color-mix(in srgb, var(--mondial-a2) 92%, transparent) 32% 44%,
      transparent 44% 53%,
      color-mix(in srgb, var(--mondial-a4) 92%, transparent) 53% 64%,
      transparent 64% 100%);
  mix-blend-mode: screen;
  filter: saturate(1.25);
}
.mondial-transition-mask::after {
  background:
    radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--mondial-paper) 32%, transparent), transparent 18%),
    repeating-linear-gradient(90deg, transparent 0 32px, color-mix(in srgb, var(--mondial-paper) 14%, transparent) 32px 34px);
  mix-blend-mode: screen;
  opacity: .62;
}
.mondial-transition-mask span {
  position: absolute;
  min-width: 0;
  border-radius: 999px 0 999px 0;
  filter: drop-shadow(0 0 30px color-mix(in srgb, var(--stripe) 42%, transparent));
}
.mondial-transition-mask span:nth-child(1) {
  inset: -4% 62% 55% -10%;
  background: var(--mondial-a3);
}
.mondial-transition-mask span:nth-child(2) {
  inset: 58% -8% -6% 58%;
  background: var(--mondial-a2);
}
.mondial-transition-mask span:nth-child(3) {
  inset: 8% 18% 64% 28%;
  background: var(--mondial-a4);
  border-radius: 0 999px 999px 0;
}
.mondial-transition-mask span:nth-child(4) {
  inset: 58% 24% 8% 18%;
  background: var(--mondial-paper);
  opacity: .94;
}
.mondial-transition-rings {
  z-index: 27;
  opacity: 0;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 0 22%, color-mix(in srgb, var(--mondial-paper) 26%, transparent) 23% 24%, transparent 25%),
    radial-gradient(ellipse at 50% 50%, transparent 0 38%, color-mix(in srgb, var(--mondial-a2) 28%, transparent) 39% 40%, transparent 41%),
    linear-gradient(90deg, transparent 0 45%, color-mix(in srgb, var(--mondial-paper) 44%, transparent) 45% 46%, transparent 46% 100%);
  mix-blend-mode: screen;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='in'][data-motion='on'] .mondial-transition-mask {
  animation: mondialTransitionReferenceCoverIn var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='out'][data-motion='on'] .mondial-transition-mask {
  animation: mondialTransitionReferenceCoverIn calc(var(--mondial-transition-speed) * .62) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='in'][data-motion='on'] .mondial-transition-rings {
  animation: mondialTransitionReferencePulseIn var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='out'][data-motion='on'] .mondial-transition-rings {
  animation: mondialTransitionReferencePulseIn calc(var(--mondial-transition-speed) * .62) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-arc-stinger {
  inset: -18%;
  z-index: 31;
  opacity: 0;
  overflow: hidden;
  background: radial-gradient(circle at 50% 50%, rgba(0,0,0,.95) 0 13%, transparent 14% 100%);
  mix-blend-mode: normal;
  transform-origin: center;
}
.mondial-transition-arc-stinger::before,
.mondial-transition-arc-stinger::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 3px;
  background: color-mix(in srgb, var(--mondial-paper) 76%, transparent);
  box-shadow:
    0 0 22px color-mix(in srgb, var(--mondial-a2) 70%, transparent),
    0 0 42px color-mix(in srgb, var(--mondial-a3) 44%, transparent);
  transform: translateY(-50%);
}
.mondial-transition-arc-stinger::after {
  height: 1px;
  opacity: .6;
  transform: translateY(16px);
}
.mondial-transition-arc-stinger span {
  --size: calc(34vw + (var(--band-index) * 6.2vw));
  --stroke: clamp(18px, 3.8vw, 58px);
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--size);
  height: var(--size);
  border: var(--stroke) solid var(--stripe);
  border-radius: 36% 0 36% 0;
  box-shadow:
    0 0 24px color-mix(in srgb, var(--stripe) 44%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--mondial-paper) 22%, transparent);
  filter: saturate(1.26);
  opacity: .96;
}
.mondial-transition-arc-stinger span[data-arc='top'] {
  clip-path: inset(0 0 50% 0);
  transform: translate3d(-50%, -54%, 0) rotate(var(--rotation)) scale(1);
}
.mondial-transition-arc-stinger span[data-arc='bottom'] {
  clip-path: inset(50% 0 0 0);
  transform: translate3d(-50%, -46%, 0) rotate(var(--rotation)) scale(1);
}
.mondial-transition-bug {
  inset: auto;
  z-index: 33;
  left: 50%;
  top: 50%;
  width: clamp(86px, 14vw, 190px);
  height: clamp(86px, 14vw, 190px);
  border-radius: 30% 30% 42% 42%;
  display: grid;
  place-items: center;
  opacity: 0;
  transform: translate(-50%, -50%) scale(.8);
  background:
    linear-gradient(180deg, #fff 0 58%, color-mix(in srgb, var(--mondial-paper) 82%, #e8eefb) 58% 100%);
  color: #03040a;
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--mondial-ink) 72%, transparent),
    0 18px 80px rgba(0,0,0,.55),
    0 0 42px color-mix(in srgb, var(--mondial-a2) 52%, transparent);
  text-align: center;
  font-family: Impact, Arial Black, sans-serif;
  letter-spacing: .02em;
}
.mondial-transition-bug span {
  display: block;
  font-size: clamp(28px, 4.4vw, 74px);
  line-height: .8;
  font-weight: 950;
}
.mondial-transition-bug b {
  display: block;
  margin-top: -2px;
  font-size: clamp(13px, 1.65vw, 27px);
  line-height: 1;
  font-weight: 950;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='in'][data-motion='on'] .mondial-transition-arc-stinger {
  animation: mondialTransitionArcStingerIn var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='out'][data-motion='on'] .mondial-transition-arc-stinger {
  animation: mondialTransitionArcStingerIn calc(var(--mondial-transition-speed) * .62) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='in'][data-motion='on'] .mondial-transition-arc-stinger span[data-arc='top'] {
  animation: mondialTransitionArcBandTopIn var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='in'][data-motion='on'] .mondial-transition-arc-stinger span[data-arc='bottom'] {
  animation: mondialTransitionArcBandBottomIn var(--mondial-transition-speed) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='out'][data-motion='on'] .mondial-transition-arc-stinger span[data-arc='top'] {
  animation: mondialTransitionArcBandTopIn calc(var(--mondial-transition-speed) * .62) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='out'][data-motion='on'] .mondial-transition-arc-stinger span[data-arc='bottom'] {
  animation: mondialTransitionArcBandBottomIn calc(var(--mondial-transition-speed) * .62) cubic-bezier(.16,1,.3,1) both;
}
.mondial-transition-frame[data-effect='stinger'][data-phase='in'][data-motion='on'] .mondial-transition-bug,
.mondial-transition-frame[data-effect='stinger'][data-phase='out'][data-motion='on'] .mondial-transition-bug {
  animation: mondialTransitionArcBugIn calc(var(--mondial-transition-speed) * .86) cubic-bezier(.16,1,.3,1) both;
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
.mondial-transition-frame[data-effect='stinger'] .mondial-transition-overlay {
  z-index: 28;
  grid-template-columns: 16% 8% 14% 10% 20% 12% 18%;
  gap: 16px;
  mix-blend-mode: screen;
}
.mondial-transition-frame[data-effect='stinger'] .mondial-transition-overlay span {
  border-radius: 0 32px 0 32px;
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
  .mondial-transition-frame[data-motion='on'] .mondial-transition-mask,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-rings,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-flash,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-scan,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-arc-stinger,
  .mondial-transition-frame[data-motion='on'] .mondial-transition-bug {
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
  const speed = clampNumber(getField('transitionSpeedMs'), 920, 420, 1600);
  const intensity = clampNumber(getField('transitionIntensity'), 1.15, 0.2, 1.8);
  const paletteId = getBroadcastPalette(getField);
  const cssVars = {
    ...getBroadcastCssVars(paletteId),
    '--mondial-transition-speed': `${speed}ms`,
    '--mondial-transition-intensity': intensity,
  } as React.CSSProperties;
  const stripes = ['var(--mondial-a1)', 'var(--mondial-a3)', 'var(--mondial-a2)', 'var(--mondial-a4)', 'var(--mondial-paper)', 'var(--mondial-a1)', 'var(--mondial-a2)'];
  const arcStripes = [
    'var(--mondial-a2)',
    'var(--mondial-a3)',
    'var(--mondial-a4)',
    'var(--mondial-a1)',
    'var(--mondial-paper)',
    'var(--mondial-a2)',
    'var(--mondial-a3)',
  ];

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
      <div className="mondial-transition-arc-stinger" aria-hidden="true">
        {[...arcStripes, ...arcStripes].map((color, index) => (
          <span
            key={`arc-${color}-${index}`}
            data-arc={index < arcStripes.length ? 'top' : 'bottom'}
            style={{
              '--stripe': color,
              '--band-index': index % arcStripes.length,
              '--rotation': `${(index % arcStripes.length) % 2 === 0 ? -18 : -12}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="mondial-transition-bug" aria-hidden="true">
        <span>REO</span>
        <b>SHOW</b>
      </div>
      <div className="mondial-transition-mask" aria-hidden="true">
        {stripes.slice(0, 4).map((color, index) => (
          <span key={`mask-${color}-${index}`} style={{ '--stripe': color } as React.CSSProperties} />
        ))}
      </div>
      <div className="mondial-transition-rings" aria-hidden="true" />
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
