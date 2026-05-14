import React, { useEffect, useMemo, useRef } from 'react';
import { RendererProps } from './SharedComponents';

type MarketItem = {
  player: string;
  from: string;
  to: string;
  value: string;
  confidence: number;
  status: string;
};

const clampPercent = (value: unknown, fallback = 70) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
};

const splitText = (value: unknown, fallback: string[]) => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw
    .split(/\n|;/)
    .map(item => item.trim())
    .filter(Boolean);
};

const parseMarketItems = (value: unknown): MarketItem[] => {
  const fallback: MarketItem[] = [
    { player: 'Nico Williams', from: 'Athletic', to: 'Barcelona', value: '58M EUR', confidence: 78, status: 'Advanced talks' },
    { player: 'Joshua Kimmich', from: 'Bayern', to: 'Barcelona', value: 'Free / Bonus', confidence: 64, status: 'Monitoring' },
    { player: 'Joao Cancelo', from: 'Man City', to: 'Barcelona', value: 'Loan + option', confidence: 72, status: 'Expected' },
  ];

  const raw = String(value || '').trim();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        player: String(item.player || item.name || fallback[index % fallback.length].player),
        from: String(item.from || fallback[index % fallback.length].from),
        to: String(item.to || fallback[index % fallback.length].to),
        value: String(item.value || item.dealValue || fallback[index % fallback.length].value),
        confidence: clampPercent(item.confidence, fallback[index % fallback.length].confidence),
        status: String(item.status || fallback[index % fallback.length].status),
      }));
    }
  } catch {
    return raw.split(/\n|;/).map((line, index) => {
      const [player, from, to, value, confidence, status] = line.split('|').map(part => part?.trim());
      return {
        player: player || fallback[index % fallback.length].player,
        from: from || fallback[index % fallback.length].from,
        to: to || fallback[index % fallback.length].to,
        value: value || fallback[index % fallback.length].value,
        confidence: clampPercent(confidence, fallback[index % fallback.length].confidence),
        status: status || fallback[index % fallback.length].status,
      };
    });
  }

  return fallback;
};

const confidenceColor = (confidence: number, accentColor: string) => {
  if (confidence >= 85) return '#19d37f';
  if (confidence >= 65) return accentColor;
  return '#ff4d5e';
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-black uppercase tracking-[0.34em] text-white/45">{children}</div>
);

export const TransferNewsRenderer: React.FC<RendererProps> = ({
  getField,
  containerStyle,
  contentWrapperStyle,
  playSound,
  wasVisible,
}) => {
  const playerName = String(getField('playerName') || 'PLAYER NAME');
  const playerImage = String(getField('playerImage') || '');
  const fromClub = String(getField('fromClub') || 'BARCELONA');
  const toClub = String(getField('toClub') || 'JUVENTUS');
  const dealValue = String(getField('dealValue') || '80M EUR');
  const confidence = clampPercent(getField('confidence'), 85);
  const headline = String(getField('headline') || 'DONE DEAL');
  const subheadline = String(getField('subheadline') || 'Mercato desk live update');
  const source = String(getField('source') || 'Reo Show Exclusive');
  const accentColor = String(getField('accentColor') || '#E9FF00');
  const isUrgent = Boolean(getField('isUrgent') ?? true);
  const fromColor = String(getField('fromColor') || '#A50044');
  const toColor = String(getField('toColor') || '#111111');
  const designStyle = String(getField('designStyle') || 'DEAL_BREAKER');
  const marketItems = useMemo(() => parseMarketItems(getField('marketItems')), [getField]);
  const latestNews = splitText(getField('latestNews'), [
    'Club board approved the sporting profile and salary range.',
    'Agent meeting expected within 48 hours.',
    'Final decision depends on outgoing transfers.',
  ]);
  const dailyDeals = splitText(getField('dailyDeals'), [
    'Here we go: young winger signs until 2030',
    'Loan deal completed with buy option',
    'Medical booked after verbal agreement',
  ]);
  const expectedDeals = splitText(getField('expectedDeals'), [
    'Left wing priority moves to final shortlist',
    'Defensive midfielder talks remain open',
    'Full-back loan return being negotiated',
  ]);

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) {
      didPlay.current = true;
      playSound('ENTRY').catch(() => {});
    }
  }, [wasVisible, playSound]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Tajawal:wght@700;900&display=swap" rel="stylesheet" />
      <div style={contentWrapperStyle} className="overflow-hidden">
        <div className="absolute inset-0 bg-[#050608]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
            backgroundSize: '96px 96px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-10" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 58%)` }} />
        <div className="absolute bottom-0 left-0 h-2/5 w-3/5 blur-3xl" style={{ background: `${fromColor}40` }} />
        <div className="absolute right-0 top-0 h-2/5 w-3/5 blur-3xl" style={{ background: `${accentColor}24` }} />
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );

  if (designStyle === 'MARKET_COMMAND_CENTER') {
    return (
      <Shell>
        <div className="absolute inset-0 grid grid-cols-[1.05fr_.95fr] gap-8 p-14 text-white" style={{ fontFamily: 'Tajawal, sans-serif' }}>
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <div className="mb-3 inline-flex bg-white px-4 py-1 text-xs font-black uppercase tracking-[.28em] text-black">Mercato Command</div>
              <h1 className="max-w-[780px] text-[76px] font-black leading-[.86] tracking-normal">{headline}</h1>
              <p className="mt-5 max-w-[720px] text-2xl font-bold leading-tight text-white/70">{subheadline}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Deals today', dailyDeals.length],
                ['Expected', expectedDeals.length],
                ['Reliability', `${confidence}%`],
              ].map(([label, value]) => (
                <div key={label} className="border border-white/15 bg-white/[.06] p-5">
                  <div className="text-5xl font-black" style={{ color: accentColor }}>{value}</div>
                  <div className="mt-2 text-xs font-black uppercase tracking-[.22em] text-white/45">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 grid-rows-[1fr_1fr_1fr] gap-4">
            {[
              ['DONE TODAY', dailyDeals, '#19d37f'],
              ['EXPECTED MOVES', expectedDeals, accentColor],
              ['LATEST NEWS', latestNews, '#65a7ff'],
            ].map(([title, list, color]) => (
              <div key={String(title)} className="overflow-hidden border border-white/15 bg-black/45">
                <div className="flex h-12 items-center justify-between px-5 text-black" style={{ background: String(color) }}>
                  <span className="font-black uppercase tracking-[.22em]">{title}</span>
                  <span className="font-black">{(list as string[]).length}</span>
                </div>
                <div className="space-y-3 p-5">
                  {(list as string[]).slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-lg font-black leading-tight">
                      <span className="flex h-7 w-7 items-center justify-center bg-white/10 text-sm">{index + 1}</span>
                      <span className="min-w-0 truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-5 left-14 text-xs font-black uppercase tracking-[.35em] text-white/35">{source}</div>
        </div>
      </Shell>
    );
  }

  if (designStyle === 'RUMOUR_RADAR') {
    return (
      <Shell>
        <div className="absolute inset-0 flex items-center justify-center p-16 text-white" style={{ fontFamily: 'Tajawal, sans-serif' }}>
          <div className="grid h-[78%] w-[88%] grid-cols-[420px_1fr] overflow-hidden border border-white/15 bg-black/58 shadow-[0_40px_140px_rgba(0,0,0,.8)]">
            <div className="relative flex flex-col justify-between border-l border-white/15 p-9">
              <div>
                <FieldLabel>Transfer Probability</FieldLabel>
                <div className="mt-3 text-[74px] font-black leading-none" style={{ color: accentColor }}>{confidence}%</div>
                <div className="mt-5 h-3 bg-white/10">
                  <div className="h-full" style={{ width: `${confidence}%`, background: confidenceColor(confidence, accentColor) }} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-black leading-none">{playerName}</div>
                <div className="mt-3 flex items-center gap-3 text-xl font-black uppercase">
                  <span>{fromClub}</span>
                  <span style={{ color: accentColor }}>TO</span>
                  <span>{toClub}</span>
                </div>
              </div>
            </div>

            <div className="relative p-9">
              <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[2px] w-[520px] -translate-x-1/2 bg-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[520px] w-[2px] -translate-y-1/2 bg-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border-t-4" style={{ borderTopColor: accentColor, animation: 'spin 7s linear infinite' }} />

              {marketItems.slice(0, 5).map((item, index) => {
                const positions = [[52, 18], [80, 38], [70, 72], [35, 72], [22, 35]];
                const [left, top] = positions[index] || [50, 50];
                return (
                  <div key={`${item.player}-${index}`} className="absolute w-56 -translate-x-1/2 -translate-y-1/2 border border-white/15 bg-[#080b10]/90 p-3" style={{ left: `${left}%`, top: `${top}%` }}>
                    <div className="truncate text-xl font-black">{item.player}</div>
                    <div className="mt-1 text-xs font-black uppercase text-white/45">{item.from} / {item.to}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-black" style={{ color: confidenceColor(item.confidence, accentColor) }}>{item.confidence}%</span>
                      <span className="text-xs font-black text-white/50">{item.status}</span>
                    </div>
                  </div>
                );
              })}
              <style>{'@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }'}</style>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (designStyle === 'DONE_DEALS_WALL') {
    return (
      <Shell>
        <div className="absolute inset-0 p-14 text-white" style={{ fontFamily: 'Tajawal, sans-serif' }}>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <FieldLabel>Completed Today</FieldLabel>
              <h1 className="mt-2 text-[72px] font-black uppercase leading-none">{headline}</h1>
            </div>
            <div className="bg-white px-6 py-3 text-4xl font-black text-black">{dailyDeals.length}</div>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {marketItems.slice(0, 6).map((item, index) => (
              <div key={`${item.player}-${index}`} className="relative min-h-48 overflow-hidden border border-white/15 bg-white/[.06] p-5">
                <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full" style={{ background: `${accentColor}22` }} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-4xl font-black leading-none">{item.player}</div>
                      <div className="mt-3 text-base font-black uppercase text-white/48">{item.from} {'->'} {item.to}</div>
                    </div>
                    <div className="bg-[#19d37f] px-3 py-1 text-xs font-black uppercase text-black">Done</div>
                  </div>
                  <div className="mt-8 flex items-end justify-between">
                    <span className="text-3xl font-black" style={{ color: accentColor }}>{item.value}</span>
                    <span className="text-sm font-black text-white/45">{item.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-5 right-14 text-xs font-black uppercase tracking-[.35em] text-white/35">{source}</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {isUrgent && (
        <div className="absolute top-0 inset-x-0 z-30 flex h-10 items-center justify-center overflow-hidden" style={{ background: accentColor }}>
          <div className="text-[12px] font-black uppercase tracking-[0.5em] text-black" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            TRANSFER NEWS / REO SHOW EXCLUSIVE / TRANSFER NEWS
          </div>
        </div>
      )}

      <div className="absolute" style={{ left: 0, top: isUrgent ? 40 : 0, bottom: 0, width: '52%' }}>
        {playerImage ? (
          <div className="relative h-full w-full overflow-visible">
            <img src={playerImage} alt="" className="absolute h-full max-w-none object-cover object-top" style={{ top: '-5%', right: '-15%', width: '115%' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #05060820 30%, #050608 95%)' }} />
            <div className="absolute bottom-0 inset-x-0 h-2/5" style={{ background: 'linear-gradient(to top, #050608, transparent)' }} />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${fromColor}44, #050608)` }}>
            <span className="text-[120px] font-black opacity-20">FT</span>
          </div>
        )}
      </div>

      <div className="absolute flex flex-col justify-center text-white" style={{ left: '40%', right: 28, top: isUrgent ? 40 : 0, bottom: 0, padding: '24px 0', fontFamily: 'Tajawal, sans-serif' }}>
        <div className="mb-4">
          <FieldLabel>Player</FieldLabel>
          <h1 className="font-black uppercase leading-[0.9]" style={{ fontSize: 'clamp(42px, 6vw, 84px)', letterSpacing: 0 }}>{playerName}</h1>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div style={{ background: fromColor, padding: '6px 14px' }}><span className="font-black uppercase text-white">{fromClub}</span></div>
          <span className="font-black text-white/40">TO</span>
          <div style={{ background: toColor, padding: '6px 14px' }}><span className="font-black uppercase text-white">{toClub}</span></div>
        </div>

        <div className="mb-5">
          <FieldLabel>Fee</FieldLabel>
          <p className="font-black leading-none" style={{ fontSize: 'clamp(34px, 4.5vw, 62px)', color: accentColor }}>{dealValue}</p>
        </div>

        <div className="mb-5 self-start">
          <div className="inline-flex items-center gap-2 px-4 py-2 font-black uppercase text-black" style={{ background: accentColor, fontSize: 16, clipPath: 'polygon(0 0, 100% 0, 94% 100%, 0 100%)' }}>
            {headline}
          </div>
        </div>

        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Reliability</span>
            <span className="font-black" style={{ color: confidenceColor(confidence, accentColor), fontSize: 16 }}>{confidence}%</span>
          </div>
          <div className="h-2 bg-white/10">
            <div style={{ width: `${confidence}%`, background: confidenceColor(confidence, accentColor), height: '100%', transition: 'width 1.5s ease' }} />
          </div>
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest text-white/25">{source}</p>
      </div>
    </Shell>
  );
};
