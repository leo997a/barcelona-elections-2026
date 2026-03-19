import { timingSafeEqual } from 'node:crypto';
import { issueAdminSession, verifyAdminSession } from '../_lib/adminToken';
import { getBearerToken, readJsonBody, sendJson } from '../_lib/http';

interface SessionBody {
  passcode?: string;
}

const compareSecrets = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export default async function handler(request: Request) {
  const adminPasscode = process.env.EDITOR_ADMIN_PASSCODE || process.env.ADMIN_ACCESS_CODE;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.EDITOR_ADMIN_PASSCODE || process.env.ADMIN_ACCESS_CODE;

  if (!adminPasscode || !sessionSecret) {
    return sendJson(503, {
      error: 'جلسة المسؤول غير مفعلة بعد. أضف متغيرات البيئة الخاصة بالحماية أولاً.',
    });
  }

  if (request.method === 'GET') {
    const token = getBearerToken(request);
    if (!token) {
      return sendJson(401, { error: 'الرمز غير موجود.' });
    }

    const payload = verifyAdminSession(token, sessionSecret);
    if (!payload) {
      return sendJson(401, { error: 'الرمز غير صالح أو منتهي الصلاحية.' });
    }

    return sendJson(200, {
      role: payload.role,
      scope: payload.scope,
      expiresAt: payload.exp,
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'الطريقة غير مدعومة.' }), {
      status: 405,
      headers: {
        'Allow': 'GET, POST',
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  const body = await readJsonBody<SessionBody>(request).catch(() => null);
  if (!body?.passcode) {
    return sendJson(400, { error: 'رمز الوصول مطلوب.' });
  }

  if (!compareSecrets(body.passcode, adminPasscode)) {
    return sendJson(401, { error: 'رمز الوصول غير صحيح.' });
  }

  const session = issueAdminSession(sessionSecret);
  return sendJson(200, {
    token: session.token,
    expiresAt: session.payload.exp,
    role: session.payload.role,
    scope: session.payload.scope,
  });
}
