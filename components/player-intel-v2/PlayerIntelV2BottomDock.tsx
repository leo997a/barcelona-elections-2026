/**
 * Player Intel V2 — True Bottom Control Dock.
 *
 * Sits below the preview area (NOT in the right sidebar). Tabs are horizontal,
 * height is collapsible (small strip ↔ expanded panel), state persists in
 * localStorage. Inner content is the existing PlayerIntelV2EditorPanel — its
 * own internal tabs are still used.
 */
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import type { OverlayField } from '../../types';
import PlayerIntelV2EditorPanel from './PlayerIntelV2EditorPanel';

interface Props {
  fields: OverlayField[];
  getDraftValue: (id: string) => unknown;
  applyChanges: (updates: Record<string, unknown>) => void;
}

const STORAGE_COLLAPSED = 'reo:player-intel-v2:dock-collapsed:v2';
const STORAGE_HEIGHT = 'reo:player-intel-v2:dock-height:v1';

const CARD_TITLES_AR: Record<string, string> = {
  attacker_card: 'بطاقة هجومية',
  playmaker_card: 'صانع لعب',
  winger_card: 'جناح',
  defender_card: 'مدافع',
  form_report: 'تقرير الفورمة',
  market_report: 'تقرير السوق',
  season_report: 'تقرير الموسم',
  complete_report: 'تقرير كامل',
  custom: 'مخصّص',
};

const PlayerIntelV2BottomDock: React.FC<Props> = ({ fields, getDraftValue, applyChanges }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_COLLAPSED) === '1'; }
    catch { return false; }
  });
  const [tall, setTall] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_HEIGHT) === 'tall'; }
    catch { return false; }
  });
  const [lastToast, setLastToast] = useState<string | null>(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_COLLAPSED, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleHeight = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTall((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_HEIGHT, next ? 'tall' : 'normal'); } catch { /* ignore */ }
      return next;
    });
  };

  const playerName = String(getDraftValue('samplePlayer') || '');
  const cardType = String(getDraftValue('cardType') || 'attacker_card');
  const variant = String(getDraftValue('visualVariant') || 'premium_broadcast');
  const mode = String(getDraftValue('mode') || 'single');
  const heroJson = String(getDraftValue('playerIntelHeroMetricsJson') || '[]');
  const secondaryJson = String(getDraftValue('playerIntelSecondaryMetricsJson') || '[]');
  let metricCount = 0;
  try {
    metricCount = (JSON.parse(heroJson) as unknown[]).length + (JSON.parse(secondaryJson) as unknown[]).length;
  } catch { /* ignore */ }

  const cardLabel = CARD_TITLES_AR[cardType] || cardType;
  const variantLabel = variant.replace(/_/g, ' ');

  const dockHeightClass = collapsed ? 'h-[44px]' : (tall ? 'max-h-[45vh]' : 'max-h-[36vh]');

  return (
    <div
      className={`flex flex-col bg-[#0a0c14] border-t border-white/[0.08] transition-[max-height,height] duration-300 overflow-hidden ${dockHeightClass}`}
      dir="rtl"
    >
      {/* Header strip — always visible */}
      <div
        className="h-[44px] flex items-center justify-between gap-3 px-4 cursor-pointer hover:bg-white/[0.02] flex-shrink-0 border-b border-white/[0.04]"
        onClick={toggleCollapsed}
        role="button"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-bold text-white flex-shrink-0">استخبارات اللاعب V2</span>
          <span className="text-slate-700 flex-shrink-0">·</span>
          <span className="text-[11px] text-slate-400 truncate">
            {playerName ? <span className="text-slate-200 font-medium">{playerName}</span> : <span className="text-slate-600">لم يُختر لاعب</span>}
            <span className="text-slate-700 mx-1.5">·</span>
            <span className="text-cyan-400">{cardLabel}</span>
            <span className="text-slate-700 mx-1.5">·</span>
            <span className="text-slate-500">{variantLabel}</span>
            {mode === 'compare' && (
              <>
                <span className="text-slate-700 mx-1.5">·</span>
                <span className="text-amber-400">مقارنة</span>
              </>
            )}
            {metricCount > 0 && (
              <>
                <span className="text-slate-700 mx-1.5">·</span>
                <span className="text-slate-500">{metricCount} إحصائية</span>
              </>
            )}
          </span>
          {lastToast && !collapsed && (
            <span className="text-[10px] bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 rounded-md px-1.5 py-0.5 mr-2 truncate flex-shrink-0">
              ✓ {lastToast}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!collapsed && (
            <button
              type="button"
              onClick={toggleHeight}
              className="text-slate-500 hover:text-cyan-400 p-1 rounded transition-colors"
              aria-label={tall ? 'تصغير الارتفاع' : 'تكبير الارتفاع'}
              title={tall ? 'ارتفاع عادي' : 'ارتفاع موسّع'}
            >
              {tall ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <span className="text-[10px] text-slate-600 hidden md:inline">
            {collapsed ? 'انقر للفتح' : 'انقر للطيّ'}
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-cyan-300 p-1 rounded transition-colors"
            aria-label={collapsed ? 'فتح لوحة التحكم' : 'إخفاء لوحة التحكم'}
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded content — flex-1 + overflow-y-auto so the panel scrolls inside the dock */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto bg-[#0d1019] [scrollbar-width:thin]">
          <PlayerIntelV2EditorPanel
            fields={fields}
            getDraftValue={getDraftValue}
            applyChanges={applyChanges}
            onRefresh={(msg) => {
              setLastToast(msg);
              setTimeout(() => setLastToast(null), 4000);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PlayerIntelV2BottomDock;
