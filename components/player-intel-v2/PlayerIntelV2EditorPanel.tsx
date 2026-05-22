/**
 * Player Intel V2 — Editor side panel.
 *
 * Self-contained: presets, metric picker, mode toggle, variants, refresh button.
 * Reads/writes directly to overlay fields via a callback.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, EyeOff, Plus, Sparkles, RefreshCw, Users, User, AlertTriangle, Download, Trash2 } from 'lucide-react';
import type { OverlayField } from '../../types';
import { PLAYER_INTEL_PRESETS, METRIC_CATEGORIES, getPreset } from './playerIntelV2Presets';
import { getMetricAr } from './playerIntelV2Labels';
import {
  resolveQuery,
  detectCompareQuery,
  detectPresetIntent,
  type RegistryEntry as ResolverEntry,
} from './playerIntelV2PlayerResolver';
import {
  saveDynamicProfile,
  listDynamicProfiles,
  deleteDynamicProfile,
  type DynamicEntry,
} from './playerIntelV2DynamicStore';
import {
  getImageOverride,
  setImageOverride,
  clearImageOverride,
  fileToDataUrl,
  type ImageOverride,
  type ImageMode,
  type ImageObjectFit,
  type ImagePosition,
} from './playerIntelV2ImageStore';
import PlayerIntelV2ImageEditor from './PlayerIntelV2ImageEditor';

const SAMPLES_BASE = '/player-intel-v2-samples';

interface RegistryEntry {
  id: string;
  name: string;
  club: string;
  season?: string;
  position?: string;
  file: string;
}

interface BroadcastFile {
  player?: { name?: string; club?: string };
  broadcastCards?: Record<string, { items?: Array<{ key: string; label?: string; labelAr?: string | null }> }>;
}

interface Props {
  fields: OverlayField[];
  getDraftValue: (id: string) => unknown;
  applyChanges: (updates: Record<string, unknown>) => void;
  /** Optional click handler to flash a "تم التحديث" toast or similar. */
  onRefresh?: (msg: string) => void;
}

const _readJson = <T,>(s: string, fallback: T): T => {
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

const PlayerIntelV2EditorPanel: React.FC<Props> = ({ fields, getDraftValue, applyChanges, onRefresh }) => {
  // Field readers
  const mode = String(getDraftValue('mode') || 'single');
  const playerA = String(getDraftValue('samplePlayer') || 'lamine-yamal');
  const playerB = String(getDraftValue('samplePlayerB') || 'robert-lewandowski');
  const cardType = String(getDraftValue('cardType') || 'attacker_card');
  const visualVariant = String(getDraftValue('visualVariant') || 'premium_broadcast');
  const visualTheme = String(getDraftValue('visualTheme') || 'broadcast_dark');

  const heroKeys = _readJson<string[]>(String(getDraftValue('playerIntelHeroMetricsJson') || '[]'), []);
  const secondaryKeys = _readJson<string[]>(String(getDraftValue('playerIntelSecondaryMetricsJson') || '[]'), []);
  const hiddenKeys = _readJson<string[]>(String(getDraftValue('playerIntelHiddenMetricsJson') || '[]'), []);

  // Local UI state
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [broadcastA, setBroadcastA] = useState<BroadcastFile | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'scope' | 'metrics' | 'variants' | 'image' | 'assistant'>('basic');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [assistantText, setAssistantText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Player search state
  const [playerSearch, setPlayerSearch] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<ResolverEntry & { score: number }>>([]);
  const [searchStatus, setSearchStatus] = useState<{ kind: 'idle' | 'searching' | 'found' | 'none' | 'building' | 'weakClub'; msg?: string }>({ kind: 'idle' });

  // FotMob live search state
  const [fotmobMatches, setFotmobMatches] = useState<Array<{ fotmobId: number; name: string; club: string; confidence: number; clubMatch?: 'strong' | 'medium' | 'weak' | 'none' }>>([]);
  const [fotmobStatus, setFotmobStatus] = useState<{ kind: 'idle' | 'searching' | 'found' | 'none' | 'building' | 'success' | 'weakClub'; msg?: string }>({ kind: 'idle' });

  // Resolved club state (universal resolver)
  const [resolvedClub, setResolvedClub] = useState<{ teamId: number | null; name: string; confidence: number; leagueName?: string; countryCode?: string } | null>(null);
  const [clubResolveLoading, setClubResolveLoading] = useState(false);
  const [dynamicEntries, setDynamicEntries] = useState<DynamicEntry[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Load registry on mount
  useEffect(() => {
    fetch(`${SAMPLES_BASE}/index.json`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.players) setRegistry(d.players as RegistryEntry[]); })
      .catch(() => setRegistry([]));
  }, []);

  // Load dynamic profiles from localStorage
  useEffect(() => {
    setDynamicEntries(listDynamicProfiles());
  }, [refreshTick]);

  // Combined registry (static + dynamic)
  const combinedRegistry = useMemo<RegistryEntry[]>(() => {
    const dynAsRegistry: RegistryEntry[] = dynamicEntries.map((d) => ({
      id: d.id,
      name: d.name,
      club: d.club,
      season: d.season,
      position: d.position,
      file: '__dynamic__',
    }));
    // Dynamic first (most recent at top)
    const seen = new Set<string>();
    const merged: RegistryEntry[] = [];
    for (const e of [...dynAsRegistry, ...registry]) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      merged.push(e);
    }
    return merged;
  }, [registry, dynamicEntries]);

  // Load broadcast file for player A to discover available metrics
  useEffect(() => {
    fetch(`${SAMPLES_BASE}/${playerA}.broadcast.json`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setBroadcastA(d as BroadcastFile))
      .catch(() => setBroadcastA(null));
  }, [playerA]);

  // Discover all available metric keys from broadcast cards
  const availableMetricKeys = useMemo(() => {
    const all = new Set<string>();
    const cards = broadcastA?.broadcastCards || {};
    Object.values(cards).forEach((card) => {
      const c = card as { items?: Array<{ key?: string }> };
      (c?.items || []).forEach((it) => { if (it.key) all.add(it.key); });
    });
    // Also include known canonical keys from categories
    Object.values(METRIC_CATEGORIES).forEach((cat) => {
      cat.keys.forEach((k) => all.add(k));
    });
    return Array.from(all);
  }, [broadcastA]);

  // Apply preset
  const applyPreset = (presetId: string) => {
    const preset = getPreset(presetId);
    if (!preset) return;
    applyChanges({
      cardType: presetId,
      playerIntelHeroMetricsJson: JSON.stringify(preset.hero),
      playerIntelSecondaryMetricsJson: JSON.stringify(preset.secondary),
      playerIntelHiddenMetricsJson: JSON.stringify([]),
    });
    flashToast(`تم تطبيق "${preset.label}" — ${preset.hero.length} رئيسية + ${preset.secondary.length} ثانوية`);
  };

  // Move metric between zones
  const moveMetric = (key: string, target: 'hero' | 'secondary' | 'hidden' | 'remove') => {
    const cleanedHero = heroKeys.filter((k) => k !== key);
    const cleanedSecondary = secondaryKeys.filter((k) => k !== key);
    const cleanedHidden = hiddenKeys.filter((k) => k !== key);

    let nextHero = cleanedHero;
    let nextSecondary = cleanedSecondary;
    let nextHidden = cleanedHidden;

    if (target === 'hero' && nextHero.length < 5) {
      nextHero = [...cleanedHero, key];
    } else if (target === 'secondary' && nextSecondary.length < 8) {
      nextSecondary = [...cleanedSecondary, key];
    } else if (target === 'hidden') {
      nextHidden = [...cleanedHidden, key];
    } else if (target === 'remove') {
      // already removed from all
    }

    applyChanges({
      playerIntelHeroMetricsJson: JSON.stringify(nextHero),
      playerIntelSecondaryMetricsJson: JSON.stringify(nextSecondary),
      playerIntelHiddenMetricsJson: JSON.stringify(nextHidden),
      cardType: 'custom',
    });
  };

  const reorderMetric = (key: string, zone: 'hero' | 'secondary', dir: -1 | 1) => {
    const list = zone === 'hero' ? [...heroKeys] : [...secondaryKeys];
    const i = list.indexOf(key);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    applyChanges({
      [zone === 'hero' ? 'playerIntelHeroMetricsJson' : 'playerIntelSecondaryMetricsJson']: JSON.stringify(list),
      cardType: 'custom',
    });
  };

  const flashToast = (msg: string) => {
    setToast(msg);
    onRefresh?.(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Search & build profile ──────────────────────────────────────────────────

  const runPlayerSearch = async () => {
    const q = playerSearch.trim();
    const c = clubSearch.trim();
    if (!q) return;
    setSearchStatus({ kind: 'searching', msg: 'جارٍ البحث...' });

    // Local match first
    const local = resolveQuery(q, registry);
    if (local.length > 0) {
      // Re-rank locally if club provided
      let ranked = local;
      let weakLocalClub = false;
      if (c) {
        const cLower = c.toLowerCase();
        let strongHit = false;
        ranked = local
          .map((m) => {
            const entryClub = (m.entry.club || '').toLowerCase();
            const bonus = entryClub && entryClub.includes(cLower.split(/\s+/)[0]) ? 0.4 : 0;
            if (bonus) strongHit = true;
            return { ...m, score: Math.min(1, m.score + bonus) };
          })
          .sort((a, b) => b.score - a.score);
        if (!strongHit) weakLocalClub = true;
      }
      setSearchResults(ranked.map((m) => ({ ...m.entry, score: m.score })));
      if (ranked.length === 1) {
        applyChanges({ samplePlayer: ranked[0].entry.id });
        setSearchStatus({
          kind: weakLocalClub ? 'weakClub' : 'found',
          msg: weakLocalClub
            ? `لم نجد تطابقًا قويًا مع "${c}"، اخترنا "${ranked[0].entry.name}".`
            : `تم العثور على "${ranked[0].entry.name}" داخل المكتبة وتحديده.`,
        });
        flashToast(`تم اختيار ${ranked[0].entry.name}`);
      } else {
        setSearchStatus({
          kind: weakLocalClub ? 'weakClub' : 'found',
          msg: weakLocalClub
            ? `${ranked.length} نتائج — لم نجد تطابقًا قويًا مع النادي.`
            : `${ranked.length} نتائج — اختر واحدة من القائمة.`,
        });
      }
      return;
    }

    // Remote search via API
    try {
      const r = await fetch('/api/player-intel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search-player', query: q, club: c || undefined, mode: 'search_only' }),
      });
      const data = await r.json();
      if (data.ok && Array.isArray(data.matches) && data.matches.length > 0) {
        setSearchResults(data.matches.map((m: ResolverEntry & { confidence: number }) => ({
          ...m, score: m.confidence,
        })));
        const weak = !!data.weakClubMatch;
        if (data.matches.length === 1) {
          applyChanges({ samplePlayer: data.matches[0].id });
          setSearchStatus({
            kind: weak ? 'weakClub' : 'found',
            msg: weak
              ? `لم نجد تطابقًا قويًا مع النادي، اخترنا "${data.matches[0].name}".`
              : `تم العثور على "${data.matches[0].name}" وتحديده.`,
          });
          flashToast(`تم اختيار ${data.matches[0].name}`);
        } else {
          setSearchStatus({
            kind: weak ? 'weakClub' : 'found',
            msg: weak
              ? `${data.matches.length} نتائج — لم نجد تطابقًا قويًا مع النادي.`
              : `${data.matches.length} نتائج — اختر واحدة.`,
          });
        }
      } else {
        setSearchResults([]);
        setSearchStatus({
          kind: 'none',
          msg: data.messageAr || 'لم يتم العثور على اللاعب. اكتب الاسم بالإنجليزي أو أضف النادي.',
        });
      }
    } catch {
      setSearchStatus({ kind: 'none', msg: 'تعذّر الاتصال بخدمة البحث.' });
    }
  };

  const selectSearchResult = (id: string, slot: 'a' | 'b' = 'a') => {
    applyChanges(slot === 'b' ? { samplePlayerB: id } : { samplePlayer: id });
    const name = (searchResults.find((r) => r.id === id))?.name || id;
    flashToast(`تم اختيار ${name}`);
    setSearchStatus({ kind: 'found', msg: `تم اختيار ${name}.` });
  };

  // ── FotMob live search ──────────────────────────────────────────────────────

  const resolveClubLive = async () => {
    const c = clubSearch.trim();
    if (!c) { setResolvedClub(null); return; }
    setClubResolveLoading(true);
    try {
      const r = await fetch('/api/player-intel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'club-resolve', query: c }),
      });
      const data = await r.json();
      if (data.ok && data.resolved) {
        setResolvedClub(data.resolved);
      } else {
        setResolvedClub(null);
      }
    } catch {
      setResolvedClub(null);
    } finally {
      setClubResolveLoading(false);
    }
  };

  const runFotMobSearch = async () => {
    const q = playerSearch.trim();
    const c = clubSearch.trim();
    if (!q) return;
    setFotmobStatus({ kind: 'searching', msg: 'جاري البحث في FotMob...' });
    setFotmobMatches([]);

    try {
      const r = await fetch('/api/player-intel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fotmob-search', query: q, club: c || undefined }),
      });
      const data = await r.json();
      if (data.ok && Array.isArray(data.matches) && data.matches.length > 0) {
        setFotmobMatches(data.matches);
        const weak = !!data.weakClubMatch;
        setFotmobStatus({
          kind: weak ? 'weakClub' : 'found',
          msg: data.messageAr || `تم العثور على ${data.matches.length} نتائج.`,
        });
      } else {
        setFotmobStatus({
          kind: 'none',
          msg: data.messageAr || 'لم يتم العثور على اللاعب في FotMob.',
        });
      }
    } catch {
      setFotmobStatus({ kind: 'none', msg: 'تعذّر الاتصال بـ FotMob. تحقق من الشبكة.' });
    }
  };

  const buildAndAddPlayer = async (match: { fotmobId: number; name: string; club: string }) => {
    setFotmobStatus({ kind: 'building', msg: `جاري بناء بروفايل ${match.name}...` });
    try {
      const r = await fetch('/api/player-intel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'build-fotmob-profile',
          fotmobId: match.fotmobId,
          name: match.name,
          season: '2025-26',
        }),
      });
      const data = await r.json();
      if (!data.ok) {
        setFotmobStatus({
          kind: 'none',
          msg: data.messageAr || 'فشل بناء البروفايل.',
        });
        return;
      }

      // Persist to localStorage
      saveDynamicProfile(data.slug, data.profile, {
        name: data.profile.player.name,
        club: data.profile.player.club,
        season: data.profile.player.season,
        position: data.profile.player.position,
      });
      setRefreshTick((t) => t + 1);

      // Auto-select the new player
      applyChanges({ samplePlayer: data.slug });
      setFotmobStatus({
        kind: 'success',
        msg: `تمت إضافة ${data.profile.player.name} من FotMob (${data.summary?.itemsTotal || 0} إحصائية).`,
      });
      flashToast(`تمت إضافة ${data.profile.player.name}`);
      setFotmobMatches([]);
      setPlayerSearch('');
    } catch {
      setFotmobStatus({ kind: 'none', msg: 'تعذّر بناء البروفايل.' });
    }
  };

  const removeDynamicEntry = (slug: string) => {
    deleteDynamicProfile(slug);
    setRefreshTick((t) => t + 1);
  };

  // Refresh button — re-applies preset if cardType is not custom
  const refreshCard = () => {
    if (cardType !== 'custom') {
      const preset = getPreset(cardType);
      if (preset && (heroKeys.length === 0 || secondaryKeys.length === 0)) {
        applyPreset(cardType);
        return;
      }
    }
    flashToast(`تم تحديث البطاقة — ${heroKeys.length} رئيسية و ${secondaryKeys.length} ثانوية`);
  };

  // Assistant
  const runAssistant = () => {
    const txt = assistantText.trim();
    if (!txt) return;

    // Detect compare
    const compare = detectCompareQuery(txt);
    let nextMode = mode;
    let nextPlayer = playerA;
    let nextPlayerB = playerB;

    if (compare) {
      nextMode = 'compare';
      const matchesA = resolveQuery(compare.queryA, registry);
      const matchesB = resolveQuery(compare.queryB, registry);
      if (matchesA[0]) nextPlayer = matchesA[0].entry.id;
      if (matchesB[0]) nextPlayerB = matchesB[0].entry.id;
    } else {
      nextMode = 'single';
      const matches = resolveQuery(txt, registry);
      if (matches[0]) nextPlayer = matches[0].entry.id;
    }

    // Detect preset
    const detectedPreset = detectPresetIntent(txt);
    const nextPreset = detectedPreset || cardType;

    const preset = getPreset(nextPreset);
    applyChanges({
      mode: nextMode,
      samplePlayer: nextPlayer,
      samplePlayerB: nextPlayerB,
      cardType: nextPreset,
      ...(preset ? {
        playerIntelHeroMetricsJson: JSON.stringify(preset.hero),
        playerIntelSecondaryMetricsJson: JSON.stringify(preset.secondary),
      } : {}),
    });

    const playerName = registry.find((r) => r.id === nextPlayer)?.name || nextPlayer;
    const presetLabel = preset?.label || nextPreset;
    if (nextMode === 'compare') {
      const playerBName = registry.find((r) => r.id === nextPlayerB)?.name || nextPlayerB;
      flashToast(`مقارنة: ${playerName} ضد ${playerBName} (${presetLabel})`);
    } else {
      flashToast(`تم اختيار ${playerName} وتطبيق ${presetLabel}`);
    }
    setAssistantText('');
  };

  const filteredMetrics = useMemo(() => {
    // Build full pool: all category keys + any extra discovered from broadcastA
    const fromCategories = new Set<string>();
    Object.values(METRIC_CATEGORIES).forEach((cat) => cat.keys.forEach((k) => fromCategories.add(k)));
    const fullPool = new Set<string>([...fromCategories, ...availableMetricKeys]);

    let pool: string[];
    if (activeCategory === 'all') {
      pool = Array.from(fullPool);
    } else {
      const cat = METRIC_CATEGORIES[activeCategory];
      pool = cat ? cat.keys.slice() : [];
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      pool = pool.filter((k) => {
        const ar = getMetricAr(k) || '';
        return (
          k.toLowerCase().includes(q) ||
          ar.toLowerCase().includes(q) ||
          ar.includes(search.trim()) // raw Arabic match
        );
      });
    }
    return pool;
  }, [activeCategory, availableMetricKeys, search]);

  // Build a value/source/scope map from broadcast for each metric key
  const metricMeta = useMemo(() => {
    const map: Record<string, { value?: unknown; source?: string; rank?: number; per90?: number; label?: string }> = {};
    const cards = broadcastA?.broadcastCards || {};
    for (const card of Object.values(cards)) {
      const c = card as { items?: Array<{ key?: string; label?: string; value?: unknown; source?: string; percentileRank?: number; per90?: number }> };
      for (const it of (c?.items || [])) {
        if (!it.key) continue;
        if (!map[it.key]) {
          map[it.key] = {
            value: it.value,
            source: it.source,
            rank: it.percentileRank,
            per90: it.per90,
            label: it.label,
          };
        }
      }
    }
    return map;
  }, [broadcastA]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="shrink-0 max-h-[62vh] overflow-y-auto border-b border-cyan-900/35 bg-gradient-to-b from-cyan-950/30 to-slate-950/40 p-4 [scrollbar-width:thin] space-y-3">
      {/* Header + Refresh */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-black text-cyan-100">استخبارات اللاعب V2</h3>
        </div>
        <button
          onClick={refreshCard}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-cyan-900/40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث البطاقة
        </button>
      </div>

      {toast && (
        <div className="bg-green-900/30 border border-green-700/40 text-green-300 text-xs px-3 py-2 rounded-lg">
          ✓ {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 pb-0">
        {[
          { id: 'basic', label: 'أساسي' },
          { id: 'scope', label: 'نطاق الإحصائيات' },
          { id: 'metrics', label: 'اختيار الإحصائيات' },
          { id: 'image', label: 'الصورة' },
          { id: 'variants', label: 'التصاميم' },
          { id: 'assistant', label: 'المساعد' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={[
              'text-xs font-bold px-3 py-1.5 rounded-t-md transition-colors',
              activeTab === tab.id
                ? 'bg-cyan-900/40 text-cyan-200 border border-cyan-800/60 border-b-transparent'
                : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── BASIC TAB ─── */}
      {activeTab === 'basic' && (
        <div className="space-y-3">
          {/* Player Search Box */}
          <div className="rounded-lg border border-cyan-800/40 bg-slate-950/40 p-3 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-200">بحث وإضافة لاعب من FotMob</span>
            </div>
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runFotMobSearch(); }}
              placeholder="اكتب اسم اللاعب والنادي بالعربي أو الإنجليزي..."
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500"
              dir="rtl"
            />
            <input
              type="text"
              value={clubSearch}
              onChange={(e) => { setClubSearch(e.target.value); if (resolvedClub) setResolvedClub(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') runFotMobSearch(); }}
              onBlur={() => { if (clubSearch.trim() && !resolvedClub) resolveClubLive(); }}
              placeholder="النادي اختياري لتضييق النتائج، مثال: برشلونة"
              className="w-full bg-slate-900 border border-slate-700/60 text-slate-300 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-cyan-500"
              dir="rtl"
            />

            {/* Resolved club chip */}
            {clubSearch.trim() && (
              <div className="flex items-center gap-1.5">
                {clubResolveLoading ? (
                  <span className="text-[10px] text-slate-500">جارٍ تحديد النادي...</span>
                ) : resolvedClub ? (
                  <span
                    className={[
                      'text-[10px] font-bold px-2 py-1 rounded-md inline-flex items-center gap-1',
                      resolvedClub.teamId
                        ? 'bg-cyan-900/30 border border-cyan-700/50 text-cyan-200'
                        : 'bg-amber-900/20 border border-amber-700/40 text-amber-300',
                    ].join(' ')}
                  >
                    {resolvedClub.teamId ? '✓' : '~'} {resolvedClub.name}
                    {resolvedClub.teamId && (
                      <span className="text-cyan-400/70 font-mono">· id {resolvedClub.teamId}</span>
                    )}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={resolveClubLive}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                  >
                    اعتماد النادي
                  </button>
                )}
                {resolvedClub && !resolvedClub.teamId && (
                  <span className="text-[10px] text-slate-500">سيُستخدم لتحسين الترتيب فقط.</span>
                )}
              </div>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={runFotMobSearch}
                disabled={!playerSearch.trim() || fotmobStatus.kind === 'searching' || fotmobStatus.kind === 'building'}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5"
              >
                <Search className="w-3 h-3" />
                {fotmobStatus.kind === 'searching' ? 'جاري البحث...' :
                 fotmobStatus.kind === 'building' ? 'جاري البناء...' :
                 'بحث في FotMob'}
              </button>
              <button
                onClick={runPlayerSearch}
                disabled={!playerSearch.trim()}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-bold py-1.5 px-3 rounded-md"
                title="بحث في المكتبة المحلية فقط"
              >
                محلي فقط
              </button>
            </div>

            {/* FotMob status */}
            {fotmobStatus.kind === 'success' && (
              <div className="text-[11px] bg-green-900/30 border border-green-700/40 text-green-300 rounded-md px-2 py-1.5">
                ✓ {fotmobStatus.msg}
              </div>
            )}
            {fotmobStatus.kind === 'weakClub' && (
              <div className="text-[11px] bg-amber-900/20 border border-amber-700/40 text-amber-300 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{fotmobStatus.msg}</span>
              </div>
            )}
            {fotmobStatus.kind === 'building' && (
              <div className="text-[11px] bg-blue-900/30 border border-blue-700/40 text-blue-300 rounded-md px-2 py-1.5 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {fotmobStatus.msg}
              </div>
            )}
            {fotmobStatus.kind === 'none' && (
              <div className="text-[11px] bg-amber-900/20 border border-amber-700/40 text-amber-300 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{fotmobStatus.msg}</span>
              </div>
            )}

            {/* FotMob match list */}
            {fotmobMatches.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto bg-slate-900/40 rounded-md p-1.5">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">نتائج FotMob:</div>
                {fotmobMatches.map((m) => {
                  const matchBadge = m.clubMatch === 'strong'
                    ? { label: 'تطابق نادٍ قوي', cls: 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300' }
                    : m.clubMatch === 'medium'
                    ? { label: 'تطابق نادٍ متوسط', cls: 'bg-amber-900/20 border-amber-700/40 text-amber-300' }
                    : m.clubMatch === 'weak'
                    ? { label: 'تطابق نادٍ ضعيف', cls: 'bg-slate-800 border-slate-700 text-slate-400' }
                    : null;
                  return (
                    <div
                      key={m.fotmobId}
                      className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 rounded-md px-2 py-1.5 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-200 truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {m.club || '—'} · {Math.round(m.confidence * 100)}% · ID {m.fotmobId}
                        </div>
                        {matchBadge && (
                          <span className={`text-[9px] mt-0.5 inline-block font-bold px-1.5 py-0.5 rounded border ${matchBadge.cls}`}>
                            {matchBadge.label}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => buildAndAddPlayer(m)}
                        disabled={fotmobStatus.kind === 'building'}
                        className="text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white px-2 py-1 rounded flex items-center gap-1 flex-shrink-0"
                        title="إضافة هذا اللاعب للقالب"
                      >
                        <Download className="w-2.5 h-2.5" />
                        إضافة للقالب
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Local search status */}
            {searchStatus.kind === 'found' && (
              <div className="text-[11px] bg-green-900/20 border border-green-700/40 text-green-300 rounded-md px-2 py-1.5">
                ✓ {searchStatus.msg}
              </div>
            )}
            {searchStatus.kind === 'weakClub' && (
              <div className="text-[11px] bg-amber-900/20 border border-amber-700/40 text-amber-300 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{searchStatus.msg}</span>
              </div>
            )}
            {searchStatus.kind === 'none' && (
              <div className="text-[11px] bg-amber-900/20 border border-amber-700/40 text-amber-300 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{searchStatus.msg}</span>
              </div>
            )}

            {/* Local results list (only when >1 result) */}
            {searchResults.length > 1 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <div className="text-[10px] text-slate-500 font-bold uppercase">نتائج محلية:</div>
                {searchResults.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 rounded-md px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{r.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {r.club} {r.season ? `· ${r.season}` : ''}
                        {typeof r.score === 'number' ? ` · ${Math.round(r.score * 100)}%` : ''}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => selectSearchResult(r.id, 'a')}
                        className="text-[9px] bg-cyan-700 hover:bg-cyan-600 text-white px-2 py-0.5 rounded"
                      >
                        لاعب 1
                      </button>
                      {mode === 'compare' && (
                        <button
                          onClick={() => selectSearchResult(r.id, 'b')}
                          className="text-[9px] bg-blue-700 hover:bg-blue-600 text-white px-2 py-0.5 rounded"
                        >
                          لاعب 2
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Examples */}
            {fotmobStatus.kind === 'idle' && searchStatus.kind === 'idle' && fotmobMatches.length === 0 && (
              <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                <div className="font-bold text-slate-400">أمثلة (اللاعب + النادي):</div>
                {[
                  { p: 'ليفاندوفسكي', c: 'برشلونة' },
                  { p: 'كوندي', c: 'برشلونة' },
                  { p: 'مبابي', c: 'ريال مدريد' },
                  { p: 'يامال', c: 'برشلونة' },
                  { p: 'Cole Palmer', c: 'Chelsea' },
                  { p: 'Mohamed Salah', c: 'Liverpool' },
                ].map((ex) => (
                  <button
                    key={`${ex.p}-${ex.c}`}
                    onClick={() => { setPlayerSearch(ex.p); setClubSearch(ex.c); }}
                    className="block w-full text-right text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded px-1.5 py-0.5"
                  >
                    • {ex.p} <span className="text-slate-600">·</span> {ex.c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic profiles list (added on-demand) */}
          {dynamicEntries.length > 0 && (
            <div className="rounded-lg border border-blue-800/30 bg-slate-950/40 p-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase mb-0.5">
                <span>اللاعبون المُضافون من FotMob ({dynamicEntries.length})</span>
              </div>
              {dynamicEntries.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-slate-900 rounded px-2 py-1 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-200 truncate">{d.name}</div>
                    <div className="text-[9px] text-slate-500 truncate">{d.club} · {d.season}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => applyChanges({ samplePlayer: d.id })}
                      className="text-[9px] bg-cyan-800 hover:bg-cyan-700 text-cyan-100 px-2 py-0.5 rounded"
                    >
                      اختيار
                    </button>
                    <button
                      onClick={() => removeDynamicEntry(d.id)}
                      className="text-[9px] bg-red-900/40 hover:bg-red-800/60 text-red-300 px-1.5 py-0.5 rounded"
                      title="حذف من المكتبة المحلية"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => applyChanges({ mode: 'single' })}
              className={[
                'flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                mode === 'single'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              <User className="w-3.5 h-3.5" />
              لاعب واحد
            </button>
            <button
              onClick={() => applyChanges({ mode: 'compare' })}
              className={[
                'flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                mode === 'compare'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              <Users className="w-3.5 h-3.5" />
              مقارنة لاعبين
            </button>
          </div>

          {/* Player A */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">
              {mode === 'compare' ? 'اللاعب الأول' : 'اللاعب'}
            </label>
            <select
              value={playerA}
              onChange={(e) => applyChanges({ samplePlayer: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              {combinedRegistry.length === 0 ? (
                <option value={playerA}>{playerA}</option>
              ) : (
                combinedRegistry.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.club}{r.file === '__dynamic__' ? ' (FotMob)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Player B (only in compare) */}
          {mode === 'compare' && (
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">اللاعب الثاني</label>
              <select
                value={playerB}
                onChange={(e) => applyChanges({ samplePlayerB: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                {combinedRegistry.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.club}{r.file === '__dynamic__' ? ' (FotMob)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {combinedRegistry.length === 0 && (
            <div className="text-[11px] text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg p-2">
              لا توجد مكتبة لاعبين جاهزة. استخدم البحث في FotMob أعلاه لإضافة لاعب جديد.
            </div>
          )}
          {combinedRegistry.length > 0 && (
            <div className="text-[10px] flex items-center justify-between text-slate-500">
              <span>المكتبة الحالية: {combinedRegistry.length} لاعب ({registry.length} ثابت + {dynamicEntries.length} من FotMob)</span>
            </div>
          )}

          {/* Preset cards */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block">نوع البطاقة (Preset)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.values(PLAYER_INTEL_PRESETS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={[
                    'text-xs font-bold py-2 px-2 rounded-lg border transition-colors text-right',
                    cardType === p.id
                      ? 'bg-cyan-900/40 border-cyan-700/60 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SCOPE TAB ─── */}
      {activeTab === 'scope' && (() => {
        const dataScope = (broadcastA as Record<string, unknown> | null)?.dataScope as
          | { scopeType?: string; label?: string; competitionName?: string; season?: string; sourcePath?: string; confidence?: string;
              availableCompetitions?: Array<{ name: string; competitionId?: number; seasonsCount?: number; hasDeepStats?: boolean }>; }
          | undefined;
        const recentMatches = ((broadcastA as Record<string, unknown> | null)?.broadcastCards as Record<string, { items?: unknown[] }> | undefined)?.form_report?.items || [];
        const recentCount = (broadcastA as Record<string, unknown> | null)?.recentMatches
          ? ((broadcastA as { recentMatches?: unknown[] }).recentMatches?.length || 0)
          : (Array.isArray(recentMatches) ? recentMatches.length : 0);
        const competitions = dataScope?.availableCompetitions || [];

        const scopes: Array<{ id: string; label: string; type: string; enabled: boolean; reason?: string; active?: boolean; sub?: string }> = [
          {
            id: 'main_league',
            label: dataScope?.competitionName ? `${dataScope.competitionName} · ${dataScope.season || ''}` : 'الدوري الرئيسي',
            type: 'main_league',
            enabled: dataScope?.scopeType === 'main_league' && dataScope?.confidence !== 'low',
            active: dataScope?.scopeType === 'main_league',
            sub: 'مصدر: FotMob mainLeague.stats',
          },
          {
            id: 'recent_matches',
            label: recentCount > 0 ? `آخر ${recentCount} مباراة (مسابقات مختلطة)` : 'آخر المباريات',
            type: 'recent_matches',
            enabled: recentCount > 0,
            active: dataScope?.scopeType === 'recent_matches',
            sub: 'مصدر: FotMob recentMatches',
          },
          {
            id: 'all_available',
            label: 'كل المسابقات المتاحة',
            type: 'all_available',
            enabled: false,
            reason: 'FotMob لا يوفّر إحصائيات موسم كاملة لكل مسابقة بشكل متاح حاليًا.',
            sub: 'يحتاج دمج FBref + FotMob بكامل البطولات (مرحلة لاحقة).',
          },
        ];

        return (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-500 leading-relaxed">
              يُحدِّد نطاقَ الإحصائيات المعروضة على القالب. كل خيار يبيّن المصدر الفعلي للأرقام.
              {!dataScope && <div className="mt-1 text-amber-400">لم يُختر لاعب بعد — اختر لاعبًا من تبويب "أساسي".</div>}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {scopes.map((s) => (
                <div
                  key={s.id}
                  className={[
                    'rounded-lg border p-3 transition-colors',
                    !s.enabled
                      ? 'bg-slate-950/60 border-slate-800/50 opacity-60'
                      : s.active
                      ? 'bg-cyan-900/30 border-cyan-700/50'
                      : 'bg-slate-900 border-slate-800',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className={['text-[12px] font-bold', s.active ? 'text-cyan-200' : 'text-slate-200'].join(' ')}>
                        {s.active && <span className="mr-1">●</span>}
                        {s.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{s.sub}</div>
                      {s.reason && (
                        <div className="text-[10px] text-amber-400/80 mt-1">⚠ {s.reason}</div>
                      )}
                    </div>
                    {s.active ? (
                      <span className="text-[9px] font-bold bg-cyan-700 text-white px-2 py-0.5 rounded shrink-0">نشط</span>
                    ) : !s.enabled ? (
                      <span className="text-[9px] font-bold bg-slate-800 text-slate-500 px-2 py-0.5 rounded shrink-0">غير متاح</span>
                    ) : (
                      <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded shrink-0">متاح</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Competitions discovered */}
            {competitions.length > 0 && (
              <div className="border border-slate-800 rounded-lg p-2 bg-slate-950/50">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">
                  المسابقات المكتشفة في FotMob ({competitions.length})
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {competitions.slice(0, 12).map((c, i) => (
                    <div
                      key={`${c.competitionId || i}-${c.name}`}
                      className="flex items-center justify-between bg-slate-900 rounded px-2 py-1.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-slate-200 truncate">{c.name}</div>
                        <div className="text-[9px] text-slate-600">{c.seasonsCount || 0} موسم</div>
                      </div>
                      {c.hasDeepStats && (
                        <span className="text-[8px] font-bold bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded shrink-0">deep</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                  هذه المسابقات مكتشفة من careerHistory/statSeasons، لكن استخدامها كمصدر إحصائيات كامل يحتاج مرحلة معالجة لاحقة.
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── METRICS TAB ─── */}
      {activeTab === 'metrics' && (
        <div className="space-y-3">
          {/* Smart Presets — large cards at the top */}
          <div className="rounded-lg border border-cyan-800/30 bg-gradient-to-br from-cyan-950/30 to-slate-950 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-bold text-cyan-200">Smart Presets — اختيار سريع</div>
              <div className="text-[10px] text-slate-500">يطبّق الإحصائيات تلقائيًا</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {Object.values(PLAYER_INTEL_PRESETS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={[
                    'text-xs font-bold py-2.5 px-2 rounded-lg border transition-all text-center',
                    cardType === p.id
                      ? 'bg-cyan-700 border-cyan-500 text-white shadow-md shadow-cyan-900/40'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-700 hover:text-cyan-200',
                  ].join(' ')}
                >
                  {p.label}
                  <div className="text-[9px] font-normal opacity-70 mt-0.5">
                    {p.hero.length} رئيسية · {p.secondary.length} ثانوية
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Currently selected metrics — compact summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="rounded-md border border-cyan-800/30 bg-cyan-950/20 p-2">
              <div className="text-[10px] font-bold uppercase text-cyan-300 mb-1">
                الإحصائيات الرئيسية ({heroKeys.length}/5)
              </div>
              {heroKeys.length === 0 ? (
                <div className="text-[10px] text-slate-500 italic py-2">— فارغ — اختر preset أو أضف يدويًا</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {heroKeys.map((k, i) => (
                    <div key={k} className="inline-flex items-center gap-1 bg-slate-900/80 rounded px-1.5 py-0.5">
                      <span className="text-[10px] text-slate-200">{getMetricAr(k) || k}</span>
                      <button onClick={() => reorderMetric(k, 'hero', -1)} className="text-slate-500 hover:text-cyan-300 disabled:opacity-30" disabled={i === 0}>
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => reorderMetric(k, 'hero', 1)} className="text-slate-500 hover:text-cyan-300 disabled:opacity-30" disabled={i === heroKeys.length - 1}>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => moveMetric(k, 'remove')} className="text-red-400 hover:text-red-300 ml-0.5">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-md border border-blue-800/30 bg-blue-950/15 p-2">
              <div className="text-[10px] font-bold uppercase text-blue-300 mb-1">
                الإحصائيات الثانوية ({secondaryKeys.length}/8)
              </div>
              {secondaryKeys.length === 0 ? (
                <div className="text-[10px] text-slate-500 italic py-2">— فارغ —</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {secondaryKeys.map((k, i) => (
                    <div key={k} className="inline-flex items-center gap-1 bg-slate-900/80 rounded px-1.5 py-0.5">
                      <span className="text-[10px] text-slate-200">{getMetricAr(k) || k}</span>
                      <button onClick={() => reorderMetric(k, 'secondary', -1)} className="text-slate-500 hover:text-blue-300 disabled:opacity-30" disabled={i === 0}>
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => reorderMetric(k, 'secondary', 1)} className="text-slate-500 hover:text-blue-300 disabled:opacity-30" disabled={i === secondaryKeys.length - 1}>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => moveMetric(k, 'remove')} className="text-red-400 hover:text-red-300 ml-0.5">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Toggle: open advanced metric picker */}
          <details className="rounded-lg border border-slate-800 bg-slate-950/50 group">
            <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-300 hover:text-cyan-300 flex items-center justify-between">
              <span>فتح كل الإحصائيات المتاحة (تعديل يدوي متقدم)</span>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="border-t border-slate-800 p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن إحصائية"
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pr-8 pl-3 py-2 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {[
              ['all', { label: 'الكل' }],
              ...Object.entries(METRIC_CATEGORIES),
            ].map(([key, cat]) => {
              const k = key as string;
              const c = cat as { label: string };
              return (
                <button
                  key={k}
                  onClick={() => setActiveCategory(k)}
                  className={[
                    'text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors',
                    activeCategory === k
                      ? 'bg-cyan-700 text-white shadow-sm shadow-cyan-900/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700',
                  ].join(' ')}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Selected zones */}
          <div className="grid grid-cols-1 gap-2">
            <Zone
              title={`الإحصائيات الرئيسية (${heroKeys.length}/5)`}
              keys={heroKeys}
              accent="cyan"
              onMove={moveMetric}
              onReorder={(k, d) => reorderMetric(k, 'hero', d)}
              zone="hero"
            />
            <Zone
              title={`الإحصائيات الثانوية (${secondaryKeys.length}/8)`}
              keys={secondaryKeys}
              accent="blue"
              onMove={moveMetric}
              onReorder={(k, d) => reorderMetric(k, 'secondary', d)}
              zone="secondary"
            />
            {hiddenKeys.length > 0 && (
              <Zone
                title={`المخفية (${hiddenKeys.length})`}
                keys={hiddenKeys}
                accent="slate"
                onMove={moveMetric}
                zone="hidden"
              />
            )}
          </div>

          {/* Available pool — modern cards */}
          <div className="border border-slate-800 rounded-lg p-2 bg-slate-950/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase">
                {activeCategory === 'all'
                  ? 'كل الإحصائيات'
                  : `فئة "${METRIC_CATEGORIES[activeCategory]?.label || activeCategory}"`}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {filteredMetrics.length} متاحة
              </div>
            </div>
            {filteredMetrics.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-slate-500 italic">
                لا توجد إحصائيات متاحة في هذه الفئة من المصدر الحالي.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                {filteredMetrics.map((k) => {
                  const inHero = heroKeys.includes(k);
                  const inSec = secondaryKeys.includes(k);
                  const inHidden = hiddenKeys.includes(k);
                  const meta = metricMeta[k];
                  const ar = getMetricAr(k) || meta?.label || k;
                  const value = meta?.value;
                  const source = meta?.source || (k.startsWith('fbref_') ? 'fbref' : 'fotmob');
                  const rank = meta?.rank;

                  return (
                    <div
                      key={k}
                      className={[
                        'rounded-md border p-2 transition-colors',
                        inHero
                          ? 'bg-cyan-950/40 border-cyan-700/40'
                          : inSec
                          ? 'bg-blue-950/30 border-blue-800/40'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-bold text-slate-100 truncate" title={ar}>
                            {ar}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono truncate" title={k}>
                            {k}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {value !== undefined && value !== null && value !== '' && (
                              <span className="text-[11px] font-black text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                                {String(value).slice(0, 8)}
                              </span>
                            )}
                            <span
                              className={[
                                'text-[8px] font-bold px-1.5 py-0.5 rounded',
                                source === 'fbref'
                                  ? 'bg-blue-900/40 text-blue-300'
                                  : source === 'fotmob'
                                  ? 'bg-emerald-900/40 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400',
                              ].join(' ')}
                            >
                              {source}
                            </span>
                            {typeof rank === 'number' && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300">
                                top {Math.round(100 - rank)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => moveMetric(k, 'hero')}
                          disabled={inHero || heroKeys.length >= 5}
                          className="flex-1 text-[9px] font-bold bg-cyan-900/40 hover:bg-cyan-800 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-200 px-1.5 py-1 rounded transition-colors"
                          title="نقل للرئيسية"
                        >
                          {inHero ? '✓ رئيسية' : 'رئيسية'}
                        </button>
                        <button
                          onClick={() => moveMetric(k, 'secondary')}
                          disabled={inSec || secondaryKeys.length >= 8}
                          className="flex-1 text-[9px] font-bold bg-blue-900/40 hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed text-blue-200 px-1.5 py-1 rounded transition-colors"
                          title="نقل للثانوية"
                        >
                          {inSec ? '✓ ثانوية' : 'ثانوية'}
                        </button>
                        {(inHero || inSec) && (
                          <button
                            onClick={() => moveMetric(k, 'remove')}
                            className="text-[9px] bg-red-900/30 hover:bg-red-800/50 text-red-300 px-1.5 py-1 rounded"
                            title="إزالة"
                          >
                            ×
                          </button>
                        )}
                        {inHidden && !inHero && !inSec && (
                          <span className="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-1 rounded">مخفي</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </div>
          </details>
        </div>
      )}

      {/* ─── VARIANTS TAB ─── */}
      {activeTab === 'variants' && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block">النمط البصري</label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'premium_broadcast', label: 'Premium Broadcast Card', sub: 'بطاقة بث فاخرة 16:9' },
                { id: 'tactical_board', label: 'Tactical Data Board', sub: 'لوحة تحليل تكتيكي مكثفة' },
                { id: 'magazine_profile', label: 'Magazine Player Profile', sub: 'غلاف مجلة رياضية' },
                { id: 'compact_tv', label: 'Compact TV Overlay', sub: 'شريط أفقي للبث المباشر' },
                { id: 'h2h_duel', label: 'Head-to-Head Duel', sub: 'مقارنة مباشرة (يحتاج وضع المقارنة)' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => applyChanges({ visualVariant: v.id })}
                  className={[
                    'text-right py-2 px-3 rounded-lg border transition-colors',
                    visualVariant === v.id
                      ? 'bg-cyan-900/40 border-cyan-700/60'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700',
                  ].join(' ')}
                >
                  <div className={`text-xs font-bold ${visualVariant === v.id ? 'text-cyan-200' : 'text-slate-300'}`}>
                    {v.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{v.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block">نمط الألوان</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'broadcast_dark', label: 'Broadcast Dark' },
                { id: 'barcelona_night', label: 'Barcelona Night' },
                { id: 'clean_studio', label: 'Clean Studio' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => applyChanges({ visualTheme: c.id })}
                  className={[
                    'text-[10px] font-bold py-2 rounded-lg border transition-colors',
                    visualTheme === c.id
                      ? 'bg-cyan-900/40 border-cyan-700/60 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700',
                  ].join(' ')}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── IMAGE TAB ─── */}
      {activeTab === 'image' && (
        <div className="space-y-3">
          <div className="text-[11px] text-slate-500 leading-relaxed">
            تخصيص صورة اللاعب لكل بروفايل. يُحفظ في المتصفح المحلي ولا يُرسل لأي خادم.
          </div>
          <PlayerIntelV2ImageEditor slug={playerA} label="اللاعب الأول" />
          {mode === 'compare' && (
            <PlayerIntelV2ImageEditor slug={playerB} label="اللاعب الثاني" />
          )}
        </div>
      )}

      {/* ─── ASSISTANT TAB ─── */}
      {activeTab === 'assistant' && (
        <div className="space-y-3">
          <textarea
            value={assistantText}
            onChange={(e) => setAssistantText(e.target.value)}
            placeholder="مثال: بطاقة هجومية لليفاندوفسكي"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:border-cyan-500"
            dir="rtl"
          />
          <button
            onClick={runAssistant}
            disabled={!assistantText.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-lg"
          >
            تطبيق المساعد
          </button>
          <div className="text-[10px] text-slate-500 space-y-1">
            <div className="font-bold text-slate-400 mb-1">أمثلة جاهزة:</div>
            {[
              'بطاقة هجومية لليفاندوفسكي',
              'تقرير كامل لكول بالمر',
              'مقارنة بين ليفاندوفسكي ويامال',
              'بطاقة صانع لعب ليامال',
              'أريد إحصائيات ديمبيلي مع باريس',
              'ابحث عن مبابي ريال مدريد',
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => setAssistantText(ex)}
                className="block w-full text-right text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded px-2 py-1"
              >
                • {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Zone (hero/secondary/hidden lane) ───────────────────────────────────────

const Zone: React.FC<{
  title: string;
  keys: string[];
  accent: 'cyan' | 'blue' | 'slate';
  zone: 'hero' | 'secondary' | 'hidden';
  onMove: (k: string, target: 'hero' | 'secondary' | 'hidden' | 'remove') => void;
  onReorder?: (k: string, d: -1 | 1) => void;
}> = ({ title, keys, accent, zone, onMove, onReorder }) => {
  const accentBg: Record<string, string> = {
    cyan: 'bg-cyan-950/30 border-cyan-800/40',
    blue: 'bg-blue-950/30 border-blue-800/40',
    slate: 'bg-slate-900/60 border-slate-800/40',
  };
  const accentText: Record<string, string> = {
    cyan: 'text-cyan-300',
    blue: 'text-blue-300',
    slate: 'text-slate-400',
  };

  return (
    <div className={`rounded-lg p-2 border ${accentBg[accent]}`}>
      <div className={`text-[10px] font-bold uppercase mb-1.5 ${accentText[accent]}`}>{title}</div>
      {keys.length === 0 ? (
        <div className="text-[10px] text-slate-500 italic">— فارغ —</div>
      ) : (
        <div className="space-y-1">
          {keys.map((k) => (
            <div key={k} className="flex items-center gap-1 bg-slate-950/60 rounded px-2 py-1 text-xs">
              <span className="flex-1 truncate text-slate-200">{getMetricAr(k)}</span>
              {onReorder && (
                <>
                  <button onClick={() => onReorder(k, -1)} className="p-0.5 hover:bg-slate-800 rounded text-slate-400">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => onReorder(k, 1)} className="p-0.5 hover:bg-slate-800 rounded text-slate-400">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </>
              )}
              {zone !== 'hidden' && (
                <button
                  onClick={() => onMove(k, 'hidden')}
                  className="p-0.5 hover:bg-slate-800 rounded text-slate-400"
                  title="إخفاء"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
              )}
              {zone === 'hidden' && (
                <button
                  onClick={() => onMove(k, 'secondary')}
                  className="p-0.5 hover:bg-slate-800 rounded text-blue-400"
                  title="استعادة"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => onMove(k, 'remove')}
                className="p-0.5 hover:bg-red-900/30 rounded text-red-400"
                title="حذف"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerIntelV2EditorPanel;
