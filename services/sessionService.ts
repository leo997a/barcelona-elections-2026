import { adminSessionService } from './adminSession';
import { licenseService } from './licenseService';

export const REO_SESSION_LOGOUT_EVENT = 'reo:session-logout';
export const REO_LOGOUT_STORAGE_KEY = 'rge_logout_at';

const LOCAL_SESSION_KEYS = [
  'rge_license_email',
] as const;

const SESSION_KEYS: readonly string[] = [];

const removeKeys = (storage: Storage, keys: readonly string[]) => {
  keys.forEach(key => storage.removeItem(key));
};

const notifyLogout = () => {
  window.dispatchEvent(new CustomEvent(REO_SESSION_LOGOUT_EVENT));
  localStorage.setItem(REO_LOGOUT_STORAGE_KEY, String(Date.now()));
};

export const sessionService = {
  async logout(): Promise<void> {
    const errors: string[] = [];
    const run = (operation: () => void) => {
      try {
        operation();
      } catch {
        errors.push('cleanup');
      }
    };

    run(() => licenseService.revoke());
    run(() => adminSessionService.clear());
    run(() => removeKeys(localStorage, LOCAL_SESSION_KEYS));
    run(() => removeKeys(sessionStorage, SESSION_KEYS));
    run(notifyLogout);

    if (errors.length > 0) {
      throw new Error('تعذر تنظيف جلسة الدخول بالكامل. أعد المحاولة.');
    }
  },
};
