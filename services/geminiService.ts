
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedContent, SmartNewsContent } from "../types";

// --- API KEY MANAGEMENT ---

const getApiKey = (): string => {
    // 1. Try Environment Variables first
    try {
        if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
    } catch (e) {}

    // 2. Use Embedded Key (Base64 Encoded)
    // Key: AIzaSyAM544JOb2t6W_4n43zdkuCLPYvuXgUugQ
    const EMBEDDED_KEY_B64 = "QUl6YVN5QU01NDRKT2IydDZXXzRuNDN6ZGt1Q0xQWXZ1WGdVdWdR";
    
    try {
        const decoded = atob(EMBEDDED_KEY_B64);
        if (decoded.startsWith("AIza")) return decoded;
    } catch (e) {
        console.error("Failed to decode embedded key");
    }
    return "";
};

let aiClient: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
    if (aiClient) return aiClient;
    
    const key = getApiKey();
    if (!key) {
        console.error("❌ Gemini API Key is missing or invalid.");
        return null;
    }
    
    try {
        aiClient = new GoogleGenAI({ apiKey: key });
        return aiClient;
    } catch (e) {
        console.error("❌ Failed to initialize GoogleGenAI client:", e);
        return null;
    }
};

// Helper: Clean JSON markdown from response
const cleanJsonOutput = (text: string): string => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const generateMatchData = async (sport: string): Promise<GeneratedContent | null> => {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate realistic match data for a ${sport} game between two famous teams from Saudi Arabia. Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            homeTeam: { type: Type.STRING },
            awayTeam: { type: Type.STRING },
            homeScore: { type: Type.INTEGER },
            awayScore: { type: Type.INTEGER },
            period: { type: Type.STRING }
          },
          required: ["homeTeam", "awayTeam", "homeScore", "awayScore", "period"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(cleanJsonOutput(response.text)) as GeneratedContent;
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message && (error.message.includes('HTTP2') || error.message.includes('fetch'))) {
        alert("⚠️ تنبيه: فشل الاتصال بخوادم Google.\n\nغالباً ما يكون السبب برنامج حماية (مثل Kaspersky/ESET) يقوم بمنع الاتصال.\nحاول إيقاف فحص HTTPS مؤقتاً.");
    }
  }
  return null;
};

export const processSmartText = async (rawText: string, targetPages: number = 6): Promise<SmartNewsContent | null> => {
  const ai = getAI();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            pages: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }
            }
          },
          required: ["title", "pages"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(cleanJsonOutput(response.text)) as SmartNewsContent;
      if (data.title && Array.isArray(data.pages)) {
          return data;
      }
    }
  } catch (error) {
     console.error("Gemini API Error:", error);
     return null;
  }
  return null;
}
