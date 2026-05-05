
import React, { useState, useEffect } from 'react';
import { OverlayConfig } from './types';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Library from './pages/Library';
import Operator from './pages/Operator';
import Editor from './pages/Editor';
import Integrations from './pages/Integrations'; 
import Settings from './pages/Settings';
import OverlayRenderer from './components/OverlayRenderer';
import { Volume2, CloudLightning, Tv, AlertTriangle } from 'lucide-react';
import { syncManager } from './services/syncManager';
import { createOverlayFromTemplate } from './utils/templateRegistry';
import { licenseService, LicenseState } from './services/licenseService';

const AudioUnlockOverlay = () => {
    const [visible, setVisible] = useState(true);
    
    const handleUnlock = () => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            ctx.resume().then(() => {
                setVisible(false);
                setTimeout(() => ctx.close(), 1000);
            });
        } else {
            setVisible(false);
        }
    };
    
    if (!visible) return null;
    
    return (
        <div 
            onClick={handleUnlock} 
            className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer group hover:bg-black/10 transition-colors"
            title="انقر لتفعيل الصوت"
        >
             <div className="bg-black/80 text-white px-6 py-3 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 duration-300 shadow-2xl border border-white/10">
                 <Volume2 className="w-5 h-5 text-green-400 animate-pulse" />
                 <span className="text-sm font-bold">انقر في أي مكان لتفعيل الصوت</span>
             </div>
        </div>
    );
};

const App: React.FC = () => {
  const [overlays, setOverlays] = useState<OverlayConfig[]>([]);
  const [route, setRoute] = useState<string>('home'); 
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [hashPath, setHashPath] = useState(window.location.hash);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('rge_favorites') || '[]'); } catch { return []; }
  });
  const [license, setLicense] = useState<LicenseState | null>(() => licenseService.getStored());
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseLoading, setLicenseLoading] = useState(false);

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseError('');
    setLicenseLoading(true);
    try {
      const state = await licenseService.activate(licenseKey.trim());
      setLicense(state);
    } catch (err) {
      setLicenseError(err instanceof Error ? err.message : 'فشل التحقق من المفتاح.');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleToggleFavorite = (id: string) => {
    setFavoriteIds(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('rge_favorites', JSON.stringify(next));
      return next;
    });
  };
  
  // Handle Hash Routing (Output Window)
  useEffect(() => {
    const handleHashChange = () => setHashPath(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync Manager Subscription
  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setOverlays);
    return unsubscribe;
  }, []);
  
  // Actions delegated to SyncManager
  const handleCreateOverlay = (templateId: string) => {
    syncManager.addOverlay(createOverlayFromTemplate(templateId, overlays));
    setRoute('library');
  };

  const handleDeleteOverlay = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
       syncManager.deleteOverlay(id);
    }
  };

  // ── License Gate inner state ──────────────────────────────────────────────
  const [showGenPanel, setShowGenPanel] = React.useState(false);
  const [genSecret, setGenSecret] = React.useState('');
  const [genRole, setGenRole] = React.useState('ADMIN');
  const [genDays, setGenDays] = React.useState(0);
  const [genResult, setGenResult] = React.useState('');
  const [genErr, setGenErr] = React.useState('');
  const [genLoading2, setGenLoading2] = React.useState(false);

  const handleGenerate = async () => {
    setGenErr(''); setGenResult(''); setGenLoading2(true);
    try {
      const res = await fetch('/api/license', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', adminSecret: genSecret, role: genRole, studioId: 'reo-main', daysValid: genDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التوليد');
      setGenResult(data.key);
      setLicenseKey(data.key); // auto-fill in activate box
    } catch(e) { setGenErr(e instanceof Error ? e.message : 'خطأ'); }
    finally { setGenLoading2(false); }
  };

  // ----------------------------------------------------
  // RENDER: License Gate
  // ----------------------------------------------------
  if (!license?.valid) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-[200] p-4 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">REO LIVE</h1>
              <p className="text-blue-400 text-xs font-mono">Broadcast Studio</p>
            </div>
          </div>

          {/* ── ACTIVATE PANEL ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl mb-3">
            <h2 className="text-lg font-black text-white mb-1 text-center">تفعيل الاستوديو</h2>
            <p className="text-gray-500 text-xs text-center mb-5">الصق مفتاح الترخيص هنا</p>

            <form onSubmit={handleActivateLicense} className="space-y-3">
              <input
                type="text"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                placeholder="REO-XXXX-XXXX-XXXX-XXXX"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-center tracking-widest"
                dir="ltr"
              />
              {licenseError && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{licenseError}</p>
                </div>
              )}
              <button type="submit" disabled={licenseLoading || !licenseKey.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/30">
                {licenseLoading ? 'جاري التحقق...' : '🔐 دخول الاستوديو'}
              </button>
            </form>
          </div>

          {/* ── ADMIN GENERATOR (collapsible) ── */}
          <div className="bg-gray-900 border border-yellow-900/40 rounded-2xl overflow-hidden shadow-xl">
            <button
              onClick={() => setShowGenPanel(p => !p)}
              className="w-full flex items-center justify-between px-6 py-4 text-yellow-400 hover:bg-yellow-900/10 transition-colors"
            >
              <span className="text-sm font-bold flex items-center gap-2">
                <span>⚡</span> أنا المسؤول — أريد توليد مفتاح
              </span>
              <span className="text-gray-500 text-xs">{showGenPanel ? '▲ إخفاء' : '▼ فتح'}</span>
            </button>

            {showGenPanel && (
              <div className="px-6 pb-6 border-t border-yellow-900/30 pt-4 space-y-3">
                <p className="text-gray-500 text-xs">أدخل كلمة سر المسؤول من Vercel (LICENSE_ADMIN_SECRET) لتوليد مفتاح جديد</p>

                <input type="password" value={genSecret} onChange={e => setGenSecret(e.target.value)}
                  placeholder="LICENSE_ADMIN_SECRET"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-yellow-500"
                  dir="ltr" />

                <div className="grid grid-cols-2 gap-2">
                  {(['ADMIN','EDITOR','OPERATOR','VIEWER'] as const).map(r => (
                    <button key={r} onClick={() => setGenRole(r)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${genRole === r ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40' : 'text-gray-600 border-gray-800'}`}>
                      {r === 'ADMIN' ? '👑 مسؤول' : r === 'EDITOR' ? '✏️ محرر' : r === 'OPERATOR' ? '▶️ مشغل' : '👁 مشاهد'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-500 whitespace-nowrap">صلاحية (يوم):</label>
                  <input type="number" value={genDays} onChange={e => setGenDays(Number(e.target.value))} min={0}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-yellow-500" />
                  <span className="text-gray-600 text-xs">0 = لا تنتهي</span>
                </div>

                <button onClick={handleGenerate} disabled={!genSecret || genLoading2}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-black font-black py-2.5 rounded-lg text-sm transition-colors">
                  {genLoading2 ? '⏳ جاري التوليد...' : '⚡ توليد المفتاح'}
                </button>

                {genErr && <p className="text-red-400 text-xs bg-red-900/20 p-2 rounded-lg text-center">{genErr}</p>}

                {genResult && (
                  <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 text-center">
                    <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider mb-2">✅ تم التوليد — سيُملأ تلقائياً ↑</p>
                    <div className="font-mono text-white font-black tracking-widest text-sm break-all bg-black/40 rounded-lg p-3">
                      {genResult}
                    </div>
                    <p className="text-gray-500 text-[10px] mt-2">اضغط "دخول الاستوديو" أعلاه الآن</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }


  // ----------------------------------------------------
  // RENDER: Output View (Browser Source)
  // ----------------------------------------------------
  if (hashPath.startsWith('#/output/')) {
    const id = hashPath.split('/output/')[1]?.split('?')[0];
    const overlay = overlays.find(o => o.id === id);
    
    if (!overlay) return (
      <div className="flex flex-col items-center justify-center h-screen bg-transparent text-gray-400 font-mono space-y-4">
        <div className="bg-black/50 p-4 rounded-full backdrop-blur-md animate-pulse flex items-center gap-3">
            <CloudLightning className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white">Connecting to RGE Cloud...</span>
        </div>
      </div>
    );

    return (
       <div className="w-screen h-screen overflow-hidden bg-transparent relative">
         <AudioUnlockOverlay />
         <OverlayRenderer config={overlay} />
       </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Main App
  // ----------------------------------------------------
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden" dir="rtl">
      {selectedOverlayId && selectedOverlay ? (
        <div className="w-full h-full">
           <Editor 
             overlay={selectedOverlay} 
             onBack={() => setSelectedOverlayId(null)}
           />
        </div>
      ) : (
        <>
          <Sidebar activePage={route} onNavigate={setRoute} favoriteCount={favoriteIds.length} />
          
          <main className="flex-1 overflow-y-auto bg-gray-950 relative">
             <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
             
             <div className="relative z-10 h-full">
               {route === 'home' && (
                  <Home 
                    overlays={overlays}
                    onNavigate={setRoute}
                    onCreate={handleCreateOverlay}
                  />
               )}

               {route === 'library' && (
                 <Library 
                   overlays={overlays} 
                   onSelect={setSelectedOverlayId}
                   onDelete={handleDeleteOverlay}
                   onCreate={handleCreateOverlay}
                   onNavigateOperator={() => setRoute('operator')}
                   favoriteIds={favoriteIds}
                   onToggleFavorite={handleToggleFavorite}
                 />
               )}
               
               {route === 'operator' && (
                   <Operator 
                     overlays={overlays}
                     onUpdate={(o) => syncManager.updateOverlay(o)}
                   />
               )}

               {route === 'integrations' && <Integrations overlays={overlays} />}

               {route === 'settings' && <Settings />}
             </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
