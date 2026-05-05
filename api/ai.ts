import { GoogleGenAI, Type } from '@google/genai';
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';

interface AiRequestBody {
  action?: 'match-data' | 'smart-text' | 'top-viewers' | 'viewer-badges';
  sport?: string;
  rawText?: string;
  targetPages?: number;
  viewers?: { name: string; rank: number }[];
  channelName?: string;
}

const cleanJsonOutput = (text: string): string =>
  text.replace(/```json/g, '').replace(/```/g, '').trim();

export default async function handler(request: ServerlessRequest, response: ServerlessResponse) {
  if (request.method !== 'POST') {
    return sendMethodNotAllowed(response, 'POST', {
      error: 'الطريقة غير مدعومة.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(response, 503, {
      error: 'خدمة الذكاء الاصطناعي غير مفعلة بعد. أضف GEMINI_API_KEY إلى البيئة أولاً.',
    });
  }

  const body = await readJsonBody<AiRequestBody>(request).catch(() => null);
  if (!body?.action) {
    return sendJson(response, 400, { error: 'نوع الطلب غير موجود.' });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    if (body.action === 'match-data') {
      const sport = body.sport?.trim();
      if (!sport) {
        return sendJson(response, 400, { error: 'اسم الرياضة مطلوب.' });
      }

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Generate realistic match data for a ${sport} game between two famous teams from Saudi Arabia. Return JSON.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              homeTeam: { type: Type.STRING },
              awayTeam: { type: Type.STRING },
              homeScore: { type: Type.INTEGER },
              awayScore: { type: Type.INTEGER },
              period: { type: Type.STRING },
            },
            required: ['homeTeam', 'awayTeam', 'homeScore', 'awayScore', 'period'],
          },
        },
      });

      if (!result.text) {
        return sendJson(response, 502, {
          error: 'لم يعد الذكاء الاصطناعي أي بيانات.',
        });
      }

      return sendJson(response, 200, {
        data: JSON.parse(cleanJsonOutput(result.text)),
      });
    }

    if (body.action === 'smart-text') {
      const rawText = body.rawText?.trim();
      if (!rawText) {
        return sendJson(response, 400, { error: 'النص الخام مطلوب.' });
      }

      const targetPages = Math.min(Math.max(Number(body.targetPages) || 6, 1), 10);
      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `
        Role: You are an expert TV Broadcast Editor and Scriptwriter.

        Task: Convert the provided raw Arabic text into a structured script for a news overlay.

        Strict Requirements:
        1. Extract a concise, catchy Headline.
        2. Split the body into EXACTLY ${targetPages} distinct slides (pages).
        3. INTEGRITY IS CRITICAL: Do NOT summarize heavily. Do NOT remove names, dates, numbers, or key details. The goal is distribution, not reduction.
        4. If the text is short, spread it out comfortably across the slides. If long, use all ${targetPages} slides efficiently.
        5. Each slide must be 15-25 words max for readability on screen.
        6. Return purely JSON.

        Raw Text:
        "${rawText}"
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              pages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'pages'],
          },
        },
      });

      if (!result.text) {
        return sendJson(response, 502, {
          error: 'لم يعد الذكاء الاصطناعي أي نص منظم.',
        });
      }

      return sendJson(response, 200, {
        data: JSON.parse(cleanJsonOutput(result.text)),
      });
    }

    return sendJson(response, 400, { error: 'نوع الطلب غير معروف.' });

    // ── TOP VIEWERS BADGES ──────────────────────────────────────────────────
    // (reached before the return above — restructure done in if-else chain)
  } catch (error) {
    console.error('Secure AI route failed', error);
    return sendJson(response, 500, { error: 'تعذر إكمال طلب الذكاء الاصطناعي.' });
  }
}
