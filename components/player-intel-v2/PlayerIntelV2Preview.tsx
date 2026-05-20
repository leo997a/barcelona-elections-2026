/**
 * Player Intel V2 — Preview Lab top-level component.
 *
 * Self-contained: does NOT import PlayerStatsRenderer, demo provider, or any
 * production overlay code. Pure read-only inspection of master profiles.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardPaste,
  Database,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react';
import { LAB_LABELS, warningAr } from './playerIntelV2Labels';
import type {
  PlayerIntelMasterFull,
  PlayerIntelMasterSummary,
  PlayerIntelSampleEntry,
  PlayerIntelSamplesIndex,
  PlayerIntelSourceConflict,
} from './playerIntelV2Types';
import PlayerIntelV2SourceCoverage from './PlayerIntelV2SourceCoverage';
import PlayerIntelV2CardsPanel from './PlayerIntelV2CardsPanel';
import PlayerIntelV2MetricTable from './PlayerIntelV2MetricTable';

const SAMPLES_INDEX_URL = '/player-intel-v2-samples/index.json';
const SAMPLES_BASE_URL = '/player-intel-v2-samples';

interface Props {
  onBack?: () => void;
}

const StatChip: React.FC<{ label: string; value?: number | string }> = ({
  label,
  value,
}) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 flex flex-col items-start min-w-[110px]">
    <span className="text-[10px] uppercase tracking-wide text-gray-500">
      {label}
    </span>
    <span className="text-lg font-black text-white font-mono">
      {value !== undefined && value !== null ? value : '—'}
    </span>
  </div>
);

const QualityWarnings: React.FC<{
  warnings: string[];
  conflicts: PlayerIntelSourceConflict[];
}> = ({ warnings, conflicts }) => {
  const hasIssues = warnings.length > 0 || conflicts.length > 0;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle
          className={`w-4 h-4 ${hasIssues ? 'text-orange-400' : 'text-green-400'}`}
        />
        <h3 className="text-base font-black text-white">
          {LAB_LABELS.qualityTitle}
        </h3>
      </div>

      {!hasIssues ? (
        <div className="bg-green-900/15 border border-green-800/40 text-green-300 text-sm rounded-lg px-3 py-2">
          {LAB_LABELS.noWarnings} · {LAB_LABELS.noConflicts}
        </div>
      ) : (
        <div className="space-y-3">
          {warnings.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">
                {LAB_LABELS.qualityWarnings}
              </div>
              <ul className="space-y-1.5">
                {warnings.map((w) => (
                  <li
                    key={w}
                    className="text-sm bg-orange-900/15 border border-orange-800/40 text-orange-300 rounded-lg px-3 py-2"
                  >
                    <span className="font-mono text-[11px] text-orange-200/80 ml-2">
                      [{w}]
                    </span>
                    {warningAr(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {conflicts.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">
                {LAB_LABELS.sourceConflicts}
              </div>
              <ul className="space-y-1.5">
                {conflicts.map((c, idx) => (
                  <li
                    key={`${c.metric}-${idx}`}
                    className="text-xs bg-red-900/15 border border-red-800/40 text-red-300 rounded-lg px-3 py-2 font-mono"
                    dir="ltr"
                  >
                    <span className="font-bold">{c.metric}</span>
                    {' — fotmob='}
                    {c.fotmobValue ?? '—'}
                    {' · fbref='}
                    {c.fbrefValue ?? '—'}
                    {typeof c.diffPercent === 'number' && (
                      <span className="text-red-400/80"> ({c.diffPercent}%)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PlayerIntelV2Preview: React.FC<Props> = ({ onBack }) => {
  const [index, setIndex] = useState<PlayerIntelSamplesIndex | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [indexLoading, setIndexLoading] = useState(true);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [summary, setSummary] = useState<PlayerIntelMasterSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [pasteText, setPasteText] = useState('');
  const [pastedFull, setPastedFull] = useState<PlayerIntelMasterFull | null>(
    null,
  );
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Load samples index on mount
  useEffect(() => {
    let mounted = true;
    setIndexLoading(true);
    fetch(SAMPLES_INDEX_URL, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: PlayerIntelSamplesIndex) => {
        if (!mounted) return;
        setIndex(data);
        setIndexError(null);
        // auto-select first
        if (data.players?.length && !selectedSlug && !pastedFull) {
          setSelectedSlug(data.players[0].slug);
        }
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setIndexError(err.message);
      })
      .finally(() => {
        if (mounted) setIndexLoading(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load summary when slug changes
  useEffect(() => {
    if (!selectedSlug || !index) {
      setSummary(null);
      return;
    }
    const entry = index.players.find((p) => p.slug === selectedSlug);
    if (!entry) {
      setSummary(null);
      return;
    }
    let mounted = true;
    setSummaryLoading(true);
    fetch(`${SAMPLES_BASE_URL}/${entry.summaryFile}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: PlayerIntelMasterSummary) => {
        if (!mounted) return;
        setSummary(data);
        // selecting a sample clears pasted full
        setPastedFull(null);
      })
      .catch(() => {
        if (mounted) setSummary(null);
      })
      .finally(() => {
        if (mounted) setSummaryLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedSlug, index]);

  // Derive what to display: pasted full > summary
  const displaySummary: PlayerIntelMasterSummary | null = useMemo(() => {
    if (pastedFull) {
      const qr = pastedFull.qualityReport || {};
      const sc = pastedFull.sourceCoverage || {};
      return {
        schemaVersion: pastedFull.schemaVersion,
        generatedAt: pastedFull.generatedAt,
        player: pastedFull.player?.name,
        club: pastedFull.player?.club,
        season: pastedFull.player?.season,
        position: pastedFull.player?.position,
        sources: sc,
        counts: {
          fotmobMetrics: qr.fotmobMetricsCount,
          fbrefRawColumns: qr.fbrefRawColumnsCount,
          canonicalMetrics: qr.canonicalMetricsCount,
          mergedMetrics: qr.mergedMetricsCount,
          metricCatalog: qr.metricCatalogCount,
          broadcastCards: qr.broadcastCardsCount,
          broadcastCardsItemTotal: qr.broadcastCardsItemTotal,
        },
        fbrefGroupsMatched: qr.fbrefGroupsMatched,
        fbrefGroupsMissingPlayer: qr.fbrefGroupsMissingPlayer,
        topAvailableCards: pastedFull.broadcastCards
          ? Object.entries(pastedFull.broadcastCards).map(([key, card]) => {
              const c = card as { title?: string; items?: unknown[]; itemsCount?: number };
              return {
                key,
                title: c.title,
                itemsCount: c.items?.length ?? c.itemsCount ?? 0,
              };
            })
          : [],
        canonicalKeys: pastedFull.canonicalMetrics
          ? Object.keys(pastedFull.canonicalMetrics)
          : [],
        qualityWarnings: qr.warnings || [],
        sourceConflicts: qr.sourceConflicts || [],
      };
    }
    return summary;
  }, [pastedFull, summary]);

  const playerImage = useMemo<string | null>(() => {
    if (pastedFull) {
      const fp = pastedFull.fotmob?.fullProfile as
        | { images?: { playerImage?: string } }
        | undefined;
      return fp?.images?.playerImage || null;
    }
    return null;
  }, [pastedFull]);

  const handleParsePaste = () => {
    setPasteError(null);
    const text = pasteText.trim();
    if (!text) {
      setPasteError(LAB_LABELS.pasteEmptyError);
      return;
    }
    try {
      const parsed = JSON.parse(text) as PlayerIntelMasterFull;
      setPastedFull(parsed);
    } catch {
      setPasteError(LAB_LABELS.pasteParseError);
    }
  };

  const handleClearPaste = () => {
    setPasteText('');
    setPastedFull(null);
    setPasteError(null);
  };

  const counts = displaySummary?.counts || {};
  const warnings = displaySummary?.qualityWarnings || [];
  const conflicts = displaySummary?.sourceConflicts || [];

  return (
    <div
      className="min-h-screen bg-gray-950 text-white font-sans"
      dir="rtl"
      lang="ar"
    >
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black truncate">
                {LAB_LABELS.pageTitle}
              </h1>
              <p className="text-xs text-gray-500 truncate">
                {LAB_LABELS.pageSubtitle}
              </p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              {LAB_LABELS.back}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        {/* Player picker + paste */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sample picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-black text-white">
                  {LAB_LABELS.selectPlayer}
                </h2>
              </div>
              {indexLoading ? (
                <p className="text-sm text-gray-500">
                  {LAB_LABELS.loadingSamples}
                </p>
              ) : indexError ? (
                <p className="text-sm text-red-400">
                  {LAB_LABELS.samplesLoadError} ({indexError})
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(index?.players || []).map((p: PlayerIntelSampleEntry) => {
                    const active = !pastedFull && selectedSlug === p.slug;
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => {
                          setSelectedSlug(p.slug);
                          setPastedFull(null);
                        }}
                        className={[
                          'text-right rounded-xl border px-3 py-2 transition-all',
                          active
                            ? 'bg-blue-900/20 border-blue-700/60 text-white'
                            : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700',
                        ].join(' ')}
                      >
                        <div className="text-sm font-bold truncate">
                          {p.player || p.slug}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate font-mono">
                          {p.club} · {p.season}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">
                          {p.metricsCount ?? 0} merged · {p.broadcastCardsCount ?? 0} cards
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Paste master */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardPaste className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-black text-white">
                  {LAB_LABELS.pasteMasterTitle}
                </h2>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">
                {LAB_LABELS.pasteMasterHint}
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='{"schemaVersion":"player-intel-master-v1", ...}'
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono placeholder-gray-700 focus:outline-none focus:border-purple-500 transition-colors h-28 resize-none"
                dir="ltr"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleParsePaste}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-md font-bold"
                >
                  {LAB_LABELS.pasteButton}
                </button>
                {(pasteText || pastedFull) && (
                  <button
                    type="button"
                    onClick={handleClearPaste}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-md"
                  >
                    {LAB_LABELS.clearPasted}
                  </button>
                )}
                {pastedFull && (
                  <span className="text-[11px] bg-green-900/20 border border-green-800/40 text-green-300 rounded-md px-2 py-1 font-mono">
                    full master loaded
                  </span>
                )}
              </div>
              {pasteError && (
                <p className="text-xs text-red-400 mt-2">{pasteError}</p>
              )}
            </div>
          </div>
        </section>

        {/* Loading or empty */}
        {summaryLoading && !pastedFull && (
          <p className="text-sm text-gray-500 text-center py-6">
            {LAB_LABELS.loadingSamples}
          </p>
        )}

        {!displaySummary && !summaryLoading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500 text-sm">
            {LAB_LABELS.noSelection}
          </div>
        )}

        {displaySummary && (
          <>
            {/* Player overview */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-24 h-24 rounded-2xl bg-gray-800 border border-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {playerImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={playerImage}
                      alt={displaySummary.player || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          'none';
                      }}
                    />
                  ) : (
                    <span className="text-[10px] text-gray-600 text-center px-2">
                      {LAB_LABELS.imageNotAvailable}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-[220px]">
                  <h2 className="text-2xl font-black text-white">
                    {displaySummary.player || '—'}
                  </h2>
                  <div className="text-sm text-gray-400 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <span>
                      <span className="text-gray-500">{LAB_LABELS.club}:</span>{' '}
                      <span className="text-gray-200">
                        {displaySummary.club || '—'}
                      </span>
                    </span>
                    <span>
                      <span className="text-gray-500">{LAB_LABELS.position}:</span>{' '}
                      <span className="text-gray-200">
                        {displaySummary.position || '—'}
                      </span>
                    </span>
                    <span>
                      <span className="text-gray-500">{LAB_LABELS.season}:</span>{' '}
                      <span className="text-gray-200 font-mono">
                        {displaySummary.season || '—'}
                      </span>
                    </span>
                  </div>
                  {displaySummary.generatedAt && (
                    <div className="text-[11px] text-gray-600 mt-1 font-mono" dir="ltr">
                      {LAB_LABELS.generatedAt}: {displaySummary.generatedAt}
                    </div>
                  )}
                </div>
                <a
                  href={SAMPLES_INDEX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  index.json
                </a>
              </div>

              {/* Counts */}
              <div className="flex flex-wrap gap-2 mt-5">
                <StatChip
                  label={LAB_LABELS.fotmobMetrics}
                  value={counts.fotmobMetrics}
                />
                <StatChip
                  label={LAB_LABELS.fbrefRawColumns}
                  value={counts.fbrefRawColumns}
                />
                <StatChip
                  label={LAB_LABELS.canonicalMetrics}
                  value={counts.canonicalMetrics}
                />
                <StatChip
                  label={LAB_LABELS.mergedMetrics}
                  value={counts.mergedMetrics}
                />
                <StatChip
                  label={LAB_LABELS.metricCatalog}
                  value={counts.metricCatalog}
                />
                <StatChip
                  label={LAB_LABELS.broadcastCardsCount}
                  value={counts.broadcastCards}
                />
                <StatChip
                  label={LAB_LABELS.broadcastCardsItemTotal}
                  value={counts.broadcastCardsItemTotal}
                />
              </div>
            </section>

            {/* Source coverage */}
            <PlayerIntelV2SourceCoverage summary={displaySummary} />

            {/* Quality */}
            <QualityWarnings warnings={warnings} conflicts={conflicts} />

            {/* Cards */}
            <PlayerIntelV2CardsPanel
              summary={displaySummary}
              fullCards={pastedFull?.broadcastCards || null}
            />

            {/* Catalog */}
            <PlayerIntelV2MetricTable
              catalog={pastedFull?.metricCatalog || null}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default PlayerIntelV2Preview;
