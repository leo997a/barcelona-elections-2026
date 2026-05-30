import React, { useEffect, useMemo, useState } from 'react';
import { RendererProps } from './SharedComponents';
import { Sponsor } from '../../types';

const safeNumber = (value: unknown, fallback = 0): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const formatUsd = (value: number): string =>
    `$${Math.round(value).toLocaleString('en-US')}`;

const parseSponsors = (raw: unknown): Sponsor[] => {
    try {
        const parsed = JSON.parse(String(raw || '[]'));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const rankToken = (rank: number) => {
    if (rank === 1) return { label: '01', tone: '#fbbf24', title: 'الأول' };
    if (rank === 2) return { label: '02', tone: '#cbd5e1', title: 'الثاني' };
    if (rank === 3) return { label: '03', tone: '#d97706', title: 'الثالث' };
    return { label: String(rank).padStart(2, '0'), tone: '#38bdf8', title: 'داعم' };
};

export const LeaderboardRenderer: React.FC<RendererProps> = ({
    config,
    getField,
    containerStyle,
    contentWrapperStyle,
    activeTheme,
    wasVisible,
    playSound,
}) => {
    const [leaderboardPage, setLeaderboardPage] = useState(0);

    const sponsors = useMemo(
        () => parseSponsors(getField('sponsorsData')).sort((a, b) => safeNumber(b.usdAmount) - safeNumber(a.usdAmount)),
        [getField],
    );

    const headline = String(getField('headline') || 'شريط الداعمين');
    const sidebarWidth = safeNumber(getField('sidebarWidth'), 650);
    const itemsPerPage = Math.max(3, safeNumber(getField('itemsPerPage'), 6));
    const rotationTime = Math.max(3, safeNumber(getField('rotationTime'), 10));
    const bgOpacity = safeNumber(getField('bgOpacity'), 0.92);
    const displayMode = String(getField('sponsorDisplayMode') || 'elite_wall');

    const headerFontSize = safeNumber(getField('headerFontSize'), 48);
    const nameFontSize = safeNumber(getField('nameFontSize'), 28);
    const amountFontSize = safeNumber(getField('amountFontSize'), 20);

    const showAvatars = getField('showAvatars') !== false;
    const showAmounts = getField('showAmounts') !== false;
    const showRanks = getField('showRanks') !== false;
    const showSponsorStats = getField('showSponsorStats') !== false;
    const showGoalProgress = getField('showGoalProgress') !== false;
    const goalUsd = Math.max(0, safeNumber(getField('fundraisingGoalUsd'), 10000));

    const totalUsd = sponsors.reduce((sum, sponsor) => sum + safeNumber(sponsor.usdAmount), 0);
    const totalDonations = sponsors.reduce((sum, sponsor) => sum + (sponsor.history?.length || 0), 0);
    const topSponsor = sponsors[0];
    const goalProgress = goalUsd > 0 ? Math.min(100, Math.round((totalUsd / goalUsd) * 100)) : 0;
    const totalPages = Math.max(1, Math.ceil(sponsors.length / itemsPerPage));

    useEffect(() => {
        if (config.isVisible && totalPages > 1) {
            const interval = window.setInterval(() => {
                setLeaderboardPage(prev => {
                    const next = (prev + 1) % totalPages;
                    playSound('TRANSITION');
                    return next;
                });
            }, rotationTime * 1000);
            return () => window.clearInterval(interval);
        }
        setLeaderboardPage(0);
    }, [config.isVisible, totalPages, rotationTime, playSound]);

    const currentSponsors = sponsors.slice(leaderboardPage * itemsPerPage, (leaderboardPage + 1) * itemsPerPage);
    const componentAnimClass = config.isVisible ? 'animate-slide-in-from-left' : wasVisible ? 'animate-slide-out-to-left' : 'opacity-0';
    const compact = displayMode === 'compact_stack';
    const pageLabel = totalPages > 1 ? `${leaderboardPage + 1}/${totalPages}` : 'LIVE';

    return (
        <div style={{ ...containerStyle, opacity: 1 }}>
            <div style={{ ...contentWrapperStyle, justifyContent: 'flex-start', paddingLeft: 0 }} className="relative z-10 h-full flex flex-col justify-center subpixel-antialiased">
                <div
                    dir="rtl"
                    className={`relative flex flex-col overflow-hidden rounded-r-2xl ${componentAnimClass}`}
                    style={{
                        width: `${sidebarWidth}px`,
                        background: `linear-gradient(145deg, rgba(2,6,23,${bgOpacity}) 0%, rgba(15,23,42,${bgOpacity}) 56%, rgba(0,0,0,${Math.min(0.98, bgOpacity + 0.04)}) 100%)`,
                        backdropFilter: 'blur(34px) saturate(1.35)',
                        WebkitBackdropFilter: 'blur(34px) saturate(1.35)',
                        border: `1px solid ${activeTheme.primary}55`,
                        boxShadow: `0 0 0 1px ${activeTheme.accent}16 inset, 0 28px 70px rgba(0,0,0,0.64)`,
                        transform: 'translateZ(0)',
                    }}
                >
                    <div
                        className="absolute inset-0 opacity-[0.08] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(${activeTheme.primary} 1px, transparent 1px), linear-gradient(90deg, ${activeTheme.primary} 1px, transparent 1px)`,
                            backgroundSize: '38px 38px',
                        }}
                    />
                    <div className="absolute top-0 bottom-0 right-0 w-1.5" style={{ background: `linear-gradient(to bottom, ${activeTheme.primary}, ${activeTheme.accent})` }} />

                    {totalPages > 1 && config.isVisible && (
                        <div className="relative h-1 bg-white/5 w-full">
                            <div
                                key={leaderboardPage}
                                className="h-full origin-right"
                                style={{ background: `linear-gradient(to left, ${activeTheme.accent}, ${activeTheme.primary})`, animation: `progressLinear ${rotationTime}s linear forwards` }}
                            />
                            <style>{`@keyframes progressLinear { 0% { width: 0%; } 100% { width: 100%; } }`}</style>
                        </div>
                    )}

                    <div className="relative p-6 pb-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.34em]" style={{ color: activeTheme.accent }}>
                                    REO SUPPORT WALL
                                </div>
                                <h1
                                    className="mt-1 font-black leading-none text-white"
                                    style={{
                                        fontSize: `${headerFontSize}px`,
                                        textShadow: `0 5px 24px ${activeTheme.primary}80`,
                                        textRendering: 'geometricPrecision',
                                    }}
                                >
                                    {headline}
                                </h1>
                            </div>
                            <div className="rounded-lg px-3 py-2 text-center shrink-0" style={{ background: `${activeTheme.primary}16`, border: `1px solid ${activeTheme.primary}45` }}>
                                <div className="text-[9px] font-bold text-white/55">الصفحة</div>
                                <div className="font-mono text-sm font-black" style={{ color: activeTheme.accent }}>{pageLabel}</div>
                            </div>
                        </div>

                        {showSponsorStats && (
                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div className="text-[9px] font-bold text-white/45">الإجمالي</div>
                                    <div className="mt-1 font-mono text-[20px] font-black" style={{ color: activeTheme.accent }}>{formatUsd(totalUsd)}</div>
                                </div>
                                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div className="text-[9px] font-bold text-white/45">الداعمين</div>
                                    <div className="mt-1 font-mono text-[20px] font-black text-white">{sponsors.length}</div>
                                </div>
                                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div className="text-[9px] font-bold text-white/45">الدفعات</div>
                                    <div className="mt-1 font-mono text-[20px] font-black text-white">{totalDonations}</div>
                                </div>
                            </div>
                        )}

                        {showGoalProgress && goalUsd > 0 && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-[10px] font-bold text-white/50">
                                    <span>هدف الدعم</span>
                                    <span className="font-mono">{goalProgress}% / {formatUsd(goalUsd)}</span>
                                </div>
                                <div className="mt-1 h-2 rounded-full overflow-hidden bg-white/10">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${goalProgress}%`, background: `linear-gradient(to left, ${activeTheme.accent}, ${activeTheme.primary})` }} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`relative px-4 pb-5 flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
                        {sponsors.length === 0 ? (
                            <div className="h-44 flex flex-col items-center justify-center text-gray-500 gap-2 border-2 border-dashed border-white/10 rounded-xl bg-black/20">
                                <span className="text-4xl opacity-30">$</span>
                                <span className="text-sm font-bold opacity-70">بانتظار بيانات الداعمين</span>
                            </div>
                        ) : (
                            currentSponsors.map((sponsor, index) => {
                                const globalRank = leaderboardPage * itemsPerPage + index + 1;
                                const rank = rankToken(globalRank);
                                const usd = safeNumber(sponsor.usdAmount);
                                const share = totalUsd > 0 ? Math.min(100, Math.round((usd / totalUsd) * 100)) : 0;
                                const lastDonation = sponsor.history?.[sponsor.history.length - 1];

                                return (
                                    <div
                                        key={sponsor.id}
                                        className={`relative overflow-hidden rounded-xl transition-all animate-cinematic-fade-up ${compact ? 'p-3' : 'p-4'}`}
                                        style={{
                                            background: globalRank <= 3
                                                ? `linear-gradient(110deg, ${rank.tone}18 0%, rgba(255,255,255,0.045) 48%, rgba(0,0,0,0.18) 100%)`
                                                : 'rgba(255,255,255,0.035)',
                                            border: `1px solid ${globalRank <= 3 ? `${rank.tone}55` : 'rgba(255,255,255,0.07)'}`,
                                            animationDelay: `${index * 55}ms`,
                                        }}
                                    >
                                        <div className="absolute top-0 bottom-0 right-0 w-[3px]" style={{ background: rank.tone }} />
                                        <div className="flex items-center gap-3">
                                            {showRanks && (
                                                <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: `${rank.tone}18`, border: `1px solid ${rank.tone}45` }}>
                                                    <span className="font-mono text-[15px] font-black" style={{ color: rank.tone }}>{rank.label}</span>
                                                    <span className="text-[8px] font-black text-white/35">{rank.title}</span>
                                                </div>
                                            )}
                                            {showAvatars && (
                                                <img
                                                    src={sponsor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sponsor.name)}&background=0f172a&color=ffffff&size=128`}
                                                    className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-full object-cover border shadow-lg`}
                                                    style={{ borderColor: `${rank.tone}80` }}
                                                    alt=""
                                                />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3
                                                            className="font-black truncate leading-tight text-white"
                                                            style={{ fontSize: `${compact ? Math.max(16, nameFontSize - 6) : nameFontSize}px`, textRendering: 'geometricPrecision' }}
                                                        >
                                                            {sponsor.name}
                                                        </h3>
                                                        {lastDonation && (
                                                            <div className="mt-1 text-[9px] text-white/45">
                                                                آخر دفعة: {safeNumber(lastDonation.amount).toLocaleString()} {lastDonation.currency}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {showAmounts && (
                                                        <div className="text-left shrink-0">
                                                            <div className="font-mono font-black leading-none" style={{ color: activeTheme.accent, fontSize: `${compact ? Math.max(15, amountFontSize - 2) : amountFontSize}px` }}>
                                                                {formatUsd(usd)}
                                                            </div>
                                                            <div className="mt-1 text-[9px] text-white/40">
                                                                {safeNumber(sponsor.amount).toLocaleString()} {sponsor.currency}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {!compact && (
                                                    <div className="mt-3">
                                                        <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                                                            <div className="h-full rounded-full" style={{ width: `${share}%`, background: `linear-gradient(to left, ${rank.tone}, ${activeTheme.accent})` }} />
                                                        </div>
                                                        <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-white/38">
                                                            <span>نسبة من إجمالي الدعم</span>
                                                            <span className="font-mono">{share}%</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {topSponsor && (
                        <div className="relative mt-auto px-5 py-3 border-t border-white/10 bg-black/30">
                            <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-white/45">
                                <span>أعلى داعم الآن</span>
                                <span className="truncate text-white/70">{topSponsor.name}</span>
                                <span className="font-mono" style={{ color: activeTheme.accent }}>{formatUsd(safeNumber(topSponsor.usdAmount))}</span>
                            </div>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="relative p-3 bg-black/30 border-t border-white/5 flex items-center justify-center gap-2">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === leaderboardPage ? 'w-8' : 'w-2 bg-white/20'}`} style={i === leaderboardPage ? { background: activeTheme.accent, boxShadow: `0 0 10px ${activeTheme.accent}` } : undefined} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
