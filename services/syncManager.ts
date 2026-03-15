
import mqtt from 'mqtt';
import { OverlayConfig } from '../types';
import { normalizeElectionOverlay } from '../utils/election';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

// أنواع الأوامر التي يستقبلها النظام
type ActionCommand = 
  | { action: 'toggle_visible'; targetId: string }
  | { action: 'set_visible'; targetId: string; value: boolean }
  | { action: 'update_field'; targetId: string; fieldId: string; value: any }
  | { action: 'increment_field'; targetId: string; fieldId: string; amount: number }
  | { action: 'load_slot'; targetId: string; slotName: string };

class SyncManager {
  private client: mqtt.MqttClient | null = null;
  private subscribers: Set<(data: OverlayConfig[]) => void> = new Set();
  private studioId: string;
  private isConnected: boolean = false;
  
  // المخزن المحلي للبيانات الحية (Live State) - مصدر الحقيقة الوحيد
  private currentState: OverlayConfig[] = [];

  private normalizeOverlay(overlay: OverlayConfig, changedFieldId?: string) {
    return normalizeElectionOverlay(overlay, changedFieldId);
  }

  constructor() {
    this.studioId = this.detectStudioId();
    
    if (!localStorage.getItem('rge_studio_id')) {
        localStorage.setItem('rge_studio_id', this.studioId);
    }
    
    try {
        const saved = localStorage.getItem('rge_overlays');
        if (saved) this.currentState = JSON.parse(saved).map((overlay: OverlayConfig) => this.normalizeOverlay(overlay));
    } catch (e) {
        this.currentState = [];
    }

    console.log(`🎥 RGE Sync System | Studio ID: ${this.studioId}`);
    this.initMqtt();
  }

  private detectStudioId(): string {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('studio')) return urlParams.get('studio')!;

      if (window.location.hash.includes('?')) {
          const hashParts = window.location.hash.split('?');
          if (hashParts[1]) {
              const hashParams = new URLSearchParams(hashParts[1]);
              if (hashParams.get('studio')) return hashParams.get('studio')!;
          }
      }

      const stored = localStorage.getItem('rge_studio_id');
      if (stored) return stored;

      return 'studio_' + Math.random().toString(36).substring(2, 9);
  }

  private initMqtt() {
    this.client = mqtt.connect(BROKER_URL, {
        keepalive: 30,
        clientId: 'rge_main_' + Math.random().toString(16).substring(2, 8),
        clean: true,
        reconnectPeriod: 1000,
    });

    this.client.on('connect', () => {
        console.log('☁️ Cloud Connected');
        this.isConnected = true;
        // 1. Subscribe to State (Sync)
        this.client?.subscribe(`rge/v3/${this.studioId}/full_state`, { qos: 1 });
        // 2. Subscribe to Actions (Commands from StreamDeck/Companion)
        this.client?.subscribe(`rge/v3/${this.studioId}/actions`, { qos: 0 });
    });

    this.client.on('message', (topic, payload) => {
        try {
            const msgString = payload.toString();
            
            // Handle Full State Sync
            if (topic.includes('/full_state')) {
                const remoteData = JSON.parse(msgString);
                this.currentState = remoteData.map((overlay: OverlayConfig) => this.normalizeOverlay(overlay));
                this.persist(false); // Don't re-publish what we just received
            } 
            // Handle Actions (Commands)
            else if (topic.includes('/actions')) {
                const command: ActionCommand = JSON.parse(msgString);
                this.processAction(command);
            }
        } catch (e) {
            console.error('Sync Parse Error:', e);
        }
    });
  }

  // معالج الأوامر الذكي
  private processAction(cmd: ActionCommand) {
      console.log('⚡ Action Received:', cmd);
      let modified = false;

      this.currentState = this.currentState.map(overlay => {
          if (overlay.id !== cmd.targetId) return overlay;

          modified = true;
          let nextOverlay: OverlayConfig = overlay;
          switch (cmd.action) {
              case 'toggle_visible':
                  nextOverlay = { ...overlay, isVisible: !overlay.isVisible };
                  break;
              
              case 'set_visible':
                  nextOverlay = { ...overlay, isVisible: cmd.value };
                  break;

              case 'update_field':
                  nextOverlay = {
                      ...overlay,
                      fields: overlay.fields.map(f => f.id === cmd.fieldId ? { ...f, value: cmd.value } : f)
                  };
                  break;

              case 'increment_field':
                  nextOverlay = {
                      ...overlay,
                      fields: overlay.fields.map(f => {
                          if (f.id === cmd.fieldId) {
                              const current = Number(f.value) || 0;
                              let newVal = current + cmd.amount;
                              
                              // --- SMART LOGIC: Slide Bounds Checking ---
                              if (f.id === 'currentPage') {
                                  // Find the pagesData field to know max length
                                  const pagesField = overlay.fields.find(p => p.id === 'pagesData');
                                  if (pagesField) {
                                      try {
                                          const pages = JSON.parse(String(pagesField.value) || '[]');
                                          const maxIndex = Math.max(0, pages.length - 1);
                                          if (newVal > maxIndex) newVal = maxIndex;
                                      } catch(e) {}
                                  }
                              }
                              // ------------------------------------------

                              return { ...f, value: Math.max(0, newVal) };
                          }
                          return f;
                      })
                  };
                  break;

              default:
                  nextOverlay = overlay;
          }

          return this.normalizeOverlay(nextOverlay, cmd.action === 'update_field' ? cmd.fieldId : undefined);
      });

      if (modified) {
          this.pushToCloud();
      }
  }

  public subscribe(callback: (data: OverlayConfig[]) => void) {
    this.subscribers.add(callback);
    callback(this.currentState);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
      this.subscribers.forEach(cb => cb(this.currentState));
  }

  private persist(publish = true) {
      localStorage.setItem('rge_overlays', JSON.stringify(this.currentState));
      this.notify();
  }

  private pushToCloud() {
      this.persist();
      if (this.client && this.isConnected) {
          this.client.publish(
              `rge/v3/${this.studioId}/full_state`, 
              JSON.stringify(this.currentState), 
              { retain: true, qos: 1 }
          );
      }
  }

  // --- External API for sending commands (Used by Web Deck) ---
  public sendCommand(cmd: ActionCommand) {
      // Process locally first for instant feedback
      this.processAction(cmd);
  }

  // --- CRUD OPERATIONS ---
  public addOverlay(overlay: OverlayConfig) {
      this.currentState = [...this.currentState, this.normalizeOverlay(overlay)];
      this.pushToCloud();
  }
  public deleteOverlay(id: string) {
      this.currentState = this.currentState.filter(o => o.id !== id);
      this.pushToCloud();
  }
  public updateOverlay(updatedOverlay: OverlayConfig) {
      this.currentState = this.currentState.map(o => o.id === updatedOverlay.id ? this.normalizeOverlay(updatedOverlay) : o);
      this.pushToCloud();
  }
  public updateLiveField(overlayId: string, fieldId: string | 'isVisible', value: any) {
      if (fieldId === 'isVisible') {
          this.processAction({ action: 'set_visible', targetId: overlayId, value });
      } else {
          this.processAction({ action: 'update_field', targetId: overlayId, fieldId, value });
      }
  }

  public getStudioId() { return this.studioId; }
  public getStatus() { return this.isConnected ? 'cloud' : 'local'; }
  public getStoredConfig() { return localStorage.getItem('rge_firebase_config'); }
  public updateConfig(config: any) { localStorage.setItem('rge_firebase_config', JSON.stringify(config)); }
}

export const syncManager = new SyncManager();
