/**
 * /api/tts — Microsoft Edge Neural TTS proxy.
 *
 *  This endpoint proxies the Microsoft Edge "Read Aloud" service which
 *  uses Azure Neural voices but is freely accessible from Edge browsers.
 *  We connect over WebSocket to the same endpoint Edge uses, request the
 *  audio for our text, and stream back the resulting MP3.
 *
 *  Why this matters:
 *   - Browser SpeechSynthesis Arabic voices are awful and inconsistent.
 *   - StreamElements has only one Arabic voice (Naayf) and the quality
 *     drops on long phrases.
 *   - Edge Neural voices like ar-SA-HamedNeural and ar-EG-ShakirNeural
 *     are state-of-the-art studio quality and 100% free.
 *
 *  No API key required. No subscription. The endpoint is public.
 *
 *  Cached: identical (voice, text) pairs are kept in-memory for 30 minutes
 *  to avoid hammering the upstream service.
 */

import { sendMethodNotAllowed, type ServerlessRequest, type ServerlessResponse } from './_lib/http.js';

// We use the WebSocket library only on the server side
import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

type Req = ServerlessRequest & { url?: string };
type Res = ServerlessResponse & { write?: (chunk: Buffer | string) => boolean | void };

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'; // The same constant used by Microsoft Edge browser
const SYNTH_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

const VOICE_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?-[a-zA-Z]+Neural$/;

// Allowed voice list (whitelist for safety)
const ALLOWED_VOICES = new Set<string>([
  // English
  'en-US-GuyNeural', 'en-US-DavisNeural', 'en-US-TonyNeural', 'en-GB-RyanNeural', 'en-US-AriaNeural',
  'en-US-SteffanNeural', 'en-US-RogerNeural', 'en-AU-WilliamNeural',
  // Arabic
  'ar-SA-HamedNeural', 'ar-EG-ShakirNeural', 'ar-SA-ZariyahNeural', 'ar-EG-SalmaNeural',
  'ar-AE-HamdanNeural', 'ar-AE-FatimaNeural',
  // Spanish / French / German / Italian / Portuguese / Russian / Turkish
  'es-ES-AlvaroNeural', 'es-MX-JorgeNeural',
  'fr-FR-HenriNeural', 'fr-FR-DeniseNeural',
  'it-IT-DiegoNeural', 'it-IT-ElsaNeural',
  'pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural',
  'de-DE-ConradNeural',
  'tr-TR-AhmetNeural',
  'ru-RU-DmitryNeural',
]);

type CacheEntry = { mp3: Buffer; expires: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

const cleanCache = () => {
  const now = Date.now();
  for (const [key, entry] of CACHE.entries()) {
    if (entry.expires < now) CACHE.delete(key);
  }
};

const escapeXml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildSsml = (voice: string, text: string, rate = -2, pitch = -10) => {
  const lang = voice.split('-').slice(0, 2).join('-');
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">` +
    `<voice name="${voice}"><prosody rate="${rate}%" pitch="${pitch}%">${escapeXml(text)}</prosody></voice></speak>`;
};

// Synthesize a single phrase. Returns an MP3 Buffer.
const synthesizeMp3 = (voice: string, text: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const requestId = randomUUID().replace(/-/g, '');
    const timeout = setTimeout(() => {
      try { ws.close(); } catch { /* noop */ }
      reject(new Error('TTS timeout'));
    }, 15000);

    const ws = new WebSocket(SYNTH_URL, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      },
    });

    const chunks: Buffer[] = [];
    let configSent = false;

    ws.on('open', () => {
      const configMsg =
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        'Content-Type:application/json; charset=utf-8\r\n' +
        'Path:speech.config\r\n\r\n' +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';
      ws.send(configMsg);

      const ssmlMsg =
        `X-RequestId:${requestId}\r\n` +
        'Content-Type:application/ssml+xml\r\n' +
        `X-Timestamp:${new Date().toISOString()}Z\r\n` +
        'Path:ssml\r\n\r\n' +
        buildSsml(voice, text);
      ws.send(ssmlMsg);
      configSent = true;
    });

    ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      if (!isBinary) {
        const text = data.toString('utf8');
        if (text.includes('Path:turn.end')) {
          clearTimeout(timeout);
          try { ws.close(); } catch { /* noop */ }
          resolve(Buffer.concat(chunks));
        }
        return;
      }
      // Binary frame: <header length (2 bytes BE)><header bytes><audio bytes>
      const buf = Buffer.from(data as Buffer);
      if (buf.length < 2) return;
      const headerLen = buf.readUInt16BE(0);
      if (buf.length <= 2 + headerLen) return;
      const audio = buf.slice(2 + headerLen);
      if (audio.length > 0) chunks.push(audio);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      if (!configSent) {
        clearTimeout(timeout);
        reject(new Error('TTS websocket closed before config was sent'));
      }
    });
  });
};

const sendError = (res: Res, status: number, message: string) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: message }));
};

export default async function handler(req: Req, res: Res) {
  if (req.method && req.method !== 'GET') {
    sendMethodNotAllowed(res, 'GET', { error: 'method_not_allowed' });
    return;
  }

  const rawUrl = req.url ?? '';
  const qIndex = rawUrl.indexOf('?');
  const params = qIndex >= 0 ? new URLSearchParams(rawUrl.slice(qIndex + 1)) : new URLSearchParams();
  const voice = (params.get('voice') || '').trim();
  const text = (params.get('text') || '').trim();

  if (!voice || !text) {
    sendError(res, 400, 'voice and text are required');
    return;
  }

  if (text.length > 600) {
    sendError(res, 400, 'text too long (max 600 chars)');
    return;
  }

  if (!VOICE_PATTERN.test(voice) || !ALLOWED_VOICES.has(voice)) {
    sendError(res, 400, 'unsupported voice');
    return;
  }

  const cacheKey = `${voice}::${text}`;
  cleanCache();
  const cached = CACHE.get(cacheKey);
  if (cached) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.setHeader('X-TTS-Cache', 'HIT');
    res.end(cached.mp3.toString('binary'));
    if (typeof res.write === 'function') {
      // serverless res.end with binary string — fall back to write+end via Node
      // (handled above via res.end string in most environments)
    }
    return;
  }

  try {
    const mp3 = await synthesizeMp3(voice, text);
    if (mp3.length === 0) {
      sendError(res, 502, 'empty audio response');
      return;
    }
    CACHE.set(cacheKey, { mp3, expires: Date.now() + CACHE_TTL_MS });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.setHeader('X-TTS-Cache', 'MISS');
    res.setHeader('Content-Length', String(mp3.length));
    // Vercel Node.js runtime supports res.end(Buffer)
    (res as any).end(mp3);
  } catch (err: any) {
    sendError(res, 502, `tts upstream error: ${err?.message || 'unknown'}`);
  }
}
