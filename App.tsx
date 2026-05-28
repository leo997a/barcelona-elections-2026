
import React, { useState, useEffect } from 'react';
import { OverlayConfig } from './types';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Library from './pages/Library';
import Operator from './pages/Operator';
import Editor from './pages/Editor';
import Integrations from './pages/Integrations'; 
import Settings from './pages/Settings';
import BroadcastControl from './pages/BroadcastControl';
import PlayerIntelV2PreviewPage from './pages/player-intel-v2-preview';
import OverlayRenderer from './components/OverlayRenderer';
import { Volume2, CloudLightning, Tv, AlertTriangle } from 'lucide-react';
import { PROGRAM_OUTPUT_ID, syncManager } from './services/syncManager';
import { createOverlayFromTemplate } from './utils/templateRegistry';
import { licenseService, LicenseState } from './services/licenseService';

import { unlockAudio } from './services/audioEngine';

const AudioUnlockOverlay = () => {
    const [visible, setVisible] = useState(true);
    
    const handleUnlock = () => {
        unlockAudio().finally(() => setVisible(false));
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

// ─── LiveOutputView ─────────────────────────────────────────────────────────
// SSE-based output view — يستقبل تحديثات فورية عبر Server-Sent Events
// لا polling، لا تأخر، لا كراشات — الاتصال يبقى مفتوحاً دائماً
const LiveOutputView: React.FC<{ hashPath: string }> = ({ hashPath }) => {
  const id = hashPath.split('/output/')[1]?.split('?')[0];
  const isProgramOutput = id === PROGRAM_OUTPUT_ID;
  const embeddedOverlay = React.useMemo(
    () => syncManager.extractEmbeddedOverlay(hashPath) ?? null,
    [hashPath]
  );

  // آخر حالة معروفة — لا تُمسح أبداً حتى عند انقطاع الاتصال
  const lastGoodState = React.useRef<OverlayConfig | OverlayConfig[] | null>(
    embeddedOverlay
  );
  const [outputState, setOutputState] = useState<OverlayConfig | OverlayConfig[] | null>(embeddedOverlay);
  const [connStatus, setConnStatus] = useState<'connecting' | 'live' | 'fallback'>('connecting');

  useEffect(() => {
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;
    const previousRootBackground = document.getElementById('root')?.style.background;

    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.getElementById('root')?.style.setProperty('background', 'transparent');

    return () => {
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
      if (previousRootBackground !== undefined) {
        document.getElementById('root')?.style.setProperty('background', previousRootBackground);
      }
    };
  }, []);

  useEffect(() => {
    if (embeddedOverlay) {
      lastGoodState.current = embeddedOverlay;
      setOutputState(embeddedOverlay);
      setConnStatus('fallback');
      return;
    }

    if (!id) return;
    let sseActive = true;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let requestCounter = 0;
    let pollInFlight = false;
    let lastAppliedVersion = 0;
    let lastAppliedFingerprint = embeddedOverlay ? JSON.stringify(embeddedOverlay) : '';
    let lastFullFetchAt = 0;

    const pageParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hashPath.includes('?') ? hashPath.split('?')[1] : '');
    const isObsBrowser = Boolean((window as unknown as { obsstudio?: unknown }).obsstudio)
      || pageParams.get('obs') === '1'
      || hashParams.get('obs') === '1';
    const pollIntervalMs = isObsBrowser ? 2500 : 3000;
    const staleFullFetchMs = isObsBrowser ? 10000 : 15000;
    const noCacheHeaders = {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };

    const liveUrl = (extra?: Record<string, string>) => {
      const params = new URLSearchParams({
        id,
        _: `${Date.now()}-${requestCounter++}`,
        ...(extra ?? {}),
      });

      return `/api/live?${params.toString()}`;
    };

    const streamUrl = () => {
      const params = new URLSearchParams({
        id,
        _: `${Date.now()}-${requestCounter++}`,
      });

      return `/api/stream?${params.toString()}`;
    };

    const fetchNoCache = async (url: string) => {
      const init: RequestInit = {
        cache: 'no-store',
        headers: noCacheHeaders,
      };
      let timeout: ReturnType<typeof setTimeout> | null = null;

      if ('AbortController' in window) {
        const controller = new AbortController();
        init.signal = controller.signal;
        timeout = setTimeout(() => controller.abort(), 4500);
      }

      try {
        return await fetch(url, init);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };

    // ── تحديث الحالة بأمان ────────────────────────────────────────────────────
    // version=0 means the update came from a non-versioned fallback. Apply it
    // only when the payload changed so OBS does not repaint for no reason.
    // version>0 means SSE/polling — only apply if newer than the last applied version.
    const applyState = (newState: OverlayConfig | OverlayConfig[], version = 0) => {
      if (version > 0 && version < lastAppliedVersion) return;
      const fingerprint = JSON.stringify(newState);
      if (fingerprint === lastAppliedFingerprint) return;
      if (version > 0) lastAppliedVersion = version;
      lastAppliedFingerprint = fingerprint;
      lastGoodState.current = newState;
      setOutputState(newState);
    };

    const fetchLiveState = async () => {
      lastFullFetchAt = Date.now();
      try {
        const r = await fetchNoCache(liveUrl({ full: '1' }));
        if (!r.ok) return false;
        const data = await r.json() as { state?: OverlayConfig | OverlayConfig[]; version?: number };
        if (isProgramOutput && Array.isArray(data?.state)) {
          applyState(data.state, Number(data.version || 0));
          return true;
        }
        if (!Array.isArray(data?.state) && data?.state?.id === id) {
          applyState(data.state, Number(data.version || 0));
          return true;
        }
      } catch { /* keep last state */ }
      return false;
    };

    const pollLiveMeta = async () => {
      if (pollInFlight) return;
      pollInFlight = true;

      try {
        const r = await fetchNoCache(liveUrl({ meta: '1' }));
        if (!r.ok) {
          if (!lastGoodState.current) await fetchLiveState();
          return;
        }

        const meta = await r.json() as { version?: number };
        const nextVersion = Number(meta.version || 0);
        const shouldRefreshUnknownVersion = !nextVersion && Date.now() - lastFullFetchAt >= staleFullFetchMs;
        if (!lastGoodState.current || (nextVersion > 0 && nextVersion !== lastAppliedVersion) || shouldRefreshUnknownVersion) {
          await fetchLiveState();
        }

        if (!es) setConnStatus('fallback');
      } catch {
        if (!lastGoodState.current) {
          void fetchLiveState();
        }
      } finally {
        pollInFlight = false;
      }
    };

    const stopFallback = () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      fallbackInterval = null;
    };

    const startFallback = () => {
      if (fallbackInterval) return;
      void pollLiveMeta();
      fallbackInterval = setInterval(() => {
        void pollLiveMeta();
      }, pollIntervalMs);
    };

    // ── SSE: اتصال مفتوح، تحديثات فورية ─────────────────────────────────
    const connectSSE = () => {
      if (!sseActive) return;
      try {
        es = new EventSource(streamUrl());
        setConnStatus('connecting');

        es.onopen = () => {
          setConnStatus('live');
          startFallback();
        };

        es.onmessage = (event) => {
          if (!event.data || event.data.startsWith(':')) return; // heartbeat
          try {
            const parsed = JSON.parse(event.data) as OverlayConfig | OverlayConfig[];
            if (isProgramOutput && Array.isArray(parsed)) {
              applyState(parsed, Number(event.lastEventId || 0));
            } else if (!Array.isArray(parsed) && parsed?.id === id) {
              applyState(parsed, Number(event.lastEventId || 0));
            }
          } catch { /* ignore malformed */ }
        };

        es.onerror = () => {
          es?.close();
          es = null;
          setConnStatus('fallback');
          startFallback(); // ابدأ polling احتياطي
          // أعد الاتصال بـ SSE بعد 3 ثوانٍ
          if (sseActive) reconnectTimer = setTimeout(connectSSE, 3000);
        };
      } catch {
        setConnStatus('fallback');
        startFallback();
      }
    };

    // ── Official output sync: SSE + light polling fallback over /api/live ──
    startFallback();
    connectSSE();

    return () => {
      sseActive = false;
      es?.close();
      stopFallback();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [id, hashPath, embeddedOverlay, isProgramOutput]);

  // عرض آخر حالة معروفة — لا يُعرض "Connecting..." إلا إذا لم يُستلم أي شيء قط
  if (!outputState) return (
    <div className="flex flex-col items-center justify-center h-screen bg-transparent">
      <div className="bg-black/60 px-5 py-3 rounded-full backdrop-blur-md animate-pulse flex items-center gap-3">
        <CloudLightning className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold text-white font-mono">Connecting to RGE Cloud...</span>
      </div>
    </div>
  );

  if (Array.isArray(outputState)) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-transparent relative" onClick={unlockAudio}>
        <AudioUnlockOverlay />
        {outputState.map(item => (
          <OverlayRenderer key={item.id} config={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent relative" onClick={unlockAudio}>
      <AudioUnlockOverlay />
      <OverlayRenderer config={outputState} />
    </div>
  );
};


const App: React.FC = () => {
  const [overlays, setOverlays] = useState<OverlayConfig[]>([]);
  // URL pathname-based routing
  const pathnameToRoute = (p: string): string => {
    const clean = p.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (clean === 'library') return 'library';
    if (clean === 'operator') return 'operator';
    if (clean === 'integrations') return 'integrations';
    if (clean === 'settings') return 'settings';
    if (clean === 'broadcastcontrol') return 'broadcastcontrol';
    return 'home';
  };
  const [route, setRouteState] = useState<string>(() => pathnameToRoute(window.location.pathname));
  const setRoute = (page: string) => {
    setRouteState(page);
    const urlPath = page === 'home' ? '/' : `/${page.charAt(0).toUpperCase() + page.slice(1)}`;
    window.history.pushState({ route: page }, '', urlPath);
  };
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [hashPath, setHashPath] = useState(window.location.hash);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('rge_favorites') || '[]'); } catch { return []; }
  });
  const [license, setLicense] = useState<LicenseState | null>(() => licenseService.getStored());
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseEmail, setLicenseEmail] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseLoading, setLicenseLoading] = useState(false);

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseError('');
    setLicenseLoading(true);
    try {
      const state = await licenseService.activate(licenseKey.trim());
      localStorage.setItem('rge_license_email', licenseEmail.trim());
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
  
  // Handle Hash Routing (Output Window) + URL popstate
  useEffect(() => {
    const handleHashChange = () => setHashPath(window.location.hash);
    const handlePopState = () => setRouteState(pathnameToRoute(window.location.pathname));
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync Manager Subscription
  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setOverlays);
    return unsubscribe;
  }, []);
  
  // Actions delegated to SyncManager
  const handleCreateOverlay = (templateId: string) => {
    const nextOverlay = createOverlayFromTemplate(templateId, overlays);
    syncManager.addOverlay(nextOverlay);
    setSelectedOverlayId(nextOverlay.id);
    setRoute('library');
  };

  const handleDeleteOverlay = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
       syncManager.deleteOverlay(id);
    }
  };

  // ── License Gate inner state ──────────────────────────────────────────────


  // ----------------------------------------------------
  // RENDER: Output View (Browser Source) — NO AUTH REQUIRED + LIVE SYNC
  // ----------------------------------------------------
  if (hashPath.startsWith('#/output/')) {
    return <LiveOutputView hashPath={hashPath} />;
  }

  // ----------------------------------------------------
  // RENDER: Player Intel V2 Preview Lab — standalone read-only lab.
  // Intentionally bypasses license gate so we can iterate. Does NOT touch the
  // legacy Player Stats Lab or any production overlay code.
  // ----------------------------------------------------
  if (hashPath.startsWith('#/player-intel-v2-preview')) {
    return <PlayerIntelV2PreviewPage />;
  }

  // ----------------------------------------------------
  // RENDER: License Gate — للواجهة الرئيسية فقط
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
              <input
                type="email"
                value={licenseEmail}
                onChange={e => setLicenseEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-center"
                dir="ltr"
              />
              {licenseError && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{licenseError}</p>
                </div>
              )}
              <button type="submit" disabled={licenseLoading || !licenseKey.trim() || !licenseEmail.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/30">
                {licenseLoading ? 'جاري التحقق...' : '🔐 دخول الاستوديو'}
              </button>
            </form>
          </div>

        </div>
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

               {route === 'broadcastcontrol' && <BroadcastControl />}

               {route === 'settings' && <Settings />}
             </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
