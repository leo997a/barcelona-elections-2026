/**
 * Mondial2026Renderer.tsx — المحرك الرئيسي لقوالب مونديال 2026
 *
 * محرك واحد يدعم 25+ قالب عبر نظام variant-based مطابق لـ MercatoUnifiedRenderer.
 *
 * نظام dataMode الذكي (مثل Match Stats الموجود):
 *   CLOUD_BRIDGE → جسر REO السحابي (نفس نظام المشروع الرئيسي)
 *   BRIDGE       → جسر مخصص
 *   PASTE_JSON   → إدخال يدوي JSON
 *   DEMO         → بيانات تجريبية داخلية
 *
 * طريقة النقل للمشروع الرئيسي:
 *   1. أضف MONDIAL_LIVE, MONDIAL_STATS ... إلى OverlayType enum في types.ts
 *   2. أضف القوالب من mondial-templates.ts إلى constants.ts
 *   3. انسخ هذا الملف + MondialSharedComponents.tsx + renderers الفرعية
 *      إلى barcelona-elections-2026/components/renderers/
 *   4. أضف entries من mondial-taxonomy.ts إلى templateTaxonomy.ts
 *   5. أضف الـ cases في OverlayRenderer.tsx
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getWorldCupDataVersion } from '../../utils/worldCupLiveData';
import {
  fixturesFromWorldCupData,
  pickWorldCupMatch,
  selectedMatchToFields,
  type MondialLiveMatch,
} from '../../utils/mondialLiveSelectors';
import {
  matchDetailsToFields,
  type MondialMatchDetails,
} from '../../utils/mondialMatchDetails';
import {
  getMondialTheme,
  MondialTheme,
  MondialHeader,
  MondialPill,
  MondialBar,
  MondialDualBar,
  MondialTeamLogo,
  MondialWaveform,
  MondialLiveBadge,
  MondialRating,
  MondialFieldCard,
  TrophyIcon,
  MONDIAL_KEYFRAMES,
  safeParse,
  isRtl,
  clamp,
  getFlag,
  MondialFlag,
} from './MondialSharedComponents';
import {
  ReoObsAnalysis,
  ReoObsGoldenBoot,
  ReoObsGroupTable,
  ReoObsIraqDashboard,
  ReoObsIraqFanPulse,
  ReoObsIraqHistory,
  ReoObsIraqPlayerSpotlight,
  ReoObsIraqSquad,
  ReoObsIraqTicker,
  ReoObsLineup,
  ReoObsLowerThird,
  ReoObsMatchPreview,
  ReoObsMatchReport,
  ReoObsMatchResult,
  ReoObsMatchStats,
  ReoObsPlayerSpotlight,
  ReoObsPrediction,
  ReoObsQuote,
  ReoObsScoreboard,
  ReoObsScorebug,
  ReoObsTicker,
  ReoObsVarAlert,
} from './MondialObsTemplates';
import {
  ReoObsGroupWall,
  ReoObsKnockoutBracket,
  ReoObsMondialFlagIdentityWall,
  ReoObsMondialFullTime,
  ReoObsMondialMatchAnnouncement,
  ReoObsMondialSocialStory,
  ReoObsMondialTeamCodeWall,
} from './mondial/MondialObsTemplates';
import { MondialTransitionFrame } from './mondial/MondialTransitionLayer';

// ─── نوع Props الموحد (متوافق مع المشروع الرئيسي) ───────────────────────────

export interface MondialRendererProps {
  config: {
    id: string;
    fields: { id: string; value: unknown }[];
    isVisible: boolean;
  };
  getField: (id: string) => unknown;
  containerStyle?: React.CSSProperties;
  contentWrapperStyle?: React.CSSProperties;
  playSound?: (cue: 'TRANSITION') => Promise<void>;
  wasVisible?: boolean;
  isEditor?: boolean;
}

// ─── بيانات تجريبية افتراضية ─────────────────────────────────────────────────

const DEMO_MATCH = {
  homeTeam: 'Iraq', homeTeamAr: 'العراق', homeShort: 'IRQ',
  awayTeam: 'Argentina', awayTeamAr: 'الأرجنتين', awayShort: 'ARG',
  homeScore: 1, awayScore: 0,
  minute: 67, period: 'الشوط الثاني',
  status: 'LIVE' as const,
  competition: 'FIFA World Cup 2026 · Group Stage',
  homeColor: '#007A3D', awayColor: '#74ACDF',
  stats: {
    possession: [48, 52],
    shots: [8, 14], shotsOnTarget: [4, 7],
    corners: [3, 6], fouls: [12, 9],
    yellowCards: [2, 1], offsides: [2, 3],
    passAccuracy: [78, 88], tackles: [18, 14],
  },
  events: [
    { minute: 23, type: 'goal', player: 'أيمن حسين', team: 'home' },
    { minute: 38, type: 'yellow', player: 'Ali Hassan', team: 'away' },
    { minute: 55, type: 'sub', player: 'باسم قاسم', team: 'home' },
  ],
};

const DEMO_GROUP = [
  { name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶', played: 2, won: 1, drawn: 1, lost: 0, gf: 2, ga: 1, pts: 4, qualified: false },
  { name: 'Argentina', nameAr: 'الأرجنتين', flag: '🇦🇷', played: 2, won: 1, drawn: 1, lost: 0, gf: 3, ga: 1, pts: 4, qualified: false },
  { name: 'Australia', nameAr: 'أستراليا', flag: '🇦🇺', played: 2, won: 1, drawn: 0, lost: 1, gf: 2, ga: 3, pts: 3, qualified: false },
  { name: 'China', nameAr: 'الصين', flag: '🇨🇳', played: 2, won: 0, drawn: 0, lost: 2, gf: 0, ga: 2, pts: 0, qualified: false },
];

const DEMO_SCORERS = [
  { name: 'Kylian Mbappé', nameAr: 'كيليان مبابي', team: 'France', flag: '🇫🇷', goals: 5, image: '' },
  { name: 'Erling Haaland', nameAr: 'إيرلينغ هالاند', team: 'Norway', flag: '🇳🇴', goals: 4, image: '' },
  { name: 'Vinicius Jr.', nameAr: 'فينيسيوس', team: 'Brazil', flag: '🇧🇷', goals: 4, image: '' },
  { name: 'أيمن حسين', nameAr: 'أيمن حسين', team: 'Iraq', flag: '🇮🇶', goals: 3, image: '' },
  { name: 'Lamine Yamal', nameAr: 'لامين يامال', team: 'Spain', flag: '🇪🇸', goals: 3, image: '' },
];

const mergeSelectedMatchDetails = (
  selectedMatch: MondialLiveMatch | undefined,
  matchDetails: MondialMatchDetails | null
): MondialLiveMatch | undefined => {
  if (!selectedMatch || !matchDetails || String(selectedMatch.id) !== String(matchDetails.match.id)) {
    return selectedMatch;
  }

  const detailMatch = matchDetails.match;
  const homeFallback = selectedMatch.home ?? {
    id: detailMatch.home.id,
    name: detailMatch.home.name,
    shortName: detailMatch.home.code,
    countryCode: detailMatch.home.countryCode,
    flagUrl: detailMatch.home.logoUrl,
    logoUrl: detailMatch.home.logoUrl,
  };
  const awayFallback = selectedMatch.away ?? {
    id: detailMatch.away.id,
    name: detailMatch.away.name,
    shortName: detailMatch.away.code,
    countryCode: detailMatch.away.countryCode,
    flagUrl: detailMatch.away.logoUrl,
    logoUrl: detailMatch.away.logoUrl,
  };

  return {
    ...selectedMatch,
    home: {
      ...homeFallback,
      id: detailMatch.home.id,
      name: detailMatch.home.name,
      shortName: detailMatch.home.code,
      countryCode: detailMatch.home.countryCode,
      flagUrl: selectedMatch.home?.flagUrl || detailMatch.home.logoUrl,
      logoUrl: detailMatch.home.logoUrl,
      color: detailMatch.home.color || homeFallback.color,
    },
    away: {
      ...awayFallback,
      id: detailMatch.away.id,
      name: detailMatch.away.name,
      shortName: detailMatch.away.code,
      countryCode: detailMatch.away.countryCode,
      flagUrl: selectedMatch.away?.flagUrl || detailMatch.away.logoUrl,
      logoUrl: detailMatch.away.logoUrl,
      color: detailMatch.away.color || awayFallback.color,
    },
    homeScore: detailMatch.homeScore,
    awayScore: detailMatch.awayScore,
    status: detailMatch.status,
    statusLabel: detailMatch.statusLabel,
    minute: detailMatch.minute,
    date: detailMatch.date || selectedMatch.date,
    stage: detailMatch.stage || selectedMatch.stage,
    venue: detailMatch.venue || selectedMatch.venue,
  };
};

const buildTemplateLiveData = (
  liveData: Record<string, unknown> | null,
  selectedMatch: MondialLiveMatch | undefined,
  matchDetails: MondialMatchDetails | null,
  bridgeStatus: 'idle' | 'connecting' | 'live' | 'error'
): Record<string, unknown> | null => {
  if (!liveData) return null;

  const selectedFixture = mergeSelectedMatchDetails(selectedMatch, matchDetails);
  const fixtures = Array.isArray(liveData.fixtures) ? liveData.fixtures : [];
  const mergedFixtures = selectedFixture
    ? [
        selectedFixture,
        ...fixtures.filter(value => {
          const fixture = value !== null && typeof value === 'object'
            ? value as Record<string, unknown>
            : null;
          return String(fixture?.id ?? '') !== String(selectedFixture.id);
        }),
      ]
    : fixtures;
  const sourceStatus = String(liveData.sourceStatus || '').toLowerCase() === 'stale' || bridgeStatus === 'error'
    ? 'stale'
    : 'updated';

  return {
    ...liveData,
    provider: undefined,
    sourceMode: undefined,
    sourceUrl: undefined,
    sourceStatus,
    fixtures: mergedFixtures,
    selectedMatch: selectedFixture,
  };
};

// ─── Hook: جلب بيانات مباشرة (مثل Match Stats الموجود) ───────────────────────

function useMondialData(
  dataMode: string,
  bridgeApiUrl: string,
  manualJson: string,
  pollSec: number,
  liveRefreshEnabled: boolean,
  manualRefreshNonce: number
) {
  const [liveData, setLiveData] = useState<Record<string, unknown> | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [dataVersion, setDataVersion] = useState('');
  const [updateSequence, setUpdateSequence] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const versionRef = useRef<string | null>(null);
  const refreshNonceRef = useRef(manualRefreshNonce);

  const applyLiveData = useCallback((data: Record<string, unknown>, forceUpdate = false) => {
    const nextVersion = getWorldCupDataVersion(data);
    if (versionRef.current === nextVersion && !forceUpdate) {
      setLiveData(data);
      return;
    }

    const hadPreviousVersion = versionRef.current !== null;
    versionRef.current = nextVersion;
    setLiveData(data);
    setDataVersion(nextVersion);
    if (hadPreviousVersion || forceUpdate) setUpdateSequence(sequence => sequence + 1);
  }, []);

  const fetchFromBridge = useCallback(async (forceUpdate = false) => {
    if (!bridgeApiUrl || dataMode === 'DEMO' || dataMode === 'PASTE_JSON') return;
    if (!versionRef.current) setBridgeStatus('connecting');
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch(bridgeApiUrl, {
        signal: abortRef.current.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as Record<string, unknown>;
      applyLiveData(data, forceUpdate);
      setBridgeStatus('live');
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') setBridgeStatus('error');
    }
  }, [applyLiveData, bridgeApiUrl, dataMode]);

  useEffect(() => {
    if (dataMode === 'PASTE_JSON') {
      const parsed = safeParse<Record<string, unknown>>(manualJson, {});
      const forceUpdate = manualRefreshNonce !== refreshNonceRef.current;
      refreshNonceRef.current = manualRefreshNonce;
      if (Object.keys(parsed).length) {
        applyLiveData(parsed, forceUpdate);
      } else {
        versionRef.current = null;
        setLiveData(null);
        setDataVersion('');
        setUpdateSequence(0);
      }
      setBridgeStatus('idle');
      return;
    }
    if (dataMode === 'DEMO') {
      versionRef.current = null;
      setLiveData(null);
      setDataVersion('');
      setUpdateSequence(0);
      setBridgeStatus('idle');
      return;
    }
    const forceUpdate = manualRefreshNonce !== refreshNonceRef.current;
    refreshNonceRef.current = manualRefreshNonce;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (liveRefreshEnabled || forceUpdate) void fetchFromBridge(forceUpdate);
    if (liveRefreshEnabled) {
      intervalRef.current = setInterval(() => { void fetchFromBridge(false); }, pollSec * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [applyLiveData, dataMode, manualJson, pollSec, fetchFromBridge, liveRefreshEnabled, manualRefreshNonce]);

  return { liveData, bridgeStatus, dataVersion, updateSequence };
}

function useMondialMatchDetails(
  matchId: string,
  dataMode: string,
  pollSec: number,
  liveRefreshEnabled: boolean,
  manualRefreshNonce: number
) {
  const [matchDetails, setMatchDetails] = useState<MondialMatchDetails | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshNonceRef = useRef(manualRefreshNonce);

  const fetchDetails = useCallback(async () => {
    if (!/^\d{4,}$/.test(matchId) || dataMode === 'DEMO' || dataMode === 'PASTE_JSON') {
      setMatchDetails(null);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`/api/reo-match?action=match-details&matchId=${encodeURIComponent(matchId)}&_reo=${Date.now()}`, {
        signal: abortRef.current.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as MondialMatchDetails;
      setMatchDetails(data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') setMatchDetails(null);
    }
  }, [dataMode, matchId]);

  useEffect(() => {
    const forceUpdate = manualRefreshNonce !== refreshNonceRef.current;
    refreshNonceRef.current = manualRefreshNonce;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (!/^\d{4,}$/.test(matchId) || dataMode === 'DEMO' || dataMode === 'PASTE_JSON') {
      setMatchDetails(null);
      return () => {
        if (abortRef.current) abortRef.current.abort();
      };
    }
    if (liveRefreshEnabled || forceUpdate) void fetchDetails();
    if (liveRefreshEnabled && /^\d{4,}$/.test(matchId) && dataMode !== 'DEMO' && dataMode !== 'PASTE_JSON') {
      intervalRef.current = setInterval(() => { void fetchDetails(); }, pollSec * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [dataMode, fetchDetails, liveRefreshEnabled, matchId, manualRefreshNonce, pollSec]);

  return matchDetails;
}

// ─── المحرك الرئيسي ──────────────────────────────────────────────────────────

export const Mondial2026Renderer: React.FC<MondialRendererProps> = ({
  config,
  getField,
  playSound,
  wasVisible = false,
  isEditor = false,
}) => {
  const rawVariant = String(getField('mondialVariant') || getField('iraqVariant') || 'scoreboard');
  const isIraqTemplate = String(config?.id || config?.templateId || '').includes('template-mondial-iraq');
  const variant = isIraqTemplate && rawVariant === 'player_spotlight'
    ? 'iraq_player_spotlight'
    : isIraqTemplate && rawVariant === 'match_ticker'
      ? 'iraq_match_ticker'
      : rawVariant;
  const themeId = String(getField('mondialTheme') || 'MUNDIAL_MAIN');
  const t = getMondialTheme(themeId);

  // نظام البيانات الموحد
  const dataMode = String(getField('dataMode') || 'CLOUD_BRIDGE');
  const manualJson = String(getField('manualJson') || '{}');
  const bridgeApiUrl = String(getField('bridgeApiUrl') || '/api/reo-match?action=world-cup');
  const requestedPollSec = Number(getField('pollIntervalSec') || 30);
  const pollSec = Number.isFinite(requestedPollSec)
    ? Math.max(10, Math.min(300, requestedPollSec))
    : 30;
  const liveRefreshEnabled = getField('liveRefreshEnabled') !== false;
  const manualRefreshNonce = Number(getField('manualRefreshNonce') || 0);

  const { liveData, bridgeStatus, dataVersion, updateSequence } = useMondialData(
    dataMode,
    bridgeApiUrl,
    manualJson,
    pollSec,
    liveRefreshEnabled,
    Number.isFinite(manualRefreshNonce) ? manualRefreshNonce : 0
  );
  const playedUpdateSequenceRef = useRef(0);
  const fixtures = fixturesFromWorldCupData(liveData, getField('fixturesJson'));
  const selectedMatch = pickWorldCupMatch(fixtures, {
    mode: getField('matchPickMode'),
    featuredMatchIndex: getField('featuredMatchIndex'),
    selectedMatchId: getField('selectedMatchId'),
    teamCode: getField('matchTeamCode'),
    groupCode: getField('matchGroupCode'),
    roundStage: getField('matchRoundStage'),
    statusFilter: getField('matchStatusFilter'),
  });
  const selectedMatchFields = selectedMatchToFields(
    selectedMatch,
    String(liveData?.competition || getField('competition') || 'FIFA World Cup 2026')
  );
  const matchDetails = useMondialMatchDetails(
    selectedMatch ? String(selectedMatch.id) : '',
    dataMode,
    pollSec,
    liveRefreshEnabled,
    Number.isFinite(manualRefreshNonce) ? manualRefreshNonce : 0
  );
  const matchDetailFields = matchDetailsToFields(matchDetails);
  const templateLiveData = buildTemplateLiveData(
    liveData,
    selectedMatch,
    matchDetails,
    bridgeStatus
  );
  const firstFilled = (...values: unknown[]): unknown =>
    values.find(value => value !== undefined && value !== null && value !== '');

  const resolveStatsPeriodField = (fieldId: string): unknown => {
    const manual = firstFilled(getField('statsPeriod'), getField('period'));
    const auto = firstFilled(matchDetailFields[fieldId], selectedMatchFields[fieldId]);
    const manualToken = String(manual ?? '').trim().toUpperCase();
    return manualToken && manualToken !== 'FULL' ? manual : firstFilled(auto, manual, 'FULL');
  };

  const getMatchField = (fieldId: string): unknown => {
    if (fieldId === 'period' || fieldId === 'statsPeriod') return resolveStatsPeriodField(fieldId);
    return firstFilled(matchDetailFields[fieldId], selectedMatchFields[fieldId], getField(fieldId));
  };

  useEffect(() => {
    if (!updateSequence) {
      playedUpdateSequenceRef.current = 0;
      return;
    }
    if (updateSequence <= playedUpdateSequenceRef.current) return;
    playedUpdateSequenceRef.current = updateSequence;
    if (isEditor || !config.isVisible) return;
    void playSound?.('TRANSITION');
  }, [config.isVisible, isEditor, playSound, updateSequence]);

  // دمج: البيانات الحية تتفوق على الحقول اليدوية عند توفرها
  const resolveField = (fieldId: string, liveKey?: string): unknown => {
    if (fieldId === 'period' || fieldId === 'statsPeriod') return resolveStatsPeriodField(fieldId);
    return firstFilled(
      matchDetailFields[fieldId],
      liveKey ? matchDetailFields[liveKey] : undefined,
      liveKey ? selectedMatchFields[liveKey] : undefined,
      selectedMatchFields[fieldId],
      liveData && liveKey ? liveData[liveKey] : undefined,
      getField(fieldId)
    );
  };

  return (
    <MondialTransitionFrame
      getField={getField}
      isVisible={config?.isVisible ?? true}
      wasVisible={wasVisible}
      isEditor={isEditor}
      updateKey={updateSequence}
      dataVersion={dataVersion}
    >
    <div className="relative overflow-hidden w-full h-full">
      <style>{MONDIAL_KEYFRAMES}</style>
      <div className="w-full h-full relative">
        <div
          className="w-full h-full relative overflow-hidden"
          style={{
            background: ['ticker', 'lower_third', 'scorebug'].includes(variant) ? 'transparent' : t.bg,
            fontFamily: "'Tajawal', 'Outfit', 'Inter', sans-serif"
          }}
        >
          {/* ── Variants ─────────────────────────────────────────── */}
          {variant === 'scoreboard' && (
            <ReoObsScoreboard t={t} getField={getMatchField} resolveField={resolveField} bridgeStatus={bridgeStatus} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'scorebug' && (
            <ReoObsScorebug t={t} getField={getMatchField} resolveField={resolveField} bridgeStatus={bridgeStatus} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'match_stats' && (
            <ReoObsMatchStats t={t} getField={getMatchField} resolveField={resolveField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'group_table' && (
            <ReoObsGroupTable t={t} getField={getField} liveData={templateLiveData} />
          )}
          {variant === 'group_wall' && (
            <ReoObsGroupWall getField={getField} liveData={templateLiveData} />
          )}
          {variant === 'flag_wall' && (
            <ReoObsMondialFlagIdentityWall getField={getField} liveData={templateLiveData} />
          )}
          {variant === 'team_code_wall' && (
            <ReoObsMondialTeamCodeWall getField={getField} liveData={templateLiveData} />
          )}
          {variant === 'knockout_bracket' && (
            <ReoObsKnockoutBracket getField={getField} liveData={templateLiveData} />
          )}
          {variant === 'match_announcement' && (
            <ReoObsMondialMatchAnnouncement getField={getMatchField} liveData={templateLiveData} />
          )}
          {variant === 'full_time' && (
            <ReoObsMondialFullTime getField={getMatchField} liveData={templateLiveData} />
          )}
          {variant === 'social_story' && (
            <ReoObsMondialSocialStory getField={getMatchField} liveData={templateLiveData} />
          )}
          {variant === 'squad_card' && (
            <ReoObsIraqSquad t={t} getField={getField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'iraq_player_spotlight' && (
            <ReoObsIraqPlayerSpotlight t={t} getField={getField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'iraq_match_ticker' && (
            <ReoObsIraqTicker t={t} getField={getField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'history_moment' && (
            <ReoObsIraqHistory t={t} getField={getField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'fan_pulse' && (
            <ReoObsIraqFanPulse t={t} getField={getField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'iraq_dashboard' && (
            <ReoObsIraqDashboard t={t} getField={getField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'golden_boot' && (
            <ReoObsGoldenBoot t={t} getField={getField} liveData={templateLiveData} />
          )}
          {variant === 'quote' && (
            <ReoObsQuote t={t} getField={getField} />
          )}
          {variant === 'ticker' && (
            <ReoObsTicker t={t} getField={getField} />
          )}
          {variant === 'analysis_board' && (
            <ReoObsAnalysis t={t} getField={getMatchField} resolveField={resolveField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'prediction' && (
            <ReoObsPrediction t={t} getField={getMatchField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'var_alert' && (
            <ReoObsVarAlert t={t} getField={getField} />
          )}
          {variant === 'match_report' && (
            <ReoObsMatchReport t={t} getField={getMatchField} resolveField={resolveField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'lower_third' && (
            <ReoObsLowerThird t={t} getField={getField} />
          )}
          {variant === 'match_preview' && (
            <ReoObsMatchPreview t={t} getField={getMatchField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'lineup' && (
            <ReoObsLineup t={t} getField={getMatchField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'match_result' && (
            <ReoObsMatchResult t={t} getField={getMatchField} resolveField={resolveField} liveData={templateLiveData} matchDetails={matchDetails} />
          )}
          {variant === 'player_spotlight' && (
            <ReoObsPlayerSpotlight t={t} getField={getMatchField} matchDetails={matchDetails} />
          )}
        </div>
      </div>
    </div>
    </MondialTransitionFrame>
  );
};

// ─── VariantProps ────────────────────────────────────────────────────────────

interface VariantProps {
  t: MondialTheme;
  getField: (id: string) => unknown;
  resolveField?: (fieldId: string, liveKey?: string) => unknown;
  liveData?: Record<string, unknown> | null;
  bridgeStatus?: 'idle' | 'connecting' | 'live' | 'error';
}

// ─── 1. Scoreboard كامل ───────────────────────────────────────────────────────

const MondialScoreboardVariant: React.FC<VariantProps> = ({
  t, getField, resolveField = (f, _liveKey?) => getField(f), bridgeStatus,
}) => {
  const competition = String(resolveField('competition', 'competition') || 'FIFA World Cup 2026');
  const homeTeam = String(resolveField('homeTeam', 'homeTeam') || DEMO_MATCH.homeTeamAr);
  const awayTeam = String(resolveField('awayTeam', 'awayTeam') || DEMO_MATCH.awayTeamAr);
  const homeScore = Number(resolveField('homeScore', 'homeScore') ?? DEMO_MATCH.homeScore);
  const awayScore = Number(resolveField('awayScore', 'awayScore') ?? DEMO_MATCH.awayScore);
  const minute = String(resolveField('minute', 'minute') || DEMO_MATCH.minute);
  const period = String(
    resolveField('matchPeriodLabel', 'matchPeriodLabel') ||
    resolveField('statusLabel', 'statusLabel') ||
    DEMO_MATCH.period
  );
  const status = String(resolveField('matchStatus', 'status') || 'PRE').toUpperCase();
  const homeLogo = String(resolveField('homeLogo', 'homeLogo') || getField('homeLogo') || '');
  const awayLogo = String(resolveField('awayLogo', 'awayLogo') || getField('awayLogo') || '');
  const homeShort = String(resolveField('homeShort', 'homeShort') || getField('homeShort') || homeTeam.slice(0, 3).toUpperCase());
  const awayShort = String(resolveField('awayShort', 'awayShort') || getField('awayShort') || awayTeam.slice(0, 3).toUpperCase());
  const homeColor = String(resolveField('homeColor', 'homeColor') || getField('homeColor') || t.accent);
  const awayColor = String(resolveField('awayColor', 'awayColor') || getField('awayColor') || t.accent2);
  const isLive = status === 'LIVE';

  // أحداث المباراة
  const eventsRaw = String(getField('eventsJson') || '[]');
  const events = safeParse<{ minute: number; type: string; player: string; team: string }[]>(eventsRaw, DEMO_MATCH.events);

  return (
    <div className="w-full h-full p-8 flex flex-col gap-6 relative z-10" dir="rtl">
      {/* الرأس */}
      <div
        className="rounded-2xl px-6 py-3 flex items-center justify-between relative overflow-hidden"
        style={{
          background: 'rgba(6, 12, 30, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2.5px]"
          style={{ background: `linear-gradient(to right, transparent, ${t.gold}, ${t.accent}, ${t.gold}, transparent)` }} />
        <TrophyIcon size={24} color={t.gold} />
        <div className="text-center">
          <div className="text-[12px] font-black uppercase tracking-[0.3em] text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {competition}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLive && <MondialLiveBadge t={t} />}
          {bridgeStatus === 'live' && (
            <MondialWaveform color={t.accent} bars={6} height={12} />
          )}
        </div>
      </div>

      {/* النتيجة الرئيسية */}
      <div
        className="flex-1 rounded-3xl p-8 flex items-center justify-between relative overflow-hidden"
        style={{
          background: 'rgba(6, 12, 30, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* توهج الخلفية */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 25% 50%, ${homeColor}20 0%, transparent 60%), radial-gradient(ellipse at 75% 50%, ${awayColor}20 0%, transparent 60%)`,
        }} />

        {/* الفريق المضيف */}
        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full opacity-40 blur-md transition duration-300 group-hover:opacity-70"
                 style={{ background: homeColor }} />
            <div className="relative">
              <MondialTeamLogo t={t} name={homeTeam} shortName={homeShort} logo={homeLogo} size={92} color={homeColor} />
            </div>
          </div>
          <div className="text-[22px] font-black text-center text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
            {homeTeam}
          </div>
          <MondialPill t={t} label="المضيف" color={homeColor} small />
        </div>

        {/* النتيجة */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <div
              className="text-[84px] font-black leading-none font-mono"
              style={{
                color: '#fff',
                textShadow: `0 0 30px ${homeColor}80, 0 4px 12px rgba(0,0,0,0.5)`,
                animation: 'mondialCountUp 0.3s ease',
              }}
            >
              {homeScore}
            </div>
            <div className="text-[40px] font-black text-white/30">—</div>
            <div
              className="text-[84px] font-black leading-none font-mono"
              style={{
                color: '#fff',
                textShadow: `0 0 30px ${awayColor}80, 0 4px 12px rgba(0,0,0,0.5)`,
                animation: 'mondialCountUp 0.3s ease',
              }}
            >
              {awayScore}
            </div>
          </div>
          {/* الوقت */}
          <div
            className="flex items-center gap-2 px-5 py-2 rounded-full relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1.5px solid rgba(255, 255, 255, 0.08)`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            {isLive && (
              <span className="w-2 h-2 rounded-full" style={{ background: t.danger, animation: 'mondialPulse 1s infinite, mondialGlow 1s infinite' }} />
            )}
            <span className="text-[17px] font-black font-mono text-white">
              {minute}{isLive ? "'" : ''} {period}
            </span>
          </div>
        </div>

        {/* الفريق الضيف */}
        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full opacity-40 blur-md transition duration-300 group-hover:opacity-70"
                 style={{ background: awayColor }} />
            <div className="relative">
              <MondialTeamLogo t={t} name={awayTeam} shortName={awayShort} logo={awayLogo} size={92} color={awayColor} />
            </div>
          </div>
          <div className="text-[22px] font-black text-center text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
            {awayTeam}
          </div>
          <MondialPill t={t} label="الضيف" color={awayColor} small />
        </div>
      </div>

      {/* أحداث المباراة */}
      {events.length > 0 && (
        <div
          className="rounded-2xl px-6 py-4"
          style={{
            background: 'rgba(6, 12, 30, 0.35)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}
        >
          <div className="flex gap-4 overflow-x-auto scrollbar-hide justify-center">
            {events.slice(0, 6).map((ev, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-full px-4.5 py-1.5 flex-shrink-0 shadow-sm">
                <span className="text-[11px] font-mono font-black text-white/40">{ev.minute}'</span>
                <span className="text-[13px]">
                  {ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : ev.type === 'red' ? '🟥' : '🔄'}
                </span>
                <span className="text-[12px] font-black text-white">
                  {ev.player}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ev.team === 'home' ? homeColor : awayColor }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 2. Scorebug (شريط علوي مدمج) ───────────────────────────────────────────

const MondialScorebugVariant: React.FC<VariantProps> = ({
  t, getField, resolveField = (f, _liveKey?) => getField(f), bridgeStatus,
}) => {
  const homeTeam = String(resolveField('homeShort', 'homeShort') || 'IRQ');
  const awayTeam = String(resolveField('awayShort', 'awayShort') || 'ARG');
  const homeScore = Number(resolveField('homeScore', 'homeScore') ?? 1);
  const awayScore = Number(resolveField('awayScore', 'awayScore') ?? 0);
  const minute = String(resolveField('minute', 'minute') || '67');
  const competition = String(getField('competitionShort') || 'WC26');
  const homeColor = String(resolveField('homeColor', 'homeColor') || getField('homeColor') || t.accent);
  const awayColor = String(resolveField('awayColor', 'awayColor') || getField('awayColor') || t.accent2);
  const isLive = String(resolveField('matchStatus', 'status') || 'PRE').toUpperCase() === 'LIVE';
  const position = String(getField('scorebugPosition') || 'TOP_RIGHT');

  const posStyle: React.CSSProperties =
    position === 'TOP_LEFT' ? { top: 24, left: 24 } :
    position === 'TOP_CENTER' ? { top: 24, left: '50%', transform: 'translateX(-50%)' } :
    position === 'BOTTOM_LEFT' ? { bottom: 24, left: 24 } :
    { top: 24, right: 24 };

  return (
    <div className="w-full h-full relative" dir="rtl">
      <div
        className="absolute flex items-center rounded-2xl overflow-hidden shadow-2xl"
        style={{
          ...posStyle,
          background: 'rgba(6, 12, 30, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 79, 254, 0.15)',
        }}
      >
        {/* Competition badge with diagonal sloped separator */}
        <div
          className="px-3 py-2.5 flex items-center gap-1.5 relative overflow-hidden"
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderLeft: '1.5px solid rgba(255, 255, 255, 0.08)',
            clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)',
            paddingRight: '16px',
          }}
        >
          {isLive && (
            <span className="w-2 h-2 rounded-full" style={{ background: t.danger, animation: 'mondialPulse 1s infinite, mondialGlow 1s infinite' }} />
          )}
          <span className="text-[10px] font-black tracking-widest text-white/95">
            {competition}
          </span>
        </div>
        {/* الفريق الأول */}
        <div
          className="px-4 py-2 flex items-center gap-3"
          style={{ borderLeft: '1.5px solid rgba(255, 255, 255, 0.05)' }}
        >
          <span className="text-[13px] font-black tracking-wider text-white" style={{ textShadow: `0 0 10px ${homeColor}60` }}>{homeTeam}</span>
          <span className="text-[22px] font-black font-mono text-white leading-none">{homeScore}</span>
          <div className="w-2 h-2 rounded-full" style={{ background: homeColor }} />
        </div>
        {/* الوقت */}
        <div
          className="px-3 py-2 flex flex-col items-center bg-black/30"
          style={{ borderLeft: '1.5px solid rgba(255, 255, 255, 0.05)' }}
        >
          <span className="text-[12px] font-black font-mono text-yellow-400">{minute}'</span>
        </div>
        {/* الفريق الثاني */}
        <div
          className="px-4 py-2 flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full" style={{ background: awayColor }} />
          <span className="text-[22px] font-black font-mono text-white leading-none">{awayScore}</span>
          <span className="text-[13px] font-black tracking-wider text-white" style={{ textShadow: `0 0 10px ${awayColor}60` }}>{awayTeam}</span>
        </div>
      </div>
    </div>
  );
};

// ─── 3. إحصائيات المباراة ────────────────────────────────────────────────────

const MondialMatchStatsVariant: React.FC<VariantProps> = ({
  t, getField, resolveField = (f, _liveKey?) => getField(f), liveData,
}) => {
  const homeTeam = String(resolveField('homeTeam', 'homeTeam') || DEMO_MATCH.homeTeamAr);
  const awayTeam = String(resolveField('awayTeam', 'awayTeam') || DEMO_MATCH.awayTeamAr);
  const homeScore = Number(resolveField('homeScore', 'homeScore') ?? DEMO_MATCH.homeScore);
  const awayScore = Number(resolveField('awayScore', 'awayScore') ?? DEMO_MATCH.awayScore);
  const homeColor = String(resolveField('homeColor', 'homeColor') || getField('homeColor') || t.accent);
  const awayColor = String(resolveField('awayColor', 'awayColor') || getField('awayColor') || t.accent2);
  const competition = String(getField('competition') || 'FIFA World Cup 2026');

  // إحصائيات — من البيانات الحية أو اليدوية أو التجريبية
  const rawStats = liveData?.stats as Record<string, number[]> | undefined;
  const S = DEMO_MATCH.stats;
  const stats = [
    { label: 'الاستحواذ %', home: rawStats?.possession?.[0] ?? Number(getField('statPossessionHome') || S.possession[0]), away: rawStats?.possession?.[1] ?? Number(getField('statPossessionAway') || S.possession[1]), pct: true },
    { label: 'التسديدات', home: rawStats?.shots?.[0] ?? Number(getField('statShotsHome') || S.shots[0]), away: rawStats?.shots?.[1] ?? Number(getField('statShotsAway') || S.shots[1]) },
    { label: 'على المرمى', home: rawStats?.shotsOnTarget?.[0] ?? Number(getField('statOnTargetHome') || S.shotsOnTarget[0]), away: rawStats?.shotsOnTarget?.[1] ?? Number(getField('statOnTargetAway') || S.shotsOnTarget[1]) },
    { label: 'الركنيات', home: rawStats?.corners?.[0] ?? Number(getField('statCornersHome') || S.corners[0]), away: rawStats?.corners?.[1] ?? Number(getField('statCornersAway') || S.corners[1]) },
    { label: 'المخالفات', home: rawStats?.fouls?.[0] ?? Number(getField('statFoulsHome') || S.fouls[0]), away: rawStats?.fouls?.[1] ?? Number(getField('statFoulsAway') || S.fouls[1]) },
    { label: 'الإنذارات', home: rawStats?.yellowCards?.[0] ?? Number(getField('statYellowHome') || S.yellowCards[0]), away: rawStats?.yellowCards?.[1] ?? Number(getField('statYellowAway') || S.yellowCards[1]) },
    { label: 'دقة التمرير %', home: rawStats?.passAccuracy?.[0] ?? Number(getField('statPassHome') || S.passAccuracy[0]), away: rawStats?.passAccuracy?.[1] ?? Number(getField('statPassAway') || S.passAccuracy[1]), pct: true },
  ];

  return (
    <div className="w-full h-full p-8 flex flex-col gap-6 relative z-10" dir="rtl">
      <MondialHeader
        t={t}
        eyebrow="MATCH STATISTICS · إحصائيات المباراة"
        title={`${homeTeam} ${homeScore} — ${awayScore} ${awayTeam}`}
        subtitle={competition}
        pills={<>
          <MondialPill t={t} label="WC 2026" gold />
          <MondialPill t={t} label="إحصائيات حية" pulse color={t.success} small />
        </>}
      />
      <div
        className="flex-1 rounded-3xl p-6 flex flex-col gap-4"
        style={{
          background: 'rgba(6, 12, 30, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* رأس الفريقين */}
        <div className="flex items-center justify-between mb-2 pb-3 border-b border-white/5">
          <span className="text-[18px] font-black text-white" style={{ textShadow: `0 0 10px ${homeColor}50` }}>{homeTeam}</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">المقارنة</span>
          <span className="text-[18px] font-black text-white" style={{ textShadow: `0 0 10px ${awayColor}50` }}>{awayTeam}</span>
        </div>
        <div className="flex-1 flex flex-col justify-around gap-2">
          {stats.map((stat, i) => (
            <MondialDualBar
              key={i}
              t={t}
              label={stat.label}
              homeVal={stat.home}
              awayVal={stat.away}
              homeColor={homeColor}
              awayColor={awayColor}
              percentage={stat.pct}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── 4. جدول المجموعة ────────────────────────────────────────────────────────

const MondialGroupTableVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const groupName = String(getField('groupName') || 'A');
  const teamsRaw = String(getField('groupTeamsJson') || '[]');
  const teams = safeParse<typeof DEMO_GROUP>(teamsRaw, DEMO_GROUP);
  const showGroup = teams.length > 0 ? teams : DEMO_GROUP;
  const competition = String(getField('competition') || 'FIFA World Cup 2026');

  const sortedTeams = [...showGroup].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return (b.gf - b.ga) - (a.gf - a.ga);
  });

  const qualifiedCount = Number(getField('qualifiedSpots') || 2);

  return (
    <div className="w-full h-full p-8 flex flex-col gap-6 relative z-10" dir="rtl">
      <MondialHeader
        t={t}
        eyebrow={`FIFA WORLD CUP 2026 · المجموعة ${groupName}`}
        title={`جدول المجموعة ${groupName}`}
        subtitle={competition}
        pills={<MondialPill t={t} label="WC 2026 STANDINGS" gold />}
        rightSlot={
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <TrophyIcon size={28} color={t.gold} />
          </div>
        }
      />
      <div
        className="flex-1 rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(6, 12, 30, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* رأس الجدول */}
        <div
          className="grid px-6 py-3"
          style={{
            gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr 1fr',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1.5px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {['#', 'الفريق', 'لعب', 'فاز', 'تعادل', 'خسر', 'أهداف', 'فارق', 'نقاط'].map((h, i) => (
            <div key={i} className="text-[11px] font-black uppercase text-center text-white/50" style={{ textAlign: i === 1 ? 'right' : 'center' }}>
              {h}
            </div>
          ))}
        </div>
        {/* الصفوف */}
        <div className="divide-y divide-white/5">
          {sortedTeams.map((team, i) => {
            const qualified = i < qualifiedCount;
            const gd = team.gf - team.ga;
            return (
              <div
                key={i}
                className="grid px-6 py-4 items-center transition duration-200 hover:bg-white/2"
                style={{
                  gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr 1fr',
                  borderRight: qualified ? `4px solid ${t.success}` : `4px solid transparent`,
                }}
              >
                <div className="text-[14px] font-black text-center" style={{ color: qualified ? t.success : 'rgba(255,255,255,0.3)' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex items-center gap-3">
                  <MondialFlag codeOrName={team.flag || team.name || '🏳️'} size={28} />
                  <span className="text-[15px] font-black text-white truncate">{team.nameAr || team.name}</span>
                  {qualified && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider" style={{ background: `${t.success}15`, color: t.success, border: `1px solid ${t.success}30` }}>
                      متأهل
                    </span>
                  )}
                </div>
                {[team.played, team.won, team.drawn, team.lost, `${team.gf}:${team.ga}`, gd > 0 ? `+${gd}` : gd, team.pts].map((v, j) => (
                  <div key={j} className="text-[14px] font-bold text-center" style={{ color: j === 6 ? t.gold : j === 5 ? (gd > 0 ? t.success : gd < 0 ? t.danger : 'white') : 'rgba(255,255,255,0.7)' }}>
                    {v}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── 5. سباق الحذاء الذهبي ──────────────────────────────────────────────────

const MondialGoldenBootVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const scorersRaw = String(getField('scorersJson') || '[]');
  const scorers = safeParse<typeof DEMO_SCORERS>(scorersRaw, DEMO_SCORERS);
  const showScorers = scorers.length > 0 ? scorers : DEMO_SCORERS;
  const maxGoals = Math.max(...showScorers.map(s => s.goals), 1);

  return (
    <div className="w-full h-full p-8 flex flex-col gap-6 relative z-10" dir="rtl">
      <MondialHeader
        t={t}
        eyebrow="GOLDEN BOOT · سباق الحذاء الذهبي"
        title="هدافو المونديال"
        subtitle="FIFA World Cup 2026 · Top Scorers"
        pills={<MondialPill t={t} label="LIVE RACE" pulse gold />}
        rightSlot={
          <div className="flex flex-col items-center gap-1 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <span className="text-[26px] leading-none">👟</span>
            <span className="text-[9px] font-black text-yellow-500 tracking-wider">الحذاء الذهبي</span>
          </div>
        }
      />
      <div className="flex-1 flex flex-col gap-3 justify-center">
        {showScorers.slice(0, 5).map((scorer, i) => (
          <div
            key={i}
            className="rounded-2xl px-5 py-3.5 flex items-center gap-4 relative overflow-hidden transition duration-200 hover:scale-[1.01]"
            style={{
              background: i === 0 ? `linear-gradient(90deg, rgba(255,230,0,0.06), rgba(6,12,30,0.5))` : 'rgba(6, 12, 30, 0.45)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${i === 0 ? `${t.gold}50` : 'rgba(255, 255, 255, 0.06)'}`,
              boxShadow: i === 0 ? `0 4px 20px ${t.gold}12` : '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {i === 0 && (
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(to right, transparent, ${t.gold}, transparent)` }} />
            )}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[13px] flex-shrink-0"
              style={{
                background: i === 0 ? t.gold : i === 1 ? '#D1D5DB' : i === 2 ? '#F59E0B' : 'rgba(255,255,255,0.05)',
                color: i < 3 ? '#000' : '#FFF',
                border: i >= 3 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                boxShadow: i < 3 ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {i + 1}
            </div>
            <MondialFlag codeOrName={scorer.flag || scorer.team || '🏳️'} size={32} className="flex-shrink-0 border-2 border-white/10" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-black truncate text-white">
                {scorer.nameAr || scorer.name}
              </div>
              <div className="text-[11px] font-bold text-white/45 tracking-wider mt-0.5">{scorer.team}</div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-28">
                <MondialBar t={t} value={(scorer.goals / maxGoals) * 100} color={i === 0 ? t.gold : t.accent} glow={i === 0} />
              </div>
              <div
                className="text-[26px] font-black w-8 text-center font-mono leading-none"
                style={{ color: i === 0 ? t.gold : '#fff', textShadow: i === 0 ? `0 0 10px ${t.gold}` : 'none' }}
              >
                {scorer.goals}
              </div>
              <span className="text-[12px] text-white/40 font-bold">أهداف</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ─── 6. اقتباس / تصريح ───────────────────────────────────────────────────────

// ─── 6. اقتباس / تصريح ───────────────────────────────────────────────────────

const MondialQuoteVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const quoteText = String(getField('quoteText') || 'هذه البطولة ستبقى في التاريخ. كرة القدم تجمع العالم.');
  const authorName = String(getField('authorName') || 'المدرب العام');
  const authorTeam = String(getField('authorTeam') || 'المنتخب');
  const authorImage = String(getField('authorImage') || '');
  const quoteCategory = String(getField('quoteCategory') || 'تصريح بارز');
  const authorFlag = String(getField('authorFlag') || '🏳️');
  const isRtlText = isRtl(quoteText);

  return (
    <div className="w-full h-full p-8 flex flex-col gap-4 relative z-10" dir="rtl">
      <div
        className="flex-1 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
        style={{
          background: 'rgba(6, 12, 30, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3.5px]"
          style={{ background: `linear-gradient(to right, transparent, ${t.gold}, ${t.accent}, transparent)` }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-20"
          style={{ background: t.gold }} />

        {/* عنوان */}
        <div className="flex items-center gap-2 mb-4">
          <MondialPill t={t} label={quoteCategory} gold />
          <MondialPill t={t} label="🏆 WC 2026 STATEMENT" small />
        </div>

        {/* النص */}
        <div
          className="text-[24px] font-black leading-relaxed flex-1 flex items-center text-white"
          style={{
            direction: isRtlText ? 'rtl' : 'ltr',
            textAlign: isRtlText ? 'right' : 'left',
            textShadow: `0 2px 14px rgba(0,0,0,0.6), 0 0 12px ${t.accent}30`,
          }}
        >
          <span style={{ color: t.gold, fontSize: 52, lineHeight: 1, marginLeft: 8 }}>"</span>
          {quoteText}
          <span style={{ color: t.gold, fontSize: 52, lineHeight: 1, marginRight: 8 }}>"</span>
        </div>

        <div
          className="flex items-center gap-4 mt-6 pt-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {authorImage ? (
            <img src={authorImage} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-yellow-500 shadow-md" />
          ) : (
            <MondialFlag codeOrName={authorFlag} size={52} style={{ border: `2px solid ${t.gold}`, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }} />
          )}
          <div>
            <div className="text-[17px] font-black text-white">{authorName}</div>
            <div className="text-[12px] font-bold text-white/40 tracking-wider mt-0.5">{authorTeam}</div>
          </div>
          <MondialFlag codeOrName={authorFlag} size={48} className="mr-auto border border-white/10" />
        </div>
      </div>
    </div>
  );
};

// ─── 7. Ticker شريط أخبار ────────────────────────────────────────────────────

const MondialTickerVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const label = String(getField('tickerLabel') || '🏆 أخبار المونديال');
  const content = String(getField('tickerContent') || 'أيمن حسين يقود العراق في مونديال 2026 — الفريق الأول عربياً يصل ثمن النهائي — مشجعون من 32 دولة في ملاعب أمريكا');
  const speed = Number(getField('scrollSpeed') || 20);

  return (
    <div className="w-full h-full flex items-end relative z-10">
      <div
        className="w-full overflow-hidden relative"
        style={{
          background: 'rgba(6, 12, 30, 0.75)',
          backdropFilter: 'blur(12px)',
          borderTop: '1.5px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
          height: 48,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(to right, transparent, ${t.gold}, ${t.accent}, transparent)` }} />
        <div className="flex items-center h-full gap-0">
          {/* Label with dynamic clip-path */}
          <div
            className="flex-shrink-0 px-6 h-full flex items-center font-black text-[12px] uppercase tracking-wider text-black relative z-10"
            style={{
              background: `linear-gradient(135deg, ${t.accent}, ${t.gold})`,
              minWidth: 180,
              clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0 100%)',
              paddingRight: '20px',
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-black mr-2 animate-ping" />
            {label}
          </div>
          {/* Scrolling text */}
          <div className="flex-1 overflow-hidden pr-4">
            <div
              className="whitespace-nowrap font-bold text-[14px] inline-block text-white"
              style={{
                animation: `scrollX ${speed}s linear infinite`,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {content} &nbsp;&nbsp;&nbsp;⚽&nbsp;&nbsp;&nbsp; {content}
            </div>
          </div>
        </div>
        <style>{`@keyframes scrollX { from { transform: translateX(100%); } to { transform: translateX(-100%); } }`}</style>
      </div>
    </div>
  );
};

// ─── 8. لوحة التحليل ─────────────────────────────────────────────────────────

const MondialAnalysisVariant: React.FC<VariantProps> = ({
  t, getField, resolveField = (f, _liveKey?) => getField(f), liveData,
}) => {
  const homeTeam = String(resolveField('homeTeam', 'homeTeam') || DEMO_MATCH.homeTeamAr);
  const awayTeam = String(resolveField('awayTeam', 'awayTeam') || DEMO_MATCH.awayTeamAr);
  const homeColor = String(getField('homeColor') || t.accent);
  const awayColor = String(getField('awayColor') || t.accent2);
  const analysis = String(getField('analysisText') || 'يلعب المنتخب العراقي بتشكيلة 4-3-3 معتمداً على الضغط العالي والهجمات المرتدة السريعة. أيمن حسين يشكل التهديد الأكبر من ناحية اليمين.');
  const keyBattle1 = String(getField('keyBattle1') || 'أيمن حسين vs Romero');
  const keyBattle2 = String(getField('keyBattle2') || 'وسط ميدان العراق vs De Paul');
  const formation = String(getField('homeFormation') || '4-3-3');
  const awayFormation = String(getField('awayFormation') || '4-2-3-1');

  const rawStats = liveData?.stats as Record<string, number[]> | undefined;
  const possession = rawStats?.possession || [Number(getField('possession') || 48), Number(getField('possessionAway') || 52)];

  return (
    <div className="w-full h-full p-8 flex flex-col gap-6 relative z-10" dir="rtl">
      <MondialHeader
        t={t}
        eyebrow="TACTICAL ANALYSIS · التحليل التكتيكي"
        title={`${homeTeam} vs ${awayTeam}`}
        subtitle="FIFA World Cup 2026 · تحليل عميق"
        pills={<>
          <MondialPill t={t} label={formation} color={homeColor} small />
          <MondialPill t={t} label={awayFormation} color={awayColor} small />
        </>}
      />
      <div className="flex-1 grid grid-cols-[1fr_260px] gap-6">
        <div className="flex flex-col gap-4">
          {/* تحليل نصي */}
          <div
            className="rounded-3xl p-6 flex-1 flex flex-col"
            style={{
              background: 'rgba(6, 12, 30, 0.45)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}
          >
            <div className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: t.accent }}>
              قراءة المباراة
            </div>
            <p className="text-[14.5px] leading-relaxed text-white/90" style={{ direction: 'rtl' }}>
              {analysis}
            </p>
          </div>
          {/* المواجهات الحاسمة */}
          <div
            className="rounded-3xl p-6"
            style={{
              background: 'rgba(6, 12, 30, 0.35)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: t.accent }}>
              ⚔️ المواجهات الحاسمة
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[keyBattle1, keyBattle2].map((b, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/2 border border-white/5 shadow-sm">
                  <span className="text-[18px] animate-pulse" style={{ color: homeColor }}>⚔</span>
                  <span className="text-[13px] font-black text-white leading-tight">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* استحواذ */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-3xl p-5 flex flex-col gap-4"
            style={{
              background: 'rgba(6, 12, 30, 0.45)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40" style={{ textAlign: 'center' }}>الاستحواذ الكروي</div>
            <div>
              <div className="flex justify-between mb-2 px-1">
                <span className="text-[18px] font-black font-mono text-white" style={{ textShadow: `0 0 10px ${homeColor}` }}>{possession[0]}%</span>
                <span className="text-[18px] font-black font-mono text-white" style={{ textShadow: `0 0 10px ${awayColor}` }}>{possession[1]}%</span>
              </div>
              <MondialDualBar t={t} label="" homeVal={possession[0]} awayVal={possession[1]} homeColor={homeColor} awayColor={awayColor} showNumbers={false} />
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[10px] font-black" style={{ color: homeColor }}>{homeTeam}</span>
                <span className="text-[10px] font-black" style={{ color: awayColor }}>{awayTeam}</span>
              </div>
            </div>
          </div>
          <div
            className="rounded-3xl p-6 flex-1 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${t.gold}15, rgba(0,0,0,0.3))`,
              border: `1.5px solid ${t.gold}35`,
              boxShadow: `0 4px 20px ${t.gold}08`
            }}
          >
            <div className="absolute top-[-30%] left-[-30%] w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: t.gold }} />
            <TrophyIcon size={52} color={t.gold} />
            <div className="text-[13px] font-black text-center text-white/90 tracking-wider leading-relaxed mt-1">
              FIFA WORLD CUP<br />
              <span className="text-yellow-400 font-mono text-[16px]">2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 9. مقياس التوقعات ───────────────────────────────────────────────────────

const MondialPredictionVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const title = String(getField('predictionTitle') || 'توقع المباراة');
  const homeTeam = String(getField('homeTeam') || 'العراق');
  const awayTeam = String(getField('awayTeam') || 'الأرجنتين');
  const homeWinPct = clamp(Number(getField('homeWinPct') || 35));
  const drawPct = clamp(Number(getField('drawPct') || 25));
  const awayWinPct = clamp(Number(getField('awayWinPct') || 40));
  const homeColor = String(getField('homeColor') || t.accent);
  const awayColor = String(getField('awayColor') || t.accent2);
  const source = String(getField('predictionSource') || 'REO Prediction Engine');

  return (
    <div className="w-full h-full p-8 flex flex-col gap-6 relative z-10" dir="rtl">
      <MondialHeader
        t={t}
        eyebrow="PREDICTION METER · توقعات المباراة"
        title={title}
        subtitle={`${homeTeam} vs ${awayTeam}`}
        pills={<MondialPill t={t} label="WC 2026 AI PREDICTION" gold small />}
      />
      <div
        className="flex-1 rounded-3xl p-8 flex flex-col gap-6 justify-center"
        style={{
          background: 'rgba(6, 12, 30, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* أشرطة التوقع */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: `فوز ${homeTeam}`, pct: homeWinPct, color: homeColor },
            { label: 'تعادل', pct: drawPct, color: '#94A3C8' },
            { label: `فوز ${awayTeam}`, pct: awayWinPct, color: awayColor },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-4 bg-white/2 border border-white/5 rounded-2xl p-5 shadow-sm">
              <div
                className="text-[40px] font-black font-mono leading-none"
                style={{ color: item.color, textShadow: `0 0 24px ${item.color}80` }}
              >
                {item.pct}%
              </div>
              <div className="w-full">
                <MondialBar t={t} value={item.pct} color={item.color} height={8} glow />
              </div>
              <div className="text-[13px] font-black text-center text-white/80">
                {item.label}
              </div>
            </div>
          ))}
        </div>
        {/* المصدر */}
        <div
          className="rounded-2xl px-5 py-3.5 flex items-center justify-between"
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span className="text-[11px] font-bold text-white/40">📊 {source}</span>
          <TrophyIcon size={18} color={t.gold} />
        </div>
      </div>
    </div>
  );
};

// ─── 10. VAR Alert ───────────────────────────────────────────────────────────

const MondialVarAlertVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const alertType = String(getField('varAlertType') || 'VAR');
  const message = String(getField('varMessage') || 'مراجعة هدف محتمل');
  const position = String(getField('varPosition') || 'CENTER');

  const alertColors: Record<string, string> = {
    VAR: '#FFE600',
    GOAL: '#00FFA9',
    RED_CARD: '#FF2D55',
    PENALTY: '#FFA978',
  };
  const alertColor = alertColors[alertType] || t.accent;

  const posStyle: React.CSSProperties =
    position === 'TOP' ? { top: '15%', left: '50%', transform: 'translateX(-50%)' } :
    position === 'BOTTOM' ? { bottom: '15%', left: '50%', transform: 'translateX(-50%)' } :
    { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="w-full h-full relative z-30">
      {/* خلفية شفافة ومظللة بشدة */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div
        className="absolute flex flex-col items-center gap-4 px-16 py-8 rounded-3xl"
        style={{
          ...posStyle,
          background: 'rgba(6, 12, 30, 0.85)',
          border: `2px solid ${alertColor}`,
          boxShadow: `0 0 50px ${alertColor}40, 0 0 100px ${alertColor}15, inset 0 0 24px rgba(255,255,255,0.02)`,
          animation: 'mondialGlow 1.5s ease-in-out infinite, mondialSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[4.5px] rounded-t-3xl"
          style={{ background: `linear-gradient(to right, transparent, ${alertColor}, transparent)` }} />
        <div className="text-[12px] font-black uppercase tracking-[0.45em] text-white/40">
          FIFA WORLD CUP 2026
        </div>
        <div
          className="text-[64px] font-black uppercase tracking-widest font-mono leading-none"
          style={{ color: alertColor, textShadow: `0 0 35px ${alertColor}` }}
        >
          {alertType === 'VAR' ? '⬛ VAR' : alertType === 'GOAL' ? '⚽ GOAL!' : alertType === 'RED_CARD' ? '🟥 RED' : '🟠 PENALTY'}
        </div>
        <div className="text-[20px] font-black text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{message}</div>
      </div>
    </div>
  );
};

// ─── 11. تقرير المباراة ──────────────────────────────────────────────────────

const MondialMatchReportVariant: React.FC<VariantProps> = ({
  t, getField, resolveField = (f, l) => getField(f),
}) => {
  const homeTeam = String(resolveField('homeTeam', 'homeTeam') || DEMO_MATCH.homeTeamAr);
  const awayTeam = String(resolveField('awayTeam', 'awayTeam') || DEMO_MATCH.awayTeamAr);
  const homeScore = Number(resolveField('homeScore', 'homeScore') ?? DEMO_MATCH.homeScore);
  const awayScore = Number(resolveField('awayScore', 'awayScore') ?? DEMO_MATCH.awayScore);
  const homeColor = String(getField('homeColor') || '#007A3D');
  const awayColor = String(getField('awayColor') || '#74ACDF');
  const reportText = String(getField('reportText') || 'انتهت المباراة بفوز تاريخي للمنتخب العراقي على الأرجنتين. أدهش الجميع بأداء متماسك ودفاع صلب وهجمات مرتدة فعالة.');
  const momName = String(getField('momName') || 'أيمن حسين');
  const momRating = Number(getField('momRating') || 8.7);
  const competition = String(getField('competition') || 'FIFA World Cup 2026');

  return (
    <div className="w-full h-full p-5 flex flex-col gap-4" dir="rtl">
      <MondialHeader
        t={t}
        eyebrow="MATCH REPORT · تقرير المباراة"
        title={`${homeTeam} ${homeScore} — ${awayScore} ${awayTeam}`}
        subtitle={competition}
        pills={<MondialPill t={t} label="تقرير نهائي" color={t.success} small />}
      />
      <div className="flex-1 grid grid-cols-[1fr_220px] gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: t.accent }}>
            ملخص المباراة
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: t.text }}>{reportText}</p>
        </div>
        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: `${t.gold}10`, border: `1px solid ${t.gold}40` }}
          >
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: t.gold }}>
              ⭐ رجل المباراة
            </div>
            <div className="text-[16px] font-black" style={{ color: t.text }}>{momName}</div>
            <MondialRating t={t} value={momRating} />
          </div>
          <div
            className="rounded-2xl p-4 grid grid-cols-2 gap-2 flex-1"
            style={{ background: t.surfaceDeep, border: `1px solid ${t.border}` }}
          >
            <MondialFieldCard t={t} label="الفائز" value={homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : 'تعادل'} accent={homeScore > awayScore ? homeColor : awayColor} />
            <MondialFieldCard t={t} label="النتيجة" value={`${homeScore} - ${awayScore}`} large />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 12. Lower Third ─────────────────────────────────────────────────────────

const MondialLowerThirdVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const name = String(getField('personName') || 'أيمن حسين');
  const role = String(getField('personRole') || 'مهاجم — المنتخب العراقي');
  const flag = String(getField('personFlag') || '🇮🇶');
  const competition = String(getField('competitionTag') || 'WC 2026');
  const accent = String(getField('accentOverride') || t.accent);

  return (
    <div className="w-full h-full flex items-end pb-8 pr-8">
      <div
        className="flex items-center gap-0 rounded-xl overflow-hidden shadow-2xl"
        style={{ border: `1px solid ${accent}60`, animation: 'mondialSlideIn 0.4s ease' }}
      >
        <div
          className="px-2 py-3 flex items-center justify-center"
          style={{ background: accent, width: 6 }}
        />
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: t.surfaceDeep }}
        >
          <MondialFlag codeOrName={flag} size={32} />
          <div>
            <div className="text-[16px] font-black" style={{ color: t.text }}>{name}</div>
            <div className="text-[11px]" style={{ color: t.sub }}>{role}</div>
          </div>
        </div>
        <div
          className="px-3 py-3 flex items-center"
          style={{ background: `${accent}20`, borderLeft: `1px solid ${accent}40` }}
        >
          <span className="text-[10px] font-black tracking-widest" style={{ color: accent }}>
            {competition}
          </span>
        </div>
      </div>
    </div>
  );
};


// ─── 13. إعلان موعد المباراة ───────────────────────────────────────────────────

const MondialMatchPreviewVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const matchStage = String(getField('matchStage') || 'المرحلة الجماعية · المجموعة A');
  const groupBadge = String(getField('groupBadge') || 'المجموعة A · الجولة 3');
  const matchDate = String(getField('matchDate') || 'الإثنين 15 يونيو 2026');
  const matchTime = String(getField('matchTime') || '21:00');
  const matchTimeLabel = String(getField('matchTimeLabel') || 'بتوقيت العراق');
  const matchVenue = String(getField('matchVenue') || 'يونيون بنك ستاديوم · لوس أنجلوس');
  
  const homeCode = String(getField('homeCode') || 'IQ');
  const homeName = String(getField('homeName') || 'العراق');
  const homeRank = String(getField('homeRank') || '#89');
  const homeW = Number(getField('homeW') ?? 2);
  const homeD = Number(getField('homeD') ?? 1);
  const homeL = Number(getField('homeL') ?? 0);

  const awayCode = String(getField('awayCode') || 'FR');
  const awayName = String(getField('awayName') || 'فرنسا');
  const awayRank = String(getField('awayRank') || '#2');
  const awayW = Number(getField('awayW') ?? 1);
  const awayD = Number(getField('awayD') ?? 1);
  const awayL = Number(getField('awayL') ?? 1);

  const ticker = String(getField('ticker') || '');
  const showStandings = getField('showStandings') === true;
  const standingsRaw = String(getField('standingsJson') || '[]');
  const standings = safeParse<{ code: string; name: string; p: number; pts: number }[]>(standingsRaw, []);

  const homeColor = '#007A3D';
  const awayColor = '#74ACDF';

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" dir="rtl">
      {/* Background radial effects */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 20% 50%, ${homeColor}15 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, ${awayColor}15 0%, transparent 50%)`
      }} />

      {/* Header */}
      <div className="flex items-center justify-between px-12 py-4 border-b border-white/10 relative z-10" style={{ background: t.surfaceDeep }}>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(to right, ${t.accent}, ${t.gold}, ${t.accent2}, ${t.success})` }} />
        <div className="flex items-center gap-3">
          <span className="text-[32px]">🏆</span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">FIFA WORLD CUP 2026</div>
            <div className="text-[13px] text-white/50">{matchStage}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-2">
          <div className="text-[20px]">🏟️</div>
          <div className="text-right">
            <div className="text-[14px] font-black text-yellow-500 tracking-wider">MATCH DAY</div>
            <div className="text-[10px] text-white/40">{matchDate}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-20 gap-8 relative z-10">
        
        {/* Left Side: Home Team */}
        <div className="flex-1 flex flex-col items-center gap-5">
          <MondialTeamLogo t={t} name={homeName} shortName={homeCode} size={160} color={homeColor} />
          <div className="text-[32px] font-black text-white">{homeName}</div>
          <div className="text-[12px] text-white/40">الترتيب العالمي: {homeRank}</div>
          <div className="flex gap-3">
            {[
              { val: homeW, label: 'فوز' },
              { val: homeD, label: 'تعادل' },
              { val: homeL, label: 'خسارة' }
            ].map((r, i) => (
              <div key={i} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <span className="text-[18px] font-black text-white">{r.val}</span>
                <span className="text-[9px] text-white/40">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Match Details */}
        <div className="w-80 flex flex-col items-center gap-4 shrink-0">
          <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-[11px] font-black text-blue-400">
            {groupBadge}
          </div>
          <div className="text-[56px] font-black text-white/10 tracking-widest leading-none">VS</div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-5 text-center shadow-lg shadow-yellow-500/20">
            <div className="text-[48px] font-black text-black leading-none">{matchTime}</div>
            <div className="text-[10px] font-black text-black/60 tracking-widest mt-1">{matchTimeLabel}</div>
          </div>
          <div className="text-[14px] font-bold text-white/70 text-center mt-2">{matchDate}</div>
          <div className="text-[12px] text-white/40 text-center">{matchVenue}</div>
        </div>

        {/* Right Side: Away Team */}
        <div className="flex-1 flex flex-col items-center gap-5">
          <MondialTeamLogo t={t} name={awayName} shortName={awayCode} size={160} color={awayColor} />
          <div className="text-[32px] font-black text-white">{awayName}</div>
          <div className="text-[12px] text-white/40">الترتيب العالمي: {awayRank}</div>
          <div className="flex gap-3">
            {[
              { val: awayW, label: 'فوز' },
              { val: awayD, label: 'تعادل' },
              { val: awayL, label: 'خسارة' }
            ].map((r, i) => (
              <div key={i} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <span className="text-[18px] font-black text-white">{r.val}</span>
                <span className="text-[9px] text-white/40">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Standings overlay (optional) */}
      {showStandings && standings.length > 0 && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 w-64 bg-slate-950/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-20">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10">
            <span className="text-[12px] font-black text-blue-400">جدول الترتيب</span>
            <span className="text-[16px] font-black text-yellow-500">GROUP</span>
          </div>
          <div className="flex flex-col">
            {standings.map((team, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 border-b border-white/5 last:border-b-0 hover:bg-white/5">
                <span className="text-[11px] font-bold text-white/40 w-4 text-center">{idx + 1}</span>
                <MondialFlag codeOrName={team.code} size={22} />
                <span className="text-[12px] font-bold text-white flex-1 truncate">{team.name}</span>
                <span className="text-[12px] font-medium text-white/40 w-6 text-center">{team.p}</span>
                <span className="text-[12px] font-black text-yellow-500 w-6 text-center">{team.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ticker bar at the bottom */}
      {ticker && (
        <div className="h-11 bg-slate-950 flex items-center overflow-hidden relative border-t border-white/5 shrink-0 z-10">
          <div className="flex items-center px-4 h-full bg-gradient-to-l from-red-600 to-yellow-500 text-black font-black text-[11px] shrink-0 gap-2 min-w-40">
            <span>🏆</span>
            <span>FIFA 2026</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap font-bold text-[13px] text-white/90 inline-block animate-[scrollX_30s_linear_infinite]">
              {ticker} &nbsp;&nbsp;&nbsp;⚽&nbsp;&nbsp;&nbsp; {ticker}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 14. تشكيلة المباراة ──────────────────────────────────────────────────────────

const MondialLineupVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const code = String(getField('code') || 'IQ');
  const teamName = String(getField('teamName') || 'منتخب العراق');
  const formation = String(getField('formation') || '4-3-3');
  const coach = String(getField('coach') || 'خيسوس كاساس');
  const color = String(getField('color') || '#007A3D');
  
  const playersRaw = String(getField('playersJson') || '[]');
  const defaultPlayers = [
    { num: 1, name: 'جلال حسن', pos: 'GK', x: 8, y: 50 },
    { num: 3, name: 'حسين علي', pos: 'DF', x: 28, y: 15 },
    { num: 4, name: 'سعد ناطق', pos: 'DF', x: 25, y: 38 },
    { num: 6, name: 'علي عدنان', pos: 'DF', x: 25, y: 62 },
    { num: 15, name: 'ضرغام إسماعيل', pos: 'DF', x: 28, y: 85 },
    { num: 8, name: 'إبراهيم بايش', pos: 'MF', x: 50, y: 20 },
    { num: 16, name: 'أمير العماري', pos: 'MF', x: 45, y: 50 },
    { num: 11, name: 'زيدان إقبال', pos: 'MF', x: 50, y: 80 },
    { num: 17, name: 'علي جاسم', pos: 'FW', x: 75, y: 18 },
    { num: 9, name: 'أيمن حسين', pos: 'FW', x: 82, y: 50 },
    { num: 10, name: 'مهند علي', pos: 'FW', x: 75, y: 82 }
  ];
  const players = safeParse<typeof defaultPlayers>(playersRaw, defaultPlayers);
  const showPlayers = players.length > 0 ? players : defaultPlayers;

  return (
    <div className="w-full h-full flex relative overflow-hidden" dir="rtl">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* Left side: Squad info panel */}
      <div className="w-[480px] h-full bg-slate-950/95 border-l border-white/10 p-10 flex flex-col relative z-10 shrink-0">
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-red-600 via-yellow-500 to-blue-600" />
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-6 mb-6">
          <MondialFlag codeOrName={code} size={64} />
          <div className="flex-1 min-w-0">
            <div className="text-[22px] font-black text-white truncate">{teamName}</div>
            <div className="text-[11px] text-white/40 mt-1">التشكيلة الرسمية للمباراة</div>
          </div>
          <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1 font-mono text-[14px] font-black text-blue-400">
            {formation}
          </div>
        </div>

        {/* Players list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {showPlayers.map((player, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-2.5 bg-white/2 border border-white/5 rounded-xl">
              <span className="font-mono text-[16px] font-black w-8" style={{ color }}>{player.num}</span>
              <span className="text-[14px] font-bold text-white flex-1 truncate">{player.name}</span>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{player.pos}</span>
            </div>
          ))}
        </div>

        {/* Coach */}
        {coach && (
          <div className="border-t border-white/10 pt-4 mt-6 flex items-center justify-between">
            <span className="text-[12px] text-white/40 font-bold">المدير الفني</span>
            <span className="text-[14px] font-black text-white">{coach}</span>
          </div>
        )}
      </div>

      {/* Right side: Field view */}
      <div className="flex-1 h-full p-12 flex items-center justify-center relative z-10">
        <div className="w-full h-full border-2 border-white/10 rounded-3xl relative bg-white/1 shadow-inner shadow-black/50 overflow-hidden">
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-white/10" />
          
          {/* Penalty areas */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-36 h-[320px] border-2 border-l-0 border-white/10 rounded-r-2xl" />
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-36 h-[320px] border-2 border-r-0 border-white/10 rounded-l-2xl" />

          {/* Players on Pitch */}
          {showPlayers.map((player, idx) => (
            <div
              key={idx}
              className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${player.x}%`, top: `${player.y}%` }}
            >
              <div
                className="w-8 h-8 rounded-full border border-white flex items-center justify-center font-mono text-[12px] font-black text-white shadow-lg shadow-black/55"
                style={{ backgroundColor: color }}
              >
                {player.num}
              </div>
              <div className="text-[11px] font-black text-white whitespace-nowrap bg-black/60 px-2 py-0.5 rounded border border-white/5">
                {player.name.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── 15. نتيجة المباراة الكبيرة ─────────────────────────────────────────────────

const MondialMatchResultVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const homeCode = String(getField('homeCode') || 'IQ');
  const homeTeam = String(getField('homeTeam') || 'العراق');
  const homeScore = Number(getField('homeScore') ?? 2);
  const homeColor = String(getField('homeColor') || '#007A3D');
  
  const awayCode = String(getField('awayCode') || 'FR');
  const awayTeam = String(getField('awayTeam') || 'فرنسا');
  const awayScore = Number(getField('awayScore') ?? 1);
  const awayColor = String(getField('awayColor') || '#003189');

  const stage = String(getField('stage') || 'المجموعة A · الجولة 3');
  const venue = String(getField('venue') || 'يونيون بنك ستاديوم · لوس أنجلوس');

  const homeGoalsRaw = String(getField('homeGoalsJson') || '[]');
  const awayGoalsRaw = String(getField('awayGoalsJson') || '[]');
  
  const homeGoals = safeParse<{ player: string; min: string }[]>(homeGoalsRaw, []);
  const awayGoals = safeParse<{ player: string; min: string }[]>(awayGoalsRaw, []);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" dir="rtl">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 30% 60%, ${homeColor}10 0%, transparent 55%), radial-gradient(ellipse at 70% 40%, ${awayColor}10 0%, transparent 55%)`
      }} />

      {/* Header */}
      <div className="flex items-center justify-between px-12 py-4 bg-slate-950/95 border-b border-white/10 relative z-10">
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(to right, ${homeColor}, #F5B800, ${awayColor}, transparent)` }} />
        <div className="flex items-center gap-3">
          <span className="text-[32px]">🏆</span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500">FIFA WORLD CUP 2026</div>
            <div className="text-[12px] text-white/50">{stage}</div>
          </div>
        </div>
        <div className="rounded-lg bg-red-600 px-4 py-1.5 text-[11px] font-black tracking-widest text-white animate-pulse">
          نهاية المباراة (FT)
        </div>
      </div>

      {/* Result Display */}
      <div className="flex-1 flex items-center justify-center px-20 gap-16 relative z-10">
        
        {/* Home Side */}
        <div className="flex-1 flex flex-col items-center gap-4">
          <MondialTeamLogo t={t} name={homeTeam} shortName={homeCode} size={160} color={homeColor} />
          <div className="text-[36px] font-black text-white">{homeTeam}</div>
        </div>

        {/* Center score */}
        <div className="flex flex-col items-center gap-4 shrink-0">
          <div className="flex items-center gap-8">
            <span className="font-mono text-[110px] font-black leading-none" style={{ color: homeColor, textShadow: `0 0 40px ${homeColor}40` }}>
              {homeScore}
            </span>
            <span className="text-[64px] font-black text-white/10">—</span>
            <span className="font-mono text-[110px] font-black leading-none" style={{ color: awayColor, textShadow: `0 0 40px ${awayColor}40` }}>
              {awayScore}
            </span>
          </div>
          <div className="text-[13px] font-black text-white/40 tracking-wider text-center">{venue}</div>
        </div>

        {/* Away Side */}
        <div className="flex-1 flex flex-col items-center gap-4">
          <MondialTeamLogo t={t} name={awayTeam} shortName={awayCode} size={160} color={awayColor} />
          <div className="text-[36px] font-black text-white">{awayTeam}</div>
        </div>

      </div>

      {/* Scorers list */}
      <div className="flex justify-between gap-16 w-full max-w-[1200px] mx-auto mb-12 px-20 relative z-10">
        
        {/* Home Scorers (aligned left) */}
        <div className="flex-1 flex flex-col items-start gap-2">
          {homeGoals.map((g, idx) => (
            <div key={idx} className="flex items-center gap-2.5 px-4 py-2 bg-white/3 border border-white/5 rounded-xl text-[13px] font-bold text-white/90">
              <span>⚽</span>
              <span>{g.player}</span>
              <span className="font-mono text-[11px] text-white/40">{g.min}'</span>
            </div>
          ))}
        </div>

        {/* Away Scorers (aligned right) */}
        <div className="flex-1 flex flex-col items-end gap-2">
          {awayGoals.map((g, idx) => (
            <div key={idx} className="flex items-center gap-2.5 px-4 py-2 bg-white/3 border border-white/5 rounded-xl text-[13px] font-bold text-white/90">
              <span className="font-mono text-[11px] text-white/40">{g.min}'</span>
              <span>{g.player}</span>
              <span>⚽</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

// ─── 16. تسليط الضوء على لاعب ────────────────────────────────────────────────────

const MondialPlayerSpotlightVariant: React.FC<VariantProps> = ({ t, getField }) => {
  const name = String(getField('name') || 'أيمن حسين');
  const code = String(getField('code') || 'IQ');
  const position = String(getField('position') || 'مهاجم صريح');
  const team = String(getField('team') || 'منتخب العراق');
  const rating = String(getField('rating') || '9.1');
  
  const statsRaw = String(getField('statsJson') || '[]');
  const defaultStats = [
    { label: 'الأهداف المسجلة', value: '2' },
    { label: 'التسديدات على المرمى', value: '3 / 4' },
    { label: 'صناعة الفرص المحققة', value: '1' },
    { label: 'الفوز بالالتحامات الهوائية', value: '85%' },
    { label: 'دقة التمريرات', value: '79%' },
    { label: 'المسافة المقطوعة', value: '9.4 كم' }
  ];
  const stats = safeParse<typeof defaultStats>(statsRaw, defaultStats);
  const showStats = stats.length > 0 ? stats : defaultStats;

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Background overlay */}
      <div className="absolute inset-0 pointer-events-none bg-slate-950/90 z-0" />
      
      {/* Player Card */}
      <div className="w-[880px] bg-slate-900/90 border border-white/10 rounded-3xl p-10 flex gap-10 relative z-10 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-yellow-500 to-blue-600" />
        
        {/* Right Section: Profile & Rating */}
        <div className="w-[280px] flex flex-col items-center text-center border-l border-white/10 pl-10 shrink-0">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-900 to-slate-800 border-2 border-white/10 flex items-center justify-center text-[56px] mb-5 shadow-lg">
            🏃‍♂️
          </div>
          <MondialFlag codeOrName={code} size={44} className="mb-3" />
          <div className="text-[26px] font-black text-white leading-tight mb-1">{name}</div>
          <div className="text-[12px] text-white/40 font-bold mb-6">{position} · {team}</div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl px-6 py-4 shadow-lg shadow-yellow-500/10 text-center w-full">
            <div className="font-mono text-[36px] font-black text-black leading-none">{rating}</div>
            <div className="text-[10px] font-black text-black/70 uppercase tracking-widest mt-1">تقييم اللاعب</div>
          </div>
        </div>

        {/* Left Section: Stats Grid */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 mb-6">
            إحصائيات المباراة الحالية
          </div>
          <div className="grid grid-cols-2 gap-4">
            {showStats.map((s, idx) => (
              <div key={idx} className="bg-white/2 border border-white/5 rounded-2xl p-4">
                <div className="font-mono text-[22px] font-black text-white">{s.value}</div>
                <div className="text-[12px] text-white/40 font-bold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Mondial2026Renderer;
