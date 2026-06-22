const readFlag = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

const clampInteger = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
};

export const getPlatformConfig = () => ({
  identityEnabled: readFlag(process.env.REO_IDENTITY_ENABLED),
  serverSessionsEnabled: readFlag(process.env.REO_SERVER_SESSIONS_ENABLED),
  identityDiagnosticsEnabled: readFlag(process.env.REO_IDENTITY_DIAGNOSTICS_ENABLED),
  trialProvisioningEnabled: readFlag(process.env.REO_TRIAL_PROVISIONING_ENABLED),
  trialDays: clampInteger(process.env.REO_TRIAL_DAYS, 14, 1, 30),
  sessionCookieDays: clampInteger(process.env.REO_SESSION_COOKIE_DAYS, 7, 1, 14),
  firebaseProjectIdConfigured: Boolean(process.env.FIREBASE_PROJECT_ID?.trim()),
  firebaseClientEmailConfigured: Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim()),
  firebasePrivateKeyConfigured: Boolean(
    process.env.FIREBASE_PRIVATE_KEY_BASE64?.trim()
    || process.env.FIREBASE_PRIVATE_KEY?.trim(),
  ),
});
