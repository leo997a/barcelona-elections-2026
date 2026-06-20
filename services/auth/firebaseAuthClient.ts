import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import type { IdentityUser } from '../../types/auth';
import { identityClientConfig, isIdentityClientConfigured } from './identityConfig';

const FIREBASE_APP_NAME = 'reo-identity-staging';
let authPromise: Promise<Auth> | null = null;

const mapFirebaseUser = (user: User): IdentityUser => ({
  uid: user.uid,
  email: user.email ?? '',
  emailVerified: user.emailVerified,
  displayName: user.displayName,
  photoURL: user.photoURL,
});

const getIdentityApp = (): FirebaseApp => {
  if (!identityClientConfig.enabled || !isIdentityClientConfigured()) {
    throw new Error('إعدادات حسابات المستخدمين غير مكتملة.');
  }
  return getApps().some(app => app.name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(identityClientConfig.firebase, FIREBASE_APP_NAME);
};

const getIdentityAuth = async () => {
  if (!authPromise) {
    const auth = getAuth(getIdentityApp());
    authPromise = setPersistence(auth, browserSessionPersistence).then(() => auth);
  }
  return authPromise;
};

export const normalizeAccountEmail = (email: string) => email.trim().toLowerCase();

export const toArabicAuthError = (error: unknown) => {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'البريد أو كلمة المرور غير صحيحة.';
  }
  if (code.includes('email-already-in-use')) return 'يوجد حساب مرتبط بهذا البريد.';
  if (code.includes('weak-password')) return 'اختر كلمة مرور أقوى لا تقل عن 8 أحرف.';
  if (code.includes('invalid-email')) return 'صيغة البريد الإلكتروني غير صحيحة.';
  if (code.includes('too-many-requests')) return 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.';
  if (code.includes('network-request-failed')) return 'تعذر الاتصال بخدمة الحسابات.';
  if (error instanceof Error && error.message) return error.message;
  return 'تعذر إكمال طلب الحساب.';
};

export const firebaseAuthClient = {
  async signup(email: string, password: string, displayName: string) {
    const auth = await getIdentityAuth();
    const credential = await createUserWithEmailAndPassword(auth, normalizeAccountEmail(email), password);
    if (displayName.trim()) await updateProfile(credential.user, { displayName: displayName.trim() });
    await sendEmailVerification(credential.user);
    return mapFirebaseUser(credential.user);
  },

  async login(email: string, password: string) {
    const auth = await getIdentityAuth();
    const credential = await signInWithEmailAndPassword(auth, normalizeAccountEmail(email), password);
    return mapFirebaseUser(credential.user);
  },

  async sendPasswordReset(email: string) {
    const auth = await getIdentityAuth();
    try {
      await sendPasswordResetEmail(auth, normalizeAccountEmail(email));
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code.includes('user-not-found')) return;
      throw error;
    }
  },

  async resendVerification() {
    const auth = await getIdentityAuth();
    if (!auth.currentUser) throw new Error('سجل الدخول أولًا لإعادة إرسال رسالة التحقق.');
    await sendEmailVerification(auth.currentUser);
  },

  async refreshCurrentUser() {
    const auth = await getIdentityAuth();
    if (!auth.currentUser) return null;
    await reload(auth.currentUser);
    return mapFirebaseUser(auth.currentUser);
  },

  async getFreshIdToken() {
    const auth = await getIdentityAuth();
    if (!auth.currentUser) throw new Error('جلسة Firebase غير موجودة.');
    return auth.currentUser.getIdToken(true);
  },

  async logout() {
    if (!authPromise) return;
    const auth = await authPromise;
    await signOut(auth);
  },

  async watch(listener: (user: IdentityUser | null) => void): Promise<Unsubscribe> {
    const auth = await getIdentityAuth();
    return onAuthStateChanged(auth, user => listener(user ? mapFirebaseUser(user) : null));
  },
};
