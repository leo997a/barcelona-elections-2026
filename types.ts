
export enum OverlayType {
  SCOREBOARD = 'SCOREBOARD',
  LOWER_THIRD = 'LOWER_THIRD',
  TICKER = 'TICKER',
  ALERT = 'ALERT',
  SMART_NEWS = 'SMART_NEWS',
  LEADERBOARD = 'LEADERBOARD',
  EXCLUSIVE_ALERT = 'EXCLUSIVE_ALERT',
  GUESTS = 'GUESTS',
  UCL_DRAW = 'UCL_DRAW',
  ELECTION = 'ELECTION',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  TODAYS_EPISODE = 'TODAYS_EPISODE',
  PLAYER_PROFILE = 'PLAYER_PROFILE',
  TOP_VIEWERS = 'TOP_VIEWERS',
  FOOTBALL_PACKAGE = 'FOOTBALL_PACKAGE',
  H2H_STATS = 'H2H_STATS',
  TRANSFER_NEWS = 'TRANSFER_NEWS',
  BARCA_PREMIUM = 'BARCA_PREMIUM',
  MATCH_STATS = 'MATCH_STATS',
  PLAYER_STATS = 'PLAYER_STATS',
  TRANSFER_TARGETS = 'TRANSFER_TARGETS',
  BREAKING_HERE_WE_GO = 'BREAKING_HERE_WE_GO',
  MERCATO_AGENT_CALL = 'MERCATO_AGENT_CALL',
  MERCATO_DEAL_TIMELINE = 'MERCATO_DEAL_TIMELINE',
  MERCATO_BUDGET_TRACKER = 'MERCATO_BUDGET_TRACKER',
  MERCATO_DEADLINE_DAY = 'MERCATO_DEADLINE_DAY',
  MERCATO_X_RAY = 'MERCATO_X_RAY',
  PLAYER_INTEL_V2 = 'PLAYER_INTEL_V2',
  MERCATO_MEDIA_STORY = 'MERCATO_MEDIA_STORY',
  // AUDIO-PACKS-X5 / MERCATO-TEMPLATES-X6 — 10 new mercato variants
  // (rendered by a single MercatoUnifiedRenderer that branches on the
  // mercatoVariant field; all share the broadcast control + audio infra).
  MERCATO_UNIFIED = 'MERCATO_UNIFIED',
  // Mondial 2026
  MONDIAL_LIVE = 'MONDIAL_LIVE',
  MONDIAL_STATS = 'MONDIAL_STATS',
  MONDIAL_RESULTS = 'MONDIAL_RESULTS',
  MONDIAL_QUOTES = 'MONDIAL_QUOTES',
  MONDIAL_REPORTS = 'MONDIAL_REPORTS',
  MONDIAL_ANALYSIS = 'MONDIAL_ANALYSIS',
  MONDIAL_STARS = 'MONDIAL_STARS',
  MONDIAL_IRAQ = 'MONDIAL_IRAQ'
}

export type OverlayStatus = 'LIVE' | 'PREVIEW' | 'HIDDEN';

export interface SelectOption {
  label: string;
  value: string;
}

export interface OverlayField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'image' | 'image-list' | 'boolean' | 'textarea' | 'select' | 'hidden' | 'range';
  value: string | number | boolean | string[];
  options?: Array<string | SelectOption>; // For select type
  min?: number; // For range/number type
  max?: number; // For range/number type
  step?: number; // For range/number type
}

export interface OverlayConfig {
  id: string;
  name: string;
  type: OverlayType;
  templateId?: string;
  templateDescription?: string;
  templateIcon?: string;
  templateAccent?: string;
  templateGroup?: string;
  ownerStudioId?: string;
  fields: OverlayField[];
  slots: Record<string, OverlayField[]>; // Map slot name to field values
  activeSlot?: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string; // usually transparent or chroma
    fontFamily: string;
  };
  isVisible: boolean; // This effectively acts as the 'LIVE' status switch
  createdAt?: number;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId?: string;
  messagingSenderId?: string;
  storageBucket?: string;
  measurementId?: string;
}

export interface SecureSyncConfig extends FirebaseWebConfig {
  provider: 'firebase';
  studioId: string;
  stateAccessKey: string;
  controlAccessKey: string;
  updatedAt: number;
}

export type SyncStatus = 'local' | 'connecting' | 'secure' | 'error';

export type ActionCommand =
  | { action: 'toggle_visible'; targetId: string }
  | { action: 'set_visible'; targetId: string; value: boolean }
  | { action: 'update_field'; targetId: string; fieldId: string; value: unknown }
  | { action: 'increment_field'; targetId: string; fieldId: string; amount: number }
  | { action: 'load_slot'; targetId: string; slotName: string };

export interface SmartNewsContent {
  title: string;
  pages: string[];
}

export interface GeneratedContent {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
}

export interface DonationEntry {
  id: string;
  amount: number;
  currency: string;
  countryCode?: string;
  usdAmount: number;
  timestamp: number;
}

export interface Sponsor {
  id: string;
  name: string;
  amount: number;
  currency: string;
  countryCode?: string;
  usdAmount: number; // Calculated field for sorting
  avatar?: string;
  history: DonationEntry[];
}

export interface SystemStats {
  activeOverlays: number;
  uptime: string;
  connectionStatus: 'connected' | 'disconnected';
  fps: number;
}
