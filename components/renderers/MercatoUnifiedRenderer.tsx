/**
 * Mercato Unified Renderer (X7 polish).
 *
 * Single renderer that supports 10 layout variants chosen via the
 * `mercatoVariant` field. Replaces the need for 10 separate renderer
 * files. Every variant inherits the same broadcast controls + audio
 * infrastructure (AudioSettingsPanel, scene picker, voice library).
 *
 * X7 changes:
 *   - Agent Call redesigned as a 3-column premium broadcast layout
 *     (deal context | transcript | private source panel) with status
 *     pills (LIVE / RECORDED / PRIVATE), confidence bar, and a
 *     transcript that handles long lines without breaking 16:9.
 *   - Every variant gets a stronger header band with gradient accent,
 *     tighter typography, and explicit "no fallback square" empty
 *     states (we hide ugly placeholders rather than show empty boxes).
 *   - Shared <Header /> + <FieldCard /> + <Pill /> primitives keep
 *     visual language consistent without adding more renderers.
 */
import React from 'react';
import { RendererProps } from './SharedComponents';
import { useEffect } from 'react';
import { evaluateTransitionAttempt } from '../../utils/templateTransitionDiagnostics';

// ─── Theme ──────────────────────────────────────────────────────────────────

interface UnifiedTheme {
  bg: string;
  surface: string;
  surfaceLight: string;
  surfaceDeep: string;
  border: string;
  text: string;
  sub: string;
  dim: string;
  accent: string;
  accentSoft: string;
  accent2: string;
  success: string;
  warning: string;
  danger: string;
}

const THEMES: Record<string, UnifiedTheme> = {
  TACTICAL_DARK: {
    bg: 'radial-gradient(ellipse at 70% 30%, rgba(15,30,55,1) 0%, rgba(8,12,22,1) 70%)',
    surface: 'rgba(15,25,45,0.85)', surfaceLight: 'rgba(25,40,70,0.75)',
    surfaceDeep: 'rgba(8,14,28,0.95)',
    border: 'rgba(60,90,140,0.45)', text: '#ffffff', sub: '#94a3b8', dim: '#475569',
    accent: '#22d3ee', accentSoft: 'rgba(34,211,238,0.10)', accent2: '#7c5cff',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
  },
  CLEAN_BROADCAST: {
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    surface: 'rgba(30,41,59,0.85)', surfaceLight: 'rgba(51,65,85,0.75)',
    surfaceDeep: 'rgba(15,23,42,0.95)',
    border: 'rgba(100,116,139,0.45)', text: '#f1f5f9', sub: '#94a3b8', dim: '#64748b',
    accent: '#3b82f6', accentSoft: 'rgba(59,130,246,0.10)', accent2: '#06b6d4',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
  },
  LUXE_GOLD: {
    bg: 'radial-gradient(ellipse at 70% 30%, rgba(50,30,10,1) 0%, rgba(20,10,4,1) 70%)',
    surface: 'rgba(50,30,10,0.85)', surfaceLight: 'rgba(80,50,20,0.75)',
    surfaceDeep: 'rgba(20,10,4,0.95)',
    border: 'rgba(180,140,60,0.45)', text: '#fffbe6', sub: '#fcd34d', dim: '#92400e',
    accent: '#fbbf24', accentSoft: 'rgba(251,191,36,0.10)', accent2: '#f59e0b',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
  },
};

const getTheme = (id: string): UnifiedTheme => THEMES[id] || THEMES.TACTICAL_DARK;

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeParse = <T,>(s: string, fallback: T): T => {
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

interface ChatLine { side: 'reporter' | 'agent' | string; text: string; }

// X13 — return up to 2 initials. Strips connector words and prefixes like
// "AGENT —". Used as a fallback when an avatar image is missing so we
// never leave an empty grey square on broadcast.
const getInitials = (name: string): string => {
  if (!name) return '··';
  // Drop everything before an em-dash (e.g., "AGENT — JORGE MENDES")
  const cleaned = name.split('—').slice(-1)[0].trim();
  const parts = cleaned.split(/\s+/).filter(p => p.length > 1);
  if (parts.length === 0) return cleaned.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// X13 — detect Arabic/Hebrew (RTL) so transcript bubbles auto-direct.
const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const isRtl = (s: string): boolean => ARABIC_RANGE.test(s);

// X13 — small reusable SVG glyphs replacing emojis on broadcast.
const Icon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 18, color = 'currentColor' }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'phone':       return <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
    case 'doc':         return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6M9 9h1" /></svg>;
    case 'stamp':       return <svg {...props}><path d="M12 2v4" /><circle cx="12" cy="11" r="5" /><path d="M5 19h14M5 22h14" /></svg>;
    case 'lock':        return <svg {...props}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case 'plane':       return <svg {...props}><path d="M17.8 19.2 16 11l3.5-3.5a2.83 2.83 0 1 0-4-4L12 7 3.8 5.2a1 1 0 0 0-.95 1.65l4.42 5.16-2.43 2.43H2l1.5 2 2 1.5v-2.84l2.43-2.43 5.16 4.42a1 1 0 0 0 1.65-.95Z" /></svg>;
    case 'hospital':    return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></svg>;
    case 'signature':   return <svg {...props}><path d="m20 18-3.7-3.7" /><path d="M3 17h6c2 0 4-2 4-5s-1-5-3-5-3 2-3 5 2 5 4 5h7" /></svg>;
    case 'megaphone':   return <svg {...props}><path d="M3 11v2a4 4 0 0 0 4 4h2v-10H7a4 4 0 0 0-4 4Z" /><path d="m9 7 11-4v18L9 17" /></svg>;
    case 'warning':     return <svg {...props}><path d="m10.29 3.86-8.16 14a2 2 0 0 0 1.71 3h16.32a2 2 0 0 0 1.71-3l-8.16-14a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>;
    case 'briefcase':   return <svg {...props}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
    case 'sparkle':     return <svg {...props}><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>;
    case 'clock':       return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case 'check':       return <svg {...props}><path d="M20 6 9 17l-5-5" /></svg>;
    case 'pulse':       return <svg {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
    case 'arrow':       return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    default:            return null;
  }
};

// X13 — initials avatar with optional image fallback. Colored ring uses
// theme accent. Never leaves an empty box.
const Avatar: React.FC<{ t: UnifiedTheme; name?: string; image?: string; size?: number; accent?: string }> = ({ t, name = '', image, size = 56, accent }) => {
  const accentColor = accent || t.accent;
  const initials = getInitials(name);
  if (image) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full overflow-hidden flex-shrink-0 relative" >
        <img src={image} alt="" className="w-full h-full object-cover" onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.style.display = 'none';
          const parent = el.parentElement;
          if (parent && !parent.querySelector('[data-initials]')) {
            const span = document.createElement('span');
            span.setAttribute('data-initials', '1');
            span.textContent = initials;
            span.className = 'absolute inset-0 flex items-center justify-center font-black';
            span.style.background = `${accentColor}20`;
            span.style.color = accentColor;
            span.style.fontSize = `${size * 0.36}px`;
            parent.appendChild(span);
          }
        }} />
      </div>
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center font-black flex-shrink-0"
      style={{
        width: size, height: size,
        background: `${accentColor}20`,
        color: accentColor,
        border: `2px solid ${accentColor}40`,
        fontSize: `${size * 0.36}px`,
      }}>
      {initials}
    </div>
  );
};

// X13 — broadcast-style audio waveform bars, animated. Pure CSS.
const Waveform: React.FC<{ color: string; bars?: number; height?: number }> = ({ color, bars = 12, height = 18 }) => (
  <div className="flex items-end gap-[2px]" style={{ height }} aria-hidden>
    {Array.from({ length: bars }).map((_, i) => (
      <span key={i} style={{
        width: 2,
        height: '100%',
        background: color,
        borderRadius: 1,
        animation: `mercatoWave 1.${(i % 9) + 1}s ease-in-out ${i * 0.07}s infinite`,
        transformOrigin: 'bottom',
      }} />
    ))}
    <style>{`@keyframes mercatoWave { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }`}</style>
  </div>
);

// ─── Shared primitives ─────────────────────────────────────────────────────

const Pill: React.FC<{ t: UnifiedTheme; color?: string; label: string; pulse?: boolean; small?: boolean }> = ({ t, color, label, pulse, small }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wider ${small ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}`}
    style={{
      background: `${color || t.accent}20`,
      color: color || t.accent,
      border: `1px solid ${color || t.accent}50`,
    }}>
    {pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color || t.accent }} />}
    {label}
  </span>
);

const Header: React.FC<{
  t: UnifiedTheme;
  eyebrow: string;
  title: string;
  subtitle?: string;
  pills?: React.ReactNode;
  rightSlot?: React.ReactNode;
  accent?: string;
}> = ({ t, eyebrow, title, subtitle, pills, rightSlot, accent }) => (
  <div className="rounded-xl px-5 py-4 relative overflow-hidden" style={{
    background: t.surface,
    border: `1px solid ${t.border}`,
  }}>
    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
      background: `linear-gradient(to right, transparent, ${accent || t.accent}, transparent)`,
    }} />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: accent || t.accent }}>
          {eyebrow}
        </div>
        <div className="text-[24px] font-black leading-tight tracking-tight" style={{ color: t.text }}>{title}</div>
        {subtitle && <div className="text-[12px] mt-1" style={{ color: t.sub }}>{subtitle}</div>}
        {pills && <div className="flex flex-wrap gap-1.5 mt-2">{pills}</div>}
      </div>
      {rightSlot && <div className="shrink-0 text-right">{rightSlot}</div>}
    </div>
  </div>
);

const FieldCard: React.FC<{ t: UnifiedTheme; label: string; value: string; accent?: string; large?: boolean }> = ({ t, label, value, accent, large }) => (
  <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: t.dim }}>{label}</div>
    <div className={`font-black mt-1 ${large ? 'text-[28px]' : 'text-[20px]'}`} style={{ color: accent || t.text }}>
      {value || '—'}
    </div>
  </div>
);

const ProgressBar: React.FC<{ t: UnifiedTheme; value: number; color?: string; height?: number }> = ({ t, value, color, height = 4 }) => (
  <div className="w-full rounded-full overflow-hidden" style={{ background: `${color || t.accent}15`, height }}>
    <div className="h-full rounded-full transition-all" style={{
      width: `${Math.max(0, Math.min(100, value))}%`,
      background: color || t.accent,
    }} />
  </div>
);

// ─── Main router ────────────────────────────────────────────────────────────

export const MercatoUnifiedRenderer: React.FC<RendererProps> = ({ config, getField, containerStyle, contentWrapperStyle, playSound }) => {
  const variant = String(getField('mercatoVariant') || 'agent_call');
  const themeId = String(getField('visualTheme') || 'TACTICAL_DARK');
  const t = getTheme(themeId);

  // Phase-A-Hotfix-1 — UPDATE cue hook with module-level state.
  //
  // Previous implementation used a useRef first-mount guard which broke in
  // two real-world cases: (a) renderer remount on SSE reconnect and (b)
  // identical-seed re-runs caused by playSound prop reference instability.
  //
  // Now we delegate to evaluateTransitionAttempt() which:
  //   - Tracks watchedHash per overlay.id at module scope (survives remount).
  //   - Seeds on first sight, fires on subsequent change.
  //   - Records the reason for every block so DiagnosticStrip can show it.
  const watchedKey = [
    String(getField('chatLines') || ''),       // agent_call
    String(getField('callDuration') || ''),    // agent_call
    String(getField('probability') || ''),     // deal_radar
    String(getField('riskLevel') || ''),       // hijack_alert
    String(getField('medicalStage') || ''),    // medical_tracker
    String(getField('dealStage') || ''),       // deadline_hour
    String(getField('confidencePct') || ''),   // agent_call
    String(getField('timelineEntries') || ''), // here_we_go_buildup
    String(getField('sources') || ''),         // deal_radar / source_confidence
    String(getField('probabilityShiftMode') || ''), // probability_shift
    String(getField('updateDate') || ''),            // probability_shift
    String(getField('deal1NewPct') || ''),           // probability_shift
    String(getField('deal2NewPct') || ''),           // probability_shift
    String(getField('deal3NewPct') || ''),           // probability_shift
    String(getField('deal4NewPct') || ''),           // probability_shift
  ].join('|');

  useEffect(() => {
    const attempt = evaluateTransitionAttempt(config, watchedKey, !!playSound);
    if (attempt.blockedBy === null) {
      // Cue is allowed; OverlayRenderer.playSound applies its own gate
      // and resolves the actual cue id from audioUpdateCue / profile.
      void playSound('TRANSITION');
    }
  }, [watchedKey, playSound, config]);

  return (
    <div style={containerStyle}>
      <div style={contentWrapperStyle}>
        <div className="w-full h-full" style={{ background: t.bg, fontFamily: "'Tajawal', sans-serif" }}>
          {variant === 'agent_call' && <AgentCallVariant t={t} getField={getField} />}
          {variant === 'deal_radar' && <DealRadarVariant t={t} getField={getField} />}
          {variant === 'club_statement' && <ClubStatementVariant t={t} getField={getField} />}
          {variant === 'deadline_hour' && <DeadlineHourVariant t={t} getField={getField} />}
          {variant === 'source_confidence' && <SourceConfidenceVariant t={t} getField={getField} />}
          {variant === 'probability_shift' && <ProbabilityShiftVariant t={t} getField={getField} />}
          {variant === 'clause_reveal' && <ClauseRevealVariant t={t} getField={getField} />}
          {variant === 'medical_tracker' && <MedicalTrackerVariant t={t} getField={getField} />}
          {variant === 'hijack_alert' && <HijackAlertVariant t={t} getField={getField} />}
          {variant === 'personal_terms' && <PersonalTermsVariant t={t} getField={getField} />}
          {variant === 'here_we_go_buildup' && <HereWeGoBuildUpVariant t={t} getField={getField} />}
        </div>
      </div>
    </div>
  );
};

interface VariantProps {
  t: UnifiedTheme;
  getField: (id: string) => unknown;
}

// ─── 1. Agent Call (X13 polish — initials avatar, waveform, dynamic source) ───

const AgentCallVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const callerName = String(getField('callerName') || 'AGENT');
  const callerRole = String(getField('callerRole') || '');
  const callDuration = String(getField('callDuration') || '00:00');
  const callStatus = String(getField('callStatus') || 'live');
  const dealHeadline = String(getField('dealHeadline') || '');
  const playerName = String(getField('playerName') || '');
  const playerImage = String(getField('playerImage') || '');
  const clubFrom = String(getField('clubFrom') || '');
  const clubTo = String(getField('clubTo') || '');
  const dealValue = String(getField('dealValue') || '');
  const confidencePct = Math.max(0, Math.min(100, Number(getField('confidencePct') ?? 85)));
  const lines = safeParse<ChatLine[]>(String(getField('chatLines') || '[]'), []);
  const reporterLineCount = lines.filter(line => line.side !== 'agent').length;
  const agentLineCount = lines.filter(line => line.side === 'agent').length;
  const lastSignal = lines.length > 0 ? String(lines[lines.length - 1]?.text || '') : '';
  const negotiationStage =
    confidencePct >= 94 ? 'إغلاق وشيك' :
    confidencePct >= 82 ? 'حسم متقدم' :
    confidencePct >= 64 ? 'تفاوض نشط' :
    'رصد أولي';
  const negotiationColor =
    confidencePct >= 94 ? t.success :
    confidencePct >= 82 ? t.accent :
    confidencePct >= 64 ? t.warning :
    t.dim;

  const isLive = callStatus === 'live';
  const isPrivate = callStatus === 'private_source';
  const statusPill =
    callStatus === 'recorded'
      ? <Pill t={t} color={t.warning} label="مسجلة" small />
      : isPrivate
      ? <Pill t={t} color={t.accent2} label="مصدر خاص" small />
      : <Pill t={t} color={t.danger} label="مباشرة" pulse small />;

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      {/* Top bar: caller identity + status + duration */}
      <div className="rounded-xl px-5 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4 relative overflow-hidden" style={{
        background: `linear-gradient(135deg, ${t.surfaceDeep} 0%, ${t.surface} 55%, ${t.surfaceDeep} 100%)`,
        border: `1px solid ${t.border}`,
      }}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: `linear-gradient(to right, transparent, ${isLive ? t.danger : t.accent}, ${negotiationColor}, transparent)`,
        }} />
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar t={t} name={callerName} accent={t.accent} size={52} />
            {isLive && (
              <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center" style={{
                background: t.danger,
                border: `2px solid ${t.surfaceDeep}`,
              }}>
                <Icon name="phone" size={9} color="#fff" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {statusPill}
              <span className="text-[10px] font-mono" style={{ color: t.dim }}>{callDuration}</span>
              {isLive && <Waveform color={t.danger} bars={10} height={14} />}
            </div>
            <div className="text-[20px] font-black leading-tight mt-0.5" style={{ color: t.text }}>{callerName}</div>
            {callerRole && <div className="text-[11px]" style={{ color: t.sub }}>{callerRole}</div>}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: t.dim }}>MERCATO CALL ROOM</div>
          <div className="mt-1 text-[28px] font-black leading-none" style={{ color: t.text }}>غرفة اتصال الصفقة</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{
            background: `${negotiationColor}14`,
            border: `1px solid ${negotiationColor}55`,
            color: negotiationColor,
          }}>
            <Icon name="pulse" size={13} color={negotiationColor} />
            <span className="text-[10px] font-black">{negotiationStage}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.accent }}>المراسل</div>
          <div className="text-[14px] font-bold mt-0.5" style={{ color: t.text }}>REO MERCATO DESK</div>
          <div className="flex items-center gap-1.5 mt-1.5 justify-end">
            <span className="text-[9px] font-mono" style={{ color: t.dim }}>ثقة</span>
            <div className="w-20"><ProgressBar t={t} value={confidencePct} /></div>
            <span className="text-[10px] font-black font-mono" style={{ color: t.accent }}>{confidencePct}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[280px_1fr_250px] gap-3 min-h-0">
        {/* Left: Deal context */}
        <div className="rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden" style={{
          background: `linear-gradient(180deg, ${t.surface} 0%, ${t.surfaceDeep} 100%)`,
          border: `1px solid ${t.border}`,
        }}>
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full opacity-20 blur-2xl" style={{ background: t.accent2 }} />
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent2 }}>ملف الصفقة</div>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{
              background: `${negotiationColor}16`,
              color: negotiationColor,
              border: `1px solid ${negotiationColor}45`,
            }}>{confidencePct}%</span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar t={t} name={playerName} image={playerImage} accent={t.accent2} size={64} />
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-black leading-tight truncate" style={{ color: t.text }}>{playerName || '—'}</div>
              {dealHeadline && <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: t.sub }}>{dealHeadline}</div>}
            </div>
          </div>
          {(clubFrom || clubTo) && (
            <div className="rounded-lg p-2.5 flex items-center justify-between gap-2" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
              <div className="text-[10px] text-center flex-1">
                <div className="opacity-60 text-[8px]" style={{ color: t.dim }}>من</div>
                <div className="font-bold mt-0.5" style={{ color: t.text }}>{clubFrom || '—'}</div>
              </div>
              <div style={{ color: t.accent }}><Icon name="arrow" size={14} /></div>
              <div className="text-[10px] text-center flex-1">
                <div className="opacity-60 text-[8px]" style={{ color: t.dim }}>إلى</div>
                <div className="font-bold mt-0.5" style={{ color: t.text }}>{clubTo || '—'}</div>
              </div>
            </div>
          )}
          <div className="mt-auto rounded-lg px-3 py-2.5" style={{ background: t.accentSoft, border: `1px solid ${t.accent}40` }}>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: t.dim }}>القيمة</div>
            <div className="text-[20px] font-black leading-none mt-0.5" style={{ color: t.accent }}>{dealValue || '—'}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
              <div className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: t.dim }}>REPORTER</div>
              <div className="mt-1 text-[18px] font-black font-mono" style={{ color: t.accent }}>{reporterLineCount}</div>
            </div>
            <div className="rounded-lg p-2.5" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
              <div className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: t.dim }}>AGENT</div>
              <div className="mt-1 text-[18px] font-black font-mono" style={{ color: t.accent2 }}>{agentLineCount}</div>
            </div>
          </div>
        </div>

        {/* Center: Transcript */}
        <div className="rounded-xl flex flex-col overflow-hidden" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
          <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: t.border, background: t.surface }}>
            <div className="flex items-center gap-2">
              <Icon name="lock" size={13} color={t.accent} />
              <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>قناة مشفرة · transcript</div>
            </div>
            <div className="flex items-center gap-2">
              {isLive && <Waveform color={t.danger} bars={8} height={12} />}
              <div className="text-[9px] font-mono" style={{ color: t.dim }}>{lines.length} رسالة</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2" style={{ color: t.dim }}>
                <Icon name="phone" size={28} color={t.dim} />
                <div className="text-[12px]">في انتظار بدء المكالمة</div>
              </div>
            ) : (
              lines.map((line, i) => {
                const isAgent = line.side === 'agent';
                const lineRtl = isRtl(line.text);
                return (
                  <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[78%] rounded-2xl px-4 py-2" style={{
                      background: isAgent ? t.surfaceLight : t.accentSoft,
                      color: t.text,
                      border: `1px solid ${isAgent ? t.border : `${t.accent}40`}`,
                      borderBottomLeftRadius: isAgent ? '4px' : undefined,
                      borderBottomRightRadius: isAgent ? undefined : '4px',
                    }}>
                      <div className="text-[8px] font-bold uppercase opacity-60 mb-0.5" style={{ color: isAgent ? t.sub : t.accent }}>
                        {isAgent ? 'AGENT' : 'REPORTER'}
                      </div>
                      <div className="text-[13px] leading-relaxed" style={{
                        direction: lineRtl ? 'rtl' : 'ltr',
                        textAlign: lineRtl ? 'right' : 'left',
                      }}>{line.text}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Source / dynamic stages from chat length */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: isPrivate ? t.accent2 : t.warning }}>المصدر</div>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{
              background: `${isPrivate ? t.accent2 : t.warning}14`,
              color: isPrivate ? t.accent2 : t.warning,
              border: `1px solid ${isPrivate ? t.accent2 : t.warning}45`,
            }}>{isPrivate ? 'مغلق' : 'متابعة'}</span>
          </div>
          <div className="rounded-lg p-3 text-center" style={{
            background: t.surfaceDeep,
            border: `1px dashed ${isPrivate ? t.accent2 : t.border}`,
          }}>
            <div className="flex justify-center mb-1.5"><Icon name="lock" size={26} color={isPrivate ? t.accent2 : t.warning} /></div>
            <div className="text-[11px] font-bold" style={{ color: t.text }}>{isPrivate ? 'مصدر خاص مغلق' : 'مصدر مغلق'}</div>
            <div className="text-[9px] mt-1" style={{ color: t.dim }}>المعلومة من داخل غرفة المفاوضات</div>
          </div>
          {lastSignal && (
            <div className="rounded-lg p-3" style={{ background: `${t.accent}10`, border: `1px solid ${t.accent}40` }}>
              <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>آخر إشارة</div>
              <div className="mt-1 text-[11px] leading-relaxed line-clamp-3" style={{
                color: t.text,
                direction: isRtl(lastSignal) ? 'rtl' : 'ltr',
                textAlign: isRtl(lastSignal) ? 'right' : 'left',
              }}>{lastSignal}</div>
            </div>
          )}
          <div className="rounded-lg p-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: t.sub }}>تقدم الصفقة</div>
            <div className="space-y-1.5">
              {/* Stages now reflect confidencePct so the right panel feels alive */}
              {[
                { label: 'اتفاق المبدأ', threshold: 40 },
                { label: 'الفحص الطبي', threshold: 70 },
                { label: 'الإعلان الرسمي', threshold: 95 },
              ].map((stage, i) => {
                const reached = confidencePct >= stage.threshold;
                const active = confidencePct >= (i === 0 ? 0 : [40, 70][i - 1]) && confidencePct < stage.threshold;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'animate-pulse' : ''}`} style={{
                      background: reached ? t.success : active ? t.warning : t.dim,
                    }} />
                    <span className="text-[10px]" style={{ color: reached ? t.text : active ? t.text : t.dim }}>{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-auto text-[9px] font-mono text-center opacity-60" style={{ color: t.dim }}>
            REO MERCATO INTEL
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 2. Deal Radar (X13 polish — real blips, tier colors) ─────────────────

const DealRadarVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const probability = Math.max(0, Math.min(100, Number(getField('probability') ?? 65)));
  const sources = safeParse<{ name: string; reliability: number }[]>(String(getField('sources') || '[]'), []);
  const normalizedSources = sources.map(source => ({
    ...source,
    reliability: Math.max(0, Math.min(100, Number(source.reliability) || 0)),
  }));
  const sortedSources = [...normalizedSources].sort((left, right) => right.reliability - left.reliability);
  const eliteSources = normalizedSources.filter(source => source.reliability >= 80).length;
  const averageReliability = normalizedSources.length === 0
    ? 0
    : Math.round(normalizedSources.reduce((sum, source) => sum + source.reliability, 0) / normalizedSources.length);
  const marketSignal = normalizedSources.length === 0
    ? probability
    : Math.round((probability * 0.62) + (averageReliability * 0.38));
  const verdict =
    marketSignal >= 84 ? 'جاهز للإعلان' :
    marketSignal >= 68 ? 'مرحلة الحسم' :
    marketSignal >= 46 ? 'تفاوض نشط' :
    'مراقبة هادئة';
  const verdictColor =
    marketSignal >= 84 ? t.success :
    marketSignal >= 68 ? t.accent :
    marketSignal >= 46 ? t.warning :
    t.dim;
  const cx = 120, cy = 120, R = 96;
  const sweepRad = (probability / 100) * 2 * Math.PI;

  // X13 — color a source pill by reliability tier (green ≥80 / amber ≥50 / red below).
  const tierColor = (rel: number) => rel >= 80 ? t.success : rel >= 50 ? t.warning : t.danger;
  const tierLabel = (rel: number) => rel >= 80 ? 'مصدر ذهبي' : rel >= 50 ? 'مصدر مراقب' : 'إشارة ضعيفة';

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="DEAL RADAR · غرفة قرار السوق"
        title={playerName || 'رادار صفقة'}
        subtitle="مؤشر حسم الصفقة مبني على الاحتمالية وقوة المصادر المرصودة"
        pills={
          <>
            <Pill t={t} label={`${probability}% احتمالية`} pulse />
            <Pill t={t} color={t.success} label={`${eliteSources} مصادر ذهبية`} small />
            <Pill t={t} color={verdictColor} label={verdict} small />
          </>
        }
        rightSlot={
          <div className="rounded-xl px-4 py-2 min-w-[150px]" style={{
            background: `${verdictColor}12`,
            border: `1px solid ${verdictColor}55`,
          }}>
            <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>MARKET SIGNAL</div>
            <div className="mt-1 flex items-end justify-end gap-1">
              <span className="font-mono text-[42px] font-black leading-none" style={{ color: verdictColor }}>{marketSignal}</span>
              <span className="pb-1 text-[12px] font-black" style={{ color: t.sub }}>%</span>
            </div>
          </div>
        }
      />
      <div className="flex-1 grid grid-cols-[300px_1fr_240px] gap-3 min-h-0">
        <div className="rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{
          background: `linear-gradient(180deg, ${t.surface} 0%, ${t.surfaceDeep} 100%)`,
          border: `1px solid ${t.border}`,
        }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(circle at 50% 45%, ${t.accent}16 0%, transparent 58%)`,
          }} />
          <svg width="240" height="240" viewBox="0 0 240 240" className="relative z-10">
            <defs>
              <radialGradient id="dealRadarGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={t.accent} stopOpacity="0.22" />
                <stop offset="70%" stopColor={t.accent} stopOpacity="0.04" />
                <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r={R + 12} fill="url(#dealRadarGlow)" />
            {[1, 0.72, 0.46, 0.2].map((m, i) => (
              <circle key={i} cx={cx} cy={cy} r={R * m} fill="none" stroke={i === 0 ? `${t.accent}80` : t.border} strokeWidth={i === 0 ? 1.5 : 1} />
            ))}
            {[0, 45, 90, 135].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={cx - (R + 8) * Math.cos(rad)}
                  y1={cy - (R + 8) * Math.sin(rad)}
                  x2={cx + (R + 8) * Math.cos(rad)}
                  y2={cy + (R + 8) * Math.sin(rad)}
                  stroke={t.border}
                  strokeWidth="1"
                />
              );
            })}
            <path
              d={`M ${cx} ${cy} L ${cx + R * Math.cos(-Math.PI / 2)} ${cy + R * Math.sin(-Math.PI / 2)} A ${R} ${R} 0 ${probability > 50 ? 1 : 0} 1 ${cx + R * Math.cos(-Math.PI / 2 + sweepRad)} ${cy + R * Math.sin(-Math.PI / 2 + sweepRad)} Z`}
              fill={verdictColor}
              opacity={0.26}
            />
            {normalizedSources.slice(0, 10).map((s, i) => {
              const angle = (i / Math.max(normalizedSources.length, 1)) * 2 * Math.PI - Math.PI / 2;
              const ringRadius = R * (s.reliability >= 80 ? 0.34 : s.reliability >= 50 ? 0.62 : 0.9);
              const bx = cx + ringRadius * Math.cos(angle);
              const by = cy + ringRadius * Math.sin(angle);
              const c = tierColor(s.reliability);
              return (
                <g key={i}>
                  <circle cx={bx} cy={by} r="9" fill={c} opacity="0.16" />
                  <circle cx={bx} cy={by} r="4" fill={c} />
                  <text x={bx} y={by - 12} textAnchor="middle" fill={c} fontSize="7" fontWeight="900">{s.reliability}</text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r="34" fill={t.surfaceDeep} stroke={verdictColor} strokeWidth="2" />
            <text x={cx} y={cy + 5} textAnchor="middle" fill={verdictColor} fontSize="34" fontWeight="900">{probability}</text>
            <text x={cx} y={cy + 24} textAnchor="middle" fill={t.dim} fontSize="9" fontWeight="800">DEAL %</text>
          </svg>
          <div className="mt-1 text-center">
            <div className="text-[10px] font-black" style={{ color: verdictColor }}>{verdict}</div>
            <div className="text-[9px] font-mono mt-0.5 opacity-70" style={{ color: t.dim }}>{normalizedSources.length} مصدر مرصود · متوسط {averageReliability}%</div>
          </div>
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>المصادر · موثوقية</div>
            <div className="text-[10px] font-mono" style={{ color: t.dim }}>TOP {Math.min(sortedSources.length, 6)}</div>
          </div>
          {normalizedSources.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: t.dim }}>
              <Icon name="pulse" size={28} color={t.dim} />
              <div className="text-[12px]">في انتظار رصد المصادر</div>
            </div>
          ) : (
            <div className={`flex-1 flex flex-col gap-2 overflow-y-auto ${sortedSources.length <= 6 ? 'justify-center' : ''}`}>
              {sortedSources.map((s, i) => {
                const c = tierColor(s.reliability);
                return (
                  <div key={i} className="rounded-lg p-2.5" style={{
                    background: i === 0 ? `${c}10` : t.surfaceDeep,
                    border: `1px solid ${i === 0 ? `${c}55` : t.border}`,
                  }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                        <span className="text-[12px] font-bold truncate" style={{ color: t.text }}>{s.name}</span>
                      </div>
                      <span className="text-[12px] font-mono font-black flex-shrink-0" style={{ color: c }}>{s.reliability}%</span>
                    </div>
                    <div className="mb-1 text-[9px] font-bold" style={{ color: c }}>{tierLabel(s.reliability)}</div>
                    <ProgressBar t={t} value={s.reliability} color={c} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: verdictColor }}>قرار البث</div>
          <div className="rounded-xl p-4 text-center" style={{ background: `${verdictColor}10`, border: `1px solid ${verdictColor}55` }}>
            <div className="flex justify-center mb-2"><Icon name={marketSignal >= 84 ? 'check' : marketSignal >= 46 ? 'pulse' : 'warning'} size={28} color={verdictColor} /></div>
            <div className="text-[20px] font-black leading-tight" style={{ color: verdictColor }}>{verdict}</div>
            <div className="mt-1 text-[10px] leading-relaxed" style={{ color: t.sub }}>
              {marketSignal >= 84
                ? 'جاهز لشريط عاجل أو إعلان رسمي.'
                : marketSignal >= 68
                ? 'ضعه في أعلى جدول المتابعة.'
                : marketSignal >= 46
                ? 'يحتاج مصدرًا ذهبيًا إضافيًا.'
                : 'اتركه في المراقبة دون تضخيم.'}
            </div>
          </div>
          <FieldCard t={t} label="متوسط المصادر" value={`${averageReliability}%`} accent={t.accent} />
          <FieldCard t={t} label="مصادر ذهبية" value={`${eliteSources}`} accent={t.success} />
          <div className="mt-auto rounded-lg p-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>TOP SOURCE</div>
            <div className="mt-1 truncate text-[13px] font-black" style={{ color: t.text }}>
              {sortedSources[0]?.name || 'لا يوجد مصدر'}
            </div>
            <div className="mt-1 text-[10px] font-mono" style={{ color: sortedSources[0] ? tierColor(sortedSources[0].reliability) : t.dim }}>
              {sortedSources[0] ? `${sortedSources[0].reliability}%` : '--'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 3. Club Statement (X13 polish — monogram, no emoji watermark) ────────

const ClubStatementVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const clubName = String(getField('clubName') || 'CLUB');
  const statementTitle = String(getField('statementTitle') || 'بيان رسمي');
  const statementBody = String(getField('statementBody') || '');
  const statementDate = String(getField('statementDate') || '');
  // Build a 2-letter monogram from the club name for the corner stamp
  const monogram = getInitials(clubName);
  const bodyLength = statementBody.trim().split(/\s+/).filter(Boolean).length;
  const documentCode = `${monogram || 'CL'}-${String(bodyLength || 0).padStart(3, '0')}`;

  return (
    <div className="w-full h-full p-5 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-5xl h-full max-h-[520px] rounded-2xl relative overflow-hidden grid grid-cols-[210px_1fr]" style={{
        background: `linear-gradient(135deg, ${t.surfaceDeep} 0%, ${t.surface} 58%, ${t.surfaceDeep} 100%)`,
        border: `1px solid ${t.border}`,
        boxShadow: '0 22px 70px rgba(0,0,0,0.22)',
      }}>
        {/* Top accent strip */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{
          background: `linear-gradient(to right, transparent, ${t.accent}, ${t.warning}, transparent)`,
        }} />
        {/* Left monogram column */}
        <div className="flex flex-col items-center justify-center p-6 border-l" style={{
          borderColor: t.border,
          background: `linear-gradient(180deg, ${t.surfaceDeep} 0%, ${t.surface} 100%)`,
        }}>
          <div className="rounded-2xl flex items-center justify-center mb-3" style={{
            width: 118, height: 118,
            background: `${t.accent}16`,
            border: `2px solid ${t.accent}80`,
            color: t.accent,
            fontSize: 42,
            fontWeight: 900,
            boxShadow: `0 0 28px ${t.accent}20`,
          }}>
            {monogram}
          </div>
          <Icon name="stamp" size={22} color={t.accent} />
          <div className="text-[9px] font-black uppercase tracking-[0.3em] mt-1.5" style={{ color: t.dim }}>OFFICIAL</div>
          <div className="mt-5 w-full rounded-xl p-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
            <div className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>DOCUMENT ID</div>
            <div className="mt-1 font-mono text-[18px] font-black" style={{ color: t.accent }}>{documentCode}</div>
          </div>
          <div className="mt-2 w-full rounded-xl p-3" style={{ background: `${t.warning}12`, border: `1px solid ${t.warning}45` }}>
            <div className="flex items-center justify-center gap-2">
              <Icon name="check" size={15} color={t.warning} />
              <span className="text-[10px] font-black" style={{ color: t.warning }}>جاهز للنشر</span>
            </div>
            <div className="mt-1 text-center text-[9px]" style={{ color: t.dim }}>صياغة رسمية قابلة للبث</div>
          </div>
        </div>
        {/* Body */}
        <div className="p-7 flex flex-col min-w-0">
          <div className="flex items-center justify-between border-b pb-3 mb-5" style={{ borderColor: t.border }}>
            <Pill t={t} label="بيان رسمي" pulse />
            <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: t.dim }}>
              <Icon name="clock" size={11} color={t.dim} />
              {statementDate || '—'}
            </div>
          </div>
          <div className="text-[30px] font-black mb-2 leading-tight" style={{ color: t.text }}>{clubName}</div>
          <div className="text-[21px] font-black mb-5 leading-tight" style={{ color: t.accent }}>{statementTitle}</div>
          <div className="flex-1 rounded-xl p-5 overflow-y-auto text-[15px] leading-loose whitespace-pre-line" style={{
            background: `${t.surfaceDeep}cc`,
            border: `1px solid ${t.border}`,
            borderRight: `4px solid ${t.accent}`,
            color: t.sub,
            direction: isRtl(statementBody) ? 'rtl' : 'ltr',
            textAlign: isRtl(statementBody) ? 'right' : 'left',
          }}>{statementBody || '— نص البيان —'}</div>
        </div>
      </div>
    </div>
  );
};

// ─── 4. Deadline Hour (X13 polish — glow active stage + timer panel) ─────

const DeadlineHourVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const status = String(getField('dealStatus') || 'مفاوضات');
  const rawMinutes = Number(getField('minutesLeft') || 0);
  const rawSeconds = Number(getField('secondsLeft') || 0);
  const minutes = String(Math.max(0, rawMinutes || 0)).padStart(2, '0');
  const seconds = String(Math.max(0, rawSeconds || 0)).padStart(2, '0');
  const stage = String(getField('dealStage') || 'agreement');

  const stages = [
    { id: 'rumor', label: 'شائعة' },
    { id: 'talks', label: 'محادثات' },
    { id: 'agreement', label: 'اتفاق' },
    { id: 'medical', label: 'طبي' },
    { id: 'announce', label: 'إعلان' },
  ];
  const idx = stages.findIndex(s => s.id === stage);
  // Compute progress percent across the 5 stages.
  const progressPct = idx >= 0 ? Math.round(((idx + 0.5) / stages.length) * 100) : 0;
  const totalSeconds = Math.max(0, (rawMinutes || 0) * 60 + (rawSeconds || 0));
  const urgencyColor = totalSeconds <= 300 ? t.danger : totalSeconds <= 900 ? t.warning : t.accent;
  const urgencyLabel = totalSeconds <= 300 ? 'لحظة حسم' : totalSeconds <= 900 ? 'ضغط مرتفع' : 'نافذة مفتوحة';
  const activeStageLabel = stages[idx]?.label || '—';
  const nextStageLabel = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1].label : 'الإعلان';

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="DEADLINE HOUR · ساعة الحسم"
        title={playerName || '—'}
        subtitle={status}
        accent={urgencyColor}
        pills={
          <>
            <Pill t={t} color={urgencyColor} label={urgencyLabel} pulse />
            <Pill t={t} color={t.accent} label={activeStageLabel} small />
          </>
        }
        rightSlot={
          <div className="rounded-xl px-4 py-2 inline-flex items-center gap-3" style={{
            background: `${urgencyColor}10`,
            border: `1px solid ${urgencyColor}50`,
            boxShadow: `0 0 24px ${urgencyColor}30`,
          }}>
            <Icon name="clock" size={22} color={urgencyColor} />
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: t.dim }}>الوقت المتبقي</div>
              <div className="font-mono font-black leading-none mt-0.5" style={{ color: urgencyColor, fontSize: '46px' }}>
                {minutes}:{seconds}
              </div>
            </div>
          </div>
        }
      />
      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-3">
        <div className="rounded-xl p-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
          <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>المرحلة الحالية</div>
          <div className="mt-1 text-[24px] font-black" style={{ color: t.accent }}>{activeStageLabel}</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: `${urgencyColor}12`, border: `1px solid ${urgencyColor}50` }}>
          <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>قرار غرفة البث</div>
          <div className="mt-1 text-[25px] font-black" style={{ color: urgencyColor }}>{urgencyLabel}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
          <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>الخطوة التالية</div>
          <div className="mt-1 text-[24px] font-black" style={{ color: t.success }}>{nextStageLabel}</div>
        </div>
      </div>
      <div className="flex-1 rounded-xl p-5 flex flex-col justify-center gap-4 relative overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="absolute -bottom-14 -left-10 opacity-[0.045] pointer-events-none">
          <Icon name="clock" size={260} color={urgencyColor} />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>المرحلة الحالية</div>
          <div className="text-[10px] font-mono" style={{ color: t.dim }}>{progressPct}% من المسار</div>
        </div>
        <div className="flex items-stretch gap-2">
          {stages.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <React.Fragment key={s.id}>
                <div className="flex-1 rounded-lg p-3 text-center transition-all relative" style={{
                  background: active ? t.accent : done ? `${t.success}25` : t.surfaceDeep,
                  color: active ? '#000' : done ? t.success : t.dim,
                  border: `1px solid ${active ? t.accent : done ? t.success : t.border}`,
                  boxShadow: active ? `0 0 18px ${t.accent}60` : 'none',
                }}>
                  <div className="text-[10px] font-mono opacity-70">0{i + 1}</div>
                  <div className="text-[12px] font-black mt-1">{s.label}</div>
                  {active && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full animate-pulse" style={{
                      background: t.accent,
                      boxShadow: `0 0 8px ${t.accent}`,
                    }} />
                  )}
                </div>
                {i < stages.length - 1 && (
                  <div className="flex items-center" style={{ color: i < idx ? t.success : t.dim }}>
                    <Icon name="arrow" size={14} color={i < idx ? t.success : t.dim} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div>
          <ProgressBar t={t} value={progressPct} color={urgencyColor} height={5} />
        </div>
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{
          background: `${urgencyColor}10`,
          border: `1px solid ${urgencyColor}35`,
        }}>
          <div className="flex items-center gap-2">
            <Icon name="pulse" size={14} color={urgencyColor} />
            <span className="text-[11px] font-black" style={{ color: t.text }}>غرفة الحسم تراقب آخر تحديث قبل الإغلاق</span>
          </div>
          <span className="text-[10px] font-mono font-black" style={{ color: urgencyColor }}>DEADLINE SYNC</span>
        </div>
      </div>
    </div>
  );
};

// ─── 5. Source Confidence (X13 polish — empty state, source-type icons) ──

const SourceConfidenceVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const sources = safeParse<{ name: string; tier: 'A' | 'B' | 'C'; status: string }[]>(String(getField('sources') || '[]'), []);
  const tierColor = (tier: string) => tier === 'A' ? t.success : tier === 'B' ? t.warning : t.danger;
  const tierLabels: Record<string, string> = { A: 'مستوى A — تأكيد', B: 'مستوى B — محتمل', C: 'مستوى C — شائعة' };
  const tierIcons: Record<string, string> = { A: 'check', B: 'pulse', C: 'warning' };

  // Aggregate counts so the header summarizes at a glance.
  const counts = { A: 0, B: 0, C: 0 } as Record<'A' | 'B' | 'C', number>;
  sources.forEach(s => { if (s.tier in counts) counts[s.tier]++; });
  const total = sources.length;
  const supportPct = total === 0 ? 0 : Math.round(((counts.A + counts.B * 0.5) / total) * 100);
  const decisionColor = supportPct >= 75 ? t.success : supportPct >= 45 ? t.warning : t.danger;
  const decisionLabel = supportPct >= 75 ? 'قابل للبث' : supportPct >= 45 ? 'انتظار مصدر ثان' : 'لا تبث الآن';
  const strongestSource = sources.find(s => s.tier === 'A') || sources.find(s => s.tier === 'B') || sources[0];

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="SOURCE CONFIDENCE BOARD"
        title="لوحة ثقة المصادر"
        subtitle={total === 0 ? 'بانتظار رصد المصادر' : `${total} مصدر · ${supportPct}% تأييد إجمالي`}
        accent={decisionColor}
        pills={
          <>
            <Pill t={t} color={decisionColor} label={decisionLabel} pulse={supportPct >= 75} />
            {strongestSource && <Pill t={t} color={tierColor(strongestSource.tier)} label={`أقوى مصدر: ${strongestSource.name}`} small />}
          </>
        }
        rightSlot={total > 0 ? (
          <div className="flex items-center gap-3">
            {(['A','B','C'] as const).map(tier => (
              <div key={tier} className="text-center">
                <div className="text-[20px] font-black font-mono leading-none" style={{ color: tierColor(tier) }}>{counts[tier]}</div>
                <div className="text-[8px] font-bold uppercase mt-0.5" style={{ color: t.dim }}>tier {tier}</div>
              </div>
            ))}
          </div>
        ) : undefined}
      />
      <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-3">
        <div className="rounded-xl p-4" style={{ background: `${decisionColor}10`, border: `1px solid ${decisionColor}45` }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>قرار غرفة الأخبار</div>
              <div className="mt-1 text-[25px] font-black" style={{ color: decisionColor }}>{decisionLabel}</div>
            </div>
            <div className="text-left">
              <div className="font-mono text-[34px] font-black leading-none" style={{ color: decisionColor }}>{supportPct}%</div>
              <div className="text-[9px] mt-1" style={{ color: t.dim }}>confidence mix</div>
            </div>
          </div>
          <div className="mt-3"><ProgressBar t={t} value={supportPct} color={decisionColor} height={6} /></div>
        </div>
        <FieldCard t={t} label="مصادر مؤكدة" value={String(counts.A)} accent={t.success} />
        <FieldCard t={t} label="مصادر مراقبة" value={String(counts.B + counts.C)} accent={t.warning} />
      </div>
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        {(['A', 'B', 'C'] as const).map(tier => {
          const matching = sources.filter(s => s.tier === tier);
          return (
            <div key={tier} className="rounded-xl p-4 flex flex-col" style={{
              background: t.surface,
              border: `2px solid ${tierColor(tier)}40`,
            }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon name={tierIcons[tier]} size={14} color={tierColor(tier)} />
                  <div>
                    <div className="text-[12px] font-black uppercase" style={{ color: tierColor(tier) }}>{tierLabels[tier]}</div>
                    <div className="text-[8px] font-mono mt-0.5" style={{ color: t.dim }}>{matching.length === 1 ? 'single source lane' : `${matching.length} sources lane`}</div>
                  </div>
                </div>
                <span className="text-[20px] font-black font-mono" style={{ color: tierColor(tier) }}>{matching.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {matching.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center" style={{ color: t.dim }}>
                    <span className="text-[10px] opacity-60">لا مصادر في هذه الطبقة</span>
                  </div>
                ) : (
                  matching.map((s, i) => (
                    <div key={i} className="rounded-lg p-2" style={{
                      background: t.surfaceDeep,
                      border: `1px solid ${tierColor(tier)}30`,
                      borderRightWidth: 3,
                      borderRightColor: tierColor(tier),
                    }}>
                      <div className="text-[11px] font-bold" style={{
                        color: t.text,
                        direction: isRtl(s.name) ? 'rtl' : 'ltr',
                        textAlign: isRtl(s.name) ? 'right' : 'left',
                      }}>{s.name}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: t.sub }}>{s.status}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 6. Probability Shift Matrix (old → today update, motion + update cue) ───

interface ProbabilityShiftDeal {
  idx: number;
  player: string;
  fromClub: string;
  toClub: string;
  image: string;
  oldPct: number;
  newPct: number;
}

const clampPercent = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const probabilityColor = (pct: number, t: UnifiedTheme): string => {
  if (pct >= 80) return '#64ff6a';
  if (pct >= 62) return t.accent;
  if (pct >= 45) return t.warning;
  return '#ff5c8a';
};

const probabilityLabel = (pct: number): string => {
  if (pct >= 80) return 'ساخنة جدًا';
  if (pct >= 62) return 'متقدمة';
  if (pct >= 45) return 'سباق مفتوح';
  return 'إشارة منخفضة';
};

const ProbabilityShiftVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const title = String(getField('matrixTitle') || 'مصفوفة نسب الصفقات');
  const subtitle = String(getField('matrixSubtitle') || 'نموذج احتمالات ميركاتو');
  const mode = String(getField('probabilityShiftMode') || 'old');
  const layout = String(getField('matrixLayout') || 'split_board');
  const updateDate = String(getField('updateDate') || '');
  const featuredDealIndex = Math.max(1, Math.min(4, Number(getField('featuredDealIndex') || 1)));
  const showNew = mode === 'new';

  const deals: ProbabilityShiftDeal[] = [1, 2, 3, 4].map(idx => ({
    idx,
    player: String(getField(`deal${idx}Player`) || `هدف ${idx}`),
    fromClub: String(getField(`deal${idx}From`) || ''),
    toClub: String(getField(`deal${idx}To`) || 'Barcelona'),
    image: String(getField(`deal${idx}Image`) || ''),
    oldPct: clampPercent(getField(`deal${idx}OldPct`), 40),
    newPct: clampPercent(getField(`deal${idx}NewPct`), 55),
  }));

  const visibleDeals = deals.filter(deal => deal.player.trim());
  const featured = visibleDeals.find(deal => deal.idx === featuredDealIndex) || visibleDeals[0] || deals[0];
  const activePct = (deal: ProbabilityShiftDeal) => showNew ? deal.newPct : deal.oldPct;
  const delta = (deal: ProbabilityShiftDeal) => deal.newPct - deal.oldPct;
  const hotCount = visibleDeals.filter(deal => deal.newPct >= 75).length;
  const watchCount = visibleDeals.filter(deal => deal.newPct >= 50 && deal.newPct < 75).length;
  const lowCount = visibleDeals.length - hotCount - watchCount;
  const avgOld = visibleDeals.length ? Math.round(visibleDeals.reduce((sum, deal) => sum + deal.oldPct, 0) / visibleDeals.length) : 0;
  const avgNew = visibleDeals.length ? Math.round(visibleDeals.reduce((sum, deal) => sum + deal.newPct, 0) / visibleDeals.length) : 0;
  const modeColor = showNew ? probabilityColor(featured.newPct, t) : '#ff5c8a';
  const totalMovement = avgNew - avgOld;

  const ClubRoute: React.FC<{ from?: string; to?: string; align?: 'start' | 'center' }> = ({ from, to, align = 'start' }) => (
    <div
      className={`mt-0.5 flex min-w-0 items-center gap-1 text-[10px] ${align === 'center' ? 'justify-center' : 'justify-start'}`}
      style={{ color: t.sub }}
      dir="rtl"
    >
      <span className="truncate" dir="ltr">{from || 'النادي الحالي'}</span>
      <span className="shrink-0">إلى</span>
      <span className="truncate" dir="ltr">{to || 'Barcelona'}</span>
    </div>
  );

  const PercentPair: React.FC<{ deal: ProbabilityShiftDeal; compact?: boolean }> = ({ deal, compact = false }) => {
    const change = delta(deal);
    const activeColor = probabilityColor(activePct(deal), t);
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-black">
          <span className="rounded px-1.5 py-0.5" style={{ color: '#ff5c8a', background: 'rgba(255,92,138,0.10)' }}>قديم {deal.oldPct}%</span>
          <span className="rounded px-1.5 py-0.5" style={{ color: activeColor, background: `${activeColor}12` }}>اليوم {deal.newPct}%</span>
          <span className="rounded px-1.5 py-0.5" style={{ color: change >= 0 ? t.success : '#ff5c8a', background: change >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(255,92,138,0.10)' }}>
            {change >= 0 ? '+' : ''}{change}
          </span>
        </div>
      );
    }
    return (
      <div className={`grid grid-cols-3 ${compact ? 'gap-1' : 'gap-1.5'}`}>
        <div className="rounded-md px-2 py-1.5" style={{ background: 'rgba(255,92,138,0.10)', border: '1px solid rgba(255,92,138,0.28)' }}>
          <div className="text-[7px] font-black uppercase tracking-[0.14em]" style={{ color: t.dim }}>قديم</div>
          <div className={`font-mono font-black ${compact ? 'text-[13px]' : 'text-[16px]'}`} style={{ color: '#ff5c8a' }}>{deal.oldPct}%</div>
        </div>
        <div className="rounded-md px-2 py-1.5" style={{ background: `${activeColor}12`, border: `1px solid ${activeColor}35` }}>
          <div className="text-[7px] font-black uppercase tracking-[0.14em]" style={{ color: t.dim }}>اليوم</div>
          <div className={`font-mono font-black ${compact ? 'text-[13px]' : 'text-[16px]'}`} style={{ color: activeColor }}>{deal.newPct}%</div>
        </div>
        <div className="rounded-md px-2 py-1.5" style={{ background: change >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(255,92,138,0.10)', border: `1px solid ${change >= 0 ? 'rgba(34,197,94,0.28)' : 'rgba(255,92,138,0.28)'}` }}>
          <div className="text-[7px] font-black uppercase tracking-[0.14em]" style={{ color: t.dim }}>الحركة</div>
          <div className={`font-mono font-black ${compact ? 'text-[13px]' : 'text-[16px]'}`} style={{ color: change >= 0 ? t.success : '#ff5c8a' }}>{change >= 0 ? '+' : ''}{change}</div>
        </div>
      </div>
    );
  };

  const DealRow: React.FC<{ deal: ProbabilityShiftDeal; compact?: boolean }> = ({ deal, compact = false }) => {
    const pct = activePct(deal);
    const color = probabilityColor(pct, t);
    const change = delta(deal);
    return (
      <div className="rounded-lg p-3 relative overflow-hidden transition-all duration-700" style={{
        background: deal.idx === featured.idx ? `linear-gradient(135deg, ${color}16 0%, ${t.surface} 68%)` : t.surface,
        border: `1px solid ${deal.idx === featured.idx ? `${color}80` : t.border}`,
        boxShadow: deal.idx === featured.idx ? `0 0 0 1px ${color}14 inset` : 'none',
      }}>
        <div className="absolute top-0 bottom-0 right-0 w-[3px]" style={{ background: color }} />
        <div className="flex items-center gap-3">
          <Avatar t={t} name={deal.player} image={deal.image} accent={color} size={compact ? 42 : 52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate font-black leading-tight" style={{ color: t.text, fontSize: compact ? 14 : 18 }}>{deal.player}</div>
              <div className="font-mono font-black" style={{ color, fontSize: compact ? 20 : 28 }}>{pct}%</div>
            </div>
            <ClubRoute from={deal.fromClub} to={deal.toClub} />
            <div className="mt-2">
              <PercentPair deal={deal} compact={compact} />
            </div>
            <div className="mt-2 relative h-2 rounded-full overflow-hidden" style={{ background: `${color}16` }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
              {showNew && (
                <span className="absolute top-0 h-full w-[2px]" style={{ right: `${100 - deal.oldPct}%`, background: '#fff', opacity: 0.65 }} />
              )}
            </div>
            {!compact && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] font-black" style={{ color }}>{probabilityLabel(pct)}</span>
                <span className="text-[9px] font-mono font-black" style={{ color: change >= 0 ? t.success : '#ff5c8a' }}>
                  {showNew ? `${change >= 0 ? '+' : ''}${change}%` : `قديم ${deal.oldPct}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const HeaderBar = () => (
    <div className="rounded-xl px-5 py-3 flex items-center justify-between relative overflow-hidden" style={{
      background: `linear-gradient(135deg, ${t.surfaceDeep} 0%, ${t.surface} 100%)`,
      border: `1px solid ${t.border}`,
    }}>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${modeColor}, ${t.accent2}, transparent)` }} />
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: showNew ? t.success : '#ff5c8a' }}>
          {showNew ? 'تحديث اليوم / REO SHOW' : 'النموذج القديم للنسب'}
        </div>
        <div className="mt-1 text-[28px] font-black leading-none" style={{ color: t.text }}>{title}</div>
        <div className="mt-1 text-[11px]" style={{ color: t.sub }}>{subtitle}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl px-3 py-2 text-center" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
          <div className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>النموذج القديم</div>
          <div className="mt-1 font-mono text-[24px] font-black" style={{ color: '#ff5c8a' }}>{avgOld}%</div>
        </div>
        <div className="rounded-xl px-3 py-2 text-center" style={{ background: `${modeColor}12`, border: `1px solid ${modeColor}55` }}>
          <div className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: t.dim }}>{showNew ? 'نسب اليوم' : 'جاهز للتحديث'}</div>
          <div className="mt-1 font-mono text-[24px] font-black" style={{ color: modeColor }}>{showNew ? `${avgNew}%` : 'LIVE'}</div>
        </div>
        <Pill t={t} color={modeColor} label={showNew ? `تحديث ${updateDate || 'اليوم'}` : 'يعرض القديم'} pulse={showNew} />
      </div>
    </div>
  );

  if (layout === 'luxury_wall') {
    return (
      <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
        <HeaderBar />
        <div className="flex-1 grid grid-cols-[420px_1fr] gap-3 min-h-0">
          <div className="rounded-lg relative overflow-hidden p-5 flex flex-col" style={{
            background: `linear-gradient(145deg, ${modeColor}18 0%, ${t.surfaceDeep} 42%, ${t.surface} 100%)`,
            border: `1px solid ${modeColor}70`,
            boxShadow: `0 0 0 1px ${modeColor}10 inset`,
          }}>
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: `linear-gradient(${modeColor} 1px, transparent 1px), linear-gradient(90deg, ${modeColor} 1px, transparent 1px)`,
              backgroundSize: '42px 42px',
            }} />
            <div className="relative flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: modeColor }}>الصفقة الرئيسية</div>
              <div className="rounded-md px-2 py-1 font-mono text-[11px] font-black" style={{ color: totalMovement >= 0 ? t.success : '#ff5c8a', background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
                {totalMovement >= 0 ? '+' : ''}{totalMovement}% متوسط الحركة
              </div>
            </div>
            <div className="relative mt-7 flex justify-center">
              <Avatar t={t} name={featured.player} image={featured.image} accent={modeColor} size={132} />
            </div>
            <div className="relative mt-5 text-center text-[34px] font-black leading-none" style={{ color: t.text }}>{featured.player}</div>
            <div className="relative">
              <ClubRoute from={featured.fromClub} to={featured.toClub} align="center" />
            </div>
            <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,92,138,0.10)', border: '1px solid rgba(255,92,138,0.28)' }}>
                <div className="text-[9px] font-black" style={{ color: t.sub }}>النسبة القديمة</div>
                <div className="mt-1 font-mono text-[42px] font-black leading-none" style={{ color: '#ff5c8a' }}>{featured.oldPct}%</div>
              </div>
              <div className="font-black text-[18px]" style={{ color: modeColor }}>إلى</div>
              <div className="rounded-lg p-3 text-center" style={{ background: `${modeColor}12`, border: `1px solid ${modeColor}45` }}>
                <div className="text-[9px] font-black" style={{ color: t.sub }}>نسبة اليوم</div>
                <div className="mt-1 font-mono text-[42px] font-black leading-none" style={{ color: modeColor }}>{featured.newPct}%</div>
              </div>
            </div>
            <div className="relative mt-5">
              <div className="h-3 rounded-full overflow-hidden" style={{ background: `${modeColor}14` }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${activePct(featured)}%`, background: `linear-gradient(to left, ${modeColor}, ${t.accent2})` }} />
                <span className="absolute top-0 h-3 w-[2px]" style={{ right: `${100 - featured.oldPct}%`, background: '#fff', opacity: 0.75 }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-black">
                <span style={{ color: t.dim }}>مؤشر خاص بهذا اللاعب</span>
                <span style={{ color: modeColor }}>{probabilityLabel(activePct(featured))}</span>
              </div>
            </div>
            <div className="relative mt-auto grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: t.border }}>
              {[
                { label: 'ساخنة', value: hotCount, color: '#64ff6a' },
                { label: 'مراقبة', value: watchCount, color: t.warning },
                { label: 'منخفضة', value: lowCount, color: '#ff5c8a' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-[9px] font-black" style={{ color: t.dim }}>{item.label}</div>
                  <div className="mt-1 font-mono text-[22px] font-black" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 min-h-0">
            {visibleDeals.map(deal => <DealRow key={deal.idx} deal={deal} />)}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'hologram_grid') {
    return (
      <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
        <HeaderBar />
        <div className="flex-1 grid grid-cols-[1fr_420px_1fr] gap-3 min-h-0">
          <div className="space-y-3">
            {visibleDeals.slice(0, 2).map(deal => <DealRow key={deal.idx} deal={deal} compact />)}
          </div>
          <div className="rounded-2xl relative overflow-hidden flex flex-col items-center justify-center text-center" style={{
            background: `radial-gradient(circle at center, ${modeColor}22 0%, ${t.surfaceDeep} 58%, ${t.surface} 100%)`,
            border: `1px solid ${modeColor}65`,
          }}>
            <div className="absolute inset-8 rounded-full border opacity-25" style={{ borderColor: modeColor }} />
            <div className="absolute inset-16 rounded-full border opacity-20" style={{ borderColor: t.accent2 }} />
            <Avatar t={t} name={featured.player} image={featured.image} accent={modeColor} size={118} />
            <div className="mt-5 text-[30px] font-black" style={{ color: t.text }}>{featured.player}</div>
            <ClubRoute from={featured.fromClub} to={featured.toClub} align="center" />
            <div className="mt-5 font-mono text-[76px] font-black leading-none transition-all duration-700" style={{ color: modeColor }}>
              {activePct(featured)}%
            </div>
            <div className="mt-2 text-[12px] font-black" style={{ color: modeColor }}>{probabilityLabel(activePct(featured))}</div>
          </div>
          <div className="space-y-3">
            {visibleDeals.slice(2, 4).map(deal => <DealRow key={deal.idx} deal={deal} compact />)}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'trading_floor') {
    return (
      <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
        <HeaderBar />
        <div className="grid grid-cols-3 gap-3">
          <FieldCard t={t} label="أهداف ساخنة" value={String(hotCount)} accent="#64ff6a" />
          <FieldCard t={t} label="قائمة مراقبة" value={String(watchCount)} accent={t.warning} />
          <FieldCard t={t} label="إشارة منخفضة" value={String(lowCount)} accent="#ff5c8a" />
        </div>
        <div className="flex-1 rounded-xl p-4 grid grid-rows-4 gap-2 min-h-0" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          {visibleDeals.map(deal => <DealRow key={deal.idx} deal={deal} compact />)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <HeaderBar />
      <div className="flex-1 grid grid-cols-[1.05fr_1fr_360px] gap-3 min-h-0">
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: modeColor }}>مصفوفة الاحتمال</div>
            <div className="font-mono text-[10px]" style={{ color: t.dim }}>0-100</div>
          </div>
          {visibleDeals.map(deal => <DealRow key={deal.idx} deal={deal} compact />)}
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: t.accent }}>حركة السوق</div>
          {visibleDeals.map(deal => {
            const change = delta(deal);
            const color = change >= 0 ? t.success : '#ff5c8a';
            return (
              <div key={deal.idx} className="rounded-lg px-3 py-2 flex items-center justify-between" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-black" style={{ color: t.text }}>{deal.player}</div>
                  <div className="text-[9px]" style={{ color: t.dim }}>{deal.oldPct}% إلى {deal.newPct}%</div>
                </div>
                <div className="font-mono text-[24px] font-black" style={{ color }}>{change >= 0 ? '+' : ''}{change}</div>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl p-4 flex flex-col relative overflow-hidden" style={{
          background: `linear-gradient(180deg, ${modeColor}14 0%, ${t.surfaceDeep} 70%)`,
          border: `1px solid ${modeColor}55`,
        }}>
          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${modeColor}, transparent)` }} />
          <div className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: modeColor }}>هدف التركيز</div>
          <div className="mt-4 flex justify-center">
            <Avatar t={t} name={featured.player} image={featured.image} accent={modeColor} size={118} />
          </div>
          <div className="mt-5 text-center text-[28px] font-black leading-tight" style={{ color: t.text }}>{featured.player}</div>
          <ClubRoute from={featured.fromClub} to={featured.toClub} align="center" />
          <div className="mt-auto text-center">
            <div className="font-mono text-[70px] font-black leading-none" style={{ color: modeColor }}>{activePct(featured)}%</div>
            <div className="mt-2 text-[11px] font-black" style={{ color: modeColor }}>{probabilityLabel(activePct(featured))}</div>
            {showNew && <div className="mt-2 text-[10px] font-mono" style={{ color: delta(featured) >= 0 ? t.success : '#ff5c8a' }}>{delta(featured) >= 0 ? '+' : ''}{delta(featured)}% منذ النموذج القديم</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 6. Clause Reveal (X13 polish — SVG icons, redacted feel) ────────────

const ClauseRevealVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const clauseTitle = String(getField('clauseTitle') || 'بند مخفي');
  const clauseBody = String(getField('clauseBody') || '');
  const clauseValue = String(getField('clauseValue') || '');

  return (
    <div className="w-full h-full p-6 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-2xl rounded-2xl p-8 relative overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(to right, transparent, ${t.warning}, transparent)` }} />
        {/* Subtle document watermark */}
        <div className="absolute -bottom-6 -right-6 opacity-[0.05] pointer-events-none" style={{ color: t.warning }}>
          <Icon name="doc" size={200} color={t.warning} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Pill t={t} color={t.warning} label="بند في العقد" pulse />
          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded" style={{
            color: t.dim,
            background: t.surfaceDeep,
            border: `1px solid ${t.border}`,
          }}>CLASSIFIED · CLAUSE</span>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Avatar t={t} name={playerName} accent={t.warning} size={48} />
          <div className="text-[26px] font-black leading-tight" style={{ color: t.text }}>{playerName || 'اللاعب'}</div>
        </div>
        <div className="text-[16px] font-bold mb-2 flex items-center gap-2" style={{ color: t.warning }}>
          <Icon name="doc" size={16} color={t.warning} />
          {clauseTitle}
        </div>
        <div className="text-[14px] leading-loose mb-5 whitespace-pre-line" style={{
          color: t.sub,
          direction: isRtl(clauseBody) ? 'rtl' : 'ltr',
          textAlign: isRtl(clauseBody) ? 'right' : 'left',
        }}>{clauseBody || '— نص البند —'}</div>
        {clauseValue && (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: `${t.warning}15`, border: `2px solid ${t.warning}` }}>
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: t.dim }}>القيمة المحدّدة</div>
              <div className="text-[28px] font-black mt-1" style={{ color: t.warning }}>{clauseValue}</div>
            </div>
            <Icon name="briefcase" size={36} color={t.warning} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 7. Medical Tracker (X13 polish — SVG icons + stepper connectors) ────

const MedicalTrackerVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const playerImage = String(getField('playerImage') || '');
  const currentStage = String(getField('medicalStage') || 'travel');
  const stages = [
    { id: 'travel',   label: 'وصول',     icon: 'plane',     subtitle: 'السفر إلى الوجهة' },
    { id: 'medical',  label: 'فحص طبي',  icon: 'hospital',  subtitle: 'الكشف الطبي الكامل' },
    { id: 'signing',  label: 'توقيع',    icon: 'signature', subtitle: 'مراسم التوقيع' },
    { id: 'announce', label: 'إعلان',    icon: 'megaphone', subtitle: 'الإعلان الرسمي' },
  ];
  const idx = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="MEDICAL CHECK TRACKER"
        title={playerName || 'متابعة الفحص الطبي'}
        subtitle="رحلة اللاعب من الوصول إلى الإعلان الرسمي"
        accent={t.success}
        pills={<Pill t={t} color={t.success} label={stages[idx]?.label || '—'} pulse />}
        rightSlot={playerName ? <Avatar t={t} name={playerName} image={playerImage} accent={t.success} size={44} /> : undefined}
      />
      {/* Connector line behind the cards */}
      <div className="flex-1 relative">
        <div className="absolute top-1/2 left-4 right-4 h-[2px] -translate-y-1/2" style={{
          background: `linear-gradient(to left, ${t.success}, ${t.accent}, ${t.border})`,
          opacity: 0.35,
        }} />
        <div className="relative grid grid-cols-4 gap-3 h-full">
          {stages.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            const dim = !done && !active;
            const color = done ? t.success : active ? t.accent : t.dim;
            return (
              <div key={s.id} className="rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all relative" style={{
                background: active ? `${t.accent}15` : t.surface,
                border: `2px solid ${color}`,
                boxShadow: active ? `0 0 24px ${t.accent}50` : 'none',
                opacity: dim ? 0.55 : 1,
              }}>
                {/* Stage number badge */}
                <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[9px] font-mono font-black" style={{
                  background: t.surfaceDeep,
                  color,
                  border: `1px solid ${color}`,
                }}>0{i + 1}</div>
                <div className="rounded-full p-3 mb-2" style={{
                  background: `${color}15`,
                  border: `1px solid ${color}40`,
                }}>
                  <Icon name={s.icon} size={32} color={color} />
                </div>
                <div className="text-[14px] font-black" style={{ color: t.text }}>{s.label}</div>
                <div className="text-[10px] mt-1 opacity-70" style={{ color: t.sub }}>{s.subtitle}</div>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-mono font-bold" style={{ color }}>
                  {done && <><Icon name="check" size={11} color={color} />مكتمل</>}
                  {active && <><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />الآن</>}
                  {dim && '— لاحقًا'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── 8. Hijack Alert (X13 polish — risk gauge VS divider) ────────────────

const HijackAlertVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const originalClub = String(getField('originalClub') || '');
  const hijackClub = String(getField('hijackClub') || '');
  const risk = Math.max(0, Math.min(100, Number(getField('riskLevel') ?? 50)));
  const riskColor = risk >= 70 ? t.danger : risk >= 40 ? t.warning : t.success;
  const riskLabel = risk >= 70 ? 'مرتفع جدًا' : risk >= 40 ? 'متوسط' : 'منخفض';

  // SVG risk gauge — half circle with needle.
  const gaugeRadius = 44;
  const needleAngle = (risk / 100) * Math.PI - Math.PI; // -180° (left) to 0° (right)
  const needleX = 56 + gaugeRadius * Math.cos(needleAngle);
  const needleY = 56 + gaugeRadius * Math.sin(needleAngle);

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="HIJACK ALERT · إنذار خطف صفقة"
        title={playerName || '—'}
        subtitle="نادٍ منافس يحاول التدخل في الصفقة"
        accent={t.danger}
        pills={<Pill t={t} color={t.danger} label="ALERT" pulse />}
        rightSlot={
          <div className="flex items-center gap-2">
            <Icon name="warning" size={20} color={riskColor} />
            <div>
              <div className="text-[10px]" style={{ color: t.dim }}>مستوى الخطر</div>
              <div className="text-[28px] font-mono font-black leading-none mt-0.5" style={{ color: riskColor }}>{risk}%</div>
              <div className="text-[10px] mt-0.5" style={{ color: riskColor }}>{riskLabel}</div>
            </div>
          </div>
        }
      />
      <div className="flex-1 grid grid-cols-[1fr_140px_1fr] gap-3 items-stretch min-h-0">
        <div className="rounded-xl p-5 flex flex-col justify-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.sub }}>النادي الأصلي</div>
          <div className="flex items-center gap-3">
            <Avatar t={t} name={originalClub} accent={t.success} size={48} />
            <div className="text-[24px] font-black truncate" style={{ color: t.text }}>{originalClub || '—'}</div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: t.success }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.success }} />
            في مفاوضات متقدمة
          </div>
        </div>
        {/* Risk gauge in the center */}
        <div className="flex flex-col items-center justify-center px-2">
          <svg width="112" height="72" viewBox="0 0 112 72">
            {/* Three-tier arc background */}
            <path d={`M 12 56 A ${gaugeRadius} ${gaugeRadius} 0 0 1 39 18`} stroke={t.success} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
            <path d={`M 39 18 A ${gaugeRadius} ${gaugeRadius} 0 0 1 73 18`} stroke={t.warning} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
            <path d={`M 73 18 A ${gaugeRadius} ${gaugeRadius} 0 0 1 100 56`} stroke={t.danger} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
            {/* Needle */}
            <line x1="56" y1="56" x2={needleX} y2={needleY} stroke={riskColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="56" cy="56" r="4" fill={riskColor} />
          </svg>
          <div className="text-[10px] font-black uppercase tracking-wider mt-1" style={{ color: t.danger }}>VS</div>
        </div>
        <div className="rounded-xl p-5 flex flex-col justify-center" style={{ background: `${t.danger}15`, border: `2px solid ${t.danger}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.danger }}>النادي الخاطف</div>
          <div className="flex items-center gap-3">
            <Avatar t={t} name={hijackClub} accent={t.danger} size={48} />
            <div className="text-[24px] font-black truncate" style={{ color: t.danger }}>{hijackClub || '—'}</div>
          </div>
          <div className="mt-3"><ProgressBar t={t} value={risk} color={t.danger} height={6} /></div>
          <div className="text-[9px] font-mono mt-1.5 text-left" style={{ color: t.dim }}>تقدم الاختراق</div>
        </div>
      </div>
    </div>
  );
};

// ─── 9. Personal Terms (X13 polish — hero salary + completion bar) ───────

const PersonalTermsVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const playerImage = String(getField('playerImage') || '');
  const salary = String(getField('salary') || '');
  const years = String(getField('contractYears') || '');
  const agentFee = String(getField('agentFee') || '');
  const status = String(getField('termsStatus') || 'مفاوضات');

  // Estimate negotiation completeness from what is filled.
  const filled = [salary, years, agentFee].filter(Boolean).length;
  const completionPct = Math.round((filled / 3) * 100);

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="PERSONAL TERMS · مكتب الشروط الشخصية"
        title={playerName || '—'}
        subtitle={status}
        pills={<Pill t={t} label={`${completionPct}% مكتمل`} />}
        rightSlot={playerName ? <Avatar t={t} name={playerName} image={playerImage} accent={t.accent} size={44} /> : undefined}
      />
      <div className="flex-1 grid grid-cols-[1.4fr_1fr_1fr] gap-3 min-h-0">
        {/* Hero salary card */}
        <div className="rounded-xl p-5 flex flex-col justify-between relative overflow-hidden" style={{
          background: `linear-gradient(135deg, ${t.surface} 0%, ${t.accentSoft} 100%)`,
          border: `1px solid ${t.accent}50`,
        }}>
          <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none">
            <Icon name="briefcase" size={140} color={t.accent} />
          </div>
          <div className="flex items-center gap-2 relative">
            <Icon name="briefcase" size={14} color={t.accent} />
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.dim }}>الراتب السنوي</div>
          </div>
          <div className="text-[44px] font-black leading-none relative" style={{ color: t.accent }}>{salary || '—'}</div>
          <div className="text-[10px] font-mono opacity-70 relative" style={{ color: t.sub }}>net per season</div>
        </div>
        <FieldCard t={t} label="سنوات العقد" value={years ? `${years} سنوات` : '—'} accent={t.success} large />
        <FieldCard t={t} label="عمولة الوكيل" value={agentFee || '—'} accent={t.warning} large />
      </div>
      <div className="rounded-xl p-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.sub }}>تقدم المفاوضات</span>
          <span className="text-[10px] font-mono font-black" style={{ color: t.accent }}>{completionPct}%</span>
        </div>
        <ProgressBar t={t} value={completionPct} height={5} />
        <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono" style={{ color: t.dim }}>
          <Icon name="warning" size={10} color={t.dim} />
          بيانات غير قابلة للتأكيد رسميًا — تستند إلى مصادر مقربة
        </div>
      </div>
    </div>
  );
};

// ─── 10. Here We Go Build-Up (X13 polish — color-coded stages) ────────────

// Map stage keywords (Arabic + English) to colors and icons.
const stageHints = (label: string, t: UnifiedTheme): { color: string; icon: string; weight: number } => {
  const s = label.toLowerCase();
  if (/شائعة|rumor|rumour/.test(s))            return { color: t.dim,     icon: 'pulse',     weight: 0 };
  if (/محادث|talk|negoti/.test(s))             return { color: t.warning, icon: 'phone',     weight: 1 };
  if (/متقدم|advanced|اقترب/.test(s))          return { color: t.accent,  icon: 'pulse',     weight: 2 };
  if (/اتفاق|agree|deal/.test(s))              return { color: t.accent2, icon: 'check',     weight: 3 };
  if (/طبي|medical/.test(s))                   return { color: t.success, icon: 'hospital',  weight: 4 };
  if (/توقيع|sign|sealed/.test(s))             return { color: t.success, icon: 'signature', weight: 5 };
  if (/إعلان|announce|here we go/.test(s))     return { color: t.success, icon: 'megaphone', weight: 6 };
  return { color: t.sub, icon: 'sparkle', weight: 0 };
};

const HereWeGoBuildUpVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const playerImage = String(getField('playerImage') || '');
  const timeline = safeParse<{ stage: string; date: string; note?: string }[]>(String(getField('timelineEntries') || '[]'), []);
  // Active stage is the entry with the highest weight.
  const activeIdx = timeline.length === 0 ? -1 : timeline.reduce((max, e, i, arr) =>
    stageHints(e.stage, t).weight >= stageHints(arr[max].stage, t).weight ? i : max, 0);

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="HERE WE GO · BUILD-UP"
        title={playerName || 'تمهيد قبل الحسم'}
        subtitle="رحلة الصفقة من الشائعة إلى الإعلان"
        pills={<Pill t={t} label={`${timeline.length} مراحل`} />}
        rightSlot={playerName ? <Avatar t={t} name={playerName} image={playerImage} accent={t.accent} size={44} /> : undefined}
      />
      <div className="flex-1 rounded-xl p-5 overflow-y-auto" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        {timeline.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2" style={{ color: t.dim }}>
            <Icon name="sparkle" size={28} color={t.dim} />
            <div className="text-[12px]">في انتظار أحداث الصفقة</div>
          </div>
        ) : (
          <div className="relative pr-3">
            {/* Vertical timeline line, gradient */}
            <div className="absolute right-3 top-2 bottom-2 w-[3px] rounded-full" style={{
              background: `linear-gradient(to bottom, ${t.dim}, ${t.accent}, ${t.success})`,
              opacity: 0.55,
            }} />
            <div className="space-y-3">
              {timeline.map((entry, i) => {
                const isActive = i === activeIdx;
                const hint = stageHints(entry.stage, t);
                return (
                  <div key={i} className="flex gap-3 items-start relative">
                    <div className="rounded-full mt-1 z-10 flex items-center justify-center" style={{
                      width: 14, height: 14,
                      background: hint.color,
                      boxShadow: isActive ? `0 0 0 4px ${hint.color}30, 0 0 12px ${hint.color}` : `0 0 0 4px ${t.surfaceDeep}`,
                    }}>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#fff' }} />
                      )}
                    </div>
                    <div className="flex-1 rounded-lg p-3" style={{
                      background: isActive ? `${hint.color}15` : t.surfaceDeep,
                      border: `1px solid ${isActive ? hint.color : t.border}`,
                      borderRightWidth: 3,
                      borderRightColor: hint.color,
                    }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Icon name={hint.icon} size={13} color={hint.color} />
                          <span className="text-[14px] font-black" style={{ color: isActive ? hint.color : t.text }}>{entry.stage}</span>
                          {isActive && <Pill t={t} color={hint.color} label="الآن" small pulse />}
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: t.dim }}>{entry.date}</span>
                      </div>
                      {entry.note && (
                        <div className="text-[11px]" style={{
                          color: t.sub,
                          direction: isRtl(entry.note) ? 'rtl' : 'ltr',
                          textAlign: isRtl(entry.note) ? 'right' : 'left',
                        }}>{entry.note}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MercatoUnifiedRenderer;
