/**
 * Player Intel V2 — Broadcast Renderer
 *
 * Professional broadcast card that reads real metric data from broadcast.json
 * samples or pasted master JSON. Shows actual stats, not empty placeholders.
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

// ─── Visual themes ────────────────────────────────────────────────────────────

const VISUAL_THEMES = {
  broadcast_dark: {
    bg: 'linear-gradient(145deg, #0a0e1a 0%, #0f1629 40%, #111d35 100%)',
    accent: '#22d3ee',
    accentDim: 'rgba(34,211,238,0.12)',
    cardBg: 'rgba(15,23,42,0.92)',
    heroCardBg: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))',
    text: '#f1f5f9',
    muted: '#94a3b8',
    dim: '#475569',
    border: 'rgba(51,65,85,0.5)',
    glow: 'rgba(34,211,238,0.08)',
  },
  barcelona_night: {
    bg: 'linear-gradient(145deg, #1a0a2e 0%, #2d1040 40%, #15082a 100%)',
    accent: '#ff3366',
    accentDim: 'rgba(255,51,102,0.12)',
    cardBg: 'rgba(26,10,46,0.92)',
    heroCardBg: 'linear-gradient(135deg, rgba(26,10,46,0.95), rgba(45,16,64,0.85))',
    text: '#f1f5f9',
    muted: '#c4b5fd',
    dim: '#7c3aed',
    border: 'rgba(88,28,135,0.4)',
    glow: 'rgba(255,51,102,0.08)',
  },
  clean_studio: {
    bg: 'linear-gradient(145deg, #111827 0%, #1e293b 40%, #0f172a 100%)',
    accent: '#3b82f6',
    accentDim: 'rgba(59,130,246,0.12)',
    cardBg: 'rgba(30,41,59,0.92)',
    heroCardBg: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(51,65,85,0.85))',
    text: '#f8fafc',
    muted: '#94a3b8',
    dim: '#64748b',
    border: 'rgba(71,85,105,0.4)',
    glow: 'rgba(59,130,246,0.08)',
  },
};

type ThemeKey = keyof typeof VISUAL_THEMES;
type Theme = typeof VISUAL_THEMES.broadcast_dark;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLES_BASE = '/player-intel-v2-samples';

const PLAYER_IMAGE_MAP: Record<string, string> = {
  'lamine-yamal': 'https://images.fotmob.com/image_resources/playerimages/1467236.png',
  'robert-lewandowski': 'https://images.fotmob.com/image_resources/playerimages/93447.png',
  'cole-palmer': 'https://images.fotmob.com/image_resources/playerimages/1096353.png',
};

async function loadBroadcastData(slug: string): Promise<PlayerIntelMasterFull | null> {
  try {
    const r = await fetch(`${SAMPLES_BASE}/${slug}.broadcast.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as PlayerIntelMasterFull;
  } catch {
    return null;
  }
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export const PlayerIntelV2Renderer: React.FC<RendererProps> = ({ config, getField }) => {
  const sampleSlug = String(getField('samplePlayer') || 'lamine-yamal');
  const pastedJson = String(getField('masterJson') || '');
  const cardType = (String(getField('cardType') || 'attacker_card')) as CardType;
  const heroCount = Number(getField('heroMetricsCount') || 5);
  const secondaryCount = Number(getField('secondaryMetricsCount') || 6);
  const showSources = getField('showSources') !== false;
  const showFooter = getField('showFooter') !== false;
  const themeKey = (String(getField('visualTheme') || 'broadcast_dark')) as ThemeKey;

  const theme = VISUAL_THEMES[themeKey] || VISUAL_THEMES.broadcast_dark;

  const [broadcastData, setBroadcastData] = useState<PlayerIntelMasterFull | null>(null);

  // Parse pasted JSON
  const parsedFull = useMemo<PlayerIntelMasterFull | null>(() => {
    if (!pastedJson || pastedJson.length < 100) return null;
    try { return JSON.parse(pastedJson) as PlayerIntelMasterFull; } catch { return null; }
  }, [pastedJson]);

  // Load broadcast sample
  useEffect(() => {
    if (parsedFull) return;
    let mounted = true;
    loadBroadcastData(sampleSlug).then((d) => { if (mounted) setBroadcastData(d); });
    return () => { mounted = false; };
  }, [sampleSlug, parsedFull]);

  // Resolve metrics
  const resolved: ResolvedData = useMemo(() => {
    const source = parsedFull || broadcastData;
    return resolveMetrics(source, cardType, heroCount, secondaryCount);
  }, [parsedFull, broadcastData, cardType, heroCount, secondaryCount]);

  const { meta, heroMetrics, secondaryMetrics, sourceCoverage } = resolved;

  // Image
  const imageUrl = meta.imageUrl
    || (broadcastData as Record<string, unknown> | null)?.images
      && ((broadcastData as Record<string, unknown>)?.images as Record<string, string>)?.playerImage
    || PLAYER_IMAGE_MAP[sampleSlug]
    || null;

  const hasData = heroMetrics.length > 0 || secondaryMetrics.length > 0;

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ fontFamily: "'Tajawal', sans-serif" }}>
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ background: theme.bg, aspectRatio: '16/9' }}
      >
        {/* Background effects */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `radial-gradient(circle, ${theme.accent} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }} />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full blur-[150px] opacity-30"
          style={{ background: theme.glow }} />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: theme.accentDim }} />

        {/* Main layout */}
        <div className="absolute inset-0 flex" dir="rtl">
          {/* Right: Player image */}
          <div className="w-[30%] h-full relative flex items-end justify-center">
            <div className="absolute inset-0" style={{
              background: `radial-gradient(ellipse at center bottom, ${theme.accentDim}, transparent 70%)`,
            }} />
            {imageUrl && (
              <img
                src={imageUrl}
                alt={meta.player}
                className="relative z-10 w-[85%] max-h-[88%] object-contain object-bottom drop-shadow-2xl"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>

          {/* Left: Data panel */}
          <div className="flex-1 flex flex-col justify-center px-[4%] py-[3%]">
            {/* Card type badge */}
            <div className="mb-3">
              <span className="text-[13px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md"
                style={{ color: theme.accent, background: theme.accentDim }}>
                {meta.cardTitleAr}
              </span>
            </div>

            {/* Player name */}
            <h1 className="text-[42px] font-black leading-[1.1] mb-1" style={{ color: theme.text }}>
              {meta.player || '—'}
            </h1>

            {/* Club / Position / Season */}
            <div className="flex items-center gap-3 text-[15px] mb-6" style={{ color: theme.muted }}>
              {meta.club && <span className="font-bold">{meta.club}</span>}
              {meta.position && <><span style={{ color: theme.dim }}>•</span><span>{meta.position}</span></>}
              {meta.season && <><span style={{ color: theme.dim }}>•</span><span className="font-mono text-[13px]">{meta.season}</span></>}
            </div>

            {/* Hero metrics */}
            {heroMetrics.length > 0 && (
              <div className="grid gap-3 mb-4" style={{
                gridTemplateColumns: `repeat(${Math.min(heroMetrics.length, 3)}, 1fr)`,
              }}>
                {heroMetrics.map((m) => (
                  <HeroCard key={m.key} metric={m} theme={theme} />
                ))}
              </div>
            )}

            {/* Secondary metrics */}
            {secondaryMetrics.length > 0 && (
              <div className="grid gap-2 mb-5" style={{
                gridTemplateColumns: `repeat(${Math.min(secondaryMetrics.length, 4)}, 1fr)`,
              }}>
                {secondaryMetrics.map((m) => (
                  <SecondaryChip key={m.key} metric={m} theme={theme} />
                ))}
              </div>
            )}

            {/* No data message */}
            {!hasData && (
              <div className="rounded-xl px-5 py-8 text-center" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <p className="text-[15px]" style={{ color: theme.muted }}>
                  جارٍ تحميل البيانات...
                </p>
                <p className="text-[12px] mt-2" style={{ color: theme.dim }}>
                  إذا استمرت المشكلة، الصق ملف Master JSON في الإعدادات
                </p>
              </div>
            )}

            {/* Sources */}
            {showSources && hasData && (
              <div className="flex items-center gap-2 mt-auto pt-3">
                {sourceCoverage.fotmob && (
                  <span className="text-[11px] font-bold px-2 py-1 rounded-md"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                    FotMob ✓
                  </span>
                )}
                {sourceCoverage.fbref && (
                  <span className="text-[11px] font-bold px-2 py-1 rounded-md"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                    FBref ✓
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', borderTop: `1px solid ${theme.border}` }}>
            <span className="text-[10px] font-mono tracking-widest" style={{ color: theme.dim }}>
              REO DATA FABRIC • FOTMOB + FBREF
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Hero Metric Card ─────────────────────────────────────────────────────────

const HeroCard: React.FC<{ metric: ResolvedMetric; theme: Theme }> = ({ metric, theme }) => (
  <div className="rounded-xl p-4 backdrop-blur-sm" style={{
    background: theme.heroCardBg,
    border: `1px solid ${theme.border}`,
    boxShadow: `0 4px 20px ${theme.glow}`,
  }}>
    <div className="text-[11px] font-bold uppercase tracking-wide mb-2 truncate" style={{ color: theme.muted }}>
      {metric.labelAr || metric.label}
    </div>
    <div className="text-[32px] font-black leading-none" style={{ color: theme.text }}>
      {metric.formattedValue || '—'}
    </div>
    {metric.rank !== null && (
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(metric.rank, 100)}%`, background: theme.accent }} />
        </div>
        <span className="text-[10px] font-mono font-bold" style={{ color: theme.accent }}>
          {Math.round(metric.rank)}%
        </span>
      </div>
    )}
    {metric.per90 !== null && metric.rank === null && (
      <div className="text-[11px] mt-1.5 font-mono" style={{ color: theme.dim }}>
        {metric.per90.toFixed(2)} /90
      </div>
    )}
  </div>
);

// ─── Secondary Metric Chip ────────────────────────────────────────────────────

const SecondaryChip: React.FC<{ metric: ResolvedMetric; theme: Theme }> = ({ metric, theme }) => (
  <div className="rounded-lg px-3 py-2.5" style={{
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
  }}>
    <div className="text-[9px] uppercase tracking-wide truncate mb-0.5" style={{ color: theme.dim }}>
      {metric.labelAr || metric.label}
    </div>
    <div className="text-[18px] font-black leading-tight" style={{ color: theme.text }}>
      {metric.formattedValue || '—'}
    </div>
  </div>
);

export default PlayerIntelV2Renderer;
