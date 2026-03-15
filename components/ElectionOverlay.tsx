import React, { useEffect, useMemo, useState } from 'react';
import { OverlayConfig } from '../types';
import { resolveElectionStyle } from '../utils/election';

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
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};
const parseLocalDateTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2})(?::(\d{2}))?(?::(\d{2}))?)?$/);
  if (match) {
    const [, year, month, day, hours = '00', minutes = '00', seconds = '00'] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)).getTime();
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const MetaPill = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`rounded-full border px-4 py-2 text-xs font-black tracking-[0.22em] ${className}`} style={style}>
    {children}
  </div>
);

const CandidateBarCard = ({
  candidate,
  align = 'right',
}: {
  candidate: CandidateCard;
  align?: 'left' | 'right';
}) => (
  <div className={`flex items-center gap-4 ${align === 'left' ? 'flex-row-reverse text-left' : 'text-right'}`}>
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20 shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
      <img src={candidate.image} alt={candidate.name} className="h-full w-full object-cover object-top" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: candidate.color }} />
        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{candidate.tag}</span>
      </div>
      <div className="truncate text-3xl font-black text-slate-900">{candidate.name}</div>
      <div className={`mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 ${align === 'left' ? 'origin-right' : 'origin-left'}`}>
        <div className="h-full rounded-full" style={{ width: `${candidate.percent}%`, backgroundColor: candidate.color }} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="text-5xl font-black leading-none text-slate-900">{candidate.percent.toFixed(1)}%</div>
        <div className={`${candidate.delta >= 0 ? 'text-emerald-600' : 'text-red-500'} text-sm font-black`}>{formatDelta(candidate.delta)}</div>
      </div>
      <div className="mt-2 text-xs font-mono text-slate-500">{formatInteger(candidate.votes)} votes</div>
    </div>
  </div>
);

const CandidateTallStrip = ({ candidate }: { candidate: CandidateCard }) => (
  <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
    <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: candidate.color }} />
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.5rem] border border-white/10">
        <img src={candidate.image} alt={candidate.name} className="h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">{candidate.tag}</div>
        <div className="truncate text-2xl font-black text-white">{candidate.name}</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${candidate.percent}%`, backgroundColor: candidate.color }} />
        </div>
      </div>
      <div className="text-right">
        <div className="text-4xl font-black text-white">{candidate.percent.toFixed(1)}%</div>
        <div className="text-xs font-mono text-white/45">{formatInteger(candidate.votes)}</div>
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
  const getField = (id: string) => config.fields.find(field => field.id === id)?.value;

  const headline = String(getField('headline') || 'انتخابات برشلونة 2026');
  const subheadline = String(getField('subheadline') || 'Live coverage');
  const watermarkText = String(getField('watermarkText') || 'REO SHOW');
  const rawDesignStyle = String(getField('designStyle') || 'RESULTS_BAR');
  const templateVariantMap: Record<string, string> = {
    'template-election-results-bar': 'RESULTS_BAR',
    'template-election-quote-panel': 'QUOTE_PANEL',
    'template-election-versus-panel': 'VERSUS_PANEL',
    'template-election-sidebar-tower': 'SIDEBAR_TOWER',
    'template-election-turnout-strip': 'TURNOUT_STRIP',
  };
  const designStyle = templateVariantMap[config.templateId || ''] || resolveElectionStyle(rawDesignStyle);
  const themeKey = String(getField('themePreset') || 'BARCA_RED');
  const activeTheme = themes[themeKey] || themes.BARCA_RED;
  const statusBadge = String(getField('statusBadge') || 'LIVE');
  const sourceLabel = String(getField('sourceLabel') || 'Barcelona Elections Center');
  const lastUpdated = String(getField('lastUpdated') || 'Last update 20:45');
  const phaseLabel = String(getField('phaseLabel') || 'Live count');
  const barcaLogo = String(
    getField('barcaLogo') ||
      'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/1200px-FC_Barcelona_%28crest%29.svg.png'
  );
  const specialText = String(getField('specialText') || '');
  const statementAuthor = String(getField('statementAuthor') || '');
  const targetDateStr = String(getField('targetDate') || '2026-06-30 20:00');
  const showUndecided = getField('showUndecided') !== false;

  const candidates: CandidateCard[] = [
    {
      id: 'candidate1',
      name: String(getField('candidate1Name') || 'Candidate 1'),
      image: String(getField('candidate1Image') || ''),
      percent: clampPercent(safeNumber(getField('candidate1Percent'))),
      color: String(getField('candidate1Color') || '#a50044'),
      votes: safeNumber(getField('candidate1Votes')),
      delta: safeNumber(getField('candidate1Delta')),
      tag: String(getField('candidate1Tag') || 'Candidate 1'),
    },
    {
      id: 'candidate2',
      name: String(getField('candidate2Name') || 'Candidate 2'),
      image: String(getField('candidate2Image') || ''),
      percent: clampPercent(safeNumber(getField('candidate2Percent'))),
      color: String(getField('candidate2Color') || '#004d98'),
      votes: safeNumber(getField('candidate2Votes')),
      delta: safeNumber(getField('candidate2Delta')),
      tag: String(getField('candidate2Tag') || 'Candidate 2'),
    },
  ];

  const leader = useMemo(() => [...candidates].sort((left, right) => right.percent - left.percent)[0], [candidates]);
  const quoteCandidate =
    candidates.find(candidate => statementAuthor && candidate.name.toLowerCase().includes(statementAuthor.toLowerCase())) || leader;

  const undecidedSegment = {
    label: String(getField('undecidedLabel') || 'Undecided'),
    percent: clampPercent(safeNumber(getField('undecidedPercent'))),
    color: String(getField('undecidedColor') || '#94a3b8'),
  };

  const comparisonSegments = [
    { label: candidates[0].name, percent: candidates[0].percent, color: candidates[0].color },
    { label: candidates[1].name, percent: candidates[1].percent, color: candidates[1].color },
    ...(showUndecided ? [undecidedSegment] : []),
  ];

  const totalSegmentPercent = comparisonSegments.reduce((sum, segment) => sum + segment.percent, 0) || 1;
  const currentVoters = safeNumber(getField('currentVoters'));
  const totalVoters = Math.max(1, safeNumber(getField('totalVoters')) || 1);
  const turnoutPercentage = clampPercent((currentVoters / totalVoters) * 100);
  const gapPercent = Math.abs(candidates[0].percent - candidates[1].percent);
  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  const [timeLeft, setTimeLeft] = useState<CountdownState>(ZERO_COUNTDOWN);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (designStyle !== 'COUNTDOWN_BANNER') {
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
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [designStyle, targetDateStr]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rootClass = config.isVisible ? 'animate-cinematic-fade-up' : 'opacity-0 scale-95 transition-all duration-500';
  const clockLabel = currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const sharedMeta = (
    <div className="flex flex-wrap items-center gap-2">
      <MetaPill className="text-white" style={{ backgroundColor: activeTheme.primary, borderColor: `${activeTheme.primary}88` }}>
        {statusBadge}
      </MetaPill>
      <MetaPill className="border-black/10 bg-white text-slate-700">{phaseLabel}</MetaPill>
      <MetaPill className="border-white/10 bg-slate-950/70 text-white/70">{sourceLabel}</MetaPill>
      <MetaPill className="border-white/10 bg-slate-950/70 text-white/55">{lastUpdated}</MetaPill>
    </div>
  );

  return (
    <div style={containerStyle}>
      <audio ref={audioRef} />
      <div style={contentWrapperStyle} className="relative z-10 h-full w-full">
        <div className={`relative h-full w-full overflow-hidden subpixel-antialiased ${rootClass}`}>
          <style>{`
            @keyframes electionSweep {
              0% { transform: translateX(-100%); opacity: 0; }
              30% { opacity: 1; }
              100% { transform: translateX(100%); opacity: 0; }
            }
          `}</style>

          {designStyle === 'RESULTS_BAR' && (
            <div className="absolute bottom-8 left-1/2 w-[1540px] max-w-[94vw] -translate-x-1/2 overflow-hidden rounded-[2.2rem] border border-slate-200/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${candidates[1].color}, ${activeTheme.accent}, ${candidates[0].color})` }} />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.78),rgba(248,250,252,0.96))]" />
              <div className="absolute inset-y-0 left-0 w-[32%] bg-gradient-to-r from-[#004d98]/12 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-[32%] bg-gradient-to-l from-[#a50044]/12 to-transparent" />

              <div className="relative px-8 pt-6 pb-7">
                <div className="mb-5 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <img src={barcaLogo} alt="Barcelona" className="h-14 w-14 shrink-0 drop-shadow-lg" />
                    <div>
                      <div className="text-2xl font-black text-slate-950">{headline}</div>
                      <div className="text-sm font-medium text-slate-500">{subheadline}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">{sharedMeta}</div>
                </div>

                <div className="grid grid-cols-[1fr_370px_1fr] items-center gap-6">
                  <CandidateBarCard candidate={candidates[0]} align="right" />

                  <div className="rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-5 text-center shadow-[0_20px_50px_rgba(15,23,42,0.28)]">
                    <div className="text-[11px] font-black uppercase tracking-[0.32em] text-white/45">Live Score</div>
                    <div className="mt-3 flex items-end justify-center gap-4 text-white">
                      <span className="text-6xl font-black">{candidates[0].percent.toFixed(1)}</span>
                      <span className="mb-2 text-3xl text-white/25">|</span>
                      <span className="text-6xl font-black">{candidates[1].percent.toFixed(1)}</span>
                    </div>
                    <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10">
                      {comparisonSegments.map(segment => (
                        <div
                          key={segment.label}
                          className="h-full"
                          style={{ width: `${(segment.percent / totalSegmentPercent) * 100}%`, backgroundColor: segment.color }}
                        />
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-white/55">
                      <span>Gap {gapPercent.toFixed(1)}%</span>
                      <span>{formatInteger(totalVotes)} votes</span>
                    </div>
                  </div>

                  <CandidateBarCard candidate={candidates[1]} align="left" />
                </div>
              </div>
            </div>
          )}

          {designStyle === 'QUOTE_PANEL' && (
            <div className="absolute top-10 right-10 flex w-[1480px] max-w-[94vw] items-end gap-6">
              <div className="relative w-[320px] shrink-0 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.3)]">
                <img src={quoteCandidate.image} alt={quoteCandidate.name} className="h-[430px] w-full object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
                <div className="absolute bottom-5 right-5 left-5">
                  <div className="mb-2 inline-flex rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-white">
                    {quoteCandidate.tag}
                  </div>
                  <div className="text-2xl font-black text-white">{quoteCandidate.name}</div>
                </div>
              </div>

              <div className="relative flex-1 overflow-hidden rounded-[2.4rem] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
                <div className="absolute right-8 top-2 text-[13rem] font-black leading-none text-[#f43f5e]/14">”</div>
                <div className="absolute left-0 bottom-0 h-6 w-full" style={{ background: `linear-gradient(90deg, ${candidates[1].color}, ${activeTheme.accent}, ${candidates[0].color})` }} />
                <div className="relative p-8">
                  <div className="mb-6 flex items-center justify-between gap-6">
                    <div>
                      <div className="text-4xl font-black text-slate-950">{headline}</div>
                      <div className="mt-2 text-lg text-slate-500">{subheadline}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">{sharedMeta}</div>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-slate-50/90 px-8 py-8">
                    <div className="text-5xl font-black leading-[1.45] text-slate-900">{specialText || subheadline}</div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img src={barcaLogo} alt="Barcelona" className="h-12 w-12" />
                      <div>
                        <div className="text-sm font-black uppercase tracking-[0.28em] text-slate-500">{watermarkText}</div>
                        <div className="text-2xl font-black text-slate-950">{statementAuthor || quoteCandidate.name}</div>
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black uppercase tracking-[0.24em] text-white">
                      {phaseLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'VERSUS_PANEL' && (
            <div className="absolute bottom-16 left-1/2 h-[470px] w-[1500px] max-w-[94vw] -translate-x-1/2 overflow-hidden rounded-[2.8rem] border border-white/10 shadow-[0_40px_110px_rgba(15,23,42,0.45)]">
              <div className="absolute inset-0 bg-slate-950" />
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-br from-[#a50044] via-[#7f0e44] to-[#300614]" />
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-[#004d98] via-[#00356b] to-[#041222]" />
              <div className="absolute inset-y-0 left-1/2 w-20 -translate-x-1/2 bg-white [clip-path:polygon(0_0,100%_0,65%_100%,35%_100%)] opacity-95" />

              {candidates.map((candidate, index) => (
                <div key={candidate.id} className={`absolute inset-y-0 w-1/2 ${index === 0 ? 'left-0' : 'right-0'}`}>
                  <img
                    src={candidate.image}
                    alt={candidate.name}
                    className={`absolute inset-0 h-full w-full object-cover object-top opacity-30 ${index === 0 ? 'scale-x-[-1]' : ''}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                </div>
              ))}

              <div className="absolute top-8 left-1/2 z-20 -translate-x-1/2">{sharedMeta}</div>

              <div className="relative z-10 flex h-full items-end justify-between px-12 pb-10">
                {candidates.map((candidate, index) => (
                  <div key={candidate.id} className={`w-[42%] ${index === 0 ? 'text-left' : 'text-right'}`}>
                    <div className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-white/55">{candidate.tag}</div>
                    <div className="text-7xl font-black leading-none text-white">{candidate.name}</div>
                    <div className="mt-3 flex items-end gap-4 text-white">
                      <div className="text-[7.5rem] font-black leading-none">{candidate.percent.toFixed(1)}%</div>
                      <div className={`mb-4 rounded-full px-4 py-2 text-sm font-black ${candidate.delta >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>
                        {formatDelta(candidate.delta)}
                      </div>
                    </div>
                    <div className={`mt-4 h-3 overflow-hidden rounded-full bg-white/10 ${index === 0 ? 'origin-left' : 'origin-right'}`}>
                      <div className="h-full rounded-full" style={{ width: `${candidate.percent}%`, backgroundColor: candidate.color }} />
                    </div>
                    <div className="mt-3 text-sm font-mono text-white/55">{formatInteger(candidate.votes)} votes</div>
                  </div>
                ))}
              </div>

              <div className="absolute left-1/2 top-1/2 z-20 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950 shadow-[0_0_50px_rgba(255,255,255,0.15)]">
                <img src={barcaLogo} alt="Barcelona" className="h-16 w-16" />
              </div>
            </div>
          )}

          {designStyle === 'SIDEBAR_TOWER' && (
            <div className="absolute top-8 right-8 flex h-[930px] w-[390px] max-w-[26vw] flex-col overflow-hidden rounded-[2.4rem] border border-white/10 bg-slate-950/92 shadow-[0_35px_90px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
              <div className="relative overflow-hidden border-b border-white/10 px-6 py-6">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <img src={barcaLogo} alt="Barcelona" className="h-14 w-14" />
                    <div className="rounded-full bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/70">{clockLabel}</div>
                  </div>
                  <div className="text-2xl font-black text-white">{headline}</div>
                  <div className="mt-2 text-sm text-white/55">{subheadline}</div>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="flex flex-wrap gap-2">{sharedMeta}</div>
                <CandidateTallStrip candidate={candidates[0]} />
                <CandidateTallStrip candidate={candidates[1]} />
              </div>

              <div className="mt-auto border-t border-white/10 px-5 py-5">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/45">{String(getField('turnoutTitle') || 'Turnout')}</div>
                    <div className="text-4xl font-black text-emerald-300">{turnoutPercentage.toFixed(1)}%</div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300" style={{ width: `${turnoutPercentage}%` }} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-white/55">
                    <span>{formatInteger(currentVoters)}</span>
                    <span>{formatInteger(totalVoters)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'TURNOUT_STRIP' && (
            <div className="absolute bottom-8 left-8 w-[820px] max-w-[92vw] overflow-hidden rounded-[2.1rem] border border-white/10 bg-slate-950/88 px-7 py-6 shadow-[0_30px_90px_rgba(15,23,42,0.4)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,197,94,0.18),transparent,rgba(56,189,248,0.12))]" />
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between gap-5">
                  <div>
                    <div className="text-2xl font-black text-white">{String(getField('turnoutTitle') || headline)}</div>
                    <div className="mt-1 text-sm text-white/55">{String(getField('turnoutSubtitle') || subheadline)}</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">{sharedMeta}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr_160px] items-center gap-5">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">{String(getField('currentVotersTitle') || 'Current voters')}</div>
                    <div className="mt-2 text-4xl font-black text-white">{formatInteger(currentVoters)}</div>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-white/45">
                      <span>0%</span>
                      <span>{clockLabel}</span>
                      <span>100%</span>
                    </div>
                    <div className="relative h-4 overflow-hidden rounded-full bg-white/10">
                      <div className="absolute inset-0 w-[35%] bg-white/10 blur-xl" style={{ animation: 'electionSweep 2.6s linear infinite' }} />
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300" style={{ width: `${turnoutPercentage}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">Turnout</div>
                    <div className="mt-2 text-5xl font-black text-emerald-300">{turnoutPercentage.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {designStyle === 'COUNTDOWN_BANNER' && (
            <div className="absolute top-8 left-1/2 w-[1120px] max-w-[94vw] -translate-x-1/2 overflow-hidden rounded-[2.2rem] border border-white/10 bg-slate-950/92 px-8 py-7 shadow-[0_30px_90px_rgba(15,23,42,0.42)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(56,189,248,0.16),transparent,rgba(165,0,68,0.2))]" />
              <div className="relative z-10 flex items-center justify-between gap-8">
                <div className="min-w-[280px]">
                  <div className="mb-3 flex flex-wrap gap-2">{sharedMeta}</div>
                  <div className="text-4xl font-black text-white">{String(getField('countdownTitle') || headline)}</div>
                  <div className="mt-2 text-base text-white/60">{targetDateStr}</div>
                </div>
                <div className="flex items-center gap-5">
                  {[
                    { label: String(getField('countdownDays') || 'Days'), value: timeLeft.days },
                    { label: String(getField('countdownHours') || 'Hours'), value: timeLeft.hours },
                    { label: String(getField('countdownMinutes') || 'Minutes'), value: timeLeft.minutes },
                    { label: String(getField('countdownSeconds') || 'Seconds'), value: timeLeft.seconds },
                  ].map(item => (
                    <div key={item.label} className="flex min-w-[125px] flex-col items-center rounded-[1.8rem] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-6xl font-black text-white">{String(item.value).padStart(2, '0')}</div>
                      <div className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-white/45">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {designStyle === 'BREAKING_PANEL' && (
            <div className="absolute top-8 left-8 w-[1040px] max-w-[92vw] overflow-hidden rounded-[2.1rem] border border-red-400/20 bg-slate-950/92 shadow-[0_30px_90px_rgba(15,23,42,0.42)]">
              <div className="flex items-center justify-between gap-4 border-b border-red-500/20 bg-gradient-to-r from-red-600 to-rose-600 px-7 py-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                  <div className="text-3xl font-black">{String(getField('leaksTitle') || 'Breaking')}</div>
                </div>
                <div className="rounded-full bg-black/20 px-4 py-2 text-sm font-black uppercase tracking-[0.22em]">
                  {String(getField('leaksSubtitle') || phaseLabel)}
                </div>
              </div>
              <div className="relative px-7 py-7">
                <div className="mb-4 flex flex-wrap gap-2">{sharedMeta}</div>
                <div className="text-2xl font-black text-white">{headline}</div>
                <div className="mt-4 text-4xl font-black leading-[1.55] text-white">{String(getField('leaksContent') || specialText || subheadline)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectionOverlay;
