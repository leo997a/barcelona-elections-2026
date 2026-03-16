const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBinaryString = (value: string): string => {
  const bytes = encoder.encode(value);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return binary;
};

const fromBinaryString = (value: string): string => {
  const bytes = Uint8Array.from(value, char => char.charCodeAt(0));
  return decoder.decode(bytes);
};

const normalizeBase64 = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  if (!padding) return normalized;
  return normalized.padEnd(normalized.length + (4 - padding), '=');
};

export const encodeBase64Utf8 = (value: string): string => {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }
  return btoa(toBinaryString(value));
};

export const decodeBase64Utf8 = (value: string): string => {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  return fromBinaryString(atob(normalizeBase64(value)));
};

export const encodeBase64UrlUtf8 = (value: string): string =>
  encodeBase64Utf8(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export const decodeBase64UrlUtf8 = (value: string): string => decodeBase64Utf8(normalizeBase64(value));

export const generateSecureToken = (size = 24): string => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};
