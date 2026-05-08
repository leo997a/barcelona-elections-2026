import React from 'react';
import { RendererProps } from './SharedComponents';

const fallbackAvatar = (name: string, bg = '050712') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'PLAYER')}&background=${bg}&color=ffffff&size=512&bold=true`;

const ProjectionShell: React.FC<{
  children: React.ReactNode;
  activeTheme: RendererProps['activeTheme'];
  watermark?: string;
}> = ({ children, activeTheme, watermark = 'PROJECTION LIVE' }) => (
  <div className="absolute inset-0 overflow-hidden bg-black text-white">
    <div className="absolute inset-0 opacity-35" style={{
      backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
      backgroundSize: '180px 112px',
    }} />
    <div className="absolute inset-x-0 top-0 h-12 overflow-hidden border-b border-white/10">
      <div className="flex h-full animate-[projectionTicker_22s_linear_infinite] items-center whitespace-nowrap text-4xl font-black uppercase italic tracking-tight">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} className="mx-8 flex items-center gap-8">
            <span style={{ color: activeTheme.text }}>{watermark}</span>
            <span className="h-12 w-48 -skew-x-12" style={{ background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.accent})` }} />
          </span>
        ))}
      </div>
    </div>
    <div className="absolute inset-x-0 bottom-0 h-12 overflow-hidden border-t border-white/10">
      <div className="flex h-full animate-[projectionTickerReverse_24s_linear_infinite] items-center whitespace-nowrap text-4xl font-black uppercase italic tracking-tight">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} className="mx-8 flex items-center gap-8">
            <span style={{ color: activeTheme.text }}>{watermark}</span>
            <span className="h-12 w-48 -skew-x-12" style={{ background: `linear-gradient(135deg, ${activeTheme.accent}, ${activeTheme.primary})` }} />
          </span>
        ))}
      </div>
    </div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,87,255,.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(200,170,99,.18),transparent_34%)]" />
    <div className="absolute inset-0">{children}</div>
  </div>
);

const ProjectionStyle = () => (
  <style>{`
    @keyframes projectionTicker { from { transform: translateX(0); } to { transform: translateX(50%); } }
    @keyframes projectionTickerReverse { from { transform: translateX(50%); } to { transform: translateX(0); } }
    @keyframes projectionSweep { 0% { transform: translateX(-120%) skewX(-14deg); opacity: .15; } 45% { opacity: .85; } 100% { transform: translateX(120%) skewX(-14deg); opacity: .1; } }
    @keyframes projectionRing { to { transform: rotate(360deg); } }
    @keyframes projectionRise { from { opacity: 0; transform: translateY(42px) scale(.98); filter: blur(14px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @keyframes projectionLine { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  `}</style>
);

export const FootballPackageRenderer: React.FC<RendererProps> = ({
  getField,
  containerStyle,
  contentWrapperStyle,
  activeTheme,
  animClass,
}) => {
  const designStyle = String(getField('designStyle') || 'TITLE_STING');
  const watermark = String(getField('watermarkText') || getField('competition') || 'PROJECTION LIVE');
  const title = String(getField('title') || 'TEMPS');
  const subtitle = String(getField('subtitle') || 'ADDITIONNEL');
  const teamName = String(getField('teamName') || 'FRANCE');
  const competition = String(getField('competition') || 'COMPOSITION');
  const teamLogo = String(getField('teamLogo') || '');

  const player = (index: number) => {
    const name = String(getField(`player${index}Name`) || `PLAYER ${index}`);
    return {
      name,
      number: String(getField(`player${index}Number`) || index),
      image: String(getField(`player${index}Image`) || fallbackAvatar(name, '070914')),
    };
  };

  const players = Array.from({ length: Math.min(Number(getField('playersCount') || 5), 8) }, (_, index) => player(index + 1));
  const pitchNumbers = String(getField('pitchNumbers') || '11,7,5,12,8,18,23,3,4,2,1')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const shell = (children: React.ReactNode, fullFrame = true) => (
    <div style={containerStyle}>
      <ProjectionStyle />
      <div style={contentWrapperStyle} className={`subpixel-antialiased ${animClass || ''}`}>
        {fullFrame ? (
          <ProjectionShell activeTheme={activeTheme} watermark={watermark}>
            {children}
          </ProjectionShell>
        ) : children}
      </div>
    </div>
  );

  if (designStyle === 'COMPOSITION_INTRO') {
    return shell(
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[58%] w-[62%] overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,.75)]" style={{
          background: `linear-gradient(135deg, ${activeTheme.secondary}, ${activeTheme.primary}55 45%, ${activeTheme.secondary})`,
          animation: 'projectionRise .8s cubic-bezier(.22,1,.36,1) both',
        }}>
          <div className="absolute inset-0 opacity-80" style={{
            backgroundImage: `repeating-linear-gradient(140deg, transparent 0 70px, ${activeTheme.accent}66 72px 118px, transparent 120px 190px)`,
          }} />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute left-0 top-1/2 h-24 w-full -translate-y-1/2 bg-white/8" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5">
            <div className="flex gap-5 text-4xl" style={{ color: activeTheme.accent }}>★ ★</div>
            <div className="flex h-48 w-48 items-center justify-center border border-white/20 bg-black/35 p-6 shadow-[0_0_50px_rgba(255,255,255,.18)]" style={{ clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' }}>
              {teamLogo ? <img src={teamLogo} className="h-full w-full object-contain" alt="" /> : <span className="text-6xl font-black">{teamName.slice(0, 2)}</span>}
            </div>
            <div className="text-6xl font-black uppercase tracking-tight">{teamName}</div>
            <div className="text-lg font-black uppercase tracking-[.45em]" style={{ color: activeTheme.accent }}>{competition}</div>
          </div>
          <div className="absolute inset-y-0 -left-1/3 w-1/2 bg-white/25 blur-xl" style={{ animation: 'projectionSweep 2.8s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  if (designStyle === 'LINEUP_BOARD') {
    return shell(
      <div className="absolute inset-0 flex items-center justify-center px-28">
        <div className="grid h-[72%] w-full max-w-[1560px] grid-cols-[1fr_490px] overflow-hidden border border-white/30 bg-black shadow-[0_40px_120px_rgba(0,0,0,.86)]" style={{ animation: 'projectionRise .72s cubic-bezier(.22,1,.36,1) both' }}>
          <div className="relative border-l border-white/20">
            <div className="flex h-24 items-end justify-between border-b border-white/30 bg-[#e8eef4] pl-8 pr-24 text-black">
              <div className="pb-3 text-6xl font-black uppercase tracking-tight">{teamName}</div>
              <div className="mb-0 h-24 min-w-64 bg-[#ff4b3e] px-10 pt-3 text-center text-4xl font-black uppercase text-white">{competition}</div>
            </div>
            <div className="grid h-[calc(100%-6rem)]" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
              {players.map((item, index) => (
                <div key={index} className="relative overflow-hidden border-l border-white/30 bg-black">
                  <div className="absolute right-4 top-6 z-0 text-[160px] font-black leading-none text-white/85">{item.number}</div>
                  <img src={item.image} className="absolute bottom-24 left-1/2 z-10 h-[72%] max-w-none -translate-x-1/2 object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,.8)]" alt="" />
                  <div className="absolute inset-x-0 bottom-0 z-20 flex h-24 items-center justify-center bg-[#070914] text-4xl font-black uppercase tracking-tight text-white">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative bg-black">
            <div className="absolute inset-x-0 top-0 h-24 bg-[#ff4b3e] text-center text-6xl font-black tracking-[.25em] text-white">
              {String(getField('formation') || '4 3 3')}
            </div>
            <div className="absolute inset-x-0 top-24 bottom-0">
              <div className="absolute inset-12 rounded-[40%] border border-white/25" />
              <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              <div className="absolute inset-x-0 top-[64%] h-24 bg-red-900/55" />
              {pitchNumbers.map((num, index) => {
                const positions = [
                  [34, 18], [66, 18], [50, 34], [33, 48], [66, 48], [50, 60],
                  [22, 75], [40, 75], [60, 75], [78, 75], [50, 90],
                ];
                const [left, top] = positions[index] || [50, 50];
                return (
                  <div key={`${num}-${index}`} className="absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#e8eef4] text-4xl font-black text-[#050712] shadow-[0_0_0_1px_rgba(255,255,255,.45)]" style={{ left: `${left}%`, top: `${top}%` }}>{num}</div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (designStyle === 'COMPACT_SCOREBUG') {
    const homeLogo = String(getField('homeLogo') || teamLogo);
    const awayLogo = String(getField('awayLogo') || '');
    return shell(
      <div className="absolute left-28 top-36">
        <div className="relative grid grid-cols-[260px_140px] overflow-visible bg-[#e8eef4] text-black shadow-[0_24px_70px_rgba(0,0,0,.72)]" style={{ animation: 'projectionRise .55s cubic-bezier(.22,1,.36,1) both' }}>
          <div className="absolute -top-24 left-24 text-8xl font-black italic text-white">{String(getField('brandMark') || 'V')}</div>
          <div className="flex items-center justify-center border-l border-black/30 px-5 text-6xl font-black">{String(getField('time') || '55:34')}</div>
          <div className="grid grid-rows-2">
            {[
              { logo: homeLogo, score: String(getField('homeScore') ?? 0), color: activeTheme.primary },
              { logo: awayLogo, score: String(getField('awayScore') ?? 1), color: '#a50044' },
            ].map((row, index) => (
              <div key={index} className="grid grid-cols-[72px_20px_64px] border-b border-black/35">
                <div className="flex items-center justify-center" style={{ backgroundColor: row.color }}>
                  {row.logo ? <img src={row.logo} className="h-12 w-12 object-contain" alt="" /> : <span className="font-black text-white">{index + 1}</span>}
                </div>
                <div style={{ backgroundColor: row.color }} />
                <div className="flex items-center justify-center text-6xl font-black">{row.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      false
    );
  }

  if (designStyle === 'TUNNEL_REVEAL') {
    return shell(
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[58%] w-[62%] overflow-hidden bg-[#020711] shadow-[0_40px_110px_rgba(0,0,0,.85)]" style={{ animation: 'projectionRise .8s cubic-bezier(.22,1,.36,1) both' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.22),transparent_18%),linear-gradient(135deg,rgba(0,87,255,.75),transparent_35%),linear-gradient(225deg,rgba(0,87,255,.65),transparent_35%)]" />
          <div className="absolute left-1/2 top-0 h-full w-1/2 -translate-x-1/2 bg-blue-950/60" style={{ clipPath: 'polygon(50% 0,100% 100%,0 100%)' }} />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="absolute bottom-0 h-[62%] w-28 bg-black/55 blur-[1px]" style={{
              left: `${12 + index * 15}%`,
              clipPath: 'polygon(38% 0,62% 0,72% 100%,28% 100%)',
            }} />
          ))}
          <div className="absolute inset-x-0 top-8 text-center text-7xl font-black uppercase italic tracking-tight">{title}</div>
          <div className="absolute inset-x-0 bottom-12 text-center text-3xl font-black uppercase tracking-[.38em]" style={{ color: activeTheme.accent }}>{subtitle}</div>
        </div>
      </div>
    );
  }

  return shell(
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative flex h-[58%] w-[68%] items-center justify-center overflow-hidden" style={{
        background: `linear-gradient(135deg, ${activeTheme.primary}55, ${activeTheme.secondary} 48%, ${activeTheme.primary}66)`,
        animation: 'projectionRise .7s cubic-bezier(.22,1,.36,1) both',
      }}>
        <div className="absolute inset-0 opacity-70" style={{
          backgroundImage: `repeating-linear-gradient(145deg, transparent 0 82px, ${activeTheme.accent}88 84px 122px, transparent 124px 220px)`,
        }} />
        <div className="absolute h-80 w-80 rounded-full border-2 border-dotted border-white/70" style={{ animation: 'projectionRing 18s linear infinite' }} />
        <div className="relative z-10 text-center uppercase">
          <div className="text-[130px] font-black leading-[.78] tracking-tight text-white drop-shadow-[0_12px_22px_rgba(0,0,0,.5)]">{title}</div>
          <div className="text-[118px] font-black leading-[.84] tracking-tight" style={{ color: activeTheme.accent }}>{subtitle}</div>
          <div className="mt-8 text-xl font-black tracking-[.45em] text-white/80">{competition}</div>
        </div>
        <div className="absolute inset-y-0 -left-1/3 w-1/2 bg-white/25 blur-xl" style={{ animation: 'projectionSweep 2.4s ease-in-out infinite' }} />
      </div>
    </div>
  );
};
