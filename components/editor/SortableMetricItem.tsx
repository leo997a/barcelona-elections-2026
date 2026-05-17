/**
 * SortableMetricItem — Draggable metric pill for Player Stats Lab
 */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown, Star, ArrowRight, EyeOff, Eye, Trash2 } from 'lucide-react';
import { getMetricLabel } from '../../utils/playerStatsLabels';

interface SortableMetricItemProps {
  id: string;
  section: 'hero' | 'secondary' | 'hidden';
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveTo?: (target: 'hero' | 'secondary' | 'hidden') => void;
  onRemove?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  accent?: string;
}

export const SortableMetricItem: React.FC<SortableMetricItemProps> = ({
  id,
  section,
  onMoveUp,
  onMoveDown,
  onMoveTo,
  onRemove,
  isFirst,
  isLast,
  accent = '#22d3ee',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const arLabel = getMetricLabel(id, 'ar');
  const enLabel = getMetricLabel(id, 'en');

  const sectionColors = {
    hero: 'border-amber-500/30 bg-amber-500/5',
    secondary: 'border-cyan-500/20 bg-cyan-500/5',
    hidden: 'border-slate-600/30 bg-slate-800/30 opacity-60',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${sectionColors[section]} ${isDragging ? 'shadow-lg shadow-black/40' : ''}`}
      dir="rtl"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-white/30 hover:text-white/60 active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical size={14} />
      </button>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="font-black text-white/90 truncate">{arLabel}</div>
        <div className="text-[9px] text-white/35 font-bold truncate" dir="ltr">{enLabel}</div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!isFirst && onMoveUp && (
          <button onClick={onMoveUp} className="p-0.5 text-white/30 hover:text-white/70" title="Move up">
            <ArrowUp size={12} />
          </button>
        )}
        {!isLast && onMoveDown && (
          <button onClick={onMoveDown} className="p-0.5 text-white/30 hover:text-white/70" title="Move down">
            <ArrowDown size={12} />
          </button>
        )}
        {section !== 'hero' && onMoveTo && (
          <button onClick={() => onMoveTo('hero')} className="p-0.5 text-amber-400/50 hover:text-amber-400" title="To Hero">
            <Star size={12} />
          </button>
        )}
        {section !== 'secondary' && onMoveTo && (
          <button onClick={() => onMoveTo('secondary')} className="p-0.5 text-cyan-400/50 hover:text-cyan-400" title="To Secondary">
            <ArrowRight size={12} />
          </button>
        )}
        {section !== 'hidden' && onMoveTo && (
          <button onClick={() => onMoveTo('hidden')} className="p-0.5 text-white/20 hover:text-white/50" title="Hide">
            <EyeOff size={11} />
          </button>
        )}
        {section === 'hidden' && onMoveTo && (
          <button onClick={() => onMoveTo('secondary')} className="p-0.5 text-emerald-400/50 hover:text-emerald-400" title="Unhide">
            <Eye size={11} />
          </button>
        )}
        {onRemove && (
          <button onClick={onRemove} className="p-0.5 text-rose-400/30 hover:text-rose-400" title="Remove">
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
};
