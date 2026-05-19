/**
 * MercatoInnovativeRenderers.tsx
 *
 *  Five rare, "outside-the-box" mercato templates exported as separate
 *  renderers but sharing common helpers (themes, animations, fonts).
 *
 *   1. MercatoAgentCallRenderer
 *      Live agent phone-call simulator: chat bubbles between the journalist
 *      and the agent + an animated audio waveform. Brand new way to "report"
 *      a deal as if it's happening live in front of the viewer.
 *
 *   2. MercatoDealTimelineRenderer
 *      Horizontal timeline of a deal: First contact → Verbal agreement →
 *      Medical → Signature, each with date and progress.
 *
 *   3. MercatoBudgetTrackerRenderer
 *      Club budget tracker — incoming vs outgoing deals as ledger lines
 *      with running balance, percent of budget remaining, and a sparkline.
 *
 *   4. MercatoDeadlineDayRenderer
 *      Deadline day countdown clock + live deal feed cards.
 *
 *   5. MercatoXRayRenderer
 *      Player X-Ray — radar chart + 6 attribute bars + heat zone diagram.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Phone, MessageCircle, Mic, Calendar, Clock, ArrowUpDown,
  TrendingUp, TrendingDown, Activity, Target, Zap, Shield,
  AlertCircle, CheckCircle2, Hourglass, ScanLine, Radar,
} from 'lucide-react';
import { RendererProps } from './SharedComponents';
import { playMercatoStory, stopMercatoStory, type MercatoStorySession } from '../../services/mercatoAudioEngine';

/**
 * Shared hook: fires MercatoAudioEngine when the overlay becomes visible.
 * Stops cleanly on unmount or when visibility changes. Skips in editor mode.
 */
const useMercatoAudio = (
  getField: (id: string) => any,
  isVisible: boolean,
  isEditor: boolean | undefined,
) => {
  const sessionRef = useRef<MercatoStorySession | null>(null);

  useEffect(() => {
    // Don't play audio in the editor preview
    if (isEditor) return;
    if (!isVisible) {
      // Template hidden — fire outro and stop
      if (sessionRef.current) {
        sessionRef.current.outro();
        sessionRef.current.stop();
        sessionRef.current = null;
      }
      return;
    }

    // Template just became visible — start the story
    const profileId = String(getField('audioProfile') || 'fabrizioBreaking');
    const voicePackId = String(getField('voicePackId') || 'none');
    const customVoiceUrl = String(getField('customVoiceUrl') || '');
    const signaturePhrase = String(getField('signaturePhrase') || '');
    const intensity = Number(getField('audioIntensity') ?? 1.0);
    const enableVoice = getField('enableVoice') !== false;
    const enableSfx = getField('enableSfx') !== false;

    // Stop any previous session first (prevents overlap)
    stopMercatoStory();

    sessionRef.current = playMercatoStory({
      profileId,
      voicePackId: voicePackId !== 'none' ? voicePackId : undefined,
      customVoiceUrl: customVoiceUrl || undefined,
      customText: signaturePhrase || undefined,
      intensity,
      enableVoice,
      enableSfx,
    });

    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }
    };
  }, [isVisible, isEditor]);

  return sessionRef;
};

// ─── Shared theme palette ───────────────────────────────────────────────────
const SHARED_THEMES: Record<string, { bg: string; card: string; border: string; accent: string; text: string; secondary: string }> = {
  CLEAN_BROADCAST: {
    bg: 'linear-gradient(180deg, #0b1117 0%, #131820 100%)',
    card: 'rgba(20,26,36,0.92)',
    border: 'rgba(255,255,255,0.1)',
    accent: '#3b82f6',
    text: '#ffffff',
    secondary: 'rgba(255,255,255,0.6)',
  },
  TACTICAL_DARK: {
    bg: 'linear-gradient(180deg, #050608 0%, #0a0d14 100%)',
    card: 'rgba(15,18,28,0.94)',
    border: 'rgba(255,75,62,0.25)',
    accent: '#ff4b3e',
    text: '#e8eef4',
    secondary: 'rgba(232,238,244,0.55)',
  },
  LUXE_GOLD: {
    bg: 'linear-gradient(180deg, #0a0805 0%, #14100a 100%)',
    card: 'rgba(20,16,8,0.94)',
    border: 'rgba(237,177,17,0.32)',
    accent: '#edb111',
    text: '#fff9e6',
    secondary: 'rgba(255,235,180,0.6)',
  },
  EMERALD_FIELD: {
    bg: 'linear-gradient(180deg, #001a0e 0%, #00261a 100%)',
    card: 'rgba(2,18,12,0.94)',
    border: 'rgba(16,185,129,0.28)',
    accent: '#10b981',
    text: '#ecfdf5',
    secondary: 'rgba(180,255,220,0.6)',
  },
  HOLOGRAM_PURPLE: {
    bg: 'linear-gradient(180deg, #08001a 0%, #14002e 100%)',
    card: 'rgba(12,2,28,0.94)',
    border: 'rgba(216,180,254,0.32)',
    accent: '#a855f7',
    text: '#f5e8ff',
    secondary: 'rgba(216,180,254,0.6)',
  },
};

const getTheme = (id: string) => SHARED_THEMES[id] || SHARED_THEMES.CLEAN_BROADCAST;
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

const SHARED_FONTS = (
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=JetBrains+Mono:wght@500;700&family=Tajawal:wght@500;700;800;900&display=swap" rel="stylesheet" />
);

const SHARED_KEYFRAMES = `
  @keyframes mercScan { from { transform: translateX(-110%); } to { transform: translateX(110%); } }
  @keyframes mercPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes mercFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes mercSlideRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes mercWaveBar { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
  @keyframes mercTypingDot { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
  @keyframes mercBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  @keyframes mercProgress { from { width: 0; } to { width: var(--progress); } }
  @keyframes mercRadarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes mercCountUp { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
`;

// ════════════════════════════════════════════════════════════════════════════
//  1. MERCATO_AGENT_CALL — Live agent phone-call simulator
// ════════════════════════════════════════════════════════════════════════════
type ChatLine = { side: 'agent' | 'reporter'; text: string };

const parseChatLines = (raw: unknown): ChatLine[] => {
  const txt = String(raw || '').trim();
  if (!txt) return [];
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        side: (item?.side === 'reporter' ? 'reporter' : 'agent') as 'agent' | 'reporter',
        text: String(item?.text || ''),
      })).filter(l => l.text);
    }
  } catch { /* fall through */ }
  // Plain text — alternating lines starting with reporter
  return txt.split(/\n+/).map((line, i) => ({
    side: (i % 2 === 0 ? 'reporter' : 'agent') as 'agent' | 'reporter',
    text: line.trim(),
  })).filter(l => l.text);
};

export const MercatoAgentCallRenderer: React.FC<RendererProps> = ({ config, getField, containerStyle, contentWrapperStyle, isEditor }) => {
  useMercatoAudio(getField, config.isVisible, isEditor);
  const themeId = String(getField('visualTheme') || 'TACTICAL_DARK');
  const theme = getTheme(themeId);
  const callerName = String(getField('callerName') || 'AGENT — JORGE MENDES');
  const callerRole = String(getField('callerRole') || 'GESTIFUTE');
  const reporterName = String(getField('reporterName') || 'REO MERCATO DESK');
  const callDuration = String(getField('callDuration') || '03:42');
  const dealHeadline = String(getField('dealHeadline') || 'Negotiating €58M deal — final stage');
  const lines = useMemo(() => parseChatLines(getField('chatLines')), [getField]);
  const playerName = String(getField('playerName') || 'Nico Williams');
  const playerImage = String(getField('playerImage') || '');
  const clubFrom = String(getField('clubFrom') || 'Athletic');
  const clubTo = String(getField('clubTo') || 'Barcelona');
  const dealValue = String(getField('dealValue') || '€58M + bonuses');

  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    setRevealed(0);
    const timer = window.setInterval(() => {
      setRevealed(r => Math.min(r + 1, lines.length));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [lines.length]);

  return (
    <div style={containerStyle}>
      {SHARED_FONTS}
      <style>{SHARED_KEYFRAMES}</style>
      <div style={{ ...contentWrapperStyle, background: theme.bg, fontFamily: 'Tajawal, sans-serif', color: theme.text }} className="overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '70px 70px' }} />

        {/* Top bar — call header */}
        <div className="absolute inset-x-0 top-0 h-16 flex items-center justify-between px-8 border-b" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.5)' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444', animation: 'mercPulse 1.2s infinite' }} />
              <div className="absolute inset-0 w-3 h-3 rounded-full" style={{ background: '#ef4444', animation: 'mercPulse 1.2s 0.4s infinite' }} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.32em]" style={{ color: '#ef4444' }}>● LIVE CALL — RECORDED</span>
          </div>
          <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-base font-bold">
            <Clock className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={2.5} />
            <span style={{ color: theme.accent }}>{callDuration}</span>
          </div>
        </div>

        <div className="absolute inset-0 pt-16 pb-32 px-8 grid grid-cols-[300px_1fr_280px] gap-6">
          {/* LEFT — Caller card with avatar & waveform */}
          <div className="border flex flex-col" style={{ borderColor: theme.border, background: theme.card }}>
            <div className="p-5 border-b" style={{ borderColor: theme.border }}>
              <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>INCOMING</div>
              <div className="mt-1 font-['Barlow_Condensed'] text-2xl font-black leading-tight">{callerName}</div>
              <div className="text-xs font-bold mt-1" style={{ color: theme.secondary }}>{callerRole}</div>
            </div>
            {/* Animated avatar with phone icon */}
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-full" style={{ background: theme.accent, opacity: 0.2, animation: 'mercPulse 1.4s infinite', transform: 'scale(1.4)' }} />
                <div className="relative w-32 h-32 rounded-full flex items-center justify-center" style={{ background: theme.card, border: `3px solid ${theme.accent}` }}>
                  <Phone className="w-12 h-12" style={{ color: theme.accent }} strokeWidth={2} />
                </div>
              </div>
              {/* Waveform */}
              <div className="flex items-end gap-1 h-12">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="w-1.5 rounded-full" style={{
                    background: theme.accent,
                    height: `${30 + (i % 5) * 12}%`,
                    animation: `mercWaveBar 0.${4 + (i % 6)}s ease-in-out infinite`,
                    animationDelay: `${i * 0.08}s`,
                    transformOrigin: 'bottom',
                  }} />
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: theme.secondary }}>
                <Mic className="w-3 h-3" strokeWidth={2.5} />
                <span>RECORDING</span>
              </div>
            </div>
          </div>

          {/* MIDDLE — Chat bubbles */}
          <div className="border overflow-hidden flex flex-col" style={{ borderColor: theme.border, background: theme.card }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={2.4} />
                <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>TRANSCRIPT</span>
              </div>
              <div className="text-[10px] font-bold" style={{ color: theme.secondary }}>{reporterName}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {lines.slice(0, revealed).map((line, idx) => {
                const isAgent = line.side === 'agent';
                return (
                  <div key={idx} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`} style={{ animation: 'mercSlideRight 0.4s ease-out both' }}>
                    <div className={`max-w-[80%] px-4 py-2.5`} style={{
                      background: isAgent ? `${theme.accent}22` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isAgent ? theme.accent : theme.border}`,
                      borderRadius: isAgent ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                    }}>
                      <div className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: isAgent ? theme.accent : theme.secondary }}>
                        {isAgent ? callerName.split('—')[0].trim() : 'REO'}
                      </div>
                      <div className="text-base font-bold leading-snug">{line.text}</div>
                    </div>
                  </div>
                );
              })}
              {revealed < lines.length && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 flex gap-1.5" style={{ background: `${theme.accent}22`, borderRadius: '14px 14px 14px 2px', border: `1px solid ${theme.accent}` }}>
                    {[0, 0.2, 0.4].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accent, animation: `mercTypingDot 1.2s ${d}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Deal context */}
          <div className="border flex flex-col" style={{ borderColor: theme.border, background: theme.card }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>DEAL CONTEXT</div>
            </div>
            <div className="flex-1 flex flex-col items-center pt-4 px-4">
              <div className="relative w-32 h-32 mb-3 overflow-hidden border" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.4)' }}>
                {playerImage ? (
                  <img src={playerImage} alt="" className="absolute inset-x-0 bottom-0 h-full w-auto mx-auto object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-['Barlow_Condensed'] text-3xl font-black opacity-40">{initials(playerName)}</div>
                )}
              </div>
              <div className="font-['Barlow_Condensed'] text-2xl font-black leading-tight text-center" dir="ltr">{playerName}</div>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold" style={{ color: theme.secondary }}>
                <span>{clubFrom}</span>
                <ArrowUpDown className="w-3 h-3" style={{ color: theme.accent }} />
                <span>{clubTo}</span>
              </div>
              <div className="mt-4 px-3 py-2 w-full text-center border" style={{ borderColor: theme.accent, background: `${theme.accent}18` }}>
                <div className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: theme.secondary }}>DEAL VALUE</div>
                <div className="font-['Barlow_Condensed'] text-2xl font-black mt-0.5" style={{ color: theme.accent }}>{dealValue}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom — headline strip */}
        <div className="absolute inset-x-0 bottom-0 h-24 px-8 flex items-center" style={{ background: 'rgba(0,0,0,0.65)', borderTop: `2px solid ${theme.accent}` }}>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-1 h-12" style={{ background: theme.accent }} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>EXCLUSIVE — CALL HIGHLIGHTS</div>
              <div className="font-['Barlow_Condensed'] text-3xl font-black leading-tight mt-1">{dealHeadline}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  2. MERCATO_DEAL_TIMELINE — Horizontal deal timeline
// ════════════════════════════════════════════════════════════════════════════
type TimelineStep = { date: string; label: string; description: string; status: 'done' | 'active' | 'pending' };

const parseTimeline = (raw: unknown): TimelineStep[] => {
  const txt = String(raw || '').trim();
  if (!txt) return [];
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        date: String(item?.date || ''),
        label: String(item?.label || ''),
        description: String(item?.description || ''),
        status: (item?.status === 'done' ? 'done' : item?.status === 'active' ? 'active' : 'pending') as 'done' | 'active' | 'pending',
      })).filter(s => s.label);
    }
  } catch { /* */ }
  return [];
};

const STATUS_ICON = { done: CheckCircle2, active: Hourglass, pending: AlertCircle };

export const MercatoDealTimelineRenderer: React.FC<RendererProps> = ({ config, getField, containerStyle, contentWrapperStyle, isEditor }) => {
  useMercatoAudio(getField, config.isVisible, isEditor);
  const themeId = String(getField('visualTheme') || 'EMERALD_FIELD');
  const theme = getTheme(themeId);
  const headline = String(getField('headline') || 'DEAL TIMELINE');
  const playerName = String(getField('playerName') || 'Lamine Yamal');
  const playerImage = String(getField('playerImage') || '');
  const fromClub = String(getField('fromClub') || 'Barcelona');
  const toClub = String(getField('toClub') || 'Barcelona');
  const dealValue = String(getField('dealValue') || 'Renewal');
  const steps = useMemo(() => {
    const parsed = parseTimeline(getField('timelineSteps'));
    return parsed.length > 0 ? parsed : [
      { date: 'Apr 12', label: 'First contact', description: 'Initial talks open', status: 'done' as const },
      { date: 'May 02', label: 'Verbal agreement', description: 'Salary structure agreed', status: 'done' as const },
      { date: 'May 18', label: 'Medical', description: 'Scheduled tomorrow at La Masia', status: 'active' as const },
      { date: 'May 22', label: 'Signature', description: 'Press conference + photos', status: 'pending' as const },
    ];
  }, [getField]);

  const progress = Math.round((steps.filter(s => s.status === 'done').length / steps.length) * 100);

  return (
    <div style={containerStyle}>
      {SHARED_FONTS}
      <style>{SHARED_KEYFRAMES}</style>
      <div style={{ ...contentWrapperStyle, background: theme.bg, fontFamily: 'Tajawal, sans-serif', color: theme.text }} className="overflow-hidden">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle, ${theme.accent}80 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

        {/* Header */}
        <div className="absolute inset-x-0 top-0 px-10 py-5 border-b flex items-center justify-between" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.5)' }}>
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6" style={{ color: theme.accent }} strokeWidth={2.2} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.32em]" style={{ color: theme.secondary }}>DEAL TIMELINE</div>
              <div className="font-['Barlow_Condensed'] text-3xl font-black leading-tight">{headline}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>OVERALL PROGRESS</div>
            <div className="font-['Barlow_Condensed'] text-4xl font-black mt-0.5" style={{ color: theme.accent }}>{progress}%</div>
          </div>
        </div>

        {/* Player card on left */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 w-72 border" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="aspect-[4/5] relative overflow-hidden border-b" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.4)' }}>
            {playerImage ? (
              <img src={playerImage} alt="" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-['Barlow_Condensed'] text-7xl font-black opacity-30">{initials(playerName)}</div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <div className="font-['Barlow_Condensed'] text-3xl font-black leading-tight" dir="ltr">{playerName}</div>
              <div className="flex items-center gap-2 text-xs font-bold mt-1" style={{ color: theme.secondary }}>
                <span>{fromClub}</span>
                <ArrowUpDown className="w-3 h-3" style={{ color: theme.accent }} />
                <span>{toClub}</span>
              </div>
            </div>
          </div>
          <div className="p-3 text-center" style={{ borderColor: theme.border }}>
            <div className="text-[9px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>DEAL VALUE</div>
            <div className="font-['Barlow_Condensed'] text-2xl font-black mt-0.5" style={{ color: theme.accent }}>{dealValue}</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="absolute left-[368px] right-10 top-32 bottom-10 flex items-center">
          <div className="relative w-full">
            {/* Timeline track */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
            {/* Progress fill */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}88)`, width: `calc(${progress}% - 24px)`, boxShadow: `0 0 12px ${theme.accent}88` }} />

            {/* Step nodes */}
            <div className="relative flex justify-between">
              {steps.map((step, idx) => {
                const Icon = STATUS_ICON[step.status];
                const colors = step.status === 'done' ? { bg: theme.accent, fg: '#000' }
                  : step.status === 'active' ? { bg: '#fbbf24', fg: '#000' }
                  : { bg: 'rgba(255,255,255,0.12)', fg: theme.secondary };
                return (
                  <div key={idx} className="flex flex-col items-center text-center w-44" style={{ animation: `mercFadeIn 0.5s ${idx * 0.15}s ease-out both` }}>
                    {/* Node */}
                    <div className="relative">
                      {step.status === 'active' && (
                        <div className="absolute inset-0 rounded-full" style={{ background: '#fbbf24', opacity: 0.4, animation: 'mercPulse 1.4s infinite', transform: 'scale(1.6)' }} />
                      )}
                      <div className="relative w-12 h-12 rounded-full flex items-center justify-center" style={{ background: colors.bg, border: `2px solid ${theme.bg}`, boxShadow: step.status !== 'pending' ? `0 0 16px ${colors.bg}88` : undefined }}>
                        <Icon className="w-5 h-5" style={{ color: colors.fg }} strokeWidth={2.6} />
                      </div>
                    </div>
                    {/* Date */}
                    <div className="mt-3 font-['JetBrains_Mono'] text-[11px] font-bold" style={{ color: theme.secondary }}>{step.date}</div>
                    {/* Label */}
                    <div className="font-['Barlow_Condensed'] text-xl font-black leading-tight mt-1">{step.label}</div>
                    {/* Description */}
                    <div className="text-xs font-bold mt-2 px-2 leading-snug" style={{ color: theme.secondary }}>{step.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  3. MERCATO_BUDGET_TRACKER — Club ledger with running balance
// ════════════════════════════════════════════════════════════════════════════
type LedgerEntry = { type: 'in' | 'out'; player: string; club: string; amount: number; date?: string };

const parseLedger = (raw: unknown): LedgerEntry[] => {
  const txt = String(raw || '').trim();
  if (!txt) return [];
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        type: (item?.type === 'out' ? 'out' : 'in') as 'in' | 'out',
        player: String(item?.player || ''),
        club: String(item?.club || ''),
        amount: Number(item?.amount || 0),
        date: String(item?.date || ''),
      })).filter(e => e.player);
    }
  } catch { /* */ }
  return [];
};

const formatM = (n: number) => `€${n.toFixed(1)}M`;

export const MercatoBudgetTrackerRenderer: React.FC<RendererProps> = ({ config, getField, containerStyle, contentWrapperStyle, isEditor }) => {
  useMercatoAudio(getField, config.isVisible, isEditor);
  const themeId = String(getField('visualTheme') || 'CLEAN_BROADCAST');
  const theme = getTheme(themeId);
  const clubName = String(getField('clubName') || 'FC Barcelona');
  const clubLogo = String(getField('clubLogo') || 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png');
  const seasonLabel = String(getField('seasonLabel') || 'Mercato 2026/27');
  const initialBudget = Number(getField('initialBudget') || 150);
  const entries = useMemo(() => {
    const parsed = parseLedger(getField('ledgerEntries'));
    return parsed.length > 0 ? parsed : [
      { type: 'out' as const, player: 'João Cancelo', club: 'Manchester City', amount: 25, date: 'Jul 03' },
      { type: 'in' as const,  player: 'João Félix',   club: 'Atletico Madrid', amount: 12, date: 'Jul 11' },
      { type: 'out' as const, player: 'Vitor Roque', club: 'Real Betis',       amount: 30, date: 'Jul 18' },
      { type: 'in' as const,  player: 'Marcos Alonso', club: 'Free agent',      amount: 0,  date: 'Aug 02' },
    ];
  }, [getField]);

  const totalIn = entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
  const remaining = initialBudget + totalIn - totalOut;
  const remainingPct = Math.max(0, Math.min(100, (remaining / initialBudget) * 100));

  return (
    <div style={containerStyle}>
      {SHARED_FONTS}
      <style>{SHARED_KEYFRAMES}</style>
      <div style={{ ...contentWrapperStyle, background: theme.bg, fontFamily: 'Tajawal, sans-serif', color: theme.text }} className="overflow-hidden">
        {/* Top header */}
        <div className="absolute inset-x-0 top-0 h-20 px-10 flex items-center justify-between border-b" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.55)' }}>
          <div className="flex items-center gap-4">
            {clubLogo ? <img src={clubLogo} alt="" className="w-14 h-14 object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.32em]" style={{ color: theme.secondary }}>BUDGET TRACKER</div>
              <div className="font-['Barlow_Condensed'] text-3xl font-black">{clubName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: theme.accent }} />
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.secondary }}>{seasonLabel}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="absolute left-10 right-10 top-28 grid grid-cols-4 gap-4">
          {[
            { label: 'STARTING BUDGET', value: formatM(initialBudget), color: theme.text, icon: null },
            { label: 'INCOMING (SALES)',  value: `+${formatM(totalIn)}`, color: '#22c55e', icon: TrendingUp },
            { label: 'OUTGOING (BUYS)', value: `−${formatM(totalOut)}`, color: '#ef4444', icon: TrendingDown },
            { label: 'REMAINING', value: formatM(remaining), color: theme.accent, icon: Activity },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="border p-4" style={{ borderColor: theme.border, background: theme.card, animation: `mercCountUp 0.5s ${idx * 0.1}s both` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>{stat.label}</span>
                  {Icon ? <Icon className="w-4 h-4" style={{ color: stat.color }} strokeWidth={2.4} /> : null}
                </div>
                <div className="font-['Barlow_Condensed'] text-4xl font-black leading-none" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Budget bar */}
        <div className="absolute left-10 right-10 top-[226px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>BUDGET REMAINING</span>
            <span className="font-['JetBrains_Mono'] text-sm font-bold" style={{ color: theme.accent }}>{remainingPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}cc)`, width: `${remainingPct}%`, boxShadow: `0 0 12px ${theme.accent}88` }} />
          </div>
        </div>

        {/* Ledger */}
        <div className="absolute left-10 right-10 top-[280px] bottom-10 border overflow-hidden" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="grid grid-cols-[80px_1fr_1fr_180px_140px] gap-3 px-5 py-3 border-b text-[9px] font-black uppercase tracking-[0.22em]" style={{ borderColor: theme.border, color: theme.secondary, background: 'rgba(0,0,0,0.4)' }}>
            <div>TYPE</div>
            <div>PLAYER</div>
            <div>CLUB</div>
            <div>DATE</div>
            <div className="text-right">AMOUNT</div>
          </div>
          <div className="divide-y" style={{ ['--divide' as any]: theme.border }}>
            {entries.map((e, idx) => {
              const isIn = e.type === 'in';
              return (
                <div key={idx} className="grid grid-cols-[80px_1fr_1fr_180px_140px] gap-3 px-5 py-3.5 items-center hover:bg-white/[0.02]" style={{ borderColor: theme.border, animation: `mercFadeIn 0.4s ${idx * 0.08}s both` }}>
                  <div className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 inline-flex items-center gap-1 w-fit`} style={{ background: isIn ? '#22c55e22' : '#ef444422', color: isIn ? '#22c55e' : '#ef4444', border: `1px solid ${isIn ? '#22c55e55' : '#ef444455'}` }}>
                    {isIn ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isIn ? 'IN' : 'OUT'}
                  </div>
                  <div className="font-['Barlow_Condensed'] text-xl font-black leading-tight" dir="ltr">{e.player}</div>
                  <div className="text-sm font-bold" style={{ color: theme.secondary }}>{e.club}</div>
                  <div className="font-['JetBrains_Mono'] text-xs font-bold" style={{ color: theme.secondary }}>{e.date || '—'}</div>
                  <div className={`font-['Barlow_Condensed'] text-2xl font-black text-right`} style={{ color: isIn ? '#22c55e' : '#ef4444' }}>
                    {isIn ? '+' : '−'}{formatM(e.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  4. MERCATO_DEADLINE_DAY — Live deadline-day countdown + deal feed
// ════════════════════════════════════════════════════════════════════════════
type LiveDeal = { time: string; player: string; from: string; to: string; status: 'breaking' | 'done' | 'rumor' };

const parseLiveDeals = (raw: unknown): LiveDeal[] => {
  const txt = String(raw || '').trim();
  if (!txt) return [];
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        time: String(item?.time || ''),
        player: String(item?.player || ''),
        from: String(item?.from || ''),
        to: String(item?.to || ''),
        status: (item?.status === 'done' ? 'done' : item?.status === 'rumor' ? 'rumor' : 'breaking') as 'breaking' | 'done' | 'rumor',
      })).filter(d => d.player);
    }
  } catch { /* */ }
  return [];
};

const useCountdown = (target: string) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return { hh: 0, mm: 0, ss: 0, expired: false };
  const diff = Math.max(0, t - now);
  const hh = Math.floor(diff / 3_600_000);
  const mm = Math.floor((diff % 3_600_000) / 60_000);
  const ss = Math.floor((diff % 60_000) / 1000);
  return { hh, mm, ss, expired: diff <= 0 };
};

export const MercatoDeadlineDayRenderer: React.FC<RendererProps> = ({ config, getField, containerStyle, contentWrapperStyle, isEditor }) => {
  useMercatoAudio(getField, config.isVisible, isEditor);
  const themeId = String(getField('visualTheme') || 'TACTICAL_DARK');
  const theme = getTheme(themeId);
  const headline = String(getField('headline') || 'DEADLINE DAY');
  const subline = String(getField('subline') || 'SUMMER MERCATO 2026 — CLOSES TONIGHT');
  const targetTime = String(getField('targetTime') || new Date(Date.now() + 4 * 3600_000).toISOString());
  const deals = useMemo(() => {
    const parsed = parseLiveDeals(getField('liveDeals'));
    return parsed.length > 0 ? parsed : [
      { time: '14:08', player: 'João Cancelo',  from: 'Man City',     to: 'Barcelona', status: 'done' as const },
      { time: '15:32', player: 'Bruno Guimarães', from: 'Newcastle',  to: 'Man City',  status: 'breaking' as const },
      { time: '16:11', player: 'Frenkie de Jong', from: 'Barcelona',  to: 'Liverpool', status: 'rumor' as const },
      { time: '17:04', player: 'Marc Guéhi',     from: 'Crystal Palace', to: 'Newcastle', status: 'breaking' as const },
    ];
  }, [getField]);
  const { hh, mm, ss, expired } = useCountdown(targetTime);

  const stats = useMemo(() => ({
    breaking: deals.filter(d => d.status === 'breaking').length,
    done:     deals.filter(d => d.status === 'done').length,
    rumor:    deals.filter(d => d.status === 'rumor').length,
  }), [deals]);

  return (
    <div style={containerStyle}>
      {SHARED_FONTS}
      <style>{SHARED_KEYFRAMES}</style>
      <div style={{ ...contentWrapperStyle, background: theme.bg, fontFamily: 'Tajawal, sans-serif', color: theme.text }} className="overflow-hidden">
        {/* Hazard tape effect */}
        <div className="absolute inset-x-0 top-0 h-3" style={{ background: 'repeating-linear-gradient(45deg, #fbbf24 0 24px, #000 24px 48px)' }} />
        <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: 'repeating-linear-gradient(45deg, #fbbf24 0 24px, #000 24px 48px)' }} />

        {/* Top section — headline + countdown */}
        <div className="absolute inset-x-0 top-3 h-44 px-10 grid grid-cols-[1fr_auto] gap-10 items-center border-b" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.5)' }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', animation: 'mercPulse 1s infinite', boxShadow: '0 0 12px #ef4444' }} />
              <div className="text-[12px] font-black uppercase tracking-[0.4em]" style={{ color: '#ef4444' }}>● LIVE</div>
              <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 to-transparent" />
            </div>
            <div className="font-['Barlow_Condensed'] text-[88px] font-black leading-[0.85] tracking-tight" style={{ textShadow: `0 0 40px ${theme.accent}66` }}>
              {headline}
            </div>
            <div className="text-base font-bold uppercase tracking-[0.18em] mt-2" style={{ color: theme.secondary }}>{subline}</div>
          </div>
          <div className="text-right border-l-2 pl-10" style={{ borderColor: theme.accent }}>
            <div className="text-[10px] font-black uppercase tracking-[0.32em] mb-1" style={{ color: theme.secondary }}>TIME REMAINING</div>
            <div className="flex gap-1 items-baseline justify-end font-['Barlow_Condensed']">
              {[
                { v: hh, label: 'HRS' },
                { v: mm, label: 'MIN' },
                { v: ss, label: 'SEC' },
              ].map((u, i) => (
                <React.Fragment key={u.label}>
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="text-[72px] font-black leading-none" style={{ color: expired ? '#ef4444' : theme.accent, textShadow: `0 0 24px ${theme.accent}88` }}>
                      {String(u.v).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>{u.label}</div>
                  </div>
                  {i < 2 && <div className="text-[60px] font-black leading-none px-1" style={{ color: theme.accent, animation: 'mercBlink 1s infinite' }}>:</div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="absolute left-10 right-10 top-[190px] grid grid-cols-3 gap-4">
          {[
            { label: 'BREAKING', count: stats.breaking, color: '#ef4444', icon: AlertCircle },
            { label: 'COMPLETED', count: stats.done, color: '#22c55e', icon: CheckCircle2 },
            { label: 'RUMORS', count: stats.rumor, color: '#fbbf24', icon: Hourglass },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="border px-5 py-3 flex items-center gap-4" style={{ borderColor: theme.border, background: theme.card }}>
                <div className="w-12 h-12 flex items-center justify-center" style={{ background: `${s.color}22`, border: `1px solid ${s.color}55` }}>
                  <Icon className="w-6 h-6" style={{ color: s.color }} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>{s.label}</div>
                  <div className="font-['Barlow_Condensed'] text-4xl font-black leading-none" style={{ color: s.color }}>{s.count}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live deals feed */}
        <div className="absolute left-10 right-10 top-[298px] bottom-6 border overflow-hidden" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.4)' }}>
            <ScanLine className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>LIVE DEAL FEED</span>
          </div>
          <div className="divide-y">
            {deals.map((d, idx) => {
              const colors = d.status === 'done' ? { c: '#22c55e', label: 'DONE DEAL' }
                : d.status === 'breaking' ? { c: '#ef4444', label: 'BREAKING' }
                : { c: '#fbbf24', label: 'RUMOR' };
              return (
                <div key={idx} className="grid grid-cols-[100px_120px_1fr_auto_1fr] items-center gap-4 px-5 py-3.5" style={{ borderColor: theme.border, animation: `mercSlideRight 0.45s ${idx * 0.08}s both` }}>
                  <div className="font-['JetBrains_Mono'] text-base font-bold" style={{ color: theme.secondary }}>{d.time}</div>
                  <div className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 w-fit" style={{ background: `${colors.c}22`, color: colors.c, border: `1px solid ${colors.c}66` }}>{colors.label}</div>
                  <div className="font-['Barlow_Condensed'] text-2xl font-black truncate" dir="ltr">{d.player}</div>
                  <div className="text-sm font-bold" style={{ color: theme.secondary }}>{d.from}</div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <ArrowUpDown className="w-3 h-3" style={{ color: theme.accent }} />
                    <span style={{ color: theme.accent }}>{d.to}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  5. MERCATO_X_RAY — Player visual analysis (radar + bars + heat zones)
// ════════════════════════════════════════════════════════════════════════════
type RadarStat = { label: string; value: number /* 0-100 */ };
type HeatZone = { x: number; y: number; intensity: number /* 0-1 */ };

const parseRadar = (raw: unknown): RadarStat[] => {
  const txt = String(raw || '').trim();
  if (!txt) return [];
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        label: String(item?.label || ''),
        value: Math.max(0, Math.min(100, Number(item?.value) || 0)),
      })).filter(s => s.label).slice(0, 8);
    }
  } catch { /* */ }
  return [];
};

const parseHeatZones = (raw: unknown): HeatZone[] => {
  const txt = String(raw || '').trim();
  if (!txt) return [];
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        x: Math.max(0, Math.min(100, Number(item?.x) || 0)),
        y: Math.max(0, Math.min(100, Number(item?.y) || 0)),
        intensity: Math.max(0, Math.min(1, Number(item?.intensity) || 0.5)),
      }));
    }
  } catch { /* */ }
  return [];
};

const radarPolygon = (stats: RadarStat[], radius: number, cx: number, cy: number) => {
  if (stats.length === 0) return '';
  const angle = (2 * Math.PI) / stats.length;
  return stats.map((s, i) => {
    const a = i * angle - Math.PI / 2;
    const r = (s.value / 100) * radius;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
};

const radarAxisPoints = (count: number, radius: number, cx: number, cy: number) =>
  Array.from({ length: count }).map((_, i) => {
    const a = i * (2 * Math.PI) / count - Math.PI / 2;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  });

export const MercatoXRayRenderer: React.FC<RendererProps> = ({ config, getField, containerStyle, contentWrapperStyle, isEditor }) => {
  useMercatoAudio(getField, config.isVisible, isEditor);
  const themeId = String(getField('visualTheme') || 'HOLOGRAM_PURPLE');
  const theme = getTheme(themeId);
  const playerName = String(getField('playerName') || 'Pedri González');
  const playerImage = String(getField('playerImage') || '');
  const position = String(getField('position') || 'CM — Central Midfielder');
  const playerAge = String(getField('playerAge') || '23');
  const overallRating = Number(getField('overallRating') || 88);
  const radarStats = useMemo(() => {
    const parsed = parseRadar(getField('radarStats'));
    return parsed.length > 0 ? parsed : [
      { label: 'PASSING', value: 92 },
      { label: 'VISION',  value: 90 },
      { label: 'DRIBBLE', value: 85 },
      { label: 'TEMPO',   value: 88 },
      { label: 'DEFENSE', value: 70 },
      { label: 'STAMINA', value: 78 },
    ];
  }, [getField]);
  const heatZones = useMemo(() => {
    const parsed = parseHeatZones(getField('heatZones'));
    return parsed.length > 0 ? parsed : [
      { x: 50, y: 50, intensity: 1.0 },
      { x: 40, y: 45, intensity: 0.85 },
      { x: 60, y: 55, intensity: 0.85 },
      { x: 35, y: 60, intensity: 0.65 },
      { x: 65, y: 40, intensity: 0.65 },
      { x: 50, y: 30, intensity: 0.55 },
    ];
  }, [getField]);
  const verdict = String(getField('verdict') || 'GENERATIONAL TALENT — PROFILE FITS BARÇA DNA');

  // SVG layout
  const cx = 200, cy = 200, radius = 150;
  const axes = radarAxisPoints(radarStats.length, radius, cx, cy);
  const polygon = radarPolygon(radarStats, radius, cx, cy);

  return (
    <div style={containerStyle}>
      {SHARED_FONTS}
      <style>{SHARED_KEYFRAMES}</style>
      <div style={{ ...contentWrapperStyle, background: theme.bg, fontFamily: 'Tajawal, sans-serif', color: theme.text }} className="overflow-hidden">
        {/* Scan grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `linear-gradient(${theme.accent}80 1px, transparent 1px), linear-gradient(90deg, ${theme.accent}80 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

        {/* Header */}
        <div className="absolute inset-x-0 top-0 h-20 px-10 flex items-center justify-between border-b" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.55)' }}>
          <div className="flex items-center gap-3">
            <ScanLine className="w-6 h-6" style={{ color: theme.accent, animation: 'mercPulse 1.6s infinite' }} strokeWidth={2.2} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.32em]" style={{ color: theme.secondary }}>PLAYER X-RAY ANALYSIS</div>
              <div className="font-['Barlow_Condensed'] text-2xl font-black leading-tight">SCANNING ATTRIBUTES — REAL-TIME</div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-xs font-bold" style={{ color: theme.accent }}>
            <Activity className="w-4 h-4" strokeWidth={2.5} />
            <span>SIGNAL STRONG</span>
          </div>
        </div>

        {/* 3-column body */}
        <div className="absolute inset-0 pt-24 pb-6 px-10 grid grid-cols-[300px_400px_1fr] gap-6">
          {/* LEFT — player ID card */}
          <div className="border flex flex-col" style={{ borderColor: theme.border, background: theme.card }}>
            <div className="aspect-[4/5] relative overflow-hidden border-b" style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.5)' }}>
              {playerImage ? (
                <img src={playerImage} alt="" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-['Barlow_Condensed'] text-7xl font-black opacity-30">{initials(playerName)}</div>
              )}
              {/* Scanning line */}
              <div className="absolute inset-x-0 h-0.5" style={{ background: theme.accent, boxShadow: `0 0 12px ${theme.accent}`, top: '50%', animation: 'mercPulse 2s infinite' }} />
              {/* Corner brackets */}
              {([['top-2 left-2', 'border-l-2 border-t-2'], ['top-2 right-2', 'border-r-2 border-t-2'], ['bottom-2 left-2', 'border-l-2 border-b-2'], ['bottom-2 right-2', 'border-r-2 border-b-2']] as const).map(([pos, brd], i) => (
                <div key={i} className={`absolute w-5 h-5 ${pos} ${brd}`} style={{ borderColor: theme.accent }} />
              ))}
            </div>
            <div className="p-4">
              <div className="font-['Barlow_Condensed'] text-2xl font-black leading-tight" dir="ltr">{playerName}</div>
              <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: theme.secondary }}>{position}</div>
              <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: theme.border }}>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: theme.secondary }}>AGE</div>
                  <div className="font-['Barlow_Condensed'] text-2xl font-black">{playerAge}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: theme.secondary }}>OVR</div>
                  <div className="font-['Barlow_Condensed'] text-3xl font-black" style={{ color: theme.accent }}>{overallRating}</div>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE — radar chart */}
          <div className="border flex flex-col" style={{ borderColor: theme.border, background: theme.card }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: theme.border }}>
              <Radar className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={2.4} />
              <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>ATTRIBUTE RADAR</span>
            </div>
            <div className="flex-1 relative flex items-center justify-center">
              <svg viewBox="0 0 400 400" className="w-full h-full max-w-[360px]">
                {/* Grid rings */}
                {[0.25, 0.5, 0.75, 1].map(r => (
                  <circle key={r} cx={cx} cy={cy} r={radius * r} fill="none" stroke={theme.border} strokeWidth={1} />
                ))}
                {/* Axes */}
                {axes.map((a, i) => (
                  <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke={theme.border} strokeWidth={1} />
                ))}
                {/* Sweep */}
                <line x1={cx} y1={cy} x2={cx} y2={cy - radius} stroke={theme.accent} strokeWidth={1.5} opacity={0.5} style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'mercRadarSweep 4s linear infinite' }} />
                {/* Polygon */}
                <polygon points={polygon} fill={`${theme.accent}33`} stroke={theme.accent} strokeWidth={2} />
                {/* Stat points */}
                {radarStats.map((s, i) => {
                  const angle = i * (2 * Math.PI) / radarStats.length - Math.PI / 2;
                  const r = (s.value / 100) * radius;
                  const px = cx + r * Math.cos(angle);
                  const py = cy + r * Math.sin(angle);
                  return <circle key={i} cx={px} cy={py} r={4} fill={theme.accent} />;
                })}
                {/* Labels */}
                {radarStats.map((s, i) => {
                  const angle = i * (2 * Math.PI) / radarStats.length - Math.PI / 2;
                  const lx = cx + (radius + 22) * Math.cos(angle);
                  const ly = cy + (radius + 22) * Math.sin(angle);
                  return (
                    <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="900" fill={theme.text} style={{ fontFamily: 'Barlow Condensed' }}>
                      {s.label}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* RIGHT — bars + heat map + verdict */}
          <div className="flex flex-col gap-4">
            {/* Bars */}
            <div className="border p-4" style={{ borderColor: theme.border, background: theme.card }}>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={2.4} />
                <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>ATTRIBUTE BREAKDOWN</span>
              </div>
              <div className="space-y-2">
                {radarStats.slice(0, 6).map((s, i) => (
                  <div key={i} className="grid grid-cols-[100px_1fr_50px] items-center gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.secondary }}>{s.label}</div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}aa)`, width: `${s.value}%`, animation: `mercProgress 0.8s ${i * 0.1}s ease-out both`, ['--progress' as any]: `${s.value}%` }} />
                    </div>
                    <div className="font-['JetBrains_Mono'] text-sm font-bold text-right" style={{ color: theme.accent }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heat zones */}
            <div className="border p-4 flex-1" style={{ borderColor: theme.border, background: theme.card }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" style={{ color: theme.accent }} strokeWidth={2.4} />
                <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: theme.secondary }}>HEAT MAP — ACTIVITY ZONES</span>
              </div>
              <div className="relative aspect-[3/2] rounded border" style={{ borderColor: theme.border, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                {/* Pitch lines */}
                <div className="absolute inset-x-1/2 inset-y-2 w-px" style={{ background: theme.border }} />
                <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ borderColor: theme.border }} />
                {/* Heat blobs */}
                {heatZones.map((z, i) => (
                  <div key={i} className="absolute rounded-full pointer-events-none" style={{
                    left: `${z.x}%`,
                    top: `${z.y}%`,
                    width: `${30 + z.intensity * 50}%`,
                    height: `${30 + z.intensity * 50}%`,
                    background: `radial-gradient(circle, ${theme.accent}${Math.floor(z.intensity * 200).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
                    transform: 'translate(-50%, -50%)',
                  }} />
                ))}
              </div>
            </div>

            {/* Verdict */}
            <div className="border p-4" style={{ borderColor: theme.accent, background: `${theme.accent}11` }}>
              <div className="text-[10px] font-black uppercase tracking-[0.32em] mb-1" style={{ color: theme.accent }}>VERDICT</div>
              <div className="font-['Barlow_Condensed'] text-xl font-black leading-tight">{verdict}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
