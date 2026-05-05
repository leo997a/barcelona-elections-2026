import React, { useEffect, useRef, useState } from 'react';
import { OverlayType } from '../types';
import { playShow, playHide } from '../services/soundService';

// ─── Animation definitions per template type ──────────────────────────────────

const ENTER_ANIM: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]:      'tv-drop-in',
  [OverlayType.LOWER_THIRD]:     'tv-slide-left',
  [OverlayType.TICKER]:          'tv-slide-right',
  [OverlayType.ALERT]:           'tv-zoom-flash',
  [OverlayType.EXCLUSIVE_ALERT]: 'tv-zoom-flash',
  [OverlayType.SMART_NEWS]:      'tv-slide-up',
  [OverlayType.LEADERBOARD]:     'tv-slide-right',
  [OverlayType.GUESTS]:          'tv-slide-left',
  [OverlayType.UCL_DRAW]:        'tv-zoom-flash',
  [OverlayType.ELECTION]:        'tv-slide-up',
  [OverlayType.SOCIAL_MEDIA]:    'tv-slide-right',
  [OverlayType.TODAYS_EPISODE]:  'tv-zoom-flash',
  [OverlayType.PLAYER_PROFILE]:  'tv-slide-left',
  [OverlayType.TOP_VIEWERS]:     'tv-slide-left',
};

const EXIT_ANIM: Partial<Record<OverlayType, string>> = {
  [OverlayType.SCOREBOARD]:      'tv-drop-out',
  [OverlayType.LOWER_THIRD]:     'tv-slide-left-out',
  [OverlayType.TICKER]:          'tv-slide-right-out',
  [OverlayType.ALERT]:           'tv-zoom-out',
  [OverlayType.EXCLUSIVE_ALERT]: 'tv-zoom-out',
  [OverlayType.SMART_NEWS]:      'tv-slide-down-out',
  [OverlayType.LEADERBOARD]:     'tv-slide-right-out',
  [OverlayType.GUESTS]:          'tv-slide-left-out',
  [OverlayType.UCL_DRAW]:        'tv-zoom-out',
  [OverlayType.ELECTION]:        'tv-slide-down-out',
  [OverlayType.SOCIAL_MEDIA]:    'tv-slide-right-out',
  [OverlayType.TODAYS_EPISODE]:  'tv-zoom-out',
  [OverlayType.PLAYER_PROFILE]:  'tv-slide-left-out',
  [OverlayType.TOP_VIEWERS]:     'tv-slide-left-out',
};

const EXIT_DURATION = 650; // ms — must match CSS animation duration

const CSS = `
  /* ── ENTER animations ─────────────────────────────────────────── */
  @keyframes tvDropIn {
    from { transform: translateY(-80px) scaleY(0.6); opacity: 0; filter: blur(6px); }
    60%  { transform: translateY(8px) scaleY(1.02); opacity: 1; filter: blur(0); }
    to   { transform: translateY(0) scaleY(1); opacity: 1; }
  }
  @keyframes tvSlideLeft {
    from { transform: translateX(-120px) scale(0.95); opacity: 0; filter: blur(4px); }
    70%  { transform: translateX(6px) scale(1.01); opacity: 1; filter: blur(0); }
    to   { transform: translateX(0) scale(1); opacity: 1; }
  }
  @keyframes tvSlideRight {
    from { transform: translateX(120px) scale(0.95); opacity: 0; filter: blur(4px); }
    70%  { transform: translateX(-6px) scale(1.01); opacity: 1; filter: blur(0); }
    to   { transform: translateX(0) scale(1); opacity: 1; }
  }
  @keyframes tvSlideUp {
    from { transform: translateY(80px) scale(0.96); opacity: 0; filter: blur(4px); }
    70%  { transform: translateY(-4px) scale(1.01); opacity: 1; filter: blur(0); }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes tvZoomFlash {
    0%   { transform: scale(0.7); opacity: 0; filter: brightness(3) blur(8px); }
    50%  { transform: scale(1.04); opacity: 1; filter: brightness(1.3) blur(0); }
    to   { transform: scale(1); opacity: 1; filter: brightness(1); }
  }

  /* ── EXIT animations ──────────────────────────────────────────── */
  @keyframes tvDropOut {
    from { transform: translateY(0); opacity: 1; }
    to   { transform: translateY(-100px) scaleY(0.5); opacity: 0; filter: blur(6px); }
  }
  @keyframes tvSlideLeftOut {
    from { transform: translateX(0); opacity: 1; }
    to   { transform: translateX(-140px) scale(0.92); opacity: 0; filter: blur(4px); }
  }
  @keyframes tvSlideRightOut {
    from { transform: translateX(0); opacity: 1; }
    to   { transform: translateX(140px) scale(0.92); opacity: 0; filter: blur(4px); }
  }
  @keyframes tvSlideDownOut {
    from { transform: translateY(0); opacity: 1; }
    to   { transform: translateY(100px) scale(0.94); opacity: 0; filter: blur(4px); }
  }
  @keyframes tvZoomOut {
    from { transform: scale(1); opacity: 1; filter: brightness(1); }
    40%  { transform: scale(1.06); filter: brightness(1.5); }
    to   { transform: scale(0.5); opacity: 0; filter: brightness(3) blur(8px); }
  }

  /* ── Applied classes ─────────────────────────────────────────── */
  .tv-drop-in        { animation: tvDropIn    0.65s cubic-bezier(.22,1,.36,1) both; }
  .tv-slide-left     { animation: tvSlideLeft 0.65s cubic-bezier(.22,1,.36,1) both; }
  .tv-slide-right    { animation: tvSlideRight 0.65s cubic-bezier(.22,1,.36,1) both; }
  .tv-slide-up       { animation: tvSlideUp   0.65s cubic-bezier(.22,1,.36,1) both; }
  .tv-zoom-flash     { animation: tvZoomFlash 0.65s cubic-bezier(.22,1,.36,1) both; }

  .tv-drop-out       { animation: tvDropOut      0.55s ease-in both; }
  .tv-slide-left-out { animation: tvSlideLeftOut 0.55s ease-in both; }
  .tv-slide-right-out{ animation: tvSlideRightOut 0.55s ease-in both; }
  .tv-slide-down-out { animation: tvSlideDownOut 0.55s ease-in both; }
  .tv-zoom-out       { animation: tvZoomOut      0.55s ease-in both; }
`;

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  isVisible: boolean;
  overlayType: OverlayType;
  soundEnabled?: boolean;
  children: React.ReactNode;
}

export const AnimatedOverlay: React.FC<Props> = ({
  isVisible, overlayType, soundEnabled = true, children,
}) => {
  const [mounted, setMounted]   = useState(false);
  const [leaving, setLeaving]   = useState(false);
  const [animCls, setAnimCls]   = useState('');
  const prevVisible              = useRef<boolean>(false);
  const leaveTimer               = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // ── SHOW ──────────────────────────────────────────────────────
    if (isVisible && !prevVisible.current) {
      clearTimeout(leaveTimer.current);
      setLeaving(false);
      setMounted(true);
      setAnimCls(ENTER_ANIM[overlayType] || 'tv-slide-up');
      if (soundEnabled) playShow();
    }
    // ── HIDE ──────────────────────────────────────────────────────
    else if (!isVisible && prevVisible.current) {
      setAnimCls(EXIT_ANIM[overlayType] || 'tv-slide-down-out');
      setLeaving(true);
      if (soundEnabled) playHide();
      leaveTimer.current = setTimeout(() => {
        setMounted(false);
        setLeaving(false);
        setAnimCls('');
      }, EXIT_DURATION);
    }

    prevVisible.current = isVisible;
    return () => clearTimeout(leaveTimer.current);
  }, [isVisible, overlayType, soundEnabled]);

  if (!mounted && !leaving) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className={animCls} style={{ willChange: 'transform, opacity' }}>
        {children}
      </div>
    </>
  );
};
