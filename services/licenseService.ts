
const STORAGE_KEY = 'rge_license_v1';

export type LicenseRole = 'VIEWER' | 'OPERATOR' | 'EDITOR' | 'ADMIN';

export interface LicenseState {
  valid: boolean;
  role: LicenseRole;
  studioId: string;
  exp: number;
}

const ROLE_HIERARCHY: Record<LicenseRole, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  EDITOR: 2,
  ADMIN: 3,
};

const normalizeStoredLicense = (raw: string): LicenseState | null => {
  const parsed = JSON.parse(raw) as Partial<LicenseState>;
  if (!parsed.valid || !parsed.role || !parsed.studioId || typeof parsed.exp !== 'number') {
    return null;
  }
  if (!(parsed.role in ROLE_HIERARCHY)) {
    return null;
  }
  return {
    valid: true,
    role: parsed.role,
    studioId: parsed.studioId,
    exp: parsed.exp,
  };
};

export const licenseService = {
  /** Returns stored license or null */
  getStored(): LicenseState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const state = normalizeStoredLicense(raw);
      if (!state) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      const sanitized = JSON.stringify(state);
      if (raw !== sanitized) {
        localStorage.setItem(STORAGE_KEY, sanitized);
      }
      return state;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  /** Verify a key with the server and store result */
  async activate(key: string): Promise<LicenseState> {
    const cleanKey = key.trim();
    if (!cleanKey) {
      throw new Error('أدخل مفتاح الدخول أولًا.');
    }

    const res = await fetch('/api/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', key: cleanKey }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.valid) {
      throw new Error(data.error || 'مفتاح الدخول غير صالح.');
    }

    const state: LicenseState = {
      valid: true,
      role: data.role as LicenseRole,
      studioId: data.studioId,
      exp: data.exp,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  },

  /** Remove stored license */
  revoke() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Check if stored license has at least this role */
  hasRole(minRole: LicenseRole): boolean {
    const stored = this.getStored();
    if (!stored?.valid) return false;
    if (stored.exp > 0 && stored.exp < Math.floor(Date.now() / 1000)) {
      this.revoke();
      return false;
    }
    return (ROLE_HIERARCHY[stored.role] ?? -1) >= ROLE_HIERARCHY[minRole];
  },

  /** True if any valid license exists */
  isUnlocked(): boolean {
    return this.hasRole('VIEWER');
  },
};
