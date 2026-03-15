
import React, { useState } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import { Plus, Edit3, Trash2, Play, Key, Zap, Settings2, X } from 'lucide-react';
import { syncManager } from '../services/syncManager';

interface LibraryProps {
  overlays: OverlayConfig[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (type: OverlayType) => void;
  onNavigateOperator: () => void;
}

const Library: React.FC<LibraryProps> = ({ overlays, onSelect, onDelete, onCreate, onNavigateOperator }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCopySmartToken = (overlay: OverlayConfig) => {
      const payload = {
          s: syncManager.getStudioId(),
          id: overlay.id,
          tp: overlay.type,
          nm: overlay.name
      };

      try {
        const jsonString = JSON.stringify(payload);
        const utf8Bytes = unescape(encodeURIComponent(jsonString));
        const token = 'rge_' + btoa(utf8Bytes);
        navigator.clipboard.writeText(token);
        
        const btn = document.getElementById(`token-btn-${overlay.id}`);
        const txt = document.getElementById(`token-text-${overlay.id}`);
        
        if(btn && txt) {
            const originalText = txt.innerText;
            const originalClasses = btn.className;
            txt.innerText = "تم نسخ التوكن بنجاح! ✅";
            btn.className = "w-full mb-3 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl shadow-lg shadow-green-900/20 transform scale-105 transition-all duration-200";
            setTimeout(() => { 
                if(btn && txt) {
                    txt.innerText = originalText;
                    btn.className = originalClasses;
                }
            }, 2000);
        }
      } catch (e) {
          console.error("Token Generation Error", e);
          alert("حدث خطأ أثناء توليد التوكن");
      }
  };

  const templates = [
      { type: OverlayType.LEADERBOARD, label: "لوحة الداعمين (Leaderboard)", icon: "👑", color: "text-yellow-500" },
      { type: OverlayType.SMART_NEWS, label: "التقرير الذكي (Smart News)", icon: "✨", color: "text-purple-500" },
      { type: OverlayType.SCOREBOARD, label: "لوحة النتائج (Scoreboard)", icon: "⚽", color: "text-blue-500" },
      { type: OverlayType.TICKER, label: "شريط الأخبار (Ticker)", icon: "📰", color: "text-red-500" },
      { type: OverlayType.LOWER_THIRD, label: "تعريف ضيف (Lower Third)", icon: "👤", color: "text-green-500" },
      { type: OverlayType.EXCLUSIVE_ALERT, label: "خبر حصري (Exclusive Alert)", icon: "🚨", color: "text-red-600" },
      { type: OverlayType.GUESTS, label: "ضيوف الحلقة (Guests)", icon: "👥", color: "text-blue-400" },
      { type: OverlayType.UCL_DRAW, label: "قرعة الأبطال (UCL Draw)", icon: "🏆", color: "text-indigo-400" },
      { type: OverlayType.ELECTION, label: "انتخابات برشلونة 2026", icon: "🗳️", color: "text-red-500" },
  ];

  return (
    <div className="p-8 animate-fade-in-up relative">
      {/* Header */}
      <div className="flex justify-between items-end mb-10 border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-blue-500" />
            مكتبة القوالب
          </h2>
          <p className="text-gray-400 text-lg">هنا تجد "Smart Token" الخاص بكل قالب لربطه بـ Stream Deck.</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={onNavigateOperator}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl transition-colors border border-gray-700 font-bold"
            >
                <Play className="w-4 h-4 text-green-500" />
                <span>غرفة التحكم</span>
            </button>
            <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold shadow-lg shadow-blue-900/20"
            >
            <Plus className="w-5 h-5" />
            <span>قالب جديد</span>
            </button>
        </div>
      </div>

      {overlays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-800">
            <div className="bg-gray-800 p-6 rounded-full mb-6">
                 <Zap className="w-12 h-12 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">المكتبة فارغة</h3>
            <p className="text-gray-500 mb-8 text-lg">أنشئ أول قالب للحصول على كود الربط الخاص به.</p>
            <button 
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold shadow-lg"
            >
                إنشاء قالب جديد
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {overlays.map((overlay) => (
            <div key={overlay.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 hover:shadow-2xl transition-all group relative flex flex-col">
                <div className="absolute top-4 left-4 z-20">
                     <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${overlay.isVisible ? 'bg-red-600 text-white animate-pulse' : 'bg-black/60 text-gray-400 border border-white/10'}`}>
                        {overlay.isVisible ? 'ON AIR' : 'OFF'}
                     </span>
                </div>

                <div className="h-44 bg-darker pattern-grid flex items-center justify-center relative group-hover:scale-105 transition-transform duration-700">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent"></div>
                     <span className="text-6xl opacity-20 filter blur-sm transition-all group-hover:blur-0 group-hover:opacity-100 group-hover:-translate-y-2 grayscale group-hover:grayscale-0 duration-500">
                        {overlay.type === OverlayType.SMART_NEWS ? '✨' : 
                         overlay.type === OverlayType.SCOREBOARD ? '⚽' :
                         overlay.type === OverlayType.LEADERBOARD ? '👑' :
                         overlay.type === OverlayType.TICKER ? '📰' : 
                         overlay.type === OverlayType.ELECTION ? '🗳️' : '📺'}
                     </span>
                     <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg text-[10px] text-gray-400 font-mono">
                        {overlay.type}
                     </div>
                </div>

                <div className="p-5 bg-gray-900 flex-1 flex flex-col relative z-10">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-1 truncate leading-tight" title={overlay.name}>{overlay.name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono">ID: {overlay.id.split('-')[1] || overlay.id}</p>
                    </div>
                    
                    <div className="mb-4">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">كود الربط (Stream Deck)</label>
                        <button 
                            onClick={() => handleCopySmartToken(overlay)}
                            id={`token-btn-${overlay.id}`}
                            className="w-full py-3 flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-xl transition-all border border-gray-700 hover:border-yellow-500/50 group/token relative overflow-hidden"
                            title="اضغط لنسخ التوكن الخاص بهذا القالب"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/10 to-transparent opacity-0 group-hover/token:opacity-100 transition-opacity"></div>
                            <Key className="w-5 h-5 text-yellow-500 group-hover/token:text-yellow-400 transition-colors" />
                            <span id={`token-text-${overlay.id}`} className="text-sm font-bold relative z-10">نسخ Smart Token</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-800/50">
                        <button 
                            onClick={() => onSelect(overlay.id)}
                            className="flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 hover:border-blue-600/50 py-2.5 rounded-lg transition-all"
                        >
                            <Edit3 className="w-4 h-4" />
                            <span className="text-xs font-bold">تعديل</span>
                        </button>
                        
                        <button 
                            onClick={() => onDelete(overlay.id)}
                            className="flex items-center justify-center bg-red-900/5 hover:bg-red-900/20 text-red-400/70 hover:text-red-400 border border-transparent hover:border-red-900/30 rounded-lg transition-colors"
                            title="حذف القالب"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up">
                  <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">اختر نوع القالب الجديد</h3>
                      <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map(t => (
                          <button
                            key={t.type}
                            onClick={() => {
                                onCreate(t.type);
                                setShowCreateModal(false);
                            }}
                            className="flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-500 rounded-xl transition-all group text-right"
                          >
                              <div className={`text-4xl ${t.color}`}>{t.icon}</div>
                              <div>
                                  <div className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{t.label}</div>
                                  <div className="text-xs text-gray-500">انقر للإنشاء</div>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Library;
