import { FieldValue } from 'firebase-admin/firestore';
import {
  getIdentityAdminServices,
  IdentityAdminConfigurationError,
} from './_lib/firebaseIdentityAdmin.js';
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_lib/http.js';
import { getPlatformConfig } from './_lib/platformConfig.js';
import {
  buildIdentityProfile,
  FixedWindowRateLimiter,
  getClientAddress,
  getRequestHeader,
  hasJsonContentType,
  isTrustedRequestOrigin,
} from './_lib/platformSecurity.js';
import {
  getTrialStudio,
  provisionTrialStudio,
  TrialProvisioningError,
} from './_lib/trialProvisioning.js';

const SESSION_COOKIE = '__Host-reo_session';
const SESSION_REAUTH_MAX_AGE_SECONDS = 5 * 60;
const limiter = new FixedWindowRateLimiter();

interface SessionBody {
  idToken?: string;
}

const sendError = (
  response: ServerlessResponse,
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
) => sendJson(response, status, { ok: false, code, error, ...extra });

const getAction = (request: ServerlessRequest) => {
  try {
    return new URL(request.url || '/api/platform', 'https://reo.invalid').searchParams.get('action') || '';
  } catch {
    return '';
  }
};

const readCookie = (request: ServerlessRequest, name: string) => {
  const cookieHeader = getRequestHeader(request, 'cookie');
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
};

const setSessionCookie = (response: ServerlessResponse, value: string, maxAgeSeconds: number) => {
  response.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; '));
};

const clearSessionCookie = (response: ServerlessResponse) => {
  response.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; '));
};

const requireSafeJsonPost = (request: ServerlessRequest, response: ServerlessResponse) => {
  if (!isTrustedRequestOrigin(request)) {
    sendError(response, 403, 'ORIGIN_REJECTED', 'تعذر التحقق من مصدر الطلب.');
    return false;
  }
  if (!hasJsonContentType(request)) {
    sendError(response, 415, 'JSON_REQUIRED', 'يجب إرسال الطلب بصيغة JSON.');
    return false;
  }
  return true;
};

const enforceRateLimit = (
  request: ServerlessRequest,
  response: ServerlessResponse,
  action: string,
  limit: number,
  windowMs: number,
) => {
  const result = limiter.consume(`${action}:${getClientAddress(request)}`, limit, windowMs);
  if (result.allowed) return true;
  sendError(response, 429, 'RATE_LIMITED', 'محاولات كثيرة. حاول لاحقًا.', {
    retryAfterSeconds: result.retryAfterSeconds,
  });
  return false;
};

const getVerifiedSessionUser = async (request: ServerlessRequest) => {
  const cookie = readCookie(request, SESSION_COOKIE);
  if (!cookie) return null;
  try {
    const { auth } = getIdentityAdminServices();
    const decoded = await auth.verifySessionCookie(cookie, true);
    const user = await auth.getUser(decoded.uid);
    if (user.disabled || !user.email || !user.emailVerified) return null;
    return user;
  } catch (error) {
    if (error instanceof IdentityAdminConfigurationError) throw error;
    return null;
  }
};

const handleCreateSession = async (request: ServerlessRequest, response: ServerlessResponse) => {
  if (request.method !== 'POST') return sendMethodNotAllowed(response, 'POST', { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (!requireSafeJsonPost(request, response)) return;
  if (!enforceRateLimit(request, response, 'create-session', 10, 10 * 60_000)) return;

  const body = await readJsonBody<SessionBody>(request).catch(() => null);
  const idToken = body?.idToken?.trim() ?? '';
  if (!idToken || idToken.length > 16_384) {
    return sendError(response, 400, 'ID_TOKEN_REQUIRED', 'بيانات تسجيل الدخول غير مكتملة.');
  }

  const { auth } = getIdentityAdminServices();
  const decoded = await auth.verifyIdToken(idToken, true);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!decoded.auth_time || nowSeconds - decoded.auth_time > SESSION_REAUTH_MAX_AGE_SECONDS) {
    return sendError(response, 401, 'REAUTH_REQUIRED', 'أعد تسجيل الدخول لإنشاء جلسة آمنة.');
  }

  const user = await auth.getUser(decoded.uid);
  if (user.disabled) return sendError(response, 403, 'ACCOUNT_DISABLED', 'هذا الحساب غير متاح.');
  if (!user.email || !user.emailVerified) {
    return sendError(response, 403, 'EMAIL_NOT_VERIFIED', 'يجب تأكيد البريد الإلكتروني أولًا.');
  }

  const { sessionCookieDays } = getPlatformConfig();
  const maxAgeSeconds = sessionCookieDays * 24 * 60 * 60;
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: maxAgeSeconds * 1000 });
  setSessionCookie(response, sessionCookie, maxAgeSeconds);
  return sendJson(response, 200, {
    ok: true,
    authenticated: true,
    user: buildIdentityProfile({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }),
  });
};

const handleDestroySession = async (request: ServerlessRequest, response: ServerlessResponse) => {
  if (request.method !== 'POST') return sendMethodNotAllowed(response, 'POST', { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (!requireSafeJsonPost(request, response)) return;
  if (!enforceRateLimit(request, response, 'destroy-session', 20, 60_000)) return;
  clearSessionCookie(response);
  return sendJson(response, 200, { ok: true, authenticated: false });
};

const handleMe = async (request: ServerlessRequest, response: ServerlessResponse) => {
  if (request.method !== 'GET') return sendMethodNotAllowed(response, 'GET', { ok: false, code: 'METHOD_NOT_ALLOWED' });
  try {
    const user = await getVerifiedSessionUser(request);
    if (!user) {
      clearSessionCookie(response);
      return sendJson(response, 200, { ok: true, authenticated: false, user: null });
    }
    return sendJson(response, 200, {
      ok: true,
      authenticated: true,
      user: buildIdentityProfile({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    });
  } catch {
    clearSessionCookie(response);
    return sendJson(response, 200, { ok: true, authenticated: false, user: null });
  }
};

const handleSyncUserProfile = async (request: ServerlessRequest, response: ServerlessResponse) => {
  if (request.method !== 'POST') return sendMethodNotAllowed(response, 'POST', { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (!requireSafeJsonPost(request, response)) return;
  if (!enforceRateLimit(request, response, 'sync-user-profile', 30, 60_000)) return;

  const user = await getVerifiedSessionUser(request);
  if (!user) return sendError(response, 401, 'SESSION_INVALID', 'الجلسة غير صالحة أو منتهية.');

  const { firestore } = getIdentityAdminServices();
  const profile = buildIdentityProfile({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
  });
  const profileRef = firestore.collection('users').doc(user.uid);

  await firestore.runTransaction(async transaction => {
    const existing = await transaction.get(profileRef);
    const now = FieldValue.serverTimestamp();
    const update: Record<string, unknown> = {
      ...profile,
      updatedAt: now,
      lastLoginAt: now,
    };
    if (!existing.exists) {
      update.createdAt = now;
      update.status = 'ACTIVE';
      update.onboardingStatus = 'IDENTITY_READY';
    }
    transaction.set(profileRef, update, { merge: true });
  });

  return sendJson(response, 200, { ok: true, profileSynced: true });
};

const handleProvisionTrial = async (
  request: ServerlessRequest,
  response: ServerlessResponse,
  trialDays: number,
) => {
  if (request.method !== 'POST') return sendMethodNotAllowed(response, 'POST', { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (!requireSafeJsonPost(request, response)) return;
  if (!enforceRateLimit(request, response, 'provision-trial', 5, 60 * 60_000)) return;

  const user = await getVerifiedSessionUser(request);
  if (!user) return sendError(response, 401, 'SESSION_INVALID', 'الجلسة غير صالحة أو منتهية.');

  const { firestore } = getIdentityAdminServices();
  const result = await provisionTrialStudio(firestore, {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
  }, trialDays);
  return sendJson(response, 200, { ok: true, ...result });
};

const handleGetStudio = async (request: ServerlessRequest, response: ServerlessResponse) => {
  if (request.method !== 'GET') return sendMethodNotAllowed(response, 'GET', { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (!enforceRateLimit(request, response, 'get-studio', 60, 60_000)) return;

  const user = await getVerifiedSessionUser(request);
  if (!user) return sendError(response, 401, 'SESSION_INVALID', 'الجلسة غير صالحة أو منتهية.');

  const { firestore } = getIdentityAdminServices();
  const studio = await getTrialStudio(firestore, {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
  });
  return sendJson(response, 200, { ok: true, studio });
};

export default async function handler(request: ServerlessRequest, response: ServerlessResponse) {
  const config = getPlatformConfig();
  if (!config.identityEnabled || !config.serverSessionsEnabled) {
    return sendError(response, 404, 'IDENTITY_DISABLED', 'نظام الحسابات غير مفعل.');
  }
  if (!config.firebaseProjectIdConfigured || !config.firebaseClientEmailConfigured || !config.firebasePrivateKeyConfigured) {
    return sendError(response, 503, 'IDENTITY_NOT_CONFIGURED', 'إعدادات خادم الهوية غير مكتملة.');
  }

  const action = getAction(request);
  try {
    if (action === 'create-session') return await handleCreateSession(request, response);
    if (action === 'destroy-session') return await handleDestroySession(request, response);
    if (action === 'me') return await handleMe(request, response);
    if (action === 'sync-user-profile') return await handleSyncUserProfile(request, response);
    if (action === 'provision-trial' || action === 'studio') {
      if (!config.trialProvisioningEnabled) {
        return sendError(response, 404, 'TRIAL_PROVISIONING_DISABLED', 'نظام الاستوديو التجريبي غير مفعل.');
      }
      if (action === 'provision-trial') return await handleProvisionTrial(request, response, config.trialDays);
      return await handleGetStudio(request, response);
    }
    return sendError(response, 404, 'ACTION_NOT_FOUND', 'إجراء الهوية غير معروف.');
  } catch (error) {
    if (error instanceof IdentityAdminConfigurationError) {
      return sendError(response, 503, 'IDENTITY_NOT_CONFIGURED', 'إعدادات خادم الهوية غير مكتملة.');
    }
    if (error instanceof TrialProvisioningError) {
      return sendError(response, error.status, error.code, error.message);
    }
    if (action === 'create-session') {
      return sendError(response, 401, 'AUTHENTICATION_FAILED', 'تعذر التحقق من جلسة الحساب.');
    }
    if (action === 'sync-user-profile') {
      return sendError(response, 503, 'PROFILE_SYNC_FAILED', 'تعذر مزامنة ملف المستخدم.');
    }
    if (action === 'provision-trial') {
      return sendError(response, 503, 'TRIAL_PROVISIONING_FAILED', 'تعذر تجهيز الاستوديو التجريبي. حاول مرة أخرى.');
    }
    if (action === 'studio') {
      return sendError(response, 503, 'TRIAL_STUDIO_READ_FAILED', 'تعذر تحميل الاستوديو التجريبي.');
    }
    return sendError(response, 500, 'IDENTITY_REQUEST_FAILED', 'تعذر إكمال طلب الهوية.');
  }
}
