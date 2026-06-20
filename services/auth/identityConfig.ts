const viteEnvironment = (
  import.meta as ImportMeta & { env?: Record<string, string | undefined> }
).env ?? {};

const readFlag = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

export const identityClientConfig = Object.freeze({
  enabled: readFlag(viteEnvironment.VITE_REO_IDENTITY_ENABLED),
  firebase: {
    apiKey: viteEnvironment.VITE_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: viteEnvironment.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
    projectId: viteEnvironment.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
    appId: viteEnvironment.VITE_FIREBASE_APP_ID?.trim() ?? '',
  },
});

export const isIdentityClientConfigured = () => {
  const { apiKey, authDomain, projectId, appId } = identityClientConfig.firebase;
  return Boolean(apiKey && authDomain && projectId && appId);
};
