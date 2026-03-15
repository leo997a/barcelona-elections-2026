
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
  ELECTION = 'ELECTION'
}

export type OverlayStatus = 'LIVE' | 'PREVIEW' | 'HIDDEN';

export interface OverlayField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'image' | 'image-list' | 'boolean' | 'textarea' | 'select' | 'hidden' | 'range';
  value: string | number | boolean | string[];
  options?: string[]; // For select type
  min?: number; // For range/number type
  max?: number; // For range/number type
  step?: number; // For range/number type
}

export interface OverlayConfig {
  id: string;
  name: string;
  type: OverlayType;
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
