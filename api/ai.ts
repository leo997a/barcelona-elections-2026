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
  images?: string[];
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

const uniqueModels = () => {
  const configured = process.env.GEMINI_MODEL?.trim();
  return Array.from(new Set([configured, ...FALLBACK_MODELS].filter(Boolean))) as string[];
};

const cleanJsonOutput = (text: string): string => {
  const stripped = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const objectStart = stripped.indexOf('{');
  const objectEnd = stripped.lastIndexOf('}');
  const arrayStart = stripped.indexOf('[');
  const arrayEnd = stripped.lastIndexOf(']');

  if (objectStart !== -1 && objectEnd > objectStart) return stripped.slice(objectStart, objectEnd + 1);
  if (arrayStart !== -1 && arrayEnd > arrayStart) return stripped.slice(arrayStart, arrayEnd + 1);
  return stripped;
};

const parseModelJson = <T>(text: string): T => JSON.parse(cleanJsonOutput(text)) as T;

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
};

const fallbackSlides = (rawText: string, targetPages: number): string[] => {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const sentences = normalized
    .split(/(?<=[.!؟?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

  const source = sentences.length >= targetPages ? sentences : normalized.match(/.{1,130}(\s|$)/g) || [normalized];
  const pages = source.map(page => page.trim()).filter(Boolean).slice(0, targetPages);
  while (pages.length < targetPages) pages.push(pages[pages.length - 1] || normalized || 'تحديث مباشر');
  return pages;
};

const normalizeSmartNews = (payload: unknown, rawText: string, targetPages: number) => {
  const value = payload as { title?: unknown; headline?: unknown; pages?: unknown };
  const pages = Array.isArray(value.pages)
    ? value.pages.map(page => String(page).trim()).filter(Boolean)
    : fallbackSlides(rawText, targetPages);

  const normalizedPages = pages.slice(0, targetPages);
  while (normalizedPages.length < targetPages) {
    normalizedPages.push(...fallbackSlides(rawText, targetPages - normalizedPages.length));
  }

  return {
    title: String(value.title || value.headline || 'ملخص البث').trim(),
    pages: normalizedPages.slice(0, targetPages),
  };
};

const fallbackMatchData = (sport = 'football') => ({
  homeTeam: sport.toLowerCase().includes('barcelona') ? 'Barcelona' : 'Home FC',
  awayTeam: 'Away FC',
  homeScore: 0,
  awayScore: 0,
  period: "45'",
});

const fallbackViewerBadges = (viewers: { name: string; rank: number }[]) => {
  const badges = ['نجم البث', 'صانع التفاعل', 'قلب المدرج', 'صوت الجمهور', 'داعم اللحظة'];
  return viewers.map((viewer, index) => ({
    rank: clampInteger(viewer.rank, index + 1, 1, 999),
    badge: badges[index % badges.length],
  }));
};

const sendLocalFallback = (
  response: ServerlessResponse,
  body: AiRequestBody,
  reason: string,
): boolean => {
  const warning = 'تم استخدام بديل محلي لأن خدمة Gemini غير متاحة حاليا.';

  if (body.action === 'match-data') {
    sendJson(response, 200, {
      data: fallbackMatchData(body.sport),
      fallback: true,
      warning,
    });
    return true;
  }

  if (body.action === 'smart-text') {
    const rawText = body.rawText?.trim();
    if (!rawText) return false;
    const targetPages = clampInteger(body.targetPages, 6, 1, 20);
    sendJson(response, 200, {
      data: normalizeSmartNews({ title: 'ملخص البث', pages: fallbackSlides(rawText, targetPages) }, rawText, targetPages),
      fallback: true,
      warning,
    });
    return true;
  }

  if (body.action === 'viewer-badges') {
    const viewers = body.viewers || [];
    if (!viewers.length) return false;
    sendJson(response, 200, {
      data: fallbackViewerBadges(viewers),
      fallback: true,
      warning,
    });
    return true;
  }

  if (body.action === 'extract-viewers') {
    sendJson(response, 200, {
      data: [],
      fallback: true,
      warning: `${warning} تعذر استخراج الأسماء من الصور بدون نموذج رؤية متاح.`,
    });
    return true;
  }

  console.warn('AI local fallback unavailable:', reason);
  return false;
};

const getInputError = (body: AiRequestBody): string | null => {
  if (body.action === 'smart-text' && !body.rawText?.trim()) return 'النص الخام مطلوب.';
  if (body.action === 'viewer-badges' && !(body.viewers || []).length) return 'يلزم وجود قائمة متفاعلين.';
  if (body.action === 'extract-viewers' && !(body.images || []).length) return 'يلزم إرسال صورة واحدة على الأقل.';
  return null;
};

async function callGeminiRaw(apiKey: string, contents: GeminiContent[], jsonMode = true) {
  const errors: string[] = [];

  for (const model of uniqueModels()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents,
      generationConfig: {
        temperature: 0.35,
        topP: 0.9,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      errors.push(`${model}: ${response.status} ${detail.slice(0, 220)}`);
      continue;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim();

    if (text) return text;
    errors.push(`${model}: empty response`);
  }

  if (jsonMode) {
    try {
      return await callGeminiRaw(apiKey, contents, false);
    } catch (fallbackError) {
      errors.push(fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
    }
  }

  throw new Error(`Gemini request failed. Tried ${uniqueModels().join(', ')}. ${errors.join(' | ')}`);
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST', { error: 'الطريقة غير مدعومة.' });
  }

  const body = await readJsonBody<AiRequestBody>(req).catch(() => null);
  if (!body?.action) return sendJson(res, 400, { error: 'نوع الطلب غير موجود.' });

  const inputError = getInputError(body);
  if (inputError) return sendJson(res, 400, { error: inputError });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (sendLocalFallback(res, body, 'GEMINI_API_KEY is not configured')) return;

    return sendJson(res, 503, {
      error: 'خدمة الذكاء الاصطناعي غير مفعلة. أضف GEMINI_API_KEY في متغيرات البيئة.',
    });
  }

  try {
    if (body.action === 'match-data') {
      const sport = body.sport?.trim() || 'football';
      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{
            text:
              `أنشئ بيانات افتراضية واقعية لقالب نتيجة بث مباشر في كرة القدم أو الرياضة التالية: ${sport}.\n` +
              'لا تستخدم معلومات مباشرة أو نتائج حقيقية. أعد JSON فقط بهذا الشكل:\n' +
              '{"homeTeam":"Team A","awayTeam":"Team B","homeScore":2,"awayScore":1,"period":"74:30"}',
          }],
        },
      ]);

      const parsed = parseModelJson<{
        homeTeam?: string;
        awayTeam?: string;
        homeScore?: number;
        awayScore?: number;
        period?: string;
      }>(text);

      return sendJson(res, 200, {
        data: {
          homeTeam: String(parsed.homeTeam || 'Home FC'),
          awayTeam: String(parsed.awayTeam || 'Away FC'),
          homeScore: clampInteger(parsed.homeScore, 0, 0, 20),
          awayScore: clampInteger(parsed.awayScore, 0, 0, 20),
          period: String(parsed.period || "45'"),
        },
      });
    }

    if (body.action === 'smart-text') {
      const rawText = body.rawText?.trim();
      if (!rawText) return sendJson(res, 400, { error: 'النص الخام مطلوب.' });

      const targetPages = clampInteger(body.targetPages, 6, 1, 20);
      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{
            text:
              'أنت محرر بث تلفزيوني رياضي عربي.\n' +
              `حوّل النص التالي إلى ${targetPages} شرائح بالضبط لقالب بث مباشر.\n` +
              'الشروط: عنوان قصير، جمل واضحة، لا تحذف الأسماء أو الأرقام أو التواريخ، ولا تضف معلومات من خارج النص.\n' +
              'أعد JSON فقط بهذا الشكل: {"title":"عنوان قصير","pages":["نص الشريحة 1","نص الشريحة 2"]}\n\n' +
              `النص:\n${rawText}`,
          }],
        },
      ]);

      return sendJson(res, 200, { data: normalizeSmartNews(parseModelJson(text), rawText, targetPages) });
    }

    if (body.action === 'viewer-badges') {
      const viewers = body.viewers || [];
      const channelName = body.channelName || 'REO LIVE';
      if (!viewers.length) return sendJson(res, 400, { error: 'يلزم وجود قائمة متفاعلين.' });

      const list = viewers.map(viewer => `المرتبة ${viewer.rank}: ${viewer.name}`).join('\n');
      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [{
            text:
              `أنت محرر مجتمع بث مباشر لقناة "${channelName}".\n` +
              'اكتب وساما قصيرا لكل متفاعل: من كلمتين إلى أربع كلمات عربية، بدون إساءة، ومناسب للبث.\n' +
              `${list}\n` +
              'أعد JSON فقط بهذا الشكل: {"items":[{"rank":1,"badge":"ملك البث"}, {"rank":2,"badge":"نجم التعليقات"}]}',
          }],
        },
      ]);

      const parsed = parseModelJson<{ items?: { rank: number; badge: string }[] } | { rank: number; badge: string }[]>(text);
      return sendJson(res, 200, { data: Array.isArray(parsed) ? parsed : parsed.items || [] });
    }

    if (body.action === 'extract-viewers') {
      const images = body.images || [];
      if (!images.length) return sendJson(res, 400, { error: 'يلزم إرسال صورة واحدة على الأقل.' });

      const imageParts: GeminiPart[] = images.slice(0, 3).map(image => ({
        inlineData: {
          mimeType: image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          data: image.replace(/^data:image\/\w+;base64,/, ''),
        },
      }));

      const text = await callGeminiRaw(apiKey, [
        {
          role: 'user',
          parts: [
            {
              text:
                'حلل لقطات شاشة من بث مباشر واستخرج أسماء المتفاعلين الظاهرة بوضوح فقط.\n' +
                'رتبهم حسب تكرار أو وضوح الظهور، وأضف وساما عربيا قصيرا مناسبا لكل اسم.\n' +
                'أعد JSON فقط بهذا الشكل: {"items":[{"rank":1,"name":"اسم المستخدم","badge":"نجم البث"}]}',
            },
            ...imageParts,
          ],
        },
      ]);

      const parsed = parseModelJson<{ items?: { rank: number; name: string; badge: string }[] }>(text);
      return sendJson(res, 200, { data: parsed.items || [] });
    }

    return sendJson(res, 400, { error: 'نوع الطلب غير معروف.' });
  } catch (err) {
    console.error('AI route error:', err);
    if (sendLocalFallback(res, body, err instanceof Error ? err.message : 'Unknown AI error')) return;

    return sendJson(res, 500, {
      error: 'تعذر إكمال طلب الذكاء الاصطناعي: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'),
    });
  }
}
