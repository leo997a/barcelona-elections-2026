import React from 'react';
import { OverlayConfig } from '../types';
import { Plus, Play, Edit3, Trash2, Copy } from 'lucide-react';

interface DashboardProps {
  overlays: OverlayConfig[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ overlays, onSelect, onDelete, onCreate }) => {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">القوالب النشطة</h2>
          <p className="text-gray-400">إدارة وتعديل قوالب البث المباشر الخاصة بك</p>
        </div>
        <button 
          onClick={onCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-5 h-5" />
          <span>قالب جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {overlays.map((overlay) => (
          <div key={overlay.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all group">
            {/* Preview Area Placeholder */}
            <div className="h-40 bg-gray-900 pattern-grid flex items-center justify-center relative">
               <div className="absolute inset-0 opacity-30 flex items-center justify-center">
                 {/* Mini rendering could go here, for now a placeholder icon */}
                 <span className="text-6xl opacity-20">📺</span>
               </div>
               <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                 {overlay.type}
               </div>
            </div>

            <div className="p-5">
              <h3 className="text-lg font-bold text-white mb-1">{overlay.name}</h3>
              <p className="text-sm text-gray-500 mb-4">تم التحديث: منذ 10 دقائق</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => onSelect(overlay.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل</span>
                </button>
                 <button 
                  onClick={() => {
                     const url = `${window.location.origin}${window.location.pathname}#/output/${overlay.id}`;
                     navigator.clipboard.writeText(url);
                     alert('تم نسخ رابط المتصفح بنجاح! يمكنك لصقه الآن في OBS.');
                  }}
                  className="px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                  title="نسخ رابط OBS"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(overlay.id)}
                  className="px-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
