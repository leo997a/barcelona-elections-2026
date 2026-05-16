import React, { useState } from 'react';
import { Volume2, Play, Sliders, Radio, Music } from 'lucide-react';
import { playCue, setMasterVolume, getMasterVolume, PREVIEWABLE_CUES } from '../services/audioEngine';
import { licenseService } from '../services/licenseService';
import { toSystemRole, can, getRoleDisplayName, type SystemRole } from '../utils/permissions';

const BroadcastControl: React.FC = () => {
  // ── Role & Permissions ──
  const stored = licenseService.getStored();
  const systemRole: SystemRole = stored?.valid ? toSystemRole(stored.role) : 'VIEWER';
  const canEditAudio = can(systemRole, 'AUDIO_EDIT_OWN');

  // ── Audio State ──
  const [masterVol, setMasterVol] = useState(() => getMasterVolume());
  const [playingCue, setPlayingCue] = useState<string | null>(null);

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
            <span className="text-xs text-gray-500">
              (وضع المشاهدة — لا يمكن التعديل)
            </span>
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

        {/* Master Volume Slider */}
        <div className="mb-8 rounded-2xl border border-gray-800 bg-black/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              مستوى الصوت الرئيسي (Master Volume)
            </h3>
            <span className="font-mono text-lg font-black text-purple-300">{Math.round(masterVol * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            value={Math.round(masterVol * 100)}
            disabled={!canEditAudio}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setMasterVol(v);
              setMasterVolume(v);
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-purple-500 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>صامت</span>
            <span>50%</span>
            <span>100%</span>
            <span>150%</span>
          </div>
        </div>

        {/* Sound Preview Grid */}
        <div className="space-y-6">
          {(['broadcast', 'mercato', 'special'] as const).map(cat => {
            const catLabel = cat === 'broadcast' ? '🎙️ أصوات البث' : cat === 'mercato' ? '⚡ أصوات الميركاتو' : '🎬 أصوات خاصة';
            const catIcon = cat === 'broadcast' ? Radio : cat === 'mercato' ? Music : Play;
            const CatIcon = catIcon;
            const cues = PREVIEWABLE_CUES.filter(c => c.category === cat);
            return (
              <div key={cat}>
                <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <CatIcon className="w-4 h-4" />
                  {catLabel}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {cues.map(cue => (
                    <button
                      key={cue.value}
                      disabled={!canEditAudio}
                      onClick={async () => {
                        setPlayingCue(cue.value);
                        await playCue(cue.value, { volume: masterVol, forceSynth: true });
                        setTimeout(() => setPlayingCue(null), 1200);
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all disabled:opacity-30 ${
                        playingCue === cue.value
                          ? 'border-purple-500 bg-purple-500/20 text-purple-200 scale-[1.03]'
                          : 'border-gray-800 bg-black/30 text-gray-400 hover:border-purple-500/40 hover:text-gray-200'
                      }`}
                    >
                      <Play className={`w-3.5 h-3.5 flex-shrink-0 ${playingCue === cue.value ? 'text-purple-400' : ''}`} />
                      <span className="truncate">{cue.label}</span>
                    </button>
                  ))}
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
