import { LoaderCircle, LogOut, MailCheck, RefreshCw } from 'lucide-react';

interface VerifyEmailViewProps {
  email: string;
  busy: boolean;
  resendCooldown: number;
  error: string;
  message: string;
  onRefresh: () => Promise<void>;
  onResend: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export default function VerifyEmailView({ email, busy, resendCooldown, error, message, onRefresh, onResend, onLogout }: VerifyEmailViewProps) {
  return (
    <div className="space-y-4 text-center">
      <MailCheck className="mx-auto h-12 w-12 text-cyan-300" />
      <div>
        <h2 className="text-xl font-black text-white">تحقق من بريدك الإلكتروني</h2>
        <p className="mt-2 text-sm text-gray-400" dir="ltr">{email}</p>
      </div>
      {message && <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void onRefresh()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 font-black text-gray-950 hover:bg-cyan-400 disabled:opacity-50">
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        تم التحقق، متابعة
      </button>
      <button type="button" disabled={busy || resendCooldown > 0} onClick={() => void onResend()} className="w-full rounded-lg border border-gray-700 px-4 py-3 text-sm font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
        {resendCooldown > 0 ? `إعادة الإرسال بعد ${resendCooldown} ثانية` : 'إعادة إرسال رسالة التحقق'}
      </button>
      <button type="button" disabled={busy} onClick={() => void onLogout()} className="flex w-full items-center justify-center gap-2 text-sm text-gray-400 hover:text-white disabled:opacity-50">
        <LogOut className="h-4 w-4" />
        تسجيل الخروج
      </button>
    </div>
  );
}
