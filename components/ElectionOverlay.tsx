import React, { useEffect, useState } from 'react';
import { OverlayConfig } from '../types';

type ElectionTheme = {
  primary: string;
  secondary: string;
  text: string;
  accent: string;
};

interface ElectionOverlayProps {
  config: OverlayConfig;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  containerStyle: React.CSSProperties;
  contentWrapperStyle: React.CSSProperties;
  themes: Record<string, ElectionTheme>;
}

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type CandidateCard = {
  id: 'candidate1' | 'candidate2';
  name: string;
  image: string;
  percent: number;
  color: string;
  votes: number;
  delta: number;
  tag: string;
};

const ZERO_COUNTDOWN: CountdownState = { days: 0, hours: 0, minutes: 0, seconds: 0 };

const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

const safeNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatInteger = (value: number) => Math.max(0, Math.round(value)).toLocaleString('en-US');

const formatDelta = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0.0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const parseLocalDateTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2})(?::(\d{2}))?(?::(\d{2}))?)?$/
  );

  if (match) {
    const [, year, month, day, hours = '00', minutes = '00', seconds = '00'] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    ).getTime();
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const CandidateSnapshot: React.FC<{
  candidate: CandidateCard;
  highlight?: boolean;
  textAnimClass: string;
  barAnimClass: string;
}> = ({ candidate, highlight = false, textAnimClass, barAnimClass }) => (
  <div
    className={`relative overflow-hidden rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ${
      highlight ? 'border-white/20' : 'border-white/10'
    }`}
    style={{
      background: `linear-gradient(160deg, ${candidate.color} 0%, rgba(12,12,12,0.95) 70%)`,
    }}
  >
    <img
      src={candidate.image}
      alt={candidate.name}
      className="absolute inset-0 h-full w-full object-cover object-top opacity-25 mix-blend-luminosity"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
    <div className="relative z-10">
      <div className="mb-5 flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.3em] text-white/80">
            {candidate.tag || 'السباق الانتخابي'}
          </div>
          <h3 className={`text-4xl font-black text-white drop-shadow-2xl ${textAnimClass}`}>{candidate.name}</h3>
        </div>
        <div className="text-right">
          <div className={`text-6xl font-black text-white ${textAnimClass}`}>{candidate.percent.toFixed(1)}%</div>
          <div
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${
              candidate.delta >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {formatDelta(candidate.delta)}
          </div>
        </div>
      </div>

      <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-white ${barAnimClass}`}
          style={{ width: `${candidate.percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-white/70">الأصوات</span>
        <span className="font-mono text-xl font-black text-white">{formatInteger(candidate.votes)}</span>
      </div>
    </div>
  </div>
);

const ElectionOverlay: React.FC<ElectionOverlayProps> = ({
  config,
  audioRef,
  containerStyle,
  contentWrapperStyle,
  themes,
}) => {
  const getField = (id: string) => config.fields.find((field) => field.id === id)?.value;

  const headline = String(getField('headline') || 'انتخابات برشلونة 2026');
  const subheadline = String(getField('subheadline') || 'تغطية انتخابية مباشرة لسباق رئاسة النادي');
  const watermarkText = String(getField('watermarkText') || 'REO SHOW');
  const designStyle = String(getField('designStyle') || 'SPLIT_BAR_LEFT');
  const themeKey = String(getField('themePreset') || 'BARCA_RED');
  const activeTheme = themes[themeKey] || themes.BARCA_RED;
  const statusBadge = String(getField('statusBadge') || 'تغطية مباشرة');
  const sourceLabel = String(getField('sourceLabel') || 'مركز برشلونة الانتخابي');
  const lastUpdated = String(getField('lastUpdated') || 'آخر تحديث 20:45');
  const phaseLabel = String(getField('phaseLabel') || 'نتائج أولية');
  const barcaLogo = String(
    getField('barcaLogo') ||
      'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png'
  );
  const specialText = String(getField('specialText') || '');
  const targetDateStr = String(getField('targetDate') || '2026-06-30 20:00');
  const showUndecided = getField('showUndecided') !== false;

  const candidates: CandidateCard[] = [
    {
      id: 'candidate1',
      name: String(getField('candidate1Name') || 'خوان لابورتا'),
      image: String(getField('candidate1Image') || ''),
      percent: clampPercent(safeNumber(getField('candidate1Percent'))),
      color: String(getField('candidate1Color') || '#a50044'),
      votes: safeNumber(getField('candidate1Votes')),
      delta: safeNumber(getField('candidate1Delta')),
      tag: String(getField('candidate1Tag') || 'مرشح 1'),
    },
    {
      id: 'candidate2',
      name: String(getField('candidate2Name') || 'فيكتور فونت'),
      image: String(getField('candidate2Image') || ''),
      percent: clampPercent(safeNumber(getField('candidate2Percent'))),
      color: String(getField('candidate2Color') || '#004d98'),
      votes: safeNumber(getField('candidate2Votes')),
      delta: safeNumber(getField('candidate2Delta')),
      tag: String(getField('candidate2Tag') || 'مرشح 2'),
    },
  ];

  const undecidedSegment = {
    label: String(getField('undecidedLabel') || 'غير محسوم'),
    percent: clampPercent(safeNumber(getField('undecidedPercent'))),
    color: String(getField('undecidedColor') || '#6b7280'),
  };

  const currentVoters = safeNumber(getField('currentVoters'));
  const totalVoters = Math.max(1, safeNumber(getField('totalVoters')) || 114504);
  const turnoutPercentage = clampPercent((currentVoters / totalVoters) * 100);
  const leader = [...candidates].sort((left, right) => right.percent - left.percent)[0];
  const comparisonSegments = [
    { label: candidates[0].name, percent: candidates[0].percent, color: candidates[0].color },
    { label: candidates[1].name, percent: candidates[1].percent, color: candidates[1].color },
    ...(showUndecided ? [undecidedSegment] : []),
  ];

  const animClass = config.isVisible ? 'animate-cinematic-fade-up' : 'opacity-0 scale-95 transition-all duration-700';
  const barAnimClass = config.isVisible ? 'animate-[slideInRight_1s_ease-out_forwards]' : 'opacity-0';
  const textAnimClass = config.isVisible ? 'animate-[fadeInUp_1s_ease-out_0.25s_forwards] opacity-0' : 'opacity-0';
  const pulseAnimClass = config.isVisible ? 'animate-pulse' : '';

  const [timeLeft, setTimeLeft] = useState<CountdownState>(ZERO_COUNTDOWN);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (designStyle !== 'COUNTDOWN_TOP') {
      setTimeLeft(ZERO_COUNTDOWN);
      return;
    }

    const updateCountdown = () => {
      const target = parseLocalDateTime(targetDateStr);
      if (!target) {
        setTimeLeft(ZERO_COUNTDOWN);
        return;
      }

      const distance = target - Date.now();
      if (distance <= 0) {
        setTimeLeft(ZERO_COUNTDOWN);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [designStyle, targetDateStr]);

  useEffect(() => {
    if (designStyle !== 'VOTER_TURNOUT' && designStyle !== 'RESULTS_HUB') {
      setCurrentTime(new Date());
      return;
    }

    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [designStyle]);

  const sharedBackground = (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at top right, ${activeTheme.primary}33, transparent 38%), radial-gradient(circle at bottom left, ${activeTheme.accent}22, transparent 34%), linear-gradient(135deg, ${activeTheme.secondary}, #030712 70%)`,
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.05)_0,transparent_12%,transparent_85%,rgba(255,255,255,0.03)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(0,0,0,0.45)_72%)]" />
      <div className="absolute left-10 top-10 rounded-full border border-white/10 px-4 py-1 text-[11px] font-black tracking-[0.35em] text-white/60">
        {watermarkText}
      </div>
    </>
  );

  const sharedMeta = (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="rounded-full border px-4 py-2 text-xs font-black tracking-[0.28em] text-white"
        style={{ backgroundColor: activeTheme.primary, borderColor: `${activeTheme.accent}44` }}
      >
        {statusBadge}
      </div>
      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/80">
        {phaseLabel}
      </div>
      <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold text-white/70">
        {sourceLabel}
      </div>
      <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-mono text-white/60">
        {lastUpdated}
      </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      <audio ref={audioRef} />
      <div style={contentWrapperStyle} className="relative z-10">
        <div className={`relative h-full w-full overflow-hidden subpixel-antialiased ${animClass}`}>
          <style>{`@keyframes panDiagonal { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
          {sharedBackground}

          {designStyle === 'SPLIT_BAR_LEFT' && (
            <div className="absolute inset-y-0 left-0 flex w-[760px] flex-col border-r border-white/10 bg-black/40 p-10 shadow-[40px_0_120px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              <div className="mb-8 flex items-center justify-between gap-6">
                <div>
                  <div className="mb-3">{sharedMeta}</div>
                  <h1 className="text-5xl font-black text-white">{headline}</h1>
                  <p className="mt-3 max-w-[540px] text-lg text-white/70">{subheadline}</p>
                </div>
                <img src={barcaLogo} alt="Barcelona" className="h-24 w-24 shrink-0 drop-shadow-2xl" />
              </div>

              <div className="grid flex-1 gap-6">
                <CandidateSnapshot
                  candidate={candidates[0]}
                  highlight={leader.id === candidates[0].id}
                  textAnimClass={textAnimClass}
                  barAnimClass={barAnimClass}
                />
                <CandidateSnapshot
                  candidate={candidates[1]}
                  highlight={leader.id === candidates[1].id}
                  textAnimClass={textAnimClass}
                  barAnimClass={barAnimClass}
                />
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-black/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-white/70">خريطة التوزيع</span>
                  <span className="text-sm font-mono text-white/60">{leader.name} في الصدارة</span>
                </div>
                <div className="flex h-4 overflow-hidden rounded-full bg-white/10">
                  {comparisonSegments.map((segment) => (
                    <div
                      key={segment.label}
                      className={barAnimClass}
                      style={{
                        width: `${segment.percent}%`,
                        backgroundColor: segment.color,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/70">
                  {comparisonSegments.map((segment) => (
                    <div key={`${segment.label}-legend`} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span>
                        {segment.label}: {segment.percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {designStyle === 'COUNTDOWN_TOP' && (
            <div className="absolute left-12 top-12 max-w-[1580px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/55 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="flex items-stretch">
                <div className="min-w-[420px] border-l border-white/10 bg-white/5 px-8 py-8">
                  <div className="mb-4">{sharedMeta}</div>
                  <h1 className="text-4xl font-black text-white">{String(getField('countdownTitle') || 'الوقت المتبقي')}</h1>
                  <p className="mt-3 text-lg text-white/75">{headline}</p>
                  <p className="mt-2 text-sm text-white/55">{targetDateStr}</p>
                </div>
                <div className="flex items-center gap-8 px-10 py-8">
                  {[
                    { label: String(getField('countdownDays') || 'يوم'), value: timeLeft.days },
                    { label: String(getField('countdownHours') || 'ساعة'), value: timeLeft.hours },
                    { label: String(getField('countdownMinutes') || 'دقيقة'), value: timeLeft.minutes },
                    { label: String(getField('countdownSeconds') || 'ثانية'), value: timeLeft.seconds, accent: true },
                  ].map((item, index) => (
                    <React.Fragment key={item.label}>
                      {index > 0 && <span className={`text-4xl text-white/25 ${pulseAnimClass}`}>:</span>}
                      <div className="flex min-w-[140px] flex-col items-center">
                        <span className={`text-7xl font-black text-white ${item.accent ? 'text-red-400' : ''}`}>
                          {String(item.value).padStart(2, '0')}
                        </span>
                        <span className="mt-2 text-sm font-bold tracking-[0.35em] text-white/60">{item.label}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {designStyle === 'LEAKS_FULL' && (
            <div className="absolute inset-x-0 bottom-16 mx-auto w-[88%] max-w-[1680px] overflow-hidden rounded-[2.25rem] border border-white/10 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
              <div className="flex items-center justify-between border-b border-white/10 px-10 py-6" style={{ backgroundColor: String(getField('accentColor') || activeTheme.accent) }}>
                <div className="flex items-center gap-4">
                  <span className="h-3 w-3 rounded-full bg-white animate-ping" />
                  <span className="text-3xl font-black text-white">{String(getField('leaksTitle') || 'عاجل')}</span>
                </div>
                <span className="rounded-full bg-black/20 px-4 py-1 text-sm font-bold text-white/85">
                  {String(getField('leaksSubtitle') || 'تسريب خاص')}
                </span>
              </div>
              <div className="relative bg-[#07111f] px-10 py-12">
                <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
                <div className="relative z-10">
                  <div className="mb-5">{sharedMeta}</div>
                  <h1 className="mb-4 text-4xl font-black text-white">{headline}</h1>
                  <p className="max-w-[1400px] text-5xl font-bold leading-[1.55] text-white">
                    {String(getField('leaksContent') || 'نص التسريب هنا...')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'STATEMENT_FULL' && (
            <div className="absolute inset-x-0 bottom-16 mx-auto flex w-[88%] max-w-[1720px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/55 shadow-[0_35px_140px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="relative w-[360px] shrink-0 overflow-hidden border-l border-white/10">
                <img
                  src={
                    candidates.find((candidate) =>
                      candidate.name.toLowerCase().includes(String(getField('statementAuthor') || '').toLowerCase())
                    )?.image || candidates[0].image
                  }
                  alt={String(getField('statementAuthor') || candidates[0].name)}
                  className="h-full w-full object-cover object-top grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="border-b border-white/10 px-10 py-8">
                  <div className="mb-4">{sharedMeta}</div>
                  <h1 className="text-4xl font-black text-white">{String(getField('statementTitle') || 'بيان رسمي')}</h1>
                  <p className="mt-3 text-white/65">{headline}</p>
                </div>
                <div className="relative flex-1 px-10 py-12">
                  <div className="absolute left-10 top-6 text-[12rem] font-serif leading-none text-white/8">"</div>
                  <p className="relative z-10 max-w-[1080px] text-4xl font-bold leading-[1.65] text-white">
                    {String(getField('specialText') || 'نص البيان هنا...')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'LIVE_TRANSITION' && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <div className="absolute h-[760px] w-[760px] rounded-full border border-white/10 animate-[spin_18s_linear_infinite]" />
              <div
                className="absolute h-[980px] w-[980px] rounded-full border animate-[spin_26s_linear_infinite_reverse]"
                style={{ borderColor: `${activeTheme.primary}44` }}
              />
              <div
                className="absolute h-[1220px] w-[1220px] rounded-full border animate-[spin_34s_linear_infinite]"
                style={{ borderColor: `${activeTheme.accent}22` }}
              />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-8">{sharedMeta}</div>
                <div
                  className="mb-8 flex h-36 w-36 items-center justify-center rounded-full border border-white/15 shadow-[0_0_120px_rgba(255,255,255,0.12)]"
                  style={{ backgroundColor: `${activeTheme.primary}88` }}
                >
                  <img src={barcaLogo} alt="Barcelona" className="h-24 w-24" />
                </div>
                <h1 className="text-8xl font-black text-white">{String(getField('transitionTitle') || 'الانتقال للبث المباشر')}</h1>
                <h2 className="mt-4 text-3xl font-bold tracking-[0.25em] text-white/65">
                  {String(getField('transitionSubtitle') || headline)}
                </h2>
                <div className="mt-8 inline-flex items-center gap-4 rounded-full border border-red-500/40 bg-red-500/10 px-6 py-3 text-xl font-mono text-white">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                  <span>{String(getField('liveText') || 'LIVE')}</span>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'STUDIO_BACKGROUND' && (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={String(getField('bgImage') || '')}
                alt="Studio Background"
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
              <div
                className="absolute z-10 overflow-hidden rounded-[2rem] border-4 border-white/15 bg-black/20 shadow-[0_0_70px_rgba(0,0,0,0.55)] backdrop-blur-sm"
                style={{
                  width: '1280px',
                  height: '720px',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${safeNumber(getField('cameraX'))}px), calc(-50% + ${safeNumber(
                    getField('cameraY')
                  )}px)) scale(${Math.max(0.5, safeNumber(getField('cameraScale')) || 1)})`,
                }}
              >
                <div className="absolute inset-0 border-[12px] border-transparent [border-image:linear-gradient(135deg,rgba(255,255,255,0.35),transparent,rgba(255,255,255,0.35))_1]" />
                <div className="absolute right-6 top-6 flex items-center gap-3 rounded-full bg-black/55 px-4 py-2 text-sm font-mono text-white">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  {String(getField('liveText') || 'LIVE')}
                </div>
              </div>
              <div className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-8 rounded-[2rem] border border-white/10 bg-black/55 px-12 py-7 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <img src={barcaLogo} alt="Barcelona" className="h-24 w-24 drop-shadow-2xl" />
                <div>
                  <div className="mb-3">{sharedMeta}</div>
                  <h1 className="text-5xl font-black text-white">{headline}</h1>
                  <p className="mt-2 text-xl text-white/70">{specialText || subheadline}</p>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'VOTER_TURNOUT' && (
            <div className="absolute bottom-16 left-16 z-20 w-[720px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/60 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="border-b border-white/10 px-8 py-6">
                <div className="mb-4">{sharedMeta}</div>
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-black text-white">{String(getField('turnoutTitle') || 'نسبة المشاركة في التصويت')}</h1>
                  <span className="font-mono text-lg text-white/70">
                    {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="space-y-6 px-8 py-8">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-sm font-bold tracking-[0.24em] text-white/45">
                      {String(getField('turnoutSubtitle') || 'إجمالي الناخبين المسموح لهم')}
                    </div>
                    <div className="mt-2 text-4xl font-black text-white">{formatInteger(totalVoters)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tracking-[0.24em] text-emerald-300/80">
                      {String(getField('currentVotersTitle') || 'المصوتين حتى الآن')}
                    </div>
                    <div className="mt-2 text-5xl font-black text-white">{formatInteger(currentVoters)}</div>
                  </div>
                </div>
                <div className="h-6 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                    style={{ width: `${turnoutPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-[panDiagonal_2s_linear_infinite]" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-white/55">
                  <span>0%</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-emerald-300">{turnoutPercentage.toFixed(1)}</span>
                    <span className="text-xl font-bold text-emerald-300/70">%</span>
                  </div>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'RESULTS_HUB' && (
            <div className="absolute inset-0 p-12">
              <div className="grid h-full grid-cols-[1.55fr_1fr] gap-8">
                <div className="flex flex-col gap-8">
                  <div className="rounded-[2.25rem] border border-white/10 bg-black/45 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="mb-5 flex items-start justify-between gap-8">
                      <div>
                        <div className="mb-4">{sharedMeta}</div>
                        <h1 className="text-6xl font-black text-white">{headline}</h1>
                        <p className="mt-4 max-w-[860px] text-xl leading-8 text-white/70">{subheadline}</p>
                      </div>
                      <img src={barcaLogo} alt="Barcelona" className="h-28 w-28 shrink-0" />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      {candidates.map((candidate) => (
                        <CandidateSnapshot
                          key={candidate.id}
                          candidate={candidate}
                          highlight={leader.id === candidate.id}
                          textAnimClass={textAnimClass}
                          barAnimClass={barAnimClass}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2.25rem] border border-white/10 bg-black/45 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-2xl font-black text-white">شريط المقارنة</h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65">
                        {leader.name} يتصدر حالياً
                      </span>
                    </div>
                    <div className="flex h-6 overflow-hidden rounded-full bg-white/10">
                      {comparisonSegments.map((segment) => (
                        <div
                          key={`hub-${segment.label}`}
                          className={barAnimClass}
                          style={{ width: `${segment.percent}%`, backgroundColor: segment.color }}
                        />
                      ))}
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      {comparisonSegments.map((segment) => (
                        <div key={`hub-card-${segment.label}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                            <span className="font-bold text-white/75">{segment.label}</span>
                          </div>
                          <div className="text-3xl font-black text-white">{segment.percent.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="rounded-[2.25rem] border border-white/10 bg-black/45 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-2xl font-black text-white">مؤشر المشاركة</h2>
                      <span className="font-mono text-sm text-white/55">
                        {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-sm font-bold tracking-[0.2em] text-white/45">المصوتون</div>
                        <div className="mt-3 text-4xl font-black text-white">{formatInteger(currentVoters)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-sm font-bold tracking-[0.2em] text-white/45">إجمالي الهيئة</div>
                        <div className="mt-3 text-4xl font-black text-white">{formatInteger(totalVoters)}</div>
                      </div>
                    </div>
                    <div className="mt-6 h-5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300"
                        style={{ width: `${turnoutPercentage}%` }}
                      />
                    </div>
                    <div className="mt-4 text-right text-5xl font-black text-emerald-300">{turnoutPercentage.toFixed(1)}%</div>
                  </div>

                  <div className="rounded-[2.25rem] border border-white/10 bg-black/45 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <h2 className="text-2xl font-black text-white">ملاحظات البث</h2>
                    <p className="mt-4 text-xl leading-9 text-white/72">{specialText || 'أدخل ملاحظة تحليلية أو تحديثاً سريعاً للبث المباشر.'}</p>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="mb-2 text-sm font-bold tracking-[0.2em] text-white/45">المصدر</div>
                      <div className="text-lg font-bold text-white/75">{sourceLabel}</div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="mb-2 text-sm font-bold tracking-[0.2em] text-white/45">آخر تحديث</div>
                      <div className="text-lg font-mono text-white/75">{lastUpdated}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectionOverlay;
