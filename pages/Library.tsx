import React, { useMemo, useState } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import { Plus, Edit3, Trash2, Play, Key, Zap, Settings2, X } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { INITIAL_TEMPLATES } from '../constants';

interface LibraryProps {
  overlays: OverlayConfig[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (templateId: string) => void;
  onNavigateOperator: () => void;
}

const LEGACY_HIDDEN_TEMPLATE_IDS = new Set(['template-election']);

const FALLBACK_TEMPLATE_META: Record<OverlayType, { icon: string; accent: string; description: string }> = {
  [OverlayType.LEADERBOARD]: { icon: 'LDR', accent: '#f59e0b', description: 'لوحة داعمين متحركة مناسبة للبث المباشر.' },
  [OverlayType.SMART_NEWS]: { icon: 'AI', accent: '#8b5cf6', description: 'تحويل النصوص الطويلة إلى شرائح أخبار ذكية.' },
  [OverlayType.SCOREBOARD]: { icon: 'SCO', accent: '#3b82f6', description: 'نتائج المباريات والاسكور بشكل مباشر.' },
  [OverlayType.TICKER]: { icon: 'TIC', accent: '#ef4444', description: 'شريط أخبار عاجلة سريع أسفل البث.' },
  [OverlayType.LOWER_THIRD]: { icon: 'LT', accent: '#10b981', description: 'تعريف ضيف أو مذيع بأسلوب عملي.' },
  [OverlayType.ALERT]: { icon: 'ALT', accent: '#f97316', description: 'تنبيهات مباشرة داخل البث.' },
  [OverlayType.EXCLUSIVE_ALERT]: { icon: 'EX', accent: '#dc2626', description: 'خبر حصري بصيغة سريعة وواضحة.' },
  [OverlayType.GUESTS]: { icon: 'GST', accent: '#60a5fa', description: 'قالب ضيوف متعدد بأساليب مختلفة.' },
  [OverlayType.UCL_DRAW]: { icon: 'UCL', accent: '#38bdf8', description: 'قالب قرعة دوري الأبطال.' },
  [OverlayType.ELECTION]: { icon: 'BCN', accent: '#a50044', description: 'قوالب انتخابات برشلونة 2026 للبث المباشر.' },
};

const getTemplateMeta = (overlay: OverlayConfig) => {
  const fallback = FALLBACK_TEMPLATE_META[overlay.type];
  return {
    id: overlay.templateId || overlay.id,
    icon: overlay.templateIcon || fallback.icon,
    accent: overlay.templateAccent || fallback.accent,
    description: overlay.templateDescription || fallback.description,
    group: overlay.templateGroup || overlay.type,
  };
};

const Library: React.FC<LibraryProps> = ({ overlays, onSelect, onDelete, onCreate, onNavigateOperator }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const availableTemplates = useMemo(
    () =>
      INITIAL_TEMPLATES.filter(template => !LEGACY_HIDDEN_TEMPLATE_IDS.has(template.id)).sort((left, right) => {
        if ((left.templateGroup || '') === 'BARCELONA_2026' && (right.templateGroup || '') !== 'BARCELONA_2026') return -1;
        if ((left.templateGroup || '') !== 'BARCELONA_2026' && (right.templateGroup || '') === 'BARCELONA_2026') return 1;
        return left.name.localeCompare(right.name, 'ar');
      }),
    []
  );

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

      if (btn && txt) {
        const originalText = txt.innerText;
        const originalClasses = btn.className;
        txt.innerText = 'تم نسخ التوكن بنجاح!';
        btn.className =
          'w-full mb-3 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl shadow-lg shadow-green-900/20 transform scale-105 transition-all duration-200';
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
    <div className="p-8 animate-fade-in-up relative">
      <div className="flex justify-between items-end mb-10 border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-blue-500" />
            مكتبة القوالب
          </h2>
          <p className="text-gray-400 text-lg">كل قالب له Smart Token مستقل للربط مع Stream Deck والتحكم في الظهور بشكل منفصل.</p>
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
          <p className="text-gray-500 mb-8 text-lg">أنشئ أول قالب لتحصل على كود الربط الخاص به.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold shadow-lg"
          >
            إنشاء قالب جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {overlays.map((overlay) => {
            const meta = getTemplateMeta(overlay);
            return (
              <div
                key={overlay.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 hover:shadow-2xl transition-all group relative flex flex-col"
              >
                <div className="absolute top-4 left-4 z-20">
                  <span
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${
                      overlay.isVisible ? 'bg-red-600 text-white animate-pulse' : 'bg-black/60 text-gray-400 border border-white/10'
                    }`}
                  >
                    {overlay.isVisible ? 'ON AIR' : 'OFF'}
                  </span>
                </div>

                <div className="h-44 bg-darker pattern-grid flex items-end justify-between relative px-5 py-4 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: `radial-gradient(circle at top right, ${meta.accent}, transparent 55%)` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent"></div>
                  <div className="relative z-10 inline-flex h-14 min-w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-4 text-sm font-black tracking-[0.25em] text-white shadow-2xl">
                    {meta.icon}
                  </div>
                  <div className="relative z-10 px-2 py-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg text-[10px] text-gray-400 font-mono">
                    {overlay.type}
                  </div>
                </div>

                <div className="p-5 bg-gray-900 flex-1 flex flex-col relative z-10">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-white mb-1 truncate leading-tight" title={overlay.name}>
                      {overlay.name}
                    </h3>
                    <p className="text-xs text-gray-500 leading-6 min-h-[48px]">{meta.description}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-2">ID: {overlay.id.split('-')[1] || overlay.id}</p>
                  </div>

                  <div className="mb-4">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Stream Deck Token</label>
                    <button
                      onClick={() => handleCopySmartToken(overlay)}
                      id={`token-btn-${overlay.id}`}
                      className="w-full py-3 flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-xl transition-all border border-gray-700 hover:border-yellow-500/50 group/token relative overflow-hidden"
                      title="اضغط لنسخ التوكن الخاص بهذا القالب"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/10 to-transparent opacity-0 group-hover/token:opacity-100 transition-opacity"></div>
                      <Key className="w-5 h-5 text-yellow-500 group-hover/token:text-yellow-400 transition-colors" />
                      <span id={`token-text-${overlay.id}`} className="text-sm font-bold relative z-10">
                        نسخ Smart Token
                      </span>
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
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">اختر القالب الجديد</h3>
                <p className="text-sm text-gray-500 mt-1">قوالب برشلونة 2026 أصبحت مستقلة، وكل قالب يمكن إظهاره وإخفاؤه وحده.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
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
                    className="flex flex-col items-start gap-4 p-5 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-500 rounded-xl transition-all group text-right"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div
                        className="inline-flex h-14 min-w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-black tracking-[0.25em] text-white"
                        style={{ boxShadow: `0 0 0 1px ${meta.accent}33 inset` }}
                      >
                        {meta.icon}
                      </div>
                      {isBarcelona && (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-black tracking-[0.24em] text-rose-300">
                          BCN 2026
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{template.name}</div>
                      <div className="text-sm text-gray-400 leading-6">{meta.description}</div>
                    </div>
                    <div className="mt-auto text-[11px] font-mono text-gray-500">{template.type}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
