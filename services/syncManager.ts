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
import { ActionCommand, FirebaseWebConfig, OverlayConfig, SecureSyncConfig, SyncStatus } from '../types';
import { decodeBase64UrlUtf8, encodeBase64UrlUtf8, generateSecureToken } from '../utils/base64';
import { normalizeElectionOverlay } from '../utils/election';

const LOCAL_STATE_KEY = 'rge_overlays';
const LOCAL_CONFIG_KEY = 'rge_secure_sync_config';
const LOCAL_STUDIO_KEY = 'rge_studio_id';
const LOCAL_CHANNEL_NAME = 'rge_local_sync_v1';
const FIREBASE_ROOT = 'rgeSecure/v1/studios';
const OUTPUT_SYNC_PARAM = 'sync';
const APP_NAMESPACE = 'reo-live-secure';

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

  constructor() {
    this.studioId = this.detectStudioId();
    this.currentState = this.loadLocalState();

    if (!localStorage.getItem(LOCAL_STUDIO_KEY)) {
      localStorage.setItem(LOCAL_STUDIO_KEY, this.studioId);
    }

    this.initLocalBridge();
    void this.initSecureSync();
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

    return this.parseStoredConfig();
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

    const webConfig = this.buildWebConfig(this.config);
    const appName = `${APP_NAMESPACE}:${this.config.projectId}:${this.config.studioId}`;
    this.app = getApps().some(existing => existing.name === appName)
      ? getApp(appName)
      : initializeApp(webConfig, appName);

    this.auth = getAuth(this.app);
    this.db = getDatabase(this.app);

    await setPersistence(this.auth, browserLocalPersistence).catch(() => undefined);
    if (!this.auth.currentUser) {
      await signInAnonymously(this.auth);
    }

    if (this.auth.currentUser && this.config.controlAccessKey) {
      const operatorRef = ref(this.db, this.getOperatorPath(this.auth.currentUser.uid));
      await set(operatorRef, { connectedAt: Date.now() });
      await onDisconnect(operatorRef).remove().catch(() => undefined);
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

      const commandPath = this.getCommandPath();
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

      this.status = 'secure';
    } catch (error) {
      console.error('Secure sync failed, falling back to local mode', error);
      this.lastError = error instanceof Error ? error.message : 'تعذر بدء الربط الآمن.';
      this.status = 'error';
    }
  }

  private canWriteSecureState() {
    return Boolean(this.db && this.config?.controlAccessKey);
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

  private pushState() {
    this.persist();

    if (this.canWriteSecureState()) {
      void this.pushToSecureState().catch(error => {
        console.error('Failed to push secure overlay state', error);
      });
    }
  }

  private processAction(command: ActionCommand, shouldBroadcast = true) {
    let modified = false;

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

        case 'update_field':
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
          break;

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
          nextOverlay = overlay.slots[command.slotName]
            ? {
                ...overlay,
                activeSlot: command.slotName,
                fields: overlay.slots[command.slotName].map(field => ({ ...field })),
              }
            : overlay;
          break;
      }

      return this.normalizeOverlay(
        nextOverlay,
        command.action === 'update_field' ? command.fieldId : undefined
      );
    });

    if (modified) {
      this.persist(shouldBroadcast);
      if (this.canWriteSecureState()) {
        void this.pushToSecureState().catch(error => {
          console.error('Failed to publish secure state after command', error);
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
        console.error('Failed to publish secure command', error);
      });
      return;
    }

    this.processAction(command);
  }

  public addOverlay(overlay: OverlayConfig) {
    this.currentState = [...this.currentState, this.normalizeOverlay(overlay)];
    this.pushState();
  }

  public deleteOverlay(id: string) {
    this.currentState = this.currentState.filter(overlay => overlay.id !== id);
    this.pushState();
  }

  public updateOverlay(updatedOverlay: OverlayConfig) {
    this.currentState = this.currentState.map(overlay =>
      overlay.id === updatedOverlay.id ? this.normalizeOverlay(updatedOverlay) : overlay
    );
    this.pushState();
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

  public buildOutputUrl(overlayId: string) {
    const baseUrl = `${window.location.origin}${window.location.pathname}#/output/${overlayId}`;
    const bundle = this.getViewerBundle();

    if (!bundle) return baseUrl;

    const encoded = encodeURIComponent(encodeBase64UrlUtf8(JSON.stringify(bundle)));
    return `${baseUrl}?${OUTPUT_SYNC_PARAM}=${encoded}`;
  }

  public getViewerBundle(): ViewerSyncBundle | null {
    if (!this.config) return null;

    return {
      provider: 'firebase',
      studioId: this.config.studioId,
      stateAccessKey: this.config.stateAccessKey,
      firebaseConfig: this.buildWebConfig(this.config),
    };
  }

  public getSmartTokenContext() {
    if (!this.config?.controlAccessKey) return null;

    return {
      provider: 'firebase' as const,
      studioId: this.config.studioId,
      controlAccessKey: this.config.controlAccessKey,
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
