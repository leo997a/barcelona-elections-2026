/**
 * Template Library Taxonomy.
 *
 * Two-level category tree for the template browser. The previous
 * Library.tsx had 25+ flat type filters which became unmanageable.
 * This file maps each OverlayType to a (categoryKey, subcategoryKey)
 * pair so the UI can render hierarchical tabs/sections.
 *
 * Important: this is metadata only — it does NOT change template ids,
 * fields, or behavior. Existing Library users see the same templates,
 * just grouped sensibly.
 */
import { OverlayType } from '../types';

export type CategoryKey = 'mercato' | 'match' | 'player' | 'newsroom' | 'social_stream' | 'utilities' | 'legacy';

export interface CategoryDef {
  key: CategoryKey;
  labelAr: string;
  labelEn: string;
  icon: string;
  accent: string;
  order: number;
}

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  mercato:       { key: 'mercato',       labelAr: 'ميركاتو',           labelEn: 'Mercato',          icon: '💼', accent: '#22d3ee', order: 1 },
  match:         { key: 'match',         labelAr: 'المباريات',         labelEn: 'Match',            icon: '⚽', accent: '#22c55e', order: 2 },
  player:        { key: 'player',        labelAr: 'استخبارات اللاعب',  labelEn: 'Player Intel',     icon: '🧠', accent: '#7c5cff', order: 3 },
  newsroom:      { key: 'newsroom',      labelAr: 'غرفة الأخبار',     labelEn: 'Newsroom',         icon: '📰', accent: '#f59e0b', order: 4 },
  social_stream: { key: 'social_stream', labelAr: 'بث وسوشيال',       labelEn: 'Social & Stream',  icon: '🎥', accent: '#ec4899', order: 5 },
  utilities:     { key: 'utilities',     labelAr: 'أدوات عامة',        labelEn: 'Utilities',        icon: '🔧', accent: '#94a3b8', order: 6 },
  legacy:        { key: 'legacy',        labelAr: 'كلاسيكية',         labelEn: 'Legacy',           icon: '📦', accent: '#64748b', order: 99 },
};

export interface SubcategoryDef {
  key: string;
  parent: CategoryKey;
  labelAr: string;
}

export const SUBCATEGORIES: Record<string, SubcategoryDef> = {
  // Mercato subgroups
  'mercato.breaking':        { key: 'mercato.breaking',        parent: 'mercato', labelAr: 'عاجل وميركاتو' },
  'mercato.agents_sources':  { key: 'mercato.agents_sources',  parent: 'mercato', labelAr: 'وكلاء ومصادر' },
  'mercato.deal_analysis':   { key: 'mercato.deal_analysis',   parent: 'mercato', labelAr: 'تحليل صفقة' },
  'mercato.official':        { key: 'mercato.official',        parent: 'mercato', labelAr: 'رسمي ووثائق' },
  'mercato.deadline':        { key: 'mercato.deadline',        parent: 'mercato', labelAr: 'الحسم والموعد' },
  'mercato.medical_final':   { key: 'mercato.medical_final',   parent: 'mercato', labelAr: 'الفحص والخطوات الأخيرة' },
  // Match subgroups
  'match.scoreboards':       { key: 'match.scoreboards',       parent: 'match', labelAr: 'سكور بورد' },
  'match.stats':             { key: 'match.stats',             parent: 'match', labelAr: 'إحصائيات المباراة' },
  // Player subgroups
  'player.profile':          { key: 'player.profile',          parent: 'player', labelAr: 'بطاقات لاعب' },
  'player.intel':            { key: 'player.intel',            parent: 'player', labelAr: 'استخبارات تحليلية' },
  'player.h2h':              { key: 'player.h2h',              parent: 'player', labelAr: 'مقارنة لاعبين' },
  // Newsroom subgroups
  'newsroom.breaking':       { key: 'newsroom.breaking',       parent: 'newsroom', labelAr: 'خبر عاجل' },
  'newsroom.smart_news':     { key: 'newsroom.smart_news',     parent: 'newsroom', labelAr: 'أخبار ذكية' },
  'newsroom.lower_thirds':   { key: 'newsroom.lower_thirds',   parent: 'newsroom', labelAr: 'أسماء سفلية' },
  // Social & Stream subgroups
  'social.sponsors':         { key: 'social.sponsors',         parent: 'social_stream', labelAr: 'رعاة' },
  'social.viewers':          { key: 'social.viewers',          parent: 'social_stream', labelAr: 'متفاعلون' },
  'social.guests':           { key: 'social.guests',           parent: 'social_stream', labelAr: 'ضيوف' },
  'social.alerts':           { key: 'social.alerts',           parent: 'social_stream', labelAr: 'تنبيهات' },
  // Utilities
  'utilities.elections':     { key: 'utilities.elections',     parent: 'utilities', labelAr: 'انتخابات' },
  'utilities.episode':       { key: 'utilities.episode',       parent: 'utilities', labelAr: 'حلقة اليوم' },
  'utilities.misc':          { key: 'utilities.misc',          parent: 'utilities', labelAr: 'متفرقة' },
  // Legacy
  'legacy.classic':          { key: 'legacy.classic',          parent: 'legacy', labelAr: 'قوالب كلاسيكية' },
};

/**
 * OverlayType → (category, subcategory) mapping.
 * Defaults to legacy.classic for any future type that forgets to register.
 */
export const TYPE_TO_TAXONOMY: Partial<Record<OverlayType, { category: CategoryKey; subcategory: string; priority: number }>> = {
  // Mercato — new unified family
  [OverlayType.MERCATO_UNIFIED]:        { category: 'mercato', subcategory: 'mercato.agents_sources', priority: 10 },
  // Mercato — original innovative pack
  [OverlayType.MERCATO_AGENT_CALL]:     { category: 'mercato', subcategory: 'mercato.agents_sources', priority: 20 },
  [OverlayType.MERCATO_DEAL_TIMELINE]:  { category: 'mercato', subcategory: 'mercato.deal_analysis',  priority: 30 },
  [OverlayType.MERCATO_BUDGET_TRACKER]: { category: 'mercato', subcategory: 'mercato.deal_analysis',  priority: 40 },
  [OverlayType.MERCATO_DEADLINE_DAY]:   { category: 'mercato', subcategory: 'mercato.deadline',       priority: 20 },
  [OverlayType.MERCATO_X_RAY]:          { category: 'mercato', subcategory: 'mercato.deal_analysis',  priority: 50 },
  [OverlayType.BREAKING_HERE_WE_GO]:    { category: 'mercato', subcategory: 'mercato.breaking',       priority: 10 },
  [OverlayType.TRANSFER_NEWS]:          { category: 'mercato', subcategory: 'mercato.breaking',       priority: 20 },
  [OverlayType.TRANSFER_TARGETS]:       { category: 'mercato', subcategory: 'mercato.deal_analysis',  priority: 60 },
  // Match
  [OverlayType.SCOREBOARD]:             { category: 'match', subcategory: 'match.scoreboards', priority: 10 },
  [OverlayType.MATCH_STATS]:            { category: 'match', subcategory: 'match.stats',       priority: 10 },
  [OverlayType.FOOTBALL_PACKAGE]:       { category: 'match', subcategory: 'match.scoreboards', priority: 20 },
  // Player
  [OverlayType.PLAYER_INTEL_V2]:        { category: 'player', subcategory: 'player.intel',   priority: 10 },
  [OverlayType.PLAYER_STATS]:           { category: 'player', subcategory: 'player.profile', priority: 20 },
  [OverlayType.PLAYER_PROFILE]:         { category: 'player', subcategory: 'player.profile', priority: 30 },
  [OverlayType.H2H_STATS]:              { category: 'player', subcategory: 'player.h2h',     priority: 40 },
  [OverlayType.BARCA_PREMIUM]:          { category: 'player', subcategory: 'player.profile', priority: 50 },
  // Newsroom
  [OverlayType.SMART_NEWS]:             { category: 'newsroom', subcategory: 'newsroom.smart_news',   priority: 10 },
  [OverlayType.EXCLUSIVE_ALERT]:        { category: 'newsroom', subcategory: 'newsroom.breaking',     priority: 10 },
  [OverlayType.ALERT]:                  { category: 'newsroom', subcategory: 'newsroom.breaking',     priority: 20 },
  [OverlayType.LOWER_THIRD]:            { category: 'newsroom', subcategory: 'newsroom.lower_thirds', priority: 10 },
  [OverlayType.TICKER]:                 { category: 'newsroom', subcategory: 'newsroom.lower_thirds', priority: 20 },
  // Social & Stream
  [OverlayType.LEADERBOARD]:            { category: 'social_stream', subcategory: 'social.sponsors', priority: 10 },
  [OverlayType.TOP_VIEWERS]:            { category: 'social_stream', subcategory: 'social.viewers',  priority: 10 },
  [OverlayType.GUESTS]:                 { category: 'social_stream', subcategory: 'social.guests',   priority: 10 },
  [OverlayType.SOCIAL_MEDIA]:           { category: 'social_stream', subcategory: 'social.viewers',  priority: 20 },
  // Utilities
  [OverlayType.ELECTION]:               { category: 'utilities', subcategory: 'utilities.elections', priority: 10 },
  [OverlayType.TODAYS_EPISODE]:         { category: 'utilities', subcategory: 'utilities.episode',   priority: 10 },
  [OverlayType.UCL_DRAW]:               { category: 'utilities', subcategory: 'utilities.misc',      priority: 10 },
};

export interface TaxonomyEntry {
  category: CategoryKey;
  subcategory: string;
  priority: number;
  isLegacy: boolean;
}

export function getTaxonomy(type: OverlayType, templateId?: string): TaxonomyEntry {
  const direct = TYPE_TO_TAXONOMY[type];
  if (direct) return { ...direct, isLegacy: false };
  return { category: 'legacy', subcategory: 'legacy.classic', priority: 999, isLegacy: true };
}

export function listSubcategoriesFor(category: CategoryKey): SubcategoryDef[] {
  return Object.values(SUBCATEGORIES).filter(s => s.parent === category);
}

export function listCategories(): CategoryDef[] {
  return Object.values(CATEGORIES).sort((a, b) => a.order - b.order);
}
