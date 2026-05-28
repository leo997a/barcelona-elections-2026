/**
 * Universal Audio Settings Panel.
 *
 * Single component every template can reuse to control:
 *   A. Master  — soundEnabled, soundVolume
 *   B. SFX     — sfxEnabled, soundInStyle, soundOutStyle
 *   C. Voice   — voiceEnabled, voiceLibraryId, voiceDirectUrl,
 *                voiceTrigger, voiceVolume, duckSfx
 *   D. Advanced — Reset audio settings, show resolved config
 *
 * Progressive disclosure: voice options only appear when voiceEnabled=true.
 * SFX style options only appear when sfxEnabled=true.
 *
 * Critical guarantees:
 *   - This component never auto-mutates voiceEnabled or sfxEnabled.
 *   - Every change goes through props.onUpdate(fieldId, value) so the
 *     parent (Editor) controls persistence and sync.
 *   - Voice library options come from utils/voiceLibrary which only
 *     references real files in public/audio/voice-packs.
 */
import React, { useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Play, RotateCcw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { OverlayConfig } from '../types';
import { listVoicesForTemplate, resolveVoiceUrl, NO_VOICE_OPTION } from '../utils/voiceLibrary';
import { listAudioScenes, getAudioScene, sceneToFieldUpdates, sceneToFieldUpdatesWithVoice } from '../utils/templateAudioScenes';
import { playCue } from '../services/audioEngine';

/**
 * Phase X11/X12 — SFX style presets surfaced as labeled buttons in the
 * SFX section. Each preset writes a fixed combination of soundInStyle +
 * soundOutStyle + audioUpdateCue + sfxEnabled + (optionally) audioSceneId.
 *
 * Goal: users pick a vibe by name instead of fishing through 60+ raw cue
 * keys. The 5 presets cover the actual matchday/mercato audio needs:
 *
 *   1. silent       — SFX OFF entirely (the safest default)
 *   2. ultra_subtle — barely audible polite cues (LOWER_THIRD_WIPE / SOFT_FADE / SOFT_CHAT_TICK)
 *   3. call         — gentle agent-call vibe (SOFT_CALL_RING_LIGHT / SOFT_CALL_END / SOFT_CHAT_INCOMING)
 *   4. chat         — chat tick vibe (SOFT_NOTIFICATION_PULSE / SOFT_FADE / SOFT_CHAT_TICK)
 *   5. breaking     — clean breaking news (BREAKING_RISER / SOFT_FADE / DATA_TICK)
 *
 * Using existing cue keys only — no new audio files, no new cue synth.
 */
type SfxStylePreset = {
  id: 'silent' | 'ultra_subtle' | 'call' | 'chat' | 'breaking';
  labelAr: string;
  descriptionAr: string;
  sfxEnabled: boolean;
  soundInStyle: string;
  soundOutStyle: string;
  audioUpdateCue: string;
};

const SFX_STYLE_PRESETS: ReadonlyArray<SfxStylePreset> = [
  {
    id: 'silent',
    labelAr: 'بدون مؤثرات',
    descriptionAr: 'يطفئ كل المؤثرات. الصوت الحقيقي يدوي فقط.',
    sfxEnabled: false,
    soundInStyle: 'HARD_CUT',
    soundOutStyle: 'HARD_CUT',
    audioUpdateCue: 'HARD_CUT',
  },
  {
    id: 'ultra_subtle',
    labelAr: 'ناعم جدًا',
    descriptionAr: 'دخول ناعم + خروج fade + tick خفيف للتحديث.',
    sfxEnabled: true,
    soundInStyle: 'LOWER_THIRD_WIPE',
    soundOutStyle: 'SOFT_FADE',
    audioUpdateCue: 'SOFT_CHAT_TICK',
  },
  {
    id: 'call',
    labelAr: 'مكالمة خفيفة',
    descriptionAr: 'نغمة اتصال خفيفة + إنهاء + رسالة واردة.',
    sfxEnabled: true,
    soundInStyle: 'SOFT_CALL_RING_LIGHT',
    soundOutStyle: 'SOFT_CALL_END',
    audioUpdateCue: 'SOFT_CHAT_INCOMING',
  },
  {
    id: 'chat',
    labelAr: 'دردشة خفيفة',
    descriptionAr: 'إشعار خفيف + fade خروج + tick رسالة.',
    sfxEnabled: true,
    soundInStyle: 'SOFT_NOTIFICATION_PULSE',
    soundOutStyle: 'SOFT_FADE',
    audioUpdateCue: 'SOFT_CHAT_TICK',
  },
  {
    id: 'breaking',
    labelAr: 'خبر عاجل نظيف',
    descriptionAr: 'افتتاحية خبر بدون مبالغة في الـ bass.',
    sfxEnabled: true,
    soundInStyle: 'BREAKING_RISER',
    soundOutStyle: 'SOFT_FADE',
    audioUpdateCue: 'DATA_TICK',
  },
];

interface Props {
  overlay: OverlayConfig;
  onUpdate: (fieldId: string, value: string | number | boolean) => void;
  /** Optional batched update — caller passes if multiple fields can be applied in one tick. */
  onUpdateMany?: (updates: Record<string, string | number | boolean>) => void;
  /** Compact mode for tight side panels. */
  compact?: boolean;
}

const fieldVal = <T,>(overlay: OverlayConfig, id: string, fallback: T): T => {
  const f = overlay.fields.find(ff => ff.id === id);
  if (!f || f.value === undefined || f.value === null) return fallback;
  return f.value as unknown as T;
};

const AudioSettingsPanel: React.FC<Props> = ({ overlay, onUpdate, onUpdateMany, compact = false }) => {
  const soundEnabled = fieldVal<boolean>(overlay, 'soundEnabled', true);
  const soundVolume = fieldVal<number>(overlay, 'soundVolume', 0.7);
  const sfxEnabled = fieldVal<boolean>(overlay, 'sfxEnabled', true);
  const soundInStyle = fieldVal<string>(overlay, 'soundInStyle', 'DEFAULT');
  const soundOutStyle = fieldVal<string>(overlay, 'soundOutStyle', 'DEFAULT');
  const voiceEnabled = fieldVal<boolean>(overlay, 'voiceEnabled', false);
  const voiceLibraryId = fieldVal<string>(overlay, 'voiceLibraryId', 'none');
  const voiceDirectUrl = fieldVal<string>(overlay, 'voiceDirectUrl', '');
  const voiceTrigger = fieldVal<string>(overlay, 'voiceTrigger', 'manual_only');
  const voiceVolume = fieldVal<number>(overlay, 'voiceVolume', 0.9);
  const duckSfx = fieldVal<boolean>(overlay, 'duckSfx', true);
  const audioSceneId = fieldVal<string>(overlay, 'audioSceneId', '');

  const [showResolved, setShowResolved] = useState(false);
  const [showScenePicker, setShowScenePicker] = useState(false);

  const voiceList = listVoicesForTemplate(String(overlay.type));
  const scenes = listAudioScenes();

  const applyUpdates = (updates: Record<string, string | number | boolean>) => {
    if (onUpdateMany) {
      onUpdateMany(updates);
    } else {
      Object.entries(updates).forEach(([id, val]) => onUpdate(id, val));
    }
  };

  const applyScene = (sceneId: string, withVoice: boolean) => {
    const scene = getAudioScene(sceneId);
    if (!scene) return;
    const updates = withVoice
      ? sceneToFieldUpdatesWithVoice(scene)
      : sceneToFieldUpdates(scene);
    // Persist the chosen scene id so the UI reflects it on next render.
    applyUpdates({ ...updates, audioSceneId: scene.id });
  };

  const previewVoice = async () => {
    if (!soundEnabled) return;
    const url = resolveVoiceUrl(voiceLibraryId, voiceDirectUrl);
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, voiceVolume));
      await audio.play();
    } catch { /* silent */ }
  };

  // Phase X11/X12 — apply an SFX style preset. Writes 4 fields atomically.
  // Does NOT touch master soundEnabled or voice settings.
  const applySfxPreset = (preset: SfxStylePreset) => {
    applyUpdates({
      sfxEnabled: preset.sfxEnabled,
      soundInStyle: preset.soundInStyle,
      soundOutStyle: preset.soundOutStyle,
      audioUpdateCue: preset.audioUpdateCue,
    });
  };

  // Detect which SFX preset (if any) currently matches the overlay state.
  // Used to highlight the active preset button.
  const audioUpdateCue = fieldVal<string>(overlay, 'audioUpdateCue', '');
  const activeSfxPresetId: SfxStylePreset['id'] | null = (() => {
    if (!sfxEnabled) return 'silent';
    for (const p of SFX_STYLE_PRESETS) {
      if (p.id === 'silent') continue;
      if (
        p.sfxEnabled === sfxEnabled &&
        p.soundInStyle === soundInStyle &&
        p.soundOutStyle === soundOutStyle &&
        p.audioUpdateCue === audioUpdateCue
      ) return p.id;
    }
    return null;
  })();

  const previewIn = () => {
    if (!soundEnabled || !sfxEnabled) return;
    const cue = soundInStyle === 'DEFAULT' ? 'LOWER_THIRD_WIPE' : soundInStyle;
    void playCue(cue, { volume: Math.max(0, Math.min(1, soundVolume)) });
  };

  const previewOut = () => {
    if (!soundEnabled || !sfxEnabled) return;
    const cue = soundOutStyle === 'DEFAULT' ? 'SOFT_FADE' : soundOutStyle;
    void playCue(cue, { volume: Math.max(0, Math.min(1, soundVolume)) });
  };

  // Phase-A-Hotfix-1: Test UPDATE — exercises the same cue path used by
  // runtime TRANSITION events. Reads audioUpdateCue first (set by scene
  // apply), falls back to the resolved profile updateCue.
  const previewUpdate = () => {
    if (!soundEnabled || !sfxEnabled) return;
    // Mirror OverlayRenderer.resolveSynthCue('TRANSITION') exactly.
    const cue = audioUpdateCue || 'DATA_TICK';
    void playCue(cue, { volume: Math.max(0, Math.min(1, soundVolume)) });
  };

  const resetAudio = () => {
    onUpdate('soundEnabled', true);
    onUpdate('soundVolume', 0.55);
    onUpdate('sfxEnabled', true);
    onUpdate('soundInStyle', 'DEFAULT');
    onUpdate('soundOutStyle', 'DEFAULT');
    onUpdate('voiceEnabled', false);
    onUpdate('voiceLibraryId', 'none');
    onUpdate('voiceDirectUrl', '');
    onUpdate('voiceTrigger', 'manual_only');
    onUpdate('voiceVolume', 0.9);
    onUpdate('duckSfx', true);
    onUpdate('audioSceneId', '');
  };

  const sectionPad = compact ? 'p-2' : 'p-3';
  const labelSize = compact ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className="space-y-3" dir="rtl">
      {/* ─── A. Master ─── */}
      <div className={`rounded-lg border border-cyan-900/40 bg-slate-950/40 ${sectionPad} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className={`font-black uppercase tracking-wide text-cyan-300 ${labelSize}`}>الصوت العام</span>
          <button
            onClick={() => onUpdate('soundEnabled', !soundEnabled)}
            className={[
              'flex items-center gap-1.5 rounded-md font-bold',
              soundEnabled
                ? 'bg-emerald-900/40 text-emerald-200 hover:bg-emerald-800'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
            ].join(' ')}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {soundEnabled ? 'مُفعَّل' : 'صامت'}
          </button>
        </div>
        <div>
          <label className={`block ${labelSize} text-slate-400 mb-1`}>مستوى الصوت العام: {(soundVolume * 100).toFixed(0)}%</label>
          <input
            type="range"
            min={0} max={1.5} step={0.05}
            value={soundVolume}
            disabled={!soundEnabled}
            onChange={(e) => onUpdate('soundVolume', Number(e.target.value))}
            className="w-full disabled:opacity-40"
          />
        </div>
      </div>

      {/* ─── Scene picker (AUDIO-PACKS-X5) ─── */}
      <div className={`rounded-lg border border-amber-900/40 bg-slate-950/40 ${sectionPad} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className={`font-black uppercase tracking-wide text-amber-300 ${labelSize} flex items-center gap-1.5`}>
            <Sparkles className="w-3 h-3" />
            مشهد صوتي
          </span>
          <button
            onClick={() => setShowScenePicker(s => !s)}
            className={`text-slate-400 hover:text-slate-200 ${labelSize}`}
          >
            {showScenePicker ? 'إخفاء' : 'إظهار'}
          </button>
        </div>
        {audioSceneId && (
          <div className="text-[10px] text-amber-200">
            المشهد الحالي: <span className="font-bold">{getAudioScene(audioSceneId)?.labelAr || audioSceneId}</span>
          </div>
        )}
        {showScenePicker && (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {scenes.map(s => (
              <div
                key={s.id}
                className={[
                  'rounded p-2 border',
                  audioSceneId === s.id
                    ? 'border-amber-700/50 bg-amber-900/20'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className={`text-[11px] font-bold text-slate-100 ${audioSceneId === s.id ? 'text-amber-200' : ''}`}>
                      {s.labelAr}
                    </div>
                    <div className="text-[9px] text-slate-500 leading-relaxed mt-0.5">{s.descriptionAr}</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-1.5">
                  <button
                    onClick={() => {
                      // Phase A2 — Test Play: fire the scene's enter cue
                      // immediately so the user hears the scene before
                      // committing to apply it. Bypasses the editor's
                      // isEditor=true silence guard by calling playCue
                      // directly with the scene's volume baseline.
                      const vol = Math.max(0, Math.min(1, soundVolume * (s.volumeMultiplier || 1)));
                      void playCue(s.enterCue, { volume: vol });
                    }}
                    className="bg-emerald-800/70 hover:bg-emerald-700 text-emerald-100 text-[9px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1"
                    title={`تجربة فورية: ${s.enterCue}`}
                    aria-label={`Test play scene ${s.id}`}
                  >
                    <Play className="w-2.5 h-2.5" />
                    اختبار
                  </button>
                  <button
                    onClick={() => applyScene(s.id, false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-bold py-1 rounded"
                    title="يطبّق المؤثرات فقط — لا يفعّل الصوت الحقيقي"
                  >
                    تطبيق
                  </button>
                  {s.voiceRecommended && (
                    <button
                      onClick={() => applyScene(s.id, true)}
                      className="flex-1 bg-purple-800 hover:bg-purple-700 text-purple-100 text-[9px] font-bold py-1 rounded flex items-center justify-center gap-1"
                      title="يطبّق المشهد ويفعّل الصوت الحقيقي"
                    >
                      <Mic className="w-2.5 h-2.5" />
                      + Voice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── B. SFX ─── */}
      <div className={`rounded-lg border border-slate-800 bg-slate-950/30 ${sectionPad} space-y-2 ${!soundEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <span className={`font-black uppercase tracking-wide text-slate-300 ${labelSize}`}>المؤثرات (SFX)</span>
          <button
            onClick={() => onUpdate('sfxEnabled', !sfxEnabled)}
            disabled={!soundEnabled}
            className={[
              'flex items-center gap-1.5 rounded-md font-bold',
              sfxEnabled
                ? 'bg-blue-900/40 text-blue-200 hover:bg-blue-800'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
            ].join(' ')}
          >
            {sfxEnabled ? 'SFX ON' : 'SFX OFF'}
          </button>
        </div>

        {sfxEnabled && soundEnabled && (
          <div className="space-y-2">
            {/* Phase X11 — SFX style presets (named vibes instead of raw cue keys) */}
            <div>
              <div className={`${labelSize} text-slate-400 mb-1`}>نمط المؤثرات</div>
              <div className="grid grid-cols-2 gap-1">
                {SFX_STYLE_PRESETS.map(p => {
                  const active = activeSfxPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applySfxPreset(p)}
                      title={p.descriptionAr}
                      className={[
                        'rounded text-[10px] font-bold py-1.5 px-2 transition-colors',
                        active
                          ? 'bg-blue-700 text-white border border-blue-500'
                          : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500',
                      ].join(' ')}
                    >
                      {p.labelAr}
                    </button>
                  );
                })}
              </div>
              {activeSfxPresetId === null && sfxEnabled && (
                <div className="text-[9px] text-slate-500 mt-1">
                  مخصص: in={soundInStyle}, out={soundOutStyle}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={previewIn}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1"
              >
                <Play className="w-2.5 h-2.5" />
                IN
              </button>
              <button
                onClick={previewOut}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1"
              >
                <Play className="w-2.5 h-2.5" />
                OUT
              </button>
              <button
                onClick={previewUpdate}
                disabled={!audioUpdateCue}
                title={audioUpdateCue ? `تجربة صوت التحديث: ${audioUpdateCue}` : 'لا يوجد updateCue معرَّف — طبّق مشهدًا أولًا'}
                className="bg-amber-900/40 hover:bg-amber-800/60 disabled:opacity-30 disabled:cursor-not-allowed text-amber-200 text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1"
              >
                <Play className="w-2.5 h-2.5" />
                UPDATE
              </button>
            </div>
            <div className={`text-[9px] text-slate-500 leading-relaxed`}>
              IN/OUT يشتغلان تلقائيًا. UPDATE يُسمَع فقط عند تغيّر بيانات حساسة على البث (مثل chatLines أو probability).
              {audioUpdateCue && (
                <span className="block mt-1 text-amber-300/80 font-mono">cue حالي: {audioUpdateCue}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── C. Voice ─── */}
      <div className={`rounded-lg border border-purple-900/40 bg-slate-950/30 ${sectionPad} space-y-2 ${!soundEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <span className={`font-black uppercase tracking-wide text-purple-300 ${labelSize}`}>الصوت الحقيقي (Voice)</span>
          <button
            onClick={() => onUpdate('voiceEnabled', !voiceEnabled)}
            disabled={!soundEnabled}
            className={[
              'flex items-center gap-1.5 rounded-md font-bold',
              voiceEnabled
                ? 'bg-purple-900/40 text-purple-200 hover:bg-purple-800'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
            ].join(' ')}
          >
            {voiceEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            {voiceEnabled ? 'مُفعَّل' : 'متوقف'}
          </button>
        </div>

        {voiceEnabled && soundEnabled && (
          <div className="space-y-2">
            <div>
              <label className={`block ${labelSize} text-slate-400 mb-1`}>صوت من المكتبة</label>
              <select
                value={voiceLibraryId}
                onChange={(e) => onUpdate('voiceLibraryId', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5"
              >
                <option value={NO_VOICE_OPTION.id}>{NO_VOICE_OPTION.labelAr}</option>
                {voiceList.map(v => (
                  <option key={v.id} value={v.id}>{v.labelAr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block ${labelSize} text-slate-400 mb-1`}>أو رابط مباشر (mp3/wav)</label>
              <input
                type="text"
                value={voiceDirectUrl}
                onChange={(e) => onUpdate('voiceDirectUrl', e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5"
                dir="ltr"
              />
              {voiceDirectUrl && (
                <div className="text-[9px] text-amber-400 mt-1">الرابط المباشر له الأولوية على المكتبة</div>
              )}
            </div>

            <div>
              <label className={`block ${labelSize} text-slate-400 mb-1`}>متى يشتغل الصوت</label>
              <select
                value={voiceTrigger}
                onChange={(e) => onUpdate('voiceTrigger', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5"
              >
                <option value="manual_only">يدوي فقط</option>
                <option value="on_enter">عند الدخول IN</option>
                <option value="on_update">عند التحديث</option>
                <option value="on_alert">عند تنبيه</option>
              </select>
              {voiceTrigger === 'manual_only' && (
                <div className="text-[9px] text-slate-500 mt-1">لن يُشغَّل تلقائيًا — استخدم زر المعاينة</div>
              )}
            </div>

            <div>
              <label className={`block ${labelSize} text-slate-400 mb-1`}>مستوى الصوت الحقيقي: {(voiceVolume * 100).toFixed(0)}%</label>
              <input
                type="range"
                min={0} max={1.5} step={0.05}
                value={voiceVolume}
                onChange={(e) => onUpdate('voiceVolume', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <label className={`flex items-center gap-2 ${labelSize} text-slate-400 cursor-pointer`}>
              <input
                type="checkbox"
                checked={duckSfx}
                onChange={(e) => onUpdate('duckSfx', e.target.checked)}
              />
              خفض المؤثرات عند تشغيل الصوت
            </label>

            <button
              onClick={previewVoice}
              disabled={!resolveVoiceUrl(voiceLibraryId, voiceDirectUrl)}
              className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              معاينة الصوت
            </button>
          </div>
        )}
      </div>

      {/* ─── D. Advanced ─── */}
      <div className={`rounded-lg border border-slate-800 bg-slate-950/20 ${sectionPad}`}>
        <button
          onClick={() => setShowResolved(s => !s)}
          className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200"
        >
          <span className={`font-bold ${labelSize}`}>متقدم</span>
          {showResolved ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showResolved && (
          <div className="mt-2 space-y-2">
            <button
              onClick={resetAudio}
              className="w-full bg-amber-900/30 hover:bg-amber-800/40 text-amber-300 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة تعيين إعدادات الصوت
            </button>
            <pre className="text-[9px] text-slate-500 bg-slate-950 p-2 rounded overflow-x-auto leading-tight">
{`soundEnabled:    ${soundEnabled}
soundVolume:     ${soundVolume}
sfxEnabled:      ${sfxEnabled}
soundInStyle:    ${soundInStyle}
soundOutStyle:   ${soundOutStyle}
voiceEnabled:    ${voiceEnabled}
voiceLibraryId:  ${voiceLibraryId}
voiceDirectUrl:  ${voiceDirectUrl || '(فارغ)'}
voiceTrigger:    ${voiceTrigger}
voiceVolume:     ${voiceVolume}
duckSfx:         ${duckSfx}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioSettingsPanel;
