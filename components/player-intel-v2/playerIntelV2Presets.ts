/**
 * Player Intel V2 — Preset definitions for hero/secondary metric selections.
 *
 * Each preset is a starting point — users can edit hero/secondary lists manually
 * after applying a preset.
 */

export interface PresetDefinition {
  id: string;
  label: string;
  hero: string[];
  secondary: string[];
}

export const PLAYER_INTEL_PRESETS: Record<string, PresetDefinition> = {
  attacker_card: {
    id: 'attacker_card',
    label: 'بطاقة هجومية',
    hero: ['goals', 'assists', 'xg', 'shots'],
    secondary: ['shots_on_target', 'rating', 'minutes', 'matches'],
  },
  playmaker_card: {
    id: 'playmaker_card',
    label: 'صانع لعب',
    hero: ['assists', 'xa', 'key_passes', 'chances_created'],
    secondary: ['accurate_passes', 'progressive_passes', 'crosses', 'rating'],
  },
  winger_card: {
    id: 'winger_card',
    label: 'جناح',
    hero: ['goals', 'assists', 'crosses', 'progressive_carries'],
    secondary: ['shot_creating_actions', 'touches', 'dribbles', 'rating'],
  },
  defender_card: {
    id: 'defender_card',
    label: 'مدافع',
    hero: ['tackles', 'interceptions', 'blocks', 'aerial_duels_won'],
    secondary: ['tackles_won', 'clearances', 'rating', 'matches'],
  },
  form_report: {
    id: 'form_report',
    label: 'تقرير الفورمة',
    hero: ['fotmob_recent_goals', 'fotmob_recent_assists', 'fotmob_recent_avg_rating', 'fotmob_recent_matches_count'],
    secondary: ['fotmob_recent_minutes', 'fotmob_recent_player_of_match_count', 'fotmob_recent_yellow_cards', 'fotmob_recent_red_cards'],
  },
  market_report: {
    id: 'market_report',
    label: 'تقرير السوق',
    hero: ['fotmob_market_currentValue', 'fotmob_market_highestValue', 'fotmob_market_lowestValue', 'fotmob_market_growthFromFirstPercent'],
    secondary: ['fotmob_market_firstValue', 'goals', 'assists', 'rating'],
  },
  season_report: {
    id: 'season_report',
    label: 'تقرير الموسم',
    hero: ['goals', 'assists', 'matches', 'minutes'],
    secondary: ['rating', 'shots_on_target', 'tackles', 'interceptions', 'touches'],
  },
  complete_report: {
    id: 'complete_report',
    label: 'تقرير كامل',
    hero: ['goals', 'assists', 'matches', 'minutes'],
    secondary: ['rating', 'shots', 'key_passes', 'tackles', 'interceptions', 'yellow_cards'],
  },
};

export function getPreset(id: string): PresetDefinition | null {
  return PLAYER_INTEL_PRESETS[id] || null;
}

/**
 * Metric category groups for the picker UI.
 */
export const METRIC_CATEGORIES: Record<string, { label: string; keys: string[] }> = {
  attacking: {
    label: 'هجومية',
    keys: ['goals', 'xg', 'shots', 'shots_on_target', 'penalties_scored'],
  },
  creation: {
    label: 'صناعة لعب',
    keys: ['assists', 'xa', 'key_passes', 'chances_created', 'shot_creating_actions', 'goal_creating_actions'],
  },
  passing: {
    label: 'تمرير',
    keys: ['accurate_passes', 'progressive_passes', 'crosses'],
  },
  defense: {
    label: 'دفاع',
    keys: ['tackles', 'tackles_won', 'interceptions', 'blocks', 'clearances', 'aerial_duels_won'],
  },
  possession: {
    label: 'حيازة',
    keys: ['touches', 'dribbles', 'progressive_carries', 'duels_won', 'dribble_success_rate'],
  },
  playing_time: {
    label: 'دقائق ومشاركات',
    keys: ['matches', 'starts', 'minutes', 'appearances'],
  },
  discipline: {
    label: 'انضباط',
    keys: ['yellow_cards', 'red_cards', 'fouls_committed', 'fouls_drawn', 'offsides'],
  },
  form: {
    label: 'تقييم وفورمة',
    keys: [
      'rating',
      'fotmob_recent_matches_count',
      'fotmob_recent_goals',
      'fotmob_recent_assists',
      'fotmob_recent_minutes',
      'fotmob_recent_avg_rating',
      'fotmob_recent_player_of_match_count',
      'fotmob_recent_yellow_cards',
      'fotmob_recent_red_cards',
    ],
  },
  market: {
    label: 'سوق وانتقالات',
    keys: [
      'fotmob_market_currentValue',
      'fotmob_market_highestValue',
      'fotmob_market_lowestValue',
      'fotmob_market_firstValue',
      'fotmob_market_growthFromFirstPercent',
    ],
  },
};
