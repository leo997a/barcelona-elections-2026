/**
 * Player Intel V2 — Broadcast Renderer
 *
 * Professional 16:9 broadcast card built on Player Intel Master Profile data.
 * Reads from overlay config fields (sample slug or pasted JSON).
 * Does NOT use PlayerStatsRenderer, player-stats-bridge, or /api/player-stats.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { RendererProps } from './SharedComponents';
import {
  resolveMetrics,
  type CardType,
  type ResolvedData,
  type ResolvedMetric,
} from '../player-intel-v2/playerIntelV2MetricResolver';
import type {
  PlayerIntelMasterFull,
  PlayerIntelMasterSummary,
} from '../player-intel-v2/playerIntelV2Types';

// ─── Visual themes ────────────────────────────────────────────────────────────

const VISUAL_THEMES = {
  broadcast_dark: {
    bg: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)',
    accent: '#22d3ee',
    accentGlow: 'rgba(34,211,238,0.15)',
    cardBg: 'rgba(15,23,42,0.85)',
    text: '#f1f5f9',
    muted: '#94a3b8',
    border: 'rgba(51,65,85,0.6)',
  },
  barcelona_night: {
    bg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #0f172a 100%)',
    accent: '#a50044',
    accentGlow: 'rgba(165,0,68,0.2)',
    cardBg: 'rgba(26,10,46,0.85)',
    text: '#f1f5f9',
    muted: '#c4b5fd',
    border: 'rgba(88,28,135,0.5)',
  },
  clean_studio: {
    bg: 'linear-gradient(135deg, #111827 0%, #1e293b 50%, #0f172a 100%)',
    accent: '#3b82f6',
    accentGlow: 'rgba(59,130,246,0.15)',
    cardBg: 'rgba(30,41,59,0.9)',
    text: '#f8fafc',
    muted: '#64748b',
    border: 'rgba(71,85,105,0.5)',
  },
};

type ThemeKey = keyof typeof VISUAL_THEMES;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLES_BASE = '/player-intel-v2-samples';

async function loadSampleSummary(slug: string): Promise<PlayerIntelMasterSummary | null> {
  try {
    const r = await fetch(`${SAMPLES_BASE}/${slug}.master.summary.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as PlayerIntelMasterSummary;
  } catch {
    return null;
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

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

  // Data state
  const [summaryData, setSummaryData] = useState<PlayerIntelMasterSummary | null>(null);

  // Parse pasted JSON (client-side only)
  const parsedFull = useMemo<PlayerIntelMasterFull | null>(() => {
    if (!pastedJson || pastedJson.length < 50) return null;
    try {
      return JSON.parse(pastedJson) as PlayerIntelMasterFull;
    } catch {
      return null;
    }
  }, [pastedJson]);

  // Load sample summary
  useEffect(() => {
    if (parsedFull) return; // pasted takes priority
    let mounted = true;
    loadSampleSummary(sampleSlug).then((d) => {
      if (mounted) setSummaryData(d);
    });
    return () => { mounted = false; };
  }, [sampleSlug, parsedFull]);

  // Resolve metrics
  const resolved: ResolvedData = useMemo(() => {
    const source = parsedFull || summaryData;
    return resolveMetrics(source, cardType, heroCount, secondaryCount);
  }, [parsedFull, summaryData, cardType, heroCount, secondaryCount]);

  const { meta, heroMetrics, secondaryMetrics, sourceCoverage } = resolved;

  // Image URL
  const imageUrl = meta.imageUrl || (
    parsedFull
      ? null
      : `https://images.fotmob.com/image_resources/playerimages/${sampleSlug === 'lamine-yamal' ? '1467236' : sampleSlug === 'robert-lewandowski' ? '93447' : '1096353'}.png`
  );

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ fontFamily: "'Tajawal', sans-serif" }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: '1920px',
          height: '1080px',
          background: theme.bg,
          transform: 'scale(var(--renderer-scale, 1))',
          transformOrigin: 'center center',
        }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, ${theme.accent} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Accent glow top-right */}
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ background: theme.accentGlow }}
        />

        {/* Main content */}
        <div className="absolute inset-0 flex" dir="rtl">
          {/* Right side: Player image */}
          <div className="w-[380px] h-full relative flex items-end justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={meta.player}
                className="absolute bottom-0 w-[340px] h-auto object-contain object-bottom drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.5))' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-[200px] h-[260px] rounded-2xl bg-gray-800/40 border border-gray-700/30 flex items-center justify-center mb-20">
                <span className="text-6xl opacity-30">⚽</span>
              </div>
            )}
          </div>

          {/* Left side: Data */}
          <div className="flex-1 flex flex-col justify-center px-12 py-10">
            {/* Header */}
            <div className="mb-8">
              <div
                className="text-sm font-bold uppercase tracking-widest mb-2"
                style={{ color: theme.accent }}
              >
                {meta.cardTitleAr}
              </div>
              <h1
                className="text-5xl font-black leading-tight mb-2"
                style={{ color: theme.text }}
              >
                {meta.player || '—'}
              </h1>
              <div className="flex items-center gap-4 text-lg" style={{ color: theme.muted }}>
                <span>{meta.club}</span>
                <span className="opacity-40">•</span>
                <span>{meta.position}</span>
                <span className="opacity-40">•</span>
                <span className="font-mono text-base">{meta.season}</span>
              </div>
            </div>

            {/* Hero metrics */}
            {heroMetrics.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {heroMetrics.map((m) => (
                  <HeroMetricCard key={m.key} metric={m} theme={theme} />
                ))}
              </div>
            )}

            {/* Secondary metrics */}
            {secondaryMetrics.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                {secondaryMetrics.map((m) => (
                  <SecondaryMetricChip key={m.key} metric={m} theme={theme} />
                ))}
              </div>
            )}

            {/* Source coverage badge */}
            {showSources && (
              <div className="flex items-center gap-3 mt-auto">
                {sourceCoverage.fotmob && (
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    FotMob ✓
                  </span>
                )}
                {sourceCoverage.fbref && (
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
                  >
                    FBref ✓
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {showFooter && (
          <div
            className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)', borderTop: `1px solid ${theme.border}` }}
          >
            <span className="text-[11px] font-mono tracking-wider" style={{ color: theme.muted }}>
              REO Data Fabric • FotMob + FBref
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const HeroMetricCard: React.FC<{ metric: ResolvedMetric; theme: typeof VISUAL_THEMES.broadcast_dark }> = ({
  metric,
  theme,
}) => (
  <div
    className="rounded-xl p-4 flex flex-col"
    style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
  >
    <span className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: theme.muted }}>
      {metric.labelAr || metric.label}
    </span>
    <span className="text-3xl font-black" style={{ color: theme.text }}>
      {metric.formattedValue}
    </span>
    {metric.rank !== null && (
      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(metric.rank, 100)}%`, background: theme.accent }}
          />
        </div>
        <span className="text-[10px] font-mono" style={{ color: theme.accent }}>
          {Math.round(metric.rank)}%
        </span>
      </div>
    )}
  </div>
);

const SecondaryMetricChip: React.FC<{ metric: ResolvedMetric; theme: typeof VISUAL_THEMES.broadcast_dark }> = ({
  metric,
  theme,
}) => (
  <div
    className="rounded-lg px-3 py-2.5 flex flex-col"
    style={{ background: 'rgba(15,23,42,0.5)', border: `1px solid ${theme.border}` }}
  >
    <span className="text-[10px] uppercase tracking-wide truncate" style={{ color: theme.muted }}>
      {metric.labelAr || metric.label}
    </span>
    <span className="text-lg font-black mt-0.5" style={{ color: theme.text }}>
      {metric.formattedValue}
    </span>
  </div>
);

export default PlayerIntelV2Renderer;
