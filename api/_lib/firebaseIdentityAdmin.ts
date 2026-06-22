import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const ADMIN_APP_NAME = 'reo-identity-foundation';

export class IdentityAdminConfigurationError extends Error {
  constructor() {
    super('Firebase Admin is not configured.');
    this.name = 'IdentityAdminConfigurationError';
  }
}

let cachedApp: App | null = null;

const readPrivateKey = () => {
  const privateKeyFromBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64?.trim();
  if (privateKeyFromBase64) {
    return Buffer.from(privateKeyFromBase64, 'base64').toString('utf8').trim();
  }

  return process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
};

const getIdentityAdminApp = () => {
  if (cachedApp) return cachedApp;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = readPrivateKey();
  if (!projectId || !clientEmail || !privateKey) {
    throw new IdentityAdminConfigurationError();
  }

  cachedApp = getApps().some(app => app.name === ADMIN_APP_NAME)
    ? getApp(ADMIN_APP_NAME)
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      }, ADMIN_APP_NAME);

  return cachedApp;
};

export interface IdentityAdminServices {
  auth: Auth;
  firestore: Firestore;
}

export const getIdentityAdminServices = (): IdentityAdminServices => {
  const app = getIdentityAdminApp();
  return {
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
};
