// ─── Secret Provider Interface ─────────────────────────────────────────────
// Abstraction layer for secret storage backends.
// Current: env vars. Future: Google Secret Manager, Vault, etc.
//
// SECURITY: getSecretValueServerOnly() must NEVER be called from client code.
//           Only metadata flows to the browser.

export interface SecretMetadata {
  name: string;
  location: string;       // e.g. "process.env", "Google Secret Manager"
  exists: boolean;
  length: number;
  last4: string;          // last 4 chars (masked)
  fingerprint: string;    // first 16 chars of SHA-256 hex
  purpose: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  lastCheckedAt: string;  // ISO date
}

export interface SecretVersion {
  versionId: string;
  state: 'enabled' | 'disabled' | 'destroyed';
  createdAt: string;
}

export interface SecretProvider {
  readonly providerName: string;

  /** Get metadata only — NEVER returns the actual secret value */
  getSecretMetadata(name: string): Promise<SecretMetadata>;

  /** Get the actual secret value — SERVER ONLY, never send to client */
  getSecretValueServerOnly(name: string): Promise<string | null>;

  /** Create a new version of a secret */
  createSecretVersion(name: string, value: string, metadata?: Record<string, string>): Promise<SecretVersion>;

  /** Disable a secret version (soft delete) */
  disableSecretVersion(name: string, versionId: string): Promise<void>;

  /** Destroy a secret version permanently */
  destroySecretVersion(name: string, versionId: string): Promise<void>;

  /** List all versions of a secret */
  listSecretVersions(name: string): Promise<SecretVersion[]>;
}

// ── Secret Registry ────────────────────────────────────────────────────────
// All secrets that the system monitors

export interface SecretDefinition {
  name: string;
  envVar: string;
  purpose: string;
  risk: SecretMetadata['risk'];
}

export const MONITORED_SECRETS: SecretDefinition[] = [
  { name: 'Player Stats Bridge URL',   envVar: 'REO_PLAYER_STATS_BRIDGE_URL',   purpose: 'VPS Bridge endpoint',      risk: 'medium' },
  { name: 'Player Stats Bridge Token', envVar: 'REO_PLAYER_STATS_BRIDGE_TOKEN', purpose: 'VPS Bridge auth token',    risk: 'critical' },
  { name: 'Gemini API Key',           envVar: 'GEMINI_API_KEY',                 purpose: 'AI text generation',       risk: 'high' },
  { name: 'License Secret',           envVar: 'LICENSE_SECRET',                 purpose: 'License key signing',      risk: 'high' },
  { name: 'License Admin Secret',     envVar: 'LICENSE_ADMIN_SECRET',           purpose: 'License generation auth',  risk: 'critical' },
  { name: 'Admin Session Secret',     envVar: 'ADMIN_SESSION_SECRET',           purpose: 'JWT session signing',      risk: 'high' },
  { name: 'Editor Admin Passcode',    envVar: 'EDITOR_ADMIN_PASSCODE',         purpose: 'Admin login passcode',     risk: 'high' },
];

// ── Provider Factory ───────────────────────────────────────────────────────

let _provider: SecretProvider | null = null;

export function getSecretProvider(): SecretProvider {
  if (_provider) return _provider;

  const providerType = (typeof process !== 'undefined' && process.env?.SECRET_PROVIDER) || 'env';

  switch (providerType) {
    case 'google_secret_manager':
      // Lazy import to avoid breaking build when Google SDK is not installed
      throw new Error(
        'Google Secret Manager provider is not yet implemented. ' +
        'Set SECRET_PROVIDER=env or remove the variable.'
      );
    case 'env':
    default: {
      // Dynamic import to keep this file tree-shakeable on the client
      const { EnvSecretProvider } = require('./providers/envSecretProvider');
      _provider = new EnvSecretProvider();
      return _provider;
    }
  }
}
