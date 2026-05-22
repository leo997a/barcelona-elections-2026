/**
 * Drag handle that resizes the bottom dock vertically.
 *
 * Consumer passes current height + setter; this component handles the mouse
 * drag math (clamped to min/max) and renders a visible grip with
 * shrink/expand/reset buttons.
 */
import React, { useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Minimize2 } from 'lucide-react';

interface Props {
  height: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  defaultHeight?: number;
  onShrink?: () => void;
  onExpand?: () => void;
}

const PlayerIntelV2DockResizer: React.FC<Props> = ({
  height,
  onChange,
  min = 220,
  max = 700,
  defaultHeight = 320,
  onShrink,
  onExpand,
}) => {
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      // Drag UP increases dock height (dock grows upward)
      const dy = startYRef.current - e.clientY;
      const next = Math.max(min, Math.min(max, startHeightRef.current + dy));
      onChange(next);
    };
    const handleUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [min, max, onChange]);

  const handleDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="relative h-2 bg-[#0a0c14] border-y border-white/[0.06] group flex-shrink-0">
      {/* Drag area (full width, easy hit target) */}
      <div
        onMouseDown={handleDown}
        className="absolute inset-0 cursor-ns-resize hover:bg-cyan-500/5 transition-colors"
        title="اسحب لتغيير ارتفاع لوحة التحكم"
        role="slider"
        aria-valuenow={height}
        aria-valuemin={min}
        aria-valuemax={max}
      />

      {/* Grip indicator */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="flex items-center gap-1">
          <span className="w-6 h-0.5 rounded-full bg-white/20 group-hover:bg-cyan-400/60 transition-colors" />
          <span className="w-3 h-0.5 rounded-full bg-white/20 group-hover:bg-cyan-400/60 transition-colors" />
        </div>
      </div>

      {/* Quick buttons — right side */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-auto">
        {onShrink && (
          <button
            type="button"
            onClick={onShrink}
            className="text-[10px] text-slate-500 hover:text-cyan-300 p-0.5 rounded transition-colors"
            title="تصغير"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="text-[10px] text-slate-500 hover:text-cyan-300 p-0.5 rounded transition-colors"
            title="توسيع"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange(defaultHeight)}
          className="text-[10px] text-slate-500 hover:text-cyan-300 p-0.5 rounded transition-colors"
          title="إعادة ضبط"
        >
          <Minimize2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default PlayerIntelV2DockResizer;
