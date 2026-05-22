/**
 * Player Intel V2 — Editor preview frame.
 *
 * Wraps the OverlayRenderer in a 1920x1080 logical canvas and CSS-scales it
 * to fit the available editor area. The renderer itself is unchanged — only
 * the editor sees this scaling, the live broadcast output stays at full
 * resolution.
 */
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  fitMode: 'contain' | 'width' | 'actual';
  children: React.ReactNode;
}

const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;

const PlayerIntelV2EditorFrame: React.FC<Props> = ({ fitMode, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const computeScale = () => {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;

      let next = 1;
      if (fitMode === 'actual') {
        next = 1;
      } else if (fitMode === 'width') {
        next = w / LOGICAL_WIDTH;
      } else {
        // contain — fit both width & height with 4% margin
        const safeW = w * 0.96;
        const safeH = h * 0.96;
        next = Math.min(safeW / LOGICAL_WIDTH, safeH / LOGICAL_HEIGHT);
      }
      // Clamp to sane bounds
      next = Math.max(0.1, Math.min(next, 1));
      setScale(next);
    };

    computeScale();
    const ro = new ResizeObserver(computeScale);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', computeScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computeScale);
    };
  }, [fitMode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative"
    >
      {/* Logical canvas — children render at 1920x1080, then we CSS-scale down */}
      <div
        className="rounded-xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] bg-black/40 relative"
        style={{
          width: `${LOGICAL_WIDTH}px`,
          height: `${LOGICAL_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        {children}
        <div className="absolute inset-[5%] border border-white/5 border-dashed pointer-events-none rounded" />
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-white/40 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export default PlayerIntelV2EditorFrame;
