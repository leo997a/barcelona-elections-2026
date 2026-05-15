import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';

interface AiRequestBody {
  action?: 'match-data' | 'smart-text' | 'viewer-badges' | 'extract-viewers' | 'template-assist' | 'player-transfer-card' | 'player-stats-query';
  sport?: string;
  rawText?: string;
  targetPages?: number;
  viewers?: { name: string; rank: number }[];
  channelName?: string;
  images?: string[];
  templateType?: string;
  overlayType?: string;
  overlayName?: string;
  playerName?: string;
  clubName?: string;
  currentFields?: Record<string, unknown>;
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
const AI_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 25_000);

const uniqueModels = () => {
  const configured = process.env.GEMINI_MODEL?.trim();
  return Array.from(new Set([configured, ...FALLBACK_MODELS].filter(Boolean))) as string[];
};

const splitEnvList = (value?: string) => (value || '')
  .split(/[\n,]+/)
  .map(item => item.trim())
  .filter(Boolean);

const geminiApiKeys = () => {
  const numberedKeys = Array.from({ length: 12 }, (_, index) => {
    const n = index + 1;
    return [
      process.env[`GEMINI_API_KEY_${n}`],
      process.env[`GEMINI_API_KEY${n}`],
      process.env[`GEMINI_API_KEYS_${n}`],
      process.env[`GEMINI_API_KEYS${n}`],
    ];
  }).flat();

  return Array.from(new Set([
    process.env.GEMINI_API_KEY?.trim(),
    ...splitEnvList(process.env.GEMINI_API_KEYS),
    ...numberedKeys.map(key => key?.trim()),
  ].filter(Boolean))) as string[];
};

const liteLlmProxyUrl = () => process.env.LITELLM_PROXY_URL?.trim().replace(/\/+$/, '') || '';

const liteLlmModels = () => {
  const models = splitEnvList(process.env.LITELLM_MODELS);
  return models.length ? models : ['gemini/gemini-2.5-flash', 'gemini/gemini-2.5-flash-lite'];
};

const hasAiBackend = () => Boolean(liteLlmProxyUrl() || geminiApiKeys().length);

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = AI_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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

const normalizeArabicText = (text: string) => text
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
  .replace(/\u0629/g, '\u0647')
  .replace(/\u0649/g, '\u064A')
  .replace(/\s+/g, ' ')
  .trim();

const hasAnyTerm = (text: string, terms: string[]) => {
  const lower = text.toLowerCase();
  const normalized = normalizeArabicText(text);
  return terms.some(term => {
    const termLower = term.toLowerCase();
    const termNormalized = normalizeArabicText(term);
    return lower.includes(termLower) || Boolean(termNormalized && normalized.includes(termNormalized));
  });
};

const isWeakTextValue = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) return true;
  const normalized = normalizeArabicText(text);
  return /^(unknown|unknown player|unknown club|player|club|n\/a|na|null|undefined)$/i.test(text)
    || ['\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641', '\u0644\u0627\u0639\u0628', '\u0646\u0627\u062F\u064A'].includes(normalized);
};

const firstStrongString = (...values: unknown[]) => {
  for (const value of values) {
    if (!isWeakTextValue(value)) return String(value).trim();
  }
  return '';
};

const setFieldWhenWeak = (
  fields: Record<string, string | number | boolean>,
  key: string,
  value: string,
) => {
  if (value && isWeakTextValue(fields[key])) fields[key] = value;
};

const detectLocalPlayer = (text: string) => {
  const value = text.toLowerCase();
  if (/lewandowski/i.test(value) || hasAnyTerm(text, ['\u0644\u064A\u0641\u0627\u0646\u062F\u0648\u0641\u0633\u0643\u064A', '\u0631\u0648\u0628\u0631\u062A \u0644\u064A\u0641\u0627\u0646\u062F\u0648\u0641\u0633\u0643\u064A'])) {
    return { playerName: 'Robert Lewandowski', clubName: 'Barcelona', position: 'ST / Forward' };
  }
  if (/lamine yamal|yamal/i.test(value) || hasAnyTerm(text, ['\u0644\u0627\u0645\u064A\u0646 \u064A\u0627\u0645\u0627\u0644', '\u064A\u0627\u0645\u0627\u0644'])) {
    return { playerName: 'Lamine Yamal', clubName: 'Barcelona', position: 'RW / Forward' };
  }
  if (/pedri/i.test(value) || hasAnyTerm(text, ['\u0628\u064A\u062F\u0631\u064A'])) {
    return { playerName: 'Pedri', clubName: 'Barcelona', position: 'CM / AM' };
  }
  if (/cole palmer|palmer/i.test(value) || hasAnyTerm(text, ['\u0643\u0648\u0644 \u0628\u0627\u0644\u0645\u0631', '\u0628\u0627\u0644\u0645\u0631'])) {
    return { playerName: 'Cole Palmer', clubName: 'Chelsea', position: 'AM / RW' };
  }
  if (/enzo fernandez|enzo fern[aá]ndez/i.test(value) || hasAnyTerm(text, ['\u0627\u0646\u0632\u0648 \u0641\u064A\u0631\u0646\u0627\u0646\u062F\u064A\u0632', '\u0625\u0646\u0632\u0648 \u0641\u064A\u0631\u0646\u0627\u0646\u062F\u064A\u0632'])) {
    return { playerName: 'Enzo Fernandez', clubName: 'Chelsea', position: 'CM' };
  }
  if (/moises caicedo|mois[eé]s caicedo|caicedo/i.test(value) || hasAnyTerm(text, ['\u0643\u0627\u064A\u0633\u064A\u062F\u0648', '\u0645\u0648\u064A\u0633\u064A\u0633 \u0643\u0627\u064A\u0633\u064A\u062F\u0648'])) {
    return { playerName: 'Moises Caicedo', clubName: 'Chelsea', position: 'DM / CM' };
  }
  if (/lewandowski|ليفاندوفسكي|روبرت ليفاندوفسكي/i.test(value)) {
    return { playerName: 'Robert Lewandowski', clubName: 'Barcelona', position: 'ST / Forward' };
  }
  if (/lamine yamal|yamal|لامين يامال|يامال/i.test(value)) {
    return { playerName: 'Lamine Yamal', clubName: 'Barcelona', position: 'RW / Forward' };
  }
  if (/pedri|بيدري/i.test(value)) {
    return { playerName: 'Pedri', clubName: 'Barcelona', position: 'CM / AM' };
  }
  if (/cole palmer|palmer|كول بالمر|بالمر/i.test(value)) {
    return { playerName: 'Cole Palmer', clubName: 'Chelsea', position: 'AM / RW' };
  }
  if (/enzo fernandez|enzo fernández|انزو فيرنانديز|إنزو فيرنانديز/i.test(value)) {
    return { playerName: 'Enzo Fernandez', clubName: 'Chelsea', position: 'CM' };
  }
  if (/moises caicedo|moisés caicedo|caicedo|كايسيدو|مويسيس كايسيدو/i.test(value)) {
    return { playerName: 'Moises Caicedo', clubName: 'Chelsea', position: 'DM / CM' };
  }
  return null;
};

const detectLocalClub = (text: string) => {
  if (/barcelona|barca/i.test(text) || hasAnyTerm(text, ['\u0628\u0631\u0634\u0644\u0648\u0646\u0629', '\u0628\u0631\u0634\u0644\u0648\u0646\u0647', '\u0627\u0644\u0628\u0627\u0631\u0633\u0627'])) return 'Barcelona';
  if (/chelsea/i.test(text) || hasAnyTerm(text, ['\u062A\u0634\u064A\u0644\u0633\u064A'])) return 'Chelsea';
  if (/real madrid/i.test(text) || hasAnyTerm(text, ['\u0631\u064A\u0627\u0644 \u0645\u062F\u0631\u064A\u062F'])) return 'Real Madrid';
  if (/barcelona|barca|برشلونة|برشلونه|البارسا/i.test(text)) return 'Barcelona';
  if (/chelsea|تشيلسي/i.test(text)) return 'Chelsea';
  if (/real madrid|ريال مدريد/i.test(text)) return 'Real Madrid';
  return '';
};

const extractLocalPercent = (text: string) => {
  const match = text.match(/(?:بنسبة|احتمال|نسبة|probability|confidence|chance)\s*(\d{1,3})\s*%?|\b(\d{1,3})\s*(?:%|percent|per cent)\b/i);
  if (!match) return null;
  return clampInteger(match[1] || match[2], 65, 0, 100);
};

const hasLocalLeavingSignal = (text: string) => /مغادر|مغادرة|يرحل|رحيل|خروج|خارج|leav|exit|depart/i.test(text);
const hasLocalFreeSignal = (text: string) => /مجانا|مجاني|نهاية عقد|انتهاء عقد|free|contract|free agent/i.test(text);

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

  if (body.action === 'template-assist') {
    const rawText = body.rawText?.trim();
    if (!rawText) return false;
    const title = rawText.split(/[\n.؟!?]+/).map(part => part.trim()).filter(Boolean)[0]?.slice(0, 90) || 'AI STORY';
    const pages = fallbackSlides(rawText, 4);
    sendJson(response, 200, {
      data: {
        title,
        subtitle: rawText.slice(0, 160),
        fields: {
          headline: title,
          title,
          content: rawText,
          specialText: rawText,
          bodyText: rawText,
          pagesData: JSON.stringify(pages),
          currentPage: 0,
          rawText,
        },
        notes: ['local AI fallback'],
      },
      fallback: true,
      warning,
    });
    return true;
  }

  if (body.action === 'player-transfer-card') {
    const rawText = body.rawText?.trim() || '';
    const detected = detectLocalPlayer(`${body.playerName || ''} ${rawText}`) || {
      playerName: body.playerName?.trim() || 'Player',
      clubName: detectLocalClub(`${body.clubName || ''} ${rawText}`) || body.clubName?.trim() || 'Club',
      position: 'Footballer',
    };
    const clubName = detectLocalClub(`${body.clubName || ''} ${rawText}`) || detected.clubName;
    const confidence = extractLocalPercent(rawText) ?? 65;
    const freeStory = hasLocalFreeSignal(rawText);
    const leavingStory = hasLocalLeavingSignal(rawText);
    const fromClub = leavingStory ? clubName : String(body.currentFields?.fromClub || clubName || 'Source club');
    const toClub = leavingStory ? (freeStory ? 'Free agent' : 'Destination TBC') : String(body.currentFields?.toClub || clubName || 'Target club');
    const dealValue = freeStory ? 'Free transfer / end of contract' : String(body.currentFields?.dealValue || 'Market watch');
    const headline = leavingStory ? `${detected.playerName} EXIT WATCH` : `${detected.playerName} MARKET WATCH`;
    const marketItems = [{
      player: detected.playerName,
      from: fromClub,
      to: toClub,
      value: dealValue,
      confidence,
      status: freeStory ? 'Contract exit' : 'AI prepared',
      tag: leavingStory ? 'Exit watch' : 'Focus',
    }];

    sendJson(response, 200, {
      data: {
        playerName: detected.playerName,
        clubName,
        position: detected.position,
        headline,
        summary: rawText || `${detected.playerName} market update.`,
        imageQuery: detected.playerName,
        stats: [
          { label: 'Goals', value: 'غير متوفر', hint: 'Source needed' },
          { label: 'Shots / 90', value: 'غير متوفر', hint: 'Source needed' },
          { label: 'Key passes', value: 'غير متوفر', hint: 'Source needed' },
        ],
        fields: {
          playerName: detected.playerName,
          playerTeam: clubName,
          playerPosition: detected.position,
          fromClub,
          toClub,
          dealValue,
          confidence,
          headline,
          subheadline: rawText || `${clubName} transfer desk update.`,
          latestNews: rawText,
          marketItems: JSON.stringify(marketItems),
        },
        sourceNotes: ['local AI fallback'],
      },
      fallback: true,
      warning,
    });
    return true;
  }

  if (body.action === 'player-stats-query') {
    const rawText = body.rawText?.trim() || '';
    const detected = detectLocalPlayer(`${body.playerName || ''} ${rawText}`) || {
      playerName: body.playerName?.trim() || String(body.currentFields?.sourcePlayerName || body.currentFields?.playerAName || 'Player'),
      clubName: detectLocalClub(`${body.clubName || ''} ${rawText}`) || body.clubName?.trim() || String(body.currentFields?.sourceClubName || body.currentFields?.playerAClub || 'Club'),
      position: 'Footballer',
    };
    const clubName = detectLocalClub(`${body.clubName || ''} ${rawText}`) || detected.clubName;
    const stats = [
      { label: 'Goals', value: 'pending', hint: 'WhoScored season total', category: 'attack' },
      { label: 'Shots / 90', value: 'pending', hint: 'per-match volume', category: 'attack' },
      { label: 'Key passes', value: 'pending', hint: 'chance creation', category: 'passing' },
      { label: 'Recoveries', value: 'pending', hint: 'ball wins', category: 'defense' },
      { label: 'Successful dribbles', value: 'pending', hint: '1v1 output', category: 'possession' },
      { label: 'Minutes', value: 'pending', hint: 'season load', category: 'season' },
    ];
    const sourcePayload = {
      mode: String(body.currentFields?.playerStatsMode || 'SINGLE'),
      season: String(body.currentFields?.seasonLabel || '2025/26'),
      source: 'AI identity fallback + player bridge contract',
      updatedAt: new Date().toISOString(),
      players: [{
        name: detected.playerName,
        club: clubName,
        position: detected.position,
        stats,
      }],
    };

    sendJson(response, 200, {
      data: {
        playerName: detected.playerName,
        clubName,
        position: detected.position,
        fields: {
          sourcePlayerName: detected.playerName,
          sourceClubName: clubName,
          playerAName: detected.playerName,
          playerAClub: clubName,
          playerAPosition: detected.position,
          playerStatsJson: JSON.stringify(stats),
          playerStatsSourceJson: JSON.stringify(sourcePayload),
          headline: `${detected.playerName} DATA FILE`,
          subheadline: rawText || `${clubName} player statistics profile prepared for bridge extraction.`,
        },
        assetHints: {
          playerName: detected.playerName,
          clubName,
        },
        sourceNotes: ['local player stats fallback'],
      },
      fallback: true,
      warning,
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
  if (body.action === 'template-assist' && !body.rawText?.trim() && !(body.images || []).length) return 'أرسل نصا أو صورة ليقترح الذكاء محتوى القالب.';
  if (body.action === 'player-transfer-card' && !body.playerName?.trim() && !body.rawText?.trim()) return 'أدخل اسم اللاعب أو نص الخبر أولا.';
  if (body.action === 'player-stats-query' && !body.playerName?.trim() && !body.rawText?.trim()) return 'أدخل اسم اللاعب أو نص طلب الإحصائيات أولا.';
  return null;
};

const fieldManifest = (fields?: Record<string, unknown>) => {
  if (!fields) return 'لا توجد حقول مرسلة.';
  return Object.entries(fields)
    .slice(0, 90)
    .map(([id, value]) => `${id}: ${String(value ?? '').slice(0, 180)}`)
    .join('\n');
};

const safeJsonStringify = (value: unknown) => JSON.stringify(value, null, 0);

async function callGeminiRaw(contents: GeminiContent[], jsonMode = true) {
  const errors: string[] = [];

  for (const apiKey of geminiApiKeys()) {
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

      let response: Response;
      try {
        response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (error) {
        errors.push(`${model}: request failed ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        errors.push(`${model}: ${response.status} ${detail.slice(0, 220)}`);
        continue;
      }

      let data: any;
      try {
        data = await response.json();
      } catch (error) {
        errors.push(`${model}: invalid JSON ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const text = data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
        .trim();

      if (text) return text;
      errors.push(`${model}: empty response`);
    }
  }

  if (jsonMode) {
    try {
      return await callGeminiRaw(contents, false);
    } catch (fallbackError) {
      errors.push(fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
    }
  }

  throw new Error(`Gemini request failed. Tried ${uniqueModels().join(', ')}. ${errors.join(' | ')}`);
}

const toOpenAiMessages = (contents: GeminiContent[]) => contents.map(content => ({
  role: content.role === 'model' ? 'assistant' : 'user',
  content: content.parts.map(part => {
    if ('text' in part) return { type: 'text', text: part.text };
    return {
      type: 'image_url',
      image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
    };
  }),
}));

async function callLiteLlmRaw(contents: GeminiContent[], jsonMode = true) {
  const proxyUrl = liteLlmProxyUrl();
  if (!proxyUrl) throw new Error('LITELLM_PROXY_URL is not configured');

  const errors: string[] = [];
  const apiKey = process.env.LITELLM_API_KEY?.trim();

  for (const model of liteLlmModels()) {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: toOpenAiMessages(contents),
          temperature: 0.35,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
    } catch (error) {
      errors.push(`${model}: request failed ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      errors.push(`${model}: ${response.status} ${detail.slice(0, 220)}`);
      continue;
    }

    let data: any;
    try {
      data = await response.json();
    } catch (error) {
      errors.push(`${model}: invalid JSON ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const text = String(data.choices?.[0]?.message?.content || '').trim();
    if (text) return text;
    errors.push(`${model}: empty response`);
  }

  if (jsonMode) {
    try {
      return await callLiteLlmRaw(contents, false);
    } catch (fallbackError) {
      errors.push(fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
    }
  }

  throw new Error(`LiteLLM request failed. Tried ${liteLlmModels().join(', ')}. ${errors.join(' | ')}`);
}

async function callAiRaw(contents: GeminiContent[], jsonMode = true) {
  const errors: string[] = [];
  if (liteLlmProxyUrl()) {
    try {
      return await callLiteLlmRaw(contents, jsonMode);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (geminiApiKeys().length) {
    try {
      return await callGeminiRaw(contents, jsonMode);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.join(' | ') || 'No AI backend configured');
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST', { error: 'الطريقة غير مدعومة.' });
  }

  const body = await readJsonBody<AiRequestBody>(req).catch(() => null);
  if (!body?.action) return sendJson(res, 400, { error: 'نوع الطلب غير موجود.' });

  const inputError = getInputError(body);
  if (inputError) return sendJson(res, 400, { error: inputError });

  if (!hasAiBackend()) {
    if (sendLocalFallback(res, body, 'No AI backend is configured')) return;

    return sendJson(res, 503, {
      error: 'خدمة الذكاء الاصطناعي غير مفعلة. أضف GEMINI_API_KEY أو GEMINI_API_KEYS أو GEMINI_API_KEYS1/2/3 أو LITELLM_PROXY_URL في متغيرات البيئة.',
    });
  }

  try {
    if (body.action === 'match-data') {
      const sport = body.sport?.trim() || 'football';
      const text = await callAiRaw([
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
      const text = await callAiRaw([
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
      const text = await callAiRaw([
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

      const text = await callAiRaw([
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

    if (body.action === 'template-assist') {
      const rawText = body.rawText?.trim() || '';
      const templateType = body.templateType || body.overlayType || 'broadcast overlay';
      const overlayName = body.overlayName || templateType;
      const imageParts: GeminiPart[] = (body.images || []).slice(0, 2).map(image => ({
        inlineData: {
          mimeType: image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          data: image.replace(/^data:image\/\w+;base64,/, ''),
        },
      }));

      const text = await callAiRaw([
        {
          role: 'user',
          parts: [
            {
              text:
                'أنت مساعد إنتاج بث رياضي عربي داخل نظام قوالب مباشر. مهمتك تعبئة الحقول الحقيقية للقالب فقط، لا ترجع كلاما عاما.\n' +
                `نوع القالب: ${templateType}\nاسم القالب: ${overlayName}\n` +
                'القواعد:\n' +
                '- استخدم مفاتيح الحقول الموجودة في القائمة فقط، إلا هذه الحقول المسموحة للإثراء: playerImage, clubLogo, fromClubLogo, toClubLogo, leagueLogo, playerStatsJson, marketItems.\n' +
                '- إذا كان القالب أخبارا، قسّم عدة أخبار إلى صفحات قصيرة، واجعل pagesData عبارة عن JSON string لمصفوفة نصوص.\n' +
                '- إذا كان القالب ميركاتو أو بطاقة لاعب، املأ playerName/fromClub/toClub/headline/subheadline/playerStatsJson/marketItems عندما تكون مناسبة.\n' +
                '- لا تخترع نتيجة مباراة مباشرة. لا تضع إحصائيات رقمية مؤكدة إذا لم تكن في النص؛ يمكن وضع تقديرات تحريرية كنصوص مثل \"غير متوفر\".\n' +
                '- أعد JSON فقط بهذا الشكل: {"fields":{"fieldId":"value"},"title":"عنوان قصير","subtitle":"سطر داعم","assetHints":{"playerName":"...","clubName":"...","fromClub":"...","toClub":"..."},"notes":["تنبيه قصير"]}\n' +
                `الحقول الحالية:\n${fieldManifest(body.currentFields)}\n\n` +
                `المدخل:\n${rawText}`,
            },
            ...imageParts,
          ],
        },
      ]);

      const parsed = parseModelJson<{
        title?: string;
        subtitle?: string;
        labels?: string[];
        fields?: Record<string, string | number | boolean>;
        notes?: string[];
      }>(text);
      return sendJson(res, 200, { data: parsed });
    }

    if (body.action === 'player-stats-query') {
      const playerName = body.playerName?.trim() || '';
      const clubName = body.clubName?.trim() || '';
      const rawText = body.rawText?.trim() || '';
      const fieldContext = fieldManifest(body.currentFields);

      const text = await callAiRaw([
        {
          role: 'user',
          parts: [{
            text:
              'أنت وكيل إعداد بيانات كرة قدم لقالب إحصائيات لاعب. افهم اسم اللاعب العربي أو الإنجليزي والنادي، ثم جهز حقول البحث وجلب الصور والشعارات بدون اختراع أرقام مؤكدة.\n' +
              'المطلوب ليس تقييم rating. المطلوب فئات إحصائية قابلة للجلب: هجوم، تسديد، تمرير، صناعة، دفاع، استرجاع، مراوغات، متوسط لكل مباراة، إجمالي الموسم.\n' +
              'إذا لم تكن الأرقام موجودة في النص اكتب value: "pending" حتى يجلبها جسر WhoScored لاحقا.\n' +
              'أعد JSON فقط بهذا الشكل: {"playerName":"...","clubName":"...","position":"...","fields":{"sourcePlayerName":"...","sourceClubName":"...","playerAName":"...","playerAClub":"...","playerAPosition":"...","headline":"...","subheadline":"...","playerStatsJson":"...","playerStatsSourceJson":"..."},"assetHints":{"playerName":"...","clubName":"..."},"sourceNotes":["..."]}\n' +
              `الحقول الحالية:\n${fieldContext}\n\n` +
              `اسم اللاعب: ${playerName}\nالنادي: ${clubName}\nالنص:\n${rawText}`,
          }],
        },
      ]);

      const parsed = parseModelJson<{
        playerName?: string;
        clubName?: string;
        position?: string;
        fields?: Record<string, string | number | boolean>;
        assetHints?: { playerName?: string; clubName?: string };
        sourceNotes?: string[];
      }>(text);
      const fields = { ...(parsed.fields || {}) };
      const identityText = [
        playerName,
        clubName,
        rawText,
        fields.sourcePlayerName,
        fields.sourceClubName,
        fields.playerAName,
        fields.playerAClub,
      ].filter(Boolean).join(' ');
      const localPlayer = detectLocalPlayer(identityText);
      const localClub = detectLocalClub(identityText)
        || localPlayer?.clubName
        || firstStrongString(parsed.clubName, fields.sourceClubName, fields.playerAClub, clubName);
      const resolvedPlayerName = localPlayer?.playerName
        || firstStrongString(parsed.playerName, fields.sourcePlayerName, fields.playerAName, playerName);
      const resolvedPosition = localPlayer?.position
        || firstStrongString(parsed.position, fields.playerAPosition, 'Footballer');

      if (resolvedPlayerName) {
        parsed.playerName = String(resolvedPlayerName);
        setFieldWhenWeak(fields, 'sourcePlayerName', String(resolvedPlayerName));
        setFieldWhenWeak(fields, 'playerAName', String(resolvedPlayerName));
      }
      if (localClub) {
        parsed.clubName = String(localClub);
        setFieldWhenWeak(fields, 'sourceClubName', String(localClub));
        setFieldWhenWeak(fields, 'playerAClub', String(localClub));
      }
      if (resolvedPosition) {
        parsed.position = String(resolvedPosition);
        setFieldWhenWeak(fields, 'playerAPosition', String(resolvedPosition));
      }
      const stats = [
        { label: 'Goals', value: 'pending', hint: 'WhoScored season total', category: 'attack' },
        { label: 'Shots / 90', value: 'pending', hint: 'per-match volume', category: 'attack' },
        { label: 'Key passes', value: 'pending', hint: 'chance creation', category: 'passing' },
        { label: 'Recoveries', value: 'pending', hint: 'ball wins', category: 'defense' },
        { label: 'Successful dribbles', value: 'pending', hint: '1v1 output', category: 'possession' },
        { label: 'Minutes', value: 'pending', hint: 'season load', category: 'season' },
      ];
      fields.playerStatsJson = fields.playerStatsJson || JSON.stringify(stats);
      fields.playerStatsSourceJson = fields.playerStatsSourceJson || JSON.stringify({
        mode: String(body.currentFields?.playerStatsMode || 'SINGLE'),
        season: String(body.currentFields?.seasonLabel || '2025/26'),
        source: 'AI identity + player bridge contract',
        updatedAt: new Date().toISOString(),
        players: [{
          name: String(resolvedPlayerName || 'Player'),
          club: String(localClub || 'Club'),
          position: String(parsed.position || localPlayer?.position || ''),
          stats,
        }],
      });
      fields.headline = fields.headline || `${String(resolvedPlayerName || 'PLAYER').toUpperCase()} DATA FILE`;
      fields.subheadline = fields.subheadline || rawText || `${localClub || 'Club'} player statistics prepared for bridge extraction.`;

      return sendJson(res, 200, {
        data: {
          ...parsed,
          fields,
          assetHints: {
            ...(parsed.assetHints || {}),
            playerName: parsed.assetHints?.playerName || String(resolvedPlayerName || ''),
            clubName: parsed.assetHints?.clubName || String(localClub || ''),
          },
        },
      });
    }

    if (body.action === 'player-transfer-card') {
      const playerName = body.playerName?.trim() || '';
      const clubName = body.clubName?.trim() || '';
      const rawText = body.rawText?.trim() || '';
      const fieldContext = fieldManifest(body.currentFields);

      const text = await callAiRaw([
        {
          role: 'user',
          parts: [{
            text:
              'أنت محرر ميركاتو وتحليل لاعبين. افهم الاسم العربي أو الإنجليزي والنادي، ثم ابن حقول بطاقة لاعب/ميركاتو جاهزة للبث.\n' +
              'القواعد: لا تخترع أرقام موسم مؤكدة إذا لم تكن مذكورة. إذا غابت الإحصائيات أعد عناصر نصية آمنة أو \"غير متوفر\". لا تستخدم تقييم rating.\n' +
              'أعد JSON فقط بهذا الشكل: {"playerName":"...","clubName":"...","position":"...","headline":"...","summary":"...","stats":[{"label":"...","value":"...","hint":"..."}],"fields":{"playerName":"...","playerTeam":"...","playerPosition":"...","fromClub":"...","toClub":"...","headline":"...","subheadline":"...","playerStatsJson":"...","marketItems":"...","latestNews":"..."},"searchHints":["..."],"imageQuery":"...","sourceNotes":["..."]}\n' +
              `الحقول الحالية:\n${fieldContext}\n\n` +
              `اسم اللاعب: ${playerName}\nالنادي: ${clubName}\nالنص:\n${rawText}\n` +
              `صيغة playerStatsJson المطلوبة عند وجود stats: ${safeJsonStringify([{ label: 'Key passes', value: 'غير متوفر', hint: 'Source needed' }])}`,
          }],
        },
      ]);

      const parsed = parseModelJson<{
        playerName?: string;
        clubName?: string;
        position?: string;
        headline?: string;
        summary?: string;
        stats?: { label: string; value: string | number | null }[];
        fields?: Record<string, string | number | boolean>;
        searchHints?: string[];
        imageQuery?: string;
        sourceNotes?: string[];
      }>(text);
      const localPlayer = detectLocalPlayer(`${playerName} ${rawText}`);
      const localClub = detectLocalClub(`${clubName} ${rawText}`) || localPlayer?.clubName || parsed.clubName || clubName;
      const localConfidence = extractLocalPercent(rawText);
      const freeStory = hasLocalFreeSignal(rawText);
      const leavingStory = hasLocalLeavingSignal(rawText);
      const fields = { ...(parsed.fields || {}) };
      const resolvedPlayerName = localPlayer?.playerName || parsed.playerName || fields.playerName || playerName;
      const genericDestination = /غير محدد|unknown|destination|tbc/i.test(String(fields.toClub || ''));

      if (resolvedPlayerName) {
        parsed.playerName = String(resolvedPlayerName);
        fields.playerName = fields.playerName || String(resolvedPlayerName);
        parsed.imageQuery = parsed.imageQuery || String(resolvedPlayerName);
      }
      if (localClub) {
        parsed.clubName = String(localClub);
        fields.playerTeam = fields.playerTeam || String(localClub);
      }
      if (localPlayer?.position) {
        parsed.position = parsed.position || localPlayer.position;
        fields.playerPosition = fields.playerPosition || localPlayer.position;
      }
      if (localConfidence !== null) fields.confidence = localConfidence;
      if (freeStory) fields.dealValue = 'Free transfer / end of contract';
      if (leavingStory && localClub) {
        fields.fromClub = String(localClub);
        if (!fields.toClub || String(fields.toClub) === String(localClub) || genericDestination) {
          fields.toClub = freeStory ? 'Free agent' : 'Destination TBC';
        }
      }
      if (resolvedPlayerName && (leavingStory || !parsed.headline)) {
        parsed.headline = leavingStory ? `${resolvedPlayerName} EXIT WATCH` : parsed.headline || `${resolvedPlayerName} MARKET WATCH`;
        fields.headline = fields.headline || parsed.headline;
      }
      if (resolvedPlayerName && (leavingStory || freeStory || localConfidence !== null)) {
        fields.marketItems = JSON.stringify([{
          player: String(resolvedPlayerName),
          from: String(fields.fromClub || localClub || 'Source club'),
          to: String(fields.toClub || (freeStory ? 'Free agent' : 'Destination TBC')),
          value: String(fields.dealValue || (freeStory ? 'Free transfer' : 'Market watch')),
          confidence: Number(fields.confidence || localConfidence || 65),
          status: freeStory ? 'Contract exit' : 'AI prepared',
          tag: leavingStory ? 'Exit watch' : 'Focus',
        }]);
      }

      return sendJson(res, 200, { data: { ...parsed, fields } });
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
