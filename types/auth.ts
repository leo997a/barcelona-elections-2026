export interface IdentityUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
}

export type IdentitySessionState =
  | { status: 'disabled'; user: null }
  | { status: 'loading'; user: null }
  | { status: 'signed-out'; user: null }
  | { status: 'authenticated'; user: IdentityUser };

export type IdentityAuthView = 'login' | 'signup' | 'verify-email' | 'forgot-password';

export interface PlatformErrorPayload {
  ok?: false;
  code?: string;
  error?: string;
  retryAfterSeconds?: number;
}
