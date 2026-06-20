import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlatformConfig } from '../dist-server/api/_lib/platformConfig.js';
import {
  buildIdentityProfile,
  FixedWindowRateLimiter,
  hasJsonContentType,
  isTrustedRequestOrigin,
  normalizeIdentityEmail,
} from '../dist-server/api/_lib/platformSecurity.js';

const request = (headers) => ({ headers });

test('normalizes account email deterministically', () => {
  assert.equal(normalizeIdentityEmail('  USER@Example.COM '), 'user@example.com');
});

test('builds a server-owned identity profile without role or status input', () => {
  assert.deepEqual(buildIdentityProfile({
    uid: 'uid-1',
    email: ' User@Example.com ',
    emailVerified: true,
    displayName: ' Reo ',
    photoURL: null,
  }), {
    uid: 'uid-1',
    email: 'User@Example.com',
    emailLower: 'user@example.com',
    displayName: 'Reo',
    photoURL: null,
    emailVerified: true,
  });
});

test('accepts only same-host request origins', () => {
  assert.equal(isTrustedRequestOrigin(request({ origin: 'https://studio.example.com', host: 'studio.example.com' })), true);
  assert.equal(isTrustedRequestOrigin(request({ origin: 'https://attacker.example', host: 'studio.example.com' })), false);
  assert.equal(isTrustedRequestOrigin(request({ host: 'studio.example.com' })), false);
});

test('requires application/json for sensitive posts', () => {
  assert.equal(hasJsonContentType(request({ 'content-type': 'application/json; charset=utf-8' })), true);
  assert.equal(hasJsonContentType(request({ 'content-type': 'text/plain' })), false);
});

test('fixed-window limiter returns a bounded retry delay', () => {
  const limiter = new FixedWindowRateLimiter();
  assert.equal(limiter.consume('login:ip', 2, 60_000, 1_000).allowed, true);
  assert.equal(limiter.consume('login:ip', 2, 60_000, 1_001).allowed, true);
  const blocked = limiter.consume('login:ip', 2, 60_000, 1_002);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(limiter.consume('login:ip', 2, 60_000, 61_000).allowed, true);
});

test('server identity flags default to disabled', () => {
  const previousIdentity = process.env.REO_IDENTITY_ENABLED;
  const previousSessions = process.env.REO_SERVER_SESSIONS_ENABLED;
  delete process.env.REO_IDENTITY_ENABLED;
  delete process.env.REO_SERVER_SESSIONS_ENABLED;
  try {
    const config = getPlatformConfig();
    assert.equal(config.identityEnabled, false);
    assert.equal(config.serverSessionsEnabled, false);
  } finally {
    if (previousIdentity === undefined) delete process.env.REO_IDENTITY_ENABLED;
    else process.env.REO_IDENTITY_ENABLED = previousIdentity;
    if (previousSessions === undefined) delete process.env.REO_SERVER_SESSIONS_ENABLED;
    else process.env.REO_SERVER_SESSIONS_ENABLED = previousSessions;
  }
});
