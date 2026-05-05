
import React, { useState, useEffect, useMemo } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import { Plus, Edit3, Trash2, Play, Key, Settings2, X, MonitorPlay, BarChart, FileText, Layers, Tv2, Heart, Search, SlidersHorizontal, Star, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { encodeBase64UrlUtf8 } from '../utils/base64';
import { getTemplateMeta, getVisibleTemplates } from '../utils/templateRegistry';

interface LibraryProps {
  overlays: OverlayConfig[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (templateId: string) => void;
  onNavigateOperator: () => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type SortOption = 'recent' | 'name' | 'live';
type ActiveView = 'all' | 'live' | 'favorites';

// ─── Category Config ──────────────────────────────────────────────────────────

const TYPE_FILTERS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'ALL',                      label: 'الكل',          icon: <Layers  className="w-3.5 h-3.5" /> },
  { id: OverlayType.SCOREBOARD,     label: 'سكور بورد',     icon: <MonitorPlay className="w-3.5 h-3.5" /> },
  { id: OverlayType.LOWER_THIRD,    label: 'أسماء',         icon: <FileText    className="w-3.5 h-3.5" /> },
  { id: OverlayType.TICKER,         label: 'شريط أخبار',    icon: <Tv2         className="w-3.5 h-3.5" /> },
  { id: OverlayType.GUESTS,         label: 'ضيوف',          icon: <Layers      className="w-3.5 h-3.5" /> },
  { id: OverlayType.PLAYER_PROFILE, label: 'لاعبون',        icon: <Star        className="w-3.5 h-3.5" /> },
  { id: OverlayType.ELECTION,       label: 'انتخابات',      icon: <BarChart    className="w-3.5 h-3.5" /> },
  { id: OverlayType.SOCIAL_MEDIA,   label: 'سوشيال',        icon: <Heart       className="w-3.5 h-3.5" /> },
  { id: OverlayType.TODAYS_EPISODE, label: 'حلقة اليوم',   icon: <MonitorPlay className="w-3.5 h-3.5" /> },
];

const ACCENT: Record<string, string> = {
  [OverlayType.SCOREBOARD]:     '#3b82f6',
  [OverlayType.LOWER_THIRD]:    '#10b981',
  [OverlayType.TICKER]:         '#ef4444',
  [OverlayType.GUESTS]:         '#60a5fa',
  [OverlayType.PLAYER_PROFILE]: '#8b5cf6',
  [OverlayType.ELECTION]:       '#a50044',
  [OverlayType.SOCIAL_MEDIA]:   '#1da1f2',
  [OverlayType.TODAYS_EPISODE]: '#f59e0b',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const OverlayCard: React.FC<{
  overlay: OverlayConfig;
  isFavorite: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onCopyToken: (e: React.MouseEvent) => void;
}> = ({ overlay, isFavorite, onSelect, onDelete, onToggleFavorite, onCopyToken }) => {
  const accent = ACCENT[overlay.type] || '#888';
  const typeMeta = TYPE_FILTERS.find(t => t.id === overlay.type);

  return (
    <div
      onClick={onSelect}
      className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800/80 hover:border-gray-600 transition-all duration-300 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] cursor-pointer flex flex-col"
    >
      {/* Thumbnail */}
      <div className="h-40 relative overflow-hidden bg-gray-950 flex items-center justify-center flex-shrink-0">
        {/* Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700"
             style={{ background: `radial-gradient(ellipse at center, ${accent} 0%, transparent 70%)` }} />
        {/* Label */}
        <span className="text-[80px] font-black opacity-10 select-none pointer-events-none leading-none" style={{ color: accent }}>
          {String(overlay.type).slice(0, 3)}
        </span>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

        {/* LIVE badge */}
        <div className="absolute top-3 left-3 z-20">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            overlay.isVisible
              ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/40'
              : 'bg-black/60 text-gray-500 border border-gray-700'
          }`}>
            {overlay.isVisible && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
            {overlay.isVisible ? 'LIVE' : 'OFF'}
          </span>
        </div>

        {/* Favorite btn */}
        <button
          onClick={onToggleFavorite}
          className={`absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isFavorite
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
              : 'bg-black/50 text-gray-600 border border-gray-700 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Type pill */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold text-gray-300">
          {typeMeta?.icon}
          <span>{typeMeta?.label || overlay.type}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors" title={overlay.name}>
          {overlay.name}
        </h3>

        {/* Actions — visible on hover */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
          <button
            onClick={onCopyToken}
            className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20 border border-yellow-600/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            <Key className="w-3 h-3" /> Token
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-600/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            <Edit3 className="w-3 h-3" /> تعديل
          </button>
          <button
            onClick={onDelete}
            className="w-8 flex items-center justify-center bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-600/20 rounded-lg text-xs transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-0.5 w-full" style={{ backgroundColor: accent, opacity: 0.4 }} />
    </div>
  );
};

// ─── Main Library ─────────────────────────────────────────────────────────────

const Library: React.FC<LibraryProps> = ({
  overlays,
  onSelect,
  onDelete,
  onCreate,
  onNavigateOperator,
  favoriteIds,
  onToggleFavorite,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('all');
  const [activeType, setActiveType] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQ, setSearchQ] = useState('');

  const availableTemplates = useMemo(() => getVisibleTemplates(), []);

  // Copy token helper
  const handleCopyToken = (overlay: OverlayConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    const ctx = syncManager.getSmartTokenContext();
    const payload = { s: syncManager.getStudioId(), id: overlay.id, tp: overlay.type, nm: overlay.name, sv: ctx?.provider || 'local' };
    try {
      navigator.clipboard.writeText('rge_' + encodeBase64UrlUtf8(JSON.stringify(payload)));
      const btn = e.currentTarget as HTMLButtonElement;
      const orig = btn.textContent;
      btn.textContent = '✓ تم';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    } catch { alert('خطأ في نسخ التوكن'); }
  };

  // Filtering + sorting
  const displayed = useMemo(() => {
    let list = [...overlays];
    if (activeView === 'live') list = list.filter(o => o.isVisible);
    if (activeView === 'favorites') list = list.filter(o => favoriteIds.includes(o.id));
    if (activeType !== 'ALL') list = list.filter(o => o.type === activeType);
    if (searchQ.trim()) list = list.filter(o => o.name.toLowerCase().includes(searchQ.toLowerCase()) || o.type.toLowerCase().includes(searchQ.toLowerCase()));
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (sortBy === 'live') list.sort((a, b) => (b.isVisible ? 1 : 0) - (a.isVisible ? 1 : 0));
    else list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  }, [overlays, activeView, activeType, sortBy, searchQ, favoriteIds]);

  return (
    <div className="flex h-full bg-gray-950">

      {/* ── LEFT FILTER SIDEBAR ─────────────────────── */}
      <div className="w-56 flex-shrink-0 bg-gray-900/60 border-l border-gray-800 flex flex-col h-full overflow-y-auto">

        {/* Views */}
        <div className="p-4 border-b border-gray-800">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">العرض</p>
          {[
            { id: 'all',       label: 'جميع القوالب',   icon: <Layers className="w-4 h-4" />,   count: overlays.length },
            { id: 'live',      label: 'على الهواء',      icon: <MonitorPlay className="w-4 h-4" />, count: overlays.filter(o => o.isVisible).length },
            { id: 'favorites', label: 'المفضلة',          icon: <Star className="w-4 h-4" />,    count: favoriteIds.length },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id as ActiveView)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1 text-sm font-medium transition-all ${
                activeView === v.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {v.icon}
              <span className="flex-1 text-right">{v.label}</span>
              {v.count > 0 && <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded-full text-gray-500">{v.count}</span>}
            </button>
          ))}
        </div>

        {/* Type Filters */}
        <div className="p-4">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">النوع</p>
          <div className="space-y-1">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveType(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeType === f.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {f.icon}
                <span className="flex-1 text-right">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="h-16 bg-gray-900/80 border-b border-gray-800 flex items-center gap-4 px-6 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="بحث في القوالب..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-gray-800 border border-gray-700 rounded-xl pr-4 pl-8 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="recent">الأحدث</option>
              <option value="name">الاسم</option>
              <option value="live">على الهواء أولاً</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Result count */}
          <span className="text-xs text-gray-500 whitespace-nowrap">{displayed.length} قالب</span>

          {/* Operator */}
          <button onClick={onNavigateOperator} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            <Play className="w-4 h-4 text-green-500" /> الأوبريتور
          </button>

          {/* Create */}
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-900/30">
            <Plus className="w-4 h-4" /> قالب جديد
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {overlays.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-20 gap-6">
              <div className="w-24 h-24 bg-gray-800 rounded-3xl flex items-center justify-center border border-gray-700">
                <Settings2 className="w-12 h-12 text-gray-600" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white mb-2">الاستوديو فارغ</h3>
                <p className="text-gray-500">أنشئ قالبك الأول للبدء</p>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors">
                استعرض القوالب
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
              <Search className="w-10 h-10 opacity-40" />
              <p>لا توجد نتائج مطابقة</p>
              <button onClick={() => { setSearchQ(''); setActiveType('ALL'); setActiveView('all'); }} className="text-blue-400 text-sm hover:underline">إعادة ضبط الفلاتر</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

      {/* ── CREATE MODAL ───────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl h-[82vh] flex flex-col overflow-hidden shadow-2xl">

            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">مكتبة القوالب</h3>
                <p className="text-gray-400 text-sm mt-0.5">اختر قالباً لإضافته إلى مشروعك</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableTemplates.map(template => {
                  const meta = getTemplateMeta(template);
                  const accent = ACCENT[template.type] || '#888';
                  return (
                    <button
                      key={template.id}
                      onClick={() => { onCreate(meta.id); setShowCreateModal(false); }}
                      className="group text-right bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-900/20 flex flex-col"
                    >
                      {/* Mini thumbnail */}
                      <div className="h-24 relative flex items-center justify-center bg-gray-950 overflow-hidden">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                             style={{ background: `radial-gradient(ellipse, ${accent}, transparent 70%)` }} />
                        <span className="text-[60px] font-black opacity-10 select-none" style={{ color: accent }}>
                          {String(template.type).slice(0, 3)}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />
                      </div>
                      <div className="p-4 flex-1">
                        <p className="text-white font-bold text-sm mb-1 truncate">{template.name}</p>
                        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{meta.description}</p>
                        <div className="mt-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: accent + '22', color: accent }}>
                            {template.type}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
