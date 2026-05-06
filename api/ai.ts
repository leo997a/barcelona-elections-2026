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

const MODEL = 'gemini-2.0-flash-exp';

// Helper to call raw Google Gemini API directly using v1beta endpoint
async function callGeminiRaw(apiKey: string, contents: any[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });
  
  if (!response.ok) {
    const errText = await response.text();
    // If primary model fails, try fallback to gemini-1.5-pro
    if (response.status === 404) {
       const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
       const fbResp = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
       });
       if (fbResp.ok) {
          const fbData = await fbResp.json();
          return fbData.candidates?.[0]?.content?.parts?.[0]?.text;
       } else {
          const fbErrText = await fbResp.text();
          throw new Error(`Google API Fallback Error ${fbResp.status}: ${fbErrText}`);
       }
    }
    throw new Error(`Google API Error ${response.status}: ${errText}`);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from Gemini API.');
  return text;
}

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

  try {
    // ── MATCH DATA ─────────────────────────────────────────────────────────
    if (body.action === 'match-data') {
      const sport = body.sport?.trim();
      if (!sport) return sendJson(res, 400, { error: 'اسم الرياضة مطلوب.' });

      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{ text: `Generate realistic match data for a ${sport} game between two famous teams from Saudi Arabia. \nReturn ONLY pure JSON in this exact format: {"homeTeam":"Team A","awayTeam":"Team B","homeScore":2,"awayScore":1,"period":"90'"}` }]
        }
      ]);
      return sendJson(res, 200, { data: JSON.parse(cleanJsonOutput(text)) });
    }

    // ── SMART TEXT ─────────────────────────────────────────────────────────
    if (body.action === 'smart-text') {
      const rawText = body.rawText?.trim();
      if (!rawText) return sendJson(res, 400, { error: 'النص الخام مطلوب.' });
      const targetPages = Math.min(Math.max(Number(body.targetPages) || 6, 1), 10);

      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{ text: `Role: Expert TV Broadcast Editor.\nTask: Convert the Arabic text into exactly ${targetPages} slides for a news overlay.\nRequirements:\n1. Extract a concise headline.\n2. Split into EXACTLY ${targetPages} slides (15-25 words each).\n3. Do NOT remove names, dates, or numbers.\nReturn ONLY pure JSON in this exact format: {"title":"Short Headline","pages":["Slide 1 text", "Slide 2 text"]}\n\nText: "${rawText}"` }]
        }
      ]);
      return sendJson(res, 200, { data: JSON.parse(cleanJsonOutput(text)) });
    }

    // ── VIEWER BADGES ──────────────────────────────────────────────────────
    if (body.action === 'viewer-badges') {
      const viewers = body.viewers || [];
      const channelName = body.channelName || 'REO LIVE';
      if (!viewers.length) return sendJson(res, 400, { error: 'يلزم وجود قائمة متفاعلين.' });

      const list = viewers.map(v => `المرتبة ${v.rank}: ${v.name}`).join('\n');
      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{ text: `أنت خبير في مجتمعات البث المباشر لقناة "${channelName}".\nأعطِ وسامًا قصيرًا (1-4 كلمات عربية + إيموجي) لكل متفاعل حسب مرتبته:\n${list}\nأعد فقط JSON بالصيغة الدقيقة التالية بدون أي نص إضافي: {"items": [{"rank":1,"badge":"👑 ملك البث"}, ...]}` }]
        }
      ]);
      const parsed = JSON.parse(cleanJsonOutput(text));
      return sendJson(res, 200, { data: parsed.items ?? parsed });
    }

    // ── EXTRACT VIEWERS FROM SCREENSHOTS (Vision) ──────────────────────────
    if (body.action === 'extract-viewers') {
      const images = body.images || [];
      if (!images.length) return sendJson(res, 400, { error: 'يلزم إرسال صورة واحدة على الأقل.' });

      const imageParts = images.slice(0, 3).map((b64: string) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: b64.replace(/^data:image\/\w+;base64,/, ''),
        },
      }));

      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [
            { text: `أنت محلل مجتمعات بث مباشر. هذه لقطات شاشة بث.\nاستخرج أبرز المتفاعلين (أسماء المستخدمين الظاهرة في الشاشة).\nرتّبهم حسب تكرار الظهور.\nلكل متفاعل: rank (يبدأ من 1), name (اسم المستخدم), badge (وسام عربي + إيموجي مناسب).\nأعد فقط JSON بالصيغة الدقيقة التالية بدون أي نص إضافي: {"items": [{"rank":1,"name":"اسم_المستخدم","badge":"👑 ملك البث"}, ...]}` },
            ...imageParts,
          ],
        }
      ]);
      const parsed = JSON.parse(cleanJsonOutput(text));
      return sendJson(res, 200, { data: parsed.items ?? parsed });
    }

    return sendJson(res, 400, { error: 'نوع الطلب غير معروف.' });

  } catch (err: any) {
    console.error('AI route error:', err);
    return sendJson(res, 500, { error: 'تعذر إكمال طلب الذكاء الاصطناعي: ' + (err?.message || 'خطأ غير معروف') });
  }
}