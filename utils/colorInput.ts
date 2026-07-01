const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export const normalizeColorInputValue = (value: unknown, fallback = '#ffffff') => {
  const text = String(value ?? '').trim();
  if (HEX_COLOR_RE.test(text)) return text;
  return HEX_COLOR_RE.test(fallback) ? fallback : '#ffffff';
};
