
import React, { useState, useMemo } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import { Plus, Edit3, Trash2, Play, Key, Settings2, X, Star, Search, ChevronDown, BookOpen, FolderOpen } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { encodeBase64UrlUtf8 } from '../utils/base64';
import { getTemplateMeta, getVisibleTemplates, createOverlayFromTemplate } from '../utils/templateRegistry';
import OverlayRenderer from '../components/OverlayRenderer';

interface LibraryProps {
  overlays: OverlayConfig[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (templateId: string) => void;
  onNavigateOperator: () => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}

type MainTab = 'catalog' | 'mine';
type SortOption = 'recent' | 'name' | 'live';

const ACCENT: Record<string, string> = {
  [OverlayType.LEADERBOARD]:     '#f59e0b',
  [OverlayType.SMART_NEWS]:      '#8b5cf6',
  [OverlayType.SCOREBOARD]:      '#3b82f6',
  [OverlayType.LOWER_THIRD]:     '#10b981',
  [OverlayType.TICKER]:          '#ef4444',
  [OverlayType.ALERT]:           '#f97316',
  [OverlayType.EXCLUSIVE_ALERT]: '#dc2626',
  [OverlayType.GUESTS]:          '#60a5fa',
  [OverlayType.UCL_DRAW]:        '#38bdf8',
  [OverlayType.PLAYER_PROFILE]:  '#8b5cf6',
  [OverlayType.ELECTION]:        '#a50044',
  [OverlayType.SOCIAL_MEDIA]:    '#1da1f2',
  [OverlayType.TODAYS_EPISODE]:  '#f59e0b',
};

const TYPE_FILTERS = [
  { id: 'ALL', label: 'الكل' },
  { id: OverlayType.SCOREBOARD,      label: 'سكور بورد' },
  { id: OverlayType.LOWER_THIRD,     label: 'أسماء' },
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

// ─── Shared live-preview thumbnail ────────────────────────────────────────────

const PreviewThumb: React.FC<{ overlay: OverlayConfig; height?: number }> = ({ overlay, height = 160 }) => {
  const [hovered, setHovered] = useState(false);
  const previewCfg = useMemo(() => ({ ...overlay, isVisible: true }), [overlay]);
  const accent = ACCENT[overlay.type] || '#888';
  const W = 1920;
  const scale = (height * (16 / 9)) / W; // maintain 16:9

  return (
    <div
      className="relative overflow-hidden w-full"
      style={{ height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkerboard */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(45deg,#111 25%,transparent 25%),linear-gradient(-45deg,#111 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#111 75%),linear-gradient(-45deg,transparent 75%,#111 75%)',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0,0 5px,5px -5px,-5px 0px',
      }} />

      {/* Glow */}
      <div className="absolute inset-0 opacity-15 transition-opacity duration-500 hover:opacity-30"
        style={{ background: `radial-gradient(ellipse, ${accent}, transparent 70%)` }} />

      {/* Placeholder when not hovered */}
      {!hovered && (
        <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none select-none">
          <span className="text-[64px] font-black leading-none" style={{ color: accent }}>
            {String(overlay.type).slice(0, 3)}
          </span>
        </div>
      )}

      {/* Real renderer — only when hovered */}
      {hovered && (
        <div style={{
          width: W, height: W * (9 / 16),
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute', top: 0, left: 0,
          pointerEvents: 'none',
        }}>
          <OverlayRenderer config={previewCfg} isEditor />
        </div>
      )}

      {/* Bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none" />
    </div>
  );
};

// ─── Catalog card (template definition) ──────────────────────────────────────

const CatalogCard: React.FC<{
  template: OverlayConfig;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onAdd: () => void;
}> = ({ template, isFavorite, onToggleFavorite, onAdd }) => {
  const meta = getTemplateMeta(template);
  const accent = ACCENT[template.type] || '#888';

  return (
    <div className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800/80 hover:border-blue-500/40 transition-all duration-300 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col">
      {/* Preview */}
      <PreviewThumb overlay={template} height={155} />

      {/* Badges */}
      <div className="absolute top-2.5 left-2.5 z-20">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{ backgroundColor: accent + '22', color: accent, borderColor: accent + '44' }}>
          {template.type}
        </span>
      </div>
      <button onClick={onToggleFavorite}
        className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${isFavorite ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-black/50 text-gray-600 border-gray-700 opacity-0 group-hover:opacity-100'}`}>
        <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
      </button>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <h3 className="text-sm font-bold text-white leading-snug truncate">{template.name}</h3>
        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed flex-1">{meta.description}</p>
        <button onClick={onAdd}
          className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-xs font-bold transition-colors mt-1 shadow-lg shadow-blue-900/30">
          <Plus className="w-3.5 h-3.5" /> إضافة للاستوديو
        </button>
      </div>
      <div className="h-0.5 w-full" style={{ backgroundColor: accent, opacity: 0.3 }} />
    </div>
  );
};

// ─── My overlay card (user instance) ─────────────────────────────────────────

const MyCard: React.FC<{
  overlay: OverlayConfig;
  isFavorite: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onCopyToken: (e: React.MouseEvent) => void;
}> = ({ overlay, isFavorite, onSelect, onDelete, onToggleFavorite, onCopyToken }) => {
  const accent = ACCENT[overlay.type] || '#888';

  return (
    <div onClick={onSelect}
      className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800/80 hover:border-blue-500/40 transition-all duration-300 shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] cursor-pointer flex flex-col">

      <PreviewThumb overlay={overlay} height={150} />

      {/* LIVE badge */}
      <div className="absolute top-2.5 left-2.5 z-20">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${overlay.isVisible ? 'bg-red-600 text-white animate-pulse' : 'bg-black/60 text-gray-500 border border-gray-700'}`}>
          {overlay.isVisible && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
          {overlay.isVisible ? 'LIVE' : 'OFF'}
        </span>
      </div>

      {/* Favorite */}
      <button onClick={onToggleFavorite}
        className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${isFavorite ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-black/50 text-gray-600 border-gray-700 opacity-0 group-hover:opacity-100'}`}>
        <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
      </button>

      {/* Info */}
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">{overlay.name}</h3>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onCopyToken}
            className="flex-1 flex items-center justify-center gap-1 bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20 border border-yellow-600/20 py-1.5 rounded-lg text-[10px] font-bold transition-colors">
            <Key className="w-3 h-3" /> Token
          </button>
          <button onClick={e => { e.stopPropagation(); onSelect(); }}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-600/20 py-1.5 rounded-lg text-[10px] font-bold transition-colors">
            <Edit3 className="w-3 h-3" /> تعديل
          </button>
          <button onClick={onDelete}
            className="w-8 flex items-center justify-center bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-600/20 rounded-lg transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="h-0.5 w-full" style={{ backgroundColor: accent, opacity: 0.35 }} />
    </div>
  );
};

// ─── Main Library ─────────────────────────────────────────────────────────────

const Library: React.FC<LibraryProps> = ({ overlays, onSelect, onDelete, onCreate, onNavigateOperator, favoriteIds, onToggleFavorite }) => {
  const [mainTab, setMainTab] = useState<MainTab>('catalog');
  const [activeType, setActiveType] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQ, setSearchQ] = useState('');
  const [showFavOnly, setShowFavOnly] = useState(false);

  const allTemplates = useMemo(() => getVisibleTemplates(), []);

  // Catalog filtering
  const catalogList = useMemo(() => {
    let list = [...allTemplates];
    if (activeType !== 'ALL') list = list.filter(t => t.type === activeType);
    if (searchQ.trim()) list = list.filter(t => t.name.toLowerCase().includes(searchQ.toLowerCase()) || t.type.toLowerCase().includes(searchQ.toLowerCase()));
    return list;
  }, [allTemplates, activeType, searchQ]);

  // My overlays filtering
  const myList = useMemo(() => {
    let list = [...overlays];
    if (showFavOnly) list = list.filter(o => favoriteIds.includes(o.id));
    if (activeType !== 'ALL') list = list.filter(o => o.type === activeType);
    if (searchQ.trim()) list = list.filter(o => o.name.toLowerCase().includes(searchQ.toLowerCase()) || o.type.toLowerCase().includes(searchQ.toLowerCase()));
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (sortBy === 'live') list.sort((a, b) => (b.isVisible ? 1 : 0) - (a.isVisible ? 1 : 0));
    else list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  }, [overlays, showFavOnly, activeType, searchQ, sortBy, favoriteIds]);

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
    } catch { alert('خطأ في النسخ'); }
  };

  const activeList = mainTab === 'catalog' ? catalogList : myList;

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-52 flex-shrink-0 bg-[#0d1117] border-l border-gray-800/80 flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-gray-800/60">
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-2 px-1">التصنيف</p>
          {TYPE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setActiveType(f.id)}
              className={`w-full text-right px-3 py-2 rounded-lg mb-0.5 text-[11px] font-medium transition-all block ${activeType === f.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:bg-gray-800/60 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {mainTab === 'mine' && (
          <div className="p-3">
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-2 px-1">العرض</p>
            <button onClick={() => setShowFavOnly(false)}
              className={`w-full text-right px-3 py-2 rounded-lg mb-0.5 text-[11px] font-medium transition-all block ${!showFavOnly ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:bg-gray-800/60 hover:text-white'}`}>
              جميع قوالبي ({overlays.length})
            </button>
            <button onClick={() => setShowFavOnly(true)}
              className={`w-full text-right px-3 py-2 rounded-lg mb-0.5 text-[11px] font-medium transition-all block ${showFavOnly ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' : 'text-gray-500 hover:bg-gray-800/60 hover:text-white'}`}>
              ⭐ المفضلة ({favoriteIds.length})
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="bg-[#0d1117]/90 border-b border-gray-800/80 flex-shrink-0">
          {/* Main Tabs */}
          <div className="flex gap-1 px-5 pt-3">
            <button onClick={() => setMainTab('catalog')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 ${mainTab === 'catalog' ? 'text-blue-400 border-blue-500 bg-blue-600/10' : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/50'}`}>
              <BookOpen className="w-4 h-4" />
              كل القوالب
              <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">{allTemplates.length}</span>
            </button>
            <button onClick={() => setMainTab('mine')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 ${mainTab === 'mine' ? 'text-green-400 border-green-500 bg-green-600/10' : 'text-gray-400 border-transparent hover:text-white hover:bg-gray-800/50'}`}>
              <FolderOpen className="w-4 h-4" />
              قوالبي
              {overlays.length > 0 && <span className="text-[10px] bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">{overlays.length}</span>}
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="بحث..." className="w-full bg-gray-800 border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>

            {mainTab === 'mine' && (
              <div className="relative">
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-gray-800 border border-gray-700 rounded-lg pr-3 pl-7 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer">
                  <option value="recent">الأحدث</option>
                  <option value="name">الاسم</option>
                  <option value="live">الهواء أولاً</option>
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            )}

            <span className="text-[11px] text-gray-600">{activeList.length} {mainTab === 'catalog' ? 'قالب' : 'من قوالبك'}</span>

            <button onClick={onNavigateOperator}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
              <Play className="w-3.5 h-3.5 text-green-500" /> الأوبريتور
            </button>

            {mainTab === 'mine' && (
              <button onClick={() => setMainTab('catalog')}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-900/30">
                <Plus className="w-3.5 h-3.5" /> قالب جديد
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* CATALOG TAB */}
          {mainTab === 'catalog' && (
            catalogList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
                <Search className="w-8 h-8 opacity-40" />
                <p className="text-sm">لا توجد نتائج</p>
                <button onClick={() => { setSearchQ(''); setActiveType('ALL'); }} className="text-blue-400 text-xs hover:underline">مسح الفلاتر</button>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {catalogList.map(template => (
                  <CatalogCard
                    key={template.id}
                    template={template}
                    isFavorite={favoriteIds.includes(template.id)}
                    onToggleFavorite={e => { e.stopPropagation(); onToggleFavorite(template.id); }}
                    onAdd={() => onCreate(getTemplateMeta(template).id)}
                  />
                ))}
              </div>
            )
          )}

          {/* MY OVERLAYS TAB */}
          {mainTab === 'mine' && (
            overlays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-20 gap-5">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700">
                  <Settings2 className="w-10 h-10 text-gray-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-white mb-1">لا توجد قوالب بعد</h3>
                  <p className="text-gray-500 text-sm">اذهب إلى "كل القوالب" واضغط "إضافة للاستوديو"</p>
                </div>
                <button onClick={() => setMainTab('catalog')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors text-sm">
                  استعرض الكتالوج
                </button>
              </div>
            ) : myList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
                <Search className="w-8 h-8 opacity-40" />
                <p className="text-sm">لا توجد نتائج</p>
                <button onClick={() => { setSearchQ(''); setActiveType('ALL'); setShowFavOnly(false); }} className="text-blue-400 text-xs hover:underline">مسح الفلاتر</button>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {myList.map(overlay => (
                  <MyCard
                    key={overlay.id}
                    overlay={overlay}
                    isFavorite={favoriteIds.includes(overlay.id)}
                    onSelect={() => onSelect(overlay.id)}
                    onDelete={e => { e.stopPropagation(); onDelete(overlay.id); }}
                    onToggleFavorite={e => { e.stopPropagation(); onToggleFavorite(overlay.id); }}
                    onCopyToken={e => handleCopyToken(overlay, e)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
