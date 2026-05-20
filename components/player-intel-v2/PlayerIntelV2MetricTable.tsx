/**
 * Searchable metric catalog table.
 *
 * Operates on the PlayerIntelMasterFull.metricCatalog when available.
 * If only summary is loaded, shows a hint to paste full master.
 */
import React, { useMemo, useState } from 'react';
import { Search, ListFilter } from 'lucide-react';
import { LAB_LABELS } from './playerIntelV2Labels';
import type { PlayerIntelMetricCatalogItem } from './playerIntelV2Types';

interface Props {
  catalog: Record<string, PlayerIntelMetricCatalogItem> | null;
}

const PlayerIntelV2MetricTable: React.FC<Props> = ({ catalog }) => {
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    if (!catalog) return [] as PlayerIntelMetricCatalogItem[];
    const list: PlayerIntelMetricCatalogItem[] = Object.values(catalog) as PlayerIntelMetricCatalogItem[];
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((m) => {
      return (
        (m.key || '').toLowerCase().includes(q) ||
        (m.label || '').toLowerCase().includes(q) ||
        (m.labelAr || '').toLowerCase().includes(q) ||
        (m.source || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q)
      );
    });
  }, [catalog, query]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ListFilter className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <h3 className="text-base font-black text-white truncate">
            {LAB_LABELS.catalogTitle}
          </h3>
        </div>
        {catalog ? (
          <span className="text-[11px] text-gray-500 font-mono whitespace-nowrap">
            {items.length} / {Object.keys(catalog).length} {LAB_LABELS.catalogResults}
          </span>
        ) : null}
      </div>

      {!catalog ? (
        <p className="text-sm text-yellow-400/80 italic">
          {LAB_LABELS.catalogEmpty}
        </p>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={LAB_LABELS.catalogSearch}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pr-9 pl-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-800 max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm" dir="ltr">
              <thead className="bg-gray-950/70 sticky top-0 z-10">
                <tr className="text-[11px] text-gray-500 uppercase">
                  <th className="text-left px-3 py-2 font-mono">
                    {LAB_LABELS.catalogColKey}
                  </th>
                  <th className="text-left px-3 py-2">
                    {LAB_LABELS.catalogColLabel}
                  </th>
                  <th className="text-right px-3 py-2">
                    {LAB_LABELS.catalogColLabelAr}
                  </th>
                  <th className="text-left px-3 py-2">
                    {LAB_LABELS.catalogColSource}
                  </th>
                  <th className="text-left px-3 py-2">
                    {LAB_LABELS.catalogColCategory}
                  </th>
                  <th className="text-left px-3 py-2">
                    {LAB_LABELS.catalogColType}
                  </th>
                  <th className="text-center px-3 py-2">
                    {LAB_LABELS.catalogColAvailable}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr
                    key={m.key}
                    className="border-t border-gray-800 hover:bg-gray-800/30"
                  >
                    <td className="px-3 py-1.5 font-mono text-[11px] text-gray-400 max-w-[180px] truncate">
                      {m.key}
                    </td>
                    <td className="px-3 py-1.5 text-gray-200">
                      {m.label || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-gray-300 text-right" dir="rtl">
                      {m.labelAr || '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-[10px] bg-gray-800 text-gray-300 rounded px-1.5 py-0.5 font-mono">
                        {m.source || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-400">
                      {m.category || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-500 font-mono">
                      {m.valueType || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {m.available ? (
                        <span className="text-green-400 text-xs">●</span>
                      ) : (
                        <span className="text-gray-600 text-xs">○</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-6">—</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerIntelV2MetricTable;
