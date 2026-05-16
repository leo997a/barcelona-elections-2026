// ─── Google Secret Manager Provider (Skeleton) ─────────────────────────────
// Future implementation for Google Cloud Secret Manager.
//
// ACTIVATION: Set SECRET_PROVIDER=google_secret_manager in Vercel env vars.
//
// REQUIREMENTS (when implemented):
// - Google Cloud project with Secret Manager API enabled
// - Service account with secretmanager.versions.access role
// - GOOGLE_APPLICATION_CREDENTIALS or workload identity federation
//
// SECURITY:
// - NO credentials in source code
// - NO service account JSON in repository
// - Build MUST NOT fail when this provider is not configured
// - Activation is opt-in only

import type { SecretMetadata, SecretProvider, SecretVersion } from '../secretProvider';

const NOT_IMPLEMENTED = (method: string) =>
  new Error(
    `GoogleSecretManagerProvider.${method}() is not yet implemented. ` +
    'This is a skeleton for future use. Set SECRET_PROVIDER=env to use environment variables.'
  );

export class GoogleSecretManagerProvider implements SecretProvider {
  readonly providerName = 'Google Secret Manager';

  // When implemented, this will use @google-cloud/secret-manager SDK
  // private client: SecretManagerServiceClient;

  async getSecretMetadata(_name: string): Promise<SecretMetadata> {
    throw NOT_IMPLEMENTED('getSecretMetadata');
  }

  async getSecretValueServerOnly(_name: string): Promise<string | null> {
    throw NOT_IMPLEMENTED('getSecretValueServerOnly');
  }

  async createSecretVersion(
    _name: string,
    _value: string,
    _metadata?: Record<string, string>,
  ): Promise<SecretVersion> {
    throw NOT_IMPLEMENTED('createSecretVersion');
  }

  async disableSecretVersion(_name: string, _versionId: string): Promise<void> {
    throw NOT_IMPLEMENTED('disableSecretVersion');
  }

  async destroySecretVersion(_name: string, _versionId: string): Promise<void> {
    throw NOT_IMPLEMENTED('destroySecretVersion');
  }

  async listSecretVersions(_name: string): Promise<SecretVersion[]> {
    throw NOT_IMPLEMENTED('listSecretVersions');
  }
}
