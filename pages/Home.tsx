import React from 'react';
import { Plus, Zap, Activity, Monitor, ArrowLeft, Layers } from 'lucide-react';
import { OverlayConfig } from '../types';

interface HomeProps {
  overlays: OverlayConfig[];
  onNavigate: (page: string) => void;
  onCreate: (templateId: string) => void;
}

const Home: React.FC<HomeProps> = ({ overlays, onNavigate, onCreate }) => {
  const activeCount = overlays.filter(o => o.isVisible).length;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in-up">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-darker border border-blue-800/50 shadow-2xl mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium">
              <Zap className="w-3 h-3 fill-current" />
              <span>ط¬ط§ظ‡ط² ظ„ظ„ط¨ط« - REO LIVE v2.0</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              ط§ط¨ط¯ط£ ط¨ط«ظƒ ط§ظ„ط§ط­طھط±ط§ظپظٹ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">ط®ظ„ط§ظ„ 60 ط«ط§ظ†ظٹط©</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              ظ…ظ†ط¸ظˆظ…ط© ط±ط³ظˆظ…ظٹط© ظ…طھظƒط§ظ…ظ„ط© (Reo Live Stream) ظ…طµظ…ظ…ط© ظ„ظ„ط¨ط« ط§ظ„ظ…ط¨ط§ط´ط±.
              طھط­ظƒظ… ظƒط§ظ…ظ„ ط¹ط¨ط± ط§ظ„ظ…طھطµظپط­طŒ Stream DeckطŒ ظˆ API.
            </p>
            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={() => onNavigate('library')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>ط¥ظ†ط´ط§ط، ط¬ط±ط§ظپظٹظƒ ط¬ط¯ظٹط¯</span>
              </button>
              <button
                onClick={() => onNavigate('operator')}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg font-bold transition-all flex items-center gap-2"
              >
                <Activity className="w-5 h-5" />
                <span>ط؛ط±ظپط© ط§ظ„طھط­ظƒظ…</span>
              </button>
            </div>
          </div>

          <div className="bg-gray-950/50 backdrop-blur-sm border border-gray-800 p-6 rounded-xl w-full md:w-80">
            <h3 className="text-gray-400 text-sm font-medium mb-4">ط­ط§ظ„ط© ط§ظ„ظ†ط¸ط§ظ…</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
                  <span className="text-white font-medium">ON AIR</span>
                </div>
                <span className="font-mono text-xl font-bold text-white">{activeCount}</span>
              </div>
              <div className="h-px bg-gray-800"></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">Outputs</span>
                </div>
                <span className="font-mono text-white">{overlays.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-gray-300">Latency</span>
                </div>
                <span className="font-mono text-green-400">~12ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Layers className="w-5 h-5 text-blue-500" />
        <span>ظ‚ظˆط§ظ„ط¨ ط³ط±ظٹط¹ط© (Quick Launch)</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <QuickLaunchCard
          title="ظ„ظˆط­ط© ط§ظ„ط¯ط§ط¹ظ…ظٹظ†"
          desc="ط¹ط±ط¶ ظ‚ط§ط¦ظ…ط© ط§ظ„ط¯ط§ط¹ظ…ظٹظ† (Top Donors)"
          color="from-yellow-600 to-orange-600"
          icon="BAR"
          onClick={() => onCreate('template-leaderboard-ribbon')}
        />
        <QuickLaunchCard
          title="ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ط°ظƒظٹ"
          desc="طھط­ظˆظٹظ„ ط§ظ„ظ†طµظˆطµ ط§ظ„ط·ظˆظٹظ„ط© ظ„ط´ط±ط§ط¦ط­"
          color="from-purple-600 to-indigo-600"
          icon="AI"
          onClick={() => onCreate('template-smart-news-1')}
        />
        <QuickLaunchCard
          title="ظ„ظˆط­ط© ط§ظ„ظ†طھط§ط¦ط¬"
          desc="ظƒط±ط© ظ‚ط¯ظ…طŒ ط³ظ„ط©طŒ ط·ط§ط¦ط±ط©"
          color="from-blue-600 to-cyan-600"
          icon="SCO"
          onClick={() => onCreate('template-soccer')}
        />
        <QuickLaunchCard
          title="ط´ط±ظٹط· ط§ظ„ط£ط®ط¨ط§ط±"
          desc="طھط­ط¯ظٹط«ط§طھ ط¹ط§ط¬ظ„ط© ظˆط³ط±ظٹط¹ط©"
          color="from-red-600 to-orange-600"
          icon="TIC"
          onClick={() => onCreate('template-news')}
        />
        <QuickLaunchCard
          title="Lower Third"
          desc="طھط¹ط±ظٹظپ ط§ظ„ط¶ظٹظˆظپ ظˆط§ظ„ظ…ط°ظٹط¹ظٹظ†"
          color="from-green-600 to-emerald-600"
          icon="LT"
          onClick={() => onCreate('template-lower')}
        />
        <QuickLaunchCard
          title="Barcelona 2026"
          desc="شريط نتائج حديث لانتخابات برشلونة 2026"
          color="from-rose-700 to-blue-700"
          icon="BCN"
          onClick={() => onCreate('template-election-results-bar')}
        />
      </div>
    </div>
  );
};

const QuickLaunchCard = ({ title, desc, color, icon, onClick }: any) => (
  <button
    onClick={onClick}
    className="relative group overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-6 text-right transition-all hover:-translate-y-1 hover:shadow-xl"
  >
    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${color}`}></div>
    <div className="mb-3 inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black tracking-[0.24em] text-white">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{title}</h3>
    <p className="text-sm text-gray-500">{desc}</p>
    <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
      <ArrowLeft className="w-5 h-5 text-gray-400" />
    </div>
  </button>
);

export default Home;
