import { createHmac, timingSafeEqual } from 'node:crypto';

interface AdminSessionPayload {
  role: 'admin';
  scope: 'sponsors';
  iat: number;
  exp: number;
}

const encodePart = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

const sign = (value: string, secret: string): string => createHmac('sha256', secret).update(value).digest('base64url');

export const issueAdminSession = (secret: string, durationMs = 12 * 60 * 60 * 1000) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: AdminSessionPayload = {
    role: 'admin',
    scope: 'sponsors',
    iat: Date.now(),
    exp: Date.now() + durationMs,
  };

  const encoded = `${encodePart(header)}.${encodePart(payload)}`;
  const signature = sign(encoded, secret);

  return {
    token: `${encoded}.${signature}`,
    payload,
  };
};

export const verifyAdminSession = (token: string, secret: string): AdminSessionPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`, secret);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (parsed.exp <= Date.now()) return null;
    if (parsed.role !== 'admin' || parsed.scope !== 'sponsors') return null;
    return parsed;
  } catch (error) {
    console.error('Failed to parse admin session payload', error);
    return null;
  }
};
