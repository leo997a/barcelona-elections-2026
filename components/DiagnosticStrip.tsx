/**
 * DiagnosticStrip — thin status bar shown beneath the Editor preview.
 *
 * Phase A6: surfaces the runtime diagnostic state that has been recorded
 * by utils/templateRuntime.ts since Phase X1 but never had a UI to view.
 *
 * Renders for the active overlay only. Refreshes lazily when overlay
 * fields change. No heavy state, no subscriptions — purely derived.
 */
import React, { useMemo } from 'react';
import { Activity, Volume2, VolumeX, Sparkles, Wifi, WifiOff } from 'lucide-react';
import type { OverlayConfig } from '../types';
import { getDiagnostic, deriveStatus } from '../utils/templateRuntime';
import { getAudioScene } from '../utils/templateAudioScenes';

interface Props {
  overlay: OverlayConfig;
  /** Optional Stream Deck status hint. */
  streamDeckConnected?: boolean | null;
}

const fieldVal = <T,>(overlay: OverlayConfig, id: string, fallback: T): T => {
  const f = overlay.fields.find(ff => ff.id === id);
  if (!f || f.value === undefined || f.value === null) return fallback;
  return f.value as unknown as T;
};

const formatRelative = (ts: number | null): string => {
  if (!ts) return '—';
  const delta = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (delta < 5) return 'الآن';
  if (delta < 60) return `${delta}ث`;
  if (delta < 3600) return `${Math.floor(delta / 60)}د`;
  return `${Math.floor(delta / 3600)}س`;
};

const DiagnosticStrip: React.FC<Props> = ({ overlay, streamDeckConnected = null }) => {
  const status = deriveStatus(overlay);
  const diag = getDiagnostic(overlay.id);

  const audioInfo = useMemo(() => {
    const enabled = fieldVal<boolean>(overlay, 'soundEnabled', true);
    const sfxOn = fieldVal<boolean>(overlay, 'sfxEnabled', true);
    const voiceOn = fieldVal<boolean>(overlay, 'voiceEnabled', false);
    const sceneId = fieldVal<string>(overlay, 'audioSceneId', '');
    return { enabled, sfxOn, voiceOn, sceneId };
  }, [overlay.fields]);

  const scene = audioInfo.sceneId ? getAudioScene(audioInfo.sceneId) : null;
  const isLive = status === 'live';

  return (
    <div
      dir="rtl"
      className="flex items-center gap-3 px-4 py-1.5 text-[10px] font-mono bg-black/40 border-t border-white/5 backdrop-blur-sm"
    >
      {/* On-air status */}
      <span className="flex items-center gap-1.5">
        <span className={[
          'w-1.5 h-1.5 rounded-full',
          isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-600',
        ].join(' ')} />
        <span className={isLive ? 'text-red-300 font-bold' : 'text-slate-400'}>
          {isLive ? 'LIVE' : 'OFF'}
        </span>
      </span>

      <span className="text-slate-700">·</span>

      {/* Last action */}
      <span className="flex items-center gap-1 text-slate-400">
        <Activity className="w-3 h-3" />
        <span>{diag?.lastAction || '—'}</span>
        <span className="text-slate-600">({formatRelative(diag?.lastActionAt ?? null)})</span>
      </span>

      <span className="text-slate-700">·</span>

      {/* Audio status */}
      <span className="flex items-center gap-1">
        {audioInfo.enabled
          ? <Volume2 className="w-3 h-3 text-emerald-400" />
          : <VolumeX className="w-3 h-3 text-slate-500" />}
        <span className={audioInfo.enabled ? 'text-emerald-300' : 'text-slate-500'}>
          {audioInfo.enabled ? 'ON' : 'OFF'}
        </span>
        {audioInfo.enabled && (
          <span className="text-slate-600">
            (sfx={audioInfo.sfxOn ? '✓' : '✗'} voice={audioInfo.voiceOn ? '✓' : '✗'})
          </span>
        )}
      </span>

      <span className="text-slate-700">·</span>

      {/* Audio scene */}
      <span className="flex items-center gap-1 text-amber-300/80">
        <Sparkles className="w-3 h-3" />
        <span>{scene ? scene.labelAr : 'بدون مشهد'}</span>
      </span>

      {/* Optional Stream Deck status (right-most) */}
      {streamDeckConnected !== null && (
        <>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1 ml-auto">
            {streamDeckConnected
              ? <Wifi className="w-3 h-3 text-emerald-400" />
              : <WifiOff className="w-3 h-3 text-slate-500" />}
            <span className={streamDeckConnected ? 'text-emerald-300' : 'text-slate-500'}>
              SD {streamDeckConnected ? 'متصل' : 'غير متصل'}
            </span>
          </span>
        </>
      )}

      {/* Last error (right-most when present) */}
      {diag?.lastError && (
        <span className="ml-auto text-red-400">⚠ {diag.lastError}</span>
      )}
    </div>
  );
};

export default DiagnosticStrip;
