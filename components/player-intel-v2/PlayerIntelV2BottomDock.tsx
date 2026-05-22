/**
 * Player Intel V2 — Bottom Control Dock wrapper.
 *
 * Wraps the existing PlayerIntelV2EditorPanel with a collapsible bottom-dock
 * UX (preview-first). The internal panel keeps its tabs and logic untouched —
 * we just present it inside a fixed bottom dock with collapse/expand.
 *
 * NO new endpoints, NO logic changes. Pure presentation layer.
 */
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Sparkles, Settings } from 'lucide-react';
import type { OverlayField } from '../../types';
import PlayerIntelV2EditorPanel from './PlayerIntelV2EditorPanel';

interface Props {
  fields: OverlayField[];
  getDraftValue: (id: string) => unknown;
  applyChanges: (updates: Record<string, unknown>) => void;
}

const STORAGE_KEY = 'reo:player-intel-v2:dock-collapsed:v1';

const PlayerIntelV2BottomDock: React.FC<Props> = ({ fields, getDraftValue, applyChanges }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [lastToast, setLastToast] = useState<string | null>(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  // Read summary state for the collapsed strip
  const playerName = String(getDraftValue('samplePlayer') || '');
  const cardType = String(getDraftValue('cardType') || 'attacker_card');
  const variant = String(getDraftValue('visualVariant') || 'premium_broadcast');
  const mode = String(getDraftValue('mode') || 'single');

  const cardTypeAr: Record<string, string> = {
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

  return (
    <div
      className="border-t border-cyan-900/40 bg-gradient-to-b from-slate-950 to-slate-950/90 transition-all duration-200"
      dir="rtl"
    >
      {/* Collapsed strip */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 cursor-pointer hover:bg-slate-900/40"
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-sm font-bold text-cyan-100 flex-shrink-0">استخبارات اللاعب V2</span>
          <span className="text-slate-700 flex-shrink-0">·</span>
          <span className="text-xs text-slate-400 truncate">
            {playerName ? `${playerName}` : 'لم يُختر لاعب'}
            <span className="text-slate-600 mx-1.5">·</span>
            {cardTypeAr[cardType] || cardType}
            <span className="text-slate-600 mx-1.5">·</span>
            {mode === 'compare' ? 'مقارنة' : 'لاعب واحد'}
          </span>
          {lastToast && !collapsed && (
            <span className="text-[10px] bg-green-900/30 border border-green-700/40 text-green-300 rounded-md px-1.5 py-0.5 mr-2 truncate">
              ✓ {lastToast}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            {collapsed ? 'انقر للفتح' : 'انقر للإخفاء'}
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-cyan-300 p-1 rounded"
            aria-label={collapsed ? 'فتح لوحة التحكم' : 'إخفاء لوحة التحكم'}
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {!collapsed && (
        <div className="border-t border-slate-800 bg-slate-950/60">
          <PlayerIntelV2EditorPanel
            fields={fields}
            getDraftValue={getDraftValue}
            applyChanges={applyChanges}
            onRefresh={(msg) => setLastToast(msg)}
          />
        </div>
      )}
    </div>
  );
};

export default PlayerIntelV2BottomDock;
