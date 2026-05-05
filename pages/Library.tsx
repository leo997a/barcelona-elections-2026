
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import {
  Plus, Edit3, Trash2, Play, Key, Settings2, X,
  MonitorPlay, BarChart, FileText, Layers, Tv2, Star,
  Search, ChevronDown, Heart, Zap
} from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { encodeBase64UrlUtf8 } from '../utils/base64';
import { getTemplateMeta, getVisibleTemplates } from '../utils/templateRegistry';
import OverlayRenderer from '../components/OverlayRenderer';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LibraryProps {
  overlays: OverlayConfig[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (templateId: string) => void;
  onNavigateOperator: () => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type SortOption = 'recent' | 'name' | 'live';
type ActiveView = 'all' | 'live' | 'favorites';

const ACCENT: Record<string, string> = {
  [OverlayType.LEADERBOARD]:    '#f59e0b',
  [OverlayType.SMART_NEWS]:     '#8b5cf6',
  [OverlayType.SCOREBOARD]:     '#3b82f6',
  [OverlayType.LOWER_THIRD]:    '#10b981',
  [OverlayType.TICKER]:         '#ef4444',
  [OverlayType.ALERT]:          '#f97316',
  [OverlayType.EXCLUSIVE_ALERT]:'#dc2626',
  [OverlayType.GUESTS]:         '#60a5fa',
  [OverlayType.UCL_DRAW]:       '#38bdf8',
  [OverlayType.PLAYER_PROFILE]: '#8b5cf6',
  [OverlayType.ELECTION]:       '#a50044',
  [OverlayType.SOCIAL_MEDIA]:   '#1da1f2',
  [OverlayType.TODAYS_EPISODE]: '#f59e0b',
};

const TYPE_FILTERS = [
  { id: 'ALL',                       label: 'الكل' },
  { id: OverlayType.SCOREBOARD,      label: 'سكور بورد' },
  { id: OverlayType.LOWER_THIRD,     label: 'أسماء (Lower Third)' },
  { id: OverlayType.TICKER,          label: 'شريط أخبار' },
  { id: OverlayType.GUESTS,          label: 'ضيوف' },
  { id: OverlayType.PLAYER_PROFILE,  label: 'لاعبون' },
  { id: OverlayType.LEADERBOARD,     label: 'Leaderboard' },
  { id: OverlayType.SMART_NEWS,      label: 'أخبار ذكية' },
  { id: OverlayType.EXCLUSIVE_ALERT, label: 'خبر حصري' },
  { id: OverlayType.UCL_DRAW,        label: 'قرعة UCL' },
  { id: OverlayType.ELECTION,        label: 'انتخابات' },
  { id: OverlayType.SOCIAL_MEDIA,    label: 'سوشيال' },
  { id: OverlayType.TODAYS_EPISODE,  label: 'حلقة اليوم' },
];

// ─── Mini Preview (live scaled render) ───────────────────────────────────────

const MiniPreview: React.FC<{ overlay: OverlayConfig }> = ({ overlay }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Render at 1920×1080 logically, scale to fit container (~280px wide → 140px high)
  const RENDER_W = 1920;
  const RENDER_H = 1080;
  const DISPLAY_W = 280;
  const scale = DISPLAY_W / RENDER_W;

  // Force isVisible true for preview
  const previewConfig = useMemo(() => ({ ...overlay, isVisible: true }), [overlay]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-black"
      style={{ width: DISPLAY_W, height: RENDER_H * scale }}
    >
      {/* Transparency checkerboard */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(45deg,#1a1a1a 25%,transparent 25%),' +
            'linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),' +
            'linear-gradient(45deg,transparent 75%,#1a1a1a 75%),' +
            'linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)',
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0,0 5px,5px -5px,-5px 0px',
        }}
      />
      {/* Scaled renderer */}
      <div
        style={{
          width: RENDER_W,
          height: RENDER_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        <OverlayRenderer config={previewConfig} isEditor />
      </div>
    </div>
  );
};

// ─── OverlayCard ─────────────────────────────────────────────────────────────

const OverlayCard: React.FC<{
  overlay: OverlayConfig;
  isFavorite: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onCopyToken: (e: React.MouseEvent) => void;
}> = ({ overlay, isFavorite, onSelect, onDelete, onToggleFavorite, onCopyToken }) => {
  const accent = ACCENT[overlay.type] || '#888';
  const typeLabel = TYPE_FILTERS.find(t => t.id === overlay.type)?.label || overlay.type;
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800/80 hover:border-blue-500/40 transition-all duration-300 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] cursor-pointer flex flex-col"
    >
      {/* ── Thumbnail / Preview area ── */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: 157 }}>

        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-20 transition-opacity duration-700 group-hover:opacity-40"
          style={{ background: `radial-gradient(ellipse at center, ${accent} 0%, transparent 70%)` }}
        />

        {/* Checkerboard background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#111 25%,transparent 25%),' +
              'linear-gradient(-45deg,#111 25%,transparent 25%),' +
              'linear-gradient(45deg,transparent 75%,#111 75%),' +
              'linear-gradient(-45deg,transparent 75%,#111 75%)',
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0,0 6px,6px -6px,-6px 0px',
          }}
        />

        {/* Real preview — lazy loaded on hover for performance */}
        {showPreview ? (
          <MiniPreview overlay={overlay} />
        ) : (
          /* Placeholder when not hovered */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30">
            <span className="text-[64px] font-black leading-none select-none" style={{ color: accent }}>
              {String(overlay.type).slice(0, 3)}
            </span>
          </div>
        )}

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent pointer-events-none z-10" />

        {/* LIVE badge */}
        <div className="absolute top-2.5 left-2.5 z-20">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
            overlay.isVisible
              ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/40'
              : 'bg-black/60 text-gray-500 border border-gray-700'
          }`}>
            {overlay.isVisible && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
            {overlay.isVisible ? 'LIVE' : 'OFF'}
          </span>
        </div>

        {/* Preview badge */}
        <div className="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600/80 text-white backdrop-blur-sm">
            Preview
          </span>
        </div>

        {/* Favorite button */}
        <button
          onClick={onToggleFavorite}
          className={`absolute bottom-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all border ${
            isFavorite
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 opacity-100'
              : 'bg-black/50 text-gray-600 border-gray-700 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Type pill */}
        <div className="absolute bottom-2.5 left-2.5 z-20">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{ backgroundColor: accent + '22', color: accent, borderColor: accent + '44' }}>
            {typeLabel}
          </span>
        </div>
      </div>

      {/* ── Info area ── */}
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors leading-snug" title={overlay.name}>
          {overlay.name}
        </h3>

        {/* Actions */}
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
          <button
            onClick={onCopyToken}
            className="flex-1 flex items-center justify-center gap-1 bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20 border border-yellow-600/20 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
          >
            <Key className="w-3 h-3" /> Token
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-600/20 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
          >
            <Edit3 className="w-3 h-3" /> تعديل
          </button>
          <button
            onClick={onDelete}
            className="w-8 flex items-center justify-center bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-600/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-0.5 w-full" style={{ backgroundColor: accent, opacity: 0.35 }} />
    </div>
  );
};

// ─── Template Card (for Create Modal) ────────────────────────────────────────

const TemplateCard: React.FC<{
  template: OverlayConfig;
  onCreate: () => void;
}> = ({ template, onCreate }) => {
  const accent = ACCENT[template.type] || '#888';
  const meta = getTemplateMeta(template);
  const [showPreview, setShowPreview] = useState(false);
  const previewConfig = useMemo(() => ({ ...template, isVisible: true }), [template]);

  return (
    <button
      onClick={onCreate}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      className="group text-right bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all hover:shadow-xl hover:shadow-blue-900/20 flex flex-col w-full"
    >
      {/* Mini thumbnail */}
      <div className="relative overflow-hidden" style={{ height: 120 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#111 25%,transparent 25%),' +
              'linear-gradient(-45deg,#111 25%,transparent 25%),' +
              'linear-gradient(45deg,transparent 75%,#111 75%),' +
              'linear-gradient(-45deg,transparent 75%,#111 75%)',
            backgroundSize: '10px 10px',
            backgroundPosition: '0 0,0 5px,5px -5px,-5px 0px',
          }}
        />
        <div
          className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
          style={{ background: `radial-gradient(ellipse, ${accent}, transparent 70%)` }}
        />
        {showPreview ? (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{ width: 1920, height: 1080, transform: `scale(${240 / 1920})`, transformOrigin: 'top left' }}>
              <OverlayRenderer config={previewConfig} isEditor />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <span className="text-[56px] font-black leading-none" style={{ color: accent }}>
              {String(template.type).slice(0, 3)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-800/90 to-transparent pointer-events-none" />
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: accent + '33', color: accent }}>
            {template.type}
          </span>
        </div>
      </div>

      <div className="p-4 text-right">
        <p className="text-white font-bold text-sm mb-1 truncate">{template.name}</p>
        <p className="text-gray-500 text-[11px] line-clamp-2 leading-relaxed">{meta.description}</p>
      </div>
    </button>
  );
};

// ─── Main Library ─────────────────────────────────────────────────────────────

const Library: React.FC<LibraryProps> = ({
  overlays, onSelect, onDelete, onCreate, onNavigateOperator, favoriteIds, onToggleFavorite,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('all');
  const [activeType, setActiveType] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQ, setSearchQ] = useState('');

  const availableTemplates = useMemo(() => getVisibleTemplates(), []);

  // Copy token
  const handleCopyToken = (overlay: OverlayConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    const ctx = syncManager.getSmartTokenContext();
    const payload = { s: syncManager.getStudioId(), id: overlay.id, tp: overlay.type, nm: overlay.name, sv: ctx?.provider || 'local' };
    try {
      navigator.clipboard.writeText('rge_' + encodeBase64UrlUtf8(JSON.stringify(payload)));
      const btn = e.currentTarget as HTMLElement;
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ تم';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    } catch { alert('خطأ في نسخ التوكن'); }
  };

  // Filtered list
  const displayed = useMemo(() => {
    let list = [...overlays];
    if (activeView === 'live') list = list.filter(o => o.isVisible);
    if (activeView === 'favorites') list = list.filter(o => favoriteIds.includes(o.id));
    if (activeType !== 'ALL') list = list.filter(o => o.type === activeType);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(q) || o.type.toLowerCase().includes(q));
    }
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (sortBy === 'live') list.sort((a, b) => (b.isVisible ? 1 : 0) - (a.isVisible ? 1 : 0));
    else list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  }, [overlays, activeView, activeType, sortBy, searchQ, favoriteIds]);

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden">

      {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 bg-[#0d1117] border-l border-gray-800/80 flex flex-col overflow-y-auto">

        {/* Views */}
        <div className="p-3 border-b border-gray-800/60">
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-2 px-1">العرض</p>
          {([
            { id: 'all',       label: 'جميع القوالب',  count: overlays.length },
            { id: 'live',      label: 'على الهواء',    count: overlays.filter(o => o.isVisible).length },
            { id: 'favorites', label: 'المفضلة ★',     count: favoriteIds.length },
          ] as { id: ActiveView; label: string; count: number }[]).map(v => (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-0.5 text-xs font-medium transition-all ${
                activeView === v.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
              }`}
            >
              <span>{v.label}</span>
              {v.count > 0 && <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded-full text-gray-500">{v.count}</span>}
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div className="p-3">
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-2 px-1">النوع</p>
          {TYPE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setActiveType(f.id)}
              className={`w-full text-right px-3 py-2 rounded-lg mb-0.5 text-[11px] font-medium transition-all block ${
                activeType === f.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-500 hover:bg-gray-800/60 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="h-14 bg-[#0d1117]/90 border-b border-gray-800/80 flex items-center gap-3 px-5 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="بحث..." className="w-full bg-gray-800 border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-gray-800 border border-gray-700 rounded-lg pr-3 pl-7 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer">
              <option value="recent">الأحدث</option>
              <option value="name">الاسم</option>
              <option value="live">الهواء أولاً</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>

          <span className="text-[11px] text-gray-600">{displayed.length} قالب</span>

          <button onClick={onNavigateOperator}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
            <Play className="w-3.5 h-3.5 text-green-500" /> الأوبريتور
          </button>

          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-900/30">
            <Plus className="w-3.5 h-3.5" /> قالب جديد
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {overlays.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-20 gap-5">
              <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700">
                <Settings2 className="w-10 h-10 text-gray-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white mb-1">الاستوديو فارغ</h3>
                <p className="text-gray-500 text-sm">أنشئ قالبك الأول للبدء</p>
              </div>
              <button onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors text-sm">
                استعرض القوالب ({availableTemplates.length})
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
              <Search className="w-8 h-8 opacity-40" />
              <p className="text-sm">لا توجد نتائج</p>
              <button onClick={() => { setSearchQ(''); setActiveType('ALL'); setActiveView('all'); }}
                className="text-blue-400 text-xs hover:underline">إعادة ضبط الفلاتر</button>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {displayed.map(overlay => (
                <OverlayCard
                  key={overlay.id}
                  overlay={overlay}
                  isFavorite={favoriteIds.includes(overlay.id)}
                  onSelect={() => onSelect(overlay.id)}
                  onDelete={(e) => { e.stopPropagation(); onDelete(overlay.id); }}
                  onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(overlay.id); }}
                  onCopyToken={(e) => handleCopyToken(overlay, e)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE MODAL ──────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-[#0d1117] border border-gray-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">

            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-white">مكتبة القوالب</h3>
                <p className="text-gray-500 text-xs mt-0.5">{availableTemplates.length} قالب جاهز — مرر فوق القالب لمعاينته</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}
                className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Templates grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onCreate={() => { onCreate(getTemplateMeta(template).id); setShowCreateModal(false); }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
