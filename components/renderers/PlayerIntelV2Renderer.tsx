/**
 * Player Intel V2 — Broadcast Renderer (Production)
 *
 * Premium broadcast variants with adaptive layouts:
 *  - premium_broadcast  (default — 16:9 hero card, adapts 6 → 30 stats)
 *  - tactical_board     (dense data grid)
 *  - magazine_profile   (large portrait + 4 big numbers)
 *  - compact_tv         (horizontal slim bar)
 *  - h2h_duel           (compare mode — split vs)
 *
 * Reads metric selection from playerIntelHeroMetricsJson / playerIntelSecondaryMetricsJson
 * fields (manual control), falls back to preset cardType, then to broadcastCards items.
 *
 * Image override (per-player local upload / direct URL / hidden) is honored
 * at top priority and reactively re-renders on change via window event subscription.
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
import { getImageOverride, resolveImageUrl, onImageOverrideChange, type ImageOverride } from '../player-intel-v2/playerIntelV2ImageStore';
import { chooseStatLayout, type StatLayoutMode } from '../player-intel-v2/playerIntelV2Layouts';

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES = {
  broadcast_dark: {
    bg: 'radial-gradient(ellipse at 70% 40%, rgba(15,30,60,1) 0%, rgba(11,17,32,1) 70%)',
    accent: '#00e5ff',
    accentRgb: '0,229,255',
    accent2: '#7c5cff',
    accentSoft: 'rgba(0,229,255,0.10)',
    surface: 'rgba(15,25,50,0.85)',
    surfaceLight: 'rgba(25,40,75,0.75)',
    surfaceDeep: 'rgba(8,14,28,0.95)',
    text: '#ffffff',
    sub: '#8899bb',
    dim: '#4a5568',
    border: 'rgba(60,90,140,0.45)',
    bgFlat: '#0b1120',
    win: '#22d3ee',
    success: '#22c55e',
  },
  barcelona_night: {
    bg: 'radial-gradient(ellipse at 70% 40%, rgba(40,10,60,1) 0%, rgba(13,5,32,1) 70%)',
    accent: '#ff2d55',
    accentRgb: '255,45,85',
    accent2: '#ffb800',
    accentSoft: 'rgba(255,45,85,0.10)',
    surface: 'rgba(30,10,50,0.85)',
    surfaceLight: 'rgba(50,20,80,0.75)',
    surfaceDeep: 'rgba(15,5,30,0.95)',
    text: '#ffffff',
    sub: '#c4b5fd',
    dim: '#6b4d8a',
    border: 'rgba(120,40,160,0.45)',
    bgFlat: '#0d0520',
    win: '#ff6b9d',
    success: '#22c55e',
  },
  clean_studio: {
    bg: 'radial-gradient(ellipse at 70% 40%, rgba(25,40,60,1) 0%, rgba(16,24,32,1) 70%)',
    accent: '#4d8dff',
    accentRgb: '77,141,255',
    accent2: '#00d9ff',
    accentSoft: 'rgba(77,141,255,0.10)',
    surface: 'rgba(25,35,55,0.85)',
    surfaceLight: 'rgba(40,55,80,0.75)',
    surfaceDeep: 'rgba(12,18,28,0.95)',
    text: '#ffffff',
    sub: '#aab8c6',
    dim: '#556677',
    border: 'rgba(70,95,130,0.45)',
    bgFlat: '#101820',
    win: '#60a5fa',
    success: '#22c55e',
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

  // ── Resolve final metrics ───────────────────────────────────────────────────
  const sourceA = parsedA || dataA;
  const sourceB = parsedB || dataB;

  const useManual = (heroKeysSel.length + secondaryKeysSel.length) > 0;

  const heroA: ResolvedMetric[] = useMemo(() => {
    if (useManual) return buildMetricsFromSelection(sourceA, heroKeysSel);
    if (cardType === 'custom') return [];
    return resolveMetrics(sourceA, cardType as CardType, 12, 0).heroMetrics;
  }, [sourceA, heroKeysSel, useManual, cardType]);

  const secondaryA: ResolvedMetric[] = useMemo(() => {
    if (useManual) return buildMetricsFromSelection(sourceA, secondaryKeysSel);
    if (cardType === 'custom') return [];
    return resolveMetrics(sourceA, cardType as CardType, 12, 24).secondaryMetrics;
  }, [sourceA, secondaryKeysSel, useManual, cardType]);

  const heroB: ResolvedMetric[] = useMemo(() => {
    if (mode !== 'compare') return [];
    if (useManual) return buildMetricsFromSelection(sourceB, heroKeysSel);
    if (cardType === 'custom') return [];
    return resolveMetrics(sourceB, cardType as CardType, 12, 0).heroMetrics;
  }, [sourceB, heroKeysSel, useManual, cardType, mode]);

  const metaA = useMemo(() => {
    const r = resolveMetrics(sourceA, cardType === 'custom' ? 'attacker_card' : (cardType as CardType), 0, 0);
    return r.meta;
  }, [sourceA, cardType]);
  const metaB = useMemo(() => {
    const r = resolveMetrics(sourceB, cardType === 'custom' ? 'attacker_card' : (cardType as CardType), 0, 0);
    return r.meta;
  }, [sourceB, cardType]);

  // imageVersion ticks whenever any override changes — forces re-derive
  const [imageVersion, setImageVersion] = useState(0);
  useEffect(() => onImageOverrideChange(() => setImageVersion((v) => v + 1)), []);

  const imageOverrideA = useMemo(
    () => getImageOverride(playerASlug),
    [playerASlug, imageVersion],
  );
  const imageOverrideB = useMemo(
    () => getImageOverride(playerBSlug),
    [playerBSlug, imageVersion],
  );
  const fallbackImageA = metaA.imageUrl || PLAYER_IMG_FALLBACK[playerASlug] || null;
  const fallbackImageB = metaB.imageUrl || PLAYER_IMG_FALLBACK[playerBSlug] || null;

  const imageA = useMemo(() => {
    const url = resolveImageUrl(imageOverrideA, fallbackImageA);
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_v=${imageOverrideA?.updatedAt || 0}`;
  }, [imageOverrideA, fallbackImageA]);

  const imageB = useMemo(() => {
    const url = resolveImageUrl(imageOverrideB, fallbackImageB);
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_v=${imageOverrideB?.updatedAt || 0}`;
  }, [imageOverrideB, fallbackImageB]);

  const actualVariant = mode === 'compare' && heroB.length > 0
    ? 'h2h_duel'
    : (visualVariant === 'h2h_duel' ? 'premium_broadcast' : visualVariant);

  const sourceCoverage = sourceA?.sourceCoverage || { fotmob: false, fbref: false };
  const cardTitleAr = cardType === 'custom' ? 'بطاقة مخصّصة' : cardArTitle(cardType.replace('_card', '').replace('_report', ''), cardArTitle(cardType));

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
    : (sourcePrefix ? `${sourcePrefix} · ${metaA.season || ''}` : null);

  const commonProps = {
    t, metaA, metaB, imageA, imageB,
    imageOverrideA, imageOverrideB,
    heroA, secondaryA, heroB,
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
  imageOverrideA?: ImageOverride | null;
  imageOverrideB?: ImageOverride | null;
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
// Adaptive layout: uses chooseStatLayout() to pick hero_cards / compact_grid / matrix / data_table
// based on selected stats count (1-6 / 7-12 / 13-20 / 21-30).

const PremiumBroadcastVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, imageOverrideA, heroA, secondaryA, showSources, showFooter, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  const allMetrics = useMemo(() => {
    const seen = new Set<string>();
    const out: ResolvedMetric[] = [];
    for (const m of [...heroA, ...secondaryA]) {
      if (seen.has(m.key)) continue;
      seen.add(m.key);
      out.push(m);
    }
    return out;
  }, [heroA, secondaryA]);

  const totalStats = allMetrics.length;
  const layout = chooseStatLayout(totalStats, 'premium_broadcast', false);
  const imageHidden = imageOverrideA?.mode === 'hidden';
  const portraitWidth = imageHidden ? '0%' : (layout === 'data_table' ? '22%' : '28%');

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: t.bg, aspectRatio: '16/9' }}>
      {/* Glows */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-25"
        style={{ background: t.accent }} />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15"
        style={{ background: t.accent2 }} />

      {/* Diagonal stripe accent */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{
        background: `linear-gradient(to right, transparent, ${t.accent}, transparent)`,
      }} />

      <div className="absolute inset-0 flex" dir="rtl">
        {/* Right: Portrait */}
        {!imageHidden && (
          <div className="h-full relative flex items-end justify-center transition-all" style={{ width: portraitWidth }}>
            <div className="absolute bottom-0 left-0 right-0 h-[35%] z-10 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${t.bgFlat}, transparent)` }} />
            {imageA ? (
              <PortraitImage src={imageA} t={t} override={imageOverrideA} />
            ) : (
              <ImagePlaceholder t={t} />
            )}
          </div>
        )}

        {/* Left: Content */}
        <div className="flex-1 flex flex-col justify-between px-[3%] py-[2.5%]">
          {/* Header: badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <CardBadge t={t} text={cardTitleAr} />
            {scopeLabel && <ScopeBadge t={t} text={scopeLabel} />}
          </div>

          {/* Identity */}
          <div className="my-2">
            <PlayerIdentity t={t} meta={metaA} large={layout === 'hero_cards'} />
          </div>

          {/* Stats area — layout-aware */}
          <div className="flex-1 min-h-0 flex items-stretch">
            {totalStats === 0 ? (
              <NoData t={t} />
            ) : (
              <StatsBlock metrics={allMetrics} layout={layout} t={t} variant="premium" />
            )}
          </div>

          {/* Footer row */}
          <div className="flex items-end justify-between gap-2 mt-2">
            {showSources ? <SourceBadges sourceCoverage={sourceCoverage} /> : <span />}
            <span className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: t.dim }}>
              {totalStats} stats · {layout.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {showFooter && <Footer t={t} />}
    </div>
  );
};

// ─── 2. Tactical Data Board ───────────────────────────────────────────────────

const TacticalBoardVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, imageOverrideA, heroA, secondaryA, showSources, showFooter, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  const allMetrics = useMemo(() => {
    const seen = new Set<string>();
    const out: ResolvedMetric[] = [];
    for (const m of [...heroA, ...secondaryA]) {
      if (seen.has(m.key)) continue;
      seen.add(m.key);
      out.push(m);
    }
    return out;
  }, [heroA, secondaryA]);
  const totalStats = allMetrics.length;
  const layout = chooseStatLayout(totalStats, 'tactical_board', false);
  const imageHidden = imageOverrideA?.mode === 'hidden';

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: t.bg, aspectRatio: '16/9' }}>
      <div className="absolute top-0 right-0 left-0 h-1" style={{
        background: `linear-gradient(to right, ${t.accent}, ${t.accent2})`,
      }} />

      <div className="absolute inset-0 grid" dir="rtl"
        style={{ gridTemplateColumns: imageHidden ? '1fr' : '22% 1fr' }}>
        {/* Left rail: small portrait + identity */}
        {!imageHidden && (
          <div className="border-l flex flex-col" style={{ borderColor: t.border, background: t.surfaceDeep }}>
            <div className="flex-1 flex items-center justify-center p-3 relative">
              {imageA ? (
                <img
                  key={imageA}
                  src={imageA}
                  alt=""
                  className="max-w-full max-h-[240px]"
                  style={{
                    objectFit: imageOverrideA?.objectFit === 'cover' ? 'cover' : 'contain',
                    objectPosition: imageOverrideA?.position || 'center',
                    opacity: typeof imageOverrideA?.opacity === 'number' ? imageOverrideA.opacity : 1,
                    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
                  }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                />
              ) : <ImagePlaceholder t={t} small />}
            </div>
            <div className="p-3 border-t space-y-1.5" style={{ borderColor: t.border }}>
              <CardBadge t={t} text={cardTitleAr} small />
              <div className="text-[20px] font-black leading-tight" style={{ color: t.text }}>{metaA.player || '—'}</div>
              <div className="text-[11px]" style={{ color: t.sub }}>{metaA.club}</div>
              <div className="text-[10px]" style={{ color: t.dim }}>{metaA.position} · {metaA.season}</div>
              {scopeLabel && (
                <div className="text-[9px] font-mono pt-1.5 border-t" style={{ color: t.accent, borderColor: t.border, opacity: 0.85 }}>
                  {scopeLabel}
                </div>
              )}
              {showSources && <div className="pt-1.5"><SourceBadges sourceCoverage={sourceCoverage} /></div>}
            </div>
          </div>
        )}

        {/* Right: dense grid */}
        <div className="p-4 flex flex-col gap-2 min-h-0">
          {imageHidden && (
            <div className="flex items-center gap-3 mb-2">
              <CardBadge t={t} text={cardTitleAr} />
              <div className="text-[22px] font-black" style={{ color: t.text }}>{metaA.player}</div>
              <span className="text-[12px]" style={{ color: t.sub }}>· {metaA.club}</span>
              {scopeLabel && <ScopeBadge t={t} text={scopeLabel} />}
            </div>
          )}
          {totalStats === 0 ? (
            <NoData t={t} />
          ) : (
            <div className="flex-1 min-h-0">
              <StatsBlock metrics={allMetrics} layout={layout} t={t} variant="tactical" />
            </div>
          )}
        </div>
      </div>
      {showFooter && <Footer t={t} />}
    </div>
  );
};

// ─── 3. Magazine Player Profile ───────────────────────────────────────────────

const MagazineProfileVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, imageOverrideA, heroA, secondaryA, showSources, showFooter, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  const featured = useMemo(() => {
    const seen = new Set<string>();
    const out: ResolvedMetric[] = [];
    for (const m of [...heroA, ...secondaryA]) {
      if (seen.has(m.key)) continue;
      seen.add(m.key);
      out.push(m);
      if (out.length >= 4) break;
    }
    return out;
  }, [heroA, secondaryA]);

  return (
    <div className="w-full h-full relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${t.bgFlat} 0%, ${t.surface} 100%)`, aspectRatio: '16/9' }}>
      {/* Vertical accent bars */}
      <div className="absolute top-0 right-0 w-[8px] h-full" style={{ background: t.accent }} />
      <div className="absolute top-0 right-[20px] w-[2px] h-full opacity-30" style={{ background: t.accent2 }} />

      {/* Massive number watermark */}
      <div className="absolute top-[10%] left-[8%] text-[280px] font-black opacity-[0.04] leading-none select-none pointer-events-none"
        style={{ color: t.accent }}>
        {featured[0]?.formattedValue || '—'}
      </div>

      <div className="absolute inset-0 flex" dir="rtl">
        {/* Right: Big portrait */}
        <div className="w-[42%] h-full relative">
          <div className="absolute inset-0 flex items-end justify-center">
            {imageA ? (
              <img
                key={imageA}
                src={imageA}
                alt=""
                className="w-[95%] max-h-[100%]"
                style={{
                  objectFit: imageOverrideA?.objectFit === 'cover' ? 'cover' : 'contain',
                  objectPosition: imageOverrideA?.position === 'top' ? 'top' : imageOverrideA?.position === 'center' ? 'center' : 'bottom',
                  opacity: typeof imageOverrideA?.opacity === 'number' ? imageOverrideA.opacity : 1,
                  filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.8))',
                }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
              />
            ) : <ImagePlaceholder t={t} />}
          </div>
          <div className="absolute top-[6%] right-[4%]">
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
          <h1 className="text-[60px] font-black leading-[0.95] mb-2 tracking-tight" style={{ color: t.text }}>
            {metaA.player || '—'}
          </h1>
          <div className="text-[15px] mb-6 font-bold" style={{ color: t.sub }}>
            {metaA.club} · {metaA.position}
          </div>
          {scopeLabel && (
            <div className="text-[11px] mb-6 font-mono opacity-80 inline-flex self-start px-2 py-1 rounded"
              style={{ color: t.accent, background: t.accentSoft, border: `1px solid ${t.border}` }}>
              {scopeLabel}
            </div>
          )}

          {featured.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {featured.map((m) => (
                <div key={m.key}>
                  <div className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: t.dim }}>
                    {m.labelAr || m.label}
                  </div>
                  <div className="text-[44px] font-black leading-none" style={{ color: t.text }}>
                    {m.formattedValue}
                  </div>
                  {m.rank !== null && (
                    <div className="flex items-center gap-1.5 mt-2 max-w-[180px]">
                      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: `${t.accent}20` }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(m.rank, 100)}%`, background: t.accent }} />
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: t.accent }}>
                        Top {Math.round(100 - m.rank)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <NoData t={t} />}

          {showSources && <div className="mt-6"><SourceBadges sourceCoverage={sourceCoverage} /></div>}
        </div>
      </div>
      {showFooter && <Footer t={t} />}
    </div>
  );
};

// ─── 4. Compact TV Overlay (horizontal slim bar) ──────────────────────────────

const CompactTVVariant: React.FC<VariantProps> = ({
  t, metaA, imageA, imageOverrideA, heroA, secondaryA, showSources, sourceCoverage, cardTitleAr, scopeLabel,
}) => {
  const allMetrics = useMemo(() => {
    const seen = new Set<string>();
    const out: ResolvedMetric[] = [];
    for (const m of [...heroA, ...secondaryA]) {
      if (seen.has(m.key)) continue;
      seen.add(m.key);
      out.push(m);
    }
    return out.slice(0, 7);
  }, [heroA, secondaryA]);
  const imageHidden = imageOverrideA?.mode === 'hidden';

  return (
    <div className="w-full h-full flex items-end justify-center" style={{ background: 'transparent', aspectRatio: '16/9' }}>
      <div className="w-full" style={{
        background: `linear-gradient(to right, ${t.bgFlat}ee, ${t.surface}ee)`,
        borderTop: `2px solid ${t.accent}`,
        boxShadow: `0 -10px 40px rgba(${t.accentRgb},0.15)`,
      }}>
        <div className="flex items-stretch" dir="rtl" style={{ minHeight: '120px' }}>
          {/* Player image */}
          {!imageHidden && (
            <div className="w-[120px] flex-shrink-0 relative overflow-hidden" style={{ background: t.surfaceLight }}>
              {imageA ? (
                <img
                  key={imageA}
                  src={imageA}
                  alt=""
                  className="absolute bottom-0 w-full h-full"
                  style={{
                    objectFit: imageOverrideA?.objectFit === 'cover' ? 'cover' : 'contain',
                    objectPosition: imageOverrideA?.position || 'bottom',
                    opacity: typeof imageOverrideA?.opacity === 'number' ? imageOverrideA.opacity : 1,
                  }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[40px] opacity-20">⚽</div>
              )}
            </div>
          )}

          {/* Identity */}
          <div className="px-4 py-2 flex flex-col justify-center min-w-[230px] border-l" style={{ borderColor: t.border }}>
            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: t.accent }}>{cardTitleAr}</div>
            <div className="text-[22px] font-black leading-tight" style={{ color: t.text }}>{metaA.player || '—'}</div>
            <div className="text-[11px]" style={{ color: t.sub }}>{metaA.club} · {metaA.position}</div>
            {scopeLabel && <div className="text-[9px] font-mono mt-0.5" style={{ color: t.dim }}>{scopeLabel}</div>}
          </div>

          {/* Metrics row */}
          <div className="flex-1 flex items-stretch">
            {allMetrics.map((m, i) => (
              <div key={m.key} className="flex-1 flex flex-col justify-center px-3 border-l min-w-[80px]"
                style={{ borderColor: i === 0 ? 'transparent' : t.border }}>
                <div className="text-[9px] uppercase tracking-wide truncate" style={{ color: t.dim }}>
                  {m.labelAr || m.label}
                </div>
                <div className="text-[24px] font-black leading-none mt-0.5" style={{ color: t.text }}>
                  {m.formattedValue}
                </div>
                {m.rank !== null && (
                  <div className="text-[8px] font-mono mt-0.5" style={{ color: t.accent }}>{Math.round(m.rank)}%</div>
                )}
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
  t, metaA, metaB, imageA, imageB, imageOverrideA, imageOverrideB,
  heroA, heroB, showFooter, sourceCoverage, cardTitleAr, showSources, scopeLabel,
}) => {
  const pairs = useMemo(() => {
    const bMap = new Map(heroB.map((m) => [m.key, m]));
    const out = heroA.map((a) => ({ a, b: bMap.get(a.key) || null }));
    // Append B-only metrics at the end
    for (const b of heroB) {
      if (!heroA.find((a) => a.key === b.key)) {
        out.push({ a: { ...b, formattedValue: '—', value: '' } as ResolvedMetric, b });
      }
    }
    return out.slice(0, 10);
  }, [heroA, heroB]);

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: t.bg, aspectRatio: '16/9' }}>
      <div className="absolute top-0 right-0 left-0 h-[3px]" style={{
        background: `linear-gradient(to right, ${t.accent}, transparent, ${t.accent2})`,
      }} />

      <div className="absolute inset-0 flex" dir="ltr">
        {/* Left: Player A */}
        <PlayerSidePanel side="left" t={t} meta={metaA} image={imageA} override={imageOverrideA} />

        {/* Center: VS + metrics */}
        <div className="flex-1 flex flex-col items-stretch justify-center px-3 py-6 gap-2 relative">
          <div className="text-center mb-2">
            <div className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: t.accent }}>{cardTitleAr}</div>
            <div className="text-[44px] font-black leading-none mt-1" style={{
              color: t.text, textShadow: `0 0 30px ${t.accent}`,
            }}>VS</div>
            {scopeLabel && (
              <div className="text-[9px] mt-1.5 font-mono inline-block px-2 py-0.5 rounded"
                style={{ color: t.dim, background: t.accentSoft }}>{scopeLabel}</div>
            )}
          </div>

          {pairs.length > 0 ? (
            <div className="space-y-1.5 overflow-y-auto">
              {pairs.map(({ a, b }) => (
                <DuelRow key={a.key} a={a} b={b} t={t} />
              ))}
            </div>
          ) : <NoData t={t} />}

          {showSources && <div className="mt-2 flex justify-center"><SourceBadges sourceCoverage={sourceCoverage} /></div>}
        </div>

        {/* Right: Player B */}
        <PlayerSidePanel side="right" t={t} meta={metaB} image={imageB} override={imageOverrideB} />
      </div>

      {showFooter && <Footer t={t} />}
    </div>
  );
};

const PlayerSidePanel: React.FC<{
  side: 'left' | 'right';
  t: Theme;
  meta: VariantProps['metaA'];
  image: string | null;
  override?: ImageOverride | null;
}> = ({ t, meta, image, override }) => {
  const hidden = override?.mode === 'hidden';
  return (
    <div className="w-[28%] flex flex-col items-center justify-center relative px-4 py-6">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at center, ${t.accentSoft}, transparent 70%)`,
      }} />
      {!hidden && image ? (
        <img
          key={image}
          src={image}
          alt=""
          className="relative z-10 max-h-[55%]"
          style={{
            objectFit: override?.objectFit === 'cover' ? 'cover' : 'contain',
            objectPosition: override?.position || 'center',
            opacity: typeof override?.opacity === 'number' ? override.opacity : 1,
            filter: 'drop-shadow(0 12px 36px rgba(0,0,0,0.7))',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
        />
      ) : !hidden ? <ImagePlaceholder t={t} /> : <span className="text-[40px] opacity-20">⚽</span>}
      <div className="relative z-10 text-center mt-4">
        <div className="text-[26px] font-black leading-tight" style={{ color: t.text }}>{meta.player || '—'}</div>
        <div className="text-[12px] mt-0.5" style={{ color: t.sub }}>{meta.club}</div>
        {meta.position && <div className="text-[10px] mt-0.5" style={{ color: t.dim }}>{meta.position}</div>}
      </div>
    </div>
  );
};

// ─── Adaptive Stats Block (handles all layout modes) ──────────────────────────

interface StatsBlockProps {
  metrics: ResolvedMetric[];
  layout: StatLayoutMode;
  t: Theme;
  variant: 'premium' | 'tactical';
}

const StatsBlock: React.FC<StatsBlockProps> = ({ metrics, layout, t, variant }) => {
  if (metrics.length === 0) return <NoData t={t} />;

  // 1-6 stats: hero cards (large, prominent)
  if (layout === 'hero_cards') {
    const cols = Math.min(metrics.length, 3);
    return (
      <div className="grid gap-3 w-full self-center" style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
      }}>
        {metrics.map((m) => <HeroStatLarge key={m.key} m={m} t={t} />)}
      </div>
    );
  }

  // 7-12 stats: top-row hero (4) + secondary grid
  if (layout === 'compact_grid') {
    const top = metrics.slice(0, 4);
    const rest = metrics.slice(4);
    return (
      <div className="w-full flex flex-col gap-2 self-center">
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${top.length}, 1fr)` }}>
          {top.map((m) => <CompactStat key={m.key} m={m} t={t} />)}
        </div>
        {rest.length > 0 && (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(rest.length, 4)}, 1fr)` }}>
            {rest.map((m) => <SecondaryStat key={m.key} m={m} t={t} />)}
          </div>
        )}
      </div>
    );
  }

  // 13-20 stats: 5-column matrix
  if (layout === 'matrix') {
    return (
      <div className="grid gap-1.5 w-full self-center" style={{
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridAutoRows: variant === 'tactical' ? '1fr' : 'auto',
      }}>
        {metrics.slice(0, 20).map((m) => <DenseStatCell key={m.key} m={m} t={t} />)}
      </div>
    );
  }

  // 21-30 stats: data table mode (6 col compact)
  return (
    <div className="grid gap-1 w-full self-center" style={{
      gridTemplateColumns: 'repeat(6, 1fr)',
    }}>
      {metrics.slice(0, 30).map((m) => <MicroStat key={m.key} m={m} t={t} />)}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CardBadge: React.FC<{ t: Theme; text: string; small?: boolean }> = ({ t, text, small }) => (
  <span className="inline-flex self-start font-black uppercase tracking-[0.15em] rounded-md"
    style={{
      background: t.accentSoft, color: t.accent, border: `1px solid ${t.accent}40`,
      padding: small ? '2px 8px' : '4px 12px',
      fontSize: small ? '10px' : '12px',
    }}>
    {text}
  </span>
);

const ScopeBadge: React.FC<{ t: Theme; text: string }> = ({ t, text }) => (
  <span className="inline-flex items-center gap-1.5 font-bold rounded-md px-2.5 py-1"
    style={{
      background: 'rgba(255,255,255,0.04)',
      color: t.sub,
      border: `1px solid ${t.border}`,
      fontSize: '10px',
    }}>
    <span style={{ width: 5, height: 5, background: t.success, borderRadius: '50%' }} />
    {text}
  </span>
);

const PlayerIdentity: React.FC<{ t: Theme; meta: VariantProps['metaA']; large?: boolean }> = ({ t, meta, large }) => (
  <>
    <h1 className="font-black leading-[1.05] tracking-tight" style={{
      color: t.text, fontSize: large ? '42px' : '32px',
    }}>{meta.player || '—'}</h1>
    <div className="flex items-center gap-2 text-[14px] mt-1" style={{ color: t.sub }}>
      {meta.club && <span className="font-bold">{meta.club}</span>}
      {meta.position && <><span style={{ opacity: 0.4 }}>|</span><span>{meta.position}</span></>}
      {meta.season && <><span style={{ opacity: 0.4 }}>|</span><span className="font-mono text-[12px]">{meta.season}</span></>}
    </div>
  </>
);

const HeroStatLarge: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-xl p-4 relative overflow-hidden" style={{
    background: `linear-gradient(135deg, ${t.surface} 0%, ${t.surfaceDeep} 100%)`,
    border: `1px solid ${t.border}`,
    boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 ${t.accent}15`,
  }}>
    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
      background: `linear-gradient(to right, transparent, ${t.accent}, transparent)`,
    }} />
    <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5 truncate" style={{ color: t.sub }}>
      {m.labelAr || m.label}
    </div>
    <div className="text-[34px] font-black leading-none tracking-tight" style={{ color: t.text }}>
      {m.formattedValue}
    </div>
    {m.rank !== null && (
      <div className="flex items-center gap-1.5 mt-2.5">
        <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: `${t.accent}15` }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(m.rank, 100)}%`, background: t.accent }} />
        </div>
        <span className="text-[9px] font-mono font-bold" style={{ color: t.accent }}>{Math.round(m.rank)}%</span>
      </div>
    )}
  </div>
);

const CompactStat: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-lg px-3 py-2.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
    <div className="text-[10px] font-bold uppercase tracking-wide mb-1 truncate" style={{ color: t.sub }}>
      {m.labelAr || m.label}
    </div>
    <div className="text-[24px] font-black leading-none" style={{ color: t.text }}>{m.formattedValue}</div>
    {m.rank !== null && (
      <div className="flex-1 h-[2px] rounded-full overflow-hidden mt-1.5" style={{ background: `${t.accent}15` }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(m.rank, 100)}%`, background: t.accent }} />
      </div>
    )}
  </div>
);

const SecondaryStat: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-md px-2.5 py-1.5" style={{ background: `${t.surface}80`, border: `1px solid ${t.border}` }}>
    <div className="text-[8px] uppercase tracking-wide truncate" style={{ color: t.dim }}>{m.labelAr || m.label}</div>
    <div className="text-[16px] font-black leading-tight" style={{ color: t.text }}>{m.formattedValue}</div>
  </div>
);

const DenseStatCell: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-lg px-2.5 py-2 flex flex-col justify-between min-h-[60px]"
    style={{ background: t.surface, border: `1px solid ${t.border}` }}>
    <div className="text-[9px] uppercase tracking-wide truncate leading-tight" style={{ color: t.sub }}>
      {m.labelAr || m.label}
    </div>
    <div className="flex items-baseline justify-between gap-1 mt-1">
      <div className="text-[18px] font-black" style={{ color: t.text }}>{m.formattedValue}</div>
      {m.rank !== null && (
        <span className="text-[8px] font-mono font-bold" style={{ color: t.accent }}>{Math.round(m.rank)}%</span>
      )}
    </div>
  </div>
);

const MicroStat: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded px-1.5 py-1" style={{ background: `${t.surface}60`, border: `1px solid ${t.border}80` }}>
    <div className="text-[8px] uppercase tracking-wide truncate leading-tight" style={{ color: t.dim }}>
      {m.labelAr || m.label}
    </div>
    <div className="flex items-baseline justify-between gap-1">
      <div className="text-[13px] font-black leading-tight" style={{ color: t.text }}>{m.formattedValue}</div>
      {m.rank !== null && <span className="text-[7px] font-mono" style={{ color: t.accent }}>{Math.round(m.rank)}</span>}
    </div>
  </div>
);

const DuelRow: React.FC<{ a: ResolvedMetric; b: ResolvedMetric | null; t: Theme }> = ({ a, b, t }) => {
  const aNum = typeof a.value === 'number' ? a.value : parseFloat(String(a.value));
  const bNum = b && typeof b.value === 'number' ? b.value : (b ? parseFloat(String(b.value)) : NaN);
  const aWins = !isNaN(aNum) && !isNaN(bNum) && aNum > bNum;
  const bWins = !isNaN(aNum) && !isNaN(bNum) && bNum > aNum;
  const total = (aNum || 0) + (bNum || 0);
  const aPct = total > 0 ? (aNum / total) * 100 : 50;
  const bPct = 100 - aPct;

  return (
    <div className="rounded-lg px-2 py-1.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right">
          <span className="text-[20px] font-black" style={{
            color: aWins ? t.win : t.text,
            textShadow: aWins ? `0 0 12px ${t.win}` : 'none',
          }}>{a.formattedValue || '—'}</span>
        </div>
        <div className="text-[9px] font-bold uppercase tracking-wide text-center px-2" style={{ color: t.dim }}>
          {a.labelAr || a.label}
        </div>
        <div className="text-left">
          <span className="text-[20px] font-black" style={{
            color: bWins ? t.win : t.text,
            textShadow: bWins ? `0 0 12px ${t.win}` : 'none',
          }}>{b ? b.formattedValue : '—'}</span>
        </div>
      </div>
      {!isNaN(aNum) && !isNaN(bNum) && total > 0 && (
        <div className="flex h-[2px] rounded-full overflow-hidden mt-1.5">
          <div style={{ width: `${aPct}%`, background: aWins ? t.win : t.dim }} />
          <div style={{ width: `${bPct}%`, background: bWins ? t.win : t.dim, opacity: bWins ? 1 : 0.4 }} />
        </div>
      )}
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
  <div className="rounded-xl px-6 py-6 text-center w-full self-center" style={{
    background: t.surface, border: `1px dashed ${t.border}`,
  }}>
    <p className="text-[14px]" style={{ color: t.sub }}>اختر إحصائيات من لوحة التحكم</p>
    <p className="text-[10px] mt-1" style={{ color: t.dim }}>اختر preset أو أضف إحصائيات يدويًا</p>
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
 * Portrait with elegant fallback when image fails to load.
 * Honors override fit/position/opacity.
 */
const PortraitImage: React.FC<{
  src: string;
  t: Theme;
  size?: 'large' | 'medium' | 'small';
  override?: ImageOverride | null;
}> = ({ src, t, size = 'large', override }) => {
  const [errored, setErrored] = useState(false);

  useEffect(() => { setErrored(false); }, [src]);

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

  const fit = override?.objectFit || 'contain';
  const pos = override?.position || 'bottom';

  return (
    <img
      key={src}
      src={src}
      alt=""
      className="relative z-0 w-[88%] max-h-[92%]"
      style={{
        objectFit: fit,
        objectPosition: pos,
        opacity: typeof override?.opacity === 'number' ? override.opacity : 1,
        filter: 'drop-shadow(0 14px 44px rgba(0,0,0,0.75))',
      }}
      onError={() => setErrored(true)}
    />
  );
};

export default PlayerIntelV2Renderer;
