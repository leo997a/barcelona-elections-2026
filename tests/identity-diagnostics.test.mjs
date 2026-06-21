import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import {
  createIdentityDiagnosticId,
  inspectIdentityAdminEnvironment,
  inspectIdTokenClaims,
  sanitizeIdentityAdminError,
} from '../dist-server/api/_lib/identityDiagnostics.js';

const restoreEnv = (snapshot) => {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

const encodeJwtPart = (value) => Buffer
  .from(JSON.stringify(value))
  .toString('base64url');

test('identity diagnostics are disabled by default', () => {
  const previous = process.env.REO_IDENTITY_DIAGNOSTICS_ENABLED;
  delete process.env.REO_IDENTITY_DIAGNOSTICS_ENABLED;
  try {
    assert.equal(createIdentityDiagnosticId(), null);
  } finally {
    if (previous === undefined) delete process.env.REO_IDENTITY_DIAGNOSTICS_ENABLED;
    else process.env.REO_IDENTITY_DIAGNOSTICS_ENABLED = previous;
  }
});

test('identity admin env inspection returns safe shape only', () => {
  const snapshot = {
    REO_IDENTITY_ENABLED: process.env.REO_IDENTITY_ENABLED,
    REO_SERVER_SESSIONS_ENABLED: process.env.REO_SERVER_SESSIONS_ENABLED,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };
  process.env.REO_IDENTITY_ENABLED = 'true';
  process.env.REO_SERVER_SESSIONS_ENABLED = 'true';
  process.env.FIREBASE_PROJECT_ID = 'reo-staging-project';
  process.env.FIREBASE_CLIENT_EMAIL = '"firebase-adminsdk@example.iam.gserviceaccount.com"';
  process.env.FIREBASE_PRIVATE_KEY = '"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----"';
  try {
    const details = inspectIdentityAdminEnvironment();
    assert.equal(details.identityEnabled, true);
    assert.equal(details.serverSessionsEnabled, true);
    assert.equal(details.firebaseProjectIdConfigured, true);
    assert.equal(details.firebaseClientEmailConfigured, true);
    assert.equal(details.firebasePrivateKeyConfigured, true);
    assert.equal(details.firebasePrivateKeyHasBeginMarker, true);
    assert.equal(details.firebasePrivateKeyHasEndMarker, true);
    assert.equal(details.firebasePrivateKeyContainsLiteralBackslashN, true);
    assert.equal(details.firebasePrivateKeyHasOuterQuotes, true);
    assert.equal(details.firebaseClientEmailDomain, 'example.iam.gserviceaccount.com');
    assert.notEqual(details.firebaseProjectIdHashPrefix, 'reo-staging-project');
    assert.equal(JSON.stringify(details).includes('abc'), false);
  } finally {
    restoreEnv(snapshot);
  }
});

test('id token claim inspection exposes only non-secret claim metadata', () => {
  const now = Math.floor(Date.now() / 1000);
  const token = [
    encodeJwtPart({ alg: 'RS256' }),
    encodeJwtPart({
      aud: 'reo-staging-project',
      iss: 'https://securetoken.google.com/reo-staging-project',
      sub: 'firebase-user-123',
      email_verified: true,
      auth_time: now - 20,
      iat: now - 20,
      exp: now + 3600,
    }),
    'signature',
  ].join('.');
  const details = inspectIdTokenClaims(token);
  assert.equal(details.webTokenAudience, 'reo-staging-project');
  assert.equal(details.tokenEmailVerified, true);
  assert.ok(details.tokenAuthTimeAgeSeconds >= 20);
  assert.equal(details.tokenUidPrefix, 'fireba');
  assert.equal(JSON.stringify(details).includes('signature'), false);
});

test('identity admin errors are sanitized before logging', () => {
  const error = new Error('Token abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz failed\nwith extra line');
  const details = sanitizeIdentityAdminError(error);
  assert.equal(details.firebaseErrorName, 'Error');
  assert.equal(details.sanitizedFirebaseErrorMessage.includes('[redacted-jwt]'), true);
  assert.equal(details.sanitizedFirebaseErrorMessage.includes('extra line'), false);
});
