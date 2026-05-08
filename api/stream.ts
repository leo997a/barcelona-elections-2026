// ─── /api/stream.ts ── Vercel Edge Function: Server-Sent Events ─────────────
// يُبقى الاتصال مفتوحاً ويدفع التحديثات فور استلامها بدلاً من polling
// لا يحتاج قاعدة بيانات — يعمل مع module-level state في Edge Runtime

export const config = { runtime: 'edge' };

// ─── Global state store (Edge Runtime — single process per region) ───────────
// تنبيه: هذا يعمل جيداً في edge runtime لأنه process واحد per region على Vercel
const stateStore = new Map<string, { json: string; version: number }>();
const listeners = new Map<string, Set<ReadableStreamDefaultController>>();

export function pushState(id: string, json: string) {
  const prev = stateStore.get(id);
  const version = (prev?.version ?? 0) + 1;
  stateStore.set(id, { json, version });

  // أبلغ كل المستمعين المتصلين بـ SSE
  const set = listeners.get(id);
  if (set) {
    const msg = `data: ${json}\n\n`;
    for (const ctrl of set) {
      try { ctrl.enqueue(msg); } catch { set.delete(ctrl); }
    }
  }
}

export function getState(id: string) {
  return stateStore.get(id) ?? null;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

  if (!id) return new Response('id مطلوب', { status: 400, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  // ── POST: push state update ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.text();
      pushState(id, body);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    } catch {
      return new Response('Error', { status: 500, headers: cors });
    }
  }

  // ── GET: SSE stream (stays open, pushes updates instantly) ──────────────────
  if (req.method === 'GET') {
    const stream = new ReadableStream({
      start(controller) {
        // أرسل الحالة الأخيرة فوراً (إن وُجدت)
        const current = getState(id);
        if (current) {
          controller.enqueue(`data: ${current.json}\n\n`);
        } else {
          // أرسل heartbeat لتأكيد الاتصال
          controller.enqueue(`: connected\n\n`);
        }

        // سجّل هذا المستمع
        if (!listeners.has(id)) listeners.set(id, new Set());
        listeners.get(id)!.add(controller);

        // heartbeat كل 15 ثانية لإبقاء الاتصال حياً
        const hb = setInterval(() => {
          try { controller.enqueue(`: ping\n\n`); }
          catch { clearInterval(hb); listeners.get(id)?.delete(controller); }
        }, 15_000);

        // تنظيف عند قطع الاتصال
        req.signal.addEventListener('abort', () => {
          clearInterval(hb);
          listeners.get(id)?.delete(controller);
          try { controller.close(); } catch { /* already closed */ }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        ...cors,
      },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
}
