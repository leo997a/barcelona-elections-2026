import { serverSessionService } from './serverSessionService';

export const REO_IDENTITY_LOGOUT_EVENT = 'reo:identity-logout';
export const REO_IDENTITY_LOGOUT_STORAGE_KEY = 'rge_identity_logout_at';

const notifyIdentityLogout = () => {
  window.dispatchEvent(new CustomEvent(REO_IDENTITY_LOGOUT_EVENT));
  localStorage.setItem(REO_IDENTITY_LOGOUT_STORAGE_KEY, String(Date.now()));
};

export const identitySessionService = {
  async establish() {
    const { firebaseAuthClient } = await import('./firebaseAuthClient');
    const idToken = await firebaseAuthClient.getFreshIdToken();
    const session = await serverSessionService.create(idToken);
    try {
      await serverSessionService.syncUserProfile();
    } catch (error) {
      await serverSessionService.destroy().catch(() => undefined);
      throw error;
    }
    if (!session.authenticated || !session.user) {
      throw new Error('تعذر إنشاء جلسة الحساب.');
    }
    return session.user;
  },

  async restore() {
    const session = await serverSessionService.me();
    return session.authenticated ? session.user : null;
  },

  async logout() {
    await serverSessionService.destroy();
    const { firebaseAuthClient } = await import('./firebaseAuthClient');
    await firebaseAuthClient.logout().catch(() => undefined);
    notifyIdentityLogout();
  },
};
