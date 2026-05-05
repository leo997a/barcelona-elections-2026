
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
  PLAYER_PROFILE = 'PLAYER_PROFILE'
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
  usdAmount: number;
  timestamp: number;
}

export interface Sponsor {
  id: string;
  name: string;
  amount: number;
  currency: string;
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
