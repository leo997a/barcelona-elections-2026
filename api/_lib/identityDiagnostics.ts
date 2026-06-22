import { createHash, randomUUID } from 'node:crypto';

type DiagnosticValue = string | number | boolean | null | undefined;
type DiagnosticDetails = Record<string, DiagnosticValue>;

export interface IdentityDiagnosticError extends DiagnosticDetails {
  firebaseErrorName: string;
  firebaseErrorCode: string;
  sanitizedFirebaseErrorMessage: string;
  stackFirstLine: string;
}

const readFlag = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

export const isIdentityDiagnosticsEnabled = () => readFlag(process.env.REO_IDENTITY_DIAGNOSTICS_ENABLED);

export const createIdentityDiagnosticId = () =>
  isIdentityDiagnosticsEnabled() ? `id_${randomUUID().replace(/-/g, '').slice(0, 16)}` : null;

const sha256Prefix = (value: string) =>
  createHash('sha256').update(value).digest('hex').slice(0, 12);

const stripOuterQuotesOnce = (value: string) => {
  const trimmed = value.trim();
  const first = trimmed[0];
  if ((first === '"' || first === "'") && trimmed.endsWith(first)) return trimmed.slice(1, -1);
  return trimmed;
};

const getClientEmailDomain = (value: string) => {
  const email = stripOuterQuotesOnce(value.trim().replace(/,$/, ''));
  const at = email.lastIndexOf('@');
  return at > -1 ? email.slice(at + 1) : '';
};

export const inspectIdentityAdminEnvironment = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? '';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
  const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 ?? '';
  const decodedPrivateKey = privateKeyBase64.trim()
    ? Buffer.from(privateKeyBase64.trim(), 'base64').toString('utf8')
    : '';
  const effectivePrivateKey = decodedPrivateKey || privateKey;
  const trimmedPrivateKey = effectivePrivateKey.trim();
  const unquotedPrivateKey = stripOuterQuotesOnce(trimmedPrivateKey).replace(/,$/, '').trim();

  return {
    nodeVersion: process.version,
    identityEnabled: readFlag(process.env.REO_IDENTITY_ENABLED),
    serverSessionsEnabled: readFlag(process.env.REO_SERVER_SESSIONS_ENABLED),
    firebaseProjectIdConfigured: Boolean(projectId.trim()),
    firebaseClientEmailConfigured: Boolean(clientEmail.trim()),
    firebasePrivateKeyConfigured: Boolean(privateKey.trim() || privateKeyBase64.trim()),
    firebasePrivateKeyBase64Configured: Boolean(privateKeyBase64.trim()),
    firebasePrivateKeySource: privateKeyBase64.trim() ? 'base64' : 'plain',
    firebasePrivateKeyLength: effectivePrivateKey.length,
    firebasePrivateKeyHasBeginMarker: unquotedPrivateKey.includes('-----BEGIN PRIVATE KEY-----'),
    firebasePrivateKeyHasEndMarker: unquotedPrivateKey.includes('-----END PRIVATE KEY-----'),
    firebasePrivateKeyContainsLiteralBackslashN: effectivePrivateKey.includes('\\n'),
    firebasePrivateKeyContainsDoubleEscapedBackslashN: effectivePrivateKey.includes('\\\\n'),
    firebasePrivateKeyContainsRealNewline: /\r|\n/.test(effectivePrivateKey),
    firebasePrivateKeyHasOuterQuotes: stripOuterQuotesOnce(trimmedPrivateKey) !== trimmedPrivateKey,
    firebaseProjectIdHashPrefix: projectId.trim() ? sha256Prefix(projectId.trim()) : '',
    firebaseClientEmailDomain: getClientEmailDomain(clientEmail),
  };
};

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
};

export const inspectIdTokenClaims = (idToken: string) => {
  try {
    const [, payload] = idToken.split('.');
    if (!payload) return {};
    const claims = JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const authTime = typeof claims.auth_time === 'number' ? claims.auth_time : null;
    const issuedAt = typeof claims.iat === 'number' ? claims.iat : null;
    const expiresAt = typeof claims.exp === 'number' ? claims.exp : null;
    const subject = typeof claims.sub === 'string' ? claims.sub : '';

    return {
      webTokenAudience: typeof claims.aud === 'string' ? claims.aud : '',
      webTokenIssuer: typeof claims.iss === 'string' ? claims.iss : '',
      tokenEmailVerified: claims.email_verified === true,
      tokenAuthTimeAgeSeconds: authTime ? nowSeconds - authTime : null,
      tokenIssuedAtSkewSeconds: issuedAt ? nowSeconds - issuedAt : null,
      tokenExpiresInSeconds: expiresAt ? expiresAt - nowSeconds : null,
      tokenUidPrefix: subject ? subject.slice(0, 6) : '',
      currentServerTime: new Date(nowSeconds * 1000).toISOString(),
    };
  } catch {
    return {
      webTokenAudience: '',
      webTokenIssuer: '',
      tokenEmailVerified: null,
      tokenAuthTimeAgeSeconds: null,
    };
  }
};

const sanitizeMessage = (value: string) => value
  .split(/\r?\n/)[0]
  .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]')
  .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, '[redacted-pem]')
  .slice(0, 500);

export const sanitizeIdentityAdminError = (error: unknown): IdentityDiagnosticError => {
  const record = typeof error === 'object' && error ? error as Record<string, unknown> : {};
  const name = typeof record.name === 'string' ? record.name : error instanceof Error ? error.name : 'UnknownError';
  const code = typeof record.code === 'string' ? record.code : '';
  const message = typeof record.message === 'string' ? record.message : error instanceof Error ? error.message : String(error);
  const stack = typeof record.stack === 'string' ? record.stack : '';

  return {
    firebaseErrorName: name,
    firebaseErrorCode: code,
    sanitizedFirebaseErrorMessage: sanitizeMessage(message),
    stackFirstLine: sanitizeMessage(stack.split(/\r?\n/)[0] || ''),
  };
};

export const logIdentityDiagnostic = (
  diagnosticId: string | null,
  stage: string,
  details: DiagnosticDetails = {},
) => {
  if (!diagnosticId || !isIdentityDiagnosticsEnabled()) return;
  console.info(JSON.stringify({
    source: 'reo-identity-diagnostics',
    diagnosticId,
    stage,
    ...details,
  }));
};
