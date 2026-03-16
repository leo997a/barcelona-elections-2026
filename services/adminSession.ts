import { decodeBase64UrlUtf8 } from '../utils/base64';

const STORAGE_KEY = 'rge_admin_session';

interface AdminSessionPayload {
  role: string;
  scope: string;
  iat: number;
  exp: number;
}

interface AdminSessionResponse {
  token: string;
  expiresAt: number;
  role: string;
  scope: string;
}

const parseTokenPayload = (token: string): AdminSessionPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    return JSON.parse(decodeBase64UrlUtf8(parts[1])) as AdminSessionPayload;
  } catch (error) {
    console.error('Failed to decode admin session', error);
    return null;
  }
};

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to access admin session storage', error);
    return null;
  }
};

const storeToken = (token: string) => {
  localStorage.setItem(STORAGE_KEY, token);
};

const clearToken = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const adminSessionService = {
  async login(passcode: string): Promise<AdminSessionResponse> {
    const response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ passcode }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'تعذر إنشاء جلسة المسؤول.');
    }

    storeToken(data.token);
    return data as AdminSessionResponse;
  },

  async verifyStoredSession(): Promise<boolean> {
    const token = getStoredToken();
    if (!token) return false;

    const payload = parseTokenPayload(token);
    if (!payload || payload.exp <= Date.now()) {
      clearToken();
      return false;
    }

    const response = await fetch('/api/admin/session', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearToken();
      return false;
    }

    return true;
  },

  getStoredSession() {
    const token = getStoredToken();
    if (!token) return null;

    const payload = parseTokenPayload(token);
    if (!payload || payload.exp <= Date.now()) {
      clearToken();
      return null;
    }

    return { token, payload };
  },

  clear() {
    clearToken();
  },
};
