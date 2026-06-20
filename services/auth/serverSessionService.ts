import type { IdentityUser, PlatformErrorPayload } from '../../types/auth';
import type { TrialProvisioningResponse, TrialStudioResponse } from '../../types/trial';

interface SessionResponse {
  ok: true;
  authenticated: boolean;
  user: IdentityUser | null;
}

export class IdentityPlatformError extends Error {
  readonly code: string;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, code = 'IDENTITY_REQUEST_FAILED', retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'IdentityPlatformError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const parseJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
};

const requestPlatform = async <T>(action: string, init: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`/api/platform?action=${encodeURIComponent(action)}`, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
    });
  } catch {
    throw new IdentityPlatformError('تعذر الاتصال بخدمة الحسابات.', 'NETWORK_ERROR');
  }
  const payload = await parseJson<T & PlatformErrorPayload>(response);
  if (!response.ok || !payload) {
    throw new IdentityPlatformError(
      payload?.error || 'تعذر الاتصال بخدمة الحسابات.',
      payload?.code,
      payload?.retryAfterSeconds ?? null,
    );
  }
  return payload;
};

const jsonPost = (body: Record<string, unknown> = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const serverSessionService = {
  create(idToken: string) {
    return requestPlatform<SessionResponse>('create-session', jsonPost({ idToken }));
  },

  me() {
    return requestPlatform<SessionResponse>('me', { method: 'GET' });
  },

  syncUserProfile() {
    return requestPlatform<{ ok: true; profileSynced: true }>('sync-user-profile', jsonPost());
  },

  provisionTrial() {
    return requestPlatform<TrialProvisioningResponse>('provision-trial', jsonPost());
  },

  getStudio() {
    return requestPlatform<TrialStudioResponse>('studio', { method: 'GET' });
  },

  destroy() {
    return requestPlatform<{ ok: true; authenticated: false }>('destroy-session', jsonPost());
  },
};
