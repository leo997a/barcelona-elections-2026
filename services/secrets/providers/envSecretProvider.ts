// ─── Environment Variable Secret Provider ──────────────────────────────────
// Reads secrets from process.env — the default and current production provider.
//
// SECURITY:
// - getSecretMetadata() returns ONLY metadata (length, last4, fingerprint)
// - getSecretValueServerOnly() returns the actual value — NEVER send to client
// - No secret values are logged or printed

import { createHash } from 'crypto';
import type { SecretMetadata, SecretProvider, SecretVersion } from '../secretProvider';

export class EnvSecretProvider implements SecretProvider {
  readonly providerName = 'process.env';

  async getSecretMetadata(envVar: string): Promise<SecretMetadata> {
    const value = process.env[envVar]?.trim() ?? '';
    const exists = value.length > 0;

    let fingerprint = '';
    let last4 = '';

    if (exists) {
      fingerprint = createHash('sha256').update(value).digest('hex').slice(0, 16);
      last4 = value.slice(-4);
    }

    return {
      name: envVar,
      location: 'process.env (Vercel)',
      exists,
      length: value.length,
      last4: exists ? last4 : '',
      fingerprint: exists ? fingerprint : '',
      purpose: '',   // filled by caller from MONITORED_SECRETS
      risk: 'medium', // filled by caller
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async getSecretValueServerOnly(envVar: string): Promise<string | null> {
    const value = process.env[envVar]?.trim();
    return value || null;
  }

  async createSecretVersion(
    _name: string,
    _value: string,
    _metadata?: Record<string, string>,
  ): Promise<SecretVersion> {
    // Environment variables cannot be created at runtime on Vercel.
    // This would require Vercel API integration in the future.
    throw new Error(
      'Cannot create secret versions via process.env provider. ' +
      'Set the variable in Vercel Dashboard → Settings → Environment Variables.'
    );
  }

  async disableSecretVersion(_name: string, _versionId: string): Promise<void> {
    throw new Error(
      'Cannot disable secret versions via process.env provider. ' +
      'Remove the variable in Vercel Dashboard.'
    );
  }

  async destroySecretVersion(_name: string, _versionId: string): Promise<void> {
    throw new Error(
      'Cannot destroy secret versions via process.env provider. ' +
      'Remove the variable in Vercel Dashboard.'
    );
  }

  async listSecretVersions(_name: string): Promise<SecretVersion[]> {
    // Environment variables have no versioning — return single "current" version
    const value = process.env[_name]?.trim();
    if (!value) return [];

    return [{
      versionId: 'current',
      state: 'enabled',
      createdAt: 'unknown',
    }];
  }
}
