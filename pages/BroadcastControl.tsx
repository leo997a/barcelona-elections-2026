import React, { useState, useCallback } from 'react';
import { Volume2, Play, Sliders, Radio, Music, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { playCue, setMasterVolume, getMasterVolume, PREVIEWABLE_CUES, invalidateCueFxCache } from '../services/audioEngine';
import { licenseService } from '../services/licenseService';
import { toSystemRole, can, getRoleDisplayName, type SystemRole } from '../utils/permissions';

// ── Per-cue FX config (persisted in localStorage) ──────────────────────────
const FX_STORAGE_KEY = 'rge_cue_fx_v1';

interface CueFxConfig { reverb: number; subBass: number }

// Default reverb/subBass per cue (mirrors audioEngine defaults)
const CUE_FX_DEFAULTS: Record<string, CueFxConfig> = {
  SCOREBUG_SNAP:    { reverb: 0.10, subBass: 0.42 },
  LOWER_THIRD_WIPE: { reverb: 0.10, subBass: 0.00 },
  STADIUM_WHOOSH:   { reverb: 0.22, subBass: 0.68 },
  DATA_TICK:        { reverb: 0.08, subBass: 0.30 },
  DATA_SLAM:        { reverb: 0.14, subBass: 0.72 },
  LUXURY_SWEEP:     { reverb: 0.22, subBass: 0.68 },
  LUXURY_IMPACT:    { reverb: 0.16, subBass: 0.58 },
  LUXURY_OUT:       { reverb: 0.06, subBass: 0.00 },
  BROADCAST_OUT:    { reverb: 0.06, subBass: 0.00 },
  SOFT_FADE:        { reverb: 0.04, subBass: 0.00 },
  MERCATO_HIT:      { reverb: 0.24, subBass: 1.00 },
  HERE_WE_GO_STING: { reverb: 0.26, subBass: 1.10 },
  TRANSFER_RISER:   { reverb: 0.22, subBass: 0.68 },
  CONTRACT_STAMP:   { reverb: 0.20, subBass: 1.10 },
  DEAL_LOCK:        { reverb: 0.26, subBass: 1.10 },
  AGENT_CALL:       { reverb: 0.12, subBass: 0.40 },
  CASH_REGISTER:    { reverb: 0.16, subBass: 0.60 },
  DEADLINE_ALARM:   { reverb: 0.18, subBass: 0.70 },
  GOAL_HORN:        { reverb: 0.28, subBass: 1.00 },
  BREAKING_NEWS_ALARM: { reverb: 0.22, subBass: 0.72 },
  CINEMA_BOOM:      { reverb: 0.32, subBass: 1.20 },
  PLAYER_ENTRANCE:  { reverb: 0.18, subBass: 0.50 },
  ELITE_HIT:        { reverb: 0.24, subBass: 1.00 },
  ULTRA_RISER:      { reverb: 0.20, subBass: 0.80 },
  VAR_BUZZ:         { reverb: 0.12, subBass: 0.45 },
};

function loadCueFx(): Record<string, CueFxConfig> {
  try {
    const raw = localStorage.getItem(FX_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CueFxConfig>;
  } catch { return {}; }
}

function saveCueFx(overrides: Record<string, CueFxConfig>) {
  try { localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(overrides)); } catch { /* noop */ }
}

// ── Component ───────────────────────────────────────────────────────────────

const BroadcastControl: React.FC = () => {
  // ── Role & Permissions ──
  const stored = licenseService.getStored();
  const systemRole: SystemRole = stored?.valid ? toSystemRole(stored.role) : 'VIEWER';
  const canEditAudio = can(systemRole, 'AUDIO_EDIT_OWN');

  // ── Audio State ──
  const [masterVol, setMasterVol] = useState(() => getMasterVolume());
  const [playingCue, setPlayingCue] = useState<string | null>(null);

  // ── Per-cue FX State ──
  const [cueFxOverrides, setCueFxOverrides] = useState<Record<string, CueFxConfig>>(() => loadCueFx());
  const [expandedCue, setExpandedCue] = useState<string | null>(null);

  const getCueFx = useCallback((cueValue: string): CueFxConfig => {
    return cueFxOverrides[cueValue] ?? CUE_FX_DEFAULTS[cueValue] ?? { reverb: 0.12, subBass: 0.0 };
  }, [cueFxOverrides]);

  const updateCueFx = useCallback((cueValue: string, field: keyof CueFxConfig, value: number) => {
    setCueFxOverrides(prev => {
      const next = { ...prev, [cueValue]: { ...getCueFx(cueValue), [field]: value } };
      saveCueFx(next);
      invalidateCueFxCache(); // force audioEngine to re-read on next play
      return next;
    });
  }, [getCueFx]);

  const resetCueFx = useCallback((cueValue: string) => {
    setCueFxOverrides(prev => {
      const next = { ...prev };
      delete next[cueValue];
      saveCueFx(next);
      invalidateCueFxCache(); // force audioEngine to re-read on next play
      return next;
    });
  }, []);

  const isModified = (cueValue: string): boolean => Boolean(cueFxOverrides[cueValue]);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up space-y-10 p-8">

      {/* ── Header ── */}
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/50 via-gray-950 to-gray-900 p-8 shadow-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-200">
          <Radio className="h-3.5 w-3.5" />
          استوديو البث
        </div>
        <h1 className="text-3xl font-black text-white md:text-4xl">🎛️ التحكم بالبث والقوالب</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300">
          لوحة تحكم مركزية لإعدادات الصوت والمؤثرات وتخصيص القوالب. متاحة حسب مستوى صلاحيتك.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-200">
            <Sliders className="w-3.5 h-3.5" />
            مستوى الوصول: {getRoleDisplayName(systemRole)}
          </span>
          {!canEditAudio && (
            <span className="text-xs text-gray-500">(وضع المشاهدة — لا يمكن التعديل)</span>
          )}
        </div>
      </div>

      {/* ── AUDIO ENGINE CONTROL ── */}
      <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/50 via-gray-950 to-gray-900 p-8 shadow-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-200">
          <Volume2 className="h-3.5 w-3.5" />
          محرك الصوت
        </div>
        <h2 className="text-2xl font-black text-white mb-6">🔊 التحكم بالمؤثرات الصوتية</h2>

        {/* Master Volume */}
        <div className="mb-8 rounded-2xl border border-gray-800 bg-black/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              مستوى الصوت الرئيسي (Master Volume)
            </h3>
            <span className="font-mono text-lg font-black text-purple-300">{Math.round(masterVol * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="150"
            value={Math.round(masterVol * 100)}
            disabled={!canEditAudio}
            onChange={(e) => { const v = Number(e.target.value) / 100; setMasterVol(v); setMasterVolume(v); }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-purple-500 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>صامت</span><span>50%</span><span>100%</span><span>150%</span>
          </div>
        </div>

        {/* Sound Preview Grid — Per-Cue FX */}
        <div className="space-y-8">
          {(['featured', 'news', 'football', 'mercato', 'tactical', 'report', 'lowerthird', 'cinematic', 'experimental', 'legacy'] as const).map(cat => {
            const catLabel =
              cat === 'featured'     ? '⭐ Featured — موصى به' :
              cat === 'news'         ? '🚨 News & Breaking — أخبار' :
              cat === 'football'     ? '⚽ Football Match — مباراة' :
              cat === 'mercato'      ? '⚡ Mercato / Transfers — انتقالات' :
              cat === 'tactical'     ? '🎯 Tactical Analysis — تحليل تكتيكي' :
              cat === 'report'       ? '🎬 Reports & Documentary — تقارير' :
              cat === 'lowerthird'   ? '🪧 Lower Thirds & UI — أشرطة سفلية' :
              cat === 'cinematic'    ? '🎞️ Cinematic Transitions — انتقالات سينمائية' :
              cat === 'experimental' ? '🧪 Experimental — تجريبي' :
              '📦 Legacy — أصوات قديمة (محفوظة)';
            const CatIcon = (cat === 'featured' || cat === 'news') ? Radio : cat === 'mercato' ? Music : Play;
            const cues = PREVIEWABLE_CUES.filter(c => c.category === cat);
            if (cues.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <CatIcon className="w-4 h-4" />{catLabel}
                </h3>
                <div className="space-y-2">
                  {cues.map(cue => {
                    const fx = getCueFx(cue.value);
                    const isExpanded = expandedCue === cue.value;
                    const modified = isModified(cue.value);
                    return (
                      <div key={cue.value} className="rounded-xl border border-gray-800/80 bg-black/20 overflow-hidden">
                        {/* Cue Row */}
                        <div className="flex items-center gap-2 p-2.5">
                          {/* Play Button */}
                          <button
                            disabled={!canEditAudio}
                            onClick={async () => {
                              setPlayingCue(cue.value);
                              await playCue(cue.value, { volume: masterVol, forceSynth: true, channel: 'preview' });
                              setTimeout(() => setPlayingCue(null), 1200);
                            }}
                            className={`flex items-center gap-2 flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-all disabled:opacity-30 ${
                              playingCue === cue.value
                                ? 'border-purple-500 bg-purple-500/20 text-purple-200 scale-[1.02]'
                                : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-purple-500/40 hover:text-white'
                            }`}
                          >
                            <Play className={`w-3.5 h-3.5 flex-shrink-0 ${playingCue === cue.value ? 'text-purple-400' : 'text-gray-500'}`} />
                            <span className="truncate">{cue.label}</span>
                            {modified && (
                              <span className="mr-auto text-[9px] font-black text-purple-400 bg-purple-900/30 border border-purple-500/30 px-1.5 py-0.5 rounded-full">
                                معدّل
                              </span>
                            )}
                          </button>

                          {/* FX Toggle */}
                          {canEditAudio && (
                            <button
                              onClick={() => setExpandedCue(isExpanded ? null : cue.value)}
                              className={`flex items-center gap-1 px-2.5 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                                isExpanded
                                  ? 'border-indigo-500/50 bg-indigo-900/30 text-indigo-300'
                                  : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                              }`}
                              title="إعدادات الصوت لهذا الـ cue"
                            >
                              <Sliders className="w-3 h-3" />
                              FX
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {/* Expanded FX Controls */}
                        {isExpanded && canEditAudio && (
                          <div className="border-t border-gray-800/60 bg-gray-950/50 px-4 py-4 space-y-4">
                            {/* Reverb */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  🌊 Reverb
                                </label>
                                <span className="font-mono text-[11px] text-indigo-300 font-bold">
                                  {Math.round(fx.reverb * 100)}%
                                </span>
                              </div>
                              <input
                                type="range" min="0" max="100"
                                value={Math.round(fx.reverb * 100)}
                                onChange={e => updateCueFx(cue.value, 'reverb', Number(e.target.value) / 100)}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-indigo-500"
                              />
                              <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                                <span>جاف</span><span>متوسط</span><span>رواق</span>
                              </div>
                            </div>

                            {/* Sub Bass */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  💥 Sub Bass
                                </label>
                                <span className="font-mono text-[11px] text-orange-300 font-bold">
                                  {Math.round(fx.subBass * 100)}%
                                </span>
                              </div>
                              <input
                                type="range" min="0" max="130"
                                value={Math.round(fx.subBass * 100)}
                                onChange={e => updateCueFx(cue.value, 'subBass', Number(e.target.value) / 100)}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-orange-500"
                              />
                              <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                                <span>بدون</span><span>متوسط</span><span>قوي</span>
                              </div>
                            </div>

                            {/* Reset */}
                            {modified && (
                              <button
                                onClick={() => resetCueFx(cue.value)}
                                className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-orange-400 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                إعادة تعيين للافتراضي
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-sm font-bold text-gray-400 mb-4">روابط سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/Library" className="rounded-xl border border-gray-800 bg-black/30 p-4 text-center hover:border-indigo-500/40 transition-colors">
            <span className="text-2xl block mb-2">📚</span>
            <span className="text-xs font-bold text-gray-400">المكتبة</span>
          </a>
          <a href="/Operator" className="rounded-xl border border-gray-800 bg-black/30 p-4 text-center hover:border-indigo-500/40 transition-colors">
            <span className="text-2xl block mb-2">🎬</span>
            <span className="text-xs font-bold text-gray-400">غرفة التحكم</span>
          </a>
          <a href="/Integrations" className="rounded-xl border border-gray-800 bg-black/30 p-4 text-center hover:border-indigo-500/40 transition-colors">
            <span className="text-2xl block mb-2">🔗</span>
            <span className="text-xs font-bold text-gray-400">الربط الخارجي</span>
          </a>
          {can(systemRole, 'SECURITY_SETTINGS_EDIT') && (
            <a href="/Settings" className="rounded-xl border border-gray-800 bg-black/30 p-4 text-center hover:border-red-500/40 transition-colors">
              <span className="text-2xl block mb-2">🔒</span>
              <span className="text-xs font-bold text-gray-400">الحماية والإعدادات</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastControl;
