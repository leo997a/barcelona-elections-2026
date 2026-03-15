
import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle, HelpCircle, XCircle, Lock, Key, Copy } from 'lucide-react';
import { syncManager } from '../services/syncManager';

const Settings: React.FC = () => {
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- API Encryption Tool State ---
  const [rawApiKey, setRawApiKey] = useState('');
  const [encryptedResult, setEncryptedResult] = useState('');

  useEffect(() => {
      const stored = syncManager.getStoredConfig();
      if (stored) {
          try {
              setConfigJson(JSON.stringify(JSON.parse(stored), null, 2));
          } catch (e) {
              setConfigJson(stored);
          }
      }
  }, []);

  const handleSave = () => {
      setError(null);
      try {
          const parsed = JSON.parse(configJson);

          // 🛡️ Smart Check: Did user paste Service Account JSON?
          if (parsed.type === 'service_account' || parsed.private_key) {
              setError("⚠️ خطأ: لقد قمت بلصق مفاتيح السيرفر (Service Account) وهذا غير صحيح للمتصفح.\n\nالمطلوب هو إعدادات الويب (Web Config) التي تحتوي على 'apiKey'.\n\nاذهب إلى: Firebase Console > Project Settings > General > Your Apps (بالأسفل).");
              return;
          }

          if (!parsed.apiKey || !parsed.databaseURL) {
              setError("يبدو أن التكوين غير مكتمل. تأكد من وجود 'apiKey' و 'databaseURL'.");
              return;
          }
          
          syncManager.updateConfig(parsed);
          alert("تم حفظ الإعدادات بنجاح! سيتم إعادة تحميل الصفحة لتفعيل الاتصال.");
      } catch (e) {
          setError("خطأ في تنسيق JSON. تأكد من صحة الكود المنسوخ.");
      }
  };

  const handleClear = () => {
      if(confirm('هل أنت متأكد من حذف إعدادات الربط؟ سيتوقف البث عن التحديث في OBS.')) {
        localStorage.removeItem('rge_firebase_config');
        window.location.reload();
      }
  };

  // --- API Key Encryption Logic ---
  const handleEncryptKey = () => {
      if (!rawApiKey) return;
      const salt = "RGE_HOST_V3"; // Must match services/geminiService.ts
      let xor = '';
      for (let i = 0; i < rawApiKey.length; i++) {
          xor += String.fromCharCode(rawApiKey.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
      }
      const b64 = btoa(xor);
      setEncryptedResult(b64);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in-up space-y-12">
      
      {/* SECTION 1: FIREBASE CLOUD SYNC */}
      <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="text-blue-500">⚙️</span>
                إعدادات الربط السحابي (Cloud Sync)
            </h1>
            <p className="text-gray-400">
                لضمان تحديث OBS فورياً، اربط التطبيق بمشروع <strong>unoreo</strong>.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-yellow-500" />
                        أين أجد الكود الصحيح؟
                    </h3>
                    <ol className="list-decimal list-inside space-y-3 text-sm text-gray-300 leading-relaxed">
                        <li>اذهب إلى <a href="https://console.firebase.google.com/project/unoreo/settings/general" target="_blank" className="text-blue-400 underline">إعدادات مشروع unoreo</a>.</li>
                        <li>انزل إلى أسفل الصفحة لقسم <strong>Your apps</strong>.</li>
                        <li>إذا لم تجد تطبيقاً، اضغط على أيقونة الويب <strong>(&lt;/&gt;)</strong> لإنشاء واحد.</li>
                        <li>انسخ كود <code>firebaseConfig</code> الذي يظهر لك.</li>
                        <li>
                            <strong>تأكد من القواعد (Rules):</strong>
                            <div className="mt-2 bg-black p-2 rounded text-green-400 font-mono text-[10px]" dir="ltr">
    {`{ "rules": { ".read": true, ".write": true } }`}
                            </div>
                        </li>
                    </ol>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white">بيانات الاتصال (Web Config)</h3>
                        {syncManager.getStatus() === 'cloud' ? (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-900/50">
                                <CheckCircle className="w-3 h-3" /> متصل بـ unoreo
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-900/50">
                                <AlertTriangle className="w-3 h-3" /> وضع محلي
                            </span>
                        )}
                    </div>
                    
                    {error && (
                        <div className="mb-4 bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex gap-3 items-start">
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-200 whitespace-pre-line">{error}</p>
                        </div>
                    )}

                    <textarea 
                        value={configJson}
                        onChange={(e) => setConfigJson(e.target.value)}
                        placeholder={'{ "apiKey": "AIza...", "authDomain": "unoreo.firebaseapp.com", ... }'}
                        className={`w-full h-40 bg-black border rounded-lg p-4 font-mono text-xs text-blue-300 focus:outline-none custom-scrollbar ${error ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'}`}
                        dir="ltr"
                    />

                    <div className="flex gap-3 mt-4">
                        <button 
                            onClick={handleSave}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            حفظ واتصال
                        </button>
                        {configJson && (
                            <button 
                                onClick={handleClear}
                                className="px-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg border border-red-900/50 transition-colors"
                            >
                                حذف
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="h-px bg-gray-800 my-8"></div>

      {/* SECTION 2: API KEY BURYING TOOL */}
      <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <Lock className="text-green-500 w-6 h-6" />
                تضمين مفتاح الذكاء الاصطناعي (API Key Embedder)
            </h2>
            <p className="text-gray-400">
                استخدم هذه الأداة إذا كنت تريد تشغيل الذكاء الاصطناعي على استضافات خارجية (مثل Vercel) دون الحاجة لضبط Environment Variables.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Step 1: Input */}
                  <div className="space-y-4">
                      <label className="block text-sm font-bold text-gray-300">1. ضع مفتاح Gemini API هنا:</label>
                      <div className="relative">
                          <Key className="absolute top-3 left-3 w-5 h-5 text-gray-500" />
                          <input 
                            type="text" 
                            value={rawApiKey}
                            onChange={(e) => setRawApiKey(e.target.value)}
                            placeholder="AIzaSy..." 
                            className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-lg text-white font-mono focus:border-green-500 focus:outline-none"
                          />
                      </div>
                      <button 
                        onClick={handleEncryptKey}
                        disabled={!rawApiKey}
                        className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-500 text-white py-3 rounded-lg font-bold transition-colors"
                      >
                        تشفير المفتاح (Encrypt)
                      </button>
                  </div>

                  {/* Step 2: Output */}
                  <div className="space-y-4 relative">
                      <label className="block text-sm font-bold text-gray-300">2. انسخ الكود الناتج:</label>
                      <div className="relative">
                          <textarea 
                             readOnly
                             value={encryptedResult ? `const BURIED_KEY = "${encryptedResult}";` : '// النتيجة ستظهر هنا...'}
                             className="w-full h-32 bg-gray-950 border border-gray-700 rounded-lg p-4 font-mono text-xs text-green-400 focus:outline-none"
                             dir="ltr"
                          />
                          {encryptedResult && (
                             <button 
                                onClick={() => navigator.clipboard.writeText(`const BURIED_KEY = "${encryptedResult}";`)}
                                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                                title="نسخ"
                             >
                                 <Copy className="w-4 h-4" />
                             </button>
                          )}
                      </div>
                      <p className="text-xs text-gray-500">
                          3. ألصق هذا الكود في ملف <code>services/geminiService.ts</code> مكان المتغير <code>BURIED_KEY</code>.
                      </p>
                  </div>

              </div>
          </div>
      </div>

    </div>
  );
};

export default Settings;
