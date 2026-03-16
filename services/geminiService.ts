import { GeneratedContent, SmartNewsContent } from '../types';

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
  callSecureAi<GeneratedContent>({
    action: 'match-data',
    sport,
  });

export const processSmartText = async (
  rawText: string,
  targetPages: number = 6
): Promise<SmartNewsContent | null> =>
  callSecureAi<SmartNewsContent>({
    action: 'smart-text',
    rawText,
    targetPages,
  });
