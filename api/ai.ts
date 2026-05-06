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
  text.replace(/\x60\x60\x60json/g, '').replace(/\x60\x60\x60/g, '').trim();

const MODEL = 'gemini-1.5-flash';

// Helper to call raw Google Gemini API directly
async function callGeminiRaw(apiKey: string, contents: any[]) {
  const url = \https://generativelanguage.googleapis.com/v1beta/models/\:generateContent?key=\\;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(\Google API Error \: \\);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from Gemini API.');
  return text;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST', { error: 'ÇáØÑíŞÉ ÛíÑ ãÏÚæãÉ.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'ÎÏãÉ ÇáĞßÇÁ ÇáÇÕØäÇÚí ÛíÑ ãİÚáÉ. ÃÖİ GEMINI_API_KEY Åáì ÇáÈíÆÉ.',
    });
  }

  const body = await readJsonBody<AiRequestBody>(req).catch(() => null);
  if (!body?.action) return sendJson(res, 400, { error: 'äæÚ ÇáØáÈ ÛíÑ ãæÌæÏ.' });

  try {
    // ?? MATCH DATA ?????????????????????????????????????????????????????????
    if (body.action === 'match-data') {
      const sport = body.sport?.trim();
      if (!sport) return sendJson(res, 400, { error: 'ÇÓã ÇáÑíÇÖÉ ãØáæÈ.' });

      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{ text: \Generate realistic match data for a \ game between two famous teams from Saudi Arabia. \nReturn ONLY pure JSON in this exact format: {"homeTeam":"Team A","awayTeam":"Team B","homeScore":2,"awayScore":1,"period":"90'"}\ }]
        }
      ]);
      return sendJson(res, 200, { data: JSON.parse(cleanJsonOutput(text)) });
    }

    // ?? SMART TEXT ?????????????????????????????????????????????????????????
    if (body.action === 'smart-text') {
      const rawText = body.rawText?.trim();
      if (!rawText) return sendJson(res, 400, { error: 'ÇáäÕ ÇáÎÇã ãØáæÈ.' });
      const targetPages = Math.min(Math.max(Number(body.targetPages) || 6, 1), 10);

      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{ text: \Role: Expert TV Broadcast Editor.\nTask: Convert the Arabic text into exactly \ slides for a news overlay.\nRequirements:\n1. Extract a concise headline.\n2. Split into EXACTLY \ slides (15-25 words each).\n3. Do NOT remove names, dates, or numbers.\nReturn ONLY pure JSON in this exact format: {"title":"Short Headline","pages":["Slide 1 text", "Slide 2 text"]}\n\nText: "\"\ }]
        }
      ]);
      return sendJson(res, 200, { data: JSON.parse(cleanJsonOutput(text)) });
    }

    // ?? VIEWER BADGES ??????????????????????????????????????????????????????
    if (body.action === 'viewer-badges') {
      const viewers = body.viewers || [];
      const channelName = body.channelName || 'REO LIVE';
      if (!viewers.length) return sendJson(res, 400, { error: 'íáÒã æÌæÏ ŞÇÆãÉ ãÊİÇÚáíä.' });

      const list = viewers.map(v => \ÇáãÑÊÈÉ \: \\).join('\n');
      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{ text: \ÃäÊ ÎÈíÑ İí ãÌÊãÚÇÊ ÇáÈË ÇáãÈÇÔÑ áŞäÇÉ "\".\nÃÚØö æÓÇãğÇ ŞÕíÑğÇ (1-4 ßáãÇÊ ÚÑÈíÉ + ÅíãæÌí) áßá ãÊİÇÚá ÍÓÈ ãÑÊÈÊå:\n\\nÃÚÏ İŞØ JSON ÈÇáÕíÛÉ ÇáÏŞíŞÉ ÇáÊÇáíÉ ÈÏæä Ãí äÕ ÅÖÇİí: {"items": [{"rank":1,"badge":"?? ãáß ÇáÈË"}, ...]}\ }]
        }
      ]);
      const parsed = JSON.parse(cleanJsonOutput(text));
      return sendJson(res, 200, { data: parsed.items ?? parsed });
    }

    // ?? EXTRACT VIEWERS FROM SCREENSHOTS (Vision) ??????????????????????????
    if (body.action === 'extract-viewers') {
      const images = body.images || [];
      if (!images.length) return sendJson(res, 400, { error: 'íáÒã ÅÑÓÇá ÕæÑÉ æÇÍÏÉ Úáì ÇáÃŞá.' });

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
            { text: \ÃäÊ ãÍáá ãÌÊãÚÇÊ ÈË ãÈÇÔÑ. åĞå áŞØÇÊ ÔÇÔÉ ÈË.\nÇÓÊÎÑÌ ÃÈÑÒ ÇáãÊİÇÚáíä (ÃÓãÇÁ ÇáãÓÊÎÏãíä ÇáÙÇåÑÉ İí ÇáÔÇÔÉ).\nÑÊøÈåã ÍÓÈ ÊßÑÇÑ ÇáÙåæÑ.\náßá ãÊİÇÚá: rank (íÈÏÃ ãä 1), name (ÇÓã ÇáãÓÊÎÏã), badge (æÓÇã ÚÑÈí + ÅíãæÌí ãäÇÓÈ).\nÃÚÏ İŞØ JSON ÈÇáÕíÛÉ ÇáÏŞíŞÉ ÇáÊÇáíÉ ÈÏæä Ãí äÕ ÅÖÇİí: {"items": [{"rank":1,"name":"ÇÓã_ÇáãÓÊÎÏã","badge":"?? ãáß ÇáÈË"}, ...]}\ },
            ...imageParts,
          ],
        }
      ]);
      const parsed = JSON.parse(cleanJsonOutput(text));
      return sendJson(res, 200, { data: parsed.items ?? parsed });
    }

    return sendJson(res, 400, { error: 'äæÚ ÇáØáÈ ÛíÑ ãÚÑæİ.' });

  } catch (err: any) {
    console.error('AI route error:', err);
    return sendJson(res, 500, { error: 'ÊÚĞÑ ÅßãÇá ØáÈ ÇáĞßÇÁ ÇáÇÕØäÇÚí: ' + (err?.message || 'ÎØÃ ÛíÑ ãÚÑæİ') });
  }
}
