import React, { useMemo, useState } from 'react';
import { OverlayConfig, OverlayType } from '../types';
import { Play, Square, FastForward, Rewind, Cast, Wifi, Eye, EyeOff, LayoutTemplate } from 'lucide-react';
import { syncManager } from '../services/syncManager';

interface OperatorProps {
  overlays: OverlayConfig[];
  onUpdate: (updated: OverlayConfig) => void;
}

const ELECTION_SOUNDS = ['RESULTS_STING', 'QUOTE_SWEEP', 'VERSUS_IMPACT', 'SIDEBAR_CHIME', 'DATA_PULSE', 'COUNTDOWN_TICK', 'BREAKING_WHOOSH', 'SOFT_FADE'];

const Operator: React.FC<OperatorProps> = ({ overlays }) => {
  const [selectedId, setSelectedId] = useState<string | null>(overlays.length > 0 ? overlays[0].id : null);
  const [showStreamDeckModal, setShowStreamDeckModal] = useState(false);

  const selectedOverlay = overlays.find(o => o.id === selectedId);

  const selectedMeta = useMemo(() => {
    if (!selectedOverlay) return null;
    return {
      templateLabel: selectedOverlay.templateIcon || selectedOverlay.type,
      description: selectedOverlay.templateDescription || '',
      templateId: selectedOverlay.templateId || selectedOverlay.id,
    };
  }, [selectedOverlay]);
  const toggleVisibility = (overlay: OverlayConfig) => {
    syncManager.updateLiveField(overlay.id, 'isVisible', !overlay.isVisible);
  };

  const updateField = (overlay: OverlayConfig, fieldId: string, value: any) => {
    syncManager.updateLiveField(overlay.id, fieldId, value);
  };

  const getFieldValue = (overlay: OverlayConfig, fieldId: string, fallback: any = '') =>
    overlay.fields.find(f => f.id === fieldId)?.value ?? fallback;
  const showUndecided = selectedOverlay ? getFieldValue(selectedOverlay, 'showUndecided', true) === true : false;

  const stampElectionUpdate = (overlay: OverlayConfig) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    updateField(overlay, 'lastUpdated', `Last update ${timeLabel}`);
  };

  const handleSmartNewsNav = (overlay: OverlayConfig, dir: 'next' | 'prev') => {
    const currentPage = Number(overlay.fields.find(f => f.id === 'currentPage')?.value || 0);
    const pagesStr = String(overlay.fields.find(f => f.id === 'pagesData')?.value || '[]');
    const pages = JSON.parse(pagesStr);

    let newPage = currentPage;
    if (dir === 'next' && currentPage < pages.length - 1) newPage++;
    if (dir === 'prev' && currentPage > 0) newPage--;

    if (newPage !== currentPage) {
      syncManager.updateLiveField(overlay.id, 'currentPage', newPage);
    }
  };

  if (!selectedOverlay) return <div className="p-10 text-center text-gray-500">ظ„ط§ طھظˆط¬ط¯ ظ‚ظˆط§ظ„ط¨ ظ†ط´ط·ط©. ط§ط°ظ‡ط¨ ظ„ظ„ظ…ظƒطھط¨ط© ظˆط£ظ†ط´ط¦ ظ‚ط§ظ„ط¨.</div>;

  return (
    <div className="flex h-full bg-gray-950">
      <div className="w-80 bg-darker border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Cast className="w-5 h-5 text-green-500" />
            <span>ظ‚ط§ط¦ظ…ط© ط§ظ„طھط´ط؛ظٹظ„</span>
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {overlays.map(overlay => (
            <button
              key={overlay.id}
              onClick={() => setSelectedId(overlay.id)}
              className={`w-full p-3 rounded-lg border text-right transition-all flex items-center justify-between group ${
                selectedId === overlay.id ? 'bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-gray-900 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-white mb-1 truncate">{overlay.name}</div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-gray-500 font-mono uppercase bg-gray-950 w-max px-1 rounded border border-gray-800">{overlay.type}</div>
                  {overlay.templateIcon && (
                    <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 rounded border border-white/10 px-1.5 py-0.5">
                      {overlay.templateIcon}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    toggleVisibility(overlay);
                  }}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                    overlay.isVisible ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                  }`}
                >
                  {overlay.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-950">
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">{selectedOverlay.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${selectedOverlay.isVisible ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {selectedOverlay.isVisible ? 'LIVE ON AIR' : 'OFF AIR'}
            </span>
          </div>
          <button
            onClick={() => setShowStreamDeckModal(true)}
            className="text-xs flex items-center gap-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700"
          >
            <Wifi className="w-3 h-3" />
            Stream Deck Info
          </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="mb-8 flex justify-center">
            <button
              onClick={() => toggleVisibility(selectedOverlay)}
              className={`w-full max-w-md py-6 rounded-2xl text-2xl font-bold shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 ${
                selectedOverlay.isVisible
                  ? 'bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-700 hover:to-red-900 border-4 border-red-900'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 border-4 border-green-800'
              }`}
            >
              {selectedOverlay.isVisible ? <Square className="fill-current w-8 h-8" /> : <Play className="fill-current w-8 h-8" />}
              <span>{selectedOverlay.isVisible ? 'ط¥ظ†ظ‡ط§ط، ط§ظ„ط¸ظ‡ظˆط± (TAKE OUT)' : 'ط¥ط¸ظ‡ط§ط± ط¹ظ„ظ‰ ط§ظ„ط¨ط« (TAKE IN)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
            {selectedOverlay.type === OverlayType.SMART_NEWS && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-blue-500" />
                    طھط­ظƒظ… ط§ظ„ط´ط±ط§ط¦ط­
                  </h3>
                  <span className="font-mono text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
                    طµظپط­ط© {Number(selectedOverlay.fields.find(f => f.id === 'currentPage')?.value || 0) + 1}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleSmartNewsNav(selectedOverlay, 'prev')}
                    className="flex-1 py-8 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex flex-col items-center justify-center gap-2 border-b-4 border-gray-950 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    <Rewind className="w-8 h-8" />
                    <span className="font-bold">ط§ظ„ط³ط§ط¨ظ‚</span>
                  </button>
                  <button
                    onClick={() => handleSmartNewsNav(selectedOverlay, 'next')}
                    className="flex-1 py-8 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex flex-col items-center justify-center gap-2 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    <FastForward className="w-8 h-8" />
                    <span className="font-bold">ط§ظ„طھط§ظ„ظٹ</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOverlay.type === OverlayType.SCOREBOARD && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4">طھط¹ط¯ظٹظ„ ط§ظ„ظ†طھط§ط¦ط¬</h3>
                <div className="flex items-center gap-8 justify-center">
                  <div className="text-center space-y-2">
                    <label className="text-gray-400 text-sm">ط§ظ„ظ…ط¶ظٹظپ</label>
                    <div className="text-3xl font-mono font-bold text-white bg-black p-4 rounded-lg border border-gray-700">
                      {String(selectedOverlay.fields.find(f => f.id === 'homeScore')?.value)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateField(selectedOverlay, 'homeScore', Number(selectedOverlay.fields.find(f => f.id === 'homeScore')?.value) + 1)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold">+</button>
                      <button onClick={() => updateField(selectedOverlay, 'homeScore', Math.max(0, Number(selectedOverlay.fields.find(f => f.id === 'homeScore')?.value) - 1))} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold">-</button>
                    </div>
                  </div>

                  <div className="h-20 w-px bg-gray-800"></div>

                  <div className="text-center space-y-2">
                    <label className="text-gray-400 text-sm">ط§ظ„ط¶ظٹظپ</label>
                    <div className="text-3xl font-mono font-bold text-white bg-black p-4 rounded-lg border border-gray-700">
                      {String(selectedOverlay.fields.find(f => f.id === 'awayScore')?.value)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateField(selectedOverlay, 'awayScore', Number(selectedOverlay.fields.find(f => f.id === 'awayScore')?.value) + 1)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold">+</button>
                      <button onClick={() => updateField(selectedOverlay, 'awayScore', Math.max(0, Number(selectedOverlay.fields.find(f => f.id === 'awayScore')?.value) - 1))} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold">-</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedOverlay.type === OverlayType.ELECTION && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold">ط£ظˆط¶ط§ط¹ ظ‚ط§ظ„ط¨ ط§ظ„ط§ظ†طھط®ط§ط¨ط§طھ</h3>
                      <p className="text-xs text-gray-500 mt-1">{selectedMeta?.description || 'قالب انتخابات مستقل قابل للإظهار والإخفاء وحده.'}</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black tracking-[0.2em] text-gray-300">
                      {selectedMeta?.templateLabel}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-800 bg-black/30 px-4 py-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Template</div>
                      <div className="mt-2 text-sm font-mono text-white">{selectedMeta?.templateId}</div>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/30 px-4 py-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Overlay</div>
                      <div className="mt-2 text-sm font-mono text-white">{String(getFieldValue(selectedOverlay, 'designStyle', 'ELECTION'))}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">ط´ط§ط±ط© ط§ظ„ط­ط§ظ„ط©</label>
                      <input
                        type="text"
                        value={String(getFieldValue(selectedOverlay, 'statusBadge', ''))}
                        onChange={e => updateField(selectedOverlay, 'statusBadge', e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">ط§ظ„ظ…طµط¯ط±</label>
                      <input
                        type="text"
                        value={String(getFieldValue(selectedOverlay, 'sourceLabel', ''))}
                        onChange={e => updateField(selectedOverlay, 'sourceLabel', e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">ط¢ط®ط± طھط­ط¯ظٹط«</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={String(getFieldValue(selectedOverlay, 'lastUpdated', ''))}
                          onChange={e => updateField(selectedOverlay, 'lastUpdated', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                        />
                        <button
                          onClick={() => stampElectionUpdate(selectedOverlay)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
                        >
                          ط§ظ„ط¢ظ†
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">Take In Sound</label>
                        <select
                          value={String(getFieldValue(selectedOverlay, 'soundInStyle', 'RESULTS_STING'))}
                          onChange={e => updateField(selectedOverlay, 'soundInStyle', e.target.value)}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                        >
                          {ELECTION_SOUNDS.map(sound => <option key={sound} value={sound}>{sound}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">Take Out Sound</label>
                        <select
                          value={String(getFieldValue(selectedOverlay, 'soundOutStyle', 'SOFT_FADE'))}
                          onChange={e => updateField(selectedOverlay, 'soundOutStyle', e.target.value)}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                        >
                          {ELECTION_SOUNDS.map(sound => <option key={sound} value={sound}>{sound}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">ظ…ظ„ط§ط­ط¸ط© ط§ظ„ط¨ط«</label>
                      <textarea
                        rows={4}
                        value={String(getFieldValue(selectedOverlay, 'specialText', ''))}
                        onChange={e => updateField(selectedOverlay, 'specialText', e.target.value)}
                        className="w-full resize-y rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
                  <h3 className="text-white font-bold">ط§ظ„ظ†طھط§ط¦ط¬ ط§ظ„ظ…ط¨ط§ط´ط±ط©</h3>

                  {[1, 2].map(index => (
                    <div key={index} className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white">{String(getFieldValue(selectedOverlay, `candidate${index}Name`, `ظ…ط±ط´ط­ ${index}`))}</div>
                        <div className="text-sm font-mono text-gray-400">{Number(getFieldValue(selectedOverlay, `candidate${index}Percent`, 0)).toFixed(1)}%</div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number(getFieldValue(selectedOverlay, `candidate${index}Percent`, 0))}
                        onChange={e => updateField(selectedOverlay, `candidate${index}Percent`, Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">ط§ظ„ط£طµظˆط§طھ</label>
                          <input
                            type="number"
                            value={Number(getFieldValue(selectedOverlay, `candidate${index}Votes`, 0))}
                            onChange={e => updateField(selectedOverlay, `candidate${index}Votes`, Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">ط§ظ„طھط؛ظٹط± %</label>
                          <input
                            type="number"
                            step={0.1}
                            value={Number(getFieldValue(selectedOverlay, `candidate${index}Delta`, 0))}
                            onChange={e => updateField(selectedOverlay, `candidate${index}Delta`, Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {showUndecided && (
                    <div className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white">{String(getFieldValue(selectedOverlay, 'undecidedLabel', 'ط؛ظٹط± ظ…ط­ط³ظˆظ…'))}</div>
                        <div className="text-sm font-mono text-gray-400">{Number(getFieldValue(selectedOverlay, 'undecidedPercent', 0)).toFixed(1)}%</div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number(getFieldValue(selectedOverlay, 'undecidedPercent', 0))}
                        onChange={e => updateField(selectedOverlay, 'undecidedPercent', Number(e.target.value))}
                        className="w-full accent-gray-400"
                      />
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white">ط§ظ„ظ…ط´ط§ط±ظƒط©</div>
                      <div className="text-sm font-mono text-gray-400">{Number(getFieldValue(selectedOverlay, 'currentVoters', 0)).toLocaleString('en-US')}</div>
                    </div>
                    <input
                      type="number"
                      value={Number(getFieldValue(selectedOverlay, 'currentVoters', 0))}
                      onChange={e => updateField(selectedOverlay, 'currentVoters', Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {[500, 1000, 5000].map(step => (
                        <button
                          key={step}
                          onClick={() => updateField(selectedOverlay, 'currentVoters', Number(getFieldValue(selectedOverlay, 'currentVoters', 0)) + step)}
                          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-bold text-gray-300 hover:border-blue-500 hover:text-white"
                        >
                          +{step}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showStreamDeckModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">ط¨ظٹط§ظ†ط§طھ ط§ظ„طھط­ظƒظ… ط§ظ„ظ…طھظ‚ط¯ظ…ط©</h2>
            <p className="text-gray-400 mb-4 text-sm">ظ„ظ„طھط­ظƒظ… ط§ظ„ط®ط§ط±ط¬ظٹ (StreamDeck / Bitfocus Companion)طŒ ظٹظ…ظƒظ†ظƒ ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ€ Studio ID ط§ظ„ط®ط§طµ ط¨ظƒ:</p>

            <div className="bg-black p-4 rounded border border-gray-800 mb-4">
              <code className="text-green-400 font-mono text-lg">{syncManager.getStudioId()}</code>
            </div>
            <p className="text-xs text-gray-500">لا يوجد REST API مباشر حالياً. الربط يتم من خلال التوكنات والإضافة الحالية.</p>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowStreamDeckModal(false)} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">
                ط¥ط؛ظ„ط§ظ‚
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operator;
