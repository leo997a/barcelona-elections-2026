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

// ─── 1. Agent Call (X7 redesigned) ─────────────────────────────────────────

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

  const statusPill =
    callStatus === 'recorded'
      ? <Pill t={t} color={t.warning} label="RECORDED" small />
      : callStatus === 'private_source'
      ? <Pill t={t} color={t.accent2} label="PRIVATE SOURCE" small />
      : <Pill t={t} color={t.danger} label="LIVE" pulse small />;

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      {/* Top bar: caller identity + status + duration */}
      <div className="rounded-xl px-5 py-3 flex items-center justify-between" style={{
        background: `linear-gradient(135deg, ${t.surface} 0%, ${t.surfaceDeep} 100%)`,
        border: `1px solid ${t.border}`,
      }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-[20px] font-black"
            style={{ background: t.accentSoft, color: t.accent, border: `1px solid ${t.accent}40` }}>
            📞
          </div>
          <div>
            <div className="flex items-center gap-2">
              {statusPill}
              <span className="text-[10px] font-mono" style={{ color: t.dim }}>● {callDuration}</span>
            </div>
            <div className="text-[20px] font-black leading-tight mt-0.5" style={{ color: t.text }}>{callerName}</div>
            {callerRole && <div className="text-[11px]" style={{ color: t.sub }}>{callerRole}</div>}
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

      <div className="flex-1 grid grid-cols-[260px_1fr_220px] gap-3 min-h-0">
        {/* Left: Deal context */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent2 }}>صفقة</div>
          {playerImage ? (
            <img src={playerImage} alt="" className="w-full rounded-lg object-cover" style={{ aspectRatio: '4/5', maxHeight: '180px' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : null}
          <div>
            <div className="text-[18px] font-black leading-tight" style={{ color: t.text }}>{playerName}</div>
            <div className="text-[10px] mt-0.5" style={{ color: t.sub }}>{dealHeadline}</div>
          </div>
          {(clubFrom || clubTo) && (
            <div className="rounded-lg p-2.5 flex items-center justify-between gap-2" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
              <div className="text-[10px] text-center flex-1" style={{ color: t.sub }}>
                <div className="opacity-60 text-[8px]">من</div>
                <div className="font-bold mt-0.5" style={{ color: t.text }}>{clubFrom || '—'}</div>
              </div>
              <div className="text-[14px]" style={{ color: t.accent }}>›</div>
              <div className="text-[10px] text-center flex-1" style={{ color: t.sub }}>
                <div className="opacity-60 text-[8px]">إلى</div>
                <div className="font-bold mt-0.5" style={{ color: t.text }}>{clubTo || '—'}</div>
              </div>
            </div>
          )}
          <div className="mt-auto rounded-lg px-3 py-2.5" style={{ background: t.accentSoft, border: `1px solid ${t.accent}40` }}>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: t.dim }}>القيمة</div>
            <div className="text-[20px] font-black leading-none mt-0.5" style={{ color: t.accent }}>{dealValue || '—'}</div>
          </div>
        </div>

        {/* Center: Transcript */}
        <div className="rounded-xl flex flex-col overflow-hidden" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
          <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: t.border, background: t.surface }}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>TRANSCRIPT</div>
            <div className="text-[9px] font-mono" style={{ color: t.dim }}>{lines.length} رسالة</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {lines.length === 0 ? (
              <div className="text-center text-[12px] py-8" style={{ color: t.dim }}>أضف محادثة المكالمة في الإعدادات</div>
            ) : (
              lines.map((line, i) => {
                const isAgent = line.side === 'agent';
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
                      <div className="text-[13px] leading-relaxed" style={{ direction: 'ltr', textAlign: 'left' }}>{line.text}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Source / Status */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: t.warning }}>المصدر</div>
          <div className="rounded-lg p-3 text-center" style={{ background: t.surfaceDeep, border: `1px dashed ${t.border}` }}>
            <div className="text-[28px] mb-1">🔒</div>
            <div className="text-[11px] font-bold" style={{ color: t.text }}>مصدر مغلق</div>
            <div className="text-[9px] mt-1" style={{ color: t.dim }}>المعلومة من داخل غرفة المفاوضات</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: t.sub }}>الحالة</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.success }} />
                <span className="text-[10px]" style={{ color: t.text }}>اتفاق المبدأ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.warning }} />
                <span className="text-[10px]" style={{ color: t.text }}>الفحص الطبي</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dim }} />
                <span className="text-[10px]" style={{ color: t.dim }}>الإعلان</span>
              </div>
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

// ─── 2. Deal Radar (X7 polish) ─────────────────────────────────────────────

const DealRadarVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const probability = Math.max(0, Math.min(100, Number(getField('probability') ?? 65)));
  const sources = safeParse<{ name: string; reliability: number }[]>(String(getField('sources') || '[]'), []);
  const cx = 110, cy = 110, R = 90;
  const sweepRad = (probability / 100) * 2 * Math.PI;

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="DEAL RADAR"
        title={playerName || 'رادار صفقة'}
        subtitle="احتمالية إتمام الصفقة + موثوقية المصادر"
        pills={<Pill t={t} label={`${probability}% احتمالية`} pulse />}
      />
      <div className="flex-1 grid grid-cols-[280px_1fr] gap-3 min-h-0">
        <div className="rounded-xl flex flex-col items-center justify-center p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            {/* Concentric grid */}
            {[1, 0.66, 0.33].map((m, i) => (
              <circle key={i} cx={cx} cy={cy} r={R * m} fill="none" stroke={t.border} strokeWidth="1" />
            ))}
            {/* Cross */}
            <line x1={cx} y1={cy - R - 6} x2={cx} y2={cy + R + 6} stroke={t.border} strokeWidth="1" />
            <line x1={cx - R - 6} y1={cy} x2={cx + R + 6} y2={cy} stroke={t.border} strokeWidth="1" />
            <line x1={cx - R * 0.7} y1={cy - R * 0.7} x2={cx + R * 0.7} y2={cy + R * 0.7} stroke={t.border} strokeWidth="0.5" opacity="0.6" />
            <line x1={cx + R * 0.7} y1={cy - R * 0.7} x2={cx - R * 0.7} y2={cy + R * 0.7} stroke={t.border} strokeWidth="0.5" opacity="0.6" />
            {/* Sweep */}
            <path
              d={`M ${cx} ${cy} L ${cx + R * Math.cos(-Math.PI / 2)} ${cy + R * Math.sin(-Math.PI / 2)} A ${R} ${R} 0 ${probability > 50 ? 1 : 0} 1 ${cx + R * Math.cos(-Math.PI / 2 + sweepRad)} ${cy + R * Math.sin(-Math.PI / 2 + sweepRad)} Z`}
              fill={t.accent}
              opacity={0.25}
            />
            <circle cx={cx} cy={cy} r="3" fill={t.accent} />
            <text x={cx} y={cy + 8} textAnchor="middle" fill={t.text} fontSize="32" fontWeight="900">{probability}</text>
            <text x={cx} y={cy + 28} textAnchor="middle" fill={t.dim} fontSize="10">PROBABILITY</text>
          </svg>
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>المصادر · موثوقية</div>
          {sources.length === 0 ? (
            <div className="text-[12px] mt-2" style={{ color: t.dim }}>أضف المصادر في الإعدادات</div>
          ) : (
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {sources.map((s, i) => (
                <div key={i} className="rounded-lg p-2.5" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-bold" style={{ color: t.text }}>{s.name}</span>
                    <span className="text-[12px] font-mono font-black" style={{ color: t.accent }}>{s.reliability}%</span>
                  </div>
                  <ProgressBar t={t} value={s.reliability} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── 3. Club Statement (X7 polish) ─────────────────────────────────────────

const ClubStatementVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const clubName = String(getField('clubName') || 'CLUB');
  const statementTitle = String(getField('statementTitle') || 'بيان رسمي');
  const statementBody = String(getField('statementBody') || '');
  const statementDate = String(getField('statementDate') || '');

  return (
    <div className="w-full h-full p-6 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-3xl rounded-2xl p-8 relative overflow-hidden" style={{ background: t.surface, border: `2px solid ${t.accent}` }}>
        {/* Watermark stamp */}
        <div className="absolute -top-8 -left-8 text-[140px] opacity-[0.05] select-none pointer-events-none" style={{ color: t.accent }}>📜</div>
        <div className="flex items-center justify-between border-b pb-3 mb-5" style={{ borderColor: t.border }}>
          <Pill t={t} label="بيان رسمي" pulse />
          <div className="text-[10px] font-mono" style={{ color: t.dim }}>{statementDate}</div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: t.accent }}>OFFICIAL</div>
        <div className="text-[26px] font-black mb-2" style={{ color: t.text }}>{clubName}</div>
        <div className="text-[18px] font-bold mb-5" style={{ color: t.accent }}>{statementTitle}</div>
        <div className="text-[15px] leading-loose whitespace-pre-line" style={{ color: t.sub }}>{statementBody || '— نص البيان —'}</div>
      </div>
    </div>
  );
};

// ─── 4. Deadline Hour (X7 polish) ──────────────────────────────────────────

const DeadlineHourVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const status = String(getField('dealStatus') || 'مفاوضات');
  const minutes = String(getField('minutesLeft') || '00').padStart(2, '0');
  const seconds = String(getField('secondsLeft') || '00').padStart(2, '0');
  const stage = String(getField('dealStage') || 'agreement');

  const stages = [
    { id: 'rumor', label: 'شائعة' },
    { id: 'talks', label: 'محادثات' },
    { id: 'agreement', label: 'اتفاق' },
    { id: 'medical', label: 'طبي' },
    { id: 'announce', label: 'إعلان' },
  ];
  const idx = stages.findIndex(s => s.id === stage);

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="DEADLINE HOUR · ساعة الحسم"
        title={playerName || '—'}
        subtitle={status}
        accent={t.danger}
        pills={<Pill t={t} color={t.danger} label="LIVE" pulse />}
        rightSlot={
          <div>
            <div className="text-[10px]" style={{ color: t.dim }}>الوقت المتبقي</div>
            <div className="font-mono font-black leading-none mt-1" style={{ color: t.danger, fontSize: '52px' }}>
              {minutes}:{seconds}
            </div>
          </div>
        }
      />
      <div className="flex-1 rounded-xl p-5 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>المرحلة الحالية</div>
        <div className="flex items-stretch gap-2">
          {stages.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <React.Fragment key={s.id}>
                <div className="flex-1 rounded-lg p-3 text-center transition-all" style={{
                  background: active ? t.accent : done ? t.success : t.surfaceDeep,
                  color: active ? '#000' : done ? '#000' : t.dim,
                  border: `1px solid ${active ? t.accent : done ? t.success : t.border}`,
                }}>
                  <div className="text-[10px] font-mono opacity-60">0{i + 1}</div>
                  <div className="text-[12px] font-black mt-1">{s.label}</div>
                </div>
                {i < stages.length - 1 && (
                  <div className="flex items-center text-[14px]" style={{ color: i < idx ? t.success : t.dim }}>›</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── 5. Source Confidence (X7 polish) ──────────────────────────────────────

const SourceConfidenceVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const sources = safeParse<{ name: string; tier: 'A' | 'B' | 'C'; status: string }[]>(String(getField('sources') || '[]'), []);
  const tierColor = (tier: string) => tier === 'A' ? t.success : tier === 'B' ? t.warning : t.danger;
  const tierLabels: Record<string, string> = { A: 'مستوى A — تأكيد', B: 'مستوى B — محتمل', C: 'مستوى C — شائعة' };

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="SOURCE CONFIDENCE BOARD"
        title="لوحة ثقة المصادر"
        subtitle="تصنيف بثلاث طبقات حسب الموثوقية"
      />
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        {(['A', 'B', 'C'] as const).map(tier => {
          const matching = sources.filter(s => s.tier === tier);
          return (
            <div key={tier} className="rounded-xl p-4 flex flex-col" style={{ background: t.surface, border: `2px solid ${tierColor(tier)}40` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[12px] font-black uppercase" style={{ color: tierColor(tier) }}>{tierLabels[tier]}</div>
                <span className="text-[20px] font-black" style={{ color: tierColor(tier) }}>{matching.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {matching.length === 0 ? (
                  <div className="text-[10px]" style={{ color: t.dim }}>—</div>
                ) : (
                  matching.map((s, i) => (
                    <div key={i} className="rounded-lg p-2" style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}>
                      <div className="text-[11px] font-bold" style={{ color: t.text }}>{s.name}</div>
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

// ─── 6. Clause Reveal (X7 polish) ──────────────────────────────────────────

const ClauseRevealVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const clauseTitle = String(getField('clauseTitle') || 'بند مخفي');
  const clauseBody = String(getField('clauseBody') || '');
  const clauseValue = String(getField('clauseValue') || '');

  return (
    <div className="w-full h-full p-6 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-2xl rounded-2xl p-8 relative overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(to right, transparent, ${t.warning}, transparent)` }} />
        <div className="absolute -bottom-12 -right-12 text-[180px] opacity-[0.04] select-none pointer-events-none">📄</div>
        <div className="flex items-center gap-2 mb-3">
          <Pill t={t} color={t.warning} label="بند في العقد" pulse />
        </div>
        <div className="text-[26px] font-black" style={{ color: t.text }}>{playerName || 'اللاعب'}</div>
        <div className="text-[16px] font-bold mt-3 mb-2" style={{ color: t.warning }}>{clauseTitle}</div>
        <div className="text-[14px] leading-loose mb-5 whitespace-pre-line" style={{ color: t.sub }}>{clauseBody || '— نص البند —'}</div>
        {clauseValue && (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: `${t.warning}15`, border: `2px solid ${t.warning}` }}>
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: t.dim }}>القيمة المحدّدة</div>
              <div className="text-[28px] font-black mt-1" style={{ color: t.warning }}>{clauseValue}</div>
            </div>
            <div className="text-[40px]">💼</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 7. Medical Tracker (X7 polish) ────────────────────────────────────────

const MedicalTrackerVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const currentStage = String(getField('medicalStage') || 'travel');
  const stages = [
    { id: 'travel', label: 'وصول', icon: '✈️', subtitle: 'السفر إلى الوجهة' },
    { id: 'medical', label: 'فحص طبي', icon: '🏥', subtitle: 'الكشف الطبي الكامل' },
    { id: 'signing', label: 'توقيع', icon: '✍️', subtitle: 'مراسم التوقيع' },
    { id: 'announce', label: 'إعلان', icon: '📢', subtitle: 'الإعلان الرسمي' },
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
      />
      <div className="flex-1 grid grid-cols-4 gap-3 min-h-0">
        {stages.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={s.id} className="rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all" style={{
              background: active ? `${t.accent}15` : t.surface,
              border: `2px solid ${active ? t.accent : done ? t.success : t.border}`,
            }}>
              <div className="text-[44px] mb-2" style={{ filter: !done && !active ? 'grayscale(100%) opacity(0.4)' : 'none' }}>{s.icon}</div>
              <div className="text-[14px] font-black" style={{ color: t.text }}>{s.label}</div>
              <div className="text-[10px] mt-1 opacity-70" style={{ color: t.sub }}>{s.subtitle}</div>
              <div className="mt-2 text-[10px] font-mono font-bold" style={{
                color: done ? t.success : active ? t.accent : t.dim,
              }}>
                {done ? '✓ مكتمل' : active ? '● الآن' : '— لاحقًا'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 8. Hijack Alert (X7 polish) ───────────────────────────────────────────

const HijackAlertVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const originalClub = String(getField('originalClub') || '');
  const hijackClub = String(getField('hijackClub') || '');
  const risk = Math.max(0, Math.min(100, Number(getField('riskLevel') ?? 50)));
  const riskColor = risk >= 70 ? t.danger : risk >= 40 ? t.warning : t.success;
  const riskLabel = risk >= 70 ? 'مرتفع جدًا' : risk >= 40 ? 'متوسط' : 'منخفض';

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
          <div>
            <div className="text-[10px]" style={{ color: t.dim }}>مستوى الخطر</div>
            <div className="text-[36px] font-mono font-black leading-none mt-0.5" style={{ color: riskColor }}>{risk}%</div>
            <div className="text-[10px] mt-0.5" style={{ color: riskColor }}>{riskLabel}</div>
          </div>
        }
      />
      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-4 items-stretch min-h-0">
        <div className="rounded-xl p-5 flex flex-col justify-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.sub }}>النادي الأصلي</div>
          <div className="text-[28px] font-black" style={{ color: t.text }}>{originalClub || '—'}</div>
          <div className="text-[10px] mt-2" style={{ color: t.success }}>● في مفاوضات متقدمة</div>
        </div>
        <div className="flex flex-col items-center justify-center px-3">
          <div className="text-[40px]" style={{ color: t.danger, textShadow: `0 0 20px ${t.danger}` }}>⚡</div>
          <div className="text-[11px] font-black mt-1" style={{ color: t.danger }}>VS</div>
        </div>
        <div className="rounded-xl p-5 flex flex-col justify-center" style={{ background: `${t.danger}15`, border: `2px solid ${t.danger}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.danger }}>النادي الخاطف</div>
          <div className="text-[28px] font-black" style={{ color: t.danger }}>{hijackClub || '—'}</div>
          <div className="mt-3"><ProgressBar t={t} value={risk} color={t.danger} height={6} /></div>
        </div>
      </div>
    </div>
  );
};

// ─── 9. Personal Terms (X7 polish) ─────────────────────────────────────────

const PersonalTermsVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const salary = String(getField('salary') || '');
  const years = String(getField('contractYears') || '');
  const agentFee = String(getField('agentFee') || '');
  const status = String(getField('termsStatus') || 'مفاوضات');

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="PERSONAL TERMS · مكتب الشروط الشخصية"
        title={playerName || '—'}
        subtitle={status}
        pills={<Pill t={t} label="مفاوضات" pulse />}
      />
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        <FieldCard t={t} label="الراتب السنوي" value={salary || '—'} accent={t.accent} large />
        <FieldCard t={t} label="سنوات العقد" value={years ? `${years} سنوات` : '—'} accent={t.success} large />
        <FieldCard t={t} label="عمولة الوكيل" value={agentFee || '—'} accent={t.warning} large />
      </div>
      <div className="rounded-xl p-3 text-center" style={{ background: t.surfaceDeep, border: `1px dashed ${t.border}` }}>
        <span className="text-[10px] font-mono" style={{ color: t.dim }}>
          ● بيانات غير قابلة للتأكيد رسميًا — تستند إلى مصادر مقربة
        </span>
      </div>
    </div>
  );
};

// ─── 10. Here We Go Build-Up (X7 polish) ───────────────────────────────────

const HereWeGoBuildUpVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const timeline = safeParse<{ stage: string; date: string; note?: string }[]>(String(getField('timelineEntries') || '[]'), []);

  return (
    <div className="w-full h-full p-5 flex flex-col gap-3" dir="rtl">
      <Header
        t={t}
        eyebrow="HERE WE GO · BUILD-UP"
        title={playerName || 'تمهيد قبل الحسم'}
        subtitle="رحلة الصفقة من الشائعة إلى الإعلان"
        pills={<Pill t={t} label={`${timeline.length} مراحل`} />}
      />
      <div className="flex-1 rounded-xl p-5 overflow-y-auto" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        {timeline.length === 0 ? (
          <div className="text-center text-[12px]" style={{ color: t.dim }}>أضف نقاط الجدول الزمني في الإعدادات</div>
        ) : (
          <div className="relative pr-3">
            {/* Vertical line */}
            <div className="absolute right-3 top-1 bottom-1 w-[2px]" style={{ background: t.accent, opacity: 0.3 }} />
            <div className="space-y-3">
              {timeline.map((entry, i) => {
                const isLast = i === timeline.length - 1;
                return (
                  <div key={i} className="flex gap-3 items-start relative">
                    <div className="rounded-full w-3 h-3 mt-1.5 z-10" style={{
                      background: isLast ? t.success : t.accent,
                      boxShadow: `0 0 0 4px ${t.bg.includes('rgba') ? '#0c1224' : '#0f172a'}`,
                    }} />
                    <div className="flex-1 rounded-lg p-3" style={{
                      background: isLast ? `${t.success}15` : t.surfaceDeep,
                      border: `1px solid ${isLast ? t.success : t.border}`,
                    }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[14px] font-black" style={{ color: isLast ? t.success : t.text }}>{entry.stage}</span>
                        <span className="text-[10px] font-mono" style={{ color: t.dim }}>{entry.date}</span>
                      </div>
                      {entry.note && <div className="text-[11px]" style={{ color: t.sub }}>{entry.note}</div>}
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
