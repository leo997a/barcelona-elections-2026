import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, Tv } from 'lucide-react';
import type { IdentityAuthView, IdentityUser } from '../../types/auth';
import { firebaseAuthClient, toArabicAuthError } from '../../services/auth/firebaseAuthClient';
import { identityClientConfig, isIdentityClientConfigured } from '../../services/auth/identityConfig';
import { identitySessionService } from '../../services/auth/identitySessionService';
import ForgotPasswordForm from './ForgotPasswordForm';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import VerifyEmailView from './VerifyEmailView';

interface AuthGatewayProps {
  legacyAccess: React.ReactNode;
  onAuthenticated: (user: IdentityUser) => void;
}

const SIGNUP_MINIMUM_ELAPSED_MS = 900;
const RESEND_COOLDOWN_SECONDS = 60;

export default function AuthGateway({ legacyAccess, onAuthenticated }: AuthGatewayProps) {
  const [view, setView] = useState<IdentityAuthView>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingUser, setPendingUser] = useState<IdentityUser | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const establishingRef = useRef(false);

  const clearFeedback = () => {
    setError('');
    setMessage('');
  };

  const establishSession = useCallback(async (user: IdentityUser) => {
    if (establishingRef.current) return;
    establishingRef.current = true;
    setBusy(true);
    setError('');
    try {
      if (!user.emailVerified) {
        setPendingUser(user);
        setView('verify-email');
        return;
      }
      const sessionUser = await identitySessionService.establish();
      onAuthenticated(sessionUser);
    } catch (requestError) {
      setError(toArabicAuthError(requestError));
    } finally {
      establishingRef.current = false;
      setBusy(false);
    }
  }, [onAuthenticated]);

  useEffect(() => {
    if (!identityClientConfig.enabled || !isIdentityClientConfigured()) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void firebaseAuthClient.watch(user => {
      if (cancelled || !user) return;
      if (!user.emailVerified) {
        setPendingUser(user);
        setView('verify-email');
        return;
      }
      void establishSession(user);
    }).then(stop => {
      if (cancelled) stop();
      else unsubscribe = stop;
    }).catch(requestError => {
      if (!cancelled) setError(toArabicAuthError(requestError));
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [establishSession]);

  useEffect(() => {
    if (resendCooldown < 1) return;
    const timer = window.setTimeout(() => setResendCooldown(value => Math.max(0, value - 1)), 1_000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const login = async (email: string, password: string) => {
    setBusy(true);
    clearFeedback();
    try {
      const user = await firebaseAuthClient.login(email, password);
      if (!user.emailVerified) {
        setPendingUser(user);
        setView('verify-email');
        return;
      }
      await establishSession(user);
    } catch (requestError) {
      setError(toArabicAuthError(requestError));
    } finally {
      if (!establishingRef.current) setBusy(false);
    }
  };

  const signup = async (data: { email: string; password: string; displayName: string; honeypot: string; elapsedMs: number }) => {
    setBusy(true);
    clearFeedback();
    try {
      if (data.honeypot || data.elapsedMs < SIGNUP_MINIMUM_ELAPSED_MS) {
        throw new Error('تعذر إكمال إنشاء الحساب. أعد المحاولة.');
      }
      const user = await firebaseAuthClient.signup(data.email, data.password, data.displayName);
      setPendingUser(user);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setView('verify-email');
      setMessage('أرسلنا رسالة التحقق إلى بريدك.');
    } catch (requestError) {
      setError(toArabicAuthError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (email: string) => {
    setBusy(true);
    clearFeedback();
    try {
      await firebaseAuthClient.sendPasswordReset(email);
      setMessage('إذا كان البريد مسجلًا فستصلك رسالة الاستعادة خلال دقائق.');
    } catch (requestError) {
      setError(toArabicAuthError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    if (resendCooldown > 0) return;
    setBusy(true);
    clearFeedback();
    try {
      await firebaseAuthClient.resendVerification();
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage('أعيد إرسال رسالة التحقق.');
    } catch (requestError) {
      setError(toArabicAuthError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const refreshVerification = async () => {
    setBusy(true);
    clearFeedback();
    try {
      const user = await firebaseAuthClient.refreshCurrentUser();
      if (!user?.emailVerified) {
        setError('لم يتم تأكيد البريد بعد. افتح الرسالة ثم أعد المحاولة.');
        return;
      }
      await establishSession(user);
    } catch (requestError) {
      setError(toArabicAuthError(requestError));
    } finally {
      if (!establishingRef.current) setBusy(false);
    }
  };

  const logoutPendingUser = async () => {
    setBusy(true);
    clearFeedback();
    try {
      await firebaseAuthClient.logout();
      setPendingUser(null);
      setView('login');
    } catch (requestError) {
      setError(toArabicAuthError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const configurationReady = identityClientConfig.enabled && isIdentityClientConfigured();

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-gray-950 p-4 text-white" dir="rtl">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-8">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500 text-gray-950 shadow-xl shadow-cyan-950/50">
            <Tv className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black">REO LIVE</h1>
            <p className="text-xs font-mono text-cyan-300">Identity Foundation</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-2 border-b border-gray-800 pb-4">
            <ShieldCheck className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-black">
              {view === 'signup' ? 'إنشاء حساب' : view === 'forgot-password' ? 'استعادة كلمة المرور' : view === 'verify-email' ? 'تأكيد البريد' : 'تسجيل الدخول'}
            </h2>
          </div>

          {!configurationReady ? (
            <p role="alert" className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-3 text-sm text-amber-100">إعدادات حسابات Staging غير مكتملة. استخدم الدخول القديم حاليًا.</p>
          ) : view === 'signup' ? (
            <SignupForm busy={busy} error={error} onSubmit={signup} onLogin={() => { clearFeedback(); setView('login'); }} />
          ) : view === 'forgot-password' ? (
            <ForgotPasswordForm busy={busy} error={error} message={message} onSubmit={resetPassword} onBack={() => { clearFeedback(); setView('login'); }} />
          ) : view === 'verify-email' ? (
            <VerifyEmailView email={pendingUser?.email ?? ''} busy={busy} resendCooldown={resendCooldown} error={error} message={message} onRefresh={refreshVerification} onResend={resendVerification} onLogout={logoutPendingUser} />
          ) : (
            <LoginForm busy={busy} error={error} onSubmit={login} onForgotPassword={() => { clearFeedback(); setView('forgot-password'); }} onSignup={() => { clearFeedback(); setView('signup'); }} />
          )}
        </div>

        <details className="mt-4 rounded-lg border border-gray-800 bg-gray-900/70">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-300">الدخول القديم / Legacy Access</summary>
          <div className="border-t border-gray-800 p-3">{legacyAccess}</div>
        </details>
      </div>
    </div>
  );
}
