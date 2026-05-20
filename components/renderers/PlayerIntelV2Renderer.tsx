/**
 * Player Intel V2 — Broadcast Renderer (Production)
 *
 * Reads broadcast.json dynamically from public/player-intel-v2-samples/.
 * Supports dynamic player registry (not hardcoded 3 players).
 * Uses clean Arabic labels (no mojibake).
 * Broadcast-quality 16:9 design.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { RendererProps } from './SharedComponents';
import {
  resolveMetrics,
  type CardType,
  type ResolvedData,
  type ResolvedMetric,
} from '../player-intel-v2/playerIntelV2MetricResolver';
import type { PlayerIntelMasterFull } from '../player-intel-v2/playerIntelV2Types';

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES = {
  broadcast_dark: {
    bg: '#0b1120',
    bgGrad: 'radial-gradient(ellipse at 70% 50%, rgba(15,30,60,1) 0%, rgba(11,17,32,1) 70%)',
    accent: '#00e5ff',
    accentSoft: 'rgba(0,229,255,0.08)',
    surface: 'rgba(15,25,50,0.85)',
    text: '#ffffff',
    sub: '#8899bb',
    dim: '#4a5568',
    border: 'rgba(50,70,100,0.4)',
  },
  barcelona_night: {
    bg: '#0d0520',
    bgGrad: 'radial-gradient(ellipse at 70% 50%, rgba(40,10,60,1) 0%, rgba(13,5,32,1) 70%)',
    accent: '#ff2d55',
    accentSoft: 'rgba(255,45,85,0.08)',
    surface: 'rgba(30,10,50,0.85)',
    text: '#ffffff',
    sub: '#b8a0d0',
    dim: '#6b4d8a',
    border: 'rgba(80,30,120,0.4)',
  },
  clean_studio: {
    bg: '#101820',
    bgGrad: 'radial-gradient(ellipse at 70% 50%, rgba(25,40,60,1) 0%, rgba(16,24,32,1) 70%)',
    accent: '#4d8dff',
    accentSoft: 'rgba(77,141,255,0.08)',
    surface: 'rgba(25,35,55,0.85)',
    text: '#ffffff',
    sub: '#8899aa',
    dim: '#556677',
    border: 'rgba(60,80,110,0.4)',
  },
} as const;

type ThemeKey = keyof typeof THEMES;
type Theme = typeof THEMES.broadcast_dark;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLES_BASE = '/player-intel-v2-samples';

async function loadBroadcast(slug: string): Promise<PlayerIntelMasterFull | null> {
  try {
    const r = await fetch(`${SAMPLES_BASE}/${slug}.broadcast.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as PlayerIntelMasterFull;
  } catch { return null; }
}

interface RegistryPlayer { id: string; name: string; club: string; file: string; }

async function loadRegistry(): Promise<RegistryPlayer[]> {
  try {
    const r = await fetch(`${SAMPLES_BASE}/index.json`, { cache: 'no-store' });
    if (!r.ok) return [];
    const data = await r.json();
    return (data?.players || []) as RegistryPlayer[];
  } catch { return []; }
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export const PlayerIntelV2Renderer: React.FC<RendererProps> = ({ config, getField, isEditor }) => {
  const sampleSlug = String(getField('samplePlayer') || 'lamine-yamal');
  const pastedJson = String(getField('masterJson') || '');
  const cardType = (String(getField('cardType') || 'attacker_card')) as CardType;
  const heroCount = Number(getField('heroMetricsCount') || 4);
  const secondaryCount = Number(getField('secondaryMetricsCount') || 4);
  const showSources = getField('showSources') !== false;
  const showFooter = getField('showFooter') !== false;
  const themeKey = (String(getField('visualTheme') || 'broadcast_dark')) as ThemeKey;
  const t = THEMES[themeKey] || THEMES.broadcast_dark;

  // Registry for dynamic player list (used in editor panel)
  const [registry, setRegistry] = useState<RegistryPlayer[]>([]);
  const [data, setData] = useState<PlayerIntelMasterFull | null>(null);

  // Pasted JSON
  const parsedFull = useMemo<PlayerIntelMasterFull | null>(() => {
    if (!pastedJson || pastedJson.length < 100) return null;
    try { return JSON.parse(pastedJson) as PlayerIntelMasterFull; } catch { return null; }
  }, [pastedJson]);

  // Load registry
  useEffect(() => { loadRegistry().then(setRegistry); }, []);

  // Load broadcast data
  useEffect(() => {
    if (parsedFull) { setData(null); return; }
    let m = true;
    loadBroadcast(sampleSlug).then((d) => { if (m) setData(d); });
    return () => { m = false; };
  }, [sampleSlug, parsedFull]);

  // Update samplePlayer options dynamically in editor
  useEffect(() => {
    if (!isEditor || registry.length === 0) return;
    const field = config.fields.find((f) => f.id === 'samplePlayer');
    if (field && Array.isArray(field.options)) {
      const newOpts = registry.map((p) => ({ label: `${p.name} — ${p.club}`, value: p.id }));
      if (JSON.stringify(field.options) !== JSON.stringify(newOpts)) {
        field.options = newOpts;
      }
    }
  }, [registry, isEditor, config.fields]);

  // Resolve
  const resolved: ResolvedData = useMemo(() => {
    const source = parsedFull || data;
    return resolveMetrics(source, cardType, heroCount, secondaryCount);
  }, [parsedFull, data, cardType, heroCount, secondaryCount]);

  const { meta, heroMetrics, secondaryMetrics, sourceCoverage } = resolved;
  const hasData = heroMetrics.length > 0;

  // Image
  const imageUrl = useMemo(() => {
    if (meta.imageUrl) return meta.imageUrl;
    const d2 = parsedFull || data;
    const img = (d2 as Record<string, unknown> | null)?.images;
    if (img && typeof img === 'object' && 'playerImage' in (img as object)) {
      return (img as Record<string, string>).playerImage;
    }
    // Fallback known IDs
    const map: Record<string, string> = {
      'lamine-yamal': 'https://images.fotmob.com/image_resources/playerimages/1467236.png',
      'robert-lewandowski': 'https://images.fotmob.com/image_resources/playerimages/93447.png',
      'cole-palmer': 'https://images.fotmob.com/image_resources/playerimages/1096353.png',
    };
    return map[sampleSlug] || null;
  }, [meta.imageUrl, parsedFull, data, sampleSlug]);

  return (
    <div className="w-full h-full relative overflow-hidden" style={{
      fontFamily: "'Tajawal', sans-serif",
      background: t.bgGrad,
      aspectRatio: '16/9',
    }}>
      {/* Subtle accent glow */}
      <div className="absolute top-0 right-0 w-[50%] h-[60%] opacity-20 blur-[100px] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${t.accentSoft}, transparent 70%)` }} />

      <div className="absolute inset-0 flex" dir="rtl">
        {/* ─── Right: Player Image ─── */}
        <div className="w-[28%] h-full relative flex items-end justify-center overflow-hidden">
          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-[40%] z-10 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${t.bg}, transparent)` }} />
          {imageUrl ? (
            <img src={imageUrl} alt="" className="relative z-0 w-[90%] max-h-[92%] object-contain object-bottom"
              style={{ filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.6))' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
          ) : (
            <div className="w-[60%] aspect-[3/4] rounded-2xl mb-8 flex items-center justify-center"
              style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <span className="text-4xl opacity-20">⚽</span>
            </div>
          )}
        </div>

        {/* ─── Left: Content ─── */}
        <div className="flex-1 flex flex-col justify-center px-[3.5%] py-[2.5%]">
          {/* Badge */}
          <div className="inline-flex self-start px-3 py-1 rounded-md mb-3 text-[12px] font-black uppercase tracking-[0.15em]"
            style={{ background: t.accentSoft, color: t.accent, border: `1px solid ${t.accent}30` }}>
            {meta.cardTitleAr}
          </div>

          {/* Name */}
          <h1 className="text-[38px] font-black leading-[1.05] mb-1" style={{ color: t.text }}>
            {meta.player || '—'}
          </h1>

          {/* Sub info */}
          <div className="flex items-center gap-2 text-[14px] mb-5" style={{ color: t.sub }}>
            {meta.club && <span className="font-bold">{meta.club}</span>}
            {meta.position && <><span style={{ opacity: 0.4 }}>|</span><span>{meta.position}</span></>}
            {meta.season && <><span style={{ opacity: 0.4 }}>|</span><span className="font-mono text-[12px]">{meta.season}</span></>}
          </div>

          {/* Hero Metrics */}
          {hasData ? (
            <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: `repeat(${Math.min(heroMetrics.length, 3)}, 1fr)` }}>
              {heroMetrics.slice(0, 6).map((m) => <HeroStat key={m.key} m={m} t={t} />)}
            </div>
          ) : (
            <div className="rounded-xl px-4 py-6 text-center mb-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <p className="text-[14px]" style={{ color: t.sub }}>لا توجد بيانات — اختر لاعبًا أو الصق Master JSON</p>
            </div>
          )}

          {/* Secondary Metrics */}
          {secondaryMetrics.length > 0 && (
            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(secondaryMetrics.length, 4)}, 1fr)` }}>
              {secondaryMetrics.map((m) => <SecondaryStat key={m.key} m={m} t={t} />)}
            </div>
          )}

          {/* Sources */}
          {showSources && hasData && (
            <div className="flex items-center gap-2 mt-auto">
              {sourceCoverage.fotmob && <SourceBadge label="FotMob" color="#22c55e" />}
              {sourceCoverage.fbref && <SourceBadge label="FBref" color="#3b82f6" />}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="absolute bottom-0 inset-x-0 h-7 flex items-center justify-center"
          style={{ background: `linear-gradient(to top, rgba(0,0,0,0.6), transparent)` }}>
          <span className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: t.dim }}>
            REO DATA FABRIC • PLAYER INTEL V2
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const HeroStat: React.FC<{ m: ResolvedMetric; t: Theme }> = ({ m, t }) => (
  <div className="rounded-xl px-3.5 py-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
    <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5 truncate" style={{ color: t.sub }}>
      {m.labelAr || m.label}
    </div>
    <div className="text-[28px] font-black leading-none" style={{ color: t.text }}>
      {m.formattedValue}
    </div>
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

const SourceBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
    background: `${color}15`, color, border: `1px solid ${color}30`,
  }}>
    {label} ✓
  </span>
);

export default PlayerIntelV2Renderer;
