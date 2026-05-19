
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OverlayConfig, OverlayType, OverlayField, Sponsor } from '../types';
import OverlayRenderer from '../components/OverlayRenderer';
import { Save, Eye, EyeOff, Monitor, Sparkles, ChevronRight, ChevronLeft, Plus, X, RotateCcw, AlertTriangle, Lock, Unlock, DollarSign, Trash2, ArrowDownUp, Image as ImageIcon, History, Edit3, Calendar, Zap, Rewind, FastForward, Layers, Check, Copy, RefreshCw, Square , AlertCircle, Info } from 'lucide-react';
import { assistPlayerStatsQuery, assistPlayerTransferCard, assistTemplateFields, processSmartText, generateMatchData, generateViewerBadges, extractViewersFromScreenshots } from '../services/geminiService';
import { currencyService } from '../services/currencyService';
import { syncManager } from '../services/syncManager';
import { adminSessionService } from '../services/adminSession';
import { normalizeElectionOverlay } from '../utils/election';
import {
  CLUB_LOGO_CACHE_URLS,
  PLAYER_PORTRAIT_CACHE_URLS,
  PLAYER_RENDER_CACHE_URLS,
  assetCandidates,
  fetchAssetCaches,
  findAssetUrl,
} from '../utils/assetCache';
import { identityToAssetFields, resolveClubIdentity, resolvePlayerIdentity } from '../utils/playerIdentity';
import { LABELS, METRIC_LABELS, getMetricLabel, t } from '../utils/playerStatsLabels';
import {
  filterAvailableMetrics,
  isMetricAvailable,
  runPlayerStatsAssistant,
} from '../utils/playerStatsLabAssistant';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableMetricItem } from '../components/editor/SortableMetricItem';

interface EditorProps {
  overlay: OverlayConfig;
  onBack: () => void;
}

// Extensive List of Currencies for Arab & Global usage
const CURRENCY_OPTIONS = [
    { code: 'SAR', label: 'Saudi Riyal (SAR)' },
    { code: 'AED', label: 'UAE Dirham (AED)' },
    { code: 'KWD', label: 'Kuwaiti Dinar (KWD)' },
    { code: 'QAR', label: 'Qatari Riyal (QAR)' },
    { code: 'EGP', label: 'Egyptian Pound (EGP)' },
    { code: 'BHD', label: 'Bahraini Dinar (BHD)' },
    { code: 'OMR', label: 'Omani Rial (OMR)' },
    { code: 'JOD', label: 'Jordanian Dinar (JOD)' },
    { code: 'USD', label: 'US Dollar (USD)' },
    { code: 'EUR', label: 'Euro (EUR)' },
    { code: 'GBP', label: 'British Pound (GBP)' },
    { code: 'JPY', label: 'Japanese Yen (JPY)' },
    { code: 'CAD', label: 'Canadian Dollar (CAD)' },
    { code: 'AUD', label: 'Australian Dollar (AUD)' },
];

const MAX_MATCH_STATS_JSON_LENGTH = 4_500_000;
const CLOUD_MATCH_API_URL = '/api/reo-match/match';

const MATCH_STAT_PRESET_QUICK = [
  { value: 'SMART', label: 'Smart' },
  { value: 'ATTACK', label: 'Attack' },
  { value: 'PASSING', label: 'Passing' },
  { value: 'DEFENSE', label: 'Defense' },
  { value: 'DISCIPLINE', label: 'Discipline' },
  { value: 'ALL', label: 'All' },
];

const PLAYER_STAT_PRESET_QUICK = [
  { value: 'SMART', label: 'Smart' },
  { value: 'ATTACK', label: 'Shooting' },
  { value: 'PASSING', label: 'Passing' },
  { value: 'DEFENSE', label: 'Defense' },
  { value: 'KEEPER', label: 'Keeper' },
  { value: 'ALL', label: 'All' },
];

const MATCH_VISUAL_STYLE_QUICK = [
  { value: 'DUAL_RAIL', label: 'Rail' },
  { value: 'TACTICAL_SPLIT', label: 'Split' },
  { value: 'DATA_TOWER', label: 'Tower' },
  { value: 'GLASS_STUDIO', label: 'Glass' },
  { value: 'NEON_TOUCHLINE', label: 'Neon' },
];

type MetricCatalogItem = {
  key: string;
  label: string;
  labelAr: string;
  category: string;
  unit?: string;
  preferredProvider?: string;
  providers?: string[];
  supportedModes?: string[];
  bestFor?: string[];
};

const PLAYER_STATS_PRESETS: Record<string, string[]> = {
  'Basic Setup': ['goals', 'assists', 'minutes', 'appearances', 'starts'],
  'Attacker Profile': ['goals', 'non_penalty_goals', 'assists', 'shots', 'shots_on_target', 'shot_accuracy', 'touches_in_box', 'xg', 'xg_per90', 'goals_per90', 'impact_index'],
  'Playmaker Profile': ['assists', 'xa', 'xa_per90', 'key_passes', 'key_passes_per90', 'chances_created', 'big_chances_created', 'through_balls', 'progressive_passes', 'passes_into_penalty_area'],
  'Defensive Profile': ['tackles', 'tackles_won', 'interceptions', 'clearances', 'blocks', 'pressures', 'recoveries', 'ground_duels_won', 'duel_win_rate', 'fouls_committed'],
  'Goalkeeper Profile': ['appearances', 'minutes', 'saves', 'save_percentage', 'clean_sheets', 'goals_against', 'crosses_stopped'],
  'Transfer Scout': ['minutes', 'starts', 'goals', 'assists', 'xg', 'xa', 'progressive_passes', 'progressive_carries', 'recoveries', 'barcelona_fit_score', 'market_risk_score', 'impact_index'],
  'Barcelona Fit': ['pass_accuracy', 'progressive_passes', 'passes_into_final_third', 'progressive_carries', 'touches', 'recoveries', 'pressures', 'key_passes', 'xa', 'barcelona_fit_score'],
  'Head-to-Head Comparison': ['minutes', 'goals', 'assists', 'goals_per90', 'assists_per90', 'shots_per90', 'xg_per90', 'xa_per90', 'key_passes_per90', 'dribble_success_rate', 'pass_accuracy', 'duel_win_rate'],
  'Full Season Report': ['appearances', 'starts', 'minutes', 'goals', 'assists', 'goal_contributions', 'shots', 'shots_on_target', 'xg', 'xa', 'key_passes', 'chances_created', 'passes', 'pass_accuracy', 'progressive_passes', 'dribbles_completed', 'progressive_carries', 'tackles', 'interceptions', 'recoveries', 'duel_win_rate', 'yellow_cards', 'rating', 'impact_index'],
};

// Arabic display labels for preset keys (UI-only — keys remain English to keep state stable)
const PLAYER_STATS_PRESET_LABELS_AR: Record<string, string> = {
  'Basic Setup': 'إعداد أساسي',
  'Attacker Profile': 'ملف هجومي',
  'Playmaker Profile': 'ملف صانع لعب',
  'Defensive Profile': 'ملف دفاعي',
  'Goalkeeper Profile': 'ملف حارس مرمى',
  'Transfer Scout': 'استكشاف انتقالات',
  'Barcelona Fit': 'ملاءمة برشلونة',
  'Head-to-Head Comparison': 'مقارنة مباشرة',
  'Full Season Report': 'تقرير الموسم الكامل',
};

const PLAYER_STATS_CATEGORIES = [
  { key: 'season',          label: 'الموسم' },
  { key: 'attack',          label: 'الهجوم' },
  { key: 'shooting',        label: 'التسديد' },
  { key: 'chance_creation', label: 'صناعة الفرص' },
  { key: 'passing',         label: 'التمرير' },
  { key: 'dribbling',       label: 'المراوغة' },
  { key: 'possession',      label: 'الاستحواذ' },
  { key: 'defense',         label: 'الدفاع' },
  { key: 'duels',           label: 'الالتحامات' },
  { key: 'discipline',      label: 'الانضباط' },
  { key: 'advanced',        label: 'متقدمة' },
  { key: 'per90',           label: 'لكل 90 دقيقة' },
  { key: 'goalkeeping',     label: 'حراسة المرمى' },
];

const METRIC_TEXT_ALIASES: Record<string, string[]> = {
  xg: ['xg', 'expected goals'],
  xa: ['xa', 'expected assists'],
  shots: ['shots'],
  shots_on_target: ['shots on target'],
  dribbles_completed: ['successful dribbles'],
  key_passes: ['key passes'],
  progressive_passes: ['progressive passes'],
  pass_accuracy: ['pass accuracy'],
  recoveries: ['recoveries'],
  tackles: ['tackles'],
  saves: ['saves'],
};

const normalizeMetricText = (value: unknown) => String(value ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
  .replace(/\u0629/g, '\u0647')
  .replace(/\u0649/g, '\u064A')
  .replace(/[^\p{L}\p{N}\s/_-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const uniqueMetricKeys = (keys: string[]) => Array.from(new Set(keys.map(key => key.trim()).filter(Boolean)));

const parseMetricKeys = (value: unknown, fallback: string[] = []) => {
  if (Array.isArray(value)) return uniqueMetricKeys(value.map(String));
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return uniqueMetricKeys(parsed.map(String));
  } catch {
    return uniqueMetricKeys(raw.split(/[,;\n]/).map(item => item.trim()));
  }
  return fallback;
};

const fallbackMetricCatalog = (): MetricCatalogItem[] => uniqueMetricKeys(Object.values(PLAYER_STATS_PRESETS).flat()).map(key => ({
  key,
  label: key.replace(/_/g, ' '),
  labelAr: key.replace(/_/g, ' '),
  category: 'advanced',
}));

const metricsForCategories = (catalog: MetricCatalogItem[], categories: string[]) => {
  const wanted = new Set(categories);
  return catalog.filter(metric => wanted.has(metric.category)).map(metric => metric.key);
};

const resolveMetricTextKeys = (text: string, catalog: MetricCatalogItem[]) => {
  const normalized = normalizeMetricText(text);
  if (!normalized) return [];
  const keys = new Set<string>();
  Object.entries(METRIC_TEXT_ALIASES).forEach(([key, aliases]) => {
    if (aliases.some(alias => normalized.includes(normalizeMetricText(alias)))) keys.add(key);
  });
  catalog.forEach(metric => {
    const terms = [metric.key, metric.label, metric.labelAr, ...(metric.bestFor || [])].map(normalizeMetricText).filter(Boolean);
    if (terms.some(term => normalized.includes(term))) keys.add(metric.key);
  });
  return Array.from(keys);
};

type BridgeStatusSnapshot = {
  ok?: boolean;
  hasData?: boolean;
  currentUrl?: string;
  pollingActive?: boolean;
  workerAlive?: boolean;
  isFetching?: boolean;
  intervalSec?: number;
  lastUpdatedAt?: string | null;
  nextPollAt?: string | null;
  lastError?: string | null;
  errorCount?: number;
  stoppedReason?: string | null;
  provider?: string;
  archiveOnSuccess?: boolean;
  archive?: {
    enabled?: boolean;
    ok?: boolean;
    skipped?: boolean;
    reason?: string;
    path?: string | null;
    url?: string;
    error?: string;
    committedAt?: string;
    checkedAt?: string;
  } | null;
  match?: {
    homeTeam?: string;
    awayTeam?: string;
    homeScore?: number;
    awayScore?: number;
    minute?: number;
    clock?: string;
    displayStatus?: string;
    status?: string | number;
  } | null;
};

const PLAYER_AI_ALIASES = [
  { name: 'Robert Lewandowski', position: 'ST / Forward', club: 'Barcelona', fallbackImage: 'https://sportrenders.com/wp-content/uploads/2025/05/Lewandowski-PNG-Barcelona-Football-Render-5-scaled.png', aliases: ['lewandowski', 'robert lewandowski'] },
  { name: 'Lamine Yamal', position: 'RW / Forward', club: 'Barcelona', aliases: ['lamine yamal', 'yamal'] },
  { name: 'Pedri', position: 'CM / AM', club: 'Barcelona', aliases: ['pedri'] },
  { name: 'Dani Olmo', position: 'AM / Forward', club: 'Barcelona', aliases: ['dani olmo', 'olmo'] },
  { name: 'Raphinha', position: 'RW / Forward', club: 'Barcelona', aliases: ['raphinha'] },
  { name: 'Ferran Torres', position: 'Forward', club: 'Barcelona', aliases: ['ferran torres', 'torres'] },
  { name: 'Frenkie de Jong', position: 'CM', club: 'Barcelona', aliases: ['frenkie de jong', 'de jong'] },
  { name: 'Gavi', position: 'CM', club: 'Barcelona', aliases: ['gavi'] },
  { name: 'Cole Palmer', position: 'AM / RW', club: 'Chelsea', aliases: ['cole palmer', 'palmer'] },
  { name: 'Enzo Fernandez', position: 'CM', club: 'Chelsea', aliases: ['enzo fernandez', 'enzo'] },
  { name: 'Moises Caicedo', position: 'DM / CM', club: 'Chelsea', aliases: ['moises caicedo', 'caicedo'] },
  { name: 'Reece James', position: 'RB', club: 'Chelsea', aliases: ['reece james', 'james'] },
  { name: 'Pedro Neto', position: 'LW / RW', club: 'Chelsea', aliases: ['pedro neto', 'neto'] },
  { name: 'Joao Pedro', position: 'Forward', club: 'Chelsea', aliases: ['joao pedro'] },
  { name: 'Jadon Sancho', position: 'LW / RW', club: 'Chelsea', aliases: ['jadon sancho', 'sancho'] },
];

const CLUB_AI_ALIASES = [
  { name: 'Barcelona', aliases: ['barcelona', 'barca', 'fc barcelona'] },
  { name: 'Chelsea', aliases: ['chelsea', 'chelsea fc'] },
  { name: 'Real Madrid', aliases: ['real madrid', 'madrid'] },
  { name: 'Atletico Madrid', aliases: ['atletico madrid'] },
  { name: 'Alaves', aliases: ['alaves', 'deportivo alaves'] },
];

const textHas = (text: string, needle: string) => text.toLocaleLowerCase().includes(needle.toLocaleLowerCase());

const findPlayerAlias = (text: string) => {
  const resolved = resolvePlayerIdentity(text);
  if (resolved && resolved.confidence >= 58) {
    return {
      name: resolved.player.displayName,
      position: resolved.player.position,
      club: resolved.club?.displayName || resolved.player.club,
      fallbackImage: resolved.player.renderImage || resolved.player.smallImage,
      aliases: [...resolved.player.aliases, ...resolved.player.arabicNames],
      identity: resolved,
    };
  }
  return PLAYER_AI_ALIASES.find(entry => entry.aliases.some(alias => textHas(text, alias)));
};

const findClubAlias = (text: string) => {
  const resolved = resolveClubIdentity(text);
  if (resolved && resolved.confidence >= 58) {
    return { name: resolved.club.displayName, aliases: [...resolved.club.aliases, ...resolved.club.arabicNames], identity: resolved };
  }
  return CLUB_AI_ALIASES.find(entry => entry.aliases.some(alias => textHas(text, alias)));
};

const extractPercentSignal = (text: string) => {
  const match = text.match(/(?:percentage|probability|likely|chance|rate)/i);
  if (!match) return null;
  const value = Number(match[1] || match[2]);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
};

const hasLeavingSignal = (text: string) =>
  /(?:unknown|not specified)/i.test(text);

const hasFreeTransferSignal = (text: string) =>
  /(?:unknown|not specified)/i.test(text);

const createFallbackDraftField = (id: string, value: any): OverlayField => {
  if (id === 'dataMode') {
    return {
      id,
      label: 'Field',
      type: 'select',
      value,
      options: [
        { value: 'CLOUD_BRIDGE', label: 'REO Cloud Bridge - Google Cloud' },
        { value: 'BRIDGE', label: 'Live Bridge - localhost:3005' },
        { value: 'PASTE_JSON', label: 'JSON / extractor' },
        { value: 'DEMO', label: 'Field' },
      ],
    };
  }

  if (id === 'manualJson') {
    return { id, label: 'JSON', type: 'textarea', value };
  }

  if (id === 'sourceMatchUrl') {
    return { id, label: 'WhoScored', type: 'text', value };
  }

  if (id === 'apiUrl') {
    return { id, label: 'Field', type: 'text', value };
  }

  if (id === 'matchMetricPreset') {
    return {
      id,
      label: 'Field',
      type: 'select',
      value,
      options: MATCH_STAT_PRESET_QUICK.map(option => ({ value: option.value, label: option.label })),
    };
  }

  if (id === 'playerMetricPreset') {
    return {
      id,
      label: 'Field',
      type: 'select',
      value,
      options: PLAYER_STAT_PRESET_QUICK.map(option => ({ value: option.value, label: option.label })),
    };
  }

  if (id === 'teamStatsSide') {
    return {
      id,
      label: 'Field',
      type: 'select',
      value,
      options: [
        { value: 'HOME_LEFT', label: 'Field' },
        { value: 'AWAY_LEFT', label: 'Field' },
      ],
    };
  }

  if (id === 'providerPolicy') {
    return {
      id,
      label: 'سياسة المصدر',
      type: 'select',
      value,
      options: [
        { value: 'auto', label: 'موجِّه تلقائي' },
        { value: 'fbref', label: 'موسم FBref أولًا' },
        { value: 'matchBridge', label: 'جسر المباريات أولًا' },
        { value: 'demo', label: 'وضع تجريبي آمن' },
      ],
    };
  }

  if (id === 'metricPreset') {
    return {
      id,
      label: 'القالب الذكي',
      type: 'select',
      value,
      options: [
        'Attacker Profile',
        'Playmaker Profile',
        'Defensive Profile',
        'Goalkeeper Profile',
        'Transfer Scout',
        'Barcelona Fit',
        'Head-to-Head Comparison',
        'Full Season Report',
      ],
    };
  }

  if (['selectedMetricsJson', 'heroMetricsJson', 'secondaryMetricsJson', 'metricNaturalLanguage'].includes(id)) {
    return { id, label: id, type: 'hidden', value };
  }

  if (id === 'playerStatsVisualVariant') {
    return {
      id,
      label: 'Player Stats look',
      type: 'select',
      value,
      options: ['ULTRA_LAB', 'GLASS_SCOUT', 'BARCA_RADAR', 'MINIMAL_CAST'],
    };
  }

  if (id === 'visualVariant') {
    return {
      id,
      label: 'Look variant',
      type: 'select',
      value,
      options: ['NEON_GLASS', 'TACTICAL_DARK', 'LUXE_STUDIO', 'CLEAN_BROADCAST'],
    };
  }

  if (id === 'playerImageMapJson') {
    return { id, label: 'JSON', type: 'textarea', value };
  }

  if ([
    'playerImage',
    'playerImageLarge',
    'clubLogo',
    'fromClubLogo',
    'toClubLogo',
    'playerAImage',
    'playerBImage',
    'playerCImage',
    'playerAClubLogo',
    'playerBClubLogo',
    'playerCClubLogo',
    'leagueLogo',
  ].includes(id)) {
    return { id, label: id, type: 'image', value };
  }

  if (['playerStatsJson', 'playerStatsSourceJson', 'marketItems', 'latestNews', 'dailyDeals', 'expectedDeals', 'pagesData'].includes(id)) {
    return { id, label: id, type: 'textarea', value };
  }

  return {
    id,
    label: id,
    type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text',
    value,
  };
};

const Editor: React.FC<EditorProps> = ({ overlay: liveOverlay, onBack }) => {
  const [activeTab, setActiveTab] = useState<string>('fields');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [previewChroma, setPreviewChroma] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const matchStatsJsonInputRef = useRef<HTMLInputElement>(null);
  const [activeImageFieldId, setActiveImageFieldId] = useState<string | null>(null);
  const [isExtractingViewers, setIsExtractingViewers] = useState(false);
  const [isGeneratingViewerBadges, setIsGeneratingViewerBadges] = useState(false);
  const [viewerAiError, setViewerAiError] = useState<string | null>(null);
  const [isImportingMatchStats, setIsImportingMatchStats] = useState(false);
  const [matchStatsImportMessage, setMatchStatsImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isBridgeActionRunning, setIsBridgeActionRunning] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatusSnapshot | null>(null);
  const [aiBoxInput, setAiBoxInput] = useState('');
  const [aiBoxMessage, setAiBoxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clubLogoMap, setClubLogoMap] = useState<Record<string, string>>({});
  const [playerImageMap, setPlayerImageMap] = useState<Record<string, string>>({});
  const [playerRenderMap, setPlayerRenderMap] = useState<Record<string, string>>({});
  const [metricCatalog, setMetricCatalog] = useState<MetricCatalogItem[]>([]);
  const [metricSearch, setMetricSearch] = useState('');
  const [metricAdvancedOpen, setMetricAdvancedOpen] = useState(false);
  const [activePlayerStatsTab, setActivePlayerStatsTab] = useState<'basic' | 'metrics' | 'visuals' | 'coverage'>('basic');
  const [isFetchingPlayerStats, setIsFetchingPlayerStats] = useState(false);
  const [labAssistantInput, setLabAssistantInput] = useState('');
  const [labAssistantMessage, setLabAssistantMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Normalize active tab if a stale value lingers from a previous schema (e.g. 'setup' or 'presets').
  useEffect(() => {
      const validTabs = ['basic', 'metrics', 'visuals', 'coverage'] as const;
      if (!validTabs.includes(activePlayerStatsTab as any)) {
          setActivePlayerStatsTab('basic');
      }
  }, [activePlayerStatsTab]);
  const dndSensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [sidebarSplitPct, setSidebarSplitPct] = useState(50); // % of height for top panel
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Draft State
  const [draftOverlay, setDraftOverlay] = useState<OverlayConfig>(() => normalizeElectionOverlay(JSON.parse(JSON.stringify(liveOverlay))));
  const [panelOpen, setPanelOpen] = useState(true);
  const [newSlotName, setNewSlotName] = useState('');

  // --- SPONSORS MANAGEMENT STATE ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isAdminAuthorizing, setIsAdminAuthorizing] = useState(false);
  
  const [newSponsor, setNewSponsor] = useState({ name: '', amount: '', currency: 'SAR', avatar: '' });
  const [isAddingSponsor, setIsAddingSponsor] = useState(false);
  const [previewUSD, setPreviewUSD] = useState<number | null>(null);

  const [topUpSponsorId, setTopUpSponsorId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isToppingUp, setIsToppingUp] = useState(false);

  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [editSponsorData, setEditSponsorData] = useState({ name: '', avatar: '' });

  // --- SMART SYNC ---
  useEffect(() => {
     setDraftOverlay(prevDraft => {
         const newDraft = normalizeElectionOverlay({ ...prevDraft, fields: prevDraft.fields.map(field => ({ ...field })) });
         let shouldUpdate = false;

         if (prevDraft.isVisible !== liveOverlay.isVisible) {
             newDraft.isVisible = liveOverlay.isVisible;
             shouldUpdate = true;
         }

         liveOverlay.fields.forEach(liveField => {
             const draftField = newDraft.fields.find(f => f.id === liveField.id);
             if (draftField) {
                 const isControlField = ['homeScore', 'awayScore', 'currentPage', 'period', 'time'].includes(liveField.id);
                 if (isControlField && JSON.stringify(liveField.value) !== JSON.stringify(draftField.value)) {
                     draftField.value = liveField.value;
                     shouldUpdate = true;
                 }
             }
         });

         return shouldUpdate ? normalizeElectionOverlay(newDraft) : prevDraft;
     });
  }, [liveOverlay]);

  useEffect(() => {
      let isMounted = true;

      adminSessionService.verifyStoredSession().then(isValid => {
          if (isMounted) {
              setIsAdminUnlocked(isValid);
          }
      }).catch(error => {
          console.error('Failed to verify admin session', error);
      });

      return () => {
          isMounted = false;
      };
  }, []);

  // --- LIVE CURRENCY PREVIEW EFFECT ---
  useEffect(() => {
      if (newSponsor.amount && !isNaN(parseFloat(newSponsor.amount))) {
          const amount = parseFloat(newSponsor.amount);
          currencyService.convertToUSD(amount, newSponsor.currency).then(usd => {
              setPreviewUSD(usd);
          });
      } else {
          setPreviewUSD(null);
      }
  }, [newSponsor.amount, newSponsor.currency]);

  useEffect(() => {
      let cancelled = false;
      fetch('/stats/metrics.catalog.json', { cache: 'no-store' })
          .then(response => response.ok ? response.json() : null)
          .then(payload => {
              if (cancelled) return;
              const metrics = Array.isArray(payload?.metrics) ? payload.metrics : [];
              setMetricCatalog(metrics);
          })
          .catch(() => {
              if (!cancelled) setMetricCatalog([]);
          });
      return () => {
          cancelled = true;
      };
  }, []);

  // --- HOTKEYS ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Prevent hotkeys if typing in input/textarea
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

          if (e.code === 'Space') {
              e.preventDefault();
              syncManager.updateLiveField(liveOverlay.id, 'isVisible', !liveOverlay.isVisible);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [liveOverlay.id, liveOverlay.isVisible]);

  // --- HANDLERS ---
  const handleDraftFieldChange = (id: string, value: any) => {
    const fieldExists = draftOverlay.fields.some(field => field.id === id);
    const updatedFields = fieldExists
      ? draftOverlay.fields.map(f => f.id === id ? { ...f, value } : f)
      : [...draftOverlay.fields, createFallbackDraftField(id, value)];
    const newOverlay = normalizeElectionOverlay({ ...draftOverlay, fields: updatedFields }, id);
    setDraftOverlay(newOverlay);
    syncManager.updateOverlay(newOverlay);
  };

  const handleDraftFieldChanges = (updates: Record<string, any>) => {
    const updatedFields = draftOverlay.fields.map(field =>
      Object.prototype.hasOwnProperty.call(updates, field.id) ? { ...field, value: updates[field.id] } : field
    );
    Object.entries(updates).forEach(([id, value]) => {
      if (!updatedFields.some(field => field.id === id)) {
        updatedFields.push(createFallbackDraftField(id, value));
      }
    });
    const firstChangedId = Object.keys(updates)[0];
    const newOverlay = normalizeElectionOverlay({ ...draftOverlay, fields: updatedFields }, firstChangedId);
    setDraftOverlay(newOverlay);
    syncManager.updateOverlay(newOverlay);
  };

  const updateDraftTheme = (key: string, value: string) => {
      const newOverlay = { ...draftOverlay, theme: { ...draftOverlay.theme, [key]: value } };
      setDraftOverlay(newOverlay);
      syncManager.updateOverlay(newOverlay);
  };

  const getDraftValue = (id: string) => draftOverlay.fields.find(f => f.id === id)?.value;

  // Phase E.1: hide bottom tabs in Player Stats easy mode
  const isPlayerStatsEasyMode = draftOverlay.type === OverlayType.PLAYER_STATS && String(getDraftValue('playerStatsLabUiMode') || 'easy') === 'easy';

  const getCurrentFieldValues = () =>
      Object.fromEntries(draftOverlay.fields.map(field => [field.id, field.value]));

  const effectiveMetricCatalog = useMemo(
      () => metricCatalog.length ? metricCatalog : fallbackMetricCatalog(),
      [metricCatalog],
  );

  const selectedMetricKeys = useMemo(
      () => parseMetricKeys(getDraftValue('selectedMetricsJson'), ['goals', 'assists', 'minutes', 'appearances', 'starts']),
      [draftOverlay.fields],
  );

  const heroMetricKeys = useMemo(
      () => parseMetricKeys(getDraftValue('heroMetricsJson'), selectedMetricKeys.slice(0, 4)),
      [draftOverlay.fields, selectedMetricKeys],
  );

  const secondaryMetricKeys = useMemo(
      () => parseMetricKeys(getDraftValue('secondaryMetricsJson'), selectedMetricKeys.slice(4, 12)),
      [draftOverlay.fields, selectedMetricKeys],
  );

  const filteredMetricCatalog = useMemo(() => {
      const search = normalizeMetricText(metricSearch);
      if (!search) return effectiveMetricCatalog.slice(0, 36);
      return effectiveMetricCatalog.filter(metric => {
          const haystack = normalizeMetricText([
              metric.key,
              metric.label,
              metric.labelAr,
              metric.category,
              ...(metric.bestFor || []),
          ].join(' '));
          return haystack.includes(search);
      }).slice(0, 48);
  }, [effectiveMetricCatalog, metricSearch]);

  const selectedMetricSet = useMemo(() => new Set(selectedMetricKeys), [selectedMetricKeys]);

  const loadAssetMaps = async () => {
      let clubs = clubLogoMap;
      let players = playerImageMap;
      let renders = playerRenderMap;
      const requests: Promise<void>[] = [];

      if (!Object.keys(clubs).length) {
          requests.push(
              fetchAssetCaches(CLUB_LOGO_CACHE_URLS, 'portrait')
                  .then(map => {
                      clubs = map;
                      setClubLogoMap(map);
                  })
                  .catch(error => console.warn('Club logo cache unavailable', error))
          );
      }

      if (!Object.keys(players).length) {
          requests.push(
              fetchAssetCaches(PLAYER_PORTRAIT_CACHE_URLS, 'portrait')
                  .then(map => {
                      players = map;
                      setPlayerImageMap(map);
                  })
                  .catch(error => console.warn('Player image cache unavailable', error))
          );
      }

      if (!Object.keys(renders).length) {
          requests.push(
              fetchAssetCaches(PLAYER_RENDER_CACHE_URLS, 'render')
                  .then(map => {
                      renders = map;
                      setPlayerRenderMap(map);
                  })
                  .catch(error => console.warn('Player render cache unavailable', error))
          );
      }

      if (requests.length) await Promise.all(requests);
      return { clubs, players, renders };
  };

  const cleanAiFieldUpdates = (updates: Record<string, unknown>) => {
      const currentIds = new Set(draftOverlay.fields.map(field => field.id));
      const enrichmentIds = new Set([
          'playerImage',
          'playerImageLarge',
          'clubLogo',
          'fromClubLogo',
          'toClubLogo',
          'playerAImage',
          'playerBImage',
          'playerCImage',
          'playerAClubLogo',
          'playerBClubLogo',
          'playerCClubLogo',
          'leagueLogo',
          'playerStatsJson',
          'marketItems',
          'latestNews',
          'dailyDeals',
          'expectedDeals',
          'sportmonksSearch',
      ]);

      return Object.entries(updates).reduce<Record<string, any>>((acc, [id, value]) => {
          if (!currentIds.has(id) && !enrichmentIds.has(id)) return acc;
          if (value === null || value === undefined) return acc;
          if (typeof value === 'string' && !value.trim()) return acc;
          acc[id] = typeof value === 'object' ? JSON.stringify(value) : value;
          return acc;
      }, {});
  };

  const withAssetEnrichment = async (
      rawUpdates: Record<string, unknown>,
      hints: { playerName?: string; clubName?: string; fromClub?: string; toClub?: string; imageQuery?: string; fallbackPlayerImageUrl?: string } = {}
  ) => {
      const { clubs, players, renders } = await loadAssetMaps();
      const updates = { ...rawUpdates };
      const current = getCurrentFieldValues();

      const valueOf = (...ids: string[]) =>
          ids.map(id => updates[id] ?? current[id]).map(value => String(value || '').trim()).find(Boolean) || '';

      const playerName = hints.playerName || valueOf('playerName', 'firstName', 'lastName', 'player1Name');
      const toClub = hints.toClub || hints.clubName || valueOf('toClub', 'playerTeam', 'clubName', 'teamName');
      const fromClub = hints.fromClub || valueOf('fromClub');
      const preferRender = draftOverlay.type === OverlayType.TRANSFER_NEWS ||
          draftOverlay.type === OverlayType.BARCA_PREMIUM ||
          draftOverlay.type === OverlayType.PLAYER_STATS;
      const identity = resolvePlayerIdentity(`${playerName} ${toClub}`, toClub);
      const identityAssets = identityToAssetFields(identity, preferRender);
      if (identityAssets.playerName && !String(updates.playerName || '').trim()) updates.playerName = identityAssets.playerName;
      if (identityAssets.playerTeam && !String(updates.playerTeam || '').trim()) updates.playerTeam = identityAssets.playerTeam;
      if (identityAssets.playerPosition && !String(updates.playerPosition || '').trim()) updates.playerPosition = identityAssets.playerPosition;
      if (identityAssets.clubLogo && !String(updates.clubLogo || '').trim()) updates.clubLogo = identityAssets.clubLogo;
      const primaryPlayerMap = preferRender ? renders : players;
      const fallbackPlayerMap = preferRender ? players : renders;

      const rawPlayerImage = String(updates.playerImage || '').trim();
      const playerImageIsUrl = /^https?:\/\//i.test(rawPlayerImage) || rawPlayerImage.startsWith('data:image');
      const resolvedPlayerImage = findAssetUrl([
          rawPlayerImage,
          hints.imageQuery,
          playerName,
          ...assetCandidates(playerName),
          ...assetCandidates(hints.imageQuery),
      ], primaryPlayerMap) || findAssetUrl([
          rawPlayerImage,
          hints.imageQuery,
          playerName,
          ...assetCandidates(playerName),
          ...assetCandidates(hints.imageQuery),
      ], fallbackPlayerMap) || String(identityAssets.playerImage || '') || findAssetUrl([hints.fallbackPlayerImageUrl], {});

      if (!playerImageIsUrl) delete updates.playerImage;
      if (resolvedPlayerImage && !playerImageIsUrl) updates.playerImage = resolvedPlayerImage;
      if (preferRender && resolvedPlayerImage && !String(updates.playerImageLarge || '').trim()) {
          updates.playerImageLarge = String(identityAssets.playerImageLarge || resolvedPlayerImage);
      }

      const toClubLogo = findAssetUrl([toClub, ...assetCandidates(toClub)], clubs);
      const fromClubLogo = findAssetUrl([fromClub, ...assetCandidates(fromClub)], clubs);
      const leagueLogo = findAssetUrl(['La Liga'], clubs);

      if (toClubLogo) {
          if (draftOverlay.type === OverlayType.PLAYER_PROFILE || draftOverlay.type === OverlayType.BARCA_PREMIUM) {
              updates.clubLogo = updates.clubLogo || toClubLogo;
          }
          if (draftOverlay.type === OverlayType.TRANSFER_NEWS) {
              updates.toClubLogo = updates.toClubLogo || toClubLogo;
          }
      }

      if (fromClubLogo && draftOverlay.type === OverlayType.TRANSFER_NEWS) {
          updates.fromClubLogo = updates.fromClubLogo || fromClubLogo;
      }

      if (draftOverlay.type === OverlayType.PLAYER_STATS) {
          ([
              ['A', 'playerAName', 'playerAClub'],
              ['B', 'playerBName', 'playerBClub'],
              ['C', 'playerCName', 'playerCClub'],
          ] as const).forEach(([slot, nameId, clubId]) => {
              const slotPlayer = String(updates[nameId] || current[nameId] || (slot === 'A' ? playerName : '') || '').trim();
              const slotClub = String(updates[clubId] || current[clubId] || (slot === 'A' ? toClub : '') || '').trim();
              const imageId = `player${slot}Image`;
              const logoId = `player${slot}ClubLogo`;
              const slotImage = findAssetUrl([slotPlayer, ...assetCandidates(slotPlayer)], primaryPlayerMap) ||
                  findAssetUrl([slotPlayer, ...assetCandidates(slotPlayer)], fallbackPlayerMap);
              const slotLogo = findAssetUrl([slotClub, ...assetCandidates(slotClub)], clubs);
              if (slotImage && !String(updates[imageId] || current[imageId] || '').trim()) updates[imageId] = slotImage;
              if (slotLogo && !String(updates[logoId] || current[logoId] || '').trim()) updates[logoId] = slotLogo;
          });
      }

      if (leagueLogo) updates.leagueLogo = updates.leagueLogo || leagueLogo;
      return updates;
  };

  const writeSelectedMetrics = (keys: string[], preset?: string) => {
      const normalized = uniqueMetricKeys(keys);
      const updates: Record<string, unknown> = {
          selectedMetricsJson: JSON.stringify(normalized),
          heroMetricsJson: JSON.stringify(normalized.slice(0, 4)),
          secondaryMetricsJson: JSON.stringify(normalized.slice(4, 8)),
      };
      if (preset) updates.metricPreset = preset;
      handleDraftFieldChanges(updates);
  };

  const applyMetricPreset = (preset: string) => {
      writeSelectedMetrics(PLAYER_STATS_PRESETS[preset] || PLAYER_STATS_PRESETS['Attacker Profile'], preset);
  };

  /**
   * Read coverage.availableStatGroups from the most recent fetched payload, if any.
   * Used to filter presets so we don't add metrics that the bridge cannot serve yet.
   */
  const getAvailableStatGroups = (): string[] | undefined => {
      try {
          const parsed = JSON.parse(String(getDraftValue('playerStatsSourceJson') || '{}'));
          const groups = parsed?.coverage?.availableStatGroups;
          return Array.isArray(groups) && groups.length > 0 ? groups : undefined;
      } catch {
          return undefined;
      }
  };

  /**
   * Coverage-aware preset application. Filters the preset's metric list to keep
   * only metrics whose stat group is currently available; falls back to the full
   * preset list if filtering would leave us empty (e.g. no coverage info yet).
   */
  const applyMetricPresetSmart = (preset: string) => {
      const presetMetrics = PLAYER_STATS_PRESETS[preset] || PLAYER_STATS_PRESETS['Attacker Profile'];
      const available = getAvailableStatGroups();
      const filtered = filterAvailableMetrics(presetMetrics, available);
      const final = filtered.length >= 3 ? filtered : presetMetrics;
      writeSelectedMetrics(final, preset);
      if (available && filtered.length < presetMetrics.length && filtered.length >= 3) {
          setAiBoxMessage({
              type: 'success',
              text: `طُبِّق "${PLAYER_STATS_PRESET_LABELS_AR[preset] || preset}" مع تجاهل ${presetMetrics.length - filtered.length} إحصائيات تحتاج كاش متقدم.`,
          });
      }
  };

  /**
   * Player Stats Lab — deterministic Arabic assistant.
   * Parses intent from labAssistantInput and applies preset/mode/metrics.
   * Does NOT call any external AI service; pure rule-based.
   */
  const handleLabAssistantApply = () => {
      const text = labAssistantInput.trim();
      if (!text) {
          setLabAssistantMessage({ type: 'error', text: 'اكتب طلبك أولاً.' });
          return;
      }
      const result = runPlayerStatsAssistant(text);
      if (!result.ok) {
          setLabAssistantMessage({ type: 'error', text: result.message });
          return;
      }
      const updates: Record<string, unknown> = {};
      if (result.mode) updates.playerStatsMode = result.mode;
      if (result.playerName) {
          updates.playerAName = result.playerName;
          if (result.clubName) updates.playerAClub = result.clubName;
      }
      if (result.preset) {
          const presetMetrics = PLAYER_STATS_PRESETS[result.preset] || [];
          const available = getAvailableStatGroups();
          const filtered = filterAvailableMetrics(presetMetrics, available);
          const finalPresetMetrics = filtered.length >= 3 ? filtered : presetMetrics;
          const merged = uniqueMetricKeys([...(result.metrics || []), ...finalPresetMetrics]);
          updates.metricPreset = result.preset;
          updates.selectedMetricsJson = JSON.stringify(merged);
          updates.heroMetricsJson = JSON.stringify(merged.slice(0, 4));
          updates.secondaryMetricsJson = JSON.stringify(merged.slice(4, 8));
      } else if (result.metrics && result.metrics.length > 0) {
          const available = getAvailableStatGroups();
          const explicit = filterAvailableMetrics(result.metrics, available);
          const finalExplicit = explicit.length > 0 ? explicit : result.metrics;
          const merged = uniqueMetricKeys([...selectedMetricKeys, ...finalExplicit]);
          updates.selectedMetricsJson = JSON.stringify(merged);
          updates.heroMetricsJson = JSON.stringify(merged.slice(0, 4));
          updates.secondaryMetricsJson = JSON.stringify(merged.slice(4, 8));
      }
      handleDraftFieldChanges(updates);
      setLabAssistantMessage({ type: 'success', text: result.message });
  };

  const handleLabAssistantClear = () => {
      setLabAssistantInput('');
      setLabAssistantMessage(null);
  };

  const toggleMetricKey = (key: string) => {
      const next = selectedMetricSet.has(key)
          ? selectedMetricKeys.filter(metricKey => metricKey !== key)
          : [...selectedMetricKeys, key];
      writeSelectedMetrics(next);
  };

  const toggleMetricCategory = (category: string) => {
      const categoryKeys = metricsForCategories(effectiveMetricCatalog, [category]);
      const active = categoryKeys.length > 0 && categoryKeys.every(key => selectedMetricSet.has(key));
      const next = active
          ? selectedMetricKeys.filter(key => !categoryKeys.includes(key))
          : uniqueMetricKeys([...selectedMetricKeys, ...categoryKeys]);
      writeSelectedMetrics(next);
  };

  const applyMetricNaturalLanguage = () => {
      const text = String(getDraftValue('metricNaturalLanguage') || '').trim();
      const keys = resolveMetricTextKeys(text, effectiveMetricCatalog);
      if (!keys.length) {
          setAiBoxMessage({ type: 'error', text: 'An error occurred during the operation.' });
          return;
      }
      writeSelectedMetrics(uniqueMetricKeys([...selectedMetricKeys, ...keys]));
      setAiBoxMessage({ type: 'success', text: 'Operation completed successfully.' });
  };

  const handleFetchPlayerStats = async () => {
      if (!selectedMetricKeys.length) {
          setAiBoxMessage({ type: 'error', text: 'اختر إحصائية واحدة على الأقل قبل التحديث.' });
          return;
      }

      setIsFetchingPlayerStats(true);
      setAiBoxMessage(null);
      try {
          const body = {
              mode: String(getDraftValue('playerStatsMode') || 'SINGLE'),
              providerPolicy: String(getDraftValue('providerPolicy') || 'auto'),
              player: {
                  name: String(getDraftValue('playerAName') || getDraftValue('playerName') || getDraftValue('sourcePlayerName') || ''),
                  club: String(getDraftValue('playerAClub') || getDraftValue('playerTeam') || getDraftValue('sourceClubName') || ''),
              },
              comparisonPlayers: [
                  {
                      name: String(getDraftValue('playerBName') || ''),
                      club: String(getDraftValue('playerBClub') || ''),
                  },
                  {
                      name: String(getDraftValue('playerCName') || ''),
                      club: String(getDraftValue('playerCClub') || ''),
                  },
              ].filter(player => player.name.trim()),
              season: String(getDraftValue('seasonLabel') || '2025/26'),
              selectedMetrics: selectedMetricKeys,
              presentation: {
                  heroMetrics: heroMetricKeys,
                  secondaryMetrics: secondaryMetricKeys,
                  visualVariant: String(getDraftValue('playerStatsVisualVariant') || 'CLEAN_BROADCAST'),
              },
          };
          const apiUrl = String(getDraftValue('playerStatsApiUrl') || '/api/player-stats');
          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              cache: 'no-store',
          });
          const payload = await response.json().catch(() => null);
          // Accept any non-error response that contains players or stats data.
          // The local fallback never emits `ok:true`, so we only require HTTP success
          // and a parseable JSON body. Real bridge errors return non-2xx or {error}.
          if (!response.ok || !payload || payload.error) {
              throw new Error(payload?.error || 'Player stats bridge failed');
          }
          handleDraftFieldChanges({
              playerStatsSourceJson: JSON.stringify(payload, null, 2),
              playerStatsDataMode: 'MANUAL',
          });
          // Count available metrics in the response for a clear success message.
          const availableCount = payload?.players?.[0]?.metrics
              ? Object.values(payload.players[0].metrics).filter((m: any) => m?.status === 'available').length
              : selectedMetricKeys.length;
          setAiBoxMessage({ type: 'success', text: `تم تحديث القالب بـ ${availableCount} إحصائيات متاحة.` });
      } catch (error) {
          setAiBoxMessage({ type: 'error', text: 'تعذّر تحديث القالب من المصدر. تحقق من الاتصال أو الإعدادات.' });
      } finally {
          setIsFetchingPlayerStats(false);
      }
  };

  const toggleLiveVisibility = () => {
      syncManager.updateLiveField(liveOverlay.id, 'isVisible', !liveOverlay.isVisible);
  };

  const updateLiveControl = (fieldId: string, value: any) => {
      syncManager.updateLiveField(liveOverlay.id, fieldId, value);
  };

  const handleGenerateScoreboardData = async () => {
      setIsProcessingAI(true);
      setAiError(false);
      try {
          const generated = await generateMatchData('football live broadcast');
          if (!generated) {
              setAiError(true);
              return;
          }

          handleDraftFieldChanges({
              homeName: generated.homeTeam,
              awayName: generated.awayTeam,
              homeScore: generated.homeScore,
              awayScore: generated.awayScore,
              period: generated.period,
          });
      } finally {
          setIsProcessingAI(false);
      }
  };

  const handleGenerateSmartNewsSlides = async () => {
      const rawText = String(getDraftValue('rawText') || '').trim();
      const targetPages = Number(getDraftValue('aiPageCount') || 6);
      if (!rawText) {
          setAiError(true);
          return;
      }

      setIsProcessingAI(true);
      setAiError(false);
      try {
          const generated = await processSmartText(rawText, targetPages);
          if (!generated) {
              setAiError(true);
              return;
          }

          handleDraftFieldChanges({
              headline: generated.title,
              pagesData: JSON.stringify(generated.pages),
              currentPage: 0,
          });
      } finally {
          setIsProcessingAI(false);
      }
  };

  const handleRunUniversalAi = async (mode: 'auto' | 'player' | 'news' = 'auto') => {
      const fieldText = String(
          getDraftValue('rawText') ||
          getDraftValue('headline') ||
          getDraftValue('content') ||
          getDraftValue('specialText') ||
          getDraftValue('playerStatsPrompt') ||
          getDraftValue('sourcePlayerName') ||
          getDraftValue('playerAName') ||
          getDraftValue('playerName') ||
          ''
      ).trim();
      const prompt = aiBoxInput.trim() || fieldText;

      if (!prompt) {
          setAiBoxMessage({ type: 'error', text: 'An error occurred during the operation.' });
          return;
      }

      setIsProcessingAI(true);
      setAiError(false);
      setAiBoxMessage(null);

      try {
          const currentFields = getCurrentFieldValues();
          const isPlayerLike =
              mode !== 'news' && (
              mode === 'player' ||
              draftOverlay.type === OverlayType.TRANSFER_NEWS ||
              draftOverlay.type === OverlayType.PLAYER_PROFILE ||
              draftOverlay.type === OverlayType.BARCA_PREMIUM ||
              draftOverlay.type === OverlayType.PLAYER_STATS
              );
          let updates: Record<string, unknown> = {};
          let hints: { playerName?: string; clubName?: string; fromClub?: string; toClub?: string; imageQuery?: string; fallbackPlayerImageUrl?: string } = {};

          if (isPlayerLike) {
              const currentFullName = String(
                  getDraftValue('playerName') ||
                  getDraftValue('sourcePlayerName') ||
                  getDraftValue('playerAName') ||
                  `${getDraftValue('firstName') || ''} ${getDraftValue('lastName') || ''}`.trim()
              ).trim();
              const currentClub = String(
                  getDraftValue('toClub') ||
                  getDraftValue('playerTeam') ||
                  getDraftValue('sourceClubName') ||
                  getDraftValue('playerAClub') ||
                  getDraftValue('clubName') ||
                  getDraftValue('teamName') ||
                  ''
              ).trim();
              const detectedPlayer = findPlayerAlias(prompt);
              const detectedClub = findClubAlias(prompt);
              const promptConfidence = extractPercentSignal(prompt);
              const isLeavingStory = hasLeavingSignal(prompt);
              const isFreeStory = hasFreeTransferSignal(prompt);
              const generated = draftOverlay.type === OverlayType.PLAYER_STATS
                  ? await assistPlayerStatsQuery({
                      rawText: prompt,
                      playerName: detectedPlayer?.name || currentFullName,
                      clubName: detectedClub?.name || currentClub,
                      currentFields,
                  })
                  : await assistPlayerTransferCard({
                      rawText: prompt,
                      playerName: detectedPlayer?.name || currentFullName,
                      clubName: detectedClub?.name || currentClub,
                      currentFields,
                  });

              if (!generated) throw new Error('AI returned no player data');

              const generatedAny = generated as any;
              updates = { ...(generated.fields || {}) };
              const resolvedPlayerName = String(detectedPlayer?.name || generated.playerName || updates.playerName || currentFullName || '').trim();
              const resolvedClubName = String(detectedClub?.name || generated.clubName || updates.playerTeam || updates.toClub || currentClub || detectedPlayer?.club || '').trim();
              const stats = Array.isArray(generatedAny.stats)
                  ? generatedAny.stats
                      .filter(stat => stat && stat.label)
                      .slice(0, 8)
                      .map(stat => ({
                          label: String(stat.label),
                          value: stat.value === null || stat.value === undefined ? '' : String(stat.value),
                          hint: stat.hint || 'AI / source needed',
                      }))
                  : [];

              if (resolvedPlayerName) {
                  updates.playerName = updates.playerName || resolvedPlayerName;
                  updates.sportmonksSearch = updates.sportmonksSearch || resolvedPlayerName;
              }
              if (resolvedClubName) {
                  updates.playerTeam = updates.playerTeam || resolvedClubName;
                  updates.toClub = updates.toClub || resolvedClubName;
              }
              if (generated.position || detectedPlayer?.position) {
                  const position = generated.position || detectedPlayer?.position || '';
                  updates.playerPosition = updates.playerPosition || position;
                  updates.playerRole = updates.playerRole || position;
                  updates.position = updates.position || position;
              }
              if (promptConfidence !== null) {
                  updates.confidence = promptConfidence;
              }
              if (isFreeStory) {
                  updates.dealValue = updates.dealValue || 'Free transfer / end of contract';
              }
              if (isLeavingStory && detectedClub?.name) {
                  updates.fromClub = updates.fromClub || detectedClub.name;
                  const currentToClub = String(updates.toClub || '').trim();
                  if (!currentToClub || currentToClub === detectedClub.name || /(?:unknown|not specified)/i.test(currentToClub)) {
                      updates.toClub = isFreeStory ? 'Free agent' : 'Destination TBC';
                  }
              }
              if (generatedAny.headline || (resolvedPlayerName && isLeavingStory)) {
                  updates.headline = updates.headline || generatedAny.headline || `${resolvedPlayerName} EXIT WATCH`;
              }
              if (generatedAny.summary) {
                  updates.subheadline = updates.subheadline || generatedAny.summary;
                  updates.bodyText = updates.bodyText || generatedAny.summary;
                  updates.latestNews = updates.latestNews || generatedAny.summary;
              }
              if (isLeavingStory || isFreeStory || promptConfidence !== null) {
                  updates.subheadline = updates.subheadline || `${resolvedClubName || detectedClub?.name || 'Club'} exit scenario tracked at ${promptConfidence ?? Number(getDraftValue('confidence') || 65)}%.`;
                  updates.latestNews = updates.latestNews || [
                      prompt,
                      isFreeStory ? 'Free transfer angle detected from contract context.' : 'Market movement detected from AI prompt.',
                      promptConfidence !== null ? `Probability signal locked at ${promptConfidence}%.` : 'Probability can be adjusted from the confidence control.',
                  ].join(';');
                  updates.source = updates.source || 'AI Mercato Desk';
              }
              if (stats.length) {
                  updates.playerStatsJson = updates.playerStatsJson || JSON.stringify(stats);
                  updates.playerStatsSourceJson = updates.playerStatsSourceJson || JSON.stringify({
                      mode: String(getDraftValue('playerStatsMode') || 'SINGLE'),
                      updatedAt: new Date().toISOString(),
                      source: 'AI + asset cache',
                      players: [{
                          name: resolvedPlayerName,
                          club: resolvedClubName,
                          position: generated.position || detectedPlayer?.position || '',
                          image: '',
                          season: String(getDraftValue('seasonLabel') || '2025/26'),
                          stats,
                      }],
                  });
                  stats.slice(0, 3).forEach((stat, index) => {
                      updates[`stat${index + 1}Label`] = updates[`stat${index + 1}Label`] || stat.label;
                      updates[`stat${index + 1}Value`] = updates[`stat${index + 1}Value`] || stat.value;
                  });
              }

              if (draftOverlay.type === OverlayType.PLAYER_STATS && resolvedPlayerName) {
                  updates.playerAName = updates.playerAName || resolvedPlayerName;
                  updates.playerAClub = updates.playerAClub || resolvedClubName || detectedPlayer?.club || currentClub;
                  updates.playerAPosition = updates.playerAPosition || generated.position || detectedPlayer?.position || '';
                  updates.playerStatsPrompt = updates.playerStatsPrompt || prompt;
                  updates.sourcePlayerName = updates.sourcePlayerName || resolvedPlayerName;
                  updates.sourceClubName = updates.sourceClubName || resolvedClubName || detectedPlayer?.club || currentClub;
              }

              if (draftOverlay.type === OverlayType.BARCA_PREMIUM && resolvedPlayerName) {
                  const parts = resolvedPlayerName.split(/\s+/).filter(Boolean);
                  updates.firstName = updates.firstName || (parts[0] || resolvedPlayerName).toUpperCase();
                  updates.lastName = updates.lastName || (parts.slice(1).join(' ') || resolvedPlayerName).toUpperCase();
                  updates.subline = updates.subline || resolvedClubName || 'LA LIGA';
              }

              if (draftOverlay.type === OverlayType.TRANSFER_NEWS && resolvedPlayerName && (!updates.marketItems || isLeavingStory || isFreeStory || promptConfidence !== null)) {
                  const marketConfidence = promptConfidence ?? Number(updates.confidence || getDraftValue('confidence') || 70);
                  const marketFrom = String(updates.fromClub || getDraftValue('fromClub') || detectedClub?.name || 'Source club');
                  const marketTo = String(updates.toClub || (isFreeStory ? 'Free agent' : resolvedClubName) || getDraftValue('toClub') || 'Destination TBC');
                  const marketValue = String(updates.dealValue || getDraftValue('dealValue') || (isFreeStory ? 'Free transfer' : 'Market watch'));
                  updates.marketItems = JSON.stringify([{
                      player: resolvedPlayerName,
                      from: marketFrom,
                      to: marketTo,
                      value: marketValue,
                      confidence: marketConfidence,
                      status: isFreeStory ? 'Contract exit' : 'AI prepared',
                      tag: isLeavingStory ? 'Exit watch' : 'Focus',
                  }]);
              }

              hints = {
                  playerName: resolvedPlayerName,
                  clubName: resolvedClubName,
                  toClub: String(updates.toClub || resolvedClubName || ''),
                  fromClub: String(updates.fromClub || getDraftValue('fromClub') || ''),
                  imageQuery: generatedAny.imageQuery,
                  fallbackPlayerImageUrl: detectedPlayer?.fallbackImage,
              };
          } else {
              const generated = await assistTemplateFields({
                  rawText: prompt,
                  overlayType: draftOverlay.type,
                  overlayName: draftOverlay.name,
                  currentFields,
              });

              if (!generated) throw new Error('AI returned no template data');

              updates = { ...(generated.fields || {}) };
              const headlineField = ['headline', 'title', 'content', 'specialText'].find(id => id in currentFields);
              const subtitleField = ['subheadline', 'subline', 'bodyText', 'subtitle'].find(id => id in currentFields);
              if (generated.title && headlineField && !updates[headlineField]) updates[headlineField] = generated.title;
              if (generated.subtitle && subtitleField && !updates[subtitleField]) updates[subtitleField] = generated.subtitle;
              hints = generated.assetHints || {};
          }

          const enriched = await withAssetEnrichment(updates, hints);
          const cleanUpdates = cleanAiFieldUpdates(enriched);

          if (!Object.keys(cleanUpdates).length) {
              setAiBoxMessage({ type: 'error', text: 'An error occurred during the operation.' });
              return;
          }

          handleDraftFieldChanges(cleanUpdates);
          setAiBoxMessage({ type: 'success', text: 'Operation completed successfully.' });
      } catch (error) {
          console.error('Universal AI box failed', error);
          setAiError(true);
          setAiBoxMessage({ type: 'error', text: 'An error occurred during the operation.' });
      } finally {
          setIsProcessingAI(false);
      }
  };

  // --- SPONSORS LOGIC ---
  const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsAdminAuthorizing(true);
      setPasswordError(null);

      try {
          await adminSessionService.login(adminPassword);
          setIsAdminUnlocked(true);
          setAdminPassword('');
      } catch (error) {
          setPasswordError('Authentication failed.');
      } finally {
          setIsAdminAuthorizing(false);
      }
  };

  const handleAdminLogout = () => {
      adminSessionService.clear();
      setIsAdminUnlocked(false);
      setPasswordError(null);
  };

  const handleAddSponsor = async () => {
      if (!newSponsor.name || !newSponsor.amount) return;
      setIsAddingSponsor(true);

      const amountNum = parseFloat(newSponsor.amount);
      const usdAmount = await currencyService.convertToUSD(amountNum, newSponsor.currency);

      const donation = {
          id: `don-${Date.now()}`,
          amount: amountNum,
          currency: newSponsor.currency,
          usdAmount: usdAmount,
          timestamp: Date.now()
      };

      const sponsorToAdd: Sponsor = {
          id: Date.now().toString(),
          name: newSponsor.name,
          amount: amountNum,
          currency: newSponsor.currency,
          usdAmount: usdAmount,
          avatar: newSponsor.avatar,
          history: [donation]
      };

      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      let currentSponsors: Sponsor[] = [];
      try { currentSponsors = JSON.parse(currentSponsorsStr); } catch (e) {}

      let updatedSponsors = [sponsorToAdd, ...currentSponsors];
      updatedSponsors.sort((a, b) => b.usdAmount - a.usdAmount);

      handleDraftFieldChange('sponsorsData', JSON.stringify(updatedSponsors));
      setNewSponsor({ name: '', amount: '', currency: 'SAR', avatar: '' });
      setIsAddingSponsor(false);
  };

  const handleDeleteSponsor = (id: string) => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const updated = currentSponsors.filter(s => s.id !== id);
      handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
  };

  const handleAutoSort = () => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      let currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      // Sort High to Low (using the calculated usdAmount)
      currentSponsors.sort((a, b) => b.usdAmount - a.usdAmount);
      handleDraftFieldChange('sponsorsData', JSON.stringify(currentSponsors));
  };

  const handleTopUp = async (id: string, amountToAdd?: number) => {
      const finalAmountStr = amountToAdd !== undefined ? amountToAdd.toString() : topUpAmount;
      if (!finalAmountStr || isNaN(parseFloat(finalAmountStr))) return;
      
      setIsToppingUp(true);
      const additionalAmount = parseFloat(finalAmountStr);

      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const sponsorIndex = currentSponsors.findIndex(s => s.id === id);
      
      if (sponsorIndex !== -1) {
          const sponsor = currentSponsors[sponsorIndex];
          
          const donation = {
              id: `don-${Date.now()}`,
              amount: additionalAmount,
              currency: sponsor.currency,
              usdAmount: await currencyService.convertToUSD(additionalAmount, sponsor.currency),
              timestamp: Date.now()
          };

          const newHistory = [...(sponsor.history || []), donation];
          const newTotalAmount = newHistory.reduce((sum, entry) => sum + entry.amount, 0);
          const newTotalUsdAmount = newHistory.reduce((sum, entry) => sum + entry.usdAmount, 0);
          
          const updated = [...currentSponsors];
          updated[sponsorIndex] = { 
              ...sponsor, 
              amount: newTotalAmount, 
              usdAmount: newTotalUsdAmount,
              history: newHistory
          };
          
          updated.sort((a, b) => b.usdAmount - a.usdAmount);
          
          handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
          setTopUpSponsorId(null);
          setTopUpAmount('');
      }
      setIsToppingUp(false);
  };

  const handleUpdateSponsorInfo = (id: string) => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const updated = currentSponsors.map(s => 
          s.id === id ? { ...s, name: editSponsorData.name, avatar: editSponsorData.avatar } : s
      );
      handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
      setEditingSponsorId(null);
  };

  const handleDeleteDonation = (sponsorId: string, donationId: string) => {
      const currentSponsorsStr = String(getDraftValue('sponsorsData') || '[]');
      const currentSponsors: Sponsor[] = JSON.parse(currentSponsorsStr);
      const sponsorIndex = currentSponsors.findIndex(s => s.id === sponsorId);
      
      if (sponsorIndex !== -1) {
          const sponsor = currentSponsors[sponsorIndex];
          const newHistory = sponsor.history.filter(d => d.id !== donationId);
          
          if (newHistory.length === 0) {
              handleDeleteSponsor(sponsorId);
              setViewingHistoryId(null);
              return;
          }

          const newTotalAmount = newHistory.reduce((sum, entry) => sum + entry.amount, 0);
          const newTotalUsdAmount = newHistory.reduce((sum, entry) => sum + entry.usdAmount, 0);
          
          const updated = [...currentSponsors];
          updated[sponsorIndex] = { 
              ...sponsor, 
              amount: newTotalAmount, 
              usdAmount: newTotalUsdAmount,
              history: newHistory
          };
          
          updated.sort((a, b) => b.usdAmount - a.usdAmount);
          handleDraftFieldChange('sponsorsData', JSON.stringify(updated));
      }
  };

  // --- IMAGES ---
  const triggerFileUpload = (fieldId: string) => {
    setActiveImageFieldId(fieldId);
    fileInputRef.current?.click();
  };

  const resizeImageForLiveState = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image decode failed'));
      };

      img.src = url;
    });

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeImageFieldId) {
        const base64String = await resizeImageForLiveState(file).catch(() => readFileAsDataUrl(file));
        const field = draftOverlay.fields.find(f => f.id === activeImageFieldId);
        
        if (field?.type === 'image-list') {
            const currentImages = Array.isArray(field.value) ? field.value : [];
            handleDraftFieldChange(activeImageFieldId, [...currentImages, base64String]);
        } else {
            handleDraftFieldChange(activeImageFieldId, base64String);
        }
        
        setActiveImageFieldId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const validateMatchStatsJson = (parsed: unknown) => {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Operation failed.');
    }

    const data = parsed as Record<string, unknown>;
    const hasStructuredOutput = Boolean(data.match && (data.homeStats || data.awayStats));
    const hasWhoScoredRaw = Boolean(data.events && data.home && data.away);

    if (!hasStructuredOutput && !hasWhoScoredRaw) {
      throw new Error('Operation failed.');
    }
  };

  const applyMatchStatsJson = (parsed: unknown, successText: string) => {
    validateMatchStatsJson(parsed);
    const text = JSON.stringify(parsed, null, 2);
    if (text.length > MAX_MATCH_STATS_JSON_LENGTH) {
      throw new Error('Operation failed.');
    }

    handleDraftFieldChanges({
      dataMode: 'PASTE_JSON',
      manualJson: text,
    });
    setMatchStatsImportMessage({ type: 'success', text: successText });
  };

  const handleMatchStatsJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setIsImportingMatchStats(true);
    setMatchStatsImportMessage(null);
    try {
      if (file.size > MAX_MATCH_STATS_JSON_LENGTH) {
        throw new Error('Operation failed.');
      }

      const text = await file.text();
      const parsed = JSON.parse(text);
      applyMatchStatsJson(parsed, 'JSON .');
    } catch (error) {
      setMatchStatsImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'JSON.',
      });
    } finally {
      setIsImportingMatchStats(false);
      input.value = '';
    }
  };

  const getMatchStatsApiUrl = () => {
    const configuredUrl = String(getDraftValue('apiUrl') || '').trim();
    return configuredUrl || CLOUD_MATCH_API_URL;
  };

  const getAdminAuthHeaders = () => {
    const session = adminSessionService.getStoredSession();
    if (!session) {
      throw new Error('Operation failed.');
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    };
  };

  const callMatchStatsControl = async (
    action: 'set-match' | 'start' | 'stop' | 'archive',
    body: Record<string, unknown> = {},
    signal?: AbortSignal,
  ) => {
    const response = await fetch(`/api/reo-match/control?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal,
    });
    const payload = await response.json().catch(() => ({})) as BridgeStatusSnapshot & { error?: string };
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : '');
    }
    setBridgeStatus(payload);
    return payload;
  };

  const handleRefreshMatchStatsStatus = async () => {
    setIsBridgeActionRunning(true);
    setMatchStatsImportMessage(null);
    try {
      const response = await fetch('/api/reo-match/status', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as BridgeStatusSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : '');
      }
      setBridgeStatus(payload);
      const statusText = payload.pollingActive || payload.workerAlive ? 'Active' : 'Inactive';
      setMatchStatsImportMessage({ type: 'success', text: statusText });
    } catch (error) {
      setMatchStatsImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '',
      });
    } finally {
      setIsBridgeActionRunning(false);
    }
  };

  const handleSetMatchStatsBridgeUrl = async () => {
    const sourceUrl = String(getDraftValue('sourceMatchUrl') || '').trim();
    if (!sourceUrl || !/whoscored\.com/i.test(sourceUrl)) {
      setMatchStatsImportMessage({ type: 'error', text: 'Import failed.' });
      return;
    }

    setIsBridgeActionRunning(true);
    setMatchStatsImportMessage(null);
    try {
      await callMatchStatsControl('set-match', { url: sourceUrl });
      handleDraftFieldChanges({
        dataMode: 'CLOUD_BRIDGE',
        apiUrl: CLOUD_MATCH_API_URL,
        sourceMatchUrl: sourceUrl,
      });
      setMatchStatsImportMessage({ type: 'success', text: 'Import completed.' });
    } catch (error) {
      setMatchStatsImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '.',
      });
    } finally {
      setIsBridgeActionRunning(false);
    }
  };

  const handleStopMatchStatsBridge = async () => {
    setIsBridgeActionRunning(true);
    setMatchStatsImportMessage(null);
    try {
      await callMatchStatsControl('stop');
      setMatchStatsImportMessage({ type: 'success', text: 'Import completed.' });
    } catch (error) {
      setMatchStatsImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '.',
      });
    } finally {
      setIsBridgeActionRunning(false);
    }
  };

  const handleArchiveMatchStatsBridge = async () => {
    setIsBridgeActionRunning(true);
    setMatchStatsImportMessage(null);
    try {
      const payload = await callMatchStatsControl('archive');
      const archive = payload.archive;
      if (archive?.ok) {
        const archivePath = archive.path ? `: ${archive.path}` : '';
        setMatchStatsImportMessage({
          type: 'success',
          text: archive.skipped ? `Skipped${archivePath}` : `Archived to GitHub${archivePath}`,
        });
      } else {
        setMatchStatsImportMessage({
          type: 'error',
          text: archive?.error || archive?.reason || 'Archive failed.',
        });
      }
    } catch (error) {
      setMatchStatsImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'GitHub.',
      });
    } finally {
      setIsBridgeActionRunning(false);
    }
  };

  const handleImportMatchStatsFromBridge = async () => {
    setIsImportingMatchStats(true);
    setMatchStatsImportMessage(null);
    try {
      const url = getMatchStatsApiUrl();
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Operation failed.');
      }

      const parsed = await response.json();
      applyMatchStatsJson(parsed, 'Live Bridge .');
    } catch (error) {
      setMatchStatsImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '.',
      });
    } finally {
      setIsImportingMatchStats(false);
    }
  };

  const handleStartMatchStatsBridge = async () => {
    const sourceUrl = String(getDraftValue('sourceMatchUrl') || '').trim();
    if (!sourceUrl || !/whoscored\.com/i.test(sourceUrl)) {
      setMatchStatsImportMessage({ type: 'error', text: 'Import failed.' });
      return;
    }

    setIsImportingMatchStats(true);
    setIsBridgeActionRunning(true);
    setMatchStatsImportMessage(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75_000);

    try {
      const payload = await callMatchStatsControl('start', { url: sourceUrl, intervalSec: 60 }, controller.signal);
      const response = { ok: true };
      if (!response.ok) {
        throw new Error(payload.error || '.');
      }

      handleDraftFieldChanges({ dataMode: 'CLOUD_BRIDGE', apiUrl: CLOUD_MATCH_API_URL, sourceMatchUrl: sourceUrl });
      const bridgeMatch = payload.match || {};
      const teams = bridgeMatch.homeTeam && bridgeMatch.awayTeam ? ` (${bridgeMatch.homeTeam} - ${bridgeMatch.awayTeam})` : '';
      setMatchStatsImportMessage({ type: 'success', text: 'Import completed.' });
    } catch (error) {
      setMatchStatsImportMessage({
        type: 'error',
        text: error instanceof Error && error.name === 'AbortError'
          ? 'Request timed out. Try EXTRACT_NOW.'
          : error instanceof Error ? error.message : 'Bridge connection failed.',
      });
    } finally {
      window.clearTimeout(timeout);
      setIsImportingMatchStats(false);
      setIsBridgeActionRunning(false);
    }
  };

  const bridgeMatch = bridgeStatus?.match;
  const bridgeStatusTone = bridgeStatus?.pollingActive || bridgeStatus?.workerAlive
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
    : bridgeStatus?.stoppedReason === 'match_final'
      ? 'bg-amber-500/10 text-amber-200 border-amber-500/25'
      : 'bg-gray-800 text-gray-300 border-gray-700';
  const bridgeStatusLabel = bridgeStatus
    ? bridgeStatus.pollingActive || bridgeStatus.workerAlive
      ? 'Live Polling'
      : bridgeStatus.stoppedReason === 'match_final'
        ? 'Match Ended'
        : 'Disconnected'
    : 'No Bridge';
  const bridgeClock = bridgeMatch?.displayStatus || bridgeMatch?.clock || (bridgeMatch?.minute ? `${bridgeMatch.minute}'` : bridgeMatch?.status);
  const bridgeScore = bridgeMatch?.homeTeam && bridgeMatch?.awayTeam
    ? `${bridgeMatch.homeTeam} ${bridgeMatch.homeScore ?? 0}-${bridgeMatch.awayScore ?? 0} ${bridgeMatch.awayTeam}${bridgeClock ? `  ${bridgeClock}` : ''}`
    : null;
  const bridgeArchive = bridgeStatus?.archive;
  const bridgeControlsLocked = !isAdminUnlocked || isImportingMatchStats || isBridgeActionRunning;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0d10]">
      
      {/*  RIGHT CONTROL PANEL (collapsible)  */}
      <div className={`flex flex-col z-10 bg-[#13151f] border-r border-white/[0.06] shadow-2xl transition-all duration-300 overflow-hidden ${ panelOpen ? 'w-96' : 'w-0' }`}>
       <div className="w-96 flex flex-col h-full">
         <div className="h-12 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[#13151f]">
           <button onClick={onBack} className="text-gray-500 hover:text-white text-xs flex items-center gap-1.5 font-bold transition-colors">
             <ChevronRight className="w-4 h-4" /> 
           </button>
           <div className="flex items-center gap-2">
               <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span></span>
               </div>
           </div>
        </div>

                 <div className="flex flex-col overflow-hidden" style={{ height: `${sidebarSplitPct}%` }}>
         <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
         {/* QUICK ACTIONS PANEL */}
        {draftOverlay.type === OverlayType.SCOREBOARD && (
            <div className="p-4 bg-gray-950/50 border-b border-gray-800 grid grid-cols-2 gap-2">
                <button onClick={() => {
                    const field = draftOverlay.fields.find(f => f.id === 'homeScore');
                    if(field) handleDraftFieldChange('homeScore', Number(field.value) + 1);
                }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors flex flex-col items-center">
                    <span className="text-[10px] text-blue-200"></span>
                    <span>1</span>
                </button>
                <button onClick={() => {
                    const field = draftOverlay.fields.find(f => f.id === 'awayScore');
                    if(field) handleDraftFieldChange('awayScore', Number(field.value) + 1);
                }} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-colors flex flex-col items-center">
                    <span className="text-[10px] text-red-200"></span>
                    <span>1</span>
                </button>
                <button onClick={() => handleDraftFieldChange('period', '')} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-1.5 rounded-lg text-xs col-span-2">
                      
                </button>
            </div>
        )}
        
        {draftOverlay.type === OverlayType.SCOREBOARD && (
            <div className="p-4 bg-purple-950/25 border-b border-purple-900/40 space-y-2">
                <button
                  onClick={handleGenerateScoreboardData}
                  disabled={isProcessingAI}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isProcessingAI ? 'جاري التوليد...' : 'توليد بيانات المباراة'}
                </button>
                {aiError && <div className="text-[11px] text-red-400 text-center">. GEMINI_API_KEY .</div>}
            </div>
        )}

        {draftOverlay.type !== OverlayType.ELECTION && draftOverlay.type !== OverlayType.MATCH_STATS && (
            <div className="shrink-0 border-b border-cyan-900/35 bg-cyan-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-cyan-200 font-black flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> مساعد الذكاء
                    </label>
                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                        AI
                    </span>
                </div>
                <textarea
                  value={aiBoxInput}
                  onChange={(event) => setAiBoxInput(event.target.value)}
                  rows={3}
                  placeholder="اكتب نص الخبر أو اسم اللاعب أو فكرة القالب..."
                  className="w-full resize-y rounded-lg border border-cyan-800/45 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400"
                />
                <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunUniversalAi('auto')}
                      disabled={isProcessingAI}
                      className="rounded-lg bg-cyan-600 px-2 py-2 text-[10px] font-black text-white transition-colors hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      تلقائي
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunUniversalAi('player')}
                      disabled={isProcessingAI}
                      className="rounded-lg bg-rose-600 px-2 py-2 text-[10px] font-black text-white transition-colors hover:bg-rose-500 disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      لاعب / ميركاتو
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunUniversalAi('news')}
                      disabled={isProcessingAI}
                      className="rounded-lg bg-slate-800 px-2 py-2 text-[10px] font-black text-slate-100 transition-colors hover:bg-slate-700 disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      أخبار
                    </button>
                </div>
                {aiBoxMessage && (
                    <div className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${
                      aiBoxMessage.type === 'success'
                        ? 'border-emerald-700/40 bg-emerald-950/25 text-emerald-200'
                        : 'border-red-700/40 bg-red-950/25 text-red-200'
                    }`}>
                        {aiBoxMessage.text}
                    </div>
                )}
            </div>
        )}

        {draftOverlay.type === OverlayType.PLAYER_STATS && (() => {
            const parsedSource = (() => {
                try { return JSON.parse(String(getDraftValue('playerStatsSourceJson') || '{}')); }
                catch { return {}; }
            })();
            const coverage = parsedSource.coverage;
            const statsMode = String(getDraftValue('playerStatsMode') || 'SINGLE');
            const labUiMode = String(getDraftValue('playerStatsLabUiMode') || 'easy') as 'easy' | 'advanced';
            const isEasy = labUiMode === 'easy';
            const availableStatGroups: string[] | undefined = Array.isArray(coverage?.availableStatGroups) && coverage.availableStatGroups.length
                ? coverage.availableStatGroups
                : undefined;
            const lastFetchAt = parsedSource?.updatedAt || parsedSource?.generatedAt || '';

            // Tab set: easy mode hides Coverage tab (replaced by inline summary).
            const tabs = (isEasy
                ? [
                    { id: 'basic',    label: 'أساسي' },
                    { id: 'metrics',  label: 'الإحصائيات' },
                    { id: 'visuals',  label: 'الشكل' },
                  ]
                : [
                    { id: 'basic',    label: 'أساسي' },
                    { id: 'metrics',  label: 'الإحصائيات' },
                    { id: 'visuals',  label: 'الشكل' },
                    { id: 'coverage', label: 'التغطية' },
                  ]) as Array<{ id: 'basic' | 'metrics' | 'visuals' | 'coverage'; label: string }>;

            // Derive hero/secondary/hidden from stored JSON
            const heroKeys = (JSON.parse(String(getDraftValue('heroMetricsJson') || '[]')) as string[]);
            const secondaryKeys = (JSON.parse(String(getDraftValue('secondaryMetricsJson') || '[]')) as string[]);
            const hiddenKeys = (JSON.parse(String(getDraftValue('hiddenMetricsJson') || '[]')) as string[]);
            const allFetchedMetrics = parsedSource?.players?.[0]?.metrics || {};
            const missingKeys = Object.entries(allFetchedMetrics)
              .filter(([_, m]: [string, any]) => m.status === 'unavailable' || m.status === 'error')
              .map(([k]) => k);

            const writeMetricOrder = (hero: string[], secondary: string[], hidden: string[]) => {
                handleDraftFieldChanges({
                    heroMetricsJson: JSON.stringify(hero),
                    secondaryMetricsJson: JSON.stringify(secondary),
                    hiddenMetricsJson: JSON.stringify(hidden),
                    selectedMetricsJson: JSON.stringify([...hero, ...secondary]),
                });
            };

            const moveMetric = (key: string, from: 'hero' | 'secondary' | 'hidden', to: 'hero' | 'secondary' | 'hidden') => {
                const lists = { hero: [...heroKeys], secondary: [...secondaryKeys], hidden: [...hiddenKeys] };
                lists[from] = lists[from].filter(k => k !== key);
                if (to === 'hero' && lists.hero.length >= 5) return; // Hero limit
                if (to === 'secondary' && lists.secondary.length >= 8) return; // Secondary limit
                lists[to].push(key);
                writeMetricOrder(lists.hero, lists.secondary, lists.hidden);
            };

            const reorderMetric = (section: 'hero' | 'secondary', oldIndex: number, newIndex: number) => {
                if (section === 'hero') {
                    writeMetricOrder(arrayMove(heroKeys, oldIndex, newIndex), secondaryKeys, hiddenKeys);
                } else {
                    writeMetricOrder(heroKeys, arrayMove(secondaryKeys, oldIndex, newIndex), hiddenKeys);
                }
            };

            const removeMetric = (key: string) => {
                writeMetricOrder(
                    heroKeys.filter(k => k !== key),
                    secondaryKeys.filter(k => k !== key),
                    hiddenKeys.filter(k => k !== key),
                );
            };

            const handleDragEnd = (section: 'hero' | 'secondary') => (event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const items = section === 'hero' ? heroKeys : secondaryKeys;
                const oldIndex = items.indexOf(String(active.id));
                const newIndex = items.indexOf(String(over.id));
                if (oldIndex !== -1 && newIndex !== -1) reorderMetric(section, oldIndex, newIndex);
            };

            return (
            <div className="shrink-0 flex flex-col flex-1 min-h-0 border-b border-cyan-900/40 bg-slate-950/70" dir="rtl">

                {/* ═══ Sticky control banner ═══ */}
                <div className="sticky top-0 z-30 border-b border-cyan-900/50 bg-slate-950/95 backdrop-blur-sm p-3 space-y-2">
                    {/* Easy / Advanced switch */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex rounded-lg overflow-hidden border border-slate-700">
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('playerStatsLabUiMode', 'easy')}
                              className={`px-3 py-1.5 text-[10px] font-black transition-colors ${isEasy ? 'bg-cyan-500 text-black' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
                            >الوضع السهل</button>
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('playerStatsLabUiMode', 'advanced')}
                              className={`px-3 py-1.5 text-[10px] font-black transition-colors ${!isEasy ? 'bg-cyan-500 text-black' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
                            >الوضع المتقدم</button>
                        </div>
                        {!isEasy && (
                            <span className="text-[9px] text-slate-400 font-bold">
                                {selectedMetricKeys.length} إحصائية محددة
                                {lastFetchAt ? ` • آخر تحديث ${new Date(lastFetchAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                        )}
                    </div>

                    {/* Master "تحديث القالب" button */}
                    <button
                      type="button"
                      onClick={handleFetchPlayerStats}
                      disabled={isFetchingPlayerStats || !selectedMetricKeys.length}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetchingPlayerStats ? 'animate-spin' : ''}`} />
                        {isFetchingPlayerStats ? 'جارٍ التحديث...' : 'تحديث القالب'}
                    </button>

                    {/* Coverage summary in easy mode (one-line, friendly) */}
                    {isEasy && coverage && (
                        <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                            coverage.status === 'full' || (availableStatGroups && availableStatGroups.length >= 5)
                                ? 'border-emerald-700/30 bg-emerald-950/20'
                                : 'border-amber-700/30 bg-amber-950/20'
                        }`}>
                            <Info className={`w-3.5 h-3.5 shrink-0 ${
                                coverage.status === 'full' || (availableStatGroups && availableStatGroups.length >= 5)
                                    ? 'text-emerald-300'
                                    : 'text-amber-300'
                            }`} />
                            <div className="flex-1 min-w-0">
                                <div className={`text-[10px] font-black truncate ${
                                    coverage.status === 'full' || (availableStatGroups && availableStatGroups.length >= 5)
                                        ? 'text-emerald-200'
                                        : 'text-amber-200'
                                }`}>
                                    {coverage.status === 'full'
                                        ? 'البيانات الكاملة متاحة'
                                        : availableStatGroups && availableStatGroups.length >= 5
                                            ? 'البيانات الأساسية والمتقدمة متاحة جزئيًا'
                                            : 'البيانات الأساسية متاحة'}
                                </div>
                                {coverage.status !== 'full' && availableStatGroups && (
                                    <div className="text-[9px] text-amber-300/60 font-bold" dir="rtl">
                                        {availableStatGroups.length >= 5
                                            ? `متاح: الموسم، التسديد، الدقائق، الانضباط، الحراس • ناقص: التمرير، صناعة الفرص، الدفاع، الاستحواذ`
                                            : availableStatGroups.length >= 2
                                                ? `متاح: ${availableStatGroups.length} مجموعات • ناقص: ${coverage.missingStatGroups?.length || '?'} مجموعات`
                                                : 'التسديد والتمرير والدفاع ستظهر بعد اكتمال الكاش المتقدم.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status / fetch result */}
                    {aiBoxMessage && (
                        <div className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold ${
                          aiBoxMessage.type === 'success'
                            ? 'border-emerald-700/40 bg-emerald-950/25 text-emerald-200'
                            : 'border-red-700/40 bg-red-950/25 text-red-200'
                        }`}>
                            {aiBoxMessage.text}
                        </div>
                    )}
                </div>

                {/* Sticky Tabs Header */}
                <div className="flex bg-slate-900 border-b border-slate-800 sticky top-[140px] z-20">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActivePlayerStatsTab(tab.id)}
                            className={`flex-1 py-2.5 text-[10px] font-black transition-colors ${activePlayerStatsTab === tab.id ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] space-y-4">

                    {/* ═══ BASIC TAB (merges Setup + Presets + Lab Assistant) ═══ */}
                    {activePlayerStatsTab === 'basic' && (
                        <div className="space-y-4">
                            {/* Player mode */}
                            <div>
                                <label className="text-xs font-black text-cyan-200 block mb-1">{LABELS.setup.playerMode.ar}</label>
                                <select
                                    value={statsMode}
                                    onChange={(event) => handleDraftFieldChange('playerStatsMode', event.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white"
                                    dir="rtl"
                                >
                                    <option value="SINGLE">{LABELS.setup.singlePlayer.ar}</option>
                                    <option value="COMPARE">{LABELS.setup.comparePlayers.ar}</option>
                                    <option value="SCOUT_SHORTLIST">{LABELS.setup.scoutShortlist.ar}</option>
                                </select>
                            </div>

                            {/* Player A */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-cyan-200 block mb-1">{LABELS.setup.targetPlayer.ar}</label>
                                <input
                                    value={String(getDraftValue('playerAName') || getDraftValue('playerName') || getDraftValue('sourcePlayerName') || '')}
                                    onChange={(event) => handleDraftFieldChange('playerAName', event.target.value)}
                                    placeholder={LABELS.setup.playerName.en}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
                                    dir="ltr"
                                />
                                <input
                                    value={String(getDraftValue('playerAClub') || getDraftValue('playerTeam') || getDraftValue('sourceClubName') || '')}
                                    onChange={(event) => handleDraftFieldChange('playerAClub', event.target.value)}
                                    placeholder={LABELS.setup.club.en}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
                                    dir="ltr"
                                />
                            </div>

                            {/* Player B — Compare/Scout */}
                            {statsMode !== 'SINGLE' && (
                                <div className="space-y-2 border-t border-slate-800 pt-3">
                                    <label className="text-xs font-black text-cyan-200 block mb-1">{LABELS.setup.secondPlayer.ar}</label>
                                    <input
                                        value={String(getDraftValue('playerBName') || '')}
                                        onChange={(event) => handleDraftFieldChange('playerBName', event.target.value)}
                                        placeholder={LABELS.setup.playerName.en}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
                                        dir="ltr"
                                    />
                                    <input
                                        value={String(getDraftValue('playerBClub') || '')}
                                        onChange={(event) => handleDraftFieldChange('playerBClub', event.target.value)}
                                        placeholder={LABELS.setup.club.en}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
                                        dir="ltr"
                                    />
                                </div>
                            )}

                            {/* Season */}
                            <div>
                                <label className="text-xs font-black text-cyan-200 block mb-1">{LABELS.setup.season.ar}</label>
                                <input
                                    value={String(getDraftValue('seasonLabel') || '2025/26')}
                                    onChange={(event) => handleDraftFieldChange('seasonLabel', event.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
                                    dir="ltr"
                                />
                            </div>

                            {/* Smart preset (always visible — entry point of the lab) */}
                            <div className="border-t border-slate-800 pt-3">
                                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/80">{LABELS.presets.title.ar}</div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {Object.keys(PLAYER_STATS_PRESETS).map(preset => {
                                        const active = String(getDraftValue('metricPreset') || 'Attacker Profile') === preset;
                                        return (
                                            <button
                                              key={preset}
                                              type="button"
                                              onClick={() => applyMetricPresetSmart(preset)}
                                              className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${active ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                                              dir="rtl"
                                            >
                                                {PLAYER_STATS_PRESET_LABELS_AR[preset] || preset}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Lab assistant (deterministic Arabic intent parser) */}
                            <div className="border-t border-slate-800 pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-cyan-200 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        مساعد القالب
                                    </label>
                                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                                        AR
                                    </span>
                                </div>
                                <textarea
                                  value={labAssistantInput}
                                  onChange={(event) => setLabAssistantInput(event.target.value)}
                                  rows={2}
                                  placeholder="اكتب ما تريد عرضه، مثل: أريد بطاقة هجومية لليفاندوفسكي مع الأهداف والأسيست والدقائق"
                                  className="w-full resize-y rounded-lg border border-cyan-800/45 bg-slate-950/70 px-3 py-2 text-[11px] leading-5 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400"
                                  dir="rtl"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      onClick={handleLabAssistantApply}
                                      className="rounded-lg bg-cyan-600 px-2 py-2 text-[10px] font-black text-white transition-colors hover:bg-cyan-500"
                                    >
                                        إنشاء إعداد
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { handleLabAssistantApply(); handleFetchPlayerStats(); }}
                                      className="rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-black text-white transition-colors hover:bg-emerald-500"
                                    >
                                        تطبيق على القالب
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleLabAssistantClear}
                                      className="rounded-lg bg-slate-800 px-2 py-2 text-[10px] font-black text-slate-100 transition-colors hover:bg-slate-700"
                                    >
                                        مسح
                                    </button>
                                </div>
                                {labAssistantMessage && (
                                    <div className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold ${
                                      labAssistantMessage.type === 'success'
                                        ? 'border-emerald-700/40 bg-emerald-950/25 text-emerald-200'
                                        : 'border-red-700/40 bg-red-950/25 text-red-200'
                                    }`} dir="rtl">
                                        {labAssistantMessage.text}
                                    </div>
                                )}
                            </div>

                            {/* Advanced-only controls inside Basic tab */}
                            {!isEasy && (
                                <div className="border-t border-slate-800 pt-3 space-y-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-300 block mb-1">سياسة المصدر</label>
                                        <select
                                          value={String(getDraftValue('providerPolicy') || 'auto')}
                                          onChange={(event) => handleDraftFieldChange('providerPolicy', event.target.value)}
                                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold text-white"
                                          dir="rtl"
                                        >
                                            <option value="auto">موجِّه تلقائي</option>
                                            <option value="fbref">موسم FBref أولًا</option>
                                            <option value="matchBridge">جسر المباريات أولًا</option>
                                            <option value="demo">وضع تجريبي آمن</option>
                                        </select>
                                    </div>
                                    <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-2 text-[9px] text-slate-400 font-mono leading-relaxed" dir="ltr">
                                        <div>selectedMetrics: [{selectedMetricKeys.length}] {selectedMetricKeys.slice(0, 6).join(', ')}{selectedMetricKeys.length > 6 ? '…' : ''}</div>
                                        <div>heroMetrics: [{heroMetricKeys.length}] {heroMetricKeys.join(', ')}</div>
                                        <div>secondaryMetrics: [{secondaryMetricKeys.length}] {secondaryMetricKeys.join(', ')}</div>
                                        <div>lastFetchAt: {lastFetchAt || '—'}</div>
                                        <div>availableStatGroups: {availableStatGroups ? availableStatGroups.join(', ') : '—'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ METRICS TAB ═══ */}
                    {activePlayerStatsTab === 'metrics' && (
                        <div className="space-y-5">
                            {/* Hero Metrics Section */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/90">
                                        {LABELS.metrics.heroMetrics.ar} <span className="text-white/30">({heroKeys.length}/5)</span>
                                    </div>
                                </div>
                                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd('hero')}>
                                    <SortableContext items={heroKeys} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-1">
                                            {heroKeys.map((key, index) => {
                                                const unavailable = availableStatGroups && !isMetricAvailable(key, availableStatGroups);
                                                return (
                                                    <div key={key} className={unavailable ? 'opacity-40' : ''} title={unavailable ? 'تحتاج كاش متقدم' : undefined}>
                                                        <SortableMetricItem
                                                            id={key}
                                                            section="hero"
                                                            isFirst={index === 0}
                                                            isLast={index === heroKeys.length - 1}
                                                            onMoveUp={() => reorderMetric('hero', index, index - 1)}
                                                            onMoveDown={() => reorderMetric('hero', index, index + 1)}
                                                            onMoveTo={(target) => moveMetric(key, 'hero', target)}
                                                            onRemove={() => removeMetric(key)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>

                            {/* Secondary Metrics Section */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300/90">
                                        {LABELS.metrics.secondaryMetrics.ar} <span className="text-white/30">({secondaryKeys.length}/8)</span>
                                    </div>
                                </div>
                                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd('secondary')}>
                                    <SortableContext items={secondaryKeys} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-1">
                                            {secondaryKeys.map((key, index) => {
                                                const unavailable = availableStatGroups && !isMetricAvailable(key, availableStatGroups);
                                                return (
                                                    <div key={key} className={unavailable ? 'opacity-40' : ''} title={unavailable ? 'تحتاج كاش متقدم' : undefined}>
                                                        <SortableMetricItem
                                                            id={key}
                                                            section="secondary"
                                                            isFirst={index === 0}
                                                            isLast={index === secondaryKeys.length - 1}
                                                            onMoveUp={() => reorderMetric('secondary', index, index - 1)}
                                                            onMoveDown={() => reorderMetric('secondary', index, index + 1)}
                                                            onMoveTo={(target) => moveMetric(key, 'secondary', target)}
                                                            onRemove={() => removeMetric(key)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>

                            {/* Hidden Metrics Section — advanced only */}
                            {!isEasy && hiddenKeys.length > 0 && (
                                <div>
                                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">{LABELS.metrics.hiddenMetrics.ar}</div>
                                    <div className="space-y-1">
                                        {hiddenKeys.map(key => (
                                            <div key={key} className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-800/20 px-2.5 py-1.5 text-[11px] opacity-50" dir="rtl">
                                                <span className="text-white/60 font-bold">{getMetricLabel(key, 'ar')}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => moveMetric(key, 'hidden', 'secondary')} className="text-[9px] text-emerald-400 font-bold">{LABELS.metrics.unhide.ar}</button>
                                                    <button onClick={() => removeMetric(key)} className="text-[9px] text-rose-400 font-bold">{LABELS.metrics.remove.ar}</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Missing Metrics — advanced only */}
                            {!isEasy && missingKeys.length > 0 && (
                                <div>
                                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-400/70">{LABELS.metrics.missingMetrics.ar}</div>
                                    <div className="space-y-1">
                                        {missingKeys.map(key => {
                                            const m = allFetchedMetrics[key];
                                            return (
                                                <div key={key} className="flex items-center justify-between rounded-lg border border-rose-500/15 bg-rose-500/5 px-2.5 py-1 text-[10px]" dir="rtl">
                                                    <span className="text-white/50 font-bold">{getMetricLabel(key, 'ar')}</span>
                                                    <span className="text-rose-300/60 text-[9px]">{LABELS.renderer.requires.ar} {m?.requiredStatGroup || m?.statGroup || '?'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ COVERAGE TAB ═══ */}
                    {activePlayerStatsTab === 'coverage' && (
                        <div className="space-y-4">
                            {coverage ? (
                                <>
                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                                        <Info className={`w-4 h-4 ${coverage.status === 'full' ? 'text-emerald-400' : 'text-amber-400'}`} />
                                        <span className={`text-[11px] font-black ${coverage.status === 'full' ? 'text-emerald-200' : 'text-amber-200'}`}>
                                            {coverage.status === 'full' ? LABELS.coverage.fullCache.ar : LABELS.coverage.partialCache.ar}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">{LABELS.coverage.availableGroups.ar}</span>
                                            <div className="flex flex-wrap gap-1">
                                                {coverage.availableStatGroups?.map((group: string) => (
                                                    <span key={group} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-200">{group}</span>
                                                ))}
                                            </div>
                                        </div>
                                        {coverage.missingStatGroups?.length > 0 && (
                                            <div className="mt-2">
                                                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">{LABELS.coverage.missingGroups.ar}</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {coverage.missingStatGroups.map((group: string) => (
                                                        <span key={group} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[9px] font-bold text-rose-200">{group}</span>
                                                    ))}
                                                </div>
                                                <div className="mt-3 p-2 rounded border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-200/80 font-bold" dir="rtl">
                                                    {LABELS.coverage.advancedWarning.ar}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-[11px] font-bold text-slate-400 text-center p-4" dir="rtl">
                                    {LABELS.coverage.noData.ar}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ VISUALS TAB ═══ */}
                    {activePlayerStatsTab === 'visuals' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-cyan-200 block mb-1">{LABELS.visuals.visualVariant.ar}</label>
                                <select
                                  value={String(getDraftValue('playerStatsVisualVariant') || 'CLEAN_BROADCAST')}
                                  onChange={(event) => handleDraftFieldChange('playerStatsVisualVariant', event.target.value)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white"
                                  dir="rtl"
                                >
                                    <option value="CLEAN_BROADCAST">بث نظيف</option>
                                    <option value="ULTRA_LAB">مختبر متقدم</option>
                                    <option value="COMPACT_CARD">بطاقة مختصرة</option>
                                    <option value="GLASS_SCOUT">زجاج استكشافي</option>
                                    <option value="BARCA_RADAR">رادار برشلونة</option>
                                    <option value="MINIMAL_CAST">بث مينيمال</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-cyan-200 block mb-1" dir="rtl">لغة العنوان</label>
                                <select
                                  value={String(getDraftValue('titleMode') || 'arabic')}
                                  onChange={(event) => handleDraftFieldChange('titleMode', event.target.value)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white"
                                  dir="rtl"
                                >
                                    <option value="arabic">عربي (افتراضي)</option>
                                    <option value="english">English</option>
                                    <option value="custom">مخصص</option>
                                </select>
                                {String(getDraftValue('titleMode') || 'arabic') === 'custom' && (
                                  <input
                                    value={String(getDraftValue('headline') || '')}
                                    onChange={(event) => handleDraftFieldChange('headline', event.target.value)}
                                    placeholder="اكتب العنوان المخصص"
                                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
                                    dir="rtl"
                                  />
                                )}
                            </div>
                            <div className="flex items-center justify-between border border-white/5 bg-white/5 p-2 rounded">
                                <label className="text-[11px] font-black text-cyan-200">{LABELS.visuals.showMissingBox.ar}</label>
                                <button
                                  type="button"
                                  onClick={() => handleDraftFieldChange('showUnavailableMetrics', String(getDraftValue('showUnavailableMetrics') || 'false') === 'true' ? 'false' : 'true')}
                                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${String(getDraftValue('showUnavailableMetrics') || 'false') === 'true' ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${String(getDraftValue('showUnavailableMetrics') || 'false') === 'true' ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            <div>
                                <label className="text-xs font-black text-cyan-200 block mb-1">{LABELS.visuals.scale.ar}</label>
                                <input
                                    type="range"
                                    min="0.5" max="1.5" step="0.05"
                                    value={Number(getDraftValue('scale') || 1)}
                                    onChange={(e) => handleDraftFieldChange('scale', Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    )}

                </div>
            </div>
            );
        })()}

        {draftOverlay.type === OverlayType.MATCH_STATS && (
            <div className="shrink-0 max-h-[62vh] overflow-y-auto border-b border-blue-900/40 bg-blue-950/25 p-4 [scrollbar-width:thin] space-y-3">
                <input
                  ref={matchStatsJsonInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleMatchStatsJsonFileChange}
                />
                <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-blue-300 font-bold flex items-center gap-1.5">
                        <ArrowDownUp className="w-3 h-3" />  Match Stats
                    </label>
                    <span className="text-[10px] font-mono text-blue-300/70 bg-blue-950/50 px-2 py-0.5 rounded">
                        {String(getDraftValue('dataMode') || 'CLOUD_BRIDGE')}
                    </span>
                </div>
                <input
                  type="url"
                  dir="ltr"
                  value={String(getDraftValue('sourceMatchUrl') || '')}
                  onChange={(event) => handleDraftFieldChange('sourceMatchUrl', event.target.value)}
                  placeholder="https://www.whoscored.com/matches/.../live/..."
                  className="w-full bg-gray-900 border border-blue-900/50 rounded-lg px-3 py-2 text-white text-[11px] font-mono focus:outline-none focus:border-blue-500"
                />
                <div className={`rounded-lg border px-3 py-2 ${bridgeStatusTone}`}>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em]">Cloud Bridge</span>
                        <span className="text-[10px] font-bold">{bridgeStatusLabel}</span>
                    </div>
                    <div className="mt-1 truncate text-[11px] font-bold text-white/80">
                        {bridgeScore || bridgeStatus?.currentUrl || '.'}
                    </div>
                    {bridgeStatus?.lastError && (
                        <div className="mt-1 truncate text-[10px] font-bold text-red-300">{bridgeStatus.lastError}</div>
                    )}
                    {bridgeArchive && (
                        <div className={`mt-1 truncate text-[10px] font-bold ${bridgeArchive.ok ? 'text-emerald-200/90' : 'text-red-300'}`}>
                            {bridgeArchive.ok
                              ? `GitHub Archive${bridgeArchive.skipped ? 'unchanged' : ''}: ${bridgeArchive.path || 'ready'}`
                              : `Archive error: ${bridgeArchive.error || bridgeArchive.reason || 'not saved'}`}
                        </div>
                    )}
                </div>
                <div className="rounded-lg border border-blue-800/35 bg-slate-950/45 p-3 space-y-3">
                    <div>
                        <div className="mb-1.5 text-[10px] font-black text-blue-200/80"></div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {MATCH_STAT_PRESET_QUICK.map(option => {
                              const active = String(getDraftValue('matchMetricPreset') || 'SMART') === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleDraftFieldChange('matchMetricPreset', option.value)}
                                  className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${active ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                        </div>
                    </div>
                    <div>
                        <div className="mb-1.5 text-[10px] font-black text-rose-200/80"></div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {PLAYER_STAT_PRESET_QUICK.map(option => {
                              const active = String(getDraftValue('playerMetricPreset') || 'SMART') === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleDraftFieldChange('playerMetricPreset', option.value)}
                                  className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${active ? 'bg-rose-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                        </div>
                    </div>
                    <div>
                        <div className="mb-1.5 text-[10px] font-black text-cyan-200/80"></div>
                        <div className="grid grid-cols-5 gap-1.5">
                            {MATCH_VISUAL_STYLE_QUICK.map(option => {
                              const active = String(getDraftValue('visualStyle') || 'DUAL_RAIL') === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleDraftFieldChange('visualStyle', option.value)}
                                  className={`rounded-md px-1.5 py-1.5 text-[9px] font-black transition-colors ${active ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                        </div>
                    </div>
                    <div>
                        <div className="mb-1.5 text-[10px] font-black text-violet-200/80"></div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('broadcastMotion', !Boolean(getDraftValue('broadcastMotion') ?? true))}
                              className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${Boolean(getDraftValue('broadcastMotion') ?? true) ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            >
                              
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('broadcastQuality', String(getDraftValue('broadcastQuality') || 'ULTRA') === 'ULTRA' ? 'STANDARD' : 'ULTRA')}
                              className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${String(getDraftValue('broadcastQuality') || 'ULTRA') === 'ULTRA' ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            >
                              Ultra
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('showCreatorBadge', !Boolean(getDraftValue('showCreatorBadge') ?? true))}
                              className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${Boolean(getDraftValue('showCreatorBadge') ?? true) ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            >
                              
                            </button>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('matchPanelScale', Math.max(0.65, Number(getDraftValue('matchPanelScale') || 1) - 0.05))}
                              className="rounded-md bg-gray-800 px-2 py-1.5 text-[10px] font-black text-gray-200 transition-colors hover:bg-gray-700"
                            >
                               
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('matchPanelScale', Math.min(1.6, Number(getDraftValue('matchPanelScale') || 1) + 0.05))}
                              className="rounded-md bg-gray-800 px-2 py-1.5 text-[10px] font-black text-gray-200 transition-colors hover:bg-gray-700"
                            >
                               
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('playerPanelScale', Math.max(0.65, Number(getDraftValue('playerPanelScale') || 1) - 0.05))}
                              className="rounded-md bg-gray-800 px-2 py-1.5 text-[10px] font-black text-gray-200 transition-colors hover:bg-gray-700"
                            >
                               
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDraftFieldChange('playerPanelScale', Math.min(1.6, Number(getDraftValue('playerPanelScale') || 1) + 0.05))}
                              className="rounded-md bg-gray-800 px-2 py-1.5 text-[10px] font-black text-gray-200 transition-colors hover:bg-gray-700"
                            >
                               
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDraftFieldChange('teamStatsSide', 'HOME_LEFT')}
                          className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${String(getDraftValue('teamStatsSide') || 'HOME_LEFT') === 'HOME_LEFT' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        >
                           
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDraftFieldChange('teamStatsSide', 'AWAY_LEFT')}
                          className={`rounded-md px-2 py-1.5 text-[10px] font-black transition-colors ${String(getDraftValue('teamStatsSide') || 'HOME_LEFT') === 'AWAY_LEFT' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        >
                           
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDraftFieldChanges({
                            homeColor: String(getDraftValue('awayColor') || '#ef4444'),
                            awayColor: String(getDraftValue('homeColor') || '#3b82f6'),
                          })}
                          className="rounded-md bg-gray-800 px-2 py-1.5 text-[10px] font-black text-gray-200 transition-colors hover:bg-gray-700"
                        >
                           
                        </button>
                    </div>
                </div>
                {!isAdminUnlocked && (
                    <form onSubmit={handleAdminLogin} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="mb-2 text-[11px] font-bold text-amber-200">.</div>
                        <div className="mb-2 text-[10px] leading-5 text-amber-100/70">
                              Vercel  EDITOR_ADMIN_PASSCODE  ADMIN_ACCESS_CODE.          .
                        </div>
                        <div className="flex gap-2">
                            <input
                              type="password"
                              value={adminPassword}
                              onChange={(event) => setAdminPassword(event.target.value)}
                              placeholder="Admin passcode"
                              className="min-w-0 flex-1 rounded-md border border-amber-500/25 bg-black/35 px-2 py-2 text-xs text-white outline-none focus:border-amber-300"
                            />
                            <button
                              type="submit"
                              disabled={isAdminAuthorizing}
                              className="rounded-md bg-amber-500 px-3 py-2 text-xs font-black text-black disabled:bg-gray-700 disabled:text-gray-400"
                            >
                              
                            </button>
                        </div>
                        {passwordError && <div className="mt-2 text-[10px] font-bold text-red-300">{passwordError}</div>}
                    </form>
                )}
                <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleStartMatchStatsBridge}
                      disabled={bridgeControlsLocked}
                      className="col-span-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Zap className="w-3 h-3" />     
                    </button>
                    <button
                      type="button"
                      onClick={handleSetMatchStatsBridgeUrl}
                      disabled={bridgeControlsLocked}
                      className="hidden"
                    >
                        <Monitor className="w-3 h-3" />  
                    </button>
                    <button
                      type="button"
                      onClick={handleStopMatchStatsBridge}
                      disabled={bridgeControlsLocked}
                      className="bg-red-600/80 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Square className="w-3 h-3" /> 
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshMatchStatsStatus}
                      disabled={isBridgeActionRunning}
                      className="bg-slate-800 hover:bg-slate-700 disabled:bg-gray-700 disabled:text-gray-400 text-gray-100 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                        <RefreshCw className="w-3 h-3" />   Google Cloud
                    </button>
                    <button
                      type="button"
                      onClick={handleArchiveMatchStatsBridge}
                      disabled={bridgeControlsLocked}
                      className="col-span-2 bg-cyan-700/80 hover:bg-cyan-600 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                        <History className="w-3 h-3" />    GitHub
                    </button>
                    <button
                      type="button"
                      onClick={() => matchStatsJsonInputRef.current?.click()}
                      disabled={isImportingMatchStats}
                      className="hidden"
                    >
                        <Copy className="w-3 h-3" />  JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleImportMatchStatsFromBridge}
                      disabled={isImportingMatchStats}
                      className="hidden"
                    >
                        <Zap className="w-3 h-3" />  
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDraftFieldChanges({ dataMode: 'CLOUD_BRIDGE', apiUrl: CLOUD_MATCH_API_URL });
                        setMatchStatsImportMessage({ type: 'success', text: 'Import completed.' });
                      }}
                      className="hidden"
                    >
                        <Monitor className="w-3 h-3" />  Live Bridge 
                    </button>
                </div>
                {matchStatsImportMessage && (
                    <div className={`text-[11px] text-center rounded-lg px-3 py-2 border ${
                      matchStatsImportMessage.type === 'success'
                        ? 'text-emerald-300 bg-emerald-950/30 border-emerald-700/30'
                        : 'text-red-300 bg-red-950/30 border-red-700/30'
                    }`}>
                        {matchStatsImportMessage.text}
                    </div>
                )}
            </div>
        )}

        {draftOverlay.type === OverlayType.SMART_NEWS && (
            <div className="p-4 bg-purple-950/30 border-b border-purple-900/50 space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-purple-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />    
                    </label>
                    <button
                      onClick={handleGenerateSmartNewsSlides}
                      disabled={isProcessingAI}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                    >
                        {isProcessingAI ? '' : ''}
                    </button>
                    {aiError && <div className="text-[11px] text-red-400">Gemini .</div>}
                </div>

                <div className="pt-2 border-t border-purple-900/30">
                    <label className="text-xs text-blue-300 font-bold flex items-center justify-between mb-2">
                        <span></span>
                        <span className="font-mono text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded text-[10px]">
                             {Number(getDraftValue('currentPage') || 0) + 1} / {(() => { try { return JSON.parse(String(getDraftValue('pagesData') || '[]').replace(/[\x00-\x1f\x7f\u2028\u2029]/g, ' ')).length || 1; } catch { return 1; } })()}
                        </span>
                    </label>
                    <div className="flex gap-2">
                        <button 
                          onClick={() => {
                              const curr = Number(getDraftValue('currentPage') || 0);
                              if (curr > 0) handleDraftFieldChange('currentPage', curr - 1);
                          }}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-xs transition-colors"
                        >
                            <Rewind className="w-3 h-3" /> 
                        </button>
                        <button 
                          onClick={() => {
                              const curr = Number(getDraftValue('currentPage') || 0);
                              let pages: any[] = [];
                              try { pages = JSON.parse(String(getDraftValue('pagesData') || '[]').replace(/[\x00-\x1f\x7f\u2028\u2029]/g, ' ')); } catch { pages = []; }
                              if (curr < (pages.length || 1) - 1) handleDraftFieldChange('currentPage', curr + 1);
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-xs transition-colors"
                        >
                             <FastForward className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {draftOverlay.type === OverlayType.PLAYER_PROFILE && (
            <div className="p-4 bg-gray-950/50 border-b border-gray-800">
                <label className="text-xs text-blue-400 font-bold block mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />   (Presets)
                </label>
                <select onChange={(e) => {
                    const preset = e.target.value;
                    if(preset === 'messi') {
                        handleDraftFieldChange('playerName', 'Lionel Messi');
                        handleDraftFieldChange('playerNumber', '10');
                        handleDraftFieldChange('playerRole', 'Forward');
                        handleDraftFieldChange('stat1Value', '838');
                        handleDraftFieldChange('stat1Label', 'Goals');
                        handleDraftFieldChange('stat2Value', '374');
                        handleDraftFieldChange('stat2Label', 'Assists');
                        handleDraftFieldChange('stat3Value', '9.9');
                        handleDraftFieldChange('stat3Label', 'Rating');
                        handleDraftFieldChange('playerImage', 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg');
                    } else if(preset === 'yamal') {
                        handleDraftFieldChange('playerName', 'Lamine Yamal');
                        handleDraftFieldChange('playerNumber', '27');
                        handleDraftFieldChange('playerRole', 'Winger');
                        handleDraftFieldChange('stat1Value', '8');
                        handleDraftFieldChange('stat1Label', 'Goals');
                        handleDraftFieldChange('stat2Value', '12');
                        handleDraftFieldChange('stat2Label', 'Assists');
                        handleDraftFieldChange('stat3Value', '9.2');
                        handleDraftFieldChange('stat3Label', 'Rating');
                        handleDraftFieldChange('playerImage', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Lamine_Yamal_2023.jpg/800px-Lamine_Yamal_2023.jpg');
                    } else if(preset === 'pedri') {
                        handleDraftFieldChange('playerName', 'Pedri');
                        handleDraftFieldChange('playerNumber', '8');
                        handleDraftFieldChange('playerRole', 'Midfielder');
                        handleDraftFieldChange('stat1Value', '5');
                        handleDraftFieldChange('stat1Label', 'Goals');
                        handleDraftFieldChange('stat2Value', '10');
                        handleDraftFieldChange('stat2Label', 'Assists');
                        handleDraftFieldChange('stat3Value', '9.0');
                        handleDraftFieldChange('stat3Label', 'Rating');
                        handleDraftFieldChange('playerImage', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Pedri_2024.jpg/800px-Pedri_2024.jpg');
                    }
                    e.target.value = "";
                }} className="w-full bg-blue-900/20 text-blue-300 border border-blue-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-bold">
                    <option value="">-- --</option>
                    <option value="messi"></option>
                    <option value="yamal"></option>
                    <option value="pedri"></option>
                </select>
            </div>
        )}

        {draftOverlay.type === OverlayType.TICKER && (
            <div className="p-4 bg-red-950/30 border-b border-red-900/50">
                <label className="text-xs text-red-400 font-bold block mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />   
                </label>
                <div className="flex gap-2">
                    <input type="text" id="quick-ticker" placeholder="   ..." className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-red-500" onKeyDown={(e) => {
                        if(e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if(val) {
                                handleDraftFieldChange('content', val);
                                e.currentTarget.value = '';
                            }
                        }
                    }}/>
                    <button onClick={() => {
                        const input = document.getElementById('quick-ticker') as HTMLInputElement;
                        if(input && input.value) {
                            handleDraftFieldChange('content', input.value);
                            input.value = '';
                        }
                    }} className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-2 rounded text-xs transition-colors whitespace-nowrap">
                         
                    </button>
                </div>
            </div>
        )}

        {draftOverlay.type === OverlayType.TOP_VIEWERS && (() => {
            const count = Math.min(Number(draftOverlay.fields.find(f => f.id === 'viewerCount')?.value || 5), 10);

            //  resize image to max 512px and return base64 
            const resizeToBase64 = (file: File): Promise<string> =>
              new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                  const MAX = 512;
                  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                  const c = document.createElement('canvas');
                  c.width = Math.max(1, Math.round(img.width * scale));
                  c.height = Math.max(1, Math.round(img.height * scale));
                  c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
                  URL.revokeObjectURL(url);
                  resolve(c.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = () => {
                  URL.revokeObjectURL(url);
                  reject(new Error('. JPG PNG WEBP .'));
                };
                img.src = url;
              });

            return (
            <div className="bg-yellow-950/20 border-b border-yellow-900/30">

                {/*  Screenshot drop zone for AI Vision  */}
                <div className="p-4 pb-2">
                  <label className="text-xs text-yellow-400 font-bold flex items-center gap-1.5 mb-2">
                    <Zap className="w-3 h-3" />      (Gemini Vision)
                  </label>
                  <p className="text-gray-500 text-[10px] mb-3">1-3</p>

                  <label
                    htmlFor="screenshot-upload"
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-yellow-700/40 rounded-xl p-5 cursor-pointer hover:border-yellow-500/60 hover:bg-yellow-900/10 transition-all"
                  >
                    <span className="text-3xl"></span>
                    <span className="text-yellow-400 text-xs font-bold">1-3</span>
                    <span className="text-gray-600 text-[10px]">JPG / PNG / WEBP 5MB</span>
                  </label>
                  <input
                    ref={screenshotInputRef}
                    id="screenshot-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async e => {
                      const input = e.currentTarget;
                      const files = input.files ? Array.from(input.files as ArrayLike<File>).slice(0, 3) : [];
                      if (!files.length) return;
                      const oversized = files.find(file => file.size > 5 * 1024 * 1024);
                      if (oversized) {
                        setViewerAiError('5MB.');
                        input.value = '';
                        return;
                      }

                      setIsExtractingViewers(true);
                      setViewerAiError(null);
                      try {
                        const base64s = await Promise.all(files.map(resizeToBase64));
                        const results = await extractViewersFromScreenshots(base64s);
                        if (results && Array.isArray(results) && results.length) {
                          const updates: Record<string, string> = {};
                          results.slice(0, count).forEach((viewer, index) => {
                            const rawRank = Number(viewer.rank);
                            const rank = Number.isFinite(rawRank)
                              ? Math.min(Math.max(Math.round(rawRank), 1), count)
                              : index + 1;
                            if (viewer.name?.trim()) updates[`viewer${rank}Name`] = viewer.name.trim();
                            if (viewer.badge?.trim()) updates[`viewer${rank}Badge`] = viewer.badge.trim();
                          });

                          if (Object.keys(updates).length) {
                            handleDraftFieldChanges(updates);
                          } else {
                            setViewerAiError('.');
                          }
                        } else {
                          setViewerAiError('.');
                        }
                      } catch (error) {
                        setViewerAiError(error instanceof Error ? error.message : '.');
                      } finally {
                        setIsExtractingViewers(false);
                        input.value = '';
                      }
                    }}
                  />
                  <button
                    id="ai-extract-btn"
                    type="button"
                    onClick={() => screenshotInputRef.current?.click()}
                    disabled={isExtractingViewers}
                    className="w-full mt-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30 font-bold py-2 rounded-lg text-xs transition-colors disabled:opacity-40"
                  >
                    {isExtractingViewers ? '...' : ''}
                  </button>
                  {viewerAiError && <div className="text-[11px] text-red-400 text-center mt-2">{viewerAiError}</div>}
                </div>

                {/*  Quick name+image entry table  */}
                <div className="px-4 pb-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1.5 mb-2">
                        :
                    </label>
                    <div className="space-y-1.5">
                        {Array.from({ length: count }, (_, i) => {
                            const idx = i + 1;
                            const nameVal = String(draftOverlay.fields.find(f => f.id === `viewer${idx}Name`)?.value || '');
                            const imgVal  = String(draftOverlay.fields.find(f => f.id === `viewer${idx}Image`)?.value || '');
                            const medal = idx === 1 ? '' : idx === 2 ? '' : idx === 3 ? '' : `#${idx}`;
                            return (
                                <div key={idx} className="flex items-center gap-2 bg-black/20 rounded-lg p-2 border border-yellow-900/20">
                                    <span className="text-xs w-5 text-center flex-shrink-0">{medal}</span>
                                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0 bg-gray-800">
                                        {imgVal
                                          ? <img src={imgVal} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-3 h-3 text-gray-600" /></div>
                                        }
                                    </div>
                                    <input type="text" value={nameVal}
                                        onChange={e => handleDraftFieldChange(`viewer${idx}Name`, e.target.value)}
                                        placeholder={`${idx}`}
                                        className="flex-1 bg-transparent text-white text-xs placeholder-gray-600 focus:outline-none min-w-0" />
                                    <input type="text" value={imgVal}
                                        onChange={e => handleDraftFieldChange(`viewer${idx}Image`, e.target.value)}
                                        placeholder=" ..."
                                        className="flex-1 bg-transparent text-gray-400 text-[10px] placeholder-gray-700 focus:outline-none min-w-0 font-mono"
                                        dir="ltr" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/*  AI Badges button  */}
                <div className="px-4 pb-4">
                    <button
                        onClick={async () => {
                            const channelName = String(draftOverlay.fields.find(f => f.id === 'channelName')?.value || 'REO LIVE');
                            const viewers: { name: string; rank: number }[] = [];
                            for (let i = 1; i <= count; i++) {
                                const name = String(draftOverlay.fields.find(f => f.id === `viewer${i}Name`)?.value || '').trim();
                                if (name) viewers.push({ name, rank: i });
                            }
                            if (viewers.length === 0) {
                                setViewerAiError('.');
                                return;
                            }

                            setIsGeneratingViewerBadges(true);
                            setViewerAiError(null);
                            try {
                                const badges = await generateViewerBadges(viewers, channelName);
                                if (badges && Array.isArray(badges) && badges.length) {
                                    const updates: Record<string, string> = {};
                                    badges.forEach(badge => {
                                        const rank = Math.min(Math.max(Math.round(Number(badge.rank)), 1), count);
                                        if (Number.isFinite(rank) && badge.badge?.trim()) {
                                            updates[`viewer${rank}Badge`] = badge.badge.trim();
                                        }
                                    });

                                    if (Object.keys(updates).length) {
                                        handleDraftFieldChanges(updates);
                                    } else {
                                        setViewerAiError('.');
                                    }
                                } else {
                                    setViewerAiError('.');
                                }
                            } catch (error) {
                                setViewerAiError(error instanceof Error ? error.message : '.');
                            } finally {
                                setIsGeneratingViewerBadges(false);
                            }
                        }}
                        id="ai-badges-btn"
                        type="button"
                        disabled={isGeneratingViewerBadges}
                        className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 font-bold py-2 rounded-lg text-xs transition-colors mt-1"
                    >
                        {isGeneratingViewerBadges ? '...' : ''}
                    </button>
                </div>
            </div>
            );
        })()}


         </div></div>
         {/* RESIZABLE SPLITTER */}
         <div
           className="h-2 cursor-row-resize bg-white/[0.04] hover:bg-cyan-500/20 transition-colors flex items-center justify-center group shrink-0"
           onMouseDown={(e) => {
             e.preventDefault();
             const sidebar = e.currentTarget.parentElement;
             if (!sidebar) return;
             const rect = sidebar.getBoundingClientRect();
             const onMove = (ev: MouseEvent) => {
               const pct = ((ev.clientY - rect.top) / rect.height) * 100;
               setSidebarSplitPct(Math.max(15, Math.min(85, pct)));
             };
             const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
             document.addEventListener("mousemove", onMove);
             document.addEventListener("mouseup", onUp);
           }}
         >
           <div className="w-8 h-0.5 rounded-full bg-white/20 group-hover:bg-cyan-400/60 transition-colors" />
         </div>
         <div className="flex flex-col overflow-hidden" style={{ height: `${100 - sidebarSplitPct}%` }}>
        <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-hide bg-[#13151f]">
          {/* ALWAYS: Main data tab — hidden in Player Stats easy mode */}
          {!isPlayerStatsEasyMode && (
            <button onClick={() => setActiveTab('fields')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'fields' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>بيانات</button>
          )}

          {/* ALWAYS for non-ELECTION: Images tab (if has image fields) — hidden in Player Stats easy mode */}
          {!isPlayerStatsEasyMode && draftOverlay.type !== OverlayType.ELECTION && draftOverlay.fields.some(f => f.type === 'image' || f.type === 'image-list') && (
            <button onClick={() => setActiveTab('images')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'images' ? 'text-amber-400 border-amber-500 bg-amber-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>صور</button>
          )}

          {/* ALWAYS for non-ELECTION: Appearance tab — hidden in Player Stats easy mode */}
          {!isPlayerStatsEasyMode && draftOverlay.type !== OverlayType.ELECTION && (
            <button onClick={() => setActiveTab('style')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'style' ? 'text-purple-400 border-purple-500 bg-purple-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>تنسيق</button>
          )}

          {/* ALWAYS for non-ELECTION: Position/Size tab — hidden in Player Stats easy mode */}
          {!isPlayerStatsEasyMode && draftOverlay.type !== OverlayType.ELECTION && draftOverlay.fields.some(f => ['scale', 'positionX', 'positionY', 'containerWidth', 'sidebarWidth'].includes(f.id)) && (
            <button onClick={() => setActiveTab('position')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'position' ? 'text-cyan-400 border-cyan-500 bg-cyan-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>موضع</button>
          )}

          {draftOverlay.type === OverlayType.FOOTBALL_PACKAGE && (
            <>
              <button onClick={() => setActiveTab('football-main')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'football-main' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Main</button>
              <button onClick={() => setActiveTab('football-lineup')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'football-lineup' ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Lineup</button>
              <button onClick={() => setActiveTab('football-score')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'football-score' ? 'text-yellow-400 border-yellow-500 bg-yellow-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Score</button>
            </>
          )}

          {/* ALWAYS for non-ELECTION: Sound tab if exists — hidden in Player Stats easy mode */}
          {!isPlayerStatsEasyMode && draftOverlay.type !== OverlayType.ELECTION && draftOverlay.fields.some(f => f.id === 'soundEnabled' || f.id === 'useTTS') && (
            <button onClick={() => setActiveTab('sound')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'sound' ? 'text-green-400 border-green-500 bg-green-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>صوت</button>
          )}

          {/* Slots / Presets Tab — hidden in Player Stats easy mode */}
          {!isPlayerStatsEasyMode && (
            <button onClick={() => setActiveTab('slots')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'slots' ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>قوالب</button>
          )}

          {/* LEADERBOARD: Sponsors tab */}
          {draftOverlay.type === OverlayType.LEADERBOARD && (
             <button onClick={() => setActiveTab('sponsors')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'sponsors' ? 'text-green-400 border-green-500 bg-green-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Sponsors</button>
          )}

          {/* ELECTION: specialized tabs */}
          {draftOverlay.type === OverlayType.ELECTION && (() => {
              const designStyle = String(draftOverlay.fields.find(f => f.id === 'designStyle')?.value || '');
              return (
                  <>
                      {(designStyle === 'SPLIT_BAR_LEFT' || designStyle === 'STATEMENT_FULL' || designStyle === 'RESULTS_HUB') && <button onClick={() => setActiveTab('candidates')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'candidates' ? 'text-purple-400 border-purple-500 bg-purple-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Candidates</button>}
                      {designStyle === 'COUNTDOWN_TOP' && <button onClick={() => setActiveTab('time')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'time' ? 'text-orange-400 border-orange-500 bg-orange-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Time</button>}
                      {(designStyle === 'LEAKS_FULL' || designStyle === 'STATEMENT_FULL' || designStyle === 'STUDIO_BACKGROUND' || designStyle === 'LIVE_TRANSITION' || designStyle === 'RESULTS_HUB') && <button onClick={() => setActiveTab('content')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'content' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Content</button>}
                      {designStyle === 'STUDIO_BACKGROUND' && <button onClick={() => setActiveTab('camera')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'camera' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Camera</button>}
                      {(designStyle === 'VOTER_TURNOUT' || designStyle === 'RESULTS_HUB') && <button onClick={() => setActiveTab('turnout')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'turnout' ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Turnout</button>}
                      <button onClick={() => setActiveTab('style')} className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === 'style' ? 'text-purple-400 border-purple-500 bg-purple-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Style</button>
                  </>
              );
          })()}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {/* FIELDS TAB */}
          {['fields', 'candidates', 'time', 'content', 'camera', 'style', 'turnout', 'images', 'position', 'sound', 'football-main', 'football-lineup', 'football-score'].includes(activeTab) && (
             <>
               {draftOverlay.fields.map((field) => {
                 if (field.type === 'hidden' || field.id === 'currentPage') return null;
                 
                 // Separate Font Size controls for Typography section
                 if (['headerFontSize', 'nameFontSize', 'amountFontSize'].includes(field.id)) return null;

                  // SMART UNIVERSAL FIELD FILTERING
                  if (draftOverlay.type === OverlayType.ELECTION) {
                      const isStyleField = ['themePreset', 'designStyle', 'barcaLogo', 'scale', 'positionX', 'positionY', 'transitionIn', 'transitionOut', 'soundEnabled', 'soundVolume', 'soundInStyle', 'soundOutStyle', 'boxColor', 'accentColor'].includes(field.id);
                      const isCandidateField = field.id.startsWith('candidate') || ['showUndecided', 'undecidedLabel', 'undecidedPercent', 'undecidedColor'].includes(field.id);
                      const isTimeField = ['targetDate', 'targetTime', 'countdownTitle', 'countdownDays', 'countdownHours', 'countdownMinutes', 'countdownSeconds'].includes(field.id);
                      const isCameraField = field.id.startsWith('camera') || field.id === 'bgImage';
                      const isTurnoutField = ['currentVoters', 'totalVoters', 'turnoutTitle', 'turnoutSubtitle', 'currentVotersTitle'].includes(field.id);
                      const designStyle = String(draftOverlay.fields.find(f => f.id === 'designStyle')?.value || '');
                      const candidate1Profile = String(draftOverlay.fields.find(f => f.id === 'candidate1Profile')?.value || 'CUSTOM');
                      const candidate2Profile = String(draftOverlay.fields.find(f => f.id === 'candidate2Profile')?.value || 'CUSTOM');
                      const statementSource = String(draftOverlay.fields.find(f => f.id === 'statementSource')?.value || 'CANDIDATE_1');
                      const candidate1IdentityFields = ['candidate1Name', 'candidate1Image', 'candidate1Tag', 'candidate1Color'];
                      const candidate2IdentityFields = ['candidate2Name', 'candidate2Image', 'candidate2Tag', 'candidate2Color'];
                      const customStatementFields = ['statementSubjectName', 'statementSubjectTag', 'statementSubjectImage', 'statementSubjectColor'];
                      let isContentField = false;
                      if (designStyle === 'LEAKS_FULL') isContentField = ['leaksTitle', 'leaksSubtitle', 'leaksContent'].includes(field.id);
                      else if (designStyle === 'STATEMENT_FULL') isContentField = ['specialText', 'statementAuthor', 'statementTitle', 'statementSource', ...customStatementFields].includes(field.id);
                      else if (designStyle === 'LIVE_TRANSITION') isContentField = ['transitionTitle', 'transitionSubtitle', 'liveText'].includes(field.id);
                      else if (designStyle === 'STUDIO_BACKGROUND') isContentField = ['specialText', 'liveText'].includes(field.id);
                      else if (designStyle === 'RESULTS_HUB') isContentField = ['specialText'].includes(field.id);
                      const allContentFields = ['specialText', 'specialImage', 'statementAuthor', 'statementTitle', 'statementSource', ...customStatementFields, 'leaksTitle', 'leaksSubtitle', 'leaksContent', 'transitionTitle', 'transitionSubtitle', 'liveText'];
                      if (allContentFields.includes(field.id) && !isContentField) return null;
                      if (candidate1IdentityFields.includes(field.id) && candidate1Profile !== 'CUSTOM') return null;
                      if (candidate2IdentityFields.includes(field.id) && candidate2Profile !== 'CUSTOM') return null;
                      if (customStatementFields.includes(field.id) && statementSource !== 'CUSTOM') return null;
                      if (isTimeField && designStyle !== 'COUNTDOWN_TOP') return null;
                      if (isCandidateField && designStyle !== 'SPLIT_BAR_LEFT' && designStyle !== 'STATEMENT_FULL' && designStyle !== 'RESULTS_HUB') return null;
                      if (isCameraField && designStyle !== 'STUDIO_BACKGROUND') return null;
                      if (isTurnoutField && designStyle !== 'VOTER_TURNOUT' && designStyle !== 'RESULTS_HUB') return null;
                      if ((field.id === 'boxColor' || field.id === 'accentColor') && designStyle !== 'LEAKS_FULL' && designStyle !== 'STATEMENT_FULL') return null;
                      if (activeTab === 'fields') { if (isStyleField || isCandidateField || isTimeField || isContentField || isCameraField || isTurnoutField) return null; }
                      else if (activeTab === 'candidates') { if (!isCandidateField) return null; }
                      else if (activeTab === 'time') { if (!isTimeField) return null; }
                      else if (activeTab === 'content') { if (!isContentField) return null; }
                      else if (activeTab === 'camera') { if (!isCameraField) return null; }
                      else if (activeTab === 'turnout') { if (!isTurnoutField) return null; }
                      else if (activeTab === 'style') { if (!isStyleField) return null; }
                  } else {
                      // UNIVERSAL SMART TABS for ALL non-election templates
                      const POSITION_FIELDS = ['scale', 'positionX', 'positionY', 'containerWidth', 'sidebarWidth', 'itemsPerPage', 'rotationTime', 'matchPanelScale', 'playerPanelScale', 'creatorBadgeScale', 'creatorPositionX', 'creatorPositionY'];
                      const SOUND_FIELDS = ['soundEnabled', 'soundVolume', 'useTTS', 'ttsText', 'soundInStyle', 'soundOutStyle'];
                      const APPEARANCE_FIELDS = ['themePreset', 'designStyle', 'visualVariant', 'playerStatsVisualVariant', 'bgOpacity', 'watermarkText', 'showAvatars', 'showAmounts', 'showRanks', 'transitionEffect', 'transitionIn', 'transitionOut', 'scrollSpeed', 'broadcastMotion', 'broadcastQuality', 'showCreatorBadge', 'creatorName', 'creatorHandle', 'creatorLabel'];
                      const isPositionField = POSITION_FIELDS.includes(field.id);
                      const isSoundField = SOUND_FIELDS.includes(field.id);
                      const isAppearanceField = APPEARANCE_FIELDS.includes(field.id);
                      const isImageField = field.type === 'image' || field.type === 'image-list';
                      if (draftOverlay.type === OverlayType.FOOTBALL_PACKAGE) {
                        const isFootballMain = ['title', 'subtitle', 'teamName', 'competition'].includes(field.id);
                        const isFootballLineup = ['formation', 'playersCount', 'pitchNumbers'].includes(field.id) || /^player\d+(Name|Number)$/.test(field.id);
                        const isFootballScore = ['brandMark', 'time', 'homeScore', 'awayScore'].includes(field.id);

                        if (activeTab === 'fields' || activeTab === 'football-main') {
                          if (!isFootballMain) return null;
                        } else if (activeTab === 'football-lineup') {
                          if (!isFootballLineup) return null;
                        } else if (activeTab === 'football-score') {
                          if (!isFootballScore) return null;
                        } else if (['style', 'images', 'position', 'sound'].includes(activeTab)) {
                          // Continue to the universal tab filters below.
                        } else if (isFootballMain || isFootballLineup || isFootballScore) {
                          return null;
                        }
                      }
                      if (activeTab === 'fields') { if (isPositionField || isSoundField || isAppearanceField || isImageField) return null; }
                      else if (activeTab === 'images') { if (!isImageField) return null; }
                      else if (activeTab === 'style') { if (!isAppearanceField) return null; }
                      else if (activeTab === 'position') { if (!isPositionField) return null; }
                      else if (activeTab === 'sound') { if (!isSoundField) return null; }
                  }

                 // Render standard fields...
                 if (field.type === 'range') {
                     const rangeMax = field.id === 'soundVolume' ? 3 : field.max;
                     const rangeStep = field.id === 'soundVolume' ? 0.05 : field.step;
                     const rangeValue = Number(field.value);
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <div className="flex items-center gap-2">
                                <input type="range" min={field.min} max={rangeMax} step={rangeStep} value={rangeValue} onChange={(e) => handleDraftFieldChange(field.id, parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg accent-blue-600" />
                                <span className="text-xs font-mono">{field.value}</span>
                            </div>
                         </div>
                     );
                 }
                 if (field.type === 'text' || field.type === 'number') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <input type={field.type} value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, field.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" />
                         </div>
                     )
                 }
                 if (field.type === 'select') {
                    return (
                        <div key={field.id} className="space-y-1">
                            <label className="text-xs text-gray-400 block">{field.label}</label>
                            <select value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500">
                                {field.options?.map(opt => {
                                  const option = typeof opt === 'string' ? { value: opt, label: opt } : opt;
                                  return <option key={option.value} value={option.value}>{option.label}</option>;
                                })}
                            </select>
                        </div>
                    )
                 }
                 if (field.type === 'boolean') {
                    return (
                        <div key={field.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                            <label className="text-xs text-gray-300">{field.label}</label>
                            <input type="checkbox" checked={field.value as boolean} onChange={(e) => handleDraftFieldChange(field.id, e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                        </div>
                    )
                 }
                 if (field.type === 'textarea') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <textarea value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} rows={5} className="w-full resize-y bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" />
                         </div>
                     )
                 }
                 if (field.type === 'color') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                                 <input type="color" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="h-10 w-14 cursor-pointer rounded border-none bg-transparent" />
                                 <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-transparent text-sm font-mono text-white focus:outline-none" />
                             </div>
                         </div>
                     )
                 }
                 if (field.type === 'image') {
                     return (
                         <div key={field.id} className="space-y-1">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <div className="flex items-center gap-2">
                                 <input type="text" value={field.value.toString()} onChange={(e) => handleDraftFieldChange(field.id, e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500" placeholder=" ..." />
                                 <button onClick={() => triggerFileUpload(field.id)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors" title="   ">
                                     
                                 </button>
                             </div>
                             {field.value && field.value.toString().startsWith('data:image') && (
                                 <div className="mt-2 text-[10px] text-green-400"></div>
                             )}
                         </div>
                     )
                 }
                 if (field.type === 'image-list') {
                     const images = Array.isArray(field.value) ? field.value : [];
                     return (
                         <div key={field.id} className="space-y-2">
                             <label className="text-xs text-gray-400 block">{field.label}</label>
                             <div className="grid grid-cols-2 gap-2">
                                 {images.map((img, idx) => (
                                     <div key={idx} className="relative group aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                                         <img src={img} className="w-full h-full object-cover" alt="" />
                                         <button 
                                           onClick={() => {
                                               const next = images.filter((_, i) => i !== idx);
                                               handleDraftFieldChange(field.id, next);
                                           }}
                                           className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                         >
                                             <X className="w-3 h-3" />
                                         </button>
                                     </div>
                                 ))}
                                 <button 
                                   onClick={() => triggerFileUpload(field.id)}
                                   className="aspect-video bg-gray-800/50 border-2 border-dashed border-gray-700 hover:border-blue-500/50 hover:bg-blue-900/10 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-blue-400 transition-all"
                                 >
                                     <Plus className="w-5 h-5" />
                                     <span className="text-[10px]"></span>
                                 </button>
                             </div>
                             <div className="flex gap-2 mt-2">
                                 <input 
                                   type="text" 
                                   placeholder="   ..." 
                                   className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-white focus:border-blue-500"
                                   onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                           const val = e.currentTarget.value.trim();
                                           if (val) {
                                               handleDraftFieldChange(field.id, [...images, val]);
                                               e.currentTarget.value = '';
                                           }
                                       }
                                   }}
                                 />
                             </div>
                         </div>
                     );
                 }
                 return null;
               })}
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
             </>
          )}

          {/* SPONSORS MANAGEMENT TAB (PROTECTED) */}
          {/* SLOTS / PRESETS TAB */}
          {activeTab === 'slots' && (
              <div className="space-y-6 animate-fade-in-up">
                   <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-4">
                       <div className="flex items-center gap-2 text-indigo-400">
                           <Layers className="w-5 h-5" />
                           <h3 className="font-bold text-sm">Presets</h3>
                       </div>
                       <p className="text-[11px] text-gray-400 leading-relaxed">
                                   ""      .
                       </p>
                       <div className="flex gap-2">
                           <input 
                             type="text" 
                             id="new-slot-input"
                             placeholder="  (:  )..."
                             className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 transition-colors outline-none"
                           />
                           <button 
                             onClick={() => {
                                 const input = document.getElementById('new-slot-input') as HTMLInputElement;
                                 const name = input.value.trim();
                                 if (!name) return;
                                 const nextSlots = { ...(draftOverlay.slots || {}), [name]: JSON.parse(JSON.stringify(draftOverlay.fields)) };
                                 const updatedOverlay = { ...draftOverlay, slots: nextSlots, activeSlot: name };
                                 setDraftOverlay(updatedOverlay);
                                 syncManager.updateOverlay(updatedOverlay);
                                 input.value = '';
                             }}
                             className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                           >
                               <Plus className="w-5 h-5" />
                           </button>
                       </div>
                   </div>

                   <div className="space-y-3">
                       {Object.keys(draftOverlay.slots || {}).length === 0 ? (
                           <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-3xl">
                               <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                   <Layers className="w-6 h-6 text-gray-700" />
                               </div>
                               <p className="text-gray-600 text-xs font-medium">.</p>
                           </div>
                       ) : (
                           Object.entries(draftOverlay.slots).map(([name, fields]) => (
                               <div key={name} className={`group relative p-4 rounded-2xl border transition-all duration-300 ${draftOverlay.activeSlot === name ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-900/10' : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'}`}>
                                   <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                                           <div className={`w-2.5 h-2.5 rounded-full ${draftOverlay.activeSlot === name ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-gray-700'}`} />
                                           <div>
                                               <p className="text-sm font-bold text-white mb-0.5">{name}</p>
                                               <p className="text-[10px] text-gray-500">fields as any .length</p>
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button 
                                             onClick={() => {
                                                 const updatedFields = JSON.parse(JSON.stringify(fields));
                                                 const updatedOverlay = { ...draftOverlay, fields: updatedFields, activeSlot: name };
                                                 setDraftOverlay(updatedOverlay);
                                                 syncManager.updateOverlay(updatedOverlay);
                                             }}
                                             className="p-2 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-colors"
                                             title=" "
                                           >
                                               <RotateCcw className="w-4 h-4" />
                                           </button>
                                           <button 
                                             onClick={() => {
                                                 const nextSlots = { ...draftOverlay.slots };
                                                 delete nextSlots[name];
                                                 const updatedOverlay = { ...draftOverlay, slots: nextSlots, activeSlot: draftOverlay.activeSlot === name ? undefined : draftOverlay.activeSlot };
                                                 setDraftOverlay(updatedOverlay);
                                                 syncManager.updateOverlay(updatedOverlay);
                                             }}
                                             className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                                             title=" "
                                           >
                                               <Trash2 className="w-4 h-4" />
                                           </button>
                                       </div>
                                   </div>
                                   {draftOverlay.activeSlot === name && (
                                       <div className="absolute -top-2 -left-2 bg-indigo-600 text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-tighter shadow-lg shadow-indigo-900/40">Active</div>
                                   )}
                               </div>
                           ))
                       )}
                   </div>
              </div>
          )}

          {activeTab === 'sponsors' && (
              <div className="space-y-4">
                  {!isAdminUnlocked ? (
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center space-y-4">
                          <div className="mx-auto w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                              <Lock className="w-6 h-6 text-red-500" />
                          </div>
                          <h3 className="text-white font-bold"></h3>
                          <p className="text-xs text-gray-400">.</p>
                          <form onSubmit={handleAdminLogin} className="space-y-2">
                              <input 
                                type="password" 
                                placeholder=" " 
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full bg-black border border-gray-600 rounded p-2 text-white text-center focus:border-red-500 focus:outline-none"
                              />
                              <button type="submit" disabled={isAdminAuthorizing} className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-400 text-white py-2 rounded font-bold transition-colors">
                                  {isAdminAuthorizing ? '' : ''}
                              </button>
                              {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                          </form>
                      </div>
                  ) : (
                      <div className="space-y-6 animate-fade-in-up">
                          <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
                                  <Unlock className="w-4 h-4" />  
                              </h3>
                              <button onClick={handleAdminLogout} className="text-xs text-gray-500 hover:text-white"></button>
                          </div>

                          {/* Add Form */}
                          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 space-y-3">
                              <h4 className="text-xs font-bold text-white mb-2"></h4>
                              
                              <div className="flex gap-2">
                                 <input 
                                    type="text" placeholder=" "
                                    value={newSponsor.name} onChange={e => setNewSponsor({...newSponsor, name: e.target.value})}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                              </div>

                              <div className="flex gap-2">
                                  <input 
                                    type="number" placeholder=""
                                    value={newSponsor.amount} onChange={e => setNewSponsor({...newSponsor, amount: e.target.value})}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                  <select 
                                    value={newSponsor.currency} onChange={e => setNewSponsor({...newSponsor, currency: e.target.value})}
                                    className="w-32 bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                  >
                                      {CURRENCY_OPTIONS.map(curr => (
                                          <option key={curr.code} value={curr.code}>{curr.label}</option>
                                      ))}
                                      <option value="OTH">USD</option>
                                  </select>
                              </div>

                              {/* LIVE USD PREVIEW */}
                              <div className="flex items-center justify-between px-2 text-[10px] text-gray-400 font-mono bg-black/20 rounded py-1 border border-white/5">
                                  <span></span>
                                  <span className="text-green-400 font-bold">
                                      {previewUSD !== null ? `$${previewUSD.toLocaleString()}` : '...'}
                                  </span>
                              </div>

                              <div className="relative">
                                  <input 
                                    type="text" placeholder="  ()"
                                    value={newSponsor.avatar} onChange={e => setNewSponsor({...newSponsor, avatar: e.target.value})}
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-gray-400 font-mono focus:outline-none focus:border-blue-500 pl-8"
                                  />
                                  <ImageIcon className="absolute top-2.5 left-2 w-4 h-4 text-gray-600" />
                              </div>

                              <button 
                                onClick={handleAddSponsor}
                                disabled={isAddingSponsor}
                                className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded flex items-center justify-center gap-2 font-bold transition-all transform active:scale-95"
                              >
                                  {isAddingSponsor ? '...' : <><Plus className="w-4 h-4" /></>}
                              </button>
                          </div>

                          {/* List */}
                          <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-gray-400"></h4>
                                  <button onClick={handleAutoSort} className="text-xs flex items-center gap-1 text-blue-400 hover:text-white" title="  ">
                                      <ArrowDownUp className="w-3 h-3" /> 
                                  </button>
                              </div>
                              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                                  {(() => {
                                      const sponsors: Sponsor[] = JSON.parse(String(getDraftValue('sponsorsData') || '[]'));
                                      return sponsors.length === 0 ? (
                                          <p className="text-xs text-gray-500 text-center py-4"></p>
                                      ) : (
                                          sponsors.map((s, idx) => (
                                              <React.Fragment key={s.id}>
                                              <div className="bg-black/40 p-2 rounded flex items-center justify-between group">
                                                  <div className="flex items-center gap-2 overflow-hidden">
                                                      <span className="text-[10px] w-5 h-5 bg-gray-800 text-gray-400 flex items-center justify-center rounded-full shrink-0">{idx + 1}</span>
                                                      <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-6 h-6 rounded-full" alt="" />
                                                      <div className="text-sm text-white truncate max-w-[80px]">{s.name}</div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                      <div className="text-right">
                                                          {/* Editor List shows original currency + USD hint */}
                                                          <div className="text-xs text-green-400 font-mono font-bold">
                                                              ${s.usdAmount.toLocaleString()}
                                                          </div>
                                                          <div className="text-[9px] text-gray-600">
                                                              ({s.amount} {s.currency})
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                          <button 
                                                            onClick={() => {
                                                                setEditingSponsorId(s.id);
                                                                setEditSponsorData({ name: s.name, avatar: s.avatar || '' });
                                                            }}
                                                            className="p-1 text-gray-500 hover:text-blue-400"
                                                            title=" "
                                                          >
                                                              <Edit3 className="w-4 h-4" />
                                                          </button>
                                                          <button 
                                                            onClick={() => setViewingHistoryId(viewingHistoryId === s.id ? null : s.id)}
                                                            className={`p-1 rounded transition-colors ${viewingHistoryId === s.id ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-400'}`}
                                                            title=" "
                                                          >
                                                              <History className="w-4 h-4" />
                                                          </button>
                                                          <button 
                                                            onClick={() => setTopUpSponsorId(topUpSponsorId === s.id ? null : s.id)} 
                                                            className={`p-1 rounded transition-colors ${topUpSponsorId === s.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-400'}`}
                                                            title="  ( )"
                                                          >
                                                              <Plus className="w-4 h-4" />
                                                          </button>
                                                          <button onClick={() => handleDeleteSponsor(s.id)} className="p-1 text-gray-600 hover:text-red-500" title="">
                                                              <Trash2 className="w-4 h-4" />
                                                          </button>
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              {/* EDIT INFO UI */}
                                              {editingSponsorId === s.id && (
                                                  <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-3 mt-1 mb-2 animate-cinematic-blur-in space-y-3">
                                                      <div className="flex items-center justify-between mb-1">
                                                          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">s.name</span>
                                                          <button onClick={() => setEditingSponsorId(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                                      </div>
                                                      <input 
                                                        type="text" value={editSponsorData.name} 
                                                        onChange={e => setEditSponsorData({...editSponsorData, name: e.target.value})}
                                                        className="w-full bg-black/40 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-400"
                                                        placeholder=""
                                                      />
                                                      <input 
                                                        type="text" value={editSponsorData.avatar} 
                                                        onChange={e => setEditSponsorData({...editSponsorData, avatar: e.target.value})}
                                                        className="w-full bg-black/40 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-400 font-mono focus:outline-none focus:border-blue-400"
                                                        placeholder=" "
                                                      />
                                                      <button 
                                                        onClick={() => handleUpdateSponsorInfo(s.id)}
                                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs font-bold"
                                                      >
                                                           
                                                      </button>
                                                  </div>
                                              )}

                                              {/* HISTORY VIEW UI */}
                                              {viewingHistoryId === s.id && (
                                                  <div className="bg-purple-900/10 border border-purple-500/30 rounded-lg p-3 mt-1 mb-2 animate-cinematic-blur-in space-y-2">
                                                      <div className="flex items-center justify-between mb-1 border-b border-purple-500/20 pb-1">
                                                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                                                              <History className="w-3 h-3" />   {s.name}
                                                          </span>
                                                          <button onClick={() => setViewingHistoryId(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                                      </div>
                                                      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                                          {(s.history || []).map((entry) => (
                                                              <div key={entry.id} className="flex items-center justify-between bg-black/30 p-1.5 rounded border border-white/5 group/history">
                                                                  <div className="flex flex-col">
                                                                      <span className="text-[11px] text-green-400 font-bold font-mono">
                                                                          {entry.amount} {entry.currency}
                                                                      </span>
                                                                      <span className="text-[8px] text-gray-500 flex items-center gap-1">
                                                                          <Calendar className="w-2 h-2" />
                                                                          {new Date(entry.timestamp).toLocaleDateString('ar-SA')} - {new Date(entry.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                                      </span>
                                                                  </div>
                                                                  <button 
                                                                    onClick={() => handleDeleteDonation(s.id, entry.id)}
                                                                    className="opacity-0 group-hover/history:opacity-100 text-gray-600 hover:text-red-500 transition-opacity"
                                                                  >
                                                                      <Trash2 className="w-3 h-3" />
                                                                  </button>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                              
                                              {/* TOP UP UI (GENIUS INLINE MODE) */}
                                              {topUpSponsorId === s.id && (
                                                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-1 mb-2 animate-cinematic-blur-in space-y-3">
                                                      <div className="flex items-center justify-between mb-1">
                                                          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">s.name</span>
                                                          <button onClick={() => setTopUpSponsorId(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                                      </div>
                                                      
                                                      <div className="flex gap-2">
                                                          <input 
                                                            autoFocus
                                                            type="number" 
                                                            placeholder=" ..." 
                                                            value={topUpAmount}
                                                            onChange={e => setTopUpAmount(e.target.value)}
                                                            className="flex-1 bg-black/40 border border-blue-500/50 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-400"
                                                          />
                                                          <button 
                                                            onClick={() => handleTopUp(s.id)}
                                                            disabled={isToppingUp || !topUpAmount}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
                                                          >
                                                              {isToppingUp ? '...' : ''}
                                                          </button>
                                                      </div>

                                                      {/* Quick Actions */}
                                                      <div className="grid grid-cols-4 gap-1">
                                                          {[5, 10, 50, 100].map(val => (
                                                              <button 
                                                                key={val}
                                                                onClick={() => handleTopUp(s.id, val)}
                                                                className="bg-gray-800 hover:bg-blue-600 text-[10px] py-1 rounded border border-gray-700 hover:border-blue-400 transition-all font-bold"
                                                              >
                                                                  +{val}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                              </React.Fragment>
                                          ))
                                      );
                                  })()}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'style' && (
             <div className="space-y-6">
                 {/* Typography Controls (Leaderboard Only) */}
                 {draftOverlay.type === OverlayType.LEADERBOARD && (
                     <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                         <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                             <Sparkles className="w-3 h-3 text-yellow-500" />
                               (Typography)
                         </h4>
                         <div className="space-y-3">
                            {['headerFontSize', 'nameFontSize', 'amountFontSize'].map(id => {
                                const field = draftOverlay.fields.find(f => f.id === id);
                                if (!field) return null;
                                return (
                                    <div key={field.id} className="space-y-1">
                                        <div className="flex justify-between">
                                            <label className="text-xs text-gray-400">{field.label}</label>
                                            <span className="text-xs text-blue-400 font-mono">{field.value}px</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={field.min} max={field.max} step={field.step} 
                                            value={Number(field.value)} 
                                            onChange={(e) => handleDraftFieldChange(field.id, parseFloat(e.target.value))} 
                                            className="w-full h-1.5 bg-gray-700 rounded-lg accent-blue-500" 
                                        />
                                    </div>
                                );
                            })}
                         </div>
                     </div>
                 )}

                 {/* Standard Colors */}
                 {draftOverlay.type !== OverlayType.ELECTION && (
                     <div>
                        <h4 className="text-xs font-bold text-gray-400 mb-2"></h4>
                         {['primaryColor', 'secondaryColor'].map(key => (
                           <div key={key} className="mb-2">
                             <label className="text-xs text-gray-500 block mb-1">{key === 'primaryColor' ? '' : ''}</label>
                             <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                               <input type="color" value={(draftOverlay.theme as any)[key]} onChange={(e) => updateDraftTheme(key, e.target.value)} className="h-6 w-6 rounded border-none cursor-pointer bg-transparent" />
                               <span className="text-xs text-gray-400 font-mono">{(draftOverlay.theme as any)[key]}</span>
                             </div>
                           </div>
                       ))}
                     </div>
                 )}
             </div>
          )}
        </div>
        </div>{/* end lower panel */}
       </div>{/* end w-96 inner */}
      </div>{/* end right panel transition wrapper */}

      {/*  CENTER PANEL (PREVIEW MONITOR)  */}
      <div className="flex-1 flex flex-col bg-[#0c0d10] relative overflow-hidden">
         {/* Top Control Bar */}
         <div className="h-12 border-b border-white/[0.06] flex items-center justify-between px-5 bg-[#10121a] z-20">
             <div className="flex items-center gap-3">
                 <button onClick={() => setPanelOpen(p => !p)} className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-white hover:border-white/20 transition-colors" title={panelOpen ? '' : ''}>
                   <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${panelOpen ? '' : 'rotate-180'}`} />
                 </button>
                 <div className="h-4 w-px bg-white/10" />
                 <span className="text-white text-sm font-bold truncate max-w-[180px]">{draftOverlay.name}</span>
                 {liveOverlay.isVisible && <span className="text-[9px] font-black text-red-400 bg-red-900/20 border border-red-700/30 px-2 py-0.5 rounded-full animate-pulse">ON AIR</span>}
                 <button onClick={toggleLiveVisibility} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${liveOverlay.isVisible ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'}`}>
                     {liveOverlay.isVisible ? <><Eye className="w-3.5 h-3.5" /></> : <><EyeOff className="w-3.5 h-3.5" /></>}
                 </button>
             </div>
             <div className="flex items-center gap-2">
                 <button onClick={() => setPreviewChroma(!previewChroma)} className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${previewChroma ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'text-gray-500 border-white/10 hover:text-white'}`}>Chroma</button>
                 <button onClick={async () => {
                    const popup = window.open('', '_blank', 'width=1280,height=720');
                    const url = await syncManager.prepareOutputUrl(liveOverlay.id, liveOverlay);
                    if (popup) popup.location.href = url;
                    else window.open(url, '_blank', 'width=1280,height=720');
                 }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-bold border border-blue-600/30 transition-colors">
                     <Monitor className="w-3.5 h-3.5" />
                     <span></span>
                 </button>
             </div>
         </div>

         {/* Monitor Area */}
         <div className="flex-1 overflow-hidden flex items-center justify-center p-6 relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10 w-full max-w-[1920px] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] bg-black/40">
                 <OverlayRenderer config={{ ...draftOverlay, isVisible: true }} chromaKey={previewChroma} isEditor={true} />
                 <div className="absolute inset-[5%] border border-white/5 border-dashed pointer-events-none rounded" />
            </div>
         </div>

         {/*  Slot Quick-Bar  */}
         <div className="shrink-0 border-t border-white/[0.06] bg-[#10121a] px-4 py-2 flex items-center gap-2 overflow-x-auto">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 shrink-0">PRESETS</span>
           <div className="w-px h-3 bg-white/10 shrink-0" />
           {Object.keys(draftOverlay.slots || {}).map(name => (
             <button key={name} onClick={() => { const upd = { ...draftOverlay, activeSlot: name, fields: JSON.parse(JSON.stringify(draftOverlay.slots[name])) }; setDraftOverlay(upd); syncManager.updateOverlay(upd); }}
               className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${ draftOverlay.activeSlot === name ? 'bg-indigo-600 border-indigo-400 text-white shadow shadow-indigo-900/30' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20' }`}>
               {draftOverlay.activeSlot === name && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 align-middle" />}{name}
             </button>
           ))}
           <input value={newSlotName} onChange={e => setNewSlotName(e.target.value)} onKeyDown={e => { if(e.key==='Enter' && newSlotName.trim()){ const n=newSlotName.trim(); const upd={...draftOverlay,slots:{...draftOverlay.slots,[n]:JSON.parse(JSON.stringify(draftOverlay.fields))},activeSlot:n}; setDraftOverlay(upd); syncManager.updateOverlay(upd); setNewSlotName(''); }}} placeholder="+  ..." className="bg-transparent text-xs text-gray-400 placeholder-gray-700 focus:outline-none focus:text-white w-28 shrink-0 border-b border-transparent focus:border-indigo-500 pb-0.5 transition-colors" />
         </div>
       </div>
     </div>
  );
};

export default Editor;
