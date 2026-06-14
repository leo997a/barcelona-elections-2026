import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OverlayConfig, OverlayField, OverlayType, Sponsor } from '../types';
import { Play, Square, FastForward, Rewind, Cast, Wifi, Eye, EyeOff, LayoutTemplate, Layers, Tv, Check, Search, Star, PencilLine, Save, RotateCcw, PowerOff, ListFilter, Link2, Monitor, SlidersHorizontal, Users, BadgeDollarSign, Clock, BarChart3, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { ELECTION_CANDIDATE_PROFILE_OPTIONS, ELECTION_STATEMENT_SOURCE_OPTIONS } from '../utils/election';
import TemplateControlBar from '../components/TemplateControlBar';
import OverlayRenderer from '../components/OverlayRenderer';
import { resolveTemplateById } from '../utils/templateRegistry';
import { getTaxonomy, listCategories, type CategoryKey } from '../utils/templateTaxonomy';

interface OperatorProps {
  overlays: OverlayConfig[];
  focusedOverlayId?: string | null;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onUpdate: (updated: OverlayConfig) => void;
}

const ELECTION_SOUNDS = ['RESULTS_STING', 'QUOTE_SWEEP', 'VERSUS_IMPACT', 'SIDEBAR_CHIME', 'DATA_PULSE', 'COUNTDOWN_TICK', 'BREAKING_WHOOSH', 'SOFT_FADE'];
const SINGLE_PROGRAM_MODE_KEY = 'rge_operator_single_program_mode';
const OPERATOR_DENSITY_MODE_KEY = 'rge_operator_density_mode';
type OperatorSortMode = 'smart' | 'recent' | 'name' | 'type';
type OperatorDensityMode = 'comfortable' | 'compact';
const OPERATOR_SORT_OPTIONS: Array<{ key: OperatorSortMode; label: string }> = [
  { key: 'smart', label: 'ذكي' },
  { key: 'recent', label: 'الأحدث' },
  { key: 'name', label: 'الاسم' },
  { key: 'type', label: 'النوع' },
];
type OperatorFieldGroup = 'priority' | 'data' | 'appearance' | 'media' | 'audio';
const OPERATOR_FIELD_GROUPS: Array<{ key: OperatorFieldGroup | 'ALL'; label: string }> = [
  { key: 'priority', label: 'الأهم' },
  { key: 'data', label: 'البيانات' },
  { key: 'appearance', label: 'التنسيق' },
  { key: 'media', label: 'الصور' },
  { key: 'audio', label: 'الصوت' },
  { key: 'ALL', label: 'الكل' },
];
const OPERATOR_PRIORITY_FIELDS = new Set([
  'headline',
  'title',
  'subtitle',
  'message',
  'body',
  'description',
  'text',
  'line1',
  'line2',
  'playerName',
  'teamName',
  'homeName',
  'awayName',
  'clubFrom',
  'clubTo',
  'dealValue',
  'confidencePct',
  'probabilityPct',
  'name',
  'role',
  'homeScore',
  'awayScore',
  'currentPage',
  'sponsorsData',
  'sponsorDisplayMode',
]);
const OPERATOR_APPEARANCE_FIELD_HINTS = [
  'theme',
  'style',
  'variant',
  'layout',
  'color',
  'opacity',
  'font',
  'scale',
  'position',
  'width',
  'height',
  'display',
  'motion',
  'transition',
];
const OPERATOR_AUDIO_FIELD_HINTS = ['sound', 'audio', 'voice', 'sfx', 'duck'];
const OPERATOR_MEDIA_FIELD_HINTS = ['image', 'avatar', 'logo', 'photo', 'media', 'video', 'url'];

const Operator: React.FC<OperatorProps> = ({ overlays, focusedOverlayId, favoriteIds, onToggleFavorite, onUpdate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(overlays.length > 0 ? overlays[0].id : null);
  const [showStreamDeckModal, setShowStreamDeckModal] = useState(false);
  const [programObsCopied, setProgramObsCopied] = useState(false);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [showOnlyLive, setShowOnlyLive] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [operatorCategory, setOperatorCategory] = useState<CategoryKey | 'ALL'>('ALL');
  const [operatorSortMode, setOperatorSortMode] = useState<OperatorSortMode>('smart');
  const [operatorDensity, setOperatorDensity] = useState<OperatorDensityMode>(() => {
    try {
      return localStorage.getItem(OPERATOR_DENSITY_MODE_KEY) === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });
  const [operatorFieldSearch, setOperatorFieldSearch] = useState('');
  const [operatorFieldGroup, setOperatorFieldGroup] = useState<OperatorFieldGroup | 'ALL'>('priority');
  const [draftName, setDraftName] = useState('');
  const [nameSavedPulse, setNameSavedPulse] = useState(false);
  const [operatorPulseMessage, setOperatorPulseMessage] = useState('');
  const [operatorLastSyncAt, setOperatorLastSyncAt] = useState<number | null>(null);
  const operatorPulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedObsCopied, setSelectedObsCopied] = useState(false);
  const [selectedEditCopied, setSelectedEditCopied] = useState(false);
  const [singleProgramMode, setSingleProgramMode] = useState(() => {
    try {
      return localStorage.getItem(SINGLE_PROGRAM_MODE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const selectedOverlay = overlays.find(o => o.id === selectedId);
  const secureContext = syncManager.getSmartTokenContext();
  const liveOverlaysCount = overlays.filter(overlay => overlay.isVisible).length;
  const liveOverlays = useMemo(
    () => overlays
      .filter(overlay => overlay.isVisible)
      .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0)),
    [overlays],
  );
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteOverlaysCount = overlays.filter(overlay => favoriteIdSet.has(overlay.id)).length;
  const operatorCategories = useMemo(() => listCategories(), []);
  const getOverlayCategory = (overlay: OverlayConfig) =>
    getTaxonomy(overlay.type, overlay.templateId || overlay.id).category;
  const operatorCategoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      mondial: 0,
      mercato: 0,
      match: 0,
      player: 0,
      newsroom: 0,
      social_stream: 0,
      utilities: 0,
      legacy: 0,
    };
    overlays.forEach(overlay => {
      counts[getOverlayCategory(overlay)] += 1;
    });
    return counts;
  }, [overlays]);
  const filteredOverlays = useMemo(() => {
    const needle = operatorSearch.trim().toLowerCase();
    return overlays
      .filter(overlay => operatorCategory === 'ALL' || getOverlayCategory(overlay) === operatorCategory)
      .filter(overlay => !showOnlyLive || overlay.isVisible)
      .filter(overlay => !showOnlyFavorites || favoriteIdSet.has(overlay.id))
      .filter(overlay => {
        if (!needle) return true;
        return [
          overlay.name,
          overlay.type,
          overlay.templateIcon || '',
          overlay.templateId || overlay.id,
        ].some(value => String(value).toLowerCase().includes(needle));
      })
      .sort((left, right) => {
        if (operatorSortMode === 'name') {
          return left.name.localeCompare(right.name, 'ar');
        }
        if (operatorSortMode === 'type') {
          const leftType = `${left.type}-${left.templateId || left.id}`;
          const rightType = `${right.type}-${right.templateId || right.id}`;
          return leftType.localeCompare(rightType, 'en');
        }
        if (operatorSortMode === 'smart' && left.isVisible !== right.isVisible) {
          return left.isVisible ? -1 : 1;
        }
        return (right.createdAt || 0) - (left.createdAt || 0);
      });
  }, [favoriteIdSet, operatorCategory, operatorSearch, operatorSortMode, overlays, showOnlyFavorites, showOnlyLive]);
  const operatorFiltersActive = Boolean(operatorSearch.trim())
    || showOnlyLive
    || showOnlyFavorites
    || operatorCategory !== 'ALL'
    || operatorSortMode !== 'smart';
  const filteredOverlayGroups = useMemo(() => {
    const grouped = operatorCategories
      .map(category => ({
        category,
        overlays: filteredOverlays.filter(overlay => getOverlayCategory(overlay) === category.key),
      }))
      .filter(group => group.overlays.length > 0);
    return operatorCategory === 'ALL' ? grouped : [];
  }, [filteredOverlays, operatorCategories, operatorCategory]);

  useEffect(() => {
    if (overlays.length === 0) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !overlays.some(overlay => overlay.id === selectedId)) {
      setSelectedId(overlays[0].id);
    }
  }, [overlays, selectedId]);

  useEffect(() => {
    if (!focusedOverlayId) return;
    if (selectedId === focusedOverlayId) return;
    if (overlays.some(overlay => overlay.id === focusedOverlayId)) {
      setSelectedId(focusedOverlayId);
    }
  }, [focusedOverlayId, overlays, selectedId]);

  useEffect(() => {
    if (selectedOverlay) setDraftName(selectedOverlay.name);
  }, [selectedOverlay?.id, selectedOverlay?.name]);

  useEffect(() => {
    setOperatorFieldSearch('');
    setOperatorFieldGroup('priority');
  }, [selectedOverlay?.id]);

  useEffect(() => () => {
    if (operatorPulseTimer.current) clearTimeout(operatorPulseTimer.current);
  }, []);

  const selectedMeta = useMemo(() => {
    if (!selectedOverlay) return null;
    return {
      templateLabel: selectedOverlay.templateIcon || selectedOverlay.type,
      description: selectedOverlay.templateDescription || '',
      templateId: selectedOverlay.templateId || selectedOverlay.id,
    };
  }, [selectedOverlay]);
  const operatorLastSyncLabel = useMemo(() => {
    if (!operatorLastSyncAt) return 'جاهز';
    return new Intl.DateTimeFormat('ar-IQ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(operatorLastSyncAt));
  }, [operatorLastSyncAt]);
  const markOperatorAction = (message: string) => {
    if (operatorPulseTimer.current) clearTimeout(operatorPulseTimer.current);
    setOperatorLastSyncAt(Date.now());
    setOperatorPulseMessage(message);
    operatorPulseTimer.current = window.setTimeout(() => setOperatorPulseMessage(''), 2600);
  };
  const setVisibility = (overlay: OverlayConfig, isVisible: boolean) => {
    syncManager.updateLiveField(overlay.id, 'isVisible', isVisible);
  };

  const canTakeIn = (overlay: OverlayConfig) => !overlay.isVisible || (singleProgramMode && liveOverlaysCount > 1);

  const takeInOverlay = (overlay: OverlayConfig) => {
    if (singleProgramMode) {
      overlays.forEach(candidate => {
        if (candidate.id !== overlay.id && candidate.isVisible) {
          syncManager.updateLiveField(candidate.id, 'isVisible', false);
        }
      });
    }
    setVisibility(overlay, true);
    markOperatorAction(`IN: ${overlay.name}`);
  };

  const takeSoloOverlay = (overlay: OverlayConfig) => {
    overlays.forEach(candidate => {
      if (candidate.id !== overlay.id && candidate.isVisible) {
        syncManager.updateLiveField(candidate.id, 'isVisible', false);
      }
    });
    setVisibility(overlay, true);
    markOperatorAction(`SOLO: ${overlay.name}`);
  };

  const takeOutOverlay = (overlay: OverlayConfig) => {
    setVisibility(overlay, false);
    markOperatorAction(`OUT: ${overlay.name}`);
  };

  const takeOutAllVisible = () => {
    overlays.forEach(overlay => {
      if (overlay.isVisible) setVisibility(overlay, false);
    });
    markOperatorAction('OUT ALL');
  };

  const toggleSingleProgramMode = () => {
    setSingleProgramMode(current => {
      const next = !current;
      try {
        localStorage.setItem(SINGLE_PROGRAM_MODE_KEY, next ? '1' : '0');
      } catch { /* ignore storage errors */ }
      return next;
    });
  };

  const toggleOperatorDensity = () => {
    setOperatorDensity(current => {
      const next = current === 'compact' ? 'comfortable' : 'compact';
      try {
        localStorage.setItem(OPERATOR_DENSITY_MODE_KEY, next);
      } catch { /* ignore storage errors */ }
      return next;
    });
  };

  const resetOperatorFilters = () => {
    setOperatorSearch('');
    setShowOnlyLive(false);
    setShowOnlyFavorites(false);
    setOperatorCategory('ALL');
    setOperatorSortMode('smart');
  };

  const copyProgramObsUrl = async () => {
    try {
      const url = await syncManager.prepareProgramOutputUrl();
      await navigator.clipboard.writeText(url);
      setProgramObsCopied(true);
      markOperatorAction('OBS PROGRAM URL');
      setTimeout(() => setProgramObsCopied(false), 2200);
    } catch {
      alert('تعذر نسخ رابط OBS العام');
    }
  };

  const copySelectedObsUrl = async () => {
    if (!selectedOverlay) return;
    try {
      const url = await syncManager.prepareOutputUrl(selectedOverlay.id, selectedOverlay);
      await navigator.clipboard.writeText(url);
      setSelectedObsCopied(true);
      markOperatorAction('OBS TEMPLATE URL');
      setTimeout(() => setSelectedObsCopied(false), 2200);
    } catch {
      alert('تعذر نسخ رابط القالب');
    }
  };

  const copySelectedEditUrl = async () => {
    if (!selectedOverlay) return;
    try {
      await navigator.clipboard.writeText(syncManager.buildEditUrl(selectedOverlay.id));
      setSelectedEditCopied(true);
      markOperatorAction('EDIT URL');
      setTimeout(() => setSelectedEditCopied(false), 2200);
    } catch {
      alert('تعذر نسخ رابط التعديل');
    }
  };

  const updateField = (overlay: OverlayConfig, fieldId: string, value: any) => {
    syncManager.updateLiveField(overlay.id, fieldId, value);
    const fieldLabel = overlay.fields.find(field => field.id === fieldId)?.label || fieldId;
    markOperatorAction(`SYNC: ${fieldLabel}`);
  };

  const classifyOperatorField = (field: OverlayField): OperatorFieldGroup => {
    const id = field.id.toLowerCase();
    if (OPERATOR_PRIORITY_FIELDS.has(field.id)) return 'priority';
    if (OPERATOR_AUDIO_FIELD_HINTS.some(hint => id.includes(hint))) return 'audio';
    if (field.type === 'image' || field.type === 'image-list' || OPERATOR_MEDIA_FIELD_HINTS.some(hint => id.includes(hint))) return 'media';
    if (field.type === 'color' || field.type === 'range' || OPERATOR_APPEARANCE_FIELD_HINTS.some(hint => id.includes(hint))) return 'appearance';
    return 'data';
  };

  const renderSelectOption = (option: string | { label: string; value: string }) => {
    const value = typeof option === 'string' ? option : option.value;
    const label = typeof option === 'string' ? option : option.label;
    return <option key={value} value={value}>{label}</option>;
  };

  const renderOperatorFieldControl = (overlay: OverlayConfig, field: OverlayField) => {
    const baseInput = 'w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500';
    const label = (
      <label className="mb-1.5 block text-[11px] font-bold text-gray-400">
        {field.label || field.id}
      </label>
    );
    const value = field.value;

    if (field.type === 'hidden') return null;

    if (field.type === 'boolean') {
      const checked = value === true;
      return (
        <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
          <button
            type="button"
            onClick={() => updateField(overlay, field.id, !checked)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
              checked
                ? 'border-emerald-500/35 bg-emerald-600/15 text-emerald-200'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            <span className="truncate">{field.label || field.id}</span>
            <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-700'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? '-translate-x-4' : ''}`} />
            </span>
          </button>
        </div>
      );
    }

    if (field.type === 'select' && field.options?.length) {
      return (
        <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
          {label}
          <select
            value={String(value ?? '')}
            onChange={event => updateField(overlay, field.id, event.target.value)}
            className={baseInput}
          >
            {field.options.map(renderSelectOption)}
          </select>
        </div>
      );
    }

    if (field.type === 'range') {
      const numericValue = Number(value ?? field.min ?? 0);
      return (
        <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="truncate text-[11px] font-bold text-gray-400">{field.label || field.id}</span>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-mono text-gray-300">{numericValue}</span>
          </div>
          <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={numericValue}
            onChange={event => updateField(overlay, field.id, Number(event.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
          {label}
          <input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={Number(value ?? 0)}
            onChange={event => updateField(overlay, field.id, Number(event.target.value))}
            className={baseInput}
          />
        </div>
      );
    }

    if (field.type === 'color') {
      return (
        <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
          {label}
          <div className="flex gap-2">
            <input
              type="color"
              value={String(value || '#ffffff')}
              onChange={event => updateField(overlay, field.id, event.target.value)}
              className="h-10 w-12 rounded-lg border border-gray-700 bg-gray-900 p-1"
            />
            <input
              type="text"
              value={String(value || '')}
              onChange={event => updateField(overlay, field.id, event.target.value)}
              className={baseInput}
              dir="ltr"
            />
          </div>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3 md:col-span-2">
          {label}
          <textarea
            rows={4}
            value={String(value ?? '')}
            onChange={event => updateField(overlay, field.id, event.target.value)}
            className={`${baseInput} resize-y leading-6`}
          />
        </div>
      );
    }

    if (field.type === 'image-list') {
      const listValue = Array.isArray(value) ? value.join('\n') : String(value ?? '');
      return (
        <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3 md:col-span-2">
          {label}
          <textarea
            rows={4}
            value={listValue}
            onChange={event => updateField(
              overlay,
              field.id,
              event.target.value.split('\n').map(item => item.trim()).filter(Boolean),
            )}
            className={`${baseInput} resize-y font-mono text-xs leading-5`}
            dir="ltr"
          />
        </div>
      );
    }

    return (
      <div key={field.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
        {label}
        <input
          type={field.type === 'image' ? 'url' : 'text'}
          value={String(value ?? '')}
          onChange={event => updateField(overlay, field.id, event.target.value)}
          className={baseInput}
          dir={field.type === 'image' ? 'ltr' : 'auto'}
        />
      </div>
    );
  };

  const saveSelectedName = () => {
    if (!selectedOverlay) return;
    const nextName = draftName.trim();
    if (!nextName || nextName === selectedOverlay.name) return;
    onUpdate({ ...selectedOverlay, name: nextName });
    markOperatorAction(`NAME: ${nextName}`);
    setNameSavedPulse(true);
    setTimeout(() => setNameSavedPulse(false), 1600);
  };

  const resetSelectedName = () => {
    if (!selectedOverlay) return;
    const template = resolveTemplateById(selectedOverlay.templateId || selectedOverlay.id);
    const baseName = template.name || selectedOverlay.name;
    if (baseName === selectedOverlay.name) {
      setDraftName(baseName);
      return;
    }
    setDraftName(baseName);
    onUpdate({ ...selectedOverlay, name: baseName });
    markOperatorAction(`NAME: ${baseName}`);
    setNameSavedPulse(true);
    setTimeout(() => setNameSavedPulse(false), 1600);
  };

  const getFieldValue = (overlay: OverlayConfig, fieldId: string, fallback: any = '') =>
    overlay.fields.find(f => f.id === fieldId)?.value ?? fallback;
  const getField = (overlay: OverlayConfig, fieldId: string) =>
    overlay.fields.find(field => field.id === fieldId);
  const hasField = (overlay: OverlayConfig, fieldId: string) =>
    Boolean(getField(overlay, fieldId));
  const getBooleanField = (overlay: OverlayConfig, fieldId: string, fallback = false) => {
    const value = getFieldValue(overlay, fieldId, fallback);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  };
  const parseArrayField = <T,>(overlay: OverlayConfig, fieldId: string): T[] => {
    try {
      const parsed = JSON.parse(String(getFieldValue(overlay, fieldId, '[]') || '[]'));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const formatUsdShort = (value: number) =>
    `$${Math.round(value).toLocaleString('en-US')}`;
  const stampTodayArabic = () =>
    new Intl.DateTimeFormat('ar-IQ', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const updateProbabilityShiftMode = (overlay: OverlayConfig, mode: 'old' | 'new') => {
    updateField(overlay, 'probabilityShiftMode', mode);
    if (mode === 'new' && hasField(overlay, 'updateDate')) {
      updateField(overlay, 'updateDate', stampTodayArabic());
    }
  };
  const resetTransformFields = (overlay: OverlayConfig) => {
    if (hasField(overlay, 'positionX')) updateField(overlay, 'positionX', 0);
    if (hasField(overlay, 'positionY')) updateField(overlay, 'positionY', 0);
    if (hasField(overlay, 'scale')) updateField(overlay, 'scale', 1);
  };

  const buildSilentPreviewOverlay = (overlay: OverlayConfig): OverlayConfig => {
    const mutedIds = new Set(['soundEnabled', 'sfxEnabled', 'voiceEnabled']);
    const zeroVolumeIds = new Set(['soundVolume', 'voiceVolume']);
    const fields = overlay.fields.map(field => {
      if (mutedIds.has(field.id)) return { ...field, value: false };
      if (zeroVolumeIds.has(field.id)) return { ...field, value: 0 };
      if (field.id === 'mediaMuted') return { ...field, value: true };
      return field;
    });

    if (!fields.some(field => field.id === 'mediaMuted')) {
      fields.push({ id: 'mediaMuted', label: 'Operator preview muted media', type: 'boolean', value: true });
    }
    if (!fields.some(field => field.id === 'soundEnabled')) {
      fields.push({ id: 'soundEnabled', label: 'Operator preview muted audio', type: 'boolean', value: false });
    }
    if (!fields.some(field => field.id === 'sfxEnabled')) {
      fields.push({ id: 'sfxEnabled', label: 'Operator preview muted sfx', type: 'boolean', value: false });
    }
    if (!fields.some(field => field.id === 'voiceEnabled')) {
      fields.push({ id: 'voiceEnabled', label: 'Operator preview muted voice', type: 'boolean', value: false });
    }

    return { ...overlay, fields, isVisible: true };
  };

  const showUndecided = selectedOverlay ? getFieldValue(selectedOverlay, 'showUndecided', true) === true : false;
  const selectedDesignStyle = selectedOverlay ? String(getFieldValue(selectedOverlay, 'designStyle', '')) : '';

  const stampElectionUpdate = (overlay: OverlayConfig) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    updateField(overlay, 'lastUpdated', `Last update ${timeLabel}`);
  };

  const handleSmartNewsNav = (overlay: OverlayConfig, dir: 'next' | 'prev') => {
    const currentPage = Number(overlay.fields.find(f => f.id === 'currentPage')?.value || 0);
    const pagesStr = String(overlay.fields.find(f => f.id === 'pagesData')?.value || '[]');
    const pages = JSON.parse(pagesStr);

    let newPage = currentPage;
    if (dir === 'next' && currentPage < pages.length - 1) newPage++;
    if (dir === 'prev' && currentPage > 0) newPage--;

    if (newPage !== currentPage) {
      syncManager.updateLiveField(overlay.id, 'currentPage', newPage);
      markOperatorAction(`PAGE: ${newPage + 1}`);
    }
  };

  if (!selectedOverlay) return <div className="p-10 text-center text-gray-500">لا توجد قوالب نشطة. اذهب للمكتبة وأنشئ قالب.</div>;

  const canTakeInSelected = canTakeIn(selectedOverlay);
  const selectedHasScoreboard = hasField(selectedOverlay, 'homeScore') && hasField(selectedOverlay, 'awayScore');
  const selectedHomeName = String(getFieldValue(selectedOverlay, 'homeName', 'HOME'));
  const selectedAwayName = String(getFieldValue(selectedOverlay, 'awayName', 'AWAY'));
  const selectedHomeScore = Math.max(0, Number(getFieldValue(selectedOverlay, 'homeScore', 0)) || 0);
  const selectedAwayScore = Math.max(0, Number(getFieldValue(selectedOverlay, 'awayScore', 0)) || 0);
  const selectedHasTransform = ['positionX', 'positionY', 'scale'].some(fieldId => hasField(selectedOverlay, fieldId));
  const selectedPositionX = Number(getFieldValue(selectedOverlay, 'positionX', 0)) || 0;
  const selectedPositionY = Number(getFieldValue(selectedOverlay, 'positionY', 0)) || 0;
  const selectedScale = Number(getFieldValue(selectedOverlay, 'scale', 1)) || 1;
  const audioQuickToggles = [
    { id: 'soundEnabled', label: 'الصوت', fallback: true },
    { id: 'sfxEnabled', label: 'المؤثرات', fallback: true },
    { id: 'voiceEnabled', label: 'الصوت الحقيقي', fallback: false },
  ].filter(item => hasField(selectedOverlay, item.id));
  const selectedHasAudioQuick = audioQuickToggles.length > 0 || hasField(selectedOverlay, 'soundVolume');
  const selectedSoundVolume = Number(getFieldValue(selectedOverlay, 'soundVolume', 0.7)) || 0;
  const selectedHasPages = hasField(selectedOverlay, 'pagesData') && hasField(selectedOverlay, 'currentPage');
  const selectedPages = selectedHasPages ? parseArrayField<unknown>(selectedOverlay, 'pagesData') : [];
  const selectedPageCount = Math.max(1, selectedPages.length);
  const selectedCurrentPage = Math.max(
    0,
    Math.min(selectedPageCount - 1, Number(getFieldValue(selectedOverlay, 'currentPage', 0)) || 0),
  );
  const selectedHasSponsors = hasField(selectedOverlay, 'sponsorsData');
  const selectedSponsors = selectedHasSponsors ? parseArrayField<Sponsor>(selectedOverlay, 'sponsorsData') : [];
  const sponsorTotalUsd = selectedSponsors.reduce((sum, sponsor) => sum + Number(sponsor.usdAmount || 0), 0);
  const sponsorDonationCount = selectedSponsors.reduce((sum, sponsor) => sum + (sponsor.history?.length || 0), 0);
  const sponsorItemsPerPage = Math.max(1, Number(getFieldValue(selectedOverlay, 'itemsPerPage', 6)) || 6);
  const sponsorPageCount = Math.max(1, Math.ceil(selectedSponsors.length / sponsorItemsPerPage));
  const sponsorRotationTime = Math.max(3, Number(getFieldValue(selectedOverlay, 'rotationTime', 10)) || 10);
  const sponsorDisplayField = getField(selectedOverlay, 'sponsorDisplayMode');
  const sponsorDisplayMode = String(getFieldValue(selectedOverlay, 'sponsorDisplayMode', ''));
  const selectedHasProbabilityShift = hasField(selectedOverlay, 'probabilityShiftMode');
  const probabilityShiftMode = String(getFieldValue(selectedOverlay, 'probabilityShiftMode', 'old')) === 'new' ? 'new' : 'old';
  const operatorAllFieldControls = selectedOverlay.fields.filter(field => field.type !== 'hidden');
  const operatorFieldNeedle = operatorFieldSearch.trim().toLowerCase();
  const operatorFieldControls = operatorAllFieldControls
    .filter(field => operatorFieldGroup === 'ALL' || classifyOperatorField(field) === operatorFieldGroup)
    .filter(field => {
      if (!operatorFieldNeedle) return true;
      return [field.id, field.label, String(field.value || '')].some(value =>
        String(value).toLowerCase().includes(operatorFieldNeedle),
      );
    });
  const previewOverlay = buildSilentPreviewOverlay(selectedOverlay);
  const programModeLabel = singleProgramMode ? 'فردي' : 'متعدد';
  const programModeTitle = singleProgramMode
    ? 'وضع البرنامج الواحد مفعل: إدخال قالب جديد يخرج القوالب الأخرى ويبقي قالبًا واحدًا في رابط البرنامج'
    : 'وضع البرنامج المتعدد: رابط البرنامج يسمح بعرض أكثر من قالب حي في نفس الوقت';

  const renderOperatorOverlayRow = (overlay: OverlayConfig) => {
    const compactList = operatorDensity === 'compact';
    const actionButtonSize = compactList ? 'h-7 w-7 rounded-md' : 'h-8 w-8 rounded-lg';
    const statusIconSize = compactList ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const isFavorite = favoriteIdSet.has(overlay.id);

    return (
      <div
        key={overlay.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedId(overlay.id)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') setSelectedId(overlay.id);
        }}
        className={`w-full rounded-lg border text-right transition-all grid grid-cols-[1fr_auto] group cursor-pointer ${
          compactList ? 'gap-2 p-2' : 'gap-3 p-3'
        } ${
          selectedId === overlay.id ? 'bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-gray-900 border-gray-800 hover:border-gray-600'
        }`}
      >
        <div className="min-w-0">
          <div className={`font-bold text-white truncate ${compactList ? 'mb-0.5 text-sm' : 'mb-1'}`}>{overlay.name}</div>
          <div className={`flex flex-wrap items-center ${compactList ? 'gap-1.5' : 'gap-2'}`}>
            <div className="text-[10px] text-gray-500 font-mono uppercase bg-gray-950 w-max px-1 rounded border border-gray-800">{overlay.type}</div>
            {overlay.templateIcon && (
              <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 rounded border border-white/10 px-1.5 py-0.5">
                {overlay.templateIcon}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onToggleFavorite(overlay.id);
            }}
            className={`${actionButtonSize} border transition-colors ${
              isFavorite
                ? 'border-yellow-400/40 bg-yellow-500/15 text-yellow-200'
                : 'border-gray-700 bg-gray-950 text-gray-500 hover:border-yellow-400/30 hover:text-yellow-200'
            }`}
            title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Star className="mx-auto h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              takeInOverlay(overlay);
              setSelectedId(overlay.id);
            }}
            disabled={!canTakeIn(overlay)}
            className={`${actionButtonSize} border border-green-500/30 bg-green-600/15 text-green-200 transition-colors hover:bg-green-600/30 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-800 disabled:text-gray-600`}
            title="إدخال القالب"
          >
            <Play className="mx-auto h-3.5 w-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              takeOutOverlay(overlay);
              setSelectedId(overlay.id);
            }}
            disabled={!overlay.isVisible}
            className={`${actionButtonSize} border border-red-500/30 bg-red-600/15 text-red-200 transition-colors hover:bg-red-600/30 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-800 disabled:text-gray-600`}
            title="إخراج القالب"
          >
            <Square className="mx-auto h-3.5 w-3.5 fill-current" />
          </button>
          <span
            className={`${actionButtonSize} flex items-center justify-center ${
              overlay.isVisible ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-500'
            }`}
            title={overlay.isVisible ? 'على الهواء' : 'خارج البث'}
          >
            {overlay.isVisible ? <Eye className={statusIconSize} /> : <EyeOff className={statusIconSize} />}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-gray-950">
      <div className="w-96 bg-darker border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 space-y-3">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Cast className="w-5 h-5 text-green-500" />
            <span>قائمة التشغيل</span>
          </h2>
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-[10px] font-black text-gray-400">
            {liveOverlaysCount}/{overlays.length} مباشر
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              value={operatorSearch}
              onChange={event => setOperatorSearch(event.target.value)}
              placeholder="ابحث عن قالب أو نوع..."
              className="h-10 w-full rounded-lg border border-gray-800 bg-gray-950 pr-9 pl-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowOnlyLive(current => !current)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors ${
                showOnlyLive
                  ? 'border-red-500/50 bg-red-600/15 text-red-200'
                  : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              المباشر فقط
            </button>
            <button
              type="button"
              onClick={() => setShowOnlyFavorites(current => !current)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors ${
                showOnlyFavorites
                  ? 'border-yellow-400/50 bg-yellow-500/15 text-yellow-100'
                  : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white'
              }`}
              title={`القوالب المفضلة داخل غرفة التحكم: ${favoriteOverlaysCount}`}
            >
              <Star className="h-3.5 w-3.5" fill={showOnlyFavorites ? 'currentColor' : 'none'} />
              المفضلة
            </button>
            <button
              onClick={takeOutAllVisible}
              disabled={liveOverlaysCount === 0}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 px-2 py-2 text-[11px] font-bold text-red-200 transition-colors hover:bg-red-900/30 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-900 disabled:text-gray-600"
            >
              <PowerOff className="h-3.5 w-3.5" />
              إخراج الكل
            </button>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-2">
            <div className="mb-2 flex items-center justify-between text-[10px] font-black text-gray-500">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                تنظيم القائمة
              </span>
              <button
                type="button"
                onClick={resetOperatorFilters}
                disabled={!operatorFiltersActive}
                className="rounded border border-gray-800 px-2 py-0.5 text-[9px] font-black text-gray-400 transition-colors hover:border-blue-500/40 hover:text-blue-200 disabled:cursor-not-allowed disabled:text-gray-700"
              >
                تصفير
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {OPERATOR_SORT_OPTIONS.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setOperatorSortMode(option.key)}
                  className={`rounded-md border px-1.5 py-1 text-[10px] font-black transition-colors ${
                    operatorSortMode === option.key
                      ? 'border-cyan-400/45 bg-cyan-500/15 text-cyan-100'
                      : 'border-gray-800 bg-gray-900 text-gray-500 hover:border-gray-700 hover:text-white'
                  }`}
                  title={`ترتيب القائمة: ${option.label}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleOperatorDensity}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-[10px] font-black transition-colors ${
                operatorDensity === 'compact'
                  ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                  : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white'
              }`}
              title="تغيير كثافة عرض قائمة القوالب داخل غرفة التحكم"
            >
              <Layers className="h-3.5 w-3.5" />
              {operatorDensity === 'compact' ? 'عرض كثيف' : 'عرض مريح'}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black text-gray-500">
              <span>تصنيف القوالب</span>
              <span>{filteredOverlays.length} ظاهر</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOperatorCategory('ALL')}
                className={`flex items-center justify-between rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors ${
                  operatorCategory === 'ALL'
                    ? 'border-blue-500/40 bg-blue-600/15 text-blue-200'
                    : 'border-gray-800 bg-gray-900 text-gray-500 hover:border-gray-700 hover:text-white'
                }`}
              >
                <span>كل الفئات</span>
                <span className="font-mono">{overlays.length}</span>
              </button>
              {operatorCategories
                .filter(category => operatorCategoryCounts[category.key] > 0)
                .map(category => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setOperatorCategory(category.key)}
                    className={`flex items-center justify-between rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors ${
                      operatorCategory === category.key
                        ? 'text-white'
                        : 'border-gray-800 bg-gray-900 text-gray-500 hover:border-gray-700 hover:text-white'
                    }`}
                    style={operatorCategory === category.key ? { borderColor: `${category.accent}80`, background: `${category.accent}18`, color: category.accent } : undefined}
                  >
                    <span className="truncate">{category.labelAr}</span>
                    <span className="font-mono">{operatorCategoryCounts[category.key]}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto p-2 ${operatorDensity === 'compact' ? 'space-y-1.5' : 'space-y-2'}`}>
          {filteredOverlays.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/40 p-5 text-center text-xs text-gray-500">
              لا توجد قوالب مطابقة داخل غرفة التحكم.
            </div>
          )}

          {operatorCategory === 'ALL' && filteredOverlayGroups.length > 0
            ? filteredOverlayGroups.map(group => (
                <div key={group.category.key} className={operatorDensity === 'compact' ? 'space-y-1.5' : 'space-y-2'}>
                  <div
                    className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-gray-950/95 px-2.5 py-1.5 text-[10px] font-black backdrop-blur"
                    style={{ borderColor: `${group.category.accent}40`, color: group.category.accent }}
                  >
                    <span className="truncate">{group.category.labelAr}</span>
                    <span className="font-mono text-gray-400">{group.overlays.length}</span>
                  </div>
                  <div className={operatorDensity === 'compact' ? 'space-y-1.5' : 'space-y-2'}>
                    {group.overlays.map(renderOperatorOverlayRow)}
                  </div>
                </div>
              ))
            : filteredOverlays.map(renderOperatorOverlayRow)}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-950">
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
          <div className="min-w-0 flex items-center gap-4">
            <h1 className="min-w-0 max-w-[26rem] truncate text-xl font-bold text-white">{selectedOverlay.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${selectedOverlay.isVisible ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {selectedOverlay.isVisible ? 'على الهواء' : 'خارج البث'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono border flex items-center gap-1.5 ${
                liveOverlaysCount > 0
                  ? 'bg-red-950/40 text-red-300 border-red-700/40'
                  : 'bg-gray-800 text-gray-500 border-gray-700'
              }`}
              title={programModeTitle}>
              <span>PROGRAM {liveOverlaysCount}</span>
              <span className={`rounded px-1 py-0.5 text-[9px] font-black ${singleProgramMode ? 'bg-cyan-500/20 text-cyan-200' : 'bg-gray-700 text-gray-300'}`}>
                {programModeLabel}
              </span>
            </span>
            <TemplateControlBar
              overlay={selectedOverlay}
              compact
              onShow={() => takeInOverlay(selectedOverlay)}
              onHide={() => takeOutOverlay(selectedOverlay)}
              onReset={() => takeOutOverlay(selectedOverlay)}
              allowShowWhenLive={singleProgramMode && liveOverlaysCount > 1}
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={copySelectedEditUrl}
              className="text-xs flex items-center gap-2 text-cyan-300 hover:text-white bg-cyan-600/15 hover:bg-cyan-600/25 px-3 py-1.5 rounded-lg border border-cyan-500/35"
              title="نسخ رابط تعديل القالب المحدد">
              {selectedEditCopied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {selectedEditCopied ? 'تم النسخ' : 'رابط التعديل'}
            </button>
            <button
              onClick={copySelectedObsUrl}
              className="text-xs flex items-center gap-2 text-blue-300 hover:text-white bg-blue-600/15 hover:bg-blue-600/25 px-3 py-1.5 rounded-lg border border-blue-500/35"
              title="نسخ رابط OBS للقالب المحدد فقط">
              {selectedObsCopied ? <Check className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
              {selectedObsCopied ? 'تم النسخ' : 'رابط القالب'}
            </button>
            <button
              onClick={toggleSingleProgramMode}
              aria-pressed={singleProgramMode}
              className={`text-xs flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                singleProgramMode
                  ? 'bg-cyan-600/20 text-cyan-200 border-cyan-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
              }`}
              title="عند التفعيل، إدخال قالب جديد يخرج القوالب الأخرى قبل إدخال القالب الحالي">
              <span className={`h-3.5 w-6 rounded-full p-0.5 transition-colors ${singleProgramMode ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                <span className={`block h-2.5 w-2.5 rounded-full bg-white transition-transform ${singleProgramMode ? '-translate-x-3' : ''}`} />
              </span>
              برنامج واحد
            </button>
            <button
              onClick={copyProgramObsUrl}
              className="text-xs flex items-center gap-2 text-green-300 hover:text-white bg-green-600/15 hover:bg-green-600/25 px-3 py-1.5 rounded-lg border border-green-500/35"
              title="نسخ رابط البرنامج العام الذي يعرض كل القوالب الحية">
              {programObsCopied ? <Check className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
              {programObsCopied ? 'تم النسخ' : 'رابط البرنامج'}
            </button>
            <button
              onClick={() => setShowStreamDeckModal(true)}
              className="text-xs flex items-center gap-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700"
            >
              <Wifi className="w-3 h-3" />
              معلومات Stream Deck
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="mb-6 max-w-5xl mx-auto rounded-xl border border-gray-800 bg-gray-900/80 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Cast className="h-4 w-4 text-red-300" />
                برنامج البث المباشر
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-600/10 px-2 py-0.5 text-[10px] font-black text-cyan-200">
                  <Wifi className="h-3 w-3" />
                  Live API {operatorLastSyncLabel}
                </span>
                {operatorPulseMessage && (
                  <span
                    className="max-w-[22rem] truncate rounded-full border border-emerald-500/30 bg-emerald-600/15 px-2 py-0.5 text-[10px] font-black text-emerald-200"
                    title={operatorPulseMessage}
                  >
                    {operatorPulseMessage}
                  </span>
                )}
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                  liveOverlaysCount > 0
                    ? 'border-red-500/35 bg-red-600/15 text-red-200'
                    : 'border-gray-700 bg-gray-950 text-gray-500'
                }`}>
                  {liveOverlaysCount > 0 ? `${liveOverlaysCount} على الهواء` : 'لا يوجد مباشر'}
                </span>
              </div>
            </div>

            {liveOverlays.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950/60 p-4 text-center text-xs text-gray-500">
                لا يوجد أي قالب على الهواء الآن. استخدم إدخال أو Solo Live من القالب المحدد.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {liveOverlays.map(overlay => {
                  const isSelectedLive = overlay.id === selectedOverlay.id;
                  return (
                    <div
                      key={overlay.id}
                      className={`min-w-[230px] rounded-xl border p-3 transition-colors ${
                        isSelectedLive
                          ? 'border-blue-500/55 bg-blue-600/15'
                          : 'border-gray-800 bg-gray-950/80 hover:border-gray-700'
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(overlay.id)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') setSelectedId(overlay.id);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white">LIVE</span>
                          <span className="truncate text-[10px] font-mono text-gray-500">{overlay.templateIcon || overlay.type}</span>
                        </div>
                        <div className="truncate text-sm font-black text-white">{overlay.name}</div>
                        <div className="mt-1 truncate text-[10px] text-gray-500">{overlay.templateDescription || overlay.templateId || overlay.id}</div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedId(overlay.id)}
                          className="rounded-lg border border-blue-500/25 bg-blue-600/10 px-2 py-1.5 text-[10px] font-black text-blue-200 hover:bg-blue-600/20"
                        >
                          اختيار
                        </button>
                        <button
                          type="button"
                          onClick={() => takeSoloOverlay(overlay)}
                          className="rounded-lg border border-cyan-500/25 bg-cyan-600/10 px-2 py-1.5 text-[10px] font-black text-cyan-200 hover:bg-cyan-600/20"
                        >
                          Solo
                        </button>
                        <button
                          type="button"
                          onClick={() => takeOutOverlay(overlay)}
                          className="rounded-lg border border-red-500/25 bg-red-600/10 px-2 py-1.5 text-[10px] font-black text-red-200 hover:bg-red-600/20"
                        >
                          OUT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 max-w-5xl mx-auto lg:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <PencilLine className="h-4 w-4 text-blue-300" />
                  اسم القالب داخل غرفة التحكم
                </div>
                {nameSavedPulse && (
                  <span className="rounded-full border border-green-500/30 bg-green-600/15 px-2 py-0.5 text-[10px] font-black text-green-200">
                    تم الحفظ
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={draftName}
                  onChange={event => setDraftName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') saveSelectedName();
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm font-bold text-white outline-none transition-colors focus:border-blue-500"
                  placeholder="اكتب اسمًا واضحًا لهذا القالب..."
                />
                <button
                  onClick={saveSelectedName}
                  disabled={!draftName.trim() || draftName.trim() === selectedOverlay.name}
                  className="flex items-center gap-2 rounded-lg border border-blue-500/35 bg-blue-600/15 px-4 py-2 text-xs font-bold text-blue-100 transition-colors hover:bg-blue-600/25 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-800 disabled:text-gray-600"
                >
                  <Save className="h-3.5 w-3.5" />
                  حفظ
                </button>
                <button
                  onClick={resetSelectedName}
                  className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  الأصل
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-gray-800 bg-gray-900/80 p-4 text-center lg:w-80">
              <div>
                <div className="text-[10px] font-black text-gray-500">كل القوالب</div>
                <div className="mt-1 text-lg font-black text-white">{overlays.length}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-500">على الهواء</div>
                <div className="mt-1 text-lg font-black text-red-300">{liveOverlaysCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-500">الوضع</div>
                <div className="mt-1 text-lg font-black text-cyan-200">{programModeLabel}</div>
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            <button
              onClick={() => takeInOverlay(selectedOverlay)}
              disabled={!canTakeInSelected}
              className={`py-6 rounded-2xl text-2xl font-bold shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 ${
                !canTakeInSelected
                  ? 'bg-emerald-950/40 text-emerald-700 border-4 border-emerald-950/60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 border-4 border-green-800'
              }`}
            >
              <Play className="fill-current w-8 h-8" />
              <span>إدخال</span>
            </button>
            <button
              onClick={() => takeOutOverlay(selectedOverlay)}
              disabled={!selectedOverlay.isVisible}
              className={`py-6 rounded-2xl text-2xl font-bold shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 ${
                !selectedOverlay.isVisible
                  ? 'bg-red-950/30 text-red-800 border-4 border-red-950/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-700 hover:to-red-900 border-4 border-red-900'
              }`}
            >
              <Square className="fill-current w-8 h-8" />
              <span>إخراج</span>
            </button>
          </div>

          <div className="mb-8 max-w-5xl mx-auto rounded-xl border border-gray-800 bg-gray-900/80 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  أوامر ذكية مرتبطة بالقالب
                </div>
                <span className="rounded bg-gray-950 px-2 py-0.5 text-[10px] font-mono text-gray-400">
                  LIVE OPS
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-white">برنامج البث</div>
                      <div className="mt-1 text-[10px] text-gray-500">
                        {liveOverlaysCount} مباشر / {programModeLabel}
                      </div>
                    </div>
                    <Tv className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => takeSoloOverlay(selectedOverlay)}
                      className="rounded-lg border border-cyan-500/35 bg-cyan-600/15 px-3 py-2 text-xs font-black text-cyan-100 transition-colors hover:bg-cyan-600/25"
                      title="إدخال القالب المحدد وإخراج كل القوالب الأخرى">
                      Solo Live
                    </button>
                    <button
                      type="button"
                      onClick={takeOutAllVisible}
                      disabled={liveOverlaysCount === 0}
                      className="rounded-lg border border-red-500/30 bg-red-600/10 px-3 py-2 text-xs font-black text-red-200 transition-colors hover:bg-red-600/20 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-950 disabled:text-gray-700"
                    >
                      إخراج الكل
                    </button>
                  </div>
                </div>

                {selectedHasScoreboard && (
                  <div className="rounded-xl border border-green-500/20 bg-green-950/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-white">لوحة النتيجة</div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          {selectedHomeName} {selectedHomeScore} - {selectedAwayScore} {selectedAwayName}
                        </div>
                      </div>
                      <BarChart3 className="h-5 w-5 text-green-300" />
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="rounded-lg border border-white/5 bg-gray-950/80 p-2 text-center">
                        <div className="truncate text-[10px] font-bold text-gray-400">{selectedHomeName}</div>
                        <div className="font-mono text-2xl font-black text-white">{selectedHomeScore}</div>
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => updateField(selectedOverlay, 'homeScore', Math.max(0, selectedHomeScore - 1))}
                            className="rounded bg-red-600/15 px-2 py-1 text-xs font-black text-red-200 hover:bg-red-600/25"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField(selectedOverlay, 'homeScore', selectedHomeScore + 1)}
                            className="rounded bg-emerald-600/15 px-2 py-1 text-xs font-black text-emerald-200 hover:bg-emerald-600/25"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateField(selectedOverlay, 'homeScore', 0);
                          updateField(selectedOverlay, 'awayScore', 0);
                        }}
                        className="rounded-lg border border-gray-800 bg-gray-950 px-2 py-2 text-[10px] font-black text-gray-400 transition-colors hover:border-gray-700 hover:text-white"
                      >
                        0-0
                      </button>
                      <div className="rounded-lg border border-white/5 bg-gray-950/80 p-2 text-center">
                        <div className="truncate text-[10px] font-bold text-gray-400">{selectedAwayName}</div>
                        <div className="font-mono text-2xl font-black text-white">{selectedAwayScore}</div>
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => updateField(selectedOverlay, 'awayScore', Math.max(0, selectedAwayScore - 1))}
                            className="rounded bg-red-600/15 px-2 py-1 text-xs font-black text-red-200 hover:bg-red-600/25"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField(selectedOverlay, 'awayScore', selectedAwayScore + 1)}
                            className="rounded bg-emerald-600/15 px-2 py-1 text-xs font-black text-emerald-200 hover:bg-emerald-600/25"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedHasAudioQuick && (
                  <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-white">الصوت السريع</div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          مفاتيح الصوت لهذا القالب
                        </div>
                      </div>
                      {audioQuickToggles.some(item => getBooleanField(selectedOverlay, item.id, item.fallback))
                        ? <Volume2 className="h-5 w-5 text-purple-300" />
                        : <VolumeX className="h-5 w-5 text-gray-500" />}
                    </div>
                    {audioQuickToggles.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {audioQuickToggles.map(item => {
                          const active = getBooleanField(selectedOverlay, item.id, item.fallback);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => updateField(selectedOverlay, item.id, !active)}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-black transition-colors ${
                                active
                                  ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                                  : 'border-gray-800 bg-gray-950 text-gray-500 hover:border-gray-700 hover:text-white'
                              }`}
                            >
                              <span>{item.label}</span>
                              <span>{active ? 'ON' : 'OFF'}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {hasField(selectedOverlay, 'soundVolume') && (
                      <label className="mt-3 block">
                        <span className="mb-1 block text-[9px] font-black text-gray-500">مستوى المؤثرات</span>
                        <input
                          type="range"
                          min={0}
                          max={3}
                          step={0.05}
                          value={selectedSoundVolume}
                          onChange={event => updateField(selectedOverlay, 'soundVolume', Number(event.target.value))}
                          className="w-full accent-purple-500"
                        />
                      </label>
                    )}
                  </div>
                )}

                {selectedHasTransform && (
                  <div className="rounded-xl border border-slate-500/20 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-white">الموضع والحجم</div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          X {selectedPositionX} / Y {selectedPositionY} / S {selectedScale.toFixed(2)}
                        </div>
                      </div>
                      <SlidersHorizontal className="h-5 w-5 text-slate-300" />
                    </div>
                    <button
                      type="button"
                      onClick={() => resetTransformFields(selectedOverlay)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-black text-gray-300 transition-colors hover:border-slate-500/40 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      إعادة ضبط الموضع والحجم
                    </button>
                  </div>
                )}

                {selectedHasProbabilityShift && (
                  <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-white">تحويل نسب الميركاتو</div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          {probabilityShiftMode === 'new' ? 'يعرض تحديث اليوم' : 'يعرض النموذج القديم'}
                        </div>
                      </div>
                      <BarChart3 className="h-5 w-5 text-fuchsia-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateProbabilityShiftMode(selectedOverlay, 'old')}
                        className={`rounded-lg border px-3 py-2 text-xs font-black transition-colors ${
                          probabilityShiftMode === 'old'
                            ? 'border-rose-400/45 bg-rose-500/15 text-rose-100'
                            : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                      >
                        القديم
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProbabilityShiftMode(selectedOverlay, 'new')}
                        className={`rounded-lg border px-3 py-2 text-xs font-black transition-colors ${
                          probabilityShiftMode === 'new'
                            ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100'
                            : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                      >
                        تحديث اليوم
                      </button>
                    </div>
                  </div>
                )}

                {selectedHasPages && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-white">تحكم الصفحات</div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          صفحة {selectedCurrentPage + 1} من {selectedPageCount}
                        </div>
                      </div>
                      <LayoutTemplate className="h-5 w-5 text-blue-300" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => updateField(selectedOverlay, 'currentPage', Math.max(0, selectedCurrentPage - 1))}
                        disabled={selectedCurrentPage <= 0}
                        className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-black text-gray-300 transition-colors hover:border-blue-500/40 hover:text-white disabled:cursor-not-allowed disabled:text-gray-700"
                        title="الصفحة السابقة"
                      >
                        <Rewind className="mx-auto h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(selectedOverlay, 'currentPage', 0)}
                        disabled={selectedCurrentPage === 0}
                        className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-black text-gray-300 transition-colors hover:border-blue-500/40 hover:text-white disabled:cursor-not-allowed disabled:text-gray-700"
                      >
                        تصفير
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(selectedOverlay, 'currentPage', Math.min(selectedPageCount - 1, selectedCurrentPage + 1))}
                        disabled={selectedCurrentPage >= selectedPageCount - 1}
                        className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-black text-gray-300 transition-colors hover:border-blue-500/40 hover:text-white disabled:cursor-not-allowed disabled:text-gray-700"
                        title="الصفحة التالية"
                      >
                        <FastForward className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedHasSponsors && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-white">غرفة الداعمين</div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          {sponsorPageCount} صفحة / تبديل كل {sponsorRotationTime} ثواني
                        </div>
                      </div>
                      <BadgeDollarSign className="h-5 w-5 text-amber-300" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-white/5 bg-gray-950/80 p-2">
                        <Users className="mx-auto h-3.5 w-3.5 text-amber-200" />
                        <div className="mt-1 font-mono text-sm font-black text-white">{selectedSponsors.length}</div>
                        <div className="text-[9px] text-gray-500">داعم</div>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-gray-950/80 p-2">
                        <BadgeDollarSign className="mx-auto h-3.5 w-3.5 text-emerald-200" />
                        <div className="mt-1 font-mono text-sm font-black text-white">{formatUsdShort(sponsorTotalUsd)}</div>
                        <div className="text-[9px] text-gray-500">الإجمالي</div>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-gray-950/80 p-2">
                        <Clock className="mx-auto h-3.5 w-3.5 text-blue-200" />
                        <div className="mt-1 font-mono text-sm font-black text-white">{sponsorDonationCount}</div>
                        <div className="text-[9px] text-gray-500">دفعة</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {hasField(selectedOverlay, 'rotationTime') && (
                        <label className="block">
                          <span className="mb-1 block text-[9px] font-black text-gray-500">مدة الصفحة</span>
                          <input
                            type="number"
                            min={3}
                            value={sponsorRotationTime}
                            onChange={event => updateField(selectedOverlay, 'rotationTime', Math.max(3, Number(event.target.value) || 3))}
                            className="h-9 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 text-xs font-bold text-white outline-none transition-colors focus:border-amber-500"
                          />
                        </label>
                      )}
                      {hasField(selectedOverlay, 'itemsPerPage') && (
                        <label className="block">
                          <span className="mb-1 block text-[9px] font-black text-gray-500">داعمون/صفحة</span>
                          <input
                            type="number"
                            min={1}
                            value={sponsorItemsPerPage}
                            onChange={event => updateField(selectedOverlay, 'itemsPerPage', Math.max(1, Number(event.target.value) || 1))}
                            className="h-9 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 text-xs font-bold text-white outline-none transition-colors focus:border-amber-500"
                          />
                        </label>
                      )}
                    </div>
                    {sponsorDisplayField?.options?.length ? (
                      <select
                        value={sponsorDisplayMode}
                        onChange={event => updateField(selectedOverlay, 'sponsorDisplayMode', event.target.value)}
                        className="mt-3 h-9 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 text-xs font-bold text-white outline-none transition-colors focus:border-amber-500"
                      >
                        {sponsorDisplayField.options.map(renderSelectOption)}
                      </select>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

          <div className="mb-8 grid grid-cols-1 gap-4 max-w-5xl mx-auto xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Monitor className="h-4 w-4 text-blue-300" />
                  معاينة القالب المحدد
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                  selectedOverlay.isVisible
                    ? 'border-red-500/35 bg-red-600/15 text-red-200'
                    : 'border-gray-700 bg-gray-950 text-gray-500'
                }`}>
                  {selectedOverlay.isVisible ? 'ON AIR' : 'PREVIEW'}
                </span>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-lg border border-gray-800 bg-black/70">
                <OverlayRenderer config={previewOverlay} isEditor />
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
                  تحكم سريع بحقول القالب
                </div>
                <span className="rounded bg-gray-950 px-2 py-0.5 text-[10px] font-mono text-gray-400">
                  {operatorFieldControls.length}/{operatorAllFieldControls.length} حقل
                </span>
              </div>
              <div className="mb-3 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
                  <input
                    value={operatorFieldSearch}
                    onChange={event => setOperatorFieldSearch(event.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-800 bg-gray-950 pr-9 pl-3 text-xs text-white outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
                    placeholder="بحث داخل حقول القالب..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {OPERATOR_FIELD_GROUPS.map(group => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setOperatorFieldGroup(group.key)}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-black transition-colors ${
                        operatorFieldGroup === group.key
                          ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                          : 'border-gray-800 bg-gray-950 text-gray-500 hover:border-gray-700 hover:text-white'
                      }`}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
              </div>
              {operatorFieldControls.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950/60 p-5 text-center text-xs text-gray-500">
                  لا توجد حقول قابلة للتحكم لهذا القالب.
                </div>
              ) : (
                <div className="grid max-h-[34rem] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {operatorFieldControls.map(field => renderOperatorFieldControl(selectedOverlay, field))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
            {selectedOverlay.slots && Object.keys(selectedOverlay.slots).length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    النسخ المحفوظة (Presets)
                  </h3>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-950 px-2 py-1 rounded border border-gray-800">Quick Switch</span>
                </div>
                <div className="flex flex-wrap gap-3">
                    {Object.keys(selectedOverlay.slots).map(name => (
                      <button 
                        key={name}
                        onClick={() => {
                          syncManager.sendCommand({ 
                            action: 'load_slot', 
                            targetId: selectedOverlay.id, 
                            slotName: name 
                          });
                          markOperatorAction(`PRESET: ${name}`);
                        }}
                        className={`px-5 py-3 rounded-xl border text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                          selectedOverlay.activeSlot === name 
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-900/40 translate-y-[-2px]' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:text-white hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${selectedOverlay.activeSlot === name ? 'bg-white animate-pulse' : 'bg-gray-600'}`} />
                        {name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {selectedOverlay.type === OverlayType.SMART_NEWS && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-blue-500" />
                    تحكم الشرائح
                  </h3>
                  <span className="font-mono text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
                    صفحة {Number(selectedOverlay.fields.find(f => f.id === 'currentPage')?.value || 0) + 1}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleSmartNewsNav(selectedOverlay, 'prev')}
                    className="flex-1 py-8 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex flex-col items-center justify-center gap-2 border-b-4 border-gray-950 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    <Rewind className="w-8 h-8" />
                    <span className="font-bold">السابق</span>
                  </button>
                  <button
                    onClick={() => handleSmartNewsNav(selectedOverlay, 'next')}
                    className="flex-1 py-8 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex flex-col items-center justify-center gap-2 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    <FastForward className="w-8 h-8" />
                    <span className="font-bold">التالي</span>
                  </button>
                </div>
              </div>
            )}

            {selectedOverlay.type === OverlayType.SCOREBOARD && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4">تعديل النتائج</h3>
                <div className="flex items-center gap-8 justify-center">
                  <div className="text-center space-y-2">
                    <label className="text-gray-400 text-sm">المضيف</label>
                    <div className="text-3xl font-mono font-bold text-white bg-black p-4 rounded-lg border border-gray-700">
                      {String(selectedOverlay.fields.find(f => f.id === 'homeScore')?.value)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateField(selectedOverlay, 'homeScore', Number(selectedOverlay.fields.find(f => f.id === 'homeScore')?.value) + 1)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold">+</button>
                      <button onClick={() => updateField(selectedOverlay, 'homeScore', Math.max(0, Number(selectedOverlay.fields.find(f => f.id === 'homeScore')?.value) - 1))} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold">-</button>
                    </div>
                  </div>

                  <div className="h-20 w-px bg-gray-800"></div>

                  <div className="text-center space-y-2">
                    <label className="text-gray-400 text-sm">الضيف</label>
                    <div className="text-3xl font-mono font-bold text-white bg-black p-4 rounded-lg border border-gray-700">
                      {String(selectedOverlay.fields.find(f => f.id === 'awayScore')?.value)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateField(selectedOverlay, 'awayScore', Number(selectedOverlay.fields.find(f => f.id === 'awayScore')?.value) + 1)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold">+</button>
                      <button onClick={() => updateField(selectedOverlay, 'awayScore', Math.max(0, Number(selectedOverlay.fields.find(f => f.id === 'awayScore')?.value) - 1))} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold">-</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedOverlay.type === OverlayType.ELECTION && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold">أوضاع قالب الانتخابات</h3>
                      <p className="text-xs text-gray-500 mt-1">{selectedMeta?.description || 'قالب انتخابات مستقل قابل للإظهار والإخفاء وحده.'}</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black tracking-[0.2em] text-gray-300">
                      {selectedMeta?.templateLabel}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-800 bg-black/30 px-4 py-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Template</div>
                      <div className="mt-2 text-sm font-mono text-white">{selectedMeta?.templateId}</div>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/30 px-4 py-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Overlay</div>
                      <div className="mt-2 text-sm font-mono text-white">{String(getFieldValue(selectedOverlay, 'designStyle', 'ELECTION'))}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">شارة الحالة</label>
                      <input
                        type="text"
                        value={String(getFieldValue(selectedOverlay, 'statusBadge', ''))}
                        onChange={e => updateField(selectedOverlay, 'statusBadge', e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">المصدر</label>
                      <input
                        type="text"
                        value={String(getFieldValue(selectedOverlay, 'sourceLabel', ''))}
                        onChange={e => updateField(selectedOverlay, 'sourceLabel', e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">آخر تحديث</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={String(getFieldValue(selectedOverlay, 'lastUpdated', ''))}
                          onChange={e => updateField(selectedOverlay, 'lastUpdated', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                        />
                        <button
                          onClick={() => stampElectionUpdate(selectedOverlay)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
                        >
                          الآن
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2].map(index => (
                        <div key={`candidate-profile-${index}`}>
                          <label className="mb-1 block text-xs text-gray-400">{`الملف الذكي للمرشح ${index}`}</label>
                          <select
                            value={String(getFieldValue(selectedOverlay, `candidate${index}Profile`, index === 1 ? 'LAPORTA' : 'FONT'))}
                            onChange={e => updateField(selectedOverlay, `candidate${index}Profile`, e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                          >
                            {ELECTION_CANDIDATE_PROFILE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    {selectedDesignStyle === 'STATEMENT_FULL' && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">مصدر شخصية التصريح</label>
                          <select
                            value={String(getFieldValue(selectedOverlay, 'statementSource', 'CANDIDATE_1'))}
                            onChange={e => updateField(selectedOverlay, 'statementSource', e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                          >
                            {ELECTION_STATEMENT_SOURCE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        {String(getFieldValue(selectedOverlay, 'statementSource', 'CANDIDATE_1')) === 'CUSTOM' && (
                          <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-800 bg-black/20 p-4">
                            <div>
                              <label className="mb-1 block text-xs text-gray-400">اسم الشخص المخصص</label>
                              <input
                                type="text"
                                value={String(getFieldValue(selectedOverlay, 'statementSubjectName', ''))}
                                onChange={e => updateField(selectedOverlay, 'statementSubjectName', e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-400">وصف الشخص المخصص</label>
                              <input
                                type="text"
                                value={String(getFieldValue(selectedOverlay, 'statementSubjectTag', ''))}
                                onChange={e => updateField(selectedOverlay, 'statementSubjectTag', e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-400">صورة الشخص المخصص</label>
                              <input
                                type="text"
                                value={String(getFieldValue(selectedOverlay, 'statementSubjectImage', ''))}
                                onChange={e => updateField(selectedOverlay, 'statementSubjectImage', e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">Take In Sound</label>
                        <select
                          value={String(getFieldValue(selectedOverlay, 'soundInStyle', 'RESULTS_STING'))}
                          onChange={e => updateField(selectedOverlay, 'soundInStyle', e.target.value)}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                        >
                          {ELECTION_SOUNDS.map(sound => <option key={sound} value={sound}>{sound}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">Take Out Sound</label>
                        <select
                          value={String(getFieldValue(selectedOverlay, 'soundOutStyle', 'SOFT_FADE'))}
                          onChange={e => updateField(selectedOverlay, 'soundOutStyle', e.target.value)}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                        >
                          {ELECTION_SOUNDS.map(sound => <option key={sound} value={sound}>{sound}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">ملاحظة البث</label>
                      <textarea
                        rows={4}
                        value={String(getFieldValue(selectedOverlay, 'specialText', ''))}
                        onChange={e => updateField(selectedOverlay, 'specialText', e.target.value)}
                        className="w-full resize-y rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
                  <h3 className="text-white font-bold">النتائج المباشرة</h3>

                  {[1, 2].map(index => (
                    <div key={index} className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white">{String(getFieldValue(selectedOverlay, `candidate${index}Name`, `مرشح ${index}`))}</div>
                        <div className="text-sm font-mono text-gray-400">{Number(getFieldValue(selectedOverlay, `candidate${index}Percent`, 0)).toFixed(1)}%</div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number(getFieldValue(selectedOverlay, `candidate${index}Percent`, 0))}
                        onChange={e => updateField(selectedOverlay, `candidate${index}Percent`, Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">الأصوات</label>
                          <input
                            type="number"
                            value={Number(getFieldValue(selectedOverlay, `candidate${index}Votes`, 0))}
                            onChange={e => updateField(selectedOverlay, `candidate${index}Votes`, Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">التغير %</label>
                          <input
                            type="number"
                            step={0.1}
                            value={Number(getFieldValue(selectedOverlay, `candidate${index}Delta`, 0))}
                            onChange={e => updateField(selectedOverlay, `candidate${index}Delta`, Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {showUndecided && (
                    <div className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white">{String(getFieldValue(selectedOverlay, 'undecidedLabel', 'غير محسوم'))}</div>
                        <div className="text-sm font-mono text-gray-400">{Number(getFieldValue(selectedOverlay, 'undecidedPercent', 0)).toFixed(1)}%</div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number(getFieldValue(selectedOverlay, 'undecidedPercent', 0))}
                        onChange={e => updateField(selectedOverlay, 'undecidedPercent', Number(e.target.value))}
                        className="w-full accent-gray-400"
                      />
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white">المشاركة</div>
                      <div className="text-sm font-mono text-gray-400">{Number(getFieldValue(selectedOverlay, 'currentVoters', 0)).toLocaleString('en-US')}</div>
                    </div>
                    <input
                      type="number"
                      value={Number(getFieldValue(selectedOverlay, 'currentVoters', 0))}
                      onChange={e => updateField(selectedOverlay, 'currentVoters', Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {[500, 1000, 5000].map(step => (
                        <button
                          key={step}
                          onClick={() => updateField(selectedOverlay, 'currentVoters', Number(getFieldValue(selectedOverlay, 'currentVoters', 0)) + step)}
                          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-bold text-gray-300 hover:border-blue-500 hover:text-white"
                        >
                          +{step}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showStreamDeckModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">بيانات التحكم المتقدمة</h2>
            <p className="text-gray-400 mb-4 text-sm">
              الربط الخارجي أصبح يعتمد على Smart Tokens والربط الآمن. استخدم معرف الاستوديو هذا
              كمرجع تشغيلي:
            </p>

            <div className="bg-black p-4 rounded border border-gray-800 mb-4">
              <code className="text-green-400 font-mono text-lg">{syncManager.getStudioId()}</code>
            </div>
            <p className="text-xs leading-6 text-gray-500">
              {secureContext
                ? 'الربط الآمن مفعل. انسخ Smart Token من المكتبة أو نزّل إضافة Stream Deck من صفحة التكاملات.'
                : 'الربط الآمن غير مفعل بعد. فعّله من صفحة الحماية والربط إذا كنت تريد تحكمًا خارجيًا موثوقًا.'}
            </p>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowStreamDeckModal(false)} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operator;
