/**
 * TemplateControlBar — Universal IN/OUT/Update/Reset/Audio control strip.
 *
 * Drop-in component used wherever an operator needs to control a single
 * overlay. Mirrors the unified template runtime (utils/templateRuntime).
 *
 * Behaviour:
 *  - Preview        → editor-only, no On Air push (returns to caller).
 *  - IN             → set_visible=true (plays ENTER cue via OverlayRenderer)
 *  - OUT            → set_visible=false (plays EXIT cue via OverlayRenderer)
 *  - Toggle Audio   → flips overlay.fields.soundEnabled
 *  - Reset          → set_visible=false (does not nuke fields)
 *  - Status Badge   → derived from overlay.isVisible
 *
 * The component does NOT call audioEngine directly. It only dispatches
 * action commands; the existing OverlayRenderer plays sounds when
 * isVisible flips.
 */
import React from 'react';
import { Eye, Volume2, VolumeX, RotateCcw, Play, Square, RefreshCw, Radio } from 'lucide-react';
import type { OverlayConfig } from '../types';
import { syncManager } from '../services/syncManager';
import {
  buildAction,
  recordDiagnostic,
  deriveStatus,
  type TemplateAction,
} from '../utils/templateRuntime';

interface Props {
  overlay: OverlayConfig;
  /** Optional preview callback. Caller decides what preview means. */
  onPreview?: () => void;
  /** Optional command overrides for hosts that need extra policy before IN/OUT. */
  onShow?: () => void;
  onHide?: () => void;
  onReset?: () => void;
  /** Allow a host policy action even while the overlay is already live. */
  allowShowWhenLive?: boolean;
  /** Compact mode: smaller buttons, fewer labels. */
  compact?: boolean;
  className?: string;
}

const TemplateControlBar: React.FC<Props> = ({ overlay, onPreview, onShow, onHide, onReset, allowShowWhenLive = false, compact = false, className }) => {
  const status = deriveStatus(overlay);

  // CRITICAL FIX (AUDIO-X4): The button MUST reflect the literal field value,
  // not a resolved profile fallback. Previously we used resolveTemplateAudio()
  // which returns enabled=true when the field is missing — making the icon
  // show "enabled" while the field was actually undefined. After the user
  // clicked Mute the field gained value=false, the icon flipped to muted,
  // and the user perceived this as "auto-mute". The fix: read the field
  // directly. Field default (true) is established at template creation by
  // withBroadcastControls, so this is always defined for new overlays.
  const soundEnabledField = overlay.fields.find(f => f.id === 'soundEnabled');
  const soundEnabled = soundEnabledField === undefined ? true : soundEnabledField.value !== false;
  const hasRefreshControls = overlay.fields.some(f =>
    f.id === 'manualRefreshNonce' ||
    f.id === 'liveRefreshEnabled' ||
    f.id === 'dataMode' ||
    f.id === 'bridgeApiUrl'
  );
  const liveRefreshEnabledField = overlay.fields.find(f => f.id === 'liveRefreshEnabled');
  const liveRefreshEnabled = liveRefreshEnabledField === undefined ? true : liveRefreshEnabledField.value !== false;

  const dispatch = (action: TemplateAction, payload?: { fieldId?: string; value?: unknown }) => {
    if (action === 'preview') {
      recordDiagnostic(overlay, 'preview');
      onPreview?.();
      return;
    }
    if (action === 'show' && onShow) {
      recordDiagnostic(overlay, 'show');
      onShow();
      return;
    }
    if (action === 'hide' && onHide) {
      recordDiagnostic(overlay, 'hide');
      onHide();
      return;
    }
    if (action === 'reset' && onReset) {
      recordDiagnostic(overlay, 'reset');
      onReset();
      return;
    }
    const cmd = buildAction(overlay, action, payload);
    if (!cmd) return;
    syncManager.sendCommand(cmd);
    recordDiagnostic(overlay, action);
  };

  const toggleAudio = () => {
    dispatch('update', { fieldId: 'soundEnabled', value: !soundEnabled });
  };

  const refreshNow = () => {
    dispatch('refresh', { value: Date.now() });
  };

  const toggleLiveRefresh = () => {
    dispatch('update', { fieldId: 'liveRefreshEnabled', value: !liveRefreshEnabled });
  };

  const isLive = status === 'live';
  const sizeBtn = compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';
  const sizeIcon = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div
      className={[
        'flex items-center gap-1.5 rounded-lg bg-slate-950/60 border border-slate-800 p-1.5',
        className || '',
      ].join(' ')}
      dir="rtl"
    >
      {/* Status Badge */}
      <span
        className={[
          'flex items-center gap-1 font-black uppercase tracking-wide rounded-md',
          isLive
            ? 'bg-red-600/90 text-white animate-pulse'
            : 'bg-slate-800 text-slate-400',
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
        ].join(' ')}
        title={`status: ${status}`}
      >
        <span
          className={[
            'rounded-full',
            isLive ? 'bg-white' : 'bg-slate-500',
            compact ? 'w-1 h-1' : 'w-1.5 h-1.5',
          ].join(' ')}
        />
        {isLive ? 'LIVE' : 'OFF'}
      </span>

      {/* Preview */}
      {onPreview && (
        <button
          onClick={() => dispatch('preview')}
          className={`bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-md flex items-center gap-1 ${sizeBtn}`}
          title="معاينة فقط — لا يُرسل للبث"
        >
          <Eye className={sizeIcon} />
          {!compact && <span>معاينة</span>}
        </button>
      )}

      {/* IN */}
      <button
        onClick={() => dispatch('show')}
        disabled={isLive && !allowShowWhenLive}
        className={[
          'font-bold rounded-md flex items-center gap-1 transition-colors',
          isLive && !allowShowWhenLive
            ? 'bg-emerald-900/30 text-emerald-700/50 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white',
          sizeBtn,
        ].join(' ')}
        title="إظهار على البث (ENTER cue)"
      >
        <Play className={sizeIcon} />
        {!compact && <span>IN</span>}
      </button>

      {/* OUT */}
      <button
        onClick={() => dispatch('hide')}
        disabled={!isLive}
        className={[
          'font-bold rounded-md flex items-center gap-1 transition-colors',
          !isLive
            ? 'bg-red-900/30 text-red-700/50 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-500 text-white',
          sizeBtn,
        ].join(' ')}
        title="إخفاء من البث (EXIT cue)"
      >
        <Square className={`${sizeIcon} fill-current`} />
        {!compact && <span>OUT</span>}
      </button>

      {/* Live data controls */}
      {hasRefreshControls && (
        <>
          <button
            onClick={refreshNow}
            className={`bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md flex items-center gap-1 ${sizeBtn}`}
            title="تحديث بيانات القالب الآن من الجسر / FotMob"
          >
            <RefreshCw className={sizeIcon} />
            {!compact && <span>تحديث</span>}
          </button>
          <button
            onClick={toggleLiveRefresh}
            className={[
              'font-bold rounded-md flex items-center gap-1',
              liveRefreshEnabled
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400',
              sizeBtn,
            ].join(' ')}
            title={liveRefreshEnabled ? 'التحديث المباشر التلقائي مفعّل' : 'التحديث المباشر متوقف: استخدم زر تحديث'}
          >
            <Radio className={sizeIcon} />
            {!compact && <span>{liveRefreshEnabled ? 'مباشر' : 'يدوي'}</span>}
          </button>
        </>
      )}

      {/* Audio toggle */}
      <button
        onClick={toggleAudio}
        className={[
          'font-bold rounded-md flex items-center gap-1',
          soundEnabled
            ? 'bg-cyan-900/40 hover:bg-cyan-800 text-cyan-200'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400',
          sizeBtn,
        ].join(' ')}
        title={soundEnabled ? 'الصوت مُفعَّل' : 'الصوت متوقف'}
      >
        {soundEnabled ? <Volume2 className={sizeIcon} /> : <VolumeX className={sizeIcon} />}
        {!compact && <span>{soundEnabled ? 'صوت' : 'صامت'}</span>}
      </button>

      {/* Reset */}
      <button
        onClick={() => dispatch('reset')}
        className={`bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md flex items-center gap-1 ${sizeBtn}`}
        title="إعادة تعيين (إخفاء)"
      >
        <RotateCcw className={sizeIcon} />
        {!compact && <span>Reset</span>}
      </button>
    </div>
  );
};

export default TemplateControlBar;
