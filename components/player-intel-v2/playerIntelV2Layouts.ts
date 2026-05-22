/**
 * Player Intel V2 — Smart layout selector.
 *
 * Decides which on-card stats layout to render based on count + variant.
 * Single source of truth so Renderer + Editor agree on what fits.
 */

export type StatLayoutMode =
  | 'hero_cards'        // 1-6 stats: large cards
  | 'compact_grid'      // 7-12: tight 4-col grid
  | 'matrix'            // 13-20: 5-col matrix
  | 'data_table'        // 21+: dense table
  | 'comparison_rows';  // compare mode (any count)

export function chooseStatLayout(
  selectedCount: number,
  cardVariant: string,
  compareMode: boolean,
): StatLayoutMode {
  if (compareMode) return 'comparison_rows';
  if (cardVariant === 'compact_tv') return 'compact_grid';
  if (selectedCount <= 6) return 'hero_cards';
  if (selectedCount <= 12) return 'compact_grid';
  if (selectedCount <= 20) return 'matrix';
  return 'data_table';
}

export interface LayoutConfig {
  mode: StatLayoutMode;
  columns: number;
  rowHeight: 'sm' | 'md' | 'lg';
}

export function layoutConfig(mode: StatLayoutMode, count: number): LayoutConfig {
  switch (mode) {
    case 'hero_cards':
      return { mode, columns: Math.min(count, 3), rowHeight: 'lg' };
    case 'compact_grid':
      return { mode, columns: 4, rowHeight: 'md' };
    case 'matrix':
      return { mode, columns: 5, rowHeight: 'sm' };
    case 'data_table':
      return { mode, columns: 6, rowHeight: 'sm' };
    case 'comparison_rows':
      return { mode, columns: 1, rowHeight: 'md' };
  }
}
