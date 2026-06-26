import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  set,
  type Database,
  type Unsubscribe,
} from 'firebase/database';
import { ActionCommand, FirebaseWebConfig, OverlayConfig, OverlayField, SecureSyncConfig, SyncStatus } from '../types';
import { decodeBase64UrlUtf8, encodeBase64UrlUtf8, generateSecureToken } from '../utils/base64';
import { normalizeElectionOverlay } from '../utils/election';
import { firebaseConfig, isFirebaseConfigured } from './firebase';

const LOCAL_STATE_KEY = 'rge_overlays';
const LOCAL_CONFIG_KEY = 'rge_secure_sync_config';
const LOCAL_STUDIO_KEY = 'rge_studio_id';
const LOCAL_CHANNEL_NAME = 'rge_local_sync_v1';
const FIREBASE_ROOT = 'rgeSecure/v1/studios';
const OUTPUT_SYNC_PARAM = 'sync';
const APP_NAMESPACE = 'reo-live-secure';
const DEFAULT_STUDIO_ID = 'reo-main';
const DEFAULT_STATE_ACCESS_KEY = 'public-live-output';
const DEFAULT_CONTROL_ACCESS_KEY = 'studio-live-control';
const OBS_OUTPUT_URL_VERSION = 'obs-live-v3';
const LEGACY_FIREBASE_SYNC_KEY = 'rge_enable_legacy_firebase_sync';
export const PROGRAM_OUTPUT_ID = '__program_output__';

interface ViewerSyncBundle {
  provider: 'firebase';
  studioId: string;
  stateAccessKey: string;
  firebaseConfig: FirebaseWebConfig;
}

type CommandEnvelope = ActionCommand & {
  commandId: string;
  issuedAt: number;
};

interface LocalMessage {
  type: 'state';
  payload: OverlayConfig[];
}

class SyncManager {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Database | null = null;
  private config: SecureSyncConfig | null = null;
  private studioId: string;
  private status: SyncStatus = 'local';
  private lastError: string | null = null;
  private subscribers: Set<(data: OverlayConfig[]) => void> = new Set();
  private currentState: OverlayConfig[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private unsubscribeState: Unsubscribe | null = null;
  private unsubscribeCommand: Unsubscribe | null = null;
  private latestCommandId: string | null = null;
  private hasSeenInitialCommand = false;
  private liveApiDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingLiveSnapshots = new Map<string, OverlayConfig>();
  private liveClientVersion = Date.now();
  private secureWriteDisabled = false;

  constructor() {
    this.studioId = this.detectStudioId();
    const isOutputWindow = this.isOutputRoute();
    this.currentState = isOutputWindow ? [] : this.loadLocalState();

    if (isOutputWindow) {
      // Output windows now use /api/stream + /api/live only. Firebase is legacy
      // and must never inject old visibility commands into the broadcast view.
      this.status = 'local';
      return;
    }

    if (!localStorage.getItem(LOCAL_STUDIO_KEY)) {
      localStorage.setItem(LOCAL_STUDIO_KEY, this.studioId);
    }

    this.initLocalBridge();
    if (this.isLegacyFirebaseSyncEnabled()) {
      void this.initSecureSync();
    } else {
      this.status = 'local';
    }

    if (!this.isOutputRoute() && this.currentState.length > 0) {
      setTimeout(() => this.pushToLiveApi(), 1500);
    }
  }


  private isOutputRoute() {
    return window.location.hash.includes('/output/')
      || window.location.pathname.toLowerCase().startsWith('/output/');
  }

  private isLegacyFirebaseSyncEnabled() {
    try {
      return localStorage.getItem(LEGACY_FIREBASE_SYNC_KEY) === '1';
    } catch {
      return false;
    }
  }

  private normalizeOverlay(overlay: OverlayConfig, changedFieldId?: string) {
    return normalizeElectionOverlay(overlay, changedFieldId);
  }

  private loadLocalState() {
    try {
      const saved = localStorage.getItem(LOCAL_STATE_KEY);
      if (!saved) return [];
      return (JSON.parse(saved) as OverlayConfig[]).map(overlay => this.normalizeOverlay(overlay));
    } catch (error) {
      console.error('Failed to load local overlay state', error);
      return [];
    }
  }

  private getAllQueryParams() {
    const params = new URLSearchParams(window.location.search);

    if (window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      hashParams.forEach((value, key) => params.set(key, value));
    }

    return params;
  }

  private detectViewerBundle(): ViewerSyncBundle | null {
    const encoded = this.getAllQueryParams().get(OUTPUT_SYNC_PARAM);
    if (!encoded) return null;

    try {
      return JSON.parse(decodeBase64UrlUtf8(encoded)) as ViewerSyncBundle;
    } catch (error) {
      console.error('Failed to decode secure viewer bundle', error);
      return null;
    }
  }

  private detectStudioId(): string {
    const viewerBundle = this.detectViewerBundle();
    if (viewerBundle?.studioId) return viewerBundle.studioId;

    const params = this.getAllQueryParams();
    const studioFromUrl = params.get('studio');
    if (studioFromUrl) return studioFromUrl;

    const stored = localStorage.getItem(LOCAL_STUDIO_KEY);
    if (stored) return stored;

    return `studio_${generateSecureToken(8)}`;
  }

  private initLocalBridge() {
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
      this.broadcastChannel.onmessage = event => {
        const message = event.data as LocalMessage | undefined;
        if (message?.type !== 'state') return;
        this.currentState = message.payload.map(overlay => this.normalizeOverlay(overlay));
        this.persist(false);
      };
    }

    window.addEventListener('storage', event => {
      if (event.key !== LOCAL_STATE_KEY || !event.newValue) return;

      try {
        const nextState = (JSON.parse(event.newValue) as OverlayConfig[]).map(overlay =>
          this.normalizeOverlay(overlay)
        );
        this.currentState = nextState;
        this.notify();
      } catch (error) {
        console.error('Failed to process storage sync event', error);
      }
    });
  }

  private buildWebConfig(config: SecureSyncConfig): FirebaseWebConfig {
    return {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      databaseURL: config.databaseURL,
      projectId: config.projectId,
      appId: config.appId,
      messagingSenderId: config.messagingSenderId,
      storageBucket: config.storageBucket,
      measurementId: config.measurementId,
    };
  }

  private parseStoredConfig(): SecureSyncConfig | null {
    try {
      const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SecureSyncConfig>;
      if (!parsed.apiKey || !parsed.authDomain || !parsed.databaseURL || !parsed.projectId) {
        return null;
      }

      return {
        provider: 'firebase',
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain,
        databaseURL: parsed.databaseURL,
        projectId: parsed.projectId,
        appId: parsed.appId,
        messagingSenderId: parsed.messagingSenderId,
        storageBucket: parsed.storageBucket,
        measurementId: parsed.measurementId,
        studioId: parsed.studioId || this.studioId,
        stateAccessKey: parsed.stateAccessKey || generateSecureToken(16),
        controlAccessKey: parsed.controlAccessKey || generateSecureToken(16),
        updatedAt: parsed.updatedAt || Date.now(),
      };
    } catch (error) {
      console.error('Failed to parse secure sync config', error);
      return null;
    }
  }

  private getEffectiveConfig(): SecureSyncConfig | null {
    const viewerBundle = this.detectViewerBundle();
    if (viewerBundle) {
      return {
        provider: 'firebase',
        ...viewerBundle.firebaseConfig,
        studioId: viewerBundle.studioId,
        stateAccessKey: viewerBundle.stateAccessKey,
        controlAccessKey: '',
        updatedAt: Date.now(),
      };
    }

    const storedConfig = this.parseStoredConfig();
    if (storedConfig) return storedConfig;

    if (isFirebaseConfigured()) {
      return {
        provider: 'firebase',
        ...firebaseConfig,
        studioId: this.studioId || DEFAULT_STUDIO_ID,
        stateAccessKey: DEFAULT_STATE_ACCESS_KEY,
        controlAccessKey: this.isOutputRoute() ? '' : DEFAULT_CONTROL_ACCESS_KEY,
        updatedAt: Date.now(),
      };
    }

    return null;
  }

  private getStatePath() {
    if (!this.config) return null;
    return `${FIREBASE_ROOT}/${this.config.studioId}/state/${this.config.stateAccessKey}`;
  }

  private getCommandPath() {
    if (!this.config?.controlAccessKey) return null;
    return `${FIREBASE_ROOT}/${this.config.studioId}/commands/${this.config.controlAccessKey}/latest`;
  }

  private getOperatorPath(uid: string) {
    return `${FIREBASE_ROOT}/${this.studioId}/operators/${uid}`;
  }

  private async ensureFirebaseSession() {
    if (!this.config) return false;
    this.secureWriteDisabled = false;

    const webConfig = this.buildWebConfig(this.config);
    const appName = `${APP_NAMESPACE}:${this.config.projectId}:${this.config.studioId}`;
    this.app = getApps().some(existing => existing.name === appName)
      ? getApp(appName)
      : initializeApp(webConfig, appName);

    this.auth = getAuth(this.app);
    this.db = getDatabase(this.app);

    await setPersistence(this.auth, browserLocalPersistence).catch(() => undefined);
    if (!this.auth.currentUser) {
      await signInAnonymously(this.auth).catch(error => {
        console.warn('Anonymous Firebase auth unavailable; continuing with token path access.', error);
        this.disableSecureWrites(error, 'Anonymous Firebase auth unavailable');
      });
    }

    if (this.auth.currentUser && this.config.controlAccessKey) {
      const operatorRef = ref(this.db, this.getOperatorPath(this.auth.currentUser.uid));
      await set(operatorRef, { connectedAt: Date.now() }).catch(error => {
        this.disableSecureWrites(error, 'Firebase operator registration denied');
      });
      if (!this.secureWriteDisabled) {
        await onDisconnect(operatorRef).remove().catch(error => {
          this.disableSecureWrites(error, 'Firebase operator disconnect cleanup denied');
        });
      }
    } else if (this.config.controlAccessKey) {
      this.secureWriteDisabled = true;
    }

    return true;
  }

  private async initSecureSync() {
    this.config = this.getEffectiveConfig();
    if (!this.config) {
      this.status = 'local';
      return;
    }

    this.studioId = this.config.studioId;
    this.status = 'connecting';
    this.lastError = null;

    try {
      const connected = await this.ensureFirebaseSession();
      if (!connected || !this.db || !this.config) {
        this.status = 'local';
        return;
      }

      const statePath = this.getStatePath();
      if (!statePath) {
        this.status = 'local';
        return;
      }

      // ── Listen to state (for Editor→Output sync via Firebase) ─────────────
      this.unsubscribeState = onValue(ref(this.db, statePath), snapshot => {
        const remoteValue = snapshot.val();
        if (Array.isArray(remoteValue)) {
          this.currentState = remoteValue.map(overlay => this.normalizeOverlay(overlay as OverlayConfig));
          this.persist(false);
          return;
        }

        if (this.canWriteSecureState() && this.currentState.length > 0) {
          void this.pushToSecureState();
        } else {
          this.notify();
        }
      });

      // ── Listen to commands ────────────────────────────────────────────────
      // For the Output window, controlAccessKey is '' so getCommandPath() returns null.
      // We fall back to the DEFAULT_CONTROL_ACCESS_KEY to still receive commands.
      const commandPath = this.getCommandPath() 
        || (this.isOutputRoute() 
          ? `${FIREBASE_ROOT}/${this.config.studioId}/commands/${DEFAULT_CONTROL_ACCESS_KEY}/latest`
          : null);

      if (commandPath) {
        this.unsubscribeCommand = onValue(ref(this.db, commandPath), snapshot => {
          const command = snapshot.val() as CommandEnvelope | null;
          if (!this.hasSeenInitialCommand) {
            this.hasSeenInitialCommand = true;
            this.latestCommandId = command?.commandId || null;
            return;
          }
          if (!command?.commandId) return;
          if (command.commandId === this.latestCommandId) return;
          this.latestCommandId = command.commandId;
          this.processAction(command as ActionCommand, false);
        });
      }

      this.status = this.secureWriteDisabled ? 'local' : 'secure';
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Secure sync failed:', msg);
      this.lastError = `خطأ في الربط: ${msg}`;
      this.status = 'error';
    }
  }

  private canWriteSecureState() {
    return Boolean(this.db && this.auth?.currentUser && this.config?.controlAccessKey && !this.secureWriteDisabled);
  }

  private isPermissionLikeError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return /permission[_-]?denied|admin-restricted-operation|auth\/admin-restricted-operation|permission denied/i.test(message);
  }

  private disableSecureWrites(error: unknown, context: string) {
    if (!this.isPermissionLikeError(error)) return false;

    this.secureWriteDisabled = true;
    this.status = 'local';
    this.lastError = 'Firebase write access is unavailable; using local and Live API sync.';
    console.warn(`${context}; using local and Live API sync fallback.`, error);
    return true;
  }

  private persist(broadcast = true) {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(this.currentState));
    this.notify();

    if (broadcast) {
      this.broadcastChannel?.postMessage({
        type: 'state',
        payload: this.currentState,
      } satisfies LocalMessage);
    }
  }

  private notify() {
    this.subscribers.forEach(callback => callback(this.currentState));
  }

  private async pushToSecureState() {
    if (!this.db || !this.config) return;

    const statePath = this.getStatePath();
    if (!statePath) return;

    await set(ref(this.db, statePath), this.currentState);
  }

  private async publishCommand(command: ActionCommand, commandId = generateSecureToken(10)) {
    if (!this.db || !this.config?.controlAccessKey) return;

    this.latestCommandId = commandId;

    const envelope: CommandEnvelope = {
      ...command,
      commandId,
      issuedAt: Date.now(),
    };

    const commandPath = this.getCommandPath();
    if (!commandPath) return;

    await set(ref(this.db, commandPath), envelope);
  }

  private pushState(changedOverlay?: OverlayConfig) {
    this.persist();

    if (this.canWriteSecureState()) {
      void this.pushToSecureState().catch(error => {
        if (!this.disableSecureWrites(error, 'Firebase state write denied')) {
          console.error('Failed to push secure overlay state', error);
        }
      });
    }

    this.pushToLiveApi(changedOverlay?.id, changedOverlay);
  }

  private nextLiveClientVersion() {
    this.liveClientVersion = Math.max(this.liveClientVersion + 1, Date.now());
    return this.liveClientVersion;
  }

  private publishOverlaySnapshot(overlay: OverlayConfig, keepalive = false) {
    const body = JSON.stringify({
      state: overlay,
      clientVersion: this.nextLiveClientVersion(),
    });
    return fetch(`/api/live?id=${encodeURIComponent(overlay.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < 60_000,
    });
  }

  private publishProgramSnapshot(keepalive = false) {
    const body = JSON.stringify({
      state: this.currentState,
      clientVersion: this.nextLiveClientVersion(),
    });
    return fetch(`/api/live?id=${encodeURIComponent(PROGRAM_OUTPUT_ID)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < 60_000,
    });
  }

  private publishOverlaySnapshotWithRetry(overlay: OverlayConfig, keepalive = false) {
    this.publishOverlaySnapshot(overlay, keepalive).catch(() => {
      setTimeout(() => {
        this.publishOverlaySnapshot(overlay, false).catch(() => { /* silent */ });
      }, 450);
    });
  }

  private publishProgramSnapshotWithRetry(keepalive = false) {
    this.publishProgramSnapshot(keepalive).catch(() => {
      setTimeout(() => {
        this.publishProgramSnapshot(false).catch(() => { /* silent */ });
      }, 450);
    });
  }

  private flushPendingLiveApi(options: { keepalive?: boolean; retry?: boolean } = {}) {
    const snapshots = [...this.pendingLiveSnapshots.values()];
    this.pendingLiveSnapshots.clear();
    this.liveApiDebounceTimer = null;

    for (const overlay of snapshots) {
      if (options.retry) {
        this.publishOverlaySnapshotWithRetry(overlay, Boolean(options.keepalive));
      } else {
        this.publishOverlaySnapshot(overlay, Boolean(options.keepalive)).catch(() => { /* silent */ });
      }
    }

    if (options.retry) {
      this.publishProgramSnapshotWithRetry(Boolean(options.keepalive));
    } else {
      this.publishProgramSnapshot(Boolean(options.keepalive)).catch(() => { /* silent */ });
    }
  }

  private pushToLiveApi(
    specificOverlayId?: string,
    explicitOverlay?: OverlayConfig,
    options: { immediate?: boolean; keepalive?: boolean; retry?: boolean } = {}
  ) {
    const snapshotsToSend = explicitOverlay
      ? [explicitOverlay]
      : specificOverlayId
        ? this.currentState.filter(o => o.id === specificOverlayId)
        : this.currentState;

    for (const overlay of snapshotsToSend) {
      this.pendingLiveSnapshots.set(overlay.id, overlay);
    }

    if (this.liveApiDebounceTimer) clearTimeout(this.liveApiDebounceTimer);

    if (options.immediate) {
      this.flushPendingLiveApi({ keepalive: options.keepalive, retry: options.retry });
      return;
    }

    this.liveApiDebounceTimer = setTimeout(() => {
      this.flushPendingLiveApi();
    }, 80);
  }

  private processAction(command: ActionCommand, shouldBroadcast = true) {
    let modified = false;
    let changedOverlay: OverlayConfig | null = null;
    const isVisibilityCommand = command.action === 'set_visible' || command.action === 'toggle_visible';

    this.currentState = this.currentState.map(overlay => {
      if (overlay.id !== command.targetId) return overlay;

      modified = true;
      let nextOverlay: OverlayConfig = overlay;

      switch (command.action) {
        case 'toggle_visible':
          nextOverlay = { ...overlay, isVisible: !overlay.isVisible };
          break;

        case 'set_visible':
          nextOverlay = { ...overlay, isVisible: command.value };
          break;

        case 'update_field': {
          const has = overlay.fields.some(f => f.id === command.fieldId);
          if (!has) {
            // Field doesn't exist — auto-inject it for known broadcast-control
            // fields so toggling Mute (or volume / sound style) works on
            // overlays saved before withBroadcastControls injected those
            // fields. Limited whitelist to avoid arbitrary field injection.
            const KNOWN_FIELDS: Record<string, { label: string; type: 'boolean' | 'range' | 'select' | 'text' | 'hidden' }> = {
              soundEnabled:  { label: 'تفعيل الصوت', type: 'boolean' },
              soundVolume:   { label: 'مستوى الصوت', type: 'range' },
              soundInStyle:  { label: 'مؤثر الظهور', type: 'select' },
              soundOutStyle: { label: 'مؤثر الإخفاء', type: 'select' },
              audioUpdateCue: { label: 'مؤثر تحديث البيانات', type: 'select' },
              duckSfx: { label: 'خفض صوت المؤثرات أثناء التعليق', type: 'boolean' },
              transitionIn:  { label: 'انتقال الظهور', type: 'select' },
              transitionOut: { label: 'انتقال الإخفاء', type: 'select' },
              broadcastLook: { label: 'هوية البث', type: 'select' },
              broadcastStyle: { label: 'ستايل البث', type: 'select' },
              broadcastPalette: { label: 'ألوان البث', type: 'select' },
              mondialTheme: { label: 'ثيم المونديال', type: 'select' },
              mondialMotionPreset: { label: 'حزمة حركة المونديال', type: 'select' },
              transitionSpeedMs: { label: 'سرعة الانتقال', type: 'range' },
              transitionIntensity: { label: 'قوة الانتقال', type: 'range' },
              broadcastMotion: { label: 'تفعيل حركة البث', type: 'boolean' },
            };
            KNOWN_FIELDS.liveRefreshEnabled = { label: 'تفعيل التحديث المباشر', type: 'boolean' };
            KNOWN_FIELDS.manualRefreshNonce = { label: 'عداد التحديث اليدوي', type: 'hidden' };
            const meta = KNOWN_FIELDS[command.fieldId];
            if (meta) {
              const newField = {
                id: command.fieldId,
                label: meta.label,
                type: meta.type,
                value: command.value as string | number | boolean | string[],
              } as OverlayField;
              nextOverlay = { ...overlay, fields: [...overlay.fields, newField] };
            } else {
              nextOverlay = overlay;
            }
          } else {
            nextOverlay = {
              ...overlay,
              fields: overlay.fields.map(field =>
                field.id === command.fieldId
                  ? {
                      ...field,
                      value: command.value as string | number | boolean | string[],
                    }
                  : field
              ),
            };
          }
          break;
        }

        case 'increment_field':
          nextOverlay = {
            ...overlay,
            fields: overlay.fields.map(field => {
              if (field.id !== command.fieldId) return field;

              const currentValue = Number(field.value) || 0;
              let nextValue = currentValue + command.amount;

              if (field.id === 'currentPage') {
                const pagesField = overlay.fields.find(candidate => candidate.id === 'pagesData');
                if (pagesField) {
                  try {
                    const pages = JSON.parse(String(pagesField.value) || '[]') as string[];
                    nextValue = Math.min(nextValue, Math.max(0, pages.length - 1));
                  } catch (error) {
                    console.error('Failed to calculate smart page bounds', error);
                  }
                }
              }

              return { ...field, value: Math.max(0, nextValue) };
            }),
          };
          break;

        case 'load_slot':
          // If slots data isn't loaded yet (output window cold start), try applying fields anyway
          if (overlay.slots && overlay.slots[command.slotName]) {
            nextOverlay = {
              ...overlay,
              activeSlot: command.slotName,
              fields: overlay.slots[command.slotName].map(field => ({ ...field })),
            };
          } else {
            // Slots not available locally → fetch full state from API and apply
            if (this.isOutputRoute()) {
              fetch(`/api/live?id=${encodeURIComponent(command.targetId)}&full=1&_=${Date.now()}`, { cache: 'no-store' })
                .then(r => r.ok ? r.json() : null)
                .then((data: { state?: OverlayConfig } | null) => {
                  if (!data?.state) return;
                  const fullOverlay = data.state;
                  if (fullOverlay.slots && fullOverlay.slots[command.slotName]) {
                    const slotOverlay = {
                      ...fullOverlay,
                      activeSlot: command.slotName,
                      fields: fullOverlay.slots[command.slotName].map((f: any) => ({ ...f })),
                    };
                    this.currentState = this.currentState.map(o => o.id === slotOverlay.id ? slotOverlay : o);
                    if (this.currentState.length === 0) this.currentState = [slotOverlay];
                    this.notify();
                  }
                })
                .catch(() => { /* silent */ });
            }
          }
          break;
      }

      changedOverlay = this.normalizeOverlay(
        nextOverlay,
        command.action === 'update_field' ? command.fieldId : undefined
      );
      return changedOverlay;
    });

    if (modified) {
      this.persist(shouldBroadcast);
      this.pushToLiveApi(command.targetId, changedOverlay ?? undefined, {
        immediate: isVisibilityCommand,
        retry: isVisibilityCommand,
      });
      if (this.canWriteSecureState()) {
        void this.pushToSecureState().catch(error => {
          if (!this.disableSecureWrites(error, 'Firebase command state write denied')) {
            console.error('Failed to publish secure state after command', error);
          }
        });
      }
    }
  }

  public subscribe(callback: (data: OverlayConfig[]) => void) {
    this.subscribers.add(callback);
    callback(this.currentState);
    return () => this.subscribers.delete(callback);
  }

  public sendCommand(command: ActionCommand) {
    if (this.config?.controlAccessKey) {
      this.processAction(command);
      void this.publishCommand(command).catch(error => {
        if (!this.disableSecureWrites(error, 'Firebase command publish denied')) {
          console.error('Failed to publish secure command', error);
        }
      });
      return;
    }

    this.processAction(command);
  }

  public addOverlay(overlay: OverlayConfig) {
    const normalizedOverlay = this.normalizeOverlay(overlay);
    this.currentState = [...this.currentState, normalizedOverlay];
    this.pushState(normalizedOverlay);
  }

  public deleteOverlay(id: string) {
    this.currentState = this.currentState.filter(overlay => overlay.id !== id);
    this.pushState();
  }

  public updateOverlay(updatedOverlay: OverlayConfig) {
    const normalizedOverlay = this.normalizeOverlay(updatedOverlay);
    this.currentState = this.currentState.map(overlay =>
      overlay.id === updatedOverlay.id ? normalizedOverlay : overlay
    );
    this.pushState(normalizedOverlay);
  }

  public updateLiveField(overlayId: string, fieldId: string | 'isVisible', value: unknown) {
    if (fieldId === 'isVisible') {
      this.processAction({ action: 'set_visible', targetId: overlayId, value: Boolean(value) });
      return;
    }

    this.processAction({
      action: 'update_field',
      targetId: overlayId,
      fieldId,
      value: value as string | number | boolean | string[],
    });
  }

  private buildOutputShellQuery() {
    const params = new URLSearchParams({
      obs: '1',
      rgev: OBS_OUTPUT_URL_VERSION,
    });

    const bundle = this.getViewerBundle();
    if (bundle) {
      try {
        const encoded = encodeBase64UrlUtf8(JSON.stringify(bundle));
        params.set(OUTPUT_SYNC_PARAM, encoded);
      } catch (e) {
        console.error('Failed to encode sync bundle for URL', e);
      }
    }

    return params.toString();
  }

  public buildOutputUrl(overlayId: string, embedData?: OverlayConfig) {
    const baseUrl = `${window.location.origin}/output/${encodeURIComponent(overlayId)}?${this.buildOutputShellQuery()}`;

    if (embedData) {
      this.publishOverlaySnapshot(embedData).catch(() => { /* silent */ });
    }

    return baseUrl;
  }

  public buildProgramOutputUrl() {
    return `${window.location.origin}/output/${encodeURIComponent(PROGRAM_OUTPUT_ID)}?${this.buildOutputShellQuery()}`;
  }

  public buildControlUrl(overlayId: string) {
    return `${window.location.origin}/control/${encodeURIComponent(overlayId)}`;
  }

  public buildEditUrl(overlayId: string) {
    const params = new URLSearchParams(window.location.search);
    params.delete('obs');
    params.delete('rgev');
    params.delete(OUTPUT_SYNC_PARAM);
    params.delete('d');

    const query = params.toString();
    const search = query ? `?${query}` : '';
    return `${window.location.origin}/Library${search}#/edit/${encodeURIComponent(overlayId)}`;
  }

  public async prepareOutputUrl(overlayId: string, snapshot?: OverlayConfig) {
    if (snapshot) {
      await this.publishOverlaySnapshot(snapshot, false);
    }

    return this.buildOutputUrl(overlayId);
  }

  public async prepareProgramOutputUrl() {
    await this.publishProgramSnapshot(false);
    return this.buildProgramOutputUrl();
  }

  public getViewerBundle(): ViewerSyncBundle | null {
    if (!this.config || !this.isLegacyFirebaseSyncEnabled()) return null;

    return {
      provider: 'firebase',
      studioId: this.config.studioId,
      stateAccessKey: this.config.stateAccessKey,
      firebaseConfig: this.buildWebConfig(this.config),
    };
  }

  public extractEmbeddedOverlay(hashPath: string): OverlayConfig | null {
    try {
      const queryStr = hashPath.includes('?') ? hashPath.split('?')[1] : window.location.search.slice(1);
      if (!queryStr) return null;
      const params = new URLSearchParams(queryStr);
      const raw = params.get('d');
      if (!raw) return null;
      return JSON.parse(decodeBase64UrlUtf8(raw)) as OverlayConfig;
    } catch {
      return null;
    }
  }

  public getSmartTokenContext() {
    const effectiveControlKey = this.config?.controlAccessKey || DEFAULT_CONTROL_ACCESS_KEY;

    return {
      provider: 'live-api' as const,
      studioId: this.config?.studioId || this.studioId,
      controlAccessKey: effectiveControlKey,
    };
  }

  public getStudioId() {
    return this.studioId;
  }

  public getStatus() {
    return this.status;
  }

  public getLastError() {
    return this.lastError;
  }

  public getStoredConfig() {
    return localStorage.getItem(LOCAL_CONFIG_KEY);
  }

  public getSecureConfig() {
    return this.config ?? this.parseStoredConfig();
  }

  public updateConfig(config: FirebaseWebConfig | Partial<SecureSyncConfig>) {
    const securePatch = config as Partial<SecureSyncConfig>;
    const existing = this.parseStoredConfig();
    const studioId =
      securePatch.studioId || existing?.studioId || this.studioId || `studio_${generateSecureToken(8)}`;

    const nextConfig: SecureSyncConfig = {
      provider: 'firebase',
      apiKey: String(config.apiKey || existing?.apiKey || ''),
      authDomain: String(config.authDomain || existing?.authDomain || ''),
      databaseURL: String(config.databaseURL || existing?.databaseURL || ''),
      projectId: String(config.projectId || existing?.projectId || ''),
      appId: securePatch.appId || existing?.appId,
      messagingSenderId: securePatch.messagingSenderId || existing?.messagingSenderId,
      storageBucket: securePatch.storageBucket || existing?.storageBucket,
      measurementId: securePatch.measurementId || existing?.measurementId,
      studioId,
      stateAccessKey: securePatch.stateAccessKey || existing?.stateAccessKey || generateSecureToken(16),
      controlAccessKey: securePatch.controlAccessKey || existing?.controlAccessKey || generateSecureToken(16),
      updatedAt: Date.now(),
    };

    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(nextConfig));
    localStorage.setItem(LOCAL_STUDIO_KEY, studioId);
    this.studioId = studioId;
  }

  public clearConfig() {
    localStorage.removeItem(LOCAL_CONFIG_KEY);
  }
}

export const syncManager = new SyncManager();
