import type { IncomingMessage, ServerResponse } from 'node:http';
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const adminPasscode = process.env.EDITOR_ADMIN_PASSCODE || process.env.ADMIN_ACCESS_CODE;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.EDITOR_ADMIN_PASSCODE || process.env.ADMIN_ACCESS_CODE;

  if (!adminPasscode || !sessionSecret) {
    return sendJson(res, 503, {
      error: 'جلسة المسؤول غير مفعلة بعد. أضف متغيرات البيئة الخاصة بالحماية أولاً.',
    });
  }

  if (req.method === 'GET') {
    const token = getBearerToken(req);
    if (!token) {
      return sendJson(res, 401, { error: 'الرمز غير موجود.' });
    }

    const payload = verifyAdminSession(token, sessionSecret);
    if (!payload) {
      return sendJson(res, 401, { error: 'الرمز غير صالح أو منتهي الصلاحية.' });
    }

    return sendJson(res, 200, {
      role: payload.role,
      scope: payload.scope,
      expiresAt: payload.exp,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'الطريقة غير مدعومة.' });
  }

  const body = await readJsonBody<SessionBody>(req).catch(() => null);
  if (!body?.passcode) {
    return sendJson(res, 400, { error: 'رمز الوصول مطلوب.' });
  }

  if (!compareSecrets(body.passcode, adminPasscode)) {
    return sendJson(res, 401, { error: 'رمز الوصول غير صحيح.' });
  }

  const session = issueAdminSession(sessionSecret);
  return sendJson(res, 200, {
    token: session.token,
    expiresAt: session.payload.exp,
    role: session.payload.role,
    scope: session.payload.scope,
  });
}
