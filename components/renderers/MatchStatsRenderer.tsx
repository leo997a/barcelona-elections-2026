import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RendererProps } from './SharedComponents';

// ─── Match Stats Renderer (Smart Studio - Live Edition) ────────────────────────
// Design Language:
//   - Dark Glassmorphism (bg-black/40 with backdrop-blur)
//   - Neon glow accents based on team colors
//   - Barlow Condensed typography
// ─────────────────────────────────────────────────────────────────────────────

export const MatchStatsRenderer: React.FC<RendererProps> = ({
  getField, containerStyle, contentWrapperStyle, playSound, wasVisible,
}) => {
  const apiUrl = String(getField('apiUrl') || 'http://localhost:3005/api/match');
  const homeColor = String(getField('homeColor') || '#3b82f6');
  const awayColor = String(getField('awayColor') || '#ef4444');
  const showDominance = Boolean(getField('showDominance') ?? true);
  const showMotm = Boolean(getField('showMotm') ?? true);
  const showTopStats = Boolean(getField('showTopStats') ?? true);

  const [rawJson, setRawJson] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string>('');

  const didPlay = useRef(false);
  useEffect(() => {
    if (!wasVisible && !didPlay.current) { didPlay.current = true; playSound('ENTRY').catch(() => { }); }
  }, [wasVisible, playSound]);

  // ── Live Polling ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          setRawJson(data);
          setErrorStatus('');
        } else {
          setErrorStatus('لم يتم العثور على بيانات في الجسر.');
        }
      } catch (err) {
        setErrorStatus('تعذر الاتصال بـ Live Bridge. تأكد من تشغيل تطبيق الإحصائيات المحلي.');
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [apiUrl]);

  // ── Smart Data Processing ──
  const parsedData = useMemo(() => {
    if (!rawJson || !rawJson.events || !rawJson.home) return null;

    const raw = rawJson;
    const home = raw.home || {};
    const away = raw.away || {};
    const hId = home.teamId || raw.homeTeamId;
    const aId = away.teamId || raw.awayTeamId;
    const score = String(raw.score || '0-0').split('-');
    
    const playerDict: Record<string, string> = {};
    Object.entries(raw.playerIdNameDictionary || {}).forEach(([k,v]) => { playerDict[String(k)] = String(v); });

    const teamStats: Record<string, any> = {};
    const playerStats: Record<string, any> = {};

    (raw.events || []).forEach((evt: any) => {
      const tid = evt.teamId;
      const pid = evt.playerId ? String(evt.playerId) : null;
      const etype = (evt.type && evt.type.displayName) ? evt.type.displayName : String(evt.type || '');
      const outcome = (evt.outcomeType && evt.outcomeType.displayName) ? evt.outcomeType.displayName : String(evt.outcomeType || '');
      const ok = ['Successful','Success','SuccessInPlay','SuccessOut'].includes(outcome);
      if (!tid) return;

      if (!teamStats[tid]) teamStats[tid] = {shots:0,shotsOnTarget:0,goals:0,passes:0,keyPasses:0,tackles:0,interceptions:0,dribbles:0};
      if (pid && !playerStats[pid]) playerStats[pid] = {id:pid, name:playerDict[pid]||('P'+pid), teamId:tid, shots:0, passes:0, keyPasses:0, tackles:0, interceptions:0, dribbles:0, rating:0, isHome: tid===hId};

      const ts = teamStats[tid];
      const ps = pid ? playerStats[pid] : null;

      if (etype==='Pass') { ts.passes++; if(ps)ps.passes++; }
      else if (['SavedShot','MissedShots','BlockedShot','ShotOnPost','Goal'].includes(etype)) { ts.shots++; if(ps)ps.shots++; if(etype==='SavedShot'||etype==='Goal'){ts.shotsOnTarget++;} }
      else if (etype==='Tackle') { ts.tackles++; if(ps)ps.tackles++; }
      else if (etype==='Interception') { ts.interceptions++; if(ps)ps.interceptions++; }
      else if (etype==='KeyPass') { ts.keyPasses++; if(ps)ps.keyPasses++; }
      else if (['TakeOn','Dribble'].includes(etype) && ok) { ts.dribbles++; if(ps)ps.dribbles++; }
    });

    ['home','away'].forEach((side: 'home'|'away') => {
      (((raw[side]||{}).players)||[]).forEach((p: any) => {
        const pid = String(p.playerId||'');
        if (!pid) return;
        const ratings = ((p.stats||{}).ratings)||{};
        const rvals = Object.values(ratings).filter(v=>v!=null) as number[];
        if (rvals.length && playerStats[pid]) playerStats[pid].rating = Math.round(rvals[rvals.length-1]*100)/100;
      });
    });

    const playersArr = Object.values(playerStats);

    return {
      match: {
        homeTeam: home.name || raw.homeTeamName || 'Home',
        awayTeam: away.name || raw.awayTeamName || 'Away',
        homeScore: parseInt(score[0])||0,
        awayScore: parseInt(score[1])||0,
      },
      hStats: teamStats[hId] || {passes:1, shots:0, shotsOnTarget:0, keyPasses:0},
      aStats: teamStats[aId] || {passes:1, shots:0, shotsOnTarget:0, keyPasses:0},
      players: playersArr,
      topPassers: [...playersArr].sort((a:any, b:any) => b.passes - a.passes).slice(0, 5),
      topInterceptors: [...playersArr].sort((a:any, b:any) => (b.interceptions+b.tackles) - (a.interceptions+a.tackles)).slice(0, 5),
      topCreators: [...playersArr].sort((a:any, b:any) => b.keyPasses - a.keyPasses).slice(0, 5)
    };
  }, [rawJson]);

  if (!parsedData) {
    return (
      <div style={containerStyle}>
        <div style={contentWrapperStyle} className="flex items-center justify-center p-8">
          <div className="bg-black/80 text-white font-bold p-8 text-xl rounded-xl border border-red-500/50 flex flex-col items-center gap-4">
             <div className="animate-pulse w-12 h-12 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
             {errorStatus || 'جارٍ الاتصال بالجسر للحصول على البيانات المباشرة...'}
          </div>
        </div>
      </div>
    );
  }

  const { match, hStats, aStats, players, topPassers, topInterceptors, topCreators } = parsedData;

  // Dominance
  const hp = hStats.passes, ap = aStats.passes;
  const possHome = Math.round(hp/(hp+ap)*100) || 50;
  const hs = hStats.shots, as = aStats.shots;
  const shotShare = hs+as > 0 ? (hs/(hs+as)) : 0.5;
  const hk = hStats.keyPasses, ak = aStats.keyPasses;
  const keyShare = hk+ak > 0 ? (hk/(hk+ak)) : 0.5;
  let domHome = Math.round((possHome/100 * 0.5 + shotShare * 0.3 + keyShare * 0.2) * 100);
  if(isNaN(domHome)) domHome = 50;

  // MOTM
  const validPlayers = players.filter((p:any) => p.rating > 0);
  validPlayers.sort((a:any, b:any) => b.rating - a.rating);
  const motm = validPlayers[0];

  const SimpleStatBar = ({ label, v1, v2, suffix='' }: any) => {
    const tot = v1 + v2 || 1;
    const pct1 = (v1 / tot) * 100;
    return (
      <div className="mb-4">
        <div className="flex justify-between text-[11px] mb-1.5 text-white/70">
          <span className="font-bold text-sm" style={{color: homeColor, fontFamily: 'Barlow Condensed'}}>{v1}{suffix}</span>
          <span className="uppercase tracking-widest font-bold">{label}</span>
          <span className="font-bold text-sm" style={{color: awayColor, fontFamily: 'Barlow Condensed'}}>{v2}{suffix}</span>
        </div>
        <div className="flex h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full transition-all duration-1000" style={{width: `${pct1}%`, background: homeColor}} />
          <div className="h-full transition-all duration-1000" style={{width: `${100-pct1}%`, background: awayColor}} />
        </div>
      </div>
    );
  };

  const TopList = ({ title, data, valKey }: any) => (
    <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4">
      <h3 className="text-white/40 text-[10px] tracking-widest uppercase mb-3 text-center border-b border-white/5 pb-2">{title}</h3>
      <div className="flex flex-col gap-2">
        {data.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-white/5 rounded px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-sm" style={{background: p.isHome ? homeColor : awayColor}} />
              <span className="text-xs font-bold text-white truncate max-w-[100px]" title={p.name}>{p.name.split(' ').pop()}</span>
            </div>
            <span className="font-['Barlow_Condensed'] font-black text-sm" style={{color: p.isHome ? homeColor : awayColor}}>
              {p[valKey]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Cairo:wght@600;700&display=swap" rel="stylesheet" />
      <div style={contentWrapperStyle} className="overflow-hidden p-8 flex justify-end">

        {/* SIDEBAR CONTAINER */}
        <div className="w-[450px] h-full flex flex-col gap-4 font-['Cairo']">
          
          {/* SCOREBUG LIVE */}
          <div className="flex items-center justify-between bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
            <div className="absolute top-1 right-2 flex items-center gap-1">
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
               <span className="text-[8px] text-red-500 tracking-widest font-black uppercase">LIVE DATA</span>
            </div>

            <div className="flex items-center h-16 relative flex-1 pl-4 mt-2">
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{background: homeColor}} />
              <div className="font-['Barlow_Condensed'] text-3xl font-black text-white">{match.homeTeam.substring(0,3).toUpperCase()}</div>
            </div>
            <div className="bg-black/80 h-16 mt-2 flex items-center justify-center px-6 font-['Barlow_Condensed'] text-4xl font-black text-white">
              {match.homeScore} <span className="text-white/30 mx-2 text-2xl">:</span> {match.awayScore}
            </div>
            <div className="flex items-center justify-end h-16 relative flex-1 pr-4 mt-2">
              <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{background: awayColor}} />
              <div className="font-['Barlow_Condensed'] text-3xl font-black text-white">{match.awayTeam.substring(0,3).toUpperCase()}</div>
            </div>
          </div>

          {/* DOMINANCE */}
          {showDominance && (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-5">
                <div className="text-center text-[10px] tracking-widest text-white/50 mb-2 uppercase">Live Dominance Index</div>
                <div className="flex items-center gap-3 font-['Barlow_Condensed'] text-3xl font-black">
                  <div style={{color: homeColor}}>{domHome}%</div>
                  <div className="flex-1 h-3 bg-white/10 rounded-full relative overflow-hidden shadow-inner">
                    <div className="absolute left-0 top-0 bottom-0 transition-all duration-1000" style={{width: `${domHome}%`, background: `linear-gradient(90deg, ${homeColor}, ${awayColor})`}} />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-10" />
                  </div>
                  <div style={{color: awayColor}}>{100-domHome}%</div>
                </div>
              </div>

              <div>
                <SimpleStatBar label="الاستحواذ" v1={possHome} v2={100-possHome} suffix="%" />
                <SimpleStatBar label="التسديدات (على المرمى)" v1={`${hStats.shots} (${hStats.shotsOnTarget})`} v2={`${aStats.shots} (${aStats.shotsOnTarget})`} />
                <SimpleStatBar label="التمريرات" v1={hStats.passes} v2={aStats.passes} />
              </div>
            </div>
          )}

          {/* TOP 5 STATS (NEW LIVE FEATURE) */}
          {showTopStats && (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex gap-3">
              <TopList title="صناع الفرص" data={topCreators} valKey="keyPasses" />
              <TopList title="قاطعي الكرات" data={topInterceptors} valKey="interceptions" />
            </div>
          )}

          {/* MOTM */}
          {showMotm && motm && (
            <div className="relative mt-1">
              <div className="absolute -top-3 left-4 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-['Barlow_Condensed'] font-black px-4 py-0.5 text-[10px] rounded-t-lg z-10 tracking-widest">
                LIVE MOTM
              </div>
              <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.1)] relative overflow-hidden flex items-center justify-between">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
                
                <div className="relative z-10 flex flex-col">
                    <h1 className="text-lg font-bold text-white leading-tight">{motm.name}</h1>
                    <h3 className="text-[10px] text-white/50 uppercase tracking-widest">{motm.isHome ? match.homeTeam : match.awayTeam}</h3>
                </div>
                
                <div className="font-['Barlow_Condensed'] text-5xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)] relative z-10">
                  {motm.rating.toFixed(1)}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
