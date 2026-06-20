import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, LoaderCircle, LogIn } from 'lucide-react';

interface LoginFormProps {
  busy: boolean;
  error: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  onSignup: () => void;
}

export default function LoginForm({ busy, error, onSubmit, onForgotPassword, onSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!busy && email.trim() && password) void onSubmit(email, password);
  };

  return (
    <form onSubmit={submit} autoComplete="on" className="space-y-4">
      <div>
        <label htmlFor="reo-account-email" className="mb-2 block text-sm font-semibold text-gray-200">البريد الإلكتروني</label>
        <input
          id="reo-account-email"
          type="email"
          name="username"
          autoComplete="username"
          inputMode="email"
          dir="ltr"
          value={email}
          onChange={event => setEmail(event.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-left text-white outline-none transition-colors focus:border-cyan-400"
          placeholder="email@example.com"
          required
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="reo-account-password" className="text-sm font-semibold text-gray-200">كلمة المرور</label>
          <button type="button" onClick={onForgotPassword} className="text-xs text-cyan-300 hover:text-cyan-200">نسيت كلمة المرور</button>
        </div>
        <div className="relative">
          <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            id="reo-account-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            dir="ltr"
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-10 py-3 text-left text-white outline-none transition-colors focus:border-cyan-400"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}
      <button
        type="submit"
        disabled={busy || !email.trim() || !password}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 font-black text-gray-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
        تسجيل الدخول
      </button>
      <button type="button" onClick={onSignup} className="w-full text-sm text-gray-300 hover:text-white">
        إنشاء حساب جديد
      </button>
    </form>
  );
}
