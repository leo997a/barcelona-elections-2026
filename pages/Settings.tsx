import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  RefreshCcw,
  Save,
  Server,
  Shield,
  Trash2,
  Wifi,
  Lock,
  Unlock,
  Plus,
} from 'lucide-react';
import { licenseService, LicenseState } from '../services/licenseService';
import { FirebaseWebConfig } from '../types';
import { syncManager } from '../services/syncManager';

const RULES_SNIPPET = `{
  "rules": {
    "rgeSecure": {
      "v1": {
        "studios": {
          "$studioId": {
            "operators": {
              "$uid": {
                ".read": false,
                ".write": "auth != null && auth.uid === $uid"
              }
            },
            "state": {
              "$viewerKey": {
                ".read": "auth != null",
                ".write": "auth != null && root.child('rgeSecure/v1/studios/' + $studioId + '/operators/' + auth.uid).exists()"
              }
            },
            "commands": {
              "$controlKey": {
                ".read": "auth != null && root.child('rgeSecure/v1/studios/' + $studioId + '/operators/' + auth.uid).exists()",
                ".write": "auth != null"
              }
            }
          }
        }
      }
    }
  }
}`;

const SERVER_ENV_SNIPPET = `GEMINI_API_KEY=your_gemini_key
EDITOR_ADMIN_PASSCODE=choose_a_private_passcode
ADMIN_SESSION_SECRET=choose_a_long_random_secret`;

const Settings: React.FC = () => {
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── License state ──────────────────────────────────────────────────────────
  const [currentLicense, setCurrentLicense] = useState<LicenseState | null>(() => licenseService.getStored());
  
  // Generator form (admin only)
  const [genAdminSecret, setGenAdminSecret] = useState('');
  const [genRole, setGenRole] = useState<'VIEWER'|'OPERATOR'|'EDITOR'|'ADMIN'>('EDITOR');
  const [genStudioId, setGenStudioId] = useState('reo-studio-1');
  const [genDays, setGenDays] = useState(0);
  const [generatedKey, setGeneratedKey] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  const handleGenerateKey = async () => {
    setGenError('');
    setGeneratedKey('');
    setGenLoading(true);
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', adminSecret: genAdminSecret, role: genRole, studioId: genStudioId, daysValid: genDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل توليد المفتاح');
      setGeneratedKey(data.key);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'خطأ غير متوقع');
    } finally {
      setGenLoading(false);
    }
  };

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'text-red-400 bg-red-900/20 border-red-700/40',
    EDITOR: 'text-blue-400 bg-blue-900/20 border-blue-700/40',
    OPERATOR: 'text-green-400 bg-green-900/20 border-green-700/40',
    VIEWER: 'text-gray-400 bg-gray-800/40 border-gray-700/40',
  };
  const ROLE_LABEL: Record<string, string> = {
    ADMIN: 'مسؤول كامل',
    EDITOR: 'محرر',
    OPERATOR: 'مشغل',
    VIEWER: 'مشاهد',
  };

  const secureConfig = useMemo(() => syncManager.getSecureConfig(), []);
  const status = syncManager.getStatus();
  const lastError = syncManager.getLastError();

  useEffect(() => {
    if (!secureConfig) return;

    const webConfig: FirebaseWebConfig = {
      apiKey: secureConfig.apiKey,
      authDomain: secureConfig.authDomain,
      databaseURL: secureConfig.databaseURL,
      projectId: secureConfig.projectId,
      appId: secureConfig.appId,
      messagingSenderId: secureConfig.messagingSenderId,
      storageBucket: secureConfig.storageBucket,
      measurementId: secureConfig.measurementId,
    };

    setConfigJson(JSON.stringify(webConfig, null, 2));
  }, [secureConfig]);

  const copyText = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    setSuccess(message);
    setTimeout(() => setSuccess(null), 2500);
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    try {
      const parsed = JSON.parse(configJson) as Partial<FirebaseWebConfig>;

      if (parsed.apiKey?.startsWith('AIza') !== true) {
        setError('الرجاء إدخال Web Config صحيح من Firebase، وليس ملف Service Account.');
        return;
      }

      if (!parsed.apiKey || !parsed.authDomain || !parsed.databaseURL || !parsed.projectId) {
        setError('يلزم وجود apiKey و authDomain و databaseURL و projectId على الأقل.');
        return;
      }

      syncManager.updateConfig(parsed as FirebaseWebConfig);
      setSuccess('تم حفظ الربط الآمن. أعد تحميل الصفحة لتفعيل الاتصال الجديد.');
    } catch (saveError) {
      console.error('Failed to save secure sync config', saveError);
      setError('صيغة JSON غير صالحة. راجع البيانات ثم حاول مرة أخرى.');
    }
  };

  const handleClear = () => {
    syncManager.clearConfig();
    setConfigJson('');
    setSuccess('تم حذف إعدادات الربط الآمن. أعد تحميل الصفحة للعودة إلى الوضع المحلي.');
    setError(null);
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up space-y-10 p-8">

      {/* ── LICENSE SECTION ────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-950/50 via-gray-950 to-gray-900 p-8 shadow-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-200">
          <KeyRound className="h-3.5 w-3.5" />
          نظام الترخيص
        </div>
        <h2 className="text-2xl font-black text-white mb-6">🔐 مفاتيح الترخيص والتفعيل</h2>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Current license status */}
          <div className="rounded-2xl border border-gray-800 bg-black/30 p-6">
            <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
              {currentLicense?.valid ? <Unlock className="w-4 h-4 text-green-400" /> : <Lock className="w-4 h-4 text-red-400" />}
              الترخيص الحالي
            </h3>
            {currentLicense?.valid ? (
              <>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border mb-4 ${ROLE_COLORS[currentLicense.role] || ''}`}>
                  {ROLE_LABEL[currentLicense.role] || currentLicense.role}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>معرف الاستوديو</span>
                    <span className="font-mono text-blue-300">{currentLicense.studioId}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>انتهاء الصلاحية</span>
                    <span className="font-mono text-green-300">{currentLicense.exp === 0 ? 'لا تنتهي أبداً' : new Date(currentLicense.exp * 1000).toLocaleDateString('ar')}</span>
                  </div>
                  <div className="pt-2 font-mono text-[10px] text-gray-600 break-all bg-black/30 rounded-lg p-2">
                    {currentLicense.key}
                  </div>
                </div>
                <button onClick={() => { licenseService.revoke(); setCurrentLicense(null); window.location.reload(); }}
                  className="mt-4 w-full text-xs text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg py-2 transition-colors">
                  إلغاء الترخيص
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد ترخيص مفعّل</p>
              </div>
            )}
          </div>

          {/* Key Generator */}
          <div className="rounded-2xl border border-yellow-800/40 bg-yellow-900/10 p-6">
            <h3 className="text-sm font-bold text-yellow-300 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              توليد مفتاح جديد (للمسؤول فقط)
            </h3>

            <div className="space-y-3">
              {/* Admin Secret */}
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">كلمة سر المسؤول</label>
                <input type="password" value={genAdminSecret} onChange={e => setGenAdminSecret(e.target.value)}
                  placeholder="LICENSE_ADMIN_SECRET من Vercel"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-yellow-500 font-mono"
                  dir="ltr" />
              </div>

              {/* Role */}
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">مستوى الصلاحية</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['ADMIN','EDITOR','OPERATOR','VIEWER'] as const).map(r => (
                    <button key={r} onClick={() => setGenRole(r)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${genRole === r ? ROLE_COLORS[r] : 'text-gray-600 border-gray-800 bg-transparent'}`}>
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Studio ID */}
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">معرف الاستوديو</label>
                <input value={genStudioId} onChange={e => setGenStudioId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-500 font-mono"
                  dir="ltr" />
              </div>

              {/* Days Valid */}
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">مدة الصلاحية (يوم، 0 = لا تنتهي)</label>
                <input type="number" value={genDays} onChange={e => setGenDays(Number(e.target.value))} min={0}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-500 font-mono" />
              </div>

              <button onClick={handleGenerateKey} disabled={!genAdminSecret || genLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-black font-black py-2.5 rounded-lg text-sm transition-colors mt-1">
                {genLoading ? 'جاري التوليد...' : '⚡ إنشاء المفتاح'}
              </button>

              {genError && <p className="text-red-400 text-xs bg-red-900/20 p-2 rounded-lg">{genError}</p>}

              {generatedKey && (
                <div className="mt-2 p-4 bg-green-900/20 border border-green-700/40 rounded-xl">
                  <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">✅ المفتاح جاهز</p>
                  <div className="font-mono text-lg text-white font-black tracking-widest text-center bg-black/40 rounded-lg py-3 px-2 break-all">
                    {generatedKey}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(generatedKey)}
                    className="w-full mt-2 text-xs text-green-400 border border-green-700/40 rounded-lg py-1.5 hover:bg-green-900/20 transition-colors">
                    نسخ المفتاح
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950 via-gray-950 to-gray-900 p-8 shadow-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
            <Shield className="h-3.5 w-3.5" />
            مرحلة الإنقاذ التقني
          </div>
          <h1 className="text-3xl font-black text-white md:text-4xl">الحماية والربط الآمن</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300">
            هذه الصفحة أصبحت نقطة التحكم المركزية لربط Firebase الآمن، تفعيل جلسات المسؤول، وإخراج
            مفاتيح الذكاء الاصطناعي من الواجهة إلى بيئة الخادم.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                <Wifi className="h-4 w-4 text-cyan-400" />
                وضع المزامنة
              </div>
              <div className="text-sm text-gray-300">
                {status === 'secure' && 'ربط آمن نشط'}
                {status === 'connecting' && 'جارٍ إنشاء الاتصال'}
                {status === 'local' && 'وضع محلي فقط'}
                {status === 'error' && 'حدثت مشكلة في الربط الآمن'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                <KeyRound className="h-4 w-4 text-emerald-400" />
                معرف الاستوديو
              </div>
              <div className="font-mono text-xs text-emerald-300">{syncManager.getStudioId()}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                <Server className="h-4 w-4 text-amber-400" />
                حالة الخادم
              </div>
              <div className="text-sm text-gray-300">
                الذكاء الاصطناعي وجلسة المسؤول يعتمدان الآن على `api/`.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              مفاتيح الوصول الحالية
            </h2>
            {secureConfig ? (
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <div className="rounded-xl border border-gray-800 bg-black/30 p-3">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-gray-500">Viewer Key</div>
                  <div className="font-mono text-xs text-blue-300">{secureConfig.stateAccessKey}</div>
                </div>
                <div className="rounded-xl border border-gray-800 bg-black/30 p-3">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-gray-500">Control Key</div>
                  <div className="font-mono text-xs text-emerald-300">{secureConfig.controlAccessKey}</div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => copyText(secureConfig.stateAccessKey, 'تم نسخ Viewer Key.')}
                    className="flex-1 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-300 hover:bg-blue-500/20"
                  >
                    نسخ مفتاح العرض
                  </button>
                  <button
                    onClick={() => copyText(secureConfig.controlAccessKey, 'تم نسخ Control Key.')}
                    className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    نسخ مفتاح التحكم
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-gray-400">
                لا توجد إعدادات آمنة محفوظة بعد. الأداة تعمل حاليًا في الوضع المحلي.
              </p>
            )}
          </div>

          {(success || error || lastError) && (
            <div
              className={`rounded-2xl border p-4 text-sm leading-7 ${
                error || lastError
                  ? 'border-red-500/30 bg-red-950/30 text-red-200'
                  : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {error || lastError ? (
                  <AlertTriangle className="mt-1 h-4 w-4 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0" />
                )}
                <span>{error || lastError || success}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Firebase Web Config</h2>
            <button
              onClick={() => copyText(configJson || '{}', 'تم نسخ إعدادات Firebase الحالية.')}
              className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 hover:text-white"
              title="نسخ الإعدادات"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-4 text-sm leading-7 text-gray-400">
            الصق Web Config الخاص بتطبيق الويب فقط. لا تستخدم Service Account داخل المتصفح.
          </p>

          <textarea
            value={configJson}
            onChange={event => setConfigJson(event.target.value)}
            placeholder='{"apiKey":"AIza...","authDomain":"project.firebaseapp.com","databaseURL":"https://...","projectId":"..."}'
            className="h-72 w-full rounded-2xl border border-gray-700 bg-black/40 p-4 font-mono text-xs text-blue-200 focus:border-blue-500 focus:outline-none"
            dir="ltr"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"
            >
              <Save className="h-4 w-4" />
              حفظ الربط الآمن
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-5 py-3 text-sm font-bold text-gray-200 hover:bg-gray-700"
            >
              <RefreshCcw className="h-4 w-4" />
              إعادة تحميل الأداة
            </button>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              حذف الربط
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">قواعد Firebase الآمنة</h2>
              <button
                onClick={() => copyText(RULES_SNIPPET, 'تم نسخ قواعد Firebase الآمنة.')}
                className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 hover:text-white"
                title="نسخ القواعد"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">
              يجب تفعيل <strong>Anonymous Authentication</strong> أولاً، ثم وضع هذه القواعد في
              Realtime Database. هذا يلغي نهائيًا فكرة القواعد المفتوحة للجميع.
            </div>

            <pre
              dir="ltr"
              className="custom-scrollbar max-h-72 overflow-auto rounded-2xl border border-gray-800 bg-black/40 p-4 text-[11px] leading-6 text-emerald-300"
            >
              {RULES_SNIPPET}
            </pre>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">متغيرات الخادم المطلوبة</h2>
              <button
                onClick={() => copyText(SERVER_ENV_SNIPPET, 'تم نسخ متغيرات الخادم المطلوبة.')}
                className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 hover:text-white"
                title="نسخ المتغيرات"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm leading-7 text-gray-400">
              هذه المتغيرات يجب إضافتها في Vercel حتى تعمل جلسة المسؤول والذكاء الاصطناعي من
              الخادم بدل المتصفح.
            </p>

            <pre
              dir="ltr"
              className="rounded-2xl border border-gray-800 bg-black/40 p-4 text-[11px] leading-6 text-blue-300"
            >
              {SERVER_ENV_SNIPPET}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
