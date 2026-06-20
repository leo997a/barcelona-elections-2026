import React from 'react';
import { AlertTriangle, Eye, EyeOff, Tv } from 'lucide-react';

interface LegacyLicenseGateProps {
  email: string;
  licenseKey: string;
  error: string;
  loading: boolean;
  showLicenseKey: boolean;
  embedded?: boolean;
  onEmailChange: (value: string) => void;
  onLicenseKeyChange: (value: string) => void;
  onToggleLicenseKey: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const LicensePanel = ({
  email,
  licenseKey,
  error,
  loading,
  showLicenseKey,
  onEmailChange,
  onLicenseKeyChange,
  onToggleLicenseKey,
  onSubmit,
  embedded,
}: LegacyLicenseGateProps) => (
  <div className={embedded ? '' : 'bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl'}>
    <h2 className="text-lg font-black text-white mb-1 text-center">تفعيل الاستوديو</h2>
    <p className="text-gray-500 text-xs text-center mb-5">أدخل البريد ومفتاح الدخول فقط</p>

    <form onSubmit={onSubmit} className="space-y-3" autoComplete="on">
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={email}
        onChange={event => onEmailChange(event.target.value)}
        placeholder="email@example.com"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-center"
        dir="ltr"
        inputMode="email"
        required
      />
      <div className="relative">
        <input
          type={showLicenseKey ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          value={licenseKey}
          onChange={event => onLicenseKeyChange(event.target.value)}
          placeholder="REO-XXXX-XXXX-XXXX-XXXX"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-center tracking-widest"
          dir="ltr"
          required
        />
        <button
          type="button"
          onClick={onToggleLicenseKey}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-700/70 hover:text-white transition-colors"
          aria-label={showLicenseKey ? 'إخفاء مفتاح الدخول' : 'إظهار مفتاح الدخول'}
        >
          {showLicenseKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !licenseKey.trim() || !email.trim()}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-lg transition-colors shadow-lg shadow-blue-900/30"
      >
        {loading ? 'جاري التحقق...' : 'دخول الاستوديو'}
      </button>
    </form>
  </div>
);

export default function LegacyLicenseGate(props: LegacyLicenseGateProps) {
  const panel = <LicensePanel {...props} />;
  if (props.embedded) return panel;

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-[200] p-4 overflow-y-auto">
      <div className="w-full max-w-lg py-8">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">REO LIVE</h1>
            <p className="text-blue-400 text-xs font-mono">Broadcast Studio</p>
          </div>
        </div>
        {panel}
      </div>
    </div>
  );
}
