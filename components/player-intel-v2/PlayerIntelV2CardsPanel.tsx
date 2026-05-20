/**
 * Broadcast Cards panel.
 *
 * Two modes:
 *  1) Summary-only mode — shows just the topAvailableCards list with item counts.
 *  2) Full master mode — when a master JSON is pasted, shows each card's items.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { LAB_LABELS, cardArTitle } from './playerIntelV2Labels';
import type {
  PlayerIntelBroadcastCards,
  PlayerIntelMasterSummary,
  PlayerIntelTopCard,
} from './playerIntelV2Types';

interface Props {
  summary: PlayerIntelMasterSummary | null;
  fullCards: PlayerIntelBroadcastCards | null;
}

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2);
  }
  return String(v);
};

const PlayerIntelV2CardsPanel: React.FC<Props> = ({ summary, fullCards }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const cards: PlayerIntelTopCard[] = summary?.topAvailableCards || [];

  if (!summary && !fullCards) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-purple-400" />
        <h3 className="text-base font-black text-white">
          {LAB_LABELS.broadcastCardsTitle}
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {LAB_LABELS.broadcastCardsHint}
      </p>

      {cards.length === 0 && !fullCards && (
        <p className="text-sm text-gray-500 italic">
          {LAB_LABELS.cardsNotInSummary}
        </p>
      )}

      {!fullCards && cards.length > 0 && (
        <p className="text-[11px] text-yellow-400/80 mb-3">
          {LAB_LABELS.cardsNotInSummary}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(fullCards
          ? Object.entries(fullCards).map(([key, card]) => {
              const c = card as PlayerIntelBroadcastCards[string];
              return {
                key,
                title: c.title,
                itemsCount: c.items?.length ?? c.itemsCount ?? 0,
                card: c,
              };
            })
          : cards.map((c) => ({
              key: c.key,
              title: c.title,
              itemsCount: c.itemsCount ?? 0,
              card: null,
            }))
        ).map((c) => {
          const isExpanded = expanded === c.key;
          const items = (c.card?.items || []) as Array<Record<string, unknown>>;
          return (
            <div
              key={c.key}
              className="bg-gray-950 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {cardArTitle(c.key, c.title)}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">
                    {c.key} — {LAB_LABELS.cardItems}: {c.itemsCount}
                  </div>
                </div>
                {c.card ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : c.key)}
                    className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        {LAB_LABELS.closeCard}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        {LAB_LABELS.previewCard}
                      </>
                    )}
                  </button>
                ) : null}
              </div>

              {isExpanded && c.card && (
                <div className="mt-3 border-t border-gray-800 pt-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      {LAB_LABELS.noCardsItems}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {items.map((it, idx) => {
                        const labelAr = (it.labelAr as string | null) || null;
                        const label =
                          (it.label as string | null) ||
                          (it.key as string) ||
                          '';
                        const value = formatValue(it.value);
                        const source = (it.source as string) || '';
                        const pctRank = it.percentileRank as number | null;
                        return (
                          <li
                            key={`${c.key}-${idx}`}
                            className="flex items-center justify-between text-xs bg-gray-900/50 rounded-md px-2 py-1.5"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-gray-200 truncate">
                                {labelAr || label}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono truncate">
                                {label} · {source}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-mono text-white font-bold">
                                {value}
                              </span>
                              {typeof pctRank === 'number' && (
                                <span className="text-[10px] bg-blue-900/30 text-blue-300 rounded px-1.5 py-0.5 font-mono">
                                  {Math.round(pctRank)}%
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerIntelV2CardsPanel;
