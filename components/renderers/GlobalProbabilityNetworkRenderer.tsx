import React, { useEffect, useState } from 'react';

type GetField = (id: string) => unknown;

interface GlobalProbabilityNetworkRendererProps {
  getField: GetField;
}

interface Deal {
  idx: number;
  player: string;
  fromClub: string;
  toClub: string;
  image: string;
  fromLogo: string;
  toLogo: string;
  oldPct: number;
  newPct: number;
  fee: string;
  status: string;
  source: string;
}

interface Labels {
  old: string;
  current: string;
  movement: string;
  source: string;
  featured: string;
  fromClub: string;
  toClub: string;
  ready: string;
  previousAverage: string;
  currentAverage: string;
  risingFalling: string;
}

const COLORS = {
  ink: '#05070b',
  panel: '#0c1118',
  panel2: '#111923',
  line: 'rgba(255,255,255,0.13)',
  text: '#f5f7fa',
  muted: '#91a0af',
  cyan: '#37e8ff',
  mint: '#4dffb8',
  lime: '#c6ff45',
  coral: '#ff5d78',
  amber: '#ffb43a',
};

const clamp = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : fallback;
};

const colorFor = (pct: number) => {
  if (pct >= 80) return COLORS.lime;
  if (pct >= 62) return COLORS.mint;
  if (pct >= 45) return COLORS.amber;
  return COLORS.coral;
};

const labelFor = (pct: number) => {
  if (pct >= 80) return 'قريبة جدًا';
  if (pct >= 62) return 'متقدمة';
  if (pct >= 45) return 'مفتوحة';
  return 'بعيدة';
};

const initials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : value.slice(0, 2)).toUpperCase();
};

const AnimatedNumber: React.FC<{ from: number; to: number; active: boolean; delay?: number; size?: number }> = ({ from, to, active, delay = 0, size = 52 }) => {
  const [display, setDisplay] = useState(active ? from : to);

  useEffect(() => {
    if (!active) {
      setDisplay(to);
      return;
    }
    setDisplay(from);
    let frame = 0;
    const started = performance.now() + delay;
    const run = (now: number) => {
      if (now < started) {
        frame = requestAnimationFrame(run);
        return;
      }
      const progress = Math.min(1, (now - started) / 1250);
      const eased = 1 - Math.pow(1 - progress, 5);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [active, delay, from, to]);

  return <span className="gpn-number" style={{ fontSize: size }}>{display}%</span>;
};

const ClubLogo: React.FC<{ src: string; name: string; size?: number }> = ({ src, name, size = 34 }) => (
  <div className="gpn-club-logo" style={{ width: size, height: size, fontSize: Math.max(8, size * 0.27) }}>
    {src ? <img src={src} alt="" /> : initials(name)}
  </div>
);

const Portrait: React.FC<{ deal: Deal; size?: number }> = ({ deal, size = 62 }) => (
  <div className="gpn-portrait" style={{ width: size, height: size }}>
    {deal.image ? <img src={deal.image} alt="" /> : <span>{initials(deal.player)}</span>}
  </div>
);

const TransferRoute: React.FC<{ deal: Deal; labels: Labels; compact?: boolean }> = ({ deal, labels, compact }) => (
  <div className="gpn-route">
    <div className="gpn-route-club gpn-route-source">
      <ClubLogo src={deal.fromLogo} name={deal.fromClub} size={compact ? 26 : 34} />
      <span><small>{labels.fromClub}</small>{deal.fromClub}</span>
    </div>
    <div className="gpn-route-arrow" aria-label="من النادي الحالي إلى النادي المهتم">
      <i />
      <b />
    </div>
    <div className="gpn-route-club gpn-route-destination">
      <ClubLogo src={deal.toLogo} name={deal.toClub} size={compact ? 26 : 34} />
      <span><small>{labels.toClub}</small>{deal.toClub}</span>
    </div>
  </div>
);

const ProbabilityTrack: React.FC<{ deal: Deal; activePct: number; showNew: boolean }> = ({ deal, activePct, showNew }) => {
  const color = colorFor(activePct);
  return (
    <div className="gpn-track">
      <div className="gpn-track-old" style={{ width: `${deal.oldPct}%` }} />
      <div className="gpn-track-live" style={{ width: `${activePct}%`, background: color }} />
      {showNew && <div className="gpn-track-marker" style={{ left: `${deal.oldPct}%` }} />}
    </div>
  );
};

const DealTile: React.FC<{ deal: Deal; showNew: boolean; labels: Labels; featured?: boolean; compact?: boolean }> = ({ deal, showNew, labels, featured, compact }) => {
  const pct = showNew ? deal.newPct : deal.oldPct;
  const delta = deal.newPct - deal.oldPct;
  const color = colorFor(pct);
  return (
    <article data-index={deal.idx} className={`gpn-tile ${featured ? 'is-featured' : ''} ${compact ? 'is-compact' : ''}`} style={{ '--deal-color': color, '--deal-delay': `${deal.idx * 90}ms` } as React.CSSProperties}>
      {featured && <span className="gpn-featured-label">{labels.featured}</span>}
      <div className="gpn-tile-top">
        <Portrait deal={deal} size={compact ? 44 : featured ? 106 : 62} />
        <div className="gpn-tile-name">
          <span>{deal.status || labelFor(pct)}</span>
          <strong>{deal.player}</strong>
          <small>{deal.fee}</small>
        </div>
      </div>
      <TransferRoute deal={deal} labels={labels} compact={compact} />
      <div className="gpn-metrics">
        <div className="gpn-metric previous"><span>{labels.old}</span><b>{deal.oldPct}%</b></div>
        <div className="gpn-metric current"><span>{showNew ? labels.current : labels.ready}</span><AnimatedNumber from={deal.oldPct} to={pct} active={showNew} delay={deal.idx * 100} size={compact ? 27 : featured ? 62 : 38} /></div>
        <div className={`gpn-metric movement ${delta >= 0 ? 'up' : 'down'}`}><span>{labels.movement}</span><b>{showNew ? `${delta >= 0 ? '+' : ''}${delta}%` : '—'}</b></div>
      </div>
      <ProbabilityTrack deal={deal} activePct={pct} showNew={showNew} />
      {!compact && <footer><span>{labels.source}: {deal.source || 'غير محدد'}</span><b>{labelFor(pct)}</b></footer>}
    </article>
  );
};

const DealLane: React.FC<{ deal: Deal; showNew: boolean; labels: Labels }> = ({ deal, showNew, labels }) => {
  const pct = showNew ? deal.newPct : deal.oldPct;
  const delta = deal.newPct - deal.oldPct;
  const color = colorFor(pct);
  return (
    <div className="gpn-lane" style={{ '--deal-color': color, '--deal-delay': `${deal.idx * 90}ms` } as React.CSSProperties}>
      <div className="gpn-lane-player"><Portrait deal={deal} size={44} /><div><strong>{deal.player}</strong><small>{deal.status}</small></div></div>
      <TransferRoute deal={deal} labels={labels} compact />
      <div className="gpn-lane-track">
        <span className="old-pin" style={{ left: `${deal.oldPct}%` }}>{deal.oldPct}</span>
        <span className="lane-fill" style={{ width: `${pct}%` }} />
        <span className="live-pin" style={{ left: `${pct}%` }}>{pct}</span>
      </div>
      <div className={`gpn-lane-delta ${delta >= 0 ? 'up' : 'down'}`}>{showNew ? `${delta >= 0 ? '+' : ''}${delta}%` : '—'}</div>
    </div>
  );
};

const DealSignalRow: React.FC<{ deal: Deal; showNew: boolean; labels: Labels }> = ({ deal, showNew, labels }) => {
  const pct = showNew ? deal.newPct : deal.oldPct;
  const delta = deal.newPct - deal.oldPct;
  const color = colorFor(pct);
  return (
    <article className="gpn-signal-row" style={{ '--deal-color': color, '--deal-delay': `${deal.idx * 90}ms` } as React.CSSProperties}>
      <div className="gpn-signal-player">
        <Portrait deal={deal} size={54} />
        <div><strong>{deal.player}</strong><small>{deal.status || labelFor(pct)}</small></div>
      </div>
      <TransferRoute deal={deal} labels={labels} compact />
      <div className="gpn-signal-prob">
        <span>{labels.old}</span>
        <b className="old">{deal.oldPct}%</b>
        <i />
        <span>{labels.current}</span>
        <AnimatedNumber from={deal.oldPct} to={pct} active={showNew} delay={deal.idx * 95} size={34} />
      </div>
      <div className={`gpn-signal-delta ${delta >= 0 ? 'up' : 'down'}`}>{showNew ? `${delta >= 0 ? '+' : ''}${delta}%` : '—'}</div>
    </article>
  );
};

const MiniDealRow: React.FC<{ deal: Deal; showNew: boolean }> = ({ deal, showNew }) => {
  const pct = showNew ? deal.newPct : deal.oldPct;
  const delta = deal.newPct - deal.oldPct;
  return (
    <div className="gpn-mini-row" style={{ '--deal-color': colorFor(pct), '--deal-delay': `${deal.idx * 90}ms` } as React.CSSProperties}>
      <Portrait deal={deal} size={38} />
      <div><strong>{deal.player}</strong><small>{deal.fromClub} → {deal.toClub}</small></div>
      <b>{pct}%</b>
      <em className={delta >= 0 ? 'up' : 'down'}>{showNew ? `${delta >= 0 ? '+' : ''}${delta}` : '—'}</em>
    </div>
  );
};

const Header: React.FC<{
  title: string;
  subtitle: string;
  eyebrow: string;
  updateDate: string;
  showNew: boolean;
  avgOld: number;
  avgNew: number;
  labels: Labels;
  showAverageSummary: boolean;
}> = ({ title, subtitle, eyebrow, updateDate, showNew, avgOld, avgNew, labels, showAverageSummary }) => (
  <header className="gpn-header">
    <div className="gpn-brand">
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <small>{subtitle}</small>
    </div>
    {showAverageSummary && <div className="gpn-mode">
      <div><span>{labels.old}</span><b>{avgOld}%</b></div>
      <i />
      <div className={showNew ? 'is-live' : ''}><span>{showNew ? labels.current : labels.ready}</span><b>{showNew ? avgNew : avgOld}%</b></div>
      <em>{showNew ? updateDate || labels.current : labels.ready}</em>
    </div>}
  </header>
);

const GlobalProbabilityNetworkRenderer: React.FC<GlobalProbabilityNetworkRendererProps> = ({ getField }) => {
  const showNew = String(getField('probabilityShiftMode') || 'old') === 'new';
  const [transitionStage, setTransitionStage] = useState<'baseline' | 'scan' | 'reveal' | 'settled'>(showNew ? 'scan' : 'baseline');

  useEffect(() => {
    if (!showNew) {
      setTransitionStage('baseline');
      return;
    }
    setTransitionStage('scan');
    const revealTimer = window.setTimeout(() => setTransitionStage('reveal'), 620);
    const settleTimer = window.setTimeout(() => setTransitionStage('settled'), 2350);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(settleTimer);
    };
  }, [showNew]);
  const revealNew = showNew && (transitionStage === 'reveal' || transitionStage === 'settled');
  const layout = String(getField('matrixLayout') || 'global_exchange');
  const title = String(getField('matrixTitle') || 'شبكة تحوّل نسب الصفقات العالمية');
  const subtitle = String(getField('matrixSubtitle') || '');
  const eyebrow = String(getField('matrixEyebrow') || 'GLOBAL MERCATO INTELLIGENCE');
  const updateDate = String(getField('updateDate') || '');
  const labels: Labels = {
    old: String(getField('oldLabel') || 'النسبة السابقة'),
    current: String(getField('newLabel') || 'النسبة الحالية'),
    movement: String(getField('movementLabel') || 'التغيّر'),
    featured: String(getField('featuredLabel') || 'الصفقة الرئيسية'),
    source: String(getField('sourceLabel') || 'المصدر'),
    fromClub: String(getField('fromClubLabel') || 'النادي الحالي'),
    toClub: String(getField('toClubLabel') || 'الوجهة المحتملة'),
    ready: String(getField('readyLabel') || 'جاهز للتحديث'),
    previousAverage: String(getField('previousAverageLabel') || 'متوسط السوق السابق'),
    currentAverage: String(getField('currentAverageLabel') || 'متوسط السوق الحالي'),
    risingFalling: String(getField('risingFallingLabel') || 'صفقات صاعدة / متراجعة'),
  };
  const featuredIndex = Math.max(1, Math.min(6, Number(getField('featuredDealIndex') || 1)));
  const deals: Deal[] = [1, 2, 3, 4, 5, 6].map(idx => ({
    idx,
    player: String(getField(`deal${idx}Player`) || `اسم اللاعب ${idx}`),
    fromClub: String(getField(`deal${idx}From`) || 'النادي الحالي'),
    toClub: String(getField(`deal${idx}To`) || 'النادي المهتم'),
    image: String(getField(`deal${idx}Image`) || ''),
    fromLogo: String(getField(`deal${idx}FromLogo`) || ''),
    toLogo: String(getField(`deal${idx}ToLogo`) || ''),
    oldPct: clamp(getField(`deal${idx}OldPct`)),
    newPct: clamp(getField(`deal${idx}NewPct`)),
    fee: String(getField(`deal${idx}Fee`) || ''),
    status: String(getField(`deal${idx}Status`) || ''),
    source: String(getField(`deal${idx}Source`) || ''),
  })).filter(deal => deal.player.trim());
  const featured = deals.find(deal => deal.idx === featuredIndex) || deals[0];
  const others = deals.filter(deal => deal.idx !== featured?.idx);
  const avgOld = deals.length ? Math.round(deals.reduce((sum, deal) => sum + deal.oldPct, 0) / deals.length) : 0;
  const avgNew = deals.length ? Math.round(deals.reduce((sum, deal) => sum + deal.newPct, 0) / deals.length) : 0;
  const rising = deals.filter(deal => deal.newPct > deal.oldPct).length;
  const falling = deals.filter(deal => deal.newPct < deal.oldPct).length;
  const visibilityClasses = [
    getField('showDealFee') === false ? 'hide-fees' : '',
    getField('showDealStatus') === false ? 'hide-status' : '',
    getField('showDealSource') === false ? 'hide-sources' : '',
    getField('showClubLabels') === false ? 'hide-club-labels' : '',
    getField('showProbabilityTrack') === false ? 'hide-probability-track' : '',
    getField('showDealDelta') === false ? 'hide-deal-delta' : '',
    getField('showAverageSummary') === false ? 'hide-average-summary' : '',
  ].filter(Boolean).join(' ');
  const showAverageSummary = getField('showAverageSummary') !== false;
  const showTransitionBanner = getField('showTransitionBanner') !== false;
  const historyEntries = (() => {
    try {
      const parsed = JSON.parse(String(getField('probabilityHistoryJson') || '[]'));
      return Array.isArray(parsed) ? parsed.slice(-4).reverse() : [];
    } catch {
      return [];
    }
  })();

  const commonHeader = <Header title={title} subtitle={subtitle} eyebrow={eyebrow} updateDate={updateDate} showNew={revealNew} avgOld={avgOld} avgNew={avgNew} labels={labels} showAverageSummary={showAverageSummary} />;

  return (
    <div className={`gpn-root layout-${layout} stage-${transitionStage} ${revealNew ? 'is-updated' : 'is-old'} ${visibilityClasses}`} dir="rtl">
      <style>{`
        .gpn-root{--bg:${COLORS.ink};--panel:${COLORS.panel};--panel2:${COLORS.panel2};--line:${COLORS.line};--text:${COLORS.text};--muted:${COLORS.muted};width:100%;height:100%;padding:18px;background:radial-gradient(circle at 70% -20%,rgba(25,86,130,.22),transparent 42%),linear-gradient(145deg,#03070c,#07111b 58%,#03070c);color:var(--text);font-family:'Tajawal',sans-serif;overflow:hidden;display:flex;flex-direction:column;gap:12px;position:relative}
        .gpn-root:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;background-image:linear-gradient(rgba(73,163,217,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(73,163,217,.035) 1px,transparent 1px);background-size:58px 58px}
        .gpn-root:after{content:"";position:absolute;z-index:8;pointer-events:none;top:0;bottom:0;left:-30px;width:10px;background:rgba(77,255,184,.9);box-shadow:0 0 22px 8px rgba(77,255,184,.28);opacity:0}.gpn-root.stage-reveal:after{animation:gpnSignalSweep 1.45s cubic-bezier(.16,.84,.44,1) both}
        .gpn-root>*{position:relative}.gpn-header{height:82px;flex:none;display:flex;align-items:center;justify-content:space-between;border:1px solid rgba(115,174,217,.16);border-radius:8px;padding:12px 16px;background:rgba(5,13,23,.78);box-shadow:0 12px 32px rgba(0,0,0,.24)}
        .gpn-brand{min-width:0;display:flex;flex-direction:column}.gpn-brand span{font-size:8px;font-weight:900;letter-spacing:.24em;color:${COLORS.cyan}}.gpn-brand strong{font-size:27px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gpn-brand small{font-size:10px;color:var(--muted)}
        .gpn-mode{display:flex;direction:ltr;align-items:center;gap:10px}.gpn-mode div{width:94px;border:1px solid var(--line);border-radius:7px;padding:8px 10px;background:#08111c}.gpn-mode span{display:block;font-size:7px;color:var(--muted);font-weight:800;direction:rtl}.gpn-mode b{font:900 23px/1 ui-monospace,monospace;color:${COLORS.coral}}.gpn-mode .is-live b{color:${COLORS.mint}}.gpn-mode i,.gpn-route-arrow b{width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid currentColor}.gpn-mode i{color:${COLORS.cyan};filter:drop-shadow(0 0 6px currentColor)}.gpn-mode em{font-style:normal;font-size:8px;font-weight:900;padding:7px 10px;border:1px solid rgba(55,232,255,.45);border-radius:7px;color:${COLORS.cyan};direction:rtl}
        .gpn-portrait{position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border:1px solid color-mix(in srgb,var(--deal-color,${COLORS.cyan}) 72%,white 0%);border-radius:50%;background:radial-gradient(circle,#162c40,#07111a 70%);box-shadow:0 0 0 4px color-mix(in srgb,var(--deal-color,${COLORS.cyan}) 10%,transparent),0 0 24px color-mix(in srgb,var(--deal-color,${COLORS.cyan}) 22%,transparent)}.gpn-portrait img{width:100%;height:100%;object-fit:cover}.gpn-portrait span{font-size:18px;font-weight:900;color:var(--deal-color,${COLORS.cyan})}
        .gpn-club-logo{display:grid;place-items:center;overflow:hidden;background:#07111b;border:1px solid rgba(255,255,255,.13);border-radius:7px;font-weight:900;color:var(--text);box-shadow:0 5px 14px rgba(0,0,0,.22)}.gpn-club-logo img{width:100%;height:100%;object-fit:contain;padding:3px}
        .gpn-route{display:grid;grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr);align-items:center;gap:8px;direction:ltr;padding:8px;border:1px solid rgba(124,178,214,.13);border-radius:7px;background:rgba(2,8,14,.44)}.gpn-route-club{min-width:0;display:flex;direction:rtl;align-items:center;justify-content:flex-start;gap:7px;font-size:9px;font-weight:800;text-align:right}.gpn-route-club span{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gpn-route-club small{display:block;font-size:6px;color:var(--muted);font-weight:700;margin-bottom:1px}.gpn-route-destination{direction:ltr;color:var(--deal-color,${COLORS.mint})}.gpn-route-destination span{direction:rtl}.gpn-route-arrow{display:flex;direction:ltr;align-items:center;color:var(--deal-color,${COLORS.cyan});filter:drop-shadow(0 0 7px currentColor)}.gpn-route-arrow i{height:2px;flex:1;background:currentColor}.gpn-route-arrow b{flex:none}
        .gpn-track{height:5px;border-radius:5px;background:rgba(255,255,255,.07);position:relative;overflow:visible}.gpn-track-old,.gpn-track-live{position:absolute;inset-block:0;left:0;border-radius:5px}.gpn-track-old{background:rgba(255,93,120,.42)}.gpn-track-live{transition:width 1.15s cubic-bezier(.16,.84,.44,1);box-shadow:0 0 14px currentColor}.gpn-track-marker{position:absolute;top:-3px;width:1px;height:11px;background:white}
        .gpn-tile{--deal-color:${COLORS.cyan};background:linear-gradient(145deg,rgba(13,28,43,.96),rgba(5,13,22,.98));border:1px solid rgba(119,168,204,.2);border-radius:8px;padding:11px;display:flex;flex-direction:column;gap:8px;overflow:hidden;position:relative;box-shadow:0 12px 30px rgba(0,0,0,.2)}.gpn-tile:before{content:"";position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,transparent,var(--deal-color),transparent);opacity:.85}.gpn-tile:after{content:attr(data-index);position:absolute;left:10px;top:4px;font:900 44px/1 ui-monospace,monospace;color:rgba(255,255,255,.025)}.gpn-tile.is-featured{background:radial-gradient(circle at 75% 12%,color-mix(in srgb,var(--deal-color) 16%,transparent),transparent 42%),linear-gradient(155deg,#0d2030,#050d16 70%);border-color:color-mix(in srgb,var(--deal-color) 48%,transparent);box-shadow:0 18px 48px rgba(0,0,0,.34),0 0 34px color-mix(in srgb,var(--deal-color) 10%,transparent)}.gpn-featured-label{align-self:flex-start;border:1px solid color-mix(in srgb,var(--deal-color) 55%,transparent);border-radius:20px;padding:3px 8px;font-size:7px;font-weight:900;color:var(--deal-color);background:color-mix(in srgb,var(--deal-color) 8%,transparent)}.gpn-tile-top{display:flex;align-items:center;gap:11px;min-height:52px}.gpn-tile-name{min-width:0;flex:1}.gpn-tile-name span{font-size:7px;color:var(--deal-color);font-weight:900}.gpn-tile-name strong{display:block;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gpn-tile-name small{display:block;font-size:8px;color:var(--muted)}.gpn-number{display:block;font:900 38px/.9 ui-monospace,monospace;color:var(--deal-color)}.up{color:${COLORS.mint}}.down{color:${COLORS.coral}}.gpn-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;direction:ltr}.gpn-metric{min-width:0;padding:5px 6px;border-left:1px solid rgba(255,255,255,.09);direction:rtl}.gpn-metric:last-child{border-left:0}.gpn-metric span{display:block;font-size:6px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gpn-metric b{font:900 18px/1.15 ui-monospace,monospace}.gpn-metric.previous b{color:#9ba8b7}.gpn-metric.current .gpn-number{font-size:26px!important}.gpn-metric.movement b{font-size:16px}.gpn-tile footer{display:flex;justify-content:space-between;font-size:7px;color:var(--muted)}.gpn-tile footer b{color:var(--deal-color)}.gpn-tile.is-compact{padding:8px;gap:5px}.gpn-tile.is-compact .gpn-tile-name strong{font-size:12px}.gpn-tile.is-compact .gpn-tile-name small,.gpn-tile.is-compact footer,.gpn-tile.is-compact .gpn-route-club small,.gpn-tile.is-compact .gpn-featured-label{display:none}.gpn-tile.is-compact .gpn-route{padding:4px}.gpn-tile.is-compact .gpn-metric{padding:3px}.gpn-tile.is-compact .gpn-metric b{font-size:12px}.gpn-tile.is-compact .gpn-metric.current .gpn-number{font-size:16px!important}
        .gpn-lane{--deal-color:${COLORS.cyan};height:84px;display:grid;direction:ltr;grid-template-columns:210px 310px 1fr 68px;align-items:center;gap:14px;border:1px solid rgba(119,168,204,.15);border-radius:8px;padding:6px 10px;margin-bottom:7px;background:linear-gradient(90deg,rgba(8,20,32,.96),rgba(4,11,18,.94))}.gpn-lane-player{display:flex;align-items:center;gap:10px}.gpn-lane-player strong{display:block;font-size:13px}.gpn-lane-player small{display:block;font-size:8px;color:var(--muted)}.gpn-lane-track{height:4px;border-radius:4px;background:rgba(255,255,255,.08);position:relative}.gpn-lane-track .lane-fill{position:absolute;left:0;top:0;height:4px;border-radius:4px;background:var(--deal-color);transition:width 1.25s cubic-bezier(.16,.84,.44,1);box-shadow:0 0 12px var(--deal-color)}.gpn-lane-track .old-pin,.gpn-lane-track .live-pin{position:absolute;top:-12px;font:800 7px ui-monospace,monospace;transform:translateX(-50%)}.gpn-lane-track .old-pin{color:${COLORS.coral}}.gpn-lane-track .live-pin{color:var(--deal-color);top:8px}.gpn-lane-delta{font:900 17px ui-monospace,monospace;text-align:left}
        .gpn-exchange{flex:1;display:grid;grid-template-rows:310px 1fr;gap:12px;min-height:0}.gpn-exchange-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;min-height:0;direction:ltr}.gpn-exchange-feature{display:flex;min-height:0}.gpn-exchange-feature .gpn-tile{flex:1;display:grid;grid-template-columns:330px 1fr 300px;grid-template-rows:auto 1fr auto;column-gap:22px;padding:20px 24px;background:radial-gradient(circle at 14% 30%,color-mix(in srgb,var(--deal-color) 20%,transparent),transparent 30%),linear-gradient(105deg,#102438,#06101b 62%)}.gpn-exchange-feature .gpn-featured-label{grid-column:1;grid-row:1}.gpn-exchange-feature .gpn-tile-top{grid-column:1;grid-row:2;align-items:flex-end}.gpn-exchange-feature .gpn-tile-name strong{font-size:31px}.gpn-exchange-feature .gpn-tile-name span{font-size:9px}.gpn-exchange-feature .gpn-route{grid-column:2;grid-row:1/3;align-self:center;padding:18px}.gpn-exchange-feature .gpn-metrics{grid-column:3;grid-row:1/3;align-self:center;padding:18px;border:1px solid color-mix(in srgb,var(--deal-color) 24%,transparent);border-radius:8px;background:rgba(2,8,14,.52)}.gpn-exchange-feature .gpn-track{grid-column:2/4;grid-row:3;height:8px}.gpn-exchange-feature footer{grid-column:1;grid-row:3}.gpn-exchange-feature .gpn-portrait{width:150px!important;height:150px!important;border-radius:8px}
        .gpn-orbit{flex:1;position:relative;min-height:0}.gpn-orbit-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:280px;height:280px;border:1px solid rgba(55,232,255,.42);border-radius:50%;display:grid;place-content:center;text-align:center;background:radial-gradient(circle,rgba(13,44,64,.94),rgba(3,10,17,.98) 68%);box-shadow:0 0 50px rgba(55,232,255,.12);animation:gpnOrbitPulse 2.2s ease-in-out infinite alternate}.gpn-orbit-center span{font-size:9px;color:var(--muted);font-weight:900}.gpn-orbit-center b{font:900 64px/1 ui-monospace,monospace;color:${COLORS.mint}}.gpn-orbit-center small{margin-top:8px;font-size:8px;color:${COLORS.cyan}}.gpn-orbit-node{position:absolute;width:280px;height:176px}.gpn-orbit-node .gpn-tile{height:100%}.gpn-orbit-node.pos-1{top:0;left:0}.gpn-orbit-node.pos-2{top:0;right:0}.gpn-orbit-node.pos-3{top:50%;left:0;transform:translateY(-50%)}.gpn-orbit-node.pos-4{top:50%;right:0;transform:translateY(-50%)}.gpn-orbit-node.pos-5{bottom:0;left:0}.gpn-orbit-node.pos-6{bottom:0;right:0}.gpn-orbit-ring{position:absolute;left:50%;top:50%;width:440px;height:440px;border:1px dashed rgba(77,255,184,.22);border-radius:50%;animation:gpnOrbit 22s linear infinite}
        .gpn-wall{flex:1;display:grid;direction:ltr;grid-template-columns:1fr 54%;gap:10px;min-height:0}.gpn-wall .hero{display:flex;min-height:0}.gpn-wall .hero .gpn-tile{flex:1}.gpn-wall .hero .gpn-tile-top{margin-block:24px}.gpn-wall .hero .gpn-route{margin-bottom:20px}.gpn-wall-stack{display:grid;grid-template-rows:repeat(5,minmax(0,1fr));gap:7px;min-height:0}.gpn-wall-stack .gpn-tile{min-height:0;display:grid;grid-template-columns:150px 1fr 170px;align-items:center;gap:8px;padding:6px 8px}.gpn-wall-stack .gpn-tile-top,.gpn-wall-stack .gpn-route,.gpn-wall-stack .gpn-metrics{min-width:0}.gpn-wall-stack .gpn-track,.gpn-wall-stack footer{display:none}
        .gpn-race{flex:1;min-height:0}.gpn-terminal{flex:1;display:grid;grid-template-columns:250px 1fr;gap:14px;min-height:0}.gpn-terminal-side{border:1px solid rgba(119,168,204,.16);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px;background:#07111b}.gpn-terminal-stat{padding:12px 0;border-bottom:1px solid var(--line)}.gpn-terminal-stat span{font-size:8px;color:var(--muted)}.gpn-terminal-stat b{display:block;font:900 32px ui-monospace,monospace}.gpn-terminal-table{min-height:0}.gpn-terminal-row{height:78px;display:grid;direction:ltr;grid-template-columns:52px 1fr 260px 90px 90px;align-items:center;gap:10px;border:1px solid rgba(119,168,204,.13);border-radius:8px;padding:0 10px;margin-bottom:6px;background:#07111b}.gpn-terminal-row strong{font-size:13px}.gpn-terminal-row small{display:block;font-size:8px;color:var(--muted)}.gpn-terminal-row .previous{color:#9ba8b7;font:900 18px ui-monospace,monospace}.gpn-terminal-row .current{color:var(--deal-color);font:900 28px ui-monospace,monospace}
        .layout-global_exchange .gpn-exchange{grid-template-rows:338px 1fr}.layout-global_exchange .gpn-exchange-grid{grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:11px}.layout-global_exchange .gpn-exchange-grid .gpn-tile{min-height:0}.layout-global_exchange .gpn-exchange-grid .gpn-tile-name strong{font-size:20px}.layout-global_exchange .gpn-exchange-grid .gpn-metric.current .gpn-number{font-size:34px!important}
        .gpn-signal-row{--deal-color:${COLORS.cyan};min-height:88px;display:grid;direction:ltr;grid-template-columns:235px minmax(240px,1fr) 210px 72px;align-items:center;gap:12px;border:1px solid color-mix(in srgb,var(--deal-color) 28%,rgba(255,255,255,.08));border-radius:9px;padding:10px 12px;background:linear-gradient(90deg,color-mix(in srgb,var(--deal-color) 9%,rgba(8,17,28,.94)),rgba(5,12,21,.95));box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)}.gpn-signal-player{display:flex;align-items:center;gap:10px;min-width:0;direction:rtl}.gpn-signal-player strong{display:block;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gpn-signal-player small{display:block;font-size:8px;color:var(--muted)}.gpn-signal-prob{display:grid;direction:ltr;grid-template-columns:auto 44px 18px auto 76px;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.09);border-radius:7px;padding:8px;background:rgba(2,7,12,.48)}.gpn-signal-prob span{font-size:7px;color:var(--muted);font-weight:900;direction:rtl}.gpn-signal-prob .old{font:900 20px ui-monospace,monospace;color:#9aa8b6}.gpn-signal-prob i{height:2px;background:var(--deal-color);box-shadow:0 0 10px var(--deal-color)}.gpn-signal-delta{font:900 22px ui-monospace,monospace;text-align:left}.gpn-mini-row{--deal-color:${COLORS.cyan};display:grid;direction:ltr;grid-template-columns:42px 1fr 58px 42px;align-items:center;gap:9px;min-height:58px;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:7px;background:rgba(7,16,27,.82)}.gpn-mini-row strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gpn-mini-row small{display:block;font-size:7px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gpn-mini-row b{font:900 22px ui-monospace,monospace;color:var(--deal-color)}.gpn-mini-row em{font-style:normal;font:900 12px ui-monospace,monospace}
        .gpn-intel{flex:1;display:grid;grid-template-columns:230px 1fr 240px;gap:12px;min-height:0}.gpn-intel-side,.gpn-intel-hot,.gpn-focus-side,.gpn-focus-notes,.gpn-watch-side{border:1px solid rgba(119,168,204,.16);border-radius:9px;background:rgba(5,13,23,.82);padding:12px;min-height:0}.gpn-intel-side{display:grid;grid-template-rows:repeat(4,1fr);gap:8px}.gpn-stat-card{border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:10px;background:linear-gradient(135deg,rgba(19,48,74,.72),rgba(4,12,21,.82))}.gpn-stat-card span{display:block;font-size:8px;color:var(--muted);font-weight:900}.gpn-stat-card b{display:block;margin-top:4px;font:900 28px ui-monospace,monospace;color:${COLORS.mint}}.gpn-intel-core{min-height:0;display:flex;flex-direction:column;gap:10px}.gpn-intel-title{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;border:1px solid rgba(55,232,255,.17);border-radius:9px;padding:12px;background:rgba(4,13,23,.82)}.gpn-intel-title strong{font-size:25px}.gpn-intel-title b{font:900 44px ui-monospace,monospace;color:${COLORS.cyan}}.gpn-intel-rows{min-height:0;display:grid;grid-template-rows:repeat(5,minmax(0,1fr));gap:8px}.gpn-intel-hot{display:flex;flex-direction:column;gap:8px}.gpn-intel-hot h3,.gpn-focus-notes h3,.gpn-watch-side h3{margin:0 0 4px;font-size:13px}.gpn-history-entry{border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px;background:rgba(255,255,255,.025)}.gpn-history-entry strong{display:block;font-size:11px}.gpn-history-entry small{display:block;font-size:8px;color:var(--muted);margin-top:3px}
        .gpn-focus{flex:1;display:grid;grid-template-columns:330px minmax(0,1fr) 260px;gap:12px;min-height:0}.gpn-focus-side{display:flex;flex-direction:column;gap:7px}.gpn-focus-hero{min-height:0;display:grid;grid-template-rows:minmax(0,1fr) 170px;gap:10px}.gpn-focus-hero .gpn-tile.is-featured{min-height:0}.gpn-focus-chart{border:1px solid rgba(55,232,255,.15);border-radius:9px;background:linear-gradient(180deg,rgba(10,25,39,.82),rgba(4,10,17,.94));padding:12px;position:relative;overflow:hidden}.gpn-focus-chart:before{content:"";position:absolute;inset:16px;background:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:52px 34px}.gpn-focus-line{position:absolute;left:24px;right:24px;bottom:42px;height:3px;background:linear-gradient(90deg,${COLORS.coral},${COLORS.amber},${COLORS.mint});box-shadow:0 0 18px rgba(77,255,184,.22)}.gpn-focus-chart b{position:absolute;right:18px;top:14px;font:900 36px ui-monospace,monospace;color:${COLORS.mint}}.gpn-focus-notes{display:flex;flex-direction:column;gap:8px}.gpn-note{border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:10px;background:rgba(255,255,255,.025)}.gpn-note span{display:block;font-size:8px;color:var(--muted)}.gpn-note b{font:900 25px ui-monospace,monospace;color:${COLORS.mint}}
        .gpn-pulse{flex:1;display:grid;grid-template-rows:92px 315px 1fr;gap:11px;min-height:0}.gpn-pulse-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.gpn-pulse-hero{min-height:0}.gpn-pulse-hero .gpn-tile{height:100%;display:grid;grid-template-columns:360px 1fr 300px;grid-template-rows:1fr auto;align-items:center;gap:18px;padding:18px 24px;background:radial-gradient(circle at 20% 40%,color-mix(in srgb,var(--deal-color) 24%,transparent),transparent 35%),linear-gradient(100deg,#102333,#05101a 72%)}.gpn-pulse-hero .gpn-tile-top{grid-column:1}.gpn-pulse-hero .gpn-route{grid-column:2}.gpn-pulse-hero .gpn-metrics{grid-column:3}.gpn-pulse-hero .gpn-track{grid-column:1/4;grid-row:2;height:8px}.gpn-pulse-hero footer,.gpn-pulse-hero .gpn-featured-label{display:none}.gpn-pulse-hero .gpn-portrait{width:160px!important;height:160px!important;border-radius:10px}.gpn-pulse-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;min-height:0}
        .gpn-route-grid{flex:1;position:relative;min-height:0}.gpn-route-hub{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);width:390px;height:390px;border-radius:50%;border:1px solid rgba(55,232,255,.26);background:radial-gradient(circle,rgba(16,53,72,.92),rgba(3,10,17,.95) 66%);box-shadow:0 0 70px rgba(55,232,255,.14);display:grid;place-items:center;text-align:center}.gpn-route-hub:before{content:"";position:absolute;inset:42px;border:1px dashed rgba(77,255,184,.26);border-radius:50%;animation:gpnOrbit 26s linear infinite}.gpn-route-hub strong{font-size:22px}.gpn-route-hub b{display:block;font:900 64px ui-monospace,monospace;color:${COLORS.mint}}.gpn-route-card{position:absolute;width:322px;height:190px}.gpn-route-card .gpn-tile{height:100%}.gpn-route-card.pos-1{left:0;top:0}.gpn-route-card.pos-2{right:0;top:0}.gpn-route-card.pos-3{left:0;top:50%;transform:translateY(-50%)}.gpn-route-card.pos-4{right:0;top:50%;transform:translateY(-50%)}.gpn-route-card.pos-5{left:18%;bottom:0}.gpn-route-card.pos-6{right:18%;bottom:0}
        .gpn-watch{flex:1;display:grid;grid-template-columns:1fr 460px;gap:12px;min-height:0}.gpn-watch-list{min-height:0;display:grid;grid-template-rows:repeat(6,minmax(0,1fr));gap:7px}.gpn-watch-main{min-height:0;display:grid;grid-template-rows:1fr 190px;gap:10px}.gpn-watch-main .gpn-tile{min-height:0}.gpn-watch-side{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gpn-watch-side h3{grid-column:1/3}.gpn-watch-side .gpn-history-entry{min-height:0}
        .is-updated .gpn-tile,.is-updated .gpn-signal-row,.is-updated .gpn-mini-row{animation:gpnTileIn .72s cubic-bezier(.16,.84,.44,1) both;animation-delay:var(--deal-delay,0ms)}.is-updated .gpn-number{animation:gpnNumber .72s cubic-bezier(.16,.84,.44,1) both}.is-updated .gpn-route-arrow i{animation:gpnRoute 1s cubic-bezier(.16,.84,.44,1) both}
        .gpn-shift-event{position:absolute;z-index:12;inset:0;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at center,rgba(4,26,42,.86),rgba(2,7,12,.7) 58%,transparent 84%);opacity:0}.stage-scan .gpn-shift-event,.stage-reveal .gpn-shift-event{animation:gpnEventWindow 2.35s both}.gpn-shift-core{width:min(920px,82%);padding:22px;border:1px solid rgba(55,232,255,.38);border-radius:10px;background:linear-gradient(145deg,rgba(5,17,28,.98),rgba(3,9,16,.96));box-shadow:0 30px 100px rgba(0,0,0,.65),0 0 70px rgba(55,232,255,.15);text-align:center;overflow:hidden;position:relative}.gpn-shift-core:before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 22%,rgba(55,232,255,.15) 48%,transparent 74%);transform:translateX(-120%)}.stage-scan .gpn-shift-core:before{animation:gpnCoreScan .75s ease-in-out both}.gpn-shift-core small{display:block;color:${COLORS.cyan};font-size:9px;font-weight:900;letter-spacing:.18em}.gpn-shift-core strong{display:block;margin-top:5px;font-size:31px}.gpn-shift-numbers{direction:ltr;display:grid;grid-template-columns:1fr 90px 1fr;align-items:center;margin-top:16px}.gpn-shift-numbers b{font:900 78px/.9 ui-monospace,monospace}.gpn-shift-numbers .before{color:${COLORS.coral}}.gpn-shift-numbers .after{color:${COLORS.mint};filter:drop-shadow(0 0 18px rgba(77,255,184,.35));opacity:.15;transform:scale(.82)}.stage-reveal .gpn-shift-numbers .after{animation:gpnRevealValue .8s cubic-bezier(.16,.84,.44,1) .08s both}.gpn-shift-arrow{height:3px;background:${COLORS.cyan};position:relative;box-shadow:0 0 14px ${COLORS.cyan};transform:scaleX(.25);transform-origin:left}.stage-reveal .gpn-shift-arrow{animation:gpnRoute .7s cubic-bezier(.16,.84,.44,1) both}.gpn-shift-arrow:after{content:"";position:absolute;right:-2px;top:-5px;width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:9px solid ${COLORS.cyan}}.gpn-shift-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:18px}.gpn-shift-chip{display:grid;direction:ltr;grid-template-columns:1fr 52px 1fr;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.11);border-radius:8px;padding:7px 9px;background:rgba(255,255,255,.035);text-align:right}.gpn-shift-chip span{min-width:0;direction:rtl;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:900}.gpn-shift-chip em{font-style:normal;font:900 15px ui-monospace,monospace;color:${COLORS.coral}}.gpn-shift-chip b{font:900 18px ui-monospace,monospace;color:${COLORS.mint};opacity:.2}.stage-reveal .gpn-shift-chip b{animation:gpnRevealValue .55s cubic-bezier(.16,.84,.44,1) both;animation-delay:var(--deal-delay,0ms)}
        .hide-fees .gpn-tile-name small{display:none}.hide-status .gpn-tile-name>span{display:none}.hide-sources .gpn-tile footer span{visibility:hidden}.hide-club-labels .gpn-route-club small{display:none}.hide-probability-track .gpn-track,.hide-probability-track .gpn-lane-track{display:none}.hide-deal-delta .gpn-metric.movement,.hide-deal-delta .gpn-lane-delta,.hide-deal-delta .gpn-signal-delta{display:none}.hide-average-summary .gpn-terminal-side{display:none}.hide-average-summary .gpn-terminal{grid-template-columns:1fr}.hide-average-summary .gpn-intel-side,.hide-average-summary .gpn-pulse-stats{display:none}.hide-average-summary .gpn-intel{grid-template-columns:1fr 240px}.hide-average-summary .gpn-pulse{grid-template-rows:315px 1fr}
        @keyframes gpnTileIn{0%{opacity:.3;transform:translateY(12px)}100%{opacity:1;transform:none}}@keyframes gpnNumber{0%{filter:blur(5px);transform:translateY(-7px) scale(.82)}65%{filter:none;transform:translateY(1px) scale(1.06)}100%{transform:none}}@keyframes gpnRoute{0%{transform:scaleX(0);transform-origin:left;opacity:.2}100%{transform:scaleX(1);transform-origin:left;opacity:1}}@keyframes gpnSignalSweep{0%{transform:translateX(0);opacity:0}12%{opacity:1}85%{opacity:.8}100%{transform:translateX(1320px);opacity:0}}@keyframes gpnOrbit{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}@keyframes gpnOrbitPulse{to{box-shadow:0 0 60px rgba(55,232,255,.2)}}@keyframes gpnEventWindow{0%{opacity:0}9%,74%{opacity:1}100%{opacity:0}}@keyframes gpnCoreScan{to{transform:translateX(120%)}}@keyframes gpnRevealValue{0%{opacity:.15;transform:scale(.82);filter:blur(10px)}70%{opacity:1;transform:scale(1.09);filter:none}100%{opacity:1;transform:scale(1);filter:drop-shadow(0 0 18px rgba(77,255,184,.35))}}
      `}</style>
      {showTransitionBanner && featured && showNew && transitionStage !== 'settled' && (
        <div className="gpn-shift-event">
          <div className="gpn-shift-core">
            <small>{updateDate || labels.current}</small>
            <strong>{featured.player}</strong>
            <div className="gpn-shift-numbers">
              <b className="before">{featured.oldPct}%</b>
              <i className="gpn-shift-arrow" />
              <b className="after">{featured.newPct}%</b>
            </div>
            <div className="gpn-shift-strip">
              {deals.slice(0, 6).map(deal => (
                <div key={deal.idx} className="gpn-shift-chip" style={{ '--deal-delay': `${deal.idx * 85}ms` } as React.CSSProperties}>
                  <span>{deal.player}</span>
                  <em>{deal.oldPct}%</em>
                  <b>{deal.newPct}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {commonHeader}
      {layout === 'orbit_network' ? (
        <main className="gpn-orbit">
          <div className="gpn-orbit-ring" />
          <div className="gpn-orbit-center">
            <span>{labels.currentAverage}</span>
            <b>{revealNew ? avgNew : avgOld}%</b>
            <small>{rising} صاعدة · {falling} متراجعة</small>
          </div>
          {deals.map((deal, index) => <div key={deal.idx} className={`gpn-orbit-node pos-${index + 1}`}><DealTile deal={deal} showNew={revealNew} labels={labels} compact /></div>)}
        </main>
      ) : layout === 'broadcast_wall' && featured ? (
        <main className="gpn-wall">
          <div className="hero"><DealTile deal={featured} showNew={revealNew} labels={labels} featured /></div>
          <div className="gpn-wall-stack">{others.slice(0, 5).map(deal => <DealTile key={deal.idx} deal={deal} showNew={revealNew} labels={labels} compact />)}</div>
        </main>
      ) : layout === 'route_race' ? (
        <main className="gpn-race">{deals.map(deal => <DealLane key={deal.idx} deal={deal} showNew={revealNew} labels={labels} />)}</main>
      ) : layout === 'deal_ticker_lab' ? (
        <main className="gpn-terminal">
          <aside className="gpn-terminal-side">
            <div className="gpn-terminal-stat"><span>{labels.previousAverage}</span><b style={{ color: COLORS.coral }}>{avgOld}%</b></div>
            <div className="gpn-terminal-stat"><span>{labels.currentAverage}</span><b style={{ color: COLORS.mint }}>{avgNew}%</b></div>
            <div className="gpn-terminal-stat"><span>{labels.risingFalling}</span><b>{rising} / {falling}</b></div>
          </aside>
          <section className="gpn-terminal-table">{deals.map(deal => {
            const pct = revealNew ? deal.newPct : deal.oldPct;
            return <div key={deal.idx} className="gpn-terminal-row" style={{ '--deal-color': colorFor(pct) } as React.CSSProperties}>
              <Portrait deal={deal} size={42} /><div><strong>{deal.player}</strong><small>{deal.fromClub} إلى {deal.toClub}</small></div>
              <TransferRoute deal={deal} labels={labels} compact /><span className="previous">{deal.oldPct}%</span><span className="current"><AnimatedNumber from={deal.oldPct} to={pct} active={revealNew} delay={deal.idx * 90} size={28} /></span>
            </div>;
          })}</section>
        </main>
      ) : layout === 'intelligence_center' ? (
        <main className="gpn-intel">
          <aside className="gpn-intel-side">
            <div className="gpn-stat-card"><span>{labels.previousAverage}</span><b style={{ color: COLORS.coral }}>{avgOld}%</b></div>
            <div className="gpn-stat-card"><span>{labels.currentAverage}</span><b>{avgNew}%</b></div>
            <div className="gpn-stat-card"><span>{labels.risingFalling}</span><b>{rising}/{falling}</b></div>
            <div className="gpn-stat-card"><span>{labels.featured}</span><b style={{ color: colorFor(featured?.newPct || avgNew) }}>{featured?.newPct || avgNew}%</b></div>
          </aside>
          <section className="gpn-intel-core">
            <div className="gpn-intel-title">
              <strong>{title}</strong>
              <b>{revealNew ? avgNew : avgOld}%</b>
            </div>
            <div className="gpn-intel-rows">{deals.slice(0, 5).map(deal => <DealSignalRow key={deal.idx} deal={deal} showNew={revealNew} labels={labels} />)}</div>
          </section>
          <aside className="gpn-intel-hot">
            <h3>الصفقات الساخنة</h3>
            {[...deals].sort((a, b) => b.newPct - a.newPct).slice(0, 5).map(deal => <MiniDealRow key={deal.idx} deal={deal} showNew={revealNew} />)}
          </aside>
        </main>
      ) : layout === 'player_focus_lab' && featured ? (
        <main className="gpn-focus">
          <aside className="gpn-focus-side">{deals.map(deal => <MiniDealRow key={deal.idx} deal={deal} showNew={revealNew} />)}</aside>
          <section className="gpn-focus-hero">
            <DealTile deal={featured} showNew={revealNew} labels={labels} featured />
            <div className="gpn-focus-chart">
              <b>{revealNew ? featured.newPct : featured.oldPct}%</b>
              <span className="gpn-focus-line" />
            </div>
          </section>
          <aside className="gpn-focus-notes">
            <h3>سجل التحديثات</h3>
            {historyEntries.length ? historyEntries.map((entry, index) => {
              const record = entry as { id?: string; dateLabel?: string; deals?: unknown[] };
              return <div key={record.id || index} className="gpn-history-entry"><strong>{record.dateLabel || updateDate || labels.current}</strong><small>{record.deals?.length || 0} صفقات محفوظة</small></div>;
            }) : <div className="gpn-history-entry"><strong>لا يوجد سجل بعد</strong><small>سيتم حفظ أول لقطة عند تطبيق JSON أو تشغيل النسب الجديدة.</small></div>}
            <div className="gpn-note"><span>{labels.movement}</span><b className={featured.newPct >= featured.oldPct ? 'up' : 'down'}>{featured.newPct - featured.oldPct >= 0 ? '+' : ''}{featured.newPct - featured.oldPct}%</b></div>
          </aside>
        </main>
      ) : layout === 'market_pulse_board' && featured ? (
        <main className="gpn-pulse">
          <section className="gpn-pulse-stats">
            <div className="gpn-stat-card"><span>{labels.previousAverage}</span><b style={{ color: COLORS.coral }}>{avgOld}%</b></div>
            <div className="gpn-stat-card"><span>{labels.currentAverage}</span><b>{avgNew}%</b></div>
            <div className="gpn-stat-card"><span>إجمالي الصفقات</span><b>{deals.length}</b></div>
            <div className="gpn-stat-card"><span>{labels.risingFalling}</span><b>{rising}/{falling}</b></div>
          </section>
          <section className="gpn-pulse-hero"><DealTile deal={featured} showNew={revealNew} labels={labels} featured /></section>
          <section className="gpn-pulse-grid">{others.slice(0, 5).map(deal => <DealTile key={deal.idx} deal={deal} showNew={revealNew} labels={labels} compact />)}</section>
        </main>
      ) : layout === 'global_route_grid' ? (
        <main className="gpn-route-grid">
          <div className="gpn-route-hub"><div><strong>{eyebrow}</strong><b>{revealNew ? avgNew : avgOld}%</b><small>{rising} صاعدة / {falling} متراجعة</small></div></div>
          {deals.slice(0, 6).map((deal, index) => <div key={deal.idx} className={`gpn-route-card pos-${index + 1}`}><DealTile deal={deal} showNew={revealNew} labels={labels} compact /></div>)}
        </main>
      ) : layout === 'executive_watch_room' && featured ? (
        <main className="gpn-watch">
          <section className="gpn-watch-list">{deals.map(deal => <DealSignalRow key={deal.idx} deal={deal} showNew={revealNew} labels={labels} />)}</section>
          <section className="gpn-watch-main">
            <DealTile deal={featured} showNew={revealNew} labels={labels} featured />
            <aside className="gpn-watch-side">
              <h3>سجل ذكي</h3>
              {historyEntries.length ? historyEntries.slice(0, 3).map((entry, index) => {
                const record = entry as { id?: string; dateLabel?: string; deals?: unknown[] };
                return <div key={record.id || index} className="gpn-history-entry"><strong>{record.dateLabel || labels.current}</strong><small>{record.deals?.length || 0} صفقات</small></div>;
              }) : <div className="gpn-history-entry"><strong>لا يوجد سجل بعد</strong><small>سيظهر بعد أول تحديث محفوظ.</small></div>}
            </aside>
          </section>
        </main>
      ) : featured ? (
        <main className="gpn-exchange">
          <div className="gpn-exchange-feature"><DealTile deal={featured} showNew={revealNew} labels={labels} featured /></div>
          <div className="gpn-exchange-grid">{others.slice(0, 5).map(deal => <DealTile key={deal.idx} deal={deal} showNew={revealNew} labels={labels} />)}</div>
        </main>
      ) : null}
    </div>
  );
};

export default GlobalProbabilityNetworkRenderer;
