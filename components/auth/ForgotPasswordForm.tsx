import React, { useState } from 'react';
import { ArrowRight, LoaderCircle, Mail } from 'lucide-react';

interface ForgotPasswordFormProps {
  busy: boolean;
  error: string;
  message: string;
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
}

export default function ForgotPasswordForm({ busy, error, message, onSubmit, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!busy && email.trim()) void onSubmit(email);
  };

  return (
    <form onSubmit={submit} autoComplete="on" className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white">
        <ArrowRight className="h-4 w-4" />
        العودة لتسجيل الدخول
      </button>
      <div>
        <label htmlFor="reo-reset-email" className="mb-2 block text-sm font-semibold text-gray-200">البريد الإلكتروني</label>
        <input id="reo-reset-email" type="email" name="username" autoComplete="username" inputMode="email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-left text-white outline-none focus:border-cyan-400" required />
      </div>
      {message && <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}
      <button type="submit" disabled={busy || !email.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 font-black text-gray-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
        إرسال رابط الاستعادة
      </button>
    </form>
  );
}
