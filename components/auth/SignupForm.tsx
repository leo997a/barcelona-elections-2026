import React, { useRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, UserPlus } from 'lucide-react';

interface SignupFormProps {
  busy: boolean;
  error: string;
  onSubmit: (data: { email: string; password: string; displayName: string; honeypot: string; elapsedMs: number }) => Promise<void>;
  onLogin: () => void;
}

export default function SignupForm({ busy, error, onSubmit, onLogin }: SignupFormProps) {
  const openedAt = useRef(Date.now());
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    if (password.length < 8) {
      setLocalError('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('تأكيد كلمة المرور غير مطابق.');
      return;
    }
    if (!busy) {
      void onSubmit({
        email,
        password,
        displayName,
        honeypot: website,
        elapsedMs: Date.now() - openedAt.current,
      });
    }
  };

  return (
    <form onSubmit={submit} autoComplete="on" className="space-y-4">
      <div className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="reo-account-website">Website</label>
        <input id="reo-account-website" name="website" tabIndex={-1} autoComplete="url" value={website} onChange={event => setWebsite(event.target.value)} />
      </div>
      <div>
        <label htmlFor="reo-signup-name" className="mb-2 block text-sm font-semibold text-gray-200">الاسم</label>
        <input id="reo-signup-name" name="name" autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-400" />
      </div>
      <div>
        <label htmlFor="reo-signup-email" className="mb-2 block text-sm font-semibold text-gray-200">البريد الإلكتروني</label>
        <input id="reo-signup-email" type="email" name="username" autoComplete="username" inputMode="email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-left text-white outline-none focus:border-cyan-400" required />
      </div>
      <div>
        <label htmlFor="reo-signup-password" className="mb-2 block text-sm font-semibold text-gray-200">كلمة المرور</label>
        <div className="relative">
          <input id="reo-signup-password" type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" dir="ltr" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 pl-10 text-left text-white outline-none focus:border-cyan-400" required />
          <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="reo-signup-confirm" className="mb-2 block text-sm font-semibold text-gray-200">تأكيد كلمة المرور</label>
        <input id="reo-signup-confirm" type={showPassword ? 'text' : 'password'} name="new-password-confirmation" autoComplete="new-password" dir="ltr" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-left text-white outline-none focus:border-cyan-400" required />
      </div>
      {(localError || error) && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200">{localError || error}</p>}
      <button type="submit" disabled={busy || !email.trim() || !password || !confirmPassword} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 font-black text-gray-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
        إنشاء الحساب
      </button>
      <button type="button" onClick={onLogin} className="w-full text-sm text-gray-300 hover:text-white">لدي حساب بالفعل</button>
    </form>
  );
}
