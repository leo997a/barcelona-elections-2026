/**
 * Player Intel V2 — Editor side panel.
 *
 * Self-contained: presets, metric picker, mode toggle, variants, refresh button.
 * Reads/writes directly to overlay fields via a callback.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, EyeOff, Plus, Sparkles, RefreshCw, Users, User } from 'lucide-react';
import type { OverlayField } from '../../types';
import { PLAYER_INTEL_PRESETS, METRIC_CATEGORIES, getPreset } from './playerIntelV2Presets';
import { getMetricAr } from './playerIntelV2Labels';

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
  const [activeTab, setActiveTab] = useState<'basic' | 'metrics' | 'variants' | 'assistant'>('basic');
  const [activeCategory, setActiveCategory] = useState<string>('attacking');
  const [assistantText, setAssistantText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Load registry on mount
  useEffect(() => {
    fetch(`${SAMPLES_BASE}/index.json`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.players) setRegistry(d.players as RegistryEntry[]); })
      .catch(() => setRegistry([]));
  }, []);

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
    const txt = assistantText.toLowerCase().trim();
    if (!txt) return;
    let nextPlayer = playerA;
    let nextPreset = cardType;
    let nextMode = mode;
    let nextPlayerB = playerB;

    // Detect player names (Arabic or English)
    const matchPlayer = (q: string): string | null => {
      const p = registry.find((r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.includes(q) ||
        (r.club || '').toLowerCase().includes(q),
      );
      return p?.id || null;
    };

    // Detect compare keyword
    const isCompare = /مقارنة|vs|ضد|بين/.test(txt);
    if (isCompare) {
      nextMode = 'compare';
      // Try to find two players
      const tokens = txt.split(/\s+|و|and/).filter(Boolean);
      const found: string[] = [];
      tokens.forEach((tok) => {
        const m = matchPlayer(tok);
        if (m && !found.includes(m)) found.push(m);
      });
      if (found.length >= 1) nextPlayer = found[0];
      if (found.length >= 2) nextPlayerB = found[1];
    } else {
      nextMode = 'single';
      // Find single player
      const tokens = txt.split(/\s+/).filter(Boolean);
      for (const tok of tokens) {
        const m = matchPlayer(tok);
        if (m) { nextPlayer = m; break; }
      }
    }

    // Detect preset
    if (/هجوم|attacker/.test(txt)) nextPreset = 'attacker_card';
    else if (/صانع|playmaker/.test(txt)) nextPreset = 'playmaker_card';
    else if (/جناح|winger/.test(txt)) nextPreset = 'winger_card';
    else if (/مدافع|defender/.test(txt)) nextPreset = 'defender_card';
    else if (/فورمة|form/.test(txt)) nextPreset = 'form_report';
    else if (/سوق|market/.test(txt)) nextPreset = 'market_report';
    else if (/موسم|season/.test(txt)) nextPreset = 'season_report';
    else if (/كامل|complete|full/.test(txt)) nextPreset = 'complete_report';

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
    flashToast('تم تطبيق المساعد بنجاح');
    setAssistantText('');
  };

  const filteredMetrics = useMemo(() => {
    const cat = METRIC_CATEGORIES[activeCategory];
    if (!cat) return [];
    let keys = cat.keys.filter((k) => availableMetricKeys.includes(k) || true); // show all from category
    if (search) {
      const q = search.toLowerCase();
      keys = keys.filter((k) => {
        const ar = getMetricAr(k);
        return k.toLowerCase().includes(q) || ar.includes(search);
      });
    }
    return keys;
  }, [activeCategory, availableMetricKeys, search]);

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
          { id: 'metrics', label: 'اختيار الإحصائيات' },
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
              {registry.length === 0 ? (
                <option value={playerA}>{playerA}</option>
              ) : (
                registry.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.club}</option>
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
                {registry.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.club}</option>
                ))}
              </select>
            </div>
          )}

          {registry.length === 0 && (
            <div className="text-[11px] text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg p-2">
              لا توجد مكتبة لاعبين جاهزة. شغّل
              <code className="mx-1 font-mono text-[10px]">build_player_intel_public_registry.py</code>
              لتوليدها.
            </div>
          )}
          {registry.length > 0 && registry.length < 5 && (
            <div className="text-[10px] text-slate-500">
              المكتبة الحالية تحتوي {registry.length} لاعبين فقط. أضف المزيد عبر Player Intel Builder.
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

      {/* ─── METRICS TAB ─── */}
      {activeTab === 'metrics' && (
        <div className="space-y-3">
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
            {Object.entries(METRIC_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={[
                  'text-[10px] font-bold px-2 py-1 rounded-md transition-colors',
                  activeCategory === key
                    ? 'bg-cyan-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                {cat.label}
              </button>
            ))}
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

          {/* Available pool */}
          <div className="border border-slate-800 rounded-lg p-2 bg-slate-950/50">
            <div className="text-[10px] text-slate-500 mb-1.5 font-bold uppercase">
              متاحة من فئة "{METRIC_CATEGORIES[activeCategory]?.label}"
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
              {filteredMetrics.length === 0 ? (
                <span className="text-[10px] text-slate-500">لا توجد نتائج</span>
              ) : (
                filteredMetrics.map((k) => {
                  const inHero = heroKeys.includes(k);
                  const inSec = secondaryKeys.includes(k);
                  const inHidden = hiddenKeys.includes(k);
                  return (
                    <div
                      key={k}
                      className="flex items-center justify-between bg-slate-900 rounded-md px-2 py-1 text-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-slate-200 truncate">{getMetricAr(k)}</span>
                        <span className="text-[9px] text-slate-600 font-mono truncate">{k}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveMetric(k, 'hero')}
                          disabled={inHero || heroKeys.length >= 5}
                          className="text-[9px] bg-cyan-900/40 hover:bg-cyan-800 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 px-1.5 py-0.5 rounded"
                          title="نقل للرئيسية"
                        >
                          رئيسية
                        </button>
                        <button
                          onClick={() => moveMetric(k, 'secondary')}
                          disabled={inSec || secondaryKeys.length >= 8}
                          className="text-[9px] bg-blue-900/40 hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed text-blue-300 px-1.5 py-0.5 rounded"
                          title="نقل للثانوية"
                        >
                          ثانوية
                        </button>
                        {(inHero || inSec) && (
                          <button
                            onClick={() => moveMetric(k, 'remove')}
                            className="text-[9px] bg-red-900/30 hover:bg-red-800/50 text-red-300 px-1 py-0.5 rounded"
                            title="إزالة"
                          >
                            ×
                          </button>
                        )}
                        {inHidden && (
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1 py-0.5 rounded">مخفي</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
