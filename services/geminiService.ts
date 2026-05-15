import { GeneratedContent, OverlayType, SmartNewsContent } from '../types';

interface AiApiResponse<T> {
  data?: T;
  error?: string;
}

const callSecureAi = async <T>(payload: Record<string, unknown>): Promise<T | null> => {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => ({}))) as AiApiResponse<T>;
    if (!response.ok) {
      console.error('Secure AI request failed:', result.error || response.statusText);
      return null;
    }

    return result.data ?? null;
  } catch (error) {
    console.error('Secure AI request failed:', error);
    return null;
  }
};

export const generateMatchData = async (sport: string): Promise<GeneratedContent | null> =>
  callSecureAi<GeneratedContent>({ action: 'match-data', sport });

export const processSmartText = async (rawText: string, targetPages: number = 6): Promise<SmartNewsContent | null> =>
  callSecureAi<SmartNewsContent>({ action: 'smart-text', rawText, targetPages });

export const generateViewerBadges = async (
  viewers: { name: string; rank: number }[],
  channelName: string
): Promise<{ rank: number; badge: string }[] | null> =>
  callSecureAi<{ rank: number; badge: string }[]>({
    action: 'viewer-badges',
    viewers,
    channelName,
  });

export const extractViewersFromScreenshots = async (
  images: string[] // base64 strings
): Promise<{ rank: number; name: string; badge: string }[] | null> =>
  callSecureAi<{ rank: number; name: string; badge: string }[]>({
    action: 'extract-viewers',
    images,
  });

export type TemplateAssistResult = {
  title?: string;
  subtitle?: string;
  fields?: Record<string, string | number | boolean>;
  assetHints?: {
    playerName?: string;
    clubName?: string;
    fromClub?: string;
    toClub?: string;
  };
  notes?: string[];
};

export type PlayerTransferAssistResult = {
  playerName?: string;
  clubName?: string;
  position?: string;
  headline?: string;
  summary?: string;
  stats?: { label: string; value: string | number | null; hint?: string }[];
  fields?: Record<string, string | number | boolean>;
  imageQuery?: string;
  searchHints?: string[];
  sourceNotes?: string[];
};

export type PlayerStatsAssistResult = {
  playerName?: string;
  clubName?: string;
  position?: string;
  fields?: Record<string, string | number | boolean>;
  assetHints?: {
    playerName?: string;
    clubName?: string;
  };
  sourceNotes?: string[];
};

export const assistTemplateFields = async (payload: {
  rawText: string;
  overlayType: OverlayType;
  overlayName: string;
  currentFields: Record<string, unknown>;
  images?: string[];
}): Promise<TemplateAssistResult | null> =>
  callSecureAi<TemplateAssistResult>({
    action: 'template-assist',
    rawText: payload.rawText,
    overlayType: payload.overlayType,
    overlayName: payload.overlayName,
    templateType: payload.overlayType,
    currentFields: payload.currentFields,
    images: payload.images || [],
  });

export const assistPlayerTransferCard = async (payload: {
  rawText: string;
  playerName?: string;
  clubName?: string;
  currentFields: Record<string, unknown>;
}): Promise<PlayerTransferAssistResult | null> =>
  callSecureAi<PlayerTransferAssistResult>({
    action: 'player-transfer-card',
    rawText: payload.rawText,
    playerName: payload.playerName,
    clubName: payload.clubName,
    currentFields: payload.currentFields,
  });

export const assistPlayerStatsQuery = async (payload: {
  rawText: string;
  playerName?: string;
  clubName?: string;
  currentFields: Record<string, unknown>;
}): Promise<PlayerStatsAssistResult | null> =>
  callSecureAi<PlayerStatsAssistResult>({
    action: 'player-stats-query',
    rawText: payload.rawText,
    playerName: payload.playerName,
    clubName: payload.clubName,
    currentFields: payload.currentFields,
  });
