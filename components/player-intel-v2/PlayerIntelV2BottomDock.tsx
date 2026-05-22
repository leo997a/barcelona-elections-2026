/**
 * Player Intel V2 — Bottom Control Dock content.
 *
 * Container chrome (height, resizer) is owned by Editor.tsx. This component
 * renders only the dock's header strip + scrollable inner panel.
 */
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import type { OverlayField } from '../../types';
import PlayerIntelV2EditorPanel from './PlayerIntelV2EditorPanel';

interface Props {
  fields: OverlayField[];
  getDraftValue: (id: string) => unknown;
  applyChanges: (updates: Record<string, unknown>) => void;
  /** Controlled collapsed state from parent (Editor.tsx). */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

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

const PlayerIntelV2BottomDock: React.FC<Props> = ({
  fields,
  getDraftValue,
  applyChanges,
  collapsed: controlledCollapsed,
  onToggleCollapsed,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const toggleCollapsed = onToggleCollapsed ?? (() => setInternalCollapsed((p) => !p));

  const [lastToast, setLastToast] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col h-full" dir="rtl">
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

      {/* Expanded content fills remaining height; inner scrolls */}
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#0d1019] [scrollbar-width:thin]">
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
