import { useMemo } from 'react';
import { OverlayConfig } from '../../types';
import { THEMES as LEGACY_THEMES } from '../../components/renderers/OverlayConstants';

/**
 * نظام ثيمات «استوديو قوالب ميركاتو».
 * نقطة الحقيقة الوحيدة لحلّ ثيم القالب إلى كائن ألوان كامل (ResolvedTheme) يُطبَّق فعلياً على العرض.
 *
 * يدعم مصدرين من معرّفات الثيم:
 *  1) ثيمات الميركاتو السبعة (gold-dark, neon-cyan, ...) — غنية بالتدرّج والهالة.
 *  2) ثيمات REO القديمة (OverlayConstants.THEMES مثل BARCA_RED) — لضمان التوافق الرجعي.
 * وأي شيء آخر يسقط على تدرّج آمن من config.theme.
 */

/** الثيم المحلول الكامل الذي تستهلكه كل رندرة. */
export interface ResolvedTheme {
  id: string;
  primary: string;
  secondary: string;
  text: string;
  accent: string;
  bgStart: string;
  bgEnd: string;
  border: string;
  glow: string;
  bgGradient: string;
}

/** هكس/لون → rgba بشفافية. يتعامل مع #rgb و #rrggbb و rgb()/rgba(). */
export function alpha(color: string, a: number): string {
  const c = String(color || '').trim();
  if (!c) return `rgba(0,0,0,${a})`;
  if (c.startsWith('rgb')) {
    const parts = c.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3).map(s => s.trim());
    if (parts.length === 3) return `rgba(${parts.join(', ')}, ${a})`;
    return c;
  }
  const h = c.replace('#', '');
  const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if ([r, g, b].some(n => Number.isNaN(n))) return `rgba(0,0,0,${a})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** يبني سلسلة تدرّج CSS جاهزة. */
function gradient(bgStart: string, bgEnd: string): string {
  return `linear-gradient(135deg, ${bgStart} 0%, ${bgEnd} 100%)`;
}

/** تعريف ثيم استوديو خام (قبل بناء التدرّج). */
interface StudioThemeSeed {
  primary: string;
  accent: string;
  bgStart: string;
  bgEnd: string;
  border: string;
  glow: string;
  text: string;
}

/** ثيمات الميركاتو السبعة الكاملة. */
const MERCATO_THEME_SEEDS: Record<string, StudioThemeSeed> = {
  'gold-dark':     { primary: '#FFD700', accent: '#FF6B00', bgStart: 'rgba(10,26,58,0.96)', bgEnd: 'rgba(5,14,34,0.98)',  border: 'rgba(255,215,0,0.30)',   glow: 'rgba(255,215,0,0.50)',   text: '#ffffff' },
  'neon-cyan':     { primary: '#00E5FF', accent: '#0066FF', bgStart: 'rgba(5,20,40,0.96)',  bgEnd: 'rgba(0,10,25,0.98)',  border: 'rgba(0,229,255,0.30)',   glow: 'rgba(0,229,255,0.50)',   text: '#ffffff' },
  'crimson':       { primary: '#FF1744', accent: '#D50000', bgStart: 'rgba(40,5,15,0.96)',  bgEnd: 'rgba(20,0,5,0.98)',   border: 'rgba(255,23,68,0.30)',   glow: 'rgba(255,23,68,0.50)',   text: '#ffffff' },
  'royal-purple':  { primary: '#B388FF', accent: '#7C4DFF', bgStart: 'rgba(25,15,50,0.96)', bgEnd: 'rgba(15,5,30,0.98)',  border: 'rgba(179,136,255,0.30)', glow: 'rgba(179,136,255,0.50)', text: '#ffffff' },
  'emerald':       { primary: '#00FF94', accent: '#00B8D4', bgStart: 'rgba(5,30,25,0.96)',  bgEnd: 'rgba(0,15,12,0.98)',  border: 'rgba(0,255,148,0.30)',   glow: 'rgba(0,255,148,0.50)',   text: '#ffffff' },
  'sunset-orange': { primary: '#FF6B00', accent: '#FFD700', bgStart: 'rgba(40,20,5,0.96)',  bgEnd: 'rgba(20,10,0,0.98)',  border: 'rgba(255,107,0,0.30)',   glow: 'rgba(255,107,0,0.50)',   text: '#ffffff' },
  'minimal-white': { primary: '#FFFFFF', accent: '#C0C0C0', bgStart: 'rgba(15,15,15,0.96)', bgEnd: 'rgba(0,0,0,0.98)',    border: 'rgba(255,255,255,0.20)', glow: 'rgba(255,255,255,0.40)', text: '#0A1A3A' },
  'midnight-lime': { primary: '#C6FF00', accent: '#21F5C8', bgStart: 'rgba(4,12,27,0.97)',  bgEnd: 'rgba(0,3,10,0.99)',   border: 'rgba(198,255,0,0.30)',   glow: 'rgba(33,245,200,0.42)',  text: '#ffffff' },
  'transfer-blue': { primary: '#2F6BFF', accent: '#27E7FF', bgStart: 'rgba(8,22,58,0.97)',  bgEnd: 'rgba(3,8,25,0.99)',   border: 'rgba(47,107,255,0.34)',  glow: 'rgba(39,231,255,0.42)',  text: '#ffffff' },
  'club-gold':     { primary: '#FFCE45', accent: '#FF2F6D', bgStart: 'rgba(28,12,5,0.96)',  bgEnd: 'rgba(9,2,0,0.99)',    border: 'rgba(255,206,69,0.35)',  glow: 'rgba(255,47,109,0.38)',  text: '#ffffff' },
  'ice-scout':     { primary: '#E5F4FF', accent: '#58D6FF', bgStart: 'rgba(12,25,38,0.96)', bgEnd: 'rgba(4,10,18,0.99)',   border: 'rgba(229,244,255,0.25)', glow: 'rgba(88,214,255,0.35)',  text: '#ffffff' },
};

function buildResolved(id: string, seed: StudioThemeSeed): ResolvedTheme {
  return {
    id,
    primary: seed.primary,
    secondary: seed.bgEnd,
    text: seed.text,
    accent: seed.accent,
    bgStart: seed.bgStart,
    bgEnd: seed.bgEnd,
    border: seed.border,
    glow: seed.glow,
    bgGradient: gradient(seed.bgStart, seed.bgEnd),
  };
}

/** خريطة ثيمات الاستوديو الكاملة: الميركاتو السبعة + ثيمات REO القديمة مشتقّة. */
export const STUDIO_THEMES: Record<string, ResolvedTheme> = (() => {
  const out: Record<string, ResolvedTheme> = {};
  for (const [id, seed] of Object.entries(MERCATO_THEME_SEEDS)) {
    out[id] = buildResolved(id, seed);
  }
  // اشتقاق ثيمات REO القديمة (primary/secondary/text/accent) إلى ResolvedTheme كامل
  for (const [id, t] of Object.entries(LEGACY_THEMES)) {
    if (out[id]) continue;
    out[id] = {
      id,
      primary: t.primary,
      secondary: t.secondary,
      text: t.text,
      accent: t.accent,
      bgStart: alpha(t.secondary, 0.96),
      bgEnd: alpha(t.secondary, 0.99),
      border: alpha(t.primary, 0.30),
      glow: alpha(t.primary, 0.50),
      bgGradient: gradient(alpha(t.secondary, 0.96), alpha(t.secondary, 0.99)),
    };
  }
  return out;
})();

/** قائمة معرّفات ثيمات الميركاتو (لخيارات حقل themePreset في قوالب الميركاتو). */
export const MERCATO_THEME_IDS = Object.keys(MERCATO_THEME_SEEDS);

function findThemePreset(config: OverlayConfig): string | null {
  const field = config?.fields?.find(f => f.id === 'themePreset');
  const raw = field?.value;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/**
 * يحلّ ثيم القالب الفعّال إلى ResolvedTheme كامل.
 * - themePreset مسجّل صالح ⟹ الثيم الكامل (حتمي).
 * - غير صالح/غائب ⟹ اشتقاق من config.theme مع id='custom' (تدرّج آمن).
 * دالة نقية: لا تعدّل config.
 */
export function resolveTheme(config: OverlayConfig): ResolvedTheme {
  const presetId = findThemePreset(config);
  if (presetId && STUDIO_THEMES[presetId]) {
    return STUDIO_THEMES[presetId];
  }
  const primary = config?.theme?.primaryColor || '#FFD700';
  const secondary = config?.theme?.secondaryColor || '#0A1A3A';
  return {
    id: 'custom',
    primary,
    secondary,
    text: '#ffffff',
    accent: primary,
    bgStart: alpha(secondary, 0.96),
    bgEnd: alpha(secondary, 0.99),
    border: alpha(primary, 0.30),
    glow: alpha(primary, 0.50),
    bgGradient: gradient(alpha(secondary, 0.96), alpha(secondary, 0.99)),
  };
}

/** Hook رقيق يُذكّر ResolvedTheme على themePreset و config.theme فقط. */
export function useResolvedTheme(config: OverlayConfig): ResolvedTheme {
  const presetId = findThemePreset(config);
  const primary = config?.theme?.primaryColor;
  const secondary = config?.theme?.secondaryColor;
  return useMemo(() => resolveTheme(config), [presetId, primary, secondary]); // eslint-disable-line react-hooks/exhaustive-deps
}
