/**
 * Mercato Unified Renderer.
 *
 * Single renderer that supports 10 layout variants chosen via the
 * `mercatoVariant` field. Replaces the need for 10 separate renderer
 * files. Every variant inherits the same broadcast controls + audio
 * infrastructure (AudioSettingsPanel, scene picker, voice library).
 *
 * Variants:
 *   - agent_call           → call interface (transcript + waveform)
 *   - deal_radar           → probability radar + sources stack
 *   - club_statement       → official press card
 *   - deadline_hour        → countdown + deal status
 *   - source_confidence    → tiers + reliability table
 *   - clause_reveal        → contract clause document reveal
 *   - medical_tracker      → 4-stage progress (travel/medical/signing/announce)
 *   - hijack_alert         → competing club + risk meter
 *   - personal_terms       → salary / years / fee / status
 *   - here_we_go_buildup   → timeline rumor → advanced talks
 *
 * The renderer is intentionally minimal in design weight — focus is on
 * data clarity and stability. Visual polish can be iterated later.
 */
import React, { useMemo } from 'react';
import { RendererProps } from './SharedComponents';

// ─── Theme ──────────────────────────────────────────────────────────────────

interface UnifiedTheme {
  bg: string;
  surface: string;
  surfaceLight: string;
  border: string;
  text: string;
  sub: string;
  dim: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
}

const THEMES: Record<string, UnifiedTheme> = {
  TACTICAL_DARK: {
    bg: 'radial-gradient(ellipse at 70% 30%, rgba(15,30,55,1) 0%, rgba(8,12,22,1) 70%)',
    surface: 'rgba(15,25,45,0.85)', surfaceLight: 'rgba(25,40,70,0.75)',
    border: 'rgba(60,90,140,0.45)', text: '#ffffff', sub: '#94a3b8', dim: '#475569',
    accent: '#22d3ee', accentSoft: 'rgba(34,211,238,0.10)',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
  },
  CLEAN_BROADCAST: {
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    surface: 'rgba(30,41,59,0.85)', surfaceLight: 'rgba(51,65,85,0.75)',
    border: 'rgba(100,116,139,0.45)', text: '#f1f5f9', sub: '#94a3b8', dim: '#64748b',
    accent: '#3b82f6', accentSoft: 'rgba(59,130,246,0.10)',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
  },
  LUXE_GOLD: {
    bg: 'radial-gradient(ellipse at 70% 30%, rgba(50,30,10,1) 0%, rgba(20,10,4,1) 70%)',
    surface: 'rgba(50,30,10,0.85)', surfaceLight: 'rgba(80,50,20,0.75)',
    border: 'rgba(180,140,60,0.45)', text: '#fffbe6', sub: '#fcd34d', dim: '#92400e',
    accent: '#fbbf24', accentSoft: 'rgba(251,191,36,0.10)',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
  },
};

const getTheme = (id: string): UnifiedTheme => THEMES[id] || THEMES.TACTICAL_DARK;

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeParse = <T,>(s: string, fallback: T): T => {
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

interface ChatLine { side: 'reporter' | 'agent' | string; text: string; }

// ─── Main router ────────────────────────────────────────────────────────────

export const MercatoUnifiedRenderer: React.FC<RendererProps> = ({ getField, containerStyle, contentWrapperStyle }) => {
  const variant = String(getField('mercatoVariant') || 'agent_call');
  const themeId = String(getField('visualTheme') || 'TACTICAL_DARK');
  const t = getTheme(themeId);

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

// ─── Variants ───────────────────────────────────────────────────────────────

interface VariantProps {
  t: UnifiedTheme;
  getField: (id: string) => unknown;
}

// 1. Agent Call
const AgentCallVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const callerName = String(getField('callerName') || 'AGENT');
  const callerRole = String(getField('callerRole') || '');
  const callDuration = String(getField('callDuration') || '00:00');
  const dealHeadline = String(getField('dealHeadline') || '');
  const playerName = String(getField('playerName') || '');
  const dealValue = String(getField('dealValue') || '');
  const lines = safeParse<ChatLine[]>(String(getField('chatLines') || '[]'), []);

  return (
    <div className="w-full h-full p-6 flex gap-4" dir="rtl">
      {/* Right: Call panel */}
      <div className="flex-1 rounded-xl p-5 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.accent }}>● مكالمة مباشرة</div>
            <div className="text-[22px] font-black mt-0.5" style={{ color: t.text }}>{callerName}</div>
            <div className="text-[12px]" style={{ color: t.sub }}>{callerRole}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px]" style={{ color: t.dim }}>المدة</div>
            <div className="text-[18px] font-mono font-bold" style={{ color: t.text }}>{callDuration}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {lines.map((line, i) => (
            <div key={i} className={`flex ${line.side === 'agent' ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[75%] rounded-lg px-3 py-2 text-[13px]" style={{
                background: line.side === 'agent' ? t.surfaceLight : t.accentSoft,
                color: t.text,
                border: `1px solid ${t.border}`,
              }}>
                {line.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Left: Deal context */}
      <div className="w-[280px] rounded-xl p-4 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.accent }}>السياق</div>
        <div className="text-[16px] font-bold leading-tight" style={{ color: t.text }}>{playerName}</div>
        <div className="text-[12px]" style={{ color: t.sub }}>{dealHeadline}</div>
        <div className="mt-auto pt-3 border-t" style={{ borderColor: t.border }}>
          <div className="text-[10px]" style={{ color: t.dim }}>القيمة</div>
          <div className="text-[20px] font-black" style={{ color: t.accent }}>{dealValue}</div>
        </div>
      </div>
    </div>
  );
};

// 2. Deal Radar
const DealRadarVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const probability = Math.max(0, Math.min(100, Number(getField('probability') ?? 65)));
  const sources = safeParse<{ name: string; reliability: number }[]>(String(getField('sources') || '[]'), []);

  const radius = 80;
  const cx = 100, cy = 100;
  const sweep = (probability / 100) * 360;

  return (
    <div className="w-full h-full p-6 flex gap-5 items-center" dir="rtl">
      <div className="rounded-xl p-5 flex flex-col items-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={t.border} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={radius * 0.66} fill="none" stroke={t.border} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={radius * 0.33} fill="none" stroke={t.border} strokeWidth="1" />
          <line x1={cx} y1={cy - radius - 5} x2={cx} y2={cy + radius + 5} stroke={t.border} strokeWidth="1" />
          <line x1={cx - radius - 5} y1={cy} x2={cx + radius + 5} y2={cy} stroke={t.border} strokeWidth="1" />
          {/* Probability sweep */}
          <path
            d={`M ${cx} ${cy} L ${cx + radius * Math.cos(-Math.PI / 2)} ${cy + radius * Math.sin(-Math.PI / 2)} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${cx + radius * Math.cos(-Math.PI / 2 + (sweep * Math.PI / 180))} ${cy + radius * Math.sin(-Math.PI / 2 + (sweep * Math.PI / 180))} Z`}
            fill={t.accent}
            opacity={0.3}
          />
          <text x={cx} y={cy + 5} textAnchor="middle" fill={t.text} fontSize="22" fontWeight="900">{probability}%</text>
        </svg>
        <div className="text-[14px] font-bold mt-2" style={{ color: t.text }}>{playerName}</div>
        <div className="text-[10px]" style={{ color: t.dim }}>احتمالية الصفقة</div>
      </div>

      <div className="flex-1 rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: t.accent }}>المصادر</div>
        {sources.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.dim }}>أضف المصادر في الإعدادات</div>
        ) : (
          <div className="space-y-1.5">
            {sources.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold" style={{ color: t.text }}>{s.name}</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: t.border }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.reliability)}%`, background: t.accent }} />
                </div>
                <span className="text-[10px] font-mono w-8 text-right" style={{ color: t.sub }}>{s.reliability}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Club Statement
const ClubStatementVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const clubName = String(getField('clubName') || 'CLUB');
  const statementTitle = String(getField('statementTitle') || 'بيان رسمي');
  const statementBody = String(getField('statementBody') || '');
  const statementDate = String(getField('statementDate') || '');

  return (
    <div className="w-full h-full p-8 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-3xl rounded-xl p-8" style={{ background: t.surface, border: `2px solid ${t.accent}` }}>
        <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: t.border }}>
          <div className="text-[12px] font-bold uppercase tracking-widest" style={{ color: t.accent }}>● بيان رسمي</div>
          <div className="text-[10px] font-mono" style={{ color: t.dim }}>{statementDate}</div>
        </div>
        <div className="text-[22px] font-black mb-1" style={{ color: t.text }}>{clubName}</div>
        <div className="text-[16px] font-bold mb-4" style={{ color: t.accent }}>{statementTitle}</div>
        <div className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: t.sub }}>{statementBody}</div>
      </div>
    </div>
  );
};

// 4. Deadline Hour
const DeadlineHourVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const status = String(getField('dealStatus') || 'مفاوضات');
  const minutes = String(getField('minutesLeft') || '00');
  const seconds = String(getField('secondsLeft') || '00');
  const stage = String(getField('dealStage') || 'agreement');

  const stages = [
    { id: 'rumor', label: 'شائعة' },
    { id: 'talks', label: 'محادثات' },
    { id: 'agreement', label: 'اتفاق' },
    { id: 'medical', label: 'طبي' },
    { id: 'announce', label: 'إعلان' },
  ];
  const stageIndex = stages.findIndex(s => s.id === stage);

  return (
    <div className="w-full h-full p-6 flex flex-col gap-4" dir="rtl">
      <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: t.danger }}>⏱ ساعة الحسم</div>
          <div className="text-[24px] font-black mt-1" style={{ color: t.text }}>{playerName}</div>
          <div className="text-[12px] mt-0.5" style={{ color: t.sub }}>{status}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px]" style={{ color: t.dim }}>الوقت المتبقي</div>
          <div className="text-[42px] font-mono font-black leading-none" style={{ color: t.danger }}>
            {minutes}:{seconds}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: t.accent }}>المرحلة الحالية</div>
        <div className="flex items-center gap-2">
          {stages.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex-1 text-center py-2 rounded`} style={{
                background: i <= stageIndex ? t.accent : t.border,
                color: i <= stageIndex ? '#000' : t.dim,
              }}>
                <div className="text-[11px] font-bold">{s.label}</div>
              </div>
              {i < stages.length - 1 && <div className="text-[12px]" style={{ color: t.dim }}>›</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

// 5. Source Confidence
const SourceConfidenceVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const sources = safeParse<{ name: string; tier: 'A' | 'B' | 'C'; status: string }[]>(String(getField('sources') || '[]'), []);
  const tierColor = (tier: string) => tier === 'A' ? t.success : tier === 'B' ? t.warning : t.danger;

  return (
    <div className="w-full h-full p-6 flex flex-col gap-3" dir="rtl">
      <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[14px] font-black mb-3" style={{ color: t.text }}>لوحة ثقة المصادر</div>
        <div className="grid grid-cols-3 gap-3">
          {(['A', 'B', 'C'] as const).map(tier => (
            <div key={tier} className="rounded-lg p-3" style={{ background: t.surfaceLight, border: `1px solid ${tierColor(tier)}` }}>
              <div className="text-[10px] font-black uppercase mb-2" style={{ color: tierColor(tier) }}>المستوى {tier}</div>
              {sources.filter(s => s.tier === tier).map((s, i) => (
                <div key={i} className="text-[11px] mb-1" style={{ color: t.text }}>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-[9px]" style={{ color: t.sub }}>{s.status}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 6. Clause Reveal
const ClauseRevealVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const clauseTitle = String(getField('clauseTitle') || 'بند مخفي');
  const clauseBody = String(getField('clauseBody') || '');
  const clauseValue = String(getField('clauseValue') || '');

  return (
    <div className="w-full h-full p-8 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-2xl rounded-xl p-6" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.warning }}>📄 بند في العقد</div>
        <div className="text-[22px] font-black mt-1" style={{ color: t.text }}>{playerName}</div>
        <div className="text-[14px] font-bold mt-3 mb-2" style={{ color: t.accent }}>{clauseTitle}</div>
        <div className="text-[13px] leading-relaxed mb-3" style={{ color: t.sub }}>{clauseBody}</div>
        {clauseValue && (
          <div className="rounded-lg p-3 mt-3" style={{ background: t.accentSoft, border: `1px solid ${t.accent}` }}>
            <div className="text-[10px]" style={{ color: t.dim }}>القيمة المحددة</div>
            <div className="text-[20px] font-black" style={{ color: t.accent }}>{clauseValue}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// 7. Medical Tracker
const MedicalTrackerVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const currentStage = String(getField('medicalStage') || 'travel');
  const stages = [
    { id: 'travel', label: 'وصول', icon: '✈️' },
    { id: 'medical', label: 'فحص طبي', icon: '🏥' },
    { id: 'signing', label: 'توقيع', icon: '✍️' },
    { id: 'announce', label: 'إعلان', icon: '📢' },
  ];
  const idx = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full h-full p-6 flex flex-col gap-4" dir="rtl">
      <div className="rounded-xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: t.success }}>🏥 متابعة الفحص الطبي</div>
        <div className="text-[24px] font-black mt-1" style={{ color: t.text }}>{playerName}</div>
      </div>
      <div className="flex-1 grid grid-cols-4 gap-3">
        {stages.map((s, i) => (
          <div key={s.id} className="rounded-xl p-4 flex flex-col items-center justify-center" style={{
            background: i <= idx ? t.accentSoft : t.surface,
            border: `2px solid ${i === idx ? t.accent : i < idx ? t.success : t.border}`,
          }}>
            <div className="text-[36px]">{s.icon}</div>
            <div className="text-[12px] font-bold mt-2" style={{ color: t.text }}>{s.label}</div>
            <div className="text-[9px] mt-1" style={{ color: i < idx ? t.success : i === idx ? t.accent : t.dim }}>
              {i < idx ? 'مكتمل' : i === idx ? 'الآن' : 'لاحقًا'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 8. Hijack Alert
const HijackAlertVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const originalClub = String(getField('originalClub') || '');
  const hijackClub = String(getField('hijackClub') || '');
  const risk = Math.max(0, Math.min(100, Number(getField('riskLevel') ?? 50)));

  return (
    <div className="w-full h-full p-6 flex flex-col gap-4" dir="rtl">
      <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: t.surface, border: `2px solid ${t.danger}` }}>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: t.danger }}>⚠ إنذار خطف صفقة</div>
          <div className="text-[24px] font-black mt-1" style={{ color: t.text }}>{playerName}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px]" style={{ color: t.dim }}>مستوى الخطر</div>
          <div className="text-[28px] font-mono font-black" style={{ color: risk >= 70 ? t.danger : risk >= 40 ? t.warning : t.success }}>
            {risk}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-[10px] font-bold uppercase" style={{ color: t.sub }}>النادي الأصلي</div>
          <div className="text-[20px] font-black mt-1" style={{ color: t.text }}>{originalClub}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: t.surface, border: `2px solid ${t.danger}` }}>
          <div className="text-[10px] font-bold uppercase" style={{ color: t.danger }}>النادي الخاطف</div>
          <div className="text-[20px] font-black mt-1" style={{ color: t.danger }}>{hijackClub}</div>
        </div>
      </div>
    </div>
  );
};

// 9. Personal Terms
const PersonalTermsVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const salary = String(getField('salary') || '');
  const years = String(getField('contractYears') || '');
  const agentFee = String(getField('agentFee') || '');
  const status = String(getField('termsStatus') || 'مفاوضات');

  return (
    <div className="w-full h-full p-6 flex flex-col gap-4" dir="rtl">
      <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: t.accent }}>💼 الشروط الشخصية</div>
        <div className="text-[22px] font-black mt-1" style={{ color: t.text }}>{playerName}</div>
        <div className="text-[12px] mt-0.5" style={{ color: t.sub }}>{status}</div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1">
        {[
          { label: 'الراتب', value: salary, color: t.accent },
          { label: 'سنوات العقد', value: years, color: t.success },
          { label: 'عمولة الوكيل', value: agentFee, color: t.warning },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-4 flex flex-col justify-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: t.dim }}>{item.label}</div>
            <div className="text-[22px] font-black mt-1" style={{ color: item.color }}>{item.value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 10. Here We Go Build-Up
const HereWeGoBuildUpVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const playerName = String(getField('playerName') || '');
  const timeline = safeParse<{ stage: string; date: string; note?: string }[]>(String(getField('timelineEntries') || '[]'), []);

  return (
    <div className="w-full h-full p-6 flex flex-col gap-4" dir="rtl">
      <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: t.accent }}>📈 تمهيد قبل الحسم</div>
        <div className="text-[22px] font-black mt-1" style={{ color: t.text }}>{playerName}</div>
      </div>
      <div className="flex-1 rounded-xl p-4 overflow-y-auto" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        {timeline.length === 0 ? (
          <div className="text-[12px]" style={{ color: t.dim }}>أضف نقاط الجدول الزمني في الإعدادات</div>
        ) : (
          <div className="space-y-2">
            {timeline.map((entry, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="rounded-full w-2 h-2 mt-2" style={{ background: t.accent }} />
                <div className="flex-1">
                  <div className="text-[10px] font-mono" style={{ color: t.dim }}>{entry.date}</div>
                  <div className="text-[13px] font-bold" style={{ color: t.text }}>{entry.stage}</div>
                  {entry.note && <div className="text-[11px] mt-0.5" style={{ color: t.sub }}>{entry.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MercatoUnifiedRenderer;
