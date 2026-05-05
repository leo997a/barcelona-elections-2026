import React, { useMemo, useState } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import { Plus, Edit3, Trash2, Play, Key, Zap, Settings2, X, Filter, MonitorPlay, BarChart, FileText, Layers, Tv2, MessagesSquare } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { encodeBase64UrlUtf8 } from '../utils/base64';
import { getTemplateMeta, getVisibleTemplates } from '../utils/templateRegistry';

interface LibraryProps {
  overlays: OverlayConfig[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (templateId: string) => void;
  onNavigateOperator: () => void;
}

export const getCategoryIcon = (type: OverlayType) => {
    switch(type) {
        case OverlayType.SCOREBOARD: return <MonitorPlay className="w-4 h-4" />;
        case OverlayType.ELECTION: return <BarChart className="w-4 h-4" />;
        case OverlayType.LOWER_THIRD: return <FileText className="w-4 h-4" />;
        case OverlayType.TICKER: return <Tv2 className="w-4 h-4" />;
        case OverlayType.GUESTS: return <Layers className="w-4 h-4" />;
        default: return <Settings2 className="w-4 h-4" />;
    }
};

const CATEGORIES = [
  { id: 'ALL', label: 'الكل', icon: <Layers className="w-4 h-4" /> },
  { id: OverlayType.SCOREBOARD, label: 'الرياضة والنتائج', icon: <MonitorPlay className="w-4 h-4" /> },
  { id: OverlayType.ELECTION, label: 'الانتخابات والإحصائيات', icon: <BarChart className="w-4 h-4" /> },
  { id: OverlayType.LOWER_THIRD, label: 'الأسماء والتعريفات', icon: <FileText className="w-4 h-4" /> },
  { id: OverlayType.TICKER, label: 'الأشرطة الإخبارية', icon: <Tv2 className="w-4 h-4" /> },
];

const Library: React.FC<LibraryProps> = ({ overlays, onSelect, onDelete, onCreate, onNavigateOperator }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const availableTemplates = useMemo(() => getVisibleTemplates(), []);

  const filteredOverlays = useMemo(() => {
      if (activeCategory === 'ALL') return overlays;
      return overlays.filter(o => o.type === activeCategory);
  }, [overlays, activeCategory]);

  const handleCopySmartToken = (overlay: OverlayConfig, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click
    const secureContext = syncManager.getSmartTokenContext();
    const payload = {
      s: syncManager.getStudioId(),
      id: overlay.id,
      tp: overlay.type,
      nm: overlay.name,
      sv: secureContext?.provider || 'local',
      ct: secureContext?.controlAccessKey || undefined,
    };

    try {
      const token = 'rge_' + encodeBase64UrlUtf8(JSON.stringify(payload));
      navigator.clipboard.writeText(token);

      const btn = document.getElementById(`token-btn-${overlay.id}`);
      const txt = document.getElementById(`token-text-${overlay.id}`);

      if (btn && txt) {
        const originalText = txt.innerText;
        const originalClasses = btn.className;
        txt.innerText = 'تم النسخ';
        btn.className =
          'absolute top-4 right-4 z-30 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transform scale-105 transition-all duration-200';
        setTimeout(() => {
          if (btn && txt) {
            txt.innerText = originalText;
            btn.className = originalClasses;
          }
        }, 2000);
      }
    } catch (e) {
      console.error('Token Generation Error', e);
      alert('حدث خطأ أثناء توليد التوكن');
    }
  };

  return (
    <div className="p-8 animate-fade-in-up relative min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-3 flex items-center gap-4">
            <MonitorPlay className="w-10 h-10 text-blue-500" />
            استوديو القوالب
          </h2>
          <p className="text-gray-400 text-lg">منصة الإخراج المباشر الاحترافية. قم بإدارة وتخصيص قوالبك بمرونة عالية.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onNavigateOperator}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl transition-colors border border-gray-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] font-bold group"
          >
            <Play className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
            <span>لوحة البث (Operator)</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-900/30 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>إنشاء قالب</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {overlays.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
              {CATEGORIES.map(cat => (
                  <button 
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all whitespace-nowrap border ${
                          activeCategory === cat.id 
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                          : 'bg-gray-900/50 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-white'
                      }`}
                  >
                      {cat.icon}
                      {cat.label}
                  </button>
              ))}
          </div>
      )}

      {overlays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-gradient-to-b from-gray-900/40 to-transparent rounded-3xl border border-gray-800/50 shadow-inner">
          <div className="bg-gray-800/80 p-6 rounded-3xl mb-6 shadow-2xl transform -rotate-6 border border-gray-700">
            <Settings2 className="w-16 h-16 text-gray-500" />
          </div>
          <h3 className="text-3xl font-black text-white mb-3">الاستوديو فارغ</h3>
          <p className="text-gray-400 mb-8 text-lg max-w-md text-center">أضف قالبك الأول للبدء في تجهيز البث المباشر بأعلى جودة بصرية.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:scale-105 transition-transform font-bold shadow-[0_10px_30px_rgba(59,130,246,0.3)] text-lg"
          >
            استكشاف القوالب
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredOverlays.map((overlay) => {
            const meta = getTemplateMeta(overlay);
            // Derive a generic thumbnail background based on type
            let bgGradient = 'from-gray-900 to-gray-950';
            let overlayPattern = 'bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]';
            
            if (overlay.type === OverlayType.SCOREBOARD) bgGradient = 'from-slate-900 to-slate-800';
            else if (overlay.type === OverlayType.ELECTION) bgGradient = 'from-blue-950 to-slate-900';
            else if (overlay.type === OverlayType.LOWER_THIRD) bgGradient = 'from-zinc-900 to-black';

            return (
              <div
                key={overlay.id}
                onClick={() => onSelect(overlay.id)}
                className="group relative bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer flex flex-col h-[340px]"
              >
                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-30">
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg backdrop-blur-md flex items-center gap-2 ${
                      overlay.isVisible ? 'bg-red-600/90 text-white border border-red-500 animate-pulse' : 'bg-black/60 text-gray-400 border border-white/10'
                    }`}
                  >
                    {overlay.isVisible && <span className="w-2 h-2 bg-white rounded-full"></span>}
                    {overlay.isVisible ? 'LIVE' : 'OFF AIR'}
                  </span>
                </div>

                {/* Copy Token Button (Hidden until hover) */}
                <button
                    onClick={(e) => handleCopySmartToken(overlay, e)}
                    id={`token-btn-${overlay.id}`}
                    className="absolute top-4 right-4 z-30 flex items-center justify-center gap-2 bg-black/60 hover:bg-yellow-500/20 text-gray-300 hover:text-yellow-400 border border-white/10 hover:border-yellow-500/50 px-4 py-1.5 rounded-lg backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0"
                    title="نسخ Smart Token"
                >
                    <Key className="w-4 h-4" />
                    <span id={`token-text-${overlay.id}`} className="text-xs font-bold">Token</span>
                </button>

                {/* Thumbnail Area (Visual Representation) */}
                <div className={`h-48 relative overflow-hidden bg-gradient-to-br ${bgGradient}`}>
                  <div className={`absolute inset-0 opacity-20 mix-blend-overlay ${overlayPattern}`}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
                  
                  {/* Abstract Representation of Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-105 transform">
                     <div className="w-32 h-32 rounded-full blur-[60px]" style={{ backgroundColor: meta.accent }}></div>
                     <div className="absolute text-white/10 drop-shadow-2xl flex items-center justify-center">
                         <span className="text-[120px] font-black">{meta.icon}</span>
                     </div>
                  </div>

                  {/* Icon Badge */}
                  <div className="absolute bottom-4 left-5 z-20 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-xl text-white">
                          {meta.icon}
                      </div>
                      <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-gray-300 flex items-center gap-2">
                          {getCategoryIcon(overlay.type as OverlayType)}
                          {overlay.type}
                      </div>
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-5 flex-1 flex flex-col bg-gray-900 relative z-20">
                  <h3 className="text-xl font-black text-white mb-2 truncate group-hover:text-blue-400 transition-colors" title={overlay.name}>
                    {overlay.name}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed flex-1">{meta.description}</p>
                  
                  {/* Action Bar */}
                  <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="text-[10px] text-gray-500 font-mono">ID: {overlay.id.split('-')[1] || overlay.id}</div>
                    <div className="flex gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                            <Edit3 className="w-4 h-4" />
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(overlay.id); }}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="حذف القالب"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800">
              <div>
                <h3 className="text-3xl font-black text-white mb-2">مكتبة القوالب (Templates)</h3>
                <p className="text-gray-400">اختر الجرافيك المناسب لبثك. تم تصميمه ليكون متوافقاً مع OBS و vMix.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-950">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableTemplates.map(template => {
                    const meta = getTemplateMeta(template);
                    const isBarcelona = meta.group === 'BARCELONA_2026';
                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          onCreate(meta.id);
                          setShowCreateModal(false);
                        }}
                        className="group flex flex-col items-start bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-2xl transition-all hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)] text-right overflow-hidden transform hover:-translate-y-1"
                      >
                        {/* Visual Header */}
                        <div className="w-full h-32 relative bg-gray-800 overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(45deg, ${meta.accent}, transparent)` }}></div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                            <div className="relative z-10 w-16 h-16 bg-black/50 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl text-white font-black text-2xl transform group-hover:scale-110 transition-transform duration-500">
                                {meta.icon}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 w-full flex flex-col flex-1">
                            <div className="flex w-full items-start justify-between gap-3 mb-3">
                              <div className="font-black text-xl text-white group-hover:text-blue-400 transition-colors truncate">{template.name}</div>
                              {isBarcelona && (
                                <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-black tracking-[0.2em] text-rose-400 shrink-0">
                                  BCN '26
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 leading-relaxed line-clamp-2 flex-1">{meta.description}</div>
                            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-800/50 w-max px-3 py-1.5 rounded-lg">
                                {getCategoryIcon(template.type as OverlayType)}
                                {template.type}
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
