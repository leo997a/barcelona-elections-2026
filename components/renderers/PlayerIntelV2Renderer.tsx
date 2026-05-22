/**
 * Player Intel V2 — Broadcast Renderer (Production)
 *
 * Real broadcast variants:
 *  - premium_broadcast  (default — 16:9 hero card)
 *  - tactical_board     (dense data grid)
 *  - magazine_profile   (large portrait + 4 big numbers)
 *  - compact_tv         (horizontal slim bar)
 *  - h2h_duel           (compare mode — split vs)
 *
 * Reads metric selection from playerIntelHeroMetricsJson / playerIntelSecondaryMetricsJson
 * fields (manual control), falls back to preset cardType, then to broadcastCards items.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { RendererProps } from './SharedComponents';
import {
  resolveMetrics,
  formatMetricValue,
  type CardType,
  type ResolvedMetric,
} from '../player-intel-v2/playerIntelV2MetricResolver';
import { getMetricAr, cardArTitle } from '../player-intel-v2/playerIntelV2Labels';
import type { PlayerIntelMasterFull } from '../player-intel-v2/playerIntelV2Types';

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES = {
  broadcast_dark: {
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(15,30,60,1) 0%, rgba(11,17,32,1) 70%)',
    accent: '#00e5ff',
    accentSoft: 'rgba(0,229,255,0.10)',
    surface: 'rgba(15,25,50,0.85)',
    surfaceLight: 'rgba(25,40,75,0.75)',
    text: '#ffffff',
    sub: '#8899bb',
    dim: '#4a5568',
    border: 'rgba(60,90,140,0.45)',
    bgFlat: '#0b1120',
  },
  barcelona_night: {
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(40,10,60,1) 0%, rgba(13,5,32,1) 70%)',
    accent: '#ff2d55',
    accentSoft: 'rgba(255,45,85,0.10)',
    surface: 'rgba(30,10,50,0.85)',
    surfaceLight: 'rgba(50,20,80,0.75)',
    text: '#ffffff',
    sub: '#c4b5fd',
    dim: '#6b4d8a',
    border: 'rgba(120,40,160,0.45)',
    bgFlat: '#0d0520',
  },
  clean_studio: {
    bg: 'radial-gradient(ellipse at 70% 50%, rgba(25,40,60,1) 0%, rgba(16,24,32,1) 70%)',
    accent: '#4d8dff',
    accentSoft: 'rgba(77,141,255,0.10)',
    surface: 'rgba(25,35,55,0.85)',
    surfaceLight: 'rgba(40,55,80,0.75)',
    text: '#ffffff',
    sub: '#aab8c6',
    dim: '#556677',
    border: 'rgba(70,95,130,0.45)',
    bgFlat: '#101820',
  },
} as const;

type ThemeKey = keyof typeof THEMES;
type Theme = typeof THEMES.broadcast_dark;

const SAMPLES_BASE = '/player-intel-v2-samples';

const PLAYER_IMG_FALLBACK: Record<string, string> = {
  'lamine-yamal': 'https://images.fotmob.com/image_resources/playerimages/1467236.png',
  'robert-lewandowski': 'https://images.fotmob.com/image_resources/playerimages/93447.png',
  'cole-palmer': 'https://images.fotmob.com/image_resources/playerimages/1096353.png',
};

async function loadBroadcast(slug: string): Promise<PlayerIntelMasterFull | null> {
  // First, check localStorage dynamic store (FotMob on-demand profiles)
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('reo:player-intel-v2:dynamic-profiles:v1');
      if (raw) {
        const parsed = JSON.parse(raw) as { entries?: Record<string, { profile?: unknown }> };
        const entry = parsed.entries?.[slug];
        if (entry?.profile) {
          return entry.profile as PlayerIntelMasterFull;
        }
      }
    }
  } catch { /* ignore */ }

  // Fall back to static public file
  try {
    const r = await fetch(`${SAMPLES_BASE}/${slug}.broadcast.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as PlayerIntelMasterFull;
  } catch { return null; }
}

interface RegistryPlayer { id: string; name: string; club: string; file: string; }

async function loadRegistry(): Promise<RegistryPlayer[]> {
  let staticPlayers: RegistryPlayer[] = [];
  try {
    const r = await fetch(`${SAMPLES_BASE}/index.json`, { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      staticPlayers = (data?.players || []) as RegistryPlayer[];
    }
  } catch { /* ignore */ }

  // Merge with localStorage dynamic profiles
  const dynamic: RegistryPlayer[] = [];
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('reo:player-intel-v2:dynamic-profiles:v1');
      if (raw) {
        const parsed = JSON.parse(raw) as { entries?: Record<string, { id: string; name: string; club: string }> };
        for (const e of Object.values(parsed.entries || {})) {
          dynamic.push({ id: e.id, name: e.name, club: e.club, file: '__dynamic__' });
        }
      }
    }
  } catch { /* ignore */ }

  // Dynamic first, then static (no duplicates)
  const seen = new Set<string>();
  const merged: RegistryPlayer[] = [];
  for (const e of [...dynamic, ...staticPlayers]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    merged.push(e);
  }
  return merged;
}

// ─── Build metrics from manual selection or preset ────────────────────────────

function buildMetricsFromSelection(
  data: PlayerIntelMasterFull | null,
  selectedKeys: string[],
): ResolvedMetric[] {
  if (!data || selectedKeys.length === 0) return [];
  const cards = data.broadcastCards || {};
  const all: Record<string, ResolvedMetric> = {};

  // Index every item from every card by key
  Object.values(cards).forEach((card) => {
    (card?.items || []).forEach((it) => {
      if (it.value === null || it.value === undefined || it.value === '') return;
      const key = it.key;
      if (!key || all[key]) return;
      all[key] = {
        key,
        label: it.label || key,
        labelAr: getMetricAr(key, it.labelAr, it.label),
        value: it.value,
        formattedValue: formatMetricValue(it.value, key),
        source: it.source || 'unknown',
        category: it.category || '',
        rank: typeof it.percentileRank === 'number' ? it.percentileRank : null,
        per90: typeof it.per90 === 'number' ? it.per90 : null,
      };
    });
  });

  return selectedKeys
    .map((k) => all[k])
    .filter((m): m is ResolvedMetric => Boolean(m));
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export const PlayerIntelV2Renderer: React.FC<RendererProps> = ({ config, getField, isEditor }) => {
  const mode = String(getField('mode') || 'single');
  const playerASlug = String(getField('samplePlayer') || 'lamine-yamal');
  const playerBSlug = String(getField('samplePlayerB') || 'robert-lewandowski');
  const pastedJsonA = String(getField('masterJson') || '');
  const pastedJsonB = String(getField('masterJsonB') || '');
  const cardType = String(getField('cardType') || 'attacker_card') as CardType | 'custom';
  const visualVariant = String(getField('visualVariant') || 'premium_broadcast');
  const themeKey = String(getField('visualTheme') || 'broadcast_dark') as ThemeKey;
  const showSources = getField('showSources') !== false;
  const showFooter = getField('showFooter') !== false;

  const heroKeysSel = useMemo<string[]>(() => {
    try { return JSON.parse(String(getField('playerIntelHeroMetricsJson') || '[]')); }
    catch { return []; }
  }, [getField]);
  const secondaryKeysSel = useMemo<string[]>(() => {
    try { return JSON.parse(String(getField('playerIntelSecondaryMetricsJson') || '[]')); }
    catch { return []; }
  }, [getField]);

  const t = THEMES[themeKey] || THEMES.broadcast_dark;

  const [registry, setRegistry] = useState<RegistryPlayer[]>([]);
  const [dataA, setDataA] = useState<PlayerIntelMasterFull | null>(null);
  const [dataB, setDataB] = useState<PlayerIntelMasterFull | null>(null);

  const parsedA = useMemo<PlayerIntelMasterFull | null>(() => {
    if (!pastedJsonA || pastedJsonA.length < 100) return null;
    try { return JSON.parse(pastedJsonA) as PlayerIntelMasterFull; } catch { return null; }
  }, [pastedJsonA]);

  const parsedB = useMemo<PlayerIntelMasterFull | null>(() => {
    if (!pastedJsonB || pastedJsonB.length < 100) return null;
    try { return JSON.parse(pastedJsonB) as PlayerIntelMasterFull; } catch { return null; }
  }, [pastedJsonB]);

  useEffect(() => { loadRegistry().then(setRegistry); }, []);

  useEffect(() => {
    if (parsedA) { setDataA(null); return; }
    let m = true;
    loadBroadcast(playerASlug).then((d) => { if (m) setDataA(d); });
    return () => { m = false; };
  }, [playerASlug, parsedA]);

  useEffect(() => {
    if (mode !== 'compare') { setDataB(null); return; }
    if (parsedB) { setDataB(null); return; }
    let m = true;
    loadBroadcast(playerBSlug).then((d) => { if (m) setDataB(d); });
    return () => { m = false; };
  }, [playerBSlug, parsedB, mode]);

  // Update sample option lists in editor
  useEffect(() => {
    if (!isEditor || registry.length === 0) return;
    const updateField = (id: string) => {
      const f = config.fields.find((ff) => ff.id === id);
      if (f && Array.isArray(f.options)) {
        const opts = registry.map((p) => ({ label: `${p.name} — ${p.club}`, value: p.id }));
        if (JSON.stringify(f.options) !== JSON.stringify(opts)) f.options = opts;
      }
    };
    updateField('samplePlayer');
    updateField('samplePlayerB');
  }, [registry, isEditor, config.fields]);

  // ── Resolve final metrics for player A and B ──────────────────────────────
  const sourceA = parsedA || dataA;
  const sourceB = parsedB || dataB;

  // Manual selection takes priority; fall back to preset via resolveMetrics
  const useManual = (heroKeysSel.length + secondaryKeysSel.length) > 0;

  const heroA: ResolvedMetric[] = useMemo(() => {
    if (useManual) return buildMetricsFromSelection(sourceA, heroKeysSel);
    if (cardType === 'custom') return [];
    return resolveMetrics(sourceA, cardType as CardType, 4, 4).heroMetrics;
  }, [sourceA, heroKeysSel, useManual, cardType]);

  const secondaryA: ResolvedMetric[] = useMemo(() => {
    if (useManual) return buildMetricsFromSelection(sourceA, secondaryKeysSel);
    if (cardType === 'custom') return [];
    return resolveMetrics(sourceA, cardType as CardType, 4, 8).secondaryMetrics;
  }, [sourceA, secondaryKeysSel, useManual, cardType]);

  const heroB: ResolvedMetric[] = useMemo(() => {
    if (mode !== 'compare') return [];
    if (useManual) return buildMetricsFromSelection(sourceB, heroKeysSel);
    if (cardType === 'custom') return [];
    return resolveMetrics(sourceB, cardType as CardType, 4, 4).heroMetrics;
  }, [sourceB, heroKeysSel, useManual, cardType, mode]);

  // Resolve metadata (player, club, position, image)
  const metaA = useMemo(() => {
    const r = resolveMetrics(sourceA, cardType === 'custom' ? 'attacker_card' : (cardType as CardType), 0, 0);
    return r.meta;
  }, [sourceA, cardType]);
  const metaB = useMemo(() => {
    const r = resolveMetrics(sourceB, cardType === 'custom' ? 'attacker_card' : (cardType as CardType), 0, 0);
    return r.meta;
  }, [sourceB, cardType]);

  const imageA = metaA.imageUrl || PLAYER_IMG_FALLBACK[playerASlug] || null;
  const imageB = metaB.imageUrl || PLAYER_IMG_FALLBACK[playerBSlug] || null;

  // Determine actual variant: h2h_duel forces compare style
  const actualVariant = mode === 'compare' && heroB.length > 0
    ? 'h2h_duel'
    : (visualVariant === 'h2h_duel' ? 'premium_broadcast' : visualVariant);

  const sourceCoverage = sourceA?.sourceCoverage || { fotmob: false, fbref: false };
  const cardTitleAr = cardType === 'custom' ? 'بطاقة مخصّصة' : cardArTitle(cardType.replace('_card', '').replace('_report', ''), cardArTitle(cardType));

  // Read dataScope (from sourceA or sourceB if sourceA missing)
  const dataScope = (sourceA as Record<string, unknown> | null)?.dataScope as
    | { scopeType?: string; label?: string; competitionName?: string; season?: string; confidence?: string }
    | undefined;
  const baseLabel = dataScope?.label || (dataScope?.competitionName && dataScope?.season
    ? `${dataScope.competitionName} · ${dataScope.season}`
    : null);
  const sourcePrefix = (sourceA?.sourceCoverage?.fbref && sourceA?.sourceCoverage?.fotmob)
    ? 'FBref + FotMob'
    : sourceA?.sourceCoverage?.fbref ? 'FBref' : sourceA?.sourceCoverage?.fotmob ? 'FotMob' : null;
  const scopeLabel = baseLabel
    ? (sourcePrefix ? `${sourcePrefix} · ${baseLabel}` : baseLabel)
    : null;

  const commonProps = {
    t, metaA, metaB, imageA, imageB, heroA, secondaryA, heroB,
    showSources, showFooter, sourceCoverage, cardTitleAr, mode, scopeLabel,
  };

  return (
    <div className="w-full h-full" style={{ fontFamily: "'Tajawal', sans-serif", background: t.bgFlat }}>
      {actualVariant === 'h2h_duel' && <H2HDuelVariant {...commonProps} />}
      {actualVariant === 'premium_broadcast' && <PremiumBroadcastVariant {...commonProps} />}
      {actualVariant === 'tactical_board' && <TacticalBoardVariant {...commonProps} />}
      {actualVariant === 'magazine_profile' && <MagazineProfileVariant {...commonProps} />}
      {actualVariant === 'compact_tv' && <CompactTVVariant {...commonProps} />}
    </div>
  );
};

// ─── Shared types for variants ────────────────────────────────────────────────

interface VariantProps {
  t: Theme;
  metaA: { player: string; club: string; season: string; position: string; cardTitleAr: string; imageUrl: string | null };
  metaB: { player: string; club: string; season: string; position: string; cardTitleAr: string; imageUrl: string | null };
  imageA: string | null;
  imageB: string | null;
  heroA: ResolvedMetric[];
  secondaryA: ResolvedMetric[];
  heroB: ResolvedMetric[];
  showSources: boolean;
  showFooter: boolean;
  sourceCoverage: { fotmob: boolean; fbref: boolean };
  cardTitleAr: string;
  mode: string;
  scopeLabel: string | null;
}

// ─── 1. Premium Broadcast Card ────────────────────────────────────────────────

const PremiumBroadcastVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, heroA, secondaryA, showSources, showFooter, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  const heroCols = Math.min(heroA.length || 1, 4);
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: t.bg, aspectRatio: '16/9' }}>
      {/* Glow */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
        style={{ background: t.accentSoft }} />

      <div className="absolute inset-0 flex" dir="rtl">
        {/* Right: Portrait */}
        <div className="w-[30%] h-full relative flex items-end justify-center">
          <div className="absolute bottom-0 left-0 right-0 h-[35%] z-10 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${t.bgFlat}, transparent)` }} />
          {imageA ? (
            <PortraitImage src={imageA} t={t} />
          ) : (
            <ImagePlaceholder t={t} />
          )}
        </div>

        {/* Left: Content */}
        <div className="flex-1 flex flex-col justify-center px-[3.5%] py-[2.5%] gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardBadge t={t} text={cardTitleAr} />
            {scopeLabel && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(255,255,255,0.04)', color: t.sub, border: `1px solid ${t.border}` }}>
                {scopeLabel}
              </span>
            )}
          </div>
          <PlayerIdentity t={t} meta={metaA} large />

          {heroA.length > 0 ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${heroCols}, 1fr)` }}>
              {heroA.slice(0, 5).map((m) => <HeroStatLarge key={m.key} m={m} t={t} />)}
            </div>
          ) : <NoData t={t} />}

          {secondaryA.length > 0 && (
            <div className="grid gap-2 mt-1" style={{ gridTemplateColumns: `repeat(${Math.min(secondaryA.length, 4)}, 1fr)` }}>
              {secondaryA.slice(0, 4).map((m) => <SecondaryStat key={m.key} m={m} t={t} />)}
            </div>
          )}

          {showSources && <SourceBadges sourceCoverage={sourceCoverage} mt />}
        </div>
      </div>

      {showFooter && <Footer t={t} />}
    </div>
  );
};

// ─── 2. Tactical Data Board ───────────────────────────────────────────────────

const TacticalBoardVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, heroA, secondaryA, showSources, showFooter, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  const allMetrics = [...heroA, ...secondaryA].slice(0, 12);
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: t.bg, aspectRatio: '16/9' }}>
      <div className="absolute inset-0 grid grid-cols-[20%_1fr]" dir="rtl">
        {/* Left rail: small portrait + identity */}
        <div className="border-l flex flex-col" style={{ borderColor: t.border, background: t.surface }}>
          <div className="flex-1 flex items-center justify-center p-3">
            {imageA ? (
              <img src={imageA} alt="" className="max-w-full max-h-[200px] object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
            ) : <ImagePlaceholder t={t} small />}
          </div>
          <div className="p-3 border-t" style={{ borderColor: t.border }}>
            <CardBadge t={t} text={cardTitleAr} small />
            <div className="text-[20px] font-black mt-1.5 leading-tight" style={{ color: t.text }}>{metaA.player}</div>
            <div className="text-[11px] mt-1" style={{ color: t.sub }}>{metaA.club}</div>
            <div className="text-[10px] mt-0.5" style={{ color: t.dim }}>{metaA.position} · {metaA.season}</div>
            {scopeLabel && (
              <div className="text-[9px] mt-1.5 font-mono" style={{ color: t.accent, opacity: 0.7 }}>
                {scopeLabel}
              </div>
            )}
          </div>
        </div>

        {/* Right: dense grid */}
        <div className="p-4 flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2 flex-1">
            {allMetrics.map((m) => <DenseStatCell key={m.key} m={m} t={t} />)}
            {allMetrics.length === 0 && <div className="col-span-4 self-center"><NoData t={t} /></div>}
          </div>
          {showSources && <SourceBadges sourceCoverage={sourceCoverage} />}
        </div>
      </div>
      {showFooter && <Footer t={t} />}
    </div>
  );
};

// ─── 3. Magazine Player Profile ───────────────────────────────────────────────

const MagazineProfileVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, heroA, showSources, showFooter, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  return (
    <div className="w-full h-full relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${t.bgFlat} 0%, ${t.surface} 100%)`, aspectRatio: '16/9' }}>
      {/* Vertical accent bar */}
      <div className="absolute top-0 right-0 w-[6px] h-full" style={{ background: t.accent }} />

      <div className="absolute inset-0 flex" dir="rtl">
        {/* Right: Big portrait */}
        <div className="w-[42%] h-full relative">
          <div className="absolute inset-0 flex items-end justify-center">
            {imageA ? (
              <img src={imageA} alt="" className="w-[95%] max-h-[100%] object-contain object-bottom"
                style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.8))' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
            ) : <ImagePlaceholder t={t} />}
          </div>
          <div className="absolute top-[8%] right-[4%]">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60" style={{ color: t.accent }}>
              PLAYER INTEL
            </div>
            <div className="text-[10px] font-bold tracking-wide mt-1" style={{ color: t.sub }}>
              {metaA.season}
            </div>
          </div>
        </div>

        {/* Left: Big numbers */}
        <div className="flex-1 flex flex-col justify-center px-[4%] py-[3%]">
          <div className="text-[11px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: t.accent }}>
            {cardTitleAr}
          </div>
          <h1 className="text-[64px] font-black leading-[0.95] mb-2 tracking-tight" style={{ color: t.text }}>
            {metaA.player}
          </h1>
          <div className="text-[16px] mb-8 font-bold" style={{ color: t.sub }}>
            {metaA.club} · {metaA.position}
            {scopeLabel && <span className="block text-[11px] mt-2 font-mono opacity-70" style={{ color: t.accent }}>{scopeLabel}</span>}
          </div>

          {heroA.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {heroA.slice(0, 4).map((m) => (
                <div key={m.key}>
                  <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: t.dim }}>
                    {m.labelAr || m.label}
                  </div>
                  <div className="text-[44px] font-black leading-none" style={{ color: t.text }}>
                    {m.formattedValue}
                  </div>
                  {m.rank !== null && (
                    <div className="text-[10px] mt-1 font-mono" style={{ color: t.accent }}>
                      Top {Math.round(100 - m.rank)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <NoData t={t} />}

          {showSources && <div className="mt-8"><SourceBadges sourceCoverage={sourceCoverage} /></div>}
        </div>
      </div>
      {showFooter && <Footer t={t} />}
    </div>
  );
};

// ─── 4. Compact TV Overlay (horizontal slim bar) ──────────────────────────────

const CompactTVVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, heroA, secondaryA, showSources, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  const allMetrics = [...heroA, ...secondaryA].slice(0, 6);
  return (
    <div className="w-full h-full flex items-end justify-center" style={{ background: 'transparent', aspectRatio: '16/9' }}>
      <div className="w-full" style={{
        background: `linear-gradient(to right, ${t.bgFlat}, ${t.surface})`,
        borderTop: `2px solid ${t.accent}`,
      }}>
        <div className="flex items-stretch" dir="rtl" style={{ minHeight: '110px' }}>
          {/* Player image circle */}
          <div className="w-[110px] flex-shrink-0 relative" style={{ background: t.surfaceLight }}>
            {imageA && (
              <img src={imageA} alt="" className="absolute bottom-0 w-full h-full object-contain object-bottom"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
            )}
          </div>

          {/* Identity */}
          <div className="px-4 py-2 flex flex-col justify-center min-w-[200px] border-l" style={{ borderColor: t.border }}>
            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: t.accent }}>{cardTitleAr}</div>
            <div className="text-[20px] font-black leading-tight" style={{ color: t.text }}>{metaA.player}</div>
            <div className="text-[11px]" style={{ color: t.sub }}>{metaA.club} · {metaA.position}</div>
            {scopeLabel && <div className="text-[9px] font-mono" style={{ color: t.dim }}>{scopeLabel}</div>}
          </div>

          {/* Metrics row */}
          <div className="flex-1 flex items-stretch">
            {allMetrics.map((m, i) => (
              <div key={m.key} className="flex-1 flex flex-col justify-center px-3 border-l"
                style={{ borderColor: i === 0 ? 'transparent' : t.border }}>
                <div className="text-[9px] uppercase tracking-wide truncate" style={{ color: t.dim }}>
                  {m.labelAr || m.label}
                </div>
                <div className="text-[22px] font-black leading-none mt-0.5" style={{ color: t.text }}>
                  {m.formattedValue}
                </div>
              </div>
            ))}
            {allMetrics.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-xs" style={{ color: t.dim }}>—</div>
            )}
          </div>

          {showSources && (
            <div className="flex flex-col items-end justify-center px-3 gap-1 border-l" style={{ borderColor: t.border }}>
              {sourceCoverage.fotmob && <span className="text-[9px] font-bold" style={{ color: '#22c55e' }}>FotMob ✓</span>}
              {sourceCoverage.fbref && <span className="text-[9px] font-bold" style={{ color: '#3b82f6' }}>FBref ✓</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── 5. Head-to-Head Duel ─────────────────────────────────────────────────────

const H2HDuelVariant: React.FC<VariantProps> = ({
  t, metaA, metaB, imageA, imageB, heroA, heroB, showFooter, sourceCoverage, cardTitleAr, showSources, scopeLabel,
}) => {
  // Pair metrics by key
  const pairs = useMemo(() => {
    const bMap = new Map(heroB.map((m) => [m.key, m]));
    return heroA.map((a) => ({ a, b: bMap.get(a.key) || null }));
  }, [heroA, heroB]);

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: t.bg, aspectRatio: '16/9' }}>
      <div className="absolute inset-0 flex" dir="ltr">
        {/* Left: Player A */}
        <div className="w-[35%] flex flex-col items-center justify-center relative px-4 py-6">
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse at center, ${t.accentSoft}, transparent 70%)`,
          }} />
          {imageA ? (
            <img src={imageA} alt="" className="relative z-10 max-h-[55%] object-contain"
              style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
          ) : <ImagePlaceholder t={t} />}
          <div className="relative z-10 text-center mt-4">
            <div className="text-[28px] font-black leading-tight" style={{ color: t.text }}>{metaA.player || '—'}</div>
            <div className="text-[12px]" style={{ color: t.sub }}>{metaA.club}</div>
          </div>
        </div>

        {/* Center: VS + metrics */}
        <div className="flex-1 flex flex-col items-stretch justify-center px-4 py-6 gap-2">
          <div className="text-center mb-2">
            <div className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: t.accent }}>{cardTitleAr}</div>
            <div className="text-[36px] font-black leading-none mt-1" style={{
              color: t.text, textShadow: `0 0 30px ${t.accent}`,
            }}>VS</div>
            {scopeLabel && (
              <div className="text-[9px] mt-1.5 font-mono" style={{ color: t.dim }}>{scopeLabel}</div>
            )}
          </div>

          {pairs.length > 0 ? (
            <div className="space-y-1.5">
              {pairs.slice(0, 6).map(({ a, b }) => (
                <DuelRow key={a.key} a={a} b={b} t={t} />
              ))}
            </div>
          ) : <NoData t={t} />}

          {showSources && <div className="mt-2 flex justify-center"><SourceBadges sourceCoverage={sourceCoverage} /></div>}
        </div>

        {/* Right: Player B */}
        <div className="w-[35%] flex flex-col items-center justify-center relative px-4 py-6">
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse at center, ${t.accentSoft}, transparent 70%)`,
          }} />
          {imageB ? (
            <img src={imageB} alt="" className="relative z-10 max-h-[55%] object-contain"
              style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
          ) : <ImagePlaceholder t={t} />}
          <div className="relative z-10 text-center mt-4">
            <div className="text-[28px] font-black leading-tight" style={{ color: t.text }}>{metaB.player || '—'}</div>
            <div className="text-[12px]" style={{ color: t.sub }}>{metaB.club}</div>
          </div>
        </div>
      </div>

      {showFooter && <Footer t={t} />}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CardBadge: React.FC<{ t: Theme; text: string; small?: boolean }> = ({ t, text, small }) => (
  <span className="inline-flex self-start font-black uppercase tracking-[0.15em] rounded-md"
    style={{
      background: t.accentSoft, color: t.accent, border: `1px solid ${t.accent}30`,
      padding: small ? '2px 8px' : '4px 12px',
      fontSize: small ? '10px' : '12px',
    }}>
    {text}
  </span>
);

const PlayerIdentity: React.FC<{ t: Theme; meta: VariantProps['metaA']; large?: boolean }> = ({ t, meta, large }) => (
  <>
    <h1 className="font-black leading-[1.05]" style={{
      color: t.text, fontSize: large ? '40px' : '28px',
    }}>{meta.player || '—'}</h1>
    <div className="flex items-center gap-2 text-[14px]" style={{ color: t.sub }}>
      {meta.club && <span className="font-bold">{meta.club}</span>}
      {meta.position && <><span style={{ opacity: 0.4 }}>|</span><span>{meta.position}</span></>}
      {meta.season && <><span style={{ opacity: 0.4 }}>|</span><span className="font-mono text-[12px]">{meta.season}</span></>}
    </div>
  </>
);

const HeroStatLarge: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-xl px-3.5 py-3" style={{
    background: t.surface, border: `1px solid ${t.border}`,
  }}>
    <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5 truncate" style={{ color: t.sub }}>
      {m.labelAr || m.label}
    </div>
    <div className="text-[28px] font-black leading-none" style={{ color: t.text }}>{m.formattedValue}</div>
    {m.rank !== null && (
      <div className="flex items-center gap-1.5 mt-2">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: `${t.accent}15` }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(m.rank, 100)}%`, background: t.accent }} />
        </div>
        <span className="text-[9px] font-mono font-bold" style={{ color: t.accent }}>{Math.round(m.rank)}%</span>
      </div>
    )}
  </div>
);

const SecondaryStat: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-lg px-2.5 py-2" style={{ background: `${t.surface}80`, border: `1px solid ${t.border}` }}>
    <div className="text-[8px] uppercase tracking-wide truncate mb-0.5" style={{ color: t.dim }}>{m.labelAr || m.label}</div>
    <div className="text-[16px] font-black" style={{ color: t.text }}>{m.formattedValue}</div>
  </div>
);

const DenseStatCell: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-lg p-2.5 flex flex-col justify-between min-h-[70px]"
    style={{ background: t.surface, border: `1px solid ${t.border}` }}>
    <div className="text-[10px] uppercase tracking-wide truncate" style={{ color: t.sub }}>{m.labelAr || m.label}</div>
    <div className="flex items-baseline justify-between gap-1 mt-1">
      <div className="text-[20px] font-black" style={{ color: t.text }}>{m.formattedValue}</div>
      {m.rank !== null && (
        <span className="text-[9px] font-mono font-bold" style={{ color: t.accent }}>{Math.round(m.rank)}%</span>
      )}
    </div>
  </div>
);

const DuelRow: React.FC<{ a: ResolvedMetric; b: ResolvedMetric | null; t: Theme }> = ({ a, b, t }) => {
  // Determine winner if both numeric
  const aNum = typeof a.value === 'number' ? a.value : parseFloat(String(a.value));
  const bNum = b && typeof b.value === 'number' ? b.value : (b ? parseFloat(String(b.value)) : NaN);
  const aWins = !isNaN(aNum) && !isNaN(bNum) && aNum > bNum;
  const bWins = !isNaN(aNum) && !isNaN(bNum) && bNum > aNum;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg px-2 py-1.5"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-right">
        <span className="text-[20px] font-black" style={{
          color: aWins ? t.accent : t.text,
          textShadow: aWins ? `0 0 12px ${t.accent}` : 'none',
        }}>{a.formattedValue}</span>
      </div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-center px-2" style={{ color: t.dim }}>
        {a.labelAr || a.label}
      </div>
      <div className="text-left">
        <span className="text-[20px] font-black" style={{
          color: bWins ? t.accent : t.text,
          textShadow: bWins ? `0 0 12px ${t.accent}` : 'none',
        }}>{b ? b.formattedValue : '—'}</span>
      </div>
    </div>
  );
};

const SourceBadges: React.FC<{ sourceCoverage: { fotmob: boolean; fbref: boolean }; mt?: boolean }> = ({
  sourceCoverage, mt,
}) => (
  <div className={`flex items-center gap-2 ${mt ? 'mt-auto pt-2' : ''}`}>
    {sourceCoverage.fotmob && (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
        background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)',
      }}>FotMob ✓</span>
    )}
    {sourceCoverage.fbref && (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
        background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)',
      }}>FBref ✓</span>
    )}
  </div>
);

const Footer: React.FC<{ t: Theme }> = ({ t }) => (
  <div className="absolute bottom-0 inset-x-0 h-7 flex items-center justify-center"
    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
    <span className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: t.dim }}>
      REO DATA FABRIC • PLAYER INTEL V2
    </span>
  </div>
);

const NoData: React.FC<{ t: Theme }> = ({ t }) => (
  <div className="rounded-xl px-4 py-6 text-center" style={{
    background: t.surface, border: `1px solid ${t.border}`,
  }}>
    <p className="text-[14px]" style={{ color: t.sub }}>اختر إحصائيات من لوحة التحكم</p>
  </div>
);

const ImagePlaceholder: React.FC<{ t: Theme; small?: boolean }> = ({ t, small }) => (
  <div className="rounded-2xl flex items-center justify-center" style={{
    width: small ? '100px' : '60%',
    aspectRatio: '3/4',
    background: t.surface,
    border: `1px solid ${t.border}`,
  }}>
    <span className="opacity-20" style={{ fontSize: small ? '32px' : '48px' }}>⚽</span>
  </div>
);

/**
 * Portrait with elegant fallback when FotMob image fails to load.
 * Shows a gradient silhouette instead of empty space or broken icon.
 */
const PortraitImage: React.FC<{ src: string; t: Theme; size?: 'large' | 'medium' | 'small' }> = ({ src, t, size = 'large' }) => {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="relative z-0 flex items-end justify-center" style={{
        width: size === 'small' ? '60%' : size === 'medium' ? '80%' : '85%',
        height: '90%',
      }}>
        <div className="w-full h-full flex items-end justify-center" style={{
          background: `radial-gradient(ellipse at center 80%, ${t.accent}10, transparent 60%)`,
        }}>
          <svg viewBox="0 0 100 140" className="h-[80%] opacity-30" fill="none">
            <circle cx="50" cy="35" r="18" fill={t.sub} fillOpacity="0.4" />
            <path d="M20 110 Q20 75 50 75 Q80 75 80 110 L80 140 L20 140 Z" fill={t.sub} fillOpacity="0.4" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="relative z-0 w-[85%] max-h-[90%] object-contain object-bottom"
      style={{ filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.7))' }}
      onError={() => setErrored(true)}
    />
  );
};

export default PlayerIntelV2Renderer;
