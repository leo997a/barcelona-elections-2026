
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

  // ----------------------------------------------------
  // RENDER: License Gate
  // ----------------------------------------------------
  if (!license?.valid) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-[200] p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">REO LIVE</h1>
              <p className="text-blue-400 text-xs font-mono">Broadcast Studio</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-2 text-center">تفعيل الاستوديو</h2>
            <p className="text-gray-400 text-sm text-center mb-6">أدخل مفتاح الترخيص للوصول إلى المنصة</p>

            <form onSubmit={handleActivateLicense} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-2">مفتاح الترخيص</label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  placeholder="REO-XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-center tracking-widest"
                  dir="ltr"
                />
              </div>
              {licenseError && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{licenseError}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={licenseLoading || !licenseKey.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/30"
              >
                {licenseLoading ? 'جاري التحقق...' : '🔐 تفعيل الاستوديو'}
              </button>
            </form>

            <p className="text-center text-gray-600 text-xs mt-6">
              للحصول على مفتاح تواصل مع مسؤول الاستوديو
            </p>
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
