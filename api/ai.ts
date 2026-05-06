import { GoogleGenAI, Type } from '@google/genai';
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';

interface AiRequestBody {
  action?: 'match-data' | 'smart-text' | 'viewer-badges' | 'extract-viewers';
  sport?: string;
  rawText?: string;
  targetPages?: number;
  viewers?: { name: string; rank: number }[];
  channelName?: string;
  images?: string[]; // base64 images for Vision
}

const cleanJsonOutput = (text: string): string =>
  text.replace(/```json/g, '').replace(/```/g, '').trim();

const MODEL = 'gemini-1.5-flash';

// Wrap array schema in object to satisfy Gemini structured output constraints
const arrSchema = (props: Record<string, unknown>, required: string[]) => ({
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: props, required },
    },
  },
  required: ['items'],
});

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST', { error: 'الطريقة غير مدعومة.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'خدمة الذكاء الاصطناعي غير مفعلة. أضف GEMINI_API_KEY إلى البيئة.',
    });
  }

  const body = await readJsonBody<AiRequestBody>(req).catch(() => null);
  if (!body?.action) return sendJson(res, 400, { error: 'نوع الطلب غير موجود.' });

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1' }
  });

  try {
    // ── MATCH DATA ─────────────────────────────────────────────────────────
    if (body.action === 'match-data') {
      const sport = body.sport?.trim();
      if (!sport) return sendJson(res, 400, { error: 'اسم الرياضة مطلوب.' });

      const result = await ai.models.generateContent({
        model: MODEL,
        contents: `Generate realistic match data for a ${sport} game between two famous teams from Saudi Arabia. 
Return ONLY pure JSON in this exact format: {"homeTeam":"Team A","awayTeam":"Team B","homeScore":2,"awayScore":1,"period":"90'"}`
      });

      if (!result.text) return sendJson(res, 502, { error: 'لم يعد الذكاء الاصطناعي أي بيانات.' });
      return sendJson(res, 200, { data: JSON.parse(cleanJsonOutput(result.text)) });
    }

    // ── SMART TEXT ─────────────────────────────────────────────────────────
    if (body.action === 'smart-text') {
      const rawText = body.rawText?.trim();
      if (!rawText) return sendJson(res, 400, { error: 'النص الخام مطلوب.' });
      const targetPages = Math.min(Math.max(Number(body.targetPages) || 6, 1), 10);

      const result = await ai.models.generateContent({
        model: MODEL,
        contents: `
Role: Expert TV Broadcast Editor.
Task: Convert the Arabic text into exactly ${targetPages} slides for a news overlay.
Requirements:
1. Extract a concise headline.
2. Split into EXACTLY ${targetPages} slides (15-25 words each).
3. Do NOT remove names, dates, or numbers.
Return ONLY pure JSON in this exact format: {"title":"Short Headline","pages":["Slide 1 text", "Slide 2 text"]}

Text: "${rawText}"`
      });

      if (!result.text) return sendJson(res, 502, { error: 'لم يعد الذكاء الاصطناعي أي نص.' });
      return sendJson(res, 200, { data: JSON.parse(cleanJsonOutput(result.text)) });
    }

    // ── VIEWER BADGES ──────────────────────────────────────────────────────
    if (body.action === 'viewer-badges') {
      const viewers = body.viewers || [];
      const channelName = body.channelName || 'REO LIVE';
      if (!viewers.length) return sendJson(res, 400, { error: 'يلزم وجود قائمة متفاعلين.' });

      const list = viewers.map(v => `المرتبة ${v.rank}: ${v.name}`).join('\n');

      const result = await ai.models.generateContent({
        model: MODEL,
        contents: `أنت خبير في مجتمعات البث المباشر لقناة "${channelName}".
أعطِ وسامًا قصيرًا (1-4 كلمات عربية + إيموجي) لكل متفاعل حسب مرتبته:
${list}
أعد فقط JSON بالصيغة الدقيقة التالية بدون أي نص إضافي: {"items": [{"rank":1,"badge":"👑 ملك البث"}, ...]}`
      });

      if (!result.text) return sendJson(res, 502, { error: 'فشل توليد الأوسمة.' });
      const parsed = JSON.parse(cleanJsonOutput(result.text));
      return sendJson(res, 200, { data: parsed.items ?? parsed });
    }

    // ── EXTRACT VIEWERS FROM SCREENSHOTS (Vision) ──────────────────────────
    if (body.action === 'extract-viewers') {
      const images = body.images || [];
      if (!images.length) return sendJson(res, 400, { error: 'يلزم إرسال صورة واحدة على الأقل.' });

      const imageParts = images.slice(0, 3).map((b64: string) => ({
        inlineData: {
          mimeType: 'image/jpeg' as const,
          data: b64.replace(/^data:image\/\w+;base64,/, ''),
        },
      }));

      const result = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `أنت محلل مجتمعات بث مباشر. هذه لقطات شاشة بث.
استخرج أبرز المتفاعلين (أسماء المستخدمين الظاهرة في الشاشة).
رتّبهم حسب تكرار الظهور.
لكل متفاعل: rank (يبدأ من 1), name (اسم المستخدم), badge (وسام عربي + إيموجي مناسب).
أعد فقط JSON بالصيغة الدقيقة التالية بدون أي نص إضافي: {"items": [{"rank":1,"name":"اسم_المستخدم","badge":"👑 ملك البث"}, ...]}`,
              },
              ...imageParts,
            ],
          },
        ]
      });

      if (!result.text) return sendJson(res, 502, { error: 'فشل استخراج المتفاعلين.' });
      const parsed = JSON.parse(cleanJsonOutput(result.text));
      return sendJson(res, 200, { data: parsed.items ?? parsed });
    }

    return sendJson(res, 400, { error: 'نوع الطلب غير معروف.' });

  } catch (err: any) {
    console.error('AI route error:', err);
    return sendJson(res, 500, { error: 'تعذر إكمال طلب الذكاء الاصطناعي: ' + (err?.message || 'خطأ غير معروف') });
  }
}
