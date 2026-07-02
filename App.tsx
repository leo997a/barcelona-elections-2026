
import React, { useState, useEffect } from 'react';
import { OverlayConfig } from './types';
import OverlayRenderer from './components/OverlayRenderer';
import { INITIAL_TEMPLATES } from './constants';
import { Volume2, CloudLightning, LoaderCircle } from 'lucide-react';
import { PROGRAM_OUTPUT_ID, syncManager } from './services/syncManager';
import { createOverlayFromTemplate } from './utils/templateRegistry';
import { licenseService, LicenseState } from './services/licenseService';
import { REO_LOGOUT_STORAGE_KEY, REO_SESSION_LOGOUT_EVENT, sessionService } from './services/sessionService';
import { identityClientConfig } from './services/auth/identityConfig';
import {
  identitySessionService,
  REO_IDENTITY_LOGOUT_EVENT,
  REO_IDENTITY_LOGOUT_STORAGE_KEY,
} from './services/auth/identitySessionService';
import type { IdentitySessionState, IdentityUser } from './types/auth';

import { unlockAudio } from './services/audioEngine';

const Sidebar = React.lazy(() => import('./components/Sidebar'));
const Home = React.lazy(() => import('./pages/Home'));
const Library = React.lazy(() => import('./pages/Library'));
const Operator = React.lazy(() => import('./pages/Operator'));
const Editor = React.lazy(() => import('./pages/Editor'));
const Integrations = React.lazy(() => import('./pages/Integrations'));
const Settings = React.lazy(() => import('./pages/Settings'));
const BroadcastControl = React.lazy(() => import('./pages/BroadcastControl'));
const PlayerIntelV2PreviewPage = React.lazy(() => import('./pages/player-intel-v2-preview'));
const LegacyLicenseGate = React.lazy(() => import('./components/auth/LegacyLicenseGate'));
const AuthGateway = React.lazy(() => import('./components/auth/AuthGateway'));

const AppRouteFallback: React.FC<{ label?: string }> = ({ label = 'جاري تحميل الواجهة' }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950 text-white">
    <LoaderCircle className="h-7 w-7 animate-spin text-cyan-300" aria-label={label} />
  </div>
);

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
const OUTPUT_PATH_PREFIX = '/output/';
const CONTROL_PATH_PREFIX = '/control/';

const extractPathId = (pathname: string, prefix: string) => {
  if (!pathname.toLowerCase().startsWith(prefix)) return null;
  const raw = pathname.slice(prefix.length).split('/')[0]?.split('?')[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const extractOutputId = (hashPath: string) => {
  const cleanPathId = extractPathId(window.location.pathname, OUTPUT_PATH_PREFIX);
  if (cleanPathId) return cleanPathId;
  const raw = hashPath.split('/output/')[1]?.split('?')[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const isObsOutputRequest = (hashPath: string) => {
  const pageParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(hashPath.includes('?') ? hashPath.split('?')[1] : '');
  return Boolean((window as unknown as { obsstudio?: unknown }).obsstudio)
    || pageParams.get('obs') === '1'
    || hashParams.get('obs') === '1';
};

type OutputState = OverlayConfig | OverlayConfig[];
const OUTPUT_CACHE_PREFIX = 'rge_output_last_state:';
const OUTPUT_CACHE_MAX_BYTES = 1_000_000;

const readCachedOutputState = (id: string | null): OutputState | null => {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(`${OUTPUT_CACHE_PREFIX}${id}`);
    return raw ? JSON.parse(raw) as OutputState : null;
  } catch {
    return null;
  }
};

const writeCachedOutputState = (id: string | null, state: OutputState) => {
  if (!id) return;
  try {
    const raw = JSON.stringify(state);
    if (raw.length <= OUTPUT_CACHE_MAX_BYTES) {
      localStorage.setItem(`${OUTPUT_CACHE_PREFIX}${id}`, raw);
    }
  } catch {
    // OBS keeps the in-memory last-known state when storage is unavailable.
  }
};

const OUTPUT_TEMPLATE_IDS = INITIAL_TEMPLATES
  .map(template => template.templateId || template.id)
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

const extractOutputTemplateId = (id: string | null) => {
  if (!id) return null;
  const normalized = id.toLowerCase();
  return OUTPUT_TEMPLATE_IDS.find(templateId => {
    const lowerTemplateId = templateId.toLowerCase();
    return (
      normalized.includes(`template-${lowerTemplateId}-`) ||
      normalized.includes(`template-${lowerTemplateId}`) ||
      normalized.includes(lowerTemplateId)
    );
  }) ?? null;
};

const buildOutputFallbackState = (id: string | null): OutputState | null => {
  if (!id || id === PROGRAM_OUTPUT_ID) return null;
  const templateId = extractOutputTemplateId(id);
  if (!templateId) return null;

  const overlay = createOverlayFromTemplate(templateId, [], 'public-output-fallback');
  return {
    ...overlay,
    id,
    templateId,
    isVisible: false,
  };
};

const LiveOutputView: React.FC<{ hashPath: string }> = ({ hashPath }) => {
  const id = extractOutputId(hashPath);
  const isProgramOutput = id === PROGRAM_OUTPUT_ID;
  const embeddedOverlay = React.useMemo(
    () => syncManager.extractEmbeddedOverlay(hashPath) ?? null,
    [hashPath]
  );
  const cachedOutputState = React.useMemo(() => readCachedOutputState(id), [id]);
  const fallbackOutputState = React.useMemo(() => buildOutputFallbackState(id), [id]);
  const initialOutputState = embeddedOverlay ?? cachedOutputState ?? fallbackOutputState;

  // آخر حالة معروفة — لا تُمسح أبداً حتى عند انقطاع الاتصال
  const lastGoodState = React.useRef<OutputState | null>(initialOutputState);
  const [outputState, setOutputState] = useState<OutputState | null>(initialOutputState);
  const [connStatus, setConnStatus] = useState<'connecting' | 'live' | 'fallback'>('connecting');

  useEffect(() => {
    lastGoodState.current = initialOutputState;
    setOutputState(initialOutputState);
  }, [id, initialOutputState]);

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
    if (!id) return;
    if (embeddedOverlay) {
      lastGoodState.current = embeddedOverlay;
      setOutputState(embeddedOverlay);
      writeCachedOutputState(id, embeddedOverlay);
      setConnStatus('fallback');
    }

    let sseActive = true;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let requestCounter = 0;
    let pollInFlight = false;
    let consecutiveLiveMisses = 0;
    let lastMissingProbeAt = 0;
    let lastAppliedVersion = 0;
    let lastAppliedFingerprint = initialOutputState ? JSON.stringify(initialOutputState) : '';
    let lastFullFetchAt = 0;

    const isObsBrowser = isObsOutputRequest(hashPath);
    const pollIntervalMs = isObsBrowser ? 250 : 600;
    const staleFullFetchMs = isObsBrowser ? 900 : 1400;
    const missingStateProbeMs = isObsBrowser ? 2200 : 5000;
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
      writeCachedOutputState(id, newState);
    };

    const applyMissingState = () => {
      if (isProgramOutput) {
        applyState([], 0);
        return true;
      }

      const lastSingleState = lastGoodState.current && !Array.isArray(lastGoodState.current)
        ? lastGoodState.current
        : null;
      const hiddenState = lastSingleState ?? fallbackOutputState;
      if (!hiddenState) return false;
      applyState({ ...hiddenState, id, isVisible: false }, 0);
      return true;
    };

    const fetchLiveState = async () => {
      lastFullFetchAt = Date.now();
      try {
        const r = await fetchNoCache(liveUrl({ full: '1' }));
        if (r.status === 404 || r.status === 410) {
          applyMissingState();
          return false;
        }
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
        // Server returned 200 but state id doesn't match or format unexpected.
        // Do NOT call applyMissingState here — keep last known good state intact.
        // Only 404/410 should trigger the hidden fallback.
      } catch { /* keep last state */ }
      return false;
    };

    const pollLiveMeta = async () => {
      if (pollInFlight) return;
      if (consecutiveLiveMisses >= 8 && Date.now() - lastMissingProbeAt < missingStateProbeMs) return;
      pollInFlight = true;

      try {
        const r = await fetchNoCache(liveUrl({ meta: '1' }));
        if (!r.ok) {
          consecutiveLiveMisses += 1;
          lastMissingProbeAt = Date.now();
          if (r.status === 404 || r.status === 410) {
            applyMissingState();
          }
          if (!lastGoodState.current) await fetchLiveState();
          return;
        }
        consecutiveLiveMisses = 0;

        const meta = await r.json() as { version?: number };
        const nextVersion = Number(meta.version || 0);
        const shouldRefreshUnknownVersion = !nextVersion && Date.now() - lastFullFetchAt >= staleFullFetchMs;
        if (!lastGoodState.current || (nextVersion > 0 && nextVersion !== lastAppliedVersion) || shouldRefreshUnknownVersion) {
          await fetchLiveState();
        }

        if (!es) setConnStatus('fallback');
      } catch {
        consecutiveLiveMisses += 1;
        lastMissingProbeAt = Date.now();
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
          consecutiveLiveMisses = 0;
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

    // Pull the authoritative state immediately. SSE can be delayed or blocked
    // by OBS/host proxies, so the output must not wait for the first event.
    void fetchLiveState().then(found => {
      if (!found) startFallback();
    });

    // ── Official output sync: SSE + fast polling fallback over /api/live ──
    connectSSE();

    return () => {
      sseActive = false;
      es?.close();
      stopFallback();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [id, hashPath, embeddedOverlay, isProgramOutput, initialOutputState]);

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
    const audioUnlockOverlay = isObsOutputRequest(hashPath) ? null : <AudioUnlockOverlay />;
    return (
      <div className="w-screen h-screen overflow-hidden bg-transparent relative" onClick={unlockAudio}>
        {audioUnlockOverlay}
        {outputState.map(item => (
          <OverlayRenderer key={item.id} config={item} />
        ))}
      </div>
    );
  }

  const audioUnlockOverlay = isObsOutputRequest(hashPath) ? null : <AudioUnlockOverlay />;
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent relative" onClick={unlockAudio}>
      {audioUnlockOverlay}
      <OverlayRenderer config={outputState} />
    </div>
  );
};

const EDIT_HASH_PREFIX = '#/edit/';

const extractEditOverlayId = (hashPath: string) => {
  if (!hashPath.startsWith(EDIT_HASH_PREFIX)) return null;
  const raw = hashPath.slice(EDIT_HASH_PREFIX.length).split('?')[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const buildCleanAppSearch = () => {
  const params = new URLSearchParams(window.location.search);
  params.delete('obs');
  params.delete('rgev');
  params.delete('sync');
  params.delete('d');
  const query = params.toString();
  return query ? `?${query}` : '';
};


const App: React.FC = () => {
  const [overlays, setOverlays] = useState<OverlayConfig[]>([]);
  // URL pathname-based routing
  const pathnameToRoute = (p: string): string => {
    const clean = p.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (clean.startsWith('control/')) return 'operator';
    if (clean === 'library') return 'library';
    if (clean === 'operator') return 'operator';
    if (clean === 'integrations') return 'integrations';
    if (clean === 'settings') return 'settings';
    if (clean === 'broadcastcontrol') return 'broadcastcontrol';
    return 'home';
  };
  const [route, setRouteState] = useState<string>(() => pathnameToRoute(window.location.pathname));
  const [operatorFocusId, setOperatorFocusId] = useState<string | null>(() =>
    extractPathId(window.location.pathname, CONTROL_PATH_PREFIX)
  );
  const setRoute = (page: string) => {
    setOperatorFocusId(null);
    setRouteState(page);
    const urlPath = page === 'home' ? '/' : `/${page.charAt(0).toUpperCase() + page.slice(1)}`;
    window.history.pushState({ route: page }, '', urlPath);
  };
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [hashPath, setHashPath] = useState(window.location.hash);
  const [hasLoadedOverlays, setHasLoadedOverlays] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('rge_favorites') || '[]'); } catch { return []; }
  });
  const [license, setLicense] = useState<LicenseState | null>(() => licenseService.getStored());
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseEmail, setLicenseEmail] = useState(() => localStorage.getItem('rge_license_email') || '');
  const [licenseError, setLicenseError] = useState('');
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [identitySession, setIdentitySession] = useState<IdentitySessionState>(() =>
    identityClientConfig.enabled
      ? { status: 'loading', user: null }
      : { status: 'disabled', user: null }
  );

  const applyLoggedOutUi = React.useCallback(() => {
    if (extractOutputId(window.location.hash)) return;
    setLicense(null);
    setLicenseKey('');
    setLicenseEmail('');
    setLicenseError('');
    setShowLicenseKey(false);
    setSelectedOverlayId(null);
    setOperatorFocusId(null);
    setRouteState('home');
    setHashPath('');
    window.history.replaceState({ route: 'home' }, '', '/');
  }, []);

  const applyIdentityLoggedOutUi = React.useCallback(() => {
    if (extractOutputId(window.location.hash)) return;
    setIdentitySession({ status: 'signed-out', user: null });
    setSelectedOverlayId(null);
    setOperatorFocusId(null);
    setRouteState('home');
    setHashPath('');
    window.history.replaceState({ route: 'home' }, '', '/');
  }, []);

  const handleIdentityAuthenticated = React.useCallback((user: IdentityUser) => {
    setIdentitySession({ status: 'authenticated', user });
    setLogoutError('');
  }, []);

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    setLogoutError('');
    try {
      if (identitySession.status === 'authenticated') {
        await identitySessionService.logout();
        applyIdentityLoggedOutUi();
        return;
      }
      await sessionService.logout();
      applyLoggedOutUi();
    } catch (err) {
      const hasStoredLicense = Boolean(licenseService.getStored());
      if (!hasStoredLicense) {
        applyLoggedOutUi();
      }
      setLogoutError(err instanceof Error ? err.message : 'تعذر تسجيل الخروج. أعد المحاولة.');
    } finally {
      setLogoutLoading(false);
    }
  };

  useEffect(() => {
    if (!identityClientConfig.enabled || extractOutputId(window.location.hash)) return;
    if (licenseService.getStored()?.valid) {
      setIdentitySession({ status: 'signed-out', user: null });
      return;
    }

    let active = true;
    void identitySessionService.restore()
      .then(user => {
        if (!active) return;
        setIdentitySession(user
          ? { status: 'authenticated', user }
          : { status: 'signed-out', user: null });
      })
      .catch(() => {
        if (active) setIdentitySession({ status: 'signed-out', user: null });
      });

    const handleIdentityLogout = () => applyIdentityLoggedOutUi();
    const handleIdentityStorageLogout = (event: StorageEvent) => {
      if (event.key === REO_IDENTITY_LOGOUT_STORAGE_KEY && event.newValue) {
        applyIdentityLoggedOutUi();
      }
    };
    window.addEventListener(REO_IDENTITY_LOGOUT_EVENT, handleIdentityLogout);
    window.addEventListener('storage', handleIdentityStorageLogout);
    return () => {
      active = false;
      window.removeEventListener(REO_IDENTITY_LOGOUT_EVENT, handleIdentityLogout);
      window.removeEventListener('storage', handleIdentityStorageLogout);
    };
  }, [applyIdentityLoggedOutUi]);

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseError('');
    const trimmedEmail = licenseEmail.trim();
    const trimmedKey = licenseKey.trim();
    if (!trimmedEmail || !trimmedKey) {
      setLicenseError('أدخل البريد ومفتاح الدخول أولًا.');
      return;
    }
    setLicenseLoading(true);
    try {
      const state = await licenseService.activate(trimmedKey);
      localStorage.setItem('rge_license_email', trimmedEmail);
      setLicense(state);
    } catch (err) {
      setLicenseError(err instanceof Error ? err.message : 'فشل التحقق من مفتاح الدخول.');
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
    const handlePopState = () => {
      const historyState = window.history.state as { route?: string; overlayId?: string } | null;
      setRouteState(pathnameToRoute(window.location.pathname));
      const historyOverlayId = historyState?.route === 'operator' && typeof historyState.overlayId === 'string'
        ? historyState.overlayId
        : extractPathId(window.location.pathname, CONTROL_PATH_PREFIX);
      setOperatorFocusId(historyOverlayId);
      setHashPath(window.location.hash);
    };
    const handleSessionLogout = () => applyLoggedOutUi();
    const handleStorageLogout = (event: StorageEvent) => {
      if (event.key === REO_LOGOUT_STORAGE_KEY && event.newValue) {
        applyLoggedOutUi();
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener(REO_SESSION_LOGOUT_EVENT, handleSessionLogout);
    window.addEventListener('storage', handleStorageLogout);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(REO_SESSION_LOGOUT_EVENT, handleSessionLogout);
      window.removeEventListener('storage', handleStorageLogout);
    };
  }, [applyLoggedOutUi]);

  // Sync Manager Subscription
  useEffect(() => {
    const unsubscribe = syncManager.subscribe(data => {
      setOverlays(data);
      setHasLoadedOverlays(true);
    });
    return unsubscribe;
  }, []);

  const openEditorById = (id: string, replace = false) => {
    const editUrl = `/Library${buildCleanAppSearch()}${EDIT_HASH_PREFIX}${encodeURIComponent(id)}`;
    setRouteState('library');
    setSelectedOverlayId(id);
    if (replace) {
      window.history.replaceState({ route: 'library', overlayId: id }, '', editUrl);
    } else {
      window.history.pushState({ route: 'library', overlayId: id }, '', editUrl);
    }
    setHashPath(window.location.hash);
  };

  const openOperatorById = (id?: string) => {
    setSelectedOverlayId(null);
    setOperatorFocusId(id || null);
    setRouteState('operator');
    const operatorPath = id ? `/control/${encodeURIComponent(id)}` : '/Operator';
    window.history.pushState({ route: 'operator', overlayId: id || null }, '', `${operatorPath}${buildCleanAppSearch()}`);
  };

  const closeEditor = () => {
    setSelectedOverlayId(null);
    if (hashPath.startsWith(EDIT_HASH_PREFIX)) {
      window.history.pushState({ route: 'library' }, '', `/Library${buildCleanAppSearch()}`);
      setRouteState('library');
      setHashPath(window.location.hash);
    }
  };

  useEffect(() => {
    const editOverlayId = extractEditOverlayId(hashPath);
    if (!editOverlayId) {
      if (selectedOverlayId) setSelectedOverlayId(null);
      return;
    }

    setRouteState('library');
    const exists = overlays.some(overlay => overlay.id === editOverlayId);
    if (exists && selectedOverlayId !== editOverlayId) {
      setSelectedOverlayId(editOverlayId);
    } else if (!exists && selectedOverlayId) {
      setSelectedOverlayId(null);
    }
  }, [hashPath, overlays, selectedOverlayId]);

  // Actions delegated to SyncManager
  const handleCreateOverlay = (templateId: string) => {
    const nextOverlay = createOverlayFromTemplate(templateId, overlays, syncManager.getStudioId());
    syncManager.addOverlay(nextOverlay);
    openEditorById(nextOverlay.id);
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
  if (extractOutputId(hashPath)) {
    return <LiveOutputView hashPath={hashPath} />;
  }

  // ----------------------------------------------------
  // RENDER: Player Intel V2 Preview Lab — standalone read-only lab.
  // Intentionally bypasses license gate so we can iterate. Does NOT touch the
  // legacy Player Stats Lab or any production overlay code.
  // ----------------------------------------------------
  if (hashPath.startsWith('#/player-intel-v2-preview')) {
    return (
      <React.Suspense fallback={<AppRouteFallback label="جاري تحميل مختبر الإحصائيات" />}>
        <PlayerIntelV2PreviewPage />
      </React.Suspense>
    );
  }

  // ----------------------------------------------------
  // RENDER: License Gate — للواجهة الرئيسية فقط
  // ----------------------------------------------------
  const identityAuthenticated = identitySession.status === 'authenticated';
  if (!license?.valid && !identityAuthenticated) {
    const legacyAccess = (
      <React.Suspense fallback={<AppRouteFallback label="جاري تحميل بوابة الدخول" />}>
        <LegacyLicenseGate
          embedded={identityClientConfig.enabled}
          email={licenseEmail}
          licenseKey={licenseKey}
          error={licenseError}
          loading={licenseLoading}
          showLicenseKey={showLicenseKey}
          onEmailChange={setLicenseEmail}
          onLicenseKeyChange={setLicenseKey}
          onToggleLicenseKey={() => setShowLicenseKey(previous => !previous)}
          onSubmit={handleActivateLicense}
        />
      </React.Suspense>
    );

    if (!identityClientConfig.enabled) return legacyAccess;
    if (identitySession.status === 'loading') {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950 text-white">
          <LoaderCircle className="h-7 w-7 animate-spin text-cyan-300" aria-label="جاري فحص الجلسة" />
        </div>
      );
    }
    return (
      <React.Suspense fallback={<AppRouteFallback label="جاري تحميل بوابة الحساب" />}>
        <AuthGateway legacyAccess={legacyAccess} onAuthenticated={handleIdentityAuthenticated} />
      </React.Suspense>
    );
  }

  // ----------------------------------------------------
  // RENDER: Main App
  // ----------------------------------------------------
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);
  const editOverlayId = extractEditOverlayId(hashPath);
  const missingEditOverlayId = hasLoadedOverlays && editOverlayId && !overlays.some(o => o.id === editOverlayId)
    ? editOverlayId
    : null;

  return (
    <React.Suspense fallback={<AppRouteFallback />}>
      <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden" dir="rtl">
        {selectedOverlayId && selectedOverlay ? (
          <div className="w-full h-full">
             <Editor
               overlay={selectedOverlay}
               onBack={closeEditor}
             />
          </div>
        ) : (
          <>
            <Sidebar
              activePage={route}
              onNavigate={setRoute}
              favoriteCount={favoriteIds.length}
              onLogout={handleLogout}
              logoutLoading={logoutLoading}
              logoutError={logoutError}
            />

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
                     onSelect={openEditorById}
                     onDelete={handleDeleteOverlay}
                     onRename={(overlay) => syncManager.updateOverlay(overlay)}
                     onCreate={handleCreateOverlay}
                     onNavigateOperator={openOperatorById}
                     favoriteIds={favoriteIds}
                     onToggleFavorite={handleToggleFavorite}
                     missingEditOverlayId={missingEditOverlayId}
                   />
                 )}

                 {route === 'operator' && (
                     <Operator
                       overlays={overlays}
                       focusedOverlayId={operatorFocusId}
                       favoriteIds={favoriteIds}
                       onToggleFavorite={handleToggleFavorite}
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
    </React.Suspense>
  );
};

export default App;
