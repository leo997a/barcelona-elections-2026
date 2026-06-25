import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Wifi, AlertCircle } from 'lucide-react';
import type { OverlayField } from '../../types';
import {
  fixturesFromWorldCupData,
  selectedMatchToFields,
  type MondialLiveMatch,
} from '../../utils/mondialLiveSelectors';

type MondialMatchPickerProps = {
  fields: OverlayField[];
  onChange: (updates: Record<string, unknown>) => void;
  compact?: boolean;
};

const fieldValue = (fields: OverlayField[], id: string, fallback = ''): string => {
  const value = fields.find(field => field.id === id)?.value;
  return value === undefined || value === null || value === '' ? fallback : String(value);
};

const fieldIds = (fields: OverlayField[]) => new Set(fields.map(field => field.id));

export const hasMondialMatchPickerFields = (fields: OverlayField[]) =>
  fields.some(field => field.id === 'selectedMatchId') &&
  fields.some(field => field.id === 'matchPickMode') &&
  fields.some(field => field.id === 'bridgeApiUrl');

const formatBaghdadTime = (dateValue?: string) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat('ar-IQ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Baghdad',
  }).format(date);
};

const teamLabel = (match: MondialLiveMatch, side: 'home' | 'away') => {
  const team = side === 'home' ? match.home : match.away;
  return team?.name || (side === 'home' ? match.homePlaceholder : match.awayPlaceholder) || 'TBD';
};

const teamCode = (match: MondialLiveMatch, side: 'home' | 'away') => {
  const team = side === 'home' ? match.home : match.away;
  return (team?.countryCode || team?.shortName || '').toUpperCase();
};

const statusLabel = (match: MondialLiveMatch) => {
  if (match.status === 'live') return match.minute ? `مباشر ${match.minute}` : 'مباشر';
  if (match.status === 'finished') return match.statusLabel || 'FT';
  if (match.status === 'cancelled') return 'ملغاة';
  return 'قادمة';
};

const statusClass = (status: string) => {
  if (status === 'live') return 'border-red-400/45 bg-red-500/15 text-red-100';
  if (status === 'finished') return 'border-lime-400/35 bg-lime-400/10 text-lime-100';
  if (status === 'scheduled') return 'border-cyan-400/35 bg-cyan-400/10 text-cyan-100';
  return 'border-slate-600 bg-slate-800 text-slate-200';
};

const searchable = (match: MondialLiveMatch) => [
  match.id,
  match.group,
  match.stage,
  match.venue,
  teamLabel(match, 'home'),
  teamLabel(match, 'away'),
  teamCode(match, 'home'),
  teamCode(match, 'away'),
].join(' ').toLowerCase();

export const MondialMatchPicker: React.FC<MondialMatchPickerProps> = ({ fields, onChange, compact = false }) => {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ANY');
  const [statusFilter, setStatusFilter] = useState('any');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const apiUrl = fieldValue(fields, 'bridgeApiUrl', '/api/reo-match?action=world-cup');
  const selectedMatchId = fieldValue(fields, 'selectedMatchId');
  const currentMode = fieldValue(fields, 'matchPickMode', 'next');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');
    const separator = apiUrl.includes('?') ? '&' : '?';
    fetch(`${apiUrl}${separator}_reo=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Record<string, unknown>>;
      })
      .then(payload => {
        if (!active) return;
        setData(payload);
        setStatus('ready');
      })
      .catch(fetchError => {
        if (!active) return;
        setStatus('error');
        setError(fetchError instanceof Error ? fetchError.message : 'unknown error');
      });
    return () => {
      active = false;
    };
  }, [apiUrl, refreshNonce]);

  const fixtures = useMemo(() => fixturesFromWorldCupData(data, '[]'), [data]);
  const availableStages = useMemo(() => {
    const values = new Set<string>();
    fixtures.forEach(match => {
      if (match.group) values.add(`GROUP:${match.group}`);
      if (match.stage) values.add(`STAGE:${match.stage}`);
    });
    return [...values];
  }, [fixtures]);

  const visibleFixtures = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fixtures
      .filter(match => statusFilter === 'any' || match.status === statusFilter)
      .filter(match => {
        if (stageFilter === 'ANY') return true;
        if (stageFilter.startsWith('GROUP:')) return String(match.group || '').toUpperCase() === stageFilter.slice(6).toUpperCase();
        if (stageFilter.startsWith('STAGE:')) return String(match.stage || '').toUpperCase() === stageFilter.slice(6).toUpperCase();
        return true;
      })
      .filter(match => !needle || searchable(match).includes(needle))
      .slice(0, 80);
  }, [fixtures, query, stageFilter, statusFilter]);

  const selectedFixture = fixtures.find(match => String(match.id) === selectedMatchId);
  const allowedFields = fieldIds(fields);

  const applyFixture = (match: MondialLiveMatch) => {
    const mapped = selectedMatchToFields(match, String(data?.competition || 'FIFA World Cup 2026'));
    const updates: Record<string, unknown> = {
      matchPickMode: 'match_id',
      selectedMatchId: String(match.id),
    };
    Object.entries(mapped).forEach(([key, value]) => {
      if (allowedFields.has(key)) updates[key] = value;
    });
    onChange(updates);
  };

  return (
    <section className={`rounded-lg border border-cyan-400/20 bg-slate-950/80 text-right ${compact ? 'p-3' : 'p-4'} shadow-[0_0_28px_rgba(12,232,207,0.08)]`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-100">
            <Wifi className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-black">اختيار مباراة المونديال</h3>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            اختر مباراة حقيقية من FotMob. سيتم تثبيت Match ID وربط القوالب بالتفاصيل المباشرة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshNonce(value => value + 1)}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 text-[11px] font-black text-cyan-100 hover:border-cyan-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_150px_130px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="بحث: منتخب، مجموعة، مرحلة، Match ID"
            className="w-full rounded-md border border-slate-700 bg-slate-900 py-2 pl-3 pr-9 text-xs text-white outline-none focus:border-cyan-400"
          />
        </label>
        <select
          value={stageFilter}
          onChange={event => setStageFilter(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white outline-none focus:border-cyan-400"
        >
          <option value="ANY">كل المراحل</option>
          {availableStages.map(value => (
            <option key={value} value={value}>
              {value.startsWith('GROUP:') ? `المجموعة ${value.slice(6)}` : value.slice(6)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white outline-none focus:border-cyan-400"
        >
          <option value="any">كل الحالات</option>
          <option value="live">مباشر</option>
          <option value="scheduled">قادمة</option>
          <option value="finished">منتهية</option>
        </select>
      </div>

      {selectedFixture && (
        <div className="mt-3 rounded-md border border-lime-400/25 bg-lime-400/10 px-3 py-2 text-[11px] font-bold text-lime-100">
          محدد الآن: {teamLabel(selectedFixture, 'home')} ضد {teamLabel(selectedFixture, 'away')} · {formatBaghdadTime(selectedFixture.date)} · ID {selectedFixture.id}
        </div>
      )}
      {!selectedFixture && selectedMatchId && (
        <div className="mt-3 rounded-md border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-[11px] font-bold text-yellow-100">
          Match ID الحالي غير موجود في موجز المونديال: {selectedMatchId}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-100">
          <AlertCircle className="h-4 w-4" />
          تعذر تحميل المباريات: {error}
        </div>
      )}

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {status === 'loading' && (
          <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-4 text-center text-xs font-bold text-slate-400">
            جار تحميل جدول المونديال...
          </div>
        )}
        {status === 'ready' && visibleFixtures.length === 0 && (
          <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-4 text-center text-xs font-bold text-slate-400">
            لا توجد مباراة مطابقة للفلاتر الحالية.
          </div>
        )}
        {visibleFixtures.map(match => {
          const selected = String(match.id) === selectedMatchId && currentMode === 'match_id';
          const score = match.status === 'finished' || match.status === 'live'
            ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
            : formatBaghdadTime(match.date);
          return (
            <button
              key={String(match.id)}
              type="button"
              onClick={() => applyFixture(match)}
              className={`grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border px-3 py-2 text-right transition-colors ${
                selected
                  ? 'border-lime-300 bg-lime-400/15 text-white shadow-[0_0_16px_rgba(182,255,0,0.12)]'
                  : 'border-slate-800 bg-slate-900 text-slate-100 hover:border-cyan-400/45 hover:bg-slate-800'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-black">{teamLabel(match, 'home')}</div>
                <div className="mt-0.5 text-[10px] font-mono uppercase text-slate-500">{teamCode(match, 'home')}</div>
              </div>
              <div className="text-center">
                <div className="rounded bg-black px-3 py-1 font-mono text-sm font-black text-white">{score}</div>
                <div className={`mt-1 rounded border px-2 py-0.5 text-[9px] font-black ${statusClass(match.status)}`}>
                  {statusLabel(match)}
                </div>
                <div className="mt-1 text-[9px] font-bold text-slate-500">
                  {match.group ? `G${match.group}` : match.stage || 'WC'} · {match.id}
                </div>
              </div>
              <div className="min-w-0 text-left">
                <div className="truncate text-xs font-black">{teamLabel(match, 'away')}</div>
                <div className="mt-0.5 text-[10px] font-mono uppercase text-slate-500">{teamCode(match, 'away')}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default MondialMatchPicker;
